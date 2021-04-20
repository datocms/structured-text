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
