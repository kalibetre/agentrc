---
name: review
description: Reviews a code change for correctness, state and timing bugs, readability, architecture, security and performance, and reports evidence-backed findings with file, line and severity. Use before merging any change, after finishing an implementation, or when asked to review a diff, branch, PR or files, including a pasted diff. Works on code written by you, another agent or a human.
---

# Review

Find the defects that would hurt after merge, prove each one, and give a
verdict. Every change gets reviewed before merge.

**Approval standard:** approve when the change clearly improves overall code
health, even if it is not how you would have written it. Block for defects and
structural regressions, not preferences.

**Evidence levels.** Every finding carries one:

- **Reproduced**: a test, script or mutation showed it.
- **Traced**: followed through the code (callers, guards, data) with no gap.
- **Unverified**: depends on something you could not run or see, such as an
  external system's behaviour, production data or timing. Say what would
  confirm it.

Severity follows impact, not evidence: an unverified money or data-loss bug is
still Critical or Required, marked Unverified.

## 1. Get the context

- Find what is under review: a PR (`gh pr view`, `gh pr diff`), a branch diff, a
  file list or a pasted diff. If nothing is given, ask.
- Read the stated intent: PR description, ticket, spec, feature docs. Write down
  the promises it makes ("usage granted once paid", "never deletes data"); each
  one is a claim to check.
- Check mergeability: conflicts with the base, failing CI, a stale base. Report
  these first; they block regardless of the code.
- Take the user's hints ("hot path", "handles PII") and weight those areas.

Done when you can state the intent in two sentences and list its promises.

## 2. Map the change and plan coverage

List the change by area (for example: schema and migrations, domain logic,
money paths, auth, external integrations, background jobs, API, UI, tests,
config). Rank the areas by risk: money, data loss, auth and external-system
state first; UI copy and config last.

**Large changes (over ~1,000 changed lines):** flag the size as a finding (see
*Change size*), then review by area in risk order. If you can start subagents,
give each high-risk area to its own reviewer with this skill, the intent and
the promises, and merge their findings. Either way, the report lists every area
as *covered*, *skimmed* or *not reviewed*. Never imply full coverage you did
not do.

## 3. Read the tests, then attack them

Tests show intent and coverage. Do they test behaviour, cover the error paths,
and model the real sequence of events?

Answer "would the tests catch a regression?" by **mutation**, not by reading:
break one guard the change adds (drop a negation, remove an early return, swap a
condition), run the relevant tests, restore the file. A mutation that stays
green is a finding: name the missing test. Mutate at least one guard per
high-risk area: every money path, auth check and external-system handler.

Check that test doubles behave like the real system. A stub for a payment
provider, queue or webhook that delivers events in an order or state the real
one never sends hides exactly the bugs that matter.

## 4. Trace state through time

Most serious bugs in stateful changes live between two code paths, not inside
one. For each piece of persisted state the change writes (a row, a status, a
balance, a flag, an external object):

1. **List every writer and reader**: user requests, admin and platform actions,
   webhooks, scheduled jobs and sweeps, migrations, retries. Include writers
   that already existed before this change.
2. **Interleave them.** For each pair that can overlap: what if the other one
   runs first, runs twice, or runs in between? Is the read-check-write under one
   lock or transaction, or can a webhook land between an owner's read and
   write?
3. **Start from existing state.** What happens to records that already exist
   when this code ships or when a setting changes: migrated rows, items already
   in the target state (already held, already paid, already cancelled),
   entities created under the old rules? Lowering a limit, editing a plan or
   re-running a planner over a mixed population is where these hide.
4. **Fail halfway.** When a flow commits in several steps or calls an external
   system, what state is left if it stops after each step, and does the retry
   path finish the job or take a different branch?
5. **Model the external system's real order.** For webhooks and providers
   (payments, auth, queues), write down the actual event sequence (from docs or
   observed traffic) and walk the code through it, including late, duplicate
   and out-of-order delivery. Mark conclusions that rest on the provider's
   documented behaviour as Unverified unless you exercised it.

Done when every piece of written state has its writer list, and each risky pair
and each partial-failure point has been walked through.

## 5. Review across five axes

**Correctness**
- Matches the intent and every promise from step 1; edge cases (empty, null,
  boundary, overflow) and error paths handled.
- Two places computing the same rule (a limit, a price, an eligibility check)
  that can disagree. One source of truth, or the UI and the enforcement drift.

**Readability and simplicity**
- Names say what things are; control flow is plain; no clever tricks.
- Could it be fewer lines? Do abstractions earn their complexity (no
  generalising before the third use)?
- Dead code, no-op variables, compatibility shims, `// removed` comments.
- A new conditional bolted onto an unrelated flow, or the same conditional
  repeated on one shape, is a missing helper, state or dispatcher, not a nit.

