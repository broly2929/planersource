// Lot 3d-3a (D-094) : gestes à la souris sur les barres du Gantt. E2E-132 à E2E-142.
// Base « administrateur seul » remise à zéro avant et après chaque test, horloge du navigateur figée au
// 06/01/2027, D0 des calculs 2027-01-04, zoom jour sauf mention contraire, données créées par l'API.
// Contrat (à relire) : barre `svg [data-element-id]` ; poignée `svg [data-poignee="gauche|droite"]` avec
// `data-poignee-element` = id de l'élément ; contour `svg [data-contour-element]` ; bandeau
// role="status" « Planning à recalculer » avec bouton « Calculer » ; alerte role="alert" avec un bouton
// « Fermer » ; état des contours et du bandeau gardé au changement d'onglet (E2E-132).
// Les PATCH sont comptés par page.on('request'). Valeurs des dates validées lues dans le dialogue
// « Modifier l'activité » (l'onglet Planning n'affiche pas les dates validées dans son tableau).
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activite, clore, poserSaisies } from './lot2e-helpers.js';
import { activiteAvec, calculer, jalonAvec, monde3b } from './lot3b-helpers.js';
import { dialogueCalcul, lireGantt, remettreAdminSeul } from './lot3c-helpers.js';

const J06 = '2027-01-06T10:00:00';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul);

const gantt = (projetId: number, zoom = 'jour') => `/projets/${projetId}?onglet=gantt&zoom=${zoom}`;
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);
const poignees = (page: Page, id?: number) =>
  page.locator(id === undefined ? 'svg [data-poignee]' : `svg [data-poignee-element="${id}"]`);
const poignee = (page: Page, id: number, cote: 'gauche' | 'droite') =>
  page.locator(`svg [data-poignee="${cote}"][data-poignee-element="${id}"]`);
const contours = (page: Page, id?: number) =>
  page.locator(
    id === undefined ? 'svg [data-contour-element]' : `svg [data-contour-element="${id}"]`,
  );
const bandeau = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Planning à recalculer' });
const alertes = (page: Page) => page.getByRole('alert');

interface Patch {
  url: string;
  corps: Record<string, unknown>;
}

/** Les PATCH d'activité émis par la page, comptés par page.on('request'). */
function suivrePatchs(page: Page): Patch[] {
  const patchs: Patch[] = [];
  page.on('request', (r) => {
    if (r.method() === 'PATCH' && /\/api\/activites\/\d+$/.test(r.url())) {
      patchs.push({ url: r.url(), corps: r.postDataJSON() as Record<string, unknown> });
    }
  });
  return patchs;
}

/** Laisse passer deux images du navigateur : une absence de requête est alors observable. */
const laisserPasser = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

/** Appui au centre de `cible`, déplacement de (dx, dy) pixels, relâchement. */
async function glisser(page: Page, cible: Locator, dx: number, dy = 0): Promise<void> {
  await cible.scrollIntoViewIfNeeded();
  const b = (await cible.boundingBox())!;
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6)) });
  await page.mouse.up();
  await laisserPasser(page);
}

const boite = async (cible: Locator) => (await cible.boundingBox())!;

/** Préambule : le nom accessible de départ de la barre (dates planifiées avant tout geste). */
async function verifierDepart(page: Page, id: number, nom: string, du: string, au: string) {
  await expect(barre(page, id)).toHaveAttribute('aria-label', `${nom}, du ${du} au ${au}`);
}

const curseur = (cible: Locator) => cible.evaluate((el) => getComputedStyle(el).cursor);

/** Une activité assignée à `ressource` pour `charge` jours. */
async function activiteAssignee(
  request: APIRequestContext,
  m: Awaited<ReturnType<typeof monde3b>>,
  ressource: string,
  nom: string,
  charge: number,
  champs: Record<string, unknown>,
) {
  const a = await activiteAvec(request, m.projet.id, nom, champs);
  await m.api.assignation(a.id, m.gens[ressource]!.id, charge);
  return a;
}

const START_11 = { mode: 'START', debut_valide: '2027-01-11' };

/** Ouvre le dialogue « Modifier <nom> » depuis l'onglet Planning ; l'appelant le ferme. */
async function dialogueModifier(page: Page, nom: string) {
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: `Modifier ${nom}`, exact: true }).click();
  const dialogue = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await expect(dialogue).toBeVisible();
  return dialogue;
}

