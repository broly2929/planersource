// Lot couts, tranche 2 (D-229 ; SPEC §12.3, §12.4) : E2E-629 à E2E-635. Colonnes « OTP », « Coût planifié » et
// « Coût réel » cochées par le menu « Colonnes », marque « incomplet », « Totaux du projet », export des coûts,
// lecture seule, parcours complet. Valeurs attendues recopiées de SPEC §12.3 (COUT-6) et §12.4 (exemple d'export).
// Le serveur d'e2e utilise la vraie date du jour : les taux sont posés relativement à elle (Alice 600 € depuis
// 2000-01-01 ; Carol 500 € sur l'année 2000 seulement), ce qui redonne les valeurs de COUT-6 le jour même ; les
// dates exactes de COUT-1 à COUT-7 sont prouvées par vitest (date du jour en paramètre).
// Contrat des écrans (phase verte) :
//   - menu « Colonnes » du Gantt d'un projet : « OTP » pour tout lecteur, « Coût planifié » et « Coût réel » si
//     peut_ecrire ; de l'Accueil : les trois, cellules de coût vides hors peut_ecrire ;
//   - cellule de coût : « 3 000,00 € » ; marque « incomplet » avec title « Taux manquant » ;
//   - région « Totaux du projet » : « · Coût planifié X € · Coût réel Y € » et la marque ;
//   - lien « Exporter les coûts » (téléchargement) dans le Gantt d'un projet si peut_ecrire.
import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import pg from 'pg';
import { exigerBaseTest } from '../../scripts/lib/garde-base-test.mjs';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { activiteAvec } from './lot3b-helpers.js';
import { chefLecteur, remettreAdminSeul6b } from './lot6b-helpers.js';
import { loginAsAdmin } from './helpers.js';
import { allerA, creerRessourceParEcran, NOM_ADMIN } from './lot3c-helpers.js';

const NBSP = ' ';
const J15 = '2027-01-15T10:00:00';
const euro = (milliers: number, centimes = '00') => {
  const s = String(milliers).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${s},${centimes}${NBSP}€`;
};

async function remettre(): Promise<void> {
  const client = new pg.Client({ connectionString: exigerBaseTest(process.env) });
  await client.connect();
  try {
    await client.query('DELETE FROM taux_journalier');
  } finally {
    await client.end();
  }
  await remettreAdminSeul6b();
}
test.beforeEach(remettre);
test.afterEach(remettre);

async function poserTaux(request: APIRequestContext, id: number, corps: Record<string, unknown>) {
  const r = await request.post(`/api/utilisateurs/${id}/taux`, { data: corps });
  expect(r.status(), await r.text()).toBe(201);
}

/** Monde de COUT-6 : projet « OTP-A », P (1), F1 (1.1, Alice 5 j), F2 (1.2, Carol 2 j sans taux à la date du jour). */
async function monde(request: APIRequestContext, s: string) {
  const api = await preparer(request);
  const t = s.toLowerCase();
  const emailChef = `chef-${t}@example.test`;
  const chef = await api.utilisateur(`Chef ${s}`, emailChef, 'chef_de_projet');
  const projet = await api.projet(`P-${s}`, `Projet ${s}`, chef.id);
  const patch = await request.fetch(`/api/projets/${projet.id}`, {
    method: 'PATCH',
    data: { otp: 'OTP-A' },
  });
  expect(patch.ok(), await patch.text()).toBeTruthy();
  const alice = await api.utilisateur(`Alice ${s}`, `alice-${t}@example.test`, 'ressource', true);
  const carol = await api.utilisateur(`Carol ${s}`, `carol-${t}@example.test`, 'ressource', true);
  await api.affectation(projet.id, alice.id);
  await api.affectation(projet.id, carol.id);
  await poserTaux(request, alice.id, { debut: '2000-01-01', montant: 600 });
  await poserTaux(request, carol.id, { debut: '2000-01-01', fin: '2000-12-31', montant: 500 });
  const p = await activiteAvec(request, projet.id, 'P');
  const f1 = await activiteAvec(request, projet.id, 'F1', { parent_id: p.id });
  const f2 = await activiteAvec(request, projet.id, 'F2', { parent_id: p.id });
  await api.assignation(f1.id, alice.id, 5);
  await api.assignation(f2.id, carol.id, 2);
  return { api, chef, emailChef, projet, p, f1, f2 };
}

const tableauGantt = (page: Page) =>
  page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
const tableauAccueil = (page: Page) =>
  page.getByRole('region', { name: 'Tableau du Gantt global', exact: true });
const regionTotaux = (page: Page) => page.getByRole('region', { name: 'Totaux du projet' });

async function ouvrirGantt(page: Page, projetId: number) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/projets/${projetId}?onglet=gantt`);
  await page.locator('svg[data-zoom]').waitFor();
}

