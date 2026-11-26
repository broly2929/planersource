// Lot pilotage, tranche 2 (D-245 ; SPEC §12.5 points 1, 7 et 8) : E2E-658 à E2E-665. Écran « Pilotage »
// (onglets « Plan de charge » et « Coûts »), onglet « Coûts », « Exporter les coûts » dans « Totaux du projet ».
// Base « administrateur seul » avant et après chaque test. Valeurs de l'écran égales à `GET /api/couts`
// (tranche 1), formatées par `formatMontant`, plus un montant fixe : Alice (600 €/j depuis 2000-01-01) planifiée
// 4 j à partir du 04/01/2027 → janvier 2027 : 4 × 600 = 2 400,00 €. Carol n'a de taux que sur l'année 2000 :
// coût 0, taux manquant. Bob n'a aucun taux : 0, sans marque (§12.5 point 2).
// Contrat des écrans (phase verte) :
//   - menu « Pilotage » ; onglets role=tab « Plan de charge » et « Coûts » ; adresse /pilotage?onglet=…&debut=…&equipe=… ;
//   - région « Coûts » (tabindex 0), lignes « <code> · <nom> », boutons « Déplier <code> » (aria-expanded),
//     cellules « 2 400,00 € » dont le title est « Réel 0,00 €, planifié 2 400,00 € », marque « incomplet »
//     (title « Taux manquant »), lien « Exporter CSV » ; vide : « Aucun coût sur la période. ».
import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import pg from 'pg';
import { exigerBaseTest } from '../../scripts/lib/garde-base-test.mjs';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { activiteAvec, calculer, sousProjet } from './lot3b-helpers.js';
import { allerA, creerRessourceParEcran, NOM_ADMIN } from './lot3c-helpers.js';
import { chefLecteur, nav, remettreAdminSeul6b } from './lot6b-helpers.js';

