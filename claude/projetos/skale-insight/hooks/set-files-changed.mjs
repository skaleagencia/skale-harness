#!/usr/bin/env node
/**
 * PostToolUse hook (strict mode): record files Claude edits this session so the
 * strict Stop hook (verify-on-stop.mjs) only runs lint/typecheck when code
 * actually changed. Appends the edited path to this session's scratch dir
 * (see session-scratch.mjs) — never a shared per-project file, so parallel
 * sessions/worktrees of the same project never mix each other's edited paths
 * (see .claude/rules/hooks-cwd-resolution.md). Never blocks: any failure exits 0.
 */
import fs from "node:fs";
import path from "node:path";
import { sessionScratchDir } from "./session-scratch.mjs";

/** @returns {string} */
function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/** @type {any} */
let event = {};
try {
  event = JSON.parse(readStdin() || "{}");
} catch {
  process.exit(0);
}

const file = event?.tool_input?.file_path ?? event?.tool_input?.path;
if (!file || typeof file !== "string") process.exit(0);

// Only track paths inside THIS project. Without this guard, a Write/Edit to
// anything outside the project (e.g. a global ~/.claude/ hook) still gets
// recorded here, and verify-on-stop.mjs then runs this project's full
// `npm run lint` — surfacing every pre-existing repo-wide error as if it
// were caused by an edit the session never made to this project at all.
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const resolved = path.resolve(file);
const resolvedProjectDir = path.resolve(projectDir);
const inProject =
  resolved === resolvedProjectDir || resolved.startsWith(resolvedProjectDir + path.sep);
if (!inProject) process.exit(0);

const sessionId = typeof event.session_id === "string" ? event.session_id : "nosession";
const flag = path.join(sessionScratchDir(sessionId), "files-changed");

try {
  fs.appendFileSync(flag, file + "\n");
} catch {
  // Tracking is best-effort; never block the edit.
}

process.exit(0);
