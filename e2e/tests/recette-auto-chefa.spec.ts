// Lot recette-auto (D-204), compte chefa : lignes 57, 59, 60, 62, 63, 64, 73, 74, 77, 87, 88, 89, 90, 92, 94,
// 96 de docs/recette.md. E2E-477 à E2E-492. Valeurs attendues recopiées de la colonne Attendu ; données par l'API.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { colonnesCompletes } from './colonnes-completes.js';
import { libelleCase, lireSaisies, monde } from './lot2e-helpers.js';
import { activiteAvec, calculer, jalonAvec, monde3b } from './lot3b-helpers.js';
import { H14, S, SP, agirApi, sessionDe } from './lot4b-helpers.js';
import {
  EMAIL_BOB,
  EMAIL_CHEF_Q,
  boutonDe,
  ligneValidation,
  ouvrirValidation,
  soumettreAlice,
  imputerEtSoumettre,
} from './lot4c-helpers.js';
import { EMAIL_ALICE, EMAIL_CHEF_P } from './lot4b-helpers.js';
import { confirmation, quitter, rester } from './garde-dialogue-helpers.js';
import { nav, remettreAdminSeul6b } from './lot6b-helpers.js';
import { JOUR_SP, monde4c, soumettreSemaine } from './recette-auto-helpers.js';

const FLAG = 'rgb(190, 18, 60)';
const J06 = '2027-01-06T10:00:00';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

const noms = async (page: Page) =>
  (await nav(page).getByRole('link').allTextContents()).map((t) => t.trim());

test('E2E-477 : ligne 57 : menu du chef de projet non ressource, liste complète', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef A', 'chefa-477@recette.test', 'chef_de_projet');
  await connecterAvec(page, 'chefa-477@recette.test');
  const liste = await noms(page);
  expect(liste).toEqual(['Accueil', 'Projets', 'Plan de charge', 'Validation', 'Modèles']);
  for (const absent of ['Utilisateurs', 'Mes tâches', 'Imputations'])
    expect(liste).not.toContain(absent);
});

/** Monde de validation : Alice sur P4B et Q4B, Bob sur P4B ; chef P connecté ensuite. */
async function mondeValidation(request: Parameters<typeof monde4c>[0]) {
  const m = await monde4c(request);
  const bob = await m.ressourceSurP('Bob 4B', EMAIL_BOB, 'Tâche C');
  return { m, bob };
}

test('E2E-478 : ligne 59 : chef, semaine courante, Alice « Soumise » (P · À valider, Q · Validé), Bob « Soumise » (P · À valider), boutons « Valider » et « Rejeter »', async ({
  page,
  request,
  playwright,
}) => {
  await page.clock.setFixedTime(H14);
  const { m, bob } = await mondeValidation(request);
  const { id } = await soumettreAlice(playwright, m);
  await agirApi(await sessionDe(playwright, EMAIL_CHEF_Q), id, 'valider');
  await imputerEtSoumettre(playwright, bob.email, bob.assignation);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page, S);
  for (const [nom, projets] of [
    ['Alice 4B', ['P4B · À valider', 'Q4B · Validé']],
    ['Bob 4B', ['P4B · À valider']],
  ] as const) {
    const l = ligneValidation(page, nom);
    await expect(l.getByText('Soumise', { exact: true }), nom).toBeVisible();
    for (const p of projets) await expect(l.getByText(p, { exact: true }), nom).toBeVisible();
    await expect(boutonDe(l, `Valider la feuille de ${nom}`), nom).toBeVisible();
    await expect(boutonDe(l, `Rejeter la feuille de ${nom}`), nom).toBeVisible();
  }
});

test('E2E-479 : ligne 60 : chef, semaine précédente, Bob « Validée », Alice « Rejetée », sans « Valider » ni « Rejeter », « Voir » présent', async ({
  page,
  request,
  playwright,
}) => {
  await page.clock.setFixedTime(H14);
  const { m, bob } = await mondeValidation(request);
  const idBob = await soumettreSemaine(playwright, bob.email, SP, bob.assignation, JOUR_SP);
  const idAlice = await soumettreSemaine(playwright, EMAIL_ALICE, SP, [m.sa.id, m.sb.id], JOUR_SP);
  const chef = await sessionDe(playwright, EMAIL_CHEF_P);
  await agirApi(chef, idBob, 'valider');
  await agirApi(chef, idAlice, 'rejeter', { commentaire: 'Imputations du jeudi à revoir' });
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page, SP);
  for (const [nom, statut] of [
    ['Bob 4B', 'Validée'],
    ['Alice 4B', 'Rejetée'],
  ] as const) {
    const l = ligneValidation(page, nom);
    await expect(l.getByText(statut, { exact: true }), nom).toBeVisible();
    await expect(boutonDe(l, `Valider la feuille de ${nom}`), nom).toHaveCount(0);
    await expect(boutonDe(l, `Rejeter la feuille de ${nom}`), nom).toHaveCount(0);
    await expect(boutonDe(l, `Voir la feuille de ${nom}`), nom).toBeVisible();
  }
});

