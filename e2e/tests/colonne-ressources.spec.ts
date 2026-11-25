// Lot colonne-ressources (D-238 ; SPEC §6 « Colonne Ressources » points 1 à 7) : E2E-650 à E2E-656. Base
// « administrateur seul » avant et après chaque test. Projets, activités et ressources créés par l'API ;
// l'assignation d'E2E-651 est créée et modifiée par l'écran. Valeurs recopiées de SPEC §6 : initiales
// (nom si pas d'initiales), séparateur « , », infobulle « <nom> — <charge> j », largeur 96 px.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { E2E_ADMIN } from './credentials.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { activiteAvec, calculer, jalonAvec } from './lot3b-helpers.js';
import { chefLecteur, remettreAdminSeul6b } from './lot6b-helpers.js';

const J06 = '2027-01-06T10:00:00';
const TOLERANCE = 0.5;
const RETABLIR = "Rétablir l'affichage par défaut";
const NOM_LONG = 'Activité au nom très long pour vérifier la troncature du nom'; // 60 caractères

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.clock.setFixedTime(J06);
});
test.afterEach(remettreAdminSeul6b);

type Vue = 'projet' | 'accueil' | 'ressource';
const REGIONS: Record<Vue, string> = {
  projet: 'Tableau du Gantt',
  accueil: 'Tableau du Gantt global',
  ressource: 'Tableau du planning de la ressource',
};
const zoneTableau = (page: Page, v: Vue) =>
  page.getByRole('region', { name: REGIONS[v], exact: true });
const entetes = async (page: Page, v: Vue) =>
  (await zoneTableau(page, v).getByRole('columnheader').allTextContents()).map((t) => t.trim());
const boutonColonnes = (page: Page) => page.getByRole('button', { name: 'Colonnes', exact: true });
const menu = (page: Page) => page.getByRole('menu');
const bandeau = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Planning à recalculer' });
const boite = async (l: Locator) => {
  const b = await l.boundingBox();
  if (!b) throw new Error('élément sans boîte');
  return b;
};

async function connecterAdmin(page: Page) {
  await page.goto('/connexion');
  await page.getByLabel('Identifiant').fill(E2E_ADMIN.email);
  await page.getByLabel('Mot de passe').fill(E2E_ADMIN.motDePasse);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/$/);
}

/**
 * Un chef, un projet, trois ressources (Alice Bernard AB, Marc Dupont sans initiales, Zoé Carré ZC), affectées
 * au projet. « Tâche R » : Zoé 1 j, Alice 2,5 j, Marc 3 j (assignées dans cet ordre) ; « Phase P » parent de
 * « Fille F » (Alice 1 j) ; « Libre L » sans assignation ; « Jalon J ». Calculé (D0 = 04/01/2027).
 */
async function monde(request: APIRequestContext, suffixe: string, assigner = true) {
  const api = await preparer(request);
  const s = suffixe.toLowerCase();
  const emailChef = `chef-${s}@example.test`;
  const chef = await api.utilisateur(`Chef ${suffixe}`, emailChef, 'chef_de_projet');
  const projet = await api.projet(`P-${suffixe}`, `Projet ${suffixe}`, chef.id);
  const ressource = async (nom: string, initiales: string | null) => {
    const u = await api.utilisateur(
      nom,
      `${nom
        .normalize('NFD')
        .replace(/[^a-zA-Z]/g, '')
        .toLowerCase()}-${s}@example.test`,
      'ressource',
      true,
    );
    await api.affectation(projet.id, u.id);
    if (initiales) {
      const r = await request.fetch(`/api/utilisateurs/${u.id}`, {
        method: 'PATCH',
        data: { initiales },
      });
      expect(r.ok(), `PATCH initiales : ${r.status()}`).toBeTruthy();
    }
    return u;
  };
  const alice = await ressource('Alice Bernard', 'AB');
  const marc = await ressource('Marc Dupont', null);
  const zoe = await ressource('Zoé Carré', 'ZC');
  const tache = await activiteAvec(request, projet.id, 'Tâche R');
  const phase = await activiteAvec(request, projet.id, 'Phase P');
  const fille = await activiteAvec(request, projet.id, 'Fille F', { parent_id: phase.id });
  const longue = await activiteAvec(request, projet.id, NOM_LONG);
  await activiteAvec(request, projet.id, 'Libre L');
  await jalonAvec(request, projet.id, 'Jalon J');
  if (assigner) {
    await api.assignation(tache.id, zoe.id, 1);
    await api.assignation(tache.id, alice.id, 2.5);
    await api.assignation(tache.id, marc.id, 3);
    await api.assignation(fille.id, alice.id, 1);
    await api.assignation(longue.id, marc.id, 1);
    await calculer(request, [projet.id]);
  }
  return { api, chef, emailChef, projet, alice, marc, zoe, tache, phase, fille };
}
type Monde = Awaited<ReturnType<typeof monde>>;

