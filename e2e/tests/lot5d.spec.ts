// Lot 5d et REX-4 (D-145, SPEC §7 « Écran Validation ») : focus et refus de l'écran Validation, largeur de la
// colonne Projet de la Feuille de temps. E2E-323 à E2E-333 (E2E-334 : captures, lot5d-captures.spec.ts).
// Monde de lot4c-helpers.ts, horloge du navigateur figée au mercredi 14/01/2026. Chaque test d'écriture relit
// la base (`etatFeuille`) avant et après. « Succès simulé » : réponse du POST remplacée par un 200 `{}`, rien
// n'atteint le serveur (une validation réelle retire toujours « Valider »).
import { expect, test, type Page, type PlaywrightWorkerArgs } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec } from './lot1-helpers.js';
import {
  EMAIL_ALICE,
  EMAIL_CHEF_P,
  H14,
  S,
  agirApi,
  imputerApi,
  jS,
  remettreAdminSeul4b,
  sessionDe,
  tableauFeuille,
  adresseFeuille,
} from './lot4b-helpers.js';
import {
  EMAIL_BOB,
  attendreAlerteAuDessus,
  boutonDe,
  compter,
  etatFeuille,
  imputerEtSoumettre,
  intercepter,
  ligneValidation,
  monde4c,
  ouvrirValidation,
  soumettreAlice,
  statutOk,
  tableauValidation,
} from './lot4c-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul4b);

const VOIR = 'Voir la feuille de Alice 4B';
const VALIDER = 'Valider la feuille de Alice 4B';
const REJETER = 'Rejeter la feuille de Alice 4B';
const SOUMISE = { statut: 'soumise', commentaire: null, validations: [] };

const alice = (page: Page) => ligneValidation(page, 'Alice 4B');
/** Alertes de la page, dialogue compris (le sélecteur CSS ignore `aria-hidden` posé par Radix). */
const alertes = (page: Page) => page.locator('[role="alert"]');

async function simulerSucces(page: Page, verbe: 'valider' | 'rejeter'): Promise<void> {
  await page.route(`**/api/feuilles/*/${verbe}`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
}

// --- REX-4 : colonne Projet (D-145 (3)) ---

const CODE_11 = 'PRJ-1234567';
const CODE_30 = `DEMO-${'A'.repeat(25)}`;

/** Alice a une assignation sur un projet de code de 11 caractères et sur un de 30 ; feuille soumise. */
async function monde5dCodes(
  request: Parameters<typeof monde4c>[0],
  playwright: PlaywrightWorkerArgs['playwright'],
) {
  const m = await monde4c(request);
  const ids: number[] = [];
  for (const code of [CODE_11, CODE_30]) {
    const p = await m.api.projet(code, `Projet ${code}`, m.chefP.id);
    await m.api.affectation(p.id, m.alice.id);
    const a = await m.api.activite(p.id, `Tâche ${code.slice(0, 4)}`);
    ids.push((await m.api.assignation(a.id, m.alice.id, 1)).id);
  }
  const ctx = await sessionDe(playwright, EMAIL_ALICE);
  const f = await imputerApi(ctx, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 1 }] },
    ...ids.map((id) => ({ assignation_id: id, imputations: [{ jour: jS(12), charge: 1 }] })),
  ]);
  await agirApi(ctx, f.feuille.id!, 'soumettre');
  return m;
}

async function ouvrirFeuilleAlice(page: Page, largeur: number): Promise<void> {
  await page.setViewportSize({ width: largeur, height: 700 });
  await connecterAvec(page, EMAIL_ALICE);
  await page.goto(adresseFeuille(S));
  await expect(tableauFeuille(page)).toBeVisible();
}

const celluleProjet = (page: Page, code: string) =>
  tableauFeuille(page).locator(`tbody th[scope="row"][title="${code}"]`);

for (const largeur of [1440, 1024]) {
  test(`E2E-323 (a) : code de 11 caractères entièrement visible à ${largeur} px`, async ({
    page,
    request,
    playwright,
  }) => {
    await monde5dCodes(request, playwright);
    await ouvrirFeuilleAlice(page, largeur);
    const cellule = celluleProjet(page, CODE_11);
    await expect(cellule).toHaveText(CODE_11);
    const d = await cellule.evaluate((e) => ({ s: e.scrollWidth, c: e.clientWidth }));
    expect(d.c, `largeur rendue ${d.c}, scrollWidth ${d.s}`).toBeGreaterThanOrEqual(d.s);
  });

  test(`E2E-323 (b) : code de 30 caractères tronqué, title = code complet, à ${largeur} px`, async ({
    page,
    request,
    playwright,
  }) => {
    await monde5dCodes(request, playwright);
    await ouvrirFeuilleAlice(page, largeur);
    const cellule = celluleProjet(page, CODE_30);
    await expect(cellule).toHaveAttribute('title', CODE_30);
    const d = await cellule.evaluate((e) => ({
      s: e.scrollWidth,
      c: e.clientWidth,
      ellipse: getComputedStyle(e).textOverflow,
    }));
    expect(d.s, `scrollWidth ${d.s}, largeur rendue ${d.c}`).toBeGreaterThan(d.c);
    expect(d.ellipse).toBe('ellipsis');
  });
}

