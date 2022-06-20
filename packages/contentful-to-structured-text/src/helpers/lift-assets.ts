import {
  Block,
  BLOCKS,
  Document,
  Inline,
  TopLevelBlock,
} from '@contentful/rich-text-types';
import { ContentfulNode, ContentfulTextNode } from '../types';

export const liftAssets = (richText: Document): void => {
  const visit = (
    node: ContentfulNode,
    cb: (
      node: ContentfulNode,
      index: number,
      parents: Exclude<ContentfulNode, ContentfulTextNode>[],
    ) => void,
    index = 0,
    parents: Exclude<ContentfulNode, ContentfulTextNode>[] = [],
  ) => {
    if (node.nodeType !== 'text' && node.content && node.content.length > 0) {
      node.content.forEach((child, index) => {
        visit(child, cb, index, [...parents, node]);
      });
    }

    cb(node, index, parents);
  };

  const liftedImages = new WeakSet();

  visit(richText, (node, index, parents) => {
    if (
      !node ||
      node.nodeType !== BLOCKS.EMBEDDED_ASSET ||
      liftedImages.has(node) ||
      parents.length === 1 // is a top level asset
    ) {
      return;
    }

    const assetParent = parents[parents.length - 1];

    assetParent.content.splice(index, 1);

    let currentParentIndex = parents.length;
    let splitChildrenIndex = index;
    let contentAfterSplitPoint: (
      | Block
      | ContentfulTextNode
      | Inline
      | TopLevelBlock
    )[] = [];

    while (--currentParentIndex > 0) {
      const parent = parents[currentParentIndex];
      const parentsParent = parents[currentParentIndex - 1];

      // to do: check if this is ok
      const parentsParentContentWithType = parentsParent.content as Array<
        Block | ContentfulTextNode | Inline
      >;

      contentAfterSplitPoint = parent.content.splice(splitChildrenIndex);

      splitChildrenIndex = parentsParentContentWithType.indexOf(parent);

      let nodeInserted = false;

      if (currentParentIndex === 1) {
        splitChildrenIndex += 1;
        parentsParent.content.splice(splitChildrenIndex, 0, node);
        liftedImages.add(node);

        nodeInserted = true;
      }

      splitChildrenIndex += 1;

      if (contentAfterSplitPoint.length > 0) {
        const nodeToinsert = {
          ...parent,
          content: contentAfterSplitPoint,
        } as Block;

        // to do: check if this is ok
        parentsParent.content.splice(splitChildrenIndex, 0, nodeToinsert);
      }

      // Remove the parent if empty
      if (parent.content.length === 0) {
        splitChildrenIndex -= 1;
        parentsParent.content.splice(
          nodeInserted ? splitChildrenIndex - 1 : splitChildrenIndex,
          1,
        );
      }
    }
  });
};
