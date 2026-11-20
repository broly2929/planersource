# État du projet
Source de vérité sur l'avancement. Mis à jour par Claude Code en fin de session, puis poussé. Moins de 60 lignes.

## Lot en cours
- Lot 6 « Pilotage des ressources » (D-147) : 6a (équipe) et 6b (vue restreinte de la ressource, D-148) faits. Suivants : 6c à 6f.
- Lot 5 (durcissement, D-137) : fait. V1 livrée (lots 0 à 4).

## Dernier état
- HEAD à l'écriture : le commit docs d'état de 6b. Tags `tests-lot6b` et `tests-lot6b-complements` ; code : ccdef2c (API), d92947b (web).
- 938 vitest, 376 e2e, lint, typecheck et licences verts ; PUB-1 et PUB-2 verts. @reviewer : aucun bloquant. @ui-designer : onze défauts non bloquants dans docs/ux-session.md, « Captures de 6b ».
- Choix de 6b faits seul : menu de la ressource Mes tâches, Calendriers, Imputations (Imputations seulement si `est_ressource`) ; dates JJ/MM/AAAA et charges à la virgule décimale ; note de SPEC 4c point 10 (c) (redirection au lieu de « Accès réservé »).
- Choix de 6a faits seul : formulaire « Nouvelle équipe » en dialogue (patron Calendriers) ; texte d'état vide « Aucune équipe pour le moment. » non testé ; apostrophes droites dans « Cette équipe n'existe plus. » et « retirez-les d'abord. » ; `messageErreur` de commun.tsx exporté ; icône UsersRound ; `calendrier_id` absent de /api/auth/me (préexistant, seul `equipe_id` ajouté).
- Derniers identifiants : D-148 (11), RES-1 à RES-10, MTA-1 à MTA-8, E2E-347 à E2E-357, révisions de 6b (docs/tests.md) ; puis D-147 (8), MIG-9, EQP-1 à EQP-11, USR-26 à USR-30, E2E-335 à E2E-346 (E2E-343-r1), migration 013, D-146, E2E-264-r2, 267-r2, 268-r2, 272-r2, 277-r2, 280-r2, D-145, VFT-13, E2E-334, AUTH-15, LIM-7, ID-2, INST-16, DEMO-4-r1, FDT-17, FTE-19, USR-5-r1, migration 012.

## Prochaine action
- Cadrage de 6c (charge vendue) : prompt à demander à claude.ai.

## Ensuite, dans l'ordre
1. Lot 6, dans l'ordre de docs/backlog.md.
2. Recettes différées du porteur (lot 3, 4b, 4c, 5d) : docs/ux-session.md.

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
| 6 Pilotage des ressources | En cours (6a fait, D-147 ; 6b fait, D-148 ; 6c à 6f à cadrer) |

## Renvois
- docs/historique.md : détail des lots faits.
- docs/non-bloquants.md : non bloquants reportés.
- docs/decisions.md : décisions (D-xxx).
- docs/tests.md : identifiants et couverture des tests.
- docs/ux-session.md : séance UX (D-123), recettes.

## Blocages
- Aucun.
