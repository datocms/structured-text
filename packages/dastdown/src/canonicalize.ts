import {
  Blockquote,
  Document,
  Heading,
  InlineNode,
  List,
  ListItem,
  Mark,
  DefaultMark,
  Paragraph,
  Root,
  Span,
  defaultMarks,
} from 'datocms-structured-text-utils';

const DEFAULT_MARK_OUTER_TO_INNER: DefaultMark[] = [
  'highlight',
  'strikethrough',
  'underline',
  'strong',
  'emphasis',
  'code',
];

const DEFAULT_MARK_INDEX: Record<
  string,
  number
> = DEFAULT_MARK_OUTER_TO_INNER.reduce((acc, m, i) => {
  acc[m] = i;
  return acc;
}, {} as Record<string, number>);

const DEFAULT_MARK_SET: Set<string> = new Set(defaultMarks);

export function sortMarks(marks: Mark[]): Mark[] {
  const defaults: Mark[] = [];
  const customs: Mark[] = [];
  for (const m of marks) {
    if (DEFAULT_MARK_SET.has(m)) defaults.push(m);
    else customs.push(m);
  }
  defaults.sort((a, b) => DEFAULT_MARK_INDEX[a] - DEFAULT_MARK_INDEX[b]);
  customs.sort();
  return [...defaults, ...customs];
}

function uniqueMarks(marks: Mark[]): Mark[] {
  const seen = new Set<Mark>();
  const out: Mark[] = [];
  for (const m of marks) {
    if (!seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

export function marksKey(marks: Mark[] | undefined): string {
  if (!marks || marks.length === 0) return '';
  return [...marks].sort().join('\x1f');
}

function normalizeSpan(span: Span): Span {
  const marks = span.marks ? sortMarks(uniqueMarks(span.marks)) : undefined;
  if (marks && marks.length > 0) {
    return { type: 'span', value: span.value, marks };
  }
  return { type: 'span', value: span.value };
}

function coalesceSpans(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const raw of spans) {
    const span = normalizeSpan(raw);
    if (span.value === '') continue;
    const last = out[out.length - 1];
    if (last && marksKey(last.marks) === marksKey(span.marks)) {
      last.value = last.value + span.value;
    } else {
      out.push({ ...span });
    }
  }
  // Preserve the "≥1 child" invariant: if every span was empty, keep one so
  // the parent (paragraph/heading/link) doesn't end up with an empty children
  // array (which would be invalid per the dast schema).
  if (out.length === 0 && spans.length > 0) {
    out.push({ type: 'span', value: '' });
  }
  return out;
}

function canonicalizeInlineChildren<IB>(
  children: Array<InlineNode<IB>>,
): Array<InlineNode<IB>> {
  // Walk children, normalizing spans as a contiguous batch and recursing into
  // link / itemLink. Other inline nodes (inlineItem, inlineBlock) pass through.
  const out: Array<InlineNode<IB>> = [];
  let buffer: Span[] = [];
  const flush = (): void => {
    if (buffer.length > 0) {
      out.push(...coalesceSpans(buffer));
      buffer = [];
    }
  };
  for (const child of children) {
    if (child.type === 'span') {
      buffer.push(child);
    } else if (child.type === 'link' || child.type === 'itemLink') {
      flush();
      out.push({
        ...child,
        children: coalesceSpans(child.children),
      });
    } else {
      flush();
      out.push(child);
    }
  }
  flush();
  return out;
}

function canonicalizeParagraph<IB>(node: Paragraph<IB>): Paragraph<IB> {
  return { ...node, children: canonicalizeInlineChildren(node.children) };
}

function canonicalizeHeading<IB>(node: Heading<IB>): Heading<IB> {
  return { ...node, children: canonicalizeInlineChildren(node.children) };
}

function canonicalizeBlockquote<IB>(node: Blockquote<IB>): Blockquote<IB> {
  return { ...node, children: node.children.map(canonicalizeParagraph) };
}

function canonicalizeListItem<B, IB>(node: ListItem<B, IB>): ListItem<B, IB> {
  return {
    ...node,
    children: node.children.map((child) =>
      child.type === 'list'
        ? canonicalizeList(child)
        : canonicalizeParagraph(child),
    ),
  };
}

function canonicalizeList<B, IB>(node: List<B, IB>): List<B, IB> {
  return { ...node, children: node.children.map(canonicalizeListItem) };
}

function canonicalizeRootChild<B, IB>(
  node: Root<B, IB>['children'][number],
): Root<B, IB>['children'][number] {
  switch (node.type) {
    case 'paragraph':
      return canonicalizeParagraph(node);
    case 'heading':
      return canonicalizeHeading(node);
    case 'list':
      return canonicalizeList(node);
    case 'blockquote':
      return canonicalizeBlockquote(node);
    default:
      return node;
  }
}

export function canonicalize<B = string, IB = string>(
  document: Document<B, IB>,
): Document<B, IB> {
  return {
    schema: 'dast',
    document: {
      type: 'root',
      children: document.document.children.map(canonicalizeRootChild),
    },
  };
}
