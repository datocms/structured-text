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
   * for the content (considering current indentation). The formatter can return:
   * - String: Always treated as single-line content (newlines will be stripped)
   * - TreeNode: Appended as a child node below the block
   * - TreeNode[]: Multiple child nodes appended below the block
   *
   * @param item - The item value (either ID string or full object)
   * @param maxLineWidth - Suggested maximum line width for content (accounting for indentation)
   * @returns String (single-line), TreeNode, or TreeNode[] representation
   *
   * @example
   * ```typescript
   * // Simple string formatting (single-line)
   * const formatter = (item: string, maxWidth: number) => `ID: ${item}`;
   *
   * // TreeNode formatting for complex structures
   * const formatter = (item: MyBlockType, maxWidth: number) => {
   *   if (typeof item === 'string') return `ID: ${item}`;
   *   return {
   *     label: item.title,
   *     nodes: [
   *       { label: `Type: ${item.type}` },
   *       { label: `ID: ${item.id}` }
   *     ]
   *   };
   * };
   * ```
   */
  blockFormatter?: (
    item: BlockItemType | InlineBlockItemType,
    maxLineWidth: number,
  ) => string | TreeNode | TreeNode[];

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
 * Skips the root node and returns its children directly.
 *
 * @template BlockItemType - Type of block items (defaults to BlockId)
 * @template InlineBlockItemType - Type of inline block items (defaults to BlockId)
 * @param input - The structured text document or node to inspect
 * @param options - Configuration options for the inspector
 * @returns A TreeNode representation of the structure (without root node)
 *
 * @example
 * ```typescript
 * const tree = inspectionTreeNodes(document, {
 *   blockFormatter: (item) => typeof item === 'string' ? item : item.title
 * });
 * console.log(formatAsTree(tree));
 * ```
 */
export function inspectionTreeNodes<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
>(
  input: StructuredTextDocumentOrNode<BlockItemType, InlineBlockItemType>,
  options: InspectOptions<BlockItemType, InlineBlockItemType> = {},
): TreeNode {
  const rootNode = extractNode(input);
  const rootTreeNode = buildTreeNode(rootNode, options);

  // Skip the root node and return a wrapper containing its children
  if (rootTreeNode.nodes && rootTreeNode.nodes.length > 0) {
    // If there's only one child, return it directly
    if (rootTreeNode.nodes.length === 1) {
      return rootTreeNode.nodes[0];
    }
    // If there are multiple children, create a wrapper node with empty label
    return {
      label: '',
      nodes: rootTreeNode.nodes,
    };
  }

  // Fallback: return empty wrapper if no children
  return { label: '' };
}

/**
 * Inspects and formats a structured text document or node as a tree string.
 * This is a convenience function that combines inspectionTreeNodes and formatAsTree.
 *
 * @template BlockItemType - Type of block items (defaults to BlockId)
 * @template InlineBlockItemType - Type of inline block items (defaults to BlockId)
 * @param input - The structured text document or node to inspect
 * @param options - Configuration options for the inspector
 * @returns A formatted tree string representation
 *
 * @example
 * ```typescript
 * const treeString = inspect(document, {
 *   blockFormatter: (item) => typeof item === 'string' ? item : item.title
 * });
 * console.log(treeString);
 * ```
 */
export function inspect<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  input: StructuredTextDocumentOrNode<BlockItemType, InlineBlockItemType>,
  options: InspectOptions<BlockItemType, InlineBlockItemType> = {},
): string {
  return formatAsTree(inspectionTreeNodes(input, options));
}

/**
 * Recursively builds a TreeNode representation of a node and its children.
 *
 * @template BlockItemType - Type of block items
 * @template InlineBlockItemType - Type of inline block items
 * @param node - The current node to process
 * @param options - Configuration options
 * @returns TreeNode representation of the node and its subtree
 */
function buildTreeNode<BlockItemType = BlockId, InlineBlockItemType = BlockId>(
  node: Node<BlockItemType, InlineBlockItemType>,
  options: InspectOptions<BlockItemType, InlineBlockItemType>,
): TreeNode {
  // Calculate available width for block content
  // Mimicking the old calculation: prefix + connector + space (typically around 6-8 characters for deeper nodes)
  const maxWidth = options.maxWidth ?? DEFAULT_CONFIG.MAX_WIDTH;
  const availableWidth = Math.max(20, maxWidth - 8);

  const nodeLabel = buildNodeLabel(node, options, availableWidth);

  // Create the TreeNode with the label
  const treeNode: TreeNode = {
    label: nodeLabel,
  };

  // Add children if the node has them
  if (nodeHasChildren(node)) {
    const children = node.children;
    if (children.length > 0) {
      treeNode.nodes = [];
      for (const child of children) {
        treeNode.nodes.push(
          buildTreeNode(
            child as Node<BlockItemType, InlineBlockItemType>,
            options,
          ),
        );
      }
    }
  }

  // Handle TreeNode returns from blockFormatter for block/inlineBlock nodes
  if ((isBlock(node) || isInlineBlock(node)) && options.blockFormatter) {
    const formattedContent = options.blockFormatter(node.item, availableWidth);

    if (typeof formattedContent !== 'string') {
      // Initialize nodes array if it doesn't exist
      if (!treeNode.nodes) {
        treeNode.nodes = [];
      }

      // Handle single TreeNode or array of TreeNodes
      if (Array.isArray(formattedContent)) {
        treeNode.nodes.push(...formattedContent);
      } else {
        treeNode.nodes.push(formattedContent);
      }
    }
  }

  return treeNode;
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

    // Handle string returns - always treat as single-line (strip newlines)
    if (typeof formattedContent === 'string') {
      const singleLineContent = formattedContent.replace(/\n/g, ' ').trim();
      content = ` ${singleLineContent}`;
    }
    // TreeNode/TreeNode[] returns will be handled in buildTreeNode function
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

export interface TreeNode {
  label: string;
  nodes?: TreeNode[];
}

export function formatAsTree(input: TreeNode | string): string {
  const root: TreeNode = typeof input === 'string' ? { label: input } : input;
  const out: string[] = [];

  function render(
    node: TreeNode,
    ancestorsHasNext: boolean[],
    isLast: boolean,
  ) {
    const label = node.label.trim();
    const children = node.nodes || [];

    // ⬇️ Skip wrapper nodes (no label but has children)
    if (!label && children.length > 0) {
      children.forEach((child, idx) => {
        const childIsLast = idx === children.length - 1;
        render(child, ancestorsHasNext, childIsLast);
      });
      return;
    }

    // Build ancestor prefix from booleans: true -> '│ ', false -> '  '
    const ancestorPrefix = ancestorsHasNext
      .map((h) => (h ? '│ ' : '  '))
      .join('');
    const branch = isLast ? '└' : '├';

    const lines = label.split('\n');

    // First line
    out.push(`${ancestorPrefix}${branch} ${lines[0]}`);

    // Continuations
    const contPrefix = ancestorPrefix + (isLast ? '  ' : '│ ');
    for (let i = 1; i < lines.length; i++) {
      out.push(`${contPrefix}${lines[i]}`);
    }

    // Recurse children
    children.forEach((child, idx) => {
      const childIsLast = idx === children.length - 1;
      render(child, [...ancestorsHasNext, !isLast], childIsLast);
    });
  }

  // Root as a top element
  render(root, [], true);

  return out.join('\n') + '\n';
}
