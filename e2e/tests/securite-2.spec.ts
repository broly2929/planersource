// Lot securite-2 (D-274) : E2E-712 à E2E-716. SPEC §8, « Corrections de sécurité (securite-2, D-274) », points 1 à 4.
// Base « administrateur seul » avant et après chaque test. Données préparées par l'API, sauf l'entité dont
// l'écran est l'objet du test. Valeurs attendues recopiées de la SPEC.
// Contrat des écrans (phase verte) :
//   - aide « 12 caractères au moins » (texte exact, une fois) sous chaque champ de nouveau mot de passe :
//     « Mot de passe » de « Nouvel utilisateur », « Nouveau mot de passe » de « Modifier <nom> », du dialogue
//     « Changer mon mot de passe » et de la page « Changez votre mot de passe » ;
//   - en dessous de 12 caractères : message exact en `role="alert"`, aucun envoi ;
//   - écran Validation, ligne de sa propre feuille (hors administrateur) : ni « Valider », ni « Rejeter », ni
//     « Dévalider » ; la phrase « Votre feuille est validée par un autre valideur. » ; « Voir » présent ;
//   - onglet Affectations : pas de « Modifier les taux de <nom> » sur sa propre ligne.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, MOT_DE_PASSE, preparer, type Role } from './lot1-helpers.js';
import { H14, S, agirApi, imputerApi, jS, sessionDe } from './lot4b-helpers.js';
import { boutonDe, ligneValidation, ouvrirValidation, statutOk } from './lot4c-helpers.js';
import { nav, remettreAdminSeul6b } from './lot6b-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

const LEADER = 'leader_metier' as unknown as Role;
const AIDE = '12 caractères au moins';
const MESSAGE = 'Le mot de passe doit contenir au moins 12 caractères.';
const ONZE = 'abcdefghijk';
const DOUZE = 'abcdefghijkl';
const PHRASE = 'Votre feuille est validée par un autre valideur.';

const titreForce = (page: Page) =>
  page.getByRole('heading', { name: 'Changez votre mot de passe', level: 1 });

async function seConnecter(page: Page, identifiant: string, motDePasse: string): Promise<void> {
  await page.goto('/connexion');
  await page.getByLabel('Identifiant').fill(identifiant);
  await page.getByLabel('Mot de passe').fill(motDePasse);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

/** Compte les envois d'un POST ou PATCH dont l'adresse se termine par `fin`. */
function compterEnvois(page: Page, fin: RegExp): string[] {
  const envois: string[] = [];
  page.on('request', (r) => {
    if (['POST', 'PATCH'].includes(r.method()) && fin.test(new URL(r.url()).pathname)) {
      envois.push(`${r.method()} ${r.url()}`);
    }
  });
  return envois;
}

test('E2E-712 : « Changer mon mot de passe » et page « Changez votre mot de passe » : aide, 11 caractères refusés sans envoi, 12 acceptés (SC2-9, SC2-12, SC2-15)', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef 712', 'chef-712@securite-2.test', 'chef_de_projet');
  await connecterAvec(page, 'chef-712@securite-2.test');
  const envois = compterEnvois(page, /\/api\/auth\/mot-de-passe$/);

  await page
    .locator('aside')
    .getByRole('button', { name: 'Changer mon mot de passe', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Changer mon mot de passe' });
  await expect(dialog.getByText(AIDE, { exact: true })).toHaveCount(1);
  await dialog.getByLabel('Mot de passe actuel', { exact: true }).fill(MOT_DE_PASSE);
  await dialog.getByLabel('Nouveau mot de passe', { exact: true }).fill(ONZE);
  await dialog.getByLabel('Confirmation', { exact: true }).fill(ONZE);
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByRole('alert').filter({ hasText: MESSAGE })).toBeVisible();
  expect(envois).toHaveLength(0);
  await dialog.getByLabel('Nouveau mot de passe', { exact: true }).fill(DOUZE);
  await dialog.getByLabel('Confirmation', { exact: true }).fill(DOUZE);
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Mot de passe changé.')).toBeVisible();
  expect(envois).toHaveLength(1);

  // Page « Changez votre mot de passe » : même aide, même refus.
  await request.post('/api/utilisateurs', {
    data: {
      nom: 'Forcé 712',
      email: 'force-712@securite-2.test',
      mot_de_passe: MOT_DE_PASSE,
      role: 'ressource',
      doit_changer_mot_de_passe: true,
    },
  });
  await page.context().clearCookies();
  await seConnecter(page, 'force-712@securite-2.test', MOT_DE_PASSE);
  await expect(titreForce(page)).toBeVisible();
  await expect(page.getByText(AIDE, { exact: true })).toHaveCount(1);
  await page.getByLabel('Mot de passe actuel', { exact: true }).fill(MOT_DE_PASSE);
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(ONZE);
  await page.getByLabel('Confirmation', { exact: true }).fill(ONZE);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('alert').filter({ hasText: MESSAGE })).toBeVisible();
  await expect(titreForce(page)).toBeVisible();
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(DOUZE);
  await page.getByLabel('Confirmation', { exact: true }).fill(DOUZE);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(titreForce(page)).toHaveCount(0);
});

