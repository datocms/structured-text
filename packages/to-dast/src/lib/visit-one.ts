import { allowedChildren } from 'datocms-structured-text-utils';
import { Handler, HastElementNode, HastNode } from './types';
import visitAll from './visit-all';

// visitOne() is for visiting a single node
export default (async function visitOne(createNode, node, context) {
  const handlers = context.handlers;
  let handler;

  if (node.type === 'element') {
    if (
      typeof node.tagName === 'string' &&
      typeof handlers[node.tagName] === 'function'
    ) {
      handler = handlers[node.tagName];
    }
  } else if (node.type === 'root') {
    handler = handlers.root;
  } else if (node.type === 'text') {
    handler = handlers.span;
  }

  if (typeof handler !== 'function') {
    handler = unknownHandler;
  }

  return await handler(createNode, node, context);
} as Handler<HastNode>);

// This is a default handler for unknown nodes.
// It skips the current node and processes its children.
const unknownHandler: Handler<HastElementNode> = async function unknownHandler(
  createNode,
  node,
  context,
) {
  return visitAll(createNode, node, context);
};
