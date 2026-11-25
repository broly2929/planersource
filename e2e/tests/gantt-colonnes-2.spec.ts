// gantt-colonnes, tranche 2 (D-212 (4), (5), D-216 ; SPEC §6 « Colonnes et défilement (gantt-colonnes, D-212) »,
// points 5, 6 et 9) : E2E-540-r1 à E2E-556-r1 (révision D-031, décision du porteur : attente du planning
// d'Alice sur sa propre tâche, du focus après chaque flèche et après Échap, séparateur au maximum avant un
// glisser de poignée, la poignée d'une colonne recouverte par Drapeaux n'étant pas atteignable à la souris). Menu « Colonnes », poignée de largeur de chaque colonne, mémorisation,
// « Rétablir l'affichage par défaut ». Trois vues : Gantt d'un projet, Gantt global de l'Accueil, planning
// d'une ressource. Données créées par l'API. Listes, ordres et valeurs recopiés de D-212 (4) et D-216 :
// 16 px par flèche, minimum 48 px, 120 px pour la colonne du nom.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { activiteAvec, calculer, jalonAvec, monde3b } from './lot3b-helpers.js';
import { imputerApi, sessionDe } from './lot4b-helpers.js';
import { chefLecteur, remettreAdminSeul6b } from './lot6b-helpers.js';

const J06 = '2027-01-06T10:00:00';
const NOM_LONG = 'Activité au nom très long pour vérifier la troncature du nom'; // 60 caractères
const TOLERANCE = 0.5;
const PAS = 16;
const MIN_COLONNE = 48;
const MIN_NOM = 120;
const FLAG = 'rgb(190, 18, 60)';
const RETABLIR = "Rétablir l'affichage par défaut";

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
const REGIONS: Record<Vue, string> = {
  projet: 'Tableau du Gantt',
  accueil: 'Tableau du Gantt global',
  ressource: 'Tableau du planning de la ressource',
};
/** En-têtes par défaut (D-227 (B), révise D-212 (4) et D-216 (9) (a)), utilisateur qui écrit le projet. */
const ENTETES: Record<Vue, string[]> = {
  projet: ['WBS', 'Nom', 'Début', 'Fin', 'Ressources'],
  accueil: ['Code', 'Nom', 'Début', 'Fin', 'Ressources'],
  ressource: ['Projet', 'Activité', 'Début', 'Fin'],
};
/** Éléments du menu, dans l'ordre fixe (D-212 (4), D-216 (1), (7)). */
const MENUS: Record<Vue, string[]> = {
  projet: [
    'Planification',
    'Début',
    'Fin',
    'Ressources',
    'Charge',
    'Vendu',
    'Marge',
    'Avancement',
    'OTP',
    'Coût planifié',
    'Coût réel',
    'Drapeaux',
  ],
  accueil: [
    'Début',
    'Fin',
    'Ressources',
    'Charge',
    'Avancement',
    'Réel',
    'Vendu',
    'Marge',
    'OTP',
    'Coût planifié',
    'Coût réel',
    'Drapeaux',
  ],
  ressource: ['Début', 'Fin', 'Assigné', 'Réel', 'Reste', 'Drapeaux'],
};
const TOUJOURS: Record<Vue, string[]> = {
  projet: ['WBS', 'Nom'],
  accueil: ['Code', 'Nom'],
  ressource: ['Projet', 'Activité'],
};
/** Colonne du nom : minimum 120 px (D-212 (4)) ; Activité sur le planning d'une ressource (D-216 (1)). */
const NOM: Record<Vue, string> = { projet: 'Nom', accueil: 'Nom', ressource: 'Activité' };
const CLES: Record<Vue, string> = {
  projet: 'planersource.gantt.projet',
  accueil: 'planersource.gantt.accueil',
  ressource: 'planersource.gantt.ressource',
};

const zoneTableau = (page: Page, v: Vue) =>
  page.getByRole('region', { name: REGIONS[v], exact: true });
