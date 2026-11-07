import { Activity, FolderOpen, GitCompare, HelpCircle, History, MessageCircleHeart, Settings, Sparkles } from 'lucide-react';
import { useUI } from '../store/uiStore';
import { Modal } from '../ui/primitives';
import { MonitorPanel } from '../panels/Monitor';
import { VerdictPanel } from '../panels/Verdict';
import { VersionsPanel } from '../panels/Versions';
import { ComparePanel } from '../panels/Compare';
import { SettingsPanel } from '../panels/Settings';
import { HelpPanel } from '../panels/Help';
import { ProjectList } from './StartScreen';
import { ExplorerPanel } from '../explorer/ExplorerPanel';
import { PasteImportDialog } from './PasteImport';

export default function Overlays() {
  const overlay = useUI((s) => s.overlay);
  const close = (o: boolean) => { if (!o) useUI.setState({ overlay: null }); };
  return (
    <>
      <Modal open={overlay === 'monitor'} onOpenChange={close} full title="Marcador" subtitle="Qué te ayuda, qué te frena y qué arreglaría primero" icon={<Activity />}>
        {overlay === 'monitor' && <MonitorPanel />}
      </Modal>
      <Modal open={overlay === 'verdict'} onOpenChange={close} width="max-w-2xl" title="Dímelo claro" subtitle="Lo que sale de tu mapa, sin rodeos" icon={<MessageCircleHeart />}>
        {overlay === 'verdict' && <VerdictPanel />}
      </Modal>
      <Modal open={overlay === 'explorer'} onOpenChange={close} full title="Ayúdame a pensar" subtitle="Te hago preguntas para que descubras qué quieres y cómo conseguirlo" icon={<Sparkles />}>
        {overlay === 'explorer' && <ExplorerPanel />}
      </Modal>
      <Modal open={overlay === 'versions'} onOpenChange={close} title="Versiones guardadas" subtitle="Vuelve a como estaba antes, sin perder lo de ahora" icon={<History />}>
        {overlay === 'versions' && <VersionsPanel />}
      </Modal>
      <Modal open={overlay === 'compare'} onOpenChange={close} width="max-w-5xl" title="Comparar «¿y si…?»" icon={<GitCompare />}>
        {overlay === 'compare' && <ComparePanel />}
      </Modal>
      <Modal open={overlay === 'projects'} onOpenChange={close} title="Mis mapas" subtitle="Guardados en este navegador" icon={<FolderOpen />}>
        {overlay === 'projects' && <div className="px-5 pb-4"><ProjectList onOpen={() => useUI.setState({ overlay: null })} /></div>}
      </Modal>
      <Modal open={overlay === 'settings'} onOpenChange={close} width="max-w-3xl" title="Ajustes del mapa" icon={<Settings />}>
        {overlay === 'settings' && <SettingsPanel />}
      </Modal>
      <Modal open={overlay === 'help'} onOpenChange={close} width="max-w-3xl" title="Ayuda" subtitle="Cómo se usa, paso a paso" icon={<HelpCircle />}>
        {overlay === 'help' && <HelpPanel />}
      </Modal>
      <PasteImportDialog open={overlay === 'paste'} onOpenChange={close} />
    </>
  );
}
