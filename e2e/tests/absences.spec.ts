// Lot absences, tranche absences-2 (D-276 ; SPEC §4, « Absences et charge depuis le taux », point 10) : E2E-717
// à E2E-723. Base « administrateur seul » avant et après chaque test (les absences partent avec les utilisateurs,
// clé étrangère en cascade). Données préparées par l'API, sauf E2E-723 (parcours complet, tout à l'écran) et
// l'entité dont l'écran est l'objet du test. Horloge du navigateur figée au vendredi 15/01/2027, sauf E2E-723.
// Valeurs attendues recopiées de SPEC §4 point 10.
// Contrat des écrans (phase verte) :
//   - Imputations, onglet « Absences » (`?onglet=absences`), après « Feuille de temps » et « Validation » ;
//     titre h1 « Absences » ; liste « Ressource » (élément `select` natif, options = noms) ;
//   - tableau « Absences » : colonnes Du, Au, Portion, Motif, Actions ; « Aucune absence. » ;
//   - dialogues « Nouvelle absence » (bouton « Créer ») et « Modifier l'absence » (bouton « Enregistrer ») :
//     champs Du et Au (type date), Portion et Motif (`select` natifs, libellés de la SPEC) ;
//   - feuille de temps : case d'un jour d'absence vide `aria-disabled="true"` sans `disabled`, `title`
//     « Absence (<motif>) » ;
//   - Accueil, planning d'une ressource : élément `[data-absence="AAAA-MM-JJ"]` par jour d'absence en journée,
//     `title` « Absence (<motif>) ».
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import pg from 'pg';
import { exigerBaseTest } from '../../scripts/lib/garde-base-test.mjs';
import { loginAsAdmin } from './helpers.js';
import { MOT_DE_PASSE, connecterAvec, preparer, type Role } from './lot1-helpers.js';
import { calculer } from './lot3b-helpers.js';
import { allerA, NOM_ADMIN, ouvrirDialogueCalcul } from './lot3c-helpers.js';
import { caseCharge, sessionDe } from './lot4b-helpers.js';
import { libelleCase } from './lot2e-helpers.js';
import { nav, remettreAdminSeul6b } from './lot6b-helpers.js';

const LEADER = 'leader_metier' as unknown as Role;
const J15 = '2027-01-15T10:00:00';
const T_CHEVAUCHEMENT = 'Cette absence chevauche une autre absence.';
const T_IMPUTE = 'Un de ces jours porte déjà des imputations.';
const T_CHOISIR = 'Choisissez une ressource.';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

async function absencesEnBase(): Promise<string[]> {
  const client = new pg.Client({ connectionString: exigerBaseTest(process.env) });
  await client.connect();
  try {
    const { rows } = await client.query<{ l: string }>(
      `SELECT concat_ws('|', debut, fin, portion, motif) AS l FROM absence ORDER BY debut, id`,
    );
    return rows.map((r) => r.l);
  } finally {
    await client.end();
  }
}

/** Chef C (chef de P), chef H (chef de Q) ; Alice (ressource, affectée à P, « Analyse » 2 j) ; Bob (ressource, Q). */
async function monde(request: APIRequestContext) {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef Abs', 'chef@absences.test', 'chef_de_projet');
  const hors = await api.utilisateur('Chef Hors', 'hors@absences.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice Abs', 'alice@absences.test', 'ressource', true);
  const bob = await api.utilisateur('Bob Abs', 'bob@absences.test', 'ressource', true);
  const p = await api.projet('PAB', 'Projet absences', chef.id);
  const q = await api.projet('QAB', 'Projet Q', hors.id);
  await api.affectation(p.id, alice.id);
  await api.affectation(q.id, bob.id);
  const a = await api.activite(p.id, 'Analyse');
  const ass = await api.assignation(a.id, alice.id, 2);
  return { api, chef, hors, alice, bob, p, q, a, ass };
}

async function absenceApi(request: APIRequestContext, corps: Record<string, unknown>) {
  const r = await request.post('/api/absences', { data: corps });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json()) as { id: number };
}

const listeRessource = (page: Page) => page.getByLabel('Ressource', { exact: true });
const tableau = (page: Page) => page.getByRole('table', { name: 'Absences', exact: true });
const lignes = (page: Page) => tableau(page).locator('tbody tr');
const ongletAbsences = (page: Page) => page.getByRole('tab', { name: 'Absences', exact: true });

