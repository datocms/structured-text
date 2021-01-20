/* eslint-disable @typescript-eslint/ban-ts-comment */
import { HastRootNode } from './types';
// There are no public declarations for 'hast-util-from-dom'
// @ts-ignore
import domToHast from 'hast-util-from-dom';

export function parseHtml(html: string): HastRootNode {
  return domToHast(new DOMParser().parseFromString(html, 'text/html'));
}
