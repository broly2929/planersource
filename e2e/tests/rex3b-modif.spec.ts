// REX-3b (D-127 (6)) : modification depuis l'Accueil et l'onglet Gantt. E2E-273 à E2E-276.
// Base « administrateur seul » remise à zéro avant et après chaque test, horloge figée au 06/01/2027,
// données créées par l'API, modifications faites à l'écran, effet relu à l'écran et par l'API.
// Contrat (à relire) :
//   - nom d'une activité ou d'un jalon = bouton (nom accessible = le nom) si l'utilisateur écrit le projet,
//     dans le tableau de l'Accueil et du Gantt du projet ; il ouvre « Modifier l'activité » ou « Modifier le
//     jalon » (dialogues de l'onglet Planning) ; texte simple sinon ;
//   - projet (Accueil) et sous-projet (Gantt du projet) : lien conservé, plus un bouton crayon
//     « Modifier le projet <nom> » (dialogue « Modifier le projet ») si l'utilisateur écrit ;
//   - après enregistrement : l'écran est rechargé (dépliage de l'Accueil conservé).
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { chefLecteur } from './lot6b-helpers.js';
import { activiteAvec, calculer, jalonAvec, monde3b, sousProjet } from './lot3b-helpers.js';
import { remettreAdminSeul } from './lot3c-helpers.js';

const J06 = '2027-01-06T10:00:00';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul);

const tableauAccueil = (page: Page) =>
  page.getByRole('region', { name: 'Tableau du Gantt global', exact: true });
const tableauGantt = (page: Page) =>
  page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
const gantt = (projetId: number) => `/projets/${projetId}?onglet=gantt`;
const crayons = (page: Page) => page.getByRole('button', { name: /^Modifier le projet / });

/** Projet du chef : activité « Tâche M » (START, Alice), jalon « Jalon M », sous-projet, calculé. */
async function monde(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Tâche M', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  const j = await jalonAvec(request, m.projet.id, 'Jalon M', {
    type: 'fixe',
    date_validee: '2027-01-25',
  });
  const sp = await sousProjet(
    request,
    m.projet.id,
    `SP-${suffixe}`,
    `Sous-projet ${suffixe}`,
    m.chef.id,
  );
  await calculer(request, [m.projet.id]);
  return { ...m, a, j, sp, nomProjet: `Projet ${suffixe}` };
}

async function nomActivite(request: APIRequestContext, projetId: number, id: number) {
  const r = await request.get(`/api/projets/${projetId}/activites`);
  return ((await r.json()) as { id: number; nom: string }[]).find((x) => x.id === id)?.nom;
}
async function nomJalon(request: APIRequestContext, projetId: number, id: number) {
  const r = await request.get(`/api/projets/${projetId}/jalons`);
  return ((await r.json()) as { id: number; nom: string }[]).find((x) => x.id === id)?.nom;
}
async function nomProjet(request: APIRequestContext, id: number) {
  const r = await request.get(`/api/projets/${id}`);
  return ((await r.json()) as { nom: string }).nom;
}

/** Clic sur le bouton-nom `ancien`, dialogue `titre` prérempli, renommé en `nouveau`, enregistré. */
async function renommer(
  page: Page,
  zone: ReturnType<typeof tableauGantt>,
  ancien: string,
  titre: string,
  nouveau: string,
) {
  await zone.getByRole('button', { name: ancien, exact: true }).click();
  const d = page.getByRole('dialog', { name: titre });
  await expect(d).toBeVisible();
  await expect(d.getByLabel('Nom')).toHaveValue(ancien);
  await d.getByLabel('Nom').fill(nouveau);
  await d.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(d).toHaveCount(0);
}

test('E2E-273 : Accueil, bouton-nom d’une activité puis d’un jalon : dialogue prérempli, renommage par l’écran, effet sur l’Accueil et en base', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E273');
  await connecterAvec(page, m.emailChef);
  await page.goto('/');
  await page.getByRole('button', { name: `Déplier ${m.nomProjet}`, exact: true }).click();
  const zone = tableauAccueil(page);
  await expect(zone.getByRole('button', { name: 'Tâche M', exact: true })).toBeVisible();

  await renommer(page, zone, 'Tâche M', 'Modifier l’activité', 'Tâche M renommée');
  await expect(zone.getByRole('button', { name: 'Tâche M renommée', exact: true })).toBeVisible();
  expect(await nomActivite(request, m.projet.id, m.a.id)).toBe('Tâche M renommée');

  await renommer(page, zone, 'Jalon M', 'Modifier le jalon', 'Jalon M renommé');
  await expect(zone.getByRole('button', { name: 'Jalon M renommé', exact: true })).toBeVisible();
  expect(await nomJalon(request, m.projet.id, m.j.id)).toBe('Jalon M renommé');
});

