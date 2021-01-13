// @ts-nocheck
import { htmlToDast } from '../src';
import { allowedChildren } from 'datocms-structured-text-utils';
import validate from './utils/validate-schema';

describe('toDast', () => {
  it('works with empty document', async () => {
    const html = '';
    expect(await htmlToDast(html)).toMatchInlineSnapshot(`
      Object {
        "children": Array [],
        "type": "root",
      }
    `);
  });

  it('ignores doctype and HTML comments', async () => {
    const html = `<!doctype html> <!-- <p>test</p> -->`;
    expect(await htmlToDast(html)).toMatchInlineSnapshot(`
      Object {
        "children": Array [],
        "type": "root",
      }
    `);
  });

  it('ignores script, style, link, head, meta', async () => {
    const html = `
      <head>
        <meta encoding="utf-8" />
        <title>dast</title>
        <link rel="preload" href="index.js" as="script" />
        <link rel="stylesheet" href="index.css" />
        <script src="index.js"></script>
        <style>body { color: red }</style>
        <script>console.log('script')</script>
      </head>

      <meta encoding="utf-8" />
      <title>dast</title>
      <link rel="preload" href="index.js" as="script" />
      <link rel="stylesheet" href="index.css" />
      <script src="index.js"></script>
      <style>body { color: red }</style>
      <script>console.log('script')</script>
    `;

    expect(await htmlToDast(html)).toMatchInlineSnapshot(`
      Object {
        "children": Array [],
        "type": "root",
      }
    `);
  });

  describe('handlers', () => {
    describe('root', () => {
      it('wraps children when necessary', async () => {
        const html = `
          <p>already wrapped</p>
          needs wrapping
        `;
        const dast = await htmlToDast(html);
        expect(dast.children.map((child) => child.type)).toMatchInlineSnapshot(`
          Array [
            "paragraph",
            "paragraph",
          ]
        `);
      });

      it('generates valid children', async () => {
        const html = `
          <h1>heading</h1>
          <p>paragraph</p>
          implicit paragraph
          <blockquote>blockquote</blockquote>
          <pre>code</pre>
          <ul><li>list</li></ul>
          <strong>inline wrapped</strong>
          <section>
            <div><div>inline nested</div></div>
          </section>
          <a href="#">hyperlink</a>
        `;
        const dast = await htmlToDast(html);

        expect(
          dast.children.every((child) =>
            allowedChildren['root'].includes(child.type),
          ),
        ).toBeTruthy();

        // The following is grouped in a single paragraph. I think it is fine.
        // <strong>inline wrapped</strong>
        // <section>
        //   <div><div>inline nested</div></div>
        // </section>
        // <a href="#">hyperlink</a>
        expect(dast.children.map((child) => child.type)).toMatchInlineSnapshot(`
          Array [
            "heading",
            "paragraph",
            "paragraph",
            "blockquote",
            "code",
            "list",
            "paragraph",
          ]
        `);
      });
    });

    describe('paragraph', () => {
      it('wraps children when necessary', async () => {
        const html = `
          <p>simple paragraph</p>
          implicit paragraph

          <article>
            <p>nested simple paragraph</p>
            nested implicit paragraph
          </article>
        `;
        const dast = await htmlToDast(html);
        expect(dast.children.map((child) => child.type)).toMatchInlineSnapshot(`
          Array [
            "paragraph",
            "paragraph",
            "paragraph",
            "paragraph",
          ]
        `);
      });

      it('generates valid children', async () => {
        const html = `
          <p>
            [simple text]
            <span>[span becomes simple text]</span>
            <span>[span becomes simple text]</span>
          </p>
        `;
        const dast = await htmlToDast(html);

        expect(dast.children).toMatchInlineSnapshot(`
          Array [
            Object {
              "children": Array [
                Object {
                  "marks": null,
                  "type": "span",
                  "value": "[simple text] ",
                },
                Object {
                  "marks": null,
                  "type": "span",
                  "value": "[span becomes simple text]",
                },
                Object {
                  "marks": null,
                  "type": "span",
                  "value": " ",
                },
                Object {
                  "marks": null,
                  "type": "span",
                  "value": "[span becomes simple text]",
                },
              ],
              "type": "paragraph",
            },
          ]
        `);
      });

      it('nested invalid elements end the current paragraph and start a new one', async () => {
        // This is how Hast parses them.

        const html = `
          <p>
            [simple text]
            <div>[separate paragraph]</div>
          </p>
        `;
        const dast = await htmlToDast(html);

        expect(dast.children).toMatchInlineSnapshot(`
          Array [
            Object {
              "children": Array [
                Object {
                  "marks": null,
                  "type": "span",
                  "value": "[simple text]",
                },
              ],
              "type": "paragraph",
            },
            Object {
              "children": Array [
                Object {
                  "marks": null,
                  "type": "span",
                  "value": "[separate paragraph]",
                },
              ],
              "type": "paragraph",
            },
          ]
        `);
      });
    });
  });

  it('fixture 1', async () => {
    const dast = await htmlToDast(
      `
      <div>
        <p> hi
          <blockquote>hello <span>text in

            blockquote</span>
          </blockquote>
        </p>
        <p><strong><code>callback()</code></strong></p>
        <p><p><strong><em>emphasis&strong</em> strong</strong></p></p>
      </div>
      <pre>
        <code>
          <div>var foo;</div>
          <div></div>
          <div>foo = 4;</div>
        </code>
      </pre>

      <pre>
          <div>var foo;</div>
          <div></div>
          <div>foo = 4;</div>
      </pre>
      `,
    );

    // expect(validate(dast)).toBeTruthy();
    expect(dast).toMatchInlineSnapshot(`
      Object {
        "children": Array [
          Object {
            "children": Array [
              Object {
                "marks": null,
                "type": "span",
                "value": "hi",
              },
            ],
            "type": "paragraph",
          },
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "marks": null,
                    "type": "span",
                    "value": "hello ",
                  },
                  Object {
                    "marks": null,
                    "type": "span",
                    "value": "text in blockquote",
                  },
                ],
                "type": "paragraph",
              },
            ],
            "type": "blockquote",
          },
          Object {
            "children": Array [
              Object {
                "marks": null,
                "type": "span",
                "value": "callback()",
              },
            ],
            "type": "paragraph",
          },
          Object {
            "children": Array [
              Object {
                "marks": null,
                "type": "span",
                "value": "emphasis&strong",
              },
              Object {
                "marks": null,
                "type": "span",
                "value": " strong",
              },
            ],
            "type": "paragraph",
          },
          Object {
            "code": "        
                
      var foo;

                

                
      foo = 4;

              
            ",
            "language": undefined,
            "type": "code",
          },
          Object {
            "code": "          
      var foo;

                

                
      foo = 4;

            ",
            "language": undefined,
            "type": "code",
          },
        ],
        "type": "root",
      }
    `);
  });

  it.skip('fixture 2', async () => {
    const html = `
      <ul>
        <li>1</li>
        <li><blockquote>2</blockquote></li>
        <li>3</li>
        <li><div>
        <h2>4.1 (heading)</h2>
        <blockquote>
          4.2 (blockquote)
        </blockquote>
        4.3 (paragraph)
        </div>
        <ul>
          <li>4.4 (nested ul>li)</li>
        </ul>
        </li>
      </ul>
      `;
    const dast = await htmlToDast(html);

    //expect(validate(dast)).toBeTruthy();
    expect(dast).toMatchInlineSnapshot(`
      Object {
        "children": Array [
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "marks": null,
                        "type": "span",
                        "value": "1",
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
                        "marks": null,
                        "type": "span",
                        "value": "2",
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
                        "marks": null,
                        "type": "span",
                        "value": "3",
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
                        "marks": null,
                        "type": "span",
                        "value": "4.1 (heading)",
                      },
                      Object {
                        "marks": null,
                        "type": "span",
                        "value": "4.2 (blockquote)",
                      },
                      Object {
                        "marks": null,
                        "type": "span",
                        "value": "4.3 (paragraph)",
                      },
                    ],
                    "type": "paragraph",
                  },
                  Object {
                    "children": Array [
                      Object {
                        "children": Array [
                          Object {
                            "children": Array [
                              Object {
                                "marks": null,
                                "type": "span",
                                "value": "4.4 (nested ul>li)",
                              },
                            ],
                            "type": "paragraph",
                          },
                        ],
                        "type": "listItem",
                      },
                    ],
                    "type": "list",
                  },
                ],
                "type": "listItem",
              },
            ],
            "type": "list",
          },
        ],
        "type": "root",
      }
    `);

    expect(htmlToMdast(html)).toMatchInlineSnapshot(`
      Object {
        "children": Array [
          Object {
            "children": Array [
              Object {
                "checked": null,
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "text",
                        "value": "1",
                      },
                    ],
                    "type": "paragraph",
                  },
                ],
                "spread": false,
                "type": "listItem",
              },
              Object {
                "checked": null,
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "children": Array [
                          Object {
                            "type": "text",
                            "value": "2",
                          },
                        ],
                        "type": "paragraph",
                      },
                    ],
                    "type": "blockquote",
                  },
                ],
                "spread": false,
                "type": "listItem",
              },
              Object {
                "checked": null,
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "text",
                        "value": "3",
                      },
                    ],
                    "type": "paragraph",
                  },
                ],
                "spread": false,
                "type": "listItem",
              },
              Object {
                "checked": null,
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "text",
                        "value": "4.1 (heading)",
                      },
                    ],
                    "depth": 2,
                    "type": "heading",
                  },
                  Object {
                    "children": Array [
                      Object {
                        "children": Array [
                          Object {
                            "type": "text",
                            "value": "4.2 (blockquote)",
                          },
                        ],
                        "type": "paragraph",
                      },
                    ],
                    "type": "blockquote",
                  },
                  Object {
                    "children": Array [
                      Object {
                        "type": "text",
                        "value": "4.3 (paragraph)",
                      },
                    ],
                    "type": "paragraph",
                  },
                  Object {
                    "children": Array [
                      Object {
                        "checked": null,
                        "children": Array [
                          Object {
                            "children": Array [
                              Object {
                                "type": "text",
                                "value": "4.4 (nested ul>li)",
                              },
                            ],
                            "type": "paragraph",
                          },
                        ],
                        "spread": false,
                        "type": "listItem",
                      },
                    ],
                    "ordered": false,
                    "spread": false,
                    "start": null,
                    "type": "list",
                  },
                ],
                "spread": true,
                "type": "listItem",
              },
            ],
            "ordered": false,
            "spread": true,
            "start": null,
            "type": "list",
          },
        ],
        "type": "root",
      }
    `);
  });

  it.skip('fixture 3', () => {
    const dast = htmlToDast(`<body>
      <div>
        <h1>TextHeading</h1>
        <div>heheh</div>
      </div>
      <blockquote>
        TextInsideBlockquote <strong>strong <code>inline-code</code></strong> what up

        friend
      </blockquote>
      <ul>
        <li>TextLiNoWrapped</li>
        <li><div>TextLiWrappedDiv</div></li>
        <li><p>TextLiWrappedP</p></li>
      </ul>
      <select><option>SelectIgnored</option></select>

      <p>
        <span>
          <a href="#"><img src="avatar.jpg" /></a>
        </span>
      </p>
      </body>`);

    expect(dast).toMatchInlineSnapshot(`
      Object {
        "children": Array [
          Object {
            "children": Array [
              Object {
                "type": "span",
                "value": "TextHeading",
              },
            ],
            "level": 1,
            "type": "heading",
          },
          Object {
            "children": Array [
              Object {
                "type": "span",
                "value": "heheh",
              },
            ],
            "type": "paragraph",
          },
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "type": "span",
                    "value": "TextInsideBlockquote",
                  },
                ],
                "type": "paragraph",
              },
              Object {
                "marks": Array [
                  "strong",
                ],
                "type": "span",
                "value": "strong ",
              },
              Object {
                "marks": Array [
                  "strong",
                  "code",
                ],
                "type": "span",
                "value": "inline-code",
              },
              Object {
                "children": Array [
                  Object {
                    "type": "span",
                    "value": "what up friend",
                  },
                ],
                "type": "paragraph",
              },
            ],
            "type": "blockquote",
          },
          Object {
            "children": Array [
              Object {
                "checked": null,
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "span",
                        "value": "TextLiNoWrapped",
                      },
                    ],
                    "type": "paragraph",
                  },
                ],
                "spread": false,
                "type": "listItem",
              },
              Object {
                "checked": null,
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "span",
                        "value": "TextLiWrappedDiv",
                      },
                    ],
                    "type": "paragraph",
                  },
                ],
                "spread": false,
                "type": "listItem",
              },
              Object {
                "checked": null,
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "span",
                        "value": "TextLiWrappedP",
                      },
                    ],
                    "type": "paragraph",
                  },
                ],
                "spread": false,
                "type": "listItem",
              },
            ],
            "ordered": false,
            "spread": false,
            "start": null,
            "type": "list",
          },
          Object {
            "children": Array [
              Object {
                "children": Array [],
                "title": null,
                "type": "link",
                "url": "#",
              },
            ],
            "type": "paragraph",
          },
        ],
        "type": "root",
      }
    `);
  });
});
