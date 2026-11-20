// Gantt global sur Accueil, tranche G3 (D-080, D-081, D-082) : E2E-93 à E2E-100 (+ E2E-101, captures).
// Base « administrateur seul », horloge du navigateur figée au 06/01/2027. Données par l'API, lecture à l'écran.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import pg from 'pg';
import { loginAsAdmin } from './helpers.js';
import { preparer } from './lot1-helpers.js';
import { activiteAvec, calculer, jalonAvec, lier, sousProjet } from './lot3b-helpers.js';

const NOM_ADMIN_E2E = 'Admin E2E';
const J06 = '2027-01-06T10:00:00';

function urlTest(): string {
  const url = process.env.TEST_DATABASE_URL ?? '';
  if (!url || !new URL(url).pathname.slice(1).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL doit désigner une base dont le nom finit par _test');
  }
  return url;
}

/** Remet la base dans l'état « administrateur seul », par le nom. Refuse toute base hors *_test. */
async function remettreAdminSeul(): Promise<void> {
  const client = new pg.Client({ connectionString: urlTest() });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE projet, historique RESTART IDENTITY CASCADE');
    await client.query('DELETE FROM utilisateur WHERE nom <> $1', [NOM_ADMIN_E2E]);
    await client.query('DELETE FROM calendrier WHERE NOT est_defaut');
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
});
test.afterEach(remettreAdminSeul);

type Api = Awaited<ReturnType<typeof preparer>>;

async function adminId(request: APIRequestContext): Promise<number> {
  return ((await (await request.get('/api/auth/me')).json()) as { id: number }).id;
}

const zoneTableau = (page: Page) =>
  page.getByRole('region', { name: 'Tableau du Gantt global', exact: true });
const zoneCalendrier = (page: Page) =>
  page.getByRole('region', { name: 'Calendrier du Gantt global', exact: true });
const ligne = (page: Page, texte: string): Locator =>
  zoneTableau(page).getByRole('row').filter({ hasText: texte });
const deplier = (page: Page, nom: string) =>
  page.getByRole('button', { name: `Déplier ${nom}`, exact: true });
const replier = (page: Page, nom: string) =>
  page.getByRole('button', { name: `Replier ${nom}`, exact: true });

/** Noms (colonne Nom) des lignes du tableau, dans l'ordre. */
async function nomsAffiches(page: Page): Promise<string[]> {
  return (await zoneTableau(page).locator('tbody tr td:nth-child(2)').allInnerTexts()).map((t) =>
    t.trim(),
  );
}

/** « 2027-01-04 » → « 04/01/2027 ». */
const jjmmaaaa = (iso: string) => iso.split('-').reverse().join('/');

/** Compte les requêtes GET /api/projets/:id/gantt par identifiant. */
function compterGantt(page: Page): Map<number, number> {
  const compteur = new Map<number, number>();
  page.on('request', (r) => {
    const m = /\/api\/projets\/(\d+)\/gantt$/.exec(new URL(r.url()).pathname);
    if (m && r.method() === 'GET')
      compteur.set(Number(m[1]), (compteur.get(Number(m[1])) ?? 0) + 1);
  });
  return compteur;
}

interface ElementApi {
  id: number;
  type: string;
  wbs: string;
  nom: string;
  debut_planifie?: string | null;
  fin_planifiee?: string | null;
  date_planifiee?: string | null;
  drapeaux: string[];
}

async function elementsApi(request: APIRequestContext, projetId: number): Promise<ElementApi[]> {
  const r = await request.get(`/api/projets/${projetId}/gantt`);
  expect(r.ok()).toBeTruthy();
  return ((await r.json()) as { elements: ElementApi[] }).elements;
}

interface Monde {
  api: Api;
  admin: number;
  ressource: number;
}
async function monde(request: APIRequestContext, suffixe: string): Promise<Monde> {
  const api = await preparer(request);
  const admin = await adminId(request);
  const r = await api.utilisateur(
    `Ressource ${suffixe}`,
    `r-${suffixe}@g3.test`,
    'ressource',
    true,
  );
  return { api, admin, ressource: r.id };
}

