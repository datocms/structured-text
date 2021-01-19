import { Node as HastNode } from 'unist';
// @ts-ignore
import minify from 'rehype-minify-whitespace';

import {
  allowedChildren,
  Root,
  Node as DastNode,
  NodeType as DastNodeType,
  AllowedAttributes,
} from 'datocms-structured-text-utils';

import { parseHtml } from './lib/parse.node';
import { wrap, needed as isWrapNeeded } from './lib/wrap';
import { handlers } from './lib/handlers';

import visitOne from './lib/visit-one';

export type createNodeFunction = (
  type: DastNodeType,
  props: DastNode,
) => DastNode;

export type Settings = Partial<{
  newlines: boolean;
  debug: boolean;
  handlers: Record<string, createNodeFunction>;
}>;

export function htmlToDast(
  html: string,
  settings: Settings = {},
): Promise<Root> {
  const tree = parseHtml(html);
  return toDast(tree, settings);
}

export async function toDast(
  tree: HastNode,
  settings: Settings = {},
): Promise<Root> {
  minify({ newlines: settings.newlines === true })(tree);

  const createNode: createNodeFunction = (type, props) => {
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
