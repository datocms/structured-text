export type BlockId = string;

export type Node<BlockItemType = BlockId, InlineBlockItemType = BlockId> =
  | BlockNode<BlockItemType, InlineBlockItemType>
  | InlineNode<InlineBlockItemType>;

export type BlockNode<BlockItemType = BlockId, InlineBlockItemType = BlockId> =
  | Root<BlockItemType, InlineBlockItemType>
  | Paragraph<InlineBlockItemType>
  | Heading<InlineBlockItemType>
  | Block<BlockItemType>
  | List<BlockItemType, InlineBlockItemType>
  | ListItem<BlockItemType, InlineBlockItemType>
  | Blockquote<InlineBlockItemType>
  | Code
  | ThematicBreak;

export type BlockNodeWithCustomStyle<InlineBlockItemType = BlockId> =
  | Paragraph<InlineBlockItemType>
  | Heading<InlineBlockItemType>;

export type BlockNodeTypeWithCustomStyle = ParagraphType | HeadingType;

export type InlineNode<InlineBlockItemType = BlockId> =
  | Span
  | Link
  | ItemLink
  | InlineItem
  | InlineBlock<InlineBlockItemType>;

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
export type Root<BlockItemType = BlockId, InlineBlockItemType = BlockId> = {
  type: RootType;
  children: Array<
    | Paragraph<InlineBlockItemType>
    | Heading<InlineBlockItemType>
    | List<BlockItemType, InlineBlockItemType>
    | Code
    | Blockquote<InlineBlockItemType>
    | Block<BlockItemType>
    | ThematicBreak
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
export type Paragraph<InlineBlockItemType = BlockId> = {
  type: ParagraphType;
  /** Custom style applied to the node. Styles can be configured using the Plugin SDK */
  style?: string;
  children: Array<InlineNode<InlineBlockItemType>>;
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
export type Heading<InlineBlockItemType = BlockId> = {
  type: HeadingType;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** Custom style applied to the node. Styles can be configured using the Plugin SDK */
  style?: string;
  children: Array<InlineNode<InlineBlockItemType>>;
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
export type List<BlockItemType = BlockId, InlineBlockItemType = BlockId> = {
  type: ListType;
  style: 'bulleted' | 'numbered';
  children: Array<ListItem<BlockItemType, InlineBlockItemType>>;
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
export type ListItem<BlockItemType = BlockId, InlineBlockItemType = BlockId> = {
  type: ListItemType;
  children: Array<
    Paragraph<InlineBlockItemType> | List<BlockItemType, InlineBlockItemType>
  >;
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
export type Blockquote<InlineBlockItemType = BlockId> = {
  type: BlockquoteType;
  /** Attribution for the quote (ie `"Mark Smith"`) */
  attribution?: string;
  children: Array<Paragraph<InlineBlockItemType>>;
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
export type Block<BlockItemType = BlockId> = {
  type: BlockType;
  /** The actual DatoCMS block record */
  item: BlockItemType;
};

export type InlineBlockType = 'inlineBlock';

/**
 * ```json
 * {
 *   "type": "inlineBlock",
 *   "item": "1238455312"
 * }
 * ```
 */
export type InlineBlock<InlineBlockItemType = BlockId> = {
  type: InlineBlockType;
  /** The actual DatoCMS block record */
  item: InlineBlockItemType;
};

export type SpanType = 'span';

export type DefaultMark =
  | 'strong'
  | 'code'
  | 'emphasis'
  | 'underline'
  | 'strikethrough'
  | 'highlight';

/** Supported marks for `span` nodes */
export type Mark = DefaultMark | string;

/**
 * A `span` node represents a text node. It might optionally contain decorators called `marks`. It is worth
 * mentioning that you can use the `\n` newline character to express line breaks.
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
   * Default marks: `strong`, `code`, `emphasis`, `underline`, `strikethrough` and `highlight`. Additional custom marks can be defined via plugin.
   */
  marks?: Mark[];
  value: string;
};

export type MetaEntry = {
  id: string;
  value: string;
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
 *   "url": "https://www.datocms.com/",
 *   "meta": [
 *     { "id": "rel", "value": "nofollow" },
 *     { "id": "target", "value": "_blank" }
 *   ],
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
  /**
   * The actual URL where the link points to. Can be any string, no specific format is enforced.
   */
  url: string;
  /**
   * Array of tuples containing custom meta-information for the link.
   */
  meta?: Array<MetaEntry>;
  children: Array<Span>;
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
 *   "meta": [
 *     { "id": "rel", "value": "nofollow" },
 *     { "id": "target", "value": "_blank" }
 *   ],
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
  /**
   * Array of tuples containing custom meta-information for the link.
   */
  meta?: Array<MetaEntry>;
  children: Array<Span>;
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

export type WithChildrenNode<
  BlockItemType = BlockId,
  InlineBlockItemType = BlockId
> = Exclude<
  Node<BlockItemType, InlineBlockItemType>,
  | Code
  | Span
  | Block<BlockItemType>
  | InlineBlock<InlineBlockItemType>
  | InlineItem
  | ThematicBreak
>;

/**
 * A Structured Text `dast`-compatible value, composed by the `dast` document
 * itself and the `schema` attribute.
 */
export type Document<BlockItemType = BlockId, InlineBlockItemType = BlockId> = {
  schema: 'dast';
  document: Root<BlockItemType, InlineBlockItemType>;
};

export type NodeType =
  | ParagraphType
  | HeadingType
  | LinkType
  | ItemLinkType
  | InlineItemType
  | BlockType
  | InlineBlockType
  | ListType
  | ListItemType
  | BlockquoteType
  | CodeType
  | RootType
  | SpanType
  | ThematicBreakType;

/** @deprecated Use CdaStructuredTextValue */
export type StructuredText<
  BlockRecord extends Record = Record,
  LinkRecord extends Record = Record,
  InlineBlockRecord extends Record = Record
> = {
  /**
   * A DatoCMS "dast" document
   *
   * https://www.datocms.com/docs/structured-text/dast
   */
  value: Document | unknown;
  /** Blocks associated with the Structured Text */
  blocks?: BlockRecord[];
  /** Inline blocks associated with the Structured Text */
  inlineBlocks?: InlineBlockRecord[];
  /** Links associated with the Structured Text */
  links?: LinkRecord[];
};

/**
 * CDA (Content Delivery API) format for structured text values.
 *
 * Structured Text enables authors to create rich text content, on par with
 * traditional editors.
 *
 * Additionally, it allows records and Media Area assets to be linked dynamically
 * and embedded within the flow of the text.
 */
export type CdaStructuredTextValue<
  BlockRecord extends Record = Record,
  LinkRecord extends Record = Record,
  InlineBlockRecord extends Record = Record
> = StructuredText<BlockRecord, LinkRecord, InlineBlockRecord>;

/** @deprecated Use TypesafeCdaStructuredTextValue */
export type TypesafeStructuredText<
  BlockRecord extends Record = Record,
  LinkRecord extends Record = Record,
  InlineBlockRecord extends Record = Record
> = {
  /**
   * A DatoCMS "dast" document
   *
   * https://www.datocms.com/docs/structured-text/dast
   */
  value: Document;
  /** Blocks associated with the Structured Text */
  blocks?: BlockRecord[];
  /** Inline blocks associated with the Structured Text */
  inlineBlocks?: InlineBlockRecord[];
  /** Links associated with the Structured Text */
  links?: LinkRecord[];
};

/**
 * CDA (Content Delivery API) format for structured text values.
 *
 * Structured Text enables authors to create rich text content, on par with
 * traditional editors.
 *
 * Additionally, it allows records and Media Area assets to be linked dynamically
 * and embedded within the flow of the text.
 */
export type TypesafeCdaStructuredTextValue<
  BlockRecord extends Record = Record,
  LinkRecord extends Record = Record,
  InlineBlockRecord extends Record = Record
> = TypesafeStructuredText<BlockRecord, LinkRecord, InlineBlockRecord>;

export type Record = {
  __typename: string;
  id: string;
} & {
  [prop: string]: unknown;
};
