// Lot 6d (D-154, SPEC « Plan de charge (lot 6d, D-154) ») : E2E-368 à E2E-376.
// Base « administrateur seul » avant et après chaque test. Valeurs recopiées de D-154.
// Données : D0 = 2027-01-04 (calcul par l'API) ; capacité 1, calendrier par défaut : janvier 2027 = 21 j ouvrés.
// Une assignation de 4 j posée à partir du 04/01 occupe janvier ; adresse `/plan-de-charge?debut=2027-01`.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { MOT_DE_PASSE, connecterAvec, preparer } from './lot1-helpers.js';
import { activiteAvec, calculer } from './lot3b-helpers.js';
import { allerA, ouvrirCalendriers, ouvrirEquipes } from './lot3c-helpers.js';
import { equipeApi, creerEquipeParEcran, nav, utilisateurApi } from './lot6a-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';

const FLAG = 'rgb(190, 18, 60)';
const ADRESSE = '/plan-de-charge?debut=2027-01';
const MOIS = Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, '0')}/2027`);

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

const titrePlan = (page: Page) => page.getByRole('heading', { name: 'Pilotage', level: 1 });
const regionPlan = (page: Page) => page.getByRole('region', { name: 'Plan de charge' });
const tableauPlan = (page: Page) => page.getByRole('table', { name: 'Plan de charge' });
const lignes = (page: Page) => tableauPlan(page).locator('tbody tr');
const ligne = (page: Page, nom: string) => lignes(page).filter({ hasText: nom });
/** Cellules d'une ligne : 0 = Ressource, 1 à 12 = mois. */
const cellules = (l: Locator) => l.locator('th, td');
const listeEquipe = (page: Page) => page.getByLabel('Équipe', { exact: true });
const champMois = (page: Page) => page.getByLabel('Mois de départ');
const enteteMois = async (page: Page) =>
  (await tableauPlan(page).getByRole('columnheader').allTextContents()).map((t) => t.trim());

/** Valeur de l'attribut `title` de la cellule ou de l'un de ses descendants. */
const titreDe = (cellule: Locator): Promise<string | null> =>
  cellule.evaluate((el) => {
    for (const e of [el, ...Array.from(el.querySelectorAll('[title]'))]) {
      const t = e.getAttribute('title');
      if (t) return t;
    }
    return null;
  });

/** Couleur de l'élément qui porte le texte exact `texte` (la cellule ou un descendant). */
const couleurDuTexte = (cellule: Locator, texte: string): Promise<string | null> =>
  cellule.evaluate((el, t) => {
    const cible = [el, ...Array.from(el.querySelectorAll('*'))].find((e) =>
      Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim() === t),
    );
    return cible ? getComputedStyle(cible).color : null;
  }, texte);

interface Monde {
  api: Awaited<ReturnType<typeof preparer>>;
  chef: { id: number };
  alice: { id: number };
  p1: { id: number };
  p2: { id: number };
}

/** Alice, affectée à deux projets : 4 j (« PDC1 ») et 2 j (« PDC2 »), planifiés en janvier 2027. */
async function monde(request: APIRequestContext): Promise<Monde> {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 6D', 'chef-6d@lot6d.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice 6D', 'alice-6d@lot6d.test', 'ressource', true);
  const p1 = await api.projet('PDC1', 'Projet plan un', chef.id);
  const p2 = await api.projet('PDC2', 'Projet plan deux', chef.id);
  for (const [p, jours, nom] of [
    [p1, 4, 'Tâche un'],
    [p2, 2, 'Tâche deux'],
  ] as const) {
    await api.affectation(p.id, alice.id);
    const a = await activiteAvec(request, p.id, nom);
    await api.assignation(a.id, alice.id, jours);
  }
  await calculer(request, [p1.id, p2.id]);
  return { api, chef, alice, p1, p2 };
}

test('E2E-368-r1 : entrée « Plan de charge » juste après « Projets » (administrateur, chef de projet), absente de la ressource ; le clic ouvre l’écran', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef 368', 'chef-368@lot6d.test', 'chef_de_projet');
  await api.utilisateur('Ressource 368', 'ressource-368@lot6d.test', 'ressource', true);

  await loginAsAdmin(page);
  for (const role of ['administrateur', 'chef']) {
    const noms = (await nav(page).getByRole('link').allTextContents()).map((t) => t.trim());
    expect(noms.indexOf('Pilotage'), `${role} : ${noms.join(', ')}`).toBe(
      noms.indexOf('Projets') + 1,
    );
    await nav(page).getByRole('link', { name: 'Pilotage', exact: true }).click();
    await expect(page).toHaveURL(/\/pilotage/);
    await expect(titrePlan(page)).toBeVisible();
    if (role === 'administrateur') {
      await page.context().clearCookies();
      await connecterAvec(page, 'chef-368@lot6d.test');
    }
  }

  await page.context().clearCookies();
  await connecterAvec(page, 'ressource-368@lot6d.test');
  await expect(nav(page).getByRole('link', { name: 'Mes tâches', exact: true })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Pilotage', exact: true })).toHaveCount(0);
});

test('E2E-369 : la ressource qui ouvre /plan-de-charge (avec ou sans paramètres) est redirigée vers /mes-taches, sans requête à /api/plan-de-charge', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Ressource 369', 'ressource-369@lot6d.test', 'ressource', true);
  const appels: string[] = [];
  page.on('request', (r) => {
    const chemin = new URL(r.url()).pathname;
    if (chemin.startsWith('/api/plan-de-charge')) appels.push(chemin);
  });
  await connecterAvec(page, 'ressource-369@lot6d.test');
  await expect(page).toHaveURL('/mes-taches');
  for (const adresse of ['/plan-de-charge', '/plan-de-charge?debut=2027-01&equipe=aucune']) {
    await page.goto(adresse);
    await expect(page, adresse).toHaveURL('/mes-taches');
    await expect(
      page.getByRole('heading', { name: 'Mes tâches', level: 1 }),
      adresse,
    ).toBeVisible();
  }
  expect(appels).toEqual([]);
});

test('E2E-370-r1 : tableau « Plan de charge » : colonnes, ligne repliée par défaut, cellule et title, dépliage des projets, « 0 », lecture seule', async ({
  page,
  request,
}) => {
  await monde(request);
  await loginAsAdmin(page);
  await page.goto(ADRESSE);
  await expect(titrePlan(page)).toBeVisible();
  await expect(tableauPlan(page)).toBeVisible();
  expect(await enteteMois(page)).toEqual(['Ressource', ...MOIS]);

  await expect(lignes(page)).toHaveCount(1);
  const alice = ligne(page, 'Alice 6D');
  await expect(cellules(alice).first()).toContainText('Alice 6D');
  await expect(cellules(alice).first()).not.toContainText('(inactif)');
  await expect(page.getByRole('button', { name: 'Déplier Alice 6D' })).toBeVisible();
  await expect(ligne(page, 'PDC1')).toHaveCount(0);
  await expect(ligne(page, 'PDC2')).toHaveCount(0);

  // Janvier : charge 6 (4 + 2), disponible 21, écart 15 ; février sans charge : « 0 ».
  await expect(cellules(alice).nth(1)).toContainText('6');
  expect(await titreDe(cellules(alice).nth(1))).toBe('Charge 6 j, disponible 21 j, écart 15 j');
  await expect(cellules(alice).nth(2)).toHaveText('0');

  await page.getByRole('button', { name: 'Déplier Alice 6D' }).click();
  await expect(page.getByRole('button', { name: 'Replier Alice 6D' })).toBeVisible();
  await expect(lignes(page)).toHaveCount(3);
  const p1 = ligne(page, 'PDC1 · Projet plan un');
  const p2 = ligne(page, 'PDC2 · Projet plan deux');
  await expect(cellules(p1).first()).toHaveText('PDC1 · Projet plan un');
  await expect(cellules(p1).nth(1)).toHaveText('4');
  await expect(cellules(p2).nth(1)).toHaveText('2');
  await expect(cellules(p1).nth(2)).toHaveText('0');

  // Lecture seule : aucun champ dans le tableau, seuls boutons « Déplier » et « Replier ».
  await expect(tableauPlan(page).locator('input, select, textarea')).toHaveCount(0);
  const boutons = await tableauPlan(page).getByRole('button').allTextContents();
  for (const b of boutons) expect(b.trim()).toMatch(/^(Déplier|Replier) /);

  await page.getByRole('button', { name: 'Replier Alice 6D' }).click();
  await expect(lignes(page)).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Déplier Alice 6D' })).toBeVisible();
});

test('E2E-371 : écart négatif : cellule en couleur flag, title, texte « , surcharge » réservé aux lecteurs d’écran', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 371', 'chef-371@lot6d.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice 371', 'alice-371@lot6d.test', 'ressource', true);
  // Révision D-163 (1) : calendrier propre (lundi à vendredi par défaut), jamais le calendrier par défaut.
  const calendrier = await api.calendrier('Cal 371');
  const rattache = await request.patch(`/api/utilisateurs/${alice.id}`, {
    data: { calendrier_id: calendrier.id },
  });
  expect(rattache.ok(), `PATCH calendrier d'Alice 371 : ${rattache.status()}`).toBeTruthy();
  const p = await api.projet('PDC371', 'Projet 371', chef.id);
  await api.affectation(p.id, alice.id);
  const a = await activiteAvec(request, p.id, 'Tâche 371');
  await api.assignation(a.id, alice.id, 20);
  await calculer(request, [p.id]);
  // Deux fériés ajoutés après le calcul : janvier passe de 21 à 19 j disponibles, 20 j restent planifiés.
  await api.ferie(calendrier.id, '2027-01-12', 'Férié un');
  await api.ferie(calendrier.id, '2027-01-13', 'Férié deux');

  await loginAsAdmin(page);
  await page.goto(ADRESSE);
  const cellule = cellules(ligne(page, 'Alice 371')).nth(1);
  await expect(cellule).toContainText('20');
  expect(await titreDe(cellule)).toBe('Charge 20 j, disponible 19 j, écart −1 j');
  expect(await couleurDuTexte(cellule, '20')).toBe(FLAG);
  await expect(cellule).toContainText(', surcharge');
  const sr = cellule.locator('span', { hasText: ', surcharge' });
  const boite = await sr.first().boundingBox();
  expect(
    boite === null || (boite.width <= 1 && boite.height <= 1),
    'texte réservé aux lecteurs',
  ).toBe(true);

  const fevrier = cellules(ligne(page, 'Alice 371')).nth(2);
  await expect(fevrier).toHaveText('0');
  expect(await titreDe(fevrier)).toBe('Charge 0 j, disponible 20 j, écart 20 j');
  await expect(fevrier).not.toContainText('surcharge');
  expect(await couleurDuTexte(fevrier, '0')).not.toBe(FLAG);
});

