// Lot 3d-3b (D-098) : clavier, clic, double-clic et dialogue sur le Gantt. E2E-143 à E2E-155.
// Base « administrateur seul » remise à zéro avant et après chaque test, horloge du navigateur figée au
// 06/01/2027, D0 des calculs 2027-01-04, zoom jour, données créées par l'API, PATCH comptés par
// page.on('request').
// Contrat (à relire) : zone `role="region"` « Calendrier du Gantt » (un seul arrêt de tabulation) ; anneau
// de la barre active `[data-anneau-element]` = id de l'élément (un seul, absent sans barre active) ;
// annonce `[data-annonce-gantt]` (aria-live polite, masquée visuellement, présente même vide) ; barre
// d'activité ou de jalon `svg [data-element-id]`, synthèse d'un sous-projet `svg [data-projet-id]` ;
// gestes de 3d-3a inchangés (`svg [data-poignee]`, `svg [data-contour-element]`, bandeau role="status").
import { expect, test, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec } from './lot1-helpers.js';
import { clore } from './lot2e-helpers.js';
import { activiteAvec, calculer, jalonAvec, monde3b, sousProjet } from './lot3b-helpers.js';
import { bandeauNonCalcule, remettreAdminSeul } from './lot3c-helpers.js';

const J06 = '2027-01-06T10:00:00';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul);

const gantt = (projetId: number, zoom = 'jour') => `/projets/${projetId}?onglet=gantt&zoom=${zoom}`;
const zone = (page: Page) => page.getByRole('region', { name: 'Calendrier du Gantt', exact: true });
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);
const barreSynthese = (page: Page, id: number) => page.locator(`svg [data-projet-id="${id}"]`);
const anneaux = (page: Page) => page.locator('[data-anneau-element]');
const annonce = (page: Page) => page.locator('[data-annonce-gantt]');
const contours = (page: Page) => page.locator('svg [data-contour-element]');
const bandeau = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Planning à recalculer' });
const dialogues = (page: Page) => page.getByRole('dialog');
const alertes = (page: Page) => page.getByRole('alert');

/** Les PATCH d'activité et de jalon émis par la page. */
function suivrePatchs(page: Page): string[] {
  const patchs: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'PATCH' && /\/api\/(activites|jalons)\/\d+$/.test(r.url())) {
      patchs.push(r.url());
    }
  });
  return patchs;
}

/** Les GET du Gantt d'un projet émis par la page. */
function suivreChargements(page: Page, projetId: number): string[] {
  const gets: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'GET' && r.url().endsWith(`/api/projets/${projetId}/gantt`)) {
      gets.push(r.url());
    }
  });
  return gets;
}

const laisserPasser = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

const boite = async (cible: Locator) => (await cible.boundingBox())!;
const aLeFocus = (cible: Locator) => cible.evaluate((el) => el === document.activeElement);

/** Tabulation depuis le début de la page jusqu'à la zone « Calendrier du Gantt ». */
async function tabulerJusqua(page: Page): Promise<void> {
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    if (await aLeFocus(zone(page))) return;
  }
  throw new Error('La zone « Calendrier du Gantt » n’a jamais reçu le focus par Tab.');
}

async function activeEst(page: Page, id: number): Promise<void> {
  await expect(anneaux(page)).toHaveCount(1);
  await expect(anneaux(page)).toHaveAttribute('data-anneau-element', String(id));
}

async function appuyer(page: Page, touche: string, fois = 1): Promise<void> {
  for (let i = 0; i < fois; i++) await page.keyboard.press(touche);
}

const START_11 = { mode: 'START', debut_valide: '2027-01-11' };

/**
 * Monde « clavier », dans l'ordre WBS : A (START 11/01, 5 j, Alice), P parent de E, E (ASAP, 3 j, Bob),
 * J (jalon fixe 12/01), éventuellement F (START 01/03, 1 j, Carole) ; sous-projet S avec une activité
 * assignée ; calcul ; puis B (ASAP) créée après le calcul, donc sans dates.
 */
