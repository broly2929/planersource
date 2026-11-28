import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { appel, creerActeur } from './lot1-helpers.js';
import { creerActivite, creerAssignation, type Objet } from './lot1-t2-helpers.js';
import { creerMonde, empreinte, tache } from './lot2a-helpers.js';
import {
  activiteMan,
  apresMidi,
  ecrireSaisies,
  JANV,
  matin,
  poser,
  saisiesEnBase,
} from './lot2e-helpers.js';

/**
 * REX-3a (D-123 (8), SPEC §5.6 MAN « Règle de saisie ») : refus `jour_non_ouvre` du PUT des saisies,
 * route de lecture des jours non ouvrés. Janvier 2027 : le 04/01 est un lundi ; samedis 2, 9, 16, 23,
 * 30 ; dimanches 3, 10, 17, 24, 31. Calendrier par défaut : lundi à vendredi.
 */
const SAMEDI = '2027-01-09';
const DIMANCHE = '2027-01-10';
const MERCREDI = '2027-01-06';
const J05 = '2027-01-05';

/** Corps attendu d'un refus (SPEC §5.6 MAN). */
const refus = (assignationId: number, jour: string) => ({
  erreur: expect.any(String),
  code: 'jour_non_ouvre',
  assignation_id: assignationId,
  jour,
});

/** Insère une saisie directement en base (saisie « ancienne », hors règle de l'API). */
async function insererSaisie(ctx: TestCtx, assignationId: number, jour: string, demi: string) {
  await ctx.pool.query(
    'INSERT INTO saisie_manuelle (assignation_id, jour, demi_journee) VALUES ($1, $2, $3)',
    [assignationId, jour, demi],
  );
}

/** Jour férié du calendrier par défaut. */
async function ferieParDefaut(ctx: TestCtx, jour: string) {
  await ctx.pool.query(
    `INSERT INTO calendrier_ferie (calendrier_id, jour, libelle)
     SELECT id, $1, 'Férié' FROM calendrier WHERE est_defaut`,
    [jour],
  );
}

/** Calendrier propre à une ressource : jours ISO travaillés et fériés. */
async function calendrierPropre(
  ctx: TestCtx,
  ressourceId: number,
  jours: number[],
  feries: string[],
) {
  const { rows } = await ctx.pool.query<{ id: number }>(
    'INSERT INTO calendrier (nom, jours_travailles) VALUES ($1, $2) RETURNING id',
    [`Propre ${ressourceId}`, jours],
  );
  const id = rows[0]!.id;
  for (const jour of feries) {
    await ctx.pool.query(
      "INSERT INTO calendrier_ferie (calendrier_id, jour, libelle) VALUES ($1, $2, '')",
      [id, jour],
    );
  }
  await ctx.pool.query('UPDATE utilisateur SET calendrier_id = $1 WHERE id = $2', [
    id,
    ressourceId,
  ]);
}

