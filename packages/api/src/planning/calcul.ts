import { calculer, type Entree, type Mode, type Sortie } from '@planersource/engine';
import type { Db } from '../db/erreurs.js';
import { accesProjet, type Acteur } from './projets.js';
import type { Verdict } from './acces.js';

/** Horizon du calcul : D0 + 3 ans (le 29 février devient le 28 février). */
export function horizonDe(d0: string): string {
  const [annee, mois, jour] = d0.split('-') as [string, string, string];
  const j = mois === '02' && jour === '29' ? '28' : jour;
  return `${Number(annee) + 3}-${mois}-${j}`;
}

export interface Ignore {
  id: number;
  motif: 'clos' | 'modele';
}

export interface Selection {
  /** Projets calculés : sélection retenue et sous-projets non clos. */
  effectifs: number[];
  ignores: Ignore[];
}

/**
 * Sélection effective (D-044 2, D-047) : tous les 404 avant les 403 ; 404 si un projet est inconnu ou illisible, 403 s'il est en
 * lecture seule ; un modèle est ignoré avant le contrôle d'écriture, un projet clos après. Les
 * refus sortent avant toute écriture.
 */
export async function selectionner(
  db: Db,
  user: Acteur,
  demandes: number[],
): Promise<Selection | { verdict: Verdict }> {
  const retenus: number[] = [];
  const ignores: Ignore[] = [];
  const acces = [];
  for (const id of new Set(demandes)) {
    const a = await accesProjet(db, user, id);
    if (!a) return { verdict: 'introuvable' };
    acces.push({ id, ...a });
  }
  for (const { id, projet, peutEcrire } of acces) {
    if (projet.est_modele) {
      ignores.push({ id, motif: 'modele' });
      continue;
    }
    if (!peutEcrire) return { verdict: 'interdit' };
    if (projet.clos) ignores.push({ id, motif: 'clos' });
    else retenus.push(id);
  }
  if (retenus.length === 0) return { effectifs: [], ignores };
  const { rows } = await db.query<{ id: number }>(
    `WITH RECURSIVE effectifs (id) AS (
       SELECT id FROM projet WHERE id = ANY($1)
       UNION
       SELECT p.id FROM projet p JOIN effectifs e ON p.parent_id = e.id
        WHERE NOT p.clos AND NOT p.est_modele)
     SELECT id FROM effectifs ORDER BY id`,
    [retenus],
  );
  return { effectifs: rows.map((r) => r.id), ignores };
}

/**
 * Entrées du moteur (D-044 6). Toutes les conversions de numeric en entiers (centièmes) se font en
 * SQL : jamais Number sur un numeric.
 */
