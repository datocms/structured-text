/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { richTextToStructuredText } from '../src';
import { allowedChildren, Span, validate } from 'datocms-structured-text-utils';

describe('contentful-to-structured-text', () => {
  it('works with empty document', async () => {
    const html = '';
    const result = await richTextToStructuredText(html);
    expect(validate(result).valid).toBeTruthy();
    expect(result).toMatchInlineSnapshot(`null`);
  });

  it('rejects invalid rich text documents', async () => {
    const html = '';
    const result = await richTextToStructuredText(html);
    expect(validate(result).valid).toBeTruthy();
    expect(result).toMatchInlineSnapshot(`null`);
  });

  describe('handlers', () => {
    it('can return an array of nodes', async () => {
      const html = `
        <p>twice</p>
      `;

      const result = await richTextToStructuredText(html, {
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
      const result = await richTextToStructuredText(html, {
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
        const result = await richTextToStructuredText(html, {
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
        const result = await richTextToStructuredText(html, {
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
        const result = await richTextToStructuredText(html, {
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
        const result = await richTextToStructuredText(html);
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

    describe('paragraph', () => {
      it('works', async () => {
        const html = `
          <p>simple paragraph</p>
          <article>
            <p>nested simple paragraph</p>
          </article>
        `;
        const result = await richTextToStructuredText(html);
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
        const html = `
          <p>
            <span>[simple text]</span>
            <span>[span becomes simple text]</span>
            <span>[span becomes simple text]</span>
          </p>
        `;
        const result = await richTextToStructuredText(html);
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
    });

    describe('heading', () => {
      it('wraps children when necessary', async () => {
        const html = `
          <h1>needs wrapping</h1>
        `;
        const result = await richTextToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].type).toBe('heading');
        expect(result.document.children[0].children[0].type).toBe('span');
      });

      it('allows link as children', async () => {
        const html = `
          <h1>span <a href="#">link</a></h1>
        `;
        const result = await richTextToStructuredText(html);
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
        const result = await richTextToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'heading')).toHaveLength(0);
      });

      it('when not allowed produces paragraphs', async () => {
        const html = `
          <h1>dato</h1>
        `;
        const result = await richTextToStructuredText(html, {
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
        const result = await richTextToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0]).toMatchInlineSnapshot(`
          Object {
            "code": "<import src=\\"file.html\\" />",
            "language": "html",
            "type": "code",
          }
        `);
      });

      it('when not allowed produces paragraphs', async () => {
        const html = `
          <code>let dato</code>
        `;
        const result = await richTextToStructuredText(html, {
          allowedBlocks: [],
        });
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'code')).toHaveLength(0);
        expect(findAll(result.document, 'paragraph')).toHaveLength(1);
        expect(find(result.document, 'span').value).toBe('let dato');
      });
    });

    describe('blockquote', () => {
      it('creates valid blockquote node', async () => {
        const html = `
          <blockquote>1</blockquote>
          <blockquote><span>2</span></blockquote>
        `;
        const result = await richTextToStructuredText(html);
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

      it('when not allowed produces paragraphs', async () => {
        const html = `
          <blockquote>dato</blockquote>
        `;
        const result = await richTextToStructuredText(html, {
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
        const result = await richTextToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].style).toBe('bulleted');
      });

      it('creates a numbered list from OL elements', async () => {
        const html = `
          <ol><li>test</li></ol>
        `;
        const result = await richTextToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].style).toBe('numbered');
      });

      it('supports nested lists', async () => {
        const html = `
          <ul>
            <li><ul><li>1</li></ul></li>
          </ul>
        `;
        const result = await richTextToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(find(find(result.document, 'list'), 'list')).toBeTruthy();
      });

      it('converts nested blockquote to text', async () => {
        const html = `
          <ul>
            <li><blockquote>1</blockquote></li>
          </ul>
        `;
        const result = await richTextToStructuredText(html);
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
        const result = await richTextToStructuredText(html);
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
        const result = await richTextToStructuredText(html);
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
        const result = await richTextToStructuredText(html);
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

      it('when not allowed produces paragraphs', async () => {
        const html = `
          <ul>
            <li>dato</li>
          </ul>
        `;
        const result = await richTextToStructuredText(html, {
          allowedBlocks: [],
        });
        expect(validate(result).valid).toBeTruthy();
        expect(findAll(result.document, 'list')).toHaveLength(0);
        expect(findAll(result.document, 'paragraph')).toHaveLength(1);
        expect(find(result.document, 'span').value).toBe('dato');
      });
    });

    describe('thematicBreak', () => {
      it('convert hr', async () => {
        const html = `
          <div>
            <hr>
            <blockquote>1<hr></blockquote>
          </div>
        `;
        const result = await richTextToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        const thematicBreaks = findAll(result.document, 'thematicBreak');
        expect(thematicBreaks).toHaveLength(1);
      });
    });

    describe('link', () => {
      // non credo che questo sia possibile con contentful
      it('is wrapped when top level', async () => {
        const html = `
          <a href="#">1</a>
        `;
        const result = await richTextToStructuredText(html);
        expect(validate(result).valid).toBeTruthy();
        expect(result.document.children[0].type).toBe('paragraph');
        expect(find(find(result.document, 'paragraph'), 'link')).toBeTruthy();
      });

      describe('when wrapping a heading', () => {
        it('lifts up heading to contain the link', async () => {
          const html = `
            <a href="#"><h1>1</h1>2</a>
          `;
          const result = await richTextToStructuredText(html);
          expect(validate(result).valid).toBeTruthy();
          expect(result.document.children[0].type).toBe('heading');
          expect(find(find(result.document, 'heading'), 'link')).toBeTruthy();
          expect(find(find(result.document, 'paragraph'), 'link')).toBeTruthy();
        });

        it('ignores heading when it is not allowed in the context (eg. list)', async () => {
          const html = `
            <ul><a href="#"><h1>1</h1>2</a></ul>
          `;
          const result = await richTextToStructuredText(html);
          expect(validate(result).valid).toBeTruthy();
          expect(findAll(result.document, 'heading')).toHaveLength(0);
        });
      });

      it('when not allowed produces paragraphs', async () => {
        const html = `
          <a href="#"><h1>dato</h1>2</a>
        `;
        const result = await richTextToStructuredText(html, {
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
        bold: 'strong',
        italic: 'emphasis',
        underline: 'underline',
        code: 'code',
      };

      describe('converts tags to marks', () => {
        it.each(Object.keys(marksTags))(`%p`, async (tagName) => {
          const markName = marksTags[tagName];
          const html = `
          <p><${tagName}>${markName}</${tagName}></p>
        `;
          const result = await richTextToStructuredText(html);
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
          const result = await richTextToStructuredText(html, {
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
        const result = await richTextToStructuredText(html);
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
          const html = `
            <p>To make it even easier to offer responsive, progressive images on your projects, we released a package called 
            <a href="https://github.com/datocms/react-datocms">
            <code>react-datocms</code></a> that exposes an <code>&lt;Image /&gt;</code> 
            component and pairs perfectly with the <code>responsiveImage</code> query.
            </p>`;
          const result = await richTextToStructuredText(html);
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
  });
});