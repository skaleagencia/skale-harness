#!/usr/bin/env node
/**
 * RTK — proxy de tokens para comandos de LEITURA.
 *
 * O que faz: intercepta comandos de leitura repetitivos (`git status`, `git diff`, `git log`,
 * `grep -r`) e acrescenta as flags compactas equivalentes ANTES de rodarem. Mesma informação,
 * uma fração da saída — e saída é o que custa token em sessão longa.
 *
 * Por que hook e não pedido no prompt: pedido o agente pode esquecer; hook o programa aplica.
 *
 * REGRAS DE SEGURANÇA (a razão de cada guarda):
 *  - SÓ leitura. Reescrever escrita (`commit`, `rm`, `push`) pode destruir trabalho — nunca toca.
 *  - Se o comando já traz flag de formato/limite, sai fora: quem pediu formato específico quer
 *    aquele formato.
 *  - `-h` NÃO é ajuda no git log (é `--help`): tratar como ajuda devolveria a coisa errada. Por
 *    isso qualquer flag desconhecida cancela a reescrita em vez de adivinhar.
 *  - Comando composto (`&&`, `|`, `;`, `$(`) sai fora: a reescrita mudaria o que o resto recebe.
 *  - FALHA ABERTO. Qualquer erro aqui devolve exit 0 e o comando original roda intacto. Um hook
 *    que trava a sessão é pior que um hook que economiza nada.
 */

let entrada = '';
process.stdin.on('data', (c) => (entrada += c));
process.stdin.on('end', () => {
  try {
    // `JSON.parse("null")` devolve null SEM lançar — a pegadinha que engana guarda defensiva.
    // Por isso o `?? {}` depois do parse, e não só o try/catch em volta.
    const dados = JSON.parse(entrada || '{}') ?? {};
    const cmd = String(dados?.tool_input?.command ?? '').trim();
    const novo = compactar(cmd);
    if (!novo || novo === cmd) return process.exit(0); // nada a fazer: comando original segue

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        updatedInput: { ...dados.tool_input, command: novo },
      },
    }));
    process.exit(0);
  } catch {
    process.exit(0); // falha aberto, sempre
  }
});

/** Comando composto não pode ser reescrito: o resto do pipeline espera a saída original. */
const composto = (c) => /[|;&]|\$\(|`|>|</.test(c);

function compactar(cmd) {
  if (!cmd || composto(cmd)) return null;

  // git status → uma linha por arquivo, sem cabeçalho decorativo
  if (/^git\s+status\s*$/.test(cmd)) return 'git status --porcelain=v1 -b';

  // git diff → só o placar por arquivo. Quem quer o conteúdo pede o conteúdo.
  if (/^git\s+diff\s*$/.test(cmd)) return 'git --no-pager diff --stat';
  if (/^git\s+diff\s+--staged\s*$/.test(cmd) || /^git\s+diff\s+--cached\s*$/.test(cmd)) {
    return 'git --no-pager diff --staged --stat';
  }

  // git log sem argumento → 15 linhas de uma linha cada, em vez de páginas com autor e data
  if (/^git\s+log\s*$/.test(cmd)) return 'git --no-pager log --oneline -15';

  // grep -r sem contagem → conta ocorrências por arquivo em vez de despejar cada linha.
  // Só quando não há flag que já controle o formato (-c, -l, -n, -o, -A/-B/-C, --include...).
  const g = cmd.match(/^grep\s+(-[a-zA-Z]+)\s+(.+)$/);
  if (g && /r/.test(g[1])) {
    // A flag de formato pode vir COLADA no -r (`grep -rn`) ou separada (`grep -r -n`). Checar só
    // a forma separada deixava `grep -rn` ser reescrito e o agente perdia o número da linha que
    // tinha pedido — por isso o teste roda no bloco de flags inteiro, não no comando.
    const temFormato = /[clLoqnABC]/.test(g[1].slice(1).replace(/r/g, ''))
      || /\s-(c|l|L|o|q|n|A|B|C)\b|--(count|files-with-matches|include|exclude|color)/.test(cmd);
    if (!temFormato) return `grep ${g[1]}c ${g[2]} | grep -v ':0$'`;
  }

  return null;
}
