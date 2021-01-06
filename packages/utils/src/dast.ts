export type Node = BlockNode | InlineNode;

export type BlockNode =
  | Root
  | Paragraph
  | Heading
  | Block
  | List
  | ListItem
  | Blockquote
  | Code;

export type InlineNode = Span | Link | ItemLink | InlineItem;

export const rootType = 'root' as const;
export type RootType = 'root';

export type Root = {
  type: RootType;
  children: Array<Paragraph | Heading | List | Code | Blockquote | Block>;
};

export const paragraphType = 'paragraph' as const;
export type ParagraphType = 'paragraph';

export type Paragraph = {
  type: ParagraphType;
  children: Array<InlineNode>;
};

export const headingType = 'heading' as const;
export type HeadingType = 'heading';

export type Heading = {
  type: HeadingType;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: Array<InlineNode>;
};

export const listType = 'list' as const;
export type ListType = 'list';

export type List = {
  type: ListType;
  style: 'bulleted' | 'numbered';
  children: Array<ListItem>;
};

export const listItemType = 'listItem' as const;
export type ListItemType = 'listItem';

export type ListItem = {
  type: ListItemType;
  children: Array<Paragraph | List>;
};

export const codeType = 'code' as const;
export type CodeType = 'code';

export type Code = {
  type: CodeType;
  language?: string;
  children: Array<Span>;
};

export const blockquoteType = 'blockquote' as const;
export type BlockquoteType = 'blockquote';

export type Blockquote = {
  type: BlockquoteType;
  children: Array<Paragraph>;
};

export const blockType = 'block' as const;
export type BlockType = 'block';

export type Block = {
  type: BlockType;
  item: string;
};

export const spanType = 'span' as const;
export type SpanType = 'span';

export type Mark =
  | 'strong'
  | 'code'
  | 'emphasis'
  | 'underline'
  | 'strikethrough'
  | 'highlight';

export type Span = {
  type: SpanType;
  marks?: Mark[];
  value: string;
};

export const linkType = 'link' as const;
export type LinkType = 'link';

export type Link = {
  type: LinkType;
  url: string;
  children: Array<Span>;
};

export const itemLinkType = 'itemLink' as const;
export type ItemLinkType = 'itemLink';

export type ItemLink = {
  type: ItemLinkType;
  item: string;
  children: Array<Span>;
};

export const inlineItemType = 'inlineItem' as const;
export type InlineItemType = 'inlineItem';

export type InlineItem = {
  type: InlineItemType;
  item: string;
};

export type WithChildrenNode = Exclude<Node, Span | Block | InlineItem>;

export type DastDocument = {
  schema: 'dast';
  document: Root;
};

export function isHeading(node: Node): node is Heading {
  return node.type === headingType;
}

export function isSpan(node: Node): node is Span {
  return node.type === spanType;
}

export function hasChildren(node: Node): node is WithChildrenNode {
  return 'children' in node;
}
