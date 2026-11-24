import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/engine', 'packages/api', 'packages/web', 'scripts'],
    // Une base par worker pour l'API (D-196) : 4 workers, retenu après mesure (D-196 (6), (10)).
    // Réglé ici, pour tous les projets : vitest refuse des maxWorkers différents d'un projet à l'autre.
    maxWorkers: 4,
  },
});
