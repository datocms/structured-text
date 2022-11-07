# `datocms-html-to-structured-text`

This package contains utilities to convert HTML (or a [Hast](https://github.com/syntax-tree/hast) to a DatoCMS Structured Text `dast` (DatoCMS Abstract Syntax Tree) document.

Please refer to [the `dast` format docs](https://www.datocms.com/docs/structured-text/dast) to learn more about the syntax tree format and the available nodes.

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

In Node.js you can use the `parse5ToStructuredText` helper which instead takes a document generated with `parse5`.

```js
import parse5 from 'parse5';
import { parse5ToStructuredText } from 'datocms-html-to-structured-text';

parse5ToStructuredText(
  parse5.parse(html, {
    sourceCodeLocationInfo: true,
  }),
).then((structuredText) => {
  console.log(structuredText);
});
```

Internally, both utilities work on a [Hast](https://github.com/syntax-tree/hast). Should you have a `hast` already you can use a third utility called `hastToDast`.

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

We recommend to validate every `dast` to avoid errors later when creating records.

## Advanced Usage

### Options

All the `*ToStructuredText` utils accept an optional `options` object as second argument:

```js
type Options = Partial<{
  newlines: boolean,
  // Override existing `hast` node handlers or add new ones
  handlers: Record<string, CreateNodeFunction>,
  // Allows to tweak the `hast` tree before transforming it to a `dast` document
  preprocess: (hast: HastRootNode) => HastRootNode,
  // Array of allowed block nodes
  allowedBlocks: Array<
    BlockquoteType | CodeType | HeadingType | LinkType | ListType,
  >,
  // Array of allowed marks
  allowedMarks: Mark[],
  // Array of allowed heading levels for 'heading' nodes
  allowedHeadingLevels: Array<1 | 2 | 3 | 4 | 5 | 6>,
}>;
```

### Transforming Nodes

The utils in this library traverse a `hast` tree and transform supported nodes to `dast` nodes. The transformation is done by working on a `hast` node with a handler (async) function.

Handlers are associated to `hast` nodes by `tagName` or `type` when `node.type !== 'element'` and look as follow:

```js
import { visitChildren } from 'datocms-html-to-structured-text';

// Handler for the <p> tag.
async function p(createDastNode, hastNode, context) {
  return createDastNode('paragraph', {
    children: await visitChildren(createDastNode, hastNode, context),
  });
}
```

Handlers can return either a promise that resolves to a `dast` node, an array of `dast` Nodes or `undefined` to skip the current node.

To ensure that a valid `dast` is generated the default handlers also check that the current `hastNode` is a valid `dast` node for its parent and, if not, they ignore the current node and continue visiting its children.

Information about the parent `dast` node name is available in `context.parentNodeType`.

Please take a look at the [default handlers implementation](./handlers.ts) for examples.

The default handlers are available on `context.defaultHandlers`.

### context

Every handler receives a `context` object that includes the following information:

```js
export interface GlobalContext {
  // Whether the library has found a <base> tag or should not look further.
  // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
  baseUrlFound?: boolean;
  // <base> tag url. This is used for resolving relative URLs.
  baseUrl?: string;
}

export interface Context {
  // The current parent `dast` node type.
  parentNodeType: NodeType;
  // The parent `hast` node.
  parentNode: HastNode;
  // A reference to the current handlers - merged default + user handlers.
  handlers: Record<string, Handler<unknown>>;
  // A reference to the default handlers record (map).
  defaultHandlers: Record<string, Handler<unknown>>;
  // true if the content can include newlines, and false if not (such as in headings).
  wrapText: boolean;
  // Marks for span nodes.
  marks?: Mark[];
  // Prefix for language detection in code blocks.
  // Detection is done on a class name eg class="language-html"
  // Default is `language-`
  codePrefix?: string;
  // Array of allowed Block types.
  allowedBlocks: Array<
    BlockquoteType | CodeType | HeadingType | LinkType | ListType,
  >;
  // Array of allowed marks.
  allowedMarks: Mark[];
  // Properties in this object are available to every handler as Context
  // is not deeply cloned.
  global: GlobalContext;
}
```

### Custom Handlers

It is possible to register custom handlers and override the default behavior via options:

```js
import { paragraphHandler } from './customHandlers';

htmlToStructuredText(html, {
  handlers: {
    p: paragraphHandler,
  },
}).then((structuredText) => {
  console.log(structuredText);
});
```

It is **highly encouraged** to validate the `dast` when using custom handlers because handlers are responsible for dictating valid parent-children relationships and therefore generating a tree that is compliant with DatoCMS' Structured Text.

## preprocessing

Because of the strictness of the `dast` spec it is possible that some semantic or elements might be lost during the transformation.

To improve the final result, you might want to modify the `hast` before it is transformed to `dast` with the `preprocess` hook.

```js
import { findAll } from 'unist-utils-core';
const html = `
  <p>convert this to an h1</p>
`;

htmlToStructuredText(html, {
  preprocess: (tree) => {
    // Transform <p> to <h1>
    findAll(tree, (node) => {
      if (node.type === 'element' && node.tagName === 'p') {
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

In `dast` images can be presented as `Block` nodes but these are not allowed inside of `ListItem` nodes (ul/ol lists). In this example we will split the list in 3 pieces and lift up the image.

The same approach can be used to split other types of branches and lift up nodes to become root nodes.

```js
import { visit } from 'unist-utils-core';

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
    const body = find(tree, (node) => node.tagName === 'body');

    visit(body, (node, index, parents) => {
      if (
        !node ||
        node.tagName !== 'img' ||
        liftedImages.has(node) ||
        parents.length === 1 // is a top level img
      ) {
        return;
      }
      // remove image

      const imgParent = parents[parents.length - 1];
      imgParent.children.splice(index, 1);

      let i = parents.length;
      let splitChildrenIndex = index;
      let childrenAfterSplitPoint = [];

      while (--i > 0) {
        // Example: i == 2
        // [ 'body', 'div', 'h1' ]
        const /* h1 */ parent = parents[i];
        const /* div */ parentsParent = parents[i - 1];

        // Delete the siblings after the image and save them in a variable
        childrenAfterSplitPoint /* [ 'h1.2' ] */ = parent.children.splice(
          splitChildrenIndex,
        );
        // parent.children is now == [ 'h1.1' ]

        // parentsParent.children = [ 'h1' ]
        splitChildrenIndex = parentsParent.children.indexOf(parent);
        // splitChildrenIndex = 0

        let nodeInserted = false;

        // If we reached the 'div' add the image's node
        if (i === 1) {
          splitChildrenIndex += 1;
          parentsParent.children.splice(splitChildrenIndex, 0, node);
          liftedImages.add(node);

          nodeInserted = true;
        }

        splitChildrenIndex += 1;
        // Create a new branch with childrenAfterSplitPoint if we have any i.e.
        // <h1>h1.2</h1>
        if (childrenAfterSplitPoint.length > 0) {
          parentsParent.children.splice(splitChildrenIndex, 0, {
            ...parent,
            children: childrenAfterSplitPoint,
          });
        }
        // Remove the parent if empty
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
      return createNode('block', {
        item,
      });
    },
  },
});
```

</details>

<details>
  <summary>Lift up an image node</summary>

```js
import { visit, CONTINUE } from 'unist-utils-core';

const html = `
  <ul>
    <li>item 1</li>
    <li><div><img src="./img.png" alt>item 2</div></li>
    <li>item 3</li>
  </ul>
`;

const dast = await htmlToStructuredText(html, {
  preprocess: (tree) => {
    visit(tree, (node, index, parents) => {
      if (node.tagName === 'img' && parents.length > 1) {
        const parent = parents[parents.length - 1];
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

To work with `hast` and `dast` trees we recommend using the [unist-utils-core](https://www.npmjs.com/package/unist-utils-core) library.

## License

MIT
