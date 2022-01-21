/** @jsx h */

import {
  render,
  StructuredTextGraphQlResponse,
  StructuredTextDocument,
  RenderError,
  renderNodeRule,
} from '../src';
import { isBlock, isHeading, Node, Block } from 'datocms-structured-text-utils';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import h from 'hyperscript';

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

    const structuredText: StructuredTextGraphQlResponse<
      QuoteRecord | DocPageRecord
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
              ],
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'span',
                  value: 'Foo',
                },
              ],
            },
            {
              type: 'block',
              item: '456',
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'span',
                  value: 'Bar',
                },
              ],
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
            renderBlock: ({ record }) => {
              switch (record.__typename) {
                case 'QuoteRecord':
                  // return adapter.renderNode(
                  //   'figure',
                  //   null,
                  //   adapter.renderNode('blockquote', null, record.quote),
                  //   adapter.renderNode('figcaption', null, record.author),
                  // );
                  return (
                    <figure>
                      <blockquote>{record.quote}</blockquote>
                      <figcaption>{record.author}</figcaption>
                    </figure>
                  );
                default:
                  return null;
              }
            },
          }),
        ).toMatchSnapshot();
      });
    });

    describe('grouping together non-block nodes', () => {
      it('renders the document', () => {
        type GroupNode = { type: 'group'; children: Node[] };

        const modifiedStructuredText = {
          ...structuredText,
          value: {
            ...structuredText.value,
            document: {
              type: 'root',
              children: structuredText.value.document.children.reduce<
                Array<Block | GroupNode>
              >((newChildren, node) => {
                if (isBlock(node)) {
                  return [...newChildren, node];
                }

                const lastNode =
                  newChildren.length > 0 && newChildren[newChildren.length - 1];

                if (lastNode && lastNode.type === 'group') {
                  lastNode.children.push(node);
                  return newChildren;
                }

                return [...newChildren, { type: 'group', children: [node] }];
              }, []),
            },
          },
        };

        expect(
          render(
            modifiedStructuredText as StructuredTextGraphQlResponse<
              QuoteRecord | DocPageRecord
            >,
            {
              customRules: [
                renderNodeRule(
                  (node: Node | GroupNode): node is Node =>
                    node.type === 'group',
                  ({ adapter: { renderNode }, children, key }) => {
                    return renderNode(`div`, { key, class: 'group' }, children);
                  },
                ),
              ],
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
              renderBlock: ({ record }) => {
                switch (record.__typename) {
                  case 'QuoteRecord':
                    // return adapter.renderNode(
                    //   'figure',
                    //   null,
                    //   adapter.renderNode('blockquote', null, record.quote),
                    //   adapter.renderNode('figcaption', null, record.author),
                    // );
                    return (
                      <figure>
                        <blockquote>{record.quote}</blockquote>
                        <figcaption>{record.author}</figcaption>
                      </figure>
                    );
                  default:
                    return null;
                }
              },
            },
          ),
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
