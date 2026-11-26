// Lot taux, tranche 2 (D-260 ; SPEC §12.6 point 12, §12.1 point 9) : E2E-684 à E2E-695. Base « administrateur
// seul » avant et après chaque test (taux d'équipe et taux propres supprimés d'abord : clés étrangères vers
// l'équipe et l'utilisateur). Données préparées par l'API, sauf E2E-694 (tout à l'écran) et l'entité dont l'écran
// est l'objet du test. Horloge du navigateur figée au 06/01/2027 (colonnes « Taux du jour »).
// Valeurs attendues recopiées de SPEC §12.6 point 12 et §12.1 point 9.
// Contrat des écrans (phase verte) :
//   - onglet Équipes : bouton de ligne « Taux de <nom> » → dialogue « Taux de l'équipe <nom> » : région
//     « Taux journaliers » (même composant que « Modifier <nom> » : Du, Au, Montant (€), « Ajouter le taux »,
//     « Modifier le taux du JJ/MM/AAAA », « Supprimer le taux du JJ/MM/AAAA »), aide, bouton « Fermer » ;
//   - onglet Affectations (peut_ecrire) : colonne « Taux du jour » (« 600,00 € », « 400,00 € (équipe) », « — »),
//     bouton de ligne « Modifier les taux de <nom> » → dialogue « Taux de <nom> », bouton « Fermer » ;
//   - liste des utilisateurs : colonne « Taux du jour » juste après « Équipe » ;
//   - une seule requête GET /api/taux/du-jour?date=<jour du navigateur> par chargement de colonne.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import pg from 'pg';
import { exigerBaseTest } from '../../scripts/lib/garde-base-test.mjs';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { chefLecteur, remettreAdminSeul6b } from './lot6b-helpers.js';
import { confirmation, quitter, rester } from './garde-dialogue-helpers.js';
import { loginAsAdmin } from './helpers.js';
import { allerA, NOM_ADMIN, ouvrirEquipes } from './lot3c-helpers.js';
import {
  cellule,
  creerEquipeParEcran,
  equipeApi,
  equipesEnBase,
  ligneEquipe,
  releve6a,
  utilisateurApi,
} from './lot6a-helpers.js';

const NBSP = ' ';
const J06 = '2027-01-06T10:00:00';
const DATE_J06 = '2027-01-06';
const AIDE_EQUIPE = "Facultatif. S'applique aux membres ressources sans taux propre à la date.";
const AIDE_RESSOURCE =
  "Facultatif. Sert au calcul des coûts. Sans taux propre à une date, le taux de son équipe s'applique.";
const T_CHEVAUCHEMENT = 'Cette période chevauche un autre taux.';
const T_FIN = 'La date de fin précède la date de début.';
const T_EQUIPE_A_TAUX = "Cette équipe a des taux : supprimez-les d'abord.";
const euro = (montant: string) => `${montant}${NBSP}€`;
const euroEquipe = (montant: string) => `${montant}${NBSP}€ (équipe)`;

async function remettre(): Promise<void> {
  const client = new pg.Client({ connectionString: exigerBaseTest(process.env) });
  await client.connect();
  try {
    await client.query('DELETE FROM taux_equipe');
    await client.query('DELETE FROM taux_journalier');
  } finally {
    await client.end();
  }
  await remettreAdminSeul6b();
}
test.beforeEach(async ({ page }) => {
  await remettre();
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettre);

interface Taux {
  id: number;
  debut: string;
  fin: string | null;
  montant: number;
}

const lire = async <T>(request: APIRequestContext, chemin: string): Promise<T> => {
  const r = await request.get(chemin);
  expect(r.ok(), `GET ${chemin} : ${r.status()}`).toBeTruthy();
  return (await r.json()) as T;
};
const tauxEquipe = (request: APIRequestContext, id: number) =>
  lire<Taux[]>(request, `/api/equipes/${id}/taux`);
const tauxRessource = (request: APIRequestContext, id: number) =>
  lire<Taux[]>(request, `/api/utilisateurs/${id}/taux`);
const histoTauxEquipe = (request: APIRequestContext) =>
  lire<unknown[]>(request, '/api/historique?entite=taux_equipe');

async function poserTauxEquipe(
  request: APIRequestContext,
  equipeId: number,
  corps: Record<string, unknown>,
) {
  const r = await request.post(`/api/equipes/${equipeId}/taux`, { data: corps });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json()) as Taux;
}
async function poserTaux(request: APIRequestContext, id: number, corps: Record<string, unknown>) {
  const r = await request.post(`/api/utilisateurs/${id}/taux`, { data: corps });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json()) as Taux;
}

