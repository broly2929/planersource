import type { Db } from '../db/erreurs.js';
import { enregistrer } from './historique.js';
import type { Acteur } from './projets.js';

/** Lot 4a, D-118 et D-119 : feuilles de temps, imputations, cycle de validation. */

export type Statut = 'brouillon' | 'soumise' | 'validee' | 'rejetee';
export type Verbe = 'soumettre' | 'rappeler' | 'valider' | 'rejeter' | 'devalider';

export interface Imputation {
  jour: string;
  charge: number;
}

export interface LigneEnvoyee {
  assignation_id: number;
  imputations: Imputation[];
  reste?: number | undefined;
}

export interface Vue {
  feuille: {
    id: number | null;
    ressource_id: number;
    semaine: string;
    statut: Statut;
    commentaire: string | null;
    validations: { projet_id: number; validateur_id: number; date: string }[];
  };
  lignes: {
    assignation_id: number;
    projet_id: number;
    projet_code: string;
    activite_id: number;
    activite_nom: string;
    wbs: string;
    assignee: number;
    reel_cumule: number;
    reste: number;
    modifiable: boolean;
    imputations: Imputation[];
  }[];
  jours: { jour: string; capacite: number; total: number; depassement: boolean }[];
}

export type Refus = { code: string; erreur: string };
export type Introuvable = { verdict: 'introuvable' | 'interdit' };

const MESSAGES: Record<string, string> = {
  assignation_invalide: 'Assignation invalide',
  ligne_fermee: 'Ligne fermée',
  jour_futur: 'Jour futur',
  feuille_verrouillee: 'Feuille verrouillée',
  feuille_vide: 'Feuille vide',
  deja_validee: 'Feuille déjà validée en partie',
  statut_invalide: 'Statut invalide',
};
const refus = (code: keyof typeof MESSAGES | string): Refus => ({
  code,
  erreur: MESSAGES[code] ?? code,
});

const resteSeul = (id: number, centiemes: number): { id: number; reste_a_faire: number } => ({
  id,
  reste_a_faire: centiemes / 100,
});

const cs = (x: number): number => Math.round(x * 100);

/** Jour 'AAAA-MM-JJ' décalé de n jours (calcul en UTC, sans fuseau). */
export function ajouter(jour: string, n: number): string {
  const [a, m, j] = jour.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, j + n)).toISOString().slice(0, 10);
}

