import { findAll } from 'unist-utils-core';
import { HastRootNode, HastNode } from '../types';

export default function preprocessGoogleDocs(tree: HastRootNode): void {
  // findAll uses unist Node types which are incompatible with our HastNode type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findAll(tree as any, isGoogleDocsNode as any);
}

function isGoogleDocsNode(
  node: HastNode,
  index: number,
  parent: HastNode,
): boolean {
  const isGDocsNode =
    node.type === 'element' &&
    node.tagName === 'b' &&
    typeof node.properties === 'object' &&
    typeof node.properties.id === 'string' &&
    node.properties.id.startsWith('docs-internal-guid-');

  if (isGDocsNode) {
    if (
      'children' in parent &&
      'children' in node &&
      parent.children &&
      node.children
    ) {
      // Remove google docs tag.
      parent.children.splice(index, 1, ...node.children);
    }
    return true;
  } else {
    return false;
  }
}
