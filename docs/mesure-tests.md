# Mesure des tests (lot « Optimisation des tests », étape 1)

Mesure du 2026-11-23, commit c3cabd0, VM de développement, aucune autre suite en cours. Proposition : D-192.
Sorties brutes (reporters JSON, vmstat) gardées hors dépôt, dans le dossier de travail de la session.

## 1. Durées totales

| Suite | Résultat | Durée | CPU consommé |
|---|---|---|---|
| vitest (`npx vitest run`) | 135 fichiers, 1096 tests verts | 7 min 10 s (430 s) | 125 % d'un cœur |
| e2e (`npx playwright test`) | 480 tests verts, 0 instable | 14 min 10 s (850 s) | 39 % d'un cœur pour le lanceur ; serveurs et navigateur à part |
| Total d'une suite complète | | ≈ 21 min 20 s | |

### vitest, par projet

| Projet | Fichiers | Tests | Somme des durées |
|---|---|---|---|
| api | 83 | 663 | 389 s (96 %) |
| scripts | 7 | 29 | 19 s |
| engine | 15 | 202 | 0,2 s |
| web | 30 | 202 | 0,2 s |

Fichiers vitest les plus lents : `api/lot1-complements` 29,2 s (REF-1-r1 13,0 s et REF-2-r1 14,2 s, une requête refusée par route) ; `api/lot2e-saisies` 21,3 s ; `api/lot4a-imputations` 21,1 s ; `api/lot2a-calcul` 16,2 s ; `api/lot6b-ressource` 15,9 s ; `scripts/savegarde` 14,8 s.
Les projets api et scripts tournent un fichier à la fois (`fileParallelism: false`) : ils partagent la base `_test`.

### e2e, les 20 fichiers les plus lents

Somme des durées des tests : 835 s pour 480 tests (1,7 s en moyenne). Écart avec la durée totale : 14 s (démarrage et fin).

| Fichier | Somme (s) | Tests | Moyenne (s) |
|---|---|---|---|
| lot3f2.spec.ts | 69,5 | 15 | 4,6 |
| rex3b.spec.ts | 56,5 | 18 | 3,1 |
| lot3d4.spec.ts | 43,6 | 13 | 3,4 |
| lot3f1.spec.ts | 39,1 | 12 | 3,3 |
| lot3d3b.spec.ts | 33,7 | 15 | 2,2 |
| lot4b.spec.ts | 32,8 | 24 | 1,4 |
| lot4c.spec.ts | 31,7 | 21 | 1,5 |
| lot3d3a.spec.ts | 28,1 | 13 | 2,2 |
| lot3g.spec.ts | 25,4 | 11 | 2,3 |
| lot3e.spec.ts | 22,9 | 10 | 2,3 |
| cloture-c2.spec.ts | 21,1 | 14 | 1,5 |
| rex1.spec.ts | 20,9 | 13 | 1,6 |
| autrui-e.spec.ts | 19,9 | 14 | 1,4 |
| garde-dialogue.spec.ts | 18,2 | 17 | 1,1 |
| lot5d.spec.ts | 18,2 | 15 | 1,2 |
| lot6c.spec.ts | 16,8 | 11 | 1,5 |
| lot1b-c.spec.ts | 15,7 | 11 | 1,4 |
| rex5.spec.ts | 15,7 | 12 | 1,3 |
| lot3b-largeurs.spec.ts | 15,6 | 11 | 1,4 |
| lot6a.spec.ts | 15,3 | 11 | 1,4 |

Les 10 premiers font 46 % du temps e2e ; 8 sur 10 portent sur le Gantt (lot 3, rex3b). Aucun fichier ne dépasse 70 s : la répartition sur plusieurs workers ne bute pas sur un fichier dominant.

## 2. Coût du setup

| Poste | Mesure | Part estimée |
|---|---|---|
| Remise à zéro vitest (DROP SCHEMA, CREATE SCHEMA, 14 migrations) | 64 ms, dont 2 ms sans les migrations | 663 × 64 ms ≈ 42 s sur 389 s de l'api (11 %) |
| Vérification argon2 d'une connexion API | 46 ms | par connexion dans un test |
| Remise à zéro e2e (`prepare-db.mjs`, une seule fois) | 0,1 s | négligeable |
| Démarrage de l'API (`tsx src/server.ts`) | 0,8 s | négligeable |
| Démarrage de vite (dev) | 0,4 s ; première page servie à froid : 0,5 s | négligeable |
| `create-admin` (globalSetup) | 0,6 s | négligeable |
| Connexion e2e par l'écran (`loginAsAdmin`, `connecterAvec`) | 465 ms | 423 appels dans le code ; ≈ 3 min par suite |
| Contexte avec storageState réutilisé, puis Accueil | 295 ms | gain ≈ 170 ms par connexion, ≈ 70 s par suite |

