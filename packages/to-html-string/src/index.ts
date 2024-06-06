import {
  defaultMetaTransformer,
  render as genericHtmlRender,
  RenderMarkRule,
  renderNodeRule,
  renderMarkRule,
  TransformedMeta,
  TransformMetaFn,
} from 'datocms-structured-text-generic-html-renderer';
import {
  Adapter,
  isBlock,
  isInlineItem,
  isItemLink,
  isStructuredText,
  Node,
  Record as StructuredTextGraphQlResponseRecord,
  Document as StructuredTextDocument,
  RenderError,
  RenderResult,
  RenderRule,
  StructuredText as StructuredTextGraphQlResponse,
  TypesafeStructuredText as TypesafeStructuredTextGraphQlResponse,
} from 'datocms-structured-text-utils';
import vhtml from 'vhtml';

export { renderNodeRule, renderMarkRule, RenderError };

// deprecated export
export { renderNodeRule as renderRule };

export type {
  StructuredTextDocument,
  TypesafeStructuredTextGraphQlResponse,
  StructuredTextGraphQlResponse,
  StructuredTextGraphQlResponseRecord,
};

type AdapterReturn = string | null;

const vhtmlAdapter = (
  tagName: string | null,
  attrs?: Record<string, string> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...children: any[]
): AdapterReturn => {
  if (attrs) {
    delete attrs.key;
  }

  return vhtml(tagName as string, attrs, ...children);
};

export const defaultAdapter = {
  renderNode: vhtmlAdapter,
  renderFragment: (children: AdapterReturn[]): AdapterReturn =>
    vhtmlAdapter(null, null, children),
  renderText: (text: string): AdapterReturn => text,
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

export type RenderSettings<R extends StructuredTextGraphQlResponseRecord> = {
  /** A set of additional rules to convert the document to HTML **/
  customNodeRules?: RenderRule<H, T, F>[];
  /** A set of additional rules to convert the document to HTML **/
  customMarkRules?: RenderMarkRule<H, T, F>[];
  /** Function that converts 'link' and 'itemLink' `meta` into HTML attributes */
  metaTransformer?: TransformMetaFn;
  /** Fuction that converts an 'inlineItem' node into an HTML string **/
  renderInlineRecord?: (context: RenderInlineRecordContext<R>) => string | null;
  /** Fuction that converts an 'itemLink' node into an HTML string **/
  renderLinkToRecord?: (context: RenderRecordLinkContext<R>) => string | null;
  /** Fuction that converts a 'block' node into an HTML string **/
  renderBlock?: (context: RenderBlockContext<R>) => string | null;
  /** Fuction that converts a simple string text into an HTML string **/
  renderText?: T;
  /** React.createElement-like function to use to convert a node into an HTML string **/
  renderNode?: H;
  /** Function to use to generate a React.Fragment **/
  renderFragment?: F;
  /** @deprecated use `customNodeRules` instead **/
  customRules?: RenderRule<H, T, F>[];
};

export function render<R extends StructuredTextGraphQlResponseRecord>(
  /** The actual field value you get from DatoCMS **/
  structuredTextOrNode:
    | StructuredTextGraphQlResponse<R>
    | StructuredTextDocument
    | Node
    | null
    | undefined,
  /** Additional render settings **/
  settings?: RenderSettings<R>,
): ReturnType<F> | null {
  const renderInlineRecord = settings?.renderInlineRecord;
  const renderLinkToRecord = settings?.renderLinkToRecord;
  const renderBlock = settings?.renderBlock;
  const customRules = settings?.customNodeRules || settings?.customRules || [];

  const result = genericHtmlRender(structuredTextOrNode, {
    adapter: {
      renderText: settings?.renderText || defaultAdapter.renderText,
      renderNode: settings?.renderNode || defaultAdapter.renderNode,
      renderFragment: settings?.renderFragment || defaultAdapter.renderFragment,
    },
    customMarkRules: settings?.customMarkRules,
    metaTransformer: settings?.metaTransformer,
    customNodeRules: [
      ...customRules,
      renderNodeRule(isInlineItem, ({ node, adapter }) => {
        if (!renderInlineRecord) {
          throw new RenderError(
            `The Structured Text document contains an 'inlineItem' node, but no 'renderInlineRecord' option is specified!`,
            node,
          );
        }

        if (
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.links
        ) {
          throw new RenderError(
            `The document contains an 'inlineItem' node, but the passed value is not a Structured Text GraphQL response, or .links is not present!`,
            node,
          );
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
      renderNodeRule(isItemLink, ({ node, children, adapter }) => {
        if (!renderLinkToRecord) {
          throw new RenderError(
            `The Structured Text document contains an 'itemLink' node, but no 'renderLinkToRecord' option is specified!`,
            node,
          );
        }

        if (
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.links
        ) {
          throw new RenderError(
            `The document contains an 'itemLink' node, but the passed value is not a Structured Text GraphQL response, or .links is not present!`,
            node,
          );
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
        if (!renderBlock) {
          throw new RenderError(
            `The Structured Text document contains a 'block' node, but no 'renderBlock' option is specified!`,
            node,
          );
        }

        if (
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.blocks
        ) {
          throw new RenderError(
            `The document contains a 'block' node, but the passed value is not a Structured Text GraphQL response, or .blocks is not present!`,
            node,
          );
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
    ],
  });

  return result || null;
}
