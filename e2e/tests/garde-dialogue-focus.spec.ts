// Lot de consolidation après la garde des dialogues (D-190) : focus initial de la confirmation sur « Annuler »
// (E2E-457, E2E-458) et boutons « Annuler » propres aux formulaires (E2E-459). Base « administrateur seul »
// avant et après chaque test, horloge figée au 14/01/2026.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { preparer } from './lot1-helpers.js';
import { allerA, ouvrirCalendriers } from './lot3c-helpers.js';
import { H14, remettreAdminSeul4b } from './lot4b-helpers.js';
import {
  boutonDe,
  ligneValidation,
  monde4c,
  ouvrirValidation,
  soumettreAlice,
} from './lot4c-helpers.js';
import { equipeApi, equipesEnBase, ouvrirEquipes, remettreAdminSeul6a } from './lot6a-helpers.js';
import { confirmation, dialogueNomme, quitter, rester } from './garde-dialogue-helpers.js';
import { cliquerDansConfirmation, saisirParGeste } from './stabilite-helpers.js';

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

test('E2E-457-r2 : confirmation d’abandon : focus initial sur « Annuler » ; Entrée y reste sans fermer le formulaire ; Échap ferme la confirmation seule', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await page.getByRole('button', { name: 'Nouvelle équipe' }).click();
  const dialogue = dialogueNomme(page, 'Nouvelle équipe');
  await dialogue.getByLabel('Nom').click();
  await dialogue.getByLabel('Nom').fill('Équipe G457');
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
  await expect(rester(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(confirmation(page)).toHaveCount(0);
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByLabel('Nom')).toHaveValue('Équipe G457');
  // Échap sur la confirmation : elle seule se ferme.
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
  await expect(rester(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toHaveCount(0);
  await expect(dialogue).toBeVisible();
});

/** Ouvre « Nouvelle équipe » et la modifie par un geste réel (clic dans « Nom », puis saisie). */
async function equipeModifiee(page: Page, nom: string): Promise<Locator> {
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await page.getByRole('button', { name: 'Nouvelle équipe' }).click();
  const dialogue = dialogueNomme(page, 'Nouvelle équipe');
  await dialogue.getByLabel('Nom').click();
  await dialogue.getByLabel('Nom').fill(nom);
  return dialogue;
}

/** Échap envoyé à l'élément actif, comme le clavier (Radix l'écoute sur le document, en capture). */
const ECHAP = `(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true })))()`;

test('E2E-464 : double Échap dans la même tâche : la confirmation reste affichée, focus sur « Annuler », dialogue et saisie conservés', async ({
  page,
}) => {
  const dialogue = await equipeModifiee(page, 'Équipe G464');
  await page.evaluate(`${ECHAP}; ${ECHAP};`);
  await expect(confirmation(page)).toBeVisible();
  await expect(rester(page)).toBeFocused();
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByLabel('Nom')).toHaveValue('Équipe G464');
});

test('E2E-465 : Échap puis clic dehors dans la même tâche : la confirmation reste affichée, focus sur « Annuler », dialogue et saisie conservés', async ({
  page,
}) => {
  const dialogue = await equipeModifiee(page, 'Équipe G465');
  await page.evaluate(`${ECHAP};
    document.elementFromPoint(4, 4).dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse', button: 0, clientX: 4, clientY: 4 }),
    );`);
  await expect(confirmation(page)).toBeVisible();
  await expect(rester(page)).toBeFocused();
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByLabel('Nom')).toHaveValue('Équipe G465');
});

