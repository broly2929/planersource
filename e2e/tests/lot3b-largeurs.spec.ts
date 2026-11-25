import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { colonnesCompletes } from './colonnes-completes.js';
import { activite, poserSaisies } from './lot2e-helpers.js';
import { activiteAvec, calculer, monde3b } from './lot3b-helpers.js';

/*
 * Largeurs du Gantt (D-069, SPEC §6 Affichage 15 et 16). Mesures par boundingBox et clientWidth, à 1440 puis
 * 1024 px de large, sans défilement ni capture d'image. Montage : une ligne par drapeau réel (aucun mode ne
 * porte aujourd'hui deux de ces drapeaux), une ligne sans drapeau, une ligne au nom de 60 caractères, une ligne
 * de niveau WBS 4 au nom de 60 caractères. E2E-41e : réponse de l'API interceptée pour porter retard + surcharge
 * (max structurel de `drapeauxDuree`, modes/duree.ts:37-38).
 */
const J06 = '2027-01-06T10:00:00';
const LARGEURS = [1440, 1024];
const NOM_LONG = 'Activité au nom très long pour vérifier la troncature du nom'; // 60 caractères
const NOM_N4 = 'Sous-sous-sous-activités de niveau quatre au nom de soixante'; // 60 caractères, WBS niveau 4
const TOLERANCE = 0.5;

async function montage(request: APIRequestContext, suffixe: string) {
  expect(NOM_LONG).toHaveLength(60);
  expect(NOM_N4).toHaveLength(60);
  const m = await monde3b(request, suffixe, ['Alice', 'Bob', 'Carole', 'Eve']);
  const p = m.projet.id;
  const g = m.gens;
  const retard = await activiteAvec(request, p, 'Retard FDUR', { mode: 'FDUR', duree_validee: 2 });
  await m.api.assignation(retard.id, g.Alice!.id, 3);
  const surcharge = await activiteAvec(request, p, 'Surcharge DDUR', {
    mode: 'DDUR',
    duree_validee: 2,
  });
  await m.api.assignation(surcharge.id, g.Bob!.id, 3);
  const occupe = await activite(request, p, 'Occupe Eve', 'MAN');
  const assignOccupe = await m.api.assignation(occupe.id, g.Eve!.id, 1);
  await poserSaisies(request, occupe.id, '2027-01', [
    { assignation_id: assignOccupe.id, jour: '2027-01-06', demi_journee: 'matin' },
    { assignation_id: assignOccupe.id, jour: '2027-01-06', demi_journee: 'apres_midi' },
  ]);
  const debut = await activiteAvec(request, p, 'Début STARR', {
    mode: 'STARR',
    debut_valide: '2027-01-06',
  });
  await m.api.assignation(debut.id, g.Eve!.id, 2);
  const simple = await activiteAvec(request, p, 'Simple');
  await m.api.assignation(simple.id, g.Carole!.id, 1);
  const long = await activiteAvec(request, p, NOM_LONG);
  await m.api.assignation(long.id, g.Carole!.id, 1);
  const n1 = await activiteAvec(request, p, 'Niveau 1');
  const n2 = await activiteAvec(request, p, 'Niveau 2', { parent_id: n1.id });
  const n3 = await activiteAvec(request, p, 'Niveau 3', { parent_id: n2.id });
  const n4 = await activiteAvec(request, p, NOM_N4, { parent_id: n3.id });
  await m.api.assignation(n4.id, g.Carole!.id, 1);
  await calculer(request, [p]);
  return m;
}

async function ouvrir(page: Page, projetId: number, largeur: number, zoom = 'semaine') {
  await page.setViewportSize({ width: largeur, height: 800 });
  await page.goto(`/projets/${projetId}?onglet=gantt&zoom=${zoom}`);
  await page.locator('svg[data-zoom]').waitFor();
}

const boite = async (l: Locator) => {
  const b = await l.boundingBox();
  if (!b) throw new Error('élément sans boîte');
  return b;
};

/** Montage, horloge, connexion et ouverture du Gantt à la largeur voulue ; renvoie les repères de mesure. */
async function pret(
  page: Page,
  request: APIRequestContext,
  suffixe: string,
  largeur: number,
  avant?: (page: Page) => Promise<void>,
) {
  const m = await montage(request, suffixe);
  await avant?.(page);
  await page.clock.setFixedTime(J06);
  await connecterAvec(page, m.emailChef);
  await ouvrir(page, m.projet.id, largeur);
  const tableau = page.getByRole('table', { name: 'Éléments du projet' });
  const z = await boite(tableau.locator('xpath=ancestor::div[@tabindex][1]'));
  const dedans = (b: { x: number; width: number }, quoi: string) => {
    expect(b.x, `${largeur} px : ${quoi}, bord gauche`).toBeGreaterThanOrEqual(z.x - TOLERANCE);
    expect(b.x + b.width, `${largeur} px : ${quoi}, bord droit`).toBeLessThanOrEqual(
      z.x + z.width + TOLERANCE,
    );
  };
  return { tableau, dedans };
}

