import { expect, type Page } from '@playwright/test';

/** Mapa en blanco en el nivel 3 («Todo»), con todas las herramientas a la vista. */
export async function newProject(page: Page) {
  await page.goto('/');
  await page.getByTestId('new-project').click();
  await expect(page.getByTestId('app')).toBeVisible();
  await setLevel(page, 3);
}

export async function setLevel(page: Page, level: 1 | 2 | 3) {
  await page.getByTestId(`level-${level}`).click();
  await expect(page.getByTestId(`level-${level}`)).toHaveAttribute('aria-checked', 'true');
}

/** El ejemplo para expertos (operador de seguros), en el nivel 3. */
export async function openDemo(page: Page) {
  await page.goto('/');
  await page.getByTestId('open-demo-expert').click();
  await expect(page.locator('[data-node-title="Ventas"]')).toBeVisible();
  await setLevel(page, 3);
}

export const node = (page: Page, title: string) => page.locator(`.react-flow__node:has([data-node-title="${title}"])`).first();

/** Crea una burbuja con doble clic en el lienzo y le pone título. */
export async function createBubble(page: Page, title: string, x: number, y: number) {
  // la tarjeta de la idea elegida tapa parte del lienzo: se suelta la selección antes
  await page.keyboard.press('Escape');
  await page.locator('.react-flow__pane').dblclick({ position: { x, y } });
  const input = page.getByTestId('node-title-input');
  await expect(input).toBeVisible();
  await input.fill(title);
  await input.press('Enter');
  await expect(node(page, title)).toBeVisible();
}

/** Arrastra desde el punto derecho de un nodo hasta el izquierdo de otro. */
export async function connectNodes(page: Page, from: string, to: string, fromSide = 'right', toSide = 'left') {
  await page.keyboard.press('Escape');
  const a = node(page, from);
  const b = node(page, to);
  await a.hover();
  const h1 = a.locator(`.react-flow__handle-${fromSide}`);
  const h2 = b.locator(`.react-flow__handle-${toSide}`);
  const b1 = (await h1.boundingBox())!;
  await page.mouse.move(b1.x + b1.width / 2, b1.y + b1.height / 2);
  await page.mouse.down();
  await b.hover();
  const b2 = (await h2.boundingBox())!;
  await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2, { steps: 12 });
  await page.mouse.up();
}

export const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

export async function selectNode(page: Page, title: string, additive = false) {
  if (additive) await page.keyboard.down('Shift');
  await node(page, title).click({ position: { x: 20, y: 12 } });
  if (additive) await page.keyboard.up('Shift');
}

export async function waitSaved(page: Page) {
  await expect(page.getByTestId('save-state')).toHaveAttribute('data-state', 'saved', { timeout: 10_000 });
}

/** Abre una opción de la tarjeta de la idea elegida (en el lienzo). */
export async function openFeature(page: Page, feature: string) {
  const bar = page.getByTestId('action-bar');
  if (await bar.getByTestId('feature-back').count()) await bar.getByTestId('feature-back').click();
  const tile = bar.getByTestId(`tile-${feature}`);
  if (!(await tile.count())) await bar.getByTestId('act-more').click();
  await bar.getByTestId(`tile-${feature}`).click();
}
