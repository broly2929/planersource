// gantt-colonnes, tranche 1 (D-212 (2), (3), (5) ; SPEC §6 « Colonnes et défilement (gantt-colonnes, D-212) ») :
// E2E-521 à E2E-537. Trois vues à deux zones : Gantt d'un projet, Gantt global de l'Accueil, planning d'une
// ressource. Données créées par l'API (pas le jeu de démonstration). Valeurs recopiées de D-212 : défaut 40 %
// de la vue (ou largeur minimale du critère D-069), bornes 200 px et 80 % de la vue, 16 px par flèche,
// hauteur limitée à la fenêtre. Valeurs des gestes recopiées de E2E-132 et E2E-182.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activite, poserSaisies } from './lot2e-helpers.js';
import { activiteAvec, calculer, monde3b } from './lot3b-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';

const J06 = '2027-01-06T10:00:00';
const NOM_LONG = 'Activité au nom très long pour vérifier la troncature du nom'; // 60 caractères
const TOLERANCE = 0.5;
const PAS = 16;
const MINIMUM = 200;

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.clock.setFixedTime(J06);
});
test.afterEach(remettreAdminSeul6b);

type Vue = 'projet' | 'accueil' | 'ressource';
const VUES: Vue[] = ['projet', 'accueil', 'ressource'];
const LIBELLES: Record<Vue, string> = {
  projet: "Gantt d'un projet",
  accueil: "Gantt global de l'Accueil",
  ressource: "planning d'une ressource",
};
const REGIONS: Record<Vue, [string, string]> = {
  projet: ['Tableau du Gantt', 'Calendrier du Gantt'],
  accueil: ['Tableau du Gantt global', 'Calendrier du Gantt global'],
  ressource: ['Tableau du planning de la ressource', 'Calendrier du planning de la ressource'],
};

const zoneTableau = (page: Page, v: Vue) =>
  page.getByRole('region', { name: REGIONS[v][0], exact: true });
const zoneCalendrier = (page: Page, v: Vue) =>
  page.getByRole('region', { name: REGIONS[v][1], exact: true });
/** La vue : conteneur commun des deux zones et du séparateur. */
const vueDe = (page: Page, v: Vue) => zoneTableau(page, v).locator('xpath=..');
const separateur = (page: Page, v: Vue) =>
  vueDe(page, v).getByRole('separator', { name: 'Largeur du tableau', exact: true });
const ligneDe = (page: Page, nom: string) =>
  zoneTableau(page, 'projet')
    .locator('tbody tr')
    .filter({ has: page.getByText(nom, { exact: true }) });
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);

const boite = async (l: Locator) => {
  const b = await l.boundingBox();
  if (!b) throw new Error('élément sans boîte');
  return b;
};
const laisserPasser = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

/**
 * Un chef, Alice et Bob, un projet début 04/01/2027. Court : « Tâche 01 » et l'activité au nom de 60 caractères
 * (Alice, 1 j) ; long : « Tâche 01 » à « Tâche 60 » (Alice, 1 j). Toujours, en dernier : « Tâche B », START
 * 11/01/2027, 5 j, Bob. Calculé (D0 = 04/01/2027).
 */
