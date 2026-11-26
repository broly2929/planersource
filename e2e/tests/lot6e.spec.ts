// Lot 6e (D-157, SPEC « Accueil : planning d'une ressource (lot 6e, D-157) ») : E2E-377 à E2E-382.
// Base « administrateur seul » avant et après chaque test. Valeurs recopiées de D-157.
// Dates attendues lues dans GET /api/projets/:id/gantt (calcul de l'API, D0 = 2027-01-04), jamais recalculées.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { colonnesCompletes } from './colonnes-completes.js';
import { MOT_DE_PASSE, connecterAvec, preparer } from './lot1-helpers.js';
import { activiteAvec, calculer } from './lot3b-helpers.js';
import { allerA, lireGantt, ouvrirCalendriers, ouvrirEquipes } from './lot3c-helpers.js';
import { creerEquipeParEcran, options } from './lot6a-helpers.js';
import { jjmmaaaa, remettreAdminSeul6b } from './lot6b-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

const listeRessource = (page: Page) => page.getByLabel('Planning de', { exact: true });
const zoneTableau = (page: Page) =>
  page.getByRole('region', { name: 'Tableau du planning de la ressource', exact: true });
const zoneCalendrier = (page: Page) =>
  page.getByRole('region', { name: 'Calendrier du planning de la ressource', exact: true });
const lignes = (page: Page) => zoneTableau(page).locator('tbody tr');
const bouton = (page: Page, nom: string) => page.getByRole('button', { name: nom, exact: true });
const bandeauNonCalcule = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Planning non calculé' });

/** Remplissage de la barre (l'élément `role="img"` ou son premier rectangle). */
const remplissage = (barre: Locator): Promise<string> =>
  barre.evaluate((el) => {
    const cible = el.tagName.toLowerCase() === 'rect' ? el : (el.querySelector('rect') ?? el);
    return getComputedStyle(cible).fill;
  });

const canaux = (couleur: string): number[] => (couleur.match(/\d+(\.\d+)?/g) ?? []).map(Number);

async function dates(request: APIRequestContext, projetId: number, nom: string) {
  const e = (await lireGantt(request, projetId)).elements.find((x) => x.nom === nom)!;
  expect(e.debut_planifie, `${nom} calculée`).toBeTruthy();
  return { debut: jjmmaaaa(e.debut_planifie!), fin: jjmmaaaa(e.fin_planifiee!) };
}

interface Monde {
  api: Awaited<ReturnType<typeof preparer>>;
  chef: { id: number };
  autreChef: { id: number };
  alice: { id: number };
  p1: { id: number };
  p2: { id: number };
}

/** Alice : « Analyse » (2 j) dans 6E1 (chef 1) et « Secrète » (3 j) dans 6E2 (chef 2), calculés. */
async function monde(request: APIRequestContext): Promise<Monde> {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 6E', 'chef-6e@lot6e.test', 'chef_de_projet');
  const autreChef = await api.utilisateur('Autre 6E', 'autre-6e@lot6e.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice 6E', 'alice-6e@lot6e.test', 'ressource', true);
  const p1 = await api.projet('6E1', 'Projet un', chef.id);
  const p2 = await api.projet('6E2', 'Projet deux', autreChef.id);
  for (const [p, jours, nom] of [
    [p1, 2, 'Analyse'],
    [p2, 3, 'Secrète'],
  ] as const) {
    await api.affectation(p.id, alice.id);
    const a = await activiteAvec(request, p.id, nom);
    await api.assignation(a.id, alice.id, jours);
  }
  await calculer(request, [p1.id, p2.id]);
  return { api, chef, autreChef, alice, p1, p2 };
}

