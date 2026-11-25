// Confirmation à la fermeture des dialogues-formulaires (D-188). E2E-439 à E2E-455 (révisions -r1, D-031 : dialogue recouvert masqué
// par Radix (`includeHidden`), base relue par SQL, équipes remises à zéro, focus avant `selectOption`). Base « administrateur
// seul » avant et après chaque test, horloge figée au 14/01/2026. Données par l'API, actions à l'écran.
// Contrat : garde-dialogue-helpers.ts.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { preparer } from './lot1-helpers.js';
import { allerA } from './lot3c-helpers.js';
import { H14, remettreAdminSeul4b, monde4b } from './lot4b-helpers.js';
import {
  boutonDe,
  ligneValidation,
  monde4c,
  ouvrirValidation,
  soumettreAlice,
} from './lot4c-helpers.js';
import { equipeApi, equipesEnBase, ouvrirEquipes, remettreAdminSeul6a } from './lot6a-helpers.js';
import {
  confirmation,
  declencher,
  dialogueNomme,
  quitter,
  rester,
  verifierGardeChamp,
  type Declencheur,
} from './garde-dialogue-helpers.js';
import { saisirParGeste } from './stabilite-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await remettreAdminSeul6a();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1440, height: 800 });
});
test.afterEach(async () => {
  await remettreAdminSeul4b();
  await remettreAdminSeul6a();
});

/** Administrateur sur l'onglet Équipes, dialogue « Nouvelle équipe » ouvert. */
async function ouvrirNouvelleEquipe(page: Page) {
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await page.getByRole('button', { name: 'Nouvelle équipe' }).click();
  const dialogue = dialogueNomme(page, 'Nouvelle équipe');
  await expect(dialogue).toBeVisible();
  return dialogue;
}

