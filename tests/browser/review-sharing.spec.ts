import Database from 'better-sqlite3';
import type { Page } from '@playwright/test';
import { test, expect, login, seed } from './fixture';

const origin = 'http://127.0.0.1:3490';
async function tab(page: Page, name: string) {
  const panel=page.locator('dialog.side-panel');if(await panel.count())await panel.getByRole('button',{name:'Close',exact:true}).click();
  if(name==='Sharing')await page.getByRole('button',{name:'Sharing',exact:true}).click();
  else await page.getByRole('navigation',{name:'Record sections'}).getByRole('button',{name,exact:true}).click();
}
async function draft(page: Page) {
  const base = `/api/projects/${seed().projectId}/records`;
  const response = await page.request.post(base, { headers: { origin }, data: { subtype: 'task', title: 'Review synthetic draft' } });
  expect(response.status()).toBe(201);
  const record = await response.json() as { id: number };
  return { base: `${base}/${record.id}`, url: `/projects/${seed().projectId}/records/${record.id}` };
}
const article = (page: Page, label: string) => page.getByRole('article').filter({ has: page.getByRole('heading', { name: label, exact: true }) });

test('owner creates and copies a Draft share link while its public record stays unavailable', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await login(page); const record = await draft(page);
  await page.goto(record.url); await tab(page, 'Sharing');
  await page.getByText('Create a share link', { exact: true }).click();
  const label = page.getByRole('textbox', { name: 'Link label', exact: true });
  await expect(label).toBeEnabled();
  await label.fill('Draft review link');
  await page.getByRole('button', { name: 'Create link', exact: true }).click();
  const link = article(page, 'Draft review link');
  await expect(link).toContainText('Draft — unavailable');
  const url = await link.getByRole('textbox', { name: 'Share URL', exact: true }).inputValue();
  await link.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(link.getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  const publicPage = await context.newPage();
  await publicPage.goto(url);
  await expect(publicPage.getByRole('alert')).toHaveText('Το στοιχείο δεν είναι διαθέσιμο.');
  await expect(publicPage.getByRole('heading', { name: 'Review synthetic draft', exact: true })).toHaveCount(0);
  await publicPage.close();
});

test('revoked and expired links remain copyable but a null URL never exposes a copy control', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await login(page);
  const { projectId, recordId, dbPath } = seed();
  const base = `/api/projects/${projectId}/records/${recordId}`;
  const links: { id: number; label: string; url: string }[] = [];
  for (const label of ['Review revoked', 'Review expired', 'Review unavailable URL']) {
    const response = await page.request.post(base + '/share-links', { headers: { origin }, data: { label } });
    expect(response.status()).toBe(201); links.push(await response.json());
  }
  const db = new Database(dbPath);
  try {
    db.prepare('UPDATE share_links SET expires_at = ? WHERE id = ?').run('2000-01-01T00:00:00.000Z', links[1]!.id);
    db.prepare('UPDATE share_links SET key_fingerprint = ? WHERE id = ?').run('synthetic-old-key', links[2]!.id);
  } finally { db.close(); }
  await page.goto(`/projects/${projectId}/records/${recordId}`); await tab(page, 'Sharing');
  const revoked = article(page, 'Review revoked');
  page.once('dialog', dialog => dialog.accept());
  await revoked.getByRole('button', { name: 'Revoke link', exact: true }).click();
  await expect(revoked).toContainText('Revoked');
  for (const target of [links[0]!, links[1]!]) {
    const row = article(page, target.label);
    await expect(row.getByRole('button', { name: 'Copy link', exact: true })).toBeVisible();
    await row.getByRole('button', { name: 'Copy link', exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(target.url);
    const response = await page.request.get('/api/shared/record', { headers: { Authorization: `Bearer ${new URL(target.url).hash.slice(1)}` } });
    expect(response.status()).toBe(404);
  }
  await expect(article(page, 'Review expired')).toContainText('Expired');
  const unavailable = article(page, 'Review unavailable URL');
  await expect(unavailable.getByRole('button', { name: 'Copy link', exact: true })).toHaveCount(0);
  await expect(unavailable.getByRole('textbox', { name: 'Share URL', exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('el');
  await expect(revoked).toContainText('Ανακλήθηκε');
  await expect(article(page, 'Review expired')).toContainText('Έληξε');
});

test('measurement tables preserve precise values and nonzero differences in English and Greek', async ({ page }) => {
  await login(page); const record = await draft(page);
  for (const [date, phase, value] of [['2026-01-01', 'before', 1], ['2026-01-02', 'after', 1.000000001]] as const) {
    const response = await page.request.post(record.base + '/measurement-sets', { headers: { origin }, data: { date, phase, rows: [
      { item: 'Reference', quantity: 'Width', unit: 'mm', value: 1 },
      { item: 'Measured', quantity: 'Width', unit: 'mm', value },
      { item: 'Small', quantity: 'Depth', unit: 'mm', value: 1e-12 },
    ] } });
    expect(response.status()).toBe(201);
  }
  await page.goto(record.url); await tab(page, 'Measurements');
  await expect(page.getByRole('cell', { name: '1.000000001', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '1e-12', exact: true }).first()).toBeVisible();
  const after = page.getByRole('article').filter({ has: page.getByRole('heading', { name: /2 Jan 2026/ }) });
  await after.locator('summary').filter({ hasText: /^Between items · Width/ }).click();
  await expect(after.getByRole('cell', { name: '1.000000082740371e-9', exact: true })).toBeVisible();
  const history = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: /^Before vs after · Measured · Width/ }) });
  await history.locator('summary').click();
  await expect(history.getByRole('cell', { name: '1.000000082740371e-9', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('el');
  await expect(page.getByRole('cell', { name: '1,000000001', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: '1,000000082740371e-9', exact: true }).first()).toBeVisible();
});