**Architecture**
- Follows existing patterns; a new pattern needs a reason. Clean module
  boundaries; dependencies point the right way; no import cycles.
- Does a refactor reduce complexity or just move it? Count the concepts a reader
  must hold. Prefer deleting an abstraction to polishing it.
- Feature logic leaking into a shared module; a near-duplicate of an existing
  helper; gratuitous `any`, casts or silent fallbacks hiding an unclear
  invariant; a change that grows an already-large file instead of decomposing it.

**Security**: work through [references/security.md](references/security.md)
for any change that touches input handling, auth, data exposure, secrets, new
dependencies or model output.

**Performance**: work through
[references/performance.md](references/performance.md) for any change that
touches queries, loops over growing data, locks, network calls or rendering.
Quantify: "adds ~50 ms per list item" beats "could be slow".

**Dependencies**: when the change adds or upgrades a package or touches a
lockfile, apply [references/dependencies.md](references/dependencies.md).

## 6. Prove or drop each finding

For each candidate finding:

- Trace the callers, guards and tests that reach it; drop it if they rule it out.
- Reproduce it when you can: a scratch test or script in a temporary copy, never
  committed to the author's branch.
- Assign the evidence level and the severity. Mark defects that already exist in
  the base as *pre-existing*, separate from regressions this change introduces.

**Zero findings is a valid result; do not invent one.**

## 7. Report

Lead with what matters: blockers (mergeability, Critical, Required), then
structural problems, then the rest. One structural problem and ten nits means
the structural problem is the review. When you flag a structural problem,
propose the move (see *Structural remedies*), not just the complaint.

| Label | Meaning | Author action |
|---|---|---|
| **Critical** | Security hole, data loss, money lost or charged wrongly, broken behaviour | Blocks merge |
| **Required** | Real defect or structural regression | Fix before merge |
| **Optional** | Worth considering | Author decides |
| **Nit** | Style or taste | May ignore |
| **FYI** | Context only | None |

```markdown
## Review: <PR title or files> (<commit reviewed>)

**Summary:** what changed, the overall quality, and the verdict in one line.

### Blockers
Mergeability problems, if any.

### Findings
| # | Severity | Evidence | File:line | Issue, failure scenario and suggested fix |
|---|----------|----------|-----------|-------------------------------------------|

### Pre-existing (not caused by this change)
- ...

### What looks good
- ...

### Coverage and verification
- Areas: covered / skimmed / not reviewed.
- What was run (tests, builds, mutations and their results) and what was not.

### Verdict
Approve | Request changes | Needs discussion: with the reason in one line.
```

Each finding states a concrete failure scenario: the inputs or sequence of
events, and the wrong outcome ("card fails after rollover → the Organization
keeps and spends the new month's $100"). Don't rubber-stamp ("LGTM" with no
evidence), don't soften real issues, and accept an informed author's override on
matters of judgement. Comment on the code, not the person.

## Structural remedies

- Replace a chain of conditionals with a typed model or explicit dispatcher.
- Collapse duplicate branches into one flow.
- Separate orchestration from business logic.
- Move feature-specific logic out of a shared module into its owner.
- Reuse the canonical helper instead of a near-duplicate.
- Make a type boundary explicit so downstream branching disappears.
- Delete a pass-through wrapper; extract a helper or split an oversized file.

**Presumptive blockers:** a refactor that relocates rather than reduces
complexity; a change that pushes a file past ~1,000 lines with no
decomposition; feature logic in a shared module; a near-duplicate of an existing
helper; a silent fallback hiding an unclear invariant. Propose the simpler
design for each; escalate to Required only when the change makes structure
worse.

## Change size and description

- ~100 changed lines is good, ~300 acceptable if it is one logical change,
  ~1,000 is too large. Complete deletions and mechanical refactors are exempt.
- Before work starts or early in review: ask for a split (a stack, by file
  group, shared code first, or vertical slices).
- Already built and near merge: report the size as Required, name the slices it
  should have been, and ask for the high-risk slices (money, data, auth) to get
  a focused review before merge rather than blocking on a full re-split.
- A refactor mixed with new behaviour is two changes.
- The description matches the code: listed migrations, flags and steps exist as
  described. The first line is short, imperative and standalone; the body says
  why.

## Dead code

After any refactor, list code that is now unused and **ask before deleting**:
`formatLegacyDate() in src/utils/date.ts: replaced by formatDate()`.

## Red flags in your own review

- It only says the tests pass, or "LGTM" with no evidence.
- Findings without severity, evidence level, or file and line.
- A money, auth or external-system path with no mutation run against it.
- A webhook or job handler reviewed without walking the real event order.
- Coverage implied but not listed for a large change.
- A bug fix accepted without a regression test.
- "I'll clean it up later" accepted without a filed issue.
