// REX-3b-r2 (D-129 (2) précisé, D-131) : corrections de la relecture de REX-3b. E2E-279 à E2E-286.
// Base « administrateur seul » remise à zéro avant et après chaque test, horloge figée au 06/01/2027,
// zoom jour (24 px par jour), données créées par l'API, gestes faits à l'écran.
// Contrat (à relire) :
//   - A : un calcul par le bouton « Calculer » vide la pile d'annulation ; « Annuler » désactivé, `title`
//     « Rien à annuler depuis le dernier calcul » ; aucun contour restauré ;
//   - B : échec d'une annulation : l'écran est rechargé depuis le serveur et l'alerte d'échec est visible ;
//   - C (Accueil) : erreur de chargement d'un élément effacée dès qu'un rechargement réussit ; élément
//     absent de la liste : « Élément introuvable. » ; bouton-nom désactivé pendant l'attente, un seul appel ;
//   - D : « Copier » et « Annuler » forment un groupe qui ne se coupe pas (même `top` à 1024 px) ;
//   - E : écart ≥ 8 px (4 px mesurés à l'arbitrage, déjà satisfaits ; gap-2 comme l'Accueil) entre le crayon et le lien du sous-projet (Gantt du projet) ;
//   - F : le fond de la ligne projet (survol) couvre toute la largeur de la ligne (Accueil).
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activiteAvec, calculer, monde3b, sousProjet } from './lot3b-helpers.js';
import { notification, ouvrirDialogueCalcul, remettreAdminSeul } from './lot3c-helpers.js';
import { appliquerGeste, retarderPatchs } from './patch-helpers.js';

const J06 = '2027-01-06T10:00:00';
const PX_JOUR = 24;

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul);

const gantt = (projetId: number) => `/projets/${projetId}?onglet=gantt&zoom=jour`;
const boutonAnnuler = (page: Page) => page.getByRole('button', { name: 'Annuler', exact: true });
const alertes = (page: Page) => page.getByRole('alert');
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);
const contours = (page: Page, id: number) => page.locator(`svg [data-contour-element="${id}"]`);
const tableauGantt = (page: Page) =>
  page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
const tableauAccueil = (page: Page) =>
  page.getByRole('region', { name: 'Tableau du Gantt global', exact: true });

const laisserPasser = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

/** Appui au centre de `cible`, déplacement de dx pixels, relâchement. */
async function glisser(page: Page, cible: Locator, dx: number): Promise<void> {
  await cible.scrollIntoViewIfNeeded();
  const b = (await cible.boundingBox())!;
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: Math.max(2, Math.ceil(Math.abs(dx) / 6)) });
  await page.mouse.up();
  await laisserPasser(page);
}

/** Requêtes de la page : écritures et GET du Gantt, dans l'ordre. */
function suivre(page: Page) {
  const ecritures: { methode: string; chemin: string }[] = [];
  const lectures: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/auth/')) return;
    if (r.method() === 'GET') lectures.push(url.pathname);
    else ecritures.push({ methode: r.method(), chemin: url.pathname });
  });
  return { ecritures, lectures };
}

/** Projet du chef avec une activité START 11/01/2027 (5 j, Alice), calculé. */
async function mondeStart(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Tâche START', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 5);
  await calculer(request, [m.projet.id]);
  return { ...m, a, nomProjet: `Projet ${suffixe}` };
}

async function ouvrir(page: Page, m: { emailChef: string; projet: { id: number } }) {
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await page.locator('svg[data-zoom]').waitFor();
}

test('E2E-279 : un calcul vide la pile : « Annuler » désactivé avec son infobulle, aucun contour restauré', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E279');
  const s = suivre(page);
  await ouvrir(page, m);
  await expect(boutonAnnuler(page)).toHaveAttribute('title', 'Annuler (Ctrl+Z)');
  await glisser(page, barre(page, m.a.id), PX_JOUR);
  await expect(contours(page, m.a.id)).toHaveCount(1);
  await expect(boutonAnnuler(page)).toBeEnabled();

  const dialogue = await ouvrirDialogueCalcul(page);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(notification(page, 'Planning calculé.')).toBeVisible();
  await expect(contours(page, m.a.id)).toHaveCount(0);
  await expect(boutonAnnuler(page)).toBeDisabled();
  await expect(boutonAnnuler(page)).toHaveAttribute(
    'title',
    'Rien à annuler depuis le dernier calcul',
  );

  const avant = s.ecritures.length;
  await page.keyboard.press('Control+z');
  await laisserPasser(page);
  expect(s.ecritures.length).toBe(avant);
  await expect(contours(page, m.a.id)).toHaveCount(0);

  // Un nouveau geste rend l'annulation de nouveau possible, avec l'infobulle d'origine.
  await glisser(page, barre(page, m.a.id), PX_JOUR);
  await expect(boutonAnnuler(page)).toBeEnabled();
  await expect(boutonAnnuler(page)).toHaveAttribute('title', 'Annuler (Ctrl+Z)');
});

