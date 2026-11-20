// REX-3a (D-123) : séance UX de fin de lot 3, première tranche. E2E-246 à E2E-254, E2E-256.
// Données créées par l'API (monde de chaque test, noms et codes suffixés) ; les saisies anciennes sur un jour
// non ouvré sont insérées directement en base (l'API refuse désormais une saisie nouvelle, D-123 (8)).
// Contrat (à relire) :
//  - grille du Planning manuel : cases `disabled` (ou `aria-disabled`) sur les jours non ouvrés du calendrier
//    de la ressource (jours fériés compris), sauf si elles sont cochées ; notification du refus 422
//    `jour_non_ouvre` : « Ce jour n'est pas ouvré pour la ressource. » ;
//  - onglet Planning : après Monter ou Descendre, focus sur le même bouton (sur l'autre flèche s'il est
//    désactivé), `tr[data-deplacee]` pendant 2 s, zone `role="status"` « <nom> est maintenant en position
//    <wbs>. » ; « Assigner une ressource à <nom> » à la fin de la colonne Ressources (4e colonne) ; nom
//    d'une activité ou d'un jalon = bouton (nom accessible = le nom) pour qui écrit ; ordre des actions ;
//  - dialogue d'activité : champ « Mode de planification » (valeur = code, texte = libellé), aide en
//    description accessible ; Gantt du projet : colonne « Planification », badge « Sous-projet » (3e colonne
//    de la ligne), lien « <code> · <nom> ».
// Colonnes de l'onglet Planning : 0 WBS, 1 Nom, 2 Type, 3 Ressources, 4 Actions.
import { expect, test, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { chefLecteur } from './lot6b-helpers.js';
import { libelleCase, lireSaisies, monde } from './lot2e-helpers.js';
import { activiteAvec, jalonAvec, monde3b, sousProjet } from './lot3b-helpers.js';
import { calendrierPropre, insererSaisies, journeeEntiere } from './rex3a-helpers.js';

const fiche = (projetId: number) => `/projets/${projetId}`;
const gantt = (projetId: number) => `/projets/${projetId}?onglet=gantt`;
const ligneDe = (page: Page, nom: string) =>
  page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: `Monter ${nom}`, exact: true }) });

