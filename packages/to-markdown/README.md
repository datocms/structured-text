![Node.js CI](https://github.com/datocms/structured-text/workflows/Node.js%20CI/badge.svg)

# datocms-structured-text-to-markdown

Markdown renderer for the DatoCMS Structured Text field type.

## Installation

Using [npm](http://npmjs.org/):

```sh
npm install datocms-structured-text-to-markdown
```

Using [yarn](https://yarnpkg.com/):

```sh
yarn add datocms-structured-text-to-markdown
```

## Usage

```javascript
import { render } from 'datocms-structured-text-to-markdown';

render({
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
            value: 'Hello world!',
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'span',
            value: 'This is a paragraph.',
          },
        ],
      },
    ],
  },
});
// -> # Hello world!
//
//    This is a paragraph.
```

## Supported Markdown Features

The renderer supports all DatoCMS Structured Text nodes and converts them to CommonMark-compatible Markdown:

### Block Nodes

- **Headings**: `# H1` through `###### H6`
- **Paragraphs**: Plain text with double newlines
- **Lists**: Both bulleted (`-`) and numbered (`1.`) lists with nested support
- **Blockquotes**: Lines prefixed with `>`
- **Code blocks**: Fenced code blocks with language support
- **Thematic breaks**: Horizontal rules (`---`)

### Inline Formatting

- **Strong**: `**bold**`
- **Emphasis**: `*italic*`
- **Code**: `` `code` ``
- **Strikethrough**: `~~text~~`
- **Highlight**: `==text==` (extended Markdown)
- **Underline**: `<u>text</u>` (HTML fallback, no native Markdown)

### Links

- **Regular links**: `[text](url)`
- **Record links**: Custom rendering via `renderLinkToRecord`

## Behavior Notes

- **Escaping strategy**: `renderText` escapes `` \`*_{}[]()#+|<> `` to avoid accidental formatting or unintended HTML. For bespoke sanitization, supply a custom `renderText` implementation.
- **Ordered list markers**: Every numbered list item is rendered as `1.`. CommonMark parsers expand these into the correct numeric sequence automatically and this keeps the output stable even when items are reordered.
- **Blockquote attribution**: When a blockquote contains an `attribution` field, the renderer appends a final line formatted as `— Author`. This mirrors the DOM renderer's output but is not part of the Markdown core spec.

## Error Handling

The renderer surfaces meaningful `RenderError` instances when required data is missing:

- `inlineItem` nodes throw if you provide `renderInlineRecord` but the requested record is not present in `.links`. Without the handler, the node is skipped.
- `itemLink` nodes behave the same way: supplying `renderLinkToRecord` without the matching record raises, while omitting the handler falls back to the plain link text.
- `block` and `inlineBlock` nodes require both a renderer and a matching record. Missing renderers make the node render as empty; missing records raise.

Handle these errors upstream by passing the complete GraphQL response or adjusting your custom render callbacks.

## Advanced Usage

### Custom Rendering

You can pass custom renderers for nodes and text:

```javascript
import { render, renderNodeRule } from 'datocms-structured-text-to-markdown';
import { isHeading } from 'datocms-structured-text-utils';

const options = {
  renderText: (text) => text.toUpperCase(),
  customNodeRules: [
    renderNodeRule(
      isHeading,
      ({ node, children, adapter: { renderFragment } }) => {
        // Custom heading with decoration
        return renderFragment([
          `${'='.repeat(node.level)} `,
          ...(children || []),
          '\n\n',
        ]);
      },
    ),
  ],
};

render(document, options);
```

### Rendering DatoCMS records and blocks

You can pass custom renderers for `itemLink`, `inlineItem`, `block`, and `inlineBlock` nodes:

```javascript
import { render } from 'datocms-structured-text-to-markdown';

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
              value: 'Check out ',
            },
            {
              type: 'itemLink',
              item: '123',
              children: [
                {
                  type: 'span',
                  value: 'this article',
                },
              ],
            },
            {
              type: 'span',
              value: ' and ',
            },
            {
              type: 'inlineItem',
              item: '123',
            },
            {
              type: 'span',
              value: '!',
            },
          ],
        },
        {
          type: 'block',
          item: '456',
        },
      ],
    },
  },
  blocks: [
    {
      id: '456',
      __typename: 'CalloutRecord',
      style: 'positive',
      title: '🛠️ Block and Structured Text utilities',
      content:
        'We provide many utility functions to help you work with blocks and structured text nodes effectively.',
    },
  ],
  links: [
    {
      id: '123',
      __typename: 'BlogPostRecord',
      title: 'My First Post',
      slug: 'my-first-post',
    },
  ],
};

const options = {
  renderInlineRecord: ({ record }) => {
    switch (record.__typename) {
      case 'BlogPostRecord':
        return `[${record.title}](/blog/${record.slug})`;
      default:
        return null;
    }
  },
  renderLinkToRecord: ({ record, children }) => {
    switch (record.__typename) {
      case 'BlogPostRecord':
        return `[${children}](/blog/${record.slug})`;
      default:
        return null;
    }
  },
  renderBlock: ({ record }) => {
    switch (record.__typename) {
      case 'CalloutRecord': {
        // GitHub-flavored Markdown supports callout syntax
        const calloutType = record.style.toUpperCase();
        return `> [!${calloutType}] ${record.title}\n> ${record.content}\n\n`;
      }
      default:
        return null;
    }
  },
};

render(graphqlResponse, options);
// -> Check out [this article](/blog/my-first-post) and [My First Post](/blog/my-first-post)!
//
//    > [!POSITIVE] 🛠️ Block and Structured Text utilities
//    > We provide many utility functions to help you work with blocks and structured text nodes effectively.
```

## API

### `render(structuredText, options?)`

Converts a Structured Text document to a Markdown string.

#### Parameters

- `structuredText`: The Structured Text document (can be a full GraphQL response or a plain document)
- `options` (optional): Rendering options
  - `customNodeRules`: Array of custom node rendering rules
  - `customMarkRules`: Array of custom mark rendering rules
  - `renderInlineRecord`: Function to render `inlineItem` nodes
  - `renderLinkToRecord`: Function to render `itemLink` nodes
  - `renderBlock`: Function to render `block` nodes
  - `renderInlineBlock`: Function to render `inlineBlock` nodes
  - `renderText`: Function to customize text rendering
  - `renderNode`: Function to customize node rendering
  - `renderFragment`: Function to customize fragment rendering

#### Returns

A Markdown string, or `null` if the input is empty.
