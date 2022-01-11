import {
  allowedAttributes,
  defaultMarks,
  BlockType,
  Blockquote as FieldBlockquote,
  Code as FieldCode,
  Document as FieldDocument,
  InlineItem as FieldInlineItem,
  ItemLink as FieldItemLink,
  Mark,
  Span as FieldSpan,
  DefaultMark,
} from 'datocms-structured-text-utils';
import pick from 'lodash-es/pick';
import {
  isBlock,
  isBlockquote,
  isBlockquoteSource,
  isCode,
  isInlineItem,
  isItemLink,
  isLink,
  isText,
  isThematicBreak,
} from './guards';
import { Block, BlockquoteSource, Node, nonTextNodeDefs } from './types';

type FieldBlockWithFullItem = {
  type: BlockType;
  /** The DatoCMS block record ID */
  item: Record<string, unknown>;
};

function innerSerialize(
  nodes: Node[],
  convertBlock: (block: Block) => FieldBlockWithFullItem,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  return nodes.map((node: Node) => {
    if (isText(node)) {
      const marks: Mark[] = [];

      Object.keys(node).forEach((key) => {
        if (defaultMarks.includes(key as DefaultMark)) {
          marks.push(key);
        }

        if (key.startsWith('customMark_')) {
          marks.push(key.replace(/^customMark_/, ''));
        }
      });

      const value = node.text.replace(/\uFEFF/g, '');

      const fieldSpan: FieldSpan = {
        type: 'span',
        // Code block creates \uFEFF char to prevent a bug!
        value,
        marks: marks.length > 0 ? marks : undefined,
      };

      return fieldSpan;
    }

    const element = nonTextNodeDefs[node.type];

    if (!element) {
      throw new Error(`Don't know how to serialize block of type ${node.type}`);
    }

    if (isBlock(node)) {
      return convertBlock(node);
    }

    if (isCode(node)) {
      const codeBlock: FieldCode = {
        type: 'code',
        code: node.children[0].text,
        highlight: node.highlight,
        language: node.language,
      };

      return codeBlock;
    }

    if (isBlockquote(node)) {
      const childrenWithoutSource = node.children.filter(
        (n) => !isBlockquoteSource(n),
      );
      const sourceNode = node.children.find((n) =>
        isBlockquoteSource(n),
      ) as BlockquoteSource;

      const blockquoteNode: FieldBlockquote = {
        type: 'blockquote',
        children: innerSerialize(childrenWithoutSource, convertBlock),
      };

      if (sourceNode) {
        blockquoteNode.attribution = sourceNode.children[0].text;
      }

      return blockquoteNode;
    }

    if (isInlineItem(node)) {
      const inlineItemNode: FieldInlineItem = {
        type: 'inlineItem',
        item: node.item,
      };

      return inlineItemNode;
    }

    if (isItemLink(node)) {
      const itemLinkNode: FieldItemLink = {
        type: 'itemLink',
        item: node.item,
        meta: node.meta,
        children: innerSerialize(node.children, convertBlock),
      };

      return itemLinkNode;
    }

    if (isThematicBreak(node)) {
      return { type: 'thematicBreak' };
    }

    if (node.type === 'blockquoteSource') {
      return node;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serializedNode: any = {
      type: node.type,
      ...pick(node, allowedAttributes[node.type]),
    };

    if (allowedAttributes[node.type].includes('children')) {
      serializedNode.children = innerSerialize(node.children, convertBlock);
    }

    if (isLink(node) && node.meta && node.meta.length > 0) {
      serializedNode.meta = node.meta;
    }

    return serializedNode;
  });
}

type Item = {
  id?: string;
  type: 'item';
  attributes: Record<string, unknown>;
  relationships: {
    item_type: {
      data: {
        id: string;
        type: 'item_type';
      };
    };
  };
};

export function slateToDast(
  nodes: Node[] | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allFieldsByItemTypeId: Record<string, any[]>,
): FieldDocument | null {
  if (!nodes || nodes.length === 0) {
    return null;
  }

  const children = innerSerialize(nodes, (node: Block) => {
    const { blockModelId, id, ...blockAttributes } = node;

    const recordAttributes: Record<string, unknown> = {};

    allFieldsByItemTypeId[blockModelId].forEach((field) => {
      const apiKey = field.attributes.api_key;

      if (field.attributes.field_type === 'structured_text') {
        recordAttributes[apiKey] = slateToDast(
          (blockAttributes[apiKey] as unknown) as Node[],
          allFieldsByItemTypeId,
        );
      } else if (blockAttributes[apiKey] === '__NULL_VALUE__') {
        recordAttributes[apiKey] = null;
      } else {
        recordAttributes[apiKey] = blockAttributes[apiKey];
      }
    });

    const record: Item = {
      type: 'item',
      attributes: recordAttributes,
      relationships: {
        item_type: {
          data: {
            id: blockModelId,
            type: 'item_type',
          },
        },
      },
    };

    if (id) {
      record.id = id;
    }

    const fieldBlock: FieldBlockWithFullItem = {
      type: 'block',
      item: record,
    };

    return fieldBlock;
  });

  return {
    schema: 'dast',
    document: { type: 'root', children },
  };
}
