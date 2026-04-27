import type {
  StructuredTextFieldValue,
  StructuredTextFieldValueInNestedResponse,
} from '@datocms/cma-client';
import { parse, serialize } from '../src';
import type { SerializableBlockId } from '../src';

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

    it('serialize accepts a parameterized StructuredTextFieldValueInNestedResponse', () => {
      type AnyItemTypeDef = import('@datocms/cma-client').ItemTypeDefinition;
      const value: StructuredTextFieldValueInNestedResponse<
        AnyItemTypeDef,
        AnyItemTypeDef
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
    // We use `as unknown as` casts to skip building full Item objects (which
    // require ~15 fields). The compile-time block above already verifies that
    // the fully-typed version is accepted; here we only need to confirm that
    // serialize reads `.id` from object items at runtime.

    it('extracts id from block.item objects', () => {
      const value = ({
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'span', value: 'before' }],
            },
            { type: 'block', item: { id: 'block-id-123' } },
          ],
        },
      } as unknown) as StructuredTextFieldValueInNestedResponse;

      expect(serialize(value)).toBe('before\n\n<block id="block-id-123"/>\n');
    });

    it('extracts id from inlineBlock.item objects', () => {
      const value = ({
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
                  item: { id: 'inline-block-id-456' },
                },
                { type: 'span', value: ' here' },
              ],
            },
          ],
        },
      } as unknown) as StructuredTextFieldValueInNestedResponse;

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
});
