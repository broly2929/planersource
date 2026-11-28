import { compilerCalendrier, estOuvre } from './calendrier.js';
import type { CalendrierCompile } from './calendrier.js';
import { agregerDates, avancement, sommerCharges } from './agregation.js';
import type { Charges } from './agregation.js';
import { debutPlusTot, dependanceRespectee, finCible, positionBarre } from './dependances.js';
import { drapeauxJalon } from './drapeaux.js';
import { dateJalon } from './jalons.js';
import type { Contrainte } from './dependances.js';
import { cheminWbs, comparerCles } from './tri.js';
import { Disponibilites } from './disponibilite.js';
import type { FenetreAffectation, RessourceCtx } from './disponibilite.js';
import { joursDepuis, versJour } from './dates.js';
import { aretesDeCycle, construireArbre, idsEnCycle, requis } from './graphe.js';
import { parametresDuMode } from './modes/index.js';
import { cleStarr } from './modes/starr.js';
import { drapeauxDuree, fenetreDuree, joursDeFenetre } from './modes/duree.js';
import type { Fenetre } from './modes/duree.js';
import { posesMan, resteMan, saisiesParJour } from './modes/man.js';
import { barreRegul, fenetreRegul, joursRegul } from './modes/regul.js';
import { remplirArriere, remplirAvant, remplirFenetreEtReliquat } from './remplissage.js';
import type { Pose } from './remplissage.js';
import type {
  CodeErreur,
  Dependance,
  Assignation,
  Avertissement,
  Entree,
  Mode,
  Ressource,
  Sortie,
  SortieActivite,
  SortieDependance,
  SortieJalon,
  SortieProjet,
  TravailPose,
} from './types.js';

const DNR = 'dependance_non_respectee';
/** Charge d'une saisie manuelle : une demi-journée (SPEC 3). */
const DEMI_JOURNEE = 50;

export class ErreurMoteur extends Error {
  readonly code: CodeErreur;
  /** identifiants fautifs, triés croissants */
  readonly ids: number[];

  constructor(code: CodeErreur, ids: number[], message?: string) {
    super(message ?? code);
    this.name = 'ErreurMoteur';
    this.code = code;
    this.ids = ids;
  }
}

/** Éléments d'entrée incohérents : ids triés, sans doublon (dépendance : id inconnu ; assignation, saisie : id d'assignation ; calendrier : son id). */
function idsInvalides(entree: Entree): number[] {
  const ids = new Set(entree.elements.map((e) => e.id));
  const elements = new Map(entree.elements.map((e) => [e.id, e]));
  const activites = new Set(entree.elements.filter((e) => e.type === 'activite').map((e) => e.id));
  const fautifs = new Set<number>();
  for (const d of entree.dependances) {
    if (!ids.has(d.predecesseurId)) fautifs.add(d.predecesseurId);
    if (!ids.has(d.successeurId)) fautifs.add(d.successeurId);
  }
  for (const e of entree.elements) {
    if (e.type === 'jalon' && e.nature === 'fixe' && e.dateValidee === undefined) fautifs.add(e.id);
  }
  const parents = new Set(entree.elements.map((e) => e.parentId));
  for (const e of entree.elements) {
    // feuilles ouvertes seulement : un parent ignore son mode, une activité close n'est pas replanifiée
    const feuille = e.type === 'activite' && !e.close && !parents.has(e.id);
    if (feuille && (e.mode === 'START' || e.mode === 'STARR') && e.debutValide === undefined) {
      fautifs.add(e.id);
    }
    if (feuille && (e.mode === 'FDUR' || e.mode === 'DDUR') && e.dureeValidee !== undefined) {
      if (!Number.isInteger(e.dureeValidee) || e.dureeValidee < 1) fautifs.add(e.id);
    }
    if (feuille && e.mode === 'REGUL') {
      const { debutValide: d, finValide: f } = e;
      if (d === undefined || f === undefined || joursDepuis(f) < joursDepuis(d)) fautifs.add(e.id);
    }
  }
  // ERR-10 (SPEC 5.6, D-056) : une saisie porte sur une assignation d'une feuille MAN (close permise),
  // vaut 0,5 j et est unique par (assignation, jour, demi-journée)
  const assignations = new Map(entree.assignations.map((a) => [a.id, a]));
  const vues = new Set<string>();
  for (const s of entree.saisies) {
    const a = assignations.get(s.assignationId);
    const e = a === undefined ? undefined : elements.get(a.activiteId);
    const cle = `${s.assignationId}:${s.jour}:${s.demiJournee}`;
    const surMan = e?.type === 'activite' && e.mode === 'MAN' && !parents.has(e.id);
    if (!surMan || s.charge !== DEMI_JOURNEE || vues.has(cle)) fautifs.add(s.assignationId);
    vues.add(cle);
  }
  for (const a of entree.assignations) if (!activites.has(a.activiteId)) fautifs.add(a.id);
  for (const c of entree.calendriers) if (c.joursTravailles.length === 0) fautifs.add(c.id);
  return [...fautifs].sort((a, b) => a - b);
}

