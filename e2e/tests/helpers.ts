import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, type BrowserContext, type Page } from '@playwright/test';
import { ETAT_ADMIN } from '../etat-session.js';
import { E2E_ADMIN } from './credentials.js';

async function connexionParEcran(page: Page): Promise<void> {
  await page.goto('/connexion');
  await page.getByLabel('Identifiant').fill(E2E_ADMIN.email);
  await page.getByLabel('Mot de passe').fill(E2E_ADMIN.motDePasse);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL('/');
}

/**
 * Connecte l'administrateur. D'abord par la session partagée du global-setup (D-194 (4)) : le cookie
 * est posé puis « / » est ouvert. Si la session a été révoquée (déconnexion, changement de mot de passe
 * ou de rôle par une spec), repli sur la connexion par l'écran, puis l'état est réécrit.
 * `E2E_CONNEXION_ECRAN=1` force la connexion par l'écran, sans toucher à l'état.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const forcee = process.env.E2E_CONNEXION_ECRAN === '1';
  if (!forcee && existsSync(ETAT_ADMIN)) {
    const etat = JSON.parse(readFileSync(ETAT_ADMIN, 'utf8')) as {
      cookies: Parameters<BrowserContext['addCookies']>[0];
    };
    await page.context().addCookies(etat.cookies);
    await page.goto('/');
    const accueil = page.getByRole('link', { name: 'Accueil', exact: true });
    await accueil.or(page.getByLabel('Identifiant')).first().waitFor();
    if (await accueil.isVisible()) {
      await expect(page).toHaveURL('/');
      return;
    }
  }
  await connexionParEcran(page);
  if (!forcee) {
    mkdirSync(dirname(ETAT_ADMIN), { recursive: true });
    await page.context().storageState({ path: ETAT_ADMIN });
  }
}
