import { Node as SlateNode } from 'slate';
import {
  Block,
  blockDef,
  Blockquote,
  blockquoteDef,
  blockquoteSourceDef,
  Code,
  codeDef,
  Heading,
  headingDef,
  InlineItem,
  inlineItemDef,
  InlineNode,
  inlineNodes,
  ItemLink,
  itemLinkDef,
  Link,
  linkDef,
  List,
  listDef,
  ListItem,
  listItemDef,
  NonTextNode,
  Paragraph,
  paragraphDef,
  Text,
  ThematicBreak,
  thematicBreakDef,
} from './types';

export const isNonTextNode = (node: SlateNode): node is NonTextNode => {
  return 'type' in node;
};

export const isText = (node: SlateNode): node is Text =>
  !isNonTextNode(node) && 'text' in node;

export const isThematicBreak = (
  element: NonTextNode,
): element is ThematicBreak => element.type === thematicBreakDef.type;

export const isParagraph = (element: NonTextNode): element is Paragraph =>
  element.type === paragraphDef.type;

export const isBlockquoteSource = (
  element: NonTextNode,
): element is Paragraph => element.type === blockquoteSourceDef.type;

export const isHeading = (element: NonTextNode): element is Heading =>
  element.type === headingDef.type;

export const isLink = (element: NonTextNode): element is Link =>
  element.type === linkDef.type;

export const isItemLink = (element: NonTextNode): element is ItemLink =>
  element.type === itemLinkDef.type;

export const isInlineItem = (element: NonTextNode): element is InlineItem =>
  element.type === inlineItemDef.type;

export const isBlock = (element: NonTextNode): element is Block =>
  element.type === blockDef.type;

export const isList = (element: NonTextNode): element is List =>
  element.type === listDef.type;

export const isListItem = (element: NonTextNode): element is ListItem =>
  element.type === listItemDef.type;

export const isBlockquote = (element: NonTextNode): element is Blockquote =>
  element.type === blockquoteDef.type;

export const isCode = (element: NonTextNode): element is Code =>
  element.type === codeDef.type;

export const isInlineNode = (element: NonTextNode): element is InlineNode =>
  inlineNodes.map((def) => def.type).includes(element.type);
