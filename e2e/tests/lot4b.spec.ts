// Lot 4b (D-120, SPEC §7 « Écran Feuille de temps ») : écran Feuille de temps. E2E-221 à E2E-244.
// Base « administrateur seul » remise à zéro avant et après chaque test (feuilles comprises), horloge du
// navigateur figée au mercredi 14/01/2026 sauf E2E-242 (2099) ; la date du serveur est la date réelle,
// postérieure : les jours du 12 au 14/01/2026 sont imputables. Données préparées par l'API (monde4b),
// sauf E2E-244-r1 (parcours complet, tout à l'écran). Refus vérifiés par relecture de la feuille par l'API.
// Contrat (à relire, docs/state.md) : lien « Imputations » de la Navigation principale ; titre de niveau
// 1 « Feuille de temps » ; tableau nommé « Imputations de la semaine » (légende masquée) ; ligne
// `tr[data-ligne-assignation]` ; en-tête de jour `th[data-jour]`, `data-capacite-nulle` si capacité 0 ;
// cases textbox « <wbs> <nom>, <jour> » et « <wbs> <nom>, reste à faire » ; total `[data-total-jour]` ;
// dépassement `[data-depassement-jour]` (texte « Dépassement ») ; statut `[data-statut-feuille]` (code,
// texte français) ; confirmation « Abandonner les modifications ? », boutons « Annuler », « Abandonner ».
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec } from './lot1-helpers.js';
import { allerA, creerRessourceParEcran, ouvrirCalendriers } from './lot3c-helpers.js';
import {
  EMAIL_ALICE,
  EMAIL_CHEF_P,
  H14,
  S,
  SP,
  adresseFeuille,
  agirApi,
  alerte,
  bouton,
  caseCharge,
  caseReste,
  cellules,
  clore,
  depassementJour,
  ecouterEcritures,
  imputationsDe,
  imputerApi,
  jS,
  lireFeuilleApi,
  ligneFeuille,
  monde4b,
  remettreAdminSeul4b,
  sessionDe,
  statutFeuille,
  tableauFeuille,
  totalJour,
} from './lot4b-helpers.js';
import { adresseValidation, boutonDe, ligneValidation, statutOk } from './lot4c-helpers.js';

const A = '1 Tâche A';
const B = '1 Tâche B';
const LUN = 'lun. 12/01';
const MAR = 'mar. 13/01';
const MER = 'mer. 14/01';
const JOURS_S = [LUN, MAR, MER, 'jeu. 15/01', 'ven. 16/01', 'sam. 17/01', 'dim. 18/01'];
const CHARGE_INVALIDE = 'Saisir un nombre de jours entre 0 et 10, avec 2 décimales au plus.';
const RESTE_INVALIDE = 'Saisir un nombre de jours positif ou nul, avec 2 décimales au plus.';
const ENREGISTREE = 'Feuille enregistrée.';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul4b);

/** Alice connectée à l'écran, sur la feuille de la semaine `semaine`. */
async function ouvrir(page: Page, semaine = S): Promise<void> {
  await connecterAvec(page, EMAIL_ALICE);
  await page.goto(adresseFeuille(semaine));
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();
}

