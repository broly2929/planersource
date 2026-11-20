// REX-3b (D-127 (3) à (5)) : annulation des gestes du Gantt du projet. E2E-257 à E2E-272.
// Base « administrateur seul » remise à zéro avant et après chaque test, horloge du navigateur figée au
// 06/01/2027, zoom jour (24 px par jour), D0 des calculs 2027-01-04, données créées par l'API, gestes et
// annulations faits à l'écran ; requêtes d'écriture comptées par `page.on('request')` ; « base » = valeurs
// relues par l'API (session administrateur de `request`).
// Contrat (à relire) :
//   - bouton « Annuler » (nom exact, `title` « Annuler (Ctrl+Z) », icône `lucide-undo-2`) dans la barre
//     d'outils, après « Copier » ; `disabled` si la pile est vide ou en lecture seule ;
//   - succès : `role="status"` « Geste annulé. » ; échec : `role="alert"` « Impossible d'annuler ce geste ;
//     les annulations précédentes ne sont plus possibles. », pile vidée ;
//   - Ctrl+Z et Meta+Z : même effet que le bouton, ignorés dans un champ, dans un dialogue ouvert, pendant
//     un geste ou un calcul ; une annulation à la fois.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activiteAvec, calculer, jalonAvec, monde3b } from './lot3b-helpers.js';
import { remettreAdminSeul } from './lot3c-helpers.js';
import { retarderPatchs, suivreReponsesPatch } from './patch-helpers.js';

const J06 = '2027-01-06T10:00:00';
const PX_JOUR = 24;
const TEXTE_ECHEC =
  'Impossible d’annuler ce geste ; les annulations précédentes ne sont plus possibles.';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul);

const gantt = (projetId: number, zoom = 'jour') => `/projets/${projetId}?onglet=gantt&zoom=${zoom}`;
const boutonAnnuler = (page: Page) => page.getByRole('button', { name: 'Annuler', exact: true });
const annonce = (page: Page) => page.getByRole('status').filter({ hasText: 'Geste annulé.' });
const alertes = (page: Page) => page.getByRole('alert');
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);
const poignee = (page: Page, id: number, cote: 'gauche' | 'droite') =>
  page.locator(`svg [data-poignee="${cote}"][data-poignee-element="${id}"]`);
const contours = (page: Page, id: number) => page.locator(`svg [data-contour-element="${id}"]`);
const connecteur = (page: Page, id: number) =>
  page.locator(`svg [data-connecteur-element="${id}"]`);
const liens = (page: Page) => page.locator('svg [data-lien-id]');
const bandeau = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Planning à recalculer' });
const enCours = (page: Page) => page.getByRole('status').filter({ hasText: 'Recalcul en cours…' });
const calendrier = (page: Page) =>
  page.getByRole('region', { name: 'Calendrier du Gantt', exact: true });
const tableau = (page: Page) => page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
const caseAuto = (page: Page) =>
  page.getByRole('checkbox', { name: 'Recalcul automatique', exact: true });
const echapper = (texte: string) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ligneDe = (page: Page, nom: string) =>
  tableau(page)
    .locator('tbody tr')
    .filter({ has: page.getByText(new RegExp(`^${echapper(nom)}$`)) });

const laisserPasser = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

async function centre(cible: Locator): Promise<{ x: number; y: number }> {
  await cible.scrollIntoViewIfNeeded();
  const b = (await cible.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Appui au centre de `cible`, déplacement de dx pixels, relâchement. */
async function glisser(page: Page, cible: Locator, dx: number): Promise<void> {
  const c = await centre(cible);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + dx, c.y, { steps: Math.max(2, Math.ceil(Math.abs(dx) / 6)) });
  await page.mouse.up();
  await laisserPasser(page);
}

/** Requêtes d'écriture de l'API émises par la page, dans l'ordre. */
interface Ecriture {
  methode: string;
  chemin: string;
  corps: unknown;
}
function suivreEcritures(page: Page): Ecriture[] {
  const e: Ecriture[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    // Révision E2E-270-r1 (D-031, D-130) : la connexion, faite avant `connecterAvec`, n'est pas comptée.
    if (
      r.method() === 'GET' ||
      !url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/api/auth/')
    ) {
      return;
    }
    e.push({ methode: r.method(), chemin: url.pathname, corps: r.postDataJSON() as unknown });
  });
  return e;
}
const patchsDe = (e: Ecriture[], id: number) =>
  e.filter((x) => x.methode === 'PATCH' && x.chemin === `/api/activites/${id}`);
const calculs = (e: Ecriture[]) => e.filter((x) => x.chemin === '/api/calcul');

