import {
  render,
  StructuredTextGraphQlResponse,
  StructuredTextDocument,
  RenderError,
  renderNodeRule,
} from '../src';
import { isHeading } from 'datocms-structured-text-utils';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import h from 'vhtml';

describe('render', () => {
  describe('with no value', () => {
    it('renders null', () => {
      expect(render(null)).toMatchSnapshot();
    });
  });

  describe('simple dast /2', () => {
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
                value: 'This\nis a\ntitle!',
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

  describe('simple dast with no links/blocks', () => {
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
                  value: 'This\nis a\ntitle!',
                },
              ],
            },
          ],
        },
      },
    };

    describe('with default rules', () => {
      it('renders the document', () => {
        expect(render(structuredText)).toMatchSnapshot();
      });
    });

    describe('with custom rules', () => {
      it('renders the document', () => {
        expect(
          render(structuredText, {
            renderText: (text) => {
              return text.replace(/This/, 'That');
            },
            customRules: [
              renderNodeRule(
                isHeading,
                ({ adapter: { renderNode }, node, children, key }) => {
                  return renderNode(`h${node.level + 1}`, { key }, children);
                },
              ),
            ],
          }),
        ).toMatchSnapshot();
      });
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
              type: 'heading',
              level: 1,
              children: [
                {
                  type: 'span',
                  value: 'This is a',
                },
                {
                  type: 'span',
                  marks: ['highlight'],
                  value: 'title',
                },
                {
                  type: 'inlineItem',
                  item: '123',
                },
                {
                  type: 'itemLink',
                  item: '123',
                  children: [{ type: 'span', value: 'here!' }],
                },
                {
                  type: 'inlineBlock',
                  item: '789',
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
            renderInlineRecord: ({ adapter, record }) => {
              switch (record.__typename) {
                case 'DocPageRecord':
                  return adapter.renderNode(
                    'a',
                    { href: `/docs/${record.slug}` },
                    record.title,
                  );
                default:
                  return null;
              }
            },
            renderLinkToRecord: ({ record, children, adapter }) => {
              switch (record.__typename) {
                case 'DocPageRecord':
                  return adapter.renderNode(
                    'a',
                    { href: `/docs/${record.slug}` },
                    children,
                  );
                default:
                  return null;
              }
            },
            renderBlock: ({ record, adapter }) => {
              switch (record.__typename) {
                case 'QuoteRecord':
                  return adapter.renderNode(
                    'figure',
                    null,
                    adapter.renderNode('blockquote', null, record.quote),
                    adapter.renderNode('figcaption', null, record.author),
                  );

                default:
                  return null;
              }
            },
            renderInlineBlock: ({ record, adapter }) => {
              switch (record.__typename) {
                case 'MentionRecord':
                  return adapter.renderNode('em', null, record.name);

                default:
                  return null;
              }
            },
          }),
        ).toMatchSnapshot();
      });
    });

    describe('with missing renderInlineRecord prop', () => {
      it('raises an error', () => {
        expect(() => {
          render(structuredText);
        }).toThrow(RenderError);
      });
    });

    describe('skipping rendering of custom nodes', () => {
      it('renders the document', () => {
        expect(
          render(structuredText, {
            renderInlineRecord: () => null,
            renderLinkToRecord: () => null,
            renderBlock: () => null,
            renderInlineBlock: () => null,
          }),
        ).toMatchSnapshot();
      });
    });

    describe('with missing record', () => {
      it('raises an error', () => {
        expect(() => {
          render(
            { ...structuredText, links: [] },
            {
              renderInlineRecord: () => null,
              renderLinkToRecord: () => null,
              renderBlock: () => null,
            },
          );
        }).toThrow(RenderError);
      });
    });
  });
});