test('E2E-221-r1 : entrée « Imputations » pour une ressource et pour un administrateur, absente pour un chef non ressource ; semaine courante du navigateur, statut Brouillon', async ({
  page,
  request,
}) => {
  // Révision D-031 (D-181 (7)) : l'entrée est aussi présente pour l'administrateur, ressource ou non.
  const m = await monde4b(request);
  await m.api.utilisateur(
    'Admin Ressource 4B',
    'admin-ressource-4b@lot4b.test',
    'administrateur',
    true,
  );
  await loginAsAdmin(page);
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  await expect(nav.getByRole('link', { name: 'Projets', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Imputations', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');

  await connecterAvec(page, 'admin-ressource-4b@lot4b.test');
  await expect(nav.getByRole('link', { name: 'Imputations', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');

  await connecterAvec(page, EMAIL_CHEF_P);
  await expect(nav.getByRole('link', { name: 'Validation', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Imputations', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');

  await connecterAvec(page, EMAIL_ALICE);
  const lien = nav.getByRole('link', { name: 'Imputations', exact: true });
  await expect(lien).toBeVisible();
  await lien.click();
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(adresseFeuille(S));
  await expect(lien).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByText('Semaine du 12/01/2026 au 18/01/2026', { exact: true }),
  ).toBeVisible();
  await expect(statutFeuille(page)).toHaveAttribute('data-statut-feuille', 'brouillon');
  await expect(statutFeuille(page)).toHaveText('Brouillon');
});

test('E2E-222 : adresse absente ou invalide → lundi courant, adresse corrigée sans rechargement ; lundi valide gardé', async ({
  page,
  request,
}) => {
  await monde4b(request);
  await connecterAvec(page, EMAIL_ALICE);
  let chargements = 0;
  page.on('load', () => chargements++);
  for (const param of [undefined, '2026-01-13', 'abc', '1999-12-27', '2100-01-04']) {
    const avant = chargements;
    await page.goto(adresseFeuille(param));
    await expect(page).toHaveURL(adresseFeuille(S));
    await expect(
      page.getByText('Semaine du 12/01/2026 au 18/01/2026', { exact: true }),
    ).toBeVisible();
    expect(chargements - avant, `rechargements pour ${String(param)}`).toBe(1);
  }
  await page.goto(adresseFeuille(SP));
  await expect(page).toHaveURL(adresseFeuille(SP));
  await expect(
    page.getByText('Semaine du 05/01/2026 au 11/01/2026', { exact: true }),
  ).toBeVisible();
});

test('E2E-223 : colonnes, valeurs à la virgule décimale, tri par projet ; boutons de semaine', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  await imputerApi(alice, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
  ]);
  await ouvrir(page);

  await expect(tableauFeuille(page).locator('thead th')).toHaveText([
    'Projet',
    'Activité',
    'Assigné',
    'Réel cumulé',
    ...JOURS_S,
    'Reste à faire',
  ]);
  const rangs = tableauFeuille(page).locator('tbody tr[data-ligne-assignation]');
  await expect(rangs).toHaveCount(2);
  await expect(rangs.nth(0)).toHaveAttribute('data-ligne-assignation', String(m.sa.id));
  await expect(rangs.nth(1)).toHaveAttribute('data-ligne-assignation', String(m.sb.id));
  const a = cellules(page, m.sa.id);
  await expect(a.nth(0)).toHaveText('P4B');
  await expect(a.nth(1)).toHaveText(A);
  await expect(a.nth(2)).toHaveText('5');
  await expect(a.nth(3)).toHaveText('0,5');
  await expect(caseCharge(page, A, LUN)).toHaveValue('0,5');
  await expect(caseCharge(page, A, MAR)).toHaveValue('');
  await expect(caseReste(page, A)).toHaveValue('4,5');
  await expect(cellules(page, m.sb.id).nth(0)).toHaveText('Q4B');
  await expect(caseReste(page, B)).toHaveValue('3');

  await bouton(page, 'Semaine suivante').click();
  await expect(page).toHaveURL(adresseFeuille('2026-01-19'));
  await expect(
    page.getByText('Semaine du 19/01/2026 au 25/01/2026', { exact: true }),
  ).toBeVisible();
  await bouton(page, 'Semaine précédente').click();
  await bouton(page, 'Semaine précédente').click();
  await expect(page).toHaveURL(adresseFeuille(SP));
  await expect(caseCharge(page, A, 'lun. 05/01')).toHaveValue('');
  await bouton(page, 'Cette semaine').click();
  await expect(page).toHaveURL(adresseFeuille(S));
  await expect(caseCharge(page, A, LUN)).toHaveValue('0,5');
});

test('E2E-224 : saisie et « Enregistrer » : PUT de la seule ligne modifiée, sans reste ; notification ; tableau relu ; base', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  await ouvrir(page);
  const ecritures = ecouterEcritures(page);
  await expect(bouton(page, 'Enregistrer')).toBeDisabled();
  await caseCharge(page, A, LUN).fill('1');
  await caseCharge(page, A, MAR).fill('0.5');
  await expect(bouton(page, 'Enregistrer')).toBeEnabled();
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: ENREGISTREE })).toBeVisible();

  expect(ecritures).toHaveLength(1);
  expect(ecritures[0]!.methode).toBe('PUT');
  expect(ecritures[0]!.url).toContain(`semaine=${S}`);
  expect(ecritures[0]!.corps).toEqual({
    lignes: [
      {
        assignation_id: m.sa.id,
        imputations: [
          { jour: jS(12), charge: 1 },
          { jour: jS(13), charge: 0.5 },
        ],
      },
    ],
  });
  await expect(cellules(page, m.sa.id).nth(3)).toHaveText('1,5');
  await expect(caseReste(page, A)).toHaveValue('3,5');
  await expect(caseCharge(page, A, MAR)).toHaveValue('0,5');
  await expect(bouton(page, 'Enregistrer')).toBeDisabled();

  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), S);
  expect(imputationsDe(f, 'Tâche A')).toEqual([
    { jour: jS(12), charge: 1 },
    { jour: jS(13), charge: 0.5 },
  ]);
  expect(imputationsDe(f, 'Tâche B')).toEqual([]);
});

