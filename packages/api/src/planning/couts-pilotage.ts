import type { Db } from '../db/erreurs.js';
import { coutsMensuels, sommeMensuelle, totalMensuel } from './couts-mensuels.js';
import type { ChargeJour, CoutMensuel, CoutTotal } from './couts-mensuels.js';
import { lireOtpProjets } from './otp.js';
import { listerMois, type FiltreEquipe } from './plan-de-charge.js';
import { projetsVisibles, type Acteur } from './projets.js';
import { lireTauxRessources } from './taux.js';

/** Coûts mensuels par projet et par ressource (SPEC §12.5, D-243) : lecture seule. */

export interface LigneRessourceCouts {
  ressource_id: number;
  nom: string;
  actif: boolean;
  mois: CoutMensuel[];
  total: CoutTotal;
}

export interface LigneProjetCouts {
  projet_id: number;
  code: string;
  nom: string;
  otp_effectif: string | null;
  clos: boolean;
  mois: CoutMensuel[];
  total: CoutTotal;
  ressources: LigneRessourceCouts[];
}

export interface CoutsPilotage {
  mois: string[];
  projets: LigneProjetCouts[];
  total: { mois: CoutMensuel[]; total: CoutTotal };
}

const MAX_ID = 2147483647;

const comparer = (x: string, y: string): number => {
  const a = x.toLowerCase();
  const b = y.toLowerCase();
  return a < b ? -1 : a > b ? 1 : 0;
};

interface Charge {
  ressource_id: number;
  projet_id: number;
  nature: 'imputation' | 'planifie';
  jour: string;
  charge: string;
}

export async function lireCoutsPilotage(
  db: Db,
  acteur: Acteur,
  debut: string,
  filtre: FiltreEquipe,
): Promise<CoutsPilotage> {
  const mois = listerMois(debut);
  const vide = (): CoutsPilotage => {
    const m = coutsMensuels({ taux: [], mois, imputations: [], planifies: [] });
    return { mois, projets: [], total: { mois: m, total: totalMensuel(m) } };
  };
  if (filtre.genre === 'equipe' && filtre.id > MAX_ID) return vide();

  // Projets sur lesquels l'acteur écrit (l'administrateur : tous les projets ordinaires).
  const ecrits = (await projetsVisibles(db, acteur)).filter((p) => p.peut_ecrire);
  if (ecrits.length === 0) return vide();

  const d = `${mois[0]}-01`;
  const [aFin, mFin] = mois[11]!.split('-').map(Number) as [number, number];
  const f = new Date(Date.UTC(aFin, mFin, 1)).toISOString().slice(0, 10);
  const params: unknown[] = [d, f, ecrits.map((p) => p.id)];
  let condition = '';
  if (filtre.genre === 'aucune') condition = 'AND u.equipe_id IS NULL';
  if (filtre.genre === 'equipe') {
    params.push(filtre.id);
    condition = 'AND u.equipe_id = $4';
  }
  const { rows: charges } = await db.query<Charge>(
    `SELECT s.ressource_id, s.projet_id, 'imputation' AS nature, i.jour::text AS jour, i.charge::text AS charge
       FROM imputation i
       JOIN assignation s ON s.id = i.assignation_id
       JOIN utilisateur u ON u.id = s.ressource_id
      WHERE i.jour >= $1::date AND i.jour < $2::date AND s.projet_id = ANY($3::int[]) ${condition}
     UNION ALL
     SELECT s.ressource_id, s.projet_id, 'planifie', t.jour::text, t.charge::text
       FROM travail_planifie t
       JOIN assignation s ON s.id = t.assignation_id
       JOIN utilisateur u ON u.id = s.ressource_id
      WHERE t.jour >= $1::date AND t.jour < $2::date AND s.projet_id = ANY($3::int[]) ${condition}`,
    params,
  );
  if (charges.length === 0) return vide();

  const idsRessources = [...new Set(charges.map((c) => c.ressource_id))];
  const { rows: utilisateurs } = await db.query<{ id: number; nom: string; actif: boolean }>(
    'SELECT id, nom, actif FROM utilisateur WHERE id = ANY($1::int[])',
    [idsRessources],
  );
  const parId = new Map(utilisateurs.map((u) => [u.id, u]));
  const taux = await lireTauxRessources(db, idsRessources);

  const parProjet = new Map<number, Map<number, { imp: ChargeJour[]; plan: ChargeJour[] }>>();
  for (const c of charges) {
    const ressources = parProjet.get(c.projet_id) ?? new Map();
    parProjet.set(c.projet_id, ressources);
    const lignes = ressources.get(c.ressource_id) ?? { imp: [], plan: [] };
    ressources.set(c.ressource_id, lignes);
    (c.nature === 'imputation' ? lignes.imp : lignes.plan).push({
      jour: c.jour,
      charge: Number(c.charge),
    });
  }

  const concernes = ecrits.filter((p) => parProjet.has(p.id));
  const otp = await lireOtpProjets(
    db,
    acteur,
    concernes.map((p) => p.id),
  );
  const projets: LigneProjetCouts[] = concernes
    .map((p) => {
      const ressources: LigneRessourceCouts[] = [...parProjet.get(p.id)!.entries()]
        .map(([id, l]) => {
          const m = coutsMensuels({
            taux: taux.get(id)!.propres,
            taux_equipe: taux.get(id)!.equipe,
            mois,
            imputations: l.imp,
            planifies: l.plan,
          });
          const u = parId.get(id)!;
          return { ressource_id: id, nom: u.nom, actif: u.actif, mois: m, total: totalMensuel(m) };
        })
        .sort((x, y) => comparer(x.nom, y.nom) || x.ressource_id - y.ressource_id);
      const m = sommeMensuelle(ressources.map((r) => r.mois));
      return {
        projet_id: p.id,
        code: p.code,
        nom: p.nom,
        otp_effectif: otp.get(p.id)?.otp_effectif ?? null,
        clos: p.clos,
        mois: m,
        total: totalMensuel(m),
        ressources,
      };
    })
    .sort((x, y) => comparer(x.code, y.code) || x.projet_id - y.projet_id);
  const general = sommeMensuelle(projets.map((p) => p.mois));
  return { mois, projets, total: { mois: general, total: totalMensuel(general) } };
}
