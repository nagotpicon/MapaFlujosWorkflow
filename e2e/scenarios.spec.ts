import { expect, test } from '@playwright/test';
import { openDemo, openFeature, selectNode, waitSaved } from './helpers';

test('escenarios: clonar, cambiar una variable, ejecutar, comparar, guardar, recargar e independencia', async ({ page }) => {
  await openDemo(page);
  const totalText = async () => (await page.getByTestId('kpi-total').textContent()) ?? '';
  await expect(page.getByTestId('kpi-total')).toContainText('aprovechas el 19');
  const totalBase = await totalText();
  // 1. clonar el escenario base
  await page.getByTestId('scenario-switcher').click();
  await page.getByRole('menuitem', { name: /Duplicar «Situación inicial»/ }).click();
  await expect(page.getByTestId('scenario-switcher')).toContainText('Situación inicial (copia)');
  await expect(page.getByTestId('scenario-banner')).toBeVisible();
  // 2. cambiar una variable (filtro de clasificación) solo en este escenario
  await selectNode(page, 'Clasificación de llamadas');
  await openFeature(page, 'behaviors');
  const card = page.getByTestId('behavior-card').first();
  const pass = card.locator('[data-param="passRatio"]');
  await pass.fill('90');
  await pass.press('Enter');
  await expect(page.getByTestId('override-mark').first()).toBeVisible();
  // 3. ejecutar: el resultado cambia
  await expect.poll(totalText).not.toBe(totalBase);
  await expect.poll(totalText).toMatch(/Total en la meta\d+aprovechas el \d/);
  const totalClone = await totalText();
  // 4. comparar
  await page.getByTestId('tab-scenarios').click();
  await page.getByTestId('scenario-compare').click();
  await expect(page.getByTestId('compare')).toContainText('Parámetros que difieren');
  await expect(page.getByTestId('compare')).toContainText('parameters.passRatio');
  await page.keyboard.press('Escape');
  // 5–7. guardar, recargar y recuperar ambos escenarios
  await waitSaved(page);
  await page.reload();
  await expect(page.getByTestId('scenario-switcher')).toContainText('Situación inicial (copia)');
  await expect(page.getByTestId('kpi-total')).toHaveText(totalClone);
  // 8. configuraciones independientes: el base conserva su valor
  await page.getByTestId('scenario-switcher').click();
  await page.getByRole('menuitem', { name: /^Situación inicial/ }).first().click();
  await expect(page.getByTestId('kpi-total')).toHaveText(totalBase);
  await selectNode(page, 'Clasificación de llamadas');
  await openFeature(page, 'behaviors');
  await expect(page.getByTestId('behavior-card').first()).toContainText('Deja pasar 65%');
});

test('escenarios de la demo: combinar mejoras supera a la situación inicial', async ({ page }) => {
  await openDemo(page);
  const base = Number((await page.getByTestId('kpi-total').innerText()).split('\n')[1].replace(/\./g, '').replace(',', '.'));
  await page.getByTestId('scenario-switcher').click();
  await page.getByRole('menuitem', { name: /E · Combinar mejoras/ }).click();
  await expect.poll(async () => Number((await page.getByTestId('kpi-total').innerText()).split('\n')[1].replace(/\./g, '').replace(',', '.'))).toBeGreaterThan(base);
});
