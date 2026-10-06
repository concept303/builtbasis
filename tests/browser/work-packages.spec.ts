import { test, expect, login, seed } from './fixture';
const origin = 'http://127.0.0.1:3490';
test('package pages search Greek, show derived totals, sparse bars and direct navigation on phones', async ({ page }) => {
  await login(page); const { projectId } = seed(); const base = `/api/projects/${projectId}`;
  const p = await (await page.request.post(`${base}/work-packages`, { headers: { origin }, data: { name: 'Πλακάκια και αρμοί', description: 'Ένα πακέτο', targetDate: '2000-01-01' } })).json();
  await page.request.post(`${base}/records`, { headers: { origin }, data: { subtype: 'task', title: 'Tile edge', dueDate: '2000-01-01', workPackageId: p.id } });
  await page.goto(`/projects/${projectId}/work-packages`);
  await page.getByRole('searchbox', { name: 'Find a work package' }).fill('πλακακια');
  await expect(page.getByRole('link', { name: p.name, exact: true })).toBeVisible();
  await expect(page.locator('.package-list')).toContainText('1 of 1 outstanding');
  await page.getByRole('link', { name: p.name, exact: true }).click();
  await expect(page.getByRole('heading', { name: p.name, exact: true })).toBeVisible();
  await expect(page.getByText('Past target', { exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Draft');
  await expect(page.getByRole('heading', { name: 'Tile edge', exact: true })).toBeVisible();
  for (const width of [360, 390]) { await page.setViewportSize({ width, height: 850 }); await page.reload(); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width); }
  await expect(page.locator('.site-nav [aria-current=page]')).toHaveText('Work packages');
});
test('an empty past-target planned package warns, but completed does not', async ({ page }) => {
  await login(page); const { projectId } = seed(); const base = `/api/projects/${projectId}/work-packages`;
  const p = await (await page.request.post(base, { headers: { origin }, data: { name: 'Empty past target', targetDate: '2000-01-01' } })).json();
  await page.goto(`/projects/${projectId}/work-packages/${p.id}`); await expect(page.getByText('Past target', { exact: true })).toBeVisible();
  await expect(page.getByText('No records in this package yet.', { exact: true })).toBeVisible();
  await page.request.patch(`${base}/${p.id}`, { headers: { origin }, data: { status: 'completed' } });
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await expect(page.getByText('Past target', { exact: true })).toHaveCount(0);
});
