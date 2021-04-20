import { Node, Root, NodeType, Mark } from 'datocms-structured-text-utils';

import {
  Block as ContentfulBlock,
  Inline as ContentfulInline,
  Paragraph as ContentfulParagraph,
  Text as ContentfulTextNode,
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

export { Node, Root, NodeType, Mark };

export {
  ContentfulInline,
  ContentfulTextNode,
  ContentfulRootNode,
  ContentfulParagraph,
  ContentfulQuote,
  ContentfulHr,
  ContentfulListItem,
  ContentfulHyperLink,
};

export type CreateNodeFunction = (
  type: NodeType,
  props: Omit<Node, 'type'>,
) => Node;

export interface GlobalContext {
  /**
   * Whether the library has found a <base> tag or should not look further.
   * See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
   */
  baseUrlFound?: boolean;
  /** <base> tag url. This is used for resolving relative URLs. */
  baseUrl?: string;
}

export interface Context {
  /** The parent `dast` node type. */
  parentNodeType: NodeType;
  /** The parent `hast` node. */
  parentNode: ContentfulNode;
  /** A reference to the current handlers - merged default + user handlers. */
  handlers: Record<string, Handler<unknown>>;
  /** A reference to the default handlers record (map). */
  defaultHandlers: Record<string, Handler<unknown>>;
  /** Marks for span nodes. */
  marks?: Mark[];
  /**
   * Prefix for language detection in code blocks.
   *
   * Detection is done on a class name eg class="language-html".
   * Default is `language-`.
   */
  codePrefix?: string;
  /** Properties in this object are avaliable to every handler as Context
   * is not deeply cloned.
   */
  global: GlobalContext;
}

export type Handler<ContentfulNodeType> = (
  createNodeFunction: CreateNodeFunction,
  node: ContentfulNodeType,
  context: Context,
) =>
  | Promise<Node | Array<Node> | void>
  | Array<Promise<Node | Array<Node> | void>>;

export type ContentfulNode =
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
