import { parseHtml } from '../src/lib/parse.node';

describe('Node Parser', () => {
  it('works', () => {
    expect(parseHtml('<div>hello</div>')).toMatchInlineSnapshot(`
      Object {
        "children": Array [
          Object {
            "children": Array [
              Object {
                "children": Array [],
                "properties": Object {},
                "tagName": "head",
                "type": "element",
              },
              Object {
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "text",
                        "value": "hello",
                      },
                    ],
                    "properties": Object {},
                    "tagName": "div",
                    "type": "element",
                  },
                ],
                "properties": Object {},
                "tagName": "body",
                "type": "element",
              },
            ],
            "properties": Object {},
            "tagName": "html",
            "type": "element",
          },
        ],
        "data": Object {
          "quirksMode": true,
        },
        "type": "root",
      }
    `);
  });
});