async function ouvrirAbsences(page: Page) {
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await ongletAbsences(page).click();
  await expect(page).toHaveURL(/onglet=absences/);
  await expect(page.getByRole('heading', { name: 'Absences', level: 1 })).toBeVisible();
}

async function remplir(
  page: Page,
  titre: string,
  v: { du: string; au: string; portion?: string; motif?: string },
) {
  const d = page.getByRole('dialog', { name: titre, exact: true });
  await expect(d).toBeVisible();
  await d.getByLabel('Du', { exact: true }).fill(v.du);
  await d.getByLabel('Au', { exact: true }).fill(v.au);
  if (v.portion) await d.getByLabel('Portion', { exact: true }).selectOption({ label: v.portion });
  if (v.motif) await d.getByLabel('Motif', { exact: true }).selectOption({ label: v.motif });
  return d;
}

const textesLignes = (page: Page) =>
  lignes(page).evaluateAll((trs) =>
    trs.map((tr) =>
      [...tr.querySelectorAll('th, td')].slice(0, 4).map((c) => c.textContent?.trim() ?? ''),
    ),
  );

test('E2E-717 : ressource, onglet Absences, congé créé à l’écran ; case de la feuille désactivée « Absence (Congé) » (parcours 1)', async ({
  page,
  request,
}) => {
  await monde(request);
  await page.clock.setFixedTime(J15);
  await connecterAvec(page, 'alice@absences.test');
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(page.getByRole('tab')).toHaveText(['Feuille de temps', 'Absences']);
  await ongletAbsences(page).click();
  await expect(page).toHaveURL(/onglet=absences/);
  await expect(listeRessource(page)).toHaveValue(/\d+/);
  await expect(listeRessource(page).locator('option')).toHaveText(['Alice Abs']);
  await expect(page.getByText('Aucune absence.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Nouvelle absence', exact: true }).click();
  const d = await remplir(page, 'Nouvelle absence', {
    du: '2027-01-12',
    au: '2027-01-12',
    portion: 'Journée',
    motif: 'Congé',
  });
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d).toBeHidden();
  expect(await textesLignes(page)).toEqual([['12/01/2027', '12/01/2027', 'Journée', 'Congé']]);
  expect(await absencesEnBase()).toEqual(['2027-01-12|2027-01-12|journee|conge']);

  await page.getByRole('tab', { name: 'Feuille de temps', exact: true }).click();
  await page.goto('/imputations?semaine=2027-01-11');
  const c = caseCharge(page, '1 Analyse', 'mar. 12/01');
  await expect(c).toHaveAttribute('aria-disabled', 'true');
  await expect(c).not.toHaveAttribute('disabled', /.*/);
  await expect(c).toHaveAttribute('title', 'Absence (Congé)');
  await expect(caseCharge(page, '1 Analyse', 'lun. 11/01')).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
});

test('E2E-718-r1 : modifier, supprimer avec confirmation, refus de chevauchement dans le dialogue', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await absenceApi(request, {
    ressource_id: m.alice.id,
    debut: '2027-01-12',
    fin: '2027-01-12',
    portion: 'journee',
    motif: 'conge',
  });
  await page.clock.setFixedTime(J15);
  await connecterAvec(page, 'alice@absences.test');
  await ouvrirAbsences(page);
  await page.getByRole('button', { name: "Modifier l'absence du 12/01/2027", exact: true }).click();
  const d = page.getByRole('dialog', { name: "Modifier l'absence", exact: true });
  await d.getByLabel('Motif', { exact: true }).selectOption({ label: 'Formation' });
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d).toBeHidden();
  expect(await textesLignes(page)).toEqual([['12/01/2027', '12/01/2027', 'Journée', 'Formation']]);

  await page.getByRole('button', { name: 'Nouvelle absence', exact: true }).click();
  const n = await remplir(page, 'Nouvelle absence', {
    du: '2027-01-11',
    au: '2027-01-13',
    portion: 'Journée',
    motif: 'Autre',
  });
  await n.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(n.getByText(T_CHEVAUCHEMENT)).toBeVisible();
  await expect(n).toBeVisible();
  expect(await absencesEnBase()).toEqual(['2027-01-12|2027-01-12|journee|formation']);
  await n.getByRole('button', { name: 'Annuler', exact: true }).click();
  // garde D-188 : « Abandonner les modifications ? », bouton « Abandonner » (révision D-271)
  await page.getByRole('button', { name: 'Abandonner', exact: true }).click();
  await expect(n).toBeHidden();

  await page
    .getByRole('button', { name: "Supprimer l'absence du 12/01/2027", exact: true })
    .click();
  const conf = page.getByRole('alertdialog', { name: "Supprimer l'absence du 12/01/2027 ?" });
  await conf.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(page.getByText('Aucune absence.', { exact: true })).toBeVisible();
  expect(await absencesEnBase()).toEqual([]);
});

