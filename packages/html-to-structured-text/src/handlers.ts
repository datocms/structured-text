import convert from 'hast-util-is-element/convert';
import toText from 'hast-util-to-text';
import has from 'hast-util-has-property';
import {
  allowedChildren,
  inlineNodeTypes,
  Mark,
} from 'datocms-structured-text-utils';

import {
  Handler,
  Context,
  HastNode,
  HastElementNode,
  Node,
  CreateNodeFunction,
} from './types';

import { Heading as DastHeading } from 'datocms-structured-text-utils';

import visitChildren from './visit-children';
import { wrap } from './wrap';

export const root: Handler = async function root(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
) {
  let children = await visitChildren(createNode, node, {
    ...context,
    parentNodeType: 'root',
  });

  if (
    Array.isArray(children) &&
    children.some(
      (child) => child && !allowedChildren.root.includes(child.type),
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

export const paragraph: Handler = async function paragraph(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
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

export const thematicBreak: Handler = async function thematicBreak(
  createNode: CreateNodeFunction,
  _node: HastNode,
  context: Context,
) {
  const isAllowedChild = allowedChildren[context.parentNodeType].includes(
    'thematicBreak',
  );

  return isAllowedChild ? createNode('thematicBreak', {}) : undefined;
};

export const heading: Handler = async function heading(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
) {
  if (node.type !== 'element') return undefined;
  const level = (Number(node.tagName.charAt(1)) || 1) as DastHeading['level'];

  const isAllowedChild =
    allowedChildren[context.parentNodeType].includes('heading') &&
    context.allowedBlocks.includes('heading') &&
    context.allowedHeadingLevels.includes(level);

  const children = await visitChildren(createNode, node, {
    ...context,
    parentNodeType: isAllowedChild ? 'heading' : context.parentNodeType,
    wrapText: isAllowedChild ? false : context.wrapText,
  });

  if (Array.isArray(children) && children.length) {
    return isAllowedChild
      ? createNode('heading', {
          level,
          children,
        })
      : children;
  }
  return undefined;
};

export const code: Handler = async function code(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
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
  const children =
    node.type === 'element' || node.type === 'root' ? node.children || [] : [];
  let index = -1;
  let classList: string[] | null = null;
  let language: Record<string, string> = {};

  if (isPre(node)) {
    while (++index < children.length) {
      const child = children[index];
      if (
        typeof child === 'object' &&
        child.type === 'element' &&
        isCode(child) &&
        has(child, 'className')
      ) {
        classList = child.properties?.className || null;
        break;
      }
    }
  } else if (
    node.type === 'element' &&
    isCode(node) &&
    has(node, 'className')
  ) {
    classList = node.properties?.className || null;
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

export const blockquote: Handler = async function blockquote(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
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
export const list: Handler = async function list(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
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
      style:
        node.type === 'element' && node.tagName === 'ol'
          ? 'numbered'
          : 'bulleted',
    });
  }
  return undefined;
};
export const listItem: Handler = async function listItem(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
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
export const link: Handler = async function link(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
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

  if (node.type !== 'element') return undefined;
  const e = node;
  const nodeChildren = e.children || [];

  // When a link wraps headings we try to preserve the heading by inverting the parent-child relationship.
  // Essentially we tweak the nodes so that the heading wraps the link.
  //
  // @TODO this is only checking for headings that are direct descendants of links.
  // Decide if it is worth looking deeper.
  const wrapsHeadings = nodeChildren.some(
    (child) => child.type === 'element' && child.tagName.startsWith('h'),
  );
  if (wrapsHeadings) {
    let i = 0;
    const splitChildren: HastElementNode[] = [];
    nodeChildren.forEach((child) => {
      if (child.type === 'element' && child.tagName.startsWith('h')) {
        if (splitChildren.length > 0) {
          i++;
        }
        splitChildren.push({
          ...child,
          children: [
            {
              ...e,
              children: child.children,
            },
          ],
        });
        i++;
      } else if (splitChildren[i]) {
        const sc = splitChildren[i];
        sc.children = sc.children || [];
        sc.children.push(child);
      } else {
        splitChildren[i] = {
          ...e,
          children: [child],
        };
      }
    });

    e.children = splitChildren;
    isAllowedChild = false;
  }

  const children = await visitChildren(createNode, node, {
    ...context,
    parentNodeType: isAllowedChild ? 'link' : context.parentNodeType,
    marks: Array.isArray(context.marks)
      ? context.marks.filter((m) => m !== 'underline')
      : context.marks,
  });

  if (Array.isArray(children) && children.length) {
    if (!isAllowedChild) {
      return children;
    }

    const nodeProps = e.properties;
    const meta: Array<{ id: string; value: string }> = [];

    if (nodeProps) {
      ['target', 'rel', 'title'].forEach((attr) => {
        const value = Array.isArray(nodeProps[attr])
          ? (nodeProps[attr] as string[]).join(' ')
          : nodeProps[attr];
        if (value) {
          meta.push({ id: attr, value: String(value) });
        }
      });
    }

    return createNode('link', {
      url: resolveUrl(context, nodeProps?.href),
      children,
      ...(meta.length > 0 ? { meta } : {}),
    });
  }
  return undefined;
};
export const span: Handler = async function span(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
) {
  if (node.type !== 'text') return undefined;

  const marks: { marks?: Mark[] } = {};

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

export const newLine: Handler = async function newLine(
  createNode: CreateNodeFunction,
) {
  return createNode('span', {
    value: '\n',
  });
};

export const inlineCode = withMark('code');
export const strong = withMark('strong');
export const italic = withMark('emphasis');
export const underline = withMark('underline');
export const strikethrough = withMark('strikethrough');
export const highlight = withMark('highlight');

export const head: Handler = async function head(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
) {
  if (node.type !== 'element') return undefined;
  const baseElement = (node.children || []).find(
    (child) => child.type === 'element' && child.tagName === 'base',
  );
  if (baseElement) {
    return context.handlers.base(createNode, baseElement, context);
  } else {
    return undefined;
  }
};

export const base: Handler = async function base(
  _createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
) {
  if (node.type !== 'element') return undefined;
  if (
    !context.global.baseUrlFound &&
    typeof node.properties === 'object' &&
    node.properties?.href
  ) {
    context.global.baseUrl = String(node.properties.href).replace(/\/$/, '');
    context.global.baseUrlFound = true;
  }
  return undefined;
};

export const extractInlineStyles: Handler = async function extractInlineStyles(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
) {
  const accumulated: Mark[] = Array.isArray(context.marks)
    ? [...context.marks]
    : [];
  const properties = node.type === 'element' ? node.properties : undefined;
  if (properties && typeof properties.style === 'string') {
    const newMarks: Mark[] = [];
    String(properties.style)
      .split(';')
      .forEach((declaration) => {
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
    newMarks.forEach((mark) => {
      if (
        !accumulated.includes(mark) &&
        context.allowedMarks.includes(mark) &&
        !(context.parentNodeType === 'link' && mark === 'underline')
      ) {
        accumulated.push(mark);
      }
    });
  }
  const marksContext: { marks?: Mark[] } =
    accumulated.length > 0 ? { marks: accumulated } : {};
  return visitChildren(createNode, node, {
    ...context,
    ...marksContext,
  });
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop(): void {}

export function withMark(type: Mark): Handler {
  return function markHandler(
    createNode: CreateNodeFunction,
    node: HastNode,
    context: Context,
  ) {
    if (
      !context.allowedMarks.includes(type) ||
      (context.parentNodeType === 'link' && type === 'underline')
    ) {
      return visitChildren(createNode, node, context);
    }

    const marks: { marks: Mark[] } = Array.isArray(context.marks)
      ? {
          marks: context.marks.includes(type)
            ? context.marks
            : context.marks.concat([type]),
        }
      : { marks: [type] };
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
  br: newLine,

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

export async function wrapListItems(
  createNode: CreateNodeFunction,
  node: HastNode,
  context: Context,
): Promise<Node[]> {
  const children = await visitChildren(createNode, node, context);

  if (!Array.isArray(children)) {
    return [];
  }

  let index = -1;
  while (++index < children.length) {
    const child = children[index];
    if (typeof child !== 'undefined' && child.type !== 'listItem') {
      const wrappedChild = allowedChildren.listItem.includes(child.type)
        ? child
        : createNode('paragraph', { children: [child] });
      children[index] = createNode('listItem', {
        children: [wrappedChild],
      });
    }
  }

  return children;
}

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
