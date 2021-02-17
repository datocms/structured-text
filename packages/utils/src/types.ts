export type Node = BlockNode | InlineNode;

export type BlockNode =
  | Root
  | Paragraph
  | Heading
  | Block
  | List
  | ListItem
  | Blockquote
  | Code
  | ThematicBreak;

export type InlineNode = Span | Link | ItemLink | InlineItem;

export type NodeWithMeta = Link | ItemLink;

export type RootType = 'root';

/**
 * Every `dast` document MUST start with a `root` node.
 *
 * ```json
 * {
 *   "type": "root",
 *   "children": [
 *     {
 *       "type": "heading",
 *       "level": 1,
 *       "children": [
 *         {
 *           "type": "span",
 *           "value": "Title"
 *         }
 *       ]
 *     },
 *     {
 *       "type": "paragraph",
 *       "children": [
 *         {
 *           "type": "span",
 *           "value": "A simple paragraph!"
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export type Root = {
  type: RootType;
  children: Array<
    Paragraph | Heading | List | Code | Blockquote | Block | ThematicBreak
  >;
};

export type ParagraphType = 'paragraph';

/**
 * A `paragraph` node represents a unit of textual content.
 *
 * ```json
 * {
 *   "type": "paragraph",
 *   "children": [
 *     {
 *       "type": "span",
 *       "value": "A simple paragraph!"
 *     }
 *   ]
 * }
 * ```
 */
export type Paragraph = {
  type: ParagraphType;
  children: Array<InlineNode>;
};

export type HeadingType = 'heading';

/**
 * An `heading` node represents a heading of a section. Using the `level` attribute you
 * can control the rank of the heading.
 *
 * ```json
 * {
 *   "type": "heading",
 *   "level": 2,
 *   "children": [
 *     {
 *       "type": "span",
 *       "value": "An h2 heading!"
 *     }
 *   ]
 * }
 * ```
 */
export type Heading = {
  type: HeadingType;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: Array<InlineNode>;
};

export type ListType = 'list';

/**
 * A `list` node represents a list of items. Unordered lists must have its `style` field
 * set to `bulleted`, while ordered lists, instead, have its `style` field set to `numbered`.
 *
 * ```json
 * {
 *   "type": "list",
 *   "style": "bulleted",
 *   "children": [
 *     {
 *       "type": "listItem",
 *       "children": [
 *         {
 *           "type": "paragraph",
 *           "children": [
 *             {
 *               "type": "span",
 *               "value": "This is a list item!"
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export type List = {
  type: ListType;
  style: 'bulleted' | 'numbered';
  children: Array<ListItem>;
};

export type ListItemType = 'listItem';

/**
 * A `listItem` node represents an item in a list.
 *
 * ```json
 * {
 *   "type": "listItem",
 *   "children": [
 *     {
 *       "type": "paragraph",
 *       "children": [
 *         {
 *           "type": "span",
 *           "value": "This is a list item!"
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export type ListItem = {
  type: ListItemType;
  children: Array<Paragraph | List>;
};

export type ThematicBreakType = 'thematicBreak';

/**
 * A `thematicBreak` node represents a thematic break between paragraph-level elements:
 * for example, a change of scene in a story, or a shift of topic within a section.
 *
 * ```json
 * {
 *   "type": "thematicBreak"
 * }
 * ```
 */
export type ThematicBreak = {
  type: ThematicBreakType;
};

export type CodeType = 'code';

/**
 * A `code` node represents a block of preformatted text, such as computer code.
 *
 * ```json
 * {
 *   "type": "code",
 *   "language": "javascript",
 *   "highlight": [1],
 *   "code": "function greetings() {\n  console.log('Hi!');\n}"
 * }
 * ```
 */
export type Code = {
  type: CodeType;
  /** The language of computer code being marked up (ie. `"javascript"`) */
  language?: string;
  /** A zero-based array of line numbers to highlight (ie. `[0, 1, 3]`)*/
  highlight?: Array<number>;
  /** The marked up computer code */
  code: string;
};

export type BlockquoteType = 'blockquote';
/**
 * A `blockquote` node is a containter that represents text which is an extended quotation.
 *
 * ```json
 * {
 *   "type": "blockquote",
 *   "attribution": "Oscar Wilde",
 *   "children": [
 *     {
 *       "type": "paragraph",
 *       "children": [
 *         {
 *           "type": "span",
 *           "value": "Be yourself; everyone else is taken."
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export type Blockquote = {
  type: BlockquoteType;
  /** Attribution for the quote (ie `"Mark Smith"`) */
  attribution?: string;
  children: Array<Paragraph>;
};