test('E2E-280-r2 : échec d’une annulation : l’écran est rechargé depuis le serveur et l’alerte est visible', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E280');
  const s = suivre(page);
  await retarderPatchs(page, m.a.id);
  await ouvrir(page, m);
  // Révision E2E-280-r2 (D-031, D-146 (2)) : écran attendu après chaque glisser (contour et barre libérée), plus
  // la réponse réseau.
  for (const dx of [PX_JOUR, 2 * PX_JOUR]) {
    await appliquerGeste(barre(page, m.a.id), contours(page, m.a.id), () =>
      glisser(page, barre(page, m.a.id), dx),
    );
  }
  await expect.poll(() => s.ecritures.filter((e) => e.methode === 'PATCH').length).toBe(2);

  // Le serveur change derrière l'écran : seul un rechargement le montre.
  const r = await request.fetch(`/api/activites/${m.a.id}`, {
    method: 'PATCH',
    data: { nom: 'Tâche renommée E280' },
  });
  expect(r.ok(), `PATCH nom : ${r.status()}`).toBeTruthy();
  await expect(tableauGantt(page).getByText('Tâche renommée E280')).toHaveCount(0);

  await page.route(`**/api/activites/${m.a.id}`, (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ erreur: 'Refus' }),
        })
      : route.continue(),
  );
  const lecturesAvant = s.lectures.filter((c) => c.endsWith('/gantt')).length;
  await boutonAnnuler(page).click();

  await expect(alertes(page)).toHaveCount(1);
  await expect(alertes(page)).toContainText('Impossible d’annuler ce geste');
  await expect(tableauGantt(page).getByText('Tâche renommée E280')).toBeVisible();
  expect(s.lectures.filter((c) => c.endsWith('/gantt')).length).toBeGreaterThan(lecturesAvant);
});