async function monde(request: APIRequestContext, suffixe: string, long: boolean) {
  const m = await monde3b(request, suffixe, ['Alice', 'Bob']);
  const p = m.projet.id;
  const noms = long
    ? Array.from({ length: 60 }, (_, i) => `Tâche ${String(i + 1).padStart(2, '0')}`)
    : ['Tâche 01', NOM_LONG];
  for (const nom of noms) {
    const a = await activiteAvec(request, p, nom);
    await m.api.assignation(a.id, m.gens.Alice!.id, 1);
  }
  const b = await activiteAvec(request, p, 'Tâche B', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(b.id, m.gens.Bob!.id, 5);
  await calculer(request, [p]);
  return { ...m, b };
}
type Monde = Awaited<ReturnType<typeof monde>>;

const adresse = (m: Monde, v: Vue) =>
  v === 'projet'
    ? `/projets/${m.projet.id}?onglet=gantt&zoom=jour`
    : v === 'accueil'
      ? '/?zoom=jour'
      : `/?ressource=${m.gens.Alice!.id}&zoom=jour`;

/** Attente de la vue chargée ; sur l'Accueil, projet déplié (« Tout déplier »). */
async function attendre(page: Page, v: Vue) {
  await page.locator('svg[data-zoom]').waitFor();
  if (v === 'accueil') {
    await expect(page.getByRole('button', { name: /^Replier / }).first()).toBeVisible(); // D-218 (4), (9)
    await expect(zoneTableau(page, v).getByText('Tâche B', { exact: true })).toBeVisible();
  }
  await expect(zoneTableau(page, v)).toBeVisible();
}

async function ouvrir(
  page: Page,
  m: Monde,
  v: Vue,
  largeur = 1440,
  hauteur = 900,
  connecter = true,
) {
  await page.setViewportSize({ width: largeur, height: hauteur });
  if (connecter) await connecterAvec(page, m.emailChef);
  await page.goto(adresse(m, v));
  await attendre(page, v);
}

const largeurVue = (page: Page, v: Vue) => vueDe(page, v).evaluate((e) => e.clientWidth);
const largeurTableau = async (page: Page, v: Vue) =>
  Math.round((await boite(zoneTableau(page, v))).width);
const valeur = async (page: Page, v: Vue) =>
  Number(await separateur(page, v).getAttribute('aria-valuenow'));
const defilement = (zone: Locator) => zone.evaluate((e) => e.scrollTop);

/** Glisser du séparateur de `dx` pixels à la souris. */
async function glisserSeparateur(page: Page, v: Vue, dx: number) {
  const b = await boite(separateur(page, v));
  const x = b.x + b.width / 2;
  const y = b.y + Math.min(b.height / 2, 40);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 10 });
  await page.mouse.up();
  await laisserPasser(page);
}

/** Largeur du tableau = `attendu` (± 1 px), lue par `aria-valuenow` et par la boîte de la zone. */
async function largeurEst(page: Page, v: Vue, attendu: number, quoi: string) {
  await expect.poll(() => valeur(page, v), `${quoi} : aria-valuenow`).toBe(attendu);
  expect(Math.abs((await largeurTableau(page, v)) - attendu), `${quoi} : zone`).toBeLessThanOrEqual(
    1,
  );
}

const numeros: Record<Vue, Record<'a' | 'b' | 'c' | 'd' | 'e', string>> = {
  projet: { a: 'E2E-521', b: 'E2E-524', c: 'E2E-527', d: 'E2E-530', e: 'E2E-533' },
  accueil: { a: 'E2E-522-r1', b: 'E2E-525-r1', c: 'E2E-528-r1', d: 'E2E-531-r1', e: 'E2E-534-r1' },
  ressource: { a: 'E2E-523', b: 'E2E-526', c: 'E2E-529', d: 'E2E-532', e: 'E2E-535' },
};

