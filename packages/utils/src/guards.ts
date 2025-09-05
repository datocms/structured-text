import {
  allowedNodeTypes,
  blockNodeType,
  blockquoteNodeType,
  codeNodeType,
  headingNodeType,
  inlineBlockNodeType,
  inlineItemNodeType,
  inlineNodeTypes,
  itemLinkNodeType,
  linkNodeType,
  listItemNodeType,
  listNodeType,
  paragraphNodeType,
  rootNodeType,
  spanNodeType,
  thematicBreakNodeType,
} from './definitions';
import {
  Block,
  BlockId,
  Blockquote,
  CdaStructuredTextValue,
  Code,
  Document,
  Heading,
  InlineBlock,
  InlineItem,
  InlineNode,
  ItemLink,
  Link,
  List,
  ListItem,
  Node,
  NodeType,
  Paragraph,
  Record as DatoCmsRecord,
  Root,
  Span,
  StructuredText,
  ThematicBreak,
  WithChildrenNode,
} from './types';

export function hasChildren<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is WithChildrenNode<BlockItemType> {
  return 'children' in node;
}

export function isInlineNode<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is InlineNode<BlockItemType> {
  return (inlineNodeTypes as NodeType[]).includes(node.type);
}

export function isHeading<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is Heading<BlockItemType> {
  return node.type === headingNodeType;
}

export function isSpan<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is Span {
  return node.type === spanNodeType;
}

export function isRoot<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is Root<BlockItemType> {
  return node.type === rootNodeType;
}

export function isParagraph<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is Paragraph<BlockItemType> {
  return node.type === paragraphNodeType;
}

export function isList<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is List<BlockItemType> {
  return node.type === listNodeType;
}

export function isListItem<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is ListItem<BlockItemType> {
  return node.type === listItemNodeType;
}

export function isBlockquote<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is Blockquote<BlockItemType> {
  return node.type === blockquoteNodeType;
}

export function isBlock<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is Block<BlockItemType> {
  return node.type === blockNodeType;
}

export function isInlineBlock<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is InlineBlock<BlockItemType> {
  return node.type === inlineBlockNodeType;
}

export function isCode<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is Code {
  return node.type === codeNodeType;
}

export function isLink<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is Link {
  return node.type === linkNodeType;
}

export function isItemLink<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is ItemLink {
  return node.type === itemLinkNodeType;
}

export function isInlineItem<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is InlineItem {
  return node.type === inlineItemNodeType;
}

export function isThematicBreak<BlockItemType = BlockId>(
  node: Node<BlockItemType>,
): node is ThematicBreak {
  return node.type === thematicBreakNodeType;
}

function isObject(obj: unknown): obj is Record<string, unknown> {
  return Boolean(typeof obj === 'object' && obj);
}

export function isNodeType(value: string): value is NodeType {
  return allowedNodeTypes.includes(value as NodeType);
}

export function isNode<BlockItemType = BlockId>(
  obj: unknown,
): obj is Node<BlockItemType> {
  return Boolean(
    isObject(obj) &&
      'type' in obj &&
      typeof obj.type === 'string' &&
      isNodeType(obj.type),
  );
}

export function isCdaStructuredTextValue<
  BlockRecord extends DatoCmsRecord,
  LinkRecord extends DatoCmsRecord,
  InlineBlockRecord extends DatoCmsRecord
>(
  obj: unknown,
): obj is CdaStructuredTextValue<BlockRecord, LinkRecord, InlineBlockRecord> {
  return Boolean(isObject(obj) && 'value' in obj && isDocument(obj.value));
}

/**
 * @deprecated Use isCdaStructuredTextValue instead
 */
export function isStructuredText<
  BlockRecord extends DatoCmsRecord,
  LinkRecord extends DatoCmsRecord,
  InlineBlockRecord extends DatoCmsRecord
>(
  obj: unknown,
): obj is StructuredText<BlockRecord, LinkRecord, InlineBlockRecord> {
  return isCdaStructuredTextValue(obj);
}

export function isDocument<BlockItemType = BlockId>(
  obj: unknown,
): obj is Document<BlockItemType> {
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
