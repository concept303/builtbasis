import { expect, test } from '@playwright/test';
const harness = 'http://127.0.0.1:5174/tests/browser/fixtures/controls-harness.html';
test('info has a compact dotted icon and dismissible accessible help on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 }); await page.goto(harness);
  const info = page.getByRole('button', { name: 'Priority definition' });
  await info.hover(); await expect(page.getByRole('tooltip')).toBeVisible();
  await expect(info.locator('.info-symbol')).toHaveCSS('border-style', 'dotted');
  expect((await info.boundingBox())!.width).toBeGreaterThanOrEqual(24);
  await info.press('Escape'); await expect(page.getByRole('tooltip')).toHaveCount(0);
  await info.click(); await expect(page.getByRole('tooltip')).toBeVisible();
  await page.getByRole('button', { name: 'Outside', exact: true }).click(); await expect(page.getByRole('tooltip')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});
test('single picker folds Greek, keeps arrow selection open and does not submit on search Enter', async ({ page }) => {
  await page.goto(harness); const trigger = page.getByRole('button', { name: 'Choose package' });
  await trigger.click(); await page.getByRole('searchbox').fill('τοιχοσ');
  await expect(page.getByRole('radio', { name: 'ΤΟΊΧΟΣ' })).toBeVisible();
  await page.getByRole('searchbox').press('Enter'); await expect(page.locator('body')).not.toHaveAttribute('data-submitted');
  await page.getByRole('radio', { name: 'ΤΟΊΧΟΣ' }).click(); await expect(page.getByRole('searchbox')).toHaveCount(0);
  await trigger.click(); const selected = page.getByRole('radio', { name: 'ΤΟΊΧΟΣ' });
  await selected.focus(); await selected.press('ArrowDown'); await expect(page.getByRole('radio', { name: 'Frames' })).toBeChecked();
  await expect(page.getByRole('searchbox')).toBeVisible(); await page.keyboard.press('Enter'); await expect(trigger).toBeFocused();
});
test('outside blank space closes the whole multi picker without stealing focus', async ({ page }) => {
  await page.goto(harness); await page.getByRole('button', { name: 'Choose trades' }).click();
  await page.getByRole('checkbox', { name: 'Frames' }).check();
  await page.mouse.click(1100, 160); await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove Frames' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose trades' }).click(); await page.getByRole('searchbox').press('Escape');
  await expect(page.getByRole('button', { name: 'Choose trades' })).toBeFocused();
});
test('sparse status bar retains two exact labelled groups with white separation', async ({ page }) => {
  await page.goto(harness);
  const segments = page.locator('.package-status-segment'); await expect(segments).toHaveCount(2);
  await expect(segments.nth(0)).toHaveAttribute('data-group', 'closed'); await expect(segments.nth(1)).toHaveAttribute('data-group', 'waiting');
  await expect(page.locator('.package-status-track')).toHaveCSS('gap', '2px');
  await expect(page.locator('.package-status-bar')).toContainText('8'); await expect(page.locator('.package-status-bar')).toContainText('2');
});
test('today advances at Athens midnight even in another browser timezone', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-06T20:59:50Z') }); await page.goto(harness);
  await expect(page.getByLabel('Today')).toHaveText('2026-10-06');
  await page.clock.runFor(61_000); await expect(page.getByLabel('Today')).toHaveText('2026-10-07');
});
