import { useCallback, useState } from 'react';

/** Suit la largeur de la zone SVG : renvoie la largeur et la ref à poser sur la zone. */
export function useLargeur() {
  const [largeur, setLargeur] = useState(0);
  const zone = useCallback((noeud: HTMLDivElement | null) => {
    if (!noeud) return;
    setLargeur(noeud.clientWidth);
    const observateur = new ResizeObserver(() => setLargeur(noeud.clientWidth));
    observateur.observe(noeud);
    return () => observateur.disconnect();
  }, []);
  return [largeur, zone] as const;
}
