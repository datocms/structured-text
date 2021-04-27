# `datocms-contentful-to-structured-text`

This package contains utilities to convert Contentful Rich Text to a DatoCMS Structured Text `dast` (DatoCMS Abstract Syntax Tree) document.

Please refer to [the `dast` format docs](https://www.datocms.com/docs/structured-text/dast) to learn more about the syntax tree format and the available nodes.

## Usage

The main utility in this package is `richTextToStructuredText` which takes a Rich Text JSON and transforms it into a valid `dast` document.

`richTextToStructuredText` returns a `Promise` that resolves with a Structured Text document.

```js
import { richTextToStructuredText } from 'datocms-contentful-to-structured-text';

const richText = {
  nodeType: 'document',
  data: {},
  content: [
    {
      nodeType: 'heading-1',
      content: [
        {
          nodeType: 'text',
          value: 'Lorem ipsum dolor sit amet',
          marks: [],
          data: {},
        },
      ],
      data: {},
    },
};

richTextToStructuredText(richText).then((structuredText) => {
  console.log(structuredText);
});
```

## Validate `dast` documents

`dast` is a strict format for DatoCMS' Structured Text fields and follows a different pattern from Contentful Rich Text structure.

The `datocms-structured-text-utils` package provides a `validate` utility to validate a Structured Text content to make sure that it is compatible with DatoCMS' Structured Text field.

```js
import { validate } from 'datocms-structured-text-utils';

// ...

richTextToStructuredText(richText).then((structuredText) => {
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
  // Override existing Contentful node handlers or add new ones.
  handlers: Record<string, CreateNodeFunction>,
  // Array of allowed Block nodes.
  allowedBlocks: Array<
    BlockquoteType | CodeType | HeadingType | LinkType | ListType,
  >,
  // Array of allowed marks.
  allowedMarks: Mark[],
}>;
```

### Transforming Nodes

The utils in this library traverse a `Contentful Rich Text` tree and transform supported nodes to `dast` nodes. The transformation is done by working on a `Contentful Rich Text` node with a handler (async) function.

Handlers are associated to `Contentful Rich Text` nodes by `nodeType` and look as follow:

```js
import { visitChildren } from 'datocms-contentful-to-structured-text';

// Handler for the paragraph node type.
async function p(createDastNode, contentfulNode, context) {
  return createDastNode('paragraph', {
    children: await visitChildren(createDastNode, contentfulNode, context),
  });
}
```

Handlers can return either a promise that resolves to a `dast` node, an array of `dast` Nodes, or `undefined` to skip the current node.

To ensure that a valid `dast` is generated, the default handlers also check that the current `contentfulNode` is a valid `dast` node for its parent and, if not, they ignore the current node and continue visiting its children.

Information about the parent `dast` node name is available in `context.parentNodeType`.

Please take a look at the [default handlers implementation](./handlers.ts) for examples.

The default handlers are available on `context.defaultHandlers`.

### Context

Every handler receives a `context` object that includes the following information:

```js
export interface GlobalContext {
  // <base> tag url. This is used for resolving relative URLs.
  baseUrl?: string;
}

export interface Context {
  // The current parent `dast` node type.
  parentNodeType: NodeType;
  // The parent `Contentful Rich Text` node.
  parentNode: ContentfulNode;
  // A reference to the current handlers - merged default + user handlers.
  handlers: Record<string, Handler<unknown>>;
  // A reference to the default handlers record (map).
  defaultHandlers: Record<string, Handler<unknown>>;
  // Marks for span nodes.
  marks?: Mark[];
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

It is possible to register custom handlers and override the default behaviour via options:

```js
import { paragraphHandler } from './customHandlers';

richTextToStructuredText(richText, {
  handlers: {
    paragraph: paragraphHandler,
  },
}).then((structuredText) => {
  console.log(structuredText);
});
```

It is **highly encouraged** to validate the `dast` when using custom handlers because handlers are responsible for dictating valid parent-children relationships and therefore generating a tree that is compliant with DatoCMS Structured Text.

## Preprocessing Rich Text

Because of the strictness of the `dast` spec, it is possible that some elements might be lost during transformation.

To improve the final result, you might want to modify the Rich Text tree before it is transformed to `dast`.

### Examples

<details>
  <summary>Split a node that contains an image.</summary>

In `dast`, images can only be presented as `Block` nodes, but blocks are not allowed inside of `ListItem` nodes (unordered-list/ordered-list). In this example we will split the original `unordered-list` in one list, the lifted up image block and another list.

```js
const richTextWithAssets = {
  nodeType: 'document',
  data: {},
  content: [
    {
      nodeType: 'unordered-list',
      content: [
        {
          nodeType: 'list-item',
          content: [
            {
              nodeType: 'paragraph',
              content: [
                {
                  nodeType: 'text',
                  value: 'text',
                  marks: [],
                  data: {},
                },
              ],
              data: {},
            },
            {
              content: [],
              data: {
                target: {
                  sys: {
                    id: 'zzz',
                    linkType: 'Asset',
                    type: 'Link',
                  },
                },
              },
              nodeType: 'embedded-asset-block',
            },
            {
              nodeType: 'paragraph',
              content: [
                {
                  nodeType: 'text',
                  value: 'text',
                  marks: [],
                  data: {},
                },
              ],
              data: {},
            },
          ],
          data: {},
        },
      ],
      data: {},
    },
  ],
};

// This function transforms the richText tree and moves the embedded-asset-block to root,
// splitting the list in two parts.

function liftAssets(richText) {
  const visit = (node, cb, index = 0, parents = []) => {
    if (node.content && node.content.length > 0) {
      node.content.forEach((child, index) => {
        visit(child, cb, index, [...parents, node]);
      });
    }

    cb(node, index, parents);
  };

  const liftedImages = new WeakSet();

  visit(richText, (node, index, parents) => {
    if (
      !node ||
      node.nodeType !== 'embedded-asset-block' ||
      liftedImages.has(node) ||
      parents.length === 1 // is a top level asset
    ) {
      return;
    }

    const imgParent = parents[parents.length - 1];

    imgParent.content.splice(index, 1);

    let i = parents.length;
    let splitChildrenIndex = index;
    const contentAfterSplitPoint = [];

    while (--i > 0) {
      const parent = parents[i];
      const parentsParent = parents[i - 1];

      contentAfterSplitPoint = parent.content.splice(splitChildrenIndex);

      splitChildrenIndex = parentsParent.content.indexOf(parent);

      let nodeInserted = false;

      if (i === 1) {
        splitChildrenIndex += 1;
        parentsParent.content.splice(splitChildrenIndex, 0, node);
        liftedImages.add(node);

        nodeInserted = true;
      }

      splitChildrenIndex += 1;

      if (contentAfterSplitPoint.length > 0) {
        parentsParent.content.splice(splitChildrenIndex, 0, {
          ...parent,
          content: contentAfterSplitPoint,
        });
      }
      // Remove the parent if empty
      if (parent.content.length === 0) {
        splitChildrenIndex -= 1;
        parentsParent.content.splice(
          nodeInserted ? splitChildrenIndex - 1 : splitChildrenIndex,
          1,
        );
      }
    }
  });
}

liftAssets(richTextWithAssets);

const handlers = {
  'embedded-asset-block': async (createNode, node, context) => {
    const item = '123';
    return createNode('block', {
      item,
    });
  },
};

const dast = await richTextToStructuredText(richTextWithAssets, { handlers });
```

</details>

## License

MIT
