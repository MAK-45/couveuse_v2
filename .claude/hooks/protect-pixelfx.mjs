// PreToolUse hook (.claude/settings.json): refuses any edit under pixelfx/, the vendored pixelfx library, kept exactly as
// it is (CLAUDE.md). Exit code 2 blocks the tool call and tells Claude why.
import { relative, resolve, sep } from "node:path";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const input = JSON.parse(raw || "{}").tool_input || {};
const file = input.file_path || input.notebook_path || "";
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const rel = relative(root, resolve(root, file));
if (file && (rel === "pixelfx" || rel.startsWith("pixelfx" + sep))) {
  console.error("pixelfx/ is the vendored reference library: it is never edited. Put our code in src/ (see CLAUDE.md).");
  process.exit(2);
}
