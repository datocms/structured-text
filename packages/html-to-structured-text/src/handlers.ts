/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import convert from 'hast-util-is-element/convert';
import toText from 'hast-util-to-text';
import has from 'hast-util-has-property';
import {
  allowedChildren,
  inlineNodeTypes,
} from 'datocms-structured-text-utils';

import {
  Handler,
  Mark,
  Context,
  HastNode,
  HastTextNode,
  HastElementNode,
  HastRootNode,
} from './types';

import visitChildren from './visit-children';
import { wrap } from './wrap';

export const root: Handler<HastRootNode> = async function root(
  createNode,
  node,
  context,
) {
  let children = await visitChildren(createNode, node, {
    ...context,
    parentNodeType: 'root',
  });

  if (
    Array.isArray(children) &&
    children.some(
      (child: HastNode) => child && !allowedChildren.root.includes(child.type),
    )
  ) {
    children = wrap(children);
  }

  if (!Array.isArray(children) || children.length === 0) {
    return null;
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
  const isAllowedChild = allowedChildren[context.parentNodeType].includes(
    'paragraph',
  );

  const children = await visitChildren(createNode, node, {
    ...context,
    parentNodeType: isAllowedChild ? 'paragraph' : context.parentNodeType,
  });

  if (Array.isArray(children) && children.length) {
    return isAllowedChild ? createNode('paragraph', { children }) : children;
  }
  return undefined;
};

export const thematicBreak: Handler<HastElementNode> = async function thematicBreak(
  createNode,
  node,
  context,
) {
  const isAllowedChild = allowedChildren[context.parentNodeType].includes(
    'thematicBreak',
  );

  return isAllowedChild ? createNode('thematicBreak', {}) : undefined;
};

export const heading: Handler<HastElementNode> = async function heading(
  createNode,
  node,
  context,
) {
  const isAllowedChild =
    allowedChildren[context.parentNodeType].includes('heading') &&
    context.allowedBlocks.includes('heading');

  const children = await visitChildren(createNode, node, {
    ...context,
    parentNodeType: isAllowedChild ? 'heading' : context.parentNodeType,
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
  const isAllowedChild = allowedChildren[context.parentNodeType].includes(
    'code',
  );

  if (!isAllowedChild) {
    return inlineCode(createNode, node, context);
  }

  if (!context.allowedBlocks.includes('code')) {
    return visitChildren(createNode, node, context);
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

  if (Array.isArray(classList)) {
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
  const isAllowedChild =
    allowedChildren[context.parentNodeType].includes('blockquote') &&
    context.allowedBlocks.includes('blockquote');

  const children = await visitChildren(createNode, node, {
    ...context,
    parentNodeType: isAllowedChild ? 'blockquote' : context.parentNodeType,
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
  const isAllowedChild =
    allowedChildren[context.parentNodeType].includes('list') &&
    context.allowedBlocks.includes('list');

  if (!isAllowedChild) {
    return await visitChildren(createNode, node, context);
  }

  const children = await wrapListItems(createNode, node, {
    ...context,
    parentNodeType: 'list',
  });

  if (Array.isArray(children) && children.length) {
    return createNode('list', {
      children,
      style: node.tagName === 'ol' ? 'numbered' : 'bulleted',
    });
  }
  return undefined;
};
export const listItem: Handler<HastElementNode> = async function listItem(
  createNode,
  node,
  context,
) {
  const isAllowedChild =
    allowedChildren[context.parentNodeType].includes('listItem') &&
    context.allowedBlocks.includes('list');

  const children = await visitChildren(createNode, node, {
    ...context,
    parentNodeType: isAllowedChild ? 'listItem' : context.parentNodeType,
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
  if (!context.allowedBlocks.includes('link')) {
    return visitChildren(createNode, node, context);
  }

  let isAllowedChild = false;

  if (allowedChildren[context.parentNodeType] === 'inlineNodes') {
    isAllowedChild = inlineNodeTypes.includes('link');
  } else if (Array.isArray(allowedChildren[context.parentNodeType])) {
    isAllowedChild = allowedChildren[context.parentNodeType].includes('link');
  }

  if (!isAllowedChild) {
    // Links that aren't inside of a allowedChildren context
    // can still be valid `dast` nodes in the following contexts if wrapped.
    const allowedChildrenWrapped = ['root', 'list', 'listItem'];
    isAllowedChild = allowedChildrenWrapped.includes(context.parentNodeType);
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
        if (splitChildren.length > 0) {
          i++;
        }
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

  const children = await visitChildren(createNode, node, {
    ...context,
    parentNodeType: isAllowedChild ? 'link' : context.parentNodeType,
  });

  if (Array.isArray(children) && children.length) {
    if (!isAllowedChild) {
      return children;
    }

    const props = {
      url: resolveUrl(context, node.properties.href),
      children,
    };

    const meta = {};

    if (node.properties) {
      if (node.properties.target === '_blank') {
        meta.openInNewWindow = true;
      }

      ['rel', 'title'].forEach((attr) => {
        if (node.properties[attr]) {
          meta[attr] = node.properties[attr];
        }
      });
    }

    if (Object.keys(meta).length > 0) {
      props.meta = meta;
    }

    return createNode('link', props);
  }
  return undefined;
};
export const span: Handler<HastTextNode> = async function span(
  createNode,
  node,
  context,
) {
  const marks = {};

  if (Array.isArray(context.marks)) {
    const allowedMarks = context.marks.filter((mark) =>
      context.allowedMarks.includes(mark),
    );
    if (allowedMarks.length > 0) {
      marks.marks = allowedMarks;
    }
  }

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
export const highlight = withMark('highlight');

export const head: Handler<HastElementNode> = async function head(
  createNode,
  node,
  context,
) {
  const baseElement = node.children.find((child) => child.tagName === 'base');
  if (baseElement) {
    return context.handlers.base(createNode, baseElement, context);
  } else {
    return undefined;
  }
};

export const base: Handler<HastElementNode> = async function base(
  createNode,
  node,
  context,
) {
  if (
    !context.global.baseUrlFound &&
    typeof node.properties === 'object' &&
    node.properties.href
  ) {
    context.global.baseUrl = node.properties.href.replace(/\/$/, '');
    context.global.baseUrlFound = true;
  }
};

export const extractInlineStyles: Handler<HastElementNode> = async function extractInlineStyles(
  createNode,
  node,
  context,
) {
  let marks = { marks: Array.isArray(context.marks) ? context.marks : [] };
  if (node.properties && typeof node.properties.style === 'string') {
    const newMarks = [];
    node.properties.style.split(';').forEach((declaration) => {
      const [firstChunk, ...otherChunks] = declaration.split(':');
      const prop = firstChunk.trim();
      const value = otherChunks.join(':').trim();
      switch (prop) {
        case 'font-weight':
          if (value === 'bold' || Number(value) > 400) {
            newMarks.push('strong');
          }
          break;
        case 'font-style':
          if (value === 'italic') {
            newMarks.push('emphasis');
          }
          break;
        case 'text-decoration':
          if (value === 'underline') {
            newMarks.push('underline');
          }
          break;
        default:
          break;
      }
    });
    if (newMarks.length > 0) {
      marks.marks = marks.marks.concat(
        newMarks.filter(
          (mark) =>
            !marks.marks.includes(mark) && context.allowedMarks.includes(mark),
        ),
      );
    }
  }
  if (marks.marks.length === 0) {
    marks = {};
  }
  return visitChildren(createNode, node, {
    ...context,
    ...marks,
  });
};

// eslint-disable-next-line @typescript-eslint/no-empty-function,  @typescript-eslint/explicit-module-boundary-types
export async function noop() {}

export function withMark(type: Mark): Handler<HastElementNode> {
  return function markHandler(createNode, node, context) {
    if (!context.allowedMarks.includes(type)) {
      return visitChildren(createNode, node, context);
    }

    let marks = { marks: [type] };
    if (Array.isArray(context.marks)) {
      marks = {
        marks: context.marks.includes(type)
          ? context.marks
          : context.marks.concat([type]),
      };
    }
    return visitChildren(createNode, node, {
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

  mark: highlight,

  base: base,

  span: extractInlineStyles,
  text: span,

  hr: thematicBreak,

  head: head,
  comment: noop,
  script: noop,
  style: noop,
  title: noop,
  video: noop,
  audio: noop,
  embed: noop,
  iframe: noop,
};

export const wrapListItems: Handler<HastElementNode> = async function wrapListItems(
  createNode,
  node,
  context,
) {
  const children = await visitChildren(createNode, node, context);

  if (!Array.isArray(children)) {
    return [];
  }

  let index = -1;
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

export function wrapText(context: Context, value: string): string {
  return context.wrapText ? value : value.replace(/\r?\n|\r/g, ' ');
}

export function resolveUrl(
  context: Context,
  url: string | null | undefined,
): string {
  if (url === null || url === undefined) {
    return '';
  }

  if (context.global.baseUrl && typeof URL !== 'undefined') {
    const isRelative = /^\.?\//.test(url);
    const parsed = new URL(url, context.global.baseUrl);
    if (isRelative) {
      const parsedBase = new URL(context.global.baseUrl);
      if (!parsed.pathname.startsWith(parsedBase.pathname)) {
        parsed.pathname = `${parsedBase.pathname}${parsed.pathname}`;
      }
    }
    return parsed.toString();
  }

  return url;
}
