/**
 * Evaluación EN VIVO del Explorador contra el proveedor real configurado.
 * Se salta salvo que EXPLORER_LIVE=1 y exista una clave (consume API).
 *   EXPLORER_LIVE=1 GEMINI_API_KEY=... npx vitest run tests/explorer.live.test.ts
 */
import { describe, expect, it } from 'vitest';
import { resolveProvider } from '../server/providers';
import { generateValidated } from '../server/handler';
import { ExplorerTurnSchema, ProposalSchema, PROPOSAL_JSON_SCHEMA, TURN_JSON_SCHEMA, emptyMemory, type TurnRequest } from '../src/explorer/shared/schemas';
import { SYSTEM_INSTRUCTION, buildProposalPrompt, buildTurnPrompt } from '../src/explorer/shared/prompts';

const cfg = resolveProvider(process.env as Record<string, string>);
const live = process.env.EXPLORER_LIVE === '1' && cfg.configured;

async function run(inputs: TurnRequest['inputs'], answers: string[], commands: (string | null)[] = []) {
  let memory = emptyMemory();
  const messages: TurnRequest['messages'] = [];
  const out = [];
  for (let i = 0; i <= answers.length; i++) {
    if (i > 0) messages.push({ role: 'user', content: answers[i - 1] });
    const { data } = await generateValidated(cfg.provider!, ExplorerTurnSchema, { system: SYSTEM_INSTRUCTION, prompt: buildTurnPrompt({ inputs, messages, memory, command: i > 0 ? commands[i - 1] ?? null : null, knowledge: [], plan: null }), jsonSchema: TURN_JSON_SCHEMA, signal: AbortSignal.timeout(120_000) });
    memory = data.memory;
    messages.push({ role: 'assistant', content: data.message });
    out.push(data);
  }
  return { turns: out, memory };
}

describe.skipIf(!live)('Explorador EN VIVO (proveedor real)', () => {
  it('A · guitarra: pregunta operativa, una cada vez, empieza por el umbral o la realidad operativa', async () => {
    const r = await run({ topic: 'Quiero montar clases particulares de guitarra', objective: '', strategy: 'repartir flyers por mi zona', context: '' }, ['Con cinco alumnos recurrentes podría estar satisfecho.', 'No lo sé']);
    for (const t of r.turns) expect((t.message.match(/\?/g) ?? []).length).toBeLessThanOrEqual(3);
    expect(['success', 'framing', 'resources', 'logistics', 'economics']).toContain(r.turns[0].area);
    expect(r.turns[2].message).not.toMatch(/\b\d{1,3}\s?%/);
  }, 300_000);

  it('E · detecta la contradicción de horas antes de construir', async () => {
    const r = await run({ topic: 'clases de guitarra', objective: '', strategy: 'flyers', context: '' }, ['Solo tengo 5 horas a la semana', 'Para repartir y dar clases necesitaré unas 10 horas semanales']);
    expect(`${r.turns[2].message} ${r.memory.contradictions.join(' ')}`).toMatch(/5|10|horas/);
  }, 300_000);

  it('propuesta estructurada válida', async () => {
    const { data } = await generateValidated(cfg.provider!, ProposalSchema, { system: SYSTEM_INSTRUCTION, prompt: buildProposalPrompt({ inputs: { topic: 'Curso online sin audiencia', objective: '', strategy: '', context: '' }, messages: [], memory: emptyMemory(), knowledge: [], plan: null, freeText: 'Quiero vender un curso online pero no tengo audiencia', mode: 'strategy' }), jsonSchema: PROPOSAL_JSON_SCHEMA, signal: AbortSignal.timeout(180_000) });
    expect(data.nodes.length).toBeGreaterThan(5);
    expect(data.frictions.personal.length + data.frictions.external.length + data.frictions.system.length).toBeGreaterThan(0);
  }, 300_000);
});
