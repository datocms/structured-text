import {
  Adapter,
  isBlockquote,
  isCode,
  isHeading,
  isLink,
  isList,
  isListItem,
  isParagraph,
  isRoot,
  isSpan,
  Mark,
  Record,
  render as genericRender,
  RenderResult,
  RenderRule,
  renderRule,
  StructuredText,
  TrasformFn,
  RenderError,
  Node,
  Document,
  isThematicBreak,
  NodeWithMeta,
  MetaEntry,
} from 'datocms-structured-text-utils';

export { renderRule, RenderError };

export function markToTagName(mark: Mark): string {
  switch (mark) {
    case 'emphasis':
      return 'em';
    case 'underline':
      return 'u';
    case 'strikethrough':
      return 'del';
    case 'highlight':
      return 'mark';
    default:
      return mark;
  }
}

export type TransformMetaContext = {
  node: NodeWithMeta;
  meta: Array<MetaEntry>;
};

export type TransformedMeta =
  | {
      [prop: string]: unknown;
    }
  | null
  | undefined;

export type TransformMetaFn = (
  context: TransformMetaContext,
) => TransformedMeta;

export const defaultMetaTransformer: TransformMetaFn = ({ meta }) => {
  const attributes: TransformedMeta = {};

  meta.forEach((entry) => {
    if (['target', 'title', 'rel'].includes(entry.id)) {
      attributes[entry.id] = entry.value;
    }
  });

  return attributes;
};

export function render<
  R extends Record,
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
>(
  adapter: Adapter<H, T, F>,
  structuredTextOrNode: StructuredText<R> | Document | Node | null | undefined,
  customRules: RenderRule<H, T, F>[],
  metaTransformer: TransformMetaFn = defaultMetaTransformer,
): RenderResult<H, T, F> {
  return genericRender(adapter, structuredTextOrNode, [
    ...customRules,
    renderRule(isRoot, ({ adapter: { renderFragment }, key, children }) => {
      return renderFragment(children, key);
    }),
    renderRule(isParagraph, ({ adapter: { renderNode }, key, children }) => {
      return renderNode('p', { key }, children);
    }),
    renderRule(isList, ({ adapter: { renderNode }, node, key, children }) => {
      return renderNode(
        node.style === 'bulleted' ? 'ul' : 'ol',
        { key },
        children,
      );
    }),
    renderRule(isListItem, ({ adapter: { renderNode }, key, children }) => {
      return renderNode('li', { key }, children);
    }),
    renderRule(
      isBlockquote,
      ({ adapter: { renderNode }, key, node, children }) => {
        const childrenWithBlockquote = [renderNode('blockquote', { key: 'blockquote' }, children)];
        if (node.attribution) {
          childrenWithBlockquote.push(renderNode('p', { key: 'attribution' }, node.attribution));
        }
        return renderNode('p', { key }, childrenWithBlockquote);
      },
    ),
    renderRule(isCode, ({ adapter: { renderNode, renderText }, key, node }) => {
      return renderNode(
        'pre',
        { key, 'data-language': node.language },
        renderNode('code', null, renderText(node.code)),
      );
    }),
    renderRule(isLink, ({ adapter: { renderNode }, key, children, node }) => {
      const meta = node.meta ? metaTransformer({ node, meta: node.meta }) : {};

      return renderNode(
        'a',
        { ...(meta || {}), key, href: node.url },
        children,
      );
    }),
    renderRule(isThematicBreak, ({ adapter: { renderNode }, key }) => {
      return renderNode('hr', { key });
    }),
    renderRule(
      isHeading,
      ({ node, adapter: { renderNode }, children, key }) => {
        return renderNode(`h${node.level}`, { key }, children);
      },
    ),
    renderRule(isSpan, ({ adapter: { renderNode, renderText }, key, node }) => {
      const marks = node.marks || [];

      const lines = node.value.split(/\n/);

      const textWithNewlinesConvertedToBr =
        lines.length > 0
          ? lines.slice(1).reduce(
              (acc, line, index) => {
                return acc.concat([
                  renderNode('br', { key: `${key}-br-${index}` }),
                  renderText(line, `${key}-line-${index}`),
                ]);
              },
              [renderText(lines[0], `${key}-line-first`)],
            )
          : renderText(node.value, key);

      return marks.reduce<RenderResult<H, T, F>>((children, mark) => {
        return renderNode(markToTagName(mark), { key }, children);
      }, textWithNewlinesConvertedToBr);
    }),
  ]);
}