test('E2E-132 : glisser le corps d’une START → un PATCH, contour au 14/01, bandeau, début validé ; le calcul efface contour et bandeau', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E132', ['Alice']);
  const a = await activiteAssignee(request, m, 'Alice', 'Tâche START', 5, START_11);
  await calculer(request, [m.projet.id]);
  const patchs = suivrePatchs(page);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  const nomDepart = 'Tâche START, du 11/01/2027 au 15/01/2027';
  await verifierDepart(page, a.id, 'Tâche START', '11/01/2027', '15/01/2027');
  const avant = await boite(barre(page, a.id));

  await glisser(page, barre(page, a.id), 72);
  await expect.poll(() => patchs.length).toBe(1);
  expect(patchs[0]!.corps).toEqual({ debut_valide: '2027-01-14' });
  await expect(barre(page, a.id)).toHaveAttribute('aria-label', nomDepart);
  await expect(contours(page, a.id)).toHaveCount(1);
  const contour = await boite(contours(page, a.id));
  expect(Math.abs(contour.x - (avant.x + 72))).toBeLessThanOrEqual(1);
  await expect(bandeau(page)).toBeVisible();

  const dialogue = await dialogueModifier(page, 'Tâche START');
  await expect(dialogue.getByLabel('Début validé')).toHaveValue('2027-01-14');
  await dialogue.getByRole('button', { name: 'Annuler' }).click();

  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect(bandeau(page)).toBeVisible();
  await expect(contours(page, a.id)).toHaveCount(1);
  const contourApres = await boite(contours(page, a.id));
  expect(Math.abs(contourApres.x - contour.x)).toBeLessThanOrEqual(1);
  await bandeau(page).getByRole('button', { name: 'Calculer', exact: true }).click();
  const calcul = dialogueCalcul(page);
  await expect(calcul).toBeVisible();
  await calcul.getByLabel('Date de début du calcul').fill('2027-01-04');
  await calcul.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(calcul).toHaveCount(0);
  await expect(barre(page, a.id)).toHaveAttribute('aria-label', /^Tâche START, du 14\/01\/2027/);
  await expect(contours(page)).toHaveCount(0);
  await expect(bandeau(page)).toHaveCount(0);
});

test('E2E-133a : poignée droite d’une FDUR +72 px → durée validée 6', async ({ page, request }) => {
  const m = await monde3b(request, 'E2E133A', ['Alice']);
  const a = await activiteAssignee(request, m, 'Alice', 'Tâche FDUR', 5, {
    mode: 'FDUR',
    debut_valide: '2027-01-11',
    duree_validee: 5,
  });
  await calculer(request, [m.projet.id]);
  const patchs = suivrePatchs(page);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await verifierDepart(page, a.id, 'Tâche FDUR', '11/01/2027', '15/01/2027');

  await glisser(page, poignee(page, a.id, 'droite'), 72);
  await expect.poll(() => patchs.length).toBe(1);
  expect(patchs[0]!.corps).toEqual({ duree_validee: 6 });
  const dialogue = await dialogueModifier(page, 'Tâche FDUR');
  await expect(dialogue.getByLabel('Durée validée (jours ouvrés)')).toHaveValue('6');
});

test('E2E-133b : poignée droite d’une ALAP +72 px → fin validée 18/01/2027', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E133B', ['Alice']);
  const a = await activiteAssignee(request, m, 'Alice', 'Tâche ALAP', 5, {
    mode: 'ALAP',
    fin_valide: '2027-01-15',
  });
  await calculer(request, [m.projet.id]);
  const patchs = suivrePatchs(page);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await verifierDepart(page, a.id, 'Tâche ALAP', '11/01/2027', '15/01/2027');

  await glisser(page, poignee(page, a.id, 'droite'), 72);
  await expect.poll(() => patchs.length).toBe(1);
  expect(patchs[0]!.corps).toEqual({ fin_valide: '2027-01-18' });
  const dialogue = await dialogueModifier(page, 'Tâche ALAP');
  await expect(dialogue.getByLabel('Fin validée')).toHaveValue('2027-01-18');
});

