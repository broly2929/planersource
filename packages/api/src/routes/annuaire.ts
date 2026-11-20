import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';

interface EntreeAnnuaire {
  id: number;
  nom: string;
  role: 'administrateur' | 'chef_de_projet' | 'ressource';
  est_ressource: boolean;
  actif: boolean;
}

export function annuaireRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  // Annuaire (D-035) : tout utilisateur connecté, aucune donnée autre que les cinq champs.
  app.get('/api/annuaire', { preHandler: requireUser }, async () => {
    const { rows } = await pool.query<EntreeAnnuaire>(
      'SELECT id, nom, role, est_ressource, actif FROM utilisateur ORDER BY nom, id',
    );
    return rows;
  });
}
