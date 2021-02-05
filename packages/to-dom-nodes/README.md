# datocms-structured-text-to-dom-nodes

DOM nodes renderer for the DatoCMS Structured Text field type. To be used inside the browser, as it uses `document.createElement`.

## Installation

Using [npm](http://npmjs.org/):

```sh
npm install datocms-structured-text-to-dom-nodes
```

Using [yarn](https://yarnpkg.com/):

```sh
yarn add datocms-structured-text-to-dom-nodes
```

## Usage

```javascript
import { render } from 'datocms-structured-text-to-dom-nodes';

let nodes = render({
  schema: 'dast',
  document: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'span',
            value: 'Hello world!',
          },
        ],
      },
    ],
  },
});

console.log(nodes.map((node) => node.outerHTML)); // -> ["<p>Hello world!</p>"]

nodes = render({
  type: 'root',
  children: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'span',
          value: 'Hello',
          marks: ['strong'],
        },
        {
          type: 'span',
          value: ' world!',
          marks: ['underline'],
        },
      ],
    },
  ],
});

console.log(nodes.map((node) => node.outerHTML)); // -> ["<p><strong>Hello</strong><u> world!</u></p>"]
```

You can pass custom renderers for nodes and text as optional parameters like so:

```javascript
import { render, renderRule } from 'datocms-structured-text-to-dom-nodes';
import { isHeading } from 'datocms-structured-text-utils';

const structuredText = {
  type: 'root',
  children: [
    {
      type: 'heading',
      level: 1,
      content: [
        {
          type: 'span',
          value: 'Hello world!',
        },
      ],
    },
  ],
};

const options = {
  renderText: (text) => text.replace(/Hello/, 'Howdy'),
  customRules: [
    renderRule(
      isHeading,
      ({ adapter: { renderNode }, node, children, key }) => {
        return renderNode(`h${node.level + 1}`, { key }, children);
      },
    ),
  ],
};

render(document, options);
// -> [<h2>Howdy world!</h2>]
```

Last, but not least, you can pass custom renderers for `itemLink`, `inlineItem`, `block` as optional parameters like so:

```javascript
import { render } from 'datocms-structured-text-to-dom-nodes';

const graphqlResponse = {
  value: {
    schema: 'dast',
    document: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'span',
              value: 'A ',
            },
            {
              type: 'itemLink',
              item: '344312',
              children: [
                {
                  type: 'span',
                  value: 'record hyperlink',
                },
              ],
            },
            {
              type: 'span',
              value: ' and an inline record: ',
            },
            {
              type: 'inlineItem',
              item: '344312',
            },
          ],
        },
        {
          type: 'block',
          item: '812394',
        },
      ],
    },
  },
  blocks: [
    {
      id: '812394',
      image: { url: 'http://www.datocms-assets.com/1312/image.png' },
    },
  ],
  links: [{ id: '344312', title: 'Foo', slug: 'foo' }],
};

const options = {
  renderBlock({ record, adapter: { renderNode } }) {
    return renderNode('figure', {}, renderNode('img', { src: record.url }));
  },
  renderInlineRecord({ record, adapter: { renderNode } }) {
    return renderNode('a', { href: `/blog/${record.slug}` }, record.title);
  },
  renderLinkToRecord({ record, children, adapter: { renderNode } }) {
    return renderNode('a', { href: `/blog/${record.slug}` }, children);
  },
};

render(document, options);
// -> [
//      <p>A <a href="/blog/foo">record hyperlink</a> and an inline record: <a href="/blog/foo">Foo</a></p>,
//      <figure><img src="http://www.datocms-assets.com/1312/image.png" /></figure>
//    ]
```
