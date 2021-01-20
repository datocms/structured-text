import { Handler, Node, HastNode, HastElementNode } from './types';
import visitOne from './visit-one';

// visitAll() is for visiting all the children of a node
export default (async function visitAll(createNode, parent, context) {
  const nodes: HastNode[] = Array.isArray(parent.children)
    ? parent.children
    : [];
  let values: Node[] = [];
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
} as Handler<HastElementNode>);