test('E2E-225 : reste à faire modifié → envoyé (« 2,25 ») ; base', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  await ouvrir(page);
  const ecritures = ecouterEcritures(page);
  await caseReste(page, B).fill('2,25');
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: ENREGISTREE })).toBeVisible();
  expect(ecritures.map((e) => e.corps)).toEqual([
    { lignes: [{ assignation_id: m.sb.id, imputations: [], reste: 2.25 }] },
  ]);
  await expect(caseReste(page, B)).toHaveValue('2,25');
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), S);
  expect(f.lignes.find((l) => l.activite_nom === 'Tâche B')?.reste).toBe(2.25);
  expect(f.lignes.find((l) => l.activite_nom === 'Tâche A')?.reste).toBe(5);
});

test('E2E-226-r1 : valeurs invalides : aria-invalid, aria-errormessage, « Enregistrer » désactivé ; vide = 0 efface l’imputation', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  await imputerApi(alice, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
  ]);
  await ouvrir(page);
  const c = caseCharge(page, A, MAR);
  for (const texte of ['abc', '-1', '0,123', '11']) {
    await c.fill(texte);
    await expect(c, texte).toHaveAttribute('aria-invalid', 'true');
    // Révision E2E-226-r1 (D-134 (4)) : `aria-errormessage` vers la ligne de message sous le tableau.
    await expect(c, texte).toHaveAttribute('aria-errormessage', /.+/);
    await expect(
      page.locator(`[id="${await c.getAttribute('aria-errormessage')}"]`),
      texte,
    ).toContainText(CHARGE_INVALIDE);
    await expect(page.getByText(CHARGE_INVALIDE)).toBeVisible();
    await expect(bouton(page, 'Enregistrer')).toBeDisabled();
  }
  await c.fill('0,25');
  await expect(c).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(CHARGE_INVALIDE)).toHaveCount(0);
  await expect(bouton(page, 'Enregistrer')).toBeEnabled();

  await caseReste(page, A).fill('x');
  await expect(caseReste(page, A)).toHaveAttribute('aria-invalid', 'true');
  await expect(caseReste(page, A)).toHaveAttribute('aria-errormessage', /.+/);
  await expect(
    page.locator(`[id="${await caseReste(page, A).getAttribute('aria-errormessage')}"]`),
  ).toContainText(RESTE_INVALIDE);
  await expect(bouton(page, 'Enregistrer')).toBeDisabled();
  await caseReste(page, A).fill('4,5');
  await expect(bouton(page, 'Enregistrer')).toBeEnabled();

  // Vide = 0 : l'imputation du lundi est effacée.
  await c.fill('');
  await caseCharge(page, A, LUN).fill('');
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: ENREGISTREE })).toBeVisible();
  expect(imputationsDe(await lireFeuilleApi(alice, S), 'Tâche A')).toEqual([]);
});

