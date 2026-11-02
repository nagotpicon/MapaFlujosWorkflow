/**
 * Persistencia LOCAL-FIRST sobre IndexedDB (Dexie).
 * El repositorio (repository.ts) es la única puerta de acceso; una futura
 * base de datos remota puede implementar la misma interfaz.
 */
import Dexie, { type Table } from 'dexie';
import type { ProjectDoc, Snapshot, SimulationRunSummary } from '../core/model/schema';

export interface ProjectRow {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  isDemo: boolean;
  nodeCount: number;
  doc: ProjectDoc;
}

export interface AttachmentRow {
  id: string;
  projectId: string;
  nodeId: string | null;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  createdAt: number;
}

export interface SettingRow { key: string; value: unknown }

export interface ExplorerSessionRow {
  id: string;
  projectId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** estado serializado de la sesión (mensajes, memoria, propuesta) */
  state: unknown;
}

export interface KnowledgeChunkRow {
  id: string;
  projectId: string;
  sessionId: string | null;
  documentId: string;
  documentName: string;
  section: string;
  order: number;
  text: string;
}

export interface KnowledgeDocRow {
  id: string;
  projectId: string;
  sessionId: string | null;
  name: string;
  kind: 'plan' | 'note' | 'transcript';
  mime: string;
  charCount: number;
  createdAt: number;
  /** resumen estructurado (objetivos, metas, plazos…) si se ha generado */
  summary: unknown;
}

export class MapaDB extends Dexie {
  projects!: Table<ProjectRow, string>;
  snapshots!: Table<Snapshot, string>;
  runs!: Table<SimulationRunSummary, string>;
  attachments!: Table<AttachmentRow, string>;
  settings!: Table<SettingRow, string>;
  explorerSessions!: Table<ExplorerSessionRow, string>;
  knowledgeDocs!: Table<KnowledgeDocRow, string>;
  knowledgeChunks!: Table<KnowledgeChunkRow, string>;

  constructor(name = 'mapa-de-flujos') {
    super(name);
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      snapshots: 'id, projectId, createdAt',
      runs: 'id, projectId, scenarioId, executionDate',
      attachments: 'id, projectId, nodeId',
      settings: 'key',
    });
    this.version(2).stores({
      explorerSessions: 'id, projectId, updatedAt',
      knowledgeDocs: 'id, projectId, sessionId',
      knowledgeChunks: 'id, projectId, documentId, sessionId',
    });
  }
}

let instance: MapaDB | null = null;
export function getDB(): MapaDB {
  if (!instance) instance = new MapaDB();
  return instance;
}

/** Solo para pruebas */
export function setDB(db: MapaDB) {
  instance = db;
}
