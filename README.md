# agent-config

One source of truth for how coding agents work on this machine. Skills, global
instructions, the approval policy and MCP servers live here, and `bin/sync`
wires them into every harness I use:

- **Claude Code**: both profiles, `~/.claude` and `~/.claude-work`
- **Codex**: both homes, `~/.codex` and `~/.codex-work`
- **OpenCode**
- **Pi**

T3 Code drives the same homes, so it gets the same setup.

Change something here once, run `bin/sync`, and every harness behaves the same.

```
                       ~/agent-config  (this repo)
   AGENTS.md      skills/*      policy/ask.txt       mcp.json
       │             │                 │                 │
       │         bin/sync ─────────────┼─────────────────┤
       ▼             ▼                 ▼                 ▼
 Claude Code   CLAUDE.md: @import   skills/<name> → link   permissions.ask      claude mcp add
 Codex         AGENTS.md → link     ~/.agents/skills/*     rules/*.rules        config.toml block
 OpenCode      AGENTS.md → link     ~/.agents/skills/*     permission.bash      opencode.json mcp
 Pi            AGENTS.md → link     ~/.agents/skills/*     guard extension      mcp.json
```

## Quick start

```sh
git clone <this repo> ~/agent-config      # must live at ~/agent-config
~/agent-config/bin/sync                   # link everything (safe to re-run)
~/agent-config/bin/doctor                 # verify every harness, exit 1 on problems
```

Then open a new shell, which picks up `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS`, and
restart running agent sessions.

`bin/sync` only touches what it manages:
- **Skill folders:** anything else it finds in a managed skill folder is moved to
  `~/.agents/quarantine/`, never deleted.
- **Instruction files:** an existing file it replaces is kept as `*.pre-agent-config`.
- **Configs:** its entries are merged into your own settings, which stay as they are.

## Adding a skill

Ask any agent, in any harness, something like *"add a skill for X"* or *"install
the Y skill from github.com/owner/repo"*.

- The global `AGENTS.md` sends every agent to the `agent-config` skill. That
  skill writes or copies the skill into `skills/`, records where it came from in
  `skills.lock`, then runs `bin/sync` and `bin/doctor` and commits.
- The new skill appears in all four harnesses after a session restart.
- Agents are told never to use `npx skills`, plugins, or a harness's own
  skills folder. `bin/sync` quarantines anything that lands in those folders anyway.

To do it by hand:

1. Create `skills/<name>/SKILL.md`. Only these frontmatter keys are allowed:
   - `name` (must match the folder name)
   - `description` (up to 1024 characters)
   - optionally `disable-model-invocation`, `license`, `compatibility`, `metadata`
2. If only you should be able to start it, set `disable-model-invocation: true`
   and add `agents/openai.yaml` with `policy.allow_implicit_invocation: false`.
   That second file is how Codex learns the skill is user-only. `bin/doctor`
   fails if the two files disagree.
3. Add a line to `skills.lock`.
4. Run `bin/sync && bin/doctor`, then commit.

The writing guide is `skills/agent-config/references/writing-for-agents.md`.

## The skills

There's one skill per job. **User-invoked** skills are ones you start by name;
the agent never loads them on its own. How you start a skill differs by harness:

| Harness | How to start a skill |
|---|---|
| Claude Code | `/name` |
| Codex | `$name` |
| Pi | `/skill:name` |
| OpenCode | "use the name skill" |

**Model-invoked** skills load automatically when the task matches their
description, and you can still call them by name.

| Stage | Skill | Invoked | What it does | From |
|---|---|---|---|---|
| Think | `grill-with-docs` | user | Relentless interview about a plan, updating `GLOSSARY.md` and ADRs as decisions settle | mattpocock |
| | `grilling` | model | The interview step other skills build on: one question at a time, each with a recommended answer | mattpocock |
| | `domain-modeling` | model | Sharpens the project's domain language; writes `GLOSSARY.md` and ADRs | mattpocock |
| | `wayfinder` | user | Plans work that spans many sessions as a map of decision tickets in your tracker | mattpocock |
| | `research` | model | Researches a question against primary sources and writes cited findings into the repo | mattpocock |
| Design | `codebase-design` | model | Shared vocabulary for deep modules, seams and testable interfaces | mattpocock |
| | `improve-codebase-architecture` | user | Surveys the codebase for "deepening" opportunities (simpler interfaces over more behaviour), then grills you on one | mattpocock |
| Build | `implement` | user | Builds from a spec or ticket: thin slices, test-first at agreed seams, review, commit | mattpocock (adapted) |
| | `incremental-implementation` | model | Thin, verifiable slices for any change touching more than one file | addyosmani |
| | `tdd` | model | Red-green-refactor with tests worth keeping | mattpocock |
| | `diagnosing-bugs` | model | Reproduce, minimise, hypothesise, instrument, fix, add a regression test | mattpocock |
| | `frontend-ui` | model | Production-quality, accessible React/Tailwind UI, with a review checklist | merged (see its `NOTICE.md`) |
| Review & ship | `code-review-and-quality` | model | Reviews correctness, readability, architecture, security and performance | addyosmani |
| | `file-pr` | user | Drafts a problem-first PR, shows it to you, pushes and files it after you say yes, then stops | tstack (rewritten) |
| Session | `handoff` | user | Compacts the session into a document another session or harness can continue from | mattpocock |
| Meta | `setup-repo` | user | Gives a repo its `AGENTS.md`, a one-line `CLAUDE.md` and `docs/agents/` (issue tracker, domain docs) | local |
| | `agent-config` | model | Manages this repo: add, update or remove skills, edit policy or MCP | local |
| Tools | `fizzy` | model | Fizzy CLI (boards, cards) | local |
| | `varlock` | model | Environment variables and secrets with Varlock | dmno-dev/varlock |

