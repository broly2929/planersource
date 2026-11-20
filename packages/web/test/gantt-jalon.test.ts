import { describe, expect, it } from 'vitest';
import { nomJalon } from '../src/gantt/libelles.js';

/*
 * D-068 : nom accessible d'un jalon = « <nom>, le JJ/MM/AAAA » suivi de « , <drapeau> » par drapeau
 * (même règle que les barres). Signature : nomJalon(nom, date, drapeaux).
 * Les jalons n'ont pas d'état « clos » en base : un jalon en retard garde le suffixe (le retard suit le drapeau).
 */
describe('Nom accessible d’un jalon (D-068)', () => {
  it('GEO-9 : en retard, suffixe « retard »', () => {
    expect(nomJalon('Jalon', '2027-01-06', ['retard'])).toBe('Jalon, le 06/01/2027, retard');
  });

  it('GEO-9 : à l’heure, pas de suffixe', () => {
    expect(nomJalon('Jalon', '2027-01-06', [])).toBe('Jalon, le 06/01/2027');
  });
});
