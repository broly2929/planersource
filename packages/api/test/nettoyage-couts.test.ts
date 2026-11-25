// Lot nettoyage-couts (D-233) : NCO-1 à NCO-8. Valeurs attendues recopiées de SPEC §12.1, §12.2 et de la
// migration 015 ; ordre des refus d'écriture de taux : 401, 403, 404, 400, 422, 409 (SPEC §12.1).
import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { appel, corps, creerActeur, creerProjet, type Acteur, type Corps } from './lot1-helpers.js';
import { creerActivite } from './lot1-t2-helpers.js';
import { empreinte } from './lot2a-helpers.js';

/** Code d'erreur PostgreSQL d'une requête SQL directe, null si elle réussit. */
async function codeSql(ctx: TestCtx, sql: string, params: unknown[] = []): Promise<string | null> {
  try {
    await ctx.pool.query(sql, params);
    return null;
  } catch (err) {
    return (err as { code?: string }).code ?? 'inconnu';
  }
}

/** Écriture SQL refusée avec le code attendu, base inchangée. */
async function refusSql(
  ctx: TestCtx,
  sql: string,
  params: unknown[],
  code: string,
  libelle: string,
): Promise<void> {
  const avant = await empreinte(ctx);
  expect(await codeSql(ctx, sql, params), libelle).toBe(code);
  expect(await empreinte(ctx), `base modifiée par le refus ${libelle}`).toEqual(avant);
}

async function ressource(ctx: TestCtx, email = 'alice@example.test'): Promise<Acteur> {
  return creerActeur(ctx, email, 'ressource', true);
}

const INSERT_TAUX =
  'INSERT INTO taux_journalier (utilisateur_id, debut, fin, montant) VALUES ($1, $2, $3, $4)';
const urlTaux = (id: number) => `/api/utilisateurs/${id}/taux`;

describe('Lot nettoyage-couts : copie et OTP (SPEC §12.2, D-233 (a))', () => {
  const ctx = useTestApp();

  it('NCO-1 : la réponse de POST /copie porte otp_effectif et otp_source, égaux à ceux du GET de la copie', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const parent = await creerProjet(ctx, admin, { code: 'PAR', otp: 'FIN-PAR' });
    const propre = await creerProjet(ctx, admin, { code: 'PRO', otp: 'FIN-PRO' });
    const enfant = await creerProjet(ctx, admin, { code: 'ENF', parent_id: parent.id });
    const resModele = await appel(ctx, admin).post('/api/modeles', {
      code: 'MOD',
      nom: 'Modèle',
      date_debut: '2027-01-04',
      otp: 'FIN-MOD',
    });
    expect(resModele.statusCode, resModele.body).toBe(201);
    const modele = corps(resModele) as Corps & { id: number };
    const cas = [
      { source: propre.id, code: 'C1', modele: false },
      { source: enfant.id, code: 'C2', modele: false },
      { source: modele.id, code: 'C3', modele: true },
    ];
    for (const c of cas) {
      const res = await appel(ctx, admin).post(`/api/projets/${c.source}/copie`, {
        nom: `Copie ${c.code}`,
        code: c.code,
        date_debut: '2027-02-01',
        est_modele: c.modele,
      });
      expect(res.statusCode, res.body).toBe(201);
      const reponse = corps(res);
      const lu = corps(await appel(ctx, admin).get(`/api/projets/${reponse.id}`));
      expect(reponse.otp_effectif, c.code).toEqual(lu.otp_effectif);
      expect(reponse.otp_source, c.code).toEqual(lu.otp_source);
      expect(lu.otp_effectif, c.code).not.toBeUndefined();
    }
    // PRO et sa copie : OTP propre conservé.
    const c1 = await ctx.pool.query("SELECT id FROM projet WHERE code = 'C1'");
    const lu1 = corps(await appel(ctx, admin).get(`/api/projets/${c1.rows[0].id}`));
    expect(lu1.otp).toBe('FIN-PRO');
    expect(lu1.otp_effectif).toBe('FIN-PRO');
  });
});

