import { expect, test, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { chefLecteur } from './lot6b-helpers.js';
import { activite, poserSaisies } from './lot2e-helpers.js';
import { activiteAvec, calculer, jalonAvec, lier, monde3b, sousProjet } from './lot3b-helpers.js';

/*
 * Contrat (D-066, SPEC §6 « Affichage (lot 3b) ») : onglet « Gantt » de /projets/:id, adresse
 * ?onglet=gantt&zoom=jour|semaine|mois ; SVG avec data-zoom ; barres [data-element-id] (data-type, data-debut,
 * data-fin, data-drapeaux, width) ; liens [data-lien-id] ; trait du jour [data-aujourdhui] ; trait de début
 * non respecté [data-debut-non-respecte] ; noms accessibles : role=img + aria-label (D-067) ; sous-projet : data-projet-id. Horloge figée au 06/01/2027.
 */
const J06 = '2027-01-06T10:00:00';

const gantt = (projetId: number, zoom?: string) =>
  `/projets/${projetId}?onglet=gantt${zoom ? `&zoom=${zoom}` : ''}`;

const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);

/** DEP-1 : A (3 j) → B (2 j), FD, calculé. */
async function dep1(request: Parameters<typeof monde3b>[0], suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice', 'Bob']);
  const a = await activiteAvec(request, m.projet.id, 'A');
  const b = await activiteAvec(request, m.projet.id, 'B');
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  await m.api.assignation(b.id, m.gens.Bob!.id, 2);
  const lien = await lier(request, m.projet.id, a.id, b.id);
  await calculer(request, [m.projet.id]);
  return { ...m, a, b, lien };
}