- storageState n'est utilisé nulle part : chaque test se connecte par l'écran.
- Les e2e ne remettent pas la base à zéro entre les tests : une base unique accumule les données de tous les fichiers, dans l'ordre alphabétique. 11 fichiers vident des tables eux-mêmes (`TRUNCATE projet, historique …` ou `DELETE`) : accueil-g2, accueil-g3, rex1, rex2, rex2b, rex2c, rex2d, lot5i, et les helpers lot3c, lot4b, lot6a.
- Le setup ne pèse pas : le temps e2e est dans les tests eux-mêmes (navigation, rendu, attentes).

## 3. Configuration actuelle

Playwright 1.65.1 (`e2e/playwright.config.ts`) :
- `workers: 1`, `fullyParallel: false`, `retries` non défini (0, en local comme en CI) ;
- délai par test par défaut (30 s), `expect.timeout` 3 s, `actionTimeout` 3 s ;
- `globalSetup` : `create-admin` ; un seul `webServer` API (port 3000, `prepare-db.mjs` puis `tsx`, sans build) et un seul vite dev (5173, proxy `/api` vers `VITE_API_URL` ou 3000) ; `reuseExistingServer: false` ;
- un seul projet chromium.

vitest 5.1.0 (`vitest.config.ts`, 4 projets) :
- pool par défaut (forks), isolation par défaut (chaque fichier dans un processus neuf) ;
- api : `fileParallelism: false`, `testTimeout` 20 s, `setupFiles` (refus d'une base qui ne finit pas par `_test`), base remise à zéro avant chaque test (`useTestApp`) ;
- scripts : `fileParallelism: false`, `testTimeout` 60 s ;
- engine et web : parallélisme par défaut.

CI (`.github/workflows/ci.yml`) : suite complète à chaque push hors documentation (`paths-ignore` sur `docs/**` et `**/*.md`), `workers: 1` aussi.

## 4. Ressources de la VM

- 4 CPU, 3,3 Gio de RAM, aucun swap. Au repos : 2,3 Gio disponibles.
- Pendant vitest (vmstat toutes les 5 s) : 29 % user, 7 % système, 63 % inactif, file d'exécution moyenne 2,7, mémoire libre au plus bas 240 Mo.
- Pendant les e2e : 33 % user, 9 % système, 58 % inactif, file 3,0, mémoire libre au plus bas 119 Mo (cache disque récupérable en plus).
- Une pile e2e en mémoire (RSS) : vite dev 261 Mo, API 157 Mo (tsx 51 et node 106), chromium ≈ 520 Mo (6 processus), soit ≈ 0,95 Gio par worker, sans compter PostgreSQL.
- Conclusion : le CPU est à moitié inactif ; la RAM est la limite. Deux piles complètes tiennent ; trois non, sans swap.

## 5. Suites complètes lancées sur les derniers lots

Source : sorties conservées dans les dossiers de travail des sessions du 2026-11-23, rapprochées des heures des commits. Seules les suites dont la sortie a été écrite dans un fichier sont comptées : c'est un minimum.

| Lot (commits) | vitest complet | e2e complet | Temps des suites |
|---|---|---|---|
| Saisie pour autrui, AUT-I et AUT-E (13:50 à 15:10) | 1 (14:48) | 2 (14:25, 437 verts ; 15:09, 452 verts) | ≈ 34 min |
| Retouche de la Feuille de temps (15:30 à 16:04) | 1 (15:44) | 1 (15:58, 457 verts) | ≈ 21 min |
| Garde des dialogues (16:11 à 17:38) | 3 (16:38, 16:54, 17:07) | 2 (16:54, 17 échecs ; 17:20, 477 verts) | ≈ 51 min |
| Consolidation (17:49 à 18:15) | 1 (17:57) | 1 (18:13, 1 échec, E2E-457) | ≈ 23 min |

- Durée e2e observée : de 12,6 à 15,8 min, en hausse avec le nombre de tests (420 à 480).
- Le lot de la garde des dialogues a fait 5 suites complètes pour un lot de 1 h 30 : plus de la moitié du temps du lot.
- Le relecteur (`.claude/agents/reviewer.md`, point 3) lance lui aussi les tests ; ses suites n'apparaissent pas dans ces fichiers.

## 6. Hors des pistes retenues (pour mémoire)

- vitest api : 389 s en série sur une seule base ; une base par worker vitest le diviserait. Non retenu à ce stade.
- storageState pour les connexions e2e : ≈ 70 s par suite, à condition de garder des tests de connexion par l'écran.

## 7. Surcoût du garde-fou de base de test (D-193 (6))

Mesure du 2026-11-23, même VM, avant (commit 6300900, garde en ligne) et après (garde-fou unique, commit d36a545).

| Mesure | Avant | Après | Écart |
|---|---|---|---|
| `npx vitest run --project api packages/api/test/auth.test.ts` (8 tests), 5 lancements, durée murale | 2,03 ; 1,96 ; 1,97 ; 2,02 ; 2,01 s, moyenne 2,00 s | 1,95 ; 1,98 ; 2,02 ; 2,01 ; 1,97 s, moyenne 1,99 s | −0,01 s, dans le bruit (± 0,03 s) |
| même commande, durée rapportée par vitest | 1,53 à 1,58 s | 1,54 à 1,58 s | aucun |
| `node e2e/prepare-db.mjs`, 20 lancements | 55 ms | 56 ms | +1 ms, dans le bruit |
| `verifierBaseTest` (analyse d'URL), 200 000 appels | non mesuré | 741 ns par appel | — |
| `npx playwright test login.spec.ts` (4 tests, serveurs démarrés) | non mesuré | 5,0 s, verts | contrôle de bon fonctionnement |

- Le garde-fou s'exécute une fois par processus de test et une fois par appel de `testDbUrl()` (663 tests de l'API) : 663 × 0,74 µs ≈ 0,5 ms par suite. Surcoût négligeable, comme exigé.
- Autre coût, hors garde-fou : les 52 tests GBT et SUI (scripts/test) ajoutent ≈ 2 s à la suite vitest (garde-base-test.test.ts 1,9 s, suite-complete.test.ts 0,1 s, mesurés après correction) ; les refus de GBT-6 et GBT-7 interviennent avant le chargement des specs et des tests, d'où cette brièveté.

## 8. Session partagée de l'administrateur (D-194 (4)), avant et après

Mesure du 2026-11-23, même VM. Mode « écran » = `E2E_CONNEXION_ECRAN=1` (comportement d'avant, connexion par l'écran à chaque appel de `loginAsAdmin`) ; mode « partagé » = comportement de D-194. Sous-ensemble : domaines `dialogues`, `validation` et `authentification` (90 tests), 2 passes par mode, une passe à la fois.

| Mode | Passe 1 | Passe 2 | Moyenne | Tests verts |
|---|---|---|---|---|
| écran (avant) | 133,2 s | 129,6 s | 131,4 s | 86 et 87 sur 90 |
| partagé (après) | 122,5 s | 125,3 s | 123,9 s | 90 sur 90 |

- Gain mesuré : 7,5 s sur 131 s, soit 5,7 %. Écart entre passes d'un même mode : 3,6 s et 2,8 s ; le gain dépasse le bruit mais sans grande marge.
- Les échecs du mode « écran » : E2E-461, E2E-462 et E2E-463 (passes 1 et 2), qui testent la session partagée et échouent par construction quand elle est désactivée ; E2E-457-r1 (passe 1), voir la section 10.
- Suite e2e complète : avant 841,4 s (480 tests, commit 0b465aa, journal de l'étape 2a) ; après 823,7 s (484 tests, 1 échec rapide, E2E-457-r1, commit 6d8af92, journal de l'étape 2b). Écart −17,7 s (−2,1 %), du même ordre que la dispersion des suites précédentes (12,6 à 15,8 min) : une suite unique ne prouve pas le gain, la mesure du sous-ensemble est la référence. Estimation sur la suite complète : 3 à 6 %, soit 25 à 50 s.
- Le gain est limité : 192 appels de `loginAsAdmin` dans le code sur 423 connexions ; les 225 appels de `connecterAvec` (chef de projet, ressource, utilisateurs créés par les specs) restent par l'écran, car ces utilisateurs sont créés puis supprimés par les specs (D-194 (4)). Piste non retenue : mettre en cache par adresse email, à la première connexion, les sessions des autres utilisateurs (gain théorique ≈ 225 × 0,17 s ≈ 38 s, avec repli à l'écran si la session est révoquée).

