/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// @ts-nocheck

export default function liftAssets(richText) {
  const visit = (node, cb, index = 0, parents = []) => {
    if (node.content && node.content.length > 0) {
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
      node.nodeType !== 'embedded-asset-block' ||
      liftedImages.has(node) ||
      parents.length === 1 // is a top level asset
    ) {
      return;
    }

    const imgParent = parents[parents.length - 1];

    imgParent.content.splice(index, 1);

    let i = parents.length;
    let splitChildrenIndex = index;
    const contentAfterSplitPoint = [];

    while (--i > 0) {
      const parent = parents[i];
      const parentsParent = parents[i - 1];

      contentAfterSplitPoint = parent.content.splice(splitChildrenIndex);

      splitChildrenIndex = parentsParent.content.indexOf(parent);

      let nodeInserted = false;

      if (i === 1) {
        splitChildrenIndex += 1;
        parentsParent.content.splice(splitChildrenIndex, 0, node);
        liftedImages.add(node);

        nodeInserted = true;
      }

      splitChildrenIndex += 1;

      if (contentAfterSplitPoint.length > 0) {
        parentsParent.content.splice(splitChildrenIndex, 0, {
          ...parent,
          content: contentAfterSplitPoint,
        });
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
}