test('E2E-227 : ligne « Total » recalculée pendant la saisie ; dépassement signalé, non bloquant', async ({
  page,
  request,
  playwright,
}) => {
  await monde4b(request);
  await ouvrir(page);
  const pied = tableauFeuille(page).locator('tfoot tr');
  await expect(pied.locator(':scope > th, :scope > td').first()).toHaveText('Total');
  await expect(totalJour(page, jS(12))).toHaveText('0');
  await caseCharge(page, A, LUN).fill('0,75');
  await expect(totalJour(page, jS(12))).toContainText('0,75');
  await expect(depassementJour(page, jS(12))).toHaveCount(0);
  await caseCharge(page, B, LUN).fill('0,5');
  await expect(totalJour(page, jS(12))).toContainText('1,25');
  await expect(depassementJour(page, jS(12))).toHaveText('Dépassement');
  await expect(totalJour(page, jS(12)).getByText('Dépassement', { exact: true })).toBeVisible();
  await expect(depassementJour(page, jS(13))).toHaveCount(0);
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: ENREGISTREE })).toBeVisible();
  await expect(depassementJour(page, jS(12))).toHaveText('Dépassement');
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), S);
  expect(imputationsDe(f, 'Tâche A')).toEqual([{ jour: jS(12), charge: 0.75 }]);
  expect(imputationsDe(f, 'Tâche B')).toEqual([{ jour: jS(12), charge: 0.5 }]);
});

test('E2E-228 : jour à capacité 0 (samedi, dimanche) : colonne marquée, saisie permise', async ({
  page,
  request,
  playwright,
}) => {
  await monde4b(request);
  await ouvrir(page, SP);
  const entete = (jour: string) => tableauFeuille(page).locator(`thead th[data-jour="${jour}"]`);
  await expect(entete(jS(10))).toHaveAttribute('data-capacite-nulle', /.*/);
  await expect(entete(jS(11))).toHaveAttribute('data-capacite-nulle', /.*/);
  await expect(entete(jS(9))).not.toHaveAttribute('data-capacite-nulle', /.*/);
  const samedi = caseCharge(page, A, 'sam. 10/01');
  await expect(samedi).toBeEnabled();
  await samedi.fill('0,5');
  await expect(depassementJour(page, jS(10))).toHaveText('Dépassement');
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: ENREGISTREE })).toBeVisible();
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), SP);
  expect(imputationsDe(f, 'Tâche A')).toEqual([{ jour: jS(10), charge: 0.5 }]);
});

test('E2E-229 : jours postérieurs à la date du navigateur : cases désactivées', async ({
  page,
  request,
}) => {
  await monde4b(request);
  await ouvrir(page);
  for (const act of [A, B]) {
    for (const jour of [LUN, MAR, MER]) await expect(caseCharge(page, act, jour)).toBeEnabled();
    for (const jour of JOURS_S.slice(3)) await expect(caseCharge(page, act, jour)).toBeDisabled();
    await expect(caseReste(page, act)).toBeEnabled();
  }
});

test('E2E-230 : ligne non modifiable (activité close après imputation) : cases de la ligne désactivées', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  await imputerApi(alice, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
  ]);
  await clore(request, m.a.id);
  await ouvrir(page);
  await expect(ligneFeuille(page, m.sa.id)).toBeVisible();
  for (const jour of [LUN, MAR, MER]) {
    await expect(caseCharge(page, A, jour)).toBeDisabled();
    await expect(caseCharge(page, B, jour)).toBeEnabled();
  }
  await expect(caseCharge(page, A, LUN)).toHaveValue('0,5');
  await expect(caseReste(page, A)).toBeDisabled();
  await expect(caseReste(page, B)).toBeEnabled();
});

test('E2E-231 : feuille soumise puis validée : lecture seule ; « Rappeler » seulement si soumise', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  const f = await imputerApi(alice, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
  ]);
  await agirApi(alice, f.feuille.id!, 'soumettre');
  await ouvrir(page);
  await expect(statutFeuille(page)).toHaveText('Soumise');
  for (const act of [A, B]) {
    for (const jour of [LUN, MAR, MER]) await expect(caseCharge(page, act, jour)).toBeDisabled();
    await expect(caseReste(page, act)).toBeDisabled();
  }
  await expect(bouton(page, 'Enregistrer')).toHaveCount(0);
  await expect(bouton(page, 'Soumettre')).toHaveCount(0);
  await expect(bouton(page, 'Rappeler')).toBeVisible();

  await agirApi(request, f.feuille.id!, 'valider');
  await page.reload();
  await expect(statutFeuille(page)).toHaveText('Validée');
  await expect(statutFeuille(page)).toHaveAttribute('data-statut-feuille', 'validee');
  await expect(caseCharge(page, A, LUN)).toBeDisabled();
  await expect(caseReste(page, B)).toBeDisabled();
  await expect(bouton(page, 'Rappeler')).toHaveCount(0);
  await expect(bouton(page, 'Soumettre')).toHaveCount(0);
  await expect(bouton(page, 'Enregistrer')).toHaveCount(0);
});