async function charger(db: Db, effectifs: number[], d0: string): Promise<Entree> {
  const lire = async <T extends object>(sql: string, params: unknown[] = []): Promise<T[]> =>
    (await db.query<T>(sql, params)).rows;
  const calendriers = await lire<{
    id: number;
    jours: number[];
    feries: string[];
    est_defaut: boolean;
  }>(
    `SELECT c.id, c.jours_travailles::int[] AS jours, c.est_defaut,
            COALESCE((SELECT array_agg(f.jour::text ORDER BY f.jour)
                        FROM calendrier_ferie f WHERE f.calendrier_id = c.id), '{}') AS feries
       FROM calendrier c ORDER BY c.id`,
  );
  const ressources = await lire<{ id: number; capacite: number; calendrier_id: number }>(
    `SELECT id, (capacite * 100)::int AS capacite, calendrier_id
       FROM utilisateur WHERE est_ressource ORDER BY id`,
  );
  const projets = await lire<{
    id: number;
    parent_id: number | null;
    priorite: number;
    date_debut: string;
  }>('SELECT id, parent_id, priorite, date_debut FROM projet WHERE id = ANY($1) ORDER BY id', [
    effectifs,
  ]);
  const affectations = await lire<{
    projet_id: number;
    ressource_id: number;
    taux: number;
    date_debut: string | null;
    date_fin: string | null;
  }>(
    `SELECT projet_id, ressource_id, (taux * 100)::int AS taux, date_debut, date_fin
       FROM affectation_projet WHERE projet_id = ANY($1) ORDER BY id`,
    [effectifs],
  );
  const elements = await lire<{
    id: number;
    projet_id: number;
    type: 'activite' | 'jalon';
    parent_id: number | null;
    rang: number;
    mode: Mode | null;
    priorite: number | null;
    close: boolean | null;
    debut_valide: string | null;
    fin_valide: string | null;
    duree_validee: number | null;
    nature: 'flottant' | 'fixe' | null;
    date_validee: string | null;
  }>(
    `SELECT e.id, e.projet_id, e.type, e.parent_id, e.rang,
            a.mode, a.priorite, a.close, a.debut_valide, a.fin_valide, a.duree_validee,
            j.type AS nature, j.date_validee
       FROM element e LEFT JOIN activite a ON a.id = e.id LEFT JOIN jalon j ON j.id = e.id
      WHERE e.projet_id = ANY($1) ORDER BY e.id`,
    [effectifs],
  );
  const dependances = await lire<{
    predecesseur_id: number;
    successeur_id: number;
    type: 'FD' | 'DD' | 'FF';
    delai: number;
  }>(
    `SELECT predecesseur_id, successeur_id, type, delai
       FROM dependance WHERE projet_id = ANY($1) ORDER BY id`,
    [effectifs],
  );
  const assignations = await lire<{
    id: number;
    activite_id: number;
    ressource_id: number;
    taux: number;
    charge: number;
    charge_reelle: number;
    reste: number;
  }>(
    `SELECT id, activite_id, ressource_id, (taux * 100)::int AS taux,
            (charge_assignee * 100)::int AS charge, (charge_reelle * 100)::int AS charge_reelle,
            (reste_a_faire * 100)::int AS reste
       FROM assignation WHERE projet_id = ANY($1) ORDER BY id`,
    [effectifs],
  );
  // Travail externe : planifié et réel (imputations, D-118 (10)) des assignations des autres projets.
  const externe = await lire<{ ressource_id: number; jour: string; charge: number }>(
    `SELECT s.ressource_id, t.jour::text AS jour, (t.charge * 100)::int AS charge
       FROM travail_planifie t JOIN assignation s ON s.id = t.assignation_id
      WHERE NOT (s.projet_id = ANY($1))
      UNION ALL
     SELECT s.ressource_id, i.jour::text, (i.charge * 100)::int
       FROM imputation i JOIN assignation s ON s.id = i.assignation_id
      WHERE NOT (s.projet_id = ANY($1))`,
    [effectifs],
  );
  // Travail réel (D-118 (10)) : toutes les imputations des assignations des projets lus, quel que soit
  // le statut de la feuille.
  const reel = await lire<{ assignation_id: number; jour: string; charge: number }>(
    `SELECT i.assignation_id, i.jour::text AS jour, (i.charge * 100)::int AS charge
       FROM imputation i JOIN assignation s ON s.id = i.assignation_id
      WHERE s.projet_id = ANY($1) ORDER BY i.assignation_id, i.jour`,
    [effectifs],
  );
  const saisies = await lire<{ assignation_id: number; jour: string; demi_journee: string }>(
    `SELECT s.assignation_id, s.jour::text AS jour, s.demi_journee
       FROM saisie_manuelle s JOIN assignation a ON a.id = s.assignation_id
      WHERE a.projet_id = ANY($1)
      ORDER BY s.assignation_id, s.jour, s.demi_journee`,
    [effectifs],
  );

  return {
    d0,
    horizon: horizonDe(d0),
    calendriers: calendriers.map((c) => ({ id: c.id, joursTravailles: c.jours, feries: c.feries })),
    calendrierDefautId: calendriers.find((c) => c.est_defaut)!.id,
    ressources: ressources.map((r) => ({
      id: r.id,
      capacite: r.capacite,
      calendrierId: r.calendrier_id,
    })),
    projets: projets.map((p) => ({
      id: p.id,
      parentId: p.parent_id,
      priorite: p.priorite,
      debut: p.date_debut,
      affectations: affectations
        .filter((a) => a.projet_id === p.id)
        .map((a) => ({
          ressourceId: a.ressource_id,
          taux: a.taux,
          ...(a.date_debut ? { debut: a.date_debut } : {}),
          ...(a.date_fin ? { fin: a.date_fin } : {}),
        })),
    })),
    elements: elements.map((e) =>
      e.type === 'activite'
        ? {
            type: 'activite' as const,
            id: e.id,
            projetId: e.projet_id,
            parentId: e.parent_id,
            rang: e.rang,
            mode: e.mode!,
            priorite: e.priorite!,
            close: e.close!,
            ...(e.debut_valide ? { debutValide: e.debut_valide } : {}),
            ...(e.fin_valide ? { finValide: e.fin_valide } : {}),
            ...(e.duree_validee !== null ? { dureeValidee: e.duree_validee } : {}),
          }
        : {
            type: 'jalon' as const,
            id: e.id,
            projetId: e.projet_id,
            parentId: e.parent_id,
            rang: e.rang,
            nature: e.nature!,
            ...(e.date_validee ? { dateValidee: e.date_validee } : {}),
          },
    ),
    dependances: dependances.map((d) => ({
      predecesseurId: d.predecesseur_id,
      successeurId: d.successeur_id,
      type: d.type,
      delai: d.delai,
    })),
    assignations: assignations.map((a) => ({
      id: a.id,
      activiteId: a.activite_id,
      ressourceId: a.ressource_id,
      taux: a.taux,
      charge: a.charge,
      chargeReelle: a.charge_reelle,
      resteAFaire: a.reste,
    })),
    travailReel: reel.map((t) => ({
      assignationId: t.assignation_id,
      jour: t.jour,
      charge: t.charge,
    })),
    travailExterne: externe.map((t) => ({
      ressourceId: t.ressource_id,
      jour: t.jour,
      charge: t.charge,
    })),
    saisies: saisies.map((x) => ({
      assignationId: x.assignation_id,
      jour: x.jour,
      demiJournee: x.demi_journee as 'matin' | 'apres_midi',
      charge: 50,
    })),
  };
}

