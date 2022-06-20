import { Node, Root, NodeType, Mark } from 'datocms-structured-text-utils';

import {
  Block as ContentfulBlock,
  Inline as ContentfulInline,
  Paragraph as ContentfulParagraph,
  Text as ContentfulTextNode,
  Document as ContentfulDocument,
  TopLevelBlock as ContentfulRootNode,
  Quote as ContentfulQuote,
  Hr as ContentfulHr,
  OrderedList as ContentfulOrderedList,
  UnorderedList as ContentfulUnorderedList,
  ListItem as ContentfulListItem,
  Hyperlink as ContentfulHyperLink,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
} from '@contentful/rich-text-types';

export type { Node, Root, NodeType, Mark };

export type {
  ContentfulInline,
  ContentfulTextNode,
  ContentfulRootNode,
  ContentfulDocument,
  ContentfulParagraph,
  ContentfulQuote,
  ContentfulHr,
  ContentfulListItem,
  ContentfulHyperLink,
};

export interface Context {
  /** The parent `dast` node type. */
  parentNodeType: NodeType;
  /** The parent Contentful node. */
  parentNode: ContentfulNode | null;
  /** A reference to the current handlers - merged default + user handlers. */
  handlers: Handler[];
  /** A reference to the default handlers record (map). */
  defaultHandlers: Handler[];
  /** Marks for span nodes. */
  allowedMarks: Mark[];
  /**  */
  allowedBlocks: NodeType[];
}
export interface Handler {
  guard: (node: ContentfulNode) => boolean;
  handle: (
    node: ContentfulNode,
    context: Context,
  ) => Promise<Node | Array<Node> | void>;
}

export type ContentfulNode =
  | ContentfulDocument
  | ContentfulRootNode
  | ContentfulTextNode
  | ContentfulBlock
  | ContentfulInline;

export type ContentfulHeading =
  | Heading1
  | Heading2
  | Heading3
  | Heading4
  | Heading5
  | Heading6;

export type ContentfulNodeWithContent = ContentfulBlock | ContentfulInline;

export type ContentfulList = ContentfulOrderedList | ContentfulUnorderedList;
