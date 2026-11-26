// Lot export-plan-de-charge (D-241, SPEC §7 « Exports CSV », points 3 et 5) : E2E-657.
// Base « administrateur seul » avant et après chaque test. Données : calendrier par défaut,
// capacité 1, janvier 2027 = 21 j ouvrés ; deux projets planifiés par l'API (calcul depuis D0).
import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { preparer } from './lot1-helpers.js';
import { activiteAvec, calculer } from './lot3b-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';

const BOM = '﻿';
const ADRESSE = '/plan-de-charge?debut=2027-01';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

const tableauPlan = (page: Page) => page.getByRole('table', { name: 'Plan de charge' });
const ligneDe = (page: Page, texte: string) =>
  tableauPlan(page).locator('tbody tr').filter({ hasText: texte });
/** Textes des 13 cellules d'une ligne (ressource, puis 12 mois). */
const textes = async (l: Locator) =>
  (await l.locator('th, td').allTextContents()).map((t) => t.trim());
const titreDe = (cellule: Locator): Promise<string | null> =>
  cellule.evaluate((el) => {
    for (const e of [el, ...Array.from(el.querySelectorAll('[title]'))]) {
      const t = e.getAttribute('title');
      if (t) return t;
    }
    return null;
  });

test('E2E-657 : « Exporter CSV » du plan de charge : en-tête des 12 mois de l’écran, lignes Charge, Disponible, Écart et projets, valeurs égales aux cellules et à leur title', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 657', 'chef-657@pcx.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice 657', 'alice-657@pcx.test', 'ressource', true);
  const p1 = await api.projet('PCX1', 'Projet export un', chef.id);
  const p2 = await api.projet('PCX2', 'Projet export deux', chef.id);
  for (const [p, jours, nom] of [
    [p1, 4, 'Tâche un'],
    [p2, 2, 'Tâche deux'],
  ] as const) {
    await api.affectation(p.id, alice.id);
    const a = await activiteAvec(request, p.id, nom);
    await api.assignation(a.id, alice.id, jours);
  }
  await calculer(request, [p1.id, p2.id]);

  await loginAsAdmin(page);
  await page.goto(ADRESSE);
  await expect(tableauPlan(page)).toBeVisible();
  await page.getByRole('button', { name: 'Déplier Alice 657' }).click();
  await expect(ligneDe(page, 'PCX2 · Projet export deux')).toBeVisible();

  // Valeurs de l'écran : en-tête, cellule de la ressource et son title, lignes de projet.
  const entete = (await tableauPlan(page).getByRole('columnheader').allTextContents()).map((t) =>
    t.trim(),
  );
  expect(entete).toHaveLength(13);
  const cellulesAlice = ligneDe(page, 'Alice 657').first().locator('th, td');
  const chargeEcran = (await textes(ligneDe(page, 'Alice 657').first())).slice(1);
  const titres: string[] = [];
  for (let i = 1; i <= 12; i += 1) titres.push((await titreDe(cellulesAlice.nth(i))) ?? '');
  const lecture = titres.map((t) => /^Charge (\S+) j, disponible (\S+) j, écart (\S+) j$/.exec(t));
  expect(
    lecture.every((m) => m !== null),
    titres.join(' | '),
  ).toBe(true);
  const projetsEcran = [
    (await textes(ligneDe(page, 'PCX1 · Projet export un'))).slice(1),
    (await textes(ligneDe(page, 'PCX2 · Projet export deux'))).slice(1),
  ];
  expect(chargeEcran[0]).toBe('6');
  expect(projetsEcran.map((p) => p[0])).toEqual(['4', '2']);

  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page
      .getByRole('link', { name: 'Exporter CSV', exact: true })
      .or(page.getByRole('button', { name: 'Exporter CSV', exact: true }))
      .click(),
  ]);
  expect(telechargement.suggestedFilename()).toBe('plan-de-charge-2027-01.csv');
  const texte = await readFile((await telechargement.path())!, 'utf8');
  expect(texte.startsWith(BOM), 'BOM').toBe(true);
  expect(texte.endsWith('\r\n'), 'CRLF final').toBe(true);
  const lignes = texte.slice(1, -2).split('\r\n');

  expect(lignes).toEqual([
    ['Ressource', 'Équipe', 'Ligne', ...entete.slice(1)].join(';'),
    ['Alice 657', '', 'Charge', ...chargeEcran].join(';'),
    ['Alice 657', '', 'Disponible', ...lecture.map((m) => m![2])].join(';'),
    ['Alice 657', '', 'Écart', ...lecture.map((m) => m![3])].join(';'),
    ['Alice 657', '', 'PCX1 · Projet export un', ...projetsEcran[0]!].join(';'),
    ['Alice 657', '', 'PCX2 · Projet export deux', ...projetsEcran[1]!].join(';'),
  ]);
  expect(lecture.map((m) => m![1])).toEqual(chargeEcran);
  expect(texte).not.toMatch(/Réel|Planifié/);
});
