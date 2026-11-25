// Révisions D-031 de retours-deploiement-1 (D-227 (B), D-228) : les défauts de colonnes ont changé ; un test
// qui suppose une colonne visible par défaut pose, avant le chargement, les colonnes d'avant D-227 dans
// le stockage du navigateur (une clé par vue, SPEC §6 « Colonnes et défilement », point 6), sans écraser
// un choix déjà posé.
import type { Page } from '@playwright/test';

/** Colonnes au choix affichées avant D-227 : toutes, sauf Charge, Avancement, Réel, Vendu et Marge de l'Accueil. */
export const COLONNES_AU_CHOIX = {
  projet: ['planification', 'debut', 'fin', 'charge', 'vendu', 'marge', 'avancement', 'drapeaux'],
  accueil: ['debut', 'fin', 'drapeaux'],
  ressource: ['debut', 'fin', 'assigne', 'reel', 'reste', 'drapeaux'],
} as const;

/** Colonnes d'avant D-227 cochées dans les trois vues, avant chaque chargement de page. */
export async function colonnesCompletes(page: Page): Promise<void> {
  await page.addInitScript((vues) => {
    for (const [vue, ids] of Object.entries(vues)) {
      const cle = `planersource.gantt.${vue}`;
      try {
        if (window.localStorage.getItem(cle) !== null) continue;
        window.localStorage.setItem(
          cle,
          JSON.stringify({ colonnes: Object.fromEntries(ids.map((id) => [id, true])) }),
        );
      } catch {
        /* stockage indisponible : défauts */
      }
    }
  }, COLONNES_AU_CHOIX);
}

/**
 * D-238 (1) : colonne « Ressources » décochée dans les trois vues, avant chaque chargement ; à appeler après
 * `colonnesCompletes`. Pour les tests qui mesurent le jeu de colonnes d'avant le lot colonne-ressources.
 */
export async function sansColonneRessources(page: Page): Promise<void> {
  await page.addInitScript(() => {
    for (const vue of ['projet', 'accueil']) {
      const cle = `planersource.gantt.${vue}`;
      try {
        const lu: unknown = JSON.parse(window.localStorage.getItem(cle) ?? '{}');
        const base = typeof lu === 'object' && lu !== null ? (lu as Record<string, unknown>) : {};
        const colonnes = (base.colonnes ?? {}) as Record<string, unknown>;
        window.localStorage.setItem(
          cle,
          JSON.stringify({ ...base, colonnes: { ...colonnes, ressources: false } }),
        );
      } catch {
        /* stockage indisponible : défauts */
      }
    }
  });
}
