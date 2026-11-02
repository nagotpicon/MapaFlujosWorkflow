/**
 * Servidor independiente: sirve la aplicación compilada (dist/) y la API del
 * Explorador. Uso: npm run build && npm start   (lee .env si existe)
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { createApiHandler } from './handler.ts';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');

function loadDotEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...loadDotEnv(join(root, '.env')), ...process.env } as Record<string, string | undefined>;
const api = createApiHandler({ env });
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
  if (await api(req, res)) return;
  const url = new URL(req.url ?? '/', 'http://localhost');
  let file = normalize(join(dist, decodeURIComponent(url.pathname)));
  if (!file.startsWith(dist)) { res.statusCode = 403; res.end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch { file = join(dist, 'index.html'); }
  try {
    const data = await readFile(file);
    res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
    if (file.includes(`${join(dist, 'assets')}`)) res.setHeader('cache-control', 'public, max-age=31536000, immutable');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('No encontrado. ¿Has ejecutado npm run build?');
  }
});

const port = Number(env.PORT ?? 4321);
server.listen(port, () => console.log(`MAPA DE FLUJOS en http://localhost:${port}`));
