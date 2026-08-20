#!/usr/bin/env node
/**
 * Rastro de auditoria — registra TODO comando Bash executado, sem pedir nada e sem
 * interferir no comando em si.
 *
 * Por quê: a máquina roda em modo permissivo (tudo liberado, sem confirmar antes de
 * rodar). Sem aprovação manual, o log é a única forma de responder depois "o que rodou
 * aqui" — é a contrapartida de ter tirado a pergunta de cada comando.
 *
 * Onde grava: ~/.claude/logs/comandos.jsonl, uma linha JSON por comando (data em ISO,
 * diretório de trabalho, o comando, e o projeto — última pasta do caminho).
 *
 * ROTAÇÃO: acima de 5 MB, o arquivo atual vira comandos-AAAAMMDD-HHMMSS.jsonl e um novo
 * começa vazio. Sem isso um log "para sempre" cresce até virar ele mesmo um problema de
 * disco, em vez de continuar sendo a solução.
 *
 * MASCARAMENTO DE SEGREDO: um comando pode trazer credencial colada na própria linha
 * (`export TOKEN=sk-ant-...`) — é exatamente assim que, nesta máquina, um segredo já
 * vazou para dentro de um arquivo de configuração (seção 3 do CLAUDE.md). Antes de
 * gravar, este hook troca por `***` qualquer valor atribuído a uma variável cujo nome
 * sugira credencial (token/key/secret/password/senha/auth), e também qualquer trecho que
 * bata com um formato conhecido de chave (sk-ant-*, sk-*, gh?_*, AKIA*, JWT). O resto do
 * comando é gravado normalmente — o log só perde o valor secreto, não o contexto.
 *
 * NÃO imprime nada: este hook é puro registro para depois, não deve poluir a conversa.
 *
 * FALHA ABERTO sempre. Qualquer erro — stdin ilegível, JSON quebrado, disco cheio — sai
 * com código 0, sem saída. Um hook de log que travasse a sessão seria pior que não
 * existir: aqui, com tudo liberado, ele seria o único jeito de travar o trabalho.
 *
 * Só módulos nativos do Node (fs, path, os).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

try {
  rodar();
} catch {
  // falha aberto: qualquer erro acima cai aqui e o comando original segue intocado
}
process.exit(0);

function rodar() {
  const entrada = fs.readFileSync(0, 'utf8');
  // `JSON.parse("null")` devolve null sem lançar — por isso o `?? {}` depois do parse.
  const dados = JSON.parse(entrada || '{}') ?? {};
  const comando = String(dados?.tool_input?.command ?? '').trim();
  if (!comando) return; // nada a registrar

  const cwd = String(dados?.cwd ?? process.cwd());
  const projeto = path.basename(cwd) || cwd;

  const logDir = path.join(os.homedir(), '.claude', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'comandos.jsonl');

  rotacionarSeNecessario(logFile, logDir);

  const linha = JSON.stringify({
    data: new Date().toISOString(),
    diretorio: cwd,
    comando: mascarar(comando),
    projeto,
  });
  fs.appendFileSync(logFile, linha + '\n');
}

/**
 * Troca valor de credencial por `***` antes de gravar. Duas passadas: primeiro por NOME
 * de variável (cobre qualquer segredo colado sob um nome óbvio), depois por FORMATO
 * conhecido de chave (cobre o caso de a chave aparecer sem estar numa atribuição, ex.:
 * dentro de um `curl -H "Authorization: Bearer sk-ant-..."`).
 */
function mascarar(cmd) {
  let out = cmd;

  // 1) `NOME_QUE_SOA_A_SEGREDO=valor` — mascara só o valor, mantém o nome da variável
  // visível (o nome ajuda a entender o comando; o valor é o que vaza).
  out = out.replace(
    /\b([A-Za-z0-9_]*(?:token|key|secret|password|senha|auth)[A-Za-z0-9_]*\s*=\s*)(?:"[^"]*"|'[^']*'|\S+)/gi,
    '$1***',
  );

  // 2) Formatos conhecidos de chave, mesmo fora de uma atribuição de variável.
  const formatos = [
    /sk-ant-[A-Za-z0-9_-]{10,}/g, // chave da Anthropic
    /sk-[A-Za-z0-9_-]{20,}/g, // token estilo OpenAI e afins
    /gh[a-z]?_[A-Za-z0-9]{20,}/gi, // token do GitHub (ghp_, gho_, ghu_, ghs_, ghr_)
    /AKIA[A-Z0-9]{12,}/g, // AWS access key id
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT (header.payload.assinatura)
  ];
  for (const re of formatos) out = out.replace(re, '***');

  return out;
}

/** Se o log já passou de 5 MB, aposenta ele com um nome datado e começa um novo vazio. */
function rotacionarSeNecessario(logFile, logDir) {
  const LIMITE_BYTES = 5 * 1024 * 1024;
  let tamanho;
  try {
    tamanho = fs.statSync(logFile).size;
  } catch {
    return; // arquivo ainda não existe: nada para rotacionar
  }
  if (tamanho <= LIMITE_BYTES) return;

  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const carimbo = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  fs.renameSync(logFile, path.join(logDir, `comandos-${carimbo}.jsonl`));
}
