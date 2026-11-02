import { beforeEach, describe, expect, it } from 'vitest';
import { MapaDB, setDB } from '../src/persistence/db';
import * as repo from '../src/persistence/repository';
import { buildInsuranceDemo } from '../src/demo/insuranceDemo';
import { parseProjectDoc } from '../src/core/model/migrations';
import { simulate } from '../src/engine/simulate';
import { applyOverrides } from '../src/engine/scenario';
import { createScenario, newId } from '../src/core/model/factory';

let n = 0;
beforeEach(() => { setDB(new MapaDB(`test-${n++}-${Math.random()}`)); });

describe('Persistencia', () => {
  it('guarda y recupera un proyecto completo', async () => {
    const doc = buildInsuranceDemo();
    await repo.saveProject(doc);
    const list = await repo.listProjects();
    expect(list).toHaveLength(1);
    const loaded = await repo.loadProject(doc.project.id);
    expect(loaded!.doc).toEqual(doc);
  });

  it('versiones: crear, listar y recuperar', async () => {
    const doc = buildInsuranceDemo();
    await repo.saveProject(doc);
    const s1 = await repo.createSnapshot(doc, 'v1');
    const changed = { ...doc, project: { ...doc.project, name: 'Cambiado' } };
    await repo.createSnapshot(changed, 'v2');
    const snaps = await repo.listSnapshots(doc.project.id);
    expect(snaps.map((s) => s.label)).toEqual(['v2', 'v1']);
    expect((await repo.getSnapshot(s1.id))!.data.project.name).toBe(doc.project.name);
  });

  it('exporta e importa JSON con validación y sin sobrescribir', async () => {
    const doc = buildInsuranceDemo();
    await repo.saveProject(doc);
    await repo.addAttachment(doc.project.id, null, new Blob(['hola'], { type: 'text/plain' }));
    const bundle = await repo.buildExportBundle(doc, { snapshots: true });
    const json = JSON.parse(JSON.stringify(bundle));
    const { doc: imported } = await repo.importBundle(json);
    expect(imported.project.id).not.toBe(doc.project.id);
    expect(Object.keys(imported.nodes)).toEqual(Object.keys(doc.nodes));
    expect(Object.keys(imported.scenarios)).toEqual(Object.keys(doc.scenarios));
    expect(await repo.listProjects()).toHaveLength(2);
    const atts = await repo.listAttachments(imported.project.id);
    expect(atts).toHaveLength(1);
    expect(await atts[0].blob.text()).toBe('hola');
  });

  it('rechaza datos inválidos', async () => {
    await expect(repo.importBundle({ foo: 1 })).rejects.toThrow();
    await expect(repo.importBundle({ schemaVersion: 2, project: {}, nodes: 3 })).rejects.toThrow();
  });

  it('migra documentos v1 (colecciones como arrays, peso numérico)', () => {
    const doc = buildInsuranceDemo();
    const v1: Record<string, unknown> = { ...doc, schemaVersion: 1 };
    for (const k of ['nodes', 'ports', 'edges', 'behaviors', 'conditions', 'annotations', 'layers', 'scenarios', 'circuits'] as const) v1[k] = Object.values(doc[k]);
    delete v1.dimensions;
    const first = Object.values(doc.nodes)[0];
    (v1.nodes as Record<string, unknown>[])[0] = { ...first, weight: -3 };
    const { doc: migrated } = parseProjectDoc(v1);
    expect(migrated.schemaVersion).toBe(2);
    expect(Object.keys(migrated.nodes)).toHaveLength(Object.keys(doc.nodes).length);
    expect(migrated.nodes[first.id].weight.influence?.value).toBe(-3);
    expect(migrated.dimensions.quantity).toBeDefined();
  });

  it('copia de seguridad completa y restauración', async () => {
    await repo.saveProject(buildInsuranceDemo());
    await repo.saveProject(buildInsuranceDemo());
    const backup = JSON.parse(JSON.stringify(await repo.buildBackup()));
    setDB(new MapaDB(`restore-${Math.random()}`));
    expect(await repo.restoreBackup(backup)).toBe(2);
    expect(await repo.listProjects()).toHaveLength(2);
  });

  it('escenarios independientes sobreviven a una recarga', async () => {
    const doc = buildInsuranceDemo();
    const base = Object.values(doc.scenarios).find((s) => s.isBase)!;
    const filterB = Object.values(doc.behaviors).find((b) => b.behaviorType === 'filter')!;
    const clone = createScenario(doc.project.id, 'Clon', { overrides: [{ id: newId('ov'), targetType: 'behavior', targetId: filterB.id, path: 'parameters.passRatio', value: 0.9, note: '' }] });
    doc.scenarios[clone.id] = clone;
    await repo.saveProject(doc);
    const { doc: back } = (await repo.loadProject(doc.project.id))!;
    expect(back.scenarios[clone.id].overrides[0].value).toBe(0.9);
    expect(back.behaviors[filterB.id].parameters.passRatio).toBe(0.65);
    const ra = simulate(back, { scenarioId: base.id });
    const rb = simulate(back, { scenarioId: clone.id });
    expect(rb.metrics.totalResult.quantity).not.toBe(ra.metrics.totalResult.quantity);
    // el modelo base no se modifica al aplicar un escenario
    applyOverrides(back, back.scenarios[clone.id].overrides);
    expect(back.behaviors[filterB.id].parameters.passRatio).toBe(0.65);
  });
});