## 9. Passe ciblée typique (D-194 (1))

| Passe | Contenu | Durée |
|---|---|---|
| `npm run tests-cibles -- --domaine dialogues` | 29 e2e (garde-dialogue, garde-dialogue-focus, sortie) | 36,3 s, soit 4,4 % de la suite e2e complète (823,7 s) |
| `--domaine dialogues --domaine validation --domaine authentification` | 90 e2e | ≈ 2 min (122,5 et 125,3 s) |
| `npm run tests-cibles -- --lister --depuis 6782d72` (ouverture de l'étape 2b) | 47 specs et 139 fichiers vitest retenus | 2,7 s, sans exécution |

- Limite : un changement de helper partagé (`e2e/tests/helpers.ts`, importé par 46 specs) ou de `packages/api/test/setup.ts` retient presque tout. Le ciblage par `--depuis` est utile pour les lots qui touchent des specs, des écrans isolés ou des modules ; pour un helper partagé, `--domaine` est plus précis.
- Sans `--depuis`, `--domaine` ne lance que des e2e (pas vitest).

## 10. Intermittence de E2E-457-r1, relevée pendant la mesure

E2E-457-r1 (garde-dialogue-focus, second Échap sur la confirmation) a échoué dans la suite complète de l'étape 2b et dans une passe de la section 8. Relancé seul sur la base de test : 3 échecs sur 18 exécutions avec la session partagée (1 sur 15, puis 2 sur 3) et 3 sur 18 en connexion par l'écran (3 sur 15, puis 0 sur 3). Même taux, ≈ 1 sur 6, dans les deux modes : l'intermittence est propre au test (la confirmation reste affichée après le second Échap) et sans lien avec la session partagée. Non corrigée ici (test sous tag, D-031) ; consignée dans docs/state.md et docs/backlog.md.

## 11. Correctif d'E2E-457 (D-195) : reproduction, diagnostic et validation

Machine : VM de développement, 4 cœurs, 3 Go. Chaque lancement passe par `npm run avec-base-test`, `--retries=0`, trace conservée en cas d'échec. Charge : 4 boucles actives (une par cœur) pendant toute la série ; charge moyenne relevée 2,1 au début, 6,2 à la fin. Deux exécutions simultanées sont impossibles (ports 3000 et 5173 fixes, backlog 4b).

| Série | Code | Mode | Résultat |
|---|---|---|---|
| E2E-457-r1, reproduction | avant | `--repeat-each=30`, même serveur | 30 verts, 0 échec |
| E2E-457-r1, reproduction | avant | 30 lancements séparés | 30 verts, 0 échec |
| Diagnostic, deux Échap sans attente (geste réel) | avant | 30 itérations | confirmation restée 15, fermée 15 ; dialogue et saisie conservés 30 |
| Diagnostic, Échap dès le focus sur « Annuler » | avant | 40 itérations | confirmation restée 11, fermée 27 ; 2 sans confirmation au premier Échap (`fill` sans geste, D-195 (2)) |
| E2E-466 | avant | `--repeat-each=5` | 5 rouges (confirmation restée) ; E2E-464 et E2E-465 : 10 verts |
| E2E-457-r2, validation | après | 30 lancements séparés, sans charge | 30 verts, 0 échec (4,0 à 6,4 s par lancement) |
| E2E-457-r2, validation | après | 30 lancements séparés, sous charge | 30 verts, 0 échec (7,4 à 8,1 s par lancement) |
| E2E-464 à E2E-466 | après | `--repeat-each=10`, sous charge | 30 verts |
| Diagnostic, deux Échap sans attente | après | 40 itérations, sous charge | confirmation fermée 40 (« Rester »), dialogue et saisie conservés 40 |
| Diagnostic, Échap dès le focus sur « Annuler » | après | 40 itérations, sous charge | confirmation fermée 40 |

Lecture : avant la correction, le second Échap était absorbé ou non selon l'instant de la bascule des écouteurs de Radix ; après, le résultat ne dépend plus de cet instant. Le taux d'≈ 1 sur 6 de la section 10 n'a pas été retrouvé sur E2E-457-r1 seul (0 sur 60) : la synchronisation de -r1 laisse une fenêtre courte, dont l'atteinte dépend de la charge du moment. La spec de diagnostic n'est pas commitée.

## 12. vitest en parallèle, une base par worker (D-196, lot vitest-parallele)

Mesure du 2026-11-23, VM de développement (4 cœurs, 3,3 Gio, sans swap), aucune autre suite en cours. Code : commit d2b2e4b (mécanisme de D-196, TRX-2-r1, TRX-4-r1, TRX-5-r1), `maxWorkers` passé en option (`--maxWorkers=3` puis `4`) ; ordre normal, `retries` 0. Chaque passe lancée par `npm run avec-base-test`, vmstat toutes les 5 s, connexions aux bases `…_vitest_…` relevées chaque seconde (`pg_stat_activity`). Ces passes vitest seules ne sont pas des suites complètes (aucune ligne au journal).

Référence avant : 1177 verts en 430,9 s, une base, en série (consigne du lot ; section 1 : 430 s).

| Passe | Workers | Durée murale | Tests | Pic de connexions | Bases de worker |
|---|---|---|---|---|---|
| w3-1 | 3 | 220,7 s | 1200 verts | 8 | 3 |
| w3-2 | 3 | 220,5 s | 1200 verts | 6 | 3 |
| w3-3 | 3 | 220,9 s | 1200 verts | 6 | 3 |
| w4-1 | 4 | 204,4 s | 1200 verts | 8 | 4 |
| w4-2 | 4 | 202,2 s | 1200 verts | 9 | 4 |
| w4-3 | 4 | 205,2 s | 1200 verts | 7 | 4 |

Ressources (moyennes vmstat sur la passe ; « libre » = colonne `free`, sans le cache disque récupérable) :

| Passe | user | système | inactif | file moyenne | file au plus haut | libre au plus bas |
|---|---|---|---|---|---|---|
| w3-1 | 57 % | 13 % | 27 % | 5,2 | 16 | 159 Mo |
| w3-2 | 57 % | 13 % | 27 % | 5,2 | 12 | 197 Mo |
| w3-3 | 57 % | 14 % | 27 % | 5,9 | 13 | 207 Mo |
| w4-1 | 64 % | 14 % | 19 % | 7,3 | 18 | 187 Mo |
| w4-2 | 64 % | 15 % | 19 % | 7,8 | 16 | 137 Mo |
| w4-3 | 63 % | 14 % | 20 % | 7,2 | 15 | 131 Mo |

Avant (section 4, vitest en série) : 29 % user, 7 % système, 63 % inactif, file 2,7, libre au plus bas 240 Mo.

- Gain : 430,9 s → 220,7 s en moyenne à 3 workers (−49 %), → 203,9 s à 4 workers (−53 %). 4 workers gagnent 17 s de plus sur 3, au-delà de l'écart entre passes (≤ 3 s). Aucun échec ni intermittent sur les 6 passes : 4 workers retenus (`packages/api/vitest.config.ts`).
- Contention : somme des durées des fichiers de l'API 549 s à 3 workers et 665 s à 4 (389 s en série) ; le CPU est presque saturé à 4 workers (19 % inactif). Un cinquième worker ne gagnerait presque rien sur cette VM.
- Reste en série : projet scripts, ≈ 23 s par passe (dont `savegarde` ≈ 15 s). Fichiers de l'API les plus lents en parallèle : `lot4a-imputations` 28,0 s, `lot1-complements` 27,6 s, `lot2e-saisies` 25,6 s (passe w4-1).
- Connexions : pic relevé 9 pour un majorant de 92 (D-196 (5)) ; `max` des pools inchangé, `max_connections` inchangé.
- Mémoire : libre au plus bas 131 Mo à 4 workers (240 Mo en série), cache disque récupérable en plus ; aucun processus tué.
- Détection des dépendances cachées (D-196 (8)) : chaque fichier seul sur base neuve, 141 fichiers, 1200 tests verts (496 s cumulés) ; passe en ordre aléatoire à 3 workers, graine 196 : 3 échecs (TRX-4, INST-13, BPW-7), 224,7 s ; graine 7, après TRX-2-r1, TRX-4-r1, TRX-5-r1 : 1200 verts, 222,5 s. Liste : docs/backlog.md.

## 13. Robustesse des e2e et des tests dépendants de l'ordre (D-197, lot robustesse-tests)

Mesure du 2026-11-23, VM de développement (4 cœurs), code au commit ce9bcec. Charge : 4 boucles actives (une par cœur) pendant toute la série, charge moyenne relevée de 6,4 à 8,1. Chaque passe : `npm run tests-cibles -- --depuis bc447b7` (10 specs e2e modifiées, 2 fichiers vitest), lancée par le point d'entrée réel, `retries` 0.

| Passes | Durée par passe | e2e | vitest | Échecs |
|---|---|---|---|---|
| 1 à 10 | 212 s (passe 1), 250 à 253 s ensuite | 90 verts sur 90 (garde-dialogue, garde-dialogue-focus, garde-dialogue-captures, lot1b-c, lot3e, lot4c, lot6a-captures, rex5, sortie, stabilite-helpers) | 24 verts sur 24 (lot5b-demarrage, bases-worker) | 0 sur 10 |

- Chaque spec révisée a donc passé 10 fois sous charge sans échec ni nouvelle tentative.
- INST-13-r1 et BPW-7-r1, ordre aléatoire (`--sequence.shuffle`) sur leurs deux fichiers : graines 196, 3 et 11, 24 verts à chaque fois. Avant révision : INST-13 en échec (délai du hook de 10 s) avec les graines 196 et 3 ; BPW-7 en échec (liste vide) lancé en premier.
- Limite : 0 échec sur 10 ne prouve pas l'absence d'intermittence rare ; la fenêtre visée (bascule des écouteurs de Radix) n'a de toute façon pas d'état observable (D-195 (2)).

## 14. e2e en parallèle, une pile par worker (D-199, lot e2e-parallele)

### Ressources de la VM après le passage à 8 Go (relevé du 2026-11-24, avant le lot)

```
$ free -h
               total        used        free      shared  buff/cache   available
Mem:           7.3Gi       799Mi       5.9Gi        18Mi       855Mi       6.5Gi
Swap:             0B          0B          0B
$ nproc
4
```

- 7,3 Gio vus (seuil du porteur : 7 Gio), 6,5 Gio disponibles au repos, aucun swap ; 4 CPU (inchangé).

### Mesure du front : vite dev par worker contre build servi (D-199 (2))

| Front | RSS après une page | Prêt | Première page | Rechargement |
|---|---|---|---|---|
| vite dev | 223 Mo | 0,37 s | 0,80 s | 0,63 s |
| build (`vite build --mode development`, 0,55 s) servi par `vite preview` | 144 Mo | 0,25 s | 0,58 s | 0,56 s |

vite dev retenu : le build sort React en mode production (pas de `jsxDEV`), ce qui change le code testé (`STRICT` de `Dialog`).

### Détection des dépendances cachées (D-199 (9))

Code au commit 0d3298d, `retries` 0, chaque lancement par `npm run avec-base-test`.

- Chaque spec seule, `--workers=1`, pile et base neuves : 75 specs, 977 s cumulées ; 74 vertes, 489 tests verts ; lot4b en échec sur E2E-244-r4 (1 sur 75). lot4b rejoué seul : 1 échec sur 3 (2 sur 4 en comptant la série) ; E2E-244-r4 isolé par `-g` : 8 verts sur 8 ; lot4b avec trace : 4 verts sur 4.
- Deux passes complètes à 2 workers, fichiers dans un ordre différent (`--shuffle`, graines 199 et 7) : 490 verts sur 490 chacune.
- Aucune dépendance entre fichiers trouvée. E2E-244-r4 : course du produit, indépendante du parallélisme (docs/backlog.md ; réserve de D-198 (5)).

### Passes complètes (D-199 (10))

Ordre normal sauf les deux passes mélangées ; `retries` 0. « libre » : `MemFree` ; « disponible » : `MemAvailable`, échantillonnés toutes les 2 s ; CPU et file d'exécution : vmstat toutes les 5 s. Ports 3000 et 5173 relevés toutes les 2 s : jamais ouverts sur l'ensemble des passes.

| Passe | Workers | Graine | Durée (s) | Verts | user | système | inactif | file moy. / max | charge max | libre min | disponible min | swap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ordre-g199 | 2 | 199 | 509,6 | 490/490 | 56,2 % | 15,3 % | 28,2 % | 6,2 / 19 | 8,13 | 2190 Mo | 3940 Mo | 0 Mo |
| ordre-g7 | 2 | 7 | 499 | 490/490 | 55,8 % | 15,4 % | 28,5 % | 6,2 / 15 | 7,65 | 2471 Mo | 4209 Mo | 0 Mo |
| w2-1 | 2 | — | 518,2 | 490/490 | 56,3 % | 15 % | 28,2 % | 5,6 / 14 | 6,79 | 2389 Mo | 4127 Mo | 0 Mo |
| w2-2 | 2 | — | 513,4 | 490/490 | 56,3 % | 15 % | 28,4 % | 6,8 / 18 | 7,2 | 2471 Mo | 4179 Mo | 0 Mo |
| w2-3 | 2 | — | 494,1 | 489/490 | 55,5 % | 15,4 % | 28,9 % | 5,5 / 16 | 8,89 | 2470 Mo | 4175 Mo | 0 Mo |
| w3-1 | 3 | — | 475,2 | 490/490 | 65,6 % | 17,3 % | 16,6 % | 9,5 / 23 | 11,74 | 1390 Mo | 3114 Mo | 0 Mo |
| w3-2 | 3 | — | 507,5 | 488/490 | 65 % | 16 % | 18,6 % | 9,1 / 25 | 10,84 | 1741 Mo | 3468 Mo | 0 Mo |
| w3-3 | 3 | — | 512,3 | 486/490 | 62,3 % | 16 % | 21,4 % | 8,2 / 24 | 10,79 | 1757 Mo | 3486 Mo | 0 Mo |

- Échecs : w2-3, E2E-244-r4 ; w3-2, E2E-264-r2 et E2E-267-r2 ; w3-3, E2E-244-r4, E2E-267-r2, E2E-272-r2, E2E-277-r2 (rex3b : date restée au 2027-01-11 après Ctrl+Z au lieu du 2027-01-12, délai de 3 s dépassé). Les passes à 4 workers n'ont pas été menées : arrêt sur les échecs de rex3b (consigne du porteur), w4-1 interrompue au démarrage, ses 4 bases supprimées par le nettoyage suivant.
- Référence avant : e2e 828,8 s à 1 worker (dernière suite complète, lot robustesse-tests).
- Choix (porteur, D-199 (13)) : 2 workers. Moyenne des trois passes de validation : 508,6 s (−39 %). 3 workers : 498,3 s en moyenne, aucun gain au-delà de l'écart entre passes, CPU saturé (17 à 21 % inactif sur 4 cœurs, charge jusqu'à 11,7) et échecs de rex3b sous charge (docs/backlog.md). RAM disponible au plus bas : 3,9 Gio à 2 workers (seuil : 1 Gio).

