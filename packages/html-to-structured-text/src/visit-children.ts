import type { Node, CreateNodeFunction, Context } from './types.js';
import type { Nodes as HastNodes } from 'hast';
import visitNode from './visit-node.js';

// visitChildren() is for visiting all the children of a node
export default async function visitChildren(
  createNode: CreateNodeFunction,
  parentNode: HastNodes,
  context: Context,
): Promise<Node | Array<Node> | void> {
  const nodes: HastNodes[] =
    parentNode.type === 'text' ||
    parentNode.type === 'comment' ||
    parentNode.type === 'doctype'
      ? []
      : parentNode.children || [];
  let values: Node[] = [];
  let index = -1;

  while (++index < nodes.length) {
    const result = await visitNode(createNode, nodes[index], {
      ...context,
      parentNode,
    });

    if (result) {
      if (Array.isArray(result)) {
        const resolved = await Promise.all(
          result.map((nodeOrPromise) =>
            nodeOrPromise instanceof Promise
              ? nodeOrPromise
              : Promise.resolve(nodeOrPromise),
          ),
        );
        values = values.concat(resolved);
      } else {
        values.push(result);
      }
    }
  }

  return values;
}
