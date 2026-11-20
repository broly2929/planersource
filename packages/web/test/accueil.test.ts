import { describe, expect, it } from 'vitest';
import { calculerPlage } from '../src/gantt/plage.js';
import { joursAccueil, projetsAccueil } from '../src/accueil/logique.js';

/*
 * G2 (D-080, D-081) : règles pures de l'Accueil. `projetsAccueil` renvoie les racines affichées :
 * projets ordinaires non clos, descendance d'un projet clos masquée, puis règle D-079 (2) (tri par code
 * sans casse). `joursAccueil` donne l'entrée de `calculerPlage` pour les projets affichés.
 */
interface P {
  id: number;
  code: string;
  nom: string;
  parent_id: number | null;
  peut_ecrire: boolean;
  est_modele: boolean;
  clos: boolean;
  date_debut: string;
  debut_planifie: string | null;
  fin_planifiee: string | null;
}

const projet = (id: number, code: string, parent: number | null, extra: Partial<P> = {}): P => ({
  id,
  code,
  nom: `Nom ${code}`,
  parent_id: parent,
  peut_ecrire: true,
  est_modele: false,
  clos: false,
  date_debut: '2027-01-04',
  debut_planifie: null,
  fin_planifiee: null,
  ...extra,
});

const codes = (l: { code: string }[]) => l.map((p) => p.code);

describe('projetsAccueil', () => {
  it('ACC-1 : un modèle n’est jamais une racine affichée', () => {
    const l = [projet(1, 'M', null, { est_modele: true }), projet(2, 'P', null)];
    expect(codes(projetsAccueil(l))).toEqual(['P']);
  });

  it('ACC-2 : un projet clos est absent, un projet non clos voisin est présent', () => {
    const l = [projet(1, 'CLOS', null, { clos: true }), projet(2, 'OUVERT', null)];
    expect(codes(projetsAccueil(l))).toEqual(['OUVERT']);
  });

  it('ACC-3 : la descendance d’un projet clos est absente, sans promotion en racine', () => {
    const l = [
      projet(1, 'CLOS', null, { clos: true }),
      projet(2, 'FILS', 1),
      projet(3, 'PETIT', 2),
      projet(4, 'AUTRE', null),
    ];
    expect(codes(projetsAccueil(l))).toEqual(['AUTRE']);
  });

  it('ACC-4 : un projet dont le parent n’est pas visible est une racine affichée', () => {
    const l = [projet(5, 'SP', 99), projet(6, 'R', null)];
    expect(codes(projetsAccueil(l))).toEqual(['R', 'SP']);
  });

  it('ACC-5 : un sous-projet d’un projet ouvert n’est pas une racine ; tri par code sans casse', () => {
    const l = [projet(1, 'b', null), projet(2, 'A', null), projet(3, 'c', null), projet(4, '0', 1)];
    expect(codes(projetsAccueil(l))).toEqual(['A', 'b', 'c']);
  });
});

describe('joursAccueil', () => {
  const a = projet(1, 'A', null, {
    date_debut: '2027-01-04',
    debut_planifie: '2027-01-06',
    fin_planifiee: '2027-02-03',
  });
  const b = projet(2, 'B', null, { date_debut: '2027-01-11' });

  it('ACC-6 : début du projet le plus tôt et dates planifiées ; un projet non calculé n’y contribue pas', () => {
    expect(joursAccueil([a, b])).toEqual({
      debutProjet: '2027-01-04',
      jours: ['2027-01-06', '2027-02-03'],
    });
  });

  it('ACC-7 : aucun projet calculé, ou aucun projet', () => {
    expect(joursAccueil([b])).toEqual({ debutProjet: '2027-01-11', jours: [] });
    expect(joursAccueil([])).toEqual({ debutProjet: null, jours: [] });
  });

  it('ACC-8 : plage de l’Accueil', () => {
    expect(calculerPlage(joursAccueil([a, b]))).toEqual({
      debut: '2027-01-04',
      fin: '2027-02-21',
    });
  });
});
