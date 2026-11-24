// Retouche de la Feuille de temps (D-186). E2E-432 à E2E-435. Base « administrateur seul » avant et après
// chaque test, horloge figée au 14/01/2026. Monde d'AUT-E (autrui-e-helpers.ts). Contrat de phase verte :
// liste « Ressource » visible et désactivée pendant le chargement de l'annuaire ; option « Choisir… » de
// valeur '' désactivée ; en-tête `main > header`.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec } from './lot1-helpers.js';
import { H14, S, caseCharge, remettreAdminSeul4b, tableauFeuille } from './lot4b-helpers.js';
import {
  EMAIL_ADMIN_RESSOURCE,
  adresseAutrui,
  listeRessource,
  mondeAutrui,
  titreFeuilleDe,
} from './autrui-e-helpers.js';

const A = '1 Tâche A';
const LUN = 'lun. 12/01';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await page.clock.setFixedTime(H14);
});
test.afterEach(remettreAdminSeul4b);

/** Mesures des en-têtes du tableau : débordement, chevauchement, écart entre Assigné et Réel cumulé. */
async function mesuresTableau(page: Page) {
  return tableauFeuille(page).evaluate((table) => {
    const ths = Array.from(table.querySelectorAll('thead th')) as HTMLElement[];
    const boites = ths.map((th) => th.getBoundingClientRect());
    const texte = (th: HTMLElement) => {
      const r = document.createRange();
      r.selectNodeContents(th);
      return r.getBoundingClientRect();
    };
    const cellule = Array.from(table.querySelectorAll('tbody tr td'))[0] as HTMLElement;
    const conteneur = table.parentElement as HTMLElement;
    return {
      debordent: ths
        .filter((th) => th.scrollWidth > th.clientWidth + 1)
        .map((th) => th.textContent ?? ''),
      chevauchements: boites
        .slice(1)
        .map((b, i) => boites[i]!.right - b.left)
        .filter((d) => d > 1),
      ecartAssigneReel: texte(ths[3]!).left - texte(ths[2]!).right,
      largeurActivite: boites[1]!.width,
      activiteTronquee: cellule.scrollWidth > cellule.clientWidth + 1,
      defilement: conteneur.scrollWidth - conteneur.clientWidth,
    };
  });
}

async function ouvrirAlice(page: Page, largeur: number, aliceId: number): Promise<void> {
  await page.setViewportSize({ width: largeur, height: 800 });
  await loginAsAdmin(page);
  await page.goto(adresseAutrui(S, aliceId));
  await expect(titreFeuilleDe(page, 'Alice 4B')).toBeVisible();
  await expect(caseCharge(page, A, LUN)).toBeVisible();
}

test('E2E-432 : 1024 px : Activité lisible, en-têtes sans débordement ni chevauchement, Assigné et Réel cumulé non serrés', async ({
  page,
  request,
}) => {
  const m = await mondeAutrui(request);
  await ouvrirAlice(page, 1024, m.alice.id);
  const mesures = await mesuresTableau(page);
  expect(mesures.activiteTronquee, 'cellule « 1 Tâche A » tronquée').toBe(false);
  expect(mesures.largeurActivite, 'largeur de la colonne Activité').toBeGreaterThanOrEqual(110);
  expect(mesures.debordent, 'en-têtes qui débordent').toEqual([]);
  expect(mesures.chevauchements, 'chevauchements entre en-têtes').toEqual([]);
  expect(mesures.ecartAssigneReel, 'écart Assigné / Réel cumulé').toBeGreaterThanOrEqual(8);
  expect(mesures.defilement, 'défilement horizontal').toBe(0);
});

test('E2E-433 : 1280 px : mêmes contrôles, Activité d’au moins 300 px', async ({
  page,
  request,
}) => {
  const m = await mondeAutrui(request);
  await ouvrirAlice(page, 1280, m.alice.id);
  const mesures = await mesuresTableau(page);
  expect(mesures.activiteTronquee).toBe(false);
  expect(mesures.largeurActivite, 'largeur de la colonne Activité').toBeGreaterThanOrEqual(300);
  expect(mesures.debordent).toEqual([]);
  expect(mesures.chevauchements).toEqual([]);
  expect(mesures.ecartAssigneReel).toBeGreaterThanOrEqual(8);
  expect(mesures.defilement).toBe(0);
});

test('E2E-434 : annuaire retardé : liste visible et désactivée pendant le chargement, en-tête identique après', async ({
  page,
  request,
}) => {
  await mondeAutrui(request);
  await page.setViewportSize({ width: 1440, height: 800 });
  await loginAsAdmin(page);
  let liberer: () => void = () => undefined;
  const porte = new Promise<void>((resolve) => (liberer = resolve));
  await page.route('**/api/annuaire', async (route) => {
    await porte;
    await route.continue();
  });
  await page.goto(adresseAutrui(S));
  const entete = page.locator('main > header');
  const titre = page.getByRole('heading', { name: 'Feuille de temps', level: 1, exact: true });
  await expect(titre).toBeVisible();
  await expect(listeRessource(page)).toBeVisible();
  await expect(listeRessource(page)).toBeDisabled();
  const avant = { entete: await entete.boundingBox(), titre: await titre.boundingBox() };
  liberer();
  await expect(listeRessource(page)).toBeEnabled();
  const apres = { entete: await entete.boundingBox(), titre: await titre.boundingBox() };
  expect(apres.entete?.height, 'hauteur de l’en-tête').toBe(avant.entete?.height);
  expect(apres.entete?.y, 'position de l’en-tête').toBe(avant.entete?.y);
  expect(apres.titre?.y, 'position du titre').toBe(avant.titre?.y);
  expect(apres.titre?.x, 'abscisse du titre').toBe(avant.titre?.x);
});

test('E2E-435 : option « Choisir… » désactivée, présente avant et après le choix ; administrateur ressource', async ({
  page,
  request,
}) => {
  const m = await mondeAutrui(request);
  await page.setViewportSize({ width: 1440, height: 800 });
  await loginAsAdmin(page);
  await page.goto(adresseAutrui(S));
  const invite = listeRessource(page).locator('option[value=""]');
  await expect(invite).toHaveText('Choisir…');
  await expect(invite).toBeDisabled();
  await expect(listeRessource(page)).toHaveValue('');
  await listeRessource(page).selectOption({ label: 'Alice 4B' });
  await expect(titreFeuilleDe(page, 'Alice 4B')).toBeVisible();
  await expect(invite).toHaveCount(1);
  await expect(invite).toHaveText('Choisir…');
  await expect(invite).toBeDisabled();
  await expect(listeRessource(page)).toHaveValue(String(m.alice.id));

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await connecterAvec(page, EMAIL_ADMIN_RESSOURCE);
  await page.goto(adresseAutrui(S));
  await expect(listeRessource(page)).toHaveValue(String(m.adminRessource.id));
  await expect(invite).toHaveCount(1);
  await expect(invite).toBeDisabled();
});
