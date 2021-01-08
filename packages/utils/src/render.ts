import { Document, Node } from './types';
import { hasChildren } from './guards';
import flatten from 'lodash.flatten';

export class RenderError extends Error {
  node: Node;

  constructor(message: string, node: Node) {
    super(message);
    this.node = node;
    Object.setPrototypeOf(this, RenderError.prototype);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TrasformFn = (...args: any[]) => any;

export type Record = {
  __typename: string;
  id: string;
} & {
  [prop: string]: unknown;
};

export type StructuredText<R extends Record = Record> = {
  value: Document;
  blocks: R[];
  links: R[];
};

export type RenderResult<
  H extends TrasformFn,
  T extends TrasformFn,
  M extends TrasformFn,
  F extends TrasformFn
> =
  | ReturnType<H>
  | ReturnType<T>
  | ReturnType<F>
  | ReturnType<M>
  | null
  | undefined;

export type RenderContext<
  H extends TrasformFn,
  T extends TrasformFn,
  M extends TrasformFn,
  F extends TrasformFn,
  N extends Node
> = {
  adapter: Adapter<H, T, M, F>;
  node: N;
  ancestors: Node[];
  key: string;
  children: RenderResult<H, T, M, F>[] | undefined;
};

export interface RenderRule<
  H extends TrasformFn,
  T extends TrasformFn,
  M extends TrasformFn,
  F extends TrasformFn
> {
  appliable: (node: Node) => boolean;
  apply: (ctx: RenderContext<H, T, M, F, Node>) => RenderResult<H, T, M, F>;
}

export const renderRule = <
  N extends Node,
  H extends TrasformFn,
  T extends TrasformFn,
  M extends TrasformFn,
  F extends TrasformFn
>(
  guard: (node: Node) => node is N,
  transform: (ctx: RenderContext<H, T, M, F, N>) => RenderResult<H, T, M, F>,
): RenderRule<H, T, M, F> => ({
  appliable: guard,
  apply: (ctx: RenderContext<H, T, M, F, Node>) =>
    transform(ctx as RenderContext<H, T, M, F, N>),
});

export function transformNode<
  H extends TrasformFn,
  T extends TrasformFn,
  M extends TrasformFn,
  F extends TrasformFn
>(
  adapter: Adapter<H, T, M, F>,
  node: Node,
  key: string,
  ancestors: Node[],
  renderRules: RenderRule<H, T, M, F>[],
): RenderResult<H, T, M, F> {
  const children = hasChildren(node)
    ? flatten(
        (node.children as Node[])
          .map((node, index) =>
            transformNode(
              adapter,
              node,
              `t-${index}`,
              [...ancestors, node],
              renderRules,
            ),
          )
          .filter((x) => !!x),
      )
    : undefined;

  const matchingTransform = renderRules.find((transform) =>
    transform.appliable(node),
  );

  if (matchingTransform) {
    return matchingTransform.apply({ adapter, node, children, key, ancestors });
  } else {
    throw new RenderError(
      `Don't know how to render a node with type "${node.type}". Please specify a custom renderRule for it!`,
      node,
    );
  }
}

export type Adapter<
  H extends TrasformFn,
  T extends TrasformFn,
  M extends TrasformFn,
  F extends TrasformFn
> = {
  renderNode: H;
  renderText: T;
  renderFragment: F;
  renderMark: M;
};

export function render<
  H extends TrasformFn,
  T extends TrasformFn,
  M extends TrasformFn,
  F extends TrasformFn,
  R extends Record
>(
  adapter: Adapter<H, T, M, F>,
  structuredText: StructuredText<R>,
  renderRules: RenderRule<H, T, M, F>[],
): RenderResult<H, T, M, F> {
  if (!structuredText) {
    return null;
  }

  const result = transformNode(
    adapter,
    structuredText.value.document,
    't-0',
    [],
    renderRules,
  );

  return result;
}