/**
 * Contexte d'une ressource (D-276) : sans absence, son calendrier tel quel ; sinon un calendrier propre où
 * chaque jour d'absence en journée entière (ou matin et après-midi le même jour) est férié, et l'ensemble
 * des jours en demi-journée.
 */
function contexteRessource(r: Ressource, cal: CalendrierCompile): RessourceCtx {
  if (!r.absences || r.absences.length === 0) return { capacite: r.capacite, cal };
  const portions = new Map<number, Set<string>>();
  for (const a of r.absences) {
    const jour = joursDepuis(a.jour);
    const p = portions.get(jour) ?? new Set<string>();
    p.add(a.portion);
    portions.set(jour, p);
  }
  const feries = new Set(cal.feries);
  const demi = new Set<number>();
  for (const [jour, p] of portions) {
    if (p.has('journee') || (p.has('matin') && p.has('apres_midi'))) feries.add(jour);
    else demi.add(jour);
  }
  return { capacite: r.capacite, cal: { jours: cal.jours, feries }, demi };
}

/** Modes à dates imposées : planifiés en passe A, jamais déplacés par leurs dépendances (SPEC 5.2, 5.3). */
function aDatesImposees(mode: Mode): boolean {
  return mode === 'REGUL' || mode === 'MAN';
}

/**
 * Charge depuis le taux (D-276, SPEC §4 point 12) : pour une assignation au champ vrai d'une feuille REGUL
 * ouverte, charge = réel + taux × capacité × jours ouvrés restants (du maximum de D0 et du début de fenêtre à
 * la fin validée ; demi-journée d'absence : 0,5), au centième inférieur ; reste = charge − réel, plancher 0.
 * Renvoie les identifiants des assignations recalculées et la liste d'assignations à planifier.
 */
function chargesDepuisTaux(
  entree: Entree,
  d0: number,
  ressources: ReadonlyMap<number, RessourceCtx>,
): { calculees: Set<number>; assignations: Assignation[] } {
  const calculees = new Set<number>();
  if (!entree.assignations.some((a) => a.chargeDepuisTaux)) {
    return { calculees, assignations: entree.assignations };
  }
  const elements = new Map(entree.elements.map((e) => [e.id, e]));
  const parents = new Set(entree.elements.map((e) => e.parentId));
  const projets = new Map(entree.projets.map((p) => [p.id, p]));
  const assignations = entree.assignations.map((a) => {
    const e = elements.get(a.activiteId);
    if (!a.chargeDepuisTaux || e?.type !== 'activite' || e.mode !== 'REGUL') return a;
    if (e.close || parents.has(e.id)) return a;
    const projet = projets.get(e.projetId);
    const r = ressources.get(a.ressourceId);
    if (!projet || !r) return a;
    const f = fenetreRegul(e, Math.max(d0, joursDepuis(projet.debut)));
    let demiJours = 0;
    for (let j = Math.max(d0, f.debut); j <= f.fin; j += 1) {
      if (estOuvre(r.cal, j)) demiJours += r.demi?.has(j) ? 1 : 2;
    }
    calculees.add(a.id);
    const charge = a.chargeReelle + Math.floor((a.taux * r.capacite * demiJours) / 20000);
    return { ...a, charge, resteAFaire: Math.max(0, charge - a.chargeReelle) };
  });
  return { calculees, assignations };
}

