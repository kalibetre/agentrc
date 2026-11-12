# Reference repos (studied 2026-11-12)

Three skill collections shaped this setup. Summaries of what each offers, what we
took, and what we left. Commits are the ones vendored (see `skills.lock`).

## mattpocock/skills (`5863806`, very active, ~322k stars)

"Skills for real engineers, not vibe coding." Small, composable skills encoding
classic practice: interview before building, shared domain language (DDD),
red-green-refactor, deep modules (Ousterhout). Positions itself against
process-owning frameworks (GSD, BMAD, Spec-Kit). Meant to be forked.

**Conventions worth keeping** (see `.agents/invocation.md` upstream):

- **Invocation is the one axis.** User-invoked skills set
  `disable-model-invocation: true` *and* `policy.allow_implicit_invocation: false`
  in `agents/openai.yaml` (that is how Codex learns it). Their description is a
  human one-liner. Model-invoked skills carry "Use when…" triggers. A
  user-invoked skill can call model-invoked ones, never another user-invoked one.
- **Dependencies are explicit tool calls**: `Call the Skill tool with "grilling"`,
  one skill per call, never `../other/FILE.md` links. Naming the tool raises the
  hit rate. (Our `AGENTS.md` tells harnesses without a Skill tool to open the
  named `SKILL.md` instead, so upstream text stays unchanged.)
- **Shared primitives**: `grilling`, `domain-modeling`, `codebase-design` are
  reused by `grill-with-docs`, `wayfinder`, `improve-codebase-architecture`, `tdd`.
- **Per-repo setup writes `docs/agents/*.md`** and only a pointer block into
  AGENTS.md/CLAUDE.md. We adapted this as `setup-repo`.
- `writing-for-agents` is the best harness-neutral guide to writing skills and
  AGENTS.md; vendored as references inside `agent-config`.

**Dependency map of what we kept**: `wayfinder` → grilling, domain-modeling,
research · `grill-with-docs` → grilling, domain-modeling ·
`improve-codebase-architecture` → codebase-design, grilling, domain-modeling ·
`tdd` → codebase-design · `implement` → tdd (+ our changes).

**Left out**: to-spec, to-tickets (rarely used), triage, ask-matt (router; harnesses
already route by description), pr (folded into file-pr), prototype, teach,
wizard, implement-spec, in-progress/ and misc/ (TypeScript/Claude-specific).

## addyosmani/agent-skills (`301b02b`, v0.6.15, active)

Senior-engineer discipline as a lifecycle: DEFINE → PLAN → BUILD → VERIFY →
REVIEW → SHIP, drawing on Google practice (Hyrum's Law, Chesterton's Fence).
25 skills, 4 personas, 9 slash commands, shared `references/` checklists, evals.

**Worth keeping**: frontmatter strictly per the agentskills.io spec (a validator
rejects anything else); "Common Rationalizations" excuse-vs-reality tables and
"Red Flags"; verification checklists that demand evidence; trigger evals with
positive and negative prompts; commands as thin wrappers over skills.

**Kept**: `code-review-and-quality` (most-used skill on this machine),
`incremental-implementation` (agents reach for it on their own),
`frontend-ui-engineering` (as the base of our `frontend-ui`).

**Left out**: the meta-router `using-agent-skills` (double routing), the "MUST
invoke even at 1% chance" AGENTS.md block, spec/plan/ship skills (heavy for
small tasks), web-perf/devtools skills, personas and commands (skills cover it).
Note: installing single addy skills breaks links into its root `references/`.

## t3dotgg/tstack (`11e37a7`, ~3 weeks old, ~3.5k stars)

Theo's PR-lifecycle skills: prove → cross-provider review loops (sol-loop,
council) → file PR → babysit CI and review bots → merge. Works in Claude Code
and Codex, uses T3 Code tools when present.

**Worth keeping**: feature-detect harness tools *in the prose* (one SKILL.md for
all harnesses); keep personal config in AGENTS.md, not in skills; a strict
**proof** rule (evidence observed this session; mocked tests do not prove UX);
problem-first PR titles and descriptions; agent comment attribution callout.

**Kept**: `file-pr`, rewritten to stop after filing, ask before pushing, and
handle Bitbucket. The comment callout from `leaving-pr-comments` lives in it.

**Left out**: full-send (merges unattended, overrides ask-first rules), full-stop
and babysit-pr (the user wants control after the PR exists), council and
sol-loop (need T3's multi-provider delegation), modernize, takeover.
