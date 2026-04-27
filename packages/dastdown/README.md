# `datocms-structured-text-dastdown`

Lossless textual serialization for [DatoCMS Structured Text (`dast`)](https://www.datocms.com/docs/structured-text/dast) documents, with a parser and a serializer.

`dastdown` is a markdown-flavored format that round-trips through `dast` without losing information. It exists so you can do programmatic edits to structured text via plain string manipulation (search/replace, regex, diff/merge) instead of walking the AST.

The full grammar is documented in [`SPEC.md`](./SPEC.md).

## When to use it

Best for **text-heavy content** (articles, docs, book chapters) where edits are textual and may cross node boundaries: bulk find/replace, regex refactors, LLM rewrites, meaningful `git diff`s.

Not for landing pages made of opaque blocks. Referenced blocks stay opaque — `dastdown` only lets you move, duplicate, or remove them.

## Installation

```sh
npm install datocms-structured-text-dastdown
```

## At a glance

```js
import { parse, serialize } from 'datocms-structured-text-dastdown';

// 1. fetch the record and turn its structured text field into dastdown
const record = await client.items.find('article-id');
const text = serialize(record.body);

// → # Title
//
//   A paragraph about Acme Corp with **strong** text and a [link](https://example.com).
//
//   > A quote.
//   {attribution="Anon"}
//
//   <block id="1234"/>

// 2. edit as plain text — search/replace, regex, diff/merge, LLM rewrite, …
const edited = text
  .replace(/Acme Corp/g, '**Acme Inc.**') // rename + bold every occurrence
  .replace(/^# (.+)$/m, '# $1 (2026 edition)'); // tweak the H1

// 3. parse back to dast and push the update
await client.items.update('article-id', { body: parse(edited) });
```

### Round-trip with the original document

When you fetch a record with `?nested=true`, blocks come back as full item objects. Pass that document as the second argument to `parse` and the result keeps both the original static type and the original block items — `parse` just looks up each `<block id="…"/>` in the original by id and re-attaches the full object:

```ts
import { parse, serialize } from 'datocms-structured-text-dastdown';

const cur = await client.items.find<Schema.Article>('article-id', {
  nested: true,
});
const edited = serialize(cur.body).replace(/Acme Corp/g, '**Acme Inc.**');

const body = parse(edited, cur.body);
//    ^? StructuredTextFieldValueInNestedResponse<Schema.X, Schema.Y> | null
//    every untouched block/inlineBlock keeps its original `item` (same reference).

await client.items.update<Schema.Article>('article-id', { body });
```

This makes dastdown safe for prose-level edits even when blocks carry data the format cannot represent. If the edited text references an id that isn't in the original, `parse` throws — the signal that the block needs to be created via the regular CMA flow rather than through dastdown.

## Format cheat-sheet

| Construct       | Syntax                                    |
| --------------- | ----------------------------------------- |
| Heading         | `# H1` … `###### H6`                      |
| Paragraph style | `{style="lead"}` on the line after        |
| Bullet list     | `- item`                                  |
| Numbered list   | `1. item` (numbers are not semantic)      |
| Blockquote      | `> line` plus `{attribution="…"}` trailer |
| Code block      | ` ```lang ` … ` ``` ` (`{highlight=…}`)   |
| Thematic break  | `---`                                     |
| Block reference | `<block id="…"/>` (root-level only)       |
| Strong          | `**text**`                                |
| Emphasis        | `*text*`                                  |
| Code            | `` `text` ``                              |
| Strikethrough   | `~~text~~`                                |
| Highlight       | `==text==`                                |
| Underline       | `++text++`                                |
| Custom mark     | `<m k="footnote-ref">text</m>`            |
| Link            | `[label](url){meta="…"}`                  |
| Item link       | `[label](dato:item/123){meta="…"}`        |
| Inline item     | `<inlineItem id="…"/>`                    |
| Inline block    | `<inlineBlock id="…"/>`                   |
| Hard line break | `<br/>` inside a span                     |

Marks nest in canonical outer-to-inner order: `highlight → strikethrough → underline → strong → emphasis → code`, with custom marks innermost in alphabetical order.

## API

### `parse(input, original?)`

```ts
parse(input: string | null | undefined): Document | null;
parse<B, IB>(
  input: string | null | undefined,
  original: Document<B, IB> | null | undefined,
): Document<B, IB> | null;
```

Parses a `dastdown` source string into a `dast` document.

- `null` / `undefined` input → `null` (so the return type matches `StructuredTextFieldValue` from `@datocms/cma-client` exactly).
- `''` or whitespace-only string → a document with a single empty paragraph.
- Otherwise → the parsed document, validated against the `dast` schema.

By default, `block` / `inlineBlock` / `inlineItem` / `itemLink` references come back with their `item` field as a string id, since `dastdown` only encodes ids on the wire.

If a second argument is passed, each parsed `block` / `inlineBlock` is rehydrated by looking up its id in `original` and reusing the original `item` object. The return type follows `Document<B, IB>`, so a `parse(serialize(doc), doc)` round-trip preserves both static types and the original block items (e.g. full `BlockInNestedResponse<…>` objects from a `?nested=true` fetch). A serialized id that isn't present in `original` throws a `DastdownParseError`.

If the input is malformed, `parse` throws a `DastdownParseError` carrying `line` and `column` info:

```js
import { parse, DastdownParseError } from 'datocms-structured-text-dastdown';

try {
  parse('####### too many hashes');
} catch (err) {
  if (err instanceof DastdownParseError) {
    console.log(err.line, err.column, err.message);
  }
}
```

### `serialize(document)`

```ts
type SerializableBlockId = string | { id: string };

serialize<
  B extends SerializableBlockId = string,
  IB extends SerializableBlockId = string
>(document: Document<B, IB> | null | undefined): string
```

Serializes a `dast` document into a `dastdown` string.

- `null` / `undefined` → `''`.
- A document whose only content is an empty paragraph → `''` (so `serialize(parse(''))` round-trips).
- Any other invalid document → throws.

The signature accepts both the plain field-value shape (block items as string ids) and the `?nested=true` response shape (block items as full record-like objects). When `item` is an object, its `.id` is used.

```js
import { serialize } from 'datocms-structured-text-dastdown';

// works with plain ids:
serialize({
  schema: 'dast',
  document: {
    type: 'root',
    children: [{ type: 'block', item: 'abc-123' }],
  },
});
// → '<block id="abc-123"/>\n'

// works with nested-response items too — only `id` is read:
serialize({
  schema: 'dast',
  document: {
    type: 'root',
    children: [
      { type: 'block', item: { id: 'abc-123' /* ...rest of Item */ } },
    ],
  },
});
// → '<block id="abc-123"/>\n'
```

The request shape (where new blocks may not yet have an id) is intentionally **not** supported — there is no way to render a reference to a block that has no id.

### `canonicalize(document)`

```ts
canonicalize<B, IB>(document: Document<B, IB>): Document<B, IB>
```

Returns a structurally normalized copy of the document. It does not touch block items; only spans and marks are rewritten:

- Adjacent spans with identical mark sets are coalesced.
- Empty spans are dropped (except when removing them would leave a parent paragraph/heading/link with no children).
- Mark order is sorted into the canonical outer-to-inner sequence; custom marks are placed innermost in alphabetical order.

Round-trip property:

```js
import {
  parse,
  serialize,
  canonicalize,
} from 'datocms-structured-text-dastdown';

parse(serialize(d)); // ≡ canonicalize(d)
```

### `DastdownParseError`

Thrown by `parse` on malformed input. Exposes `line` (1-indexed) and `column` (1-indexed) properties.

## Round-trip semantics

| `text`               | `parse(text)`            | `serialize(parse(text))` |
| -------------------- | ------------------------ | ------------------------ |
| `null` / `undefined` | `null`                   | `''`                     |
| `''` / whitespace    | empty paragraph document | `''`                     |
| any valid `dastdown` | a `dast` document        | the same text            |

For two documents `d1` and `d2`:

- `parse(serialize(d)) ≡ canonicalize(d)` (block items collapse to string ids)
- `parse(serialize(d), d) ≡ canonicalize(d)` with original block items restored, type preserved
- `serialize(parse(text)) ≡ text` after one canonicalization pass

## Why not CommonMark?

`dastdown` extends markdown with constructs that vanilla CommonMark cannot represent: `==highlight==`, `++underline++`, `{attribute="trailer"}` on blocks, and self-closing XML tags for opaque references. It is not designed to be rendered by a generic markdown pipeline; for that, parse to `dast` and use one of the `to-html-string` / `to-dom-nodes` renderers.
