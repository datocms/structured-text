import {
  defaultAdapter,
  render,
  StructuredTextGraphQlResponse,
  StructuredTextDocument,
  RenderError,
  renderNodeRule,
} from '../src';
import { isHeading } from 'datocms-structured-text-utils';

describe('render', () => {
  describe('with no value', () => {
    it('renders null', () => {
      expect(render(null)).toMatchSnapshot();
    });
  });

  describe('simple dast', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'heading',
            level: 1,
            children: [
              {
                type: 'span',
                value: 'This is a title!',
              },
            ],
          },
          {
            type: 'paragraph',
            children: [
              {
                type: 'span',
                value: 'This is a paragraph.',
              },
            ],
          },
        ],
      },
    };

    describe('with default rules', () => {
      it('renders the document', () => {
        expect(render(structuredText)).toMatchSnapshot();
      });
    });
  });

  describe('all heading levels', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'heading',
            level: 1,
            children: [{ type: 'span', value: 'H1' }],
          },
          {
            type: 'heading',
            level: 2,
            children: [{ type: 'span', value: 'H2' }],
          },
          {
            type: 'heading',
            level: 3,
            children: [{ type: 'span', value: 'H3' }],
          },
          {
            type: 'heading',
            level: 4,
            children: [{ type: 'span', value: 'H4' }],
          },
          {
            type: 'heading',
            level: 5,
            children: [{ type: 'span', value: 'H5' }],
          },
          {
            type: 'heading',
            level: 6,
            children: [{ type: 'span', value: 'H6' }],
          },
        ],
      },
    };

    it('renders all heading levels', () => {
      expect(render(structuredText)).toMatchSnapshot();
    });
  });

  describe('all inline marks', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'span',
                marks: ['strong'],
                value: 'bold',
              },
              {
                type: 'span',
                value: ' ',
              },
              {
                type: 'span',
                marks: ['emphasis'],
                value: 'italic',
              },
              {
                type: 'span',
                value: ' ',
              },
              {
                type: 'span',
                marks: ['code'],
                value: 'code',
              },
              {
                type: 'span',
                value: ' ',
              },
              {
                type: 'span',
                marks: ['underline'],
                value: 'underline',
              },
              {
                type: 'span',
                value: ' ',
              },
              {
                type: 'span',
                marks: ['strikethrough'],
                value: 'strikethrough',
              },
              {
                type: 'span',
                value: ' ',
              },
              {
                type: 'span',
                marks: ['highlight'],
                value: 'highlight',
              },
            ],
          },
        ],
      },
    };

    it('renders all marks', () => {
      expect(render(structuredText)).toMatchSnapshot();
    });
  });

  describe('combined marks', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'span',
                marks: ['strong', 'emphasis'],
                value: 'Bold and italic',
              },
              {
                type: 'span',
                value: ' & ',
              },
              {
                type: 'span',
                marks: ['highlight', 'underline'],
                value: 'highlighted underline',
              },
              {
                type: 'span',
                value: ' with text.',
              },
              {
                type: 'span',
                value: ' ',
              },
              {
                type: 'span',
                marks: ['strong', 'emphasis', 'code'],
                value: 'nested combo',
              },
            ],
          },
        ],
      },
    };

    it('renders nested marks in the expected order', () => {
      expect(render(structuredText)).toMatchSnapshot();
    });
  });

  describe('lists', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
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
              {
                type: 'listItem',
                children: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'span', value: 'Third item' }],
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
                            children: [{ type: 'span', value: 'Nested item' }],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'list',
            style: 'numbered',
            children: [
              {
                type: 'listItem',
                children: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'span', value: 'First' }],
                  },
                ],
              },
              {
                type: 'listItem',
                children: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'span', value: 'Second' }],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    it('renders lists correctly', () => {
      expect(render(structuredText)).toMatchSnapshot();
    });
  });

  describe('ordered lists', () => {
    const structuredText: StructuredTextDocument = {
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
                    children: [{ type: 'span', value: 'First' }],
                  },
                ],
              },
              {
                type: 'listItem',
                children: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'span', value: 'Second' }],
                  },
                ],
              },
              {
                type: 'listItem',
                children: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'span', value: 'Third' }],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    it('renders ordered lists using CommonMark numbering', () => {
      expect(render(structuredText)).toBe('1. First\n1. Second\n1. Third');
    });
  });

  describe('deep mixed lists', () => {
    const structuredText: StructuredTextDocument = {
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
                    children: [{ type: 'span', value: 'Step one' }],
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
                            children: [{ type: 'span', value: 'Detail A' }],
                          },
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
                                      { type: 'span', value: 'Deep follow-up' },
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
                ],
              },
              {
                type: 'listItem',
                children: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'span', value: 'Step two' }],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    it('renders nested mixed lists with proper indentation', () => {
      expect(render(structuredText)).toMatchSnapshot();
    });
  });

  describe('list items with paragraphs', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
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
                    children: [{ type: 'span', value: 'Intro paragraph' }],
                  },
                  {
                    type: 'paragraph',
                    children: [{ type: 'span', value: 'Follow-up paragraph' }],
                  },
                  {
                    type: 'list',
                    style: 'numbered',
                    children: [
                      {
                        type: 'listItem',
                        children: [
                          {
                            type: 'paragraph',
                            children: [{ type: 'span', value: 'Nested step' }],
                          },
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

    it('keeps intra-item paragraphs and nested lists formatted', () => {
      expect(render(structuredText)).toMatchSnapshot();
    });
  });

  describe('blockquote', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'blockquote',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'span', value: 'This is a quote' }],
              },
              {
                type: 'paragraph',
                children: [{ type: 'span', value: 'With another paragraph' }],
              },
            ],
          },
          {
            type: 'blockquote',
            attribution: 'John Doe',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'span', value: 'Quote with attribution' }],
              },
            ],
          },
        ],
      },
    };

    it('renders blockquotes', () => {
      expect(render(structuredText)).toMatchSnapshot();
    });

    it('preserves blank lines between blockquote paragraphs', () => {
      const output = render(structuredText) || '';
      expect(output).toMatch(/> This is a quote\n>\n> With another paragraph/);
    });
  });

  describe('code blocks', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'code',
            language: 'javascript',
            code: 'const x = 1;\nconsole.log(x);',
          },
          {
            type: 'code',
            code: 'plain code',
          },
        ],
      },
    };

    it('renders code blocks', () => {
      expect(render(structuredText)).toMatchSnapshot();
    });
  });

  describe('links', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'span',
                value: 'Check out ',
              },
              {
                type: 'link',
                url: 'https://www.datocms.com/',
                children: [
                  {
                    type: 'span',
                    value: 'DatoCMS',
                  },
                ],
              },
              {
                type: 'span',
                value: '!',
              },
            ],
          },
        ],
      },
    };

    it('renders links', () => {
      expect(render(structuredText)).toMatchSnapshot();
    });
  });

  describe('meta transformer', () => {
    type DocPageRecord = {
      id: string;
      __typename: 'DocPageRecord';
      title: string;
      slug: string;
    };

    const structuredText: StructuredTextGraphQlResponse<DocPageRecord> = {
      value: {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'itemLink',
                  item: '123',
                  meta: [
                    { id: 'target', value: '_blank' },
                    { id: 'rel', value: 'noopener' },
                  ],
                  children: [
                    {
                      type: 'span',
                      value: 'Docs',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      links: [
        {
          id: '123',
          __typename: 'DocPageRecord',
          title: 'API Docs',
          slug: 'api',
        },
      ],
    };

    it('passes transformed meta to renderLinkToRecord', () => {
      const metaCalls: Array<Record<string, string>> = [];

      const result = render(structuredText, {
        metaTransformer: ({ meta }) => {
          return meta.reduce<Record<string, string>>((acc, entry) => {
            acc[entry.id] = entry.value;
            return acc;
          }, {});
        },
        renderLinkToRecord: ({ transformedMeta, children, record }) => {
          if (transformedMeta) {
            metaCalls.push(transformedMeta as Record<string, string>);
          }
          const attrs = transformedMeta
            ? Object.entries(transformedMeta)
                .map(([key, value]) => `${key}="${value}"`)
                .join(' ')
            : '';

          const suffix = attrs ? ` {${attrs}}` : '';
          return `[${children}](/docs/${record.slug})${suffix}`;
        },
        renderInlineRecord: () => null,
        renderBlock: () => null,
        renderInlineBlock: () => null,
      });

      expect(result).toBe('[Docs](/docs/api) {target="_blank" rel="noopener"}');
      expect(metaCalls).toEqual([{ target: '_blank', rel: 'noopener' }]);
    });
  });

  describe('link meta transformer', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'link',
                url: 'https://example.com',
                meta: [
                  { id: 'target', value: '_blank' },
                  { id: 'rel', value: 'noopener' },
                ],
                children: [{ type: 'span', value: 'Example' }],
              },
            ],
          },
        ],
      },
    };

    it('passes transformed meta attributes to the link renderer', () => {
      const linkCalls: Array<Record<string, string>> = [];

      const result = render(structuredText, {
        metaTransformer: ({ meta }) =>
          meta.reduce<Record<string, string>>((acc, entry) => {
            acc[entry.id] = entry.value;
            return acc;
          }, {}),
        renderNode: (tagName, attrs, ...children) => {
          if (tagName === 'a') {
            linkCalls.push(attrs as Record<string, string>);
            const content = defaultAdapter.renderFragment(children);
            const extraAttrs = Object.entries(attrs)
              .filter(([key]) => key !== 'href' && key !== 'key')
              .map(([key, value]) => `${key}="${value}"`)
              .join(' ');
            const suffix = extraAttrs ? ` {${extraAttrs}}` : '';
            return `[${content}](${attrs.href})${suffix}`;
          }
          return defaultAdapter.renderNode(tagName, attrs, ...children);
        },
      });

      expect(result).toBe(
        '[Example](https://example.com) {target="_blank" rel="noopener"}',
      );
      expect(linkCalls).toHaveLength(1);
      expect(linkCalls[0]).toMatchObject({
        href: 'https://example.com',
        target: '_blank',
        rel: 'noopener',
      });
    });
  });

  describe('thematic break', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'span', value: 'Before' }],
          },
          {
            type: 'thematicBreak',
          },
          {
            type: 'paragraph',
            children: [{ type: 'span', value: 'After' }],
          },
        ],
      },
    };

    it('renders thematic breaks', () => {
      expect(render(structuredText)).toMatchSnapshot();
    });
  });

  describe('line breaks', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'span',
                value: 'Line 1\nLine 2\nLine 3',
              },
            ],
          },
        ],
      },
    };

    it('renders line breaks', () => {
      expect(render(structuredText)).toMatchSnapshot();
    });
  });

  describe('empty nodes', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'span', value: '' }],
          },
        ],
      },
    };

    it('returns null for empty content', () => {
      expect(render(structuredText)).toBeNull();
    });
  });

  describe('markdown special characters', () => {
    const structuredText: StructuredTextDocument = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'span',
                value: 'Special chars: * _ # [ ] ( ) { } < > \\ | `',
              },
            ],
          },
        ],
      },
    };

    it('escapes special characters', () => {
      expect(render(structuredText)).toMatchSnapshot();
    });
  });

  describe('custom rules', () => {
    const structuredText: StructuredTextGraphQlResponse = {
      value: {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'heading',
              level: 1,
              children: [
                {
                  type: 'span',
                  value: 'Title',
                },
              ],
            },
          ],
        },
      },
    };

    it('applies custom rules', () => {
      expect(
        render(structuredText, {
          renderText: (text) => {
            return text.replace(/Title/, 'Custom Title');
          },
          customRules: [
            renderNodeRule(
              isHeading,
              ({ node, children, adapter: { renderFragment } }) => {
                return renderFragment([
                  `[H${node.level}] `,
                  ...(children || []),
                  '\n\n',
                ]);
              },
            ),
          ],
        }),
      ).toMatchSnapshot();
    });
  });

  describe('with links/blocks', () => {
    type QuoteRecord = {
      id: string;
      __typename: 'QuoteRecord';
      quote: string;
      author: string;
    };

    type DocPageRecord = {
      id: string;
      __typename: 'DocPageRecord';
      slug: string;
      title: string;
    };

    type MentionRecord = {
      id: string;
      __typename: 'MentionRecord';
      name: string;
    };

    const structuredText: StructuredTextGraphQlResponse<
      QuoteRecord | DocPageRecord | MentionRecord
    > = {
      value: {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'span',
                  value: 'Read about ',
                },
                {
                  type: 'inlineItem',
                  item: '123',
                },
                {
                  type: 'span',
                  value: '. Find out more ',
                },
                {
                  type: 'itemLink',
                  item: '123',
                  children: [{ type: 'span', value: 'here' }],
                },
                {
                  type: 'span',
                  value: ' and mention ',
                },
                {
                  type: 'inlineBlock',
                  item: '789',
                },
                {
                  type: 'span',
                  value: '!',
                },
              ],
            },
            {
              type: 'block',
              item: '456',
            },
          ],
        },
      },
      blocks: [
        {
          id: '456',
          __typename: 'QuoteRecord',
          quote: 'Foo bar.',
          author: 'Mark Smith',
        },
      ],
      inlineBlocks: [
        {
          id: '789',
          __typename: 'MentionRecord',
          name: 'John Doe',
        },
      ],
      links: [
        {
          id: '123',
          __typename: 'DocPageRecord',
          title: 'How to code',
          slug: 'how-to-code',
        },
      ],
    };

    describe('with default rules', () => {
      it('renders the document', () => {
        expect(
          render(structuredText, {
            renderInlineRecord: ({ record }) => {
              switch (record.__typename) {
                case 'DocPageRecord':
                  return `[${record.title}](/docs/${record.slug})`;
                default:
                  return null;
              }
            },
            renderLinkToRecord: ({ record, children }) => {
              switch (record.__typename) {
                case 'DocPageRecord':
                  return `[${children}](/docs/${record.slug})`;
                default:
                  return null;
              }
            },
            renderBlock: ({ record }) => {
              switch (record.__typename) {
                case 'QuoteRecord':
                  return `> ${record.quote}\n>\n> — ${record.author}\n\n`;
                default:
                  return null;
              }
            },
            renderInlineBlock: ({ record }) => {
              switch (record.__typename) {
                case 'MentionRecord':
                  return `**@${record.name}**`;
                default:
                  return null;
              }
            },
          }),
        ).toMatchSnapshot();
      });
    });

    describe('with missing renderInlineRecord', () => {
      it('skips the node', () => {
        expect(
          render(structuredText, {
            renderLinkToRecord: ({ children }) => children,
            renderBlock: () => null,
            renderInlineBlock: () => null,
          }),
        ).toMatchSnapshot();
      });
    });

    describe('with missing record and renderInlineRecord specified', () => {
      it('raises an error', () => {
        expect(() => {
          render(
            { ...structuredText, links: [] },
            {
              renderInlineRecord: () => null,
              renderLinkToRecord: () => null,
              renderBlock: () => null,
              renderInlineBlock: () => null,
            },
          );
        }).toThrow(RenderError);
      });
    });
  });

  describe('error paths', () => {
    it('throws when itemLink record is missing', () => {
      const doc: StructuredTextGraphQlResponse = {
        value: {
          schema: 'dast',
          document: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'itemLink',
                    item: 'missing',
                    children: [{ type: 'span', value: 'Broken link' }],
                  },
                ],
              },
            ],
          },
        },
        links: [],
      };

      expect(() =>
        render(doc, {
          renderLinkToRecord: () => '[broken]',
        }),
      ).toThrow(RenderError);
    });

    it('throws when block record is missing', () => {
      const doc: StructuredTextGraphQlResponse = {
        value: {
          schema: 'dast',
          document: {
            type: 'root',
            children: [
              {
                type: 'block',
                item: 'missing-block',
              },
            ],
          },
        },
        blocks: [],
      };

      expect(() =>
        render(doc, {
          renderBlock: () => 'block',
        }),
      ).toThrow(RenderError);
    });

    it('throws when inlineBlock record is missing', () => {
      const doc: StructuredTextGraphQlResponse = {
        value: {
          schema: 'dast',
          document: {
            type: 'root',
            children: [
              {
                type: 'inlineBlock',
                item: 'missing-inline',
              },
            ],
          },
        },
        inlineBlocks: [],
      };

      expect(() =>
        render(doc, {
          renderInlineBlock: () => 'inline block',
        }),
      ).toThrow(RenderError);
    });
  });

  describe('state isolation', () => {
    it('maintains state isolation between sequential renders', () => {
      // First document with nested lists
      const doc1: StructuredTextDocument = {
        schema: 'dast',
        document: {
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
                      children: [{ type: 'span', value: 'Outer item' }],
                    },
                    {
                      type: 'list',
                      style: 'numbered',
                      children: [
                        {
                          type: 'listItem',
                          children: [
                            {
                              type: 'paragraph',
                              children: [{ type: 'span', value: 'Inner item' }],
                            },
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

      // Second document with simple list
      const doc2: StructuredTextDocument = {
        schema: 'dast',
        document: {
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
                      children: [{ type: 'span', value: 'Simple item' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      // Render both documents
      const result1 = render(doc1);
      const result2 = render(doc2);

      // Verify first render produced nested list (with proper state)
      expect(result1).toBeTruthy();
      expect(result1).toContain('Outer item');
      expect(result1).toContain('Inner item');

      // Second render should not be affected by first render's nested list state
      // The output should be just the simple list item without any state leakage
      expect(result2).toBe('- Simple item');

      // Ensure no lingering indentation or list state from previous render
      expect(result2).not.toContain('Inner item');
      expect(result2).not.toContain('Outer item');
    });
  });
});
