import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { aujourdhui, formatMontant } from './couts';

/** Taux du jour d'une ressource (SPEC §12.6 point 8) : `source` dit d'où vient le montant. */
export interface TauxDuJour {
  utilisateur_id: number;
  montant: number | null;
  source: 'propre' | 'equipe' | null;
}

/** Lectures en cours par chemin : deux montages simultanés (rendu double de développement) ne font qu'une requête. */
const enCours = new Map<string, Promise<TauxDuJour[]>>();

function lire(chemin: string): Promise<TauxDuJour[]> {
  const deja = enCours.get(chemin);
  if (deja) return deja;
  const p = api<TauxDuJour[]>(chemin).finally(() => enCours.delete(chemin));
  enCours.set(chemin, p);
  return p;
}

/**
 * Colonne « Taux du jour » : UNE requête pour toutes les ressources, à la date du jour du navigateur ; relue sur
 * `recharger`. Lecture refusée ou en échec : aucune valeur (« — »). `actif` faux : aucune requête.
 */
export function useTauxDuJour(actif: boolean): {
  texte: (utilisateurId: number) => string;
  recharger: () => void;
} {
  const [valeurs, setValeurs] = useState<Map<number, TauxDuJour>>(new Map());
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!actif) return;
    let vivant = true;
    lire(`/api/taux/du-jour?date=${aujourdhui()}`)
      .then((l) => vivant && setValeurs(new Map(l.map((t) => [t.utilisateur_id, t]))))
      .catch(() => vivant && setValeurs(new Map()));
    return () => {
      vivant = false;
    };
  }, [actif, version]);
  const recharger = useCallback(() => setVersion((v) => v + 1), []);
  const texte = (id: number) => {
    const t = valeurs.get(id);
    if (!t || t.montant === null) return '—';
    return t.source === 'equipe'
      ? `${formatMontant(t.montant)} (équipe)`
      : formatMontant(t.montant);
  };
  return { texte, recharger };
}
