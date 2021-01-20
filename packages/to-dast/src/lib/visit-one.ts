import { allowedChildren } from 'datocms-structured-text-utils';
import { Handler } from './types';
import visitAll from './visit-all';

// visitOne() is for visiting a single node
export default (async function visitOne(createNode, node, context) {
  const handlers = context.handlers;
  let handler = unknownHandler;

  if (node.type === 'element') {
    if (
      typeof node.tagName === 'string' &&
      typeof handlers[node.tagName] === 'function'
    ) {
      handler = handlers[node.tagName];
    }
  } else if (
    typeof node.type === 'string' &&
    typeof handlers[node.type] === 'function'
  ) {
    handler = handlers[node.type];
  }

  handler = typeof handler === 'function' ? handler : unknownHandler;

  return await handler(createNode, node, context);
} as Handler);

// This is a default handler for unknown nodes.
// It skips the current node and processes its children.
const unknownHandler: Handler = async function unknownHandler(
  createNode,
  node,
  context,
) {
  if (node.value) {
    return context.handlers.span(createNode, node, context);
  }
  // Skip current node and process children.
  return visitAll(createNode, node, context);
};
