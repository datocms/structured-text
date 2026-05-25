import { visit, SKIP } from 'unist-util-visit';
import type { Root as HastRoot, Element as HastElement } from 'hast';

export default function preprocessGoogleDocs(tree: HastRoot): void {
  visit(tree, 'element', (node, index, parent) => {
    if (
      !isGoogleDocsWrapper(node) ||
      !parent ||
      index === undefined ||
      !('children' in parent)
    ) {
      return;
    }

    parent.children.splice(index, 1, ...node.children);
    return [SKIP, index];
  });
}

function isGoogleDocsWrapper(node: HastElement): boolean {
  return (
    node.tagName === 'b' &&
    typeof node.properties === 'object' &&
    typeof node.properties.id === 'string' &&
    node.properties.id.startsWith('docs-internal-guid-')
  );
}