test('E2E-377-r2 : liste « Planning de » avant le zoom : « Tous les projets » par défaut, ressources actives triées sans casse ; absente de la ressource', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 377', 'chef-377@lot6e.test', 'chef_de_projet');
  await api.utilisateur('Charles 377', 'charles-377@lot6e.test', 'ressource', true);
  await api.utilisateur('alice 377', 'alice-377@lot6e.test', 'ressource', true);
  await api.utilisateur('Bruno 377', 'bruno-377@lot6e.test', 'ressource', true);
  const dan = await api.utilisateur('Dan 377', 'dan-377@lot6e.test', 'ressource', true);
  await api.utilisateur('Eve 377', 'eve-377@lot6e.test', 'ressource', false);
  const desactive = await request.patch(`/api/utilisateurs/${dan.id}`, { data: { actif: false } });
  expect(desactive.ok()).toBeTruthy();

  // Révision D-159 (2) : un projet visible, pour que le Gantt global s'affiche.
  const projet = await api.projet('6E377', 'Projet 377', chef.id);
  await activiteAvec(request, projet.id, 'Activité 377');

  await loginAsAdmin(page);
  for (const role of ['administrateur', 'chef']) {
    await page.goto('/');
    await expect(listeRessource(page), role).toBeVisible();
    await expect(listeRessource(page), role).toHaveValue('');
    expect(await options(listeRessource(page)), role).toEqual([
      'Tous les projets',
      'alice 377',
      'Bruno 377',
      'Charles 377',
    ]);
    // La liste précède les boutons de zoom ; le Gantt global est inchangé.
    const yListe = (await listeRessource(page).boundingBox())!;
    const yZoom = (await bouton(page, 'Jour').boundingBox())!;
    expect(yListe.x < yZoom.x || yListe.y < yZoom.y, role).toBe(true);
    await expect(page.getByRole('region', { name: 'Tableau du Gantt global' })).toBeVisible();
    await expect(bouton(page, 'Tout replier')).toBeVisible();
    if (role === 'administrateur') {
      await page.context().clearCookies();
      await connecterAvec(page, 'chef-377@lot6e.test');
    }
  }

  await page.context().clearCookies();
  await connecterAvec(page, 'alice-377@lot6e.test');
  await expect(page).toHaveURL('/mes-taches');
  await expect(listeRessource(page)).toHaveCount(0);
});

test('E2E-378-r1 : vue d’une ressource : colonnes, lignes, lien, boutons masqués, barres accent, nom accessible, lecture seule', async ({
  page,
  request,
}) => {
  await colonnesCompletes(page);
  const m = await monde(request);
  const d1 = await dates(request, m.p1.id, 'Analyse');
  const d2 = await dates(request, m.p2.id, 'Secrète');
  await loginAsAdmin(page);
  await page.goto('/');
  await listeRessource(page).selectOption({ label: 'Alice 6E' });
  await expect(page).toHaveURL(new RegExp(`[?&]ressource=${m.alice.id}(&|$)`));

  const tableau = zoneTableau(page);
  await expect(tableau.getByRole('columnheader')).toHaveText([
    'Projet',
    'Activité',
    'Début',
    'Fin',
    'Assigné',
    'Réel',
    'Reste',
    'Drapeaux',
  ]);
  await expect(lignes(page)).toHaveCount(2);
  const premiere = lignes(page).filter({ hasText: '1 Analyse' });
  await expect(premiere.getByRole('link', { name: '6E1', exact: true })).toHaveAttribute(
    'href',
    `/projets/${m.p1.id}`,
  );
  await expect(premiere).toContainText(d1.debut);
  await expect(premiere).toContainText(d1.fin);
  await expect(lignes(page).filter({ hasText: '1 Secrète' })).toContainText(d2.debut);

  for (const nom of ['Calculer', 'Tout déplier']) {
    await expect(bouton(page, nom)).toHaveCount(0);
  }
  await expect(page.getByRole('checkbox', { name: 'Initiales', exact: true })).toHaveCount(0);
  for (const zoom of ['Jour', 'Semaine', 'Mois']) await expect(bouton(page, zoom)).toBeVisible();

  const cal = zoneCalendrier(page);
  const barre1 = cal.getByRole('img', {
    name: `6E1 · 1 Analyse, du ${d1.debut} au ${d1.fin}`,
    exact: true,
  });
  const barre2 = cal.getByRole('img', {
    name: new RegExp(`^6E2 · 1 Secrète, du ${d2.debut} au ${d2.fin}`),
  });
  await expect(barre1).toHaveCount(1);
  await expect(barre2).toHaveCount(1);
  await expect(cal.getByRole('img')).toHaveCount(2);
  // Couleur accent : identique pour les deux barres, non grise.
  const accent = await remplissage(barre1);
  expect(await remplissage(barre2)).toBe(accent);
  const c = canaux(accent);
  expect(Math.max(...c.slice(0, 3)) - Math.min(...c.slice(0, 3))).toBeGreaterThan(60);

  // Lecture seule : ni dialogue, ni poignée, ni connecteur.
  await barre1.dblclick();
  await barre1.press('Enter').catch(() => undefined);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(cal.locator('[data-connecteur-element], [data-poignee]')).toHaveCount(0);
});

