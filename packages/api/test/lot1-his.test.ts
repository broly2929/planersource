import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { appel, corps, creerActeur, liste, type Acteur, type Corps } from './lot1-helpers.js';
import {
  creerActivite,
  creerAssignation,
  creerDependance,
  creerJalon,
  creerMonde,
  planning,
  url,
  type Monde,
  type Objet,
} from './lot1-t2-helpers.js';

/**
 * Contrat de lecture de l'historique (D-023) :
 *  GET /api/projets/:id/historique       administrateur et chef du projet, du plus récent au plus ancien
 *  GET /api/historique?entite=calendrier administrateur
 * Chaque entrée : quand (date ISO), utilisateur_id, entite, entite_id, operation
 * (creation | modification | suppression), champ, ancienne_valeur, nouvelle_valeur.
 * Modification : une entrée par champ modifié. Création : champ null, ancienne_valeur null,
 * nouvelle_valeur = objet complet. Suppression : champ null, ancienne_valeur = objet complet,
 * nouvelle_valeur null. Entités : projet, affectation, activite, jalon, dependance, assignation,
 * calendrier.
 */
interface Entree {
  quand: string;
  utilisateur_id: number;
  entite: string;
  entite_id: number;
  operation: 'creation' | 'modification' | 'suppression';
  champ: string | null;
  ancienne_valeur: unknown;
  nouvelle_valeur: unknown;
}

const adresseProjet = (projetId: number) => `/api/projets/${projetId}/historique`;

async function lire(ctx: TestCtx, par: Acteur, adresse: string): Promise<Entree[]> {
  const res = await appel(ctx, par).get(adresse);
  expect(res.statusCode, `GET ${adresse}`).toBe(200);
  return liste(res) as unknown as Entree[];
}

const historiqueProjet = (ctx: TestCtx, par: Acteur, projetId: number) =>
  lire(ctx, par, adresseProjet(projetId));

/** Les entrées de modification d'une entité, dans l'ordre de la réponse. */
const modifications = (entrees: Entree[], entite: string, id: number) =>
  entrees.filter(
    (e) => e.operation === 'modification' && e.entite === entite && e.entite_id === id,
  );

/** Résumé comparable : champ, ancienne et nouvelle valeur, triés par champ. */
const resume = (entrees: Entree[]) =>
  entrees
    .map((e) => ({ champ: e.champ, ancienne: e.ancienne_valeur, nouvelle: e.nouvelle_valeur }))
    .sort((a, b) => String(a.champ).localeCompare(String(b.champ)));

async function idAffectation(ctx: TestCtx, projetId: number, ressourceId: number): Promise<number> {
  const { rows } = await ctx.pool.query<{ id: number }>(
    'SELECT id FROM affectation_projet WHERE projet_id = $1 AND ressource_id = $2',
    [projetId, ressourceId],
  );
  return rows[0]!.id;
}

