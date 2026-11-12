# Global agent instructions

These apply in every harness (Claude Code, Codex, OpenCode, Pi) and every
repository. A repository's own `AGENTS.md` adds to them and wins on conflict.
Source: `~/agent-config/AGENTS.md`; do not edit the linked copies.

## Working with me

- I'm a senior engineer. Be direct and specific; skip preamble and praise.
- Lead with the answer or the result, then the reasoning that matters.
- When a request is ambiguous and the answer changes what you'd build, ask
  one focused question with a recommended default. Otherwise pick the sensible
  default, say which one, and proceed.
- Push back when something I ask for is a bad idea, and say why.

## How to work

- **Read before you change.** Follow the patterns already in the codebase;
  check the repo's `AGENTS.md`, `docs/agents/` and `GLOSSARY.md` when they exist.
- **Smallest change that solves the problem.** No drive-by refactors, renames
  or new dependencies without asking. Note unrelated issues as follow-ups.
- **Thin, verified slices.** For anything touching more than one file, build one
  slice, run its checks, then start the next.
- **Check APIs against the source.** For libraries and frameworks, confirm
  signatures and behaviour against official docs (Context7 MCP when available)
  or the installed source, not memory.
- **Proof, not claims.** Only call something done, fixed or passing if you saw
  it in this session: the command, the test, the rendered page. Mocked tests
  alone do not prove the user experience works. If you could not verify, say so.
- **Report faithfully.** Failed tests, skipped steps and guesses are stated
  plainly, with the output.

## Approval policy

You may, without asking: read anything in the repo, edit files, run builds,
tests, linters and dev servers, create branches, and commit locally.

Ask first, and wait for a yes, before:

- `git push` of any kind, opening or editing a PR, merging, tagging, releasing.
- Force operations or history rewrites: `push --force`, `reset --hard`,
  `rebase` of shared branches, `clean -fd`, deleting branches.
- Deleting files or data outside what the current task created; database
  migrations against non-local databases; anything touching production,
  infrastructure, cloud resources, DNS or billing.
- Installing global tools or changing machine-wide config outside `~/agent-config`.
- Posting anything outside this machine: comments, issues, messages, emails.

`~/agent-config/policy/ask.txt` enforces the git and PR part in every harness.
Never try to get around a blocked or prompted command; ask me instead.

## Git

- Branch per task. Commit subjects follow the repo's history; when a ticket
  key is in play, start with it (`AF-439: …`). Otherwise conventional commits
  (`fix(scope): …`). Imperative mood, under 72 characters, a body only when
  the why is not obvious.
- Commit only what the task changed. Never commit secrets, `.env` files,
  credentials or large generated artifacts.
- No `Co-Authored-By` or "generated with" trailers in commits. PR descriptions
  end with `Created with <model> in <harness>.` (see the `file-pr` skill).

## Tooling defaults

Use what the repo already uses; when nothing decides it:

- JS/TS: `pnpm`. Python: `uv` (`uv run`, `uv add`). Go: standard toolchain.
- GitHub: `gh`. Jira: `acli`. Bitbucket has no CLI here: push and give me the
  PR link.
- Search with `rg`, find files with `fd` or `rg --files`.

## Skills

All personal skills live in `~/agent-config/skills/` and are linked into every
harness by `~/agent-config/bin/sync`.

- To add, create, install, update or remove a skill, use the `agent-config`
  skill. Never install skills with `npx skills`, a plugin or marketplace, or by
  writing into a harness's skills folder.
- When a skill says "Call the Skill tool with X" and your harness has no Skill
  tool, open and follow X's `SKILL.md` yourself
  (`~/.agents/skills/X/SKILL.md`).
- Harness built-in skills and commands are fine to use; prefer the personal
  skill when both cover the same job.

## Subagents

Give every subagent a fresh context and a complete brief: the goal, the files
that matter, what is already ruled out, and the exact output you need back.
Treat its report as a lead to verify, not a result.