test('E2E-133c : poignée gauche +72 px puis poignée droite −72 px d’une REGUL, sans recharger', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E133C', ['Alice']);
  const a = await activiteAssignee(request, m, 'Alice', 'Tâche REGUL', 10, {
    mode: 'REGUL',
    debut_valide: '2027-01-04',
    fin_valide: '2027-01-15',
  });
  await calculer(request, [m.projet.id]);
  const patchs = suivrePatchs(page);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await verifierDepart(page, a.id, 'Tâche REGUL', '04/01/2027', '15/01/2027');

  await glisser(page, poignee(page, a.id, 'gauche'), 72);
  await expect.poll(() => patchs.length).toBe(1);
  expect(patchs[0]!.corps).toEqual({ debut_valide: '2027-01-07' });
  await expect(contours(page, a.id)).toHaveCount(1);

  await glisser(page, poignee(page, a.id, 'droite'), -72);
  await expect.poll(() => patchs.length).toBe(2);
  expect(patchs[1]!.corps).toEqual({ fin_valide: '2027-01-12' });

  const dialogue = await dialogueModifier(page, 'Tâche REGUL');
  await expect(dialogue.getByLabel('Début validé')).toHaveValue('2027-01-07');
  await expect(dialogue.getByLabel('Fin validée')).toHaveValue('2027-01-12');
});

test('E2E-134 : deux glissers successifs du corps d’une REGUL sans recharger : le second part des dates renvoyées par le premier', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E134', ['Alice']);
  const a = await activiteAssignee(request, m, 'Alice', 'Tâche REGUL', 10, {
    mode: 'REGUL',
    debut_valide: '2027-01-04',
    fin_valide: '2027-01-15',
  });
  await calculer(request, [m.projet.id]);
  const patchs = suivrePatchs(page);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await verifierDepart(page, a.id, 'Tâche REGUL', '04/01/2027', '15/01/2027');

  await glisser(page, barre(page, a.id), 168);
  await expect.poll(() => patchs.length).toBe(1);
  expect(patchs[0]!.corps).toEqual({ debut_valide: '2027-01-11', fin_valide: '2027-01-22' });
  await expect(contours(page, a.id)).toHaveCount(1);

  await glisser(page, barre(page, a.id), 168);
  await expect.poll(() => patchs.length).toBe(2);
  expect(patchs[1]!.corps).toEqual({ debut_valide: '2027-01-18', fin_valide: '2027-01-29' });

  const dialogue = await dialogueModifier(page, 'Tâche REGUL');
  await expect(dialogue.getByLabel('Début validé')).toHaveValue('2027-01-18');
  await expect(dialogue.getByLabel('Fin validée')).toHaveValue('2027-01-29');
});

test('E2E-135 : refus réel de l’API : alerte, barre en place sans contour ni bandeau, fermeture, base inchangée', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E135', ['Alice']);
  const a = await activiteAssignee(request, m, 'Alice', 'Tâche START', 5, {
    ...START_11,
    fin_valide: '2027-01-15',
  });
  await calculer(request, [m.projet.id]);
  const patchs = suivrePatchs(page);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await verifierDepart(page, a.id, 'Tâche START', '11/01/2027', '15/01/2027');
  const avant = await boite(barre(page, a.id));

  await glisser(page, barre(page, a.id), 168);
  await expect.poll(() => patchs.length).toBe(1);
  await expect(alertes(page)).toHaveCount(1);
  await expect(alertes(page)).toContainText(
    'Modification refusée : la fin validée précède le début validé.',
  );
  const apres = await boite(barre(page, a.id));
  expect(Math.abs(apres.x - avant.x)).toBeLessThanOrEqual(1);
  await expect(contours(page)).toHaveCount(0);
  await expect(bandeau(page)).toHaveCount(0);

  await alertes(page).getByRole('button', { name: 'Fermer' }).click();
  await expect(alertes(page)).toHaveCount(0);

  const r = await request.get(`/api/projets/${m.projet.id}/activites`);
  expect(r.ok()).toBeTruthy();
  const lignes = (await r.json()) as { id: number; debut_valide: string | null }[];
  expect(lignes.find((l) => l.id === a.id)?.debut_valide).toBe('2027-01-11');
});

