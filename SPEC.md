# SPEC — Outil de gestion de projet (V1)

Statut : version 0.3, à modifier de façon incrémentale (ne jamais réécrire le document).

## 1. Cadre

- **Objet** : serveur web de gestion de projet : utilisateurs, planning (projets, activités, jalons), Gantt éditable, imputations, moteur de planification, modèles et copie de projet.
- **Licence du projet** : MIT. Dépendances d'exécution : MIT, Apache 2.0, BSD, ISC, 0BSD. Outillage de développement : en plus BlueOak-1.0.0, CC0-1.0, Python-2.0, CC-BY-4.0, Unlicense, MPL-2.0. GPL, AGPL et LGPL interdites partout. Contrôle automatique des licences dans la CI.
- **Origine** : implémentation de zéro. Aucun code source tiers sous AGPL ne doit être lu, copié ou adapté dans ce dépôt. Cette spec est la seule référence fonctionnelle.
- **Méthode** : TDD. Chaque cas de test de ce document devient un test automatisé avant l'écriture du code correspondant. Les tests hors moteur (identifiants AUTH, USR, MIG, LIC, SAV, E2E et suivants) sont catalogués dans docs/tests.md ; chaque entrée cite la section de cette spec qui fonde la règle, ou, pour les tests d'outillage (CI), la décision de docs/decisions.md.
- **Stack** : TypeScript partout. React (web), Node.js (API), PostgreSQL. Moteur de planification dans un paquet isolé, sans accès base ni réseau.

### Hors périmètre V1

