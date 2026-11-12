# Decisions

Short records of choices that shaped this repo. Add one when you change the shape.

## D1. One profile-independent setup
Every Claude and Codex profile gets the same skills and instructions. A base +
overlay layout was considered and rejected: `~/.agents/skills` is machine-wide
and read by Codex, OpenCode and Pi regardless of profile, so per-profile skills
would only ever work in Claude.

## D2. Vendor skills into the repo; no installers
Skills are copied in and committed, with provenance in `skills.lock`. `npx
skills`, plugins and marketplaces are not used, because they write outside the
repo and bring skills the user did not choose. `bin/update` diffs against upstream.

## D3. `~/.agents/skills` as the shared folder, symlinked per skill
Codex, OpenCode and Pi read it natively; Claude gets per-skill links in each
profile's `skills/` (per-skill, not a whole-folder link, because claude.ai writes
its own `synced/` folder there). `bin/sync` quarantines anything it did not create.

## D4. Harness built-ins are left alone
Each harness's own skills and commands stay. We avoid name clashes with them
(e.g. no skill named `code-review`, which Claude ships).

## D5. One skill per job, small core
19 skills. Merges: four tstack PR skills → `file-pr`; addy + anthropic +
Vercel + ibelick → `frontend-ui`. Cut: to-spec, to-tickets, sol-loop, security
skill (covered by the review skill's security axis), code-simplification
(review + improve-codebase-architecture cover it).

## D6. Keep the invocation split
User-invoked skills carry both `disable-model-invocation: true` and an
`agents/openai.yaml` policy, so Claude, Pi and Codex agree; `bin/doctor` fails
when the two disagree. OpenCode ignores the flag.

## D7. Control over autonomy: ask before anything leaves the machine
Agents may edit, test and commit locally. Push, PR, merge, force operations and
tracker writes need approval, enforced natively per harness from one list
(`policy/ask.txt`) rather than by hooks. No unattended merge skill.

## D8. `file-pr` stops at the PR
No CI watching or bot handling. It drafts, shows, waits for a yes, pushes and
files (GitHub via `gh`, Bitbucket via a prepared link), then reports.

## D9. Secrets resolved at sync time
`mcp.json` holds `${secret:NAME}`; `bin/sync` reads the value from the
environment or the Keychain and writes it into each harness's private config.
The repo never contains a secret; `bin/doctor` checks.

## D10. Leave upstream wording alone where possible
mattpocock's `Call the Skill tool with "x"` stays as written; `AGENTS.md` tells
harnesses without a Skill tool to open `~/.agents/skills/x/SKILL.md`. Fewer local
patches means cleaner `bin/update` merges.

## D11. Harnesses are optional
A harness is used when its program is installed: on PATH, or at a known install
path, since apps can run sync with a short PATH. Each of its profiles is used when
its folder exists. Everything else is skipped and shown as `skip`, never created
or failed. A home folder alone was the first signal, but uninstalls leave config
folders behind. Sync also drops the OpenCode `~/.zshenv` block once OpenCode is
gone. Prompted by uninstalling OpenCode on 2026-11-13.

## D12. `mcp.json` holds only servers every harness uses
Context7 was dropped: no harness relied on it, and its missing key made every
`bin/doctor` run warn. A server only some harnesses want is configured in that
harness; sync only touches servers it has recorded as its own, so those entries
are left alone. The `${secret:NAME}` mechanism (D9) stays for shared servers.

## D13. Profiles are per machine, not in the repo
Hardcoding `~/.claude-work` and `~/.codex-work` made the repo specific to this
machine. Defaults are each harness's standard home plus its own variable
(`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `PI_CODING_AGENT_DIR`); OpenCode documents no
such variable. Extra profiles go in `~/.config/agent-config/profiles.toml`,
outside the repo; a listed harness uses exactly that list. Rejected: treating
every `~/.claude-*` folder as a profile (catches backups) and reading shell
aliases (fragile). Doctor only hints at unlisted profile-like folders.
