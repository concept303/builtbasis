import { test, expect, login, seed } from './fixture';
import type { OperationsStatus } from '../../src/server/monitoring/status';

test('healthy status is hidden on working pages and always available in Administration', async ({ page }) => {
  await login(page);
  const status = await (await page.request.get('/api/operations/status')).json() as OperationsStatus;
  status.backup = { state: 'ok', sourceCreatedAt: new Date().toISOString(), ageHours: 0, maxAgeHours: 36 };
  status.storage = { ...status.storage, state: 'ok', managedHeadroomBytes: '6000000000', warningBelowBytes: '5000000000' };
  let requests = 0;
  await page.route('**/api/operations/status', route => { requests++; return route.fulfill({ json: status }); });
  const paths = ['/projects', `/projects/${seed().projectId}/records`, `/projects/${seed().projectId}/lists`, `/projects/${seed().projectId}/records/${seed().recordId}`];
  for (const path of paths) {
    const before = requests;
    await page.goto(path);
    await expect.poll(() => requests).toBeGreaterThan(before);
    await expect(page.getByTestId('operations-status')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Administration', exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: 'Administration', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Administration', exact: true })).toBeVisible();
  const box = page.getByRole('region', { name: 'Server backup and storage' });
  await expect(box).toContainText('Server backup is recent');
  await expect(box).toContainText('6 GB');
  await expect(box).toContainText('Warning below: 5 GB');
  await box.getByText('Storage details', { exact: true }).click();
  await expect(box.getByText(/does not establish hosting account quota/)).toBeVisible();
  await page.getByLabel('Language', { exact: true }).selectOption('el');
  await expect(page.getByRole('heading', { name: 'Διαχείριση', exact: true })).toBeVisible();
  await expect(box).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Αντίγραφα ασφαλείας και χώρος' })).toContainText('Προειδοποίηση κάτω από: 5 GB');
});

test('warnings are compact, link to Administration and disappear after recovery', async ({ page }) => {
  await login(page);
  await page.goto(`/projects/${seed().projectId}/records`);
  const box = page.getByRole('region', { name: 'Server backup and storage' });
  await expect(box).toContainText('No completed server backup');
  await expect(box).toContainText('File allowance is below the warning threshold');
  await expect(box.getByText('Storage details', { exact: true })).toHaveCount(0);
  await box.getByRole('link', { name: 'Open Administration' }).click();
  await expect(page.getByRole('heading', { name: 'Administration', exact: true })).toBeVisible();
  await expect(box.getByText('Storage details', { exact: true })).toBeVisible();

  const status = await (await page.request.get('/api/operations/status')).json() as OperationsStatus;
  status.storage.state = 'ok';
  status.backup.state = 'overdue';
  await page.route('**/api/operations/status', route => route.fulfill({ json: status }));
  await page.goto('/projects');
  await expect(box).toContainText('Server backup overdue');
  status.backup.state = 'unavailable';
  await page.evaluate(() => dispatchEvent(new Event('focus')));
  await expect(box).toContainText('Backup status unavailable');
  status.backup.state = 'ok';
  await page.evaluate(() => dispatchEvent(new Event('focus')));
  await expect(box).toHaveCount(0);
});

test('failed status checks warn instead of leaving a healthy or empty display', async ({ page }) => {
  await login(page);
  await page.route('**/api/operations/status', route => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/projects');
  const box = page.getByRole('region', { name: 'Server backup and storage' });
  await expect(box).toContainText('Status unavailable');
  await expect(box).not.toContainText('File allowance remaining');
  await page.getByLabel('Language', { exact: true }).selectOption('el');
  await expect(page.getByRole('region', { name: 'Αντίγραφα ασφαλείας και χώρος' })).toContainText('Η κατάσταση δεν είναι διαθέσιμη');
});

test('Administration and status are absent from contributor, share and print views', async ({ page }) => {
  await login(page, 'reader');
  await page.goto('/administration');
  await expect(page.getByRole('heading', { name: 'Assigned records' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Administration', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('operations-status')).toHaveCount(0);
  expect((await page.request.get('/api/operations/status')).status()).toBe(403);
  await page.goto(seed().shareUrl);
  await expect(page.getByTestId('operations-status')).toHaveCount(0);
  await page.context().clearCookies();
  await login(page);
  await page.goto(`/projects/${seed().projectId}/records/${seed().recordId}/print`);
  await expect(page.getByTestId('operations-status')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Administration', exact: true })).toHaveCount(0);
});

