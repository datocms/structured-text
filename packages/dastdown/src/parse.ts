import {
  Document,
  Root,
  Paragraph,
  Heading,
  List,
  ListItem,
  Blockquote,
  Code,
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
import { DastdownParseError } from './errors';
import { decodeSpanEscapes } from './string-utils';
import { parseAttributeTrailer } from './attributes';
import { tryParseSelfClosingTag, tryParseMOpen, isMClose } from './tags';

export { DastdownParseError };

type Line = { text: string; lineNo: number };

type RootChild = Root<string, string>['children'][number];

type InlineNode = Span | Link | ItemLink | InlineItem | InlineBlock<string>;

type InlineCtx = {
  allowReferences: boolean;
  lineNo: number;
};

const HEADING_RE = /^(#+)\s/;
const BULLETED_RE = /^- (.*)$/;
const NUMBERED_RE = /^(\d+)\. (.*)$/;
const FENCE_RE = /^(`{3,})\s*(.*)$/;
const STYLE_TRAILER_RE = /^\{style="/;
const ATTRIBUTION_TRAILER_RE = /^\{attribution="/;

// ----- inline parsing -----

function findUnescapedChar(text: string, startIdx: number, ch: string): number {
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === '\\') {
      i++;
      continue;
    }
    if (text[i] === ch) return i;
  }
  return -1;
}

function findUnescapedSeq(text: string, startIdx: number, seq: string): number {
  for (let i = startIdx; i <= text.length - seq.length; i++) {
    if (text[i] === '\\') {
      i++;
      continue;
    }
    if (text.startsWith(seq, i)) return i;
  }
  return -1;
}

function findMatchingBracket(text: string, startIdx: number): number {
  let depth = 0;
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === '\\') {
      i++;
      continue;
    }
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findClosingMarkTag(
  text: string,
  startIdx: number,
  lineNo: number,
): number {
  let depth = 1;
  let i = startIdx;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === '<') {
      if (isMClose(text, i)) {
        depth--;
        if (depth === 0) return i;
        i += 4;
        continue;
      }
      const open = tryParseMOpen(text, i, lineNo);
      if (open) {
        depth++;
        i += open.length;
        continue;
      }
    }
    i++;
  }
  return -1;
}

function mergeMark(marks: Mark[], mark: Mark): Mark[] {
  if (marks.indexOf(mark) >= 0) return marks;
  return [...marks, mark];
}

function parseInline(text: string, ctx: InlineCtx): InlineNode[] {
  return parseInlineWithMarks(text, [], ctx);
}

function parseInlineWithMarks(
  text: string,
  marks: Mark[],
  ctx: InlineCtx,
): InlineNode[] {
  const out: InlineNode[] = [];
  let buffer = '';
  let i = 0;
  const N = text.length;

  const flush = (): void => {
    if (buffer.length > 0) {
      const span: Span =
        marks.length > 0
          ? { type: 'span', value: buffer, marks: [...marks] }
          : { type: 'span', value: buffer };
      out.push(span);
      buffer = '';
    }
  };

  while (i < N) {
    const c = text[i];

    if (c === '\\' && i + 1 < N) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }

    if (c === '<') {
      if (text.startsWith('<br/>', i)) {
        buffer += '\n';
        i += 5;
        continue;
      }
      const inlineItemTag = tryParseSelfClosingTag(
        text,
        i,
        'inlineItem',
        'id',
        ctx.lineNo,
      );
      if (inlineItemTag) {
        if (!ctx.allowReferences) {
          throw new DastdownParseError(
            'inlineItem is not allowed inside a link',
            ctx.lineNo,
            i + 1,
          );
        }
        flush();
        out.push({ type: 'inlineItem', item: inlineItemTag.value });
        i += inlineItemTag.length;
        continue;
      }
      const inlineBlockTag = tryParseSelfClosingTag(
        text,
        i,
        'inlineBlock',
        'id',
        ctx.lineNo,
      );
      if (inlineBlockTag) {
        if (!ctx.allowReferences) {
          throw new DastdownParseError(
            'inlineBlock is not allowed inside a link',
            ctx.lineNo,
            i + 1,
          );
        }
        flush();
        out.push({ type: 'inlineBlock', item: inlineBlockTag.value });
        i += inlineBlockTag.length;
        continue;
      }
      const blockTag = tryParseSelfClosingTag(
        text,
        i,
        'block',
        'id',
        ctx.lineNo,
      );
      if (blockTag) {
        throw new DastdownParseError(
          'block is not allowed inline (must be a direct child of root, on its own line)',
          ctx.lineNo,
          i + 1,
        );
      }
      const mOpen = tryParseMOpen(text, i, ctx.lineNo);
      if (mOpen) {
        const innerStart = i + mOpen.length;
        const closeIdx = findClosingMarkTag(text, innerStart, ctx.lineNo);
        if (closeIdx >= 0) {
          flush();
          const inner = text.substring(innerStart, closeIdx);
          out.push(
            ...parseInlineWithMarks(inner, mergeMark(marks, mOpen.key), ctx),
          );
          i = closeIdx + 4;
          continue;
        }
      }
    }

    if (c === '[') {
      if (!ctx.allowReferences) {
        throw new DastdownParseError(
          'link/itemLink is not allowed inside another link',
          ctx.lineNo,
          i + 1,
        );
      }
      const linkMatch = matchLinkOrItemLink(text, i, ctx);
      if (linkMatch) {
        flush();
        out.push(linkMatch.node);
        i = linkMatch.end;
        continue;
      }
    }

    // *** ... *** = strong + emphasis (greedy, before separate ** / * matching)
    if (text.startsWith('***', i)) {
      const closeIdx = findUnescapedSeq(text, i + 3, '***');
      if (closeIdx >= 0) {
        flush();
        const inner = text.substring(i + 3, closeIdx);
        const newMarks = mergeMark(mergeMark(marks, 'strong'), 'emphasis');
        out.push(...parseInlineWithMarks(inner, newMarks, ctx));
        i = closeIdx + 3;
        continue;
      }
    }

    if (c === '`') {
      const closeIdx = findUnescapedChar(text, i + 1, '`');
      if (closeIdx >= 0) {
        flush();
        const raw = text.substring(i + 1, closeIdx);
        const decoded = decodeSpanEscapes(raw);
        const newMarks = mergeMark(marks, 'code');
        out.push({ type: 'span', value: decoded, marks: [...newMarks] });
        i = closeIdx + 1;
        continue;
      }
    }

    let matched = false;
    const delimiters: Array<[string, Mark]> = [
      ['**', 'strong'],
      ['~~', 'strikethrough'],
      ['==', 'highlight'],
      ['++', 'underline'],
      ['*', 'emphasis'],
    ];
    for (const [delim, mark] of delimiters) {
      if (text.startsWith(delim, i)) {
        const closeIdx = findUnescapedSeq(text, i + delim.length, delim);
        if (closeIdx >= 0) {
          flush();
          const inner = text.substring(i + delim.length, closeIdx);
          out.push(...parseInlineWithMarks(inner, mergeMark(marks, mark), ctx));
          i = closeIdx + delim.length;
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    buffer += c;
    i++;
  }
  flush();
  return out;
}

function matchLinkOrItemLink(
  text: string,
  startIdx: number,
  ctx: InlineCtx,
): { node: Link | ItemLink; end: number } | null {
  const closeIdx = findMatchingBracket(text, startIdx);
  if (closeIdx < 0) return null;
  if (text[closeIdx + 1] !== '(') return null;
  const innerText = text.substring(startIdx + 1, closeIdx);

  let urlEnd = closeIdx + 2;
  let rawUrl = '';
  while (urlEnd < text.length) {
    const c = text[urlEnd];
    if (c === '\\' && urlEnd + 1 < text.length) {
      rawUrl += text[urlEnd + 1];
      urlEnd += 2;
      continue;
    }
    if (c === ')') break;
    rawUrl += c;
    urlEnd++;
  }
  if (text[urlEnd] !== ')') return null;

  let trailerEnd = urlEnd + 1;
  let meta: MetaEntry[] | undefined;
  if (text[trailerEnd] === '{') {
    const trailer = parseAttributeTrailer(text, trailerEnd, ctx.lineNo);
    if (trailer) {
      meta = trailer.entries.map((e) => ({
        id: e.key,
        value: typeof e.value === 'string' ? e.value : e.value.join(','),
      }));
      trailerEnd = trailer.end;
    }
  }

  const innerCtx: InlineCtx = { ...ctx, allowReferences: false };
  const children = parseInlineWithMarks(innerText, [], innerCtx);
  for (const child of children) {
    if (child.type !== 'span') {
      throw new DastdownParseError(
        `${child.type} is not allowed inside a link`,
        ctx.lineNo,
        startIdx + 1,
      );
    }
  }

  const itemMatch = /^dato:item\/(.+)$/.exec(rawUrl);
  if (itemMatch) {
    const node: ItemLink = {
      type: 'itemLink',
      item: itemMatch[1],
      children: children as Span[],
    };
    if (meta) node.meta = meta;
    return { node, end: trailerEnd };
  }
  const node: Link = {
    type: 'link',
    url: rawUrl,
    children: children as Span[],
  };
  if (meta) node.meta = meta;
  return { node, end: trailerEnd };
}

// ----- block parsing -----

function isBlankLine(line: Line): boolean {
  return line.text === '';
}

function isHeadingLine(text: string): boolean {
  return HEADING_RE.test(text);
}

function isThematicBreak(text: string): boolean {
  return text === '---';
}

function isFenceOpen(text: string): boolean {
  return /^```/.test(text);
}

function tryParseRootBlockTag(
  text: string,
  lineNo: number,
): { id: string } | null {
  if (!text.startsWith('<block')) return null;
  const tag = tryParseSelfClosingTag(text, 0, 'block', 'id', lineNo);
  if (!tag) return null;
  // Must be the entire (trimmed) line for it to be a root-level block tag.
  let i = tag.length;
  while (i < text.length && /\s/.test(text[i])) i++;
  if (i !== text.length) return null;
  return { id: tag.value };
}

function isListMarker(text: string): boolean {
  return BULLETED_RE.test(text) || NUMBERED_RE.test(text);
}

function isBlockquoteLine(text: string): boolean {
  return text === '>' || text.startsWith('> ');
}

function isStyleTrailer(text: string): boolean {
  return STYLE_TRAILER_RE.test(text) && text.endsWith('}');
}

function isAttributionTrailer(text: string): boolean {
  return ATTRIBUTION_TRAILER_RE.test(text) && text.endsWith('}');
}

function startsBlockConstruct(text: string, lineNo: number): boolean {
  return (
    isHeadingLine(text) ||
    isThematicBreak(text) ||
    isFenceOpen(text) ||
    tryParseRootBlockTag(text, lineNo) !== null ||
    isListMarker(text) ||
    isBlockquoteLine(text)
  );
}

function parseBlocks(lines: Line[]): RootChild[] {
  const out: RootChild[] = [];
  let i = 0;
  while (i < lines.length) {
    while (i < lines.length && isBlankLine(lines[i])) i++;
    if (i >= lines.length) break;
    const r = parseOneBlock(lines, i);
    out.push(r.node);
    i = r.end;
  }
  return out;
}

function parseOneBlock(
  lines: Line[],
  startIdx: number,
): { node: RootChild; end: number } {
  const line = lines[startIdx];
  const text = line.text;

  if (HEADING_RE.test(text)) return parseHeadingBlock(lines, startIdx);
  if (isThematicBreak(text)) {
    return { node: { type: 'thematicBreak' }, end: startIdx + 1 };
  }
  if (isFenceOpen(text)) return parseCodeBlock(lines, startIdx);
  const blockTag = tryParseRootBlockTag(text, line.lineNo);
  if (blockTag) {
    return {
      node: { type: 'block', item: blockTag.id },
      end: startIdx + 1,
    };
  }
  if (isListMarker(text)) return parseListBlock(lines, startIdx);
  if (isBlockquoteLine(text)) return parseBlockquoteBlock(lines, startIdx);
  return parseParagraphBlock(lines, startIdx);
}

function parseHeadingBlock(
  lines: Line[],
  startIdx: number,
): { node: Heading<string>; end: number } {
  const line = lines[startIdx];
  const m = /^(#+)\s(.*)$/.exec(line.text);
  if (!m) {
    throw new DastdownParseError('invalid heading', line.lineNo, 1);
  }
  const level = m[1].length;
  if (level < 1 || level > 6) {
    throw new DastdownParseError(
      `heading level ${level} is out of range (1-6)`,
      line.lineNo,
      1,
    );
  }
  let rest = m[2];
  let style: string | undefined;
  const trailerStart = rest.lastIndexOf('{');
  if (trailerStart >= 0 && rest.endsWith('}')) {
    const trailerText = rest.substring(trailerStart);
    const trailer = parseAttributeTrailer(trailerText, 0, line.lineNo);
    if (trailer && trailer.end === trailerText.length) {
      const styleEntry = trailer.entries.find((e) => e.key === 'style');
      if (styleEntry && typeof styleEntry.value === 'string') {
        style = styleEntry.value;
        rest = rest.substring(0, trailerStart).replace(/\s+$/, '');
      }
    }
  }
  const children = parseInline(rest, {
    allowReferences: true,
    lineNo: line.lineNo,
  });
  const node: Heading<string> = {
    type: 'heading',
    level: level as Heading<string>['level'],
    children: children as Heading<string>['children'],
  };
  if (style !== undefined) node.style = style;
  return { node, end: startIdx + 1 };
}

function parseCodeBlock(
  lines: Line[],
  startIdx: number,
): { node: Code; end: number } {
  const line = lines[startIdx];
  const m = FENCE_RE.exec(line.text);
  if (!m) throw new DastdownParseError('invalid code fence', line.lineNo, 1);
  const fence = m[1];
  const info = m[2] || '';
  let language: string | undefined;
  let highlight: number[] | undefined;
  if (info) {
    const trailerStart = info.indexOf('{');
    let lang: string;
    let trailerText = '';
    if (trailerStart >= 0) {
      lang = info.substring(0, trailerStart).trim();
      trailerText = info.substring(trailerStart);
    } else {
      lang = info.trim();
    }
    if (lang) language = lang;
    if (trailerText) {
      const trailer = parseAttributeTrailer(trailerText, 0, line.lineNo);
      if (trailer) {
        const entry = trailer.entries.find((e) => e.key === 'highlight');
        if (entry && Array.isArray(entry.value)) {
          highlight = entry.value.map((v) => parseInt(v, 10));
        }
      }
    }
  }
  const body: string[] = [];
  let i = startIdx + 1;
  while (i < lines.length) {
    const cur = lines[i].text;
    if (
      cur === fence ||
      (cur.startsWith('`'.repeat(fence.length)) && /^`+\s*$/.test(cur))
    ) {
      i++;
      break;
    }
    body.push(cur);
    i++;
  }
  const node: Code = { type: 'code', code: body.join('\n') };
  if (language !== undefined) node.language = language;
  if (highlight !== undefined) node.highlight = highlight;
  return { node, end: i };
}

function parseListBlock(
  lines: Line[],
  startIdx: number,
): { node: List<string, string>; end: number } {
  const firstText = lines[startIdx].text;
  const isNumbered = NUMBERED_RE.test(firstText);
  const style: 'bulleted' | 'numbered' = isNumbered ? 'numbered' : 'bulleted';

  const items: ListItem<string, string>[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const cur = lines[i];
    const m = isNumbered
      ? NUMBERED_RE.exec(cur.text)
      : BULLETED_RE.exec(cur.text);
    if (!m) break;
    const firstContent = isNumbered ? m[2] : m[1];
    const itemLines: Line[] = [{ text: firstContent, lineNo: cur.lineNo }];
    i++;

    while (i < lines.length) {
      const next = lines[i];
      if (next.text === '') {
        let j = i;
        while (j < lines.length && lines[j].text === '') j++;
        if (j >= lines.length) {
          i = j;
          break;
        }
        const nx = lines[j];
        if (nx.text.startsWith('  ')) {
          for (let k = i; k < j; k++) {
            itemLines.push({ text: '', lineNo: lines[k].lineNo });
          }
          i = j;
        } else {
          i = j;
          break;
        }
      } else if (next.text.startsWith('  ')) {
        itemLines.push({ text: next.text.slice(2), lineNo: next.lineNo });
        i++;
      } else {
        break;
      }
    }

    while (
      itemLines.length > 0 &&
      itemLines[itemLines.length - 1].text === ''
    ) {
      itemLines.pop();
    }

    const itemBlocks = parseBlocks(itemLines);
    for (const child of itemBlocks) {
      if (child.type !== 'paragraph' && child.type !== 'list') {
        throw new DastdownParseError(
          `listItem may only contain paragraph or list, found ${child.type}`,
          cur.lineNo,
          1,
        );
      }
    }
    items.push({
      type: 'listItem',
      children: itemBlocks as ListItem<string, string>['children'],
    });
  }

  return {
    node: { type: 'list', style, children: items },
    end: i,
  };
}

function parseBlockquoteBlock(
  lines: Line[],
  startIdx: number,
): { node: Blockquote<string>; end: number } {
  const inner: Line[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const cur = lines[i];
    if (cur.text === '>') {
      inner.push({ text: '', lineNo: cur.lineNo });
      i++;
    } else if (cur.text.startsWith('> ')) {
      inner.push({ text: cur.text.slice(2), lineNo: cur.lineNo });
      i++;
    } else {
      break;
    }
  }
  while (inner.length > 0 && inner[inner.length - 1].text === '') inner.pop();

  const children = parseBlocks(inner);
  for (const child of children) {
    if (child.type !== 'paragraph') {
      throw new DastdownParseError(
        `blockquote may only contain paragraphs, found ${child.type}`,
        lines[startIdx].lineNo,
        1,
      );
    }
  }

  let attribution: string | undefined;
  if (i < lines.length && isAttributionTrailer(lines[i].text)) {
    const trailer = parseAttributeTrailer(lines[i].text, 0, lines[i].lineNo);
    if (trailer && trailer.end === lines[i].text.length) {
      const e = trailer.entries.find((entry) => entry.key === 'attribution');
      if (e && typeof e.value === 'string') {
        attribution = e.value;
        i++;
      }
    }
  }

  const node: Blockquote<string> = {
    type: 'blockquote',
    children: children as Blockquote<string>['children'],
  };
  if (attribution !== undefined) node.attribution = attribution;
  return { node, end: i };
}

function parseParagraphBlock(
  lines: Line[],
  startIdx: number,
): { node: Paragraph<string>; end: number } {
  const collected: string[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const cur = lines[i];
    if (cur.text === '') break;
    if (i > startIdx && startsBlockConstruct(cur.text, cur.lineNo)) break;
    if (i > startIdx && isStyleTrailer(cur.text)) break;
    collected.push(cur.text);
    i++;
  }
  let style: string | undefined;
  if (i < lines.length && isStyleTrailer(lines[i].text)) {
    const trailer = parseAttributeTrailer(lines[i].text, 0, lines[i].lineNo);
    if (trailer && trailer.end === lines[i].text.length) {
      const e = trailer.entries.find((entry) => entry.key === 'style');
      if (e && typeof e.value === 'string') {
        style = e.value;
        i++;
      }
    }
  }
  const text = collected.join(' ');
  const children = parseInline(text, {
    allowReferences: true,
    lineNo: lines[startIdx].lineNo,
  });
  const node: Paragraph<string> = {
    type: 'paragraph',
    children: children as Paragraph<string>['children'],
  };
  if (style !== undefined) node.style = style;
  return { node, end: i };
}

// ----- entry point -----

function emptyDocument(): Document {
  return {
    schema: 'dast',
    document: {
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'span', value: '' }] },
      ],
    },
  };
}

/**
 * Parses a dastdown source string into a DAST document. Block and inlineBlock
 * `item` fields are always string IDs in the result, since dastdown only
 * encodes ids on the wire.
 *
 * Mapping of edge cases:
 *  - `null` / `undefined` → `null` (the absent-value form for a structured-text field)
 *  - `''` / whitespace-only string → document with a single empty paragraph
 *  - everything else → parsed document
 */
export function parse(input: string | null | undefined): Document | null {
  if (input === null || input === undefined) return null;

  const rawLines = input.split('\n');
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === '') {
    rawLines.pop();
  }
  const lines: Line[] = rawLines.map((text, i) => ({
    text,
    lineNo: i + 1,
  }));

  const children = parseBlocks(lines);
  if (children.length === 0) return emptyDocument();

  const doc: Document<string, string> = {
    schema: 'dast',
    document: { type: 'root', children },
  };
  const canonical = canonicalize(doc);
  const result = validate(canonical as Document);
  if (!result.valid) {
    throw new DastdownParseError(`invalid dast: ${result.message}`, 1, 1);
  }
  return canonical as Document;
}