test('E2E-246 : grille MAN, jours non ouvrés : samedi, dimanche et férié de la ressource désactivés, jour ouvré activable ; saisie ancienne du samedi cochée, activable et décochable, enregistrement par l’écran', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E246');
  await calendrierPropre(request, m.alice.id, 'Calendrier E2E246', ['2027-01-06']);
  await insererSaisies([
    ...journeeEntiere(m.assignation.id, '2027-01-09'),
    { assignation_id: m.assignation.id, jour: '2027-01-05', demi_journee: 'matin' },
  ]);
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=2027-01`);
  const c = (jour: number, demi: 'matin' | 'après-midi') =>
    page.getByRole('checkbox', { name: libelleCase(m.nomAlice, jour, 'janvier', demi) });

  await expect(c(5, 'matin')).toBeChecked();
  // Jours non ouvrés non cochés : désactivés (dimanche, samedi, férié propre à Alice).
  for (const jour of [3, 16, 17, 6]) {
    // D-124 (1) : `aria-disabled="true"` sans l'attribut `disabled` (toBeDisabled seul ne les distingue pas).
    for (const demi of ['matin', 'après-midi'] as const) {
      await expect(c(jour, demi), `jour ${jour} ${demi}`).toBeDisabled();
      await expect(c(jour, demi), `jour ${jour} ${demi}`).toHaveAttribute('aria-disabled', 'true');
      await expect(c(jour, demi), `jour ${jour} ${demi}`).not.toHaveAttribute('disabled');
    }
  }
  // Jours ouvrés : activables.
  for (const jour of [4, 5, 7]) await expect(c(jour, 'matin'), `jour ${jour}`).toBeEnabled();
  // Saisie ancienne du samedi 09 : cochée et activable.
  for (const demi of ['matin', 'après-midi'] as const) {
    await expect(c(9, demi)).toBeChecked();
    await expect(c(9, demi)).toBeEnabled();
    await c(9, demi).uncheck();
  }
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('status').filter({ hasText: /enregistr/i })).toBeVisible();
  expect(await lireSaisies(request, m.man.id, '2027-01')).toEqual([
    { assignation_id: m.assignation.id, jour: '2027-01-05', demi_journee: 'matin' },
  ]);
  // Décochée : le samedi redevient désactivé.
  await expect(c(9, 'matin')).toBeDisabled();
  await expect(c(9, 'après-midi')).toBeDisabled();
});

test('E2E-247 : onglet Planning, Monter et Descendre : focus conservé (ou sur l’autre flèche), data-deplacee pendant 2 s, position annoncée', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E247', []);
  const noms = ['Alpha 247', 'Bravo 247', 'Charlie 247'];
  for (const nom of noms) await activiteAvec(request, m.projet.id, nom);
  await connecterAvec(page, m.emailChef);
  await page.goto(fiche(m.projet.id));
  const bouton = (verbe: 'Monter' | 'Descendre', nom: string) =>
    page.getByRole('button', { name: `${verbe} ${nom}`, exact: true });
  const annonce = (texte: string) => page.getByRole('status').filter({ hasText: texte });
  const ordre = async () =>
    (
      (await (await request.get(`/api/projets/${m.projet.id}/planning`)).json()) as {
        nom: string;
      }[]
    ).map((e) => e.nom);

  // Charlie monte de la 3e à la 2e position.
  await bouton('Monter', 'Charlie 247').click();
  await expect(annonce('Charlie 247 est maintenant en position 2.')).toBeVisible();
  await expect(bouton('Monter', 'Charlie 247')).toBeFocused();
  await expect(page.locator('tr[data-deplacee]')).toHaveCount(1);
  await expect(page.locator('tr[data-deplacee]')).toContainText('Charlie 247');
  expect(await ordre()).toEqual(['Alpha 247', 'Charlie 247', 'Bravo 247']);
  // Le repère disparaît après environ 2 s.
  await expect(page.locator('tr[data-deplacee]')).toHaveCount(0, { timeout: 4000 });

  // Charlie arrive en première position : « Monter » désactivé, le focus passe à « Descendre ».
  await bouton('Monter', 'Charlie 247').click();
  await expect(annonce('Charlie 247 est maintenant en position 1.')).toBeVisible();
  await expect(bouton('Monter', 'Charlie 247')).toBeDisabled();
  await expect(bouton('Descendre', 'Charlie 247')).toBeFocused();
  await expect(page.locator('tr[data-deplacee]')).toHaveCount(1);

  // Alpha descend jusqu'en dernière position : « Descendre » désactivé, le focus passe à « Monter ».
  await bouton('Descendre', 'Alpha 247').click();
  await expect(annonce('Alpha 247 est maintenant en position 3.')).toBeVisible();
  await expect(bouton('Descendre', 'Alpha 247')).toBeDisabled();
  await expect(bouton('Monter', 'Alpha 247')).toBeFocused();
  expect(await ordre()).toEqual(['Charlie 247', 'Bravo 247', 'Alpha 247']);
});

test('E2E-248 : onglet Planning : « Assigner une ressource à <nom> » à la fin de la colonne Ressources, absent de la colonne Actions ; assignation créée par l’écran ; aucun bouton sur un parent ni un jalon', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E248', ['Alice', 'Bob']);
  const tache = await activiteAvec(request, m.projet.id, 'Tâche 248');
  await m.api.assignation(tache.id, m.gens.Alice!.id, 2);
  const phase = await activiteAvec(request, m.projet.id, 'Phase 248');
  await activiteAvec(request, m.projet.id, 'Fille 248', { parent_id: phase.id });
  await jalonAvec(request, m.projet.id, 'Jalon 248');
  await connecterAvec(page, m.emailChef);
  await page.goto(fiche(m.projet.id));

  const nomBouton = 'Assigner une ressource à Tâche 248';
  const ligne = ligneDe(page, 'Tâche 248');
  const ressources = ligne.getByRole('cell').nth(3);
  const actions = ligne.getByRole('cell').nth(4);
  await expect(ressources.getByRole('button', { name: nomBouton, exact: true })).toHaveCount(1);
  await expect(actions.getByRole('button', { name: nomBouton, exact: true })).toHaveCount(0);
  await expect(ressources.getByRole('button').last()).toHaveAccessibleName(nomBouton);

  for (const nom of ['Phase 248', 'Jalon 248']) {
    await expect(
      page.getByRole('button', { name: `Assigner une ressource à ${nom}`, exact: true }),
    ).toHaveCount(0);
  }

  await ressources.getByRole('button', { name: nomBouton, exact: true }).click();
  const dialogue = page.getByRole('dialog');
  await dialogue.getByLabel('Ressource').selectOption({ label: `Bob E2E248` });
  await dialogue.getByLabel('Charge assignée (jours)').fill('3');
  await dialogue.getByRole('button', { name: 'Assigner' }).click();
  await expect(dialogue).toHaveCount(0);
  await expect(ressources).toContainText('Bob E2E248');
  await expect(ressources.getByRole('button').last()).toHaveAccessibleName(nomBouton);
});

test('E2E-249-r1 : onglet Planning : le nom d’une activité et d’un jalon est un bouton qui ouvre le dialogue de modification ; renommage par l’écran, effet dans le Gantt ; lecture seule : texte simple', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E249', ['Alice']);
  await activiteAvec(request, m.projet.id, 'Alpha 249');
  await jalonAvec(request, m.projet.id, 'Jalon 249');
  await connecterAvec(page, m.emailChef);
  await page.goto(fiche(m.projet.id));

  await page.getByRole('button', { name: 'Alpha 249', exact: true }).click();
  const dialogue = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await expect(dialogue.getByLabel('Nom', { exact: true })).toHaveValue('Alpha 249');
  await dialogue.getByLabel('Nom', { exact: true }).fill('Alpha 249 bis');
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialogue).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Alpha 249 bis', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Jalon 249', exact: true }).click();
  const jalon = page.getByRole('dialog', { name: 'Modifier le jalon' });
  await expect(jalon.getByLabel('Nom', { exact: true })).toHaveValue('Jalon 249');
  await jalon.getByLabel('Nom', { exact: true }).fill('Jalon 249 bis');
  await jalon.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(jalon).toHaveCount(0);

  // Effet dans l'écran consommateur : l'onglet Gantt.
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect(page.getByRole('cell', { name: 'Alpha 249 bis', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Jalon 249 bis', exact: true })).toBeVisible();

  // Sans droit d'écriture : texte simple.
  await page.context().clearCookies();
  // Révision 6b (D-031, D-148 (9)) : témoin lecture seule = chef de projet affecté au projet d'un autre chef.
  await connecterAvec(page, await chefLecteur(request, m.projet.id, 'E249'));
  await page.goto(fiche(m.projet.id));
  await expect(page.getByRole('cell', { name: 'Alpha 249 bis', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alpha 249 bis', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Jalon 249 bis', exact: true })).toHaveCount(0);
});

test('E2E-250 : onglet Planning : ordre des boutons de la colonne Actions, noms accessibles inchangés', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E250', ['Alice']);
  await activiteAvec(request, m.projet.id, 'Manuelle 250', { mode: 'MAN' });
  await jalonAvec(request, m.projet.id, 'Jalon 250');
  await connecterAvec(page, m.emailChef);
  await page.goto(fiche(m.projet.id));

  const noms = (nom: string) =>
    ligneDe(page, nom)
      .getByRole('cell')
      .nth(4)
      .getByRole('button')
      .evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')));
  await expect
    .poll(() => noms('Manuelle 250'))
    .toEqual([
      'Modifier Manuelle 250',
      'Planning manuel',
      'Monter Manuelle 250',
      'Descendre Manuelle 250',
      'Déplacer Manuelle 250',
      'Ajouter une sous-activité à Manuelle 250',
      'Supprimer Manuelle 250',
    ]);
  expect(await noms('Jalon 250')).toEqual([
    'Modifier Jalon 250',
    'Monter Jalon 250',
    'Descendre Jalon 250',
    'Déplacer Jalon 250',
    'Supprimer Jalon 250',
  ]);
});

test('E2E-251 : dialogue de modification d’une activité : « Mode de planification », huit options, aide en description accessible qui change avec le mode ; enregistrement par l’écran', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E251', []);
  const a = await activiteAvec(request, m.projet.id, 'Activité 251');
  await connecterAvec(page, m.emailChef);
  await page.goto(fiche(m.projet.id));
  await page.getByRole('button', { name: 'Modifier Activité 251', exact: true }).click();
  const dialogue = page.getByRole('dialog', { name: 'Modifier l’activité' });
  const liste = dialogue.getByLabel('Mode de planification', { exact: true });
  await expect(liste).toBeVisible();

  expect(
    await liste
      .locator('option')
      .evaluateAll((os) => os.map((o) => [(o as HTMLOptionElement).value, o.textContent])),
  ).toEqual([
    ['ASAP', 'Dès que possible'],
    ['START', 'Pas avant une date'],
    ['STARR', 'Démarrage imposé'],
    ['ALAP', 'Fin visée'],
    ['FDUR', 'Durée fixe'],
    ['DDUR', 'Durée imposée'],
    ['REGUL', 'Régulier entre deux dates'],
    ['MAN', 'Planning manuel'],
  ]);
  await expect(liste).toHaveAccessibleDescription(
    'Démarre au plus tôt, selon les dépendances et la disponibilité des ressources.',
  );
  await liste.selectOption('STARR');
  await expect(liste).toHaveAccessibleDescription(
    "Démarre à la date de début saisie, en priorité sur les autres activités ; signalée « Début non respecté » si c'est impossible.",
  );
  await liste.selectOption('MAN');
  await expect(liste).toHaveAccessibleDescription(
    'Charge saisie à la main, par ressource et par demi-journée.',
  );
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialogue).toHaveCount(0);

  const liste2 = (await (await request.get(`/api/projets/${m.projet.id}/activites`)).json()) as {
    id: number;
    mode: string;
  }[];
  expect(liste2.find((x) => x.id === a.id)?.mode).toBe('MAN');
});

test('E2E-252 : Gantt du projet : colonne « Planification », libellé des huit modes, badge « Sous-projet » et nom « <code> · <nom> » pour un sous-projet', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E252', []);
  const modes: [string, string, Record<string, unknown>][] = [
    ['ASAP', 'Dès que possible', {}],
    ['START', 'Pas avant une date', { debut_valide: '2027-01-11' }],
    ['STARR', 'Démarrage imposé', { debut_valide: '2027-01-11' }],
    ['ALAP', 'Fin visée', { fin_valide: '2027-01-29' }],
    ['FDUR', 'Durée fixe', { debut_valide: '2027-01-11', duree_validee: 3 }],
    ['DDUR', 'Durée imposée', { debut_valide: '2027-01-11', duree_validee: 3 }],
    [
      'REGUL',
      'Régulier entre deux dates',
      { debut_valide: '2027-01-11', fin_valide: '2027-01-22' },
    ],
    ['MAN', 'Planning manuel', {}],
  ];
  for (const [mode, , champs] of modes) {
    await activiteAvec(request, m.projet.id, `Mode ${mode} 252`, { mode, ...champs });
  }
  const sp = await sousProjet(request, m.projet.id, 'SP-252', 'Sous-projet 252', m.chef.id);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));

  await expect(
    page.getByRole('columnheader', { name: 'Planification', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Mode', exact: true })).toHaveCount(0);
  for (const [mode, libelle] of modes) {
    const ligne = page.getByRole('row').filter({ hasText: `Mode ${mode} 252` });
    await expect(ligne.getByRole('cell').nth(2), mode).toHaveText(libelle);
  }
  const ligneSp = page.getByRole('row').filter({ hasText: 'Sous-projet 252' });
  await expect(ligneSp.getByRole('cell').nth(2)).toHaveText('Sous-projet');
  const lien = ligneSp.getByRole('link', { name: 'SP-252 · Sous-projet 252', exact: true });
  await expect(lien).toHaveAttribute('href', `/projets/${sp.id}`);
});

test('E2E-253 : grille MAN, PUT refusé en 422 jour_non_ouvre : notification, case cochée conservée, base inchangée', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E253');
  await page.route('**/api/activites/*/saisies?*', async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    return route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        erreur: 'Jour non ouvré',
        code: 'jour_non_ouvre',
        assignation_id: m.assignation.id,
        jour: '2027-01-04',
      }),
    });
  });
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=2027-01`);
  const lundi = page.getByRole('checkbox', {
    name: libelleCase(m.nomAlice, 4, 'janvier', 'matin'),
  });
  await lundi.check();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText(/Ce jour n.est pas ouvré pour la ressource\./)).toBeVisible();
  await expect(lundi).toBeChecked();
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
  expect(await lireSaisies(request, m.man.id, '2027-01')).toEqual([]);
});

