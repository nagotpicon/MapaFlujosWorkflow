import { expect, test } from '@playwright/test';
import { connectNodes, createBubble, mod, newProject, node, selectNode, waitSaved } from './helpers';

test.describe('Editor de mapas (plan de pruebas 1–14)', () => {
  test('1–6: crear, editar, redimensionar, mover, duplicar y eliminar una burbuja', async ({ page }) => {
    await newProject(page);
    // 1. crear
    await createBubble(page, 'Primera idea', 400, 300);
    // 2. editar texto (doble clic sobre la burbuja)
    await node(page, 'Primera idea').dblclick();
    await page.getByTestId('node-title-input').fill('Idea editada');
    await page.getByTestId('node-title-input').press('Enter');
    await expect(node(page, 'Idea editada')).toBeVisible();
    // 3. redimensionar con el control de la esquina
    await selectNode(page, 'Idea editada');
    const n = node(page, 'Idea editada');
    const before = (await n.boundingBox())!;
    const handle = n.locator('.react-flow__resize-control.bottom.right');
    const hb = (await handle.boundingBox())!;
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + 120, hb.y + 60, { steps: 8 });
    await page.mouse.up();
    const after = (await n.boundingBox())!;
    expect(after.width).toBeGreaterThan(before.width + 60);
    // 4. mover
    const b0 = (await n.boundingBox())!;
    await page.mouse.move(b0.x + 30, b0.y + 15);
    await page.mouse.down();
    await page.mouse.move(b0.x + 230, b0.y + 115, { steps: 10 });
    await page.mouse.up();
    const b1 = (await n.boundingBox())!;
    expect(b1.x - b0.x).toBeGreaterThan(150);
    // 5. duplicar
    await selectNode(page, 'Idea editada');
    await page.keyboard.press(`${mod}+d`);
    await expect(page.locator('[data-node-title="Idea editada"]')).toHaveCount(2);
    // 6. eliminar
    await page.keyboard.press('Delete');
    await expect(page.locator('[data-node-title="Idea editada"]')).toHaveCount(1);
  });

  test('7–8: varias conexiones y una conexión cruzada sin intersección lógica', async ({ page }) => {
    await newProject(page);
    await createBubble(page, 'A', 300, 200);
    await createBubble(page, 'B', 700, 450);
    await createBubble(page, 'C', 300, 450);
    await createBubble(page, 'D', 700, 200);
    await connectNodes(page, 'A', 'B');
    await connectNodes(page, 'C', 'D');
    await connectNodes(page, 'A', 'D');
    await expect(page.locator('.react-flow__edge')).toHaveCount(3);
    // las conexiones A→B y C→D se cruzan visualmente pero no crean ningún nodo nuevo
    await expect(page.locator('[data-testid="map-node"]')).toHaveCount(4);
  });

  test('9–11: grupo, plegar/desplegar y capas', async ({ page }) => {
    await newProject(page);
    await createBubble(page, 'Uno', 350, 250);
    await createBubble(page, 'Dos', 650, 250);
    await selectNode(page, 'Uno');
    await selectNode(page, 'Dos', true);
    await page.keyboard.press(`${mod}+g`);
    const group = page.getByTestId('group-node');
    await expect(group).toBeVisible();
    // 10. plegar y desplegar
    await page.getByTestId('group-toggle').click();
    await expect(node(page, 'Uno')).toBeHidden();
    await page.getByTestId('group-toggle').click();
    await expect(node(page, 'Uno')).toBeVisible();
    // 11. capas: crear, asignar y ocultar
    await selectNode(page, 'Uno');
    await page.getByTestId('tool-layers').click();
    await page.getByLabel('Nombre de la nueva capa').fill('Riesgos');
    await page.getByLabel('Nombre de la nueva capa').press('Enter');
    const row = page.getByTestId('layer-row').filter({ has: page.locator('input[value="Riesgos"]') });
    await row.getByTestId('layer-assign').click();
    await row.getByTestId('layer-visibility').click();
    await page.keyboard.press('Escape');
    await expect(node(page, 'Uno')).toBeHidden();
    await expect(node(page, 'Dos')).toBeVisible();
  });

  test('12–13: guardar y recuperar tras recargar; deshacer y rehacer', async ({ page }) => {
    await newProject(page);
    await createBubble(page, 'Persistente', 400, 300);
    await createBubble(page, 'Segunda', 700, 300);
    await connectNodes(page, 'Persistente', 'Segunda');
    // 13. deshacer / rehacer (el historial pertenece a la sesión de edición)
    await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } });
    await page.keyboard.press(`${mod}+z`);
    await expect(page.locator('.react-flow__edge')).toHaveCount(0);
    await page.keyboard.press(`${mod}+Shift+z`);
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    await page.getByTestId('undo').click();
    await expect(page.locator('.react-flow__edge')).toHaveCount(0);
    await page.getByTestId('redo').click();
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    // 12. guardar y recuperar tras recargar
    await waitSaved(page);
    await page.reload();
    await expect(node(page, 'Persistente')).toBeVisible();
    await expect(node(page, 'Segunda')).toBeVisible();
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  });

  test('14: exportar e importar el proyecto en JSON', async ({ page }) => {
    await newProject(page);
    await createBubble(page, 'Exportable', 400, 300);
    await createBubble(page, 'Otra', 700, 300);
    await connectNodes(page, 'Exportable', 'Otra');
    await page.getByTestId('io-menu').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Proyecto completo (.json)' }).click()]);
    const path = await download.path();
    expect(download.suggestedFilename()).toMatch(/\.mapaflujos\.json$/);
    await page.getByTestId('io-menu').click();
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('menuitem', { name: 'Importar proyecto (.json)' }).click()]);
    await chooser.setFiles(path);
    await expect(page.getByTestId('toast')).toContainText('Importado');
    await expect(node(page, 'Exportable')).toBeVisible();
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    // importar un archivo inválido muestra un error y no rompe nada
    await page.getByTestId('io-menu').click();
    const [chooser2] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('menuitem', { name: 'Importar proyecto (.json)' }).click()]);
    await chooser2.setFiles({ name: 'malo.json', mimeType: 'application/json', buffer: Buffer.from('{"hola": 1}') });
    await expect(page.getByTestId('toast')).toContainText('No se pudo importar');
  });

  test('búsqueda global, paleta de comandos y menú contextual', async ({ page }) => {
    await newProject(page);
    await createBubble(page, 'Aguja en el pajar', 400, 300);
    await page.keyboard.press(`${mod}+k`);
    await page.getByRole('textbox', { name: 'Buscar' }).fill('aguja');
    await page.getByRole('option', { name: /Aguja en el pajar/ }).click();
    await expect(page.getByTestId('node-inspector')).toBeVisible();
    await node(page, 'Aguja en el pajar').click({ button: 'right' });
    await expect(page.getByTestId('context-menu')).toBeVisible();
    await page.getByRole('menuitem', { name: /Añadir burbuja conectada/ }).click();
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  });
});
