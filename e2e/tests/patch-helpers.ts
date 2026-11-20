// Assistants partagés des e2e de gestes de barre (D-142 (5)) : retard et comptage des réponses des
// PATCH /api/activites/:id. La barre est « retenue » (geste ignoré, D-094 (10)) jusqu'à la réponse du
// PATCH : un test qui enchaîne deux glissers doit attendre cette réponse (révisions D-031, D-142 (4)).
import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Retarde de `E2E_RETARD_PATCH` ms (0 par défaut : aucun retard) la réponse des PATCH
 * /api/activites/:id. À appeler avant les gestes ; une route enregistrée ensuite par le test passe devant.
 */
export async function retarderPatchs(page: Page, activiteId: number): Promise<void> {
  // D-146 (3) : `E2E_RETARD_CORPS` (ms, 0 par défaut) retarde, dans le navigateur, la lecture du corps de la
  // réponse du PATCH, donc après l'événement réseau `response` : la barre reste retenue (D-094 (10)).
  const corps = Number(process.env.E2E_RETARD_CORPS ?? 0);
  if (corps > 0) {
    await page.addInitScript(
      ([ms, id]) => {
        const f = window.fetch.bind(window);
        window.fetch = async (input, init) => {
          const r = await f(input, init);
          if (init?.method === 'PATCH' && String(input).endsWith(`/api/activites/${id}`)) {
            const json = r.json.bind(r);
            r.json = () => new Promise((ok) => setTimeout(ok, ms)).then(json);
          }
          return r;
        };
      },
      [corps, activiteId] as const,
    );
  }
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

/**
 * D-146 (2) : signal d'enchaînement des gestes de barre. Fait le geste (`faire`) puis attend l'écran, pas la
 * réponse réseau : contour du geste (re)posé à une position différente de celle d'avant, relu par
 * `expect.poll`, ET barre libérée (classe `cursor-grab` rendue, absente tant que la barre est retenue,
 * D-094 (10), c'est-à-dire jusqu'à la lecture du corps de la réponse et au rendu).
 */
export async function appliquerGeste(
  barre: Locator,
  contour: Locator,
  faire: () => Promise<void>,
): Promise<void> {
  const xContour = async () =>
    (await contour.count()) === 1 ? (await contour.boundingBox())!.x : null;
  const avant = await xContour();
  await faire();
  await expect
    .poll(async () => {
      const x = await xContour();
      return x !== null && x !== avant;
    })
    .toBe(true);
  await expect(barre).toHaveClass(/cursor-grab/);
}