const separateur = (page: Page, v: Vue) =>
  zoneTableau(page, v)
    .locator('xpath=..')
    .getByRole('separator', { name: 'Largeur du tableau', exact: true });
const boutonColonnes = (page: Page) => page.getByRole('button', { name: 'Colonnes', exact: true });
const menu = (page: Page) => page.getByRole('menu');
const element = (page: Page, titre: string) =>
  menu(page).getByRole('menuitemcheckbox', { name: titre, exact: true });
const poignee = (page: Page, v: Vue, titre: string) =>
  zoneTableau(page, v).getByRole('separator', {
    name: `Largeur de la colonne ${titre}`,
    exact: true,
  });
const entete = (page: Page, v: Vue, titre: string) =>
  zoneTableau(page, v).getByRole('columnheader', { name: titre, exact: true });

const boite = async (l: Locator) => {
  const b = await l.boundingBox();
  if (!b) throw new Error('élément sans boîte');
  return b;
};
const laisserPasser = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
const entetes = async (page: Page, v: Vue) =>
  (await zoneTableau(page, v).getByRole('columnheader').allTextContents()).map((t) => t.trim());

/**
 * Montage court de la tranche 1 : un chef, Alice et Bob, un projet début 04/01/2027 ; « Tâche 01 » et l'activité
 * au nom de 60 caractères (Alice, 1 j), « Tâche B » (START 11/01/2027, 5 j, Bob). Calculé (D0 = 04/01/2027).
 */
async function monde(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice', 'Bob']);
  const p = m.projet.id;
  for (const nom of ['Tâche 01', NOM_LONG]) {
    const a = await activiteAvec(request, p, nom);
    await m.api.assignation(a.id, m.gens.Alice!.id, 1);
  }
  const b = await activiteAvec(request, p, 'Tâche B', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(b.id, m.gens.Bob!.id, 5);
  await calculer(request, [p]);
  return m;
}
type Monde = Awaited<ReturnType<typeof monde>>;

const adresse = (m: Monde, v: Vue) =>
  v === 'projet'
    ? `/projets/${m.projet.id}?onglet=gantt&zoom=jour`
    : v === 'accueil'
      ? '/?zoom=jour'
      : `/?ressource=${m.gens.Alice!.id}&zoom=jour`;

/** Attente de la vue chargée ; sur l'Accueil, projets dépliés (« Tout déplier »). */
async function attendre(page: Page, v: Vue, texte = v === 'ressource' ? '1 Tâche 01' : 'Tâche B') {
  await page.locator('svg[data-zoom]').waitFor();
  if (v === 'accueil') {
    await expect(page.getByRole('button', { name: /^Replier / }).first()).toBeVisible(); // D-218 (4), (9)
  }
  await expect(zoneTableau(page, v).getByText(texte, { exact: true }).first()).toBeVisible();
}

async function ouvrir(page: Page, m: Monde, v: Vue, largeur = 1440, connecter = true) {
  await page.setViewportSize({ width: largeur, height: 900 });
  if (connecter) await connecterAvec(page, m.emailChef);
  await page.goto(adresse(m, v));
  await attendre(page, v);
}

/** Cellules de chaque ligne = en-têtes (colonne masquée : ni en-tête, ni cellule). */
async function cellulesAlignees(page: Page, v: Vue) {
  const n = await zoneTableau(page, v).getByRole('columnheader').count();
  const lignes = zoneTableau(page, v).locator('tbody tr');
  const total = await lignes.count();
  expect(total).toBeGreaterThan(0);
  for (let i = 0; i < total; i++) {
    await expect(lignes.nth(i).locator('td'), `ligne ${i}`).toHaveCount(n);
  }
}

async function ouvrirMenu(page: Page) {
  await boutonColonnes(page).click();
  await expect(menu(page)).toBeVisible();
}
async function fermerMenu(page: Page) {
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
  // Focus rendu au bouton un tick après la fermeture (Radix).
  await expect(boutonColonnes(page)).toBeFocused();
}
/** Coche ou décoche une colonne par le menu, à la souris, puis le ferme. */
async function basculer(page: Page, titres: string[]) {
  await ouvrirMenu(page);
  for (const t of titres) await element(page, t).click();
  await fermerMenu(page);
}

const valeur = async (l: Locator) => Number(await l.getAttribute('aria-valuenow'));
const largeurEntete = async (page: Page, v: Vue, titre: string) =>
  (await boite(entete(page, v, titre))).width;

/** Largeur de la colonne = `attendu` : `aria-valuenow` exact, en-tête à ± 1 px. */
async function colonneEst(page: Page, v: Vue, titre: string, attendu: number, quoi: string) {
  await expect.poll(() => valeur(poignee(page, v, titre)), `${quoi} : aria-valuenow`).toBe(attendu);
  expect(
    Math.abs((await largeurEntete(page, v, titre)) - attendu),
    `${quoi} : largeur de l'en-tête`,
  ).toBeLessThanOrEqual(1);
}

async function glisser(page: Page, l: Locator, dx: number) {
  const b = await boite(l);
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 10 });
  await page.mouse.up();
  await laisserPasser(page);
}