/** Requêtes /api émises par la page (méthode et chemin avec paramètres). */
function espionnerRequetes(page: Page): { methode: string; chemin: string }[] {
  const vues: { methode: string; chemin: string }[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/api/'))
      vues.push({ methode: r.method(), chemin: u.pathname + u.search });
  });
  return vues;
}
const duJour = (vues: { methode: string; chemin: string }[]) =>
  vues.filter((v) => v.methode === 'GET' && v.chemin.startsWith('/api/taux/du-jour'));
const tauxParRessource = (vues: { methode: string; chemin: string }[]) =>
  vues.filter((v) => v.methode === 'GET' && /^\/api\/utilisateurs\/\d+\/taux/.test(v.chemin));

const regionTaux = (d: Locator) => d.getByRole('region', { name: 'Taux journaliers' });
const lignesTaux = (r: Locator) => r.locator('tbody tr');
async function ajouterTaux(r: Locator, debut: string, fin: string, montant: string) {
  await r.getByLabel('Du', { exact: true }).fill(debut);
  await r.getByLabel('Au', { exact: true }).fill(fin);
  await r.getByLabel('Montant (€)').fill(montant);
  await r.getByRole('button', { name: 'Ajouter le taux' }).click();
}

const dialogueEquipe = (page: Page, nom: string) =>
  page.getByRole('dialog', { name: `Taux de l'équipe ${nom}`, exact: true });
const dialogueRessource = (page: Page, nom: string) =>
  page.getByRole('dialog', { name: `Taux de ${nom}`, exact: true });
const tableauAffectations = (page: Page) =>
  page.getByRole('table', { name: 'Affectations du projet' });
const tableauUtilisateurs = (page: Page) =>
  page.getByRole('table', { name: 'Liste des utilisateurs' });

/** Ouvre l'onglet Équipes puis le dialogue « Taux de l'équipe <nom> » (administrateur connecté). */
async function ouvrirTauxEquipe(page: Page, nom: string): Promise<Locator> {
  await ouvrirEquipes(page);
  await page.getByRole('button', { name: `Taux de ${nom}`, exact: true }).click();
  const d = dialogueEquipe(page, nom);
  await expect(d).toBeVisible();
  return d;
}

async function ouvrirAffectations(page: Page, projetId: number): Promise<void> {
  await page.goto(`/projets/${projetId}`);
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await expect(tableauAffectations(page)).toBeVisible();
}

/** Équipe « Dev <s> » (taux 400 € depuis 2027-01-01, ouvert), son id et le contexte d'API. */
async function equipeAvecTaux(request: APIRequestContext, s: string) {
  const equipeId = await equipeApi(request, `Dev ${s}`);
  const taux = await poserTauxEquipe(request, equipeId, { debut: '2027-01-01', montant: 400 });
  return { equipeId, nom: `Dev ${s}`, taux };
}