test('E2E-33 : onglet Gantt de DEP-1 calculé : adresse, barres, ligne du tableau, lien FD', async ({
  page,
  request,
}) => {
  const m = await dep1(request, 'E2E33');
  await page.clock.setFixedTime(J06);
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}`);
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect(page).toHaveURL(/onglet=gantt/);

  await page.reload();
  await expect(page).toHaveURL(/onglet=gantt/);
  await expect(page.getByRole('tab', { name: 'Gantt' })).toHaveAttribute('aria-selected', 'true');
  await expect(barre(page, m.a.id)).toHaveAttribute('data-debut', '2027-01-04');
  await expect(barre(page, m.a.id)).toHaveAttribute('data-fin', '2027-01-06');
  await expect(barre(page, m.b.id)).toHaveAttribute('data-debut', '2027-01-07');
  await expect(barre(page, m.b.id)).toHaveAttribute('data-fin', '2027-01-08');

  const ligneA = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'A', exact: true }) });
  await expect(ligneA).toContainText('Dès que possible');
  await expect(ligneA).toContainText('04/01/2027');
  await expect(ligneA).toContainText('06/01/2027');
  await expect(ligneA.getByRole('cell', { name: '3', exact: true })).toBeVisible();
  await expect(ligneA).toContainText('0 %');
  await expect(page.locator('svg [data-lien-id]')).toHaveCount(1);
  await expect(page.locator(`svg [data-lien-id="${m.lien.id}"]`)).toHaveAttribute(
    'data-type',
    'FD',
  );
});

test('E2E-34 : zoom Jour, Semaine, Mois piloté par l’adresse et conservé au rechargement', async ({
  page,
  request,
}) => {
  const m = await dep1(request, 'E2E34');
  await page.clock.setFixedTime(J06);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  for (const nom of ['Jour', 'Semaine', 'Mois']) {
    await expect(page.getByRole('button', { name: nom, exact: true })).toBeVisible();
  }
  await expect(page.locator('svg[data-zoom]')).toHaveAttribute('data-zoom', 'semaine');
  await expect(barre(page, m.a.id)).toHaveAttribute('width', '24');

  await page.getByRole('button', { name: 'Jour', exact: true }).click();
  await expect(page).toHaveURL(/zoom=jour/);
  await expect(barre(page, m.a.id)).toHaveAttribute('width', '72');

  await page.getByRole('button', { name: 'Mois', exact: true }).click();
  await expect(page).toHaveURL(/zoom=mois/);
  await expect(barre(page, m.a.id)).toHaveAttribute('width', '12');

  await page.reload();
  await expect(page.locator('svg[data-zoom]')).toHaveAttribute('data-zoom', 'mois');
  await expect(barre(page, m.a.id)).toHaveAttribute('width', '12');

  await page.goto(gantt(m.projet.id, 'xyz'));
  await expect(page.locator('svg[data-zoom]')).toHaveAttribute('data-zoom', 'semaine');
  await expect(barre(page, m.a.id)).toHaveAttribute('width', '24');
});

/** Montage de GANTT-6 (ALAP-3, JAL-2, MAN-11 cas a) plus MAN-15 (STARR-3 avec saisie), calculé. */
async function montageDrapeaux(request: Parameters<typeof monde3b>[0], suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice', 'Bob', 'Carole', 'Dave', 'Eve']);
  const p = m.projet.id;
  const g = m.gens;
  const alap = await activiteAvec(request, p, 'ALAP-3', { mode: 'ALAP', fin_valide: '2027-01-06' });
  await m.api.assignation(alap.id, g.Alice!.id, 5);
  const pred = await activiteAvec(request, p, 'Prédécesseur');
  await m.api.assignation(pred.id, g.Bob!.id, 5);
  const jalon = await jalonAvec(request, p, 'Jalon JAL-2', {
    type: 'fixe',
    date_validee: '2027-01-06',
  });
  await lier(request, p, pred.id, jalon.id);
  const a = await activiteAvec(request, p, 'Amont');
  await m.api.assignation(a.id, g.Carole!.id, 3);
  const man = await activite(request, p, 'Manuelle', 'MAN');
  const assignMan = await m.api.assignation(man.id, g.Dave!.id, 1);
  const lienMan = await lier(request, p, a.id, man.id);
  await poserSaisies(request, man.id, '2027-01', [
    { assignation_id: assignMan.id, jour: '2027-01-05', demi_journee: 'matin' },
    { assignation_id: assignMan.id, jour: '2027-01-05', demi_journee: 'apres_midi' },
  ]);
  const starr = await activiteAvec(request, p, 'STARR-3', {
    mode: 'STARR',
    debut_valide: '2027-01-06',
  });
  await m.api.assignation(starr.id, g.Eve!.id, 2);
  const manEve = await activite(request, p, 'Manuelle Eve', 'MAN');
  const assignEve = await m.api.assignation(manEve.id, g.Eve!.id, 1);
  await poserSaisies(request, manEve.id, '2027-01', [
    { assignation_id: assignEve.id, jour: '2027-01-06', demi_journee: 'matin' },
    { assignation_id: assignEve.id, jour: '2027-01-06', demi_journee: 'apres_midi' },
  ]);
  await calculer(request, [p]);
  return { ...m, alap, jalon, lienMan, starr };
}

test('E2E-35 : drapeaux : retard (barre, jalon), dépendance non respectée (lien), début non respecté (trait, badge)', async ({
  page,
  request,
}) => {
  const m = await montageDrapeaux(request, 'E2E35');
  await page.clock.setFixedTime(J06);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));

  await expect(barre(page, m.alap.id)).toHaveAttribute('data-drapeaux', 'retard');
  const ligneAlap = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'ALAP-3', exact: true }) });
  await expect(ligneAlap).toContainText('Retard');

  await expect(barre(page, m.jalon.id)).toHaveAttribute('data-type', 'jalon');
  await expect(barre(page, m.jalon.id)).toHaveAttribute('data-drapeaux', 'retard');
  await expect(page.locator(`svg [data-lien-id="${m.lienMan.id}"]`)).toHaveAttribute(
    'data-drapeaux',
    'dependance_non_respectee',
  );

  await expect(page.locator(`svg [data-debut-non-respecte="${m.starr.id}"]`)).toHaveCount(1);
  const ligneStarr = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'STARR-3', exact: true }) });
  await expect(ligneStarr).toContainText('Début non respecté');
});

test('E2E-36 : trait du jour à la date du navigateur, absent hors plage', async ({
  page,
  request,
}) => {
  const m = await dep1(request, 'E2E36');
  await connecterAvec(page, m.emailChef);

  await page.clock.setFixedTime(J06);
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, m.a.id)).toBeVisible();
  await expect(page.locator('svg [data-aujourdhui="2027-01-06"]')).toHaveCount(1);

  await page.clock.setFixedTime('2026-11-16T10:00:00');
  await page.reload();
  await expect(barre(page, m.a.id)).toBeVisible();
  await expect(page.locator('svg [data-aujourdhui]')).toHaveCount(0);
});

test('E2E-37 : avant tout calcul, bandeau et tableau sans barre ; projet sans élément : état vide', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E37', ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'A');
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  await activiteAvec(request, m.projet.id, 'B');
  const vide = await m.api.projet('P-E2E37V', 'Projet vide E2E37', m.chef.id);
  await page.clock.setFixedTime(J06);
  await connecterAvec(page, m.emailChef);

  await page.goto(gantt(m.projet.id));
  await expect(page.getByRole('status').filter({ hasText: 'Planning non calculé' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'A', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'B', exact: true })).toBeVisible();
  await expect(page.locator('svg [data-element-id]')).toHaveCount(0);

  await page.goto(gantt(vide.id));
  await expect(page.getByText('Ce projet ne contient encore aucun élément.')).toBeVisible();
  await expect(page.locator('svg [data-element-id]')).toHaveCount(0);
});

test('E2E-38-r3 : parent, sous-projet en synthèse avec lien ; un chef affecté à P seul voit P sans P1 et sans bouton d’écriture', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E38', ['Alice', 'Carole']);
  const p = m.projet.id;
  const g = await activiteAvec(request, p, 'G');
  const f1 = await activiteAvec(request, p, 'F1', { parent_id: g.id });
  const f2 = await activiteAvec(request, p, 'F2', { parent_id: g.id });
  await m.api.assignation(f1.id, m.gens.Alice!.id, 2);
  await m.api.assignation(f2.id, m.gens.Alice!.id, 1);
  const p1 = await sousProjet(request, p, 'P1-E2E38', 'Sous-projet E2E38', m.chef.id);
  await m.api.affectation(p1.id, m.gens.Carole!.id);
  const c = await activiteAvec(request, p1.id, 'C');
  await m.api.assignation(c.id, m.gens.Carole!.id, 3);
  await calculer(request, [p]);
  await page.clock.setFixedTime(J06);

  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(p));
  await expect(barre(page, g.id)).toHaveAttribute('data-type', 'parent');
  await expect(page.locator(`svg [data-projet-id="${p1.id}"]`)).toHaveCount(1);
  await expect(page.locator(`svg [data-projet-id="${p1.id}"]`)).toHaveAttribute(
    'data-type',
    'sous-projet',
  );
  const lien = page.getByRole('link', { name: 'Sous-projet E2E38' });
  await expect(lien).toHaveAttribute('href', `/projets/${p1.id}`);

  await page.context().clearCookies();
  // Révision 6b (D-031, D-148 (9)) : témoin lecture seule = chef de projet affecté au projet d'un autre chef.
  await connecterAvec(page, await chefLecteur(request, p, 'E2E38'));
  await page.goto(gantt(p));
  await expect(barre(page, g.id)).toHaveAttribute('data-type', 'parent');
  await expect(page.getByRole('link', { name: 'Sous-projet E2E38' })).toHaveCount(0);
  await expect(page.locator(`svg [data-projet-id="${p1.id}"]`)).toHaveCount(0);
  // Révision -r1 (D-031, D-127 (4)) : le bouton « Annuler », désactivé, s'ajoute aux trois boutons de zoom.
  // Révision -r3 (D-031, décision du porteur, D-212 (4)) : le bouton « Colonnes », sans écriture, s'y ajoute.
  await expect(page.getByRole('tabpanel').getByRole('button')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Colonnes', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annuler', exact: true })).toBeDisabled();
});

test('E2E-39 : noms accessibles des barres et du jalon', async ({ page, request }) => {
  const m = await monde3b(request, 'E2E39', ['Alice', 'Bob']);
  const p = m.projet.id;
  const a = await activiteAvec(request, p, 'A');
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  const alap = await activiteAvec(request, p, 'ALAP-3', { mode: 'ALAP', fin_valide: '2027-01-06' });
  await m.api.assignation(alap.id, m.gens.Bob!.id, 5);
  await jalonAvec(request, p, 'Jalon libre', { type: 'fixe', date_validee: '2027-01-06' });
  await calculer(request, [p]);
  await page.clock.setFixedTime(J06);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(p));

  await expect(
    page.getByRole('img', { name: 'A, du 04/01/2027 au 06/01/2027', exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('img', { name: /^ALAP-3, du 04\/01\/2027 au 08\/01\/2027, retard$/ }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('img', { name: 'Jalon libre, le 06/01/2027', exact: true }),
  ).toHaveCount(1);
});
