// @ts-nocheck
import convert from 'hast-util-is-element/convert';
import toText from 'hast-util-to-text';
import has from 'hast-util-has-property';
import { allowedChildren } from 'datocms-structured-text-utils';

import visitAll from './visit-all';
import { wrap, needed as isWrapNeeded } from './wrap';

export async function root(createNode, node, context) {
  const children = await visitAll(createNode, node, {
    ...context,
    name: 'root',
  });

  if (isWrapNeeded(children)) {
    children = wrap(children);
  }

  return createNode('root', { children });
}

export async function paragraph(createNode, node, context) {
  const isAllowedChild = allowedChildren[context.name].includes('paragraph');
  const children = await visitAll(createNode, node, {
    ...context,
    name: isAllowedChild ? 'paragraph' : context.name,
  });

  if (children.length) {
    return isAllowedChild ? createNode('paragraph', { children }) : children;
  }
}

export async function heading(createNode, node, context) {
  const isAllowedChild = allowedChildren[context.name].includes('heading');
  const children = await visitAll(createNode, node, {
    ...context,
    name: isAllowedChild ? 'heading' : context.name,
    wrapText: isAllowedChild ? false : context.wrapText,
  });

  if (children.length) {
    return isAllowedChild
      ? createNode('heading', {
          level: Number(node.tagName.charAt(1)) || 1,
          children,
        })
      : children;
  }
}

export async function code(createNode, node, context) {
  const isPre = convert('pre');
  const isCode = convert('code');
  const children = node.children;
  let index = -1;
  let classList;
  let language;

  if (isPre(node)) {
    while (++index < children.length) {
      if (isCode(children[index]) && has(children[index], 'className')) {
        classList = children[index].properties.className;
        break;
      }
    }
  }

  if (classList) {
    index = -1;

    while (++index < classList.length) {
      if (classList[index].slice(0, prefix.length) === prefix) {
        language = classList[index].slice(prefix.length);
        break;
      }
    }
  }

  return createNode('code', {
    language,
    code: String(wrapText(context, toText(node))).replace(/\n+$/, ''),
  });
}

export async function blockquote(createNode, node, context) {
  const isAllowedChild = allowedChildren[context.name].includes('blockquote');
  const children = await visitAll(createNode, node, {
    ...context,
    name: isAllowedChild ? 'blockquote' : context.name,
  });

  if (children.length) {
    return isAllowedChild
      ? createNode('blockquote', { children: wrap(children) })
      : children;
  }
}
export async function list(createNode, node, context) {
  const isAllowedChild = allowedChildren[context.name].includes('list');

  if (!isAllowedChild) {
    return await visitAll(createNode, node, context);
  }

  const children = await wrapListItems(createNode, node, {
    ...context,
    name: 'list',
  });

  if (children.length) {
    return createNode('list', { children });
  }
}
export async function listItem(createNode, node, context) {
  const isAllowedChild = allowedChildren[context.name].includes('listItem');
  const children = await visitAll(createNode, node, {
    ...context,
    name: isAllowedChild ? 'listItem' : context.name,
  });

  if (children.length) {
    return isAllowedChild
      ? createNode('listItem', {
          children: wrap(children),
        })
      : children;
  }
}
export async function hyperLink(createNode, node, context) {
  const isAllowedChild = allowedChildren[context.name].includes('hyperLink');
  const children = await visitAll(createNode, node, {
    ...context,
    name: isAllowedChild ? 'hyperLink' : context.name,
  });

  if (children.length) {
    return isAllowedChild
      ? createNode('hyperLink', {
          url: resolveUrl(context, node.properties.href),
          children: wrap(children),
        })
      : children;
  }
}
export async function span(createNode, node, context) {
  return createNode('span', {
    value: wrapText(context, node.value),
    marks: Array.isArray(context.marks) ? context.marks : null,
  });
}

export const inlineCode = withMark('code');
export const strong = withMark('strong');
export const italic = withMark('emphasis');
export const underline = withMark('underline');

export async function base(createNode, node, context) {
  if (!context.baseFound) {
    context.frozenBaseUrl = node.properties.href;
    context.baseFound = true;
  }
}
export async function noop() {}

export function withMark(type) {
  return function markHandler(createNode, node, context) {
    let marks = {};
    if (Array.isArray(context.marks)) {
      marks = {
        marks: context.marks.includes(type)
          ? context.marks
          : context.marks.concat([type]),
      };
    }
    return visitAll(createNode, node, {
      ...context,
      ...marks,
    });
  };
}

export const handlers = {
  root: root,

  p: paragraph,
  summary: paragraph,

  h1: heading,
  h2: heading,
  h3: heading,
  h4: heading,
  h5: heading,
  h6: heading,

  ul: list,
  ol: list,
  dir: list,

  dt: listItem,
  dd: listItem,
  li: listItem,

  listing: code,
  plaintext: code,
  pre: code,
  xmp: code,

  blockquote: blockquote,

  a: hyperLink,

  code: inlineCode,
  kbd: inlineCode,
  samp: inlineCode,
  tt: inlineCode,
  var: inlineCode,

  strong: strong,
  b: strong,

  em: italic,
  i: italic,

  u: underline,

  base: base,

  comment: noop,
  head: noop,
  script: noop,
  style: noop,
  title: noop,

  text: span,
};

export async function wrapListItems(createNode, node, context) {
  const children = await visitAll(createNode, node, context);

  let index = -1;

  while (++index < children.length) {
    if (children[index].type !== 'listItem') {
      children[index] = {
        type: 'listItem',
        children: [children[index]],
      };
    }
  }

  return children;
}

export function wrapText(context, value) {
  return context.wrapText ? value : value.replace(/\r?\n|\r/g, ' ');
}

export function resolveUrl(context, url) {
  if (url === null || url === undefined) {
    return '';
  }

  /* istanbul ignore next - ignored for older Node */
  if (context.frozenBaseUrl && typeof URL !== 'undefined') {
    return String(new URL(url, context.frozenBaseUrl));
  }

  return url;
}