describe('Historique (lot 1, T3)', () => {
  const ctx = useTestApp();

  it('HIS-1 : modifier un projet écrit une entrée (utilisateur, date, champ, ancienne, nouvelle valeur), du plus récent au plus ancien', async () => {
    const m = await creerMonde(ctx);
    const ancienNom = String(m.projet.nom);
    expect(
      (await appel(ctx, m.chef).patch(`/api/projets/${m.projet.id}`, { nom: 'Renommé' }))
        .statusCode,
    ).toBe(200);
    const entrees = await historiqueProjet(ctx, m.admin, m.projet.id);
    const modifs = modifications(entrees, 'projet', m.projet.id);
    expect(modifs).toHaveLength(1);
    expect(modifs[0]).toMatchObject({
      utilisateur_id: m.chef.id,
      entite: 'projet',
      entite_id: m.projet.id,
      operation: 'modification',
      champ: 'nom',
      ancienne_valeur: ancienNom,
      nouvelle_valeur: 'Renommé',
    });
    const ecart = Math.abs(Date.now() - Date.parse(modifs[0]!.quand));
    expect(ecart, 'la date est celle de la modification').toBeLessThan(120_000);
    // une seconde modification, par l'administrateur : elle vient en tête
    expect(
      (await appel(ctx, m.admin).patch(`/api/projets/${m.projet.id}`, { priorite: 100 }))
        .statusCode,
    ).toBe(200);
    const apres = await historiqueProjet(ctx, m.admin, m.projet.id);
    expect(apres[0]).toMatchObject({
      utilisateur_id: m.admin.id,
      champ: 'priorite',
      ancienne_valeur: 500,
      nouvelle_valeur: 100,
    });
    expect(apres[1]).toMatchObject({ champ: 'nom', nouvelle_valeur: 'Renommé' });
    for (let i = 0; i + 1 < apres.length; i += 1) {
      expect(Date.parse(apres[i]!.quand)).toBeGreaterThanOrEqual(Date.parse(apres[i + 1]!.quand));
    }
  });

  it('HIS-2 : modifier une affectation', async () => {
    const m = await creerMonde(ctx);
    const id = await idAffectation(ctx, m.projet.id, m.alice.id);
    const res = await appel(ctx, m.chef).patch(`/api/affectations/${id}`, { taux: 50 });
    expect(res.statusCode).toBe(200);
    const modifs = modifications(
      await historiqueProjet(ctx, m.admin, m.projet.id),
      'affectation',
      id,
    );
    expect(resume(modifs)).toEqual([{ champ: 'taux', ancienne: 100, nouvelle: 50 }]);
    expect(modifs[0]!.utilisateur_id).toBe(m.chef.id);
  });

  it('HIS-3 : modifier une activité, une entrée par champ modifié', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id, { nom: 'Ancienne' });
    const res = await appel(ctx, m.chef).patch(url.activite(a.id), {
      nom: 'Nouvelle',
      priorite: 100,
    });
    expect(res.statusCode).toBe(200);
    const modifs = modifications(
      await historiqueProjet(ctx, m.admin, m.projet.id),
      'activite',
      a.id,
    );
    expect(resume(modifs)).toEqual([
      { champ: 'nom', ancienne: 'Ancienne', nouvelle: 'Nouvelle' },
      { champ: 'priorite', ancienne: 500, nouvelle: 100 },
    ]);
    expect(modifs.every((e) => e.utilisateur_id === m.chef.id)).toBe(true);
  });

  it('HIS-4 : modifier un jalon', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.chef, m.projet.id, { nom: 'Ancien' });
    const res = await appel(ctx, m.chef).patch(url.jalon(j.id), {
      nom: 'Nouveau',
      type: 'fixe',
      date_validee: '2027-02-01',
    });
    expect(res.statusCode).toBe(200);
    const modifs = modifications(await historiqueProjet(ctx, m.admin, m.projet.id), 'jalon', j.id);
    expect(resume(modifs)).toEqual([
      { champ: 'date_validee', ancienne: null, nouvelle: '2027-02-01' },
      { champ: 'nom', ancienne: 'Ancien', nouvelle: 'Nouveau' },
      { champ: 'type', ancienne: 'flottant', nouvelle: 'fixe' },
    ]);
  });

  it('HIS-5 : modifier une dépendance (type, délai)', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    const d = await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id);
    const res = await appel(ctx, m.chef).patch(url.dependance(d.id), { type: 'DD', delai: 2 });
    expect(res.statusCode).toBe(200);
    const modifs = modifications(
      await historiqueProjet(ctx, m.admin, m.projet.id),
      'dependance',
      d.id,
    );
    expect(resume(modifs)).toEqual([
      { champ: 'delai', ancienne: 0, nouvelle: 2 },
      { champ: 'type', ancienne: 'FD', nouvelle: 'DD' },
    ]);
  });

  it('HIS-6 : modifier une assignation (charge assignée)', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id, { charge_assignee: 2 });
    const res = await appel(ctx, m.chef).patch(url.assignation(s.id), { charge_assignee: 3 });
    expect(res.statusCode).toBe(200);
    const modifs = modifications(
      await historiqueProjet(ctx, m.admin, m.projet.id),
      'assignation',
      s.id,
    );
    expect(modifs.find((e) => e.champ === 'charge_assignee')).toMatchObject({
      utilisateur_id: m.chef.id,
      ancienne_valeur: 2,
      nouvelle_valeur: 3,
    });
    // Charge réelle à 0 : le reste à faire est recalé et historisé comme tout champ modifié.
    expect(modifs.find((e) => e.champ === 'reste_a_faire')).toMatchObject({
      utilisateur_id: m.chef.id,
      ancienne_valeur: 2,
      nouvelle_valeur: 3,
    });
  });

  it('HIS-7 : déplacer un élément historise le parent', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    const res = await appel(ctx, m.chef).post(url.deplacer(b.id), { parent_id: a.id, rang: 1 });
    expect(res.statusCode).toBe(200);
    const modifs = modifications(
      await historiqueProjet(ctx, m.admin, m.projet.id),
      'activite',
      b.id,
    );
    expect(modifs.find((e) => e.champ === 'parent_id')).toMatchObject({
      utilisateur_id: m.chef.id,
      ancienne_valeur: null,
      nouvelle_valeur: a.id,
    });
  });

  it('HIS-8 : la création est historisée (objet complet, champ nul)', async () => {
    const m = await creerMonde(ctx);
    const carol = await creerActeur(ctx, 'carol@example.test', 'ressource', true);
    const api = appel(ctx, m.chef);
    const projet = corps(
      await appel(ctx, m.admin).post('/api/projets', {
        code: 'HIS8',
        nom: 'Créé',
        date_debut: '2027-01-04',
        chef_id: m.chef.id,
      }),
    ) as Objet;
    const aff = corps(
      await api.post(`/api/projets/${m.projet.id}/affectations`, { ressource_id: carol.id }),
    ) as Objet;
    const a = await creerActivite(ctx, m.chef, m.projet.id, { nom: 'Créée' });
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    const j = await creerJalon(ctx, m.chef, m.projet.id, { nom: 'Jalon créé' });
    const d = await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id);
    const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id, { charge_assignee: 2 });
    const entrees = await historiqueProjet(ctx, m.admin, m.projet.id);
    const creation = (entite: string, id: number) =>
      entrees.filter(
        (e) => e.operation === 'creation' && e.entite === entite && e.entite_id === id,
      );
    const attendus: [string, number, Corps, Acteur][] = [
      ['affectation', aff.id, { ressource_id: carol.id, taux: 100 }, m.chef],
      ['activite', a.id, { nom: 'Créée', mode: 'ASAP' }, m.chef],
      ['jalon', j.id, { nom: 'Jalon créé', type: 'flottant' }, m.chef],
      [
        'dependance',
        d.id,
        { predecesseur_id: a.id, successeur_id: b.id, type: 'FD', delai: 0 },
        m.chef,
      ],
      ['assignation', s.id, { ressource_id: m.alice.id, charge_assignee: 2 }, m.chef],
    ];
    for (const [entite, id, objet, par] of attendus) {
      const trouvees = creation(entite, id);
      expect(trouvees, `création de ${entite}`).toHaveLength(1);
      expect(trouvees[0], `création de ${entite}`).toMatchObject({
        utilisateur_id: par.id,
        champ: null,
        ancienne_valeur: null,
        nouvelle_valeur: { id, ...objet },
      });
    }
    // le projet créé par l'administrateur a sa propre création dans son historique
    const propre = (await historiqueProjet(ctx, m.admin, projet.id)).filter(
      (e) => e.operation === 'creation' && e.entite === 'projet',
    );
    expect(propre).toHaveLength(1);
    expect(propre[0]).toMatchObject({
      utilisateur_id: m.admin.id,
      entite_id: projet.id,
      nouvelle_valeur: { id: projet.id, code: 'HIS8', nom: 'Créé' },
    });
  });

  it('HIS-9 : la suppression est historisée (objet complet, champ nul)', async () => {
    const m = await creerMonde(ctx);
    const carol = await creerActeur(ctx, 'carol@example.test', 'ressource', true);
    const api = appel(ctx, m.chef);
    const aff = corps(
      await api.post(`/api/projets/${m.projet.id}/affectations`, { ressource_id: carol.id }),
    ) as Objet;
    const a = await creerActivite(ctx, m.chef, m.projet.id, { nom: 'Supprimée' });
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    const j = await creerJalon(ctx, m.chef, m.projet.id, { nom: 'Jalon supprimé' });
    const d = await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id);
    const s = await creerAssignation(ctx, m.chef, b.id, m.alice.id, { charge_assignee: 2 });
    expect((await api.delete(url.assignation(s.id))).statusCode).toBe(204);
    expect((await api.delete(url.dependance(d.id))).statusCode).toBe(204);
    expect((await api.delete(url.jalon(j.id))).statusCode).toBe(204);
    expect((await api.delete(url.activite(a.id))).statusCode).toBe(204);
    expect((await api.delete(url.affectation(aff.id))).statusCode).toBe(204);
    const entrees = await historiqueProjet(ctx, m.admin, m.projet.id);
    const attendus: [string, number, Corps][] = [
      ['assignation', s.id, { ressource_id: m.alice.id, charge_assignee: 2 }],
      ['dependance', d.id, { predecesseur_id: a.id, successeur_id: b.id }],
      ['jalon', j.id, { nom: 'Jalon supprimé' }],
      ['activite', a.id, { nom: 'Supprimée' }],
      ['affectation', aff.id, { ressource_id: carol.id }],
    ];
    for (const [entite, id, objet] of attendus) {
      const trouvees = entrees.filter(
        (e) => e.operation === 'suppression' && e.entite === entite && e.entite_id === id,
      );
      expect(trouvees, `suppression de ${entite}`).toHaveLength(1);
      expect(trouvees[0], `suppression de ${entite}`).toMatchObject({
        utilisateur_id: m.chef.id,
        champ: null,
        ancienne_valeur: { id, ...objet },
        nouvelle_valeur: null,
      });
    }
  });

  it('HIS-10 : la création et la modification d’un calendrier sont historisées (lecture par l’administrateur)', async () => {
    const m = await creerMonde(ctx);
    const api = appel(ctx, m.admin);
    const cal = corps(await api.post('/api/calendriers', { nom: 'Atelier' })) as Objet;
    expect(
      (
        await api.patch(`/api/calendriers/${cal.id}`, {
          nom: 'Atelier 4j',
          jours_travailles: [1, 2, 3, 4],
        })
      ).statusCode,
    ).toBe(200);
    const entrees = await lire(ctx, m.admin, '/api/historique?entite=calendrier');
    expect(entrees.length).toBeGreaterThan(0);
    expect(entrees.every((e) => e.entite === 'calendrier')).toBe(true);
    const duCalendrier = entrees.filter((e) => e.entite_id === cal.id);
    expect(duCalendrier.filter((e) => e.operation === 'creation')).toHaveLength(1);
    expect(resume(duCalendrier.filter((e) => e.operation === 'modification'))).toEqual([
      { champ: 'jours_travailles', ancienne: [1, 2, 3, 4, 5], nouvelle: [1, 2, 3, 4] },
      { champ: 'nom', ancienne: 'Atelier', nouvelle: 'Atelier 4j' },
    ]);
    expect(duCalendrier.every((e) => e.utilisateur_id === m.admin.id)).toBe(true);
    // un autre type d'entité n'apparaît pas dans le filtre
    expect(entrees.some((e) => e.entite === 'projet')).toBe(false);
  });

  it('HIS-11 : une valeur inchangée n’écrit aucune entrée', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id, { nom: 'Stable' });
    const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id, { charge_assignee: 2 });
    const id = await idAffectation(ctx, m.projet.id, m.alice.id);
    const avant = await historiqueProjet(ctx, m.admin, m.projet.id);
    expect(avant.length).toBeGreaterThan(0); // les créations sont déjà historisées
    const api = appel(ctx, m.chef);
    expect((await api.patch(`/api/projets/${m.projet.id}`, { nom: m.projet.nom })).statusCode).toBe(
      200,
    );
    expect((await api.patch(url.activite(a.id), { nom: 'Stable', priorite: 500 })).statusCode).toBe(
      200,
    );
    expect((await api.patch(url.assignation(s.id), { charge_assignee: 2 })).statusCode).toBe(200);
    expect((await api.patch(`/api/affectations/${id}`, { taux: 100 })).statusCode).toBe(200);
    expect(await historiqueProjet(ctx, m.admin, m.projet.id)).toEqual(avant);
    // seul le champ réellement modifié est écrit
    expect(
      (await api.patch(`/api/projets/${m.projet.id}`, { nom: m.projet.nom, priorite: 700 }))
        .statusCode,
    ).toBe(200);
    const apres = await historiqueProjet(ctx, m.admin, m.projet.id);
    expect(apres).toHaveLength(avant.length + 1);
    expect(apres[0]).toMatchObject({
      champ: 'priorite',
      ancienne_valeur: 500,
      nouvelle_valeur: 700,
    });
  });

  describe('HIS-12 : refus et atomicité', () => {
    it('HIS-12-r1 : une modification refusée n’écrit aucune entrée (ressource : 404, D-148 (2))', async () => {
      const m = await creerMonde(ctx);
      const a = await creerActivite(ctx, m.chef, m.projet.id);
      const b = await creerActivite(ctx, m.chef, m.projet.id);
      const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id, { charge_assignee: 2 });
      const avant = await historiqueProjet(ctx, m.admin, m.projet.id);
      expect(avant.length).toBeGreaterThan(0);
      const id = await idAffectation(ctx, m.projet.id, m.alice.id);
      const refus: [
        string,
        Acteur | undefined,
        'PATCH' | 'POST' | 'DELETE',
        string,
        Corps | undefined,
        number,
      ][] = [
        [
          'projet sans session',
          undefined,
          'PATCH',
          `/api/projets/${m.projet.id}`,
          { nom: 'X' },
          401,
        ],
        [
          'projet, chef d’un autre projet',
          m.autreChef,
          'PATCH',
          `/api/projets/${m.projet.id}`,
          { nom: 'X' },
          404,
        ],
        ['projet, ressource', m.alice, 'PATCH', `/api/projets/${m.projet.id}`, { nom: 'X' }, 404],
        [
          'projet, corps invalide',
          m.chef,
          'PATCH',
          `/api/projets/${m.projet.id}`,
          { priorite: 1001 },
          400,
        ],
        ['activité, ressource', m.alice, 'PATCH', url.activite(a.id), { nom: 'X' }, 404],
        ['activité, corps invalide', m.chef, 'PATCH', url.activite(a.id), { priorite: -1 }, 400],
        ['activité, règle métier', m.chef, 'PATCH', url.activite(a.id), { duree_validee: 0 }, 422],
        [
          'affectation, taux invalide',
          m.chef,
          'PATCH',
          `/api/affectations/${id}`,
          { taux: 0 },
          400,
        ],
        [
          'affectation, autre chef',
          m.autreChef,
          'PATCH',
          `/api/affectations/${id}`,
          { taux: 10 },
          404,
        ],
        [
          'assignation, charge négative',
          m.chef,
          'PATCH',
          url.assignation(s.id),
          { charge_assignee: -1 },
          400,
        ],
        [
          'assignation, ressource',
          m.alice,
          'PATCH',
          url.assignation(s.id),
          { charge_assignee: 3 },
          404,
        ],
        ['déplacement, cycle', m.chef, 'POST', url.deplacer(a.id), { parent_id: a.id }, 422],
        [
          'dépendance, un élément avec lui-même',
          m.chef,
          'POST',
          url.dependances(m.projet.id),
          { predecesseur_id: a.id, successeur_id: a.id },
          422,
        ],
        [
          'affectation, suppression refusée',
          m.chef,
          'DELETE',
          `/api/affectations/${id}`,
          undefined,
          409,
        ],
        [
          'activité, suppression par une ressource',
          m.alice,
          'DELETE',
          url.activite(b.id),
          undefined,
          404,
        ],
      ];
      for (const [nom, qui, methode, adresse, contenu, statut] of refus) {
        const res = await ctx.app.inject({
          method: methode,
          url: adresse,
          ...(contenu ? { payload: contenu } : {}),
          headers: qui ? { cookie: qui.cookie } : {},
        });
        expect(res.statusCode, nom).toBe(statut);
        expect(await historiqueProjet(ctx, m.admin, m.projet.id), `${nom} : entrée écrite`).toEqual(
          avant,
        );
      }
    });

    interface CibleAtomicite {
      nom: string;
      /** Table portant la colonne `nom`, pour le déclencheur différé. */
      table: string;
      adresse: (m: Monde, a: Objet) => string;
      /** Deux modifications successives de la même colonne. */
      premiere: Corps;
      seconde: Corps;
      lecture: string;
      id: (m: Monde, a: Objet) => number;
    }
    const cibles: CibleAtomicite[] = [
      {
        nom: 'projet',
        table: 'projet',
        adresse: (m) => `/api/projets/${m.projet.id}`,
        premiere: { priorite: 42 },
        seconde: { priorite: 43 },
        lecture: 'SELECT priorite AS v FROM projet WHERE id = $1',
        id: (m) => m.projet.id,
      },
      {
        nom: 'activité',
        table: 'element',
        adresse: (_m, a) => url.activite(a.id),
        premiere: { nom: 'Changée' },
        seconde: { nom: 'Changée bis' },
        lecture: 'SELECT nom AS v FROM element WHERE id = $1',
        id: (_m, a) => a.id,
      },
    ];

    it.each(cibles)('HIS-12 : atomicité, pas de modification sans entrée ($nom)', async (cible) => {
      const m = await creerMonde(ctx);
      const a = await creerActivite(ctx, m.chef, m.projet.id, { nom: 'Initiale' });
      const adresse = cible.adresse(m, a);
      const lireValeur = async () =>
        (await ctx.pool.query<{ v: unknown }>(cible.lecture, [cible.id(m, a)])).rows[0]!.v;
      // l'historique fonctionne : une première modification écrit son entrée
      expect((await appel(ctx, m.chef).patch(adresse, cible.premiere)).statusCode).toBe(200);
      const ecrites = (await historiqueProjet(ctx, m.admin, m.projet.id)).filter(
        (e) => e.operation === 'modification',
      );
      expect(ecrites.length).toBeGreaterThan(0);
      const valeur = await lireValeur();
      // l'écriture de l'historique échoue : la modification ne doit pas subsister
      await ctx.pool.query(`
          CREATE FUNCTION historique_refuse() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'écriture de l''historique refusée'; END $$;
          CREATE TRIGGER historique_refuse BEFORE INSERT ON historique
            FOR EACH ROW EXECUTE FUNCTION historique_refuse();`);
      const res = await appel(ctx, m.chef).patch(adresse, cible.seconde);
      expect(res.statusCode).toBe(500);
      expect(await lireValeur(), 'modification sans entrée').toEqual(valeur);
    });

    it.each(cibles)('HIS-12 : atomicité, pas d’entrée sans modification ($nom)', async (cible) => {
      const m = await creerMonde(ctx);
      const a = await creerActivite(ctx, m.chef, m.projet.id, { nom: 'Initiale' });
      const adresse = cible.adresse(m, a);
      // l'historique fonctionne : une modification ordinaire écrit son entrée
      expect((await appel(ctx, m.chef).patch(adresse, cible.premiere)).statusCode).toBe(200);
      const avant = await historiqueProjet(ctx, m.admin, m.projet.id);
      expect(avant.filter((e) => e.operation === 'modification').length).toBeGreaterThan(0);
      // la modification échoue au commit, après l'écriture de l'historique : aucune entrée ne subsiste
      await ctx.pool.query(`
          CREATE FUNCTION refus_au_commit() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'refusé au commit'; END $$;
          CREATE CONSTRAINT TRIGGER refus_au_commit AFTER UPDATE ON ${cible.table}
            DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.nom = 'REFUSE')
            EXECUTE FUNCTION refus_au_commit();`);
      const res = await appel(ctx, m.chef).patch(adresse, { nom: 'REFUSE' });
      expect(res.statusCode).toBe(500);
      expect(await historiqueProjet(ctx, m.admin, m.projet.id), 'entrée sans modification').toEqual(
        avant,
      );
      const { rows } = await ctx.pool.query<{ v: unknown }>(
        'SELECT nom AS v FROM element WHERE id = $1 UNION ALL SELECT nom FROM projet WHERE id = $2',
        [a.id, m.projet.id],
      );
      expect(rows.map((r) => r.v)).not.toContain('REFUSE');
    });
  });

  it('HIS-13-r1 : lecture de l’historique d’un projet : chef d’un autre projet → 404 ; ressource affectée → 404', async () => {
    const m = await creerMonde(ctx);
    const chefRessource = await creerActeur(ctx, 'chefres@example.test', 'chef_de_projet', true);
    await ctx.pool.query(
      'INSERT INTO affectation_projet (projet_id, ressource_id, taux) VALUES ($1, $2, 100)',
      [m.projet.id, chefRessource.id],
    );
    const nonAffectee = await creerActeur(ctx, 'carol@example.test', 'ressource', true);
    const adresse = adresseProjet(m.projet.id);
    const statut = async (qui: Acteur | undefined, a = adresse) =>
      (await appel(ctx, qui).get(a)).statusCode;
    expect(await statut(m.admin)).toBe(200);
    expect(await statut(m.chef)).toBe(200);
    expect(await statut(m.autreChef)).toBe(404);
    expect(await statut(m.alice)).toBe(404); // révision 6b (D-031, D-148 (2))
    expect(await statut(chefRessource)).toBe(403); // chef d'un autre projet, affecté ici : lecture seule
    expect(await statut(nonAffectee)).toBe(404);
    expect(await statut(undefined)).toBe(401);
    expect(await statut(m.admin, adresseProjet(999999))).toBe(404);
    expect(await statut(m.admin, '/api/projets/abc/historique')).toBe(404);
    // historique transversal : administrateur seulement
    const transversal = '/api/historique?entite=calendrier';
    expect(await statut(m.admin, transversal)).toBe(200);
    expect(await statut(m.chef, transversal)).toBe(403);
    expect(await statut(m.alice, transversal)).toBe(403);
    expect(await statut(undefined, transversal)).toBe(401);
  });

  it('HIS-14 : les champs calculés par le moteur ne sont pas historisés', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id, { nom: 'Calculée' });
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    const avant = await historiqueProjet(ctx, m.admin, m.projet.id);
    expect(avant.length).toBeGreaterThan(0);
    // écriture directe en base, comme le fera le moteur : aucune entrée
    await ctx.pool.query(
      `UPDATE activite SET debut_planifie = '2027-01-04', fin_planifiee = '2027-01-08',
              drapeaux = '{retard}' WHERE id = $1`,
      [a.id],
    );
    await ctx.pool.query("UPDATE jalon SET date_planifiee = '2027-01-08' WHERE id = $1", [j.id]);
    expect(await historiqueProjet(ctx, m.admin, m.projet.id)).toEqual(avant);
    // l'API de saisie refuse ces champs : rien n'est écrit non plus
    expect(
      (await appel(ctx, m.chef).patch(url.activite(a.id), { debut_planifie: '2027-02-01' }))
        .statusCode,
    ).toBe(400);
    expect(await historiqueProjet(ctx, m.admin, m.projet.id)).toEqual(avant);
    // une modification ordinaire ne laisse aucune trace des colonnes du moteur
    expect(
      (await appel(ctx, m.chef).patch(url.activite(a.id), { nom: 'Renommée' })).statusCode,
    ).toBe(200);
    const apres = await historiqueProjet(ctx, m.admin, m.projet.id);
    expect(modifications(apres, 'activite', a.id).map((e) => e.champ)).toEqual(['nom']);
    const colonnesMoteur = ['debut_planifie', 'fin_planifiee', 'drapeaux', 'date_planifiee'];
    expect(apres.filter((e) => e.champ !== null && colonnesMoteur.includes(e.champ))).toEqual([]);
    const creation = apres.find(
      (e) => e.operation === 'creation' && e.entite === 'activite' && e.entite_id === a.id,
    );
    for (const colonne of colonnesMoteur) {
      expect(creation?.nouvelle_valeur, `création : ${colonne}`).not.toHaveProperty(colonne);
    }
  });

  it('HIS-15 : un déplacement historise l’élément déplacé, pas les rangs décalés de ses frères', async () => {
    const m = await creerMonde(ctx);
    const p = await creerActivite(ctx, m.chef, m.projet.id, { nom: 'Parent' });
    const q = await creerActivite(ctx, m.chef, m.projet.id, { nom: 'Autre parent' });
    const x = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: p.id });
    const y = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: p.id });
    const z = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: p.id });
    expect([x.rang, y.rang, z.rang]).toEqual([1, 2, 3]);
    const api = appel(ctx, m.chef);
    // z passe en tête de sa fratrie : x et y sont décalés
    expect((await api.post(url.deplacer(z.id), { parent_id: p.id, rang: 1 })).statusCode).toBe(200);
    const rangs = (await planning(ctx, m.chef, m.projet.id)).filter((l) =>
      [x.id, y.id, z.id].includes(l.id),
    );
    expect(rangs.map((l) => [l.id, l.rang])).toEqual([
      [z.id, 1],
      [x.id, 2],
      [y.id, 3],
    ]);
    let entrees = await historiqueProjet(ctx, m.admin, m.projet.id);
    expect(resume(modifications(entrees, 'activite', z.id))).toEqual([
      { champ: 'rang', ancienne: 3, nouvelle: 1 },
    ]);
    expect(modifications(entrees, 'activite', x.id)).toEqual([]);
    expect(modifications(entrees, 'activite', y.id)).toEqual([]);
    // x change de parent : y et z, décalés dans l'ancienne fratrie, n'ont aucune entrée
    expect((await api.post(url.deplacer(x.id), { parent_id: q.id, rang: 1 })).statusCode).toBe(200);
    entrees = await historiqueProjet(ctx, m.admin, m.projet.id);
    expect(resume(modifications(entrees, 'activite', x.id))).toEqual([
      { champ: 'parent_id', ancienne: p.id, nouvelle: q.id },
      { champ: 'rang', ancienne: 2, nouvelle: 1 },
    ]);
    expect(modifications(entrees, 'activite', y.id)).toEqual([]);
    expect(resume(modifications(entrees, 'activite', z.id))).toEqual([
      { champ: 'rang', ancienne: 3, nouvelle: 1 },
    ]);
  });
});
