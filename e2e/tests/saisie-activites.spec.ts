// Saisie des activités (D-222 ; SPEC §6 « Saisie des activités ») : E2E-584 à E2E-606. Base « administrateur
// seul » avant et après chaque test. Données préparées par l'API (sauf E2E-605, tout à l'écran) ; les dialogues sont
// pilotés par l'écran (onglet Planning, puis onglets Gantt pour les effets). Valeurs attendues recopiées de SPEC §6
// « Saisie des activités » et de D-222 ; textes de refus : SPEC §6 « Édition » 12 et « Retouches REX-6 » 2.
// Contrat des écrans (phase verte) :
//   - champ « Activité parente » (liste native) : « Aucune (racine) » (valeur ''), puis « <WBS> <nom> » ;
//   - région « Prédécesseurs » et région « Successeurs » dans « Modifier l’activité » : liste d'éléments (listitem :
//     nom de l'autre élément, libellé du type, « délai N »), boutons « Modifier la dépendance X → Y » et « Supprimer la
//     dépendance X → Y », liste « Prédécesseur à ajouter » ou « Successeur à ajouter », liste « Type », champ
//     « Délai (j) », bouton « Ajouter un prédécesseur » ou « Ajouter un successeur » ;
//   - refus de dépendance : `role="alert"` dans la région.
import { expect, test, type Locator, type Page, type APIRequestContext } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activiteAvec, calculer, jalonAvec, lier, monde3b } from './lot3b-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';
import { confirmation, quitter, rester } from './garde-dialogue-helpers.js';
import { loginAsAdmin } from './helpers.js';
import { allerA, creerProjetParEcran } from './lot3c-helpers.js';
import { cheminCapture } from './captures.js';

test.beforeEach(remettreAdminSeul6b);
test.afterEach(remettreAdminSeul6b);

const RACINE = 'Aucune (racine)';
const T_ASSIGNE = 'Une activité avec des ressources assignées ne peut pas avoir d’enfant.';
const T_HIERARCHIE = 'Une dépendance relie cet élément à l’une de ses activités parentes.';
const FD = 'Fin → début (FD)';
const DD = 'Début → début (DD)';
const FF = 'Fin → fin (FF)';
const AIDES: Record<string, string> = {
  [FD]: 'Le successeur commence après la fin du prédécesseur.',
  [DD]: 'Le successeur commence après le début du prédécesseur.',
  [FF]: 'Le successeur finit après la fin du prédécesseur.',
};

interface Ligne {
  id: number;
  type: 'activite' | 'jalon';
  parent_id: number | null;
  rang: number;
  wbs: string;
  nom: string;
}
interface Dep {
  id: number;
  predecesseur_id: number;
  successeur_id: number;
  type: string;
  delai: number;
}

const lire = async <T>(request: APIRequestContext, chemin: string): Promise<T> => {
  const r = await request.get(chemin);
  expect(r.ok(), `GET ${chemin} : ${r.status()}`).toBeTruthy();
  return (await r.json()) as T;
};
const lignesDe = (request: APIRequestContext, id: number) =>
  lire<Ligne[]>(request, `/api/projets/${id}/planning`);
const depsDe = (request: APIRequestContext, id: number) =>
  lire<Dep[]>(request, `/api/projets/${id}/dependances`);
const ligne = (lignes: Ligne[], nom: string) => lignes.find((l) => l.nom === nom)!;
/** État complet lu par l'API (administrateur) : sert à prouver qu'un refus n'a rien écrit. */
async function etat(request: APIRequestContext, id: number): Promise<string> {
  const parties = await Promise.all(
    ['planning', 'activites', 'jalons', 'dependances', 'historique'].map((p) =>
      lire<unknown>(request, `/api/projets/${id}/${p}`),
    ),
  );
  return JSON.stringify(parties);
}

