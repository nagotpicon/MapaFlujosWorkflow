import { lazy, Suspense, useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Loader2 } from 'lucide-react';
import { useProject, startAutosave } from '../store/projectStore';
import { requestSimulation, useSim } from '../store/simStore';
import { useUI } from '../store/uiStore';
import * as repo from '../persistence/repository';
import { TipProvider } from '../ui/primitives';
import { Canvas } from '../editor/Canvas';
import { TopBar } from './TopBar';
import { Toolbar } from './Toolbar';
import { Inspector } from '../inspector/Inspector';
import { BottomPanel } from '../panels/BottomPanel';
import { CommandPalette } from './CommandPalette';
import { Toast } from './Toast';
import { useShortcuts } from './useShortcuts';
import { useResolvedTheme } from './useTheme';
import { StartScreen } from './StartScreen';
import { useSimPlayback } from './useSimPlayback';
import * as A from './actions';
import { Dock } from './Dock';
import { Guide } from '../kid/Guide';
import { Meter } from '../kid/Meter';
import { requestKid } from '../kid/kidStore';
import { syncViewToLevel, useLevel } from './levels';

const Overlays = lazy(() => import('./Overlays'));

export function App() {
  const doc = useProject((s) => s.doc);
  const [booting, setBooting] = useState(true);
  const theme = useResolvedTheme();
  const inspectorOpen = useUI((s) => s.inspectorOpen);
  const bottomOpen = useUI((s) => s.bottomOpen);
  const level = useLevel();
  const projectId = doc?.project.id;
  const hasSelection = useUI((s) => s.selection.nodes.length + s.selection.edges.length > 0);
  // en los niveles 1 y 2 los detalles solo aparecen cuando eliges algo
  const showInspector = level === 3 ? inspectorOpen : hasSelection;
  useEffect(() => { if (projectId) syncViewToLevel(level); }, [level, projectId]);
  useShortcuts();
  useSimPlayback();

  useEffect(() => {
    const stop = startAutosave();
    (async () => {
      try {
        const last = await repo.getSetting<string | null>('lastProjectId', null);
        if (last) {
          const loaded = await repo.loadProject(last);
          if (loaded) await A.openProject(loaded.doc, loaded.repairs);
        }
      } catch (e) {
        useUI.getState().notify(`No se pudo recuperar el último proyecto: ${(e as Error).message}`, 'error');
      } finally {
        setBooting(false);
      }
    })();
    return stop;
  }, []);

  // simulación en vivo: se recalcula solo si cambian datos relevantes
  useEffect(() => {
    if (doc && useSim.getState().live) requestSimulation(doc);
  }, [doc]);
  // modo fácil: cuántos de cada 10 llegan, cuánto quita cada piedra…
  useEffect(() => {
    if (doc && level < 3) requestKid(doc);
  }, [doc, level]);

  if (booting) {
    return <div className="flex h-full items-center justify-center text-ink-3"><Loader2 className="size-5 animate-spin" /></div>;
  }

  return (
    <TipProvider>
      {!doc ? <StartScreen /> : (
        <ReactFlowProvider>
          <div className="flex h-full flex-col" data-testid="app">
            <TopBar />
            <div className="flex min-h-0 flex-1">
              {level === 3 && <Toolbar />}
              <main className="relative flex min-w-0 flex-1 flex-col">
                <div className="relative min-h-0 flex-1">
                  <Canvas resolvedTheme={theme} level={level} />
                  {level < 3 && <Guide level={level === 1 ? 1 : 2} />}
                  {level < 3 && <Dock level={level} />}
                  {level === 2 && <Meter />}
                </div>
                {level === 3 && bottomOpen && <BottomPanel />}
              </main>
              {showInspector && <Inspector />}
            </div>
          </div>
          <CommandPalette />
          <Suspense fallback={null}><Overlays /></Suspense>
        </ReactFlowProvider>
      )}
      <Toast />
    </TipProvider>
  );
}
