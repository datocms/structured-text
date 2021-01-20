import { Node as Hast } from 'unist';

// @ts-ignore
declare module 'rehype-minify-whitespace' {
  export default function minify(settings: any): (tree: Hast) => void;
}
