/**
 * Entrada para Vercel: la API del Explorador como función Node.
 * La clave (GEMINI_API_KEY u otra) se configura como variable de entorno del
 * proyecto en Vercel; sin clave funciona en modo demostración.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiHandler } from './handler.ts';

const api = createApiHandler({ env: process.env as Record<string, string | undefined> });

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (await api(req, res)) return;
  res.statusCode = 404;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'No encontrado' }));
}
