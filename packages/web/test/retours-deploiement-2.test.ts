// Retours du déploiement 2 (D-235) : RD2-1 (aides de la durée par mode, SPEC §6 « Charge lisible » 5)
// et RD2-2 (aucun libellé « (jours) » ni « (jours ouvrés) » dans packages/web/src).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aideDureeDuMode } from '../src/champsActivite';

// Valeurs recopiées de SPEC §6 « Charge lisible » 5.
const OUI = 'Effet sur le planning : oui (jours ouvrés).';
const SANS_RESSOURCE =
  'Effet sur le planning : seulement sans ressource assignée (longueur de la barre, jours ouvrés).';

describe('RD2-1 : aideDureeDuMode', () => {
  const attendu: Record<string, string | null> = {
    FDUR: OUI,
    DDUR: OUI,
    ASAP: SANS_RESSOURCE,
    START: SANS_RESSOURCE,
    STARR: SANS_RESSOURCE,
    ALAP: SANS_RESSOURCE,
    REGUL: null,
    MAN: null,
    INCONNU: null,
  };
  for (const [mode, aide] of Object.entries(attendu)) {
    it(`${mode} : ${aide ?? 'aucune aide'}`, () => {
      expect(aideDureeDuMode(mode)).toBe(aide);
    });
  }
});

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    return statSync(chemin).isDirectory() ? fichiers(chemin) : [chemin];
  });
}

describe('RD2-2-r1 : aucun libellé « (jours) » ni « (jours ouvrés) »', () => {
  it('packages/web/src', () => {
    const racine = join(__dirname, '..', 'src');
    const trouves = fichiers(racine)
      .filter((f) => /\.(tsx?|css)$/.test(f))
      .filter((f) => {
        // Les aides « Effet sur le planning : … » (SPEC §6 « Charge lisible » 5) ne sont pas des libellés (D-236).
        const texte = readFileSync(f, 'utf8').replace(/Effet sur le planning[^'"`\n]*/g, '');
        return texte.includes('(jours)') || texte.includes('(jours ouvrés)');
      });
    expect(trouves).toEqual([]);
  });
});
