import { BaseRange } from 'slate';

import {
  Block as FieldBlock,
  Blockquote as FieldBlockquote,
  BlockquoteType,
  BlockType,
  Code as FieldCode,
  CodeType,
  DefaultMark,
  Heading as FieldHeading,
  HeadingType,
  InlineItem as FieldInlineItem,
  InlineItemType,
  ItemLink as FieldItemLink,
  ItemLinkType,
  Link as FieldLink,
  LinkType,
  List as FieldList,
  ListItem as FieldListItem,
  ListItemType,
  ListType,
  Paragraph as FieldParagraph,
  ParagraphType,
  Root,
  Span,
  ThematicBreak as FieldThematicBreak,
  ThematicBreakType,
} from 'datocms-structured-text-utils';

type TextMarks = {
  [key in `customMark_${string}` | DefaultMark]?: boolean;
};

export type Text = {
  text: string;
  emoji?: string;
  codeToken?: string;
} & TextMarks;

export type Block = {
  type: BlockType;
  blockModelId: string;
  id?: string;
  key?: string;
  children: [{ text: '' }];
  [fieldApiKey: string]: unknown;
};

type ChildType<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { children: Array<any> }
> = T['children'] extends (infer U)[] ? U : never;

export type Heading = Omit<FieldHeading, 'children'> & {
  children: Array<ReplaceSlateWithFieldTypes<ChildType<FieldHeading>>>;
};

export type Paragraph = Omit<FieldParagraph, 'children'> & {
  children: Array<ReplaceSlateWithFieldTypes<ChildType<FieldParagraph>>>;
};

export type Link = Omit<FieldLink, 'children'> & {
  children: Array<ReplaceSlateWithFieldTypes<ChildType<FieldLink>>>;
};

export type ItemLink = Omit<FieldItemLink, 'children'> & {
  itemTypeId: string;
  children: Array<ReplaceSlateWithFieldTypes<ChildType<FieldItemLink>>>;
};

export type InlineItem = FieldInlineItem & {
  itemTypeId: string;
  children: [{ text: '' }];
};

export type ThematicBreak = FieldThematicBreak & {
  children: [{ text: '' }];
};

export type Code = Omit<FieldCode, 'code'> & {
  highlight?: number[];
  children: [{ text: string }];
};

export type Blockquote = Omit<FieldBlockquote, 'children'> & {
  author?: string;
  children: Array<
    ReplaceSlateWithFieldTypes<ChildType<FieldBlockquote>> | BlockquoteSource
  >;
};

export type BlockquoteSource = {
  type: 'blockquoteSource';
  children: [{ text: string }];
};

export type ListItem = Omit<FieldListItem, 'children'> & {
  children: Array<ReplaceSlateWithFieldTypes<ChildType<FieldListItem>>>;
};

export type List = Omit<FieldList, 'children'> & {
  children: Array<ReplaceSlateWithFieldTypes<ChildType<FieldList>>>;
};

export type TopLevelElement = ReplaceSlateWithFieldTypes<ChildType<Root>>;

type ReplaceType<T, O, N> = T extends O ? Exclude<T, O> | N : T;

type ReplaceSlateWithFieldTypes<T> = ReplaceType<
  ReplaceType<
    ReplaceType<
      ReplaceType<
        ReplaceType<
          ReplaceType<
            ReplaceType<
              ReplaceType<
                ReplaceType<
                  ReplaceType<
                    ReplaceType<
                      ReplaceType<T, FieldThematicBreak, ThematicBreak>,
                      FieldHeading,
                      Heading
                    >,
                    FieldParagraph,
                    Paragraph
                  >,
                  FieldLink,
                  Link
                >,
                FieldInlineItem,
                InlineItem
              >,
              FieldItemLink,
              ItemLink
            >,
            FieldBlockquote,
            Blockquote
          >,
          FieldList,
          List
        >,
        FieldListItem,
        ListItem
      >,
      FieldCode,
      Code
    >,
    Span,
    Text
  >,
  FieldBlock,
  Block
>;

export type Definition = {
  type: NodeType;
  accepts: 'text' | 'inlineNodesAndText' | NodeType[];
};

export const paragraphDef: Definition = {
  type: 'paragraph',
  accepts: 'inlineNodesAndText',
};

export const headingDef: Definition = {
  type: 'heading',
  accepts: 'inlineNodesAndText',
};

export const thematicBreakDef: Definition = {
  type: 'thematicBreak',
  accepts: [],
};

export const linkDef: Definition = {
  type: 'link',
  accepts: 'inlineNodesAndText',
};

export const itemLinkDef: Definition = {
  type: 'itemLink',
  accepts: 'inlineNodesAndText',
};

export const inlineItemDef: Definition = {
  type: 'inlineItem',
  accepts: [],
};

export const blockDef: Definition = {
  type: 'block',
  accepts: [],
};

export const listDef: Definition = {
  type: 'list',
  accepts: ['listItem'],
};

export const listItemDef: Definition = {
  type: 'listItem',
  accepts: ['paragraph', 'list'],
};

export const blockquoteDef: Definition = {
  type: 'blockquote',
  accepts: ['paragraph', 'blockquoteSource'],
};

export const blockquoteSourceDef: Definition = {
  type: 'blockquoteSource',
  accepts: 'text',
};

export const codeDef: Definition = {
  type: 'code',
  accepts: 'text',
};

type BlockquoteSourceType = 'blockquoteSource';

export const topLevelElements = [
  blockDef,
  blockquoteDef,
  codeDef,
  listDef,
  paragraphDef,
  headingDef,
  thematicBreakDef,
] as const;

export type NonTextNode =
  | Paragraph
  | Heading
  | Link
  | ItemLink
  | InlineItem
  | Block
  | List
  | ListItem
  | Blockquote
  | BlockquoteSource
  | Code
  | ThematicBreak;

export type NodeType =
  | ParagraphType
  | HeadingType
  | LinkType
  | ItemLinkType
  | InlineItemType
  | BlockType
  | ListType
  | ListItemType
  | BlockquoteType
  | BlockquoteSourceType
  | CodeType
  | ThematicBreakType;

export type InlineNode = Link | ItemLink | InlineItem;

export const inlineNodes = [linkDef, itemLinkDef, inlineItemDef];

export type VoidNode = Block | InlineItem | ThematicBreak;

export const voidNodes = [blockDef, inlineItemDef, thematicBreakDef];

export type Node = NonTextNode | Text;

export type BlockNodeWithCustomStyle = Paragraph | Heading;
declare module 'slate' {
  export interface CustomTypes {
    Element: NonTextNode;
    Text: Text;
    Range: BaseRange & { emoji?: string; codeToken?: string };
  }
}

export const nonTextNodeDefs: Record<string, Definition | undefined> = {
  [paragraphDef.type]: paragraphDef,
  [headingDef.type]: headingDef,
  [linkDef.type]: linkDef,
  [itemLinkDef.type]: itemLinkDef,
  [inlineItemDef.type]: inlineItemDef,
  [blockDef.type]: blockDef,
  [listDef.type]: listDef,
  [listItemDef.type]: listItemDef,
  [blockquoteDef.type]: blockquoteDef,
  [blockquoteSourceDef.type]: blockquoteSourceDef,
  [codeDef.type]: codeDef,
  [thematicBreakDef.type]: thematicBreakDef,
};

export const allNodeTypes = (Object.values(
  nonTextNodeDefs,
) as Definition[]).map((def) => def.type);
