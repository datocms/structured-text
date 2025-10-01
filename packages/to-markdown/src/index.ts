import {
  defaultMetaTransformer,
  render as genericHtmlRender,
  RenderMarkRule,
  renderMarkRule,
  renderNodeRule,
  TransformedMeta,
  TransformMetaFn,
} from 'datocms-structured-text-generic-html-renderer';
import {
  Adapter,
  CdaStructuredTextRecord,
  CdaStructuredTextValue,
  Document as StructuredTextDocument,
  isBlock,
  isBlockquote,
  isCode,
  isHeading,
  isInlineBlock,
  isInlineItem,
  isItemLink,
  isList,
  isListItem,
  isParagraph,
  isRoot,
  isStructuredText,
  isThematicBreak,
  Node,
  Record as StructuredTextGraphQlResponseRecord,
  RenderError,
  RenderResult,
  RenderRule,
  StructuredText as StructuredTextGraphQlResponse,
  TypesafeCdaStructuredTextValue,
  TypesafeStructuredText as TypesafeStructuredTextGraphQlResponse,
} from 'datocms-structured-text-utils';

export { renderNodeRule, renderMarkRule, RenderError };

export type {
  StructuredTextDocument,
  CdaStructuredTextValue,
  TypesafeCdaStructuredTextValue,
  CdaStructuredTextRecord,
};

const renderFragment = (
  children: Array<undefined | string | string[]> | undefined,
): string => {
  if (!children) {
    return '';
  }

  const sanitizedChildren = children
    .reduce<Array<undefined | string>>(
      (acc, child) =>
        Array.isArray(child) ? [...acc, ...child] : [...acc, child],
      [],
    )
    .filter<string>((x): x is string => !!x);

  if (!sanitizedChildren || sanitizedChildren.length === 0) {
    return '';
  }

  return sanitizedChildren.join('');
};

