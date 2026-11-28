import type { Db } from '../db/erreurs.js';
import { projetsVisibles, type Acteur } from './projets.js';
import { estChef } from '../auth/user.js';
import { joursAbsence, joursEntiers, type JourAbsence } from './absences.js';

/** Plan de charge (lot 6d, D-154) : charge mensuelle des ressources sur 12 mois, lecture seule. */
export interface MoisRessource {
  mois: string;
  disponible: number;
  reel: number;
  planifie: number;
  charge: number;
  ecart: number;
}

export interface MoisProjet {
  mois: string;
  reel: number;
  planifie: number;
  charge: number;
}

export interface LigneProjet {
  projet_id: number | null;
  code: string | null;
  nom: string | null;
  mois: MoisProjet[];
}

export interface LigneRessource {
  ressource_id: number;
  nom: string;
  actif: boolean;
  equipe_id: number | null;
  mois: MoisRessource[];
  projets: LigneProjet[];
}

export interface PlanDeCharge {
  mois: string[];
  ressources: LigneRessource[];
}

export type FiltreEquipe =
  { genre: 'toutes' } | { genre: 'aucune' } | { genre: 'equipe'; id: number };

const MAX_ID = 2147483647;

/** 12 mois consécutifs à partir de `debut` (AAAA-MM). */
export function listerMois(debut: string): string[] {
  const annee = Number(debut.slice(0, 4));
  const mois0 = Number(debut.slice(5, 7)) - 1;
  return Array.from({ length: 12 }, (_, i) => {
    const total = annee * 12 + mois0 + i;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
  });
}

const premierJour = (mois: string) => `${mois}-01`;

/** Valeurs en centièmes : somme exacte, conversion en nombre à la sortie. */
const cents = (texte: string): number => Math.round(Number(texte) * 100);
const jours = (c: number): number => c / 100;

interface LigneCharge {
  ressource_id: number;
  projet_id: number;
  code: string;
  nom: string;
  mois: string;
  reel: string;
  planifie: string;
}

/** Nombre de jours ouvrés (jour travaillé, non férié) de chaque mois. */
function joursOuvres(mois: string[], travailles: number[], feries: Set<string>): number[] {
  return mois.map((m) => {
    const [a, mm] = m.split('-').map(Number) as [number, number];
    const fin = new Date(Date.UTC(a, mm, 0)).getUTCDate();
    let n = 0;
    for (let j = 1; j <= fin; j += 1) {
      const date = new Date(Date.UTC(a, mm - 1, j));
      const iso = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
      const cle = `${m}-${String(j).padStart(2, '0')}`;
      if (travailles.includes(iso) && !feries.has(cle)) n += 1;
    }
    return n;
  });
}

/** Jour ouvré d'un calendrier : jour travaillé (ISO 1 à 7), non férié. */
function estOuvre(jour: string, travailles: number[], feries: Set<string>): boolean {
  const j = new Date(`${jour}T00:00:00Z`).getUTCDay();
  return travailles.includes(j === 0 ? 7 : j) && !feries.has(jour);
}

/**
 * Capacité retirée par les absences, en centièmes, par mois (SPEC §4 « Absences et charge depuis le taux »,
 * points 3 et 24, D-278) : un jour ouvré d'absence en journée entière retire la capacité ; une demi-journée en
 * retire ce qui dépasse la moitié plancher au centième ; un jour non ouvré ou férié ne retire rien.
 */
function retraitAbsences(
  mois: string[],
  jours: JourAbsence[],
  capacite: number,
  travailles: number[],
  feries: Set<string>,
): number[] {
  const retrait = mois.map(() => 0);
  const entiers = joursEntiers(jours);
  const vus = new Set<string>();
  for (const a of jours) {
    if (vus.has(a.jour)) continue;
    vus.add(a.jour);
    const i = mois.indexOf(a.jour.slice(0, 7));
    if (i < 0 || !estOuvre(a.jour, travailles, feries)) continue;
    retrait[i]! += entiers.has(a.jour) ? capacite : capacite - Math.floor(capacite / 2);
  }
  return retrait;
}

