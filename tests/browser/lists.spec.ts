import type { Page } from '@playwright/test';
import { test, expect, login, seed } from './fixture';

const entry = (page: Page, name: string) => page.locator('.managed-list > li').filter({ has: page.locator('strong').filter({ hasText: new RegExp(`^${name}$`) }) });
async function openLists(page: Page) {
  await login(page);
  await page.goto(`/projects/${seed().projectId}/lists`);
  await expect(page.getByRole('heading', { name: 'People', exact: true })).toBeVisible();
}
async function tab(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'List selection' }).getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}
async function save(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('section[aria-label="Managed lists"] form')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
}
async function addNamed(page: Page, english: string, greek = '') {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('English name', { exact: true }).fill(english);
  await page.getByLabel('Greek name', { exact: true }).fill(greek);
  await save(page);
  await expect(entry(page, english)).toBeVisible();
}
async function rows<T>(page: Page, list: string): Promise<T[]> {
  const response = await page.request.get(`/api/projects/${seed().projectId}/${list}`);
  expect(response.ok()).toBe(true);
  return await response.json() as T[];
}
async function linkedDraft(page: Page, links: { tagIds?: number[]; locationIds?: number[] }): Promise<number> {
  const response = await page.request.post(`/api/projects/${seed().projectId}/records`, {
    headers: { Origin: new URL(page.url()).origin }, data: { subtype: 'task', title: 'Managed list usage fixture', ...links },
  });
  expect(response.status()).toBe(201);
  return (await response.json() as { id: number }).id;
}
async function record(page: Page, id: number): Promise<{ tagIds: number[]; locationIds: number[] }> {
  const response = await page.request.get(`/api/projects/${seed().projectId}/records/${id}`);
  expect(response.ok()).toBe(true);
  return await response.json() as { tagIds: number[]; locationIds: number[] };
}

test('five managed lists expose named controls; people and trades preserve fields through retirement and reactivation', async ({ page }) => {
  await openLists(page);
  page.on('dialog', dialog => dialog.accept());
  for (const name of ['Trades', 'Tags', 'Locations', 'Zone types', 'People']) await tab(page, name);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Code', { exact: true }).fill('UI-PERSON');
  await page.getByLabel('Name', { exact: true }).fill('List test engineer');
  await page.getByLabel('Role', { exact: true }).selectOption({ label: 'Engineer' });
  await page.getByText('Definitions', { exact: true }).click();
  await expect(page.getByText('Structural, mechanical or electrical engineer.', { exact: true })).toBeVisible();
  await page.getByLabel('Company', { exact: true }).fill('Test engineering');
  await page.getByLabel('Email', { exact: true }).fill('engineer@example.test');
  await page.getByLabel('Phone', { exact: true }).fill('+30 210 1234567');
  await save(page);
  const person = entry(page, 'List test engineer');
  await person.getByRole('button', { name: 'Retire', exact: true }).click();
  await expect(person.getByText('— Retired', { exact: true })).toBeVisible();
  await person.getByRole('button', { name: 'Reactivate', exact: true }).click();
  await expect(person.getByRole('button', { name: 'Retire', exact: true })).toBeVisible();
  await person.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Company', { exact: true })).toHaveValue('Test engineering');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('engineer@example.test');
  await expect(page.getByLabel('Phone', { exact: true })).toHaveValue('+30 210 1234567');
  await page.getByLabel('Company', { exact: true }).fill('Updated engineering');
  await save(page);
  await expect(person).toContainText('Updated engineering');

  await tab(page, 'Trades');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Code', { exact: true }).fill('UI-TRADE');
  await page.getByLabel('English name', { exact: true }).fill('List test masonry');
  await page.getByLabel('Greek name', { exact: true }).fill('Δοκιμαστική τοιχοποιία');
  await page.getByLabel('English definition', { exact: true }).fill('Builds and repairs walls.');
  await page.getByLabel('Greek definition', { exact: true }).fill('Κατασκευάζει και επισκευάζει τοίχους.');
  await save(page);
  const trade = entry(page, 'List test masonry');
  await trade.getByText('Definition', { exact: true }).click();
  await expect(trade.getByText('Builds and repairs walls.', { exact: true })).toBeVisible();
  await trade.getByRole('button', { name: 'Retire', exact: true }).click();
  await expect(trade.getByRole('button', { name: 'Reactivate', exact: true })).toBeVisible();
  await trade.getByRole('button', { name: 'Reactivate', exact: true }).click();
  await expect(trade.getByRole('button', { name: 'Retire', exact: true })).toBeVisible();
  await trade.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'English definition', exact: true }).fill('Builds new walls.');
  await save(page);
  await page.getByLabel('Language', { exact: true }).selectOption('el');
  const greekTrade = entry(page, 'Δοκιμαστική τοιχοποιία');
  await expect(greekTrade).toBeVisible();
  await expect(greekTrade.getByText('Κατασκευάζει και επισκευάζει τοίχους.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Προσθήκη', exact: true })).toBeVisible();
});

