/* eslint-disable @typescript-eslint/ban-ts-comment */

import {
  allowedChildren,
  InlineNode,
  isListItem,
  Link,
  List,
  Paragraph,
  Span,
} from 'datocms-structured-text-utils';
import { ContentfulList, Context, Node } from '../types';
import visitChildren from './visit-children';

// Utility to convert a string into a function which checks a given node’s type
// for said string.
const isPhrasing = (node: Node): node is Span | Link => {
  return node.type === 'span' || node.type === 'link';
};

// Wrap in `paragraph` node.
export const wrapInParagraph = (children: InlineNode[]): Node => ({
  type: 'paragraph',
  children,
});

// Wraps consecutive spans and links into a single paragraph
export function wrapLinksAndSpansInSingleParagraph(nodes: Node[]): Node[] {
  let result: Node[] = [];
  let queue;

  for (const node of nodes) {
    if (isPhrasing(node)) {
      if (!queue) queue = [];
      queue.push(node);
    } else {
      if (queue) {
        result = [...result, wrapInParagraph(queue)];
        queue = undefined;
      }

      result = [...result, node];
    }
  }

  if (queue) {
    result = [...result, wrapInParagraph(queue)];
  }

  return result;
}

// Wraps consecutive spans and links into a single paragraph
export async function wrapListItems(
  node: ContentfulList,
  context: Context,
): Promise<Node[]> {
  const children = await visitChildren(node, context);

  if (!Array.isArray(children)) {
    return [];
  }

  return children.map((child) =>
    isListItem(child)
      ? child
      : {
          type: 'listItem',
          children: [
            allowedChildren.listItem.includes(child.type)
              ? (child as Paragraph | List)
              : {
                  type: 'paragraph',
                  children: [child] as Paragraph['children'],
                },
          ],
        },
  );
}
