# `datocms-html-to-structured-text`

Convert HTML (or [Hast](https://github.com/syntax-tree/hast) syntax tree) to a valid DatoCMS Structured Text Dast document.

Dast stands for Dato Abstract Syntax Tree.

## Usage

The main utility is `htmlToStructuredText` which takes a string of HTML and transforms it into a valid Dast.

`htmlToStructuredText` returns a `Promise` that resolves with a `Dast`.

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

Internally, both utilities work on a Hast. Should you have an Hast already you can use a third utility called `hastToDast`.

## Valid Dast

Dast is a strict format that is compliant with DatoCMS' Structured Text records. As such the resulting document is generally a simplified, content-centric version of the input HTML.

When possible, the library relies on semantic HTML to generate a valid Dast document.

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

We recommend to validate every Dast to avoid errors later when creating records.

## Advanced Usage

### Options

All the `*ToStructuredText` utils accept an optional `options` object as second argument.

```js
type Options = Partial<{
  newlines: boolean,
  // Override existing Hast node handlers or add new ones.
  handlers: Record<string, CreateNodeFunction>,
  // Allows to tweak the Hast tree before transforming it to a Dast document.
  preprocess: (hast: HastRootNode) => HastRootNode,
  // Array of allowed Block nodes.
  allowedBlocks: Array<
    BlockquoteType | CodeType | HeadingType | LinkType | ListType,
  >,
  // Array of allowed marks.
  allowedMarks: Mark[],
}>;
```

### Transforming Nodes

This library traverses a Hast tree and transforms supported nodes to Dast nodes. The transformation is done by working on a Hast node with a handler (async) function.

Handlers are associated to Hast nodes by `tagName` or `type` when `node.type !== 'element'` and look as follow:

```js
import { visitChildren } from 'datocms-html-to-structured-text';

// Handler for the <p> tag.
async function p(createDastNode, hastNode, context) {
  return createDastNode('paragraph', {
    children: await visitChildren(createDastNode, hastNode, context),
  });
}
```

Handlers can return either a promise that resolves to a Dast node, an array of Dast Nodes or `undefined` to skip the current node.

To ensure that a valid Dast is generated the default handlers also check that the current `hastNode` is a valid Dast node for its parent and, if not, they ignore the current node and continue visiting its children.

Information about the parent Dast node name is available in `context.name`.

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
  // The current parent Dast node type.
  parentNodeType: NodeType;
  // The parent Hast node.
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
  // Properties in this object are avaliable to every handler as Context
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

It is **highly encouraged** to validate the Dast when using custom handlers as handlers are responsible for dictating valid parent-children relationships and therefore generating a tree that is compliant with DatoCMS' Structured Text.

## preprocessing

Because of the strictness of the Dast spec it is possible that some semantic or elements might be lost during the transformation.

To improve the final result, you might want to modify the Hast before it is transformed to Dast with the `preprocess` hook.

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

In Dast images can be presented as `Block` nodes but these are not allowed inside of `ListItem` nodes (ul/ol lists). In this example we will split the list in 3 pieces and lift up the image.

The same approach can be used to split other types of branches and lift up nodes to become root nodes.

```js
import { findAll } from 'unist-utils-core';

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

        // If we reached the 'div' add the image's node
        if (i === 1) {
          splitChildrenIndex += 1;
          parentsParent.children.splice(splitChildrenIndex, 0, node);
          liftedImages.add(node);
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
          parentsParent.children.splice(splitChildrenIndex, 1);
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
const html = `
  <ul>
    <li>item 1</li>
    <li><div><img src="./img.png" alt>item 2</div></li>
    <li>item 3</li>
  </ul>
`;
const dast = await htmlToStructuredText(html, {
  preprocess: (tree) => {
    findAll(tree, (node, index, parent) => {
      if (node.tagName === 'img') {
        // Add the image to the root's children.
        tree.children.push(node);
        // remove the image from the parent's children array.
        parent.children.splice(index, 1);
        return;
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

### Utilities

To work with Hast and Dast trees we recommend using the [unist-utils-core](https://www.npmjs.com/package/unist-utils-core) library.

## License

MIT
