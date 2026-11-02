/**
 * Repositorio de proyectos: guardado, recuperación, versiones, ejecuciones,
 * adjuntos, importación/exportación y copias de seguridad.
 */
import { CURRENT_SCHEMA_VERSION, type ProjectDoc, type Snapshot, type SimulationRunSummary } from '../core/model/schema';
import { DocValidationError, parseProjectDoc } from '../core/model/migrations';
import { newId } from '../core/model/factory';
import { getDB, type AttachmentRow, type ExplorerSessionRow, type KnowledgeChunkRow, type KnowledgeDocRow, type ProjectRow } from './db';

export const EXPORT_FORMAT = 'mapa-de-flujos';
export const EXPORT_FORMAT_VERSION = 1;

export interface ExportBundle {
  format: typeof EXPORT_FORMAT;
  formatVersion: number;
  schemaVersion: number;
  exportedAt: string;
  project: ProjectDoc;
  attachments: { id: string; nodeId: string | null; name: string; type: string; data: string }[];
  snapshots?: Snapshot[];
  explorer?: { sessions: ExplorerSessionRow[]; docs: KnowledgeDocRow[]; chunks: KnowledgeChunkRow[] };
}

export interface BackupBundle {
  format: 'mapa-de-flujos-backup';
  formatVersion: number;
  exportedAt: string;
  projects: ExportBundle[];
}

export interface ProjectSummary { id: string; name: string; updatedAt: number; createdAt: number; isDemo: boolean; nodeCount: number }

/* ---------------- proyectos ---------------- */

export async function listProjects(): Promise<ProjectSummary[]> {
  const rows = await getDB().projects.orderBy('updatedAt').reverse().toArray();
  return rows.map(({ id, name, updatedAt, createdAt, isDemo, nodeCount }) => ({ id, name, updatedAt, createdAt, isDemo, nodeCount }));
}

export async function saveProject(doc: ProjectDoc): Promise<void> {
  const row: ProjectRow = {
    id: doc.project.id,
    name: doc.project.name,
    createdAt: doc.project.createdAt,
    updatedAt: Date.now(),
    isDemo: doc.project.isDemo,
    nodeCount: Object.keys(doc.nodes).length,
    doc,
  };
  await getDB().projects.put(row);
}

export async function loadProject(id: string): Promise<{ doc: ProjectDoc; repairs: string[] } | null> {
  const row = await getDB().projects.get(id);
  if (!row) return null;
  return parseProjectDoc(row.doc);
}

export async function deleteProject(id: string): Promise<void> {
  const db = getDB();
  await db.transaction('rw', [db.projects, db.snapshots, db.runs, db.attachments, db.explorerSessions, db.knowledgeDocs, db.knowledgeChunks], async () => {
    await db.projects.delete(id);
    await db.snapshots.where('projectId').equals(id).delete();
    await db.runs.where('projectId').equals(id).delete();
    await db.attachments.where('projectId').equals(id).delete();
    await db.explorerSessions.where('projectId').equals(id).delete();
    await db.knowledgeDocs.where('projectId').equals(id).delete();
    await db.knowledgeChunks.where('projectId').equals(id).delete();
  });
}

/** Reasigna el id del proyecto (y referencias projectId) para duplicar/importar sin sobrescribir. */
export function reassignProjectId(doc: ProjectDoc, name?: string): ProjectDoc {
  const pid = newId('prj');
  const t = Date.now();
  const nodes = Object.fromEntries(Object.entries(doc.nodes).map(([k, n]) => [k, { ...n, projectId: pid }]));
  const edges = Object.fromEntries(Object.entries(doc.edges).map(([k, e]) => [k, { ...e, projectId: pid }]));
  const scenarios = Object.fromEntries(Object.entries(doc.scenarios).map(([k, s]) => [k, { ...s, projectId: pid }]));
  const annotations = Object.fromEntries(Object.entries(doc.annotations).map(([k, a]) => [k, a.ownerType === 'project' ? { ...a, ownerId: pid } : a]));
  return { ...doc, nodes, edges, scenarios, annotations, project: { ...doc.project, id: pid, name: name ?? doc.project.name, createdAt: t, updatedAt: t } };
}

export async function duplicateProject(id: string): Promise<ProjectDoc | null> {
  const loaded = await loadProject(id);
  if (!loaded) return null;
  const copy = reassignProjectId(loaded.doc, `${loaded.doc.project.name} (copia)`);
  await saveProject(copy);
  const atts = await getDB().attachments.where('projectId').equals(id).toArray();
  for (const a of atts) await getDB().attachments.put({ ...a, projectId: copy.project.id });
  return copy;
}

/* ---------------- versiones ---------------- */

export async function createSnapshot(doc: ProjectDoc, label = '', auto = false): Promise<Snapshot> {
  const db = getDB();
  const last = await db.snapshots.where('projectId').equals(doc.project.id).sortBy('createdAt');
  const snap: Snapshot = {
    id: newId('snp'),
    projectId: doc.project.id,
    version: (last[last.length - 1]?.version ?? 0) + 1,
    label,
    auto,
    data: doc,
    createdAt: Date.now(),
  };
  await db.snapshots.put(snap);
  // conservar como máximo 40 versiones automáticas
  const autos = last.filter((s) => s.auto);
  if (auto && autos.length >= 40) await db.snapshots.bulkDelete(autos.slice(0, autos.length - 39).map((s) => s.id));
  return snap;
}

export async function listSnapshots(projectId: string): Promise<Snapshot[]> {
  const rows = await getDB().snapshots.where('projectId').equals(projectId).sortBy('createdAt');
  return rows.reverse();
}

export async function getSnapshot(id: string): Promise<Snapshot | undefined> {
  return getDB().snapshots.get(id);
}

