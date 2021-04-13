/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

// @ts-ignore
import minify from 'rehype-minify-whitespace';

import { CreateNodeFunction, ContentfulRootNode } from './types';
import visitNode from './visit-node';
import visitChildren from './visit-children';
import { handlers } from './handlers';
import {
  Document,
  allowedMarks,
  Mark,
  BlockquoteType,
  CodeType,
  HeadingType,
  LinkType,
  ListType,
} from 'datocms-structured-text-utils';

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
  minify({ newlines: options.newlines === true })(tree);

  const createNode: CreateNodeFunction = (type, props) => {
    props.type = type;
    return props;
  };

  if (typeof options.preprocess === 'function') {
    options.preprocess(tree);
  }

  const rootNode = await visitNode(createNode, tree, {
    parentNodeType: 'root',
    parentNode: null,
    defaultHandlers: handlers,
    handlers: Object.assign({}, handlers, options.handlers || {}),
    wrapText: true,
    allowedBlocks: Array.isArray(options.allowedBlocks)
      ? options.allowedBlocks
      : ['blockquote', 'code', 'heading', 'link', 'list'],
    allowedMarks: Array.isArray(options.allowedMarks)
      ? options.allowedMarks
      : allowedMarks,
    global: {
      baseUrl: null,
      baseUrlFound: false,
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
