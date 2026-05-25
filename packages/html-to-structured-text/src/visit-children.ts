import { Node, HastNode, CreateNodeFunction, Context } from './types';
import visitNode from './visit-node';

// visitChildren() is for visiting all the children of a node
export default async function visitChildren(
  createNode: CreateNodeFunction,
  parentNode: HastNode,
  context: Context,
): Promise<Node | Array<Node> | void> {
  const nodes: HastNode[] =
    parentNode.type === 'text' ? [] : parentNode.children || [];
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
