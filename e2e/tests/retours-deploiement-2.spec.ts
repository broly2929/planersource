// Retours du déploiement 2 (D-235 ; SPEC §6 « Charge lisible » 5 et 6) : E2E-642 à E2E-649. Base « administrateur
// seul » avant et après chaque test. Données préparées par l'API ; les dialogues sont pilotés par l'écran.
// Valeurs attendues recopiées de SPEC §6 « Charge lisible » 5.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activiteAvec, calculer, lier, monde3b } from './lot3b-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';
import { monde } from './lot2e-helpers.js';

test.beforeEach(remettreAdminSeul6b);
test.afterEach(remettreAdminSeul6b);

const MODES = ['ASAP', 'START', 'STARR', 'ALAP', 'FDUR', 'DDUR', 'REGUL', 'MAN'] as const;
const AIDE_OUI_JO = 'Effet sur le planning : oui (jours ouvrés).';
const AIDE_SANS_RESSOURCE =
  'Effet sur le planning : seulement sans ressource assignée (longueur de la barre, jours ouvrés).';
const AIDE_VENDUE = 'Effet sur le planning : non (sert à la marge).';
const AIDE_CHARGE_ASSIGNEE = 'Effet sur le planning : oui.';
/** Aide de la durée par mode ; absente (null) pour REGUL et MAN, qui n'ont pas de durée. */
const AIDE_DUREE: Record<(typeof MODES)[number], string | null> = {
  ASAP: AIDE_SANS_RESSOURCE,
  START: AIDE_SANS_RESSOURCE,
  STARR: AIDE_SANS_RESSOURCE,
  ALAP: AIDE_SANS_RESSOURCE,
  FDUR: AIDE_OUI_JO,
  DDUR: AIDE_OUI_JO,
  REGUL: null,
  MAN: null,
};
const DUREE = 'Durée validée (j)';
const VENDUE = 'Charge vendue (j)';
const DELAI = 'Délai (j)';
const J06 = '2027-01-06T10:00:00';
const CHARGE = 'Charge assignée (j)';