### E2E-244-r4 : taux d'échec par nombre de workers (référence « avant » du lot correctif-244)

| Contexte | Échecs |
|---|---|
| lot4b seul, 1 worker | 2 sur 8 (série « spec seule » et rejeux ; 0 sur 4 avec trace) |
| isolé par `-g`, 1 worker | 0 sur 8 |
| passes complètes, 2 workers | 1 sur 5 (w2-3 ; 0 sur 2 passes mélangées) |
| passes complètes, 3 workers | 1 sur 3 (w3-3) |

Chaque échec relevé : titre resté « Feuille de temps », liste « Ressource » revenue sur « Choisir… » (contexte d'erreur de w2-3).

### Passe ciblée par le point d'entrée réel (D-197 (6))

`npm run tests-cibles -- --domaine dialogues`, 2 workers : 34 e2e verts en 29,1 s au mur (28,4 s selon Playwright), contre 29 e2e en 36,3 s à 1 worker (section 9). `npm run tests-cibles -- --depuis 5a6e9f6 --lister` : 60 specs retenues (helpers modifiés), configuration évaluée sans démarrer de pile.

### Suite complète de clôture (lot e2e-parallele)

`npm run suite-complete -- --lot e2e-parallele`, commit eb29e80, arbre propre : pré-contrôle vert en 4,4 s ; vitest 1235 verts en 239,7 s ; e2e 490 verts en 500,1 s à 2 workers (E2E-244-r4 vert) ; résultat vert, une seule suite au journal pour le lot.

## 15. Bilan de l'optimisation des tests (étapes 2a à 2e, D-193 à D-199)

| Mesure | Avant (section 1, 2026-11-23) | Après (clôture de e2e-parallele, 2026-11-24) | Écart |
|---|---|---|---|
| vitest complet | 430 s (1096 tests, en série) | 239,7 s (1235 tests, 4 workers, D-196) | −44 % |
| e2e complet | 850 s (480 tests, 1 worker) ; 828,8 s à la clôture de robustesse-tests (489 tests) | 500,1 s (490 tests, 2 workers, D-199) | −41 % (−40 % sur 828,8 s) |
| Suite complète | ≈ 1280 s (21 min 20) | 744 s (12 min 24), pré-contrôle de 4,4 s compris | −42 % |
| Passe ciblée de référence (`tests-cibles --domaine dialogues`) | aucune avant 2b : suite e2e complète, ≈ 14 min ; 36,3 s pour 29 tests à 1 worker (section 9) | 29,1 s pour 34 tests à 2 workers | −20 % (et −96 % contre une suite e2e complète) |
| Suites complètes par lot | jusqu'à 5 (garde des dialogues, section 5) | 1 par lot (D-193), plus une justifiée au lot robustesse-tests | |

- Le volume de tests a augmenté pendant l'optimisation (vitest +13 %, e2e +2 %) : les gains sont mesurés à volume plus élevé.
- Gains par étape : 2a (D-193) borne le nombre de suites ; 2b (D-194) ciblage et session partagée, ≈ 70 s par suite e2e ; 2c (D-196) vitest −49 % ; 2d (D-197) robustesse, sans gain de durée ; 2e (D-199) e2e −40 %. Le pré-contrôle (D-198) coûte 4 s et évite de consommer une suite sur une erreur structurelle.
- Limites : 3 workers e2e ne gagnent rien sur cette VM (CPU saturé) ; E2E-244-r4 reste intermittent (lot correctif-244) ; rex3b fragile sous forte charge (backlog).

## 16. Validation de la correction de `Redirect` (D-200 (5), lot correctif-244)

Code au commit e16a6ca (`Redirect` en `useLayoutEffect`), `retries` 0, 1 worker. Commande de chaque passe, par `npm run avec-base-test` : `cd e2e && npx playwright test lot4b.spec.ts --workers=1 --reporter=list`.

| Passe | Résultat | Durée (s) | E2E-244-r4 |
|---|---|---|---|
| 1 | 24/24 verts | 36,0 | vert |
| 2 | 24/24 verts | 36,7 | vert |
| 3 | 24/24 verts | 36,5 | vert |
| 4 | 24/24 verts | 37,1 | vert |
| 5 | 24/24 verts | 36,1 | vert |
| 6 | 24/24 verts | 35,9 | vert |
| 7 | 24/24 verts | 36,4 | vert |
| 8 | 24/24 verts | 36,2 | vert |

- Résultat : 0 échec sur 8, contre 2 échecs sur 8 pour la référence (section 14, lot4b rejoué seul, avant correction).
- E2E-467 : 3 exécutions ciblées vertes sur 3 (1 worker), rouge 5 fois sur 5 avant la correction.

## 17. Validation de l'hypothèse B de D-206 après la correction de D-207 (lot correctif-rex3b)

Code au commit 45e0779 (correctif de D-207 (1) et révisions -r3), `retries` 0, 3 workers, chaque passe par `npm run avec-base-test -- npm run test:e2e -- --workers=3 --retries=0`, 541 tests. Référence : 2 passes en échec sur 3 à 3 workers sur les quatre tests rex3b (docs/backlog.md, passes w3). Sorties brutes hors dépôt (dossier de travail de la session).

| Passe | Début (UTC) | Durée (s) | Verts | Échecs |
|---|---|---|---|---|
| 1 | 2026-11-24T11:01:27Z | 548 | 536 / 541 | E2E-95, E2E-470, E2E-472, E2E-267-r3, E2E-272-r3 |
| 2 | 2026-11-24T11:10:35Z | 548 | 539 / 541 | E2E-470, E2E-472 |
| 3 | 2026-11-24T11:19:43Z | 548 | 539 / 541 | E2E-470, E2E-472 |

Échecs de rex3b (passe 1 seulement, valeurs lues par les -r3) :

- E2E-272-r3 : `PATCH #3` attendu `{ debut_valide: '2027-01-12' }` (inverse du geste 2), lu `{ debut_valide: '2027-01-11' }`. Journal : #1 12/01, #2 13/01, #3 11/01.
- E2E-267-r3 : `PATCH #40` attendu `{ debut_valide: '2027-01-13' }`, lu `{ debut_valide: '2027-01-11' }`. Journal des 40 PATCH dans le message d'échec.
- Lecture : l'inverse du geste 2 (ou de l'avant-dernier) porte la valeur d'origine, 11/01, au lieu de la valeur du geste précédent. `inverseBarre` (gantt/annulation.ts:35) lit les valeurs d'avant dans l'élément capturé au début du glisser : cet élément n'avait pas encore reçu le résultat du geste précédent. Hypothèse de lecture du code, non prouvée (aucune reproduction ciblée). Le défaut de D-207 (1) (annulation pendant le PATCH) n'est pas en cause : aucun PATCH inverse n'a été envoyé pendant une retenue. Les -r3 le relèvent, les -r2 ne le relevaient pas (corps non vérifié).
- Résultat : rex3b à 3 workers, 1 passe en échec sur 3 (référence : 2 sur 3) ; E2E-264-r3 et E2E-277-r3 verts sur les 3 passes. Valeur d'origine de 2027-01-11 atteinte par une annulation de trop : cause à instruire, hors D-207.

