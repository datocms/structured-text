/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// @ts-nocheck

import { find, visit } from 'unist-utils-core';

export default function liftImages(tree) {
  const liftedImages = new Set();
  const body = find(tree, (node) => node.tagName === 'body');

  visit(body, (node, index, parents) => {
    if (
      !node ||
      node.tagName !== 'img' ||
      liftedImages.has(node) ||
      parents.length === 1 // is a top level img
    ) {
      return;
    }
    // remove image

    const imgParent = parents[parents.length - 1];
    imgParent.children.splice(index, 1);

    let i = parents.length;
    let splitChildrenIndex = index;
    let childrenAfterSplitPoint = [];

    while (--i > 0) {
      // Example: i == 2
      // [ 'body', 'div', 'h1' ]
      const /* h1 */ parent = parents[i];
      const /* div */ parentsParent = parents[i - 1];

      // Delete the siblings after the image and save them in a variable
      childrenAfterSplitPoint /* [ 'h1.2' ] */ = parent.children.splice(
        splitChildrenIndex,
      );
      // parent.children is now == [ 'h1.1' ]

      // parentsParent.children = [ 'h1' ]
      splitChildrenIndex = parentsParent.children.indexOf(parent);
      // splitChildrenIndex = 0

      let nodeInserted = false;

      // If we reached the 'div' add the image's node
      if (i === 1) {
        splitChildrenIndex += 1;
        parentsParent.children.splice(splitChildrenIndex, 0, node);
        liftedImages.add(node);

        nodeInserted = true;
      }

      splitChildrenIndex += 1;
      // Create a new branch with childrenAfterSplitPoint if we have any i.e.
      // <h1>h1.2</h1>
      if (childrenAfterSplitPoint.length > 0) {
        parentsParent.children.splice(splitChildrenIndex, 0, {
          ...parent,
          children: childrenAfterSplitPoint,
        });
      }
      // Remove the parent if empty
      if (parent.children.length === 0) {
        splitChildrenIndex -= 1;
        parentsParent.children.splice(
          nodeInserted ? splitChildrenIndex - 1 : splitChildrenIndex,
          1,
        );
      }
    }
  });
}
