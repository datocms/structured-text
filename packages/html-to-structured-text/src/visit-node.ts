import { Handler, HastNode, CreateNodeFunction, Context } from './types';
import visitChildren from './visit-children';

// visitNode() is for visiting a single node
const visitNode: Handler = async function visitNode(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
) {
  const handlers = context.handlers;
  let handler: Handler | undefined;

  if (node.type === 'element') {
    if (
      typeof node.tagName === 'string' &&
      typeof handlers[node.tagName] === 'function'
    ) {
      handler = handlers[node.tagName];
    } else {
      handler = unknownHandler;
    }
  } else if (node.type === 'root') {
    handler = handlers.root;
  } else if (node.type === 'text') {
    handler = handlers.text;
  }

  if (typeof handler !== 'function') {
    return undefined;
  }

  return await handler(createNode, node, context);
};

export default visitNode;

// This is a default handler for unknown nodes.
// It skips the current node and processes its children.
const unknownHandler: Handler = async function unknownHandler(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
) {
  return visitChildren(createNode, node, context);
};