test('E2E-93-r2 dépliage d’un projet calculé : lignes, badge Jalon, barres, nom accessible, lien dessiné, sous-projet une seule fois', async ({
  page,
  request,
}) => {
  const { api, admin, ressource } = await monde(request, '93');
  const p = await api.projet('P93', 'Projet93', admin);
  await api.affectation(p.id, ressource);
  const parente = await activiteAvec(request, p.id, 'Parente93');
  const fille = await activiteAvec(request, p.id, 'Fille93', { parent_id: parente.id });
  await api.assignation(fille.id, ressource, 3);
  const jalon = await jalonAvec(request, p.id, 'Livraison93');
  await lier(request, p.id, fille.id, jalon.id, 'FD');
  const s = await sousProjet(request, p.id, 'S93', 'Sous93', admin);
  await api.affectation(s.id, ressource);
  const actS = await activiteAvec(request, s.id, 'Travail S93');
  await api.assignation(actS.id, ressource, 2);
  await calculer(request, [p.id]);
  const elements = await elementsApi(request, p.id);
  for (const e of elements) expect(e.debut_planifie ?? e.date_planifiee).toBeTruthy();

  await loginAsAdmin(page);
  await expect(zoneTableau(page)).toBeVisible();
  // Tout replié au chargement.
  await expect(deplier(page, 'Projet93')).toHaveAttribute('aria-expanded', 'false');
  expect(await nomsAffiches(page)).toEqual(['Projet93']);
  await expect(zoneCalendrier(page).locator('[data-element-id]')).toHaveCount(0);

  await deplier(page, 'Projet93').click();
  await expect(replier(page, 'Projet93')).toHaveAttribute('aria-expanded', 'true');
  await expect
    .poll(() => nomsAffiches(page))
    .toEqual(['Projet93', 'Parente93', 'Fille93', 'Livraison93 Jalon', 'Sous93']);

  for (const e of elements) {
    const l = ligne(page, e.nom);
    await expect(l.getByRole('cell').first()).toHaveText(e.wbs);
    // Révision -r2 (D-031, D-127 (6)) : un seul bouton, le bouton-nom (l'administrateur écrit le projet).
    await expect(l.getByRole('button')).toHaveCount(1);
    await expect(l.getByRole('button')).toHaveAccessibleName(e.nom);
    await expect(l.getByRole('link')).toHaveCount(0);
    if (e.type === 'jalon') {
      const date = e.date_planifiee!;
      await expect(l.getByRole('cell').nth(2)).toHaveText(jjmmaaaa(date));
      await expect(l.getByRole('cell').nth(3)).toHaveText(jjmmaaaa(date));
    } else {
      await expect(l.getByRole('cell').nth(2)).toHaveText(jjmmaaaa(e.debut_planifie!));
      await expect(l.getByRole('cell').nth(3)).toHaveText(jjmmaaaa(e.fin_planifiee!));
    }
    await expect(l.getByRole('cell').nth(4)).toHaveText(e.drapeaux.length ? /\S/ : '');
  }
  await expect(ligne(page, 'Livraison93').getByText('Jalon', { exact: true })).toBeVisible();
  await expect(ligne(page, 'Fille93').getByText('Jalon', { exact: true })).toHaveCount(0);

  // Barres : noms accessibles de 3b (12 et 14), une par élément daté.
  const cal = zoneCalendrier(page);
  for (const e of elements) {
    const nom =
      e.type === 'jalon'
        ? `${e.nom}, le ${jjmmaaaa(e.date_planifiee!)}`
        : `${e.nom}, du ${jjmmaaaa(e.debut_planifie!)} au ${jjmmaaaa(e.fin_planifiee!)}`;
    const barre = cal.getByRole('img', { name: nom, exact: true });
    await expect(barre).toHaveCount(1);
    await expect(barre).toHaveAttribute('data-element-id', String(e.id));
  }
  // Lien FD du projet déplié, dessiné.
  await expect(cal.locator('[data-lien-id][data-type="FD"]')).toHaveCount(1);
  // Le sous-projet n'a qu'une barre de synthèse.
  await expect(cal.locator(`[data-projet-id="${s.id}"]`)).toHaveCount(1);
  await expect(cal.locator('[data-type="sous-projet"]')).toHaveCount(2);

  await replier(page, 'Projet93').click();
  expect(await nomsAffiches(page)).toEqual(['Projet93']);
  await expect(cal.locator('[data-lien-id]')).toHaveCount(0);
  await expect(cal.locator('[data-element-id]')).toHaveCount(0);
});

