/**
 * Shared stdin helpers for hooks — see .claude/rules/hooks-cross-platform.md.
 *
 * Not a hook itself. Exists so no hook hand-rolls `JSON.parse(readStdin() || "{}")`:
 * a literal `null` on stdin is valid JSON and parses without throwing, so the first
 * `event.x` access afterwards throws an uncaught TypeError (exit 1 + stack), breaking
 * the documented 0/2 exit contract. `parseHookEvent` returns null for that case and
 * for malformed JSON; the caller decides whether to exit 0 or continue with `?? {}`.
 *
 * @module hooks/hook-io
 */
import fs from "node:fs";

/**
 * Reads the whole of stdin, returning "" on any read error.
 * @returns {string}
 */
export function readStdinRaw() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/**
 * @param {string} raw
 * @returns {any|null} the parsed event object, or null for empty/malformed input
 *   AND for a literal JSON `null`/scalar (which would otherwise pass a bare
 *   try/catch and blow up on the first property access).
 */
export function parseHookEvent(raw) {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
