// Lot 3c-E (D-074, SPEC §6 « Calcul (lot 3c, D-074) ») : bouton « Calculer » et dialogue « Calculer le
// planning ». E2E-59 à E2E-68. Horloge figée au 06/01/2027 ; base remise à « administrateur seul » avant chaque test.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec } from './lot1-helpers.js';
import { activiteAvec, sousProjet } from './lot3b-helpers.js';
import {
  adresseGantt,
  allerA,
  bandeauNonCalcule,
  base3c,
  boutonsCalculer,
  creerProjetParEcran,
  creerRessourceParEcran,
  D0_FIGE,
  dialogueCalcul,
  etatsCases,
  J06,
  libellesCases,
  lireGantt,
  notification,
  ouvrirDialogueCalcul,
  projetPret,
  remettreAdminSeul,
} from './lot3c-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
});

/** Session neuve (autre contexte de navigateur), horloge figée, connectée par l'écran de connexion. */
async function pageConnectee(browser: Browser, email: string): Promise<Page> {
  const p = await (await browser.newContext()).newPage();
  await p.clock.setFixedTime(J06);
  await connecterAvec(p, email);
  return p;
}

test('E2E-59 parcours complet à l’écran : de l’administrateur seul au planning calculé', async ({
  page,
}) => {
  await loginAsAdmin(page);

  await allerA(page, 'Calendriers');
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 3C-59');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 3C-59/ })).toBeVisible();

  await creerRessourceParEcran(page, 'Ressource 3C-59', 'ressource-3c-59@lot3c.test', 'Cal 3C-59');
  await creerProjetParEcran(page, '3C-59', 'Projet 3C-59');

  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 3C-59' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 3C-59', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page.getByRole('dialog').getByLabel('Ressource').selectOption({ label: 'Ressource 3C-59' });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: /Ressource 3C-59/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Activité 3C-59');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Activité 3C-59/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Activité 3C-59' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: 'Ressource 3C-59' });
  await assignation.getByLabel('Charge assignée (jours)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Activité 3C-59.*Ressource 3C-59/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect(bandeauNonCalcule(page)).toBeVisible();
  const dialogue = await ouvrirDialogueCalcul(page);
  await expect(dialogue.getByLabel('Date de début du calcul')).toHaveValue(D0_FIGE);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();

  await expect(notification(page, 'Planning calculé.')).toBeVisible();
  await expect(dialogueCalcul(page)).toHaveCount(0);
  await expect(bandeauNonCalcule(page)).toHaveCount(0);
  const barres = page.locator('svg [data-element-id]');
  await expect(barres).toHaveCount(1);
  await expect(barres.first()).toHaveAttribute('data-debut', '2027-01-06');
  await expect(barres.first()).toHaveAttribute('data-fin', '2027-01-07');
});

test('E2E-60 dialogue : projet courant coché, date figée ; la requête porte d0 et les seuls projets cochés', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  const a = await projetPret(api, chef.id, '3C-60A');
  const b = await projetPret(api, chef.id, '3C-60B');
  const c = await projetPret(api, chef.id, '3C-60C');
  let envoye: unknown;
  await page.route('**/api/calcul', async (route) => {
    envoye = route.request().postDataJSON();
    await route.continue();
  });
  await loginAsAdmin(page);
  await page.goto(adresseGantt(a.projet.id));
  const dialogue = await ouvrirDialogueCalcul(page);

  expect(await libellesCases(dialogue)).toEqual([
    '3C-60A — Projet 3C-60A',
    '3C-60B — Projet 3C-60B',
    '3C-60C — Projet 3C-60C',
  ]);
  expect(await etatsCases(dialogue)).toEqual([true, false, false]);
  await expect(dialogue.getByLabel('Date de début du calcul')).toHaveValue(D0_FIGE);

  await dialogue.getByRole('checkbox', { name: '3C-60B — Projet 3C-60B' }).check();
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect.poll(() => envoye).toBeTruthy();
  const corps = envoye as { projets: number[]; d0: string };
  expect([...corps.projets].sort((x, y) => x - y)).toEqual([a.projet.id, b.projet.id]);
  expect(corps.d0).toBe(D0_FIGE);
  expect(corps.projets).not.toContain(c.projet.id);
});

