---
name: setup-repo
description: Set up a repository for agent work - AGENTS.md, a one-line CLAUDE.md, and docs/agents/ files the skills read.
disable-model-invocation: true
---

# Setup repo

Give one repository the files every harness and every skill in
`~/agentrc` expects. Run it once per repo; re-run to change the tracker.

## 1. Explore (read only)

- `git remote get-url origin`: GitHub, Bitbucket or other.
- `AGENTS.md`, `CLAUDE.md`, `.claude/CLAUDE.md` at the root: which exist, and
  what they say.
- `GLOSSARY.md`, `GLOSSARY-MAP.md`, legacy `CONTEXT.md`, `docs/adr/`.
- `docs/agents/`: earlier output of this skill.
- Build, test, lint and typecheck commands: `package.json` scripts, `Makefile`,
  `justfile`, `pyproject.toml`, `go.mod`, CI workflow files.
- Ticket keys in `git log --format=%s -30` (e.g. `AF-439:`), which point at Jira.

## 2. Propose, then ask once

Show the user, in one message:

- **Issue tracker**: GitHub issues, Jira (`<KEY>` and site), local markdown
  (`.scratch/`), or other. Default to what the remote and the commit history suggest.
- **Domain docs**: single-context (one `GLOSSARY.md` + `docs/adr/`) unless the
  repo is a monorepo with separate bounded contexts.
- **The AGENTS.md you will write or update** (section 3).

Wait for confirmation or corrections.

## 3. Write

**`AGENTS.md`** is the one instruction file. Keep it under ~150 lines, and only
put in it what an agent cannot discover quickly:

```markdown
# <Project>

<One paragraph: what this is, who uses it.>

## Commands
- Install: `…`   Dev: `…`   Test (one file): `…`   Test (all): `…`   Typecheck/lint: `…`

## Layout
<Only the non-obvious directories.>

## Conventions
<Rules that differ from the defaults in ~/agentrc/AGENTS.md: branch/commit
format, generated code not to edit, migration rules, env/secrets handling.>

## Agent skills
- Issue tracker: <one line>. See `docs/agents/issue-tracker.md`.
- Domain docs: <single- or multi-context>. See `docs/agents/domain.md`.
```

If `AGENTS.md` already exists, edit it in place: add or refresh only the
`## Agent skills` block and fill obvious gaps in Commands; keep the user's text.

If only `CLAUDE.md` exists, move its content into `AGENTS.md` with `git mv`
and keep the history.

**`CLAUDE.md`** contains exactly one line, so Claude Code reads the same file:

```markdown
@AGENTS.md
```

**`docs/agents/issue-tracker.md`**: copy the matching template from this
skill's `templates/` (`issue-tracker-github.md`, `issue-tracker-jira.md`,
`issue-tracker-local.md`) and fill in the placeholders. For any other
tracker, write the same sections from the user's description.

**`docs/agents/domain.md`**: copy `templates/domain.md`; for multi-context
repos, adjust the paths it lists.

Do not create `GLOSSARY.md` or ADRs now; `domain-modeling` creates them when a
term or decision is actually settled.

## 4. Done

List the files written or changed, and suggest committing them in one commit:
`chore: set up agent instructions`.