async function mondeClavier(
  request: Parameters<typeof monde3b>[0],
  suffixe: string,
  options: { champsA?: Record<string, unknown>; avecF?: boolean } = {},
) {
  const m = await monde3b(request, suffixe, ['Alice', 'Bob', 'Carole']);
  const p = m.projet.id;
  const a = await activiteAvec(request, p, 'Tâche A', { ...START_11, ...options.champsA });
  await m.api.assignation(a.id, m.gens.Alice!.id, 5);
  const parent = await activiteAvec(request, p, 'Tâche P');
  const e = await activiteAvec(request, p, 'Tâche E', { parent_id: parent.id });
  await m.api.assignation(e.id, m.gens.Bob!.id, 3);
  const j = await jalonAvec(request, p, 'Jalon J', { type: 'fixe', date_validee: '2027-01-12' });
  let f: { id: number } | null = null;
  if (options.avecF) {
    f = await activiteAvec(request, p, 'Tâche F', { mode: 'START', debut_valide: '2027-03-01' });
    await m.api.assignation(f.id, m.gens.Carole!.id, 1);
  }
  const s = await sousProjet(request, p, `S-${suffixe}`, 'Sous-projet S', m.chef.id);
  await m.api.affectation(s.id, m.gens.Alice!.id);
  const as = await activiteAvec(request, s.id, 'Tâche de S', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(as.id, m.gens.Alice!.id, 2);
  await calculer(request, [p]);
  const b = await activiteAvec(request, p, 'Tâche B');
  return { ...m, a, p: parent, e, j, f, s, b };
}
type Monde = Awaited<ReturnType<typeof mondeClavier>>;

/** Préambule : barres de A, P, E, J et S présentes, aucune pour B ; nom de départ de A. */
async function verifierMonde(page: Page, m: Monde): Promise<void> {
  await expect(barre(page, m.a.id)).toHaveAttribute(
    'aria-label',
    'Tâche A, du 11/01/2027 au 15/01/2027',
  );
  for (const id of [m.p.id, m.e.id, m.j.id]) await expect(barre(page, id)).toHaveCount(1);
  await expect(barreSynthese(page, m.s.id)).toHaveCount(1);
  await expect(barre(page, m.b.id)).toHaveCount(0);
}

async function ouvrirGantt(page: Page, m: Monde, email = m.emailChef): Promise<void> {
  await connecterAvec(page, email);
  await page.goto(gantt(m.projet.id));
  await verifierMonde(page, m);
}

/** Ouvre « Modifier <nom> » depuis l'onglet Planning ; l'appelant ferme le dialogue. */
async function dialoguePlanning(page: Page, nom: string, titre: string) {
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: `Modifier ${nom}`, exact: true }).click();
  const dialogue = page.getByRole('dialog', { name: titre });
  await expect(dialogue).toBeVisible();
  return dialogue;
}

const TITRE_ACTIVITE = 'Modifier l’activité';
const TITRE_JALON = 'Modifier le jalon';

test('E2E-143 : ↑ ↓ Échap : barre active, anneau, annonce, bornes, un seul arrêt de tabulation', async ({
  page,
  request,
}) => {
  const m = await mondeClavier(request, 'E2E143');
  await ouvrirGantt(page, m);
  const nom = async (id: number) => (await barre(page, id).getAttribute('aria-label'))!;

  await tabulerJusqua(page);
  await appuyer(page, 'ArrowDown');
  await activeEst(page, m.a.id);
  await expect(annonce(page)).toHaveText(await nom(m.a.id));

  for (const id of [m.p.id, m.e.id, m.j.id]) {
    await appuyer(page, 'ArrowDown');
    await activeEst(page, id);
    await expect(annonce(page)).toHaveText(await nom(id));
  }
  await appuyer(page, 'ArrowDown');
  await activeEst(page, m.j.id);

  await appuyer(page, 'ArrowUp');
  await activeEst(page, m.e.id);
  await expect(annonce(page)).toHaveText(await nom(m.e.id));

  await appuyer(page, 'Escape');
  await expect(anneaux(page)).toHaveCount(0);
  await expect(annonce(page)).toHaveText('');
  await appuyer(page, 'ArrowUp');
  await activeEst(page, m.j.id);

  await appuyer(page, 'Tab');
  expect(await zone(page).evaluate((el) => el.contains(document.activeElement))).toBe(false);
});