const adresse = (m: Monde, v: Vue) =>
  v === 'projet'
    ? `/projets/${m.projet.id}?onglet=gantt&zoom=jour`
    : v === 'accueil'
      ? '/?zoom=jour'
      : `/?ressource=${m.alice.id}&zoom=jour`;

async function attendre(page: Page, v: Vue, texte = v === 'ressource' ? '1 Tâche R' : 'Tâche R') {
  await page.locator('svg[data-zoom]').waitFor();
  if (v === 'accueil') {
    await expect(page.getByRole('button', { name: /^Replier / }).first()).toBeVisible();
  }
  await expect(zoneTableau(page, v).getByText(texte, { exact: true }).first()).toBeVisible();
}

async function ouvrir(page: Page, m: Monde, v: Vue, largeur = 1440) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto(adresse(m, v));
  await attendre(page, v);
}

/** Cellule « Ressources » de la ligne du nom donné ; échoue si la colonne est absente. */
async function cellule(page: Page, v: Vue, nomLigne: string): Promise<Locator> {
  const index = (await entetes(page, v)).indexOf('Ressources');
  expect(index, 'colonne « Ressources » affichée').toBeGreaterThan(-1);
  return zoneTableau(page, v)
    .locator('tbody tr')
    .filter({ has: page.getByText(nomLigne, { exact: true }) })
    .first()
    .locator('td')
    .nth(index);
}

const TEXTE_TACHE_R = 'AB, Marc Dupont, ZC';
const TITRES_TACHE_R = ['Alice Bernard — 2,5 j', 'Marc Dupont — 3 j', 'Zoé Carré — 1 j'];

async function verifierContenu(page: Page, v: Vue) {
  const r = await cellule(page, v, 'Tâche R');
  await expect(r).toHaveText(TEXTE_TACHE_R);
  for (const t of TITRES_TACHE_R) await expect(r.getByTitle(t, { exact: true })).toHaveCount(1);
  await expect(await cellule(page, v, 'Fille F')).toHaveText('AB');
  await expect(await cellule(page, v, 'Libre L')).toHaveText('');
  await expect(await cellule(page, v, 'Phase P')).toHaveText('');
  await expect(await cellule(page, v, 'Jalon J')).toHaveText('');
}

test('E2E-650 : Gantt d’un projet, administrateur : colonne Ressources par défaut après Fin, initiales ou nom, tri par nom, infobulles ; parent et jalon vides', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E650');
  await connecterAdmin(page);
  await ouvrir(page, m, 'projet');
  expect(await entetes(page, 'projet')).toEqual(['WBS', 'Nom', 'Début', 'Fin', 'Ressources']);
  await verifierContenu(page, 'projet');
  // Largeur par défaut 96 px (point 7).
  const largeur = (
    await boite(
      zoneTableau(page, 'projet').getByRole('columnheader', { name: 'Ressources', exact: true }),
    )
  ).width;
  expect(Math.abs(largeur - 96)).toBeLessThanOrEqual(1);
});

