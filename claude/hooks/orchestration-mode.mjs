#!/usr/bin/env node
/**
 * GLOBAL UserPromptSubmit hook that injects a standing "orchestration mode"
 * directive on every prompt, in every project: run the session as
 * orchestrator, delegate exploration/implementation to subagents, set
 * `model` explicitly per dispatch, and parallelize independent work.
 *
 * Copied from the per-project version originally installed by aia-harness
 * inside skale-insight (.claude/hooks/orchestration-mode.mjs), moved here
 * so it applies out-of-the-box to any project opened on this machine —
 * no per-project harness install required. Self-contained: the two stdin
 * helpers that version imported from a sibling hook-io.mjs are inlined
 * below instead, since this file has no project-local sibling to import
 * from.
 *
 * Delivered as a hook rather than CLAUDE.md content because CLAUDE.md
 * loses attention over a long session — re-injecting it on every turn
 * keeps the directive live regardless of session length or context
 * compaction.
 *
 * Injection is unconditional: no filesystem check, no project-type gating,
 * no caching, no session flag. Pure context injection (additionalContext
 * only, never a permission decision), so it never blocks a session.
 *
 * Cross-platform: plain Node (no shell), wired exec-form (`node <path>`)
 * in ~/.claude/settings.json under UserPromptSubmit, no matcher (fires on
 * every prompt, in every project).
 *
 * Fails open on any I/O or parse error, including literal `null` on stdin
 * (exit 0, no output) — this hook must never block a session.
 */
import fs from "node:fs";

/** Reads all of stdin as utf8, or "" if it can't be read. Never throws. */
function readStdinRaw() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/**
 * Parses a hook's stdin JSON, returning null for anything that isn't a
 * genuine object — including unparseable input AND the literal JSON value
 * `null` (valid JSON that parses without throwing).
 */
function parseHookEvent(raw) {
  try {
    const event = JSON.parse(raw || "{}");
    return typeof event === "object" && event !== null ? event : null;
  } catch {
    return null;
  }
}

// Anti-recursion guard — sub-session pollution prevention. Runners that spawn
// Agent SDK sub-sessions set CLAUDE_INVOKED_BY on the child process env;
// without this guard every sub-session prompt would also receive the
// orchestration directive, prompting it to delegate further and risking a
// recursive delegation storm.
if (process.env.CLAUDE_INVOKED_BY) process.exit(0);

const ORCHESTRATION_CONTEXT = `ORCHESTRATION MODE — MANDATORY

Run this session as orchestrator: plan, decompose, sequence, delegate, adjudicate, answer.
Delegate exploration and implementation to specialist subagents (Agent tool).
Work inline only when delegating costs more than the work itself: trivial single-file
edits, one-line answers, and the final synthesis of subagent reports.

Set \`model\` explicitly on every dispatch. Subagents never inherit this session's model.
  haiku  — mechanical and bounded: locate code, grep sweeps, read-only surveys,
           single-file edits with a complete spec.
  sonnet — default: multi-file work, integration, review, debugging, judgment.
  opus   — only when you judge that specific subtask needs it.
Choosing haiku deliberately is the saving; omitting \`model\` only falls back to sonnet.
This session keeps the model the user selected — never downgrade it.

Dispatch independent subagents in parallel: multiple Agent calls in ONE message.
Sequence only on real conflict — same files written, or one needs another's output.
Read-only investigation parallelizes by default.

Every dispatch carries its own complete context. Subagents inherit nothing from this
conversation: state the task, exact paths, constraints, and the expected return.`;

const event = parseHookEvent(readStdinRaw());
if (event === null) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: ORCHESTRATION_CONTEXT,
    },
  }),
);

process.exit(0);
