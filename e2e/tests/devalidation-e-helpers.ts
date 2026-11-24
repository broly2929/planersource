// Aides de DEV-E (écran Validation : Dévalider, D-176). Monde de lot4c-helpers.ts.
// Contrat de phase verte : bouton « Dévalider la feuille de <ressource> » dans la colonne Actions, après
// « Rejeter » ; confirmation au titre exact « Dévalider la feuille de <ressource> pour <codes> ? » (nom
// accessible du dialogue), texte « La feuille repassera au statut Soumise. », bouton « Dévalider » ;
// succès en `role="status"` « Feuille dévalidée. ».
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

export const DEVALIDER = 'Dévalider la feuille de Alice 4B';
export const TEXTE_CONFIRMATION = 'La feuille repassera au statut Soumise.';
export const REFUS_RIEN = 'La feuille n’a plus de validation à retirer.';
export const REFUS_STATUT = 'La feuille a changé de statut.';

/** POST /api/feuilles/:id/devalider attendu en 200. */
export async function devaliderApi(ctx: APIRequestContext, id: number): Promise<void> {
  const r = await ctx.post(`/api/feuilles/${id}/devalider`, { data: {} });
  expect(r.ok(), `devalider : ${r.status()} ${await r.text()}`).toBeTruthy();
}

/** Noms accessibles des boutons de la colonne Actions d'une ligne, dans l'ordre de l'écran. */
export async function nomsDesActions(ligne: Locator): Promise<string[]> {
  const noms = await ligne
    .getByRole('button')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? e.textContent ?? ''));
  return noms.map((n) => n.trim());
}

/** Ouvre la confirmation de dévalidation et renvoie le dialogue. */
export async function ouvrirConfirmationDevalider(
  page: Page,
  ligne: Locator,
  bouton: string,
  titre: string,
): Promise<Locator> {
  await ligne.getByRole('button', { name: bouton, exact: true }).click();
  const dialogue = page.getByRole('dialog', { name: titre, exact: true });
  await expect(dialogue).toBeVisible();
  return dialogue;
}
