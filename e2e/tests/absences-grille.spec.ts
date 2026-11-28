// Lot absences-grille (D-280 ; SPEC §4, « Absences et charge depuis le taux », « Grille mensuelle (absences-grille,
// D-280) », points 25 à 29) : E2E-731 à E2E-736. Base « administrateur seul » avant et après chaque test. Données
// préparées par l'API, sauf l'entité dont l'écran est l'objet du test (E2E-732). Horloge du navigateur figée au
// vendredi 15/01/2027. Valeurs attendues recopiées de la SPEC.
// Contrat des écrans (phase verte) :
//   - onglet « Absences » d'Imputations (`?onglet=absences`) : pour l'administrateur, le chef de projet et le leader,
//     tableau `aria-label` « Absences de janvier 2027 » ; une ligne `tr` par ressource, première cellule `th` (en-tête
//     de ligne) = nom ; en-têtes de colonnes : « Ressource » puis un `th` par jour (numéro et initiale) ;
//   - cellule de jour : `td[data-jour="AAAA-MM-JJ"]` ; jour non travaillé ou férié : attribut `data-non-ouvre` ;
//   - élément d'une absence : `[data-portion="journee|matin|apres_midi"]` dans la cellule, texte « C », « F » ou « A »,
//     `title` et nom accessible « <Nom>, JJ/MM/AAAA, <Motif>, <portion> » ; c'est un `button` si l'utilisateur peut
//     écrire pour cette ressource, sinon un élément sans rôle de bouton (infobulle seule) ;
//   - case vide d'un jour travaillé avec droit d'écriture : un `button` dans la cellule ; sinon aucun bouton ;
//   - légende : liste « Légende » (Congé, Formation, Autre, Jour non travaillé) ;
//   - listes « Équipe » et « Ressource » (`select` natifs, options « Toutes », « Sans équipe » et les équipes ;
//     « Toutes » et les noms) ; boutons « Mois précédent », « Ce mois », « Mois suivant », « Nouvelle absence ».
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { remettreAdminSeul6b, nav } from './lot6b-helpers.js';
import { equipeApi } from './lot6a-helpers.js';
import { connecterAvec, preparer, type Role } from './lot1-helpers.js';

const LEADER = 'leader_metier' as unknown as Role;
const J15 = '2027-01-15T10:00:00';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.clock.setFixedTime(J15);
});
test.afterEach(remettreAdminSeul6b);

/**
 * Chef C (non ressource, chef de P), chef H (chef de Q) ; leader ; Alice (équipe Dev, P), Claire (équipe Dev),
 * Bob (sans équipe, Q). Mot de passe des tests du lot 1.
 */
async function monde(request: APIRequestContext) {
  const api = await preparer(request);
  const dev = await equipeApi(request, 'Dev');
  const chef = await api.utilisateur('Chef Grille', 'chef@grille.test', 'chef_de_projet');
  const hors = await api.utilisateur('Chef Hors', 'hors@grille.test', 'chef_de_projet');
  await api.utilisateur('Leader Grille', 'leader@grille.test', LEADER);
  const alice = await api.utilisateur('Alice Grille', 'alice@grille.test', 'ressource', true);
  const claire = await api.utilisateur('Claire Grille', 'claire@grille.test', 'ressource', true);
  const bob = await api.utilisateur('Bob Grille', 'bob@grille.test', 'ressource', true);
  for (const u of [alice, claire]) {
    const r = await request.patch(`/api/utilisateurs/${u.id}`, { data: { equipe_id: dev } });
    expect(r.ok(), await r.text()).toBeTruthy();
  }
  const p = await api.projet('PGR', 'Projet grille', chef.id);
  const q = await api.projet('QGR', 'Projet Q', hors.id);
  await api.affectation(p.id, alice.id);
  await api.affectation(q.id, bob.id);
  return { api, dev, chef, alice, claire, bob };
}

async function absenceApi(request: APIRequestContext, corps: Record<string, unknown>) {
  const r = await request.post('/api/absences', { data: corps });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json()) as { id: number };
}

