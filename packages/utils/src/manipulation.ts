/**
 * Tree manipulation utilities for DatoCMS structured text documents.
 *
 * Provides a set of low-level utilities for visiting, transforming, and querying
 * structured text trees. Works with all tree variants (regular, request, nested).
 */

/**
 * Recursively extract all possible node types that can appear in a tree structure
 */
type AllNodesInTree<T, Depth extends number = 10> = Depth extends 0
  ? T extends readonly unknown[]
    ? never
    : T
  : T extends readonly (infer U)[]
  ? AllNodesInTree<U, Prev<Depth>>
  : T extends { children: infer Children }
  ? T | AllNodesInTree<Children, Prev<Depth>>
  : T;

type Prev<T extends number> = T extends 0
  ? 0
  : T extends 1
  ? 0
  : T extends 2
  ? 1
  : T extends 3
  ? 2
  : T extends 4
  ? 3
  : T extends 5
  ? 4
  : T extends 6
  ? 5
  : T extends 7
  ? 6
  : T extends 8
  ? 7
  : T extends 9
  ? 8
  : T extends 10
  ? 9
  : number;

/**
 * Path through the Structured Text tree structure
 */
export type TreePath = readonly (string | number)[];

/**
 * Input that can be either a node or a structured text field value
 */
type StructuredTextDocumentOrNode<T> = T | Document<T>;

/**
 * Generic predicate function type for Structured Text tree node filtering
 */
export type NodePredicate<T, R> = (
  node: AllNodesInTree<T>,
  parent: AllNodesInTree<T> | null,
  path: TreePath,
) => R;

type Document<T> = {
  schema: 'dast';
  document: T;
};

/**
 * Check if a value is a structured text field value
 */
function isDocument<T>(input: unknown): input is Document<T> {
  return (
    typeof input === 'object' &&
    input !== null &&
    'schema' in input &&
    (input as { schema: unknown }).schema === 'dast' &&
    'document' in input
  );
}

/**
 * Extract the actual node from either a node or document wrapper
 */
function extractNode<T>(input: StructuredTextDocumentOrNode<T>): T {
  return isDocument(input) ? (input.document as T) : (input as T);
}

/**
 * Check if a value has children property that is an array
 */
function hasChildren(node: unknown): node is { children: readonly unknown[] } {
  return (
    typeof node === 'object' &&
    node !== null &&
    'children' in node &&
    Array.isArray((node as { children: unknown }).children)
  );
}

/**
 * Visit every node in the Structured Text tree, calling the visitor function for each.
 * Uses pre-order traversal (parent is visited before its children).
 *
 * @template T - The type of the root node in the Structured Text tree
 * @param input - A structured text document, or a specific DAST node
 * @param visitor - Synchronous function called for each node. Receives the node, its parent, and path through the Structured Text tree
 */
export function forEachNode<T>(
  input: StructuredTextDocumentOrNode<T>,
  visitor: NodePredicate<T, void>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): void {
  const node = extractNode(input);

  // Visit current node
  visitor(node as AllNodesInTree<T>, parent, path);

  // Recursively visit children
  if (hasChildren(node)) {
    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      forEachNode(child as T, visitor, node as AllNodesInTree<T>, [
        ...path,
        'children',
        index,
      ]);
    }
  }
}

/**
 * Visit every node in the Structured Text tree, calling the visitor function for each.
 * Uses pre-order traversal (parent is visited before its children).
 *
 * @template T - The type of the root node in the Structured Text tree
 * @param input - A structured text document, or a specific DAST node
 * @param visitor - Asynchronous function called for each node. Receives the node, its parent, and path through the Structured Text tree
 * @returns Promise that resolves when all nodes have been visited
 */
export async function forEachNodeAsync<T>(
  input: StructuredTextDocumentOrNode<T>,
  visitor: NodePredicate<T, Promise<void>>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): Promise<void> {
  const node = extractNode(input);

  // Visit current node
  await visitor(node as AllNodesInTree<T>, parent, path);

  // Recursively visit children
  if (hasChildren(node)) {
    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      await forEachNodeAsync(child as T, visitor, node as AllNodesInTree<T>, [
        ...path,
        'children',
        index,
      ]);
    }
  }
}