/** Erreurs de page et de console d'une page (hors ressources non chargées). */
function suivreErreurs(p: Page): string[] {
  const erreurs: string[] = [];
  p.on('pageerror', (e) => erreurs.push(`pageerror : ${e.message}`));
  p.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource'))
      erreurs.push(`console : ${msg.text()}`);
  });
  return erreurs;
}

const numeros: Record<Vue, Record<'a' | 'b' | 'c' | 'd' | 'e', string>> = {
  projet: { a: 'E2E-540-r5', b: 'E2E-543-r1', c: 'E2E-546-r3', d: 'E2E-549-r3', e: 'E2E-552-r3' },
  accueil: { a: 'E2E-541-r6', b: 'E2E-544-r2', c: 'E2E-547-r4', d: 'E2E-550-r4', e: 'E2E-553-r4' },
  ressource: {
    a: 'E2E-542-r3',
    b: 'E2E-545-r1',
    c: 'E2E-548-r2',
    d: 'E2E-551-r2',
    e: 'E2E-554-r2',
  },
};

for (const v of VUES) {
  const n = numeros[v];
  const suffixe = (id: string) => id.replace(/-r\d+/, '').replace('-', '');

  test(`${n.a} : ${LIBELLES[v]} : menu « Colonnes » à la souris et au clavier, ordre fixe, cases, masquer et réafficher`, async ({
    page,
    request,
  }) => {
    const m = await monde(request, suffixe(n.a));
    await ouvrir(page, m, v);
    expect(await entetes(page, v)).toEqual(ENTETES[v]);

    // Souris : ouverture, éléments dans l'ordre, cases à jour, colonnes toujours affichées absentes.
    await ouvrirMenu(page);
    const items = menu(page).getByRole('menuitemcheckbox');
    expect((await items.allTextContents()).map((t) => t.trim())).toEqual(MENUS[v]);
    for (const t of MENUS[v]) {
      await expect(element(page, t), `case ${t}`).toHaveAttribute(
        'aria-checked',
        String(ENTETES[v].includes(t)),
      );
    }
    for (const t of TOUJOURS[v]) {
      await expect(menu(page).getByRole('menuitemcheckbox', { name: t, exact: true })).toHaveCount(
        0,
      );
      await expect(menu(page).getByRole('menuitem', { name: t, exact: true })).toHaveCount(0);
    }
    const tous = menu(page).getByRole('menuitem').or(items);
    await expect(tous.last()).toHaveText(RETABLIR);

    // Décocher « Début » : menu ouvert, en-tête et cellules absents ; recocher : à sa place.
    await element(page, 'Début').click();
    await expect(menu(page)).toBeVisible();
    await expect(element(page, 'Début')).toHaveAttribute('aria-checked', 'false');
    await expect(entete(page, v, 'Début')).toHaveCount(0);
    expect(await entetes(page, v)).toEqual(ENTETES[v].filter((t) => t !== 'Début'));
    await cellulesAlignees(page, v);
    await element(page, 'Début').click();
    await expect(element(page, 'Début')).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => entetes(page, v)).toEqual(ENTETES[v]);
    await cellulesAlignees(page, v);

    if (v === 'accueil') {
      // Colonne masquée par défaut : cochée, elle prend sa place après Fin (D-218 (7)).
      await element(page, 'Charge').click();
      await expect
        .poll(() => entetes(page, v))
        .toEqual(['Code', 'Nom', 'Début', 'Fin', 'Ressources', 'Charge']);
      await cellulesAlignees(page, v);
      await element(page, 'Charge').click();
      await expect.poll(() => entetes(page, v)).toEqual(ENTETES[v]);
    }

    // Clic hors du menu : fermé, focus rendu au bouton.
    // D-218 (6) : le logo occupe le coin haut gauche ; clic dans la zone vide de la barre latérale.
    await page.mouse.click(5, 450);
    await expect(menu(page)).toHaveCount(0);
    await expect(boutonColonnes(page)).toBeFocused();

    // Clavier : Entrée, flèches jusqu'à « Drapeaux », Espace (décoche, menu ouvert), Espace, Échap.
    await boutonColonnes(page).focus();
    await page.keyboard.press('Enter');
    await expect(menu(page)).toBeVisible();
    await expect(element(page, MENUS[v][0]!)).toBeFocused();
    // Radix déplace le focus par `setTimeout` : attente du focus après chaque flèche.
    for (let i = 1; i <= MENUS[v].indexOf('Drapeaux'); i++) {
      await page.keyboard.press('ArrowDown');
      await expect(element(page, MENUS[v][i]!)).toBeFocused();
    }
    await expect(element(page, 'Drapeaux')).toBeFocused();
    // Drapeaux est décochée par défaut (D-227 (B)) : Espace la coche, puis la décoche.
    await expect(element(page, 'Drapeaux')).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Space');
    await expect(menu(page)).toBeVisible();
    await expect(element(page, 'Drapeaux')).toHaveAttribute('aria-checked', 'true');
    await expect(entete(page, v, 'Drapeaux')).toHaveCount(1);
    await cellulesAlignees(page, v);
    await page.keyboard.press('Space');
    await expect(element(page, 'Drapeaux')).toHaveAttribute('aria-checked', 'false');
    await expect.poll(() => entetes(page, v)).toEqual(ENTETES[v]);
    await page.keyboard.press('Escape');
    await expect(menu(page)).toHaveCount(0);
    await expect(boutonColonnes(page)).toBeFocused();
  });

  test(`${n.b} : ${LIBELLES[v]} : poignées de largeur (souris, flèches 16 px, bornes 48 et 120 px, défaut, troncature, largeur gardée)`, async ({
    page,
    request,
  }) => {
    const m = await monde(request, suffixe(n.b));
    await ouvrir(page, m, v);
    // Séparateur au maximum : aucune poignée recouverte par Drapeaux (fixée à droite) pour les glisser.
    await glisser(page, separateur(page, v), 3000);
    const titres = await entetes(page, v);
    const poignees = zoneTableau(page, v).getByRole('separator');
    await expect(poignees).toHaveCount(titres.length);
    for (let i = 0; i < titres.length; i++) {
      await expect(poignees.nth(i)).toHaveAccessibleName(`Largeur de la colonne ${titres[i]}`);
      expect(
        Math.abs((await valeur(poignees.nth(i))) - (await largeurEntete(page, v, titres[i]!))),
        `aria-valuenow de ${titres[i]}`,
      ).toBeLessThanOrEqual(1);
    }

    const nom = NOM[v];
    const pNom = poignee(page, v, nom);
    const defaut = await valeur(pNom);
    await glisser(page, pNom, 40);
    await colonneEst(page, v, nom, defaut + 40, 'souris +40');
    await pNom.focus();
    await expect(pNom).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await colonneEst(page, v, nom, defaut + 40 + PAS, 'flèche droite');
    await page.keyboard.press('ArrowLeft');
    await colonneEst(page, v, nom, defaut + 40, 'flèche gauche');
    await glisser(page, pNom, -2000);
    await colonneEst(page, v, nom, MIN_NOM, 'borne du nom, souris');
    await pNom.focus();
    await page.keyboard.press('ArrowLeft');
    await colonneEst(page, v, nom, MIN_NOM, 'borne du nom, clavier');

    // Troncature et `title` inchangés, contenu dans la colonne.
    const long = zoneTableau(page, v).locator(`tbody [title$="${NOM_LONG}"]`).first();
    await expect(long).toBeVisible();
    expect(await long.evaluate((e) => e.scrollWidth > e.clientWidth), 'nom tronqué').toBe(true);
    const bl = await boite(long);
    const be = await boite(entete(page, v, nom));
    expect(bl.x + bl.width, 'nom dans sa colonne').toBeLessThanOrEqual(be.x + be.width + TOLERANCE);

    await pNom.dblclick();
    await colonneEst(page, v, nom, defaut, 'double-clic');
    await pNom.focus();
    await page.keyboard.press('ArrowRight');
    await colonneEst(page, v, nom, defaut + PAS, 'flèche droite avant Entrée');
    await page.keyboard.press('Enter');
    await colonneEst(page, v, nom, defaut, 'Entrée');
    expect(await long.getAttribute('title')).toMatch(new RegExp(`${NOM_LONG}$`));

    // « Début » : réglée, masquée puis réaffichée, largeur gardée ; borne de 48 px.
    const pDebut = poignee(page, v, 'Début');
    const debut = await valeur(pDebut);
    await pDebut.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await colonneEst(page, v, 'Début', debut + 2 * PAS, 'Début +32');
    await basculer(page, ['Début']);
    await expect(entete(page, v, 'Début')).toHaveCount(0);
    await basculer(page, ['Début']);
    await colonneEst(page, v, 'Début', debut + 2 * PAS, 'Début réaffichée');
    await glisser(page, poignee(page, v, 'Début'), -2000);
    await colonneEst(page, v, 'Début', MIN_COLONNE, 'borne de 48 px');
  });

  test(`${n.c} : ${LIBELLES[v]} : colonnes et largeurs gardées au rechargement ; valeur illisible, stockage indisponible, identifiant inconnu`, async ({
    page,
    request,
  }) => {
    const m = await monde(request, suffixe(n.c));
    await ouvrir(page, m, v);
    const nom = NOM[v];
    const defautNom = await valeur(poignee(page, v, nom));
    const sansDebut = ENTETES[v].filter((t) => t !== 'Début');
    await basculer(page, ['Début']);
    await poignee(page, v, nom).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await colonneEst(page, v, nom, defautNom + 2 * PAS, 'réglée');
    await page.reload();
    await attendre(page, v);
    expect(await entetes(page, v)).toEqual(sansDebut);
    await colonneEst(page, v, nom, defautNom + 2 * PAS, 'après rechargement');

    if (v === 'projet') {
      // Clé commune à tous les projets (D-212 (5)).
      const autre = await preparer(request).then((api) =>
        api.projet(`Q-${suffixe(n.c)}`, `Autre ${suffixe(n.c)}`, m.chef.id),
      );
      await activiteAvec(request, autre.id, 'Tâche Q');
      await page.goto(`/projets/${autre.id}?onglet=gantt&zoom=jour`);
      await attendre(page, v, 'Tâche Q');
      expect(await entetes(page, v)).toEqual(sansDebut);
      await expect(poignee(page, v, nom)).toHaveAttribute(
        'aria-valuenow',
        String(defautNom + 2 * PAS),
      );
    }

    // Une page par cas, même contexte (même stockage), stockage préparé avant le chargement.
    const cas: { quoi: string; script: (cle: string) => void; attendus: string[] }[] = [
      {
        quoi: 'valeur illisible',
        script: (cle) => window.localStorage.setItem(cle, '{pas du json'),
        attendus: ENTETES[v],
      },
      {
        quoi: 'identifiant inconnu',
        script: (cle) =>
          window.localStorage.setItem(
            cle,
            JSON.stringify({
              colonnes: { inconnue: false, debut: false },
              largeurs: { inconnue: 300 },
            }),
          ),
        attendus: sansDebut,
      },
      {
        quoi: 'stockage indisponible',
        script: () =>
          Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() {
              throw new DOMException('Stockage refusé', 'SecurityError');
            },
          }),
        attendus: ENTETES[v],
      },
    ];
    for (const c of cas) {
      const p = await page.context().newPage();
      await p.clock.setFixedTime(J06);
      await p.setViewportSize({ width: 1440, height: 900 });
      const erreurs = suivreErreurs(p);
      await p.addInitScript(c.script, CLES[v]);
      await p.goto(adresse(m, v));
      await attendre(p, v);
      expect(await entetes(p, v), c.quoi).toEqual(c.attendus);
      await cellulesAlignees(p, v);
      // Largeur de la colonne du nom par défaut (le réglage gardé est remplacé ou illisible).
      expect(await valeur(poignee(p, v, nom)), `${c.quoi} : largeur du nom`).toBe(defautNom);
      // Menu et poignées utilisables.
      await poignee(p, v, nom).focus();
      await p.keyboard.press('ArrowRight');
      await colonneEst(p, v, nom, defautNom + PAS, `${c.quoi} : flèche droite`);
      await basculer(p, ['Fin']);
      await expect(entete(p, v, 'Fin'), `${c.quoi} : Fin masquée`).toHaveCount(0);
      await expect(zoneTableau(p, v).locator('xpath=..').getByRole('alert')).toHaveCount(0);
      expect(erreurs, c.quoi).toEqual([]);
      await p.close();
    }
  });

  test(`${n.d} : ${LIBELLES[v]} : « Rétablir l'affichage par défaut » (colonnes, largeurs, séparateur)`, async ({
    page,
    request,
  }) => {
    const m = await monde(request, suffixe(n.d));
    await ouvrir(page, m, v);
    const nom = NOM[v];
    const defautNom = await valeur(poignee(page, v, nom));
    const defautTableau = await valeur(separateur(page, v));
    await basculer(page, v === 'accueil' ? ['Début', 'Charge'] : ['Début']);
    await poignee(page, v, nom).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await colonneEst(page, v, nom, defautNom + 2 * PAS, 'nom réglé');
    const tableauAvant = await valeur(separateur(page, v));
    await separateur(page, v).focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await expect.poll(() => valeur(separateur(page, v))).toBe(tableauAvant + 3 * PAS);
    expect(await entetes(page, v)).not.toEqual(ENTETES[v]);

    await ouvrirMenu(page);
    await menu(page).getByRole('menuitem', { name: RETABLIR, exact: true }).click();
    await expect.poll(() => entetes(page, v)).toEqual(ENTETES[v]);
    await colonneEst(page, v, nom, defautNom, 'nom rétabli');
    await expect.poll(() => valeur(separateur(page, v)), 'séparateur rétabli').toBe(defautTableau);

    await page.reload();
    await attendre(page, v);
    expect(await entetes(page, v)).toEqual(ENTETES[v]);
    await colonneEst(page, v, nom, defautNom, 'après rechargement');
    await expect.poll(() => valeur(separateur(page, v))).toBe(defautTableau);
  });

  test(`${n.e} : ${LIBELLES[v]}, 1440 et 1024 px : critère D-069 (a) et (b) par défaut ; toutes les colonnes : page sans défilement horizontal, Drapeaux fixée à droite`, async ({
    page,
    request,
  }) => {
    const m = await monde(request, suffixe(n.e));
    for (const largeur of [1440, 1024]) {
      await ouvrir(page, m, v, largeur, largeur === 1440);
      // Drapeaux est décochée par défaut (D-227 (B)) : cochée par le menu, comme avant le critère.
      await basculer(page, ['Drapeaux']);
      const zone = await boite(zoneTableau(page, v));
      const ths = zoneTableau(page, v).getByRole('columnheader');
      const premiere = await boite(ths.nth(0));
      const seconde = await boite(ths.nth(1));
      const drapeaux = await boite(entete(page, v, 'Drapeaux'));
      for (const [b, quoi] of [
        [premiere, 'première colonne'],
        [seconde, 'colonne du nom'],
        [drapeaux, 'Drapeaux'],
      ] as const) {
        expect(b.x, `${largeur} px : ${quoi}, bord gauche`).toBeGreaterThanOrEqual(
          zone.x - TOLERANCE,
        );
        expect(b.x + b.width, `${largeur} px : ${quoi}, bord droit`).toBeLessThanOrEqual(
          zone.x + zone.width + TOLERANCE,
        );
      }
      expect(seconde.x + seconde.width, `${largeur} px : nom recouvert`).toBeLessThanOrEqual(
        drapeaux.x + TOLERANCE,
      );
      const badges = zoneTableau(page, v).locator('tbody td:last-child span');
      for (let i = 0; i < (await badges.count()); i++) {
        const b = await boite(badges.nth(i));
        expect(b.x + b.width, `${largeur} px : badge ${i}`).toBeLessThanOrEqual(
          zone.x + zone.width + TOLERANCE,
        );
      }

      // Toutes les colonnes affichées.
      const decoches = MENUS[v].filter((t) => !ENTETES[v].includes(t) && t !== 'Drapeaux');
      if (decoches.length > 0) await basculer(page, decoches);
      expect(await entetes(page, v)).toEqual([...TOUJOURS[v], ...MENUS[v]]);
      const pageLarge = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(
        pageLarge.scroll,
        `${largeur} px : page sans défilement horizontal`,
      ).toBeLessThanOrEqual(pageLarge.client);
      await glisser(page, separateur(page, v), -3000);
      await expect.poll(() => valeur(separateur(page, v))).toBe(200);
      const zc = await zoneTableau(page, v).evaluate((e) => {
        const r = e.getBoundingClientRect();
        return {
          droite: r.left + e.clientLeft + e.clientWidth,
          sw: e.scrollWidth,
          cw: e.clientWidth,
        };
      });
      expect(zc.sw, `${largeur} px : tableau plus large que sa zone`).toBeGreaterThan(zc.cw);
      const d = await boite(entete(page, v, 'Drapeaux'));
      expect(
        Math.abs(d.x + d.width - zc.droite),
        `${largeur} px : Drapeaux fixée à droite`,
      ).toBeLessThanOrEqual(1);
      // Remise aux défauts pour la largeur suivante.
      await ouvrirMenu(page);
      await menu(page).getByRole('menuitem', { name: RETABLIR, exact: true }).click();
      await expect.poll(() => entetes(page, v)).toEqual(ENTETES[v]);
    }
  });
}

