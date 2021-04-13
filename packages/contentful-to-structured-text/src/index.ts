import { isBlock } from 'datocms-structured-text-utils';

export async function richTextToStructuredText(): Promise<boolean> {
  if (isBlock({ type: 'blockquote', children: [] })) {
    return true;
  }

  return false;
}
