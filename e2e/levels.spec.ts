import { test, expect, type Page } from '@playwright/test';

const say = async (page: Page, text: string) => {
  await page.getByTestId('guide-input').fill(text);
  await page.getByTestId('guide-send').click();
};
const question = (page: Page) => page.getByTestId('guide');

test('modo fácil: la Brújula lleva de una idea a un camino con piedras, ayudas y un plan', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '¿Qué te ronda la cabeza?' })).toBeVisible();
  await expect(page.getByTestId('start-examples')).toBeVisible();
  await page.getByTestId('start-idea').fill('Nadie ve mis dibujos');
  await page.getByTestId('new-project').click();

  // 1 · Pensar: casi nada en pantalla y una sola pregunta, con su porqué
  await expect(page.getByTestId('level-1')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('toolbar')).toHaveCount(0);
  await expect(page.getByTestId('bottom-panel')).toHaveCount(0);
  await expect(page.getByTestId('inspector')).toHaveCount(0);
  await expect(question(page)).toHaveAttribute('data-question', 'tipo');
  await expect(page.getByTestId('guide-why')).toContainText('Así sé por dónde empezar');
  await page.getByTestId('guide-choice-preocupa').click();

  // 2 · Camino: se pasa solo de nivel y la Brújula sigue preguntando
  await expect(page.getByTestId('level-2')).toHaveAttribute('aria-checked', 'true');
  await expect(question(page)).toHaveAttribute('data-question', 'meta');
  await say(page, 'Vender mis dibujos');
  await expect(question(page)).toHaveAttribute('data-question', 'razon');
  await page.getByTestId('guide-skip').click();
  await expect(question(page)).toHaveAttribute('data-question', 'paso1');
  await say(page, 'Hacer 10 dibujos bonitos');
  await expect(question(page)).toHaveAttribute('data-question', 'pasoN');
  await say(page, 'Enseñarlos en internet');
  await page.getByTestId('guide-skip').click();
  await expect(page.getByTestId('kid-meter-value')).toHaveText('10');

  await expect(question(page)).toHaveAttribute('data-question', 'piedra1');
  await say(page, 'Me da vergüenza enseñarlos');
  await expect(question(page)).toHaveAttribute('data-question', /^tamano:/);
  await page.getByTestId('guide-choice-grande').click();
  await expect(question(page)).toHaveAttribute('data-question', /^donde:/);
  await question(page).getByRole('button', { name: /Enseñarlos en internet/ }).click();
  await expect(page.getByTestId('kid-meter-value')).toHaveText('5');

  await expect(question(page)).toHaveAttribute('data-question', /^ayuda:/);
  await say(page, 'Mi prima sabe de redes');
  await page.getByTestId('guide-choice-bastante').click();
  await expect(page.getByTestId('kid-meter-value')).toHaveText('7');

  // el mapa se ha dibujado solo, con su papel en cada idea
  await expect(page.locator('[data-node-title="Me da vergüenza enseñarlos"] >> xpath=..').getByTestId('node-papel')).toHaveAttribute('data-papel', 'piedra');

  // lo que he descubierto y mi plan, en palabras sencillas
  await page.getByTestId('kid-meter').click();
  await expect(page.getByTestId('discover-head')).toHaveText('De cada 10 empujones, llegan 7 a «Vender mis dibujos».');
  await expect(page.getByTestId('discover')).toContainText('«Me da vergüenza enseñarlos» es tu piedra más grande: te quita 3 de cada 10.');
  await page.getByTestId('open-plan').click();
  await expect(page.getByTestId('plan-story')).toContainText('Quieres «Vender mis dibujos».');
  await page.keyboard.press('Escape');

  // detalles fáciles: cambiar el tamaño de la piedra cambia la cuenta
  await page.locator('[data-node-title="Me da vergüenza enseñarlos"]').click();
  await expect(page.getByTestId('node-inspector')).toHaveAttribute('data-papel', 'piedra');
  await page.getByTestId('kid-size-pequena').click();
  await expect(page.getByTestId('kid-meter-value')).toHaveText('10');

  // 3 · Experto: aparecen todas las herramientas
  await page.getByTestId('level-3').click();
  await expect(page.getByTestId('toolbar')).toBeVisible();
  await expect(page.getByTestId('bottom-panel')).toBeVisible();
  await expect(page.getByTestId('dock')).toHaveCount(0);
  await expect(page.getByTestId('guide')).toHaveCount(0);
  await expect(page.getByTestId('scenario-switcher')).toBeVisible();
});

test('bandeja y Tab en el camino: un paso va detrás de otro y borrar no rompe el camino', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-demo').click();
  await expect(page.getByTestId('level-2')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('kid-meter-value')).toHaveText('7');
  // Tab sobre un paso crea el siguiente paso, ya escrito en el camino
  await page.locator('[data-node-title="Hacer 10 dibujos bonitos"]').click();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('node-title-input')).toBeFocused();
  await page.keyboard.type('Elegir los mejores');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-node-title="Elegir los mejores"]')).toBeVisible();
  await expect(page.getByTestId('kid-meter-value')).toHaveText('7');
  // borrar un paso: el camino sigue unido y la cuenta no se rompe
  await page.locator('[data-node-title="Elegir los mejores"]').click();
  await page.getByTestId('kid-delete').click();
  await expect(page.locator('[data-node-title="Elegir los mejores"]')).toHaveCount(0);
  await expect(page.getByTestId('kid-meter-value')).toHaveText('7');
  // la bandeja: una piedra nueva sobre el paso elegido baja la cuenta
  await page.locator('[data-node-title="Hacer 10 dibujos bonitos"]').click();
  await page.getByTestId('dock-piedra').click();
  await expect(page.getByTestId('node-title-input')).toBeFocused();
  await page.keyboard.type('No tengo tiempo');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('kid-meter-value')).toHaveText('4,9');
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
