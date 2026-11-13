# Dependency review

Prefer the standard library and existing utilities; every dependency is a
liability.

## Adding a dependency
1. Does the existing stack already solve it?
2. Size and bundle impact.
3. Maintained: recent commits, open issues answered.
4. Known advisories (`npm audit`, `pip-audit`, `govulncheck`, or the ecosystem's
   equivalent); typosquat check on the name.
5. License compatible with the project.

## Upgrading a dependency
1. **Read the changelog, not the version number.** Semver is a promise, not
   proof; a patch can change behaviour. For a major bump, read the migration
   notes and find what breaks.
2. **One dependency per change**, or a small related group, so a break points at
   its cause and the revert is clean.
3. **Let the tests decide**: green before and after. Thin coverage around the
   dependency's behaviour is the real finding; ask for a test first.
4. **Review the lockfile diff**: one direct bump can pull dozens of transitive
   changes. The lockfile is committed and never hand-edited.

A bulk "bump dependencies" change with no changelog review is a Required
finding.
