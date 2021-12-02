/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { parse5ToStructuredText, Options } from '../src';
import parse5 from 'parse5';
import { allowedChildren, Span, validate } from 'datocms-structured-text-utils';
import { findAll, find, visit, CONTINUE } from 'unist-utils-core';
import googleDocsPreprocessor from '../src/preprocessors/google-docs';

function htmlToStructuredText(html: string, options: Options = {}) {
  return parse5ToStructuredText(
    parse5.parse(html, {
      sourceCodeLocationInfo: true,
    }),
    options,
  );
}

describe('htmlToStructuredText', () => {
  it('works with empty document', async () => {
    const html = '';
    const result = await htmlToStructuredText(html);
    expect(validate(result).valid).toBeTruthy();
    expect(result).toMatchInlineSnapshot(`null`);
  });

  it('ignores doctype and HTML comments', async () => {
    const html = `<!doctype html> <!-- <p>test</p> -->`;
    const result = await htmlToStructuredText(html);
    expect(validate(result).valid).toBeTruthy();
    expect(result).toMatchInlineSnapshot(`null`);
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

    const result = await htmlToStructuredText(html);
    expect(validate(result).valid).toBeTruthy();
    expect(result).toMatchInlineSnapshot(`null`);
  });

  describe('handlers', () => {
    it('can return an array of nodes', async () => {
      const html = `
        <p>twice</p>
      `;

      const result = await htmlToStructuredText(html, {
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
          p: async (createNode, node, context) => {
            return await Promise.all([
              context.defaultHandlers.p(createNode, node, context),
              context.defaultHandlers.p(createNode, node, context),
            ]);
          },
        },
      });
      expect(validate(result).valid).toBeTruthy();
      expect(findAll(result.document, 'paragraph')).toHaveLength(2);
      expect(findAll(result.document, 'span')).toHaveLength(4);
    });

    it('can return an array of promises', async () => {
      const html = `
        <p>twice</p>
      `;
      const result = await htmlToStructuredText(html, {
        handlers: {
          p: (createNode, node, context) => {
            return [
              context.defaultHandlers.p(createNode, node, context),
              context.defaultHandlers.p(createNode, node, context),
            ];
          },
        },
      });
      expect(validate(result).valid).toBeTruthy();
      expect(findAll(result.document, 'paragraph')).toHaveLength(2);
      expect(findAll(result.document, 'span')).toHaveLength(2);
    });

    describe('custom (user provided)', () => {
      it('can register custom handlers', async () => {
        const html = `
          <unknown>span</unknown>
        <p>already wrapped</p>
        needs wrapping
      `;
        const result = await htmlToStructuredText(html, {
          handlers: {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            unknown: (createNode, node, context) => {
              return createNode('span', {
                value: 'custom',
              });
            },
          },
        });
        expect(validate(result).valid).toBeTruthy();
        const spans = findAll(result.document, 'span');
        expect(spans).toHaveLength(3);
        expect(spans[0].value).toBe('custom');
        const paragraphs = findAll(result.document, 'paragraph');
        expect(paragraphs.map((p) => p.children[0].value))
          .toMatchInlineSnapshot(`
          Array [
            "custom",
            "already wrapped",
            "needs wrapping",
          ]
        `);
      });

      it('waits for async handlers to resolve', async () => {
        const html = `
          <custom>span</custom>
      `;
        const result = await htmlToStructuredText(html, {
          handlers: {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            custom: async (createNode, node, context) => {
              await new Promise((resolve) => setTimeout(resolve, 200));
              return createNode('span', {
                value: 'custom',
              });
            },
          },
        });
        expect(validate(result).valid).toBeTruthy();
        expect(find(result.document, 'span').value).toBe('custom');
      });

      it('can override default handlers', async () => {
        const html = `
          <blockquote>override</blockquote>
          <p>regular paragraph</p>
      `;
        const result = await htmlToStructuredText(html, {
          handlers: {
            blockquote: async (createNode, node, context) => {
              // turn a blockquote into a paragraph
              return context.handlers.p(createNode, node, context);
            },
          },
        });
        expect(validate(result).valid).toBeTruthy();
        expect(find(result.document, 'blockquote')).toBeFalsy();
        const paragraphs = findAll(result.document, 'paragraph');
        expect(paragraphs).toHaveLength(2);
        expect(find(paragraphs[0], 'span').value).toBe('override');
        expect(find(paragraphs[1], 'span').value).toBe('regular paragraph');
      });
    });

    describe('root', () => {
      it('wraps children when necessary', async () => {
        const html = `
          <unknown>span</unknown>
          <p>already wrapped</p>
          needs wrapping
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children.map((child) => child.type))
          .toMatchInlineSnapshot(`
          Array [
            "paragraph",
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
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();

        expect(
          result.document.children.every((child) =>
            allowedChildren['root'].includes(child.type),
          ),
        ).toBeTruthy();

        // The following is grouped in a single paragraph. I think it is fine.
        // <strong>inline wrapped</strong>
        // <section>
        //   <div><div>inline nested</div></div>
        // </section>
        // <a href="#">hyperlink</a>
        expect(result.document.children.map((child) => child.type))
          .toMatchInlineSnapshot(`
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

    describe('base', () => {
      it('is detected during transformation', async () => {
        expect.assertions(6);
        const html = `
          <base href="https://datocms.com" />
        `;
        const result = await htmlToStructuredText(html, {
          handlers: {
            base: async (createNode, node, context) => {
              expect(context.global.baseUrl).toBe(null);
              expect(context.global.baseUrlFound).toBe(false);
              const result = await context.defaultHandlers.base(
                createNode,
                node,
                context,
              );
              expect(context.global.baseUrl).toBe('https://datocms.com');
              expect(context.global.baseUrlFound).toBe(true);
              return result;
            },
          },
        });
        expect(validate(result).valid).toBeTruthy();
        expect(result).toBeNull();
      });

      it('maps links attributes', async () => {
        const html = `
          <a href="./contact" target="_blank" title="Foo bar" other="Ignore me" rel="noopener noreferrer">contact</a>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        const { meta } = find(result.document, 'link');
        expect(meta).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "target",
              "value": "_blank",
            },
            Object {
              "id": "rel",
              "value": "noopener noreferrer",
            },
            Object {
              "id": "title",
              "value": "Foo bar",
            },
          ]
        `);
      });

      it('resolves relative paths', async () => {
        const html = `
          <base href="https://datocms.com" />
          <a href="./contact">contact</a>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(find(result.document, 'link').url).toBe(
          'https://datocms.com/contact',
        );
      });

      it('resolves relative paths without . or /', async () => {
        const html = `
          <base href="https://datocms.com" />
          <a href="contact">contact</a>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(find(result.document, 'link').url).toBe(
          'https://datocms.com/contact',
        );
      });

      it('resolves absolute paths', async () => {
        const html = `
          <base href="https://datocms.com/t/" />
          <a href="/contact">contact</a>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(find(result.document, 'link').url).toBe(
          'https://datocms.com/t/contact',
        );
      });

      it('does not modify absolute URLs', async () => {
        const html = `
          <base href="https://datocms.com/t/" />
          <a href="https://datocms.com/b/contact">contact</a>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(find(result.document, 'link').url).toBe(
          'https://datocms.com/b/contact',
        );
      });

      it('overrides user specified baseUrl', async () => {
        const html = `
          <base href="https://datocms.com/" />
          <a href="/contact">contact</a>
        `;
        const result = await htmlToStructuredText(html, {
          shared: {
            baseUrl: 'http://acme.com',
          },
        });
        expect(validate(result).valid).toBeTruthy();
        expect(find(result.document, 'link').url).toBe(
          'https://datocms.com/contact',
        );
      });

      it('does not override user specified baseUrl when found', async () => {
        const html = `
          <base href="https://datocms.com/" />
          <a href="/contact">contact</a>
        `;
        const result = await htmlToStructuredText(html, {
          shared: {
            baseUrl: 'http://acme.com',
            baseUrlFound: true,
          },
        });
        expect(validate(result).valid).toBeTruthy();
        expect(find(result.document, 'link').url).toBe(
          'http://acme.com/contact',
        );
      });
    });

    describe('extractInlineStyles', () => {
      it('from spans', async () => {
        const html = `
          <b
          style="font-weight: bold"
          id="docs-internal-guid-c793557e-7fff-c5c5-a52b-0abb9f4c028a"
          >b</b>
          <span style="font-weight: bold;">span</span>
        `;

        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'paragraph')).toHaveLength(1);
        const spans = findAll(result.document, 'span');
        expect(spans).toHaveLength(3);
        expect(spans.map((span) => [span.value, span.marks]))
          .toMatchInlineSnapshot(`
          Array [
            Array [
              "b",
              Array [
                "strong",
              ],
            ],
            Array [
              " ",
              undefined,
            ],
            Array [
              "span",
              Array [
                "strong",
              ],
            ],
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
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children.map((child) => child.type))
          .toMatchInlineSnapshot(`
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
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children).toMatchInlineSnapshot(`
          Array [
            Object {
              "children": Array [
                Object {
                  "type": "span",
                  "value": "[simple text] ",
                },
                Object {
                  "type": "span",
                  "value": "[span becomes simple text]",
                },
                Object {
                  "type": "span",
                  "value": " ",
                },
                Object {
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
        // This is how `hast` parses them.

        const html = `
          <p>
            [simple text]
            <div>[separate paragraph]</div>
          </p>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children).toMatchInlineSnapshot(`
          Array [
            Object {
              "children": Array [
                Object {
                  "type": "span",
                  "value": "[simple text]",
                },
              ],
              "type": "paragraph",
            },
            Object {
              "children": Array [
                Object {
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

    describe('heading', () => {
      it('wraps children when necessary', async () => {
        const html = `
          <h1>needs wrapping</h1>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].type).toBe('heading');
        expect(result.document.children[0].children[0].type).toBe('span');
      });

      it('ignores invalid heading numbers', async () => {
        const html = `
          <h7>needs wrapping</h7>
          <p>hello</p>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children.map((child) => child.type))
          .toMatchInlineSnapshot(`
          Array [
            "paragraph",
            "paragraph",
          ]
        `);
        expect(findAll(result.document, 'heading')).toHaveLength(0);
      });

      it('ignores invalid children', async () => {
        const html = `
          <h1><p>p not allowed inside h1</p></h1>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'paragraph')).toHaveLength(0);
      });

      it('allows link as children', async () => {
        const html = `
          <h1>span <a href="#">link</a></h1>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].children).toMatchInlineSnapshot(`
          Array [
            Object {
              "type": "span",
              "value": "span ",
            },
            Object {
              "children": Array [
                Object {
                  "type": "span",
                  "value": "link",
                },
              ],
              "type": "link",
              "url": "#",
            },
          ]
        `);
      });

      it('is converted to text when inside of another dast node (except root)', async () => {
        const html = `
          <section>
            <ul>
              <h1>inside ul</h1>
            </ul>
          </section>
          <pre>
            <code>
              <h1>inside code</h1>
            </code>
          </pre>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'heading')).toHaveLength(0);
      });

      it('when not allowed produces paragraphs', async () => {
        const html = `
          <h1>dato</h1>
        `;
        const result = await htmlToStructuredText(html, {
          allowedBlocks: [],
        });
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'heading')).toHaveLength(0);
        expect(findAll(result.document, 'paragraph')).toHaveLength(1);
        expect(find(result.document, 'span').value).toBe('dato');
      });
    });

    describe('code', () => {
      it('creates valid code node', async () => {
        const html = `
          <pre><code class="language-html"><span class="hljs-tag">&lt;<span class="hljs-name">import</span> <span class="hljs-attr">src</span>=<span class="hljs-string">"file.html"</span> /&gt;</span></code></pre>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0]).toMatchInlineSnapshot(`
          Object {
            "code": "<import src=\\"file.html\\" />",
            "language": "html",
            "type": "code",
          }
        `);
      });

      it('turns pre into span if not allowed inside the parent dast node', async () => {
        const html = `
          <ul>
            <li><pre><code class="language-html">dast()</code></pre></li>
          </ul>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(find(result.document, 'paragraph')).toBeTruthy();
        expect(findAll(result.document, 'code')).toHaveLength(0);
        expect(findAll(result.document, 'span')[0]).toMatchInlineSnapshot(`
          Object {
            "marks": Array [
              "code",
            ],
            "type": "span",
            "value": "dast()",
          }
        `);
      });

      it('turns code elements into code blocks if in root context', async () => {
        const html = `
          <code class="language-html">dast()</code>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'code')).toHaveLength(1);
        expect(findAll(result.document, 'code')[0]).toMatchInlineSnapshot(`
          Object {
            "code": "dast()",
            "language": "html",
            "type": "code",
          }
        `);
      });

      it('works without language information', async () => {
        const html = `
          <code>dast()</code>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'code')).toHaveLength(1);
        expect(findAll(result.document, 'code')[0].language).toBeFalsy();
      });

      it('when not allowed produces paragraphs', async () => {
        const html = `
          <code>let dato</code>
        `;
        const result = await htmlToStructuredText(html, {
          allowedBlocks: [],
        });
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'code')).toHaveLength(0);
        expect(findAll(result.document, 'paragraph')).toHaveLength(1);
        expect(find(result.document, 'span').value).toBe('let dato');
      });

      it('it handles <br> tags', async () => {
        const html = `
          <pre><code>foo<br>bar</code></pre>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children).toMatchInlineSnapshot(`
          Array [
            Object {
              "code": "foo
          bar",
              "type": "code",
            },
          ]
        `);
      });
    });

    describe('blockquote', () => {
      it('creates valid blockquote node', async () => {
        const html = `
          <blockquote>1</blockquote>
          <blockquote><span>2</span></blockquote>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children.map((child) => child.type))
          .toMatchInlineSnapshot(`
          Array [
            "blockquote",
            "blockquote",
          ]
        `);
        expect(result.document.children[0]).toMatchInlineSnapshot(`
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "type": "span",
                    "value": "1",
                  },
                ],
                "type": "paragraph",
              },
            ],
            "type": "blockquote",
          }
        `);
      });

      it('supports <br>', async () => {
        const html = `
          <blockquote>1<br>2</blockquote>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children).toMatchInlineSnapshot(`
          Array [
            Object {
              "children": Array [
                Object {
                  "children": Array [
                    Object {
                      "type": "span",
                      "value": "1",
                    },
                    Object {
                      "type": "span",
                      "value": "
          ",
                    },
                    Object {
                      "type": "span",
                      "value": "2",
                    },
                  ],
                  "type": "paragraph",
                },
              ],
              "type": "blockquote",
            },
          ]
        `);
      });

      it('when not allowed produces paragraphs', async () => {
        const html = `
          <blockquote>dato</blockquote>
        `;
        const result = await htmlToStructuredText(html, {
          allowedBlocks: [],
        });
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'blockquote')).toHaveLength(0);
        expect(findAll(result.document, 'paragraph')).toHaveLength(1);
        expect(find(result.document, 'span').value).toBe('dato');
      });
    });

    describe('list', () => {
      it('creates valid list', async () => {
        const html = `
          <ul><li>test</li></ul>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].style).toBe('bulleted');
      });

      it('creates a numbered list from OL elements', async () => {
        const html = `
          <ol><li>test</li></ol>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].style).toBe('numbered');
      });

      it('wraps children with listItem', async () => {
        const html = `
          <ul>
            <li>1</li>
            2
            <li>3</li>
            <li><p>4</p></li>
          </ul>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(
          find(result.document, 'list').children.every(
            (child) => child.type === 'listItem',
          ),
        ).toBeTruthy();
      });

      it('supports nested lists', async () => {
        const html = `
          <ul>
            <li><ul><li>1</li></ul></li>
          </ul>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(find(find(result.document, 'list'), 'list')).toBeTruthy();
      });

      it('converts nested blockquote to text', async () => {
        const html = `
          <ul>
            <li><blockquote>1</blockquote></li>
          </ul>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'blockquote')).toHaveLength(0);
        expect(find(result.document, 'span').value).toBe('1');
      });

      it('converts nested heading to text', async () => {
        const html = `
          <ul>
            <li><h1>1</h1></li>
          </ul>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'h1')).toHaveLength(0);
        expect(find(result.document, 'span').value).toBe('1');
      });

      it('converts nested code to text', async () => {
        const html = `
          <ul>
            <li><code>1</code></li>
          </ul>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'code')).toHaveLength(0);
        expect(find(result.document, 'span').value).toBe('1');
      });

      it('supports nested and/or unwrapped link', async () => {
        const html = `
          <ul>
            <li><a href="#">1</a>2</li>
            <a href="#">3</a>
          </ul>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'link')).toHaveLength(2);
        const items = findAll(result.document, 'listItem').map((listItem) =>
          find(listItem, 'paragraph').children.map((child) => child.type),
        );
        expect(items).toMatchInlineSnapshot(`
          Array [
            Array [
              "link",
              "span",
            ],
            Array [
              "link",
            ],
          ]
        `);
      });

      it('convert nested invalid children', async () => {
        const html = `
          <ul>
            <li>1</li>
            <blockquote>2</blockquote>
            <code>3</code>
            <li>4</li>
            <ul><li>5</li></ul>
          </ul>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        const lists = findAll(result.document, 'list');
        expect(lists).toHaveLength(1);
        const list = lists[0];
        expect(
          list.children.every((child) => child.type === 'listItem'),
        ).toBeTruthy();
        expect(
          findAll(list, 'span')
            .map((child) => child.value)
            .join(''),
        ).toBe('12345');
      });

      it('convert hr', async () => {
        const html = `
          <div>
            <hr>
            <blockquote>1<hr></blockquote>
          </div>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        const thematicBreaks = findAll(result.document, 'thematicBreak');
        expect(thematicBreaks).toHaveLength(1);
      });

      it('when not allowed produces paragraphs', async () => {
        const html = `
          <ul>
            <li>dato</li>
          </ul>
        `;
        const result = await htmlToStructuredText(html, {
          allowedBlocks: [],
        });
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'list')).toHaveLength(0);
        expect(findAll(result.document, 'paragraph')).toHaveLength(1);
        expect(find(result.document, 'span').value).toBe('dato');
      });
    });

    describe('link', () => {
      it('is wrapped when top level', async () => {
        const html = `
          <a href="#">1</a>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].type).toBe('paragraph');
        expect(find(find(result.document, 'paragraph'), 'link')).toBeTruthy();
      });

      describe('when wrapping a heading', () => {
        it('lifts up heading to contain the link', async () => {
          const html = `
            <a href="#"><h1>1</h1>2</a>
          `;
          const result = await htmlToStructuredText(html);
          expect(validate(result).valid).toBeTruthy();
          expect(result.document.children[0].type).toBe('heading');
          expect(find(find(result.document, 'heading'), 'link')).toBeTruthy();
          expect(find(find(result.document, 'paragraph'), 'link')).toBeTruthy();
        });

        it('ignores heading when it is not allowed in the context (eg. list)', async () => {
          const html = `
            <ul><a href="#"><h1>1</h1>2</a></ul>
          `;
          const result = await htmlToStructuredText(html);
          expect(validate(result).valid).toBeTruthy();
          expect(findAll(result.document, 'heading')).toHaveLength(0);
        });
      });

      it('when not allowed produces paragraphs', async () => {
        const html = `
          <a href="#"><h1>dato</h1>2</a>
        `;
        const result = await htmlToStructuredText(html, {
          allowedBlocks: [],
        });
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'link')).toHaveLength(0);
        expect(findAll(result.document, 'heading')).toHaveLength(0);
        expect(findAll(result.document, 'paragraph')).toHaveLength(1);
        expect(find(result.document, 'span').value).toBe('dato');
      });
    });

    describe('with Marks', () => {
      const marksTags = {
        code: 'code',
        kbd: 'code',
        samp: 'code',
        tt: 'code',
        var: 'code',

        strong: 'strong',
        b: 'strong',

        em: 'emphasis',
        i: 'emphasis',

        u: 'underline',

        strike: 'strikethrough',
        s: 'strikethrough',

        mark: 'highlight',
      };

      describe('converts tags to marks', () => {
        it.each(Object.keys(marksTags))(`%p`, async (tagName) => {
          const markName = marksTags[tagName];
          const html = `
          <p><${tagName}>${markName}</${tagName}></p>
        `;
          const result = await htmlToStructuredText(html);
          expect(validate(result).valid).toBeTruthy();
          const span = find(result.document, 'span');
          expect(span.marks).toBeTruthy();
          expect(span.marks).toContain(markName);
        });
      });

      describe('ignore mark tags when not in allowedMarks', () => {
        it.each(Object.keys(marksTags))(`%p`, async (tagName) => {
          const markName = marksTags[tagName];
          const html = `
          <p><${tagName}>${markName}</${tagName}></p>
        `;
          const result = await htmlToStructuredText(html, {
            allowedMarks: [],
          });
          expect(validate(result).valid).toBeTruthy();
          const span = find(result.document, 'span');
          expect(span.marks).toBeFalsy();
        });
      });

      it('collects marks when nesting nodes', async () => {
        const html = `
          <p><em>em<strong>strong-em<u>u-strong-em</u>strong-em</strong>em</em></p>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(
          findAll(result.document, 'span')
            .map(
              (span) =>
                `{ value: '${span.value}', marks: ['${span.marks.join(
                  "', '",
                )}'] }`,
            )
            .join('\n'),
        ).toMatchInlineSnapshot(`
          "{ value: 'em', marks: ['emphasis'] }
          { value: 'strong-em', marks: ['emphasis', 'strong'] }
          { value: 'u-strong-em', marks: ['emphasis', 'strong', 'underline'] }
          { value: 'strong-em', marks: ['emphasis', 'strong'] }
          { value: 'em', marks: ['emphasis'] }"
        `);
      });

      describe('code', () => {
        it('turns inline code tags to span with code mark', async () => {
          const html = `<p>To make it even easier to offer responsive, progressive images on your projects, we released a package called <a href="https://github.com/datocms/react-datocms"><code>react-datocms</code></a> that exposes an <code>&lt;Image /&gt;</code> component and pairs perfectly with the <code>responsiveImage</code> query.</p>`;
          const result = await htmlToStructuredText(html);
          expect(validate(result).valid).toBeTruthy();
          expect(findAll(result.document, 'code')).toHaveLength(0);
          const spans = findAll(result.document, 'span').filter(
            (s) => Array.isArray(s.marks) && s.marks.includes('code'),
          );
          expect(spans).toHaveLength(3);
          expect(spans.map((s) => s.value).join('\n')).toMatchInlineSnapshot(`
            "react-datocms
            <Image />
            responsiveImage"
          `);
        });
      });
    });

    describe('newLine', () => {
      it('a document with only a <br> is empty (null)', async () => {
        const html = `
          <br>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result).toBe(null);
      });

      it('leading <br>', async () => {
        const html = `
          <br><br>hello
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].type).toBe('paragraph');
        expect(result.document.children).toHaveLength(1);
        expect(
          findAll(result.document, 'span')
            .map((s) => s.value)
            .join(''),
        ).toBe('\n\nhello');
      });

      it('trailing <br>', async () => {
        const html = `
          hello<br><br>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].type).toBe('paragraph');
        expect(result.document.children).toHaveLength(1);
        expect(
          findAll(result.document, 'span')
            .map((s) => s.value)
            .join(''),
        ).toBe('hello\n\n');
      });

      it('converts <br> to newline', async () => {
        const html = `
          hello<br>world
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].type).toBe('paragraph');
        expect(result.document.children).toHaveLength(1);
        expect(
          findAll(result.document, 'span')
            .map((s) => s.value)
            .join(''),
        ).toBe('hello\nworld');
      });

      it('converts inline <br>', async () => {
        const html = `
          <p>hello<br>world</p>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].type).toBe('paragraph');
        expect(result.document.children).toHaveLength(1);
        expect(
          findAll(result.document, 'span')
            .map((s) => s.value)
            .join(''),
        ).toBe('hello\nworld');
      });

      it('converts <br> in between elements', async () => {
        const html = `
          <p>hello</p><br><div>world</div>
        `;
        const result = await htmlToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children.map((c) => c.type).join(',')).toBe(
          'paragraph,paragraph',
        );
        expect(result.document.children).toHaveLength(2);
        expect(
          result.document.children.map((c) =>
            findAll(c, 'span').map((s) => s.value),
          ),
        ).toMatchInlineSnapshot(`
          Array [
            Array [
              "hello",
            ],
            Array [
              "
          ",
              "world",
            ],
          ]
        `);
      });
    });
  });

  describe('preprocessing', () => {
    function liftImages(tree) {
      const liftedImages = new WeakSet();
      const body = find(tree, (node) => node.tagName === 'body');

      visit(body, (node, index, parents) => {
        if (
          !node ||
          node.tagName !== 'img' ||
          liftedImages.has(node) ||
          parents.length === 1 // is a top level img
        ) {
          return;
        }
        // remove image

        const imgParent = parents[parents.length - 1];
        imgParent.children.splice(index, 1);

        let i = parents.length;
        let splitChildrenIndex = index;
        let childrenAfterSplitPoint = [];

        while (--i > 0) {
          // Example: i == 2
          // [ 'body', 'div', 'h1' ]
          const /* h1 */ parent = parents[i];
          const /* div */ parentsParent = parents[i - 1];

          // Delete the siblings after the image and save them in a variable
          childrenAfterSplitPoint /* [ 'h1.2' ] */ = parent.children.splice(
            splitChildrenIndex,
          );
          // parent.children is now == [ 'h1.1' ]

          // parentsParent.children = [ 'h1' ]
          splitChildrenIndex = parentsParent.children.indexOf(parent);
          // splitChildrenIndex = 0

          let nodeInserted = false;

          // If we reached the 'div' add the image's node
          if (i === 1) {
            splitChildrenIndex += 1;
            parentsParent.children.splice(splitChildrenIndex, 0, node);
            liftedImages.add(node);

            nodeInserted = true;
          }

          splitChildrenIndex += 1;
          // Create a new branch with childrenAfterSplitPoint if we have any i.e.
          // <h1>h1.2</h1>
          if (childrenAfterSplitPoint.length > 0) {
            parentsParent.children.splice(splitChildrenIndex, 0, {
              ...parent,
              children: childrenAfterSplitPoint,
            });
          }
          // Remove the parent if empty
          if (parent.children.length === 0) {
            splitChildrenIndex -= 1;
            parentsParent.children.splice(
              nodeInserted ? splitChildrenIndex - 1 : splitChildrenIndex,
              1,
            );
          }
        }
      });
    }

    it('allows users to transform the Hast tree', async () => {
      const html = `
        <p>heading</p>
      `;
      const result = await htmlToStructuredText(html, {
        preprocess: (tree) => {
          findAll(tree, (node) => {
            if (node.type === 'element' && node.tagName === 'p') {
              node.tagName = 'h1';
            }
          });
        },
      });
      expect(validate(result).valid).toBeTruthy();
      expect(findAll(result.document, 'paragraph')).toHaveLength(0);
      const headings = findAll(result.document, 'heading');
      expect(headings).toHaveLength(1);
      expect(headings[0].level).toBe(1);
      expect(find(headings[0], 'span').value).toBe('heading');
    });

    it('split nodes with images', async () => {
      const html = `
        <ul>
          <li>item 1</li>
          <li><div><img src="./ul1-img.png" alt>item 2</div></li>
          <li>item 3</li>
          <li>item 4<img src="./ul2-img.png" alt></li>
          <li>item 5</li>
          <li>item 6<img src="./ul3-img.png" alt>item 7</li>
          <li>item 8</li>
          <li><img src="./ul4-img.png" alt></li>
        </ul>
        <img src="./root1-img.png" alt>
        <div>
          <h1>h1.1<img src="./h1-img.png" alt>h1.2</h1>
        </div>
      `;

      const result = await htmlToStructuredText(html, {
        preprocess: liftImages,
        handlers: {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          img: async (createNode, node, context) => {
            // In a real scenario you would upload the image to Dato and get back an id.
            const item = '123';
            return createNode('block', {
              item,
            });
          },
        },
      });

      expect(validate(result).valid).toBeTruthy();
      expect(findAll(result.document, 'list')).toHaveLength(4);
      expect(findAll(result.document, 'listItem')).toHaveLength(8);
      expect(findAll(result.document, 'block')).toHaveLength(6);
      expect(findAll(result.document, 'heading')).toHaveLength(2);
      expect(
        result.document.children.map((child) => {
          if (child.children) {
            return [child.type, [child.children.map((c) => c.type)]];
          }
          return child.type;
        }),
      ).toMatchInlineSnapshot(`
        Array [
          Array [
            "list",
            Array [
              Array [
                "listItem",
              ],
            ],
          ],
          "block",
          Array [
            "list",
            Array [
              Array [
                "listItem",
                "listItem",
                "listItem",
              ],
            ],
          ],
          "block",
          Array [
            "list",
            Array [
              Array [
                "listItem",
                "listItem",
              ],
            ],
          ],
          "block",
          Array [
            "list",
            Array [
              Array [
                "listItem",
                "listItem",
              ],
            ],
          ],
          "block",
          "block",
          Array [
            "heading",
            Array [
              Array [
                "span",
              ],
            ],
          ],
          "block",
          Array [
            "heading",
            Array [
              Array [
                "span",
              ],
            ],
          ],
        ]
      `);
    });

    it('split nodes when only one list-item', async () => {
      const html = `
        <ul>
          <li><div><img src="./ul1-img.png" alt>item 2</div></li>
        </ul>
      `;

      const result = await htmlToStructuredText(html, {
        preprocess: liftImages,
        handlers: {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          img: async (createNode, node, context) => {
            // In a real scenario you would upload the image to Dato and get back an id.
            const item = '123';
            return createNode('block', {
              item,
            });
          },
        },
      });

      expect(validate(result).valid).toBeTruthy();
      expect(findAll(result.document, 'list')).toHaveLength(1);
      expect(findAll(result.document, 'listItem')).toHaveLength(1);
      expect(findAll(result.document, 'block')).toHaveLength(1);
      expect(
        result.document.children.map((child) => {
          if (child.children) {
            return [child.type, [child.children.map((c) => c.type)]];
          }
          return child.type;
        }),
      ).toMatchInlineSnapshot(`
        Array [
          "block",
          Array [
            "list",
            Array [
              Array [
                "listItem",
              ],
            ],
          ],
        ]
      `);
    });

    it('split nodes when have more than 1 image and nested', async () => {
      const html = `
        <ul>
          <li>
            <div>
              <ul>
                <li><img src="./ul1-img.png" alt>item 2</li>
              </ul>
            </div>
          </li>
          <li><img src="./ul3-img.png"><img src="./ul4-img.png" alt>item 2</li>
        </ul>
      `;

      const result = await htmlToStructuredText(html, {
        preprocess: liftImages,
        handlers: {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          img: async (createNode, node, context) => {
            // In a real scenario you would upload the image to Dato and get back an id.
            const item = '123';
            return createNode('block', {
              item,
            });
          },
        },
      });

      expect(validate(result).valid).toBeTruthy();
      expect(findAll(result.document, 'list')).toHaveLength(3);
      expect(findAll(result.document, 'listItem')).toHaveLength(3);
      expect(findAll(result.document, 'block')).toHaveLength(3);
      expect(
        result.document.children.map((child) => {
          if (child.children) {
            return [child.type, [child.children.map((c) => c.type)]];
          }
          return child.type;
        }),
      ).toMatchInlineSnapshot(`
        Array [
          "block",
          Array [
            "list",
            Array [
              Array [
                "listItem",
              ],
            ],
          ],
          "block",
          "block",
          Array [
            "list",
            Array [
              Array [
                "listItem",
              ],
            ],
          ],
        ]
      `);
    });

    it('lift up nodes', async () => {
      const html = `
      <ul>
        <li>item 1</li>
        <li><div><img src="./img.png" alt>item 2</div></li>
        <li>item 3</li>
      </ul>
      `;
      const result = await htmlToStructuredText(html, {
        preprocess: (tree) => {
          visit(tree, (node, index, parents) => {
            if (node.tagName === 'img' && parents.length > 1) {
              const parent = parents[parents.length - 1];
              tree.children.push(node);
              parent.children.splice(index, 1);
              return [CONTINUE, index];
            }
          });
        },
        handlers: {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          img: async (createNode, node, context) => {
            // In a real scenario you would upload the image to Dato and get back an id.
            const item = '123';
            return createNode('block', {
              item,
            });
          },
        },
      });

      expect(validate(result).valid).toBeTruthy();
      expect(result.document.children.map((node) => node.type))
        .toMatchInlineSnapshot(`
              Array [
                "list",
                "block",
              ]
          `);
    });
  });
});

describe('preprocessors', () => {
  describe('Google Docs', () => {
    const googleDocsToStructuredText = (html: string, options: Options) =>
      htmlToStructuredText(html, {
        ...options,
        preprocess: googleDocsPreprocessor,
      });

    it('detects a Google Doc and remove proprietary tag', async () => {
      const html = `
      <meta charset="utf-8" /><b
        style="font-weight: normal"
        id="docs-internal-guid-c793557e-7fff-c5c5-a52b-0abb9f4c028a"
        ><p>dato</p>
        <b
        style="font-weight: normal"
        id="docs-internal-guid-c793557e-7fff-c5c5-a52b-0abb9f4c028b"
        ><p>dato2</p>
      `;

      const result = await googleDocsToStructuredText(html);
      expect(validate(result).valid).toBeTruthy();
      expect(findAll(result.document, 'b')).toHaveLength(0);
      expect(findAll(result.document, 'meta')).toHaveLength(0);
      const paragraphs = findAll(result.document, 'paragraph');
      expect(paragraphs).toHaveLength(2);
      expect(paragraphs.map((p) => find(p, 'span').value).join(',')).toBe(
        'dato,dato2',
      );
    });

    it('converts span with inline styles to equivalent nested tags /1', async () => {
      // eslint-disable-next-line no-useless-escape
      const html = `
        <meta charset="utf-8">
        <span style="font-weight:700;font-style:normal" id="docs-internal-guid-66c5a8a6-7fff-9224-fa8c-424e47353bc6">uno</span>
        <span style="font-weight:400;font-style:normal">due</span>
        <span style="font-weight:700;font-style:normal">tre</span>
        <span style="font-weight:400;font-style:normal">quattro</span>
      `;
      const result = await googleDocsToStructuredText(html);
      const spans: Span[] = findAll(result.document, 'span');
      expect(spans).toHaveLength(7);
      expect(spans.map((span) => span.marks)).toEqual([
        ['strong'],
        undefined,
        undefined,
        undefined,
        ['strong'],
        undefined,
        undefined,
      ]);
    });

    it('converts span with inline styles to equivalent nested tags /2', async () => {
      const html = `
      <meta charset="utf-8" /><b
        style="font-weight: normal"
        id="docs-internal-guid-c793557e-7fff-c5c5-a52b-0abb9f4c028a"
        ><p>
          <span style="font-weight: 600; font-style:italic ;text-decoration: underline">
            dato
          </span>
        </p>
      `;

      const result = await googleDocsToStructuredText(html);
      expect(validate(result).valid).toBeTruthy();
      expect(findAll(result.document, 'b')).toHaveLength(0);
      expect(findAll(result.document, 'meta')).toHaveLength(0);
      expect(findAll(result.document, 'paragraph')).toHaveLength(1);
      const spans = findAll(result.document, 'span');
      expect(spans).toHaveLength(1);
      expect(spans[0].marks).toEqual(['strong', 'emphasis', 'underline']);
    });

    it('preserves nested tags', async () => {
      const html = `
      <meta charset="utf-8" /><b
        style="font-weight: normal"
        id="docs-internal-guid-c793557e-7fff-c5c5-a52b-0abb9f4c028a"
        ><p>
          <span style="font-weight: bold;">
            <strong>dato</strong>
          </span>
        </p>
      `;

      const result = await googleDocsToStructuredText(html);
      expect(validate(result).valid).toBeTruthy();
      expect(findAll(result.document, 'b')).toHaveLength(0);
      expect(findAll(result.document, 'meta')).toHaveLength(0);
      expect(findAll(result.document, 'paragraph')).toHaveLength(1);
      const spans = findAll(result.document, 'span');
      expect(spans).toHaveLength(1);
      expect(spans[0].marks).toEqual(['strong']);
    });
  });
});
