// Lot couts, tranche 1 (D-225 ; SPEC §12.1, §12.2, §11.2) : E2E-607 à E2E-620. Base « administrateur seul » avant et
// après chaque test (taux supprimés d'abord : clé étrangère vers l'utilisateur). Données préparées par l'API (sauf
// E2E-618, tout à l'écran) ; saisies faites par l'écran, effets relus par l'API et dans l'écran consommateur.
// Valeurs attendues recopiées de SPEC §12.1 et §12.2.
// Contrat des écrans (phase verte) :
//   - dialogue « Modifier <nom> » d'une ressource : région « Taux journaliers » (h3), aide « Facultatif. Sert au calcul
//     des coûts. », tableau (Du, Au, Montant, Actions), champs « Du », « Au », « Montant (€) », bouton « Ajouter le
//     taux », boutons de ligne « Modifier le taux du JJ/MM/AAAA » et « Supprimer le taux du JJ/MM/AAAA » ;
//   - dialogue « Modifier le taux » (Du, Au, Montant (€), Enregistrer) ;
//   - onglet Affectations : colonne « Taux du jour » si peut_ecrire ;
//   - champ « OTP » dans « Nouveau projet », « Modifier le projet », « Nouveau modèle », « Nouvelle activité »,
//     « Modifier l’activité » ; aide « Hérité de … : … » sous le champ.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import pg from 'pg';
import { exigerBaseTest } from '../../scripts/lib/garde-base-test.mjs';
import { connecterAvec, ouvrirModeles, preparer } from './lot1-helpers.js';
import { activiteAvec, sousProjet } from './lot3b-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';
import { confirmation, quitter } from './garde-dialogue-helpers.js';
import { loginAsAdmin } from './helpers.js';
import { allerA, creerRessourceParEcran, NOM_ADMIN } from './lot3c-helpers.js';
import { cheminCapture } from './captures.js';

const NBSP = ' ';
const AIDE_TAUX = 'Facultatif. Sert au calcul des coûts.';
const T_CHEVAUCHEMENT = 'Cette période chevauche un autre taux.';
const T_FIN = 'La date de fin précède la date de début.';
const T_RESTE_RESSOURCE = 'Cet utilisateur a des taux journaliers : il reste ressource.';
const J06 = '2027-01-06T10:00:00';

async function remettre(): Promise<void> {
  const client = new pg.Client({ connectionString: exigerBaseTest(process.env) });
  await client.connect();
  try {
    // Table absente avant la migration 015 : rien à supprimer.
    await client.query(
      "DO $$ BEGIN IF to_regclass('taux_journalier') IS NOT NULL THEN DELETE FROM taux_journalier; END IF; END $$",
    );
  } finally {
    await client.end();
  }
  await remettreAdminSeul6b();
}
test.beforeEach(remettre);
test.afterEach(remettre);

interface Taux {
  id: number;
  debut: string;
  fin: string | null;
  montant: number;
}
interface Otp {
  otp: string | null;
  otp_effectif: string | null;
  otp_source: { type: string; id: number | null; libelle: string | null } | null;
}

const lire = async <T>(request: APIRequestContext, chemin: string): Promise<T> => {
  const r = await request.get(chemin);
  expect(r.ok(), `GET ${chemin} : ${r.status()}`).toBeTruthy();
  return (await r.json()) as T;
};
const tauxDe = (request: APIRequestContext, id: number) =>
  lire<Taux[]>(request, `/api/utilisateurs/${id}/taux`);
const histoTaux = (request: APIRequestContext) =>
  lire<unknown[]>(request, '/api/historique?entite=taux');
async function poserTaux(request: APIRequestContext, id: number, corps: Record<string, unknown>) {
  const r = await request.post(`/api/utilisateurs/${id}/taux`, { data: corps });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json()) as Taux;
}
async function patcher(request: APIRequestContext, chemin: string, corps: Record<string, unknown>) {
  const r = await request.fetch(chemin, { method: 'PATCH', data: corps });
  expect(r.ok(), `PATCH ${chemin} : ${r.status()} ${await r.text()}`).toBeTruthy();
}

