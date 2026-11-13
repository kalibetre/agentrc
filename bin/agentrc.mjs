// Shared helpers for bin/sync, bin/doctor and bin/update. Node standard library only.
import { spawnSync } from "node:child_process";
import {
  accessSync, constants, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync,
  renameSync, statSync, symlinkSync, unlinkSync, writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (Number(process.versions.node.split(".")[0]) < 20) {
  console.error(`agentrc needs Node 20 or newer (this is ${process.versions.node}).`);
  process.exit(1);
}

export const HOME = homedir();
export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SKILLS = join(REPO, "skills");
export const AGENTS_MD = join(REPO, "AGENTS.md");
export const POLICY = join(REPO, "policy", "ask.txt");
export const MCP = join(REPO, "mcp.json");
export const LOCK = join(REPO, "skills.lock");
export const PI_GUARD = join(REPO, "adapters", "pi", "agentrc-guard.ts");

export const AGENTS_SKILLS = join(HOME, ".agents", "skills");
export const QUARANTINE = join(HOME, ".agents", "quarantine");
export const STATE = join(HOME, ".agents", ".agentrc-state.json");
export const ZSHENV = join(HOME, ".zshenv");

// Entries a harness manages itself inside a skills folder we also link into.
export const BUILTIN_SKILL_ENTRIES = new Set(["synced", ".system", ".DS_Store"]);
export const CLAUDE_IMPORT = "@~/agentrc/AGENTS.md\n";
export const MARK_BEGIN = "# >>> agentrc >>>";
export const MARK_END = "# <<< agentrc <<<";
// The project was called agent-config until 2026-11-13 (D14). bin/sync migrates
// what it wrote under the old name; these can go once no machine has them.
export const LEGACY_CLAUDE_IMPORT = "@~/agent-config/AGENTS.md\n";
export const LEGACY_MARKS = ["# >>> agent-config >>>", "# <<< agent-config <<<"];
export const LEGACY_STATE = join(HOME, ".agents", ".agent-config-state.json");
export const LEGACY_CODEX_RULES = "agent-config.rules";
export const LEGACY_PI_GUARD = "agent-config-guard.ts";
const HARNESS_ONLY_TOOLS = /\b(AskUserQuestion|WebFetch|TodoWrite|request_user_input|delegate_task)\b/;

// ---------------------------------------------------------------- output
export class Log {
  errors = [];
  warnings = [];
  ok(msg) { console.log(`  ok    ${msg}`); }
  change(msg) { console.log(`  +     ${msg}`); }
  warn(msg) { this.warnings.push(msg); console.log(`  warn  ${msg}`); }
  error(msg) { this.errors.push(msg); console.log(`  FAIL  ${msg}`); }
  skip(msg) { console.log(`  skip  ${msg}`); }
  section(title) { console.log(`\n${title}`); }
}

export const short = (p) => String(p).replace(HOME, "~");
export const expandUser = (p) => (p === "~" ? HOME : p.startsWith("~/") ? join(HOME, p.slice(2)) : p);

// ---------------------------------------------------------------- filesystem helpers
export const isDir = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };
export const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
export const isSymlink = (p) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };
export const lexists = (p) => { try { lstatSync(p); return true; } catch { return false; } };
export const readText = (p) => readFileSync(p, "utf8");
export const listDir = (p) => readdirSync(p).sort();
export const linkTarget = (p) => (isSymlink(p) ? readlinkSync(p) : null);
export const unlinkIfExists = (p) => { try { unlinkSync(p); } catch (e) { if (e.code !== "ENOENT") throw e; } };

function isExecutable(p) {
  try { accessSync(p, constants.X_OK); return isFile(p); } catch { return false; }
}

export function which(name) {
  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (dir && isExecutable(join(dir, name))) return join(dir, name);
  }
  return null;
}

/** All files under dir, sorted, not following directory links; `.git` is skipped. */
export function walkFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = join(dir, e.name);
    if (e.name === ".git") continue;
    if (e.isDirectory()) out.push(...walkFiles(p));
    else if (e.isFile() || (e.isSymbolicLink() && isFile(p))) out.push(p);
  }
  return out;
}

/** JSON.stringify with sorted keys, for comparing two values. */
export function canon(value) {
  return JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v);
}

export function loadJson(path) {
  return existsSync(path) ? JSON.parse(readText(path)) : {};
}

export function saveJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = join(dirname(path), basename(path) + ".agentrc.tmp");
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmp, path);
}

