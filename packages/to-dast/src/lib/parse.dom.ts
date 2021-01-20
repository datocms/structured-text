import { HastRootNode } from './types';
import domToHast from 'hast-util-from-dom';

export function parseHtml(html: string): HastRootNode {
  // error TS2322: Type 'Node' is not assignable to type 'HastRootNode'.
  //                    Types of property 'type' are incompatible.
  //                        Type 'string' is not assignable to type '"root"'
  // HastRootNode is the same as Node but more specific.
  // @ts-ignore
  return domToHast(new DOMParser().parseFromString(html, 'text/html'));
}
