import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { affecter, appel, creerActeur } from './lot1-helpers.js';
import { creerActivite, creerAssignation, url } from './lot1-t2-helpers.js';
import { creerMonde, empreinte, tache } from './lot2a-helpers.js';
import {
  activiteMan,
  apresMidi,
  ecrireSaisies,
  historique,
  journee,
  JANV,
  lireSaisies,
  matin,
  poser,
  saisiesEnBase,
} from './lot2e-helpers.js';

/**
 * Lot 2e-I : API de saisie manuelle, GET et PUT /api/activites/:id/saisies?mois=AAAA-MM
 * (SPEC §3, D-058). Jeu de données de SPEC 5.5 : projet P (début lundi 04/01/2027), Alice et Bob affectées.
 */
const J04 = '2027-01-04';
const J05 = '2027-01-05';
const J06 = '2027-01-06';
const J07 = '2027-01-07';

describe('Saisies manuelles : GET et PUT /api/activites/:id/saisies (lot 2e-I)', () => {
  const ctx = useTestApp();

  /** Un PUT refusé : statut attendu, base strictement identique. */
  async function putRefuse(
    qui: Parameters<typeof ecrireSaisies>[1],
    activiteId: number,
    mois: string | undefined,
    corps: unknown,
    statut: number,
    nom: string,
  ): Promise<void> {
    const avant = await empreinte(ctx);
    const res = await ecrireSaisies(ctx, qui, activiteId, mois, corps);
    expect(res.statusCode, `${nom} : ${res.body}`).toBe(statut);
    expect(await empreinte(ctx), `${nom} : base modifiée`).toEqual(avant);
  }

  it('SAI-1 : GET sans saisie → 200 { mois, saisies: [] }, pour une activité MAN et pour une activité ASAP', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const asap = await tache(ctx, m.chef, m.projet.id, m.alice.id, 2);
    for (const id of [man.activite.id, asap.activite.id]) {
      const res = await lireSaisies(ctx, m.chef, id, JANV);
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ mois: JANV, saisies: [] });
    }
  });

  it('SAI-2 : PUT de 4 saisies envoyées en désordre → 200 ; PUT et GET rendent la même liste triée (jour, matin avant après-midi) ; 4 lignes en base', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const a = assignation.id;
    const attendu = {
      mois: JANV,
      saisies: [matin(a, J05), apresMidi(a, J05), matin(a, J06), apresMidi(a, J06)],
    };
    const put = await ecrireSaisies(ctx, m.chef, activite.id, JANV, {
      saisies: [apresMidi(a, J06), matin(a, J05), matin(a, J06), apresMidi(a, J05)],
    });
    expect(put.statusCode, put.body).toBe(200);
    expect(put.json()).toEqual(attendu);
    const get = await lireSaisies(ctx, m.chef, activite.id, JANV);
    expect(get.statusCode).toBe(200);
    expect(get.json()).toEqual(attendu);
    expect(await saisiesEnBase(ctx)).toEqual(attendu.saisies);
  });

  it('SAI-3 : PUT du mois de janvier remplace janvier et laisse décembre et février intacts', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 3);
    const a = assignation.id;
    await poser(ctx, m.chef, activite.id, '2026-12', [matin(a, '2026-12-28')]);
    await poser(ctx, m.chef, activite.id, JANV, [matin(a, J05), matin(a, J06)]);
    await poser(ctx, m.chef, activite.id, '2027-02', [matin(a, '2027-02-01')]);
    await poser(ctx, m.chef, activite.id, JANV, [apresMidi(a, J07)]);
    expect(await saisiesEnBase(ctx)).toEqual([
      matin(a, '2026-12-28'),
      apresMidi(a, J07),
      matin(a, '2027-02-01'),
    ]);
    const get = await lireSaisies(ctx, m.chef, activite.id, JANV);
    expect(get.json()).toEqual({ mois: JANV, saisies: [apresMidi(a, J07)] });
    const dec = await lireSaisies(ctx, m.chef, activite.id, '2026-12');
    expect(dec.json()).toEqual({ mois: '2026-12', saisies: [matin(a, '2026-12-28')] });
  });

  it('SAI-4 : PUT { saisies: [] } efface le mois et laisse les autres mois', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const a = assignation.id;
    await poser(ctx, m.chef, activite.id, JANV, [...journee(a, J05)]);
    await poser(ctx, m.chef, activite.id, '2027-02', [matin(a, '2027-02-01')]);
    const put = await ecrireSaisies(ctx, m.chef, activite.id, JANV, { saisies: [] });
    expect(put.statusCode, put.body).toBe(200);
    expect(put.json()).toEqual({ mois: JANV, saisies: [] });
    expect(await saisiesEnBase(ctx)).toEqual([matin(a, '2027-02-01')]);
  });

  it('SAI-5 : deux assignations d’une même activité : liste triée par assignation puis jour ; le PUT remplace les saisies des deux, pas celles d’une autre activité', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation: alice } = await activiteMan(
      ctx,
      m.chef,
      m.projet.id,
      m.alice.id,
      2,
    );
    const bob = await creerAssignation(ctx, m.chef, activite.id, m.bob.id, { charge_assignee: 1 });
    const autre = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    await poser(ctx, m.chef, autre.activite.id, JANV, [matin(autre.assignation.id, J05)]);
    const put = await ecrireSaisies(ctx, m.chef, activite.id, JANV, {
      saisies: [
        matin(bob.id, J04),
        matin(alice.id, J06),
        apresMidi(bob.id, J04),
        matin(alice.id, J05),
      ],
    });
    expect(put.statusCode, put.body).toBe(200);
    const trie = [
      matin(alice.id, J05),
      matin(alice.id, J06),
      matin(bob.id, J04),
      apresMidi(bob.id, J04),
    ];
    expect(put.json()).toEqual({ mois: JANV, saisies: trie });
    expect((await lireSaisies(ctx, m.chef, activite.id, JANV)).json()).toEqual({
      mois: JANV,
      saisies: trie,
    });
    const remplace = await ecrireSaisies(ctx, m.chef, activite.id, JANV, {
      saisies: [matin(alice.id, J07)],
    });
    expect(remplace.statusCode, remplace.body).toBe(200);
    expect(await saisiesEnBase(ctx)).toEqual(
      [matin(alice.id, J07), matin(autre.assignation.id, J05)].sort(
        (x, y) => x.assignation_id - y.assignation_id,
      ),
    );
  });

  it('SAI-6 : sans session → 401 (GET et PUT) ; activité inconnue → 404 (GET et PUT) ; base inchangée après chaque PUT refusé', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const corps = { saisies: [matin(assignation.id, J05)] };
    expect((await lireSaisies(ctx, undefined, activite.id, JANV)).statusCode).toBe(401);
    await putRefuse(undefined, activite.id, JANV, corps, 401, 'PUT sans session');
    expect((await lireSaisies(ctx, m.admin, 999999, JANV)).statusCode).toBe(404);
    await putRefuse(m.admin, 999999, JANV, corps, 404, 'PUT activité inconnue');
  });

  it('SAI-7-r1 : droits. GET : administrateur et chef 200 ; ressource affectée, chef d’un autre projet et ressource non affectée 404. PUT : ressource affectée 404, non affectée 404, chef d’un autre projet 404 ; base inchangée', async () => {
    const m = await creerMonde(ctx);
    const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const a = assignation.id;
    await poser(ctx, m.chef, activite.id, JANV, [matin(a, J05)]);
    for (const [nom, qui] of [
      ['administrateur', m.admin],
      ['chef', m.chef],
    ] as const) {
      const res = await lireSaisies(ctx, qui, activite.id, JANV);
      expect(res.statusCode, `GET ${nom}`).toBe(200);
      expect(res.json(), `GET ${nom}`).toEqual({ mois: JANV, saisies: [matin(a, J05)] });
    }
    // Révision 6b (D-031, D-148 (2)) : la ressource affectée ne lit plus les saisies → 404.
    for (const [nom, qui] of [
      ['ressource affectée', m.alice],
      ['chef d’un autre projet', m.autreChef],
      ['ressource non affectée', carole],
    ] as const) {
      expect((await lireSaisies(ctx, qui, activite.id, JANV)).statusCode, `GET ${nom}`).toBe(404);
    }
    const corps = { saisies: [matin(a, J06)] };
    await putRefuse(m.alice, activite.id, JANV, corps, 404, 'PUT ressource affectée');
    await putRefuse(carole, activite.id, JANV, corps, 404, 'PUT ressource non affectée');
    await putRefuse(m.autreChef, activite.id, JANV, corps, 404, 'PUT chef d’un autre projet');
    // témoins : l'administrateur et le chef écrivent
    for (const qui of [m.admin, m.chef]) {
      expect((await ecrireSaisies(ctx, qui, activite.id, JANV, corps)).statusCode).toBe(200);
    }
  });

  it('SAI-8 : 400 pour un mois invalide, un corps invalide, un jour hors du mois ou un doublon ; base inchangée', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const a = assignation.id;
    await poser(ctx, m.chef, activite.id, JANV, [matin(a, J05)]);
    const valide = { saisies: [matin(a, J06)] };
    const id = activite.id;
    const cas: [string, string | undefined, unknown][] = [
      ['mois absent', undefined, valide],
      ['mois 2027-13', '2027-13', valide],
      ['mois 2027-00', '2027-00', valide],
      ['mois 2027-1', '2027-1', valide],
      ['mois 27-01', '27-01', valide],
      ['mois texte', 'janvier', valide],
      ['saisies absente', JANV, {}],
      ['saisies non tableau', JANV, { saisies: 'x' }],
      ['clé inconnue dans le corps', JANV, { saisies: [], extra: 1 }],
      ['clé inconnue dans une saisie', JANV, { saisies: [{ ...matin(a, J06), charge: 0.5 }] }],
      ['demi_journee invalide', JANV, { saisies: [{ ...matin(a, J06), demi_journee: 'midi' }] }],
      ['demi_journee absente', JANV, { saisies: [{ assignation_id: a, jour: J06 }] }],
      ['assignation_id texte', JANV, { saisies: [{ ...matin(a, J06), assignation_id: 'x' }] }],
      ['jour mal formé', JANV, { saisies: [{ ...matin(a, J06), jour: '2027-1-6' }] }],
      ['jour impossible', JANV, { saisies: [{ ...matin(a, J06), jour: '2027-02-30' }] }],
      ['jour 2027-01-32', JANV, { saisies: [{ ...matin(a, J06), jour: '2027-01-32' }] }],
      ['assignation_id 0', JANV, { saisies: [{ ...matin(a, J06), assignation_id: 0 }] }],
      ['assignation_id 1.5', JANV, { saisies: [{ ...matin(a, J06), assignation_id: 1.5 }] }],
      ['jour du mois suivant', JANV, { saisies: [matin(a, '2027-02-01')] }],
      ['jour du mois précédent', JANV, { saisies: [matin(a, '2026-12-31')] }],
      ['doublon dans le corps', JANV, { saisies: [matin(a, J06), matin(a, J06)] }],
    ];
    for (const [nom, mois, corps] of cas) {
      await putRefuse(m.chef, id, mois, corps, 400, nom);
    }
    expect((await lireSaisies(ctx, m.chef, id, '2027-13')).statusCode).toBe(400);
    expect((await lireSaisies(ctx, m.chef, id)).statusCode).toBe(400);
    expect(await saisiesEnBase(ctx)).toEqual([matin(a, J05)]);
  });

  it('SAI-9 : 422 pour une activité ASAP, un parent MAN, une activité MAN close, ou l’assignation d’une autre activité ; base inchangée', async () => {
    const m = await creerMonde(ctx);
    const asap = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const parent = await creerActivite(ctx, m.chef, m.projet.id, { mode: 'MAN' });
    const enfant = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1, {
      parent_id: parent.id,
    });
    const close = await activiteMan(ctx, m.chef, m.projet.id, m.bob.id, 1);
    const closePatch = await appel(ctx, m.chef).patch(url.activite(close.activite.id), {
      close: true,
    });
    expect(closePatch.statusCode).toBe(200);
    const un = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const deux = await activiteMan(ctx, m.chef, m.projet.id, m.bob.id, 1);
    await poser(ctx, m.chef, deux.activite.id, JANV, [matin(deux.assignation.id, J06)]);

    await putRefuse(
      m.chef,
      asap.activite.id,
      JANV,
      { saisies: [matin(asap.assignation.id, J05)] },
      422,
      'activité ASAP',
    );
    await putRefuse(m.chef, asap.activite.id, JANV, { saisies: [] }, 422, 'activité ASAP, vide');
    await putRefuse(m.chef, parent.id, JANV, { saisies: [] }, 422, 'parent MAN');
    await putRefuse(
      m.chef,
      parent.id,
      JANV,
      { saisies: [matin(enfant.assignation.id, J05)] },
      422,
      'parent MAN, assignation de l’enfant',
    );
    await putRefuse(
      m.chef,
      close.activite.id,
      JANV,
      { saisies: [matin(close.assignation.id, J05)] },
      422,
      'activité MAN close',
    );
    await putRefuse(
      m.chef,
      close.activite.id,
      JANV,
      { saisies: [] },
      422,
      'activité MAN close, vide',
    );
    await putRefuse(
      m.chef,
      un.activite.id,
      JANV,
      { saisies: [matin(deux.assignation.id, J05)] },
      422,
      'assignation d’une autre activité',
    );
    // une saisie valide et une saisie d'une autre activité : rien n'est écrit
    await putRefuse(
      m.chef,
      un.activite.id,
      JANV,
      { saisies: [matin(un.assignation.id, J05), matin(deux.assignation.id, J05)] },
      422,
      'saisie valide et saisie d’une autre activité',
    );
    expect(await saisiesEnBase(ctx)).toEqual([matin(deux.assignation.id, J06)]);
  });

  it('SAI-10-r1 : ordre des refus 401, 404, 403, 400, 422 ; ressource affectée 404 ; base inchangée', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const asap = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const invalide = { saisies: 'x' };
    const valideAsap = { saisies: [matin(asap.assignation.id, J05)] };
    await putRefuse(undefined, man.activite.id, '2027-13', invalide, 401, '401 avant 404 et 400');
    await putRefuse(m.chef, 999999, '2027-13', invalide, 404, '404 avant 400');
    await putRefuse(m.autreChef, man.activite.id, '2027-13', invalide, 404, '404 avant 403 et 400');
    // Révision 6b (D-031, D-148 (2), (9)) : la ressource affectée reçoit 404 ; l'ordre 403 est vérifié
    // avec un chef de projet affecté au projet d'un autre chef (lecture seule).
    await putRefuse(m.alice, man.activite.id, '2027-13', invalide, 404, 'ressource affectée : 404');
    const lecteur = await creerActeur(ctx, 'lecteur@example.test', 'chef_de_projet', true);
    await affecter(ctx, m.projet.id, lecteur.id);
    await putRefuse(lecteur, man.activite.id, '2027-13', invalide, 403, '403 avant 400');
    await putRefuse(lecteur, asap.activite.id, JANV, valideAsap, 403, '403 avant 422');
    await putRefuse(m.chef, asap.activite.id, JANV, invalide, 400, '400 corps avant 422');
    await putRefuse(m.chef, asap.activite.id, '2027-13', valideAsap, 400, '400 mois avant 422');
    await putRefuse(m.chef, asap.activite.id, JANV, valideAsap, 422, '422 en dernier');
  });

  it('SAI-11 : un PUT, y compris le PUT vide, n’écrit aucune entrée d’historique', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const avant = await historique(ctx);
    expect(avant.length).toBeGreaterThan(0);
    await poser(ctx, m.chef, activite.id, JANV, [...journee(assignation.id, J05)]);
    expect(await saisiesEnBase(ctx)).toHaveLength(2);
    expect(await historique(ctx)).toEqual(avant);
    await poser(ctx, m.chef, activite.id, JANV, []);
    expect(await saisiesEnBase(ctx)).toHaveLength(0);
    expect(await historique(ctx)).toEqual(avant);
  });

  it('SAI-12 : tant que l’activité MAN porte des saisies : changement de mode, enfant et déplacement dessous refusés (422), clôture permise ; saisies effacées, c’est permis', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const autre = await creerActivite(ctx, m.chef, m.projet.id);
    const vide = await creerActivite(ctx, m.chef, m.projet.id, { mode: 'MAN' });
    const chef = appel(ctx, m.chef);
    await poser(ctx, m.chef, man.activite.id, JANV, [...journee(man.assignation.id, J05)]);
    const saisies = await saisiesEnBase(ctx);
    expect(saisies).toHaveLength(2);

    const refuse = async (nom: string, envoi: () => Promise<{ statusCode: number }>) => {
      const avant = await empreinte(ctx);
      expect((await envoi()).statusCode, nom).toBe(422);
      expect(await empreinte(ctx), `${nom} : base modifiée`).toEqual(avant);
    };
    await refuse('PATCH du mode', () =>
      chef.patch(url.activite(man.activite.id), { mode: 'ASAP' }),
    );
    await refuse('activité enfant', () =>
      chef.post(url.activites(m.projet.id), { nom: 'Enfant', parent_id: man.activite.id }),
    );
    await refuse('jalon enfant', () =>
      chef.post(url.jalons(m.projet.id), {
        nom: 'Jalon enfant',
        type: 'flottant',
        parent_id: man.activite.id,
      }),
    );
    await refuse('déplacement dessous', () =>
      chef.post(url.deplacer(autre.id), { parent_id: man.activite.id, rang: 1 }),
    );

    // témoins : une activité MAN sans saisie accepte enfant et déplacement ; le nom reste modifiable
    expect((await chef.patch(url.activite(man.activite.id), { nom: 'Renommée' })).statusCode).toBe(
      200,
    );
    const enfant = await chef.post(url.activites(m.projet.id), {
      nom: 'Enfant',
      parent_id: vide.id,
    });
    expect(enfant.statusCode).toBe(201);
    expect(
      (await chef.post(url.deplacer(autre.id), { parent_id: vide.id, rang: 1 })).statusCode,
    ).toBe(200);

    // clôture permise, saisies gardées ; rouverte, les garde-fous reviennent
    expect((await chef.patch(url.activite(man.activite.id), { close: true })).statusCode).toBe(200);
    expect(await saisiesEnBase(ctx)).toEqual(saisies);
    expect((await chef.patch(url.activite(man.activite.id), { close: false })).statusCode).toBe(
      200,
    );
    await refuse('PATCH du mode, activité rouverte', () =>
      chef.patch(url.activite(man.activite.id), { mode: 'ASAP' }),
    );

    // saisies effacées : le changement de mode est permis
    await poser(ctx, m.chef, man.activite.id, JANV, []);
    const mode = await chef.patch(url.activite(man.activite.id), { mode: 'ASAP' });
    expect(mode.statusCode, mode.body).toBe(200);
  });

  it('SAI-13 : supprimer une assignation puis une activité supprime leurs saisies, pas celles des autres', async () => {
    const m = await creerMonde(ctx);
    const un = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const bob = await creerAssignation(ctx, m.chef, un.activite.id, m.bob.id, {
      charge_assignee: 1,
    });
    const deux = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    await poser(ctx, m.chef, un.activite.id, JANV, [
      matin(un.assignation.id, J05),
      matin(bob.id, J05),
    ]);
    await poser(ctx, m.chef, deux.activite.id, JANV, [matin(deux.assignation.id, J06)]);
    const api = appel(ctx, m.chef);

    expect((await api.delete(url.assignation(bob.id))).statusCode).toBe(204);
    expect(await saisiesEnBase(ctx)).toEqual([
      matin(un.assignation.id, J05),
      matin(deux.assignation.id, J06),
    ]);
    expect((await api.delete(url.activite(un.activite.id))).statusCode).toBe(204);
    expect(await saisiesEnBase(ctx)).toEqual([matin(deux.assignation.id, J06)]);
  });

  it('SAI-14 : assignation_id inexistant dans le corps → 422, seul ou avec une saisie valide ; base inchangée', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 2);
    const a = assignation.id;
    await poser(ctx, m.chef, activite.id, JANV, [matin(a, J05)]);
    await putRefuse(m.chef, activite.id, JANV, { saisies: [matin(999999, J06)] }, 422, 'seule');
    await putRefuse(
      m.chef,
      activite.id,
      JANV,
      { saisies: [matin(a, J06), matin(999999, J06)] },
      422,
      'avec une saisie valide',
    );
    expect(await saisiesEnBase(ctx)).toEqual([matin(a, J05)]);
  });

  it('SAI-15 : MAN à saisies : PATCH du mode vers MAN → 200, avec un nom → 200 ; close puis PATCH vers ASAP → 422, empreinte inchangée', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const chef = appel(ctx, m.chef);
    await poser(ctx, m.chef, activite.id, JANV, [...journee(assignation.id, J05)]);
    const saisies = await saisiesEnBase(ctx);
    expect((await chef.patch(url.activite(activite.id), { mode: 'MAN' })).statusCode).toBe(200);
    const nom = await chef.patch(url.activite(activite.id), { mode: 'MAN', nom: 'X' });
    expect(nom.statusCode, nom.body).toBe(200);
    expect(nom.json().nom).toBe('X');
    expect(await saisiesEnBase(ctx)).toEqual(saisies);
    expect((await chef.patch(url.activite(activite.id), { close: true })).statusCode).toBe(200);
    const avant = await empreinte(ctx);
    expect((await chef.patch(url.activite(activite.id), { mode: 'ASAP' })).statusCode).toBe(422);
    expect(await empreinte(ctx)).toEqual(avant);
    expect(await saisiesEnBase(ctx)).toEqual(saisies);
  });

  it('SAI-16 : mois hors 2000 à 2099 (0000-01, 1999-12, 2100-01) → 400 en GET et en PUT, base inchangée ; témoins 2000-01 et 2099-12 → 200 en GET', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1);
    await poser(ctx, m.chef, activite.id, JANV, [...journee(assignation.id, J05)]);
    for (const mois of ['0000-01', '1999-12', '2100-01']) {
      const avant = await empreinte(ctx);
      const get = await lireSaisies(ctx, m.chef, activite.id, mois);
      expect(get.statusCode, `GET ${mois} : ${get.body}`).toBe(400);
      expect(await empreinte(ctx), `GET ${mois} : base modifiée`).toEqual(avant);
      await putRefuse(m.chef, activite.id, mois, { saisies: [] }, 400, `PUT ${mois}`);
    }
    for (const mois of ['2000-01', '2099-12']) {
      const get = await lireSaisies(ctx, m.chef, activite.id, mois);
      expect(get.statusCode, `GET ${mois} : ${get.body}`).toBe(200);
      expect(get.json()).toEqual({ mois, saisies: [] });
    }
  });
});