async function ouvrirPlanning(page: Page, projetId: number, email: string) {
  await connecterAvec(page, email);
  await page.goto(`/projets/${projetId}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
}
const dlgActivite = (page: Page) => page.getByRole('dialog', { name: 'Modifier l’activité' });
const dlgJalon = (page: Page) => page.getByRole('dialog', { name: 'Modifier le jalon' });

async function ouvrirModif(page: Page, nom: string, jalon = false) {
  await page.getByRole('button', { name: `Modifier ${nom}`, exact: true }).click();
  const d = jalon ? dlgJalon(page) : dlgActivite(page);
  await expect(d).toBeVisible();
  await expect(d.getByLabel('Activité parente', { exact: true })).toBeVisible();
  return d;
}
const parentDe = (d: Locator) => d.getByLabel('Activité parente', { exact: true });
const libelles = (liste: Locator) => liste.locator('option').allTextContents();

/** Choisit dans une liste comme un utilisateur : clic d'abord (la garde de D-188 prend sa référence au premier geste). */
async function choisir(liste: Locator, option: { label: string } | { value: string }) {
  await liste.click();
  await liste.selectOption(option);
  await liste.blur();
}

/** Corps et URL des requêtes d'écriture de l'API émises par la page, dans l'ordre. */
function espionner(page: Page) {
  const vues: { methode: string; url: string; corps: Record<string, unknown> | null }[] = [];
  page.on('request', (r) => {
    if (r.method() === 'GET' || !r.url().includes('/api/')) return;
    vues.push({
      methode: r.method(),
      url: new URL(r.url()).pathname,
      corps: r.postData() ? (JSON.parse(r.postData()!) as Record<string, unknown>) : null,
    });
  });
  return vues;
}

/** Monde « arbo » : 1 A ; 1.1 A1 ; 1.1.1 A1a ; 2 B ; 2.1 B1 ; jalon J sous B (2.2). */
async function mondeArbo(request: APIRequestContext, suffixe: string, ressources: string[] = []) {
  const m = await monde3b(request, suffixe, ressources);
  const p = m.projet.id;
  const a = await activiteAvec(request, p, 'A');
  const a1 = await activiteAvec(request, p, 'A1', { parent_id: a.id });
  const a1a = await activiteAvec(request, p, 'A1a', { parent_id: a1.id });
  const b = await activiteAvec(request, p, 'B');
  const b1 = await activiteAvec(request, p, 'B1', { parent_id: b.id });
  const j = await jalonAvec(request, p, 'J', { parent_id: b.id });
  return { ...m, p, a, a1, a1a, b, b1, j };
}

// ---------------------------------------------------------------- règle 1 : activité parente

test('E2E-584 : « Nouvelle activité » : liste « Activité parente » (racine, puis WBS), parent choisi à la création, dernier de sa fratrie', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E584');
  await ouvrirPlanning(page, m.p, m.emailChef);
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Nouvelle activité' });
  await expect(parentDe(d)).toHaveValue('');
  expect(await libelles(parentDe(d))).toEqual([
    RACINE,
    '1 A',
    '1.1 A1',
    '1.1.1 A1a',
    '2 B',
    '2.1 B1',
  ]);
  await d.getByLabel('Nom', { exact: true }).fill('Nouvelle fille de B');
  await choisir(parentDe(d), { label: '2 B' });
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d).toHaveCount(0);
  const l = ligne(await lignesDe(request, m.p), 'Nouvelle fille de B');
  expect(l.parent_id).toBe(m.b.id);
  expect(l.rang).toBe(3); // B1, J, puis la nouvelle (fratrie d'activités et de jalons)
  expect(l.wbs).toBe('2.3');
  await expect(page.getByRole('row', { name: /2\.3 Nouvelle fille de B/ })).toBeVisible();
});

test('E2E-585 : « Nouveau jalon » : même liste ; parent choisi à la création, dernier de sa fratrie', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E585');
  await ouvrirPlanning(page, m.p, m.emailChef);
  await page.getByRole('button', { name: 'Nouveau jalon', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Nouveau jalon' });
  expect(await libelles(parentDe(d))).toEqual([
    RACINE,
    '1 A',
    '1.1 A1',
    '1.1.1 A1a',
    '2 B',
    '2.1 B1',
  ]);
  await d.getByLabel('Nom', { exact: true }).fill('Jalon de A');
  await choisir(parentDe(d), { label: '1 A' });
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d).toHaveCount(0);
  const l = ligne(await lignesDe(request, m.p), 'Jalon de A');
  expect(l.type).toBe('jalon');
  expect(l.parent_id).toBe(m.a.id);
  expect(l.wbs).toBe('1.2');
  await expect(page.getByRole('row', { name: /1\.2 Jalon de A/ })).toBeVisible();
});

test('E2E-586 : « Ajouter une sous-activité » préremplit l’activité parente ; création sous ce parent', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E586');
  await ouvrirPlanning(page, m.p, m.emailChef);
  await page.getByRole('button', { name: 'Ajouter une sous-activité à B', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Nouvelle sous-activité' });
  await expect(parentDe(d)).toHaveValue(String(m.b.id));
  await d.getByLabel('Nom', { exact: true }).fill('Sous B');
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d).toHaveCount(0);
  const l = ligne(await lignesDe(request, m.p), 'Sous B');
  expect(l.parent_id).toBe(m.b.id);
  expect(l.wbs).toBe('2.3');
});

test('E2E-587 : « Modifier » : la liste exclut l’élément et ses descendants ; parent actuel présélectionné ; jalon : toutes les activités', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E587');
  await ouvrirPlanning(page, m.p, m.emailChef);
  let d = await ouvrirModif(page, 'A1');
  await expect(parentDe(d)).toHaveValue(String(m.a.id));
  expect(await libelles(parentDe(d))).toEqual([RACINE, '1 A', '2 B', '2.1 B1']);
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(d).toHaveCount(0);
  d = await ouvrirModif(page, 'A');
  await expect(parentDe(d)).toHaveValue('');
  expect(await libelles(parentDe(d))).toEqual([RACINE, '2 B', '2.1 B1']);
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(d).toHaveCount(0);
  d = await ouvrirModif(page, 'J', true);
  await expect(parentDe(d)).toHaveValue(String(m.b.id));
  expect(await libelles(parentDe(d))).toEqual([
    RACINE,
    '1 A',
    '1.1 A1',
    '1.1.1 A1a',
    '2 B',
    '2.1 B1',
  ]);
});

test('E2E-588 : parent changé en modification : /deplacer puis PATCH, WBS dans le Planning et dans le Gantt, position en dernier', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E588');
  await ouvrirPlanning(page, m.p, m.emailChef);
  const vues = espionner(page);
  const d = await ouvrirModif(page, 'A1');
  await d.getByLabel('Nom', { exact: true }).fill('A1 déplacée');
  await choisir(parentDe(d), { label: '2 B' });
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d).toHaveCount(0);
  expect(vues.map((v) => `${v.methode} ${v.url}`)).toEqual([
    `POST /api/elements/${m.a1.id}/deplacer`,
    `PATCH /api/activites/${m.a1.id}`,
  ]);
  expect(vues[0]!.corps).toEqual({ parent_id: m.b.id });
  const lignes = await lignesDe(request, m.p);
  const l = ligne(lignes, 'A1 déplacée');
  expect(l.parent_id).toBe(m.b.id);
  expect(l.rang).toBe(3);
  expect(l.wbs).toBe('2.3');
  expect(ligne(lignes, 'A1a').wbs).toBe('2.3.1');
  await expect(page.getByRole('row', { name: /2\.3 A1 déplacée/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Gantt' }).click();
  const tableau = page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
  await expect(tableau.locator('tbody tr').filter({ hasText: 'A1 déplacée' })).toContainText('2.3');
  await expect(tableau.locator('tbody tr').filter({ hasText: 'A1a' })).toContainText('2.3.1');
});

test('E2E-589 : « Aucune (racine) » en modification d’une activité puis d’un jalon : parent null, dernier de la racine', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E589');
  await ouvrirPlanning(page, m.p, m.emailChef);
  const vues = espionner(page);
  let d = await ouvrirModif(page, 'A1');
  await choisir(parentDe(d), { label: RACINE });
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d).toHaveCount(0);
  expect(vues[0]!.corps).toEqual({ parent_id: null });
  let lignes = await lignesDe(request, m.p);
  expect(ligne(lignes, 'A1')).toMatchObject({ parent_id: null, rang: 3, wbs: '3' });
  d = await ouvrirModif(page, 'J', true);
  await choisir(parentDe(d), { label: RACINE });
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d).toHaveCount(0);
  lignes = await lignesDe(request, m.p);
  expect(ligne(lignes, 'J')).toMatchObject({ parent_id: null, rang: 4, wbs: '4' });
  await expect(page.getByRole('row', { name: /^4 J/ })).toBeVisible();
});

test('E2E-590 : parent inchangé : aucun appel à /deplacer, seul le PATCH part', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E590');
  await ouvrirPlanning(page, m.p, m.emailChef);
  const vues = espionner(page);
  const d = await ouvrirModif(page, 'A1');
  await d.getByLabel('Nom', { exact: true }).fill('A1 renommée');
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d).toHaveCount(0);
  expect(vues.map((v) => `${v.methode} ${v.url}`)).toEqual([`PATCH /api/activites/${m.a1.id}`]);
  const l = ligne(await lignesDe(request, m.p), 'A1 renommée');
  expect(l.parent_id).toBe(m.a.id);
});

test('E2E-591 : refus parent_assigne : alerte dans le dialogue ouvert, rien d’enregistré, base inchangée', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E591', ['Alice']);
  await m.api.assignation(m.b1.id, m.gens.Alice!.id, 2);
  const avant = await etat(request, m.p);
  await ouvrirPlanning(page, m.p, m.emailChef);
  const d = await ouvrirModif(page, 'A1');
  await d.getByLabel('Nom', { exact: true }).fill('Ne doit pas passer');
  await choisir(parentDe(d), { label: '2.1 B1' });
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d.getByRole('alert')).toHaveText(T_ASSIGNE);
  await expect(d).toBeVisible();
  expect(await etat(request, m.p)).toBe(avant);
});

test('E2E-592 : refus dependance_hierarchie : alerte dans le dialogue, base inchangée', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E592');
  await lier(request, m.p, m.a1.id, m.b.id);
  const avant = await etat(request, m.p);
  await ouvrirPlanning(page, m.p, m.emailChef);
  const d = await ouvrirModif(page, 'A1');
  await d.getByLabel('Nom', { exact: true }).fill('Ne doit pas passer');
  await choisir(parentDe(d), { label: '2 B' });
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d.getByRole('alert')).toHaveText(T_HIERARCHIE);
  await expect(d).toBeVisible();
  expect(await etat(request, m.p)).toBe(avant);
});

test('E2E-593 : PATCH refusé après un déplacement réussi : message « déplacement fait, champs non enregistrés », pas de second déplacement', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E593');
  await ouvrirPlanning(page, m.p, m.emailChef);
  const vues = espionner(page);
  await page.route(`**/api/activites/${m.a1.id}`, (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ erreur: 'Règle de planning non respectée' }),
        })
      : route.continue(),
  );
  const d = await ouvrirModif(page, 'A1');
  await d.getByLabel('Nom', { exact: true }).fill('Nom refusé');
  await choisir(parentDe(d), { label: '2 B' });
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  const alerte = d.getByRole('alert');
  await expect(alerte).toContainText(/déplacement est fait/);
  await expect(alerte).toContainText(/pas enregistrés/);
  await expect(d).toBeVisible();
  let lignes = await lignesDe(request, m.p);
  expect(ligne(lignes, 'A1').parent_id).toBe(m.b.id);
  expect(ligne(lignes, 'A1').nom).toBe('A1');
  // nouvel essai, PATCH accepté : le déplacement n'est pas refait
  await page.unroute(`**/api/activites/${m.a1.id}`);
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d).toHaveCount(0);
  expect(vues.filter((v) => v.url.endsWith('/deplacer'))).toHaveLength(1);
  lignes = await lignesDe(request, m.p);
  expect(ligne(lignes, 'Nom refusé').parent_id).toBe(m.b.id);
});

test('E2E-594 : jalon : déplacement par « Modifier le jalon » ; refus dependance_hierarchie : alerte, base inchangée', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E594');
  await ouvrirPlanning(page, m.p, m.emailChef);
  let d = await ouvrirModif(page, 'J', true);
  await choisir(parentDe(d), { label: '1 A' });
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d).toHaveCount(0);
  expect(ligne(await lignesDe(request, m.p), 'J')).toMatchObject({
    parent_id: m.a.id,
    wbs: '1.2',
  });
  // J (sous A) est lié à B : le remettre sous B relierait J à son ancêtre
  await lier(request, m.p, m.j.id, m.b.id);
  const avant = await etat(request, m.p);
  d = await ouvrirModif(page, 'J', true);
  await choisir(parentDe(d), { label: '2 B' });
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d.getByRole('alert')).toHaveText(T_HIERARCHIE);
  await expect(d).toBeVisible();
  expect(await etat(request, m.p)).toBe(avant);
});

// ---------------------------------------------------------------- règle 2 : dépendances

const region = (d: Locator, nom: 'Prédécesseurs' | 'Successeurs') =>
  d.getByRole('region', { name: nom, exact: true });
const listeAjout = (r: Locator, sens: 'Prédécesseur' | 'Successeur') =>
  r.getByLabel(`${sens} à ajouter`, { exact: true });
const ajouter = (r: Locator, sens: 'prédécesseur' | 'successeur') =>
  r.getByRole('button', { name: `Ajouter un ${sens}`, exact: true });

/** Monde « dépendances » : Amont (1), T (2), Aval (3), jalon M (4). */
async function mondeDeps(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, []);
  const amont = await activiteAvec(request, m.projet.id, 'Amont');
  const t = await activiteAvec(request, m.projet.id, 'T');
  const aval = await activiteAvec(request, m.projet.id, 'Aval');
  const jm = await jalonAvec(request, m.projet.id, 'M');
  return { ...m, p: m.projet.id, amont, t, aval, jm };
}

test('E2E-595-r1 : prédécesseur ajouté depuis le dialogue : enregistré tout de suite ; section du bas et Gantt à jour', async ({
  page,
  request,
}) => {
  const m = await mondeDeps(request, 'E2E595');
  await calculer(request, [m.p]); // les liens ne se dessinent qu'après un calcul
  await ouvrirPlanning(page, m.p, m.emailChef);
  const d = await ouvrirModif(page, 'T');
  const r = region(d, 'Prédécesseurs');
  await choisir(listeAjout(r, 'Prédécesseur'), { label: '1 Amont' });
  await choisir(r.getByLabel('Type', { exact: true }), { label: DD });
  await r.getByLabel('Délai (j)', { exact: true }).fill('2');
  await ajouter(r, 'prédécesseur').click();
  const rangee = r.getByRole('listitem').filter({ hasText: 'Amont' });
  await expect(rangee).toContainText(DD);
  await expect(rangee).toContainText('délai 2');
  // enregistré tout de suite : le dialogue est encore ouvert
  await expect(d).toBeVisible();
  expect(await depsDe(request, m.p)).toMatchObject([
    { predecesseur_id: m.amont.id, successeur_id: m.t.id, type: 'DD', delai: 2 },
  ]);
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(d).toHaveCount(0);
  const bas = page.getByRole('table', { name: 'Dépendances du projet' });
  await expect(bas.getByRole('row', { name: /Amont.*T.*Début → début \(DD\).*2/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect(page.locator('svg [data-lien-cible]')).toHaveCount(1);
});

test('E2E-596-r1 : successeur ajouté depuis le dialogue (FF, délai −1) : mêmes effets', async ({
  page,
  request,
}) => {
  const m = await mondeDeps(request, 'E2E596');
  await calculer(request, [m.p]); // les liens ne se dessinent qu'après un calcul
  await ouvrirPlanning(page, m.p, m.emailChef);
  const d = await ouvrirModif(page, 'T');
  const r = region(d, 'Successeurs');
  await choisir(listeAjout(r, 'Successeur'), { label: '3 Aval' });
  await choisir(r.getByLabel('Type', { exact: true }), { label: FF });
  await r.getByLabel('Délai (j)', { exact: true }).fill('-1');
  await ajouter(r, 'successeur').click();
  const rangee = r.getByRole('listitem').filter({ hasText: 'Aval' });
  await expect(rangee).toContainText(FF);
  await expect(rangee).toContainText('délai -1');
  expect(await depsDe(request, m.p)).toMatchObject([
    { predecesseur_id: m.t.id, successeur_id: m.aval.id, type: 'FF', delai: -1 },
  ]);
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(d).toHaveCount(0);
  await expect(
    page
      .getByRole('table', { name: 'Dépendances du projet' })
      .getByRole('row', { name: /T.*Aval.*Fin → fin \(FF\).*-1/ }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect(page.locator('svg [data-lien-cible]')).toHaveCount(1);
});

test('E2E-597-r1 : type et délai modifiés depuis le dialogue (prédécesseur puis successeur) : enregistrés tout de suite', async ({
  page,
  request,
}) => {
  const m = await mondeDeps(request, 'E2E597');
  await lier(request, m.p, m.amont.id, m.t.id);
  await lier(request, m.p, m.t.id, m.aval.id);
  await ouvrirPlanning(page, m.p, m.emailChef);
  const d = await ouvrirModif(page, 'T');
  for (const [nom, sens, autre, type, delai] of [
    ['Prédécesseurs', 'Amont → T', 'Amont', FF, '3'],
    ['Successeurs', 'T → Aval', 'Aval', DD, '1'],
  ] as const) {
    const r = region(d, nom);
    await r.getByRole('button', { name: `Modifier la dépendance ${sens}`, exact: true }).click();
    const sous = page.getByRole('dialog', { name: 'Modifier la dépendance' });
    await expect(sous).toBeVisible();
    await choisir(sous.getByLabel('Type', { exact: true }), { label: type });
    await sous.getByLabel('Délai (j)', { exact: true }).fill(delai);
    await sous.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(sous).toHaveCount(0);
    const rangee = r.getByRole('listitem').filter({ hasText: autre });
    await expect(rangee).toContainText(type);
    await expect(rangee).toContainText(`délai ${delai}`);
  }
  await expect(d).toBeVisible();
  expect(await depsDe(request, m.p)).toMatchObject([
    { predecesseur_id: m.amont.id, successeur_id: m.t.id, type: 'FF', delai: 3 },
    { predecesseur_id: m.t.id, successeur_id: m.aval.id, type: 'DD', delai: 1 },
  ]);
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(d).toHaveCount(0);
  const bas = page.getByRole('table', { name: 'Dépendances du projet' });
  await expect(bas.getByRole('row', { name: /Amont.*T.*Fin → fin \(FF\).*3/ })).toBeVisible();
  await expect(bas.getByRole('row', { name: /T.*Aval.*Début → début \(DD\).*1/ })).toBeVisible();
});

test('E2E-598 : dépendance supprimée depuis le dialogue, avec confirmation (Annuler : rien supprimé), prédécesseur puis successeur', async ({
  page,
  request,
}) => {
  const m = await mondeDeps(request, 'E2E598');
  await lier(request, m.p, m.amont.id, m.t.id);
  await lier(request, m.p, m.t.id, m.aval.id);
  await calculer(request, [m.p]);
  await ouvrirPlanning(page, m.p, m.emailChef);
  const d = await ouvrirModif(page, 'T');
  for (const [nom, sens, restantes] of [
    ['Prédécesseurs', 'Amont → T', 1],
    ['Successeurs', 'T → Aval', 0],
  ] as const) {
    const r = region(d, nom);
    await r.getByRole('button', { name: `Supprimer la dépendance ${sens}`, exact: true }).click();
    const conf = page.getByRole('dialog', { name: `Supprimer la dépendance ${sens} ?` });
    await expect(conf).toBeVisible();
    await conf.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(conf).toHaveCount(0);
    expect(await depsDe(request, m.p)).toHaveLength(restantes + 1);
    await r.getByRole('button', { name: `Supprimer la dépendance ${sens}`, exact: true }).click();
    await conf.getByRole('button', { name: 'Supprimer', exact: true }).click();
    await expect(conf).toHaveCount(0);
    await expect(r.getByRole('listitem')).toHaveCount(0);
    expect(await depsDe(request, m.p)).toHaveLength(restantes);
  }
  await expect(d).toBeVisible();
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(d).toHaveCount(0);
  await expect(page.getByText('Aucune dépendance définie.')).toBeVisible();
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect(
    page.getByRole('region', { name: 'Calendrier du Gantt', exact: true }),
  ).toBeVisible();
  await expect(page.locator('svg [data-lien-cible]')).toHaveCount(0);
});

test('E2E-599 : libellés des types et aides identiques à l’onglet Planning, dans les deux sous-sections', async ({
  page,
  request,
}) => {
  const m = await mondeDeps(request, 'E2E599');
  await ouvrirPlanning(page, m.p, m.emailChef);
  const d = await ouvrirModif(page, 'T');
  for (const nom of ['Prédécesseurs', 'Successeurs'] as const) {
    const liste = region(d, nom).getByLabel('Type', { exact: true });
    expect(await libelles(liste)).toEqual([FD, DD, FF]);
    for (const type of [FD, DD, FF]) {
      await choisir(liste, { label: type });
      const id = await liste.getAttribute('aria-describedby');
      await expect(d.locator(`[id="${id}"]`)).toHaveText(AIDES[type]!);
    }
  }
});

test('E2E-600 : éléments proposés : activités et jalons du projet, sans l’activité, ses ancêtres ni ses descendants', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E600', []);
  const p = m.projet.id;
  const a = await activiteAvec(request, p, 'A');
  const a1 = await activiteAvec(request, p, 'A1', { parent_id: a.id });
  await activiteAvec(request, p, 'A1a', { parent_id: a1.id });
  await activiteAvec(request, p, 'B');
  await jalonAvec(request, p, 'J');
  const autre = await monde3b(request, 'E2E600bis', []);
  await activiteAvec(request, autre.projet.id, 'Autre projet');
  await ouvrirPlanning(page, p, m.emailChef);
  const attendu = ['Choisir un élément', '2 B', '3 J'];
  let d = await ouvrirModif(page, 'A1');
  for (const [nom, sens] of [
    ['Prédécesseurs', 'Prédécesseur'],
    ['Successeurs', 'Successeur'],
  ] as const) {
    expect(await libelles(listeAjout(region(d, nom), sens))).toEqual(attendu);
  }
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(d).toHaveCount(0);
  d = await ouvrirModif(page, 'A'); // activité parente : sections présentes, mêmes règles
  for (const [nom, sens] of [
    ['Prédécesseurs', 'Prédécesseur'],
    ['Successeurs', 'Successeur'],
  ] as const) {
    expect(await libelles(listeAjout(region(d, nom), sens))).toEqual(attendu);
  }
});

test('E2E-601 : refus de cycle et de doublon depuis le dialogue : alerte, liste inchangée, dialogue ouvert, base inchangée', async ({
  page,
  request,
}) => {
  const m = await mondeDeps(request, 'E2E601');
  await lier(request, m.p, m.amont.id, m.t.id);
  await lier(request, m.p, m.aval.id, m.amont.id);
  const avant = await etat(request, m.p);
  await ouvrirPlanning(page, m.p, m.emailChef);
  const d = await ouvrirModif(page, 'T');
  // cycle : T → Aval alors que Aval → Amont → T
  const s = region(d, 'Successeurs');
  await choisir(listeAjout(s, 'Successeur'), { label: '3 Aval' });
  await ajouter(s, 'successeur').click();
  await expect(s.getByRole('alert')).toContainText('règle du planning');
  await expect(s.getByRole('listitem')).toHaveCount(0);
  await expect(d).toBeVisible();
  expect(await etat(request, m.p)).toBe(avant);
  // doublon : Amont → T existe déjà
  const p = region(d, 'Prédécesseurs');
  await choisir(listeAjout(p, 'Prédécesseur'), { label: '1 Amont' });
  await ajouter(p, 'prédécesseur').click();
  await expect(p.getByRole('alert')).toHaveText('Cette dépendance existe déjà.');
  await expect(p.getByRole('listitem')).toHaveCount(1);
  await expect(d).toBeVisible();
  expect(await etat(request, m.p)).toBe(avant);
});

test('E2E-602 : garde D-188 : un ajout de dépendance saisi mais non envoyé compte comme une modification', async ({
  page,
  request,
}) => {
  const m = await mondeDeps(request, 'E2E602');
  await ouvrirPlanning(page, m.p, m.emailChef);
  const d = await ouvrirModif(page, 'T');
  const liste = listeAjout(region(d, 'Prédécesseurs'), 'Prédécesseur');
  // saisie puis restauration : confirmation après la saisie, aucune après la restauration
  await choisir(liste, { label: '1 Amont' });
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
  await rester(page).click();
  await expect(d).toBeVisible();
  await choisir(liste, { value: '' });
  await page.keyboard.press('Escape');
  await expect(d).toHaveCount(0);
  // saisie, puis abandon : rien en base
  const d2 = await ouvrirModif(page, 'T');
  await choisir(listeAjout(region(d2, 'Prédécesseurs'), 'Prédécesseur'), { label: '1 Amont' });
  await page.keyboard.press('Escape');
  await quitter(page).click();
  await expect(d2).toHaveCount(0);
  expect(await depsDe(request, m.p)).toEqual([]);
});

test('E2E-603 : ni sous-sections de dépendances dans « Nouvelle activité » ni dans « Modifier le jalon » ; « Activité parente » présente', async ({
  page,
  request,
}) => {
  const m = await mondeDeps(request, 'E2E603');
  await ouvrirPlanning(page, m.p, m.emailChef);
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const c = page.getByRole('dialog', { name: 'Nouvelle activité' });
  await expect(parentDe(c)).toBeVisible();
  await expect(c.getByRole('region', { name: 'Prédécesseurs', exact: true })).toHaveCount(0);
  await expect(c.getByRole('region', { name: 'Successeurs', exact: true })).toHaveCount(0);
  await c.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(c).toHaveCount(0);
  const j = await ouvrirModif(page, 'M', true);
  await expect(parentDe(j)).toBeVisible();
  await expect(j.getByRole('region', { name: 'Prédécesseurs', exact: true })).toHaveCount(0);
  await expect(j.getByRole('region', { name: 'Successeurs', exact: true })).toHaveCount(0);
});

// ---------------------------------------------------------------- règle 3 : activité parente

test('E2E-604-r1 : activité parente : mode et dates validées absents et non envoyés, valeurs gardées en base ; dates planifiées en lecture seule', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E604', []);
  const p = m.projet.id;
  const a = await activiteAvec(request, p, 'Parente', {
    mode: 'REGUL',
    debut_valide: '2027-01-11',
    fin_valide: '2027-01-15',
  });
  const f = await activiteAvec(request, p, 'Feuille', { mode: 'ASAP' });
  await activiteAvec(request, p, 'Fille', { parent_id: a.id });
  await ouvrirPlanning(page, p, m.emailChef);
  const vues = espionner(page);
  let d = await ouvrirModif(page, 'Parente');
  for (const libelle of [
    'Mode de planification',
    'Début validé',
    'Fin validée',
    'Durée validée (j)',
  ]) {
    await expect(d.getByLabel(libelle, { exact: true }), libelle).toHaveCount(0);
  }
  await expect(d.locator('[data-planifie="debut"]')).toBeVisible();
  await expect(d.locator('[data-planifie="fin"]')).toBeVisible();
  await d.getByLabel('Nom', { exact: true }).fill('Parente renommée');
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d).toHaveCount(0);
  const patch = vues.find((v) => v.methode === 'PATCH' && v.url === `/api/activites/${a.id}`)!;
  for (const cle of ['mode', 'debut_valide', 'fin_valide', 'duree_validee']) {
    expect(Object.keys(patch.corps!), cle).not.toContain(cle);
  }
  const apres = (
    await lire<
      { id: number; nom: string; mode: string; debut_valide: string; fin_valide: string }[]
    >(request, `/api/projets/${p}/activites`)
  ).find((x) => x.id === a.id)!;
  expect(apres).toMatchObject({
    nom: 'Parente renommée',
    mode: 'REGUL',
    debut_valide: '2027-01-11',
    fin_valide: '2027-01-15',
  });
  // une feuille garde ses champs
  d = await ouvrirModif(page, 'Feuille');
  await expect(d.getByLabel('Mode de planification', { exact: true })).toHaveValue('ASAP');
  await expect(d.getByLabel('Durée validée (j)', { exact: true })).toBeVisible();
  expect(f.id).toBeGreaterThan(0);
});

// ---------------------------------------------------------------- parcours complet, captures

test('E2E-605 : parcours complet à l’écran (administrateur seul) : sous-activité par le champ « Activité parente », puis dépendance par le dialogue', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await creerProjetParEcran(page, 'SAA-605', 'Projet SAA-605');
  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet SAA-605' }).click();
  await expect(page.getByRole('heading', { name: 'Projet SAA-605', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning' }).click();

  for (const nom of ['Phase 605', 'Autre 605']) {
    await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
    const c = page.getByRole('dialog', { name: 'Nouvelle activité' });
    await c.getByLabel('Nom', { exact: true }).fill(nom);
    await c.getByRole('button', { name: 'Créer', exact: true }).click();
    await expect(page.getByRole('row', { name: new RegExp(nom) })).toBeVisible();
  }
  // sous-activité par le champ « Activité parente » (et non par le bouton de ligne)
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const c = page.getByRole('dialog', { name: 'Nouvelle activité' });
  await c.getByLabel('Nom', { exact: true }).fill('Tâche 605');
  await choisir(parentDe(c), { label: '1 Phase 605' });
  await c.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(page.getByRole('row', { name: /1\.1 Tâche 605/ })).toBeVisible();

  // dépendance par le dialogue
  const d = await ouvrirModif(page, 'Tâche 605');
  const r = region(d, 'Prédécesseurs');
  await choisir(listeAjout(r, 'Prédécesseur'), { label: '2 Autre 605' });
  await ajouter(r, 'prédécesseur').click();
  await expect(r.getByRole('listitem').filter({ hasText: 'Autre 605' })).toBeVisible();
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(d).toHaveCount(0);
  await expect(
    page
      .getByRole('table', { name: 'Dépendances du projet' })
      .getByRole('row', { name: /Autre 605.*Tâche 605/ }),
  ).toBeVisible();
  const projetId = Number(new URL(page.url()).pathname.split('/')[2]);
  await calculer(page.request, [projetId]); // les liens ne se dessinent qu'après un calcul
  await page.reload();
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect(page.locator('svg [data-lien-cible]')).toHaveCount(1);
});

test('E2E-606 : captures sans assertion de valeur (dialogues d’activité avec parent et dépendances, activité parente)', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E606');
  await lier(request, m.p, m.b.id, m.a1.id);
  await lier(request, m.p, m.a1.id, m.b1.id, 'DD');
  await ouvrirPlanning(page, m.p, m.emailChef);
  for (const largeur of [1440, 1024]) {
    await page.setViewportSize({ width: largeur, height: 1000 });
    for (const [nom, suffixe] of [
      ['A1', 'feuille'],
      ['A', 'parente'],
    ] as const) {
      const d = await ouvrirModif(page, nom);
      await page.screenshot({
        path: cheminCapture(`saisie-activites-${suffixe}-${largeur}.png`),
      });
      await d.getByRole('button', { name: 'Annuler', exact: true }).click();
      await expect(d).toHaveCount(0);
    }
  }
});
