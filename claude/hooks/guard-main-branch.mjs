#!/usr/bin/env node
/**
 * Trava de confirmação: quando a sessão está prestes a rodar `git commit` ou `git push`
 * direto na branch principal (main/master), pede confirmação ao usuário em vez de deixar
 * passar direto.
 *
 * Por quê: commit ou push direto na branch principal pula revisão de código e os checks
 * automáticos. Um erro numa branch de feature fica isolado ali; o mesmo erro na
 * principal já sai para todo mundo que atualizar o repositório.
 *
 * Como funciona: roda ANTES do comando (PreToolUse) e examina o texto do comando. Se for
 * commit/push e a branch atual (ou o alvo citado no push) for main/master, devolve uma
 * decisão de permissão "deny" com a explicação — o Claude Code então pergunta ao usuário
 * antes de seguir. Não é um bloqueio definitivo, é uma pausa para confirmação.
 *
 * Wire em .claude/settings.json, em PreToolUse, com matcher "Bash".
 *
 * FALHA ABERTO: qualquer erro inesperado (git não encontrado, JSON malformado, etc.)
 * deixa o comando passar sem perguntar nada — esta trava nunca deve travar a sessão.
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";

try {
  const raw = (() => {
    try {
      return fs.readFileSync(0, "utf8");
    } catch {
      return "";
    }
  })();

  const event = JSON.parse(raw || "{}");
  const command = String(event?.tool_input?.command ?? "");

  const isCommit = /\bgit\s+commit\b/.test(command);
  const isPush = /\bgit\s+push\b/.test(command);

  if (!isCommit && !isPush) {
    process.exit(0);
  }

  // event.cwd reflete a pasta ATIVA da sessão (acompanha troca de worktree);
  // CLAUDE_PROJECT_DIR é a variável que o Claude Code sempre define com a raiz do
  // projeto; process.cwd() é o último fallback.
  const dir = event?.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const branch = (() => {
    try {
      return execFileSync("git", ["branch", "--show-current"], {
        cwd: dir,
        encoding: "utf8",
        timeout: 5000,
        windowsHide: true,
      }).trim();
    } catch {
      return "";
    }
  })();

  const MAIN_BRANCHES = /^(main|master)$/;
  const onMain = MAIN_BRANCHES.test(branch);
  // No push, também trava quando o comando cita main/master explicitamente como alvo.
  const pushTargetsMain = isPush && /\b(main|master)\b/.test(command);

  if (!onMain && !pushTargetsMain) {
    process.exit(0);
  }

  const verb = isCommit ? "commit" : "push";
  const target = branch || (command.match(/\b(main|master)\b/)?.[0] ?? "main");

  const permissionDecisionReason = [
    `guard-main-branch: ${verb} direto na branch \`${target}\` foi bloqueado para confirmação.`,
    "Commit/push direto na branch principal pula revisão de código e os checks automáticos.",
    "Considere criar uma branch de feature antes:",
    "  git checkout -b feat/nome-da-feature",
    "E depois abrir um PR para a principal.",
  ].join("\n");

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason,
      },
    }),
  );

  process.exit(0);
} catch {
  process.exit(0);
}
