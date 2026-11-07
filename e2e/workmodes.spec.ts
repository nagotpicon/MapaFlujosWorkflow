import { test, expect, type Page } from '@playwright/test';
import { ACLARATOR_BLOCKS } from '../src/explorer/shared/modes';

async function openExplorer(page: Page, idea: string) {
  await page.goto('/');
  await page.getByTestId('start-idea').fill(idea);
  await page.getByTestId('new-project').click();
  await page.getByTestId('open-explorer').click();
  await expect(page.getByTestId('work-modes')).toBeVisible();
}

test('ACLARATOR: un bloque cada vez, no se avanza sin claridad y termina en un mapa', async ({ page }) => {
  await openExplorer(page, 'Canal de autoconocimiento');
  await page.getByTestId('mode-aclarator').click();
  await expect(page.getByTestId('explorer-topic')).toHaveValue('Canal de autoconocimiento');
  await page.getByTestId('aclarator-dump').fill('Quiero un canal sin cámara para gente que se siente perdida y no sabe qué quiere.');
  await page.getByTestId('explorer-start').click();

  // bloque 1: solo OBJETIVO a la vista; nada de los siguientes
  await expect(page.getByTestId('clarify-block')).toHaveAttribute('data-block', 'objetivo');
  await expect(page.getByTestId('clarify-message').first()).toContainText('Paso 1 de 10');
  for (const later of ACLARATOR_BLOCKS.slice(1)) await expect(page.getByTestId('aclarator')).not.toContainText(later.title);
  await expect(page.getByTestId('clarify-validate')).toBeDisabled();

  // difuso → no se puede validar
  await page.getByTestId('clarify-interno').fill('quiero hacer algo mejor con esto');
  await page.getByTestId('clarify-externo').fill('que la gente cambie');
  await expect(page.getByTestId('clarify-interno-state')).toContainText('difuso');
  await expect(page.getByTestId('clarify-validate')).toBeDisabled();
  // pedir ayuda no hace avanzar
  await page.getByTestId('clarify-example').click();
  await expect(page.getByTestId('clarify-message').last()).toContainText('Un ejemplo');
  await expect(page.getByTestId('clarify-block')).toHaveAttribute('data-block', 'objetivo');

  // los diez bloques, uno a uno
  for (let i = 0; i < ACLARATOR_BLOCKS.length; i++) {
    const b = ACLARATOR_BLOCKS[i];
    await expect(page.getByTestId('clarify-block')).toHaveAttribute('data-block', b.key);
    await page.getByTestId('clarify-interno').fill(`${b.title}: por dentro tiene que quedar exactamente así, con cinco detalles concretos.`);
    await page.getByTestId('clarify-externo').fill(`${b.title}: por fuera tienen que ocurrir exactamente tres hechos que se puedan comprobar.`);
    await expect(page.getByTestId('clarify-validate')).toBeEnabled();
    await page.getByTestId('clarify-validate').click();
  }

  // ahora sí: el total, y el mapa
  await expect(page.getByTestId('aclarator-done')).toContainText('ÉXITO');
  await page.getByTestId('clarify-map').click();
  await expect(page.getByTestId('explorer')).toHaveCount(0);
  await expect(page.locator('[data-testid="map-node"]')).toHaveCount(31);
  await expect(page.locator('[data-node-title="Canal de autoconocimiento"]').first()).toBeVisible();
});

test('COPYWRITER: esqueleto sin IA (marcado), reto, reels, stories y mapa del guion', async ({ page }) => {
  await openExplorer(page, 'Dormir mejor');
  await page.getByTestId('mode-copywriter').click();
  await page.getByTestId('copy-audience').fill('Estudiantes que duermen mal en época de exámenes');
  await page.getByTestId('copy-message').fill('Dejar el móvil fuera del cuarto lo cambia todo');
  await page.getByTestId('explorer-start').click();
  await expect(page.getByTestId('copy-ai')).toBeDisabled(); // sin IA configurada
  await page.getByTestId('copy-template').click();
  const res = page.getByTestId('copywriter-result');
  await expect(res).toContainText('Esqueleto sin IA');
  await expect(page.getByTestId('copy-reto')).toContainText('7 días');
  await expect(page.getByTestId('copy-reels')).toContainText('Reel de contraste');
  await expect(page.getByTestId('copy-stories').locator('li')).toHaveCount(3);
  await expect(page.getByTestId('copy-youtube')).not.toContainText('En este vídeo');
  await page.getByTestId('copy-map').click();
  await expect(page.locator('[data-testid="map-node"]')).toHaveCount(1 + 9 + 1 + 1 + 3 + 1 + 3);
  await expect(page.locator('[data-node-title^="Reto:"]')).toBeVisible();
});
