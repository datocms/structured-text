# Changesets

This folder holds the pending release notes for the next version.

Whenever you change something worth mentioning in a release, run `npx changeset`
and answer the two prompts (which packages, and whether it's a patch/minor/major).
That writes a small markdown file here, which you commit along with your changes.

At release time `npm run publish` consumes every pending file: it computes the
resulting versions, updates the `package.json`s and the `CHANGELOG.md`s, and
deletes the files.

## Each package versions on its own

There is no group here: the ten packages are **independent**, so a changeset
touching `datocms-structured-text-to-markdown` bumps that package and nothing
else. This is what `lerna.json` asked for in "Switch lerna to independent
versioning", and it is what the repository now actually does — the ten packages
sitting at `6.0.0` are the residue of the fixed mode that came before it.

So the package list inside a changeset carries real weight, unlike in a lockstep
repo. Pick every package whose _own_ behaviour changed. You do **not** need to
list packages that merely depend on one you changed: changesets bumps a
dependent by itself, whenever the new version falls outside the range that
dependent declares.

`datocms-structured-text-utils` is the root of the graph — everything else
depends on it, directly or through `datocms-structured-text-generic-html-renderer`
— so a `major` there is a major for the whole repository in practice, even
though the version numbers will no longer move in lockstep to say so.

## Which bump level?

- `patch` — bug fixes only. It's the clearest signal in semver ("nothing new,
  just a fix"), so we don't spend it on anything else.
- `minor` — new API surface. A new exported function, a new node type, a new
  option on an existing one.
- `major` — something was removed or renamed.

## Prereleases

`npm run publish-next` publishes under the `next` dist-tag, leaving `latest`
untouched. It works in two modes:

- **as-is** — the pending changesets produce a normal version (say `6.1.0`)
  which is published under `next` instead of `latest`;
- **real prerelease versions** — run `npx changeset pre enter next` first and
  the same command produces `6.1.0-next.0`, `6.1.0-next.1`, … That mode is
  recorded in `.changeset/pre.json`, which you commit. Run
  `npx changeset pre exit` when the line is done.

Either way the GitHub release is marked as a prerelease, so it never becomes
the repository's "Latest release".

`npm run publish` refuses to run while `.changeset/pre.json` exists, so a
forgotten pre mode can't quietly turn a real release into a prerelease.
