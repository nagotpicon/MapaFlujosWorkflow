import { expect, test } from '@playwright/test';
import { createBubble, newProject, node } from './helpers';

test('núcleo creativo: de una idea suelta a un camino, todo desde la tarjeta del lienzo', async ({ page }) => {
  await newProject(page);
  await createBubble(page, 'Vender pan', 420, 320);
  const bar = page.getByTestId('action-bar');
  await expect(bar).toBeVisible();
  // la tarjeta pregunta qué es y lo convierte ahí mismo
  await expect(bar.getByTestId('next-step-role')).toContainText('¿Qué es esto?');
  await bar.getByTestId('next-role-input').click();
  await expect(bar.getByTestId('node-live')).toContainText('De aquí salen 100 en cada vuelta');
  // ¿qué pasa después? → un paso nuevo, ya unido y listo para escribir
  await bar.getByTestId('next-after').click();
  await expect(page.getByTestId('node-title-input')).toBeFocused();
  await page.keyboard.type('Clientes que entran');
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  // en el camino: ¿qué le pasa a lo que llega? → un colador, abierto para ajustarlo
  await expect(bar.getByTestId('next-step-behavior')).toBeVisible();
  await bar.getByTestId('next-bh-filter').click();
  const pass = bar.getByTestId('behavior-card').locator('[data-param="passRatio"]');
  await pass.fill('40');
  await pass.press('Enter');
  await expect(node(page, 'Clientes que entran').getByTestId('node-chips')).toContainText('pasa el 40 %');
  // la puerta del colador: ¿adónde van los que no pasan?
  await bar.getByTestId('feature-back').click();
  await expect(bar.getByTestId('next-reject')).toBeVisible();
  // y para terminar, la meta
  await bar.getByTestId('next-goal').click();
  await expect(page.getByTestId('node-title-input')).toBeFocused();
  await page.keyboard.type('Ventas');
  await page.keyboard.press('Enter');
  await expect(node(page, 'Ventas').getByTestId('node-flow')).toHaveText(/^40/);
});

test('🔇 silenciar una piedra: se ve al momento cuánto frena, sin borrar nada', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-demo').click();
  await expect(page.getByTestId('kid-meter-value')).toHaveText('7');
  await page.locator('[data-node-title="Me da vergüenza enseñarlos"]').click();
  await page.getByTestId('action-bar').getByTestId('act-mute').click();
  await expect(page.getByTestId('toast')).toContainText('Sin «Me da vergüenza enseñarlos»: llegan');
  await expect(page.getByTestId('kid-meter-value')).not.toHaveText('7');
  // sigue en el mapa, apagada, y se vuelve a activar con un clic
  await page.keyboard.press('Escape');
  await page.getByTestId('node-unmute').click();
  await expect(page.getByTestId('kid-meter-value')).toHaveText('7');
});
