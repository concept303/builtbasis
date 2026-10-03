import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
export { test, expect };
export interface Seed { projectId: number; recordId: number; shareUrl: string; dbPath: string; architectId: number; users: Record<'uploader' | 'logger' | 'reader', number> }
export function seed(): Seed { return JSON.parse(readFileSync(resolve('test-results/browser-seed.json'), 'utf8')) as Seed; }
export async function login(page: Page, username = 'owner'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
}
