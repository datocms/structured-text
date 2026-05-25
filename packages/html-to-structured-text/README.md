# `datocms-html-to-structured-text`

This package contains utilities to convert HTML (or a [Hast](https://github.com/syntax-tree/hast) tree) into a DatoCMS Structured Text `dast` (DatoCMS Abstract Syntax Tree) document.

Please refer to [the `dast` format docs](https://www.datocms.com/docs/structured-text/dast) to learn more about the syntax tree format and the available nodes.

## Requirements

Starting with v6, this package is **ESM-only** and requires **Node.js 18 or newer**. Use `import` (not `require()`) from native ESM, a bundler, or a TypeScript project with `module: "NodeNext"` (or equivalent).

If you need CommonJS support, pin to `^5.1.16`.

## Usage

The main utility in this package is `htmlToStructuredText` which takes a string of HTML and transforms it into a valid `dast` document.

`htmlToStructuredText` returns a `Promise` that resolves with a Structured Text document.

```js
import { htmlToStructuredText } from 'datocms-html-to-structured-text';

const html = `
  <article>
    <h1>DatoCMS</h1>
    <p>The most complete, user-friendly and performant Headless CMS.</p>
  </article>
`;

htmlToStructuredText(html).then((structuredText) => {
  console.log(structuredText);
});
```

`htmlToStructuredText` is meant to be used in a browser environment.

In Node.js you can use the `parse5ToStructuredText` helper which takes a document generated with `parse5`.

```js
import { parse } from 'parse5';
import { parse5ToStructuredText } from 'datocms-html-to-structured-text';

parse5ToStructuredText(
  parse(html, {
    sourceCodeLocationInfo: true,
  }),
).then((structuredText) => {
  console.log(structuredText);
});
```

Internally, both utilities work on a [Hast](https://github.com/syntax-tree/hast) tree. If you already have a `hast` tree, use `hastToStructuredText`:

```js
import { hastToStructuredText } from 'datocms-html-to-structured-text';

hastToStructuredText(hastTree).then((structuredText) => {
  console.log(structuredText);
});
```

## Validate `dast` documents

`dast` is a strict format for DatoCMS' Structured Text fields. As such the resulting document is generally a simplified, content-centric version of the input HTML.

When possible, the library relies on semantic HTML to generate a valid `dast` document.

The `datocms-structured-text-utils` package provides a `validate` utility to validate a value to make sure that the resulting tree is compatible with DatoCMS' Structured Text field.

```js
import { validate } from 'datocms-structured-text-utils';

// ...

htmlToStructuredText(html).then((structuredText) => {
  const { valid, message } = validate(structuredText);

  if (!valid) {
    throw new Error(message);
  }
});
```

We recommend validating every `dast` document to avoid errors later when creating records.

## Advanced Usage

### Options

All the `*ToStructuredText` utilities accept an optional `options` object as second argument:

```ts
import type { Root as HastRoot } from 'hast';

type Options = Partial<{
  newlines: boolean;
  // Override existing `hast` node handlers or add new ones
  handlers: Record<string, Handler>;
  // Allows to tweak the `hast` tree before transforming it to a `dast` document
  preprocess: (hast: HastRoot) => void;
  // Array of allowed block nodes
  allowedBlocks: Array<
    BlockquoteType | CodeType | HeadingType | LinkType | ListType
  >;
  // Array of allowed marks
  allowedMarks: Mark[];
  // Array of allowed heading levels for 'heading' nodes
  allowedHeadingLevels: Array<1 | 2 | 3 | 4 | 5 | 6>;
  // Properties shared across handler invocations via context.global
  shared: Record<string, unknown>;
}>;
```

### Transforming Nodes

The utilities in this library traverse a `hast` tree and transform supported nodes into `dast` nodes. The transformation is done by associating a handler (async) function to a `hast` node.

Handlers are associated to `hast` nodes by `tagName` or `type` (when `node.type !== 'element'`) and look like this:

```js
import { visitChildren } from 'datocms-html-to-structured-text';

// Handler for the <p> tag.
async function p(createDastNode, hastNode, context) {
  return createDastNode('paragraph', {
    children: await visitChildren(createDastNode, hastNode, context),
  });
}
```

Handlers can return either a promise that resolves to a `dast` node, an array of `dast` nodes or `undefined` to skip the current node.

To ensure that a valid `dast` is generated, the default handlers also check that the current `hastNode` is a valid `dast` node for its parent and, if not, they ignore the current node and continue visiting its children.

Information about the parent `dast` node name is available in `context.parentNodeType`.

Please take a look at the [default handlers implementation](./src/handlers.ts) for examples.

The default handlers are available on `context.defaultHandlers`.

### Context

Every handler receives a `context` object with the following shape:

```ts
import type { Nodes as HastNodes } from 'hast';

export interface GlobalContext {
  // Whether the library has found a <base> tag or should not look further.
  // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
  baseUrlFound?: boolean;
  // <base> tag url. Used for resolving relative URLs.
  baseUrl?: string | null;
  [key: string]: unknown;
}

export interface Context {
  // The current parent `dast` node type.
  parentNodeType: NodeType;
  // The parent `hast` node.
  parentNode: HastNodes | null;
  // A reference to the current handlers - merged default + user handlers.
  handlers: Record<string, Handler>;
  // A reference to the default handlers record (map).
  defaultHandlers: Record<string, Handler>;
  // true if the content can include newlines, and false if not (such as in headings).
  wrapText: boolean;
  // Marks for span nodes.
  marks?: Mark[];
  // Prefix for language detection in code blocks.
  // Detection is done on a class name eg class="language-html".
  // Default is `language-`.
  codePrefix?: string;
  // Allowed block types.
  allowedBlocks: string[];
  // Allowed heading levels.
  allowedHeadingLevels: Array<1 | 2 | 3 | 4 | 5 | 6>;
  // Allowed marks.
  allowedMarks: Mark[];
  // Properties in this object are available to every handler — Context
  // is not deeply cloned.
  global: GlobalContext;
}
```

`HastNodes` is the union of all hast node kinds (`Root | Element | Text | Comment | Doctype`) exported by [`@types/hast`](https://www.npmjs.com/package/@types/hast).

### Custom Handlers

It is possible to register custom handlers and override the default behavior via options:

```js
import { paragraphHandler } from './customHandlers.js';

htmlToStructuredText(html, {
  handlers: {
    p: paragraphHandler,
  },
}).then((structuredText) => {
  console.log(structuredText);
});
```

It is **highly encouraged** to validate the `dast` when using custom handlers because handlers are responsible for dictating valid parent-children relationships, and therefore for generating a tree that is compliant with DatoCMS' Structured Text.

## Preprocessing

Because of the strictness of the `dast` spec, some semantics or elements might be lost during transformation.

To improve the final result, you can modify the `hast` tree before it is transformed to `dast` via the `preprocess` hook.

```js
import { visit } from 'unist-util-visit';

const html = `
  <p>convert this to an h1</p>
`;

htmlToStructuredText(html, {
  preprocess: (tree) => {
    // Transform <p> to <h1>
    visit(tree, 'element', (node) => {
      if (node.tagName === 'p') {
        node.tagName = 'h1';
      }
    });
  },
}).then((structuredText) => {
  console.log(structuredText);
});
```

### Examples

<details>
  <summary>Split a node that contains an image.</summary>

In `dast` images can be represented as `Block` nodes, but these are not allowed inside `ListItem` nodes (ul/ol lists). In this example we split the list in three pieces and lift up the image.

The same approach can be used to split other types of branches and lift up nodes to become root nodes.

```js
import { visitParents } from 'unist-util-visit-parents';

const html = `
  <ul>
    <li>item 1</li>
    <li><div><img src="./img.png" alt></div></li>
    <li>item 2</li>
  </ul>
`;

const dast = await htmlToStructuredText(html, {
  preprocess: (tree) => {
    const liftedImages = new WeakSet();

    visitParents(tree, 'element', (node, ancestors) => {
      if (
        node.tagName !== 'img' ||
        liftedImages.has(node) ||
        ancestors.length <= 1 // already a top-level img
      ) {
        return;
      }

      const parents = ancestors;
      const imgParent = parents[parents.length - 1];
      const index = imgParent.children.indexOf(node);
      imgParent.children.splice(index, 1);

      let i = parents.length;
      let splitChildrenIndex = index;
      let childrenAfterSplitPoint = [];

      while (--i > 0) {
        const parent = parents[i];
        const parentsParent = parents[i - 1];

        // Delete the siblings after the image and save them.
        childrenAfterSplitPoint = parent.children.splice(splitChildrenIndex);

        splitChildrenIndex = parentsParent.children.indexOf(parent);

        let nodeInserted = false;

        // Once we reach the topmost parent, insert the image node.
        if (i === 1) {
          splitChildrenIndex += 1;
          parentsParent.children.splice(splitChildrenIndex, 0, node);
          liftedImages.add(node);
          nodeInserted = true;
        }

        splitChildrenIndex += 1;
        if (childrenAfterSplitPoint.length > 0) {
          parentsParent.children.splice(splitChildrenIndex, 0, {
            ...parent,
            children: childrenAfterSplitPoint,
          });
        }

        if (parent.children.length === 0) {
          splitChildrenIndex -= 1;
          parentsParent.children.splice(
            nodeInserted ? splitChildrenIndex - 1 : splitChildrenIndex,
            1,
          );
        }
      }
    });
  },
  handlers: {
    img: async (createNode, node, context) => {
      // In a real scenario you would upload the image to Dato and get back an id.
      const item = '123';
      return createNode('block', { item });
    },
  },
});
```

</details>

<details>
  <summary>Lift up an image node</summary>

```js
import { visitParents, CONTINUE } from 'unist-util-visit-parents';

const html = `
  <ul>
    <li>item 1</li>
    <li><div><img src="./img.png" alt>item 2</div></li>
    <li>item 3</li>
  </ul>
`;

const dast = await htmlToStructuredText(html, {
  preprocess: (tree) => {
    visitParents(tree, 'element', (node, ancestors) => {
      if (node.tagName === 'img' && ancestors.length > 1) {
        const parent = ancestors[ancestors.length - 1];
        const index = parent.children.indexOf(node);
        tree.children.push(node);
        parent.children.splice(index, 1);
        return [CONTINUE, index];
      }
    });
  },
  handlers: {
    img: async (createNode, node, context) => {
      // In a real scenario you would upload the image to Dato and get back an id.
      const item = '123';
      return createNode('block', { item });
    },
  },
});
```

</details>

### Utilities

To work with `hast` and `dast` trees we recommend the [unified ecosystem](https://unifiedjs.com/) — in particular:

- [`unist-util-visit`](https://www.npmjs.com/package/unist-util-visit) and [`unist-util-visit-parents`](https://www.npmjs.com/package/unist-util-visit-parents) for tree traversal
- [`@types/hast`](https://www.npmjs.com/package/@types/hast) for hast node types (`Root`, `Element`, `Text`, `Nodes`)

For `dast` trees specifically, the [`datocms-structured-text-utils`](https://www.npmjs.com/package/datocms-structured-text-utils) package provides tailored traversal helpers (`collectNodes`, `findFirstNode`, `mapNodes`, `filterNodes`, …).

## License

MIT
