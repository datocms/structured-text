/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

// @ts-ignore
import minify from 'rehype-minify-whitespace';

import { CreateNodeFunction, HastRootNode } from './types';
import visitNode from './visit-node';
import visitChildren from './visit-children';
import { handlers } from './handlers';
import parse5 from 'parse5';
import parse5DocumentToHast from 'hast-util-from-parse5';
import documentToHast from 'hast-util-from-dom';
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
  preprocess: (hast: HastRootNode) => void;
  allowedBlocks: Array<
    BlockquoteType | CodeType | HeadingType | LinkType | ListType
  >;
  allowedMarks: Mark[];
}>;

export async function htmlToStructuredText(
  html: string,
  options: Options = {},
): Promise<Document | null> {
  if (typeof DOMParser === 'undefined') {
    throw new Error(
      'DOMParser is not available. Consider using `parse5ToStructuredText` instead!',
    );
  }
  const document = new DOMParser().parseFromString(html, 'text/html');
  const tree = documentToHast(document);
  return hastToStructuredText(tree, options);
}

export async function parse5ToStructuredText(
  document: parse5.Document,
  options: Options = {},
): Promise<Document | null> {
  const tree = parse5DocumentToHast(document);
  return hastToStructuredText(tree, options);
}

export async function hastToStructuredText(
  tree: HastRootNode,
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
