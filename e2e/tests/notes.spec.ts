// Lot notes (D-270 ; SPEC §3 « Notes d'activité (notes, D-270) », points 1 à 8) : E2E-707 à E2E-711. Base
// « administrateur seul » avant et après chaque test. Données préparées par l'API, sauf E2E-711 (parcours complet,
// tout à l'écran) et l'entité dont l'écran est l'objet du test. Valeurs attendues recopiées de SPEC §3 point 7.
// Contrat des écrans (phase verte) :
//   - champ « Notes » (zone de texte, `getByLabel('Notes')`) dans « Nouvelle activité » et « Modifier l’activité » ;
//   - compteur « N / 500 » (texte exact) dans le dialogue, saisie bloquée à 500 caractères ;
//   - colonne « Notes » au choix du menu « Colonnes » du Gantt d'un projet et de l'Accueil, décochée par défaut,
//     avant « Drapeaux » ; cellule : texte de la note, `title` = texte complet, vide sans note.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { MOT_DE_PASSE, connecterAvec, preparer, type Role } from './lot1-helpers.js';
import { allerA } from './lot3c-helpers.js';
import { nav, remettreAdminSeul6b } from './lot6b-helpers.js';

const LEADER = 'leader_metier' as unknown as Role;
const REGIONS = { projet: 'Tableau du Gantt', accueil: 'Tableau du Gantt global' } as const;
type Vue = keyof typeof REGIONS;
const NOTE = 'Premier point\nSecond point';
const LONGUE = 'x'.repeat(600);

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

/** Chef C (chef de P), leader L (non ressource), ressource R (affectée, assignée sur « Tâche N »). */
async function monde(request: APIRequestContext, note: string | null = NOTE) {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef C', 'chef-c@notes.test', 'chef_de_projet');
  const leader = await api.utilisateur('Léa Leader', 'leader@notes.test', LEADER);
  const res = await api.utilisateur('Rémi Ressource', 'remi@notes.test', 'ressource', true);
  const p = await api.projet('PNO', 'Projet N', chef.id);
  await api.affectation(p.id, res.id);
  const a = await api.activite(p.id, 'Tâche N');
  await api.assignation(a.id, res.id, 2);
  if (note !== null) {
    const r = await request.patch(`/api/activites/${a.id}`, { data: { notes: note } });
    expect(r.ok(), `PATCH notes : ${r.status()}`).toBeTruthy();
  }
  return { api, chef, leader, res, p, a };
}
type Monde = Awaited<ReturnType<typeof monde>>;

const zone = (page: Page, v: Vue) => page.getByRole('region', { name: REGIONS[v], exact: true });
const adresse = (m: Monde, v: Vue) =>
  v === 'projet' ? `/projets/${m.p.id}?onglet=gantt&zoom=jour` : '/?zoom=jour';
const entetes = async (page: Page, v: Vue) =>
  (await zone(page, v).getByRole('columnheader').allTextContents()).map((t) => t.trim());

async function ouvrirVue(page: Page, m: Monde, v: Vue) {
  await page.goto(adresse(m, v));
  await page.locator('svg[data-zoom]').waitFor();
  await expect(zone(page, v).getByText('Tâche N', { exact: true }).first()).toBeVisible();
}

