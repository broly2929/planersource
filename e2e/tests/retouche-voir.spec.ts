// Dialogue « Voir » de Validation après la retouche de TableauFeuille (D-186). E2E-437.
// Monde de lot4c-helpers.ts (Alice soumet), administrateur, horloge H14.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { H14, remettreAdminSeul4b } from './lot4b-helpers.js';
import {
  boutonDe,
  ligneValidation,
  monde4c,
  ouvrirValidation,
  soumettreAlice,
} from './lot4c-helpers.js';

test.beforeEach(remettreAdminSeul4b);
test.afterEach(remettreAdminSeul4b);

async function mesuresVoir(page: Page) {
  const tableau = page
    .getByRole('dialog')
    .getByRole('table', { name: 'Imputations de la semaine', exact: true });
  await expect(tableau).toBeVisible();
  return tableau.evaluate((table) => {
    const ths = Array.from(table.querySelectorAll('thead th')) as HTMLElement[];
    const boites = ths.map((th) => th.getBoundingClientRect());
    const cellule = Array.from(table.querySelectorAll('tbody td'))[0] as HTMLElement;
    const conteneur = table.parentElement as HTMLElement;
    return {
      debordent: ths
        .filter((th) => th.scrollWidth > th.clientWidth + 1)
        .map((th) => th.textContent ?? ''),
      chevauchements: boites
        .slice(1)
        .map((b, i) => boites[i]!.right - b.left)
        .filter((d) => d > 1),
      activiteTronquee: cellule.scrollWidth > cellule.clientWidth + 1,
      defilement: conteneur.scrollWidth - conteneur.clientWidth,
    };
  });
}

test('E2E-437 : dialogue « Voir » à 1024 et 1440 px : en-têtes sans débordement ni chevauchement, aucun défilement', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  await soumettreAlice(playwright, m);
  await page.clock.setFixedTime(H14);
  await loginAsAdmin(page);
  for (const largeur of [1024, 1440]) {
    await page.setViewportSize({ width: largeur, height: 800 });
    await ouvrirValidation(page);
    await boutonDe(ligneValidation(page, 'Alice 4B'), 'Voir la feuille de Alice 4B').click();
    const mesures = await mesuresVoir(page);
    expect(mesures.debordent, `en-têtes qui débordent à ${largeur} px`).toEqual([]);
    expect(mesures.chevauchements, `chevauchements à ${largeur} px`).toEqual([]);
    expect(mesures.activiteTronquee, `« 1 Tâche A » tronqué à ${largeur} px`).toBe(false);
    expect(mesures.defilement, `défilement horizontal à ${largeur} px`).toBe(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});
