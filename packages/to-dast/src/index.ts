// @ts-ignore
import minify from 'rehype-minify-whitespace';

import {
  allowedChildren,
  Root,
  AllowedAttributes,
} from 'datocms-structured-text-utils';
import { Node, NodeType, CreateNodeFunction, HastRootNode } from './lib/types';

import { handlers } from './lib/handlers';

import visitNode from './lib/visit-node';
import { wrap, needed as isWrapNeeded } from './lib/wrap';

export type Settings = Partial<{
  newlines: boolean;
  handlers: Record<string, CreateNodeFunction>;
}>;

export async function htmlToDast(
  html: string,
  settings: Settings = {},
): Promise<Node> {
  const mode = typeof DOMParser !== 'undefined' ? 'dom' : 'node';
  const { parseHtml } = await import(`./lib/parse.${mode}`);
  const tree = parseHtml(html);
  return toDast(tree, settings);
}

export async function toDast(
  tree: HastRootNode,
  settings: Settings = {},
): Promise<Node> {
  minify({ newlines: settings.newlines === true })(tree);

  const createNode: CreateNodeFunction = (type, props) => {
    props.type = type;
    return props;
  };

  return await visitNode(createNode, tree, {
    parentNode: null,
    name: 'root',
    frozenBaseUrl: null,
    wrapText: true,
    handlers: Object.assign({}, handlers, settings.handlers || {}),
  });
}
