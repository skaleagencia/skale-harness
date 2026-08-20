#!/usr/bin/env node
/**
 * Aviso de arquivo grande demais. Um script só, com dois jeitos de agir escolhidos por
 * qual evento o settings.json usa para chamá-lo (o script confere hook_event_name):
 *
 *   • Stop (modo BLOQUEIO) — confere os arquivos editados nesta sessão e, se algum
 *     arquivo de código passar de 350 linhas, devolve {decision:"block"} para o agente
 *     dividir o arquivo em partes menores ANTES de encerrar. Trava anti-loop: um Stop
 *     que já foi reenviado por um bloqueio anterior (stop_hook_active) passa direto, ou
 *     seja, o bloqueio acontece no máximo uma vez por sequência de encerramento.
 *
 *   • PostToolUse (modo AVISO) — confere só o arquivo que acabou de ser editado e
 *     injeta uma mensagem de contexto pedindo para o agente OFERECER uma divisão e
 *     confirmar com o usuário — nunca bloqueia, nunca divide sem autorização. Avisa no
 *     máximo uma vez por (sessão, arquivo).
 *
 * Por quê: arquivo gigante concentra responsabilidades demais num lugar só — fica mais
 * difícil de entender, de testar e de revisar. O aviso chega na hora em que o arquivo
 * cresceu, não seis meses depois quando ninguém lembra por que ele ficou daquele jeito.
 *
 * Sempre sai com código 0 — tanto o formato de aviso quanto o de bloqueio são respostas
 * válidas para os hooks Stop e PostToolUse; o "bloqueio" acontece pelo conteúdo da
 * resposta (`decision: "block"`), não pelo código de saída do processo.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import os from "node:os";

// ── Leitura de stdin (inline — este arquivo não tem vizinho para importar) ─────────────
/** Lê todo o stdin como texto, ou "" se não conseguir. Nunca lança erro. */
function readStdinRaw() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/**
 * Interpreta o JSON do stdin, devolvendo null para qualquer coisa que não seja um
 * objeto de verdade — inclusive entrada que não parseia E o valor literal `null`
 * (JSON válido que não lança erro ao parsear, mas quebraria o resto do script se fosse
 * tratado como um objeto).
 */
function parseHookEvent(raw) {
  try {
    const event = JSON.parse(raw || "{}");
    return typeof event === "object" && event !== null ? event : null;
  } catch {
    return null;
  }
}

// ── Pasta de rascunho da sessão (inline — este arquivo não tem vizinho para importar) ──
// Acha a pasta de rascunho que o próprio Claude Code já cria por sessão (o único lugar
// em que um hook pode escrever sem disparar um pedido de permissão). Se não achar
// (versão antiga do Claude Code, plataforma não reconhecida), cai num caminho
// alternativo dentro da pasta temporária do sistema — mesmo assim isolado por sessão.
const SCRATCH_NAMESPACE = "aia-harness";

function safeReaddir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function findClaudeScratchRoot(sid, roots) {
  const seen = new Set();
  for (const base of roots) {
    if (!base || seen.has(base)) continue;
    seen.add(base);
    for (const entry of safeReaddir(base)) {
      if (!entry.isDirectory() || !entry.name.startsWith("claude-")) continue;
      const claudeDir = path.join(base, entry.name);
      for (const slugEntry of safeReaddir(claudeDir)) {
        if (!slugEntry.isDirectory()) continue;
        const scratchpad = path.join(claudeDir, slugEntry.name, sid, "scratchpad");
        if (isDirectory(scratchpad)) return path.join(scratchpad, SCRATCH_NAMESPACE);
      }
    }
  }
  return null;
}

function sessionScratchDir(sessionId) {
  const roots = [os.tmpdir(), "/tmp"];
  const raw = typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : "nosession";
  const sid = raw.replace(/[^a-zA-Z0-9_-]/g, "_");
  const found = findClaudeScratchRoot(sid, roots);
  const dir = found ?? path.join(os.tmpdir(), `${SCRATCH_NAMESPACE}-session`, sid);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Melhor esforço — se não der para criar, a leitura/escrita seguinte falha aberto.
  }
  return dir;
}

