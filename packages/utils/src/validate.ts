import { Node, Mark } from './types';

import {
  allowedAttributes,
  allowedMarks,
  allowedChildren,
  inlineNodeTypes,
} from './definitions';

export function validate(root: Node): { valid: boolean; message?: string } {
  let nodes = [root];
  let node = root;

  while (nodes.length > 0) {
    node = nodes.pop();
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
        )}`,
      };
    }
    if ('marks' in node && Array.isArray(node.marks)) {
      const invalidMark = node.marks.find(
        (mark: Mark) => !allowedMarks.includes(mark),
      );
      if (invalidMark) {
        return {
          valid: false,
          message: `"${
            node.type
          }" has an invalid mark "${invalidMark}":\n\n ${JSON.stringify(node)}`,
        };
      }
    }
    if ('children' in node && Array.isArray(node.children)) {
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
          }":\n\n ${JSON.stringify(node)}`,
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
