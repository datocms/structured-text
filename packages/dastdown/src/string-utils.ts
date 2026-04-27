import { DastdownParseError } from './errors';

export function decodeAttrValue(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '\\' && i + 1 < raw.length) {
      const nx = raw[i + 1];
      switch (nx) {
        case 'n':
          out += '\n';
          break;
        case 't':
          out += '\t';
          break;
        case 'r':
          out += '\r';
          break;
        case '\\':
          out += '\\';
          break;
        case '"':
          out += '"';
          break;
        case 'u': {
          const hex = raw.substr(i + 2, 4);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            out += String.fromCharCode(parseInt(hex, 16));
            i += 5;
            continue;
          }
          out += nx;
          break;
        }
        default:
          out += nx;
      }
      i++;
    } else {
      out += c;
    }
  }
  return out;
}

export function decodeSpanEscapes(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '\\' && i + 1 < raw.length) {
      out += raw[i + 1];
      i++;
    } else {
      out += c;
    }
  }
  return out;
}

export function parseQuotedString(
  text: string,
  startIdx: number,
  lineNo: number,
): { value: string; end: number } {
  if (text[startIdx] !== '"') {
    throw new DastdownParseError('expected "', lineNo, startIdx + 1);
  }
  let i = startIdx + 1;
  let raw = '';
  while (i < text.length) {
    const c = text[i];
    if (c === '\\' && i + 1 < text.length) {
      raw += c + text[i + 1];
      i += 2;
      continue;
    }
    if (c === '"') {
      return { value: decodeAttrValue(raw), end: i + 1 };
    }
    raw += c;
    i++;
  }
  throw new DastdownParseError(
    'unterminated quoted string',
    lineNo,
    startIdx + 1,
  );
}
