import {
  Root,
  List,
  Blockquote,
  Block,
  Link,
  ItemLink,
  InlineItem,
  Code,
  ListItem,
  Paragraph,
  Heading,
  Node,
  Span,
  WithChildrenNode,
  InlineNode,
  NodeType,
  Record,
  StructuredText,
  ThematicBreak,
  Document,
} from './types';

import {
  headingNodeType,
  spanNodeType,
  rootNodeType,
  paragraphNodeType,
  listNodeType,
  listItemNodeType,
  blockquoteNodeType,
  blockNodeType,
  codeNodeType,
  linkNodeType,
  itemLinkNodeType,
  inlineItemNodeType,
  inlineNodeTypes,
  thematicBreakNodeType,
} from './definitions';

export function hasChildren(node: Node): node is WithChildrenNode {
  return 'children' in node;
}

export function isInlineNode(node: Node): node is InlineNode {
  return (inlineNodeTypes as NodeType[]).includes(node.type);
}

export function isHeading(node: Node): node is Heading {
  return node.type === headingNodeType;
}

export function isSpan(node: Node): node is Span {
  return node.type === spanNodeType;
}

export function isRoot(node: Node): node is Root {
  return node.type === rootNodeType;
}

export function isParagraph(node: Node): node is Paragraph {
  return node.type === paragraphNodeType;
}

export function isList(node: Node): node is List {
  return node.type === listNodeType;
}

export function isListItem(node: Node): node is ListItem {
  return node.type === listItemNodeType;
}

export function isBlockquote(node: Node): node is Blockquote {
  return node.type === blockquoteNodeType;
}

export function isBlock(node: Node): node is Block {
  return node.type === blockNodeType;
}

export function isCode(node: Node): node is Code {
  return node.type === codeNodeType;
}

export function isLink(node: Node): node is Link {
  return node.type === linkNodeType;
}

export function isItemLink(node: Node): node is ItemLink {
  return node.type === itemLinkNodeType;
}

export function isInlineItem(node: Node): node is InlineItem {
  return node.type === inlineItemNodeType;
}

export function isThematicBreak(node: Node): node is ThematicBreak {
  return node.type === thematicBreakNodeType;
}

export function isStructuredText<R1 extends Record, R2 extends Record = R1>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  obj: any,
): obj is StructuredText<R1, R2> {
  return obj && 'value' in obj && isDocument(obj.value);
}

export function isDocument(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  obj: any,
): obj is Document {
  return obj && 'schema' in obj && 'document' in obj;
}
