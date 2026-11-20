// Lot 5b, entiers hors plage dans le corps (D-140 (4)) : ID-2.
// Chaque champ borné reçoit 2147483648 (et −2147483649 pour delai et duree_validee) :
// 400 « Données invalides », jamais 500, et aucune table ne change.
import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel, type Corps } from './lot1-helpers.js';
import { creerActivite, creerDependance, creerJalon, creerMonde, url } from './lot1-t2-helpers.js';

const TROP_GRAND = 2147483648;
const TROP_PETIT = -2147483649;

interface Cas {
  nom: string;
  methode: 'POST' | 'PATCH';
  adresse: string;
  corps: Corps;
}

describe('Entiers hors plage dans le corps (D-140 (4))', () => {
  const ctx = useTestApp();

  /** Contenu de toutes les tables, sauf `session` (la connexion de l'acteur l'a déjà écrite). */
  async function etatBase(): Promise<Record<string, unknown[]>> {
    const { rows } = await ctx.pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    );
    const etat: Record<string, unknown[]> = {};
    for (const { table_name } of rows) {
      const r = await ctx.pool.query(`SELECT * FROM "${table_name}" ORDER BY 1`);
      etat[table_name] = r.rows;
    }
    return etat;
  }

  it('ID-2 : chaque champ borné hors plage → 400 « Données invalides », base inchangée', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.admin, m.projet.id);
    const b = await creerActivite(ctx, m.admin, m.projet.id);
    const jalon = await creerJalon(ctx, m.admin, m.projet.id);
    const lien = await creerDependance(ctx, m.admin, m.projet.id, a.id, b.id);
    const nom = 'Nouveau';
    const projet = { code: 'ZZ1', nom: 'Z', date_debut: '2027-01-04' };

    const cas: Cas[] = [];
    const ajouter = (c: Omit<Cas, 'nom'>, champ: string, valeur: number) =>
      cas.push({ ...c, nom: `${c.methode} ${c.adresse} ${champ}=${valeur}`, corps: c.corps });
    const avec = (
      methode: 'POST' | 'PATCH',
      adresse: string,
      base: Corps,
      champ: string,
      valeurs: number[] = [TROP_GRAND],
    ) => {
      for (const v of valeurs)
        ajouter({ methode, adresse, corps: { ...base, [champ]: v } }, champ, v);
    };

    avec('POST', `/api/projets/${m.projet.id}/affectations`, {}, 'ressource_id');
    avec('POST', url.assignationsActivite(a.id), { charge_assignee: 1 }, 'ressource_id');
    avec(
      'POST',
      '/api/utilisateurs',
      { nom: 'U', email: 'u@example.test', mot_de_passe: 'x', role: 'ressource' },
      'calendrier_id',
    );
    avec('PATCH', `/api/utilisateurs/${m.alice.id}`, {}, 'calendrier_id');
    for (const champ of ['parent_id', 'rang']) {
      avec('POST', url.activites(m.projet.id), { nom }, champ);
      avec('POST', url.jalons(m.projet.id), { nom }, champ);
      avec('POST', url.deplacer(a.id), {}, champ);
    }
    for (const champ of ['parent_id', 'chef_id']) {
      avec('POST', '/api/projets', { ...projet, chef_id: m.chef.id }, champ);
      avec('POST', '/api/modeles', projet, champ);
      avec('PATCH', `/api/projets/${m.projet.id}`, {}, champ);
    }
    avec(
      'POST',
      url.dependances(m.projet.id),
      { predecesseur_id: b.id, successeur_id: jalon.id },
      'delai',
      [TROP_GRAND, TROP_PETIT],
    );
    avec('PATCH', url.dependance(lien.id), {}, 'delai', [TROP_GRAND, TROP_PETIT]);
    avec('POST', url.activites(m.projet.id), { nom }, 'duree_validee', [TROP_GRAND, TROP_PETIT]);
    avec('PATCH', url.activite(a.id), {}, 'duree_validee', [TROP_GRAND, TROP_PETIT]);

    expect(cas.length).toBe(24);
    const avant = await etatBase();
    const ecarts: string[] = [];
    for (const c of cas) {
      const res = await appel(ctx, m.admin)[c.methode === 'POST' ? 'post' : 'patch'](
        c.adresse,
        c.corps,
      );
      const apres = await etatBase();
      if (res.statusCode !== 400) ecarts.push(`${c.nom} : statut ${res.statusCode}`);
      else if (JSON.stringify(res.json()) !== JSON.stringify({ erreur: 'Données invalides' }))
        ecarts.push(`${c.nom} : corps ${res.body}`);
      if (JSON.stringify(apres) !== JSON.stringify(avant)) ecarts.push(`${c.nom} : base modifiée`);
    }
    expect(ecarts).toEqual([]);
  });
});
