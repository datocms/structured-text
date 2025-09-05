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