/**
 * Transform nodes in the Structured Text tree by applying a mapping function.
 * Creates a new tree structure with transformed nodes while preserving the Structured Text tree hierarchy.
 *
 * @template T - The type of nodes in the input Structured Text tree
 * @template R - The type of nodes in the output tree
 * @param input - A structured text document
 * @param mapper - Synchronous function that transforms each node. Receives the node, its parent, and path
 * @returns The transformed document
 */
export function mapNodes<T, R>(
  input: Document<T>,
  mapper: NodePredicate<T, R>,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): Document<T>;

/**
 * Transform nodes in the Structured Text tree by applying a mapping function.
 * Creates a new tree structure with transformed nodes while preserving the Structured Text tree hierarchy.
 *
 * @template T - The type of nodes in the input Structured Text tree
 * @template R - The type of nodes in the output tree
 * @param input - A specific DAST node
 * @param mapper - Synchronous function that transforms each node. Receives the node, its parent, and path
 * @returns The transformed node
 */
export function mapNodes<T, R>(
  input: T,
  mapper: NodePredicate<T, R>,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): T;

export function mapNodes<T, R>(
  input: StructuredTextDocumentOrNode<T>,
  mapper: NodePredicate<T, R>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): StructuredTextDocumentOrNode<R> {
  const node = extractNode(input);

  // Transform current node
  const transformedNode = mapper(node as AllNodesInTree<T>, parent, path);

  // If the original node has children, recursively transform them
  let result: R;
  if (
    hasChildren(node) &&
    typeof transformedNode === 'object' &&
    transformedNode !== null
  ) {
    const transformedChildren = node.children.map((child, index) =>
      extractNode(
        mapNodes(child as T, mapper, node as AllNodesInTree<T>, [
          ...path,
          'children',
          index,
        ]),
      ),
    );

    result = {
      ...transformedNode,
      children: transformedChildren,
    } as R;
  } else {
    result = transformedNode;
  }

  // If input was a document wrapper, return a document wrapper
  if (isDocument(input)) {
    return {
      schema: 'dast' as const,
      document: result,
    };
  }

  return result;
}

/**
 * Transform nodes in the Structured Text tree by applying a mapping function.
 * Creates a new tree structure with transformed nodes while preserving the Structured Text tree hierarchy.
 *
 * @template T - The type of nodes in the input Structured Text tree
 * @template R - The type of nodes in the output tree
 * @param input - A structured text document
 * @param mapper - Asynchronous function that transforms each node. Receives the node, its parent, and path
 * @returns Promise that resolves to the transformed document
 */
export async function mapNodesAsync<T, R>(
  input: Document<T>,
  mapper: NodePredicate<T, Promise<R>>,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): Promise<Document<R>>;

/**
 * Transform nodes in the Structured Text tree by applying a mapping function.
 * Creates a new tree structure with transformed nodes while preserving the Structured Text tree hierarchy.
 *
 * @template T - The type of nodes in the input Structured Text tree
 * @template R - The type of nodes in the output tree
 * @param input - A specific DAST node
 * @param mapper - Asynchronous function that transforms each node. Receives the node, its parent, and path
 * @returns Promise that resolves to the transformed node
 */
export async function mapNodesAsync<T, R>(
  input: T,
  mapper: NodePredicate<T, Promise<R>>,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): Promise<R>;

