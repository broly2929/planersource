// Aides d'AUT-E (saisie pour autrui, écran Feuille de temps, D-181 (5)). Monde de lot4b-helpers.ts.
// Contrat de phase verte (à relire, docs/state.md) : liste native de nom accessible exact « Ressource »
// (`combobox`) dans la barre d'outils, pour l'administrateur seulement ; valeur des options = identifiant
// de la ressource, au plus une option de valeur '' (invite) ; message « Choisissez une ressource. » ;
// adresse `/imputations?semaine=…&ressource=<id>` ; titre de niveau 1 « Feuille de temps de <nom> » pour
// autrui ; confirmation de D-172 inchangée.
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { monde4b } from './lot4b-helpers.js';

export const MESSAGE_CHOIX = 'Choisissez une ressource.';
export const VERROUILLEE = 'La feuille est soumise ou validée : elle n’est plus modifiable.';

export const EMAIL_ADMIN_RESSOURCE = 'admin-ressource-aut@autrui.test';

export const adresseAutrui = (semaine: string, ressource?: number | string) =>
  ressource === undefined
    ? `/imputations?semaine=${semaine}`
    : `/imputations?semaine=${semaine}&ressource=${ressource}`;

export const listeRessource = (page: Page) =>
  page.getByRole('combobox', { name: 'Ressource', exact: true });

/** Options de la liste hors invite (valeur ''), dans l'ordre de l'écran : { valeur, texte }. */
export async function optionsRessource(page: Page): Promise<{ valeur: string; texte: string }[]> {
  const options = await listeRessource(page)
    .locator('option')
    .evaluateAll((els) =>
      els.map((e) => ({ valeur: (e as HTMLOptionElement).value, texte: e.textContent ?? '' })),
    );
  return options.filter((o) => o.valeur !== '').map((o) => ({ ...o, texte: o.texte.trim() }));
}

export const titreFeuilleDe = (page: Page, nom: string) =>
  page.getByRole('heading', { name: `Feuille de temps de ${nom}`, level: 1, exact: true });

/** Requêtes vers /api/feuilles émises par la page (toutes méthodes). */
export function compterRequetesFeuilles(page: Page): { n: () => number } {
  let n = 0;
  page.on('request', (req) => {
    if (req.url().includes('/api/feuilles')) n++;
  });
  return { n: () => n };
}

/**
 * Monde d'AUT-E : monde4b (Alice 4B ressource, P4B et Q4B), plus Zoé 4B et Bob 4B (ressources, créées
 * avant Alice dans le désordre alphabétique pour Zoé), Inactif 4B (ressource désactivée) et
 * « Admin Ressource AUT » (administrateur ressource). Administrateur de l'environnement : non ressource.
 */
export async function mondeAutrui(request: APIRequestContext) {
  const m = await monde4b(request);
  const zoe = await m.api.utilisateur('Zoé 4B', 'zoe-aut@autrui.test', 'ressource', true);
  const bob = await m.api.utilisateur('Bob 4B', 'bob-aut@autrui.test', 'ressource', true);
  const inactif = await m.api.utilisateur(
    'Inactif 4B',
    'inactif-aut@autrui.test',
    'ressource',
    true,
  );
  const r = await request.patch(`/api/utilisateurs/${inactif.id}`, { data: { actif: false } });
  expect(r.ok(), `désactivation : ${r.status()}`).toBeTruthy();
  const adminRessource = await m.api.utilisateur(
    'Admin Ressource AUT',
    EMAIL_ADMIN_RESSOURCE,
    'administrateur',
    true,
  );
  return { ...m, zoe, bob, inactif, adminRessource };
}
