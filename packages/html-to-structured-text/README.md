# `html-to-structured-text`

Convert HTML (or [Hast](https://github.com/syntax-tree/hast) syntax tree) to a valid DatoCMS Structured Text Dast document.

Dast stands for Dato Abstract Syntax Tree.

## Usage

The main utility is `htmlToDast` which takes a string of HTML and transforms it into a valid Dast.

`htmlToDast` returns a `Promise` that resolves with a `Dast`.

```js
import { htmlToDast } from 'html-to-structured-text';

const html = `
  <article>
    <h1>DatoCMS</h1>
    <p>The most complete, user-friendly and performant Headless CMS.</p>
  </article>
`;

htmlToDast(html).then((Dast) => {
  console.log(Dast);
});
```

`htmlToDast` is meant to be used in a browser environment.

In Node.js you can use the `parse5ToDast` helper which instead takes a document generated with `parse5`.

```js
import parse5 from 'parse5';
import { parse5ToDast } from 'html-to-structured-text';

parse5ToDast(
  parse5.parse(html, {
    sourceCodeLocationInfo: true,
  }),
).then((Dast) => {
  console.log(Dast);
});
```

Internally, both utilities work on a Hast. Should you have an Hast already you can use a third utility called `hastToDast`.

## Valid Dast

Dast is a strict format that is compliant with DatoCMS' Structured Text records. As such the resulting document is generally a simplified, content-centric version of the input HTML.

When possible, the library relies on semantic HTML to generate a valid Dast.

The `datocms-structured-text-utils` package provides a `validate` utility to validate a Dast to make sure that the resulting tree is compatible with DatoCMS.

```js
import { validate } from 'datocms-structured-text-utils';

// ...

htmlToDast(html).then((Dast) => {
  const { valid, message } = validate(Dast);

  if (!valid) {
    throw new Error(message);
  }
});
```

We recommend to validate every Dast to avoid errors later when creating records.

## Advanced Usage

### Transforming Nodes

This library traverses a Hast tree and transforms supported nodes to Dast nodes. The transformation is done by working on a Hast node with a handler (async) function.

Handlers are associated to Hast nodes by `tagName` or `type` when `node.type !== 'element'` and look as follow:

```js
import { visitChildren } from 'html-to-structured-text';

// Handler for the <p> tag.
async function p(createDastNode, hastNode, context) {
  return createDastNode('paragraph', {
    children: await visitChildren(createDastNode, hastNode, context),
  });
}
```

To ensure that a valid Dast is generated the default handlers also check that the current `hastNode` is a valid Dast node for its parent and, if not, they ignore the current node and continue visiting its children.

Information about the parent Dast node name is available in `context.name`.

Please take a look at the [default handlers implementation](./handlers.ts) for examples.

The default handlers are available on `context.defaultHandlers`.

### context

Every handler receives a `context` object that includes the following information:

```js
export interface Context {
  // The current parent Dast node type.
  parentNodeType: NodeType;
  // The parent Hast node.
  parentNode: HastNode;
  // A reference to the default handlers record (map).
  defaultHandlers: Record<string, Handler<unknown>>;
  // A reference to the current handlers - merged default + user handlers.
  handlers: Record<string, Handler<unknown>>;
  // Whether the library has found a <base> tag.
  // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
  baseFound?: boolean;
  // <base> tag url. This is used for resolving relative URLs.
  frozenBaseUrl?: string;
  wrapText: boolean;
  // Marks for span nodes.
  marks?: Mark[];
  // Prefix for language detection in code blocks.
  // Detection is done on a class name eg class="language-html"
  // Default is `language-`
  codePrefix?: string;
}
```

### Custom Handlers

It is possible to register custom handlers and override the default behavior via settings:

```js
import { paragraphHandler } from './customHandlers';

htmlToDast(html, {
  handlers: {
    p: paragraphHandler,
  },
}).then((Dast) => {
  console.log(Dast);
});
```

It is **highly encouraged** to validate the Dast when using custom handlers as handlers are responsible for dictating valid parent-children relationships and therefore generating a tree that is compliant with DatoCMS' Structured Text.

## preprocessing

Because of the strictness of the Dast spec it is possible that some semantic or elements might be lost during the transformation. For example in Dast images can be presented as `Block` nodes but these are not allowed inside of `ListItem` nodes (ul/ol lists).

To help with this, the library allows you to register a `preprocess` function that is passed the Hast tree before it is transformed to Dast.

You can use this function to make changes to the Hast that produces the desidered Dast.

```js
import { findAll } from 'unist-utils-core';
const html = `
  <p>convert this to an h1</p>
`;

htmlToDast(html, {
  preprocess: (tree) => {
    // Transform <p> to <h1>
    findAll(tree, (node) => {
      if (node.type === 'element' && node.tagName === 'p') {
        node.tagName = 'h1';
      }
    });
  },
}).then((Dast) => {
  console.log(Dast);
});
```

### Utilities

To work with Hast and Dast trees we recommend using the [unist-utils-core](https://www.npmjs.com/package/unist-utils-core) library.

## License

MIT
