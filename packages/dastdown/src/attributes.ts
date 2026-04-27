import { parseQuotedString } from './string-utils';

const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_-]*/;

export type AttrEntry = { key: string; value: string | string[] };

export function parseAttributeTrailer(
  text: string,
  startIdx: number,
  lineNo: number,
): { entries: AttrEntry[]; end: number } | null {
  if (text[startIdx] !== '{') return null;
  let i = startIdx + 1;
  const entries: AttrEntry[] = [];
  while (i < text.length && text[i] !== '}') {
    while (i < text.length && /\s/.test(text[i])) i++;
    if (text[i] === '}') break;
    if (i >= text.length) return null;

    let key: string;
    if (text[i] === '"') {
      const r = parseQuotedString(text, i, lineNo);
      key = r.value;
      i = r.end;
    } else {
      const m = text.substring(i).match(IDENTIFIER_RE);
      if (!m) return null;
      key = m[0];
      i += m[0].length;
    }

    if (text[i] !== '=') return null;
    i++;

    let value: string | string[];
    if (text[i] === '"') {
      const r = parseQuotedString(text, i, lineNo);
      value = r.value;
      i = r.end;
    } else if (text[i] === '[') {
      const r = parseArrayValue(text, i);
      if (!r) return null;
      value = r.value;
      i = r.end;
    } else {
      return null;
    }

    entries.push({ key, value });
    while (i < text.length && /\s/.test(text[i])) i++;
  }
  if (text[i] !== '}') return null;
  return { entries, end: i + 1 };
}

function parseArrayValue(
  text: string,
  startIdx: number,
): { value: string[]; end: number } | null {
  if (text[startIdx] !== '[') return null;
  let i = startIdx + 1;
  const out: string[] = [];
  while (i < text.length && text[i] !== ']') {
    while (i < text.length && /[\s,]/.test(text[i])) i++;
    if (text[i] === ']') break;
    let token = '';
    while (i < text.length && !/[\s,\]]/.test(text[i])) {
      token += text[i];
      i++;
    }
    if (token.length > 0) out.push(token);
  }
  if (text[i] !== ']') return null;
  return { value: out, end: i + 1 };
}
