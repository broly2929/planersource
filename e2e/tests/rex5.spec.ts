// REX-5 (D-165, SPEC « Écran Utilisateurs : équipes et calendriers (REX-5, D-165) ») : onglets de l'écran
// Utilisateurs, redirections de /equipes et /calendriers, menus, section « Mon calendrier ». E2E-388 à
// E2E-399. Base « administrateur seul » avant et après chaque test. Données préparées par l'API ; les
// calendriers sont propres à chaque test, jamais le calendrier par défaut (D-163 (3)).
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { creerEquipeParEcran, nav, options } from './lot6a-helpers.js';
import { ouvrirCalendriers } from './lot3c-helpers.js';
import { remettreAdminSeul6b, tableauMesTaches, titreMesTaches } from './lot6b-helpers.js';

test.beforeEach(remettreAdminSeul6b);
test.afterEach(remettreAdminSeul6b);

const MAINTENANT = '2027-03-10T10:00:00';
const onglet = (page: Page, nom: string) => page.getByRole('tab', { name: nom, exact: true });
const selectionne = (page: Page, nom: string) =>
  expect(onglet(page, nom), nom).toHaveAttribute('aria-selected', 'true');

/** Utilisateur dont le calendrier est `calendrierId` (PATCH par l'API, administrateur connecté). */
async function rattacher(request: APIRequestContext, id: number, calendrierId: number) {
  const r = await request.patch(`/api/utilisateurs/${id}`, {
    data: { calendrier_id: calendrierId },
  });
  expect(r.ok(), `PATCH calendrier de ${id} : ${r.status()}`).toBeTruthy();
}

/** Ressource « Res 5 » (rôle ressource) sur le calendrier « Cal 5 » (lundi à vendredi), avec une tâche. */
async function mondeRessource(request: APIRequestContext, jours?: number[]) {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 5', 'chef-5@rex5.test', 'chef_de_projet');
  const res = await api.utilisateur('Res 5', 'res-5@rex5.test', 'ressource', true);
  const cal = jours
    ? ((await (
        await request.post('/api/calendriers', { data: { nom: 'Cal 5', jours_travailles: jours } })
      ).json()) as { id: number })
    : await api.calendrier('Cal 5');
  await rattacher(request, res.id, cal.id);
  const p = await api.projet('R5', 'Projet R5', chef.id);
  await api.affectation(p.id, res.id);
  const a = await api.activite(p.id, 'Tâche R5');
  await api.assignation(a.id, res.id, 2);
  return { api, chef, res, cal };
}

const titreCalendrier = (page: Page) =>
  page.getByRole('heading', { name: 'Mon calendrier', level: 2 });
const tableauFeries = (page: Page) => page.getByRole('table', { name: 'Jours fériés à venir' });

test('E2E-388 : trois onglets, « Utilisateurs » par défaut ; l’adresse suit l’onglet', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto('/utilisateurs');
  await expect(page.getByRole('tab')).toHaveText(['Utilisateurs', 'Équipes', 'Calendriers']);
  await selectionne(page, 'Utilisateurs');
  await expect(page).toHaveURL('/utilisateurs');
  await onglet(page, 'Équipes').click();
  await selectionne(page, 'Équipes');
  await expect(page).toHaveURL('/utilisateurs?onglet=equipes');
  await onglet(page, 'Calendriers').click();
  await selectionne(page, 'Calendriers');
  await expect(page).toHaveURL('/utilisateurs?onglet=calendriers');
  await onglet(page, 'Utilisateurs').click();
  await selectionne(page, 'Utilisateurs');
  await expect(page).toHaveURL('/utilisateurs');
});

test('E2E-389 : ouverture directe par l’adresse ; valeur invalide : onglet Utilisateurs', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto('/utilisateurs?onglet=equipes');
  await selectionne(page, 'Équipes');
  await expect(page.getByRole('button', { name: 'Nouvelle équipe' })).toBeVisible();
  await page.goto('/utilisateurs?onglet=calendriers');
  await selectionne(page, 'Calendriers');
  await expect(page.getByRole('button', { name: 'Nouveau calendrier' })).toBeVisible();
  await page.goto('/utilisateurs?onglet=zzz');
  await selectionne(page, 'Utilisateurs');
  await expect(page.getByRole('button', { name: 'Nouvel utilisateur' })).toBeVisible();
});