async function ouvrirMenuColonnes(page: Page) {
  await page.getByRole('button', { name: 'Colonnes', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu;
}
const options = async (menu: Locator) =>
  (await menu.getByRole('menuitemcheckbox').allTextContents()).map((t) => t.trim());

/** Coche « Notes » dans le menu « Colonnes » et le referme. */
async function afficherNotes(page: Page) {
  const menu = await ouvrirMenuColonnes(page);
  await menu.getByRole('menuitemcheckbox', { name: 'Notes', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
}

/** Cellule « Notes » de la ligne du nom donné. */
async function celluleNotes(page: Page, v: Vue, nomLigne: string): Promise<Locator> {
  const index = (await entetes(page, v)).indexOf('Notes');
  expect(index, 'colonne « Notes » affichée').toBeGreaterThan(-1);
  return zone(page, v)
    .locator('tbody tr')
    .filter({ has: page.getByText(nomLigne, { exact: true }) })
    .first()
    .locator('td')
    .nth(index);
}

const dlgModif = (page: Page) => page.getByRole('dialog', { name: 'Modifier l’activité' });

test('E2E-707 : chef : dialogue de création, champ « Notes », compteur, saisie bloquée à 500 ; colonne « Notes » du Gantt décochée par défaut, puis affichée', async ({
  page,
  request,
}) => {
  const m = await monde(request, null);
  await connecterAvec(page, 'chef-c@notes.test');
  await page.goto(`/projets/${m.p.id}`);
  await page.getByRole('tab', { name: 'Planning', exact: true }).click();
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('Nom').fill('Étude N');
  const champ = d.getByLabel('Notes');
  await expect(champ).toBeVisible();
  await expect(d.getByText('0 / 500', { exact: true })).toBeVisible();
  await champ.fill('Ligne 1\nLigne 2');
  await expect(d.getByText('15 / 500', { exact: true })).toBeVisible();
  await champ.fill(LONGUE);
  await expect(d.getByText('500 / 500', { exact: true })).toBeVisible();
  await expect(champ).toHaveValue('x'.repeat(500));
  await champ.fill('Ligne 1\nLigne 2');
  await d.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Étude N' })).toBeVisible();

  await ouvrirVue(page, m, 'projet');
  expect(await entetes(page, 'projet')).not.toContain('Notes');
  const menu = await ouvrirMenuColonnes(page);
  const choix = await options(menu);
  expect(choix).toContain('Notes');
  expect(choix.indexOf('Notes')).toBe(choix.indexOf('Drapeaux') - 1);
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Notes', exact: true })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await page.keyboard.press('Escape');
  await afficherNotes(page);
  const cellule = await celluleNotes(page, 'projet', 'Étude N');
  await expect(cellule).toHaveAttribute('title', 'Ligne 1\nLigne 2');
  const vide = await celluleNotes(page, 'projet', 'Tâche N');
  await expect(vide).toHaveText('');
});

test('E2E-708 : chef : modification de la note depuis le Planning, le Gantt et l’Accueil ; effacement ; colonne « Notes » du Gantt et de l’Accueil', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'Note de départ');
  await connecterAvec(page, 'chef-c@notes.test');

  // Planning : le champ porte la note ; modification enregistrée.
  await page.goto(`/projets/${m.p.id}`);
  await page.getByRole('tab', { name: 'Planning', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier Tâche N', exact: true }).click();
  await expect(dlgModif(page).getByLabel('Notes')).toHaveValue('Note de départ');
  await expect(dlgModif(page).getByText('14 / 500', { exact: true })).toBeVisible();
  await dlgModif(page).getByLabel('Notes').fill(NOTE);
  await dlgModif(page).getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dlgModif(page)).toHaveCount(0);

  // Gantt : colonne « Notes » affichée, texte et infobulle.
  await ouvrirVue(page, m, 'projet');
  await afficherNotes(page);
  const g = await celluleNotes(page, 'projet', 'Tâche N');
  await expect(g).toHaveAttribute('title', NOTE);
  // Modification depuis le Gantt.
  await zone(page, 'projet').getByRole('button', { name: 'Tâche N', exact: true }).click();
  await expect(dlgModif(page).getByLabel('Notes')).toHaveValue(NOTE);
  await dlgModif(page).getByLabel('Notes').fill('Depuis le Gantt');
  await dlgModif(page).getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dlgModif(page)).toHaveCount(0);
  await expect(await celluleNotes(page, 'projet', 'Tâche N')).toHaveAttribute(
    'title',
    'Depuis le Gantt',
  );

  // Accueil : colonne « Notes » ; modification depuis le dialogue ; effacement.
  await ouvrirVue(page, m, 'accueil');
  expect(await entetes(page, 'accueil')).not.toContain('Notes');
  await afficherNotes(page);
  await expect(await celluleNotes(page, 'accueil', 'Tâche N')).toHaveAttribute(
    'title',
    'Depuis le Gantt',
  );
  await zone(page, 'accueil').getByRole('button', { name: 'Tâche N', exact: true }).click();
  await expect(dlgModif(page).getByLabel('Notes')).toHaveValue('Depuis le Gantt');
  await dlgModif(page).getByLabel('Notes').fill('');
  await dlgModif(page).getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dlgModif(page)).toHaveCount(0);
  await expect(await celluleNotes(page, 'accueil', 'Tâche N')).toHaveText('');
  const apres = await request.get(`/api/projets/${m.p.id}/activites`);
  const liste = (await apres.json()) as { id: number; notes: string | null }[];
  expect(liste.find((x) => x.id === m.a.id)!.notes).toBeNull();
});

test('E2E-709-r1 : leader : modifie la note d’un projet dont il n’est pas chef ; chef en lecture seule : colonne « Notes » lisible, aucun dialogue', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'Note du chef');
  const hors = await m.api.utilisateur('Chef H', 'chef-h@notes.test', 'chef_de_projet');
  await m.api.projet('QNO', 'Projet QN', hors.id);

  await connecterAvec(page, 'leader@notes.test');
  await page.goto(`/projets/${m.p.id}`);
  await page.getByRole('tab', { name: 'Planning', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier Tâche N', exact: true }).click();
  await expect(dlgModif(page).getByLabel('Notes')).toHaveValue('Note du chef');
  await dlgModif(page).getByLabel('Notes').fill('Note du leader');
  await dlgModif(page).getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dlgModif(page)).toHaveCount(0);
  await ouvrirVue(page, m, 'projet');
  await afficherNotes(page);
  await expect(await celluleNotes(page, 'projet', 'Tâche N')).toHaveAttribute(
    'title',
    'Note du leader',
  );

  // Chef d'un autre projet : lecture seule, la note est lue dans la colonne, sans dialogue.
  // E2E-709-r1 (D-271, tag tests-notes-r2) : les colonnes affichées sont mémorisées par navigateur (D-212).
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await connecterAvec(page, 'chef-h@notes.test');
  await ouvrirVue(page, m, 'projet');
  await expect(page.getByText('Lecture seule', { exact: true })).toBeVisible();
  await afficherNotes(page);
  await expect(await celluleNotes(page, 'projet', 'Tâche N')).toHaveAttribute(
    'title',
    'Note du leader',
  );
  await expect(
    zone(page, 'projet').getByRole('button', { name: 'Tâche N', exact: true }),
  ).toHaveCount(0);
  await expect(dlgModif(page)).toHaveCount(0);
});

