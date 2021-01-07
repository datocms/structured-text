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
  Node,
  Record,
  render as genericRender,
  RenderResult,
  RenderRule,
  renderRule,
  StructuredText,
  TrasformFn,
} from 'datocms-structured-text-utils';

export { renderRule };

export function markToTagName(mark: Mark): string {
  switch (mark) {
    case 'emphasis':
      return 'em';
    case 'underline':
      return 'u';
    case 'strikethrough':
      return 'strike';
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
  M extends TrasformFn,
  F extends TrasformFn
>(
  adapter: Adapter<H, T, M, F>,
  structuredText: StructuredText<R>,
  customRules: RenderRule<H, T, M, F>[],
): RenderResult<H, T, M, F> {
  return genericRender(adapter, structuredText, [
    ...customRules,
    renderRule(isRoot, ({ adapter: { renderFragment }, children }) => {
      return renderFragment(children);
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
    renderRule(isBlockquote, ({ adapter: { renderNode }, key, children }) => {
      return renderNode('blockquote', { key }, children);
    }),
    renderRule(isCode, ({ adapter: { renderNode }, key, node, children }) => {
      return renderNode(
        'pre',
        { key, 'data-language': node.language },
        renderNode('code', null, children),
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
    renderRule(isSpan, ({ adapter: { renderNode, renderText }, node }) => {
      const marks = node.marks || [];
      return marks.reduce<RenderResult<H, T, M, F>>((children, mark) => {
        return renderNode(markToTagName(mark), { key: 't-0' }, children);
      }, renderText(node.value));
    }),
    // catch-all rule
    renderRule(
      (node: Node): node is Node => true,
      ({ adapter: { renderNode }, key, node }) => {
        return renderNode(
          'div',
          { key },
          `Don't know how to render a node, so it will be skipped. Please specify a custom render rule for it!`,
          renderNode(
            'pre',
            { key },
            renderNode('code', null, JSON.stringify(node, null, 2)),
          ),
        );
      },
    ),
  ]);
}
