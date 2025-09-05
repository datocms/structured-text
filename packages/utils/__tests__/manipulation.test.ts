import {
  forEachNode,
  forEachNodeAsync,
  mapNodes,
  mapNodesAsync,
  collectNodes,
  collectNodesAsync,
  findFirstNode,
  findFirstNodeAsync,
  filterNodes,
  filterNodesAsync,
  reduceNodes,
  reduceNodesAsync,
  someNode,
  someNodeAsync,
  everyNode,
  everyNodeAsync,
} from '../src/manipulation';
import {
  isSpan,
  isHeading,
  isCode,
  isBlock,
  isRoot,
  isThematicBreak,
} from '../src/guards';
import type { Document, Root } from '../src/types';

describe('manipulation utilities', () => {
  // Helper for async tests
  const wait = (ms = 1) => new Promise((resolve) => setTimeout(resolve, ms));

  // Sample document for testing
  const sampleDocument: Document = {
    schema: 'dast',
    document: {
      type: 'root',
      children: [
        {
          type: 'heading',
          level: 1,
          children: [{ type: 'span', value: 'Main Title' }],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'span', value: 'This is a ' },
            { type: 'span', marks: ['strong'], value: 'bold' },
            { type: 'span', value: ' paragraph.' },
          ],
        },
        {
          type: 'list',
          style: 'bulleted',
          children: [
            {
              type: 'listItem',
              children: [
                {
                  type: 'paragraph',
                  children: [{ type: 'span', value: 'First item' }],
                },
              ],
            },
            {
              type: 'listItem',
              children: [
                {
                  type: 'paragraph',
                  children: [{ type: 'span', value: 'Second item' }],
                },
              ],
            },
          ],
        },
        {
          type: 'block',
          item: 'block-123',
        },
        {
          type: 'code',
          language: 'javascript',
          code: 'console.log("hello");',
        },
      ],
    },
  };

  // Simple root node for basic tests
  const simpleRoot: Root = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'span', value: 'Hello' },
          { type: 'span', value: ' World' },
        ],
      },
    ],
  };

  describe('forEachNode', () => {
    it('visits all nodes in document order', () => {
      const visited: string[] = [];

      forEachNode(sampleDocument, (node) => {
        visited.push(node.type);
      });

      expect(visited).toEqual([
        'root',
        'heading',
        'span',
        'paragraph',
        'span',
        'span',
        'span',
        'list',
        'listItem',
        'paragraph',
        'span',
        'listItem',
        'paragraph',
        'span',
        'block',
        'code',
      ]);
    });

    it('provides correct parent and path information', () => {
      const nodeInfo: Array<{
        type: string;
        parent: string | null;
        path: string;
      }> = [];

      forEachNode(simpleRoot, (node, parent, path) => {
        nodeInfo.push({
          type: node.type,
          parent: parent?.type || null,
          path: path.join('.'),
        });
      });

      expect(nodeInfo).toEqual([
        { type: 'root', parent: null, path: '' },
        { type: 'paragraph', parent: 'root', path: 'children.0' },
        { type: 'span', parent: 'paragraph', path: 'children.0.children.0' },
        { type: 'span', parent: 'paragraph', path: 'children.0.children.1' },
      ]);
    });

    it('works with plain nodes (not wrapped in document)', () => {
      const visited: string[] = [];

      forEachNode(simpleRoot, (node) => {
        visited.push(node.type);
      });

      expect(visited).toEqual(['root', 'paragraph', 'span', 'span']);
    });
  });

  describe('forEachNodeAsync', () => {
    it('visits all nodes asynchronously', async () => {
      const visited: string[] = [];

      await forEachNodeAsync(sampleDocument, async (node) => {
        await wait();
        visited.push(node.type);
      });

      expect(visited).toEqual([
        'root',
        'heading',
        'span',
        'paragraph',
        'span',
        'span',
        'span',
        'list',
        'listItem',
        'paragraph',
        'span',
        'listItem',
        'paragraph',
        'span',
        'block',
        'code',
      ]);
    });
  });

  describe('mapNodes', () => {
    it('transforms all nodes while preserving structure', () => {
      const result = mapNodes(simpleRoot, (node) => ({
        ...node,
        transformed: true,
      }));

      expect(result).toMatchObject({
        type: 'root',
        transformed: true,
        children: [
          {
            type: 'paragraph',
            transformed: true,
            children: [
              { type: 'span', value: 'Hello', transformed: true },
              { type: 'span', value: ' World', transformed: true },
            ],
          },
        ],
      });
    });

    it('preserves document wrapper when input is document', () => {
      const result = mapNodes(sampleDocument, (node) => ({
        ...node,
        mapped: true,
      }));

      expect(result).toHaveProperty('schema', 'dast');
      expect(result).toHaveProperty('document');
      expect((result as Document).document).toHaveProperty('mapped', true);
    });

    it('can transform node types', () => {
      const result = mapNodes(simpleRoot, (node) => {
        if (isSpan(node)) {
          return { ...node, type: 'span' as const, transformed: true };
        }
        return node;
      });

      const transformedSpans = collectNodes(
        result,
        (node) => isSpan(node) && 'transformed' in node && node.transformed,
      );

      expect(transformedSpans).toHaveLength(2);
      expect(transformedSpans.every(({ node }) => isSpan(node))).toBe(true);
    });
  });

  describe('mapNodesAsync', () => {
    it('transforms all nodes asynchronously', async () => {
      const result = await mapNodesAsync(simpleRoot, async (node) => {
        await wait();
        return { ...node, asyncTransformed: true };
      });

      expect(result).toMatchObject({
        type: 'root',
        asyncTransformed: true,
        children: [
          {
            type: 'paragraph',
            asyncTransformed: true,
            children: [
              { type: 'span', value: 'Hello', asyncTransformed: true },
              { type: 'span', value: ' World', asyncTransformed: true },
            ],
          },
        ],
      });
    });
  });

  describe('collectNodes', () => {
    it('collects all nodes matching predicate', () => {
      const spanNodes = collectNodes(sampleDocument, isSpan);

      expect(spanNodes).toHaveLength(6);
      expect(spanNodes.every(({ node }) => isSpan(node))).toBe(true);
      expect(spanNodes[0].node).toMatchObject({
        type: 'span',
        value: 'Main Title',
      });
      expect(spanNodes[0].path).toEqual(['children', 0, 'children', 0]);
    });

    it('collects nodes with specific attributes', () => {
      const strongSpans = collectNodes(
        sampleDocument,
        (node) => isSpan(node) && (node.marks?.includes('strong') ?? false),
      );

      expect(strongSpans).toHaveLength(1);
      expect(strongSpans[0].node).toMatchObject({
        type: 'span',
        marks: ['strong'],
        value: 'bold',
      });
    });

    it('returns empty array when no nodes match', () => {
      const result = collectNodes(simpleRoot, isHeading);
      expect(result).toEqual([]);
    });

    it('provides precise types when using type guards', () => {
      // Test with isSpan type guard - should return Array<{ node: Span; path: TreePath }>
      const spanNodes = collectNodes(sampleDocument, isSpan);
      expect(spanNodes).toHaveLength(6);
      spanNodes.forEach(({ node }) => {
        // TypeScript should know node is Span type with value property
        expect(node.type).toBe('span');
        expect(typeof node.value).toBe('string');
      });

      // Test with isCode type guard - should return Array<{ node: Code; path: TreePath }>
      const codeNodes = collectNodes(sampleDocument, isCode);
      expect(codeNodes).toHaveLength(1);
      if (codeNodes.length > 0) {
        // TypeScript should know node is Code type with code property
        expect(codeNodes[0].node.type).toBe('code');
        expect(typeof codeNodes[0].node.code).toBe('string');
        expect(codeNodes[0].node.code).toBe('console.log("hello");');
      }
    });
  });

  describe('collectNodesAsync', () => {
    it('collects nodes asynchronously', async () => {
      const spanNodes = await collectNodesAsync(
        sampleDocument,
        async (node) => {
          await wait();
          return isSpan(node);
        },
      );

      expect(spanNodes).toHaveLength(6);
      expect(spanNodes.every(({ node }) => isSpan(node))).toBe(true);
    });
  });

  describe('findFirstNode', () => {
    it('finds the first node matching predicate', () => {
      const firstSpan = findFirstNode(sampleDocument, isSpan);

      expect(firstSpan).not.toBeNull();
      if (firstSpan) {
        expect(firstSpan.node).toMatchObject({
          type: 'span',
          value: 'Main Title',
        });
        expect(firstSpan.path).toEqual(['children', 0, 'children', 0]);
      }
    });

    it('finds nodes with specific attributes', () => {
      const strongSpan = findFirstNode(
        sampleDocument,
        (node) => isSpan(node) && (node.marks?.includes('strong') ?? false),
      );

      expect(strongSpan).not.toBeNull();
      if (strongSpan) {
        expect(strongSpan.node).toMatchObject({
          type: 'span',
          marks: ['strong'],
          value: 'bold',
        });
      }
    });

    it('returns null when no nodes match', () => {
      const result = findFirstNode(simpleRoot, isHeading);
      expect(result).toBeNull();
    });

    it('finds root node when it matches', () => {
      const rootNode = findFirstNode(sampleDocument, isRoot);

      expect(rootNode).not.toBeNull();
      if (rootNode) {
        expect(rootNode.node.type).toBe('root');
        expect(rootNode.path).toEqual([]);
      }
    });

    it('works with plain nodes (not wrapped in document)', () => {
      const firstSpan = findFirstNode(simpleRoot, isSpan);

      expect(firstSpan).not.toBeNull();
      if (firstSpan) {
        expect(firstSpan.node).toMatchObject({ type: 'span', value: 'Hello' });
        expect(firstSpan.path).toEqual(['children', 0, 'children', 0]);
      }
    });

    it('stops at first match (short-circuit behavior)', () => {
      let visitCount = 0;
      const result = findFirstNode(sampleDocument, (node) => {
        visitCount++;
        return isSpan(node);
      });

      expect(result).not.toBeNull();
      expect(visitCount).toBeLessThan(16); // Should not visit all nodes
      if (result) {
        expect(result.node).toMatchObject({
          type: 'span',
          value: 'Main Title',
        });
      }
    });

    it('provides correct parent and path information', () => {
      let foundNodeInfo: {
        nodeType: string;
        parentType: string | null;
        pathLength: number;
      } | null = null;

      findFirstNode(sampleDocument, (node, parent, path) => {
        if (isSpan(node) && node.value === 'bold') {
          foundNodeInfo = {
            nodeType: node.type,
            parentType: parent?.type || null,
            pathLength: path.length,
          };
          return true;
        }
        return false;
      });

      expect(foundNodeInfo).toEqual({
        nodeType: 'span',
        parentType: 'paragraph',
        pathLength: 4,
      });
    });

    it('provides precise types when using type guards', () => {
      // Test with isRoot type guard - should return Root type
      const rootResult = findFirstNode(sampleDocument, isRoot);
      expect(rootResult).not.toBeNull();
      if (rootResult) {
        // TypeScript should know this is Root type with children property
        expect(rootResult.node.type).toBe('root');
        expect(Array.isArray(rootResult.node.children)).toBe(true);
        expect(rootResult.path).toEqual([]);
      }

      // Test with isSpan type guard - should return Span type
      const spanResult = findFirstNode(sampleDocument, isSpan);
      expect(spanResult).not.toBeNull();
      if (spanResult) {
        // TypeScript should know this is Span type with value property
        expect(spanResult.node.type).toBe('span');
        expect(typeof spanResult.node.value).toBe('string');
        expect(spanResult.node.value).toBe('Main Title');
      }

      // Test with isCode type guard
      const codeResult = findFirstNode(sampleDocument, isCode);
      expect(codeResult).not.toBeNull();
      if (codeResult) {
        // TypeScript should know this is Code type with code property
        expect(codeResult.node.type).toBe('code');
        expect(typeof codeResult.node.code).toBe('string');
        expect(codeResult.node.code).toBe('console.log("hello");');
      }
    });
  });

  describe('findFirstNodeAsync', () => {
    it('finds the first node matching predicate asynchronously', async () => {
      const firstSpan = await findFirstNodeAsync(
        sampleDocument,
        async (node) => {
          await wait();
          return isSpan(node);
        },
      );

      expect(firstSpan).not.toBeNull();
      if (firstSpan) {
        expect(firstSpan.node).toMatchObject({
          type: 'span',
          value: 'Main Title',
        });
        expect(firstSpan.path).toEqual(['children', 0, 'children', 0]);
      }
    });

    it('finds nodes with specific attributes asynchronously', async () => {
      const strongSpan = await findFirstNodeAsync(
        sampleDocument,
        async (node) => {
          await wait();
          return isSpan(node) && (node.marks?.includes('strong') ?? false);
        },
      );

      expect(strongSpan).not.toBeNull();
      if (strongSpan) {
        expect(strongSpan.node).toMatchObject({
          type: 'span',
          marks: ['strong'],
          value: 'bold',
        });
      }
    });

    it('returns null when no nodes match asynchronously', async () => {
      const result = await findFirstNodeAsync(simpleRoot, async (node) => {
        await wait();
        return isHeading(node);
      });
      expect(result).toBeNull();
    });

    it('stops at first match asynchronously (short-circuit behavior)', async () => {
      let visitCount = 0;
      const result = await findFirstNodeAsync(sampleDocument, async (node) => {
        visitCount++;
        await wait();
        return isSpan(node);
      });

      expect(result).not.toBeNull();
      expect(visitCount).toBeLessThan(16); // Should not visit all nodes
      if (result) {
        expect(result.node).toMatchObject({
          type: 'span',
          value: 'Main Title',
        });
      }
    });

    it('provides correct parent and path information asynchronously', async () => {
      let foundNodeInfo: {
        nodeType: string;
        parentType: string | null;
        pathLength: number;
      } | null = null;

      await findFirstNodeAsync(sampleDocument, async (node, parent, path) => {
        await wait();
        if (isSpan(node) && node.value === 'bold') {
          foundNodeInfo = {
            nodeType: node.type,
            parentType: parent?.type || null,
            pathLength: path.length,
          };
          return true;
        }
        return false;
      });

      expect(foundNodeInfo).toEqual({
        nodeType: 'span',
        parentType: 'paragraph',
        pathLength: 4,
      });
    });
  });

  describe('filterNodes', () => {
    it('filters out nodes that do not match predicate', () => {
      const result = filterNodes(sampleDocument, (node) => !isCode(node));

      expect(result).toHaveProperty('schema', 'dast');
      if (result) {
        const codeNode = findFirstNode(result, isCode);
        expect(codeNode).toBeNull(); // code block should be removed

        const rootNode = findFirstNode(result, isRoot);
        expect(rootNode).not.toBeNull();
        if (rootNode) {
          // TypeScript now knows rootNode.node is Root type!
          expect(rootNode.node.children).toHaveLength(4); // removed code block
        }
      }
    });

    it('filters children recursively', () => {
      const result = filterNodes(simpleRoot, (node) => {
        if (isSpan(node)) {
          return node.value !== 'Hello';
        }
        return true;
      });

      if (result) {
        const spans = collectNodes(result, isSpan);
        expect(spans).toHaveLength(1);
        expect(spans[0].node).toMatchObject({
          type: 'span',
          value: ' World',
        });
      }
    });

    it('returns null when root node is filtered out', () => {
      const result = filterNodes(simpleRoot, (node) => !isRoot(node));
      expect(result).toBeNull();
    });

    it('preserves structure when all nodes match', () => {
      const result = filterNodes(simpleRoot, () => true);
      expect(result).toEqual(simpleRoot);
    });
  });

  describe('filterNodesAsync', () => {
    it('filters nodes asynchronously', async () => {
      const result = await filterNodesAsync(sampleDocument, async (node) => {
        await wait();
        return !isBlock(node);
      });

      expect(result).toHaveProperty('schema', 'dast');
      if (result) {
        const blockNode = findFirstNode(result, isBlock);
        expect(blockNode).toBeNull(); // block should be removed
      }
    });
  });

  describe('reduceNodes', () => {
    it('reduces nodes to a single value', () => {
      const textContent = reduceNodes(
        simpleRoot,
        (acc, node) => {
          if (isSpan(node)) {
            return acc + node.value;
          }
          return acc;
        },
        '',
      );

      expect(textContent).toBe('Hello World');
    });

    it('counts nodes by type', () => {
      const nodeCounts = reduceNodes(
        sampleDocument,
        (acc, node) => {
          acc[node.type] = (acc[node.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      expect(nodeCounts).toEqual({
        root: 1,
        heading: 1,
        paragraph: 3,
        span: 6,
        list: 1,
        listItem: 2,
        block: 1,
        code: 1,
      });
    });

    it('provides path information in reducer', () => {
      const pathLengths = reduceNodes(
        simpleRoot,
        (acc, _node, _parent, path) => {
          acc.push(path.length);
          return acc;
        },
        [] as number[],
      );

      expect(pathLengths).toEqual([0, 2, 4, 4]); // root, paragraph, span, span
    });
  });

  describe('reduceNodesAsync', () => {
    it('reduces nodes asynchronously', async () => {
      const textContent = await reduceNodesAsync(
        simpleRoot,
        async (acc, node) => {
          await wait();
          if (isSpan(node)) {
            return acc + node.value;
          }
          return acc;
        },
        '',
      );

      expect(textContent).toBe('Hello World');
    });
  });

  describe('someNode', () => {
    it('returns true when at least one node matches', () => {
      const hasHeading = someNode(sampleDocument, isHeading);
      expect(hasHeading).toBe(true);
    });

    it('returns false when no nodes match', () => {
      const hasThematicBreak = someNode(sampleDocument, isThematicBreak);
      expect(hasThematicBreak).toBe(false);
    });

    it('short-circuits on first match', () => {
      let visitCount = 0;
      const result = someNode(sampleDocument, (node) => {
        visitCount++;
        return isHeading(node);
      });

      expect(result).toBe(true);
      expect(visitCount).toBeLessThan(16); // Should not visit all nodes
    });

    it('works with complex predicates', () => {
      const hasStrongText = someNode(
        sampleDocument,
        (node) => isSpan(node) && (node.marks?.includes('strong') ?? false),
      );
      expect(hasStrongText).toBe(true);
    });
  });

  describe('someNodeAsync', () => {
    it('returns true when at least one node matches asynchronously', async () => {
      const hasHeading = await someNodeAsync(sampleDocument, async (node) => {
        await wait();
        return isHeading(node);
      });
      expect(hasHeading).toBe(true);
    });

    it('short-circuits on first match asynchronously', async () => {
      let visitCount = 0;
      const result = await someNodeAsync(sampleDocument, async (node) => {
        visitCount++;
        await wait();
        return isHeading(node);
      });

      expect(result).toBe(true);
      expect(visitCount).toBeLessThan(16);
    });
  });

  describe('everyNode', () => {
    it('returns true when all nodes match', () => {
      const allHaveType = everyNode(simpleRoot, (node) => 'type' in node);
      expect(allHaveType).toBe(true);
    });

    it('returns false when at least one node does not match', () => {
      const allAreSpans = everyNode(sampleDocument, isSpan);
      expect(allAreSpans).toBe(false);
    });

    it('short-circuits on first non-match', () => {
      let visitCount = 0;
      const result = everyNode(sampleDocument, (node) => {
        visitCount++;
        return isRoot(node);
      });

      expect(result).toBe(false);
      expect(visitCount).toBeLessThan(16); // Should not visit all nodes
    });

    it('works with empty trees', () => {
      const emptyRoot: Root = { type: 'root', children: [] };
      const result = everyNode(emptyRoot, isRoot);
      expect(result).toBe(true); // only root node matches
    });
  });

  describe('everyNodeAsync', () => {
    it('returns true when all nodes match asynchronously', async () => {
      const allHaveType = await everyNodeAsync(simpleRoot, async (node) => {
        await wait();
        return 'type' in node;
      });
      expect(allHaveType).toBe(true);
    });

    it('short-circuits on first non-match asynchronously', async () => {
      let visitCount = 0;
      const result = await everyNodeAsync(sampleDocument, async (node) => {
        visitCount++;
        await wait();
        return isRoot(node);
      });

      expect(result).toBe(false);
      expect(visitCount).toBeLessThan(16);
    });
  });

  describe('edge cases', () => {
    it('handles nodes without children', () => {
      const leafOnlyDoc: Document = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            { type: 'thematicBreak' },
            { type: 'code', language: 'js', code: 'test' },
          ],
        },
      };

      const visited: string[] = [];
      forEachNode(leafOnlyDoc, (node) => {
        visited.push(node.type);
      });

      expect(visited).toEqual(['root', 'thematicBreak', 'code']);
    });

    it('handles deeply nested structures', () => {
      const deepDoc: Document = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'list',
              style: 'numbered',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'link',
                          url: 'https://example.com',
                          children: [
                            { type: 'span', value: 'Nested link text' },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const firstSpan = findFirstNode(deepDoc, isSpan);
      expect(firstSpan).not.toBeNull();
      if (firstSpan) {
        expect(firstSpan.path).toEqual([
          'children',
          0,
          'children',
          0,
          'children',
          0,
          'children',
          0,
          'children',
          0,
        ]);
      }
    });

    it('preserves non-children properties during transformation', () => {
      const headingDoc: Document = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'heading',
              level: 3,
              style: 'custom-style',
              children: [{ type: 'span', value: 'Custom heading' }],
            },
          ],
        },
      };

      const result = mapNodes(headingDoc, (node) => ({
        ...node,
        processed: true,
      }));

      const heading = findFirstNode(result, isHeading);
      expect(heading).not.toBeNull();
      if (heading) {
        expect(heading.node).toMatchObject({
          type: 'heading',
          level: 3,
          style: 'custom-style',
          processed: true,
        });
      }
    });
  });
});
