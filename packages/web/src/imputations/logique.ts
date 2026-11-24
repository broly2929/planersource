// Logique pure de l'écran Feuille de temps (lot 4b, D-120, D-121). Aucune dépendance au DOM.
import type { EntreeAnnuaire } from '../annuaire';

export type Statut = 'brouillon' | 'soumise' | 'validee' | 'rejetee';

export interface ImputationJour {
  jour: string;
  charge: number;
}

/** Ligne de GET /api/feuilles (D-118 (5)). */
export interface LigneFeuille {
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
  imputations: ImputationJour[];
}

export interface JourFeuille {
  jour: string;
  capacite: number;
  total: number;
  depassement: boolean;
}

/** Texte saisi des charges d'une ligne, par jour, et de son reste à faire. */
export interface SaisieLigne {
  charges: Record<string, string>;
  reste: string;
}
export type Saisie = Record<number, SaisieLigne>;

export type Analyse = { ok: true; valeur: number } | { ok: false; message: string };

export const CHARGE_INVALIDE = 'Saisir un nombre de jours entre 0 et 10, avec 2 décimales au plus.';
export const RESTE_INVALIDE = 'Saisir un nombre de jours positif ou nul, avec 2 décimales au plus.';

const GENERIQUE = 'Action impossible pour le moment. Réessayez.';
const JOURS_ABREGES = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const FORMAT_JOUR = /^(\d{4})-(\d{2})-(\d{2})$/;
const NOMBRE = /^\d+(?:[.,]\d{1,2})?$/;

const deuxChiffres = (n: number) => String(n).padStart(2, '0');
const versUtc = (jour: string) => new Date(`${jour}T00:00:00Z`);
const depuisUtc = (d: Date) =>
  `${d.getUTCFullYear()}-${deuxChiffres(d.getUTCMonth() + 1)}-${deuxChiffres(d.getUTCDate())}`;

/** Lundi de la semaine ISO du jour (AAAA-MM-JJ). */
export function lundiDe(jour: string): string {
  const d = versUtc(jour);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return depuisUtc(d);
}

function lundiValide(param: string): boolean {
  const m = FORMAT_JOUR.exec(param);
  if (!m) return false;
  const annee = Number(m[1]);
  if (annee < 2000 || annee > 2099) return false;
  const d = versUtc(param);
  return !Number.isNaN(d.getTime()) && depuisUtc(d) === param && d.getUTCDay() === 1;
}

/** Semaine à afficher : le paramètre s'il est un lundi valide, sinon le lundi d'aujourd'hui (corrigée). */
export function semaineAffichee(
  param: string | null,
  aujourdhui: string,
): { semaine: string; corrigee: boolean } {
  if (param !== null && lundiValide(param)) return { semaine: param, corrigee: false };
  return { semaine: lundiDe(aujourdhui), corrigee: true };
}

/** Ressources que l'administrateur peut choisir : actives, triées par nom (ordre français, D-181 (5)). */
export function ressourcesChoisissables(annuaire: EntreeAnnuaire[]): EntreeAnnuaire[] {
  return annuaire
    .filter((e) => e.actif && e.est_ressource)
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.id - b.id);
}

/**
 * Ressource affichée : le paramètre `ressource` s'il désigne une entrée de `choix`, sinon le défaut (soi si
 * ressource, sinon aucune). Paramètre présent mais invalide : corrigee = true (D-181 (5)).
 */
export function ressourceAffichee(
  param: string | null,
  choix: EntreeAnnuaire[],
  utilisateur: { id: number; est_ressource: boolean },
): { ressource: number | null; corrigee: boolean } {
  const defaut = utilisateur.est_ressource ? utilisateur.id : null;
  if (param === null) return { ressource: defaut, corrigee: false };
  if (/^\d+$/.test(param)) {
    const id = Number(param);
    if (choix.some((e) => e.id === id)) return { ressource: id, corrigee: false };
  }
  return { ressource: defaut, corrigee: true };
}

export interface OptionListe {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Options de la liste « Ressource » (D-186 (1), (2)) : « Chargement… » seule tant que l'annuaire n'est pas lu ;
 * ensuite « Choisir… » (désactivée, toujours présente) puis une option par ressource. La ressource choisie
 * ne change pas la liste.
 */
export function optionsListeRessource(
  choix: EntreeAnnuaire[],
  _ressource: number | null,
  prete: boolean,
): OptionListe[] {
  if (!prete) return [{ value: '', label: 'Chargement…', disabled: true }];
  return [
    { value: '', label: 'Choisir…', disabled: true },
    ...choix.map((e) => ({ value: String(e.id), label: e.nom })),
  ];
}

export function adresseImputations(semaine: string, ressource: number | null): string {
  const base = `/imputations?semaine=${semaine}`;
  return ressource === null ? base : `${base}&ressource=${ressource}`;
}

export function titreFeuille(nomRessource: string, estSoi: boolean): string {
  return estSoi ? 'Feuille de temps' : `Feuille de temps de ${nomRessource}`;
}

export function decalerSemaine(lundi: string, delta: number): string {
  const d = versUtc(lundi);
  d.setUTCDate(d.getUTCDate() + 7 * delta);
  return depuisUtc(d);
}

export function joursSemaine(lundi: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = versUtc(lundi);
    d.setUTCDate(d.getUTCDate() + i);
    return depuisUtc(d);
  });
}

const jjmm = (jour: string) => `${jour.slice(8, 10)}/${jour.slice(5, 7)}`;
const jjmmaaaa = (jour: string) => `${jjmm(jour)}/${jour.slice(0, 4)}`;

