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

Handlers can return either a promise that resolves to a Dast node, an array of Dast Nodes or `undefined` to skip the current node.

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

Because of the strictness of the Dast spec it is possible that some semantic or elements might be lost during the transformation.

To improve the final result, you might want to modify the Hast before it is transformed to Dast with the `preprocess` hook.

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

### Examples

<details>
  <summary>Split an `ul` that contains an image.</summary>

In Dast images can be presented as `Block` nodes but these are not allowed inside of `ListItem` nodes (ul/ol lists). In this example we will split the list in 3 pieces.

```js
import { findAll } from 'unist-utils-core';

const html = `
<ul>
  <li>item 1</li>
  <li><div><img src="./img.png" alt></div></li>
  <li>item 2</li>
</ul>
`;

const dast = await htmlToDast(html, {
  preprocess: (tree) => {
    findAll(tree, (node, index, parent) => {
      if (node.tagName !== 'ul' && node.tagName !== 'ol') {
        return;
      }
      let i = 0;
      // Build up a new array of children where every element is either
      // a ul/ol with contiguous regular children or a node with images.
      //
      // Example:
      // When list items have images [ul, img, img, ul]
      // When there aren't images [ul] the list is equal to the original
      const splitChildren = [];
      // Insert list item to an existing or new list in splitChildren.
      function insertListItem(node, listItem) {
        if (splitChildren[i]) {
          // If we have a list add the current listItem to it.
          splitChildren[i].children.push(listItem);
        } else {
          splitChildren[i] = {
            ...node,
            children: [listItem],
          };
        }
      }

      node.children.forEach((listItem) => {
        const images = findAll(listItem, (node, index, parent) => {
          if (node.tagName !== 'img') {
            return;
          }
          // Remove the image from the listItem.
          parent.children.splice(index, 1);
          return true;
        });
        if (images.length > 0) {
          insertListItem(node, listItem);
          // If we find images add new item to splitChildren.
          // This will split up the list.
          if (splitChildren.length > 0) {
            i++;
          }
          splitChildren.push({
            type: 'element',
            tagName: 'div',
            children: images,
          });
          i++;
        } else {
          insertListItem(node, listItem);
        }
      });

      if (splitChildren.length > 1) {
        parent.children[index] = {
          type: 'element',
          tagName: 'div',
          children: splitChildren,
        };
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