test('E2E-94 repli puis dépliage : aucun nouvel appel à /gantt', async ({ page, request }) => {
  const { api, admin, ressource } = await monde(request, '94');
  const p = await api.projet('P94', 'Projet94', admin);
  await api.affectation(p.id, ressource);
  const a = await activiteAvec(request, p.id, 'Activité94');
  await api.assignation(a.id, ressource, 2);
  await calculer(request, [p.id]);

  const compteur = compterGantt(page);
  await loginAsAdmin(page);
  await expect(zoneTableau(page)).toBeVisible();
  expect(compteur.get(p.id) ?? 0).toBe(0);
  await deplier(page, 'Projet94').click();
  await expect(ligne(page, 'Activité94')).toBeVisible();
  expect(compteur.get(p.id)).toBe(1);

  await replier(page, 'Projet94').click();
  await expect(ligne(page, 'Activité94')).toHaveCount(0);
  await deplier(page, 'Projet94').click();
  await expect(ligne(page, 'Activité94')).toBeVisible();
  await expect(zoneCalendrier(page).locator(`[data-element-id="${a.id}"]`)).toHaveCount(1);
  expect(compteur.get(p.id)).toBe(1);
});

test('E2E-95 « Tout déplier » : deux racines et un sous-sous-projet, relibellé « Tout replier »', async ({
  page,
  request,
}) => {
  const { api, admin, ressource } = await monde(request, '95');
  const a = await api.projet('A95', 'Alpha95', admin);
  const b = await api.projet('B95', 'Beta95', admin);
  const s = await sousProjet(request, a.id, 'S95', 'Sous95', admin);
  const ss = await sousProjet(request, s.id, 'SS95', 'Petit-fils95', admin);
  for (const [p, nom] of [
    [a, 'Act A95'],
    [b, 'Act B95'],
    [s, 'Act S95'],
    [ss, 'Act SS95'],
  ] as const) {
    await api.affectation(p.id, ressource);
    const act = await activiteAvec(request, p.id, nom);
    await api.assignation(act.id, ressource, 1);
  }
  await calculer(request, [a.id, b.id]);

  const compteur = compterGantt(page);
  await loginAsAdmin(page);
  await expect(zoneTableau(page)).toBeVisible();
  expect(await nomsAffiches(page)).toEqual(['Alpha95', 'Beta95']);

  await page.getByRole('button', { name: 'Tout déplier', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tout replier', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tout déplier', exact: true })).toHaveCount(0);
  expect(await nomsAffiches(page)).toEqual([
    'Alpha95',
    'Act A95',
    'Sous95',
    'Act S95',
    'Petit-fils95',
    'Act SS95',
    'Beta95',
    'Act B95',
  ]);
  for (const nom of ['Alpha95', 'Beta95', 'Sous95', 'Petit-fils95']) {
    await expect(replier(page, nom)).toHaveAttribute('aria-expanded', 'true');
  }
  for (const id of [a.id, b.id, s.id, ss.id]) expect(compteur.get(id)).toBe(1);

  await page.getByRole('button', { name: 'Tout replier', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tout déplier', exact: true })).toBeVisible();
  expect(await nomsAffiches(page)).toEqual(['Alpha95', 'Beta95']);
});

test('E2E-96 sous-projet clos d’un projet ouvert : absent au dépliage', async ({
  page,
  request,
}) => {
  const { api, admin } = await monde(request, '96');
  const p = await api.projet('P96', 'Projet96', admin);
  await sousProjet(request, p.id, 'S96-O', 'Sous ouvert96', admin);
  const clos = await sousProjet(request, p.id, 'S96-C', 'Sous clos96', admin);
  const patch = await request.patch(`/api/projets/${clos.id}`, { data: { clos: true } });
  expect(patch.ok()).toBeTruthy();

  await loginAsAdmin(page);
  await deplier(page, 'Projet96').click();
  await expect(ligne(page, 'Sous ouvert96')).toBeVisible();
  await expect(ligne(page, 'Sous clos96')).toHaveCount(0);
  expect(await nomsAffiches(page)).toEqual(['Projet96', 'Sous ouvert96']);
});

test('E2E-97 projet vide : « Aucune activité ni jalon. »', async ({ page, request }) => {
  const { api, admin } = await monde(request, '97');
  await api.projet('P97', 'Projet97', admin);
  await loginAsAdmin(page);
  await deplier(page, 'Projet97').click();
  await expect(page.getByText('Aucune activité ni jalon.')).toBeVisible();
  await replier(page, 'Projet97').click();
  await expect(page.getByText('Aucune activité ni jalon.')).toHaveCount(0);
});

test('E2E-98 échec de chargement (500) : message, le reste de l’arbre demeure', async ({
  page,
  request,
}) => {
  const { api, admin, ressource } = await monde(request, '98');
  const a = await api.projet('A98', 'Alpha98', admin);
  const b = await api.projet('B98', 'Beta98', admin);
  await api.affectation(a.id, ressource);
  const act = await activiteAvec(request, a.id, 'Activité98');
  await api.assignation(act.id, ressource, 1);
  await calculer(request, [a.id]);

  await page.route(`**/api/projets/${b.id}/gantt`, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"erreur":"boum"}' }),
  );
  await loginAsAdmin(page);
  await deplier(page, 'Alpha98').click();
  await expect(ligne(page, 'Activité98')).toBeVisible();
  await deplier(page, 'Beta98').click();
  await expect(page.getByText('Impossible de charger le contenu du projet.')).toBeVisible();
  await expect(ligne(page, 'Alpha98')).toBeVisible();
  await expect(ligne(page, 'Activité98')).toBeVisible();
  await expect(ligne(page, 'Beta98')).toBeVisible();
  await expect(zoneCalendrier(page).locator(`[data-projet-id="${a.id}"]`)).toHaveCount(1);
});

