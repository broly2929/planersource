import { describe, expect, it } from 'vitest';
import {
  celluleActivite,
  celluleProjet,
  nomBarreRessource,
  optionsRessources,
  parametresRessource,
  rechercheRessource,
} from '../src/accueil/logique.js';

/*
 * Lot 6e (D-157), contrat proposé (à relire) : packages/web/src/accueil/logique.ts
 *   parametresRessource(search: URLSearchParams, ids: number[]) → { ressource: number | null, corrige: boolean }
 *   rechercheRessource(search: URLSearchParams, id: number | null) → '?…' ou '' (les autres paramètres sont gardés)
 *   optionsRessources(annuaire: EntreeAnnuaire[]) → { id, nom }[]
 *   nomBarreRessource(ligne), celluleProjet(ligne), celluleActivite(ligne) → texte
 * Valeurs attendues recopiées de D-157 (5) et (6).
 */

const q = (s: string) => new URLSearchParams(s);

describe('Accueil : planning d’une ressource (lot 6e, D-157)', () => {
  it('GEO-49 : parametresRessource : valeur valide, absente, invalide, absente de la liste', () => {
    expect(parametresRessource(q('?ressource=5'), [3, 5])).toEqual({
      ressource: 5,
      corrige: false,
    });
    expect(parametresRessource(q(''), [3, 5])).toEqual({ ressource: null, corrige: false });
    for (const v of ['abc', '1.5', '0', '-3', '', '1e2']) {
      expect(parametresRessource(q(`?ressource=${v}`), [3, 5]), v).toEqual({
        ressource: null,
        corrige: true,
      });
    }
    expect(parametresRessource(q('?ressource=9'), [3, 5])).toEqual({
      ressource: null,
      corrige: true,
    });
    expect(parametresRessource(q('?ressource=5&zoom=jour'), [5])).toEqual({
      ressource: 5,
      corrige: false,
    });
  });

  it('GEO-50 : rechercheRessource : le zoom et les initiales sont conservés', () => {
    expect(rechercheRessource(q('?zoom=jour&initiales=1'), 7)).toBe(
      '?zoom=jour&initiales=1&ressource=7',
    );
    expect(rechercheRessource(q('?zoom=jour&ressource=7'), null)).toBe('?zoom=jour');
    expect(rechercheRessource(q(''), null)).toBe('');
    expect(rechercheRessource(q('?ressource=3'), 7)).toBe('?ressource=7');
  });

  it('GEO-51 : optionsRessources : actifs et ressources, tri sans casse, égalité par id', () => {
    const e = (id: number, nom: string, actif = true, est_ressource = true) => ({
      id,
      nom,
      role: 'ressource' as const,
      est_ressource,
      actif,
    });
    expect(
      optionsRessources([
        e(1, 'Charles'),
        e(2, 'bruno'),
        e(4, 'alice'),
        e(3, 'Alice'),
        e(5, 'Dan', false),
        e(6, 'Eve', true, false),
      ]),
    ).toEqual([
      { id: 3, nom: 'Alice' },
      { id: 4, nom: 'alice' },
      { id: 2, nom: 'bruno' },
      { id: 1, nom: 'Charles' },
    ]);
    expect(optionsRessources([])).toEqual([]);
  });

  it('GEO-52-r1 : libellés : nom de la barre, cellules Projet et Activité', () => {
    const clair = {
      assignation_id: 1,
      projet: { id: 1, code: 'P1', nom: 'Projet un' },
      activite: { id: 2, nom: 'Analyse', wbs: '1.2' },
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-06',
      charge_assignee: 2,
      charge_reelle: 0,
      reste_a_faire: 2,
      drapeaux: ['retard'],
    };
    const masquee = { ...clair, projet: null, activite: null, drapeaux: [] };
    expect(nomBarreRessource(clair)).toBe('P1 · 1.2 Analyse, du 04/01/2027 au 06/01/2027, retard');
    expect(nomBarreRessource(masquee)).toBe('Autre projet, du 04/01/2027 au 06/01/2027');
    expect(celluleProjet(clair)).toBe('P1');
    expect(celluleProjet(masquee)).toBe('Autre projet');
    expect(celluleActivite(clair)).toBe('1.2 Analyse');
    expect(celluleActivite(masquee)).toBe('—');
  });
});