/** Ouvre « Modifier <nom> » dans l'écran Utilisateurs (administrateur connecté). */
async function ouvrirUtilisateur(page: Page, nom: string): Promise<Locator> {
  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: `Modifier ${nom}`, exact: true }).click();
  const d = page.getByRole('dialog', { name: `Modifier ${nom}` });
  await expect(d).toBeVisible();
  return d;
}
const regionTaux = (d: Locator) => d.getByRole('region', { name: 'Taux journaliers' });
const lignesTaux = (r: Locator) => r.locator('tbody tr');

async function ajouterTaux(r: Locator, debut: string, fin: string, montant: string) {
  await r.getByLabel('Du', { exact: true }).fill(debut);
  await r.getByLabel('Au', { exact: true }).fill(fin);
  await r.getByLabel('Montant (€)').fill(montant);
  await r.getByRole('button', { name: 'Ajouter le taux' }).click();
}

/** Une ressource « Alice <s> » et son id ; l'administrateur est connecté sur `request`. */
async function ressource(request: APIRequestContext, s: string) {
  const api = await preparer(request);
  const email = `alice-${s.toLowerCase()}@example.test`;
  const u = await api.utilisateur(`Alice ${s}`, email, 'ressource', true);
  return { api, id: u.id, nom: `Alice ${s}`, email };
}

