import {
  richTextToStructuredText,
  contentfulToDatoMark,
  makeHandler,
  liftAssets,
} from '../src';
import {
  allowedChildren,
  isHeading,
  Paragraph as DatoParagraph,
  List,
  validate,
  Span,
} from 'datocms-structured-text-utils';
import {
  helpers,
  BLOCKS,
  Document,
  Paragraph,
  INLINES,
  EntryLinkInline,
  AssetLinkBlock,
} from '@contentful/rich-text-types';

describe('contentful-to-structured-text', () => {
  test('works with empty rich text', async () => {
    const richText: Document = {
      nodeType: BLOCKS.DOCUMENT,
      data: {},
      content: [],
    };

    const result = await richTextToStructuredText(richText);
    expect(validate(result).valid).toBeTruthy();
    expect(result).toMatchInlineSnapshot(`null`);
  });

  test('works when null value is passed', async () => {
    const result = await richTextToStructuredText(null);
    expect(validate(result).valid).toBeTruthy();
    expect(result).toMatchInlineSnapshot(`null`);
  });

  describe('custom handlers (user provided)', () => {
    test('can return an array of nodes', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.PARAGRAPH,
            content: [{ nodeType: 'text', value: 'foo', marks: [], data: {} }],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText, {
        handlers: [
          makeHandler(helpers.isText, async (node) => {
            return [
              { type: 'span', value: node.value },
              { type: 'span', value: node.value },
            ];
          }),
          makeHandler(
            (n): n is Paragraph => n.nodeType === BLOCKS.PARAGRAPH,
            async (node, context) => {
              const defaultHandler = context.defaultHandlers.find((h) =>
                h.guard(node),
              );

              if (!defaultHandler) {
                return [];
              }

              const result = await defaultHandler.handle(node, context);

              if (!result) {
                return [];
              }

              if (Array.isArray(result)) {
                throw new Error('Not happening');
              }

              return [result, result];
            },
          ),
        ],
      });

      expect(validate(result).valid).toBeTruthy();
      expect(result).toMatchInlineSnapshot(`
        Object {
          "document": Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "type": "span",
                    "value": "foo",
                  },
                  Object {
                    "type": "span",
                    "value": "foo",
                  },
                ],
                "type": "paragraph",
              },
              Object {
                "children": Array [
                  Object {
                    "type": "span",
                    "value": "foo",
                  },
                  Object {
                    "type": "span",
                    "value": "foo",
                  },
                ],
                "type": "paragraph",
              },
            ],
            "type": "root",
          },
          "schema": "dast",
        }
      `);
    });

    describe('embedded entry line', () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.PARAGRAPH,
            content: [
              {
                nodeType: INLINES.EMBEDDED_ENTRY,
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

      test('can register custom handlers', async () => {
        const result = await richTextToStructuredText(richText, {
          handlers: [
            makeHandler(
              (n): n is EntryLinkInline =>
                n.nodeType === INLINES.EMBEDDED_ENTRY,
              async (node) => {
                return { type: 'span', value: node.data.target.sys.id };
              },
            ),
          ],
        });

        expect(validate(result).valid).toBeTruthy();

        expect(result?.document.children[0]).toMatchInlineSnapshot(`
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
    test('generates valid children', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.HEADING_1,
            content: [
              { nodeType: 'text', value: 'Heading', marks: [], data: {} },
            ],
            data: {},
          },
          {
            nodeType: BLOCKS.PARAGRAPH,
            content: [
              { nodeType: 'text', value: 'paragraph', marks: [], data: {} },
            ],
            data: {},
          },
          {
            nodeType: BLOCKS.QUOTE,
            content: [
              {
                nodeType: BLOCKS.PARAGRAPH,
                content: [
                  { nodeType: 'text', value: 'quote', marks: [], data: {} },
                ],
                data: {},
              },
            ],
            data: {},
          },
          {
            nodeType: BLOCKS.UL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.PARAGRAPH,
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
            nodeType: BLOCKS.PARAGRAPH,
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
            nodeType: BLOCKS.PARAGRAPH,
            content: [
              {
                nodeType: INLINES.HYPERLINK,
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
        result?.document.children.every((child) =>
          allowedChildren['root'].includes(child.type),
        ),
      ).toBeTruthy();

      expect(result?.document.children.map((child) => child.type))
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
    test('works', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.PARAGRAPH,
            content: [{ nodeType: 'text', value: 'foo', marks: [], data: {} }],
            data: {},
          },
          {
            nodeType: BLOCKS.PARAGRAPH,
            content: [{ nodeType: 'text', value: 'bar', marks: [], data: {} }],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);

      expect(validate(result).valid).toBeTruthy();
      expect(result?.document.children.map((child) => child.type))
        .toMatchInlineSnapshot(`
            Array [
              "paragraph",
              "paragraph",
            ]
          `);
    });

    test('generates valid children', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.PARAGRAPH,
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
      expect(result?.document.children).toMatchInlineSnapshot(`
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
    test('works', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.HEADING_2,
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
      const firstChild = result?.document.children[0];

      expect(firstChild?.type).toBe('heading');

      if (!firstChild || !isHeading(firstChild)) {
        throw new Error('fail');
      }

      expect(firstChild.level).toBe(2);
      expect(firstChild.children[0].type).toBe('span');
    });

    test('allows links as children', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.HEADING_3,
            content: [
              {
                nodeType: 'text',
                value: 'This is heading ',
                marks: [{ type: 'italic' }],
                data: {},
              },
              {
                nodeType: INLINES.HYPERLINK,
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
      const firstChild = result?.document.children[0];

      expect(firstChild?.type).toBe('heading');

      if (!firstChild || !isHeading(firstChild)) {
        throw new Error('fail');
      }

      expect(firstChild.level).toBe(3);
      expect(firstChild.children).toMatchInlineSnapshot(`
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

    test('is converted to paragraph when inside of another node (except root)', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.OL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.HEADING_1,
                    content: [
                      {
                        nodeType: 'text',
                        value: 'This is heading ',
                        marks: [{ type: 'code' }],
                        data: {},
                      },
                      {
                        nodeType: INLINES.HYPERLINK,
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
      const firstChild = result?.document.children[0];

      expect(firstChild).toMatchInlineSnapshot(`
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
            "style": "numbered",
            "type": "list",
          }
        `);
    });

    test('when not allowed, turns into paragraphs', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.HEADING_2,
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
      expect(result?.document.children[0].type).toBe('paragraph');
    });
  });

  describe('code', () => {
    describe('when parent node is root', () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.PARAGRAPH,
            content: [
              {
                nodeType: 'text',
                value: '<import src="file.richText" />',
                marks: [{ type: 'code' }],
                data: {},
              },
            ],
            data: {},
          },
        ],
      };

      test('when parent node is root, creates code block', async () => {
        const result = await richTextToStructuredText(richText);
        expect(validate(result).valid).toBeTruthy();
        expect(result?.document.children[0]).toMatchInlineSnapshot(`
            Object {
              "code": "<import src=\\"file.richText\\" />",
              "type": "code",
            }
          `);
      });
    });

    describe('when inside of another node (except root)', () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.UL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.PARAGRAPH,
                    content: [
                      {
                        nodeType: 'text',
                        value: '<import src="file.richText" />',
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

      test('it is converted as marks code', async () => {
        const result = await richTextToStructuredText(richText);

        expect(validate(result).valid).toBeTruthy();

        expect(result).toMatchInlineSnapshot(`
          Object {
            "document": Object {
              "children": Array [
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
                },
              ],
              "type": "root",
            },
            "schema": "dast",
          }
        `);
      });

      // test('when code mark is not allowed it generates simple paragraphs', async () => {
      //   const result = await richTextToStructuredText(richText, {
      //     allowedMarks: [],
      //   });

      //   expect(validate(result).valid).toBeTruthy();
      //   expect(result?.document.children[0]).toMatchInlineSnapshot(`
      //       Object {
      //         "children": Array [
      //           Object {
      //             "children": Array [
      //               Object {
      //                 "children": Array [
      //                   Object {
      //                     "type": "span",
      //                     "value": "<import src=\\"file.richText\\" />",
      //                   },
      //                 ],
      //                 "type": "paragraph",
      //               },
      //             ],
      //             "type": "listItem",
      //           },
      //         ],
      //         "style": "bulleted",
      //         "type": "list",
      //       }
      //     `);
      // });
    });
  });

  describe('blockquote', () => {
    const richText: Document = {
      nodeType: BLOCKS.DOCUMENT,
      data: {},
      content: [
        {
          nodeType: BLOCKS.QUOTE,
          content: [
            {
              nodeType: BLOCKS.PARAGRAPH,
              content: [
                {
                  nodeType: 'text',
                  value: 'foo',
                  marks: [{ type: 'code' }, { type: 'italic' }],
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

    test('creates valid blockquote node', async () => {
      const result = await richTextToStructuredText(richText);

      expect(validate(result).valid).toBeTruthy();
      expect(result?.document.children.map((child) => child.type))
        .toMatchInlineSnapshot(`
            Array [
              "blockquote",
            ]
          `);
      expect(result?.document.children[0]).toMatchInlineSnapshot(`
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
              ],
              "type": "paragraph",
            },
          ],
          "type": "blockquote",
        }
      `);
    });

    test('when not allowed produces paragraphs', async () => {
      const result = await richTextToStructuredText(richText, {
        allowedBlocks: [],
      });

      expect(validate(result).valid).toBeTruthy();
      expect(result?.document.children[0]).toMatchInlineSnapshot(`
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
          ],
          "type": "paragraph",
        }
      `);
    });
  });

  describe('list', () => {
    test('creates valid unordered list', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.UL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.PARAGRAPH,
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
            ],
            data: {},
          },
        ],
      };
      const result = await richTextToStructuredText(richText);

      expect(validate(result).valid).toBeTruthy();
      expect(result?.document.children).toMatchInlineSnapshot(`
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
            ],
            "style": "bulleted",
            "type": "list",
          },
        ]
      `);
    });

    test('creates a numbered list from ordered-list', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.OL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.PARAGRAPH,
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
      expect(result?.document.children[0].type).toBe('list');
      expect(result?.document.children).toMatchInlineSnapshot(`
        Array [
          Object {
            "children": Array [
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
                ],
                "type": "listItem",
              },
            ],
            "style": "numbered",
            "type": "list",
          },
        ]
      `);
    });

    test('supports nested lists', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.UL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.UL_LIST,
                    content: [
                      {
                        nodeType: BLOCKS.LIST_ITEM,
                        content: [
                          {
                            nodeType: BLOCKS.PARAGRAPH,
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
      expect(result?.document.children).toMatchInlineSnapshot(`
        Array [
          Object {
            "children": Array [
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
                                "value": "bar",
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
                "type": "listItem",
              },
            ],
            "style": "bulleted",
            "type": "list",
          },
        ]
      `);
    });

    test('converts blockquote in list to text', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.UL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.QUOTE,
                    content: [
                      {
                        nodeType: BLOCKS.PARAGRAPH,
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
      const firstChild = result?.document.children[0] as List;
      expect(firstChild.children[0].children[0].type).toBe('paragraph');
    });

    test('converts nested heading to text', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.UL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.HEADING_2,
                    content: [
                      {
                        nodeType: BLOCKS.PARAGRAPH,
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
      const firstChild = result?.document.children[0] as List;
      expect(firstChild.children[0].children[0].type).toBe('paragraph');
    });

    test('supports link', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.UL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.PARAGRAPH,
                    content: [
                      {
                        nodeType: INLINES.HYPERLINK,
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
      const firstChild = result?.document.children[0] as List;
      expect(firstChild?.type).toBe('list');
      expect(firstChild?.children[0]).toMatchInlineSnapshot(`
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

    test('when not allowed, turns list items into paragraphs', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.UL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.PARAGRAPH,
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
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.PARAGRAPH,
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
      expect(result?.document).toMatchInlineSnapshot(`
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

    test('split nodes with images', async () => {
      const handlers = [
        makeHandler(
          (n): n is AssetLinkBlock => n.nodeType === BLOCKS.EMBEDDED_ASSET,
          async () => {
            const item = '123';
            return {
              type: 'block',
              item,
            };
          },
        ),
      ];

      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.UL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.PARAGRAPH,
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
                    nodeType: BLOCKS.EMBEDDED_ASSET,
                  },
                  {
                    nodeType: BLOCKS.PARAGRAPH,
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
      expect(result?.document).toMatchInlineSnapshot(`
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
    test('convert hr', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.HR,
            content: [],
            data: {},
          },
        ],
      };

      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();
      expect(result?.document.children[0]).toMatchInlineSnapshot(`
          Object {
            "type": "thematicBreak",
          }
        `);
    });
  });

  describe('link', () => {
    test('works in heading', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.HEADING_1,
            content: [
              {
                nodeType: INLINES.HYPERLINK,
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
      expect(result?.document.children[0].type).toBe('heading');
      expect(result?.document.children[0]).toMatchInlineSnapshot(`
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
          "level": 1,
          "type": "heading",
        }
      `);
    });
  });

  describe('with Marks', () => {
    const contentfulMarks = Object.keys(contentfulToDatoMark);

    describe('converts tags to marks', () => {
      it.each(contentfulMarks)(`%p`, async (markName) => {
        const richText: Document = {
          nodeType: BLOCKS.DOCUMENT,
          data: {},
          content: [
            {
              nodeType: BLOCKS.PARAGRAPH,
              content: [
                {
                  nodeType: 'text',
                  value: 'foo',
                  marks: [{ type: markName }],
                  data: {},
                },
                {
                  nodeType: 'text',
                  marks: [],
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
        const firstChild = result?.document.children[0] as DatoParagraph;
        expect(firstChild.children[0].marks[0]).toBe(
          contentfulToDatoMark[markName],
        );
      });
    });

    describe('ignore mark tags when not in allowedMarks', () => {
      it.each(contentfulMarks)(`%p`, async (markName) => {
        const richText: Document = {
          nodeType: BLOCKS.DOCUMENT,
          data: {},
          content: [
            {
              nodeType: BLOCKS.PARAGRAPH,
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
        const firstChild = result?.document.children[0] as DatoParagraph;
        const firstSpan = firstChild.children[0] as Span;
        expect(firstSpan.marks).toBeFalsy();
      });
    });

    describe('code', () => {
      test('turns inline code tags to span with code mark', async () => {
        const richText: Document = {
          nodeType: BLOCKS.DOCUMENT,
          data: {},
          content: [
            {
              nodeType: BLOCKS.PARAGRAPH,
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
        expect(result?.document.children[0].type).toBe('paragraph');
        expect(result?.document.children[0]).toMatchInlineSnapshot(`
          Object {
            "children": Array [
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
            ],
            "type": "paragraph",
          }
        `);
      });
    });
  });

  describe('wrap', () => {
    test('wraps all in paragraph', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.UL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.HEADING_1,
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
                        nodeType: INLINES.HYPERLINK,
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
                        nodeType: BLOCKS.QUOTE,
                        content: [
                          {
                            nodeType: BLOCKS.PARAGRAPH,
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
      expect(result?.document.children).toMatchInlineSnapshot(`
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

    test('always returns something, even with empty text', async () => {
      const richText: Document = {
        nodeType: BLOCKS.DOCUMENT,
        data: {},
        content: [
          {
            nodeType: BLOCKS.UL_LIST,
            content: [
              {
                nodeType: BLOCKS.LIST_ITEM,
                content: [
                  {
                    nodeType: BLOCKS.HEADING_1,
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
      expect(result?.document.children).toMatchInlineSnapshot(`
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
