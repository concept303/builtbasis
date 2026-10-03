import { expect, it } from 'vitest';
import { detectFormat } from '../../src/server/files/formats';
import { OLE, ZIP } from './file-fixture';
it.each([
 ['file.xlsm',ZIP],['model.ifc',Buffer.from('ISO-10303-21;')],['model.rvt',Buffer.from('synthetic native data')],
 ['archive.zip',ZIP],['archive.rar',Buffer.from('Rar!\x1a\x07\x00')],['library.a',Buffer.from('!<arch>\n')],['material.mat',Buffer.from('synthetic native data')],
 ['mail.eml',Buffer.from('From: a@example.test\r\nSubject: Hello\r\n\r\nMessage')],['mail.msg',OLE],
 ['image.svg',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
 ['image.gif',Buffer.from('GIF89a')],['image.webp',Buffer.from('RIFF0000WEBP')],
 ['video.mp4',Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(12)])],
 ['audio.mp3',Buffer.from('ID3\x04\x00\x00')],['audio.wav',Buffer.from('RIFF0000WAVE')],
] as [string,Buffer][])('accepts the approved storage format %s', (filename,bytes) => {
 expect(() => detectFormat(bytes,filename,'attachment')).not.toThrow();
});
it('uses content-derived canonical storage types for identical bytes under different allowed extensions', () => {
 const bytes=Buffer.from('%PDF-1.7\nfixture');
 expect(detectFormat(bytes,'a.txt','attachment')).toBe(detectFormat(bytes,'a.pdf','attachment'));
});
it.each(['bad.html','bad.js','bad.exe','bad.docm'])('rejects an extension outside the approved catalog: %s', filename => {
 expect(() => detectFormat(Buffer.from('hello'),filename,'attachment')).toThrow();
});
it('accepts ordinary SVG declarations and comments before its root element', () => {
  const bytes = Buffer.from('<?xml version="1.0" encoding="utf-8"?>\n<!-- authored by drawing tool -->\n<svg xmlns="http://www.w3.org/2000/svg"/>');
  expect(detectFormat(bytes,'drawing.svg','attachment')).toBe('image/svg+xml');
});
it('accepts new DWG versions as opaque download-only evidence without claiming validation', () => {
  expect(detectFormat(Buffer.from('AC9999'),'future.dwg','attachment')).toBe('application/octet-stream');
});