Échecs hors rex3b :

- E2E-470 et E2E-472 (recette-auto-admin.spec.ts) : rouges sur les 3 passes. E2E-470 : lignes du Plan de charge, attendu 3, lu 4 ; E2E-472 : attendu 1, lu 2. Verts seuls à 1 worker (2 sur 2). Non liés au Gantt ; non vus à 2 workers (suite de recette-auto, D-205).
- E2E-95 (accueil-g3.spec.ts) : passe 1 seulement, « Chargement du contenu… » lu à la place des lignes « Act S95 » et « Act SS95 » ; fragilité connue (docs/state.md, aléas).

Le retour à 3 workers par défaut n'est pas décidé ici (D-207 (4)).

## 18. Validation de la correction de D-209 (lot correctif-inverse)

Code au commit 64bf694 (correction de D-208 (4) dans `useListe`), `retries` 0, 3 workers, chaque passe par `npm run avec-base-test -- npm run test:e2e -- --workers=3 --retries=0`, 544 tests. Sorties brutes hors dépôt (dossier de travail de la session).

| Passe | Début (UTC) | Durée (s) | Verts | Échecs |
|---|---|---|---|---|
| 1 | 2026-11-24T13:01:18Z | 545 | 544 / 544 | — |
| 2 | 2026-11-24T13:10:23Z | 546 | 544 / 544 | — |
| 3 | 2026-11-24T13:19:29Z | 544 | 544 / 544 | — |

Comparaison avec la section 17 (commit 45e0779, 541 tests) : rex3b en échec dans 1 passe sur 3 (E2E-267-r3, E2E-272-r3), ici 0 sur 3 ; E2E-470 et E2E-472 corrigés depuis (D-208 (3)) ; E2E-95 non reproduit. Durées : 548 s par passe en section 17, 545 s en moyenne ici. Suite complète du lot à 2 workers (journal, ligne 26) : e2e 554,3 s. 3 workers ne gagnent que 2 % (dans l'écart entre passes) ; le retour à 3 workers par défaut n'est pas décidé ici (D-209 (6)).
