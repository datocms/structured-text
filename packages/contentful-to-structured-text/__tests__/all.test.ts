/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { richTextToStructuredText, datoToContentfulMarks } from '../src';
import { allowedChildren, Span, validate } from 'datocms-structured-text-utils';
import { inspect } from 'util';

describe('contentful-to-structured-text', () => {
  it('works with empty document', async () => {
    const richText = {
      nodeType: 'document',
      data: {},
      content: [],
    };

    const result = await richTextToStructuredText(richText);
    expect(validate(result).valid).toBeTruthy();
    expect(result).toMatchInlineSnapshot(`null`);
  });

  // it('rejects invalid rich text documents', async () => {
  //   const richText = {
  //     nodeType: 'foobar',
  //     data: {},
  //     content: [],
  //   };

  //   const result = await richTextToStructuredText(richText);
  //   expect(validate(result).valid).toBeFalsy();
  //   expect(result).toMatchInlineSnapshot(`null`);
  // });

  // describe('handlers', () => {
  //   it('can return an array of nodes', async () => {
  //     const richText = {
  //       nodeType: 'paragraph',
  //       content: [{ nodeType: 'text', value: 'foo', marks: [], data: {} }],
  //       data: {},
  //     };

  //     const result = await richTextToStructuredText(richText, {
  //       handlers: {
  //         // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //         text: async (createNode, node, context) => {
  //           return await Promise.all([
  //             createNode('span', {
  //               value: node.value,
  //             }),
  //             createNode('span', {
  //               value: node.value,
  //             }),
  //           ]);
  //         },
  //         paragraph: async (createNode, node, context) => {
  //           return await Promise.all([
  //             context.defaultHandlers.p(createNode, node, context),
  //             context.defaultHandlers.p(createNode, node, context),
  //           ]);
  //         },
  //       },
  //     });
  //     expect(validate(result).valid).toBeTruthy();
  //     expect(findAll(result.document, 'paragraph')).toHaveLength(2);
  //     expect(findAll(result.document, 'span')).toHaveLength(4);
  //   });

  //   //   it('can return an array of promises', async () => {
  //   //     const richText = `
  //   //       <p>twice</p>
  //   //     `;
  //   //     const result = await richTextToStructuredText(richText, {
  //   //       handlers: {
  //   //         p: (createNode, node, context) => {
  //   //           return [
  //   //             context.defaultHandlers.p(createNode, node, context),
  //   //             context.defaultHandlers.p(createNode, node, context),
  //   //           ];
  //   //         },
  //   //       },
  //   //     });
  //   //     expect(validate(result).valid).toBeTruthy();
  //   //     expect(findAll(result.document, 'paragraph')).toHaveLength(2);
  //   //     expect(findAll(result.document, 'span')).toHaveLength(2);
  //   //   });

  //   //   describe('custom (user provided)', () => {
  //   //     it('can register custom handlers', async () => {
  //   //       const richText = `
  //   //         <unknown>span</unknown>
  //   //       <p>already wrapped</p>
  //   //       needs wrapping
  //   //     `;
  //   //       const result = await richTextToStructuredText(richText, {
  //   //         handlers: {
  //   //           // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   //           unknown: (createNode, node, context) => {
  //   //             return createNode('span', {
  //   //               value: 'custom',
  //   //             });
  //   //           },
  //   //         },
  //   //       });
  //   //       expect(validate(result).valid).toBeTruthy();
  //   //       const spans = findAll(result.document, 'span');
  //   //       expect(spans).toHaveLength(3);
  //   //       expect(spans[0].value).toBe('custom');
  //   //       const paragraphs = findAll(result.document, 'paragraph');
  //   //       expect(paragraphs.map((p) => p.children[0].value))
  //   //         .toMatchInlineSnapshot(`
  //   //         Array [
  //   //           "custom",
  //   //           "already wrapped",
  //   //           "needs wrapping",
  //   //         ]
  //   //       `);
  //   //     });

  //   //     it('waits for async handlers to resolve', async () => {
  //   //       const richText = `
  //   //         <custom>span</custom>
  //   //     `;
  //   //       const result = await richTextToStructuredText(richText, {
  //   //         handlers: {
  //   //           // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   //           custom: async (createNode, node, context) => {
  //   //             await new Promise((resolve) => setTimeout(resolve, 200));
  //   //             return createNode('span', {
  //   //               value: 'custom',
  //   //             });
  //   //           },
  //   //         },
  //   //       });
  //   //       expect(validate(result).valid).toBeTruthy();
  //   //       expect(find(result.document, 'span').value).toBe('custom');
  //   //     });

  //   //     it('can override default handlers', async () => {
  //   //       const richText = `
  //   //         <blockquote>override</blockquote>
  //   //         <p>regular paragraph</p>
  //   //     `;
  //   //       const result = await richTextToStructuredText(richText, {
  //   //         handlers: {
  //   //           blockquote: async (createNode, node, context) => {
  //   //             // turn a blockquote into a paragraph
  //   //             return context.handlers.p(createNode, node, context);
  //   //           },
  //   //         },
  //   //       });
  //   //       expect(validate(result).valid).toBeTruthy();
  //   //       expect(find(result.document, 'blockquote')).toBeFalsy();
  //   //       const paragraphs = findAll(result.document, 'paragraph');
  //   //       expect(paragraphs).toHaveLength(2);
  //   //       expect(find(paragraphs[0], 'span').value).toBe('override');
  //   //       expect(find(paragraphs[1], 'span').value).toBe('regular paragraph');
  //   //     });
  // });

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
    it('wraps children when necessary', async () => {
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

    it('allows link as children', async () => {
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

    it('is converted to text when inside of another node (except root)', async () => {
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

    it('when not allowed produces paragraphs', async () => {
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
      expect(result.document.children[0].children).toMatchInlineSnapshot(`
          Array [
            Object {
              "marks": Array [
                "emphasis",
              ],
              "type": "span",
              "value": "This is heading",
            },
          ]
        `);
      expect(result.document.children[0].type).toBe('paragraph');
    });
  });

  describe('code', () => {
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

    it('creates valid code node', async () => {
      const result = await richTextToStructuredText(richText);
      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0]).toMatchInlineSnapshot(`
          Object {
            "code": "<import src=\\"file.richText\\" />",
            "type": "code",
          }
        `);
    });

    it('when not allowed, produces paragraphs', async () => {
      const result = await richTextToStructuredText(richText, {
        allowedBlocks: [],
      });

      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].type).toBe('paragraph');
      expect(result.document.children[0].children).toMatchInlineSnapshot(`
          Array [
            Object {
              "marks": Array [
                "code",
              ],
              "type": "span",
              "value": "<import src=\\"file.richText\\" />",
            },
          ]
        `);
    });

    it('when code not allowed in blocks and marks, produces paragraphs', async () => {
      const result = await richTextToStructuredText(richText, {
        allowedBlocks: [],
        allowedMarks: ['strong'],
      });

      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children[0].type).toBe('paragraph');
      expect(result.document.children[0].children).toMatchInlineSnapshot(`
          Array [
            Object {
              "type": "span",
              "value": "<import src=\\"file.richText\\" />",
            },
          ]
        `);
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
    it('creates valid list', async () => {
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
                    nodeType: 'heading-1',
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

    it('creates a numbered list from OL elements', async () => {
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
      expect(result.document.children[0].children[0].children[0].type).toBe(
        'paragraph',
      );
      expect(
        result.document.children[0].children[0].children[0].children[0].type,
      ).toBe('link');
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

    it('when not allowed produces paragraphs', async () => {
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
    describe('when wrapping a heading', () => {
      it('lifts up heading to contain the link', async () => {
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

      it('ignores heading when it is not allowed in the context (eg. list)', async () => {
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
    });
  });

  describe('with Marks', () => {
    const marksTags = Object.keys(datoToContentfulMarks);

    describe('converts tags to marks', () => {
      it.each(marksTags)(`%p`, async (markName) => {
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
      it.each(marksTags)(`%p`, async (markName) => {
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
});
