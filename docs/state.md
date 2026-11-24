# État du projet
Source de vérité sur l'avancement. Mis à jour par Claude Code en fin de session, puis poussé. Moins de 60 lignes.

## Lot en cours
- Lot retouches-rex6 (D-218, D-219) fait et clos (ouverture 62aee5b) : modèle (date préremplie, aide), types de dépendance explicites, début et fin planifiés en lecture seule, Accueil déplié avec initiales par défaut, « Mon calendrier » supprimée, logo « PlanerSource » cliquable (garde D-172), ordre des colonnes de l'Accueil, poignée de largeur. E2E-558 à E2E-571 ; rouge 36 sur 36 ; révisions et retraits : D-219 (2) ; tags `tests-retouches-rex6` et `-r1` à `-r14`. Suite : journal docs/journal-suites.jsonl, lignes 31 et 32 (commit 9960eed, vitest 225,6 s, e2e 685,9 s, 591 verts). @reviewer : aucun bloquant.
- Lot gantt-colonnes (D-212) fait et clos. Tranche 2 (gantt-colonnes-2, D-216, D-217, ouverture 4ac9b85) : menu « Colonnes » (Radix dropdown-menu, non modal), poignée de largeur par colonne, colonnes au choix et mémorisées par vue, « Rétablir l'affichage par défaut », colonnes Charge, Avancement, Réel, Vendu, Marge sur l'Accueil. E2E-540 à E2E-557 (-r1, décision du porteur), GCO-5 à 9 ; rouge 54 sur 54. Révisions D-216 (3) et E2E-38-r3 : D-217 (2). Suite : journal docs/journal-suites.jsonl, lignes 29 et 30 (commit e2df76a, vitest 219 s, 1244 verts ; e2e 662,3 s, 581 verts). @reviewer : aucun bloquant, non bloquants en D-217 (4). Tranche 1 : D-214 (docs/historique.md).
- Lot correctif-rex3b fait et clos (D-206 à D-208, domaine gantt, ouverture eaafba9) : D-207 (1), annulation ignorée et bouton désactivé pendant le PATCH d'un geste (compteur d'enregistrements, GanttProjet.tsx) ; E2E-512 à E2E-517 (E2E-517-r1), révisions E2E-264-r3, 267-r3, 272-r3, 277-r3 ; rouge 30 sur 30 puis vert. Suites : journal docs/journal-suites.jsonl, lignes 21 et 22 (suite 1, commit a9a5bd1 : vitest vert, e2e rouge sur E2E-470 et E2E-472), lignes 23 et 24 (suite 2, commit 3f23690, justification D-208 : vitest 226,8 s et e2e 536,5 s verts). E2E-470 et E2E-472 : remise à zéro des e2e qui ne supprimait pas les utilisateurs sans email, corrigée (D-208 (3)). 3 passes à 3 workers (docs/mesure-tests.md, section 17) : 536, 539, 539 verts sur 541 ; rex3b en échec dans la passe 1 seulement, défaut résiduel D-208 (4) (`inverseBarre` sur un élément périmé), non corrigé. @reviewer : points documentaires traités (D-208). Lot recette-auto fait et clos (D-204, D-205) : 44 e2e, E2E-468 à E2E-511, tag `tests-recette-auto`. Lot correctif-244 fait et clos (D-200, D-201).
- Optimisation des tests (backlog du 2026-11-23) : faite. Étapes 1, 2a (D-193), 2b (D-194), 2c (D-196, vitest 4 workers), 2d (D-197) et 2e (lot e2e-parallele, D-198 et D-199 : pré-contrôle de suite-complete, hook commit-msg suivi par git (`npm run setup-depot`), e2e Playwright à 2 workers, une pile par worker, base clonée du modèle de vitest, API 3300+N, front 5300+N). Suite complète ≈ 21 min 20 → 12 min 24 (bilan : docs/mesure-tests.md, section 15).
- Saisie pour autrui faite (D-181 à D-184) : AUT-I et AUT-E.
- Retouche de la Feuille de temps faite (D-186, D-187).
- Confirmation à la fermeture des dialogues faite (D-188, D-189) ; consolidation faite (D-190, D-191).
- Dévalidation (D-176 à D-180) et confirmation en quittant (D-172, D-173) faites, closes sans recette.
- SBOM CycloneDX fait (D-169 à D-171).
- REX-5 (Équipes et Calendriers dans l'écran Utilisateurs) fait, clos sans recette (D-165 à D-168).
- Lot 6 « Pilotage des ressources » fait (6a à 6f, D-147 à D-164).
- Lot 5 (durcissement, D-137) : fait. V1 livrée (lots 0 à 4).

## Dernier état
- D-203 : installation sous Windows abandonnée (section 10 de docs/installation.md supprimée, ligne 181 de la recette « Sans objet », `<adresse du dépôt>` remplacé par l'adresse du dépôt, commentaire de `.gitattributes` réécrit). Documentation seulement.
- Lot correctif-244 : suite complète verte, 491 e2e verts, vitest vert (journal docs/journal-suites.jsonl, lignes 17 et 18 : début 2026-11-24T08:54:58Z, fin 09:06:59Z, commit 3933dea ; vitest 225,8 s, e2e 494,7 s) ; passes ciblées (feuille-de-temps, validation, plan-de-charge, authentification, utilisateurs-equipes-calendriers) : 181 e2e verts ; lint, typecheck verts. Tag `tests-correctif-244`.
- Suites : 1235 vitest verts, 490 e2e verts sur 490 (lot e2e-parallele, journal docs/journal-suites.jsonl : une seule suite, début 2026-11-24T08:10:52Z, fin 08:23:12Z, commit eb29e80, verte : pré-contrôle 4,4 s, vitest 239,7 s, e2e 500,1 s à 2 workers) ; lint, typecheck, licences, sbom verts ; @reviewer : un point bloquant (course au démarrage du registre des piles), corrigé (D-199 (14), E2P-10).
- Derniers tags : `tests-retouches-rex6-r14` à `tests-retouches-rex6-r1`, `tests-retouches-rex6`, `tests-lot3f2-r7`, `tests-lot3f2-r6`, `tests-lot3f1-r5`, `tests-lot3e-r6`, `tests-lot6e-r3`, `tests-lot3b-regle12-r7`, `tests-accueil-g4-r5`, `tests-accueil-g3-r7`, `tests-accueil-g2-r8`, `tests-lot3d3b-r1`, `tests-lot3b-r3`, `tests-gantt-colonnes-2-r1`, `tests-gantt-colonnes-2`, `tests-gantt-colonnes-1b`, `tests-gantt-colonnes-1`, `tests-lot6c-r10`, `tests-lot6c-r9`, `tests-lot3f2-r5`, `tests-rex3b-r6`, `tests-lot3f1-r4`, `tests-lot3e-r5`, `tests-lot3b-regle12-r6`, `tests-lot6e-r2`, `tests-accueil-g4-r4`, `tests-accueil-g3-r6`, `tests-accueil-g2-r7`, `tests-correctif-rex3b-r2`, `tests-correctif-inverse`, `tests-correctif-rex3b-r1`, `tests-correctif-rex3b`, `tests-rex3b-r3`, `tests-recette-auto`, `tests-correctif-244`, `tests-e2e-parallele-reservation`, `tests-e2e-parallele-r1`, `tests-e2e-parallele`, `tests-prerequis-e2e-parallele` (tag léger), `tests-robustesse-tests`, `tests-vitest-parallele-r1`, `tests-vitest-parallele`, `tests-correctif-457-r2`, `tests-correctif-457`, `tests-ciblage`, `tests-garde-base-test`, `tests-garde-dialogue-r4`, `tests-garde-dialogue-r3`, `tests-garde-dialogue-r2`, `tests-garde-dialogue-r1`, `tests-garde-dialogue`, `tests-retouche-feuille`, `tests-autrui-e`, `tests-lot4b-r3`, `tests-devalidation-e-r1`, `tests-autrui-i`, `tests-autrui-i-r1`, `tests-lot4a-r2`, `tests-devalidation-e`, `tests-devalidation-i`, `tests-sortie`, `tests-sbom`, `tests-rex5`, `tests-rex5-r1`, `tests-lot6f`, `tests-lot6f-r1`, `tests-lot6f-r2`.
- Derniers identifiants : D-219, D-218, E2E-571 (E2E-558 à E2E-571 ; révisions D-219 (2)), GCO-9 (GCO-6-r1, GCO-7-r1), D-217, D-216, E2E-557 (E2E-540-r1 à E2E-557-r1 ; E2E-38-r3, E2E-143-r1 à E2E-157-r1, E2E-150-r2, E2E-92-r7, E2E-100-r5, E2E-109-r4, E2E-43-r7, E2E-381-r2, E2E-179-r5, E2E-191-r5, E2E-204-r2, E2E-209-r2), GCO-9, D-215, D-214, D-213, D-212, E2E-539 (E2E-521 à E2E-539 ; E2E-92-r6, E2E-100-r4, E2E-109-r3, E2E-381-r1, E2E-43-r6, E2E-179-r4, E2E-191-r4, E2E-289-r1, E2E-366-r2, E2E-209-r1), GCO-4, D-211, D-210, E2E-514-r1, D-209, E2E-520 (E2E-518 à E2E-520), D-208, D-207, E2E-517 (E2E-512 à E2E-517, E2E-517-r1, E2E-264-r3, E2E-267-r3, E2E-272-r3, E2E-277-r3), D-206, D-205, E2E-511 (E2E-468 à E2E-511), D-204, D-203, D-202, D-201, D-200, E2E-467, D-199, E2P-10 (E2E-460-r1, PRC-4-r1), D-198, HCM-5, PRC-5, D-197, STB-2 (INST-13-r1, BPW-7-r1, E2E-400-r1 à E2E-406-r1, E2E-439-r2 à E2E-459-r1, E2E-311-r2, E2E-346-r3), D-196, BPW-8 (TRX-2-r1, TRX-4-r1, TRX-5-r1), D-195, E2E-466 (E2E-457-r2), D-194, TC-13, E2E-463, SUI-11, D-193, GBT-9, SUI-9, D-192, PRT-1, GDL-7, AUT-17 (AUT-10-r1, FDT-3-r1), DEV-20, VFT-18, SBOM-10, CSV-20, GEO-55, AUTH-16, E2E-459 (E2E-221-r1, E2E-244-r4). Détail : docs/historique.md.

## Prochaine action
- charge-lisible et guide utilisateur (D-211 (5) c).
- Restes au backlog : non bloquants de D-214 (3) et D-217 (4), course entre deux chargements de `useListe` (D-209 (7)), E2E-401 et E2E-403, `afterEach` de `dev-demarrage.test.ts` et `lot5i-demarrage.test.ts`, REX-6 point 12, gestion des coûts (D-211 (6)).

## Ensuite, dans l'ordre
1. saisie-activites (D-211 (5) d).

## Aléas connus
- rex3b : annulation pendant un PATCH corrigée (D-207) ; défaut résiduel D-208 (4) corrigé (D-209) ; 2 workers retenus (D-210 (1)).
- E2E-514 : révisé en E2E-514-r1 (D-210 (2), tag `tests-correctif-rex3b-r2`) ; 20 sur 20 à 1 worker, 10 sur 10 à 3 workers. Pas de suite complète (D-210 (3)), la CI l'exécute au prochain push vers main.
- `savegarde.test.ts` : `CREATE DATABASE` échoue parfois sur la suite complète, vert seul.
- E2E-93 et E2E-79 : échouent parfois sur la suite complète, verts seuls.
- E2E-244-r4 : corrigé par D-200 (réserve de D-198 (5) levée, D-201). rex3b : échecs sous charge à 3 workers (docs/backlog.md) ; 2 workers retenus.
- Étape sbom de la CI : première exécution sur main à vérifier après la prochaine clôture (D-171 (2)).

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