const escapeMarkdown = (text: string): string => {
  // Escape markdown special characters that could be interpreted as formatting
  // Don't escape . and ! as they're commonly used in regular text
  return text.replace(/([\\`*_{}[\]()#+|<>])/g, '\\$1');
};

export const defaultAdapter = {
  renderNode: (
    tagName: string,
    attrs: Record<string, string>,
    ...children: Array<undefined | string | string[]>
  ): string => {
    const content = renderFragment(children);

    switch (tagName) {
      case 'br':
        return '\n';
      case 'p':
        return `${content}\n\n`;
      case 'h1':
        return `# ${content}\n\n`;
      case 'h2':
        return `## ${content}\n\n`;
      case 'h3':
        return `### ${content}\n\n`;
      case 'h4':
        return `#### ${content}\n\n`;
      case 'h5':
        return `##### ${content}\n\n`;
      case 'h6':
        return `###### ${content}\n\n`;
      case 'ul':
        return `${content}\n`;
      case 'ol':
        return `${content}\n`;
      case 'li':
        // Check if parent is ol or ul (we handle indentation in list rules)
        return `${content}\n`;
      case 'blockquote':
        return (
          content
            .split('\n')
            .map((line) => {
              const trimmedLine = line.trim();
              return trimmedLine ? `> ${trimmedLine}` : '>';
            })
            .join('\n') + '\n\n'
        );
      case 'pre':
        return `${content}\n`;
      case 'hr':
        return '---\n\n';
      case 'a': {
        const href = attrs.href || '';
        return `[${content}](${href})`;
      }
      // Inline marks
      case 'strong':
        return `**${content}**`;
      case 'em':
        return `*${content}*`;
      case 'code':
        return `\`${content}\``;
      case 'u':
        // No native markdown for underline, use HTML
        return `<u>${content}</u>`;
      case 's':
        return `~~${content}~~`;
      case 'mark':
        // Use == for highlight (extended markdown)
        return `==${content}==`;
      case 'footer':
        // For blockquote attribution
        return `— ${content}`;
      default:
        return content;
    }
  },
  renderFragment,
  renderText: (text: string): string => escapeMarkdown(text),
};

type H = typeof defaultAdapter.renderNode;
type T = typeof defaultAdapter.renderText;
type F = typeof defaultAdapter.renderFragment;

type RenderInlineRecordContext<
  R extends StructuredTextGraphQlResponseRecord
> = {
  record: R;
  adapter: Adapter<H, T, F>;
};

type RenderRecordLinkContext<R extends StructuredTextGraphQlResponseRecord> = {
  record: R;
  adapter: Adapter<H, T, F>;
  children: RenderResult<H, T, F>;
  transformedMeta: TransformedMeta;
};

type RenderBlockContext<R extends StructuredTextGraphQlResponseRecord> = {
  record: R;
  adapter: Adapter<H, T, F>;
};

export type RenderSettings<
  BlockRecord extends StructuredTextGraphQlResponseRecord = StructuredTextGraphQlResponseRecord,
  LinkRecord extends StructuredTextGraphQlResponseRecord = StructuredTextGraphQlResponseRecord,
  InlineBlockRecord extends StructuredTextGraphQlResponseRecord = StructuredTextGraphQlResponseRecord
> = {
  /** A set of additional rules to convert the document to Markdown **/
  customNodeRules?: RenderRule<H, T, F>[];
  /** A set of additional rules to convert marks to Markdown **/
  customMarkRules?: RenderMarkRule<H, T, F>[];
  /** Function that converts 'link' and 'itemLink' `meta` into attributes */
  metaTransformer?: TransformMetaFn;
  /** Fuction that converts an 'inlineItem' node into a Markdown string **/
  renderInlineRecord?: (
    context: RenderInlineRecordContext<LinkRecord>,
  ) => string | null | undefined;
  /** Fuction that converts an 'itemLink' node into a Markdown string **/
  renderLinkToRecord?: (
    context: RenderRecordLinkContext<LinkRecord>,
  ) => string | null | undefined;
  /** Fuction that converts a 'block' node into a Markdown string **/
  renderBlock?: (
    context: RenderBlockContext<BlockRecord>,
  ) => string | null | undefined;
  /** Fuction that converts an 'inlineBlock' node into a Markdown string **/
  renderInlineBlock?: (
    context: RenderBlockContext<InlineBlockRecord>,
  ) => string | null | undefined;
  /** Fuction that converts a simple string text into a Markdown string **/
  renderText?: T;
  /** Function to use to convert a node into a Markdown string **/
  renderNode?: H;
  /** Function to use to generate a fragment **/
  renderFragment?: F;
  /** @deprecated use `customNodeRules` instead **/
  customRules?: RenderRule<H, T, F>[];
};

export function render<
  BlockRecord extends StructuredTextGraphQlResponseRecord = StructuredTextGraphQlResponseRecord,
  LinkRecord extends StructuredTextGraphQlResponseRecord = StructuredTextGraphQlResponseRecord,
  InlineBlockRecord extends StructuredTextGraphQlResponseRecord = StructuredTextGraphQlResponseRecord
>(
  /** The actual field value you get from DatoCMS **/
  structuredTextOrNode:
    | StructuredTextGraphQlResponse<BlockRecord, LinkRecord, InlineBlockRecord>
    | StructuredTextDocument
    | Node
    | null
    | undefined,
  /** Additional render settings **/
  settings?: RenderSettings<BlockRecord, LinkRecord, InlineBlockRecord>,
): ReturnType<F> | null {
  const renderInlineRecord = settings?.renderInlineRecord;
  const renderLinkToRecord = settings?.renderLinkToRecord;
  const renderBlock = settings?.renderBlock;
  const renderInlineBlock = settings?.renderInlineBlock;
  const customRules = settings?.customNodeRules || settings?.customRules || [];
  const renderFragment =
    settings?.renderFragment || defaultAdapter.renderFragment;
  const renderText = settings?.renderText || defaultAdapter.renderText;
  const renderNode = settings?.renderNode || defaultAdapter.renderNode;

  const result = genericHtmlRender(structuredTextOrNode, {
    adapter: {
      renderText,
      renderNode,
      renderFragment,
    },
    metaTransformer: settings?.metaTransformer,
    customMarkRules: settings?.customMarkRules,
    customNodeRules: [
      // Custom rules first so they take precedence
      ...customRules,
      // Override default rules for markdown-specific rendering
      renderNodeRule(isRoot, ({ adapter, children }) => {
        return adapter.renderFragment(children);
      }),
      renderNodeRule(isParagraph, ({ adapter, children }) => {
        return adapter.renderNode('p', {}, children);
      }),
      renderNodeRule(isHeading, ({ adapter, node, children }) => {
        return adapter.renderNode(`h${node.level}`, {}, children);
      }),
      renderNodeRule(isList, ({ adapter, node, children }) => {
        const result = adapter.renderNode(
          node.style === 'bulleted' ? 'ul' : 'ol',
          {},
          children,
        );
        return result;
      }),
      renderNodeRule(isListItem, ({ adapter, children, ancestors }) => {
        const listAncestors = ancestors.filter((ancestor) =>
          isList(ancestor),
        ) as Array<Node & { style: 'bulleted' | 'numbered' }>;
        const parentList = listAncestors[0];
        const listDepth = listAncestors.length;
        const indent = '  '.repeat(Math.max(0, listDepth - 1));
        const marker = parentList?.style === 'numbered' ? '1. ' : '- ';
        const content = adapter.renderFragment(children);
        // Remove trailing newlines from content and add proper formatting
        const trimmedContent = (content ?? '').replace(/\n+$/, '');
        const lines = trimmedContent.split('\n');

        if (lines.length === 0) {
          return `${indent}${marker}\n`;
        }

        const [rawFirstLine, ...rest] = lines;
        const firstLine = rawFirstLine.trimStart();
        const subsequentIndent = `${indent}  `;
        const formattedRest = rest
          .map((line: string) => {
            if (!line) {
              return subsequentIndent;
            }

            if (/^\s{2,}/.test(line)) {
              return line;
            }

            return `${subsequentIndent}${line.trimStart()}`;
          })
          .join('\n');

        const formattedContent =
          formattedRest && formattedRest.length > 0
            ? `${firstLine}\n${formattedRest}`
            : firstLine;

        return `${indent}${marker}${formattedContent}\n`;
      }),
      renderNodeRule(isBlockquote, ({ adapter, node, children }) => {
        const childrenArray = Array.isArray(children) ? children : [children];
        if (node.attribution) {
          childrenArray.push(
            adapter.renderNode('footer', {}, node.attribution),
          );
        }
        return adapter.renderNode('blockquote', {}, childrenArray);
      }),
      renderNodeRule(isCode, ({ node }) => {
        const language = node.language || '';
        return `\`\`\`${language}\n${node.code}\n\`\`\`\n\n`;
      }),
      renderNodeRule(isThematicBreak, ({ adapter }) => {
        return adapter.renderNode('hr', {});
      }),
      renderNodeRule(isInlineItem, ({ node, adapter }) => {
        if (
          !renderInlineRecord ||
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.links
        ) {
          return null;
        }

        const item = structuredTextOrNode.links.find(
          (item) => item.id === node.item,
        );

        if (!item) {
          throw new RenderError(
            `The Structured Text document contains an 'inlineItem' node, but cannot find a record with ID ${node.item} inside .links!`,
            node,
          );
        }

        return renderInlineRecord({ record: item, adapter });
      }),
      renderNodeRule(isItemLink, ({ node, adapter, children }) => {
        if (
          !renderLinkToRecord ||
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.links
        ) {
          return renderFragment(children);
        }

        const item = structuredTextOrNode.links.find(
          (item) => item.id === node.item,
        );

        if (!item) {
          throw new RenderError(
            `The Structured Text document contains an 'itemLink' node, but cannot find a record with ID ${node.item} inside .links!`,
            node,
          );
        }

        const renderedChildren = adapter.renderFragment(children);

        return renderLinkToRecord({
          record: item,
          adapter,
          children: renderedChildren,
          transformedMeta: node.meta
            ? (settings?.metaTransformer || defaultMetaTransformer)({
                node,
                meta: node.meta,
              })
            : null,
        });
      }),
      renderNodeRule(isBlock, ({ node, adapter }) => {
        if (
          !renderBlock ||
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.blocks
        ) {
          return null;
        }

        const item = structuredTextOrNode.blocks.find(
          (item) => item.id === node.item,
        );

        if (!item) {
          throw new RenderError(
            `The Structured Text document contains a 'block' node, but cannot find a record with ID ${node.item} inside .blocks!`,
            node,
          );
        }

        return renderBlock({ record: item, adapter });
      }),
      renderNodeRule(isInlineBlock, ({ node, adapter }) => {
        if (
          !renderInlineBlock ||
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.inlineBlocks
        ) {
          return null;
        }

        const item = structuredTextOrNode.inlineBlocks.find(
          (item) => item.id === node.item,
        );

        if (!item) {
          throw new RenderError(
            `The Structured Text document contains an 'inlineBlock' node, but cannot find a record with ID ${node.item} inside .inlineBlocks!`,
            node,
          );
        }

        return renderInlineBlock({ record: item, adapter });
      }),
    ],
  });

  if (!result || result.trim() === '') {
    return null;
  }
  return result.trim();
}

// ============================================================================
// DEPRECATED EXPORTS - kept for backward compatibility
// ============================================================================

/**
 * @deprecated Use renderNodeRule instead
 */
export { renderNodeRule as renderRule };

/** @deprecated Use CdaStructuredTextValue */
export type { StructuredTextGraphQlResponse };
/** @deprecated Use TypesafeCdaStructuredTextValue */
export type { TypesafeStructuredTextGraphQlResponse };
/** @deprecated Use CdaStructuredTextRecord */
export type { StructuredTextGraphQlResponseRecord };