export async function mapNodesAsync<T, R>(
  input: StructuredTextDocumentOrNode<T>,
  mapper: NodePredicate<T, Promise<R>>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): Promise<StructuredTextDocumentOrNode<R>> {
  const node = extractNode(input);

  // Transform current node
  const transformedNode = await mapper(node as AllNodesInTree<T>, parent, path);

  // If the original node has children, recursively transform them
  let result: R;
  if (
    hasChildren(node) &&
    typeof transformedNode === 'object' &&
    transformedNode !== null
  ) {
    const transformedChildren = await Promise.all(
      node.children.map(async (child, index) =>
        extractNode(
          await mapNodesAsync(child as T, mapper, node as AllNodesInTree<T>, [
            ...path,
            'children',
            index,
          ]),
        ),
      ),
    );

    result = {
      ...transformedNode,
      children: transformedChildren,
    } as R;
  } else {
    result = transformedNode;
  }

  // If input was a document wrapper, return a document wrapper
  if (isDocument(input)) {
    return {
      schema: 'dast' as const,
      document: result,
    };
  }

  return result;
}

/**
 * Collect all nodes that match the type guard function using depth-first search.
 * Returns an array containing all matching nodes along with their paths through the Structured Text tree.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @template U - The specific type that the type guard narrows to
 * @param input - A structured text document, or a specific DAST node
 * @param predicate - Type guard function that tests and narrows each node type
 * @returns Array of objects, each containing a matching node (with narrowed type) and its path
 */
export function collectNodes<T, U extends AllNodesInTree<T>>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: (
    node: AllNodesInTree<T>,
    parent: AllNodesInTree<T> | null,
    path: TreePath,
  ) => node is U,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): Array<{ node: U; path: TreePath }>;

/**
 * Collect all nodes that match the predicate function using depth-first search.
 * Returns an array containing all matching nodes along with their paths through the Structured Text tree.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A structured text document, or a specific DAST node
 * @param predicate - Synchronous function that tests each node. Should return true for desired nodes
 * @returns Array of objects, each containing a matching node and its path
 */
export function collectNodes<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, boolean>,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): Array<{ node: AllNodesInTree<T>; path: TreePath }>;

export function collectNodes<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, boolean>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): Array<{ node: AllNodesInTree<T>; path: TreePath }> {
  const results: Array<{ node: AllNodesInTree<T>; path: TreePath }> = [];

  forEachNode(
    input,
    (currentNode, currentParent, currentPath) => {
      if (predicate(currentNode, currentParent, currentPath)) {
        results.push({ node: currentNode, path: currentPath });
      }
    },
    parent,
    path,
  );

  return results;
}

/**
 * Collect all nodes that match the predicate function using depth-first search.
 * Returns an array containing all matching nodes along with their paths through the Structured Text tree.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A structured text document, or a specific DAST node
 * @param predicate - Asynchronous function that tests each node. Should return true for desired nodes
 * @returns Promise that resolves to an array of objects, each containing a matching node and its path
 */
export async function collectNodesAsync<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, Promise<boolean>>,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): Promise<Array<{ node: AllNodesInTree<T>; path: TreePath }>>;

export async function collectNodesAsync<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, Promise<boolean>>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): Promise<Array<{ node: AllNodesInTree<T>; path: TreePath }>> {
  const results: Array<{ node: AllNodesInTree<T>; path: TreePath }> = [];

  await forEachNodeAsync(
    input,
    async (currentNode, currentParent, currentPath) => {
      if (await predicate(currentNode, currentParent, currentPath)) {
        results.push({ node: currentNode, path: currentPath });
      }
    },
    parent,
    path,
  );

  return results;
}

/**
 * Find the first node that matches the type guard function using depth-first search.
 * Returns the first matching node along with its path through the Structured Text tree, or null if no match is found.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @template U - The specific type that the type guard narrows to
 * @param input - A structured text document, or a specific DAST node
 * @param predicate - Type guard function that tests and narrows each node type
 * @returns Object containing the first matching node (with narrowed type) and its path, or null if no match
 */
export function findFirstNode<T, U extends AllNodesInTree<T>>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: (
    node: AllNodesInTree<T>,
    parent: AllNodesInTree<T> | null,
    path: TreePath,
  ) => node is U,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): { node: U; path: TreePath } | null;

/**
 * Find the first node that matches the predicate function using depth-first search.
 * Returns the first matching node along with its path through the Structured Text tree, or null if no match is found.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A structured text document, or a specific DAST node
 * @param predicate - Synchronous function that tests each node. Should return true for desired nodes
 * @returns Object containing the first matching node and its path, or null if no match
 */
