import { test, expect, login, seed } from './fixture';
const origin = 'http://127.0.0.1:3490';
test('creates packages, retains form errors and confirms completion using fresh outstanding records', async ({ page }) => {
  await login(page); const { projectId } = seed(); const base = `/api/projects/${projectId}`;
  await page.goto(`/projects/${projectId}/work-packages`); await page.getByRole('button', { name: 'New work package', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Create work package', exact: true }).click();
  await expect(dialog.getByLabel('Name (required)')).toHaveAttribute('aria-invalid','true');
  await dialog.getByLabel('Name (required)').fill('Lifecycle package'); await dialog.getByLabel('Description', { exact: true }).fill('Keep this description');
  await dialog.getByRole('button', { name: 'Create work package', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lifecycle package', exact: true })).toBeVisible();
  const id = Number(page.url().split('/').pop());
  await page.getByRole('button', { name: 'Edit package', exact: true }).click(); dialog = page.getByRole('dialog');
  await dialog.getByLabel('Status', { exact: true }).selectOption('completed');
  await page.request.post(`${base}/records`, { headers: { origin }, data: { subtype: 'task', title: 'Late member', workPackageId: id } });
  await dialog.getByRole('button', { name: 'Save package', exact: true }).click();
  await expect(dialog).toContainText('1 records in this package are still outstanding');
  await dialog.getByRole('button', { name: 'Go back', exact: true }).click(); await expect(dialog.getByLabel('Status', { exact: true })).toBeFocused();
  await expect(dialog.getByLabel('Description', { exact: true })).toHaveValue('Keep this description');
  await dialog.getByRole('button', { name: 'Save package', exact: true }).click(); await dialog.getByRole('button', { name: 'Mark as Completed', exact: true }).click();
  await expect(page.getByRole('note')).toContainText('1 record is still outstanding');
  await page.getByRole('button', { name: 'Delete package', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('This package contains 1 records');
  await expect(page.getByRole('link', { name: 'Show its records', exact: true })).toBeVisible();
});
test('deletes an empty package only after exact-name confirmation', async ({ page }) => {
  await login(page); const { projectId } = seed(); const p = await (await page.request.post(`/api/projects/${projectId}/work-packages`, { headers: { origin }, data: { name: 'Delete empty' } })).json();
  await page.goto(`/projects/${projectId}/work-packages/${p.id}`); await page.getByRole('button', { name: 'Delete package', exact: true }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog.getByRole('button', { name: 'Delete package', exact: true })).toBeDisabled();
  await dialog.getByLabel('Type the package name to confirm').fill('Delete empty'); await dialog.getByRole('button', { name: 'Delete package', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/work-packages`)); await expect(page.getByText('Work package deleted.', {exact:true})).toBeVisible();
});
test('duplicate names retain the draft, and uncertain create is reconciled without a repeated POST', async ({ page }) => {
  await login(page); const { projectId } = seed(); const endpoint = `/api/projects/${projectId}/work-packages`;
  await page.request.post(endpoint,{headers:{origin},data:{name:'Existing name'}});
  await page.goto(`/projects/${projectId}/work-packages`); await page.getByRole('button',{name:'New work package',exact:true}).click();
  const dialog=page.getByRole('dialog'); await dialog.getByLabel('Name (required)').fill('EXISTING NAME'); await dialog.getByLabel('Description',{exact:true}).fill('Retain my prose');
  await dialog.getByRole('button',{name:'Create work package',exact:true}).click(); await expect(dialog.getByRole('alert')).toContainText('already exists'); await expect(dialog.getByLabel('Description',{exact:true})).toHaveValue('Retain my prose');
  await dialog.getByLabel('Name (required)').fill('Uncertain package'); let posts=0;
  await page.route(endpoint,async route=>{if(route.request().method()!=='POST')return route.continue();posts++;await route.fetch();await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'internal_error'})});});
  await dialog.getByRole('button',{name:'Create work package',exact:true}).click(); await expect(dialog.getByRole('button',{name:'Create work package',exact:true})).toBeDisabled();
  await dialog.getByRole('button',{name:'Refresh list',exact:true}).click(); await dialog.getByRole('button',{name:'Use this package',exact:true}).click(); await expect(page.getByRole('heading',{name:'Uncertain package',exact:true})).toBeVisible();expect(posts).toBe(1);
});
test('a record assigned during deletion switches the confirmation to a blocked explanation',async({page})=>{
  await login(page);const {projectId}=seed();const base=`/api/projects/${projectId}`;
  const p=await(await page.request.post(`${base}/work-packages`,{headers:{origin},data:{name:'Deletion race'}})).json();
  await page.goto(`/projects/${projectId}/work-packages/${p.id}`);await page.getByRole('button',{name:'Delete package',exact:true}).click();const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Type the package name to confirm').fill(p.name);
  await page.request.post(`${base}/records`,{headers:{origin},data:{subtype:'task',title:'Arrived late',workPackageId:p.id}});
  await dialog.getByRole('button',{name:'Delete package',exact:true}).click();await expect(dialog).toContainText('This package contains 1 records');await expect(dialog.getByRole('button',{name:'Delete package',exact:true})).toHaveCount(0);
});
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