for (const v of VUES) {
  const n = numeros[v];

  test(`${n.a} : ${LIBELLES[v]}, 1440 et 1024 px : largeur par défaut du tableau, 40 % de la vue ou minimum D-069 ; deux premières colonnes et Drapeaux visibles`, async ({
    page,
    request,
  }) => {
    const m = await monde(request, `${n.a.replace('-', '')}`, false);
    for (const largeur of [1440, 1024]) {
      await ouvrir(page, m, v, largeur, 900, largeur === 1440);
      const vue = await largeurVue(page, v);
      const w = await largeurTableau(page, v);
      const z = await boite(zoneTableau(page, v));
      const entetes = zoneTableau(page, v).getByRole('columnheader');
      const premiere = await boite(entetes.nth(0));
      const seconde = await boite(entetes.nth(1));
      const drapeaux = await boite(
        zoneTableau(page, v).getByRole('columnheader', { name: 'Drapeaux', exact: true }),
      );
      for (const [b, quoi] of [
        [premiere, 'première colonne'],
        [seconde, 'deuxième colonne'],
        [drapeaux, 'Drapeaux'],
      ] as const) {
        expect(b.x, `${largeur} px : ${quoi}, bord gauche`).toBeGreaterThanOrEqual(z.x - TOLERANCE);
        expect(b.x + b.width, `${largeur} px : ${quoi}, bord droit`).toBeLessThanOrEqual(
          z.x + z.width + TOLERANCE,
        );
      }
      expect(
        seconde.x + seconde.width,
        `${largeur} px : recouverte par Drapeaux`,
      ).toBeLessThanOrEqual(drapeaux.x + TOLERANCE);
      expect(w, `${largeur} px : au plus 80 % de la vue`).toBeLessThanOrEqual(
        Math.floor(0.8 * vue) + 1,
      );
      const quarante = Math.round(0.4 * vue);
      if (Math.abs(w - quarante) > 1) {
        // Plus large que 40 % : seulement pour satisfaire D-069, donc au plus juste (Drapeaux jointif).
        expect(w, `${largeur} px : plus large que 40 %`).toBeGreaterThan(quarante);
        expect(
          Math.abs(seconde.x + seconde.width - drapeaux.x),
          `${largeur} px : largeur minimale (${w} px pour une vue de ${vue} px)`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  test(`${n.b} : ${LIBELLES[v]} : séparateur à la souris et au clavier (16 px, bornes 200 px et 80 %, double-clic et Entrée = défaut)`, async ({
    page,
    request,
  }) => {
    const m = await monde(request, `${n.b.replace('-', '')}`, false);
    await ouvrir(page, m, v);
    const sep = separateur(page, v);
    await expect(sep).toHaveCount(1);
    await expect(sep).toHaveAttribute('aria-orientation', 'vertical');
    const vue = await largeurVue(page, v);
    const maximum = Math.floor(0.8 * vue);
    const defaut = await largeurTableau(page, v);
    await largeurEst(page, v, defaut, 'défaut');

    await glisserSeparateur(page, v, 100);
    await largeurEst(page, v, defaut + 100, 'souris +100');
    await sep.focus();
    await expect(sep).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await largeurEst(page, v, defaut + 100 + PAS, 'flèche droite');
    await page.keyboard.press('ArrowLeft');
    await largeurEst(page, v, defaut + 100, 'flèche gauche');

    await glisserSeparateur(page, v, -2000);
    await largeurEst(page, v, MINIMUM, 'borne basse, souris');
    await sep.focus();
    await page.keyboard.press('ArrowLeft');
    await largeurEst(page, v, MINIMUM, 'borne basse, clavier');
    await glisserSeparateur(page, v, 3000);
    await largeurEst(page, v, maximum, 'borne haute, souris');
    await sep.focus();
    await page.keyboard.press('ArrowRight');
    await largeurEst(page, v, maximum, 'borne haute, clavier');

    await sep.dblclick();
    await largeurEst(page, v, defaut, 'double-clic');
    await sep.focus();
    await page.keyboard.press('ArrowRight');
    await largeurEst(page, v, defaut + PAS, 'flèche droite avant Entrée');
    await page.keyboard.press('Enter');
    await largeurEst(page, v, defaut, 'Entrée');
  });

  test(`${n.c} : ${LIBELLES[v]} : largeur gardée au rechargement ; stockage indisponible : largeur par défaut, aucune erreur`, async ({
    page,
    request,
  }) => {
    const m = await monde(request, `${n.c.replace('-', '')}`, false);
    await ouvrir(page, m, v);
    const defaut = await largeurTableau(page, v);
    await separateur(page, v).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await largeurEst(page, v, defaut + 2 * PAS, 'réglée');
    await page.reload();
    await attendre(page, v);
    await largeurEst(page, v, defaut + 2 * PAS, 'après rechargement');

    // Stockage indisponible : toute lecture de `localStorage` lève une exception.
    const autre = await page.context().newPage();
    await autre.clock.setFixedTime(J06);
    await autre.setViewportSize({ width: 1440, height: 900 });
    const erreurs: string[] = [];
    autre.on('pageerror', (e) => erreurs.push(`pageerror : ${e.message}`));
    autre.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource'))
        erreurs.push(`console : ${msg.text()}`);
    });
    await autre.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('Stockage refusé', 'SecurityError');
        },
      });
    });
    await autre.goto(adresse(m, v));
    await attendre(autre, v);
    await largeurEst(autre, v, defaut, 'stockage indisponible');
    await separateur(autre, v).focus();
    await autre.keyboard.press('ArrowRight');
    await largeurEst(autre, v, defaut + PAS, 'stockage indisponible, flèche droite');
    await expect(vueDe(autre, v).getByRole('alert')).toHaveCount(0);
    expect(erreurs).toEqual([]);
    await autre.close();
  });

  test(`${n.d} : ${LIBELLES[v]}, 60 lignes à 1440×900 : bas du calendrier dans la fenêtre, calendrier plus large que sa zone, page sans défilement horizontal`, async ({
    page,
    request,
  }) => {
    const m = await monde(request, `${n.d.replace('-', '')}`, true);
    await ouvrir(page, m, v, 1440, 900);
    const lignes = await zoneTableau(page, v).locator('tbody tr').count();
    expect(lignes).toBeGreaterThanOrEqual(60);
    const c = await boite(zoneCalendrier(page, v));
    expect(c.y + c.height, 'bas de la zone du calendrier').toBeLessThanOrEqual(900 + TOLERANCE);
    const zone = await zoneCalendrier(page, v).evaluate((e) => ({
      sw: e.scrollWidth,
      cw: e.clientWidth,
      sh: e.scrollHeight,
      ch: e.clientHeight,
    }));
    expect(zone.sw, 'calendrier plus large que sa zone').toBeGreaterThan(zone.cw);
    expect(zone.sh, 'lignes au-delà de la hauteur de la zone').toBeGreaterThan(zone.ch);
    const page_ = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(page_.scroll, 'page sans défilement horizontal').toBeLessThanOrEqual(page_.client);
  });

  test(`${n.e} : ${LIBELLES[v]} : défilement vertical commun, en-têtes figés, flèche bas dans le tableau`, async ({
    page,
    request,
  }) => {
    const m = await monde(request, `${n.e.replace('-', '')}`, true);
    await ouvrir(page, m, v, 1440, 900);
    const t = zoneTableau(page, v);
    const c = zoneCalendrier(page, v);
    await c.evaluate((e) => {
      e.scrollTop = 300;
    });
    await expect.poll(() => defilement(c), 'calendrier défilé').toBe(300);
    await expect.poll(() => defilement(t), 'tableau au même scrollTop').toBe(300);
    const zt = await boite(t);
    const zc = await boite(c);
    const entete = await boite(t.getByRole('columnheader').nth(1));
    expect(Math.abs(entete.y - zt.y), 'en-tête du tableau en haut de sa zone').toBeLessThanOrEqual(
      1,
    );
    const enteteCalendrier = await boite(c.locator('[data-entete-gantt]'));
    expect(
      Math.abs(enteteCalendrier.y - zc.y),
      'en-tête du calendrier en haut de sa zone',
    ).toBeLessThanOrEqual(1);

    await c.evaluate((e) => {
      e.scrollTop = 0;
    });
    await expect.poll(() => defilement(t)).toBe(0);
    await t.focus();
    await expect(t).toBeFocused();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await expect.poll(() => defilement(t), 'tableau défilé par la flèche').toBeGreaterThan(0);
    await expect
      .poll(async () => (await defilement(c)) === (await defilement(t)), 'même position')
      .toBe(true);
  });
}

