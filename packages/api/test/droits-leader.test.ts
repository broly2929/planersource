// Lot droits, tranche 1 (D-265) : rôle leader métier. LDM-1 à LDM-15.
// Valeurs attendues recopiées de SPEC §2, « Lecture élargie du chef et rôle leader métier
// (droits, D-265) », points 2 à 4 et 7 (cas DR-17 à DR-39).
import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel, corps, type Corps } from './lot1-helpers.js';
import {
  CHEF_REFUSE,
  clesProfondes,
  CLES_CLIENT,
  CLES_FINANCES,
  creerMondeDroits,
  INTERDIT,
  JOUR,
  leaderDe,
  lire,
  refusSansEffet,
  requete,
  S1,
  TOTAUX_COMPLETS,
} from './droits-helpers.js';

interface Projet {
  id: number;
  chef_id: number;
  est_modele: boolean;
  peut_ecrire: boolean;
}
interface Element extends Corps {
  id: number;
  type: 'activite' | 'jalon';
}

describe('Lot droits-1 : rôle leader métier (SPEC §2, D-265)', () => {
  const ctx = useTestApp(() => JOUR);

  it('LDM-1-r1 : l’administrateur crée (201) et modifie (200) un utilisateur leader_metier ; un chef → 403, rien de créé (DR-17)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const cree = await appel(ctx, m.admin).post('/api/utilisateurs', {
      nom: 'Léa Leader',
      login: 'lea',
      mot_de_passe: 'secret-secret-1',
      role: 'leader_metier',
    });
    expect(cree.statusCode, cree.body).toBe(201);
    expect(corps(cree).role).toBe('leader_metier');

    const modifie = await appel(ctx, m.admin).patch(`/api/utilisateurs/${m.chef.id}`, {
      role: 'leader_metier',
    });
    expect(modifie.statusCode, modifie.body).toBe(200);
    expect(corps(modifie).role).toBe('leader_metier');

    await refusSansEffet(
      ctx,
      403,
      () =>
        requete(ctx, m.horsPortee, 'POST', '/api/utilisateurs', {
          nom: 'Autre leader',
          login: 'autre',
          mot_de_passe: 'secret',
          role: 'leader_metier',
        }),
      undefined,
      'création par un chef',
    );
  });

  it('LDM-2 : le leader lit son rôle dans /api/auth/me et dans l’annuaire (DR-18)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    const moi = await lire(ctx, l, '/api/auth/me');
    expect(moi.role).toBe('leader_metier');
    const annuaire = await lire<{ id: number; role: string }[]>(ctx, l, '/api/annuaire');
    expect(annuaire.find((u) => u.id === l.id)?.role).toBe('leader_metier');
  });

  it('LDM-3 : le leader lit et écrit tous les projets ; modèle en lecture seule, PATCH → 403, base inchangée (DR-19, DR-20)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    const projets = await lire<Projet[]>(ctx, l, '/api/projets');
    for (const id of [m.p.id, m.p1.id, m.q.id]) {
      const p = projets.find((x) => x.id === id);
      expect(p, `projet ${id} absent`).toBeDefined();
      expect(p!.peut_ecrire, `projet ${id}`).toBe(true);
    }
    expect((await lire<Projet>(ctx, l, `/api/projets/${m.q.id}`)).peut_ecrire).toBe(true);
    const modeles = await lire<Projet[]>(ctx, l, '/api/modeles');
    expect(modeles.find((x) => x.id === m.m.id)?.peut_ecrire).toBe(false);
    await refusSansEffet(
      ctx,
      403,
      () => requete(ctx, l, 'PATCH', `/api/projets/${m.m.id}`, { nom: 'Modèle renommé' }),
      INTERDIT,
      'PATCH du modèle',
    );
  });

  it('LDM-4 : Gantt du leader, totaux = { charge_assignee, charge_reelle } exactement, éléments sans vente, marge ni coût, jalon avec la date client (DR-21)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    const g = await lire<{ projet: Projet & { totaux?: Corps }; elements: Element[] }>(
      ctx,
      l,
      `/api/projets/${m.p.id}/gantt`,
    );
    expect(g.projet.peut_ecrire).toBe(true);
    expect(g.projet.totaux).toBeDefined();
    expect(Object.keys(g.projet.totaux!).sort()).toEqual(['charge_assignee', 'charge_reelle']);
    for (const e of g.elements) {
      for (const c of CLES_FINANCES)
        expect(Object.keys(e), `${String(e.nom)} : ${c}`).not.toContain(c);
    }
    const jalon = g.elements.find((e) => e.id === m.jp.id)!;
    for (const c of CLES_CLIENT) expect(Object.keys(jalon)).toContain(c);
    expect(jalon.date_client).toBe('2027-02-01');
  });

  it('LDM-5 : planning, activités et réponses POST et PATCH du leader : charge_assignee présente, charge_vendue et marge absentes ; date client présente (DR-22)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    const base = `/api/projets/${m.p.id}`;
    const planning = await lire<Element[]>(ctx, l, `${base}/planning`);
    for (const e of planning) {
      for (const c of ['charge_vendue', 'marge']) expect(Object.keys(e)).not.toContain(c);
    }
    const jalonPlanning = planning.find((e) => e.id === m.jp.id)!;
    for (const c of CLES_CLIENT) expect(Object.keys(jalonPlanning)).toContain(c);

    const verifierActivite = (a: Corps, libelle: string) => {
      expect(Object.keys(a), libelle).toContain('charge_assignee');
      for (const c of ['charge_vendue', 'marge']) expect(Object.keys(a), libelle).not.toContain(c);
    };
    const activites = await lire<Corps[]>(ctx, l, `${base}/activites`);
    expect(activites.length).toBeGreaterThan(0);
    for (const a of activites) verifierActivite(a, 'GET …/activites');
    const post = await appel(ctx, l).post(`${base}/activites`, { nom: 'Créée par le leader' });
    expect(post.statusCode, post.body).toBe(201);
    verifierActivite(corps(post), 'POST');
    const patch = await appel(ctx, l).patch(`/api/activites/${m.fp.id}`, { nom: 'Renommée' });
    expect(patch.statusCode, patch.body).toBe(200);
    verifierActivite(corps(patch), 'PATCH');

    const jalons = await lire<Corps[]>(ctx, l, `${base}/jalons`);
    expect(jalons.find((j) => j.id === m.jp.id)?.date_client).toBe('2027-02-01');
  });

  it('LDM-6 : charge_vendue (nombre ou null) dans un POST ou un PATCH d’activité du leader → 403, base inchangée ; 404 avant ; sans la clé 201 et 200 (DR-23)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    const base = `/api/projets/${m.p.id}`;
    for (const valeur of [3, null]) {
      await refusSansEffet(
        ctx,
        403,
        () => requete(ctx, l, 'PATCH', `/api/activites/${m.fp.id}`, { charge_vendue: valeur }),
        INTERDIT,
        `PATCH charge_vendue ${String(valeur)}`,
      );
      await refusSansEffet(
        ctx,
        403,
        () =>
          requete(ctx, l, 'POST', `${base}/activites`, { nom: 'Vendue', charge_vendue: valeur }),
        INTERDIT,
        `POST charge_vendue ${String(valeur)}`,
      );
    }
    await refusSansEffet(
      ctx,
      404,
      () => requete(ctx, l, 'PATCH', '/api/activites/999999', { charge_vendue: 1 }),
      undefined,
      'activité inconnue',
    );
    const patch = await appel(ctx, l).patch(`/api/activites/${m.fp.id}`, { nom: 'Sans vente' });
    expect(patch.statusCode, patch.body).toBe(200);
    const post = await appel(ctx, l).post(`${base}/activites`, { nom: 'Sans vente' });
    expect(post.statusCode, post.body).toBe(201);
  });

  it('LDM-7 : le leader écrit sur P et Q, calcule P et Q, lit leur historique (DR-24, DR-25)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    const q = await appel(ctx, l).patch(`/api/projets/${m.q.id}`, { nom: 'Q modifié' });
    expect(q.statusCode, q.body).toBe(200);
    const a = await appel(ctx, l).post(`/api/projets/${m.q.id}/activites`, { nom: 'Activité Q2' });
    expect(a.statusCode, a.body).toBe(201);
    const j = await appel(ctx, l).post(`/api/projets/${m.p.id}/jalons`, {
      nom: 'Jalon client',
      date_client: '2027-03-01',
    });
    expect(j.statusCode, j.body).toBe(201);
    expect(corps(j).date_client).toBe('2027-03-01');
    const calcul = await appel(ctx, l).post('/api/calcul', { projets: [m.p.id, m.q.id], d0: JOUR });
    expect(calcul.statusCode, calcul.body).toBe(200);
    for (const id of [m.p.id, m.q.id]) {
      const h = await appel(ctx, l).get(`/api/projets/${id}/historique`);
      expect(h.statusCode, h.body).toBe(200);
    }
  });

  it('LDM-8 : le leader crée un projet dont il est le chef, copie un modèle et un projet ; chef d’autrui et copie en modèle → 403 ; l’administrateur désigne le leader (DR-26 à DR-28)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    const cree = await appel(ctx, l).post('/api/projets', {
      code: 'LDR',
      nom: 'Projet du leader',
      date_debut: '2027-02-01',
    });
    expect(cree.statusCode, cree.body).toBe(201);
    expect(corps(cree).chef_id).toBe(l.id);
    await refusSansEffet(
      ctx,
      403,
      () =>
        requete(ctx, l, 'POST', '/api/projets', {
          code: 'LDR2',
          nom: 'Chef désigné',
          date_debut: '2027-02-01',
          chef_id: m.chef.id,
        }),
      CHEF_REFUSE,
      'chef_id d’autrui',
    );

    const depuisModele = await appel(ctx, l).post(`/api/projets/${m.m.id}/copie`, {
      nom: 'Depuis le modèle',
      code: 'CM1',
      date_debut: '2027-02-01',
    });
    expect(depuisModele.statusCode, depuisModele.body).toBe(201);
    expect(corps(depuisModele).est_modele).toBe(false);
    const copie = await appel(ctx, l).post(`/api/projets/${m.q.id}/copie`, {
      nom: 'Copie de Q',
      code: 'CQ1',
      date_debut: '2027-02-01',
    });
    expect(copie.statusCode, copie.body).toBe(201);
    await refusSansEffet(
      ctx,
      403,
      () =>
        requete(ctx, l, 'POST', `/api/projets/${m.p.id}/copie`, {
          nom: 'Modèle depuis P',
          code: 'CMP',
          date_debut: '2027-02-01',
          est_modele: true,
        }),
      undefined,
      'enregistrer comme modèle',
    );

    const parAdmin = await appel(ctx, m.admin).post('/api/projets', {
      code: 'ADL',
      nom: 'Confié au leader',
      date_debut: '2027-02-01',
      chef_id: l.id,
    });
    expect(parAdmin.statusCode, parAdmin.body).toBe(201);
    expect(corps(parAdmin).chef_id).toBe(l.id);
    const change = await appel(ctx, m.admin).patch(`/api/projets/${m.q.id}`, { chef_id: l.id });
    expect(change.statusCode, change.body).toBe(200);
    expect(corps(change).chef_id).toBe(l.id);
  });

  it('LDM-9 : coûts du pilotage, leur export et export des coûts d’un projet → 403 pour le leader, avant 400 et 404, base inchangée (DR-29)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    for (const url of [
      '/api/couts?debut=2027-01',
      '/api/couts/export?debut=2027-01',
      '/api/couts',
      `/api/projets/${m.p.id}/couts/export`,
      '/api/projets/999999/couts/export',
    ]) {
      await refusSansEffet(ctx, 403, () => requete(ctx, l, 'GET', url), INTERDIT, url);
    }
  });

  it('LDM-10 : toutes les routes de taux → 403 pour le leader, avant 400 et 404, base inchangée (DR-30)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    const routes: [string, 'GET' | 'POST' | 'PATCH' | 'DELETE', string, unknown?][] = [
      ['GET taux propres', 'GET', `/api/utilisateurs/${m.alice.id}/taux`],
      [
        'POST taux propre',
        'POST',
        `/api/utilisateurs/${m.alice.id}/taux`,
        { debut: '2027-06-01', montant: 500 },
      ],
      ['PATCH taux propre', 'PATCH', `/api/taux/${m.tauxAlice.id}`, { montant: 650 }],
      ['DELETE taux propre', 'DELETE', `/api/taux/${m.tauxAlice.id}`],
      ['GET taux d’équipe', 'GET', `/api/equipes/${m.equipe.id}/taux`],
      [
        'POST taux d’équipe',
        'POST',
        `/api/equipes/${m.equipe.id}/taux`,
        { debut: '2028-01-01', montant: 300 },
      ],
      ['PATCH taux d’équipe', 'PATCH', `/api/taux-equipe/${m.tauxEquipe.id}`, { montant: 450 }],
      ['DELETE taux d’équipe', 'DELETE', `/api/taux-equipe/${m.tauxEquipe.id}`],
      ['GET taux du jour', 'GET', '/api/taux/du-jour?date=2027-01-15'],
      ['taux du jour sans date (avant 400)', 'GET', '/api/taux/du-jour'],
      ['POST corps vide (avant 400)', 'POST', `/api/utilisateurs/${m.alice.id}/taux`, {}],
      ['GET utilisateur inconnu (avant 404)', 'GET', '/api/utilisateurs/999999/taux'],
      ['PATCH taux inconnu (avant 404)', 'PATCH', '/api/taux/999999', { montant: 1 }],
      ['GET équipe inconnue (avant 404)', 'GET', '/api/equipes/999999/taux'],
    ];
    for (const [libelle, methode, url, corpsRequete] of routes) {
      await refusSansEffet(
        ctx,
        403,
        () => requete(ctx, l, methode, url, corpsRequete),
        INTERDIT,
        libelle,
      );
    }
  });

  it('LDM-11 : plan de charge et export sans « Autres projets », planning d’une ressource sans ligne masquée, export des imputations avec P et Q (DR-31, DR-32, DR-38)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    const plan = await lire<{
      ressources: { ressource_id: number; projets: { projet_id: number | null }[] }[];
    }>(ctx, l, '/api/plan-de-charge?debut=2027-01');
    const alice = plan.ressources.find((r) => r.ressource_id === m.alice.id);
    expect(alice).toBeDefined();
    const ids = alice!.projets.map((p) => p.projet_id);
    expect(ids).not.toContain(null);
    expect(ids).toEqual(expect.arrayContaining([m.p.id, m.q.id]));
    const csv = await appel(ctx, l).get('/api/plan-de-charge/export?debut=2027-01');
    expect(csv.statusCode, csv.body).toBe(200);
    expect(csv.body).not.toContain('Autres projets');

    const planning = await lire<{ lignes: { projet: { id: number } | null }[] }>(
      ctx,
      l,
      `/api/ressources/${m.alice.id}/planning`,
    );
    for (const ligne of planning.lignes) expect(ligne.projet, 'ligne masquée').not.toBeNull();
    expect(planning.lignes.map((x) => x.projet?.id)).toEqual(
      expect.arrayContaining([m.p.id, m.q.id]),
    );

    const imp = await appel(ctx, l).get('/api/imputations/export?du=2027-01-04&au=2027-01-10');
    expect(imp.statusCode, imp.body).toBe(200);
    expect(imp.body).toContain('PDR · Projet P');
    expect(imp.body).toContain('QDR · Projet Q');
  });

  it('LDM-12 : le leader voit la feuille d’Alice en entier, la valide pour P et Q, la dévalide et la rejette (DR-33, DR-34)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    const val = await lire<{
      feuilles: { feuille_id: number; projets: { projet_id: number; peut_valider: boolean }[] }[];
    }>(ctx, l, `/api/validations?semaine=${S1}`);
    const f = val.feuilles.find((x) => x.feuille_id === m.feuilleAlice);
    expect(f, 'feuille d’Alice absente').toBeDefined();
    const peut = Object.fromEntries(f!.projets.map((p) => [p.projet_id, p.peut_valider]));
    expect(peut).toEqual({ [m.p.id]: true, [m.q.id]: true });

    const feuille = await lire<{ lignes: { projet_id: number }[] }>(
      ctx,
      l,
      `/api/feuilles?semaine=${S1}&ressource_id=${m.alice.id}`,
    );
    expect([...new Set(feuille.lignes.map((x) => x.projet_id))].sort((a, b) => a - b)).toEqual(
      [m.p.id, m.q.id].sort((a, b) => a - b),
    );

    const statut = async () =>
      (
        await ctx.pool.query<{ statut: string }>('SELECT statut FROM feuille_temps WHERE id = $1', [
          m.feuilleAlice,
        ])
      ).rows[0]!.statut;
    const validations = async () =>
      (
        await ctx.pool.query<{ projet_id: number }>(
          'SELECT projet_id FROM validation_feuille WHERE feuille_id = $1 ORDER BY projet_id',
          [m.feuilleAlice],
        )
      ).rows.map((r) => r.projet_id);

    const url = (verbe: string) => `/api/feuilles/${m.feuilleAlice}/${verbe}`;
    const valider = await requete(ctx, l, 'POST', url('valider'), {});
    expect(valider.statusCode, valider.body).toBe(200);
    expect(await statut()).toBe('validee');
    expect(await validations()).toEqual([m.p.id, m.q.id].sort((a, b) => a - b));

    const devalider = await requete(ctx, l, 'POST', url('devalider'));
    expect(devalider.statusCode, devalider.body).toBe(200);
    expect(await statut()).toBe('soumise');
    expect(await validations()).toEqual([]);

    const rejeter = await requete(ctx, l, 'POST', url('rejeter'), { commentaire: 'À revoir' });
    expect(rejeter.statusCode, rejeter.body).toBe(200);
    expect(await statut()).toBe('rejetee');
  });

  it('LDM-13 : saisie, soumission et rappel pour autrui refusés au leader (403, base inchangée) ; sa propre feuille et Mes tâches 200 (DR-35, DR-36)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    await refusSansEffet(
      ctx,
      403,
      () =>
        requete(ctx, l, 'PUT', `/api/feuilles?semaine=${S1}&ressource_id=${m.alice.id}`, {
          lignes: [
            { assignation_id: m.aliceFp.id, imputations: [{ jour: '2027-01-07', charge: 1 }] },
          ],
        }),
      undefined,
      'saisie pour autrui',
    );
    for (const verbe of ['soumettre', 'rappeler']) {
      await refusSansEffet(
        ctx,
        403,
        () => requete(ctx, l, 'POST', `/api/feuilles/${m.feuilleAlice}/${verbe}`, {}),
        undefined,
        verbe,
      );
    }

    const propre = await requete(ctx, l, 'PUT', `/api/feuilles?semaine=${S1}`, {
      lignes: [
        { assignation_id: m.leaderFp2!.id, imputations: [{ jour: '2027-01-05', charge: 1 }] },
      ],
    });
    expect(propre.statusCode, propre.body).toBe(200);
    const taches = await lire<{ assignation_id: number }[]>(ctx, l, '/api/mes-taches');
    expect(taches.map((t) => t.assignation_id)).toContain(m.leaderFp2!.id);
  });

  it('LDM-14 : utilisateurs, équipes, calendriers et historique transversal : écritures et liste d’administration → 403, base inchangée ; lectures ouvertes 200 (DR-37)', async () => {
    const m = await creerMondeDroits(ctx);
    const l = leaderDe(m);
    const refus: [string, 'GET' | 'POST', string, unknown?][] = [
      ['GET utilisateurs', 'GET', '/api/utilisateurs'],
      [
        'POST utilisateur',
        'POST',
        '/api/utilisateurs',
        { nom: 'Nouveau', login: 'nouveau', mot_de_passe: 'secret', role: 'ressource' },
      ],
      ['POST équipe', 'POST', '/api/equipes', { nom: 'Ops' }],
      ['POST calendrier', 'POST', '/api/calendriers', { nom: 'Calendrier du leader' }],
      ['GET historique transversal', 'GET', '/api/historique'],
    ];
    for (const [libelle, methode, url, c] of refus) {
      await refusSansEffet(ctx, 403, () => requete(ctx, l, methode, url, c), undefined, libelle);
    }
    for (const url of ['/api/annuaire', '/api/equipes', '/api/calendriers']) {
      const res = await appel(ctx, l).get(url);
      expect(res.statusCode, `${url} ${res.body}`).toBe(200);
    }
  });

  it('LDM-15 : administrateur, non-régression : Gantt à huit clés de totaux (DR-39)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const g = await lire<{ projet: { totaux: Corps } }>(
      ctx,
      m.admin,
      `/api/projets/${m.p.id}/gantt`,
    );
    expect(Object.keys(g.projet.totaux).sort()).toEqual(TOTAUX_COMPLETS);
    expect([...clesProfondes(g)]).toEqual(expect.arrayContaining([...CLES_CLIENT]));
  });
});
