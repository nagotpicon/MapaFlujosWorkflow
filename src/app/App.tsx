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

const Overlays = lazy(() => import('./Overlays'));

export function App() {
  const doc = useProject((s) => s.doc);
  const [booting, setBooting] = useState(true);
  const theme = useResolvedTheme();
  const inspectorOpen = useUI((s) => s.inspectorOpen);
  const bottomOpen = useUI((s) => s.bottomOpen);
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
              <Toolbar />
              <main className="relative flex min-w-0 flex-1 flex-col">
                <div className="relative min-h-0 flex-1">
                  <Canvas resolvedTheme={theme} />
                </div>
                {bottomOpen && <BottomPanel />}
              </main>
              {inspectorOpen && <Inspector />}
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
