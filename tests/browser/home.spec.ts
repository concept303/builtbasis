import { test, expect, login, seed } from './fixture';
import { resolve } from 'node:path';

test('applied filters have translated removable chips and survive record back navigation', async ({ page }) => {
  await login(page); const { projectId } = seed();
  await page.goto(`/projects/${projectId}/records`);
  await page.getByLabel('Search title, description or ID', { exact: true }).fill('Public sample');
  await page.locator('.filters summary').filter({ hasText: /^Filters/ }).click();
  await page.getByRole('listbox', { name: 'Status', exact: true }).selectOption(['open']);
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove filter: Status', exact: true })).toContainText('Open');
  await page.getByRole('link', { name: /T-\d+Public sample task|T-\d+ Public sample task/ }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove filter: Status', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove filter: Status', exact: true }).click();
  expect(new URL(page.url()).searchParams.has('status')).toBe(false);
  expect(new URL(page.url()).searchParams.get('q')).toBe('Public sample');
  await page.getByLabel('Language', { exact: true }).selectOption('el');
  await expect(page.getByRole('button', { name: 'Αφαίρεση φίλτρου: Αναζήτηση', exact: true })).toContainText('Public sample');
});

test('invalid bookmarked vocabulary filters show an error and remain recoverable', async ({ page }) => {
  await login(page); const { projectId } = seed(); const crashes: string[] = [];
  page.on('pageerror', error => crashes.push(error.message));
  await page.goto(`/projects/${projectId}/records?status=bogus`);
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Public sample task', exact: true })).toBeVisible();
  expect(crashes).toEqual([]);
});

test('quick capture keeps its saved draft when a later photo fails without repeating creation', async ({ page }) => {
  await login(page); const { projectId } = seed(); let creates = 0; let photos = 0;
  page.on('request', request => { if (request.method() !== 'POST') return; if (request.url().endsWith(`/api/projects/${projectId}/records`)) creates++; if (/\/photos$/.test(request.url())) photos++; });
  await page.goto(`/projects/${projectId}/records`);
  await page.getByRole('button', { name: 'New record', exact: true }).click();
  await page.getByLabel('Subtype', { exact: true }).selectOption('task');
  await page.getByLabel('Title', { exact: true }).fill('Partial photo capture');
  await page.getByText('Location and photos (optional)', { exact: true }).click();
  await page.getByLabel('Photos', { exact: true }).setInputFiles([
    { name: 'valid.png', mimeType: 'image/png', buffer: await (await import('node:fs/promises')).readFile(resolve('tests/browser/fixtures/media-synthetic.png')) },
    { name: 'corrupt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not a photograph') },
  ]);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Draft saved.', { exact: false })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'valid.png' })).toContainText('Uploaded');
  await expect(page.getByRole('listitem').filter({ hasText: 'corrupt.jpg' })).toContainText('Not uploaded');
  await expect(page.getByRole('alert')).toContainText('Upload the original as an attachment');
  expect(creates).toBe(1); expect(photos).toBe(1);
  await page.locator(`a[href^="/projects/${projectId}/records/"]`).filter({ hasText: /^T-/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Partial photo capture', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Evidence', exact: true }).click();
  await expect(page.locator('.photo-grid .evidence-card')).toHaveCount(1);
});

test('changing a share fragment clears the old record instead of retaining its previous token', async ({page})=>{
  await page.goto(seed().shareUrl);
  await expect(page.getByRole('heading',{name:'Public sample task',exact:true})).toBeVisible();
  await page.evaluate(()=>{location.hash='invalid-fragment';});
  await expect(page.getByRole('heading',{name:'Public sample task',exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:/Record not available|Η καταγραφή δεν είναι διαθέσιμη/})).toBeVisible();
});
