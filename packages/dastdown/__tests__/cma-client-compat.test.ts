import type {
  BlockInNestedResponse,
  ItemTypeDefinition,
  SchemaTypes,
  StructuredTextFieldValue,
  StructuredTextFieldValueInNestedResponse,
} from '@datocms/cma-client';
import { DastdownParseError, parse, serialize } from '../src';
import type { SerializableBlockId } from '../src';

// Pre-set model IDs. Referenced as `typeof X_ID` in the Schema types below
// so every `item_type.data.id` in typed nested-response items is statically
// checked against the model definition.
const QUOTE_BLOCK_ID = 'Aa1Bb2Cc3Dd4Ee5Ff6Gg7H' as const;
const GLOSSARY_TERM_INLINE_ID = 'Hh7Gg6Ff5Ee4Dd3Cc2Bb1A' as const;

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Schema {
  export type QuoteBlock = ItemTypeDefinition<
    { locales: string },
    typeof QUOTE_BLOCK_ID,
    {
      text: { type: 'text' };
      attribution: { type: 'string' };
    }
  >;

  export type GlossaryTermInline = ItemTypeDefinition<
    { locales: string },
    typeof GLOSSARY_TERM_INLINE_ID,
    {
      term: { type: 'string' };
      definition: { type: 'text' };
    }
  >;
}

const baseItemMeta: SchemaTypes.ItemMeta = {
  created_at: '2026-04-27T00:00:00Z',
  updated_at: '2026-04-27T00:00:00Z',
  published_at: null,
  first_published_at: null,
  publication_scheduled_at: null,
  unpublishing_scheduled_at: null,
  status: null,
  is_valid: true,
  is_current_version_valid: null,
  is_published_version_valid: null,
  current_version: '1',
  stage: null,
  has_children: null,
};

function quoteBlockItem(
  id: string,
  attributes: { text: string; attribution: string },
): BlockInNestedResponse<Schema.QuoteBlock> {
  return {
    type: 'item',
    id,
    relationships: {
      item_type: { data: { type: 'item_type', id: QUOTE_BLOCK_ID } },
    },
    meta: baseItemMeta,
    attributes,
  };
}

function glossaryTermInlineItem(
  id: string,
  attributes: { term: string; definition: string },
): BlockInNestedResponse<Schema.GlossaryTermInline> {
  return {
    type: 'item',
    id,
    relationships: {
      item_type: {
        data: { type: 'item_type', id: GLOSSARY_TERM_INLINE_ID },
      },
    },
    meta: baseItemMeta,
    attributes,
  };
}

