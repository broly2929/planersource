// Correctif 244 (D-200) : choix dans « Ressource » fait avant la correction différée de l'adresse de
// l'écran Imputations de l'administrateur. E2E-467. Base « administrateur seul » remise à zéro avant et
// après chaque test, horloge du navigateur figée au mercredi 14/01/2026. Données préparées par l'API
// (mondeAutrui) ; Alice reçoit un calendrier propre (D-163 (3)). Le choix est fait par un
// MutationObserver installé dans la page avant le clic de menu (D-200 (3)) : dès que la liste
// « Ressource » est activable et contient l'option, sa valeur change et un évènement `change` qui remonte
// est envoyé dans le rappel de l'observateur (microtâche après le commit, avant les effets passifs de
// React). Aucun délai. Le reste du test se fait à l'écran.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { H14, S, remettreAdminSeul4b, statutFeuille } from './lot4b-helpers.js';
import { mondeAutrui, titreFeuilleDe } from './autrui-e-helpers.js';
import { calendrierPropre } from './rex3a-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul4b);

const nav = (page: Page) => page.getByRole('navigation', { name: 'Navigation principale' });

/**
 * Installe dans la page l'observateur qui choisit `valeur` dans la liste « Ressource » dès qu'elle est
 * activable et contient l'option. Le choix est relevé dans `window.__choix244` (adresse au moment du
 * choix), pour vérifier qu'il a bien eu lieu.
 */
async function choisirDesQueActivable(page: Page, valeur: string): Promise<void> {
  await page.evaluate((v) => {
    const w = window as unknown as { __choix244?: string };
    const liste = (): HTMLSelectElement | undefined =>
      Array.from(document.querySelectorAll('select')).find((s) =>
        Array.from(s.labels ?? []).some((l) => l.textContent?.trim() === 'Ressource'),
      );
    const observateur = new MutationObserver(() => {
      const s = liste();
      if (!s || s.disabled || !Array.from(s.options).some((o) => o.value === v)) return;
      observateur.disconnect();
      w.__choix244 = window.location.pathname + window.location.search;
      s.value = v;
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    observateur.observe(document.body, { childList: true, subtree: true, attributes: true });
  }, valeur);
}

test('E2E-467 : administrateur non ressource, « Imputations » par le menu, « Alice 4B » choisie dès que la liste est activable : adresse avec semaine et ressource, titre de la feuille d’Alice, statut affiché, aucune entrée d’historique ajoutée par la correction d’adresse', async ({
  page,
  request,
}) => {
  const m = await mondeAutrui(request);
  await calendrierPropre(request, m.alice.id, 'Cal E2E-467', []);
  await loginAsAdmin(page);
  await expect(page).toHaveURL('/');

  const avant = await page.evaluate(() => window.history.length);
  await choisirDesQueActivable(page, String(m.alice.id));
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __choix244?: string }).__choix244))
    .toBeDefined();
  await expect(page).toHaveURL(
    (u) =>
      u.pathname === '/imputations' &&
      u.searchParams.get('semaine') === S &&
      u.searchParams.get('ressource') === String(m.alice.id),
  );
  await expect(titreFeuilleDe(page, 'Alice 4B')).toBeVisible();
  await expect(statutFeuille(page)).toHaveText('Brouillon');
  const apres = await page.evaluate(() => window.history.length);
  expect(apres - avant).toBeLessThanOrEqual(2);
});
