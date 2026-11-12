# UI review checklist

Review pass for changed UI files. Check every rule; report violations as `file:line - issue → fix`, grouped by file, `✓ pass` for clean files. Skip explanation unless the fix is non-obvious.

Sources: Vercel Web Interface Guidelines and ibelick baseline-ui, de-duplicated and adapted (see ../NOTICE.md). In preserve mode, project conventions win on style rules (casing, radii, shadows); never on accessibility.

## Accessibility

- Icon-only buttons have `aria-label`; decorative icons have `aria-hidden="true"`
- Form controls have `<label>` (clickable via `htmlFor` or wrapping) or `aria-label`
- `<button>` for actions, `<a>`/`Link` for navigation; no `<div>`/`<span>` click handlers, no inline `onClick` navigation
- Custom interactive elements handle keyboard (`onKeyDown`/`onKeyUp`), but prefer native elements
- Images have `alt` (`alt=""` if decorative)
- Async updates (toasts, validation, save status) use `aria-live="polite"`
- Semantic HTML (`button`, `a`, `label`, `table`) before ARIA
- Headings hierarchical `h1`–`h6`; skip link to main content
- `scroll-margin-top` on heading anchors
- Meaningful media has captions, transcripts or descriptions; media controls are keyboard-operable; decorative media hidden from assistive tech
- Accessible primitives (Radix, React Aria, Base UI, or the project's own) for anything with focus/keyboard behaviour; no hand-rolled focus logic; no mixed primitive systems on one surface
- Zoom never disabled (`user-scalable=no`, `maximum-scale=1`)

## Focus states

- Every interactive element has visible focus: `focus-visible:ring-*` or equivalent
- No `outline-none` / `outline: none` without a focus replacement
- `:focus-visible` over `:focus`; `:focus-within` for compound controls
- Sticky headers, footers and overlays don't cover the focused element
- `autoFocus` only with clear justification: desktop, single primary input, never on mobile

## Forms

- Inputs have `autocomplete` and a meaningful `name`
- Correct `type` (`email`, `tel`, `url`, `number`) and `inputmode`
- NEVER block paste (`onPaste` + `preventDefault`)
- `spellCheck={false}` on emails, codes, usernames
- Checkbox/radio label and control share one hit target (no dead zones)
- Submit stays enabled until the request starts; show progress during it
- Errors inline next to fields; focus first error on submit
- Placeholders end with `…` and show an example pattern
- `autocomplete="off"` on non-auth fields that would trigger password managers
- Warn before navigating away with unsaved changes (`beforeunload` or router blocker)
- Controlled inputs have `onChange` (or use `defaultValue`); controlled inputs stay cheap per keystroke — prefer uncontrolled where possible

## Interaction and navigation

- Destructive or irreversible actions use an AlertDialog / confirm step or an undo window — never immediate
- Errors shown next to where the action happened
- URL reflects state: filters, tabs, pagination, expanded panels live in search params (TanStack Router `validateSearch` or equivalent); deep-link stateful UI
- Links are real `<a>`/`Link` (Cmd/Ctrl+click and middle-click work)
- Buttons and links have a `hover:` state; hover/active/focus increase contrast over rest
- `touch-action: manipulation` to remove double-tap zoom delay
- `-webkit-tap-highlight-color` set intentionally
- `overscroll-behavior: contain` in modals, drawers, sheets
- Optional page rubber-band suppression: `overscroll-behavior: none` on `<html>` only inside `@media (pointer: fine)`
- During drag: disable text selection; `inert` on dragged elements
- Drag/swipe/pinch/path gestures have tap/click and keyboard alternatives unless essential

## Animation

- Respect `prefers-reduced-motion`: reduced variant or none; muted decorative loops stop
- Animate only compositor props (`transform`, `opacity`); NEVER animate layout props (`width`, `height`, `top`, `left`, `margin`, `padding`); avoid animating paint props (`background`, `color`) except small local UI
- NEVER `transition: all`; list properties explicitly
- Correct `transform-origin`; SVG transforms on a `<g>` wrapper with `transform-box: fill-box; transform-origin: center`
- Animations are interruptible by user input
- Interaction feedback ≤ 200ms; `ease-out` on entrance; no custom easing curves unless requested
- No animation unless requested or it explains a state change; pause looping animations off-screen
- Autoplaying motion > 5s alongside other content has pause/stop/hide controls
- NEVER animate large `blur()` / `backdrop-filter` surfaces, large images or full-screen surfaces
- NEVER apply `will-change` outside an active animation

## Typography

- `text-balance` (`text-wrap: balance`) on headings; `text-pretty` on body paragraphs
- `tabular-nums` for data, number columns and comparisons
- `…` not `...`; curly quotes `“ ”` not straight `"`
- Non-breaking spaces: `10&nbsp;MB`, `⌘&nbsp;K`, brand names
- Loading states end with `…`: "Loading…", "Saving…"
- Don't change `letter-spacing` (`tracking-*`) unless the design system or request specifies it

## Content handling

- Text containers handle long content: `truncate`, `line-clamp-*` or `break-words`
- Flex children have `min-w-0` so text can truncate
- Empty strings/arrays render an empty state, not broken UI; empty states give one clear next action
- Layout tested with short, average and very long user-generated content
- Loading uses structural skeletons, not content spinners

## Layout

- NEVER `h-screen`; use `h-dvh` / `min-h-dvh`
- Fixed and full-bleed elements respect `env(safe-area-inset-*)`
- No unwanted scrollbars: fix overflow at the source, `overflow-x-hidden` only on containers that need it
- Flex/grid over JS measurement
- Fixed `z-index` scale from tokens; no arbitrary `z-*` values
- `size-*` for square elements instead of `w-*` + `h-*`

## Images and media

- `<img>` has explicit `width` and `height` (prevents layout shift)
- Below-fold images `loading="lazy"`; above-fold critical images `fetchpriority="high"`
- Compressed `<video autoplay muted loop playsinline>` over animated GIF, with a still alternative

## Performance

- Lists > 50 items virtualized (`virtua`, TanStack Virtual, or `content-visibility: auto`)
- No layout reads in render (`getBoundingClientRect`, `offsetHeight`, `offsetWidth`, `scrollTop`); batch DOM reads/writes
- No `useEffect` for anything expressible as render logic
- `<link rel="preconnect">` for CDN/asset domains
- Critical fonts `<link rel="preload" as="font">` with `font-display: swap`

## Dark mode and theming

- `color-scheme: dark` on `<html>` for dark themes
- `<meta name="theme-color">` matches the page background
- Native `<select>` has explicit `background-color` and `color` (Windows dark mode)
- Colours come from theme tokens before new ones are introduced

## Visual design

- No gradients unless requested; never purple or multicolour gradients
- No glow effects as primary affordances
- Default/system shadow scale only
- One accent colour per view

## Locale and i18n

- Dates/times via `Intl.DateTimeFormat`; numbers/currency via `Intl.NumberFormat` — no hardcoded formats
- Language from `Accept-Language` / `navigator.languages`, not IP
- Brand names, code tokens, identifiers wrapped in `translate="no"`

## Server rendering (if the app server-renders)

- Date/time rendering guarded against hydration mismatch
- `suppressHydrationWarning` only where truly needed

## Copy

- Active voice: "Install the CLI", not "The CLI will be installed"
- Capitalisation matches the project; new surfaces default to sentence case
- Numerals for counts: "8 deployments"
- Specific button labels: "Save API key", not "Continue"
- Error messages include the fix or next step
- Second person; avoid first person
- `&` over "and" only where space-constrained
