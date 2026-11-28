import { describe, expect, it } from 'vitest';
import {
  avecColonne,
  avecLargeur,
  bornerColonne,
  bornerLargeur,
  colonnesAffichees,
  colonnesDuMenu,
  ecrireDisposition,
  largeurParDefaut,
  lireDisposition,
  type Disposition,
} from '../src/gantt/disposition.js';

/*
 * gantt-colonnes, tranche 1 (D-212 (2) et (5), SPEC §6 « Colonnes et défilement ») : valeurs pures du
 * séparateur et mémorisation dans le stockage du navigateur. Bornes recopiées de D-212 : 200 px au moins,
 * 80 % de la vue au plus ; défaut : 40 % de la vue, relevé au minimum du critère D-069.
 */

const stockage = (valeurs: Record<string, string> = {}) => ({
  valeurs,
  getItem: (cle: string) => valeurs[cle] ?? null,
  setItem: (cle: string, valeur: string) => {
    valeurs[cle] = valeur;
  },
});
const enPanne = {
  getItem: (): string | null => {
    throw new Error('stockage indisponible');
  },
  setItem: (): void => {
    throw new Error('stockage indisponible');
  },
};

describe('Largeur du tableau (GCO-1, GCO-2)', () => {
  it('GCO-1 : 40 % de la vue, relevé au minimum mesuré, borné', () => {
    expect(largeurParDefaut(1166, 0)).toBe(466);
    expect(largeurParDefaut(1166, 480)).toBe(480);
    expect(largeurParDefaut(750, 480)).toBe(480);
    expect(largeurParDefaut(750, 700)).toBe(600);
    expect(largeurParDefaut(400, 0)).toBe(200);
  });

  it('GCO-2 : 200 px au moins, 80 % de la vue au plus', () => {
    expect(bornerLargeur(150, 1000)).toBe(200);
    expect(bornerLargeur(500, 1000)).toBe(500);
    expect(bornerLargeur(900, 1000)).toBe(800);
    expect(bornerLargeur(900, 751)).toBe(600);
  });
});

describe('Mémorisation (GCO-3, GCO-4)', () => {
  it('GCO-3 : lecture de la clé de la vue ; absente, illisible ou stockage en panne : {}', () => {
    expect(
      lireDisposition(stockage({ 'planersource.gantt.projet': '{"tableau":320}' }), 'projet'),
    ).toEqual({
      tableau: 320,
    });
    expect(
      lireDisposition(stockage({ 'planersource.gantt.projet': '{"tableau":320}' }), 'accueil'),
    ).toEqual({});
    expect(
      lireDisposition(stockage({ 'planersource.gantt.accueil': '{pas du json' }), 'accueil'),
    ).toEqual({});
    expect(
      lireDisposition(
        stockage({ 'planersource.gantt.ressource': '{"tableau":"large"}' }),
        'ressource',
      ),
    ).toEqual({});
    expect(
      lireDisposition(stockage({ 'planersource.gantt.ressource': '42' }), 'ressource'),
    ).toEqual({});
    expect(lireDisposition(enPanne, 'projet')).toEqual({});
    expect(lireDisposition(null, 'projet')).toEqual({});
  });

  it('GCO-4 : écriture du JSON sous la clé de la vue ; stockage en panne : aucune exception', () => {
    const s = stockage();
    ecrireDisposition(s, 'accueil', { tableau: 512 });
    expect(JSON.parse(s.valeurs['planersource.gantt.accueil']!)).toEqual({ tableau: 512 });
    expect(() => ecrireDisposition(enPanne, 'projet', { tableau: 300 })).not.toThrow();
    expect(() => ecrireDisposition(null, 'projet', { tableau: 300 })).not.toThrow();
  });
});

/*
 * gantt-colonnes, tranche 2 (D-212 (4), (5), D-216) : colonnes au choix, largeurs des colonnes. Listes et
 * ordres recopiés de D-212 (4) et D-216 (1), (7) ; minimum 48 px, 120 px pour la colonne du nom.
 */
