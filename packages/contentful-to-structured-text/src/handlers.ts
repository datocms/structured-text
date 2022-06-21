/* eslint-disable @typescript-eslint/ban-ts-comment */

import {
  allowedChildren,
  Blockquote,
  Heading,
  inlineNodeTypes,
  Link,
  List,
  ListItem,
  Node,
  Paragraph,
  Root,
  Span,
} from 'datocms-structured-text-utils';
import { BLOCKS, Document, INLINES } from '@contentful/rich-text-types';
import {
  Handler,
  ContentfulTextNode,
  ContentfulParagraph,
  ContentfulHeading,
  ContentfulQuote,
  ContentfulHr,
  ContentfulList,
  ContentfulListItem,
  ContentfulHyperLink,
  Context,
  ContentfulNode,
} from './types';
import {
  wrapLinksAndSpansInSingleParagraph,
  wrapListItems,
} from './helpers/wrap';
import visitChildren from './helpers/visit-children';
import { contentfulToDatoMark } from '.';

export function makeHandler<T extends ContentfulNode>(
  guard: (node: ContentfulNode) => node is T,
  handle: (node: T, context: Context) => Promise<Node | Array<Node> | void>,
): Handler {
  return { guard, handle: (node, context) => handle(node as T, context) };
}

export const handlers: Array<Handler> = [
  makeHandler(
    (n): n is Document => n.nodeType === BLOCKS.DOCUMENT,
    async (node, context) => {
      let children = await visitChildren(node, {
        ...context,
        parentNodeType: 'root',
      });

      if (!Array.isArray(children) || children.length === 0) {
        return;
      }

      if (
        children.some(
          (child) => child && !allowedChildren.root.includes(child.type),
        )
      ) {
        children = wrapLinksAndSpansInSingleParagraph(children);
      }

      return {
        type: 'root',
        children: children as Root['children'],
      };
    },
  ),
  makeHandler(
    (n): n is ContentfulTextNode => n.nodeType === 'text',
    async (node, context) => {
      const spanAttrs: Partial<Span> = {};

      if (Array.isArray(node.marks) && node.marks.length > 0) {
        const allowedMarks = node.marks
          .map((m) => m.type)
          .filter((mark) =>
            context.allowedMarks.includes(contentfulToDatoMark[mark]),
          );

        if (allowedMarks.length > 0) {
          spanAttrs.marks = allowedMarks.map((m) => contentfulToDatoMark[m]);
        }
      }

      return { type: 'span', value: node.value, ...spanAttrs };
    },
  ),
  makeHandler(
    (n): n is ContentfulParagraph => n.nodeType === BLOCKS.PARAGRAPH,
    async (node, context) => {
      const isAllowedAsChild = allowedChildren[context.parentNodeType].includes(
        'paragraph',
      );

      const children = await visitChildren(node, {
        ...context,
        parentNodeType: isAllowedAsChild ? 'paragraph' : context.parentNodeType,
      });

      if (Array.isArray(children) && children.length) {
        // Code block gets created only if in root and not inline
        if (
          children.length === 1 &&
          'marks' in children[0] &&
          children[0].marks?.length === 1 &&
          children[0].marks.includes('code') &&
          context.allowedBlocks.includes('code') &&
          context.parentNode?.nodeType === 'document'
        ) {
          return { type: 'code', code: children[0].value };
        }

        return isAllowedAsChild
          ? { type: 'paragraph', children: children as Paragraph['children'] }
          : children;
      }

      return undefined;
    },
  ),

  makeHandler(
    (n): n is ContentfulHr => n.nodeType === BLOCKS.HR,
    async (node, context) => {
      const isAllowedAsChild = allowedChildren[context.parentNodeType].includes(
        'thematicBreak',
      );

      return isAllowedAsChild ? { type: 'thematicBreak' } : undefined;
    },
  ),

  makeHandler(
    (n): n is ContentfulHeading =>
      ([
        BLOCKS.HEADING_1,
        BLOCKS.HEADING_2,
        BLOCKS.HEADING_3,
        BLOCKS.HEADING_4,
        BLOCKS.HEADING_5,
        BLOCKS.HEADING_6,
      ] as string[]).includes(n.nodeType),
    async (node, context) => {
      const isAllowedAsChild =
        allowedChildren[context.parentNodeType].includes('heading') &&
        context.allowedBlocks.includes('heading');

      const children = await visitChildren(node, {
        ...context,
        parentNodeType: isAllowedAsChild ? 'heading' : context.parentNodeType,
      });

      if (Array.isArray(children) && children.length) {
        return isAllowedAsChild
          ? {
              type: 'heading',
              level: (Number(node.nodeType.slice(-1)) as Heading['level']) || 1,
              children: children as Heading['children'],
            }
          : children;
      }

      return undefined;
    },
  ),

  makeHandler(
    (n): n is ContentfulQuote => n.nodeType === BLOCKS.QUOTE,
    async (node, context) => {
      const isAllowedAsChild =
        allowedChildren[context.parentNodeType].includes('blockquote') &&
        context.allowedBlocks.includes('blockquote');

      const children = await visitChildren(node, {
        ...context,
        parentNodeType: isAllowedAsChild
          ? 'blockquote'
          : context.parentNodeType,
      });

      if (Array.isArray(children) && children.length) {
        return isAllowedAsChild
          ? { type: 'blockquote', children: children as Blockquote['children'] }
          : children;
      }

      return undefined;
    },
  ),

  makeHandler(
    (n): n is ContentfulList =>
      ([BLOCKS.UL_LIST, BLOCKS.OL_LIST] as string[]).includes(n.nodeType),
    async (node, context) => {
      const isAllowedAsChild =
        allowedChildren[context.parentNodeType].includes('list') &&
        context.allowedBlocks.includes('list');

      if (!isAllowedAsChild) {
        return await visitChildren(node, context);
      }

      const children = await wrapListItems(node, {
        ...context,
        parentNodeType: 'list',
      });

      if (Array.isArray(children) && children.length) {
        return {
          type: 'list',
          children: children as List['children'],
          style: node.nodeType === 'ordered-list' ? 'numbered' : 'bulleted',
        };
      }

      return undefined;
    },
  ),

  makeHandler(
    (n): n is ContentfulListItem => n.nodeType === BLOCKS.LIST_ITEM,
    async (node, context) => {
      const isAllowedAsChild =
        allowedChildren[context.parentNodeType].includes('listItem') &&
        context.allowedBlocks.includes('list');

      if (!isAllowedAsChild) {
        return await visitChildren(node, {
          ...context,
          parentNodeType: context.parentNodeType,
        });
      }

      const children = await visitChildren(node, {
        ...context,
        parentNodeType: 'listItem',
      });

      if (Array.isArray(children) && children.length) {
        return {
          type: 'listItem',
          children: wrapLinksAndSpansInSingleParagraph(
            children,
          ) as ListItem['children'],
        };
      }

      return undefined;
    },
  ),

  makeHandler(
    (n): n is ContentfulHyperLink => n.nodeType === INLINES.HYPERLINK,
    async (node, context) => {
      if (!context.allowedBlocks?.includes('link')) {
        return visitChildren(node, context);
      }

      let isAllowedAsChild = false;

      if (allowedChildren[context.parentNodeType] === 'inlineNodes') {
        isAllowedAsChild = inlineNodeTypes.includes('link');
      } else if (Array.isArray(allowedChildren[context.parentNodeType])) {
        isAllowedAsChild = allowedChildren[context.parentNodeType].includes(
          'link',
        );
      }

      if (!isAllowedAsChild) {
        // Links that aren't inside of a allowedChildren context
        // can still be valid `dast` nodes in the following contexts if wrapped.
        const allowedChildrenWrapped = ['root', 'list', 'listItem'];
        isAllowedAsChild = allowedChildrenWrapped.includes(
          context.parentNodeType,
        );
      }

      const children = await visitChildren(node, {
        ...context,
        parentNodeType: isAllowedAsChild ? 'link' : context.parentNodeType,
      });

      if (Array.isArray(children) && children.length) {
        if (!isAllowedAsChild) {
          return children;
        }

        return {
          type: 'link',
          url: node.data.uri,
          children: children as Link['children'],
        };
      }

      return undefined;
    },
  ),
];

export type { Handler };
