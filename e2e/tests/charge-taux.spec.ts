// Lot absences, tranche charge-taux (D-276 ; SPEC §4, « Absences et charge depuis le taux », point 15) :
// E2E-724 et E2E-725. Base « administrateur seul » avant et après chaque test. Données préparées par l'API, sauf
// l'entité dont l'écran est l'objet du test. Horloge du navigateur figée au vendredi 15/01/2027.
// Valeurs attendues recopiées de SPEC §4 points 12 et 15 (CT-1 : fenêtre 04–15/01, taux 50 %, charge 5 j ;
// CT-16 : même fenêtre et même taux, Alice absente le 07/01 en journée, charge 4,5 j). Révision E2E-725-r1
// (D-278) : E2E-725 cite le cas CT-16, valeur inchangée.
// Contrat des écrans (phase verte) :
//   - dialogues « Assigner » (Planning) et « Modifier l'assignation » : case à cocher « Charge depuis le taux »,
//     présente seulement si l'activité est en mode REGUL ; cochée, le champ « Charge assignée (j) » porte
//     l'attribut `readonly` et l'aide « Recalculée à chaque calcul : taux × capacité × jours ouvrés restants,
//     absences déduites. ».
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { calculer } from './lot3b-helpers.js';
import { lignesMesTaches, nav, remettreAdminSeul6b } from './lot6b-helpers.js';

const J15 = '2027-01-15T10:00:00';
const CASE = 'Charge depuis le taux';
const AIDE =
  'Recalculée à chaque calcul : taux × capacité × jours ouvrés restants, absences déduites.';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

async function monde(request: APIRequestContext) {
  const api = await preparer(request);
  const admin = (await (await request.get('/api/auth/me')).json()) as { id: number };
  const alice = await api.utilisateur('Alice CT', 'alice@charge-taux.test', 'ressource', true);
  const p = await api.projet('PCT', 'Projet charge', admin.id);
  await api.affectation(p.id, alice.id);
  const r = await request.post(`/api/projets/${p.id}/activites`, {
    data: { nom: 'Support', mode: 'REGUL', debut_valide: '2027-01-04', fin_valide: '2027-01-15' },
  });
  expect(r.status(), await r.text()).toBe(201);
  const regul = (await r.json()) as { id: number };
  const asap = await api.activite(p.id, 'Étude');
  return { api, alice, p, regul, asap };
}

async function assignations(request: APIRequestContext, projetId: number) {
  const r = await request.get(`/api/projets/${projetId}/assignations`);
  return (await r.json()) as {
    activite_id: number;
    charge_depuis_taux: boolean;
    charge_assignee: number;
  }[];
}

async function ouvrirPlanning(page: Page, projetId: number) {
  await page.goto(`/projets/${projetId}?onglet=planning`);
  await expect(page.getByRole('button', { name: 'Nouvelle activité', exact: true })).toBeVisible();
}

test('E2E-724 : case « Charge depuis le taux » en REGUL seulement ; cochée, charge en lecture seule et aide ; modification', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await page.clock.setFixedTime(J15);
  await loginAsAdmin(page);
  await ouvrirPlanning(page, m.p.id);

  await page.getByRole('button', { name: 'Assigner une ressource à Étude', exact: true }).click();
  let d = page.getByRole('dialog');
  await expect(d.getByLabel('Ressource')).toBeVisible();
  await expect(d.getByRole('checkbox', { name: CASE })).toHaveCount(0);
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(d).toBeHidden();

  await page.getByRole('button', { name: 'Assigner une ressource à Support', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('Ressource').selectOption({ label: 'Alice CT' });
  await d.getByLabel('Taux (%)').fill('50');
  const caseCharge = d.getByRole('checkbox', { name: CASE });
  await expect(caseCharge).not.toBeChecked();
  await caseCharge.check();
  const charge = d.getByLabel('Charge assignée (j)');
  await expect(charge).toHaveAttribute('readonly', '');
  await expect(d.getByText(AIDE, { exact: true })).toBeVisible();
  await d.getByRole('button', { name: 'Assigner', exact: true }).click();
  await expect(d).toBeHidden();
  const lues = await assignations(request, m.p.id);
  expect(lues.map((a) => [a.activite_id, a.charge_depuis_taux])).toEqual([[m.regul.id, true]]);

  await page
    .getByRole('button', { name: "Modifier l'assignation de Alice CT à Support", exact: true })
    .click();
  d = page.getByRole('dialog', { name: 'Modifier l’assignation' });
  await expect(d.getByRole('checkbox', { name: CASE })).toBeChecked();
  await expect(d.getByLabel('Charge assignée (j)')).toHaveAttribute('readonly', '');
  await d.getByRole('checkbox', { name: CASE }).uncheck();
  await expect(d.getByLabel('Charge assignée (j)')).not.toHaveAttribute('readonly', /.*/);
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d).toBeHidden();
  expect((await assignations(request, m.p.id))[0]!.charge_depuis_taux).toBe(false);
});

test('E2E-725-r1 : parcours 3 : charge calculée (5 j, CT-1), congé posé à l’écran, nouveau calcul : 4,5 j au Gantt et dans Mes tâches (CT-16)', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  const r = await request.post(`/api/activites/${m.regul.id}/assignations`, {
    data: { ressource_id: m.alice.id, charge_assignee: 1, taux: 50, charge_depuis_taux: true },
  });
  expect(r.status(), await r.text()).toBe(201);
  await calculer(request, [m.p.id]);

  await page.clock.setFixedTime(J15);
  await loginAsAdmin(page);
  await page.goto(`/projets/${m.p.id}?onglet=gantt`);
  const bouton = page.getByRole('button', {
    name: "Modifier l'assignation de Alice CT à Support",
    exact: true,
  });
  await expect(bouton).toHaveAttribute('title', 'Alice CT — 5 j');

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await connecterAvec(page, 'alice@charge-taux.test');
  await expect(lignesMesTaches(page)).toHaveCount(1);
  await expect(lignesMesTaches(page).first().locator('td').nth(4)).toHaveText('5');
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await page.getByRole('tab', { name: 'Absences', exact: true }).click();
  await page.getByRole('button', { name: 'Nouvelle absence', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Nouvelle absence', exact: true });
  await d.getByLabel('Du', { exact: true }).fill('2027-01-07');
  await d.getByLabel('Au', { exact: true }).fill('2027-01-07');
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d).toBeHidden();

  await calculer(request, [m.p.id]);
  await nav(page).getByRole('link', { name: 'Mes tâches', exact: true }).click();
  await expect(lignesMesTaches(page).first().locator('td').nth(4)).toHaveText('4,5');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await loginAsAdmin(page);
  await page.goto(`/projets/${m.p.id}?onglet=gantt`);
  await expect(bouton).toHaveAttribute('title', 'Alice CT — 4,5 j');
});
