import Database from 'better-sqlite3';
import jsQR from 'jsqr';
import { readFileSync } from 'node:fs';
import { test, expect, login, seed } from './fixture';
const origin = 'http://127.0.0.1:3490';

for (const status of ['draft', 'open'] as const) test(`default no-QR printing works for a ${status} record without links`, async ({ page }) => {
  await login(page);
  const { projectId } = seed();
  const created = await page.request.post(`/api/projects/${projectId}/records`, { headers: { origin }, data: { subtype: 'task', title: `No QR ${status}`, notes: 'NO_QR_PRIVATE', publicNotes: 'NO_QR_PUBLIC_NOTES' } });
  expect(created.status()).toBe(201);
  const { id } = await created.json() as { id: number };
  const base = `/api/projects/${projectId}/records/${id}`;
  if (status === 'open') expect((await page.request.post(base + '/transitions', { headers: { origin }, data: { to: 'open' } })).status()).toBe(200);
  let shareRequests = 0;
  page.on('request', request => { if (request.url().includes(base + '/share-links')) shareRequests++; });
  await page.goto(`/projects/${projectId}/records/${id}/print`);
  const checkbox = page.getByRole('checkbox', { name: 'Include QR link', exact: true });
  await expect(checkbox).not.toBeChecked();
  if (status === 'draft') await expect(checkbox).toBeDisabled();
  const button = page.getByRole('button', { name: 'Print / Save PDF', exact: true });
  await expect(button).toBeEnabled();
  await expect(page.locator('.print-sheet')).toContainText(status === 'draft' ? 'Draft' : 'Open');
  await expect(page.locator('.print-sheet a')).toHaveCount(0);
  await expect(page.locator('.print-sheet')).not.toContainText('NO_QR_');
  await page.evaluate(() => { window.print = () => { document.body.dataset.printed = document.querySelector('.print-page')!.classList.contains('print-ready') ? 'ready' : 'not-ready'; }; });
  await button.click();
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'ready');
  expect(shareRequests).toBe(0);
  expect(await (await page.request.get(base + '/share-links')).json()).toEqual([]);
});

test('no-QR printing survives unavailable sharing, including after a failed QR opt-in', async ({ page }) => {
  await login(page);
  const { projectId, recordId } = seed();
  const base = `/api/projects/${projectId}/records/${recordId}`;
  await page.route(base + '/share-links', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' }));
  await page.goto(`/projects/${projectId}/records/${recordId}/print`);
  const button = page.getByRole('button', { name: 'Print / Save PDF', exact: true });
  await expect(button).toBeEnabled();
  await page.evaluate(() => { window.print = () => { document.body.dataset.printed = 'yes'; }; });
  await button.click(); await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes');
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(button).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).uncheck();
  await expect(button).toBeEnabled();
  await page.evaluate(() => { delete document.body.dataset.printed; });
  await button.click(); await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes');
  await expect(page.locator('.print-sheet a')).toHaveCount(0);
});

