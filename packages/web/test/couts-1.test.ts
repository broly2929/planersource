// Lot couts, tranche 1 (D-225) : TJ-11, TJ-12, OTP-11 (SPEC §12.1 points 2, 4, 9 ; §12.2 point 7).
import { describe, expect, it } from 'vitest';
import {
  aideOtp,
  analyserMontant,
  formatMontant,
  heriteDe,
  otpSaisi,
  tauxEnVigueur,
} from '../src/couts';

const NBSP = ' ';

describe('couts-1, fonctions du web', () => {
  it('TJ-11 : tauxEnVigueur : début ≤ d ≤ fin, fin vide, hors période et trou → null', () => {
    const p = [
      { debut: '2027-01-01', fin: '2027-01-10', montant: 600 },
      { debut: '2027-02-01', fin: null, montant: 700 },
    ];
    expect(tauxEnVigueur(p, '2027-01-01')).toBe(600);
    expect(tauxEnVigueur(p, '2027-01-10')).toBe(600);
    expect(tauxEnVigueur(p, '2027-01-11')).toBeNull();
    expect(tauxEnVigueur(p, '2026-12-31')).toBeNull();
    expect(tauxEnVigueur(p, '2027-02-01')).toBe(700);
    expect(tauxEnVigueur(p, '2099-12-31')).toBe(700);
    expect(tauxEnVigueur([], '2027-01-01')).toBeNull();
  });

  it('TJ-12 : formatMontant et analyserMontant', () => {
    expect(formatMontant(600)).toBe(`600,00${NBSP}€`);
    expect(formatMontant(1234.5)).toBe(`1${NBSP}234,50${NBSP}€`);
    expect(formatMontant(999999.99)).toBe(`999${NBSP}999,99${NBSP}€`);
    expect(formatMontant(0.5)).toBe(`0,50${NBSP}€`);
    expect(analyserMontant('600')).toBe(600);
    expect(analyserMontant(' 1234,5 ')).toBe(1234.5);
    expect(analyserMontant('600.25')).toBe(600.25);
    expect(analyserMontant('999999,99')).toBe(999999.99);
    for (const t of ['', '0', '0,00', '-1', '1000000', '600,001', '.5', '5.', 'abc', '1 234']) {
      expect(analyserMontant(t), t).toBeNull();
    }
  });

  it('OTP-11 : aideOtp : projet, activité, projet illisible, rien si propre ou aucune', () => {
    expect(
      aideOtp({
        otp: null,
        otp_effectif: 'F-1',
        otp_source: { type: 'projet', id: 1, libelle: 'PRJ' },
      }),
    ).toBe('Hérité de PRJ : F-1');
    expect(
      aideOtp({
        otp: null,
        otp_effectif: 'F-2',
        otp_source: { type: 'activite', id: 3, libelle: '1.2 Conception' },
      }),
    ).toBe('Hérité de 1.2 Conception : F-2');
    expect(
      aideOtp({
        otp: null,
        otp_effectif: 'F-3',
        otp_source: { type: 'projet', id: null, libelle: null },
      }),
    ).toBe("Hérité d'un projet parent : F-3");
    expect(aideOtp({ otp: 'P', otp_effectif: 'P', otp_source: null })).toBeNull();
    expect(aideOtp({ otp: null, otp_effectif: null, otp_source: null })).toBeNull();
    // heriteDe : enfant sans valeur propre sous un parent (aide à la création)
    const src = { type: 'projet' as const, id: 1, libelle: 'R' };
    expect(
      heriteDe({ id: 5, otp: 'P', otp_effectif: 'P', otp_source: null }, 'projet', 'PRJ'),
    ).toEqual({
      otp: null,
      otp_effectif: 'P',
      otp_source: { type: 'projet', id: 5, libelle: 'PRJ' },
    });
    expect(
      heriteDe({ id: 9, otp: 'A', otp_effectif: 'A', otp_source: null }, 'activite', '1 A'),
    ).toEqual({
      otp: null,
      otp_effectif: 'A',
      otp_source: { type: 'activite', id: 9, libelle: '1 A' },
    });
    expect(
      heriteDe({ id: 5, otp: null, otp_effectif: 'R', otp_source: src }, 'projet', 'PRJ'),
    ).toEqual({
      otp: null,
      otp_effectif: 'R',
      otp_source: src,
    });
    expect(otpSaisi('  X ')).toBe('X');
    expect(otpSaisi('   ')).toBeNull();
  });
});
