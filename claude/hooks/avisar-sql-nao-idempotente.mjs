#!/usr/bin/env node
/**
 * Aviso de SQL não-idempotente — quando o agente edita/cria um arquivo .sql, injeta
 * um aviso curto no contexto pedindo pra revisar se o comando pode rodar mais de uma
 * vez sem quebrar.
 *
 * Por quê: um comando SQL que só funciona na primeira execução (ex.: `CREATE TABLE`
 * sem `IF NOT EXISTS`) quebra a migração se ela rodar de novo — e os bancos de
 * produção estão HOJE SEM BACKUP, então uma migração que falha no meio deixa o banco
 * num estado inconsistente sem ponto de retorno.
 *
 * Só avisa, nunca bloqueia: roda em PostToolUse (Write/Edit/MultiEdit), devolve
 * `hookSpecificOutput.additionalContext` sem tocar em `permissionDecision` — a edição
 * já aconteceu e este hook nunca decide nada sobre ela, só comenta. A versão anterior
 * deste hook também rodava em Stop e bloqueava o fim da sessão se um .sql tivesse
 * mudado sem revisão; isso foi removido porque a máquina roda em modo permissivo, onde
 * nada bloqueia.
 *
 * FALHA ABERTO sempre: qualquer erro de leitura/parse do stdin sai em código 0 sem
 * aviso.
 *
 * Wire em .claude/settings.json, em PostToolUse, com matcher "Write|Edit|MultiEdit".
 */
import fs from "node:fs";
import path from "node:path";

try {
  let bruto = "";
  try {
    bruto = fs.readFileSync(0, "utf8");
  } catch {
    bruto = "";
  }

  const evento = (() => {
    try {
      const parseado = JSON.parse(bruto || "{}");
      return typeof parseado === "object" && parseado !== null ? parseado : null;
    } catch {
      return null;
    }
  })();
  if (evento === null) process.exit(0);

  const ti = evento.tool_input ?? {};
  const arquivo = ti.file_path || ti.path;
  if (typeof arquivo !== "string" || !arquivo) process.exit(0);
  if (path.extname(arquivo).toLowerCase() !== ".sql") process.exit(0);

  const contextoAdicional =
    `Arquivo SQL editado: ${arquivo}. Um comando que só funciona na primeira execução ` +
    "(CREATE TABLE sem IF NOT EXISTS, INSERT sem ON CONFLICT, etc.) quebra a migração se " +
    "ela rodar de novo — e os bancos de produção estão HOJE SEM BACKUP, então uma migração " +
    "que falha no meio deixa o banco num estado inconsistente sem ponto de retorno. Revise " +
    "se cada comando é seguro pra rodar mais de uma vez.";

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: contextoAdicional },
    }),
  );
} catch {
  // qualquer erro inesperado cai aqui — nunca trava a edição do arquivo .sql
}
process.exit(0);
