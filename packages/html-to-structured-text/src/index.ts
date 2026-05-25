import minify from 'rehype-minify-whitespace';

import type { CreateNodeFunction, NodeOf } from './types.js';
import type { Root as HastRoot } from 'hast';
import visitNode from './visit-node.js';
import visitChildren from './visit-children.js';
import { handlers } from './handlers.js';
import type { DefaultTreeAdapterMap } from 'parse5';
import { fromParse5 } from 'hast-util-from-parse5';
import { fromDom } from 'hast-util-from-dom';
import {
  Document,
  defaultMarks,
  Mark,
  BlockquoteType,
  CodeType,
  HeadingType,
  LinkType,
  ListType,
  Heading,
} from 'datocms-structured-text-utils';
import type { Handler } from './types.js';

export type Options = Partial<{
  newlines: boolean;
  handlers: Record<string, Handler>;
  preprocess: (hast: HastRoot) => void;
  allowedBlocks: Array<
    BlockquoteType | CodeType | HeadingType | LinkType | ListType
  >;
  allowedHeadingLevels: Heading['level'][];
  allowedMarks: Mark[];
  shared: Record<string, unknown>;
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
  const tree = fromDom(document) as HastRoot;
  return hastToStructuredText(tree, options);
}

export async function parse5ToStructuredText(
  document: DefaultTreeAdapterMap['document'],
  options: Options = {},
): Promise<Document | null> {
  const tree = fromParse5(document) as HastRoot;
  return hastToStructuredText(tree, options);
}

export async function hastToStructuredText(
  tree: HastRoot,
  options: Options = {},
): Promise<Document | null> {
  minify({ newlines: options.newlines === true })(tree);

  const createNode: CreateNodeFunction = (type, props) => {
    return { type, ...props } as unknown as NodeOf<typeof type>;
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
      : defaultMarks,
    allowedHeadingLevels: Array.isArray(options.allowedHeadingLevels)
      ? options.allowedHeadingLevels
      : [1, 2, 3, 4, 5, 6],
    global: {
      baseUrl: null,
      baseUrlFound: false,
      ...(options.shared || {}),
    },
  });

  if (rootNode && !Array.isArray(rootNode) && rootNode.type === 'root') {
    return {
      schema: 'dast' as const,
      document: rootNode,
    };
  }

  return null;
}

export { visitNode, visitChildren };

export * from './types.js';