test('E2E-136 : réponses interceptées (400, 403, 404, 422 sans code, 500, réseau) : texte, alerte unique, barre en place', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E136', ['Alice']);
  const a = await activiteAssignee(request, m, 'Alice', 'Tâche START', 5, START_11);
  await calculer(request, [m.projet.id]);
  const patchs = suivrePatchs(page);
  const cas: { reponse: number | 'reseau'; corps?: object; texte: string }[] = [
    {
      reponse: 400,
      corps: { erreur: 'Données invalides' },
      texte: 'Modification refusée : dates invalides.',
    },
    {
      reponse: 403,
      corps: { erreur: 'Interdit' },
      texte: 'Modification impossible : rechargez la page.',
    },
    {
      reponse: 404,
      corps: { erreur: 'Introuvable' },
      texte: 'Modification impossible : rechargez la page.',
    },
    {
      reponse: 422,
      corps: { erreur: 'Règle de planning non respectée' },
      texte: 'Cette opération enfreint une règle du planning.',
    },
    {
      reponse: 500,
      corps: { erreur: 'Erreur' },
      texte: 'Modification impossible pour le moment. Réessayez.',
    },
    { reponse: 'reseau', texte: 'Modification impossible pour le moment. Réessayez.' },
  ];
  const file = [...cas];
  await page.route('**/api/activites/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    const suivant = file.shift()!;
    if (suivant.reponse === 'reseau') return route.abort();
    return route.fulfill({ status: suivant.reponse, json: suivant.corps });
  });
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await verifierDepart(page, a.id, 'Tâche START', '11/01/2027', '15/01/2027');
  const avant = await boite(barre(page, a.id));

  for (const [i, c] of cas.entries()) {
    await glisser(page, barre(page, a.id), 72);
    await expect.poll(() => patchs.length, `geste ${i + 1}`).toBe(i + 1);
    await expect(alertes(page), `geste ${i + 1}`).toHaveCount(1);
    await expect(alertes(page)).toContainText(c.texte);
    const apres = await boite(barre(page, a.id));
    expect(Math.abs(apres.x - avant.x), `geste ${i + 1} : barre en place`).toBeLessThanOrEqual(1);
    await expect(contours(page)).toHaveCount(0);
    await expect(bandeau(page)).toHaveCount(0);
  }
});

test('E2E-137 : réponse retenue : barre à la position relâchée, second geste ignoré, contour après la réponse', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E137', ['Alice']);
  const a = await activiteAssignee(request, m, 'Alice', 'Tâche START', 5, START_11);
  await calculer(request, [m.projet.id]);
  const patchs = suivrePatchs(page);
  let liberer!: () => void;
  const attente = new Promise<void>((r) => (liberer = r));
  await page.route('**/api/activites/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    await attente;
    return route.continue();
  });
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await verifierDepart(page, a.id, 'Tâche START', '11/01/2027', '15/01/2027');
  const avant = await boite(barre(page, a.id));

  await glisser(page, barre(page, a.id), 72);
  await expect.poll(() => patchs.length).toBe(1);
  await expect
    .poll(async () => Math.abs((await boite(barre(page, a.id))).x - (avant.x + 72)))
    .toBeLessThanOrEqual(1);

  await glisser(page, barre(page, a.id), 72);
  expect(patchs.length).toBe(1);

  liberer();
  await expect(contours(page, a.id)).toHaveCount(1);
  const contour = await boite(contours(page, a.id));
  expect(Math.abs(contour.x - (avant.x + 72))).toBeLessThanOrEqual(1);
  expect(patchs.length).toBe(1);
});