/** Écriture des résultats (D-044 7) : purge, insertion et mises à jour en bloc ; rien n'est historisé. */
async function ecrire(db: Db, effectifs: number[], sortie: Sortie): Promise<void> {
  await db.query(
    `DELETE FROM travail_planifie
      WHERE assignation_id IN (SELECT id FROM assignation WHERE projet_id = ANY($1))`,
    [effectifs],
  );
  const t = sortie.travail;
  if (t.length > 0) {
    await db.query(
      `INSERT INTO travail_planifie (assignation_id, jour, charge, surcharge)
       SELECT u.a, u.j::date, u.c::numeric / 100, u.s > 0
         FROM unnest($1::int[], $2::text[], $3::int[], $4::int[]) AS u(a, j, c, s)`,
      [
        t.map((x) => x.assignationId),
        t.map((x) => x.jour),
        t.map((x) => x.charge),
        t.map((x) => x.surcharge),
      ],
    );
  }
  const a = sortie.activites;
  if (a.length > 0) {
    await db.query(
      `UPDATE activite SET debut_planifie = u.d::date, fin_planifiee = u.f::date,
              drapeaux = string_to_array(u.dr, ',')
         FROM unnest($1::int[], $2::text[], $3::text[], $4::text[]) AS u(id, d, f, dr)
        WHERE activite.id = u.id`,
      [
        a.map((x) => x.id),
        a.map((x) => x.debut),
        a.map((x) => x.fin),
        a.map((x) => x.drapeaux.join(',')),
      ],
    );
  }
  const j = sortie.jalons;
  if (j.length > 0) {
    await db.query(
      `UPDATE jalon SET date_planifiee = u.d::date, drapeaux = string_to_array(u.dr, ',')
         FROM unnest($1::int[], $2::text[], $3::text[]) AS u(id, d, dr)
        WHERE jalon.id = u.id`,
      [j.map((x) => x.id), j.map((x) => x.date), j.map((x) => x.drapeaux.join(','))],
    );
  }
  const d = sortie.dependances;
  if (d.length > 0) {
    await db.query(
      `UPDATE dependance SET drapeaux = string_to_array(u.dr, ',')
         FROM unnest($1::int[], $2::int[], $3::text[]) AS u(p, s, dr)
        WHERE dependance.predecesseur_id = u.p AND dependance.successeur_id = u.s
          AND dependance.projet_id = ANY($4)`,
      [
        d.map((x) => x.predecesseurId),
        d.map((x) => x.successeurId),
        d.map((x) => x.drapeaux.join(',')),
        effectifs,
      ],
    );
  }
  const r = sortie.assignations;
  if (r.length > 0) {
    // reste à faire des seules feuilles MAN ouvertes, sans historique (D-058 6)
    await db.query(
      `UPDATE assignation s SET reste_a_faire = u.reste::numeric / 100
         FROM unnest($1::int[], $2::int[]) AS u(id, reste), activite a
        WHERE s.id = u.id AND s.projet_id = ANY($3)
          AND a.id = s.activite_id AND a.mode = 'MAN' AND NOT a.close`,
      [r.map((x) => x.id), r.map((x) => x.reste), effectifs],
    );
  }
  const p = sortie.projets;
  await db.query(
    `UPDATE projet SET debut_planifie = u.d::date, fin_planifiee = u.f::date
       FROM unnest($1::int[], $2::text[], $3::text[]) AS u(id, d, f)
      WHERE projet.id = u.id`,
    [p.map((x) => x.id), p.map((x) => x.debut), p.map((x) => x.fin)],
  );
}

export interface Reponse {
  d0: string;
  horizon: string;
  projets: number[];
  ignores: Ignore[];
  lignes: number;
  avertissements: { code: string; assignation_id: number | null; reste: number | null }[];
}

export async function lancerCalcul(
  db: Db,
  user: Acteur,
  demandes: number[],
  d0: string,
): Promise<Reponse | { verdict: Verdict }> {
  const selection = await selectionner(db, user, demandes);
  if ('verdict' in selection) return selection;
  const reponse = {
    d0,
    horizon: horizonDe(d0),
    projets: selection.effectifs,
    ignores: selection.ignores,
  };
  if (selection.effectifs.length === 0) return { ...reponse, lignes: 0, avertissements: [] };
  const sortie = calculer(await charger(db, selection.effectifs, d0));
  await ecrire(db, selection.effectifs, sortie);
  return {
    ...reponse,
    lignes: sortie.travail.length,
    avertissements: sortie.avertissements.map((w) => ({
      code: w.code,
      assignation_id: w.assignationId ?? null,
      reste: w.reste === undefined ? null : w.reste / 100,
    })),
  };
}