test('E2E-254 : clavier, grille MAN : une case de jour non ouvré non cochée est atteignable (flèches, Fin), aria-disabled, Espace et clic sans effet ; aucune modification en attente, aucune saisie en base', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E254');
  const puts: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'PUT' && r.url().includes('/saisies')) puts.push(r.url());
  });
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=2027-01`);
  const c = (jour: number, demi: 'matin' | 'après-midi') =>
    page.getByRole('checkbox', { name: libelleCase(m.nomAlice, jour, 'janvier', demi) });
  await expect(page.locator('table input[type="checkbox"]')).toHaveCount(62);

  // Tab entre dans la grille sur la case courante initiale : jour 1, matin.
  await page.getByRole('button', { name: 'Mois suivant' }).focus();
  await page.keyboard.press('Tab');
  await expect(c(1, 'matin')).toBeFocused();

  // → → : samedi 02 matin, non ouvré, focalisable.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const samedi = c(2, 'matin');
  await expect(samedi).toBeFocused();
  await expect(samedi).toHaveAttribute('aria-disabled', 'true');
  await expect(samedi).not.toHaveAttribute('disabled');
  await expect(samedi).toHaveAttribute('tabindex', '0');

  // Espace puis clic : sans effet, aucune modification en attente.
  await page.keyboard.press('Space');
  await expect(samedi).not.toBeChecked();
  await samedi.click({ force: true });
  await expect(samedi).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Annuler' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Mois suivant' })).toBeEnabled();

  // Fin : dernière case de la ligne, dimanche 31 après-midi.
  await samedi.focus();
  await page.keyboard.press('End');
  await expect(c(31, 'après-midi')).toBeFocused();
  await expect(c(31, 'après-midi')).toHaveAttribute('aria-disabled', 'true');

  expect(puts).toHaveLength(0);
  expect(await lireSaisies(request, m.man.id, '2027-01')).toEqual([]);
});

test('E2E-256 : grille MAN, échec de GET …/jours-non-ouvres traité comme l’échec de GET …/saisies : message, Réessayer, pas de grille', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E256');
  await page.route('**/api/activites/*/jours-non-ouvres?*', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ erreur: 'Erreur interne' }),
    }),
  );
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=2027-01`);
  await expect(page.getByText('Impossible de charger les saisies.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
});
