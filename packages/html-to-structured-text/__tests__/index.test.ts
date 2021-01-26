/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { parse5ToDast, Settings } from '../src';
import parse5 from 'parse5';
import { allowedChildren, validate } from 'datocms-structured-text-utils';
import { findAll, find } from 'unist-utils-core';

function htmlToDast(html: string, settings: Settings = {}) {
  return parse5ToDast(
    parse5.parse(html, {
      sourceCodeLocationInfo: true,
    }),
    settings,
  );
}

describe('toDast', () => {
  it('works with empty document', async () => {
    const html = '';
    const dast = await htmlToDast(html);
    expect(validate(dast).valid).toBeTruthy();
    expect(dast).toMatchInlineSnapshot(`
      Object {
        "children": Array [],
        "type": "root",
      }
    `);
  });

  it('ignores doctype and HTML comments', async () => {
    const html = `<!doctype html> <!-- <p>test</p> -->`;
    const dast = await htmlToDast(html);
    expect(validate(dast).valid).toBeTruthy();
    expect(dast).toMatchInlineSnapshot(`
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

    const dast = await htmlToDast(html);
    expect(validate(dast).valid).toBeTruthy();
    expect(dast).toMatchInlineSnapshot(`
      Object {
        "children": Array [],
        "type": "root",
      }
    `);
  });

  describe('handlers', () => {
    it('can return an array of nodes', async () => {
      const html = `
        <p>twice</p>
      `;

      const dast = await htmlToDast(html, {
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
      expect(validate(dast).valid).toBeTruthy();
      expect(findAll(dast, 'paragraph')).toHaveLength(2);
      expect(findAll(dast, 'span')).toHaveLength(4);
    });

    it('can return an array of promises', async () => {
      const html = `
        <p>twice</p>
      `;
      const dast = await htmlToDast(html, {
        handlers: {
          p: (createNode, node, context) => {
            return [
              context.defaultHandlers.p(createNode, node, context),
              context.defaultHandlers.p(createNode, node, context),
            ];
          },
        },
      });
      expect(validate(dast).valid).toBeTruthy();
      expect(findAll(dast, 'paragraph')).toHaveLength(2);
      expect(findAll(dast, 'span')).toHaveLength(2);
    });

    describe('custom (user provided)', () => {
      it('can register custom handlers', async () => {
        const html = `
          <unknown>span</unknown>
        <p>already wrapped</p>
        needs wrapping
      `;
        const dast = await htmlToDast(html, {
          handlers: {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            unknown: (createNode, node, context) => {
              return createNode('span', {
                value: 'custom',
              });
            },
          },
        });
        expect(validate(dast).valid).toBeTruthy();
        const spans = findAll(dast, 'span');
        expect(spans).toHaveLength(3);
        expect(spans[0].value).toBe('custom');
        const paragraphs = findAll(dast, 'paragraph');
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
        const dast = await htmlToDast(html, {
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
        expect(validate(dast).valid).toBeTruthy();
        expect(find(dast, 'span').value).toBe('custom');
      });

      it('can override default handlers', async () => {
        const html = `
          <blockquote>override</blockquote>
          <p>regular paragraph</p>
      `;
        const dast = await htmlToDast(html, {
          handlers: {
            blockquote: async (createNode, node, context) => {
              // turn a blockquote into a paragraph
              return context.handlers.p(createNode, node, context);
            },
          },
        });
        expect(validate(dast).valid).toBeTruthy();
        expect(find(dast, 'blockquote')).toBeFalsy();
        const paragraphs = findAll(dast, 'paragraph');
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
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(dast.children.map((child) => child.type)).toMatchInlineSnapshot(`
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
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();

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
        expect(validate(dast).valid).toBeTruthy();
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
        expect(validate(dast).valid).toBeTruthy();
        expect(dast.children).toMatchInlineSnapshot(`
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
        // This is how Hast parses them.

        const html = `
          <p>
            [simple text]
            <div>[separate paragraph]</div>
          </p>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(dast.children).toMatchInlineSnapshot(`
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
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(dast.children[0].type).toBe('heading');
        expect(dast.children[0].children[0].type).toBe('span');
      });

      it('ignores invalid heading numbers', async () => {
        const html = `
          <h7>needs wrapping</h7>
          <p>hello</p>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(dast.children.map((child) => child.type)).toMatchInlineSnapshot(`
          Array [
            "paragraph",
            "paragraph",
          ]
        `);
        expect(findAll(dast, 'heading')).toHaveLength(0);
      });

      it('ignores invalid children', async () => {
        const html = `
          <h1><p>p not allowed inside h1</p></h1>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(findAll(dast, 'paragraph')).toHaveLength(0);
      });

      it('allows link as children', async () => {
        const html = `
          <h1>span <a href="#">link</a></h1>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(dast.children[0].children).toMatchInlineSnapshot(`
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
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(findAll(dast, 'heading')).toHaveLength(0);
      });
    });

    describe('code', () => {
      it('creates valid code node', async () => {
        const html = `
          <pre><code class="language-html"><span class="hljs-tag">&lt;<span class="hljs-name">import</span> <span class="hljs-attr">src</span>=<span class="hljs-string">"file.html"</span> /&gt;</span></code></pre>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(dast.children[0]).toMatchInlineSnapshot(`
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
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(find(dast, 'paragraph')).toBeTruthy();
        expect(findAll(dast, 'code')).toHaveLength(0);
        expect(findAll(dast, 'span')[0]).toMatchInlineSnapshot(`
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
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(findAll(dast, 'code')).toHaveLength(1);
        expect(findAll(dast, 'code')[0]).toMatchInlineSnapshot(`
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
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(findAll(dast, 'code')).toHaveLength(1);
        expect(findAll(dast, 'code')[0].language).toBeFalsy();
      });
    });

    describe('blockquote', () => {
      it('creates valid blockquote node', async () => {
        const html = `
          <blockquote>1</blockquote>
          <blockquote><span>2</span></blockquote>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(dast.children.map((child) => child.type)).toMatchInlineSnapshot(`
          Array [
            "blockquote",
            "blockquote",
          ]
        `);
        expect(dast.children[0]).toMatchInlineSnapshot(`
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
    });

    describe('list', () => {
      it('creates valid list', async () => {
        const html = `
          <ul><li>test</li></ul>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
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
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(
          find(dast, 'list').children.every(
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
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(find(find(dast, 'list'), 'list')).toBeTruthy();
      });

      it('converts nested blockquote to text', async () => {
        const html = `
          <ul>
            <li><blockquote>1</blockquote></li>
          </ul>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(findAll(dast, 'blockquote')).toHaveLength(0);
        expect(find(dast, 'span').value).toBe('1');
      });

      it('converts nested heading to text', async () => {
        const html = `
          <ul>
            <li><h1>1</h1></li>
          </ul>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(findAll(dast, 'h1')).toHaveLength(0);
        expect(find(dast, 'span').value).toBe('1');
      });

      it('converts nested code to text', async () => {
        const html = `
          <ul>
            <li><code>1</code></li>
          </ul>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(findAll(dast, 'code')).toHaveLength(0);
        expect(find(dast, 'span').value).toBe('1');
      });

      it('supports nested and/or unwrapped link', async () => {
        const html = `
          <ul>
            <li><a href="#">1</a>2</li>
            <a href="#">3</a>
          </ul>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(findAll(dast, 'link')).toHaveLength(2);
        const items = findAll(dast, 'listItem').map((listItem) =>
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

      it('convers nested invalid children', async () => {
        const html = `
          <ul>
            <li>1</li>
            <blockquote>2</blockquote>
            <code>3</code>
            <li>4</li>
            <ul><li>5</li></ul>
          </ul>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        const lists = findAll(dast, 'list');
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
    });

    describe('link', () => {
      it('is wrapped when top level', async () => {
        const html = `
          <a href="#">1</a>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(dast.children[0].type).toBe('paragraph');
        expect(find(find(dast, 'paragraph'), 'link')).toBeTruthy();
      });

      describe('when wrapping a heading', () => {
        it('lifts up heading to contain the link', async () => {
          const html = `
            <a href="#"><h1>1</h1>2</a>
          `;
          const dast = await htmlToDast(html);
          expect(validate(dast).valid).toBeTruthy();
          expect(dast.children[0].type).toBe('heading');
          expect(find(find(dast, 'heading'), 'link')).toBeTruthy();
          expect(find(find(dast, 'paragraph'), 'link')).toBeTruthy();
        });

        it('ignores heading when it is not allowed in the context (eg. list)', async () => {
          const html = `
            <ul><a href="#"><h1>1</h1>2</a></ul>
          `;
          const dast = await htmlToDast(html);
          expect(validate(dast).valid).toBeTruthy();
          expect(findAll(dast, 'heading')).toHaveLength(0);
        });
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
      };

      describe('converts tags to marks', () => {
        it.each(Object.keys(marksTags))(`%p`, async (tagName) => {
          const markName = marksTags[tagName];
          const html = `
          <p><${tagName}>${markName}</${tagName}></p>
        `;
          const dast = await htmlToDast(html);
          expect(validate(dast).valid).toBeTruthy();
          const span = find(dast, 'span');
          expect(span.marks).toBeTruthy();
          expect(span.marks).toContain(markName);
        });
      });

      it('collects marks when nesting nodes', async () => {
        const html = `
          <p><em>em<strong>strong-em<u>u-strong-em</u>strong-em</strong>em</em></p>
        `;
        const dast = await htmlToDast(html);
        expect(validate(dast).valid).toBeTruthy();
        expect(
          findAll(dast, 'span')
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
    });
  });

  describe('preprocessing', () => {
    it('allows users to transform the Hast tree', async () => {
      const html = `
        <p>heading</p>
      `;
      const dast = await htmlToDast(html, {
        preprocess: (tree) => {
          findAll(tree, (node) => {
            if (node.type === 'element' && node.tagName === 'p') {
              node.tagName = 'h1';
            }
          });
        },
      });
      expect(validate(dast).valid).toBeTruthy();
      expect(findAll(dast, 'paragraph')).toHaveLength(0);
      const headings = findAll(dast, 'heading');
      expect(headings).toHaveLength(1);
      expect(headings[0].level).toBe(1);
      expect(find(headings[0], 'span').value).toBe('heading');
    });

    it('split list with images', async () => {
      const html = `
      <ul>
        <li>item 1</li>
        <li><div><img src="./img.png" alt>item 2</div></li>
        <li>item 3</li>
      </ul>
      `;
      const dast = await htmlToDast(html, {
        preprocess: (tree) => {
          findAll(tree, (node, index, parent) => {
            if (node.tagName !== 'ul' && node.tagName !== 'ol') {
              return;
            }
            let i = 0;
            // Build up a new array of children where every element is either
            // a ul/ol with contiguous regular children or a node with images.
            //
            // Example:
            // When list items have images [ul, img, img, ul]
            // When there aren't images [ul] the list is equal to the original
            const splitChildren = [];
            // Insert list item to an existing or new list in splitChildren.
            function insertListItem(node, listItem) {
              if (splitChildren[i]) {
                // If we have a list add the current listItem to it.
                splitChildren[i].children.push(listItem);
              } else {
                splitChildren[i] = {
                  ...node,
                  children: [listItem],
                };
              }
            }

            node.children.forEach((listItem) => {
              const images = findAll(listItem, (node, index, parent) => {
                if (node.tagName !== 'img') {
                  return;
                }
                // Remove the image from the listItem.
                parent.children.splice(index, 1);
                return true;
              });
              if (images.length > 0) {
                insertListItem(node, listItem);
                // If we find images add new item to splitChildren.
                // This will split up the list.
                if (splitChildren.length > 0) {
                  i++;
                }
                splitChildren.push({
                  type: 'element',
                  tagName: 'div',
                  children: images,
                });
                i++;
              } else {
                insertListItem(node, listItem);
              }
            });

            if (splitChildren.length > 1) {
              parent.children[index] = {
                type: 'element',
                tagName: 'div',
                children: splitChildren,
              };
            }
          });
        },
        handlers: {
          img: async (createNode, node, context) => {
            // In a real scenario you would upload the image to Dato and get back an id.
            const item = '123';
            return createNode('block', {
              item,
            });
          },
        },
      });

      expect(validate(dast).valid).toBeTruthy();
      expect(findAll(dast, 'list')).toHaveLength(2);
      expect(findAll(dast, 'listItem')).toHaveLength(3);
      expect(findAll(dast, 'block')).toHaveLength(1);
    });

    it('lift up nodes', async () => {
      const html = `
      <ul>
        <li>item 1</li>
        <li><div><img src="./img.png" alt>item 2</div></li>
        <li>item 3</li>
      </ul>
      `;
      const dast = await htmlToDast(html, {
        preprocess: (tree) => {
          findAll(tree, (node, index, parent) => {
            if (node.tagName === 'img') {
              // Add the image to the root's children.
              tree.children.push(node);
              // remove the image from the parent's children array.
              parent.children.splice(index, 1);
              return;
            }
          });
        },
        handlers: {
          img: async (createNode, node, context) => {
            // In a real scenario you would upload the image to Dato and get back an id.
            const item = '123';
            return createNode('block', {
              item,
            });
          },
        },
      });

      expect(validate(dast).valid).toBeTruthy();
      expect(dast.children.map((node) => node.type)).toMatchInlineSnapshot(`
      Array [
        "list",
        "block",
      ]
    `);
    });
  });
});