test('E2E-713 : l’administrateur : aide dans « Nouvel utilisateur » et « Modifier <nom> », 11 caractères refusés sans envoi, 12 acceptés, champ vide inchangé (SC2-9, SC2-11)', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Ress 713', 'ress-713@securite-2.test', 'ressource', true);
  await loginAsAdmin(page);
  await page.getByRole('link', { name: 'Utilisateurs', exact: true }).click();
  const envois = compterEnvois(page, /\/api\/utilisateurs(\/\d+)?$/);

  // Création.
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByText(AIDE, { exact: true })).toHaveCount(1);
  await dialog.getByLabel('Nom', { exact: true }).fill('Nouveau 713');
  await dialog.getByLabel('Email').fill('nouveau-713@securite-2.test');
  await dialog.getByLabel('Mot de passe', { exact: true }).fill(ONZE);
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(dialog.getByRole('alert').filter({ hasText: MESSAGE })).toBeVisible();
  expect(envois).toHaveLength(0);
  await dialog.getByLabel('Mot de passe', { exact: true }).fill(DOUZE);
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Nouveau 713/ })).toBeVisible();
  expect(envois).toHaveLength(1);

  // Modification : aide, 11 caractères refusés, 12 acceptés.
  await page.getByRole('button', { name: 'Modifier Ress 713' }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText(AIDE, { exact: true })).toHaveCount(1);
  await dialog.getByLabel('Nouveau mot de passe', { exact: true }).fill(ONZE);
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByRole('alert').filter({ hasText: MESSAGE })).toBeVisible();
  expect(envois).toHaveLength(1);
  await dialog.getByLabel('Nouveau mot de passe', { exact: true }).fill(DOUZE);
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  expect(envois).toHaveLength(2);

  // Champ vide : enregistrement sans contrôle de longueur.
  await page.getByRole('button', { name: 'Modifier Ress 713' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom', { exact: true }).fill('Ress 713 bis');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('row', { name: /Ress 713 bis/ })).toBeVisible();

  // Les mots de passe acceptés servent à la connexion.
  await page.context().clearCookies();
  await seConnecter(page, 'ress-713@securite-2.test', DOUZE);
  await expect(page).not.toHaveURL(/\/connexion/);
  await page.context().clearCookies();
  await seConnecter(page, 'nouveau-713@securite-2.test', DOUZE);
  await expect(page).not.toHaveURL(/\/connexion/);
});

