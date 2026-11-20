export const NOM_BASE_DEMO = 'planersource_demo';

/** URL de la base de démonstration : même serveur, nom de base remplacé (D-117 (1)). */
export function urlBaseDemo(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = `/${NOM_BASE_DEMO}`;
  return url.toString();
}

/** Refus si le nom de base ne finit pas par `_demo` : rien d'autre ne doit être supprimé. */
export function exigerBaseDemo(url: string): void {
  const nom = new URL(url).pathname.slice(1);
  if (!nom.endsWith('_demo')) {
    throw new Error(`Refus : la base « ${nom} » ne finit pas par _demo`);
  }
}
