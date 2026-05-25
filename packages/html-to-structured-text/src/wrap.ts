import { Span } from 'datocms-structured-text-utils';
import { Node } from './types.js';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isPhrasing(node: Node): boolean {
  return node.type === 'span' || node.type === 'link';
}

export function wrap(nodes: Node[]): Node[] {
  return runs(nodes, onphrasing);

  function onphrasing(nodes: Node[]): Node[] {
    const head = nodes[0];
    if (
      nodes.length === 1 &&
      head.type === 'span' &&
      (head.value === ' ' || head.value === '\n')
    ) {
      return [];
    }

    return [{ type: 'paragraph', children: nodes as Span[] }];
  }
}

type NodeHandler = (nodes: Node[]) => Node[];
type SingleHandler = (node: Node) => Node[];

// Wrap all runs of dast phrasing content in `paragraph` nodes.
function runs(
  nodes: Node[],
  onphrasing: NodeHandler,
  onnonphrasing?: SingleHandler,
): Node[] {
  const nonphrasing = onnonphrasing || identity;
  const flattened = flatten(nodes);
  let result: Node[] = [];
  let index = -1;
  let node: Node;
  let queue: Node[] | undefined;

  while (++index < flattened.length) {
    node = flattened[index];

    if (isPhrasing(node)) {
      if (!queue) queue = [];
      queue.push(node);
    } else {
      if (queue) {
        result = result.concat(onphrasing(queue));
        queue = undefined;
      }

      result = result.concat(nonphrasing(node));
    }
  }

  if (queue) {
    result = result.concat(onphrasing(queue));
  }

  return result;
}

// Flatten a list of nodes.
function flatten(nodes: Node[]): Node[] {
  let flattened: Node[] = [];
  let index = -1;

  while (++index < nodes.length) {
    const node = nodes[index];

    // Straddling: some elements are *weird*.
    // Namely: `map`, `ins`, `del`, and `a`, as they are hybrid elements.
    // See: <https://html.spec.whatwg.org/#paragraphs>.
    // Paragraphs are the weirdest of them all.
    // See the straddling fixture for more info!
    // `ins` is ignored in mdast, so we don't need to worry about that.
    // `map` maps to its content, so we don't need to worry about that either.
    // `del` maps to `delete` and `a` to `link`, so we do handle those.
    // What we'll do is split `node` over each of its children.
    if (
      node.type === 'link' &&
      node.children &&
      needed(node.children as Node[])
    ) {
      flattened = flattened.concat(split(node));
    } else {
      flattened.push(node);
    }
  }

  return flattened;
}

function hasChildren(node: Node): node is Node & { children: Node[] } {
  return 'children' in node && Array.isArray(node.children);
}

// Check if there are non-phrasing mdast nodes returned.
// This is needed if a fragment is given, which could just be a sentence, and
// doesn't need a wrapper paragraph.
export function needed(nodes: Node[]): boolean {
  let index = -1;

  while (++index < nodes.length) {
    const node = nodes[index];

    if (!isPhrasing(node) || (hasChildren(node) && needed(node.children))) {
      return true;
    }
  }
  return false;
}

type MutableNode = Record<string, unknown> & { children?: Node[] };

function split(node: Node): Node[] {
  const children = hasChildren(node) ? node.children : [];
  return runs(children, onphrasing, onnonphrasing);

  // Use `child`, add `parent` as its first child, put the original children
  // into `parent`.
  function onnonphrasing(child: Node): Node[] {
    const parent: MutableNode = deepClone(shallow(node));
    const copy: MutableNode = shallow(child);

    copy.children = [parent as unknown as Node];
    if (hasChildren(child)) {
      parent.children = child.children;
    }

    return [copy as unknown as Node];
  }

  // Use `parent`, put the phrasing run inside it.
  function onphrasing(nodes: Node[]): Node[] {
    const parent: MutableNode = deepClone(shallow(node));
    parent.children = nodes;
    return [parent as unknown as Node];
  }
}

function identity(n: Node): Node[] {
  return [n];
}

function shallow(node: Node): Record<string, unknown> {
  const copy: Record<string, unknown> = {};

  for (const key in node) {
    if (Object.prototype.hasOwnProperty.call(node, key) && key !== 'children') {
      copy[key] = (node as Record<string, unknown>)[key];
    }
  }

  return copy;
}
