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

export type Settings = Partial<{
  newlines: boolean;
  handlers: Record<string, CreateNodeFunction>;
  preprocess: (hast: HastRootNode) => HastRootNode;
}>;

export async function htmlToDast(
  html: string,
  settings: Settings = {},
): Promise<Root> {
  if (typeof DOMParser === 'undefined') {
    throw new Error(
      'DOMParser is not available. Consider using `parse5ToDast` instead!',
    );
  }
  const document = new DOMParser().parseFromString(html, 'text/html');
  const tree = documentToHast(document);
  return hastToDast(tree, settings);
}

export async function parse5ToDast(
  document: parse5.Document,
  settings: Settings = {},
): Promise<Root> {
  const tree = parse5DocumentToHast(document);
  return hastToDast(tree, settings);
}

export async function hastToDast(
  tree: HastRootNode,
  settings: Settings = {},
): Promise<Root> {
  minify({ newlines: settings.newlines === true })(tree);

  const createNode: CreateNodeFunction = (type, props) => {
    props.type = type;
    return props;
  };

  if (typeof settings.preprocess === 'function') {
    settings.preprocess(tree);
  }

  return await visitNode(createNode, tree, {
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
}

export { visitNode, visitChildren };
