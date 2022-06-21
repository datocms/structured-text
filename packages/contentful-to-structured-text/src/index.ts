/* eslint-disable @typescript-eslint/ban-ts-comment */

import { ContentfulDocument, Context as StructuredTextContext } from './types';
import visitNode from './helpers/visit-node';
import visitChildren from './helpers/visit-children';
import { handlers, Handler } from './handlers';
import {
  Document,
  Mark,
  BlockquoteType,
  CodeType,
  HeadingType,
  LinkType,
  ListType,
  Root,
} from 'datocms-structured-text-utils';
import { MARKS } from '@contentful/rich-text-types';

export { makeHandler } from './handlers';
export { liftAssets } from './helpers/lift-assets';
export {
  wrapLinksAndSpansInSingleParagraph,
  wrapInParagraph,
} from './helpers/wrap';

export const contentfulToDatoMark: Record<string, Mark> = {
  [MARKS.BOLD]: 'strong',
  [MARKS.ITALIC]: 'emphasis',
  [MARKS.UNDERLINE]: 'underline',
  [MARKS.CODE]: 'code',
};

export type Options = Partial<{
  newlines: boolean;
  handlers: Handler[];
  allowedBlocks: Array<
    BlockquoteType | CodeType | HeadingType | LinkType | ListType
  >;
  allowedMarks: Mark[];
}>;

export async function richTextToStructuredText(
  tree: ContentfulDocument | null,
  options: Options = {},
): Promise<Document | null> {
  if (!tree) {
    return null;
  }

  const rootNode = await visitNode(tree, {
    parentNodeType: 'root',
    parentNode: null,
    defaultHandlers: handlers,
    handlers: [...(options.handlers || []), ...handlers],
    allowedBlocks: Array.isArray(options.allowedBlocks)
      ? options.allowedBlocks
      : ['blockquote', 'code', 'heading', 'link', 'list'],
    allowedMarks: Array.isArray(options.allowedMarks)
      ? options.allowedMarks
      : Object.values(contentfulToDatoMark),
  });

  if (rootNode) {
    return {
      schema: 'dast',
      document: rootNode as Root,
    };
  }

  return null;
}

export { visitNode, visitChildren };

export * as ContentfulRichTextTypes from '@contentful/rich-text-types';
export type { Handler, StructuredTextContext };
