import {
  hasChildren,
  isBlock,
  isCode,
  isDocument,
  isHeading,
  isInlineBlock,
  isItemLink,
  isLink,
  isList,
  isParagraph,
  isSpan,
} from './guards';
import { BlockId, Document, Node, WithChildrenNode } from './types';

/**
 * Represents either a Node/Root or a complete DAST Document.
 * This union type ensures type safety when working with either format.
 *
 * @template BlockItemType - Type of block items (defaults to BlockId string)
 * @template InlineBlockItemType - Type of inline block items (defaults to BlockId string)
 */
type StructuredTextDocumentOrNode<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
> =
  | Node<BlockItemType, InlineBlockItemType>
  | Document<BlockItemType, InlineBlockItemType>;

/**
 * Tree formatting constants for consistent visualization.
 */
const TREE_SYMBOLS = {
  /** Connector for last child: └ */
  LAST_CHILD: '└',
  /** Connector for middle child: ├ */
  MIDDLE_CHILD: '├',
  /** Vertical line for continuation: │ */
  VERTICAL_LINE: '│',
  /** Horizontal spacing */
  SPACING: ' ',
} as const;

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG = {
  /** Maximum width for inspect output */
  MAX_WIDTH: 80,
} as const;

/**
 * Configuration options for the structured text inspector.
 *
 * @template BlockItemType - Type of block items (defaults to BlockId)
 * @template InlineBlockItemType - Type of inline block items (defaults to BlockId)
 */
export interface InspectOptions<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
> {
  /**
   * Custom formatter for block and inlineBlock nodes.
   *
   * This function receives the raw item value and the suggested maximum line width
   * for the content (considering current indentation). The formatter can use this
   * information to decide whether to use single-line or multi-line output.
   *
   * @param item - The item value (either ID string or full object)
   * @param maxLineWidth - Suggested maximum line width for content (accounting for indentation)
   * @returns A string representation (can be multi-line)
   *
   * @example
   * ```typescript
   * // Simple ID formatting
   * const formatter = (item: string, maxWidth: number) => `ID: ${item}`;
   *
   * // Responsive formatting based on available width
   * const formatter = (item: MyBlockType, maxWidth: number) => {
   *   if (typeof item === 'string') return `ID: ${item}`;
   *   return [
   *     `${item.title} (${item.id})`,
   *     `Type: ${item.type}`,
   *     `Created: ${item.createdAt}`
   *   ].join('\n');
   * };
   * ```
   */
  blockFormatter?: (
    item: BlockItemType | InlineBlockItemType,
    maxLineWidth: number,
  ) => string;

  /**
   * Maximum width for the entire inspect output.
   * @default 80
   */
  maxWidth?: number;
}

/**
 * Type guard to check if a node has children and provides proper type narrowing.
 * This replaces the need for unsafe type assertions when accessing children.
 *
 * @param node - The node to check
 * @returns True if the node has children, with proper type narrowing
 */
function nodeHasChildren<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(
  node: Node<BlockItemType, InlineBlockItemType>,
): node is WithChildrenNode<BlockItemType, InlineBlockItemType> {
  return hasChildren(node);
}

/**
 * Default block formatter that displays items in a structured format.
 *
 * @template BlockItemType - Type of block items
 * @template InlineBlockItemType - Type of inline block items
 * @param item - The item to format
 * @param maxLineWidth - Suggested maximum line width (unused in default formatter)
 * @returns Formatted string representation
 */
function defaultBlockFormatter<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(item: BlockItemType | InlineBlockItemType): string {
  return `(item: ${JSON.stringify(item)})`;
}

/**
 * Safely extracts the root node from either a Document or Node input.
 *
 * @template BlockItemType - Type of block items
 * @template InlineBlockItemType - Type of inline block items
 * @param input - Either a Document or Node
 * @returns The root node
 */