test('E2E-232 : aucune ligne : « Aucune activité à imputer cette semaine. »', async ({
  page,
  request,
}) => {
  const api = (await monde4b(request)).api;
  await api.utilisateur('Bob 4B', 'bob-4b@lot4b.test', 'ressource', true);
  await connecterAvec(page, 'bob-4b@lot4b.test');
  await page.goto(adresseFeuille(S));
  await expect(
    page.getByText('Aucune activité à imputer cette semaine.', { exact: true }),
  ).toBeVisible();
  await expect(tableauFeuille(page)).toHaveCount(0);
});

test('E2E-233 : feuille rejetée : alerte avec le commentaire, statut Rejetée, de nouveau modifiable', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  const f = await imputerApi(alice, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
  ]);
  await agirApi(alice, f.feuille.id!, 'soumettre');
  await agirApi(request, f.feuille.id!, 'rejeter', { commentaire: 'Charge du mardi à revoir' });
  await ouvrir(page);
  await expect(alerte(page, 'Feuille rejetée : Charge du mardi à revoir')).toBeVisible();
  await expect(statutFeuille(page)).toHaveText('Rejetée');
  await expect(caseCharge(page, A, MAR)).toBeEnabled();
  await expect(bouton(page, 'Soumettre')).toBeEnabled();
  await expect(bouton(page, 'Rappeler')).toHaveCount(0);
});

test('E2E-234 : « Soumettre » désactivé tant que des modifications ne sont pas enregistrées ; soumise, lecture seule ; base', async ({
  page,
  request,
  playwright,
}) => {
  await monde4b(request);
  await ouvrir(page);
  await caseCharge(page, A, LUN).fill('1');
  await expect(bouton(page, 'Soumettre')).toBeDisabled();
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: ENREGISTREE })).toBeVisible();
  await expect(bouton(page, 'Soumettre')).toBeEnabled();
  await bouton(page, 'Soumettre').click();
  await expect(statutFeuille(page)).toHaveText('Soumise');
  await expect(caseCharge(page, A, LUN)).toBeDisabled();
  await expect(bouton(page, 'Rappeler')).toBeVisible();
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), S);
  expect(f.feuille.statut).toBe('soumise');
});

test('E2E-235 : soumettre sans imputation : « Aucune imputation : rien à soumettre. » (feuille absente : aucun envoi ; feuille sans charge : 422 feuille_vide) ; base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  await ouvrir(page);
  const ecritures = ecouterEcritures(page);
  await bouton(page, 'Soumettre').click();
  await expect(alerte(page, 'Aucune imputation : rien à soumettre.')).toBeVisible();
  expect(ecritures).toHaveLength(0);
  expect((await lireFeuilleApi(alice, S)).feuille.id).toBeNull();

  // Feuille créée par un reste modifié, sans imputation > 0.
  await imputerApi(alice, S, [{ assignation_id: m.sb.id, imputations: [], reste: 2 }]);
  await page.reload();
  await expect(caseReste(page, B)).toHaveValue('2');
  await bouton(page, 'Soumettre').click();
  await expect(alerte(page, 'Aucune imputation : rien à soumettre.')).toBeVisible();
  expect(ecritures.filter((e) => e.url.endsWith('/soumettre'))).toHaveLength(1);
  const f = await lireFeuilleApi(alice, S);
  expect(f.feuille.statut).toBe('brouillon');
  await expect(statutFeuille(page)).toHaveText('Brouillon');
});

test('E2E-236 : « Rappeler » une feuille soumise : Brouillon, de nouveau modifiable ; base', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  const f = await imputerApi(alice, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
  ]);
  await agirApi(alice, f.feuille.id!, 'soumettre');
  await ouvrir(page);
  await bouton(page, 'Rappeler').click();
  await expect(statutFeuille(page)).toHaveText('Brouillon');
  await expect(caseCharge(page, A, MAR)).toBeEnabled();
  await expect(bouton(page, 'Soumettre')).toBeEnabled();
  await expect(bouton(page, 'Rappeler')).toHaveCount(0);
  expect((await lireFeuilleApi(alice, S)).feuille.statut).toBe('brouillon');
});

