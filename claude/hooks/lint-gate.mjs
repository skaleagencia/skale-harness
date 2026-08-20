#!/usr/bin/env node
/**
 * Quality gate de lint — cobra o arquivo que ACABOU de ser editado, não a base inteira.
 *
 * Por que não bloquear tudo: o Skale Insight tem 155 erros de lint acumulados. Um gate que exige
 * base limpa trava todo trabalho no primeiro dia e vira a primeira coisa que alguém desliga. O
 * padrão que funciona é migração rastreada: a base velha fica, mas nada NOVO passa sem alguém ver.
 *
 * O que ele faz: roda o lint só no arquivo tocado e devolve o resultado como contexto pro agente,
 * na hora. Assim o erro é consertado enquanto o assunto está aberto, em vez de virar mais uma
 * linha nos 155.
 *
 * Não bloqueia de propósito — `additionalContext`, não `deny`. Um gate que barra o Write no meio
 * de um refactor de vários arquivos deixa o trabalho pela metade, que é pior que o aviso.
 *
 * FALHA ABERTO em tudo: sem lint no projeto, arquivo não-JS, timeout, erro do próprio eslint —
 * sai calado com exit 0.
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';

const EXTENSOES = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const CONFIGS = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.ts', 'biome.json'];

let entrada = '';
process.stdin.on('data', (c) => (entrada += c));
process.stdin.on('end', async () => {
  try {
    // `JSON.parse("null")` devolve null sem lançar — daí o `?? {}`.
    const dados = JSON.parse(entrada || '{}') ?? {};
    const arquivo = String(
      dados?.tool_response?.filePath ?? dados?.tool_input?.file_path ?? '',
    ).trim();
    if (!arquivo || !EXTENSOES.has(extname(arquivo)) || !existsSync(arquivo)) return sair();

    const raiz = acharRaiz(arquivo);
    if (!raiz) return sair(); // projeto sem lint: nada a cobrar

    const saida = await rodarEslint(raiz, arquivo);
    if (!saida) return sair();

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          `Lint do arquivo que você acabou de editar:\n${saida}\n` +
          `Conserte agora se veio de uma linha SUA. Erro que já existia no arquivo antes, deixe — ` +
          `a base tem dívida antiga e consertar de carona espalha o diff.`,
      },
    }));
    sair();
  } catch { sair(); }
});

const sair = () => process.exit(0);

/** Sobe do arquivo até achar a raiz do projeto que tem config de lint. */
function acharRaiz(arquivo) {
  let dir = dirname(resolve(arquivo));
  for (let i = 0; i < 8; i++) {
    if (CONFIGS.some((c) => existsSync(resolve(dir, c)))) return dir;
    const pai = dirname(dir);
    if (pai === dir) break;
    dir = pai;
  }
  return null;
}

function rodarEslint(raiz, arquivo) {
  return new Promise((ok) => {
    // `--format json`, não `compact`: o formatador compact saiu do core do ESLint e agora exige
    // pacote extra — pedir por ele devolve uma mensagem de instalação em vez do resultado, e o
    // hook ficava mudo sem ninguém perceber. O json é nativo e não some.
    execFile('npx', ['--no-install', 'eslint', '--format', 'json', arquivo],
      { cwd: raiz, timeout: 25_000, maxBuffer: 4 << 20 },
      (_erro, stdout) => {
        try {
          const bruto = String(stdout || '').trim();
          const inicio = bruto.indexOf('['); // npx às vezes prefixa aviso antes do JSON
          const relatorio = JSON.parse(inicio >= 0 ? bruto.slice(inicio) : bruto) ?? [];
          const linhas = (relatorio[0]?.messages ?? [])
            .slice(0, 12) // teto: 12 linhas já dizem o recado, o resto é ruído no contexto
            .map((m) => `  linha ${m.line}: ${m.severity === 2 ? 'erro' : 'aviso'} — ${m.message}` +
              (m.ruleId ? ` (${m.ruleId})` : ''));
          ok(linhas.length ? linhas.join('\n') : null);
        } catch { ok(null); }
      });
  });
}