test('E2E-607 : section « Taux journaliers » ; ajout d’un taux fermé puis ouvert, enregistrés tout de suite', async ({
  page,
  request,
}) => {
  const a = await ressource(request, 'T607');
  await loginAsAdmin(page);
  const d = await ouvrirUtilisateur(page, a.nom);
  const r = regionTaux(d);
  await expect(r).toBeVisible();
  await expect(r.getByText(AIDE_TAUX)).toBeVisible();
  await ajouterTaux(r, '2027-01-01', '2027-01-31', '600');
  await expect(lignesTaux(r)).toHaveCount(1);
  expect(await tauxDe(request, a.id)).toEqual([
    {
      id: expect.any(Number),
      utilisateur_id: a.id,
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
  await expect(lignesTaux(r).nth(0)).toContainText(`600,00${NBSP}€`);
  await expect(lignesTaux(r).nth(1)).toContainText('01/02/2027');
  await expect(lignesTaux(r).nth(1).locator('td').nth(1)).toHaveText('—');
  await expect(lignesTaux(r).nth(1)).toContainText(`1${NBSP}234,50${NBSP}€`);
  const relus = await tauxDe(request, a.id);
  expect(relus.map((t) => [t.debut, t.fin, t.montant])).toEqual([
    ['2027-01-01', '2027-01-31', 600],
    ['2027-02-01', null, 1234.5],
  ]);
});

test('E2E-608 : modification d’un taux par l’écran (fin et montant)', async ({ page, request }) => {
  const a = await ressource(request, 'T608');
  await poserTaux(request, a.id, { debut: '2027-01-01', fin: '2027-01-31', montant: 600 });
  await loginAsAdmin(page);
  const d = await ouvrirUtilisateur(page, a.nom);
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
  await expect(lignesTaux(r).nth(0)).toContainText(`650,25${NBSP}€`);
  const [t] = await tauxDe(request, a.id);
  expect([t!.debut, t!.fin, t!.montant]).toEqual(['2027-01-01', '2027-03-31', 650.25]);
});

test('E2E-609 : suppression d’un taux avec confirmation (Annuler, puis Supprimer)', async ({
  page,
  request,
}) => {
  const a = await ressource(request, 'T609');
  await poserTaux(request, a.id, { debut: '2027-01-01', montant: 600 });
  await loginAsAdmin(page);
  const d = await ouvrirUtilisateur(page, a.nom);
  const r = regionTaux(d);
  await r.getByRole('button', { name: 'Supprimer le taux du 01/01/2027' }).click();
  let c = page.getByRole('dialog', { name: 'Supprimer le taux du 01/01/2027 ?' });
  await expect(c).toBeVisible();
  await c.getByRole('button', { name: 'Annuler' }).click();
  await expect(c).toBeHidden();
  expect(await tauxDe(request, a.id)).toHaveLength(1);
  await r.getByRole('button', { name: 'Supprimer le taux du 01/01/2027' }).click();
  c = page.getByRole('dialog', { name: 'Supprimer le taux du 01/01/2027 ?' });
  await c.getByRole('button', { name: 'Supprimer' }).click();
  await expect(c).toBeHidden();
  await expect(lignesTaux(r)).toHaveCount(0);
  expect(await tauxDe(request, a.id)).toEqual([]);
});

test('E2E-610 : refus de chevauchement et de fin antérieure dans le dialogue, base inchangée ; montant invalide', async ({
  page,
  request,
}) => {
  const a = await ressource(request, 'T610');
  await poserTaux(request, a.id, { debut: '2027-01-01', fin: '2027-01-31', montant: 600 });
  const avant = JSON.stringify([await tauxDe(request, a.id), await histoTaux(request)]);
  await loginAsAdmin(page);
  const d = await ouvrirUtilisateur(page, a.nom);
  const r = regionTaux(d);
  await ajouterTaux(r, '2027-01-31', '2027-02-28', '700');
  await expect(r.getByRole('alert')).toHaveText(T_CHEVAUCHEMENT);
  await expect(d).toBeVisible();
  await expect(lignesTaux(r)).toHaveCount(1);
  expect(JSON.stringify([await tauxDe(request, a.id), await histoTaux(request)])).toBe(avant);
  await ajouterTaux(r, '2027-03-10', '2027-03-09', '700');
  await expect(r.getByRole('alert')).toHaveText(T_FIN);
  expect(JSON.stringify([await tauxDe(request, a.id), await histoTaux(request)])).toBe(avant);
  await r.getByLabel('Montant (€)').fill('0');
  await expect(r.getByLabel('Montant (€)')).toHaveAttribute('aria-invalid', 'true');
  await expect(r.getByText('Montant invalide.')).toBeVisible();
  await expect(r.getByRole('button', { name: 'Ajouter le taux' })).toBeDisabled();
});

test('E2E-611 : section absente hors ressource et à la création ; « Ressource planifiable » décochée refusée ; garde', async ({
  page,
  request,
}) => {
  const a = await ressource(request, 'T611');
  await a.api.utilisateur('Chef T611', 'chef-t611@example.test', 'chef_de_projet');
  await poserTaux(request, a.id, { debut: '2027-01-01', montant: 600 });
  await loginAsAdmin(page);
  let d = await ouvrirUtilisateur(page, 'Chef T611');
  await expect(regionTaux(d)).toHaveCount(0);
  await d.getByRole('button', { name: 'Annuler' }).click();
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const n = page.getByRole('dialog', { name: 'Nouvel utilisateur' });
  await expect(n).toBeVisible();
  await expect(regionTaux(n)).toHaveCount(0);
  await n.getByRole('button', { name: 'Annuler' }).click();

  const avant = await lire<unknown>(request, '/api/utilisateurs');
  d = await ouvrirUtilisateur(page, a.nom);
  await d.getByRole('checkbox', { name: 'Ressource planifiable' }).click();
  await d.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(d.getByRole('alert').first()).toHaveText(T_RESTE_RESSOURCE);
  await expect(d).toBeVisible();
  expect(await lire<unknown>(request, '/api/utilisateurs')).toEqual(avant);
  expect(await tauxDe(request, a.id)).toHaveLength(1);
  await d.getByRole('checkbox', { name: 'Ressource planifiable' }).click();

  // garde D-188 : un ajout saisi non envoyé compte comme une modification
  const r = regionTaux(d);
  await r.getByLabel('Montant (€)').click();
  await r.getByLabel('Montant (€)').fill('800');
  await d.getByRole('button', { name: 'Annuler' }).click();
  await expect(confirmation(page)).toBeVisible();
  await quitter(page).click();
  await expect(d).toBeHidden();
  expect(await tauxDe(request, a.id)).toHaveLength(1);
});

test('E2E-612 : onglet Affectations, colonne « Taux du jour » (horloge figée) ; chef qui écrit : présente ; lecture seule : absente', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef T612', 'chef-t612@example.test', 'chef_de_projet');
  const lecteur = await api.utilisateur(
    'Lecteur T612',
    'lect-t612@example.test',
    'chef_de_projet',
    true,
  );
  const alice = await api.utilisateur('Alice T612', 'alice-t612@example.test', 'ressource', true);
  const bob = await api.utilisateur('Bob T612', 'bob-t612@example.test', 'ressource', true);
  const carl = await api.utilisateur('Carl T612', 'carl-t612@example.test', 'ressource', true);
  const projet = await api.projet('T612', 'Projet T612', chef.id);
  for (const u of [alice, bob, carl, lecteur]) await api.affectation(projet.id, u.id);
  await poserTaux(request, alice.id, { debut: '2027-01-01', fin: '2027-01-31', montant: 600 });
  await poserTaux(request, alice.id, { debut: '2027-02-01', montant: 700 });
  await poserTaux(request, carl.id, { debut: '2027-02-01', montant: 500 }); // hors période le 06/01

  const verifier = async (p: Page) => {
    const t = p.getByRole('table', { name: 'Affectations du projet' });
    await expect(t.getByRole('columnheader', { name: 'Taux du jour' })).toBeVisible();
    const cellule = (nom: string) =>
      t
        .getByRole('row', { name: new RegExp(nom) })
        .getByRole('cell')
        .nth(4);
    await expect(cellule('Alice T612')).toHaveText(`600,00${NBSP}€`);
    await expect(cellule('Bob T612')).toHaveText('—');
    await expect(cellule('Carl T612')).toHaveText('—');
  };
  await page.clock.setFixedTime(J06);
  await loginAsAdmin(page);
  await page.goto(`/projets/${projet.id}`);
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await verifier(page);

  await page.context().clearCookies();
  await connecterAvec(page, 'chef-t612@example.test');
  await page.goto(`/projets/${projet.id}`);
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await verifier(page);

  await page.context().clearCookies();
  await connecterAvec(page, 'lect-t612@example.test');
  await page.goto(`/projets/${projet.id}`);
  await page.getByRole('tab', { name: 'Affectations' }).click();
  const t = page.getByRole('table', { name: 'Affectations du projet' });
  await expect(t.getByRole('columnheader', { name: 'Ressource' })).toBeVisible();
  await expect(t.getByRole('columnheader', { name: 'Taux du jour' })).toHaveCount(0);
});

/** Champ « OTP » d'un dialogue et son aide. */
const champOtp = (d: Locator) => d.getByLabel('OTP', { exact: true });

test('E2E-613 : OTP propre d’un projet saisi à la création puis modifié ; 50 caractères au plus ; vidé = null', async ({
  page,
  request,
}) => {
  await preparer(request);
  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const n = page.getByRole('dialog');
  await n.getByLabel('Code').fill('O613');
  await n.getByLabel('Nom').fill('Projet O613');
  await n.getByLabel('Chef de projet').selectOption({ label: NOM_ADMIN });
  await n.getByLabel('Pas avant le').fill('2027-01-04');
  await expect(champOtp(n)).toHaveAttribute('maxlength', '50');
  await champOtp(n).fill(' FIN-613 ');
  await n.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Projet O613/ })).toBeVisible();
  const projets = await lire<(Otp & { id: number; code: string })[]>(request, '/api/projets');
  const p = projets.find((x) => x.code === 'O613')!;
  expect(p.otp).toBe('FIN-613');

  await page.getByRole('link', { name: 'Projet O613' }).click();
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  let m = page.getByRole('dialog', { name: 'Modifier le projet' });
  await expect(champOtp(m)).toHaveValue('FIN-613');
  await champOtp(m).fill('FIN-613-B');
  await m.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(m).toBeHidden();
  expect((await lire<Otp>(request, `/api/projets/${p.id}`)).otp).toBe('FIN-613-B');
  await page.reload();
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  m = page.getByRole('dialog', { name: 'Modifier le projet' });
  await expect(champOtp(m)).toHaveValue('FIN-613-B');
  await champOtp(m).fill('');
  await m.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(m).toBeHidden();
  expect((await lire<Otp>(request, `/api/projets/${p.id}`)).otp).toBeNull();
});

