import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { stageFile } from '../../src/server/files/storage';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'bb-svg-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
const prolog = '\uFEFF<?xml version="1.0"' + ' '.repeat(2048) + '?>\n<!--' + 'drawing export '.repeat(300) + '-->\n<?tool exported?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "https://example.invalid/svg.dtd" [<!-- bracket [ and quote " and > stay inside comment --><?tool ] [ " ?><!ENTITY label "a > [ b">]>\n';
const svg = Buffer.from(prolog + '<svg xmlns="http://www.w3.org/2000/svg"/>');
it.each([1, 7, 511, 4096])('recognizes SVG beyond the signature prefix with %i-byte chunks and filename-independent MIME', async width => {
  const chunks = () => Array.from({ length: Math.ceil(svg.length / width) }, (_, i) => svg.subarray(i * width, (i + 1) * width));
  const generic = await stageFile(dir, Readable.from(chunks()), 'drawing.txt', 'attachment');
  const image = await stageFile(dir, Readable.from(chunks()), 'drawing.svg', 'attachment');
  expect(generic.contentType).toBe('image/svg+xml');
  expect(image.contentType).toBe(generic.contentType);
  expect(image.hash).toBe(generic.hash);
});
it.each([
  '<!--' + 'x'.repeat(4096) + '--><html><svg/></html>',
  '<!-- incomplete <svg/>', '<?xml version="1.0" <svg/>',
  '<!-- bad -- comment --><svg/>', '<!DOCTYPE html><svg/>',
  '<!DOCTYPE svg [<!ENTITY x "open>]><svg/>', '<svgish/>', '<SVG/>', '<svg/no>',
  'not XML <svg/>', '<!garbage><svg/>',
])('rejects wrong roots and malformed or unfinished SVG prologs (case %#)', async text => {
  const bytes = Buffer.from(text);
  await expect(stageFile(dir, Readable.from(Array.from(bytes, b => Buffer.from([b]))), 'drawing.svg', 'attachment'))
    .rejects.toMatchObject({ statusCode: 415 });
});
