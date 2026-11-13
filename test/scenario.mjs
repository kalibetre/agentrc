// Builds a throwaway HOME with stub harness programs, runs bin/sync and bin/doctor
// against it, and returns what happened. Used by smoke.test.mjs. Node stdlib only.
import { spawnSync } from "node:child_process";
import {
  chmodSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync,
  rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NODE = process.execPath;

const STUBS = {
  // Records `claude mcp add/remove` into $CLAUDE_CONFIG_DIR/.claude.json like the real CLI.
  claude: `
const fs = require("fs"), path = require("path");
const a = process.argv.slice(2);
if (a[0] !== "mcp") process.exit(0);
const file = path.join(process.env.CLAUDE_CONFIG_DIR, ".claude.json");
const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
data.mcpServers ??= {};
if (a[1] === "remove") delete data.mcpServers[a[a.length - 1]];
if (a[1] === "add") {
  const i = a.indexOf("http") + 1, entry = { type: "http", url: a[i + 1] };
  for (let j = 0; j < a.length; j++) if (a[j] === "-H") {
    const [k, ...v] = a[j + 1].split(": ");
    (entry.headers ??= {})[k] = v.join(": ");
  }
  data.mcpServers[a[i]] = entry;
}
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\\n");
`,
  codex: `if (process.argv[2] === "execpolicy") console.log('{"decision":"prompt"}');`,
  opencode: ``,
  pi: ``,
};

/** Create a fake HOME plus a PATH directory holding the requested stub programs. */
export function makeSandbox(programs) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "agentrc-test-")));
  const home = join(root, "home");
  const bin = join(root, "bin");
  mkdirSync(home);
  mkdirSync(bin);
  for (const name of programs) {
    const file = join(bin, name);
    writeFileSync(file, `#!${NODE}\n${STUBS[name]}`);
    chmodSync(file, 0o755);
  }
  return { root, home, bin, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

export function put(home, rel, content) {
  const file = join(home, rel);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, content);
}

/** Run one of the repo's bin scripts inside the sandbox. */
export function run(repo, sandbox, script, args = [], runner = NODE) {
  const env = {
    HOME: sandbox.home,
    PATH: `${sandbox.bin}:/usr/bin:/bin`,
    AGENTRC_NO_KNOWN_PATHS: "1",
    TERM: "dumb",
  };
  const r = spawnSync(runner, [join(repo, "bin", script), ...args], { env, encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
}

/** Every file under home as { relative path: content | "-> link target" }, sorted. */
export function snapshot(home) {
  const out = {};
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      const rel = p.slice(home.length + 1);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) out[rel] = `-> ${readlinkSync(p)}`;
      else if (st.isDirectory()) walk(p);
      else out[rel] = readFileSync(p, "utf8");
    }
  };
  walk(home);
  return out;
}

/** Replace machine-specific parts so two runs can be compared. */
export function normalize(text, sandbox, repo) {
  return text
    .replaceAll(sandbox.home, "<HOME>")
    .replaceAll(sandbox.bin, "<BIN>")
    .replaceAll(repo, "<REPO>")
    .replace(/\d{8}-\d{6}/g, "<STAMP>")
    .replaceAll("profiles.toml", "profiles.json");
}

export const FULL = ["claude", "codex", "opencode", "pi"];

/** A home that already has things sync must merge with, move aside or quarantine. */
export function seedLived(home, { legacyToml = false } = {}) {
  for (const d of [".claude", ".claude-work", ".codex", ".codex-work", ".config/opencode", ".pi/agent"]) {
    mkdirSync(join(home, d), { recursive: true });
  }
  put(home, ".claude/settings.json", JSON.stringify({
    permissions: { ask: ["Bash(my own rule:*)"], allow: ["Read"] },
    enabledPlugins: { "demo@market": true },
  }, null, 2));
  put(home, ".claude/CLAUDE.md", "my old instructions\n");
  put(home, ".claude-work/settings.json", "{}\n");
  put(home, ".agents/skills/stray/SKILL.md", "---\nname: stray\n---\n");
  put(home, ".claude/skills/also-stray/SKILL.md", "---\nname: also-stray\n---\n");
  put(home, ".pi/agent/skills/forbidden/SKILL.md", "x\n");
  put(home, ".codex/config.toml",
    'model = "x"\n\n[mcp_servers.gh_grep]\nurl = "https://old"\n\n[mcp_servers.gh_grep.env]\nA = "1"\n\n[mcp_servers.mine]\nurl = "https://mine"\n');
  put(home, ".config/opencode/opencode.json", JSON.stringify({
    permissions: [{ old: true }], permission: { bash: "allow" }, mcp: { keep: { type: "remote", url: "https://k" } },
  }, null, 2));
  put(home, ".zshenv", "export FOO=1\n");
  if (legacyToml) {  // only for comparing against the retired Python version
    put(home, ".config/agentrc/profiles.toml",
      '[claude]\nprofiles = ["~/.claude", "~/.claude-work"]\n[codex]\nprofiles = ["~/.codex", "~/.codex-work"]\n');
  } else {
    put(home, ".config/agentrc/profiles.json", JSON.stringify({
      claude: ["~/.claude", "~/.claude-work"],
      codex: ["~/.codex", "~/.codex-work"],
    }));
  }
}
