import {
  render as genericHtmlRender,
  renderRule,
} from 'datocms-structured-text-generic-html-renderer';
import {
  Adapter,
  isBlock,
  isInlineItem,
  isItemLink,
  Record as StructuredTextGraphQlResponseRecord,
  RenderError,
  RenderResult,
  RenderRule,
  StructuredText as StructuredTextGraphQlResponse,
} from 'datocms-structured-text-utils';
import vhtml from 'vhtml';

export {
  renderRule,
  RenderError,
  StructuredTextGraphQlResponse,
  StructuredTextGraphQlResponseRecord,
};

type AdapterReturn = string | null;

const vhtmlAdapter = (
  tagName: string,
  attrs?: Record<string, string> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...children: any[]
): AdapterReturn => {
  if (attrs) {
    delete attrs.key;
  }

  return vhtml(tagName, attrs, ...children);
};

export const defaultAdapter = {
  renderNode: vhtmlAdapter,
  renderMark: vhtmlAdapter,
  renderFragment: (children: AdapterReturn[]): string => children.join(''),
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

export type StructuredTextPropTypes<
  R extends StructuredTextGraphQlResponseRecord
> = {
  /** The actual field value you get from DatoCMS **/
  structuredText: StructuredTextGraphQlResponse<R> | null | undefined;
  /** A set of additional rules to convert the document to HTML **/
  customRules?: RenderRule<H, T, M, F>[];
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
  /** React.createElement-like function to use to convert a mark into an HTML string **/
  renderMark?: M;
  /** Function to use to generate a React.Fragment **/
  renderFragment?: F;
};

export function render<R extends StructuredTextGraphQlResponseRecord>({
  structuredText,
  renderInlineRecord,
  renderLinkToRecord,
  renderBlock,
  renderText,
  renderNode,
  renderMark,
  renderFragment,
  customRules,
}: StructuredTextPropTypes<R>): ReturnType<F> | null {
  if (!structuredText) {
    return null;
  }

  const result = genericHtmlRender(
    {
      renderText: renderText || defaultAdapter.renderText,
      renderNode: renderNode || defaultAdapter.renderNode,
      renderMark: renderMark || defaultAdapter.renderMark,
      renderFragment: renderFragment || defaultAdapter.renderFragment,
    },
    structuredText,
    [
      renderRule(isInlineItem, ({ node, adapter }) => {
        if (!renderInlineRecord) {
          throw new RenderError(
            `The Structured Text document contains an 'inlineItem' node, but no 'renderInlineRecord' prop is specified!`,
            node,
          );
        }

        if (!structuredText.links) {
          throw new RenderError(
            `The Structured Text document contains an 'inlineItem' node, but .links is not present!`,
            node,
          );
        }

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
            `The Structured Text document contains an 'itemLink' node, but no 'renderLinkToRecord' prop is specified!`,
            node,
          );
        }

        if (!structuredText.links) {
          throw new RenderError(
            `The Structured Text document contains an 'itemLink' node, but .links is not present!`,
            node,
          );
        }

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
            `The Structured Text document contains a 'block' node, but no 'renderBlock' prop is specified!`,
            node,
          );
        }

        if (!structuredText.blocks) {
          throw new RenderError(
            `The Structured Text document contains a 'block' node, but .blocks is not present!`,
            node,
          );
        }

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
    ].concat(customRules || []),
  );

  return result;
}