test('E2E-323 (c) : témoin D-134 (2), 1024 px : aucun défilement horizontal (Feuille de temps, « Voir » de Validation)', async ({
  page,
  request,
  playwright,
}) => {
  await monde5dCodes(request, playwright);
  await ouvrirFeuilleAlice(page, 1024);
  await expect(celluleProjet(page, CODE_30)).toBeVisible();
  const mesure = (conteneur: ReturnType<Page['locator']>) =>
    conteneur.evaluate((e) => ({ s: e.scrollWidth, c: e.clientWidth }));
  const feuille = await mesure(tableauFeuille(page).locator('xpath=..'));
  expect(feuille.s, `Feuille de temps : scrollWidth ${feuille.s}, clientWidth ${feuille.c}`).toBe(
    feuille.c,
  );

  await page.context().clearCookies();
  await loginAsAdmin(page);
  await ouvrirValidation(page);
  await boutonDe(alice(page), VOIR).click();
  const tableau = page
    .getByRole('dialog')
    .getByRole('table', { name: 'Imputations de la semaine' });
  await expect(tableau).toBeVisible();
  await expect(tableau.locator(`tbody th[title="${CODE_30}"]`)).toBeVisible();
  const voir = await mesure(tableau.locator('xpath=..'));
  expect(voir.s, `Voir : scrollWidth ${voir.s}, clientWidth ${voir.c}`).toBe(voir.c);
});

// --- Écran Validation : focus et refus (D-145 (2)) ---

test('E2E-324 : succès réel de Valider : dialogue fermé, liste relue, focus sur « Voir »', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  expect(await etatFeuille(id)).toEqual(SOUMISE);
  await loginAsAdmin(page);
  await ouvrirValidation(page);
  const n = compter(page);
  await boutonDe(alice(page), VALIDER).click();
  const lecturesAvant = n.lectures;
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(statutOk(page, 'Feuille validée.')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => n.lectures).toBeGreaterThan(lecturesAvant);
  await expect(boutonDe(alice(page), VALIDER)).toHaveCount(0);
  await expect(boutonDe(alice(page), REJETER)).toHaveCount(0);
  await expect(boutonDe(alice(page), VOIR)).toBeFocused();
  expect((await etatFeuille(id)).statut).toBe('validee');
});

test('E2E-325 : succès simulé de Valider : le bouton d’origine existe encore, focus dessus', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const n = compter(page);
  await simulerSucces(page, 'valider');
  await boutonDe(alice(page), VALIDER).click();
  const lecturesAvant = n.lectures;
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(statutOk(page, 'Feuille validée.')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => n.lectures).toBeGreaterThan(lecturesAvant);
  await expect(boutonDe(alice(page), VALIDER)).toBeFocused();
  expect(await etatFeuille(id)).toEqual(SOUMISE);
});

test('E2E-326 : succès simulé de Valider, feuille disparue de la liste relue : focus sur le tableau', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  const bob = await m.ressourceSurP('Bob 4B', EMAIL_BOB, 'Tâche C');
  await imputerEtSoumettre(playwright, bob.email, bob.assignation, { soumettre: false });
  expect(await etatFeuille(id)).toEqual(SOUMISE);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  await expect(ligneValidation(page, 'Bob 4B')).toBeVisible();
  let masquer = false;
  await page.route('**/api/validations*', async (route) => {
    const reponse = await route.fetch();
    if (!masquer) return route.fulfill({ response: reponse });
    const corps = (await reponse.json()) as { feuilles: { ressource_nom: string }[] };
    corps.feuilles = corps.feuilles.filter((f) => f.ressource_nom !== 'Alice 4B');
    return route.fulfill({ response: reponse, json: corps });
  });
  await simulerSucces(page, 'valider');
  await boutonDe(alice(page), VALIDER).click();
  masquer = true;
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(alice(page)).toHaveCount(0);
  await expect(ligneValidation(page, 'Bob 4B')).toBeVisible();
  const tableau = tableauValidation(page);
  await expect(tableau).toHaveAttribute('tabindex', '-1');
  await expect(tableau).toBeFocused();
  expect(await etatFeuille(id)).toEqual(SOUMISE);
});

