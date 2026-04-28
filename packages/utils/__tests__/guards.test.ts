import type {
  ApiTypes,
  BlockInRequest,
  ItemTypeDefinition,
  NewBlockInRequest,
  UpdatedBlockInRequest,
} from '@datocms/cma-client';
import {
  isBlockWithItemOfType,
  isInlineBlockWithItemOfType,
  NarrowBlockItemByItemType,
  Node,
} from '../src';

// Mirrors the schema in the user-facing example: an Article with a
// structured_text field that allows two block models and one inline-block
// model.
type EnvironmentSettings = { locales: 'en' };

type CtaBlock = ItemTypeDefinition<
  EnvironmentSettings,
  'cta-block-id',
  {
    title: { type: 'string' };
    button_url: { type: 'string' };
  }
>;

type ImageGalleryBlock = ItemTypeDefinition<
  EnvironmentSettings,
  'image-gallery-id',
  {
    title: { type: 'string' };
  }
>;

type ProductMentionInline = ItemTypeDefinition<
  EnvironmentSettings,
  'product-mention-id',
  {
    product_name: { type: 'string' };
  }
>;

type Article = ItemTypeDefinition<
  EnvironmentSettings,
  'article-id',
  {
    content: {
      type: 'structured_text';
      blocks: CtaBlock | ImageGalleryBlock;
      inline_blocks: ProductMentionInline;
    };
  }
>;

type ArticleContent = NonNullable<
  ApiTypes.ItemUpdateSchema<Article>['content']
>;
type RequestNode = Node<
  BlockInRequest<CtaBlock | ImageGalleryBlock>,
  BlockInRequest<ProductMentionInline>
>;

const CTA_BLOCK_ID = 'cta-block-id' as const;
const PRODUCT_MENTION_ID = 'product-mention-id' as const;

// Helper that triggers a compile error if `Actual` is not assignable
// to `Expected`. Runtime is a no-op; the assertion lives at the type level.
function expectAssignable<Expected>(): <Actual extends Expected>(
  _actual?: Actual,
) => void {
  return () => undefined;
}

describe('NarrowBlockItemByItemType (request payload shape from @datocms/cma-client)', () => {
  it('keeps both UpdatedBlockInRequest and NewBlockInRequest variants for the matching item_type', () => {
    type Narrowed = NarrowBlockItemByItemType<
      BlockInRequest<CtaBlock>,
      'cta-block-id'
    >;

    expectAssignable<Narrowed>()(
      {} as UpdatedBlockInRequest<CtaBlock> | NewBlockInRequest<CtaBlock>,
    );
    expectAssignable<
      UpdatedBlockInRequest<CtaBlock> | NewBlockInRequest<CtaBlock>
    >()({} as Narrowed);
  });

  it('distributes the inner D when the field allows a union of block models', () => {
    // Mirrors `Article.content.blocks: CtaBlock | ImageGalleryBlock`.
    type Narrowed = NarrowBlockItemByItemType<
      BlockInRequest<CtaBlock | ImageGalleryBlock>,
      'cta-block-id'
    >;

    // The narrow should pick out the CtaBlock-specific variants only,
    // distributing through the inner `D` parameter.
    expectAssignable<Narrowed>()(
      {} as UpdatedBlockInRequest<CtaBlock> | NewBlockInRequest<CtaBlock>,
    );
    expectAssignable<
      UpdatedBlockInRequest<CtaBlock> | NewBlockInRequest<CtaBlock>
    >()({} as Narrowed);
  });

  it('filters out the bare-string (UnchangedBlockInRequest) variant', () => {
    type Narrowed = NarrowBlockItemByItemType<
      BlockInRequest<CtaBlock>,
      'cta-block-id'
    >;

    // A `string` is not assignable to the narrowed object-only union.
    // @ts-expect-error — bare-string variants must be filtered out.
    expectAssignable<Narrowed>()('some-block-id' as string);
  });
});

describe('isBlockWithItemOfType / isInlineBlockWithItemOfType (request payload shape)', () => {
  it('narrows `node.item` to the model-specific request variants for a block', () => {
    const node = {
      type: 'block',
      item: {
        type: 'item' as const,
        id: 'block-1',
        relationships: {
          item_type: {
            data: { type: 'item_type' as const, id: CTA_BLOCK_ID },
          },
        },
        attributes: { title: 'Hi', button_url: 'https://example.com' },
      },
    } as RequestNode;

    if (isBlockWithItemOfType(CTA_BLOCK_ID, node)) {
      // After the model-narrow, `node.item.attributes` is CtaBlock-specific —
      // accessing a field that exists only on CtaBlock must compile.
      const buttonUrl: string | null | undefined =
        node.item.attributes.button_url;
      expect(buttonUrl).toBe('https://example.com');

      // `id` lives on UpdatedBlockInRequest only (not on NewBlockInRequest),
      // so a second narrow is required to reach it. This is intentional:
      // a structured_text field may legitimately carry blocks that have not
      // yet been saved (i.e. NewBlockInRequest, no `id`).
      if ('id' in node.item) {
        const id: string = node.item.id;
        expect(id).toBe('block-1');
      } else {
        throw new Error('expected an UpdatedBlockInRequest at runtime');
      }
    } else {
      throw new Error('guard unexpectedly returned false at runtime');
    }
  });

  it('narrows `node.item` to the model-specific request variants for an inlineBlock', () => {
    const node = {
      type: 'inlineBlock',
      item: {
        type: 'item' as const,
        id: 'inline-1',
        relationships: {
          item_type: {
            data: { type: 'item_type' as const, id: PRODUCT_MENTION_ID },
          },
        },
        attributes: { product_name: 'Widget' },
      },
    } as RequestNode;

    if (isInlineBlockWithItemOfType(PRODUCT_MENTION_ID, node)) {
      const productName: string | null | undefined =
        node.item.attributes.product_name;
      expect(productName).toBe('Widget');

      if ('id' in node.item) {
        const id: string = node.item.id;
        expect(id).toBe('inline-1');
      } else {
        throw new Error('expected an UpdatedBlockInRequest at runtime');
      }
    } else {
      throw new Error('guard unexpectedly returned false at runtime');
    }
  });
});

// Reference the request-shape type so it isn't dropped as unused — this
// also documents the type the user's `mapNodes` example actually flows
// through (`NonNullable<ApiTypes.ItemUpdateSchema<Article>['content']>`).
export type _Reference = ArticleContent;