/** Défilement vertical jusqu'en bas, par le calendrier ; le tableau suit. */
async function defilerEnBas(page: Page) {
  const t = zoneTableau(page, 'projet');
  const c = zoneCalendrier(page, 'projet');
  await c.evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  await expect.poll(() => defilement(c)).toBeGreaterThan(0);
  await expect.poll(async () => (await defilement(t)) === (await defilement(c))).toBe(true);
}

async function lireElements(request: APIRequestContext, projetId: number) {
  const r = await request.get(`/api/projets/${projetId}/gantt`);
  expect(r.ok(), `GET gantt : ${r.status()}`).toBeTruthy();
  return (
    (await r.json()) as {
      elements: { id: number; nom: string; rang: number; debut_valide?: string | null }[];
    }
  ).elements;
}

test('E2E-536 : Gantt d’un projet, après défilement vertical : glisser de la barre de « Tâche B » de +72 px au zoom jour, PATCH et base comme E2E-132', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E536', true);
  const patchs: unknown[] = [];
  page.on('request', (r) => {
    if (r.method() === 'PATCH' && new URL(r.url()).pathname === `/api/activites/${m.b.id}`)
      patchs.push(r.postDataJSON());
  });
  await ouvrir(page, m, 'projet');
  await expect(barre(page, m.b.id)).toHaveAttribute(
    'aria-label',
    'Tâche B, du 11/01/2027 au 15/01/2027',
  );
  await defilerEnBas(page);
  const b = await boite(barre(page, m.b.id));
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 72, y, { steps: 12 });
  await page.mouse.up();
  await laisserPasser(page);
  await expect.poll(() => patchs.length).toBe(1);
  expect(patchs[0]).toEqual({ debut_valide: '2027-01-14' });
  await expect
    .poll(
      async () =>
        (await lireElements(request, m.projet.id)).find((e) => e.id === m.b.id)?.debut_valide,
    )
    .toBe('2027-01-14');
});