test('E2E-372 : filtres Équipe et mois, boutons, adresse qui suit les filtres, valeur invalide corrigée sans rechargement', async ({
  page,
  request,
}) => {
  await preparer(request);
  const zeta = await equipeApi(request, 'Zeta 6D');
  const alpha = await equipeApi(request, 'Alpha 6D');
  await utilisateurApi(request, 'Alice 372', 'alice-372@lot6d.test', alpha);
  await utilisateurApi(request, 'Bob 372', 'bob-372@lot6d.test', zeta);
  await utilisateurApi(request, 'Carl 372', 'carl-372@lot6d.test');

  await loginAsAdmin(page);
  await page.goto(ADRESSE);
  await expect(tableauPlan(page)).toBeVisible();
  expect(await listeEquipe(page).locator('option').allTextContents()).toEqual([
    'Toutes',
    'Sans équipe',
    'Alpha 6D',
    'Zeta 6D',
  ]);
  await expect(lignes(page)).toHaveCount(3);

  await listeEquipe(page).selectOption({ label: 'Alpha 6D' });
  await expect(page).toHaveURL(new RegExp(`[?&]equipe=${alpha}(&|$)`));
  await expect(page).toHaveURL(/[?&]debut=2027-01/);
  await expect(lignes(page)).toHaveCount(1);
  await expect(ligne(page, 'Alice 372')).toHaveCount(1);

  await listeEquipe(page).selectOption({ label: 'Sans équipe' });
  await expect(page).toHaveURL(/[?&]equipe=aucune(&|$)/);
  await expect(lignes(page)).toHaveCount(1);
  await expect(ligne(page, 'Carl 372')).toHaveCount(1);

  await listeEquipe(page).selectOption({ label: 'Toutes' });
  await expect(page).not.toHaveURL(/equipe=/);
  await expect(lignes(page)).toHaveCount(3);

  // Mois de départ : champ de type month, boutons précédent et suivant.
  await expect(champMois(page)).toHaveAttribute('type', 'month');
  await expect(champMois(page)).toHaveValue('2027-01');
  await champMois(page).fill('2027-05');
  await expect(page).toHaveURL(/[?&]debut=2027-05/);
  await expect(tableauPlan(page).getByRole('columnheader').nth(1)).toHaveText('05/2027');
  await page.getByRole('button', { name: 'Mois suivant' }).click();
  await expect(page).toHaveURL(/[?&]debut=2027-06/);
  await expect(tableauPlan(page).getByRole('columnheader').nth(1)).toHaveText('06/2027');
  await page.getByRole('button', { name: 'Mois précédent' }).click();
  await page.getByRole('button', { name: 'Mois précédent' }).click();
  await expect(page).toHaveURL(/[?&]debut=2027-04/);
  await expect(champMois(page)).toHaveValue('2027-04');
  await expect(tableauPlan(page).getByRole('columnheader').nth(1)).toHaveText('04/2027');

  // Valeur invalide : défauts, adresse corrigée sans rechargement (le marqueur de la fenêtre survit).
  const courant = await page.evaluate(() => {
    const d = new Date();
    (window as unknown as { __marqueur: number }).__marqueur = 1;
    history.pushState(null, '', '/plan-de-charge?debut=abc&equipe=xyz');
    window.dispatchEvent(new PopStateEvent('popstate'));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  await expect(page).toHaveURL(new RegExp(`[?&]debut=${courant}(&|$)`));
  await expect(page).not.toHaveURL(/equipe=/);
  await expect(champMois(page)).toHaveValue(courant);
  await expect(listeEquipe(page)).toHaveValue('');
  expect(await page.evaluate(() => (window as unknown as { __marqueur?: number }).__marqueur)).toBe(
    1,
  );
});

test('E2E-373 : états : « Aucune ressource. » sans tableau pour une équipe vide ; « Impossible de charger le plan de charge. » si l’API échoue', async ({
  page,
  request,
}) => {
  await preparer(request);
  await equipeApi(request, 'Vide 6D');
  await utilisateurApi(request, 'Alice 373', 'alice-373@lot6d.test');
  await loginAsAdmin(page);
  await page.goto(ADRESSE);
  await expect(ligne(page, 'Alice 373')).toHaveCount(1);
  await listeEquipe(page).selectOption({ label: 'Vide 6D' });
  await expect(page.getByText('Aucune ressource.')).toBeVisible();
  await expect(tableauPlan(page)).toHaveCount(0);

  await page.route('**/api/plan-de-charge**', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"erreur":"x"}' }),
  );
  await page.goto(ADRESSE);
  await expect(page.getByText('Impossible de charger le plan de charge.')).toBeVisible();
  await expect(tableauPlan(page)).toHaveCount(0);
});

test('E2E-374-r1 : ressource inactive à charge : « (inactif) » ; chef de projet : projet d’un autre chef nommé (D-265), pas d’« Autres projets »', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 374', 'chef-374@lot6d.test', 'chef_de_projet');
  const autre = await api.utilisateur('Autre 374', 'autre-374@lot6d.test', 'chef_de_projet');
  const dora = await api.utilisateur('Dora 374', 'dora-374@lot6d.test', 'ressource', true);
  const eve = await api.utilisateur('Eve 374', 'eve-374@lot6d.test', 'ressource', true);
  const visible = await api.projet('A374', 'Projet visible', chef.id);
  const cache = await api.projet('B374', 'Projet caché', autre.id);
  const projets: number[] = [];
  for (const [p, r, jours] of [
    [visible, dora, 1],
    [visible, eve, 2],
    [cache, eve, 3],
  ] as const) {
    await api.affectation(p.id, r.id);
    const a = await activiteAvec(request, p.id, `Tâche ${p.id}-${r.id}`);
    await api.assignation(a.id, r.id, jours);
    if (!projets.includes(p.id)) projets.push(p.id);
  }
  await calculer(request, projets);
  const desactive = await request.patch(`/api/utilisateurs/${dora.id}`, { data: { actif: false } });
  expect(desactive.ok(), `désactivation : ${desactive.status()}`).toBeTruthy();

  await connecterAvec(page, 'chef-374@lot6d.test');
  await page.goto(ADRESSE);
  await expect(ligne(page, 'Dora 374')).toContainText('Dora 374 (inactif)');
  await expect(ligne(page, 'Eve 374')).not.toContainText('(inactif)');
  await page.getByRole('button', { name: 'Déplier Eve 374' }).click();
  await expect(ligne(page, 'A374 · Projet visible')).toHaveCount(1);
  // Révision D-265 (4) : le projet de l'autre chef est présent, nommé ; plus de ligne regroupée.
  await expect(ligne(page, 'B374 · Projet caché')).toHaveCount(1);
  await expect(ligne(page, 'Autres projets')).toHaveCount(0);
  await expect(tableauPlan(page).getByRole('link')).toHaveCount(0);

  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto(ADRESSE);
  await page.getByRole('button', { name: 'Déplier Eve 374' }).click();
  await expect(ligne(page, 'B374 · Projet caché')).toHaveCount(1);
  await expect(ligne(page, 'Autres projets')).toHaveCount(0);
});

