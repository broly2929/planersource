import { describe, expect, it } from 'vitest';
import {
  COMMENTAIRE_MAX,
  analyserCommentaire,
  badgeProjet,
  badgesProjets,
  cibleFocus,
  codesDevalidables,
  codesValidables,
  messageRefusValidation,
  peutDevalider,
  peutRejeter,
  peutValider,
  relireListe,
  type FeuilleValidation,
  type ProjetValidation,
} from '../src/validation/logique.js';

/*
 * Lot 4c (D-135, SPEC §7 « Écran Validation ») : logique pure de l'écran Validation. Signatures :
 *   badgeProjet(projet, statutFeuille) → { texte, statut } ; statut = variante de `Badge` ('success', 'info', 'neutre')
 *   badgesProjets(feuille) → badgeProjet de chaque projet de la feuille, ordre de l'API
 *   peutValider(feuille), peutRejeter(feuille), codesValidables(feuille)
 *   analyserCommentaire(texte) → { ok, valeur (espaces de bord retirés), longueur (de valeur) } ; COMMENTAIRE_MAX = 500
 *   messageRefusValidation(statutHttp, code?) → texte de D-135 (8) ; relireListe(statutHttp, code?) → booléen
 */

const projet = (code: string, valide: boolean, peut_valider: boolean): ProjetValidation => ({
  projet_id: 1,
  projet_code: code,
  valide,
  peut_valider,
});
const feuille = (
  statut: FeuilleValidation['statut'],
  projets: ProjetValidation[],
): FeuilleValidation => ({
  feuille_id: 7,
  ressource_id: 3,
  ressource_nom: 'Alice',
  statut,
  projets,
});

describe('VFT badges de projet (D-135 (3), précision (b))', () => {
  it('VFT-1 : validé → « <code> · Validé », succès, quel que soit peut_valider et le statut', () => {
    for (const peut of [true, false]) {
      for (const statut of ['brouillon', 'soumise', 'validee', 'rejetee'] as const) {
        expect(badgeProjet(projet('P4B', true, peut), statut), `${peut} ${statut}`).toEqual({
          texte: 'P4B · Validé',
          statut: 'success',
        });
      }
    }
  });

  it('VFT-2 : soumise, non validé, peut_valider → « À valider » (info) ; brouillon ou rejetée → « <code> » neutre', () => {
    expect(badgeProjet(projet('P4B', false, true), 'soumise')).toEqual({
      texte: 'P4B · À valider',
      statut: 'info',
    });
    for (const statut of ['brouillon', 'rejetee'] as const) {
      expect(badgeProjet(projet('P4B', false, true), statut), statut).toEqual({
        texte: 'P4B',
        statut: 'neutre',
      });
    }
  });

  it('VFT-3 : non validé et non peut_valider → « <code> · Non autorisé », neutre, aussi brouillon et rejetée', () => {
    for (const statut of ['brouillon', 'soumise', 'rejetee'] as const) {
      expect(badgeProjet(projet('Q4B', false, false), statut), statut).toEqual({
        texte: 'Q4B · Non autorisé',
        statut: 'neutre',
      });
    }
  });

  it('VFT-4 : projets vide → liste vide ; ordre de l’API conservé ; statut de la feuille pris en compte', () => {
    expect(badgesProjets(feuille('soumise', []))).toEqual([]);
    expect(
      badgesProjets(feuille('soumise', [projet('Z', false, true), projet('A', true, false)])).map(
        (b) => b.texte,
      ),
    ).toEqual(['Z · À valider', 'A · Validé']);
    expect(
      badgesProjets(
        feuille('brouillon', [projet('Z', false, true), projet('A', false, false)]),
      ).map((b) => b.texte),
    ).toEqual(['Z', 'A · Non autorisé']);
  });
});

describe('VFT visibilité de Valider et Rejeter (D-135 (5), (6), (7))', () => {
  const statuts = ['brouillon', 'rejetee', 'validee'] as const;

  it('VFT-5 : peutValider', () => {
    expect(peutValider(feuille('soumise', [projet('P', false, true)]))).toBe(true);
    expect(
      peutValider(feuille('soumise', [projet('P', true, true), projet('Q', false, true)])),
    ).toBe(true);
    expect(
      peutValider(feuille('soumise', [projet('P', false, true), projet('Q', false, false)])),
    ).toBe(true);
    expect(peutValider(feuille('soumise', [projet('P', true, true)]))).toBe(false);
    expect(peutValider(feuille('soumise', [projet('P', false, false)]))).toBe(false);
    expect(peutValider(feuille('soumise', []))).toBe(false);
    for (const s of statuts) {
      expect(peutValider(feuille(s, [projet('P', false, true)])), s).toBe(false);
    }
  });

  it('VFT-6 : peutRejeter', () => {
    expect(peutRejeter(feuille('soumise', [projet('P', false, true)]))).toBe(true);
    expect(peutRejeter(feuille('soumise', [projet('P', true, true)]))).toBe(true);
    expect(
      peutRejeter(feuille('soumise', [projet('P', false, false), projet('Q', false, true)])),
    ).toBe(true);
    expect(peutRejeter(feuille('soumise', [projet('P', false, false)]))).toBe(false);
    expect(peutRejeter(feuille('soumise', []))).toBe(false);
    for (const s of statuts) {
      expect(peutRejeter(feuille(s, [projet('P', false, true)])), s).toBe(false);
    }
  });

  it('VFT-7 : codesValidables = peut_valider et non validés, ordre de l’API', () => {
    expect(
      codesValidables(
        feuille('soumise', [
          projet('Z', false, true),
          projet('Y', true, true),
          projet('X', false, false),
          projet('A', false, true),
        ]),
      ),
    ).toEqual(['Z', 'A']);
    expect(codesValidables(feuille('soumise', []))).toEqual([]);
  });
});

