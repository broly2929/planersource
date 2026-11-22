// Lot 6b (D-148, SPEC « Vue restreinte de la ressource (lot 6b, D-148) ») : menu et redirections du
// rôle ressource, écran « Mes tâches ». E2E-347 à E2E-354. Base « administrateur seul » avant et après
// chaque test. Données préparées par l'API, sauf E2E-353 (parcours complet, tout à l'écran).
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { MOT_DE_PASSE, connecterAvec, preparer } from './lot1-helpers.js';
import { calculer } from './lot3b-helpers.js';
import { allerA, creerRessourceParEcran, lireGantt, ouvrirCalendriers } from './lot3c-helpers.js';
import {
  EMAIL_ALICE,
  H14,
  S,
  adresseFeuille,
  bouton,
  caseCharge,
  imputationsDe,
  imputerApi,
  jS,
  lireFeuilleApi,
  monde4b,
  sessionDe,
} from './lot4b-helpers.js';
import {
  chargesEnBase,
  jjmmaaaa,
  lignesMesTaches,
  nav,
  remettreAdminSeul6b,
  tableauMesTaches,
  titreMesTaches,
} from './lot6b-helpers.js';

const EMAIL_RES = 'ressource-6b@lot6b.test';
const EMAIL_CHEF = 'chef-6b@lot6b.test';
const COLONNES = ['Projet', 'Activité', 'Début', 'Fin', 'Assigné', 'Réel', 'Reste'];

test.beforeEach(remettreAdminSeul6b);
test.afterEach(remettreAdminSeul6b);

/** Chef « Chef 6B », ressource « Ressource 6B » affectée au projet MT1 ; activité « Conception ». */
async function monde(request: Parameters<typeof preparer>[0]) {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 6B', EMAIL_CHEF, 'chef_de_projet');
  const res = await api.utilisateur('Ressource 6B', EMAIL_RES, 'ressource', true);
  const p1 = await api.projet('MT1', 'Projet Mes tâches 1', chef.id);
  await api.affectation(p1.id, res.id);
  const a1 = await api.activite(p1.id, 'Conception');
  return { api, chef, res, p1, a1 };
}

test('E2E-347-r1 : menu du rôle ressource : « Mes tâches » en tête, puis Imputations (sans Calendriers, D-165 (5)) ; ni Accueil, ni Projets, ni Modèles, ni Validation', async ({
  page,
  request,
}) => {
  await monde(request);
  await connecterAvec(page, EMAIL_RES);
  await expect(nav(page).getByRole('link')).toHaveText(['Mes tâches', 'Imputations']);
  for (const lien of ['Accueil', 'Projets', 'Modèles', 'Validation']) {
    await expect(nav(page).getByRole('link', { name: lien, exact: true }), lien).toHaveCount(0);
  }
});

test('E2E-348 : redirections du rôle ressource vers /mes-taches : après connexion, « / », /projets, /projets/<id>, planning manuel, /modeles, /validation ; aucune requête de projets, modèles ni validations', async ({
  page,
  request,
}) => {
  const { p1, a1 } = await monde(request);
  const appels: string[] = [];
  page.on('request', (r) => {
    const chemin = new URL(r.url()).pathname;
    if (/^\/api\/(projets|modeles|validations)/.test(chemin)) appels.push(chemin);
  });
  await connecterAvec(page, EMAIL_RES);
  await expect(page).toHaveURL('/mes-taches');
  await expect(titreMesTaches(page)).toBeVisible();
  for (const adresse of [
    '/',
    '/projets',
    `/projets/${p1.id}`,
    `/projets/${p1.id}/planning-manuel/${a1.id}`,
    '/modeles',
    '/validation',
  ]) {
    await page.goto(adresse);
    await expect(page, adresse).toHaveURL('/mes-taches');
    await expect(titreMesTaches(page), adresse).toBeVisible();
  }
  expect(appels).toEqual([]);
});