test('E2E-99 plage élargie par un élément chargé hors plage initiale, non réduite par le repli', async ({
  page,
  request,
}) => {
  const { api, admin, ressource } = await monde(request, '99');
  const p = await api.projet('P99', 'Projet99', admin);
  await api.affectation(p.id, ressource);
  const a = await activiteAvec(request, p.id, 'Tardive99');
  await api.assignation(a.id, ressource, 2);
  await calculer(request, [p.id]);
  // Dates planifiées de l'élément reculées en base : au-delà de la fin planifiée du projet (agrégat inchangé).
  const client = new pg.Client({ connectionString: urlTest() });
  await client.connect();
  try {
    await client.query(
      "UPDATE activite SET debut_planifie = '2027-03-01', fin_planifiee = '2027-03-12' WHERE id = $1",
      [a.id],
    );
  } finally {
    await client.end();
  }
  const projets = (await (await request.get('/api/projets')).json()) as {
    id: number;
    fin_planifiee: string;
  }[];
  expect(projets.find((x) => x.id === p.id)!.fin_planifiee < '2027-03-01').toBeTruthy();

  await loginAsAdmin(page);
  await page.goto('/?zoom=jour');
  const svg = page.locator('svg[data-zoom]');
  await expect(svg).toBeVisible();
  const largeur = async () => Number(await svg.getAttribute('width'));
  const avant = await largeur();

  await deplier(page, 'Projet99').click();
  const barre = zoneCalendrier(page).locator(`[data-element-id="${a.id}"]`).first();
  await expect(barre).toBeVisible();
  const apres = await largeur();
  expect(apres).toBeGreaterThan(avant);
  const boite = await barre.evaluate((e) => {
    const b = (e as SVGGraphicsElement).getBBox();
    return { x: b.x, fin: b.x + b.width };
  });
  expect(boite.x).toBeGreaterThanOrEqual(0);
  expect(boite.fin).toBeLessThanOrEqual(apres);

  await replier(page, 'Projet99').click();
  await expect(ligne(page, 'Tardive99')).toHaveCount(0);
  expect(await largeur()).toBe(apres);
});

test('E2E-100-r3 ordre de tabulation : zoom, « Tout déplier », tableau (bouton Déplier puis lien), calendrier', async ({
  page,
  request,
}) => {
  const { api, admin } = await monde(request, '100');
  await api.projet('P100', 'Projet100', admin);
  await loginAsAdmin(page);
  await expect(zoneTableau(page)).toHaveAttribute('tabindex', '0');
  await expect(zoneCalendrier(page)).toHaveAttribute('tabindex', '0');

  await page.getByRole('button', { name: 'Jour', exact: true }).focus();
  const libelle = () =>
    page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null;
      const caseCochable = e as HTMLInputElement | null;
      return (
        e?.getAttribute('aria-label') ??
        (e?.textContent?.trim() || caseCochable?.labels?.[0]?.textContent?.trim()) ??
        ''
      );
    });
  // Révision -r2 (D-031, D-091) : la case « Initiales » s'insère après « Mois ».
  const ordre: string[] = [await libelle()];
  // Révision G4 (D-031, -r1) : « Calculer » s'insère entre le zoom et « Tout déplier ».
  // Révision -r3 (D-031, D-127 (6), (7)) : le crayon « Modifier le projet <nom> » suit le lien du projet.
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    ordre.push(await libelle());
  }
  expect(ordre).toEqual([
    'Jour',
    'Semaine',
    'Mois',
    'Initiales',
    'Calculer',
    'Tout déplier',
    'Tableau du Gantt global',
    'Déplier Projet100',
    'Projet100',
    'Modifier le projet Projet100',
    'Calendrier du Gantt global',
  ]);
});