/** Activité lue par l'API (dates et durée validées). */
async function activiteBase(request: APIRequestContext, projetId: number, id: number) {
  const r = await request.get(`/api/projets/${projetId}/activites`);
  expect(r.ok(), `GET activites : ${r.status()}`).toBeTruthy();
  const liste = (await r.json()) as {
    id: number;
    nom: string;
    debut_valide: string | null;
    fin_valide: string | null;
    duree_validee: number | null;
  }[];
  return liste.find((a) => a.id === id)!;
}

/** Dépendances du projet lues par l'API. */
async function dependancesBase(request: APIRequestContext, projetId: number) {
  const r = await request.get(`/api/projets/${projetId}/gantt`);
  expect(r.ok(), `GET gantt : ${r.status()}`).toBeTruthy();
  return (
    (await r.json()) as {
      dependances: {
        id: number;
        predecesseur_id: number;
        successeur_id: number;
        type: string;
        delai: number;
      }[];
    }
  ).dependances;
}

/** Parent et rang de chaque élément du projet, lus par l'API. */
async function arbreBase(request: APIRequestContext, projetId: number) {
  const r = await request.get(`/api/projets/${projetId}/gantt`);
  expect(r.ok(), `GET gantt : ${r.status()}`).toBeTruthy();
  const g = (await r.json()) as {
    elements: { id: number; parent_id: number | null; rang: number }[];
  };
  return g.elements.map((e) => [e.id, e.parent_id, e.rang]).sort((a, b) => a[0]! - b[0]!);
}

/** Lignes du tableau, dans l'ordre : « <wbs> <nom> ». */
const ordre = (page: Page) =>
  tableau(page)
    .locator('tbody tr')
    .evaluateAll((rows) =>
      rows.map((r) => {
        const t = r.querySelectorAll('td');
        return `${t[0]!.textContent!.trim()} ${t[1]!.textContent!.trim()}`;
      }),
    );

/** Projet du chef avec une activité START 11/01/2027 (5 j, Alice), calculé. */
async function mondeStart(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice', 'Bob']);
  const a = await activiteAvec(request, m.projet.id, 'Tâche START', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 5);
  await calculer(request, [m.projet.id]);
  return { ...m, a };
}
const BARRE_A = 'Tâche START, du 11/01/2027 au 15/01/2027';

async function ouvrir(page: Page, m: { emailChef: string; projet: { id: number } }) {
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await page.locator('svg[data-zoom]').waitFor();
}

test('E2E-257 : barre START glissée puis « Annuler » : PATCH inverse, base revenue, contour retiré, « Geste annulé. »', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E257');
  const e = suivreEcritures(page);
  await ouvrir(page, m);
  await expect(barre(page, m.a.id)).toHaveAttribute('aria-label', BARRE_A);
  await expect(boutonAnnuler(page)).toBeDisabled();

  await glisser(page, barre(page, m.a.id), 3 * PX_JOUR);
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(1);
  expect(patchsDe(e, m.a.id)[0]!.corps).toEqual({ debut_valide: '2027-01-14' });
  await expect(contours(page, m.a.id)).toHaveCount(1);
  await expect(boutonAnnuler(page)).toBeEnabled();

  await boutonAnnuler(page).click();
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(2);
  expect(patchsDe(e, m.a.id)[1]!.corps).toEqual({ debut_valide: '2027-01-11' });
  await expect(annonce(page)).toBeVisible();
  await expect
    .poll(async () => (await activiteBase(request, m.projet.id, m.a.id)).debut_valide)
    .toBe('2027-01-11');
  await expect(contours(page, m.a.id)).toHaveCount(0);
  await expect(bandeau(page)).toBeVisible();
  await expect(boutonAnnuler(page)).toBeDisabled();
  await expect(alertes(page)).toHaveCount(0);
});

test('E2E-258 : barre FDUR, poignée droite puis corps (début validé null), chacun annulé : durée et null revenus en base', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E258', ['Alice']);
  const f = await activiteAvec(request, m.projet.id, 'Tâche FDUR', {
    mode: 'FDUR',
    duree_validee: 5,
  });
  await m.api.assignation(f.id, m.gens.Alice!.id, 5);
  await calculer(request, [m.projet.id]);
  const avant = await activiteBase(request, m.projet.id, f.id);
  expect(avant.debut_valide, 'préambule : début validé null').toBeNull();
  expect(avant.duree_validee).toBe(5);
  const e = suivreEcritures(page);
  await ouvrir(page, m);

  await glisser(page, poignee(page, f.id, 'droite'), 2 * PX_JOUR);
  await expect.poll(() => patchsDe(e, f.id).length).toBe(1);
  expect(Object.keys(patchsDe(e, f.id)[0]!.corps as object)).toEqual(['duree_validee']);
  await boutonAnnuler(page).click();
  await expect.poll(() => patchsDe(e, f.id).length).toBe(2);
  expect(patchsDe(e, f.id)[1]!.corps).toEqual({ duree_validee: 5 });
  await expect
    .poll(async () => (await activiteBase(request, m.projet.id, f.id)).duree_validee)
    .toBe(5);
  await expect(boutonAnnuler(page)).toBeDisabled();

  await glisser(page, barre(page, f.id), 2 * PX_JOUR);
  await expect.poll(() => patchsDe(e, f.id).length).toBe(3);
  expect(patchsDe(e, f.id)[2]!.corps).toEqual({ debut_valide: '2027-01-06' });
  await boutonAnnuler(page).click();
  await expect.poll(() => patchsDe(e, f.id).length).toBe(4);
  expect(patchsDe(e, f.id)[3]!.corps).toEqual({ debut_valide: null });
  await expect
    .poll(async () => (await activiteBase(request, m.projet.id, f.id)).debut_valide)
    .toBeNull();
});

