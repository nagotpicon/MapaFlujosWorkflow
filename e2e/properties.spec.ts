import { expect, test } from '@playwright/test';
import { connectNodes, createBubble, newProject, node, openDemo, selectNode, waitSaved } from './helpers';

test.describe('Propiedades y motor desde la interfaz', () => {
  test('entrada 100 → filtro 65 % → salida recibe 65; peso, polaridad, condición, mitigador y persistencia', async ({ page }) => {
    await newProject(page);
    await page.getByTestId('tool-input').click();
    await page.locator('.react-flow__pane').click({ position: { x: 250, y: 300 } });
    await page.getByTestId('node-title-input').fill('Llamadas');
    await page.getByTestId('node-title-input').press('Enter');
    await createBubble(page, 'Filtro útil', 520, 300);
    await page.getByTestId('tool-output').click();
    await page.locator('.react-flow__pane').click({ position: { x: 800, y: 300 } });
    await page.getByTestId('node-title-input').fill('Útiles');
    await page.getByTestId('node-title-input').press('Enter');
    await connectNodes(page, 'Llamadas', 'Filtro útil');
    await connectNodes(page, 'Filtro útil', 'Útiles');

    // comportamiento: filtro del 65 %
    await selectNode(page, 'Filtro útil');
    await page.getByTestId('section-behaviors').getByRole('button', { name: 'Comportamientos' }).click();
    await page.getByTestId('add-behavior').click();
    await page.getByTestId('behavior-option-filter').click();
    const card = page.getByTestId('behavior-card').first();
    await card.getByRole('button', { name: /Filtro/ }).click();
    const pass = card.locator('[data-param="passRatio"]');
    await pass.fill('65');
    await pass.press('Enter');
    await expect(card).toContainText('Deja pasar 65%');
    // la salida recibe 65 unidades
    await expect(node(page, 'Útiles').getByTestId('node-flow')).toHaveText(/^65/);

    // peso / polaridad (influencia negativa)
    await page.getByTestId('section-weights').getByRole('button', { name: 'Peso e influencia' }).click();
    await page.getByRole('radio', { name: 'Pond.' }).nth(1).click();
    await expect(page.getByTestId('scale-Influencia')).toHaveText('0');
    // condición de activación
    await page.getByTestId('section-conditions').getByRole('button', { name: /Condiciones de activación/ }).click();
    await page.getByTestId('section-conditions').getByTestId('add-condition').click();
    await expect(page.getByTestId('condition-block')).toBeVisible();
    // mitigador
    await page.getByTestId('section-mitigators').getByRole('button', { name: /Mitigadores/ }).click();
    await page.getByTestId('add-mitigator').click();
    await expect(page.getByTestId('mitigator-row')).toHaveCount(1);
    // modificar su efecto
    const amt = page.getByTestId('mitigator-row').locator('[data-param="compensation-amount"]');
    await amt.fill('2');
    await amt.press('Enter');
    await expect(node(page, 'Medida compensatoria')).toBeVisible();
    // efecto neto: 2 puntos sobre fondo de escala 5 = 40 % compensado → 65 + 35 × 0,4 = 79
    await expect(node(page, 'Útiles').getByTestId('node-flow')).toHaveText(/^79/);

    // persistencia tras recargar
    await waitSaved(page);
    await page.reload();
    await selectNode(page, 'Filtro útil');
    await expect(page.getByTestId('behavior-card')).toContainText('Deja pasar 65%');
    await expect(node(page, 'Útiles').getByTestId('node-flow')).toHaveText(/^79/);
    await page.getByTestId('section-mitigators').getByRole('button', { name: /Mitigadores/ }).click();
    await expect(page.getByTestId('mitigator-row').locator('[data-param="compensation-amount"]')).toHaveValue('2');
  });

  test('vistas, termómetro, marco espacial y diagnóstico sobre la demostración', async ({ page }) => {
    await openDemo(page);
    for (const v of ['Mental', 'Energía', 'Sistema', 'Simulación', 'Flujo']) {
      await page.getByRole('radio', { name: v }).click();
      await expect(page.getByTestId('canvas')).toHaveAttribute('data-view', { Mental: 'mental', Energía: 'energy', Sistema: 'system', Simulación: 'simulation', Flujo: 'flow' }[v]!);
    }
    // el cambio de vista no pierde elementos
    await expect(page.locator('[data-testid="map-node"]')).toHaveCount(19);
    await page.getByTestId('heat-toggle').click();
    await expect(page.getByTestId('heat-toggle')).toHaveClass(/bg-accent-soft/);
    // marco espacial: activar cuadrícula y fecha límite
    await page.getByTestId('frame-toggle').click();
    await page.getByRole('radio', { name: 'Cuadrícula que computa' }).click();
    await expect(page.getByTestId('frame-grid')).toBeVisible();
    await page.keyboard.press('Escape');
    // diagnóstico explicable
    await page.getByTestId('tab-diagnostics').click();
    await expect(page.getByTestId('diagnostic').first()).toBeVisible();
    await page.getByTestId('diagnostic').first().click();
    await expect(page.getByText('Regla:').first()).toBeVisible();
    // simulación paso a paso y por iteraciones
    await page.getByTestId('tab-simulation').click();
    await page.getByTestId('sim-next').click();
    await expect(page.getByTestId('kpi-iteration')).toContainText('2/12');
    await page.getByTestId('sim-step').click();
    await expect(page.getByTestId('step-info')).toContainText('Paso 1/');
    await page.getByTestId('sim-prev').click();
    await expect(page.getByTestId('kpi-iteration')).toContainText('1/12');
  });

  test('monitor y «Dímelo claro» con exportación', async ({ page }) => {
    await openDemo(page);
    await page.getByTestId('open-monitor').click();
    await expect(page.getByTestId('funnel')).toContainText('Llamadas recibidas');
    await expect(page.getByTestId('frictions')).toBeVisible();
    await expect(page.getByTestId('drivers')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByTestId('open-verdict').click();
    await expect(page.getByTestId('verdict-point')).toContainText('de cada 100');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('verdict-md').click()]);
    expect(dl.suggestedFilename()).toMatch(/dimelo-claro.*\.md$/);
  });
});