test('E2E-274 : onglet Gantt, bouton-nom d’une activité puis d’un jalon : renommage par l’écran, effet dans le Gantt, l’onglet Planning et en base', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E274');
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  const zone = tableauGantt(page);
  await expect(zone.getByRole('button', { name: 'Tâche M', exact: true })).toBeVisible();

  await renommer(page, zone, 'Tâche M', 'Modifier l’activité', 'Tâche G');
  await expect(zone.getByRole('button', { name: 'Tâche G', exact: true })).toBeVisible();
  expect(await nomActivite(request, m.projet.id, m.a.id)).toBe('Tâche G');

  await renommer(page, zone, 'Jalon M', 'Modifier le jalon', 'Jalon G');
  await expect(zone.getByRole('button', { name: 'Jalon G', exact: true })).toBeVisible();
  expect(await nomJalon(request, m.projet.id, m.j.id)).toBe('Jalon G');

  await page.getByRole('tab', { name: 'Planning' }).click();
  await expect(page.getByRole('button', { name: 'Modifier Tâche G', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modifier Jalon G', exact: true })).toBeVisible();
});

test('E2E-275 : crayon « Modifier le projet <nom> » : projet de l’Accueil et sous-projet du Gantt, lien conservé, renommage par l’écran', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E275');
  await connecterAvec(page, m.emailChef);
  await page.goto('/');
  const zone = tableauAccueil(page);
  const lien = zone.getByRole('link', { name: m.nomProjet, exact: true });
  await expect(lien).toHaveAttribute('href', `/projets/${m.projet.id}`);
  await zone
    .getByRole('button', { name: `Modifier le projet ${m.nomProjet}`, exact: true })
    .click();
  const d = page.getByRole('dialog', { name: 'Modifier le projet' });
  await expect(d.getByLabel('Nom')).toHaveValue(m.nomProjet);
  await d.getByLabel('Nom').fill('Projet E2E275 bis');
  await d.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(d).toHaveCount(0);
  await expect(zone.getByRole('link', { name: 'Projet E2E275 bis', exact: true })).toHaveAttribute(
    'href',
    `/projets/${m.projet.id}`,
  );
  await expect(
    zone.getByRole('button', { name: 'Modifier le projet Projet E2E275 bis', exact: true }),
  ).toBeVisible();
  expect(await nomProjet(request, m.projet.id)).toBe('Projet E2E275 bis');

  // Sous-projet dans le Gantt du projet.
  await page.goto(gantt(m.projet.id));
  const g = tableauGantt(page);
  await expect(
    g.getByRole('link', { name: 'SP-E2E275 · Sous-projet E2E275', exact: true }),
  ).toHaveAttribute('href', `/projets/${m.sp.id}`);
  await g
    .getByRole('button', { name: 'Modifier le projet Sous-projet E2E275', exact: true })
    .click();
  const ds = page.getByRole('dialog', { name: 'Modifier le projet' });
  await expect(ds.getByLabel('Nom')).toHaveValue('Sous-projet E2E275');
  await ds.getByLabel('Nom').fill('Sous-projet modifié');
  await ds.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(ds).toHaveCount(0);
  await expect(
    g.getByRole('link', { name: 'SP-E2E275 · Sous-projet modifié', exact: true }),
  ).toHaveAttribute('href', `/projets/${m.sp.id}`);
  expect(await nomProjet(request, m.sp.id)).toBe('Sous-projet modifié');
});

test('E2E-276-r1 : lecture seule (chef affecté au projet d’un autre chef) : noms en texte, ni bouton-nom ni crayon, sur l’Accueil et dans l’onglet Gantt', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E276');
  // Révision 6b (D-031, D-148 (9)) : témoin lecture seule = chef de projet affecté au projet d'un autre chef.
  await connecterAvec(page, await chefLecteur(request, m.projet.id, 'E276'));
  await page.goto('/');
  await page.getByRole('button', { name: `Déplier ${m.nomProjet}`, exact: true }).click();
  const zone = tableauAccueil(page);
  for (const nom of ['Tâche M', 'Jalon M']) {
    await expect(zone.getByText(nom, { exact: true }), nom).toBeVisible();
    await expect(zone.getByRole('button', { name: nom, exact: true }), nom).toHaveCount(0);
  }
  await expect(zone.getByRole('link', { name: m.nomProjet, exact: true })).toBeVisible();
  await expect(crayons(page)).toHaveCount(0);

  await page.goto(gantt(m.projet.id));
  const g = tableauGantt(page);
  for (const nom of ['Tâche M', 'Jalon M']) {
    await expect(g.getByText(nom, { exact: true }), nom).toBeVisible();
    await expect(g.getByRole('button', { name: nom, exact: true }), nom).toHaveCount(0);
  }
  await expect(crayons(page)).toHaveCount(0);
});
