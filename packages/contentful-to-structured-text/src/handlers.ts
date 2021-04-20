/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import {
  allowedChildren,
  inlineNodeTypes,
} from 'datocms-structured-text-utils';
import { BLOCKS, INLINES } from '@contentful/rich-text-types';
import {
  Handler,
  Context,
  ContentfulNode,
  ContentfulTextNode,
  ContentfulRootNode,
  ContentfulParagraph,
  ContentfulHeading,
  ContentfulQuote,
  ContentfulHr,
  ContentfulList,
  ContentfulListItem,
  ContentfulHyperLink,
} from './types';
import { wrap } from './wrap';

import visitChildren from './visit-children';
import { MetaEntry } from '../../utils/dist/types';
import { datoToContentfulMarks } from './index';

export const root: Handler<ContentfulRootNode> = async function root(
  createNode,
  node,
  context,
) {
  const children = await visitChildren(createNode, node, {
    ...context,
    parentNodeType: 'root',
  });

  if (!Array.isArray(children) || children.length === 0) {
    return null;
  }

  if (
    children.some(
      (child: ContentfulNode) =>
        child && !allowedChildren.root.includes(child.type),
    )
  ) {
    children = wrap(children);
  }

  return createNode('root', { children });
};

export const span: Handler<ContentfulTextNode> = async function span(
  createNode,
  node,
  context,
) {
  const marks = {};

  if (Array.isArray(node.marks) && node.marks.length > 0) {
    const allowedMarks = node.marks
      .map((m) => m.type)
      .filter((mark) =>
        context.allowedMarks.includes(datoToContentfulMarks[mark]),
      );

    if (allowedMarks.length > 0) {
      marks.marks = allowedMarks.map((m) => datoToContentfulMarks[m]);
    }
  }

  return createNode('span', {
    value: node.value,
    ...marks,
  });
};

export const paragraph: Handler<ContentfulParagraph> = async function paragraph(
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
    // TODO: Code block gets created only if it's in root and is not inline
    if (
      children.length === 1 &&
      children[0].marks &&
      children[0].marks.length === 1 &&
      children[0].marks.includes('code') &&
      context.allowedBlocks.includes('code') &&
      context.parentNode.nodeType === 'document'
    ) {
      return codeBlock(createNode, children[0]);
    }

    return isAllowedChild ? createNode('paragraph', { children }) : children;
  }

  return undefined;
};

export const thematicBreak: Handler<ContentfulHr> = async function thematicBreak(
  createNode,
  node,
  context,
) {
  const isAllowedChild = allowedChildren[context.parentNodeType].includes(
    'thematicBreak',
  );

  return isAllowedChild ? createNode('thematicBreak', {}) : undefined;
};

export const heading: Handler<ContentfulHeading> = async function heading(
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
  });

  if (Array.isArray(children) && children.length) {
    return isAllowedChild
      ? createNode('heading', {
          level: Number(node.nodeType.slice(-1)) || 1,
          children,
        })
      : children;
  }
  return undefined;
};

export const blockquote: Handler<ContentfulQuote> = async function blockquote(
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
    return isAllowedChild ? createNode('blockquote', { children }) : children;
  }

  return undefined;
};

export const list: Handler<ContentfulList> = async function list(
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
      style: node.nodeType === 'ordered-list' ? 'numbered' : 'bulleted',
    });
  }
  return undefined;
};

export const listItem: Handler<ContentfulListItem> = async function listItem(
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
      ? createNode('listItem', { children: wrap(children) })
      : children;
  }
  return undefined;
};

export const codeBlock: Handler<ContentfulParagraph> = async function codeBlock(
  createNode,
  node,
) {
  return createNode('code', {
    code: node.value,
  });
};

export const link: Handler<ContentfulHyperLink> = async function link(
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

  const children = await visitChildren(createNode, node, {
    ...context,
    parentNodeType: isAllowedChild ? 'link' : context.parentNodeType,
  });

  if (Array.isArray(children) && children.length) {
    if (!isAllowedChild) {
      return children;
    }

    const props = {
      url: resolveUrl(context, node.data.uri),
      children,
    };

    const meta: Array<MetaEntry> = [];

    if (node.properties) {
      ['target', 'rel', 'title'].forEach((attr) => {
        const value = Array.isArray(node.properties[attr])
          ? node.properties[attr].join(' ')
          : node.properties[attr];
        if (value) {
          meta.push({ id: attr, value });
        }
      });
    }

    if (meta.length > 0) {
      props.meta = meta;
    }

    return createNode('link', props);
  }
  return undefined;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function,  @typescript-eslint/explicit-module-boundary-types
export async function noop() {}

export const wrapListItems: Handler<ContentfulListItem> = async function wrapListItems(
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

export const handlers = {
  text: span,
  [BLOCKS.DOCUMENT]: root,
  [BLOCKS.PARAGRAPH]: paragraph,
  [BLOCKS.HEADING_1]: heading,
  [BLOCKS.HEADING_2]: heading,
  [BLOCKS.HEADING_3]: heading,
  [BLOCKS.HEADING_4]: heading,
  [BLOCKS.HEADING_5]: heading,
  [BLOCKS.HEADING_6]: heading,
  [BLOCKS.UL_LIST]: list,
  [BLOCKS.OL_LIST]: list,
  [BLOCKS.LIST_ITEM]: listItem,
  [BLOCKS.QUOTE]: blockquote,
  [BLOCKS.HR]: thematicBreak,
  [INLINES.HYPERLINK]: link,
  [INLINES.EMBEDDED_ENTRY]: noop,
  [BLOCKS.EMBEDDED_ASSET]: noop,
  [BLOCKS.EMBEDDED_ENTRY]: noop,
  [INLINES.ASSET_HYPERLINK]: noop,
  [INLINES.ENTRY_HYPERLINK]: noop,
};
