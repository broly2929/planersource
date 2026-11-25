// Charge lisible (D-220 ; SPEC §6 « Charge lisible ») : E2E-572 à E2E-583. Base « administrateur seul » avant et
// après chaque test. Données préparées par l'API ; les dialogues sont pilotés par l'écran (onglet Planning).
// Valeurs attendues recopiées de SPEC §6 « Charge lisible » : champs par mode, aides, formats « X j ».
import { expect, test, type Locator, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activiteAvec, monde3b } from './lot3b-helpers.js';
import { chefLecteur, remettreAdminSeul6b } from './lot6b-helpers.js';
import { confirmation } from './garde-dialogue-helpers.js';
import { cheminCapture } from './captures.js';

test.beforeEach(remettreAdminSeul6b);
test.afterEach(remettreAdminSeul6b);

const MODES = ['ASAP', 'START', 'STARR', 'ALAP', 'FDUR', 'DDUR', 'REGUL', 'MAN'] as const;
type Mode = (typeof MODES)[number];
/** Champs visibles par mode : [début, fin, durée] (SPEC §6 « Charge lisible » 1). */
const CHAMPS: Record<Mode, [boolean, boolean, boolean]> = {
  ASAP: [false, false, true],
  START: [true, false, true],
  STARR: [true, false, true],
  ALAP: [false, true, true],
  FDUR: [true, false, true],
  DDUR: [true, false, true],
  REGUL: [true, true, false],
  MAN: [false, false, false],
};
const AIDE_DUREE =
  'Effet sur le planning : seulement sans ressource assignée (longueur de la barre, jours ouvrés).';
const AIDE_DUREE_AVEC: Mode[] = ['ASAP', 'START', 'STARR', 'ALAP'];
const AIDE_TAUX_ASSIGNATION =
  'Plafond par jour sur cette activité : taux × capacité de la ressource.';
const AIDE_TAUX_AFFECTATION = 'Plafond par semaine sur ce projet : taux × capacité × jours ouvrés.';

const DEBUT = 'Début validé';
const FIN = 'Fin validée';
const DUREE = 'Durée validée (j)';

/** Champs supplémentaires exigés par l'API pour créer une activité dans un mode donné. */
const CHAMPS_API: Record<Mode, Record<string, unknown>> = {
  ASAP: {},
  START: { debut_valide: '2027-01-11' },
  STARR: { debut_valide: '2027-01-11' },
  ALAP: { fin_valide: '2027-01-15' },
  FDUR: { duree_validee: 3 },
  DDUR: { duree_validee: 3 },
  REGUL: { debut_valide: '2027-01-11', fin_valide: '2027-01-15' },
  MAN: {},
};