export function quarantine(path, log, why) {
  const d = new Date(), p2 = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  const dest = join(QUARANTINE, stamp, short(dirname(path)).replace(/^[~/]+|[~/]+$/g, "").replaceAll("/", "_"), basename(path));
  mkdirSync(dirname(dest), { recursive: true });
  renameSync(path, dest);
  log.change(`moved ${short(path)} -> ${short(dest)} (${why})`);
}

export function ensureSymlink(link, target, log) {
  if (isSymlink(link)) {
    if (readlinkSync(link) === target) return;
    unlinkSync(link);
  } else if (existsSync(link)) {
    const backup = join(dirname(link), basename(link) + ".pre-agentrc");
    renameSync(link, backup);
    log.change(`kept old ${short(link)} as ${short(backup)}`);
  }
  mkdirSync(dirname(link), { recursive: true });
  symlinkSync(target, link);
  log.change(`linked ${short(link)} -> ${short(target)}`);
}

export const loadState = () => loadJson(existsSync(STATE) ? STATE : LEGACY_STATE);
export function saveState(state) {
  saveJson(STATE, state);
  unlinkIfExists(LEGACY_STATE);
}

// ---------------------------------------------------------------- harnesses
// A harness is synced when its program is installed; each of its profiles (home
// folders) is synced when the folder exists. Profiles come from PROFILES_FILE when
// it lists the harness, otherwise from the standard home plus the harness's own
// environment variable. See research/05-decisions.md D11 and D13.
export const PROFILES_FILE = join(HOME, ".config", "agentrc", "profiles.json");
export const LEGACY_PROFILES_FILE = join(HOME, ".config", "agentrc", "profiles.toml");

// knownPaths: install locations checked when the program is not on PATH (apps and
// launchers often run sync with a shorter PATH than an interactive shell).
export const HARNESSES = [
  { name: "claude", defaultHome: join(HOME, ".claude"), homeEnv: "CLAUDE_CONFIG_DIR",
    knownPaths: ["~/.local/bin/claude", "/opt/homebrew/bin/claude", "/usr/local/bin/claude"] },
  { name: "codex", defaultHome: join(HOME, ".codex"), homeEnv: "CODEX_HOME",
    knownPaths: ["/opt/homebrew/bin/codex", "/usr/local/bin/codex"] },
  { name: "opencode", defaultHome: join(HOME, ".config", "opencode"), homeEnv: null,
    knownPaths: ["~/.opencode/bin/opencode", "/opt/homebrew/bin/opencode", "/usr/local/bin/opencode"] },
  { name: "pi", defaultHome: join(HOME, ".pi", "agent"), homeEnv: "PI_CODING_AGENT_DIR",
    knownPaths: ["/opt/homebrew/bin/pi", "/usr/local/bin/pi"] },
];

function findProgram(h) {
  const found = which(h.name);
  if (found) return found;
  if (process.env.AGENTRC_NO_KNOWN_PATHS) return null;  // tests: ignore programs installed on this machine
  return h.knownPaths.map(expandUser).find(isExecutable) ?? null;
}

function readProfilesFile() {
  if (!existsSync(PROFILES_FILE)) return { listed: {}, errors: [] };
  let data;
  try {
    data = JSON.parse(readText(PROFILES_FILE));
  } catch (e) {
    return { listed: {}, errors: [`${short(PROFILES_FILE)} is not valid JSON: ${e.message}`] };
  }
  const names = HARNESSES.map((h) => h.name);
  const where = short(PROFILES_FILE);
  const listed = {}, errors = [];
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { listed, errors: [`${where}: expected an object like {"claude": ["~/.claude"]}`] };
  }
  for (const [key, paths] of Object.entries(data)) {
    if (!names.includes(key)) errors.push(`${where}: unknown harness "${key}" (known: ${[...names].sort().join(", ")})`);
    else if (!Array.isArray(paths) || !paths.every((x) => typeof x === "string")) {
      errors.push(`${where}: "${key}" needs a list of folders, e.g. "${key}": ["~/path"]`);
    } else listed[key] = paths.map(expandUser);
  }
  return { listed, errors };
}

function configuredProfiles(h, listed) {
  if (listed[h.name]) return listed[h.name];
  const homes = [h.defaultHome];
  const env = h.homeEnv ? process.env[h.homeEnv] : "";
  if (env && expandUser(env) !== h.defaultHome) homes.push(expandUser(env));
  return homes;
}