test('E2E-349 : écran Mes tâches : colonnes, lignes dans l’ordre de l’API, code avec le nom en title, dates JJ/MM/AAAA après calcul et « — » avant, charges à la virgule, aucun bouton', async ({
  page,
  request,
  playwright,
}) => {
  const { api, chef, res, p1, a1 } = await monde(request);
  const s1 = await api.assignation(a1.id, res.id, 2);
  const p2 = await api.projet('MT2', 'Projet Mes tâches 2', chef.id);
  await api.affectation(p2.id, res.id);
  const a2 = await api.activite(p2.id, 'Recette');
  await api.assignation(a2.id, res.id, 1.5);
  // Réel 0,5 et reste 1,5 par la feuille de temps de la ressource (semaine passée du 12/01/2026).
  await imputerApi(await sessionDe(playwright, EMAIL_RES), S, [
    { assignation_id: s1.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
  ]);
  await calculer(request, [p1.id]);
  const conception = (await lireGantt(request, p1.id)).elements.find(
    (e) => e.nom === 'Conception',
  )!;
  expect(conception.debut_planifie && conception.fin_planifiee).toBeTruthy();

  await connecterAvec(page, EMAIL_RES);
  const tableau = tableauMesTaches(page);
  await expect(tableau.getByRole('columnheader')).toHaveText(COLONNES);
  await expect(lignesMesTaches(page)).toHaveCount(2);
  await expect(lignesMesTaches(page).nth(0).getByRole('cell')).toHaveText([
    'MT1',
    'Conception',
    jjmmaaaa(conception.debut_planifie!),
    jjmmaaaa(conception.fin_planifiee!),
    '2',
    '0,5',
    '1,5',
  ]);
  await expect(lignesMesTaches(page).nth(1).getByRole('cell')).toHaveText([
    'MT2',
    'Recette',
    '—',
    '—',
    '1,5',
    '0',
    '1,5',
  ]);
  await expect(tableau.getByTitle('Projet Mes tâches 1', { exact: true })).toHaveText('MT1');
  await expect(tableau.getByTitle('Projet Mes tâches 2', { exact: true })).toHaveText('MT2');
  await expect(page.getByRole('main').getByRole('button')).toHaveCount(0);
});

test('E2E-350 : écran Mes tâches, état vide : « Aucune tâche en cours. », sans tableau', async ({
  page,
  request,
}) => {
  await monde(request);
  await connecterAvec(page, EMAIL_RES);
  await expect(titreMesTaches(page)).toBeVisible();
  await expect(page.getByText('Aucune tâche en cours.', { exact: true })).toBeVisible();
  await expect(tableauMesTaches(page)).toHaveCount(0);
});

test('E2E-351 : écran Mes tâches, échec de chargement (500) : « Impossible de charger vos tâches. », sans tableau', async ({
  page,
  request,
}) => {
  const { api, res, a1 } = await monde(request);
  await api.assignation(a1.id, res.id, 2);
  await page.route('**/api/mes-taches', (route) =>
    route.fulfill({ status: 500, json: { erreur: 'Erreur interne' } }),
  );
  await connecterAvec(page, EMAIL_RES);
  await expect(titreMesTaches(page)).toBeVisible();
  await expect(page.getByText('Impossible de charger vos tâches.', { exact: true })).toBeVisible();
  await expect(tableauMesTaches(page)).toHaveCount(0);
});

test('E2E-352 : chef de projet ressource : « Mes tâches » en tête, Accueil, Projets, Validation et Modèles gardés, sa tâche affichée ; administrateur non ressource : pas d’entrée « Mes tâches »', async ({
  page,
  request,
}) => {
  const { api, p1 } = await monde(request);
  const chefRes = await api.utilisateur(
    'Chef R 6B',
    'chef-r-6b@lot6b.test',
    'chef_de_projet',
    true,
  );
  await api.affectation(p1.id, chefRes.id);
  const t = await api.activite(p1.id, 'Tâche du chef');
  await api.assignation(t.id, chefRes.id, 1);

  await connecterAvec(page, 'chef-r-6b@lot6b.test');
  await expect(page).toHaveURL('/');
  await expect(nav(page).getByRole('link').first()).toHaveText('Mes tâches');
  for (const lien of ['Accueil', 'Projets', 'Validation', 'Modèles']) {
    await expect(nav(page).getByRole('link', { name: lien, exact: true }), lien).toBeVisible();
  }
  await nav(page).getByRole('link', { name: 'Mes tâches', exact: true }).click();
  await expect(page).toHaveURL('/mes-taches');
  await expect(lignesMesTaches(page)).toHaveCount(1);
  await expect(lignesMesTaches(page).first()).toContainText('Tâche du chef');

  await page.context().clearCookies();
  await loginAsAdmin(page);
  await expect(nav(page).getByRole('link', { name: 'Accueil', exact: true })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Mes tâches', exact: true })).toHaveCount(0);
});

test('E2E-353-r1 : parcours complet à l’écran : l’administrateur crée ressource, chef et projet ; le chef affecte et assigne ; la ressource voit sa tâche dans Mes tâches', async ({
  page,
}) => {
  const RESSOURCE = 'Ressource 6B';
  const CHEF = 'Chef 6B';
  await loginAsAdmin(page);
  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 6B');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 6B/ })).toBeVisible();
  await creerRessourceParEcran(page, RESSOURCE, EMAIL_RES, 'Cal 6B');

  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const utilisateur = page.getByRole('dialog');
  await utilisateur.getByLabel('Nom').fill(CHEF);
  await utilisateur.getByLabel('Email').fill(EMAIL_CHEF);
  await utilisateur.getByLabel('Mot de passe').fill(MOT_DE_PASSE);
  await utilisateur.getByLabel('Rôle').selectOption({ label: 'Chef de projet' });
  await utilisateur.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(CHEF) })).toBeVisible();

  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const projet = page.getByRole('dialog');
  await projet.getByLabel('Code').fill('6B');
  await projet.getByLabel('Nom').fill('Projet 6B');
  await projet.getByLabel('Chef de projet').selectOption({ label: CHEF });
  await projet.getByLabel('Pas avant le').fill('2027-01-04');
  await projet.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Projet 6B/ })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');

  // Le chef affecte la ressource, crée l'activité et l'assigne, tout à l'écran.
  await connecterAvec(page, EMAIL_CHEF);
  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 6B' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 6B', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page.getByRole('dialog').getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: new RegExp(RESSOURCE) })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 6B');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 6B/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 6B' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await assignation.getByLabel('Charge assignée (jours)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Tâche 6B.*${RESSOURCE}`) })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');
  expect(await chargesEnBase(EMAIL_RES)).toEqual(['2.00']);

  // La ressource voit la tâche dans Mes tâches, sans autre écran.
  await connecterAvec(page, EMAIL_RES);
  await expect(page).toHaveURL('/mes-taches');
  await expect(lignesMesTaches(page)).toHaveCount(1);
  await expect(lignesMesTaches(page).first().getByRole('cell')).toHaveText([
    '6B',
    'Tâche 6B',
    '—',
    '—',
    '2',
    '0',
    '2',
  ]);
});

