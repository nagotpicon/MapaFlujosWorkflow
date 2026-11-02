import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createApiHandler } from './server/handler.ts';
import { extname } from 'node:path';
// @ts-expect-error módulo JS sin tipos
import { renderManuals, MANUAL_TYPES } from './scripts/manuals.mjs';

/** Publica los manuales (docs/) junto a la aplicación: /manual/, /manual-ia/, /MANUAL-IA.md, /llms.txt… */
function manuals(): Plugin {
  const serve = (mw: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (b: string) => void }, next: () => void) => void) => void }) =>
    mw.use((req, res, next) => {
      let p = decodeURIComponent((req.url ?? '').split('?')[0].split('#')[0]).replace(/^\/+/, '');
      if (p === 'manual' || p === 'manual/' || p === 'manual-ia' || p === 'manual-ia/') p = `${p.replace(/\/$/, '')}/index.html`;
      const files = renderManuals() as Record<string, string>;
      if (!(p in files)) return next();
      res.setHeader('content-type', (MANUAL_TYPES as Record<string, string>)[extname(p)] ?? 'text/plain; charset=utf-8');
      res.end(files[p]);
    });
  return {
    name: 'manuals',
    configureServer(server) { serve(server.middlewares as never); },
    generateBundle() {
      for (const [fileName, source] of Object.entries(renderManuals() as Record<string, string>)) this.emitFile({ type: 'asset', fileName, source });
    },
  };
}

/** Monta la API del Explorador (servidor) en dev y preview. Las claves no se exponen al cliente. */
function explorerApi(mode: string): Plugin {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env } as Record<string, string | undefined>;
  const handler = createApiHandler({ env });
  const mount = (mw: { use: (fn: (req: never, res: never, next: () => void) => void) => void }) =>
    mw.use((req, res, next) => { void handler(req, res).then((handled) => { if (!handled) next(); }); });
  return {
    name: 'explorer-api',
    configureServer(server) { mount(server.middlewares as never); },
    configurePreviewServer(server) { mount(server.middlewares as never); },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), explorerApi(mode), manuals()],
  worker: { format: 'es' },
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
}) as never);
