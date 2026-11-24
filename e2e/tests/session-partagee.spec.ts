import { existsSync, readFileSync } from 'node:fs';
import { expect, request, test, type Browser, type Page } from '@playwright/test';
import { ETAT_ADMIN as ETAT } from '../etat-session.js';
import { URL_WEB } from '../pile-worker.js';
import { loginAsAdmin } from './helpers.js';

// Session partagée de l'administrateur (D-194 (4)) : E2E-460-r1 à E2E-463. L'état est écrit par le
// global-setup dans l'état de session du worker (D-199 (5)) et réécrit par loginAsAdmin si une spec
// l'a révoqué.

/** Nombre de POST /api/auth/login émis par la page (connexion par l'écran). */
function compteur(page: Page): () => number {
  let n = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/auth/login') n += 1;
  });
  return () => n;
}

/** Appelle loginAsAdmin sur un contexte neuf et rend le nombre de connexions par l'écran. */
async function connexionsPourUnAppel(browser: Browser): Promise<number> {
  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    const connexions = compteur(page);
    await loginAsAdmin(page);
    return connexions();
  } finally {
    await ctx.close();
  }
}

// E2E-460-r1 (D-199 (12), D-031) : état de session et front du worker au lieu du chemin et du port fixes.
test('E2E-460-r1 : après loginAsAdmin, l’état de session du worker existe, porte le cookie de session et ouvre une session valide', async ({
  page,
}) => {
  await loginAsAdmin(page);
  expect(existsSync(ETAT), `${ETAT} absent`).toBe(true);
  const etat = JSON.parse(readFileSync(ETAT, 'utf8')) as { cookies: { name: string }[] };
  expect(etat.cookies.some((c) => c.name === 'session')).toBe(true);
  const api = await request.newContext({ baseURL: URL_WEB, storageState: ETAT });
  const r = await api.get('/api/auth/me');
  expect(r.status()).toBe(200);
  expect(((await r.json()) as { role: string }).role).toBe('administrateur');
  await api.dispose();
});

test('E2E-461 : loginAsAdmin réutilise l’état, aucune connexion par l’écran, arrivée sur « / »', async ({
  page,
  browser,
}) => {
  await loginAsAdmin(page); // garantit un état valide (repli éventuel d'une spec précédente)
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const connexions = compteur(p);
  await loginAsAdmin(p);
  expect(connexions()).toBe(0);
  await expect(p).toHaveURL('/');
  await expect(p.getByRole('link', { name: 'Accueil', exact: true })).toBeVisible();
  await ctx.close();
});

test('E2E-462 : session partagée révoquée par une déconnexion, repli sur l’écran puis état réécrit', async ({
  page,
  browser,
}) => {
  await loginAsAdmin(page);
  await page.getByRole('button', { name: 'Se déconnecter' }).click(); // révoque la session partagée
  await expect(page).toHaveURL(/\/connexion$/);
  expect(await connexionsPourUnAppel(browser)).toBe(1); // repli : connexion par l'écran
  expect(await connexionsPourUnAppel(browser)).toBe(0); // l'état réécrit est valide
});

test('E2E-463 : E2E_CONNEXION_ECRAN=1 force la connexion par l’écran, sans la variable aucune', async ({
  page,
  browser,
}) => {
  await loginAsAdmin(page);
  expect(await connexionsPourUnAppel(browser)).toBe(0);
  process.env.E2E_CONNEXION_ECRAN = '1';
  try {
    expect(await connexionsPourUnAppel(browser)).toBe(1);
  } finally {
    delete process.env.E2E_CONNEXION_ECRAN;
  }
  expect(await connexionsPourUnAppel(browser)).toBe(0);
});