test('E2E-390 : équipe créée dans l’onglet Équipes, choisie dans le dialogue d’un utilisateur sans recharger ; Membres à jour', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto('/utilisateurs');
  await page.evaluate(() => {
    (window as unknown as { marque5: number }).marque5 = 1;
  });
  await onglet(page, 'Équipes').click();
  await creerEquipeParEcran(page, 'Atelier 5');
  await onglet(page, 'Utilisateurs').click();
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const dialog = page.getByRole('dialog');
  expect(await options(dialog.getByLabel('Équipe'))).toContain('Atelier 5');
  await dialog.getByLabel('Nom').fill('Membre 5');
  await dialog.getByLabel('Email').fill('membre-5@rex5.test');
  await dialog.getByLabel('Mot de passe').fill('secret-5');
  await dialog.getByLabel('Équipe').selectOption({ label: 'Atelier 5' });
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Membre 5/ })).toBeVisible();
  await onglet(page, 'Équipes').click();
  await expect(
    page.getByRole('table', { name: 'Liste des équipes' }).getByRole('row', { name: /Atelier 5/ }),
  ).toContainText('1');
  expect(await page.evaluate(() => (window as unknown as { marque5?: number }).marque5)).toBe(1);
});

test('E2E-391 : calendrier créé dans l’onglet Calendriers, choisi dans la liste « Calendrier » sans recharger', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto('/utilisateurs');
  await page.evaluate(() => {
    (window as unknown as { marque5: number }).marque5 = 1;
  });
  await onglet(page, 'Calendriers').click();
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 5');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 5/ })).toBeVisible();
  await onglet(page, 'Utilisateurs').click();
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  expect(await options(page.getByRole('dialog').getByLabel('Calendrier'))).toContain('Cal 5');
  expect(await page.evaluate(() => (window as unknown as { marque5?: number }).marque5)).toBe(1);
});

test('E2E-392 : administrateur : /equipes et /calendriers redirigent vers l’onglet, sans entrée d’historique', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto('/utilisateurs');
  await page.goto('/equipes');
  await expect(page).toHaveURL('/utilisateurs?onglet=equipes');
  await selectionne(page, 'Équipes');
  await page.goBack();
  await expect(page).toHaveURL('/utilisateurs');
  await page.goto('/calendriers');
  await expect(page).toHaveURL('/utilisateurs?onglet=calendriers');
  await selectionne(page, 'Calendriers');
  await page.goBack();
  await expect(page).toHaveURL('/utilisateurs');
});

test('E2E-393-r1 : chef de projet : /equipes, /calendriers et /calendriers/<id> vers « / » ; ressource : vers /mes-taches ; sans entrée d’historique, base inchangée', async ({
  page,
  request,
}) => {
  const { api, cal } = await mondeRessource(request);
  await api.utilisateur('Chef 5b', 'chef-5b@rex5.test', 'chef_de_projet');
  const avant = await (await request.get('/api/calendriers')).text();
  const detailVu: string[] = [];
  page.on('request', (r) => {
    const chemin = new URL(r.url()).pathname;
    if (/^\/api\/calendriers\/\d+$/.test(chemin)) detailVu.push(chemin);
  });

  await connecterAvec(page, 'chef-5b@rex5.test');
  for (const adresse of ['/equipes', '/calendriers', `/calendriers/${cal.id}`]) {
    await page.goto('/projets');
    await page.goto(adresse);
    await expect(page, adresse).toHaveURL('/');
    await page.goBack();
    await expect(page, adresse).toHaveURL('/projets');
  }
  expect(detailVu).toEqual([]);

  await page.context().clearCookies();
  await connecterAvec(page, 'res-5@rex5.test');
  for (const adresse of ['/equipes', '/calendriers', `/calendriers/${cal.id}`]) {
    await page.goto('/imputations');
    await page.goto(adresse);
    await expect(page, adresse).toHaveURL('/mes-taches');
    await page.goBack();
    await expect(page, adresse).toHaveURL(/\/imputations(\?|$)/);
  }
  expect(await (await request.get('/api/calendriers')).text()).toBe(avant);
});