export function findFirstNode<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, boolean>,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): { node: AllNodesInTree<T>; path: TreePath } | null;

export function findFirstNode<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, boolean>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): { node: AllNodesInTree<T>; path: TreePath } | null {
  const node = extractNode(input);

  // Check current node
  if (predicate(node as AllNodesInTree<T>, parent, path)) {
    return { node: node as AllNodesInTree<T>, path };
  }

  // Recursively search children
  if (hasChildren(node)) {
    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      const result = findFirstNode(
        child as T,
        predicate,
        node as AllNodesInTree<T>,
        [...path, 'children', index],
      );
      if (result) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Find the first node that matches the predicate function using depth-first search.
 * Returns the first matching node along with its path through the Structured Text tree, or null if no match is found.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A structured text document, or a specific DAST node
 * @param predicate - Asynchronous function that tests each node. Should return true for desired nodes
 * @returns Promise that resolves to an object containing the first matching node and its path, or null if no match
 */

/**
 * Find the first node that matches the predicate function using depth-first search.
 * Returns the first matching node along with its path through the Structured Text tree, or null if no match is found.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A structured text document, or a specific DAST node
 * @param predicate - Asynchronous function that tests each node. Should return true for desired nodes
 * @returns Promise that resolves to an object containing the first matching node and its path, or null if no match
 */
export async function findFirstNodeAsync<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, Promise<boolean>>,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): Promise<{ node: AllNodesInTree<T>; path: TreePath } | null>;

export async function findFirstNodeAsync<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, Promise<boolean>>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): Promise<{ node: AllNodesInTree<T>; path: TreePath } | null> {
  const node = extractNode(input);

  // Check current node
  if (await predicate(node as AllNodesInTree<T>, parent, path)) {
    return { node: node as AllNodesInTree<T>, path };
  }

  // Recursively search children
  if (hasChildren(node)) {
    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      const result = await findFirstNodeAsync(
        child as T,
        predicate,
        node as AllNodesInTree<T>,
        [...path, 'children', index],
      );
      if (result) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Prune the Structured Text tree, removing nodes that don't match the predicate.
 * Creates a new tree structure containing only nodes that pass the predicate test.
 * Maintains the Structured Text tree hierarchy - if a parent node is kept, its structure is preserved.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A structured text document
 * @param predicate - Synchronous function that tests each node. Nodes returning false are removed
 * @returns The pruned document, or null if root node is filtered out
 */
export function filterNodes<T>(
  input: Document<T>,
  predicate: NodePredicate<T, boolean>,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): Document<T> | null;

/**
 * Prune the Structured Text tree, removing nodes that don't match the predicate.
 * Creates a new tree structure containing only nodes that pass the predicate test.
 * Maintains the Structured Text tree hierarchy - if a parent node is kept, its structure is preserved.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A specific DAST node
 * @param predicate - Synchronous function that tests each node. Nodes returning false are removed
 * @returns The pruned node, or null if node is filtered out
 */
export function filterNodes<T>(
  input: T,
  predicate: NodePredicate<T, boolean>,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): T | null;

export function filterNodes<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, boolean>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): StructuredTextDocumentOrNode<T> | null {
  const node = extractNode(input);

  // If current node doesn't match predicate, return null
  if (!predicate(node as AllNodesInTree<T>, parent, path)) {
    return null;
  }

  // If node has no children, return it as-is
  let result: T;
  if (!hasChildren(node)) {
    result = node;
  } else {
    // Filter children recursively
    const childrenResults = node.children.map((child, index) => {
      const childResult = filterNodes(
        child as T,
        predicate,
        node as AllNodesInTree<T>,
        [...path, 'children', index],
      );
      return childResult ? extractNode(childResult) : null;
    });
    const prunedChildren = childrenResults.filter(
      (child): child is NonNullable<typeof child> => child !== null,
    );

    result = {
      ...node,
      children: prunedChildren,
    } as T;
  }

  // If input was a document wrapper, return a document wrapper
  if (isDocument(input)) {
    return {
      schema: 'dast' as const,
      document: result,
    };
  }

  return result;
}

/**
 * Prune the Structured Text tree, removing nodes that don't match the predicate.
 * Creates a new tree structure containing only nodes that pass the predicate test.
 * Maintains the Structured Text tree hierarchy - if a parent node is kept, its structure is preserved.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A structured text document
 * @param predicate - Asynchronous function that tests each node. Nodes returning false are removed
 * @returns Promise that resolves to the pruned document, or null if root node is filtered out
 */
export async function filterNodesAsync<T>(
  input: Document<T>,
  predicate: NodePredicate<T, Promise<boolean>>,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): Promise<Document<T> | null>;

/**
 * Prune the Structured Text tree, removing nodes that don't match the predicate.
 * Creates a new tree structure containing only nodes that pass the predicate test.
 * Maintains the Structured Text tree hierarchy - if a parent node is kept, its structure is preserved.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A specific DAST node
 * @param predicate - Asynchronous function that tests each node. Nodes returning false are removed
 * @returns Promise that resolves to the pruned node, or null if node is filtered out
 */
export async function filterNodesAsync<T>(
  input: T,
  predicate: NodePredicate<T, Promise<boolean>>,
  parent?: AllNodesInTree<T> | null,
  path?: TreePath,
): Promise<T | null>;

export async function filterNodesAsync<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, Promise<boolean>>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): Promise<StructuredTextDocumentOrNode<T> | null> {
  const node = extractNode(input);

  // If current node doesn't match predicate, return null
  if (!(await predicate(node as AllNodesInTree<T>, parent, path))) {
    return null;
  }

  // If node has no children, return it as-is
  let result: T;
  if (!hasChildren(node)) {
    result = node;
  } else {
    // Filter children recursively
    const childrenResults = await Promise.all(
      node.children.map(async (child, index) => {
        const childResult = await filterNodesAsync(
          child as T,
          predicate,
          node as AllNodesInTree<T>,
          [...path, 'children', index],
        );
        return childResult ? extractNode(childResult) : null;
      }),
    );
    const prunedChildren = childrenResults.filter(
      (child): child is NonNullable<typeof child> => child !== null,
    );

    result = {
      ...node,
      children: prunedChildren,
    } as T;
  }

  // If input was a document wrapper, return a document wrapper
  if (isDocument(input)) {
    return {
      schema: 'dast' as const,
      document: result,
    };
  }

  return result;
}

