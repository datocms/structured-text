/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { Handler, ContentfulNodeWithContent, ContentfulNode } from './types';
import visitChildren from './visit-children';
import { helpers } from '@contentful/rich-text-types';

// visitNode() is for visiting a single node
export default (async function visitNode(createNode, node, context) {
  const handlers = context.handlers;
  let handler;

  if (node.nodeType === 'document') {
    handler = handlers.document;
  } else if (helpers.isText(node)) {
    handler = handlers.text;
  } else {
    handler = handlers[node.nodeType]
      ? handlers[node.nodeType]
      : unknownHandler;
  }

  if (typeof handler !== 'function') {
    return undefined;
  }

  return await handler(createNode, node, context);
} as Handler<ContentfulNode>);

// This is a default handler for unknown nodes.
// It skips the current node and processes its children.
const unknownHandler: Handler<ContentfulNodeWithContent> = async function unknownHandler(
  createNode,
  node,
  context,
) {
  return visitChildren(createNode, node, context);
};
