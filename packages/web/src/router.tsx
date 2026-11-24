import {
  useLayoutEffect,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from 'react';

const NAV_EVENT = 'planersource:navigate';

/**
 * Adresse affichée (chemin + paramètres), tenue par le routeur et non lue dans `window.location` :
 * quand un retour du navigateur est refusé par la garde, l'adresse du navigateur change un instant
 * avant d'être rétablie, l'écran, lui, ne bouge pas (D-172 (3)).
 */
let affichee =
  typeof window === 'undefined' ? '/' : window.location.pathname + window.location.search;
/** Position de l'entrée d'historique courante (`history.state.idx`), pour mesurer un retour ou une avance. */
let courant = 0;

function lirePosition(): number {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' ? idx : 0;
}

/** Garde de sortie (D-172) : un écran avec des modifications non enregistrées en enregistre une. */
export interface Garde {
  /** Demande la confirmation ; `action` est exécutée si l'utilisateur abandonne. */
  demander: (action: () => void) => void;
}
let garde: Garde | null = null;
let sansGarde = false;
/** Vrai entre un `history.go` voulu (« Abandonner » sur un retour du navigateur) et son `popstate`. */
let traversee = false;

/** Enregistre la garde de l'écran ; renvoie la fonction qui la retire. */
export function enregistrerGarde(g: Garde): () => void {
  garde = g;
  return () => {
    if (garde === g) garde = null;
  };
}

/** Exécute `action` sans consulter la garde (après « Abandonner »). */
export function sansConfirmation(action: () => void): void {
  sansGarde = true;
  try {
    action();
  } finally {
    sansGarde = false;
  }
}

/** Exécute `action` tout de suite, ou après confirmation si l'écran a des modifications non enregistrées. */
export function sortir(action: () => void): void {
  if (garde && !sansGarde) garde.demander(action);
  else action();
}

if (typeof window !== 'undefined') {
  if (typeof (window.history.state as { idx?: unknown } | null)?.idx !== 'number') {
    window.history.replaceState({ idx: 0 }, '');
  }
  courant = lirePosition();
  // Enregistré avant tout abonné : il décide si l'écran suit le `popstate` ou non.
  window.addEventListener('popstate', (event) => {
    const position = lirePosition();
    if (traversee || sansGarde || !garde || position === courant) {
      traversee = false;
      courant = position;
      affichee = window.location.pathname + window.location.search;
      window.dispatchEvent(new Event(NAV_EVENT));
      event.stopImmediatePropagation();
      return;
    }
    // Retour ou avance refusés : l'adresse est rétablie, l'écran n'a pas bougé.
    event.stopImmediatePropagation();
    const ecart = position - courant;
    window.history.go(-ecart);
    garde.demander(() => {
      traversee = true;
      window.history.go(ecart);
    });
  });
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(NAV_EVENT, callback);
  return () => window.removeEventListener(NAV_EVENT, callback);
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, () => affichee.split('?')[0]!);
}

/** Paramètres de requête courants (`?mois=…`), suivis comme le chemin. */
export function useSearch(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, () =>
    affichee.slice(affichee.split('?')[0]!.length),
  );
  return new URLSearchParams(search);
}

export function navigate(to: string, { replace = false } = {}): void {
  if (to === affichee) return;
  if (garde && !sansGarde) {
    garde.demander(() => navigate(to, { replace }));
    return;
  }
  if (replace) window.history.replaceState({ idx: courant }, '', to);
  else {
    courant += 1;
    window.history.pushState({ idx: courant }, '', to);
  }
  affichee = to;
  window.dispatchEvent(new Event(NAV_EVENT));
}

/**
 * Redirige (sans entrée d'historique) dans le commit du rendu si `when` est vrai.
 * `useLayoutEffect` et non `useEffect` : un effet passif en attente écraserait un
 * `navigate` de l'utilisateur fait avant son exécution (D-200).
 */
export function Redirect({ to, when = true }: { to: string; when?: boolean }): null {
  useLayoutEffect(() => {
    if (when) navigate(to, { replace: true });
  }, [to, when]);
  return null;
}

export function Link({
  to,
  onClick,
  ...rest
}: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}