/** Un lundi réel, année 2000 à 2099 (D-118 (3)). */
export function lundiValide(s: unknown): s is string {
  if (typeof s !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && d.getUTCDay() === 1;
}

/** Projets où l'utilisateur écrit : 'tous' (administrateur), ou ses projets et leurs sous-projets. */
export async function projetsEcrits(db: Db, user: Acteur): Promise<number[] | 'tous'> {
  if (user.role === 'administrateur') return 'tous';
  if (user.role !== 'chef_de_projet') return [];
  const { rows } = await db.query<{ id: number }>(
    `WITH RECURSIVE portee (id) AS (
       SELECT id FROM projet WHERE chef_id = $1 AND NOT est_modele
       UNION
       SELECT p.id FROM projet p JOIN portee ON p.parent_id = portee.id)
     SELECT id FROM portee`,
    [user.id],
  );
  return rows.map((r) => r.id);
}

const ecrit = (ecrits: number[] | 'tous', projetId: number): boolean =>
  ecrits === 'tous' || ecrits.includes(projetId);

interface LigneBase {
  assignation_id: number;
  projet_id: number;
  projet_code: string;
  activite_id: number;
  activite_nom: string;
  wbs: string;
  assignee: number;
  reel_cumule: number;
  reste: number;
  ouverte: boolean;
  avec_imputation: boolean;
}

/**
 * Lignes d'une feuille (D-118 (4)) : assignations ouvertes de la ressource, plus celles qui portent
 * une imputation dans la semaine. Triées par code de projet sans casse, puis ordre WBS.
 */
async function lignesBase(db: Db, ressourceId: number, lundi: string): Promise<LigneBase[]> {
  const { rows } = await db.query<LigneBase>(
    `WITH RECURSIVE
       mes AS (SELECT DISTINCT projet_id FROM assignation WHERE ressource_id = $1),
       chaine (projet_id, ancetre_id) AS (
         SELECT projet_id, projet_id FROM mes
         UNION
         SELECT c.projet_id, p.parent_id FROM chaine c JOIN projet p ON p.id = c.ancetre_id
          WHERE p.parent_id IS NOT NULL),
       ferme AS (
         SELECT c.projet_id, bool_or(p.clos OR p.est_modele) AS ferme
           FROM chaine c JOIN projet p ON p.id = c.ancetre_id GROUP BY c.projet_id),
       classes AS (
         SELECT id, parent_id, projet_id,
                row_number() OVER (PARTITION BY projet_id, parent_id ORDER BY rang) AS pos
           FROM element WHERE projet_id IN (SELECT projet_id FROM mes)),
       arbre AS (
         SELECT id, projet_id, pos::text AS wbs, lpad(pos::text, 9, '0') AS chemin
           FROM classes WHERE parent_id IS NULL
         UNION ALL
         SELECT c.id, c.projet_id, a.wbs || '.' || c.pos, a.chemin || '.' || lpad(c.pos::text, 9, '0')
           FROM classes c JOIN arbre a ON c.parent_id = a.id)
     SELECT s.id AS assignation_id, s.projet_id, p.code AS projet_code, s.activite_id,
            e.nom AS activite_nom, w.wbs, s.charge_assignee AS assignee,
            s.charge_reelle AS reel_cumule, s.reste_a_faire AS reste,
            (NOT act.close AND NOT f.ferme) AS ouverte,
            EXISTS (SELECT 1 FROM imputation i
                     WHERE i.assignation_id = s.id AND i.jour BETWEEN $2::date AND $2::date + 6)
              AS avec_imputation
       FROM assignation s
       JOIN projet p ON p.id = s.projet_id
       JOIN element e ON e.id = s.activite_id
       JOIN activite act ON act.id = s.activite_id
       JOIN ferme f ON f.projet_id = s.projet_id
       JOIN arbre w ON w.id = s.activite_id
      WHERE s.ressource_id = $1
      ORDER BY lower(p.code), w.chemin`,
    [ressourceId, lundi],
  );
  return rows.filter((l) => l.ouverte || l.avec_imputation);
}

async function imputationsSemaine(
  db: Db,
  assignationIds: number[],
  lundi: string,
): Promise<Map<number, Imputation[]>> {
  const { rows } = await db.query<{ assignation_id: number; jour: string; charge: number }>(
    `SELECT assignation_id, jour::text AS jour, charge FROM imputation
      WHERE assignation_id = ANY($1) AND jour BETWEEN $2::date AND $2::date + 6
      ORDER BY assignation_id, jour`,
    [assignationIds, lundi],
  );
  const m = new Map<number, Imputation[]>();
  for (const r of rows) {
    const l = m.get(r.assignation_id) ?? [];
    l.push({ jour: r.jour, charge: r.charge });
    m.set(r.assignation_id, l);
  }
  return m;
}

/** Construit la réponse : lignes filtrées sur `visibles` (null = toutes), jours sur ces lignes (D-119 (7)). */
async function vue(
  db: Db,
  ressourceId: number,
  lundi: string,
  visibles: number[] | 'tous',
): Promise<Vue> {
  const { rows: fs } = await db.query<{ id: number; statut: Statut; commentaire: string | null }>(
    'SELECT id, statut, commentaire FROM feuille_temps WHERE ressource_id = $1 AND lundi = $2::date',
    [ressourceId, lundi],
  );
  const f = fs[0];
  const validations = f
    ? (
        await db.query<{ projet_id: number; validateur_id: number; date: string }>(
          `SELECT projet_id, validateur_id, date::text AS date FROM validation_feuille
            WHERE feuille_id = $1 ORDER BY projet_id`,
          [f.id],
        )
      ).rows
    : [];
  const toutes = await lignesBase(db, ressourceId, lundi);
  const base = toutes.filter((l) => ecrit(visibles, l.projet_id));
  const imps = await imputationsSemaine(
    db,
    base.map((l) => l.assignation_id),
    lundi,
  );
  const { rows: us } = await db.query<{ capacite: number; jours: number[] }>(
    `SELECT u.capacite, c.jours_travailles::int[] AS jours
       FROM utilisateur u JOIN calendrier c ON c.id = u.calendrier_id WHERE u.id = $1`,
    [ressourceId],
  );
  const { rows: feries } = await db.query<{ jour: string }>(
    `SELECT f.jour::text AS jour FROM calendrier_ferie f
       JOIN utilisateur u ON u.calendrier_id = f.calendrier_id
      WHERE u.id = $1 AND f.jour BETWEEN $2::date AND $2::date + 6`,
    [ressourceId, lundi],
  );
  const chome = new Set(feries.map((x) => x.jour));
  const capacite = cs(us[0]!.capacite);
  const jours = [0, 1, 2, 3, 4, 5, 6].map((k) => {
    const jour = ajouter(lundi, k);
    const iso = k + 1;
    const cap = us[0]!.jours.includes(iso) && !chome.has(jour) ? capacite : 0;
    let total = 0;
    for (const l of base) {
      for (const i of imps.get(l.assignation_id) ?? []) if (i.jour === jour) total += cs(i.charge);
    }
    return { jour, capacite: cap / 100, total: total / 100, depassement: total > cap };
  });
  return {
    feuille: {
      id: f?.id ?? null,
      ressource_id: ressourceId,
      semaine: lundi,
      statut: f?.statut ?? 'brouillon',
      commentaire: f?.commentaire ?? null,
      validations,
    },
    lignes: base.map(({ ouverte, avec_imputation: _a, ...l }) => ({
      ...l,
      modifiable: ouverte,
      imputations: imps.get(l.assignation_id) ?? [],
    })),
    jours,
  };
}

/** Existence de la ressource ; sinon 404 (D-119 (4)). */
async function existe(db: Db, id: number): Promise<boolean> {
  const { rows } = await db.query('SELECT 1 FROM utilisateur WHERE id = $1', [id]);
  return rows.length > 0;
}

/** GET (D-118 (5)) : feuille d'autrui visible à l'administrateur et à qui écrit sur un de ses projets. */
export async function lireFeuille(
  db: Db,
  user: Acteur,
  lundi: string,
  ressourceId?: number,
): Promise<Vue | Introuvable> {
  const cible = ressourceId ?? user.id;
  if (!(await existe(db, cible))) return { verdict: 'introuvable' };
  if (cible === user.id) return vue(db, cible, lundi, 'tous');
  const ecrits = await projetsEcrits(db, user);
  if (ecrits !== 'tous') {
    const lignes = await lignesBase(db, cible, lundi);
    if (!lignes.some((l) => ecrit(ecrits, l.projet_id))) return { verdict: 'introuvable' };
  }
  return vue(db, cible, lundi, ecrits);
}

/** PUT (D-118 (6), (7), D-119, D-181 (2)) : la ressource écrit sa feuille ; l'administrateur écrit celle d'autrui. */
export async function ecrireFeuille(
  db: Db,
  user: Acteur,
  lundi: string,
  lignes: LigneEnvoyee[],
  aujourdhui: string,
  ressourceId?: number,
): Promise<Vue | Refus | Introuvable> {
  const cible = ressourceId ?? user.id;
  if (cible !== user.id) {
    // ordre D-181 (2) : 404 (inconnue ou invisible), puis 403 ; les 422 viennent ensuite
    const lue = await lireFeuille(db, user, lundi, cible);
    if ('verdict' in lue) return lue;
    if (user.role !== 'administrateur') return { verdict: 'interdit' };
  }
  const ids = lignes.map((l) => l.assignation_id).sort((a, b) => a - b);
  const { rows: fs } = await db.query<{ id: number; statut: Statut }>(
    `SELECT id, statut FROM feuille_temps WHERE ressource_id = $1 AND lundi = $2::date FOR UPDATE`,
    [cible, lundi],
  );
  let feuille = fs[0];
  const { rows: assignations } = await db.query<{
    id: number;
    projet_id: number;
    charge_reelle: number;
    reste_a_faire: number;
  }>(
    `SELECT id, projet_id, charge_reelle, reste_a_faire FROM assignation
      WHERE id = ANY($1) AND ressource_id = $2 ORDER BY id FOR UPDATE`,
    [ids, cible],
  );
  const parId = new Map(assignations.map((a) => [a.id, a]));
  if (ids.some((id) => !parId.has(id))) return refus('assignation_invalide');

  const ouvertes = new Set(
    (await lignesBase(db, cible, lundi)).filter((l) => l.ouverte).map((l) => l.assignation_id),
  );
  const anciennes = await imputationsSemaine(db, ids, lundi);
  const cle = (l: Imputation[]) => l.map((i) => `${i.jour}|${cs(i.charge)}`).join(';');
  const nouvelles = new Map(
    lignes.map((l) => [
      l.assignation_id,
      l.imputations.filter((i) => cs(i.charge) > 0).sort((a, b) => a.jour.localeCompare(b.jour)),
    ]),
  );
  const modifiee = (l: LigneEnvoyee) =>
    cle(anciennes.get(l.assignation_id) ?? []) !== cle(nouvelles.get(l.assignation_id)!);
  for (const l of lignes) {
    if (ouvertes.has(l.assignation_id)) continue;
    const reste = parId.get(l.assignation_id)!.reste_a_faire;
    if (modifiee(l) || (l.reste !== undefined && cs(l.reste) !== cs(reste))) {
      return refus('ligne_fermee');
    }
  }
  for (const l of lignes) {
    if (nouvelles.get(l.assignation_id)!.some((i) => i.jour > aujourdhui)) {
      return refus('jour_futur');
    }
  }
  if (feuille && (feuille.statut === 'soumise' || feuille.statut === 'validee')) {
    return refus('feuille_verrouillee');
  }

  // Plan d'écriture : rien n'est écrit, ni feuille créée, si rien ne change (D-119 (6)).
  const plan = lignes
    .map((l) => {
      const a = parId.get(l.assignation_id)!;
      const nouv = nouvelles.get(l.assignation_id)!;
      const delta =
        nouv.reduce((s, i) => s + cs(i.charge), 0) -
        (anciennes.get(l.assignation_id) ?? []).reduce((s, i) => s + cs(i.charge), 0);
      const resteActuel = cs(a.reste_a_faire);
      const resteNouveau = l.reste !== undefined ? cs(l.reste) : Math.max(0, resteActuel - delta);
      return { l, a, nouv, changeImp: modifiee(l), resteActuel, resteNouveau };
    })
    .filter((p) => p.changeImp || p.resteNouveau !== p.resteActuel);
  if (plan.length === 0) return vue(db, cible, lundi, 'tous');

  if (!feuille) {
    await db.query(
      `INSERT INTO feuille_temps (ressource_id, lundi) VALUES ($1, $2::date)
       ON CONFLICT (ressource_id, lundi) DO NOTHING`,
      [cible, lundi],
    );
    const { rows } = await db.query<{ id: number; statut: Statut }>(
      `SELECT id, statut FROM feuille_temps WHERE ressource_id = $1 AND lundi = $2::date FOR UPDATE`,
      [cible, lundi],
    );
    feuille = rows[0]!;
    if (feuille.statut === 'soumise' || feuille.statut === 'validee') {
      return refus('feuille_verrouillee');
    }
  }
  for (const p of plan) {
    if (p.changeImp) {
      await db.query(
        `DELETE FROM imputation
          WHERE assignation_id = $1 AND jour BETWEEN $2::date AND $2::date + 6`,
        [p.l.assignation_id, lundi],
      );
      if (p.nouv.length > 0) {
        await db.query(
          `INSERT INTO imputation (assignation_id, jour, charge)
           SELECT $1, u.j::date, u.c::numeric / 100
             FROM unnest($2::text[], $3::int[]) AS u(j, c)`,
          [p.l.assignation_id, p.nouv.map((i) => i.jour), p.nouv.map((i) => cs(i.charge))],
        );
      }
    }
    await db.query(
      `UPDATE assignation SET reste_a_faire = $2::numeric / 100,
              charge_reelle = COALESCE((SELECT sum(charge) FROM imputation WHERE assignation_id = $1), 0)
        WHERE id = $1`,
      [p.l.assignation_id, p.resteNouveau],
    );
    if (p.resteNouveau !== p.resteActuel) {
      await enregistrer(db, {
        utilisateurId: user.id,
        entite: 'assignation',
        // seul le reste est historisé : un objet réduit, sans charge_reelle (D-118 (6))
        avant: resteSeul(p.a.id, p.resteActuel),
        apres: resteSeul(p.a.id, p.resteNouveau),
        projetId: p.a.projet_id,
      });
    }
  }
  return vue(db, cible, lundi, 'tous');
}

/** Projets concernés : projets des assignations qui portent une imputation > 0 dans la semaine. */
async function projetsConcernes(db: Db, ressourceId: number, lundi: string): Promise<number[]> {
  const { rows } = await db.query<{ projet_id: number }>(
    `SELECT DISTINCT s.projet_id FROM assignation s JOIN imputation i ON i.assignation_id = s.id
      WHERE s.ressource_id = $1 AND i.charge > 0 AND i.jour BETWEEN $2::date AND $2::date + 6
      ORDER BY 1`,
    [ressourceId, lundi],
  );
  return rows.map((r) => r.projet_id);
}

/** Cycle (D-118 (8), D-119 (5)) : 404 feuille invisible, 403 sans droit, 422 statut, rien d'écrit sur un refus. */
export async function agir(
  db: Db,
  user: Acteur,
  id: number,
  verbe: Verbe,
  aujourdhui: string,
  commentaire: string | null,
  corpsValide: boolean,
): Promise<Vue | Refus | Introuvable | { invalide: true }> {
  const { rows } = await db.query<{
    ressource_id: number;
    lundi: string;
    statut: Statut;
  }>(
    `SELECT ressource_id, lundi::text AS lundi, statut FROM feuille_temps WHERE id = $1 FOR UPDATE`,
    [id],
  );
  const f = rows[0];
  if (!f) return { verdict: 'introuvable' };
  const proprietaire = f.ressource_id === user.id;
  const ecrits = await projetsEcrits(db, user);
  if (!proprietaire && ecrits !== 'tous') {
    const lignes = await lignesBase(db, f.ressource_id, f.lundi);
    if (!lignes.some((l) => ecrit(ecrits, l.projet_id))) return { verdict: 'introuvable' };
  }
  const concernes = await projetsConcernes(db, f.ressource_id, f.lundi);
  const aLeDroit =
    verbe === 'soumettre' || verbe === 'rappeler'
      ? proprietaire || user.role === 'administrateur'
      : ecrits === 'tous' || concernes.some((p) => ecrit(ecrits, p));
  if (!aLeDroit) return { verdict: 'interdit' };
  if (verbe === 'rejeter' && !corpsValide) return { invalide: true };

  const { rows: vs } = await db.query('SELECT 1 FROM validation_feuille WHERE feuille_id = $1', [
    id,
  ]);
  switch (verbe) {
    case 'soumettre':
      if (f.statut !== 'brouillon' && f.statut !== 'rejetee') return refus('statut_invalide');
      if (concernes.length === 0) return refus('feuille_vide');
      await db.query(
        `UPDATE feuille_temps SET statut = 'soumise', commentaire = NULL WHERE id = $1`,
        [id],
      );
      break;
    case 'rappeler':
      // D-120 (1) : au moins une validation (soumise ou validée) → deja_validee.
      if (vs.length > 0) return refus('deja_validee');
      if (f.statut !== 'soumise') return refus('statut_invalide');
      await db.query(`UPDATE feuille_temps SET statut = 'brouillon' WHERE id = $1`, [id]);
      break;
    case 'valider': {
      if (f.statut !== 'soumise') return refus('statut_invalide');
      const miens = concernes.filter((p) => ecrit(ecrits, p));
      await db.query(
        `INSERT INTO validation_feuille (feuille_id, projet_id, validateur_id, date)
         SELECT $1, p, $3, $4::date FROM unnest($2::int[]) AS p
         ON CONFLICT (feuille_id, projet_id) DO NOTHING`,
        [id, miens, user.id, aujourdhui],
      );
      const { rows: faits } = await db.query<{ projet_id: number }>(
        'SELECT projet_id FROM validation_feuille WHERE feuille_id = $1',
        [id],
      );
      if (concernes.every((p) => faits.some((x) => x.projet_id === p))) {
        await db.query(`UPDATE feuille_temps SET statut = 'validee' WHERE id = $1`, [id]);
      }
      break;
    }
    case 'devalider': {
      // D-176 (2) : retire les validations des projets écrits par l'utilisateur, garde les autres.
      if (f.statut !== 'soumise' && f.statut !== 'validee') return refus('statut_invalide');
      const { rows: faites } = await db.query<{ projet_id: number }>(
        'SELECT projet_id FROM validation_feuille WHERE feuille_id = $1',
        [id],
      );
      const miennes = faites.map((x) => x.projet_id).filter((p) => ecrit(ecrits, p));
      if (miennes.length === 0) return refus('rien_a_devalider');
      await db.query(
        'DELETE FROM validation_feuille WHERE feuille_id = $1 AND projet_id = ANY($2::int[])',
        [id, miennes],
      );
      await db.query(`UPDATE feuille_temps SET statut = 'soumise' WHERE id = $1`, [id]);
      break;
    }
    case 'rejeter':
      if (f.statut !== 'soumise') return refus('statut_invalide');
      await db.query('DELETE FROM validation_feuille WHERE feuille_id = $1', [id]);
      await db.query(
        `UPDATE feuille_temps SET statut = 'rejetee', commentaire = $2 WHERE id = $1`,
        [id, commentaire],
      );
      break;
  }
  return vue(db, f.ressource_id, f.lundi, proprietaire ? 'tous' : ecrits);
}

export interface FeuilleValidation {
  feuille_id: number;
  ressource_id: number;
  ressource_nom: string;
  statut: Statut;
  projets: { projet_id: number; projet_code: string; valide: boolean; peut_valider: boolean }[];
}

/** GET /api/validations (D-118 (9)) : feuilles existantes de la semaine qui touchent un projet où l'utilisateur écrit. */
export async function listeValidations(
  db: Db,
  user: Acteur,
  lundi: string,
): Promise<{ feuilles: FeuilleValidation[] }> {
  const ecrits = await projetsEcrits(db, user);
  if (ecrits !== 'tous' && ecrits.length === 0) return { feuilles: [] };
  const { rows: fs } = await db.query<{
    id: number;
    ressource_id: number;
    nom: string;
    statut: Statut;
  }>(
    `SELECT f.id, f.ressource_id, u.nom, f.statut FROM feuille_temps f
       JOIN utilisateur u ON u.id = f.ressource_id
      WHERE f.lundi = $1::date ORDER BY lower(u.nom), u.nom, f.id`,
    [lundi],
  );
  const { rows: ps } = await db.query<{
    feuille_id: number;
    projet_id: number;
    projet_code: string;
    valide: boolean;
  }>(
    `SELECT f.id AS feuille_id, p.id AS projet_id, p.code AS projet_code,
            EXISTS (SELECT 1 FROM validation_feuille v
                     WHERE v.feuille_id = f.id AND v.projet_id = p.id) AS valide
       FROM feuille_temps f
       JOIN assignation s ON s.ressource_id = f.ressource_id
       JOIN imputation i ON i.assignation_id = s.id AND i.charge > 0
                        AND i.jour BETWEEN f.lundi AND f.lundi + 6
       JOIN projet p ON p.id = s.projet_id
      WHERE f.lundi = $1::date
      GROUP BY f.id, p.id, p.code ORDER BY f.id, lower(p.code), p.code`,
    [lundi],
  );
  const feuilles: FeuilleValidation[] = [];
  for (const f of fs) {
    const projets = ps
      .filter((p) => p.feuille_id === f.id)
      .map((p) => ({
        projet_id: p.projet_id,
        projet_code: p.projet_code,
        valide: p.valide,
        peut_valider: ecrit(ecrits, p.projet_id),
      }));
    if (ecrits === 'tous' || projets.some((p) => p.peut_valider)) {
      feuilles.push({
        feuille_id: f.id,
        ressource_id: f.ressource_id,
        ressource_nom: f.nom,
        statut: f.statut,
        projets,
      });
    }
  }
  return { feuilles };
}
