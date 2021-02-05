# datocms-structured-text-to-plain-text

Plain text renderer for the Structured Text document.

## Installation

Using [npm](http://npmjs.org/):

```sh
npm install datocms-structured-text-to-plain-text
```

Using [yarn](https://yarnpkg.com/):

```sh
yarn add datocms-structured-text-to-plain-text
```

## Usage

```javascript
import { render } from 'datocms-structured-text-to-plain-text';

const structuredText = {
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

render(structuredText); // -> "This is a title!"
```

You can also pass custom renderers for `itemLink`, `inlineItem`, `block` as optional parameters like so:

```javascript
import { render } from 'datocms-structured-text-to-plain-text';

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
  renderBlock({ record }) {
    return `[Image ${record.image.url}]`;
  },
  renderInlineRecord({ record, adapter: { renderNode } }) {
    return `[Inline ${record.slug}]${children}[/Inline]`;
  },
  renderLinkToRecord({ record, children, adapter: { renderNode } }) {
    return `[Link to ${record.slug}]${children}[/Link]`;
  },
};

render(document, options);
// -> A [Link to foo]record hyperlink[/Link] and an inline record: [Inline foo]Foo[/Inline]
//    [Image http://www.datocms-assets.com/1312/image.png]
```
