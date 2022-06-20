import { Node, ContentfulNode, Context, ContentfulTextNode } from './types';
import visitNode from './visit-node';

const visitChildren = async (
  parentNode: Exclude<ContentfulNode, ContentfulTextNode>,
  context: Context,
): Promise<Node | Array<Node> | void> => {
  const nodes: ContentfulNode[] = Array.isArray(parentNode.content)
    ? parentNode.content
    : [];

  let values: Node[] = [];

  for (const node of nodes) {
    const result = await visitNode(node, {
      ...context,
      parentNode,
    });

    if (result) {
      values = [...values, ...(Array.isArray(result) ? result : [result])];
    }
  }

  return values;
};

export default visitChildren;
