import {
  defaultMetaTransformer,
  render as genericHtmlRender,
  renderRule,
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
} from 'datocms-structured-text-utils';
import hyperscript from 'hyperscript';

export {
  renderRule,
  RenderError,
  StructuredTextGraphQlResponse,
  StructuredTextGraphQlResponseRecord,
  StructuredTextDocument,
};

type AdapterReturn = Element[] | Element | string | null;

const hyperscriptAdapter = (
  tagName: string,
  attrs?: Record<string, string> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...children: any[]
): AdapterReturn => {
  if (attrs) {
    delete attrs.key;
  }

  return hyperscript(tagName, attrs || undefined, ...children);
};

export const defaultAdapter = {
  renderNode: hyperscriptAdapter,
  renderFragment: (children: AdapterReturn[]): Element[] =>
    children as Element[],
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
  customRules?: RenderRule<H, T, F>[];
  /** Function that converts 'link' and 'itemLink' `meta` into HTML attributes */
  metaTransformer?: TransformMetaFn;
  /** Fuction that converts an 'inlineItem' node into an HTML string **/
  renderInlineRecord?: (context: RenderInlineRecordContext<R>) => AdapterReturn;
  /** Fuction that converts an 'itemLink' node into an HTML string **/
  renderLinkToRecord?: (context: RenderRecordLinkContext<R>) => AdapterReturn;
  /** Fuction that converts a 'block' node into an HTML string **/
  renderBlock?: (context: RenderBlockContext<R>) => AdapterReturn;
  /** Fuction that converts a simple string text into an HTML string **/
  renderText?: T;
  /** React.createElement-like function to use to convert a node into an HTML string **/
  renderNode?: H;
  /** Function to use to generate a React.Fragment **/
  renderFragment?: F;
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
  const customRules = settings?.customRules || [];

  const result = genericHtmlRender(
    {
      renderText: settings?.renderText || defaultAdapter.renderText,
      renderNode: settings?.renderNode || defaultAdapter.renderNode,
      renderFragment: settings?.renderFragment || defaultAdapter.renderFragment,
    },
    structuredTextOrNode,
    [
      ...customRules,
      renderRule(isInlineItem, ({ node, adapter }) => {
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
            `The document contains an 'itemLink' node, but the passed value is not a Structured Text GraphQL response, or .links is not present!`,
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
      renderRule(isItemLink, ({ node, children, adapter }) => {
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
      renderRule(isBlock, ({ node, adapter }) => {
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
            `The document contains an 'block' node, but the passed value is not a Structured Text GraphQL response, or .blocks is not present!`,
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
    settings?.metaTransformer,
  );

  return result as ReturnType<F> | null;
}