test('E2E-144 : ← et → font défiler la zone, la barre active reste', async ({ page, request }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  const m = await mondeClavier(request, 'E2E144');
  await ouvrirGantt(page, m);
  const defilable = await zone(page).evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(defilable, 'préambule : la zone doit être défilable à 1024 px').toBe(true);

  await tabulerJusqua(page);
  await appuyer(page, 'ArrowDown');
  await activeEst(page, m.a.id);
  const avant = await zone(page).evaluate((el) => el.scrollLeft);

  await appuyer(page, 'ArrowRight');
  await expect.poll(() => zone(page).evaluate((el) => el.scrollLeft)).toBeGreaterThan(avant);
  const droite = await zone(page).evaluate((el) => el.scrollLeft);
  await activeEst(page, m.a.id);

  await appuyer(page, 'ArrowLeft');
  await expect.poll(() => zone(page).evaluate((el) => el.scrollLeft)).toBeLessThan(droite);
  await activeEst(page, m.a.id);
});

test('E2E-145 : la barre active est amenée dans la zone visible', async ({ page, request }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  const m = await mondeClavier(request, 'E2E145', { avecF: true });
  await ouvrirGantt(page, m);
  const f = m.f!;
  const dedans = async () => {
    const z = await boite(zone(page));
    const b = await boite(barre(page, f.id));
    return b.x >= z.x - 1 && b.x + b.width <= z.x + z.width + 1;
  };
  expect(await zone(page).evaluate((el) => el.scrollLeft)).toBe(0);
  expect(await dedans(), 'préambule : F est hors de la zone visible au départ').toBe(false);

  await tabulerJusqua(page);
  for (let i = 0; i < 8; i++) {
    await appuyer(page, 'ArrowDown');
    if ((await anneaux(page).getAttribute('data-anneau-element')) === String(f.id)) break;
  }
  await activeEst(page, f.id);
  await expect.poll(dedans).toBe(true);
});