test('E2E-394 : menus : plus d’« Équipes » ni de « Calendriers » ; « Utilisateurs » pour l’administrateur seul ; ressource : Mes tâches et Imputations', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef 5', 'chef-5@rex5.test', 'chef_de_projet');
  await api.utilisateur('Chef R 5', 'chef-r-5@rex5.test', 'chef_de_projet', true);
  await api.utilisateur('Res 5', 'res-5@rex5.test', 'ressource', true);
  const sans = async () => {
    for (const lien of ['Équipes', 'Calendriers']) {
      await expect(nav(page).getByRole('link', { name: lien, exact: true }), lien).toHaveCount(0);
    }
  };
  await loginAsAdmin(page);
  await sans();
  await expect(nav(page).getByRole('link', { name: 'Utilisateurs', exact: true })).toBeVisible();
  await page.context().clearCookies();
  await connecterAvec(page, 'chef-5@rex5.test');
  await sans();
  await expect(nav(page).getByRole('link', { name: 'Utilisateurs', exact: true })).toHaveCount(0);
  await expect(nav(page).getByRole('link', { name: 'Mes tâches', exact: true })).toHaveCount(0);
  await page.context().clearCookies();
  await connecterAvec(page, 'chef-r-5@rex5.test');
  await sans();
  await expect(nav(page).getByRole('link', { name: 'Mes tâches', exact: true })).toBeVisible();
  await page.context().clearCookies();
  await connecterAvec(page, 'res-5@rex5.test');
  await expect(nav(page).getByRole('link')).toHaveText(['Mes tâches', 'Imputations']);
});

