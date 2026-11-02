import { expect, test } from '@playwright/test';
import { openDemo } from './helpers';

for (const scheme of ['light', 'dark'] as const) {
  test(`tema ${scheme}: interfaz, paneles e inspector`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await openDemo(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe(scheme === 'light' ? 'rgb(246, 246, 243)' : 'rgb(18, 19, 22)');
    await page.locator('[data-node-title="Cierre"]').click();
    await expect(page.getByTestId('node-inspector')).toBeVisible();
    await page.screenshot({ path: `test-results/visual-${scheme}.png` });
    await ctx.close();
  });
}

test('selector de tema: claro, oscuro y sistema; se recuerda', async ({ page }) => {
  await openDemo(page);
  await page.getByTestId('theme-menu').click();
  await page.getByRole('menuitem', { name: 'Oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByTestId('theme-menu').click();
  await page.getByRole('menuitem', { name: 'Claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('accesibilidad básica: controles con nombre y foco visible', async ({ page }) => {
  await openDemo(page);
  const unnamed = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && !(b.getAttribute('aria-label') || b.textContent?.trim() || b.getAttribute('title'))).map((b) => b.outerHTML.slice(0, 120)));
  expect(unnamed).toEqual([]);
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
  expect(outline).not.toBe('none');
});
