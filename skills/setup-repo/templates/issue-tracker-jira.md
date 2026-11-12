# Issue tracker: Jira

Issues and specs for this repo live in Jira project `<PROJECT_KEY>` on `<site>.atlassian.net`. Use the Atlassian CLI (`acli`) for all operations; check `acli jira auth status` once per session.

## Conventions

- **Ticket keys** look like `<PROJECT_KEY>-123`. Branch names and commit subjects start with the key (`<PROJECT_KEY>-123: …`).
- **Read a ticket**: `acli jira workitem view <KEY> --json`. Add `--fields summary,description,comment,status,parent` when the default output is too large.
- **Search**: `acli jira workitem search --jql "project = <PROJECT_KEY> AND statusCategory != Done" --fields "key,summary,status" --json`.
- **Create a ticket**: write the description to a file, then `acli jira workitem create --project <PROJECT_KEY> --type Task --summary "…" --description-file <file>`. Use `--parent <KEY>` for a child of an epic or parent ticket, and `--label` for labels.
- **Blocking**: `acli jira workitem link create --out <BLOCKER> --in <BLOCKED> --type Blocks`. A ticket is startable when every ticket blocking it is Done.
- **Comment**: `acli jira workitem comment create --key <KEY> --body "…"`.
- **Move a ticket**: `acli jira workitem transition --key <KEY> --status "<Status name>"`. Ask before transitioning tickets the user did not ask you to touch.

## When a skill says "publish to the issue tracker"

Create a Jira work item in `<PROJECT_KEY>` as above, and report its key and URL.

## When a skill says "fetch the relevant ticket"

Read it as in **Read a ticket** above.
