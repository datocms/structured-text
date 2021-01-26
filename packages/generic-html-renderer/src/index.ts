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

export function render<
  R extends Record,
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
>(
  adapter: Adapter<H, T, F>,
  structuredTextOrNode: StructuredText<R> | Node | null | undefined,
  customRules: RenderRule<H, T, F>[],
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
        const childrenWithAttribution = node.attribution
          ? [
              ...children,
              renderNode(`footer`, { key: 'footer' }, node.attribution),
            ]
          : children;
        return renderNode('blockquote', { key }, childrenWithAttribution);
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
      return renderNode('a', { key, href: node.url }, children);
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
                  renderNode('br', { key: `br-${index}` }),
                  renderText(line, `line-${index}`),
                ]);
              },
              [renderText(lines[0], 'line-first')],
            )
          : renderText(node.value, key);

      return marks.reduce<RenderResult<H, T, F>>((children, mark) => {
        return renderNode(markToTagName(mark), { key }, children);
      }, textWithNewlinesConvertedToBr);
    }),
  ]);
}
