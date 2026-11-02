import { expect, test } from '@playwright/test';
import { bigMap } from '../src/demo/bigMap';

for (const animate of [true, false]) test(`mapa de 400 nodos (animación ${animate ? 'activa' : 'desactivada'}): importa, renderiza, simula y se arrastra con fluidez`, async ({ page }) => {
  await page.addInitScript((a) => localStorage.setItem('mdf.animate', JSON.stringify(a)), animate);
  await page.goto('/');
  const doc = bigMap(400);
  const t0 = Date.now();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Importar' }).click()]);
  await chooser.setFiles({ name: 'grande.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
  await expect(page.getByTestId('app')).toBeVisible();
  await expect(page.getByTestId('kpi-total')).not.toContainText('Acumulado0', { timeout: 20_000 });
  const loadMs = Date.now() - t0;
  // arrastre: medir los fotogramas durante el movimiento
  const nodeEl = page.locator('.react-flow__node').filter({ has: page.locator('[data-node-title="N5"]') });
  await page.getByRole('button', { name: 'Zoom a la selección' }).isVisible();
  await page.evaluate(() => { (window as unknown as { __frames: number[] }).__frames = []; let last = performance.now(); const loop = (t: number) => { (window as unknown as { __frames: number[] }).__frames.push(t - last); last = t; if ((window as unknown as { __frames: number[] }).__frames.length < 400) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  const box = (await nodeEl.boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 8);
  await page.mouse.down();
  for (let i = 0; i < 30; i++) await page.mouse.move(box.x + 10 + i * 6, box.y + 8 + i * 3);
  await page.mouse.up();
  const frames = await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames.slice(5));
  frames.sort((a, b) => a - b);
  const p95 = frames[Math.floor(frames.length * 0.95)];
  console.log(`400 nodos (anim ${animate}): carga+simulación ${loadMs} ms · fotogramas p50 ${frames[Math.floor(frames.length / 2)].toFixed(1)} ms · p95 ${p95.toFixed(1)} ms`);
  expect(loadMs).toBeLessThan(25_000);
  // umbral estricto sin animación; con partículas el navegador sin GPU de las pruebas es más lento
  expect(p95).toBeLessThan(animate ? 300 : 120);
});