test('E2E-719-r1 : chef, formation pour une ressource de son projet ; Accueil, planning d’Alice : jour grisé, barre après le jour (parcours 2)', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await page.clock.setFixedTime(J15);
  await connecterAvec(page, 'chef@absences.test');
  await ouvrirAbsences(page);
  // D-280 : grille sans sélection ; la liste « Ressource » du dialogue est limitée à la portée du chef.
  await page.getByRole('button', { name: 'Nouvelle absence', exact: true }).click();
  const options = await page
    .getByRole('dialog', { name: 'Nouvelle absence', exact: true })
    .getByLabel('Ressource', { exact: true })
    .locator('option')
    .allTextContents();
  expect(options).toEqual(['Alice Abs']);
  const d = await remplir(page, 'Nouvelle absence', {
    du: '2027-01-04',
    au: '2027-01-04',
    portion: 'Journée',
    motif: 'Formation',
  });
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d).toBeHidden();
  expect(await absencesEnBase()).toEqual(['2027-01-04|2027-01-04|journee|formation']);

  await calculer(request, [m.p.id]);
  await page.goto(`/?ressource=${m.alice.id}`);
  const cal = page.getByRole('region', {
    name: 'Calendrier du planning de la ressource',
    exact: true,
  });
  const jour = cal.locator('[data-absence="2027-01-04"]');
  await expect(jour).toHaveCount(1);
  await expect(jour).toHaveAttribute('title', 'Absence (Formation)');
  await expect(
    cal.getByRole('img', { name: 'PAB · 1 Analyse, du 05/01/2027 au 06/01/2027', exact: true }),
  ).toHaveCount(1);
});

test('E2E-720-r1 : administrateur et leader : toutes les ressources ; administrateur non ressource : « Choisissez une ressource. »', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await m.api.utilisateur('Léa Leader', 'leader@absences.test', LEADER);
  await page.clock.setFixedTime(J15);
  await loginAsAdmin(page);
  await ouvrirAbsences(page);
  // D-280 : grille sans sélection, une ligne par ressource active.
  await expect(page.getByText(T_CHOISIR, { exact: true })).toBeHidden();
  const ressources = () =>
    page
      .getByRole('table', { name: /^Absences de / })
      .locator('tbody tr')
      .getByRole('rowheader')
      .allTextContents();
  await expect(page.getByRole('table', { name: /^Absences de / })).toBeVisible();
  expect(await ressources()).toEqual(['Alice Abs', 'Bob Abs']);
  await expect(page.getByRole('tab')).toHaveText(['Feuille de temps', 'Validation', 'Absences']);

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await connecterAvec(page, 'leader@absences.test');
  await ouvrirAbsences(page);
  await expect(page.getByRole('tab')).toHaveText(['Validation', 'Absences']);
  await expect(page.getByRole('table', { name: /^Absences de / })).toBeVisible();
  expect(await ressources()).toEqual(['Alice Abs', 'Bob Abs']);
});

test('E2E-721 : planning manuel, case d’un jour d’absence désactivée', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  const r = await request.post(`/api/projets/${m.p.id}/activites`, {
    data: { nom: 'Manuel', mode: 'MAN' },
  });
  const man = (await r.json()) as { id: number };
  await m.api.assignation(man.id, m.alice.id, 0);
  await absenceApi(request, {
    ressource_id: m.alice.id,
    debut: '2027-01-12',
    fin: '2027-01-12',
    portion: 'journee',
    motif: 'conge',
  });
  await page.clock.setFixedTime(J15);
  await loginAsAdmin(page);
  await page.goto(`/projets/${m.p.id}/planning-manuel/${man.id}?mois=2027-01`);
  const c = (jour: number) =>
    page.getByRole('checkbox', { name: libelleCase('Alice Abs', jour, 'janvier', 'matin') });
  await expect(c(12)).toHaveAttribute('aria-disabled', 'true');
  await expect(c(11)).not.toHaveAttribute('aria-disabled', 'true');
});