test('E2E-259 : barre REGUL (corps, deux dates) et barre ALAP (poignée droite), annulées : dates d’avant en base', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E259', ['Alice', 'Bob']);
  const r = await activiteAvec(request, m.projet.id, 'Tâche REGUL', {
    mode: 'REGUL',
    debut_valide: '2027-01-11',
    fin_valide: '2027-01-22',
  });
  await m.api.assignation(r.id, m.gens.Alice!.id, 5);
  const l = await activiteAvec(request, m.projet.id, 'Tâche ALAP', {
    mode: 'ALAP',
    fin_valide: '2027-01-29',
  });
  await m.api.assignation(l.id, m.gens.Bob!.id, 3);
  await calculer(request, [m.projet.id]);
  const e = suivreEcritures(page);
  await ouvrir(page, m);

  await glisser(page, barre(page, r.id), 2 * PX_JOUR);
  await expect.poll(() => patchsDe(e, r.id).length).toBe(1);
  expect(patchsDe(e, r.id)[0]!.corps).toEqual({
    debut_valide: '2027-01-13',
    fin_valide: '2027-01-24',
  });
  await boutonAnnuler(page).click();
  await expect.poll(() => patchsDe(e, r.id).length).toBe(2);
  expect(patchsDe(e, r.id)[1]!.corps).toEqual({
    debut_valide: '2027-01-11',
    fin_valide: '2027-01-22',
  });
  await expect
    .poll(async () => {
      const a = await activiteBase(request, m.projet.id, r.id);
      return [a.debut_valide, a.fin_valide];
    })
    .toEqual(['2027-01-11', '2027-01-22']);

  await glisser(page, poignee(page, l.id, 'droite'), 2 * PX_JOUR);
  await expect.poll(() => patchsDe(e, l.id).length).toBe(1);
  expect(patchsDe(e, l.id)[0]!.corps).toEqual({ fin_valide: '2027-01-31' });
  await boutonAnnuler(page).click();
  await expect.poll(() => patchsDe(e, l.id).length).toBe(2);
  expect(patchsDe(e, l.id)[1]!.corps).toEqual({ fin_valide: '2027-01-29' });
  await expect
    .poll(async () => (await activiteBase(request, m.projet.id, l.id)).fin_valide)
    .toBe('2027-01-29');
  await expect(annonce(page)).toBeVisible();
});

/** Projet avec A (START 11/01, Alice) et B (START 18/01, Bob), calculé. */
async function mondeLiens(request: APIRequestContext, suffixe: string) {
  const m = await mondeStart(request, suffixe);
  const b = await activiteAvec(request, m.projet.id, 'Tâche B', {
    mode: 'START',
    debut_valide: '2027-01-18',
  });
  await m.api.assignation(b.id, m.gens.Bob!.id, 5);
  await calculer(request, [m.projet.id]);
  return { ...m, b };
}

async function glisserConnecteur(page: Page, source: number, cible: Locator) {
  const d = await centre(connecteur(page, source));
  const v = await centre(cible);
  await page.mouse.move(d.x, d.y);
  await page.mouse.down();
  await page.mouse.move(v.x, v.y, { steps: 12 });
  await page.mouse.up();
  await laisserPasser(page);
}

/** Point sur le premier tronçon vertical du lien FD A → B (8 px à droite de la fin de A). */
async function pointLien(page: Page, a: number) {
  const b = (await barre(page, a).boundingBox())!;
  return { x: b.x + b.width + 8, y: b.y + b.height / 2 + 10 };
}

/** Supprime le lien partant de A par l'écran (clic sur le lien, « Supprimer », confirmation). */
async function supprimerLien(page: Page, a: number) {
  const p = await pointLien(page, a);
  await page.mouse.click(p.x, p.y);
  const d = page.getByRole('dialog', { name: 'Modifier la dépendance' });
  await expect(d).toBeVisible();
  await d.getByRole('button', { name: 'Supprimer', exact: true }).click();
  const c = page.getByRole('dialog', { name: /^Supprimer / });
  await c.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(c).toHaveCount(0);
  await expect(d).toHaveCount(0);
}