async function ouvrirPlanning(page: Page, projetId: number, email: string) {
  await connecterAvec(page, email);
  await page.goto(`/projets/${projetId}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
}

const dialogueModif = (page: Page) => page.getByRole('dialog', { name: 'Modifier l’activité' });
const dialogueCreation = (page: Page) => page.getByRole('dialog', { name: 'Nouvelle activité' });

async function choisirMode(d: Locator, code: string) {
  const liste = d.getByLabel('Mode de planification', { exact: true });
  await liste.click();
  await liste.selectOption(code);
  await liste.blur();
}

/** Le champ a ce libellé exact et cette aide d'une ligne, reliée par `aria-describedby`. */
async function verifierAide(d: Locator, libelle: string, aide: string, contexte: string) {
  const champ = d.getByLabel(libelle, { exact: true });
  await expect(champ, `${libelle} (${contexte})`).toHaveCount(1);
  await expect(champ).toHaveAccessibleDescription(aide);
  const id = await champ.getAttribute('aria-describedby');
  expect(id, `aria-describedby de ${libelle} (${contexte})`).toBeTruthy();
  await expect(d.locator(`[id="${id}"]`)).toHaveText(aide);
}

async function verifierDureeParMode(d: Locator, contexte: string) {
  for (const mode of MODES) {
    await choisirMode(d, mode);
    const aide = AIDE_DUREE[mode];
    if (aide === null) {
      await expect(d.getByLabel(DUREE, { exact: true }), `${mode} (${contexte})`).toHaveCount(0);
    } else {
      await verifierAide(d, DUREE, aide, `${mode}, ${contexte}`);
    }
    await verifierAide(d, VENDUE, AIDE_VENDUE, `${mode}, ${contexte}`);
  }
}

test('E2E-642 : « Nouvelle activité » : « Durée validée (j) » et son aide selon le mode ; « Charge vendue (j) » et son aide', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E642', []);
  await ouvrirPlanning(page, m.projet.id, m.emailChef);
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const d = dialogueCreation(page);
  await expect(d).toBeVisible();
  await verifierDureeParMode(d, 'création');
  await expect(d.getByLabel('Durée validée (jours ouvrés)', { exact: true })).toHaveCount(0);
});

test('E2E-643-r1 : « Modifier l’activité » : mêmes libellés et aides, mis à jour au changement de mode ; charge assignée et marge en lecture seule sans aide', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E643', ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Act modif', { mode: 'ASAP' });
  await m.api.assignation(a.id, m.gens['Alice']!.id, 3);
  await ouvrirPlanning(page, m.projet.id, m.emailChef);
  await page.getByRole('button', { name: 'Modifier Act modif', exact: true }).click();
  const d = dialogueModif(page);
  await expect(d).toBeVisible();
  await verifierDureeParMode(d, 'modification');
  // Lecture seule : aucune aide sur la charge assignée (somme) ni sur la marge.
  await choisirMode(d, 'FDUR');
  await expect(d.getByText('Charge assignée (somme des ressources)')).toBeVisible();
  const lecture = d.getByText('Charge assignée (somme des ressources)').locator('xpath=..');
  await expect(lecture.getByText('Effet sur le planning')).toHaveCount(0);
  await expect(
    d.getByText('Marge', { exact: true }).locator('xpath=..').getByText('Effet sur le planning'),
  ).toHaveCount(0);
  // 4 aides, chacune sur son champ : durée, charge vendue, délai des prédécesseurs, délai des successeurs.
  await expect(d.getByText('Effet sur le planning')).toHaveCount(4);
  await verifierAide(d, DUREE, AIDE_OUI_JO, 'FDUR');
  await verifierAide(d, VENDUE, AIDE_VENDUE, 'FDUR');
  const delais = d.getByLabel(DELAI, { exact: true });
  await expect(delais).toHaveCount(2);
  for (const i of [0, 1]) {
    const id = await delais.nth(i).getAttribute('aria-describedby');
    expect(id, `aria-describedby du délai n° ${i}`).toBeTruthy();
    await expect(d.locator(`[id="${id}"]`)).toHaveText(AIDE_OUI_JO);
    await expect(delais.nth(i)).toHaveAccessibleDescription(AIDE_OUI_JO);
  }
});

test('E2E-644 : aide de la charge vendue, en création et en modification', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E644', []);
  await activiteAvec(request, m.projet.id, 'Act vendue', {});
  await ouvrirPlanning(page, m.projet.id, m.emailChef);
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  await verifierAide(dialogueCreation(page), VENDUE, AIDE_VENDUE, 'création');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier Act vendue', exact: true }).click();
  await verifierAide(dialogueModif(page), VENDUE, AIDE_VENDUE, 'modification');
});

test('E2E-645 : « Délai (j) » et son aide : Planning, formulaire d’édition, dialogue d’une activité', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E645', []);
  const p = await activiteAvec(request, m.projet.id, 'Pred', {});
  const s = await activiteAvec(request, m.projet.id, 'Succ', {});
  await lier(request, m.projet.id, p.id, s.id);
  await ouvrirPlanning(page, m.projet.id, m.emailChef);

  await page.getByRole('button', { name: 'Nouvelle dépendance', exact: true }).click();
  const nouvelle = page.getByRole('dialog', { name: 'Nouvelle dépendance' });
  await verifierAide(nouvelle, DELAI, AIDE_OUI_JO, 'Planning');
  await nouvelle.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(nouvelle).toHaveCount(0);

  await page.getByRole('button', { name: 'Modifier la dépendance Pred → Succ' }).click();
  const edition = page.getByRole('dialog', { name: 'Modifier la dépendance' });
  await verifierAide(edition, DELAI, AIDE_OUI_JO, 'formulaire d’édition');
  await edition.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(edition).toHaveCount(0);

  await page.getByRole('button', { name: 'Modifier Succ', exact: true }).click();
  const activite = dialogueModif(page);
  await expect(activite).toBeVisible();
  const champs = activite.getByLabel(DELAI, { exact: true });
  await expect(champs).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await expect(champs.nth(i)).toHaveAccessibleDescription(AIDE_OUI_JO);
  }
});

test('E2E-646 : « Charge assignée (j) » et son aide : « Assigner » et « Modifier l’assignation »', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E646', ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Act charge', {});
  await m.api.assignation(a.id, m.gens['Alice']!.id, 2);
  const b = await activiteAvec(request, m.projet.id, 'Act libre', {});
  await ouvrirPlanning(page, m.projet.id, m.emailChef);

  await page.getByRole('button', { name: `Assigner une ressource à ${'Act libre'}` }).click();
  const assigner = page.getByRole('dialog', { name: 'Assigner une ressource' });
  await verifierAide(assigner, CHARGE, AIDE_CHARGE_ASSIGNEE, 'Assigner');
  await assigner.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(assigner).toHaveCount(0);

  await page
    .getByRole('button', {
      name: "Modifier l'assignation de Alice E2E646 à Act charge",
      exact: true,
    })
    .click();
  const modifier = page.getByRole('dialog', { name: 'Modifier l’assignation' });
  await verifierAide(modifier, CHARGE, AIDE_CHARGE_ASSIGNEE, 'Modifier l’assignation');
  expect(b.id).toBeGreaterThan(0);
});

test('E2E-647 : Planning manuel : en-tête « Total du mois (j) »', async ({ page, request }) => {
  const m = await monde(request, 'E2E647');
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=2027-01`);
  await expect(
    page.getByRole('columnheader', { name: 'Total du mois (j)', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Total du mois (jours)')).toHaveCount(0);
});

// --- Empilement du dialogue (D-235 (B), SPEC §6 « Charge lisible » 6) ---

/** Pour chaque champ du dialogue : l'élément au centre du champ est dans le dialogue. Renvoie le nombre de champs
 *  dont la boîte recouvre l'en-tête collant (pour prouver que le test peut échouer). */
async function verifierEmpilement(dialogue: Locator, selecteurEntete: string) {
  await expect(dialogue).toBeVisible();
  const champs = dialogue.locator('input:visible, select:visible, textarea:visible');
  const total = await champs.count();
  expect(total, 'champs du dialogue').toBeGreaterThan(3);
  let recouverts = 0;
  for (let i = 0; i < total; i++) {
    const champ = champs.nth(i);
    await champ.scrollIntoViewIfNeeded();
    const { dedans, sousEntete } = await champ.evaluate((el, sel) => {
      const r = el.getBoundingClientRect();
      // Radix pose `pointer-events: none` sur le body d'un dialogue modal : `elementFromPoint` ignorerait alors
      // tout ce qui est hors du dialogue, et le test ne verrait pas l'empilement visuel. On le lève le temps de la mesure.
      const avant = document.body.style.pointerEvents;
      document.body.style.pointerEvents = 'auto';
      const haut = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      document.body.style.pointerEvents = avant;
      const sous = [...document.querySelectorAll(sel)].some((th) => {
        const h = th.getBoundingClientRect();
        return r.top < h.bottom && r.bottom > h.top && r.left < h.right && r.right > h.left;
      });
      return {
        dedans: haut !== null && el.closest('[role="dialog"]')!.contains(haut),
        sousEntete: sous,
      };
    }, selecteurEntete);
    if (sousEntete) recouverts++;
    expect(dedans, `champ n° ${i} : élément au centre dans le dialogue`).toBe(true);
  }
  return recouverts;
}

async function monde30(request: Parameters<typeof monde3b>[0], suffixe: string) {
  const m = await monde3b(request, suffixe, []);
  for (let i = 1; i <= 30; i++) {
    await activiteAvec(request, m.projet.id, `Act ${String(i).padStart(2, '0')}`, {
      mode: 'START',
      debut_valide: '2027-01-11',
      duree_validee: 2,
    });
  }
  await calculer(request, [m.projet.id]);
  return m;
}

test('E2E-648 : Gantt d’un projet, page défilée : le dialogue d’une activité passe devant l’en-tête collant', async ({
  page,
  request,
}) => {
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 900, height: 800 });
  const m = await monde30(request, 'E2E648');
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}?onglet=gantt&zoom=jour`);
  await page.getByRole('button', { name: 'Act 30', exact: true }).click();
  const dialogue = page.getByRole('dialog', { name: 'Modifier l’activité' });
  // Locateur CSS : le dialogue modal rend le reste de la page `aria-hidden`, hors des requêtes par rôle.
  const recouverts = await verifierEmpilement(dialogue, '[aria-label="Tableau du Gantt"] th');
  expect(recouverts, 'au moins un champ sous l’en-tête collant').toBeGreaterThan(0);
});

test('E2E-649 : Accueil, page défilée : le dialogue d’une activité passe devant l’en-tête collant', async ({
  page,
  request,
}) => {
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 1100, height: 800 });
  const m = await monde30(request, 'E2E649');
  await connecterAvec(page, m.emailChef);
  await page.goto('/');
  await page.getByRole('button', { name: 'Act 30', exact: true }).click();
  const dialogue = page.getByRole('dialog', { name: 'Modifier l’activité' });
  // Locateur CSS : le dialogue modal rend le reste de la page `aria-hidden`, hors des requêtes par rôle.
  const recouverts = await verifierEmpilement(
    dialogue,
    '[aria-label="Tableau du Gantt global"] th',
  );
  expect(recouverts, 'au moins un champ sous l’en-tête collant').toBeGreaterThan(0);
});