Tickets, RH, environnements, documents, réunions, pools de ressources, capacité variable dans le temps (modifié par D-276 : les absences d'une ressource y entrent, §4 « Absences et charge depuis le taux »), chemin critique, planning de référence, coûts : voir §12 (D-225), import de données d'un autre logiciel. Une équipe (6a) n'est pas un pool de ressources : elle regroupe des utilisateurs pour l'affichage et les filtres, et n'est jamais affectée ni assignée.

Modes de planification écartés : travail en commun, régulier en jours entiers, en demi-journées, en quarts de journée, récurrent hebdomadaire.

## 2. Rôles

| Rôle | Droits |
|---|---|
| Administrateur | Tout, dont utilisateurs, calendriers, paramètres |
| Chef de projet | Créer et modifier ses projets, activités, jalons, affectations ; lancer le calcul ; valider les imputations de ses projets (modifié par D-265 : lit tous les projets, écrit dans sa portée seulement) |
| Leader métier | Chef de projet dont la portée d'écriture est tous les projets ordinaires ; valide les imputations de tous les projets ; ne voit aucun montant de vente, de marge ni de coût (D-265) |
| Ressource | Mes tâches, sa feuille de temps, lecture des calendriers ; aucun accès aux projets (6b, D-148) (modifié par REX-5, D-165 : la lecture se faisait par la section « Mon calendrier » de Mes tâches ; section supprimée par D-218 (5) : plus d'écran de lecture de son calendrier, les routes d'API sont inchangées) |

Un utilisateur peut être ressource (planifiable) ou non. Authentification par identifiant (`login`, distinct de l'email, REX-2, D-077) et mot de passe (hachage argon2), session par cookie. Le premier administrateur est créé par la commande `npm run create-admin`. La session expire après 12 h.

- L'email, facultatif (REX-2, D-077), est normalisé en minuscules (création, modification). Renseigné, son format et son unicité sont contrôlés.
- Identifiant de connexion `login` (REX-2, D-077) : obligatoire en base, unique, normalisé (espaces de bord retirés, minuscules), non vide, sans autre format. À la création, `login` absent prend la valeur de l'email ; `login` et email absents : refus (400). Modifier l'email ne modifie pas le login, et inversement. Login déjà utilisé : 409 { erreur: 'Identifiant déjà utilisé' }, rien n'est créé ni modifié.
- Connexion par le login seul : POST /api/auth/login accepte la clé `identifiant` ; la clé `email` reste acceptée comme synonyme et est comparée au login ; casse et espaces de bord sont ignorés. Un utilisateur dont le login diffère de l'email ne se connecte pas avec son email.
- Initiales (REX-2, D-077) : facultatives, 1 à 4 caractères, espaces de bord retirés ; vides ou null = aucune. Plus de 4 caractères : 400.
- `login` et `initiales` figurent dans les réponses de /api/utilisateurs et /api/auth/me.
- Un administrateur ne peut ni se désactiver ni changer son propre rôle.
- Il reste toujours au moins un administrateur actif.
- Un changement de mot de passe ou de rôle, ou une désactivation, révoque les sessions de l'utilisateur concerné ; les sessions de plus de 12 h sont supprimées à la connexion.
- `create-admin` refuse un email mal formé et un mot de passe vide ; option `--login` ; `--email` est facultatif, l'un des deux est requis (REX-2, D-077). Aucune longueur minimale : un mot de passe non vide suffit, pour `create-admin` comme pour l'API (REX-2, D-076). (modifié par D-274 : 12 caractères au moins, §8 « Corrections de sécurité (securite-2, D-274) » point 4)
- Compte de développement (D-071) : au démarrage de l'API, un administrateur actif (nom « Administrateur », login « admin », email null, mot de passe « admin ») est créé si la variable d'environnement `NODE_ENV` est définie et égale exactement à « development » (absente : aucune création), si la table utilisateur est vide et si la variable `DEV_ADMIN` ne vaut pas « 0 ». Aucune création dans tout autre cas (production, test, base non vide, `DEV_ADMIN=0`). Un avertissement est écrit dans le journal à la création. Le login n'a aucun format, l'email « admin » n'existe plus (D-077) : `create-admin` et `POST /api/utilisateurs` gardent le contrôle du format de l'email renseigné (plus de minimum de longueur, D-076).
- Le champ identifiant de l'écran Connexion n'est pas de type email (il accepte « admin ») ; son libellé est « Identifiant » (D-077, au lieu de « Email ») ; refus de connexion : « Identifiant ou mot de passe incorrect. ».
- Toute route de l'API, hors connexion, exige une session valide ; sinon 401.
- La déconnexion invalide la session.
- L'email, quand il est renseigné, est unique ; une création sur un email existant est refusée (409 'Email déjà utilisé'), rien n'est créé.
- Le mot de passe haché n'apparaît dans aucune réponse de l'API ; le jeton de session est stocké haché.
- Équipes (lot 6a, D-147) : la liste des équipes est lisible par tout utilisateur connecté ; création, renommage et suppression sont réservés à l'administrateur (403 sinon).
- Les calendriers sont lisibles par tout utilisateur connecté. Un chef de projet ne lit que ses projets (ceux dont il est chef, ou dont l'un des ancêtres a pour chef) ; l'historique d'un projet est réservé à l'administrateur et à son chef de projet. (modifié par D-265 : le chef de projet lit tous les projets ; l'historique reste réservé à l'administrateur et à qui écrit sur le projet, chef dans sa portée ou leader métier ; voir §2 « Lecture élargie du chef et rôle leader métier (droits, D-265) »)
- Un administrateur ou un chef de projet lit les projets où il est affecté (D-148 : plus le rôle ressource, dont la portée de lecture est vide) ; en dehors de ses propres projets, un chef de projet y est en lecture seule.
- Tout utilisateur connecté lit l'annuaire : identifiant, nom, rôle, est_ressource et actif de chaque utilisateur, actif ou non. L'annuaire n'expose ni l'email, ni le login, ni les initiales (celles-ci n'y entrent qu'au lot 3d, D-077), ni aucune autre donnée.
- Chaque projet renvoyé par `GET /api/projets` et `GET /api/projets/:id` porte `peut_ecrire` : vrai si l'utilisateur peut écrire sur ce projet (administrateur, ou chef de projet dans sa portée), faux sinon (lecture seule). (modifié par D-265 : le chef de projet lit tous les projets, en lecture seule hors de sa portée)
- `GET /api/projets` et `GET /api/projets/:id` renvoient aussi `debut_planifie` et `fin_planifiee` (null avant tout calcul), en lecture seule : non modifiables (PATCH : 400) et non historisés (REX-2, D-078).
- Le calcul est réservé à l'administrateur et au chef de projet. Un chef ne calcule que les projets sur lesquels il écrit ; un projet illisible répond 404, un projet lisible en lecture seule répond 403. (modifié par D-265 : ou leader métier, sur tout projet ordinaire ; voir §2 « Lecture élargie du chef et rôle leader métier (droits, D-265) »)
- Calcul (lot 3c, D-074) : un identifiant de projet hors plage entier (> 2147483647) dans le corps répond 400 ; si le verrou de calcul tenu par un autre calcul n'est pas obtenu en 10 s, 409 { erreur: 'Un calcul est déjà en cours' } ; ces refus n'écrivent rien et ne laissent aucun verrou.
- Un projet que l'utilisateur ne peut pas lire répond 404.
- Un identifiant mal formé ou hors plage dans une adresse répond 404.
- Une requête refusée (401, 403, 404, 409, 422) ne modifie aucune donnée.

### Lecture élargie du chef et rôle leader métier (droits, D-265)

Décisions du porteur (claude.ai, 2026-11-27). Tranche droits-1 : API ; tranche droits-2 : écrans (point 6).

1. **Chef de projet, lecture élargie.**
   - Il lit tous les projets, ordinaires et modèles, avec tout ce qu'il lisait déjà sur ses projets : activités, jalons, dépendances, affectations, assignations, saisies manuelles, travail planifié, Gantt, Gantt global de l'Accueil, planning d'une ressource, plan de charge et son export.
   - L'écriture ne change pas : sa portée d'écriture reste « projets dont il est chef, ou dont un ancêtre a pour chef » (modèles exclus, §11.1).
   - Hors de sa portée d'écriture : `peut_ecrire` faux ; écriture, calcul, copie d'un projet ordinaire, historique du projet et export des coûts du projet répondent 403 { erreur: 'Interdit' } (projet lisible), plus jamais 404 ; base inchangée.
   - Clés financières et de 6c absentes hors portée (règle existante, inchangée : `peut_ecrire` faux, donc `voit_finances` faux).
   - Inchangés : portée des taux (`ressourcesEnPortee`, §12.1 point 7, §12.6 points 5, 6 et 8) ; validation des imputations, visibilité des feuilles d'autrui et liste des validations (ses projets seulement, §7 4a points 4, 7 et 8) ; export des imputations (projets où il écrit, §7 6f point 4) ; coûts du pilotage (projets où il écrit, §12.5 point 4) ; dialogue « Calculer » (racines d'écriture).
   - Les regroupements et masquages de « projets illisibles » disparaissent pour lui : ligne « Autres projets » du plan de charge et de son export (§7 6d point 5, 6f point 3), lignes masquées du planning d'une ressource (§6 6e point 5), projets absents du Gantt global de l'Accueil (§6 D-080 point 1), sous-projets absents de `sous_projets` (§6 3a), ancêtre illisible de l'OTP (§12.2 point 4). L'administrateur est inchangé.
2. **Rôle `leader_metier`**, libellé « Leader métier ».
   - Définition : un chef de projet dont la portée d'écriture est tous les projets ordinaires, qui valide les imputations de tous les projets et qui ne voit rien de ce qui touche aux coûts (point 3).
   - Migration 018 : la contrainte CHECK de `utilisateur.role` accepte `leader_metier`. `POST` et `PATCH /api/utilisateurs` acceptent `role: 'leader_metier'` ; création et modification par l'administrateur seul (droits actuels ; chef de projet et ressource : 403). `role` vaut `leader_metier` dans /api/utilisateurs, /api/auth/me et l'annuaire.
   - Projets : il lit tous les projets et modèles ; `peut_ecrire` vrai sur tout projet ordinaire. Modèles : lecture seule, comme le chef (§11.1 inchangé : seul l'administrateur écrit un modèle) ; `peut_ecrire` faux, écriture 403.
   - Il crée des projets, y compris depuis un modèle (copie `est_modele` faux) ; « Enregistrer comme modèle » (copie `est_modele` vrai) : 403, comme le chef. Il copie tout projet ordinaire. Il lance le calcul de tout projet ordinaire. Il lit l'historique de tout projet ordinaire.
   - Chef d'un projet : il ne désigne pas de chef, comme le chef de projet (`chef_id` d'un autre utilisateur : 403 { erreur: 'Seul l’administrateur désigne le chef de projet' }). Un projet créé par un leader a pour chef le leader. L'administrateur peut le changer ensuite. Le leader est un chef possible : le chef d'un projet est un administrateur, un chef de projet ou un leader métier actif (§3). À confirmer à la relecture.
   - Validation : toutes les feuilles, toutes les lignes ; mêmes routes et mêmes refus que le chef sur ses projets (`GET /api/feuilles?ressource_id=…` : toutes les lignes ; `GET /api/validations` : toutes les feuilles, `peut_valider` vrai partout ; valider, rejeter, dévalider : tous les projets concernés).
   - Saisie pour autrui (D-181 à D-184) : refusée comme pour le chef. `PUT /api/feuilles?ressource_id=<autrui>`, `soumettre` et `rappeler` d'une feuille d'autrui : 403 (feuille visible), base inchangée.
   - Sa feuille de temps et Mes tâches s'il est `est_ressource`, comme tout utilisateur.
   - Utilisateurs, équipes et calendriers : mêmes droits que le chef de projet (annuaire, `GET /api/equipes`, `GET /api/calendriers` ; `GET /api/utilisateurs` et toute écriture : 403).
   - Plan de charge et son export : permis (aucun montant), sans ligne « Autres projets ». Planning d'une ressource : permis, sans ligne masquée. Export des imputations : toutes les imputations (projets où il écrit).
3. **Finances cachées au leader.** (modifié par D-274 : historique du projet, §8 « Corrections de sécurité (securite-2, D-274) » point 1)
   - Nouvel indicateur `voit_finances` = `peut_ecrire` et rôle ≠ `leader_metier`, calculé par projet, jamais renvoyé comme clé. Il remplace `peut_ecrire` comme condition de visibilité de : `charge_vendue` et `marge` (éléments du Gantt, du planning et des listes d'activités, réponses des POST et PATCH d'activités) ; `cout_planifie`, `cout_impute`, `cout_reel`, `taux_manquant` (éléments du Gantt) ; et des clés de vente, de marge et de coût de `projet.totaux`.
   - `date_client`, `ecart_client`, `engagement_depasse` et `charge_assignee` (vue d'une activité) restent sous `peut_ecrire` : le leader les voit.
   - Classement des clés de `projet.totaux` (GET …/gantt) : sous `voit_finances` : `charge_vendue`, `marge`, `cout_planifie`, `cout_impute`, `cout_reel`, `taux_manquant` ; sous `peut_ecrire` : `charge_assignee`, `charge_reelle`. Le leader reçoit donc `projet.totaux` = { charge_assignee, charge_reelle } ; sans `peut_ecrire`, `totaux` reste absent.
   - Leader : `charge_vendue` présente dans le corps d'un `POST /api/projets/:id/activites` ou d'un `PATCH /api/activites/:id`, quelle que soit sa valeur (null compris) → 403 { erreur: 'Interdit' }, rien n'est écrit. Ordre : 401, 404, puis ce 403, avant 400 et 422.
   - Leader : 403 { erreur: 'Interdit' } sur `GET /api/couts`, `GET /api/couts/export`, `GET /api/projets/:id/couts/export` et toutes les routes de taux (`GET` et `POST /api/utilisateurs/:id/taux`, `PATCH` et `DELETE /api/taux/:id`, `GET` et `POST /api/equipes/:id/taux`, `PATCH` et `DELETE /api/taux-equipe/:id`, `GET /api/taux/du-jour`), comme le rôle ressource : juste après le 401, avant 400 et 404. Base inchangée.
   - La copie par un leader copie `charge_vendue` comme toute copie (§11.2) ; il ne la lit pas.
4. **Administrateur** : inchangé (`voit_finances` vrai partout). Il peut désigner un leader comme chef d'un projet.
5. **Rôle ressource** : inchangé.
6. **Écrans (tranche droits-2, pour mémoire ; détaillés au point 8, D-268)** : mention « Lecture seule » sur les projets non modifiables (liste Projets et tête du projet ouvert) ; pour un chef de projet chef d'aucun projet, message « Vous n'êtes chef d'aucun projet. L'administrateur désigne le chef dans Modifier le projet. » ; menu du leader sans « Utilisateurs » et sans l'onglet « Coûts » du Pilotage ; colonnes « Vendu » et « Marge », région « Totaux du projet » (montants de vente, de marge et de coût) et colonnes de coût sous `voit_finances` ; rôle « Leader métier » dans les listes de rôle de l'écran Utilisateurs.
7. **Cas** (tests LCH-n et LDM-n ; valeurs recopiées). Données : administrateur A ; chef C, chef du projet P (sous-projet P1) ; chef H, chef du projet Q, ni chef ni affecté sur P (« chef hors portée ») ; leader L (`leader_metier`, `est_ressource`, affecté à P) ; ressource Alice (`est_ressource`, affectée à P et à Q, assignée sur une feuille de P et une feuille de Q, imputations soumises la même semaine sur les deux) ; modèle M (créé par A). P porte une activité feuille avec `charge_vendue` et un jalon avec `date_client`. Code attendu ; « base inchangée » pour tout refus.

| Cas | Rôle | Situation | Route | Code et effet attendus |
|---|---|---|---|---|
| DR-1 | chef hors portée | P | `GET /api/projets` | 200 ; P et P1 présents, `peut_ecrire` faux |
| DR-2 | chef hors portée | P | `GET /api/projets/:id` | 200, `peut_ecrire` faux |
| DR-3 | chef hors portée | P | `GET …/gantt`, `…/planning`, `…/activites`, `…/jalons`, `…/dependances`, `…/affectations`, `…/assignations`, `…/travail`, `GET /api/activites/:id/saisies` | 200 ; Gantt : `projet.peut_ecrire` faux, `sous_projets` contient P1 |
| DR-4 | chef hors portée | P | mêmes lectures | clés absentes : `totaux`, `charge_vendue`, `marge`, `date_client`, `ecart_client`, `engagement_depasse`, `cout_planifie`, `cout_impute`, `cout_reel`, `taux_manquant` ; `charge_assignee` absente de la vue d'une activité |
| DR-5 | chef hors portée | P | `PATCH /api/projets/:id`, `DELETE /api/projets/:id`, `POST …/activites`, `PATCH` et `DELETE /api/activites/:id`, `POST …/jalons`, `POST …/dependances`, `POST …/affectations`, `POST /api/activites/:id/assignations`, `POST /api/elements/:id/deplacer`, `POST /api/projets/:id/copie` (`est_modele` faux) | 403 { erreur: 'Interdit' }, base inchangée |
| DR-6 | chef hors portée | P | `POST /api/calcul` { projets: [P] } | 403, base inchangée |
| DR-7 | chef hors portée | P | `GET …/historique` | 403, base inchangée |
| DR-8 | chef hors portée | P | `GET /api/projets/:id/couts/export` | 403, base inchangée |
| DR-9 | chef hors portée | Alice | `GET /api/ressources/:id/planning` | 200 ; aucune ligne masquée : la ligne de P porte `projet` et `activite` non null |
| DR-10 | chef hors portée | Alice | `GET /api/plan-de-charge`, `…/export` | 200 ; aucune ligne « Autres projets » (`projet_id` null) ; ligne de P présente |
| DR-11 | chef hors portée | feuille d'Alice | `GET /api/validations` | inchangé : `peut_valider` faux pour P, vrai pour Q |
| DR-12 | chef hors portée | feuille d'Alice | `POST /api/feuilles/:id/valider` | inchangé : seule la validation de Q est écrite |
| DR-13 | chef hors portée | Alice, affectée à P et Q | `GET /api/utilisateurs/:id/taux` | inchangé : 200 (Alice est affectée à Q) ; ressource affectée à P seulement : 403 |
| DR-14 | chef hors portée | — | `GET /api/couts` | inchangé : P absent, Q présent |
| DR-15 | chef dans sa portée | P | `GET …/gantt` | 200, `peut_ecrire` vrai, `projet.totaux` = { charge_vendue, charge_assignee, marge, charge_reelle, cout_planifie, cout_impute, cout_reel, taux_manquant } (non-régression) |
| DR-16 | chef dans sa portée | P | `PATCH /api/activites/:id` { charge_vendue }, `POST /api/calcul`, `GET …/historique` | 200 (non-régression) |
| DR-17 | leader | — | `POST /api/utilisateurs` { role: 'leader_metier' } par A | 201, `role` 'leader_metier' ; `PATCH` du rôle vers `leader_metier` par A : 200 ; même `POST` par C : 403, rien de créé |
| DR-18 | leader | — | `GET /api/auth/me`, `GET /api/annuaire` | 200, `role` 'leader_metier' |
| DR-19 | leader | P, Q | `GET /api/projets`, `GET /api/projets/:id` | 200 ; tous les projets, `peut_ecrire` vrai |
| DR-20 | leader | M | `GET /api/modeles` ; `PATCH /api/projets/:id` | 200, `peut_ecrire` faux ; `PATCH` 403, base inchangée |
| DR-21 | leader | P | `GET …/gantt` | 200, `peut_ecrire` vrai ; `projet.totaux` = { charge_assignee, charge_reelle } exactement ; éléments sans `charge_vendue`, `marge`, `cout_planifie`, `cout_impute`, `cout_reel`, `taux_manquant` ; jalon avec `date_client`, `ecart_client`, `engagement_depasse` |
| DR-22 | leader | P | `GET …/planning` ; `GET …/activites`, réponses de `POST …/activites` et `PATCH /api/activites/:id` ; `GET …/jalons` | planning : activités sans `charge_vendue` ni `marge`, jalon avec `date_client`, `ecart_client`, `engagement_depasse` ; vue d'une activité : `charge_assignee` présente, `charge_vendue` et `marge` absentes ; jalons avec `date_client` |
| DR-23 | leader | P | `POST …/activites` ou `PATCH /api/activites/:id` avec `charge_vendue` (nombre ou null) | 403 { erreur: 'Interdit' }, base inchangée ; activité inconnue : 404 avant ce 403 ; sans `charge_vendue` : 201 ou 200 |
| DR-24 | leader | P, Q | `PATCH /api/projets/:id`, `POST …/activites`, `POST …/jalons` { date_client } | 200 ou 201 |
| DR-25 | leader | P, Q | `POST /api/calcul` { projets: [P, Q] } ; `GET …/historique` | 200 |
| DR-26 | leader | — | `POST /api/projets` sans `chef_id` | 201, `chef_id` = L ; avec `chef_id` = C : 403 { erreur: 'Seul l’administrateur désigne le chef de projet' }, rien de créé |
| DR-27 | leader | M, P | `POST /api/projets/:id/copie` | M ou P, `est_modele` faux : 201 ; `est_modele` vrai : 403, rien de créé |
| DR-28 | administrateur | L | `POST /api/projets` { chef_id: L } ; `PATCH /api/projets/:id` { chef_id: L } | 201 ; 200, `chef_id` = L |
| DR-29 | leader | — | `GET /api/couts`, `GET /api/couts/export`, `GET /api/projets/:id/couts/export` | 403 { erreur: 'Interdit' }, base inchangée, avant 400 (`debut` absent) et 404 (projet inconnu) |
| DR-30 | leader | Alice, équipe | routes de taux du point 3 | 403 { erreur: 'Interdit' }, base inchangée, avant 400 et 404 |
| DR-31 | leader | — | `GET /api/plan-de-charge`, `…/export` | 200 ; aucune ligne « Autres projets » |
| DR-32 | leader | Alice | `GET /api/ressources/:id/planning` | 200 ; aucune ligne masquée |
| DR-33 | leader | feuille d'Alice | `GET /api/validations` ; `GET /api/feuilles?ressource_id=Alice` | feuille listée, `peut_valider` vrai pour P et Q ; toutes les lignes (P et Q) |
| DR-34 | leader | feuille d'Alice soumise | `POST …/valider` ; `…/devalider` ; `…/rejeter` | 200 ; validée pour P et Q, statut `validee` ; dévalidée : statut `soumise`, aucune validation ; rejetée : statut `rejetee` |
| DR-35 | leader | feuille d'Alice | `PUT /api/feuilles?semaine=…&ressource_id=Alice` ; `POST …/soumettre`, `…/rappeler` | 403, base inchangée |
| DR-36 | leader | sa feuille | `PUT /api/feuilles?semaine=…` ; `GET /api/mes-taches` | 200 ; son assignation listée |
| DR-37 | leader | — | `GET /api/utilisateurs`, `POST /api/utilisateurs`, `POST /api/equipes`, `POST /api/calendriers`, `GET /api/historique` | 403, base inchangée ; `GET /api/annuaire`, `GET /api/equipes`, `GET /api/calendriers` : 200 |
| DR-38 | leader | — | `GET /api/imputations/export` | 200 ; imputations de P et de Q |
| DR-39 | administrateur | P | `GET …/gantt` | 200, `projet.totaux` avec les huit clés (non-régression) |

8. **Écrans (droits-2, D-268)**. `voit_finances` côté écran : `peut_ecrire` du projet et rôle autre que `leader_metier`. Cas (tests E2E ; valeurs recopiées) :

| Cas | Rôle | Écran | Attendu |
|---|---|---|---|
| DE-1 | chef hors portée | liste Projets (onglet Projets) | chaque ligne de projet dont `peut_ecrire` est faux porte la mention « Lecture seule » dans la cellule Nom ; les lignes modifiables n'en portent aucune |
| DE-2 | chef hors portée | projet ouvert (`/projets/:id`) | mention « Lecture seule » en tête, près du titre, si `peut_ecrire` est faux ; aucune mention sur un projet modifiable |
| DE-3 | chef de projet | écran Projets, onglet Projets | si aucun projet de `GET /api/projets` n'a `peut_ecrire` vrai : message « Vous n'êtes chef d'aucun projet. L'administrateur désigne le chef dans Modifier le projet. » au-dessus de la liste ; sinon aucun message. Ni l'administrateur ni le leader ne le voient |
| DE-4 | leader | menu (Navigation principale) | entrées Accueil, Projets, Pilotage, Imputations (et Mes tâches s'il est ressource) ; jamais Utilisateurs |
| DE-5 | leader | Pilotage | onglet « Plan de charge » seul, pas d'onglet « Coûts » ; l'adresse `/pilotage?onglet=couts` affiche le plan de charge (onglet `charge`) |
| DE-6 | leader | Imputations | leader ressource : onglet « Validation » présent ; leader non ressource : un seul onglet, donc pas de liste d'onglets, la Validation (titre « Validation des feuilles de temps ») affichée directement (D-247) ; il valide une feuille soumise (règles de §7 4c inchangées) (modifié par D-268) |
| DE-7 | leader | projet, onglet Affectations | ni colonne « Taux du jour » ni bouton « Modifier les taux de <nom> » ; la colonne « Taux (%) » de l'affectation reste |
| DE-8 | leader | Gantt d'un projet et Accueil | menu « Colonnes » sans « Vendu », « Marge », « Coût planifié », « Coût réel » ; pas de région « Totaux du projet » ni de lien « Exporter les coûts » ; dialogues de création et de modification d'une activité sans champ « Charge vendue (j) » et sans la donnée « Marge » |
| DE-9 | administrateur | Utilisateurs | listes « Rôle » de création et de modification : « Administrateur », « Chef de projet », « Leader métier », « Ressource » ; colonne Rôle : « Leader métier » |
| DE-10 | administrateur | Nouveau projet, Modifier le projet | liste « Chef de projet » : administrateurs, chefs de projet et leaders métier actifs |

## 3. Modèle de données

| Entité | Champs principaux |
|---|---|
| Utilisateur | nom, login, email (facultatif), initiales (facultatives), mot de passe haché, rôle, est_ressource, capacité (j/jour, défaut 1), calendrier, équipe (facultative, D-147), actif |
| Équipe | nom (1 à 100 caractères, unique sans tenir compte de la casse ; D-147) |
| Calendrier | nom, jours travaillés de la semaine (défaut lun–ven), jours fériés ou chômés (liste de dates) |
| Projet | nom, code (unique, sans tenir compte de la casse), parent (sous-projet), priorité (défaut 500, plus petit = plus prioritaire), chef de projet, date de début, clos, est_modele (booléen, défaut faux), otp (facultatif, 1 à 50 caractères ; §12.2, D-225) |
| Affectation projet | projet, ressource, taux (%), date de début et de fin facultatives |
| Activité | projet, parent (activité), ordre WBS, nom, mode de planification, priorité (défaut 500), début validé, fin validée, durée validée (jours ouvrés), début planifié, fin planifiée, drapeaux (voir 5.9), close, charge vendue (facultative, ≥ 0, 2 décimales, feuilles seulement ; lot 6c, D-149), otp (facultatif, 1 à 50 caractères ; §12.2, D-225) ; notes (facultatives, 500 caractères au plus, activités seulement ; D-270, voir « Notes d'activité ») |
| Taux journalier | ressource (utilisateur `est_ressource`), début, fin (facultative), montant en euros (> 0, au plus 999999,99, 2 décimales) ; périodes sans chevauchement (§12.1, D-225) |
| Jalon | projet, parent, ordre WBS, nom, type (flottant ou fixe), date validée, date planifiée, date client (facultative ; lot 6c, D-149) |
| Dépendance | prédécesseur, successeur (activité ou jalon), type (FD, DD, FF), délai (jours ouvrés, peut être négatif) |
| Assignation | activité, ressource, taux (%, défaut 100), charge assignée, charge réelle, reste à faire ; charge depuis le taux (booléen, défaut faux ; D-276, §4 « Absences et charge depuis le taux ») |
| Absence | ressource (`est_ressource`), début, fin, portion (journée, matin, après-midi), motif (congé, formation, autre) ; sans chevauchement (D-276, §4 « Absences et charge depuis le taux ») |
| Travail planifié | assignation, date, charge, surcharge (booléen). Produit par le moteur, purgé à chaque calcul |
| Saisie manuelle | assignation, date, demi-journée (matin ou après-midi), charge 0,5. Saisie par l'utilisateur, jamais modifiée par le moteur |
| Imputation | assignation, date, charge réelle |
| Feuille de temps | ressource, semaine ISO, statut (brouillon, soumise, validée, rejetée), validateur, date |

Règles de structure :

- Une activité qui a des enfants est une activité parente : elle ne porte pas d'assignation, ses dates et charges sont l'agrégat de ses enfants.
- Une ressource ne peut être assignée à une activité que si elle est affectée au projet.
- Charges en jours, précision 0,01.
- Toute modification d'une entité de planning est historisée (qui, quand, ancienne et nouvelle valeur).
- Un calendrier par défaut existe toujours ; il est attribué aux utilisateurs créés sans calendrier et ne peut pas être supprimé. Un calendrier utilisé par un utilisateur ne peut pas être supprimé. Un calendrier compte au moins un jour travaillé.
- Les arborescences de projets et d'activités sont sans cycle. Seule une activité peut être parent. Un parent et ses enfants appartiennent au même projet. Les activités et les jalons frères partagent une même suite d'ordre WBS. Déplacer un élément lui donne une position finale dans la fratrie d'arrivée, de 1 au nombre d'éléments de cette fratrie ; les frères gardent leur ordre relatif.
- Les taux (affectation et assignation) sont compris entre 0 (exclu) et 100 %, 100 par défaut. La priorité est comprise entre 0 et 1000. Une charge a au plus deux décimales.
- Une ressource est affectée une seule fois à un projet ; la date de fin d'une affectation n'est pas antérieure à sa date de début. Une ressource ne peut être assignée qu'une fois à une activité.
- Les dépendances relient deux éléments du même projet, sans doublon, sans cycle, et jamais un élément à son ancêtre ou à son descendant.
- À la création d'une assignation, le reste à faire est égal à la charge assignée. Les dates planifiées, les drapeaux et la charge réelle ne sont pas modifiables par l'API de saisie.
- Suppression : un projet ayant des sous-projets, une activité ayant des enfants, une affectation ayant des assignations, une assignation ayant une charge réelle sont refusés (409) ; supprimer une activité ou un jalon supprime ses dépendances et assignations.
- Création et suppression sont historisées au même titre que les modifications ; une valeur inchangée n'est pas historisée ; les valeurs calculées par le moteur ne le sont pas. La suppression d'une entité écrit une seule entrée, pour cette entité. Les jours fériés ne sont pas historisés en V1.
- Le chef d'un projet est un administrateur ou un chef de projet actif. Seule une ressource active peut être affectée à un projet. Un utilisateur qui a des affectations ne peut pas cesser d'être ressource (409). (modifié par D-265 : ou un leader métier actif)
- Rattacher un projet à un parent exige le droit d'écriture sur ce parent. Seul l'administrateur désigne ou change le chef d'un projet ; un chef de projet qui crée un projet en est le chef. (modifié par D-265 : de même, un leader métier qui crée un projet en est le chef ; il ne désigne pas de chef)
- Activité : mode ASAP par défaut ; la fin validée n'est pas antérieure au début validé ; la durée validée vaut au moins 1. Jalon flottant : date validée facultative. Le délai d'une dépendance est un entier.
- Activité, champs affichés selon le mode, charge assignée et marge en lecture seule : voir §6, « Charge lisible (charge-lisible, D-220) ».
- Activité parente, dépendances et déplacement depuis le dialogue d'une activité ou d'un jalon : voir §6, « Saisie des activités (saisie-activites, D-222) ».
- Une charge n'est jamais négative. Tant que la charge réelle vaut 0, modifier la charge assignée recale le reste à faire sur la charge assignée.
- Les calendriers sont historisés comme les entités de planning. Un déplacement dans le WBS historise l'élément déplacé, pas les rangs décalés de ses frères.
- Une date validée (début et fin validés d'une activité, date validée d'un jalon) n'est pas postérieure au 31/12/2099 : sinon refus 400, en création comme en modification (lot 2e, D-056).
- Saisie manuelle (lot 2e, D-056) : une saisie n'est permise que sur une assignation d'une activité feuille ouverte en mode MAN (422 sinon). Un jour chômé ou hors des dates d'affectation est accepté (tout en surcharge au calcul). Une saisie par (assignation, jour, demi-journée). Saisie par l'administrateur et le chef du projet ; lecture par les utilisateurs qui lisent le projet (la ressource n'y a plus accès, D-148) ; les saisies ne sont pas historisées.
- Tant qu'une activité MAN porte des saisies, changer son mode et lui ajouter un enfant sont refusés (422). La clore est permis : ses saisies sont gardées et ignorées par le moteur.
- Saisie : `GET /api/activites/:id/saisies?mois=AAAA-MM` et `PUT /api/activites/:id/saisies?mois=AAAA-MM` ; le PUT remplace les saisies du mois en une transaction.
- API de saisie (lot 2e-I, D-058). Table `saisie_manuelle` (id, assignation, jour, demi-journée `matin` ou `apres_midi`, unique par (assignation, jour, demi-journée)), supprimée avec l'assignation. Pas de colonne charge : une saisie vaut 0,5 j.
- `GET /api/activites/:id/saisies?mois=AAAA-MM` → 200 `{ mois, saisies: [{ assignation_id, jour, demi_journee }] }`, triées par assignation, jour, puis matin avant après-midi. Droits de lecture du projet (administrateur, chef ; plus la ressource affectée, D-148). Activité non MAN : 200, liste vide.
- `PUT` (même adresse) : corps strict `{ saisies: [{ assignation_id, jour, demi_journee }] }` ; remplace en une transaction toutes les saisies du mois pour les assignations de l'activité ; réponse 200 de même forme que le GET ; rien n'est historisé. Droits d'écriture du projet.
- Ordre des refus : 401 ; 404 activité inconnue ou illisible ; 403 lecture seule ; 400 mois invalide, corps invalide, jour hors du mois, doublon dans le corps ; 422 activité qui n'est pas une feuille MAN ouverte, assignation d'une autre activité. Un refus n'écrit rien.
- Tant que l'activité MAN porte des saisies (précise la règle ci-dessus) : PATCH qui change son mode, création d'un enfant sous elle et déplacement d'un élément sous elle sont refusés (422, base inchangée). La clore est permis. Supprimer l'activité ou l'assignation supprime les saisies.
- Précisions (D-059) : mois absent = invalide (400), en GET comme en PUT ; 422 aussi pour une assignation inexistante dans le corps, et un 422 n'écrit aucune saisie du corps ; `close: false` permis sur une MAN close à saisies ; PATCH du mode vers la même valeur permis (200), changement de mode refusé tant que l'activité porte des saisies, close ou non ; création d'un enfant et déplacement sous une activité à saisies refusés du fait de l'assignation (une saisie suppose une assignation), effacer les saisies ne lève pas ce refus.
- Borne du mois (D-060) : l'année du mois est comprise entre 2000 et 2099, sinon 400, en GET comme en PUT.
- Clôture (D-083) : (1) clore un projet (`clos: true`) est refusé, 422 { erreur, code: 'enfants_ouverts' }, si un sous-projet, à n'importe quel niveau, n'est pas clos, ou si une activité du projet ou d'un sous-projet, à n'importe quel niveau, est ouverte ; les jalons ne comptent pas ; même règle pour les modèles. (2) Clore une activité parente est refusé, 422 code 'enfants_ouverts', si une sous-activité, à n'importe quel niveau, est ouverte. (3) Règle stricte, 422 code 'parent_clos' : rouvrir une activité dont une activité ancêtre, le projet ou un projet ancêtre est clos ; rouvrir un sous-projet dont un projet ancêtre est clos ; créer une activité ou un jalon dans un projet clos ou sous une activité close ; déplacer une activité ou un jalon vers un tel endroit ; créer un projet ouvert sous un projet clos, ou y rattacher un projet ouvert (`parent_id`). Rouvrir un parent clos reste toujours permis. (4) Le 422 « Arborescence de projets invalide » porte `code: 'arborescence_invalide'`. (5) Ces refus passent après tous les refus existants ; un refus n'écrit rien, historique compris. (6) Verrou de ligne (FOR UPDATE) sur le projet racine de l'arbre concerné, pour la clôture, la réouverture, la création, le déplacement et le rattachement. (7) Pas de migration des données déjà en base : seules les opérations de (1) à (3) sont contrôlées ; un PATCH qui ne touche que d'autres champs passe, même sur un élément incohérent. (8) Copie, suppression, calcul et Gantt sont inchangés.
- Imputations (D-118) : table `imputation` (assignation, jour, charge), une par (assignation, jour), charge comprise entre 0 (exclu) et 10, au centième (§10 Q1, défaut) ; table `feuille_temps` (ressource, lundi de la semaine ISO, statut `brouillon`, `soumise`, `validee` ou `rejetee`, commentaire facultatif), une par (ressource, semaine), créée à la première écriture (absente = brouillon vide) ; table `validation_feuille` (feuille, projet, validateur, date), une par (feuille, projet). La charge réelle d'une assignation est la somme de toutes ses imputations ; elle n'est pas historisée, les imputations non plus ; le reste à faire modifié par la feuille l'est (auteur = la ressource). Précision D-181 : quand l'administrateur saisit pour autrui, l'auteur est l'administrateur (§7, « Saisie pour autrui par l'administrateur »). Une assignation qui porte une imputation a une charge réelle : sa suppression reste refusée (409). La copie de projet ne copie aucune imputation.

### Écrans Utilisateurs et Projets (REX-1, D-072)

- Création d'un utilisateur : en plus du nom, de l'email, du mot de passe et du rôle, case « Ressource planifiable » (cochée par défaut), « Capacité (j/jour) » (défaut 1), liste « Calendrier » (calendrier par défaut présélectionné).
- Modification d'un utilisateur : bouton de ligne « Modifier <nom> » ouvrant un dialogue : nom, email, rôle, ressource planifiable, capacité, calendrier, actif, nouveau mot de passe (facultatif, vide = inchangé). Seuls les champs modifiés partent dans le PATCH.
- Tableau des utilisateurs : colonnes « Ressource » (Oui / Non) et « Calendrier » (nom) en plus des colonnes existantes.
- Refus 409 affichés en clair, dialogue laissé ouvert, rien de modifié : utilisateur affecté qui cesserait d'être ressource ; administrateur qui se désactive ou change son rôle ; dernier administrateur actif ; email déjà utilisé.
- Modification d'un projet ou d'un modèle : dialogue avec code, nom, date de début (libellé « Pas avant le » pour un projet ordinaire, REX-2, D-078), priorité, clos ; chef de projet en plus pour l'administrateur sur un projet ordinaire. Code déjà utilisé (409) : message « Ce code est déjà utilisé. », dialogue ouvert, rien de modifié. Projet parent : voir la puce « Projet parent » (REX-2, D-079).
- Formulaire projet (REX-2, D-078) : chef de projet facultatif à la création (administrateur : premier choix présélectionné « Moi (par défaut) », `chef_id` non envoyé, l'API désigne le créateur) ; champ de date « Pas avant le » (`date_debut`) pour les projets ordinaires, prérempli à la date du jour du navigateur à la création, libellé « Date de début » conservé pour les modèles, la copie et « Créer un projet depuis un modèle » ; colonne « Début » de la liste Projets = `debut_planifie`, « — » avant calcul (liste Modèles : `date_debut`) ; action de ligne « Créer un projet depuis <nom> » : texte visible « Créer un projet », nom accessible inchangé.
- Ce dialogue s'ouvre depuis la fiche et depuis les listes Projets et Modèles (bouton de ligne « Modifier <nom> » sur les lignes où `peut_ecrire` est vrai) ; un seul composant de formulaire.
- Bouton d'envoi des dialogues de modification : « Enregistrer » (D-073).
- Textes des refus 409 de l'écran Utilisateurs (D-073) : utilisateur affecté qui cesserait d'être ressource : « Cet utilisateur est affecté à des projets : il reste ressource. » ; administrateur qui se désactive ou change son rôle : « Vous ne pouvez ni vous désactiver ni changer votre rôle. » ; dernier administrateur actif : « Il doit rester un administrateur actif. » ; email déjà utilisé : « Cet email est déjà utilisé. »
- Priorité d'un projet (D-073) : hors écran à la création (défaut 500 de l'API), modifiable par le dialogue de modification.
- Identifiant et initiales (REX-2, D-077) : champs « Identifiant » et « Initiales » en création et en modification ; « Email » n'est plus obligatoire ; identifiant vide = repris de l'email ; identifiant et email vides : « Renseignez un identifiant ou un email. », dialogue ouvert, rien n'est envoyé ; identifiant déjà utilisé (409) : « Cet identifiant est déjà utilisé. », dialogue ouvert ; tableau : colonnes « Identifiant » et « Initiales » (« — » si vide), email vide affiché « — ».
- Mot de passe (REX-2, D-076) : les champs « Mot de passe » (création) et « Nouveau mot de passe » (modification) n'imposent aucune longueur minimale ; à la création le champ reste obligatoire. (modifié par D-274 : 12 caractères au moins, aide « 12 caractères au moins » sous chaque champ, §8 securite-2 point 4)
- Arborescence de l'écran Projets (REX-2, D-079) : le tableau « Liste des projets » est une arborescence, mêmes colonnes (Code, Nom, Chef de projet, Début, Actions si une ligne est modifiable). Racines : projets visibles sans parent ou dont le parent n'est pas visible ; frères triés par code, sans tenir compte de la casse. Tout est replié par défaut ; boutons « Déplier <nom> » / « Replier <nom> » (aria-expanded) par projet, « Tout déplier » / « Tout replier » en tête d'écran. Sous un projet déplié : ses activités, sous-activités et jalons en ordre WBS (lecture seule : Code = numéro WBS, nom indenté en texte, badge « Jalon », Début = début ou date planifiée ou « — », aucun bouton), puis ses sous-projets (lignes de projet complètes, indentées). Éléments chargés par `GET /api/projets/:id/gantt` au premier dépliage, sans nouvelle route. Projet vide : « Aucune activité ni jalon. » ; échec de chargement : « Impossible de charger le contenu du projet. ».
- Projet parent (REX-2, D-079) : champ « Projet parent » dans « Nouveau projet » et « Modifier le projet » d'un projet ordinaire ; premier choix « Aucun (projet racine) » ; options : projets ordinaires où l'utilisateur écrit, « <code> — <nom> », triés par code, sans le projet ni ses descendants en modification. `parent_id` envoyé à la création seulement si un parent est choisi, à la modification seulement s'il a changé (identifiant ou null). Refus 422 de code `arborescence_invalide` (D-083 (14)) : « Ce projet parent n’est pas possible. », dialogue ouvert, rien de modifié. Hors écran pour les modèles en V1 ; la copie reste un projet racine.
- Refus de clôture (D-083 (9), tranche C2), dialogue ouvert, rien modifié : `enfants_ouverts` sur un projet : « Ce projet a des sous-projets ou des activités non clos. » ; sur une activité : « Cette activité a des sous-activités non closes. » ; `parent_clos` sur une activité, ou sur un élément créé ou déplacé : « Le projet ou l’activité parente est clos. » ; `parent_clos` sur un projet : « Le projet parent est clos. » ; `arborescence_invalide` : texte actuel inchangé. Le texte d'un 422 dépend seulement du champ `code` ; sans code, « Cette opération enfreint une règle du planning. » (D-083 (14)), dans les dialogues de modification (projet, activité), la création d'activité et de jalon et le déplacement ; à la création d'un projet, un 422 sans code garde « Données invalides : vérifiez le code, le nom, le chef et la date. » (D-083 (15)).

### Équipes (lot 6a, D-147)

- API. `GET /api/equipes` : tout utilisateur connecté, `[{ id, nom }]` trié par nom sans tenir compte de la casse. `POST /api/equipes { nom }` → 201 `{ id, nom }` ; `PATCH /api/equipes/:id { nom }` → 200 ; `DELETE /api/equipes/:id` → 204 ; ces trois routes sont réservées à l'administrateur (403 sinon). Corps strict. Table `equipe` (id, nom de 1 à 100 caractères après retrait des espaces de bord, unique sans tenir compte de la casse), `utilisateur.equipe_id` nullable avec clé étrangère, migration 013 ; non historisée. Une équipe n'est jamais affectée ni assignée ; le moteur est inchangé.
- Refus : nom vide ou trop long : 400 ; nom déjà utilisé : 409 { erreur: 'Équipe déjà existante' } ; suppression d'une équipe portée par au moins un utilisateur, actif ou non : 409 { erreur: 'Équipe utilisée : suppression refusée' } ; équipe inconnue ou identifiant hors plage : 404 ; ordre : 401, 403, 404, 400, 409 ; un refus n'écrit rien.
- Utilisateurs. `POST` et `PATCH /api/utilisateurs` acceptent `equipe_id` (identifiant, ou null = aucune). Équipe inexistante : 422 { erreur: 'Équipe inconnue' }, distinguée de 'Calendrier inconnu' par le nom de la contrainte, sans rien écrire. `equipe_id` figure dans les réponses de /api/utilisateurs et de /api/auth/me. L'annuaire est inchangé (son ouverture sera cadrée en 6d).
- Écran Équipes. Route `/equipes`, entrée « Équipes » de Layout pour l'administrateur seul, après « Calendriers » (remplacé par REX-5, D-165 : onglet « Équipes » de l'écran Utilisateurs). Tableau « Liste des équipes » : Nom, Membres (nombre d'utilisateurs, calculé depuis GET /api/utilisateurs), Actions. Formulaire « Nouvelle équipe » : champ Nom, bouton « Créer ». Bouton de ligne « Renommer <nom> » : dialogue, bouton « Enregistrer ». Bouton de ligne « Supprimer <nom> » : Confirmation. Textes : doublon « Cette équipe existe déjà. » ; équipe utilisée « Cette équipe a des membres : retirez-les d'abord. ». Dialogue ou confirmation laissés ouverts, rien de modifié.
- Écran Utilisateurs. Liste « Équipe » en création et en modification : premier choix « Aucune », équipes triées par nom. Colonne « Équipe » : nom de l'équipe, ou « — ». `equipe_id` envoyé à la création seulement si une équipe est choisie, et en modification seulement s'il a changé (identifiant ou null). Refus 422 « Équipe inconnue » : « Cette équipe n'existe plus. », dialogue ouvert.
- Le jeu de démonstration est inchangé en 6a (équipes ajoutées en 6d).

### Vue restreinte de la ressource (lot 6b, D-148)

- Seul le rôle `ressource` est restreint. Un administrateur ou un chef de projet qui est aussi ressource garde ses droits.
- API : pour le rôle ressource, la portée de lecture des projets est vide. Route qui désigne un projet, un élément, une dépendance, une affectation, une assignation ou un historique : 404, comme un projet illisible. Liste ou vue de planning sans identifiant (GET /api/projets, qui alimente aussi le Gantt global de l'Accueil, et GET /api/modeles) : 403 { erreur: 'Interdit' }, après le 401 et avant tout autre contrôle. Saisies manuelles (GET /api/activites/:id/saisies) : 404. Inchangés : /api/auth/*, /api/feuilles (sa feuille de temps), annuaire, calendriers (lecture), GET /api/equipes, /api/mes-taches, GET /api/validations (200, liste vide, D-148 (8)). Un refus n'écrit rien.
- `GET /api/mes-taches` : tout utilisateur connecté. Contenu : les assignations de l'utilisateur sur des activités ouvertes de projets ordinaires (non modèles) ouverts. Pour chacune : `assignation_id`, `projet` { code, nom }, `activite` { nom, wbs }, `charge_assignee`, `charge_reelle`, `reste_a_faire`, `debut_planifie`, `fin_planifiee` (null avant calcul). Tri : début planifié (null en dernier), puis code du projet sans tenir compte de la casse, puis numéro WBS. Liste vide pour un utilisateur sans assignation. Aucun autre champ ; la charge vendue (6c) n'y figurera jamais.
- Écran « Mes tâches », route `/mes-taches`. Entrée « Mes tâches » de Layout, en tête, pour tout utilisateur `est_ressource`. Tableau « Mes tâches » : Projet (code, `title` = nom), Activité (nom), Début, Fin (« — » avant calcul), Assigné, Réel, Reste. État vide : « Aucune tâche en cours. » Échec de chargement : « Impossible de charger vos tâches. » Lecture seule (complété par REX-5, D-165 (4) : section « Mon calendrier », supprimée par D-218 (5)).
- Web, rôle ressource : menu réduit à Mes tâches, Imputations et Calendriers (modifié par REX-5, D-165 : sans Calendriers) (Accueil, Projets, Modèles et Validation masqués) ; « / » redirige vers /mes-taches ; /projets, /projets/*, /modeles et /validation redirigent vers /mes-taches. Les autres rôles sont inchangés, avec en plus « Mes tâches » s'ils sont `est_ressource`.
- La charge vendue (6c) ne sera jamais renvoyée au rôle ressource, par aucune route.
- Mes tâches exclut aussi une assignation dont une activité ancêtre est close, ou dont le projet a un projet ancêtre clos (même principe que `parent_clos`, D-083 ; données incohérentes possibles, D-083 (7)) (D-148 (10)).
- L'entrée « Mes tâches » est affichée pour tout utilisateur `est_ressource` et pour tout utilisateur de rôle ressource, même non `est_ressource`. Arrivée après connexion : « / » pour l'administrateur et le chef de projet (ressources ou non), /mes-taches pour le rôle ressource (D-148 (11)).

### Écran Utilisateurs : équipes et calendriers (REX-5, D-165)

- Onglets. L'écran Utilisateurs (`/utilisateurs`, administrateur seul) a trois onglets (Radix Tabs, comme la fiche projet) : « Utilisateurs » (par défaut), « Équipes », « Calendriers ». Adresse : `?onglet=equipes` ou `?onglet=calendriers` ; sans paramètre ou valeur invalide : onglet Utilisateurs ; changer d'onglet met à jour l'adresse comme la fiche projet. Le contenu des onglets Équipes et Calendriers reprend tel quel celui des anciens écrans (textes, tableaux, dialogues, refus, noms accessibles). Activer un onglet relit ses données : une équipe ou un calendrier créé apparaît dans les listes « Équipe » et « Calendrier » de l'onglet Utilisateurs, et le nombre de membres d'une équipe est à jour, sans recharger la page.
- Suppression des écrans. Écrans Équipes et Calendriers et entrées de menu « Équipes » et « Calendriers » supprimés pour tous les rôles. `/equipes` et `/calendriers` redirigent sans entrée d'historique : l'administrateur vers `/utilisateurs?onglet=equipes` ou `/utilisateurs?onglet=calendriers` ; les autres rôles vers « / » (le rôle ressource arrive sur /mes-taches).
- Détail d'un calendrier. `/calendriers/:id` reste une page à part, sans autre changement ; on l'ouvre par le lien de l'onglet Calendriers ; son lien retour mène à `/utilisateurs?onglet=calendriers` ; l'entrée de menu « Utilisateurs » y est marquée active comme sur `/utilisateurs`. Page réservée à l'administrateur : pour tout autre rôle, redirection vers « / » sans entrée d'historique. Le mode lecture seule pour un non-administrateur disparaît.
- Mon calendrier (SUPPRIMÉE par D-218 (5) ; texte conservé pour mémoire). L'écran Mes tâches avait, sous le tableau « Mes tâches », une section « Mon calendrier » (h2) en lecture seule. Données : `calendrier_id` de la session, puis GET /api/calendriers/:id. Contenu : le nom du calendrier ; « Jours travaillés : » suivi des jours en toutes lettres, du lundi au dimanche, séparés par des virgules ; tableau « Jours fériés à venir » (colonnes Date au format JJ/MM/AAAA et Libellé, « — » si vide) des fériés dont la date est supérieure ou égale à la date du jour du navigateur, triés par date. Aucun férié à venir : « Aucun jour férié à venir. » Échec de chargement : « Impossible de charger votre calendrier. », sans effet sur le tableau des tâches, et inversement. Affichée pour tout utilisateur `est_ressource` et tout utilisateur de rôle ressource (D-148 (11)).
- Menu du rôle ressource : « Mes tâches » et « Imputations ». Un chef de projet non ressource n'a plus d'écran de lecture des calendriers (accepté).
- Le moteur, l'API et la base ne changent pas.

### Écrans Projets et Imputations : onglets Modèles et Validation (onglets, D-247)

Droits inchangés (option A du porteur) : aucun changement d'API.

1. **Projets.** L'écran `/projets` a deux onglets (Radix Tabs, comme l'écran Utilisateurs) : « Projets » (par défaut) et « Modèles », pour tous les rôles qui voient Projets (administrateur, chef de projet). Adresse `?onglet=modeles` ; sans paramètre ou valeur invalide : Projets ; changer d'onglet met à jour l'adresse comme D-165. L'onglet Modèles reprend tel quel l'ancien écran Modèles (textes, tableau, dialogues, droits : seul l'administrateur crée et modifie ; le chef lit). Activer un onglet relit ses données.
2. **Imputations.** L'entrée « Imputations » est visible pour tout utilisateur `est_ressource`, l'administrateur et le chef de projet. Onglets « Feuille de temps » (si `est_ressource` ou administrateur, comme aujourd'hui) et « Validation » (administrateur, chef de projet) (modifié par D-276 : onglet « Absences » en plus, §4 « Absences et charge depuis le taux » point 10). La liste d'onglets n'est affichée que s'il y a au moins deux onglets disponibles ; sinon, le contenu du seul onglet s'affiche directement. Onglet par défaut : Feuille de temps s'il est disponible, sinon Validation. Adresse `/imputations?onglet=validation&semaine=AAAA-MM-JJ` ; onglet inconnu ou indisponible pour l'utilisateur : onglet par défaut. Le paramètre `semaine` est commun (même règle de correction) et conservé au changement d'onglet. L'onglet Validation reprend tel quel l'ancien écran Validation (textes, tableau, dialogues, export, refus).
3. **Suppression des entrées de menu** « Modèles » et « Validation » pour tous les rôles. Redirections sans entrée d'historique : `/modeles` → `/projets?onglet=modeles` (administrateur, chef) ; `/validation[?semaine=…]` → `/imputations?onglet=validation[&semaine=…]` (administrateur, chef) ; rôle ressource : « / » (donc /mes-taches), comme aujourd'hui. Tout lien interne vers `/modeles` ou `/validation` pointe vers la nouvelle adresse. L'entrée « Projets » est marquée active sur `/projets?onglet=modeles`.
4. **Marques incrémentales.** §11 (« l'écran Modèles » → « l'onglet Modèles de l'écran Projets, D-247 ») et §7 « Écran Validation » point 1 (« modifié par D-247 : onglet Validation de l'écran Imputations »).

### Charge vendue et date client (lot 6c, D-149)

- Migration 014 : `activite.charge_vendue numeric(10,2)` nullable, CHECK ≥ 0 ; `jalon.date_client date` nullable. Champs historisés comme les autres champs de saisie ; une valeur inchangée n'est pas historisée. Le moteur est inchangé ; aucune route nouvelle.
- Saisie. POST et PATCH des activités : `charge_vendue`, nombre ≥ 0, au plus 2 décimales, au plus 999999,99, ou null ; sinon 400. Feuilles seulement : PATCH d'une activité parente avec une valeur non null → 422 { erreur: 'Règle de planning non respectée', code: 'activite_parente' } (null accepté) ; créer ou déplacer un élément sous une activité dont `charge_vendue` n'est pas null → 422, code 'parent_vendu'. POST et PATCH des jalons : `date_client`, AAAA-MM-JJ, au plus le 31/12/2099, ou null, jalons flottants et fixes ; sinon 400. Modèles compris. Un refus n'écrit rien.
- Visibilité. `charge_vendue`, `marge`, `charge_assignee` (vue d'une activité : GET, POST et PATCH, D-220 (6) ; somme des charges assignées, calculée à la lecture), `date_client`, `ecart_client`, `engagement_depasse` et `projet.totaux` ne sont renvoyés que si `peut_ecrire` ; sinon les clés sont absentes (pas null). Le rôle ressource n'y accède jamais. Concerne GET …/gantt, GET …/planning, les réponses des POST et PATCH d'activités et de jalons, et toute route de même nature. Inchangés : Gantt global de l'Accueil, /api/mes-taches, /api/feuilles, /api/validations, …/travail. (modifié par D-265 : `charge_vendue`, `marge` et les clés de vente, de marge et de coût de `projet.totaux` sont sous `voit_finances` = `peut_ecrire` et rôle ≠ `leader_metier` ; `date_client`, `ecart_client`, `engagement_depasse` et `charge_assignee` restent sous `peut_ecrire` ; voir §2 « Lecture élargie du chef et rôle leader métier (droits, D-265) »)
- Calculs à la lecture, rien de stocké. Feuille : `marge` = charge_vendue − charge_assignee, null si charge_vendue est null. Parent : `charge_vendue` = somme des feuilles descendantes renseignées, `marge` = somme de leurs marges, null sans feuille renseignée. `projet.totaux` (GET …/gantt) = { charge_vendue, charge_assignee, marge, charge_reelle } sur les feuilles du projet seul, sans sous-projets, activités closes comprises ; charges assignée et réelle à 0 sans activité. Deux décimales ; marge négative possible. Jalon : `ecart_client` = date_planifiee − date_client en jours calendaires (entier signé), null si une date manque ; `engagement_depasse` = ecart_client > 0 ; hors de `drapeaux`.
- Dialogues de l'onglet Planning. Activité feuille : champ « Charge vendue (j) » (texte, virgule ou point, vide = null), absent pour une activité parente ; invalide : `aria-invalid`, « Charge vendue invalide. », enregistrement désactivé ; en modification, envoyée seulement si elle a changé. Jalon : champ « Date client » (date), vide = null. Refus : 'activite_parente' « Une activité parente ne porte pas de charge vendue. » ; 'parent_vendu' « Cette activité porte une charge vendue : elle ne peut pas recevoir d'enfant. » ; dialogue laissé ouvert.
- Gantt du projet, si `peut_ecrire` seulement. (a) Région « Totaux du projet » au-dessus du tableau : « Vendu X j · Assigné Y j · Marge Z j · Réel W j » (virgule décimale, « — » si null, marge < 0 en couleur flag). (b) Colonnes « Vendu » et « Marge » après « Charge » (activité « — » si null, jalon vide, marge < 0 en couleur flag ; critère D-069 (a) à (d) à 1440 et 1024 px). (c) Jalon avec date client : losange en contour à la date client sur la même ligne (`data-date-client` = id, aria-hidden, pointer-events none ; neutre, flag si engagement dépassé) ; texte d'écart « +N j », « −N j » ou « 0 j » à droite du losange le plus à droite (`data-ecart-client` = id, aria-hidden) ; la plage (3b point 4) inclut la date client. (d) Badge « Client » (couleur flag) dans la colonne Drapeaux si `engagement_depasse`, `title` « Engagement client dépassé ». (e) Nom accessible du jalon et annonce de l'élément actif (D-098) : « <nom>, le JJ/MM/AAAA[, retard], date client JJ/MM/AAAA, écart +N j[, engagement client dépassé] ». Accueil inchangé.
- Jeu de démonstration (D-117) : charge vendue sur deux feuilles de DEMO-R (marge positive, marge négative) ; date client sur un jalon de DEMO-R, antérieure à sa date planifiée.
- Amendement D-154 (12). `charge_vendue` a au plus 2 décimales exactement : une valeur comme 1.0000000001 est refusée en 400, la base reste inchangée. Dans le dialogue, « .5 » et « 5. » sont refusés : un chiffre est exigé de chaque côté du séparateur décimal.

### Notes d'activité (notes, D-270)

1. **Champ.** `notes` sur toute activité, feuille ou parente ; pas sur les jalons (POST ou PATCH d'un jalon avec `notes` : 400, base inchangée). Facultatif. Texte sur plusieurs lignes, 500 caractères au plus (points de code Unicode), espaces de bord retirés ; vide après retrait = null. Au-delà de 500 : 400, rien n'est écrit. Migration 019 : `activite.notes text` nullable, CHECK `char_length(notes) <= 500`.
2. **Écriture.** Par ceux qui écrivent l'activité (administrateur, chef dans sa portée, leader métier), par POST `/api/projets/:id/activites` et PATCH `/api/activites/:id` (`notes` : chaîne ou null). Les refus existants sont inchangés (403 pour un projet lisible non modifiable, base inchangée).
3. **Lecture.** La clé `notes` est renvoyée à qui lit le projet (administrateur, chef de projet, leader métier), y compris en lecture seule : GET `/api/projets/:id/activites`, réponses POST et PATCH, GET `/api/projets/:id/gantt` (éléments de type activité). Jamais au rôle ressource : absente de Mes tâches, de la feuille de temps, de la validation et de toute route qui lui est ouverte (clé absente, non null).
4. **Historique.** Création, modification et effacement historisés comme les autres champs de l'activité ; une valeur inchangée n'est pas historisée.
5. **Copie.** Copie de projet, création depuis un modèle et enregistrement comme modèle : notes copiées (§11, `copierContenu`).
6. **Exports.** Aucun changement.
7. **Écrans.** (a) Dialogues de création et de modification d'une activité (Planning, Gantt, Accueil) : champ « Notes » sur plusieurs lignes (`textarea`), après le champ « Nom » ou au plus près ; compteur « N / 500 » (N en points de code), saisie bloquée à 500 ; champ vide = pas de note. Il n'existe pas de dialogue en lecture seule : qui ne peut pas écrire lit la note dans la colonne du Gantt. (b) Colonne « Notes » au choix dans le menu « Colonnes » du Gantt d'un projet et du Gantt global de l'Accueil, placée avant « Drapeaux », décochée par défaut ; cellule tronquée sur une ligne, texte complet en infobulle (`title`) ; vide si aucune note ; jalons et lignes de projet : vide. (c) @ui-designer pour les deux écrans.
8. **Cas de test.**
   - NO-1 : POST avec `notes` = « ␠␠Ligne 1\nLigne 2␠ » → 201, `notes` = « Ligne 1\nLigne 2 » ; sans `notes` → null.
   - NO-2 : `notes` = « ␠␠␠ » (espaces seuls), en POST et en PATCH → null.
   - NO-3 : 500 points de code (500 fois « é » ; 500 fois « 😀 ») acceptés, 501 → 400, base inchangée.
   - NO-4 : PATCH `notes` = « Texte » → modifié ; PATCH `notes` = null → null ; PATCH sans `notes` → inchangé.
   - NO-5 : refus : chef sur projet lisible non modifiable → 403 ; ressource → 404 (règle existante : le projet ne lui est pas lisible) ; base inchangée. (modifié par D-271)
   - NO-6 : lecture : administrateur, chef et leader (écriture et lecture seule) ont la clé `notes` (GET activités, Gantt) ; la ressource affectée ne l'a dans aucune réponse (Mes tâches, feuille de temps, validation, GET activités, Gantt) ; jalon sans la clé.
   - NO-7 : historique : création avec note, modification, effacement : une entrée chacun avec ancienne et nouvelle valeur ; PATCH de la même valeur : aucune entrée.
   - NO-8 : copie de projet, création depuis un modèle, enregistrement comme modèle : notes copiées.
   - NO-9 : migration 019 : colonne `notes` nullable ; INSERT direct de 501 caractères refusé par le CHECK.
   - NO-10 : exports (plan de charge, imputations, coûts) : aucune colonne de notes.
   - Écrans : E2E-707 à E2E-711 (docs/tests.md).

## 4. Calendrier et capacité

- **Jour ouvré** d'une ressource : jour travaillé de son calendrier et non férié.
- **Disponibilité** de la ressource r le jour d = capacité(r) si d est ouvré, sinon 0, moins les imputations réelles de r ce jour, moins le travail déjà planifié ou saisi manuellement pour r ce jour.
- **Plafond d'assignation** : une assignation ne reçoit pas plus de taux × capacité par jour.
- **Plafond de projet** : sur une semaine ISO, la somme du travail (réel et planifié) d'une ressource sur un projet ne dépasse pas taux d'affectation projet × capacité × nombre de jours ouvrés de la semaine. Les sous-projets comptent dans le projet racine.

Précisions du lot 2f (D-062) :

- **Plafond** : par ressource, par projet et par semaine ISO (lundi à dimanche) = plancher(taux d'affectation × capacité × nombre de jours ouvrés de la semaine au calendrier de la ressource), en centièmes. Un jour férié le réduit ; ni D0 ni les dates d'affectation ne le réduisent.
- **Sous-arbre** : chaque projet où la ressource est affectée plafonne le travail de tout son sous-arbre (lui et ses sous-projets présents dans l'entrée) avec son propre taux ; un projet sans affectation de la ressource n'impose aucun plafond.
- **Modes soumis** : tous ceux qui suivent 5.4 (ASAP, START, STARR, ALAP, FDUR, REGUL), en remplissage avant comme arrière ; plafond épuisé = jour sans disponibilité pour l'assignation.
- **DDUR et MAN** : jamais limités, mais leur travail posé consomme le plafond des activités traitées ensuite ; le travail réel aussi ; les saisies MAN antérieures à D0 ne comptent pas. Aucun drapeau ni avertissement nouveau.
- **Calcul partiel** : le plafond d'un ancêtre absent de l'entrée est ignoré (limite V1).
- Hors des dates de l'affectation projet, la ressource n'est pas planifiable sur ce projet.
- Les éléments sans ressource (barre, jalon) et les délais de dépendance suivent le calendrier par défaut.
- (modifié par D-276) Absences d'une ressource : un jour d'absence en journée entière est un jour férié pour cette ressource ; une demi-journée divise par deux sa capacité du jour. Voir « Absences et charge depuis le taux (absences, D-276) ».

### Absences et charge depuis le taux (absences, D-276)

Décision du porteur (2026-11-28) : les absences d'une ressource (congés, formations) entrent dans la V1 (« Hors périmètre V1 » amendé), ainsi que la charge d'une assignation REGUL calculée depuis son taux. Tranches : absences-1 (API et moteur, points 1 à 9), absences-2 (écrans, point 10), charge-taux (points 11 à 16).

1. **Entité Absence.** Table `absence` (migration 020) : `id`, `ressource_id` (utilisateur `est_ressource`), `debut`, `fin` (dates, fin ≥ début), `portion` (`journee`, `matin`, `apres_midi` ; demi-journée seulement si début = fin), `motif` (`conge`, `formation`, `autre`). Libellés : portions « Journée », « Matin », « Après-midi » ; motifs « Congé », « Formation », « Autre ».
2. **Chevauchement.** Deux absences d'une même ressource ne se chevauchent pas, même partiellement ; seule exception : un matin et un après-midi le même jour. Chevauchement : 409 { erreur: 'Absence qui chevauche une autre', code: 'absence_chevauchement' }, rien n'est écrit. Un matin et un après-midi le même jour valent, au calcul et dans la feuille de temps, une journée entière.
3. **Effet, règle unique.**
   - Un jour d'absence en journée entière est traité, pour cette ressource, exactement comme un jour férié de son calendrier, dans toutes les règles de §4 et §5 (disponibilité, plafond d'assignation, plafond de projet hebdomadaire, fenêtre REGUL, FDUR, DDUR, MAN, reliquats) et dans la feuille de temps.
   - Une demi-journée laisse le jour ouvré, mais sa capacité vaut la moitié de la capacité de la ressource (plancher au centième) : disponibilité et plafond d'assignation (taux × capacité du jour) en tiennent compte ; le plafond de projet de la semaine compte ce jour pour 0,5 jour ouvré (plancher en centièmes inchangé). Une demi-journée sur un jour non ouvré est sans effet.
   - Le moteur reste pur : les absences lui sont passées en entrée, par ressource (`Ressource.absences`, facultatif : une entrée `{ jour, portion }` par jour d'absence). Sans absence (champ absent ou liste vide), toute sortie du moteur est identique à l'actuelle.
   - L'API passe au moteur toutes les absences des ressources, jour par jour.
4. **Jour déjà imputé.** Une absence en journée entière (création ou modification) dont un jour porte du réel > 0 pour la ressource (imputation d'une quelconque de ses assignations) est refusée : 422 { erreur: 'Jour déjà imputé', code: 'jour_impute' }, rien n'est écrit. Une demi-journée n'est pas contrôlée.
5. **Feuille de temps.** `GET /api/feuilles` : `jours[].capacite` vaut 0 un jour d'absence en journée entière, la moitié de la capacité un jour ouvré en demi-journée (`depassement` suit). `PUT /api/feuilles` : une charge > 0 nouvelle ou modifiée sur un jour d'absence en journée entière est refusée, 422 { erreur: 'Jour d'absence', code: 'jour_absence' }, rien n'est écrit ; ce refus passe après les 422 existants ; une imputation déjà en base renvoyée à l'identique est acceptée. Les jours fériés gardent la règle de §7 4a point 6 (saisie acceptée).
6. **Planning manuel.** `GET /api/activites/:id/jours-non-ouvres` compte les jours d'absence en journée entière de la ressource de chaque assignation ; une saisie nouvelle sur un tel jour est refusée comme un jour non ouvré (422 `jour_non_ouvre`, §5.6, D-123 (8)).
7. **Droits.**
   - Écriture (POST, PATCH, DELETE) : l'administrateur pour toute ressource ; la ressource pour elle-même (quel que soit son rôle) ; le chef de projet pour les ressources affectées à au moins un projet de sa portée d'écriture (`ressourcesEnPortee`, même fonction que la portée des taux, §12.6) ; le leader métier pour toute ressource.
   - Lecture : la ressource lit les siennes ; administrateur, chefs de projet et leaders métier lisent toutes les absences.
   - Hors droits : 403 { erreur: 'Interdit' }, rien n'est écrit ; ressource ou absence inconnue, identifiant mal formé ou hors plage : 404.
8. **API.** Corps stricts (zod).
   - `GET /api/absences?ressource_id=&du=&au=` (paramètres facultatifs) → 200 `[{ id, ressource_id, debut, fin, portion, motif }]`, triées par ressource, début, id ; `du` et `au` : absences qui touchent la période. Sans `ressource_id` : rôle ressource, les siennes ; autres rôles, toutes. Ordre des refus : 401 ; 400 (paramètre mal formé, `au` antérieur à `du`) ; 404 (ressource inconnue) ; 403 (rôle ressource et `ressource_id` d'autrui).
   - `POST /api/absences` `{ ressource_id, debut, fin, portion, motif }` → 201, l'absence. Ordre : 401 ; 400 (corps invalide, fin < début, demi-journée sur plusieurs jours) ; 404 ; 403 ; 422 { erreur: 'Seule une ressource a des absences', code: 'non_ressource' } ; 422 `jour_impute` ; 409 `absence_chevauchement`.
   - `PATCH /api/absences/:id` `{ debut?, fin?, portion?, motif? }` (la ressource ne change pas) → 200 ; contrôles sur l'état fusionné. Ordre : 401 ; 404 ; 403 ; 400 ; 422 `jour_impute` ; 409.
   - `DELETE /api/absences/:id` → 204. Ordre : 401 ; 404 ; 403.
   - Verrou de la ligne utilisateur de la ressource (FOR UPDATE) dans la transaction de chaque écriture.
9. **Historique.** Créations, modifications (une entrée par champ modifié) et suppressions écrites dans la table `historique` existante, entité `absence`, sans projet ; lisibles par l'administrateur seul, par `GET /api/historique?entite=absence` (route existante, 403 pour les autres rôles).
10. **Écrans (absences-2).**
    - Imputations : nouvel onglet « Absences » (adresse `?onglet=absences`), pour tout utilisateur `est_ressource`, l'administrateur, le chef de projet et le leader métier ; placé après « Feuille de temps » et « Validation ». Règle de D-247 point 2 inchangée : liste d'onglets dès deux onglets disponibles ; onglet par défaut inchangé.
    - (modifié par D-280 : administrateur, chef de projet et leader métier voient la grille du point 25 au lieu de cette liste ; ce qui suit vaut pour le rôle ressource, et pour la liste du dialogue de la grille) Liste « Ressource » : sa propre personne par défaut (si `est_ressource`) ; ressource : elle seule ; chef de projet : lui-même s'il est ressource, plus les ressources de sa portée d'écriture (ressources affectées à un projet dont `peut_ecrire` est vrai) ; administrateur et leader métier : toutes les ressources actives. Triée par nom. Adresse `&ressource=<id>` ; valeur absente de la liste : défaut, adresse corrigée sans rechargement. Utilisateur non ressource : aucune sélection par défaut, message « Choisissez une ressource. ».
    - Tableau « Absences » : colonnes Du, Au (JJ/MM/AAAA), Portion, Motif, Actions ; boutons « Modifier l'absence du <JJ/MM/AAAA> » et « Supprimer l'absence du <JJ/MM/AAAA> » (confirmation « Supprimer l'absence du <JJ/MM/AAAA> ? ») ; vide : « Aucune absence. ». Bouton « Nouvelle absence » : dialogue « Nouvelle absence » (champs Du, Au, Portion, Motif ; garde D-188), bouton « Créer » ; modification : dialogue « Modifier l'absence », bouton « Enregistrer ». Portion autre que Journée : Au aligné sur Du et désactivé. Refus, dialogue ouvert : 409 « Cette absence chevauche une autre absence. » ; `jour_impute` « Un de ces jours porte déjà des imputations. » ; 403 « Vous n'avez pas le droit de modifier les absences de cette ressource. » ; 400 « Données invalides. ».
    - Feuille de temps : la case d'un jour d'absence en journée entière est désactivée comme une case de jour non ouvré du planning manuel (D-124 (1) : `aria-disabled="true"` sans `disabled` si elle est vide, activable pour l'effacer si elle porte une valeur), `title` « Absence (<motif>) » ; refus `jour_absence` : « Ce jour est un jour d'absence. ».
    - Planning manuel : cases des jours d'absence en journée entière désactivées par la règle existante des jours non ouvrés.
    - Accueil, planning d'une ressource : jours d'absence en journée entière grisés sur le calendrier (`data-absence` = jour, `title` « Absence (<motif>) ») ; les demi-journées ne sont pas marquées.
11. **Charge depuis le taux, champ.** Assignation : `charge_depuis_taux` (booléen, faux par défaut, migration 021), renvoyé par toutes les routes qui renvoient une assignation, historisé comme les autres champs de saisie. Vrai permis seulement si l'activité est en mode REGUL ; sinon 422 { erreur: 'Mode incompatible', code: 'mode_incompatible' }, rien n'est écrit (POST et PATCH).
12. **Calcul.** Pour une assignation dont le champ est vrai, sur une feuille REGUL ouverte :
    - charge assignée = charge réelle + taux d'assignation × capacité × nombre de jours ouvrés restants de la ressource ;
    - jours restants : du maximum de D0 et du début de fenêtre REGUL (§5.6, D-051) jusqu'à la fin validée ; jour d'absence en journée entière : 0 ; demi-journée : 0,5 ; fériés et jours non travaillés exclus ;
    - arrondi au centième inférieur ; reste à faire = charge assignée − charge réelle, jamais négatif.
    - Le moteur la calcule en entrée de passe A et planifie ce reste ; sortie `assignations` : `{ id, reste, charge }` pour ces seules assignations (clé `charge` absente des autres). L'API écrit `charge_assignee` et `reste_a_faire` avec les sorties du calcul, sans historique (valeur calculée).
    - Sans aucun champ vrai, toute sortie du moteur est identique à l'actuelle. Champ vrai sur une activité close, parente ou non REGUL : ignoré par le moteur.
13. **Changement de mode.** Un PATCH qui fait sortir l'activité du mode REGUL repasse le champ à faux sur ses assignations (historisé) ; la charge garde sa dernière valeur.
14. **Charge saisie.** PATCH de `charge_assignee` sur une assignation dont le champ est (ou devient, dans le même corps) vrai : 422 { erreur: 'Charge calculée', code: 'charge_calculee' }, rien n'est écrit.
15. **Écran.** Dialogue d'assignation (création et modification) : case « Charge depuis le taux », visible seulement si l'activité est en REGUL ; cochée, le champ « Charge assignée » passe en lecture seule, avec l'aide « Recalculée à chaque calcul : taux × capacité × jours ouvrés restants, absences déduites. » ; `charge_depuis_taux` envoyé en création si coché, en modification s'il a changé. Refus `mode_incompatible` : « L'activité n'est pas en mode régulier. » ; `charge_calculee` : « La charge est calculée depuis le taux. ». La colonne Ressources du Gantt et Mes tâches affichent la valeur calculée (lue en base). (modifié par D-278 : même case dans le dialogue « Modifier l'assignation » ouvert depuis le Gantt et l'Accueil, point 23)
16. **Copie.** Copie de projet, création depuis un modèle et enregistrement comme modèle : le champ est copié (§11).
17. **Jeu de démonstration (D-117).** Deux absences d'alice (un congé d'une journée, une formation d'une matinée) et une assignation REGUL d'alice en charge depuis le taux.
18. **Cas du moteur (ABM-n).** Jeu de §5.5 (D0 = lundi 04/01/2027, lundi à vendredi, Alice et Bob capacité 1, affectés à 100 %).

| Cas | Données | Résultat attendu |
|---|---|---|
| ABM-1 | Alice absente le mer 06/01 (journée), ASAP Alice 3 j | 1 j les 04, 05 et 07/01 |
| ABM-2 | Alice affectée à 50 %, absente le 06/01 (journée), ASAP Alice 3 j | 1 j les 04, 05 et 11/01 (comme PROJ-5) |
| ABM-3 | Alice absente le matin du 05/01, ASAP Alice 3 j | 1 j le 04/01, 0,5 j le 05/01, 1 j le 06/01, 0,5 j le 07/01 |
| ABM-4 | Alice affectée à 50 %, absente l'après-midi du 05/01, ASAP Alice 5 j (plafond de la semaine du 04/01 : 2,25 j) | 1 j le 04/01, 0,5 j le 05/01, 0,75 j le 06/01, 1 j les 11 et 12/01, 0,5 j le 13/01, 0,25 j le 18/01 |
| ABM-5 | REGUL fenêtre 04–08/01, Alice 4 j, absente le 06/01 (journée) | 1 j les 04, 05, 07 et 08/01 ; dates du 04 au 08/01 ; aucun drapeau |
| ABM-6 | Assignation à 50 %, Alice absente le matin du 05/01, ASAP Alice 2 j | 0,5 j les 04, 06 et 07/01 ; 0,25 j les 05 et 08/01 |
| ABM-7 | Alice absente le matin et l'après-midi du 06/01, ASAP Alice 3 j | 1 j les 04, 05 et 07/01 |
| ABM-8 | MAN, saisie Alice 1 j le 06/01, Alice absente le 06/01 (journée) | Posée, 1 j en surcharge, drapeau `surcharge` |
| ABM-9 | DDUR durée 5, Alice 5 j, absente le 06/01 (journée) | 1,25 j les 04, 05, 07 et 08/01, dont 0,25 j/jour en surcharge |
| ABM-10 | Bob absent le 05/01 (journée), ASAP Alice 2 j | Alice les 04 et 05/01 |
| ABM-11 | Liste d'absences vide pour chaque ressource, sur les cas ASAP-1, REGUL-1 et PROJ-1 | Sortie identique à celle de l'entrée sans le champ |
| ABM-12 | Alice absente le matin du samedi 09/01, Alice affectée à 50 %, ASAP Alice 5 j | Comme PROJ-1 |

19. **Cas de la charge depuis le taux (CT-n, moteur).** Même jeu ; assignation REGUL d'Alice, champ vrai.

| Cas | Données | Résultat attendu |
|---|---|---|
| CT-1 | Fenêtre 04–15/01, taux d'assignation 50 %, charge d'entrée 2 j, réel 0 | Charge 5 j, reste 5 j ; 0,5 j/jour sur les 10 jours ouvrés ; sortie `assignations` `{ id, reste: 5 j, charge: 5 j }` |
| CT-2 | CT-1, Alice absente le 07/01 (journée) et le matin du 12/01 | Charge 4,25 j, reste 4,25 j |
| CT-3 | D0 = 11/01, fenêtre 04–15/01, taux 100 %, réel 3 j (1 j les 04, 05 et 06/01), charge d'entrée 10 j | Charge 8 j, reste 5 j |
| CT-4 | Fenêtre 04–08/01, taux 100 %, mercredi 06/01 férié au calendrier d'Alice | Charge 4 j |
| CT-5 | Fenêtre 04–08/01, taux 33,33 % | Charge 1,66 j |
| CT-6 | D0 = 18/01, fenêtre 04–15/01, réel 2 j | Charge 2 j, reste 0 |
| CT-7 | Fenêtre 04–08/01, Alice capacité 0,8, taux 50 % | Charge 2 j |
| CT-8 | Début validé 06/01, fin validée 15/01, taux 100 % | Charge 8 j |
| CT-9 | Champ vrai sur une activité ASAP, et sur une REGUL close | Ignoré : sortie identique à celle de l'entrée sans le champ, clé `charge` absente |
| CT-16 | (modifié par D-278) Fenêtre 04–15/01, taux d'assignation 50 %, charge d'entrée 1 j, réel 0, Alice absente le jeudi 07/01 (journée) ; données de E2E-725 | Charge 4,5 j, reste 4,5 j |

20. **Cas de l'API et des écrans (AB-n).** Tests ABT-n, CTT-n et E2E (docs/tests.md).
    - AB-1 : POST par la ressource pour elle-même → 201, objet complet ; une entrée d'historique `creation`.
    - AB-2 : fin < début, demi-journée sur deux jours, motif ou portion inconnus, clé inconnue → 400, base inchangée.
    - AB-3 : journée 04–08/01 existante ; matin du 06/01 → 409 ; journée 08–10/01 → 409 ; matin du 11/01 puis après-midi du 11/01 → 201 et 201 ; matin du 11/01 encore → 409 ; base inchangée à chaque refus.
    - AB-4 : imputation 1 j le 05/01 ; journée 04–06/01 → 422 `jour_impute` ; matin du 05/01 → 201 ; PATCH d'une journée vers une période qui couvre le 05/01 → 422.
    - AB-5 : droits d'écriture : chef dans sa portée 201, hors portée 403 ; leader 201 ; ressource pour autrui 403 ; administrateur 201 ; ressource inconnue 404 ; utilisateur non ressource 422 `non_ressource` ; base inchangée à chaque refus ; mêmes droits en PATCH et DELETE.
    - AB-6 : lecture : la ressource sans `ressource_id` lit les siennes seulement, avec `ressource_id` d'autrui 403 ; chef, leader, administrateur lisent tout ; filtre `du`/`au`.
    - AB-7 : PATCH et DELETE : une entrée d'historique par champ modifié, une à la suppression ; `GET /api/historique?entite=absence` : 200 pour l'administrateur, 403 pour le chef.
    - AB-8 : calcul : une journée d'absence d'Alice le 05/01 et une ASAP Alice 2 j → travail planifié les 04 et 06/01.
    - AB-9 : feuille de temps : capacité 0 un jour d'absence en journée, 0,5 un jour en demi-journée ; PUT 1 j sur le jour d'absence → 422 `jour_absence`, base inchangée.
    - AB-10 : planning manuel : le jour d'absence figure dans `jours-non-ouvres` ; PUT d'une saisie nouvelle ce jour → 422 `jour_non_ouvre`.
    - AB-11 : écrans du point 10 (E2E).
    - CT-10 : API : `charge_depuis_taux` vrai sur une activité non REGUL (POST, PATCH) → 422 `mode_incompatible`, base inchangée ; sur une REGUL → 201, 200, clé présente (faux par défaut).
    - CT-11 : PATCH `charge_assignee` sur une assignation au champ vrai → 422 `charge_calculee`, base inchangée.
    - CT-12 : activité passée de REGUL à ASAP : champ faux, charge inchangée.
    - CT-13 : calcul : `charge_assignee` et `reste_a_faire` écrits depuis la sortie, sans entrée d'historique.
    - CT-14 : copie de projet : champ copié.
    - CT-15 : écran du point 15 (E2E).
21. (modifié par D-278) **Durée maximale.** Une absence dure au plus 366 jours (fin − début + 1 ≤ 366, SEC-21). POST, ou PATCH dont l'état fusionné dépasse : 422 { erreur: 'Une absence dure au plus 366 jours.', code: 'duree_excessive' }, rien n'est écrit. Ordre : après 422 `non_ressource` (POST), avant 422 `jour_impute`. Écran (dialogues « Nouvelle absence » et « Modifier l'absence ») : refus affiché dialogue ouvert, même message « Une absence dure au plus 366 jours. ».
    - AB-12 : journée du 01/01/2027 au 01/01/2028 (366 jours) → 201 ; du 01/01/2027 au 02/01/2028 (367 jours) → 422 `duree_excessive`, base inchangée ; PATCH de la première vers une fin au 02/01/2028 → 422, base inchangée.
22. (modifié par D-278) **Dépliage borné (SEC-21).** Le calcul ne lit les jours d'absence que de la semaine de D0 à l'horizon du calcul (D0 + 3 ans) ; une lecture par période (`du`, `au`) ne déplie que les jours de cette période. Une absence plus longue (antérieure à la borne de durée) ne coûte rien de plus.
    - AB-13 : absences en base insérées hors API. Une absence du 04/01/2027 au 31/12/2040 : un calcul de D0 04/01/2027 ne reçoit aucun jour d'absence postérieur à l'horizon (04/01/2030). Une absence du 04/01/2027 au 31/12/99999 : une lecture dépliée du 04/01 au 08/01/2027 rend 5 jours en moins de 2 secondes.
23. (modifié par D-278) **Dialogue « Modifier l'assignation » du Gantt et de l'Accueil.** Colonne Ressources du Gantt d'un projet et du Gantt global de l'Accueil : le dialogue est celui du Planning (point 15), case « Charge depuis le taux » comprise (visible si l'activité est en REGUL ; cochée, « Charge assignée » en lecture seule avec l'aide du point 15 ; charge jamais envoyée quand la case est cochée). La valeur du champ est lue par `GET /api/projets/:id/assignations` à l'ouverture (la réponse du Gantt est inchangée). Aucun refus `charge_calculee` possible depuis ces dialogues.
24. (modifié par D-278) **Plan de charge.** Le disponible de chaque mois (§7, Plan de charge, point 3) déduit les absences de la ressource par la règle du point 3 : un jour d'absence en journée entière (ou matin et après-midi le même jour) ne compte pas ; une demi-journée sur un jour ouvré compte pour la moitié de la capacité, plancher au centième ; une absence sur un jour non ouvré ou férié est sans effet. `ecart` suit. Même valeur à l'écran (infobulle, surcharge) et dans l'export (ligne « Disponible », §7 6f point 3). Cas PCA-n (`debut=2027-01`, Alice capacité 1, calendrier par défaut lundi à vendredi sans férié, sans charge ; valeurs de 01/2027 et 02/2027 ; autres mois inchangés) :

| Cas | Données | Disponible attendu |
|---|---|---|
| PCA-1 | Alice absente du lundi 04/01 au vendredi 08/01/2027 (journée) | 01/2027 : 16 ; 02/2027 : 20 ; écart 01/2027 : 16 |
| PCA-2 | Alice absente le matin du 05/01/2027 | 01/2027 : 20,5 |
| PCA-3 | Alice absente le matin et l'après-midi du 05/01/2027 | 01/2027 : 20 |
| PCA-4 | Alice absente le samedi 09/01/2027 (journée) et le matin du dimanche 10/01/2027 | 01/2027 : 21 |
| PCA-5 | Alice absente du lundi 25/01 au vendredi 05/02/2027 (journée) | 01/2027 : 16 ; 02/2027 : 15 |
| PCA-6 | Alice capacité 0,75, absente le matin du 05/01/2027 | 01/2027 : 15,37 |
| PCA-7 | Calendrier d'Alice avec le mercredi 06/01/2027 férié, Alice absente du 05/01 au 07/01/2027 (journée) | 01/2027 : 18 |
| PCA-8 | PCA-1, export `debut=2027-01`, Alice dans l'équipe « Dev » | ligne `Alice;Dev;Disponible;16;20;23;22;21;22;22;22;22;21;22;23` et ligne `Alice;Dev;Écart;16;20;23;22;21;22;22;22;22;21;22;23` |

#### Grille mensuelle (absences-grille, D-280)

Retour d'usage du porteur (2026-11-28). Complète le point 10 (marque « (modifié par D-280) » sur l'onglet « Absences » et sa liste « Ressource »). Le rôle `ressource` garde la vue du point 10, sans changement.

25. **Qui, quoi.** L'onglet « Absences » d'Imputations affiche une grille pour l'administrateur, le chef de projet et le leader métier (ressources ou non), sans sélection préalable. Une ligne par utilisateur `est_ressource` actif, triée par nom (ordre français) ; une colonne par jour du mois affiché, en-tête : numéro du jour et initiale du jour de la semaine (L, M, M, J, V, S, D). Colonne « Ressource » figée à gauche ; défilement horizontal de la seule zone des jours si nécessaire (utilisable à 1024 px). Tableau d'`aria-label` « Absences de <mois AAAA> » (mois en lettres : « Absences de janvier 2027 »).
26. **Cases.**
    - Jour non travaillé ou férié du calendrier de la ressource : teinté (`data-non-ouvre`).
    - Absence en journée : case pleine, couleur selon le motif, lettre « C » (congé), « F » (formation), « A » (autre). Demi-journée : demi-case, matin à gauche, après-midi à droite ; un matin et un après-midi le même jour : deux demi-cases.
    - `title` et nom accessible de chaque case d'absence : « <Nom>, JJ/MM/AAAA, <Congé|Formation|Autre>, <journée|matin|après-midi> » (portion en minuscules).
    - Couleurs : jetons de couleur existants, contraste AA ; légende sous la grille (C, F, A, jour non travaillé).
27. **Filtres et navigation.** Listes « Équipe » (Toutes, Sans équipe, une équipe ; Toutes par défaut) et « Ressource » (Toutes par défaut ; les ressources de l'équipe choisie) ; boutons « Mois précédent », « Ce mois », « Mois suivant ». Adresse `/imputations?onglet=absences&mois=AAAA-MM[&equipe=<id>|aucune][&ressource=<id>]` (`semaine` conservée si présente) ; `mois` absent ou invalide : mois courant du navigateur ; `equipe` ou `ressource` invalide ou ressource absente de l'équipe choisie : Toutes ; adresse corrigée sans rechargement.
28. **Gestes.**
    - Clic (ou Entrée) sur une case d'absence : dialogue « Modifier l'absence » du point 10 si l'utilisateur peut écrire pour cette ressource (portée du point 7), sinon rien (l'infobulle seule). Une journée portant deux demi-cases : chaque demi-case ouvre son absence.
    - Clic (ou Entrée) sur une case vide d'un jour travaillé, avec droit d'écriture : dialogue « Nouvelle absence » prérempli (ressource, Du = Au = la date, portion Journée). Case non travaillée, fériée ou sans droit d'écriture : non activable, absente de l'ordre de tabulation.
    - Bouton « Nouvelle absence » : dialogue du point 10 avec une liste « Ressource » limitée à la portée d'écriture (D-276 point 7) ; ressource et dates modifiables dans tout dialogue ouvert depuis la grille.
    - La grille est relue après chaque enregistrement ou suppression. Suppression : depuis le dialogue « Modifier l'absence », bouton « Supprimer » avec la confirmation du point 10.
29. **Données.** Une requête pour les absences du mois : `GET /api/absences?du=<premier jour>&au=<dernier jour>` sans `ressource_id` (administrateur, chef de projet, leader métier : toutes les absences lisibles ; rôle ressource : les siennes, inchangé). Ajout à l'API : `GET /api/absences/grille?mois=AAAA-MM` → 200 `[{ id, nom, equipe_id, peut_ecrire, jours_non_ouvres }]` : utilisateurs `est_ressource` actifs, triés par nom puis id ; `jours_non_ouvres` : jours du mois (AAAA-MM-JJ, croissants) non travaillés ou fériés du calendrier de la ressource ; `peut_ecrire` : droit d'écriture du point 7 pour l'utilisateur connecté. Ordre des refus : 401 ; 403 (rôle ressource) ; 400 (`mois` absent ou mal formé, mois hors 2000-01 à 2099-12). Aucun champ de l'annuaire réservé à l'administrateur (ni login, ni email, ni calendrier, ni capacité). Équipes : `GET /api/equipes` (existant). Pas de requête par ressource.
30. **Cas de la grille (AG-n).** Jeu de §5.5 ; Alice (calendrier lundi à vendredi, mercredi 06/01/2027 férié) équipe « Dev », Bob même calendrier sans équipe, Claire non ressource, Dan ressource inactif ; mois 2027-01.
    - AG-1 : `GET /api/absences/grille?mois=2027-01` par un chef, un leader et l'administrateur → 200 ; lignes Alice et Bob seulement (ni Claire, ni Dan), triées par nom ; clés exactes `id, nom, equipe_id, peut_ecrire, jours_non_ouvres`.
    - AG-2 : `jours_non_ouvres` d'Alice, 2027-01 : 02, 03, 06, 09, 10, 16, 17, 23, 24, 30, 31/01. Bob, calendrier du lundi au samedi : 03, 10, 17, 24, 31/01.
    - AG-3 : `peut_ecrire` : administrateur et leader : vrai pour toutes ; chef de projet : vrai pour Alice seule (affectée à son projet), faux pour Bob.
    - AG-4 : refus : sans session 401 ; rôle ressource 403 ; `mois` absent, `2027-13`, `2027-1`, `1999-12` → 400 ; aucune absence ni historique écrit.
    - AG-5 : `GET /api/absences?du=2027-01-01&au=2027-01-31` sans `ressource_id` par un chef : toutes les absences qui touchent le mois, y compris d'une ressource hors de sa portée ; par la ressource Alice : les siennes seulement.
    - AG-6 (écran, e2e) : parcours de la grille (docs/tests.md).

## 5. Moteur de planification

### 5.1 Entrées et sorties

- **Entrées** : liste de projets, date de début de calcul D0 (défaut : aujourd'hui), données du modèle. (modifié par D-276 : absences des ressources, jour par jour, et champ `chargeDepuisTaux` des assignations ; §4 « Absences et charge depuis le taux »)
- **Sorties** : travail planifié par assignation et par jour, dates planifiées des activités, jalons et projets, drapeaux.
- Fonction pure : mêmes entrées, mêmes sorties. Aucun accès base dans le paquet moteur.
- Seul le reste à faire est planifié, à partir de D0. Le travail réel n'est jamais déplacé.
- Le travail des projets non sélectionnés est pris comme déjà consommé dans la disponibilité.
- Un calcul ne modifie que les projets sélectionnés et leurs sous-projets ; un projet clos est traité comme non sélectionné. Une activité close n'est pas replanifiée : aucun travail posé, reste à faire sorti à 0, dates = bornes de son travail réel.

### 5.2 Ordre de traitement

1. **Passe A, réservations** :
   1. saisies manuelles (mode MAN) ;
   2. activités en mode REGUL, triées par priorité projet, priorité activité, WBS.
2. **Passe B, le reste**, en ordre topologique des dépendances (un prédécesseur est toujours traité avant son successeur). Un jalon prêt passe avant toute activité prête. Entre activités prêtes, départage dans cet ordre :
   1. mode STARR d'abord, par début validé croissant ;
   2. priorité projet croissante ;
   3. priorité activité croissante ;
   4. ordre WBS.

Passe A, précisions (lot 2d) : seules les feuilles REGUL ouvertes y sont planifiées, reliquat de fin de fenêtre compris (5.6). Elles sortent de l'ordre de la passe B : leurs dates, connues avant la passe B, sont lues comme celles d'un prédécesseur déjà traité. Départage des REGUL : priorité projet, priorité activité, ordre WBS, identifiant de projet, identifiant d'élément (la clé STARR ne joue pas). Une activité REGUL close est traitée comme toute activité close. La détection des cycles garde les REGUL dans le graphe.

Passe A, précisions (lot 2e, D-056) : les saisies des feuilles MAN ouvertes sont posées avant les REGUL. Entre activités MAN, ordre : priorité projet, priorité activité, ordre WBS ; il décide quelle activité porte la surcharge d'un jour (5.6). Comme les REGUL, les feuilles MAN sortent de l'ordre de la passe B.

Un cycle de dépendances est refusé à la saisie, et le moteur renvoie une erreur s'il en rencontre un.

### 5.3 Dépendances

Soit P le prédécesseur, S le successeur, n le délai en jours ouvrés.

| Type | Règle |
|---|---|
| FD (fin-début) | S commence au plus tôt le jour ouvré suivant la fin de P, décalé de n jours ouvrés |
| DD (début-début) | S commence au plus tôt au début de P, décalé de n jours ouvrés |
| FF (fin-fin) | S est planifié à rebours pour finir à la fin de P décalée de n jours ouvrés ; si le reste à faire ne tient pas avant, repli au plus tôt |

- Un jalon flottant successeur en FD se pose le jour même de la fin de P (plus délai).
- La date de début au plus tôt d'un élément est le maximum de D0, de la date de début du projet et des contraintes de ses dépendances.
- Une dépendance vers une activité REGUL ou MAN n'en déplace pas les dates : si elle n'est pas respectée, drapeau `dependance_non_respectee`.
- `dependance_non_respectee` est évalué après la passe B, sur les dates planifiées et le calendrier par défaut, pour chaque dépendance dont le successeur S est une feuille à dates imposées (REGUL ; MAN au lot 2e). Elle n'est pas respectée si, avec P le prédécesseur et n le délai :
  - FD : le début de S précède le jour ouvré suivant la fin de P, décalé de n jours ouvrés ;
  - DD : le début de S précède le début de P décalé de n jours ouvrés ;
  - FF : la fin de S précède la fin de P décalée de n jours ouvrés.
- Le drapeau est porté par l'activité S et par la dépendance. Un prédécesseur parent porte sur ses dates agrégées ; pour un successeur parent, chaque descendant à dates imposées est contrôlé, et la dépendance est marquée si l'un d'eux la viole. REGUL vers REGUL : contrôlé. Un successeur d'un REGUL est traité normalement en passe B. La sortie du moteur porte une entrée par dépendance (prédécesseur, successeur, drapeaux), triée par prédécesseur puis successeur.
- Persistance (lot 2d-I) : chaque calcul écrit les drapeaux de toutes les dépendances des projets calculés, vidage compris, dans la colonne `drapeaux` de la dépendance. Cette colonne n'est jamais saisie (refus 400), n'est pas historisée et n'est pas exposée par les routes de dépendances avant le lot 3. Un calcul ne modifie pas les dépendances des projets non sélectionnés. Lot 3 (D-065) : les drapeaux des dépendances sont exposés par GET /api/projets/:id/gantt seulement.
- MAN (lot 2e, D-056), comme REGUL : un successeur MAN est contrôlé en passe finale, jamais déplacé ; un prédécesseur MAN est lu en passe B avec ses dates de saisie ; les arcs d'une feuille MAN ouverte sont retirés du tri de la passe B ; les cycles sont détectés sur le graphe complet. Un MAN sans saisie n'a pas de dates : le contrôle de ses dépendances est sauté, elles sortent avec des drapeaux vides.
- Un prédécesseur parent porte sur sa fin agrégée (son début agrégé en DD) ; un successeur parent, sur chacun de ses descendants. Pour la détection des cycles, un parent dépend de ses descendants : un cycle passant par l'agrégation d'un parent est refusé.
- Un jalon fixe se pose à sa date validée. Un jalon flottant sans prédécesseur se pose au jour ouvré, courant ou suivant, du maximum de D0 et du début du projet. Avec prédécesseur : FD et FF, fin de P décalée de n ; DD, début de P décalé de n. Sa date validée, si elle existe, est une borne « pas avant ». Le repli d'une FF ne lève aucun drapeau.

### 5.4 Règle de remplissage commune

Pour une assignation, sur un jour donné, la charge posée est le minimum de : la cible du mode, le reste à faire, la disponibilité, le plafond d'assignation, le reliquat du plafond de projet pour la semaine.

Dates planifiées d'une activité : premier et dernier jour portant du travail (réel compris). Activité sans assignation : barre de 1 jour ouvré à la date de début au plus tôt, ou de la durée validée si elle est renseignée.

Cible du jour (FDUR, DDUR, REGUL) : reste à faire ÷ jours ouvrés restants de la fenêtre, jour courant compris, arrondie au centième le plus proche (la moitié vers le haut), recalculée chaque jour ; le dernier jour porte donc tout le reste.

### 5.5 Jeu de données des tests

- Calendrier : lundi à vendredi, aucun férié. D0 = lundi 04/01/2027 sauf mention contraire.
- Semaines : 04–08/01, 11–15/01, 18–22/01.
- Ressources : Alice et Bob, capacité 1 j/jour, affectées à 100 % au projet P sauf mention contraire.
- Chaque cas est indépendant.

### 5.6 Modes

Le mode, le début validé, la fin validée et la durée validée d'une activité parente sont ignorés ; elle ne porte aucun drapeau.

#### ASAP — dès que possible

Remplit chaque jour ouvré à partir de la date de début au plus tôt, cible = reste à faire.

| Cas | Données | Résultat attendu |
|---|---|---|
| ASAP-1 | Alice 5 j, taux 100 % | 1 j/jour du 04 au 08/01 |
| ASAP-2 | Alice 3 j, taux 50 % | 0,5 j/jour les 04, 05, 06, 07, 08 et 11/01 ; fin le 11/01 |
| ASAP-3 | Activité 1 (WBS 1, Alice 3 j), activité 2 (WBS 2, Alice 2 j), mêmes priorités | Activité 1 du 04 au 06/01 ; activité 2 les 07 et 08/01 |
| ASAP-4 | Aucune assignation | Barre le 04/01, charge 0 |

#### START — ne commence pas avant la date validée

Début validé obligatoire. Identique à ASAP, avec date de début au plus tôt = maximum de la règle commune et du début validé. Les dépendances et le travail réel priment. Sans début validé, l'entrée du moteur est refusée (entree_invalide) pour une activité feuille ouverte ; le début validé d'un parent ou d'une activité close est ignoré.

| Cas | Données | Résultat attendu |
|---|---|---|
| START-1 | Début validé mer 06/01, Alice 2 j | 06 et 07/01 |
| START-2 | Début validé 06/01, Alice 2 j, prédécesseur FD finissant le ven 08/01 | 11 et 12/01 |
| START-3 | Début validé sam 09/01, Alice 1 j | 11/01 |

#### STARR — doit commencer à la date validée

Début validé obligatoire. Même calcul que START, mais l'activité est traitée avant les autres en passe B (voir 5.2), ce qui lui réserve la capacité à sa date. Si le début planifié est postérieur au début validé, drapeau `debut_non_respecte`. Si une dépendance repousse le début, l'activité est décalée et le drapeau est levé. La priorité STARR ne joue qu'entre éléments prêts. Le début planifié est comparé tel quel au début validé.

| Cas | Données | Résultat attendu |
|---|---|---|
| STARR-1 | X : ASAP, WBS 1, Alice 5 j. Y : STARR, WBS 2, début validé 06/01, Alice 2 j | Y les 06 et 07/01 ; X les 04, 05, 08, 11 et 12/01 |
| STARR-2 | Comme STARR-1 mais Y en mode START | X du 04 au 08/01 ; Y les 11 et 12/01 |
| STARR-3 | Y : STARR, début validé 06/01, Alice 2 j. Saisie manuelle d'Alice 1 j le 06/01 sur une autre activité | Y les 07 et 08/01, drapeau `debut_non_respecte` |

STARR-3 : au lot 2b, la saisie est remplacée par un travail externe équivalent ; version à saisie manuelle au lot 2e. Version à saisie testée au lot 2e (MAN-15).

#### ALAP — finit avant la date de fin validée

Fin validée facultative (sans elle : ASAP). Remplissage à rebours depuis la fin validée, jour par jour vers le passé, sans descendre sous la date de début au plus tôt. Si le reste à faire ne tient pas, la planification à rebours est abandonnée et l'activité est planifiée en ASAP, avec drapeau `retard` si la fin planifiée dépasse la fin validée. Sans fin validée : ASAP. Une dépendance FF prime : la fin validée ne sert alors qu'au drapeau retard. Le début validé est ignoré. Sans assignation : barre de la durée validée (1 par défaut) finissant à la fin validée, ou commençant au début au plus tôt si elle n'y tient pas. Le repli ASAP est global : si une assignation ne tient pas, toutes sont planifiées en ASAP.

| Cas | Données | Résultat attendu |
|---|---|---|
| ALAP-1 | Fin validée ven 15/01, Alice 3 j | 13, 14 et 15/01 |
| ALAP-2 | Fin validée 15/01, Alice 3 j, taux 50 % | 0,5 j/jour les 08, 11, 12, 13, 14 et 15/01 |
| ALAP-3 | Fin validée mer 06/01, Alice 5 j | Repli ASAP du 04 au 08/01, drapeau `retard` |
| ALAP-4 | Pas de fin validée, Alice 2 j | 04 et 05/01 |

#### FDUR — durée fixe

Durée validée N obligatoire (défaut 1). Fenêtre : N jours ouvrés à partir du maximum de la date de début au plus tôt et du début validé s'il existe. Sans assignation : barre de N jours. Avec assignation : chaque jour de la fenêtre, cible = reste à faire ÷ jours ouvrés restants dans la fenêtre. Le reliquat non posé en fin de fenêtre est planifié ensuite en ASAP, avec drapeau `retard`. La fenêtre suit le calendrier par défaut ; une dépendance FF la cale sur la fin cible, avec repli au début au plus tôt. Une ressource répartit la cible sur ses seuls jours ouvrés de la fenêtre ; si elle n'en a aucun, tout son reste est un reliquat. Cible et reliquat se calculent par assignation. Si du travail réel précède le début au plus tôt, la fenêtre part du premier jour réel : seuls ses jours à partir du début au plus tôt (D0, dépendances et début validé compris) reçoivent une cible ; si elle est écoulée, le reste est planifié en ASAP avec drapeau `retard`. Une durée validée inférieure à 1 ou non entière sur une feuille ouverte est refusée (entree_invalide).

| Cas | Données | Résultat attendu |
|---|---|---|
| FDUR-1 | Durée 5, aucune assignation | Barre du 04 au 08/01, charge 0 |
| FDUR-2 | Durée 5, Alice 2 j | 0,4 j/jour du 04 au 08/01 |
| FDUR-3 | Durée 2, Alice 3 j | 1 j les 04, 05 et 06/01 ; fin le 06/01, drapeau `retard` |

#### DDUR — piloté par la durée

Même fenêtre et même cible que FDUR, mais la durée est toujours respectée : la cible est posée sans tenir compte de la disponibilité ni des plafonds. Toute charge posée au-delà de la disponibilité est marquée `surcharge`. Plafonds d'assignation, de projet et dates d'affectation sont ignorés. Surcharge = charge posée − disponibilité, plancher 0. La charge posée consomme la disponibilité des activités traitées ensuite. L'ordre de traitement est celui de la passe B. Si la ressource n'a aucun jour ouvré dans la fenêtre, son reste est réparti sur les jours de la fenêtre, en surcharge. Fenêtre entamée ou écoulée : comme FDUR ; le drapeau `retard` ne se lève que si la fenêtre est écoulée.

| Cas | Données | Résultat attendu |
|---|---|---|
| DDUR-1 | Durée 5, Alice 2 j | 0,4 j/jour du 04 au 08/01, aucune surcharge |
| DDUR-2 | Durée 2, Alice 3 j | 1,5 j les 04 et 05/01, dont 0,5 j/jour en surcharge ; fin le 05/01 |
| DDUR-3 | Durée 5, début validé 11/01, Alice 5 j. Saisie manuelle d'Alice 1 j le 13/01 sur une autre activité | 1 j/jour du 11 au 15/01 ; le 13/01 est en surcharge (1 j) |

DDUR-3 : au lot 2c, la saisie est remplacée par un travail externe équivalent ; version à saisie manuelle au lot 2e. Version à saisie testée au lot 2e (MAN-16).

#### REGUL — régulier entre 2 dates

(modifié par D-276 : charge d'une assignation calculée depuis son taux, §4 « Absences et charge depuis le taux » point 12) Début validé et fin validée obligatoires. Traité en passe A. Chaque jour ouvré de la fenêtre à partir du maximum de D0 et du début validé : cible = reste à faire ÷ jours ouvrés restants dans la fenêtre. Le reliquat en fin de fenêtre est planifié ensuite en ASAP, avec drapeau `retard`.

| Cas | Données | Résultat attendu |
|---|---|---|
| REGUL-1 | Fenêtre 04–15/01, Alice 5 j | 0,5 j/jour sur les 10 jours ouvrés |
| REGUL-2 | REGUL-1, plus une activité ASAP (Alice 5 j) | L'activité ASAP reçoit 0,5 j/jour du 04 au 15/01 |
| REGUL-3 | Fenêtre 04–06/01, Alice 5 j | 1 j/jour du 04 au 06/01, puis 07 et 08/01 ; drapeau `retard` |
| REGUL-4 | D0 = 11/01, fenêtre 04–15/01, assigné 10 j, réel 3 j avant D0, reste 7 j | 1 j/jour du 11 au 15/01, puis 18 et 19/01 ; drapeau `retard` |

Précisions du lot 2d (D-051) :

- **Entrée** : début validé et fin validée obligatoires sur une feuille ouverte ; sans l'un d'eux, ou avec une fin antérieure au début, l'entrée est refusée (`entree_invalide`, id de l'activité). Le début validé, la fin validée et le mode d'un parent ou d'une activité close sont ignorés.
- **Fenêtre** : du maximum de D0, du début du projet et du début validé, jusqu'à la fin validée. Elle est bornée par ces deux dates, non par un nombre de jours : chaque ressource reçoit une cible sur chacun de ses propres jours ouvrés (son calendrier) entre ces deux dates, sans filtre par le calendrier par défaut. Début ou fin validés un jour chômé : seuls les jours ouvrés comptent. Les dépendances, la durée validée et la fin cible FF n'y jouent aucun rôle. L'horizon ne borne pas la fenêtre, seulement le reliquat.
- **Charge posée** : la règle de 5.4 s'applique (disponibilité, plafond d'assignation, dates d'affectation) ; un jour sans disponibilité reporte sa cible sur les jours suivants. Aucun jour ouvré de la ressource dans la fenêtre : tout son reste est un reliquat.
- **Reliquat** : posé en passe A, en ASAP, à partir du lendemain de la fin validée, ou du début de fenêtre s'il est postérieur. Fenêtre écoulée ou vide (fin validée antérieure au début de fenêtre) : tout le reste en ASAP depuis le début de fenêtre, avec `retard`. Cible et reliquat se calculent par assignation.
- **Travail réel** : il ne déplace pas la fenêtre. Réel avant le début validé : il compte dans les dates, sans `retard`. Réel postérieur à la fin validée, reste nul : `retard`.
- **Sans assignation** : barre des jours ouvrés du calendrier par défaut, du début de fenêtre à la fin validée ; fenêtre écoulée : barre d'un jour au début de fenêtre, avec `retard`.
  Fenêtre sans aucun jour ouvré du calendrier par défaut : barre d'un jour au premier jour ouvré à partir du début de fenêtre, avec `retard` si ce jour dépasse la fin validée (REGUL-22).
- **Dépendances** : celles dont REGUL est le successeur n'en déplacent pas les dates ; le drapeau `dependance_non_respectee` est évalué selon 5.3.
- **Capacité** : un REGUL, traité en passe A, réserve la capacité avant les modes de la passe B, STARR compris.

#### MAN — planning manuel

Le chef de projet saisit la charge par ressource et par demi-journée sur un calendrier mensuel. Le moteur ne déplace ni ne supprime ces saisies ; elles consomment la disponibilité avant toute autre activité. Aucune limite de capacité à la saisie : un dépassement est marqué `surcharge`. Reste à faire = somme des saisies à partir de D0. Dates planifiées = première et dernière saisie.

| Cas | Données | Résultat attendu |
|---|---|---|
| MAN-1 | Saisie Alice matin et après-midi du 05/01 sur M. Activité ASAP (Alice 2 j) | ASAP les 04 et 06/01 |
| MAN-2 | Saisies Alice 1 j le 05/01 sur deux activités MAN | Les deux saisies sont conservées ; 1 j en surcharge le 05/01 |
| MAN-3 | Recalcul lancé deux fois | Saisies inchangées, résultat identique |
| MAN-4 | D0 = 11/01. Saisies Alice 1 j le 05/01 et 1 j le 12/01 sur M ; ASAP Alice 2 j | M : travail posé le 12/01 seul, reste 1 j, dates du 05 au 12/01. ASAP les 11 et 13/01 |
| MAN-5 | Saisie Alice 1 j le samedi 09/01 | Posée, 1 j en surcharge, drapeau `surcharge`, dates du 09 au 09/01 |
| MAN-6 | Alice affectée à partir du 11/01, saisie le 05/01 matin | Posée, 0,5 j en surcharge, drapeau `surcharge` |
| MAN-7 | Saisie Alice le 05/01 matin sur M ; ASAP Alice 2 j | ASAP : 1 j le 04/01, 0,5 j le 05/01, 0,5 j le 06/01. Aucune surcharge |
| MAN-8 | Assignation à 50 %, saisie Alice 1 j le 05/01 | Posée, aucune surcharge |
| MAN-9 | M1 (priorité 500) et M2 (priorité 100), Alice 1 j le 05/01 sur chacune | M2 sans surcharge ; M1 1 j en surcharge, drapeau `surcharge` |
| MAN-10 | MAN assignée sans saisie, fin validée le 01/01 | Rien posé, dates vides, aucun drapeau, reste 0. Avec un prédécesseur en FD : dépendance à drapeaux vides |
| MAN-11 | A (ASAP, Alice 3 j, du 04 au 06/01) → M (MAN, Bob), FD délai 0 | Cas a : saisie Bob 1 j le 05/01 : drapeau `dependance_non_respectee` sur M et sur la dépendance. Cas b : saisie le 07/01 : aucun drapeau |
| MAN-12 | M (MAN, saisie Alice 1 j le 06/01) → S (ASAP, Bob 1 j), FD délai 0 | S le 07/01 |
| MAN-13 | M (saisie Alice 1 j le 04/01) et R (REGUL 04–08/01, Alice 4 j) | R : 1 j par jour du 05 au 08/01, dates du 05 au 08/01, aucun drapeau |
| MAN-14 | M close, saisie Alice 1 j le 04/01 ; ASAP Alice 1 j | Rien posé pour M, dates vides ; ASAP le 04/01 |
| MAN-15 | STARR-3 avec une vraie saisie (Alice 1 j le 06/01 sur une activité MAN) | Attendus de STARR-3 |
| MAN-16 | DDUR-3 avec une vraie saisie (Alice 1 j le 13/01 sur une activité MAN) | Attendus de DDUR-3 |
| MAN-17 | M avec deux assignations : saisies Alice 1 j le 05/01, Bob le 06/01 matin | Alice 1 j le 05/01, Bob 0,5 j le 06/01 ; reste Alice 1 j, Bob 0,5 j, activité 1,5 j ; dates du 05 au 06/01 ; aucun drapeau |
| ERR-10 | Saisie sur une assignation inconnue, sur une activité non MAN, sur un parent, de charge différente de 0,5 j, ou en doublon (assignation, jour, demi-journée) | `entree_invalide`, ids des assignations triés. Une saisie sur une activité MAN close n'est pas une erreur |

Précisions du lot 2e (D-056) :

- **Recopie** : le calcul recopie les saisies d'une feuille MAN ouverte faites à partir de D0 dans le travail planifié, une ligne par assignation et par jour (somme des demi-journées).
- **Saisies avant D0** : conservées ; hors reste à faire, hors disponibilité, non posées ; elles comptent pour les dates planifiées (première et dernière saisie, toutes dates confondues).
- **Reste à faire** : le calcul écrit le reste à faire de l'assignation MAN = somme de ses saisies à partir de D0, sans historique ; la charge assignée est inchangée. Sortie du moteur (D-057) : `assignations: [{ id, reste }]`, une entrée par assignation de l'entrée, triée par id ; feuille MAN ouverte : somme de ses saisies à partir de D0 ; activité close : 0 ; autres : reste à faire d'entrée. L'API n'écrit que le reste des assignations MAN (lot 2e-I).
- **Surcharge** : part de la saisie au-delà de la disponibilité du jour ; taux d'assignation et plafond d'assignation ignorés ; jour chômé ou hors dates d'affectation : disponibilité 0. Entre activités MAN, ordre de 5.2 (priorité projet, priorité activité, WBS) ; le drapeau `surcharge` est porté par l'activité qui dépasse.
- **Sans saisie** : aucune date, aucun drapeau, reste 0 ; le contrôle de ses dépendances est sauté (5.3).
- **Drapeaux** : jamais de `retard` sur un MAN ; ses dates validées sont ignorées.
- **Activité MAN close** : traitée comme toute activité close ; ses saisies sont ignorées.
- **API (lot 2e-I, D-058)** : `POST /api/calcul` lit les saisies des assignations des projets effectifs (charge 50 centièmes) et les passe au moteur. Le travail externe reste le travail planifié seul des projets hors sélection : les saisies d'un projet non calculé ne comptent pas avant son propre calcul. Il écrit le `reste_a_faire` des seules assignations de feuilles MAN ouvertes depuis la sortie `assignations`, sans historique ; la réponse est inchangée. Un calcul ne modifie jamais les saisies.
- **Règle de saisie (REX-3a, D-123 (8))** : une saisie nouvelle sur un jour non ouvré du calendrier de la ressource de l'assignation (jour non travaillé ou férié) est refusée : `PUT /api/activites/:id/saisies` → 422 `{ erreur, code: 'jour_non_ouvre', assignation_id, jour }`, rien n'est écrit. Une saisie est nouvelle si (assignation, jour, demi-journée) n'est pas déjà en base ; les saisies déjà en base sur un jour non ouvré sont conservées et peuvent être renvoyées à l'identique (200). Le moteur est inchangé : MAN-5 reste valide (saisie ancienne ou calendrier modifié après coup). `GET /api/activites/:id/jours-non-ouvres?mois=AAAA-MM` → 200 `{ mois, jours_non_ouvres: [{ assignation_id, jours }] }`, une entrée par assignation de l'activité triée par id, jours du mois triés ; mêmes droits et refus que `GET …/saisies`, n'écrit rien. Ordre des refus du PUT (D-124 (2)) : les 422 existants (activité non MAN, parent, close, assignation inconnue ou d'une autre activité) passent avant `jour_non_ouvre` ; plusieurs jours non ouvrés : le premier dans l'ordre (assignation, jour, demi-journée). La route des jours non ouvrés répond 200 aussi sur une activité non MAN (D-124 (3)).

#### Écran Planning manuel (lot 2e-E, D-060)

- Accès : bouton de ligne « Planning manuel » sur chaque activité MAN feuille de l'onglet Planning, visible de tout lecteur du projet. Page `/projets/:id/planning-manuel/:activiteId` avec lien de retour vers le projet. Mois par `?mois=AAAA-MM`, mois courant par défaut ; boutons « Mois précédent » et « Mois suivant ». « Mois précédent » est inactif en 2000-01 et « Mois suivant » en 2099-12.
- Grille : une ligne par assignation (nom de la ressource), une colonne par jour du mois, deux demi-cases par jour (matin, après-midi), total du mois par ligne en jours, samedis et dimanches teintés. Jours fériés et dates d'affectation non affichés ; saisie permise partout.
- « Enregistrer » envoie le PUT du mois, inactif sans modification ; « Annuler » rétablit l'état chargé. Les boutons de mois restent actifs ; avec des modifications non enregistrées, toute sortie de l'écran, changement de mois compris, demande la même confirmation que la Feuille de temps (D-172). Succès et erreur par notification.
- Lecture seule (cases désactivées, ni Enregistrer ni Annuler) : utilisateur sans droit d'écriture, activité close. Activité non MAN ou parente ouverte par l'adresse : message, pas de grille. Aucune assignation : état vide.
- L'écran ne lance aucun recalcul ; il indique que les saisies comptent au prochain calcul.
- Clavier (3g, D-114) : grille inscriptible, un seul arrêt de tabulation (tabindex mobile : case courante `tabIndex` 0, autres −1). Case courante initiale : première ressource, jour 1, matin ; conservée après Espace, Enregistrer et Annuler ; remise à la première au changement de mois ; un clic la rend courante. → et ← : demi-case suivante ou précédente de la ligne (matin, après-midi, matin du jour suivant), sans bouclage ; ↑ et ↓ : même demi-case, ressource précédente ou suivante, sans bouclage ; Début et Fin : première et dernière case de la ligne ; flèches, Début et Fin avec `preventDefault` ; Espace coche ou décoche (natif). Cases à cocher, noms accessibles et rôles inchangés. Lecture seule inchangée (cases désactivées, aucun arrêt).
- Jours non ouvrés (REX-3a, D-123 (8)) (modifié par D-276 : jours d'absence en journée entière compris) : la case d'un jour non ouvré du calendrier de la ressource (jours fériés compris) est désactivée, sauf si elle est cochée (activable pour la décocher) (D-124 (1)) : une case d'un jour non ouvré non cochée porte `aria-disabled="true"` sans l'attribut `disabled`, reste dans le tabindex mobile et est atteignable aux flèches, à Début et à Fin ; Espace et clic sans effet ; apparence grisée ; lecture seule inchangée (`disabled`, aucun arrêt). Refus 422 `jour_non_ouvre` du PUT : notification « Ce jour n'est pas ouvré pour la ressource. ».

### 5.7 Dépendances, jalons, plafond de projet : cas de test

| Cas | Données | Résultat attendu |
|---|---|---|
| DEP-1 | A (Alice 3 j) → B (Bob 2 j), FD, délai 0 | A du 04 au 06/01 ; B les 07 et 08/01 |
| DEP-2 | DEP-1 avec délai 2 | B les 11 et 12/01 |
| DEP-3 | A (Alice 3 j) → B (Bob 2 j), DD, délai 1 | B les 05 et 06/01 |
| DEP-4 | A (Alice 5 j) → B (Bob 2 j), FF, délai 0 | A du 04 au 08/01 ; B les 07 et 08/01 |
| DEP-5 | A → B → A | Erreur « cycle de dépendances » |
| JAL-1 | A (Alice 3 j) → jalon flottant, FD | Jalon le 06/01 |
| JAL-2 | Jalon fixe validé au 06/01, prédécesseur finissant le 08/01 | Jalon le 06/01, drapeau `retard` |
| PROJ-1 | Alice affectée à 50 % au projet, activité ASAP Alice 5 j | 1 j les 04 et 05/01, 0,5 j le 06/01, 1 j les 11 et 12/01, 0,5 j le 13/01 |
| PROJ-2 | A puis B (WBS 1 et 2), ASAP Alice 2 j chacune | A les 04 et 05/01 ; B 0,5 j le 06/01, 1 j le 11/01, 0,5 j le 12/01 |
| PROJ-3 | P à 50 % : A ASAP Alice 3 j. Q (priorité 600, Alice à 100 %) : B ASAP Alice 3 j | A : 1 j les 04 et 05/01, 0,5 j le 06/01, 0,5 j le 11/01. B : 0,5 j le 06/01, 1 j les 07 et 08/01, 0,5 j le 11/01 |
| PROJ-4 | P à 50 % : A ASAP Alice 1 j. Sous-projet P1 (Alice à 100 %) : C ASAP Alice 3 j, priorité d'activité 600 | A le 04/01. C : 1 j le 05/01, 0,5 j le 06/01, 1 j le 11/01, 0,5 j le 12/01 |
| PROJ-5 | Mercredi 06/01 férié au calendrier d'Alice, ASAP Alice 3 j | 1 j les 04, 05 et 11/01 |
| PROJ-6 | Y (WBS 1) DDUR durée 3, début validé 04/01, Alice 3 j ; B (WBS 2) ASAP Alice 1 j | Y 1 j par jour du 04 au 06/01, aucun drapeau ; B le 11/01 |
| PROJ-7 | M MAN, saisies Alice 1 j les 04, 05 et 06/01 ; B ASAP Alice 1 j | M posé, aucune surcharge ; B le 11/01 |
| PROJ-8 | ALAP fin validée 15/01, Alice 3 j | 0,5 j le 08/01, 0,5 j le 13/01, 1 j les 14 et 15/01 |
| PROJ-9 | Seul le sous-projet P1 est dans l'entrée (parent absent), Alice à 100 % sur P1 : C ASAP Alice 3 j | C du 04 au 06/01 |
| PROJ-10 | Assignation à 60 %, ASAP Alice 4 j | 0,6 j par jour du 04 au 07/01, 0,1 j le 08/01, 0,6 j les 11 et 12/01, 0,3 j le 13/01 |
| PROJ-11 | D0 = mercredi 06/01, ASAP Alice 3 j | 1 j les 06 et 07/01, 0,5 j le 08/01, 0,5 j le 11/01 |
| PROJ-12 | FDUR durée 5, début validé 04/01, Alice 4 j | 0,8 j les 04, 05 et 06/01, 0,1 j le 07/01 (plafond de la semaine atteint, 2,5 j), rien le 08/01 ; reliquat 1,5 j en ASAP : 1 j le 11/01, 0,5 j le 12/01 ; fin le 12/01, drapeau `retard` |
| PROJ-13 | REGUL fenêtre 04–08/01, Alice 3 j | 0,6 j les 04, 05, 06 et 07/01, 0,1 j le 08/01 (plafond de la semaine atteint) ; reliquat 0,5 j en ASAP le 11/01 ; fin le 11/01, drapeau `retard` |
| PROJ-14 | D0 = mercredi 06/01. A : Alice assigné 4 j, réel 1 j le 04/01 et 1 j le 05/01, reste 2 j | 0,5 j le 06/01, 1 j le 11/01, 0,5 j le 12/01 |

PROJ-2 à PROJ-14 : Alice affectée à 50 % au projet P, sauf mention. PROJ-12 et PROJ-13 sont dérivés des règles de 5.4 et 5.6 (cible recalculée chaque jour, reliquat en ASAP) et confirmés par le porteur (D-063) ; un jour au plafond épuisé reste compté parmi les jours restants de la fenêtre.

### 5.8 Agrégation

- Activité parente : début = plus petit début des enfants, fin = plus grande fin, charges = sommes.
- Projet : même règle sur ses activités, jalons et sous-projets.
- Avancement = réel ÷ (réel + reste à faire).

### 5.9 Drapeaux

| Drapeau | Condition | Affichage |
|---|---|---|
| `retard` | Mode ALAP : fin planifiée postérieure à la fin validée. Autres cas : fin planifiée postérieure à la fin de la fenêtre de durée, ou jalon fixe dont une dépendance exige une date postérieure. Une activité au reste nul porte aussi ce drapeau si son travail réel dépasse la fin de fenêtre | Barre rouge |
| `debut_non_respecte` | Mode STARR, début planifié postérieur au début validé | Trait rouge du début validé au début planifié |
| `surcharge` | Charge d'un jour supérieure à la disponibilité. L'activité porte aussi le drapeau surcharge si l'un de ses jours en porte | Jour rouge dans le détail |
| `dependance_non_respectee` | Voir 5.3 | Lien rouge |

- `retard`, REGUL : fin planifiée postérieure à la fin validée (5.6).
- Un reste à faire non posé (horizon atteint, aucune disponibilité) donne un avertissement du moteur, non persisté, et aucun drapeau.
- `dependance_non_respectee` est porté par l'activité et par la dépendance concernée (5.3).
- MAN (lot 2e) : `surcharge` sur l'activité dont une saisie dépasse la disponibilité du jour (5.6) ; jamais de `retard`.

## 6. Gantt

- **Affichage** : arborescence WBS à gauche (nom, mode, dates, charge, avancement), barres à droite. Jalons en losange, liens en flèches, trait vertical à la date du jour. Zoom jour, semaine, mois.
- **Édition à la souris** :

| Geste | Effet |
|---|---|
| Glisser une barre | Modifie le début validé (START, STARR, FDUR, DDUR) ou décale la fenêtre entière (REGUL) |
| Poignée droite | Modifie la fin validée (ALAP, REGUL) ou la durée validée (FDUR, DDUR) |
| Poignée gauche | Modifie le début validé (REGUL), durée inchangée pour FDUR et DDUR |
| Glisser d'une barre à une autre | Crée une dépendance FD, délai 0 |
| Clic sur un lien | Modifier le type, le délai, ou supprimer |
| Glisser une ligne dans l'arborescence | Change l'ordre WBS ou le parent |

- Les barres ASAP et MAN ne se déplacent pas à la souris.
- **Calcul** : bouton « Calculer » (choix des projets et de D0). Option de recalcul automatique après chaque modification. (livrée en 3d, D-074) Voir « Édition (lot 3d, D-088) » point recalcul automatique.
- Menu contextuel : créer une activité, un jalon, une sous-activité.

### Lecture (lot 3a, D-065)

`GET /api/projets/:id/gantt` → 200 :

- `projet` : { id, code, nom, date_debut, debut_planifie, fin_planifiee, clos, peut_ecrire }.
- `elements` : éléments du projet dans l'ordre WBS (celui de GET …/planning), chacun { id, type ('activite' | 'jalon'), parent_id, rang, wbs, nom, drapeaux }.
  - activité, en plus : mode, priorite, debut_valide, fin_valide, duree_validee, debut_planifie, fin_planifiee, close, est_parent, charge_assignee, charge_reelle, reste_a_faire, avancement ; feuille : `initiales` (lot 3d, D-088).
    - feuille, en plus (colonne-ressources, D-238) : `assignations`, liste de { id, ressource_id, nom, initiales, charge_assignee, taux }, une entrée par assignation ; `nom` et `initiales` viennent de l'utilisateur, `initiales` vaut null si la ressource n'en a pas ; tri par nom sans tenir compte de la casse, puis par id ; feuille sans assignation : `[]` ; parents et jalons : clé absente ; `initiales` (D-088) inchangé ; visible pour tout lecteur du projet, comme `charge_assignee`.
  - jalon, en plus : type_jalon ('flottant' | 'fixe'), date_validee, date_planifiee.
- Charges d'une feuille : sommes de ses assignations (0 sans assignation). Charges d'un parent : sommes de ses feuilles descendantes (SPEC 5.8). Dates planifiées et drapeaux : tels que stockés par le dernier calcul.
- `avancement` : réel ÷ (réel + reste) × 100, arrondi à 2 décimales ; null si réel + reste = 0.
- `dependances` : { id, predecesseur_id, successeur_id, type, delai, drapeaux }, triées par id.
- `sous_projets` : sous-projets directs que l'utilisateur peut lire, { id, code, nom, debut_planifie, fin_planifiee, clos }, triés par id ; leurs éléments ne figurent pas dans `elements`.
- Avant tout calcul : dates planifiées null, drapeaux [].
- Droits : lecture du projet (règles §2 et §11.1, modèles compris). Refus : 401 sans session ; 404 projet inconnu, illisible ou identifiant mal formé. (modifié par D-265 : pour le chef de projet, tout projet est lisible)
- Lecture seule : la route n'écrit rien.
- Charge vendue et date client (lot 6c, D-149) : `charge_vendue`, `marge`, `date_client`, `ecart_client`, `engagement_depasse` et `projet.totaux` s'ajoutent aux éléments et au projet, pour qui écrit sur le projet seulement ; clés absentes sinon (voir « Charge vendue et date client »). (modifié par D-265 : `charge_vendue`, `marge` et les clés de vente, de marge et de coût de `projet.totaux` sous `voit_finances`)

**Travail par jour (3g, D-114)**

`GET /api/projets/:id/travail` → 200 `{ lignes: [{ element_id, assignation_id, ressource_id, jour, charge, surcharge }] }` :

- Travail planifié des assignations des activités du projet seul : ni sous-projets, ni travail réel. `jour` au format AAAA-MM-JJ ; `charge` en jours, nombre à 2 décimales (conversion en SQL comme D-044 (5)) ; `surcharge` booléen.
- Lignes triées par `element_id`, `assignation_id`, `jour` ; avant tout calcul : `lignes` [].
- Droits et refus comme `GET …/gantt` : lecture du projet, modèles compris ; 401 sans session ; 404 projet inconnu, illisible, identifiant mal formé ou hors plage. La route n'écrit rien.

**Affichage (lot 3b, D-066)**

1. Onglet « Gantt » de la fiche projet, entre Planning et Affectations ; adresse `?onglet=gantt&zoom=jour|semaine|mois` (semaine par défaut, valeur inconnue = défaut), conservée au rechargement.
2. Tableau à gauche : WBS, Nom indenté, Mode, Début, Fin, Charge, Avancement, Drapeaux ; SVG à droite, défilement horizontal, lignes de 32 px. Dates JJ/MM/AAAA ; charge et avancement à la virgule décimale, avancement suivi de « % » ; « — » si vide.
3. Échelle : 24, 8, 4 px par jour (jour, semaine, mois).
4. Plage : du lundi de la semaine du plus petit jour connu (début du projet, dates planifiées et validées des éléments, dates planifiées des sous-projets) au dimanche de la semaine du plus grand, plus 14 jours ; le plus grand jour vaut au moins le début + 27 jours ; la date du jour n'étend pas la plage.
5. Barres : feuille en accent avec part d'avancement ; parent et sous-projet en barre fine grise ; jalon en losange ; activité close grise ; pas de barre sans date planifiée.
6. Drapeaux : `retard` = barre en couleur flag ; `debut_non_respecte` = trait flag du début validé au début planifié ; `dependance_non_respectee` = lien flag ; `surcharge` = badge seul (jour rouge en 3g). Un badge par drapeau dans le tableau : « Retard », « Début non respecté », « Surcharge », « Dépendance non respectée ». Le jour rouge de `surcharge` est décrit à Édition point 14 (3g, D-114).
7. Liens à angles droits avec flèche : FD fin → début, DD début → début, FF fin → fin.
8. Trait du jour à la date du navigateur, absent hors plage ; samedis et dimanches teintés au zoom jour.
9. Aucune date planifiée dans le projet : bandeau « Planning non calculé » (role=status), tableau affiché, aucune barre ; projet sans élément : état vide.
10. Libellés des modes (Gantt seulement) : ASAP « Dès que possible », START « Pas avant le », STARR « Doit commencer le », ALAP « Finit avant le », FDUR « Durée fixe », DDUR « Piloté par la durée », REGUL « Régulier entre 2 dates », MAN « Planning manuel ».
11. Sous-projets : lignes de synthèse après les éléments, nom = lien vers leur fiche.
12. Accessibilité : nom accessible de barre « <nom>, du JJ/MM/AAAA au JJ/MM/AAAA » suivi de « , <drapeau> » par drapeau (libellés du point 6 en minuscules) ; jalon « <nom>, le JJ/MM/AAAA » ; les deux zones à défilement (tableau, SVG) sont focalisables (`tabIndex=0`, `role="region"`, `aria-label` « Tableau du Gantt » et « Calendrier du Gantt », anneau de focus de `docs/ui.md`) ; sont focalisables dans le Gantt, dans cet ordre : boutons de zoom, zone du tableau, liens de sous-projets (point 11), zone du SVG ; barres et jalons ne le sont pas ; le clavier fait défiler une zone focalisée (flèches droite et gauche) (D-070). Case « Initiales » juste après le bouton « Mois » dans l'ordre de focus (D-091). Séparateur « Largeur du tableau » entre la zone du tableau (et ses liens) et la zone du SVG (D-213).
13. Rôle : chaque barre et chaque jalon du SVG porte `role="img"` et son nom accessible en `aria-label` (D-067) ; la barre de synthèse d'un sous-projet se repère par `data-projet-id` (D-067).
14. Nom accessible d'un jalon en retard : « <nom>, le JJ/MM/AAAA, retard », comme pour les barres d'activité (D-068).
15. Largeurs (D-069) : (valeurs révisées par D-086, en fin de point) colonne Drapeaux fixée à droite du tableau (`sticky`), badges sur une seule ligne, largeur de colonne au plus 144 px (Retard 53 + Surcharge 71 + écart 4 + marges 16), hauteur de ligne inchangée. Critère d'acceptation, à 1440 et à 1024 px de large : (a) chaque badge de la colonne Drapeaux est entièrement dans la zone visible, sans défilement ; (b) les colonnes WBS et Nom sont entièrement visibles sans défilement et non recouvertes par la colonne Drapeaux, y compris avec un nom de 60 caractères, dont à un niveau WBS 4 (troncature par ellipsis et `title` si besoin) ; (c) la page ne défile pas en horizontal (`scrollWidth <= clientWidth` sur `documentElement`) ; (d) la hauteur d'une ligne à badges est égale à celle d'une ligne sans badge. Hypothèse : une activité émet au plus 2 drapeaux (5.9 ; max structurel de `drapeauxDuree`, retard + surcharge), 1 observé en pratique ; si elle cesse d'être vraie, la largeur de la colonne Drapeaux est à revoir. Troncature de Nom : contenu en `block max-w-64 truncate` avec `title` égal au nom (cellule de 272 px, au plus 293 px disponibles à 1024 px : 499 − 144 − 62) ; à 1440 px les autres colonnes peuvent défiler avec un nom long (accepté) ; limite connue : l'indentation grignote le texte aux niveaux WBS profonds. Révision (D-086) : mesures refaites avec DejaVu Sans (police de repli de la CI et de la VM) ; colonne Drapeaux au plus 176 px (`max-w-44` ; « Début non respecté » 151,6 px, Retard + Surcharge 155 px, plus 16 px de marges = 171 px) ; contenu de Nom en `max-w-56` (cellule de 240 px, 261 px disponibles à 1024 px : 499 − 176 − 62) ; mêmes valeurs sur le Gantt de l'Accueil. Largeur du tableau réglable, défilement vertical commun et colonnes au choix : voir « Colonnes et défilement (gantt-colonnes, D-212) ».
16. Largeur du SVG (D-069) : au moins celle de son conteneur ; si la plage (point 4, inchangée) est plus courte, elle est prolongée à l'affichage par semaines entières ajoutées à droite, en-têtes et week-ends compris ; positions, largeurs et attributs `data-*` des barres et des liens inchangés.
17. Modes (REX-3a, D-123 (5), (7)) : une table unique de libellés et d'aides, partagée par le Gantt et les formulaires, remplace les libellés du point 10 ; champ « Mode de planification » dans le dialogue de modification d'une activité (valeur = code), colonne « Planification » du tableau du Gantt (colonne « Mode » renommée). Libellé et aide : ASAP « Dès que possible » : « Démarre au plus tôt, selon les dépendances et la disponibilité des ressources. » ; START « Pas avant une date » : « Démarre au plus tôt à partir de la date de début saisie, jamais avant. » ; STARR « Démarrage imposé » : « Démarre à la date de début saisie, en priorité sur les autres activités ; signalée « Début non respecté » si c'est impossible. » ; ALAP « Fin visée » : « Planifiée à rebours pour finir à la date de fin saisie ; si elle ne tient pas, dès que possible. » ; FDUR « Durée fixe » : « Dure le nombre de jours saisi, selon la disponibilité ; ce qui ne tient pas passe après, avec « Retard ». » ; DDUR « Durée imposée » : « Dure exactement le nombre de jours saisi, même au-delà de la disponibilité (« Surcharge »). » ; REGUL « Régulier entre deux dates » : « Charge répartie également sur chaque jour ouvré entre les dates de début et de fin saisies. » ; MAN « Planning manuel » : « Charge saisie à la main, par ressource et par demi-journée. » L'aide est affichée sous la liste selon le mode choisi (`aria-describedby`).
18. Sous-projet (REX-3a, D-123 (7)) : dans le Gantt du projet, la colonne Planification d'une ligne de sous-projet affiche le badge « Sous-projet » au lieu de « — » ; le nom affiché est « <code> · <nom> », le lien est inchangé.

### Calcul (lot 3c, D-074)

1. Découpage : 3c-I (API) puis 3c-E (écran). Le contrat de `POST /api/calcul` (D-044) ne change pas, hors le point 2 et le point 3.
2. Verrou : l'attente du verrou consultatif de calcul est bornée à 10 s (valeur injectable par `AppDeps` pour les tests). Délai dépassé : 409 { erreur: 'Un calcul est déjà en cours' }, rien n'est écrit, aucun verrou ne reste.
3. Identifiants : un identifiant de projet hors plage entier (> 2147483647) dans le corps répond 400.
4. Bouton « Calculer » : dans l'onglet Gantt de la fiche, à côté des boutons de zoom, et dans le bandeau « Planning non calculé ». Visible seulement si `peut_ecrire` est vrai et si le projet n'est pas un modèle ; une ressource ne le voit jamais.
5. Dialogue « Calculer le planning » : cases à cocher des projets racines où l'utilisateur écrit, hors modèles et hors projets clos, triés par code, libellé « <code> — <nom> ». Le projet courant est coché ; si c'est un sous-projet, sa racine est cochée. « Projets racines où l'utilisateur écrit » s'entend « racines d'écriture » (3g, D-114 (8) : Édition point 14). Boutons « Tout cocher » et « Tout décocher ». Champ « Date de début du calcul » (date, obligatoire, prérempli à la date du navigateur, envoyé dans `d0`). Bouton « Calculer », inactif si aucune case n'est cochée ; « Annuler ».
6. Le dialogue est un composant autonome (projets précochés en paramètre), réutilisé sur l'écran Accueil dans une tranche ultérieure ; rien sur Accueil en 3c.
7. Succès : le dialogue se ferme, le Gantt est rechargé, notification « Planning calculé. ». Si la réponse porte des avertissements `reste_non_pose` : notification d'avertissement listant, par ligne, « <activité> — <ressource> : <reste> j non posé » (virgule décimale).
8. Refus affichés dans le dialogue, laissé ouvert, `role="alert"` : 422 `cycle_dependances` « Calcul impossible : cycle de dépendances entre <noms>. » ; 422 `entree_invalide` « Calcul impossible : données incomplètes sur <noms>. » ; 409 « Un calcul est déjà en cours. Réessayez dans un instant. » ; autre « Calcul impossible pour le moment. Réessayez. ». Les noms sont ceux des éléments du projet affiché ; un identifiant d'un autre projet s'affiche « élément <id> ».
9. Recalcul automatique : reporté à 3d. En 3c, le calcul n'est déclenché que par le bouton ; aucune modification de l'onglet Planning ne le déclenche.
10. Séparateur (D-075) : quand un refus cite plusieurs noms, ils sont séparés par « , » simple, sans « et ».
11. Avertissements (D-075) : les noms d'activité et de ressource sont résolus côté écran, pour tous les projets calculés, par les routes de lecture existantes ; une assignation introuvable s'affiche « assignation <id> ». Le délai du verrou (point 2) est `AppDeps.delaiVerrouCalcul`, en millisecondes, défaut 10000.

### Accueil : Gantt global (D-080)

1. Écran Accueil (`/`) : Gantt en lecture seule des projets ordinaires visibles et non clos. Modèles, projets clos et sous-projets clos sont absents. (supprimé par D-252 : plus de ligne « Connecté en tant que … » ; le nom de l'utilisateur reste dans le pied de la barre latérale). Aucune nouvelle route d'API : `GET /api/projets` pour les projets, `GET /api/projets/:id/gantt` pour les éléments d'un projet déplié. Toute la descendance d'un projet clos est masquée, même un sous-projet non clos (D-081) ; les racines s'obtiennent après ce filtre, par la règle D-079 (2). (modifié par D-265 : pour le chef de projet, tous les projets ordinaires non clos)
2. Arbre : racines et tri comme D-079 (2). Tout est déplié par défaut au chargement (D-218 (4)) : comme « Tout déplier », contenus chargés en parallèle ; « Tout replier » reste disponible ; le dépliage initial n'a lieu qu'une fois, un rechargement ultérieur conserve l'état choisi par l'utilisateur. Boutons « Déplier <nom> » / « Replier <nom> » (aria-expanded) et « Tout déplier » / « Tout replier » comme D-079 (3). Sous un projet déplié, ses éléments en ordre WBS puis ses sous-projets non clos, comme D-079 (4). Éléments chargés au premier dépliage ; « Tout déplier » charge en parallèle les projets non encore chargés. Messages « Aucune activité ni jalon. » et « Impossible de charger le contenu du projet. » comme D-079 (4).
3. Tableau de gauche, colonnes réduites : Code (code du projet, ou numéro WBS d'un élément) ; Nom (lien vers la fiche pour un projet ou un sous-projet ; texte pour un élément, avec un badge « Jalon » pour un jalon ; indentation selon la profondeur, troncature comme 3b point 15) ; Début et Fin (dates planifiées au format JJ/MM/AAAA, « — » si absentes) ; Drapeaux (badges de 3b point 6 sur les lignes d'éléments, vide sur les lignes de projet). Lignes de 32 px alignées sur le SVG.
4. SVG à droite : zoom jour, semaine ou mois dans l'adresse `/?zoom=jour|semaine|mois` (semaine par défaut, valeur inconnue = défaut), conservé au rechargement. Échelle, week-ends, trait du jour et largeur minimale comme 3b points 3, 8 et 16.
5. Barres : un projet ou un sous-projet a une barre de synthèse fine grise de `debut_planifie` à `fin_planifiee`, avec `role="img"`, `data-projet-id` et un nom accessible « <nom>, du JJ/MM/AAAA au JJ/MM/AAAA ». Pas de barre sans dates planifiées. Les éléments dépliés suivent 3b points 5, 6, 7, 12 (noms accessibles), 13 et 14. Les liens sont ceux du projet déplié.
6. Plage : règle de 3b point 4, appliquée à la date de début et aux dates planifiées des projets affichés, puis, après un dépliage, aux dates planifiées et validées des éléments chargés. La plage s'élargit au dépliage et ne se réduit pas au repli.
7. Aucun projet visible : état vide « Aucun projet à afficher. ». Projets visibles mais aucune date planifiée : bandeau « Planning non calculé » (role=status), tableau affiché, aucune barre.
8. Bouton « Calculer », à côté des boutons de zoom : visible seulement si au moins un projet affiché a `peut_ecrire` ; une ressource ne le voit jamais. Il ouvre le dialogue de 3c point 5 avec tous les projets proposés cochés et la date préremplie à la date du navigateur. Succès : dialogue fermé, Accueil rechargé (projets, puis éléments des projets dépliés, repli conservé), notifications comme 3c points 7 et 11. Refus comme 3c points 8 et 10 ; les noms sont résolus parmi les éléments chargés, sinon « élément <id> ».
9. Accessibilité : les zones du tableau et du SVG sont focalisables comme 3b point 12, avec les aria-label « Tableau du Gantt global » et « Calendrier du Gantt global ». Ordre de focus : boutons de zoom, « Calculer », « Tout déplier », zone du tableau (boutons Déplier et liens compris), zone du SVG. Case « Initiales » juste après le bouton « Mois » dans l'ordre de focus (D-091). Séparateur « Largeur du tableau » entre la zone du tableau et la zone du SVG (D-213).
10. Découpage : G1 refactor des composants du Gantt de 3b sans changement de comportement (les tests de 3b restent inchangés et verts) ; G2 Accueil replié (points 1, 3 à 7, 9) ; G3 dépliage (point 2 et barres d'éléments) ; G4 calcul (point 8) et extension de l'e2e de parcours complet.
11. Hors périmètre de cette sous-section (backlog) : colonnes ajoutables au tableau de l'Accueil ; dépendances entre projets (SPEC §3 inchangée). Colonnes ajoutables : traitées par D-212 (« Colonnes et défilement (gantt-colonnes, D-212) »).

### Accueil : planning d'une ressource (lot 6e, D-157)

1. Portée : un seul cycle, tag `tests-lot6e`. Le moteur ne change pas. Aucune écriture. Reste au backlog : jours en surcharge sur l'Accueil (D-114) ; charge vendue et date client sur l'Accueil (D-149 (8)).
2. Route `GET /api/ressources/:id/planning`, en lecture seule. Sans session : 401. Rôle ressource : 403 `{ erreur: 'Interdit' }`, après le 401 (comme D-148 (2)). Utilisateur inconnu, identifiant mal formé ou hors plage : 404. Utilisateur existant mais sans assignation retenue : 200, `lignes` vide.
3. Réponse 200 : `{ ressource: { id, nom, actif }, lignes: [{ assignation_id, projet: { id, code, nom } | null, activite: { id, nom, wbs } | null, debut_planifie, fin_planifiee, charge_assignee, charge_reelle, reste_a_faire, drapeaux }] }`. Les drapeaux sont ceux de l'activité ; les dates sont null avant calcul. La charge vendue n'est jamais renvoyée (D-148 (6)).
4. Assignations retenues : même filtre que Mes tâches (D-148 (3) et (10)). Seulement les activités ouvertes de projets ordinaires ouverts ; aucune activité ancêtre close, aucun projet ancêtre clos. Tri : début planifié (null en dernier), puis code du projet sans tenir compte de la casse, puis numéro WBS ; une ligne masquée se range par sa date, puis par `assignation_id`.
5. Lignes masquées : un chef de projet voit toutes les ressources. Pour une assignation d'un projet qu'il ne peut pas lire, `projet` et `activite` valent null et `drapeaux` vaut `[]` ; les dates et les charges sont gardées, pour montrer l'occupation. L'administrateur voit tout. (modifié par D-265 : plus de ligne masquée pour le chef de projet ni pour le leader métier, qui lisent tous les projets)
6. Accueil, administrateur et chef de projet seulement (le rôle ressource n'a pas d'Accueil, D-148 (5)). Liste « Planning de », placée avant les boutons de zoom. Premier choix : « Tous les projets » (par défaut, comportement actuel inchangé). Ensuite : les utilisateurs actifs et `est_ressource` de l'annuaire, triés par nom sans tenir compte de la casse ; l'annuaire ne change pas. Adresse `/?ressource=<id>`, le zoom est conservé. Une valeur absente ou invalide, ou une ressource absente de la liste, revient à « Tous les projets », et l'adresse est corrigée sans rechargement.
7. Vue d'une ressource : boutons visibles, zoom seulement ; « Calculer », « Tout déplier » et la case « Initiales » sont masqués. Lecture seule.
8. Tableau, colonnes : Projet (le code, en lien vers la fiche ; « Autre projet » pour une ligne masquée) ; Activité (« <wbs> <nom> », ou « — » pour une ligne masquée) ; Début et Fin (JJ/MM/AAAA, « — » si absentes) ; Assigné, Réel, Reste ; Drapeaux (badges de 3b point 6).
9. (modifié par D-276 : jours d'absence en journée entière grisés, §4 « Absences et charge depuis le taux » point 10) SVG : une barre de couleur accent par ligne, du début planifié à la fin planifiée ; une ligne masquée a une barre grise ; pas de barre sans date. Nom accessible de la barre : « <code> · <wbs> <nom>, du JJ/MM/AAAA au JJ/MM/AAAA », suivi des drapeaux comme 3b point 12 ; pour une ligne masquée : « Autre projet, du … au … ». Plage : règle de 3b point 4, appliquée aux dates des lignes.
10. États : aucune ligne, « Aucune tâche pour cette ressource. » ; des lignes mais aucune date, bandeau « Planning non calculé » (role=status) ; échec du chargement, « Impossible de charger le planning de la ressource. ».
11. Accessibilité : zones focalisables avec les aria-label « Tableau du planning de la ressource » et « Calendrier du planning de la ressource ». Ordre de focus : liste « Planning de », boutons de zoom, zone du tableau (liens compris), zone du SVG. Séparateur « Largeur du tableau » entre la zone du tableau et la zone du SVG (D-213).
12. Parcours complet e2e étendu : choisir la ressource dans « Planning de », vérifier sa barre, puis le retour à « Tous les projets ».

### Colonnes et défilement (gantt-colonnes, D-212)

1. Périmètre : les trois vues à deux zones (tableau à gauche, calendrier à droite) : Gantt d'un projet, Gantt global de l'Accueil, planning d'une ressource sur l'Accueil.
2. Séparateur (tranche 1) : poignée verticale entre le tableau et le calendrier ; `role="separator"`, `aria-orientation="vertical"`, `aria-label` « Largeur du tableau », `aria-valuenow` = largeur du tableau en pixels ; focalisable, anneau de focus de docs/ui.md. Souris : glisser. Clavier : flèches gauche et droite, 16 px par appui. Double-clic ou Entrée : largeur par défaut.
3. Largeur du tableau (tranche 1) : par défaut 40 % de la largeur de la vue, sans descendre sous la largeur qui satisfait 3b point 15 (a) et (b) (D-069 révisé par D-086), à 1440 et à 1024 px. Bornes : au moins 200 px, au plus 80 % de la vue. Le tableau garde son défilement horizontal propre quand ses colonnes dépassent sa largeur ; la colonne Drapeaux reste fixée à droite.
4. Défilement (tranche 1) : la hauteur de la vue est limitée à la fenêtre (de son bord haut au bas de la fenêtre, au moins 320 px) ; tableau et calendrier défilent verticalement ensemble, à la même position ; en-têtes du tableau et du calendrier figés en haut ; la barre de défilement horizontale du calendrier reste visible en bas de la fenêtre, quel que soit le nombre de lignes. La page ne défile pas horizontalement (critère 3b point 15 (c) inchangé). Ordre de focus et zones focalisables de 3b point 12 et Accueil point 9 inchangés, sauf le séparateur du point 2, inséré entre la zone du tableau (et ses liens) et la zone du calendrier (D-213) ; une flèche haut ou bas dans l'une des zones fait défiler les deux. Gestes (barres, liens, poignées, glisser de ligne) inchangés.
5. Colonnes (tranche 2) : poignée au bord droit de chaque en-tête (`role="separator"`, `aria-label` « Largeur de la colonne <en-tête> », flèches 16 px, double-clic ou Entrée = largeur par défaut), minimum 48 px, 120 px pour Nom ; troncature et `title` inchangés. Bouton « Colonnes » après les boutons de zoom (et après la case « Initiales » là où elle existe) : menu déroulant à cases à cocher (pas un dialogue : aucune garde, audit des dialogues inchangé), ordre fixe. Toujours affichées : WBS et Nom (Gantt d'un projet, planning d'une ressource) ; Code et Nom (Accueil). Gantt d'un projet : Planification, Début, Fin, Ressources, Charge, Avancement, Vendu et Marge (si `peut_ecrire`), Drapeaux. Accueil : Début, Fin, Ressources, Drapeaux, plus Charge, Avancement, Réel, Vendu, Marge ; valeurs sur les lignes d'activités et de jalons seulement (Vendu et Marge si `peut_ecrire` sur leur projet), lignes de projet vides ; marge négative en couleur flag. Planning d'une ressource : colonnes existantes, choix au même modèle. Par défaut (D-227, révise D-212 (4) et D-216 (9) (a)) : Gantt d'un projet WBS, Nom, Début, Fin, Ressources ; Accueil Code, Nom, Début, Fin, Ressources (D-238 révise D-227) ; planning d'une ressource Projet, Activité, Début, Fin ; toutes les autres colonnes, Drapeaux comprise, décochées par défaut et proposées au menu dans l'ordre fixe ; un choix enregistré dans le navigateur prime ; une clé `ressources` absente du choix enregistré vaut le défaut (cochée, D-238). Dernier élément du menu : « Rétablir l'affichage par défaut » (colonnes, largeurs et séparateur). Ordre non modifiable ; pas de lien partageable.
6. Mémorisation (tranche 1 pour le séparateur, tranche 2 pour le reste) : stockage du navigateur, une clé par vue (Gantt de projet, commune à tous les projets ; Accueil ; planning d'une ressource), sans API ni migration. Stockage indisponible ou valeur illisible : valeurs par défaut, aucune erreur affichée ; identifiant de colonne inconnu ignoré.
7. Apparence : @ui-designer, captures à 1440 et 1024 px, docs/ui.md mis à jour.
8. Découpage : tranche 1 = points 2, 3, 4 et 6 pour le séparateur (sous-lot gantt-colonnes-1) ; tranche 2 = points 5 et 6 pour le reste (sous-lot gantt-colonnes-2) ; une clôture et une suite complète par tranche.
9. Précisions de la tranche 2 (D-216) : (a) planning d'une ressource : toujours affichées Projet et Activité (au lieu de WBS et Nom du point 5) ; au choix : Début, Fin, Assigné, Réel, Reste, Drapeaux. (b) Menu `@radix-ui/react-dropdown-menu`, éléments à case à cocher ; le menu reste ouvert après un cochage ; Échap ou clic hors du menu le ferme, focus rendu au bouton ; nom accessible du bouton « Colonnes ». (c) Ordre de focus : bouton « Colonnes » après les boutons de zoom, ou après la case « Initiales » là où elle existe ; poignées de largeur dans la zone du tableau, dans l'ordre des en-têtes, avant le contenu des lignes. Un glisser de poignée qui revient à son point de départ laisse la largeur enregistrée, sans largeur intermédiaire affichée (D-218 (8)). (d) Colonne masquée : en-tête et cellules absents du DOM ; Drapeaux masquable, fixée à droite quand elle est affichée ; critère 3b point 15 (a) et (b) vérifié avec les colonnes et la largeur par défaut. (e) La largeur réglée d'une colonne est gardée quand elle est masquée puis réaffichée. (f) Accueil, colonnes ajoutées : valeurs lues dans les éléments déjà chargés par GET …/gantt (charge_assignee, avancement, charge_reelle, charge_vendue, marge), aucune route nouvelle ; lignes de projet vides ; formats de 3b point 2 et de « Charge vendue et date client ». (g) Ordre du menu = ordre des colonnes à l'écran ; Gantt d'un projet : ordre actuel (Vendu et Marge après Charge), Ressources juste après Fin (D-238) ; Accueil : Code, Nom, Début, Fin, Ressources, Charge, Avancement, Réel, Vendu, Marge, Drapeaux (D-218 (7), révise D-216 (7)) ; planning d'une ressource : ordre actuel.
10. (modifié par D-270) Colonne « Notes » au choix, décochée par défaut, avant « Drapeaux », dans le Gantt d'un projet et dans le Gantt global de l'Accueil : voir « Notes d'activité (notes, D-270) » (§3), point 7.

### Colonne Ressources (colonne-ressources, D-238)

1. Colonne « Ressources » (id `ressources`), au choix, dans le Gantt d'un projet et dans le Gantt global de l'Accueil, placée juste après « Fin » (colonnes et menu). Absente du planning d'une ressource.
2. Contenu, lignes d'activité feuille seulement : un élément par assignation, dans l'ordre de l'API (`assignations`, §6 « Lecture »), séparés par « , ». Texte : initiales de la ressource, ou son nom si elle n'a pas d'initiales. Feuille sans assignation, activité parente, jalon, ligne de projet ou de sous-projet : cellule vide. Cellule tronquée par ellipsis.
3. Infobulle (`title`) de chaque élément : « <nom> — <charge> j », charge au format de la colonne Charge (`formaterNombre` : « 5 », « 2,5 »).
4. Si `peut_ecrire` sur le projet de la ligne : chaque élément est un bouton (apparence de lien), de nom accessible « Modifier l'assignation de <nom> à <nom de l'activité> » (libellé du Planning). Il ouvre le dialogue « Modifier l'assignation » du Planning (même titre, même description, charge et taux préremplis). Sinon : texte avec infobulle, aucun bouton.
5. Après enregistrement : Gantt d'un projet, comme un dialogue ouvert depuis le Gantt (3d : Gantt rechargé, bandeau « Planning à recalculer », recalcul automatique si la case est cochée) ; Accueil, rechargement de l'écran comme au point 18. Refus : dialogue ouvert (comportement actuel). Garde des dialogues inchangée (D-188).
6. Ordre de focus : boutons dans la zone du tableau, dans l'ordre des lignes puis des éléments. Barre active, gestes et annonce du Gantt inchangés.
7. Largeur par défaut 96 px, minimum 48 px. Critère 3b point 15 (a) à (c) vérifié à 1440 et 1024 px avec les nouvelles colonnes par défaut, dans les deux vues. S'il ne tient pas : s'arrêter et proposer 2 options. Toutes colonnes cochées, Ressources comprise, le tableau peut défiler horizontalement dans sa zone (« Colonnes et défilement » point 3) ; la page ne défile pas horizontalement (3b point 15 (c) inchangé).

### Édition (lot 3d, D-088)

1. Découpage : 3d-1 initiales ; 3d-2 API des gestes ; 3d-3 écran des gestes ; 3d-4 recalcul automatique et extension de l'e2e de parcours complet. 3d-3 découpé en 3d-3a (souris) et 3d-3b (clavier, double-clic, dialogue) (D-094).
2. Initiales (3d-1) : `GET /api/projets/:id/gantt` ajoute à chaque activité feuille `initiales` (liste des initiales de ses ressources assignées, ordre des assignations par id ; ressource sans initiales omise ; feuille sans assignation : `[]`) ; parents et jalons sans ce champ. L'annuaire est inchangé (précise D-077 (9)). Affichage : texte gris petit à droite de la barre, « AB, CD » ; nom accessible de la barre inchangé ; texte coupé au bord droit du SVG accepté ; pas de texte sans barre. Case « Initiales » à côté des boutons de zoom, décochée par défaut sur le Gantt d'un projet, état dans l'adresse (`initiales=1`) ; sur l'Accueil, cochée par défaut (sans paramètre `initiales`) et la décocher met `initiales=0` dans l'adresse (D-218 (4)), conservé au rechargement et au changement de zoom (le zoom est aussi conservé au changement de la case). Même case sur l'Accueil, appliquée aux éléments dépliés. Écart de 6 px entre la fin de la barre et le texte (D-089).
3. API des gestes (3d-2) : les PATCH d'activité, de jalon, de dépendance et d'assignation lisent et écrivent dans une même transaction, ligne verrouillée (FOR UPDATE) ; vérifier que les PATCH existants couvrent tous les gestes du tableau ci-dessus.
4. Gestes (3d-3) : table ci-dessus ; zooms jour et semaine, pas d'un jour ; zoom mois en lecture seule à la souris ; non déplaçables : ASAP, MAN, jalons, parents, activités closes, projet non modifiable ; PATCH au relâcher ; durées FDUR et DDUR en jours ouvrés du calendrier par défaut ; après un geste sans recalcul : contour à la date validée et bandeau « Planning à recalculer » (état côté client).
5. Clavier (3d-3) : zone du SVG, un seul arrêt de tabulation ; ↑ et ↓ choisissent la barre (activités et jalons, ordre des lignes), barre active avec anneau de focus et annoncée par `aria-activedescendant` ; ← et → font défiler (D-070) ; Échap désélectionne ; Entrée ou double-clic ouvre le dialogue existant « Modifier l'activité » ou « Modifier le jalon » (`FormulairesEdition.tsx`), seulement si le projet est modifiable ; après enregistrement, même effet qu'un geste ; dialogue disponible à tous les zooms. Hors 3d : Alt + flèches (séance UX). `aria-activedescendant` remplacé par une zone `aria-live` polite (D-098).
6. Erreurs d'un geste (3d-3) : pendant le PATCH, barre à la position relâchée, gestes sur cette barre bloqués ; refus : barre remise en place, alerte fermable `role="alert"` dans l'onglet Gantt, remplacée par la suivante : 400 « Modification refusée : dates invalides. » ; 422 selon `code` (D-083 (14)), sans code « Cette opération enfreint une règle du planning. » ; 403 ou 404 « Modification impossible : rechargez la page. » ; autre, réseau compris, « Modification impossible pour le moment. Réessayez. ». Refus dans le dialogue : comportement actuel, dialogue ouvert. Hors 3d : annuler un geste (Ctrl+Z). 422 `dates_incoherentes` : « Modification refusée : la fin validée précède le début validé. » ; `parent_clos`, `enfants_ouverts` : textes élément de D-083 (9) (D-094).
7. Recalcul automatique (3d-4) : case « Recalcul automatique » à côté de « Calculer », Gantt du projet seulement, décochée par défaut, préférence unique en localStorage (lecture et écriture sous try/catch) ; visible aux mêmes conditions que « Calculer » ; absent de l'Accueil. Déclencheurs : toute modification réussie faite depuis le Gantt (geste, dialogue) ; l'onglet Planning ne déclenche rien (point de séance UX). Périmètre : le projet que le dialogue « Calculer » coche par défaut (D-074 (5)), d0 = date du navigateur. Succès : Gantt rechargé, contour et bandeau effacés, pas de notification « Planning calculé. », avertissements `reste_non_pose` comme 3c point 7. Refus : modification gardée, bandeau maintenu, alerte fermable avec les textes de 3c point 8. Jamais deux calculs en parallèle depuis la page : les gestes faits pendant un calcul déclenchent un seul calcul à la fin du calcul en cours.
8. Gestes à la souris, précisions (3d-3a, D-094) :
   - Date écrite : celle du bord de la barre au relâcher, soit la date planifiée plus le décalage d (en jours). START, STARR, FDUR, DDUR, corps : `debut_valide` = `debut_planifie` + d. FDUR, DDUR, poignée gauche : même effet, durée inchangée. ALAP, poignée droite : `fin_valide` = `fin_planifiee` + d. REGUL, poignée gauche : `debut_valide` = `debut_planifie` + d ; poignée droite : `fin_valide` = `fin_planifiee` + d ; corps : `debut_valide` + d et `fin_valide` + d (largeur de la fenêtre gardée). Le PATCH n'envoie que le champ du geste (les deux dates pour le corps REGUL).
   - Poignée droite FDUR et DDUR : `duree_validee` = nombre de jours travaillés du calendrier par défaut, fériés exclus, de `debut_planifie` à `fin_planifiee` + d, bornes incluses, minimum 1 (calendrier lu par GET /api/calendriers puis GET /api/calendriers/:id).
   - Bornes de l'écran : poignée gauche REGUL ≤ `fin_valide` ; poignée droite REGUL ≥ `debut_valide` ; poignée droite FDUR et DDUR ≥ 1 jour. Aucune autre : une date validée restée d'un autre mode peut donner le 422 `dates_incoherentes`.
   - API : la contrainte `activite_dates_coherentes` donne 422 { erreur: 'Règle de planning non respectée', code: 'dates_incoherentes' } ; les autres contraintes restent sans `code`. `texteRefusCode(err, 'element')` renvoie le texte du point 6, aussi dans le dialogue « Modifier l'activité » ; cible 'projet' : null.
   - Géométrie : glisser si la distance euclidienne depuis l'appui atteint 4 px, sinon clic et rien d'envoyé ; décalage = `Math.round(dx / px par jour)`, zéro positif ; décalage 0 : aucun PATCH. Poignées : zones de saisie de 6 px hors de la barre, collées à chaque bord, `aria-hidden`, à droite seulement pour ALAP, des deux côtés pour FDUR, DDUR et REGUL. Curseurs : `ew-resize` sur une poignée, `grab` sur un corps déplaçable, sinon défaut. Constantes dans `echelle.ts`.
   - Aucun geste sur : ASAP, MAN, jalon, parent, activité close, projet avec `peut_ecrire` faux, zoom mois, barre sans dates planifiées.
   - Après un succès : la barre pleine reste aux dates planifiées ; un contour pointillé de 1 px, couleur accent, à la position relâchée (`data-contour-element` = id, `aria-hidden`, `pointer-events` none), un seul par élément, remplacé par un nouveau geste ; l'élément local est mis à jour avec la réponse du PATCH, sans recharger le Gantt ; bandeau « Planning à recalculer » (`role="status"`) au-dessus du Gantt, avec le bouton « Calculer » aux conditions de 3c point 4. Contours et bandeau sont effacés après un calcul réussi et perdus au rechargement.
   - Pendant le PATCH : la barre reste à la position relâchée, les autres gestes sur cette barre sont ignorés. Refus : la barre revient en place, ni contour ni bandeau.
   - Contours et bandeau survivent au changement d'onglet de la fiche ; alerte avec un bouton « Fermer » (D-095).
   - Marge gauche de 8 px du conteneur du SVG, Gantt du projet (D-097).
9. Clavier et dialogue, précisions (3d-3b, D-098) :
   - Annonce : la zone garde `role="region"` ; une zone `aria-live="polite"` masquée visuellement (`data-annonce-gantt`) reçoit le nom accessible de la barre active ; Échap la vide.
   - Barres parcourues par ↑ et ↓ : lignes avec une barre ou un losange, dans l'ordre des lignes ; sans dates planifiées et sous-projets sautés. Sans barre active, ↓ prend la première, ↑ la dernière ; pas de bouclage. La barre active est amenée dans la zone visible ; anneau de focus (`data-anneau-element` = id). ← et → font défiler sans changer la barre active. Gantt non calculé : ↑ et ↓ sans effet.
   - Entrée ou double-clic sur toute barre parcourable (feuille, parent, close, ASAP, MAN, jalon) ouvre « Modifier l'activité » ou « Modifier le jalon », seulement si `peut_ecrire`. Après un enregistrement réussi : Gantt rechargé, bandeau « Planning à recalculer », pas de contour, contours existants gardés. À la fermeture (enregistrer ou annuler), le focus revient à la zone, sur la même barre active. Un refus laisse le dialogue ouvert.
   - Un clic simple (sous 4 px) sur une barre parcourable donne le focus à la zone et rend la barre active. Échap pendant un glisser l'annule (barre en place, aucun PATCH, barre active) ; hors glisser, Échap désélectionne.
   - Accueil inchangé : ni barre active, ni annonce, ni dialogue ; la zone ne fait que défiler.
10. Recalcul automatique, précisions (3d-4, D-101) :
   - Cocher la case alors que le bandeau « Planning à recalculer » est affiché lance un calcul tout de suite ; sans bandeau, cocher ne lance rien.
   - Déclencheurs, case cochée seulement : geste réussi, enregistrement réussi du dialogue ouvert depuis le Gantt, cochage avec bandeau. Rien ne se déclenche pour l’onglet Planning, un geste refusé ou un enregistrement refusé.
   - Calcul : POST /api/calcul { projets: [racine du projet affiché], d0: date du navigateur } ; racine = projet coché par défaut dans le dialogue de 3c (D-074 (5)).
   - Pendant le calcul : « Recalcul en cours… » (`role="status"`) remplace le bandeau ; bouton « Calculer » désactivé ; gestes et dialogue restent possibles, et un geste ou un enregistrement réussi met en file un seul calcul, lancé à la fin du calcul en cours quelle que soit son issue ; jamais deux calculs en vol depuis la page ; décocher laisse finir le calcul en cours et vide la file.
   - Succès : Gantt rechargé, barre active gardée, contours et bandeau effacés, pas de « Planning calculé. », avertissements comme 3c points 7 et 11.
   - Refus : modification gardée, contours et bandeau maintenus, alerte `role="alert"` fermable (celle des gestes, remplacée par la suivante) avec les textes de 3c points 8 et 10 ; un 403 relève du texte « autre ».
   - Préférence : clé localStorage `planersource.recalculAuto`, valeur '1' ou '0', lecture et écriture sous try/catch, illisible ou absente = décochée, unique pour tous les projets.
   - Case : juste après « Calculer » dans la barre d’outils et dans l’ordre de focus ; visible aux conditions de « Calculer » (3c point 4) ; absente de l’Accueil.
11. Liens (3e, D-104) :
   - Connecteur : cercle de rayon 4 px (`data-connecteur-element` = id, `aria-hidden`, curseur crosshair) sur chaque barre parcourable, à 8 px à droite du bord droit de la barre, ou de sa poignée droite si elle existe ; jalon : à 8 px à droite de la pointe du losange ; au centre de la ligne. Présent si `peut_ecrire` et au zoom jour ou semaine. Transparent au repos, visible au survol de la barre ou du connecteur et sur la barre active.
   - Glisser du connecteur (seuil de 4 px) : trait pointillé vers le pointeur (`data-lien-provisoire`), ligne cible surlignée (`data-cible-lien` = id). Cible : la ligne sous le pointeur, si c’est une barre parcourable autre que la source. Relâcher sur une cible : POST { predecesseur_id: source, successeur_id: cible, type: 'FD', delai: 0 }. Ailleurs : rien. Échap annule. Un seul geste à la fois sur la page.
   - Clic sur un lien (zone de 8 px, `data-lien-cible` = id) : dialogue « Modifier la dépendance », à tous les zooms, si `peut_ecrire` ; bouton « Supprimer » avec confirmation avant le DELETE.
   - Après une création, une modification ou une suppression réussie : Gantt rechargé, barre active gardée, bandeau « Planning à recalculer » sans contour, déclencheur du recalcul automatique.
   - Refus d’une création, alerte des gestes : 409 « Cette dépendance existe déjà. » ; 400 « Modification refusée : données invalides. » ; autres cas comme le point 6. Ni bandeau ni lien.
   - Liens et connecteurs hors tabulation ; équivalent clavier : onglet Planning. Accueil inchangé.

12. Arborescence (3f-1, D-108) :
   - API : pas de route nouvelle (POST /api/elements/:id/deplacer, D-041). 422 `{ erreur: 'Règle de planning non respectée', code: 'parent_assigne' }` (activité assignée comme parent) et `code: 'dependance_hierarchie'` (dépendance avec un ancêtre), pour toute route qui lève ces contraintes ; les autres contraintes restent sans `code`. Textes de `texteRefusCode(err, 'element')` : « Une activité avec des ressources assignées ne peut pas avoir d’enfant. » et « Une dépendance relie cet élément à l’une de ses activités parentes. » ; cible 'projet' : null.
   - Glisser une ligne du tableau du Gantt du projet : activités (feuilles, parentes, closes) et jalons, à tous les zooms, si `peut_ecrire` et hors modèle ; ni sous-projets ni Accueil. Poignée GripVertical au début de la cellule Nom (`data-poignee-ligne` = id, `aria-hidden`, hors tabulation, curseur grab) ; événements pointeur, seuil de 4 px, Échap annule, un seul geste à la fois sur la page (gestes du SVG compris).
   - Zone de lâcher : activité, tiers haut « avant », milieu « dans », bas « après » ; jalon, moitié haute « avant », basse « après ». « Avant » et « après » : frère précédent ou suivant de la cible (« après » une activité parente : après tout son sous-arbre) ; « dans » : dernier enfant, rang omis. Pendant le glisser : `data-ligne-source` sur la ligne source, `data-insertion-ligne` = id et `data-insertion` = avant | dans | apres sur la cible.
   - Cibles interdites, sans requête : la source, ses descendants, un sous-projet, hors du tableau, position identique. L’écran ne filtre pas les activités assignées ni closes : l’API décide.
   - Rang envoyé (position finale dans la fratrie d’arrivée) : « avant » = rang de la cible, « après » = rang de la cible + 1, moins 1 dans les deux cas si la source est dans la même fratrie et avant la cible ; « dans » : `{ parent_id }` seul.
   - Succès : Gantt rechargé, barre active gardée, bandeau « Planning à recalculer » sans contour, déclencheur du recalcul automatique. Refus : rien ne bouge, alerte des gestes (`texteRefusDeplacement` : 400 « Modification refusée : données invalides. », 422 selon `code` sinon « Cette opération enfreint une règle du planning. », autres cas comme `texteRefusGeste`), ni bandeau ni recalcul.
   - Équivalent clavier, onglet Planning : bouton « Déplacer <nom> » à côté de Monter et Descendre, dialogue « Déplacer <nom> » avec la liste « Activité parente » (« Racine du projet », puis les activités en ordre WBS « <wbs> <nom> », sans l’élément ni ses descendants ; parent actuel présélectionné) ; bouton « Déplacer » inactif tant que le parent n’a pas changé ; envoi `{ parent_id }` sans rang ; refus affiché dans le dialogue ouvert ; succès : dialogue fermé, liste rechargée.
13. Menu contextuel et Copier (3f-2, D-111) :
   - API : pas de route nouvelle (POST /api/projets/:id/activites et /jalons avec `parent_id` et `rang`, POST /api/projets/:id/copie).
   - Menu (`@radix-ui/react-context-menu`) : clic droit sur une ligne d'activité ou de jalon du tableau du Gantt du projet, ou sur sa barre ou son losange dans le SVG ; Maj+F10 ou touche Menu sur la barre active de la zone du SVG (menu placé sur la barre). Si `peut_ecrire`, hors modèle, à tous les zooms. Ni sur une ligne de sous-projet ni sur l'Accueil (menu du navigateur conservé). Échap ferme le menu, focus rendu à la zone d'origine.
   - Entrées, dans l'ordre : « Nouvelle activité » et « Nouveau jalon » (frère juste après la ligne : `{ parent_id: parent de la ligne, rang: rang de la ligne + 1 }`) ; « Nouvelle sous-activité » (activité seulement, dernier enfant : `{ parent_id: id de la ligne }`, sans rang). L'écran ne filtre ni les activités assignées ni les closes : l'API décide.
   - Dialogues de l'onglet Planning (mêmes titres, champ Nom). Succès : dialogue fermé, Gantt rechargé, barre active gardée, bandeau « Planning à recalculer » sans contour, déclencheur du recalcul automatique. Refus : texte dans le dialogue ouvert. Focus rendu à la zone d'origine.
   - « Copier » : bouton (icône Copy) dans la barre d'outils du Gantt du projet, juste après la case « Initiales » ; si `peut_ecrire`, projet seulement (pas un modèle, pas une ressource) ; ouvre le dialogue de copie (11.2), case « Enregistrer comme modèle » pour l'administrateur seul ; succès : navigation vers la copie. Un arrêt de tabulation de plus après « Initiales ».
14. Reprises (3g, D-114) :
   - Jours rouges (Gantt du projet seulement ; Accueil inchangé) : après chaque chargement du Gantt (premier chargement, rechargement après geste, dialogue, déplacement, menu, calcul, recalcul automatique), `GET /api/projets/:id/travail` seulement si au moins un élément porte `surcharge`, sinon aucun appel. Échec du GET : aucun jour rouge, aucune alerte, Gantt inchangé.
   - SVG : pour chaque activité feuille qui porte `surcharge` et a une barre, un rect par jour où l'une de ses lignes a `surcharge` vraie (union des assignations, sans doublon), à tous les zooms : x du jour, largeur = px par jour, y et hauteur de la barre, couleur flag, `data-surcharge-element` = id, `data-surcharge-jour` = AAAA-MM-JJ, `aria-hidden`, `pointer-events` none ; au-dessus de la barre, sous l'anneau et le contour ; un jour hors de la barre est dessiné quand même. Fonctions pures dans `gantt/surcharge.ts`.
   - Annonce : le nom accessible (`aria-label`) des barres est inchangé ; l'annonce de la barre active (`data-annonce-gantt`) est suivie de « , jours en surcharge : JJ/MM/AAAA, JJ/MM/AAAA » ; au-delà de 5 jours, les 5 premiers puis « et N autres » ; rien si aucun jour connu.
   - Racine d'écriture : projets proposés par le dialogue « Calculer » = `peut_ecrire`, ni modèle ni clos, dont le parent est absent de la liste, en lecture seule ou clos ; la racine d'un projet remonte tant que le parent est connu, `peut_ecrire`, ni modèle ni clos. Vaut pour le dialogue (fiche et Accueil) et pour le recalcul automatique. API inchangée : un chef qui calcule sa racine écrit les résultats des sous-projets d'un autre chef (§2) ; le chef d'un sous-projet le calcule seul, le travail planifié de la racine compte en travail externe et n'est pas réécrit.
15. Onglet Planning (REX-3a, D-123 (2), (3), (4)) : (2) Monter et Descendre : comportement inchangé ; après déplacement le focus revient sur le même bouton de la ligne déplacée (sur l'autre flèche s'il est désactivé), la ligne porte `data-deplacee` et un surlignage de 2 s, une zone `role="status"` annonce « <nom> est maintenant en position <wbs>. » ; (3) le bouton « Assigner une ressource à <nom> » est à la fin de la colonne Ressources, plus dans Actions ; (4) le nom d'une activité ou d'un jalon est un bouton (texte = nom, apparence de lien) qui ouvre le dialogue de modification si l'utilisateur écrit, texte simple sinon ; ordre des actions : Modifier, Planning manuel, Monter, Descendre, Déplacer, Ajouter une sous-activité, Supprimer ; noms accessibles des boutons inchangés.
16. Séance UX (REX-3b, D-123 (1), (6)) : annulation des gestes (bouton « Annuler », Ctrl+Z, pile de 20) et modification depuis l'Accueil et l'onglet Gantt, à cadrer et tester dans la tranche REX-3b.
17. Annulation des gestes (REX-3b, D-127 (3) à (5)) :
   - Pile propre au Gantt du projet, 20 gestes au plus (le 21e chasse le plus ancien), vidée au rechargement de la page. Empilés : barre déplacée ou étirée, lien créé ou supprimé par geste, ligne glissée ou déplacée (bouton « Déplacer » compris), à la souris comme au clavier. Non empilés : création et suppression par le menu, modifications faites par un dialogue.
   - Bouton « Annuler » (nom accessible exact, icône Undo2, `title` « Annuler (Ctrl+Z) ») dans la barre d'outils du Gantt du projet ; désactivé si la pile est vide ou si l'utilisateur n'écrit pas. Ctrl+Z et Cmd+Z : même effet ; ignorés si le focus est dans un champ (input, textarea, select, contenteditable) ou un dialogue ouvert, et pendant un geste ou un calcul (même verrou que les gestes) ; une annulation à la fois. Un geste qui enregistre dure jusqu'à la réponse de son enregistrement : pendant ce temps, Ctrl+Z, Cmd+Z et le bouton « Annuler » sont ignorés, et le bouton est désactivé (D-207).
   - Annulation = requête inverse avec les valeurs d'avant le geste (mêmes champs, null compris) ; lien supprimé : recréé (même type, même décalage, nouvel id) ; ligne : parent et rang d'avant. Succès : rechargement comme après un geste, recalcul automatique relancé s'il est coché, `role="status"` « Geste annulé. ». Refus ou erreur : `role="alert"` « Impossible d'annuler ce geste ; les annulations précédentes ne sont plus possibles. », pile vidée, bouton désactivé. Pas de rétablissement (Ctrl+Y) : hors périmètre.
   - Contour (D-129 (2)) : l'annulation d'un geste de barre remet le contour de l'élément dans l'état d'avant ce geste (gardé si la barre était déjà contournée, par un geste antérieur ou une modification depuis le dernier calcul ; retiré sinon) ; l'entrée de pile mémorise cet état.
18. Modification depuis l'Accueil et l'onglet Gantt (REX-3b, D-127 (6), revient sur D-079 (5) et (6), qui n'est pas réécrite) : dans le tableau de l'Accueil et du Gantt du projet, le nom d'une activité ou d'un jalon est un bouton (apparence de lien, nom accessible = le nom) qui ouvre le dialogue de modification de l'onglet Planning, si l'utilisateur écrit ce projet ; texte simple sinon. Projet (Accueil) et sous-projet (Gantt du projet) : nom = lien conservé, plus un bouton crayon « Modifier le projet <nom> » (dialogue de REX-2) si l'utilisateur écrit. Après enregistrement : rechargement de l'écran. Pas de gestes à la souris sur l'Accueil (inchangé). Ordres de tabulation et critères de largeur (D-069, D-086) : tests contredits révisés (D-031), critères inchangés (D-127 (7)).

### Retouches REX-6 (retouches-rex6, D-218)

1. Modèle (REX-6 point 1) : la date de début reste obligatoire (référence du décalage à la copie, §11.2). Au dialogue « Nouveau modèle », le champ « Date de début » est prérempli avec la date du jour du navigateur ; aide sous le champ : « Date de référence : à la copie, les dates du modèle sont décalées de l'écart entre cette date et la date de début du nouveau projet. »
2. Types de dépendance (point 4) : libellés « Fin → début (FD) », « Début → début (DD) », « Fin → fin (FF) » partout où un type est choisi ou affiché : dialogue de création et de modification d'une dépendance (onglet Planning), colonne « Type » du tableau des dépendances, dialogue d'un lien du Gantt. Aide sous la liste, selon le type choisi (`aria-describedby`) : FD « Le successeur commence après la fin du prédécesseur. » ; DD « Le successeur commence après le début du prédécesseur. » ; FF « Le successeur finit après la fin du prédécesseur. » Libellés et aides dans un seul module partagé ; codes de l'API inchangés.
3. Dialogue de modification d'une activité (point 8) : « Début planifié » et « Fin planifiée » en lecture seule (texte, pas de champ), au format JJ/MM/AAAA, « — » avant tout calcul, placés après les champs de dates validées ; valeurs à jour après un « Calculer » (lues à l'ouverture du dialogue).
4. Accueil (point 10) : voir Accueil point 2 (projets dépliés au chargement) et Édition point 2 (case « Initiales » cochée par défaut sur l'Accueil, `initiales=0` quand elle est décochée). Le Gantt d'un projet est inchangé.
5. Mes tâches (point 11) : la section « Mon calendrier » est supprimée. Le rôle ressource n'a plus d'écran de lecture de son calendrier ; les routes d'API ne changent pas.
6. Logo (D-175) : le logo « PlanerSource » de la barre latérale est un lien vers « / » (nom accessible « PlanerSource », sans le mot « Accueil » pour ne pas doubler l'entrée de menu « Accueil » ; amendé par la décision du porteur du 2026-11-24) ; la navigation passe par la garde de D-172 ; le rôle ressource arrive sur /mes-taches par la redirection existante.
7. Accueil, ordre fixe des colonnes (révise D-216 (7)) : Code, Nom, Début, Fin, Charge, Avancement, Réel, Vendu, Marge, Drapeaux.
8. Poignée de largeur : un glisser qui revient à son point de départ laisse la largeur enregistrée, sans largeur intermédiaire affichée (non bloquant de D-217 (4)).

### Charge lisible (charge-lisible, D-220)

1. Champs selon le mode (REX-6 point 6). Dialogues « Nouvelle activité » et « Modifier l'activité » d'une activité feuille (Planning, Gantt du projet, Accueil), même composant et même table mode → champs, mise à jour dès que le mode change :
   - Début validé : START, STARR, FDUR, DDUR, REGUL.
   - Fin validée : ALAP, REGUL.
   - Durée validée (jours ouvrés ; libellé « Durée validée (j) » et aides révisés au point 5) : ASAP, START, STARR, ALAP, FDUR, DDUR. Pour ASAP, START, STARR et ALAP, aide sous le champ (`aria-describedby`) : « Utilisée seulement sans ressource assignée : longueur de la barre. »
   - MAN : aucun des trois champs.
   - Un champ masqué n'est pas envoyé à l'API ; sa valeur reste en base et réapparaît si le mode y revient. Les règles de validation des champs visibles sont inchangées. Garde de fermeture (D-188) : un champ masqué ne compte pas comme modifié.
   - Création : « Mode de planification » (ASAP par défaut) et les trois champs selon le mode ; durée par défaut : celle de l'API (1 pour FDUR et DDUR), sans valeur calculée côté web ; ni « Charge assignée » ni « Marge » (aucune assignation) ; parent et dépendances à la création : lot saisie-activites.
2. Charge et marge (REX-6 point 6), modification d'une activité feuille : « Charge assignée (somme des ressources) » en lecture seule (texte, pas de champ), format « X j » à virgule décimale ; « Marge » en lecture seule à côté de « Charge vendue (j) », pour qui écrit sur le projet seulement : « — » si la charge vendue est vide, couleur flag si négative (comme sur l'Accueil). Valeurs lues dans l'API (`charge_assignee`, `marge`, D-220 (6)), sans calcul côté web, à l'ouverture du dialogue.
3. Aides des taux (REX-6 point 7), sous « Taux (%) » (`aria-describedby`), textes dans un module partagé : assignation (dialogues « Assigner » et « Modifier l'assignation ») : « Plafond par jour sur cette activité : taux × capacité de la ressource. » ; affectation au projet (création et modification) : « Plafond par semaine sur ce projet : taux × capacité × jours ouvrés. »
4. Guide utilisateur : `docs/guide-utilisateur.md` (rôles, projets, activités et modes, charges et taux, calcul, imputations et validation, plan de charge, Gantt) ; chaque règle y est reprise de la présente spec avec son renvoi §, sans règle nouvelle.
5. Unités et aides (retours-deploiement-2, D-235 (A) ; complète et remplace les libellés et l'aide du point 1) :
   - Libellés : « Durée validée (j) », « Charge vendue (j) », « Charge assignée (j) » (dialogues d'assignation du Planning et des formulaires d'édition), « Délai (j) » (dépendances : Planning, formulaires d'édition, section Prédécesseurs et Successeurs du dialogue d'une activité), « Total du mois (j) » (Planning manuel). Aucun libellé « (jours) » ni « (jours ouvrés) ».
   - Aides d'une ligne sous le champ, reliées par `aria-describedby` :
     - Durée validée, modes FDUR et DDUR : « Effet sur le planning : oui (jours ouvrés). »
     - Durée validée, modes ASAP, START, STARR, ALAP : « Effet sur le planning : seulement sans ressource assignée (longueur de la barre, jours ouvrés). » (remplace l'aide du point 1)
     - Charge vendue : « Effet sur le planning : non (sert à la marge). »
     - Charge assignée, champ modifiable des assignations : « Effet sur le planning : oui. »
     - Délai d'une dépendance : « Effet sur le planning : oui (jours ouvrés). »
   - Champs en lecture seule (charge assignée et marge du dialogue d'une activité) : sans aide. Aucun champ grisé selon le mode : la charge vendue ne dépend d'aucun mode.
6. Empilement des dialogues (retours-deploiement-2, D-235 (B)) : un dialogue et son voile passent au-dessus de tout le contenu de la page, y compris l'en-tête collant des colonnes du Gantt d'un projet et de l'Accueil ; aucun champ du dialogue n'est masqué par le Gantt.

### Saisie des activités (saisie-activites, D-222)

1. Activité parente (REX-6 point 2). Dialogues « Nouvelle activité », « Modifier l'activité », « Nouveau jalon » et « Modifier le jalon » (Planning, Gantt du projet, Accueil) : champ « Activité parente ».
   - Liste : « Aucune (racine) », puis les activités du projet en ordre WBS, libellé « <WBS> <nom> », sans l'élément lui-même ni ses descendants. « Ajouter une sous-activité » préremplit le parent.
   - Création : `parent_id` dans le POST existant ; l'élément est placé en dernier dans sa fratrie.
   - Modification : si le parent change, `POST /api/elements/:id/deplacer` (position en dernier dans la nouvelle fratrie) est appelé avant le PATCH des champs. Déplacement refusé (`parent_assigne`, `dependance_hierarchie`, MAN à saisies, etc.) : rien n'est enregistré ; le texte de refus du glisser de ligne (§6, Édition, point 12) s'affiche dans le dialogue (`role="alert"`), qui reste ouvert. PATCH refusé après un déplacement réussi : message qui dit que le déplacement est fait et que les champs ne sont pas enregistrés.
   - Aucune route ni migration nouvelle.
2. Dépendances (REX-6 point 3), dialogue « Modifier l'activité » d'une activité feuille ou parente : sous-sections « Prédécesseurs » et « Successeurs », modifiables : ajout (élément, type, délai), modification du type et du délai, suppression.
   - Chaque action est enregistrée tout de suite par les routes existantes ; « Enregistrer » ne porte que sur les champs de l'activité.
   - Mêmes contrôles, confirmations, libellés et aides (§6, Retouches REX-6, point 2) que la section Dépendances de l'onglet Planning.
   - Éléments proposés : activités et jalons du même projet, sauf l'activité, ses ancêtres et ses descendants (§3).
   - Refus (doublon, cycle, hiérarchie) : message dans le dialogue (`role="alert"`), liste inchangée, dialogue ouvert.
   - Garde de fermeture (D-188) : un ajout saisi mais non envoyé compte comme une modification.
   - La section Dépendances de l'onglet Planning et les liens du Gantt sont à jour après la fermeture du dialogue.
   - Ni dans le dialogue de création (l'activité n'a pas d'identifiant), ni dans celui d'un jalon (hors lot).
3. Activité parente : « Mode de planification », « Début validé », « Fin validée » et « Durée validée » sont masqués et non envoyés ; leurs valeurs restent en base (§5.6). « Début planifié » et « Fin planifiée » restent en lecture seule.
4. Guide utilisateur : section « Activités et modes » de `docs/guide-utilisateur.md`, règles reprises de la présente section avec leur renvoi §.

## 7. Imputations

- Feuille de temps hebdomadaire par ressource : une ligne par assignation ouverte, une colonne par jour, saisie de la charge réelle en jours.
- Colonnes d'information : assigné, réel cumulé, reste à faire. Le reste à faire diminue du montant saisi et reste modifiable par la ressource.
- Total du jour affiché ; dépassement de la capacité signalé, non bloquant.
- **Cycle** : brouillon → soumise (par la ressource) → validée ou rejetée (par le chef de projet de chaque projet concerné, ou un administrateur). Une feuille soumise ou validée est verrouillée ; rejetée, elle redevient modifiable avec un commentaire. Une feuille validée ou partiellement validée peut être dévalidée (D-176). L'administrateur peut saisir, soumettre et rappeler pour une ressource (D-181).
- Écran de validation : liste des feuilles par semaine et par ressource, avec statut.
- Le travail réel saisi est pris en compte au calcul suivant.

### API et règles (lot 4a, D-118)

1. **Découpage** : 4a API et calcul ; 4b écran Feuille de temps ; 4c écran Validation ; clôture du lot 4 (parcours complet e2e étendu, feuilles ajoutées au jeu de démonstration D-117 après la séance UX). Un cycle complet par sous-lot.
2. **Semaine** : paramètre `semaine=AAAA-MM-JJ`, un lundi, année comprise entre 2000 et 2099 ; sinon 400.
3. **Lignes d'une feuille** : les assignations de la ressource dont l'activité est ouverte, le projet et ses ancêtres non clos, hors modèle ; plus toute assignation qui porte une imputation dans la semaine (alors `modifiable: false` si elle ne remplit plus ces conditions). Tri : code du projet sans tenir compte de la casse, puis ordre WBS.
4. **Lecture** : `GET /api/feuilles?semaine=…[&ressource_id=…]` → 200 `{ feuille: { id | null, ressource_id, semaine, statut, commentaire, validations: [{ projet_id, validateur_id, date }] }, lignes: [{ assignation_id, projet_id, projet_code, activite_id, activite_nom, wbs, assignee, reel_cumule, reste, modifiable, imputations: [{ jour, charge }] }], jours: [{ jour, capacite, total, depassement }] }`. Sept jours, du lundi au dimanche ; capacité = capacité de la ressource si le jour est ouvré à son calendrier, sinon 0 (modifié par D-276 : 0 un jour d'absence en journée, moitié en demi-journée) ; `depassement` = total > capacité (signalé, non bloquant). Sans `ressource_id` : sa propre feuille. Feuille d'autrui : l'administrateur (toutes les lignes) ou un utilisateur qui écrit sur au moins un projet de la feuille (seules les lignes de ces projets) ; sinon 404. Feuille absente : `id` null, statut `brouillon`, rien n'est écrit.
5. **Saisie** : `PUT /api/feuilles?semaine=…` (sa propre feuille seulement), corps strict `{ lignes: [{ assignation_id, imputations: [{ jour, charge }], reste? }] }`. Pour chaque ligne envoyée, ses imputations de la semaine sont remplacées (charge 0 = pas d'imputation) ; les lignes non envoyées sont inchangées. Réel : charge réelle = somme de toutes les imputations de l'assignation. Reste : reste := max(0, reste − δ), δ = nouveau total de la semaine − ancien total ; une valeur `reste` envoyée (≥ 0, 2 décimales au plus) prime. Le reste modifié est historisé (auteur = la ressource). Une transaction ; verrou de ligne (FOR UPDATE) sur la feuille et les assignations. Réponse 200 de même forme que le GET.
6. **Refus du PUT**, dans cet ordre, rien n'est écrit : 401 ; 400 semaine invalide, corps invalide, jour hors de la semaine, doublon (assignation ou jour d'une ligne), charge hors bornes ou à plus de 2 décimales ; 422 `{ erreur, code }` : `assignation_invalide` (assignation inconnue ou d'une autre ressource), `ligne_fermee` (activité close, projet ou ancêtre clos, modèle), sauf si toutes les charges envoyées pour cette ligne sont inchangées, `jour_futur` (jour postérieur à la date du jour du serveur), `feuille_verrouillee` (feuille soumise ou validée). Un jour chômé ou hors des dates d'affectation est accepté. (modifié par D-276 : 422 `jour_absence` sur un jour d'absence en journée entière, après ces refus)
7. **Cycle** : `POST /api/feuilles/:id/soumettre` (la ressource ; brouillon ou rejetée → soumise ; commentaire effacé ; 422 `feuille_vide` sans imputation > 0 dans la semaine) ; `POST …/rappeler` (la ressource ; soumise sans aucune validation → brouillon ; sinon 422 `deja_validee`) ; `POST …/valider` (le validateur valide les projets concernés sur lesquels il écrit ; projets concernés = projets des assignations qui portent une imputation > 0 dans la semaine ; la feuille est validée quand tous le sont ; l'administrateur les valide tous) ; `POST …/rejeter` corps `{ commentaire }`, 1 à 500 caractères après retrait des espaces de bord (validateur d'au moins un projet concerné, ou administrateur ; soumise → rejetée ; validations effacées). Statut inadéquat : 422 `statut_invalide`. Feuille non visible : 404 ; visible sans droit d'agir : 403. Un refus n'écrit rien. (modifié par D-274 : valider, rejeter et dévalider sa propre feuille : 403 sauf administrateur, §8 securite-2 point 2)
8. **Liste des validations** : `GET /api/validations?semaine=…` → 200 `{ feuilles: [{ feuille_id, ressource_id, ressource_nom, statut, projets: [{ projet_id, projet_code, valide, peut_valider }] }] }` : feuilles existantes (brouillons compris) qui touchent au moins un projet sur lequel l'utilisateur écrit ; administrateur : toutes ; utilisateur sans droit d'écriture : liste vide. Tri par nom de ressource. (modifié par D-265 : leader métier, toutes les feuilles, `peut_valider` vrai partout, comme l'administrateur ; le chef de projet est inchangé)
9. **Calcul** : le travail réel du moteur = toutes les imputations des assignations des projets calculés, quel que soit le statut de la feuille ; les imputations des assignations des autres projets s'ajoutent au travail externe. Moteur inchangé. Le Gantt (avancement) lit la charge réelle.
10. **Précisions (D-119)** : (a) `jour_futur` ne vaut que pour une charge > 0 ; une charge 0 sur un jour futur est acceptée, sans écriture pour ce jour. (b) Ligne fermée : un `reste` envoyé différent du reste actuel est refusé, 422 `ligne_fermee`, même si les charges sont inchangées. (c) `ressource_id` inconnu, mal formé ou hors plage entier : 404. (d) Valider par un utilisateur qui voit la feuille mais n'écrit sur aucun projet concerné : 403. (e) Aucune feuille n'est créée si rien n'est écrit (ni imputation, ni reste modifié) : `PUT { lignes: [] }` ou charges toutes inchangées sur une feuille absente → 200, `feuille.id` null. (f) Feuille d'autrui filtrée : `jours[].total` et `depassement` portent sur les seules lignes visibles.

### Écran Feuille de temps (lot 4b, D-120)

1. **Accès** : entrée de menu « Imputations » (Navigation principale) si l'utilisateur est ressource ; sa propre feuille seulement, aucune route d'API nouvelle. Adresse `/imputations?semaine=AAAA-MM-JJ` (un lundi) ; absente ou invalide : lundi de la semaine courante du navigateur, adresse corrigée sans rechargement.
2. **En-tête** : titre « Feuille de temps » ; « Semaine du JJ/MM/AAAA au JJ/MM/AAAA » ; boutons « Semaine précédente », « Cette semaine », « Semaine suivante » ; statut affiché « Brouillon », « Soumise », « Validée » ou « Rejetée » ; feuille rejetée : alerte « Feuille rejetée : <commentaire> ».
3. **Tableau** : colonnes Projet (code), Activité (« <wbs> <nom> »), Assigné, Réel cumulé, sept jours (« lun. 11/01 » … « dim. 17/01 »), Reste à faire ; charges en jours, virgule décimale à l'affichage. Jour à capacité 0 : colonne grisée, saisie permise (modifié par D-276 : case d'un jour d'absence désactivée, `title` « Absence (<motif>) »). Jour postérieur à la date du jour du navigateur : cases désactivées. Ligne `modifiable: false`, ou feuille soumise ou validée : lecture seule. Aucune ligne : « Aucune activité à imputer cette semaine. ».
4. **Saisie** : case de charge en texte, nom accessible « <activité>, <jour> » ; virgule ou point ; vide = 0 ; valeur invalide (non numérique, négative, plus de 2 décimales, > 10) : case marquée invalide (`aria-invalid`) avec message, « Enregistrer » désactivé. Reste à faire : même règle (≥ 0, 2 décimales), envoyé seulement s'il a été modifié par l'utilisateur.
5. **Total** : ligne « Total » sous le tableau, total par jour recalculé pendant la saisie ; total > capacité du jour : icône et texte « Dépassement » (nom accessible), couleur des drapeaux, non bloquant.
6. **Enregistrer** : PUT des seules lignes modifiées (charges ou reste) ; succès : « Feuille enregistrée. », tableau relu depuis la réponse ; refus : valeurs saisies gardées ; textes : 400 « Données invalides. » ; `assignation_invalide` « Cette ligne n’est plus disponible. » ; `ligne_fermee` « Cette activité ou ce projet est clos : la ligne n’est plus modifiable. » ; `jour_futur` « Impossible d’imputer un jour futur. » ; `feuille_verrouillee` « La feuille est soumise ou validée : elle n’est plus modifiable. ».
7. **Soumettre et rappeler** : « Soumettre » (brouillon ou rejetée), désactivé tant qu'il y a des modifications non enregistrées ; `feuille_vide` : « Aucune imputation : rien à soumettre. ». « Rappeler » (soumise) ; `deja_validee` : « La feuille est déjà validée en partie. ». Succès : statut mis à jour, cases selon le point 3.
8. **Sortie de l'écran** avec des modifications non enregistrées (changement de semaine, menu, lien interne, retour ou avance du navigateur, déconnexion) : confirmation « Abandonner les modifications ? » (composant de confirmation existant) ; « Annuler » reste sur l'écran, saisie et adresse inchangées. Rechargement et fermeture de l'onglet : message du navigateur (D-172).
9. **Parcours complet e2e** étendu : la ressource se connecte, saisit, enregistre, soumet ; effet vérifié dans le Gantt du projet (charge réelle et avancement de l'activité).
10. **Rappeler une feuille validée** (correctif de 4a, D-120 (1)) : 422 `deja_validee` dès qu'une validation existe ; brouillon ou rejetée : 422 `statut_invalide`.

### Écran Validation (lot 4c, D-135)

1. (modifié par D-247 : onglet Validation de l'écran Imputations, entrée de menu supprimée) Accès : entrée « Validation » de la Navigation principale pour l'administrateur et le chef de projet ; adresse `/validation?semaine=AAAA-MM-JJ` (un lundi) ; absente ou invalide : lundi de la semaine courante du navigateur, adresse corrigée sans rechargement (même code que 4b, partagé). Aucune route d'API nouvelle.
2. En-tête : titre « Validation des feuilles de temps » ; « Semaine du JJ/MM/AAAA au JJ/MM/AAAA » ; boutons « Semaine précédente », « Cette semaine », « Semaine suivante » (composant partagé avec 4b).
3. Tableau (GET /api/validations, ordre de l'API) : colonnes Ressource, Statut (mêmes badges que 4b), Projets, Actions. Projets : un badge par projet « <code> · Validé » (succès), « <code> · À valider » (si `peut_valider` et non validé), « <code> · Non autorisé » (neutre, si non `peut_valider` et non validé) ; `projets` vide : « Aucune imputation ». Liste vide : « Aucune feuille de temps pour cette semaine. ». Quatre états : Chargement, Vide, Notification erreur, nominal.
4. « Voir » (nom accessible « Voir la feuille de <ressource> ») : dialogue « Feuille de <ressource>, semaine du JJ/MM/AAAA au JJ/MM/AAAA », GET /api/feuilles?semaine=…&ressource_id=…, tableau de 4b en lecture seule (lignes visibles seulement, total, « Dépassement »), commentaire de rejet affiché si rejetée ; focus rendu au bouton à la fermeture.
5. « Valider » (« Valider la feuille de <ressource> ») : affiché si statut soumise et au moins un projet `peut_valider` non validé ; confirmation (composant existant) « Valider la feuille de <ressource> pour <codes des projets validables> ? » ; succès : `role="status"` « Feuille validée. », liste relue.
6. « Rejeter » (« Rejeter la feuille de <ressource> ») : affiché si statut soumise et au moins un projet `peut_valider` ; dialogue avec champ « Commentaire » obligatoire (1 à 500 caractères après retrait des espaces de bord, compteur, « Rejeter » désactivé sinon) ; succès : « Feuille rejetée. », liste relue.
7. Brouillons, feuilles rejetées ou validées : listées, sans « Valider » ni « Rejeter » ; « Voir » toujours présent.
8. Erreurs de valider ou rejeter : 422 `statut_invalide` « La feuille a changé de statut. » puis liste relue ; 403 « Vous n'avez pas le droit d'agir sur cette feuille. » ; 404 « Feuille introuvable. » puis liste relue ; 400 « Données invalides. » ; autre « Une erreur est survenue. ». Rien n'est écrit en cas d'échec. Amendement D-145 (2) : après un succès de Valider ou Rejeter, et après un refus 422 `statut_invalide` ou 404, le dialogue est fermé et la liste relue ; le message du refus 422 ou 404 s'affiche dans une notification d'erreur (`role="alert"`) au-dessus du tableau, effacée à l'action suivante et au changement de semaine ; 403, 400, erreur réseau et 5xx laissent le dialogue ouvert avec le message dans le dialogue. Focus, la liste relue : sur le bouton d'origine s'il existe encore et n'est pas désactivé, sinon sur « Voir la feuille de <ressource> » de la même feuille, sinon sur le tableau « Feuilles de temps à valider » (`tabIndex=-1`).
9. Parcours IHM : e2e de bout en bout à l'écran (ressource saisit, enregistre, soumet ; chef valide ; ressource voit « Validée » et la lecture seule dans sa Feuille de temps) ; idem rejet (ressource voit « Feuille rejetée : <commentaire> » et peut de nouveau saisir). Parcours complet étendu à la clôture du lot 4.
10. Précisions (relecture des tests, claude.ai). (a) Apostrophe typographique ’ dans tous les textes de l’écran (« Vous n’avez pas le droit d’agir sur cette feuille. »), comme en 4b. (b) Badge de projet selon le statut de la feuille : validé → « <code> · Validé » (success) ; non validé et non `peut_valider` → « <code> · Non autorisé » (neutre) ; feuille soumise, `peut_valider`, non validé → « <code> · À valider » (info) ; brouillon ou rejetée, `peut_valider`, non validé → « <code> » (neutre, sans suffixe). Signature `badgeProjet(projet, statutFeuille)`, `badgesProjets(feuille)`. (c) Ressource sans rôle chef ni administrateur qui ouvre `/validation` : « Accès réservé aux chefs de projet et aux administrateurs. », aucun appel à /api/validations. (Remplacé en 6b par la redirection vers /mes-taches, D-148 (5) ; toujours aucun appel à /api/validations.)

### Dévalidation (D-176)

1. **API** : `POST /api/feuilles/:id/devalider`, sans corps. Même boucle de verbes et même fonction `agir` que valider.
   - Effet : supprime les lignes de `validation_feuille` de la feuille dont le projet est un projet sur lequel l'utilisateur écrit, comme pour valider ; l'administrateur les supprime toutes. Les validations des autres projets sont conservées. Statut résultant : « soumise ». Une transaction, verrou FOR UPDATE sur la feuille.
   - Réponse 200 : même forme que le GET de la feuille, comme les autres verbes.
   - Refus, rien n'est écrit, dans l'ordre déjà suivi par valider : 401 ; 404 pour une feuille non visible ou un identifiant invalide ; 403 pour une feuille visible par un utilisateur qui n'écrit sur aucun projet concerné (l'administrateur n'est jamais dans ce cas) ; 422 `statut_invalide` si la feuille n'est ni soumise ni validée ; 422 `rien_a_devalider` si aucune validation ne porte sur un projet que l'utilisateur écrit.
   - Après une dévalidation qui ne laisse aucune validation, la ressource peut « Rappeler » (règle existante). Le validateur peut « Rejeter » (soumise → rejetée, règle existante). Ces deux règles ne changent pas.
   - Aucun historique des dévalidations en V1.
2. **Écran Validation** :
   - Bouton « Dévalider », nom accessible « Dévalider la feuille de <ressource> ». Il est affiché si le statut est soumise ou validée et si au moins un projet a `valide` et `peut_valider`. Ordre des actions : Voir, Valider, Rejeter, Dévalider.
   - Confirmation (composant existant) : titre exact « Dévalider la feuille de <ressource> pour <codes des projets dévalidables> ? », texte « La feuille repassera au statut Soumise. », bouton « Dévalider ».
   - Succès : `role="status"` « Feuille dévalidée. », puis la liste est relue.
   - Erreurs : mêmes règles que le point 8 de 4c et D-145 (2). `rien_a_devalider` est traité comme `statut_invalide` (dialogue fermé, liste relue, notification d’erreur) avec le texte « La feuille n’a plus de validation à retirer. ».
   - Focus : même règle que D-145 (2).
   - Feuille de temps de la ressource : inchangée.
3. **Parcours IHM** : e2e à l'écran. Le chef valide, puis dévalide. La ressource voit « Soumise », rappelle, corrige, enregistre et soumet de nouveau. Il est aussi vérifié qu'un second chef garde sa validation quand le premier dévalide. Le parcours complet est étendu comme en D-136 (révision -rN, D-031).

### Saisie pour autrui par l'administrateur (D-181)

1. **Découpage** : AUT-I (API), puis AUT-E (écran Feuille de temps). Un cycle complet par tranche, tags `tests-autrui-i` et `tests-autrui-e`. Moteur et calcul inchangés. Seul l'administrateur agit pour autrui ; la saisie pour autrui par un chef de projet est hors périmètre. (modifié par D-265 : le leader métier est refusé comme le chef de projet)
2. **API, saisie** : `PUT /api/feuilles?semaine=…[&ressource_id=…]`.
   - `ressource_id` absent ou égal à soi : sa propre feuille, comportement inchangé.
   - `ressource_id` d'autrui : réservé à l'administrateur. Toutes les lignes de la ressource, mêmes contrôles et mêmes refus que pour la ressource (400, `assignation_invalide`, `ligne_fermee`, `jour_futur`, `feuille_verrouillee`), même verrou, même réponse que le GET avec ce `ressource_id`. La feuille créée appartient à la ressource.
   - Pour un autre utilisateur : 403 si la feuille lui est visible (règle du GET, SPEC 4a point 4), 404 sinon ; `ressource_id` inconnu, mal formé ou hors plage : 404 (D-119 (c)). Rien n'est écrit.
   - Ordre des refus : 401 ; 400 ; 404 ; 403 ; puis les 422 existants.
3. **Historique** : le reste à faire modifié par la feuille est historisé avec pour auteur l'utilisateur qui écrit (l'administrateur quand il saisit pour autrui).
4. **API, cycle** : `soumettre` et `rappeler` sont permis à la ressource ou à un administrateur, avec les mêmes règles (`feuille_vide`, `deja_validee`, `statut_invalide`). Pour un autre utilisateur : refus inchangés. Valider, rejeter et dévalider : inchangés. L'administrateur peut valider une feuille qu'il a saisie (pas de séparation des rôles en V1).
5. **Écran (AUT-E)** :
   - Entrée de menu « Imputations » : pour la ressource (inchangé) et pour tout administrateur, ressource ou non.
   - Barre d'outils de l'administrateur seulement : liste « Ressource » (nom accessible « Ressource »), qui contient les utilisateurs ressources actifs triés par nom, lus par une route existante. Par défaut : lui-même s'il est ressource, sinon aucune sélection et le message « Choisissez une ressource. », sans appel à /api/feuilles.
   - Adresse `/imputations?semaine=…&ressource=<id>` ; ressource absente de la liste : paramètre retiré, comportement par défaut, adresse corrigée sans rechargement.
   - Titre « Feuille de temps de <nom> » quand la ressource n'est pas l'utilisateur ; sinon titre inchangé.
   - Enregistrer, Soumettre et Rappeler agissent sur la feuille affichée, avec les mêmes textes qu'en 4b.
   - Changer de ressource avec des modifications non enregistrées passe par la garde de D-172 (une confirmation, mêmes textes).
   - Utilisateur non administrateur : paramètre `ressource` ignoré et retiré de l'adresse sans rechargement ; sa propre feuille ; aucune requête avec `ressource_id` (D-184).
6. **Parcours IHM (AUT-E)**, entièrement à l'écran : un administrateur non ressource choisit Alice, saisit, enregistre et soumet ; le chef valide à l'écran Validation ; Alice voit sa feuille « Validée » avec les charges saisies. Le parcours complet est étendu par révision -rN (D-031).

### Plan de charge (lot 6d, D-154)

1. Route `GET /api/plan-de-charge?debut=AAAA-MM[&equipe=<id>|aucune]`. Administrateur et chef de projet ; 401 sans session ; rôle ressource : 403 `{ erreur: 'Interdit' }` après le 401. 400 : `debut` absent, mal formé ou année hors 2000 à 2099 ; `equipe` ni entier ni « aucune ». Équipe inconnue : 200, `ressources` vide. N'écrit rien. Le moteur est inchangé ; pas d'export CSV (6f). (modifié par D-265 : et leader métier)
2. Réponse : `{ mois: ['AAAA-MM' ×12], ressources: [{ ressource_id, nom, actif, equipe_id, mois: [{ mois, disponible, reel, planifie, charge, ecart }], projets: [{ projet_id, code, nom, mois: [{ mois, reel, planifie, charge }] }] }] }`. 12 mois à partir de `debut`.
3. Valeurs en jours, 2 décimales, conversion en SQL comme D-044 (5). `reel` : imputations du mois, tout statut de feuille. `planifie` : travail planifié du mois, tel que laissé par le dernier calcul. `charge` = reel + planifie. `disponible` = jours ouvrés du mois (calendrier de la ressource, jours travaillés hors fériés) × capacité ; dates et taux d'affectation ignorés. `ecart` = disponible − charge, négatif possible. (modifié par D-278 : le disponible déduit les absences de la ressource, §4 « Absences et charge depuis le taux », point 24)
4. Ressources : utilisateurs `est_ressource` actifs, plus tout utilisateur à charge non nulle dans la période, actif ou non. Filtre équipe : ses membres ; « aucune » : sans équipe. Tri par nom (casse ignorée), puis id.
5. Projets d'une ressource : charge non nulle dans la période seulement, clos compris, jamais de modèle ; tri par code (casse ignorée). Chef de projet : les projets illisibles sont regroupés en une ligne finale (`projet_id`, `code`, `nom` à null) ; les totaux de la ressource incluent tous les projets. Administrateur : tout, sans regroupement. L'annuaire est inchangé (D-147 (4) réglé). (modifié par D-265 : le chef de projet et le leader métier lisent tous les projets : plus de ligne regroupée)
6. Écran `/plan-de-charge` : entrée « Plan de charge » après « Projets » (administrateur, chef de projet) ; rôle ressource redirigé vers /mes-taches (D-148 (5)). Filtres : « Équipe » (« Toutes », « Sans équipe », équipes par nom), « Mois de départ » (type month, mois courant du navigateur), « Mois précédent », « Mois suivant ». Adresse `?debut=AAAA-MM&equipe=…` ; valeur invalide : défaut, adresse corrigée sans rechargement.
7. Tableau « Plan de charge », lecture seule : colonne « Ressource » sticky, nom suivi de « (inactif) » si inactif, bouton « Déplier <nom> » / « Replier <nom> » (tout replié par défaut) ; 12 colonnes « MM/AAAA ». Cellule : charge à virgule décimale, `title` « Charge X j, disponible Y j, écart Z j » ; écart négatif : couleur flag et texte « , surcharge » pour lecteurs d'écran. Lignes de projet : « <code> · <nom> » ou « Autres projets », charge seule. Charge nulle : « 0 ». Vide : « Aucune ressource. » ; échec : « Impossible de charger le plan de charge. »
8. Zone `role="region"`, `aria-label` « Plan de charge », focalisable, défilement horizontal, anneau de focus de docs/ui.md ; la page ne défile pas en horizontal à 1440 ni à 1024 px.
9. Jeu de démonstration (D-117) : équipe « Développement » (alice, bob), équipe « Pilotage » (chefa, chefb), au moins une imputation passée d'alice. Parcours complet e2e étendu : ouvrir le Plan de charge, filtrer sur l'équipe créée à l'écran, vérifier la ligne de la ressource et le dépliage de son projet.

### Exports CSV (lot 6f, D-160)

1. **Périmètre** : un cycle, deux volets : A, export du plan de charge ; B, export des imputations. Lecture seule, aucune écriture en base. Pas d'import. La charge vendue n'est jamais exportée.
2. **Format commun** (serveur, fonctions pures du module `export/csv.ts`) : UTF-8 avec BOM, séparateur « ; », fin de ligne CRLF, une ligne d'en-tête. Champ entre guillemets s'il contient « ; », un guillemet, CR ou LF, guillemets doublés. Nombres à 2 décimales au plus, virgule décimale, sans séparateur de milliers, zéros non significatifs retirés (12,5 ; 3 ; -1, signe moins ASCII). Dates JJ/MM/AAAA, mois MM/AAAA. Un champ texte (jamais un nombre) qui commence par =, +, -, @, tabulation ou CR est préfixé d'une apostrophe. En-têtes HTTP : `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="<nom>"`.
3. **Volet A** : `GET /api/plan-de-charge/export?debut=AAAA-MM[&equipe=<id>|aucune]`. Paramètres, droits, refus et ordre des refus de `GET /api/plan-de-charge` (§7, Plan de charge, D-154) ; le chef de projet voit « Autres projets ». Fichier `plan-de-charge-AAAA-MM.csv`. Contenu (D-241, révise D-160) : colonnes Ressource;Équipe;Ligne puis les 12 mois de la réponse de l'API, en-têtes au format MM/AAAA (mêmes mois que l'écran). Par ressource, dans l'ordre de l'API : une ligne « Charge » (charge du mois), une ligne « Disponible », une ligne « Écart » (négatif possible), puis une ligne par projet dans l'ordre de l'API, Ligne = « <code> · <nom> » ou « Autres projets », valeurs = charge du projet dans le mois. Ressource et Équipe sont répétées sur chaque ligne. Équipe : nom, vide sans équipe. Ressource inactive : suffixe « (inactif) ». Valeur nulle : « 0 ». Aucune ressource : en-tête seul. Réel et Planifié ne sont plus exportés ; ils restent dans l'API et à l'écran (infobulle) inchangés. (modifié par D-265 : plus de ligne « Autres projets » pour le chef de projet ni pour le leader métier)

   Exemple (`debut=2027-01`, administrateur, calendrier par défaut, capacité 1 ; Alice, équipe « Dev », projets P1 « Projet un » : planifié 1,5 le 05/01/2027 et imputé 0,5 le 12/01/2027 ; P2 « Projet deux » : planifié 19,5 le 06/01/2027) ; lignes séparées par CRLF, BOM en tête :

   ```
   Ressource;Équipe;Ligne;01/2027;02/2027;03/2027;04/2027;05/2027;06/2027;07/2027;08/2027;09/2027;10/2027;11/2027;12/2027
   Alice;Dev;Charge;21,5;0;0;0;0;0;0;0;0;0;0;0
   Alice;Dev;Disponible;21;20;23;22;21;22;22;22;22;21;22;23
   Alice;Dev;Écart;-0,5;20;23;22;21;22;22;22;22;21;22;23
   Alice;Dev;P1 · Projet un;2;0;0;0;0;0;0;0;0;0;0;0
   Alice;Dev;P2 · Projet deux;19,5;0;0;0;0;0;0;0;0;0;0;0
   ```
4. **Volet B** : `GET /api/imputations/export?du=AAAA-MM-JJ&au=AAAA-MM-JJ[&equipe=<id>|aucune]`. Administrateur : toutes les imputations ; chef de projet : celles des projets sur lesquels il écrit (D-118 (5)) ; rôle ressource : 403 `{ erreur: 'Interdit' }` après le 401. 400 : `du` ou `au` absent ou mal formé, année hors 2000 à 2099, `au` antérieur à `du`, période de plus de 366 jours, `equipe` mal formé. Équipe inconnue : en-tête seul. Fichier `imputations-AAAA-MM-JJ-AAAA-MM-JJ.csv`. Colonnes : Ressource;Équipe;Semaine;Statut;Projet;Activité;Jour;Charge. Semaine = lundi (JJ/MM/AAAA) ; Statut = Brouillon, Soumise, Validée ou Rejetée ; Projet = « <code> · <nom> » ; Activité = « <wbs> <nom> ». Toutes les imputations de la période, quel que soit le statut de la feuille. Tri : nom de la ressource (casse ignorée), id, jour, code du projet (casse ignorée), ordre WBS (calcul de Mes tâches, D-158 (2)).
5. **Écran Plan de charge** : bouton « Exporter CSV » dans la barre des filtres ; télécharge l'export avec les filtres courants (lien de téléchargement, aucun état modifié).
6. **Écran Validation** : bouton « Exporter CSV » qui ouvre le dialogue « Exporter les imputations » : champs Du et Au (type date) préremplis avec le lundi et le dimanche de la semaine affichée, liste « Équipe » comme dans le plan de charge, bouton « Exporter ». Au antérieur à Du, ou période de plus de 366 jours : « Période invalide. », `aria-invalid`, bouton désactivé. Le téléchargement ferme le dialogue ; le focus revient au bouton d'ouverture.
7. **Parcours complet e2e** étendu : exporter le plan de charge et les imputations à l'écran, vérifier dans le fichier téléchargé l'en-tête et la ligne de la ressource du parcours.

## 8. Sauvegarde et restauration

- Hors application, par scripts shell livrés dans `scripts/` :
  - `backup.sh` : `pg_dump` au format personnalisé, fichier horodaté.
  - `restore.sh <fichier>` : `pg_restore` dans une base vide, après confirmation.
- Une table `schema_version` porte la version du schéma. Au démarrage, l'application applique les migrations manquantes et refuse de démarrer si la base est plus récente qu'elle. Chaque migration s'exécute dans sa propre transaction ; une migration en échec arrête le démarrage, les précédentes restent appliquées.
- La restauration n'accepte que des sauvegardes produites par cet outil. Une sauvegarde est reconnue par la présence de la table `schema_version` ; sinon la restauration est refusée.

### Installation et déploiement (D-138)

- Production : `npm run build` (web par vite, API par tsc vers dist), `npm start` (node sur l'API compilée). L'API sert le web compilé et renvoie index.html pour toute route hors /api ; une route /api inconnue reste 404 JSON. Port `PORT`, défaut 8080.
- Compte initial : au démarrage, table utilisateur vide → administrateur admin/admin créé quel que soit `NODE_ENV`, sauf `INITIAL_ADMIN=0` (mot de passe d'amorce « admin » conservé malgré D-274 : exception écrite, §8 securite-2 point 4). Tant que ce compte garde le mot de passe d'origine, la session le signale (sans exposer de hash) et l'écran affiche à l'administrateur le bandeau non bloquant « Le mot de passe de l'administrateur est celui d'origine : changez-le. ».
- Docker : Dockerfile multi-étapes (image d'exécution node:22, utilisateur non root) ; docker-compose.yml avec `app` et `db` (postgres:18), volume nommé, healthcheck de la base, `app` attend `db` sain, port 8080, variables dans `.env` (modèle `.env.production.example`). Migrations appliquées au démarrage.
- Cache du navigateur (D-227) : `index.html` et le repli des routes du front sont servis avec `Cache-Control: no-cache` (ETag gardé) ; les fichiers sous `/assets/` avec `Cache-Control: public, max-age=31536000, immutable` ; les routes /api et le 404 d'un fichier absent de `/assets/` sont inchangés. Après une mise à jour, le navigateur charge la nouvelle version sans vider son cache.
- Manuel : `docs/installation.md`, lié depuis README.md.

### Changement de mot de passe (mot-de-passe, D-254)

1. Donnée : colonne `doit_changer_mot_de_passe` (booléen, faux par défaut), migration 016. `GET /api/auth/me` et les réponses utilisateur de l'API l'exposent. `create-admin` et le compte de développement (D-071) : faux. Compte initial hors développement (D-138 (2)) : vrai (amendé par le lot securite, SEC-1, D-272 ; voir point 7).
2. Administrateur : case « Doit changer son mot de passe à la prochaine connexion » dans les dialogues « Nouvel utilisateur » et « Modifier <nom> », décochée par défaut ; champ `doit_changer_mot_de_passe` (booléen) de POST et PATCH `/api/utilisateurs`, réservés à l'administrateur comme les autres champs. Fixer un mot de passe ne coche pas la case.
3. Effet immédiat, y compris sur une session ouverte : tant que la valeur est vraie, toute route `/api` répond 403 `{ erreur: 'Changement de mot de passe requis' }`, sauf `GET /api/auth/me`, `POST /api/auth/logout` et `POST /api/auth/mot-de-passe` (et `GET /api/version`, sans session). Ordre : 401 sans session, avant ce 403.
4. `POST /api/auth/mot-de-passe`, tout utilisateur connecté, corps `{ actuel, nouveau }` (chaînes). Ordre des refus : 401 ; 400 corps invalide ; 400 `{ erreur: 'Mot de passe actuel incorrect' }` ; 400 `{ erreur: 'Le nouveau mot de passe doit être différent de l'actuel' }` ; nouveau vide : 400 (corps invalide). Aucune autre contrainte (décision du porteur, pas de longueur minimale). (modifié par D-274 : 12 caractères au moins ; refus 400 `{ erreur: 'Le mot de passe doit contenir au moins 12 caractères.' }` après « Mot de passe actuel incorrect » et avant « différent de l'actuel », §8 securite-2 point 4) Base inchangée à chaque refus. Succès 204 : hash mis à jour, `doit_changer_mot_de_passe` à faux, autres sessions de l'utilisateur fermées, session courante gardée ; le signal « mot de passe d'origine » (D-138) tombe pour le compte admin. Même limiteur que la connexion si le code en a un (`auth/limiteur.ts`) ; sinon, aucun.
5. Écrans. Pied de la barre latérale, sous le nom : bouton « Changer mon mot de passe », qui ouvre le dialogue « Changer mon mot de passe » (champs « Mot de passe actuel », « Nouveau mot de passe », « Confirmation », type password ; bouton « Enregistrer » ; confirmation différente → message « La confirmation ne correspond pas. », sans envoi ; garde D-188 ; succès : dialogue fermé, notification « Mot de passe changé. »). Si `doit_changer_mot_de_passe` est vrai (après connexion, au rechargement, ou dès une réponse 403 « Changement de mot de passe requis ») : page « Changez votre mot de passe », sans menu, avec le même formulaire et « Se déconnecter » ; après succès, page d'accueil habituelle du rôle.
6. Hors lot : indicateur dans la liste des utilisateurs, historique, envoi de mail.
7. Compte initial (lot securite, SEC-1, D-272). Au démarrage hors développement, sur base vide, l'administrateur admin/admin est créé avec `doit_changer_mot_de_passe` vrai : il doit choisir un autre mot de passe avant tout autre accès (points 3 à 5). Le compte de développement (`NODE_ENV=development`, D-071) n'est pas concerné. Cas :
   - CPI-1 : démarrage hors développement, base vide → une ligne admin, `doit_changer_mot_de_passe` vrai ; connexion admin/admin 200 avec `doit_changer_mot_de_passe: true` ; `GET /api/utilisateurs` → 403 `{ erreur: 'Changement de mot de passe requis' }`, base inchangée ; `POST /api/auth/mot-de-passe` `{ actuel: 'admin', nouveau: 'admin' }` → 400, valeur toujours vraie ; `{ actuel: 'admin', nouveau: 'Autre-1' }` → 204 ; `GET /api/utilisateurs` → 200 ; valeur fausse en base.
   - CPI-2 : `NODE_ENV=development`, base vide → admin créé avec `doit_changer_mot_de_passe` faux (D-071 inchangé).

### Corrections de sécurité (securite-2, D-274)

Décisions du porteur (claude.ai, 2026-11-27) sur l'audit docs/securite.md : SEC-2, SEC-3 et SEC-7 corrigés. Cas SC2-n, tests SC2T-n et E2E-712 à E2E-716 (docs/tests.md). Les cas de ce lot réutilisent le monde de §2 point 7 (administrateur A, chef C, chef H, leader L, Alice, Zoé, projets P, P1, Q), complété : Carl, chef de projet et `est_ressource`, chef du projet PC, affecté à PC et assigné sur une activité de PC, feuille de la semaine S1 soumise ; une activité de P a `charge_vendue` 10, puis modifiée à 12 par A ; une autre activité de P créée avec `charge_vendue` 3 puis supprimée par A.

1. **Historique et finances (SEC-2).** Pour qui n'a pas `voit_finances` sur le projet (le leader métier), `GET /api/projets/:id/historique` omet : les lignes de modification dont `champ` vaut `charge_vendue` ; la clé `charge_vendue` de `nouvelle_valeur` des créations et de `ancienne_valeur` des suppressions d'activité. Inventaire : `charge_vendue` est le seul champ financier historisé d'un projet (les `taux` des affectations et assignations sont des pourcentages d'affectation, les taux journaliers n'ont pas de projet, §12.1 point 5). Administrateur et chef dans sa portée : historique inchangé. Complète D-265 point 3.
2. **Validation de sa propre feuille (SEC-3a).** Un utilisateur ne valide, ne rejette ni ne dévalide aucune ligne de sa propre feuille, sauf l'administrateur : 403 { erreur: 'Interdit' }, rien n'est écrit (chef de projet et leader métier). Le refus vient après le 404 (feuille visible : la sienne l'est toujours) et avant 422 et 400. `soumettre` et `rappeler` : inchangés. `GET /api/validations` : inchangé (sa feuille est listée, `peut_valider` inchangé). Écran Validation : sur la ligne de sa propre feuille (hors administrateur), « Valider », « Rejeter » et « Dévalider » sont absents, la phrase « Votre feuille est validée par un autre valideur. » prend leur place dans la cellule Actions, « Voir » reste (lecture seule).
3. **Son propre taux (SEC-3b).** Un chef de projet ne crée, ne modifie ni ne supprime aucune période de son propre taux journalier : `POST /api/utilisateurs/:id/taux` avec `:id` = lui, `PATCH` et `DELETE /api/taux/:id` d'un taux dont l'utilisateur est lui → 403 { erreur: 'Interdit' }, rien n'est écrit, à la place du 403 « chef hors de sa portée » (même rang d'ordre, §12.6 point 6) ; lecture inchangée. Le reste de l'écriture des taux par le chef est inchangé (D-258). Administrateur inchangé. Écran, onglet Affectations : le bouton « Modifier les taux de <nom> » est absent sur sa propre ligne (la colonne « Taux du jour » reste).
4. **Longueur minimale du mot de passe (SEC-7).** Tout nouveau mot de passe fait au moins 12 caractères : longueur en points de code Unicode, sans retrait d'espaces, aucune autre règle de composition. S'applique à : `POST /api/utilisateurs` (`mot_de_passe`), `PATCH /api/utilisateurs/:id` (`mot_de_passe`, s'il est présent), `POST /api/auth/mot-de-passe` (`nouveau`), `npm run create-admin` (`ADMIN_PASSWORD`). Refus : 400 { erreur: 'Le mot de passe doit contenir au moins 12 caractères.' }, rien n'est écrit ; `create-admin` refuse avec ce message. La connexion ne contrôle pas la longueur : un mot de passe existant plus court reste valable jusqu'à son changement. Exceptions écrites : le compte initial de production (§8, D-138 (2)) et le compte de développement (D-071) gardent le mot de passe d'amorce « admin » ; le changement imposé du compte initial exige 12 caractères. Écrans : aide « 12 caractères au moins » sous chaque champ de nouveau mot de passe (« Mot de passe » de Nouvel utilisateur, « Nouveau mot de passe » de Modifier <nom>, de « Changer mon mot de passe » et de la page « Changez votre mot de passe ») ; en dessous de 12 caractères, le message ci-dessus s'affiche (`role="alert"`) sans envoi, et le refus 400 du serveur s'affiche de même ; champ vide de Modifier <nom> : inchangé, pas de contrôle. Jeu de démonstration (D-117) : ses comptes passent par l'API, mots de passe `<identifiant>-demonstration` (sauf admin, mot de passe d'amorce de D-071 inchangé).
5. **Cas** (tests SC2T-n ; valeurs recopiées). « Base inchangée » pour tout refus.

| Cas | Rôle | Situation | Route | Code et effet attendus |
|---|---|---|---|---|
| SC2-1 | leader | historique de P, une activité à `charge_vendue` 10 puis 12 | `GET /api/projets/:id/historique` | 200 ; aucune ligne dont `champ` vaut `charge_vendue` ; les autres lignes de modification (par exemple `nom`) présentes ; nombre de lignes = celui de A moins les lignes `charge_vendue` |
| SC2-2 | leader | idem, une activité créée puis supprimée | idem | 200 ; `nouvelle_valeur` des créations et `ancienne_valeur` des suppressions d'activité sans la clé `charge_vendue`, autres clés présentes |
| SC2-3 | administrateur ; chef C | idem | idem | 200 ; ligne `charge_vendue` de 10 à 12 présente ; clé `charge_vendue` présente dans création et suppression |
| SC2-4 | chef Carl | sa feuille S1 soumise, puis validée par A | `POST /api/feuilles/:id/valider`, `…/rejeter` { commentaire: 'x' }, `…/devalider` | 403 { erreur: 'Interdit' } ; feuille et validations inchangées |
| SC2-5 | leader L | sa feuille S1 soumise, puis validée par A | mêmes routes | 403 { erreur: 'Interdit' } ; base inchangée |
| SC2-6 | A ; A ressource | feuille de Carl ; sa propre feuille | `POST …/valider` | 200 (non-régression : l'administrateur valide la feuille d'un chef et la sienne) |
| SC2-7 | chef Carl | taux propre existant de Carl (A l'a créé), Alice affectée à PC | `POST /api/utilisateurs/:id/taux` (Carl), `PATCH` et `DELETE /api/taux/:id` | 403 { erreur: 'Interdit' } ; même avec un corps invalide ; `GET /api/utilisateurs/:id/taux` 200 |
| SC2-8 | chef Carl ; A ressource | taux d'Alice (affectée à PC) ; taux propre de A | `POST /api/utilisateurs/:id/taux`, `PATCH`, `DELETE` | 201, 200, 204 (non-régression D-258 ; l'administrateur écrit son propre taux) |
| SC2-9 | A | `POST /api/utilisateurs` | `mot_de_passe` de 11 caractères (« abcdefghijk ») | 400 { erreur: 'Le mot de passe doit contenir au moins 12 caractères.' } ; de 12 (« abcdefghijkl ») : 201 |
| SC2-10 | A | `POST /api/utilisateurs` | six caractères hors plan de base (« 😀 » × 6, 12 unités UTF-16) ; « 😀 » × 12 ; « abcdefghijk » suivi d'une espace ; douze espaces | 400 ; 201 ; 201 ; 201 (points de code, sans retrait d'espaces) |
| SC2-11 | A | `PATCH /api/utilisateurs/:id` | `mot_de_passe` de 11 caractères ; de 12 ; `PATCH` sans `mot_de_passe` d'un compte à mot de passe court | 400, hash et sessions inchangés ; 200 ; 200 |
| SC2-12 | utilisateur | `POST /api/auth/mot-de-passe` | `nouveau` de 11 caractères (actuel correct) ; `nouveau` court avec `actuel` faux ; `nouveau` court égal à `actuel` ; `nouveau` de 12 | 400 { erreur: 'Le mot de passe doit contenir au moins 12 caractères.' }, hash inchangé ; 400 { erreur: 'Mot de passe actuel incorrect' } ; 400 longueur ; 204 |
| SC2-13 | — | `create-admin` | `ADMIN_PASSWORD` de 11 caractères ; de 12 | refus, message de longueur, aucune ligne ; créé |
| SC2-14 | utilisateur à mot de passe de 5 caractères existant | `POST /api/auth/login` | — | 200 (la connexion ne contrôle pas la longueur) |
| SC2-15 | compte initial (hors développement) | admin/admin, changement imposé | `POST /api/auth/mot-de-passe` { actuel: 'admin', nouveau } | connexion admin/admin 200 ; `nouveau` de 11 caractères : 400 longueur, valeur toujours vraie ; de 12 : 204 |
| SC2-16 | — | jeu de démonstration | `POST /api/auth/login` | chefa, chefb, alice, bob : `<identifiant>-demonstration` 200 ; admin/admin 200 |
| SC2-17 | tous | Écrans | E2E-712 à E2E-716 | voir docs/tests.md |

## 9. Découpage en lots

| Lot | Contenu |
|---|---|
| 0 | Dépôt, CI, contrôle des licences, base, authentification, utilisateurs, rôles, scripts de sauvegarde |
| 1 | Calendriers, projets, affectations projet, activités, jalons, WBS, dépendances, assignations |
| 1b | Modèles de projet, copie de projet (API et écran), reste d'écran du lot 1 |
| 2a | Moteur : calendrier, disponibilité, tri, ASAP, dépendances, jalons, agrégation |
| 2b | START, STARR, ALAP |
| 2c | FDUR, DDUR |
| 2d | REGUL |
| 2e | MAN et son écran de saisie |
| 2f | Plafond de projet |
| 3 | Gantt éditable |
| 4 | Imputations et validation |
| 5 | Durcissement avant production (D-137) |
| 5i | Installation et déploiement : mode production, compte initial, Docker, manuel (D-138) |
| 6 | Pilotage des ressources (D-147) |

Lot 3 : tranches 3a à 3g (D-065).

Lot 4 : tranches 4a à 4c (D-118).

Lot 6 : sous-lots 6a équipe ; 6b vue restreinte de la ressource ; 6c charge vendue ; 6d plan de charge ; 6e planning d'une ressource sur l'Accueil ; 6f exports CSV (D-147).

## 10. Questions ouvertes

Chaque question a une valeur par défaut, appliquée tant qu'elle n'est pas tranchée.

1. Granularité des imputations : jours décimaux à 0,01 (défaut), ou pas de 0,25 ?
2. Dépendances FF : planification à rebours (défaut), ou simple contrôle avec drapeau ?
3. DDUR : ignore la capacité (défaut), ou lisse d'abord puis surcharge le reliquat ?
4. Rôles : 3 rôles fixes (défaut), ou profils configurables ?
5. Calendrier : un par ressource (défaut), ou un seul pour toute l'instance ?
6. Absences et congés : hors V1 (défaut), ou saisie de jours d'absence par ressource ?
7. Recalcul automatique du Gantt : désactivé par défaut (défaut), ou activé ?
8. Unité de charge : jours uniquement (défaut), ou choix jours/heures ?
9. Copie : saisies manuelles (MAN) non copiées (défaut), ou copiées
   avec décalage ?
10. Copie : décalage des dates en jours calendaires (défaut), ou en
    jours ouvrés ?

## 11. Modèles et copie de projet

### 11.1 Modèle

- Un modèle est un projet dont `est_modele` est vrai.
- Un modèle n'est jamais planifié par le moteur, n'accepte aucune
  imputation et n'apparaît pas dans les listes de projets, sauf dans
  l'écran « Modèles » (modifié par D-247 : l'onglet Modèles de l'écran Projets).
- Droits : l'administrateur crée, modifie et supprime les modèles. Le chef
  de projet les lit et crée des projets à partir d'eux. (modifié par D-265 : le leader métier aussi, en lecture seule comme le chef)
- Un modèle n'a pour parent et pour enfants que des modèles ; un projet
  ordinaire, que des projets ordinaires.
- `est_modele` est fixé à la création et ne se modifie pas.
- L'administrateur et le chef de projet lisent tous les modèles et leur
  contenu. Seul l'administrateur écrit un modèle et son contenu
  (activités, jalons, dépendances, affectations, assignations). Pour une
  ressource, un modèle répond 404, même si elle y est affectée.
- Le chef d'un modèle est l'administrateur qui le crée.

### 11.2 Copie

- Action « Copier » sur un projet ou un modèle, depuis la liste des projets
  et l'écran « Modèles » (modifié par D-247 : l'onglet Modèles de l'écran Projets) (depuis le Gantt : lot 3).
- Depuis le Gantt du projet : bouton « Copier » (3f-2).
- Dialogue : nom, code, date de début, options « inclure les sous-projets »
  (défaut oui), « copier les affectations et assignations » (défaut oui).
- Copié : sous-projets, activités, jalons, arborescence et ordre WBS,
  modes, priorités, durées validées, dépendances (type et délai),
  et selon l'option : affectations projet et assignations (taux, charge
  assignée ; charge depuis le taux, modifié par D-276).
- Remis à zéro : charge réelle = 0, reste à faire = charge assignée,
  `clos` et `close` à faux, dates planifiées vides, drapeaux vides (activités, jalons et dépendances).
- Jamais copié : travail planifié, saisies manuelles, imputations,
  feuilles de temps, historique.
- Décalage : delta = date de début cible − date de début source, en jours
  calendaires. Toutes les dates validées (activités, jalons) et les dates
  des affectations projet sont décalées de delta.
- Le chef de projet de la copie est l'utilisateur qui copie.
- Une date validée décalée au-delà du 31/12/2099 (début ou fin validés d'une activité, date validée d'un jalon) : copie refusée, 422, rien n'est créé (D-058). Aucune saisie manuelle n'est copiée.
- La copie est atomique : tout ou rien. Le projet source n'est jamais
  modifié.
- Droits : le chef de projet copie ses projets ; l'administrateur copie
  tout.
- Un sous-projet peut être copié seul : la copie est un projet racine.
- Sans l'option sous-projets, seuls le projet et son contenu direct sont
  copiés.
- Le code d'un sous-projet copié est le code cible, un tiret, puis le code
  du sous-projet source ; sa date de début est décalée de delta.
- Une affectation dont la ressource est inactive n'est pas copiée, ni ses
  assignations.
- Chaque entité créée par la copie a son entrée d'historique de création.
- Un chef de projet ne copie pas un projet qu'il lit sans droit d'écriture.
- La copie est toujours un projet racine.
- La priorité du projet est copiée.
- Une dépendance n'est copiée que si ses deux extrémités sont dans la copie.
- OTP (D-225, §12.2) : l'OTP propre (`otp`) du projet, des sous-projets et des activités est copié, variantes de 11.3 comprises ; la valeur héritée n'est jamais écrite.
- Charge vendue et date client (D-149) : `charge_vendue` est copiée ; `date_client` est décalée de delta comme la date validée ; décalée au-delà du 31/12/2099 : copie refusée, 422, rien n'est créé.

### 11.3 Variantes

- « Créer depuis un modèle » : copie d'un modèle, avec `est_modele` faux.
- « Enregistrer comme modèle » : copie d'un projet, avec `est_modele` vrai.
- Créer depuis un modèle : administrateur et chef de projet. Enregistrer
  comme modèle : administrateur seul. (modifié par D-265 : créer depuis un modèle, aussi le leader métier)
- Une copie avec `est_modele` vrai est réservée à l'administrateur, quelle que soit la source.

### 11.4 Cas de test

Jeu de données : celui de 5.5. Projet P, début lun 04/01/2027.

| Cas | Données | Résultat attendu |
|---|---|---|
| COPIE-1 | P : A (START, début validé 06/01, Alice assigné 2 j, réel 1 j, reste 1 j) → B (Bob 2 j), FD, délai 1. Copie avec début 01/02/2027 | A' : début validé 03/02, assigné 2 j, réel 0, reste 2 j. Dépendance A' → B' en FD, délai 1. P inchangé |
| COPIE-2 | COPIE-1 sans l'option affectations et assignations | A' et B' sans assignation ; aucune affectation projet sur la copie |
| COPIE-3 | P avec un sous-projet P1 contenant une activité C, option sous-projets activée | Copie avec un sous-projet contenant C' ; arborescence et ordre WBS identiques |
| COPIE-4 | Code cible déjà utilisé | Erreur « code déjà utilisé », rien n'est créé |
| COPIE-5 (testé aux lots 2e et 4) | P avec une saisie manuelle et une imputation d'Alice | La copie n'a ni saisie manuelle, ni imputation, ni travail planifié |
| MOD-1 (testé au lot 2a) | Modèle M inclus dans la sélection d'un calcul | M ignoré : aucun travail planifié pour M |
| MOD-2 (testé au lot 4) | Imputation sur une assignation de M | Refus |
| COPIE-5r | P de COPIE-1 avec des entrées d'historique | L'historique de la copie ne contient que les créations dues à la copie ; celui de P est inchangé |
| MOD-3 | « Créer depuis un modèle » M, début 01/02/2027 | Projet créé avec `est_modele` faux, contenu selon 11.2 |
| MOD-4 | « Enregistrer comme modèle » sur P de COPIE-1 | Modèle créé avec `est_modele` vrai, réel 0, P inchangé |

## 12. Coûts (D-225)

Découpage : tranche 1 (sous-lot couts-1) = 12.1 et 12.2 ; tranche 2 (sous-lot couts-2) = 12.3, 12.4 et les colonnes « OTP » ; une clôture et une suite complète par tranche.

### 12.1 Taux journalier

1. **Donnée** : facultative. Seul un utilisateur `est_ressource` peut avoir un taux ; sinon 422 { erreur: 'Seule une ressource a un taux journalier' }, base inchangée. Une ressource a zéro, une ou plusieurs périodes. Pas de taux horaire ; taux par équipe : §12.6 (D-258).
2. **Période** : `debut` (AAAA-MM-JJ) obligatoire, `fin` (AAAA-MM-JJ) facultative (null = période ouverte) ; `fin` antérieure à `debut` : 422 { erreur: 'La date de fin précède la date de début' } (comme une affectation). `montant` en euros : nombre > 0, au plus 999999,99, 2 décimales au plus exactement (comme la charge vendue, D-154 (12)) ; sinon 400.
3. **Chevauchement** : les périodes d'une ressource ne se chevauchent pas, bornes comprises (une période qui finit le 10 et une qui commence le 10 se chevauchent ; une période ouverte s'étend sans fin). Refus : 409 { erreur: 'Période de taux qui chevauche une autre', code: 'taux_chevauchement' }, base inchangée. Contrôle dans la transaction de l'écriture, sous verrou de la ligne utilisateur (SELECT … FOR UPDATE), sans extension PostgreSQL. Les trous entre périodes sont permis.
4. **Taux en vigueur** à une date d : le montant de la période telle que `debut` ≤ d ≤ `fin` (ou `fin` vide) ; aucun si d n'est dans aucune période. Modifié par D-258 : le taux en vigueur d'une ressource à une date d est le taux résolu de §12.6 point 3.
5. **Table** `taux_journalier` (id, utilisateur_id, debut, fin, montant numeric(8,2), CHECK montant > 0, CHECK fin ≥ debut), migration 015. Historisée comme les entités de planning (§3), entité `taux`, sans projet ; lue par `GET /api/historique?entite=taux` (administrateur).
6. **Routes** :
   - `GET /api/utilisateurs/:id/taux` → 200 `[{ id, utilisateur_id, debut, fin, montant }]`, triées par `debut` ; liste vide pour un utilisateur sans taux.
   - `POST /api/utilisateurs/:id/taux` { debut, fin?, montant } (corps strict) → 201, la période créée.
   - `PATCH /api/taux/:id` { debut?, fin?, montant? } (corps strict) → 200 ; la période résultante est contrôlée (points 2 et 3, sans compter la période elle-même).
   - `DELETE /api/taux/:id` → 204.
7. **Droits** : administrateur, lecture et écriture. Chef de projet : lecture seule (GET) des taux d'une ressource affectée à au moins un projet sur lequel il écrit (modifié par D-258 puis D-274 : écriture §12.6 point 6, hors son propre taux). Tout autre cas : 403 { erreur: 'Interdit' } ; rôle ressource : 403, même pour ses propres taux. Utilisateur ou taux inconnu, identifiant mal formé ou hors plage : 404. Ordre des refus : écriture : 401, 403, 404, 400, 422, 409 ; lecture : 401, 403 (rôle ressource), 404, 403 (chef hors de sa portée). Tout refus laisse la base inchangée. Modifié par D-258 : voir §12.6 point 6 pour l'écriture par le chef de projet. (modifié par D-265 : leader métier, 403 comme le rôle ressource, avant 404)
8. **Ressource** : PATCH /api/utilisateurs/:id avec `est_ressource: false` sur un utilisateur qui a au moins un taux : 409 { erreur: 'Utilisateur avec des taux : il reste ressource' }, base inchangée (comme les affectations, §3). Écran : « Cet utilisateur a des taux journaliers : il reste ressource. », dialogue ouvert.
9. **Écran Utilisateurs** : dans le dialogue « Modifier <nom> » d'un utilisateur ressource, pour l'administrateur, section « Taux journaliers » (h3), aide « Facultatif. Sert au calcul des coûts. ». Tableau : Du, Au (« — » si ouverte), Montant (« 600,00 € », deux décimales, virgule, espace insécable pour les milliers et avant « € », ex. « 1 234,50 € »), Actions. Ajout (champs Du, Au, Montant ; bouton « Ajouter le taux »), modification (bouton de ligne « Modifier le taux du <JJ/MM/AAAA> »), suppression (bouton de ligne « Supprimer le taux du <JJ/MM/AAAA> », confirmation) : enregistrés tout de suite, comme les dépendances du dialogue d'une activité (D-222) ; « Enregistrer » ne porte que sur les champs de l'utilisateur. Refus affiché dans le dialogue (`role="alert"`), liste inchangée : chevauchement « Cette période chevauche un autre taux. » ; fin antérieure « La date de fin précède la date de début. » ; montant invalide : `aria-invalid`, « Montant invalide. », bouton désactivé. Garde D-188 : un ajout saisi non envoyé compte comme une modification. Section absente pour un utilisateur non ressource et à la création.
10. **Onglet Affectations d'un projet**, si `peut_ecrire` : colonne « Taux du jour » = taux en vigueur à la date du jour du navigateur (format du point 9), « — » sans taux en vigueur. Données : `GET /api/utilisateurs/:id/taux` de chaque ressource affectée. Colonne absente en lecture seule. Modifié par D-260 : voir §12.6 point 12 c.

### 12.2 OTP

1. **Donnée** : champ facultatif `otp` d'un projet (modèles compris) et d'une activité ; pas sur un jalon (clé refusée, 400). Texte, espaces de bord retirés, 1 à 50 caractères ; chaîne vide (après retrait) ou null = aucun ; plus de 50 caractères : 400, base inchangée. La même valeur est permise sur plusieurs éléments.
2. **Héritage** : sans valeur propre, un élément prend celle de l'ancêtre le plus proche qui en a une : activité parente (à tous les niveaux), puis projet, puis projet parent (à tous les niveaux). La valeur propre prime sur celle des ancêtres.
3. **Lecture** : la vue d'un projet (GET /api/projets, GET /api/projets/:id, GET /api/modeles, réponses de POST et PATCH) et la vue d'une activité (GET /api/projets/:id/activites, réponses de POST et PATCH) portent `otp` (valeur propre ou null), `otp_effectif` (valeur propre ou héritée, ou null) et `otp_source` (null si valeur propre ou aucune ; sinon { type: 'projet' | 'activite', id, libelle } : libelle = code du projet, ou « <WBS> <nom> » de l'activité). Calculés à la lecture, rien de stocké.
4. **Ancêtre illisible** : `otp_effectif` est toujours renvoyé, la même valeur pour tous les lecteurs. Si l'ancêtre source est un projet que l'utilisateur ne lit pas : `otp_source` = { type: 'projet', id: null, libelle: null } ; `otp_source` ne révèle ni l'id ni le code de ce projet, et son code n'apparaît nulle part dans la réponse ; `parent_id` d'un sous-projet reste renvoyé (D-079, inchangé ; décision du porteur, D-226). (modifié par D-265 : le chef de projet lit tous les projets, le cas ne se présente plus pour lui)
5. **Écriture** : par qui écrit sur l'élément, dans les POST et PATCH existants (projets, modèles, activités) ; lisible par qui le voit. Historisé comme les autres champs ; une valeur inchangée n'est pas historisée.
6. **Table** : `projet.otp` et `activite.otp`, text nullable, CHECK longueur 1 à 50, migration 015.
7. **Dialogues** de création et de modification d'un projet (et d'un modèle) et d'une activité : champ « OTP » (texte, au plus 50 caractères) ; vide = null ; en modification, envoyé seulement s'il a changé. Sans valeur propre mais avec une valeur héritée, aide : « Hérité de <code du projet | WBS et nom de l'activité> : <valeur> » ; ancêtre illisible : « Hérité d'un projet parent : <valeur> ». À la création, l'aide reprend la valeur effective du parent choisi (projet parent, ou activité parente et projet).
8. **Copie** (§11.2, §11.3) : l'OTP propre est copié ; la valeur héritée n'est jamais écrite.

### 12.3 Calcul des coûts (tranche 2)

1. Coût d'une charge c (jours, décimales comprises : 0,5 j × 600 € = 300 €) = c × taux journalier.
2. Coût planifié d'une assignation = charge assignée × taux en vigueur à la date du jour.
3. Coût réel = coût imputé + coût du reste. Coût imputé = somme des imputations, chacune multipliée par le taux en vigueur à sa date. Coût du reste = reste à faire × taux en vigueur à la date du jour.
4. Agrégats : activité feuille = somme de ses assignations ; activité parente = somme de ses descendants ; projet = même périmètre que `projet.totaux` (D-149 : feuilles du projet seul, sans sous-projets, activités closes comprises).
5. Calculs à la lecture, rien de stocké ; fonctions pures testées par vitest.
6. Taux manquant : ressource sans aucune période : coût 0, sans avertissement. Ressource avec au moins une période, mais date (imputation ou jour même) hors de toutes : 0 pour cette part et `taux_manquant: true` sur l'activité, ses parents et le projet.
7. Visibilité : `cout_planifie`, `cout_impute`, `cout_reel`, `taux_manquant` renvoyés seulement si `peut_ecrire` (administrateur, chef du projet ou d'un projet parent) ; sinon les clés sont absentes (pas null), comme la charge vendue. Jamais visibles pour le rôle ressource. (modifié par D-265 : sous `voit_finances`, jamais visibles pour le leader métier)
8. Modifié par D-258 : le taux en vigueur est le taux résolu (§12.6 point 3). Point 6 lu avec ce taux : `taux_manquant` (marque « incomplet ») seulement pour une part dont la date n'a aucun taux résolu, d'une ressource qui a au moins une période propre ou une période de son équipe actuelle ; une ressource sans aucune des deux : 0, sans marque.

**Cas** (D-229). Données communes : Alice : 600 € du 01/01/2027 au 31/01/2027, puis 700 € à partir du 01/02/2027 (période ouverte) ; Bob : aucun taux ; Carol : 500 € du 01/03/2027 au 31/03/2027. « Jour » = date du jour passée en paramètre.

| Cas | Données | Résultat attendu |
|---|---|---|
| COUT-1 | Alice assignée 5 j, aucune imputation, reste 5 j ; jour 15/01/2027 | planifié 3000 ; imputé 0 ; réel 3000 ; taux manquant non |
| COUT-2 | Alice assignée 5 j, imputations 1 j le 31/01/2027 et 1 j le 01/02/2027, reste 3 j ; jour 02/02/2027 | planifié 3500 ; imputé 1300 ; réel 3400 ; taux manquant non |
| COUT-3 | Alice assignée 0,5 j, reste 0,5 j ; jour 15/01/2027 | planifié 300 ; imputé 0 ; réel 300 ; taux manquant non |
| COUT-4 | Bob assigné 4 j, imputation 1 j le 10/01/2027, reste 3 j ; jour 15/01/2027 | planifié 0 ; imputé 0 ; réel 0 ; taux manquant non |
| COUT-5 | Carol assignée 2 j, imputation 1 j le 15/03/2027, reste 1 j ; jour 02/04/2027 | planifié 0 ; imputé 500 ; réel 500 ; taux manquant oui |
| COUT-6 | Projet (OTP « OTP-A »), parent P (WBS 1) ; F1 (1.1) : Alice assignée 5 j, reste 5 j ; F2 (1.2) : Carol assignée 2 j, reste 2 j ; jour 15/01/2027 | F1 : planifié 3000, réel 3000, taux manquant non ; F2 : planifié 0, réel 0, taux manquant oui ; P et projet : planifié 3000, imputé 0, réel 3000, taux manquant oui |
| COUT-7 | Une activité : Alice assignée 2 j, reste 2 j, et Bob assigné 3 j, reste 3 j ; jour 15/01/2027 | planifié 1200 ; imputé 0 ; réel 1200 ; taux manquant non |

### 12.4 Affichage et export (tranche 2)

1. Gantt d'un projet et Accueil : colonnes au choix « Coût planifié », « Coût réel » (si `peut_ecrire`) et « OTP » (valeur effective), masquées par défaut (menu « Colonnes », D-212). Montants au format « 1 234,50 € » ; si `taux_manquant`, marque « incomplet » avec `title` « Taux manquant ».
2. Région « Totaux du projet » : « · Coût planifié X € · Coût réel Y € » ajouté.
3. Export : `GET /api/projets/:id/couts/export`. Droits : si `peut_ecrire` ; sinon 403 ; projet illisible : 404. Fichier `couts-<code>-AAAA-MM-JJ.csv`, format commun de §7 (Exports CSV, point 2). Colonnes : WBS;Activité;OTP;Charge assignée;Charge réelle;Reste;Coût planifié;Coût imputé;Coût réel;Taux manquant. Une ligne par activité (feuilles et parents) dans l'ordre WBS, puis une ligne « Total ». Montants sans symbole. Bouton « Exporter les coûts » dans le Gantt d'un projet si `peut_ecrire`. La règle « La charge vendue n'est jamais exportée » (§7) est inchangée. (modifié par D-265 : leader métier, 403 avant 404 ; pour le chef de projet, tout projet est lisible : hors de sa portée, 403)
4. Parcours complet e2e étendu en tranche 2.
5. Porteurs des clés de coût (D-233 (f)) : `cout_planifie`, `cout_impute`, `cout_reel`, `taux_manquant` et `projet.totaux` ne sont portées que par `GET /api/projets/:id/gantt` (l'Accueil le lit). Les routes de liste (activités, jalons, projets) et les POST et PATCH d'activités ne les portent pas. L'onglet Planning n'affiche aucun coût.

**Exemple d'export** (D-229) : export du projet de COUT-6.

```
WBS;Activité;OTP;Charge assignée;Charge réelle;Reste;Coût planifié;Coût imputé;Coût réel;Taux manquant
1;P;OTP-A;7;0;7;3000;0;3000;oui
1.1;F1;OTP-A;5;0;5;3000;0;3000;non
1.2;F2;OTP-A;2;0;2;0;0;0;oui
Total;;;7;0;7;3000;0;3000;oui
```

### 12.5 Pilotage (pilotage, D-243)

1. **Écran « Pilotage »** (tranche 2) : l'entrée « Pilotage » remplace « Plan de charge » dans le menu, même place, mêmes rôles (administrateur, chef de projet ; rôle ressource redirigé vers /mes-taches). Onglets « Plan de charge » et « Coûts », au modèle des onglets de la fiche projet. Adresse `/pilotage?onglet=charge|couts&debut=AAAA-MM&equipe=…` (onglet inconnu ou absent = charge). `/plan-de-charge` redirige vers `/pilotage?onglet=charge` en conservant `debut` et `equipe`. Onglet « Plan de charge » : contenu de §7 « Plan de charge » et « Exports CSV » point 5, inchangé. Filtres communs aux deux onglets, conservés au changement d'onglet.
2. **Calcul mensuel** (tranche 1). Pour une ressource, un projet et un mois : réel = Σ imputations du mois × taux en vigueur au jour de l'imputation (tout statut de feuille) ; planifié = Σ travail planifié du mois (dernier calcul) × taux en vigueur au jour planifié ; coût = réel + planifié. Taux (§12.1 point 4), conversions D-044 (5), montants exacts au centime, sans arrondi intermédiaire. `taux_manquant` : vrai si une charge comptée tombe un jour hors de toute période d'une ressource qui a au moins une période ; ressource sans aucune période : 0, sans marque (§12.3 point 6). Agrégats : ligne de projet = somme de ses ressources ; total = somme des 12 mois ; `taux_manquant` d'un agrégat = OU de ses parties. Écart à connaître : sur une période, ce coût peut différer du « Coût réel » du Gantt, qui valorise le reste à faire au taux du jour (§12.3).
3. **Route** (tranche 1) : `GET /api/couts?debut=AAAA-MM[&equipe=<id>|aucune]`. Paramètres, 401, 403 `{ erreur: 'Interdit' }` pour le rôle ressource, 400 et leur ordre : ceux de `GET /api/plan-de-charge` (§7). N'écrit rien. Réponse : `{ mois: ['AAAA-MM' ×12], projets: [{ projet_id, code, nom, otp_effectif, clos, mois: [{ mois, reel, planifie, cout, taux_manquant }], total: { reel, planifie, cout, taux_manquant }, ressources: [{ ressource_id, nom, actif, mois: [...], total: {...} }] }], total: { mois: [...], total: {...} } }`. Montants : nombres à 2 décimales au plus. (modifié par D-265 : leader métier, 403 `{ erreur: 'Interdit' }` comme le rôle ressource, export compris)
4. **Périmètre** : projets ordinaires (jamais de modèle), clos compris, ayant une charge (imputation ou travail planifié) dans la période, même à coût nul. Sous-projets : une ligne chacun, sans cumul dans le parent. Ressources d'un projet : celles qui ont une charge sur ce projet dans la période, actives ou non. Filtre équipe : seules les charges des ressources de l'équipe (appartenance actuelle) ; « aucune » : sans équipe ; équipe inconnue : `projets` vide. Tri : projets par code (casse ignorée) puis id ; ressources par nom (casse ignorée) puis id. Droits : l'administrateur voit tout ; le chef de projet ne voit que les projets sur lesquels il écrit (`peut_ecrire`), sans ligne regroupée ; `total` porte sur les projets renvoyés.
5. **Export** (tranche 1) : `GET /api/couts/export`, mêmes paramètres, droits, refus et ordre. Fichier `couts-AAAA-MM.csv`, format commun (§7 « Exports CSV » point 2). Colonnes : Projet;OTP;Ressource;MM/AAAA ×12;Total;Taux manquant. Par projet, dans l'ordre de l'API : une ligne Ressource = « Total », puis une ligne par ressource (suffixe « (inactif) » si inactive). Dernière ligne : Projet = « Total », OTP et Ressource vides. Projet = « <code> · <nom> » ; OTP = valeur effective, vide sinon ; valeurs = coût, sans symbole ; Taux manquant = oui ou non. Aucun projet : en-tête puis ligne « Total » à 0.

   Exemple (`debut=2027-01`, données du point 6) ; lignes séparées par CRLF, BOM en tête :

   ```
   Projet;OTP;Ressource;01/2027;02/2027;03/2027;04/2027;05/2027;06/2027;07/2027;08/2027;09/2027;10/2027;11/2027;12/2027;Total;Taux manquant
   P1 · Projet un;OTP-A;Total;750;1050;500;0;0;0;0;0;0;0;0;0;2300;oui
   P1 · Projet un;OTP-A;Alice;750;1050;0;0;0;0;0;0;0;0;0;0;1800;non
   P1 · Projet un;OTP-A;Bob;0;0;0;0;0;0;0;0;0;0;0;0;0;non
   P1 · Projet un;OTP-A;Carol;0;0;500;0;0;0;0;0;0;0;0;0;500;oui
   P1.1 · Sous-projet un;OTP-A;Total;600;0;0;0;0;0;0;0;0;0;0;0;600;non
   P1.1 · Sous-projet un;OTP-A;Alice;600;0;0;0;0;0;0;0;0;0;0;0;600;non
   Total;;;1350;1050;500;0;0;0;0;0;0;0;0;0;2900;oui
   ```
   Aucun projet : en-tête, puis `Total;;;0;0;0;0;0;0;0;0;0;0;0;0;0;non`.
6. **Cas** (tranche 1, `debut=2027-01`, administrateur). Données de §12.3 : Alice 600 € du 01/01/2027 au 31/01/2027, puis 700 € à partir du 01/02/2027 ; Bob sans taux ; Carol 500 € du 01/03/2027 au 31/03/2027. Projet P1 (OTP « OTP-A ») :
   - PIL-A : Alice, imputé 1 j le 29/01/2027 et 1 j le 01/02/2027, planifié 0,5 j le 15/02/2027 → janvier : réel 600, planifié 0, coût 600 ; février : réel 700, planifié 350, coût 1050 ; total 1650 ; taux manquant non.
   - PIL-B : Alice, planifié 0,25 j le 05/01/2027 → janvier : coût 150.
   - PIL-C : Bob, imputé 1 j le 11/01/2027, planifié 2 j le 10/03/2027 → coûts 0 partout, taux manquant non, ligne présente.
   - PIL-D : Carol, planifié 1 j le 15/03/2027 et 1 j le 02/04/2027 → mars : 500 ; avril : 0 et taux manquant oui ; projet : avril et total en taux manquant oui.
   - PIL-E : sous-projet P1.1 (OTP hérité « OTP-A ») avec Alice planifiée 1 j le 04/01/2027 → ligne propre à 600 en janvier, rien ajouté à P1.
7. **Gantt d'un projet** (tranche 2) : le bouton « Exporter les coûts » quitte la barre d'outils et se place au bout de la région « Totaux du projet », mêmes conditions (`peut_ecrire`) ; §12.4 point 3 inchangé par ailleurs.
8. **Onglet « Coûts »** (tranche 2) : filtres de l'onglet Plan de charge ; tableau « Coûts », colonne « Projet » sticky (« <code> · <nom> », OTP effectif en texte secondaire), bouton « Déplier <code> » / « Replier <code> » (tout replié), lignes de ressource indentées ; 12 colonnes « MM/AAAA » puis « Total » ; ligne finale « Total » ; cellule au format « 1 234,50 € », `title` « Réel X €, planifié Y € », marque « incomplet » (`title` « Taux manquant ») si `taux_manquant`. Bouton « Exporter CSV » (export du point 5, filtres courants). Vide : « Aucun coût sur la période. » ; échec : « Impossible de charger les coûts. ». Zone `role="region"`, `aria-label` « Coûts », focalisable, défilement horizontal ; la page ne défile pas en horizontal à 1440 ni à 1024 px. Parcours complet e2e étendu.
9. **Découpage** : tranche 1 = points 2 à 6 ; tranche 2 = points 1, 7 et 8 ; une clôture et une suite complète par tranche.
10. Modifié par D-258 : le taux en vigueur est le taux résolu (§12.6 point 3) ; `taux_manquant` et la marque « incomplet » suivent §12.3 point 8.

### 12.6 Taux par équipe et taux du jour (taux, D-258)

1. **Donnée** : une équipe a zéro, une ou plusieurs périodes de taux journalier. Mêmes règles que §12.1 points 2 et 3 : `debut` obligatoire, `fin` facultative ; `fin` < `debut` → 422 { erreur: 'La date de fin précède la date de début' } ; `montant` > 0, au plus 999999,99, 2 décimales au plus, sinon 400 ; pas de chevauchement, bornes comprises, 409 { erreur: 'Période de taux qui chevauche une autre', code: 'taux_chevauchement' }, contrôle dans la transaction sous verrou de la ligne `equipe` (SELECT … FOR UPDATE) ; trous permis.
2. **Table** `taux_equipe` (id, equipe_id référence equipe, debut, fin, montant numeric(8,2), CHECK montant > 0, CHECK fin ≥ debut), migration 017. Historisée comme `taux` (§12.1 point 5), entité `taux_equipe`, lue par `GET /api/historique?entite=taux_equipe` (administrateur).
3. **Taux résolu** d'un utilisateur `est_ressource` à une date d, jour par jour : le montant de sa propre période qui couvre d s'il y en a une ; sinon celui de la période de son équipe actuelle (`utilisateur.equipe_id`) qui couvre d ; sinon aucun. L'appartenance à une équipe n'est pas historisée : un changement d'équipe change le taux résolu de toutes les dates, passées comprises (décision du porteur, D-258). Un utilisateur non `est_ressource` n'a jamais de taux résolu.
4. **Routes d'équipe** :
   - `GET /api/equipes/:id/taux` → 200 `[{ id, equipe_id, debut, fin, montant }]`, triées par `debut` ; liste vide sans taux.
   - `POST /api/equipes/:id/taux` { debut, fin?, montant } (corps strict) → 201, la période créée.
   - `PATCH /api/taux-equipe/:id` { debut?, fin?, montant? } (corps strict) → 200 ; la période résultante est contrôlée comme au point 1, sans compter la période elle-même.
   - `DELETE /api/taux-equipe/:id` → 204.
5. **Droits des taux d'équipe** : administrateur, lecture et écriture. Chef de projet : lecture seule (GET) des taux d'une équipe dont au moins un membre est affecté à un projet sur lequel il écrit ; écriture 403. Tout autre cas 403 { erreur: 'Interdit' } ; rôle ressource 403. Équipe ou taux inconnu, identifiant mal formé ou hors plage : 404. Ordre des refus : celui de §12.1 point 7. Tout refus laisse la base inchangée. (modifié par D-265 : leader métier, 403 comme le rôle ressource)
6. **Écriture des taux propres par le chef de projet** (révise D-225 ; modifié par D-274 : jamais son propre taux, §8 securite-2 point 3) : `POST /api/utilisateurs/:id/taux`, `PATCH` et `DELETE /api/taux/:id` sont permis au chef de projet pour une ressource affectée à au moins un projet sur lequel il écrit ; hors de cette portée : 403 { erreur: 'Interdit' }, base inchangée. Ordre des refus en écriture : 401, 403 (rôle ressource), 404, 403 (chef hors de sa portée), 400, 422, 409. Administrateur inchangé. (modifié par D-265 : leader métier, 403 comme le rôle ressource)
7. **Suppression d'une équipe** qui a au moins une période de taux : 409 { erreur: 'Équipe avec des taux' }, base inchangée, après les refus existants de `DELETE /api/equipes/:id`.
8. **Taux du jour** : `GET /api/taux/du-jour?date=AAAA-MM-JJ` (date du navigateur, obligatoire, date réelle ; sinon 400) → 200 `[{ utilisateur_id, montant, source }]`, une entrée par utilisateur `est_ressource` de la portée, triées par `utilisateur_id` ; `montant` = taux résolu à cette date (point 3) ou null ; `source` = 'propre', 'equipe' ou null. Portée : administrateur, toutes les ressources ; chef de projet, les ressources affectées à au moins un projet sur lequel il écrit ; rôle ressource : 403. Une seule lecture des taux pour toute la réponse (pas de requête par ressource). Les ressources inactives sont incluses. La portée du chef est celle de la lecture des taux (§12.1 point 7), calculée par la même fonction. (modifié par D-265 : leader métier, 403 comme le rôle ressource)
9. **Coûts** : §12.3 (Gantt, « Totaux du projet », export des coûts) et §12.5 (`GET /api/couts`, export) utilisent le taux résolu. Le calcul des coûts lit les taux propres et d'équipe en une seule requête pour l'ensemble des ressources concernées (lève le N+1 de D-244 (4)).
10. Écrans : point 12 (taux-2, D-260).
11. **Cas** (D-258), pour les tests de la tranche 1. Équipe « Dev » : 400 € du 01/01/2027 au 30/06/2027. Équipe « Ops » : 300 € à partir du 01/01/2027 (ouverte). Alice (ressource, Dev) : 600 € du 01/01/2027 au 31/01/2027 et 700 € du 01/03/2027 au 31/03/2027. Dave (ressource, Dev) : aucun taux propre. Erin (ressource, sans équipe) : aucun taux. Zoé (non ressource, Dev).

| Cas | Données | Résultat attendu |
|---|---|---|
| TRS-A | Alice au 15/01/2027 | 600, source propre |
| TRS-B | Alice au 15/02/2027 (trou du propre) | 400, source equipe |
| TRS-C | Alice au 15/03/2027 (le propre couvre une partie de la période d'équipe) | 700, source propre |
| TRS-D | Alice au 15/07/2027 ; Dave au 15/07/2027 | aucun (montant null, source null) |
| TRS-E | Dave au 15/02/2027 | 400, source equipe |
| TRS-F | Erin à toute date | aucun |
| TRS-G | Zoé | aucun taux résolu ; absente du taux du jour |
| TRS-H | Dave passé de Dev à Ops | 300, source equipe, au 15/02/2027 comme au 15/07/2027 |
| TRS-I | Projet « PT » (sans OTP), jour 15/02/2027 : activité A1 (WBS 1), Alice assignée 2 j, imputations 1 j le 15/01/2027 et 1 j le 15/02/2027, reste 1 j ; activité A2 (WBS 2), Dave assigné 5 j, imputation 1 j le 15/01/2027, reste 4 j | A1 : planifié 800, imputé 1000, réel 1400, taux manquant non ; A2 : planifié 2000, imputé 400, réel 2000, taux manquant non ; projet : planifié 2800, imputé 1400, réel 3400, taux manquant non |
| TRS-J | TRS-I, jour 15/07/2027 | A2 : planifié 0, imputé 400, réel 400, taux manquant oui ; projet : taux manquant oui |
| TRS-K | TRS-I, Dave passé de Dev à Ops, jour 15/02/2027 | A2 : planifié 1500, imputé 300, réel 1500, taux manquant non |
| TRS-L | Erin assignée 3 j, reste 3 j, sur une activité A3 (WBS 3) de PT, jour 15/02/2027 | A3 : planifié 0, imputé 0, réel 0, taux manquant non |
| TRS-M | Pilotage `debut=2027-01`, projet PT : imputations de TRS-I ; travail planifié Alice 0,5 j le 16/02/2027, Dave 1 j le 15/03/2027 et 1 j le 15/07/2027 | Alice : janvier réel 600, coût 600 ; février réel 400, planifié 200, coût 600 ; total réel 1000, planifié 200, coût 1200, taux manquant non. Dave : janvier réel 400, coût 400 ; mars planifié 400, coût 400 ; juillet 0 et taux manquant oui ; total réel 400, planifié 400, coût 800, taux manquant oui. Projet : janvier 1000 ; février 600 ; mars 400 ; juillet 0, taux manquant oui ; total réel 1400, planifié 600, coût 2000, taux manquant oui |
| TRS-N | TRS-M, Dave passé de Dev à Ops | Dave : janvier réel 300 ; mars planifié 300 ; juillet planifié 300 ; total réel 300, planifié 600, coût 900, taux manquant non |

12. **Écrans (taux-2, D-260)** :
    a. Section partagée « Taux journaliers » : le composant de §12.1 point 9 (tableau Du, Au, Montant, Actions ; ajout, modification, suppression enregistrés tout de suite ; refus en `role="alert"` ; garde D-188) sert pour une ressource et pour une équipe, mêmes libellés et mêmes messages.
    b. Onglet « Équipes » de l'écran Utilisateurs (administrateur) : bouton de ligne « Taux de <nom> », qui ouvre le dialogue « Taux de l'équipe <nom> » contenant la section (a) sur `GET`, `POST /api/equipes/:id/taux`, `PATCH` et `DELETE /api/taux-equipe/:id` ; aide « Facultatif. S'applique aux membres ressources sans taux propre à la date. » ; bouton « Fermer ». Suppression d'une équipe refusée pour taux (409 'Équipe avec des taux') : « Cette équipe a des taux : supprimez-les d'abord. », confirmation laissée ouverte, rien de modifié.
    c. Onglet « Affectations » d'un projet, si `peut_ecrire` : colonne « Taux du jour » lue par une seule requête `GET /api/taux/du-jour?date=<date du jour du navigateur>` (plus de GET par ressource) ; affichage « 600,00 € » (source propre), « 400,00 € (équipe) » (source equipe), « — » (aucun). Bouton de ligne « Modifier les taux de <nom> », qui ouvre le dialogue « Taux de <nom> » avec la section (a) sur les taux propres de la ressource ; aide « Facultatif. Sert au calcul des coûts. Sans taux propre à une date, le taux de son équipe s'applique. » ; bouton « Fermer » ; à la fermeture, la colonne est relue. Absents en lecture seule.
    d. Liste de l'onglet « Utilisateurs » (administrateur) : colonne « Taux du jour » après « Équipe », même requête et même format qu'en (c) ; « — » pour un utilisateur non ressource. Relue après l'enregistrement d'un taux dans « Modifier <nom> ». Le retour sur l'onglet « Utilisateurs » relit la liste.
    e. Format des montants : celui de §12.1 point 9 (« 1 234,50 € », espaces insécables).

## 13. Version de l'application (D-231)

1. **Numérotation.** `X.Y.Z` dans le `package.json` racine (et la racine de `package-lock.json`), seule source. La version monte une fois par clôture de journée : Y+1 (Z remis à 0) si la journée apporte au moins un lot fonctionnel, sinon Z+1. Le numéro est donné dans le prompt de clôture. Tag git `vX.Y.Z` sur le commit de `main` de la clôture. Départ : 1.0.0.
2. **Commit court.** Variable `COMMIT`. Dockerfile : `ARG COMMIT=inconnu` dans l'étape de construction (inscrit dans le front) et dans l'image d'exécution (`ENV COMMIT` pour l'API). docker-compose.yml : `build` avec `args: COMMIT: ${COMMIT:-inconnu}`. Hors Docker (dev, tests) : `COMMIT` de l'environnement, sinon « inconnu ». Aucune lecture de `.git` à l'exécution ni à la construction de l'image.
3. **API.** `GET /api/version`, sans session, renvoie 200 `{ version, commit }`. Toute réponse sous `/api` (succès, 401, 404, erreurs) porte l'en-tête `X-PlanerSource-Version: <version>`. Version lue une fois au démarrage dans le `package.json` racine (même chemin en dev, en tests et dans l'image).
4. **Front.** Version et commit inscrits à la compilation par Vite (`define`). En bas de la barre latérale, pour tous les rôles (vue restreinte de la ressource comprise) : « v<version> · <commit> ».
5. **Bandeau.** Le client API compare l'en-tête `X-PlanerSource-Version` de chaque réponse à la version du front. S'ils diffèrent (version seule, pas le commit), un bandeau non bloquant s'affiche en haut de page : « Nouvelle version disponible » et un bouton « Recharger ». Pas de bandeau si l'en-tête est absent. Le bouton recharge la page en passant par la garde des modifications non enregistrées (D-172, `sortir`).
6. Aucune migration, aucune dépendance nouvelle.