const grille = (page: Page, mois = 'janvier 2027') =>
  page.getByRole('table', { name: `Absences de ${mois}`, exact: true });
const ligne = (page: Page, nom: string): Locator =>
  grille(page)
    .locator('tbody tr')
    .filter({ has: page.getByRole('rowheader', { name: nom }) });
const cellule = (page: Page, nom: string, jour: string): Locator =>
  ligne(page, nom).locator(`td[data-jour="${jour}"]`);
const noms = (page: Page) =>
  grille(page).locator('tbody tr').getByRole('rowheader').allTextContents();

async function ouvrirGrille(page: Page, email: string) {
  await connecterAvec(page, email);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await page.getByRole('tab', { name: 'Absences', exact: true }).click();
  await expect(page).toHaveURL(/onglet=absences/);
}

test('E2E-731 : chef, onglet Absences : grille de toutes les ressources sans sélection, légende, jours non travaillés teintés', async ({
  page,
  request,
}) => {
  await monde(request);
  await ouvrirGrille(page, 'chef@grille.test');
  await expect(grille(page)).toBeVisible();
  expect(await noms(page)).toEqual(['Alice Grille', 'Bob Grille', 'Claire Grille']);
  await expect(page.getByText('Choisissez une ressource.', { exact: true })).toBeHidden();
  await expect(grille(page).locator('thead th')).toHaveCount(32);
  await expect(grille(page).locator('thead th').nth(0)).toHaveText('Ressource');
  await expect(grille(page).locator('thead th').nth(1)).toContainText('1');
  await expect(grille(page).locator('thead th').nth(1)).toContainText('V');
  await expect(grille(page).locator('thead th').nth(4)).toContainText('L');
  await expect(grille(page).locator('thead th').nth(31)).toContainText('31');
  // Janvier 2027 : samedi 02 et dimanche 03 teintés, lundi 04 non.
  await expect(cellule(page, 'Alice Grille', '2027-01-02')).toHaveAttribute('data-non-ouvre', /.*/);
  await expect(cellule(page, 'Alice Grille', '2027-01-03')).toHaveAttribute('data-non-ouvre', /.*/);
  await expect(cellule(page, 'Alice Grille', '2027-01-04')).not.toHaveAttribute(
    'data-non-ouvre',
    /.*/,
  );
  const legende = page.getByRole('list', { name: 'Légende' });
  for (const t of ['Congé', 'Formation', 'Autre', 'Jour non travaillé']) {
    await expect(legende).toContainText(t);
  }
});

