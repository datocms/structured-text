import { parse, serialize, canonicalize } from '../src';
import { Document } from 'datocms-structured-text-utils';
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

const fixtures: Array<{ name: string; doc: Document<string, string> }> = [
  {
    name: 'empty document (paragraph with empty span)',
    doc: doc(p(s(''))),
  },
  {
    name: 'plain paragraph',
    doc: doc(p(s('hello world'))),
  },
  {
    name: 'paragraph with style',
    doc: doc(pStyled('lead', s('A lead.'))),
  },
  {
    name: 'all heading levels',
    doc: doc(
      h(1, s('h1')),
      h(2, s('h2')),
      h(3, s('h3')),
      h(4, s('h4')),
      h(5, s('h5')),
      h(6, s('h6')),
    ),
  },
  {
    name: 'heading with style',
    doc: doc(hStyled(2, 'display', s('Hello'))),
  },
  {
    name: 'all six default marks combined on a span',
    doc: doc(
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
  },
  {
    name: 'mixed default and custom marks',
    doc: doc(p(s('see', ['strong', 'footnote-ref']))),
  },
  {
    name: 'multiple custom marks alphabetically nested',
    doc: doc(p(s('x', ['alpha', 'beta', 'gamma']))),
  },
  {
    name: 'link with meta',
    doc: doc(
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
  },
  {
    name: 'itemLink with meta',
    doc: doc(
      p(
        itemLink(
          '555',
          [s('person', ['strong'])],
          [{ id: 'rel', value: 'nofollow' }],
        ),
      ),
    ),
  },
  {
    name: 'inlineItem and inlineBlock interleaved with text',
    doc: doc(p(s('a '), inlineItem('1'), s(' b '), inlineBlock('2'), s(' c'))),
  },
  {
    name: 'document with only a block',
    doc: doc(block('999')),
  },
  {
    name: 'block surrounded by text and headings',
    doc: doc(
      h(2, s('Section')),
      p(s('intro')),
      block('999'),
      p(s('conclusion')),
    ),
  },
  {
    name: 'bulleted list with multi-paragraph and nested items',
    doc: doc(
      list(
        'bulleted',
        li(
          p(s('first')),
          p(s('second paragraph')),
          list('bulleted', li(p(s('nested')))),
        ),
        li(p(s('another'))),
      ),
    ),
  },
  {
    name: 'numbered list',
    doc: doc(
      list('numbered', li(p(s('one'))), li(p(s('two'))), li(p(s('three')))),
    ),
  },
  {
    name: 'blockquote with attribution',
    doc: doc(bq('Oscar Wilde', p(s('Be yourself.')))),
  },
  {
    name: 'multi-paragraph blockquote',
    doc: doc(bq(undefined, p(s('one')), p(s('two')))),
  },
  {
    name: 'code block without language',
    doc: doc(code(undefined, 'plain text')),
  },
  {
    name: 'code block with language and highlight',
    doc: doc(code('javascript', 'function f() {\n  return 1;\n}', [0, 2])),
  },
  {
    name: 'code block containing triple backticks',
    doc: doc(code('markdown', 'Esempio: ```js\nconst x = 1;\n```')),
  },
  {
    name: 'thematic break between paragraphs',
    doc: doc(p(s('before')), thematicBreak(), p(s('after'))),
  },
  {
    name: 'span with newline (br)',
    doc: doc(p(s('first\nsecond'))),
  },
  {
    name: 'spans with adversarial syntactic characters',
    doc: doc(
      p(s('star * bracket [ paren ( angle < hash # equals = backslash \\')),
    ),
  },
  {
    name: 'heading containing inlineItem',
    doc: doc(hStyled(2, 'display', s('Welcome, '), inlineItem('1'))),
  },
  {
    name: 'attribute trailer values needing escaping',
    doc: doc(
      p(
        link(
          'https://example.com',
          [s('x')],
          [{ id: 'title', value: 'a "quoted" \\ value' }],
        ),
      ),
    ),
  },
  {
    name: 'composite document from spec §11.1',
    doc: doc(
      hStyled(2, 'display', s('Benvenuti, '), inlineItem('324321')),
      p(
        s('Siamo felici di avere '),
        itemLink(
          '555',
          [s('questa persona', ['strong'])],
          [{ id: 'rel', value: 'nofollow' }],
        ),
        s(' nel team. '),
        s('Vedi anche', ['strong', 'highlight']),
        s(':'),
      ),
      block('999'),
      bq('I. Calvino', p(s('Una citazione.'))),
    ),
  },
];

describe('round-trip', () => {
  describe('parse(serialize(d)) ≡ canonicalize(d)', () => {
    it.each(fixtures)('$name', ({ doc: d }) => {
      const text = serialize(d);
      const reparsed = parse(text);
      expect(reparsed).toEqual(canonicalize(d));
    });
  });

  describe('idempotency: parse(serialize(parse(serialize(d)))) ≡ parse(serialize(d))', () => {
    it.each(fixtures)('$name', ({ doc: d }) => {
      const once = parse(serialize(d));
      const twice = parse(serialize(once));
      expect(twice).toEqual(once);
    });
  });

  describe('text-level idempotency: serialize(parse(text)) ≡ text after one pass', () => {
    it.each(fixtures)('$name', ({ doc: d }) => {
      const text1 = serialize(d);
      const text2 = serialize(parse(text1));
      expect(text2).toBe(text1);
    });
  });

  describe('null / empty input boundary', () => {
    it('parse("") then serialize → ""', () => {
      const parsed = parse('');
      expect(parsed).toEqual(doc(p(s(''))));
      expect(serialize(parsed)).toBe('');
    });

    it('parse(null) → null; serialize(null) → ""', () => {
      expect(parse(null)).toBeNull();
      expect(serialize(parse(null))).toBe('');
    });

    it('parse(undefined) → null; serialize(null) → ""', () => {
      expect(parse(undefined)).toBeNull();
      expect(serialize(parse(undefined))).toBe('');
    });
  });
});
