// One-off asset generator: rasterizes favicon.svg into PWA PNG icons.
// Run: node scripts/generate-icons.mjs
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(path.join(root, 'public/favicon.svg'), 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(size, out, rx) {
  const sized = svg
    .replace('viewBox="0 0 64 64"', `width="${size}" height="${size}" viewBox="0 0 64 64"`)
    .replace(/rx="14"/, `rx="${rx}"`);
  await page.setContent(`<!doctype html><body style="margin:0"><div id="t">${sized}</div></body>`);
  const el = page.locator('#t svg');
  await el.screenshot({ path: path.join(root, 'public/icons', out) });
}

await render(192, 'icon-192.png', 14);
await render(512, 'icon-512.png', 14);
await render(512, 'maskable-512.png', 0);
await render(180, path.join('..', 'apple-touch-icon.png'), 14);
await browser.close();
console.log('icons generated');