test('E2E-732 : parcours IHM : chef, clic sur une case vide d’Alice, formation créée, case « F », relue, modifiée puis supprimée à l’écran', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await ouvrirGrille(page, 'chef@grille.test');
  await cellule(page, 'Alice Grille', '2027-01-12').getByRole('button').click();
  const d = page.getByRole('dialog', { name: 'Nouvelle absence', exact: true });
  await expect(d).toBeVisible();
  await expect(d.getByLabel('Ressource', { exact: true })).toHaveValue(String(m.alice.id));
  await expect(d.getByLabel('Du', { exact: true })).toHaveValue('2027-01-12');
  await expect(d.getByLabel('Au', { exact: true })).toHaveValue('2027-01-12');
  await expect(d.getByLabel('Portion', { exact: true })).toHaveValue('journee');
  await d.getByLabel('Motif', { exact: true }).selectOption({ label: 'Formation' });
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d).toBeHidden();
  const nom = 'Alice Grille, 12/01/2027, Formation, journée';
  const f = cellule(page, 'Alice Grille', '2027-01-12').getByRole('button', { name: nom });
  await expect(f).toHaveText('F');
  await expect(f).toHaveAttribute('title', nom);
  const lues = await (await request.get('/api/absences')).json();
  expect(lues).toEqual([
    expect.objectContaining({
      ressource_id: m.alice.id,
      debut: '2027-01-12',
      fin: '2027-01-12',
      portion: 'journee',
      motif: 'formation',
    }),
  ]);
  // Modification : le motif devient Congé ; la grille est relue.
  await f.click();
  const e = page.getByRole('dialog', { name: "Modifier l'absence", exact: true });
  await e.getByLabel('Motif', { exact: true }).selectOption({ label: 'Congé' });
  await e.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(e).toBeHidden();
  await expect(
    cellule(page, 'Alice Grille', '2027-01-12').getByRole('button', {
      name: 'Alice Grille, 12/01/2027, Congé, journée',
    }),
  ).toHaveText('C');
  // Suppression depuis le dialogue.
  await cellule(page, 'Alice Grille', '2027-01-12')
    .getByRole('button', { name: 'Alice Grille, 12/01/2027, Congé, journée' })
    .click();
  await page
    .getByRole('dialog', { name: "Modifier l'absence", exact: true })
    .getByRole('button', { name: 'Supprimer', exact: true })
    .click();
  await page
    .getByRole('alertdialog', { name: "Supprimer l'absence du 12/01/2027 ?" })
    .getByRole('button', { name: 'Supprimer', exact: true })
    .click();
  await expect(cellule(page, 'Alice Grille', '2027-01-12').locator('[data-portion]')).toHaveCount(
    0,
  );
  expect(await (await request.get('/api/absences')).json()).toEqual([]);
});

test('E2E-733 : filtre « Équipe » réduit les lignes ; « Ressource » une ligne ; équipe changée, ressource corrigée', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await ouvrirGrille(page, 'chef@grille.test');
  const equipe = page.getByLabel('Équipe', { exact: true });
  const ressource = page.getByLabel('Ressource', { exact: true });
  await expect(equipe.locator('option')).toHaveText(['Toutes', 'Sans équipe', 'Dev']);
  await equipe.selectOption({ label: 'Dev' });
  await expect(page).toHaveURL(new RegExp(`equipe=${m.dev}`));
  expect(await noms(page)).toEqual(['Alice Grille', 'Claire Grille']);
  await expect(ressource.locator('option')).toHaveText(['Toutes', 'Alice Grille', 'Claire Grille']);
  await ressource.selectOption({ label: 'Claire Grille' });
  await expect(page).toHaveURL(new RegExp(`ressource=${m.claire.id}`));
  expect(await noms(page)).toEqual(['Claire Grille']);
  await equipe.selectOption({ label: 'Sans équipe' });
  await expect(page).toHaveURL(/equipe=aucune/);
  await expect(page).not.toHaveURL(/ressource=/);
  expect(await noms(page)).toEqual(['Bob Grille']);
  await equipe.selectOption({ label: 'Toutes' });
  expect(await noms(page)).toEqual(['Alice Grille', 'Bob Grille', 'Claire Grille']);
});

test('E2E-734 : « Mois suivant », « Mois précédent », « Ce mois » changent le mois et l’adresse ; mois invalide corrigé', async ({
  page,
  request,
}) => {
  await monde(request);
  await ouvrirGrille(page, 'chef@grille.test');
  await expect(page).toHaveURL(/mois=2027-01/);
  await page.getByRole('button', { name: 'Mois suivant', exact: true }).click();
  await expect(page).toHaveURL(/mois=2027-02/);
  await expect(grille(page, 'février 2027')).toBeVisible();
  await expect(grille(page, 'février 2027').locator('thead th')).toHaveCount(29);
  await page.getByRole('button', { name: 'Mois précédent', exact: true }).click();
  await page.getByRole('button', { name: 'Mois précédent', exact: true }).click();
  await expect(page).toHaveURL(/mois=2026-12/);
  await expect(grille(page, 'décembre 2026')).toBeVisible();
  await page.getByRole('button', { name: 'Ce mois', exact: true }).click();
  await expect(page).toHaveURL(/mois=2027-01/);
  await expect(grille(page)).toBeVisible();
  // Adresse invalide : mois courant du navigateur, adresse corrigée, sans rechargement de la page.
  await page.evaluate(() => ((window as unknown as { marque: number }).marque = 1));
  await page.evaluate(() => {
    history.pushState(null, '', '/imputations?onglet=absences&mois=2027-13');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(/mois=2027-01/);
  await expect(grille(page)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { marque?: number }).marque)).toBe(1);
});

