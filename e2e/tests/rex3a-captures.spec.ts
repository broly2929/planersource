// Captures de REX-3a (E2E-255, relecture d'apparence), sans assertion fonctionnelle : e2e/captures/
// rex3a-{planning,dialogue,gantt,manuel}-{1440,1024}.png.
import { expect, test, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { cheminCapture } from './captures.js';
import { libelleCase, monde } from './lot2e-helpers.js';
import { activiteAvec, calculer, jalonAvec, monde3b, sousProjet } from './lot3b-helpers.js';
import { calendrierPropre, insererSaisies, journeeEntiere } from './rex3a-helpers.js';

const LARGEURS = [1440, 1024];

// Champs de date au format français (D-127 (2)).
test.use({
  locale: 'fr-FR',
  launchOptions: {
    args: ['--lang=fr-FR'],
    env: { ...process.env, LANG: 'fr_FR.UTF-8', LANGUAGE: 'fr' },
  },
});

async function photographier(page: Page, nom: string) {
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 700 });
    await page.screenshot({ path: cheminCapture(`rex3a-${nom}-${largeur}.png`) });
  }
}

test('E2E-255 : captures de REX-3a (sans assertion fonctionnelle)', async ({ page, request }) => {
  const m = await monde3b(request, 'E2E255', ['Alice', 'Bob']);
  const tache = await activiteAvec(request, m.projet.id, 'Tâche 255');
  await m.api.assignation(tache.id, m.gens.Alice!.id, 2);
  await activiteAvec(request, m.projet.id, 'Bravo 255');
  const phase = await activiteAvec(request, m.projet.id, 'Phase 255');
  await activiteAvec(request, m.projet.id, 'Fille 255', { parent_id: phase.id });
  await jalonAvec(request, m.projet.id, 'Jalon 255');
  const modes: [string, Record<string, unknown>][] = [
    ['START', { debut_valide: '2027-01-11' }],
    ['ALAP', { fin_valide: '2027-01-29' }],
    ['MAN', {}],
  ];
  for (const [mode, champs] of modes) {
    await activiteAvec(request, m.projet.id, `Mode ${mode} 255`, { mode, ...champs });
  }
  await sousProjet(request, m.projet.id, 'SP-255', 'Sous-projet 255', m.chef.id);
  await connecterAvec(page, m.emailChef);

  // Onglet Planning, ligne déplacée surlignée (data-deplacee, 2 s).
  await page.goto(`/projets/${m.projet.id}`);
  await page.getByRole('button', { name: 'Monter Bravo 255', exact: true }).click();
  await expect(page.locator('tr[data-deplacee]')).toHaveCount(1);
  await photographier(page, 'planning');

  // Dialogue de modification : liste « Mode de planification » et aide.
  await page.reload();
  await page.getByRole('button', { name: 'Modifier Tâche 255', exact: true }).click();
  const dialogue = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await dialogue.getByLabel('Mode de planification', { exact: true }).selectOption('STARR');
  await photographier(page, 'dialogue');

  // Gantt du projet, planning calculé pour que les barres soient dessinées (D-127 (2)).
  await calculer(request, [m.projet.id]);
  await page.goto(`/projets/${m.projet.id}?onglet=gantt`);
  await expect(
    page.getByRole('columnheader', { name: 'Planification', exact: true }),
  ).toBeVisible();
  await photographier(page, 'gantt');

  // Planning manuel : week-end et férié grisés, saisie ancienne du samedi cochée.
  const p = await monde(request, 'E2E255M');
  await calendrierPropre(request, p.alice.id, 'Calendrier E2E255', ['2027-01-06']);
  await insererSaisies([
    ...journeeEntiere(p.assignation.id, '2027-01-09'),
    { assignation_id: p.assignation.id, jour: '2027-01-05', demi_journee: 'matin' },
  ]);
  await page.context().clearCookies();
  await connecterAvec(page, p.emailChef);
  await page.goto(`/projets/${p.projet.id}/planning-manuel/${p.man.id}?mois=2027-01`);
  await expect(
    page.getByRole('checkbox', { name: libelleCase(p.nomAlice, 9, 'janvier', 'matin') }),
  ).toBeChecked();
  await photographier(page, 'manuel');
});
