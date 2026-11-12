---
name: frontend-ui
description: Builds and reviews production-quality, accessible, responsive user interfaces in React and Tailwind. Covers component composition, state placement (including TanStack Query and Router), design-system tokens, WCAG 2.1 AA accessibility, loading/empty/error states, UX copy, and a deliberate visual identity that does not read as AI-generated. Use when building, modifying, reviewing or polishing UI components, pages, layouts, forms, or visual design, or when a frontend must look and feel production-quality. Not for backend/API work.
---

# Frontend UI

Build UI that looks like a design-aware engineer made it: real design-system adherence, full accessibility, every state handled, and no generic AI aesthetic.

## Mode: preserve or design

Decide the mode before writing code:

- **Existing app or design system** (the default): PRESERVE the incumbent look. Reuse its components, tokens, type, radii and copy voice. Apply only the restraint, accessibility, state-handling and copy rules below. Do not "improve" the visual identity unasked.
- **New product or marketing surface** (landing page, launch page, greenfield app with no system): run the full **Design pass** section below.

When unsure which applies, assume preserve.

## Component patterns

Colocate a component with its tests, stories and hooks in one folder. Follow the project's existing layout if it differs.

**Prefer composition over configuration:**

```tsx
// Good: composable
<Card>
  <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
  <CardBody><TaskList tasks={tasks} /></CardBody>
</Card>

// Avoid: prop-configured
<Card title="Tasks" headerVariant="large" bodyPadding="md" content={<TaskList tasks={tasks} />} />
```

**Keep components focused** — one job each. Split past ~200 lines.

**Separate data from presentation:** a container owns fetching and branches on state; a presentational component renders props.

```tsx
export function TaskListContainer() {
  const { data: tasks, isPending, error, refetch } = useQuery(tasksQueryOptions());
  if (isPending) return <TaskListSkeleton />;
  if (error) return <ErrorState message="Couldn't load tasks." retry={refetch} />;
  if (tasks.length === 0) return <EmptyState action={<CreateTaskButton />} />;
  return <TaskList tasks={tasks} />;
}
```

Use the project's existing primitives first. If the project uses shadcn/ui, follow its primitives and `cn` helper. Use accessible headless primitives (Radix, React Aria, Base UI) for anything with focus or keyboard behaviour; never hand-roll focus traps, menus or comboboxes, and never mix primitive systems on one surface.

## State management

Classify the state first, then pick the simplest home:

| Kind of state | Home |
|---|---|
| Server data (anything fetched) | TanStack Query (`useQuery`/`useSuspenseQuery`, `useMutation`). Never copy it into `useState` or a store. |
| URL state (filters, tabs, pagination, sort, open panel) | TanStack Router search params with `validateSearch`; read with `Route.useSearch()`, write with `navigate({ search })`. Shareable and survives reload. |
| Component UI state | `useState` / `useReducer` locally |
| Shared by 2–3 siblings | Lift to the nearest common parent |
| Read-heavy, write-rare app-wide (theme, auth, locale) | Context |
| Complex client state shared app-wide | Global store (Zustand etc.) — last resort |

Data loading order of preference:

1. Route `loader` calling `queryClient.ensureQueryData(queryOptions)` so data is ready before render; read it in the component with `useSuspenseQuery(sameOptions)`.
2. `useQuery` in the component when the data is not route-critical.
3. `useEffect` fetching — only when neither applies, with cleanup and abort.

```tsx
const tasksQueryOptions = (search: TaskSearch) =>
  queryOptions({ queryKey: ['tasks', search], queryFn: () => fetchTasks(search) });

export const Route = createFileRoute('/tasks')({
  validateSearch: z.object({ status: z.enum(['open', 'done']).catch('open'), page: z.number().catch(1) }),
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => queryClient.ensureQueryData(tasksQueryOptions(deps)),
  component: TasksPage,
});

function TasksPage() {
  const search = Route.useSearch();
  const { data: tasks } = useSuspenseQuery(tasksQueryOptions(search));
  const navigate = Route.useNavigate();
  // Filter change updates the URL; the loader and query follow.
  return (
    <>
      <TaskFilters value={search.status} onChange={(status) => navigate({ search: { ...search, status, page: 1 } })} />
      {tasks.length === 0 ? <EmptyState action={<CreateTaskButton />} /> : <TaskList tasks={tasks} />}
    </>
  );
}
```