test('E2E-714 : Validation : le chef ressource n’a aucun bouton sur sa propre feuille, la phrase et « Voir » ; boutons sur celle d’une autre ressource ; l’administrateur valide la feuille du chef (SC2-4, SC2-6)', async ({
  page,
  request,
  playwright,
}) => {
  const api = await preparer(request);
  const carl = await api.utilisateur(
    'Carl 714',
    'carl-714@securite-2.test',
    'chef_de_projet',
    true,
  );
  const alice = await api.utilisateur('Alice 714', 'alice-714@securite-2.test', 'ressource', true);
  const pc = await api.projet('PC714', 'Projet PC 714', carl.id);
  await api.affectation(pc.id, carl.id);
  await api.affectation(pc.id, alice.id);
  const ac = await api.activite(pc.id, 'Activité Carl');
  const aa = await api.activite(pc.id, 'Activité Alice');
  const assCarl = await api.assignation(ac.id, carl.id, 2);
  const assAlice = await api.assignation(aa.id, alice.id, 2);
  for (const [email, ass] of [
    ['carl-714@securite-2.test', assCarl.id],
    ['alice-714@securite-2.test', assAlice.id],
  ] as const) {
    const ctx = await sessionDe(playwright, email);
    const f = await imputerApi(ctx, S, [
      { assignation_id: ass, imputations: [{ jour: jS(12), charge: 1 }] },
    ]);
    await agirApi(ctx, f.feuille.id!, 'soumettre');
  }

  await page.clock.setFixedTime(H14);
  await connecterAvec(page, 'carl-714@securite-2.test');
  await ouvrirValidation(page);
  const propre = ligneValidation(page, 'Carl 714');
  await expect(propre).toHaveCount(1);
  await expect(boutonDe(propre, 'Voir la feuille de Carl 714')).toBeVisible();
  for (const verbe of ['Valider', 'Rejeter', 'Dévalider']) {
    await expect(boutonDe(propre, `${verbe} la feuille de Carl 714`), verbe).toHaveCount(0);
  }
  await expect(propre.getByText(PHRASE, { exact: true })).toBeVisible();
  const autre = ligneValidation(page, 'Alice 714');
  await expect(boutonDe(autre, 'Valider la feuille de Alice 714')).toBeVisible();
  await expect(boutonDe(autre, 'Rejeter la feuille de Alice 714')).toBeVisible();
  await expect(autre.getByText(PHRASE, { exact: true })).toHaveCount(0);

  // L'administrateur valide la feuille du chef à l'écran.
  await page.context().clearCookies();
  await loginAsAdmin(page);
  await ouvrirValidation(page);
  const ligneCarl = ligneValidation(page, 'Carl 714');
  await expect(ligneCarl.getByText(PHRASE, { exact: true })).toHaveCount(0);
  await boutonDe(ligneCarl, 'Valider la feuille de Carl 714').click();
  const confirmation = page.getByRole('dialog');
  await boutonDe(confirmation, 'Valider').click();
  await expect(statutOk(page, 'Feuille validée.')).toBeVisible();
  await expect(ligneCarl.getByText('Validée', { exact: true })).toBeVisible();
});

test('E2E-715 : onglet Affectations : pas de « Modifier les taux de <nom> » sur la ligne du chef, « Taux du jour » présente ; bouton utilisable sur la ligne d’une autre ressource (SC2-7, SC2-8)', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const carl = await api.utilisateur(
    'Carl 715',
    'carl-715@securite-2.test',
    'chef_de_projet',
    true,
  );
  const dora = await api.utilisateur('Dora 715', 'dora-715@securite-2.test', 'ressource', true);
  const pc = await api.projet('PC715', 'Projet PC 715', carl.id);
  await api.affectation(pc.id, carl.id);
  await api.affectation(pc.id, dora.id);
  await connecterAvec(page, 'carl-715@securite-2.test');
  await page.goto(`/projets/${pc.id}`);
  await page.getByRole('tab', { name: 'Affectations', exact: true }).click();
  await expect(page.getByRole('columnheader', { name: 'Taux du jour', exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Carl 715' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modifier les taux de Carl 715' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Modifier les taux de Dora 715' }).click();
  const dialog = page.getByRole('dialog', { name: 'Taux de Dora 715' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Fermer' }).click();
  await expect(dialog).toBeHidden();
});

test('E2E-716 : Historique d’un projet : le leader lit les lignes d’activité sans `charge_vendue`, l’administrateur lit la ligne (SC2-1 à SC2-3)', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 716', 'chef-716@securite-2.test', 'chef_de_projet');
  await api.utilisateur('Léa Leader 716', 'leader-716@securite-2.test', LEADER);
  const p = await api.projet('P716', 'Projet P 716', chef.id);
  const a = await api.activite(p.id, 'Analyse 716');
  for (const charge of [5, 7]) {
    const r = await request.patch(`/api/activites/${a.id}`, { data: { charge_vendue: charge } });
    expect(r.ok(), `charge vendue : ${r.status()}`).toBeTruthy();
  }
  const ouvrirHistorique = async () => {
    await page.goto(`/projets/${p.id}`);
    await page.getByRole('tab', { name: 'Historique', exact: true }).click();
    const tableau = page.getByRole('table', { name: 'Historique du projet' });
    await expect(tableau).toBeVisible();
    return tableau;
  };

  await connecterAvec(page, 'leader-716@securite-2.test');
  let tableau = await ouvrirHistorique();
  await expect(tableau.getByRole('row').filter({ hasText: 'Analyse 716' }).first()).toBeVisible();
  await expect(tableau.getByText('charge_vendue')).toHaveCount(0);
  await expect(nav(page)).toBeVisible();

  await page.context().clearCookies();
  await loginAsAdmin(page);
  tableau = await ouvrirHistorique();
  await expect(tableau.getByText('charge_vendue', { exact: true }).first()).toBeVisible();
});
