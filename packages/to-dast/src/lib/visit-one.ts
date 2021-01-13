// @ts-nocheck

import visitAll from './visit-all';
import { allowedChildren } from 'datocms-structured-text-utils';

function isDastTagNameAllowedInCurrentContext(dastTagName, contextName) {
  const allowedChildrenForContext = allowedChildren[contextName];
  if (!allowedChildrenForContext) {
    return false;
  }
  /* this is the nested span case eg. nodes with marks */
  if (contextName === 'span' && contextName === dastTagName) {
    return true;
  }
  return allowedChildrenForContext.includes(dastTagName);
}

// visitOne() is for visiting a single node
export default async function visitOne(createNode, node, context) {
  const handlers = context.handlers;
  let handler = unknownHandler;

  if (node.type === 'element') {
    if (typeof handlers[node.tagName] === 'function') {
      handler = handlers[node.tagName];
    }
  } else if (typeof handlers[node.type] === 'function') {
    handler = handlers[node.type];
  }

  handler = typeof handler === 'function' ? handler : unknownHandler;

  return await handler(createNode, node, context);
}

// This is a default handler for unknown nodes.
// It skips the current node and processes its children.
async function unknownHandler(createNode, node, context) {
  if (node.value) {
    return context.handlers.span(createNode, node, context);
  }
  // Skip current node and process children.
  return visitAll(createNode, node, context);
}
