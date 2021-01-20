/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { Handler, HastElementNode, HastNode } from './types';
import visitChildren from './visit-children';

// visitNode() is for visiting a single node
export default (async function visitNode(createNode, node, context) {
  const handlers = context.handlers;
  let handler;

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
} as Handler<HastNode>);

// This is a default handler for unknown nodes.
// It skips the current node and processes its children.
const unknownHandler: Handler<HastElementNode> = async function unknownHandler(
  createNode,
  node,
  context,
) {
  return visitChildren(createNode, node, context);
};
