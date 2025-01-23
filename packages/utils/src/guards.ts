import {
  Root,
  List,
  Blockquote,
  Block,
  InlineBlock,
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
  Record as DatoCmsRecord,
  StructuredText,
  ThematicBreak,
  Document,
} from './types';

import {
  allowedNodeTypes,
  headingNodeType,
  spanNodeType,
  rootNodeType,
  paragraphNodeType,
  listNodeType,
  listItemNodeType,
  blockquoteNodeType,
  blockNodeType,
  inlineBlockNodeType,
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

export function isInlineBlock(node: Node): node is InlineBlock {
  return node.type === inlineBlockNodeType;
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

function isObject(obj: unknown): obj is Record<string, unknown> {
  return Boolean(typeof obj === 'object' && obj);
}

export function isNodeType(value: string): value is NodeType {
  return allowedNodeTypes.includes(value as NodeType);
}

export function isNode(obj: unknown): obj is Node {
  return Boolean(
    isObject(obj) &&
      'type' in obj &&
      typeof obj.type === 'string' &&
      isNodeType(obj.type),
  );
}

export function isStructuredText<
  R1 extends DatoCmsRecord,
  R2 extends DatoCmsRecord = R1
>(obj: unknown): obj is StructuredText<R1, R2> {
  return Boolean(isObject(obj) && 'value' in obj && isDocument(obj.value));
}

export function isDocument(obj: unknown): obj is Document {
  return Boolean(
    isObject(obj) &&
      'schema' in obj &&
      'document' in obj &&
      obj.schema === 'dast',
  );
}

export function isEmptyDocument(obj: unknown): boolean {
  if (!obj) {
    return true;
  }

  const document =
    isStructuredText(obj) && isDocument(obj.value)
      ? obj.value
      : isDocument(obj)
      ? obj
      : null;

  if (!document) {
    throw new Error(
      'Passed object is neither null, a Structured Text value or a DAST document',
    );
  }

  return (
    document.document.children.length === 1 &&
    document.document.children[0].type === 'paragraph' &&
    document.document.children[0].children.length === 1 &&
    document.document.children[0].children[0].type === 'span' &&
    document.document.children[0].children[0].value === ''
  );
}
