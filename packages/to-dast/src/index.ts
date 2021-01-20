// @ts-nocheck

import { Node as HastNode } from 'unist';
// @ts-ignore
import minify from 'rehype-minify-whitespace';

import {
  allowedChildren,
  Root,
  AllowedAttributes,
} from 'datocms-structured-text-utils';
import { Node, NodeType, CreateNodeFunction } from './lib/types';

import { parseHtml } from './lib/parse.node';
import { wrap, needed as isWrapNeeded } from './lib/wrap';
import { handlers } from './lib/handlers';

import visitOne from './lib/visit-one';

export type Settings = Partial<{
  newlines: boolean;
  debug: boolean;
  handlers: Record<string, CreateNodeFunction>;
}>;

export function htmlToDast(
  html: string,
  settings: Settings = {},
): Promise<Node> {
  const tree = parseHtml(html);
  return toDast(tree, settings);
}

export async function toDast(
  tree: HastNode,
  settings: Settings = {},
): Promise<Node> {
  minify({ newlines: settings.newlines === true })(tree);

  const createNode: CreateNodeFunction = (type, props) => {
    props.type = type;
    return props;
  };

  return await visitOne(createNode, tree, {
    parent: null,
    name: 'root',
    debug: settings.debug === true,
    frozenBaseUrl: null,
    wrapText: true,
    handlers: Object.assign({}, handlers, settings.handlers || {}),
  });
}