for (const largeur of [1440, 1024]) {
  test(`E2E-375 (${largeur} px) : zone « Plan de charge » focalisable à défilement horizontal, colonne Ressource fixe, page sans défilement horizontal`, async ({
    page,
    request,
  }) => {
    await monde(request);
    await page.setViewportSize({ width: largeur, height: 800 });
    await loginAsAdmin(page);
    await page.goto(ADRESSE);
    await expect(tableauPlan(page)).toBeVisible();
    const region = regionPlan(page);
    await expect(region).toHaveAttribute('tabindex', '0');
    expect(await region.evaluate((el) => getComputedStyle(el).overflowX)).toMatch(/auto|scroll/);

    // Tab jusqu'à la zone : anneau de focus de docs/ui.md (contour 2 px).
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab');
      if (await region.evaluate((el) => el === document.activeElement)) break;
    }
    await expect(region).toBeFocused();
    const contour = await region.evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, largeur: s.outlineWidth };
    });
    expect(contour.style).not.toBe('none');
    expect(contour.largeur).toBe('2px');

    const page_ = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(page_.s, `scrollWidth ${page_.s}, clientWidth ${page_.c}`).toBeLessThanOrEqual(page_.c);

    // Zone rétrécie (débordement garanti) : après défilement à droite, « Ressource » reste visible.
    await region.evaluate((el) => {
      el.style.width = '320px';
      el.style.maxWidth = '320px';
    });
    await region.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    const dims = await region.evaluate((el) => ({
      s: el.scrollWidth,
      c: el.clientWidth,
      g: el.scrollLeft,
    }));
    expect(dims.s, 'la zone déborde').toBeGreaterThan(dims.c);
    expect(dims.g, 'la zone a défilé').toBeGreaterThan(0);
    const zone = await region.boundingBox();
    const entete = await tableauPlan(page)
      .getByRole('columnheader', { name: 'Ressource', exact: true })
      .boundingBox();
    expect(zone && entete).toBeTruthy();
    expect(entete!.x).toBeGreaterThanOrEqual(zone!.x - 1);
    expect(entete!.x + entete!.width).toBeLessThanOrEqual(zone!.x + zone!.width + 1);
  });
}

