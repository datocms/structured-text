/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

// @ts-ignore
import { CreateNodeFunction, ContentfulRootNode } from './types';
import visitNode from './visit-node';
import visitChildren from './visit-children';
import { handlers } from './handlers';
import {
  Document,
  Mark,
  BlockquoteType,
  CodeType,
  HeadingType,
  LinkType,
  ListType,
} from 'datocms-structured-text-utils';
import { MARKS, Mark as ContentfulMark } from '@contentful/rich-text-types';

export const datoToContentfulMarks: Record<ContentfulMark, Mark> = {
  [MARKS.BOLD]: 'strong',
  [MARKS.ITALIC]: 'emphasis',
  [MARKS.UNDERLINE]: 'underline',
  [MARKS.CODE]: 'code',
};

export type Options = Partial<{
  newlines: boolean;
  handlers: Record<string, CreateNodeFunction>;
  allowedBlocks: Array<
    BlockquoteType | CodeType | HeadingType | LinkType | ListType
  >;
  allowedMarks: Mark[];
}>;

export async function richTextToStructuredText(
  tree: ContentfulRootNode,
  options: Options = {},
): Promise<Document | null> {
  const createNode: CreateNodeFunction = (type, props) => {
    props.type = type;
    return props;
  };

  const rootNode = await visitNode(createNode, tree, {
    parentNodeType: 'root',
    parentNode: null,
    defaultHandlers: handlers,
    handlers: Object.assign({}, handlers, options.handlers || {}),
    allowedBlocks: Array.isArray(options.allowedBlocks)
      ? options.allowedBlocks
      : ['blockquote', 'code', 'heading', 'link', 'list'],
    allowedMarks: Array.isArray(options.allowedMarks)
      ? options.allowedMarks
      : Object.values(datoToContentfulMarks),
    global: {
      baseUrl: null,
      ...(options.shared || {}),
    },
  });

  if (rootNode) {
    return {
      schema: 'dast',
      document: rootNode,
    };
  }

  return null;
}

export { visitNode, visitChildren };
