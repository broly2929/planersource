import type { Db } from '../db/erreurs.js';
import { creerAffectation, estRessourceActive, lireAffectations } from './affectations.js';
import { creerAssignation, lireAssignations } from './assignations.js';
import { creerDependance, lireDependances } from './dependances.js';
import { creerActivite, creerJalon, lireActivites, lireJalons, lirePlanning } from './elements.js';
import { creerProjet, type Projet } from './projets.js';

export interface OptionsCopie {
  nom: string;
  code: string;
  date_debut: string;
  sous_projets: boolean;
  affectations: boolean;
  est_modele: boolean;
}

const JOUR = 86_400_000;

/** Écart en jours calendaires entre deux dates AAAA-MM-JJ. */
const ecart = (de: string, a: string): number =>
  Math.round((Date.parse(a) - Date.parse(de)) / JOUR);

/** Une date validée décalée dépasse le 31/12/2099 : la copie est refusée (D-056 R3, D-058 7). */
export class DateApres2099 extends Error {}

/** Date décalée de `delta` jours calendaires ; une date vide reste vide. */
function decaler(date: string | null, delta: number): string | null {
  if (date === null) return null;
  return new Date(Date.parse(date) + delta * JOUR).toISOString().slice(0, 10);
}

/** Date validée décalée, bornée au 31/12/2099. */
function decalerValidee(date: string | null, delta: number): string | null {
  const d = decaler(date, delta);
  if (d !== null && d > '2099-12-31') throw new DateApres2099();
  return d;
}

interface Contexte {
  db: Db;
  par: number;
  options: OptionsCopie;
  delta: number;
}

/** Copie un projet (sans ses sous-projets) : le projet, son WBS, ses dépendances, ses affectations. */
async function copierContenu(
  c: Contexte,
  source: Projet,
  cible: Projet,
  copiees: Set<number>,
): Promise<void> {
  const { db, par, delta } = c;
  const activites = new Map((await lireActivites(db, source.id)).map((a) => [a.id, a]));
  const jalons = new Map((await lireJalons(db, source.id)).map((j) => [j.id, j]));
  // Parcours en profondeur : un parent est toujours créé avant ses enfants ; le rang source est conservé.
  const nouveaux = new Map<number, number>();
  for (const ligne of await lirePlanning(db, source.id, false)) {
    const parent = ligne.parent_id === null ? null : (nouveaux.get(ligne.parent_id) ?? null);
    const a = activites.get(ligne.id);
    const j = jalons.get(ligne.id);
    if (a) {
      const creee = await creerActivite(db, par, cible.id, {
        nom: a.nom,
        parent_id: parent,
        rang: a.rang,
        mode: a.mode,
        priorite: a.priorite,
        debut_valide: decalerValidee(a.debut_valide, delta),
        fin_valide: decalerValidee(a.fin_valide, delta),
        duree_validee: a.duree_validee,
        charge_vendue: a.charge_vendue,
        otp: a.otp,
      });
      nouveaux.set(a.id, creee.id);
    } else if (j) {
      const cree = await creerJalon(db, par, cible.id, {
        nom: j.nom,
        parent_id: parent,
        rang: j.rang,
        type: j.type,
        date_validee: decalerValidee(j.date_validee, delta),
        date_client: decalerValidee(j.date_client, delta),
      });
      nouveaux.set(j.id, cree.id);
    }
  }
  // Les deux extrémités d'une dépendance sont dans le même projet, donc dans la copie.
  for (const d of await lireDependances(db, source.id)) {
    await creerDependance(db, par, cible.id, {
      predecesseur_id: nouveaux.get(d.predecesseur_id)!,
      successeur_id: nouveaux.get(d.successeur_id)!,
      type: d.type,
      delai: d.delai,
    });
  }
  if (!c.options.affectations) return;
  for (const aff of await lireAffectations(db, source.id)) {
    if (!(await estRessourceActive(db, aff.ressource_id))) continue;
    await creerAffectation(db, par, {
      projet_id: cible.id,
      ressource_id: aff.ressource_id,
      taux: aff.taux,
      date_debut: decaler(aff.date_debut, delta),
      date_fin: decaler(aff.date_fin, delta),
    });
    copiees.add(aff.ressource_id);
  }
  for (const s of await lireAssignations(db, source.id)) {
    if (!copiees.has(s.ressource_id)) continue;
    await creerAssignation(db, par, nouveaux.get(s.activite_id)!, cible.id, {
      ressource_id: s.ressource_id,
      taux: s.taux,
      charge_assignee: s.charge_assignee,
    });
  }
}

async function copierArbre(
  c: Contexte,
  source: Projet,
  parentCopie: number | null,
  code: string,
  nom: string,
): Promise<Projet> {
  const cible = await creerProjet(c.db, c.par, {
    code,
    nom,
    parent_id: parentCopie,
    priorite: source.priorite,
    chef_id: c.par,
    date_debut: decaler(source.date_debut, c.delta)!,
    est_modele: c.options.est_modele,
    otp: source.otp,
  });
  await copierContenu(c, source, cible, new Set());
  if (c.options.sous_projets) {
    const { rows } = await c.db.query<Projet>(
      `SELECT id, code, nom, parent_id, est_modele, priorite, chef_id, date_debut, clos, otp
         FROM projet WHERE parent_id = $1 ORDER BY id`,
      [source.id],
    );
    for (const enfant of rows) {
      await copierArbre(c, enfant, cible.id, `${c.options.code}-${enfant.code}`, enfant.nom);
    }
  }
  return cible;
}

/**
 * Copie de projet (SPEC §11.2, D-039). Sans transaction interne : l'appelant l'ouvre (tout ou
 * rien). La copie est un projet racine dont le chef est `par` ; chaque entité créée a son entrée
 * d'historique de création, par les fonctions de création existantes.
 */
export function copierProjet(
  db: Db,
  par: number,
  source: Projet,
  options: OptionsCopie,
): Promise<Projet> {
  const c: Contexte = { db, par, options, delta: ecart(source.date_debut, options.date_debut) };
  return copierArbre(c, source, null, options.code, options.nom);
}