async function cocher(page: Page, titres: string[]) {
  await page.getByRole('button', { name: 'Colonnes', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  for (const t of titres)
    await menu.getByRole('menuitemcheckbox', { name: t, exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
}

/** Cellule de la ligne dont le nom est `nom`, dans la colonne `colonne` du tableau `zone`. */
async function cellule(zone: Locator, nom: string, colonne: string): Promise<Locator> {
  const entetes = (await zone.getByRole('columnheader').allTextContents()).map((x) => x.trim());
  const i = entetes.indexOf(colonne);
  expect(
    i,
    `colonne « ${colonne} » absente (colonnes : ${entetes.join(', ')})`,
  ).toBeGreaterThanOrEqual(0);
  const ligne = zone.getByRole('row').filter({ has: zone.page().getByText(nom, { exact: true }) });
  return ligne.getByRole('cell').nth(i);
}

test('E2E-629 : Gantt d’un projet, colonnes « OTP », « Coût planifié » et « Coût réel » cochées par le menu : valeurs de COUT-6', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E629');
  await page.clock.setFixedTime(J15);
  await connecterAvec(page, m.emailChef);
  await ouvrirGantt(page, m.projet.id);
  const z = tableauGantt(page);
  await expect(z.getByRole('columnheader', { name: 'OTP', exact: true })).toHaveCount(0);
  await cocher(page, ['OTP', 'Coût planifié', 'Coût réel']);
  for (const nom of ['P', 'F1', 'F2']) {
    await expect(await cellule(z, nom, 'OTP')).toHaveText('OTP-A');
  }
  await expect(await cellule(z, 'F1', 'Coût planifié')).toHaveText(euro(3000));
  await expect(await cellule(z, 'F1', 'Coût réel')).toHaveText(euro(3000));
  await expect(await cellule(z, 'F2', 'Coût planifié')).toContainText(`0,00${NBSP}€`);
  await expect(await cellule(z, 'F2', 'Coût réel')).toContainText(`0,00${NBSP}€`);
  await expect(await cellule(z, 'P', 'Coût planifié')).toContainText(euro(3000));
  await expect(await cellule(z, 'P', 'Coût réel')).toContainText(euro(3000));
});

test('E2E-630 : Accueil, colonnes « OTP », « Coût planifié » et « Coût réel » cochées par le menu : valeurs de COUT-6 sur les activités, lignes de projet vides', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E630');
  await page.clock.setFixedTime(J15);
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecterAvec(page, m.emailChef);
  await page.goto('/');
  await expect(tableauAccueil(page).getByText('F1', { exact: true })).toBeVisible();
  await cocher(page, ['OTP', 'Coût planifié', 'Coût réel']);
  const z = tableauAccueil(page);
  await expect(await cellule(z, 'F1', 'OTP')).toHaveText('OTP-A');
  await expect(await cellule(z, 'F1', 'Coût planifié')).toHaveText(euro(3000));
  await expect(await cellule(z, 'F1', 'Coût réel')).toHaveText(euro(3000));
  await expect(await cellule(z, 'F2', 'Coût planifié')).toContainText(`0,00${NBSP}€`);
  await expect(await cellule(z, 'P', 'Coût réel')).toContainText(euro(3000));
  // ligne de projet : vide, comme Vendu et Marge (D-212 (4))
  await expect(await cellule(z, `Projet E2E630`, 'OTP')).toHaveText('');
  await expect(await cellule(z, `Projet E2E630`, 'Coût planifié')).toHaveText('');
  await expect(await cellule(z, `Projet E2E630`, 'Coût réel')).toHaveText('');
});

test('E2E-631 : marque « incomplet » (title « Taux manquant ») sur F2, P ; pas sur F1', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E631');
  await connecterAvec(page, m.emailChef);
  await ouvrirGantt(page, m.projet.id);
  await cocher(page, ['Coût planifié', 'Coût réel']);
  const z = tableauGantt(page);
  for (const colonne of ['Coût planifié', 'Coût réel']) {
    const f2 = (await cellule(z, 'F2', colonne)).getByText('incomplet', { exact: true });
    await expect(f2).toHaveAttribute('title', 'Taux manquant');
    await expect(
      (await cellule(z, 'P', colonne)).getByText('incomplet', { exact: true }),
    ).toHaveAttribute('title', 'Taux manquant');
    await expect((await cellule(z, 'F1', colonne)).getByText('incomplet')).toHaveCount(0);
  }
});

test('E2E-632 : région « Totaux du projet » : coûts planifié et réel de COUT-6 et marque « incomplet »', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E632');
  await connecterAvec(page, m.emailChef);
  await ouvrirGantt(page, m.projet.id);
  const r = regionTotaux(page);
  await expect(r).toContainText(`· Coût planifié ${euro(3000)} · Coût réel ${euro(3000)}`);
  await expect(r.getByText('incomplet', { exact: true })).toHaveAttribute('title', 'Taux manquant');
});

