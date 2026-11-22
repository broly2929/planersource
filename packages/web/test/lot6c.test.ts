import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/api.js';
import { formaterEcartClient, analyserChargeVendue, texteTotaux } from '../src/gantt/vendu.js';
import { nomJalon } from '../src/gantt/libelles.js';
import { calculerPlage, joursClient, joursConnus } from '../src/gantt/plage.js';
import type { LigneGantt } from '../src/gantt/GanttSvg.js';
import { texteRefusCode } from '../src/screens/projet/commun.js';

/*
 * Lot 6c (D-149), contrat proposé (à relire) :
 *   gantt/vendu.ts   : analyserChargeVendue(texte) → { ok: true, valeur: number | null } | { ok: false }
 *                      texteTotaux({ charge_vendue, charge_assignee, marge, charge_reelle }) → texte de la région
 *                      formaterEcartClient(ecart: number) → « +N j », « −N j » (U+2212) ou « 0 j »
 *   gantt/libelles.ts: nomJalon(nom, date, drapeaux, client?: { date, ecart, depasse })
 *   gantt/plage.ts   : joursClient(lignes) → dates client des jalons ; joursConnus inchangée (Accueil)
 *   screens/projet/commun.tsx : texteRefusCode gagne 'activite_parente' et 'parent_vendu' (cible 'element')
 * Valeurs attendues recopiées de D-149 (7), (8) ; le moins typographique (U+2212) est celui de D-149 (8c).
 */

describe('Charge vendue saisie (D-149 (7))', () => {
  it('GEO-36 : virgule ou point, vide = null, bornes et décimales', () => {
    expect(analyserChargeVendue('12,5')).toEqual({ ok: true, valeur: 12.5 });
    expect(analyserChargeVendue('12.5')).toEqual({ ok: true, valeur: 12.5 });
    expect(analyserChargeVendue('0')).toEqual({ ok: true, valeur: 0 });
    expect(analyserChargeVendue('999999,99')).toEqual({ ok: true, valeur: 999999.99 });
    expect(analyserChargeVendue('')).toEqual({ ok: true, valeur: null });
    expect(analyserChargeVendue('   ')).toEqual({ ok: true, valeur: null });
    for (const invalide of ['-1', 'abc', '1,234', '1000000', '1e3', '1,2,3']) {
      expect(analyserChargeVendue(invalide), invalide).toEqual({ ok: false });
    }
  });
});

describe('Textes du Gantt (D-149 (8))', () => {
  it('GEO-37 : texte de la région « Totaux du projet »', () => {
    expect(texteTotaux({ charge_vendue: 10, charge_assignee: 4, marge: 6, charge_reelle: 1 })).toBe(
      'Vendu 10 j · Assigné 4 j · Marge 6 j · Réel 1 j',
    );
    expect(
      texteTotaux({ charge_vendue: 12.5, charge_assignee: 4, marge: 8.5, charge_reelle: 0 }),
    ).toBe('Vendu 12,5 j · Assigné 4 j · Marge 8,5 j · Réel 0 j');
    expect(
      texteTotaux({ charge_vendue: null, charge_assignee: 4, marge: null, charge_reelle: 0 }),
    ).toBe('Vendu — j · Assigné 4 j · Marge — j · Réel 0 j');
    expect(texteTotaux({ charge_vendue: 3, charge_assignee: 4, marge: -1, charge_reelle: 0 })).toBe(
      'Vendu 3 j · Assigné 4 j · Marge −1 j · Réel 0 j',
    );
  });

  it('GEO-38 : texte d’écart client', () => {
    expect(formaterEcartClient(2)).toBe('+2 j');
    expect(formaterEcartClient(-3)).toBe('−3 j');
    expect(formaterEcartClient(0)).toBe('0 j');
  });

  it('GEO-39 : nom accessible d’un jalon avec date client', () => {
    expect(
      nomJalon('Jalon', '2027-01-08', [], { date: '2027-01-06', ecart: 2, depasse: true }),
    ).toBe('Jalon, le 08/01/2027, date client 06/01/2027, écart +2 j, engagement client dépassé');
    expect(
      nomJalon('Jalon', '2027-01-08', ['retard'], {
        date: '2027-01-11',
        ecart: -3,
        depasse: false,
      }),
    ).toBe('Jalon, le 08/01/2027, retard, date client 11/01/2027, écart −3 j');
    expect(
      nomJalon('Jalon', '2027-01-08', [], { date: '2027-01-08', ecart: 0, depasse: false }),
    ).toBe('Jalon, le 08/01/2027, date client 08/01/2027, écart 0 j');
    expect(nomJalon('Jalon', '2027-01-08', [])).toBe('Jalon, le 08/01/2027');
  });
});

describe('Plage du Gantt et date client (D-149 (8c))', () => {
  const jalon = (id: number, dateClient: string | null): LigneGantt =>
    ({
      genre: 'element',
      element: {
        id,
        type: 'jalon',
        nom: `J${id}`,
        drapeaux: [],
        date_validee: null,
        date_planifiee: '2027-01-08',
        date_client: dateClient,
      },
    }) as unknown as LigneGantt;
  const activite = {
    genre: 'element',
    element: { id: 9, type: 'activite', nom: 'A', drapeaux: [], debut_planifie: '2027-01-04' },
  } as unknown as LigneGantt;

  it('GEO-40 : joursClient ; la plage inclut la date client ; joursConnus inchangée', () => {
    const lignes = [jalon(1, '2027-03-10'), jalon(2, null), activite];
    expect(joursClient(lignes)).toEqual(['2027-03-10']);
    expect(joursConnus(lignes)).not.toContain('2027-03-10');
    const jours = [...joursConnus(lignes), ...joursClient(lignes)];
    // 2027-03-10 est un mercredi : dimanche 14/03 plus 14 jours = 28/03.
    expect(calculerPlage({ debutProjet: '2027-01-04', jours })).toEqual({
      debut: '2027-01-04',
      fin: '2027-03-28',
    });
  });
});

describe('Textes de refus de 6c (D-149 (7))', () => {
  it('GEO-41 : activite_parente et parent_vendu pour un élément, null pour un projet', () => {
    expect(texteRefusCode(new ApiError(422, 'x', 'activite_parente'), 'element')).toBe(
      'Une activité parente ne porte pas de charge vendue.',
    );
    expect(texteRefusCode(new ApiError(422, 'x', 'parent_vendu'), 'element')).toBe(
      'Cette activité porte une charge vendue : elle ne peut pas recevoir d’enfant.',
    );
    expect(texteRefusCode(new ApiError(422, 'x', 'activite_parente'), 'projet')).toBeNull();
    expect(texteRefusCode(new ApiError(422, 'x', 'parent_vendu'), 'projet')).toBeNull();
  });
});
