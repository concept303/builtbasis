import { afterEach, beforeEach, expect, it } from 'vitest';
import { makeFixture, postRecord, recordUrl, forceStatus, type Fixture } from './record-fixture';
import { addAttachment, PDF, JPEG, ZIP } from './file-fixture';
import { send } from './helpers';
let f: Fixture;
let id: number;
let token: string;
beforeEach(async () => {
  f = await makeFixture(); id = (await postRecord(f, { subtype: 'task', title: 'Media' })).id;
  forceStatus(f, id, 'open');
  const link = await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'Media reader' });
  token = link.json().url.split('#')[1];
});
afterEach(async () => { await f.ctx.close(); });
function read(file: number, suffix: string, audience: 'owner' | 'shared' = 'owner', method: 'GET' | 'HEAD' = 'GET', headers: Record<string,string> = {}) {
  return f.ctx.app.inject({ method, url: audience === 'owner' ? recordUrl(f, id, `/attachments/${file}/${suffix}`) : `/api/shared/attachments/${file}/${suffix}`,
    headers: { ...(audience === 'owner' ? {cookie:f.cookie} : {authorization:`Bearer ${token}`}), ...headers } });
}
it('describes and serves native PDF and image previews without exposing blob paths', async () => {
  for (const [filename, bytes, kind] of [['a.pdf',PDF,'pdf'],['a.jpg',JPEG,'image']] as const) {
    const file = await addAttachment(f,id,{},filename,bytes);
    expect(file.capabilities).toMatchObject({kind,view:'native',download:true});
    for (const audience of ['owner','shared'] as const) {
      const descriptor = await read(file.id,'preview',audience);
      expect(descriptor.statusCode).toBe(200);
      expect(descriptor.json()).toMatchObject({id:file.id,capabilities:{kind,view:'native',download:true}});
      expect(descriptor.body).not.toContain('hash');
      const view = await read(file.id,'view',audience);
      expect(view.statusCode).toBe(200);
      expect(view.rawPayload).toEqual(bytes);
      expect(view.headers['content-disposition']).toMatch(/^inline;/);
      expect(view.headers['cache-control']).toBe('no-store');
      expect(view.headers['content-security-policy']).toContain('sandbox');
    }
  }
});
it('streams single byte ranges, open ranges and suffix ranges for authorized originals and views', async () => {
  const file = await addAttachment(f,id);
  for (const audience of ['owner','shared'] as const) {
    for (const suffix of ['file','view']) {
      for (const [range,start,end] of [['bytes=1-4',1,4],['bytes=5-',5,PDF.length-1],['bytes=-3',PDF.length-3,PDF.length-1]] as const) {
        const response = await read(file.id,suffix,audience,'GET',{range});
        expect(response.statusCode).toBe(206);
        expect(response.rawPayload).toEqual(PDF.subarray(start,end+1));
        expect(response.headers['content-range']).toBe(`bytes ${start}-${end}/${PDF.length}`);
        expect(response.headers['accept-ranges']).toBe('bytes');
      }
      const invalid = await read(file.id,suffix,audience,'GET',{range:'bytes=999999-'});
      expect(invalid.statusCode).toBe(416);
      expect(invalid.headers['content-range']).toBe(`bytes */${PDF.length}`);
      expect((await read(file.id,suffix,audience,'HEAD',{range:'bytes=1-4'})).statusCode).toBe(200);
      expect((await read(file.id,suffix,audience,'GET',{range:'bytes=1-4','if-range':'"old"'})).statusCode).toBe(200);
    }
  }
});
it('keeps document originals downloadable without offering native previews', async () => {
  const file = await addAttachment(f,id,{},'a.docx',ZIP);
  const descriptor = await read(file.id,'preview');
  expect(descriptor.statusCode).toBe(200);
  expect(descriptor.json().capabilities).toMatchObject({kind:'document',view:'download',download:true});
  expect((await read(file.id,'view')).statusCode).toBe(415);
  expect((await read(file.id,'file')).rawPayload).toEqual(ZIP);
});
it('checks current private, deleted, revoked and wrong-record state before every preview or byte range', async () => {
  const log = (await send(f.ctx,f.cookie,'POST',recordUrl(f,id,'/log'),{text:'Private',private:true})).json();
  const file = await addAttachment(f,id,{logEntryId:log.id});
  for (const suffix of ['view','preview']) {
    expect((await read(file.id,suffix,'shared','GET',{range:'bytes=0-1'})).json()).toEqual({error:'not_available'});
    expect((await read(file.id,suffix)).statusCode).toBe(200);
  }
  await send(f.ctx,f.cookie,'PATCH',recordUrl(f,id,`/log/${log.id}`),{private:false});
  expect((await read(file.id,'view','shared')).statusCode).toBe(200);
  const other = await postRecord(f,{subtype:'task'});
  const elsewhere = await addAttachment(f,other.id);
  expect((await read(elsewhere.id,'preview','shared')).statusCode).toBe(404);
  f.ctx.db.exec("UPDATE share_links SET revoked_at='2026-01-01'");
  expect((await read(file.id,'view','shared')).statusCode).toBe(404);
  await send(f.ctx,f.cookie,'DELETE',recordUrl(f,id,`/attachments/${file.id}`));
  expect((await read(file.id,'preview')).statusCode).toBe(404);
});
it('preserves occurrence viewer policy when identical bytes were first uploaded under a download-only suffix', async () => {
  const generic = await addAttachment(f,id,{},'evidence.txt',PDF);
  const pdf = await addAttachment(f,id,{},'evidence.pdf',PDF);
  expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(1);
  expect((await read(generic.id,'preview')).json().capabilities.view).toBe('download');
  expect((await read(generic.id,'view')).statusCode).toBe(415);
  expect((await read(pdf.id,'view')).headers['content-type']).toBe('application/pdf');
});
it('offers a browser email reader descriptor and retains original bytes without server parsing', async () => {
  const eml = Buffer.from('From: writer@example.test\r\nSubject: Site notes\r\n\r\nHello');
  const file = await addAttachment(f,id,{},'notes.eml',eml);
  for (const audience of ['owner','shared'] as const) {
    expect((await read(file.id,'preview',audience)).json().capabilities).toMatchObject({kind:'email',view:'email',reader:'eml',download:true});
    expect((await read(file.id,'file',audience)).rawPayload).toEqual(eml);
    expect((await read(file.id,'view',audience)).statusCode).toBe(415);
  }
});
it('serves media with an occurrence-specific player MIME and protects SVG document navigation', async () => {
  const mp4 = Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(12),Buffer.from('synthetic media')]);
  const video = await addAttachment(f,id,{},'clip.mp4',mp4);
  const audio = await addAttachment(f,id,{},'clip.m4a',mp4);
  expect((await read(video.id,'preview')).json().capabilities).toMatchObject({kind:'video',view:'native',mediaType:'video/mp4'});
  expect((await read(audio.id,'view')).headers['content-type']).toBe('audio/mp4');
  expect((await read(video.id,'view','shared','GET',{range:'bytes=8-11'})).rawPayload).toEqual(Buffer.from('isom'));
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><image href="https://external.invalid/tracker"/></svg>');
  const generic = await addAttachment(f,id,{},'vector.txt',svg);
  const image = await addAttachment(f,id,{},'vector.svg',svg);
  expect((await read(generic.id,'view')).statusCode).toBe(415);
  const view = await read(image.id,'view','shared');
  expect(view.headers['content-type']).toBe('image/svg+xml');
  expect(view.headers['content-security-policy']).toContain("default-src 'none'");
  expect(view.headers['content-security-policy']).toContain('sandbox');
  expect(view.headers['x-content-type-options']).toBe('nosniff');
});
it('rejects invalid and multi ranges without returning file bytes, and clamps a valid long end', async () => {
  const file = await addAttachment(f,id);
  for (const range of ['bytes=-0','bytes=2-1','bytes=0-1,3-4','bytes=999999999999999999999-','nonsense']) {
    const response = await read(file.id,'view','shared','GET',{range});
    expect(response.statusCode).toBe(416);
    expect(response.headers['content-range']).toBe(`bytes */${PDF.length}`);
    expect(response.rawPayload).not.toEqual(PDF);
  }
  expect((await read(file.id,'view','owner','GET',{range:'bytes=0-999999'})).rawPayload).toEqual(PDF);
});
