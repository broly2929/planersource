// Aides du lot 4c (écran Validation, D-135). Monde de lot4b-helpers.ts (P4B chef « Chef P 4B » avec
// « Tâche A » d'Alice ; Q4B chef « Chef Q 4B » avec « Tâche B » d'Alice), plus des ressources sur P4B.
// Contrat de phase verte (à relire, docs/state.md) : lien « Validation » de la Navigation principale ; titre
// de niveau 1 « Validation des feuilles de temps » ; tableau nommé « Feuilles de temps à valider »
// (légende masquée), une ligne `tbody tr` par feuille dont une cellule contient le nom de la ressource ;
// badges de statut et de projet en texte exact ; boutons « Voir la feuille de <ressource> », « Valider la
// feuille de <ressource> », « Rejeter la feuille de <ressource> » ; dialogues par `role="dialog"` ; champ
// « Commentaire » (textarea sans maxlength) et compteur « <n> / 500 » (n = longueur après retrait des
// espaces de bord) ; succès en `role="status"`, erreurs en `role="alert"`.
import {
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
  type PlaywrightWorkerArgs,
} from '@playwright/test';
import pg from 'pg';
import {
  S,
  agirApi,
  imputerApi,
  jS,
  monde4b,
  sessionDe,
  type Imputation,
} from './lot4b-helpers.js';

export const EMAIL_CHEF_Q = 'chef-q-4b@lot4b.test';
export const EMAIL_ALICE_4C = 'alice-4b@lot4b.test';
export const EMAIL_BOB = 'bob-4c@lot4c.test';
export const EMAIL_CARLA = 'carla-4c@lot4c.test';
export const EMAIL_DINA = 'dina-4c@lot4c.test';

export const adresseValidation = (semaine?: string) =>
  semaine === undefined ? '/validation' : `/validation?semaine=${semaine}`;

export const LIBELLE_S = 'Semaine du 12/01/2026 au 18/01/2026';
export const VIDE_SEMAINE = 'Aucune feuille de temps pour cette semaine.';

export const tableauValidation = (page: Page) =>
  page.getByRole('table', { name: 'Feuilles de temps à valider', exact: true });
export const ligneValidation = (page: Page, ressource: string) =>
  tableauValidation(page).locator('tbody tr').filter({ hasText: ressource });
export const boutonDe = (scope: Page | Locator, nom: string) =>
  scope.getByRole('button', { name: nom, exact: true });
export const alerte = (page: Page, texte: string) =>
  page.getByRole('alert').filter({ hasText: texte });
export const statutOk = (page: Page, texte: string) =>
  page.getByRole('status').filter({ hasText: texte });

/**
 * Refus 422 ou 404 (D-145 (2)) : dialogue fermé, alerte `role="alert"` hors de tout dialogue, entièrement
 * au-dessus du tableau « Feuilles de temps à valider ».
 */
export async function attendreAlerteAuDessus(page: Page, texte: string): Promise<void> {
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const a = alerte(page, texte);
  await expect(a).toBeVisible();
  await expect(a).toHaveCount(1);
  const ba = await a.boundingBox();
  const bt = await tableauValidation(page).boundingBox();
  if (!ba || !bt) throw new Error('alerte ou tableau sans boîte');
  expect(
    ba.y + ba.height,
    `bas de l'alerte ${ba.y + ba.height}, haut du tableau ${bt.y}`,
  ).toBeLessThanOrEqual(bt.y);
}

/** Ouvre l'écran Validation (horloge du navigateur déjà figée) et attend son titre. */
export async function ouvrirValidation(page: Page, semaine: string = S): Promise<void> {
  await page.goto(adresseValidation(semaine));
  await expect(
    page.getByRole('heading', { name: 'Validation des feuilles de temps', level: 1 }),
  ).toBeVisible();
}

// --- Monde ---

export async function monde4c(request: APIRequestContext) {
  const m = await monde4b(request);
  /** Ressource affectée à P4B avec sa propre activité assignée (2 j). */
  const ressourceSurP = async (nom: string, email: string, activite: string) => {
    const r = await m.api.utilisateur(nom, email, 'ressource', true);
    await m.api.affectation(m.p.id, r.id);
    const a = await m.api.activite(m.p.id, activite);
    const sa = await m.api.assignation(a.id, r.id, 2);
    return { id: r.id, email, assignation: sa.id };
  };
  return { ...m, ressourceSurP };
}