async function ouvrirPlanning(page: Page, projetId: number, email: string) {
  await connecterAvec(page, email);
  await page.goto(`/projets/${projetId}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
}

const dialogueModif = (page: Page) => page.getByRole('dialog', { name: 'Modifier l’activité' });
const dialogueCreation = (page: Page) => page.getByRole('dialog', { name: 'Nouvelle activité' });

async function ouvrirModif(page: Page, nom: string) {
  await page.getByRole('button', { name: `Modifier ${nom}`, exact: true }).click();
  const d = dialogueModif(page);
  await expect(d).toBeVisible();
  return d;
}

async function ouvrirCreation(page: Page) {
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const d = dialogueCreation(page);
  await expect(d).toBeVisible();
  return d;
}

/** Choisit un mode comme un utilisateur : un clic sur la liste d'abord (la garde de D-188 prend sa référence au premier geste). */
async function choisirMode(d: Locator, code: string) {
  const liste = d.getByLabel('Mode de planification', { exact: true });
  await liste.click();
  await liste.selectOption(code);
  // la liste native ouverte par le clic absorberait un Échap : on la quitte
  await liste.blur();
}

/** Les trois champs de dates et de durée sont présents ou absents selon le mode. */
async function verifierChamps(d: Locator, mode: Mode) {
  const [debut, fin, duree] = CHAMPS[mode];
  for (const [libelle, present] of [
    [DEBUT, debut],
    [FIN, fin],
    [DUREE, duree],
  ] as const) {
    await expect(d.getByLabel(libelle, { exact: true }), `${libelle} en ${mode}`).toHaveCount(
      present ? 1 : 0,
    );
  }
}

/** Activités de l'API du projet, lues par l'utilisateur connecté. */
async function lireActivites(page: Page, projetId: number) {
  const r = await page.request.get(`/api/projets/${projetId}/activites`);
  expect(r.ok()).toBeTruthy();
  return (await r.json()) as {
    id: number;
    nom: string;
    mode: string;
    debut_valide: string | null;
    fin_valide: string | null;
    duree_validee: number | null;
    charge_assignee?: number;
    marge?: number | null;
  }[];
}

test('E2E-572-r1 : « Modifier l’activité », 8 modes × 3 champs : début, fin et durée présents ou absents selon le mode', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E572', []);
  for (const mode of MODES) {
    await activiteAvec(request, m.projet.id, `Act ${mode}`, { mode, ...CHAMPS_API[mode] });
  }
  await ouvrirPlanning(page, m.projet.id, m.emailChef);
  for (const mode of MODES) {
    const d = await ouvrirModif(page, `Act ${mode}`);
    await expect(d.getByLabel('Mode de planification', { exact: true })).toHaveValue(mode);
    await verifierChamps(d, mode);
    await d.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(d).toHaveCount(0);
  }
});

test('E2E-573-r1 : « Nouvelle activité », 8 modes × 3 champs ; mode ASAP par défaut ; création en FDUR (durée par défaut de l’API) et en MAN', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E573', []);
  await ouvrirPlanning(page, m.projet.id, m.emailChef);
  const d = await ouvrirCreation(page);
  const mode = d.getByLabel('Mode de planification', { exact: true });
  await expect(mode).toHaveValue('ASAP');
  for (const code of MODES) {
    await choisirMode(d, code);
    await verifierChamps(d, code);
  }
  await expect(d.getByLabel('Charge assignée (somme des ressources)')).toHaveCount(0);
  await expect(d.getByText('Charge assignée (somme des ressources)')).toHaveCount(0);
  await expect(d.getByText('Marge', { exact: true })).toHaveCount(0);

  await choisirMode(d, 'FDUR');
  await d.getByLabel('Nom', { exact: true }).fill('Créée en FDUR');
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d).toHaveCount(0);
  const d2 = await ouvrirCreation(page);
  await choisirMode(d2, 'MAN');
  await d2.getByLabel('Nom', { exact: true }).fill('Créée en MAN');
  await d2.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d2).toHaveCount(0);

  const liste = await lireActivites(page, m.projet.id);
  const fdur = liste.find((a) => a.nom === 'Créée en FDUR')!;
  expect(fdur.mode).toBe('FDUR');
  expect(fdur.duree_validee).toBe(1);
  expect(fdur.debut_valide).toBeNull();
  const man = liste.find((a) => a.nom === 'Créée en MAN')!;
  expect(man.mode).toBe('MAN');
  expect([man.debut_valide, man.fin_valide, man.duree_validee]).toEqual([null, null, null]);
});

test('E2E-574-r1 : aide de la durée (aria-describedby) pour ASAP, START, STARR et ALAP ; aucune pour FDUR, DDUR, REGUL ; en modification et en création', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E574', []);
  await activiteAvec(request, m.projet.id, 'Act aide', { mode: 'ASAP' });
  await ouvrirPlanning(page, m.projet.id, m.emailChef);

  const verifier = async (d: Locator) => {
    for (const code of MODES) {
      await choisirMode(d, code);
      const duree = d.getByLabel(DUREE, { exact: true });
      if (AIDE_DUREE_AVEC.includes(code)) {
        await expect(d.getByText(AIDE_DUREE, { exact: true }), code).toBeVisible();
        const id = await duree.getAttribute('aria-describedby');
        expect(id, `aria-describedby en ${code}`).toBeTruthy();
        await expect(d.locator(`[id="${id}"]`)).toHaveText(AIDE_DUREE);
        await expect(duree).toHaveAccessibleDescription(AIDE_DUREE);
      } else {
        await expect(d.getByText(AIDE_DUREE, { exact: true }), code).toHaveCount(0);
      }
    }
  };
  const modif = await ouvrirModif(page, 'Act aide');
  await verifier(modif);
  await modif.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.getByRole('button', { name: 'Abandonner', exact: true }).click();
  await expect(modif).toHaveCount(0);
  await verifier(await ouvrirCreation(page));
});

test('E2E-575-r1 : changement de mode : les champs apparaissent et disparaissent à chaque changement, en modification et en création', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E575', []);
  await activiteAvec(request, m.projet.id, 'Act bascule', { mode: 'ASAP' });
  await ouvrirPlanning(page, m.projet.id, m.emailChef);
  const parcours: Mode[] = ['ASAP', 'REGUL', 'ALAP', 'MAN', 'FDUR', 'ASAP', 'MAN', 'REGUL'];
  const modif = await ouvrirModif(page, 'Act bascule');
  for (const code of parcours) {
    await choisirMode(modif, code);
    await verifierChamps(modif, code);
  }
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Abandonner', exact: true }).click();
  await expect(modif).toHaveCount(0);
  const creation = await ouvrirCreation(page);
  for (const code of parcours) {
    await choisirMode(creation, code);
    await verifierChamps(creation, code);
  }
});

test('E2E-576-r1 : REGUL passé en ASAP et enregistré : début et fin non envoyés, gardés en base ; retour en REGUL : champs préremplis', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E576', []);
  const a = await activiteAvec(request, m.projet.id, 'Act régul', {
    mode: 'REGUL',
    debut_valide: '2027-01-11',
    fin_valide: '2027-01-15',
  });
  await ouvrirPlanning(page, m.projet.id, m.emailChef);
  const d = await ouvrirModif(page, 'Act régul');
  await expect(d.getByLabel(DEBUT, { exact: true })).toHaveValue('2027-01-11');
  await expect(d.getByLabel(FIN, { exact: true })).toHaveValue('2027-01-15');
  await choisirMode(d, 'ASAP');
  await verifierChamps(d, 'ASAP');
  const envoi = page.waitForRequest(
    (r) => r.url().endsWith(`/api/activites/${a.id}`) && r.method() === 'PATCH',
  );
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  const corps = (await envoi).postDataJSON() as Record<string, unknown>;
  expect(corps.mode).toBe('ASAP');
  expect(Object.keys(corps)).not.toContain('debut_valide');
  expect(Object.keys(corps)).not.toContain('fin_valide');
  await expect(d).toHaveCount(0);

  const apres = (await lireActivites(page, m.projet.id)).find((x) => x.id === a.id)!;
  expect([apres.mode, apres.debut_valide, apres.fin_valide]).toEqual([
    'ASAP',
    '2027-01-11',
    '2027-01-15',
  ]);

  const d2 = await ouvrirModif(page, 'Act régul');
  await expect(d2.getByLabel('Mode de planification', { exact: true })).toHaveValue('ASAP');
  await verifierChamps(d2, 'ASAP');
  await choisirMode(d2, 'REGUL');
  await expect(d2.getByLabel(DEBUT, { exact: true })).toHaveValue('2027-01-11');
  await expect(d2.getByLabel(FIN, { exact: true })).toHaveValue('2027-01-15');
});

test('E2E-577-r1 : garde de fermeture : une valeur saisie dans un champ masqué ne compte pas comme modifiée ; un champ visible modifié, si', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E577', []);
  const a = await activiteAvec(request, m.projet.id, 'Act garde', {
    mode: 'REGUL',
    debut_valide: '2027-01-11',
    fin_valide: '2027-01-15',
  });
  await ouvrirPlanning(page, m.projet.id, m.emailChef);
  const d = await ouvrirModif(page, 'Act garde');
  // durée saisie en ASAP, puis mode d'ouverture rétabli : le champ est masqué, rien n'est modifié
  await choisirMode(d, 'ASAP');
  await d.getByLabel(DUREE, { exact: true }).fill('4');
  await choisirMode(d, 'REGUL');
  await verifierChamps(d, 'REGUL');
  await page.keyboard.press('Escape');
  await expect(d).toHaveCount(0);
  await expect(confirmation(page)).toHaveCount(0);

  // champ visible modifié : confirmation ; « Abandonner » ne change rien en base
  const d2 = await ouvrirModif(page, 'Act garde');
  await d2.getByLabel(DEBUT, { exact: true }).fill('2027-01-12');
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
  await page.getByRole('button', { name: 'Abandonner', exact: true }).click();
  await expect(d2).toHaveCount(0);
  const apres = (await lireActivites(page, m.projet.id)).find((x) => x.id === a.id)!;
  expect([apres.mode, apres.debut_valide, apres.fin_valide, apres.duree_validee]).toEqual([
    'REGUL',
    '2027-01-11',
    '2027-01-15',
    null,
  ]);
});

test('E2E-578-r1 : « Charge assignée (somme des ressources) » en texte : « 0 j », puis « 2,5 j » et « 3,5 j » après des assignations par l’écran, « 1 j » après suppression de l’une', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E578', ['Alice', 'Bob']);
  await activiteAvec(request, m.projet.id, 'Act charge', { mode: 'ASAP' });
  await ouvrirPlanning(page, m.projet.id, m.emailChef);
  const lire = async (attendu: string) => {
    const d = await ouvrirModif(page, 'Act charge');
    await expect(
      d.getByText('Charge assignée (somme des ressources)', { exact: true }),
    ).toBeVisible();
    await expect(d.getByLabel('Charge assignée (somme des ressources)')).toHaveCount(0);
    await expect(d.locator('[data-lecture="charge-assignee"]')).toHaveText(attendu);
    await d.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(d).toHaveCount(0);
  };
  const assigner = async (ressource: string, charge: string) => {
    await page.getByRole('button', { name: 'Assigner une ressource à Act charge' }).click();
    const d = page.getByRole('dialog', { name: 'Assigner une ressource' });
    await d.getByLabel('Ressource').selectOption({ label: `${ressource} E2E578` });
    await d.getByLabel('Charge assignée (j)').fill(charge);
    await d.getByRole('button', { name: 'Assigner', exact: true }).click();
    await expect(d).toHaveCount(0);
  };
  await lire('0 j');
  await assigner('Alice', '2.5');
  await lire('2,5 j');
  await assigner('Bob', '1');
  await lire('3,5 j');
  const lignes = await (await page.request.get(`/api/projets/${m.projet.id}/assignations`)).json();
  const alice = (lignes as { id: number; ressource_id: number }[]).find(
    (x) => x.ressource_id === m.gens.Alice!.id,
  )!;
  const suppression = await page.request.delete(`/api/assignations/${alice.id}`);
  expect(suppression.ok()).toBeTruthy();
  await page.reload();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await lire('1 j');
});

test('E2E-579 : « Marge » en lecture seule : « 2 j » (positive), « −2 j » en couleur flag (négative), « — » sans charge vendue ; aucun champ', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E579', ['Alice']);
  const positive = await activiteAvec(request, m.projet.id, 'Act positive', { charge_vendue: 5 });
  const negative = await activiteAvec(request, m.projet.id, 'Act négative', { charge_vendue: 1 });
  await activiteAvec(request, m.projet.id, 'Act sans vendu');
  await m.api.assignation(positive.id, m.gens.Alice!.id, 3);
  await m.api.assignation(negative.id, m.gens.Alice!.id, 3);
  await ouvrirPlanning(page, m.projet.id, m.emailChef);
  const cas: [string, string, boolean][] = [
    ['Act positive', '2 j', false],
    ['Act négative', '−2 j', true],
    ['Act sans vendu', '—', false],
  ];
  for (const [nom, attendu, flag] of cas) {
    const d = await ouvrirModif(page, nom);
    await expect(d.getByText('Marge', { exact: true })).toBeVisible();
    await expect(d.getByLabel('Marge', { exact: true })).toHaveCount(0);
    const marge = d.locator('[data-lecture="marge"]');
    await expect(marge, nom).toHaveText(attendu);
    if (flag) await expect(marge).toHaveClass(/text-flag/);
    else await expect(marge).not.toHaveClass(/text-flag/);
    await d.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(d).toHaveCount(0);
  }
  // l'enregistrement du dialogue ne modifie pas la charge vendue
  const d = await ouvrirModif(page, 'Act positive');
  await d.getByLabel('Nom', { exact: true }).fill('Act positive bis');
  await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(d).toHaveCount(0);
  const apres = await lireActivites(page, m.projet.id);
  expect(apres.find((x) => x.id === positive.id)).toMatchObject({
    nom: 'Act positive bis',
    charge_vendue: 5,
    marge: 2,
    charge_assignee: 3,
  });
});

test('E2E-580 : chef de projet en lecture seule : aucun bouton de modification, dialogue non ouvrable ; charge_assignee, marge et charge_vendue absents de la réponse de l’API', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E580', ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Act lecture', { charge_vendue: 4 });
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  const email = await chefLecteur(request, m.projet.id, 'E580');
  await connecterAvec(page, email);
  const r = await page.request.get(`/api/projets/${m.projet.id}/activites`);
  expect(r.ok()).toBeTruthy();
  const lignes = (await r.json()) as Record<string, unknown>[];
  expect(lignes.length).toBeGreaterThan(0);
  for (const l of lignes) {
    expect(Object.keys(l)).not.toContain('charge_assignee');
    expect(Object.keys(l)).not.toContain('marge');
    expect(Object.keys(l)).not.toContain('charge_vendue');
  }
  await page.goto(`/projets/${m.projet.id}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
  await expect(page.getByRole('cell', { name: 'Act lecture', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Modifier / })).toHaveCount(0);
  await page.getByRole('cell', { name: 'Act lecture', exact: true }).dblclick();
  await expect(page.getByRole('dialog', { name: 'Modifier l’activité' })).toHaveCount(0);
});