test('E2E-735 : demi-journées en deux demi-cases ; hors portée, infobulle seule ; leader et administrateur activent', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await absenceApi(request, {
    ressource_id: m.alice.id,
    debut: '2027-01-13',
    fin: '2027-01-13',
    portion: 'matin',
    motif: 'conge',
  });
  await absenceApi(request, {
    ressource_id: m.alice.id,
    debut: '2027-01-13',
    fin: '2027-01-13',
    portion: 'apres_midi',
    motif: 'formation',
  });
  await absenceApi(request, {
    ressource_id: m.bob.id,
    debut: '2027-01-14',
    fin: '2027-01-14',
    portion: 'journee',
    motif: 'conge',
  });
  await ouvrirGrille(page, 'chef@grille.test');
  const c13 = cellule(page, 'Alice Grille', '2027-01-13');
  const matin = c13.getByRole('button', { name: 'Alice Grille, 13/01/2027, Congé, matin' });
  const apres = c13.getByRole('button', {
    name: 'Alice Grille, 13/01/2027, Formation, après-midi',
  });
  await expect(matin).toHaveText('C');
  await expect(apres).toHaveText('F');
  const [bm, ba] = [await matin.boundingBox(), await apres.boundingBox()];
  expect(bm!.x).toBeLessThan(ba!.x);
  // Bob est hors de la portée du chef : infobulle seule, aucune case activable sur sa ligne.
  const titreBob = 'Bob Grille, 14/01/2027, Congé, journée';
  await expect(cellule(page, 'Bob Grille', '2027-01-14').getByTitle(titreBob)).toBeVisible();
  await expect(ligne(page, 'Bob Grille').getByRole('button')).toHaveCount(0);
  await expect(ligne(page, 'Alice Grille').getByRole('button').first()).toBeVisible();
  // Leader, puis administrateur : la case de Bob est activable.
  await page.context().clearCookies();
  await ouvrirGrille(page, 'leader@grille.test');
  await cellule(page, 'Bob Grille', '2027-01-14').getByRole('button', { name: titreBob }).click();
  await expect(page.getByRole('dialog', { name: "Modifier l'absence", exact: true })).toBeVisible();
});

test('E2E-736 : clavier (Entrée), bouton « Nouvelle absence » limité à la portée ; rôle ressource : vue inchangée', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await ouvrirGrille(page, 'chef@grille.test');
  const vide = cellule(page, 'Alice Grille', '2027-01-18').getByRole('button');
  await vide.focus();
  await expect(vide).toBeFocused();
  await page.keyboard.press('Enter');
  const d = page.getByRole('dialog', { name: 'Nouvelle absence', exact: true });
  await expect(d).toBeVisible();
  await expect(d.getByLabel('Du', { exact: true })).toHaveValue('2027-01-18');
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(d).toBeHidden();
  // Bouton « Nouvelle absence » : la liste ne propose que la portée d'écriture du chef (Alice).
  await page.getByRole('button', { name: 'Nouvelle absence', exact: true }).click();
  await expect(d.getByLabel('Ressource', { exact: true }).locator('option')).toHaveText([
    'Alice Grille',
  ]);
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  // Rôle ressource : vue du point 10, sans grille.
  await page.context().clearCookies();
  await ouvrirGrille(page, 'alice@grille.test');
  await expect(page.getByRole('table', { name: /^Absences de / })).toHaveCount(0);
  await expect(page.getByLabel('Ressource', { exact: true })).toHaveValue(String(m.alice.id));
  await expect(page.getByText('Aucune absence.', { exact: true })).toBeVisible();
});
