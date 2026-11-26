import type { PeriodeTaux } from './couts.js';
import { resoudreTaux } from './taux.js';

/**
 * Coûts mensuels d'une ressource (SPEC §12.5 point 2, D-243). Fonctions pures : aucune base, aucune horloge.
 * Les montants sont calculés en entiers (charge en centièmes de jour × taux en centimes) et arrondis
 * au centime une seule fois, à la sortie de chaque cellule.
 */

export interface ChargeJour {
  /** AAAA-MM-JJ */
  jour: string;
  /** Jours, 2 décimales au plus. */
  charge: number;
}

export interface CoutMensuel {
  mois: string;
  reel: number;
  planifie: number;
  cout: number;
  taux_manquant: boolean;
}

export interface CoutTotal {
  reel: number;
  planifie: number;
  cout: number;
  taux_manquant: boolean;
}

/** Unité interne : 1/10 000 € (centième de jour × centime). */
const enEuros = (u: number): number => Math.round(u / 100) / 100;

/** Coûts de chaque mois de `mois` (AAAA-MM) pour une ressource, ses imputations et son travail planifié. */
export function coutsMensuels(entree: {
  /** Taux propres. */
  taux: PeriodeTaux[];
  /** Taux de l'équipe actuelle (§12.6 point 3). */
  taux_equipe?: PeriodeTaux[];
  mois: string[];
  imputations: ChargeJour[];
  planifies: ChargeJour[];
}): CoutMensuel[] {
  const { taux, mois } = entree;
  const equipe = entree.taux_equipe ?? [];
  const reel = new Map<string, number>();
  const planifie = new Map<string, number>();
  const manquant = new Set<string>();
  // Ressource sans aucune période, propre ou d'équipe : 0, sans marque (§12.3 points 6 et 8).
  if (taux.length + equipe.length > 0) {
    const compter = (cible: Map<string, number>, charges: ChargeJour[]) => {
      for (const c of charges) {
        const m = c.jour.slice(0, 7);
        if (c.charge <= 0) continue;
        const resolu = resoudreTaux(taux, equipe, c.jour);
        if (!resolu) {
          manquant.add(m);
          continue;
        }
        cible.set(
          m,
          (cible.get(m) ?? 0) + Math.round(c.charge * 100) * Math.round(resolu.montant * 100),
        );
      }
    };
    compter(reel, entree.imputations);
    compter(planifie, entree.planifies);
  }
  return mois.map((m) => {
    const r = reel.get(m) ?? 0;
    const p = planifie.get(m) ?? 0;
    return {
      mois: m,
      reel: enEuros(r),
      planifie: enEuros(p),
      cout: enEuros(r + p),
      taux_manquant: manquant.has(m),
    };
  });
}

/** Somme mois par mois de plusieurs listes de douze mois ; `taux_manquant` = OU. */
export function sommeMensuelle(listes: CoutMensuel[][]): CoutMensuel[] {
  const premiere = listes[0];
  if (!premiere) return [];
  return premiere.map((cellule, i) => {
    let reel = 0;
    let planifie = 0;
    let cout = 0;
    let manquant = false;
    for (const l of listes) {
      const c = l[i]!;
      reel += Math.round(c.reel * 100);
      planifie += Math.round(c.planifie * 100);
      cout += Math.round(c.cout * 100);
      manquant = manquant || c.taux_manquant;
    }
    return {
      mois: cellule.mois,
      reel: reel / 100,
      planifie: planifie / 100,
      cout: cout / 100,
      taux_manquant: manquant,
    };
  });
}

/** Total des mois (somme, `taux_manquant` = OU). */
export function totalMensuel(mois: CoutMensuel[]): CoutTotal {
  const s = sommeMensuelle([mois]);
  return {
    reel: s.reduce((t, c) => t + Math.round(c.reel * 100), 0) / 100,
    planifie: s.reduce((t, c) => t + Math.round(c.planifie * 100), 0) / 100,
    cout: s.reduce((t, c) => t + Math.round(c.cout * 100), 0) / 100,
    taux_manquant: s.some((c) => c.taux_manquant),
  };
}