/** Chef (non ressource) de deux projets, Alice affectée aux deux : « Analyse » (2 j) et « Secrète » (3 j). */
async function mondeVueRessource(request: Parameters<typeof preparer>[0]) {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef A', 'chefa-62@recette.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice', 'alice-62@recette.test', 'ressource', true);
  const p1 = await api.projet('R62', 'Projet R', chef.id);
  const p2 = await api.projet('S62', 'Projet S', chef.id);
  for (const [p, jours, nom] of [
    [p1, 2, 'Analyse'],
    [p2, 3, 'Secrète'],
  ] as const) {
    await api.affectation(p.id, alice.id);
    const a = await activiteAvec(request, p.id, nom);
    await api.assignation(a.id, alice.id, jours);
  }
  await calculer(request, [p1.id, p2.id]);
  return { alice, email: 'chefa-62@recette.test' };
}
const listeRessource = (page: Page) => page.getByLabel('Planning de', { exact: true });
const bouton = (page: Page, nom: string) => page.getByRole('button', { name: nom, exact: true });

test('E2E-480-r1 : ligne 62 : chef, « Planning de » Alice : adresse, colonnes, lignes des deux projets, boutons et case masqués', async ({
  page,
  request,
}) => {
  await colonnesCompletes(page);
  const m = await mondeVueRessource(request);
  await connecterAvec(page, m.email);
  await page.goto('/');
  await listeRessource(page).selectOption({ label: 'Alice' });
  await expect(page).toHaveURL(new RegExp(`/\\?ressource=${m.alice.id}(&|$)`));
  const tableau = page.getByRole('region', {
    name: 'Tableau du planning de la ressource',
    exact: true,
  });
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
  await expect(tableau.locator('tbody tr')).toHaveCount(2);
  await expect(tableau.getByRole('link', { name: 'R62', exact: true })).toBeVisible();
  await expect(tableau.getByRole('link', { name: 'S62', exact: true })).toBeVisible();
  for (const nom of ['Calculer', 'Tout déplier']) await expect(bouton(page, nom)).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Initiales', exact: true })).toHaveCount(0);
});

test('E2E-481 : ligne 63 : chef, « Tous les projets » après « Planning de » Alice : Gantt global, zoom conservé', async ({
  page,
  request,
}) => {
  const m = await mondeVueRessource(request);
  await connecterAvec(page, m.email);
  await page.goto(`/?ressource=${m.alice.id}&zoom=mois`);
  await expect(bouton(page, 'Mois')).toHaveAttribute('aria-pressed', 'true');
  await listeRessource(page).selectOption({ label: 'Tous les projets' });
  await expect(page).not.toHaveURL(/ressource=/);
  await expect(page).toHaveURL(/zoom=mois/);
  await expect(page.getByRole('region', { name: 'Tableau du Gantt global' })).toBeVisible();
  await expect(bouton(page, 'Mois')).toHaveAttribute('aria-pressed', 'true');
});

test('E2E-482-r2 : ligne 64 : chef, Accueil, « Tout déplier » : badge « Retard » sur l’activité en retard, cellule vide sur la ligne de projet', async ({
  page,
  request,
}) => {
  await colonnesCompletes(page);
  await page.clock.setFixedTime(J06);
  const m = await monde3b(request, 'E2E482', ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Livraison', {
    mode: 'FDUR',
    duree_validee: 2,
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  await calculer(request, [m.projet.id]);
  await connecterAvec(page, m.emailChef);
  await page.goto('/');
  await expect(bouton(page, 'Tout replier')).toBeVisible(); // D-218 (4), (9) : déplié au chargement
  const tableau = page.getByRole('region', { name: 'Tableau du Gantt global', exact: true });
  const ligneActivite = tableau.getByRole('row').filter({ hasText: 'Livraison' });
  await expect(
    ligneActivite.locator('td').last().getByText('Retard', { exact: true }),
  ).toBeVisible();
  const ligneProjet = tableau.getByRole('row').filter({ hasText: 'Projet E2E482' });
  await expect(ligneProjet.locator('td').last()).toHaveText('');
});

const entete = async (page: Page, colonne: string): Promise<number> => {
  const entetes = (await page.getByRole('columnheader').allTextContents()).map((t) => t.trim());
  const i = entetes.indexOf(colonne);
  expect(i, `colonne « ${colonne} » absente (${entetes.join(', ')})`).toBeGreaterThanOrEqual(0);
  return i;
};
const cellule = async (page: Page, nom: string, colonne: string): Promise<Locator> =>
  page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: nom, exact: true }) })
    .getByRole('cell')
    .nth(await entete(page, colonne));

