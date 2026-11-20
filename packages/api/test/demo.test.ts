import { describe, expect, it } from 'vitest';
import { createAdmin } from '../src/auth/create-admin.js';
import { exigerBaseDemo, urlBaseDemo } from '../src/demo/base.js';
import { remplirDemo } from '../src/demo/remplir.js';
import { useTestApp } from './helpers.js';
import { type Acteur } from './lot1-helpers.js';
import { calculer, empreinte } from './lot2a-helpers.js';

/** Jeu de démonstration (D-117) : lundi de la semaine du jour fixé, valeurs de la consigne. */
const LUNDI = '2027-01-04';

type Ligne = Record<string, unknown>;

async function connecter(ctx: ReturnType<typeof useTestApp>, login: string): Promise<Acteur> {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { identifiant: login, mot_de_passe: login },
  });
  expect(res.statusCode, `connexion ${login}`).toBe(200);
  const c = res.cookies.find((x) => x.name === 'session')!;
  return { id: (res.json() as { id: number }).id, email: login, cookie: `${c.name}=${c.value}` };
}

async function demarrer(ctx: ReturnType<typeof useTestApp>, lundi = LUNDI): Promise<void> {
  await createAdmin(ctx.pool, { login: 'admin', nom: 'Administrateur', motDePasse: 'admin' });
  await remplirDemo(ctx.app, { lundi });
}