describe('Colonnes (GCO-5 à GCO-9)', () => {
  it('GCO-5 : colonnes et largeurs lues pour les identifiants connus ; le reste ignoré', () => {
    const brut = JSON.stringify({
      tableau: 400,
      colonnes: { debut: false, inconnue: false, nom: false, charge: 'non', drapeaux: true },
      largeurs: { nom: 180, inconnue: 300, fin: 'large', debut: 64 },
    });
    expect(lireDisposition(stockage({ 'planersource.gantt.projet': brut }), 'projet')).toEqual({
      tableau: 400,
      colonnes: { debut: false, drapeaux: true },
      largeurs: { nom: 180, debut: 64 },
    });
    // Identifiants propres à chaque vue : « reel » existe sur l'Accueil, pas sur le Gantt d'un projet.
    const reel = JSON.stringify({ colonnes: { reel: true, code: false }, largeurs: { code: 90 } });
    expect(lireDisposition(stockage({ 'planersource.gantt.accueil': reel }), 'accueil')).toEqual({
      colonnes: { reel: true },
      largeurs: { code: 90 },
    });
    expect(lireDisposition(stockage({ 'planersource.gantt.projet': reel }), 'projet')).toEqual({});
    const ressource = JSON.stringify({ colonnes: { activite: false, reste: false }, largeurs: [] });
    expect(
      lireDisposition(stockage({ 'planersource.gantt.ressource': ressource }), 'ressource'),
    ).toEqual({ colonnes: { reste: false } });
    expect(
      lireDisposition(
        stockage({ 'planersource.gantt.projet': '{"colonnes":null,"largeurs":{"nom":null}}' }),
        'projet',
      ),
    ).toEqual({});
  });

  it('GCO-6-r3 : colonnes affichées, défauts et réglages, ordre fixe', () => {
    // Défauts de D-227 (B) : Début et Fin seulement parmi les colonnes au choix.
    const toutes = {
      planification: true,
      charge: true,
      vendu: true,
      marge: true,
      avancement: true,
      drapeaux: true,
    };
    expect(colonnesAffichees('projet', {}, { vendu: true })).toEqual([
      'wbs',
      'nom',
      'debut',
      'fin',
      'ressources',
    ]);
    expect(colonnesAffichees('projet', {}, { vendu: false })).toEqual([
      'wbs',
      'nom',
      'debut',
      'fin',
      'ressources',
    ]);
    expect(colonnesAffichees('projet', { colonnes: toutes }, { vendu: true })).toEqual([
      'wbs',
      'nom',
      'planification',
      'debut',
      'fin',
      'ressources',
      'charge',
      'vendu',
      'marge',
      'avancement',
      'drapeaux',
    ]);
    expect(colonnesAffichees('projet', { colonnes: toutes }, { vendu: false })).toEqual([
      'wbs',
      'nom',
      'planification',
      'debut',
      'fin',
      'ressources',
      'charge',
      'avancement',
      'drapeaux',
    ]);
    expect(
      colonnesAffichees(
        'projet',
        { colonnes: { ...toutes, debut: false, drapeaux: false } },
        { vendu: true },
      ),
    ).toEqual([
      'wbs',
      'nom',
      'planification',
      'fin',
      'ressources',
      'charge',
      'vendu',
      'marge',
      'avancement',
    ]);
    expect(colonnesAffichees('accueil', {}, { vendu: true })).toEqual([
      'code',
      'nom',
      'debut',
      'fin',
      'ressources',
    ]);
    expect(
      colonnesAffichees(
        'accueil',
        {
          colonnes: {
            marge: true,
            charge: true,
            reel: true,
            avancement: true,
            vendu: true,
            drapeaux: true,
          },
        },
        { vendu: true },
      ),
    ).toEqual([
      'code',
      'nom',
      'debut',
      'fin',
      'ressources',
      'charge',
      'avancement',
      'reel',
      'vendu',
      'marge',
      'drapeaux',
    ]);
    expect(colonnesAffichees('ressource', {}, { vendu: false })).toEqual([
      'projet',
      'activite',
      'debut',
      'fin',
    ]);
    expect(
      colonnesAffichees(
        'ressource',
        { colonnes: { assigne: false, reel: true, reste: true, drapeaux: true } },
        { vendu: false },
      ),
    ).toEqual(['projet', 'activite', 'debut', 'fin', 'reel', 'reste', 'drapeaux']);
  });

  it('GCO-7-r4 : colonnes du menu, ordre fixe, sans les colonnes toujours affichées', () => {
    const titres = (v: Parameters<typeof colonnesDuMenu>[0], vendu: boolean) =>
      colonnesDuMenu(v, { vendu }).map((c) => c.titre);
    expect(titres('projet', true)).toEqual([
      'Planification',
      'Début',
      'Fin',
      'Ressources',
      'Charge',
      'Vendu',
      'Marge',
      'Avancement',
      'OTP',
      'Coût planifié',
      'Coût réel',
      'Notes',
      'Drapeaux',
    ]);
    expect(titres('projet', false)).toEqual([
      'Planification',
      'Début',
      'Fin',
      'Ressources',
      'Charge',
      'Avancement',
      'OTP',
      'Notes',
      'Drapeaux',
    ]);
    expect(titres('accueil', true)).toEqual([
      'Début',
      'Fin',
      'Ressources',
      'Charge',
      'Avancement',
      'Réel',
      'Vendu',
      'Marge',
      'OTP',
      'Coût planifié',
      'Coût réel',
      'Notes',
      'Drapeaux',
    ]);
    expect(titres('ressource', false)).toEqual([
      'Début',
      'Fin',
      'Assigné',
      'Réel',
      'Reste',
      'Drapeaux',
    ]);
    expect(colonnesDuMenu('projet', { vendu: true })[0]).toEqual({
      id: 'planification',
      titre: 'Planification',
    });
  });

  it('GCO-8 : largeur d’une colonne arrondie, au moins 48 px, 120 px pour la colonne du nom', () => {
    expect(bornerColonne('projet', 'debut', 30)).toBe(48);
    expect(bornerColonne('projet', 'debut', 80.4)).toBe(80);
    expect(bornerColonne('projet', 'nom', 100)).toBe(120);
    expect(bornerColonne('projet', 'wbs', 50)).toBe(50);
    expect(bornerColonne('accueil', 'nom', 119.6)).toBe(120);
    expect(bornerColonne('accueil', 'code', 47)).toBe(48);
    expect(bornerColonne('ressource', 'activite', 64)).toBe(120);
    expect(bornerColonne('ressource', 'projet', 64)).toBe(64);
    expect(bornerColonne('ressource', 'activite', 300)).toBe(300);
  });

  it('GCO-9 : avecColonne et avecLargeur rendent une nouvelle disposition ; masquée, la largeur reste', () => {
    const d0: Disposition = { tableau: 300 };
    const d1 = avecLargeur(d0, 'debut', 96);
    expect(d0).toEqual({ tableau: 300 });
    expect(d1).toEqual({ tableau: 300, largeurs: { debut: 96 } });
    const d2 = avecColonne(d1, 'debut', false);
    expect(d1).toEqual({ tableau: 300, largeurs: { debut: 96 } });
    expect(d2).toEqual({ tableau: 300, colonnes: { debut: false }, largeurs: { debut: 96 } });
    const d3 = avecColonne(d2, 'debut', true);
    expect(d3).toEqual({ tableau: 300, colonnes: { debut: true }, largeurs: { debut: 96 } });
    const d4 = avecLargeur(d3, 'debut', undefined);
    expect(d4).toEqual({ tableau: 300, colonnes: { debut: true }, largeurs: {} });
    expect(d3.largeurs).toEqual({ debut: 96 });
  });
});