export type BlockType = 'block';

/**
 * Similarly to [Modular Content](https://www.datocms.com/docs/content-modelling/modular-content) fields,
 * you can also embed block records into Structured Text. A `block` node stores a reference to a
 * DatoCMS block record embedded inside the `dast` document.
 *
 * This type of node can only be put as a direct child of the [`root`](#root) node.
 *
 * ```json
 * {
 *   "type": "block",
 *   "item": "1238455312"
 * }
 * ```
 */
export type Block = {
  type: BlockType;
  /** The DatoCMS block record ID */
  item: string;
};

export type SpanType = 'span';

/** Supported marks for `span` nodes */
export type Mark =
  | 'strong'
  | 'code'
  | 'emphasis'
  | 'underline'
  | 'strikethrough'
  | 'highlight';

/**
 * A `span` node represents a text node. It might optionally contain decorators called `marks`.
 *
 * ```json
 * {
 *   "type": "span",
 *   "marks": ["highlight", "emphasis"],
 *   "value": "Some random text here, move on!"
 * }
 * ```
 */
export type Span = {
  type: SpanType;
  /**
   * Array of decorators for the current chunk of text.
   * Valid marks are: `strong`, `code`, `emphasis`, `underline`, `strikethrough` and `highlight`.
   */
  marks?: Mark[];
  value: string;
};

export type MetaEntry = {
  id: string;
  value: string | boolean | number;
};

export type LinkType = 'link';

/**
 * A `link` node represents a normal hyperlink. It might optionally contain a number of additional
 * custom information under the `meta` key. You can also link to DatoCMS records using
 * the [`itemLink`](#itemLink) node.
 *
 * ```json
 * {
 *   "type": "link",
 *   "url": "https://www.datocms.com/"
 *   "meta": {
 *     "openInNewWindow": true
 *   },
 *   "children": [
 *     {
 *       "type": "span",
 *       "value": "The best CMS in town"
 *     }
 *   ]
 * }
 * ```
 */
export type Link = {
  type: LinkType;
  url: string;
  children: Array<Span>;
  /**
   * Array of tuples containing custom meta-information for the link.
   */
  meta?: Array<MetaEntry>;
};

export type ItemLinkType = 'itemLink';

/**
 * An `itemLink` node is similar to a [`link`](#link) node node, but instead of
 * linking a portion of text to a URL, it links the document to another record
 * present in the same DatoCMS project.
 *
 * It might optionally contain a number of additional custom information under
 * the `meta` key.
 *
 * If you want to link to a DatoCMS record without having to specify some
 * inner content, then please use the [`inlineItem`](#inlineItem) node.
 *
 * ```json
 * {
 *   "type": "itemLink",
 *   "item": "38945648",
 *   "meta": {
 *     "openInNewWindow": true,
 *   },
 *   "children": [
 *     {
 *       "type": "span",
 *       "value": "Matteo Giaccone"
 *     }
 *   ]
 * }
 * ```
 */
export type ItemLink = {
  type: ItemLinkType;
  /** The linked DatoCMS record ID */
  item: string;
  children: Array<Span>;
  /**
   * Array of tuples containing custom meta-information for the link.
   */
  meta?: Array<MetaEntry>;
};

export type InlineItemType = 'inlineItem';

/**
 * An `inlineItem`, similarly to [`itemLink`](#itemLink), links the document to
 * another record but does not specify any inner content (children).
 *
 * It can be used in situations where it is up to the frontend to decide how to present the
 * record (ie. a widget, or an `<a>` tag pointing to the URL of the record with a text that
 * is the title of the linked record).
 *
 * ```json
 * {
 *   "type": "inlineItem",
 *   "item": "74619345"
 * }
 * ```
 */
export type InlineItem = {
  type: InlineItemType;
  /** The DatoCMS record ID */
  item: string;
};

export type WithChildrenNode = Exclude<
  Node,
  Code | Span | Block | InlineItem | ThematicBreak
>;

/**
 * A Structured Text `dast`-compatible value, composed by the `dast` document
 * itself and the `schema` attribute.
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
  | SpanType
  | ThematicBreakType;

/**
 * Structured Text enables authors to create rich text content, on par with
 * traditional editors.
 *
 * Additionally, it allows records and Media Area assets to be linked dynamically
 * and embedded within the flow of the text.
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
