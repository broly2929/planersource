// Aides du lot recette-auto (D-204). Données par l'API, calendrier propre (D-204 (4), D-163 (3)).
import { expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';
import { agirApi, imputerApi, sessionDe, SP, jS } from './lot4b-helpers.js';
import { monde4c } from './lot4c-helpers.js';

/** Semaine précédente : lundi 05/01/2026 ; jours 5 et 6. */
export { SP };

/** Ressource `email` impute 1 j sur `assignation` pour la semaine `semaine`, puis soumet. Renvoie l'id. */
export async function soumettreSemaine(
  playwright: PlaywrightWorkerArgs['playwright'],
  email: string,
  semaine: string,
  assignation: number | number[],
  jour: string,
  charge = 1,
): Promise<number> {
  const ctx = await sessionDe(playwright, email);
  const ids = Array.isArray(assignation) ? assignation : [assignation];
  const f = await imputerApi(
    ctx,
    semaine,
    ids.map((id) => ({ assignation_id: id, imputations: [{ jour, charge }] })),
  );
  await agirApi(ctx, f.feuille.id!, 'soumettre');
  return f.feuille.id!;
}

export const JOUR_SP = jS(5);

/** Rattache un utilisateur à un calendrier propre (lundi à vendredi, aucun férié). */
export async function calendrierPropre(
  request: APIRequestContext,
  api: { calendrier: (nom: string) => Promise<{ id: number }> },
  utilisateurId: number,
  nom: string,
): Promise<number> {
  const c = await api.calendrier(nom);
  const r = await request.patch(`/api/utilisateurs/${utilisateurId}`, {
    data: { calendrier_id: c.id },
  });
  expect(r.ok(), `PATCH calendrier : ${r.status()}`).toBeTruthy();
  return c.id;
}

export { monde4c };
