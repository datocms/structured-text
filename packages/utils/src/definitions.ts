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

type AllowedChildren = Record<
  NodeType,
  'text' | 'inlineNodesAndText' | NodeType[]
>;

export const allowedChildren: AllowedChildren = {
  [blockquoteNodeType]: [paragraphNodeType],
  [blockNodeType]: [],
  [codeNodeType]: 'text',
  [headingNodeType]: 'inlineNodesAndText',
  [inlineItemNodeType]: [],
  [itemLinkNodeType]: 'inlineNodesAndText',
  [linkNodeType]: 'inlineNodesAndText',
  [listItemNodeType]: [paragraphNodeType, listNodeType],
  [listNodeType]: [listItemNodeType],
  [paragraphNodeType]: 'inlineNodesAndText',
  [rootNodeType]: [
    blockquoteNodeType,
    codeNodeType,
    listNodeType,
    paragraphNodeType,
    headingNodeType,
  ],
  [spanNodeType]: [],
};

type AllowedAttributes = Record<NodeType, string[]>;

export const allowedAttributes: AllowedAttributes = {
  [blockquoteNodeType]: ['children'],
  [blockNodeType]: ['item'],
  [codeNodeType]: ['language', 'children'],
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