test('E2E-354 : témoin : Feuille de temps de la ressource inchangée (entrée « Imputations », saisie, enregistrement, relue par l’API)', async ({
  page,
  request,
  playwright,
}) => {
  await monde4b(request, { avecB: false });
  await page.clock.setFixedTime(H14);
  await connecterAvec(page, EMAIL_ALICE);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(adresseFeuille(S));
  await caseCharge(page, '1 Tâche A', 'lun. 12/01').fill('0,5');
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: 'Feuille enregistrée.' })).toBeVisible();
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), S);
  expect(imputationsDe(f, 'Tâche A')).toEqual([{ jour: jS(12), charge: 0.5 }]);
});

test('E2E-356 : utilisateur de rôle ressource non ressource planifiable : « Mes tâches » présent, « Imputations » absent, état vide', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Non planifiable 6B', 'np-6b@lot6b.test', 'ressource', false);
  await connecterAvec(page, 'np-6b@lot6b.test');
  await expect(page).toHaveURL('/mes-taches');
  await expect(nav(page).getByRole('link', { name: 'Mes tâches', exact: true })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Imputations', exact: true })).toHaveCount(0);
  await expect(page.getByText('Aucune tâche en cours.', { exact: true })).toBeVisible();
});

test('E2E-357 : page d’arrivée après connexion : administrateur, chef non ressource et chef ressource → « / » ; ressource → /mes-taches', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef 357', 'chef-357@lot6b.test', 'chef_de_projet');
  await api.utilisateur('Chef R 357', 'chefr-357@lot6b.test', 'chef_de_projet', true);
  await api.utilisateur('Ressource 357', 'res-357@lot6b.test', 'ressource', true);
  await loginAsAdmin(page);
  await expect(page).toHaveURL('/');
  for (const [email, url] of [
    ['chef-357@lot6b.test', '/'],
    ['chefr-357@lot6b.test', '/'],
    ['res-357@lot6b.test', '/mes-taches'],
  ] as const) {
    await page.context().clearCookies();
    await connecterAvec(page, email);
    await expect(page, email).toHaveURL(url);
    if (url === '/') {
      await expect(page.getByRole('heading', { name: 'Accueil', level: 1 }), email).toBeVisible();
    } else {
      await expect(titreMesTaches(page), email).toBeVisible();
    }
  }
});
