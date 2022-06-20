/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Link, Paragraph, Span } from 'datocms-structured-text-utils';
import { Node } from './types';

// Utility to convert a string into a function which checks a given node’s type
// for said string.
const isPhrasing = (node: Node): node is Span | Link => {
  return node.type === 'span' || node.type === 'link';
};

// Wraps consecutive spans and links into a single paragraph
export function wrap(nodes: Node[]): Node[] {
  return runs(nodes, (children) => ({
    type: 'paragraph',
    children,
  }));
}

// Wrap all runs of dast phrasing content in `paragraph` nodes.
function runs(
  nodes: Node[],
  onPhrasing: (x: Paragraph['children']) => Paragraph,
): Node[] {
  let result: Node[] = [];
  let index = -1;
  let node;
  let queue;

  while (++index < nodes.length) {
    node = nodes[index];

    if (isPhrasing(node)) {
      if (!queue) queue = [];
      queue.push(node);
    } else {
      if (queue) {
        result = result.concat(onPhrasing(queue));
        queue = undefined;
      }

      result = result.concat(node);
    }
  }

  if (queue) {
    result = result.concat(onPhrasing(queue));
  }

  return result;
}
