export interface Config {
  databaseUrl: string;
  port: number;
  sessionSecret: string;
  nodeEnv: string;
  /** Cookie de session « secure » (D-139 (2)) : COOKIE_SECURE « 1 » ou « 0 » ; absent → selon nodeEnv. */
  cookieSecure?: boolean;
  /** Derrière un reverse proxy (D-140 (3)) : TRUST_PROXY « 1 » → l'IP vient de X-Forwarded-For. */
  trustProxy?: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL;
  const sessionSecret = env.SESSION_SECRET;
  if (!databaseUrl) throw new Error('DATABASE_URL est requis');
  if (!sessionSecret) throw new Error('SESSION_SECRET est requis');
  return {
    databaseUrl,
    port: Number(env.PORT ?? 8080),
    sessionSecret,
    nodeEnv: env.NODE_ENV ?? 'development',
    trustProxy: env.TRUST_PROXY === '1',
    ...(env.COOKIE_SECURE === '1' || env.COOKIE_SECURE === '0'
      ? { cookieSecure: env.COOKIE_SECURE === '1' }
      : {}),
  };
}

const SECRET_MODELE = 'changez-moi-au-moins-32-caracteres-aleatoires';
const MOT_DE_PASSE_BASE_MODELE = 'changezmoi';

/** Avertissements au démarrage : valeurs du modèle `.env.production.example` gardées (D-140 (5) (a)). */
export function avertissementsConfiguration(env: NodeJS.ProcessEnv): string[] {
  const messages: string[] = [];
  if (env.SESSION_SECRET === SECRET_MODELE) {
    messages.push(
      'SESSION_SECRET a la valeur du modèle .env.production.example : le remplacer par un secret aléatoire.',
    );
  }
  if (env.POSTGRES_PASSWORD === MOT_DE_PASSE_BASE_MODELE) {
    messages.push(
      'POSTGRES_PASSWORD a la valeur du modèle .env.production.example : le remplacer par un mot de passe propre.',
    );
  }
  return messages;
}