test('E2E-710 : ressource assignée : « Mes tâches » sans note ni colonne de note ; l’API ne renvoie jamais la clé', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'NOTE-INTERNE');
  await connecterAvec(page, 'remi@notes.test');
  await nav(page).getByRole('link', { name: 'Mes tâches', exact: true }).click();
  await expect(page.getByText('Tâche N', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('NOTE-INTERNE')).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Notes' })).toHaveCount(0);
  for (const chemin of ['/api/mes-taches', `/api/projets/${m.p.id}/activites`]) {
    const r = await page.request.get(chemin);
    expect(r.status(), chemin).toBeLessThan(500);
    const texte = await r.text();
    expect(texte, chemin).not.toContain('NOTE-INTERNE');
    expect(texte, chemin).not.toContain('"notes"');
  }
});

test('E2E-711 : parcours complet (administrateur seul) : projet, ressource, chef et leader créés à l’écran ; le chef saisit une note, la colonne « Notes » l’affiche ; le leader la modifie ; la ressource ne la voit pas', async ({
  page,
}) => {
  await loginAsAdmin(page);
  // Utilisateurs créés à l'écran : chef, leader, ressource.
  await allerA(page, 'Utilisateurs');
  const creer = async (nom: string, email: string, role: string, ressource = false) => {
    await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
    const u = page.getByRole('dialog');
    await u.getByLabel('Nom').fill(nom);
    await u.getByLabel('Email').fill(email);
    await u.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE);
    await u.getByLabel('Rôle').selectOption({ label: role });
    if (ressource) await u.getByLabel('Ressource planifiable').check();
    await u.getByRole('button', { name: 'Créer' }).click();
    await expect(page.getByRole('row').filter({ hasText: nom })).toBeVisible();
  };
  await creer('Cora Chef', 'cora@notes.test', 'Chef de projet');
  await creer('Léo Leader', 'leo@notes.test', 'Leader métier');
  await creer('Rita Ressource', 'rita@notes.test', 'Ressource', true);

  // Projet créé à l'écran (chef : Cora), affectation de Rita, activité assignée.
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const projet = page.getByRole('dialog');
  await projet.getByLabel('Code').fill('PNO711');
  await projet.getByLabel('Nom').fill('Projet 711');
  await projet.getByLabel('Chef de projet').selectOption({ label: 'Cora Chef' });
  await projet.getByLabel('Pas avant le').fill('2027-01-04');
  await projet.getByRole('button', { name: 'Créer' }).click();
  await page.getByRole('link', { name: 'Projet 711', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Projet 711', level: 1 })).toBeVisible();
  const url711 = page.url();
  await page.getByRole('tab', { name: 'Affectations', exact: true }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  const aff = page.getByRole('dialog');
  await aff.getByLabel('Ressource').selectOption({ label: 'Rita Ressource' });
  await aff.getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Rita Ressource' })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning', exact: true }).click();
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const act = page.getByRole('dialog');
  await act.getByLabel('Nom').fill('Étude 711');
  await act.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Étude 711' })).toBeVisible();
  await page
    .getByRole('button', { name: 'Assigner une ressource à Étude 711', exact: true })
    .click();
  const ass = page.getByRole('dialog');
  await ass.getByLabel('Ressource').selectOption({ label: 'Rita Ressource' });
  await ass.getByLabel('Charge assignée (j)').fill('2');
  await ass.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  // Le chef saisit la note par le dialogue d'activité ; la colonne « Notes » du Gantt l'affiche.
  await connecterAvec(page, 'cora@notes.test');
  await page.goto(url711);
  await page.getByRole('tab', { name: 'Planning', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier Étude 711', exact: true }).click();
  await dlgModif(page).getByLabel('Notes').fill('Valider avec le client\navant le 15');
  await dlgModif(page).getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dlgModif(page)).toHaveCount(0);
  await page.getByRole('tab', { name: 'Gantt', exact: true }).click();
  await page.locator('svg[data-zoom]').waitFor();
  await afficherNotes(page);
  await expect(await celluleNotes(page, 'projet', 'Étude 711')).toHaveAttribute(
    'title',
    'Valider avec le client\navant le 15',
  );
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  // Le leader modifie la note.
  await connecterAvec(page, 'leo@notes.test');
  await page.goto(url711);
  await page.getByRole('tab', { name: 'Planning', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier Étude 711', exact: true }).click();
  await expect(dlgModif(page).getByLabel('Notes')).toHaveValue(
    'Valider avec le client\navant le 15',
  );
  await dlgModif(page).getByLabel('Notes').fill('Validé par le client');
  await dlgModif(page).getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dlgModif(page)).toHaveCount(0);
  await page.getByRole('tab', { name: 'Gantt', exact: true }).click();
  await page.locator('svg[data-zoom]').waitFor();
  await expect(await celluleNotes(page, 'projet', 'Étude 711')).toHaveAttribute(
    'title',
    'Validé par le client',
  );
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  // La ressource assignée ne voit pas la note dans Mes tâches.
  await connecterAvec(page, 'rita@notes.test');
  await nav(page).getByRole('link', { name: 'Mes tâches', exact: true }).click();
  await expect(page.getByText('Étude 711', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Validé par le client')).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Notes' })).toHaveCount(0);
});
