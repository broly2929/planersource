// Lot absences-suite (D-278 ; SPEC §4, « Absences et charge depuis le taux », points 21, 23 et 24) : E2E-727 à
// E2E-730. Base « administrateur seul » avant et après chaque test. Données préparées par l'API, sauf l'entité
// dont l'écran est l'objet du test. Horloge du navigateur figée au vendredi 15/01/2027.
// Valeurs attendues recopiées de SPEC §4 : message du point 21 ; aide du point 15 ; PCA-1 (disponible 01/2027 : 16).
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { calculer } from './lot3b-helpers.js';
import { nav, remettreAdminSeul6b } from './lot6b-helpers.js';

const J15 = '2027-01-15T10:00:00';
const CASE = 'Charge depuis le taux';
const AIDE =
  'Recalculée à chaque calcul : taux × capacité × jours ouvrés restants, absences déduites.';
const T_DUREE = 'Une absence dure au plus 366 jours.';
const EMAIL = 'alice@absences-suite.test';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.clock.setFixedTime(J15);
});
test.afterEach(remettreAdminSeul6b);

/** Alice ; projet PAS : « Support » (REGUL 04–15/01, Alice 50 %, charge depuis le taux), « Étude » (ASAP, Alice 2 j). */
async function monde(request: APIRequestContext) {
  const api = await preparer(request);
  const admin = (await (await request.get('/api/auth/me')).json()) as { id: number };
  const alice = await api.utilisateur('Alice AS', EMAIL, 'ressource', true);
  const p = await api.projet('PAS', 'Projet absences-suite', admin.id);
  await api.affectation(p.id, alice.id);
  const r = await request.post(`/api/projets/${p.id}/activites`, {
    data: { nom: 'Support', mode: 'REGUL', debut_valide: '2027-01-04', fin_valide: '2027-01-15' },
  });
  expect(r.status(), await r.text()).toBe(201);
  const regul = (await r.json()) as { id: number };
  const a = await request.post(`/api/activites/${regul.id}/assignations`, {
    data: { ressource_id: alice.id, charge_assignee: 1, taux: 50, charge_depuis_taux: true },
  });
  expect(a.status(), await a.text()).toBe(201);
  const etude = await api.activite(p.id, 'Étude');
  await api.assignation(etude.id, alice.id, 2);
  await calculer(request, [p.id]);
  return { alice, p };
}

const bouton = (page: Page, activite: string) =>
  page.getByRole('button', {
    name: `Modifier l'assignation de Alice AS à ${activite}`,
    exact: true,
  });
const dialogue = (page: Page) => page.getByRole('dialog', { name: 'Modifier l’assignation' });

async function nouvelleAbsence(page: Page, du: string, au: string): Promise<Locator> {
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await page.getByRole('tab', { name: 'Absences', exact: true }).click();
  await page.getByRole('button', { name: 'Nouvelle absence', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Nouvelle absence', exact: true });
  await d.getByLabel('Du', { exact: true }).fill(du);
  await d.getByLabel('Au', { exact: true }).fill(au);
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  return d;
}

// Révision E2E-727-r1 (D-271, @reviewer) : test de refus, aucune absence ajoutée vérifiée à l'écran et par l'API.
test('E2E-727-r1 : absence de 367 jours refusée à l’écran, message du point 21, dialogue ouvert, aucune absence ajoutée', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Alice AS', EMAIL, 'ressource', true);
  await connecterAvec(page, EMAIL);
  const d = await nouvelleAbsence(page, '2027-01-01', '2028-01-02');
  await expect(d.getByText(T_DUREE, { exact: true })).toBeVisible();
  await expect(d).toBeVisible();
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  // garde D-188 : « Abandonner les modifications ? »
  await page.getByRole('button', { name: 'Abandonner', exact: true }).click();
  await expect(d).toBeHidden();
  await expect(page.getByText('Aucune absence.', { exact: true })).toBeVisible();
  const lues = await request.get('/api/absences');
  expect(lues.status()).toBe(200);
  expect(await lues.json()).toEqual([]);
});

test('E2E-728 : Gantt d’un projet, « Modifier l’assignation » d’une REGUL : case cochée, charge en lecture seule ; décocher, saisir, enregistrer', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await loginAsAdmin(page);
  await page.goto(`/projets/${m.p.id}?onglet=gantt&zoom=jour`);
  await expect(bouton(page, 'Support')).toHaveAttribute('title', 'Alice AS — 5 j');

  await bouton(page, 'Étude').click();
  let d = dialogue(page);
  await expect(d.getByLabel('Charge assignée (j)')).toBeVisible();
  await expect(d.getByRole('checkbox', { name: CASE })).toHaveCount(0);
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(d).toBeHidden();

  await bouton(page, 'Support').click();
  d = dialogue(page);
  const caseCharge = d.getByRole('checkbox', { name: CASE });
  await expect(caseCharge).toBeChecked();
  const charge = d.getByLabel('Charge assignée (j)');
  await expect(charge).toHaveAttribute('readonly', '');
  await expect(d.getByText(AIDE, { exact: true })).toBeVisible();
  await caseCharge.uncheck();
  await expect(charge).not.toHaveAttribute('readonly', '');
  await charge.fill('3');
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d).toBeHidden();
  await expect(bouton(page, 'Support')).toHaveAttribute('title', 'Alice AS — 3 j');
});

test('E2E-729 : Accueil, « Modifier l’assignation » d’une REGUL : case cochée ; taux enregistré sans refus ; case cochée à la réouverture', async ({
  page,
  request,
}) => {
  await monde(request);
  await loginAsAdmin(page);
  await page.goto('/?zoom=jour');
  await bouton(page, 'Support').click();
  let d = dialogue(page);
  await expect(d.getByRole('checkbox', { name: CASE })).toBeChecked();
  await expect(d.getByLabel('Charge assignée (j)')).toHaveAttribute('readonly', '');
  await d.getByLabel('Taux (%)').fill('40');
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d).toBeHidden();

  await bouton(page, 'Support').click();
  d = dialogue(page);
  await expect(d.getByRole('checkbox', { name: CASE })).toBeChecked();
  await expect(d.getByLabel('Taux (%)')).toHaveValue('40');
});

test('E2E-730 : Plan de charge, congé du 04/01 au 08/01/2027 posé à l’écran : disponible 16 j en 01/2027 (PCA-1)', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Alice AS', EMAIL, 'ressource', true);
  await connecterAvec(page, EMAIL);
  const d = await nouvelleAbsence(page, '2027-01-04', '2027-01-08');
  await expect(d).toBeHidden();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  await loginAsAdmin(page);
  await page.goto('/pilotage?onglet=charge&debut=2027-01');
  const ligne = page
    .getByRole('table', { name: 'Plan de charge' })
    .locator('tbody tr')
    .filter({ hasText: 'Alice AS' });
  const cellule = ligne.locator('th, td').nth(1);
  await expect
    .poll(() =>
      cellule.evaluate((el) => {
        for (const e of [el, ...Array.from(el.querySelectorAll('[title]'))]) {
          const t = e.getAttribute('title');
          if (t) return t;
        }
        return null;
      }),
    )
    .toBe('Charge 0 j, disponible 16 j, écart 16 j');
});
