import { Node, Mark } from './types';

import {
  allowedAttributes,
  allowedMarks,
  allowedChildren,
  inlineNodeTypes,
} from './definitions';

export function validate(root: Node): { valid: boolean; message?: string } {
  const nodes = [root];
  let node = root;

  while (nodes.length > 0) {
    node = nodes.pop();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, ...attributes } = node;
    const invalidAttribute = Object.keys(attributes).find(
      (attr) => !allowedAttributes[node.type].includes(attr),
    );
    if (invalidAttribute) {
      return {
        valid: false,
        message: `"${
          node.type
        }" has an invalid attribute "${invalidAttribute}":\n\n ${JSON.stringify(
          node,
          null,
          2,
        )}`,
      };
    }
    if ('marks' in node) {
      if (!Array.isArray(node.marks)) {
        return {
          valid: false,
          message: `"${
            node.type
          }"'s marks is not an Array:\n\n ${JSON.stringify(node, null, 2)}`,
        };
      }
      const invalidMark = node.marks.find(
        (mark: Mark) => !allowedMarks.includes(mark),
      );
      if (invalidMark) {
        return {
          valid: false,
          message: `"${
            node.type
          }" has an invalid mark "${invalidMark}":\n\n ${JSON.stringify(
            node,
            null,
            2,
          )}`,
        };
      }
    }
    if ('children' in node) {
      if (!Array.isArray(node.children)) {
        return {
          valid: false,
          message: `"${
            node.type
          }"'s children is not an Array:\n\n ${JSON.stringify(node, null, 2)}`,
        };
      }
      let allowed = allowedChildren[node.type];
      if (typeof allowed === 'string' && allowed === 'inlineNodes') {
        allowed = inlineNodeTypes;
      }
      const invalidChild = (node.children as Array<Node>).find(
        (child: Node) => !allowed.includes(child.type),
      );
      if (invalidChild) {
        return {
          valid: false,
          message: `"${node.type}" has invalid child "${
            invalidChild.type
          }":\n\n ${JSON.stringify(node, null, 2)}`,
        };
      }
      for (let i = node.children.length - 1; i >= 0; i--) {
        nodes.push(node.children[i]);
      }
    }
  }
  return {
    valid: true,
  };
}
