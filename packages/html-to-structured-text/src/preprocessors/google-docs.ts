/* eslint-disable @typescript-eslint/no-explicit-any */
import { findAll, visit } from 'unist-utils-core';
import { HastRootNode, HastNode } from '../types';

export default function preprocessGoogleDocs(tree: HastRootNode): void {
  const gdocsBranches = findAll(tree as any, isGoogleDocsNode as any);
  gdocsBranches.forEach((branch) => {
    visit(branch, ((node: HastNode) => {
      if (
        node.type !== 'element' ||
        node.tagName !== 'span' ||
        typeof node.properties !== 'object' ||
        typeof node.properties.style !== 'string'
      ) {
        return;
      }
      const markTags: string[] = [];
      node.properties.style.split(';').forEach((declaration) => {
        const [firstChunk, ...otherChunks] = declaration.split(':');
        const prop = firstChunk.trim();
        const gdocsMark = otherChunks.join(':').trim();
        switch (prop) {
          case 'font-weight':
            if (gdocsMark === 'bold' || Number(gdocsMark) > 400) {
              markTags.push('strong');
            }
            break;
          case 'font-style':
            if (gdocsMark === 'italic') {
              markTags.push('em');
            }
            break;
          case 'text-decoration':
            if (gdocsMark === 'underline') {
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
    }) as any);
  });
}

function isGoogleDocsNode(
  node: HastNode,
  index: number,
  parent: HastNode,
): boolean {
  const isGDocsNode =
    node.type === 'element' &&
    typeof node.properties === 'object' &&
    typeof node.properties.id === 'string' &&
    node.properties.id.startsWith('docs-internal-guid-');

  if (isGDocsNode) {
    if ('children' in parent && 'children' in node) {
      // Remove google docs tag.
      parent.children.splice(index, 1, ...node.children);
    }
    return true;
  } else {
    return false;
  }
}
