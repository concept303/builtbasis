import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const harness = 'http://127.0.0.1:5174/tests/browser/fixtures/media-harness.html';
const fixture = (name: string) => resolve('tests/browser/fixtures', name);
async function openHarness(page: Page) {
  await page.goto(harness);
  await page.waitForFunction(() => 'mediaTest' in window);
}
async function routeFiles(page: Page) {
  const descriptors = [
    {kind:'image',view:'native',mediaType:'image/svg+xml'}, {kind:'email',view:'email',reader:'eml'},
    {kind:'email',view:'email',reader:'msg'}, {kind:'pdf',view:'native',mediaType:'application/pdf'},
    {kind:'video',view:'native',mediaType:'video/webm'}, {kind:'audio',view:'native',mediaType:'audio/wav'}, {kind:'document',view:'download'},
  ];
  const names = ['media-active.svg','media-html.eml','media-compound.msg','media-document.pdf','media-video.webm','media-audio.wav','media-design.dwg'];
  await page.route('**/api/shared/attachments/*/*', async route => {
    const match = /attachments\/(\d+)\/(\w+)/.exec(route.request().url())!;
    const index = Number(match[1])-1;
    expect(route.request().headers().authorization).toBe('Bearer synthetic-test-only');
    if (match[2] === 'preview') await route.fulfill({ json: { id:index+1, capabilities:{...descriptors[index],download:true} } });
    else await route.fulfill({ body: await readFile(fixture(names[index]!)), contentType: descriptors[index]?.mediaType ?? 'application/octet-stream' });
  });
}
test('genuine HEIC converts; oriented JPEG keeps bytes and explicit capture instant', async ({page}) => {
  await openHarness(page);
  const result = await page.evaluate(async () => {
    const media = (window as any).mediaTest;
    const results=[];
    for (const name of ['media-synthetic.heic','media-oriented.jpg']) {
      const original = new File([await (await fetch('./'+name)).blob()],name);
      const photo = await media.preparePhoto(original);
      const image = await createImageBitmap(photo.display);
      results.push({name,width:image.width,height:image.height,takenAt:photo.takenAt,originalSame:photo.original===original,displayType:photo.display.type,thumbnail:photo.thumbnail.size}); image.close();
    }
    return results;
  });
  expect(result[0]).toMatchObject({width:96,height:64,originalSame:true,displayType:'image/jpeg'});
  expect(result[1]).toMatchObject({width:64,height:96,takenAt:'2026-10-04T02:15:16.000Z',originalSame:true});
});
test('shared SVG is rasterized before DOM exposure and has no external requests', async ({page}) => {
  const external:string[]=[]; page.on('request',request=>{if(request.url().includes('tracker.invalid'))external.push(request.url());});
  await page.addInitScript(() => { const create = URL.createObjectURL; (window as any).blobTypes = {}; URL.createObjectURL = (blob: Blob | MediaSource) => { const url=create(blob); (window as any).blobTypes[url] = blob instanceof Blob ? blob.type : ''; return url; }; });
  await routeFiles(page); await openHarness(page);
  await page.getByRole('button',{name:'media-active.svg',exact:true}).click();
  const img=page.locator('dialog img'); await expect(img).toBeVisible();
  expect(await img.evaluate(el => (window as any).blobTypes[(el as HTMLImageElement).src])).toBe('image/png');
  expect(external).toEqual([]);
  expect(await page.locator('iframe, object, embed').count()).toBe(0);
  await page.getByRole('button',{name:/Close|Κλείσιμο/,exact:true}).click(); await expect(page.locator('dialog')).toHaveCount(0);
});
test('EML and MSG workers render escaped text and embedded downloads without remote fetches', async ({page}) => {
  const external:string[]=[]; page.on('request',request=>{if(request.url().includes('tracker.invalid'))external.push(request.url());});
  await routeFiles(page); await openHarness(page);
  await page.getByRole('button',{name:'media-html.eml',exact:true}).click();
  await expect(page.locator('.email-preview')).toContainText('Synthetic ✓');
  await expect(page.locator('.email-preview')).toContainText('Hello & safe');
  expect(await page.locator('.email-preview script,.email-preview img,.email-preview iframe').count()).toBe(0);
  const download=page.waitForEvent('download'); await page.getByRole('button',{name:/nested.eml/}).click();
  expect((await download).suggestedFilename()).toBe('nested.eml');
  await page.getByRole('button',{name:/Close|Κλείσιμο/,exact:true}).click();
  await page.getByRole('button',{name:'media-compound.msg',exact:true}).click();
  await expect(page.locator('.email-preview')).toContainText('Synthetic MSG ✓');
  await expect(page.locator('.email-preview')).toContainText('Synthetic MSG body');
  expect(external).toEqual([]);
});
test('worker cancellation terminates parsing and releases the pending operation', async ({page}) => {
  await openHarness(page);
  const result=await page.evaluate(async()=>{
    const controller=new AbortController();
    const worker=new Worker(new URL('../../../src/web/media/email.worker.ts',location.href),{type:'module'});
    const bytes=new TextEncoder().encode('Subject: Synthetic\r\n\r\n'+'a'.repeat(1_000_000)).buffer;
    const pending=(window as any).mediaTest.workerJob(worker,{bytes,reader:'eml'},[bytes],controller.signal);
    controller.abort(); try{await pending;return 'resolved';}catch(error){return (error as Error).name;}
  });
  expect(result).toBe('AbortError');
});
test('malformed email falls back to forced original download', async ({page}) => {
  await routeFiles(page);
  await page.route('**/api/shared/attachments/3/file',route=>route.fulfill({body:Buffer.from('invalid compound file'),contentType:'application/octet-stream'}));
  await openHarness(page); await page.getByRole('button',{name:'media-compound.msg',exact:true}).click();
  await expect(page.locator('dialog')).toContainText(/Preview unavailable|προεπισκόπηση δεν είναι διαθέσιμη/);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:/Download original|Λήψη πρωτοτύπου/}).click();
  expect((await download).suggestedFilename()).toBe('media-compound.msg');
});
test('PDF uses a local worker and data-fed canvas with no documents or external actions', async({page})=>{
  const external:string[]=[];page.on('request',request=>{if(request.url().includes('tracker.invalid'))external.push(request.url());});
  await routeFiles(page);await openHarness(page);await page.getByRole('button',{name:'media-document.pdf',exact:true}).click();
  await expect(page.locator('dialog canvas')).toBeVisible();
  await expect.poll(()=>page.locator('dialog canvas').evaluate(el=>(el as HTMLCanvasElement).width)).toBeGreaterThan(0);
  expect(await page.locator('iframe,object,embed').count()).toBe(0);expect(external).toEqual([]);
});