/**
 * Reduce the Structured Text tree to a single value by applying a reducer function to each node.
 * Uses pre-order traversal (parent is processed before its children).
 * The reducer function is called for each node with the current accumulator value.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @template R - The type of the accumulated result
 * @param input - A structured text document, or a specific DAST node
 * @param reducer - Synchronous function that processes each node and updates the accumulator
 * @param initialValue - The initial value for the accumulator
 * @returns The final accumulated value
 */
export function reduceNodes<T, R>(
  input: StructuredTextDocumentOrNode<T>,
  reducer: (
    accumulator: R,
    node: AllNodesInTree<T>,
    parent: AllNodesInTree<T> | null,
    path: TreePath,
  ) => R,
  initialValue: R,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): R {
  const node = extractNode(input);

  let accumulator = initialValue;

  forEachNode(
    node,
    (currentNode, currentParent, currentPath) => {
      accumulator = reducer(
        accumulator,
        currentNode,
        currentParent,
        currentPath,
      );
    },
    parent,
    path,
  );

  return accumulator;
}

/**
 * Reduce the Structured Text tree to a single value by applying a reducer function to each node.
 * Uses pre-order traversal (parent is processed before its children).
 * The reducer function is called for each node with the current accumulator value.
 *
 * @template T - The type of nodes in the Structured Text tree
 * @template R - The type of the accumulated result
 * @param input - A structured text document, or a specific DAST node
 * @param reducer - Asynchronous function that processes each node and updates the accumulator
 * @param initialValue - The initial value for the accumulator
 * @returns Promise that resolves to the final accumulated value
 */
