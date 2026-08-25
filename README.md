<!--datocms-autoinclude-header start-->

<a href="https://www.datocms.com/"><img src="https://www.datocms.com/images/full_logo.svg" height="60"></a>

👉 [Visit the DatoCMS homepage](https://www.datocms.com) or see [What is DatoCMS?](#what-is-datocms)

---

<!--datocms-autoinclude-header end-->

![Node.js CI](https://github.com/datocms/structured-text/workflows/Node.js%20CI/badge.svg)

# structured-text

Monorepo with Typescript libraries for handling and rendering [DatoCMS Structured Text documents](https://www.datocms.com/docs/structured-text/dast).

## Packages

### Official

- [`html-to-structured-text`](https://github.com/datocms/structured-text/tree/master/packages/html-to-structured-text)
  - Convert HTML (or [Hast](https://github.com/syntax-tree/hast) syntax tree) to a valid Structured Text document.
- [`datocms-structured-text-utils`](https://github.com/datocms/structured-text/tree/master/packages/utils)
  - A set of Typescript types and helpers to work with DatoCMS Structured Text fields.
- [`datocms-structured-text-to-plain-text`](https://github.com/datocms/structured-text/tree/master/packages/to-plain-text)
  - Plain text renderer for the Structured Text document.
- [`datocms-structured-text-to-html-string`](https://github.com/datocms/structured-text/tree/master/packages/to-html-string)
  - HTML renderer for the DatoCMS Structured Text field type.
- [`datocms-structured-text-to-markdown`](https://github.com/datocms/structured-text/tree/master/packages/to-markdown)
  - Markdown renderer for the DatoCMS Structured Text field type.
- [`<StructuredText />`](https://github.com/datocms/react-datocms#structured-text)
  - React component that you can use to render Structured Text documents.
- [`<datocms-structured-text />`](https://github.com/datocms/vue-datocms#structured-text)
  - Vue component that you can use to render Structured Text documents.
- [`datocms-structured-text-to-dom-nodes`](https://github.com/datocms/structured-text/tree/master/packages/to-dom-nodes)
  - DOM nodes renderer for the DatoCMS Structured Text field type. To be used inside the browser, as it expects to find `document.createElement`.
- [`datocms-contentful-to-structured-text`](https://github.com/datocms/structured-text/tree/master/packages/contentful-to-structured-text)
  - Convert Contentful Rich Text to a valid Structured Text document.

## About Structured Text

- [Introduction](https://www.datocms.com/docs/content-modelling/structured-text)
- [Structured Text format](https://www.datocms.com/docs/structured-text/dast)
- [Migrating to Structured Text](https://www.datocms.com/docs/structured-text/migrating-content-to-structured-text)
- [Fetching Structured Text using DatoCMS GraphQL API](https://www.datocms.com/docs/content-delivery-api/structured-text-fields)
- [Creating Structured Text fields using DatoCMS Rest API](https://www.datocms.com/docs/content-management-api/resources/field/create#creating-structured-text-fields)
- [Creating records with Structured Text fields using DatoCMS Rest API](https://www.datocms.com/docs/content-management-api/resources/item/create#structured-text-fields)

## Working on this repository

An npm-workspaces monorepo built with [Turborepo](https://turborepo.com/) and
released with [Changesets](https://github.com/changesets/changesets).

```sh
git clone https://github.com/datocms/structured-text && cd structured-text
npm install     # one install for all ten packages; no bootstrap step
npm run build   # turbo, in dependency order
npm test        # eslint, then the Jest suite (448 tests, nothing external)
```

Node 22 or later — see `.nvmrc`. The published packages themselves have no such
requirement; it is the release tooling that does.

The packages resolve each other through their built `dist/`, so **run
`npm run build` before `npm test`** on a fresh checkout.

### Releasing (maintainers)

Every user-visible change needs a changeset: run `npx changeset` from the repo
root in the same PR, pick the packages that changed and the bump level (`patch`
is for bug fixes only, new API surface is `minor`), and commit the file it
writes under `.changeset/`. See [`.changeset/README.md`](.changeset/README.md)
for the details — in particular, the packages version **independently**, so
which ones you list matters.

To release, from an up-to-date, clean `main`, run `npm run publish` from the
repo root. It builds and tests, applies the pending changesets — bumping only
the packages that changed and writing their `CHANGELOG.md`s — publishes to npm,
and only then tags each published package `name@X.Y.Z`, pushes, and creates a
GitHub release per tag whose notes come straight from those changelog entries.
An interrupted release is resumed by re-running it, never undone. Use
`npm run publish-next` for a prerelease under the `next` dist-tag.

## License

This repository is published under the [MIT](LICENSE.md) license.

<!--datocms-autoinclude-footer start-->

---

# What is DatoCMS?

<a href="https://www.datocms.com/"><img src="https://www.datocms.com/images/full_logo.svg" height="60" alt="DatoCMS - The Headless CMS for the Modern Web"></a>

[DatoCMS](https://www.datocms.com/) is Headless CMS for the modern web. Trusted by 25,000+ businesses, agencies, and individuals, it gives your team one place to manage content and ship it to any website, app, or device via API.

**New here?** Start with [Create free account](https://dashboard.datocms.com/signup) and the [Documentation](https://www.datocms.com/docs). Stuck? Ask the [Community](https://community.datocms.com/). Curious what's new? [Product Updates](https://www.datocms.com/product-updates).

**Building with AI:** [Agent Skills](https://www.datocms.com/docs/agent-skills) turn coding assistants (Claude Code, Cursor) into expert DatoCMS developers, with full read/write via the auto-installed CLI. No local terminal? Use the [MCP Server](https://www.datocms.com/docs/mcp-server) instead.

**Talking to DatoCMS from code:**

- [Content Delivery API](https://www.datocms.com/docs/content-delivery-api) (CDA) — the fast, read-only GraphQL API your website/app uses to **fetch** published content.
- [Content Management API](https://www.datocms.com/docs/content-management-api) (CMA) — the REST API for **creating and updating** content, models, and project settings (think scripts, migrations, integrations).
- [CLI](https://www.datocms.com/docs/scripting-migrations/installing-the-cli) — terminal tool for schema migrations and importing from Contentful/WordPress.

**Framework guides:** end-to-end recipes for fetching content, rendering Structured Text, optimizing images/video, handling SEO, and setting up live preview with visual editing in [Next.js](https://www.datocms.com/docs/next-js), [Nuxt](https://www.datocms.com/docs/nuxt), [Svelte](https://www.datocms.com/docs/svelte), and [Astro](https://www.datocms.com/docs/astro).

**Want a head start?** Browse our [starter projects](https://www.datocms.com/marketplace/starters) — ready-to-deploy example sites for popular frameworks.

<!--datocms-autoinclude-footer end-->