const NBSP = '\u00a0';
const ADRESSE = '/pilotage?onglet=couts&debut=2027-01';
/** « 1 234,50 € » (formatMontant). */
const fmt = (n: number): string => {
  const [e, d] = n.toFixed(2).split('.') as [string, string];
  return `${e.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)},${d}${NBSP}€`;
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
test.beforeEach(async ({ page }) => {
  await remettre();
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettre);

const regionCouts = (page: Page) => page.getByRole('region', { name: 'Coûts', exact: true });
const lignes = (page: Page) => regionCouts(page).locator('tbody tr');
const ligne = (page: Page, texte: string) => lignes(page).filter({ hasText: texte });
const cellules = (l: Locator) => l.locator('th, td');
const regionTotaux = (page: Page) => page.getByRole('region', { name: 'Totaux du projet' });
const onglet = (page: Page, nom: string) => page.getByRole('tab', { name: nom, exact: true });
const champMois = (page: Page) => page.getByLabel('Mois de départ');
const listeEquipe = (page: Page) => page.getByLabel('Équipe', { exact: true });

const titreDe = (cellule: Locator): Promise<string | null> =>
  cellule.evaluate((el) => {
    for (const e of [el, ...Array.from(el.querySelectorAll('[title]'))]) {
      const t = e.getAttribute('title');
      if (t && t !== 'Taux manquant') return t;
    }
    return null;
  });

interface Cellule {
  mois?: string;
  reel: number;
  planifie: number;
  cout: number;
  taux_manquant: boolean;
}
interface ProjetCouts {
  code: string;
  nom: string;
  otp_effectif: string | null;
  mois: Cellule[];
  total: Cellule;
  ressources: { nom: string; actif: boolean; mois: Cellule[]; total: Cellule }[];
}
interface Couts {
  projets: ProjetCouts[];
  total: { mois: Cellule[]; total: Cellule };
}
const lireCouts = async (request: APIRequestContext, requete = 'debut=2027-01'): Promise<Couts> => {
  const r = await request.get(`/api/couts?${requete}`);
  expect(r.status(), await r.text()).toBe(200);
  return (await r.json()) as Couts;
};

async function poserTaux(request: APIRequestContext, id: number, corps: Record<string, unknown>) {
  const r = await request.post(`/api/utilisateurs/${id}/taux`, { data: corps });
  expect(r.status(), await r.text()).toBe(201);
}

/**
 * Monde de pilotage-2 : projet « PIL2 » (OTP « OTP-P2 ») : Alice 4 j (taux 600), Carol 2 j (taux 2000 seulement),
 * Bob 1 j (aucun taux), Dora 1 j puis désactivée (taux 100) ; sous-projet « PIL2.1 » : Alice 1 j.
 */
async function monde(request: APIRequestContext) {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef P2', 'chef-p2@pilotage2.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice P2', 'alice-p2@pilotage2.test', 'ressource', true);
  const bob = await api.utilisateur('Bob P2', 'bob-p2@pilotage2.test', 'ressource', true);
  const carol = await api.utilisateur('Carol P2', 'carol-p2@pilotage2.test', 'ressource', true);
  const dora = await api.utilisateur('Dora P2', 'dora-p2@pilotage2.test', 'ressource', true);
  await poserTaux(request, alice.id, { debut: '2000-01-01', montant: 600 });
  await poserTaux(request, carol.id, { debut: '2000-01-01', fin: '2000-12-31', montant: 500 });
  await poserTaux(request, dora.id, { debut: '2000-01-01', montant: 100 });
  const projet = await api.projet('PIL2', 'Projet pilotage deux', chef.id);
  const patch = await request.fetch(`/api/projets/${projet.id}`, {
    method: 'PATCH',
    data: { otp: 'OTP-P2' },
  });
  expect(patch.ok(), await patch.text()).toBeTruthy();
  const sous = await sousProjet(request, projet.id, 'PIL2.1', 'Sous-projet pilotage', chef.id);
  for (const [p, r, jours, nom] of [
    [projet, alice, 4, 'Tâche Alice'],
    [projet, carol, 2, 'Tâche Carol'],
    [projet, bob, 1, 'Tâche Bob'],
    [projet, dora, 1, 'Tâche Dora'],
    [sous, alice, 1, 'Tâche sous-projet'],
  ] as const) {
    await api.affectation(p.id, r.id);
    const a = await activiteAvec(request, p.id, nom);
    await api.assignation(a.id, r.id, jours);
  }
  await calculer(request, [projet.id, sous.id]);
  const off = await request.patch(`/api/utilisateurs/${dora.id}`, { data: { actif: false } });
  expect(off.ok(), await off.text()).toBeTruthy();
  return { api, chef, projet, sous, alice };
}

test('E2E-658 : menu « Pilotage » (administrateur, chef de projet), ressource redirigée ; onglets, adresse, filtres conservés', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef 658', 'chef-658@pilotage2.test', 'chef_de_projet');
  await api.utilisateur('Ressource 658', 'res-658@pilotage2.test', 'ressource', true);
  const eq = await request.post('/api/equipes', { data: { nom: 'Équipe 658' } });
  expect(eq.ok(), await eq.text()).toBeTruthy();

  await loginAsAdmin(page);
  for (const role of ['administrateur', 'chef']) {
    const noms = (await nav(page).getByRole('link').allTextContents()).map((t) => t.trim());
    expect(noms.indexOf('Pilotage'), `${role} : ${noms.join(', ')}`).toBe(
      noms.indexOf('Projets') + 1,
    );
    expect(noms, role).not.toContain('Plan de charge');
    await nav(page).getByRole('link', { name: 'Pilotage', exact: true }).click();
    await expect(page).toHaveURL(/\/pilotage/);
    await expect(onglet(page, 'Plan de charge')).toHaveAttribute('aria-selected', 'true');
    await expect(onglet(page, 'Coûts')).toHaveAttribute('aria-selected', 'false');
    if (role === 'administrateur') {
      await page.context().clearCookies();
      await connecterAvec(page, 'chef-658@pilotage2.test');
    }
  }

  await page.context().clearCookies();
  await connecterAvec(page, 'res-658@pilotage2.test');
  await expect(nav(page).getByRole('link', { name: 'Pilotage', exact: true })).toHaveCount(0);
  await page.goto('/pilotage?onglet=couts');
  await expect(page).toHaveURL('/mes-taches');

  // Onglets, adresse et filtres (administrateur).
  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto('/pilotage?onglet=charge&debut=2027-03');
  await expect(page.getByRole('table', { name: 'Plan de charge' })).toBeVisible();
  await listeEquipe(page).selectOption({ label: 'Sans équipe' });
  await onglet(page, 'Coûts').click();
  await expect(page).toHaveURL(/onglet=couts/);
  await expect(onglet(page, 'Coûts')).toHaveAttribute('aria-selected', 'true');
  await expect(regionCouts(page)).toBeVisible();
  await expect(champMois(page)).toHaveValue('2027-03');
  await expect(listeEquipe(page).locator('option:checked')).toHaveText('Sans équipe');
  await expect(page).toHaveURL(/debut=2027-03/);
  await expect(page).toHaveURL(/equipe=aucune/);
  await page.reload();
  await expect(onglet(page, 'Coûts')).toHaveAttribute('aria-selected', 'true');
  await expect(champMois(page)).toHaveValue('2027-03');
  await expect(listeEquipe(page).locator('option:checked')).toHaveText('Sans équipe');
  await onglet(page, 'Plan de charge').click();
  await expect(page.getByRole('table', { name: 'Plan de charge' })).toBeVisible();
  await expect(page).not.toHaveURL(/onglet=couts/);
  await expect(champMois(page)).toHaveValue('2027-03');
  await expect(listeEquipe(page).locator('option:checked')).toHaveText('Sans équipe');
  for (const adresse of ['/pilotage?onglet=inconnu', '/pilotage']) {
    await page.goto(adresse);
    await expect(onglet(page, 'Plan de charge'), adresse).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('table', { name: 'Plan de charge' }), adresse).toBeVisible();
  }
});