export async function reduceNodesAsync<T, R>(
  input: StructuredTextDocumentOrNode<T>,
  reducer: (
    accumulator: R,
    node: AllNodesInTree<T>,
    parent: AllNodesInTree<T> | null,
    path: TreePath,
  ) => Promise<R>,
  initialValue: R,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): Promise<R> {
  const node = extractNode(input);

  let accumulator = initialValue;

  await forEachNodeAsync(
    node,
    async (currentNode, currentParent, currentPath) => {
      accumulator = await reducer(
        accumulator,
        currentNode,
        currentParent,
        currentPath,
      );
    },
    parent,
    path,
  );

  return accumulator;
}

/**
 * Check if any node in the Structured Text tree matches the predicate function.
 * Returns true as soon as the first matching node is found (short-circuit evaluation).
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A structured text document, or a specific DAST node
 * @param predicate - Synchronous function that tests each node. Should return true for matching nodes
 * @returns True if any node matches, false otherwise
 */
export function someNode<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, boolean>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): boolean {
  const node = extractNode(input);

  // Check current node
  if (predicate(node as AllNodesInTree<T>, parent, path)) {
    return true;
  }

  // Recursively check children
  if (hasChildren(node)) {
    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      if (
        someNode(child as T, predicate, node as AllNodesInTree<T>, [
          ...path,
          'children',
          index,
        ])
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if any node in the Structured Text tree matches the predicate function.
 * Returns true as soon as the first matching node is found (short-circuit evaluation).
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A structured text document, or a specific DAST node
 * @param predicate - Asynchronous function that tests each node. Should return true for matching nodes
 * @returns Promise that resolves to true if any node matches, false otherwise
 */
export async function someNodeAsync<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, Promise<boolean>>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): Promise<boolean> {
  const node = extractNode(input);

  // Check current node
  if (await predicate(node as AllNodesInTree<T>, parent, path)) {
    return true;
  }

  // Recursively check children
  if (hasChildren(node)) {
    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      if (
        await someNodeAsync(child as T, predicate, node as AllNodesInTree<T>, [
          ...path,
          'children',
          index,
        ])
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if every node in the Structured Text tree matches the predicate function.
 * Returns false as soon as the first non-matching node is found (short-circuit evaluation).
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A structured text document, or a specific DAST node
 * @param predicate - Synchronous function that tests each node. Should return true for valid nodes
 * @returns True if all nodes match, false otherwise
 */
export function everyNode<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, boolean>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): boolean {
  const node = extractNode(input);

  return !someNode(
    node,
    (
      currentNode: AllNodesInTree<T>,
      currentParent: AllNodesInTree<T> | null,
      currentPath: TreePath,
    ) => {
      return !predicate(currentNode, currentParent, currentPath);
    },
    parent,
    path,
  );
}

/**
 * Check if every node in the Structured Text tree matches the predicate function.
 * Returns false as soon as the first non-matching node is found (short-circuit evaluation).
 *
 * @template T - The type of nodes in the Structured Text tree
 * @param input - A structured text document, or a specific DAST node
 * @param predicate - Asynchronous function that tests each node. Should return true for valid nodes
 * @returns Promise that resolves to true if all nodes match, false otherwise
 */
export async function everyNodeAsync<T>(
  input: StructuredTextDocumentOrNode<T>,
  predicate: NodePredicate<T, Promise<boolean>>,
  parent: AllNodesInTree<T> | null = null,
  path: TreePath = [],
): Promise<boolean> {
  const node = extractNode(input);

  return !(await someNodeAsync(
    node,
    async (
      currentNode: AllNodesInTree<T>,
      currentParent: AllNodesInTree<T> | null,
      currentPath: TreePath,
    ) => {
      return !(await predicate(currentNode, currentParent, currentPath));
    },
    parent,
    path,
  ));
}
