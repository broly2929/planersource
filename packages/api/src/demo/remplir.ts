import type { FastifyInstance } from 'fastify';

/**
 * Jeu de démonstration (D-117) : tout passe par `app.inject`, donc par les validations de l'écran.
 * Les dates sont relatives à `lundi` (AAAA-MM-JJ) ; le moteur reste sans horloge.
 */
export interface OptionsDemo {
  lundi: string;
}

type Corps = Record<string, unknown>;
type Objet = Corps & { id: number };

const jourPlus = (lundi: string, n: number): string => {
  const d = new Date(`${lundi}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

class Session {
  constructor(
    private readonly app: FastifyInstance,
    private readonly cookie: string,
  ) {}

  static async ouvrir(app: FastifyInstance, login: string): Promise<Session> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifiant: login, mot_de_passe: login },
    });
    if (res.statusCode !== 200)
      throw new Error(`Connexion de ${login} refusée (${res.statusCode})`);
    const c = res.cookies.find((x) => x.name === 'session');
    if (!c) throw new Error(`Pas de session pour ${login}`);
    return new Session(app, `${c.name}=${c.value}`);
  }

  async envoyer(
    methode: 'POST' | 'PATCH' | 'PUT',
    url: string,
    payload: Corps,
    attendu: number,
  ): Promise<Objet> {
    const res = await this.app.inject({
      method: methode,
      url,
      payload,
      headers: { cookie: this.cookie },
    });
    if (res.statusCode !== attendu) {
      throw new Error(`${methode} ${url} : ${res.statusCode} ${res.body}`);
    }
    return res.json() as Objet;
  }

  async lire(url: string): Promise<Corps> {
    const res = await this.app.inject({ method: 'GET', url, headers: { cookie: this.cookie } });
    if (res.statusCode !== 200) throw new Error(`GET ${url} : ${res.statusCode} ${res.body}`);
    return res.json() as Corps;
  }

  creer(url: string, payload: Corps): Promise<Objet> {
    return this.envoyer('POST', url, payload, 201);
  }
}

export async function remplirDemo(app: FastifyInstance, { lundi }: OptionsDemo): Promise<void> {
  const j = (n: number) => jourPlus(lundi, n);
  // L'administrateur existe déjà (identifiant et mot de passe `admin`).
  const admin = await Session.ouvrir(app, 'admin');

  const compte = async (login: string, nom: string, initiales: string, extra: Corps) =>
    admin.creer('/api/utilisateurs', { login, nom, initiales, mot_de_passe: login, ...extra });
  await compte('chefa', 'Chef A', 'CA', { role: 'chef_de_projet' });
  const chefbU = await compte('chefb', 'Chef B', 'CB', {
    role: 'chef_de_projet',
    est_ressource: true,
  });
  const aliceU = await compte('alice', 'Alice', 'AL', { role: 'ressource', est_ressource: true });
  const bobU = await compte('bob', 'Bob', 'BO', { role: 'ressource', est_ressource: true });

  const chefa = await Session.ouvrir(app, 'chefa');
  const chefb = await Session.ouvrir(app, 'chefb');

  // DEMO-R : racine de chefa.
  const r = await chefa.creer('/api/projets', {
    code: 'DEMO-R',
    nom: 'Projet de démonstration',
    date_debut: lundi,
  });
  for (const u of [aliceU, bobU, chefbU]) {
    await chefa.creer(`/api/projets/${r.id}/affectations`, { ressource_id: u.id });
  }
  const activite = (corps: Corps) => chefa.creer(`/api/projets/${r.id}/activites`, corps);
  const assigner = (a: Objet, u: Objet, charge: number) =>
    chefa.creer(`/api/activites/${a.id}/assignations`, {
      ressource_id: u.id,
      charge_assignee: charge,
    });
  const lien = (p: Objet, s: Objet, type: string, delai = 0) =>
    chefa.creer(`/api/projets/${r.id}/dependances`, {
      predecesseur_id: p.id,
      successeur_id: s.id,
      type,
      delai,
    });

  await activite({ nom: 'Étude préalable (close)' }).then(async (a) => {
    await assigner(a, bobU, 1);
    await chefa.envoyer('PATCH', `/api/activites/${a.id}`, { close: true }, 200);
  });
  const phase = await activite({ nom: 'Phase 1' });
  const cadrage = await activite({ nom: 'Cadrage', parent_id: phase.id, mode: 'ASAP' });
  await assigner(cadrage, aliceU, 3);
  const conception = await activite({
    nom: 'Conception',
    parent_id: phase.id,
    mode: 'START',
    debut_valide: j(1),
  });
  await assigner(conception, bobU, 3);
  const maquette = await activite({ nom: 'Maquette', mode: 'STARR', debut_valide: j(2) });
  await assigner(maquette, aliceU, 2);
  const manuel = await activite({ nom: 'Planning manuel', mode: 'MAN' });
  const assManuel = await assigner(manuel, aliceU, 2);
  const manuel2 = await activite({ nom: 'Planning manuel bis', mode: 'MAN' });
  const assManuel2 = await assigner(manuel2, aliceU, 1);
  const livraison = await activite({ nom: 'Livraison', mode: 'ALAP', fin_valide: j(2) });
  await assigner(livraison, bobU, 5);
  const integration = await activite({
    nom: 'Intégration',
    mode: 'FDUR',
    debut_valide: j(7),
    duree_validee: 5,
  });
  await assigner(integration, bobU, 2);
  const essais = await activite({
    nom: 'Essais',
    mode: 'DDUR',
    debut_valide: j(14),
    duree_validee: 4,
  });
  await assigner(essais, aliceU, 2);
  const recette = await activite({
    nom: 'Recette',
    mode: 'REGUL',
    debut_valide: j(0),
    fin_valide: j(11),
  });
  await assigner(recette, aliceU, 4);

  const jalon = await chefa.creer(`/api/projets/${r.id}/jalons`, { nom: 'Fin de phase 1' });
  const jalonFixe = await chefa.creer(`/api/projets/${r.id}/jalons`, {
    nom: 'Mise en service',
    type: 'fixe',
    date_validee: j(4),
  });
  await lien(cadrage, conception, 'FD');
  await lien(cadrage, maquette, 'DD');
  await lien(conception, integration, 'FF');
  await lien(cadrage, recette, 'FD');
  await lien(conception, jalon, 'FD');
  await lien(livraison, jalonFixe, 'FD');

  // Saisies MAN : une journée le mercredi sur chacune des deux activités MAN d'Alice (bloque la Maquette ;
  // la seconde dépasse la disponibilité du jour : surcharge). Jamais de jour non ouvré (D-123 (8)).
  const mois = j(2).slice(0, 7);
  for (const [activiteMan, ass] of [
    [manuel, assManuel],
    [manuel2, assManuel2],
  ] as const) {
    await chefa.envoyer(
      'PUT',
      `/api/activites/${activiteMan.id}/saisies?mois=${mois}`,
      {
        saisies: [
          { assignation_id: ass.id, jour: j(2), demi_journee: 'matin' },
          { assignation_id: ass.id, jour: j(2), demi_journee: 'apres_midi' },
        ],
      },
      200,
    );
  }

  // DEMO-S : sous-projet de R, chef chefb (désigné par l'administrateur).
  const s = await admin.creer('/api/projets', {
    code: 'DEMO-S',
    nom: 'Sous-projet de démonstration',
    date_debut: lundi,
    parent_id: r.id,
    chef_id: chefbU.id,
  });
  await chefb.creer(`/api/projets/${s.id}/affectations`, { ressource_id: aliceU.id });
  for (const [nom, charge] of [
    ['Préparation', 2],
    ['Déploiement', 3],
  ] as const) {
    const a = await chefb.creer(`/api/projets/${s.id}/activites`, { nom });
    await chefb.creer(`/api/activites/${a.id}/assignations`, {
      ressource_id: aliceU.id,
      charge_assignee: charge,
    });
  }

  // DEMO-Q : second projet de chefa.
  const q = await chefa.creer('/api/projets', {
    code: 'DEMO-Q',
    nom: 'Second projet',
    date_debut: lundi,
  });
  await chefa.creer(`/api/projets/${q.id}/affectations`, { ressource_id: bobU.id });
  const qa = await chefa.creer(`/api/projets/${q.id}/activites`, { nom: 'Accueil des clients' });
  await chefa.creer(`/api/activites/${qa.id}/assignations`, {
    ressource_id: bobU.id,
    charge_assignee: 2,
  });
  await chefa.creer(`/api/projets/${q.id}/jalons`, { nom: 'Ouverture' });

  // DEMO-C : projet clos.
  const c = await chefa.creer('/api/projets', {
    code: 'DEMO-C',
    nom: 'Projet clos',
    date_debut: lundi,
  });
  const ca = await chefa.creer(`/api/projets/${c.id}/activites`, { nom: 'Archivage' });
  await chefa.envoyer('PATCH', `/api/activites/${ca.id}`, { close: true }, 200);
  await chefa.envoyer('PATCH', `/api/projets/${c.id}`, { clos: true }, 200);

  // DEMO-M : modèle.
  const m = await admin.creer('/api/modeles', {
    code: 'DEMO-M',
    nom: 'Modèle de démonstration',
    date_debut: lundi,
  });
  await admin.creer(`/api/projets/${m.id}/activites`, { nom: 'Étape type' });

  // Feuilles de temps (D-136) : jours ouvrés passés seulement (jamais postérieurs au jour du serveur).
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const alice = await Session.ouvrir(app, 'alice');
  const bob = await Session.ouvrir(app, 'bob');
  type Ligne = { assignation_id: number; projet_code: string; activite_nom: string };
  /** Imputations [activité, décalage depuis le lundi de la semaine, charge] ; rend la feuille créée, ou null. */
  const imputer = async (
    qui: Session,
    semaine: string,
    saisies: [string, number, number][],
  ): Promise<number | null> => {
    const retenues = saisies.filter(([, d]) => jourPlus(semaine, d) <= aujourdhui);
    if (retenues.length === 0) return null;
    const { lignes } = (await qui.lire(`/api/feuilles?semaine=${semaine}`)) as {
      lignes: Ligne[];
    };
    const corps = lignes
      .map((l) => ({
        assignation_id: l.assignation_id,
        imputations: retenues
          .filter(([nom]) => nom === l.activite_nom)
          .map(([, d, charge]) => ({ jour: jourPlus(semaine, d), charge })),
      }))
      .filter((l) => l.imputations.length > 0);
    const rendu = (await qui.envoyer(
      'PUT',
      `/api/feuilles?semaine=${semaine}`,
      { lignes: corps },
      200,
    )) as unknown as { feuille: { id: number } };
    return rendu.feuille.id;
  };
  const soumettre = async (qui: Session, semaine: string, id: number | null) => {
    if (id !== null) await qui.envoyer('POST', `/api/feuilles/${id}/soumettre`, {}, 200);
    return id;
  };
  // Semaine lundi − 14 : Bob validée (chefa), Alice rejetée par chefb.
  const l14 = j(-14);
  const bob14 = await soumettre(bob, l14, await imputer(bob, l14, [['Conception', 0, 1]]));
  if (bob14 !== null) await chefa.envoyer('POST', `/api/feuilles/${bob14}/valider`, {}, 200);
  const alice14 = await soumettre(
    alice,
    l14,
    await imputer(alice, l14, [
      ['Cadrage', 2, 1],
      ['Préparation', 3, 1],
    ]),
  );
  if (alice14 !== null) {
    await chefb.envoyer(
      'POST',
      `/api/feuilles/${alice14}/rejeter`,
      { commentaire: 'Imputations du jeudi à revoir' },
      200,
    );
  }
  // Semaine lundi − 7 : Alice soumise (R et S), validée pour S par chefb seulement (D-136 : « valider » de chefa couvre R et S) ; Bob soumise.
  const l7 = j(-7);
  const alice7 = await soumettre(
    alice,
    l7,
    await imputer(alice, l7, [
      ['Cadrage', 1, 1],
      ['Préparation', 2, 1],
    ]),
  );
  if (alice7 !== null) await chefb.envoyer('POST', `/api/feuilles/${alice7}/valider`, {}, 200);
  await soumettre(bob, l7, await imputer(bob, l7, [['Conception', 1, 1]]));
  // Semaine lundi : Alice brouillon (lundi seulement, si passé ou égal au jour du serveur).
  await imputer(alice, lundi, [['Cadrage', 0, 0.5]]);

  // Calcul de R (et S) à la date du lundi : les drapeaux viennent du moteur.
  await chefa.envoyer('POST', '/api/calcul', { projets: [r.id, s.id], d0: lundi }, 200);
}