test('E2E-659-r1 : /plan-de-charge?debut=…&equipe=… redirige vers /pilotage?onglet=charge en conservant debut et equipe', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Ressource 659', 'res-659@pilotage2.test', 'ressource', true);
  await loginAsAdmin(page);
  await page.goto('/plan-de-charge?debut=2027-02&equipe=aucune');
  await expect(page).toHaveURL(/\/pilotage\?/);
  const url = new URL(page.url());
  expect(url.pathname).toBe('/pilotage');
  expect(url.searchParams.get('onglet')).toBe('charge');
  expect(url.searchParams.get('debut')).toBe('2027-02');
  expect(url.searchParams.get('equipe')).toBe('aucune');
  await expect(champMois(page)).toHaveValue('2027-02');
  await expect(page.getByRole('table', { name: 'Plan de charge' })).toBeVisible();
});

test('E2E-660-r1 : onglet Coûts : colonnes, lignes de projet et de ressource, total, cellules, title et marque « incomplet »', async ({
  page,
  request,
}) => {
  await monde(request);
  const api = await lireCouts(request);
  await loginAsAdmin(page);
  await page.goto(ADRESSE);
  await expect(regionCouts(page)).toBeVisible();

  const entetes = (await regionCouts(page).getByRole('columnheader').allTextContents()).map((t) =>
    t.trim(),
  );
  expect(entetes.slice(1)).toEqual([
    ...Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, '0')}/2027`),
    'Total',
  ]);

  // Tout replié : une ligne par projet (sous-projet sur sa propre ligne) puis « Total ».
  await expect(lignes(page)).toHaveCount(3);
  const p1 = ligne(page, 'PIL2 · Projet pilotage deux');
  const p11 = ligne(page, 'PIL2.1 · Sous-projet pilotage');
  await expect(p1).toContainText('OTP-P2');
  await expect(p11).toContainText('OTP-P2');
  await expect(lignes(page).last()).toContainText('Total');
  await expect(page.getByRole('button', { name: 'Replier PIL2', exact: true })).toHaveCount(0);
  const deplier = page.getByRole('button', { name: 'Déplier PIL2', exact: true });
  await expect(deplier).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Alice P2', { exact: true })).toHaveCount(0);

  // Valeurs égales à GET /api/couts, plus un montant fixe.
  const projet = api.projets.find((p) => p.code === 'PIL2')!;
  const sous = api.projets.find((p) => p.code === 'PIL2.1')!;
  expect(projet.mois[0]!.cout).toBe(2500);
  expect(sous.mois[0]!.cout).toBe(600);
  for (const [l, p] of [
    [p1, projet],
    [p11, sous],
  ] as const) {
    const c = cellules(l);
    for (let i = 0; i < 12; i += 1) {
      await expect(c.nth(i + 1), `${p.code} mois ${i + 1}`).toContainText(fmt(p.mois[i]!.cout));
    }
    await expect(c.nth(13)).toContainText(fmt(p.total.cout));
  }
  await expect(cellules(p11).nth(1)).toContainText(fmt(600));
  await expect(cellules(p1).nth(1)).toContainText(`2${NBSP}500,00${NBSP}€`);
  expect(await titreDe(cellules(p1).nth(1))).toBe(
    `Réel ${fmt(projet.mois[0]!.reel)}, planifié ${fmt(projet.mois[0]!.planifie)}`,
  );
  expect(await titreDe(cellules(p1).nth(1))).toBe(`Réel ${fmt(0)}, planifié ${fmt(2500)}`);
  const total = cellules(lignes(page).last());
  for (let i = 0; i < 12; i += 1) {
    await expect(total.nth(i + 1)).toContainText(fmt(api.total.mois[i]!.cout));
  }
  await expect(total.nth(13)).toContainText(fmt(api.total.total.cout));

  // Dépliage : lignes de ressource (inactive suffixée), cellule à taux manquant marquée.
  await deplier.click();
  await expect(page.getByRole('button', { name: 'Replier PIL2', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  const noms = ['Alice P2', 'Bob P2', 'Carol P2', 'Dora P2 (inactif)'];
  for (const n of noms) await expect(ligne(page, n).first()).toBeVisible();
  await expect(lignes(page)).toHaveCount(7);
  const carol = cellules(ligne(page, 'Carol P2'));
  await expect(carol.nth(1)).toContainText(fmt(0));
  await expect(carol.nth(1)).toContainText('incomplet');
  await expect(carol.nth(1).locator('[title="Taux manquant"]')).toHaveCount(1);
  const bob = cellules(ligne(page, 'Bob P2'));
  await expect(bob.nth(1)).toContainText(fmt(0));
  await expect(bob.nth(1)).not.toContainText('incomplet');
  const alice = cellules(ligne(page, 'Alice P2').first());
  await expect(alice.nth(1)).toContainText(fmt(2400));
  await expect(alice.nth(1)).not.toContainText('incomplet');
  await expect(cellules(p1).nth(1)).toContainText('incomplet');
  await expect(cellules(p1).nth(13)).toContainText('incomplet');
  await expect(cellules(lignes(page).last()).nth(1)).toContainText('incomplet');
  await page.getByRole('button', { name: 'Replier PIL2', exact: true }).click();
  await expect(lignes(page)).toHaveCount(3);
});

test('E2E-661 : chef de projet : ses projets seulement, aucun code ni nom d’un projet qu’il lit sans pouvoir y écrire', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  const api = await preparer(request);
  const autreChef = await api.utilisateur(
    'Chef autre',
    'chef-autre@pilotage2.test',
    'chef_de_projet',
  );
  const autre = await api.projet('AUTRE2', 'Projet autre chef', autreChef.id);
  const alice = m.alice;
  await api.affectation(autre.id, alice.id);
  const a = await activiteAvec(request, autre.id, 'Tâche autre');
  await api.assignation(a.id, alice.id, 3);
  await calculer(request, [autre.id]);
  // Chef lecteur : écrit sur PIL2 ? non — il lit PIL2 et AUTRE2 sans y écrire ; son propre projet « MIEN2 ».
  const lecteurEmail = await chefLecteur(request, [m.projet.id, autre.id], 'P2');
  const lecteur = await (await request.get('/api/utilisateurs')).json();
  const idLecteur = (lecteur as { id: number; email: string }[]).find(
    (u) => u.email === lecteurEmail,
  )!.id;
  const mien = await api.projet('MIEN2', 'Projet du lecteur', idLecteur);
  await api.affectation(mien.id, alice.id);
  const b = await activiteAvec(request, mien.id, 'Tâche mienne');
  await api.assignation(b.id, alice.id, 2);
  await calculer(request, [mien.id]);

  const admin = await lireCouts(request);
  expect(admin.projets.map((p) => p.code).sort()).toEqual(
    ['AUTRE2', 'MIEN2', 'PIL2', 'PIL2.1'].sort(),
  );
  await connecterAvec(page, lecteurEmail);
  await page.goto(ADRESSE);
  await expect(regionCouts(page)).toBeVisible();
  await expect(ligne(page, 'MIEN2 · Projet du lecteur')).toBeVisible();
  await expect(lignes(page)).toHaveCount(2); // MIEN2 et « Total »
  const mienApi = admin.projets.find((p) => p.code === 'MIEN2')!;
  await expect(cellules(ligne(page, 'MIEN2')).nth(1)).toContainText(fmt(mienApi.mois[0]!.cout));
  await expect(cellules(lignes(page).last()).nth(1)).toContainText(fmt(mienApi.mois[0]!.cout));
  for (const interdit of [
    'PIL2',
    'Projet pilotage deux',
    'AUTRE2',
    'Projet autre chef',
    'OTP-P2',
  ]) {
    await expect(page.getByText(interdit)).toHaveCount(0);
    expect(await page.content(), interdit).not.toContain(interdit);
  }
});

test('E2E-662-r1 : « Exporter CSV » de l’onglet Coûts : fichier couts-AAAA-MM.csv égal à GET /api/couts/export, cohérent avec l’écran', async ({
  page,
  request,
}) => {
  await monde(request);
  await loginAsAdmin(page);
  await page.goto(ADRESSE);
  await expect(regionCouts(page)).toBeVisible();
  const exporter = page
    .getByRole('link', { name: 'Exporter CSV', exact: true })
    .or(page.getByRole('button', { name: 'Exporter CSV', exact: true }));
  const [d] = await Promise.all([page.waitForEvent('download'), exporter.click()]);
  expect(d.suggestedFilename()).toBe('couts-2027-01.csv');
  const contenu = readFileSync((await d.path())!, 'utf8');
  const attendu = await (await request.get('/api/couts/export?debut=2027-01')).text();
  expect(contenu).toBe(attendu);
  expect(contenu.startsWith('﻿')).toBe(true);
  const l = contenu.slice(1, -2).split('\r\n');
  expect(l[0]).toBe(
    'Projet;OTP;Ressource;' +
      Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, '0')}/2027`).join(';') +
      ';Total;Taux manquant',
  );
  expect(l).toContain(
    'PIL2 · Projet pilotage deux;OTP-P2;Total;2500;0;0;0;0;0;0;0;0;0;0;0;2500;oui',
  );
  expect(l).toContain(
    'PIL2 · Projet pilotage deux;OTP-P2;Alice P2;2400;0;0;0;0;0;0;0;0;0;0;0;2400;non',
  );
  expect(l).toContain(
    'PIL2 · Projet pilotage deux;OTP-P2;Dora P2 (inactif);100;0;0;0;0;0;0;0;0;0;0;0;100;non',
  );
  // Filtres courants : équipe « aucune » et autre mois.
  await page.goto('/pilotage?onglet=couts&debut=2027-03&equipe=aucune');
  await expect(regionCouts(page)).toBeVisible();
  const [d2] = await Promise.all([page.waitForEvent('download'), exporter.click()]);
  expect(d2.suggestedFilename()).toBe('couts-2027-03.csv');
  expect(readFileSync((await d2.path())!, 'utf8')).toBe(
    await (await request.get('/api/couts/export?debut=2027-03&equipe=aucune')).text(),
  );
});

