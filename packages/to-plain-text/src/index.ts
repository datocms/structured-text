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
  Document as StructuredTextDocument,
  isBlock,
  isInlineBlock,
  isInlineItem,
  isItemLink,
  isStructuredText,
  Node,
  Record as StructuredTextGraphQlResponseRecord,
  RenderError,
  RenderResult,
  RenderRule,
  StructuredText as StructuredTextGraphQlResponse,
  TypesafeStructuredText as TypesafeStructuredTextGraphQlResponse,
} from 'datocms-structured-text-utils';

export { renderNodeRule, renderMarkRule, RenderError };
// deprecated export
export { renderNodeRule as renderRule };
export type {
  StructuredTextDocument,
  TypesafeStructuredTextGraphQlResponse,
  StructuredTextGraphQlResponse,
  StructuredTextGraphQlResponseRecord,
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

export const defaultAdapter = {
  renderNode: (
    tagName: string,
    attrs: Record<string, string>,
    ...children: Array<undefined | string | string[]>
  ): string => {
    // inline nodes
    if (['a', 'em', 'u', 'del', 'mark', 'code', 'strong'].includes(tagName)) {
      return renderFragment(children);
    }

    // block nodes
    return `${renderFragment(children)}\n`;
  },
  renderFragment,
  renderText: (text: string): string => text,
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
  /** A set of additional rules to convert the document to a string **/
  customNodeRules?: RenderRule<H, T, F>[];
  /** A set of additional rules to convert marks to HTML **/
  customMarkRules?: RenderMarkRule<H, T, F>[];
  /** Function that converts 'link' and 'itemLink' `meta` into HTML attributes */
  metaTransformer?: TransformMetaFn;
  /** Fuction that converts an 'inlineItem' node into a string **/
  renderInlineRecord?: (
    context: RenderInlineRecordContext<LinkRecord>,
  ) => string | null | undefined;
  /** Fuction that converts an 'itemLink' node into a string **/
  renderLinkToRecord?: (
    context: RenderRecordLinkContext<LinkRecord>,
  ) => string | null | undefined;
  /** Fuction that converts a 'block' node into a string **/
  renderBlock?: (
    context: RenderBlockContext<BlockRecord>,
  ) => string | null | undefined;
  /** Fuction that converts an 'inlineBlock' node into a string **/
  renderInlineBlock?: (
    context: RenderBlockContext<InlineBlockRecord>,
  ) => string | null | undefined;
  /** Fuction that converts a simple string text into a string **/
  renderText?: T;
  /** React.createElement-like function to use to convert a node into a string **/
  renderNode?: H;
  /** Function to use to generate a React.Fragment **/
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
      ...customRules,
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

        return renderLinkToRecord({
          record: item,
          adapter,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          children: (children as any) as ReturnType<F>,
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

  return result ? result.trim() : null;
}