const comparer = (x: string, y: string): number => {
  const a = x.toLowerCase();
  const b = y.toLowerCase();
  return a < b ? -1 : a > b ? 1 : 0;
};

export async function lirePlanDeCharge(
  db: Db,
  acteur: Acteur,
  debut: string,
  filtre: FiltreEquipe,
): Promise<PlanDeCharge> {
  const mois = listerMois(debut);
  const d = premierJour(mois[0]!);
  const [aFin, mFin] = mois[11]!.split('-').map(Number) as [number, number];
  const f = new Date(Date.UTC(aFin, mFin, 1)).toISOString().slice(0, 10);

  const { rows: charges } = await db.query<LigneCharge>(
    `WITH brut AS (
       SELECT s.ressource_id, e.projet_id, to_char(t.jour, 'YYYY-MM') AS mois,
              0::numeric AS reel, t.charge AS planifie
         FROM travail_planifie t
         JOIN assignation s ON s.id = t.assignation_id
         JOIN element e ON e.id = s.activite_id
        WHERE t.jour >= $1::date AND t.jour < $2::date
       UNION ALL
       SELECT s.ressource_id, e.projet_id, to_char(i.jour, 'YYYY-MM'), i.charge, 0::numeric
         FROM imputation i
         JOIN assignation s ON s.id = i.assignation_id
         JOIN element e ON e.id = s.activite_id
        WHERE i.jour >= $1::date AND i.jour < $2::date)
     SELECT b.ressource_id, p.id AS projet_id, p.code, p.nom, b.mois,
            sum(b.reel)::text AS reel, sum(b.planifie)::text AS planifie
       FROM brut b JOIN projet p ON p.id = b.projet_id
      GROUP BY b.ressource_id, p.id, p.code, p.nom, b.mois`,
    [d, f],
  );

  const conditions: string[] = [];
  const params: unknown[] = [[...new Set(charges.map((c) => c.ressource_id))]];
  if (filtre.genre === 'aucune') conditions.push('u.equipe_id IS NULL');
  if (filtre.genre === 'equipe') {
    // Identifiant hors plage : équipe inconnue, sans interroger la base.
    if (filtre.id > MAX_ID) return { mois, ressources: [] };
    params.push(filtre.id);
    conditions.push(`u.equipe_id = $2`);
  }
  const { rows: utilisateurs } = await db.query<{
    id: number;
    nom: string;
    actif: boolean;
    equipe_id: number | null;
    capacite: string;
    calendrier_id: number;
  }>(
    `SELECT u.id, u.nom, u.actif, u.equipe_id, u.capacite::text AS capacite, u.calendrier_id
       FROM utilisateur u
      WHERE ((u.est_ressource AND u.actif) OR u.id = ANY($1::int[]))
        ${conditions.map((c) => `AND ${c}`).join(' ')}`,
    params,
  );

  const { rows: calendriers } = await db.query<{ id: number; jours_travailles: number[] }>(
    'SELECT id, jours_travailles FROM calendrier',
  );
  const { rows: feries } = await db.query<{ calendrier_id: number; jour: string }>(
    `SELECT calendrier_id, to_char(jour, 'YYYY-MM-DD') AS jour FROM calendrier_ferie
      WHERE jour >= $1::date AND jour < $2::date`,
    [d, f],
  );
  const ouvres = new Map<number, number[]>();
  const feriesDe = new Map<number, Set<string>>();
  const travaillesDe = new Map<number, number[]>();
  for (const c of calendriers) {
    const set = new Set(feries.filter((x) => x.calendrier_id === c.id).map((x) => x.jour));
    feriesDe.set(c.id, set);
    travaillesDe.set(c.id, c.jours_travailles);
    ouvres.set(c.id, joursOuvres(mois, c.jours_travailles, set));
  }

  // Absences des ressources lues, dépliées sur les 12 mois seulement (point 24, D-278).
  const dernier = new Date(Date.parse(`${f}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const absencesDe = new Map<number, JourAbsence[]>();
  for (const a of await joursAbsence(
    db,
    utilisateurs.map((u) => u.id),
    d,
    dernier,
  )) {
    absencesDe.set(a.ressource_id, [...(absencesDe.get(a.ressource_id) ?? []), a]);
  }

  // Projets lisibles : administrateur, chef de projet et leader métier lisent tous les projets (D-265).
  const lisibles =
    acteur.role === 'administrateur' || estChef(acteur.role)
      ? null
      : new Set((await projetsVisibles(db, acteur)).map((p) => p.id));

  const parRessource = new Map<number, LigneCharge[]>();
  for (const c of charges) {
    const liste = parRessource.get(c.ressource_id) ?? [];
    liste.push(c);
    parRessource.set(c.ressource_id, liste);
  }

  const ressources: LigneRessource[] = utilisateurs.map((u) => {
    const lignes = parRessource.get(u.id) ?? [];
    const capacite = cents(u.capacite);
    const ouvresU = ouvres.get(u.calendrier_id) ?? mois.map(() => 0);
    const retrait = retraitAbsences(
      mois,
      absencesDe.get(u.id) ?? [],
      capacite,
      travaillesDe.get(u.calendrier_id) ?? [],
      feriesDe.get(u.calendrier_id) ?? new Set(),
    );
    const reelTotal = mois.map(() => 0);
    const planTotal = mois.map(() => 0);
    // Un groupe par projet nommé ; les projets illisibles tombent dans le groupe `null`.
    const groupes = new Map<
      number | null,
      { code: string | null; nom: string | null; reel: number[]; plan: number[] }
    >();
    for (const l of lignes) {
      const i = mois.indexOf(l.mois);
      const cle = lisibles === null || lisibles.has(l.projet_id) ? l.projet_id : null;
      let g = groupes.get(cle);
      if (!g) {
        g = {
          code: cle === null ? null : l.code,
          nom: cle === null ? null : l.nom,
          reel: mois.map(() => 0),
          plan: mois.map(() => 0),
        };
        groupes.set(cle, g);
      }
      g.reel[i]! += cents(l.reel);
      g.plan[i]! += cents(l.planifie);
      reelTotal[i]! += cents(l.reel);
      planTotal[i]! += cents(l.planifie);
    }
    const projets: LigneProjet[] = [...groupes.entries()]
      .map(([id, g]) => ({ id, g }))
      .sort((x, y) => {
        if (x.id === null) return 1;
        if (y.id === null) return -1;
        return comparer(x.g.code!, y.g.code!) || x.id - y.id;
      })
      .map(({ id, g }) => ({
        projet_id: id,
        code: g.code,
        nom: g.nom,
        mois: mois.map((m, i) => ({
          mois: m,
          reel: jours(g.reel[i]!),
          planifie: jours(g.plan[i]!),
          charge: jours(g.reel[i]! + g.plan[i]!),
        })),
      }));
    return {
      ressource_id: u.id,
      nom: u.nom,
      actif: u.actif,
      equipe_id: u.equipe_id,
      mois: mois.map((m, i) => {
        const dispo = ouvresU[i]! * capacite - retrait[i]!;
        const charge = reelTotal[i]! + planTotal[i]!;
        return {
          mois: m,
          disponible: jours(dispo),
          reel: jours(reelTotal[i]!),
          planifie: jours(planTotal[i]!),
          charge: jours(charge),
          ecart: jours(dispo - charge),
        };
      }),
      projets,
    };
  });
  ressources.sort((x, y) => comparer(x.nom, y.nom) || x.ressource_id - y.ressource_id);
  return { mois, ressources };
}
