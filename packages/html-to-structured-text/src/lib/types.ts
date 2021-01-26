import { Node, Root, NodeType, Mark } from 'datocms-structured-text-utils';

export { Node, Root, NodeType, Mark };

export type CreateNodeFunction = (
  type: NodeType,
  props: Omit<Node, 'type'>,
) => Node;

export interface Context {
  name: NodeType;
  parentNode: HastNode;
  handlers: Record<string, Handler<unknown>>;
  frozenBaseUrl?: string;
  baseFound?: boolean;
  wrapText: boolean;
  marks?: Mark[];
  codePrefix?: string;
}

export type Handler<HastNodeType> = (
  createNodeFunction: CreateNodeFunction,
  node: HastNodeType,
  context: Context,
) =>
  | Promise<Node | Array<Node> | void>
  | Array<Promise<Node | Array<Node> | void>>;

export interface HastProperties {
  className?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface HastTextNode {
  type: 'text';
  value: string;
}

export interface HastElementNode {
  type: 'element';
  tagName: string;
  properties?: HastProperties;
  children?: HastNode[];
}

export interface HastRootNode {
  type: 'root';
  children?: HastNode[];
}

export type HastNode = HastTextNode | HastElementNode | HastRootNode;
