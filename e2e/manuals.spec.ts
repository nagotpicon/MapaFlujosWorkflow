import { test, expect } from '@playwright/test';

for (const [path, title, mustContain] of [
  ['/manual/', 'Mapa de Flujos — Manual de usuario', 'Pegar proyecto (JSON)'],
  ['/manual-ia/', 'Mapa de Flujos — Manual para IA (basado en prompts)', 'Prompt maestro'],
] as const) {
  test(`página ${path}: se lee sin errores y todos los enlaces internos llevan a un apartado`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(path);
    await expect(page.locator('main h1')).toHaveText(title);
    await expect(page.locator('main')).toContainText(mustContain);
    const broken = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')]
      .map((a) => decodeURIComponent(a.getAttribute('href')!.slice(1)))
      .filter((id) => id && !document.getElementById(id)));
    expect(broken).toEqual([]);
    expect(await page.locator('aside a').count()).toBeGreaterThan(15);
    expect(errors).toEqual([]);
  });
}

test('el botón «Copiar» de un prompt copia su texto', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/manual-ia/');
  const block = page.locator('.code').filter({ hasText: 'Eres el copiloto experto' }).first();
  await block.locator('.copy').click();
  await expect(block.locator('.copy')).toHaveText('Copiado');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('Eres el copiloto experto de «Mapa de Flujos»');
});

test('texto plano para IA, llms.txt y ejemplos se sirven', async ({ request }) => {
  const md = await request.get('/MANUAL-IA.md');
  expect(md.ok()).toBe(true);
  expect(await md.text()).toContain('## 1. Prompt maestro');
  expect(await (await request.get('/MANUAL-USUARIO.md')).text()).toContain('# Mapa de Flujos — Manual de usuario');
  expect(await (await request.get('/llms.txt')).text()).toContain('/MANUAL-IA.md');
  const ex = await request.get('/ejemplos/mapa-ejemplo-ia.json');
  expect((await ex.json()).project.name).toBe('Captar alumnos de guitarra (ejemplo IA)');
});

test('la aplicación enlaza los manuales: inicio, barra superior y ayuda', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-manuals').getByRole('link', { name: 'Manual de usuario' })).toHaveAttribute('href', /\/manual\/$/);
  await expect(page.getByTestId('start-manuals').getByRole('link', { name: 'Manual para IA' })).toHaveAttribute('href', /\/manual-ia\/$/);
  await page.getByTestId('new-project').click();
  const [popup] = await Promise.all([context.waitForEvent('page'), page.getByTestId('open-manual').click()]);
  await popup.waitForLoadState();
  await expect(popup.locator('main h1')).toHaveText('Mapa de Flujos — Manual de usuario');
  await popup.close();
  await page.getByTestId('main-menu').click();
  await page.getByRole('menuitem', { name: 'Ayuda y atajos' }).click();
  await expect(page.getByTestId('help-manuals').getByRole('link', { name: /Manual para IA/ })).toBeVisible();
});
