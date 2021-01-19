// @ts-nocheck
import convert from 'hast-util-is-element/convert';
import toText from 'hast-util-to-text';
import has from 'hast-util-has-property';
import {
  allowedChildren,
  inlineNodeTypes,
} from 'datocms-structured-text-utils';

import visitAll from './visit-all';
import { wrap, needed as isWrapNeeded } from './wrap';

export async function root(createNode, node, context) {
  const children = await visitAll(createNode, node, {
    ...context,
    name: 'root',
  });

  if (children.some((child) => !allowedChildren.root.includes(child.type))) {
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
  const isAllowedChild = allowedChildren[context.name].includes('code');

  if (!isAllowedChild) {
    return inlineCode(createNode, node, context);
  }

  const prefix = context.codePrefix || 'language-';
  const isPre = convert('pre');
  const isCode = convert('code');
  const children = node.children;
  let index = -1;
  let classList;
  let language = {};

  if (isPre(node)) {
    while (++index < children.length) {
      if (isCode(children[index]) && has(children[index], 'className')) {
        classList = children[index].properties.className;
        break;
      }
    }
  } else if (isCode(node) && has(node, 'className')) {
    classList = node.properties.className;
  }

  if (classList) {
    index = -1;

    while (++index < classList.length) {
      if (classList[index].slice(0, prefix.length) === prefix) {
        language = { language: classList[index].slice(prefix.length) };
        break;
      }
    }
  }

  return createNode('code', {
    ...language,
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
export async function link(createNode, node, context) {
  // Links that aren't inside of a allowedChildren context
  // can still be valid Dast nodes in the following contexts if wrapped.
  const allowedChildrenWrapped = ['root', 'list', 'listItem'];

  let isAllowedChild =
    (allowedChildren[context.name] === 'inlineNodes'
      ? inlineNodeTypes
      : allowedChildren[context.name] || []
    ).includes('link') || allowedChildrenWrapped.includes(context.name);

  // When a link wraps headings we try to preserve the heading by inverting the parent-child relationship.
  // Essentially we tweak the nodes so that the heading wraps the link.
  //
  // @TODO this is only checking for headings that are direct descendants of links.
  // Decide if it is worth looking deeper.
  const wrapsHeadings = node.children.some(
    (child) => child.type === 'element' && child.tagName.startsWith('h'),
  );
  if (wrapsHeadings) {
    let i = 0;
    const splitChildren = [];
    node.children.forEach((child) => {
      if (child.type === 'element' && child.tagName.startsWith('h')) {
        splitChildren.push({
          ...child,
          children: [
            {
              ...node,
              children: child.children,
            },
          ],
        });
        i++;
      } else if (splitChildren[i]) {
        splitChildren[i].children.push(child);
      } else {
        splitChildren[i] = {
          ...node,
          children: [child],
        };
      }
    });

    node = {
      type: 'unknown',
      children: splitChildren,
    };
    isAllowedChild = false;
  }

  const children = await visitAll(createNode, node, {
    ...context,
    name: isAllowedChild ? 'link' : context.name,
  });

  if (children.length) {
    return isAllowedChild
      ? createNode('link', {
          url: resolveUrl(context, node.properties.href),
          children,
        })
      : children;
  }
}
export async function span(createNode, node, context) {
  const marks = Array.isArray(context.marks)
    ? { marks: [...context.marks] }
    : {};

  return createNode('span', {
    value: wrapText(context, node.value),
    ...marks,
  });
}

export const inlineCode = withMark('code');
export const strong = withMark('strong');
export const italic = withMark('emphasis');
export const underline = withMark('underline');
export const strikethrough = withMark('strikethrough');

export async function base(createNode, node, context) {
  if (!context.baseFound) {
    context.frozenBaseUrl = node.properties.href;
    context.baseFound = true;
  }
}
export async function noop() {}

export function withMark(type) {
  return function markHandler(createNode, node, context) {
    let marks = { marks: [type] };
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

  a: link,

  code: code,
  kbd: code,
  samp: code,
  tt: code,
  var: code,

  strong: strong,
  b: strong,

  em: italic,
  i: italic,

  u: underline,

  strike: strikethrough,
  s: strikethrough,

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
        children: [
          allowedChildren.listItem.includes(children[index].type)
            ? children[index]
            : createNode('paragraph', { children: [children[index]] }),
        ],
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
