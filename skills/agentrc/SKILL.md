---
name: agentrc
description: Manage the user's shared agent configuration in ~/agentrc - the single source for skills, global AGENTS.md, approval policy and MCP servers across Claude Code, Codex, OpenCode and Pi. Use when the user asks to add, install, create, write, update, rename or remove a skill; to change global agent instructions, the approval policy or MCP servers; or when editing any SKILL.md, AGENTS.md or CLAUDE.md.
---

# agentrc

`~/agentrc` is the only place skills and global agent settings live.
`bin/sync` links them into every harness, so one change reaches Claude Code
(every profile), Codex (every home), OpenCode and Pi at once. Profiles beyond
the defaults are listed per machine in `~/.config/agentrc/profiles.json`.

Never install a skill any other way: no `npx skills add`, no plugin or
marketplace install, no copying into `~/.claude/skills`, `~/.agents/skills`,
`~/.config/opencode/skills` or `~/.pi/agent/skills`. Those folders are
generated, and `bin/sync` prunes what it did not create.

## Repo map

| Path | What it is |
|---|---|
| `AGENTS.md` | Global instructions, linked into every harness |
| `skills/<name>/` | One folder per skill (`SKILL.md` + optional files) |
| `skills.lock` | Where each skill came from, upstream commit, local changes |
| `policy/ask.txt` | Commands that always need the user's approval |
| `mcp.json` | MCP servers, rendered into each harness's format |
| `bin/sync`, `bin/doctor`, `bin/update` | Link, verify, pull upstream changes |
| `research/` | Why the setup looks like this; read before changing its shape |

## Add a skill

1. **Look for overlap first.** Read the descriptions in `skills/*/SKILL.md`.
   If an existing skill covers most of the job, extend it instead. The set is
   deliberately small: one skill per job.
2. **Write it, or bring it in.**
   - *New*: create `skills/<name>/SKILL.md`. Before writing, read
     [references/writing-for-agents.md](references/writing-for-agents.md) and
     [references/skill-mechanics.md](references/skill-mechanics.md).
   - *From an upstream repo*: shallow-clone it into a temporary directory,
     read the whole skill folder, and copy it to `skills/<name>/`. Never run
     install scripts from it.
3. **Frontmatter**: only `name` (must equal the folder name, `[a-z0-9-]`),
   `description` (≤1024 chars), and optionally `license`, `compatibility`,
   `metadata`, `disable-model-invocation`. Move vendor fields such as
   `allowed-tools`, `user-invocable`, `model` or `context` out, or drop them.
4. **Pick the invocation.** If only the user should start it, set
   `disable-model-invocation: true`, make the description a one-line human
   summary, and add `agents/openai.yaml` so Codex agrees:
   ```yaml
   interface:
     display_name: "<Title>"
     short_description: "<one line>"
   policy:
     allow_implicit_invocation: false
   ```
   Otherwise write a model-facing description with "Use when …" triggers.
5. **Keep it harness-neutral.** Never name one harness's tools (its question
   dialog, web-fetch or todo tool); describe the action instead ("ask the user",
   "fetch the page"). `bin/doctor` warns when it spots such names. To use another skill,
   write `Call the Skill tool with "<name>"`; it must be model-invoked.
   Supporting files sit one level deep and are linked relatively.
6. **Record provenance** in `skills.lock`: one line with the name, source
   (`owner/repo` or `local`), upstream path, commit, and what you changed.
7. **Apply and verify**: `~/agentrc/bin/sync && ~/agentrc/bin/doctor`.
8. **Commit** in `~/agentrc`: `git add -A && git commit -m "skills: add <name>"`.
9. Tell the user to start a new session (or restart the agent) in each harness
   to pick it up.

## Change or remove a skill

Edit or delete `skills/<name>/`, update `skills.lock`, then run step 7 and 8.
For a vendored skill, note the local change in `skills.lock` so `bin/update`
does not silently overwrite it.

## Update vendored skills

`bin/update` fetches each upstream in `skills.lock` and shows a diff per skill.
Apply one with `bin/update --apply <name>`, re-apply the local changes listed
in `skills.lock`, then sync, doctor and commit.

## Other settings

- **Global instructions**: edit `AGENTS.md`. Keep it under ~150 lines; move
  procedures into skills.
- **Approval policy**: one command prefix per line in `policy/ask.txt`.
- **MCP servers**: edit `mcp.json`. Secrets are written as `${secret:NAME}` and
  resolved at sync time from the environment or the macOS Keychain
  (`security find-generic-password -s agentrc -a NAME -w`). They never go
  in the repo.

Then run step 7 and 8.
