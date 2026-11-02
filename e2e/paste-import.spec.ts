import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const example = readFileSync(new URL('../docs/ejemplos/mapa-ejemplo-ia.json', import.meta.url), 'utf8');

test('Pegar el JSON del manual para IA (con vallas ```json) crea el proyecto y simula', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-paste').click();
  await page.getByTestId('paste-json').fill('Aquí tienes tu mapa:\n```json\n' + example + '\n```\n¡Suerte!');
  await page.getByTestId('paste-import-run').click();
  await expect(page.getByTestId('project-name')).toHaveText('Captar alumnos de guitarra (ejemplo IA)');
  for (const t of ['Flyers repartidos', 'Personas que responden', 'Contactos válidos', 'Clase de prueba', 'Alumnos que pagan', 'Desplazamientos', 'Clases en mi domicilio']) {
    await expect(page.locator(`[data-node-title="${t}"]`)).toBeVisible();
  }
  await expect(page.getByTestId('scenario-switcher')).toContainText('Situación actual');
  await page.getByTestId('tab-results').click();
  const salidas = page.getByTestId('bottom-panel');
  await expect(salidas).toContainText('Alumnos que pagan');
  await expect(salidas).toContainText('Total 33,6');
  // El menú de importación ofrece la misma opción con el proyecto abierto
  await page.getByTestId('io-menu').click();
  await expect(page.getByRole('menuitem', { name: 'Pegar proyecto (JSON)' })).toBeVisible();
  await page.keyboard.press('Escape');
  // Segunda importación del mismo JSON: se importa como copia
  await page.getByTestId('io-menu').click();
  await page.getByRole('menuitem', { name: 'Pegar proyecto (JSON)' }).click();
  await page.getByTestId('paste-json').fill(example);
  await page.getByTestId('paste-import-run').click();
  await expect(page.getByTestId('project-name')).toHaveText('Captar alumnos de guitarra (ejemplo IA) (importado)');
});

test('Un JSON inválido muestra el error y no cierra el diálogo', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-paste').click();
  await page.getByTestId('paste-json').fill('{ "project": 1 }');
  await page.getByTestId('paste-import-run').click();
  await expect(page.getByTestId('toast')).toContainText('No se pudo importar');
  await expect(page.getByTestId('paste-import')).toBeVisible();
});
