import { hasChildren } from 'datocms-structured-text-utils';
import { DastDocument, Node } from 'datocms-structured-text-utils';
import { isHeading, isSpan } from 'datocms-structured-text-utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnknownArgs = any[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnknownFn = (...args: UnknownArgs) => any;

export type StructuredText = {
  value: DastDocument;
  blocks: unknown[];
  links: unknown[];
};

export type TransformContext<JsxLikeFn extends UnknownFn, Node> = {
  h: JsxLikeFn;
  node: Node;
  key: string;
  children: ReturnType<JsxLikeFn>[];
};

export type Transform<
  SpecificNode extends Node,
  JsxLikeFn extends UnknownFn
> = {
  guard: (node: Node) => node is SpecificNode;
  transform: (
    ctx: TransformContext<JsxLikeFn, SpecificNode>,
  ) => ReturnType<JsxLikeFn>;
};

// https://stackoverflow.com/questions/51879601/how-do-you-define-an-array-of-generics-in-typescript

export type TransformRest<
  T extends UnknownArgs,
  JsxLikeFn extends UnknownFn
> = {
  [P in keyof T]: T[P] extends T[number] ? Transform<T[P], JsxLikeFn> : never;
};

export function renderNode<JsxLikeFn extends UnknownFn, T extends UnknownArgs>(
  h: JsxLikeFn,
  node: Node,
  key: string,
  ...transforms: TransformRest<T, JsxLikeFn>
): ReturnType<JsxLikeFn> {
  const children = hasChildren(node)
    ? (node.children as Node[]).map((node, index) =>
        renderNode(h, node, `transform-${index}`, ...transforms),
      )
    : undefined;

  const matchingTransform = transforms.find((transform) =>
    transform.guard(node),
  );

  if (matchingTransform) {
    return matchingTransform.transform({ h, node, children, key });
  } else {
    return h('div', { key }, children);
  }
}

export function render<JsxLikeFn extends UnknownFn, T extends UnknownArgs>(
  h: JsxLikeFn,
  structuredText: StructuredText,
  ...transforms: TransformRest<T, JsxLikeFn>
): ReturnType<JsxLikeFn> {
  return renderNode(
    h,
    structuredText.value.document,
    'transform-0',
    ...transforms,
    {
      guard: isHeading,
      transform: ({ node, h, children, key }) => {
        return h(`${node.level}`, { key }, children);
      },
    },
    {
      guard: isSpan,
      transform: ({ node }) => {
        return node.value;
      },
    },
  );
}