describe('Lot nettoyage-couts : CHECK de la migration 015 (D-233 (b))', () => {
  const ctx = useTestApp();

  it('NCO-2 : taux_montant_positif : montant 0 et -1 refusés (23514), 0,01 accepté', async () => {
    const alice = await ressource(ctx);
    for (const m of [0, -1]) {
      await refusSql(ctx, INSERT_TAUX, [alice.id, '2027-01-01', null, m], '23514', `montant ${m}`);
    }
    expect(await codeSql(ctx, INSERT_TAUX, [alice.id, '2027-01-01', null, 0.01])).toBeNull();
  });

  it('NCO-3 : montant borné par numeric(8, 2) : 1000000 refusé (22003, pas un CHECK), 999999,99 accepté', async () => {
    const alice = await ressource(ctx);
    await refusSql(
      ctx,
      INSERT_TAUX,
      [alice.id, '2027-01-01', null, 1000000],
      '22003',
      'montant 1000000',
    );
    expect(await codeSql(ctx, INSERT_TAUX, [alice.id, '2027-01-01', null, 999999.99])).toBeNull();
  });

  it('NCO-4 : taux_fin_apres_debut : fin < début refusée (23514) ; fin = début et fin nulle acceptées', async () => {
    const alice = await ressource(ctx);
    await refusSql(
      ctx,
      INSERT_TAUX,
      [alice.id, '2027-01-02', '2027-01-01', 5],
      '23514',
      'fin < début',
    );
    expect(await codeSql(ctx, INSERT_TAUX, [alice.id, '2027-01-02', '2027-01-02', 5])).toBeNull();
    expect(await codeSql(ctx, INSERT_TAUX, [alice.id, '2027-02-01', null, 5])).toBeNull();
  });

  it('NCO-5 : projet_otp_longueur et activite_otp_longueur : vide et 51 caractères refusés (23514), 1 et 50 acceptés', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const projet = await creerProjet(ctx, admin);
    const a = await creerActivite(ctx, admin, projet.id, { nom: 'A' });
    for (const [table, id] of [
      ['projet', projet.id],
      ['activite', a.id as number],
    ] as const) {
      const maj = `UPDATE ${table} SET otp = $1 WHERE id = $2`;
      for (const valeur of ['', 'A'.repeat(51)]) {
        await refusSql(
          ctx,
          maj,
          [valeur, id],
          '23514',
          `${table} otp de ${valeur.length} caractères`,
        );
      }
      for (const valeur of ['A', 'A'.repeat(50)]) {
        expect(await codeSql(ctx, maj, [valeur, id]), `${table} ${valeur.length}`).toBeNull();
      }
    }
  });

  it('NCO-6 : historique_entite_check : entité « taux » acceptée, entité inconnue refusée (23514)', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const insertion = `INSERT INTO historique (utilisateur_id, entite, entite_id, operation)
                       VALUES ($2, $1, 1, 'creation')`;
    await refusSql(ctx, insertion, ['inconnue', admin.id], '23514', 'entité inconnue');
    expect(await codeSql(ctx, insertion, ['taux', admin.id])).toBeNull();
  });
});

describe('Lot nettoyage-couts : ordre des refus des écritures de taux (D-233 (c))', () => {
  const ctx = useTestApp();

  async function monde() {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await ressource(ctx);
    const nonRessource = await creerActeur(ctx, 'nr@example.test', 'chef_de_projet');
    const existant = await appel(ctx, admin).post(urlTaux(alice.id), {
      debut: '2027-01-01',
      fin: '2027-12-31',
      montant: 600,
    });
    expect(existant.statusCode, existant.body).toBe(201);
    const suivant = await appel(ctx, admin).post(urlTaux(alice.id), {
      debut: '2028-01-01',
      montant: 700,
    });
    expect(suivant.statusCode, suivant.body).toBe(201);
    return { admin, alice, nonRessource, suivant: corps(suivant).id as number };
  }

  async function envoyer(
    envoi: () => ReturnType<ReturnType<typeof appel>['get']>,
    statut: number,
    libelle: string,
  ): Promise<void> {
    const avant = await empreinte(ctx);
    const res = await envoi();
    expect(res.statusCode, `${libelle} ${res.body}`).toBe(statut);
    expect(await empreinte(ctx), `base modifiée par le refus ${libelle}`).toEqual(avant);
  }

  // Défauts : (I) corps invalide (400), (D) fin < début (422), (C) chevauchement (409).
  it('NCO-7 : POST à deux défauts : 400 avant 422, 400 avant 409, 422 avant 409', async () => {
    const m = await monde();
    const post = (champs: Corps, qui: Acteur = m.alice) =>
      appel(ctx, m.admin).post(urlTaux(qui.id), champs);
    await envoyer(() => post({ debut: '2027-06-01', fin: '2027-05-01', montant: 0 }), 400, 'I + D');
    await envoyer(() => post({ debut: '2027-06-01', montant: -1 }), 400, 'I + C');
    await envoyer(() => post({ debut: '2027-06-10', fin: '2027-06-01', montant: 5 }), 422, 'D + C');
    await envoyer(
      () => post({ debut: 'demain', montant: 5 }, m.nonRessource),
      400,
      'I sur une non-ressource (400 avant 422)',
    );
  });

  it('NCO-8 : PATCH à deux défauts : 400 avant 422, 400 avant 409, 422 avant 409', async () => {
    const m = await monde();
    const patch = (champs: Corps) => appel(ctx, m.admin).patch(`/api/taux/${m.suivant}`, champs);
    await envoyer(
      () => patch({ debut: '2028-03-01', fin: '2028-02-01', montant: 0 }),
      400,
      'I + D',
    );
    await envoyer(() => patch({ debut: '2027-06-01', montant: -1 }), 400, 'I + C');
    await envoyer(() => patch({ debut: '2027-06-10', fin: '2027-06-01' }), 422, 'D + C');
  });
});
