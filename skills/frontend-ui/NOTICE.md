# Notice

This skill is an adapted merge of the following works. Text was rewritten, condensed and combined; upstream files were not copied verbatim except where rule lists are reproduced in `references/checklist.md`.

| Source | Path | License | Upstream commit |
|---|---|---|---|
| addyosmani/agent-skills (Addy Osmani) | `skills/frontend-ui-engineering/SKILL.md` — base structure, component patterns, state ladder, design-system, accessibility, responsive, loading states, rationalizations, red flags, verification | MIT, © 2025 Addy Osmani | `301b02b12bff98e4688e6984af6556802322bbde` |
| anthropics/skills (Anthropic) | `skills/frontend-design/SKILL.md` — subject grounding, AI-default calibration list, two-pass token plan, restraint and self-critique, UX-copy guidance | Apache-2.0 | `2c5958ecac7cee2b583967a2c4981d0f4a75c579` |
| ibelick/ui-skills (Julien Thibeaut) | `skills/baseline-ui/SKILL.md` — stack-agnostic MUST/NEVER rules in the checklist | MIT, © 2026 Julien Thibeaut | `ba966a3aaa4080ab1836d350f3131584e2d4243a` |
| vercel-labs/web-interface-guidelines (Vercel Labs) | `command.md` — rule list vendored into `references/checklist.md` | MIT, © 2025 Vercel Labs | `434b7f91364665f2f733b310ec54809bf8f37937` |

## Modifications

- Merged into one skill with a preserve-vs-design mode rule.
- State management extended for TanStack Query and TanStack Router; Next.js-specific rules removed (`priority` → `fetchpriority`, `nuqs` → router search params).
- Vercel "Title Case" copy rule replaced with "match project, default sentence case" to agree with the Anthropic copy guidance.
- baseline-ui stack-specific mandates (`motion/react`, `tw-animate-css`, Base UI preference, `cn`) dropped or softened.

## License texts

MIT (addyosmani/agent-skills, ibelick/ui-skills, vercel-labs/web-interface-guidelines): Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.

Apache-2.0 (anthropics/skills `frontend-design`): Licensed under the Apache License, Version 2.0; you may not use this file except in compliance with the License. A copy is available at https://www.apache.org/licenses/LICENSE-2.0. Distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. This derivative states that it was modified (see Modifications above).
