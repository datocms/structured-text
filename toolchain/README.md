# toolchain

Everything that acts on **this repository** rather than shipping to a user.

`packages/*` is the product. This is the machinery that turns the product into
releases: it reads the repo, writes into it, and produces something outside it —
a version bump, a changelog, a commit, a tag, an npm package, a GitHub release.
Nothing in here is published, and nothing in here is imported by code that is.
