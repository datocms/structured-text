import { canonicalize } from '../src';
import { doc, p, h, s, link, bq } from '../test-helpers';

describe('canonicalize', () => {
  it('returns a structurally equal document for an already-canonical input', () => {
    const d = doc(p(s('hello')));
    expect(canonicalize(d)).toEqual(d);
  });

  describe('span normalization', () => {
    it('removes spans with empty value', () => {
      const d = doc(p(s('foo', ['strong']), s(''), s('bar', ['emphasis'])));
      expect(canonicalize(d)).toEqual(
        doc(p(s('foo', ['strong']), s('bar', ['emphasis']))),
      );
    });

    it('coalesces adjacent spans with identical mark sets', () => {
      const d = doc(p(s('foo', ['strong']), s('bar', ['strong'])));
      expect(canonicalize(d)).toEqual(doc(p(s('foobar', ['strong']))));
    });

    it('coalesces adjacent spans with no marks', () => {
      const d = doc(p(s('foo'), s('bar'), s('baz')));
      expect(canonicalize(d)).toEqual(doc(p(s('foobarbaz'))));
    });

    it('treats undefined and empty marks as equivalent for coalescing', () => {
      const d = doc(p(s('foo'), s('bar', [])));
      expect(canonicalize(d)).toEqual(doc(p(s('foobar'))));
    });

    it('does not coalesce adjacent spans with different mark sets', () => {
      const d = doc(p(s('foo', ['strong']), s('bar', ['emphasis'])));
      expect(canonicalize(d)).toEqual(d);
    });

    it('coalesces only structurally equivalent mark sets regardless of order', () => {
      const d = doc(
        p(s('foo', ['strong', 'emphasis']), s('bar', ['emphasis', 'strong'])),
      );
      const result = canonicalize(d);
      expect(result.document.children).toHaveLength(1);
      const para = result.document.children[0] as {
        children: Array<{ value: string; marks: string[] }>;
      };
      expect(para.children).toHaveLength(1);
      expect(para.children[0].value).toBe('foobar');
      expect(para.children[0].marks).toEqual(['strong', 'emphasis']);
    });

    it('drops empty spans before coalescing neighbours', () => {
      const d = doc(
        p(s('foo', ['strong']), s('', ['emphasis']), s('bar', ['strong'])),
      );
      expect(canonicalize(d)).toEqual(doc(p(s('foobar', ['strong']))));
    });
  });

  describe('mark order normalization', () => {
    it('sorts default marks in canonical outer-to-inner order', () => {
      const d = doc(
        p(
          s('x', [
            'code',
            'emphasis',
            'strong',
            'underline',
            'strikethrough',
            'highlight',
          ]),
        ),
      );
      const result = canonicalize(d);
      const span = (result.document.children[0] as {
        children: Array<{ marks: string[] }>;
      }).children[0];
      expect(span.marks).toEqual([
        'highlight',
        'strikethrough',
        'underline',
        'strong',
        'emphasis',
        'code',
      ]);
    });

    it('places custom marks after default marks, alphabetically sorted', () => {
      const d = doc(p(s('x', ['zeta-mark', 'alpha-mark', 'strong'])));
      const result = canonicalize(d);
      const span = (result.document.children[0] as {
        children: Array<{ marks: string[] }>;
      }).children[0];
      expect(span.marks).toEqual(['strong', 'alpha-mark', 'zeta-mark']);
    });

    it('handles spans with only custom marks', () => {
      const d = doc(p(s('x', ['gamma', 'alpha', 'beta'])));
      const result = canonicalize(d);
      const span = (result.document.children[0] as {
        children: Array<{ marks: string[] }>;
      }).children[0];
      expect(span.marks).toEqual(['alpha', 'beta', 'gamma']);
    });
  });

  describe('meta preservation', () => {
    it('preserves meta entry order on links', () => {
      const d = doc(
        p(
          link(
            'https://example.com',
            [s('x')],
            [
              { id: 'rel', value: 'nofollow' },
              { id: 'target', value: '_blank' },
            ],
          ),
        ),
      );
      const result = canonicalize(d);
      const linkNode = (result.document.children[0] as {
        children: Array<{ meta: Array<{ id: string }> }>;
      }).children[0];
      expect(linkNode.meta.map((m) => m.id)).toEqual(['rel', 'target']);
    });
  });

  describe('recursion', () => {
    it('canonicalizes nested structures (blockquote → paragraph → spans)', () => {
      const d = doc(
        bq(undefined, p(s('hello ', ['strong']), s('world', ['strong']))),
      );
      expect(canonicalize(d)).toEqual(
        doc(bq(undefined, p(s('hello world', ['strong'])))),
      );
    });

    it('keeps headings without modifying their level/style', () => {
      const d = doc(h(2, s('title')));
      expect(canonicalize(d)).toEqual(d);
    });
  });

  it('is idempotent', () => {
    const d = doc(
      p(
        s('a', ['code', 'strong']),
        s('', ['strong']),
        s('b', ['code', 'strong']),
      ),
    );
    const once = canonicalize(d);
    const twice = canonicalize(once);
    expect(twice).toEqual(once);
  });
});
