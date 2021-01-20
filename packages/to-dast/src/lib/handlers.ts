import convert from 'hast-util-is-element/convert';
import toText from 'hast-util-to-text';
import has from 'hast-util-has-property';
import {
  allowedChildren,
  inlineNodeTypes,
} from 'datocms-structured-text-utils';

import {
  Handler,
  Node,
  Mark,
  Context,
  HastNode,
  HastTextNode,
  HastElementNode,
  HastRootNode,
} from './types';

import visitAll from './visit-all';
import { wrap, needed as isWrapNeeded } from './wrap';

export const root: Handler<HastRootNode> = async function root(
  createNode,
  node,
  context,
) {
  let children = await visitAll(createNode, node, {
    ...context,
    name: 'root',
  });

  if (
    Array.isArray(children) &&
    children.some(
      (child: HastNode) => child && !allowedChildren.root.includes(child.type),
    )
  ) {
    children = wrap(children);
  }

  return createNode('root', {
    children: Array.isArray(children) ? children : [],
  });
};

export const paragraph: Handler<HastElementNode> = async function paragraph(
  createNode,
  node,
  context,
) {
  const isAllowedChild = allowedChildren[context.name].includes('paragraph');

  const children = await visitAll(createNode, node, {
    ...context,
    name: isAllowedChild ? 'paragraph' : context.name,
  });

  if (Array.isArray(children) && children.length) {
    return isAllowedChild ? createNode('paragraph', { children }) : children;
  }
  return undefined;
};

export const heading: Handler<HastElementNode> = async function heading(
  createNode,
  node,
  context,
) {
  const isAllowedChild = allowedChildren[context.name].includes('heading');

  const children = await visitAll(createNode, node, {
    ...context,
    name: isAllowedChild ? 'heading' : context.name,
    wrapText: isAllowedChild ? false : context.wrapText,
  });

  if (Array.isArray(children) && children.length) {
    return isAllowedChild
      ? createNode('heading', {
          level: Number(node.tagName.charAt(1)) || 1,
          children,
        })
      : children;
  }
  return undefined;
};

export const code: Handler<HastElementNode> = async function code(
  createNode,
  node,
  context,
) {
  const isAllowedChild = allowedChildren[context.name].includes('code');

  if (!isAllowedChild) {
    return inlineCode(createNode, node, context);
  }

  const prefix =
    typeof context.codePrefix === 'string' ? context.codePrefix : 'language-';
  const isPre = convert('pre');
  const isCode = convert('code');
  const children = node.children;
  let index = -1;
  let classList = null;
  let language = {};

  if (isPre(node)) {
    while (++index < children.length) {
      if (
        typeof children[index] === 'object' &&
        isCode(children[index]) &&
        has(children[index], 'className')
      ) {
        // error TS2339: Property 'properties' does not exist on type 'HastNode'.
        //               Property 'properties' does not exist on type 'HastTextNode'
        // isCode (convert) checks that the node is an element and therefore it'll have properties
        // @ts-ignore
        classList = children[index].properties.className;
        break;
      }
    }
  } else if (isCode(node) && has(node, 'className')) {
    classList = node.properties.className;
  }

  if (typeof classList === 'string') {
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
};

export const blockquote: Handler<HastElementNode> = async function blockquote(
  createNode,
  node,
  context,
) {
  const isAllowedChild = allowedChildren[context.name].includes('blockquote');
  const children = await visitAll(createNode, node, {
    ...context,
    name: isAllowedChild ? 'blockquote' : context.name,
  });

  if (Array.isArray(children) && children.length) {
    return isAllowedChild
      ? createNode('blockquote', { children: wrap(children) })
      : children;
  }
  return undefined;
};
export const list: Handler<HastElementNode> = async function list(
  createNode,
  node,
  context,
) {
  const isAllowedChild = allowedChildren[context.name].includes('list');

  if (!isAllowedChild) {
    return await visitAll(createNode, node, context);
  }

  const children = await wrapListItems(createNode, node, {
    ...context,
    name: 'list',
  });

  if (Array.isArray(children) && children.length) {
    return createNode('list', { children, style: 'bulleted' });
  }
  return undefined;
};
export const listItem: Handler<HastElementNode> = async function listItem(
  createNode,
  node,
  context,
) {
  const isAllowedChild = allowedChildren[context.name].includes('listItem');
  const children = await visitAll(createNode, node, {
    ...context,
    name: isAllowedChild ? 'listItem' : context.name,
  });

  if (Array.isArray(children) && children.length) {
    return isAllowedChild
      ? createNode('listItem', {
          children: wrap(children),
        })
      : children;
  }
  return undefined;
};
export const link: Handler<HastElementNode> = async function link(
  createNode,
  node,
  context,
) {
  let isAllowedChild = false;

  if (allowedChildren[context.name] === 'inlineNodes') {
    isAllowedChild = inlineNodeTypes.includes('link');
  } else if (Array.isArray(allowedChildren[context.name])) {
    isAllowedChild = allowedChildren[context.name].includes('link');
  }

  if (!isAllowedChild) {
    // Links that aren't inside of a allowedChildren context
    // can still be valid Dast nodes in the following contexts if wrapped.
    const allowedChildrenWrapped = ['root', 'list', 'listItem'];
    isAllowedChild = allowedChildrenWrapped.includes(context.name);
  }

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
    const splitChildren: HastElementNode[] = [];
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

    node.children = splitChildren;
    isAllowedChild = false;
  }

  const children = await visitAll(createNode, node, {
    ...context,
    name: isAllowedChild ? 'link' : context.name,
  });

  if (Array.isArray(children) && children.length) {
    return isAllowedChild
      ? createNode('link', {
          url: resolveUrl(context, node.properties.href),
          children,
        })
      : children;
  }
  return undefined;
};
export const span: Handler<HastTextNode> = async function span(
  createNode,
  node,
  context,
) {
  const marks = Array.isArray(context.marks)
    ? { marks: [...context.marks] }
    : {};

  return createNode('span', {
    value: wrapText(context, node.value),
    ...marks,
  });
};

export const inlineCode = withMark('code');
export const strong = withMark('strong');
export const italic = withMark('emphasis');
export const underline = withMark('underline');
export const strikethrough = withMark('strikethrough');

export const base: Handler<HastElementNode> = async function base(
  createNode,
  node,
  context,
) {
  if (
    !context.baseFound &&
    typeof node.properties === 'object' &&
    node.properties.href
  ) {
    context.frozenBaseUrl = node.properties.href;
    context.baseFound = true;
  }
};
export async function noop() {}

export function withMark(type: Mark): Handler<HastElementNode> {
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

export const wrapListItems: Handler<HastElementNode> = async function wrapListItems(
  createNode,
  node,
  context,
) {
  const children = await visitAll(createNode, node, context);

  if (!Array.isArray(children)) {
    return [];
  }

  let index = -1;
  let child;

  while (++index < children.length) {
    if (
      typeof children[index] !== 'undefined' &&
      children[index].type !== 'listItem'
    ) {
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
};

export function wrapText(context: Context, value: string) {
  return context.wrapText ? value : value.replace(/\r?\n|\r/g, ' ');
}

export function resolveUrl(context: Context, url: string | null | undefined) {
  if (url === null || url === undefined) {
    return '';
  }

  /* istanbul ignore next - ignored for older Node */
  if (context.frozenBaseUrl && typeof URL !== 'undefined') {
    return String(new URL(url, context.frozenBaseUrl));
  }

  return url;
}