const MAX_LINES = 350;

/** Extensões que representam código/lógica de negócio — vale a pena medir. */
const SOURCE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".py",
  ".java",
  ".kt",
  ".kts",
  ".go",
  ".rb",
  ".php",
  ".swift",
  ".rs",
  ".cs",
  ".dart",
  ".ex",
  ".exs",
  ".vue",
  ".svelte",
]);

/**
 * Pastas que indicam código gerado, de terceiros, ou saída de build — arquivos dentro
 * delas nunca são medidos, porque não são código que o dono do projeto escreveu.
 */
const IGNORED_DIRS = new Set([
  "node_modules",
  "build",
  "dist",
  "target",
  ".next",
  "out",
  "__pycache__",
  ".gradle",
  "vendor",
  "coverage",
  ".git",
  ".build",
  "DerivedData",
  "Pods",
  ".cache",
  "tmp",
  ".tmp",
  "generated",
  "gen",
  "__generated__",
  "migrations",
  "migration",
  "fixtures",
  "mocks",
  "__mocks__",
  "stubs",
  "lang",
  "i18n",
  "locales",
  "assets",
  "static",
  "public",
  "templates",
  // Ferramentas de harness (hooks, scripts vendorizados) moram inteiras dentro de
  // .claude/ e legitimamente passam do limite — não é código do produto que o dono
  // deveria ser forçado a dividir. Casa só como segmento exato de pasta, então código
  // do produto como src/hooks/useThing.ts (sem segmento ".claude") continua sendo
  // medido normalmente.
  ".claude",
]);

/**
 * Devolve true quando o arquivo é código de verdade que vale a pena medir contra o
 * limite de linhas.
 *
 * IGNORED_DIRS é comparado contra o caminho RELATIVO a `baseDir` (a raiz do
 * projeto/execução), nunca contra o caminho absoluto do sistema operacional acima
 * dela — comparar o caminho absoluto trataria a própria pasta temporária do sistema
 * como se fosse uma subpasta "ignorada" do projeto sempre que o projeto morasse
 * dentro dela.
 */
function isSourceFile(absPath, baseDir) {
  const ext = path.extname(absPath).toLowerCase();
  if (!SOURCE_EXTS.has(ext)) return false;
  // Arquivo de declaração de tipos do TypeScript — só tipo, sem lógica.
  if (absPath.endsWith(".d.ts")) return false;

  const rel = path.relative(baseDir, absPath);
  const dirs = rel.split(path.sep).slice(0, -1);
  for (const seg of dirs) {
    if (IGNORED_DIRS.has(seg)) return false;
  }

  const base = path.basename(absPath);
  // Teste / story / config — não é lógica principal.
  if (/\.(test|spec|stories|config|conf)\.[^.]+$/.test(base)) return false;
  // Arquivo puro de tipo / constante / reexportação.
  if (/^(index|types?|interfaces?|constants?|dtos?|enums?|vo)\.[^.]+$/.test(base)) return false;

  return true;
}

function countLines(absPath) {
  try {
    if (!fs.existsSync(absPath)) return null;
    return fs.readFileSync(absPath, "utf8").split(/\r?\n/).length;
  } catch {
    return null;
  }
}

/** Sugestão de divisão compartilhada entre os dois modos. */
const DDD_HINTS = [
  "Divida em unidades menores e mais focadas:",
  "  – Lógica de negócio → serviço de domínio ou caso de uso",
  "  – Blocos de UI repetidos → subcomponente reutilizável",
  "  – Código de acesso a dado → repositório / adaptador",
  "  – Grupo de funções auxiliares → módulo utilitário próprio",
  `Mantenha cada arquivo abaixo de ${MAX_LINES} linhas com uma responsabilidade clara.`,
].join("\n");

/**
 * AVISO (PostToolUse): avisa sobre o arquivo recém-editado, no máximo uma vez por
 * (sessão, arquivo). Nunca bloqueia; só pede para o agente oferecer a divisão e
 * confirmar com o usuário.
 */
