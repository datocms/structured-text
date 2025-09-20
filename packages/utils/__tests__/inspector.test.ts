import { inspect } from '../src/inspector';
import type { Document, Root } from '../src/types';

describe('inspector', () => {
  describe('inspect', () => {
    it('should render a simple root node', () => {
      const simpleRoot: Root = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'span', value: 'Hello World' }],
          },
        ],
      };

      const result = inspect(simpleRoot);
      expect(result).toMatchSnapshot();
    });

    it('should render a document wrapper', () => {
      const document: Document = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'span', value: 'Test' }],
            },
          ],
        },
      };

      const result = inspect(document);
      expect(result).toMatchSnapshot();
    });

    it('should render multiple children with correct tree structure', () => {
      const root: Root = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'span', value: 'First paragraph' }],
          },
          {
            type: 'paragraph',
            children: [{ type: 'span', value: 'Second paragraph' }],
          },
        ],
      };

      const result = inspect(root);
      expect(result).toMatchSnapshot();
    });

    it('should render span nodes with marks', () => {
      const root: Root = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'span', value: 'Normal text' },
              { type: 'span', marks: ['strong'], value: 'Bold text' },
              {
                type: 'span',
                marks: ['strong', 'emphasis'],
                value: 'Bold italic',
              },
            ],
          },
        ],
      };

      const result = inspect(root);
      expect(result).toMatchSnapshot();
    });

    it('should render heading nodes with level', () => {
      const root: Root = {
        type: 'root',
        children: [
          {
            type: 'heading',
            level: 1,
            children: [{ type: 'span', value: 'Main Title' }],
          },
          {
            type: 'heading',
            level: 2,
            children: [{ type: 'span', value: 'Subtitle' }],
          },
        ],
      };

      const result = inspect(root);
      expect(result).toMatchSnapshot();
    });

    it('should render list nodes with style', () => {
      const root: Root = {
        type: 'root',
        children: [
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
        ],
      };

      const result = inspect(root);
      expect(result).toMatchSnapshot();
    });

    it('should render code nodes with language and content', () => {
      const root: Root = {
        type: 'root',
        children: [
          {
            type: 'code',
            language: 'javascript',
            code: 'console.log("Hello, World!");',
          },
          {
            type: 'code',
            code: 'echo "No language specified"',
          },
        ],
      };

      const result = inspect(root);
      expect(result).toMatchSnapshot();
    });

    it('should render link nodes with URL and meta', () => {
      const root: Root = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'span', value: 'Visit ' },
              {
                type: 'link',
                url: 'https://example.com',
                children: [{ type: 'span', value: 'this link' }],
              },
              {
                type: 'link',
                url: 'https://meta.example.com',
                meta: [
                  { id: 'title', value: 'Example Site' },
                  { id: 'target', value: '_blank' },
                ],
                children: [{ type: 'span', value: 'link with meta' }],
              },
            ],
          },
        ],
      };

      const result = inspect(root);
      expect(result).toMatchSnapshot();
    });

    it('should render block and inline block nodes', () => {
      const root: Root = {
        type: 'root',
        children: [
          {
            type: 'block',
            item: 'block-123',
          },
          {
            type: 'paragraph',
            children: [
              { type: 'span', value: 'Text with ' },
              {
                type: 'inlineBlock',
                item: 'inline-456',
              },
              { type: 'span', value: ' inline block' },
            ],
          },
        ],
      };

      const result = inspect(root);
      expect(result).toMatchSnapshot();
    });

    it('should truncate long text content', () => {
      const longText = 'a'.repeat(100);
      const root: Root = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'span', value: longText }],
          },
          {
            type: 'code',
            code: longText,
          },
        ],
      };

      const result = inspect(root);
      expect(result).toMatchSnapshot();
    });

    it('should render paragraph with custom style', () => {
      const root: Root = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            style: 'custom-style',
            children: [{ type: 'span', value: 'Styled paragraph' }],
          },
        ],
      };

      const result = inspect(root);
      expect(result).toMatchSnapshot();
    });

    it('should render thematic break', () => {
      const root: Root = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'span', value: 'Before break' }],
          },
          {
            type: 'thematicBreak',
          },
          {
            type: 'paragraph',
            children: [{ type: 'span', value: 'After break' }],
          },
        ],
      };

      const result = inspect(root);
      expect(result).toMatchSnapshot();
    });
  });
});
