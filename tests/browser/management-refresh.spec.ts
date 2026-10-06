import { test, expect, login, seed } from './fixture';

test('owner creates, renames and deletes a project after reviewing its contents', async ({ page }, testInfo) => {
  await login(page); await page.goto('/projects');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByLabel('Project name', { exact: true }).fill('Interface project');
  await page.getByLabel('Project code', { exact: true }).fill('UI-PROJECT');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Interface project', exact: true }) });
  await expect(row).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('projects-desktop.png'), fullPage: true });
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Project name', { exact: true }).fill('Renamed interface project');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const renamed = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Renamed interface project', exact: true }) });
  await renamed.getByRole('button', { name: 'Delete project', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete project', exact: true });
  await expect(dialog).toContainText('0 records');
  await expect(dialog.getByRole('button', { name: 'Delete permanently' })).toBeDisabled();
  await dialog.getByLabel('Type the project name to confirm', { exact: true }).fill('Renamed interface project');
  await dialog.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(renamed).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Browser test project', exact: true })).toBeVisible();
});

test('managed lists use searchable compact tables and a separate entry editor', async ({ page }, testInfo) => {
  await login(page); await page.goto(`/projects/${seed().projectId}/lists`);
  const table = page.getByRole('table', { name: 'People', exact: true });
  await expect(table).toBeVisible();
  await page.getByLabel('Search entries', { exact: true }).fill('ARCH');
  await expect(table.getByRole('button', { name: 'Sample architect', exact: true })).toBeVisible();
  await table.getByRole('button', { name: 'Sample architect', exact: true }).click();
  const editor = page.getByRole('region', { name: 'Entry details', exact: true });
  await expect(editor.getByLabel('Name', { exact: true })).toHaveValue('Sample architect');
  const tableBox = await table.boundingBox(); const editorBox = await editor.boundingBox();
  expect(editorBox!.x).toBeGreaterThan(tableBox!.x);
  await page.screenshot({ path: testInfo.outputPath('people-desktop.png'), fullPage: true });
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('navigation', { name: 'List selection' }).getByRole('button', { name: 'Tags', exact: true }).click();
  await page.getByLabel('Search entries', { exact: true }).fill('ΠΕΤΡΑ');
  await expect(page.getByRole('button', { name: 'Stone', exact: true })).toBeVisible();
  await page.getByLabel('Search entries', { exact: true }).fill('no matching entries');
  await expect(page.getByText('No matching entries.', { exact: true })).toBeVisible();
});

test('phone users can switch managed lists and return from the editor without losing their search', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page); await page.goto(`/projects/${seed().projectId}/lists`);
  await page.getByRole('combobox', { name: 'List', exact: true }).selectOption('trades');
  await page.getByLabel('Search entries', { exact: true }).fill('MAS');
  await page.getByRole('button', { name: 'Stonework', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Entry details' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('trade-phone.png'), fullPage: true });
  await page.getByRole('button', { name: 'Back to list', exact: true }).click();
  await expect(page.getByLabel('Search entries', { exact: true })).toHaveValue('MAS');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('locations use expandable branches and one details panel with a visible parent path', async ({ page }, testInfo) => {
  await login(page); await page.goto(`/projects/${seed().projectId}/lists`);
  await page.getByRole('navigation', { name: 'List selection' }).getByRole('button', { name: 'Locations', exact: true }).click();
  await page.getByRole('button', { name: 'Collapse Villa 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kitchen', exact: true })).toHaveCount(0);
  await page.getByLabel('Search entries', { exact: true }).fill('ΚΟΥΖΙΝΑ');
  await expect(page.getByRole('button', { name: 'Villa 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kitchen', exact: true }).click();
  const editor = page.getByRole('region', { name: 'Entry details' });
  await expect(editor.getByLabel('Location path')).toContainText('Villa 1');
  await expect(editor.getByRole('button', { name: 'Add child', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add child', exact: true })).toHaveCount(1);
  await page.getByLabel('Search entries', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('locations-desktop.png'), fullPage: true });
});
