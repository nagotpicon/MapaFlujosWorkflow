import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createApiHandler } from './server/handler.ts';

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
  plugins: [react(), tailwindcss(), explorerApi(mode)],
  worker: { format: 'es' },
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
}) as never);
