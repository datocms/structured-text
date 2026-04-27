import { serialize } from '../src';
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

describe('serialize', () => {
  describe('null / empty input', () => {
    it('returns empty string for null', () => {
      expect(serialize(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(serialize(undefined)).toBe('');
    });

    it('returns empty string for the canonical empty document (paragraph w/ empty span)', () => {
      expect(serialize(doc(p(s(''))))).toBe('');
    });
  });

  describe('paragraph', () => {
    it('serializes a simple paragraph', () => {
      expect(serialize(doc(p(s('hello world'))))).toBe('hello world\n');
    });

    it('emits a style trailer on its own line after the paragraph', () => {
      expect(serialize(doc(pStyled('lead', s('Un paragrafo lead.'))))).toBe(
        'Un paragrafo lead.\n{style="lead"}\n',
      );
    });

    it('separates two paragraphs with a blank line', () => {
      expect(serialize(doc(p(s('one')), p(s('two'))))).toBe('one\n\ntwo\n');
    });
  });

  describe('heading', () => {
    it.each([1, 2, 3, 4, 5, 6] as const)(
      'serializes heading level %i',
      (level) => {
        const hashes = '#'.repeat(level);
        expect(serialize(doc(h(level, s('title'))))).toBe(`${hashes} title\n`);
      },
    );

    it('emits style trailer at end of heading line', () => {
      expect(serialize(doc(hStyled(2, 'display', s('Hello'))))).toBe(
        '## Hello {style="display"}\n',
      );
    });
  });

  describe('list', () => {
    it('serializes a bulleted list with single-paragraph items', () => {
      expect(
        serialize(doc(list('bulleted', li(p(s('one'))), li(p(s('two')))))),
      ).toBe('- one\n- two\n');
    });

    it('serializes a numbered list with single-paragraph items', () => {
      expect(
        serialize(doc(list('numbered', li(p(s('one'))), li(p(s('two')))))),
      ).toBe('1. one\n2. two\n');
    });

    it('indents multi-paragraph list items by 2 spaces', () => {
      expect(
        serialize(
          doc(
            list(
              'bulleted',
              li(p(s('first paragraph')), p(s('second paragraph'))),
            ),
          ),
        ),
      ).toBe('- first paragraph\n\n  second paragraph\n');
    });

    it('serializes nested lists indented by 2 spaces', () => {
      expect(
        serialize(
          doc(
            list(
              'bulleted',
              li(p(s('outer')), list('bulleted', li(p(s('inner'))))),
            ),
          ),
        ),
      ).toBe('- outer\n\n  - inner\n');
    });
  });

  describe('blockquote', () => {
    it('prefixes each line with "> "', () => {
      expect(serialize(doc(bq(undefined, p(s('A quote.')))))).toBe(
        '> A quote.\n',
      );
    });

    it('separates inner paragraphs with a "blank" quoted line', () => {
      expect(serialize(doc(bq(undefined, p(s('one')), p(s('two')))))).toBe(
        '> one\n>\n> two\n',
      );
    });

    it('emits attribution trailer on the line after the block', () => {
      expect(serialize(doc(bq('Oscar Wilde', p(s('Be yourself.')))))).toBe(
        '> Be yourself.\n{attribution="Oscar Wilde"}\n',
      );
    });
  });

  describe('code', () => {
    it('serializes a code block with no language', () => {
      expect(serialize(doc(code(undefined, 'let x = 1;')))).toBe(
        '```\nlet x = 1;\n```\n',
      );
    });

    it('serializes a code block with language', () => {
      expect(serialize(doc(code('javascript', 'let x = 1;')))).toBe(
        '```javascript\nlet x = 1;\n```\n',
      );
    });

    it('serializes a code block with highlight trailer', () => {
      expect(serialize(doc(code('javascript', 'a\nb\nc', [0, 2])))).toBe(
        '```javascript {highlight=[0,2]}\na\nb\nc\n```\n',
      );
    });

    it('grows fence length when the body contains backtick runs of equal length', () => {
      expect(serialize(doc(code('markdown', 'a ``` b')))).toMatch(
        /^````markdown\na ``` b\n````\n$/,
      );
    });

    it('grows fence length further for longer backtick runs', () => {
      expect(serialize(doc(code(undefined, 'x ```` y')))).toMatch(
        /^`````\nx ```` y\n`````\n$/,
      );
    });
  });

  describe('thematic break', () => {
    it('emits ---', () => {
      expect(serialize(doc(thematicBreak()))).toBe('---\n');
    });
  });

  describe('block', () => {
    it('emits a self-closing block tag on its own line', () => {
      expect(serialize(doc(block('999')))).toBe('<block id="999"/>\n');
    });

    it('separates blocks from surrounding content with blank lines', () => {
      expect(serialize(doc(p(s('before')), block('1'), p(s('after'))))).toBe(
        'before\n\n<block id="1"/>\n\nafter\n',
      );
    });
  });

  describe('inline marks (default)', () => {
    it.each([
      ['strong', '**x**'],
      ['emphasis', '*x*'],
      ['code', '`x`'],
      ['strikethrough', '~~x~~'],
      ['highlight', '==x=='],
      ['underline', '++x++'],
    ])('emits %s mark with the right delimiters', (mark, expected) => {
      expect(serialize(doc(p(s('x', [mark]))))).toBe(`${expected}\n`);
    });

    it('nests marks outer-to-inner in canonical order', () => {
      expect(
        serialize(doc(p(s('text', ['strong', 'emphasis', 'highlight'])))),
      ).toBe('==***text***==\n');
    });

    it('serializes all six default marks together', () => {
      expect(
        serialize(
          doc(
            p(
              s('x', [
                'highlight',
                'strikethrough',
                'underline',
                'strong',
                'emphasis',
                'code',
              ]),
            ),
          ),
        ),
      ).toBe('==~~++***`x`***++~~==\n');
    });
  });

  describe('inline marks (custom)', () => {
    it('uses the <m> tag for custom marks', () => {
      expect(serialize(doc(p(s('text', ['footnote-ref']))))).toBe(
        '<m k="footnote-ref">text</m>\n',
      );
    });

    it('places default marks outermost and custom marks innermost', () => {
      expect(
        serialize(doc(p(s('vedi nota', ['strong', 'footnote-ref'])))),
      ).toBe('**<m k="footnote-ref">vedi nota</m>**\n');
    });

    it('nests multiple custom marks alphabetically', () => {
      expect(serialize(doc(p(s('x', ['beta', 'alpha']))))).toBe(
        '<m k="alpha"><m k="beta">x</m></m>\n',
      );
    });
  });

  describe('inline references', () => {
    it('serializes a link without meta', () => {
      expect(
        serialize(doc(p(s('see '), link('https://example.com', [s('here')])))),
      ).toBe('see [here](https://example.com)\n');
    });

    it('serializes a link with meta trailer', () => {
      expect(
        serialize(
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
        ),
      ).toBe('[here](https://example.com){rel="nofollow" target="_blank"}\n');
    });

    it('serializes an itemLink with dato:item/ scheme', () => {
      expect(
        serialize(
          doc(
            p(
              itemLink(
                '555',
                [s('persona', ['strong'])],
                [{ id: 'rel', value: 'nofollow' }],
              ),
            ),
          ),
        ),
      ).toBe('[**persona**](dato:item/555){rel="nofollow"}\n');
    });

    it('serializes inlineItem and inlineBlock as self-closing tags', () => {
      expect(
        serialize(
          doc(p(s('a '), inlineItem('1'), s(' b '), inlineBlock('2'), s(' c'))),
        ),
      ).toBe('a <inlineItem id="1"/> b <inlineBlock id="2"/> c\n');
    });
  });

  describe('escaping', () => {
    it('escapes syntactic characters in span text', () => {
      expect(serialize(doc(p(s('use *literal* asterisks'))))).toBe(
        'use \\*literal\\* asterisks\n',
      );
    });

    it('escapes backslashes', () => {
      expect(serialize(doc(p(s('a\\b'))))).toBe('a\\\\b\n');
    });

    it('escapes left brackets and angle brackets', () => {
      expect(serialize(doc(p(s('[a]<b>'))))).toBe('\\[a\\]\\<b\\>\n');
    });

    it('emits <br/> for a literal \\n inside a span', () => {
      expect(serialize(doc(p(s('first\nsecond'))))).toBe('first<br/>second\n');
    });

    it('escapes a leading # so it is not parsed as a heading', () => {
      expect(serialize(doc(p(s('#not heading'))))).toBe('\\#not heading\n');
    });
  });

  describe('attribute trailer values', () => {
    it('escapes quotes and backslashes inside attribute values', () => {
      expect(
        serialize(
          doc(
            p(
              link(
                'https://example.com',
                [s('x')],
                [{ id: 'title', value: 'a "quoted" \\ value' }],
              ),
            ),
          ),
        ),
      ).toBe('[x](https://example.com){title="a \\"quoted\\" \\\\ value"}\n');
    });

    it('quotes meta keys that are not valid identifiers', () => {
      expect(
        serialize(
          doc(
            p(
              link(
                'https://example.com',
                [s('x')],
                [{ id: 'data foo', value: 'v' }],
              ),
            ),
          ),
        ),
      ).toBe('[x](https://example.com){"data foo"="v"}\n');
    });
  });

  describe('validation', () => {
    it('rejects an invalid document', () => {
      const invalid: import('datocms-structured-text-utils').Document = {
        schema: 'dast',
        document: { type: 'root', children: [] },
      };
      expect(() => serialize(invalid)).toThrow();
    });
  });
});
