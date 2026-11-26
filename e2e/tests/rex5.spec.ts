// REX-5 (D-165, SPEC « Écran Utilisateurs : équipes et calendriers (REX-5, D-165) ») : onglets de l'écran
// Utilisateurs, redirections de /equipes et /calendriers, menus. E2E-388 à E2E-395 (E2E-396 à E2E-399, section
// « Mon calendrier », retirés par D-218 (5), (9)). Base « administrateur seul » avant et après chaque test. Données préparées par l'API ; les
// calendriers sont propres à chaque test, jamais le calendrier par défaut (D-163 (3)).
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { creerEquipeParEcran, nav, options } from './lot6a-helpers.js';
import { ouvrirCalendriers } from './lot3c-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';
import { cliquerDansConfirmation } from './stabilite-helpers.js';

test.beforeEach(remettreAdminSeul6b);
test.afterEach(remettreAdminSeul6b);

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

test('E2E-390-r1 : équipe créée dans l’onglet Équipes, choisie dans le dialogue d’un utilisateur sans recharger ; Membres à jour', async ({
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
  await dialog.getByLabel('Mot de passe', { exact: true }).fill('secret-5');
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

test('E2E-395-r1 : détail d’un calendrier : « Utilisateurs » actif dans le menu ; « Retour aux calendriers » ; suppression : retour à l’onglet', async ({
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
  await cliquerDansConfirmation(
    page.getByRole('dialog'),
    page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }),
  );
  await expect(page).toHaveURL('/utilisateurs?onglet=calendriers');
  await selectionne(page, 'Calendriers');
  await expect(page.getByRole('link', { name: 'Cal 395', exact: true })).toHaveCount(0);
});