async function ouvrirGantt(page: Page, projetId: number): Promise<void> {
  await page.goto(`/projets/${projetId}?onglet=gantt`);
  await page.locator('svg[data-zoom]').waitFor();
}

test('E2E-483-r1 : ligne 73 : chef, Gantt du projet, colonnes Vendu et Marge (Cadrage 4 et +1, Conception 2 et −1 en couleur flag, Phase 1 vendu 6, jalon vide)', async ({
  page,
  request,
}) => {
  await colonnesCompletes(page);
  const m = await monde3b(request, 'E2E483', ['Alice']);
  const phase = await activiteAvec(request, m.projet.id, 'Phase 1');
  const cadrage = await activiteAvec(request, m.projet.id, 'Cadrage', {
    parent_id: phase.id,
    charge_vendue: 4,
  });
  const conception = await activiteAvec(request, m.projet.id, 'Conception', {
    parent_id: phase.id,
    charge_vendue: 2,
  });
  await m.api.assignation(cadrage.id, m.gens.Alice!.id, 3);
  await m.api.assignation(conception.id, m.gens.Alice!.id, 3);
  await jalonAvec(request, m.projet.id, 'Fin de phase 1');
  await calculer(request, [m.projet.id]);
  await connecterAvec(page, m.emailChef);
  await ouvrirGantt(page, m.projet.id);
  await expect(await cellule(page, 'Cadrage', 'Vendu')).toHaveText('4');
  await expect(await cellule(page, 'Cadrage', 'Marge')).toHaveText('1');
  await expect(await cellule(page, 'Conception', 'Vendu')).toHaveText('2');
  const marge = await cellule(page, 'Conception', 'Marge');
  await expect(marge).toHaveText('−1');
  await expect(marge).toHaveCSS('color', FLAG);
  await expect(await cellule(page, 'Phase 1', 'Vendu')).toHaveText('6');
  await expect(await cellule(page, 'Fin de phase 1', 'Vendu')).toHaveText('');
  await expect(await cellule(page, 'Fin de phase 1', 'Marge')).toHaveText('');
});

test('E2E-484-r1 : ligne 74 : chef, région « Totaux du projet » : « Vendu 6 j · Assigné 7 j · Marge −1 j · Réel 0 j », marge négative en couleur flag', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E484', ['Alice']);
  const cadrage = await activiteAvec(request, m.projet.id, 'Cadrage', { charge_vendue: 4 });
  const conception = await activiteAvec(request, m.projet.id, 'Conception', { charge_vendue: 2 });
  await m.api.assignation(cadrage.id, m.gens.Alice!.id, 4);
  await m.api.assignation(conception.id, m.gens.Alice!.id, 3);
  await calculer(request, [m.projet.id]);
  await connecterAvec(page, m.emailChef);
  await ouvrirGantt(page, m.projet.id);
  const region = page.getByRole('region', { name: 'Totaux du projet' });
  await expect(region).toHaveText(
    'Vendu 6 j · Assigné 7 j · Marge −1 j · Réel 0 j · Coût planifié 0,00 € · Coût réel 0,00 €',
  );
  await expect(region.getByText('Marge −1 j', { exact: false })).toHaveCSS('color', FLAG);
});

test('E2E-485-r1 : ligne 77 : chef, jalon à date client dépassée : badge « Client », title « Engagement client dépassé »', async ({
  page,
  request,
}) => {
  await colonnesCompletes(page);
  const m = await monde3b(request, 'E2E485', []);
  await jalonAvec(request, m.projet.id, 'Fin de phase 1', {
    type: 'fixe',
    date_validee: '2027-01-08',
    date_client: '2027-01-06',
  });
  await calculer(request, [m.projet.id]);
  await connecterAvec(page, m.emailChef);
  await ouvrirGantt(page, m.projet.id);
  const badge = (await cellule(page, 'Fin de phase 1', 'Drapeaux')).getByText('Client', {
    exact: true,
  });
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute('title', 'Engagement client dépassé');
});

