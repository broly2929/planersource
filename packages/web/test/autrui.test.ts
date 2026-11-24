import { describe, expect, it } from 'vitest';
import {
  adresseImputations,
  ressourceAffichee,
  ressourcesChoisissables,
  titreFeuille,
} from '../src/imputations/logique.js';
import type { EntreeAnnuaire } from '../src/annuaire.js';

/*
 * AUT-E (D-181 (5), SPEC §7 « Saisie pour autrui par l'administrateur ») : logique pure de la liste « Ressource ».
 * Signatures :
 *   ressourcesChoisissables(annuaire) → entrées actives et ressources, triées par nom (ordre français)
 *   ressourceAffichee(param | null, choix, utilisateur) → { ressource: number | null, corrigee }
 *     param : paramètre `ressource` de l'adresse ; choix : résultat de ressourcesChoisissables ;
 *     utilisateur : { id, est_ressource }. Absent : soi si ressource, sinon null, sans correction.
 *     Présent mais absent de `choix` (inconnu, non numérique, non ressource, inactif) : défaut, corrigee = true.
 *   adresseImputations(semaine, ressource | null) → `/imputations?semaine=…[&ressource=<id>]`
 *   titreFeuille(nomRessource, estSoi) → « Feuille de temps » ou « Feuille de temps de <nom> »
 */

const u = (
  id: number,
  nom: string,
  est_ressource: boolean,
  actif = true,
  role: EntreeAnnuaire['role'] = 'ressource',
): EntreeAnnuaire => ({ id, nom, role, est_ressource, actif });

const ANNUAIRE: EntreeAnnuaire[] = [
  u(1, 'Zoé', true),
  u(2, 'Chef', false, true, 'chef_de_projet'),
  u(3, 'Émile', true),
  u(4, 'Inactif', true, false),
  u(5, 'Alice', true),
  u(6, 'Admin', false, true, 'administrateur'),
];

describe('AUT-13 : ressourcesChoisissables', () => {
  it('garde les ressources actives, triées par nom (ordre français)', () => {
    expect(ressourcesChoisissables(ANNUAIRE).map((e) => e.nom)).toEqual(['Alice', 'Émile', 'Zoé']);
  });
  it('exclut un inactif et un non-ressource ; liste vide', () => {
    const ids = ressourcesChoisissables(ANNUAIRE).map((e) => e.id);
    expect(ids).not.toContain(4);
    expect(ids).not.toContain(2);
    expect(ids).not.toContain(6);
    expect(ressourcesChoisissables([])).toEqual([]);
  });
});

describe('AUT-14 : ressourceAffichee', () => {
  const choix = ressourcesChoisissables(ANNUAIRE);
  const adminNonRessource = { id: 6, est_ressource: false };
  const adminRessource = { id: 5, est_ressource: true };

  it('paramètre dans la liste : gardé, sans correction', () => {
    expect(ressourceAffichee('3', choix, adminNonRessource)).toEqual({
      ressource: 3,
      corrigee: false,
    });
  });
  it('paramètre absent : soi si ressource, sinon aucune ; sans correction', () => {
    expect(ressourceAffichee(null, choix, adminRessource)).toEqual({
      ressource: 5,
      corrigee: false,
    });
    expect(ressourceAffichee(null, choix, adminNonRessource)).toEqual({
      ressource: null,
      corrigee: false,
    });
  });
  it('paramètre inconnu, non numérique, non ressource ou inactif : défaut, corrigé', () => {
    for (const param of ['999', 'abc', '', '2', '4', '6', '1.5']) {
      expect(ressourceAffichee(param, choix, adminNonRessource), param).toEqual({
        ressource: null,
        corrigee: true,
      });
    }
    expect(ressourceAffichee('4', choix, adminRessource)).toEqual({
      ressource: 5,
      corrigee: true,
    });
  });
});

describe('AUT-15 : adresseImputations', () => {
  it('sans ressource', () => {
    expect(adresseImputations('2026-01-12', null)).toBe('/imputations?semaine=2026-01-12');
  });
  it('avec ressource', () => {
    expect(adresseImputations('2026-01-12', 5)).toBe('/imputations?semaine=2026-01-12&ressource=5');
  });
});

describe('AUT-16 : titreFeuille', () => {
  it('soi : titre inchangé ; autrui : « de <nom> »', () => {
    expect(titreFeuille('Alice 4B', true)).toBe('Feuille de temps');
    expect(titreFeuille('Alice 4B', false)).toBe('Feuille de temps de Alice 4B');
  });
});