Define each query once with `queryOptions({ queryKey, queryFn })` and reuse it in loaders, components and invalidation. Invalidate or `setQueryData` after mutations; use optimistic updates (`onMutate` snapshot → rollback `onError` → invalidate `onSettled`) where latency is felt.

Don't use `useEffect` for anything expressible as render logic (derived values, filtering, formatting). Don't drill props deeper than 3 levels; restructure with composition or context.

## Design-system adherence

- **Spacing:** use the scale (Tailwind defaults or project tokens). No arbitrary values like `p-[13px]` or `mt-[2.3rem]`.
- **Colour:** semantic tokens (`bg-surface`, `text-muted-foreground`, `border-default`), never raw hex in components. One accent per view.
- **Type:** use the project's type scale. One `h1` per page; never skip heading levels; never style non-headings as headings.
- **Radii, shadows, z-index:** use the defined scales; no ad-hoc `z-[999]`.
- Add a token to the system rather than inlining a one-off value.

## Avoid the AI aesthetic

Generated UI clusters around defaults that appear regardless of subject. Each is legitimate when the brief asks for it; otherwise treat it as a tell.

| Default | Do instead |
|---|---|
| Purple/indigo palette, multicolour or decorative gradient washes, glows as affordances | The project's palette; flat surfaces; gradients only when requested |
| SaaS-card kit: content chopped into identical rounded cards, one radius everywhere, the same soft grey shadow on each | Layout driven by information priority; radius hierarchy from the system; shadows only where the system specifies |
| Warm cream background (~#F4F1EA) + high-contrast serif + terracotta accent (~#D97757) | Palette derived from the subject |
| Near-black background with one acid-green or vermilion accent; tinted near-black (#0B0B0B, #111) standing in for black | A deliberate dark palette, or none |
| Broadsheet layout: hairline rules, zero radius, dense newspaper columns | Columns only when content is genuinely editorial |
| Template chrome: tracked-out ALL-CAPS eyebrow above every heading; "A · B · C" meta strings; "WORD — fragment" labels; monospace for small data labels; "→" appended to links/buttons | Plain labels only where they carry information |
| Hero of big number + small label + supporting stats + gradient accent | Open with the most characteristic thing in the subject's world |
| One word in a headline accented by italic, bold or colour | Let the whole headline carry the type treatment |
| Numbered markers (01 / 02 / 03) on content that is not a sequence | Number only real steps or timelines |
| Fade-and-slide-up on every section; hover transitions on every card | One orchestrated moment, or none |
| Uniform generous padding everywhere | Spacing that encodes grouping and hierarchy |
| Lorem ipsum or generic marketing copy | Realistic content at real lengths (short, average, very long) |

Visual structure is information: borders, dividers, numbering and labels must encode something about the content, not decorate it.

## Design pass (new surfaces only)

Skip this section in preserve mode.

1. **Ground it in the subject.** Name the concrete subject, audience and the page's primary job. If the brief doesn't, propose them and confirm. The subject's industry, materials and vernacular are where distinctive choices come from — a toy for 8–11-year-olds and a dashboard for financial analysts look nothing alike. Use the brief's real content throughout.
2. **Plan tokens.** Write a compact plan:
   - Colour: 4–6 named hex values.
   - Type: one or two families (if two, clearly distinct) with roles, a deliberate scale, weights and spacing. Not the families you'd use on any project.
   - Layout: one-sentence concept plus an ASCII wireframe; state alignment (left, centre, justified).
   - Principles: what makes this page specific.
3. **Review the plan against the brief.** For each part ask: would I produce this for any similar prompt? If yes, revise it and state what changed and why. The brief's explicit words always win, including when it asks for one of the looks above.
4. **Build** from the revised plan. Watch CSS specificity — section-level and element-level selectors silently cancel each other's padding and margin.

Design rules that apply in this mode:

- The hero opens with the most characteristic thing in the subject's world: a headline, image, live demo or interactive moment — chosen, not defaulted.
- Typography carries personality; use the type treatment itself as part of the design.
- Line length under ~80 characters; serif body gets slightly more line-height than sans.
- Non-user-triggered motion only to draw attention, and at most one orchestrated moment (page-load sequence or reveal). Motion that answers a user action (open, expand, confirm) is welcome when it shows what changed.

## Restraint and self-critique

Applies in both modes.

- Spend boldness in one place. One memorable element; everything around it quiet.
- Cut decoration that doesn't serve the brief.
- Meet the quality floor silently: responsive to mobile, visible keyboard focus, reduced motion respected, sufficient contrast.
- Look at the rendered page (browser/screenshot tool if available) while building, not just at the code. Check hierarchy, spacing rhythm, alignment and overflow at mobile and desktop widths.
- Before finishing, remove one accessory: the extra badge, shadow, divider, icon or animation that adds nothing.

## Accessibility (WCAG 2.1 AA)

Every component must meet these.

**Semantics and keyboard**

- `<button>` for actions, `<a>`/router `Link` for navigation. Never `<div onClick>`. Native elements give focus, Enter/Space and roles for free; a custom `role="button"` must also handle `tabIndex={0}`, Enter on keydown and Space on keyup.
- Everything operable by keyboard in a logical tab order. No keyboard traps except intentional modal traps with Escape to close.
- Provide a skip link to main content; use landmarks (`header`, `nav`, `main`, `footer`).
- Gesture-only actions (drag, swipe, pinch) need a click and keyboard alternative.

**Names and labels**

- Icon-only buttons need `aria-label`; decorative icons need `aria-hidden="true"`.
- Every form control has a visible `<label htmlFor>` (or `aria-label` when no visible label fits). Placeholders are not labels.
- Images need `alt`; decorative images get `alt=""`.
- Semantic HTML before ARIA. Don't add ARIA that restates native semantics.

**Focus**

- Visible focus on every interactive element (`focus-visible:ring-*` or equivalent). Never remove outlines without a replacement.
- Move focus deliberately: into a dialog on open, back to the trigger on close, to the first invalid field on failed submit.
- Sticky headers and overlays must not cover the focused element (`scroll-margin-top`).

**Perception**

- Contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text, UI component boundaries and focus indicators.
- Never use colour alone to convey state; pair it with text or an icon.
- Text resizes to 200% and reflows at 320px width without loss. Never disable zoom (`user-scalable=no`, `maximum-scale=1`).
- Announce async changes (toasts, validation, save status) with `aria-live="polite"` or `role="status"`; urgent errors with `role="alert"`.
- Respect `prefers-reduced-motion`; nothing flashes more than 3 times per second; autoplaying motion over 5 seconds needs pause/stop.

**Forms**

- Errors appear inline next to the field, say what's wrong and how to fix it, and are linked with `aria-describedby`; set `aria-invalid`.
- Correct `type`, `inputmode` and `autocomplete`. Never block paste.

## Responsive design

- Mobile first: base classes for small screens, `sm:`/`md:`/`lg:` to expand.
- Check at 320, 768, 1024 and 1440px. No horizontal scroll at 320px.
- Use `h-dvh`/`min-h-dvh`, not `h-screen`. Respect `env(safe-area-inset-*)` on fixed and full-bleed elements.
- Touch targets ≥ 44×44px on touch layouts (24×24px minimum).
- Prefer flex/grid and container queries over JS measurement. Give flex children `min-w-0` so text can truncate.
- Handle long content: `truncate`, `line-clamp-*` or `break-words`.

## Loading, empty, error states and transitions

Every data-driven view handles: loading, empty, error, success, and partial/permission states where applicable.

- **Loading:** structural skeletons matching the final layout for content (`aria-busy="true"`); spinners only for actions. Reserve space to avoid layout shift. Loading text ends with `…`.
- **Empty:** never a blank screen. Say what belongs here and give one clear next action.
- **Error:** shown where the action happened, explains what failed and how to recover, offers retry. Keep the user's input.
- **Mutations:** keep the submit button enabled until the request starts, then show progress; optimistic updates with rollback where latency is felt.
- **Destructive actions:** confirm with an AlertDialog (or `confirm` pattern) or offer an undo window. Never immediate and irreversible.
- **Transitions:** animate only `transform` and `opacity`; never `transition: all`. Interaction feedback ≤ 200ms, `ease-out` on entrance. Animations must be interruptible. Use `will-change` only during an active animation.

## UX copy

Words make the interface easier to understand and use; they are design content, not decoration.

- Match the project's existing voice and capitalisation. For new surfaces default to sentence case.
- Name things by what users understand, not how the system is built: "notifications", not "webhook config".
- Active voice, specific verbs. A button says exactly what happens: "Save changes", not "Submit" or "Continue".
- Keep an action's name consistent through the flow: "Publish" button → "Published" toast.
- Errors don't apologise and are never vague: state what happened and the next step. Empty states invite action.
- Address the user in second person; no filler, no selling. Each element does one job.
- Numerals for counts ("8 deployments"); `…` not `...`; curly quotes; non-breaking spaces in `10 MB`, `⌘ K`.
- Format dates, numbers and currency with `Intl.*`, never hardcoded formats.

## Common rationalizations

| Rationalization | Reality |
|---|---|
| "Accessibility is a nice-to-have" | It's a legal requirement in many jurisdictions and a baseline quality bar. |
| "We'll make it responsive later" | Retrofitting responsive layout costs far more than building mobile-first. |
| "The design isn't final, so I'll skip styling" | Use the design-system defaults. Unstyled UI is a broken first impression. |
| "It's just a prototype" | Prototypes ship. Build the foundation right. |
| "The AI aesthetic is fine for now" | It signals low quality. Use the project's real system from the start. |
| "I'll fetch in a `useEffect`, it's simpler" | You lose caching, dedup, cancellation and loader prefetch. Use a loader + query options. |
| "I'll keep the filter in `useState`" | It's lost on reload and can't be shared. Put it in search params. |
| "This existing page would look better redesigned" | Not your call in preserve mode. Fix a11y, states and copy; keep the look. |

## Red flags

- Components over 200 lines, or configured by a dozen layout props
- Inline styles, raw hex, arbitrary pixel values, arbitrary `z-*`
- Server data copied into `useState` or a global store; `useEffect` fetch with no cache
- Filters, tabs or pagination not reflected in the URL
- Missing loading, empty or error states
- `<div onClick>`, icon buttons without labels, `outline-none` without replacement
- Colour as the sole indicator of state
- Purple gradients, identical card grids, eyebrow labels on every heading
- Visual redesign of an existing app nobody asked for
- Code shipped without anyone looking at the rendered result

## Verification

Run the review pass: go through [references/checklist.md](references/checklist.md) against the changed files and fix every violation (report any you consciously skip, with the reason). Then confirm:

- [ ] Renders without console errors or warnings
- [ ] Mode respected: existing look preserved, or design plan reviewed against the brief
- [ ] Rendered result inspected (browser/screenshot tool if available) at 320, 768, 1024, 1440px; one accessory removed
- [ ] Every interactive element reachable and operable by keyboard, with visible focus
- [ ] Screen reader gets correct names, roles, headings and live announcements
- [ ] No axe-core / dev-tools accessibility violations, contrast passes AA
- [ ] Loading, empty, error, success and permission states handled
- [ ] Server state in TanStack Query, URL state in search params, no unnecessary `useEffect`
- [ ] Spacing, colour, type, radii and z-index come from the design system
- [ ] No AI-aesthetic defaults the brief didn't ask for
- [ ] Copy is specific, consistent and actionable
