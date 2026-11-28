import { describe, expect, it } from 'vitest';
import {
  adresseGrille,
  casesRessource,
  choixRessource,
  enteteJours,
  LETTRE_MOTIF,
  libelleCase,
  lignesVisibles,
  moisSuivant,
  moisPrecedent,
  nomMois,
  parametresGrille,
  type LigneGrille,
} from '../src/absences/grille.js';
import type { Absence } from '../src/absences/logique.js';

/*
 * Lot absences-grille (D-280), SPEC §4 « Absences et charge depuis le taux », sous-section
 * « Grille mensuelle (absences-grille, D-280) », points 25 à 28. Logique pure.
 * Signatures :
 *   parametresGrille(search, moisCourant) → { mois, equipe: 'toutes' | 'aucune' | number, ressource: number | null, corrige }
 *   choixRessource(lignes, equipe, ressource) → { ressource: number | null, corrigee } (ressource absente de l'équipe : null, corrigee)
 *   lignesVisibles(lignes, equipe, ressource) → lignes de l'équipe, ou la seule ressource choisie
 *   adresseGrille(mois, equipe, ressource, semaine) → `/imputations?onglet=absences[&semaine=…]&mois=…[&equipe=…][&ressource=…]`
 *   moisPrecedent(mois), moisSuivant(mois), nomMois(mois) → « janvier 2027 »
 *   enteteJours(mois) → [{ jour: 'AAAA-MM-JJ', numero, initiale }]
 *   casesRessource(mois, absences, joursNonOuvres) → une case par jour : { jour, nonOuvre, journee, matin, apresMidi }
 *   libelleCase(nom, absence, jour) → « <Nom>, JJ/MM/AAAA, <Motif>, <portion> » ; LETTRE_MOTIF : C, F, A
 */

const ligne = (id: number, nom: string, equipe: number | null): LigneGrille => ({
  id,
  nom,
  equipe_id: equipe,
  peut_ecrire: true,
  jours_non_ouvres: [],
});
const LIGNES = [ligne(1, 'Alice', 7), ligne(2, 'Bob', null), ligne(3, 'Chloé', 7)];

const absence = (
  id: number,
  debut: string,
  fin: string,
  portion: Absence['portion'],
  motif: Absence['motif'],
): Absence => ({ id, ressource_id: 1, debut, fin, portion, motif });

