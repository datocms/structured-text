/* eslint-disable @typescript-eslint/ban-ts-comment */
import { HastRootNode } from './types';
import parse5 from 'parse5';
import domToHast from 'hast-util-from-parse5';

export function parseHtml(html: string): HastRootNode {
  // error TS2322: Type 'Node' is not assignable to type 'HastRootNode'.
  //                    Types of property 'type' are incompatible.
  //                        Type 'string' is not assignable to type '"root"'
  // HastRootNode is the same as Node but more specific.
  // @ts-ignore
  return domToHast(
    parse5.parse(html, {
      sourceCodeLocationInfo: true,
    }),
  );
}
