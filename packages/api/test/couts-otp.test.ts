// Lot couts, tranche 1 (D-225) : OTP d'un projet et d'une activité. OTP-1 à OTP-10.
// Valeurs attendues recopiées de SPEC §12.2, §11.2 et de D-225.
import { describe, expect, it } from 'vitest';
import { otpHerite } from '../src/planning/otp.js';
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
import { creerActivite, creerAssignation, creerJalon, url, type Objet } from './lot1-t2-helpers.js';
import { calculer, empreinte, travail } from './lot2a-helpers.js';

const CINQUANTE = 'A'.repeat(50);
const CINQUANTE_ET_UN = 'A'.repeat(51);

async function admin(ctx: TestCtx): Promise<Acteur> {
  return creerActeur(ctx, 'admin@example.test', 'administrateur');
}

async function refus(
  ctx: TestCtx,
  envoyer: () => ReturnType<ReturnType<typeof appel>['get']>,
  statut: number,
  libelle = '',
): Promise<void> {
  const avant = await empreinte(ctx);
  const res = await envoyer();
  expect(res.statusCode, `${libelle} ${res.body}`).toBe(statut);
  expect(await empreinte(ctx), `base modifiée par un refus ${libelle}`).toEqual(avant);
}

async function lireProjet(ctx: TestCtx, par: Acteur, id: number): Promise<Corps> {
  const res = await appel(ctx, par).get(`/api/projets/${id}`);
  expect(res.statusCode, res.body).toBe(200);
  return corps(res);
}

async function lireActivites(ctx: TestCtx, par: Acteur, projetId: number): Promise<Objet[]> {
  const res = await appel(ctx, par).get(url.activites(projetId));
  expect(res.statusCode, res.body).toBe(200);
  return liste(res) as Objet[];
}

const activite = async (ctx: TestCtx, par: Acteur, projetId: number, id: number) =>
  (await lireActivites(ctx, par, projetId)).find((a) => a.id === id)!;

const trois = (o: Corps) => ({
  otp: o.otp,
  otp_effectif: o.otp_effectif,
  otp_source: o.otp_source,
});