/** Projet P (code `code`, OTP `otp`) avec une activité racine « Conception » et une sous-activité « Maquette ». */
async function projetOtp(request: APIRequestContext, code: string, otp: string | null) {
  const api = await preparer(request);
  const me = await lire<{ id: number }>(request, '/api/auth/me');
  const projet = await api.projet(code, `Projet ${code}`, me.id);
  if (otp !== null) await patcher(request, `/api/projets/${projet.id}`, { otp });
  const conception = await activiteAvec(request, projet.id, 'Conception');
  const maquette = await activiteAvec(request, projet.id, 'Maquette', { parent_id: conception.id });
  return { projet, conception, maquette };
}
async function ouvrirPlanning(page: Page, projetId: number) {
  await page.goto(`/projets/${projetId}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
}
async function modifierActivite(page: Page, nom: string): Promise<Locator> {
  await page.getByRole('button', { name: `Modifier ${nom}`, exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await expect(d).toBeVisible();
  return d;
}

test('E2E-614 : OTP hérité : aide du projet, aide de l’activité parente, aide à la création', async ({
  page,
  request,
}) => {
  const { projet, conception } = await projetOtp(request, 'O614', 'P-614');
  await loginAsAdmin(page);
  await ouvrirPlanning(page, projet.id);
  let d = await modifierActivite(page, 'Conception');
  await expect(champOtp(d)).toHaveValue('');
  await expect(d.getByText('Hérité de O614 : P-614')).toBeVisible();
  await d.getByRole('button', { name: 'Annuler' }).click();
  await patcher(request, `/api/activites/${conception.id}`, { otp: 'A-614' });
  await page.reload();
  await page.getByRole('tab', { name: 'Planning' }).click();
  d = await modifierActivite(page, 'Maquette');
  await expect(d.getByText('Hérité de 1 Conception : A-614')).toBeVisible();
  await d.getByRole('button', { name: 'Annuler' }).click();

  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const n = page.getByRole('dialog', { name: 'Nouvelle activité' });
  await expect(n.getByText('Hérité de O614 : P-614')).toBeVisible();
  const parent = n.getByLabel('Activité parente', { exact: true });
  await parent.click();
  await parent.selectOption({ label: '1 Conception' });
  await expect(n.getByText('Hérité de 1 Conception : A-614')).toBeVisible();
});

test('E2E-615 : OTP propre qui prime : saisi sur l’activité héritière, aide absente, sous-activité héritière', async ({
  page,
  request,
}) => {
  const { projet, conception, maquette } = await projetOtp(request, 'O615', 'P-615');
  await loginAsAdmin(page);
  await ouvrirPlanning(page, projet.id);
  let d = await modifierActivite(page, 'Conception');
  await champOtp(d).fill('PROPRE-615');
  await d.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(d).toBeHidden();
  const acts = await lire<(Otp & { id: number })[]>(request, `/api/projets/${projet.id}/activites`);
  expect(acts.find((a) => a.id === conception.id)).toMatchObject({
    otp: 'PROPRE-615',
    otp_effectif: 'PROPRE-615',
    otp_source: null,
  });
  expect(acts.find((a) => a.id === maquette.id)!.otp_effectif).toBe('PROPRE-615');
  d = await modifierActivite(page, 'Conception');
  await expect(champOtp(d)).toHaveValue('PROPRE-615');
  await expect(d.getByText(/^Hérité de/)).toHaveCount(0);
  await d.getByRole('button', { name: 'Annuler' }).click();
  d = await modifierActivite(page, 'Maquette');
  await expect(d.getByText('Hérité de 1 Conception : PROPRE-615')).toBeVisible();
});

test('E2E-616-r1 : chef d’un sous-projet seulement : parent lisible (D-265), aide « Hérité de <code du parent> »', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const me = await lire<{ id: number }>(request, '/api/auth/me');
  const chef = await api.utilisateur('Chef T616', 'chef-t616@example.test', 'chef_de_projet');
  const parent = await api.projet('SECRET-616', 'Parent secret 616', me.id);
  await patcher(request, `/api/projets/${parent.id}`, { otp: 'FIN-616' });
  const sp = await sousProjet(request, parent.id, 'SOUS-616', 'Sous 616', chef.id);
  await connecterAvec(page, 'chef-t616@example.test');
  await page.goto(`/projets/${sp.id}`);
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  const m = page.getByRole('dialog', { name: 'Modifier le projet' });
  await expect(champOtp(m)).toHaveValue('');
  // Révision D-265 (4) : le chef lit le parent ; la source est nommée.
  await expect(m.getByText('Hérité de SECRET-616 : FIN-616')).toBeVisible();
});

test('E2E-617 : copie de projet par l’écran : OTP propre du projet et d’une activité copié', async ({
  page,
  request,
}) => {
  const { conception } = await projetOtp(request, 'O617', 'P-617');
  await patcher(request, `/api/activites/${conception.id}`, { otp: 'A-617' });
  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Copier Projet O617', exact: true }).click();
  const c = page.getByRole('dialog');
  await c.getByLabel('Code').fill('C617');
  await c.getByRole('button', { name: 'Copier', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Copie de Projet O617', level: 1 })).toBeVisible();
  const copie = (await lire<(Otp & { id: number; code: string })[]>(request, '/api/projets')).find(
    (x) => x.code === 'C617',
  )!;
  expect(copie.otp).toBe('P-617');
  const acts = await lire<(Otp & { nom: string })[]>(request, `/api/projets/${copie.id}/activites`);
  expect(acts.find((a) => a.nom === 'Conception')!.otp).toBe('A-617');
  expect(acts.find((a) => a.nom === 'Maquette')!.otp).toBeNull();
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  const m = page.getByRole('dialog', { name: 'Modifier le projet' });
  await expect(champOtp(m)).toHaveValue('P-617');
  await m.getByRole('button', { name: 'Annuler' }).click();
  await page.getByRole('tab', { name: 'Planning' }).click();
  const d = await modifierActivite(page, 'Conception');
  await expect(champOtp(d)).toHaveValue('A-617');
});

test('E2E-618 : parcours complet à l’écran : taux d’une ressource, OTP d’un projet, Taux du jour et aide d’héritage', async ({
  page,
}) => {
  await page.clock.setFixedTime(J06);
  await loginAsAdmin(page);
  await creerRessourceParEcran(page, 'Zoé 618', 'zoe-618@example.test', 'Calendrier par défaut');
  const d = await ouvrirUtilisateur(page, 'Zoé 618');
  await ajouterTaux(regionTaux(d), '2027-01-01', '', '550');
  await expect(lignesTaux(regionTaux(d))).toHaveCount(1);
  await d.getByRole('button', { name: 'Annuler' }).click();
  await expect(d).toBeHidden();

  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const n = page.getByRole('dialog');
  await n.getByLabel('Code').fill('P618');
  await n.getByLabel('Nom').fill('Projet 618');
  await n.getByLabel('Chef de projet').selectOption({ label: NOM_ADMIN });
  await n.getByLabel('Pas avant le').fill('2027-01-04');
  await champOtp(n).fill('FIN-618');
  await n.getByRole('button', { name: 'Créer' }).click();
  await page.getByRole('link', { name: 'Projet 618' }).click();

  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  const af = page.getByRole('dialog', { name: 'Affecter une ressource' });
  await af.getByLabel('Ressource').selectOption({ label: 'Zoé 618' });
  await af.getByRole('button', { name: 'Affecter' }).click();
  await expect(af).toBeHidden();
  const t = page.getByRole('table', { name: 'Affectations du projet' });
  await expect(
    t
      .getByRole('row', { name: /Zoé 618/ })
      .getByRole('cell')
      .nth(4),
  ).toHaveText(`550,00${NBSP}€`);

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const na = page.getByRole('dialog', { name: 'Nouvelle activité' });
  await expect(na.getByText('Hérité de P618 : FIN-618')).toBeVisible();
  await na.getByLabel('Nom').fill('Étude 618');
  await na.getByRole('button', { name: 'Créer' }).click();
  await expect(na).toBeHidden();
  const m = await modifierActivite(page, 'Étude 618');
  await expect(m.getByText('Hérité de P618 : FIN-618')).toBeVisible();
});

test('E2E-619-r1 : OTP d’un modèle saisi par l’écran Modèles ; « Créer un projet depuis » : OTP copié', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.modele('MOD-619', 'Modèle 619');
  await loginAsAdmin(page);
  await ouvrirModeles(page);
  await page.getByRole('button', { name: 'Nouveau modèle' }).click();
  const n = page.getByRole('dialog');
  await expect(champOtp(n)).toBeVisible();
  await n.getByRole('button', { name: 'Annuler' }).click();
  await page.getByRole('button', { name: 'Modifier Modèle 619', exact: true }).click();
  const m = page.getByRole('dialog', { name: 'Modifier le projet' });
  await champOtp(m).fill('M-619');
  await m.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(m).toBeHidden();
  await page
    .getByRole('button', { name: 'Créer un projet depuis Modèle 619', exact: true })
    .click();
  const c = page.getByRole('dialog');
  await c.getByLabel('Code').fill('P619');
  await c.getByLabel('Nom').fill('Projet 619');
  await c.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Projet 619', level: 1 })).toBeVisible();
  const p = (await lire<(Otp & { code: string })[]>(request, '/api/projets')).find(
    (x) => x.code === 'P619',
  )!;
  expect(p.otp).toBe('M-619');
});

test('E2E-620 : captures (section des taux, Taux du jour, aide d’héritage) à 1440 et 1024 px', async ({
  page,
  request,
}) => {
  const a = await ressource(request, 'T620');
  await poserTaux(request, a.id, { debut: '2027-01-01', fin: '2027-01-31', montant: 600 });
  await poserTaux(request, a.id, { debut: '2027-02-01', montant: 1234.5 });
  const { projet } = await projetOtp(request, 'O620', 'P-620');
  await a.api.affectation(projet.id, a.id);
  await page.clock.setFixedTime(J06);
  await loginAsAdmin(page);
  for (const largeur of [1440, 1024]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    const d = await ouvrirUtilisateur(page, a.nom);
    await regionTaux(d).scrollIntoViewIfNeeded();
    await page.screenshot({ path: cheminCapture(`couts-1-taux-${largeur}.png`), fullPage: true });
    await d.getByRole('button', { name: 'Annuler' }).click();
    await page.goto(`/projets/${projet.id}`);
    await page.getByRole('tab', { name: 'Affectations' }).click();
    await expect(page.getByRole('columnheader', { name: 'Taux du jour' })).toBeVisible();
    await page.screenshot({ path: cheminCapture(`couts-1-affectations-${largeur}.png`) });
    await page.getByRole('tab', { name: 'Planning' }).click();
    const m = await modifierActivite(page, 'Maquette');
    await expect(m.getByText('Hérité de O620 : P-620')).toBeVisible();
    await page.screenshot({ path: cheminCapture(`couts-1-otp-${largeur}.png`) });
    await m.getByRole('button', { name: 'Annuler' }).click();
  }
});

test('E2E-621-r1 : « Nouveau modèle » avec un OTP saisi à l’écran : OTP relu par l’API et dans « Modifier le projet »', async ({
  page,
  request,
}) => {
  await preparer(request);
  await loginAsAdmin(page);
  await ouvrirModeles(page);
  await page.getByRole('button', { name: 'Nouveau modèle' }).click();
  const n = page.getByRole('dialog');
  await n.getByLabel('Code').fill('MOD-621');
  await n.getByLabel('Nom').fill('Modèle 621');
  await expect(champOtp(n)).toHaveAttribute('maxlength', '50');
  await champOtp(n).fill(' M-621 ');
  await n.getByRole('button', { name: 'Créer' }).click();
  await expect(n).toBeHidden();
  const modeles = await lire<(Otp & { code: string })[]>(request, '/api/modeles');
  expect(modeles.find((x) => x.code === 'MOD-621')!.otp).toBe('M-621');
  await page.getByRole('button', { name: 'Modifier Modèle 621', exact: true }).click();
  const m = page.getByRole('dialog', { name: 'Modifier le projet' });
  await expect(champOtp(m)).toHaveValue('M-621');
});

test('E2E-622 : « Nouvelle activité » avec un OTP saisi à l’écran : relu par l’API, aide d’héritage de sa sous-activité', async ({
  page,
  request,
}) => {
  const { projet } = await projetOtp(request, 'O622', 'P-622');
  await loginAsAdmin(page);
  await ouvrirPlanning(page, projet.id);
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const n = page.getByRole('dialog', { name: 'Nouvelle activité' });
  await n.getByLabel('Nom').fill('Lot 622');
  await champOtp(n).fill(' A-622 ');
  await expect(n.getByText(/^Hérité de/)).toHaveCount(0);
  await n.getByRole('button', { name: 'Créer' }).click();
  await expect(n).toBeHidden();
  const acts = await lire<(Otp & { id: number; nom: string })[]>(
    request,
    `/api/projets/${projet.id}/activites`,
  );
  const lot = acts.find((a) => a.nom === 'Lot 622')!;
  expect(lot).toMatchObject({ otp: 'A-622', otp_effectif: 'A-622', otp_source: null });
  await activiteAvec(request, projet.id, 'Sous 622', { parent_id: lot.id });
  await page.reload();
  await page.getByRole('tab', { name: 'Planning' }).click();
  const d = await modifierActivite(page, 'Sous 622');
  await expect(d.getByText('Hérité de 2 Lot 622 : A-622')).toBeVisible();
});
