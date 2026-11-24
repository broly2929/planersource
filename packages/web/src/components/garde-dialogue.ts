// Garde de fermeture des dialogues-formulaires (D-188) : instantané des champs et comparaison. Logique pure ;
// les valeurs restent en mémoire (jamais journalisées ni sérialisées, D-188 (10) e).

/** Vue d'un élément de formulaire. */
export interface ChampBrut {
  id: string;
  type: string;
  value: string;
  checked: boolean;
  disabled: boolean;
}

export type Instantane = Record<string, string | boolean>;

const TYPES_IGNORES = new Set(['button', 'submit', 'reset', 'hidden', 'image']);

/**
 * Instantané des champs actifs, clé = `id`. Champs désactivés et boutons ignorés ; case : `checked`, sinon
 * `value`. `strict` : champ actif sans `id` ou `id` en double : erreur qui nomme le dialogue et le champ,
 * jamais sa valeur ; sinon le champ fautif est ignoré.
 */
export function instantane(champs: ChampBrut[], dialogue: string, strict = true): Instantane {
  const resultat: Instantane = {};
  for (const c of champs) {
    if (c.disabled || TYPES_IGNORES.has(c.type)) continue;
    if (c.id === '') {
      if (strict)
        throw new Error(`Dialogue « ${dialogue} » : champ actif sans id (type ${c.type}).`);
      continue;
    }
    if (c.id in resultat) {
      if (strict) throw new Error(`Dialogue « ${dialogue} » : id de champ en double « ${c.id} ».`);
      continue;
    }
    resultat[c.id] = c.type === 'checkbox' || c.type === 'radio' ? c.checked : c.value;
  }
  return resultat;
}

/** Vrai si l'état courant diffère de la référence ; sans référence : faux ; clé d'un seul côté : différence. */
export function modifie(reference: Instantane | null, courant: Instantane): boolean {
  if (reference === null) return false;
  const cles = new Set([...Object.keys(reference), ...Object.keys(courant)]);
  for (const k of cles) {
    if (!(k in reference) || !(k in courant) || reference[k] !== courant[k]) return true;
  }
  return false;
}

/** Champs saisissables d'un conteneur du DOM (formulaire ou contenu de dialogue). */
export function champsDe(racine: ParentNode): ChampBrut[] {
  return Array.from(racine.querySelectorAll('input, select, textarea')).map((el) => {
    const champ = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    return {
      id: champ.id,
      type: champ.type,
      value: champ.value,
      checked: champ instanceof HTMLInputElement ? champ.checked : false,
      disabled: champ.disabled,
    };
  });
}
