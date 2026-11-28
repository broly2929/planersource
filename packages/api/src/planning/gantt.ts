import type { Db } from '../db/erreurs.js';
import { WBS_CTE } from './elements.js';
import { champsActivite, champsJalon, lireVendu } from './vendu.js';
import { champsCout, lireCouts, type Cout } from './couts.js';
import { lireOtpActivites, type Herite } from './otp.js';
import { projetsVisibles, voitFinances, voitNotes, type Acteur, type Projet } from './projets.js';

/** Lecture du Gantt d'un projet (SPEC §6, lot 3a, D-065). Aucune écriture. */

/** Assignation d'une feuille, lue par la colonne Ressources (D-238 (a)). */
interface Assignation {
  id: number;
  ressource_id: number;
  nom: string;
  initiales: string | null;
  charge_assignee: number;
  taux: number;
}

interface LigneElement {
  id: number;
  type: 'activite' | 'jalon';
  parent_id: number | null;
  rang: number;
  wbs: string;
  nom: string;
  drapeaux: string[];
  mode: string | null;
  priorite: number | null;
  debut_valide: string | null;
  fin_valide: string | null;
  duree_validee: number | null;
  debut_planifie: string | null;
  fin_planifiee: string | null;
  close: boolean | null;
  est_parent: boolean;
  charge_vendue: number | null;
  notes: string | null;
  charge_assignee: number;
  charge_reelle: number;
  reste_a_faire: number;
  avancement: number | null;
  initiales: string[];
  assignations: Assignation[];
  type_jalon: string | null;
  date_validee: string | null;
  date_planifiee: string | null;
  date_client: string | null;
}

/**
 * Éléments dans l'ordre WBS. Charges d'une feuille : sommes de ses assignations ; d'un parent :
 * sommes de ses feuilles descendantes (SPEC 5.8). Avancement = réel ÷ (réel + reste) × 100,
 * arrondi à 2 décimales, null si réel + reste = 0. Tout est calculé ici, rien n'est stocké.
 */
const ELEMENTS = `WITH RECURSIVE ${WBS_CTE},
  lignee (racine, descendant) AS (
    SELECT id, id FROM element WHERE projet_id = $1
    UNION ALL
    SELECT l.racine, e.id FROM lignee l JOIN element e ON e.parent_id = l.descendant
  ),
  charges AS (
    SELECT l.racine AS id, sum(s.charge_assignee) AS assignee, sum(s.charge_reelle) AS reelle,
           sum(s.reste_a_faire) AS reste
      FROM lignee l
      JOIN assignation s ON s.activite_id = l.descendant
     WHERE NOT EXISTS (SELECT 1 FROM element f WHERE f.parent_id = l.descendant)
     GROUP BY l.racine
  )
  SELECT a.id, a.type, a.parent_id, a.rang, a.wbs, a.nom,
         COALESCE(act.drapeaux, j.drapeaux) AS drapeaux,
         act.mode, act.priorite, act.debut_valide, act.fin_valide, act.duree_validee,
         act.debut_planifie, act.fin_planifiee, act.close,
         EXISTS (SELECT 1 FROM element f WHERE f.parent_id = a.id) AS est_parent,
         act.charge_vendue, act.notes,
         COALESCE(c.assignee, 0) AS charge_assignee,
         COALESCE(c.reelle, 0) AS charge_reelle,
         COALESCE(c.reste, 0) AS reste_a_faire,
         CASE WHEN COALESCE(c.reelle, 0) + COALESCE(c.reste, 0) = 0 THEN NULL
              ELSE round(c.reelle * 100 / (c.reelle + c.reste), 2) END AS avancement,
         ARRAY(SELECT u.initiales FROM assignation s
                 JOIN utilisateur u ON u.id = s.ressource_id
                WHERE s.activite_id = a.id AND u.initiales IS NOT NULL
                ORDER BY s.id) AS initiales,
         ARRAY(SELECT jsonb_build_object('id', s.id, 'ressource_id', s.ressource_id, 'nom', u.nom,
                                         'initiales', u.initiales,
                                         'charge_assignee', s.charge_assignee::float8,
                                         'taux', s.taux::float8)
                 FROM assignation s JOIN utilisateur u ON u.id = s.ressource_id
                WHERE s.activite_id = a.id
                ORDER BY lower(u.nom), s.id) AS assignations,
         j.type AS type_jalon, j.date_validee, j.date_planifiee, j.date_client
    FROM arbre a
    LEFT JOIN activite act ON act.id = a.id
    LEFT JOIN jalon j ON j.id = a.id
    LEFT JOIN charges c ON c.id = a.id
   ORDER BY a.chemin`;