function extractNode<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  input: StructuredTextDocumentOrNode<BlockItemType, InlineBlockItemType>,
): Node<BlockItemType, InlineBlockItemType> {
  return isDocument(input)
    ? ((input.document as unknown) as Node<BlockItemType, InlineBlockItemType>)
    : (input as Node<BlockItemType, InlineBlockItemType>);
}

/**
 * Inspects and renders a structured text document or node as a tree structure.
 *
 * @template BlockItemType - Type of block items (defaults to BlockId)
 * @template InlineBlockItemType - Type of inline block items (defaults to BlockId)
 * @param input - The structured text document or node to inspect
 * @param options - Configuration options for the inspector
 * @returns A string representation of the tree structure
 *
 * @example
 * ```typescript
 * const tree = inspect(document, {
 *   blockFormatter: (item) => typeof item === 'string' ? item : item.title
 * });
 * console.log(tree);
 * ```
 */
export function inspect<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  input: StructuredTextDocumentOrNode<BlockItemType, InlineBlockItemType>,
  options: InspectOptions<BlockItemType, InlineBlockItemType> = {},
): string {
  const rootNode = extractNode(input);
  return buildTree(rootNode, '', true, options);
}

/**
 * Recursively builds the tree representation of a node and its children.
 *
 * @template BlockItemType - Type of block items
 * @template InlineBlockItemType - Type of inline block items
 * @param node - The current node to process
 * @param prefix - The prefix string for tree formatting
 * @param isLast - Whether this is the last child at its level
 * @param options - Configuration options
 * @returns String representation of the node and its subtree
 */
function buildTree<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  node: Node<BlockItemType, InlineBlockItemType>,
  prefix: string,
  isLast: boolean,
  options: InspectOptions<BlockItemType, InlineBlockItemType>,
): string {
  const connector = isLast
    ? TREE_SYMBOLS.LAST_CHILD
    : TREE_SYMBOLS.MIDDLE_CHILD;

  // Calculate available width for block content
  // Accounts for current prefix + connector + space
  const currentIndentWidth = prefix.length + connector.length + 1;
  const maxWidth = options.maxWidth ?? DEFAULT_CONFIG.MAX_WIDTH;
  const availableWidth = Math.max(20, maxWidth - currentIndentWidth);

  const nodeLabel = buildNodeLabel(node, options, availableWidth);

  // Check if nodeLabel starts with newline (indicates multi-line block content)
  const isMultiLineBlock = nodeLabel.startsWith('\n');

  if (isMultiLineBlock) {
    // Remove the leading newline and split into lines
    const blockContent = nodeLabel.substring(1);
    const lines = blockContent.split('\n').filter((line) => line.trim() !== '');

    // First line: just the node type without content
    const nodeType =
      isBlock(node) || isInlineBlock(node) ? node.type : node.type;
    const firstLine = `${prefix}${connector} ${nodeType}\n`;

    let result = firstLine;

    // Add block content lines with proper indentation
    const hasActualChildren = nodeHasChildren(node);
    const contentPrefix =
      prefix +
      (isLast && !hasActualChildren
        ? TREE_SYMBOLS.SPACING.repeat(2)
        : TREE_SYMBOLS.VERTICAL_LINE + TREE_SYMBOLS.SPACING);

    for (const line of lines) {
      if (line.trim() !== '') {
        result += `${contentPrefix}${line}\n`;
      }
    }

    // Handle actual node children
    if (hasActualChildren && nodeHasChildren(node)) {
      const children = node.children;
      const childPrefix =
        prefix +
        (isLast
          ? TREE_SYMBOLS.SPACING.repeat(2)
          : TREE_SYMBOLS.VERTICAL_LINE + TREE_SYMBOLS.SPACING);

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const isLastChild = i === children.length - 1;
        result += buildTree(child, childPrefix, isLastChild, options);
      }
    }

    return result;
  } else {
    // Single line content - use existing logic
    const lines = nodeLabel.split('\n').filter((line) => line.trim() !== '');
    const firstLine = `${prefix}${connector} ${lines[0]}\n`;

    // Determine if we have additional content lines or actual children
    const hasAdditionalContentLines = lines.length > 1;
    const hasActualChildren = nodeHasChildren(node);

    let result = firstLine;

    // Handle multi-line formatter content as continuation lines (not child nodes)
    if (hasAdditionalContentLines) {
      const contentPrefix =
        prefix +
        (isLast && !hasActualChildren
          ? TREE_SYMBOLS.SPACING.repeat(2)
          : TREE_SYMBOLS.VERTICAL_LINE + TREE_SYMBOLS.SPACING);

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() !== '') {
          result += `${contentPrefix}${line}\n`;
        }
      }
    }

    // Handle actual node children with proper type safety
    if (hasActualChildren && nodeHasChildren(node)) {
      const children = node.children;
      const childPrefix =
        prefix +
        (isLast
          ? TREE_SYMBOLS.SPACING.repeat(2)
          : TREE_SYMBOLS.VERTICAL_LINE + TREE_SYMBOLS.SPACING);

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const isLastChild = i === children.length - 1;
        result += buildTree(child, childPrefix, isLastChild, options);
      }
    }

    return result;
  }
}