test('E2E-555-r4 : Gantt d’un projet, chef qui lit sans écrire : menu sans Vendu ni Marge', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E555');
  const email = await chefLecteur(request, m.projet.id, 'E555');
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecterAvec(page, email);
  await page.goto(adresse(m, 'projet'));
  await attendre(page, 'projet');
  expect(await entetes(page, 'projet')).toEqual(
    ENTETES.projet.filter((t) => t !== 'Vendu' && t !== 'Marge'),
  );
  await ouvrirMenu(page);
  expect(
    (await menu(page).getByRole('menuitemcheckbox').allTextContents()).map((t) => t.trim()),
  ).toEqual([
    'Planification',
    'Début',
    'Fin',
    'Ressources',
    'Charge',
    'Avancement',
    'OTP',
    'Drapeaux',
  ]);
  await fermerMenu(page);
});

test('E2E-556-r4 : Accueil, colonnes Charge, Avancement, Réel, Vendu, Marge : valeurs des éléments, lignes de projet vides, Vendu et Marge vides sur un projet en lecture, marge négative en couleur flag', async ({
  page,
  request,
  playwright,
}) => {
  const api = await preparer(request);
  const emailChef = 'chef-e2e556@example.test';
  const chef = await api.utilisateur('Chef E2E556', emailChef, 'chef_de_projet', true);
  const autre = await api.utilisateur(
    'Autre E2E556',
    'autre-e2e556@example.test',
    'chef_de_projet',
  );
  const emailAlice = 'alice-e2e556@example.test';
  const alice = await api.utilisateur('Alice E2E556', emailAlice, 'ressource', true);
  const p1 = await api.projet('P-E2E556', 'Projet E2E556', chef.id);
  const p2 = await api.projet('Q-E2E556', 'Projet Q E2E556', autre.id);
  await api.affectation(p1.id, alice.id);
  await api.affectation(p2.id, alice.id);
  await api.affectation(p2.id, chef.id);
  const v = await activiteAvec(request, p1.id, 'Tâche V', { charge_vendue: 3 });
  const sv = await api.assignation(v.id, alice.id, 4);
  await jalonAvec(request, p1.id, 'Jalon V', { type: 'fixe', date_validee: '2027-01-08' });
  const l = await activiteAvec(request, p2.id, 'Tâche L', { charge_vendue: 5 });
  await api.assignation(l.id, alice.id, 2);
  const sessionAlice = await sessionDe(playwright, emailAlice);
  await imputerApi(sessionAlice, '2026-11-16', [
    { assignation_id: sv.id, imputations: [{ jour: '2026-11-16', charge: 1.5 }] },
  ]);
  await sessionAlice.dispose();
  await calculer(request, [p1.id, p2.id]);

  await page.setViewportSize({ width: 1440, height: 900 });
  await connecterAvec(page, emailChef);
  await page.goto('/?zoom=jour');
  await page.locator('svg[data-zoom]').waitFor();
  await expect(page.getByRole('button', { name: /^Replier / }).first()).toBeVisible(); // D-218 (4), (9)
  const zone = zoneTableau(page, 'accueil');
  await expect(zone.getByText('Tâche V', { exact: true })).toBeVisible();
  await expect(zone.getByText('Tâche L', { exact: true })).toBeVisible();
  await basculer(page, ['Charge', 'Avancement', 'Réel', 'Vendu', 'Marge', 'Drapeaux']);
  const titres = await entetes(page, 'accueil');
  expect(titres).toEqual([
    'Code',
    'Nom',
    'Début',
    'Fin',
    'Ressources',
    'Charge',
    'Avancement',
    'Réel',
    'Vendu',
    'Marge',
    'Drapeaux',
  ]);
  const ligne = (texte: string) =>
    zone.locator('tbody tr').filter({ has: page.getByText(texte, { exact: true }) });
  const cellule = (texte: string, colonne: string) =>
    ligne(texte).locator('td').nth(titres.indexOf(colonne));
  const valeurs = async (texte: string) => {
    const r: Record<string, string> = {};
    for (const c of ['Charge', 'Avancement', 'Réel', 'Vendu', 'Marge'])
      r[c] = ((await cellule(texte, c).textContent()) ?? '').trim();
    return r;
  };
  expect(await valeurs('Tâche V')).toEqual({
    Charge: '4',
    Avancement: '37,5 %',
    Réel: '1,5',
    Vendu: '3',
    Marge: '−1',
  });
  await expect(cellule('Tâche V', 'Marge')).toHaveCSS('color', FLAG);
  await expect(cellule('Tâche V', 'Vendu')).not.toHaveCSS('color', FLAG);
  expect(await valeurs('Jalon V')).toEqual({
    Charge: '—',
    Avancement: '—',
    Réel: '—',
    Vendu: '',
    Marge: '',
  });
  const vides = { Charge: '', Avancement: '', Réel: '', Vendu: '', Marge: '' };
  expect(await valeurs('Projet E2E556')).toEqual(vides);
  expect(await valeurs('Projet Q E2E556')).toEqual(vides);
  expect(await valeurs('Tâche L')).toEqual({
    Charge: '2',
    Avancement: '0 %',
    Réel: '0',
    Vendu: '',
    Marge: '',
  });
});