test('native video and audio play from authorized blobs, unsupported codecs retain download', async({page})=>{
  await routeFiles(page);await openHarness(page);
  for(const [name,tag] of [['media-video.webm','video'],['media-audio.wav','audio']]) {
    await page.getByRole('button',{name:name!,exact:true}).click();
    await expect(page.locator(`dialog ${tag}`)).toBeVisible();
    await expect.poll(()=>page.locator(`dialog ${tag}`).evaluate(el=>(el as HTMLMediaElement).readyState)).toBeGreaterThanOrEqual(1);
    await page.getByRole('button',{name:/Close|Κλείσιμο/,exact:true}).click();
  }
  await page.route('**/api/shared/attachments/5/view',route=>route.fulfill({body:Buffer.from('unsupported codec'),contentType:'video/webm'}));
  await page.getByRole('button',{name:'media-video.webm',exact:true}).click();
  await expect(page.locator('dialog')).toContainText(/Preview unavailable|προεπισκόπηση δεν είναι διαθέσιμη/);
  await expect(page.getByRole('button',{name:/Download original|Λήψη πρωτοτύπου/})).toBeEnabled();
});
test('private occurrence denial clears content without guessed hash fallback', async({page})=>{
  const requests:string[]=[];page.on('request',request=>{if(request.url().includes('/api/'))requests.push(request.url());});
  await routeFiles(page);
  await page.route('**/api/shared/attachments/1/view',route=>route.fulfill({status:404,json:{error:'not_found'}}));
  await openHarness(page);await page.getByRole('button',{name:'media-active.svg',exact:true}).click();
  await expect(page.locator('body')).toContainText('Access lost');
  await expect(page.locator('dialog')).toHaveCount(0);
  expect(requests.every(url=>/\/api\/shared\/attachments\/1\/(preview|view)$/.test(url))).toBe(true);
});

test('native photo failure rechecks occurrence access and clears the viewer after revocation', async({page})=>{
  let heads=0;
  await page.route('**/api/projects/1/records/1/photos/1/thumbnail',async route=>route.fulfill({body:await readFile(fixture('media-synthetic.png')),contentType:'image/png'}));
  await page.route('**/api/projects/1/records/1/photos/1/display',async route=>{if(route.request().method()==='HEAD')heads++;await route.fulfill({status:403,json:{error:'permission_denied'}});});
  await page.goto(harness+'?photo=1');
  await page.getByRole('button',{name:'Open photo media-oriented.jpg',exact:true}).click();
  await expect(page.locator('body')).toContainText('Access lost');
  await expect(page.locator('dialog')).toHaveCount(0);expect(heads).toBe(1);
});