test('E2E-260 : lien créé par glisser puis « Annuler » : DELETE, aucune dépendance en base, aucun lien', async ({
  page,
  request,
}) => {
  const m = await mondeLiens(request, 'E2E260');
  const e = suivreEcritures(page);
  await ouvrir(page, m);
  await expect(liens(page)).toHaveCount(0);

  await glisserConnecteur(page, m.a.id, barre(page, m.b.id));
  await expect(liens(page)).toHaveCount(1);
  const [cree] = await dependancesBase(request, m.projet.id);
  expect(cree).toMatchObject({ predecesseur_id: m.a.id, successeur_id: m.b.id, type: 'FD' });

  await boutonAnnuler(page).click();
  await expect(annonce(page)).toBeVisible();
  expect(e.filter((x) => x.methode === 'DELETE')).toEqual([
    { methode: 'DELETE', chemin: `/api/dependances/${cree!.id}`, corps: null },
  ]);
  expect(await dependancesBase(request, m.projet.id)).toEqual([]);
  await expect(liens(page)).toHaveCount(0);
  await expect(boutonAnnuler(page)).toBeDisabled();
});

test('E2E-261 : lien FD délai 3 supprimé puis « Annuler » : recréé (même type, même délai, nouvel id) ; créé, supprimé, deux annulations : aucune dépendance', async ({
  page,
  request,
}) => {
  const m = await mondeLiens(request, 'E2E261');
  const r = await request.post(`/api/projets/${m.projet.id}/dependances`, {
    data: { predecesseur_id: m.a.id, successeur_id: m.b.id, type: 'FD', delai: 3 },
  });
  expect(r.ok(), `POST dépendance : ${r.status()}`).toBeTruthy();
  const ancien = (await r.json()) as { id: number };
  const e = suivreEcritures(page);
  await ouvrir(page, m);
  await expect(liens(page)).toHaveCount(1);

  await supprimerLien(page, m.a.id);
  await expect(liens(page)).toHaveCount(0);
  expect(await dependancesBase(request, m.projet.id)).toEqual([]);
  await boutonAnnuler(page).click();
  await expect(annonce(page)).toBeVisible();
  const posts = e.filter((x) => x.methode === 'POST' && x.chemin.endsWith('/dependances'));
  expect(posts).toEqual([
    {
      methode: 'POST',
      chemin: `/api/projets/${m.projet.id}/dependances`,
      corps: { predecesseur_id: m.a.id, successeur_id: m.b.id, type: 'FD', delai: 3 },
    },
  ]);
  const recrees = await dependancesBase(request, m.projet.id);
  expect(recrees).toHaveLength(1);
  expect(recrees[0]).toMatchObject({
    predecesseur_id: m.a.id,
    successeur_id: m.b.id,
    type: 'FD',
    delai: 3,
  });
  expect(recrees[0]!.id).not.toBe(ancien.id);
  await expect(liens(page)).toHaveCount(1);

  // Lien recréé (nouvel id) supprimé à nouveau par le reste de la pile : créé, supprimé, deux annulations.
  await page.reload();
  await page.locator('svg[data-zoom]').waitFor();
  await supprimerLien(page, m.a.id);
  await glisserConnecteur(page, m.a.id, barre(page, m.b.id));
  await expect(liens(page)).toHaveCount(1);
  await supprimerLien(page, m.a.id);
  await expect(liens(page)).toHaveCount(0);
  await boutonAnnuler(page).click();
  await expect(liens(page)).toHaveCount(1);
  await boutonAnnuler(page).click();
  await expect(liens(page)).toHaveCount(0);
  await expect(alertes(page)).toHaveCount(0);
  expect(await dependancesBase(request, m.projet.id)).toEqual([]);
  // La pile contient encore la suppression du lien recréé au début de la séquence.
  await expect(boutonAnnuler(page)).toBeEnabled();
});

