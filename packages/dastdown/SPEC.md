# dastdown — format specification

> A lossless textual serialization of the DatoCMS Structured Text (`dast`)
> format, designed to enable programmatic editing through plain string
> manipulation (search/replace, regex, diff) without losing semantic
> information.

**Version:** 1.0
**Target:** the `dast` schema as defined in `datocms-structured-text-utils`

---

## 1. Goals and non-goals

### 1.1 Goals

- **Lossless with respect to the canonicalized dast model.** Every valid dast
  document can be serialized to dastdown and re-parsed into a semantically
  equivalent AST.
- **Textual ergonomics.** Textual content (paragraphs, headings, spans with
  marks, links) must be editable with standard tools (regex, search/replace,
  diff/merge) without rebuilding the AST.
- **Stable opaque tokens.** Nodes that reference external records (`block`,
  `inlineBlock`, `inlineItem`, `itemLink`) are syntactically isolated tokens
  that cannot be confused with text.
- **Round-trip idempotency.** `parse(serialize(d)) ≡ canonicalize(d)` for every
  dast document `d`.

### 1.2 Non-goals

- **CommonMark compatibility.** dastdown extends markdown with constructs a
  CommonMark parser doesn't recognize (`==`, `++`, attribute trailers, custom
  XML tags). It is not meant to be rendered directly by generic markdown
  pipelines.
- **Syntactic fidelity beyond semantics.** dastdown does not preserve arbitrary
  mark order, coalescible spans, empty spans, source positions, or cosmetic
  whitespace between blocks. None of this information lives in the dast model
  and it gets normalized away.
- **Editing the contents of referenced records.** Embedded DatoCMS records
  (block, inlineBlock, inlineItem, itemLink) stay opaque: their contents are
  edited through the records API, not through dastdown.

---

## 2. Reference model

dastdown is a surface syntax for the dast model, defined by the following
types:

- **Document:** `{ schema: 'dast', document: Root }`
- **Block-level:** `Root`, `Paragraph`, `Heading`, `List`, `ListItem`,
  `Blockquote`, `Code`, `Block`, `ThematicBreak`
- **Inline:** `Span`, `Link`, `ItemLink`, `InlineItem`, `InlineBlock`
- **Default marks:** `strong`, `code`, `emphasis`, `underline`,
  `strikethrough`, `highlight`
- **Custom marks:** any string registered via plugin
- **Custom style:** optional string on `Paragraph` and `Heading`
- **Meta:** `Array<{id: string, value: string}>` on `Link` and `ItemLink`

Structural constraints relevant to the parser:

- `Heading.level ∈ {1,2,3,4,5,6}`
- `List.style ∈ {'bulleted', 'numbered'}`
- `Code.highlight` is zero-indexed
- `Block` may appear only as a direct child of `Root`
- `Blockquote.children` admits only `Paragraph`
- `ListItem.children` admits only `Paragraph` or `List`
- `Link.children` and `ItemLink.children` admit only `Span`

---

## 3. Lexical conventions

### 3.1 Encoding

dastdown is UTF-8. Lines end with `\n` (line feed). Files SHOULD NOT include a
BOM.

### 3.2 Syntactic characters

The following characters carry syntactic meaning in at least one context:

```
* _ ~ = + ` # > - [ ] ( ) { } < > \ |
```

To insert any of them literally inside a `Span.value`, use a backslash escape:
`\*`, `\\`, `\<`, etc. A backslash before a non-syntactic character is itself
literal.

### 3.3 Attribute trailer

A common syntax used for structured metadata that has no natural place in
markdown:

```
{key1="value1" key2="value2" ...}
```

Rules:

- **Keys** are unquoted identifiers (`[a-zA-Z_][a-zA-Z0-9_-]*`), or quoted
  strings when they contain non-identifier characters.
- **Values** are always quoted with `"`. Backslash escapes inside follow JSON
  conventions: `\"`, `\\`, `\n`, `\t`, `\r`, `\u00XX`.
- Values may be arrays for specific attributes (`highlight=[0,2,4]`).
- Entries are separated by one or more spaces.
- Entry order is preserved during serialization but is not semantically
  meaningful (see §10).

### 3.4 Record identifiers

DatoCMS record IDs are arbitrary strings. dastdown treats them as opaque and
always wraps them in double quotes:

```
<block id="38945648"/>
<inlineItem id="some-uuid-v4-string"/>
```

---

## 4. Block-level syntax

Each block-level construct occupies one or more complete lines. Blank lines
separate consecutive blocks.

### 4.1 Paragraph

