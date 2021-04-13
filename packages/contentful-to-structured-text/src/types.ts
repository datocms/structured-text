import { Node, Root, NodeType, Mark } from 'datocms-structured-text-utils';

export { Node, Root, NodeType, Mark };

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
  parentNode: RichTextNode;
  /** A reference to the current handlers - merged default + user handlers. */
  handlers: Record<string, Handler<unknown>>;
  /** A reference to the default handlers record (map). */
  defaultHandlers: Record<string, Handler<unknown>>;
  /** true if the content can include newlines, and false if not (such as in headings). */
  wrapText: boolean;
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

export type Handler<RichTextNodeType> = (
  createNodeFunction: CreateNodeFunction,
  node: RichTextNodeType,
  context: Context,
) =>
  | Promise<Node | Array<Node> | void>
  | Array<Promise<Node | Array<Node> | void>>;

export interface HastProperties {
  className?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface RichTextTextNode {
  type: 'text';
  value: string;
}

export interface RichTextElementNode {
  type: 'element';
  tagName: string;
  properties?: HastProperties;
  children?: RichTextNode[];
}

export interface RichTextRootNode {
  nodeType: 'document';
  data: {};
  content?: RichTextNode[];
}

export type RichTextNode =
  | RichTextTextNode
  | RichTextElementNode
  | RichTextRootNode;
