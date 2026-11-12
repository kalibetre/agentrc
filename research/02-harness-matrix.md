# Harness matrix (verified 2026-11-12)

Where each harness looks for instructions, skills, approval rules and MCP
servers, and how `bin/sync` wires it. Items marked **tested** were checked on
this machine; the rest come from official docs.

| | Claude Code 2.x | Codex CLI 0.167 | OpenCode 1.19 (V1 config) | Pi (`@earendil-works/pi-coding-agent`) |
|---|---|---|---|---|
| Homes | `~/.claude`, `~/.claude-work` (`CLAUDE_CONFIG_DIR`) | `~/.codex`, `~/.codex-work` (`CODEX_HOME`) | `~/.config/opencode` | `~/.pi/agent` |
| Global instructions | `<home>/CLAUDE.md`; reads `AGENTS.md` only when no CLAUDE.md exists, so we use an import: `@~/agentrc/AGENTS.md` | `<home>/AGENTS.md` (symlink); 32 KiB combined cap; no imports | `~/.config/opencode/AGENTS.md` (symlink) | `~/.pi/agent/AGENTS.md` (symlink); also reads CLAUDE.md |
| Skill folders scanned | `<home>/skills` only (**not** `~/.agents/skills`) | `~/.agents/skills`, `.agents/skills`; built-ins in `<home>/skills/.system` | `~/.config/opencode/skills`, `~/.claude/skills`, `~/.agents/skills` + project dirs | `~/.pi/agent/skills`, `~/.agents/skills` + project `.agents/skills` |
| User-only skills | `disable-model-invocation: true` | `agents/openai.yaml` → `policy.allow_implicit_invocation: false` | ignores the flag (skill stays model-visible) | `disable-model-invocation: true` |
| Approval rules | `permissions.ask`: `Bash(git push:*)` in settings.json | `<home>/rules/*.rules`: `prefix_rule(pattern=[…], decision="prompt")`; most restrictive match wins (**tested** with `codex execpolicy check`) | `permission.bash`: `{"git push *": "ask"}`. The V2 `permissions` array makes OpenCode 1.19 **refuse to start** (**tested**) | no built-in rules; extension `tool_call` handler with `ctx.ui.confirm` (blocks when there is no UI) |
| MCP | `claude mcp add -s user --transport http` → `<home>/.claude.json` | `[mcp_servers.<name>] url=…`, `http_headers={…}` in config.toml | `mcp.<name> = {type: "remote", url, headers}` | `~/.pi/agent/mcp.json` `mcpServers.<name> = {url, headers}`; supports `${VAR}` and `!command` |
| Subagents | `<home>/agents/*.md` | `<home>/agents/*.toml` | `~/.config/opencode/agents/*.md` | extensions only |
| Hooks | settings.json `hooks` | `hooks.json` (Claude-style events) | JS/TS plugins | TS extensions |

## Findings that changed the design

- **OpenCode pulls Claude's skills.** Without
  `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1` it lists everything in `~/.claude/skills`,
  including 18 claude.ai-synced skills under `synced/` (**tested**: 38 skills
  without the flag, exactly ours + 1 built-in with it). `bin/sync` sets the flag
  in `~/.zshenv`. It deduplicates same-named skills itself.
- **Pi double-loads** when `~/.pi/agent/skills` mirrors `~/.agents/skills`. The
  mirror was removed; `bin/sync` quarantines anything that reappears there.
- **Codex `.rules` decisions**: `allow` / `prompt` / `forbidden`. Files load from
  every `rules/` folder of every config layer.
- **T3 Code** has no config of its own: each provider instance points at a home
  (`~/.claude`, `~/.claude-work`, `~/.codex`, `~/.codex-work`), so wiring the
  homes covers T3 too. Restart the agent session after changes.
- **Claude Code reloads skills live** in a running session (seen in this session).

## Tools for syncing config across harnesses (not used)

| Tool | Scope | Why not |
|---|---|---|
| `npx skills` (vercel-labs, ~39k stars) | skills only, 80+ agents, symlink or copy | Installs outside the repo; we vendor instead |
| rulesync (~1.6k) | rules, MCP, commands, agents, skills, hooks | Broad but complex, frequent breaking majors, a generate step to forget |
| ruler (~3k) | rules + MCP | Shallower coverage |

Four harnesses with mostly-native `AGENTS.md` and `~/.agents/skills` support made
a ~500-line stdlib Python sync cheaper than adopting a generator.

## Keeping AGENTS.md lean

Claude: target under 200 lines (imports do not save context). Codex: 32 KiB
combined cap, silently truncated. Put commands, layout, non-obvious conventions
and hard rules in AGENTS.md; procedures go into skills; enforcement goes into
permission rules, because instructions are advisory.
