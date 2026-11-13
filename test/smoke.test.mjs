// Smoke test for bin/sync and bin/doctor: `node --test test/`. Node stdlib only.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { FULL, makeSandbox, put, run, seedLived, snapshot } from "./scenario.mjs";

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const changes = (out) => out.split("\n").filter((l) => l.startsWith("  +"));

test("no harnesses installed: sync and doctor succeed, second sync changes nothing", () => {
  const sb = makeSandbox([]);
  try {
    const first = run(REPO, sb, "sync");
    assert.equal(first.code, 0, first.out);
    assert.match(first.out, /claude: not installed/);
    const doctor = run(REPO, sb, "doctor");
    assert.equal(doctor.code, 0, doctor.out);
    const before = snapshot(sb.home);
    const second = run(REPO, sb, "sync");
    assert.equal(second.code, 0, second.out);
    assert.deepEqual(changes(second.out), []);
    assert.deepEqual(snapshot(sb.home), before);
  } finally { sb.dispose(); }
});

test("all harnesses with existing config: merges, keeps the user's things, is idempotent", () => {
  const sb = makeSandbox(FULL);
  try {
    seedLived(sb.home);
    const first = run(REPO, sb, "sync");
    assert.equal(first.code, 0, first.out);
    const doctor = run(REPO, sb, "doctor");
    assert.equal(doctor.code, 0, doctor.out);

    const files = snapshot(sb.home);
    const settings = JSON.parse(files[".claude/settings.json"]);
    assert.ok(settings.permissions.ask.includes("Bash(my own rule:*)"));
    assert.ok(settings.permissions.ask.includes("Bash(git push:*)"));
    assert.deepEqual(settings.permissions.allow, ["Read"]);
    assert.equal(files[".claude/CLAUDE.md"], "@~/agentrc/AGENTS.md\n");
    assert.equal(files[".claude/CLAUDE.md.pre-agentrc"], "my old instructions\n");
    const codex = files[".codex/config.toml"];
    assert.equal(codex.match(/\[mcp_servers\.gh_grep\]/g).length, 1);
    assert.match(codex, /\[mcp_servers\.mine\]/);
    assert.doesNotMatch(codex, /https:\/\/old|A = "1"/);
    assert.ok(Object.keys(files).some((f) => f.startsWith(".agents/quarantine/") && f.endsWith("stray/SKILL.md")));
    assert.equal(existsSync(join(sb.home, ".agents/skills/stray")), false);
    assert.match(files[".zshenv"], /OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1/);
    assert.equal(JSON.parse(files[".config/opencode/opencode.json"]).mcp.keep.url, "https://k");
    assert.ok(JSON.parse(files[".claude-work/.claude.json"]).mcpServers.gh_grep);

    const second = run(REPO, sb, "sync");
    assert.equal(second.code, 0, second.out);
    assert.deepEqual(changes(second.out), []);
    assert.deepEqual(snapshot(sb.home), files);
  } finally { sb.dispose(); }
});

test("invalid profiles.json: sync stops and changes nothing", () => {
  const sb = makeSandbox(FULL);
  try {
    put(sb.home, ".config/agentrc/profiles.json", '{"claude": "nope", "vim": []}');
    const before = snapshot(sb.home);
    const r = run(REPO, sb, "sync");
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /unknown harness "vim"/);
    assert.match(r.out, /"claude" needs a list of folders/);
    assert.deepEqual(snapshot(sb.home), before);
  } finally { sb.dispose(); }
});

test("doctor flags a stale legacy profiles.toml", () => {
  const sb = makeSandbox([]);
  try {
    put(sb.home, ".config/agentrc/profiles.toml", '[claude]\nprofiles = ["~/.claude"]\n');
    const r = run(REPO, sb, "doctor");
    assert.match(r.out, /profiles\.toml/);
  } finally { sb.dispose(); }
});