describe('Saisies manuelles : jours non ouvrés (REX-3a, D-123 (8))', () => {
  const ctx = useTestApp();

  it('SAI-17 : saisie nouvelle un samedi ou un dimanche → 422 { erreur, code jour_non_ouvre, assignation_id, jour } ; base strictement inchangée', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const a = assignation.id;
    for (const jour of [SAMEDI, DIMANCHE]) {
      const avant = await empreinte(ctx);
      const res = await ecrireSaisies(ctx, m.chef, activite.id, JANV, {
        saisies: [matin(a, jour)],
      });
      expect(res.statusCode, `${jour} : ${res.body}`).toBe(422);
      expect(res.json()).toEqual(refus(a, jour));
      expect(await empreinte(ctx), `${jour} : base modifiée`).toEqual(avant);
      expect(await saisiesEnBase(ctx)).toEqual([]);
    }
  });

  it('SAI-18 : saisie nouvelle un jour férié du calendrier de la ressource → 422 jour_non_ouvre ; base inchangée', async () => {
    const m = await creerMonde(ctx);
    await ferieParDefaut(ctx, MERCREDI);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const avant = await empreinte(ctx);
    const res = await ecrireSaisies(ctx, m.chef, activite.id, JANV, {
      saisies: [apresMidi(assignation.id, MERCREDI)],
    });
    expect(res.statusCode, res.body).toBe(422);
    expect(res.json()).toEqual(refus(assignation.id, MERCREDI));
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('SAI-19 : le calendrier propre à chaque ressource décide : Alice (lundi à samedi, férié le 05/01) peut saisir le samedi mais pas le 05/01 ; Bob (calendrier par défaut) l’inverse ; base inchangée après chaque refus', async () => {
    const m = await creerMonde(ctx);
    await calendrierPropre(ctx, m.alice.id, [1, 2, 3, 4, 5, 6], [J05]);
    const { activite, assignation: a } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const b: Objet = await creerAssignation(ctx, m.chef, activite.id, m.bob.id, {
      charge_assignee: 2,
    });

    const refusee = async (saisies: unknown[], attendu: unknown, nom: string) => {
      const avant = await empreinte(ctx);
      const res = await ecrireSaisies(ctx, m.chef, activite.id, JANV, { saisies });
      expect(res.statusCode, `${nom} : ${res.body}`).toBe(422);
      expect(res.json(), nom).toEqual(attendu);
      expect(await empreinte(ctx), `${nom} : base modifiée`).toEqual(avant);
    };
    await refusee([matin(a.id, J05)], refus(a.id, J05), 'Alice, férié propre');
    await refusee([matin(b.id, SAMEDI)], refus(b.id, SAMEDI), 'Bob, samedi');

    const ok = await ecrireSaisies(ctx, m.chef, activite.id, JANV, {
      saisies: [matin(a.id, SAMEDI), matin(b.id, J05)],
    });
    expect(ok.statusCode, ok.body).toBe(200);
    expect(await saisiesEnBase(ctx)).toEqual(
      [matin(b.id, J05), matin(a.id, SAMEDI)].sort((x, y) => x.assignation_id - y.assignation_id),
    );
  });

  it('SAI-20 : saisies déjà en base sur un jour non ouvré (samedi, puis férié ajouté après coup) : renvoyées à l’identique → 200, conservées ; une demi-journée nouvelle le même samedi → 422, base inchangée', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const a = assignation.id;
    await insererSaisie(ctx, a, SAMEDI, 'matin');
    await poser(ctx, m.chef, activite.id, JANV, [matin(a, SAMEDI), matin(a, J05)]);
    const attendu = [matin(a, J05), matin(a, SAMEDI)];
    expect(await saisiesEnBase(ctx)).toEqual(attendu);

    const identique = await ecrireSaisies(ctx, m.chef, activite.id, JANV, {
      saisies: [matin(a, SAMEDI), matin(a, J05)],
    });
    expect(identique.statusCode, identique.body).toBe(200);
    expect(await saisiesEnBase(ctx)).toEqual(attendu);

    const avant = await empreinte(ctx);
    const nouvelle = await ecrireSaisies(ctx, m.chef, activite.id, JANV, {
      saisies: [matin(a, SAMEDI), apresMidi(a, SAMEDI), matin(a, J05)],
    });
    expect(nouvelle.statusCode, nouvelle.body).toBe(422);
    expect(nouvelle.json()).toEqual(refus(a, SAMEDI));
    expect(await empreinte(ctx)).toEqual(avant);

    // Calendrier modifié après coup : le 05/01 devient férié, la saisie existante reste acceptée.
    await ferieParDefaut(ctx, J05);
    const apres = await ecrireSaisies(ctx, m.chef, activite.id, JANV, {
      saisies: [matin(a, SAMEDI), matin(a, J05)],
    });
    expect(apres.statusCode, apres.body).toBe(200);
    expect(await saisiesEnBase(ctx)).toEqual(attendu);
  });

  it('SAI-21 : jours ouvrés (lundi à vendredi) → 200 ; les saisies sont écrites', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const a = assignation.id;
    const saisies = [matin(a, '2027-01-04'), apresMidi(a, '2027-01-04'), matin(a, '2027-01-08')];
    const res = await ecrireSaisies(ctx, m.chef, activite.id, JANV, { saisies });
    expect(res.statusCode, res.body).toBe(200);
    expect(await saisiesEnBase(ctx)).toEqual(saisies);
  });

  it('SAI-22 : un seul jour non ouvré dans le PUT refuse tout : les saisies ouvrées du même corps ne sont pas écrites, celles déjà en base sont conservées', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const a = assignation.id;
    await poser(ctx, m.chef, activite.id, JANV, [matin(a, '2027-01-07')]);
    const avant = await empreinte(ctx);
    const res = await ecrireSaisies(ctx, m.chef, activite.id, JANV, {
      saisies: [matin(a, J05), matin(a, SAMEDI), matin(a, '2027-01-07')],
    });
    expect(res.statusCode, res.body).toBe(422);
    expect(res.json()).toEqual(refus(a, SAMEDI));
    expect(await empreinte(ctx)).toEqual(avant);
    expect(await saisiesEnBase(ctx)).toEqual([matin(a, '2027-01-07')]);
  });

  it('SAI-25 : saisie ancienne d’un samedi (insérée en base) absente du PUT → 200, retirée de la base ; les autres saisies conservées (retirer n’est pas saisir)', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const a = assignation.id;
    await poser(ctx, m.chef, activite.id, JANV, [matin(a, J05), matin(a, '2027-01-07')]);
    await insererSaisie(ctx, a, SAMEDI, 'matin');
    await insererSaisie(ctx, a, SAMEDI, 'apres_midi');
    expect(await saisiesEnBase(ctx)).toHaveLength(4);
    const res = await ecrireSaisies(ctx, m.chef, activite.id, JANV, {
      saisies: [matin(a, J05), matin(a, '2027-01-07')],
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(await saisiesEnBase(ctx)).toEqual([matin(a, J05), matin(a, '2027-01-07')]);
  });

  it('SAI-26 : ordre des refus (D-124 (2)) : activité MAN close + samedi et assignation d’une autre activité + samedi → refus de SAI-9 (422 sans code) ; deux jours non ouvrés sur deux assignations → jour_non_ouvre avec le premier (assignation, jour) ; base inchangée après chaque refus', async () => {
    const m = await creerMonde(ctx);
    const close = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const patch = await appel(ctx, m.chef).patch(`/api/activites/${close.activite.id}`, {
      close: true,
    });
    expect(patch.statusCode).toBe(200);
    const autre = await activiteMan(ctx, m.chef, m.projet.id, m.bob.id, 1);
    const { activite, assignation: a } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const b: Objet = await creerAssignation(ctx, m.chef, activite.id, m.bob.id, {
      charge_assignee: 2,
    });

    const refuse = async (id: number, saisies: unknown[], nom: string) => {
      const avant = await empreinte(ctx);
      const res = await ecrireSaisies(ctx, m.chef, id, JANV, { saisies });
      expect(res.statusCode, `${nom} : ${res.body}`).toBe(422);
      expect((res.json() as { code?: string }).code, `${nom} : code`).toBeUndefined();
      expect(await empreinte(ctx), `${nom} : base modifiée`).toEqual(avant);
    };
    await refuse(close.activite.id, [matin(close.assignation.id, SAMEDI)], 'activité MAN close');
    await refuse(
      activite.id,
      [matin(autre.assignation.id, SAMEDI)],
      'assignation d’une autre activité',
    );

    // Plusieurs jours non ouvrés : le premier dans l'ordre (assignation, jour).
    const avant = await empreinte(ctx);
    const res = await ecrireSaisies(ctx, m.chef, activite.id, JANV, {
      saisies: [matin(b.id, SAMEDI), matin(a.id, DIMANCHE), matin(a.id, SAMEDI)],
    });
    expect(res.statusCode, res.body).toBe(422);
    expect(res.json()).toEqual(refus(a.id, SAMEDI));
    expect(await empreinte(ctx)).toEqual(avant);
  });
});

