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
type StructuredText
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
function isStructuredText(object: any): object is StructuredText {}
```
