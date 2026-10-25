import { expect, test } from '@playwright/test';

const kingdomCards = (page: import('@playwright/test').Page) => page.getByRole('list', { name: 'Kingdom cards' }).getByTestId('card');

test('picks a kingdom and reproduces it from the share link', async ({ page }) => {
  await page.goto('/');
  await expect(kingdomCards(page)).toHaveCount(10);
  await expect(page.getByTestId('score')).toBeVisible();

  const names = await kingdomCards(page).getByRole('link').allTextContents();
  const shareUrl = page.url();
  expect(shareUrl).toContain('seed=');

  await page.goto(shareUrl);
  await expect(kingdomCards(page)).toHaveCount(10);
  expect(await kingdomCards(page).getByRole('link').allTextContents()).toEqual(names);
});

test('lock and swap', async ({ page }) => {
  await page.goto('/?seed=e2e&p=base2,intrigue2&l=0&a=any&c=1&m=0');
  await expect(kingdomCards(page)).toHaveCount(10);
  const names = await kingdomCards(page).getByRole('link').allTextContents();

  await page.getByRole('button', { name: `Lock ${names[0]}` }).click();
  await page.getByRole('button', { name: /Pick again \(keep 1\)/ }).click();
  await expect(page.getByRole('link', { name: names[0], exact: true })).toBeVisible();

  const current = await kingdomCards(page).getByRole('link').allTextContents();
  const target = current.find((n) => n !== names[0])!;
  await page.getByRole('button', { name: `Swap ${target}` }).click();
  await expect(page.getByRole('link', { name: target, exact: true })).toHaveCount(0);
  await expect(kingdomCards(page)).toHaveCount(10);
});

test('settings filter the sets used', async ({ page }) => {
  await page.goto('/');
  // First visit: the settings panel starts open so new players pick their sets.
  await page.getByRole('button', { name: 'Clear' }).click();
  await page.getByRole('checkbox', { name: /^Seaside\s*2nd Edition$/ }).check();
  await page.getByRole('button', { name: 'Pick a kingdom' }).click();
  await expect(page).toHaveURL(/p=seaside2&/);
  const sets = await kingdomCards(page).locator('.set').allTextContents();
  expect(new Set(sets)).toEqual(new Set(['Seaside']));
});

test('works offline after the first visit (PWA)', async ({ page, context }) => {
  await page.goto('/');
  await expect(kingdomCards(page)).toHaveCount(10);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // let the service worker take control
  await expect(kingdomCards(page)).toHaveCount(10);

  await context.setOffline(true);
  await page.reload();
  await expect(kingdomCards(page)).toHaveCount(10);
  await expect(page.getByText(/Offline/)).toBeVisible();
});

test('serves a valid web app manifest and security headers', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const json = await manifest.json();
  expect(json.display).toBe('standalone');
  expect(json.icons.map((i: { sizes: string }) => i.sizes)).toContain('512x512');

  const res = await request.get('/');
  expect(res.headers()['content-security-policy']).toContain("default-src 'self'");
});
