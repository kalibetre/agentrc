---
name: file-pr
description: File a concise pull request for the current branch, then stop.
disable-model-invocation: true
---

# File PR

File one pull request for the current branch and hand back. Do not watch CI,
answer review bots, or merge. The user owns everything after the PR exists.

## 1. Check the ground

- Find the base branch (usually `origin/main`) and the host from
  `git remote get-url origin`.
- Check whether a PR for this branch already exists. If one does, report its
  URL and ask before changing its title or description.
- Read the full diff against the base. Its contents must match the goal; flag
  anything unrelated instead of shipping it.
- Run the project's checks (typecheck, lint, tests) unless they ran after the
  last change in this session. Only cite results you saw in this session.
- Decide whether the change touches UI: anything a user sees or clicks
  (components, pages, styles, templates, UI copy, client-side routing, emails).
  If it does, step 2 is required, for a bug fix and a new feature alike.

## 2. Capture screenshot proof (UI changes)

Screenshots are the evidence for a UI change; tests alone are not.

- **Run the real app** on this branch (the project's dev server or preview) and
  drive it with whatever browser or screenshot tool you have; a short Playwright
  script works anywhere Node does. Use realistic, non-sensitive data.
- **Bug fix**: a *before* shot showing the bug on the base branch (or with the
  fix stashed), and an *after* shot of the same screen and steps on this branch.
- **New feature**: an *after* shot of each new state the user can reach
  (default, plus empty, loading, error or success when the change adds them).
  Add a *before* shot when it helps show where the feature lives.
- **Layout or styling changes**: capture a narrow (~390px) and a wide
  (~1440px) viewport, and dark mode too if the app has one and the change
  affects colour.
- **Interactions** (animation, drag, multi-step flow): a short screen recording
  instead of, or beside, the stills.
- Save the files outside the repository (a scratch or temp folder) with names
  that say what they show (`before-empty-cart.png`, `after-empty-cart.png`).
  Never commit them to the branch.
- Look at every image before using it: it must show the change, and nothing
  private (tokens, emails, customer data, other tabs).

If you cannot run the app or capture the screen, stop and tell the user what
blocked you. Open the PR without screenshots only if they say so, and say in
the description that the UI was not verified visually.

## 3. Write the title

PR titles usually become commit messages, so follow the repository's title
conventions. Read recent merged PRs and `git log` for examples (ticket
prefixes such as `AF-439:` included). Say why the change matters:

> ❌ perf(server): negotiate permessage-deflate on the websocket
>
> ✅ perf(server): cut websocket frame size by 70%+ with gzipping

## 4. Write the description

Open with the problem in plain words, taken from the user's original request,
then the solution in a sentence or two. Never lead with an inventory of
changed files or functions.

> ❌ Removed implicit workspace carry-over from every "new thread" entry point
> (cmd+n, sidebar buttons, command palette). Deleted buildContextualThreadOptions…
>
> ✅ My "new worktree" default was ignored when starting new threads on existing
> worktrees. Now your preferences always apply.

Then, only the sections that carry information:

- **Evidence**: proof from this session. For a UI change, the screenshots from
  step 2, referenced by local path so the upload in step 5 can swap in the
  hosted URL; put before and after side by side:

  ```md
  | Before | After |
  |---|---|
  | ![Before: empty cart shows a spinner forever](./before-empty-cart.png) | ![After: empty cart shows the empty state](./after-empty-cart.png) |
  ```

  Otherwise, the exact test or command that failed before and passes now.
- **Merge danger**: one-way or two-way door (can it be rolled back cheaply?), and
  the blast radius (who or what breaks if this is wrong).
- **Follow-ups**: anything deliberately left out.

Use the project's domain words (`GLOSSARY.md` if present). End with
`Created with <model> in <harness>.` using the model name the harness reports;
if it reports none, name only the harness.

## 5. Confirm, then file

Check the title, description and every screenshot for secrets and private
details. Then show the user the title, the description, the branch and base,
and the screenshot paths, and ask for approval. Push and open the PR only after
they say yes.

- **GitHub**: `git push -u origin HEAD`, then
  `gh pr create --title … --body-file <body.md> --attach '<file>#<alt text>' …`
  with one `--attach` per screenshot (requires gh 2.103 or later; check with
  `gh --version`). Keep `body.md` in the same folder as the images so its
  `./file.png` references resolve and are rewritten to the uploaded URLs.
  Open a real PR, not a draft, unless the user asks for a draft.
  - If some uploads fail, gh still creates the PR, prints its URL and exits
    non-zero: re-attach the missing files with `gh pr edit <number> --attach …`.
  - If `gh pr create` hits the GraphQL rate limit, use
    `gh api repos/<owner>/<repo>/pulls -f title=… -f head=… -f base=… -F body=@<file>`,
    then add the screenshots with `gh pr edit <number> --body-file <body.md> --attach …`.
  - Open the PR afterwards and check the images render.
- **Bitbucket or any other host**: images can't be uploaded from the command
  line, so the user adds them. Push the branch, then give the user the "create
  pull request" URL the push printed (or
  `https://bitbucket.org/<workspace>/<repo>/pull-requests/new?source=<branch>`),
  the title and description ready to paste with a placeholder line where each
  image goes (`[drag before-empty-cart.png here]`), and the folder holding the
  screenshots so they can drag each one in.

## 6. Report

Reply with the PR URL (or the create link), the title, which checks ran, and
which screenshots were attached (or are waiting for the user to drag in).
Stop there.

## Comments on the PR

Only post a comment when the user asks for one. Start every comment written on
the user's behalf with this callout, and keep the reply itself outside it:

```md
> [!NOTE]
> 🤖 **<model> responding on behalf of <user>**

The comment starts here.
```

Lead with the conclusion, cite the code or check it rests on, and separate
verified facts from judgment.