const { listed: LISTED, errors: PROFILE_ERRORS } = readProfilesFile();
export const PROGRAMS = Object.fromEntries(HARNESSES.map((h) => [h.name, findProgram(h)]));
export const CONFIGURED = Object.fromEntries(HARNESSES.map((h) => [h.name, configuredProfiles(h, LISTED)]));
// Profiles sync and doctor act on: program installed and folder present.
export const ACTIVE = Object.fromEntries(
  Object.entries(CONFIGURED).map(([name, homes]) => [name, homes.filter((p) => PROGRAMS[name] && isDir(p))]));
export const CLAUDE_HOMES = ACTIVE.claude;
export const CODEX_HOMES = ACTIVE.codex;
export const OPENCODE_HOMES = ACTIVE.opencode;
export const PI_HOMES = ACTIVE.pi;
// Folders we never link into; anything found there is moved to quarantine.
export const FORBIDDEN_SKILL_DIRS = [...CONFIGURED.opencode, ...CONFIGURED.pi].map((p) => join(p, "skills"));
// Folder names that suggest an unlisted profile, with a file that marks one.
const PROFILE_HINTS = { claude: [/^\.claude[-.]/, "settings.json"], codex: [/^\.codex[-.]/, "config.toml"] };

export function reportHarnesses(log, hintUnlisted = false) {
  log.section(`Harnesses (${short(PROFILES_FILE)}${existsSync(PROFILES_FILE) ? "" : ": not present, using defaults"})`);
  for (const msg of PROFILE_ERRORS) log.error(msg);
  if (existsSync(LEGACY_PROFILES_FILE)) {
    log.warn(`${short(LEGACY_PROFILES_FILE)} is no longer read; move its folders into ${short(PROFILES_FILE)}`);
  }
  for (const h of HARNESSES) {
    const program = PROGRAMS[h.name];
    if (!program) { log.skip(`${h.name}: not installed`); continue; }
    log.ok(`${h.name}: ${short(program)}`);
    for (const home of CONFIGURED[h.name]) {
      if (ACTIVE[h.name].includes(home)) log.ok(`  ${short(home)}`);
      else log.skip(`  ${short(home)} (folder missing)`);
    }
    if (hintUnlisted && PROFILE_HINTS[h.name]) {
      const [pattern, marker] = PROFILE_HINTS[h.name];
      for (const name of listDir(HOME).filter((n) => pattern.test(n))) {
        const d = join(HOME, name);
        if (isDir(d) && existsSync(join(d, marker)) && !CONFIGURED[h.name].includes(d)) {
          log.warn(`${short(d)} looks like a ${h.name} profile; add it to ${short(PROFILES_FILE)} to sync it`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------- skills
/** Minimal YAML frontmatter reader: top-level scalar keys, block scalars joined. */
export function frontmatter(skillMd) {
  const text = readText(skillMd);
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---", 4);
  if (end === -1) return {};
  const data = {};
  let key = null;
  for (const line of text.slice(4, end).split(/\r?\n/)) {
    const m = /^([A-Za-z][\w-]*):\s?(.*)$/.exec(line);
    if (m) {
      key = m[1];
      const val = m[2].trim();
      data[key] = ["|", ">", "|-", ">-"].includes(val) ? "" : val.replace(/^["']+|["']+$/g, "");
    } else if (key && /^[ \t]/.test(line)) {
      data[key] = `${data[key]} ${line.trim()}`.trim();
    }
  }
  return data;
}

export function skills() {
  return Object.fromEntries(
    listDir(SKILLS).filter((n) => isFile(join(SKILLS, n, "SKILL.md"))).map((n) => [n, join(SKILLS, n)]));
}

export function validateSkill(name, path, log) {
  const fm = frontmatter(join(path, "SKILL.md"));
  if (fm.name !== name) {
    log.error(`skills/${name}: frontmatter name is ${fm.name === undefined ? "None" : `'${fm.name}'`}, must equal the folder name`);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) {
    log.error(`skills/${name}: name must be lowercase a-z, 0-9 and single hyphens, max 64`);
  }
  const desc = fm.description ?? "";
  if (!desc) log.error(`skills/${name}: missing description`);
  else if (desc.length > 1024) log.error(`skills/${name}: description is ${desc.length} chars (max 1024)`);
  const userOnly = (fm["disable-model-invocation"] ?? "").toLowerCase() === "true";
  const yaml = join(path, "agents", "openai.yaml");
  const codexUserOnly = isFile(yaml) && /allow_implicit_invocation:\s*false/.test(readText(yaml));
  if (userOnly && !codexUserOnly) {
    log.error(`skills/${name}: user-invoked but agents/openai.yaml lacks policy.allow_implicit_invocation: false`);
  }
  if (codexUserOnly && !userOnly) {
    log.error(`skills/${name}: openai.yaml says user-invoked but SKILL.md lacks disable-model-invocation: true`);
  }
  for (const md of walkFiles(path)) {
    if (!md.endsWith(".md") || basename(md) === "NOTICE.md") continue;
    const hit = HARNESS_ONLY_TOOLS.exec(readText(md));
    if (hit) log.warn(`${short(md)}: names a harness-only tool (${hit[1]})`);
  }
}

export function lockEntries() {
  const out = {};
  for (const line of readText(LOCK).split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const m = /^\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(.*))?$/.exec(line);
    if (!m) continue;
    out[m[1]] = { source: m[2], path: m[3], commit: m[4], changes: m[5] || "-" };
  }
  return out;
}

// ---------------------------------------------------------------- policy & mcp
export function policyPrefixes() {
  return readText(POLICY).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => l.split(/\s+/));
}

export const claudeAskRules = () => policyPrefixes().map((p) => `Bash(${p.join(" ")}:*)`);

/** OpenCode V1 `permission.bash` patterns (the installed OpenCode rejects the V2 array). */
export function opencodeRules() {
  const rules = {};
  for (const p of policyPrefixes()) {
    const cmd = p.join(" ");
    rules[cmd] = "ask";
    rules[`${cmd} *`] = "ask";
  }
  return rules;
}

export function codexRulesText() {
  const lines = ["# Generated by ~/agentrc/bin/sync from policy/ask.txt. Do not edit.", ""];
  for (const p of policyPrefixes()) {
    lines.push(`prefix_rule(pattern=[${p.map((w) => JSON.stringify(w)).join(", ")}], decision="prompt", ` +
      `justification="agentrc policy: ask the user first")`);
  }
  return lines.join("\n") + "\n";
}

export function resolveSecret(name) {
  if (process.env[name]) return process.env[name];
  const r = spawnSync("security", ["find-generic-password", "-s", "agentrc", "-a", name, "-w"],
    { encoding: "utf8", timeout: 10000 });
  if (r.error || r.status !== 0) return null;
  return r.stdout.trim() || null;
}

/** Return { servers: resolved servers, skipped: names skipped because a secret is missing }. */
export function mcpServers(log = null) {
  const servers = loadJson(MCP).servers ?? {};
  const resolved = {}, skipped = [];
  for (const [name, spec] of Object.entries(servers)) {
    const headers = {}, missing = [];
    for (const [k, v] of Object.entries(spec.headers ?? {})) {
      headers[k] = v.replace(/\$\{secret:([A-Z0-9_]+)\}/g, (_, secret) => {
        const val = resolveSecret(secret);
        if (val === null) { missing.push(secret); return ""; }
        return val;
      });
    }
    if (missing.length) {
      skipped.push(name);
      log?.warn(`mcp ${name}: secret ${missing.join(", ")} not found in env or Keychain; existing harness entries left as they are`);
      continue;
    }
    resolved[name] = { url: spec.url, headers };
  }
  return { servers: resolved, skipped };
}

// JSON string escapes are valid TOML basic strings.
export const tomlStr = (s) => JSON.stringify(s);

/** Remove [mcp_servers.<name>] tables (and their sub-tables) for the given names. */
export function stripTomlTables(text, names) {
  const out = [];
  let skipping = false;
  for (const line of text.match(/[^\n]*\n|[^\n]+/g) ?? []) {
    const m = /^\s*\[+([^\]]+)\]+\s*$/.exec(line.replace(/\r?\n$/, ""));
    if (m) {
      const key = m[1].trim();
      skipping = names.some((n) => key === `mcp_servers.${n}` || key.startsWith(`mcp_servers.${n}.`));
    }
    if (!skipping) out.push(line);
  }
  return out.join("");
}

/** Names of the [mcp_servers.<name>] tables in a Codex config.toml. */
export function tomlMcpServerNames(text) {
  const names = new Set();
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*\[+\s*mcp_servers\.(?:"([^"]+)"|([^\].\s"]+))/.exec(line);
    if (m) names.add(m[1] ?? m[2]);
  }
  return names;
}

export function stripMarkedBlock(text) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [begin, end] of [[MARK_BEGIN, MARK_END], LEGACY_MARKS]) {
    text = text.replace(new RegExp(`\\n?${esc(begin)}[\\s\\S]*?${esc(end)}\\n?`, "g"), "\n");
  }
  return text;
}
