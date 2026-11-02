/** «Dímelo claro»: razonamiento y conclusión coloquial del mapa actual, exportable. */
import { useState } from 'react';
import { Copy, FileDown, FileText, Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { verdictToMarkdown } from '../engine/verdict';
import { Badge, Button } from '../ui/primitives';
import { download, renderMapImage } from '../app/io';
import { useMonitorData } from './Monitor';
import { explorerStatus, polishVerdict } from '../explorer/client';

export function VerdictPanel() {
  const doc = useProject((s) => s.doc)!;
  const { data } = useMonitorData();
  const [polished, setPolished] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!data) return <div className="flex h-60 items-center justify-center text-ink-3"><Loader2 className="size-5 animate-spin" /></div>;
  const v = data.verdict;
  const md = verdictToMarkdown(doc, v);
  const name = doc.project.name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase();
  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth();
    let y = 48;
    const text = (t: string, size = 11, bold = false) => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(size);
      for (const line of pdf.splitTextToSize(t, W - 96)) {
        if (y > 790) { pdf.addPage(); y = 48; }
        pdf.text(line, 48, y);
        y += size * 1.4;
      }
    };
    for (const line of (polished ?? md).split('\n')) {
      if (line.startsWith('# ')) text(line.slice(2), 18, true);
      else if (line.startsWith('## ')) { y += 4; text(line.slice(3), 14, true); }
      else if (line.startsWith('### ')) { y += 4; text(line.slice(4), 12, true); }
      else if (line.trim()) text(line.replace(/^- /, '• ').replace(/_/g, ''), 11);
      else y += 6;
    }
    const img = await renderMapImage('png');
    if (img) {
      pdf.addPage();
      const ratio = Math.min((W - 64) / img.width, 700 / img.height);
      pdf.setFontSize(12);
      pdf.text('El mapa en este momento', 32, 36);
      pdf.addImage(img.data, 'PNG', 32, 48, img.width * ratio, img.height * ratio);
    }
    pdf.save(`dimelo-claro-${name}.pdf`);
  };
  return (
    <div className="space-y-5 px-6 py-5" data-testid="verdict">
      <div>
        <h2 className="text-[20px] font-semibold leading-snug tracking-tight text-ink" data-testid="verdict-headline">{v.headline}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink" data-testid="verdict-point">{v.point}</p>
      </div>
      {polished && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--transform)_40%,transparent)] bg-[color-mix(in_srgb,var(--transform)_6%,transparent)] p-3 text-[13.5px] leading-relaxed text-ink">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-transform"><Sparkles className="size-3.5" />Redactado por IA a partir de los mismos datos (sin cifras nuevas)</div>
          <div className="whitespace-pre-wrap">{polished}</div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {v.brakes.length > 0 && <Block title="Lo que te frena" items={v.brakes} tone="loss" />}
        {v.saviors.length > 0 && <Block title="Lo que te salva" items={v.saviors} tone="gain" />}
        {v.pinch.length > 0 && <Block title="Dónde aprieta el zapato" items={v.pinch} tone="cond" />}
        {v.loops && <Block title="La rueda" items={[v.loops]} tone="flow" />}
      </div>
      <div className="rounded-xl bg-accent-soft p-4">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-accent-text">Lo que haría yo mañana</div>
        <p className="text-[14px] leading-relaxed text-ink">{v.tomorrow}</p>
      </div>
      {v.warnings.length > 0 && (
        <div className="space-y-1">
          {v.warnings.map((w, i) => <p key={i} className="flex gap-2 text-[12.5px] text-ink-2"><TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-cond" />{w}</p>)}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 border-t border-line pt-3 text-[11px] text-ink-3">
        {v.facts.map((f) => <Badge key={f.label}>{f.label}: <b className="text-ink-2">{f.value}</b></Badge>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="md" onClick={async () => { await navigator.clipboard?.writeText(polished ?? md); useUI.getState().notify('Copiado', 'success'); }}><Copy className="size-4" />Copiar</Button>
        <Button variant="outline" size="md" onClick={() => download(polished ? `${md}\n\n---\n\n${polished}` : md, `dimelo-claro-${name}.md`, 'text/markdown')} data-testid="verdict-md"><FileText className="size-4" />Markdown</Button>
        <Button variant="outline" size="md" onClick={() => download((polished ?? md).replace(/[#_]/g, ''), `dimelo-claro-${name}.txt`, 'text/plain')}><FileText className="size-4" />Texto</Button>
        <Button variant="outline" size="md" onClick={() => void exportPdf()} data-testid="verdict-pdf"><FileDown className="size-4" />PDF con el mapa</Button>
        <div className="flex-1" />
        <Button variant="subtle" size="md" disabled={busy} onClick={async () => {
          setBusy(true);
          try {
            const st = await explorerStatus();
            if (!st.configured) { useUI.getState().notify('Ningún proveedor de IA configurado: el veredicto ya está calculado sin IA.', 'info'); return; }
            setPolished(await polishVerdict(md));
          } catch (e) { useUI.getState().notify((e as Error).message, 'error'); } finally { setBusy(false); }
        }}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Pulir redacción con IA</Button>
      </div>
      <p className="text-[11px] text-ink-3">Se calcula a partir de la simulación del mapa tal como está ahora. No es una predicción: es lo que sale de tus supuestos.</p>
    </div>
  );
}

function Block({ title, items, tone }: { title: string; items: string[]; tone: 'loss' | 'gain' | 'cond' | 'flow' }) {
  const color = { loss: 'var(--loss)', gain: 'var(--gain)', cond: 'var(--condition)', flow: 'var(--flow)' }[tone];
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink"><span className="size-2 rounded-full" style={{ background: color }} />{title}</div>
      <ul className="space-y-1.5 text-[13px] leading-snug text-ink-2">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}