test('E2E-138 : ASAP, MAN, jalon, parent, activité close, START au zoom mois : aucun geste ; témoin positif', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E138', ['Alice', 'Bob', 'Carole', 'Dave']);
  const p = m.projet.id;
  const asap = await activiteAssignee(request, m, 'Alice', 'Tâche ASAP', 3, {});
  const man = await activite(request, p, 'Tâche MAN', 'MAN');
  const assignMan = await m.api.assignation(man.id, m.gens.Bob!.id, 1);
  await poserSaisies(request, man.id, '2027-01', [
    { assignation_id: assignMan.id, jour: '2027-01-05', demi_journee: 'matin' },
    { assignation_id: assignMan.id, jour: '2027-01-05', demi_journee: 'apres_midi' },
  ]);
  const jalon = await jalonAvec(request, p, 'Jalon fixe', {
    type: 'fixe',
    date_validee: '2027-01-12',
  });
  const parent = await activiteAvec(request, p, 'Tâche parent');
  const enfant = await activiteAvec(request, p, 'Tâche enfant', { parent_id: parent.id });
  await m.api.assignation(enfant.id, m.gens.Carole!.id, 3);
  const close = await activiteAssignee(request, m, 'Dave', 'Tâche close', 5, START_11);
  const start = await activiteAssignee(request, m, 'Alice', 'Tâche START', 2, {
    mode: 'START',
    debut_valide: '2027-01-18',
  });
  await calculer(request, [p]);
  await clore(request, close.id);
  const patchs = suivrePatchs(page);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(p));

  const cibles = [
    ['ASAP', asap.id],
    ['MAN', man.id],
    ['jalon', jalon.id],
    ['parent', parent.id],
    ['close', close.id],
  ] as const;
  const noms: Record<number, string | null> = {};
  for (const [libelle, id] of cibles) {
    await expect(barre(page, id), libelle).toHaveCount(1);
    noms[id] = await barre(page, id).getAttribute('aria-label');
    expect(noms[id], libelle).toBeTruthy();
  }
  await expect(barre(page, start.id)).toHaveAttribute(
    'aria-label',
    /^Tâche START, du 18\/01\/2027/,
  );
  await expect(poignees(page)).toHaveCount(0);

  for (const [libelle, id] of cibles) {
    expect(await curseur(barre(page, id)), `curseur ${libelle}`).not.toBe('grab');
    await glisser(page, barre(page, id), 72);
    await expect(barre(page, id), libelle).toHaveAttribute('aria-label', noms[id]!);
  }
  expect(patchs.length).toBe(0);
  await expect(poignees(page)).toHaveCount(0);

  await page.goto(gantt(p, 'mois'));
  const nomStart = await barre(page, start.id).getAttribute('aria-label');
  expect(nomStart).toMatch(/^Tâche START, du 18\/01\/2027/);
  expect(await curseur(barre(page, start.id))).not.toBe('grab');
  await glisser(page, barre(page, start.id), 72);
  expect(patchs.length).toBe(0);
  await expect(poignees(page)).toHaveCount(0);
  await expect(barre(page, start.id)).toHaveAttribute('aria-label', nomStart!);
  await expect(contours(page)).toHaveCount(0);
  await expect(bandeau(page)).toHaveCount(0);

  // Témoin positif (D-095 (4)) : la même START, au zoom jour, se déplace.
  await page.goto(gantt(p, 'jour'));
  await expect(barre(page, start.id)).toHaveAttribute(
    'aria-label',
    /^Tâche START, du 18\/01\/2027/,
  );
  await glisser(page, barre(page, start.id), 72);
  await expect.poll(() => patchs.length, 'témoin positif').toBe(1);
  await laisserPasser(page);
  expect(patchs.length).toBe(1);
});

test('E2E-139 : ressource sans droit d’écriture : aucun geste, aucune poignée ; témoin positif du chef', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E139', ['Alice']);
  const a = await activiteAssignee(request, m, 'Alice', 'Tâche START', 5, START_11);
  await calculer(request, [m.projet.id]);
  expect((await lireGantt(request, m.projet.id)).projet.peut_ecrire).toBe(true);
  const patchs = suivrePatchs(page);
  await connecterAvec(page, m.gens.Alice!.email);
  await page.goto(gantt(m.projet.id));
  await verifierDepart(page, a.id, 'Tâche START', '11/01/2027', '15/01/2027');

  await glisser(page, barre(page, a.id), 72);
  expect(patchs.length).toBe(0);
  await expect(poignees(page)).toHaveCount(0);
  await expect(bandeau(page)).toHaveCount(0);
  await expect(contours(page)).toHaveCount(0);
  await verifierDepart(page, a.id, 'Tâche START', '11/01/2027', '15/01/2027');

  // Témoin positif (D-095 (4)) : même START, session du chef de projet, la même base.
  await page.context().clearCookies();
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await verifierDepart(page, a.id, 'Tâche START', '11/01/2027', '15/01/2027');
  await glisser(page, barre(page, a.id), 72);
  await expect.poll(() => patchs.length, 'témoin positif').toBe(1);
  await laisserPasser(page);
  expect(patchs.length).toBe(1);
});

test('E2E-140 : seuil de 4 px et arrondi du décalage selon le zoom', async ({ page, request }) => {
  const m = await monde3b(request, 'E2E140', ['Alice']);
  const a = await activiteAssignee(request, m, 'Alice', 'Tâche START', 5, START_11);
  await calculer(request, [m.projet.id]);
  const patchs = suivrePatchs(page);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id, 'jour'));
  await verifierDepart(page, a.id, 'Tâche START', '11/01/2027', '15/01/2027');

  await glisser(page, barre(page, a.id), 3);
  expect(patchs.length, '3 px').toBe(0);
  await glisser(page, barre(page, a.id), 11);
  expect(patchs.length, '11 px au zoom jour').toBe(0);
  await expect(contours(page)).toHaveCount(0);

  await page.goto(gantt(m.projet.id, 'semaine'));
  await verifierDepart(page, a.id, 'Tâche START', '11/01/2027', '15/01/2027');
  await glisser(page, barre(page, a.id), 21);
  await expect.poll(() => patchs.length, '21 px au zoom semaine').toBe(1);
  expect(patchs[0]!.corps).toEqual({ debut_valide: '2027-01-14' });
});

