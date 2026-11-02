/**
 * Compila para Vercel (Build Output API v3):
 *   .vercel/output/static            → la aplicación (vite build)
 *   .vercel/output/functions/api.func → la API del Explorador empaquetada
 * Uso: node scripts/build-vercel.mjs
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'rolldown';

const root = resolve(import.meta.dirname, '..');
const out = join(root, '.vercel', 'output');
rmSync(out, { recursive: true, force: true });

execSync('npx vite build', { cwd: root, stdio: 'inherit' });
cpSync(join(root, 'dist'), join(out, 'static'), { recursive: true });

const fn = join(out, 'functions', 'api.func');
mkdirSync(fn, { recursive: true });
await build({
  input: join(root, 'server', 'vercel.ts'),
  platform: 'node',
  logLevel: 'warn',
  output: { file: join(fn, 'index.mjs'), format: 'esm', inlineDynamicImports: true, minify: true },
});
writeFileSync(join(fn, 'package.json'), JSON.stringify({ type: 'module' }));
writeFileSync(join(fn, '.vc-config.json'), JSON.stringify({
  runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs',
  shouldAddHelpers: false, supportsResponseStreaming: true, maxDuration: 60,
}, null, 2));

writeFileSync(join(out, 'config.json'), JSON.stringify({
  version: 3,
  routes: [
    { src: '^/assets/(.*)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
    { handle: 'filesystem' },
    { src: '^/api/(.*)$', dest: '/api' },
    { src: '^/(.*)$', dest: '/index.html' },
  ],
}, null, 2));
console.log('Salida de Vercel lista en .vercel/output');
