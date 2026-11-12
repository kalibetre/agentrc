# UI skill evaluation (2026-11-12)

Goal: one global, harness-neutral UI skill for React + TanStack + Tailwind/shadcn
work. Result: `skills/frontend-ui`, a merge (sources and commits in its `NOTICE.md`).

| Candidate | Covers | Size | Verdict |
|---|---|---|---|
| addyosmani `frontend-ui-engineering` | Architecture, state, design tokens, WCAG 2.1 AA, responsive, loading states, rationalizations, verification | 340 lines | **Base**: only one spanning architecture through a11y; spec-only frontmatter |
| anthropics `frontend-design` | Visual direction, typography, calibrated "AI-generated look" tells, plan → review → build, UX copy | 71 lines | **Design layer**, but its "distinct identity" bias is wrong for existing apps, hence the preserve/design mode rule |
| vercel-labs `web-interface-guidelines` | Review checklist: a11y, focus, forms, motion, typography, i18n, hydration, dark mode | 191 rules | **Vendored as `references/checklist.md`**; the wrapper skill fetches rules at runtime, so not used |
| ibelick `baseline-ui` | Dense MUST/NEVER rules (h-dvh, tabular-nums, text-balance, z-index scale) | 85 lines | **Stack-agnostic lines merged into the checklist**; stack mandates dropped |
| pbakaus `impeccable` | Everything incl. 24 sub-commands, native mobile | 63 files, ~21k lines | Excellent content, wrong shape: downloads a binary, per-harness builds, hooks |
| vercel `react-best-practices` | React/Next performance, 72 rules | ~8k lines | Next/RSC-heavy; per-project in Next repos if wanted |
| shadcn official skill | CLI, registries, theming | 296 lines + 20 files | Claude-specific frontmatter; per-project in repos with `components.json` |
| emilkowalski `emil-design-eng` | Animation and polish | 676 lines | Possible separate optional `animate` skill later |

Per-project, not global: shadcn, Next.js performance rules, Tailwind conventions
(`cn`, `size-*`) — put them in that repo's `AGENTS.md` or `.agents/skills/`.
