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
import { tauxRoutes } from './routes/taux.js';
import { equipesRoutes } from './routes/equipes.js';
import { elementsRoutes } from './routes/elements.js';
import { feuillesRoutes } from './routes/feuilles.js';
import { ganttRoutes } from './routes/gantt.js';
import { travailRoutes } from './routes/travail.js';
import { historiqueRoutes } from './routes/historique.js';
import { mesTachesRoutes } from './routes/mes-taches.js';
import { exportImputationsRoutes } from './routes/export-imputations.js';
import { exportCoutsRoutes } from './routes/export-couts.js';
import { planDeChargeRoutes } from './routes/plan-de-charge.js';
import { ressourcePlanningRoutes } from './routes/ressource-planning.js';
import { projetsRoutes } from './routes/projets.js';
import { saisiesRoutes } from './routes/saisies.js';
import { utilisateursRoutes } from './routes/utilisateurs.js';
import { lireVersion } from './version.js';

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
  // Cache (D-227 (A)) : index.html et le repli du front sont revalidés (ETag) à chaque affichage ;
  // les fichiers de /assets/, au nom empreint, sont immuables.
  const servir = sirv(dossier, {
    single: true,
    etag: true,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
  });
  // Sous /assets/, jamais de repli sur index.html (D-140 (5) (b)) : fichier absent → 404.
  const servirAssets = sirv(dossier, {
    etag: true,
    setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'),
  });
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
  // Version lue une fois au démarrage (D-231) ; en-tête sur toute réponse /api, erreurs comprises.
  const info = lireVersion();
  app.addHook('onRequest', async (request, reply) => {
    const chemin = request.url.split('?')[0] ?? '';
    if (chemin === '/api' || chemin.startsWith('/api/')) {
      reply.header('X-PlanerSource-Version', info.version);
    }
  });
  app.get('/api/version', async () => info);
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
  app.register(async (instance) => equipesRoutes(instance, deps));
  app.register(async (instance) => tauxRoutes(instance, deps));
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
  app.register(async (instance) => mesTachesRoutes(instance, deps));
  app.register(async (instance) => planDeChargeRoutes(instance, deps));
  app.register(async (instance) => exportImputationsRoutes(instance, deps));
  app.register(async (instance) => exportCoutsRoutes(instance, deps));
  app.register(async (instance) => ressourcePlanningRoutes(instance, deps));
  if (deps.dossierWeb) servirWeb(app, deps.dossierWeb);
  return app;
}