describe('@datocms/cma-client compatibility', () => {
  describe('compile-time type compatibility', () => {
    // These tests would fail to *compile* if the dastdown public types stopped
    // accepting cma-client's field-value types — that's the whole point. The
    // assertions at runtime are trivial; the compiler is the real check.

    it('serialize accepts StructuredTextFieldValue', () => {
      const value: StructuredTextFieldValue = null;
      expect(serialize(value)).toBe('');
    });

    it('serialize accepts StructuredTextFieldValueInNestedResponse', () => {
      const value: StructuredTextFieldValueInNestedResponse = null;
      expect(serialize(value)).toBe('');
    });

    it('serialize accepts a Schema-parameterized StructuredTextFieldValueInNestedResponse', () => {
      const value: StructuredTextFieldValueInNestedResponse<
        Schema.QuoteBlock,
        Schema.GlossaryTermInline
      > = null;
      expect(serialize(value)).toBe('');
    });

    it("parse's return type is assignable to StructuredTextFieldValue", () => {
      const result = parse('hello');
      const asField: StructuredTextFieldValue = result;
      expect(asField).not.toBeNull();
    });

    it('SerializableBlockId admits both string ids and { id } objects', () => {
      const a: SerializableBlockId = 'string-id';
      const b: SerializableBlockId = { id: 'object-with-id' };
      expect(typeof a).toBe('string');
      expect(typeof b).toBe('object');
    });
  });

  describe('runtime: id extraction from nested-response shape', () => {
    it('extracts id from block.item objects', () => {
      const value: StructuredTextFieldValueInNestedResponse<
        Schema.QuoteBlock,
        Schema.GlossaryTermInline
      > = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'span', value: 'before' }],
            },
            {
              type: 'block',
              item: quoteBlockItem('block-id-123', {
                text: 'A quote.',
                attribution: 'Anonymous',
              }),
            },
          ],
        },
      };

      expect(serialize(value)).toBe('before\n\n<block id="block-id-123"/>\n');
    });

    it('extracts id from inlineBlock.item objects', () => {
      const value: StructuredTextFieldValueInNestedResponse<
        Schema.QuoteBlock,
        Schema.GlossaryTermInline
      > = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'span', value: 'see ' },
                {
                  type: 'inlineBlock',
                  item: glossaryTermInlineItem('inline-block-id-456', {
                    term: 'DAST',
                    definition: 'DatoCMS Abstract Syntax Tree',
                  }),
                },
                { type: 'span', value: ' here' },
              ],
            },
          ],
        },
      };

      expect(serialize(value)).toBe(
        'see <inlineBlock id="inline-block-id-456"/> here\n',
      );
    });

    it('still accepts plain string-id documents (StructuredTextFieldValue)', () => {
      const value: StructuredTextFieldValue = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [{ type: 'block', item: 'plain-string-id' }],
        },
      };
      expect(serialize(value)).toBe('<block id="plain-string-id"/>\n');
    });

    it('returns "" for null', () => {
      const value: StructuredTextFieldValue = null;
      expect(serialize(value)).toBe('');
    });
  });

  describe('parse(serialize(doc), doc) round-trip rehydrates blocks', () => {
    // dastdown only encodes ids on the wire, so a plain `parse(serialize(doc))`
    // round-trip is necessarily lossy: full block items collapse to bare ids.
    // Passing the original document as the second argument lets the parser
    // re-attach the original `item` objects by id, restoring both the runtime
    // values and the static type of the original.

    it('restores block.item objects by id (same reference, identical contents)', () => {
      const blockItem = quoteBlockItem('block-id-789', {
        text: 'Round-tripped.',
        attribution: 'Tester',
      });
      const original: StructuredTextFieldValueInNestedResponse<
        Schema.QuoteBlock,
        Schema.GlossaryTermInline
      > = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'span', value: 'before' }],
            },
            { type: 'block', item: blockItem },
          ],
        },
      };

      const restored = parse(serialize(original), original);

      // Static check: result type follows the second argument.
      const _typed:
        | StructuredTextFieldValueInNestedResponse<
            Schema.QuoteBlock,
            Schema.GlossaryTermInline
          >
        | null
        | undefined = restored;
      void _typed;

      expect(restored).not.toBeNull();
      if (!restored) return;

      const blockNode = restored.document.children.find(
        (c) => c.type === 'block',
      );
      expect(blockNode && blockNode.type === 'block').toBe(true);
      if (!blockNode || blockNode.type !== 'block') return;

      // Same object reference: the original item is reused, not reconstructed.
      expect(blockNode.item).toBe(blockItem);
      expect(blockNode.item.id).toBe('block-id-789');
      expect(blockNode.item.attributes.text).toBe('Round-tripped.');
      expect(blockNode.item.attributes.attribution).toBe('Tester');
    });

    it('restores inlineBlock.item objects by id', () => {
      const inlineItem = glossaryTermInlineItem('inline-id-321', {
        term: 'DAST',
        definition: 'DatoCMS Abstract Syntax Tree',
      });
      const original: StructuredTextFieldValueInNestedResponse<
        Schema.QuoteBlock,
        Schema.GlossaryTermInline
      > = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'span', value: 'see ' },
                { type: 'inlineBlock', item: inlineItem },
                { type: 'span', value: ' here' },
              ],
            },
          ],
        },
      };

      const restored = parse(serialize(original), original);
      expect(restored).not.toBeNull();
      if (!restored) return;

      const para = restored.document.children[0];
      if (para.type !== 'paragraph') throw new Error('expected paragraph');
      const inline = para.children.find((c) => c.type === 'inlineBlock');
      expect(inline && inline.type === 'inlineBlock').toBe(true);
      if (!inline || inline.type !== 'inlineBlock') return;

      expect(inline.item).toBe(inlineItem);
      expect(inline.item.attributes.term).toBe('DAST');
    });

    it('restores blocks and inlineBlocks intermixed in the same document', () => {
      const block1 = quoteBlockItem('q-1', {
        text: 'one',
        attribution: 'A',
      });
      const block2 = quoteBlockItem('q-2', {
        text: 'two',
        attribution: 'B',
      });
      const inline1 = glossaryTermInlineItem('g-1', {
        term: 'API',
        definition: 'Application Programming Interface',
      });

      const original: StructuredTextFieldValueInNestedResponse<
        Schema.QuoteBlock,
        Schema.GlossaryTermInline
      > = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'span', value: 'See ' },
                { type: 'inlineBlock', item: inline1 },
                { type: 'span', value: ' for context.' },
              ],
            },
            { type: 'block', item: block1 },
            {
              type: 'paragraph',
              children: [{ type: 'span', value: 'And:' }],
            },
            { type: 'block', item: block2 },
          ],
        },
      };

      const restored = parse(serialize(original), original);
      expect(restored).not.toBeNull();
      if (!restored) return;

      const blocks = restored.document.children.filter(
        (c): c is { type: 'block'; item: typeof block1 } => c.type === 'block',
      );
      expect(blocks.map((b) => b.item)).toEqual([block1, block2]);

      const firstPara = restored.document.children[0];
      if (firstPara.type !== 'paragraph') throw new Error('expected paragraph');
      const inline = firstPara.children.find((c) => c.type === 'inlineBlock');
      if (!inline || inline.type !== 'inlineBlock') {
        throw new Error('expected inline block');
      }
      expect(inline.item).toBe(inline1);
    });

    it('restores inlineBlock items nested inside a list paragraph', () => {
      const inline = glossaryTermInlineItem('g-2', {
        term: 'CMA',
        definition: 'Content Management API',
      });

      const original: StructuredTextFieldValueInNestedResponse<
        Schema.QuoteBlock,
        Schema.GlossaryTermInline
      > = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'list',
              style: 'bulleted',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        { type: 'span', value: 'use ' },
                        { type: 'inlineBlock', item: inline },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const restored = parse(serialize(original), original);
      expect(restored).not.toBeNull();
      if (!restored) return;

      const list = restored.document.children[0];
      if (list.type !== 'list') throw new Error('expected list');
      const listItem = list.children[0];
      const para = listItem.children[0];
      if (para.type !== 'paragraph') throw new Error('expected paragraph');
      const inlineNode = para.children.find((c) => c.type === 'inlineBlock');
      if (!inlineNode || inlineNode.type !== 'inlineBlock') {
        throw new Error('expected inline block');
      }
      expect(inlineNode.item).toBe(inline);
    });

    it('throws when a serialized id is not present in the original', () => {
      const original: StructuredTextFieldValueInNestedResponse<
        Schema.QuoteBlock,
        Schema.GlossaryTermInline
      > = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            { type: 'paragraph', children: [{ type: 'span', value: 'hi' }] },
          ],
        },
      };

      // The serialized text references "stranger-id" which does NOT exist in
      // the original — restoring it must fail loudly rather than silently
      // dropping back to a string id.
      expect(() => parse('<block id="stranger-id"/>\n', original)).toThrow(
        DastdownParseError,
      );
    });

    it('null/undefined original behaves like the single-argument parse', () => {
      const stringIdResult = parse('<block id="abc"/>\n', null);
      expect(stringIdResult).not.toBeNull();
      if (!stringIdResult) return;
      const block = stringIdResult.document.children[0];
      if (block.type !== 'block') throw new Error('expected block');
      expect(block.item).toBe('abc');

      // Round-tripping a null structured-text value: serialize(null) = '',
      // parse('', null) returns the empty document (no rehydration needed).
      const empty = parse(serialize(null), null);
      expect(empty).not.toBeNull();
    });
  });
});
