// @ts-nocheck
import visitOne from './visit-one';

// all() is for visiting all the children of a node
export default async function visitAll(createNode, parent, context) {
  const nodes = parent.children || [];
  let values = [];
  let index = -1;
  let result;

  while (++index < nodes.length) {
    result = await visitOne(createNode, nodes[index], {
      ...context,
      parent,
    });

    if (result) {
      values = values.concat(result);
    }
  }

  return values;
}
