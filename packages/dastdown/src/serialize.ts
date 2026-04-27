import {
  Document,
  Root,
  Paragraph,
  Heading,
  List,
  ListItem,
  Blockquote,
  Code,
  Block,
  Span,
  Link,
  ItemLink,
  InlineItem,
  InlineBlock,
  Mark,
  MetaEntry,
  validate,
} from 'datocms-structured-text-utils';
import { canonicalize } from './canonicalize';

/**
 * The serializer accepts blocks/inlineBlocks whose `item` is either a string
 * id or a full record-like object exposing `{ id: string }`. The latter is
 * structurally compatible with `BlockInNestedResponse` from
 * `@datocms/cma-client`, so `Document<BlockInNestedResponse<...>, ...>` works
 * out of the box. Request-shape blocks (which may be objects without an `id`)
 * are intentionally not supported.
 */
export type SerializableBlockId = string | { id: string };

function getItemId(item: SerializableBlockId): string {
  return typeof item === 'string' ? item : item.id;
}

function isEmptyDocument(
  doc: Document<SerializableBlockId, SerializableBlockId>,
): boolean {
  const children = doc.document.children;
  if (children.length !== 1) return false;
  const first = children[0];
  if (first.type !== 'paragraph' || first.children.length !== 1) return false;
  const inner = first.children[0];
  return inner.type === 'span' && inner.value === '';
}

const DEFAULT_MARK_DELIMITERS: Record<string, string> = {
  strong: '**',
  emphasis: '*',
  code: '`',
  strikethrough: '~~',
  highlight: '==',
  underline: '++',
};

const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

function escapeAttrValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function serializeMetaEntry(entry: MetaEntry): string {
  const key = IDENTIFIER_RE.test(entry.id)
    ? entry.id
    : `"${escapeAttrValue(entry.id)}"`;
  return `${key}="${escapeAttrValue(entry.value)}"`;
}

function serializeAttributeTrailer(
  pairs: Array<[string, string | string[]]>,
): string {
  const parts = pairs.map(([k, v]) => {
    const key = IDENTIFIER_RE.test(k) ? k : `"${escapeAttrValue(k)}"`;
    if (Array.isArray(v)) {
      return `${key}=[${v.join(',')}]`;
    }
    return `${key}="${escapeAttrValue(v)}"`;
  });
  return `{${parts.join(' ')}}`;
}

function serializeMetaTrailer(meta: MetaEntry[] | undefined): string {
  if (!meta || meta.length === 0) return '';
  return '{' + meta.map(serializeMetaEntry).join(' ') + '}';
}

const SPAN_ESCAPE_CHARS = /[\\*_`~=+[\](){}<>#]/g;

function escapeSpanValue(value: string): string {
  // Replace \n with <br/> after escaping each line independently.
  const lines = value.split('\n');
  return lines
    .map((line) => line.replace(SPAN_ESCAPE_CHARS, (c) => '\\' + c))
    .join('<br/>');
}

function wrapWithMarks(content: string, marks: Mark[] | undefined): string {
  if (!marks || marks.length === 0) return content;
  let out = content;
  // marks array is in canonical outer-to-inner order; wrap from innermost
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i];
    if (m in DEFAULT_MARK_DELIMITERS) {
      const d = DEFAULT_MARK_DELIMITERS[m];
      out = `${d}${out}${d}`;
    } else {
      out = `<m k="${escapeAttrValue(m)}">${out}</m>`;
    }
  }
  return out;
}

function serializeSpan(span: Span): string {
  return wrapWithMarks(escapeSpanValue(span.value), span.marks);
}

function serializeLink(node: Link): string {
  const inner = node.children.map(serializeSpan).join('');
  return `[${inner}](${escapeUrl(node.url)})${serializeMetaTrailer(node.meta)}`;
}

function serializeItemLink(node: ItemLink): string {
  const inner = node.children.map(serializeSpan).join('');
  return `[${inner}](dato:item/${node.item})${serializeMetaTrailer(node.meta)}`;
}

function escapeUrl(url: string): string {
  // Escape `)` and whitespace inside the URL with backslash
  return url.replace(/[\\() ]/g, (c) => '\\' + c);
}

function serializeInlineItem(node: InlineItem): string {
  return `<inlineItem id="${escapeAttrValue(node.item)}"/>`;
}

function serializeInlineBlock(node: InlineBlock<SerializableBlockId>): string {
  return `<inlineBlock id="${escapeAttrValue(getItemId(node.item))}"/>`;
}

function serializeInlineChildren(
  children: Array<
    Span | Link | ItemLink | InlineItem | InlineBlock<SerializableBlockId>
  >,
): string {
  let out = '';
  for (const child of children) {
    switch (child.type) {
      case 'span':
        out += serializeSpan(child);
        break;
      case 'link':
        out += serializeLink(child);
        break;
      case 'itemLink':
        out += serializeItemLink(child as ItemLink);
        break;
      case 'inlineItem':
        out += serializeInlineItem(child);
        break;
      case 'inlineBlock':
        out += serializeInlineBlock(child as InlineBlock<SerializableBlockId>);
        break;
    }
  }
  return out;
}

function serializeParagraph(node: Paragraph<SerializableBlockId>): string[] {
  const text = serializeInlineChildren(node.children);
  const lines = [text];
  if (node.style) {
    lines.push(serializeAttributeTrailer([['style', node.style]]));
  }
  return lines;
}

function serializeHeading(node: Heading<SerializableBlockId>): string[] {
  const hashes = '#'.repeat(node.level);
  const text = serializeInlineChildren(node.children);
  let line = `${hashes} ${text}`;
  if (node.style) {
    line += ` ${serializeAttributeTrailer([['style', node.style]])}`;
  }
  return [line];
}

function serializeBlockquote(node: Blockquote<SerializableBlockId>): string[] {
  const inner = joinBlocksWithBlankLines(node.children.map(serializeParagraph));
  const prefixed = inner.map((l) => (l === '' ? '>' : `> ${l}`));
  if (node.attribution) {
    prefixed.push(
      serializeAttributeTrailer([['attribution', node.attribution]]),
    );
  }
  return prefixed;
}

function serializeCode(node: Code): string[] {
  let runs = 0;
  let max = 2; // ensures min fence length is 3
  for (const c of node.code) {
    if (c === '`') {
      runs++;
      if (runs > max) max = runs;
    } else {
      runs = 0;
    }
  }
  const fence = '`'.repeat(max + 1);
  let info = node.language || '';
  if (node.highlight && node.highlight.length > 0) {
    const trailer = serializeAttributeTrailer([
      ['highlight', node.highlight.map(String)],
    ]);
    info = info ? `${info} ${trailer}` : trailer;
  }
  const lines: string[] = [];
  lines.push(info ? `${fence}${info}` : fence);
  if (node.code.length > 0) {
    lines.push(...node.code.split('\n'));
  }
  lines.push(fence);
  return lines;
}

