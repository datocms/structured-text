import {
  allowedNodeTypes,
  allowedChildren,
  allowedAttributes,
  isHeading,
  render,
  StructuredText,
  renderRule,
  Node,
  RenderError,
} from '../src';

describe('datocms-structured-text-utils', () => {
  describe('definitions', () => {
    it('are coherent', () => {
      expect(allowedNodeTypes).toEqual(Object.keys(allowedChildren));
      expect(allowedNodeTypes).toEqual(Object.keys(allowedAttributes));
      expect(
        Object.entries(allowedAttributes)
          .filter((entry) => entry[1].includes('children'))
          .map((entry) => entry[0]),
      ).toEqual(
        Object.entries(allowedChildren)
          .filter((entry) => entry[1].length > 0)
          .map((entry) => entry[0]),
      );
      expect(
        Object.entries(allowedAttributes)
          .filter((entry) => !entry[1].includes('children'))
          .map((entry) => entry[0]),
      ).toEqual(
        Object.entries(allowedChildren)
          .filter((entry) => entry[1].length === 0)
          .map((entry) => entry[0]),
      );
    });
  });

  describe('guards', () => {
    it('work as expected', () => {
      expect(isHeading({ type: 'blockquote', children: [] })).toBeFalsy();
      expect(
        isHeading({ type: 'heading', level: 3, children: [] }),
      ).toBeTruthy();
    });
  });

  describe('render', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dummyRenderer = (context: any): any => {
      return context;
    };

    const adapter = {
      renderNode: dummyRenderer,
      renderMark: dummyRenderer,
      renderFragment: (chunks: string[]) => chunks,
      renderText: (text: string) => text,
    };

    describe('null value', () => {
      it('returns null', () => {
        expect(render(adapter, null, [])).toMatchInlineSnapshot(`null`);
      });
    });

    describe('some value', () => {
      const structuredText: StructuredText = {
        value: {
          schema: 'dast',
          document: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  { type: 'span', marks: ['strikethrough'], value: 'Foobar' },
                ],
              },
            ],
          },
        },
        blocks: [],
        links: [],
      };

      describe('no rules', () => {
        it('returns null', () => {
          expect(() => {
            render(adapter, structuredText, []);
          }).toThrow(RenderError);
        });
      });

      describe('some rules', () => {
        it('returns null', () => {
          expect(
            render(adapter, structuredText, [
              renderRule(
                (node: Node): node is Node => true,
                ({ adapter, ...other }) => {
                  return adapter.renderNode(other);
                },
              ),
            ]),
          ).toMatchSnapshot();
        });
      });
    });
  });
});