test('E2E-141 : poignées par mode, 6 px, hors de la barre, collées aux bords, curseurs', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E141', ['Alice', 'Bob', 'Carole', 'Dave']);
  const start = await activiteAssignee(request, m, 'Alice', 'Tâche START', 5, START_11);
  const alap = await activiteAssignee(request, m, 'Bob', 'Tâche ALAP', 5, {
    mode: 'ALAP',
    fin_valide: '2027-01-15',
  });
  const fdur = await activiteAssignee(request, m, 'Carole', 'Tâche FDUR', 5, {
    mode: 'FDUR',
    debut_valide: '2027-01-11',
    duree_validee: 5,
  });
  const regul = await activiteAssignee(request, m, 'Dave', 'Tâche REGUL', 10, {
    mode: 'REGUL',
    debut_valide: '2027-01-04',
    fin_valide: '2027-01-15',
  });
  await calculer(request, [m.projet.id]);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await verifierDepart(page, start.id, 'Tâche START', '11/01/2027', '15/01/2027');
  await verifierDepart(page, alap.id, 'Tâche ALAP', '11/01/2027', '15/01/2027');
  await verifierDepart(page, fdur.id, 'Tâche FDUR', '11/01/2027', '15/01/2027');
  await verifierDepart(page, regul.id, 'Tâche REGUL', '04/01/2027', '15/01/2027');

  await expect(poignees(page, start.id)).toHaveCount(0);
  await expect(poignees(page, alap.id)).toHaveCount(1);
  await expect(poignee(page, alap.id, 'droite')).toHaveCount(1);
  await expect(poignees(page, fdur.id)).toHaveCount(2);
  await expect(poignees(page, regul.id)).toHaveCount(2);
  expect(await curseur(barre(page, start.id))).toBe('grab');

  for (const [id, cotes] of [
    [alap.id, ['droite']],
    [fdur.id, ['gauche', 'droite']],
    [regul.id, ['gauche', 'droite']],
  ] as const) {
    const b = await boite(barre(page, id));
    for (const cote of cotes) {
      const h = await boite(poignee(page, id, cote));
      expect(h.width, `largeur ${id} ${cote}`).toBeCloseTo(6, 0);
      if (cote === 'droite') expect(Math.abs(h.x - (b.x + b.width))).toBeLessThanOrEqual(1);
      else expect(Math.abs(h.x + h.width - b.x)).toBeLessThanOrEqual(1);
      expect(await curseur(poignee(page, id, cote)), `curseur ${id} ${cote}`).toBe('ew-resize');
    }
  }
});

test('E2E-142 : un contour par élément, remplacé par un nouveau geste, perdu au rechargement', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E142', ['Alice', 'Bob']);
  const a = await activiteAssignee(request, m, 'Alice', 'Tâche A', 5, START_11);
  const b = await activiteAssignee(request, m, 'Bob', 'Tâche B', 5, START_11);
  await calculer(request, [m.projet.id]);
  const patchs = suivrePatchs(page);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await verifierDepart(page, a.id, 'Tâche A', '11/01/2027', '15/01/2027');
  await verifierDepart(page, b.id, 'Tâche B', '11/01/2027', '15/01/2027');

  const avantA = await boite(barre(page, a.id));
  const avantB = await boite(barre(page, b.id));
  await glisser(page, barre(page, a.id), 72);
  await expect(contours(page, a.id)).toHaveCount(1);
  await glisser(page, barre(page, b.id), 72);
  await expect(contours(page, b.id)).toHaveCount(1);
  await expect(contours(page)).toHaveCount(2);

  await glisser(page, barre(page, a.id), 144);
  await expect.poll(() => patchs.length).toBe(3);
  await expect(contours(page)).toHaveCount(2);
  await expect(contours(page, a.id)).toHaveCount(1);
  const contourA = await boite(contours(page, a.id));
  expect(Math.abs(contourA.x - (avantA.x + 144))).toBeLessThanOrEqual(1);
  const contourB = await boite(contours(page, b.id));
  expect(Math.abs(contourB.x - (avantB.x + 72))).toBeLessThanOrEqual(1);

  await page.reload();
  await verifierDepart(page, a.id, 'Tâche A', '11/01/2027', '15/01/2027');
  await expect(contours(page)).toHaveCount(0);
  await expect(bandeau(page)).toHaveCount(0);
});