test('E2E-237 : « Rappeler » après une validation partielle : « La feuille est déjà validée en partie. » ; base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  const f = await imputerApi(alice, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
    { assignation_id: m.sb.id, imputations: [{ jour: jS(13), charge: 0.5 }] },
  ]);
  await agirApi(alice, f.feuille.id!, 'soumettre');
  await ouvrir(page);
  await expect(bouton(page, 'Rappeler')).toBeVisible();
  await agirApi(await sessionDe(playwright, EMAIL_CHEF_P), f.feuille.id!, 'valider');
  await bouton(page, 'Rappeler').click();
  await expect(alerte(page, 'La feuille est déjà validée en partie.')).toBeVisible();
  const apres = await lireFeuilleApi(alice, S);
  expect(apres.feuille.statut).toBe('soumise');
  expect(apres.feuille.validations).toHaveLength(1);
});

test('E2E-238 : refus assignation_invalide (assignation supprimée après le chargement) : texte, saisie gardée, base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  await ouvrir(page);
  await caseCharge(page, A, LUN).fill('0,5');
  await caseCharge(page, B, LUN).fill('1');
  const r = await request.delete(`/api/assignations/${m.sb.id}`);
  expect(r.ok(), `suppression : ${r.status()}`).toBeTruthy();
  await bouton(page, 'Enregistrer').click();
  await expect(alerte(page, 'Cette ligne n’est plus disponible.')).toBeVisible();
  await expect(caseCharge(page, A, LUN)).toHaveValue('0,5');
  await expect(caseCharge(page, B, LUN)).toHaveValue('1');
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), S);
  expect(f.feuille.id).toBeNull();
  expect(imputationsDe(f, 'Tâche A')).toEqual([]);
});

test('E2E-239-r1 : refus ligne_fermee (activité close après le chargement) : texte, saisie gardée, base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  await ouvrir(page);
  await caseCharge(page, A, LUN).fill('1');
  await clore(request, m.a.id);
  await bouton(page, 'Enregistrer').click();
  await expect(
    alerte(page, 'Cette activité ou ce projet est clos : la ligne n’est plus modifiable.'),
  ).toBeVisible();
  await expect(caseCharge(page, A, LUN)).toHaveValue('1');
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), S);
  expect(f.feuille.id).toBeNull();
  // Révision E2E-239-r1 (D-122) : l'activité close sans imputation n'est plus une ligne de la feuille.
  expect(f.lignes.some((l) => l.activite_nom === 'Tâche A')).toBe(false);
});

test('E2E-240 : refus feuille_verrouillee (soumise après le chargement) : texte, saisie gardée, base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  const f = await imputerApi(alice, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
  ]);
  await ouvrir(page);
  await caseCharge(page, A, MAR).fill('1');
  await agirApi(alice, f.feuille.id!, 'soumettre');
  await bouton(page, 'Enregistrer').click();
  await expect(
    alerte(page, 'La feuille est soumise ou validée : elle n’est plus modifiable.'),
  ).toBeVisible();
  await expect(caseCharge(page, A, MAR)).toHaveValue('1');
  const apres = await lireFeuilleApi(alice, S);
  expect(apres.feuille.statut).toBe('soumise');
  expect(imputationsDe(apres, 'Tâche A')).toEqual([{ jour: jS(12), charge: 0.5 }]);
});

test('E2E-241 : refus 400 (corps altéré en route) : « Données invalides. », saisie gardée, base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  await monde4b(request);
  await ouvrir(page);
  await page.route('**/api/feuilles?semaine=*', async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    const corps = route.request().postDataJSON() as {
      lignes: { imputations: { charge: number }[] }[];
    };
    corps.lignes[0]!.imputations[0]!.charge = 11;
    return route.continue({ postData: JSON.stringify(corps) });
  });
  await caseCharge(page, A, LUN).fill('1');
  await bouton(page, 'Enregistrer').click();
  await expect(alerte(page, 'Données invalides.')).toBeVisible();
  await expect(caseCharge(page, A, LUN)).toHaveValue('1');
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), S);
  expect(f.feuille.id).toBeNull();
  expect(imputationsDe(f, 'Tâche A')).toEqual([]);
});