test('E2E-684 : onglet Équipes, « Taux de <nom> » : dialogue, aide, « Fermer » ; ajout d’un taux fermé puis ouvert, enregistrés tout de suite', async ({
  page,
  request,
}) => {
  const equipeId = await equipeApi(request, 'Dev 684');
  await loginAsAdmin(page);
  const d = await ouvrirTauxEquipe(page, 'Dev 684');
  const r = regionTaux(d);
  await expect(r).toBeVisible();
  await expect(d.getByText(AIDE_EQUIPE)).toBeVisible();
  await expect(d.getByRole('button', { name: 'Fermer', exact: true })).toBeVisible();
  await expect(lignesTaux(r)).toHaveCount(0);

  await ajouterTaux(r, '2027-01-01', '2027-01-31', '600');
  await expect(lignesTaux(r)).toHaveCount(1);
  expect(await tauxEquipe(request, equipeId)).toEqual([
    {
      id: expect.any(Number),
      equipe_id: equipeId,
      debut: '2027-01-01',
      fin: '2027-01-31',
      montant: 600,
    },
  ]);
  await expect(d).toBeVisible();
  await ajouterTaux(r, '2027-02-01', '', '1234,5');
  await expect(lignesTaux(r)).toHaveCount(2);
  await expect(lignesTaux(r).nth(0)).toContainText('01/01/2027');
  await expect(lignesTaux(r).nth(0)).toContainText('31/01/2027');
  await expect(lignesTaux(r).nth(0)).toContainText(euro('600,00'));
  await expect(lignesTaux(r).nth(1)).toContainText('01/02/2027');
  await expect(lignesTaux(r).nth(1).locator('td').nth(1)).toHaveText('—');
  await expect(lignesTaux(r).nth(1)).toContainText(`1${NBSP}234,50${NBSP}€`);
  expect((await tauxEquipe(request, equipeId)).map((t) => [t.debut, t.fin, t.montant])).toEqual([
    ['2027-01-01', '2027-01-31', 600],
    ['2027-02-01', null, 1234.5],
  ]);
  await d.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(d).toBeHidden();
});

test('E2E-685 : dialogue de l’équipe : modification d’un taux, suppression avec confirmation', async ({
  page,
  request,
}) => {
  const equipeId = await equipeApi(request, 'Dev 685');
  await poserTauxEquipe(request, equipeId, {
    debut: '2027-01-01',
    fin: '2027-01-31',
    montant: 600,
  });
  await loginAsAdmin(page);
  const d = await ouvrirTauxEquipe(page, 'Dev 685');
  const r = regionTaux(d);
  await r.getByRole('button', { name: 'Modifier le taux du 01/01/2027' }).click();
  const m = page.getByRole('dialog', { name: 'Modifier le taux' });
  await expect(m).toBeVisible();
  await expect(m.getByLabel('Montant (€)')).toHaveValue('600');
  await m.getByLabel('Au', { exact: true }).fill('2027-03-31');
  await m.getByLabel('Montant (€)').fill('650,25');
  await m.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(m).toBeHidden();
  await expect(lignesTaux(r).nth(0)).toContainText('31/03/2027');
  await expect(lignesTaux(r).nth(0)).toContainText(euro('650,25'));
  const [t] = await tauxEquipe(request, equipeId);
  expect([t!.debut, t!.fin, t!.montant]).toEqual(['2027-01-01', '2027-03-31', 650.25]);

  await r.getByRole('button', { name: 'Supprimer le taux du 01/01/2027' }).click();
  let c = page.getByRole('dialog', { name: 'Supprimer le taux du 01/01/2027 ?' });
  await expect(c).toBeVisible();
  await c.getByRole('button', { name: 'Annuler' }).click();
  await expect(c).toBeHidden();
  expect(await tauxEquipe(request, equipeId)).toHaveLength(1);
  await r.getByRole('button', { name: 'Supprimer le taux du 01/01/2027' }).click();
  c = page.getByRole('dialog', { name: 'Supprimer le taux du 01/01/2027 ?' });
  await c.getByRole('button', { name: 'Supprimer' }).click();
  await expect(c).toBeHidden();
  await expect(lignesTaux(r)).toHaveCount(0);
  expect(await tauxEquipe(request, equipeId)).toEqual([]);
});

