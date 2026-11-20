import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, corps, creerActeur, creerProjet } from './lot1-helpers.js';
import { url, type Objet } from './lot1-t2-helpers.js';
import { creerMonde, empreinte, tache, type Monde } from './lot2a-helpers.js';
import {
  agir,
  chargesAssignation,
  clore,
  ecrireFeuille,
  historiqueAssignation,
  idFeuille,
  imputationsEnBase,
  imputer,
  j,
  lireFeuille,
  lireFeuilleBrute,
  S1,
  S2,
  type JourFeuille,
} from './lot4a-helpers.js';

/**
 * Lot 4a : feuille de temps, PUT des imputations, règles du réel et du reste (SPEC §7 « API et
 * règles (lot 4a, D-118) », D-118 (2) à (7), (11)). Date du jour du serveur : mercredi 13/01/2027.
 */
const AUJOURDHUI = '2027-01-13';

/** P (chef `chef`) : A, Alice 5 j ; Q (chef `autreChef`, Alice affectée) : B, Alice 3 j. */
async function base(ctx: TestCtx) {
  const m = await creerMonde(ctx);
  await affecter(ctx, m.autre.id, m.alice.id);
  const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 5, { nom: 'A' });
  const b = await tache(ctx, m.autreChef, m.autre.id, m.alice.id, 3, { nom: 'B' });
  return { m, a, b };
}

/** Sept jours du lundi 11/01 (sans imputation) : ouvrés à capacité 1, week-end à 0. */
const joursVides = (lundi: number): JourFeuille[] =>
  [0, 1, 2, 3, 4, 5, 6].map((k) => ({
    jour: j(lundi + k),
    capacite: k < 5 ? 1 : 0,
    total: 0,
    depassement: false,
  }));

/** Envoi refusé : statut et code attendus, base strictement inchangée (SPEC §2). */
async function refuse(
  ctx: TestCtx,
  qui: Monde['alice'] | undefined,
  semaine: string | undefined,
  corpsEnvoye: unknown,
  statut: number,
  code?: string,
) {
  const avant = await empreinte(ctx);
  const res = await ecrireFeuille(ctx, qui, semaine, corpsEnvoye);
  expect(res.statusCode, res.body).toBe(statut);
  if (code) expect(corps(res)).toMatchObject({ code });
  expect(await empreinte(ctx)).toEqual(avant);
}

