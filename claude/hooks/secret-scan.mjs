#!/usr/bin/env node
/**
 * Trava de segurança: bloqueia um Edit/Write/MultiEdit cujo conteúdo parece conter um
 * segredo (chave de API, senha, token, chave privada) sendo gravado num arquivo.
 *
 * Por quê: um segredo commitado não sai mais de circulação sozinho — fica gravado no
 * histórico do git para sempre, mesmo que o arquivo seja apagado depois. É muito mais
 * barato travar na hora da escrita do que descobrir depois que uma chave vazou e ter
 * que rotacioná-la.
 *
 * Como funciona: roda ANTES da ferramenta (PreToolUse) e olha o texto prestes a ser
 * gravado. Se bater com um formato conhecido de credencial, cancela a operação
 * (saída 2 — a ferramenta não roda). Sem bater com nada, deixa passar (saída 0).
 *
 * Wire em .claude/settings.json, em PreToolUse, com matcher "Edit|Write|MultiEdit".
 *
 * FALHA ABERTO só para erro interno desta trava (JSON malformado, etc.) — deixa passar
 * sem travar a sessão. Isso NÃO vale para quando um segredo é de fato encontrado: nesse
 * caso ela continua bloqueando (saída 2) de propósito.
 */
import fs from "node:fs";

try {
  const raw = (() => {
    try {
      return fs.readFileSync(0, "utf8");
    } catch {
      return "";
    }
  })();

  const event = JSON.parse(raw || "{}");
  const ti = (event && event.tool_input) || {};
  const text = [ti.content, ti.new_string, ti.command]
    .filter((v) => typeof v === "string")
    .join("\n");

  // Formatos conhecidos de credencial — não pega toda senha possível, mas cobre os
  // formatos de token mais comuns que costumam ser colados sem querer num arquivo.
  const patterns = [
    /AKIA[0-9A-Z]{16}/, // AWS access key id
    /-----BEGIN (?:RSA|EC|OPENSSH|PGP|DSA) PRIVATE KEY-----/,
    /sk-[A-Za-z0-9]{20,}/, // token estilo OpenAI
    /ghp_[A-Za-z0-9]{36}/, // GitHub personal access token
    /xox[baprs]-[A-Za-z0-9-]{10,}/, // token do Slack
    /AIza[0-9A-Za-z_-]{35}/, // API key do Google
  ];

  for (const re of patterns) {
    if (re.test(text)) {
      process.stderr.write(
        "secret-scan: bloqueado — o conteúdo parece conter um segredo (chave/token/senha). " +
          "Guarde a credencial fora do repositório (variável de ambiente) e use aqui só o nome dela.\n",
      );
      process.exit(2);
    }
  }

  process.exit(0);
} catch {
  // Erro interno da própria trava (ex.: stdin não é JSON válido) — nunca derruba a sessão.
  process.exit(0);
}
