<!--datocms-autoinclude-header start--><a href="https://www.datocms.com/"><img src="https://www.datocms.com/images/full_logo.svg" height="60"></a>

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

## License

This repository is published under the [MIT](LICENSE.md) license.

<!--datocms-autoinclude-footer start-->

---

# What is DatoCMS?
<a href="https://www.datocms.com/"><img src="https://www.datocms.com/images/full_logo.svg" height="60"></a>

[DatoCMS](https://www.datocms.com/) is the REST & GraphQL Headless CMS for the modern web.

Trusted by over 25,000 enterprise businesses, agency partners, and individuals across the world, DatoCMS users create online content at scale from a central hub and distribute it via API. We ❤️ our [developers](https://www.datocms.com/team/best-cms-for-developers), [content editors](https://www.datocms.com/team/content-creators) and [marketers](https://www.datocms.com/team/cms-digital-marketing)!

**Quick links:**

- ⚡️ Get started with a [free DatoCMS account](https://dashboard.datocms.com/signup)
- 🔖 Go through the [docs](https://www.datocms.com/docs)
- ⚙️ Get [support from us and the community](https://community.datocms.com/)
- 🆕 Stay up to date on new features and fixes on the [changelog](https://www.datocms.com/product-updates)

**Our featured repos:**
- [datocms/react-datocms](https://github.com/datocms/react-datocms): React helper components for images, Structured Text rendering, and more
- [datocms/js-rest-api-clients](https://github.com/datocms/js-rest-api-clients): Node and browser JavaScript clients for updating and administering your content. For frontend fetches, we recommend using our [GraphQL Content Delivery API](https://www.datocms.com/docs/content-delivery-api) instead.
- [datocms/cli](https://github.com/datocms/cli): Command-line interface that includes our [Contentful importer](https://github.com/datocms/cli/tree/main/packages/cli-plugin-contentful) and [Wordpress importer](https://github.com/datocms/cli/tree/main/packages/cli-plugin-wordpress)
- [datocms/plugins](https://github.com/datocms/plugins): Example plugins we've made that extend the editor/admin dashboard
- [DatoCMS Starters](https://www.datocms.com/marketplace/starters) has examples for various Javascript frontend frameworks

Or see [all our public repos](https://github.com/orgs/datocms/repositories?q=&type=public&language=&sort=stargazers)<!--datocms-autoinclude-footer end-->
