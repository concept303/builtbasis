import { test, expect, login, seed } from './fixture';
import type { Page } from '@playwright/test';
const origin = 'http://127.0.0.1:3490';
async function record(page: Page) {
  await login(page); const { projectId } = seed();
  const response = await page.request.post(`/api/projects/${projectId}/records`, { headers: { origin }, data: { subtype: 'task', title: `Log review ${Date.now()}` } });
  const { id } = await response.json() as { id: number };
  const base = `/api/projects/${projectId}/records/${id}`;
  await page.goto(`/projects/${projectId}/records/${id}`);
  await page.getByRole('button', { name: 'Log', exact: true }).click();
  return base;
}
test('editing only Log text preserves milliseconds and the second Melbourne repeated hour', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'Australia/Melbourne' }); const page = await context.newPage();
  try {
    const base = await record(page); const original = '2026-04-04T16:30:47.123Z';
    await page.request.post(base + '/log', { headers: { origin }, data: { eventAt: original, text: 'Before edit' } });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.getByRole('button', { name: 'Edit entry', exact: true }).click();
    await page.getByRole('textbox', { name: 'Entry', exact: true }).fill('Text edited only');
    await page.getByRole('button', { name: 'Save entry', exact: true }).click();
    await expect(page.getByText('Text edited only', { exact: true })).toBeVisible();
    const log = await (await page.request.get(base + '/log')).json() as { eventAt: string }[];
    expect(log[0]?.eventAt).toBe(original);
    await page.getByRole('button', { name: 'Edit entry', exact: true }).click();
    await page.getByLabel('Private · owner only', { exact: true }).check();
    await page.getByRole('button', { name: 'Save entry', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toHaveCount(0);
    expect((await (await page.request.get(base + '/log')).json())[0]).toMatchObject({ eventAt: original, private: true });
    await page.getByRole('button', { name: 'Edit entry', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'UTC offset', exact: true })).toHaveValue('+10:00');
    await page.getByRole('textbox', { name: 'UTC offset', exact: true }).fill('+11:00');
    await page.getByRole('button', { name: 'Save entry', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toHaveCount(0);
    expect((await (await page.request.get(base + '/log')).json())[0].eventAt).toBe('2026-04-04T15:30:47.123Z');
  } finally { await context.close(); }
});
test('unknown Log creation outcome blocks retries through failed refresh and retains draft beside saved results', async ({ page }) => {
  const base = await record(page); let posts = 0;
  await page.getByRole('button', { name: 'Add Log entry', exact: true }).click();
  await page.getByRole('textbox', { name: 'Entry', exact: true }).fill('Committed once despite lost response');
  await page.route(`**${base}/log`, async route => {
    if (route.request().method() !== 'POST') return route.continue();
    posts++; const result = await route.fetch(); expect(result.ok()).toBeTruthy(); await route.abort();
  });
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'Entry', exact: true })).toHaveValue('Committed once despite lost response');
  await page.route(`**${base}`, route => route.fulfill({ status: 503, json: { error: 'temporary_failure' } }));
  await page.getByRole('button', { name: 'Refresh saved Log', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toBeDisabled();
  await page.unroute(`**${base}`);
  await page.getByRole('button', { name: 'Refresh saved Log', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Saved Log entries', exact: true })).toContainText('Committed once despite lost response');
  await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toBeEnabled();
  await expect(page.getByRole('textbox', { name: 'Entry', exact: true })).toHaveValue('Committed once despite lost response');
  expect(posts).toBe(1); expect(await (await page.request.get(base + '/log')).json()).toHaveLength(1);
});
for (const outcome of ['lost', 'truncated'] as const) test(`unknown Log attachment ${outcome} response blocks retries until a successful refresh shows the committed file`, async ({ page }) => {
  const base = await record(page); await page.request.post(base + '/log', { headers: { origin }, data: { text: 'Attachment destination' } });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByText('Attach a file to this entry', { exact: true }).click();
  await page.getByLabel('Attachment file', { exact: true }).setInputFiles({ name: 'saved-once.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic log attachment') });
  let posts = 0;
  await page.route(`**${base}/attachments`, async route => { if (route.request().method() !== 'POST') return route.continue(); posts++; const result = await route.fetch(); expect(result.ok()).toBeTruthy(); if (outcome === 'lost') await route.abort(); else await route.fulfill({ status: 201, contentType: 'application/json', body: '{' }); });
  await page.getByRole('button', { name: 'Upload attachment', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload attachment', exact: true })).toBeDisabled();
  await page.route(`**${base}`, route => route.fulfill({ status: 503, json: { error: 'temporary_failure' } }));
  await page.getByRole('button', { name: 'Refresh saved attachments', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Upload attachment', exact: true })).toBeDisabled();
  await page.unroute(`**${base}`);
  await page.getByRole('button', { name: 'Refresh saved attachments', exact: true }).click();
  await expect(page.getByText('Attachment: saved-once.txt', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload attachment', exact: true })).toBeEnabled();
  expect(posts).toBe(1); expect(await (await page.request.get(base + '/attachments')).json()).toHaveLength(1);
});