/** Monde « arbo » : 1 Phase P (1.1 Sous P1, 1.2 Sous P2) ; 2 Tâche Q (START, Alice) ; 3 Tâche R ; 4 Jalon J. */
async function mondeArbo(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice']);
  const p = await activiteAvec(request, m.projet.id, 'Phase P');
  await activiteAvec(request, m.projet.id, 'Sous P1', { parent_id: p.id });
  await activiteAvec(request, m.projet.id, 'Sous P2', { parent_id: p.id });
  const q = await activiteAvec(request, m.projet.id, 'Tâche Q', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(q.id, m.gens.Alice!.id, 3);
  const r = await activiteAvec(request, m.projet.id, 'Tâche R');
  await jalonAvec(request, m.projet.id, 'Jalon J', { type: 'fixe', date_validee: '2027-01-25' });
  await calculer(request, [m.projet.id]);
  return { ...m, p, q, r };
}
const ORDRE_ARBO = [
  '1 Phase P',
  '1.1 Sous P1',
  '1.2 Sous P2',
  '2 Tâche Q',
  '3 Tâche R',
  '4 Jalon J',
];

test('E2E-262 : ligne glissée dans une activité puis « Annuler » : POST …/deplacer { parent_id: null, rang: 3 }, arbre revenu', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E262');
  const initial = await arbreBase(request, m.projet.id);
  const e = suivreEcritures(page);
  await ouvrir(page, m);
  await expect.poll(() => ordre(page)).toEqual(ORDRE_ARBO);

  const h = await centre(ligneDe(page, 'Tâche R').locator('[data-poignee-ligne]'));
  const cible = (await ligneDe(page, 'Phase P').boundingBox())!;
  await page.mouse.move(h.x, h.y);
  await page.mouse.down();
  await page.mouse.move(cible.x + 40, cible.y + 0.5 * cible.height, { steps: 12 });
  await laisserPasser(page);
  await page.mouse.up();
  await expect.poll(() => ordre(page)).not.toEqual(ORDRE_ARBO);
  expect(e.filter((x) => x.chemin.endsWith('/deplacer'))).toEqual([
    { methode: 'POST', chemin: `/api/elements/${m.r.id}/deplacer`, corps: { parent_id: m.p.id } },
  ]);

  await boutonAnnuler(page).click();
  await expect(annonce(page)).toBeVisible();
  expect(e.filter((x) => x.chemin.endsWith('/deplacer'))[1]).toEqual({
    methode: 'POST',
    chemin: `/api/elements/${m.r.id}/deplacer`,
    corps: { parent_id: null, rang: 3 },
  });
  expect(await arbreBase(request, m.projet.id)).toEqual(initial);
  await expect.poll(() => ordre(page)).toEqual(ORDRE_ARBO);
});

test('E2E-263 : ligne déplacée au clavier par « Déplacer » (onglet Planning), puis « Annuler » dans l’onglet Gantt : arbre revenu', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E263');
  const initial = await arbreBase(request, m.projet.id);
  await ouvrir(page, m);
  await expect(boutonAnnuler(page)).toBeDisabled();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Déplacer Tâche R', exact: true }).focus();
  await page.keyboard.press('Enter');
  const d = page.getByRole('dialog', { name: 'Déplacer Tâche R' });
  await expect(d).toBeVisible();
  await d.getByLabel('Activité parente').selectOption({ label: '1 Phase P' });
  await d.getByRole('button', { name: 'Déplacer', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(d).toHaveCount(0);
  await expect.poll(() => arbreBase(request, m.projet.id)).not.toEqual(initial);

  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect(boutonAnnuler(page)).toBeEnabled();
  await boutonAnnuler(page).click();
  await expect(annonce(page)).toBeVisible();
  await expect.poll(() => arbreBase(request, m.projet.id)).toEqual(initial);
  await expect.poll(() => ordre(page)).toEqual(ORDRE_ARBO);
  await expect(boutonAnnuler(page)).toBeDisabled();
});

test('E2E-264-r1 : Ctrl+Z puis Meta+Z (focus sur le calendrier) annulent chacun un geste de barre', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E264');
  const e = suivreEcritures(page);
  const reponses = suivreReponsesPatch(page, m.a.id);
  await retarderPatchs(page, m.a.id);
  await ouvrir(page, m);

  // Révision E2E-264-r1 (D-031, D-142 (4)) : réponse du PATCH attendue après chaque glisser.
  await glisser(page, barre(page, m.a.id), PX_JOUR);
  await expect.poll(() => reponses()).toBe(1);
  await glisser(page, barre(page, m.a.id), 2 * PX_JOUR);
  await expect.poll(() => reponses()).toBe(2);
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(2);

  await calendrier(page).focus();
  await page.keyboard.press('Control+z');
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(3);
  expect(patchsDe(e, m.a.id)[2]!.corps).toEqual({ debut_valide: '2027-01-12' });
  await expect(annonce(page)).toBeVisible();
  await expect
    .poll(async () => (await activiteBase(request, m.projet.id, m.a.id)).debut_valide)
    .toBe('2027-01-12');

  await calendrier(page).focus();
  await page.keyboard.press('Meta+z');
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(4);
  expect(patchsDe(e, m.a.id)[3]!.corps).toEqual({ debut_valide: '2027-01-11' });
  await expect
    .poll(async () => (await activiteBase(request, m.projet.id, m.a.id)).debut_valide)
    .toBe('2027-01-11');
  await expect(boutonAnnuler(page)).toBeDisabled();
});