test('E2E-146 : Entrée ouvre « Modifier l’activité » ; enregistrer recharge le Gantt, bandeau, focus rendu', async ({
  page,
  request,
}) => {
  const m = await mondeClavier(request, 'E2E146');
  const chargements = suivreChargements(page, m.projet.id);
  const patchs = suivrePatchs(page);
  await ouvrirGantt(page, m);
  const avant = chargements.length;

  await tabulerJusqua(page);
  await appuyer(page, 'ArrowDown');
  await activeEst(page, m.a.id);
  await appuyer(page, 'Enter');
  const dialogue = page.getByRole('dialog', { name: TITRE_ACTIVITE });
  await expect(dialogue).toBeVisible();
  await dialogue.getByLabel('Nom').fill('A bis');
  await dialogue.getByLabel('Début validé').fill('2027-01-18');
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(dialogue).toHaveCount(0);
  expect(patchs.length).toBe(1);
  await expect.poll(() => chargements.length, 'Gantt rechargé (GET)').toBeGreaterThan(avant);
  await expect(
    page.getByRole('region', { name: 'Tableau du Gantt', exact: true }).getByText('A bis', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(bandeau(page)).toBeVisible();
  await expect(contours(page)).toHaveCount(0);
  await expect(zone(page)).toBeFocused();
  await activeEst(page, m.a.id);

  const planning = await dialoguePlanning(page, 'A bis', TITRE_ACTIVITE);
  await expect(planning.getByLabel('Début validé')).toHaveValue('2027-01-18');
});

test('E2E-147 : double-clic sur le losange d’un jalon ouvre « Modifier le jalon »', async ({
  page,
  request,
}) => {
  const m = await mondeClavier(request, 'E2E147');
  await ouvrirGantt(page, m);

  await barre(page, m.j.id).dblclick();
  const dialogue = page.getByRole('dialog', { name: TITRE_JALON });
  await expect(dialogue).toBeVisible();
  await dialogue.getByLabel('Date validée').fill('2027-01-19');
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(dialogue).toHaveCount(0);
  await expect(bandeau(page)).toBeVisible();
  await expect(zone(page)).toBeFocused();
  await activeEst(page, m.j.id);

  const planning = await dialoguePlanning(page, 'Jalon J', TITRE_JALON);
  await expect(planning.getByLabel('Date validée')).toHaveValue('2027-01-19');
});

test('E2E-148 : Entrée puis Annuler : focus rendu à la zone, barre active gardée, rien d’envoyé', async ({
  page,
  request,
}) => {
  const m = await mondeClavier(request, 'E2E148');
  const patchs = suivrePatchs(page);
  await ouvrirGantt(page, m);

  await tabulerJusqua(page);
  await appuyer(page, 'ArrowDown');
  await activeEst(page, m.a.id);
  await appuyer(page, 'Enter');
  const dialogue = page.getByRole('dialog', { name: TITRE_ACTIVITE });
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: 'Annuler' }).click();

  await expect(dialogue).toHaveCount(0);
  await expect(zone(page)).toBeFocused();
  await activeEst(page, m.a.id);
  await expect(bandeau(page)).toHaveCount(0);
  expect(patchs.length).toBe(0);
});

test('E2E-149 : le dialogue s’ouvre aussi sur un parent et sur une activité close', async ({
  page,
  request,
}) => {
  const m = await mondeClavier(request, 'E2E149');
  await clore(request, m.e.id);
  await ouvrirGantt(page, m);

  await tabulerJusqua(page);
  await appuyer(page, 'ArrowDown', 2);
  await activeEst(page, m.p.id);
  await appuyer(page, 'Enter');
  const dialogue = page.getByRole('dialog', { name: TITRE_ACTIVITE });
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: 'Annuler' }).click();
  await expect(dialogue).toHaveCount(0);

  await appuyer(page, 'ArrowDown');
  await activeEst(page, m.e.id);
  await appuyer(page, 'Enter');
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: 'Annuler' }).click();
  await expect(dialogue).toHaveCount(0);
});

test('E2E-150 : sans droit d’écriture, la barre est active et annoncée mais aucun dialogue ne s’ouvre', async ({
  page,
  request,
}) => {
  const m = await mondeClavier(request, 'E2E150');
  await ouvrirGantt(page, m, m.gens.Alice!.email);

  await tabulerJusqua(page);
  await appuyer(page, 'ArrowDown');
  await activeEst(page, m.a.id);
  await expect(annonce(page)).toHaveText((await barre(page, m.a.id).getAttribute('aria-label'))!);

  await appuyer(page, 'Enter');
  await laisserPasser(page);
  await expect(dialogues(page)).toHaveCount(0);
  await barre(page, m.a.id).dblclick();
  await laisserPasser(page);
  await expect(dialogues(page)).toHaveCount(0);
});

