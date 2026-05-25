import {
  Node,
  Root,
  NodeType,
  Mark,
  Heading,
} from 'datocms-structured-text-utils';

export type { Node, Root, NodeType, Mark };

/** The DAST node variant produced for a given `NodeType`. */
export type NodeOf<T extends NodeType> = Extract<Node, { type: T }>;

/**
 * The props (everything but `type`) accepted when creating a DAST node of a
 * given `NodeType`. For nodes with children, the `children` array can be
 * either the strict variant (e.g. `Span[]` for `link`) or the wide `Node[]`
 * produced by `visitChildren`. Handlers are responsible for validation.
 */
export type NodePropsFor<T extends NodeType> = Omit<
  NodeOf<T>,
  'type' | 'children'
> &
  (NodeOf<T> extends { children: Array<infer C> }
    ? { children: Array<C> | Array<Node> }
    : // eslint-disable-next-line @typescript-eslint/ban-types
      {});

export type CreateNodeFunction = <T extends NodeType>(
  type: T,
  props: NodePropsFor<T>,
) => NodeOf<T>;

export interface GlobalContext {
  /**
   * Whether the library has found a <base> tag or should not look further.
   * See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
   */
  baseUrlFound?: boolean;
  /** <base> tag url. This is used for resolving relative URLs. */
  baseUrl?: string | null;
  [key: string]: unknown;
}

export interface Context {
  /** The parent `dast` node type. */
  parentNodeType: NodeType;
  /** The parent `hast` node. */
  parentNode: HastNode | null;
  /** A reference to the current handlers - merged default + user handlers. */
  handlers: Record<string, Handler>;
  /** A reference to the default handlers record (map). */
  defaultHandlers: Record<string, Handler>;
  /** true if the content can include newlines, and false if not (such as in headings). */
  wrapText: boolean;
  /** Marks for span nodes. */
  marks?: Mark[];
  /** Allowed block types */
  allowedBlocks: string[];
  /** Allowed heading levels */
  allowedHeadingLevels: Heading['level'][];
  /** Allowed marks */
  allowedMarks: Mark[];
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

/**
 * What a `Handler` is allowed to return — sync or wrapped in a promise.
 * Custom user handlers can also return an array containing a mix of nodes
 * and unresolved promises; `visitChildren` flattens those.
 */
export type HandlerReturn =
  | Node
  | Array<Node | Promise<Node>>
  | null
  | undefined
  | void;

export type Handler = (
  createNodeFunction: CreateNodeFunction,
  node: HastNode,
  context: Context,
) => Promise<HandlerReturn> | HandlerReturn;

export interface HastProperties {
  className?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface HastTextNode {
  type: 'text';
  value: string;
}

export interface HastElementNode {
  type: 'element';
  tagName: string;
  properties?: HastProperties;
  children?: HastNode[];
}

export interface HastRootNode {
  type: 'root';
  children?: HastNode[];
}

export type HastNode = HastTextNode | HastElementNode | HastRootNode;
