import { expect, test } from '@playwright/test';
import { openDemo } from './helpers';

test('por defecto se abre en blanco roto (paleta de Claude), aunque el sistema esté en oscuro', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(250, 249, 245)');
  await ctx.close();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`tema ${scheme}: interfaz, paneles e inspector`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    // «Como mi ordenador»: sigue al sistema
    await page.addInitScript(() => { try { localStorage.setItem('mdf.theme.v2', JSON.stringify('system')); } catch { /* */ } });
    await openDemo(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe(scheme === 'light' ? 'rgb(250, 249, 245)' : 'rgb(38, 38, 36)');
    // el mapa se centra con una animación: si el clic cae a mitad, se repite
    await expect(async () => {
      await page.locator('[data-node-title="Cierre"]').click();
      await expect(page.getByTestId('action-bar')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15_000 });
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
