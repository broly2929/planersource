import type { CalendrierCompile } from './calendrier.js';
import { estOuvre } from './calendrier.js';
import { requis } from './graphe.js';

export interface RessourceCtx {
  capacite: number;
  cal: CalendrierCompile;
}

export interface FenetreAffectation {
  debut: number | null;
  fin: number | null;
  /** taux d'affectation au projet, en dix-millièmes (5000 = 50 %) */
  taux: number;
}

/** Numéro de semaine ISO (lundi à dimanche) d'un jour ; le lundi 1970-01-05 ouvre la semaine 0. */
export const semaineDe = (jour: number): number => Math.floor((jour - 4) / 7);

/** Charge déjà consommée par ressource et par jour ; disponibilité = capacité − consommé, plancher 0. */
export class Disponibilites {
  private readonly consomme = new Map<number, Map<number, number>>();
  /** Travail décompté du plafond de projet, par ressource, projet plafonnant et semaine. */
  private readonly decompte = new Map<string, number>();

  /** `parents` : projet → projet parent (D-062 Q2) ; un parent absent de la table n'impose rien (Q5). */
  constructor(
    private readonly ressources: ReadonlyMap<number, RessourceCtx>,
    private readonly fenetres: ReadonlyMap<string, FenetreAffectation>,
    private readonly parents: ReadonlyMap<number, number | null>,
  ) {}

  /** Projets dont le plafond s'applique à une activité de `projetId` pour la ressource (D-062 Q2). */
  private plafonnants(ressourceId: number, projetId: number): number[] {
    const ids: number[] = [];
    for (let q: number | null = projetId; q !== null && this.parents.has(q);) {
      if (ids.includes(q)) break;
      if (this.fenetres.has(`${q}:${ressourceId}`)) ids.push(q);
      q = this.parents.get(q) ?? null;
    }
    return ids;
  }

  /** Plafond de la semaine d'un projet pour une ressource, en centièmes (D-062 Q1). */
  private plafondSemaine(ressourceId: number, projetId: number, semaine: number): number {
    const r = requis(this.ressources, ressourceId);
    const taux = requis(this.fenetres, `${projetId}:${ressourceId}`).taux;
    const debut = 4 + 7 * semaine;
    let ouvres = 0;
    for (let j = debut; j < debut + 7; j += 1) if (estOuvre(r.cal, j)) ouvres += 1;
    return Math.floor((taux * r.capacite * ouvres) / 10000);
  }

  /** Reliquat du plafond de projet le plus serré qui s'applique ce jour-là ; infini sans plafond. */
  reliquatPlafond(ressourceId: number, projetId: number, jour: number): number {
    const semaine = semaineDe(jour);
    let reliquat = Infinity;
    for (const q of this.plafonnants(ressourceId, projetId)) {
      const pris = this.decompte.get(`${ressourceId}:${q}:${semaine}`) ?? 0;
      reliquat = Math.min(
        reliquat,
        Math.max(0, this.plafondSemaine(ressourceId, q, semaine) - pris),
      );
    }
    return reliquat;
  }

  /**
   * Charge posable un jour : disponibilité de la ressource et reliquat des plafonds de projet.
   * `dejaPoseSemaine` : charge déjà posée, mais pas encore décomptée, par le remplissage en cours
   * dans la même semaine.
   */
  posable(ressourceId: number, projetId: number, jour: number, dejaPoseSemaine = 0): number {
    return Math.min(
      this.disponible(ressourceId, projetId, jour),
      Math.max(0, this.reliquatPlafond(ressourceId, projetId, jour) - dejaPoseSemaine),
    );
  }

  capacite(ressourceId: number): number {
    return requis(this.ressources, ressourceId).capacite;
  }

  /** Jour ouvré du calendrier de la ressource. */
  estOuvre(ressourceId: number, jour: number): boolean {
    return estOuvre(requis(this.ressources, ressourceId).cal, jour);
  }

  /**
   * Décompte une charge ; avec `projetId`, c'est du travail de ce projet : il est aussi décompté des
   * plafonds de projet (le sien et ceux de ses ancêtres), sans jamais être limité par eux.
   */
  consommer(ressourceId: number, jour: number, charge: number, projetId?: number): void {
    if (projetId !== undefined) {
      const semaine = semaineDe(jour);
      for (const q of this.plafonnants(ressourceId, projetId)) {
        const cle = `${ressourceId}:${q}:${semaine}`;
        this.decompte.set(cle, (this.decompte.get(cle) ?? 0) + charge);
      }
    }
    let parJour = this.consomme.get(ressourceId);
    if (!parJour) {
      parJour = new Map();
      this.consomme.set(ressourceId, parJour);
    }
    parJour.set(jour, (parJour.get(jour) ?? 0) + charge);
  }

  disponible(ressourceId: number, projetId: number, jour: number): number {
    const r = requis(this.ressources, ressourceId);
    const f = this.fenetres.get(`${projetId}:${ressourceId}`);
    if (!f || !estOuvre(r.cal, jour)) return 0;
    if ((f.debut !== null && jour < f.debut) || (f.fin !== null && jour > f.fin)) return 0;
    const pris = this.consomme.get(ressourceId)?.get(jour) ?? 0;
    return Math.max(0, r.capacite - pris);
  }
}
