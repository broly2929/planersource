import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import {
  affecter,
  appel,
  corps,
  creerActeur,
  creerProjet,
  liste,
  type Acteur,
  type Corps,
} from './lot1-helpers.js';
import {
  attendreRepos,
  creerActivite,
  creerAssignation,
  creerDependance,
  creerJalon,
  creerMonde,
  etatProjet,
  planning,
  url,
  type Monde,
  type Objet,
} from './lot1-t2-helpers.js';

/*
 * Lot 1b-B, copie de projet (SPEC §11.2, §11.3, §11.4, D-039). Jeu de données de SPEC 5.5 :
 * projet P (début lundi 04/01/2027), Alice et Bob affectées.
 * La charge réelle ne peut pas être posée par l'API : elle l'est par SQL dans la préparation
 * (COPIE-1, COPIE-5r). Les colonnes du moteur (dates planifiées, drapeaux) et le statut « inactif »
 * d'une ressource le sont aussi (COPIE-7, COPIE-12).
 */

/** Contenu de toutes les tables sauf `session`, trié : prouve qu'un refus ne change rien. */
async function empreinte(ctx: TestCtx): Promise<Record<string, string[]>> {
  await attendreRepos(ctx);
  const { rows: tables } = await ctx.pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT IN ('session', 'schema_version')
      ORDER BY tablename`,
  );
  const resultat: Record<string, string[]> = {};
  for (const { tablename } of tables) {
    const { rows } = await ctx.pool.query<{ ligne: string }>(
      `SELECT t::text AS ligne FROM "${tablename}" t ORDER BY 1`,
    );
    resultat[tablename] = rows.map((r) => r.ligne);
  }
  return resultat;
}

const adresse = (id: number) => `/api/projets/${id}/copie`;

/** Copie demandée : statut attendu, puis base strictement identique. */
async function copieRefusee(
  ctx: TestCtx,
  par: Acteur | undefined,
  id: number,
  c: Corps,
  statut: number,
): Promise<Corps> {
  const avant = await empreinte(ctx);
  const res = await appel(ctx, par).post(adresse(id), c);
  expect(res.statusCode, `POST ${adresse(id)}`).toBe(statut);
  expect(await empreinte(ctx), 'base modifiée par un refus').toEqual(avant);
  return corps(res);
}

async function copier(ctx: TestCtx, par: Acteur, id: number, c: Corps): Promise<Objet> {
  const res = await appel(ctx, par).post(adresse(id), c);
  expect(res.statusCode, res.body).toBe(201);
  return corps(res) as Objet;
}

/** SPEC 11.4 COPIE-1 : P : A (START, 06/01, Alice 2 j, réel 1 j, reste 1 j) → B (Bob 2 j), FD, délai 1. */
async function donneesCopie1(ctx: TestCtx, m: Monde) {
  const a = await creerActivite(ctx, m.admin, m.projet.id, {
    nom: 'A',
    mode: 'START',
    debut_valide: '2027-01-06',
  });
  const b = await creerActivite(ctx, m.admin, m.projet.id, { nom: 'B' });
  const assA = await creerAssignation(ctx, m.admin, a.id, m.alice.id, { charge_assignee: 2 });
  await creerAssignation(ctx, m.admin, b.id, m.bob.id, { charge_assignee: 2 });
  await ctx.pool.query(
    'UPDATE assignation SET charge_reelle = 1, reste_a_faire = 1 WHERE id = $1',
    [assA.id],
  );
  const dep = await creerDependance(ctx, m.admin, m.projet.id, a.id, b.id, {
    type: 'FD',
    delai: 1,
  });
  return { a, b, dep };
}

type Etat = Awaited<ReturnType<typeof etatProjet>>;
const parNom = (etat: Etat, nom: string) =>
  (etat.activites as Objet[]).find((x) => x.nom === nom) as Objet & Corps;
const assignationsDe = (etat: Etat, activiteId: number) =>
  (etat.assignations as (Objet & Corps)[]).filter((x) => x.activite_id === activiteId);

/** Projet racine créé, sans identifiants : pour comparer l'arborescence et l'ordre WBS. */
const forme = (lignes: Objet[]) => lignes.map((l) => [l.wbs, l.nom, l.type, l.rang]);

describe('Copie de projet (lot 1b-B)', () => {
  const ctx = useTestApp();

  it('COPIE-1 : A′ début 03/02, assigné 2, réel 0, reste 2 ; dépendance A′ → B′ FD délai 1 ; P inchangé', async () => {
    const m = await creerMonde(ctx);
    await donneesCopie1(ctx, m);
    const avant = await etatProjet(ctx, m.admin, m.projet.id);
    const copie = await copier(ctx, m.chef, m.projet.id, {
      nom: 'Copie',
      code: 'CIBLE',
      date_debut: '2027-02-01',
    });
    expect(copie).toMatchObject({
      code: 'CIBLE',
      nom: 'Copie',
      parent_id: null,
      est_modele: false,
      chef_id: m.chef.id,
      date_debut: '2027-02-01',
      clos: false,
    });
    const etat = await etatProjet(ctx, m.admin, copie.id);
    const a2 = parNom(etat, 'A');
    const b2 = parNom(etat, 'B');
    expect(a2).toMatchObject({ mode: 'START', debut_valide: '2027-02-03', close: false });
    const [assA] = assignationsDe(etat, a2.id);
    expect(assA).toMatchObject({
      ressource_id: m.alice.id,
      charge_assignee: 2,
      charge_reelle: 0,
      reste_a_faire: 2,
    });
    const [assB] = assignationsDe(etat, b2.id);
    expect(assB).toMatchObject({ ressource_id: m.bob.id, charge_assignee: 2, reste_a_faire: 2 });
    expect(etat.dependances).toHaveLength(1);
    expect((etat.dependances as Corps[])[0]).toMatchObject({
      predecesseur_id: a2.id,
      successeur_id: b2.id,
      type: 'FD',
      delai: 1,
    });
    expect(await etatProjet(ctx, m.admin, m.projet.id)).toEqual(avant);
  });

  it('COPIE-2 : sans l’option affectations, A′ et B′ n’ont aucune assignation et la copie aucune affectation', async () => {
    const m = await creerMonde(ctx);
    await donneesCopie1(ctx, m);
    const copie = await copier(ctx, m.chef, m.projet.id, {
      nom: 'Copie',
      code: 'CIBLE',
      date_debut: '2027-02-01',
      affectations: false,
    });
    const etat = await etatProjet(ctx, m.admin, copie.id);
    expect(etat.activites).toHaveLength(2);
    expect(etat.assignations).toEqual([]);
    expect(etat.affectations).toEqual([]);
    expect(etat.dependances).toHaveLength(1);
  });

  it('COPIE-3 : sous-projet P1 contenant C copié, arborescence et ordre WBS identiques', async () => {
    const m = await creerMonde(ctx);
    const racine = await creerActivite(ctx, m.admin, m.projet.id, { nom: 'R' });
    await creerJalon(ctx, m.admin, m.projet.id, {
      nom: 'J',
      type: 'fixe',
      date_validee: '2027-01-15',
    });
    await creerActivite(ctx, m.admin, m.projet.id, { nom: 'R1', parent_id: racine.id });
    const p1 = await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: m.projet.id });
    const c = await creerActivite(ctx, m.admin, p1.id, { nom: 'C' });
    await creerActivite(ctx, m.admin, p1.id, { nom: 'C1', parent_id: c.id });
    await creerJalon(ctx, m.admin, p1.id, { nom: 'C2', parent_id: c.id });

    const copie = await copier(ctx, m.chef, m.projet.id, {
      nom: 'Copie',
      code: 'CIBLE',
      date_debut: '2027-02-01',
      sous_projets: true,
    });
    const projets = liste(await appel(ctx, m.admin).get('/api/projets')) as (Objet & Corps)[];
    const enfants = projets.filter((p) => p.parent_id === copie.id);
    expect(enfants).toHaveLength(1);
    const p1copie = enfants[0]!;
    expect(p1copie).toMatchObject({ code: `CIBLE-${String(p1.code)}`, nom: p1.nom });
    expect(forme(await planning(ctx, m.admin, copie.id))).toEqual(
      forme(await planning(ctx, m.admin, m.projet.id)),
    );
    const lignesC = await planning(ctx, m.admin, p1copie.id);
    expect(lignesC.map((l) => l.nom)).toEqual(['C', 'C1', 'C2']);
    expect(forme(lignesC)).toEqual(forme(await planning(ctx, m.admin, p1.id)));
  });

  it('COPIE-4 : code cible déjà utilisé → 409 « code déjà utilisé », rien n’est créé', async () => {
    const m = await creerMonde(ctx);
    await donneesCopie1(ctx, m);
    const res = await copieRefusee(
      ctx,
      m.chef,
      m.projet.id,
      { nom: 'Copie', code: String(m.autre.code).toLowerCase(), date_debut: '2027-02-01' },
      409,
    );
    expect(String(res.erreur)).toMatch(/déjà utilisé/i);
  });

  it('COPIE-5r : l’historique de la copie ne contient que des créations, une par entité créée, au nom du copieur ; celui de P est inchangé', async () => {
    const m = await creerMonde(ctx);
    const { a } = await donneesCopie1(ctx, m);
    // entrées d'historique supplémentaires sur P
    expect(
      (await appel(ctx, m.admin).patch(url.activite(a.id), { nom: 'A renommée' })).statusCode,
    ).toBe(200);
    expect((await appel(ctx, m.admin).patch(url.activite(a.id), { nom: 'A' })).statusCode).toBe(
      200,
    );
    const lire = async (id: number) => {
      const res = await appel(ctx, m.admin).get(`/api/projets/${id}/historique`);
      expect(res.statusCode).toBe(200);
      return liste(res) as (Corps & { entite: string; entite_id: number })[];
    };
    const histoP = await lire(m.projet.id);
    expect(histoP.some((e) => e.operation === 'modification')).toBe(true);

    const copie = await copier(ctx, m.chef, m.projet.id, {
      nom: 'Copie',
      code: 'CIBLE',
      date_debut: '2027-02-01',
    });
    const histo = await lire(copie.id);
    expect(histo.every((e) => e.operation === 'creation')).toBe(true);
    expect(histo.every((e) => e.utilisateur_id === m.chef.id)).toBe(true);
    const etat = await etatProjet(ctx, m.admin, copie.id);
    const attendu = [
      ['projet', copie.id],
      ...(etat.activites as Objet[]).map((x) => ['activite', x.id]),
      ...(etat.dependances as Objet[]).map((x) => ['dependance', x.id]),
      ...(etat.affectations as Objet[]).map((x) => ['affectation', x.id]),
      ...(etat.assignations as Objet[]).map((x) => ['assignation', x.id]),
    ].map(([e, i]) => `${String(e)}#${String(i)}`);
    expect(attendu).toHaveLength(8);
    expect(histo.map((e) => `${e.entite}#${e.entite_id}`).sort()).toEqual(attendu.sort());
    expect(await lire(m.projet.id)).toEqual(histoP);
  });

  it('COPIE-6 : code dérivé d’un sous-projet déjà utilisé (CIBLE-S1) → 409, rien n’est créé', async () => {
    const m = await creerMonde(ctx);
    await donneesCopie1(ctx, m);
    await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: m.projet.id, code: 'S1' });
    await creerProjet(ctx, m.admin, { chef_id: m.chef.id, code: 'CIBLE-S1' });
    await copieRefusee(
      ctx,
      m.chef,
      m.projet.id,
      { nom: 'Copie', code: 'CIBLE', date_debut: '2027-02-01' },
      409,
    );
  });

  it('COPIE-7 : un chef copie son projet clos (activité close, chef d’origine autre) : chef = copieur, racine, clos et close faux, priorité identique', async () => {
    const m = await creerMonde(ctx);
    const parent = await creerProjet(ctx, m.admin, { chef_id: m.chef.id });
    const source = await creerProjet(ctx, m.admin, {
      chef_id: m.autreChef.id,
      parent_id: parent.id,
      priorite: 300,
    });
    const act = await creerActivite(ctx, m.admin, source.id, { nom: 'X' });
    expect(
      (await appel(ctx, m.admin).patch(url.activite(act.id), { close: true })).statusCode,
    ).toBe(200);
    expect(
      (await appel(ctx, m.admin).patch(`/api/projets/${source.id}`, { clos: true })).statusCode,
    ).toBe(200);
    await ctx.pool.query(
      `UPDATE activite SET debut_planifie = '2027-01-06', fin_planifiee = '2027-01-07',
              drapeaux = ARRAY['SURCHARGE'] WHERE id = $1`,
      [act.id],
    );
    const copie = await copier(ctx, m.chef, source.id, {
      nom: 'Copie',
      code: 'CIBLE',
      date_debut: '2027-02-01',
    });
    expect(copie).toMatchObject({
      chef_id: m.chef.id,
      parent_id: null,
      clos: false,
      priorite: 300,
    });
    const [x] = (await etatProjet(ctx, m.admin, copie.id)).activites as (Objet & Corps)[];
    expect(x).toMatchObject({
      nom: 'X',
      close: false,
      debut_planifie: null,
      fin_planifiee: null,
      drapeaux: [],
    });
  });

  it('COPIE-8-r2 : refus de droits, base inchangée (sans session 401, chef d’un autre projet 403, lecture seule 403, ressource 404)', async () => {
    const m = await creerMonde(ctx);
    await donneesCopie1(ctx, m);
    const lecteur = await creerActeur(ctx, 'lecteur@example.test', 'chef_de_projet', true);
    await affecter(ctx, m.projet.id, lecteur.id);
    const c = { nom: 'Copie', code: 'CIBLE', date_debut: '2027-02-01' };
    await copieRefusee(ctx, undefined, m.projet.id, c, 401);
    await copieRefusee(ctx, m.autreChef, m.projet.id, c, 403); // révision D-265 (4) : lecture seule
    await copieRefusee(ctx, lecteur, m.projet.id, c, 403);
    await copieRefusee(ctx, m.alice, m.projet.id, c, 404); // révision 6b (D-031, D-148 (2))
  });

  it('COPIE-9 : décalage de 28 jours des dates d’affectation, de jalon, d’activité et de sous-projet ; dates vides inchangées', async () => {
    const m = await creerMonde(ctx);
    await ctx.pool.query(
      `UPDATE affectation_projet SET date_debut = '2027-01-11', date_fin = '2027-01-29'
        WHERE projet_id = $1 AND ressource_id = $2`,
      [m.projet.id, m.alice.id],
    );
    await creerJalon(ctx, m.admin, m.projet.id, {
      nom: 'J',
      type: 'fixe',
      date_validee: '2027-01-15',
    });
    await creerActivite(ctx, m.admin, m.projet.id, { nom: 'F', fin_valide: '2027-01-08' });
    await creerActivite(ctx, m.admin, m.projet.id, { nom: 'V' });
    await creerProjet(ctx, m.admin, {
      chef_id: m.chef.id,
      parent_id: m.projet.id,
      date_debut: '2027-01-11',
    });
    const copie = await copier(ctx, m.chef, m.projet.id, {
      nom: 'Copie',
      code: 'CIBLE',
      date_debut: '2027-02-01',
    });
    const etat = await etatProjet(ctx, m.admin, copie.id);
    const affs = etat.affectations as (Objet & Corps)[];
    expect(affs.find((x) => x.ressource_id === m.alice.id)).toMatchObject({
      date_debut: '2027-02-08',
      date_fin: '2027-02-26',
    });
    expect(affs.find((x) => x.ressource_id === m.bob.id)).toMatchObject({
      date_debut: null,
      date_fin: null,
    });
    expect((etat.jalons as Corps[])[0]).toMatchObject({ nom: 'J', date_validee: '2027-02-12' });
    expect(parNom(etat, 'F')).toMatchObject({ debut_valide: null, fin_valide: '2027-02-05' });
    expect(parNom(etat, 'V')).toMatchObject({ debut_valide: null, fin_valide: null });
    const projets = liste(await appel(ctx, m.admin).get('/api/projets')) as (Objet & Corps)[];
    expect(projets.find((p) => p.parent_id === copie.id)).toMatchObject({
      date_debut: '2027-02-08',
    });
  });

  it('COPIE-10 : sous_projets faux : un seul projet créé avec son contenu direct, aucun sous-projet', async () => {
    const m = await creerMonde(ctx);
    await donneesCopie1(ctx, m);
    const p1 = await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: m.projet.id });
    await creerActivite(ctx, m.admin, p1.id, { nom: 'C' });
    const avant = Number(
      (await ctx.pool.query<{ n: string }>('SELECT count(*) AS n FROM projet')).rows[0]!.n,
    );
    const copie = await copier(ctx, m.chef, m.projet.id, {
      nom: 'Copie',
      code: 'CIBLE',
      date_debut: '2027-02-01',
      sous_projets: false,
    });
    const { rows } = await ctx.pool.query<{ n: string }>('SELECT count(*) AS n FROM projet');
    expect(Number(rows[0]!.n)).toBe(avant + 1);
    const { rows: enfants } = await ctx.pool.query('SELECT 1 FROM projet WHERE parent_id = $1', [
      copie.id,
    ]);
    expect(enfants).toHaveLength(0);
    const etat = await etatProjet(ctx, m.admin, copie.id);
    expect(etat.activites).toHaveLength(2);
    expect(etat.dependances).toHaveLength(1);
    expect(etat.assignations).toHaveLength(2);
  });

  it('COPIE-11 : la copie d’un sous-projet seul est un projet racine', async () => {
    const m = await creerMonde(ctx);
    const p1 = await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: m.projet.id });
    await creerActivite(ctx, m.admin, p1.id, { nom: 'C' });
    const copie = await copier(ctx, m.admin, p1.id, {
      nom: 'Copie',
      code: 'CIBLE',
      date_debut: '2027-02-01',
    });
    expect(copie.parent_id).toBeNull();
    expect((await etatProjet(ctx, m.admin, copie.id)).activites).toHaveLength(1);
  });

  it('COPIE-12 : Bob inactif : ni affectation ni assignation de Bob sur la copie ; celles d’Alice sont copiées', async () => {
    const m = await creerMonde(ctx);
    await donneesCopie1(ctx, m);
    await ctx.pool.query('UPDATE utilisateur SET actif = false WHERE id = $1', [m.bob.id]);
    const copie = await copier(ctx, m.chef, m.projet.id, {
      nom: 'Copie',
      code: 'CIBLE',
      date_debut: '2027-02-01',
    });
    const etat = await etatProjet(ctx, m.admin, copie.id);
    expect((etat.affectations as Corps[]).map((x) => x.ressource_id)).toEqual([m.alice.id]);
    expect((etat.assignations as Corps[]).map((x) => x.ressource_id)).toEqual([m.alice.id]);
    expect(etat.activites).toHaveLength(2);
  });

  it('COPIE-13 : corps invalide (code vide, date mal formée, clé inconnue) → 400, base inchangée', async () => {
    const m = await creerMonde(ctx);
    await donneesCopie1(ctx, m);
    const bon = { nom: 'Copie', code: 'CIBLE', date_debut: '2027-02-01' };
    await copieRefusee(ctx, m.chef, m.projet.id, { ...bon, code: '' }, 400);
    await copieRefusee(ctx, m.chef, m.projet.id, { ...bon, date_debut: '01/02/2027' }, 400);
    await copieRefusee(ctx, m.chef, m.projet.id, { ...bon, inconnue: 1 }, 400);
  });

  describe('Variantes (SPEC 11.3)', () => {
    it('MOD-3 : un chef crée depuis un modèle M, début 01/02/2027 : est_modele faux, contenu selon 11.2, chef = ce chef', async () => {
      const m = await creerMonde(ctx);
      const modele = corps(
        await appel(ctx, m.admin).post('/api/modeles', {
          code: 'M1',
          nom: 'Modèle',
          date_debut: '2027-01-04',
        }),
      ) as Objet;
      await affecter(ctx, modele.id, m.alice.id);
      await affecter(ctx, modele.id, m.bob.id);
      const a = await creerActivite(ctx, m.admin, modele.id, {
        nom: 'A',
        mode: 'START',
        debut_valide: '2027-01-06',
      });
      const b = await creerActivite(ctx, m.admin, modele.id, { nom: 'B' });
      await creerAssignation(ctx, m.admin, a.id, m.alice.id, { charge_assignee: 2 });
      await creerAssignation(ctx, m.admin, b.id, m.bob.id, { charge_assignee: 2 });
      await creerDependance(ctx, m.admin, modele.id, a.id, b.id, { type: 'FD', delai: 1 });
      const avant = await etatProjet(ctx, m.admin, modele.id);

      const copie = await copier(ctx, m.chef, modele.id, {
        nom: 'Depuis modèle',
        code: 'NOUVEAU',
        date_debut: '2027-02-01',
      });
      expect(copie).toMatchObject({ est_modele: false, chef_id: m.chef.id, parent_id: null });
      const etat = await etatProjet(ctx, m.admin, copie.id);
      expect(parNom(etat, 'A')).toMatchObject({ mode: 'START', debut_valide: '2027-02-03' });
      expect(etat.activites).toHaveLength(2);
      expect(etat.dependances).toHaveLength(1);
      expect(etat.assignations).toHaveLength(2);
      expect(
        (etat.assignations as Corps[]).every((x) => x.charge_reelle === 0 && x.reste_a_faire === 2),
      ).toBe(true);
      const projets = liste(await appel(ctx, m.chef).get('/api/projets')) as Corps[];
      expect(projets.map((p) => p.id)).toContain(copie.id);
      expect(await etatProjet(ctx, m.admin, modele.id)).toEqual(avant);
    });

    it('MOD-4 : l’administrateur enregistre P de COPIE-1 comme modèle : est_modele vrai, réel 0, P inchangé', async () => {
      const m = await creerMonde(ctx);
      await donneesCopie1(ctx, m);
      const avant = await etatProjet(ctx, m.admin, m.projet.id);
      const copie = await copier(ctx, m.admin, m.projet.id, {
        nom: 'Modèle P',
        code: 'MODP',
        date_debut: '2027-02-01',
        est_modele: true,
      });
      expect(copie).toMatchObject({ est_modele: true, parent_id: null, chef_id: m.admin.id });
      const etat = await etatProjet(ctx, m.admin, copie.id);
      expect(parNom(etat, 'A')).toMatchObject({ debut_valide: '2027-02-03' });
      expect(
        (etat.assignations as Corps[]).every((x) => x.charge_reelle === 0 && x.reste_a_faire === 2),
      ).toBe(true);
      const projets = liste(await appel(ctx, m.admin).get('/api/projets')) as Corps[];
      expect(projets.map((p) => p.id)).not.toContain(copie.id);
      const modeles = liste(await appel(ctx, m.admin).get('/api/modeles')) as Corps[];
      expect(modeles.map((p) => p.id)).toContain(copie.id);
      expect(await etatProjet(ctx, m.admin, m.projet.id)).toEqual(avant);
    });

    it('MOD-15 : un chef de projet envoie est_modele vrai → 403, base inchangée', async () => {
      const m = await creerMonde(ctx);
      await donneesCopie1(ctx, m);
      await copieRefusee(
        ctx,
        m.chef,
        m.projet.id,
        { nom: 'Modèle P', code: 'MODP', date_debut: '2027-02-01', est_modele: true },
        403,
      );
    });

    it('MOD-16 : une ressource copie un modèle → 404, base inchangée', async () => {
      const m = await creerMonde(ctx);
      const modele = corps(
        await appel(ctx, m.admin).post('/api/modeles', {
          code: 'M1',
          nom: 'Modèle',
          date_debut: '2027-01-04',
        }),
      ) as Objet;
      await affecter(ctx, modele.id, m.alice.id);
      const res = await copieRefusee(
        ctx,
        m.alice,
        modele.id,
        { nom: 'Copie', code: 'CIBLE', date_debut: '2027-02-01' },
        404,
      );
      expect(res.erreur).toBe('Projet introuvable');
    });
  });
});