A run of non-empty lines that doesn't match any other construct is a paragraph.
The content is inline (see §5).

```
This is a paragraph that may
span multiple lines but counts
as a single paragraph.
```

A custom style is supplied via an attribute trailer on the line immediately
following the paragraph, on its own:

```
A lead paragraph.
{style="lead"}
```

### 4.2 Heading

One to six `#` followed by a space and the inline content. An optional style
trailer goes at the end of the same line.

```
# Heading level 1
## Heading level 2
###### Heading level 6
## Styled heading {style="display"}
```

`####### ...` (seven `#`) is a parse error.

### 4.3 List

Bulleted list: every list item starts with `- ` (hyphen and space).
Numbered list: every list item starts with `N. ` (an integer, dot, space). The
specific number is not semantically significant.

```
- first item
- second item

1. first ordered item
2. second ordered item
```

Multi-paragraph and nested lists: list-item content is indented by 2 spaces.

```
- First paragraph of the first item.

  Second paragraph of the same item.

  - Nested list
  - inside the first item

- First paragraph of the second item.
```

`ListItem` does not accept an attribute trailer (the dast model doesn't have
one).

### 4.4 Blockquote

Each blockquote line starts with `> ` (greater-than and space). The contents
admit only paragraphs (model constraint).

```
> A quote
> across two lines.
>
> A second paragraph
> of the same quote.
```

An optional attribution comes via a trailer on the line immediately following
the block, on its own:

```
> Be yourself; everyone else is taken.
{attribution="Oscar Wilde"}
```

### 4.5 Code

Backtick-fenced. The fence MUST be longer than the longest run of consecutive
backticks present in `code.code` (minimum three).

````
```lang {highlight=[0,2]}
code-block contents
```
````

`highlight` is zero-indexed (row 0 = first line). When absent, the AST field
is `undefined`.

### 4.6 Thematic break

A line containing exactly `---` (three hyphens), on a line of its own.

```
---
```

### 4.7 Block

A self-closing XML tag on a line of its own:

```
<block id="38945648"/>
```

`block` is allowed **only** as a direct child of `root`. A parser MUST reject
a `<block id="..."/>` that appears as a standalone line inside a list item, a
blockquote, or any other nested context.

---

## 5. Inline syntax

Inline content is a sequence of spans (optionally with marks), links,
itemLinks, inlineItems, and inlineBlocks. Concatenation follows source order.

### 5.1 Default-mark spans

| Mark            | Syntax       |
| --------------- | ------------ |
| `strong`        | `**text**`   |
| `emphasis`      | `*text*`     |
| `code`          | `` `text` `` |
| `strikethrough` | `~~text~~`   |
| `highlight`     | `==text==`   |
| `underline`     | `++text++`   |

A `Span` with no marks is just literal text (with escapes for syntactic
characters).

### 5.2 Mark combinations

Marks nest. The canonical nesting order, outer to inner, is:

```
highlight  →  strikethrough  →  underline  →  strong  →  emphasis  →  code
```

Example: `marks: ["strong", "emphasis", "highlight"]` serializes as
`==***text***==` (i.e. `== ** * text * ** ==`, shown spaced for readability).

Serialization always uses this order. Parsing flattens whatever nesting order
appears in the source into an unordered set of marks.

### 5.3 Custom marks

Any non-default mark is represented with the `<m>` tag:

```
<m k="footnote-ref">text</m>
```

Mixed marks (default + custom) combine through nesting, with default marks
always outer in canonical order:

```
**<m k="footnote-ref">bold text with custom mark</m>**
```

Multiple custom marks on the same span nest in alphabetical order for
determinism:

```
<m k="alpha"><m k="beta">text</m></m>
```

### 5.4 Link

Standard markdown syntax extended with an attribute trailer for `meta`:

```
[text](https://example.com)
[text](https://example.com){rel="nofollow" target="_blank"}
```

