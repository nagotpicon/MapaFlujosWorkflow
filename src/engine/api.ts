/** Superficie del motor expuesta al Web Worker (funciones puras y serializables). */
import type { ProjectDoc } from '../core/model/schema';
import { simulate } from './simulate';
import { computeHeat } from './heat';
import { computeMonitor } from './monitor';
import { compareScenarios, sensitivitySweep, tornado, uncertaintyBand, type ParamRef } from './analysis';
import { diagnose } from './diagnostics';
import { buildVerdict } from './verdict';
import { analizarCamino } from './kid';

export const ENGINE_API = {
  simulateWithHeat: (doc: ProjectDoc, scenarioId: string | null, iterations: number) => {
    const result = simulate(doc, { scenarioId, iterations });
    const heat = computeHeat(doc, result);
    const diagnostics = diagnose(doc, result);
    return { result, heat, diagnostics };
  },
  monitor: (doc: ProjectDoc, scenarioId: string | null, iterations: number) => {
    const result = simulate(doc, { scenarioId, iterations });
    const monitor = computeMonitor(doc, scenarioId, result);
    const heat = computeHeat(doc, result);
    const name = scenarioId ? doc.scenarios[scenarioId]?.name ?? '' : '';
    return { monitor, heat, verdict: buildVerdict(doc, monitor, name), loops: result.loops, frameNotes: result.frameNotes };
  },
  kid: (doc: ProjectDoc) => analizarCamino(doc),
  tornado: (doc: ProjectDoc, scenarioId: string | null, iterations: number) => tornado(doc, scenarioId, 0.2, 40, iterations),
  compare: (doc: ProjectDoc, a: string, b: string, iterations: number) => compareScenarios(doc, a, b, iterations),
  band: (doc: ProjectDoc, scenarioId: string, iterations: number) => uncertaintyBand(doc, scenarioId, iterations),
  sweep: (doc: ProjectDoc, scenarioId: string | null, p: ParamRef, values: number[], iterations: number) => sensitivitySweep(doc, scenarioId, p, values, iterations),
};

export type EngineFn = keyof typeof ENGINE_API;
export type EngineResult<F extends EngineFn> = ReturnType<(typeof ENGINE_API)[F]>;
