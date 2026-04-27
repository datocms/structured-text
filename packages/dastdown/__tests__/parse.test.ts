import { parse, DastdownParseError } from '../src';
import {
  doc,
  p,
  pStyled,
  h,
  hStyled,
  s,
  link,
  itemLink,
  inlineItem,
  inlineBlock,
  block,
  list,
  li,
  bq,
  code,
  thematicBreak,
} from '../test-helpers';

describe('parse', () => {
  describe('paragraph', () => {
    it('parses a simple paragraph', () => {
      expect(parse('hello world')).toEqual(doc(p(s('hello world'))));
    });

    it('joins consecutive non-empty lines into a single paragraph', () => {
      expect(parse('line one\nline two')).toEqual(
        doc(p(s('line one line two'))),
      );
    });

    it('separates paragraphs by blank lines', () => {
      expect(parse('one\n\ntwo')).toEqual(doc(p(s('one')), p(s('two'))));
    });

    it('reads a style trailer on the line immediately after the paragraph', () => {
      expect(parse('Lead.\n{style="lead"}')).toEqual(
        doc(pStyled('lead', s('Lead.'))),
      );
    });
  });

  describe('heading', () => {
    it.each([1, 2, 3, 4, 5, 6] as const)('parses heading level %i', (level) => {
      const hashes = '#'.repeat(level);
      expect(parse(`${hashes} title`)).toEqual(doc(h(level, s('title'))));
    });

    it('parses style trailer at end of heading line', () => {
      expect(parse('## Hello {style="display"}')).toEqual(
        doc(hStyled(2, 'display', s('Hello'))),
      );
    });

    it('rejects 7+ hashes', () => {
      expect(() => parse('####### too many')).toThrow(DastdownParseError);
    });
  });

  describe('list', () => {
    it('parses a bulleted list with single-paragraph items', () => {
      expect(parse('- one\n- two')).toEqual(
        doc(list('bulleted', li(p(s('one'))), li(p(s('two'))))),
      );
    });

    it('parses a numbered list (numbers are not semantic)', () => {
      expect(parse('1. one\n5. two')).toEqual(
        doc(list('numbered', li(p(s('one'))), li(p(s('two'))))),
      );
    });

    it('parses multi-paragraph list items via 2-space indentation', () => {
      expect(parse('- first\n\n  second')).toEqual(
        doc(list('bulleted', li(p(s('first')), p(s('second'))))),
      );
    });

    it('parses nested lists', () => {
      expect(parse('- outer\n\n  - inner')).toEqual(
        doc(
          list(
            'bulleted',
            li(p(s('outer')), list('bulleted', li(p(s('inner'))))),
          ),
        ),
      );
    });
  });

  describe('blockquote', () => {
    it('parses a single-paragraph blockquote', () => {
      expect(parse('> A quote.')).toEqual(doc(bq(undefined, p(s('A quote.')))));
    });

    it('parses two paragraphs separated by an empty quoted line', () => {
      expect(parse('> one\n>\n> two')).toEqual(
        doc(bq(undefined, p(s('one')), p(s('two')))),
      );
    });

    it('reads attribution trailer on the line immediately after', () => {
      expect(parse('> Be yourself.\n{attribution="Oscar Wilde"}')).toEqual(
        doc(bq('Oscar Wilde', p(s('Be yourself.')))),
      );
    });
  });

  describe('code', () => {
    it('parses a fenced code block with language', () => {
      expect(parse('```javascript\nlet x = 1;\n```')).toEqual(
        doc(code('javascript', 'let x = 1;')),
      );
    });

    it('parses a fenced code block without language', () => {
      expect(parse('```\nlet x = 1;\n```')).toEqual(
        doc(code(undefined, 'let x = 1;')),
      );
    });

    it('parses a highlight trailer on the info line', () => {
      expect(parse('```javascript {highlight=[0,2]}\na\nb\nc\n```')).toEqual(
        doc(code('javascript', 'a\nb\nc', [0, 2])),
      );
    });

    it('treats the body as raw (no escape processing)', () => {
      expect(parse('```\na \\* b\n```')).toEqual(
        doc(code(undefined, 'a \\* b')),
      );
    });

    it('supports longer fences when body contains backticks', () => {
      expect(parse('````markdown\na ``` b\n````')).toEqual(
        doc(code('markdown', 'a ``` b')),
      );
    });
  });

  describe('thematic break', () => {
    it('parses --- as thematicBreak', () => {
      expect(parse('---')).toEqual(doc(thematicBreak()));
    });
  });

  describe('block', () => {
    it('parses a self-closing <block id="..."/> as a root child', () => {
      expect(parse('<block id="999"/>')).toEqual(doc(block('999')));
    });

    it('rejects <block .../> nested inside a listItem', () => {
      expect(() => parse('- item\n\n  <block id="1"/>')).toThrow(
        DastdownParseError,
      );
    });

    it('rejects <block .../> inside a blockquote', () => {
      expect(() => parse('> <block id="1"/>')).toThrow(DastdownParseError);
    });
  });

  describe('inline marks (default)', () => {
    it.each([
      ['**x**', 'strong'],
      ['*x*', 'emphasis'],
      ['`x`', 'code'],
      ['~~x~~', 'strikethrough'],
      ['==x==', 'highlight'],
      ['++x++', 'underline'],
    ])('parses %s as a span with mark %s', (input, mark) => {
      expect(parse(input)).toEqual(doc(p(s('x', [mark]))));
    });

    it('parses combined nested marks and produces canonical mark order', () => {
      expect(parse('==***text***==')).toEqual(
        doc(p(s('text', ['highlight', 'strong', 'emphasis']))),
      );
    });

    it('flattens any nesting order to a canonical set of marks', () => {
      // **==x==** should canonicalize to highlight outer, strong inner
      expect(parse('**==x==**')).toEqual(
        doc(p(s('x', ['highlight', 'strong']))),
      );
    });
  });

  describe('inline marks (custom)', () => {
    it('parses <m k="..."> as a custom mark', () => {
      expect(parse('<m k="footnote-ref">x</m>')).toEqual(
        doc(p(s('x', ['footnote-ref']))),
      );
    });

    it('combines defaults and customs into a single mark set', () => {
      expect(parse('**<m k="footnote-ref">x</m>**')).toEqual(
        doc(p(s('x', ['strong', 'footnote-ref']))),
      );
    });
  });

  describe('inline references', () => {
    it('parses a link without meta', () => {
      expect(parse('see [here](https://example.com)')).toEqual(
        doc(p(s('see '), link('https://example.com', [s('here')]))),
      );
    });

    it('parses a link with meta trailer', () => {
      expect(
        parse('[here](https://example.com){rel="nofollow" target="_blank"}'),
      ).toEqual(
        doc(
          p(
            link(
              'https://example.com',
              [s('here')],
              [
                { id: 'rel', value: 'nofollow' },
                { id: 'target', value: '_blank' },
              ],
            ),
          ),
        ),
      );
    });

    it('parses an itemLink with dato:item/ scheme', () => {
      expect(parse('[**persona**](dato:item/555){rel="nofollow"}')).toEqual(
        doc(
          p(
            itemLink(
              '555',
              [s('persona', ['strong'])],
              [{ id: 'rel', value: 'nofollow' }],
            ),
          ),
        ),
      );
    });

    it('parses inlineItem and inlineBlock', () => {
      expect(parse('a <inlineItem id="1"/> b <inlineBlock id="2"/> c')).toEqual(
        doc(p(s('a '), inlineItem('1'), s(' b '), inlineBlock('2'), s(' c'))),
      );
    });

    it('rejects a link nested inside another link', () => {
      expect(() => parse('[outer [inner](u2)](u1)')).toThrow(
        DastdownParseError,
      );
    });

    it('rejects an inlineItem inside a link', () => {
      expect(() =>
        parse('[<inlineItem id="1"/>](https://example.com)'),
      ).toThrow(DastdownParseError);
    });
  });

  describe('escaping', () => {
    it('treats \\* as a literal asterisk in span text', () => {
      expect(parse('a \\*literal\\* b')).toEqual(doc(p(s('a *literal* b'))));
    });

    it('accepts escapes of any ASCII character', () => {
      expect(parse('\\a\\b\\c')).toEqual(doc(p(s('abc'))));
    });

    it('parses <br/> as a literal \\n inside a span', () => {
      expect(parse('first<br/>second')).toEqual(doc(p(s('first\nsecond'))));
    });
  });

  describe('error reporting', () => {
    it('reports line and column on errors', () => {
      try {
        parse('# ok\n\n####### bad');
        fail('expected error');
      } catch (err) {
        expect(err).toBeInstanceOf(DastdownParseError);
        const e = err as DastdownParseError;
        expect(e.line).toBe(3);
        expect(typeof e.column).toBe('number');
      }
    });
  });

  describe('edge cases', () => {
    it('parses an empty input as a root with a single empty paragraph', () => {
      expect(parse('')).toEqual(doc(p(s(''))));
    });

    it('returns null for null input', () => {
      expect(parse(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(parse(undefined)).toBeNull();
    });

    it('treats whitespace-only input as the empty-document value', () => {
      expect(parse('\n\n')).toEqual(doc(p(s(''))));
    });

    it('handles trailing newlines gracefully', () => {
      expect(parse('hello\n\n')).toEqual(doc(p(s('hello'))));
    });
  });
});
