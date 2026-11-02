/** Cuadrícula del marco espacial (columnas = tiempo, filas = apoyo/fricción), en coordenadas del lienzo. */
import { useMemo } from 'react';
import { useProject } from '../store/projectStore';
import { useSim } from '../store/simStore';
import { nodeCell } from '../engine/frame';

const HEAT: Record<string, string> = { cold: 'var(--heat-cold)', rhythm: 'var(--heat-rhythm)', warm: 'var(--heat-warm)', overheated: 'var(--heat-hot)' };

export function FrameGrid({ showHeat }: { showHeat: boolean }) {
  const doc = useProject((s) => s.doc);
  const zones = useSim((s) => s.heat?.zones);
  const cursor = useSim((s) => s.cursor);
  const geo = useMemo(() => {
    if (!doc) return null;
    const f = doc.project.settings.frame;
    let maxCol = 6;
    let maxRow = 2;
    for (const n of Object.values(doc.nodes)) {
      if (['note', 'label', 'comment', 'group', 'container'].includes(n.type)) continue;
      const c = nodeCell(doc, n);
      maxCol = Math.max(maxCol, c.column + 1);
      maxRow = Math.max(maxRow, Math.abs(c.row) + 1);
    }
    if (f.time.deadline) maxCol = Math.max(maxCol, f.time.deadline + 2);
    return { f, maxCol, maxRow };
  }, [doc]);
  if (!geo) return null;
  const { f, maxCol, maxRow } = geo;
  const W = f.cellWidth;
  const H = f.cellHeight;
  const x0 = f.origin.x;
  const top = f.origin.y - (maxRow + 0.5) * H;
  const height = (maxRow * 2 + 1) * H;
  const cols = Array.from({ length: maxCol }, (_, i) => i + 1);
  const rows = Array.from({ length: maxRow * 2 + 1 }, (_, i) => maxRow - i);
  const deadline = f.time.enabled ? f.time.deadline : null;
  return (
    <svg className="pointer-events-none absolute overflow-visible" style={{ left: x0, top, width: maxCol * W, height }} aria-hidden data-testid="frame-grid">
      {f.support.enabled && rows.map((r) => r !== 0 && (
        <rect key={`b${r}`} x={0} y={(maxRow - r) * H} width={maxCol * W} height={H}
          fill={r > 0 ? 'var(--gain)' : 'var(--loss)'} opacity={Math.min(0.11, 0.025 * Math.abs(r))} />
      ))}
      {showHeat && zones && Object.values(zones).map((z) => {
        const rd = z.readings[cursor];
        if (!rd || rd.state === 'idle' || z.column > maxCol) return null;
        const row = f.support.enabled ? z.row : 0;
        const y = f.support.enabled ? (maxRow - row) * H : 0;
        return <rect key={`${z.column}:${z.row}`} x={(z.column - 1) * W + 3} y={y + 3} width={W - 6} height={(f.support.enabled ? H : height) - 6} rx={14}
          fill={HEAT[rd.state]} opacity={0.08 + Math.abs(rd.temperature) * 0.14} />;
      })}
      {cols.map((c) => (
        <g key={c}>
          <line x1={(c - 1) * W} x2={(c - 1) * W} y1={0} y2={height} stroke="var(--border)" strokeWidth={1} />
          {f.time.enabled && (
            <text x={(c - 1) * W + 10} y={-10} fontSize={12} fill={deadline && c > deadline ? 'var(--loss)' : 'var(--text-3)'} fontWeight={500} fontFamily="var(--font-sans)">
              {f.time.unitLabel} {c}
            </text>
          )}
        </g>
      ))}
      <line x1={maxCol * W} x2={maxCol * W} y1={0} y2={height} stroke="var(--border)" />
      {rows.map((r) => <line key={r} x1={0} x2={maxCol * W} y1={(maxRow - r) * H} y2={(maxRow - r) * H} stroke="var(--border)" strokeOpacity={0.6} />)}
      <line x1={0} x2={maxCol * W} y1={height} y2={height} stroke="var(--border)" strokeOpacity={0.6} />
      {f.support.enabled && (
        <>
          <line x1={0} x2={maxCol * W} y1={(maxRow + 0.5) * H} y2={(maxRow + 0.5) * H} stroke="var(--text-3)" strokeDasharray="6 6" />
          <text x={-12} y={(maxRow + 0.5) * H - 8} textAnchor="end" fontSize={11} fill="var(--gain)" fontWeight={600}>▲ Apoyo</text>
          <text x={-12} y={(maxRow + 0.5) * H + 18} textAnchor="end" fontSize={11} fill="var(--loss)" fontWeight={600}>▼ Fricción</text>
        </>
      )}
      {deadline != null && (
        <g>
          <rect x={deadline * W} y={0} width={(maxCol - deadline) * W} height={height} fill="var(--loss)" opacity={0.045} />
          <line x1={deadline * W} x2={deadline * W} y1={-24} y2={height} stroke="var(--loss)" strokeWidth={2} strokeDasharray="8 5" />
          <text x={deadline * W + 8} y={-28} fontSize={12} fontWeight={650} fill="var(--loss)">Fecha límite</text>
        </g>
      )}
    </svg>
  );
}
