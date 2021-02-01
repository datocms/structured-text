/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

// @ts-ignore
import minify from 'rehype-minify-whitespace';

import { Root, CreateNodeFunction, HastRootNode } from './types';
import visitNode from './visit-node';
import visitChildren from './visit-children';
import { handlers } from './handlers';
import parse5 from 'parse5';
import parse5DocumentToHast from 'hast-util-from-parse5';
import documentToHast from 'hast-util-from-dom';
import { Document } from 'datocms-structured-text-utils';

export type Settings = Partial<{
  newlines: boolean;
  handlers: Record<string, CreateNodeFunction>;
  preprocess: (hast: HastRootNode) => HastRootNode;
}>;

export async function htmlToStructuredText(
  html: string,
  settings: Settings = {},
): Promise<Root | null> {
  if (typeof DOMParser === 'undefined') {
    throw new Error(
      'DOMParser is not available. Consider using `parse5ToStructuredText` instead!',
    );
  }
  const document = new DOMParser().parseFromString(html, 'text/html');
  const tree = documentToHast(document);
  return hastToStructuredText(tree, settings);
}

export async function parse5ToStructuredText(
  document: parse5.Document,
  settings: Settings = {},
): Promise<Root | null> {
  const tree = parse5DocumentToHast(document);
  return hastToStructuredText(tree, settings);
}

export async function hastToStructuredText(
  tree: HastRootNode,
  settings: Settings = {},
): Promise<Document | null> {
  minify({ newlines: settings.newlines === true })(tree);

  const createNode: CreateNodeFunction = (type, props) => {
    props.type = type;
    return props;
  };

  if (typeof settings.preprocess === 'function') {
    settings.preprocess(tree);
  }

  const rootNode = await visitNode(createNode, tree, {
    parentNodeType: 'root',
    parentNode: null,
    defaultHandlers: handlers,
    handlers: Object.assign({}, handlers, settings.handlers || {}),
    wrapText: true,
    shared: {
      baseUrl: null,
      baseUrlFound: false,
      ...(settings.shared || {}),
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