test('E2E-379 : ligne masquée pour le chef (« Autre projet », « — », barre grise, nom accessible) ; l’administrateur voit le projet nommé', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  const d2 = await dates(request, m.p2.id, 'Secrète');
  const d1 = await dates(request, m.p1.id, 'Analyse');
  await connecterAvec(page, 'chef-6e@lot6e.test');
  await page.goto(`/?ressource=${m.alice.id}`);
  await expect(lignes(page)).toHaveCount(2);
  const masquee = lignes(page).filter({ hasText: 'Autre projet' });
  await expect(masquee).toHaveCount(1);
  await expect(masquee.getByRole('link')).toHaveCount(0);
  await expect(masquee.locator('td').nth(1)).toHaveText('—');
  await expect(masquee).toContainText(d2.debut);
  const cal = zoneCalendrier(page);
  const barreMasquee = cal.getByRole('img', {
    name: `Autre projet, du ${d2.debut} au ${d2.fin}`,
    exact: true,
  });
  await expect(barreMasquee).toHaveCount(1);
  const barreClaire = cal.getByRole('img', {
    name: `6E1 · 1 Analyse, du ${d1.debut} au ${d1.fin}`,
    exact: true,
  });
  const gris = canaux(await remplissage(barreMasquee));
  expect(Math.max(...gris.slice(0, 3)) - Math.min(...gris.slice(0, 3))).toBeLessThan(60);
  expect(await remplissage(barreMasquee)).not.toBe(await remplissage(barreClaire));

  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto(`/?ressource=${m.alice.id}`);
  await expect(lignes(page).filter({ hasText: 'Autre projet' })).toHaveCount(0);
  await expect(
    lignes(page).filter({ hasText: '1 Secrète' }).getByRole('link', { name: '6E2', exact: true }),
  ).toBeVisible();
});

test('E2E-380 : états : « Aucune tâche pour cette ressource. », bandeau « Planning non calculé », échec du chargement', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 380', 'chef-380@lot6e.test', 'chef_de_projet');
  const sans = await api.utilisateur('Sans 380', 'sans-380@lot6e.test', 'ressource', true);
  const alice = await api.utilisateur('Alice 380', 'alice-380@lot6e.test', 'ressource', true);
  const p = await api.projet('6E380', 'Projet 380', chef.id);
  await api.affectation(p.id, alice.id);
  const a = await activiteAvec(request, p.id, 'Non calculée');
  await api.assignation(a.id, alice.id, 2);

  await loginAsAdmin(page);
  await page.goto(`/?ressource=${sans.id}`);
  await expect(page.getByText('Aucune tâche pour cette ressource.')).toBeVisible();
  await expect(lignes(page)).toHaveCount(0);

  await page.goto(`/?ressource=${alice.id}`);
  await expect(bandeauNonCalcule(page)).toBeVisible();
  await expect(lignes(page)).toHaveCount(1);
  await expect(zoneCalendrier(page).getByRole('img')).toHaveCount(0);

  await page.route('**/api/ressources/*/planning', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"erreur":"x"}' }),
  );
  await page.goto(`/?ressource=${alice.id}`);
  await expect(page.getByText('Impossible de charger le planning de la ressource.')).toBeVisible();
  await expect(lignes(page)).toHaveCount(0);
});