function forme(
  l: LigneElement,
  peutEcrire: boolean,
  vendu: Map<number, { charge_vendue: number | null; marge: number | null }> | null,
  couts: Map<number, Cout> | null,
  otp: Map<number, Herite>,
  notes: boolean,
): Record<string, unknown> {
  const commun = {
    id: l.id,
    type: l.type,
    parent_id: l.parent_id,
    rang: l.rang,
    wbs: l.wbs,
    nom: l.nom,
    drapeaux: l.drapeaux,
  };
  if (l.type === 'jalon') {
    return {
      ...commun,
      type_jalon: l.type_jalon,
      date_validee: l.date_validee,
      date_planifiee: l.date_planifiee,
      ...(peutEcrire ? champsJalon(l) : {}),
    };
  }
  return {
    ...commun,
    mode: l.mode,
    priorite: l.priorite,
    debut_valide: l.debut_valide,
    fin_valide: l.fin_valide,
    duree_validee: l.duree_validee,
    debut_planifie: l.debut_planifie,
    fin_planifiee: l.fin_planifiee,
    close: l.close,
    est_parent: l.est_parent,
    charge_assignee: l.charge_assignee,
    charge_reelle: l.charge_reelle,
    reste_a_faire: l.reste_a_faire,
    avancement: l.avancement,
    ...(notes ? { notes: l.notes } : {}),
    ...(vendu ? champsActivite(vendu, l.id) : {}),
    otp_effectif: otp.get(l.id)?.otp_effectif ?? null,
    otp_source: otp.get(l.id)?.otp_source ?? null,
    ...(couts
      ? champsCout(couts.get(l.id) ?? { planifie: 0, impute: 0, reel: 0, taux_manquant: false })
      : {}),
    ...(l.est_parent ? {} : { initiales: l.initiales, assignations: l.assignations }),
  };
}

/**
 * Totaux du projet (D-149 (5), D-150 (2)) : feuilles du projet seul, closes comprises. Vendu et marge :
 * feuilles renseignées seulement ; assignée et réelle : toutes les feuilles.
 */
function totaux(elements: LigneElement[], finances: boolean) {
  const feuilles = elements.filter((e) => e.type === 'activite' && !e.est_parent);
  const renseignees = feuilles.filter((e) => e.charge_vendue !== null);
  const somme = (valeurs: number[]) => Math.round(valeurs.reduce((a, b) => a + b, 0) * 100) / 100;
  const charges = {
    charge_assignee: somme(feuilles.map((e) => e.charge_assignee)),
    charge_reelle: somme(feuilles.map((e) => e.charge_reelle)),
  };
  // D-265 (3) : vente et marge sous `voit_finances`, assignée et réelle sous `peut_ecrire`.
  if (!finances) return charges;
  return {
    charge_vendue: renseignees.length ? somme(renseignees.map((e) => e.charge_vendue!)) : null,
    charge_assignee: charges.charge_assignee,
    marge: renseignees.length
      ? somme(renseignees.map((e) => e.charge_vendue! - e.charge_assignee))
      : null,
    charge_reelle: charges.charge_reelle,
  };
}

export async function lireGantt(
  db: Db,
  user: Acteur,
  projet: Projet,
  peutEcrire: boolean,
  jour: string,
) {
  const { rows: dates } = await db.query<{
    debut_planifie: string | null;
    fin_planifiee: string | null;
  }>('SELECT debut_planifie, fin_planifiee FROM projet WHERE id = $1', [projet.id]);
  const { rows: elements } = await db.query<LigneElement>(ELEMENTS, [projet.id]);
  // D-149 (4), D-265 (3) : vente et marge sous `voit_finances` ; date client sous `peut_ecrire`.
  const finances = voitFinances(user, peutEcrire);
  const vendu = finances ? await lireVendu(db, projet.id) : null;
  // D-229, D-265 (3) : coûts sous `voit_finances` ; OTP effectif pour tout lecteur.
  const couts = finances ? await lireCouts(db, projet.id, jour) : null;
  const otp = await lireOtpActivites(db, user, projet.id);
  const { rows: dependances } = await db.query(
    `SELECT id, predecesseur_id, successeur_id, type, delai, drapeaux
       FROM dependance WHERE projet_id = $1 ORDER BY id`,
    [projet.id],
  );
  const lisibles = (await projetsVisibles(db, user))
    .filter((p) => p.parent_id === projet.id)
    .map((p) => p.id);
  const { rows: sousProjets } = await db.query(
    `SELECT id, code, nom, debut_planifie, fin_planifiee, clos
       FROM projet WHERE id = ANY($1) ORDER BY id`,
    [lisibles],
  );
  return {
    projet: {
      id: projet.id,
      code: projet.code,
      nom: projet.nom,
      date_debut: projet.date_debut,
      debut_planifie: dates[0]!.debut_planifie,
      fin_planifiee: dates[0]!.fin_planifiee,
      clos: projet.clos,
      peut_ecrire: peutEcrire,
      ...(peutEcrire
        ? {
            totaux: { ...totaux(elements, finances), ...(couts ? champsCout(couts.projet) : {}) },
          }
        : {}),
    },
    elements: elements.map((l) =>
      forme(l, peutEcrire, vendu, couts?.activites ?? null, otp, voitNotes(user)),
    ),
    dependances,
    sous_projets: sousProjets,
  };
}