/*
 * colonne-ressources (D-238, SPEC §6 « Colonne Ressources » points 1 et 7, « Colonnes et défilement »
 * point 5) : colonne `ressources` juste après `fin`, cochée par défaut dans le Gantt d'un projet et
 * l'Accueil, absente du planning d'une ressource ; une clé absente du choix enregistré vaut le défaut.
 */
describe('Colonne Ressources (CRS-4)', () => {
  it('CRS-4 : défauts des deux vues, planning d’une ressource sans la colonne, choix enregistré', () => {
    expect(colonnesAffichees('projet', {}, { vendu: true })).toEqual([
      'wbs',
      'nom',
      'debut',
      'fin',
      'ressources',
    ]);
    expect(colonnesAffichees('accueil', {}, { vendu: true })).toEqual([
      'code',
      'nom',
      'debut',
      'fin',
      'ressources',
    ]);
    expect(colonnesAffichees('ressource', {}, { vendu: true })).not.toContain('ressources');
    expect(colonnesDuMenu('ressource', { vendu: true }).map((c) => c.id)).not.toContain(
      'ressources',
    );
    // Menu : « Ressources » juste après « Fin ».
    for (const vue of ['projet', 'accueil'] as const) {
      const ids = colonnesDuMenu(vue, { vendu: true }).map((c) => c.id);
      expect(ids[ids.indexOf('fin') + 1]).toBe('ressources');
      expect(colonnesDuMenu(vue, { vendu: true }).find((c) => c.id === 'ressources')?.titre).toBe(
        'Ressources',
      );
    }
    // Choix enregistré sans clé `ressources` : affichée ; `ressources: false` : masquée.
    const sansCle = lireDisposition(
      stockage({ 'planersource.gantt.projet': '{"colonnes":{"charge":true}}' }),
      'projet',
    );
    expect(colonnesAffichees('projet', sansCle, { vendu: true })).toEqual([
      'wbs',
      'nom',
      'debut',
      'fin',
      'ressources',
      'charge',
    ]);
    const masquee = lireDisposition(
      stockage({ 'planersource.gantt.accueil': '{"colonnes":{"ressources":false}}' }),
      'accueil',
    );
    expect(masquee).toEqual({ colonnes: { ressources: false } });
    expect(colonnesAffichees('accueil', masquee, { vendu: true })).toEqual([
      'code',
      'nom',
      'debut',
      'fin',
    ]);
    // Largeur par défaut 96 px, minimum 48 px (point 7).
    expect(bornerColonne('projet', 'ressources', 10)).toBe(48);
    expect(bornerColonne('projet', 'ressources', 96)).toBe(96);
  });
});