test('tag rename offers one named merge target, rejects two collisions, and deletes only after showing usage', async ({ page }) => {
  await openLists(page);
  await tab(page, 'Tags');
  await addNamed(page, 'List stone', 'Δοκιμαστική πέτρα');
  await addNamed(page, 'List water', 'Δοκιμαστικό νερό');
  await addNamed(page, 'List source', 'Δοκιμαστική πηγή');
  const tags = await rows<{ id: number; nameEn: string }>(page, 'tags');
  const sourceId = tags.find(tag => tag.nameEn === 'List source')!.id;
  const stoneId = tags.find(tag => tag.nameEn === 'List stone')!.id;
  const recordId = await linkedDraft(page, { tagIds: [sourceId] });
  await entry(page, 'List source').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('English name', { exact: true }).fill('List stone');
  await page.getByLabel('Greek name', { exact: true }).fill('Δοκιμαστικό νερό');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('two different tags');
  await expect(page.getByRole('button', { name: 'Merge into existing tag' })).toHaveCount(0);
  expect((await record(page, recordId)).tagIds).toEqual([sourceId]);
  await page.getByLabel('Greek name', { exact: true }).fill('Δοκιμαστική πηγή');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('List stone');
  const mergeDialog = page.waitForEvent('dialog');
  const mergeClick = page.getByRole('button', { name: 'Merge into existing tag' }).click();
  const dialog = await mergeDialog;
  expect(dialog.message()).toContain('Merge “List source” into “List stone”');
  await dialog.accept();
  await mergeClick;
  await expect(entry(page, 'List source')).toHaveCount(0);
  await expect(entry(page, 'List stone')).toHaveCount(1);
  expect((await record(page, recordId)).tagIds).toEqual([stoneId]);
  await entry(page, 'List stone').getByRole('button', { name: 'Delete', exact: true }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Confirm deletion' });
  await expect(confirm).toContainText('used by 1 records');
  expect((await record(page, recordId)).tagIds).toEqual([stoneId]);
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(entry(page, 'List stone')).toBeVisible();
  await entry(page, 'List stone').getByRole('button', { name: 'Delete', exact: true }).click();
  await confirm.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(entry(page, 'List stone')).toHaveCount(0);
  expect((await record(page, recordId)).tagIds).toEqual([]);
});

test('locations copy full branches, exclude descendants from moves, save order and zone type, and retire used nodes', async ({ page }) => {
  await openLists(page);
  page.on('dialog', dialog => dialog.accept());
  await tab(page, 'Zone types');
  await addNamed(page, 'List service zone');
  await tab(page, 'Locations');
  for (const name of ['List building A', 'List building B']) {
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByLabel('English name', { exact: true }).fill(name);
    await page.getByLabel('Location kind', { exact: true }).selectOption({ label: 'Building' });
    await save(page);
  }
  await entry(page, 'List building A').getByRole('button', { name: 'Add child' }).click();
  await page.getByLabel('English name', { exact: true }).fill('List room');
  await page.getByLabel('Location kind', { exact: true }).selectOption({ label: 'Space' });
  await page.getByRole('combobox', { name: 'Zone type', exact: true }).selectOption({ label: 'List service zone' });
  await page.getByLabel('Sort order').fill('-5');
  await save(page);
  await entry(page, 'List building A').getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Parent location').getByRole('option', { name: 'List building A', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Parent location').getByRole('option', { name: /List room/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await entry(page, 'List building A').getByRole('button', { name: 'Copy branch' }).click();
  await page.getByLabel('English name', { exact: true }).fill('List building copy');
  await save(page);
  await expect(entry(page, 'List room')).toHaveCount(2);
  const nodes = await rows<{ id: number; nameEn: string; parentId: number | null; zoneTypeId: number; sortOrder: number }>(page, 'locations');
  const copiedRoot = nodes.find(node => node.nameEn === 'List building copy')!;
  const copiedRoom = nodes.find(node => node.nameEn === 'List room' && node.parentId === copiedRoot.id)!;
  expect(copiedRoom.sortOrder).toBe(-5);
  expect(copiedRoom.zoneTypeId).toBeGreaterThan(0);
  const sourceRoom = nodes.find(node => node.nameEn === 'List room' && node.parentId !== copiedRoot.id)!;
  await entry(page, 'List building A').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Parent location').selectOption({ label: 'List building B' });
  await save(page);
  await page.reload();
  await tab(page, 'Locations');
  const movedNodes = await rows<{ id: number; nameEn: string; parentId: number | null }>(page, 'locations');
  expect(movedNodes.find(node => node.nameEn === 'List building A')!.parentId).toBe(movedNodes.find(node => node.nameEn === 'List building B')!.id);
  const recordId = await linkedDraft(page, { locationIds: [sourceRoom.id] });
  await entry(page, 'List building A').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByRole('alert')).toContainText('Records use this branch');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await entry(page, 'List building A').getByRole('button', { name: 'Retire', exact: true }).click();
  await expect(entry(page, 'List building A').getByRole('button', { name: 'Reactivate', exact: true })).toBeVisible();
  expect((await record(page, recordId)).locationIds).toEqual([sourceRoom.id]);
  await entry(page, 'List building copy').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(entry(page, 'List building copy')).toHaveCount(0);
  await expect(entry(page, 'List room')).toHaveCount(1);
  await tab(page, 'Zone types');
  await entry(page, 'List service zone').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByRole('alert')).toContainText('Locations use this zone type');
});

test('zone types rename and delete; unsaved bilingual names survive rejected discard and require a name', async ({ page }) => {
  await openLists(page);
  await tab(page, 'Zone types');
  await addNamed(page, 'List temporary zone');
  await entry(page, 'List temporary zone').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('English name', { exact: true }).fill('List renamed zone');
  await save(page);
  await expect(entry(page, 'List temporary zone')).toHaveCount(0);
  await entry(page, 'List renamed zone').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(entry(page, 'List renamed zone')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enter an English or Greek name');
  await page.getByLabel('Greek name', { exact: true }).fill('Μη αποθηκευμένη ζώνη');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Greek name', { exact: true })).toHaveValue('Μη αποθηκευμένη ζώνη');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('section[aria-label="Managed lists"] form')).toHaveCount(0);
});