test('E2E-151 : refus réel dans le dialogue : il reste ouvert, base inchangée', async ({
  page,
  request,
}) => {
  const m = await mondeClavier(request, 'E2E151', { champsA: { fin_valide: '2027-01-15' } });
  await ouvrirGantt(page, m);

  await tabulerJusqua(page);
  await appuyer(page, 'ArrowDown');
  await activeEst(page, m.a.id);
  await appuyer(page, 'Enter');
  const dialogue = page.getByRole('dialog', { name: TITRE_ACTIVITE });
  await expect(dialogue).toBeVisible();
  await dialogue.getByLabel('Début validé').fill('2027-01-20');
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialogue).toBeVisible();
  await expect(
    dialogue.getByText('Modification refusée : la fin validée précède le début validé.'),
  ).toBeVisible();

  await dialogue.getByRole('button', { name: 'Annuler' }).click();
  await expect(dialogue).toHaveCount(0);
  await expect(bandeau(page)).toHaveCount(0);
  const r = await request.get(`/api/projets/${m.projet.id}/activites`);
  expect(r.ok()).toBeTruthy();
  const lignes = (await r.json()) as { id: number; debut_valide: string | null }[];
  expect(lignes.find((l) => l.id === m.a.id)?.debut_valide).toBe('2027-01-11');
});

test('E2E-152 : un clic sur une barre donne le focus et la rend active ; la synthèse d’un sous-projet ne change rien', async ({
  page,
  request,
}) => {
  const m = await mondeClavier(request, 'E2E152');
  const patchs = suivrePatchs(page);
  await ouvrirGantt(page, m);

  await barre(page, m.a.id).click();
  await expect(zone(page)).toBeFocused();
  await activeEst(page, m.a.id);
  await expect(annonce(page)).toHaveText((await barre(page, m.a.id).getAttribute('aria-label'))!);
  await laisserPasser(page);
  expect(patchs.length).toBe(0);

  await appuyer(page, 'ArrowDown');
  await activeEst(page, m.p.id);

  await barreSynthese(page, m.s.id).click();
  await activeEst(page, m.p.id);
});

test('E2E-153 : Échap pendant un glisser l’annule : barre en place, aucun PATCH, barre active', async ({
  page,
  request,
}) => {
  const m = await mondeClavier(request, 'E2E153');
  const patchs = suivrePatchs(page);
  await ouvrirGantt(page, m);
  const depart = await boite(barre(page, m.a.id));
  const x = depart.x + depart.width / 2;
  const y = depart.y + depart.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 72, y, { steps: 12 });
  await page.keyboard.press('Escape');
  await page.mouse.move(x + 144, y, { steps: 12 });
  await page.mouse.up();
  await laisserPasser(page);

  expect(patchs.length).toBe(0);
  const apres = await boite(barre(page, m.a.id));
  expect(Math.abs(apres.x - depart.x)).toBeLessThanOrEqual(1);
  await expect(contours(page)).toHaveCount(0);
  await activeEst(page, m.a.id);
});

test('E2E-154 : calendrier par défaut illisible : alerte générique, aucun PATCH ; témoin positif après rechargement', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E154', ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Tâche FDUR', {
    mode: 'FDUR',
    debut_valide: '2027-01-11',
    duree_validee: 5,
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 5);
  await calculer(request, [m.projet.id]);
  const patchs = suivrePatchs(page);
  await page.route('**/api/calendriers', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status: 500, json: { erreur: 'Erreur' } })
      : route.fallback(),
  );
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, a.id)).toHaveAttribute(
    'aria-label',
    'Tâche FDUR, du 11/01/2027 au 15/01/2027',
  );
  const depart = await boite(barre(page, a.id));
  const poignee = page.locator(`svg [data-poignee="droite"][data-poignee-element="${a.id}"]`);
  const glisser = async (cible: Locator, dx: number) => {
    const b = await boite(cible);
    const x = b.x + b.width / 2;
    const y = b.y + b.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y, { steps: 12 });
    await page.mouse.up();
    await laisserPasser(page);
  };

  await glisser(poignee, 72);
  await expect(alertes(page)).toHaveCount(1);
  await expect(alertes(page)).toContainText('Modification impossible pour le moment. Réessayez.');
  expect(patchs.length).toBe(0);
  const apres = await boite(barre(page, a.id));
  expect(Math.abs(apres.x - depart.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(apres.width - depart.width)).toBeLessThanOrEqual(1);
  await expect(contours(page)).toHaveCount(0);

  // Témoin positif : sans l'interception, le même geste envoie un PATCH.
  await page.unroute('**/api/calendriers');
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, a.id)).toHaveAttribute(
    'aria-label',
    'Tâche FDUR, du 11/01/2027 au 15/01/2027',
  );
  await glisser(poignee, 72);
  await expect.poll(() => patchs.length, 'témoin positif').toBe(1);
});