test('E2E-61 « Tout cocher » puis « Calculer » : deux projets calculés ; « Tout décocher » décoche tout', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  const a = await projetPret(api, chef.id, '3C-61A');
  const b = await projetPret(api, chef.id, '3C-61B');
  await loginAsAdmin(page);
  await page.goto(adresseGantt(a.projet.id));
  const dialogue = await ouvrirDialogueCalcul(page);
  await dialogue.getByRole('button', { name: 'Tout décocher' }).click();
  expect(await etatsCases(dialogue)).toEqual([false, false]);
  await dialogue.getByRole('button', { name: 'Tout cocher' }).click();
  expect(await etatsCases(dialogue)).toEqual([true, true]);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();

  await expect(notification(page, 'Planning calculé.')).toBeVisible();
  for (const p of [a, b]) {
    const gantt = await lireGantt(request, p.projet.id);
    expect(gantt.elements).toHaveLength(1);
    expect(gantt.elements[0]).toMatchObject({
      debut_planifie: '2027-01-06',
      fin_planifiee: '2027-01-07',
    });
  }
});

test('E2E-62 aucune case cochée : bouton « Calculer » du dialogue inactif', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  const a = await projetPret(api, chef.id, '3C-62A');
  await projetPret(api, chef.id, '3C-62B');
  await loginAsAdmin(page);
  await page.goto(adresseGantt(a.projet.id));
  const dialogue = await ouvrirDialogueCalcul(page);
  const valider = dialogue.getByRole('button', { name: 'Calculer', exact: true });
  await expect(valider).toBeEnabled();
  await dialogue.getByRole('checkbox', { name: '3C-62A — Projet 3C-62A' }).uncheck();
  await expect(valider).toBeDisabled();
  await dialogue.getByRole('checkbox', { name: '3C-62A — Projet 3C-62A' }).check();
  await expect(valider).toBeEnabled();
  await dialogue.getByRole('button', { name: 'Tout décocher' }).click();
  await expect(valider).toBeDisabled();
  await dialogue.getByRole('button', { name: 'Tout cocher' }).click();
  await expect(valider).toBeEnabled();
});

test('E2E-63 liste : ni modèle, ni projet clos, ni sous-projet ; racine cochée depuis un sous-projet', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  const c = await api.projet('C-3', 'Racine C', chef.id);
  await api.projet('A-1', 'Racine A', chef.id);
  const sous = await sousProjet(request, c.id, 'S-1', 'Sous-projet S', chef.id);
  await api.modele('M-1', 'Modèle M');
  const clos = await api.projet('X-9', 'Projet clos X', chef.id);
  const r = await request.patch(`/api/projets/${clos.id}`, { data: { clos: true } });
  expect(r.ok(), `PATCH clos : ${r.status()}`).toBeTruthy();
  await loginAsAdmin(page);

  for (const [depart, attendu] of [
    [c.id, [false, true]],
    [sous.id, [false, true]],
  ] as const) {
    await page.goto(adresseGantt(depart));
    const dialogue = await ouvrirDialogueCalcul(page);
    expect(await libellesCases(dialogue)).toEqual(['A-1 — Racine A', 'C-3 — Racine C']);
    expect(await etatsCases(dialogue)).toEqual(attendu);
    await dialogue.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialogueCalcul(page)).toHaveCount(0);
  }
});

