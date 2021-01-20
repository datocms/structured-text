import { Node as Hast } from 'unist';

declare module 'rehype-minify-whitespace' {
  export default function minify(settings: any): (tree: Hast) => void;
}
