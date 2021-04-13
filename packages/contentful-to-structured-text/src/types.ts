import { Node, Root, NodeType, Mark } from 'datocms-structured-text-utils';
import {
  Block as ContentfulBlock,
  Inline as ContentfulInline,
  Document as ContentfulDocument,
  Text as ContentfulText,
  Mark as ContentfulMark,
  TopLevelBlock as ContentfulRootNode,
} from '@contentful/rich-text-types';

export { Node, Root, NodeType, Mark };
export {
  ContentfulBlock,
  ContentfulInline,
  ContentfulDocument,
  ContentfulText,
  ContentfulMark,
  ContentfulRootNode,
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

// export interface HastProperties {
//   className?: string[];
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   [key: string]: any;
// }

// export interface RichTextElementNode {
//   type: 'element';
//   tagName: string;
//   properties?: HastProperties;
//   children?: ContentfulNode[];
// }

export type ContentfulNode =
  | ContentfulText
  | ContentfulBlock
  | ContentfulRootNode;
