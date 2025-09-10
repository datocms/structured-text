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

export function hasChildren<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is WithChildrenNode<BlockItemType, InlineBlockItemType> {
  return 'children' in node;
}

export function isInlineNode<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is InlineNode<InlineBlockItemType> {
  return (inlineNodeTypes as NodeType[]).includes(node.type);
}

export function isHeading<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is Heading<InlineBlockItemType> {
  return node.type === headingNodeType;
}

export function isSpan<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is Span {
  return node.type === spanNodeType;
}

export function isRoot<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is Root<BlockItemType, InlineBlockItemType> {
  return node.type === rootNodeType;
}

export function isParagraph<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is Paragraph<InlineBlockItemType> {
  return node.type === paragraphNodeType;
}

export function isList<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is List<BlockItemType, InlineBlockItemType> {
  return node.type === listNodeType;
}

export function isListItem<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is ListItem<BlockItemType, InlineBlockItemType> {
  return node.type === listItemNodeType;
}

export function isBlockquote<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is Blockquote<InlineBlockItemType> {
  return node.type === blockquoteNodeType;
}

export function isBlock<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is Block<BlockItemType> {
  return node.type === blockNodeType;
}

export function isInlineBlock<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is InlineBlock<InlineBlockItemType> {
  return node.type === inlineBlockNodeType;
}

export function isCode<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is Code {
  return node.type === codeNodeType;
}

export function isLink<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is Link {
  return node.type === linkNodeType;
}

export function isItemLink<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(node: Node<BlockItemType, InlineBlockItemType>): node is ItemLink {
  return node.type === itemLinkNodeType;
}

export function isInlineItem<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(node: Node<BlockItemType, InlineBlockItemType>): node is InlineItem {
  return node.type === inlineItemNodeType;
}

export function isThematicBreak<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(node: Node<BlockItemType, InlineBlockItemType>): node is ThematicBreak {
  return node.type === thematicBreakNodeType;
}

function isObject(obj: unknown): obj is Record<string, unknown> {
  return Boolean(typeof obj === 'object' && obj);
}

export function isNodeType(value: string): value is NodeType {
  return allowedNodeTypes.includes(value as NodeType);
}

export function isNode<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  obj: unknown,
): obj is Node<BlockItemType, InlineBlockItemType> {
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

export function isDocument<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(obj: unknown): obj is Document<BlockItemType, InlineBlockItemType> {
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