test('E2E-722 : refus jour_impute affiché, dialogue ouvert, rien d’écrit', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde(request);
  const alice = await sessionDe(playwright, 'alice@absences.test');
  const put = await alice.put('/api/feuilles?semaine=2026-01-12', {
    data: {
      lignes: [{ assignation_id: m.ass.id, imputations: [{ jour: '2026-01-13', charge: 1 }] }],
    },
  });
  expect(put.status(), await put.text()).toBe(200);
  await alice.dispose();

  await page.clock.setFixedTime(J15);
  await connecterAvec(page, 'alice@absences.test');
  await ouvrirAbsences(page);
  await page.getByRole('button', { name: 'Nouvelle absence', exact: true }).click();
  const d = await remplir(page, 'Nouvelle absence', {
    du: '2026-01-12',
    au: '2026-01-14',
    portion: 'Journée',
    motif: 'Congé',
  });
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d.getByText(T_IMPUTE)).toBeVisible();
  await expect(d).toBeVisible();
  expect(await absencesEnBase()).toEqual([]);
});

/** Jour ouvré (lundi à vendredi) situé `n` jours ouvrés après aujourd'hui, au format AAAA-MM-JJ. */
function ouvreApres(n: number): string {
  const d = new Date();
  let k = 0;
  while (k < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) k += 1;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test('E2E-723-r1 : parcours complet à l’écran, base « administrateur seul » : ressource, projet, affectation, activité, absence, calcul, planning de la ressource grisé', async ({
  page,
}) => {
  const RESSOURCE = 'Zoé 723';
  const jourAbsence = ouvreApres(2);
  await loginAsAdmin(page);

  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const nu = page.getByRole('dialog', { name: 'Nouvel utilisateur' });
  await nu.getByLabel('Nom').fill(RESSOURCE);
  await nu.getByLabel('Email').fill('zoe-723@absences.test');
  await nu.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE);
  await nu.getByLabel('Calendrier').selectOption({ label: 'Calendrier par défaut' });
  await nu.getByRole('button', { name: 'Créer' }).click();
  await expect(nu).toBeHidden();

  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const np = page.getByRole('dialog');
  await np.getByLabel('Code').fill('P723');
  await np.getByLabel('Nom').fill('Projet 723');
  await np.getByLabel('Chef de projet').selectOption({ label: NOM_ADMIN });
  await np.getByRole('button', { name: 'Créer' }).click();
  await page.getByRole('link', { name: 'Projet 723' }).click();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  const af = page.getByRole('dialog', { name: 'Affecter une ressource' });
  await af.getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await af.getByRole('button', { name: 'Affecter' }).click();
  await expect(af).toBeHidden();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const na = page.getByRole('dialog', { name: 'Nouvelle activité' });
  await na.getByLabel('Nom').fill('Étude 723');
  await na.getByRole('button', { name: 'Créer' }).click();
  await expect(na).toBeHidden();
  await page.getByRole('button', { name: 'Assigner une ressource à Étude 723' }).click();
  const as = page.getByRole('dialog');
  await as.getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await as.getByLabel('Charge assignée (j)').fill('5');
  await as.getByRole('button', { name: 'Assigner' }).click();
  await expect(as).toBeHidden();

  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await ongletAbsences(page).click();
  // D-280 : grille sans sélection ; la ressource se choisit dans le dialogue.
  await page.getByRole('button', { name: 'Nouvelle absence', exact: true }).click();
  const d = await remplir(page, 'Nouvelle absence', {
    du: jourAbsence,
    au: jourAbsence,
    portion: 'Journée',
    motif: 'Congé',
  });
  await d.getByLabel('Ressource', { exact: true }).selectOption({ label: RESSOURCE });
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d).toBeHidden();

  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 723' }).click();
  await page.getByRole('tab', { name: 'Gantt' }).click();
  const calcul = await ouvrirDialogueCalcul(page);
  await calcul.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(calcul).toBeHidden();

  await allerA(page, 'Accueil');
  await page.getByLabel('Planning de', { exact: true }).selectOption({ label: RESSOURCE });
  const cal = page.getByRole('region', {
    name: 'Calendrier du planning de la ressource',
    exact: true,
  });
  await expect(cal.locator(`[data-absence="${jourAbsence}"]`)).toHaveAttribute(
    'title',
    'Absence (Congé)',
  );
  await expect(cal.getByRole('img')).toHaveCount(1);
});