test('E2E-466 : Échap une fois la confirmation ouverte et focalisée : vaut « Rester », focus revenu sur « Nom »', async ({
  page,
}) => {
  const dialogue = await equipeModifiee(page, 'Équipe G466');
  // Premier Échap, puis une micro-tâche : React a rendu la confirmation et posé le focus, Radix n'a pas
  // encore basculé son écouteur d'Échap (mise à jour différée) ; le second Échap part dans la même tâche.
  const focusAvantSecond = await page.evaluate(`(async () => {
    ${ECHAP};
    await new Promise((r) => queueMicrotask(r));
    const a = document.activeElement;
    const nom = a && a.closest('[role="dialog"]') ? a.textContent : null;
    ${ECHAP};
    return nom;
  })()`);
  expect(focusAvantSecond).toBe('Annuler');
  await expect(confirmation(page)).toHaveCount(0);
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByLabel('Nom')).toHaveValue('Équipe G466');
  await expect(dialogue.getByLabel('Nom')).toBeFocused();
});

test('E2E-458 : confirmation de suppression (équipe) : focus initial sur « Annuler » ; Entrée ne supprime rien', async ({
  page,
  request,
}) => {
  await equipeApi(request, 'Équipe G458');
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await page.getByRole('button', { name: 'Supprimer Équipe G458' }).click();
  const suppression = page.getByRole('dialog', { name: /Supprimer/ });
  await expect(suppression).toBeVisible();
  await expect(suppression.getByRole('button', { name: 'Annuler', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(suppression).toHaveCount(0);
  expect((await equipesEnBase()).map((e) => e.nom)).toEqual(['Équipe G458']);
});

/** Sans modification : le bouton « Annuler » du formulaire ferme directement. */
async function fermerSansModification(page: Page, dialogue: Locator): Promise<void> {
  await dialogue.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(dialogue).toHaveCount(0);
  await expect(confirmation(page)).toHaveCount(0);
}

test('E2E-459-r1 : boutons « Annuler » propres aux formulaires : confirmation si modifié, fermeture directe sinon', async ({
  page,
  request,
  playwright,
}) => {
  const api = await preparer(request);
  const cal = await api.calendrier('Calendrier G459');
  const m = await monde4c(request);
  await soumettreAlice(playwright, m);
  await loginAsAdmin(page);

  // 1. Nouveau calendrier.
  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  const calendrier = dialogueNomme(page, 'Nouveau calendrier');
  await fermerSansModification(page, calendrier);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await saisirParGeste(calendrier.getByLabel('Nom'), 'Calendrier G459 bis');
  await calendrier.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(confirmation(page)).toBeVisible();
  await expect(calendrier).toBeVisible();
  await quitter(page).click();
  await expect(calendrier).toHaveCount(0);

  // 2. Ajouter un jour férié.
  await page.goto(`/calendriers/${cal.id}`);
  await page.getByRole('button', { name: 'Ajouter un jour férié' }).click();
  const ferie = dialogueNomme(page, 'Ajouter un jour férié');
  await saisirParGeste(ferie.getByLabel('Libellé'), 'Fête G459');
  await ferie.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(confirmation(page)).toBeVisible();
  await rester(page).click();
  await expect(ferie.getByLabel('Libellé')).toHaveValue('Fête G459');
  await ferie.getByRole('button', { name: 'Annuler', exact: true }).click();
  await cliquerDansConfirmation(confirmation(page), quitter(page), rester(page));
  await expect(ferie).toHaveCount(0);

  // 3. Nouveau projet (liste « Chef de projet » lue avant le geste).
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const projet = dialogueNomme(page, 'Nouveau projet');
  await expect(
    projet.getByLabel('Chef de projet').getByRole('option', { name: 'Admin E2E' }),
  ).toHaveCount(1);
  await saisirParGeste(projet.getByLabel('Code'), 'G-459');
  await projet.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(confirmation(page)).toBeVisible();
  await quitter(page).click();
  await expect(projet).toHaveCount(0);

  // 4. Rejeter.
  await ouvrirValidation(page);
  await boutonDe(ligneValidation(page, 'Alice 4B'), 'Rejeter la feuille de Alice 4B').click();
  const rejet = dialogueNomme(page, 'Rejeter la feuille de Alice 4B');
  await saisirParGeste(rejet.getByLabel('Commentaire'), 'À revoir');
  await rejet.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(confirmation(page)).toBeVisible();
  await quitter(page).click();
  await expect(rejet).toHaveCount(0);
});