test('E2E-376-r4 : parcours complet à l’écran (administrateur seul) : équipe, ressource et chef créés à l’écran, assignation ; Plan de charge filtré sur l’équipe, ligne de la ressource et dépliage du projet', async ({
  page,
  request,
}) => {
  const RESSOURCE = 'Ressource 6D';
  const CHEF = 'Chef 6D parcours';
  const EMAIL_RES = 'ressource-6d@lot6d.test';
  const EMAIL_CHEF = 'chef-6d-parcours@lot6d.test';
  await loginAsAdmin(page);
  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 6D');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 6D/ })).toBeVisible();

  await ouvrirEquipes(page);
  await creerEquipeParEcran(page, 'Équipe 6D');

  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const utilisateur = page.getByRole('dialog');
  await utilisateur.getByLabel('Nom').fill(RESSOURCE);
  await utilisateur.getByLabel('Email').fill(EMAIL_RES);
  await utilisateur.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE);
  await utilisateur.getByLabel('Calendrier').selectOption({ label: 'Cal 6D' });
  await utilisateur.getByLabel('Équipe', { exact: true }).selectOption({ label: 'Équipe 6D' });
  await utilisateur.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(RESSOURCE) })).toBeVisible();

  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const chef = page.getByRole('dialog');
  await chef.getByLabel('Nom').fill(CHEF);
  await chef.getByLabel('Email').fill(EMAIL_CHEF);
  await chef.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE);
  await chef.getByLabel('Rôle').selectOption({ label: 'Chef de projet' });
  await chef.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(CHEF) })).toBeVisible();

  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const projet = page.getByRole('dialog');
  await projet.getByLabel('Code').fill('6D');
  await projet.getByLabel('Nom').fill('Projet 6D');
  await projet.getByLabel('Chef de projet').selectOption({ label: CHEF });
  await projet.getByLabel('Pas avant le').fill('2027-01-04');
  await projet.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Projet 6D/ })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');

  // Le chef affecte la ressource, crée l'activité et l'assigne (4 j), tout à l'écran.
  await connecterAvec(page, EMAIL_CHEF);
  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 6D' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 6D', level: 1 })).toBeVisible();
  const projetId = Number(/\/projets\/(\d+)/.exec(page.url())![1]);
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page.getByRole('dialog').getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: new RegExp(RESSOURCE) })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 6D');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 6D/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 6D' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await assignation.getByLabel('Charge assignée (j)').fill('4');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Tâche 6D.*${RESSOURCE}`) })).toBeVisible();

  // Effet dans l'écran consommateur : calcul par l'API (hors entité saisie), puis Plan de charge.
  await preparer(request);
  await calculer(request, [projetId]);
  await allerA(page, 'Pilotage');
  await champMois(page).fill('2027-01');
  await listeEquipe(page).selectOption({ label: 'Équipe 6D' });
  await expect(lignes(page)).toHaveCount(1);
  const ligneRessource = ligne(page, RESSOURCE);
  await expect(cellules(ligneRessource).nth(1)).toContainText('4');
  await page.getByRole('button', { name: `Déplier ${RESSOURCE}` }).click();
  const ligneProjet = ligne(page, '6D · Projet 6D');
  await expect(ligneProjet).toHaveCount(1);
  await expect(cellules(ligneProjet).nth(1)).toHaveText('4');
});
