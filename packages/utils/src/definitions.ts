import { DefaultMark, Mark, NodeType } from './types';

export const blockquoteNodeType = 'blockquote' as const;
export const blockNodeType = 'block' as const;
export const codeNodeType = 'code' as const;
export const headingNodeType = 'heading' as const;
export const inlineItemNodeType = 'inlineItem' as const;
export const itemLinkNodeType = 'itemLink' as const;
export const linkNodeType = 'link' as const;
export const listItemNodeType = 'listItem' as const;
export const listNodeType = 'list' as const;
export const paragraphNodeType = 'paragraph' as const;
export const rootNodeType = 'root' as const;
export const spanNodeType = 'span' as const;
export const thematicBreakNodeType = 'thematicBreak' as const;

export const allowedNodeTypes = [
  blockquoteNodeType,
  blockNodeType,
  codeNodeType,
  headingNodeType,
  inlineItemNodeType,
  itemLinkNodeType,
  linkNodeType,
  listItemNodeType,
  listNodeType,
  paragraphNodeType,
  rootNodeType,
  spanNodeType,
  thematicBreakNodeType,
];

export type AllowedChildren = Record<NodeType, 'inlineNodes' | NodeType[]>;

export const allowedChildren: AllowedChildren = {
  [blockquoteNodeType]: [paragraphNodeType],
  [blockNodeType]: [],
  [codeNodeType]: [],
  [headingNodeType]: 'inlineNodes',
  [inlineItemNodeType]: [],
  [itemLinkNodeType]: 'inlineNodes',
  [linkNodeType]: 'inlineNodes',
  [listItemNodeType]: [paragraphNodeType, listNodeType],
  [listNodeType]: [listItemNodeType],
  [paragraphNodeType]: 'inlineNodes',
  [rootNodeType]: [
    blockquoteNodeType,
    codeNodeType,
    listNodeType,
    paragraphNodeType,
    headingNodeType,
    blockNodeType,
    thematicBreakNodeType,
  ],
  [spanNodeType]: [],
  [thematicBreakNodeType]: [],
};

export const inlineNodeTypes = [
  spanNodeType,
  linkNodeType,
  itemLinkNodeType,
  inlineItemNodeType,
];

export type AllowedAttributes = Record<NodeType, string[]>;

export const allowedAttributes: AllowedAttributes = {
  [blockquoteNodeType]: ['children', 'attribution'],
  [blockNodeType]: ['item'],
  [codeNodeType]: ['language', 'highlight', 'code'],
  [headingNodeType]: ['level', 'children'],
  [inlineItemNodeType]: ['item'],
  [itemLinkNodeType]: ['item', 'children', 'meta'],
  [linkNodeType]: ['url', 'children', 'meta'],
  [listItemNodeType]: ['children'],
  [listNodeType]: ['style', 'children'],
  [paragraphNodeType]: ['children'],
  [rootNodeType]: ['children'],
  [spanNodeType]: ['value', 'marks'],
  [thematicBreakNodeType]: [],
};

export const defaultMarks: DefaultMark[] = [
  'strong',
  'code',
  'emphasis',
  'underline',
  'strikethrough',
  'highlight',
];
