/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import extend from 'extend';
import { Node } from './types';

// Utility to convert a string into a function which checks a given node’s type
// for said string.
const isPhrasing = (node: Node) => {
  return node.type === 'span' || node.type === 'link';
};

// Wraps consecutive spans and links into a single paragraph
export function wrap(nodes: Node[]): Node[] {
  return runs(nodes, onphrasing);

  function onphrasing(nodes: Node[]) {
    return { type: 'paragraph', children: nodes };
  }
}

// Wrap all runs of dast phrasing content in `paragraph` nodes.
function runs(nodes, onphrasing, onnonphrasing) {
  const nonphrasing = onnonphrasing || identity;
  const flattened = flatten(nodes);
  let result = [];
  let index = -1;
  let node;
  let queue;

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
function flatten(nodes) {
  let flattened = [];
  let index = -1;
  let node;

  while (++index < nodes.length) {
    node = nodes[index];

    // Straddling: some elements are *weird*.
    // Namely: `map`, `ins`, `del`, and `a`, as they are hybrid elements.
    // See: <https://html.spec.whatwg.org/#paragraphs>.
    // Paragraphs are the weirdest of them all.
    // See the straddling fixture for more info!
    // `ins` is ignored in mdast, so we don’t need to worry about that.
    // `map` maps to its content, so we don’t need to worry about that either.
    // `del` maps to `delete` and `a` to `link`, so we do handle those.
    // What we’ll do is split `node` over each of its children.
    if (
      (node.type === 'delete' || node.type === 'link') &&
      needed(node.children)
    ) {
      flattened = flattened.concat(split(node));
    } else {
      flattened.push(node);
    }
  }

  return flattened;
}

// Check if there are non-phrasing mdast nodes returned.
// This is needed if a fragment is given, which could just be a sentence, and
// doesn’t need a wrapper paragraph.
export function needed(nodes: Node[]): boolean {
  let index = -1;
  let node;

  while (++index < nodes.length) {
    node = nodes[index];

    if (!isPhrasing(node) || (node.children && needed(node.children))) {
      return true;
    }
  }
  return false;
}

function split(node) {
  return runs(node.children, onphrasing, onnonphrasing);

  // Use `child`, add `parent` as its first child, put the original children
  // into `parent`.
  function onnonphrasing(child) {
    const parent = extend(true, {}, shallow(node));
    const copy = shallow(child);

    copy.children = [parent];
    parent.children = child.children;

    return copy;
  }

  // Use `parent`, put the phrasing run inside it.
  function onphrasing(nodes) {
    const parent = extend(true, {}, shallow(node));
    parent.children = nodes;
    return parent;
  }
}

function identity(n) {
  return n;
}

function shallow(node) {
  const copy = {};
  let key;

  for (key in node) {
    if ({}.hasOwnProperty.call(node, key) && key !== 'children') {
      copy[key] = node[key];
    }
  }

  return copy;
}