function advisory(event, execDir) {
  const ti = event.tool_input || {};
  const file = ti.file_path ?? ti.path;
  if (!file || typeof file !== "string") return;
  const abs = path.isAbsolute(file) ? file : path.join(execDir, file);
  if (!isSourceFile(abs, execDir)) return;
  const lines = countLines(abs);
  if (lines == null || lines <= MAX_LINES) return;

  // Evita avisar duas vezes sobre o mesmo arquivo na mesma sessão.
  const sessionId = typeof event.session_id === "string" ? event.session_id : "nosession";
  const notifiedFlag = path.join(sessionScratchDir(sessionId), "largefile-notified");
  try {
    if (fs.readFileSync(notifiedFlag, "utf8").split(/\r?\n/).includes(abs)) return;
  } catch {
    // Sem marca ainda — primeiro aviso desta sessão.
  }
  try {
    fs.appendFileSync(notifiedFlag, abs + "\n");
  } catch {
    // Melhor esforço; se a marca falhar, o pior que acontece é repetir o aviso.
  }

  const rel = path.relative(execDir, abs) || path.basename(abs);
  const additionalContext = [
    `${rel} tem ${lines} linhas (acima do limite de ${MAX_LINES}).`,
    "Avise o usuário e OFEREÇA dividir o arquivo em partes menores. NÃO divida sem a aprovação dele.",
    DDD_HINTS,
  ].join("\n");
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext } }),
  );
}

/**
 * BLOQUEIO (Stop): se algum arquivo editado nesta sessão passou do limite, bloqueia o
 * encerramento para o agente dividir primeiro. Trava anti-loop via stop_hook_active.
 */
function blockOnStop(event, execDir) {
  // Um Stop que já foi reenviado por um bloqueio anterior tem que passar direto.
  if (event && event.stop_hook_active) return;

  let candidates = [];
  const sessionId = typeof event.session_id === "string" ? event.session_id : "nosession";
  const flag = path.join(sessionScratchDir(sessionId), "files-changed");

  // Fonte principal: arquivos registrados nesta sessão por outro hook (set-files-changed).
  try {
    const raw = fs.readFileSync(flag, "utf8");
    candidates = [...new Set(raw.split(/\r?\n/).filter(Boolean))];
  } catch {
    // Alternativa: mudanças visíveis na árvore de trabalho via git.
    try {
      const status = execFileSync("git", ["status", "--porcelain"], {
        cwd: execDir,
        encoding: "utf8",
        windowsHide: true,
      });
      candidates = status
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => path.join(execDir, line.slice(3).trim()));
    } catch {
      return;
    }
  }

  const oversized = [];
  for (const f of candidates) {
    const abs = path.isAbsolute(f) ? f : path.join(execDir, f);
    if (!isSourceFile(abs, execDir)) continue;
    const lines = countLines(abs);
    if (lines != null && lines > MAX_LINES) {
      oversized.push({ file: path.relative(execDir, abs), lines });
    }
  }
  if (oversized.length === 0) return;

  const sorted = oversized.sort((a, b) => b.lines - a.lines);
  const list = sorted.map(({ file, lines }) => `  • ${file} (${lines} linhas)`).join("\n");
  const reason = [
    `${sorted.length} arquivo(s) de código passam de ${MAX_LINES} linhas:`,
    list,
    "",
    "Divida-os em unidades menores e de responsabilidade única ANTES de encerrar.",
    DDD_HINTS,
  ].join("\n");
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
}

try {
  const event = parseHookEvent(readStdinRaw());
  if (event === null) process.exit(0);

  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const execDir = (typeof event.cwd === "string" && event.cwd && event.cwd) || projectDir;

  if (event.hook_event_name === "PostToolUse") {
    advisory(event, execDir);
  } else {
    blockOnStop(event, execDir);
  }

  process.exit(0);
} catch {
  // Erro interno inesperado — nunca derruba a sessão por causa deste aviso.
  process.exit(0);
}
