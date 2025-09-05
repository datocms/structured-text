# `datocms-structured-text-utils`

A set of Typescript types and helpers to work with DatoCMS Structured Text fields.

## Installation

Using [npm](http://npmjs.org/):

```sh
npm install datocms-structured-text-utils
```

Using [yarn](https://yarnpkg.com/):

```sh
yarn add datocms-structured-text-utils
```

## `dast` document validation

You can use the `validate()` function to check if an object is compatible with the [`dast` specification](https://www.datocms.com/docs/structured-text/dast):

```js
import { validate } from 'datocms-structured-text-utils';

const structuredText = {
  value: {
    schema: 'dast',
    document: {
      type: 'root',
      children: [
        {
          type: 'heading',
          level: 1,
          children: [
            {
              type: 'span',
              value: 'Hello!',
              marks: ['foobar'],
            },
          ],
        },
      ],
    },
  },
};

const result = validate(structuredText);

if (!result.valid) {
  console.error(result.message); // "span has an invalid mark "foobar"
}
```

## `dast` format specs

The package exports a number of constants that represents the rules of the [`dast` specification](https://www.datocms.com/docs/structured-text/dast).

Take a look a the [definitions.ts](https://github.com/datocms/structured-text/blob/main/packages/utils/src/definitions.ts) file for their definition:

```javascript
const blockquoteNodeType = 'blockquote';
const blockNodeType = 'block';
const codeNodeType = 'code';
const headingNodeType = 'heading';
const inlineItemNodeType = 'inlineItem';
const itemLinkNodeType = 'itemLink';
const linkNodeType = 'link';
const listItemNodeType = 'listItem';
const listNodeType = 'list';
const paragraphNodeType = 'paragraph';
const rootNodeType = 'root';
const spanNodeType = 'span';

const allowedNodeTypes = [
  'paragraph',
  'list',
  // ...
];

const allowedChildren = {
  paragraph: 'inlineNodes',
  list: ['listItem'],
  // ...
};

const inlineNodeTypes = [
  'span',
  'link',
  // ...
];

const allowedAttributes = {
  heading: ['level', 'children'],
  // ...
};

const allowedMarks = [
  'strong',
  'code',
  // ...
];
```

## Typescript Types

The package exports Typescript types for all the different nodes that a [`dast` document](https://www.datocms.com/docs/structured-text/dast) can contain.

Take a look a the [types.ts](https://github.com/datocms/structured-text/blob/main/packages/utils/src/types.ts) file for their definition:

```typescript
type Node
type BlockNode
type InlineNode
type RootType
type Root
type ParagraphType
type Paragraph
type HeadingType
type Heading
type ListType
type List
type ListItemType
type ListItem
type CodeType
type Code
type BlockquoteType
type Blockquote
type BlockType
type Block
type SpanType
type Mark
type Span
type LinkType
type Link
type ItemLinkType
type ItemLink
type InlineItemType
type InlineItem
type WithChildrenNode
type Document
type NodeType
type CdaStructuredTextValue
type Record
```

## Typescript Type guards

It also exports all a number of [type guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards) that you can use to guarantees the type of a node in some scope.

Take a look a the [guards.ts](https://github.com/datocms/structured-text/blob/main/packages/utils/src/guards.ts) file for their definition:

```typescript
function hasChildren(node: Node): node is WithChildrenNode {}
function isInlineNode(node: Node): node is InlineNode {}
function isHeading(node: Node): node is Heading {}
function isSpan(node: Node): node is Span {}
function isRoot(node: Node): node is Root {}
function isParagraph(node: Node): node is Paragraph {}
function isList(node: Node): node is List {}
function isListItem(node: Node): node is ListItem {}
function isBlockquote(node: Node): node is Blockquote {}
function isBlock(node: Node): node is Block {}
function isCode(node: Node): node is Code {}
function isLink(node: Node): node is Link {}
function isItemLink(node: Node): node is ItemLink {}
function isInlineItem(node: Node): node is InlineItem {}
function isCdaStructuredTextValue(
  object: any,
): object is CdaStructuredTextValue {}
```

## Tree Manipulation Utilities

The package provides a comprehensive set of utilities for traversing, transforming, and querying structured text trees. All utilities support both synchronous and asynchronous operations, work with both document wrappers and plain nodes, and provide full TypeScript support with proper type narrowing.

### Visiting Nodes

| Function                                                                                                           | Description                                                           |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| [`forEachNode`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L109)      | Visit every node in the tree synchronously using pre-order traversal  |
| [`forEachNodeAsync`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L142) | Visit every node in the tree asynchronously using pre-order traversal |

Visit all nodes in the tree using pre-order traversal:

```javascript
import { forEachNode, forEachNodeAsync } from 'datocms-structured-text-utils';

// Synchronous traversal
forEachNode(structuredText, (node, parent, path) => {
  console.log(`Node type: ${node.type}, Path: ${path.join('.')}`);
});

// Asynchronous traversal
await forEachNodeAsync(structuredText, async (node, parent, path) => {
  await processNode(node);
});
```

### Transforming Trees

| Function                                                                                                        | Description                                                           |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`mapNodes`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L176)      | Transform nodes in the tree synchronously while preserving structure  |
| [`mapNodesAsync`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L257) | Transform nodes in the tree asynchronously while preserving structure |

Transform nodes while preserving the tree structure:

```javascript
import { mapNodes, mapNodesAsync } from 'datocms-structured-text-utils';

// Add custom properties to all nodes
const enhanced = mapNodes(structuredText, (node) => ({
  ...node,
  id: generateId(),
}));

// Async transformation with external API calls
const processed = await mapNodesAsync(structuredText, async (node) => {
  if (isBlock(node)) {
    const enrichedData = await fetchBlockData(node.item);
    return { ...node, enrichedData };
  }
  return node;
});
```

### Finding Nodes

| Function                                                                                                             | Description                                                  |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [`collectNodes`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L340)       | Collect all nodes that match a predicate function            |
| [`collectNodesAsync`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L398)  | Collect all nodes that match an async predicate function     |
| [`findFirstNode`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L437)      | Find the first node that matches a predicate function        |
| [`findFirstNodeAsync`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L515) | Find the first node that matches an async predicate function |

Find specific nodes using predicates or type guards:

```javascript
import {
  findFirstNode,
  findFirstNodeAsync,
  collectNodes,
  collectNodesAsync,
  isSpan,
  isHeading,
} from 'datocms-structured-text-utils';

// Find first node matching condition
const firstHeading = findFirstNode(structuredText, isHeading);
if (firstHeading) {
  console.log(`Found heading: ${firstHeading.node.level}`);
}

// Collect all nodes matching condition
const allSpans = collectNodes(structuredText, isSpan);
const textContent = allSpans.map(({ node }) => node.value).join('');

// Find nodes with specific attributes
const strongText = collectNodes(
  structuredText,
  (node) => isSpan(node) && node.marks?.includes('strong'),
);
```

### Filtering Trees

| Function                                                                                                           | Description                                             |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| [`filterNodes`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L564)      | Remove nodes that don't match a predicate synchronously |
| [`filterNodesAsync`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L647) | Remove nodes that don't match an async predicate        |

Remove nodes that don't match a predicate:

```javascript
import { filterNodes, filterNodesAsync } from 'datocms-structured-text-utils';

// Remove all code blocks
const withoutCode = filterNodes(structuredText, (node) => !isCode(node));

// Async filtering with external validation
const validated = await filterNodesAsync(structuredText, async (node) => {
  if (isBlock(node)) {
    return await validateBlockItem(node.item);
  }
  return true;
});
```

### Reducing Trees

| Function                                                                                                           | Description                                                            |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [`reduceNodes`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L734)      | Reduce the tree to a single value using a synchronous reducer function |
| [`reduceNodesAsync`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L779) | Reduce the tree to a single value using an async reducer function      |

Reduce the entire tree to a single value:

```javascript
import { reduceNodes, reduceNodesAsync } from 'datocms-structured-text-utils';

// Extract all text content
const textContent = reduceNodes(
  structuredText,
  (acc, node) => {
    if (isSpan(node)) {
      return acc + node.value;
    }
    return acc;
  },
  '',
);

// Count nodes by type
const nodeCounts = reduceNodes(
  structuredText,
  (acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  },
  {},
);
```

### Checking Conditions

| Function                                                                                                         | Description                                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`someNode`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L821)       | Check if any node in the tree matches a predicate (short-circuit evaluation)          |
| [`someNodeAsync`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L862)  | Check if any node in the tree matches an async predicate (short-circuit evaluation)   |
| [`everyNode`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L903)      | Check if every node in the tree matches a predicate (short-circuit evaluation)        |
| [`everyNodeAsync`](https://github.com/datocms/structured-text/blob/main/packages/utils/src/manipulation.ts#L934) | Check if every node in the tree matches an async predicate (short-circuit evaluation) |

Test if any or all nodes match a condition:

```javascript
import {
  someNode,
  everyNode,
  someNodeAsync,
  everyNodeAsync,
} from 'datocms-structured-text-utils';

// Check if document contains any headings
const hasHeadings = someNode(structuredText, isHeading);

// Check if all spans have text content
const allSpansHaveText = everyNode(
  structuredText,
  (node) => !isSpan(node) || (node.value && node.value.length > 0),
);

// Async validation
const allBlocksValid = await everyNodeAsync(
  structuredText,
  async (node) => !isBlock(node) || (await validateBlock(node.item)),
);
```

### Type Safety and Path Information

All utilities provide full TypeScript support with type narrowing and path information:

```typescript
// Type guards automatically narrow types
const headings = collectNodes(structuredText, isHeading);
// headings is now Array<{ node: Heading; path: TreePath }>

headings.forEach(({ node, path }) => {
  // TypeScript knows node is Heading type
  console.log(`Level ${node.level} heading at ${path.join('.')}`);
});

// Custom type guards work too
const customNodes = collectNodes(
  structuredText,
  (node): node is Block => isBlock(node) && node.item.startsWith('custom-'),
);
// customNodes is now Array<{ node: Block; path: TreePath }>
```
