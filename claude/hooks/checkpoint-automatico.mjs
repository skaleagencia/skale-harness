#!/usr/bin/env node
/**
 * Ponto de retorno automático — antes de um comando que apaga histórico de git ou aplica
 * migração de banco, guarda um checkpoint sozinho, sem perguntar nada.
 *
 * Por quê: a máquina roda em modo permissivo — `git reset --hard`, `git rebase` e afins
 * rodam sem confirmar. Sem pergunta prévia, a rede de segurança tem que existir ANTES do
 * comando, não depois: se o comando já rodou, perguntar não adianta mais nada.
 *
 * O que guarda: um `git stash` do que está pendente na área de trabalho — SEM tirar essa
 * mudança de cima do que o usuário está vendo na tela. Por isso o comando é
 * `git stash create` + `git stash store`, e não `git stash push`: `push` (mesmo com
 * `--keep-index`) TIRA a mudança não commitada da área de trabalho, que é exatamente o
 * oposto do que um checkpoint "sem incomodar" deveria fazer — `--keep-index` só preserva o
 * que já estava adicionado ao stage, não o resto. `create` gera o snapshot sem tocar em
 * nada; `store` só registra esse snapshot na lista de stashes. O usuário nunca vê a tela
 * mudar.
 *
 * Quando dispara: só nos comandos que reescrevem histórico de git ou tocam banco de
 * verdade (lista em GATILHOS). Fora dessa lista, sai calado sem nem olhar o git.
 *
 * Quando NÃO faz nada: pasta não é repositório git, ou não há nenhuma mudança pendente
 * para guardar (nesse caso reescrever histórico não perde trabalho local, então não há o
 * que guardar).
 *
 * NUNCA commita, nunca dá push, nunca troca de branch — só cria e registra o stash.
 *
 * Timeout curto (5s) em cada comando git: se demorar mais que isso, desiste em silêncio —
 * este hook não pode ser o motivo de o trabalho travar.
 *
 * FALHA ABERTO sempre. Qualquer erro sai com código 0, sem saída — o comando original
 * roda como se este hook não existisse.
 *
 * Só módulos nativos do Node (fs, child_process).
 */

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

/** Comandos que reescrevem histórico de git ou aplicam mudança irreversível no banco. */
const GATILHOS = [
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+rebase\b/i,
  /\bgit\s+checkout\b.*(--force\b|(?<!\S)-f\b)/i,
  /\bgit\s+clean\s+.*-\w*f/i,
  /\bgit\s+filter-branch\b/i,
  /\bgit\s+push\b.*(--force\b|(?<!\S)-f\b)/i,
  /\bsupabase\s+db\s+reset\b/i,
  /\bsupabase\s+db\s+push\b/i,
  /\bsupabase\s+migration\s+up\b/i,
  /\bsupabase\s+migration\s+down\b/i,
];

const TIMEOUT_MS = 5000;

function rodar() {
  const entrada = fs.readFileSync(0, 'utf8');
  const dados = JSON.parse(entrada || '{}') ?? {};
  const comando = String(dados?.tool_input?.command ?? '');
  if (!comando.trim() || !GATILHOS.some((re) => re.test(comando))) return;

  const dir = String(dados?.cwd ?? process.cwd());
  const opcoesGit = { cwd: dir, encoding: 'utf8', timeout: TIMEOUT_MS, windowsHide: true };

  // Não é repositório git: reescrever "histórico" ali não é uma operação de git de
  // verdade (ou o comando vai falhar sozinho por outro motivo) — nada a guardar.
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], opcoesGit);
  } catch {
    return;
  }

  // Sem mudança pendente, o comando destrutivo não tem trabalho local para perder.
  const status = execFileSync('git', ['status', '--porcelain'], opcoesGit);
  if (!status.trim()) return;

  const resumo = comando.trim().slice(0, 80);
  const mensagem = `checkpoint automático antes de: ${resumo}`;

  // `stash create` monta o snapshot sem tocar em nada; `stash store` só registra esse
  // snapshot na lista — juntos, guardam o ponto de retorno sem mexer no que está na tela.
  const sha = execFileSync('git', ['stash', 'create'], opcoesGit).trim();
  if (!sha) return; // nada que o git considerasse "stashável" (raro, já filtrado acima)
  execFileSync('git', ['stash', 'store', '-m', mensagem, sha], opcoesGit);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext:
        'Ponto de retorno criado automaticamente (git stash) antes deste comando — o que estava ' +
        'pendente na tela não foi tocado. Para ver: git stash list. Para trazer de volta: ' +
        'git stash apply stash@{0} (ajuste o índice conforme o que "git stash list" mostrar).',
    },
  }));
}

try {
  rodar();
} catch {
  // falha aberto: qualquer erro acima cai aqui e o comando segue sem checkpoint
}
process.exit(0);