test('E2E-265 : Ctrl+Z sans effet dans un champ, dans un dialogue ouvert, pendant un geste, pendant un calcul', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E265');
  const e = suivreEcritures(page);
  await ouvrir(page, m);
  await glisser(page, barre(page, m.a.id), 3 * PX_JOUR);
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(1);
  const sansInverse = async (contexte: string) => {
    await laisserPasser(page);
    await page.waitForTimeout(300);
    expect(patchsDe(e, m.a.id).length, contexte).toBe(1);
    expect((await activiteBase(request, m.projet.id, m.a.id)).debut_valide, contexte).toBe(
      '2027-01-14',
    );
  };

  // Champ : case « Initiales » (input).
  await page.getByRole('checkbox', { name: 'Initiales', exact: true }).focus();
  await page.keyboard.press('Control+z');
  await sansInverse('champ');

  // Dialogue ouvert (double-clic sur la barre) : focus dans le champ Nom, puis sur un bouton du dialogue.
  await barre(page, m.a.id).dblclick();
  const d = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await expect(d).toBeVisible();
  await d.getByLabel('Nom').focus();
  await page.keyboard.press('Control+z');
  await d.getByRole('button', { name: 'Annuler' }).focus();
  await page.keyboard.press('Control+z');
  await sansInverse('dialogue');
  await expect(d).toBeVisible();
  await d.getByRole('button', { name: 'Annuler' }).click();
  await expect(d).toHaveCount(0);
  await expect(boutonAnnuler(page)).toBeEnabled();

  // Pendant un glisser de barre (bouton appuyé), puis Échap annule le glisser.
  const c = await centre(barre(page, m.a.id));
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 2 * PX_JOUR, c.y, { steps: 8 });
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await sansInverse('geste');

  // Pendant un recalcul automatique (POST /api/calcul retenu).
  let liberer: () => void = () => undefined;
  const retenu = new Promise<void>((r) => (liberer = r));
  await page.route('**/api/calcul', async (route) => {
    await retenu;
    await route.continue();
  });
  await caseAuto(page).check();
  await expect(enCours(page)).toBeVisible();
  await calendrier(page).focus();
  await page.keyboard.press('Control+z');
  await sansInverse('calcul');
  liberer();
  await expect(enCours(page)).toHaveCount(0);
  await expect(boutonAnnuler(page)).toBeEnabled();
});

test('E2E-266 : bouton « Annuler » : title, icône, place après « Copier », désactivé pile vide et en lecture seule', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E266');
  await ouvrir(page, m);
  const b = boutonAnnuler(page);
  await expect(b).toHaveCount(1);
  await expect(b).toHaveAttribute('title', 'Annuler (Ctrl+Z)');
  await expect(b.locator('svg.lucide-undo-2')).toHaveCount(1);
  await expect(b).toBeDisabled();
  const copier = page.getByRole('button', { name: 'Copier', exact: true });
  // Même barre d'outils, juste après « Copier ».
  expect(
    await copier.evaluate((c) => {
      const suivant = c.nextElementSibling;
      return suivant?.getAttribute('title') ?? null;
    }),
  ).toBe('Annuler (Ctrl+Z)');

  // Ressource affectée (lecture seule) : présent et désactivé.
  await page.context().clearCookies();
  await connecterAvec(page, m.gens.Alice!.email);
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, m.a.id)).toHaveAttribute('aria-label', BARRE_A);
  await expect(boutonAnnuler(page)).toHaveCount(1);
  await expect(boutonAnnuler(page)).toBeDisabled();
});

test('E2E-267 : 21 gestes puis 20 annulations : base à la valeur du 1er geste, bouton désactivé, Ctrl+Z sans requête', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const m = await mondeStart(request, 'E2E267');
  const e = suivreEcritures(page);
  // Révision E2E-267-r1 (D-031) : retard injecté sur la réponse des PATCH (E2E_RETARD_PATCH, en ms, 0 par
  // défaut), assistant partagé (D-142 (5)) ; la barre est « retenue » jusqu'à la réponse (D-094 (10)).
  const reponses = suivreReponsesPatch(page, m.a.id);
  await retarderPatchs(page, m.a.id);
  await ouvrir(page, m);
  for (let i = 1; i <= 21; i++) {
    await glisser(page, barre(page, m.a.id), i * PX_JOUR);
    await expect.poll(() => patchsDe(e, m.a.id).length).toBe(i);
    await expect.poll(() => reponses()).toBe(i);
    await laisserPasser(page);
  }
  expect(patchsDe(e, m.a.id)[0]!.corps).toEqual({ debut_valide: '2027-01-12' });
  expect(patchsDe(e, m.a.id)[20]!.corps).toEqual({ debut_valide: '2027-02-01' });

  for (let k = 1; k <= 20; k++) {
    await boutonAnnuler(page).click();
    await expect.poll(() => patchsDe(e, m.a.id).length).toBe(21 + k);
  }
  await expect(boutonAnnuler(page)).toBeDisabled();
  await expect
    .poll(async () => (await activiteBase(request, m.projet.id, m.a.id)).debut_valide)
    .toBe('2027-01-12');

  await calendrier(page).focus();
  await page.keyboard.press('Control+z');
  await laisserPasser(page);
  await page.waitForTimeout(300);
  expect(patchsDe(e, m.a.id).length).toBe(41);
});

