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

export type RootType = 'root';

export type Root = {
  type: RootType;
  children: Array<Paragraph | Heading | List | Code | Blockquote | Block>;
};

export type ParagraphType = 'paragraph';

export type Paragraph = {
  type: ParagraphType;
  children: Array<InlineNode>;
};

export type HeadingType = 'heading';

export type Heading = {
  type: HeadingType;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: Array<InlineNode>;
};

export type ListType = 'list';

export type List = {
  type: ListType;
  style: 'bulleted' | 'numbered';
  children: Array<ListItem>;
};

export type ListItemType = 'listItem';

export type ListItem = {
  type: ListItemType;
  children: Array<Paragraph | List>;
};

export type CodeType = 'code';

export type Code = {
  type: CodeType;
  language?: string;
  children: Array<Span>;
};

export type BlockquoteType = 'blockquote';

export type Blockquote = {
  type: BlockquoteType;
  children: Array<Paragraph>;
};

export type BlockType = 'block';

export type Block = {
  type: BlockType;
  item: string;
};

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

export type LinkType = 'link';

export type Link = {
  type: LinkType;
  url: string;
  children: Array<Span>;
};

export type ItemLinkType = 'itemLink';

export type ItemLink = {
  type: ItemLinkType;
  item: string;
  children: Array<Span>;
};

export type InlineItemType = 'inlineItem';

export type InlineItem = {
  type: InlineItemType;
  item: string;
};

export type WithChildrenNode = Exclude<Node, Span | Block | InlineItem>;

export type Document = {
  schema: 'dast';
  document: Root;
};

export type NodeType =
  | ParagraphType
  | HeadingType
  | LinkType
  | ItemLinkType
  | InlineItemType
  | BlockType
  | ListType
  | ListItemType
  | BlockquoteType
  | CodeType
  | RootType
  | SpanType;
