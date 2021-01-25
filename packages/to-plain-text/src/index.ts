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

export {
  renderRule,
  RenderError,
  StructuredTextGraphQlResponse,
  StructuredTextGraphQlResponseRecord,
};

const renderFragment = (children: (string | string[])[]): string => {
  const sanitizedChildren = children
    .reduce<Array<string>>(
      (acc, child) =>
        Array.isArray(child) ? [...acc, ...child] : [...acc, child],
      [],
    )
    .filter((x) => !!x)
    .map((x) => x.trim());

  if (!sanitizedChildren || sanitizedChildren.length === 0) {
    return null;
  }

  return sanitizedChildren.join(' ');
};

const stringAdapter = (
  tagName: string,
  attrs?: Record<string, string> | null,
  ...children: (string | string[])[]
): string | null => {
  return renderFragment(children);
};

export const defaultAdapter = {
  renderNode: stringAdapter,
  renderMark: stringAdapter,
  renderFragment,
  renderText: (text: string): string => text,
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
  /** A set of additional rules to convert the document to a string **/
  customRules?: RenderRule<H, T, M, F>[];
  /** Fuction that converts an 'inlineItem' node into a string **/
  renderInlineRecord?: (context: RenderInlineRecordContext<R>) => string | null;
  /** Fuction that converts an 'itemLink' node into a string **/
  renderLinkToRecord?: (context: RenderRecordLinkContext<R>) => string | null;
  /** Fuction that converts a 'block' node into a string **/
  renderBlock?: (context: RenderBlockContext<R>) => string | null;
  /** Fuction that converts a simple string text into a string **/
  renderText?: T;
  /** React.createElement-like function to use to convert a node into a string **/
  renderNode?: H;
  /** React.createElement-like function to use to convert a mark into a string **/
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
      renderRule(isInlineItem, ({ node, adapter }) => {
        if (
          !renderInlineRecord ||
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.links
        ) {
          return null;
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
        if (
          !renderLinkToRecord ||
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.links
        ) {
          return children;
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
        if (
          !renderBlock ||
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.blocks
        ) {
          return null;
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
    ].concat(customRules),
  );

  return result;
}
