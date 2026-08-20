#!/usr/bin/env node
/**
 * Aviso de comando destrutivo — quando o comando Bash bate num padrão que apaga ou
 * reescreve algo sem volta, injeta UMA linha de aviso no contexto do agente e deixa
 * passar. Nunca bloqueia, nunca pergunta.
 *
 * Por quê: a máquina roda em modo permissivo — nada pede confirmação antes de rodar,
 * inclusive comando irreversível. Sem pergunta prévia, o aviso é o único jeito de o
 * agente (e quem está lendo a conversa) perceber ANTES que um `rm -rf` ou um
 * `git push --force` executem, em vez de só depois, quando já não tem mais volta.
 *
 * Como avisa: devolve `hookSpecificOutput.additionalContext` sem tocar em
 * `permissionDecision` — é o mecanismo de injetar contexto que os outros hooks da pasta
 * usam (lint-gate, large-file-warning), só que aqui em PreToolUse, antes do comando
 * rodar. Não incluir `permissionDecision` garante que este hook nunca decide nada sobre
 * o comando — só comenta.
 *
 * Falso positivo x falso negativo: o custo de avisar à toa é uma linha de texto; o custo
 * de deixar passar calado é dado perdido. Por isso a régua aqui é propositalmente
 * grosseira (sem parser de shell, sem distinguir comando dentro de aspas) — na dúvida,
 * avisa. É por isso também que `delete from` só entra quando NÃO há `where` no comando: é
 * o único padrão da lista em que o oposto (avisar sempre) geraria ruído todo dia, num
 * comando comum e seguro.
 *
 * FALHA ABERTO sempre. Qualquer erro sai com código 0, sem saída — o comando roda como se
 * este hook não existisse.
 *
 * Só módulos nativos do Node (fs).
 */

import fs from 'node:fs';

function rodar() {
  const entrada = fs.readFileSync(0, 'utf8');
  const dados = JSON.parse(entrada || '{}') ?? {};
  const comando = String(dados?.tool_input?.command ?? '');
  if (!comando.trim()) return;

  const aviso = avaliarComando(comando);
  if (!aviso) return; // não bateu em nenhum padrão: sai calado

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: `AVISO — comando irreversível detectado: ${aviso}`,
    },
  }));
}

/**
 * Cada entrada é {regex, mensagem}. A primeira que casar vence — o aviso é sempre UMA
 * linha, então não faz sentido empilhar vários avisos do mesmo comando.
 */
const PADROES = [
  { re: /\brm\s+(-\w*rf\w*|-\w*fr\w*)\b/i,
    msg: 'isto apaga arquivos sem passar pela lixeira — não tem desfazer.' },
  { re: /\bgit\s+reset\s+--hard\b/i,
    msg: 'isto descarta na hora qualquer mudança não commitada — o que não foi commitado se perde.' },
  { re: /\bgit\s+clean\s+.*-\w*f/i,
    msg: 'isto apaga arquivo não rastreado pelo git — o que nunca foi commitado some sem aviso.' },
  { re: /\bgit\s+push\b.*(--force\b|(?<!\S)-f\b)/i,
    msg: 'isto reescreve o histórico já publicado; quem já baixou fica divergente.' },
  { re: /\bgit\s+rebase\b/i,
    msg: 'isto reescreve o histórico de commits — se já foi publicado, quem baixou fica divergente.' },
  { re: /\bgit\s+filter-branch\b/i,
    msg: 'isto reescreve todo o histórico do repositório — pesado e sem volta fácil.' },
  { re: /\bsupabase\s+db\s+reset\b/i,
    msg: 'isto apaga e recria o banco do zero — os bancos de produção estão sem backup: não tem volta.' },
  { re: /\bsupabase\s+db\s+push\b/i,
    msg: 'isto aplica migração direto no banco sem revisão — os bancos de produção estão sem backup: não tem volta.' },
  { re: /\bdrop\s+table\b/i,
    msg: 'isto apaga uma tabela inteira com todos os dados dentro — sem backup, não tem volta.' },
  { re: /\bdrop\s+database\b/i,
    msg: 'isto apaga o banco inteiro — sem backup, não tem volta.' },
  { re: /\btruncate\b/i,
    msg: 'isto esvazia a tabela inteira de uma vez — sem backup, não tem volta.' },
  { re: /\bdelete\s+from\b(?!.*\bwhere\b)/i,
    msg: 'isto apaga linhas sem filtro — sem WHERE, pode estar apagando a tabela toda, e sem backup não tem volta.' },
  { re: /\bdd\s+if=/i,
    msg: 'isto grava bytes direto num disco/arquivo, podendo sobrescrever dado inteiro sem confirmar.' },
  { re: /\bmkfs\b/i,
    msg: 'isto formata um disco/partição — apaga tudo que havia nele.' },
  { re: />\s*\/dev\//,
    msg: 'isto escreve direto num dispositivo do sistema — pode corromper disco ou travar a máquina.' },
  { re: /\bchmod\s+-R\s+777\b/i,
    msg: 'isto libera permissão total e recursiva — qualquer processo passa a poder alterar esses arquivos.' },
  { re: /\bsudo\b/i,
    msg: 'isto roda com privilégio de administrador — pode alterar qualquer parte do sistema.' },
];

function avaliarComando(cmd) {
  for (const { re, msg } of PADROES) {
    if (re.test(cmd)) return msg;
  }
  return null;
}

try {
  rodar();
} catch {
  // falha aberto: qualquer erro acima cai aqui e o comando segue sem aviso nenhum
}
process.exit(0);