test('E2E-537 : Gantt d’un projet, après défilement vertical : glisser de la ligne « Tâche B » avant « Tâche 60 », POST et base comme E2E-182', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E537', true);
  const deplacements: { id: number; corps: unknown }[] = [];
  page.on('request', (r) => {
    const d = /\/api\/elements\/(\d+)\/deplacer$/.exec(r.url());
    if (r.method() === 'POST' && d)
      deplacements.push({ id: Number(d[1]), corps: r.postDataJSON() });
  });
  await ouvrir(page, m, 'projet');
  await defilerEnBas(page);
  const poignee = ligneDe(page, 'Tâche B').locator('[data-poignee-ligne]');
  await expect(poignee).toHaveCount(1);
  const p = await boite(poignee);
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
  await page.mouse.down();
  const cible = await boite(ligneDe(page, 'Tâche 60'));
  await page.mouse.move(cible.x + 40, cible.y + 0.15 * cible.height, { steps: 12 });
  await laisserPasser(page);
  await page.mouse.up();
  await laisserPasser(page);
  await expect.poll(() => deplacements.length).toBe(1);
  expect(deplacements[0]).toEqual({ id: m.b.id, corps: { parent_id: null, rang: 60 } });
  await expect
    .poll(async () => {
      const e = await lireElements(request, m.projet.id);
      return [e.find((x) => x.nom === 'Tâche B')?.rang, e.find((x) => x.nom === 'Tâche 60')?.rang];
    })
    .toEqual([60, 61]);
});

test('E2E-539 : Gantt d’un projet, 1024 px : après « Calculer » à l’écran, le badge « Début non respecté » apparu reste visible et Drapeaux ne recouvre ni WBS ni Nom (D-069 (a), (b))', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E539', ['Eve']);
  const p = m.projet.id;
  const occupe = await activite(request, p, 'Occupe Eve', 'MAN');
  const assignOccupe = await m.api.assignation(occupe.id, m.gens.Eve!.id, 1);
  await poserSaisies(request, occupe.id, '2027-01', [
    { assignation_id: assignOccupe.id, jour: '2027-01-06', demi_journee: 'matin' },
    { assignation_id: assignOccupe.id, jour: '2027-01-06', demi_journee: 'apres_midi' },
  ]);
  const starr = await activiteAvec(request, p, 'Début STARR', {
    mode: 'STARR',
    debut_valide: '2027-01-06',
  });
  await m.api.assignation(starr.id, m.gens.Eve!.id, 2);
  await page.setViewportSize({ width: 1024, height: 900 });
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${p}?onglet=gantt&zoom=jour`);
  await expect(page.getByRole('status').filter({ hasText: 'Planning non calculé' })).toBeVisible();
  const t = zoneTableau(page, 'projet');
  await expect(t.getByText('Début non respecté', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Calculer', exact: true }).first().click();
  const dialogue = page.getByRole('dialog', { name: 'Calculer le planning' });
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByText('Chargement des projets…')).toBeHidden();
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(dialogue).toHaveCount(0);
  const badge = t.getByText('Début non respecté', { exact: true });
  await expect(badge).toHaveCount(1);
  await laisserPasser(page);

  const z = await boite(t);
  const b = await boite(badge);
  expect(b.x, 'badge, bord gauche').toBeGreaterThanOrEqual(z.x - TOLERANCE);
  expect(b.x + b.width, 'badge, bord droit').toBeLessThanOrEqual(z.x + z.width + TOLERANCE);
  const drapeaux = await boite(t.getByRole('columnheader', { name: 'Drapeaux', exact: true }));
  const lignes = t.locator('tbody tr');
  for (let i = 0; i < (await lignes.count()); i++) {
    for (const [col, quoi] of [
      [0, 'WBS'],
      [1, 'Nom'],
    ] as const) {
      const cellule = await boite(lignes.nth(i).locator('td').nth(col));
      expect(cellule.x, `${quoi}, ligne ${i}, bord gauche`).toBeGreaterThanOrEqual(z.x - TOLERANCE);
      expect(
        cellule.x + cellule.width,
        `${quoi}, ligne ${i}, recouvert par Drapeaux`,
      ).toBeLessThanOrEqual(drapeaux.x + TOLERANCE);
    }
  }
});