test('E2E-686 : dialogue de l’équipe : refus de chevauchement, de fin antérieure et de montant invalide, base inchangée', async ({
  page,
  request,
}) => {
  const equipeId = await equipeApi(request, 'Dev 686');
  await poserTauxEquipe(request, equipeId, {
    debut: '2027-01-01',
    fin: '2027-01-31',
    montant: 600,
  });
  const instantane = async () =>
    JSON.stringify([await tauxEquipe(request, equipeId), await histoTauxEquipe(request)]);
  const avant = await instantane();
  await loginAsAdmin(page);
  const d = await ouvrirTauxEquipe(page, 'Dev 686');
  const r = regionTaux(d);
  await ajouterTaux(r, '2027-01-31', '2027-02-28', '700');
  await expect(r.getByRole('alert')).toHaveText(T_CHEVAUCHEMENT);
  await expect(d).toBeVisible();
  await expect(lignesTaux(r)).toHaveCount(1);
  expect(await instantane()).toBe(avant);
  await ajouterTaux(r, '2027-03-10', '2027-03-09', '700');
  await expect(r.getByRole('alert')).toHaveText(T_FIN);
  expect(await instantane()).toBe(avant);
  await r.getByLabel('Montant (€)').fill('0');
  await expect(r.getByLabel('Montant (€)')).toHaveAttribute('aria-invalid', 'true');
  await expect(r.getByText('Montant invalide.')).toBeVisible();
  await expect(r.getByRole('button', { name: 'Ajouter le taux' })).toBeDisabled();
  expect(await instantane()).toBe(avant);
});