describe('Lot couts-1 : OTP (SPEC §12.2, D-225)', () => {
  const ctx = useTestApp();

  it('OTP-1 : projet et modèle : espaces retirés, vide et null = aucun, 50 permis, 51 → 400 ; valeur partagée', async () => {
    const a = await admin(ctx);
    const p = await creerProjet(ctx, a, { otp: '  OTP-1  ' });
    expect(trois(p)).toEqual({ otp: 'OTP-1', otp_effectif: 'OTP-1', otp_source: null });
    const q = await creerProjet(ctx, a, { otp: 'OTP-1' });
    expect(q.otp).toBe('OTP-1');
    const vide = await creerProjet(ctx, a, { otp: '   ' });
    expect(trois(vide)).toEqual({ otp: null, otp_effectif: null, otp_source: null });
    const nul = await creerProjet(ctx, a, { otp: null });
    expect(nul.otp).toBeNull();
    const long = await creerProjet(ctx, a, { otp: CINQUANTE });
    expect(long.otp).toBe(CINQUANTE);
    await refus(
      ctx,
      () =>
        appel(ctx, a).post('/api/projets', {
          code: 'X51',
          nom: 'X',
          date_debut: '2027-01-04',
          otp: CINQUANTE_ET_UN,
        }),
      400,
      'POST 51',
    );
    await refus(
      ctx,
      () => appel(ctx, a).patch(`/api/projets/${p.id}`, { otp: CINQUANTE_ET_UN }),
      400,
      'PATCH 51',
    );
    await refus(
      ctx,
      () => appel(ctx, a).patch(`/api/projets/${p.id}`, { otp: 12 }),
      400,
      'PATCH nombre',
    );
    const res = await appel(ctx, a).patch(`/api/projets/${p.id}`, { otp: ' B ' });
    expect(res.statusCode, res.body).toBe(200);
    expect(trois(corps(res))).toEqual({ otp: 'B', otp_effectif: 'B', otp_source: null });
    const res2 = await appel(ctx, a).patch(`/api/projets/${p.id}`, { otp: '' });
    expect(corps(res2).otp).toBeNull();
    expect((await lireProjet(ctx, a, p.id)).otp).toBeNull();
    // modèle
    const m = await appel(ctx, a).post('/api/modeles', {
      code: 'M1',
      nom: 'M',
      date_debut: '2027-01-04',
      otp: ' MOD ',
    });
    expect(m.statusCode, m.body).toBe(201);
    expect(corps(m).otp).toBe('MOD');
    const lm = await appel(ctx, a).get('/api/modeles');
    expect(trois(liste(lm)[0]!)).toEqual({ otp: 'MOD', otp_effectif: 'MOD', otp_source: null });
  });

  it('OTP-2 : activité : mêmes règles ; jalon : clé otp refusée (400)', async () => {
    const a = await admin(ctx);
    const p = await creerProjet(ctx, a);
    const act = await creerActivite(ctx, a, p.id, { otp: ' ACT ' });
    expect(trois(act)).toEqual({ otp: 'ACT', otp_effectif: 'ACT', otp_source: null });
    const act2 = await creerActivite(ctx, a, p.id, { otp: '' });
    expect(act2.otp).toBeNull();
    await refus(
      ctx,
      () => appel(ctx, a).post(url.activites(p.id), { nom: 'X', otp: CINQUANTE_ET_UN }),
      400,
      'POST 51',
    );
    await refus(
      ctx,
      () => appel(ctx, a).patch(url.activite(act.id), { otp: CINQUANTE_ET_UN }),
      400,
      'PATCH 51',
    );
    const res = await appel(ctx, a).patch(url.activite(act.id), { otp: CINQUANTE });
    expect(res.statusCode, res.body).toBe(200);
    expect(corps(res).otp).toBe(CINQUANTE);
    const res2 = await appel(ctx, a).patch(url.activite(act.id), { otp: null });
    expect(corps(res2).otp).toBeNull();
    const j = await creerJalon(ctx, a, p.id);
    await refus(
      ctx,
      () => appel(ctx, a).post(url.jalons(p.id), { nom: 'J', otp: 'X' }),
      400,
      'jalon POST',
    );
    await refus(ctx, () => appel(ctx, a).patch(url.jalon(j.id), { otp: 'X' }), 400, 'jalon PATCH');
  });

  it('OTP-3 : héritage dans un projet : activité parente, puis projet ; valeur propre prioritaire', async () => {
    const a = await admin(ctx);
    const p = await creerProjet(ctx, a, { code: 'PRJ', otp: 'P-OTP' });
    const parent = await creerActivite(ctx, a, p.id, { nom: 'Conception' });
    const enfant = await creerActivite(ctx, a, p.id, { nom: 'Maquette', parent_id: parent.id });
    const petit = await creerActivite(ctx, a, p.id, { nom: 'Écran', parent_id: enfant.id });
    // sans valeur sur les activités : valeur du projet
    expect(trois(await activite(ctx, a, p.id, petit.id))).toEqual({
      otp: null,
      otp_effectif: 'P-OTP',
      otp_source: { type: 'projet', id: p.id, libelle: 'PRJ' },
    });
    // valeur sur l'activité parente racine : la plus proche gagne
    await appel(ctx, a).patch(url.activite(parent.id), { otp: 'A-OTP' });
    expect(trois(await activite(ctx, a, p.id, petit.id))).toEqual({
      otp: null,
      otp_effectif: 'A-OTP',
      otp_source: { type: 'activite', id: parent.id, libelle: '1 Conception' },
    });
    await appel(ctx, a).patch(url.activite(enfant.id), { otp: 'E-OTP' });
    expect(trois(await activite(ctx, a, p.id, petit.id))).toEqual({
      otp: null,
      otp_effectif: 'E-OTP',
      otp_source: { type: 'activite', id: enfant.id, libelle: '1.1 Maquette' },
    });
    // valeur propre
    const res = await appel(ctx, a).patch(url.activite(petit.id), { otp: 'PROPRE' });
    expect(trois(corps(res))).toEqual({ otp: 'PROPRE', otp_effectif: 'PROPRE', otp_source: null });
    // aucune valeur nulle part
    const q = await creerProjet(ctx, a);
    const seule = await creerActivite(ctx, a, q.id);
    expect(trois(seule)).toEqual({ otp: null, otp_effectif: null, otp_source: null });
    // réponse du POST : héritage déjà calculé
    const nouvelle = await creerActivite(ctx, a, p.id, { nom: 'Nouvelle', parent_id: enfant.id });
    expect(trois(nouvelle)).toEqual({
      otp: null,
      otp_effectif: 'E-OTP',
      otp_source: { type: 'activite', id: enfant.id, libelle: '1.1 Maquette' },
    });
  });

  it('OTP-4 : héritage entre projets (deux niveaux), valeur propre du sous-projet prioritaire ; routes de lecture', async () => {
    const a = await admin(ctx);
    const racine = await creerProjet(ctx, a, { code: 'RAC', otp: 'R-OTP' });
    const sp = await creerProjet(ctx, a, { code: 'SP', parent_id: racine.id });
    const ssp = await creerProjet(ctx, a, { code: 'SSP', parent_id: sp.id });
    const act = await creerActivite(ctx, a, ssp.id);
    const source = { type: 'projet', id: racine.id, libelle: 'RAC' };
    expect(trois(sp)).toEqual({ otp: null, otp_effectif: 'R-OTP', otp_source: source });
    expect(trois(ssp)).toEqual({ otp: null, otp_effectif: 'R-OTP', otp_source: source });
    expect(trois(await lireProjet(ctx, a, ssp.id))).toEqual({
      otp: null,
      otp_effectif: 'R-OTP',
      otp_source: source,
    });
    const tous = liste(await appel(ctx, a).get('/api/projets'));
    expect(trois(tous.find((x) => x.id === ssp.id)!)).toEqual({
      otp: null,
      otp_effectif: 'R-OTP',
      otp_source: source,
    });
    expect(trois(act)).toEqual({ otp: null, otp_effectif: 'R-OTP', otp_source: source });
    // valeur propre du sous-projet
    const res = await appel(ctx, a).patch(`/api/projets/${sp.id}`, { otp: 'SP-OTP' });
    expect(trois(corps(res))).toEqual({ otp: 'SP-OTP', otp_effectif: 'SP-OTP', otp_source: null });
    const src = { type: 'projet', id: sp.id, libelle: 'SP' };
    expect(trois(await lireProjet(ctx, a, ssp.id))).toEqual({
      otp: null,
      otp_effectif: 'SP-OTP',
      otp_source: src,
    });
    expect(trois(await activite(ctx, a, ssp.id, act.id))).toEqual({
      otp: null,
      otp_effectif: 'SP-OTP',
      otp_source: src,
    });
    const patch = await appel(ctx, a).patch(url.activite(act.id), { nom: 'Renommée' });
    expect(trois(corps(patch))).toEqual({ otp: null, otp_effectif: 'SP-OTP', otp_source: src });
  });

  it('OTP-5 : ancêtre illisible : otp_effectif renvoyé, source sans id ni libellé ; ni id ni code du parent dans la réponse', async () => {
    const a = await admin(ctx);
    const chefB = await creerActeur(ctx, 'chefb@example.test', 'chef_de_projet');
    const parent = await creerProjet(ctx, a, { code: 'SECRET-PARENT', otp: 'FIN-42' });
    const sp = await creerProjet(ctx, a, { code: 'SOUS', parent_id: parent.id, chef_id: chefB.id });
    const act = await creerActivite(ctx, a, sp.id, { nom: 'Tâche' });
    const masque = {
      otp: null,
      otp_effectif: 'FIN-42',
      otp_source: { type: 'projet', id: null, libelle: null },
    };
    // le chef B ne lit pas le parent
    expect((await appel(ctx, chefB).get(`/api/projets/${parent.id}`)).statusCode).toBe(404);
    const reponses = [
      await appel(ctx, chefB).get(`/api/projets/${sp.id}`),
      await appel(ctx, chefB).get('/api/projets'),
      await appel(ctx, chefB).get(url.activites(sp.id)),
      await appel(ctx, chefB).patch(`/api/projets/${sp.id}`, { nom: 'Sous renommé' }),
      await appel(ctx, chefB).patch(url.activite(act.id), { nom: 'Tâche 2' }),
      await appel(ctx, chefB).post(url.activites(sp.id), { nom: 'Nouvelle' }),
    ];
    for (const r of reponses) {
      expect(r.statusCode, r.body).toBeLessThan(300);
      expect(r.body).not.toContain('SECRET-PARENT');
      // otp_source ne révèle ni l'id ni le code du parent ; `parent_id` reste lu (D-079, D-226).
      const vues = ([] as Corps[]).concat(r.json() as Corps | Corps[]);
      for (const v of vues) {
        const src = v.otp_source as Corps | null;
        if (src) expect(src.id, r.body).not.toBe(parent.id);
      }
    }
    expect(trois(corps(reponses[0]!))).toEqual(masque);
    expect(trois(liste(reponses[2]!).find((x) => x.id === act.id)!)).toEqual(masque);
    expect(trois(corps(reponses[5]!))).toEqual(masque);
    // l'administrateur lit la source complète
    expect(trois(await lireProjet(ctx, a, sp.id))).toEqual({
      otp: null,
      otp_effectif: 'FIN-42',
      otp_source: { type: 'projet', id: parent.id, libelle: 'SECRET-PARENT' },
    });
  });

  it('OTP-6 : historique : modification de otp historisée, valeur inchangée non historisée, création complète', async () => {
    const a = await admin(ctx);
    const p = await creerProjet(ctx, a, { otp: 'V1' });
    const act = await creerActivite(ctx, a, p.id, { otp: 'A1' });
    await appel(ctx, a).patch(`/api/projets/${p.id}`, { otp: 'V2' });
    await appel(ctx, a).patch(`/api/projets/${p.id}`, { otp: 'V2' });
    await appel(ctx, a).patch(url.activite(act.id), { otp: null });
    const h = liste(await appel(ctx, a).get(`/api/projets/${p.id}/historique`));
    const otp = h
      .filter((e) => e.champ === 'otp')
      .map((e) => [e.entite, e.ancienne_valeur, e.nouvelle_valeur]);
    expect(otp.sort()).toEqual([
      ['activite', 'A1', null],
      ['projet', 'V1', 'V2'],
    ]);
    const creations = h.filter((e) => e.operation === 'creation');
    const crP = creations.find((e) => e.entite === 'projet')!.nouvelle_valeur as Corps;
    const crA = creations.find((e) => e.entite === 'activite')!.nouvelle_valeur as Corps;
    expect(crP.otp).toBe('V1');
    expect(crA.otp).toBe('A1');
    expect(crP).not.toHaveProperty('otp_effectif');
    expect(crA).not.toHaveProperty('otp_source');
  });

  it('OTP-7 : chef en lecture seule : PATCH otp 403, base inchangée ; rôle ressource : 404', async () => {
    const a = await admin(ctx);
    const lecteur = await creerActeur(ctx, 'lecteur@example.test', 'chef_de_projet', true);
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const p = await creerProjet(ctx, a);
    const act = await creerActivite(ctx, a, p.id);
    await affecter(ctx, p.id, lecteur.id);
    await affecter(ctx, p.id, alice.id);
    await refus(
      ctx,
      () => appel(ctx, lecteur).patch(`/api/projets/${p.id}`, { otp: 'X' }),
      403,
      'projet',
    );
    await refus(
      ctx,
      () => appel(ctx, lecteur).patch(url.activite(act.id), { otp: 'X' }),
      403,
      'activité',
    );
    await refus(
      ctx,
      () => appel(ctx, alice).patch(`/api/projets/${p.id}`, { otp: 'X' }),
      404,
      'ressource projet',
    );
    await refus(
      ctx,
      () => appel(ctx, alice).patch(url.activite(act.id), { otp: 'X' }),
      404,
      'ressource activité',
    );
    // le lecteur lit les trois clés
    expect(trois(await lireProjet(ctx, lecteur, p.id))).toEqual({
      otp: null,
      otp_effectif: null,
      otp_source: null,
    });
  });

  it('OTP-8 : copie et variantes : OTP propre copié, valeur héritée jamais écrite', async () => {
    const a = await admin(ctx);
    const p = await creerProjet(ctx, a, { code: 'SRC', otp: 'P-OTP' });
    const sp = await creerProjet(ctx, a, { code: 'S1', parent_id: p.id, otp: 'S-OTP' });
    await creerActivite(ctx, a, p.id, { nom: 'Propre', otp: 'A-OTP' });
    await creerActivite(ctx, a, p.id, { nom: 'Héritière' });
    await creerActivite(ctx, a, sp.id, { nom: 'Dans S1' });
    const copier = async (corpsCopie: Corps) => {
      const res = await appel(ctx, a).post(`/api/projets/${p.id}/copie`, {
        date_debut: '2027-02-01',
        ...corpsCopie,
      });
      expect(res.statusCode, res.body).toBe(201);
      return corps(res) as Objet;
    };
    for (const [code, estModele] of [
      ['CPY', false],
      ['MOD', true],
    ] as const) {
      const c = await copier({ nom: code, code, est_modele: estModele });
      expect((await lireProjet(ctx, a, c.id)).otp).toBe('P-OTP');
      const acts = await lireActivites(ctx, a, c.id);
      expect(acts.find((x) => x.nom === 'Propre')!.otp).toBe('A-OTP');
      expect(trois(acts.find((x) => x.nom === 'Héritière')!)).toEqual({
        otp: null,
        otp_effectif: 'P-OTP',
        otp_source: { type: 'projet', id: c.id, libelle: code },
      });
      const { rows } = await ctx.pool.query<{ otp: string | null }>(
        'SELECT otp FROM projet WHERE parent_id = $1',
        [c.id],
      );
      expect(rows).toEqual([{ otp: 'S-OTP' }]);
      const { rows: enfants } = await ctx.pool.query<{ otp: string | null }>(
        `SELECT a.otp FROM activite a JOIN element e ON e.id = a.id
          JOIN projet p ON p.id = e.projet_id WHERE p.parent_id = $1`,
        [c.id],
      );
      expect(enfants).toEqual([{ otp: null }]);
    }
    // « Créer depuis un modèle »
    const modele = liste(await appel(ctx, a).get('/api/modeles')).find((x) => x.code === 'MOD')!;
    const res = await appel(ctx, a).post(`/api/projets/${modele.id as number}/copie`, {
      nom: 'Depuis',
      code: 'DEP',
      date_debut: '2027-03-01',
    });
    expect(res.statusCode, res.body).toBe(201);
    expect((await lireProjet(ctx, a, (corps(res) as Objet).id)).otp).toBe('P-OTP');
  });

  it('OTP-9 : otpHerite (fonction pure) : plus proche, propre prioritaire, ancêtre illisible', () => {
    const chaine = [
      { type: 'activite' as const, id: 10, libelle: '1.1 B', otp: null, lisible: true },
      { type: 'activite' as const, id: 9, libelle: '1 A', otp: 'A', lisible: true },
      { type: 'projet' as const, id: 2, libelle: 'P', otp: 'P', lisible: true },
      { type: 'projet' as const, id: 1, libelle: 'R', otp: 'R', lisible: false },
    ];
    expect(otpHerite(chaine)).toEqual({
      otp: null,
      otp_effectif: 'A',
      otp_source: { type: 'activite', id: 9, libelle: '1 A' },
    });
    expect(otpHerite([{ ...chaine[0]!, otp: 'X' }, ...chaine.slice(1)])).toEqual({
      otp: 'X',
      otp_effectif: 'X',
      otp_source: null,
    });
    expect(otpHerite([chaine[0]!, chaine[3]!])).toEqual({
      otp: null,
      otp_effectif: 'R',
      otp_source: { type: 'projet', id: null, libelle: null },
    });
    expect(otpHerite([chaine[0]!])).toEqual({ otp: null, otp_effectif: null, otp_source: null });
    expect(
      otpHerite([
        { ...chaine[3]!, otp: null },
        { ...chaine[3]!, id: 0, otp: null },
      ]),
    ).toEqual({ otp: null, otp_effectif: null, otp_source: null });
  });

  it('OTP-10 : témoin : travail planifié identique avec et sans OTP', async () => {
    const a = await admin(ctx);
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const releves: unknown[] = [];
    for (const otp of [null, 'OTP-X']) {
      const p = await creerProjet(ctx, a, { otp });
      await affecter(ctx, p.id, alice.id);
      const act = await creerActivite(ctx, a, p.id, { otp });
      const asg = await creerAssignation(ctx, a, act.id, alice.id, { charge_assignee: 3 });
      const res = await calculer(ctx, a, { projets: [p.id] });
      expect(res.statusCode, res.body).toBe(200);
      releves.push(await travail(ctx, asg.id));
      await ctx.pool.query('DELETE FROM travail_planifie');
      await ctx.pool.query('DELETE FROM assignation');
      await ctx.pool.query('DELETE FROM affectation_projet');
    }
    expect(releves[1]).toEqual(releves[0]);
  });
});
