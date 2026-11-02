/** Enlaces a los manuales publicados junto a la aplicación (/manual/, /manual-ia/). */
export const MANUAL_USER_PATH = 'manual/';
export const MANUAL_IA_PATH = 'manual-ia/';

export function manualUrl(path: string): string {
  return new URL(path, document.baseURI).href;
}

export function openManual(which: 'user' | 'ia') {
  window.open(manualUrl(which === 'user' ? MANUAL_USER_PATH : MANUAL_IA_PATH), '_blank', 'noopener');
}
