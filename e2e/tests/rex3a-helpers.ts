// Aides de REX-3a (D-123) : saisies anciennes insérées en base (l'API refuse désormais une saisie nouvelle
// sur un jour non ouvré), calendrier propre à une ressource.
import { expect, type APIRequestContext } from '@playwright/test';
import pg from 'pg';
import { preparer } from './lot1-helpers.js';

/** Insère des saisies directement en base (saisie « ancienne », D-123 (8)). Refuse toute base hors *_test. */
export async function insererSaisies(
  saisies: { assignation_id: number; jour: string; demi_journee: 'matin' | 'apres_midi' }[],
): Promise<void> {
  const url = process.env.TEST_DATABASE_URL ?? '';
  if (!url || !new URL(url).pathname.slice(1).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL doit désigner une base dont le nom finit par _test');
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const s of saisies) {
      await client.query(
        'INSERT INTO saisie_manuelle (assignation_id, jour, demi_journee) VALUES ($1, $2, $3)',
        [s.assignation_id, s.jour, s.demi_journee],
      );
    }
  } finally {
    await client.end();
  }
}

/** Les deux demi-journées d'un jour. */
export const journeeEntiere = (assignationId: number, jour: string) =>
  (['matin', 'apres_midi'] as const).map((demi_journee) => ({
    assignation_id: assignationId,
    jour,
    demi_journee,
  }));

/** Donne à une ressource un calendrier propre (lundi à vendredi par défaut) avec des jours fériés. */
export async function calendrierPropre(
  request: APIRequestContext,
  ressourceId: number,
  nom: string,
  feries: string[],
): Promise<void> {
  const api = await preparer(request);
  const calendrier = await api.calendrier(nom);
  for (const jour of feries) await api.ferie(calendrier.id, jour, 'Férié');
  const r = await request.fetch(`/api/utilisateurs/${ressourceId}`, {
    method: 'PATCH',
    data: { calendrier_id: calendrier.id },
  });
  expect(r.ok(), `PATCH calendrier : ${r.status()} ${await r.text()}`).toBeTruthy();
}