// --- Planning manuel (lignes 87 à 96) : chef, case cochée d'un jour ouvré (mardi 5 janvier 2027) ---

const URL_PM = (m: { projet: { id: number }; man: { id: number } }, mois = '2027-01') =>
  `/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=${mois}`;

async function ouvrirPlanningCoche(
  page: Page,
  request: Parameters<typeof monde>[0],
  suffixe: string,
) {
  const m = await monde(request, suffixe);
  await connecterAvec(page, m.emailChef);
  await page.goto(URL_PM(m));
  const c = page.getByRole('checkbox', { name: libelleCase(m.nomAlice, 5, 'janvier', 'matin') });
  await c.check();
  return { m, c };
}

test('E2E-486 : ligne 87 : Planning manuel, case cochée puis « Mois suivant » : « Abandonner les modifications ? », texte, bouton « Abandonner »', async ({
  page,
  request,
}) => {
  await ouvrirPlanningCoche(page, request, 'E2E486');
  await page.getByRole('button', { name: 'Mois suivant' }).click();
  await expect(confirmation(page)).toBeVisible();
  await expect(confirmation(page)).toContainText(
    'Les modifications non enregistrées seront perdues.',
  );
  await expect(quitter(page)).toBeVisible();
});

test('E2E-487 : ligne 88 : confirmation ouverte, « Annuler » : on reste sur le mois, même adresse, case toujours cochée', async ({
  page,
  request,
}) => {
  const { m, c } = await ouvrirPlanningCoche(page, request, 'E2E487');
  await page.getByRole('button', { name: 'Mois suivant' }).click();
  await rester(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(page).toHaveURL(URL_PM(m));
  await expect(c).toBeChecked();
});

test('E2E-488 : ligne 89 : « Mois suivant » puis « Abandonner » : mois suivant affiché ; retour au mois : case non cochée, rien enregistré', async ({
  page,
  request,
}) => {
  const { m } = await ouvrirPlanningCoche(page, request, 'E2E488');
  await page.getByRole('button', { name: 'Mois suivant' }).click();
  await quitter(page).click();
  await expect(page).toHaveURL(URL_PM(m, '2027-02'));
  await page.getByRole('button', { name: 'Mois précédent' }).click();
  await expect(page).toHaveURL(URL_PM(m));
  await expect(
    page.getByRole('checkbox', { name: libelleCase(m.nomAlice, 5, 'janvier', 'matin') }),
  ).not.toBeChecked();
  expect(await lireSaisies(request, m.man.id, '2027-01')).toEqual([]);
});

test('E2E-489 : ligne 90 : case cochée, « Mois précédent » : une seule confirmation', async ({
  page,
  request,
}) => {
  await ouvrirPlanningCoche(page, request, 'E2E489');
  await page.getByRole('button', { name: 'Mois précédent' }).click();
  await expect(confirmation(page)).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(1);
});

test('E2E-490 : ligne 92 : case cochée, entrée de menu « Accueil » : une seule confirmation ; « Abandonner » mène à « / »', async ({
  page,
  request,
}) => {
  await ouvrirPlanningCoche(page, request, 'E2E490');
  await nav(page).getByRole('link', { name: 'Accueil', exact: true }).click();
  await expect(confirmation(page)).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await quitter(page).click();
  await expect(page).toHaveURL('/');
});

test('E2E-491 : ligne 94 : case cochée, « Enregistrer », puis « Mois suivant » : aucune confirmation', async ({
  page,
  request,
}) => {
  const { m } = await ouvrirPlanningCoche(page, request, 'E2E491');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('status').filter({ hasText: /enregistr/i })).toBeVisible();
  await page.getByRole('button', { name: 'Mois suivant' }).click();
  await expect(page).toHaveURL(URL_PM(m, '2027-02'));
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('E2E-492 : ligne 96 : case cochée, fermeture de l’onglet : message du navigateur (beforeunload)', async ({
  page,
  request,
}) => {
  await ouvrirPlanningCoche(page, request, 'E2E492');
  const attente = page.waitForEvent('dialog');
  await page.close({ runBeforeUnload: true });
  const dialogue = await attente;
  expect(dialogue.type()).toBe('beforeunload');
  await dialogue.dismiss();
});
