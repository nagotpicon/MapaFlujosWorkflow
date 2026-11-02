/** Base de conocimiento del proyecto (plan maestro, notas, transcripciones) en IndexedDB. */
import { getDB, type KnowledgeChunkRow, type KnowledgeDocRow } from '../persistence/db';
import { newId } from '../core/model/factory';
import { chunkText, searchChunks, toSnippets } from './shared/retrieval';
import type { KnowledgeSnippet, PlanSummary } from './shared/schemas';

export async function addKnowledgeDoc(projectId: string, sessionId: string | null, name: string, mime: string, text: string, kind: KnowledgeDocRow['kind']): Promise<KnowledgeDocRow> {
  const db = getDB();
  const doc: KnowledgeDocRow = { id: newId('kd'), projectId, sessionId, name, kind, mime, charCount: text.length, createdAt: Date.now(), summary: null };
  const chunks: KnowledgeChunkRow[] = chunkText(text).map((c) => ({ id: newId('kc'), projectId, sessionId, documentId: doc.id, documentName: name, section: c.section, order: c.order, text: c.text }));
  await db.transaction('rw', [db.knowledgeDocs, db.knowledgeChunks], async () => {
    await db.knowledgeDocs.put(doc);
    await db.knowledgeChunks.bulkPut(chunks);
  });
  return doc;
}

export async function listKnowledgeDocs(projectId: string): Promise<KnowledgeDocRow[]> {
  return (await getDB().knowledgeDocs.where('projectId').equals(projectId).toArray()).sort((a, b) => a.createdAt - b.createdAt);
}

export async function setDocSummary(id: string, summary: PlanSummary) {
  await getDB().knowledgeDocs.update(id, { summary });
}

export async function deleteKnowledgeDoc(id: string) {
  const db = getDB();
  await db.knowledgeDocs.delete(id);
  await db.knowledgeChunks.where('documentId').equals(id).delete();
}

export async function docText(id: string): Promise<string> {
  const chunks = await getDB().knowledgeChunks.where('documentId').equals(id).toArray();
  return chunks.sort((a, b) => a.order - b.order).map((c) => c.text).join('\n\n');
}

/** Fragmentos relevantes para la consulta (los únicos que se envían al proveedor). */
export async function retrieve(projectId: string, docIds: string[], query: string, k = 4): Promise<KnowledgeSnippet[]> {
  if (!docIds.length) return [];
  const chunks = (await getDB().knowledgeChunks.where('projectId').equals(projectId).toArray()).filter((c) => docIds.includes(c.documentId));
  return toSnippets(searchChunks(chunks, query, k));
}

/** Combina los resúmenes de los planes cargados. */
export function mergeSummaries(docs: KnowledgeDocRow[]): PlanSummary | null {
  const ss = docs.map((d) => d.summary as PlanSummary | null).filter((s): s is PlanSummary => !!s);
  if (!ss.length) return null;
  const cat = (k: keyof PlanSummary) => [...new Set(ss.flatMap((s) => (Array.isArray(s[k]) ? (s[k] as string[]) : [])))].slice(0, 10);
  return { objectives: cat('objectives'), goals: cat('goals'), deadlines: cat('deadlines'), resources: cat('resources'), constraints: cat('constraints'), kpis: cat('kpis'), strategy: cat('strategy'), risks: cat('risks'), summary: ss.map((s) => s.summary).join(' ').slice(0, 800) };
}