const EXEMPLE = [
  'WBS;Activité;OTP;Charge assignée;Charge réelle;Reste;Coût planifié;Coût imputé;Coût réel;Taux manquant',
  '1;P;OTP-A;7;0;7;3000;0;3000;oui',
  '1.1;F1;OTP-A;5;0;5;3000;0;3000;non',
  '1.2;F2;OTP-A;2;0;2;0;0;0;oui',
  'Total;;;7;0;7;3000;0;3000;oui',
]
  .map((l) => `${l}\r\n`)
  .join('');

async function telecharger(page: Page): Promise<{ nom: string; contenu: string }> {
  const [d] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Exporter les coûts' }).click(),
  ]);
  return { nom: d.suggestedFilename(), contenu: readFileSync((await d.path())!, 'utf8') };
}

test('E2E-633 : « Exporter les coûts » télécharge le fichier de l’exemple de §12.4 ; rien n’est modifié', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E633');
  await connecterAvec(page, m.emailChef);
  await ouvrirGantt(page, m.projet.id);
  const avant = await (await request.get(`/api/projets/${m.projet.id}/gantt`)).text();
  const { nom, contenu } = await telecharger(page);
  expect(nom).toMatch(/^couts-P-E2E633-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(contenu).toBe('﻿' + EXEMPLE);
  expect(await (await request.get(`/api/projets/${m.projet.id}/gantt`)).text()).toBe(avant);
});