test('E2E-242 : refus jour_futur (navigateur en avance sur le serveur) : texte, saisie gardée, base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  await monde4b(request);
  await page.clock.setFixedTime('2099-01-07T10:00:00');
  await connecterAvec(page, EMAIL_ALICE);
  await page.goto(adresseFeuille());
  await expect(page).toHaveURL(adresseFeuille('2099-01-05'));
  await caseCharge(page, A, 'lun. 05/01').fill('1');
  await bouton(page, 'Enregistrer').click();
  await expect(alerte(page, 'Impossible d’imputer un jour futur.')).toBeVisible();
  await expect(caseCharge(page, A, 'lun. 05/01')).toHaveValue('1');
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), '2099-01-05');
  expect(f.feuille.id).toBeNull();
  expect(imputationsDe(f, 'Tâche A')).toEqual([]);
});

test('E2E-243 : changement de semaine avec des modifications : confirmation ; « Annuler » reste, « Abandonner » change ; rien d’envoyé', async ({
  page,
  request,
  playwright,
}) => {
  await monde4b(request);
  await ouvrir(page);
  const ecritures = ecouterEcritures(page);
  await caseCharge(page, A, LUN).fill('1');
  await bouton(page, 'Semaine suivante').click();
  const dialogue = page.getByRole('dialog', { name: 'Abandonner les modifications ?' });
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(dialogue).toHaveCount(0);
  await expect(page).toHaveURL(adresseFeuille(S));
  await expect(caseCharge(page, A, LUN)).toHaveValue('1');

  await bouton(page, 'Semaine précédente').click();
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: 'Abandonner', exact: true }).click();
  await expect(page).toHaveURL(adresseFeuille(SP));
  await expect(
    page.getByText('Semaine du 05/01/2026 au 11/01/2026', { exact: true }),
  ).toBeVisible();

  // « Cette semaine » passe aussi par la confirmation.
  await caseCharge(page, A, 'lun. 05/01').fill('0,5');
  await bouton(page, 'Cette semaine').click();
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: 'Abandonner', exact: true }).click();
  await expect(page).toHaveURL(adresseFeuille(S));
  await expect(caseCharge(page, A, LUN)).toHaveValue('');
  expect(ecritures).toHaveLength(0);
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), S);
  expect(f.feuille.id).toBeNull();
});