export function calculer(brute: Entree): Sortie {
  const invalides = idsInvalides(brute);
  if (invalides.length > 0) throw new ErreurMoteur('entree_invalide', invalides);
  const d0 = joursDepuis(brute.d0);
  const horizon = joursDepuis(brute.horizon);
  const cals = new Map(brute.calendriers.map((c) => [c.id, compilerCalendrier(c)]));
  const calDefaut = requis(cals, brute.calendrierDefautId);
  const ressources = new Map<number, RessourceCtx>(
    brute.ressources.map((r) => [r.id, contexteRessource(r, requis(cals, r.calendrierId))]),
  );
  // charge depuis le taux, calculée en entrée de passe A (D-276)
  const recalcul = chargesDepuisTaux(brute, d0, ressources);
  const entree: Entree = { ...brute, assignations: recalcul.assignations };
  const fenetres = new Map<string, FenetreAffectation>();
  for (const p of entree.projets) {
    for (const a of p.affectations) {
      fenetres.set(`${p.id}:${a.ressourceId}`, {
        debut: a.debut === undefined ? null : joursDepuis(a.debut),
        fin: a.fin === undefined ? null : joursDepuis(a.fin),
        taux: a.taux,
      });
    }
  }
  const dispo = new Disponibilites(
    ressources,
    fenetres,
    new Map(entree.projets.map((p) => [p.id, p.parentId])),
  );
  const projets = new Map(entree.projets.map((p) => [p.id, p]));
  const assignationRessource = new Map(entree.assignations.map((a) => [a.id, a.ressourceId]));
  const elements = new Map(entree.elements.map((e) => [e.id, e]));
  const reelParActivite = new Map<number, { min: number; max: number }>();
  const assignationActivite = new Map(entree.assignations.map((a) => [a.id, a.activiteId]));
  for (const t of entree.travailReel) {
    const jour = joursDepuis(t.jour);
    const act = requis(assignationActivite, t.assignationId);
    dispo.consommer(
      requis(assignationRessource, t.assignationId),
      jour,
      t.charge,
      requis(elements, act).projetId,
    );
    const b = reelParActivite.get(act);
    reelParActivite.set(
      act,
      b ? { min: Math.min(b.min, jour), max: Math.max(b.max, jour) } : { min: jour, max: jour },
    );
  }
  for (const t of entree.travailExterne) {
    dispo.consommer(t.ressourceId, joursDepuis(t.jour), t.charge);
  }

  const arbre = construireArbre(entree.elements);
  const cycle = idsEnCycle(
    entree.elements.map((e) => e.id),
    aretesDeCycle(entree.elements, entree.dependances, arbre),
  );
  if (cycle.length > 0) throw new ErreurMoteur('cycle_dependances', cycle);

  const dependancesParSuccesseur = new Map<number, Dependance[]>();
  for (const d of entree.dependances) {
    dependancesParSuccesseur.set(d.successeurId, [
      ...(dependancesParSuccesseur.get(d.successeurId) ?? []),
      d,
    ]);
  }
  const dates = new Map<number, { debut: number; fin: number }>();
  const datesNoeud = (id: number): { debut: number; fin: number } | null => {
    return agregerDates(arbre.feuillesDe(id).flatMap((f) => dates.get(f) ?? []));
  };
  const contraintesDe = (id: number): Contrainte[] =>
    [id, ...arbre.ancetres(id)]
      .flatMap((x) => dependancesParSuccesseur.get(x) ?? [])
      .flatMap((d) => {
        const p = datesNoeud(d.predecesseurId);
        return p ? [{ type: d.type, delai: d.delai, debutP: p.debut, finP: p.fin }] : [];
      });

  // passe A (SPEC 5.2) : feuilles MAN et REGUL ouvertes (dates imposées), hors de l'ordre de la
  // passe B ; la détection des cycles, faite plus haut sur le graphe complet, les a gardées
  const passeA = new Set(
    arbre.feuilles.filter((f) => {
      const e = requis(elements, f);
      return e.type === 'activite' && !e.close && aDatesImposees(e.mode);
    }),
  );
  const saisies = saisiesParJour(entree.saisies);
  /** Reste à faire de sortie d'une assignation (D-057). */
  const resteDe = (a: Assignation): number => {
    const e = requis(elements, a.activiteId);
    if (e.type !== 'activite') return a.resteAFaire;
    if (e.close) return 0;
    if (e.mode === 'MAN' && !arbre.enfants.has(e.id)) return resteMan(saisies.get(a.id), d0);
    return a.resteAFaire;
  };
  // ordre de traitement des feuilles de la passe B : Kahn, départage par comparerCles
  const arcs = new Map<number, Set<number>>();
  const entrants = new Map<number, number>(
    arbre.feuilles.filter((f) => !passeA.has(f)).map((f) => [f, 0]),
  );
  for (const d of entree.dependances) {
    for (const src of arbre.feuillesDe(d.predecesseurId)) {
      if (passeA.has(src)) continue;
      for (const tgt of arbre.feuillesDe(d.successeurId)) {
        if (passeA.has(tgt)) continue;
        const set = arcs.get(src) ?? new Set<number>();
        if (!set.has(tgt)) {
          set.add(tgt);
          arcs.set(src, set);
          entrants.set(tgt, requis(entrants, tgt) + 1);
        }
      }
    }
  }
  const cle = (id: number) => {
    const e = requis(elements, id);
    return {
      ...cleStarr(e),
      prioriteProjet: requis(projets, e.projetId).priorite,
      prioriteActivite: e.type === 'activite' ? e.priorite : 0,
      chemin: cheminWbs(id, elements),
      projetId: e.projetId,
      id,
    };
  };
  const prets = [...entrants.keys()].filter((f) => requis(entrants, f) === 0);
  const ordre: number[] = [];
  while (prets.length > 0) {
    // un jalon prêt passe avant toute activité prête
    const estJalon = (id: number): boolean => requis(elements, id).type === 'jalon';
    let meilleur = 0;
    for (let i = 1; i < prets.length; i += 1) {
      const a = prets[i] as number;
      const b = prets[meilleur] as number;
      if (estJalon(a) !== estJalon(b) ? estJalon(a) : comparerCles(cle(a), cle(b)) < 0)
        meilleur = i;
    }
    const [id] = prets.splice(meilleur, 1) as [number];
    ordre.push(id);
    for (const t of arcs.get(id) ?? []) {
      const n = requis(entrants, t) - 1;
      entrants.set(t, n);
      if (n === 0) prets.push(t);
    }
  }

  const travail: TravailPose[] = [];
  const avertissements: Avertissement[] = [];
  const sortieActivites: SortieActivite[] = [];
  const sortieJalons: SortieJalon[] = [];
  const chargesFeuilles = new Map<number, Charges>();

  /**
   * Feuille MAN ouverte (SPEC 5.6, D-056) : recopie des saisies à partir de D0, une ligne par assignation
   * et par jour ; dates = première et dernière saisie, toutes dates confondues ; sans saisie, aucune date ;
   * drapeau `surcharge` seul, jamais de `retard`.
   */
  const planifierMan = (
    id: number,
    projetId: number,
    mesAssignations: readonly Assignation[],
    charges: Charges,
  ): void => {
    let surchargee = false;
    const bornes: number[] = [];
    for (const a of mesAssignations) {
      const jours = saisies.get(a.id);
      bornes.push(...(jours?.keys() ?? []));
      for (const p of posesMan(dispo, a.ressourceId, projetId, jours, d0)) {
        dispo.consommer(a.ressourceId, p.jour, p.charge, projetId);
        travail.push({
          assignationId: a.id,
          jour: versJour(p.jour),
          charge: p.charge,
          surcharge: p.surcharge,
        });
        if (p.surcharge > 0) surchargee = true;
      }
    }
    const d = bornes.length === 0 ? null : { debut: Math.min(...bornes), fin: Math.max(...bornes) };
    if (d) dates.set(id, d);
    sortieActivites.push({
      id,
      debut: d ? versJour(d.debut) : null,
      fin: d ? versJour(d.fin) : null,
      ...charges,
      drapeaux: surchargee ? ['surcharge'] : [],
    });
  };

  /** Planifie une feuille (jalon ou activité) : travail posé, dates, drapeaux ; appelable par les passes A et B. */
  const planifier = (id: number): void => {
    const act = requis(elements, id);
    const projet = requis(projets, act.projetId);
    const plancher = Math.max(d0, joursDepuis(projet.debut));
    // un REGUL ou un MAN n'est pas déplacé par ses dépendances (SPEC 5.3) : contrôle après la passe B
    const imposee = act.type === 'activite' && aDatesImposees(act.mode);
    const contraintes = imposee ? [] : contraintesDe(id);
    if (act.type === 'jalon') {
      const j = dateJalon(calDefaut, act, plancher, contraintes);
      dates.set(id, { debut: j.date, fin: j.date });
      sortieJalons.push({ id, date: versJour(j.date), drapeaux: drapeauxJalon(j.retard) });
      return;
    }
    // une ressource n'est assignée qu'une fois à une activité : unicité (activité, ressource) garantie
    // par la base (migration 006) ; le moteur s'y appuie (un jeu de poses par ressource et par activité)
    const mesAssignations = entree.assignations
      .filter((a) => a.activiteId === act.id)
      .sort((a, b) => a.id - b.id);
    const charges: Charges = {
      charge: mesAssignations.reduce((s, a) => s + a.charge, 0),
      reel: mesAssignations.reduce((s, a) => s + a.chargeReelle, 0),
      reste: mesAssignations.reduce((s, a) => s + resteDe(a), 0),
    };
    chargesFeuilles.set(id, charges);
    if (act.close) {
      // activité close : rien n'est posé, les dates sont les bornes du travail réel
      const r = reelParActivite.get(id);
      if (r) dates.set(id, { debut: r.min, fin: r.max });
      sortieActivites.push({
        id,
        debut: r ? versJour(r.min) : null,
        fin: r ? versJour(r.max) : null,
        ...charges,
        drapeaux: [],
      });
      return;
    }
    if (act.mode === 'MAN') {
      planifierMan(act.id, act.projetId, mesAssignations, charges);
      return;
    }
    const mode = parametresDuMode(act, plancher, finCible(calDefaut, contraintes));
    const debutTot = debutPlusTot(calDefaut, mode.plancher, contraintes);
    const cible = mode.cible;
    let premier: number | null = null;
    let dernier: number | null = null;
    const borne = (j: number): void => {
      premier = premier === null ? j : Math.min(premier, j);
      dernier = dernier === null ? j : Math.max(dernier, j);
    };
    const reel = reelParActivite.get(act.id);
    if (reel) {
      borne(reel.min);
      borne(reel.max);
    }
    const aPoser = mesAssignations.filter((a) => a.resteAFaire > 0);
    let surchargee = false;
    let resultats: { a: Assignation; poses: Pose[]; reste: number }[] | null = null;
    let fenetre: Fenetre | null = null;
    const duree = mode.duree;
    const regul = mode.regul;
    if (regul) {
      const jours = joursRegul(regul);
      resultats = aPoser.map((a) => ({
        a,
        ...remplirFenetreEtReliquat(
          dispo,
          a.ressourceId,
          act.projetId,
          a.taux,
          a.resteAFaire,
          jours,
          false,
          Math.max(regul.fin + 1, regul.debut),
          horizon,
        ),
      }));
    } else if (duree) {
      const f = fenetreDuree(calDefaut, debutTot, duree.n, cible, reel?.min ?? null);
      fenetre = f;
      const jours = joursDeFenetre(calDefaut, Math.max(f.debut, d0, debutTot), f.fin);
      resultats = aPoser.map((a) => ({
        a,
        ...remplirFenetreEtReliquat(
          dispo,
          a.ressourceId,
          act.projetId,
          a.taux,
          a.resteAFaire,
          jours,
          duree.ignorerCapacite,
          Math.max(f.fin + 1, debutTot),
          horizon,
        ),
      }));
    } else if (cible !== null) {
      const arriere = aPoser.map((a) =>
        remplirArriere(dispo, a.ressourceId, act.projetId, a.taux, a.resteAFaire, debutTot, cible),
      );
      if (arriere.every((p) => p !== null)) {
        resultats = aPoser.map((a, k) => ({ a, poses: arriere[k] as Pose[], reste: 0 }));
      }
    }
    resultats ??= aPoser.map((a) => ({
      a,
      ...remplirAvant(dispo, a.ressourceId, act.projetId, a.taux, a.resteAFaire, debutTot, horizon),
    }));
    for (const { a, poses, reste } of resultats) {
      for (const p of poses) {
        dispo.consommer(a.ressourceId, p.jour, p.charge, act.projetId);
        travail.push({
          assignationId: a.id,
          jour: versJour(p.jour),
          charge: p.charge,
          surcharge: p.surcharge,
        });
        if (p.surcharge > 0) surchargee = true;
        borne(p.jour);
      }
      if (reste > 0) avertissements.push({ code: 'reste_non_pose', assignationId: a.id, reste });
    }
    if (premier === null || dernier === null) {
      const barre = regul
        ? barreRegul(calDefaut, regul)
        : positionBarre(calDefaut, debutTot, act.dureeValidee ?? 1, cible);
      premier = barre.debut;
      dernier = barre.fin;
    }
    dates.set(id, { debut: premier, fin: dernier });
    const drapeaux = fenetre
      ? drapeauxDuree(dernier, fenetre, surchargee)
      : mode.drapeaux(premier, dernier);
    sortieActivites.push({
      id: act.id,
      debut: versJour(premier),
      fin: versJour(dernier),
      ...charges,
      drapeaux,
    });
  };

  // passe A : saisies MAN, puis REGUL ; même départage, sans la clé STARR (D-051 Q3, D-056 Q6) ;
  // puis passe B
  const sansStarr = (id: number) => ({ ...cle(id), starr: false, debutValide: 0 });
  const estMan = (id: number): number => {
    const e = requis(elements, id);
    return Number(e.type === 'activite' && e.mode === 'MAN');
  };
  const ordreA = [...passeA].sort(
    (a, b) => estMan(b) - estMan(a) || comparerCles(sansStarr(a), sansStarr(b)),
  );
  for (const id of ordreA) planifier(id);
  for (const id of ordre) planifier(id);

  // passe finale (SPEC 5.3) : dépendances vers une feuille à dates imposées (REGUL, MAN),
  // contrôlées sur les dates planifiées ; drapeau sur la feuille et sur la dépendance
  const drapeauxActivite = new Map(sortieActivites.map((a) => [a.id, a.drapeaux]));
  const sortieDependances: SortieDependance[] = entree.dependances.map((d) => {
    const p = datesNoeud(d.predecesseurId);
    let violee = false;
    for (const f of arbre.feuillesDe(d.successeurId)) {
      const s = dates.get(f);
      if (!p || !s || !passeA.has(f)) continue;
      const c: Contrainte = { type: d.type, delai: d.delai, debutP: p.debut, finP: p.fin };
      if (dependanceRespectee(calDefaut, c, s.debut, s.fin)) continue;
      violee = true;
      const drapeaux = requis(drapeauxActivite, f);
      if (!drapeaux.includes(DNR)) drapeaux.push(DNR);
    }
    return {
      predecesseurId: d.predecesseurId,
      successeurId: d.successeurId,
      drapeaux: violee ? [DNR] : [],
    };
  });
  sortieDependances.sort(
    (a, b) => a.predecesseurId - b.predecesseurId || a.successeurId - b.successeurId,
  );

  // agrégation : activités parentes, puis projets (sous-projets compris)
  const chargesDe = (ids: readonly number[]): Charges =>
    sommerCharges(ids.flatMap((f) => chargesFeuilles.get(f) ?? []));
  const jour = (n: number | undefined): string | null => (n === undefined ? null : versJour(n));
  for (const e of entree.elements) {
    if (!arbre.enfants.has(e.id)) continue;
    const d = datesNoeud(e.id);
    sortieActivites.push({
      id: e.id,
      debut: jour(d?.debut),
      fin: jour(d?.fin),
      ...chargesDe(arbre.feuillesDe(e.id)),
      drapeaux: [],
    });
  }
  const parentProjet = new Map(entree.projets.map((p) => [p.id, p.parentId]));
  const dansProjet = (projetId: number, racine: number): boolean => {
    if (projetId === racine) return true;
    const parent = parentProjet.get(projetId) ?? null;
    return parent !== null && dansProjet(parent, racine);
  };
  const sortieProjets: SortieProjet[] = entree.projets.map((p) => {
    const feuilles = arbre.feuilles.filter((f) => dansProjet(requis(elements, f).projetId, p.id));
    const d = agregerDates(feuilles.flatMap((f) => dates.get(f) ?? []));
    const c = chargesDe(feuilles);
    return {
      id: p.id,
      debut: jour(d?.debut),
      fin: jour(d?.fin),
      ...c,
      avancement: avancement(c.reel, c.reste),
    };
  });
  sortieProjets.sort((a, b) => a.id - b.id);

  travail.sort((a, b) => a.assignationId - b.assignationId || (a.jour < b.jour ? -1 : 1));
  sortieActivites.sort((a, b) => a.id - b.id);
  avertissements.sort((a, b) => (a.assignationId ?? 0) - (b.assignationId ?? 0));
  sortieJalons.sort((a, b) => a.id - b.id);
  return {
    travail,
    activites: sortieActivites,
    jalons: sortieJalons,
    projets: sortieProjets,
    avertissements,
    dependances: sortieDependances,
    assignations: entree.assignations
      .map((a) => ({
        id: a.id,
        reste: resteDe(a),
        ...(recalcul.calculees.has(a.id) ? { charge: a.charge } : {}),
      }))
      .sort((a, b) => a.id - b.id),
  };
}
