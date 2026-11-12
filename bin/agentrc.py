"""Shared helpers for bin/sync, bin/doctor and bin/update. Standard library only."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import time
import tomllib
from dataclasses import dataclass
from pathlib import Path

HOME = Path.home()
REPO = Path(__file__).resolve().parent.parent
SKILLS = REPO / "skills"
AGENTS_MD = REPO / "AGENTS.md"
POLICY = REPO / "policy" / "ask.txt"
MCP = REPO / "mcp.json"
LOCK = REPO / "skills.lock"
PI_GUARD = REPO / "adapters" / "pi" / "agentrc-guard.ts"

AGENTS_SKILLS = HOME / ".agents" / "skills"
QUARANTINE = HOME / ".agents" / "quarantine"
STATE = HOME / ".agents" / ".agentrc-state.json"
ZSHENV = HOME / ".zshenv"

# Entries a harness manages itself inside a skills folder we also link into.
BUILTIN_SKILL_ENTRIES = {"synced", ".system", ".DS_Store"}
CLAUDE_IMPORT = "@~/agentrc/AGENTS.md\n"
MARK_BEGIN = "# >>> agentrc >>>"
MARK_END = "# <<< agentrc <<<"
# The project was called agent-config until 2026-11-13 (D14). bin/sync migrates
# what it wrote under the old name; these can go once no machine has them.
LEGACY_CLAUDE_IMPORT = "@~/agent-config/AGENTS.md\n"
LEGACY_MARKS = ("# >>> agent-config >>>", "# <<< agent-config <<<")
LEGACY_STATE = HOME / ".agents" / ".agent-config-state.json"
LEGACY_CODEX_RULES = "agent-config.rules"
LEGACY_PI_GUARD = "agent-config-guard.ts"
HARNESS_ONLY_TOOLS = re.compile(r"\b(AskUserQuestion|WebFetch|TodoWrite|request_user_input|delegate_task)\b")


# ---------------------------------------------------------------- output
class Log:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def ok(self, msg: str) -> None:
        print(f"  ok    {msg}")

    def change(self, msg: str) -> None:
        print(f"  +     {msg}")

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)
        print(f"  warn  {msg}")

    def error(self, msg: str) -> None:
        self.errors.append(msg)
        print(f"  FAIL  {msg}")

    def skip(self, msg: str) -> None:
        print(f"  skip  {msg}")

    def section(self, title: str) -> None:
        print(f"\n{title}")


def short(p: Path | str) -> str:
    return str(p).replace(str(HOME), "~", 1)


# ---------------------------------------------------------------- harnesses
# A harness is synced when its program is installed; each of its profiles (home
# folders) is synced when the folder exists. Profiles come from PROFILES_FILE when
# it lists the harness, otherwise from the standard home plus the harness's own
# environment variable. See research/05-decisions.md D11 and D13.
PROFILES_FILE = HOME / ".config" / "agentrc" / "profiles.toml"


@dataclass(frozen=True)
class Harness:
    name: str
    default_home: Path
    home_env: str | None
    # Install locations checked when the program is not on PATH (apps and
    # launchers often run sync with a shorter PATH than an interactive shell).
    known_paths: tuple[str, ...]


HARNESSES = [
    Harness("claude", HOME / ".claude", "CLAUDE_CONFIG_DIR",
            ("~/.local/bin/claude", "/opt/homebrew/bin/claude", "/usr/local/bin/claude")),
    Harness("codex", HOME / ".codex", "CODEX_HOME",
            ("/opt/homebrew/bin/codex", "/usr/local/bin/codex")),
    Harness("opencode", HOME / ".config" / "opencode", None,
            ("~/.opencode/bin/opencode", "/opt/homebrew/bin/opencode", "/usr/local/bin/opencode")),
    Harness("pi", HOME / ".pi" / "agent", "PI_CODING_AGENT_DIR",
            ("/opt/homebrew/bin/pi", "/usr/local/bin/pi")),
]


def find_program(h: Harness) -> str | None:
    found = shutil.which(h.name)
    if found:
        return found
    for p in h.known_paths:
        path = Path(p).expanduser()
        if path.is_file() and os.access(path, os.X_OK):
            return str(path)
    return None


def _read_profiles_file() -> tuple[dict[str, list[Path]], list[str]]:
    if not PROFILES_FILE.exists():
        return {}, []
    try:
        data = tomllib.loads(PROFILES_FILE.read_text())
    except tomllib.TOMLDecodeError as e:
        return {}, [f"{short(PROFILES_FILE)} is not valid TOML: {e}"]
    names = {h.name for h in HARNESSES}
    out, errors = {}, []
    for key, table in data.items():
        profiles = table.get("profiles") if isinstance(table, dict) else None
        if key not in names:
            errors.append(f"{short(PROFILES_FILE)}: unknown harness [{key}] (known: {', '.join(sorted(names))})")
        elif not isinstance(profiles, list) or not all(isinstance(x, str) for x in profiles):
            errors.append(f"{short(PROFILES_FILE)}: [{key}] needs profiles = [\"~/path\", ...]")
        else:
            out[key] = [Path(x).expanduser() for x in profiles]
    return out, errors


def configured_profiles(h: Harness, listed: dict[str, list[Path]]) -> list[Path]:
    if h.name in listed:
        return listed[h.name]
    homes = [h.default_home]
    env = os.environ.get(h.home_env or "")
    if env and Path(env).expanduser() != h.default_home:
        homes.append(Path(env).expanduser())
    return homes


_LISTED, PROFILE_ERRORS = _read_profiles_file()
PROGRAMS = {h.name: find_program(h) for h in HARNESSES}
CONFIGURED = {h.name: configured_profiles(h, _LISTED) for h in HARNESSES}
# Profiles sync and doctor act on: program installed and folder present.
ACTIVE = {name: [p for p in homes if PROGRAMS[name] and p.is_dir()] for name, homes in CONFIGURED.items()}
CLAUDE_HOMES = ACTIVE["claude"]
CODEX_HOMES = ACTIVE["codex"]
OPENCODE_HOMES = ACTIVE["opencode"]
PI_HOMES = ACTIVE["pi"]
# Folders we never link into; anything found there is moved to quarantine.
FORBIDDEN_SKILL_DIRS = [p / "skills" for p in CONFIGURED["opencode"] + CONFIGURED["pi"]]
# Folder names that suggest an unlisted profile, with a file that marks one.
PROFILE_HINTS = {"claude": (".claude[-.]*", "settings.json"), "codex": (".codex[-.]*", "config.toml")}


def report_harnesses(log: Log, hint_unlisted: bool = False) -> None:
    log.section(f"Harnesses ({short(PROFILES_FILE)}{'' if PROFILES_FILE.exists() else ': not present, using defaults'})")
    for msg in PROFILE_ERRORS:
        log.error(msg)
    for h in HARNESSES:
        program = PROGRAMS[h.name]
        if not program:
            log.skip(f"{h.name}: not installed")
            continue
        log.ok(f"{h.name}: {short(program)}")
        for home in CONFIGURED[h.name]:
            if home in ACTIVE[h.name]:
                log.ok(f"  {short(home)}")
            else:
                log.skip(f"  {short(home)} (folder missing)")
        if hint_unlisted and h.name in PROFILE_HINTS:
            pattern, marker = PROFILE_HINTS[h.name]
            for d in sorted(HOME.glob(pattern)):
                if d.is_dir() and (d / marker).exists() and d not in CONFIGURED[h.name]:
                    log.warn(f"{short(d)} looks like a {h.name} profile; add it to {short(PROFILES_FILE)} to sync it")


# ---------------------------------------------------------------- skills
def frontmatter(skill_md: Path) -> dict[str, str]:
    """Minimal YAML frontmatter reader: top-level scalar keys, block scalars joined."""
    text = skill_md.read_text()
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---", 4)
    if end == -1:
        return {}
    data: dict[str, str] = {}
    key = None
    for line in text[4:end].splitlines():
        m = re.match(r"^([A-Za-z][\w-]*):\s?(.*)$", line)
        if m:
            key, val = m.group(1), m.group(2).strip()
            data[key] = "" if val in ("|", ">", "|-", ">-") else val.strip("\"'")
        elif key and line.startswith((" ", "\t")):
            data[key] = (data[key] + " " + line.strip()).strip()
    return data


def skills() -> dict[str, Path]:
    return {p.name: p for p in sorted(SKILLS.iterdir()) if (p / "SKILL.md").is_file()}


def validate_skill(name: str, path: Path, log: Log) -> None:
    fm = frontmatter(path / "SKILL.md")
    if fm.get("name") != name:
        log.error(f"skills/{name}: frontmatter name is {fm.get('name')!r}, must equal the folder name")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name) or len(name) > 64:
        log.error(f"skills/{name}: name must be lowercase a-z, 0-9 and single hyphens, max 64")
    desc = fm.get("description", "")
    if not desc:
        log.error(f"skills/{name}: missing description")
    elif len(desc) > 1024:
        log.error(f"skills/{name}: description is {len(desc)} chars (max 1024)")
    user_only = fm.get("disable-model-invocation", "").lower() == "true"
    yaml = path / "agents" / "openai.yaml"
    codex_user_only = yaml.is_file() and re.search(r"allow_implicit_invocation:\s*false", yaml.read_text())
    if user_only and not codex_user_only:
        log.error(f"skills/{name}: user-invoked but agents/openai.yaml lacks policy.allow_implicit_invocation: false")
    if codex_user_only and not user_only:
        log.error(f"skills/{name}: openai.yaml says user-invoked but SKILL.md lacks disable-model-invocation: true")
    for md in path.rglob("*.md"):
        if md.name == "NOTICE.md":
            continue
        hit = HARNESS_ONLY_TOOLS.search(md.read_text())
        if hit:
            log.warn(f"{short(md)}: names a harness-only tool ({hit.group(1)})")


def lock_entries() -> dict[str, dict[str, str]]:
    out = {}
    for line in LOCK.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        parts = line.split(None, 4)
        if len(parts) < 4:
            continue
        name, source, upath, commit = parts[:4]
        out[name] = {"source": source, "path": upath, "commit": commit,
                     "changes": parts[4] if len(parts) > 4 else "-"}
    return out


# ---------------------------------------------------------------- filesystem
def quarantine(path: Path, log: Log, why: str) -> None:
    dest = QUARANTINE / time.strftime("%Y%m%d-%H%M%S") / short(path.parent).strip("~/").replace("/", "_") / path.name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(path), str(dest))
    log.change(f"moved {short(path)} -> {short(dest)} ({why})")


def ensure_symlink(link: Path, target: Path, log: Log) -> None:
    if link.is_symlink():
        if Path(os.readlink(link)) == target:
            return
        link.unlink()
    elif link.exists():
        backup = link.with_name(link.name + ".pre-agentrc")
        shutil.move(str(link), str(backup))
        log.change(f"kept old {short(link)} as {short(backup)}")
    link.parent.mkdir(parents=True, exist_ok=True)
    link.symlink_to(target)
    log.change(f"linked {short(link)} -> {short(target)}")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text()) if path.exists() else {}


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".agentrc.tmp")
    tmp.write_text(json.dumps(data, indent=2) + "\n")
    os.replace(tmp, path)


def load_state() -> dict:
    return load_json(STATE if STATE.exists() else LEGACY_STATE)


def save_state(state: dict) -> None:
    save_json(STATE, state)
    LEGACY_STATE.unlink(missing_ok=True)


# ---------------------------------------------------------------- policy & mcp
def policy_prefixes() -> list[list[str]]:
    out = []
    for line in POLICY.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            out.append(line.split())
    return out


def claude_ask_rules() -> list[str]:
    return [f"Bash({' '.join(p)}:*)" for p in policy_prefixes()]


def opencode_rules() -> dict[str, str]:
    """OpenCode V1 `permission.bash` patterns (the installed OpenCode rejects the V2 array)."""
    rules = {}
    for p in policy_prefixes():
        cmd = " ".join(p)
        rules[cmd] = "ask"
        rules[cmd + " *"] = "ask"
    return rules


def codex_rules_text() -> str:
    lines = ["# Generated by ~/agentrc/bin/sync from policy/ask.txt. Do not edit.", ""]
    for p in policy_prefixes():
        pat = ", ".join(json.dumps(w) for w in p)
        lines.append(f'prefix_rule(pattern=[{pat}], decision="prompt", '
                     f'justification="agentrc policy: ask the user first")')
    return "\n".join(lines) + "\n"


SECRET = re.compile(r"\$\{secret:([A-Z0-9_]+)\}")


def resolve_secret(name: str) -> str | None:
    if os.environ.get(name):
        return os.environ[name]
    try:
        out = subprocess.run(["security", "find-generic-password", "-s", "agentrc", "-a", name, "-w"],
                             capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        return None
    if out.returncode != 0:
        return None
    return out.stdout.strip() or None


def mcp_servers(log: Log | None = None) -> tuple[dict[str, dict], list[str]]:
    """Return (resolved servers, names skipped because a secret is missing)."""
    servers = load_json(MCP).get("servers", {})
    resolved, skipped = {}, []
    for name, spec in servers.items():
        headers, missing = {}, []
        for k, v in spec.get("headers", {}).items():
            def sub(m: re.Match) -> str:
                val = resolve_secret(m.group(1))
                if val is None:
                    missing.append(m.group(1))
                    return ""
                return val
            headers[k] = SECRET.sub(sub, v)
        if missing:
            skipped.append(name)
            if log:
                log.warn(f"mcp {name}: secret {', '.join(missing)} not found in env or Keychain; "
                         f"existing harness entries left as they are")
            continue
        resolved[name] = {"url": spec["url"], "headers": headers}
    return resolved, skipped


def toml_str(s: str) -> str:
    return json.dumps(s)  # JSON string escapes are valid TOML basic strings


def strip_toml_tables(text: str, names: list[str]) -> str:
    """Remove [mcp_servers.<name>] tables (and their sub-tables) for the given names."""
    out, skipping = [], False
    for line in text.splitlines(keepends=True):
        m = re.match(r"^\s*\[+([^\]]+)\]+\s*$", line)
        if m:
            key = m.group(1).strip()
            skipping = any(key == f"mcp_servers.{n}" or key.startswith(f"mcp_servers.{n}.") for n in names)
        if not skipping:
            out.append(line)
    return "".join(out)


def strip_marked_block(text: str) -> str:
    for begin, end in [(MARK_BEGIN, MARK_END), LEGACY_MARKS]:
        text = re.sub(rf"\n?{re.escape(begin)}.*?{re.escape(end)}\n?", "\n", text, flags=re.S)
    return text