test('E2E-244-r4 : parcours complet à l’écran : saisie, soumission, validation par le chef, dévalidation puis nouvelle validation, lecture seule ; avancement dans le Gantt du projet', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 4B-244');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 4B-244/ })).toBeVisible();
  await creerRessourceParEcran(
    page,
    'Ressource 4B-244',
    'ressource-4b-244@lot4b.test',
    'Cal 4B-244',
  );
  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const chef = page.getByRole('dialog');
  await chef.getByLabel('Nom').fill('Chef 4B-244');
  await chef.getByLabel('Email').fill('chef-4b-244@lot4b.test');
  await chef.getByLabel('Mot de passe').fill('mot-de-passe-e2e-lot1');
  await chef.getByLabel('Rôle').selectOption({ label: 'Chef de projet' });
  await chef.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Chef 4B-244/ })).toBeVisible();
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const projet = page.getByRole('dialog');
  await projet.getByLabel('Code').fill('4B-244');
  await projet.getByLabel('Nom').fill('Projet 4B-244');
  await projet.getByLabel('Chef de projet').selectOption({ label: 'Chef 4B-244' });
  await projet.getByLabel('Pas avant le').fill('2027-01-04');
  await projet.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Projet 4B-244/ })).toBeVisible();

  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 4B-244' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 4B-244', level: 1 })).toBeVisible();
  const adresseProjet = new URL(page.url()).pathname;
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Ressource')
    .selectOption({ label: 'Ressource 4B-244' });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: /Ressource 4B-244/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 4B-244');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 4B-244/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 4B-244' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: 'Ressource 4B-244' });
  await assignation.getByLabel('Charge assignée (jours)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Tâche 4B-244.*Ressource 4B-244/ })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  // La ressource saisit, enregistre, soumet.
  await connecterAvec(page, 'ressource-4b-244@lot4b.test');
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Imputations', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(adresseFeuille(S));
  await caseCharge(page, '1 Tâche 4B-244', LUN).fill('0,5');
  await expect(totalJour(page, jS(12))).toContainText('0,5');
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: ENREGISTREE })).toBeVisible();
  await expect(caseReste(page, '1 Tâche 4B-244')).toHaveValue('1,5');
  await bouton(page, 'Soumettre').click();
  await expect(statutFeuille(page)).toHaveText('Soumise');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  // Le chef du projet valide la feuille (menu « Validation »).
  await connecterAvec(page, 'chef-4b-244@lot4b.test');
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Validation', exact: true })
    .click();
  await expect(page).toHaveURL(adresseValidation(S));
  const ligneVal = ligneValidation(page, 'Ressource 4B-244');
  await expect(ligneVal.getByText('Soumise', { exact: true })).toBeVisible();
  await boutonDe(ligneVal, 'Valider la feuille de Ressource 4B-244').click();
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(statutOk(page, 'Feuille validée.')).toBeVisible();
  await expect(ligneVal.getByText('Validée', { exact: true })).toBeVisible();

  // Le chef dévalide la feuille (« Soumise »), puis la valide de nouveau.
  await boutonDe(ligneVal, 'Dévalider la feuille de Ressource 4B-244').click();
  await expect(
    page.getByRole('dialog', {
      name: 'Dévalider la feuille de Ressource 4B-244 pour 4B-244 ?',
      exact: true,
    }),
  ).toBeVisible();
  await boutonDe(page.getByRole('dialog'), 'Dévalider').click();
  await expect(statutOk(page, 'Feuille dévalidée.')).toBeVisible();
  await expect(ligneVal.getByText('Soumise', { exact: true })).toBeVisible();
  await boutonDe(ligneVal, 'Valider la feuille de Ressource 4B-244').click();
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(statutOk(page, 'Feuille validée.')).toBeVisible();
  await expect(ligneVal.getByText('Validée', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  // La ressource voit « Validée » et la feuille en lecture seule.
  await connecterAvec(page, 'ressource-4b-244@lot4b.test');
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Imputations', exact: true })
    .click();
  await expect(statutFeuille(page)).toHaveText('Validée');
  await expect(caseCharge(page, '1 Tâche 4B-244', LUN)).toBeDisabled();
  await expect(caseCharge(page, '1 Tâche 4B-244', LUN)).toHaveValue('0,5');
  await expect(bouton(page, 'Enregistrer')).toHaveCount(0);
  await expect(bouton(page, 'Soumettre')).toHaveCount(0);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  // L'administrateur (non ressource) retrouve la feuille de la ressource par la liste « Ressource » (D-181).
  await loginAsAdmin(page);
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Imputations', exact: true })
    .click();
  await page.getByRole('combobox', { name: 'Ressource', exact: true }).selectOption({
    label: 'Ressource 4B-244',
  });
  await expect(
    page.getByRole('heading', { name: 'Feuille de temps de Ressource 4B-244', level: 1 }),
  ).toBeVisible();
  await expect(statutFeuille(page)).toHaveText('Validée');
  await expect(caseCharge(page, '1 Tâche 4B-244', LUN)).toHaveValue('0,5');
  await expect(caseCharge(page, '1 Tâche 4B-244', LUN)).toBeDisabled();

  // Effet dans le Gantt du projet : avancement 0,5 ÷ (0,5 + 1,5) = 25 %.
  await page.goto(`${adresseProjet}?onglet=gantt&zoom=jour`);
  const ligne = page
    .getByRole('region', { name: 'Tableau du Gantt', exact: true })
    .locator('tbody tr')
    .filter({ has: page.getByText('Tâche 4B-244', { exact: true }) });
  await expect(ligne).toContainText('25 %');
  // Charge réelle : non affichée par le Gantt (colonne Charge = charge assignée), lue par l'API.
  const id = Number(adresseProjet.split('/').pop());
  const g = (await (await page.request.get(`/api/projets/${id}/gantt`)).json()) as {
    elements: { nom: string; charge_reelle?: number; avancement?: number | null }[];
  };
  const t = g.elements.find((e) => e.nom === 'Tâche 4B-244')!;
  expect(t.charge_reelle).toBe(0.5);
  expect(t.avancement).toBe(25);
});
