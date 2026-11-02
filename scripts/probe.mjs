import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173');
await page.getByTestId('open-demo').click();
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const btn = document.querySelector('[data-testid="tool-bubble"]');
  const svg = btn?.querySelector('svg');
  const cs = svg && getComputedStyle(svg);
  return { btnClass: btn?.className, svgClass: svg?.getAttribute('class'), w: cs?.width, h: cs?.height, rect: svg?.getBoundingClientRect().toJSON(), hasRule: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.cssText.includes('size-\\[18px\\]')); } catch { return false; } }) };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
