import { Node as HastNode } from 'unist';
import { Node, NodeType, Mark } from 'datocms-structured-text-utils';

export { Node, NodeType, HastNode, Mark };

export type CreateNodeFunction = (
  type: NodeType,
  props: Omit<Node, 'type'>,
) => Node;

export type Context = any;

export type Handler = (
  createNodeFunction: CreateNodeFunction,
  node: HastNode,
  context: Context,
) => Promise<Node | Array<Node> | void>;