test('E2E-155 : l’Accueil ne change pas : ni barre active, ni annonce, ni dialogue ; témoin positif sur le projet', async ({
  page,
  request,
}) => {
  const m = await mondeClavier(request, 'E2E155');
  await loginAsAdmin(page);
  await page.getByRole('button', { name: `Déplier Projet E2E155`, exact: true }).click();
  const zoneGlobale = page.getByRole('region', {
    name: 'Calendrier du Gantt global',
    exact: true,
  });
  const barreA = zoneGlobale.locator(`[data-element-id="${m.a.id}"]`).first();
  await expect(barreA).toHaveCount(1);
  await zoneGlobale.focus();

  await appuyer(page, 'ArrowDown');
  await appuyer(page, 'Enter');
  await barreA.dblclick();
  await laisserPasser(page);
  await expect(anneaux(page)).toHaveCount(0);
  await expect(page.locator('[data-annonce-gantt]:not(:empty)')).toHaveCount(0);
  await expect(dialogues(page)).toHaveCount(0);

  // Témoin positif : sur le Gantt du projet, la même séquence donne une barre active annoncée.
  await page.goto(gantt(m.projet.id));
  await verifierMonde(page, m);
  await tabulerJusqua(page);
  await appuyer(page, 'ArrowDown');
  await activeEst(page, m.a.id);
});

test('E2E-156 : au zoom mois, le clavier et le double-clic ouvrent le dialogue, sans PATCH', async ({
  page,
  request,
}) => {
  const m = await mondeClavier(request, 'E2E156');
  const patchs = suivrePatchs(page);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id, 'mois'));
  await verifierMonde(page, m);

  await tabulerJusqua(page);
  await appuyer(page, 'ArrowDown');
  await activeEst(page, m.a.id);
  await appuyer(page, 'Enter');
  const dialogue = page.getByRole('dialog', { name: TITRE_ACTIVITE });
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: 'Annuler' }).click();
  await expect(dialogue).toHaveCount(0);
  await expect(zone(page)).toBeFocused();
  await activeEst(page, m.a.id);

  await barre(page, m.j.id).dblclick();
  const jalon = page.getByRole('dialog', { name: TITRE_JALON });
  await expect(jalon).toBeVisible();
  await jalon.getByRole('button', { name: 'Annuler' }).click();
  await expect(jalon).toHaveCount(0);
  expect(patchs.length).toBe(0);
});

test('E2E-157 : Gantt non calculé : ↑ et ↓ sans effet, pas de dialogue ; témoin positif après calcul', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E157', ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Tâche START', START_11);
  await m.api.assignation(a.id, m.gens.Alice!.id, 5);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await expect(bandeauNonCalcule(page)).toBeVisible();

  await tabulerJusqua(page);
  await appuyer(page, 'ArrowDown');
  await appuyer(page, 'ArrowUp');
  await laisserPasser(page);
  await expect(anneaux(page)).toHaveCount(0);
  await expect(annonce(page)).toHaveText('');
  await appuyer(page, 'Enter');
  await laisserPasser(page);
  await expect(dialogues(page)).toHaveCount(0);

  // Témoin positif : après le calcul, la START devient active.
  await calculer(request, [m.projet.id]);
  await page.reload();
  await expect(barre(page, a.id)).toHaveAttribute(
    'aria-label',
    'Tâche START, du 11/01/2027 au 15/01/2027',
  );
  await tabulerJusqua(page);
  await appuyer(page, 'ArrowDown');
  await activeEst(page, a.id);
});
