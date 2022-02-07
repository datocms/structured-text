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
  RenderContext,
  Span,
} from 'datocms-structured-text-utils';

export { renderRule as renderNodeRule, RenderError };

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

export function renderSpanValue<
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
>({
  node,
  key,
  adapter: { renderNode, renderText, renderFragment },
}: RenderContext<H, T, F, Span>): RenderResult<H, T, F> {
  const lines = node.value.split(/\n/);

  if (lines.length === 0) {
    return renderText(node.value, key);
  }

  return renderFragment(
    lines.slice(1).reduce(
      (acc, line, index) => {
        return acc.concat([
          renderNode('br', { key: `${key}-br-${index}` }),
          renderText(line, `${key}-line-${index}`),
        ]);
      },
      [renderText(lines[0], `${key}-line-first`)],
    ),
    key,
  );
}

type RenderMarkContext<
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
> = {
  mark: string;
  adapter: Adapter<H, T, F>;
  key: string;
  children: Exclude<RenderResult<H, T, F>, null | undefined>[] | undefined;
};

export type RenderMarkRule<
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
> = {
  appliable: (mark: string) => boolean;
  apply: (ctx: RenderMarkContext<H, T, F>) => RenderResult<H, T, F>;
};

export function renderMarkRule<
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
>(
  guard: string | ((mark: string) => boolean),
  transform: (ctx: RenderMarkContext<H, T, F>) => RenderResult<H, T, F>,
): RenderMarkRule<H, T, F> {
  return {
    appliable: typeof guard === 'string' ? (mark) => mark === guard : guard,
    apply: transform,
  };
}

export function spanNodeRenderRule<
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
>({
  customMarkRules,
}: {
  customMarkRules: RenderMarkRule<H, T, F>[];
}): RenderRule<H, T, F> {
  return renderRule(isSpan, (context) => {
    const { adapter, key, node } = context;

    return (node.marks || []).reduce((children, mark) => {
      if (!children) {
        return undefined;
      }

      const matchingCustomRule = customMarkRules.find((rule) =>
        rule.appliable(mark),
      );

      if (matchingCustomRule) {
        return matchingCustomRule.apply({ adapter, key, mark, children });
      }

      return adapter.renderNode(markToTagName(mark), { key }, children);
    }, renderSpanValue(context));
  });
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

export type RenderOptions<
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
> = {
  adapter: Adapter<H, T, F>;
  customNodeRules?: RenderRule<H, T, F>[];
  metaTransformer?: TransformMetaFn;
  customMarkRules?: RenderMarkRule<H, T, F>[];
};

export function render<
  R1 extends Record,
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn,
  R2 extends Record = R1
>(
  structuredTextOrNode:
    | StructuredText<R1, R2>
    | Document
    | Node
    | null
    | undefined,
  options: RenderOptions<H, T, F>,
): RenderResult<H, T, F> {
  const metaTransformer = options.metaTransformer || defaultMetaTransformer;

  return genericRender(options.adapter, structuredTextOrNode, [
    ...(options.customNodeRules || []),
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
              ...(children || []),
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
    spanNodeRenderRule({ customMarkRules: options.customMarkRules || [] }),
  ]);
}
