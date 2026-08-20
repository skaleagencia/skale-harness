#!/usr/bin/env node
/**
 * Confere se .claude/settings.json e .claude/settings.local.json continuam sendo
 * configuração válida sempre que um desses arquivos é gravado ou editado.
 *
 * Por quê: esse arquivo controla hooks, permissões e modelo da sessão. Um erro de
 * digitação nele (vírgula sobrando, chave errada) pode fazer parte da configuração
 * parar de funcionar silenciosamente — e o problema só aparece bem depois, quando
 * alguém percebe que um hook parou de disparar. Esta trava avisa na hora do erro.
 *
 * Como funciona: roda DEPOIS da gravação (PostToolUse), pega o JSON gravado e confere
 * contra o schema oficial do Claude Code (publicado em schemastore.org). Se o JSON tiver
 * erro de sintaxe ou não bater com o formato esperado, devolve uma mensagem de erro
 * (saída 2) pedindo para o Claude Code mostrar os erros ao usuário e perguntar se
 * corrige.
 *
 * O schema é baixado da internet e fica em cache por 24h dentro da pasta de rascunho da
 * própria sessão (a mesma pasta onde o Claude Code já guarda arquivos temporários sem
 * pedir permissão) — evita rebaixar o schema a cada gravação.
 *
 * FALHA ABERTO em tudo que não seja o conteúdo do próprio arquivo: sem internet, schema
 * fora do ar, cache corrompido — a trava deixa passar (saída 0) e não incomoda ninguém.
 * Só bloqueia (saída 2) quando o JSON tem erro de sintaxe real ou não bate com o schema.
 *
 * Variáveis de ambiente (uso em teste, opcionais):
 *   SETTINGS_SCHEMA_URL   — de onde baixar o schema. Se não começar com "http", é
 *                           tratado como caminho de arquivo local.
 *   SETTINGS_SCHEMA_CACHE — onde guardar o cache do schema.
 *
 * @hook PostToolUse
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ── Pasta de rascunho da sessão (inline — este arquivo não tem vizinho para importar) ──
// Acha a pasta de rascunho que o próprio Claude Code já cria por sessão (o único lugar
// em que um hook pode escrever sem disparar um pedido de permissão) e guarda o cache do
// schema ali dentro, num subdiretório próprio. Se não achar (versão antiga do Claude
// Code, plataforma não reconhecida), cai num caminho alternativo dentro da pasta
// temporária do sistema — mesmo assim isolado por sessão, nunca misturado entre sessões.
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
  // os.tmpdir() cobre Linux/Windows; "/tmp" cobre macOS, onde os.tmpdir() aponta para
  // uma pasta por usuário que NÃO é onde o Claude Code guarda o rascunho da sessão.
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

// ── Configuração (sobrescrevível por variável de ambiente, usado em teste) ─────────────
const SCHEMA_URL =
  process.env.SETTINGS_SCHEMA_URL ?? "https://www.schemastore.org/claude-code-settings.json";
const TTL_MS = 24 * 60 * 60 * 1000;

try {
  // ── Lê e interpreta o evento do stdin ─────────────────────────────────────────────────
  let event;
  try {
    const raw = fs.readFileSync(0, "utf8");
    if (!raw.trim()) process.exit(0);
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  // ── Só age em gravação/edição de arquivo ──────────────────────────────────────────────
  const toolName = event?.tool_name ?? "";
  if (!["Write", "Edit", "MultiEdit"].includes(toolName)) process.exit(0);

  // ── Só age em settings.json / settings.local.json dentro de uma pasta .claude/ ────────
  const ti = event?.tool_input ?? {};
  const file = ti.file_path || ti.path;
  if (!file || typeof file !== "string") process.exit(0);

  const basename = path.basename(file);
  if (basename !== "settings.json" && basename !== "settings.local.json") process.exit(0);
  if (path.basename(path.dirname(file)) !== ".claude") process.exit(0);

  if (!fs.existsSync(file)) process.exit(0);

  // ── O JSON em si precisa ser sintaticamente válido ────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(
      `[validate-settings-schema] ${basename} contém JSON inválido:\n\n  ${msg}\n\n` +
        `Corrija a sintaxe do arquivo antes de continuar.\n`,
    );
    process.exit(2);
  }

  // ── Carrega o schema oficial (com cache de 24h) ───────────────────────────────────────
  const sessionId = typeof event?.session_id === "string" ? event.session_id : "nosession";
  const CACHE_FILE =
    process.env.SETTINGS_SCHEMA_CACHE ??
    path.join(sessionScratchDir(sessionId), "settings-schema-cache.json");
  const schema = await loadSchema(CACHE_FILE);
  if (!schema) process.exit(0);

  // ── Valida ─────────────────────────────────────────────────────────────────────────────
  const errors = validate(parsed, schema, schema);
  if (errors.length === 0) process.exit(0);

  const MAX_SHOWN = 20;
  const list = errors
    .slice(0, MAX_SHOWN)
    .map((e, i) => `  ${i + 1}. ${e.path || "/"} — ${e.message}`)
    .join("\n");
  const more = errors.length > MAX_SHOWN ? `\n  … +${errors.length - MAX_SHOWN} mais erro(s)` : "";

  process.stderr.write(
    `[validate-settings-schema] ${errors.length} erro(s) de validação em ${basename}:\n\n` +
      `${list}${more}\n\n` +
      `Apresente os erros acima ao usuário, explique como corrigir cada um,\n` +
      `e pergunte: "Encontrei ${errors.length} erro(s) no ${basename}. Deseja que eu corrija?"\n` +
      `Se o usuário confirmar, aplique as correções.\n`,
  );
  process.exit(2);
} catch {
  // Erro interno inesperado (rede, cache, o que for) — nunca derruba a sessão por isso.
  process.exit(0);
}

// ── Carregamento do schema (busca na internet + cache em disco de 24h) ───────────────────
async function loadSchema(cacheFile) {
  if (!SCHEMA_URL.startsWith("http")) {
    try {
      return JSON.parse(fs.readFileSync(SCHEMA_URL, "utf8"));
    } catch {
      return null;
    }
  }

  try {
    const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    if (cached && typeof cached.fetchedAt === "number" && Date.now() - cached.fetchedAt < TTL_MS) {
      return cached.schema;
    }
  } catch {
    // Cache ausente ou vencido — segue para baixar de novo.
  }

  try {
    const res = await fetch(SCHEMA_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const fetched = await res.json();
    try {
      fs.writeFileSync(
        cacheFile,
        JSON.stringify({ schema: fetched, fetchedAt: Date.now() }),
        "utf8",
      );
    } catch {
      // Não crítico: o schema baixado ainda serve para esta execução.
    }
    return fetched;
  } catch {
    return null;
  }
}

// ── Validador mínimo de JSON Schema ─────────────────────────────────────────────────────
// Suporta: type, properties, additionalProperties, required, items, enum, const, pattern,
// minLength, maxLength, minimum, maximum, $ref (só dentro do próprio documento), anyOf,
// oneOf, allOf. Palavra-chave desconhecida é ignorada em silêncio (falha aberta).
function validate(value, schema, root, ptr = "") {
  if (!schema || typeof schema !== "object") return [];

  if (typeof schema.$ref === "string") {
    const segments = schema.$ref
      .replace(/^#\//, "")
      .split("/")
      .map((s) => decodeURIComponent(s.replace(/~1/g, "/").replace(/~0/g, "~")));
    let ref = root;
    for (const seg of segments) ref = ref?.[seg];
    return ref ? validate(value, ref, root, ptr) : [];
  }

  const errors = [];

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => checkType(value, t))) {
      const found = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
      errors.push({
        path: ptr,
        message: `tipo inválido: esperado "${types.join("|")}", encontrado ${found}`,
      });
      return errors; // tipo já não bate — não vale a pena descer nos filhos
    }
  }

  if (Array.isArray(schema.enum)) {
    const enumVals = schema.enum;
    if (!enumVals.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
      errors.push({
        path: ptr,
        message: `deve ser um de: ${enumVals.map((e) => JSON.stringify(e)).join(", ")}`,
      });
    }
  }

  if ("const" in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    errors.push({ path: ptr, message: `deve ser ${JSON.stringify(schema.const)}` });
  }

  if (typeof value === "string") {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push({ path: ptr, message: `não corresponde ao padrão "${schema.pattern}"` });
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        path: ptr,
        message: `comprimento mínimo ${schema.minLength}, encontrado ${value.length}`,
      });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        path: ptr,
        message: `comprimento máximo ${schema.maxLength}, encontrado ${value.length}`,
      });
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({ path: ptr, message: `mínimo ${schema.minimum}, encontrado ${value}` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({ path: ptr, message: `máximo ${schema.maximum}, encontrado ${value}` });
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const key of schema.required ?? []) {
      if (!(key in value)) {
        errors.push({ path: `${ptr}/${key}`, message: "campo obrigatório ausente" });
      }
    }
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in value) {
          errors.push(...validate(value[key], propSchema, root, `${ptr}/${key}`));
        }
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
          errors.push({ path: `${ptr}/${key}`, message: "propriedade adicional não permitida" });
        }
      }
    }
    if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object" &&
      schema.properties
    ) {
      const known = new Set(Object.keys(schema.properties));
      for (const [key, val] of Object.entries(value)) {
        if (!known.has(key)) {
          errors.push(...validate(val, schema.additionalProperties, root, `${ptr}/${key}`));
        }
      }
    }
  }

  if (Array.isArray(value) && schema.items) {
    for (let i = 0; i < value.length; i++) {
      errors.push(...validate(value[i], schema.items, root, `${ptr}/${i}`));
    }
  }

  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) errors.push(...validate(value, sub, root, ptr));
  }
  for (const combiner of ["anyOf", "oneOf"]) {
    if (Array.isArray(schema[combiner])) {
      const branchErrs = schema[combiner].map((s) => validate(value, s, root, ptr));
      if (!branchErrs.some((e) => e.length === 0)) {
        errors.push({
          path: ptr,
          message: `não corresponde a nenhuma variante permitida (${combiner})`,
        });
      }
    }
  }

  return errors;
}

function checkType(value, type) {
  if (type === "null") return value === null;
  if (type === "integer") return Number.isInteger(value);
  if (type === "array") return Array.isArray(value);
  if (type === "object")
    return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === type;
}
