# État du projet
Source de vérité sur l'avancement. Mis à jour par Claude Code en fin de session, puis poussé. Moins de 60 lignes.

## Lot en cours
- Lot robustesse-ci (D-262, D-263, ouverture 5f045af) fait et clos : E2E-197-r2, E2E-403-r1, nettoyage de vitest sur 42501 (BPW-9 à BPW-11), délais 5 s en CI, upload-artifact v6, `remettreAdminSeul` repris sur deadlock (STB-3-r1). Suite complète verte (journal, lignes 81 et 82) ; @reviewer sans bloquant.
- Lot taux (taux-1 : D-258, D-259, ouverture 43ea835 ; taux-2 : D-260, D-261, ouverture 1609e71 ; domaines plan-de-charge, utilisateurs-equipes-calendriers, projets, gantt, dialogues) fait et clos : taux par équipe, taux résolu, taux du jour, écriture des taux propres par le chef (SPEC §12.6), puis écrans (point 12 : dialogues « Taux de l'équipe <nom> » et « Taux de <nom> », colonne « Taux du jour » en une requête). E2E-684 à E2E-695 (tag `tests-taux-2`), aucune révision ; suite complète verte (journal, lignes 79 et 80) ; @reviewer sans bloquant.
- Lots clos du 2026-11-26 avant taux (correctif-atterrissage, mot-de-passe, accueil-sans-bandeau, correctif-garde-focus, onglets, pilotage, export-plan-de-charge, colonne-ressources, retours-deploiement-2, nettoyage-couts, version, couts-1 et 2, retours-deploiement-1) : docs/historique.md, section « Lots clos du 2026-11-26 ».
- Faits plus anciens (optimisation des tests D-193 à D-199, saisie pour autrui D-181 à D-184, confirmation à la fermeture D-188 à D-191, dévalidation, SBOM D-169 à D-171, REX-5, lots 5 et 6) : docs/historique.md, section du 2026-11-25.

## Dernier état
- Version publiée : 1.2.0 (D-264, clôture de journée du 2026-11-26, tag `v1.2.0` sur le commit de main) ; lots publiés D-250 à D-263.
- Derniers tags : `tests-robustesse-ci-2-r1`, `tests-robustesse-ci-2`, `tests-robustesse-ci-r1`, `tests-robustesse-ci`, `tests-taux-2`, `tests-taux-1-r1`, `tests-taux-1`, `tests-correctif-atterrissage`, `tests-mot-de-passe-r1`, `tests-mot-de-passe`, `tests-accueil-sans-bandeau-r1`, `tests-accueil-sans-bandeau`, `tests-correctif-garde-focus`, `tests-onglets-r1`, `tests-onglets`, `tests-pilotage-2-r2`, `tests-pilotage-2-r1`, `tests-pilotage-2`, `tests-pilotage-1`, `tests-export-plan-de-charge-r1`, `tests-export-plan-de-charge`, `tests-colonne-ressources-r1`, `tests-colonne-ressources`, `tests-retours-deploiement-2-r2`, `tests-retours-deploiement-2-r1`, `tests-retours-deploiement-2`, `tests-nettoyage-couts`, `tests-version-r1`, `tests-version`, `tests-retouches-rex6-r14` à `tests-retouches-rex6-r1`, `tests-retouches-rex6`, `tests-lot3f2-r7`, `tests-lot3f2-r6`, `tests-lot3f1-r5`, `tests-lot3e-r6`, `tests-lot6e-r3`, `tests-lot3b-regle12-r7`, `tests-accueil-g4-r5`, `tests-accueil-g3-r7`, `tests-accueil-g2-r8`, `tests-lot3d3b-r1`, `tests-lot3b-r3`, `tests-gantt-colonnes-2-r1`, `tests-gantt-colonnes-2`, `tests-gantt-colonnes-1b`, `tests-gantt-colonnes-1`, `tests-lot6c-r10`, `tests-lot6c-r9`, `tests-lot3f2-r5`, `tests-rex3b-r6`, `tests-lot3f1-r4`, `tests-lot3e-r5`, `tests-lot3b-regle12-r6`, `tests-lot6e-r2`, `tests-accueil-g4-r4`, `tests-accueil-g3-r6`, `tests-accueil-g2-r7`, `tests-correctif-rex3b-r2`, `tests-correctif-inverse`, `tests-correctif-rex3b-r1`, `tests-correctif-rex3b`, `tests-rex3b-r3`, `tests-recette-auto`, `tests-correctif-244`, `tests-e2e-parallele-reservation`, `tests-e2e-parallele-r1`, `tests-e2e-parallele`, `tests-prerequis-e2e-parallele` (tag léger), `tests-robustesse-tests`, `tests-vitest-parallele-r1`, `tests-vitest-parallele`, `tests-correctif-457-r2`, `tests-correctif-457`, `tests-ciblage`, `tests-garde-base-test`, `tests-garde-dialogue-r4`, `tests-garde-dialogue-r3`, `tests-garde-dialogue-r2`, `tests-garde-dialogue-r1`, `tests-garde-dialogue`, `tests-retouche-feuille`, `tests-autrui-e`, `tests-lot4b-r3`, `tests-devalidation-e-r1`, `tests-autrui-i`, `tests-autrui-i-r1`, `tests-lot4a-r2`, `tests-devalidation-e`, `tests-devalidation-i`, `tests-sortie`, `tests-sbom`, `tests-rex5`, `tests-rex5-r1`, `tests-lot6f`, `tests-lot6f-r1`, `tests-lot6f-r2`.
- Derniers identifiants : D-263, D-262, STB-3-r1, BPW-11 (BPW-9 à BPW-11 ; E2E-197-r2, E2E-403-r1) ; avant : D-261, D-260, E2E-695 (E2E-684 à E2E-695) ; avant : D-259, D-258, TEQ-1 à TDJ-6 ; avant : D-257, D-256, E2E-683 (E2E-682 et E2E-683) ; avant : D-255, D-254, E2E-681 (E2E-678 à E2E-681 ; MDP-1 à MDP-5 ; révisions : D-255 (3)) ; avant : D-253, D-252, E2E-677 ; avant : D-251, D-250, E2E-676 (E2E-674 à E2E-676) ; avant : D-248, D-247, E2E-673 (E2E-666 à E2E-673 ; révisions : D-248 (3)) ; avant : D-246, D-245, E2E-665 (E2E-658 à E2E-665 ; E2E-659-r1, E2E-660-r1, E2E-662-r1, GEO-43-r1, E2E-368-r1, E2E-370-r1, E2E-376-r3, E2E-387-r4, E2E-468-r1, E2E-470-r1, E2E-477-r1, E2E-484-r2, E2E-493-r1, E2E-43-r10, E2E-179-r8, E2E-191-r8, E2E-204-r3, E2E-358-r5, E2E-362-r4), D-244, D-243, PIL-14 (PIL-1 à PIL-14), D-242, D-241, E2E-657 (PCX-1 à PCX-3 ; CSV-5-r1 à CSV-11-r1, E2E-383-r1, E2E-386-r1, E2E-387-r3), D-238, E2E-656 (E2E-650 à E2E-656 ; CRS-1 à CRS-4), D-236, D-235, E2E-649 (E2E-642 à E2E-649 ; RD2-1, RD2-2-r1, E2E-643-r1), D-234, D-233, E2E-641, NCO-8 (NCO-1 à NCO-8), D-232, D-231, E2E-640 (E2E-636 à E2E-640), VER-7, D-230, D-229, E2E-635 (E2E-629 à E2E-635 ; révisions D-230 (3)), COUT-7, CEX-4, CVI-5, GCO-7-r2, D-228, D-227, E2E-628 (E2E-623 à E2E-628), CAC-5, GCO-6-r2, D-226, D-225, E2E-622 (E2E-607 à E2E-622), TJ-12, OTP-11, MIG-10-r1, D-224, E2E-365-r2, D-223, D-222, E2E-606 (E2E-584 à E2E-606), SAA-4, D-221, D-220, E2E-583 (E2E-572 à E2E-583 ; E2E-365-r1), CHA-3, CHL-2, D-219, D-218, E2E-571 (E2E-558 à E2E-571 ; révisions D-219 (2)), GCO-9 (GCO-6-r1, GCO-7-r1), D-217, D-216, E2E-557 (E2E-540-r1 à E2E-557-r1 ; E2E-38-r3, E2E-143-r1 à E2E-157-r1, E2E-150-r2, E2E-92-r7, E2E-100-r5, E2E-109-r4, E2E-43-r7, E2E-381-r2, E2E-179-r5, E2E-191-r5, E2E-204-r2, E2E-209-r2), GCO-9, D-215, D-214, D-213, D-212, E2E-539 (E2E-521 à E2E-539 ; E2E-92-r6, E2E-100-r4, E2E-109-r3, E2E-381-r1, E2E-43-r6, E2E-179-r4, E2E-191-r4, E2E-289-r1, E2E-366-r2, E2E-209-r1), GCO-4, D-211, D-210, E2E-514-r1, D-209, E2E-520 (E2E-518 à E2E-520), D-208, D-207, E2E-517 (E2E-512 à E2E-517, E2E-517-r1, E2E-264-r3, E2E-267-r3, E2E-272-r3, E2E-277-r3), D-206, D-205, E2E-511 (E2E-468 à E2E-511), D-204, D-203, D-202, D-201, D-200, E2E-467, D-199, E2P-10 (E2E-460-r1, PRC-4-r1), D-198, HCM-5, PRC-5, D-197, STB-2 (INST-13-r1, BPW-7-r1, E2E-400-r1 à E2E-406-r1, E2E-439-r2 à E2E-459-r1, E2E-311-r2, E2E-346-r3), D-196, BPW-8 (TRX-2-r1, TRX-4-r1, TRX-5-r1), D-195, E2E-466 (E2E-457-r2), D-194, TC-13, E2E-463, SUI-11, D-193, GBT-9, SUI-9, D-192, PRT-1, GDL-7, AUT-17 (AUT-10-r1, FDT-3-r1), DEV-20, VFT-18, SBOM-10, CSV-20, GEO-55, AUTH-16, E2E-459 (E2E-221-r1, E2E-244-r4). Détail : docs/historique.md.

## Prochaine action
- Vue chef de projet et leaders métiers (backlog n° 1), à cadrer avec claude.ai.
- À cadrer (porteur, 2026-11-26) : appartenance à plusieurs équipes (docs/backlog.md) .
- À ratifier par le porteur : titres h1 inchangés par les onglets (D-248 (4)). Retours à trier : E2E-203-r3 sous charge (backlog), item « leaders métiers » (réexamen des droits, D-247).
- À ratifier par le porteur : titre h1 « Pilotage » (D-246 (3)).
- Retours du déploiement, à trier en lots (backlog du 2026-11-25).
- Restes au backlog : non bloquants de D-214 (3) et D-217 (4), course entre deux chargements de `useListe` (D-209 (7)), `afterEach` de `dev-demarrage.test.ts` et `lot5i-demarrage.test.ts`, REX-6 point 12, onglets « Modèles » et « Validation » (à cadrer), leaders métiers, amendement de CLAUDE.md sur l'attente des commandes longues.

## Aléas connus
- rex3b : annulation pendant un PATCH corrigée (D-207) ; défaut résiduel D-208 (4) corrigé (D-209) ; 2 workers retenus (D-210 (1)).
- E2E-514 : révisé en E2E-514-r1 (D-210 (2), tag `tests-correctif-rex3b-r2`) ; 20 sur 20 à 1 worker, 10 sur 10 à 3 workers. Pas de suite complète (D-210 (3)), la CI l'exécute au prochain push vers main.
- `savegarde.test.ts` : `CREATE DATABASE` échoue parfois sur la suite complète, vert seul.
- E2E-93 et E2E-79 : échouent parfois sur la suite complète, verts seuls.
- E2E-244-r4 : corrigé par D-200 (réserve de D-198 (5) levée, D-201). rex3b : échecs sous charge à 3 workers (docs/backlog.md) ; 2 workers retenus.

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
- docs/guide-utilisateur.md : guide utilisateur (D-220).

## Blocages
- Aucun.