**Typical flows:**
- **New feature:**
  1. `grill-with-docs` to pin down the plan.
  2. `implement`. It slices the work with `incremental-implementation`, uses
     `tdd` and finishes with `code-review-and-quality`.
  3. `file-pr`.
- **Something larger than one session:** `wayfinder`.
- **A bug:** describe it; `diagnosing-bugs` loads by itself.
- **Architecture health, every few days:** `improve-codebase-architecture`.
- **A new repo:** `setup-repo` once, so `wayfinder`, `implement` and the
  domain skills know where tickets and docs live.

Each harness's own built-in skills and commands are still there and fine to use.
Our skill names avoid clashing with them.

## Approval policy

Agents may read, edit, build, test and commit locally without asking. Pushing,
PRs, merges, force operations and writes to issue trackers need your approval.

`policy/ask.txt` holds one command prefix per line. `bin/sync` turns it into
each harness's own permission mechanism:

| Harness | Mechanism |
|---|---|
| Claude Code | `permissions.ask` in each profile's `settings.json` |
| Codex | `rules/agent-config.rules`, a `prefix_rule` with `decision="prompt"` |
| OpenCode | `permission.bash` patterns set to `"ask"` |
| Pi | `adapters/pi/agent-config-guard.ts`, which opens a confirm dialog and blocks when Pi has no UI |

The same rules are also written in prose in `AGENTS.md`. The prose is advice;
the permission rules are what actually enforce it.

## MCP servers and secrets

`mcp.json` lists the servers: `context7`, `gh_grep` and `executor`. `bin/sync`
renders each one into the right format for every harness.

Secrets are written as `${secret:NAME}` and never stored in this repo. At sync
time each value is read from the environment variable `NAME` or, failing that,
from the macOS Keychain under service `agent-config`. To store the Context7 key:

```sh
security add-generic-password -U -s agent-config -a CONTEXT7_API_KEY -w '<key>'
~/agent-config/bin/sync
```

While a secret is missing, `bin/sync` leaves that server's existing entries alone
and prints a warning.

## Commands

| Command | What it does |
|---|---|
| `bin/sync` | Links skills and instructions, renders policy and MCP, quarantines stray skills. `--dry-run` previews skills and instructions only |
| `bin/doctor` | Read-only check of everything: skill frontmatter and invocation, the exact skill set in each harness folder, instruction links, policy (including `codex execpolicy check` and whether OpenCode accepts its config), MCP entries, no secrets in the repo |
| `bin/update` | Clones each upstream in `skills.lock` and shows which vendored skills changed. `--diff <name>` prints the diff; `--apply <name>` takes upstream and records the new commit (re-apply the local changes listed in `skills.lock`) |

## Layout

```
AGENTS.md                 global instructions (~90 lines), linked into every harness
skills/<name>/            one folder per skill: SKILL.md, optional references/, scripts/, agents/openai.yaml
skills.lock               provenance: source, upstream path, commit, local changes
policy/ask.txt            commands that need approval
mcp.json                  MCP servers
adapters/pi/              Pi extension enforcing the policy
bin/                      sync, doctor, update (Python 3.11+ stdlib, no dependencies)
research/                 why it's built this way (read before changing the shape)
```

## Per-repo setup

In each project, run `setup-repo`. It writes:
- `AGENTS.md`: commands, layout and conventions that differ from the global defaults.
- `CLAUDE.md`: exactly `@AGENTS.md`.
- `docs/agents/issue-tracker.md`: GitHub, Jira via `acli`, or local markdown.
- `docs/agents/domain.md`.

Skills that only make sense in one repo, such as shadcn or Next.js performance
rules, go in that repo's `.agents/skills/` (and `.claude/skills/` for Claude),
not here.

## Troubleshooting

- **A harness doesn't see a new skill:** run `bin/sync`, then restart that session.
  Claude Code picks up changes live; Codex, OpenCode and Pi need a restart.
- **OpenCode lists claude.ai or duplicate skills:** `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1`
  is missing from its environment. `bin/sync` writes it to `~/.zshenv`; GUI
  launchers that bypass zsh need it set separately.
- **OpenCode won't start after editing its permissions:** it is on the V1 config
  format. Use `permission.bash` patterns, not the V2 `permissions` array.
  `bin/doctor` runs `opencode debug config` to catch this.
- **Something appeared in `~/.agents/quarantine/`:** an installer or agent wrote
  into a managed skills folder. If it's wanted, move it into `skills/` the
  proper way, using the `agent-config` skill.
- **Undo everything:** the pre-setup state is in `~/agent-config-backup-2026-11-12.tar.gz`.

## Research and credits

`research/` records how this setup was designed:

| File | Contents |
|---|---|
| `01-reference-repos.md` | The three skill collections that shaped it |
| `02-harness-matrix.md` | Paths and formats for each harness, and what was tested |
| `03-ui-skills.md` | Evaluation of UI skills |
| `04-machine-audit-2026-11-12.md` | What was on the machine and what was removed |
| `05-decisions.md` | Decision log |

Vendored skills keep their upstream licenses (copies in `LICENSES/`):
- [mattpocock/skills](https://github.com/mattpocock/skills) (MIT)
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT)
- [t3dotgg/tstack](https://github.com/t3dotgg/tstack) (MIT)
- [dmno-dev/varlock](https://github.com/dmno-dev/varlock)
- The sources merged into `frontend-ui` are listed in its `NOTICE.md`.
