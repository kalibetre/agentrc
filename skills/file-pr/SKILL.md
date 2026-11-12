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

## 2. Write the title

PR titles usually become commit messages, so follow the repository's title
conventions. Read recent merged PRs and `git log` for examples (ticket
prefixes such as `AF-439:` included). Say why the change matters:

> ❌ perf(server): negotiate permessage-deflate on the websocket
>
> ✅ perf(server): cut websocket frame size by 70%+ with gzipping

## 3. Write the description

Open with the problem in plain words, taken from the user's original request,
then the solution in a sentence or two. Never lead with an inventory of
changed files or functions.

> ❌ Removed implicit workspace carry-over from every "new thread" entry point
> (cmd+n, sidebar buttons, command palette). Deleted buildContextualThreadOptions…
>
> ✅ My "new worktree" default was ignored when starting new threads on existing
> worktrees. Now your preferences always apply.

Then, only the sections that carry information:

- **Evidence**: before/after proof from this session. A screenshot for visual
  changes; otherwise the exact test or command that failed before and passes now.
- **Merge danger**: one-way or two-way door (can it be rolled back cheaply?), and
  the blast radius (who or what breaks if this is wrong).
- **Follow-ups**: anything deliberately left out.

Use the project's domain words (`GLOSSARY.md` if present). End with
`Created with <model> in <harness>.` using the model name the harness reports;
if it reports none, name only the harness.

## 4. Confirm, then file

Check the title, description and any attachment for secrets and private
details. Then show the user the title, the description, the branch and base,
and ask for approval. Push and open the PR only after they say yes.

- **GitHub**: `git push -u origin HEAD`, then `gh pr create --title … --body-file …`.
  Open a real PR, not a draft, unless the user asks for a draft. If `gh pr create`
  hits the GraphQL rate limit, use
  `gh api repos/<owner>/<repo>/pulls -f title=… -f head=… -f base=… -F body=@<file>`.
- **Bitbucket or another host without a CLI**: push the branch, then give the user
  the "create pull request" URL the push printed (or
  `https://bitbucket.org/<workspace>/<repo>/pull-requests/new?source=<branch>`)
  together with the title and description, ready to paste.

## 5. Report

Reply with the PR URL (or the create link), the title, and which checks ran.
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
