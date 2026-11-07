import { test, expect } from '@playwright/test';

test('de menos a más: idea → ideas unidas → movimiento → probar → todo', async ({ page }) => {
  await page.goto('/');
  // pantalla de inicio casi en blanco: una pregunta y un cuadro
  await expect(page.getByRole('heading', { name: '¿Qué te ronda la cabeza?' })).toBeVisible();
  await page.getByTestId('start-idea').fill('Vender mis dibujos');
  await page.getByTestId('new-project').click();

  // nivel 1: solo ideas. Sin barra lateral, sin panel inferior, sin inspector
  await expect(page.getByTestId('level-1')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('[data-node-title="Vender mis dibujos"]')).toBeVisible();
  await expect(page.getByTestId('dock')).toBeVisible();
  await expect(page.getByTestId('toolbar')).toHaveCount(0);
  await expect(page.getByTestId('bottom-panel')).toHaveCount(0);
  await expect(page.getByTestId('inspector')).toHaveCount(0);
  await expect(page.getByTestId('coach')).toHaveAttribute('data-step', 'one');
  await expect(page.getByTestId('canvas')).toHaveAttribute('data-view', 'mental');

  // Tab crea una idea unida y se escribe directamente en ella
  await page.locator('[data-node-title="Vender mis dibujos"]').click();
  await expect(page.getByTestId('inspector')).toBeVisible(); // aparece al elegir algo
  for (const t of ['Gente que los ve', 'Me escriben', 'Compran']) {
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('node-title-input')).toBeFocused();
    await page.keyboard.type(t);
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('[data-node-title="Compran"]')).toBeVisible();

  // nivel 2: la guía pide inicio y meta
  await page.getByTestId('level-2').click();
  await expect(page.getByTestId('canvas')).toHaveAttribute('data-view', 'simulation');
  await page.locator('[data-node-title="Gente que los ve"]').click();
  await expect(page.getByTestId('coach')).toHaveAttribute('data-step', 'start');
  await page.getByTestId('coach-action').click();
  await page.locator('[data-node-title="Compran"]').click();
  await expect(page.getByTestId('coach')).toHaveAttribute('data-step', 'goal');
  await page.getByTestId('coach-action').click();

  // un colador en el paso intermedio (nombre sencillo en el nivel 2)
  await page.locator('[data-node-title="Me escriben"]').click();
  await page.getByTestId('add-behavior').click();
  await expect(page.getByTestId('behavior-option-filter')).toContainText('Colador');
  await page.getByTestId('behavior-option-filter').click();
  await expect(page.getByTestId('behavior-card')).toContainText('Colador');

  // probar: llega algo a la meta y la guía lo cuenta
  await expect(page.getByTestId('coach')).toHaveAttribute('data-step', 'result');
  await expect(page.getByTestId('coach')).toContainText('En 12 rondas llegan 780 a tu meta');
  await page.getByTestId('simple-play').click();
  await expect(page.getByTestId('simple-result')).not.toHaveText('0', { timeout: 10_000 });

  // nivel 3: aparecen todas las herramientas
  await page.getByTestId('level-3').click();
  await expect(page.getByTestId('toolbar')).toBeVisible();
  await expect(page.getByTestId('bottom-panel')).toBeVisible();
  await expect(page.getByTestId('dock')).toHaveCount(0);
  await expect(page.getByTestId('scenario-switcher')).toBeVisible();
});

test('el nivel se guarda con el mapa', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-idea').fill('Mi idea');
  await page.getByTestId('new-project').click();
  await page.getByTestId('level-2').click();
  await expect(page.getByTestId('save-state')).toHaveAttribute('data-state', 'saved');
  await page.reload();
  await expect(page.getByTestId('level-2')).toHaveAttribute('aria-checked', 'true');
});