for (const statut of [409, 422]) {
  test(`E2E-268-r1 (${statut}) : échec de la requête inverse : alerte, pile vidée, valeur du second geste gardée`, async ({
    page,
    request,
  }) => {
    const m = await mondeStart(request, `E2E268-${statut}`);
    const e = suivreEcritures(page);
    const reponses = suivreReponsesPatch(page, m.a.id);
    await retarderPatchs(page, m.a.id);
    await ouvrir(page, m);
    // Révision E2E-268-r1 (D-031, D-142 (4)) : réponse du PATCH attendue après chaque glisser.
    await glisser(page, barre(page, m.a.id), PX_JOUR);
    await expect.poll(() => reponses()).toBe(1);
    await glisser(page, barre(page, m.a.id), 2 * PX_JOUR);
    await expect.poll(() => reponses()).toBe(2);
    await expect.poll(() => patchsDe(e, m.a.id).length).toBe(2);
    await page.route(`**/api/activites/${m.a.id}`, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({
            status: statut,
            contentType: 'application/json',
            body: JSON.stringify({ erreur: 'Refus' }),
          })
        : route.continue(),
    );

    await boutonAnnuler(page).click();
    await expect(alertes(page)).toHaveCount(1);
    await expect(alertes(page)).toContainText(TEXTE_ECHEC);
    await expect(boutonAnnuler(page)).toBeDisabled();
    await expect(annonce(page)).toHaveCount(0);
    expect((await activiteBase(request, m.projet.id, m.a.id)).debut_valide).toBe('2027-01-13');
  });
}

test('E2E-269 : rechargement de la page : pile vide, Ctrl+Z sans requête, valeur du geste gardée', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E269');
  const e = suivreEcritures(page);
  await ouvrir(page, m);
  await glisser(page, barre(page, m.a.id), 3 * PX_JOUR);
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(1);
  await expect(boutonAnnuler(page)).toBeEnabled();

  await page.reload();
  await page.locator('svg[data-zoom]').waitFor();
  await expect(boutonAnnuler(page)).toBeDisabled();
  await calendrier(page).focus();
  await page.keyboard.press('Control+z');
  await laisserPasser(page);
  await page.waitForTimeout(300);
  expect(patchsDe(e, m.a.id).length).toBe(1);
  expect((await activiteBase(request, m.projet.id, m.a.id)).debut_valide).toBe('2027-01-14');
});

test('E2E-270-r1 : recalcul automatique coché : calcul relancé après l’annulation, barre revenue aux dates d’avant', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E270');
  const e = suivreEcritures(page);
  await ouvrir(page, m);
  await caseAuto(page).check();
  await glisser(page, barre(page, m.a.id), 3 * PX_JOUR);
  await expect.poll(() => calculs(e).length).toBe(1);
  await expect(barre(page, m.a.id)).toHaveAttribute(
    'aria-label',
    'Tâche START, du 14/01/2027 au 20/01/2027',
  );

  await boutonAnnuler(page).click();
  await expect.poll(() => calculs(e).length).toBe(2);
  expect(e.map((x) => `${x.methode} ${x.chemin}`)).toEqual([
    `PATCH /api/activites/${m.a.id}`,
    'POST /api/calcul',
    `PATCH /api/activites/${m.a.id}`,
    'POST /api/calcul',
  ]);
  await expect(barre(page, m.a.id)).toHaveAttribute('aria-label', BARRE_A);
  await expect(annonce(page)).toBeVisible();
});

