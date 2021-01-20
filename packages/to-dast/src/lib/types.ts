import { Node, NodeType, Mark } from 'datocms-structured-text-utils';

export { Node, NodeType, Mark };

export type CreateNodeFunction = (
  type: NodeType,
  props: Omit<Node, 'type'>,
) => Node;

export interface Context {
  name: NodeType;
  parent: HastNode;
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
) => Promise<Node | Array<Node> | void>;

export interface HastProperties {
  className?: string[];
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
