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

    describe('with block formatter', () => {
      it('should format block with ID using custom formatter', () => {
        const root: Root = {
          type: 'root',
          children: [
            {
              type: 'block',
              item: 'block-123',
            },
          ],
        };

        const result = inspect(root, {
          blockFormatter: (item) => `ID: ${item}`,
        });
        expect(result).toMatchSnapshot();
      });

      it('should format block with object using custom formatter', () => {
        type BlockObject = {
          id: string;
          type: string;
          attributes: {
            title: string;
            content: string;
          };
        };

        const blockObject: BlockObject = {
          id: 'block-456',
          type: 'item',
          attributes: {
            title: 'My Block Title',
            content: 'Block content here',
          },
        };

        const root: Root<BlockObject> = {
          type: 'root',
          children: [
            {
              type: 'block',
              item: blockObject,
            },
          ],
        };

        const result = inspect(root, {
          blockFormatter: (item) => {
            if (typeof item === 'string') {
              return `ID: ${item}`;
            }
            return `${item.attributes.title} (${item.id})`;
          },
        });
        expect(result).toMatchSnapshot();
      });

      it('should handle multi-line block formatter output', () => {
        type ComplexBlockObject = {
          id: string;
          type: string;
          attributes: {
            title: string;
            description: string;
            metadata: { author: string; date: string };
          };
        };

        const blockObject: ComplexBlockObject = {
          id: 'block-789',
          type: 'item',
          attributes: {
            title: 'Complex Block',
            description: 'A detailed description',
            metadata: { author: 'John Doe', date: '2023-01-01' },
          },
        };

        const root: Root<ComplexBlockObject> = {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'span', value: 'Before block' }],
            },
            {
              type: 'block',
              item: blockObject,
            },
            {
              type: 'paragraph',
              children: [{ type: 'span', value: 'After block' }],
            },
          ],
        };

        const result = inspect(root, {
          blockFormatter: (item) => {
            if (typeof item === 'string') {
              return `ID: ${item}`;
            }
            return [
              `${item.attributes.title} (${item.id})`,
              `Description: ${item.attributes.description}`,
              `Author: ${item.attributes.metadata.author}`,
              `Date: ${item.attributes.metadata.date}`,
            ].join('\n');
          },
        });
        expect(result).toMatchSnapshot();
      });

      it('should format inline blocks with custom formatter', () => {
        type InlineBlockObject = {
          id: string;
          type: string;
          attributes: {
            name: string;
            text: string;
          };
        };

        const inlineBlockObject: InlineBlockObject = {
          id: 'inline-123',
          type: 'item',
          attributes: {
            name: 'Button',
            text: 'Click me',
          },
        };

        const root: Root<string, InlineBlockObject> = {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'span', value: 'Click ' },
                {
                  type: 'inlineBlock',
                  item: inlineBlockObject,
                },
                { type: 'span', value: ' to continue' },
              ],
            },
          ],
        };

        const result = inspect(root, {
          blockFormatter: (item) => {
            if (typeof item === 'string') {
              return `ID: ${item}`;
            }
            return `${item.attributes.name}: "${item.attributes.text}"`;
          },
        });
        expect(result).toMatchSnapshot();
      });

      it('should fall back to default formatting when no formatter provided', () => {
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
                {
                  type: 'inlineBlock',
                  item: 'inline-456',
                },
              ],
            },
          ],
        };

        // Test without formatter (should use default)
        const resultWithoutFormatter = inspect(root);
        expect(resultWithoutFormatter).toMatchSnapshot();

        // Test with empty options (should use default)
        const resultWithEmptyOptions = inspect(root, {});
        expect(resultWithEmptyOptions).toMatchSnapshot();
      });

      it('should provide max line width to formatter', () => {
        type BlockObject = {
          id: string;
          title: string;
          description: string;
        };

        const blockObject: BlockObject = {
          id: 'block-123',
          title: 'My Block',
          description:
            'This is a very long description that might exceed the suggested line width',
        };

        const root: Root<BlockObject> = {
          type: 'root',
          children: [
            {
              type: 'block',
              item: blockObject,
            },
          ],
        };

        const result = inspect(root, {
          blockFormatter: (item) => {
            if (typeof item === 'string') {
              return `ID: ${item}`;
            }

            return [
              item.title,
              `Description: ${item.description}`,
              `ID: ${item.id}`,
            ].join('\n');
          },
        });
        expect(result).toMatchSnapshot();
      });
    });
  });
});
