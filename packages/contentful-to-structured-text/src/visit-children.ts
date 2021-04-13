import { Handler, Node, ContentfulNode, ContentfulElementNode } from './types';
import visitNode from './visit-node';

// visitChildren() is for visiting all the children of a node
export default (async function visitChildren(createNode, parentNode, context) {
  const nodes: ContentfulNode[] = Array.isArray(parentNode.children)
    ? parentNode.children
    : [];
  let values: Node[] = [];
  let index = -1;
  let result;

  while (++index < nodes.length) {
    result = (await visitNode(createNode, nodes[index], {
      ...context,
      parentNode,
    })) as Node | Array<Node | Promise<Node>> | void;

    if (result) {
      if (Array.isArray(result)) {
        result = (await Promise.all(
          result.map(
            (nodeOrPromise: Node | Promise<Node>): Promise<Node> => {
              if (nodeOrPromise instanceof Promise) {
                return nodeOrPromise;
              }
              return Promise.resolve(nodeOrPromise);
            },
          ),
        )) as Array<Node>;
      }
      values = values.concat(result);
    }
  }

  return values;
} as Handler<ContentfulElementNode>);
