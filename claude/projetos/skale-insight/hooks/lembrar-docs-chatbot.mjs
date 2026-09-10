#!/usr/bin/env node
/**
 * Stop hook: lembra de atualizar os 3 docs + o copiloto Eric + o manual quando a
 * sessão mexeu em chatbot / motor de IA / CRM.
 *
 * Regra completa: .claude/memory/feedback_atualizar_docs_eric_manual_sem_pedir.md
 *
 * Lê a lista de arquivos editados escrita por set-files-changed.mjs (mesma infra
 * do memory-stop.mjs). Só avisa quando o CONJUNTO de alvos faltantes mudou desde
 * o último aviso desta sessão — senão a repetição a cada resposta faz a pessoa
 * parar de ler.
 *
 * Nunca bloqueia: sempre exit 0, falha em silêncio.
 */
import fs from "node:fs";
import path from "node:path";
import { sessionScratchDir } from "./session-scratch.mjs";
import { parseHookEvent, readStdinRaw } from "./hook-io.mjs";

const event = parseHookEvent(readStdinRaw()) ?? {};

// Anti-loop: já estamos dentro de uma cadeia de stop hooks.
if (event.stop_hook_active) process.exit(0);

// Purpose A (hooks-cwd-resolution.md): a raiz contra a qual os caminhos editados
// são relativizados tem que acompanhar o worktree ativo — numa sessão de worktree
// os arquivos editados vivem sob event.cwd, não sob o checkout original.
const cwdArg = typeof event.cwd === "string" && event.cwd ? event.cwd : "";
const projectDir = path.resolve(cwdArg || process.env.CLAUDE_PROJECT_DIR || process.cwd());

// Purpose B: estado transiente correlacionando duas invocações da MESMA sessão.
const sessionId = typeof event.session_id === "string" ? event.session_id : "nosession";
const scratch = sessionScratchDir(sessionId);
const flag = path.join(scratch, "files-changed");
const marcador = path.join(scratch, "lembrar-docs-chatbot-avisado");

let raw = "";
try {
  raw = fs.readFileSync(flag, "utf8");
} catch {
  process.exit(0); // Nada editado nesta sessão.
}

/** Os cinco alvos que precisam acompanhar a mudança. */
const ALVOS = [
  "docs/COMO-O-MOTOR-FUNCIONA.md",
  "docs/COMO-ESCREVER-O-PROMPT-DO-ASSISTENTE.md",
  "docs/METODO-DE-ATENDIMENTO.md",
  "src/components/chatbot/copiloto-conhecimento.ts",
  "src/pages/help-content.ts",
];
const ALVOS_SET = new Set(ALVOS);

/** Chatbot / assistente de IA / motor, e CRM — pastas e prefixos de arquivo. */
const PREFIXOS_GATILHO = [
  "supabase/functions/chatbot-engine/",
  "supabase/functions/flow-copilot/",
  "supabase/functions/instagram-webhook/",
  "supabase/functions/evolution-conversations/",
  "supabase/functions/chatbot-",
  "src/components/chatbot/",
  "src/components/admin/Chatbot",
  "src/hooks/useChatbot",
];

const ARQUIVOS_GATILHO = ["supabase/functions/_shared/atribuicao.ts", "src/hooks/useConversations.ts"];

const MIGRACAO_GATILHO = /chatbot|crm|lead|pipeline/i;

/**
 * Caminho absoluto → caminho relativo à raiz, com "/" em qualquer plataforma.
 * @param {string} abs
 * @returns {string|null} null se o arquivo estiver fora do projeto.
 */
function relativo(abs) {
  const rel = path.relative(projectDir, path.resolve(abs));
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

/**
 * @param {string} rel
 * @returns {boolean}
 */
function ehGatilho(rel) {
  // A armadilha: copiloto-conhecimento.ts mora dentro de src/components/chatbot/.
  // Um ALVO nunca conta como gatilho, senão editar só o copiloto pede o próprio copiloto.
  if (ALVOS_SET.has(rel)) return false;

  if (ARQUIVOS_GATILHO.includes(rel)) return true;
  if (PREFIXOS_GATILHO.some((p) => rel.startsWith(p))) return true;

  // CRM: qualquer caminho em src/ ou supabase/ que mencione crm.
  if ((rel.startsWith("src/") || rel.startsWith("supabase/")) && rel.toLowerCase().includes("crm")) {
    return true;
  }

  // Migração cujo NOME fala de chatbot/crm/lead/pipeline.
  if (rel.startsWith("supabase/migrations/") && MIGRACAO_GATILHO.test(path.basename(rel))) {
    return true;
  }

  return false;
}

const editados = new Set();
for (const linha of raw.split(/\r?\n/)) {
  const l = linha.trim();
  if (!l) continue;
  const rel = relativo(l);
  if (rel) editados.add(rel);
}

if (![...editados].some(ehGatilho)) process.exit(0);

const faltando = ALVOS.filter((alvo) => !editados.has(alvo));
if (faltando.length === 0) process.exit(0);

// Anti-ruído: só fala se o conjunto de faltantes mudou desde o último aviso.
const assinatura = faltando.join("\n");
try {
  if (fs.readFileSync(marcador, "utf8") === assinatura) process.exit(0);
} catch {
  // Primeiro aviso da sessão.
}
try {
  fs.writeFileSync(marcador, assinatura);
} catch {
  // Marcador é best-effort; no pior caso o aviso repete.
}

const message =
  "[lembrar-docs-chatbot] Esta sessão mexeu em chatbot / motor de IA / CRM." +
  " Ainda não foram atualizados nesta sessão: " +
  faltando.join(", ") +
  ". Os três docs acompanham mudança de comportamento do motor ou do método de atendimento." +
  " O manual (/ajuda) e o copiloto Eric só entram quando a mudança aparece na tela do usuário" +
  " — nem toda mudança exige os cinco; se um alvo não se aplica, diga em uma linha por quê." +
  " Regra completa em .claude/memory/feedback_atualizar_docs_eric_manual_sem_pedir.md.";

process.stdout.write(JSON.stringify({ systemMessage: message }));
process.exit(0);