test('E2E-271 : création par le menu, modification par un dialogue (activité, lien) : non empilées ; l’annulation ne défait que le geste', async ({
  page,
  request,
}) => {
  const m = await mondeLiens(request, 'E2E271');
  const r = await request.post(`/api/projets/${m.projet.id}/dependances`, {
    data: { predecesseur_id: m.a.id, successeur_id: m.b.id, type: 'FD', delai: 0 },
  });
  expect(r.ok()).toBeTruthy();
  const e = suivreEcritures(page);
  await ouvrir(page, m);

  // Création par le menu contextuel.
  await ligneDe(page, 'Tâche B').click({ button: 'right' });
  await page.getByRole('menu').getByRole('menuitem', { name: 'Nouvelle activité' }).click();
  const creation = page.getByRole('dialog', { name: 'Nouvelle activité', exact: true });
  await creation.getByLabel('Nom').fill('Tâche menu');
  await creation.getByRole('button', { name: 'Créer' }).click();
  await expect(creation).toHaveCount(0);
  await expect(ligneDe(page, 'Tâche menu')).toHaveCount(1);
  await expect(boutonAnnuler(page)).toBeDisabled();

  // Modification d'une activité par son dialogue (double-clic).
  const modifierPriorite = async (valeur: string) => {
    await barre(page, m.b.id).dblclick();
    const d = page.getByRole('dialog', { name: 'Modifier l’activité' });
    await d.getByLabel('Priorité').fill(valeur);
    await d.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(d).toHaveCount(0);
  };
  await modifierPriorite('600');
  await expect(boutonAnnuler(page)).toBeDisabled();

  // Modification d'un lien par son dialogue.
  const p = await pointLien(page, m.a.id);
  await page.mouse.click(p.x, p.y);
  const dl = page.getByRole('dialog', { name: 'Modifier la dépendance' });
  await dl.getByLabel('Délai').fill('2');
  await dl.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dl).toHaveCount(0);
  await expect(boutonAnnuler(page)).toBeDisabled();

  // Un geste, puis un dialogue : une annulation ne défait que le geste.
  await glisser(page, barre(page, m.a.id), PX_JOUR);
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(1);
  await modifierPriorite('700');
  await boutonAnnuler(page).click();
  await expect(annonce(page)).toBeVisible();
  await expect(boutonAnnuler(page)).toBeDisabled();
  expect(patchsDe(e, m.a.id).map((x) => x.corps)).toEqual([
    { debut_valide: '2027-01-12' },
    { debut_valide: '2027-01-11' },
  ]);
  const b = await request.get(`/api/projets/${m.projet.id}/activites`);
  const prio = ((await b.json()) as { id: number; priorite: number }[]).find(
    (x) => x.id === m.b.id,
  )!.priorite;
  expect(prio).toBe(700);
  expect((await dependancesBase(request, m.projet.id))[0]!.delai).toBe(2);
});

test('E2E-272-r1 : une annulation à la fois : inverse retenu, Ctrl+Z deux fois et un clic : une seule requête', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E272');
  const e = suivreEcritures(page);
  const reponses = suivreReponsesPatch(page, m.a.id);
  await retarderPatchs(page, m.a.id);
  await ouvrir(page, m);
  // Révision E2E-272-r1 (D-031, D-142 (4)) : réponse du PATCH attendue après chaque glisser.
  await glisser(page, barre(page, m.a.id), PX_JOUR);
  await expect.poll(() => reponses()).toBe(1);
  await glisser(page, barre(page, m.a.id), 2 * PX_JOUR);
  await expect.poll(() => reponses()).toBe(2);
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(2);

  let liberer: () => void = () => undefined;
  const retenu = new Promise<void>((r) => (liberer = r));
  await page.route(`**/api/activites/${m.a.id}`, async (route) => {
    if (route.request().method() === 'PATCH') await retenu;
    await route.continue();
  });
  await calendrier(page).focus();
  await page.keyboard.press('Control+z');
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(3);
  await page.keyboard.press('Control+z');
  await boutonAnnuler(page).click({ force: true });
  await laisserPasser(page);
  await page.waitForTimeout(300);
  expect(patchsDe(e, m.a.id).length).toBe(3);

  liberer();
  await expect(annonce(page)).toBeVisible();
  await expect(boutonAnnuler(page)).toBeEnabled();
  expect((await activiteBase(request, m.projet.id, m.a.id)).debut_valide).toBe('2027-01-12');
});

test('E2E-277-r1 : deux gestes sur la même barre : la première annulation garde le contour du premier geste, la seconde le retire', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E277');
  const e = suivreEcritures(page);
  const reponses = suivreReponsesPatch(page, m.a.id);
  await retarderPatchs(page, m.a.id);
  await ouvrir(page, m);

  // Révision E2E-277-r1 (D-031, D-142 (4)) : réponse du PATCH attendue après chaque glisser.
  await glisser(page, barre(page, m.a.id), PX_JOUR);
  await expect.poll(() => reponses()).toBe(1);
  await expect(contours(page, m.a.id)).toHaveCount(1);
  const x1 = (await contours(page, m.a.id).boundingBox())!.x;
  await glisser(page, barre(page, m.a.id), 2 * PX_JOUR);
  await expect.poll(() => reponses()).toBe(2);
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(2);
  expect((await contours(page, m.a.id).boundingBox())!.x).not.toBe(x1);

  await boutonAnnuler(page).click();
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(3);
  await expect(annonce(page)).toBeVisible();
  await expect
    .poll(async () => (await activiteBase(request, m.projet.id, m.a.id)).debut_valide)
    .toBe('2027-01-12');
  await expect(contours(page, m.a.id)).toHaveCount(1);
  expect((await contours(page, m.a.id).boundingBox())!.x).toBe(x1);

  await boutonAnnuler(page).click();
  await expect.poll(() => patchsDe(e, m.a.id).length).toBe(4);
  await expect
    .poll(async () => (await activiteBase(request, m.projet.id, m.a.id)).debut_valide)
    .toBe('2027-01-11');
  await expect(contours(page, m.a.id)).toHaveCount(0);
  await expect(boutonAnnuler(page)).toBeDisabled();
});
