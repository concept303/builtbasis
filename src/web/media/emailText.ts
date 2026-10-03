import { Parser } from 'htmlparser2';
/** Tokenization only. No DOM, resource loading, links, or active HTML. */
export function htmlToText(html: string): string {
  let hidden = 0;
  const chunks: string[] = [];
  const inert = new Set(['script', 'style', 'template', 'head']);
  const blocks = new Set(['p', 'div', 'br', 'li', 'tr', 'h1', 'h2', 'h3', 'blockquote']);
  const parser = new Parser({
    onopentag(name) { if (inert.has(name)) hidden++; if (!hidden && blocks.has(name)) chunks.push('\n'); },
    ontext(value) { if (!hidden) chunks.push(value); },
    onclosetag(name) { if (inert.has(name)) hidden = Math.max(0, hidden - 1); if (!hidden && blocks.has(name)) chunks.push('\n'); },
  }, { decodeEntities: true });
  parser.end(html);
  return chunks.join('').replace(/\n[ \t]*\n+/g, '\n').trim();
}