test('E2E-381-r3 : adresse (zoom conservé, valeurs invalides corrigées sans rechargement, retour à « Tous les projets ») et ordre de focus', async ({
  page,
  request,
}) => {
  await colonnesCompletes(page);
  const m = await monde(request);
  await loginAsAdmin(page);
  await page.goto(`/?ressource=${m.alice.id}&zoom=jour`);
  await expect(listeRessource(page)).toHaveValue(String(m.alice.id));
  await expect(bouton(page, 'Jour')).toHaveAttribute('aria-pressed', 'true');
  await bouton(page, 'Mois').click();
  await expect(page).toHaveURL(new RegExp(`ressource=${m.alice.id}`));
  await expect(page).toHaveURL(/zoom=mois/);

  // Valeur invalide, ou ressource absente de la liste : « Tous les projets », adresse corrigée, sans rechargement.
  for (const valeur of ['abc', '99999', '']) {
    await page.evaluate((v) => {
      (window as unknown as { __marqueur: number }).__marqueur = 1;
      history.pushState(null, '', `/?ressource=${v}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, valeur);
    await expect(page).not.toHaveURL(/ressource=/);
    await expect(listeRessource(page), valeur).toHaveValue('');
    await expect(page.getByRole('region', { name: 'Tableau du Gantt global' })).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as { __marqueur?: number }).__marqueur),
    ).toBe(1);
    await listeRessource(page).selectOption({ label: 'Alice 6E' });
    await expect(page).toHaveURL(new RegExp(`ressource=${m.alice.id}`));
  }
  await listeRessource(page).selectOption({ label: 'Tous les projets' });
  await expect(page).not.toHaveURL(/ressource=/);
  await expect(page.getByRole('region', { name: 'Tableau du Gantt global' })).toBeVisible();

  // Ordre de focus en vue ressource : Bruno n'a qu'une ligne (un seul lien dans le tableau).
  const bruno = await m.api.utilisateur('Bruno 6E', 'bruno-6e@lot6e.test', 'ressource', true);
  await m.api.affectation(m.p1.id, bruno.id);
  const tacheBruno = await activiteAvec(request, m.p1.id, 'Tâche Bruno');
  await m.api.assignation(tacheBruno.id, bruno.id, 1);
  await calculer(request, [m.p1.id, m.p2.id]);
  await page.goto(`/?ressource=${bruno.id}`);
  await expect(zoneTableau(page)).toHaveAttribute('tabindex', '0');
  await expect(zoneCalendrier(page)).toHaveAttribute('tabindex', '0');
  await listeRessource(page).focus();
  const libelle = () =>
    page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null;
      return e?.getAttribute('aria-label') ?? e?.textContent?.trim() ?? '';
    });
  const ordre: string[] = [];
  // Révision D-213 : le séparateur « Largeur du tableau » précède la zone du calendrier.
  // Révision -r2 (D-216 (3)) : « Colonnes » après « Mois » ; poignées de largeur après la zone du tableau.
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    ordre.push(await libelle());
  }
  expect(ordre).toEqual([
    'Jour',
    'Semaine',
    'Mois',
    'Colonnes',
    'Tableau du planning de la ressource',
    'Largeur de la colonne Projet',
    'Largeur de la colonne Activité',
    'Largeur de la colonne Début',
    'Largeur de la colonne Fin',
    'Largeur de la colonne Assigné',
    'Largeur de la colonne Réel',
    'Largeur de la colonne Reste',
    'Largeur de la colonne Drapeaux',
    '6E1',
    'Largeur du tableau',
    'Calendrier du planning de la ressource',
  ]);
});

test('E2E-382-r3 : parcours complet à l’écran (administrateur seul) : entités créées à l’écran ; Accueil : choix de la ressource, sa barre, retour à « Tous les projets »', async ({
  page,
  request,
}) => {
  const RESSOURCE = 'Ressource 6E';
  const CHEF = 'Chef 6E parcours';
  const EMAIL_RES = 'ressource-6e@lot6e.test';
  const EMAIL_CHEF = 'chef-6e-parcours@lot6e.test';
  await loginAsAdmin(page);
  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 6E');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 6E/ })).toBeVisible();

  await ouvrirEquipes(page);
  await creerEquipeParEcran(page, 'Équipe 6E');

  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const utilisateur = page.getByRole('dialog');
  await utilisateur.getByLabel('Nom').fill(RESSOURCE);
  await utilisateur.getByLabel('Email').fill(EMAIL_RES);
  await utilisateur.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE);
  await utilisateur.getByLabel('Calendrier').selectOption({ label: 'Cal 6E' });
  await utilisateur.getByLabel('Équipe', { exact: true }).selectOption({ label: 'Équipe 6E' });
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
  await projet.getByLabel('Code').fill('6E');
  await projet.getByLabel('Nom').fill('Projet 6E');
  await projet.getByLabel('Chef de projet').selectOption({ label: CHEF });
  await projet.getByLabel('Pas avant le').fill('2027-01-04');
  await projet.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Projet 6E/ })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');

  await connecterAvec(page, EMAIL_CHEF);
  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 6E' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 6E', level: 1 })).toBeVisible();
  const projetId = Number(/\/projets\/(\d+)/.exec(page.url())![1]);
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page.getByRole('dialog').getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: new RegExp(RESSOURCE) })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 6E');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 6E/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 6E' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await assignation.getByLabel('Charge assignée (j)').fill('4');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Tâche 6E.*${RESSOURCE}`) })).toBeVisible();

  // Effet dans l'écran consommateur : calcul par l'API (hors entité saisie), puis l'Accueil.
  await preparer(request);
  await calculer(request, [projetId]);
  const d = await dates(request, projetId, 'Tâche 6E');
  await allerA(page, 'Accueil');
  await listeRessource(page).selectOption({ label: RESSOURCE });
  await expect(lignes(page)).toHaveCount(1);
  await expect(lignes(page).first()).toContainText('1 Tâche 6E');
  await expect(
    zoneCalendrier(page).getByRole('img', {
      name: `6E · 1 Tâche 6E, du ${d.debut} au ${d.fin}`,
      exact: true,
    }),
  ).toHaveCount(1);
  await listeRessource(page).selectOption({ label: 'Tous les projets' });
  await expect(page.getByRole('region', { name: 'Tableau du Gantt global' })).toBeVisible();
  await expect(page).not.toHaveURL(/ressource=/);
});