test('print refreshes renamed people and locations from another session without a record timestamp change', async ({ page, browser }) => {
  await login(page);
  const { projectId } = seed();
  const project = `/api/projects/${projectId}`;
  const personResponse = await page.request.post(project + '/people', { headers: { origin }, data: { code: 'PRINT-RENAME', name: 'Original print person', role: 'other' } });
  expect(personResponse.status()).toBe(201);
  const person = await personResponse.json() as { id: number };
  const locationResponse = await page.request.post(project + '/locations', { headers: { origin }, data: { kind: 'building', nameEn: 'Original print location' } });
  expect(locationResponse.status()).toBe(201);
  const location = await locationResponse.json() as { id: number };
  const created = await page.request.post(project + '/records', { headers: { origin }, data: { subtype: 'task', title: 'Fresh print snapshot', ballInCourtId: person.id, locationIds: [location.id] } });
  expect(created.status()).toBe(201);
  const record = await created.json() as { id: number };
  const base = project + `/records/${record.id}`;
  expect((await page.request.post(base + '/transitions', { headers: { origin }, data: { to: 'open' } })).status()).toBe(200);
  expect((await page.request.post(base + '/share-links', { headers: { origin }, data: { label: 'Fresh print QR' } })).status()).toBe(201);
  await page.goto(`/projects/${projectId}/records/${record.id}/print`);
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await page.getByLabel('QR share link', { exact: true }).selectOption({ label: 'Fresh print QR' });
  const printButton = page.getByRole('button', { name: 'Print / Save PDF', exact: true });
  await expect(printButton).toBeEnabled();
  await expect(page.locator('.print-sheet')).toContainText('Original print person');
  const before = await (await page.request.get(base)).json() as { updatedAt: string };
  const other = await browser.newContext({ baseURL: origin });
  try {
    const editor = await other.newPage(); await login(editor);
    expect((await editor.request.patch(project + `/people/${person.id}`, { headers: { origin }, data: { name: 'Renamed print person' } })).status()).toBe(200);
    expect((await editor.request.patch(project + `/locations/${location.id}`, { headers: { origin }, data: { nameEn: 'Renamed print location' } })).status()).toBe(200);
    expect((await (await editor.request.get(base)).json()).updatedAt).toBe(before.updatedAt);
  } finally { await other.close(); }
  await page.evaluate(() => { window.print = () => {
    const sheet = document.querySelector('.print-sheet')!;
    document.body.dataset.printSnapshot = JSON.stringify({ text: sheet.textContent, generatedAt: sheet.querySelector('footer time')?.getAttribute('datetime'), ready: document.querySelector('.print-page')!.classList.contains('print-ready') });
  }; });
  const response = page.waitForResponse(response => response.url().endsWith(base + '/print'));
  await printButton.click();
  const snapshot = await (await response).json() as { generatedAt: string };
  await expect(page.locator('body')).toHaveAttribute('data-print-snapshot', /Renamed print person/);
  const printed = JSON.parse((await page.locator('body').getAttribute('data-print-snapshot'))!) as { text: string; generatedAt: string; ready: boolean };
  expect(printed.text).toContain('Renamed print location');
  expect(printed.text).not.toContain('Original print person');
  expect(printed.generatedAt).toBe(snapshot.generatedAt);
  expect(printed.ready).toBe(true);
});

test('owner print excludes Notes and Log from both DOM and its payload, and requires deliberate QR selection', async ({ page }) => {
  await login(page);
  const { projectId, recordId, shareUrl } = seed();
  const payloads: string[] = [];
  page.on('response', response => { if (response.url().includes(`/records/${recordId}`) && response.request().resourceType() === 'fetch') void response.text().then(text => payloads.push(text)); });
  await page.goto(`/projects/${projectId}/records/${recordId}/print`);
  await expect(page.getByRole('heading', { name: 'Public sample task', exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled();
  await page.getByLabel('QR share link', { exact: true }).selectOption({ label: 'Browser synthetic reader' });
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  await expect(page.getByRole('img', { name: 'Share QR code', exact: true })).toBeVisible();
  expect(await page.locator('.print-qr a').getAttribute('href')).toBe(shareUrl);
  const pixels = await page.locator('.print-qr img').evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    return { data: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data), width: canvas.width, height: canvas.height };
  });
  expect(jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height)?.data).toBe(shareUrl);
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).uncheck();
  await expect(page.locator('.print-qr')).toHaveCount(0);
  await expect(page.locator('.print-sheet a')).toHaveCount(0);
  expect(await page.locator('.print-sheet').innerHTML()).not.toContain(shareUrl);
  await page.evaluate(() => { window.print = () => { document.body.dataset.printedLinks = String(document.querySelectorAll('.print-sheet a').length); }; });
  await page.getByRole('button', { name: 'Print / Save PDF', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-printed-links', '0');
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await page.getByLabel('QR share link', { exact: true }).selectOption({ label: 'Browser synthetic reader' });
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  for (const secret of ['PRIVATE_SENTINEL', 'Public site note', 'Public log entry', 'PRIVATE_LOG_SENTINEL', '9876.54']) {
    expect(await page.locator('body').textContent()).not.toContain(secret);
    expect(payloads.join('')).not.toContain(secret);
  }
  await page.getByLabel('Language', { exact: true }).selectOption('el');
  await expect(page.getByRole('heading', { name: 'Περιγραφή', exact: true })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('.print-controls')).toBeHidden();
  await expect(page.locator('.print-sheet')).toBeVisible();
  const pdf = await page.pdf({ preferCSSPageSize: true, path: 'test-results/print-greek-a3.pdf' });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: new Uint8Array(pdf), useSystemFonts: true });
  const pdfDocument = await loading.promise;
  const first = await pdfDocument.getPage(1);
  expect(first.view[2]! - first.view[0]!).toBeCloseTo(1190.55, -1);
  expect(first.view[3]! - first.view[1]!).toBeCloseTo(841.89, -1);
  await loading.destroy();
});

