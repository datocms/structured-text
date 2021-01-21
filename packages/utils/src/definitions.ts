import { Mark, NodeType } from './types';

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
  ],
  [spanNodeType]: [],
};

export const inlineNodeTypes = [
  spanNodeType,
  linkNodeType,
  itemLinkNodeType,
  inlineItemNodeType,
];

export type AllowedAttributes = Record<NodeType, string[]>;

export const allowedAttributes: AllowedAttributes = {
  [blockquoteNodeType]: ['children'],
  [blockNodeType]: ['item'],
  [codeNodeType]: ['language', 'code'],
  [headingNodeType]: ['level', 'children'],
  [inlineItemNodeType]: ['item'],
  [itemLinkNodeType]: ['item', 'children'],
  [linkNodeType]: ['url', 'children'],
  [listItemNodeType]: ['children'],
  [listNodeType]: ['style', 'children'],
  [paragraphNodeType]: ['children'],
  [rootNodeType]: ['children'],
  [spanNodeType]: ['value', 'marks'],
};

export const allowedMarks: Mark[] = [
  'strong',
  'code',
  'emphasis',
  'underline',
  'strikethrough',
  'highlight',
];