test('E2E-663 : mois sans charge : « Aucun coût sur la période. » ; région « Coûts » focalisable ; pas de défilement horizontal de la page', async ({
  page,
  request,
}) => {
  await monde(request);
  await loginAsAdmin(page);
  await page.goto('/pilotage?onglet=couts&debut=2035-01');
  await expect(page.getByText('Aucun coût sur la période.')).toBeVisible();
  for (const largeur of [1440, 1024]) {
    await page.setViewportSize({ width: largeur, height: 800 });
    await page.goto(ADRESSE);
    const region = regionCouts(page);
    await expect(region).toBeVisible();
    await expect(region).toHaveAttribute('tabindex', '0');
    expect(await region.evaluate((el) => getComputedStyle(el).overflowX)).toMatch(/auto|scroll/);
    await region.focus();
    await expect(region).toBeFocused();
    const dims = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(
      dims.s,
      `${largeur} px : scrollWidth ${dims.s}, clientWidth ${dims.c}`,
    ).toBeLessThanOrEqual(dims.c);
  }
});

test('E2E-664 : Gantt d’un projet : « Exporter les coûts » au bout de « Totaux du projet », absent de la barre d’outils et sans peut_ecrire', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  const lecteur = await chefLecteur(request, m.projet.id, 'E664');
  await loginAsAdmin(page);
  await page.goto(`/projets/${m.projet.id}?onglet=gantt`);
  await page.locator('svg[data-zoom]').waitFor();
  const lien = page.getByRole('link', { name: 'Exporter les coûts' });
  await expect(lien).toHaveCount(1);
  await expect(regionTotaux(page).getByRole('link', { name: 'Exporter les coûts' })).toHaveCount(1);
  expect((await regionTotaux(page).innerText()).trim().endsWith('Exporter les coûts')).toBe(true);
  // Dernier élément tabulable de la région ; la barre d'outils (bouton « Calculer ») ne le contient plus.
  const dernier = await regionTotaux(page).evaluate((r) => {
    const f = Array.from(r.querySelectorAll<HTMLElement>('a[href], button, [tabindex="0"]'));
    return f.length ? f[f.length - 1]!.textContent?.trim() : null;
  });
  expect(dernier).toBe('Exporter les coûts');
  const [d] = await Promise.all([page.waitForEvent('download'), lien.click()]);
  expect(d.suggestedFilename()).toMatch(/^couts-PIL2-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(readFileSync((await d.path())!, 'utf8').startsWith('﻿WBS;Activité;OTP;')).toBe(true);

  await page.context().clearCookies();
  await connecterAvec(page, lecteur);
  await page.goto(`/projets/${m.projet.id}?onglet=gantt`);
  await page.locator('svg[data-zoom]').waitFor();
  await expect(page.getByRole('link', { name: 'Exporter les coûts' })).toHaveCount(0);
});