describe('VFT commentaire de rejet (D-135 (6), SPEC §7 API 7)', () => {
  it('VFT-8 : 1 à 500 caractères après retrait des espaces de bord', () => {
    expect(COMMENTAIRE_MAX).toBe(500);
    expect(analyserCommentaire('').ok).toBe(false);
    expect(analyserCommentaire('   ').ok).toBe(false);
    expect(analyserCommentaire('\n \t').ok).toBe(false);
    expect(analyserCommentaire('a')).toEqual({ ok: true, valeur: 'a', longueur: 1 });
    expect(analyserCommentaire('  \nabc déf \n ')).toEqual({
      ok: true,
      valeur: 'abc déf',
      longueur: 7,
    });
    expect(analyserCommentaire('a'.repeat(500)).ok).toBe(true);
    expect(analyserCommentaire(`  ${'a'.repeat(500)}  `)).toEqual({
      ok: true,
      valeur: 'a'.repeat(500),
      longueur: 500,
    });
    const trop = analyserCommentaire('a'.repeat(501));
    expect(trop.ok).toBe(false);
    expect(trop.longueur).toBe(501);
  });
});

describe('VFT erreurs de valider et rejeter (D-135 (8))', () => {
  it('VFT-9 : textes', () => {
    expect(messageRefusValidation(422, 'statut_invalide')).toBe('La feuille a changé de statut.');
    expect(messageRefusValidation(403)).toBe('Vous n’avez pas le droit d’agir sur cette feuille.');
    expect(messageRefusValidation(404)).toBe('Feuille introuvable.');
    expect(messageRefusValidation(400)).toBe('Données invalides.');
    expect(messageRefusValidation(500)).toBe('Une erreur est survenue.');
    expect(messageRefusValidation(422, 'autre_code')).toBe('Une erreur est survenue.');
    expect(messageRefusValidation(0)).toBe('Une erreur est survenue.');
  });

  it('VFT-10 : la liste est relue après 422 statut_invalide et 404 seulement', () => {
    expect(relireListe(422, 'statut_invalide')).toBe(true);
    expect(relireListe(404)).toBe(true);
    for (const [s, c] of [
      [403, undefined],
      [400, undefined],
      [500, undefined],
      [422, 'autre_code'],
      [0, undefined],
    ] as const) {
      expect(relireListe(s, c), `${s} ${c}`).toBe(false);
    }
  });
});

describe('VFT règle de focus après la relecture de la liste (D-145 (2))', () => {
  const autre = { ...feuille('soumise', [projet('Q4B', false, true)]), feuille_id: 9 };

  it('VFT-11 : bouton d’origine conservé s’il existe encore (valider ou rejeter)', () => {
    const f = feuille('soumise', [projet('P4B', false, true)]);
    expect(cibleFocus({ feuilleId: 7, action: 'valider' }, [autre, f])).toEqual({
      genre: 'bouton',
      action: 'valider',
    });
    expect(cibleFocus({ feuilleId: 7, action: 'rejeter' }, [autre, f])).toEqual({
      genre: 'bouton',
      action: 'rejeter',
    });
    // « Rejeter » reste présent même si tous les projets de l'utilisateur sont validés.
    const validee = feuille('soumise', [projet('P4B', true, true)]);
    expect(cibleFocus({ feuilleId: 7, action: 'rejeter' }, [validee])).toEqual({
      genre: 'bouton',
      action: 'rejeter',
    });
  });

  it('VFT-12 : sinon « Voir » de la même feuille', () => {
    const validee = feuille('validee', [projet('P4B', true, true)]);
    expect(cibleFocus({ feuilleId: 7, action: 'valider' }, [autre, validee])).toEqual({
      genre: 'voir',
    });
    const toutValide = feuille('soumise', [projet('P4B', true, true)]);
    expect(cibleFocus({ feuilleId: 7, action: 'valider' }, [toutValide])).toEqual({
      genre: 'voir',
    });
    const rejetee = feuille('rejetee', [projet('P4B', false, true)]);
    expect(cibleFocus({ feuilleId: 7, action: 'rejeter' }, [rejetee])).toEqual({ genre: 'voir' });
  });

  it('VFT-13 : sinon le tableau (feuille absente de la liste relue, liste vide)', () => {
    expect(cibleFocus({ feuilleId: 7, action: 'valider' }, [autre])).toEqual({ genre: 'tableau' });
    expect(cibleFocus({ feuilleId: 7, action: 'rejeter' }, [])).toEqual({ genre: 'tableau' });
  });
});