describe('absences-grille, logique (SPEC §4 points 25 à 28)', () => {
  it('AGL-1 : adresse : mois, équipe et ressource invalides ramenés aux défauts, adresse canonique', () => {
    const p = (q: string) => parametresGrille(new URLSearchParams(q), '2026-11');
    expect(p('onglet=absences')).toEqual({
      mois: '2026-11',
      equipe: 'toutes',
      ressource: null,
      corrige: true,
    });
    expect(p('mois=2027-13').mois).toBe('2026-11');
    expect(p('mois=2027-13').corrige).toBe(true);
    expect(p('mois=2027-02&equipe=7&ressource=1')).toEqual({
      mois: '2027-02',
      equipe: 7,
      ressource: 1,
      corrige: false,
    });
    expect(p('mois=2027-02&equipe=aucune').equipe).toBe('aucune');
    expect(p('mois=2027-02&equipe=x')).toMatchObject({ equipe: 'toutes', corrige: true });
    expect(p('mois=2027-02&ressource=abc')).toMatchObject({ ressource: null, corrige: true });
    expect(adresseGrille('2027-02', 'toutes', null, null)).toBe(
      '/imputations?onglet=absences&mois=2027-02',
    );
    expect(adresseGrille('2027-02', 7, 1, null)).toBe(
      '/imputations?onglet=absences&mois=2027-02&equipe=7&ressource=1',
    );
    expect(adresseGrille('2027-02', 'aucune', null, '2027-01-04')).toBe(
      '/imputations?onglet=absences&semaine=2027-01-04&mois=2027-02&equipe=aucune',
    );
    // ressource absente de l'équipe choisie : Toutes, corrigée
    expect(choixRessource(LIGNES, 7, 2)).toEqual({ ressource: null, corrigee: true });
    expect(choixRessource(LIGNES, 7, 3)).toEqual({ ressource: 3, corrigee: false });
    expect(choixRessource(LIGNES, 'toutes', 99)).toEqual({ ressource: null, corrigee: true });
    expect(choixRessource(LIGNES, 'toutes', null)).toEqual({ ressource: null, corrigee: false });
  });

  it('AGL-2 : navigation : mois précédent, suivant (passage d’année)', () => {
    expect(moisSuivant('2026-12')).toBe('2027-01');
    expect(moisPrecedent('2027-01')).toBe('2026-12');
    expect(moisSuivant('2027-01')).toBe('2027-02');
    expect(nomMois('2027-01')).toBe('janvier 2027');
    expect(nomMois('2028-02')).toBe('février 2028');
  });

  it('AGL-3 : en-têtes : janvier 2027 (31 jours, le 01/01 est un vendredi), février 2028 (29 jours)', () => {
    const j = enteteJours('2027-01');
    expect(j).toHaveLength(31);
    expect(j[0]).toEqual({ jour: '2027-01-01', numero: 1, initiale: 'V' });
    expect(j[1]).toEqual({ jour: '2027-01-02', numero: 2, initiale: 'S' });
    expect(j[2]).toEqual({ jour: '2027-01-03', numero: 3, initiale: 'D' });
    expect(j[3]).toEqual({ jour: '2027-01-04', numero: 4, initiale: 'L' });
    expect(j[30]).toEqual({ jour: '2027-01-31', numero: 31, initiale: 'D' });
    expect(enteteJours('2028-02')).toHaveLength(29);
    expect(enteteJours('2027-02')).toHaveLength(28);
  });

  it('AGL-4 : état des cases : journée, matin, après-midi, matin et après-midi, jour non ouvré, absence commencée avant le mois', () => {
    const cases = casesRessource(
      '2027-01',
      [
        absence(1, '2026-12-30', '2027-01-04', 'journee', 'conge'),
        absence(2, '2027-01-12', '2027-01-12', 'matin', 'formation'),
        absence(3, '2027-01-13', '2027-01-13', 'apres_midi', 'autre'),
        absence(4, '2027-01-14', '2027-01-14', 'matin', 'conge'),
        absence(5, '2027-01-14', '2027-01-14', 'apres_midi', 'formation'),
      ],
      ['2027-01-02', '2027-01-03', '2027-01-09'],
    );
    expect(cases).toHaveLength(31);
    const c = (n: number) => cases[n - 1]!;
    expect(c(1).journee?.id).toBe(1);
    expect(c(4).journee?.id).toBe(1);
    expect(c(5).journee).toBeNull();
    expect(c(2).nonOuvre).toBe(true);
    expect(c(9).nonOuvre).toBe(true);
    expect(c(6).nonOuvre).toBe(false);
    expect(c(12).matin?.id).toBe(2);
    expect(c(12).apresMidi).toBeNull();
    expect(c(12).journee).toBeNull();
    expect(c(13).apresMidi?.id).toBe(3);
    expect(c(13).matin).toBeNull();
    expect(c(14).matin?.id).toBe(4);
    expect(c(14).apresMidi?.id).toBe(5);
    expect(c(15)).toEqual({
      jour: '2027-01-15',
      nonOuvre: false,
      journee: null,
      matin: null,
      apresMidi: null,
    });
  });

  it('AGL-5 : libellés : « Alice, 05/01/2027, Congé, matin » ; lettres C, F, A', () => {
    expect(
      libelleCase('Alice', absence(1, '2027-01-05', '2027-01-05', 'matin', 'conge'), '2027-01-05'),
    ).toBe('Alice, 05/01/2027, Congé, matin');
    expect(
      libelleCase(
        'Bob',
        absence(2, '2027-01-04', '2027-01-08', 'journee', 'formation'),
        '2027-01-06',
      ),
    ).toBe('Bob, 06/01/2027, Formation, journée');
    expect(
      libelleCase(
        'Bob',
        absence(3, '2027-01-07', '2027-01-07', 'apres_midi', 'autre'),
        '2027-01-07',
      ),
    ).toBe('Bob, 07/01/2027, Autre, après-midi');
    expect(LETTRE_MOTIF).toEqual({ conge: 'C', formation: 'F', autre: 'A' });
  });

  it('AGL-6 : filtre : équipe, « Sans équipe », ressource unique', () => {
    const noms = (l: LigneGrille[]) => l.map((x) => x.nom);
    expect(noms(lignesVisibles(LIGNES, 'toutes', null))).toEqual(['Alice', 'Bob', 'Chloé']);
    expect(noms(lignesVisibles(LIGNES, 7, null))).toEqual(['Alice', 'Chloé']);
    expect(noms(lignesVisibles(LIGNES, 'aucune', null))).toEqual(['Bob']);
    expect(noms(lignesVisibles(LIGNES, 7, 3))).toEqual(['Chloé']);
    expect(noms(lignesVisibles(LIGNES, 'toutes', 2))).toEqual(['Bob']);
  });
});