for (const largeur of LARGEURS) {
  test(`E2E-41a-r1 (${largeur} px) : chaque badge de la colonne Drapeaux est entièrement visible, sans défilement`, async ({
    page,
    request,
  }) => {
    await colonnesCompletes(page);
    const { tableau, dedans } = await pret(page, request, `E2E41A${largeur}`, largeur);
    for (const libelle of ['Retard', 'Surcharge', 'Début non respecté']) {
      const badge = tableau.getByText(libelle, { exact: true });
      await expect(badge).toHaveCount(1);
      dedans(await boite(badge), `badge ${libelle}`);
    }
  });

  test(`E2E-41b-r1 (${largeur} px) : WBS et Nom entièrement visibles sur toutes les lignes, dont le nom de 60 caractères`, async ({
    page,
    request,
  }) => {
    await colonnesCompletes(page);
    const { tableau, dedans } = await pret(page, request, `E2E41B${largeur}`, largeur);
    const lignes = tableau.locator('tbody tr');
    expect(await lignes.count()).toBe(10);
    // La colonne Drapeaux fixée à droite ne doit pas recouvrir WBS ni Nom : bord gauche de son en-tête.
    const drapeaux = await boite(tableau.getByRole('columnheader', { name: 'Drapeaux' }));
    for (let i = 0; i < 10; i++) {
      for (const [col, quoi] of [
        [0, 'WBS'],
        [1, 'Nom'],
      ] as const) {
        const cellule = await boite(lignes.nth(i).locator('td').nth(col));
        dedans(cellule, `${quoi}, ligne ${i}`);
        expect(
          cellule.x + cellule.width,
          `${largeur} px : ${quoi}, ligne ${i}, recouvert par Drapeaux`,
        ).toBeLessThanOrEqual(drapeaux.x + TOLERANCE);
      }
    }
    await expect(tableau.getByText(NOM_LONG)).toBeVisible();
    await expect(tableau.getByText(NOM_N4)).toBeVisible();
  });

  test(`E2E-41c (${largeur} px) : la page ne défile pas en horizontal`, async ({
    page,
    request,
  }) => {
    await pret(page, request, `E2E41C${largeur}`, largeur);
    const mesure = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(mesure.scroll).toBeLessThanOrEqual(mesure.client);
  });

  test(`E2E-41d (${largeur} px) : une ligne à badge a la hauteur d'une ligne sans badge`, async ({
    page,
    request,
  }) => {
    const { tableau } = await pret(page, request, `E2E41D${largeur}`, largeur);
    const ligne = (nom: string) =>
      tableau.getByRole('row').filter({ has: page.getByRole('cell', { name: nom, exact: true }) });
    const reference = (await boite(ligne('Simple'))).height;
    for (const nom of ['Retard FDUR', 'Surcharge DDUR', 'Début STARR']) {
      expect((await boite(ligne(nom))).height, nom).toBeCloseTo(reference, 0);
    }
  });
}

/** Réponse de l'API du Gantt modifiée : la ligne « Simple » porte retard et surcharge. */
const retardEtSurcharge = async (page: Page) => {
  await page.route('**/api/projets/*/gantt', async (route) => {
    const reponse = await route.fetch();
    const json = (await reponse.json()) as { elements: { nom: string; drapeaux: string[] }[] };
    const simple = json.elements.find((e) => e.nom === 'Simple');
    if (!simple) throw new Error('ligne « Simple » absente de la réponse');
    simple.drapeaux = ['retard', 'surcharge'];
    await route.fulfill({ response: reponse, json });
  });
};

for (const largeur of LARGEURS) {
  test(`E2E-41e-r1 (${largeur} px) : une ligne à deux badges (retard + surcharge) : badges visibles, hauteur de ligne inchangée`, async ({
    page,
    request,
  }) => {
    await colonnesCompletes(page);
    const { tableau, dedans } = await pret(
      page,
      request,
      `E2E41E${largeur}`,
      largeur,
      retardEtSurcharge,
    );
    const ligne = (nom: string) =>
      tableau.getByRole('row').filter({ has: page.getByRole('cell', { name: nom, exact: true }) });
    for (const libelle of ['Retard', 'Surcharge']) {
      const badge = ligne('Simple').getByText(libelle, { exact: true });
      await expect(badge).toHaveCount(1);
      dedans(await boite(badge), `badge ${libelle}`);
    }
    const sansBadge = (await boite(ligne('Occupe Eve'))).height;
    expect((await boite(ligne('Simple'))).height).toBeCloseTo(sansBadge, 0);
  });
}

test('E2E-42 : le SVG est au moins aussi large que son conteneur (trois zooms, 1440 et 1024 px)', async ({
  page,
  request,
}) => {
  const m = await montage(request, 'E2E42');
  await page.clock.setFixedTime(J06);
  await connecterAvec(page, m.emailChef);

  for (const largeur of LARGEURS) {
    for (const zoom of ['jour', 'semaine', 'mois']) {
      await ouvrir(page, m.projet.id, largeur, zoom);
      const svg = page.locator('svg[data-zoom]');
      const conteneur = svg.locator('xpath=..');
      await expect
        .poll(
          async () => {
            const w = (await boite(svg)).width;
            const c = await conteneur.evaluate((e) => e.clientWidth);
            return w >= c;
          },
          { message: `${largeur} px, zoom ${zoom} : largeur du SVG ≥ conteneur` },
        )
        .toBe(true);
    }
  }
});
