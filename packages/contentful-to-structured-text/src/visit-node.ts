/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { Handler, ContentfulElementNode, ContentfulNode } from './types';
import visitChildren from './visit-children';

// visitNode() is for visiting a single node
export default (async function visitNode(createNode, node, context) {
  const handlers = context.handlers;
  let handler;

  if (node.nodeType === 'document') {
    handler = handlers.root;
  } else if (node.nodeType === 'text') {
    handler = handlers.text;
  } else {
    handler = handlers[node.tagName] ? handlers[node.tagName] : unknownHandler;
  }

  if (typeof handler !== 'function') {
    return undefined;
  }

  return await handler(createNode, node, context);
} as Handler<ContentfulNode>);

// This is a default handler for unknown nodes.
// It skips the current node and processes its children.
const unknownHandler: Handler<ContentfulElementNode> = async function unknownHandler(
  createNode,
  node,
  context,
) {
  return visitChildren(createNode, node, context);
};