test('E2E-395 : détail d’un calendrier : « Utilisateurs » actif dans le menu ; « Retour aux calendriers » ; suppression : retour à l’onglet', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const cal = await api.calendrier('Cal 395');
  await loginAsAdmin(page);
  await ouvrirCalendriers(page);
  await page.getByRole('link', { name: 'Cal 395', exact: true }).click();
  await expect(page).toHaveURL(`/calendriers/${cal.id}`);
  await expect(page.getByRole('heading', { name: 'Cal 395', level: 1 })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Utilisateurs', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.getByRole('link', { name: 'Retour aux calendriers' }).click();
  await expect(page).toHaveURL('/utilisateurs?onglet=calendriers');
  await selectionne(page, 'Calendriers');
  await page.getByRole('link', { name: 'Cal 395', exact: true }).click();
  await page.getByRole('button', { name: 'Supprimer le calendrier' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(page).toHaveURL('/utilisateurs?onglet=calendriers');
  await selectionne(page, 'Calendriers');
  await expect(page.getByRole('link', { name: 'Cal 395', exact: true })).toHaveCount(0);
});

test('E2E-396 : « Mon calendrier » : nom, jours travaillés, fériés à venir (≥ date du jour, triés), sous le tableau des tâches', async ({
  page,
  request,
}) => {
  const { api, cal } = await mondeRessource(request);
  await api.ferie(cal.id, '2027-12-25', '');
  await api.ferie(cal.id, '2027-05-01', 'Fête du travail');
  await api.ferie(cal.id, '2027-03-10', "Aujourd'hui");
  await api.ferie(cal.id, '2027-03-09', 'Hier');
  await page.clock.setFixedTime(MAINTENANT);
  await connecterAvec(page, 'res-5@rex5.test');
  await expect(titreMesTaches(page)).toBeVisible();
  await expect(tableauMesTaches(page)).toBeVisible();
  await expect(titreCalendrier(page)).toBeVisible();
  const yTaches = (await tableauMesTaches(page).boundingBox())!.y;
  expect((await titreCalendrier(page).boundingBox())!.y).toBeGreaterThan(yTaches);
  await expect(page.getByText('Cal 5', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Jours travaillés : lundi, mardi, mercredi, jeudi, vendredi', { exact: true }),
  ).toBeVisible();
  await expect(tableauFeries(page).getByRole('columnheader')).toHaveText(['Date', 'Libellé']);
  const lignes = tableauFeries(page).locator('tbody tr');
  await expect(lignes).toHaveCount(3);
  await expect(lignes.nth(0).getByRole('cell')).toHaveText(['10/03/2027', "Aujourd'hui"]);
  await expect(lignes.nth(1).getByRole('cell')).toHaveText(['01/05/2027', 'Fête du travail']);
  await expect(lignes.nth(2).getByRole('cell')).toHaveText(['25/12/2027', '—']);
  await expect(tableauFeries(page)).not.toContainText('09/03/2027');
  await expect(page.getByRole('button', { name: /Ajouter|Modifier|Supprimer/ })).toHaveCount(0);
});

test('E2E-397 : « Mon calendrier » sans férié à venir : message, pas de tableau ; jours en toutes lettres', async ({
  page,
  request,
}) => {
  const { api, cal } = await mondeRessource(request, [1, 2, 3, 4, 5, 6, 7]);
  await api.ferie(cal.id, '2027-03-09', 'Hier');
  await page.clock.setFixedTime(MAINTENANT);
  await connecterAvec(page, 'res-5@rex5.test');
  await expect(titreCalendrier(page)).toBeVisible();
  await expect(page.getByText('Aucun jour férié à venir.', { exact: true })).toBeVisible();
  await expect(tableauFeries(page)).toHaveCount(0);
  await expect(
    page.getByText('Jours travaillés : lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche', {
      exact: true,
    }),
  ).toBeVisible();
});

test('E2E-398 : « Mon calendrier » en erreur (500) sans effet sur les tâches, et inversement', async ({
  page,
  request,
}) => {
  const { cal } = await mondeRessource(request);
  await page.route(`**/api/calendriers/${cal.id}`, (route) =>
    route.fulfill({ status: 500, json: { erreur: 'Erreur interne' } }),
  );
  await connecterAvec(page, 'res-5@rex5.test');
  await expect(
    page.getByText('Impossible de charger votre calendrier.', { exact: true }),
  ).toBeVisible();
  await expect(tableauMesTaches(page).locator('tbody tr')).toHaveCount(1);
  await expect(tableauFeries(page)).toHaveCount(0);

  await page.unroute(`**/api/calendriers/${cal.id}`);
  await page.route('**/api/mes-taches', (route) =>
    route.fulfill({ status: 500, json: { erreur: 'Erreur interne' } }),
  );
  await page.reload();
  await expect(page.getByText('Impossible de charger vos tâches.', { exact: true })).toBeVisible();
  await expect(titreCalendrier(page)).toBeVisible();
  await expect(page.getByText('Cal 5', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Impossible de charger votre calendrier.', { exact: true }),
  ).toHaveCount(0);
});

test('E2E-399 : « Mon calendrier » pour la ressource et le chef ressource, sur le calendrier de la session ; chef non ressource : aucune lecture', async ({
  page,
  request,
}) => {
  const { api, cal } = await mondeRessource(request);
  const chefRes = await api.utilisateur('Chef R 5', 'chef-r-5@rex5.test', 'chef_de_projet', true);
  await api.utilisateur('Chef 5c', 'chef-5c@rex5.test', 'chef_de_projet');
  await rattacher(request, chefRes.id, cal.id);
  const lus: string[] = [];
  page.on('request', (r) => {
    const chemin = new URL(r.url()).pathname;
    if (/^\/api\/calendriers\/\d+$/.test(chemin)) lus.push(chemin);
  });

  await connecterAvec(page, 'res-5@rex5.test');
  await expect(titreCalendrier(page)).toBeVisible();
  expect([...new Set(lus)]).toEqual([`/api/calendriers/${cal.id}`]);
  await page.context().clearCookies();
  lus.length = 0;

  await connecterAvec(page, 'chef-r-5@rex5.test');
  await nav(page).getByRole('link', { name: 'Mes tâches', exact: true }).click();
  await expect(titreCalendrier(page)).toBeVisible();
  await expect(page.getByText('Cal 5', { exact: true })).toBeVisible();
  expect([...new Set(lus)]).toEqual([`/api/calendriers/${cal.id}`]);
  await page.context().clearCookies();
  lus.length = 0;

  await connecterAvec(page, 'chef-5c@rex5.test');
  await expect(nav(page).getByRole('link', { name: 'Mes tâches', exact: true })).toHaveCount(0);
  expect([...new Set(lus)]).toEqual([]);
});
