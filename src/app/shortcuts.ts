/** Atajos de teclado configurables (los valores del proyecto sustituyen a los predeterminados). */
export interface ShortcutDef { id: string; label: string; default: string; group: string }

export const SHORTCUTS: ShortcutDef[] = [
  { id: 'undo', label: 'Deshacer', default: 'Mod+Z', group: 'Edición' },
  { id: 'redo', label: 'Rehacer', default: 'Mod+Shift+Z', group: 'Edición' },
  { id: 'copy', label: 'Copiar', default: 'Mod+C', group: 'Edición' },
  { id: 'cut', label: 'Cortar', default: 'Mod+X', group: 'Edición' },
  { id: 'paste', label: 'Pegar', default: 'Mod+V', group: 'Edición' },
  { id: 'duplicate', label: 'Duplicar', default: 'Mod+D', group: 'Edición' },
  { id: 'selectAll', label: 'Seleccionar todo', default: 'Mod+A', group: 'Edición' },
  { id: 'delete', label: 'Borrar', default: 'Delete', group: 'Edición' },
  { id: 'group', label: 'Juntar en un grupo', default: 'Mod+G', group: 'Edición' },
  { id: 'ungroup', label: 'Deshacer el grupo', default: 'Mod+Shift+G', group: 'Edición' },
  { id: 'edit', label: 'Escribir', default: 'Enter', group: 'Edición' },
  { id: 'child', label: 'Idea unida', default: 'Tab', group: 'Edición' },
  { id: 'sibling', label: 'Idea hermana', default: 'Shift+Enter', group: 'Edición' },
  { id: 'palette', label: 'Buscar', default: 'Mod+K', group: 'Navegación' },
  { id: 'fit', label: 'Verlo todo', default: 'F', group: 'Navegación' },
  { id: 'fitSelection', label: 'Acercarme a lo elegido', default: 'Shift+F', group: 'Navegación' },
  { id: 'toolSelect', label: 'Mover y elegir', default: 'V', group: 'Herramientas' },
  { id: 'toolBubble', label: 'Nueva idea', default: 'B', group: 'Herramientas' },
  { id: 'toolConnect', label: 'Unir ideas', default: 'C', group: 'Herramientas' },
  { id: 'toolNote', label: 'Nota', default: 'N', group: 'Herramientas' },
  { id: 'toolInput', label: 'Inicio', default: 'I', group: 'Herramientas' },
  { id: 'toolOutput', label: 'Meta', default: 'O', group: 'Herramientas' },
  { id: 'view1', label: 'Vista Ideas', default: '1', group: 'Vistas' },
  { id: 'view2', label: 'Vista Recorrido', default: '2', group: 'Vistas' },
  { id: 'view3', label: 'Vista Fuerzas', default: '3', group: 'Vistas' },
  { id: 'view4', label: 'Vista Piezas', default: '4', group: 'Vistas' },
  { id: 'view5', label: 'Vista Película', default: '5', group: 'Vistas' },
  { id: 'heat', label: 'Termómetro', default: 'H', group: 'Vistas' },
  { id: 'play', label: 'Probar / pausar', default: 'Space', group: 'Probar' },
  { id: 'nextIt', label: 'Ronda siguiente', default: '.', group: 'Probar' },
  { id: 'prevIt', label: 'Ronda anterior', default: ',', group: 'Probar' },
  { id: 'save', label: 'Guardar versión ahora', default: 'Mod+S', group: 'Mapa' },
];

export function comboFromEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('Mod');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey && e.key.length !== 1) parts.push('Shift');
  else if (e.shiftKey && /[a-z]/i.test(e.key)) parts.push('Shift');
  let k = e.key;
  if (k === ' ') k = 'Space';
  if (k === 'Backspace') k = 'Delete';
  if (k.length === 1) k = k.toUpperCase();
  parts.push(k);
  return parts.join('+');
}

export function displayCombo(c: string): string {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return c.replace('Mod', mac ? '⌘' : 'Ctrl').replace('Shift', '⇧').replace('Alt', mac ? '⌥' : 'Alt').replace(/\+/g, mac ? '' : '+').replace('Delete', 'Supr').replace('Enter', '↵');
}