describe('Jours non ouvrés : GET /api/activites/:id/jours-non-ouvres (REX-3a, D-123 (8))', () => {
  const ctx = useTestApp();
  const url = (id: number | string, mois?: string) =>
    `/api/activites/${id}/jours-non-ouvres${mois === undefined ? '' : `?mois=${mois}`}`;

  it('SAI-23 : janvier 2027 → 200 { mois, jours_non_ouvres } : une entrée par assignation triée par id ; calendrier par défaut (week-ends et fériés du mois, pas ceux d’un autre mois) et calendrier propre ; activité sans assignation → liste vide', async () => {
    const m = await creerMonde(ctx);
    await ferieParDefaut(ctx, '2027-01-01');
    await ferieParDefaut(ctx, MERCREDI);
    await ferieParDefaut(ctx, '2027-02-01');
    await calendrierPropre(ctx, m.alice.id, [1, 2, 3, 4, 5, 6], [J05]);
    const { activite, assignation: a } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const b: Objet = await creerAssignation(ctx, m.chef, activite.id, m.bob.id, {
      charge_assignee: 2,
    });
    const avant = await empreinte(ctx);
    const res = await appel(ctx, m.chef).get(url(activite.id, JANV));
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({
      mois: JANV,
      jours_non_ouvres: [
        {
          assignation_id: a.id,
          jours: ['2027-01-03', J05, '2027-01-10', '2027-01-17', '2027-01-24', '2027-01-31'],
        },
        {
          assignation_id: b.id,
          jours: [
            '2027-01-01',
            '2027-01-02',
            '2027-01-03',
            MERCREDI,
            SAMEDI,
            DIMANCHE,
            '2027-01-16',
            '2027-01-17',
            '2027-01-23',
            '2027-01-24',
            '2027-01-30',
            '2027-01-31',
          ],
        },
      ],
    });
    expect(a.id).toBeLessThan(b.id);
    expect(await empreinte(ctx)).toEqual(avant);

    const sans = await creerActivite(ctx, m.chef, m.projet.id, { mode: 'MAN' });
    const resVide = await appel(ctx, m.chef).get(url(sans.id, JANV));
    expect(resVide.statusCode, resVide.body).toBe(200);
    expect(resVide.json()).toEqual({ mois: JANV, jours_non_ouvres: [] });
  });

  it('SAI-24-r2 : droits et refus comme GET …/saisies : administrateur, chef et chef d’un autre projet 200 ; sans session 401 ; activité inconnue, ressource affectée, ressource non affectée 404 ; mois absent ou invalide 400 ; la route n’écrit rien', async () => {
    const m = await creerMonde(ctx);
    const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
    const { activite } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const avant = await empreinte(ctx);
    for (const [nom, qui] of [
      ['administrateur', m.admin],
      ['chef', m.chef],
      // Révision D-265 (4) : le chef d'un autre projet lit le projet.
      ['chef d’un autre projet', m.autreChef],
    ] as const) {
      const res = await appel(ctx, qui).get(url(activite.id, JANV));
      expect(res.statusCode, nom).toBe(200);
    }
    expect((await appel(ctx).get(url(activite.id, JANV))).statusCode, 'sans session').toBe(401);
    expect((await appel(ctx, m.admin).get(url(999999, JANV))).statusCode, 'inconnue').toBe(404);
    // Révision 6b (D-031, D-148 (2)) : la ressource affectée reçoit 404.
    for (const [nom, qui] of [
      ['ressource affectée', m.alice],
      ['ressource non affectée', carole],
    ] as const) {
      expect((await appel(ctx, qui).get(url(activite.id, JANV))).statusCode, nom).toBe(404);
    }
    for (const mois of [undefined, '2027-13', 'abc', '1999-12']) {
      const res = await appel(ctx, m.chef).get(url(activite.id, mois));
      expect(res.statusCode, `mois ${mois}`).toBe(400);
    }
    expect(await empreinte(ctx)).toEqual(avant);
    // Activité non MAN : 200, comme GET …/saisies (D-124 (3)).
    const asap = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const res = await appel(ctx, m.chef).get(url(asap.activite.id, JANV));
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({
      mois: JANV,
      jours_non_ouvres: [
        {
          assignation_id: asap.assignation.id,
          jours: [
            '2027-01-02',
            '2027-01-03',
            SAMEDI,
            DIMANCHE,
            '2027-01-16',
            '2027-01-17',
            '2027-01-23',
            '2027-01-24',
            '2027-01-30',
            '2027-01-31',
          ],
        },
      ],
    });
  });
});