test('E2E-581 : aide « Plafond par jour sur cette activité : … » sous « Taux (%) » des dialogues « Assigner » et « Modifier l’assignation »', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E581', ['Alice', 'Bob']);
  const a = await activiteAvec(request, m.projet.id, 'Act taux', { mode: 'ASAP' });
  await m.api.assignation(a.id, m.gens.Alice!.id, 2);
  await ouvrirPlanning(page, m.projet.id, m.emailChef);
  await page.getByRole('button', { name: 'Assigner une ressource à Act taux' }).click();
  const creation = page.getByRole('dialog', { name: 'Assigner une ressource' });
  await expect(creation.getByText(AIDE_TAUX_ASSIGNATION, { exact: true })).toBeVisible();
  const taux = creation.getByLabel('Taux (%)', { exact: true });
  const id = await taux.getAttribute('aria-describedby');
  expect(id).toBeTruthy();
  await expect(creation.locator(`[id="${id}"]`)).toHaveText(AIDE_TAUX_ASSIGNATION);
  await creation.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(creation).toHaveCount(0);

  await page
    .getByRole('button', { name: "Modifier l'assignation de Alice E2E581 à Act taux", exact: true })
    .click();
  const modif = page.getByRole('dialog', { name: 'Modifier l’assignation' });
  await expect(modif.getByText(AIDE_TAUX_ASSIGNATION, { exact: true })).toBeVisible();
  await expect(modif.getByLabel('Taux (%)', { exact: true })).toHaveAccessibleDescription(
    AIDE_TAUX_ASSIGNATION,
  );
});