/**
 * Builds a descriptive label for a node based on its type and properties.
 *
 * @template BlockItemType - Type of block items
 * @template InlineBlockItemType - Type of inline block items
 * @param node - The node to create a label for
 * @param options - Configuration options including block formatter
 * @param availableWidth - Available width for content formatting
 * @returns A formatted string label for the node
 */
function buildNodeLabel<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  node: Node<BlockItemType, InlineBlockItemType>,
  options: InspectOptions<BlockItemType, InlineBlockItemType>,
  availableWidth: number,
): string {
  const metaInfo: string[] = [];
  let content = '';

  if (isSpan(node)) {
    if (node.marks && node.marks.length > 0) {
      metaInfo.push(`marks: ${node.marks.join(', ')}`);
    }
    content = ` "${truncateText(node.value, availableWidth)}"`;
  } else if (isCode(node)) {
    if (node.language) {
      metaInfo.push(`language: "${node.language}"`);
    }
    content = ` "${truncateText(node.code, availableWidth)}"`;
  } else if (isHeading(node)) {
    metaInfo.push(`level: ${node.level}`);
  } else if (isList(node)) {
    metaInfo.push(`style: ${node.style}`);
  } else if (isLink(node)) {
    metaInfo.push(`url: "${node.url}"`);
    if (node.meta && node.meta.length > 0) {
      const metaEntries = node.meta
        .map((m) => `${m.id}="${m.value}"`)
        .join(', ');
      metaInfo.push(`meta: {${metaEntries}}`);
    }
  } else if (isItemLink(node)) {
    metaInfo.push(`item: "${node.item}"`);
    if (node.meta && node.meta.length > 0) {
      const metaEntries = node.meta
        .map((m) => `${m.id}="${m.value}"`)
        .join(', ');
      metaInfo.push(`meta: {${metaEntries}}`);
    }
  } else if (isBlock(node) || isInlineBlock(node)) {
    const formatter = options.blockFormatter || defaultBlockFormatter;
    const formattedContent = formatter(node.item, availableWidth);
    // For single line, display inline; for multi-line, display below
    const lines = formattedContent
      .split('\n')
      .filter((line) => line.trim() !== '');
    if (lines.length === 1) {
      content = ` ${formattedContent}`;
    } else {
      // Multi-line content will be handled in buildTree function
      content = `\n${formattedContent}`;
    }
  } else if (isParagraph(node)) {
    if (node.style) {
      metaInfo.push(`style: "${node.style}"`);
    }
  }

  const metaString = metaInfo.length > 0 ? ` (${metaInfo.join(', ')})` : '';
  return `${node.type}${metaString}${content}`;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}
