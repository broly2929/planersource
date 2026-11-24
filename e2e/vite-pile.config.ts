// Front d'une pile e2e (D-199 (2)) : configuration du web, racine packages/web, cache de vite propre au
// worker (deux serveurs ne réécrivent jamais le même cache de dépendances). Port donné en ligne de commande.
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';
import base from '../packages/web/vite.config.js';

export default mergeConfig(base, {
  root: fileURLToPath(new URL('../packages/web/', import.meta.url)),
  ...(process.env.PLANERSOURCE_VITE_CACHE ? { cacheDir: process.env.PLANERSOURCE_VITE_CACHE } : {}),
});
