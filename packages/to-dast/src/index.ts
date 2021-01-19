import minify from 'rehype-minify-whitespace';

import { allowedChildren, Root } from 'datocms-structured-text-utils';

import { parseHtml } from './lib/parse.node';
import { wrap, needed as isWrapNeeded } from './lib/wrap';
import { handlers } from './lib/handlers';

import visitOne from './lib/visit-one';

export function htmlToDast(html: string, settings = {}) {
  const tree = parseHtml(html);
  return toDast(tree, settings);
}

export async function toDast(tree, settings = {}): Promise<Root> {
  minify({ newlines: settings.newlines === true })(tree);

  return await visitOne(createNode, tree, {
    parent: null,
    name: 'root',
    debug: settings.debug === true,
    frozenBaseUrl: null,
    wrapText: true,
    handlers: Object.assign({}, handlers, settings.handlers || {}),
  });

  function createNode(type, props = {}) {
    props.type = type;
    return props;
  }
}