test('E2E-651 : parcours par l’écran : créer l’assignation dans l’onglet Planning, la modifier depuis l’initiale du Gantt (charge 4), effets lus à l’écran', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E651', false);
  await connecterAdmin(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/projets/${m.projet.id}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche R' }).click();
  const creation = page.getByRole('dialog', { name: 'Assigner une ressource' });
  await creation.getByLabel('Ressource').selectOption({ label: 'Alice Bernard' });
  await creation.getByLabel('Charge assignée (j)').fill('2.5');
  await creation.getByRole('button', { name: 'Assigner', exact: true }).click();
  await expect(creation).toHaveCount(0);

  await page.goto(adresse(m, 'projet'));
  await attendre(page, 'projet');
  const r = await cellule(page, 'projet', 'Tâche R');
  await expect(r.getByTitle('Alice Bernard — 2,5 j', { exact: true })).toBeVisible();
  await r
    .getByRole('button', { name: "Modifier l'assignation de Alice Bernard à Tâche R", exact: true })
    .click();
  const modif = page.getByRole('dialog', { name: 'Modifier l’assignation' });
  await expect(modif).toBeVisible();
  await expect(modif.getByLabel('Charge assignée (j)')).toHaveValue(/^2[.,]5$/);
  await modif.getByLabel('Charge assignée (j)').fill('4');
  await modif.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(modif).toHaveCount(0);

  const apres = await cellule(page, 'projet', 'Tâche R');
  await expect(apres.getByTitle('Alice Bernard — 4 j', { exact: true })).toBeVisible();
  await expect(bandeau(page)).toBeVisible();
  // Colonne Charge (au choix) : 4.
  await boutonColonnes(page).click();
  await menu(page).getByRole('menuitemcheckbox', { name: 'Charge', exact: true }).click();
  await page.keyboard.press('Escape');
  const iCharge = (await entetes(page, 'projet')).indexOf('Charge');
  expect(iCharge).toBeGreaterThan(-1);
  await expect(
    zoneTableau(page, 'projet')
      .locator('tbody tr')
      .filter({ has: page.getByText('Tâche R', { exact: true }) })
      .first()
      .locator('td')
      .nth(iCharge),
  ).toHaveText('4');
  // Écran consommateur : l'onglet Planning rouvre l'assignation avec la charge 4.
  await page.goto(`/projets/${m.projet.id}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page
    .getByRole('button', { name: "Modifier l'assignation de Alice Bernard à Tâche R", exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Modifier l’assignation' }).getByLabel('Charge assignée (j)'),
  ).toHaveValue('4');
});

test('E2E-652 : Accueil, projet déplié : même contenu ; clic, enregistrement, Accueil rechargé, infobulle mise à jour', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E652');
  await connecterAdmin(page);
  await ouvrir(page, m, 'accueil');
  expect(await entetes(page, 'accueil')).toEqual(['Code', 'Nom', 'Début', 'Fin', 'Ressources']);
  await verifierContenu(page, 'accueil');
  const r = await cellule(page, 'accueil', 'Tâche R');
  await r
    .getByRole('button', { name: "Modifier l'assignation de Alice Bernard à Tâche R", exact: true })
    .click();
  const modif = page.getByRole('dialog', { name: 'Modifier l’assignation' });
  await expect(modif.getByLabel('Charge assignée (j)')).toHaveValue(/^2[.,]5$/);
  await modif.getByLabel('Charge assignée (j)').fill('4');
  await modif.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(modif).toHaveCount(0);
  await attendre(page, 'accueil');
  const apres = await cellule(page, 'accueil', 'Tâche R');
  await expect(apres.getByTitle('Alice Bernard — 4 j', { exact: true })).toBeVisible();
  await expect(apres).toHaveText(TEXTE_TACHE_R);
});

test('E2E-653 : chef de projet sans droit d’écriture : infobulles présentes, aucun bouton dans la colonne, dans les deux vues', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E653');
  const email = await chefLecteur(request, m.projet.id, 'E653');
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecterAvec(page, email);
  for (const v of ['projet', 'accueil'] as const) {
    await page.goto(adresse(m, v));
    await attendre(page, v);
    const r = await cellule(page, v, 'Tâche R');
    await expect(r).toHaveText(TEXTE_TACHE_R);
    for (const t of TITRES_TACHE_R) await expect(r.getByTitle(t, { exact: true })).toHaveCount(1);
    await expect(r.getByRole('button'), v).toHaveCount(0);
    await expect(
      zoneTableau(page, v).getByRole('button', { name: /^Modifier l'assignation de / }),
      v,
    ).toHaveCount(0);
  }
});

test('E2E-654-r1 : menu « Colonnes » : « Ressources » après « Fin », cochée par défaut, décochée absente et conservée, rétablie ; absente du planning d’une ressource', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E654');
  await connecterAdmin(page);
  for (const v of ['projet', 'accueil'] as const) {
    await ouvrir(page, m, v);
    await boutonColonnes(page).click();
    const items = menu(page).getByRole('menuitemcheckbox');
    const titres = (await items.allTextContents()).map((t) => t.trim());
    expect(titres[titres.indexOf('Fin') + 1], `${v} : après Fin`).toBe('Ressources');
    const element = menu(page).getByRole('menuitemcheckbox', { name: 'Ressources', exact: true });
    await expect(element).toHaveAttribute('aria-checked', 'true');
    await element.click();
    await page.keyboard.press('Escape');
    expect(await entetes(page, v)).not.toContain('Ressources');
    await expect(zoneTableau(page, v).getByTitle('Alice Bernard — 2,5 j')).toHaveCount(0);
    await page.reload();
    await attendre(page, v);
    expect(await entetes(page, v), `${v} : conservée au rechargement`).not.toContain('Ressources');
    await boutonColonnes(page).click();
    await menu(page).getByRole('menuitem', { name: RETABLIR, exact: true }).click();
    await expect.poll(() => entetes(page, v)).toContain('Ressources');
    await page.keyboard.press('Escape');
  }
  await ouvrir(page, m, 'ressource', 1440);
  await expect(zoneTableau(page, 'ressource').getByRole('columnheader').first()).toBeVisible();
  expect(await entetes(page, 'ressource')).not.toContain('Ressources');
  await boutonColonnes(page).click();
  const titres = (await menu(page).getByRole('menuitemcheckbox').allTextContents()).map((t) =>
    t.trim(),
  );
  expect(titres).not.toContain('Ressources');
});

test('E2E-655 : « Recalcul automatique » cochée, modification par une initiale : calcul déclenché, bandeau effacé', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E655');
  await connecterAdmin(page);
  await ouvrir(page, m, 'projet');
  await page.getByRole('checkbox', { name: 'Recalcul automatique', exact: true }).check();
  const r = await cellule(page, 'projet', 'Tâche R');
  await r
    .getByRole('button', { name: "Modifier l'assignation de Alice Bernard à Tâche R", exact: true })
    .click();
  const modif = page.getByRole('dialog', { name: 'Modifier l’assignation' });
  await modif.getByLabel('Charge assignée (j)').fill('4');
  const calcul = page.waitForRequest(
    (q) => q.method() === 'POST' && new URL(q.url()).pathname === '/api/calcul',
  );
  await modif.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await calcul;
  await expect(modif).toHaveCount(0);
  await expect(bandeau(page)).toHaveCount(0);
  await expect(
    (await cellule(page, 'projet', 'Tâche R')).getByTitle('Alice Bernard — 4 j', { exact: true }),
  ).toBeVisible();
});

for (const v of ['projet', 'accueil'] as const) {
  test(`E2E-656 (${v}) : critère 3b point 15 (a) à (c) à 1440 et 1024 px, colonnes par défaut dont Ressources`, async ({
    page,
    request,
  }) => {
    const m = await monde(request, `E2E656${v === 'projet' ? 'P' : 'A'}`);
    await connecterAdmin(page);
    for (const largeur of [1440, 1024]) {
      await ouvrir(page, m, v, largeur);
      expect(await entetes(page, v)).toContain('Ressources');
      // Drapeaux est décochée par défaut : cochée par le menu pour le critère (a).
      await boutonColonnes(page).click();
      await menu(page).getByRole('menuitemcheckbox', { name: 'Drapeaux', exact: true }).click();
      await page.keyboard.press('Escape');
      const zone = await boite(zoneTableau(page, v));
      const ths = zoneTableau(page, v).getByRole('columnheader');
      const premiere = await boite(ths.nth(0));
      const seconde = await boite(ths.nth(1));
      const drapeaux = await boite(
        zoneTableau(page, v).getByRole('columnheader', { name: 'Drapeaux', exact: true }),
      );
      for (const [b, quoi] of [
        [premiere, 'première colonne'],
        [seconde, 'colonne du nom'],
        [drapeaux, 'Drapeaux'],
      ] as const) {
        expect(b.x, `${largeur} px : ${quoi}, bord gauche`).toBeGreaterThanOrEqual(
          zone.x - TOLERANCE,
        );
        expect(b.x + b.width, `${largeur} px : ${quoi}, bord droit`).toBeLessThanOrEqual(
          zone.x + zone.width + TOLERANCE,
        );
      }
      expect(seconde.x + seconde.width, `${largeur} px : nom recouvert`).toBeLessThanOrEqual(
        drapeaux.x + TOLERANCE,
      );
      const badges = zoneTableau(page, v).locator('tbody td:last-child span');
      for (let i = 0; i < (await badges.count()); i++) {
        const b = await boite(badges.nth(i));
        expect(b.x + b.width, `${largeur} px : badge ${i}`).toBeLessThanOrEqual(
          zone.x + zone.width + TOLERANCE,
        );
      }
      const pageLarge = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(
        pageLarge.scroll,
        `${largeur} px : page sans défilement horizontal`,
      ).toBeLessThanOrEqual(pageLarge.client);
      await boutonColonnes(page).click();
      await menu(page).getByRole('menuitem', { name: RETABLIR, exact: true }).click();
      await page.keyboard.press('Escape');
    }
  });
}
