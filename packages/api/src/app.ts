import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import type pg from 'pg';
import sirv from 'sirv';
import { creerLimiteur, type Limiteur } from './auth/limiteur.js';
import { verifyPassword } from './auth/password.js';
import { loadUser, type SessionsOrigine } from './auth/session.js';
import type { Config } from './config.js';
import './db/types.js';
import { affectationsRoutes } from './routes/affectations.js';
import { annuaireRoutes } from './routes/annuaire.js';
import { authRoutes } from './routes/auth.js';
import { assignationsRoutes } from './routes/assignations.js';
import { calculRoutes } from './routes/calcul.js';
import { calendriersRoutes } from './routes/calendriers.js';
import { dependancesRoutes } from './routes/dependances.js';
import { elementsRoutes } from './routes/elements.js';
import { feuillesRoutes } from './routes/feuilles.js';
import { ganttRoutes } from './routes/gantt.js';
import { travailRoutes } from './routes/travail.js';
import { historiqueRoutes } from './routes/historique.js';
import { projetsRoutes } from './routes/projets.js';
import { saisiesRoutes } from './routes/saisies.js';
import { utilisateursRoutes } from './routes/utilisateurs.js';

export interface AppDeps {
  pool: pg.Pool;
  config: Config;
  /** Date du jour « AAAA-MM-JJ » (D-044) ; défaut : date UTC du serveur. */
  aujourdhui?: () => string;
  /** Attente maximale du verrou de calcul, en millisecondes (D-074 2, D-075 4) ; défaut 10000. */
  delaiVerrouCalcul?: number;
  /** Indicateur « mot de passe d'origine » en mémoire (D-138 (2)) ; fourni par les tests. */
  sessionsOrigine?: SessionsOrigine;
  /** Dossier du web compilé, servi hors /api (D-138 (1) et (6)) ; absent : rien n'est servi. */
  dossierWeb?: string;
  /** Vérification d'un mot de passe contre un hash (D-140 (2)) ; défaut `verifyPassword`. */
  verifierMotDePasse?: (hash: string, motDePasse: string) => Promise<boolean>;
  /** Limiteur des tentatives de connexion (D-140 (3)) ; défaut : un limiteur par `buildApp`. */
  limiteurConnexion?: Limiteur;
}

/** Sert le web compilé par sirv ; index.html pour toute route hors /api ; /api inconnue → 404 JSON. */
function servirWeb(app: FastifyInstance, dossier: string): void {
  const servir = sirv(dossier, { single: true, etag: true });
  // Sous /assets/, jamais de repli sur index.html (D-140 (5) (b)) : fichier absent → 404.
  const servirAssets = sirv(dossier, { etag: true });
  app.setNotFoundHandler((request, reply) => {
    const chemin = request.url.split('?')[0] ?? '';
    const estApi = chemin === '/api' || chemin.startsWith('/api/');
    if (estApi || (request.method !== 'GET' && request.method !== 'HEAD')) {
      return reply.code(404).send({
        message: `Route ${request.method}:${request.url} not found`,
        error: 'Not Found',
        statusCode: 404,
      });
    }
    reply.hijack();
    (chemin.startsWith('/assets/') ? servirAssets : servir)(request.raw, reply.raw, () => {
      reply.raw.statusCode = 404;
      reply.raw.end();
    });
  });
}

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ trustProxy: deps.config.trustProxy === true });
  const sessionsOrigine: SessionsOrigine = deps.sessionsOrigine ?? new Set();
  app.register(cookie, { secret: deps.config.sessionSecret });
  app.decorateRequest('user', null);
  app.addHook('preHandler', async (request) => {
    // Session lue pour /api seulement (D-140 (5) (c)) : ni fichier statique ni index.html.
    const chemin = request.url.split('?')[0] ?? '';
    if (chemin !== '/api' && !chemin.startsWith('/api/')) return;
    request.user = await loadUser(deps.pool, request, sessionsOrigine);
  });
  const limiteur = deps.limiteurConnexion ?? creerLimiteur(Date.now);
  const verifier = deps.verifierMotDePasse ?? verifyPassword;
  app.register(async (instance) => authRoutes(instance, deps, sessionsOrigine, limiteur, verifier));
  app.register(async (instance) => utilisateursRoutes(instance, deps, sessionsOrigine));
  app.register(async (instance) => annuaireRoutes(instance, deps));
  app.register(async (instance) => calendriersRoutes(instance, deps));
  app.register(async (instance) => projetsRoutes(instance, deps));
  app.register(async (instance) => affectationsRoutes(instance, deps));
  app.register(async (instance) => elementsRoutes(instance, deps));
  app.register(async (instance) => dependancesRoutes(instance, deps));
  app.register(async (instance) => assignationsRoutes(instance, deps));
  app.register(async (instance) => historiqueRoutes(instance, deps));
  app.register(async (instance) => calculRoutes(instance, deps));
  app.register(async (instance) => saisiesRoutes(instance, deps));
  app.register(async (instance) => ganttRoutes(instance, deps));
  app.register(async (instance) => travailRoutes(instance, deps));
  app.register(async (instance) => feuillesRoutes(instance, deps));
  if (deps.dossierWeb) servirWeb(app, deps.dossierWeb);
  return app;
}
