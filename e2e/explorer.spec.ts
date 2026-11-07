import { expect, test } from '@playwright/test';
import { mod, newProject } from './helpers';

test('Explorador (modo demostración): entrevista, comandos, propuesta e inserción deshacible', async ({ page }) => {
  await newProject(page);
  await page.getByTestId('open-explorer').click();
  await expect(page.getByTestId('demo-banner')).toBeVisible();
  await page.getByTestId('explorer-topic').fill('Quiero captar alumnos de guitarra');
  await page.getByTestId('explorer-strategy').fill('repartiendo flyers');
  await page.getByTestId('explorer-start').click();
  await expect(page.getByTestId('explorer-message').first()).toContainText('merezca la pena');
  await page.getByTestId('explorer-answer').fill('Con cinco alumnos recurrentes podría estar satisfecho.');
  await page.getByTestId('explorer-send').click();
  await expect(page.getByTestId('explorer-message').nth(1)).toContainText(/desplaz/);
  await expect(page.getByTestId('discoveries')).toContainText('cinco alumnos');
  await page.getByTestId('cmd-dont_know').click();
  await expect(page.getByTestId('explorer-message').nth(2)).toContainText(/prueba/);
  await page.getByTestId('cmd-alternatives').click();
  await expect(page.getByTestId('explorer-message').nth(3)).toContainText(/otras rutas/);
  // propuesta y vista previa
  await page.getByTestId('create-flow').click();
  await expect(page.getByTestId('proposal')).toBeVisible();
  await expect(page.getByTestId('proposal-preview')).toBeVisible();
  const n = await page.getByTestId('proposal-node').count();
  expect(n).toBeGreaterThan(8);
  // descartar un elemento antes de insertar
  await page.getByTestId('proposal-node').last().getByRole('checkbox').uncheck();
  await page.getByTestId('insert-proposal').click();
  await expect(page.getByTestId('explorer')).toBeHidden();
  await expect(page.getByTestId('toast')).toContainText('ideas metidas');
  const inserted = await page.locator('[data-testid="map-node"]').count();
  expect(inserted).toBeGreaterThan(8);
  // la inserción se puede deshacer
  await page.locator('.react-flow__pane').click({ position: { x: 30, y: 30 } });
  await page.keyboard.press(`${mod}+z`);
  await expect(page.locator('[data-testid="map-node"]')).toHaveCount(0);
  // la exploración se conserva y se puede reanudar
  await page.getByTestId('open-explorer').click();
  await expect(page.getByText('Quiero captar alumnos de guitarra').first()).toBeVisible();
});

test('Creador de estrategias: texto espontáneo → contexto con fricciones estándar (plantilla sin IA)', async ({ page }) => {
  await newProject(page);
  await page.getByTestId('open-explorer').click();
  await page.getByRole('radio', { name: /Te cuento mi plan/ }).click();
  await page.getByTestId('explorer-topic').fill('Vender un curso online');
  await page.getByTestId('explorer-start').click();
  await page.getByTestId('strategy-text').fill('Quiero vender un curso online de fotografía. No tengo audiencia. Puedo dedicar 5 horas a la semana.');
  await expect(page.getByTestId('strategy-ai')).toBeDisabled();
  await page.getByTestId('strategy-template').click();
  await expect(page.getByTestId('proposal')).toContainText('Generada con plantilla estándar (sin IA)');
  await expect(page.getByTestId('proposal')).toContainText('F · Fricciones');
  await page.getByTestId('insert-proposal').click();
  await expect(page.locator('[data-node-title="Sin audiencia previa"]')).toBeVisible();
  // resolver una fricción desde el inspector
  await page.locator('[data-node-title="Sin audiencia previa"]').click();
  await expect(page.getByTestId('discovery-block')).toBeVisible();
  await page.getByTestId('discovery-block').getByRole('radio', { name: 'Otra ruta' }).click();
  await page.getByTestId('open-monitor').click();
  await expect(page.getByTestId('monitor')).toContainText('con decisión tomada');
});

test('Plan maestro: subir un documento de texto y usarlo como guía', async ({ page }) => {
  await newProject(page);
  await page.getByTestId('open-explorer').click();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByTestId('upload-plan').click()]);
  await chooser.setFiles({ name: 'plan.md', mimeType: 'text/markdown', buffer: Buffer.from('# Objetivos\nCaptar 10 alumnos antes de junio.\n\n# Presupuesto\n300 euros para publicidad.') });
  await expect(page.getByTestId('plan-docs')).toContainText('plan.md');
  await expect(page.getByTestId('toast')).toContainText('resumen heurístico');
});
