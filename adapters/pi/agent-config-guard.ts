// agent-config guard for Pi.
// Asks the user before any bash command that starts with a prefix listed in
// ~/agent-config/policy/ask.txt. Without a UI (print/json mode) the command is
// blocked. Linked into ~/.pi/agent/extensions/ by ~/agent-config/bin/sync.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { type ExtensionAPI, isToolCallEventType } from "@earendil-works/pi-coding-agent";

const POLICY = join(homedir(), "agent-config", "policy", "ask.txt");

function loadPrefixes(): string[][] {
  try {
    return readFileSync(POLICY, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => l.split(/\s+/));
  } catch {
    return [];
  }
}

// Split a shell line into simple commands and drop leading VAR=value words.
function commands(line: string): string[][] {
  return line
    .split(/&&|\|\||[;|\n]/)
    .map((part) => part.trim().split(/\s+/).filter(Boolean))
    .map((words) => {
      while (words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) words.shift();
      if (["sudo", "command", "exec", "env"].includes(words[0] ?? "")) words.shift();
      return words;
    })
    .filter((words) => words.length > 0);
}

function matches(words: string[], prefix: string[]): boolean {
  return prefix.length <= words.length && prefix.every((p, i) => words[i] === p);
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (!isToolCallEventType("bash", event)) return;
    const line = String(event.input.command ?? "");
    const prefixes = loadPrefixes();
    const hit = commands(line).find((w) => prefixes.some((p) => matches(w, p)));
    if (!hit) return;
    if (!ctx.hasUI) {
      return { block: true, reason: `agent-config policy: "${hit.join(" ")}" needs the user's approval; ask them first.` };
    }
    const ok = await ctx.ui.confirm("Approval needed (agent-config policy)", line);
    if (!ok) return { block: true, reason: "The user declined this command." };
  });
}
