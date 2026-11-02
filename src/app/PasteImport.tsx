/**
 * Importar un proyecto pegando su JSON (p. ej. generado por una IA siguiendo
 * docs/MANUAL-IA.md). Usa la misma validación y migración que importar archivo.
 */
import { useState } from 'react';
import { ClipboardPaste, Loader2 } from 'lucide-react';
import { Button, Modal, TextArea } from '../ui/primitives';
import { importJSONText } from './io';

/** Quita las vallas de código (```json … ```) y el texto alrededor del objeto JSON. */
export function extractJSONText(raw: string): string {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  return start >= 0 && end > start ? t.slice(start, end + 1) : t;
}

export function PasteImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const doc = await importJSONText(extractJSONText(text));
    setBusy(false);
    if (doc) { setText(''); onOpenChange(false); }
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} width="max-w-2xl" title="Pegar proyecto (JSON)" subtitle="Pega aquí el JSON de un proyecto exportado o generado por una IA" icon={<ClipboardPaste />}>
      <div className="space-y-3 px-5 py-4" data-testid="paste-import">
        <TextArea rows={14} value={text} onChange={setText} placeholder={'{ "schemaVersion": 1, "project": { … }, "nodes": [ … ], … }'} className="font-mono text-[11.5px]" data-testid="paste-json" aria-label="JSON del proyecto" />
        <p className="text-[11.5px] text-ink-3">Se valida y se actualiza igual que al importar un archivo. Si ya existe un proyecto con el mismo identificador, se importa como copia. Puedes pegar el texto con las marcas ```json de la IA: se quitan solas.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="md" onClick={async () => { try { setText(await navigator.clipboard.readText()); } catch { /* sin permiso: pegar con Ctrl+V */ } }}>Pegar del portapapeles</Button>
          <Button variant="solid" size="md" disabled={busy || !text.trim()} onClick={() => void run()} data-testid="paste-import-run">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ClipboardPaste className="size-4" />}Importar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