describe('Feuille de temps : GET et PUT /api/feuilles (lot 4a)', () => {
  const ctx = useTestApp(() => AUJOURDHUI);

  it('IMP-1 : feuille absente : 200, brouillon vide (id null), une ligne par assignation ouverte, 7 jours ; rien n’est écrit', async () => {
    const { m, a, b } = await base(ctx);
    const avant = await empreinte(ctx);
    const f = await lireFeuille(ctx, m.alice, S2);
    expect(f.feuille).toEqual({
      id: null,
      ressource_id: m.alice.id,
      semaine: S2,
      statut: 'brouillon',
      commentaire: null,
      validations: [],
    });
    expect(f.lignes.map((l) => l.assignation_id).sort()).toEqual(
      [a.assignation.id, b.assignation.id].sort(),
    );
    expect(f.lignes.find((l) => l.assignation_id === a.assignation.id)).toEqual({
      assignation_id: a.assignation.id,
      projet_id: m.projet.id,
      projet_code: m.projet.code,
      activite_id: a.activite.id,
      activite_nom: 'A',
      wbs: '1',
      assignee: 5,
      reel_cumule: 0,
      reste: 5,
      modifiable: true,
      imputations: [],
    });
    expect(f.jours).toEqual(joursVides(11));
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('IMP-2 : première écriture : feuille créée en brouillon, imputations, réel = 1,5, reste 5 − 1,5 = 3,5 ; réponse = GET', async () => {
    const { m, a } = await base(ctx);
    const rep = await imputer(ctx, m.alice, S2, [
      {
        assignation_id: a.assignation.id,
        imputations: [
          { jour: j(11), charge: 1 },
          { jour: j(12), charge: 0.5 },
        ],
      },
    ]);
    const id = await idFeuille(ctx, m.alice.id, S2);
    expect(id).not.toBeNull();
    expect(rep.feuille).toMatchObject({ id, statut: 'brouillon', commentaire: null });
    expect(await imputationsEnBase(ctx)).toEqual([
      { assignation_id: a.assignation.id, jour: j(11), charge: 1 },
      { assignation_id: a.assignation.id, jour: j(12), charge: 0.5 },
    ]);
    expect(await chargesAssignation(ctx, a.assignation.id)).toEqual({
      charge_assignee: 5,
      charge_reelle: 1.5,
      reste_a_faire: 3.5,
    });
    const ligne = rep.lignes.find((l) => l.assignation_id === a.assignation.id)!;
    expect(ligne).toMatchObject({
      reel_cumule: 1.5,
      reste: 3.5,
      modifiable: true,
      imputations: [
        { jour: j(11), charge: 1 },
        { jour: j(12), charge: 0.5 },
      ],
    });
    expect(rep.jours.slice(0, 2)).toEqual([
      { jour: j(11), capacite: 1, total: 1, depassement: false },
      { jour: j(12), capacite: 1, total: 0.5, depassement: false },
    ]);
    expect(await lireFeuille(ctx, m.alice, S2)).toEqual(rep);
  });

  it('IMP-3 : la ligne envoyée remplace ses imputations de la semaine ; δ négatif rend du reste ; charge 0 = pas d’imputation', async () => {
    const { m, a } = await base(ctx);
    const s = a.assignation.id;
    await imputer(ctx, m.alice, S2, [
      {
        assignation_id: s,
        imputations: [
          { jour: j(11), charge: 1 },
          { jour: j(12), charge: 0.5 },
        ],
      },
    ]);
    await imputer(ctx, m.alice, S2, [
      { assignation_id: s, imputations: [{ jour: j(11), charge: 1 }] },
    ]);
    expect(await imputationsEnBase(ctx)).toEqual([{ assignation_id: s, jour: j(11), charge: 1 }]);
    // δ = 1 − 1,5 = −0,5 : reste 3,5 + 0,5 = 4
    expect(await chargesAssignation(ctx, s)).toMatchObject({ charge_reelle: 1, reste_a_faire: 4 });
    await imputer(ctx, m.alice, S2, [
      { assignation_id: s, imputations: [{ jour: j(11), charge: 0 }] },
    ]);
    expect(await imputationsEnBase(ctx)).toEqual([]);
    expect(await chargesAssignation(ctx, s)).toMatchObject({ charge_reelle: 0, reste_a_faire: 5 });
  });

  it('IMP-4 : une ligne non envoyée est inchangée (imputations, réel, reste)', async () => {
    const { m, a, b } = await base(ctx);
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 0.5 }] },
      { assignation_id: b.assignation.id, imputations: [{ jour: j(11), charge: 0.5 }] },
    ]);
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(12), charge: 1 }] },
    ]);
    expect(await imputationsEnBase(ctx)).toEqual(
      [
        { assignation_id: a.assignation.id, jour: j(12), charge: 1 },
        { assignation_id: b.assignation.id, jour: j(11), charge: 0.5 },
      ].sort((x, y) => x.assignation_id - y.assignation_id),
    );
    expect(await chargesAssignation(ctx, b.assignation.id)).toMatchObject({
      charge_reelle: 0.5,
      reste_a_faire: 2.5,
    });
  });

  it('IMP-5 : réel = somme de toutes les imputations de l’assignation (deux semaines) ; la feuille ne montre que celles de sa semaine', async () => {
    const { m, a } = await base(ctx);
    const s = a.assignation.id;
    await imputer(ctx, m.alice, S1, [
      { assignation_id: s, imputations: [{ jour: j(4), charge: 1 }] },
    ]);
    await imputer(ctx, m.alice, S2, [
      { assignation_id: s, imputations: [{ jour: j(11), charge: 1 }] },
    ]);
    expect(await chargesAssignation(ctx, s)).toMatchObject({ charge_reelle: 2, reste_a_faire: 3 });
    const f = await lireFeuille(ctx, m.alice, S2);
    expect(f.lignes.find((l) => l.assignation_id === s)).toMatchObject({
      reel_cumule: 2,
      reste: 3,
      imputations: [{ jour: j(11), charge: 1 }],
    });
    // le PUT de S2 ne touche pas S1
    expect((await imputationsEnBase(ctx)).map((i) => i.jour)).toEqual([j(4), j(11)]);
  });

  it('IMP-6 : `reste` envoyé prime sur le calcul par δ, avec ou sans changement des imputations', async () => {
    const { m, a } = await base(ctx);
    const s = a.assignation.id;
    await imputer(ctx, m.alice, S2, [
      { assignation_id: s, imputations: [{ jour: j(11), charge: 1 }], reste: 2 },
    ]);
    expect(await chargesAssignation(ctx, s)).toMatchObject({ charge_reelle: 1, reste_a_faire: 2 });
    await imputer(ctx, m.alice, S2, [
      { assignation_id: s, imputations: [{ jour: j(11), charge: 1 }], reste: 6.25 },
    ]);
    expect(await chargesAssignation(ctx, s)).toMatchObject({
      charge_reelle: 1,
      reste_a_faire: 6.25,
    });
    await imputer(ctx, m.alice, S2, [
      { assignation_id: s, imputations: [{ jour: j(11), charge: 1 }], reste: 0 },
    ]);
    expect(await chargesAssignation(ctx, s)).toMatchObject({ charge_reelle: 1, reste_a_faire: 0 });
  });

  it('IMP-7 : reste plancher à 0 : assigné 1 j, 1,5 j imputés → réel 1,5, reste 0', async () => {
    const m = await creerMonde(ctx);
    const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1);
    await imputer(ctx, m.alice, S2, [
      {
        assignation_id: a.assignation.id,
        imputations: [
          { jour: j(11), charge: 1 },
          { jour: j(12), charge: 0.5 },
        ],
      },
    ]);
    expect(await chargesAssignation(ctx, a.assignation.id)).toEqual({
      charge_assignee: 1,
      charge_reelle: 1.5,
      reste_a_faire: 0,
    });
  });

  it('IMP-8 : historique : le reste modifié est historisé (auteur = la ressource) ; ni charge_reelle ni imputation ; reste inchangé : aucune entrée', async () => {
    const { m, a } = await base(ctx);
    const s = a.assignation.id;
    const avant = (await historiqueAssignation(ctx, s)).length;
    await imputer(ctx, m.alice, S2, [
      { assignation_id: s, imputations: [{ jour: j(11), charge: 1.5 }] },
    ]);
    const apres = (await historiqueAssignation(ctx, s)).slice(avant);
    expect(apres).toEqual([
      {
        operation: 'modification',
        champ: 'reste_a_faire',
        utilisateur_id: m.alice.id,
        ancienne_valeur: 5,
        nouvelle_valeur: 3.5,
      },
    ]);
    const { rows } = await ctx.pool.query<{ n: string }>(
      "SELECT count(*) AS n FROM historique WHERE champ = 'charge_reelle'",
    );
    expect(Number(rows[0]!.n)).toBe(0);
    // reste envoyé égal au reste actuel, imputations inchangées : aucune entrée nouvelle
    await imputer(ctx, m.alice, S2, [
      { assignation_id: s, imputations: [{ jour: j(11), charge: 1.5 }], reste: 3.5 },
    ]);
    expect((await historiqueAssignation(ctx, s)).slice(avant)).toHaveLength(1);
  });

  it('IMP-9 : jour chômé (samedi) et jour hors des dates d’affectation acceptés ; samedi : capacité 0, dépassement', async () => {
    const { m, a } = await base(ctx);
    await ctx.pool.query(
      "UPDATE affectation_projet SET date_debut = '2027-01-04', date_fin = '2027-01-05' WHERE projet_id = $1 AND ressource_id = $2",
      [m.projet.id, m.alice.id],
    );
    const f = await imputer(ctx, m.alice, S1, [
      {
        assignation_id: a.assignation.id,
        imputations: [
          { jour: j(7), charge: 1 },
          { jour: j(9), charge: 0.5 },
        ],
      },
    ]);
    expect(await imputationsEnBase(ctx)).toHaveLength(2);
    expect(f.jours[5]).toEqual({ jour: j(9), capacite: 0, total: 0.5, depassement: true });
    expect(f.jours[3]).toEqual({ jour: j(7), capacite: 1, total: 1, depassement: false });
  });

  it('IMP-10 : total du jour sur toutes les lignes ; dépassement = total > capacité, non bloquant ; jour férié : capacité 0', async () => {
    const { m, a, b } = await base(ctx);
    const { rows } = await ctx.pool.query<{ id: number }>(
      'SELECT calendrier_id AS id FROM utilisateur WHERE id = $1',
      [m.alice.id],
    );
    await ctx.pool.query('INSERT INTO calendrier_ferie (calendrier_id, jour) VALUES ($1, $2)', [
      rows[0]!.id,
      j(12),
    ]);
    const f = await imputer(ctx, m.alice, S2, [
      {
        assignation_id: a.assignation.id,
        imputations: [
          { jour: j(11), charge: 1 },
          { jour: j(13), charge: 0.5 },
        ],
      },
      {
        assignation_id: b.assignation.id,
        imputations: [
          { jour: j(11), charge: 0.5 },
          { jour: j(13), charge: 0.5 },
        ],
      },
    ]);
    expect(f.jours.slice(0, 3)).toEqual([
      { jour: j(11), capacite: 1, total: 1.5, depassement: true },
      { jour: j(12), capacite: 0, total: 0, depassement: false },
      { jour: j(13), capacite: 1, total: 1, depassement: false },
    ]);
  });

  it('IMP-11 : lignes : activité ouverte, projet et ancêtres non clos, hors modèle ; tri par code du projet sans casse puis ordre WBS', async () => {
    const m = await creerMonde(ctx);
    const projet = async (code: string, champs: Record<string, unknown> = {}) => {
      const p = await creerProjet(ctx, m.admin, { code, chef_id: m.chef.id, ...champs });
      await affecter(ctx, p.id, m.alice.id);
      await affecter(ctx, p.id, m.bob.id);
      return p;
    };
    const pb = await projet('b-proj');
    const pa = await projet('A-PROJ');
    const pc = await projet('C-CLOS');
    const parent = await projet('E-PAR');
    const sous = await projet('D-SOUS', { parent_id: parent.id });
    const x = await tache(ctx, m.chef, pb.id, m.alice.id, 1, { nom: 'X' });
    const y = await tache(ctx, m.chef, pb.id, m.alice.id, 1, { nom: 'Y' });
    // Y passe en tête du WBS : l'ordre des identifiants n'est plus celui du WBS
    expect(
      (await appel(ctx, m.chef).post(url.deplacer(y.activite.id), { parent_id: null, rang: 1 }))
        .statusCode,
    ).toBe(200);
    const z = await tache(ctx, m.chef, pa.id, m.alice.id, 1, { nom: 'Z' });
    const w = await tache(ctx, m.chef, pb.id, m.alice.id, 1, { nom: 'W' });
    await clore(ctx, m.chef, w.activite.id);
    await tache(ctx, m.chef, pb.id, m.bob.id, 1, { nom: 'Bob' });
    await tache(ctx, m.chef, pc.id, m.alice.id, 1, { nom: 'Clos' });
    await tache(ctx, m.chef, sous.id, m.alice.id, 1, { nom: 'Sous' });
    // données antérieures à D-083 (7) : projet clos et ancêtre clos posés en base
    await ctx.pool.query('UPDATE projet SET clos = true WHERE id = ANY($1)', [[pc.id, parent.id]]);
    const res = await appel(ctx, m.admin).post(`/api/projets/${pa.id}/copie`, {
      nom: 'Modèle',
      code: 'AA-MOD',
      date_debut: '2027-01-04',
      est_modele: true,
    });
    expect(res.statusCode, res.body).toBe(201);
    const f = await lireFeuille(ctx, m.alice, S2);
    expect(f.lignes.map((l) => [l.projet_code, l.activite_nom, l.wbs, l.modifiable])).toEqual([
      ['A-PROJ', 'Z', '1', true],
      ['b-proj', 'Y', '1', true],
      ['b-proj', 'X', '2', true],
    ]);
    expect(f.lignes[0]!.assignation_id).toBe(z.assignation.id);
    expect(f.lignes[2]!.assignation_id).toBe(x.assignation.id);
  });

  it('IMP-12 : une assignation fermée qui porte une imputation dans la semaine reste une ligne, `modifiable: false` ; absente des autres semaines', async () => {
    const { m, a } = await base(ctx);
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] },
    ]);
    await clore(ctx, m.chef, a.activite.id);
    const f = await lireFeuille(ctx, m.alice, S2);
    expect(f.lignes.find((l) => l.assignation_id === a.assignation.id)).toMatchObject({
      modifiable: false,
      imputations: [{ jour: j(11), charge: 1 }],
    });
    const autre = await lireFeuille(ctx, m.alice, S1);
    expect(autre.lignes.map((l) => l.assignation_id)).not.toContain(a.assignation.id);
  });

  it('IMP-13 : ligne fermée (activité close) : charges inchangées → 200 sans écriture ; charges modifiées → 422 ligne_fermee, base inchangée', async () => {
    const { m, a, b } = await base(ctx);
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] },
    ]);
    await clore(ctx, m.chef, a.activite.id);
    await clore(ctx, m.autreChef, b.activite.id);
    const avant = await empreinte(ctx);
    const res = await ecrireFeuille(ctx, m.alice, S2, {
      lignes: [{ assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] }],
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(await empreinte(ctx)).toEqual(avant);
    await refuse(
      ctx,
      m.alice,
      S2,
      {
        lignes: [{ assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 0.5 }] }],
      },
      422,
      'ligne_fermee',
    );
    await refuse(
      ctx,
      m.alice,
      S2,
      { lignes: [{ assignation_id: b.assignation.id, imputations: [{ jour: j(11), charge: 1 }] }] },
      422,
      'ligne_fermee',
    );
  });

  it('IMP-14 : ligne fermée par le projet clos, un ancêtre clos ou un modèle : 422 ligne_fermee, base inchangée', async () => {
    const { m, a } = await base(ctx);
    const sous = await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: m.projet.id });
    await affecter(ctx, sous.id, m.alice.id);
    const t = await tache(ctx, m.chef, sous.id, m.alice.id, 1);
    const res = await appel(ctx, m.admin).post(`/api/projets/${m.projet.id}/copie`, {
      nom: 'Modèle',
      code: 'MOD',
      date_debut: '2027-01-04',
      est_modele: true,
      sous_projets: false,
    });
    expect(res.statusCode, res.body).toBe(201);
    const { rows } = await ctx.pool.query<{ id: number }>(
      'SELECT id FROM assignation WHERE projet_id = $1 AND ressource_id = $2',
      [(corps(res) as Objet).id, m.alice.id],
    );
    const ligne = (id: number) => ({
      lignes: [{ assignation_id: id, imputations: [{ jour: j(11), charge: 1 }] }],
    });
    await refuse(ctx, m.alice, S2, ligne(rows[0]!.id), 422, 'ligne_fermee');
    await ctx.pool.query('UPDATE projet SET clos = true WHERE id = $1', [m.projet.id]);
    await refuse(ctx, m.alice, S2, ligne(a.assignation.id), 422, 'ligne_fermee');
    await refuse(ctx, m.alice, S2, ligne(t.assignation.id), 422, 'ligne_fermee');
  });

  it('IMP-15 : assignation inconnue ou d’une autre ressource : 422 assignation_invalide, base inchangée', async () => {
    const { m } = await base(ctx);
    const bob = await tache(ctx, m.chef, m.projet.id, m.bob.id, 2);
    const ligne = (id: number) => ({
      lignes: [{ assignation_id: id, imputations: [{ jour: j(11), charge: 1 }] }],
    });
    await refuse(ctx, m.alice, S2, ligne(bob.assignation.id), 422, 'assignation_invalide');
    await refuse(ctx, m.alice, S2, ligne(999999), 422, 'assignation_invalide');
  });

  it('IMP-16 : jour postérieur à la date du jour du serveur : 422 jour_futur, base inchangée ; le jour même est accepté', async () => {
    const { m, a } = await base(ctx);
    await refuse(
      ctx,
      m.alice,
      S2,
      { lignes: [{ assignation_id: a.assignation.id, imputations: [{ jour: j(14), charge: 1 }] }] },
      422,
      'jour_futur',
    );
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(13), charge: 1 }] },
    ]);
  });

  it('IMP-17 : feuille soumise ou validée : 422 feuille_verrouillee, base inchangée', async () => {
    const { m, a } = await base(ctx);
    const corpsEnvoye = {
      lignes: [{ assignation_id: a.assignation.id, imputations: [{ jour: j(12), charge: 1 }] }],
    };
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] },
    ]);
    const id = (await idFeuille(ctx, m.alice.id, S2))!;
    await agir(ctx, m.alice, id, 'soumettre');
    await refuse(ctx, m.alice, S2, corpsEnvoye, 422, 'feuille_verrouillee');
    await agir(ctx, m.chef, id, 'valider');
    expect((await lireFeuille(ctx, m.alice, S2)).feuille.statut).toBe('validee');
    await refuse(ctx, m.alice, S2, corpsEnvoye, 422, 'feuille_verrouillee');
  });

  it('IMP-18 : 400 : semaine absente, mal formée, pas un lundi, hors 2000–2099 ; corps invalide ; jour hors semaine ; doublons ; charge ou reste hors bornes ou à plus de 2 décimales ; base inchangée', async () => {
    const { m, a } = await base(ctx);
    const s = a.assignation.id;
    const ok = { lignes: [{ assignation_id: s, imputations: [{ jour: j(11), charge: 1 }] }] };
    for (const semaine of [
      undefined,
      '2027-1-11',
      '2027-01-12',
      'abc',
      '1999-12-27',
      '2100-01-04',
    ]) {
      await refuse(ctx, m.alice, semaine, ok, 400);
    }
    const ligne = (imputations: unknown, extra: Record<string, unknown> = {}) => ({
      lignes: [{ assignation_id: s, imputations, ...extra }],
    });
    const corpsInvalides: unknown[] = [
      {},
      { lignes: 'x' },
      { ...ok, autre: 1 },
      { lignes: [{ assignation_id: s }] },
      { lignes: [{ assignation_id: 'a', imputations: [] }] },
      { lignes: [{ assignation_id: s, imputations: [], cle: 1 }] },
      ligne([{ jour: j(11), charge: 1, cle: 1 }]),
      ligne([{ jour: '2027-01-18', charge: 1 }]),
      ligne([{ jour: j(10), charge: 1 }]),
      ligne([{ jour: '11/01/2027', charge: 1 }]),
      ligne([
        { jour: j(11), charge: 1 },
        { jour: j(11), charge: 0.5 },
      ]),
      {
        lignes: [
          { assignation_id: s, imputations: [{ jour: j(11), charge: 1 }] },
          { assignation_id: s, imputations: [{ jour: j(12), charge: 1 }] },
        ],
      },
      ligne([{ jour: j(11), charge: -1 }]),
      ligne([{ jour: j(11), charge: 10.01 }]),
      ligne([{ jour: j(11), charge: 0.333 }]),
      ligne([{ jour: j(11), charge: '1' }]),
      ligne([{ jour: j(11), charge: 1 }], { reste: -1 }),
      ligne([{ jour: j(11), charge: 1 }], { reste: 1.234 }),
    ];
    for (const c of corpsInvalides) await refuse(ctx, m.alice, S2, c, 400);
  });

  it('IMP-19 : bornes acceptées : charge 10 et 0,01, reste 0', async () => {
    const { m, a } = await base(ctx);
    await imputer(ctx, m.alice, S2, [
      {
        assignation_id: a.assignation.id,
        imputations: [
          { jour: j(11), charge: 10 },
          { jour: j(12), charge: 0.01 },
        ],
        reste: 0,
      },
    ]);
    expect(await chargesAssignation(ctx, a.assignation.id)).toMatchObject({
      charge_reelle: 10.01,
      reste_a_faire: 0,
    });
  });

  it('IMP-20 : sans session : GET et PUT 401, base inchangée', async () => {
    const { a } = await base(ctx);
    expect((await lireFeuilleBrute(ctx, undefined, S2)).statusCode).toBe(401);
    await refuse(
      ctx,
      undefined,
      S2,
      { lignes: [{ assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] }] },
      401,
    );
  });

  it('IMP-21 : ordre des refus : 401, 400, puis assignation_invalide, ligne_fermee, jour_futur, feuille_verrouillee', async () => {
    const { m, a, b } = await base(ctx);
    const bob = await tache(ctx, m.chef, m.projet.id, m.bob.id, 2);
    const ferme = await tache(ctx, m.chef, m.projet.id, m.alice.id, 2);
    await clore(ctx, m.chef, ferme.activite.id);
    const l = (id: number, jour: string, charge = 1) => ({
      assignation_id: id,
      imputations: [{ jour, charge }],
    });
    await refuse(ctx, undefined, '2027-01-12', { lignes: 'x' }, 401);
    await refuse(ctx, m.alice, S2, { lignes: [l(bob.assignation.id, j(11), -1)] }, 400);
    await imputer(ctx, m.alice, S2, [l(a.assignation.id, j(11))]);
    const id = (await idFeuille(ctx, m.alice.id, S2))!;
    await agir(ctx, m.alice, id, 'soumettre');
    await refuse(
      ctx,
      m.alice,
      S2,
      { lignes: [l(ferme.assignation.id, j(14)), l(bob.assignation.id, j(11))] },
      422,
      'assignation_invalide',
    );
    await refuse(
      ctx,
      m.alice,
      S2,
      { lignes: [l(b.assignation.id, j(14)), l(ferme.assignation.id, j(11))] },
      422,
      'ligne_fermee',
    );
    await refuse(ctx, m.alice, S2, { lignes: [l(b.assignation.id, j(14))] }, 422, 'jour_futur');
  });

  it('IMP-22 : feuille d’autrui : administrateur toutes les lignes ; chef les lignes de ses projets ; ressource ou chef sans projet de la feuille : 404', async () => {
    const { m, a, b } = await base(ctx);
    const tiers = await creerActeur(ctx, 'tiers@example.test', 'chef_de_projet');
    await creerProjet(ctx, m.admin, { chef_id: tiers.id });
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] },
      { assignation_id: b.assignation.id, imputations: [{ jour: j(12), charge: 1 }] },
    ]);
    const ids = async (qui: Monde['alice']) =>
      (await lireFeuille(ctx, qui, S2, m.alice.id)).lignes.map((l) => l.assignation_id).sort();
    expect(await ids(m.admin)).toEqual([a.assignation.id, b.assignation.id].sort());
    expect(await ids(m.chef)).toEqual([a.assignation.id]);
    expect(await ids(m.autreChef)).toEqual([b.assignation.id]);
    expect((await lireFeuille(ctx, m.chef, S2, m.alice.id)).feuille).toMatchObject({
      ressource_id: m.alice.id,
      statut: 'brouillon',
    });
    for (const qui of [m.bob, tiers]) {
      expect((await lireFeuilleBrute(ctx, qui, S2, m.alice.id)).statusCode).toBe(404);
    }
    expect(await lireFeuille(ctx, m.alice, S2, m.alice.id)).toEqual(
      await lireFeuille(ctx, m.alice, S2),
    );
  });

  it('IMP-23 : GET semaine invalide : 400', async () => {
    const { m } = await base(ctx);
    for (const semaine of [undefined, '2027-01-12', '1999-12-27', '2100-01-04', 'x']) {
      expect((await lireFeuilleBrute(ctx, m.alice, semaine)).statusCode).toBe(400);
    }
  });

  it('IMP-24 : suppression d’une assignation à réel > 0 : 409, imputations et feuille inchangées (D-118 (11))', async () => {
    const { m, a } = await base(ctx);
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] },
    ]);
    const avant = await empreinte(ctx);
    const res = await appel(ctx, m.chef).delete(url.assignation(a.assignation.id));
    expect(res.statusCode).toBe(409);
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('IMP-25 : copie de projet : aucune imputation copiée, réel 0 et reste = assigné sur la copie (D-118 (11))', async () => {
    const { m, a } = await base(ctx);
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] },
    ]);
    const res = await appel(ctx, m.chef).post(`/api/projets/${m.projet.id}/copie`, {
      nom: 'Copie',
      code: 'CIBLE',
      date_debut: '2027-02-01',
    });
    expect(res.statusCode, res.body).toBe(201);
    const copie = corps(res) as Objet;
    const { rows } = await ctx.pool.query<{
      id: number;
      charge_reelle: number;
      reste_a_faire: number;
    }>('SELECT id, charge_reelle, reste_a_faire FROM assignation WHERE projet_id = $1', [copie.id]);
    expect(rows).toEqual([{ id: rows[0]!.id, charge_reelle: 0, reste_a_faire: 5 }]);
    expect(await imputationsEnBase(ctx)).toEqual([
      { assignation_id: a.assignation.id, jour: j(11), charge: 1 },
    ]);
  });
});