/** Alice impute (A : lundi 1,5 ; B : mardi 1) et soumet. Renvoie l'id de la feuille. */
export async function soumettreAlice(
  playwright: PlaywrightWorkerArgs['playwright'],
  m: { sa: { id: number }; sb: { id: number } },
): Promise<{ id: number; ctx: APIRequestContext }> {
  const ctx = await sessionDe(playwright, EMAIL_ALICE_4C);
  const f = await imputerApi(ctx, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 1.5 }] },
    { assignation_id: m.sb.id, imputations: [{ jour: jS(13), charge: 1 }] },
  ]);
  await agirApi(ctx, f.feuille.id!, 'soumettre');
  return { id: f.feuille.id!, ctx };
}

/** Une ressource impute `imputations` sur son assignation ; `soumettre` la soumet. Renvoie l'id. */
export async function imputerEtSoumettre(
  playwright: PlaywrightWorkerArgs['playwright'],
  email: string,
  assignation: number,
  { soumettre = true, imputations = [{ jour: jS(12), charge: 1 }] as Imputation[] } = {},
): Promise<number> {
  const ctx = await sessionDe(playwright, email);
  const f = await imputerApi(ctx, S, [{ assignation_id: assignation, imputations }]);
  if (soumettre) await agirApi(ctx, f.feuille.id!, 'soumettre');
  return f.feuille.id!;
}

// --- Base (lecture et préparation par SQL) ---

async function avecBase<T>(f: (c: pg.Client) => Promise<T>): Promise<T> {
  const url = process.env.TEST_DATABASE_URL ?? '';
  if (!url || !new URL(url).pathname.slice(1).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL doit désigner une base dont le nom finit par _test');
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await f(client);
  } finally {
    await client.end();
  }
}

export interface EtatFeuille {
  statut: string;
  commentaire: string | null;
  validations: { projet: string; validateur: string }[];
}

/** Statut, commentaire et validations (code du projet, nom du validateur) d'une feuille. */
export const etatFeuille = (feuilleId: number): Promise<EtatFeuille> =>
  avecBase(async (c) => {
    const f = await c.query('SELECT statut, commentaire FROM feuille_temps WHERE id = $1', [
      feuilleId,
    ]);
    const v = await c.query(
      `SELECT p.code AS projet, u.nom AS validateur FROM validation_feuille vf
         JOIN projet p ON p.id = vf.projet_id JOIN utilisateur u ON u.id = vf.validateur_id
        WHERE vf.feuille_id = $1 ORDER BY p.code`,
      [feuilleId],
    );
    return {
      statut: f.rows[0].statut as string,
      commentaire: f.rows[0].commentaire as string | null,
      validations: v.rows as { projet: string; validateur: string }[],
    };
  });

/** Feuille brouillon sans aucune imputation (D-120 (2)), créée par SQL pour la ressource d'e-mail donné. */
export const feuilleVide = (email: string, lundi: string): Promise<number> =>
  avecBase(async (c) => {
    const r = await c.query(
      `INSERT INTO feuille_temps (ressource_id, lundi)
       SELECT id, $2::date FROM utilisateur WHERE email = $1 RETURNING id`,
      [email, lundi],
    );
    return r.rows[0].id as number;
  });

/** Compte les GET /api/validations et les POST /api/feuilles envoyés par la page. */
export function compter(page: Page) {
  const n = { lectures: 0, ecritures: 0 };
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/validations') && req.method() === 'GET') n.lectures++;
    if (url.includes('/api/feuilles') && req.method() !== 'GET') n.ecritures++;
  });
  return n;
}

/** Remplace la réponse du POST /api/feuilles/:id/<verbe> par un refus ; rien n'atteint le serveur. */
export async function intercepter(
  page: Page,
  verbe: 'valider' | 'rejeter',
  status: number,
  code?: string,
): Promise<void> {
  await page.route(`**/api/feuilles/*/${verbe}`, (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ erreur: 'refus de test', ...(code ? { code } : {}) }),
    }),
  );
}