test('E2E-64 pas de bouton « Calculer » pour une ressource, un chef en lecture seule, ni sur un modèle', async ({
  page,
  request,
  browser,
}) => {
  const { api, chef } = await base3c(request);
  const p = await api.projet('3C-64', 'Projet 3C-64', chef.id);
  await api.activite(p.id, 'Activité 3C-64'); // sans élément, le Gantt n'affiche pas le bandeau
  const lecteur = await api.utilisateur(
    'Chef lecteur 3C',
    'chef-lecteur-3c@lot3c.test',
    'chef_de_projet',
    true,
  );
  const ressource = await api.utilisateur(
    'Ressource 3C-64',
    'ressource-3c-64@lot3c.test',
    'ressource',
    true,
  );
  await api.affectation(p.id, lecteur.id);
  await api.affectation(p.id, ressource.id);
  const modele = await api.modele('M-64', 'Modèle 3C-64');

  // témoin : l'administrateur voit le bouton sur le projet ordinaire, pas sur le modèle
  await loginAsAdmin(page);
  await page.goto(adresseGantt(p.id));
  await expect(bandeauNonCalcule(page)).toBeVisible();
  await expect(boutonsCalculer(page).first()).toBeVisible();
  await page.goto(adresseGantt(modele.id));
  await expect(page.getByRole('heading', { name: 'Modèle 3C-64', level: 1 })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(boutonsCalculer(page)).toHaveCount(0);

  for (const email of ['chef-lecteur-3c@lot3c.test', 'ressource-3c-64@lot3c.test']) {
    const autre = await pageConnectee(browser, email);
    await autre.goto(adresseGantt(p.id));
    await expect(bandeauNonCalcule(autre)).toBeVisible();
    expect((await lireGantt(autre.request, p.id)).projet.peut_ecrire, email).toBe(false);
    await expect(boutonsCalculer(autre)).toHaveCount(0);
  }
});

test('E2E-65 refus 422 entree_invalide simulé : message avec le nom, dialogue ouvert, Gantt inchangé', async ({
  page,
  request,
}) => {
  // La base interdit un START sans début validé (contrainte activite_debut_requis) : le refus du moteur
  // est simulé par interception, avec l'identifiant réel de l'activité.
  const { api, chef } = await base3c(request);
  const p = await api.projet('3C-65', 'Projet 3C-65', chef.id);
  const activite = await activiteAvec(request, p.id, 'Activité START 3C-65', {
    mode: 'START',
    debut_valide: '2027-01-05',
  });
  let ids = [activite.id];
  await page.route('**/api/calcul', (route) =>
    route.fulfill({
      status: 422,
      json: { erreur: 'Calcul impossible', code: 'entree_invalide', ids },
    }),
  );
  await loginAsAdmin(page);
  await page.goto(adresseGantt(p.id));
  const dialogue = await ouvrirDialogueCalcul(page);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(dialogue.getByRole('alert')).toHaveText(
    'Calcul impossible : données incomplètes sur Activité START 3C-65.',
  );
  await expect(dialogue).toBeVisible();

  // un identifiant d'un autre projet s'affiche « élément <id> »
  ids = [999999];
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(dialogue.getByRole('alert')).toHaveText(
    'Calcul impossible : données incomplètes sur élément 999999.',
  );

  await dialogue.getByRole('button', { name: 'Annuler' }).click();
  await expect(dialogueCalcul(page)).toHaveCount(0);
  const gantt = await lireGantt(request, p.id);
  expect(gantt.elements.map((e) => e.debut_planifie)).toEqual([null]);
  await expect(bandeauNonCalcule(page)).toBeVisible();
});

test('E2E-66 409 simulé : message « Un calcul est déjà en cours. Réessayez dans un instant. », dialogue ouvert', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  const a = await projetPret(api, chef.id, '3C-66');
  await page.route('**/api/calcul', (route) =>
    route.fulfill({ status: 409, json: { erreur: 'Un calcul est déjà en cours' } }),
  );
  await loginAsAdmin(page);
  await page.goto(adresseGantt(a.projet.id));
  const dialogue = await ouvrirDialogueCalcul(page);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(dialogue.getByRole('alert')).toHaveText(
    'Un calcul est déjà en cours. Réessayez dans un instant.',
  );
  await expect(dialogue).toBeVisible();
});

test('E2E-67 avertissements reste_non_pose simulés : une ligne par avertissement, virgule décimale', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  const a = await projetPret(api, chef.id, '3C-67A');
  const b = await projetPret(api, chef.id, '3C-67B');
  await page.route('**/api/calcul', (route) =>
    route.fulfill({
      status: 200,
      json: {
        d0: D0_FIGE,
        horizon: '2030-01-06',
        projets: [a.projet.id, b.projet.id],
        ignores: [],
        lignes: 0,
        avertissements: [
          { code: 'reste_non_pose', assignation_id: a.assignation.id, reste: 1.5 },
          { code: 'reste_non_pose', assignation_id: b.assignation.id, reste: 0.25 },
        ],
      },
    }),
  );
  await loginAsAdmin(page);
  await page.goto(adresseGantt(a.projet.id));
  const dialogue = await ouvrirDialogueCalcul(page);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();

  await expect(dialogueCalcul(page)).toHaveCount(0);
  const avertissement = notification(page, 'non posé');
  await expect(avertissement).toBeVisible();
  await expect(avertissement).toContainText(`${a.nomActivite} — Ressource 3C-67A : 1,5 j non posé`);
  await expect(avertissement).toContainText(
    `${b.nomActivite} — Ressource 3C-67B : 0,25 j non posé`,
  );
});

test('E2E-68 le bouton du bandeau « Planning non calculé » ouvre le même dialogue', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  const a = await projetPret(api, chef.id, '3C-68');
  await loginAsAdmin(page);
  await page.goto(adresseGantt(a.projet.id));
  await expect(bandeauNonCalcule(page)).toBeVisible();
  await bandeauNonCalcule(page).getByRole('button', { name: 'Calculer', exact: true }).click();
  const dialogue = dialogueCalcul(page);
  await expect(dialogue).toBeVisible();
  expect(await etatsCases(dialogue)).toEqual([true]);
  await expect(dialogue.getByLabel('Date de début du calcul')).toHaveValue(D0_FIGE);
});
