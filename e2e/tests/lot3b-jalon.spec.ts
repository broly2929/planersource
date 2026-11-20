import { expect, test } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { calculer, activiteAvec, jalonAvec, lier, monde3b } from './lot3b-helpers.js';

/* D-068 : un jalon en retard porte le suffixe « , retard » dans son nom accessible. */
test('E2E-40 : jalon en retard nommé « …, retard » ; jalon à l’heure sans suffixe', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E40', ['Bob']);
  const p = m.projet.id;
  const pred = await activiteAvec(request, p, 'Prédécesseur');
  await m.api.assignation(pred.id, m.gens.Bob!.id, 5);
  const enRetard = await jalonAvec(request, p, 'Jalon JAL-2', {
    type: 'fixe',
    date_validee: '2027-01-06',
  });
  await lier(request, p, pred.id, enRetard.id);
  await jalonAvec(request, p, 'Jalon libre', { type: 'fixe', date_validee: '2027-01-06' });
  await calculer(request, [p]);
  await page.clock.setFixedTime('2027-01-06T10:00:00');
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${p}?onglet=gantt`);

  await expect(
    page.getByRole('img', { name: 'Jalon JAL-2, le 06/01/2027, retard', exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('img', { name: 'Jalon libre, le 06/01/2027', exact: true }),
  ).toHaveCount(1);
});