export async function deleteSnapshot(id: string): Promise<void> {
  await getDB().snapshots.delete(id);
}

/* ---------------- ejecuciones ---------------- */

export async function saveRun(projectId: string, run: Omit<SimulationRunSummary, 'projectId'>): Promise<void> {
  await getDB().runs.put({ ...run, projectId });
  const all = await getDB().runs.where('projectId').equals(projectId).sortBy('executionDate');
  if (all.length > 60) await getDB().runs.bulkDelete(all.slice(0, all.length - 60).map((r) => r.id));
}

export async function listRuns(projectId: string): Promise<SimulationRunSummary[]> {
  return (await getDB().runs.where('projectId').equals(projectId).sortBy('executionDate')).reverse();
}

/* ---------------- adjuntos ---------------- */

export async function addAttachment(projectId: string, nodeId: string | null, file: Blob & { name?: string }): Promise<AttachmentRow> {
  const row: AttachmentRow = {
    id: newId('att'), projectId, nodeId, name: file.name ?? 'archivo', type: file.type || 'application/octet-stream',
    size: file.size, blob: file, createdAt: Date.now(),
  };
  await getDB().attachments.put(row);
  return row;
}

export async function getAttachment(id: string): Promise<AttachmentRow | undefined> {
  return getDB().attachments.get(id);
}

export async function listAttachments(projectId: string): Promise<AttachmentRow[]> {
  return getDB().attachments.where('projectId').equals(projectId).toArray();
}

export async function deleteAttachment(id: string): Promise<void> {
  await getDB().attachments.delete(id);
}

/* ---------------- ajustes ---------------- */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await getDB().settings.get(key);
  return (row?.value as T) ?? fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await getDB().settings.put({ key, value });
}

/* ---------------- importación / exportación ---------------- */

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < buf.length; i += CH) s += String.fromCharCode(...buf.subarray(i, i + CH));
  return btoa(s);
}

export function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

export async function buildExportBundle(doc: ProjectDoc, opts: { snapshots?: boolean; explorer?: boolean } = {}): Promise<ExportBundle> {
  const db = getDB();
  const atts = await db.attachments.where('projectId').equals(doc.project.id).toArray();
  const bundle: ExportBundle = {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project: doc,
    attachments: await Promise.all(atts.map(async (a) => ({ id: a.id, nodeId: a.nodeId, name: a.name, type: a.type, data: await blobToBase64(a.blob) }))),
  };
  if (opts.snapshots) bundle.snapshots = await db.snapshots.where('projectId').equals(doc.project.id).toArray();
  if (opts.explorer) {
    bundle.explorer = {
      sessions: await db.explorerSessions.where('projectId').equals(doc.project.id).toArray(),
      docs: await db.knowledgeDocs.where('projectId').equals(doc.project.id).toArray(),
      chunks: await db.knowledgeChunks.where('projectId').equals(doc.project.id).toArray(),
    };
  }
  return bundle;
}

/**
 * Importa un archivo JSON (paquete exportado o documento suelto). Valida y
 * migra el esquema. Si ya existe un proyecto con el mismo id, se importa como
 * copia nueva para no sobrescribir trabajo existente.
 */
export async function importBundle(raw: unknown): Promise<{ doc: ProjectDoc; repairs: string[] }> {
  if (!raw || typeof raw !== 'object') throw new DocValidationError('El archivo no contiene JSON válido', []);
  const obj = raw as Record<string, unknown>;
  const isBundle = obj.format === EXPORT_FORMAT && obj.project;
  const { doc: parsed, repairs } = parseProjectDoc(isBundle ? obj.project : obj);
  let doc = parsed;
  const exists = await getDB().projects.get(doc.project.id);
  const oldId = doc.project.id;
  if (exists) doc = reassignProjectId(doc, `${doc.project.name} (importado)`);
  await saveProject(doc);
  if (isBundle) {
    const b = obj as unknown as ExportBundle;
    for (const a of b.attachments ?? []) {
      await getDB().attachments.put({ id: exists ? newId('att') : a.id, projectId: doc.project.id, nodeId: a.nodeId, name: a.name, type: a.type, size: 0, blob: base64ToBlob(a.data, a.type), createdAt: Date.now() });
    }
    for (const s of b.snapshots ?? []) await getDB().snapshots.put({ ...s, id: exists ? newId('snp') : s.id, projectId: doc.project.id });
    if (b.explorer) {
      const fix = <T extends { projectId: string }>(r: T): T => ({ ...r, projectId: doc.project.id });
      await getDB().explorerSessions.bulkPut(b.explorer.sessions.map(fix));
      await getDB().knowledgeDocs.bulkPut(b.explorer.docs.map(fix));
      await getDB().knowledgeChunks.bulkPut(b.explorer.chunks.map(fix));
    }
  }
  void oldId;
  return { doc, repairs };
}

export async function buildBackup(): Promise<BackupBundle> {
  const rows = await getDB().projects.toArray();
  const projects: ExportBundle[] = [];
  for (const r of rows) projects.push(await buildExportBundle(parseProjectDoc(r.doc).doc, { snapshots: true, explorer: true }));
  return { format: 'mapa-de-flujos-backup', formatVersion: 1, exportedAt: new Date().toISOString(), projects };
}

export async function restoreBackup(raw: unknown): Promise<number> {
  const obj = raw as BackupBundle;
  if (!obj || obj.format !== 'mapa-de-flujos-backup' || !Array.isArray(obj.projects)) throw new DocValidationError('No es una copia de seguridad de MAPA DE FLUJOS', []);
  let n = 0;
  for (const p of obj.projects) { await importBundle(p); n++; }
  return n;
}