The URL is not normalized (it's a free-form string per the dast spec). Spaces
and `)` inside the URL must be percent-encoded or backslash-escaped.

The content between `[` and `]` is restricted to spans (optionally with
marks). InlineItem, inlineBlock, nested links, and itemLink are not allowed
inside a link (model constraint).

### 5.5 ItemLink

A link variant with a custom `dato:item/` scheme:

```
[text](dato:item/38945648)
[text](dato:item/38945648){rel="nofollow" target="_blank"}
```

Content is restricted to spans.

### 5.6 InlineItem

A self-closing inline XML tag:

```
text before <inlineItem id="74619345"/> text after
```

It carries no content. It can appear in any inline context allowed by
Paragraph and Heading (NOT inside Link or ItemLink — model constraint).

### 5.7 InlineBlock

A self-closing inline XML tag:

```
text before <inlineBlock id="1238455312"/> text after
```

Same positional rules as `inlineItem`.

### 5.8 Span-internal line break

`Span.value` may contain `\n`. In dastdown it's represented as `<br/>`:

```
first line<br/>second line of the same span
```

This is distinct from a textual `\n` inside a paragraph, which is just a line
wrap (managed by dastdown's layout with no semantic meaning).

---

## 6. Attribute trailer summary

| Node         | Attribute     | Syntax                                                | Position               |
| ------------ | ------------- | ----------------------------------------------------- | ---------------------- |
| `Heading`    | `style`       | `## Title {style="..."}`                              | end of heading line    |
| `Paragraph`  | `style`       | `{style="..."}` on its own line after the paragraph   | following line         |
| `Blockquote` | `attribution` | `{attribution="..."}` on its own line after the block | following line         |
| `Code`       | `highlight`   | ` ```lang {highlight=[0,2]} `                         | fence info-string      |
| `Link`       | `meta`        | `[x](url){k="v" ...}`                                 | after `(url)`          |
| `ItemLink`   | `meta`        | `[x](dato:item/ID){k="v" ...}`                        | after `(dato:item/ID)` |

**meta → attribute trailer convention:** every `MetaEntry {id, value}` becomes
an `id="value"` entry in the trailer, preserving array order. If `id` contains
non-identifier characters, it's quoted: `"some weird id"="val"`.

---

## 7. Escaping

Inside `Span.value`, the following characters MUST be backslash-prefixed when
they would otherwise trigger syntax:

```
* _ ~ = + ` [ ] ( ) { } < > \ #
```

A conformant parser MUST accept the escape of any ASCII character (even
non-syntactic ones): `\a` means `a`. This simplifies editing because callers
don't have to memorize the exact list.

Inside an attribute trailer's quoted values, JSON-like escapes apply: `\"`,
`\\`, `\n`, `\t`, `\r`, `\u00XX`.

Inside a fenced code block, **no escapes are active**: the contents are raw up
to the closing fence.

---

## 8. Canonical form and normalization

dastdown defines a **canonical form** for the dast document. Every parse
produces an AST in canonical form; every serialization applies the canonical
form before emitting.

The canonicalization rules are:

1. **Empty spans are removed.** Spans with `value: ""` are dropped — except
   when removing them would leave the parent (paragraph, heading, link,
   itemLink) with no children, which would be invalid per the dast schema. In
   that case one empty span is kept.
2. **Adjacent spans are coalesced.** Two or more consecutive spans with the
   same set of marks merge into a single span by concatenating their `value`s.
3. **Marks become an ordered set.** The `marks` array is reordered following
   the canonical order from §5.2 (for defaults), followed by custom marks in
   alphabetical order.
4. **Meta is preserved as an array.** Entry order is preserved.
5. **Heading.level** is normalized to an integer.
6. **List.style** is normalized to `'bulleted'` or `'numbered'`.

Two dast documents are **dastdown-equivalent** if their canonical forms are
deeply equal.

**Idempotency guarantee:**
`parse(serialize(canonicalize(d))) ≡ canonicalize(d)` for every structurally
valid dast document `d`.

---

## 9. Validation

A dastdown parser MUST:

1. **Reject structures invalid against the dast model.** Examples:
   - `<block .../>` nested in a non-root context
   - Heading at a level outside 1–6
   - Link nested inside a link
   - InlineItem inside Link/ItemLink
   - ListItem with children other than Paragraph/List
   - Blockquote with non-Paragraph children
2. **Validate the output** by invoking `validate()` from
   `datocms-structured-text-utils` before returning.
3. **Report errors with source position** (line, column).

A dastdown serializer MUST reject an invalid dast document on input
(preliminary validation).

### 9.1 Empty / null inputs

For ergonomic interop with the `StructuredTextFieldValue` type, both ends
handle absent and empty values explicitly:

- `parse(null)` and `parse(undefined)` → `null`.
- `parse("")` and whitespace-only input → a document with a single empty
  paragraph (`{type:'paragraph', children:[{type:'span', value:''}]}`).
- `serialize(null)` and `serialize(undefined)` → `""`.
- A document whose only content is the canonical empty paragraph also
  serializes to `""`, so the round-trip closes.

---

## 10. Round-trip guarantees and limits

### 10.1 What is preserved

- All nodes and their types
- Heading level, paragraph/heading style
- List style (bulleted/numbered)
- Code language, highlight, raw content
- Blockquote attribution
- Link/ItemLink url, item, meta (with order)
- All marks (default and custom)
- References to block/inlineBlock/inlineItem (via id)
- `\n` inside a span (via `<br/>`)

### 10.2 What is normalized (semantically lossless)

- Mark order (rewritten to canonical order)
- Empty spans (removed where safe)
- Adjacent spans with the same marks (coalesced)
- Cosmetic whitespace between blocks (collapsed to a single blank line)

### 10.3 What is NOT preserved

- Source position (line/column of the original nodes)
- Arbitrary internal cosmetic whitespace
- Distinctions between syntactically different but semantically equivalent
  representations (e.g. `*x*` vs `<m k="emphasis">x</m>`: the shortcut is
  always preferred for default marks during serialization)

---

## 11. Round-trip examples

### 11.1 A composed document

dast:

```json
{
  "schema": "dast",
  "document": {
    "type": "root",
    "children": [
      {
        "type": "heading",
        "level": 2,
        "style": "display",
        "children": [
          { "type": "span", "value": "Welcome, " },
          { "type": "inlineItem", "item": "324321" }
        ]
      },
      {
        "type": "paragraph",
        "children": [
          { "type": "span", "value": "We are happy to have " },
          {
            "type": "itemLink",
            "item": "555",
            "meta": [{ "id": "rel", "value": "nofollow" }],
            "children": [
              { "type": "span", "marks": ["strong"], "value": "this person" }
            ]
          },
          { "type": "span", "value": " on the team. " },
          {
            "type": "span",
            "marks": ["strong", "highlight"],
            "value": "See also"
          },
          { "type": "span", "value": ":" }
        ]
      },
      { "type": "block", "item": "999" },
      {
        "type": "blockquote",
        "attribution": "I. Calvino",
        "children": [
          {
            "type": "paragraph",
            "children": [{ "type": "span", "value": "A quote." }]
          }
        ]
      }
    ]
  }
}
```

dastdown:

```
## Welcome, <inlineItem id="324321"/> {style="display"}

We are happy to have [**this person**](dato:item/555){rel="nofollow"} on the
team. ==**See also**==:

<block id="999"/>

> A quote.
{attribution="I. Calvino"}
```

### 11.2 Code block with internal backticks

dast:

````json
{
  "type": "code",
  "language": "markdown",
  "code": "Example: ```js\nconst x = 1;\n```"
}
````

dastdown (4-backtick fence):

`````
````markdown
Example: ```js
const x = 1;
```
````
`````

### 11.3 Span with a custom and a default mark

dast:

```json
{
  "type": "span",
  "marks": ["strong", "footnote-ref"],
  "value": "see note"
}
```

dastdown (default mark outer, custom mark inner):

```
**<m k="footnote-ref">see note</m>**
```

---

## 12. Reference card

````
Block-level
-----------
# H1 ... ###### H6                  heading {level: 1..6}
text                                paragraph
{style="..."}                       style trailer (paragraph)
- item / 1. item                    list/listItem
> text                              blockquote
{attribution="..."}                 attribution trailer (blockquote)
```lang {highlight=[0,2]}            code (highlight zero-indexed)
contents
````

--- thematicBreak
<block id="..."/> block (root child only)

## Inline marks (default)

**...** strong
_..._ emphasis
`...` code
~~...~~ strikethrough
==...== highlight
++...++ underline

## Inline marks (custom)

<m k="name">...</m>

## Inline references

[x](url){k="v" ...} link
[x](dato:item/ID){k="v" ...} itemLink
<inlineItem id="..."/> inlineItem
<inlineBlock id="..."/> inlineBlock

## Special

<br/> span-internal \n
\X literal escape

```

---

## 13. Conformance

A conformant implementation MUST:

- Accept any input that follows §3–§7 and produce a dast AST equivalent to
  the canonical form (§8).
- Reject the structural violations listed in §9 with a `DastdownParseError`
  carrying line and column information.
- Ensure `parse(serialize(d)) ≡ canonicalize(d)` for every valid `d`.
- Validate every emitted AST against `validate()` from
  `datocms-structured-text-utils`.

Recommended test categories:

- Round-trip on a real-world DatoCMS document corpus
- Idempotency: `parse(serialize(parse(serialize(d)))) ≡ parse(serialize(d))`
- Adversarial escaping (syntactic characters embedded in span text)
- Code blocks containing arbitrarily long backtick runs
- Custom marks with names containing exotic characters
- All six default marks combined on a single span
- Heading and paragraph with custom styles
- Documents containing only blocks (no prose)
- Empty / null / whitespace-only inputs (§9.1)
```
