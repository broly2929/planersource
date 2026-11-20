import { test, type APIRequestContext } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activite, poserSaisies } from './lot2e-helpers.js';
import { activiteAvec, calculer, jalonAvec, lier, monde3b, sousProjet } from './lot3b-helpers.js';
import { cheminCapture } from './captures.js';

/*
 * Captures du Gantt (lot 3b), sans assertion : e2e/captures/gantt-*.png, 1440 et 1024 px, zooms jour,
 * semaine, mois, et état non calculé. Montage : celui d'E2E-35 (retard, dépendance non respectée, début non
 * respecté) plus un parent et un sous-projet.
 */
const J06 = '2027-01-06T10:00:00';
const LARGEURS = [1440, 1024];
const ZOOMS = ['jour', 'semaine', 'mois'];

async function montage(request: APIRequestContext) {
  const m = await monde3b(request, 'CAP', ['Alice', 'Bob', 'Carole', 'Dave', 'Eve']);
  const p = m.projet.id;
  const g = m.gens;
  const alap = await activiteAvec(request, p, 'ALAP-3', { mode: 'ALAP', fin_valide: '2027-01-06' });
  await m.api.assignation(alap.id, g.Alice!.id, 5);
  const pred = await activiteAvec(request, p, 'Prédécesseur');
  await m.api.assignation(pred.id, g.Bob!.id, 5);
  const jalon = await jalonAvec(request, p, 'Jalon JAL-2', {
    type: 'fixe',
    date_validee: '2027-01-06',
  });
  await lier(request, p, pred.id, jalon.id);
  const a = await activiteAvec(request, p, 'Amont');
  await m.api.assignation(a.id, g.Carole!.id, 3);
  const man = await activite(request, p, 'Manuelle', 'MAN');
  const assignMan = await m.api.assignation(man.id, g.Dave!.id, 1);
  await lier(request, p, a.id, man.id);
  await poserSaisies(request, man.id, '2027-01', [
    { assignation_id: assignMan.id, jour: '2027-01-05', demi_journee: 'matin' },
    { assignation_id: assignMan.id, jour: '2027-01-05', demi_journee: 'apres_midi' },
  ]);
  const starr = await activiteAvec(request, p, 'STARR-3', {
    mode: 'STARR',
    debut_valide: '2027-01-06',
  });
  await m.api.assignation(starr.id, g.Eve!.id, 2);
  const manEve = await activite(request, p, 'Manuelle Eve', 'MAN');
  const assignEve = await m.api.assignation(manEve.id, g.Eve!.id, 1);
  await poserSaisies(request, manEve.id, '2027-01', [
    { assignation_id: assignEve.id, jour: '2027-01-06', demi_journee: 'matin' },
    { assignation_id: assignEve.id, jour: '2027-01-06', demi_journee: 'apres_midi' },
  ]);
  const groupe = await activiteAvec(request, p, 'Groupe');
  const f1 = await activiteAvec(request, p, 'Fille 1', { parent_id: groupe.id });
  const f2 = await activiteAvec(request, p, 'Fille 2', { parent_id: groupe.id });
  await m.api.assignation(f1.id, g.Alice!.id, 2);
  await m.api.assignation(f2.id, g.Bob!.id, 1);
  await lier(request, p, f1.id, f2.id, 'DD');
  const sp = await sousProjet(request, p, 'P1-CAP', 'Sous-projet de démonstration', m.chef.id);
  await m.api.affectation(sp.id, g.Carole!.id);
  const c = await activiteAvec(request, sp.id, 'C');
  await m.api.assignation(c.id, g.Carole!.id, 3);
  return m;
}

test('captures du Gantt : calculé (trois zooms) puis non calculé', async ({ page, request }) => {
  const m = await montage(request);
  const vide = await m.api.projet('P-CAPV', 'Projet non calculé', m.chef.id);
  const b = await activiteAvec(request, vide.id, 'Activité sans date');
  await m.api.affectation(vide.id, m.gens.Alice!.id);
  await m.api.assignation(b.id, m.gens.Alice!.id, 2);
  await page.clock.setFixedTime(J06);
  await connecterAvec(page, m.emailChef);
  await calculer(request, [m.projet.id]);

  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 800 });
    for (const zoom of ZOOMS) {
      await page.goto(`/projets/${m.projet.id}?onglet=gantt&zoom=${zoom}`);
      await page.locator('svg[data-zoom]').waitFor();
      await page.screenshot({ path: cheminCapture(`gantt-${zoom}-${largeur}.png`) });
    }
    await page.goto(`/projets/${vide.id}?onglet=gantt`);
    await page.getByText('Planning non calculé').waitFor();
    await page.screenshot({ path: cheminCapture(`gantt-non-calcule-${largeur}.png`) });
  }
});
