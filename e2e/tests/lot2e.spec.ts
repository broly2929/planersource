import { expect, test } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { chefLecteur } from './lot6b-helpers.js';
import { activite, clore, libelleCase, lireSaisies, monde, poserSaisies } from './lot2e-helpers.js';

/*
 * Contrat (D-060, SPEC « Écran Planning manuel ») : page /projets/:id/planning-manuel/:activiteId?mois=AAAA-MM,
 * bouton de ligne « Planning manuel » dans l'onglet Planning, une ligne par assignation, deux cases à cocher
 * par jour nommées « <ressource>, <jour> <mois>, matin|après-midi » (ex. « Alice E2E26, 5 janvier, matin »),
 * boutons « Enregistrer », « Annuler », « Mois précédent », « Mois suivant », notification de succès (role=status).
 * Le mois est fixé par ?mois=2027-01 pour ne pas dépendre de la date du jour.
 */

test('E2E-26 : le chef saisit une journée d’Alice en janvier 2027 et l’enregistre', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E26');
  await connecterAvec(page, m.emailChef);
  await page.getByRole('link', { name: 'Projets' }).click();
  await page.getByRole('link', { name: m.projetNom, exact: true }).click();
  await page
    .getByRole('row', { name: new RegExp(m.nomMan) })
    .getByLabel('Planning manuel')
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/projets/${m.projet.id}/planning-manuel/${m.man.id}(\\?.*)?$`),
  );
  await page.goto(`/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=2027-01`);

  const matin = page.getByRole('checkbox', {
    name: libelleCase(m.nomAlice, 5, 'janvier', 'matin'),
  });
  const apresMidi = page.getByRole('checkbox', {
    name: libelleCase(m.nomAlice, 5, 'janvier', 'après-midi'),
  });
  const ligneAlice = page.getByRole('row', { name: new RegExp(`^${m.nomAlice}`) });
  await matin.check();
  await expect(ligneAlice).toContainText('0,5');
  await apresMidi.check();
  await expect(ligneAlice).not.toContainText('0,5');
  await expect(ligneAlice).toContainText('1');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('status').filter({ hasText: /enregistr/i })).toBeVisible();

  await page.reload();
  await expect(matin).toBeChecked();
  await expect(apresMidi).toBeChecked();
  expect(await lireSaisies(request, m.man.id, '2027-01')).toHaveLength(2);
});

test('E2E-27-r1 : changement de mois : boutons actifs avec une saisie en attente, confirmation, Annuler', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E27');
  await poserSaisies(request, m.man.id, '2027-01', [
    { assignation_id: m.assignation.id, jour: '2027-01-05', demi_journee: 'matin' },
  ]);
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=2027-01`);
  const caseJanvier = page.getByRole('checkbox', {
    name: libelleCase(m.nomAlice, 5, 'janvier', 'matin'),
  });
  await expect(caseJanvier).toBeChecked();

  await page.getByRole('button', { name: 'Mois suivant' }).click();
  await expect(page).toHaveURL(/mois=2027-02/);
  const fevrier = page.getByRole('checkbox', {
    name: new RegExp(`^${m.nomAlice}, \\d+ février, `),
  });
  await expect(fevrier).toHaveCount(56);
  await expect(fevrier.first()).not.toBeChecked();
  await expect(
    page.getByRole('checkbox', {
      name: new RegExp(`^${m.nomAlice}, \\d+ février, `),
      checked: true,
    }),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Mois précédent' }).click();
  await expect(page).toHaveURL(/mois=2027-01/);
  await expect(caseJanvier).toBeChecked();

  const autre = page.getByRole('checkbox', {
    name: libelleCase(m.nomAlice, 6, 'janvier', 'matin'),
  });
  // Révision D-172 (6) : les boutons de mois restent actifs ; le changement de mois avec une saisie
  // en attente est confirmé, « Annuler » garde le mois et la saisie.
  await autre.check();
  await expect(page.getByRole('button', { name: 'Mois précédent' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Mois suivant' })).toBeEnabled();
  await page.getByRole('button', { name: 'Mois précédent' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Abandonner les modifications ?' });
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(dialogue).toHaveCount(0);
  await expect(page).toHaveURL(/mois=2027-01/);
  await expect(autre).toBeChecked();

  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(autre).not.toBeChecked();
  await expect(caseJanvier).toBeChecked();
  await expect(page.getByRole('button', { name: 'Mois précédent' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Mois suivant' })).toBeEnabled();
});

test('E2E-28 : décocher une saisie enregistrée et enregistrer la supprime', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E28');
  await poserSaisies(request, m.man.id, '2027-01', [
    { assignation_id: m.assignation.id, jour: '2027-01-05', demi_journee: 'matin' },
  ]);
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=2027-01`);
  const matin = page.getByRole('checkbox', {
    name: libelleCase(m.nomAlice, 5, 'janvier', 'matin'),
  });
  await expect(matin).toBeChecked();
  await matin.uncheck();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('status').filter({ hasText: /enregistr/i })).toBeVisible();
  expect(await lireSaisies(request, m.man.id, '2027-01')).toEqual([]);
});

test('E2E-29-r1 : lecture seule (chef affecté au projet d’un autre chef, activité close) et pas de bouton sur une activité ASAP', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E29');
  await poserSaisies(request, m.man.id, '2027-01', [
    { assignation_id: m.assignation.id, jour: '2027-01-05', demi_journee: 'matin' },
  ]);
  const asap = await activite(request, m.projet.id, `Auto E2E29`, 'ASAP');
  expect(asap.id).toBeGreaterThan(0);
  const adresse = `/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=2027-01`;
  const caseMatin = page.getByRole('checkbox', {
    name: libelleCase(m.nomAlice, 5, 'janvier', 'matin'),
  });

  // Chef lecteur : grille visible, cases désactivées, aucun bouton d'écriture
  // Révision 6b (D-031, D-148 (9)) : témoin lecture seule = chef de projet affecté au projet d'un autre chef.
  await connecterAvec(page, await chefLecteur(request, m.projet.id, 'E2E29'));
  await page.goto(adresse);
  await expect(caseMatin).toBeChecked();
  await expect(caseMatin).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Annuler' })).toHaveCount(0);

  // Activité close : même chose pour le chef
  await clore(request, m.man.id);
  await page.context().clearCookies();
  await connecterAvec(page, m.emailChef);
  await page.goto(adresse);
  await expect(caseMatin).toBeChecked();
  await expect(caseMatin).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Annuler' })).toHaveCount(0);

  // Activité ASAP : pas de bouton « Planning manuel » sur sa ligne
  await page.goto(`/projets/${m.projet.id}`);
  await expect(page.getByRole('row', { name: /Auto E2E29/ })).toBeVisible();
  await expect(
    page.getByRole('row', { name: /Auto E2E29/ }).getByLabel('Planning manuel'),
  ).toHaveCount(0);
});

test('E2E-30 : activité non MAN, activité sans assignation, lien de retour', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E30');
  const asap = await activite(request, m.projet.id, 'Auto E2E30', 'ASAP');
  const vide = await activite(request, m.projet.id, 'Vide E2E30', 'MAN');
  await connecterAvec(page, m.emailChef);

  // (a) activité ASAP ouverte par l'adresse : message, pas de grille
  await page.goto(`/projets/${m.projet.id}/planning-manuel/${asap.id}?mois=2027-01`);
  await expect(page.getByText("Cette activité n'est pas en planning manuel.")).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);

  // (b) activité MAN sans assignation : état vide, pas de case
  await page.goto(`/projets/${m.projet.id}/planning-manuel/${vide.id}?mois=2027-01`);
  await expect(page.getByText(/aucune assignation/i)).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);

  // (c) lien de retour depuis la page de l'activité MAN
  await page.goto(`/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=2027-01`);
  await page.getByRole('link', { name: 'Retour au projet' }).click();
  await expect(page).toHaveURL(new RegExp(`/projets/${m.projet.id}$`));
});