test('E2E-634 : chef de projet en lecture seule : « OTP » au menu, ni « Coût planifié » ni « Coût réel », ni export, ni coûts dans les totaux', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E634');
  const email = await chefLecteur(request, m.projet.id, 'E634');
  const corpsLus: string[] = [];
  await page.route(/\/api\/projets\/\d+\/gantt$/, async (route) => {
    const rep = await route.fetch();
    corpsLus.push(await rep.text());
    await route.fulfill({ response: rep });
  });
  await connecterAvec(page, email);
  await ouvrirGantt(page, m.projet.id);
  await page.getByRole('button', { name: 'Colonnes', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitemcheckbox', { name: 'OTP', exact: true })).toBeVisible();
  await expect(
    menu.getByRole('menuitemcheckbox', { name: 'Coût planifié', exact: true }),
  ).toHaveCount(0);
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Coût réel', exact: true })).toHaveCount(
    0,
  );
  await menu.getByRole('menuitemcheckbox', { name: 'OTP', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(await cellule(tableauGantt(page), 'F1', 'OTP')).toHaveText('OTP-A');
  await expect(page.getByRole('link', { name: 'Exporter les coûts' })).toHaveCount(0);
  await expect(regionTotaux(page)).toHaveCount(0);
  expect(corpsLus.length).toBeGreaterThanOrEqual(1);
  for (const c of corpsLus) expect(c).not.toMatch(/cout_|taux_manquant/);
});

test('E2E-635-r1 : parcours complet à l’écran, base « administrateur seul » : taux, projet avec OTP, affectation, activité assignée, colonnes de coût, export', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await creerRessourceParEcran(page, 'Zoé 635', 'zoe-635@example.test', 'Calendrier par défaut');
  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Modifier Zoé 635', exact: true }).click();
  const u = page.getByRole('dialog', { name: 'Modifier Zoé 635' });
  const taux = u.getByRole('region', { name: 'Taux journaliers' });
  await taux.getByLabel('Du', { exact: true }).fill('2000-01-01');
  await taux.getByLabel('Montant (€)').fill('600');
  await taux.getByRole('button', { name: 'Ajouter le taux' }).click();
  await expect(taux.locator('tbody tr')).toHaveCount(1);
  await u.getByRole('button', { name: 'Annuler' }).click();
  await expect(u).toBeHidden();

  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const n = page.getByRole('dialog');
  await n.getByLabel('Code').fill('P635');
  await n.getByLabel('Nom').fill('Projet 635');
  await n.getByLabel('Chef de projet').selectOption({ label: NOM_ADMIN });
  await n.getByLabel('Pas avant le').fill('2027-01-04');
  await n.getByLabel('OTP', { exact: true }).fill('FIN-635');
  await n.getByRole('button', { name: 'Créer' }).click();
  await page.getByRole('link', { name: 'Projet 635' }).click();

  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  const af = page.getByRole('dialog', { name: 'Affecter une ressource' });
  await af.getByLabel('Ressource').selectOption({ label: 'Zoé 635' });
  await af.getByRole('button', { name: 'Affecter' }).click();
  await expect(af).toBeHidden();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const na = page.getByRole('dialog', { name: 'Nouvelle activité' });
  await na.getByLabel('Nom').fill('Étude 635');
  await na.getByRole('button', { name: 'Créer' }).click();
  await expect(na).toBeHidden();
  await page.getByRole('button', { name: 'Assigner une ressource à Étude 635' }).click();
  const as = page.getByRole('dialog');
  await as.getByLabel('Ressource').selectOption({ label: 'Zoé 635' });
  await as.getByLabel('Charge assignée (j)').fill('4');
  await as.getByRole('button', { name: 'Assigner' }).click();
  await expect(as).toBeHidden();

  await page.getByRole('tab', { name: 'Gantt' }).click();
  await page.locator('svg[data-zoom]').waitFor();
  await cocher(page, ['OTP', 'Coût planifié', 'Coût réel']);
  const z = tableauGantt(page);
  await expect(await cellule(z, 'Étude 635', 'OTP')).toHaveText('FIN-635');
  await expect(await cellule(z, 'Étude 635', 'Coût planifié')).toHaveText(euro(2400));
  await expect(await cellule(z, 'Étude 635', 'Coût réel')).toHaveText(euro(2400));
  await expect(regionTotaux(page)).toContainText(
    `· Coût planifié ${euro(2400)} · Coût réel ${euro(2400)}`,
  );
  const { nom, contenu } = await telecharger(page);
  expect(nom).toMatch(/^couts-P635-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(contenu).toBe(
    '﻿' +
      [
        'WBS;Activité;OTP;Charge assignée;Charge réelle;Reste;Coût planifié;Coût imputé;Coût réel;Taux manquant',
        '1;Étude 635;FIN-635;4;0;4;2400;0;2400;non',
        'Total;;;4;0;4;2400;0;2400;non',
      ]
        .map((l) => `${l}\r\n`)
        .join(''),
  );
});
