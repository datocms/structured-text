import {
  hasChildren,
  isSpan,
  isHeading,
  isList,
  isCode,
  isLink,
  isItemLink,
  isBlock,
  isInlineBlock,
  isParagraph,
  isDocument,
} from './guards';
import { Node, Document } from './types';

type StructuredTextDocumentOrNode<T> = T | Document;

export interface InspectOptions {
  /**
   * Custom formatter for block and inlineBlock nodes.
   * Receives the item value (either ID string or full object) and returns a string.
   * The returned string can be multi-line - the inspector will handle proper indentation.
   */
  blockFormatter?: (item: unknown) => string;
}

function extractNode<T>(input: StructuredTextDocumentOrNode<T>): T {
  return isDocument(input) ? ((input.document as unknown) as T) : (input as T);
}

export function inspect<T>(
  input: StructuredTextDocumentOrNode<T>,
  options: InspectOptions = {},
): string {
  const rootNode = extractNode(input);
  return buildTree((rootNode as unknown) as Node, '', true, options);
}

function buildTree(
  node: Node,
  prefix: string,
  isLast: boolean,
  options: InspectOptions,
): string {
  const connector = isLast ? '└' : '├';
  const nodeLabel = buildNodeLabel(node, options);

  // Handle multi-line content
  const lines = nodeLabel.split('\n');
  const firstLine = `${prefix}${connector} ${lines[0]}\n`;

  let multiLineContent = '';
  if (lines.length > 1) {
    const contentPrefix = prefix + (isLast ? '  ' : '│ ');
    for (let i = 1; i < lines.length; i++) {
      multiLineContent += `${contentPrefix}${lines[i]}\n`;
    }
  }

  if (!hasChildren(node)) {
    return firstLine + multiLineContent;
  }

  const children = node.children;
  const childPrefix = prefix + (isLast ? '  ' : '│ ');

  let result = firstLine + multiLineContent;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const isLastChild = i === children.length - 1;
    result += buildTree(child as Node, childPrefix, isLastChild, options);
  }

  return result;
}

function buildNodeLabel(node: Node, options: InspectOptions): string {
  const metaInfo: string[] = [];
  let content = '';

  if (isSpan(node)) {
    if (node.marks && node.marks.length > 0) {
      metaInfo.push(`marks: ${node.marks.join(', ')}`);
    }
    content = ` "${truncateText(node.value, 50)}"`;
  } else if (isCode(node)) {
    if (node.language) {
      metaInfo.push(`language: "${node.language}"`);
    }
    content = ` "${truncateText(node.code, 50)}"`;
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
  } else if (isBlock(node)) {
    if (options.blockFormatter) {
      const formattedContent = options.blockFormatter(node.item);
      content = ` ${formattedContent}`;
    } else {
      metaInfo.push(`item: "${node.item}"`);
    }
  } else if (isInlineBlock(node)) {
    if (options.blockFormatter) {
      const formattedContent = options.blockFormatter(node.item);
      content = ` ${formattedContent}`;
    } else {
      metaInfo.push(`item: "${node.item}"`);
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