describe('VFT Dévalider (D-176, SPEC §7 « Dévalidation » point 2)', () => {
  it('VFT-14 : peutDevalider vrai pour une feuille validée et pour une soumise partiellement validée', () => {
    expect(peutDevalider(feuille('validee', [projet('P', true, true)]))).toBe(true);
    expect(
      peutDevalider(feuille('validee', [projet('P', true, true), projet('Q', true, false)])),
    ).toBe(true);
    expect(
      peutDevalider(feuille('soumise', [projet('P', true, true), projet('Q', false, true)])),
    ).toBe(true);
    expect(
      peutDevalider(feuille('soumise', [projet('P', false, false), projet('Q', true, true)])),
    ).toBe(true);
  });

  it('VFT-15 : peutDevalider faux sans validation dévalidable', () => {
    expect(peutDevalider(feuille('soumise', [projet('P', false, true)]))).toBe(false);
    expect(
      peutDevalider(feuille('soumise', [projet('P', false, true), projet('Q', false, false)])),
    ).toBe(false);
    for (const s of ['brouillon', 'rejetee'] as const) {
      expect(peutDevalider(feuille(s, [projet('P', false, true)])), s).toBe(false);
      expect(peutDevalider(feuille(s, [projet('P', true, true)])), s).toBe(false);
    }
    // Seuls projets validés non `peut_valider`.
    expect(
      peutDevalider(feuille('soumise', [projet('P', false, true), projet('Q', true, false)])),
    ).toBe(false);
    expect(peutDevalider(feuille('validee', [projet('Q', true, false)]))).toBe(false);
    expect(peutDevalider(feuille('validee', []))).toBe(false);
    expect(peutDevalider(feuille('soumise', []))).toBe(false);
  });

  it('VFT-16 : codesDevalidables = projets valide et peut_valider, ordre de l’API', () => {
    expect(
      codesDevalidables(
        feuille('validee', [
          projet('Z', true, true),
          projet('Y', true, false),
          projet('X', false, true),
          projet('A', true, true),
        ]),
      ),
    ).toEqual(['Z', 'A']);
    expect(codesDevalidables(feuille('soumise', [projet('P', false, true)]))).toEqual([]);
  });

  it('VFT-17 : refus rien_a_devalider : message et relecture de la liste', () => {
    expect(messageRefusValidation(422, 'rien_a_devalider')).toBe(
      'La feuille n’a plus de validation à retirer.',
    );
    expect(relireListe(422, 'rien_a_devalider')).toBe(true);
    // Les autres textes ne changent pas.
    expect(messageRefusValidation(422, 'statut_invalide')).toBe('La feuille a changé de statut.');
    expect(messageRefusValidation(422, 'autre_code')).toBe('Une erreur est survenue.');
    expect(relireListe(422, 'autre_code')).toBe(false);
  });

  it('VFT-18 : focus après Dévalider : bouton d’origine, sinon « Voir », sinon le tableau (D-145 (2))', () => {
    const autre = { ...feuille('soumise', [projet('Q4B', false, true)]), feuille_id: 9 };
    // Un autre projet de l'utilisateur reste validé : le bouton existe encore.
    const encore = feuille('validee', [projet('P4B', true, true), projet('Q4B', true, true)]);
    expect(cibleFocus({ feuilleId: 7, action: 'devalider' }, [autre, encore])).toEqual({
      genre: 'bouton',
      action: 'devalider',
    });
    // Plus aucune validation dévalidable : « Voir ».
    const soumise = feuille('soumise', [projet('P4B', false, true), projet('Q4B', true, false)]);
    expect(cibleFocus({ feuilleId: 7, action: 'devalider' }, [autre, soumise])).toEqual({
      genre: 'voir',
    });
    const rejetee = feuille('rejetee', [projet('P4B', false, true)]);
    expect(cibleFocus({ feuilleId: 7, action: 'devalider' }, [rejetee])).toEqual({ genre: 'voir' });
    // Feuille absente de la liste relue.
    expect(cibleFocus({ feuilleId: 7, action: 'devalider' }, [autre])).toEqual({
      genre: 'tableau',
    });
    expect(cibleFocus({ feuilleId: 7, action: 'devalider' }, [])).toEqual({ genre: 'tableau' });
  });
});