test('one print action adopts a changed record and waits for its newly added photo', async ({ page }) => {
  await login(page);
  const { projectId } = seed();
  const created = await page.request.post(`/api/projects/${projectId}/records`, { headers: { origin }, data: { subtype: 'task', title: 'Before fresh snapshot' } });
  expect(created.status()).toBe(201);
  const record = await created.json() as { id: number };
  const base = `/api/projects/${projectId}/records/${record.id}`;
  expect((await page.request.post(base + '/transitions', { headers: { origin }, data: { to: 'open' } })).status()).toBe(200);
  expect((await page.request.post(base + '/share-links', { headers: { origin }, data: { label: 'Changed print QR' } })).status()).toBe(201);
  await page.goto(`/projects/${projectId}/records/${record.id}/print`);
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await page.getByLabel('QR share link', { exact: true }).selectOption({ label: 'Changed print QR' });
  const button = page.getByRole('button', { name: 'Print / Save PDF', exact: true });
  await expect(button).toBeEnabled();
  const file = { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: readFileSync('tests/browser/fixtures/media-oriented.jpg') };
  expect((await page.request.post(base + '/photos', { headers: { origin }, multipart: { metadata: JSON.stringify({ phase: 'after', caption: 'New print photo' }), original: file, display: file, thumbnail: file } })).status()).toBe(201);
  expect((await page.request.patch(base, { headers: { origin }, data: { title: 'After fresh snapshot' } })).status()).toBe(200);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(base + '/photos/*/display', async route => { await gate; await route.continue(); });
  await page.evaluate(() => { window.print = () => {
    const image = document.querySelector('.print-photos img') as HTMLImageElement | null;
    document.body.dataset.printSnapshot = JSON.stringify({ text: document.querySelector('.print-sheet')!.textContent, photoReady: !!image?.complete && image.naturalWidth > 0, ready: document.querySelector('.print-page')!.classList.contains('print-ready') });
  }; });
  await button.click();
  await expect(page.locator('.print-sheet')).toContainText('After fresh snapshot');
  await expect(button).toBeDisabled();
  await expect(page.locator('body')).not.toHaveAttribute('data-print-snapshot');
  release();
  await expect(page.locator('body')).toHaveAttribute('data-print-snapshot', /After fresh snapshot/);
  const printed = JSON.parse((await page.locator('body').getAttribute('data-print-snapshot'))!) as { photoReady: boolean; ready: boolean };
  expect(printed).toMatchObject({ photoReady: true, ready: true });
});

