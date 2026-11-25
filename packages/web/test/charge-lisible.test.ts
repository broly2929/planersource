// Charge lisible (D-220) : CHL-1 (table mode → champs, SPEC §6 « Charge lisible » 1) et CHL-2 (formats en lecture seule).
import { describe, expect, it } from 'vitest';
import { champsDuMode, texteChargeAssignee, texteMarge } from '../src/champsActivite';

describe('CHL-1 : champsDuMode', () => {
  const attendu: Record<string, [boolean, boolean, boolean]> = {
    ASAP: [false, false, true],
    START: [true, false, true],
    STARR: [true, false, true],
    ALAP: [false, true, true],
    FDUR: [true, false, true],
    DDUR: [true, false, true],
    REGUL: [true, true, false],
    MAN: [false, false, false],
  };
  for (const [mode, [debut, fin, duree]] of Object.entries(attendu)) {
    it(`${mode} : début ${debut}, fin ${fin}, durée ${duree}`, () => {
      expect(champsDuMode(mode)).toMatchObject({ debut, fin, duree });
    });
  }
  it('aide de la durée pour ASAP, START, STARR et ALAP seulement', () => {
    for (const mode of ['ASAP', 'START', 'STARR', 'ALAP']) {
      expect(champsDuMode(mode).aideDuree).toBe(true);
    }
    for (const mode of ['FDUR', 'DDUR', 'REGUL', 'MAN']) {
      expect(champsDuMode(mode).aideDuree).toBe(false);
    }
  });
  it('mode inconnu : aucun champ', () => {
    expect(champsDuMode('XYZ')).toEqual({
      debut: false,
      fin: false,
      duree: false,
      aideDuree: false,
    });
  });
});

describe('CHL-2 : formats en lecture seule', () => {
  it('charge assignée : « X j » à virgule décimale', () => {
    expect(texteChargeAssignee(3.5)).toBe('3,5 j');
    expect(texteChargeAssignee(0)).toBe('0 j');
    expect(texteChargeAssignee(1)).toBe('1 j');
  });
  it('marge : « — » si null, signe moins typographique et indicateur si négative', () => {
    expect(texteMarge(null)).toEqual({ texte: '—', negative: false });
    expect(texteMarge(2)).toEqual({ texte: '2 j', negative: false });
    expect(texteMarge(0)).toEqual({ texte: '0 j', negative: false });
    expect(texteMarge(-2)).toEqual({ texte: '−2 j', negative: true });
    expect(texteMarge(-0.5)).toEqual({ texte: '−0,5 j', negative: true });
  });
});