/** Projet du chef avec « Tâche C » et « Tâche D », calculé ; Accueil ouvert, projet déplié. */
async function accueilDeplie(page: Page, request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Tâche C', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  const b = await activiteAvec(request, m.projet.id, 'Tâche D', {
    mode: 'START',
    debut_valide: '2027-01-12',
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  await calculer(request, [m.projet.id]);
  await connecterAvec(page, m.emailChef);
  await page.goto('/');
  await page.getByRole('button', { name: `Déplier Projet ${suffixe}`, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tâche C', exact: true })).toBeVisible();
  return { ...m, a, b };
}

test('E2E-281 : Accueil, erreur de chargement d’un élément effacée dès qu’un rechargement réussit', async ({
  page,
  request,
}) => {
  await accueilDeplie(page, request, 'E2E281');
  const motif = '**/api/projets/*/activites';
  await page.route(motif, (route) => route.fulfill({ status: 500, body: '{}' }));
  await page.getByRole('button', { name: 'Tâche C', exact: true }).click();
  await expect(page.getByText('Impossible de charger l’élément à modifier.')).toBeVisible();

  await page.unroute(motif);
  const dialogue = await ouvrirDialogueCalcul(page);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(notification(page, 'Planning calculé.')).toBeVisible();
  await expect(page.getByText('Impossible de charger l’élément à modifier.')).toHaveCount(0);
});

test('E2E-282 : Accueil, élément absent de la liste : « Élément introuvable. », aucun dialogue', async ({
  page,
  request,
}) => {
  const m = await accueilDeplie(page, request, 'E2E282');
  const r = await request.delete(`/api/activites/${m.b.id}`);
  expect(r.ok(), `DELETE activité : ${r.status()}`).toBeTruthy();

  await page.getByRole('button', { name: 'Tâche D', exact: true }).click();
  await expect(page.getByText('Élément introuvable.')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // L'élément suivant s'ouvre normalement, l'alerte disparaît.
  await page.getByRole('button', { name: 'Tâche C', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Modifier l’activité' })).toBeVisible();
  await expect(page.getByText('Élément introuvable.')).toHaveCount(0);
});

test('E2E-283 : Accueil, bouton-nom désactivé pendant l’attente, un seul appel sur un double clic', async ({
  page,
  request,
}) => {
  const m = await accueilDeplie(page, request, 'E2E283');
  const s = suivre(page);
  let liberer: () => void = () => undefined;
  const retenu = new Promise<void>((r) => (liberer = r));
  await page.route('**/api/projets/*/activites', async (route) => {
    await retenu;
    await route.continue();
  });

  const bouton = page.getByRole('button', { name: 'Tâche C', exact: true });
  await bouton.dblclick();
  await expect(bouton).toBeDisabled();
  liberer();
  await expect(page.getByRole('dialog', { name: 'Modifier l’activité' })).toBeVisible();
  expect(s.lectures.filter((c) => c === `/api/projets/${m.projet.id}/activites`).length).toBe(1);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  // Dialogue fermé : le bouton est de nouveau actif (le dialogue modal le masque aux rôles tant qu'il est ouvert).
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(bouton).toBeEnabled();
});

test('E2E-284 : à 1024 px, « Copier » et « Annuler » forment un groupe : même top', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E284');
  await page.setViewportSize({ width: 1024, height: 700 });
  await ouvrir(page, m);
  const copier = (await page.getByRole('button', { name: 'Copier', exact: true }).boundingBox())!;
  const annuler = (await boutonAnnuler(page).boundingBox())!;
  expect(annuler.y).toBe(copier.y);
});

test('E2E-285 : Gantt du projet, écart d’au moins 8 px entre le lien du sous-projet et son crayon', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E285');
  await page.setViewportSize({ width: 1440, height: 700 });
  await sousProjet(request, m.projet.id, 'SP-285', 'Sous-projet 285', m.chef.id);
  await calculer(request, [m.projet.id]);
  await ouvrir(page, m);
  const lien = tableauGantt(page).getByRole('link', { name: /Sous-projet 285/ });
  const crayon = tableauGantt(page).getByRole('button', {
    name: 'Modifier le projet Sous-projet 285',
    exact: true,
  });
  const l = (await lien.boundingBox())!;
  const c = (await crayon.boundingBox())!;
  expect(c.x - (l.x + l.width)).toBeGreaterThanOrEqual(8);
});

test('E2E-286 : Accueil, le fond de la ligne projet survolée couvre toute la largeur de la ligne', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E286');
  await connecterAvec(page, m.emailChef);
  await page.goto('/');
  const ligne = tableauAccueil(page).locator('tbody tr').first();
  await expect(ligne).toContainText('Projet E2E286');
  await ligne.hover({ position: { x: 4, y: 4 } });
  const mesure = await ligne.evaluate((tr) => {
    // Fond visible d'une cellule : le sien s'il est opaque, sinon celui de la ligne.
    const fondLigne = getComputedStyle(tr).backgroundColor;
    const cellules = [...tr.querySelectorAll('td')].map((td) => {
      const propre = getComputedStyle(td).backgroundColor;
      return {
        fond: propre === 'rgba(0, 0, 0, 0)' ? fondLigne : propre,
        largeur: td.getBoundingClientRect().width,
      };
    });
    return { cellules, fondLigne, largeur: tr.getBoundingClientRect().width };
  });
  const fond = mesure.fondLigne;
  expect(fond).not.toBe('rgba(0, 0, 0, 0)');
  const couvert = mesure.cellules
    .filter((c) => c.fond === fond)
    .reduce((somme, c) => somme + c.largeur, 0);
  expect(Math.abs(couvert - mesure.largeur)).toBeLessThanOrEqual(1);
});

test('E2E-287 : Gantt du projet, survol d’une ligne : la cellule Drapeaux a le même fond que les autres cellules', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E287');
  await ouvrir(page, m);
  const ligne = tableauGantt(page).locator('tbody tr').filter({ hasText: 'Tâche START' });
  await ligne.hover({ position: { x: 4, y: 4 } });
  const fonds = await ligne.evaluate((tr) => {
    const fondLigne = getComputedStyle(tr).backgroundColor;
    return [...tr.querySelectorAll('td')].map((td) => {
      const propre = getComputedStyle(td).backgroundColor;
      return propre === 'rgba(0, 0, 0, 0)' ? fondLigne : propre;
    });
  });
  expect(fonds.length).toBeGreaterThan(1);
  expect(fonds[0]).not.toBe('rgba(0, 0, 0, 0)');
  expect(fonds[fonds.length - 1]).toBe(fonds[0]);
  expect(new Set(fonds).size).toBe(1);
});
