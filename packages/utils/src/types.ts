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

/** Root represents a document */
export type Root = {
  type: RootType;
  children: Array<Paragraph | Heading | List | Code | Blockquote | Block>;
};

export type ParagraphType = 'paragraph';

/** Paragraph represents a unit of textual content */
export type Paragraph = {
  type: ParagraphType;
  children: Array<InlineNode>;
};

export type HeadingType = 'heading';

/** Heading represents a heading of a section */
export type Heading = {
  type: HeadingType;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: Array<InlineNode>;
};

export type ListType = 'list';

/**
  List represents a list of items.

  Unordered lists must have its `style` field set to `bulleted`.
  Ordered lists, instead, have its `style` field set to `numbered`.
*/
export type List = {
  type: ListType;
  style: 'bulleted' | 'numbered';
  children: Array<ListItem>;
};

export type ListItemType = 'listItem';

/** ListItem represents an item in a List */
export type ListItem = {
  type: ListItemType;
  children: Array<Paragraph | List>;
};

export type CodeType = 'code';

/** Code represents a block of preformatted text, such as computer code */
export type Code = {
  type: CodeType;
  /** optional, represents the language of computer code being marked up */
  language?: string;
  /** optional, represents an array of line numbers to highlight */
  highlight?: Array<number>;
  code: string;
};

export type BlockquoteType = 'blockquote';

/** Blockquote is a containter that represents text which is an extended quotation */
export type Blockquote = {
  type: BlockquoteType;
  attribution?: string;
  children: Array<Paragraph>;
};

export type BlockType = 'block';

/** Block is a DatoCMS block records references */
export type Block = {
  type: BlockType;
  /** The record ID. */
  item: string;
};

export type SpanType = 'span';

/** Supported marks for Span nodes */
export type Mark =
  | 'strong'
  | 'code'
  | 'emphasis'
  | 'underline'
  | 'strikethrough'
  | 'highlight';

/** Span represents a text node. It might optionally contain formatting styles called marks */
export type Span = {
  type: SpanType;
  /** optional, array of styles for the current chunk of text */
  marks?: Mark[];
  value: string;
};

export type LinkType = 'link';

/** Link represents a hyperlink */
export type Link = {
  type: LinkType;
  url: string;
  children: Array<Span>;
};

export type ItemLinkType = 'itemLink';

/** ItemLink is similar to a Link node, but instead of linking a portion of text to a URL, it links the document to another record present in the DatoCMS project */
export type ItemLink = {
  type: ItemLinkType;
  /** the record ID */
  item: string;
  children: Array<Span>;
};

export type InlineItemType = 'inlineItem';

/** InlineItem, similarly to ItemLink, links the document to another record but does not specify any inner content (children) */
export type InlineItem = {
  type: InlineItemType;
  /** the record ID */
  item: string;
};

export type WithChildrenNode = Exclude<Node, Code | Span | Block | InlineItem>;

/**
 A DatoCMS compatible document.
 */
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

/**
  Structured Text enables authors to create rich text content, on par with traditional editors.
  Additionally, it allows records and Media Area assets to be linked dynamically and embedded within the flow of the text.
*/
export type StructuredText<R extends Record = Record> = {
  /** A DatoCMS compatible document */
  value: Document;
  /** Blocks associated with the Structured Text */
  blocks?: R[];
  /** Links associated with the Structured Text */
  links?: R[];
};

export type Record = {
  __typename: string;
  id: string;
} & {
  [prop: string]: unknown;
};
