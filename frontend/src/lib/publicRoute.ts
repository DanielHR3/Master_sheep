// Decide qué ve un visitante sin sesión (spec §2), sin enrutador.
import { useEffect, useState } from 'react';

export type PublicView = 'landing' | 'login';

const SEEN_KEY = 'sheepmaster_seen_app';

// En la app de escritorio (Wails) nunca hay landing: es una herramienta de
// trabajo, no una página de ventas.
const isWails = () => !!(window as any).go;

// Visitante nuevo en "/" → landing; quien ya usó la app en este navegador,
// o quien entra a "/login", → login.
export function getPublicView(): PublicView {
  if (isWails()) return 'login';
  const path = window.location.pathname.replace(/\/+$/, '');
  // /inicio (o /landing) muestra SIEMPRE la página de ventas, aunque este
  // navegador ya haya usado la app: es la URL fija para compartir.
  if (path.endsWith('/inicio') || path.endsWith('/landing')) return 'landing';
  if (path.endsWith('/login')) return 'login';
  try {
    if (localStorage.getItem(SEEN_KEY)) return 'login';
  } catch {
    /* localStorage bloqueado: tratar como visitante nuevo */
  }
  return 'landing';
}

export function markAppSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* sin localStorage no hay marca; la landing volverá a mostrarse */
  }
}

// Navegación sin recarga: pushState + evento popstate para que el hook
// se entere. Rutas relativas para no romper el base "./" de Vite.
export function navigateTo(path: '/' | '/login' | '/inicio'): void {
  const target = path === '/login' ? './login' : path === '/inicio' ? './inicio' : './';
  window.history.pushState({}, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function usePublicView(): PublicView {
  const [view, setView] = useState<PublicView>(getPublicView);
  useEffect(() => {
    const onChange = () => setView(getPublicView());
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);
  return view;
}