function serializeBlock(node: Block<SerializableBlockId>): string[] {
  return [`<block id="${escapeAttrValue(getItemId(node.item))}"/>`];
}

function serializeThematicBreak(): string[] {
  return ['---'];
}

function serializeList(
  node: List<SerializableBlockId, SerializableBlockId>,
): string[] {
  const isLoose = node.children.some((li) => li.children.length > 1);
  const out: string[] = [];
  let counter = 0;
  for (let i = 0; i < node.children.length; i++) {
    if (i > 0 && isLoose) out.push('');
    counter++;
    const marker = node.style === 'numbered' ? `${counter}. ` : '- ';
    out.push(...serializeListItem(node.children[i], marker));
  }
  return out;
}

function serializeListItem(
  node: ListItem<SerializableBlockId, SerializableBlockId>,
  marker: string,
): string[] {
  const inner = joinBlocksWithBlankLines(
    node.children.map((child) => {
      if (child.type === 'paragraph') return serializeParagraph(child);
      return serializeList(child);
    }),
  );
  return inner.map((l, i) => {
    if (i === 0) return `${marker}${l}`;
    if (l === '') return '';
    return `  ${l}`;
  });
}

function serializeRootChild(
  node: Root<SerializableBlockId, SerializableBlockId>['children'][number],
): string[] {
  switch (node.type) {
    case 'paragraph':
      return serializeParagraph(node);
    case 'heading':
      return serializeHeading(node);
    case 'list':
      return serializeList(node);
    case 'blockquote':
      return serializeBlockquote(node);
    case 'code':
      return serializeCode(node);
    case 'block':
      return serializeBlock(node);
    case 'thematicBreak':
      return serializeThematicBreak();
  }
}

function joinBlocksWithBlankLines(blocks: string[][]): string[] {
  const out: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (i > 0) out.push('');
    out.push(...blocks[i]);
  }
  return out;
}

export function serialize<
  B extends SerializableBlockId = string,
  IB extends SerializableBlockId = string
>(document: Document<B, IB> | null | undefined): string {
  if (document === null || document === undefined) return '';

  const asGeneric = (document as unknown) as Document<
    SerializableBlockId,
    SerializableBlockId
  >;
  const result = validate((document as unknown) as Document);
  if (!result.valid) {
    throw new Error(`Invalid dast document: ${result.message}`);
  }

  if (isEmptyDocument(asGeneric)) return '';

  const canonical = canonicalize(asGeneric);
  if (canonical.document.children.length === 0) return '';

  const blocks = canonical.document.children.map(serializeRootChild);
  const lines = joinBlocksWithBlankLines(blocks);
  return lines.join('\n') + '\n';
}
