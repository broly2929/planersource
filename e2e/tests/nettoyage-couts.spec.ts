// Lot nettoyage-couts (D-233 (d) ; SPEC §12.2) : E2E-641. Base « administrateur seul » avant et après chaque test.
// Données préparées par l'API ; changement de « Projet parent » fait par l'écran, aide d'héritage relue avant
// l'enregistrement, effet relu par l'API et par la colonne « OTP » du Gantt (écran consommateur : dialogue rouvert).
// Contrat de l'écran (phase verte) : dans « Modifier le projet », sans OTP propre, l'aide « Hérité de <code> : <otp> »
// suit la valeur de la liste « Projet parent » ; « Aucun (projet racine) » : pas d'aide.
import { expect, test, type APIRequestContext, type Locator } from '@playwright/test';
import { preparer } from './lot1-helpers.js';
import { sousProjet } from './lot3b-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';
import { loginAsAdmin } from './helpers.js';

test.beforeEach(remettreAdminSeul6b);
test.afterEach(remettreAdminSeul6b);

const champOtp = (d: Locator) => d.getByLabel('OTP', { exact: true });
const ouvrirModification = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Modifier le projet' }).click();

async function patcher(request: APIRequestContext, chemin: string, corps: Record<string, unknown>) {
  const r = await request.fetch(chemin, { method: 'PATCH', data: corps });
  expect(r.ok(), `PATCH ${chemin} : ${r.status()} ${await r.text()}`).toBeTruthy();
}

test('E2E-641 : « Modifier le projet » : l’aide d’héritage de l’OTP suit « Projet parent » avant l’enregistrement', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const me = (await (await request.get('/api/auth/me')).json()) as { id: number };
  const a = await api.projet('PA641', 'Parent A 641', me.id);
  await patcher(request, `/api/projets/${a.id}`, { otp: 'FIN-A641' });
  const g = await api.projet('PG641', 'Grand-parent 641', me.id);
  await patcher(request, `/api/projets/${g.id}`, { otp: 'FIN-G641' });
  await sousProjet(request, g.id, 'PB641', 'Parent B 641', me.id);
  const x = await api.projet('PX641', 'Projet X 641', me.id);

  await loginAsAdmin(page);
  await page.goto(`/projets/${x.id}`);
  await ouvrirModification(page);
  const m = page.getByRole('dialog', { name: 'Modifier le projet' });
  await expect(champOtp(m)).toHaveValue('');
  await expect(m.getByText(/^Hérité/)).toHaveCount(0);

  // Changement de parent sans enregistrer : l'aide suit.
  await m.getByLabel('Projet parent').selectOption({ label: 'PA641 — Parent A 641' });
  await expect(m.getByText('Hérité de PA641 : FIN-A641')).toBeVisible();
  await m.getByLabel('Projet parent').selectOption({ label: 'PB641 — Parent B 641' });
  await expect(m.getByText('Hérité de PG641 : FIN-G641')).toBeVisible();
  await expect(m.getByText('Hérité de PA641 : FIN-A641')).toHaveCount(0);
  await m.getByLabel('Projet parent').selectOption({ label: 'Aucun (projet racine)' });
  await expect(m.getByText(/^Hérité/)).toHaveCount(0);

  // Une valeur propre saisie masque l'aide, quel que soit le parent choisi.
  await m.getByLabel('Projet parent').selectOption({ label: 'PA641 — Parent A 641' });
  await champOtp(m).fill('PROPRE-641');
  await expect(m.getByText(/^Hérité/)).toHaveCount(0);
  await champOtp(m).fill('');
  await expect(m.getByText('Hérité de PA641 : FIN-A641')).toBeVisible();

  // Enregistrement, puis relecture par l’API et par le dialogue rouvert.
  await m.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(m).toBeHidden();
  const lu = (await (await request.get(`/api/projets/${x.id}`)).json()) as {
    otp: string | null;
    otp_effectif: string | null;
    parent_id: number | null;
  };
  expect(lu.parent_id).toBe(a.id);
  expect(lu.otp).toBeNull();
  expect(lu.otp_effectif).toBe('FIN-A641');
  await page.reload();
  await ouvrirModification(page);
  const r = page.getByRole('dialog', { name: 'Modifier le projet' });
  await expect(r.getByText('Hérité de PA641 : FIN-A641')).toBeVisible();
});