test('E2E-665 : parcours complet à l’écran (administrateur seul) : taux, projet avec OTP, assignation, puis Pilotage → Coûts', async ({
  page,
  request,
}) => {
  await loginAsAdmin(page);
  await creerRessourceParEcran(page, 'Zoé 665', 'zoe-665@example.test', 'Calendrier par défaut');
  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Modifier Zoé 665', exact: true }).click();
  const u = page.getByRole('dialog', { name: 'Modifier Zoé 665' });
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
  await n.getByLabel('Code').fill('P665');
  await n.getByLabel('Nom').fill('Projet 665');
  await n.getByLabel('Chef de projet').selectOption({ label: NOM_ADMIN });
  await n.getByLabel('Pas avant le').fill('2027-01-04');
  await n.getByLabel('OTP', { exact: true }).fill('FIN-665');
  await n.getByRole('button', { name: 'Créer' }).click();
  await page.getByRole('link', { name: 'Projet 665' }).click();

  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  const af = page.getByRole('dialog', { name: 'Affecter une ressource' });
  await af.getByLabel('Ressource').selectOption({ label: 'Zoé 665' });
  await af.getByRole('button', { name: 'Affecter' }).click();
  await expect(af).toBeHidden();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const na = page.getByRole('dialog', { name: 'Nouvelle activité' });
  await na.getByLabel('Nom').fill('Étude 665');
  await na.getByRole('button', { name: 'Créer' }).click();
  await expect(na).toBeHidden();
  await page.getByRole('button', { name: 'Assigner une ressource à Étude 665' }).click();
  const as = page.getByRole('dialog');
  await as.getByLabel('Ressource').selectOption({ label: 'Zoé 665' });
  await as.getByLabel('Charge assignée (j)').fill('4');
  await as.getByRole('button', { name: 'Assigner' }).click();
  await expect(as).toBeHidden();

  // Calcul par l'API (hors entité saisie), puis l'écran consommateur : Pilotage → Coûts.
  await preparer(request);
  const projets = (await (await request.get('/api/projets')).json()) as {
    id: number;
    code: string;
  }[];
  await calculer(request, [projets.find((p) => p.code === 'P665')!.id]);
  await nav(page).getByRole('link', { name: 'Pilotage', exact: true }).click();
  await onglet(page, 'Coûts').click();
  await champMois(page).fill('2027-01');
  await expect(regionCouts(page)).toBeVisible();
  const l = ligne(page, 'P665 · Projet 665');
  await expect(l).toContainText('FIN-665');
  await expect(cellules(l).nth(1)).toContainText(fmt(2400));
  await page.getByRole('button', { name: 'Déplier P665', exact: true }).click();
  await expect(cellules(ligne(page, 'Zoé 665')).nth(1)).toContainText(fmt(2400));
  const api = await lireCouts(request);
  expect(api.projets.find((p) => p.code === 'P665')!.mois[0]!.cout).toBe(2400);
});