async function parcoursDeclencheur(page: Page, d: Declencheur) {
  const dialogue = await ouvrirNouvelleEquipe(page);
  // Sans modification : fermeture directe.
  await declencher(page, dialogue, d);
  await expect(dialogue).toHaveCount(0);
  await expect(confirmation(page)).toHaveCount(0);
  // Nom saisi : confirmation, le dialogue reste ouvert.
  await page.getByRole('button', { name: 'Nouvelle équipe' }).click();
  await saisirParGeste(dialogue.getByLabel('Nom'), 'Équipe G');
  await declencher(page, dialogue, d);
  await expect(confirmation(page)).toBeVisible();
  await expect(dialogue).toBeVisible();
  await rester(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(dialogue.getByLabel('Nom')).toHaveValue('Équipe G');
  // Saisie effacée : plus de modification, fermeture directe.
  await dialogue.getByLabel('Nom').fill('');
  await declencher(page, dialogue, d);
  await expect(dialogue).toHaveCount(0);
  await expect(confirmation(page)).toHaveCount(0);
}

test('E2E-439-r2 : Échap : confirmation seulement si le formulaire est modifié', async ({
  page,
}) => {
  await parcoursDeclencheur(page, 'echap');
});
test('E2E-440-r2 : clic hors du dialogue : confirmation seulement si le formulaire est modifié', async ({
  page,
}) => {
  await parcoursDeclencheur(page, 'dehors');
});
test('E2E-441-r2 : bouton « Annuler » : confirmation seulement si le formulaire est modifié', async ({
  page,
}) => {
  await parcoursDeclencheur(page, 'annuler');
});
test('E2E-442-r2 : croix « Fermer » : confirmation seulement si le formulaire est modifié', async ({
  page,
}) => {
  await parcoursDeclencheur(page, 'croix');
});

test('E2E-443-r3 : champ nombre (Modifier l’assignation) : modifié puis Échap : confirmation ; remis : aucune', async ({
  page,
  request,
}) => {
  const m = await monde4b(request);
  await loginAsAdmin(page);
  await page.goto(`/projets/${m.p.id}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page
    .getByRole('button', { name: "Modifier l'assignation de Alice 4B à Tâche A", exact: true })
    .click();
  const dialogue = dialogueNomme(page, 'Modifier l’assignation');
  const charge = dialogue.getByLabel('Charge assignée (j)');
  const initiale = await charge.inputValue();
  await verifierGardeChamp(
    page,
    dialogue,
    () => saisirParGeste(charge, '3'),
    () => charge.fill(initiale),
  );
});

test('E2E-444-r2 : champ date (Ajouter un jour férié) : modifié puis Échap : confirmation ; remis : aucune', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const cal = await api.calendrier('Calendrier G');
  await loginAsAdmin(page);
  await page.goto(`/calendriers/${cal.id}`);
  await page.getByRole('button', { name: 'Ajouter un jour férié' }).click();
  const dialogue = dialogueNomme(page, 'Ajouter un jour férié');
  const date = dialogue.getByLabel('Date');
  const initiale = await date.inputValue();
  await verifierGardeChamp(
    page,
    dialogue,
    () => saisirParGeste(date, '2027-05-01'),
    () => date.fill(initiale),
  );
});

async function ouvrirNouvelUtilisateur(page: Page) {
  await loginAsAdmin(page);
  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const dialogue = dialogueNomme(page, 'Nouvel utilisateur');
  await expect(dialogue).toBeVisible();
  return dialogue;
}

test('E2E-445-r2 : champ mot de passe (Nouvel utilisateur) : saisi puis Échap : confirmation ; effacé : aucune', async ({
  page,
}) => {
  const dialogue = await ouvrirNouvelUtilisateur(page);
  const mdp = dialogue.getByLabel('Mot de passe');
  await verifierGardeChamp(
    page,
    dialogue,
    () => saisirParGeste(mdp, 'mot-de-passe-g-445'),
    () => mdp.fill(''),
  );
});

test('E2E-446-r2 : liste native (Nouvel utilisateur, Rôle) : changée puis Échap : confirmation ; remise : aucune', async ({
  page,
}) => {
  const dialogue = await ouvrirNouvelUtilisateur(page);
  const role = dialogue.getByLabel('Rôle');
  const initial = await role.inputValue();
  await verifierGardeChamp(
    page,
    dialogue,
    async () => {
      // Geste réel de l'utilisateur : clic sur la liste (donne le focus), puis touche fléchée sur la liste fermée,
      // qui change la valeur comme au clavier (Échap ferme la liste native ouverte, sans changer la valeur).
      await role.click();
      await page.keyboard.press('Escape');
      await role.press('ArrowUp');
      await expect(role).toHaveValue('chef_de_projet');
    },
    () => role.selectOption(initial),
  );
});

test('E2E-447-r1 : case à cocher (Modifier le calendrier) : cochée ou décochée puis Échap : confirmation ; remise : aucune', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const cal = await api.calendrier('Calendrier G447');
  await loginAsAdmin(page);
  await page.goto(`/calendriers/${cal.id}`);
  await page.getByRole('button', { name: 'Modifier le calendrier' }).click();
  const dialogue = dialogueNomme(page, 'Modifier le calendrier');
  const premiere = dialogue.getByRole('checkbox').first();
  const etat = await premiere.isChecked();
  await verifierGardeChamp(
    page,
    dialogue,
    () => premiere.setChecked(!etat),
    () => premiere.setChecked(etat),
  );
});

test('E2E-448-r2 : zone de texte (Rejeter) : commentaire saisi puis Échap : confirmation ; effacé : aucune', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  await soumettreAlice(playwright, m);
  await loginAsAdmin(page);
  await ouvrirValidation(page);
  await boutonDe(ligneValidation(page, 'Alice 4B'), 'Rejeter la feuille de Alice 4B').click();
  const dialogue = dialogueNomme(page, 'Rejeter la feuille de Alice 4B');
  const commentaire = dialogue.getByLabel('Commentaire');
  await verifierGardeChamp(
    page,
    dialogue,
    () => saisirParGeste(commentaire, 'Imputations à revoir'),
    () => commentaire.fill(''),
  );
});

test('E2E-449-r1 : « Nouveau projet », annuaire retardé : geste pendant le chargement, fin, Échap : aucune confirmation', async ({
  page,
  request,
}) => {
  await monde4b(request);
  await loginAsAdmin(page);
  let liberer: () => void = () => undefined;
  const porte = new Promise<void>((resolve) => (liberer = resolve));
  await page.route('**/api/annuaire', async (route) => {
    await porte;
    await route.continue();
  });
  await page.goto('/projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const dialogue = dialogueNomme(page, 'Nouveau projet');
  await expect(dialogue).toBeVisible();
  // Geste dans le formulaire pendant le chargement de l'annuaire (la liste Chef de projet n'a pas ses options).
  await dialogue.getByLabel('Code').click();
  await expect(dialogue.getByRole('option', { name: 'Chef P 4B' })).toHaveCount(0);
  liberer();
  await expect(dialogue.getByRole('option', { name: 'Chef P 4B' })).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialogue).toHaveCount(0);
  await expect(confirmation(page)).toHaveCount(0);

  // Contrôle positif : une saisie après le chargement est détectée.
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  await saisirParGeste(dialogue.getByLabel('Code'), 'G-449');
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
});

test('E2E-450-r1 : « Modifier le projet », projet retardé : geste pendant le chargement, fin, Échap : aucune confirmation', async ({
  page,
  request,
}) => {
  const m = await monde4b(request);
  await loginAsAdmin(page);
  await page.goto(`/projets/${m.p.id}`);
  await expect(page.getByRole('button', { name: 'Modifier le projet' })).toBeVisible();
  let liberer: () => void = () => undefined;
  const porte = new Promise<void>((resolve) => (liberer = resolve));
  await page.route(`**/api/projets/${m.p.id}`, async (route) => {
    await porte;
    await route.continue();
  });
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  const dialogue = dialogueNomme(page, 'Modifier le projet');
  await expect(dialogue.getByText('Chargement du projet…')).toBeVisible();
  // Geste pendant le chargement : ignoré (aucun formulaire).
  await dialogue.getByText('Chargement du projet…').click();
  liberer();
  await expect(dialogue.getByLabel('Code')).toBeVisible();
  await expect(dialogue.getByRole('option', { name: 'Chef P 4B' })).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialogue).toHaveCount(0);
  await expect(confirmation(page)).toHaveCount(0);

  // Contrôle positif : une saisie après le chargement est détectée.
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  await saisirParGeste(dialogue.getByLabel('Nom'), 'Projet P4B modifié');
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
});

test('E2E-451 : dialogue sans garde (Exporter les imputations) : date modifiée puis Échap : aucune confirmation', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await ouvrirValidation(page);
  await page.getByRole('button', { name: 'Exporter CSV' }).click();
  const dialogue = dialogueNomme(page, 'Exporter les imputations');
  await expect(dialogue).toBeVisible();
  await dialogue.getByLabel('Du').fill('2026-01-05');
  await page.keyboard.press('Escape');
  await expect(dialogue).toHaveCount(0);
  await expect(confirmation(page)).toHaveCount(0);
});

test('E2E-452 : envoi réussi : le dialogue se ferme, aucune confirmation à aucun moment', async ({
  page,
}) => {
  const dialogue = await ouvrirNouvelleEquipe(page);
  await dialogue.getByLabel('Nom').fill('Équipe G452');
  await dialogue.getByRole('button', { name: 'Créer' }).click();
  await expect(dialogue).toHaveCount(0);
  await expect(confirmation(page)).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Équipe G452/ })).toBeVisible();
  await expect(confirmation(page)).toHaveCount(0);
});

test('E2E-453-r1 : envoi en échec puis Échap : confirmation, base inchangée', async ({
  page,
  request,
}) => {
  await equipeApi(request, 'Équipe G453');
  const dialogue = await ouvrirNouvelleEquipe(page);
  await dialogue.getByLabel('Nom').fill('équipe g453');
  await dialogue.getByRole('button', { name: 'Créer' }).click();
  await expect(dialogue.getByText('Cette équipe existe déjà.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
  await expect(dialogue).toBeVisible();
  expect((await equipesEnBase()).map((e) => e.nom)).toEqual(['Équipe G453']);
});

test('E2E-454-r1 : « Annuler » de la confirmation (rester) : dialogue ouvert, saisie et focus conservés', async ({
  page,
}) => {
  const dialogue = await ouvrirNouvelleEquipe(page);
  const nom = dialogue.getByLabel('Nom');
  await saisirParGeste(nom, 'Équipe G454');
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
  await rester(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(dialogue).toBeVisible();
  await expect(nom).toHaveValue('Équipe G454');
  await expect(nom).toBeFocused();
});

test('E2E-455-r2 : « Abandonner » : dialogue fermé, aucune écriture envoyée, base inchangée', async ({
  page,
}) => {
  const dialogue = await ouvrirNouvelleEquipe(page);
  const ecritures: string[] = [];
  page.on('request', (req) => {
    if (req.method() !== 'GET') ecritures.push(`${req.method()} ${req.url()}`);
  });
  await saisirParGeste(dialogue.getByLabel('Nom'), 'Équipe G455');
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
  await quitter(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(dialogue).toHaveCount(0);
  expect(ecritures).toEqual([]);
  expect(await equipesEnBase()).toEqual([]);
});
