import { useEffect } from 'react';
import { useProject } from '../store/projectStore';
import { useSim } from '../store/simStore';
import { useUI, writeLS, type ViewMode } from '../store/uiStore';
import * as A from './actions';
import { levelOf } from './levels';
import { SHORTCUTS, comboFromEvent } from './shortcuts';
import * as repo from '../persistence/repository';

const VIEWS: ViewMode[] = ['mental', 'flow', 'energy', 'system', 'simulation'];

export function setView(v: ViewMode) {
  useUI.setState({ view: v });
  writeLS('mdf.view', v);
}

const LEVEL3_ONLY = ['group', 'ungroup', 'heat', 'view2', 'view3', 'view4'];
const LEVEL2_PLUS = ['toolInput', 'toolOutput', 'play', 'nextIt', 'prevIt', 'view5'];

export function runShortcut(id: string): boolean {
  const ui = useUI.getState();
  const sel = ui.selection.nodes;
  // en los niveles sencillos, los atajos de herramientas avanzadas no hacen nada
  const level = levelOf(useProject.getState().doc?.project.settings.depth);
  if (level < 3 && LEVEL3_ONLY.includes(id)) return false;
  if (level < 2 && LEVEL2_PLUS.includes(id)) return false;
  switch (id) {
    case 'undo': A.undo(); return true;
    case 'redo': A.redo(); return true;
    case 'copy': void A.copySelection(); return true;
    case 'cut': void A.copySelection(true); return true;
    case 'paste': void A.pasteClipboard(); return true;
    case 'duplicate': A.duplicateSelection(); return true;
    case 'selectAll': A.selectAll(); return true;
    case 'delete': A.deleteSelection(); return true;
    case 'group': A.groupSelection(); return true;
    case 'ungroup': A.ungroupSelection(); return true;
    case 'edit': if (sel.length === 1) { useUI.setState({ editingNodeId: sel[0] }); return true; } return false;
    case 'child': if (sel.length === 1) { A.createConnectedNode(sel[0]); return true; } return false;
    case 'sibling': if (sel.length === 1) { A.createConnectedNode(sel[0], true); return true; } return false;
    case 'palette': useUI.setState({ commandOpen: true }); return true;
    case 'fit': A.fit(); return true;
    case 'fitSelection': A.fit(sel); return true;
    case 'toolSelect': useUI.setState({ tool: 'select' }); return true;
    case 'toolBubble': useUI.setState({ tool: 'bubble' }); return true;
    case 'toolConnect': useUI.setState({ tool: 'connect' }); return true;
    case 'toolNote': useUI.setState({ tool: 'note' }); return true;
    case 'toolInput': useUI.setState({ tool: 'input' }); return true;
    case 'toolOutput': useUI.setState({ tool: 'output' }); return true;
    case 'view1': case 'view2': case 'view3': case 'view4': case 'view5': setView(VIEWS[Number(id.slice(4)) - 1]); return true;
    case 'heat': { const v = !ui.showHeat; useUI.setState({ showHeat: v }); writeLS('mdf.heat', v); return true; }
    case 'play': {
      const s = useSim.getState();
      useSim.setState({ play: s.play === 'playing' ? 'paused' : 'playing', step: -1 });
      if (ui.view === 'mental') setView('simulation');
      return true;
    }
    case 'nextIt': { const s = useSim.getState(); if (s.result) useSim.setState({ cursor: Math.min(s.result.iterationCount - 1, s.cursor + 1), step: -1 }); return true; }
    case 'prevIt': { const s = useSim.getState(); useSim.setState({ cursor: Math.max(0, s.cursor - 1), step: -1 }); return true; }
    case 'save': {
      const doc = useProject.getState().doc;
      if (doc) void repo.createSnapshot(doc, `Versión manual ${new Date().toLocaleString('es-ES')}`).then(() => ui.notify('Versión guardada', 'success'));
      return true;
    }
  }
  return false;
}

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === 'Escape') {
        const ui = useUI.getState();
        if (ui.commandOpen || ui.overlay) return;
        if (typing) return;
        useUI.setState({ tool: 'select', trace: null, focusNodeId: null, searchQuery: '', selection: { nodes: [], edges: [] } });
        return;
      }
      if (typing) return;
      if (!useProject.getState().doc) return;
      if (useUI.getState().overlay && !(e.metaKey || e.ctrlKey)) return;
      const combo = comboFromEvent(e);
      const custom = useProject.getState().doc?.project.settings.shortcuts ?? {};
      const def = SHORTCUTS.find((s) => (custom[s.id] ?? s.default) === combo || (s.id === 'redo' && combo === 'Mod+Y'));
      if (!def) return;
      if (runShortcut(def.id)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