/** Lundi de la semaine du jour réel (comme le CLI) : tous ses jours antérieurs sont passés. */
function lundiReel(): string {
  const d = new Date();
  const jour = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  jour.setUTCDate(jour.getUTCDate() - ((jour.getUTCDay() + 6) % 7));
  return jour.toISOString().slice(0, 10);
}
const decale = (jour: string, n: number): string => {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function lire(ctx: ReturnType<typeof useTestApp>, sql: string): Promise<Ligne[]> {
  return (await ctx.pool.query<Ligne>(sql)).rows;
}

describe('Jeu de démonstration (D-117)', () => {
  const ctx = useTestApp();

  it('DEMO-1-r1 : comptes, projets, hiérarchie, affectations, modèle, projet clos, drapeaux, connexion de chefb', async () => {
    await demarrer(ctx);

    const users = await lire(
      ctx,
      'SELECT login, role, est_ressource, initiales FROM utilisateur ORDER BY login',
    );
    expect(users.map((u) => [u.login, u.role, u.est_ressource])).toEqual([
      ['admin', 'administrateur', false],
      ['alice', 'ressource', true],
      ['bob', 'ressource', true],
      ['chefa', 'chef_de_projet', false],
      ['chefb', 'chef_de_projet', true],
    ]);
    for (const u of users.filter((x) => x.login !== 'admin')) {
      expect(u.initiales, `initiales de ${String(u.login)}`).toMatch(/^.{1,4}$/);
    }

    const projets = await lire(
      ctx,
      `SELECT p.code, p.est_modele, p.clos, u.login AS chef, pp.code AS parent
         FROM projet p JOIN utilisateur u ON u.id = p.chef_id
         LEFT JOIN projet pp ON pp.id = p.parent_id ORDER BY p.code`,
    );
    expect(projets).toEqual([
      { code: 'DEMO-C', est_modele: false, clos: true, chef: 'chefa', parent: null },
      { code: 'DEMO-M', est_modele: true, clos: false, chef: 'admin', parent: null },
      { code: 'DEMO-Q', est_modele: false, clos: false, chef: 'chefa', parent: null },
      { code: 'DEMO-R', est_modele: false, clos: false, chef: 'chefa', parent: null },
      { code: 'DEMO-S', est_modele: false, clos: false, chef: 'chefb', parent: 'DEMO-R' },
    ]);

    const affectations = await lire(
      ctx,
      `SELECT p.code, u.login FROM affectation_projet a
         JOIN projet p ON p.id = a.projet_id JOIN utilisateur u ON u.id = a.ressource_id`,
    );
    const a = (code: string, login: string) =>
      affectations.some((x) => x.code === code && x.login === login);
    expect(a('DEMO-R', 'chefb')).toBe(true);
    expect(a('DEMO-S', 'alice')).toBe(true);

    // R : une phase parente à deux sous-activités, tous les modes, un jalon, FD, DD, FF, une close.
    const rows = await lire(
      ctx,
      `SELECT e.parent_id, a.mode, a.close, a.drapeaux, a.id
         FROM activite a JOIN element e ON e.id = a.id JOIN projet p ON p.id = e.projet_id
        WHERE p.code = 'DEMO-R'`,
    );
    const parents = new Set<unknown>(rows.map((r) => r.parent_id).filter((x) => x !== null));
    expect(parents.size).toBeGreaterThanOrEqual(1);
    const enfantsDeParent = rows.filter((r) => parents.has(r.parent_id));
    expect(enfantsDeParent.length).toBeGreaterThanOrEqual(2);
    const modes = new Set(rows.map((r) => r.mode));
    for (const m of ['ASAP', 'START', 'STARR', 'ALAP', 'FDUR', 'DDUR', 'REGUL', 'MAN']) {
      expect(modes.has(m), `mode ${m}`).toBe(true);
    }
    expect(rows.some((r) => r.close === true)).toBe(true);
    const jalons = await lire(
      ctx,
      `SELECT 1 FROM jalon j JOIN element e ON e.id = j.id JOIN projet p ON p.id = e.projet_id
        WHERE p.code = 'DEMO-R'`,
    );
    expect(jalons.length).toBeGreaterThanOrEqual(1);
    const types = await lire(
      ctx,
      `SELECT DISTINCT d.type FROM dependance d JOIN element e ON e.id = d.successeur_id
         JOIN projet p ON p.id = e.projet_id WHERE p.code = 'DEMO-R'`,
    );
    expect(types.map((t) => t.type).sort()).toEqual(['DD', 'FD', 'FF']);

    // Révision D-031 (D-123 (8)) : aucune saisie MAN un jour de week-end ; la surcharge MAN vient de
    // deux activités MAN d'Alice qui ont une saisie le même jour ouvré.
    const weekEnds = await lire(
      ctx,
      `SELECT 1 FROM saisie_manuelle WHERE extract(dow FROM jour) IN (0, 6)`,
    );
    expect(weekEnds).toEqual([]);
    const communs = await lire(
      ctx,
      `SELECT s.jour FROM saisie_manuelle s
         JOIN assignation a ON a.id = s.assignation_id
         JOIN utilisateur u ON u.id = a.ressource_id
        WHERE u.login = 'alice'
        GROUP BY s.jour
       HAVING count(DISTINCT a.activite_id) >= 2`,
    );
    expect(communs.length).toBeGreaterThanOrEqual(1);
    // D-124 : au moins une de ces activités MAN d'Alice porte le drapeau `surcharge`.
    const enSurcharge = await lire(
      ctx,
      `SELECT DISTINCT act.id FROM activite act
         JOIN assignation a ON a.activite_id = act.id
         JOIN utilisateur u ON u.id = a.ressource_id
         JOIN saisie_manuelle s ON s.assignation_id = a.id
        WHERE u.login = 'alice' AND act.mode = 'MAN' AND 'surcharge' = ANY(act.drapeaux)
          AND s.jour IN (
            SELECT s2.jour FROM saisie_manuelle s2
              JOIN assignation a2 ON a2.id = s2.assignation_id
              JOIN utilisateur u2 ON u2.id = a2.ressource_id
             WHERE u2.login = 'alice'
             GROUP BY s2.jour HAVING count(DISTINCT a2.activite_id) >= 2)`,
    );
    expect(enSurcharge.length).toBeGreaterThanOrEqual(1);

    // Drapeaux produits par le moteur.
    const tous = new Set(rows.flatMap((r) => r.drapeaux as string[]));
    for (const d of ['retard', 'debut_non_respecte', 'surcharge', 'dependance_non_respectee']) {
      expect(tous.has(d), `drapeau ${d}`).toBe(true);
    }

    await connecter(ctx, 'chefb');
  });

  it('DEMO-2 : chefb calcule S seul (200), calcule R (403, travail de R inchangé)', async () => {
    await demarrer(ctx);
    const chefb = await connecter(ctx, 'chefb');
    const ids = await lire(ctx, 'SELECT id, code FROM projet');
    const id = (code: string) => ids.find((p) => p.code === code)!.id as number;

    const surS = await calculer(ctx, chefb, { projets: [id('DEMO-S')], d0: LUNDI });
    expect(surS.statusCode, surS.body).toBe(200);

    const avant = (await empreinte(ctx)).travail_planifie;
    const surR = await calculer(ctx, chefb, { projets: [id('DEMO-R')], d0: LUNDI });
    expect(surR.statusCode).toBe(403);
    expect((await empreinte(ctx)).travail_planifie).toEqual(avant);
  });

  it('DEMO-3 : nom de la base de démonstration, calculé par une fonction pure ; refus hors _demo', () => {
    expect(urlBaseDemo('postgres://u:p@h:5432/planersource')).toBe(
      'postgres://u:p@h:5432/planersource_demo',
    );
    expect(urlBaseDemo('postgres://u:p@h:5432/planersource?sslmode=disable')).toBe(
      'postgres://u:p@h:5432/planersource_demo?sslmode=disable',
    );
    expect(() => exigerBaseDemo('postgres://u:p@h:5432/planersource_demo')).not.toThrow();
    for (const nom of ['planersource', 'planersource_test', 'demo_x']) {
      expect(() => exigerBaseDemo(`postgres://u:p@h:5432/${nom}`), nom).toThrow();
    }
  });
  it('DEMO-4-r1 : feuilles de temps du jeu (statuts, commentaire, validations, imputations passées, charge réelle)', async () => {
    const lundi = lundiReel();
    const l14 = decale(lundi, -14);
    const l7 = decale(lundi, -7);
    await demarrer(ctx, lundi);

    const feuilles = await lire(
      ctx,
      `SELECT u.login, f.lundi::text AS lundi, f.statut, f.commentaire,
              (SELECT array_agg(p.code || ':' || v.login ORDER BY p.code)
                 FROM (SELECT vf.projet_id, uv.login FROM validation_feuille vf
                         JOIN utilisateur uv ON uv.id = vf.validateur_id
                        WHERE vf.feuille_id = f.id) v
                 JOIN projet p ON p.id = v.projet_id) AS validations
         FROM feuille_temps f JOIN utilisateur u ON u.id = f.ressource_id
        ORDER BY f.lundi, u.login`,
    );
    expect(feuilles.map((f) => [f.login, f.lundi, f.statut, f.commentaire, f.validations])).toEqual(
      [
        ['alice', l14, 'rejetee', 'Imputations du jeudi à revoir', null],
        ['bob', l14, 'validee', null, ['DEMO-R:chefa']],
        ['alice', l7, 'soumise', null, ['DEMO-S:chefb']],
        ['bob', l7, 'soumise', null, null],
        ['alice', lundi, 'brouillon', null, null],
      ],
    );

    type Vue = {
      feuilles: {
        ressource_nom: string;
        statut: string;
        projets: { projet_code: string; valide: boolean; peut_valider: boolean }[];
      }[];
    };
    const projetsAlice = async (login: string) => {
      const acteur = await connecter(ctx, login);
      const res = await ctx.app.inject({
        method: 'GET',
        url: `/api/validations?semaine=${l7}`,
        headers: { cookie: acteur.cookie },
      });
      expect(res.statusCode).toBe(200);
      const alice = (res.json() as Vue).feuilles.find((f) => f.ressource_nom === 'Alice')!;
      expect(alice.statut).toBe('soumise');
      return alice.projets;
    };
    const enChefa = await projetsAlice('chefa');
    const r = enChefa.find((p) => p.projet_code === 'DEMO-R')!;
    const s = enChefa.find((p) => p.projet_code === 'DEMO-S')!;
    expect([r.peut_valider, r.valide]).toEqual([true, false]);
    expect(s.valide).toBe(true);
    const enChefb = await projetsAlice('chefb');
    expect(enChefb.find((p) => p.projet_code === 'DEMO-S')!.valide).toBe(true);

    const imputations = await lire(
      ctx,
      `SELECT jour::text AS jour, EXTRACT(ISODOW FROM jour)::int AS isodow FROM imputation`,
    );
    expect(imputations.length).toBeGreaterThan(0);
    const aujourdhui = new Date().toISOString().slice(0, 10);
    for (const i of imputations) {
      expect(i.isodow as number, `jour ${String(i.jour)}`).toBeLessThanOrEqual(5);
      expect(String(i.jour) <= aujourdhui, `jour ${String(i.jour)} futur`).toBe(true);
    }
    const sansReel = await lire(
      ctx,
      `SELECT s.id FROM assignation s
        WHERE EXISTS (SELECT 1 FROM imputation i WHERE i.assignation_id = s.id)
          AND s.charge_reelle <= 0`,
    );
    expect(sansReel).toEqual([]);
  });
});
