import { DastDocument, Node } from 'datocms-structured-text-utils';

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
  value: StructuredText;
};

export type Transform<
  SpecificNode extends Node,
  JsxLikeFn extends UnknownFn
> = {
  guard: (node: Node) => node is SpecificNode;
  transform: (ctx: TransformContext<JsxLikeFn, SpecificNode>) => string;
};

// https://stackoverflow.com/questions/51879601/how-do-you-define-an-array-of-generics-in-typescript

export type TransformRest<
  T extends UnknownArgs,
  JsxLikeFn extends UnknownFn
> = {
  [P in keyof T]: T[P] extends T[number] ? Transform<T[P], JsxLikeFn> : never;
};

export function render<JsxLikeFn extends UnknownFn, T extends UnknownArgs>(
  h: JsxLikeFn,
  document: StructuredText,
  ...transforms: TransformRest<T, JsxLikeFn>
): ReturnType<JsxLikeFn> {
  return h();
}
