import { DastdownParseError } from './errors';
import { parseQuotedString } from './string-utils';

function skipWhitespace(text: string, i: number): number {
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}

/**
 * Match a self-closing XML tag of the form `<name attr="value"/>` at the
 * given position. Returns null if the prefix doesn't look like the expected
 * tag, or throws DastdownParseError if the tag opens but is malformed
 * (unterminated quoted string, missing slash, etc.).
 *
 * On success, the returned `length` is the number of source characters that
 * make up the tag (so `text.substring(startIdx, startIdx + length)` is the
 * full tag including angle brackets).
 */
export function tryParseSelfClosingTag(
  text: string,
  startIdx: number,
  expectedName: string,
  expectedAttr: string,
  lineNo: number,
): { value: string; length: number } | null {
  if (text[startIdx] !== '<') return null;
  const nameStart = startIdx + 1;
  if (text.substr(nameStart, expectedName.length) !== expectedName) return null;
  const afterName = nameStart + expectedName.length;
  const ch = text[afterName];
  if (ch !== ' ' && ch !== '\t') return null;

  let i = skipWhitespace(text, afterName);
  if (text.substr(i, expectedAttr.length) !== expectedAttr) return null;
  i += expectedAttr.length;
  if (text[i] !== '=') return null;
  i++;
  if (text[i] !== '"') {
    throw new DastdownParseError(
      `expected '"' after ${expectedAttr}=`,
      lineNo,
      i + 1,
    );
  }
  const quoted = parseQuotedString(text, i, lineNo);
  i = quoted.end;
  i = skipWhitespace(text, i);
  if (text[i] !== '/' || text[i + 1] !== '>') {
    throw new DastdownParseError(
      `expected '/>' to close <${expectedName}>`,
      lineNo,
      i + 1,
    );
  }
  return { value: quoted.value, length: i + 2 - startIdx };
}

/**
 * Match an `<m k="...">` opening tag at the given position. Returns null if
 * the prefix doesn't match (e.g. `</m>` or some other tag), or throws if it
 * opens but is malformed.
 */
export function tryParseMOpen(
  text: string,
  startIdx: number,
  lineNo: number,
): { key: string; length: number } | null {
  if (text[startIdx] !== '<' || text[startIdx + 1] !== 'm') return null;
  const ch = text[startIdx + 2];
  if (ch !== ' ' && ch !== '\t') return null;

  let i = skipWhitespace(text, startIdx + 2);
  if (text.substr(i, 1) !== 'k') return null;
  i++;
  if (text[i] !== '=') return null;
  i++;
  if (text[i] !== '"') {
    throw new DastdownParseError("expected '\"' after k=", lineNo, i + 1);
  }
  const quoted = parseQuotedString(text, i, lineNo);
  i = quoted.end;
  i = skipWhitespace(text, i);
  if (text[i] !== '>') {
    throw new DastdownParseError(
      "expected '>' to close <m> opening tag",
      lineNo,
      i + 1,
    );
  }
  return { key: quoted.value, length: i + 1 - startIdx };
}

export function isMClose(text: string, startIdx: number): boolean {
  return text.startsWith('</m>', startIdx);
}
