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
  { id: 'delete', label: 'Eliminar', default: 'Delete', group: 'Edición' },
  { id: 'group', label: 'Agrupar', default: 'Mod+G', group: 'Edición' },
  { id: 'ungroup', label: 'Desagrupar', default: 'Mod+Shift+G', group: 'Edición' },
  { id: 'edit', label: 'Editar texto', default: 'Enter', group: 'Edición' },
  { id: 'child', label: 'Burbuja conectada', default: 'Tab', group: 'Edición' },
  { id: 'sibling', label: 'Burbuja hermana', default: 'Shift+Enter', group: 'Edición' },
  { id: 'palette', label: 'Buscador de comandos', default: 'Mod+K', group: 'Navegación' },
  { id: 'fit', label: 'Ajustar al contenido', default: 'F', group: 'Navegación' },
  { id: 'fitSelection', label: 'Zoom a la selección', default: 'Shift+F', group: 'Navegación' },
  { id: 'toolSelect', label: 'Herramienta seleccionar', default: 'V', group: 'Herramientas' },
  { id: 'toolBubble', label: 'Herramienta burbuja', default: 'B', group: 'Herramientas' },
  { id: 'toolConnect', label: 'Herramienta conexión', default: 'C', group: 'Herramientas' },
  { id: 'toolNote', label: 'Herramienta nota', default: 'N', group: 'Herramientas' },
  { id: 'toolInput', label: 'Herramienta entrada', default: 'I', group: 'Herramientas' },
  { id: 'toolOutput', label: 'Herramienta salida', default: 'O', group: 'Herramientas' },
  { id: 'view1', label: 'Vista Mental', default: '1', group: 'Vistas' },
  { id: 'view2', label: 'Vista Flujo', default: '2', group: 'Vistas' },
  { id: 'view3', label: 'Vista Energía', default: '3', group: 'Vistas' },
  { id: 'view4', label: 'Vista Sistema', default: '4', group: 'Vistas' },
  { id: 'view5', label: 'Vista Simulación', default: '5', group: 'Vistas' },
  { id: 'heat', label: 'Termómetro de calor', default: 'H', group: 'Vistas' },
  { id: 'play', label: 'Reproducir / pausar', default: 'Space', group: 'Simulación' },
  { id: 'nextIt', label: 'Siguiente iteración', default: '.', group: 'Simulación' },
  { id: 'prevIt', label: 'Iteración anterior', default: ',', group: 'Simulación' },
  { id: 'save', label: 'Guardar versión', default: 'Mod+S', group: 'Proyecto' },
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
