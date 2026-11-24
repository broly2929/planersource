import { afterEach, describe, expect, it, vi } from 'vitest';
import { instantane, modifie, type ChampBrut } from '../src/components/garde-dialogue.js';

/*
 * Confirmation à la fermeture des dialogues-formulaires (D-188). Signatures :
 *   ChampBrut = { id, type, value, checked, disabled }  (vue d'un élément de formulaire)
 *   instantane(champs, dialogue, strict = true) → Record<id, string | boolean>
 *     ignore les champs désactivés et les types button, submit, reset, hidden, image ; case : `checked`, sinon `value` ;
 *     strict : champ actif sans id ou id en double → Error explicite (dialogue et champ, jamais la valeur) ;
 *     non strict : champ fautif ignoré, aucune erreur
 *   modifie(reference | null, courant) → boolean ; référence nulle = false ; clé présente d'un seul côté = true
 */

const champ = (id: string, value = '', extra: Partial<ChampBrut> = {}): ChampBrut => ({
  id,
  type: 'text',
  value,
  checked: false,
  disabled: false,
  ...extra,
});

afterEach(() => vi.restoreAllMocks());

describe('GDL-1 : modifie', () => {
  const ref = instantane([champ('a', 'x'), champ('b', '1')], 'D');
  it('référence nulle = non modifié', () => {
    expect(modifie(null, instantane([champ('a', 'changé')], 'D'))).toBe(false);
  });
  it('instantanés égaux = non modifié', () => {
    expect(modifie(ref, instantane([champ('a', 'x'), champ('b', '1')], 'D'))).toBe(false);
  });
  it('valeur changée = modifié ; remise à l’initiale = non modifié', () => {
    expect(modifie(ref, instantane([champ('a', 'y'), champ('b', '1')], 'D'))).toBe(true);
    expect(modifie(ref, instantane([champ('a', 'x'), champ('b', '1')], 'D'))).toBe(false);
  });
  it('clé ajoutée ou retirée = modifié', () => {
    expect(modifie(ref, instantane([champ('a', 'x'), champ('b', '1'), champ('c')], 'D'))).toBe(
      true,
    );
    expect(modifie(ref, instantane([champ('a', 'x')], 'D'))).toBe(true);
  });
});

describe('GDL-2 : instantane', () => {
  it('ignore les champs désactivés, les boutons, submit, reset, hidden', () => {
    const s = instantane(
      [
        champ('a', 'x'),
        champ('d', 'v', { disabled: true }),
        champ('b', '', { type: 'button' }),
        champ('c', '', { type: 'submit' }),
        champ('r', '', { type: 'reset' }),
        champ('h', 'caché', { type: 'hidden' }),
      ],
      'D',
    );
    expect(Object.keys(s)).toEqual(['a']);
  });
  it('case : `checked` ; autres : `value`', () => {
    const s = instantane(
      [champ('k', 'on', { type: 'checkbox', checked: true }), champ('t', 'texte')],
      'D',
    );
    expect(s).toEqual({ k: true, t: 'texte' });
  });
});

describe('GDL-3 : clés d’instantané', () => {
  it('strict : champ actif sans id → erreur explicite nommant le dialogue', () => {
    expect(() =>
      instantane([champ('', 'secret-42', { type: 'password' })], 'Nouvel utilisateur'),
    ).toThrow(/Nouvel utilisateur/);
  });
  it('strict : id en double → erreur explicite nommant le dialogue et l’id', () => {
    expect(() => instantane([champ('x', '1'), champ('x', '2')], 'Nouvelle équipe')).toThrow(
      /Nouvelle équipe.*x/,
    );
  });
  it('un champ désactivé sans id ne lève rien ; non strict : champ fautif ignoré', () => {
    expect(() => instantane([champ('', '', { disabled: true })], 'D')).not.toThrow();
    expect(instantane([champ('', 'a'), champ('x', '1'), champ('x', '2')], 'D', false)).toEqual({
      x: '1',
    });
  });
});

describe('GDL-4 : mot de passe', () => {
  it('rien n’est journalisé et les erreurs ne contiennent aucune valeur', () => {
    const traces = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    const mdp = champ('p', 'mot-de-passe-très-secret', { type: 'password' });
    const ref = instantane([mdp], 'Nouvel utilisateur');
    modifie(ref, instantane([{ ...mdp, value: 'autre-secret' }], 'Nouvel utilisateur'));
    let message = '';
    try {
      instantane([{ ...mdp, id: '' }], 'Nouvel utilisateur');
    } catch (e) {
      message = (e as Error).message;
    }
    for (const t of traces) expect(t).not.toHaveBeenCalled();
    expect(message).not.toContain('mot-de-passe-très-secret');
    expect(message.length).toBeGreaterThan(0);
  });
});
