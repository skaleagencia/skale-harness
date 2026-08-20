#!/usr/bin/env node
/**
 * Formata automaticamente o arquivo que acabou de ser editado (Write/Edit/MultiEdit).
 *
 * Por quê: sem isso, cada edição do agente fica com a formatação que ele escolheu na
 * hora — indentação, aspas, quebra de linha — em vez de seguir o padrão que o projeto
 * já usa (biome ou prettier, quando instalados). É puro cosmético: nunca muda o
 * comportamento do código, só a aparência do arquivo.
 *
 * Roda DEPOIS da edição (PostToolUse) — não dá pra formatar antes de o arquivo existir.
 * Só formata se o projeto já tem biome ou prettier instalado localmente
 * (node_modules/.bin); sem isso instalado, não faz nada.
 *
 * FALHA ABERTO sempre: formatação é conveniência, nunca motivo pra travar uma edição.
 * Qualquer erro (arquivo bloqueado, formatter quebrado, JSON inválido no stdin) cai no
 * catch e sai em código 0, sem aviso nenhum.
 *
 * Wire em .claude/settings.json, em PostToolUse, com matcher "Write|Edit|MultiEdit".
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Extensões que os dois formatters (biome/prettier) sabem tratar. Fora dessa lista,
// não vale a pena nem tentar.
const EXTENSOES_FORMATAVEIS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts",
  ".json", ".jsonc", ".css", ".scss", ".sass", ".less",
  ".md", ".mdx", ".html", ".htm", ".yaml", ".yml",
  ".vue", ".svelte", ".astro",
]);

/** Acha o binário `nome` dentro de node_modules/.bin do projeto, ou null se não existir. */
function binarioLocal(dirProjeto, nome) {
  const caminho = path.join(dirProjeto, "node_modules", ".bin", nome);
  return fs.existsSync(caminho) ? caminho : null;
}

try {
  const entrada = fs.readFileSync(0, "utf8");
  const evento = JSON.parse(entrada || "{}") ?? {};
  const ti = evento.tool_input ?? {};
  const arquivo = ti.file_path || ti.path;

  if (typeof arquivo === "string" && arquivo) {
    const ext = path.extname(arquivo).toLowerCase();
    if (EXTENSOES_FORMATAVEIS.has(ext)) {
      // Sem CLAUDE_PROJECT_DIR (ex.: hook rodando fora de uma sessão real), cai no
      // diretório atual — mantém o hook utilizável em qualquer projeto, não só neste.
      const dirProjeto = process.env.CLAUDE_PROJECT_DIR || process.cwd();
      const biome = binarioLocal(dirProjeto, "biome");
      const prettier = binarioLocal(dirProjeto, "prettier");
      if (biome) execFileSync(biome, ["format", "--write", arquivo], { stdio: "ignore" });
      else if (prettier) execFileSync(prettier, ["--write", arquivo], { stdio: "ignore" });
    }
  }
} catch {
  // Formatação é best-effort — qualquer falha aqui nunca deve travar a edição.
}

process.exit(0);
