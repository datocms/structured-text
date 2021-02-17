import { Node, Mark, Document } from './types';

import {
  allowedAttributes,
  allowedMarks,
  allowedChildren,
  inlineNodeTypes,
} from './definitions';

export function validate(
  document: Document | null | undefined,
): { valid: boolean; message?: string } {
  if (document === null || document === undefined) {
    return { valid: true };
  }

  if (document.schema !== 'dast') {
    return {
      valid: false,
      message: `.schema is not "dast":\n\n ${JSON.stringify(
        document,
        null,
        2,
      )}`,
    };
  }

  const nodes: Node[] = [document.document];
  let node: Node = document.document;

  while (nodes.length > 0) {
    const next = nodes.pop();

    if (!next) {
      break;
    }

    node = next;

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

    if ('meta' in node) {
      if (!Array.isArray(node.meta)) {
        return {
          valid: false,
          message: `"${node.type}"'s meta is not an Array:\n\n ${JSON.stringify(
            node,
            null,
            2,
          )}`,
        };
      }

      const invalidMeta = node.meta.find(
        (entry) =>
          typeof entry !== 'object' || !('id' in entry) || !('value' in entry),
      );

      if (invalidMeta) {
        return {
          valid: false,
          message: `"${node.type}" has an invalid meta ${JSON.stringify(
            invalidMeta,
          )}:\n\n ${JSON.stringify(node, null, 2)}`,
        };
      }
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
      if (node.children.length === 0) {
        return {
          valid: false,
          message: `"${
            node.type
          }"'s children cannot be an empty Array:\n\n ${JSON.stringify(
            node,
            null,
            2,
          )}`,
        };
      }
      let allowed = allowedChildren[node.type];
      if (typeof allowed === 'string' && allowed === 'inlineNodes') {
        allowed = inlineNodeTypes;
      }
      const invalidChildIndex = (node.children as Array<Node | null>).findIndex(
        (child) => !child || !allowed.includes(child.type),
      );
      if (invalidChildIndex !== -1) {
        const invalidChild = node.children[invalidChildIndex];
        return {
          valid: false,
          message: `"${node.type}" has invalid child "${
            invalidChild ? invalidChild.type : invalidChild
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