test('E2E-687 : dialogue de l’équipe, garde D-188 : un ajout saisi non envoyé compte comme une modification', async ({
  page,
  request,
}) => {
  const equipeId = await equipeApi(request, 'Dev 687');
  await poserTauxEquipe(request, equipeId, { debut: '2027-01-01', montant: 600 });
  await loginAsAdmin(page);
  const d = await ouvrirTauxEquipe(page, 'Dev 687');
  const r = regionTaux(d);
  await r.getByLabel('Montant (€)').click();
  await r.getByLabel('Montant (€)').fill('800');
  await d.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(confirmation(page)).toBeVisible();
  await rester(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(r.getByLabel('Montant (€)')).toHaveValue('800');
  await d.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(confirmation(page)).toBeVisible();
  await quitter(page).click();
  await expect(d).toBeHidden();
  expect(await tauxEquipe(request, equipeId)).toHaveLength(1);
});

test('E2E-688 : suppression d’une équipe qui a des taux : refus affiché, confirmation ouverte, rien de modifié ; réussite après suppression des taux', async ({
  page,
  request,
}) => {
  const e = await equipeAvecTaux(request, '688');
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  const avant = JSON.stringify([
    await releve6a(),
    await tauxEquipe(request, e.equipeId),
    await histoTauxEquipe(request),
  ]);
  await page.getByRole('button', { name: `Supprimer ${e.nom}` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(`Supprimer ${e.nom} ?`);
  await dialog.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(dialog.getByText(T_EQUIPE_A_TAUX)).toBeVisible();
  await expect(dialog).toContainText(`Supprimer ${e.nom} ?`);
  expect(
    JSON.stringify([
      await releve6a(),
      await tauxEquipe(request, e.equipeId),
      await histoTauxEquipe(request),
    ]),
  ).toBe(avant);
  expect((await equipesEnBase()).map((x) => x.nom)).toEqual([e.nom]);
  await dialog.getByRole('button', { name: 'Annuler' }).click();

  const r = await request.delete(`/api/taux-equipe/${e.taux.id}`);
  expect(r.status()).toBe(204);
  await page.reload();
  await page.getByRole('tab', { name: 'Équipes', exact: true }).click();
  await page.getByRole('button', { name: `Supprimer ${e.nom}` }).click();
  await dialog.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(ligneEquipe(page, e.nom)).toHaveCount(0);
  expect(await equipesEnBase()).toEqual([]);
});

/** Monde des colonnes : équipe « Dev » (400 € depuis 2027-01-01), Alice (propre 600 € en janvier), Dave (équipe seule), Erin (rien). */
async function mondeTaux(request: APIRequestContext, s: string) {
  const api = await preparer(request);
  const t = s.toLowerCase();
  const equipe = await equipeAvecTaux(request, s);
  const chef = await api.utilisateur(`Chef ${s}`, `chef-${t}@taux2.test`, 'chef_de_projet');
  const aliceId = await utilisateurApi(
    request,
    `Alice ${s}`,
    `alice-${t}@taux2.test`,
    equipe.equipeId,
  );
  const daveId = await utilisateurApi(
    request,
    `Dave ${s}`,
    `dave-${t}@taux2.test`,
    equipe.equipeId,
  );
  const erinId = await utilisateurApi(request, `Erin ${s}`, `erin-${t}@taux2.test`);
  await poserTaux(request, aliceId, { debut: '2027-01-01', fin: '2027-01-31', montant: 600 });
  const projet = await api.projet(`P-${s}`, `Projet ${s}`, chef.id);
  for (const id of [aliceId, daveId, erinId]) await api.affectation(projet.id, id);
  return { api, equipe, chef, projet, aliceId, daveId, erinId, emailChef: `chef-${t}@taux2.test` };
}

test('E2E-689 : onglet Affectations (écrivain), colonne « Taux du jour » : propre, « (équipe) », « — » ; une seule requête du-jour', async ({
  page,
  request,
}) => {
  const m = await mondeTaux(request, '689');
  await page.clock.setFixedTime(J06);
  await loginAsAdmin(page);
  const vues = espionnerRequetes(page);
  await ouvrirAffectations(page, m.projet.id);
  const t = tableauAffectations(page);
  await expect(t.getByRole('columnheader', { name: 'Taux du jour' })).toBeVisible();
  await expect(await cellule(t, 'Alice 689', 'Taux du jour')).toHaveText(euro('600,00'));
  await expect(await cellule(t, 'Dave 689', 'Taux du jour')).toHaveText(euroEquipe('400,00'));
  await expect(await cellule(t, 'Erin 689', 'Taux du jour')).toHaveText('—');
  expect(duJour(vues).map((v) => v.chemin)).toEqual([`/api/taux/du-jour?date=${DATE_J06}`]);
  expect(tauxParRessource(vues)).toEqual([]);
});

test('E2E-690 : Affectations : « Modifier les taux de <nom> », taux propres seuls, ajout à l’écran, colonne relue à la fermeture', async ({
  page,
  request,
}) => {
  const m = await mondeTaux(request, '690');
  await page.clock.setFixedTime(J06);
  await loginAsAdmin(page);
  const vues = espionnerRequetes(page);
  await ouvrirAffectations(page, m.projet.id);
  const t = tableauAffectations(page);
  await expect(await cellule(t, 'Dave 690', 'Taux du jour')).toHaveText(euroEquipe('400,00'));
  expect(duJour(vues)).toHaveLength(1);

  await t.getByRole('button', { name: 'Modifier les taux de Dave 690', exact: true }).click();
  const d = dialogueRessource(page, 'Dave 690');
  await expect(d).toBeVisible();
  await expect(d.getByText(AIDE_RESSOURCE)).toBeVisible();
  await expect(d.getByRole('button', { name: 'Fermer', exact: true })).toBeVisible();
  const r = regionTaux(d);
  await expect(r).toBeVisible();
  await expect(lignesTaux(r)).toHaveCount(0); // le taux de l'équipe n'est pas un taux propre
  await ajouterTaux(r, '2027-01-01', '', '700');
  await expect(lignesTaux(r)).toHaveCount(1);
  await expect(lignesTaux(r).nth(0)).toContainText(euro('700,00'));
  expect((await tauxRessource(request, m.daveId)).map((x) => [x.debut, x.fin, x.montant])).toEqual([
    ['2027-01-01', null, 700],
  ]);
  await d.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(d).toBeHidden();
  await expect(await cellule(t, 'Dave 690', 'Taux du jour')).toHaveText(euro('700,00'));
  expect(duJour(vues)).toHaveLength(2);
});

test('E2E-691 : Affectations en lecture seule : ni colonne « Taux du jour » ni bouton « Modifier les taux de <nom> »', async ({
  page,
  request,
}) => {
  const m = await mondeTaux(request, '691');
  const emailLecteur = await chefLecteur(request, m.projet.id, 'T691');
  await page.clock.setFixedTime(J06);
  await connecterAvec(page, emailLecteur);
  await ouvrirAffectations(page, m.projet.id);
  const t = tableauAffectations(page);
  await expect(t.getByRole('columnheader', { name: 'Ressource' })).toBeVisible();
  await expect(t.getByRole('row', { name: /Alice 691/ })).toBeVisible();
  await expect(t.getByRole('columnheader', { name: 'Taux du jour' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Modifier les taux de / })).toHaveCount(0);
});

test('E2E-692 : liste des utilisateurs : colonne « Taux du jour » après « Équipe » ; propre, « (équipe) », « — » ; une seule requête du-jour', async ({
  page,
  request,
}) => {
  await mondeTaux(request, '692');
  await page.clock.setFixedTime(J06);
  await loginAsAdmin(page);
  const vues = espionnerRequetes(page);
  await allerA(page, 'Utilisateurs');
  const t = tableauUtilisateurs(page);
  await expect(t.getByRole('columnheader', { name: 'Taux du jour' })).toBeVisible();
  const entetes = (await t.getByRole('columnheader').allTextContents()).map((x) => x.trim());
  expect(entetes.indexOf('Taux du jour')).toBe(entetes.indexOf('Équipe') + 1);
  await expect(await cellule(t, 'Alice 692', 'Taux du jour')).toHaveText(euro('600,00'));
  await expect(await cellule(t, 'Dave 692', 'Taux du jour')).toHaveText(euroEquipe('400,00'));
  await expect(await cellule(t, 'Erin 692', 'Taux du jour')).toHaveText('—');
  await expect(await cellule(t, 'Chef 692', 'Taux du jour')).toHaveText('—'); // non ressource
  expect(duJour(vues).map((v) => v.chemin)).toEqual([`/api/taux/du-jour?date=${DATE_J06}`]);
  expect(tauxParRessource(vues)).toEqual([]);
});

test('E2E-693 : liste des utilisateurs relue après un taux ajouté dans « Modifier <nom> » ; à jour au retour sur l’onglet après un changement de taux d’équipe', async ({
  page,
  request,
}) => {
  const m = await mondeTaux(request, '693');
  await page.clock.setFixedTime(J06);
  await loginAsAdmin(page);
  await allerA(page, 'Utilisateurs');
  const t = tableauUtilisateurs(page);
  await expect(await cellule(t, 'Dave 693', 'Taux du jour')).toHaveText(euroEquipe('400,00'));

  // taux propre ajouté dans « Modifier <nom> »
  await page.getByRole('button', { name: 'Modifier Dave 693', exact: true }).click();
  const u = page.getByRole('dialog', { name: 'Modifier Dave 693' });
  await ajouterTaux(regionTaux(u), '2027-01-01', '', '720');
  await expect(lignesTaux(regionTaux(u))).toHaveCount(1);
  await u.getByRole('button', { name: 'Annuler' }).click();
  await expect(u).toBeHidden();
  await expect(await cellule(t, 'Dave 693', 'Taux du jour')).toHaveText(euro('720,00'));

  // taux de l'équipe modifié, puis dialogue fermé : Fred (membre de l'équipe, sans taux propre) change
  await utilisateurApi(request, 'Fred 693', 'fred-693@taux2.test', m.equipe.equipeId);
  await page.getByRole('tab', { name: 'Équipes', exact: true }).click();
  await page.getByRole('button', { name: `Taux de ${m.equipe.nom}`, exact: true }).click();
  const d = dialogueEquipe(page, m.equipe.nom);
  await d.getByRole('button', { name: 'Modifier le taux du 01/01/2027' }).click();
  const mod = page.getByRole('dialog', { name: 'Modifier le taux' });
  await mod.getByLabel('Montant (€)').fill('450');
  await mod.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(mod).toBeHidden();
  await d.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(d).toBeHidden();
  await page.getByRole('tab', { name: 'Utilisateurs', exact: true }).click();
  await expect(await cellule(t, 'Fred 693', 'Taux du jour')).toHaveText(euroEquipe('450,00'));
  await expect(await cellule(t, 'Dave 693', 'Taux du jour')).toHaveText(euro('720,00'));
  expect((await tauxEquipe(request, m.equipe.equipeId)).map((x) => x.montant)).toEqual([450]);
});

async function cocher(page: Page, titres: string[]) {
  await page.getByRole('button', { name: 'Colonnes', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  for (const t of titres)
    await menu.getByRole('menuitemcheckbox', { name: t, exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
}

/** Cellule de la ligne de `nom` dans la colonne `colonne` du tableau du Gantt (nom en texte exact). */
async function celluleGantt(zone: Locator, nom: string, colonne: string): Promise<Locator> {
  const entetes = (await zone.getByRole('columnheader').allTextContents()).map((x) => x.trim());
  const i = entetes.indexOf(colonne);
  expect(
    i,
    `colonne « ${colonne} » absente (colonnes : ${entetes.join(', ')})`,
  ).toBeGreaterThanOrEqual(0);
  const ligne = zone.getByRole('row').filter({ has: zone.page().getByText(nom, { exact: true }) });
  return ligne.getByRole('cell').nth(i);
}

test('E2E-694 : parcours complet à l’écran, base « administrateur seul » : équipe, taux d’équipe, ressource, projet, affectation, « (équipe) », taux propre, Coût planifié du Gantt', async ({
  page,
}) => {
  const RESSOURCE = 'Zoé 694';
  await page.clock.setFixedTime(J06);
  await loginAsAdmin(page);

  await ouvrirEquipes(page);
  await creerEquipeParEcran(page, 'Équipe 694');
  await page.getByRole('button', { name: 'Taux de Équipe 694', exact: true }).click();
  const de = dialogueEquipe(page, 'Équipe 694');
  await expect(de).toBeVisible();
  await ajouterTaux(regionTaux(de), '2000-01-01', '', '400');
  await expect(lignesTaux(regionTaux(de))).toHaveCount(1);
  await de.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(de).toBeHidden();

  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const nu = page.getByRole('dialog', { name: 'Nouvel utilisateur' });
  await nu.getByLabel('Nom').fill(RESSOURCE);
  await nu.getByLabel('Email').fill('zoe-694@taux2.test');
  await nu.getByLabel('Mot de passe', { exact: true }).fill('mot-de-passe-e2e-lot1');
  await nu.getByLabel('Calendrier').selectOption({ label: 'Calendrier par défaut' });
  await nu.getByLabel('Équipe', { exact: true }).selectOption({ label: 'Équipe 694' });
  await nu.getByRole('button', { name: 'Créer' }).click();
  await expect(nu).toBeHidden();
  await expect(page.getByRole('row', { name: new RegExp(RESSOURCE) })).toBeVisible();
  await expect(await cellule(tableauUtilisateurs(page), RESSOURCE, 'Taux du jour')).toHaveText(
    euroEquipe('400,00'),
  );

  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const np = page.getByRole('dialog');
  await np.getByLabel('Code').fill('P694');
  await np.getByLabel('Nom').fill('Projet 694');
  await np.getByLabel('Chef de projet').selectOption({ label: NOM_ADMIN });
  await np.getByLabel('Pas avant le').fill('2027-01-04');
  await np.getByRole('button', { name: 'Créer' }).click();
  await page.getByRole('link', { name: 'Projet 694' }).click();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  const af = page.getByRole('dialog', { name: 'Affecter une ressource' });
  await af.getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await af.getByRole('button', { name: 'Affecter' }).click();
  await expect(af).toBeHidden();
  const ta = tableauAffectations(page);
  await expect(await cellule(ta, RESSOURCE, 'Taux du jour')).toHaveText(euroEquipe('400,00'));

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const na = page.getByRole('dialog', { name: 'Nouvelle activité' });
  await na.getByLabel('Nom').fill('Étude 694');
  await na.getByRole('button', { name: 'Créer' }).click();
  await expect(na).toBeHidden();
  await page.getByRole('button', { name: 'Assigner une ressource à Étude 694' }).click();
  const as = page.getByRole('dialog');
  await as.getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await as.getByLabel('Charge assignée (j)').fill('4');
  await as.getByRole('button', { name: 'Assigner' }).click();
  await expect(as).toBeHidden();

  await page.getByRole('tab', { name: 'Affectations' }).click();
  await ta.getByRole('button', { name: `Modifier les taux de ${RESSOURCE}`, exact: true }).click();
  const dr = dialogueRessource(page, RESSOURCE);
  await expect(dr).toBeVisible();
  await ajouterTaux(regionTaux(dr), '2000-01-01', '', '600');
  await expect(lignesTaux(regionTaux(dr))).toHaveCount(1);
  await dr.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(dr).toBeHidden();
  await expect(await cellule(ta, RESSOURCE, 'Taux du jour')).toHaveText(euro('600,00'));

  await allerA(page, 'Utilisateurs');
  await expect(await cellule(tableauUtilisateurs(page), RESSOURCE, 'Taux du jour')).toHaveText(
    euro('600,00'),
  );

  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 694' }).click();
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await page.locator('svg[data-zoom]').waitFor();
  await cocher(page, ['Coût planifié']);
  const z = page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
  await expect(await celluleGantt(z, 'Étude 694', 'Coût planifié')).toHaveText(
    euro(`2${NBSP}400,00`),
  );
});

test('E2E-695 : chef de projet : « Modifier les taux de <nom> » dans son projet, ajout d’un taux, colonne relue ; absents dans un projet lu seulement', async ({
  page,
  request,
}) => {
  const m = await mondeTaux(request, '695');
  // projet d'un autre chef, où le chef de 695 est seulement affecté (lecture seule)
  const autre = await m.api.utilisateur('Autre 695', 'autre-695@taux2.test', 'chef_de_projet');
  const projetLu = await m.api.projet('L695', 'Projet lu 695', autre.id);
  await m.api.affectation(projetLu.id, m.daveId);
  const chefRes = await m.api.utilisateur(
    'Chef res 695',
    'chef-res-695@taux2.test',
    'chef_de_projet',
    true,
  );
  await m.api.affectation(projetLu.id, chefRes.id);
  const projetEcrit = await m.api.projet('E695', 'Projet écrit 695', chefRes.id);
  await m.api.affectation(projetEcrit.id, m.daveId);

  await page.clock.setFixedTime(J06);
  await connecterAvec(page, 'chef-res-695@taux2.test');
  await ouvrirAffectations(page, projetEcrit.id);
  const t = tableauAffectations(page);
  await expect(await cellule(t, 'Dave 695', 'Taux du jour')).toHaveText(euroEquipe('400,00'));
  await t.getByRole('button', { name: 'Modifier les taux de Dave 695', exact: true }).click();
  const d = dialogueRessource(page, 'Dave 695');
  await expect(d).toBeVisible();
  await ajouterTaux(regionTaux(d), '2027-01-01', '', '650');
  await expect(lignesTaux(regionTaux(d))).toHaveCount(1);
  expect((await tauxRessource(request, m.daveId)).map((x) => [x.debut, x.fin, x.montant])).toEqual([
    ['2027-01-01', null, 650],
  ]);
  await d.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(d).toBeHidden();
  await expect(await cellule(t, 'Dave 695', 'Taux du jour')).toHaveText(euro('650,00'));

  await ouvrirAffectations(page, projetLu.id);
  const tl = tableauAffectations(page);
  await expect(tl.getByRole('row', { name: /Dave 695/ })).toBeVisible();
  await expect(tl.getByRole('columnheader', { name: 'Taux du jour' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Modifier les taux de / })).toHaveCount(0);
});