test('E2E-582 : aide « Plafond par semaine sur ce projet : … » sous « Taux (%) » de l’affectation, en création et en modification', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E582', ['Alice']);
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}`);
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  const creation = page.getByRole('dialog', { name: 'Affecter une ressource' });
  await expect(creation.getByText(AIDE_TAUX_AFFECTATION, { exact: true })).toBeVisible();
  const taux = creation.getByLabel('Taux (%)', { exact: true });
  const id = await taux.getAttribute('aria-describedby');
  expect(id).toBeTruthy();
  await expect(creation.locator(`[id="${id}"]`)).toHaveText(AIDE_TAUX_AFFECTATION);
  await creation.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(creation).toHaveCount(0);

  await page
    .getByRole('button', { name: "Modifier l'affectation de Alice E2E582", exact: true })
    .click();
  const modif = page.getByRole('dialog', { name: 'Modifier l’affectation' });
  await expect(modif.getByText(AIDE_TAUX_AFFECTATION, { exact: true })).toBeVisible();
  await expect(modif.getByLabel('Taux (%)', { exact: true })).toHaveAccessibleDescription(
    AIDE_TAUX_AFFECTATION,
  );
});

test('E2E-583 : captures sans assertion de valeur (dialogues d’activité, aide des taux)', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E583', ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Act capture', {
    mode: 'ASAP',
    charge_vendue: 1,
  });
  await activiteAvec(request, m.projet.id, 'Act régul capture', {
    mode: 'REGUL',
    debut_valide: '2027-01-11',
    fin_valide: '2027-01-15',
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  await ouvrirPlanning(page, m.projet.id, m.emailChef);
  for (const largeur of [1440, 1024]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const [nom, suffixe] of [
      ['Act capture', 'asap'],
      ['Act régul capture', 'regul'],
    ]) {
      const d = await ouvrirModif(page, nom!);
      await page.screenshot({ path: cheminCapture(`charge-lisible-${suffixe}-${largeur}.png`) });
      await d.getByRole('button', { name: 'Annuler', exact: true }).click();
      await expect(d).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Assigner une ressource à Act capture' }).click();
    await page.screenshot({ path: cheminCapture(`charge-lisible-taux-${largeur}.png`) });
    await page.keyboard.press('Escape');
  }
});
