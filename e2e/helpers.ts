import { expect, type Page } from '@playwright/test';

export async function newProject(page: Page) {
  await page.goto('/');
  await page.getByTestId('new-project').click();
  await expect(page.getByTestId('app')).toBeVisible();
}

export async function openDemo(page: Page) {
  await page.goto('/');
  await page.getByTestId('open-demo').click();
  await expect(page.locator('[data-node-title="Ventas"]')).toBeVisible();
}

export const node = (page: Page, title: string) => page.locator(`.react-flow__node:has([data-node-title="${title}"])`).first();

/** Crea una burbuja con doble clic en el lienzo y le pone título. */
export async function createBubble(page: Page, title: string, x: number, y: number) {
  await page.locator('.react-flow__pane').dblclick({ position: { x, y } });
  const input = page.getByTestId('node-title-input');
  await expect(input).toBeVisible();
  await input.fill(title);
  await input.press('Enter');
  await expect(node(page, title)).toBeVisible();
}

/** Arrastra desde el punto derecho de un nodo hasta el izquierdo de otro. */
export async function connectNodes(page: Page, from: string, to: string, fromSide = 'right', toSide = 'left') {
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
