import { helpers } from '@contentful/rich-text-types';
import { Node } from 'datocms-structured-text-utils';
import { ContentfulNode, Context } from './types';
import visitChildren from './visit-children';

const visitNode = async (
  node: ContentfulNode | null,
  context: Context,
): Promise<Node | Array<Node> | void> => {
  if (!node) {
    return;
  }

  const matchingHandler = context.handlers.find((h) => h.guard(node));

  if (matchingHandler) {
    return await matchingHandler.handle(node, context);
  }

  if (helpers.isText(node)) {
    return undefined;
  }

  return await visitChildren(node, context);
};

export default visitNode;
