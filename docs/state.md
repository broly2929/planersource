# État du projet
Source de vérité sur l'avancement. Mis à jour par Claude Code en fin de session, puis poussé. Moins de 60 lignes.

## Lot en cours
- Aucun. REX-5 (Équipes et Calendriers dans l'écran Utilisateurs) fait, clos sans recette (D-165 à D-168).
- Lot 6 « Pilotage des ressources » fait (6a à 6f, D-147 à D-164).
- Lot 5 (durcissement, D-137) : fait. V1 livrée (lots 0 à 4).

## Dernier état
- Suites vertes : 1030 vitest, 420 e2e ; lint, typecheck, licences verts (REX-5).
- Derniers tags : `tests-rex5`, `tests-rex5-r1`, `tests-lot6f`, `tests-lot6f-r1`, `tests-lot6f-r2`.
- Derniers identifiants : D-168, CSV-20, GEO-55, AUTH-16, E2E-399. Détail : docs/historique.md.

## Prochaine action
- Cadrage du SBOM CycloneDX, prompt à demander à claude.ai.

## Ensuite, dans l'ordre
1. SBOM CycloneDX.
2. Recettes différées du porteur (lots 3, 4b, 4c, 5d, 6, REX-5) : docs/ux-session.md.

## Aléas connus
- rex3b : corrigé par D-146 (tests -r2, tag `tests-rex3b-d146`, `E2E_RETARD_CORPS`). Risque non prouvé : D-146 (5), docs/non-bloquants.md.
- `savegarde.test.ts` : `CREATE DATABASE` échoue parfois sur la suite complète, vert seul.
- E2E-93 et E2E-79 : échouent parfois sur la suite complète, verts seuls.

## Avancement des lots
| Lot | Statut |
|---|---|
| 0, 0bis, 1, 1b, 2a à 2f (socle, modèle, moteur complet) | Fait |
| 3 Gantt éditable | Fait (clos sans recette, D-134) |
| 4 Imputations | Fait (4a, 4b, 4c, clôture D-136) |
| 5 Durcissement | Fait (5a, 5i, 5b, 5c, 5d ; D-137 à D-145) |
| 6 Pilotage des ressources | Fait (6a à 6f, clôture D-164) |

## Renvois
- docs/historique.md : détail des lots faits.
- docs/non-bloquants.md : non bloquants reportés.
- docs/decisions.md : décisions (D-xxx).
- docs/tests.md : identifiants et couverture des tests.
- docs/ux-session.md : séance UX (D-123), recettes.

## Blocages
- Aucun.
