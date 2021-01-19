import { Node as Hast } from 'unist';
import parse5 from 'parse5';
import domToHast from 'hast-util-from-parse5';

export function parseHtml(html: string): Hast {
  return domToHast(parse5.parse(html, { sourceCodeLocationInfo: true }));
}
