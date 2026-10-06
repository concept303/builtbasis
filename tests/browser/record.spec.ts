import type { Page } from '@playwright/test';
import { test, expect, login, seed } from './fixture';

const origin = 'http://127.0.0.1:3490';
async function create(page: Page, subtype = 'task', extra: Record<string, unknown> = {}) {
  const { projectId } = seed();
  const response = await page.request.post(`/api/projects/${projectId}/records`, { headers: { origin }, data: { subtype, title: `Synthetic ${subtype} ${Date.now()}`, ...extra } });
  expect(response.ok()).toBeTruthy();
  const record = await response.json() as { id: number; title: string };
  await page.goto(`/projects/${projectId}/records/${record.id}`);
  await expect(page.getByRole('heading', { name: record.title, exact: true })).toBeVisible();
  return { ...record, base: `/api/projects/${projectId}/records/${record.id}` };
}
async function tab(page: Page, name: string) {
  const panel=page.locator('dialog.side-panel');if(await panel.count())await panel.getByRole('button',{name:'Close',exact:true}).click();
  if(name==='Sharing')await page.getByRole('button',{name:'Sharing',exact:true}).click();
  else await page.getByRole('navigation',{name:'Record sections'}).getByRole('button',{name,exact:true}).click();
}
async function transition(page: Page, target: string) {
  await page.getByRole('button', { name: 'Change status', exact: true }).click();
  await page.getByRole('combobox', { name: 'New status', exact: true }).selectOption(target);
}
async function applyStatus(page: Page) {
  await page.getByRole('button', { name: 'Apply status', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function saved(page: Page, button: string) {
  await page.getByRole('button', { name: button, exact: true }).click();
  await expect(page.getByRole('button', { name: button, exact: true })).toHaveCount(0);
}

test('owner editor preserves exact text across language changes, confirms cancellation and keeps saved hidden estimates', async ({ page }) => {
  await login(page); const record = await create(page, 'task', { outsideScope: true, estimatedCost: 19.25 });
  await page.getByRole('button', { name: 'Edit record', exact: true }).click();
  const exact = '  Owner wording\n  remains unchanged  ';
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill(exact);
  const locations = page.getByRole('group', { name: 'Locations', exact: true });
  await locations.locator('summary').filter({ hasText: /^Villa 1$/ }).click();
  await locations.getByRole('checkbox', { name: 'Kitchen', exact: true }).check();
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('el');
  await expect(page.getByRole('textbox', { name: 'Περιγραφή', exact: true })).toHaveValue(exact);
  await page.getByRole('combobox', { name: 'Γλώσσα', exact: true }).selectOption('en');
  await page.getByLabel('Estimated cost (€)', { exact: true }).fill('42.90');
  await page.getByLabel('Outside contract scope', { exact: true }).uncheck();
  await saved(page, 'Save record');
  const response = await page.request.get(record.base);
  expect(await response.json()).toMatchObject({ description: exact, outsideScope: false, estimatedCost: 19.25 });
  await page.getByRole('button', { name: 'Edit record', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Unsaved');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Unsaved');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: record.title, exact: true })).toBeVisible();
});

test('QI classification and chosen options require an accountable decision; DC keeps its own classification', async ({ page }) => {
  await login(page); const qi = await create(page, 'quality_issue');
  await page.getByRole('button', { name: 'Add option', exact: true }).click();
  await page.getByRole('textbox', { name: 'Option label', exact: true }).fill('Repair carefully');
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Preserve the original proposal.');
  await saved(page, 'Save option');
  await page.getByRole('button', { name: 'Edit record', exact: true }).click();
  await page.getByRole('group', { name: 'Type of problem', exact: true }).getByRole('checkbox').first().check();
  await page.getByRole('combobox', { name: 'Disposition', exact: true }).selectOption('repair');
  await page.getByRole('combobox', { name: 'Chosen option', exact: true }).selectOption({ label: 'Repair carefully' });
  await page.getByRole('textbox', { name: 'Instruction text', exact: true }).fill('  Issued wording\nDo not translate.  ');
  await saved(page, 'Save record');
  await transition(page, 'open');
  await page.getByRole('button', { name: 'Apply status', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Record who decided');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Edit record', exact: true }).click();
  await page.getByRole('combobox', { name: 'Decided by', exact: true }).selectOption(String(seed().architectId));
  await page.getByLabel('Decided on', { exact: true }).fill('2026-10-02');
  await saved(page, 'Save record');
  await transition(page, 'open'); await applyStatus(page);
  expect(await (await page.request.get(qi.base)).json()).toMatchObject({ status: 'open', instructionText: '  Issued wording\nDo not translate.  ' });
  await create(page, 'detail_clarification');
  await page.getByRole('button', { name: 'Edit record', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Disposition', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Question', exact: true }).fill('How should the edge be finished?');
  await page.getByRole('combobox', { name: 'Issued by', exact: true }).selectOption(String(seed().architectId));
  await page.getByRole('combobox', { name: 'Route', exact: true }).selectOption({ index: 1 });
  await saved(page, 'Save record'); await transition(page, 'open'); await applyStatus(page);
  await expect(page.getByText('How should the edge be finished?', { exact: true })).toBeVisible();
});

test('status hold reasons and failed then passed verification are explicit and localized', async ({ page }) => {
  await login(page); await create(page); await transition(page, 'open'); await applyStatus(page);
  await transition(page, 'on_hold');
  await page.getByRole('combobox', { name: 'Reason', exact: true }).selectOption('other');
  await page.getByRole('textbox', { name: 'Reason note', exact: true }).fill('Waiting for access.');
  await applyStatus(page);
  await expect(page.getByText('Waiting for access.', { exact: true })).toBeVisible();
  await transition(page, 'open'); await applyStatus(page);
  await transition(page, 'in_progress'); await applyStatus(page);
  await transition(page, 'ready_for_verification'); await applyStatus(page);
  for (const target of ['in_progress', 'closed']) {
    await transition(page, target);
    await page.getByRole('combobox', { name: 'Checked by', exact: true }).selectOption(String(seed().architectId));
    await page.getByLabel('Date', { exact: true }).fill('2026-10-03');
    await page.getByRole('combobox', { name: 'Method', exact: true }).selectOption({ index: 1 });
    await page.getByRole('textbox', { name: 'Verification note', exact: true }).fill(target === 'closed' ? 'Passed after correction.' : 'Needs another correction.');
    await applyStatus(page);
    if (target === 'in_progress') { await transition(page, 'ready_for_verification'); await applyStatus(page); }
  }
  await page.getByText('Verification history (2)', { exact: true }).click();
  await expect(page.getByText('Needs another correction.', { exact: true })).toBeVisible();
  await expect(page.getByText('Passed after correction.', { exact: true })).toBeVisible();
});

test('measurement sets reject normalized duplicates and show exact signed comparisons in date order', async ({ page }) => {
  await login(page); const record = await create(page); await tab(page, 'Measurements');
  await page.getByRole('button', { name: 'Add measurement set', exact: true }).click();
  await page.getByLabel('Date', { exact: true }).fill('2026-10-01');
  await page.getByRole('combobox', { name: 'Item', exact: true }).fill(' Left ');
  await page.getByRole('combobox', { name: 'Quantity', exact: true }).fill('Offset');
  await page.getByLabel('Value', { exact: true }).fill('-1.25');
  await page.getByRole('button', { name: 'Add row', exact: true }).click();
  await page.getByRole('combobox', { name: 'Item', exact: true }).nth(1).fill('left');
  await page.getByRole('combobox', { name: 'Quantity', exact: true }).nth(1).fill(' offset ');
  await page.getByLabel('Value', { exact: true }).nth(1).fill('2.5');
  await page.getByRole('button', { name: 'Save measurements', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('only once');
  await page.getByRole('combobox', { name: 'Item', exact: true }).nth(1).fill('Right');
  await saved(page, 'Save measurements');
  await page.locator('summary').filter({ hasText: /Between items.*offset.*mm/i }).click();
  await expect(page.getByRole('cell', { name: '3.75', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add measurement set', exact: true }).click();
  await page.getByLabel('Date', { exact: true }).fill('2026-10-02');
  await page.getByRole('combobox', { name: 'Phase', exact: true }).selectOption('after');
  await page.getByRole('combobox', { name: 'Item', exact: true }).fill('left');
  await page.getByRole('combobox', { name: 'Quantity', exact: true }).fill('offset');
  await page.getByLabel('Value', { exact: true }).fill('0.125');
  await saved(page, 'Save measurements');
  await page.locator('summary').filter({ hasText: /Before vs after.*Left.*Offset/ }).click();
  await expect(page.getByRole('cell', { name: '1.375', exact: true })).toBeVisible();
  const sets = await (await page.request.get(record.base + '/measurement-sets')).json() as { rows: { value: number }[] }[];
  expect(sets.map(set => set.rows[0]?.value)).toEqual([-1.25, 0.125]);
});

test('owner Log CRUD retains private content and share links support explicit copy and revoke', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await login(page); const record = await create(page); await transition(page, 'open'); await applyStatus(page);
  await tab(page, 'Log'); await page.getByRole('button', { name: 'Add Log entry', exact: true }).click();
  await page.getByRole('textbox', { name: 'Entry', exact: true }).fill('Private synthetic entry');
  await page.getByLabel('Private · owner only', { exact: true }).check();
  await saved(page, 'Save entry');
  await page.getByRole('button', { name: 'Edit entry', exact: true }).click();
  await page.getByRole('textbox', { name: 'Entry', exact: true }).fill('Private synthetic edited');
  await saved(page, 'Save entry');
  await tab(page, 'Sharing'); await page.getByText('Create a share link', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Link label', exact: true }).fill('Synthetic reader');
  await page.getByRole('button', { name: 'Create link', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Share URL', exact: true })).toBeVisible();
  const url = await page.getByRole('textbox', { name: 'Share URL', exact: true }).inputValue();
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  const shared = await context.newPage(); await shared.goto(url);
  await expect(shared.getByRole('heading', { name: record.title, exact: true })).toBeVisible();
  await expect(shared.locator('body')).not.toContainText('Private synthetic');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Revoke link', exact: true }).click();
  await expect(page.getByText('Revoked', { exact: true })).toBeVisible();
  await shared.getByRole('button', { name: 'Ανανέωση', exact: true }).click();
  await expect(shared.getByRole('heading', { name: record.title, exact: true })).toHaveCount(0);
  await expect(shared.getByRole('alert')).toBeVisible();
  await tab(page, 'Log'); page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(page.getByText('Private synthetic edited', { exact: true })).toHaveCount(0);
});

test('independent contributor permissions allow uploader attachment and logger public creation, then revoke visible access', async ({ page, browser }) => {
  await login(page); const record = await create(page); await transition(page, 'open'); await applyStatus(page);
  await tab(page, 'Log'); await page.getByRole('button', { name: 'Add Log entry', exact: true }).click();
  await page.getByRole('textbox', { name: 'Entry', exact: true }).fill('Public entry for contributor evidence'); await saved(page, 'Save entry');
  await tab(page, 'Sharing');
  for (const [username, permission] of [['uploader', 'Upload photos and attachments'], ['logger', 'Add Log entries']] as const) {
    await page.getByRole('combobox', { name: 'User', exact: true }).selectOption(String(seed().users[username]));
    await page.getByLabel(permission, { exact: true }).check();
    await page.getByRole('button', { name: 'Save access', exact: true }).click();
    await expect(page.getByRole('heading', { name: `Sample ${username}`, exact: true })).toBeVisible();
  }
  const uploadContext = await browser.newContext(); const uploader = await uploadContext.newPage();
  const logContext = await browser.newContext(); const logger = await logContext.newPage();
  try {
    await login(uploader, 'uploader'); await uploader.goto(`/assigned/${record.id}`); await tab(uploader, 'Log');
    await expect(uploader.getByRole('button', { name: 'Add Log entry', exact: true })).toHaveCount(0);
    await uploader.getByText('Attach a file to this entry', { exact: true }).click();
    await uploader.getByLabel('Attachment file', { exact: true }).setInputFiles({ name: 'synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic attachment. No personal data.') });
    await uploader.getByRole('button', { name: 'Upload attachment', exact: true }).click();
    await expect(uploader.getByText('Attachment: synthetic.txt', { exact: true })).toBeVisible();
    await login(logger, 'logger'); await logger.goto(`/assigned/${record.id}`); await tab(logger, 'Log');
    await expect(logger.getByText('Attach a file to this entry', { exact: true })).toHaveCount(0);
    await logger.getByRole('button', { name: 'Add Log entry', exact: true }).click();
    await expect(logger.getByLabel('Private · owner only', { exact: true })).toHaveCount(0);
    await logger.getByRole('textbox', { name: 'Entry', exact: true }).fill('Public contributor statement'); await saved(logger, 'Save entry');
    await expect(logger.getByRole('button', { name: 'Edit entry', exact: true })).toHaveCount(0);
    const article = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Sample uploader', exact: true }) });
    page.once('dialog', dialog => dialog.accept()); await article.getByRole('button', { name: 'Remove access', exact: true }).click();
    await expect(article).toHaveCount(0);
    await uploader.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(uploader.getByRole('heading', { name: record.title, exact: true })).toHaveCount(0);
    await expect(uploader.locator('body')).not.toContainText('Public entry for contributor evidence');
    await expect(uploader.getByRole('alert')).toBeVisible();
  } finally { await uploadContext.close(); await logContext.close(); }
});

test('transient refresh failure keeps evidence form and remaining uploads mounted', async ({ page }) => {
  await login(page); const record = await create(page); await tab(page, 'Photos & files');
  await page.getByRole('combobox', { name: 'Upload type', exact: true }).selectOption('attachments');
  await page.getByRole('textbox', { name: 'Attachment title', exact: true }).fill('Pending evidence wording');
  await page.getByLabel('Files', { exact: true }).setInputFiles([
    { name: 'first-synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('First synthetic file') },
    { name: 'second-synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('Second synthetic file') },
  ]);
  let posts = 0;
  await page.route(`**${record.base}`, route => route.fulfill({ status: 500, json: { error: 'temporary_failure' } }));
  await page.route(`**${record.base}/attachments`, route => {
    if (route.request().method() !== 'POST') return route.continue();
    posts++;
    return posts === 2 ? route.fulfill({ status: 507, json: { error: 'storage_capacity' } }) : route.continue();
  });
  await page.getByRole('button', { name: 'Upload evidence', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Storage is full' })).toBeVisible();
  await expect(page.getByRole('heading', { name: record.title, exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Attachment title', exact: true })).toHaveValue('Pending evidence wording');
  await expect(page.getByRole('button', { name: 'Upload evidence', exact: true })).toBeEnabled();
  expect(posts).toBe(2);
  await page.unroute(`**${record.base}`); await page.unroute(`**${record.base}/attachments`);
  await page.getByRole('button', { name: 'Upload evidence', exact: true }).click();
  await expect(page.getByText('Upload complete.', { exact: true })).toBeVisible();
  const files = await (await page.request.get(record.base + '/attachments')).json() as { originalFilename: string }[];
  expect(files.map(file => file.originalFilename).sort()).toEqual(['first-synthetic.txt', 'second-synthetic.txt']);
});

test('inline tag creation and collision recovery retain unsaved record text', async ({ page }) => {
  await login(page); const record = await create(page);
  await page.getByRole('button', { name: 'Edit record', exact: true }).click();
  const wording = '  Unsubmitted record wording\nKeep it intact.  ';
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill(wording);
  await page.getByText('Add a new tag', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Tag name in English', exact: true }).fill('Stone');
  await page.getByRole('button', { name: 'Create and select tag', exact: true }).click();
  await expect(page.getByRole('button', { name: /Use existing tag/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue(wording);
  await page.getByRole('button', { name: /Use existing tag/ }).click();
  await expect(page.getByRole('button', { name: 'Remove Stone', exact: true })).toBeVisible();
  const label = `Synthetic new tag ${Date.now()}`;
  await page.getByRole('combobox', { name: 'Tag name in English', exact: true }).fill(label);
  const tagUrl = `**/api/projects/${seed().projectId}/tags`;
  await page.route(tagUrl, route => route.request().method() === 'POST' ? route.fulfill({ status: 503, json: { error: 'temporary_failure' } }) : route.continue());
  await page.getByRole('button', { name: 'Create and select tag', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Tag name in English', exact: true })).toHaveValue(label);
  await expect(page.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue(wording);
  await page.unroute(tagUrl);
  await page.getByRole('button', { name: 'Create and select tag', exact: true }).click();
  await expect(page.getByRole('button', { name: `Remove ${label}`, exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue(wording);
  await saved(page, 'Save record');
  const result = await (await page.request.get(record.base)).json() as { description: string; tagIds: number[] };
  expect(result.description).toBe(wording); expect(result.tagIds).toHaveLength(2);
});