export function libelleSemaine(lundi: string): string {
  const dimanche = joursSemaine(lundi)[6]!;
  return `Semaine du ${jjmmaaaa(lundi)} au ${jjmmaaaa(dimanche)}`;
}

/** « lun. 11/01 ». */
export function libelleJour(jour: string): string {
  return `${JOURS_ABREGES[versUtc(jour).getUTCDay()]} ${jjmm(jour)}`;
}

/** Date locale du navigateur, AAAA-MM-JJ. */
export function aujourdhuiLocal(date: Date = new Date()): string {
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
}

/** Jours à la virgule décimale. */
export function formaterJours(n: number): string {
  return String(n).replace('.', ',');
}

function analyser(texte: string, max: number | null, message: string): Analyse {
  const t = texte.trim();
  if (t === '') return { ok: true, valeur: 0 };
  if (!NOMBRE.test(t)) return { ok: false, message };
  const valeur = Math.round(Number(t.replace(',', '.')) * 100) / 100;
  if (max !== null && valeur > max) return { ok: false, message };
  return { ok: true, valeur };
}

/** Charge d'un jour : vide = 0, virgule ou point, de 0 à 10, 2 décimales au plus. */
export const analyserCharge = (texte: string): Analyse => analyser(texte, 10, CHARGE_INVALIDE);
/** Reste à faire : ≥ 0, 2 décimales au plus, sans borne haute (l'API borne, D-121). */
export const analyserReste = (texte: string): Analyse => analyser(texte, null, RESTE_INVALIDE);

export function saisieInitiale(lignes: LigneFeuille[], jours: string[]): Saisie {
  const saisie: Saisie = {};
  for (const l of lignes) {
    const parJour = new Map(l.imputations.map((i) => [i.jour, i.charge]));
    saisie[l.assignation_id] = {
      charges: Object.fromEntries(
        jours.map((j) => [j, parJour.has(j) ? formaterJours(parJour.get(j)!) : '']),
      ),
      reste: formaterJours(l.reste),
    };
  }
  return saisie;
}

export function saisieValide(saisie: Saisie): boolean {
  return Object.values(saisie).every(
    (l) => analyserReste(l.reste).ok && Object.values(l.charges).every((c) => analyserCharge(c).ok),
  );
}

const centimes = (n: number) => Math.round(n * 100);
const valeurOuZero = (a: Analyse) => (a.ok ? a.valeur : 0);

/** Total par jour (valeurs invalides comptées 0) et dépassement de la capacité. */
export function totauxJours(
  saisie: Saisie,
  jours: JourFeuille[],
): { jour: string; total: number; depassement: boolean }[] {
  return jours.map(({ jour, capacite }) => {
    const somme = Object.values(saisie).reduce(
      (s, l) => s + centimes(valeurOuZero(analyserCharge(l.charges[jour] ?? ''))),
      0,
    );
    const total = somme / 100;
    return { jour, total, depassement: total > capacite };
  });
}

/** Corps `lignes` du PUT : seules les lignes modifiables dont des charges ou le reste ont changé. */
export function lignesModifiees(
  lignes: LigneFeuille[],
  saisie: Saisie,
): { assignation_id: number; imputations: ImputationJour[]; reste?: number }[] {
  const resultat: { assignation_id: number; imputations: ImputationJour[]; reste?: number }[] = [];
  for (const l of lignes) {
    const s = saisie[l.assignation_id];
    if (!l.modifiable || !s) continue;
    const avant = new Map(l.imputations.map((i) => [i.jour, centimes(i.charge)]));
    const imputations: ImputationJour[] = [];
    let chargesModifiees = false;
    for (const jour of Object.keys(s.charges).sort()) {
      const charge = valeurOuZero(analyserCharge(s.charges[jour]!));
      if (centimes(charge) !== (avant.get(jour) ?? 0)) chargesModifiees = true;
      if (charge > 0) imputations.push({ jour, charge });
    }
    const reste = valeurOuZero(analyserReste(s.reste));
    const resteModifie = centimes(reste) !== centimes(l.reste);
    if (!chargesModifiees && !resteModifie) continue;
    resultat.push({
      assignation_id: l.assignation_id,
      imputations,
      ...(resteModifie ? { reste: reste } : {}),
    });
  }
  return resultat;
}

const STATUTS: Record<Statut, string> = {
  brouillon: 'Brouillon',
  soumise: 'Soumise',
  validee: 'Validée',
  rejetee: 'Rejetée',
};
/** Variante de `Badge` du statut d'une feuille (4b, 4c). */
export const VARIANTE_STATUT: Record<Statut, 'warning' | 'info' | 'success' | 'danger'> = {
  brouillon: 'warning',
  soumise: 'info',
  validee: 'success',
  rejetee: 'danger',
};
export const libelleStatut = (statut: Statut): string => STATUTS[statut];

const REFUS: Record<string, string> = {
  assignation_invalide: 'Cette ligne n’est plus disponible.',
  ligne_fermee: 'Cette activité ou ce projet est clos : la ligne n’est plus modifiable.',
  jour_futur: 'Impossible d’imputer un jour futur.',
  feuille_verrouillee: 'La feuille est soumise ou validée : elle n’est plus modifiable.',
  feuille_vide: 'Aucune imputation : rien à soumettre.',
  deja_validee: 'La feuille est déjà validée en partie.',
};

export function messageRefusFeuille(statut: number, code: string | undefined): string {
  if (statut === 400) return 'Données invalides.';
  if (statut === 422 && code && REFUS[code]) return REFUS[code]!;
  return GENERIQUE;
}
