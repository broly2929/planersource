// Lot accueil-sans-bandeau (D-252) : E2E-677. Plus de ligne « Connecté en tant que … » sur l'Accueil ;
// le nom de l'utilisateur reste dans le pied de la barre latérale. Base « administrateur seul » avant et après.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';

test.beforeEach(remettreAdminSeul6b);
test.afterEach(remettreAdminSeul6b);

async function verifierAccueil(page: Page, nom: string): Promise<void> {
  await expect(
    page.getByRole('region', { name: 'Tableau du Gantt global', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Connecté en tant que')).toHaveCount(0);
  await expect(page.locator('aside').getByText(nom, { exact: true })).toBeVisible();
}

test('E2E-677 : Accueil sans « Connecté en tant que », nom dans le pied de la barre latérale, Gantt présent (administrateur, chef de projet)', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = (await (await request.get('/api/auth/me')).json()) as { id: number; nom: string };
  await api.projet('R-677', 'Projet 677', admin.id);
  const email = 'chef-677@accueil-sans-bandeau.test';
  const chef = await api.utilisateur('Chef 677', email, 'chef_de_projet', false);
  await api.projet('R-678', 'Projet 678', chef.id);

  await loginAsAdmin(page);
  await verifierAccueil(page, admin.nom);

  await page.context().clearCookies();
  await connecterAvec(page, email);
  await verifierAccueil(page, 'Chef 677');
});
