import { describe, expect, it } from 'vitest';
import { optionsListeRessource } from '../src/imputations/logique.js';
import type { EntreeAnnuaire } from '../src/annuaire.js';

/*
 * Retouche de la Feuille de temps (D-186 (1), (2)). Signature :
 *   optionsListeRessource(choix, ressource, prete) → { value, label, disabled? }[]
 *     prete = false (annuaire non chargé) : seule { '', « Chargement… », désactivée }
 *     prete = true : { '', « Choisir… », désactivée } en tête, toujours, puis une option par entrée de `choix`
 *     (value = identifiant en texte, label = nom) ; `ressource` (choisie ou null) ne change pas la liste.
 */

const choix: EntreeAnnuaire[] = [
  { id: 5, nom: 'Alice', role: 'ressource', est_ressource: true, actif: true },
  { id: 7, nom: 'Bob', role: 'ressource', est_ressource: true, actif: true },
];

describe('AUT-17 : optionsListeRessource', () => {
  it('annuaire non chargé : seule « Chargement… », désactivée', () => {
    expect(optionsListeRessource([], null, false)).toEqual([
      { value: '', label: 'Chargement…', disabled: true },
    ]);
  });
  it('chargé sans choix : « Choisir… » désactivée en tête, puis les ressources', () => {
    expect(optionsListeRessource(choix, null, true)).toEqual([
      { value: '', label: 'Choisir…', disabled: true },
      { value: '5', label: 'Alice' },
      { value: '7', label: 'Bob' },
    ]);
  });
  it('chargé avec une ressource choisie : « Choisir… » reste présente et désactivée', () => {
    expect(optionsListeRessource(choix, 7, true)).toEqual([
      { value: '', label: 'Choisir…', disabled: true },
      { value: '5', label: 'Alice' },
      { value: '7', label: 'Bob' },
    ]);
  });
});
