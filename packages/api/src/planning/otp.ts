import type { Db } from '../db/erreurs.js';
import { WBS_CTE } from './elements.js';
import { idsVisibles, type Acteur } from './projets.js';

/** OTP d'un projet et d'une activité (D-225, SPEC §12.2) : héritage calculé à la lecture, rien de stocké. */

/** Un élément de la chaîne d'héritage : l'élément lui-même d'abord, puis ses ancêtres, du plus proche au plus lointain. */
export interface Maillon {
  type: 'projet' | 'activite';
  id: number;
  /** Code du projet, ou « <WBS> <nom> » de l'activité. */
  libelle: string;
  otp: string | null;
  /** L'utilisateur lit-il cet élément ? Sinon, sa source est masquée (D-225 (F) (2)). */
  lisible: boolean;
}

export interface Source {
  type: 'projet' | 'activite';
  id: number | null;
  libelle: string | null;
}

export interface Herite {
  otp: string | null;
  otp_effectif: string | null;
  otp_source: Source | null;
}

/** Valeur propre, sinon celle de l'ancêtre le plus proche qui en a une ; source masquée si illisible. */
export function otpHerite(chaine: Maillon[]): Herite {
  const [soi, ...ancetres] = chaine;
  const otp = soi?.otp ?? null;
  if (otp !== null) return { otp, otp_effectif: otp, otp_source: null };
  const source = ancetres.find((m) => m.otp !== null);
  if (!source) return { otp: null, otp_effectif: null, otp_source: null };
  return {
    otp: null,
    otp_effectif: source.otp,
    otp_source: source.lisible
      ? { type: source.type, id: source.id, libelle: source.libelle }
      : { type: 'projet', id: null, libelle: null },
  };
}

interface LigneProjet {
  id: number;
  parent_id: number | null;
  code: string;
  otp: string | null;
}

/** Les projets demandés et leurs ancêtres (un ancêtre illisible compte pour l'héritage), et ceux que l'utilisateur lit. */
async function contexteProjets(db: Db, user: Acteur, ids: number[]) {
  const { rows } = await db.query<LigneProjet>(
    `WITH RECURSIVE ancetres AS (
       SELECT id, parent_id, code, otp FROM projet WHERE id = ANY($1::int[])
       UNION
       SELECT p.id, p.parent_id, p.code, p.otp FROM projet p JOIN ancetres a ON p.id = a.parent_id
     )
     SELECT id, parent_id, code, otp FROM ancetres`,
    [ids],
  );
  const projets = new Map(rows.map((r) => [r.id, r]));
  const visibles = await idsVisibles(db, user);
  /** Chaîne du projet `id` vers sa racine. */
  const chaine = (id: number): Maillon[] => {
    const resultat: Maillon[] = [];
    const vus = new Set<number>();
    for (let p = projets.get(id); p && !vus.has(p.id); p = projets.get(p.parent_id ?? 0)) {
      vus.add(p.id);
      resultat.push({
        type: 'projet',
        id: p.id,
        libelle: p.code,
        otp: p.otp,
        lisible: visibles.has(p.id),
      });
    }
    return resultat;
  };
  return { projets, chaine };
}

/** Héritage de l'OTP des projets (et modèles) demandés. */
export async function lireOtpProjets(
  db: Db,
  user: Acteur,
  ids: number[],
): Promise<Map<number, Herite>> {
  const { projets, chaine } = await contexteProjets(db, user, ids);
  return new Map(ids.filter((id) => projets.has(id)).map((id) => [id, otpHerite(chaine(id))]));
}

/** Héritage de l'OTP de chaque activité du projet : activités parentes, puis projet, puis projets parents. */
export async function lireOtpActivites(
  db: Db,
  user: Acteur,
  projetId: number,
): Promise<Map<number, Herite>> {
  const { chaine } = await contexteProjets(db, user, [projetId]);
  const { rows } = await db.query<{
    id: number;
    type: 'activite' | 'jalon';
    parent_id: number | null;
    wbs: string;
    nom: string;
    otp: string | null;
  }>(
    `WITH RECURSIVE ${WBS_CTE}
     SELECT arbre.id, arbre.type, arbre.parent_id, arbre.wbs, arbre.nom, a.otp
       FROM arbre LEFT JOIN activite a ON a.id = arbre.id`,
    [projetId],
  );
  const elements = new Map(rows.map((r) => [r.id, r]));
  const duProjet = chaine(projetId);
  const resultat = new Map<number, Herite>();
  for (const r of rows) {
    if (r.type !== 'activite') continue;
    const maillons: Maillon[] = [];
    for (let e = elements.get(r.id); e; e = elements.get(e.parent_id ?? 0)) {
      maillons.push({
        type: 'activite',
        id: e.id,
        libelle: `${e.wbs} ${e.nom}`,
        otp: e.otp,
        lisible: true,
      });
    }
    resultat.set(r.id, otpHerite([...maillons, ...duProjet]));
  }
  return resultat;
}

/** Ajoute `otp_effectif` et `otp_source` à une vue (projet ou activité). */
export function avecOtp<T extends object>(
  vue: T,
  id: number,
  herite: Map<number, Herite>,
): T & Omit<Herite, 'otp'> {
  const h = herite.get(id) ?? { otp_effectif: null, otp_source: null };
  return { ...vue, otp_effectif: h.otp_effectif, otp_source: h.otp_source };
}
