/** Importación / exportación (JSON, PNG, SVG, PDF, copias de seguridad). */
import { getNodesBounds, getViewportForBounds, type ReactFlowInstance } from '@xyflow/react';
import * as repo from '../persistence/repository';
import { useProject, flushSave } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { DocValidationError } from '../core/model/migrations';
import * as A from './actions';

let rfInstance: ReactFlowInstance | null = null;
export function setRF(rf: ReactFlowInstance) { rfInstance = rf; }

export const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'mapa';
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

export function download(data: Blob | string, filename: string, type = 'application/octet-stream') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function pickFile(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';
    input.onchange = () => { resolve(input.files ? [...input.files] : []); input.remove(); };
    document.body.appendChild(input);
    input.click();
  });
}

export async function exportJSON() {
  const doc = useProject.getState().doc;
  if (!doc) return;
  await flushSave();
  const bundle = await repo.buildExportBundle(doc, { snapshots: false, explorer: true });
  download(JSON.stringify(bundle, null, 2), `${slug(doc.project.name)}-${stamp()}.mapaflujos.json`, 'application/json');
  useUI.getState().notify('Proyecto exportado en JSON', 'success');
}

export async function importJSONText(text: string) {
  try {
    const { doc, repairs } = await repo.importBundle(JSON.parse(text));
    await A.openProject(doc, repairs);
    useUI.getState().notify(repairs.length ? `Importado con ${repairs.length} reparación(es)` : `Importado «${doc.project.name}»`, 'success');
    return doc;
  } catch (e) {
    const msg = e instanceof DocValidationError ? `${e.message}${e.issues.length ? `: ${e.issues.slice(0, 2).join('; ')}` : ''}` : e instanceof SyntaxError ? 'El archivo no es JSON válido' : (e as Error).message;
    useUI.getState().notify(`No se pudo importar: ${msg}`, 'error');
    return null;
  }
}

export async function importFromFile() {
  const [file] = await pickFile('.json,application/json');
  if (file) await importJSONText(await file.text());
}

export async function exportBackup() {
  await flushSave();
  const b = await repo.buildBackup();
  download(JSON.stringify(b), `mapa-de-flujos-copia-${stamp()}.json`, 'application/json');
  useUI.getState().notify(`Copia de seguridad de ${b.projects.length} proyecto(s)`, 'success');
}

export async function restoreFromFile() {
  const [file] = await pickFile('.json,application/json');
  if (!file) return;
  try {
    const n = await repo.restoreBackup(JSON.parse(await file.text()));
    useUI.getState().notify(`${n} proyecto(s) restaurado(s)`, 'success');
    useUI.setState({ overlay: 'projects' });
  } catch (e) {
    useUI.getState().notify(`No se pudo restaurar: ${(e as Error).message}`, 'error');
  }
}

export async function renderMapImage(format: 'png' | 'svg'): Promise<{ data: string; width: number; height: number } | null> {
  if (!rfInstance) return null;
  const nodes = rfInstance.getNodes().filter((n) => !n.hidden);
  if (!nodes.length) return null;
  const bounds = getNodesBounds(nodes);
  const pad = 60;
  const width = Math.min(6000, Math.max(800, bounds.width + pad * 2));
  const height = Math.min(6000, Math.max(500, bounds.height + pad * 2));
  const vp = getViewportForBounds(bounds, width, height, 0.1, 2, pad / Math.max(width, height));
  const el = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!el) return null;
  const { toPng, toSvg } = await import('html-to-image');
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim() || '#ffffff';
  const opts = {
    backgroundColor: bg, width, height, pixelRatio: 2,
    style: { width: `${width}px`, height: `${height}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
    filter: (node: HTMLElement) => !(node.classList?.contains('react-flow__resize-control') || node.classList?.contains('mdf-handle')),
  };
  const data = format === 'png' ? await toPng(el, opts) : await toSvg(el, opts);
  return { data, width, height };
}

export async function exportImage(format: 'png' | 'svg' | 'pdf') {
  const doc = useProject.getState().doc;
  if (!doc) return;
  useUI.getState().notify('Generando imagen…', 'info');
  try {
    const img = await renderMapImage(format === 'svg' ? 'svg' : 'png');
    if (!img) { useUI.getState().notify('No hay elementos visibles que exportar', 'error'); return; }
    const name = `${slug(doc.project.name)}-${stamp()}`;
    if (format === 'pdf') {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: img.width >= img.height ? 'landscape' : 'portrait', unit: 'px', format: [img.width, img.height + 60], hotfixes: ['px_scaling'] });
      pdf.setFontSize(16);
      pdf.text(doc.project.name, 24, 34);
      pdf.addImage(img.data, 'PNG', 0, 60, img.width, img.height);
      pdf.save(`${name}.pdf`);
    } else {
      const res = await fetch(img.data);
      download(await res.blob(), `${name}.${format}`);
    }
    useUI.getState().notify(`Exportado ${format.toUpperCase()}`, 'success');
  } catch (e) {
    useUI.getState().notify(`Error al exportar: ${(e as Error).message}`, 'error');
  }
}
