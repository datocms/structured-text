/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import {
  allowedChildren,
  inlineNodeTypes,
} from 'datocms-structured-text-utils';
import { BLOCKS, INLINES } from '@contentful/rich-text-types';
import {
  Handler,
  Mark,
  Context,
  ContentfulNode,
  ContentfulTextNode,
  ContentfulElementNode,
  ContentfulRootNode,
} from './types';

import visitChildren from './visit-children';
import { MetaEntry } from '../../utils/dist/types';

export const root: Handler<ContentfulRootNode> = async function root(
  createNode,
  node,
  context,
) {
  const children = await visitChildren(createNode, node, {
    ...context,
    parentNodeType: 'root',
  });

  // if (
  //   Array.isArray(children) &&
  //   children.some(
  //     (child: ContentfulNode) =>
  //       child && !allowedChildren.root.includes(child.type),
  //   )
  // ) {
  //   children = wrap(children);
  // }

  if (!Array.isArray(children) || children.length === 0) {
    return null;
  }

  return createNode('root', {
    children: Array.isArray(children) ? children : [],
  });
};

export const paragraph: Handler<ContentfulElementNode> = async function paragraph(
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

export const thematicBreak: Handler<ContentfulElementNode> = async function thematicBreak(
  createNode,
  node,
  context,
) {
  const isAllowedChild = allowedChildren[context.parentNodeType].includes(
    'thematicBreak',
  );

  return isAllowedChild ? createNode('thematicBreak', {}) : undefined;
};

export const heading: Handler<ContentfulElementNode> = async function heading(
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
          level: Number(node.nodeType.slice(-1)) || 1,
          children,
        })
      : children;
  }
  return undefined;
};

export const code: Handler<ContentfulElementNode> = async function code(
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
  const isCode = true;
  const children = node.content;
  let index = -1;
  let classList = null;
  let language = {};

  if (isPre(node)) {
    while (++index < children.length) {
      if (
        typeof children[index] === 'object' &&
        isCode(children[index])
        // && has(children[index], 'className')
      ) {
        // error TS2339: Property 'properties' does not exist on type 'ContentfulNode'.
        //               Property 'properties' does not exist on type 'ContentfulTextNode'
        // isCode (convert) checks that the node is an element and therefore it'll have properties
        // // @ts-ignore
        // classList = children[index].properties.className;
        break;
      }
    }
    // } else if (isCode(node) && has(node, 'className')) {
  } else if (isCode(node)) {
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
    code: String(node).replace(/\n+$/, ''),
  });
};

export const blockquote: Handler<ContentfulElementNode> = async function blockquote(
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
    // ? createNode('blockquote', { children: wrap(children) })
    return isAllowedChild ? createNode('blockquote', { children }) : children;
  }
  return undefined;
};
export const list: Handler<ContentfulElementNode> = async function list(
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
      style: node.nodeType === 'ol' ? 'numbered' : 'bulleted',
    });
  }
  return undefined;
};
export const listItem: Handler<ContentfulElementNode> = async function listItem(
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
    // children: wrap(children),
    return isAllowedChild ? createNode('listItem', { children }) : children;
  }
  return undefined;
};
export const link: Handler<ContentfulElementNode> = async function link(
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
  const wrapsHeadings = node.content.some(
    (child) => child.type === 'element' && child.nodeType.startsWith('h'),
  );
  if (wrapsHeadings) {
    let i = 0;
    const splitChildren: ContentfulElementNode[] = [];
    node.content.forEach((child) => {
      if (child.type === 'element' && child.nodeType.startsWith('h')) {
        if (splitChildren.length > 0) {
          i++;
        }
        splitChildren.push({
          ...child,
          children: [
            {
              ...node,
              children: child.content,
            },
          ],
        });
        i++;
      } else if (splitChildren[i]) {
        splitChildren[i].content.push(child);
      } else {
        splitChildren[i] = {
          ...node,
          children: [child],
        };
      }
    });

    node.content = splitChildren;
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

export const span: Handler<ContentfulTextNode> = async function span(
  createNode,
  node,
  context,
) {
  const marks = {};

  const datoToContentfulMarks = {
    bold: 'strong',
    italic: 'emphasis',
    underline: 'underline',
    code: 'code',
  };

  if (Array.isArray(node.marks)) {
    const allowedMarks = node.marks.filter((mark) =>
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

export const newLine: Handler<ContentfulTextNode> = async function newLine(
  createNode,
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

export const extractInlineStyles: Handler<ContentfulElementNode> = async function extractInlineStyles(
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

export function withMark(type: Mark): Handler<ContentfulElementNode> {
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
  // [BLOCKS.EMBEDDED_ASSET]: EMBEDDED_ASSET,
  // [BLOCKS.EMBEDDED_ENTRY]: EMBEDDED_ENTRY,
  // [INLINES.ASSET_HYPERLINK]: ASSET_HYPERLINK,
  // [INLINES.ENTRY_HYPERLINK]: ENTRY_HYPERLINK,
  // [INLINES.EMBEDDED_ENTRY]: EMBEDDED_ENTRY,
};

// export const handlers = {
//   root: root,

//   p: paragraph,
//   summary: paragraph,

//   h1: heading,
//   h2: heading,
//   h3: heading,
//   h4: heading,
//   h5: heading,
//   h6: heading,

//   ul: list,
//   ol: list,
//   dir: list,

//   dt: listItem,
//   dd: listItem,
//   li: listItem,

//   listing: code,
//   plaintext: code,
//   pre: code,
//   xmp: code,

//   blockquote: blockquote,

//   a: link,

//   code: code,
//   kbd: code,
//   samp: code,
//   tt: code,
//   var: code,

//   strong: strong,
//   b: strong,

//   em: italic,
//   i: italic,

//   u: underline,

//   strike: strikethrough,
//   s: strikethrough,

//   mark: highlight,

//   base: base,

//   span: extractInlineStyles,
//   text: span,
//   br: newLine,

//   hr: thematicBreak,

//   head: head,
//   comment: noop,
//   script: noop,
//   style: noop,
//   title: noop,
//   video: noop,
//   audio: noop,
//   embed: noop,
//   iframe: noop,
// };

export const wrapListItems: Handler<ContentfulElementNode> = async function wrapListItems(
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
