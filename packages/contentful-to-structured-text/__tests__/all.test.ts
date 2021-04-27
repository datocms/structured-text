/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { richTextToStructuredText, datoToContentfulMarks } from '../src';
import { allowedChildren, validate } from 'datocms-structured-text-utils';
import liftAssets from './liftAssets';

describe('contentful-to-structured-text', () => {
  it('works with empty rich text', async () => {
    const richText = {
      nodeType: 'document',
      data: {},
      content: [],
    };

    const result = await richTextToStructuredText(richText);
    expect(validate(result).valid).toBeTruthy();
    expect(result).toMatchInlineSnapshot(`null`);
  });

  it('works when null value is passed', async () => {
    const richText = null;
    const result = await richTextToStructuredText(richText);
    expect(validate(result).valid).toBeTruthy();
    expect(result).toMatchInlineSnapshot(`null`);
  });

  describe('handlers', () => {
    test('can return an array of nodes', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'paragraph',
            content: [{ nodeType: 'text', value: 'foo', marks: [], data: {} }],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText, {
        handlers: {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          text: async (createNode, node, context) => {
            return await Promise.all([
              createNode('span', {
                value: node.value,
              }),
              createNode('span', {
                value: node.value,
              }),
            ]);
          },
          paragraph: async (createNode, node, context) => {
            return await Promise.all([
              context.defaultHandlers.paragraph(createNode, node, context),
              context.defaultHandlers.paragraph(createNode, node, context),
            ]);
          },
        },
      });
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children.length).toBe(2);
      expect(result.document.children[0].type).toBe('paragraph');
      expect(result.document.children[0].children.length).toBe(2);
    });

    it('can return an array of promises', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'paragraph',
            content: [{ nodeType: 'text', value: 'foo', marks: [], data: {} }],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText, {
        handlers: {
          paragraph: (createNode, node, context) => {
            return [
              context.defaultHandlers.paragraph(createNode, node, context),
              context.defaultHandlers.paragraph(createNode, node, context),
            ];
          },
        },
      });

      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].type).toBe('paragraph');
      expect(result.document.children.length).toBe(2);
    });

    describe('custom handlers (user provided)', () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'paragraph',
            content: [
              {
                nodeType: 'embedded-entry-inline',
                content: [],
                data: {
                  target: {
                    sys: {
                      id: 'xxx',
                      type: 'Link',
                      linkType: 'Entry',
                    },
                  },
                },
              },
            ],
            data: {},
          },
        ],
      };

      it('can register custom handlers', async () => {
        const result = await richTextToStructuredText(richText, {
          handlers: {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ['embedded-entry-inline']: (createNode, node, context) => {
              return createNode('span', {
                value: node.data.target.sys.id,
              });
            },
          },
        });

        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0]).toMatchInlineSnapshot(`
            Object {
              "children": Array [
                Object {
                  "type": "span",
                  "value": "xxx",
                },
              ],
              "type": "paragraph",
            }
          `);
      });

      it('waits for async handlers to resolve', async () => {
        const result = await richTextToStructuredText(richText, {
          handlers: {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ['embedded-entry-inline']: async (createNode, node, context) => {
              await new Promise((resolve) => setTimeout(resolve, 200));
              return createNode('span', {
                value: node.data.target.sys.id,
              });
            },
          },
        });

        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0]).toMatchInlineSnapshot(`
            Object {
              "children": Array [
                Object {
                  "type": "span",
                  "value": "xxx",
                },
              ],
              "type": "paragraph",
            }
          `);
      });
    });
  });

  describe('root', () => {
    it('generates valid children', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'heading-1',
            content: [
              { nodeType: 'text', value: 'Heading', marks: [], data: {} },
            ],
            data: {},
          },
          {
            nodeType: 'paragraph',
            content: [
              { nodeType: 'text', value: 'paragraph', marks: [], data: {} },
            ],
            data: {},
          },
          {
            nodeType: 'blockquote',
            content: [
              {
                nodeType: 'paragraph',
                content: [
                  { nodeType: 'text', value: 'quote', marks: [], data: {} },
                ],
                data: {},
              },
            ],
            data: {},
          },
          {
            nodeType: 'unordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'paragraph',
                    content: [
                      {
                        nodeType: 'text',
                        value: 'list',
                        marks: [],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
          {
            nodeType: 'paragraph',
            content: [
              {
                nodeType: 'text',
                value: 'code',
                marks: [{ type: 'code' }],
                data: {},
              },
            ],
            data: {},
          },
          {
            nodeType: 'paragraph',
            content: [
              {
                nodeType: 'hyperlink',
                content: [
                  {
                    nodeType: 'text',
                    value: 'link',
                    marks: [{ type: 'bold' }],
                    data: {},
                  },
                ],
                data: {
                  url: 'https//:goo.joo',
                },
              },
            ],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();

      expect(
        result.document.children.every((child) =>
          allowedChildren['root'].includes(child.type),
        ),
      ).toBeTruthy();

      expect(result.document.children.map((child) => child.type))
        .toMatchInlineSnapshot(`
          Array [
            "heading",
            "paragraph",
            "blockquote",
            "list",
            "code",
            "paragraph",
          ]
        `);
    });
  });

  describe('paragraph', () => {
    it('works', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'paragraph',
            content: [{ nodeType: 'text', value: 'foo', marks: [], data: {} }],
            data: {},
          },
          {
            nodeType: 'paragraph',
            content: [{ nodeType: 'text', value: 'bar', marks: [], data: {} }],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);

      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children.map((child) => child.type))
        .toMatchInlineSnapshot(`
          Array [
            "paragraph",
            "paragraph",
          ]
        `);
    });

    it('generates valid children', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'paragraph',
            content: [
              { nodeType: 'text', value: '[span text] ', marks: [], data: {} },
              {
                nodeType: 'text',
                value: '[span text]',
                marks: [
                  { type: 'bold' },
                  { type: 'italic' },
                  { type: 'underline' },
                  { type: 'code' },
                  { type: 'xxx' },
                ],
                data: {},
              },
              {
                nodeType: 'text',
                value: '[strong text]',
                marks: [{ type: 'bold' }],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };
      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children).toMatchInlineSnapshot(`
          Array [
            Object {
              "children": Array [
                Object {
                  "type": "span",
                  "value": "[span text] ",
                },
                Object {
                  "marks": Array [
                    "strong",
                    "emphasis",
                    "underline",
                    "code",
                  ],
                  "type": "span",
                  "value": "[span text]",
                },
                Object {
                  "marks": Array [
                    "strong",
                  ],
                  "type": "span",
                  "value": "[strong text]",
                },
              ],
              "type": "paragraph",
            },
          ]
        `);
    });
  });

  describe('heading', () => {
    it('works', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'heading-2',
            content: [
              {
                nodeType: 'text',
                value: 'Lorem ipsum dolor sit amet titolo',
                marks: [],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);

      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].type).toBe('heading');
      expect(result.document.children[0].level).toBe(2);
      expect(result.document.children[0].children[0].type).toBe('span');
    });

    it('allows links as children', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'heading-3',
            content: [
              {
                nodeType: 'text',
                value: 'This is heading ',
                marks: [{ type: 'italic' }],
                data: {},
              },
              {
                nodeType: 'hyperlink',
                content: [
                  {
                    nodeType: 'text',
                    value: 'link',
                    marks: [],
                    data: {},
                  },
                ],
                data: { uri: 'https://fooo.com' },
              },
              { nodeType: 'text', value: '!', marks: [], data: {} },
            ],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].type).toBe('heading');
      expect(result.document.children[0].level).toBe(3);
      expect(result.document.children[0].children).toMatchInlineSnapshot(`
        Array [
          Object {
            "marks": Array [
              "emphasis",
            ],
            "type": "span",
            "value": "This is heading ",
          },
          Object {
            "children": Array [
              Object {
                "type": "span",
                "value": "link",
              },
            ],
            "type": "link",
            "url": "https://fooo.com",
          },
          Object {
            "type": "span",
            "value": "!",
          },
        ]
      `);
    });

    it('is converted to paragraph when inside of another node (except root)', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'unordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'heading-1',
                    content: [
                      {
                        nodeType: 'text',
                        value: 'This is heading ',
                        marks: [{ type: 'code' }],
                        data: {},
                      },
                      {
                        nodeType: 'hyperlink',
                        content: [
                          {
                            nodeType: 'text',
                            value: 'foo',
                            marks: [{ type: 'code' }],
                            data: {},
                          },
                        ],
                        data: { uri: 'https://loo.olll' },
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);

      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0]).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "children": Array [
                Object {
                  "children": Array [
                    Object {
                      "marks": Array [
                        "code",
                      ],
                      "type": "span",
                      "value": "This is heading ",
                    },
                    Object {
                      "children": Array [
                        Object {
                          "marks": Array [
                            "code",
                          ],
                          "type": "span",
                          "value": "foo",
                        },
                      ],
                      "type": "link",
                      "url": "https://loo.olll",
                    },
                  ],
                  "type": "paragraph",
                },
              ],
              "type": "listItem",
            },
          ],
          "style": "bulleted",
          "type": "list",
        }
      `);
    });

    it('when not allowed, turns into paragraphs', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'heading-2',
            content: [
              {
                nodeType: 'text',
                value: 'This is heading',
                marks: [{ type: 'italic' }],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText, {
        allowedBlocks: [],
      });

      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].type).toBe('paragraph');
    });
  });

  describe('code', () => {
    describe('when parent node is root', () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'paragraph',
            content: [
              {
                nodeType: 'text',
                value: '<import src="file.richText" />',
                marks: [{ type: 'code' }],
                data: {},
              },
            ],
          },
        ],
      };

      it('when parent node is root, creates code block', async () => {
        const result = await richTextToStructuredText(richText);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0]).toMatchInlineSnapshot(`
          Object {
            "code": "<import src=\\"file.richText\\" />",
            "type": "code",
          }
        `);
      });
    });

    describe('when inside of another node (except root)', () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'unordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'paragraph',
                    content: [
                      {
                        nodeType: 'text',
                        value: '<import src="file.richText" />',
                        marks: [{ type: 'code' }],
                        data: {},
                      },
                    ],
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };

      it('is converted to paragraph', async () => {
        const result = await richTextToStructuredText(richText);

        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0]).toMatchInlineSnapshot(`
                  Object {
                    "children": Array [
                      Object {
                        "children": Array [
                          Object {
                            "children": Array [
                              Object {
                                "marks": Array [
                                  "code",
                                ],
                                "type": "span",
                                "value": "<import src=\\"file.richText\\" />",
                              },
                            ],
                            "type": "paragraph",
                          },
                        ],
                        "type": "listItem",
                      },
                    ],
                    "style": "bulleted",
                    "type": "list",
                  }
              `);
      });

      it('when code mark is not allowed it generates simple paragraphs', async () => {
        const result = await richTextToStructuredText(richText, {
          allowedMarks: [],
        });

        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0]).toMatchInlineSnapshot(`
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "span",
                        "value": "<import src=\\"file.richText\\" />",
                      },
                    ],
                    "type": "paragraph",
                  },
                ],
                "type": "listItem",
              },
            ],
            "style": "bulleted",
            "type": "list",
          }
        `);
      });
    });
  });

  describe('blockquote', () => {
    const richText = {
      nodeType: 'document',
      data: {},
      content: [
        {
          nodeType: 'blockquote',
          content: [
            {
              nodeType: 'paragraph',
              content: [
                {
                  nodeType: 'text',
                  value: 'foo',
                  marks: [{ type: 'code' }, { type: 'italic' }],
                  data: {},
                },
                {
                  nodeType: 'text',
                  value: 'bar',
                  marks: [{ type: 'code' }, { type: 'bold' }],
                  data: {},
                },
              ],
              data: {},
            },
          ],
          data: {},
        },
      ],
    };

    it('creates valid blockquote node', async () => {
      const result = await richTextToStructuredText(richText);

      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children.map((child) => child.type))
        .toMatchInlineSnapshot(`
          Array [
            "blockquote",
          ]
        `);
      expect(result.document.children[0]).toMatchInlineSnapshot(`
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "marks": Array [
                      "code",
                      "emphasis",
                    ],
                    "type": "span",
                    "value": "foo",
                  },
                  Object {
                    "marks": Array [
                      "code",
                      "strong",
                    ],
                    "type": "span",
                    "value": "bar",
                  },
                ],
                "type": "paragraph",
              },
            ],
            "type": "blockquote",
          }
        `);
    });

    it('when not allowed produces paragraphs', async () => {
      const result = await richTextToStructuredText(richText, {
        allowedBlocks: [],
      });
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].type).toBe('paragraph');
      expect(result.document.children[0].children[0].value).toBe('foo');
    });
  });

  describe('list', () => {
    it('creates valid unordered list', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'unordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'paragraph',
                    content: [
                      {
                        nodeType: 'text',
                        value: 'Foo',
                        marks: [{ type: 'underline' }],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'paragraph',
                    content: [
                      {
                        nodeType: 'text',
                        value: 'Bar',
                        marks: [{ type: 'code' }],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };
      const result = await richTextToStructuredText(richText);

      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].style).toBe('bulleted');
      expect(result.document.children).toMatchInlineSnapshot(`
            Array [
              Object {
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "children": Array [
                          Object {
                            "marks": Array [
                              "underline",
                            ],
                            "type": "span",
                            "value": "Foo",
                          },
                        ],
                        "type": "paragraph",
                      },
                    ],
                    "type": "listItem",
                  },
                  Object {
                    "children": Array [
                      Object {
                        "children": Array [
                          Object {
                            "marks": Array [
                              "code",
                            ],
                            "type": "span",
                            "value": "Bar",
                          },
                        ],
                        "type": "paragraph",
                      },
                    ],
                    "type": "listItem",
                  },
                ],
                "style": "bulleted",
                "type": "list",
              },
            ]
          `);
    });

    it('creates a numbered list from ordered-list', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'ordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'paragraph',
                    content: [
                      {
                        nodeType: 'text',
                        value: 'Foo',
                        marks: [],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);

      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].type).toBe('list');
      expect(result.document.children[0].style).toBe('numbered');
    });

    it('supports nested lists', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'unordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'paragraph',
                    content: [
                      {
                        nodeType: 'text',
                        value: 'foo',
                        marks: [],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                  {
                    nodeType: 'unordered-list',
                    content: [
                      {
                        nodeType: 'list-item',
                        content: [
                          {
                            nodeType: 'paragraph',
                            content: [
                              {
                                nodeType: 'text',
                                value: 'bar',
                                marks: [],
                                data: {},
                              },
                            ],
                            data: {},
                          },
                        ],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].children[0].children[1].type).toBe(
        'list',
      );
    });

    it('converts nested blockquote to text', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'unordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'blockquote',
                    content: [
                      {
                        nodeType: 'paragraph',
                        content: [
                          {
                            nodeType: 'text',
                            value: 'quote',
                            marks: [],
                            data: {},
                          },
                        ],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].children[0].children[0].type).toBe(
        'paragraph',
      );
    });

    it('converts nested heading to text', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'unordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'heading-2',
                    content: [
                      {
                        nodeType: 'paragraph',
                        content: [
                          {
                            nodeType: 'text',
                            value: 'heading',
                            marks: [],
                            data: {},
                          },
                        ],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].children[0].children[0].type).toBe(
        'paragraph',
      );
    });

    it('supports link', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'unordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'paragraph',
                    content: [
                      {
                        nodeType: 'hyperlink',
                        content: [
                          {
                            nodeType: 'text',
                            value: 'link',
                            marks: [],
                            data: {},
                          },
                        ],
                        data: { uri: 'https://foo.bar' },
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };
      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].type).toBe('list');
      expect(result.document.children[0].children[0]).toMatchInlineSnapshot(`
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "span",
                        "value": "link",
                      },
                    ],
                    "type": "link",
                    "url": "https://foo.bar",
                  },
                ],
                "type": "paragraph",
              },
            ],
            "type": "listItem",
          }
        `);
    });

    it('when not allowed, turns list items into paragraphs', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'unordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'paragraph',
                    content: [
                      {
                        nodeType: 'text',
                        value: 'Foo',
                        marks: [],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'paragraph',
                    content: [
                      {
                        nodeType: 'text',
                        value: 'Bar',
                        marks: [],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };
      const result = await richTextToStructuredText(richText, {
        allowedBlocks: [],
      });
      expect(validate(result).valid).toBeTruthy();
      expect(result.document).toMatchInlineSnapshot(`
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "type": "span",
                    "value": "Foo",
                  },
                ],
                "type": "paragraph",
              },
              Object {
                "children": Array [
                  Object {
                    "type": "span",
                    "value": "Bar",
                  },
                ],
                "type": "paragraph",
              },
            ],
            "type": "root",
          }
        `);
    });

    it('split nodes with images', async () => {
      const handlers = {
        'embedded-asset-block': async (createNode, node, context) => {
          const item = '123';
          return createNode('block', {
            item,
          });
        },
      };

      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'unordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'paragraph',
                    content: [
                      {
                        nodeType: 'text',
                        value: 'text',
                        marks: [],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                  {
                    content: [],
                    data: {
                      target: {
                        sys: {
                          id: 'zzz',
                          linkType: 'Asset',
                          type: 'Link',
                        },
                      },
                    },
                    nodeType: 'embedded-asset-block',
                  },
                  {
                    nodeType: 'paragraph',
                    content: [
                      {
                        nodeType: 'text',
                        value: 'text',
                        marks: [],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };

      // Preprocess tree to lift asset links to root
      liftAssets(richText);

      const result = await richTextToStructuredText(richText, { handlers });

      expect(validate(result).valid).toBeTruthy();
      expect(result.document).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "children": Array [
                Object {
                  "children": Array [
                    Object {
                      "children": Array [
                        Object {
                          "type": "span",
                          "value": "text",
                        },
                      ],
                      "type": "paragraph",
                    },
                  ],
                  "type": "listItem",
                },
              ],
              "style": "bulleted",
              "type": "list",
            },
            Object {
              "item": "123",
              "type": "block",
            },
            Object {
              "children": Array [
                Object {
                  "children": Array [
                    Object {
                      "children": Array [
                        Object {
                          "type": "span",
                          "value": "text",
                        },
                      ],
                      "type": "paragraph",
                    },
                  ],
                  "type": "listItem",
                },
              ],
              "style": "bulleted",
              "type": "list",
            },
          ],
          "type": "root",
        }
      `);
    });
  });

  describe('thematicBreak', () => {
    it('convert hr', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'hr',
            content: [],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0]).toMatchInlineSnapshot(`
        Object {
          "type": "thematicBreak",
        }
      `);
    });
  });

  describe('link', () => {
    it('works in heading', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'heading-1',
            content: [
              {
                nodeType: 'hyperlink',
                content: [
                  {
                    nodeType: 'text',
                    value: 'link',
                    marks: [],
                    data: {},
                  },
                ],
                data: { uri: 'https://foo.bar' },
              },
            ],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].type).toBe('heading');
      expect(result.document.children[0].children[0]).toMatchInlineSnapshot(`
            Object {
              "children": Array [
                Object {
                  "type": "span",
                  "value": "link",
                },
              ],
              "type": "link",
              "url": "https://foo.bar",
            }
        `);
    });
  });

  describe('with Marks', () => {
    const contentfulMarks = Object.keys(datoToContentfulMarks);

    describe('converts tags to marks', () => {
      it.each(contentfulMarks)(`%p`, async (markName) => {
        const richText = {
          nodeType: 'document',
          data: {},
          content: [
            {
              nodeType: 'paragraph',
              content: [
                {
                  nodeType: 'text',
                  value: 'foo',
                  marks: [{ type: markName }],
                  data: {},
                },
                {
                  nodeType: 'text',
                  value: '.',
                  data: {},
                },
              ],
              data: {},
            },
          ],
        };

        const result = await richTextToStructuredText(richText);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].children[0].marks[0]).toBe(
          datoToContentfulMarks[markName],
        );
      });
    });

    describe('ignore mark tags when not in allowedMarks', () => {
      it.each(contentfulMarks)(`%p`, async (markName) => {
        const richText = {
          nodeType: 'document',
          data: {},
          content: [
            {
              nodeType: 'paragraph',
              content: [
                {
                  nodeType: 'text',
                  value: 'foo',
                  marks: [{ type: markName }],
                  data: {},
                },
              ],
              data: {},
            },
          ],
        };

        const result = await richTextToStructuredText(richText, {
          allowedMarks: [],
        });
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].children[0].marks).toBeFalsy();
      });
    });

    describe('code', () => {
      it('turns inline code tags to span with code mark', async () => {
        const richText = {
          nodeType: 'document',
          data: {},
          content: [
            {
              nodeType: 'paragraph',
              content: [
                {
                  nodeType: 'text',
                  value: 'This is ',
                  marks: [],
                  data: {},
                },
                {
                  nodeType: 'text',
                  value: 'inline code',
                  marks: [{ type: 'code' }],
                  data: {},
                },
              ],
              data: {},
            },
          ],
        };

        const result = await richTextToStructuredText(richText);

        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].type).toBe('paragraph');
        expect(result.document.children[0].children).toMatchInlineSnapshot(`
          Array [
            Object {
              "type": "span",
              "value": "This is ",
            },
            Object {
              "marks": Array [
                "code",
              ],
              "type": "span",
              "value": "inline code",
            },
          ]
        `);
      });
    });
  });

  describe('wrap', () => {
    it('wraps all in paragraph', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'unordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'heading-1',
                    content: [
                      {
                        nodeType: 'text',
                        value: 'span',
                        marks: [],
                        data: {},
                      },
                      {
                        nodeType: 'text',
                        value: ', other span',
                        marks: [],
                        data: {},
                      },
                      {
                        nodeType: 'hyperlink',
                        content: [
                          {
                            nodeType: 'text',
                            value: 'link',
                            marks: [],
                            data: {},
                          },
                        ],
                        data: { uri: 'https://fooo.com' },
                      },
                      {
                        nodeType: 'blockquote',
                        content: [
                          {
                            nodeType: 'paragraph',
                            content: [
                              {
                                nodeType: 'text',
                                value: 'quote',
                                marks: [],
                                data: {},
                              },
                            ],
                            data: {},
                          },
                        ],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children).toMatchInlineSnapshot(`
        Array [
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "span",
                        "value": "span",
                      },
                      Object {
                        "type": "span",
                        "value": ", other span",
                      },
                      Object {
                        "children": Array [
                          Object {
                            "type": "span",
                            "value": "link",
                          },
                        ],
                        "type": "link",
                        "url": "https://fooo.com",
                      },
                    ],
                    "type": "paragraph",
                  },
                  Object {
                    "children": Array [
                      Object {
                        "type": "span",
                        "value": "quote",
                      },
                    ],
                    "type": "paragraph",
                  },
                ],
                "type": "listItem",
              },
            ],
            "style": "bulleted",
            "type": "list",
          },
        ]
      `);
    });

    it('always returns something, even with empty text', async () => {
      const richText = {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'unordered-list',
            content: [
              {
                nodeType: 'list-item',
                content: [
                  {
                    nodeType: 'heading-1',
                    content: [
                      {
                        nodeType: 'text',
                        value: ' ',
                        marks: [],
                        data: {},
                      },
                    ],
                    data: {},
                  },
                ],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children).toMatchInlineSnapshot(`
        Array [
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "span",
                        "value": " ",
                      },
                    ],
                    "type": "paragraph",
                  },
                ],
                "type": "listItem",
              },
            ],
            "style": "bulleted",
            "type": "list",
          },
        ]
      `);
    });
  });
});