test('E2E-327 : succès réel de Rejeter : dialogue fermé, liste relue, focus sur « Voir »', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  expect(await etatFeuille(id)).toEqual(SOUMISE);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const n = compter(page);
  await boutonDe(alice(page), REJETER).click();
  await page.getByRole('dialog').getByLabel('Commentaire').fill('Écart sur mardi');
  const lecturesAvant = n.lectures;
  await boutonDe(page.getByRole('dialog'), 'Rejeter').click();
  await expect(statutOk(page, 'Feuille rejetée.')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => n.lectures).toBeGreaterThan(lecturesAvant);
  await expect(boutonDe(alice(page), REJETER)).toHaveCount(0);
  await expect(boutonDe(alice(page), VOIR)).toBeFocused();
  expect(await etatFeuille(id)).toEqual({
    statut: 'rejetee',
    commentaire: 'Écart sur mardi',
    validations: [],
  });
});

test('E2E-328 : rejeter, 422 statut_invalide : dialogue fermé, alerte au-dessus du tableau, focus sur « Rejeter »', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const n = compter(page);
  await intercepter(page, 'rejeter', 422, 'statut_invalide');
  await boutonDe(alice(page), REJETER).click();
  await page.getByRole('dialog').getByLabel('Commentaire').fill('Écart');
  const lecturesAvant = n.lectures;
  await boutonDe(page.getByRole('dialog'), 'Rejeter').click();
  await attendreAlerteAuDessus(page, 'La feuille a changé de statut.');
  await expect.poll(() => n.lectures).toBeGreaterThan(lecturesAvant);
  await expect(boutonDe(alice(page), REJETER)).toBeFocused();
  await expect(statutOk(page, 'Feuille rejetée.')).toHaveCount(0);
  expect(await etatFeuille(id)).toEqual(SOUMISE);
});

test('E2E-329 : valider, 404 : dialogue fermé, alerte au-dessus du tableau, focus sur « Valider »', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const n = compter(page);
  await intercepter(page, 'valider', 404);
  await boutonDe(alice(page), VALIDER).click();
  const lecturesAvant = n.lectures;
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await attendreAlerteAuDessus(page, 'Feuille introuvable.');
  await expect.poll(() => n.lectures).toBeGreaterThan(lecturesAvant);
  await expect(boutonDe(alice(page), VALIDER)).toBeFocused();
  await expect(statutOk(page, 'Feuille validée.')).toHaveCount(0);
  expect(await etatFeuille(id)).toEqual(SOUMISE);
});

test('E2E-330 : l’alerte est effacée à l’action suivante (clic sur un bouton de ligne)', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  await intercepter(page, 'valider', 422, 'statut_invalide');
  await boutonDe(alice(page), VALIDER).click();
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await attendreAlerteAuDessus(page, 'La feuille a changé de statut.');
  await boutonDe(alice(page), VALIDER).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(alertes(page)).toHaveCount(0);
  expect(await etatFeuille(id)).toEqual(SOUMISE);
});

test('E2E-331 : l’alerte est effacée au changement de semaine', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  await intercepter(page, 'valider', 422, 'statut_invalide');
  await boutonDe(alice(page), VALIDER).click();
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await attendreAlerteAuDessus(page, 'La feuille a changé de statut.');
  await boutonDe(page, 'Semaine précédente').click();
  await expect(page.getByText('Semaine du 05/01/2026 au 11/01/2026')).toBeVisible();
  await expect(alertes(page)).toHaveCount(0);
  expect(await etatFeuille(id)).toEqual(SOUMISE);
});

test('E2E-332 : témoin, valider 403 : dialogue ouvert, message dans le dialogue', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  await intercepter(page, 'valider', 403);
  await boutonDe(alice(page), VALIDER).click();
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  const dialogue = page.getByRole('dialog');
  await expect(dialogue.locator('[role="alert"]')).toHaveText(
    'Vous n’avez pas le droit d’agir sur cette feuille.',
  );
  await expect(dialogue).toBeVisible();
  await expect(alertes(page)).toHaveCount(1);
  expect(await etatFeuille(id)).toEqual(SOUMISE);
});

test('E2E-333 : témoin, rejeter 500 : dialogue ouvert, message dans le dialogue', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  await intercepter(page, 'rejeter', 500);
  await boutonDe(alice(page), REJETER).click();
  await page.getByRole('dialog').getByLabel('Commentaire').fill('Écart');
  await boutonDe(page.getByRole('dialog'), 'Rejeter').click();
  const dialogue = page.getByRole('dialog');
  await expect(dialogue.locator('[role="alert"]')).toHaveText('Une erreur est survenue.');
  await expect(dialogue).toBeVisible();
  await expect(alertes(page)).toHaveCount(1);
  expect(await etatFeuille(id)).toEqual(SOUMISE);
});
