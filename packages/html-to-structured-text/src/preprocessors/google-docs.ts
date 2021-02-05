import { findAll, visit } from 'unist-utils-core';
import { HastRootNode, HastElementNode, HastNode } from '../types';

export default function preprocessGoogleDocs(tree: HastRootNode): void {
  const gdocsBranches = findAll(tree, isGoogleDocsNode);
  gdocsBranches.forEach((branch) => {
    visit(branch, (node: HastNode) => {
      if (
        node.type !== 'element' ||
        node.tagName !== 'span' ||
        typeof node.properties !== 'object' ||
        typeof node.properties.style !== 'string'
      ) {
        return;
      }
      const markTags = [];
      node.properties.style.split(';').forEach((declaration) => {
        let [prop, ...value] = declaration.split(':');
        prop = prop.trim();
        value = value.join(':').trim();
        switch (prop) {
          case 'font-weight':
            if (value === 'bold' || Number(value) > 400) {
              markTags.push('strong');
            }
            break;
          case 'font-style':
            if (value === 'italic') {
              markTags.push('em');
            }
            break;
          case 'text-decoration':
            if (value === 'underline') {
              markTags.push('u');
            }
            break;
          default:
            break;
        }
      });

      markTags.reverse().forEach((markTagName) => {
        node.children = node.children.map((child) => {
          return {
            type: 'element',
            tagName: markTagName,
            children: [child],
          };
        });
      });
    });
  });
}

function isGoogleDocsNode(node: HastNode, index, parent: HastNode): boolean {
  const isGDocsNode: HastElementNode =
    node.type === 'element' &&
    typeof node.properties === 'object' &&
    typeof node.properties.id === 'string' &&
    node.properties.id.startsWith('docs-internal-guid-');

  if (isGDocsNode) {
    // Remove google docs tag.
    parent.children.splice(index, 1, ...node.children);
    return true;
  } else {
    return false;
  }
}
