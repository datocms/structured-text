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
  CdaStructuredTextRecord,
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

/**
 * Narrows a union of block item shapes to the member whose model
 * (`item_type`) matches `Id`.
 *
 * Matches existing (persisted) blocks — items that carry an `id` and
 * whose `relationships.item_type.data.id` matches. That covers both the
 * `nested: true` response form and the "updated block" variant of
 * request payloads. Filtered out:
 *   - bare string IDs (no `id` property to read)
 *   - newly-created blocks in request payloads (they have no `id` yet —
 *     the caller already knows the type, so finding them by model is
 *     not the typical use case)
 *
 * `relationships` is constrained as optional so the updated-block
 * request shape (where `relationships?` may be omitted when patching an
 * existing block) is still picked up.
 */
export type NarrowBlockItemByItemType<T, Id extends string> = Extract<
  T,
  {
    id: string;
    relationships?: { item_type: { data: { type: 'item_type'; id: Id } } };
  }
>;

function itemHasItemTypeId(item: unknown, itemTypeId: string): boolean {
  if (typeof item !== 'object' || item === null) return false;
  const relationships = (item as { relationships?: unknown }).relationships;
  if (typeof relationships !== 'object' || relationships === null) return false;
  const itemType = (relationships as { item_type?: unknown }).item_type;
  if (typeof itemType !== 'object' || itemType === null) return false;
  const data = (itemType as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null) return false;
  return (data as { id?: unknown }).id === itemTypeId;
}

/**
 * Type guard that narrows a `block` node to the variant whose `item`
 * belongs to a specific model.
 *
 * Two call styles are available:
 *
 * - Curried: `isBlockWithItemOfType(itemTypeId)` returns a predicate,
 *   handy with `findFirstNode` / `findAllNodes` / `Array#filter`.
 * - Direct: `isBlockWithItemOfType(itemTypeId, node)` checks a node
 *   inline (e.g. inside an `if`).
 *
 * For the literal `Id` to be preserved (and narrowing to work), the
 * `itemTypeId` argument must be typed as a literal — use `as const` on
 * pre-set ID constants.
 *
 * @example
 * ```ts
 * // Curried
 * const needle = findFirstNode(
 *   body.document,
 *   isBlockWithItemOfType(WARNING_BLOCK_TYPE_ID),
 * );
 *
 * // Direct
 * if (isBlockWithItemOfType(WARNING_BLOCK_TYPE_ID, node)) {
 *   node.item; // narrowed to the Warning item shape
 * }
 * ```
 */
export function isBlockWithItemOfType<Id extends string>(
  itemTypeId: Id,
): <BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  node: Node<BlockItemType, InlineBlockItemType>,
) => node is Block<NarrowBlockItemByItemType<BlockItemType, Id>>;
export function isBlockWithItemOfType<
  Id extends string,
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(
  itemTypeId: Id,
  node: Node<BlockItemType, InlineBlockItemType>,
): node is Block<NarrowBlockItemByItemType<BlockItemType, Id>>;
export function isBlockWithItemOfType(
  itemTypeId: string,
  node?: Node,
): unknown {
  if (node === undefined) {
    return (n: Node): boolean =>
      n.type === blockNodeType &&
      itemHasItemTypeId((n as Block<unknown>).item, itemTypeId);
  }
  return (
    node.type === blockNodeType &&
    itemHasItemTypeId((node as Block<unknown>).item, itemTypeId)
  );
}

export function isInlineBlock<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is InlineBlock<InlineBlockItemType> {
  return node.type === inlineBlockNodeType;
}

/**
 * Type guard that narrows an `inlineBlock` node to the variant whose
 * `item` belongs to a specific model.
 *
 * Mirrors {@link isBlockWithItemOfType} for inline blocks; supports both
 * the curried form (`isInlineBlockWithItemOfType(itemTypeId)`) and the
 * direct form (`isInlineBlockWithItemOfType(itemTypeId, node)`).
 *
 * For the literal `Id` to be preserved (and narrowing to work), the
 * `itemTypeId` argument must be typed as a literal — use `as const` on
 * pre-set ID constants.
 *
 * @example
 * ```ts
 * // Curried
 * const needle = findFirstNode(
 *   body.document,
 *   isInlineBlockWithItemOfType(CALLOUT_BLOCK_TYPE_ID),
 * );
 *
 * // Direct
 * if (isInlineBlockWithItemOfType(CALLOUT_BLOCK_TYPE_ID, node)) {
 *   node.item; // narrowed to the Callout item shape
 * }
 * ```
 */
export function isInlineBlockWithItemOfType<Id extends string>(
  itemTypeId: Id,
): <BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  node: Node<BlockItemType, InlineBlockItemType>,
) => node is InlineBlock<NarrowBlockItemByItemType<InlineBlockItemType, Id>>;
export function isInlineBlockWithItemOfType<
  Id extends string,
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(
  itemTypeId: Id,
  node: Node<BlockItemType, InlineBlockItemType>,
): node is InlineBlock<NarrowBlockItemByItemType<InlineBlockItemType, Id>>;
export function isInlineBlockWithItemOfType(
  itemTypeId: string,
  node?: Node,
): unknown {
  if (node === undefined) {
    return (n: Node): boolean =>
      n.type === inlineBlockNodeType &&
      itemHasItemTypeId((n as InlineBlock<unknown>).item, itemTypeId);
  }
  return (
    node.type === inlineBlockNodeType &&
    itemHasItemTypeId((node as InlineBlock<unknown>).item, itemTypeId)
  );
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
  BlockRecord extends CdaStructuredTextRecord,
  LinkRecord extends CdaStructuredTextRecord,
  InlineBlockRecord extends CdaStructuredTextRecord
>(
  obj: unknown,
): obj is CdaStructuredTextValue<BlockRecord, LinkRecord, InlineBlockRecord> {
  return Boolean(isObject(obj) && 'value' in obj && isDocument(obj.value));
}

/**
 * @deprecated Use isCdaStructuredTextValue instead
 */
export function isStructuredText<
  BlockRecord extends CdaStructuredTextRecord,
  LinkRecord extends CdaStructuredTextRecord,
  InlineBlockRecord extends CdaStructuredTextRecord
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
    isCdaStructuredTextValue(obj) && isDocument(obj.value)
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
