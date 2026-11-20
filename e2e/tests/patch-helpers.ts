// Assistants partagés des e2e de gestes de barre (D-142 (5)) : retard et comptage des réponses des
// PATCH /api/activites/:id. La barre est « retenue » (geste ignoré, D-094 (10)) jusqu'à la réponse du
// PATCH : un test qui enchaîne deux glissers doit attendre cette réponse (révisions D-031, D-142 (4)).
import type { Page } from '@playwright/test';

/**
 * Retarde de `E2E_RETARD_PATCH` ms (0 par défaut : aucun retard) la réponse des PATCH
 * /api/activites/:id. À appeler avant les gestes ; une route enregistrée ensuite par le test passe devant.
 */
export async function retarderPatchs(page: Page, activiteId: number): Promise<void> {
  const retard = Number(process.env.E2E_RETARD_PATCH ?? 0);
  if (retard <= 0) return;
  await page.route(`**/api/activites/${activiteId}`, async (route) => {
    if (route.request().method() === 'PATCH') await new Promise((r) => setTimeout(r, retard));
    await route.continue();
  });
}

/** Compteur des réponses de PATCH /api/activites/:id reçues par la page. */
export function suivreReponsesPatch(page: Page, activiteId: number): () => number {
  let reponses = 0;
  page.on('response', (r) => {
    if (
      r.request().method() === 'PATCH' &&
      new URL(r.url()).pathname === `/api/activites/${activiteId}`
    )
      reponses++;
  });
  return () => reponses;
}