test('no link is created on GET and long text continues onto further A3 pages', async ({ page }) => {
  await login(page);
  const { projectId, dbPath } = seed();
  const description = Array.from({ length: 180 }, (_, i) => `Paragraph ${i + 1}. Synthetic printable evidence with enough detail to exercise pagination.`).join('\n');
  const response = await page.request.post(`/api/projects/${projectId}/records`, { headers: { origin }, data: { subtype: 'task', title: 'Multipage print fixture', description } });
  expect(response.status()).toBe(201);
  const record = await response.json() as { id: number };
  const db = new Database(dbPath); try { db.prepare("UPDATE records SET status = 'open' WHERE id = ?").run(record.id); } finally { db.close(); }
  const base = `/api/projects/${projectId}/records/${record.id}`;
  await page.goto(`/projects/${projectId}/records/${record.id}/print`);
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Create share link', exact: true })).toBeVisible();
  expect(await (await page.request.get(base + '/share-links')).json()).toEqual([]);
  await page.getByLabel('Link label', { exact: true }).fill('Printed handover');
  await page.getByRole('button', { name: 'Create share link', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await page.getByLabel('QR share link', { exact: true }).selectOption({ label: 'Printed handover' });
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  const pdf = await page.pdf({ preferCSSPageSize: true, path: 'test-results/print-multipage-a3.pdf' });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: new Uint8Array(pdf), useSystemFonts: true });
  const pdfDocument = await loading.promise;
  expect(pdfDocument.numPages).toBeGreaterThan(1);
  let content = ''; for (let i = 1; i <= pdfDocument.numPages; i++) { const p = await pdfDocument.getPage(i); content += (await p.getTextContent()).items.map(item => 'str' in item ? item.str : '').join(' '); }
  expect(content).toContain('Paragraph 1.'); expect(content).toContain('Paragraph 180.');
  await loading.destroy();
});

test('printing waits for photo resources and excludes revoked and expired QR choices', async ({ page }) => {
  await login(page);
  const { projectId, dbPath } = seed();
  const response = await page.request.post(`/api/projects/${projectId}/records`, { headers: { origin }, data: { subtype: 'task', title: 'Print resources' } });
  const record = await response.json() as { id: number };
  const base = `/api/projects/${projectId}/records/${record.id}`;
  const db = new Database(dbPath); try { db.prepare("UPDATE records SET status = 'open' WHERE id = ?").run(record.id); } finally { db.close(); }
  const file = { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: readFileSync('tests/browser/fixtures/media-oriented.jpg') };
  const photo = await page.request.post(base + '/photos', { headers: { origin }, multipart: { metadata: JSON.stringify({ phase: 'before', caption: 'Visible evidence' }), original: file, display: file, thumbnail: file } });
  expect(photo.status()).toBe(201);
  for (const label of ['Current', 'Expired', 'Revoked']) {
    const created = await page.request.post(base + '/share-links', { headers: { origin }, data: { label } });
    expect(created.status()).toBe(201);
    const linkId = (await created.json()).id as number;
    if (label === 'Revoked') await page.request.post(base + `/share-links/${linkId}/revoke`, { headers: { origin }, data: {} });
    if (label === 'Expired') { const database = new Database(dbPath); try { database.prepare('UPDATE share_links SET expires_at = ? WHERE id = ?').run('2000-01-01T00:00:00.000Z', linkId); } finally { database.close(); } }
  }
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(base + '/photos/*/display', async route => { await gate; await route.continue(); });
  await page.goto(`/projects/${projectId}/records/${record.id}/print`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  const choices = page.getByLabel('QR share link', { exact: true });
  await expect(choices.locator('option')).toHaveText(['Choose a link', 'Current']);
  await choices.selectOption({ label: 'Current' });
  await expect(page.locator('.print-qr img')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled();
  release();
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  await expect(page.getByRole('img', { name: 'Visible evidence', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/print-resources.png', fullPage: true });
  await page.evaluate(() => { window.print = () => { document.body.dataset.printCalled = document.querySelector('.print-page')?.classList.contains('print-ready') ? 'ready' : 'not-ready'; }; });
  await page.getByRole('button', { name: 'Print / Save PDF', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-print-called', 'ready');
  const shares = await (await page.request.get(base + '/share-links')).json() as { id: number; label: string }[];
  await page.request.post(base + `/share-links/${shares.find(link => link.label === 'Current')!.id}/revoke`, { headers: { origin }, data: {} });
  await page.evaluate(() => { delete document.body.dataset.printCalled; });
  await page.getByRole('button', { name: 'Print / Save PDF', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled();
  await expect(page.locator('body')).not.toHaveAttribute('data-print-called');
});
