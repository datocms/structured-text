import {
  render as genericHtmlRender,
  renderRule,
} from 'datocms-structured-text-generic-html-renderer';
import {
  Adapter,
  isBlock,
  isInlineItem,
  isItemLink,
  isStructuredText,
  Node,
  Record as StructuredTextGraphQlResponseRecord,
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

  return hyperscript(tagName, attrs, ...children);
};

export const defaultAdapter = {
  renderNode: hyperscriptAdapter,
  renderMark: hyperscriptAdapter,
  renderFragment: (children: AdapterReturn[]): Element[] =>
    children as Element[],
  renderText: (text: string): AdapterReturn => text,
};

type H = typeof defaultAdapter.renderNode;
type M = typeof defaultAdapter.renderMark;
type T = typeof defaultAdapter.renderText;
type F = typeof defaultAdapter.renderFragment;

type RenderInlineRecordContext<
  R extends StructuredTextGraphQlResponseRecord
> = {
  record: R;
  adapter: Adapter<H, T, M, F>;
};

type RenderRecordLinkContext<R extends StructuredTextGraphQlResponseRecord> = {
  record: R;
  adapter: Adapter<H, T, M, F>;
  children: RenderResult<H, T, M, F>;
};

type RenderBlockContext<R extends StructuredTextGraphQlResponseRecord> = {
  record: R;
  adapter: Adapter<H, T, M, F>;
};

export type RenderSettings<R extends StructuredTextGraphQlResponseRecord> = {
  /** A set of additional rules to convert the document to HTML **/
  customRules?: RenderRule<H, T, M, F>[];
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
  /** React.createElement-like function to use to convert a mark into an HTML string **/
  renderMark?: M;
  /** Function to use to generate a React.Fragment **/
  renderFragment?: F;
};

export function render<R extends StructuredTextGraphQlResponseRecord>(
  /** The actual field value you get from DatoCMS **/
  structuredTextOrNode:
    | StructuredTextGraphQlResponse<R>
    | Node
    | null
    | undefined,
  /** Additional render settings **/
  settings?: RenderSettings<R>,
): ReturnType<F> | null {
  const mergedSettings: RenderSettings<R> = {
    renderText: defaultAdapter.renderText,
    renderNode: defaultAdapter.renderNode,
    renderMark: defaultAdapter.renderMark,
    renderFragment: defaultAdapter.renderFragment,
    customRules: [],
    ...settings,
  };

  const {
    renderInlineRecord,
    renderLinkToRecord,
    renderBlock,
    customRules,
  } = mergedSettings;

  const result = genericHtmlRender(
    {
      renderText: mergedSettings.renderText,
      renderNode: mergedSettings.renderNode,
      renderMark: mergedSettings.renderMark,
      renderFragment: mergedSettings.renderFragment,
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

        const structuredText = structuredTextOrNode;

        const item = structuredText.links.find((item) => item.id === node.item);

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

        const structuredText = structuredTextOrNode;

        const item = structuredText.links.find((item) => item.id === node.item);

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

        const structuredText = structuredTextOrNode;

        const item = structuredText.blocks.find(
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
  );

  return result as ReturnType<F> | null;
}
