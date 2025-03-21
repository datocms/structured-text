import { flatten } from 'array-flatten';
import { hasChildren, isDocument, isNode, isStructuredText } from './guards';
import { Document, Node, Record, StructuredText } from './types';

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

export type RenderResult<
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
> = ReturnType<H> | ReturnType<T> | ReturnType<F> | null | undefined;

export type RenderContext<
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn,
  N extends Node
> = {
  adapter: Adapter<H, T, F>;
  node: N;
  ancestors: Node[];
  key: string;
  children: Exclude<RenderResult<H, T, F>, null | undefined>[] | undefined;
};

export interface RenderRule<
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
> {
  appliable: (node: Node) => boolean;
  apply: (ctx: RenderContext<H, T, F, Node>) => RenderResult<H, T, F>;
}

export const renderRule = <
  N extends Node,
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
>(
  guard: (node: Node) => node is N,
  transform: (ctx: RenderContext<H, T, F, N>) => RenderResult<H, T, F>,
): RenderRule<H, T, F> => ({
  appliable: guard,
  apply: (ctx: RenderContext<H, T, F, Node>) =>
    transform(ctx as RenderContext<H, T, F, N>),
});

export function transformNode<
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
>(
  adapter: Adapter<H, T, F>,
  node: Node,
  key: string,
  ancestors: Node[],
  renderRules: RenderRule<H, T, F>[],
): RenderResult<H, T, F> {
  const children = hasChildren(node)
    ? (flatten(
        (node.children as Node[])
          .map((innerNode, index) =>
            transformNode(
              adapter,
              innerNode,
              `t-${index}`,
              [node, ...ancestors],
              renderRules,
            ),
          )
          .filter((x) => !!x),
      ) as Exclude<RenderResult<H, T, F>, null | undefined>[])
    : undefined;

  const matchingTransform = renderRules.find((transform) =>
    transform.appliable(node),
  );

  if (matchingTransform) {
    return matchingTransform.apply({ adapter, node, children, key, ancestors });
  }
  throw new RenderError(
    `Don't know how to render a node with type "${node.type}". Please specify a custom renderRule for it!`,
    node,
  );
}

export type Adapter<
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn
> = {
  renderNode: H;
  renderText: T;
  renderFragment: F;
};

export function render<
  H extends TrasformFn,
  T extends TrasformFn,
  F extends TrasformFn,
  BlockRecord extends Record,
  LinkRecord extends Record,
  InlineBlockRecord extends Record
>(
  adapter: Adapter<H, T, F>,
  structuredTextOrNode:
    | StructuredText<BlockRecord, LinkRecord, InlineBlockRecord>
    | Document
    | Node
    | null
    | undefined,
  renderRules: RenderRule<H, T, F>[],
): RenderResult<H, T, F> {
  if (!structuredTextOrNode) {
    return null;
  }

  const node =
    isStructuredText<BlockRecord, LinkRecord, InlineBlockRecord>(
      structuredTextOrNode,
    ) && isDocument(structuredTextOrNode.value)
      ? structuredTextOrNode.value.document
      : isDocument(structuredTextOrNode)
      ? structuredTextOrNode.document
      : isNode(structuredTextOrNode)
      ? structuredTextOrNode
      : undefined;

  if (!node) {
    throw new Error(
      'Passed object is neither null, a Structured Text value, a DAST document or a DAST node',
    );
  }

  const result = transformNode(adapter, node, 't-0', [], renderRules);

  return result;
}
