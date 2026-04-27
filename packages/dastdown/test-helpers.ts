import {
  Document,
  Root,
  Paragraph,
  Heading,
  Span,
  Link,
  ItemLink,
  InlineItem,
  InlineBlock,
  Block,
  List,
  ListItem,
  Blockquote,
  Code,
  ThematicBreak,
  Mark,
  MetaEntry,
} from 'datocms-structured-text-utils';

export function doc(...children: Root['children']): Document<string, string> {
  return { schema: 'dast', document: { type: 'root', children } };
}

export function p(...children: Paragraph['children']): Paragraph {
  return { type: 'paragraph', children };
}

export function pStyled(
  style: string,
  ...children: Paragraph['children']
): Paragraph {
  return { type: 'paragraph', style, children };
}

export function h(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  ...children: Heading['children']
): Heading {
  return { type: 'heading', level, children };
}

export function hStyled(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  style: string,
  ...children: Heading['children']
): Heading {
  return { type: 'heading', level, style, children };
}

export function s(value: string, marks?: Mark[]): Span {
  return marks ? { type: 'span', value, marks } : { type: 'span', value };
}

export function link(url: string, children: Span[], meta?: MetaEntry[]): Link {
  return meta
    ? { type: 'link', url, meta, children }
    : { type: 'link', url, children };
}

export function itemLink(
  item: string,
  children: Span[],
  meta?: MetaEntry[],
): ItemLink {
  return meta
    ? { type: 'itemLink', item, meta, children }
    : { type: 'itemLink', item, children };
}

export function inlineItem(item: string): InlineItem {
  return { type: 'inlineItem', item };
}

export function inlineBlock(item: string): InlineBlock<string> {
  return { type: 'inlineBlock', item };
}

export function block(item: string): Block<string> {
  return { type: 'block', item };
}

export function list(
  style: 'bulleted' | 'numbered',
  ...children: ListItem[]
): List<string, string> {
  return { type: 'list', style, children };
}

export function li(
  ...children: ListItem['children']
): ListItem<string, string> {
  return { type: 'listItem', children };
}

export function bq(
  attribution: string | undefined,
  ...children: Paragraph[]
): Blockquote {
  return attribution
    ? { type: 'blockquote', attribution, children }
    : { type: 'blockquote', children };
}

export function code(
  language: string | undefined,
  body: string,
  highlight?: number[],
): Code {
  const node: Code = { type: 'code', code: body };
  if (language !== undefined) node.language = language;
  if (highlight !== undefined) node.highlight = highlight;
  return node;
}

export function thematicBreak(): ThematicBreak {
  return { type: 'thematicBreak' };
}
