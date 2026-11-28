# Audit de sécurité

## Audit du 2026-11-27 (premier audit, lot securite, D-272)

- Commit audité : eb9d644 (branche travail).
- Périmètre : dépendances, code (API et web), architecture (Docker, installation sans Docker, sauvegardes, CI, configuration), choix des briques.
- Méthode : lecture du code route par route ; `npm audit` (exécution et outillage) ; `npm run lint:securite` ; `npm view` ; `git grep` et `git log -p` ciblés sur l'historique. Aucun test lancé, aucune base touchée.

### Synthèse

1. Socle sain : sessions par jeton aléatoire haché en base, cookie HttpOnly + SameSite=Lax, argon2id (64 Mio, t=3, p=4), SQL toujours paramétré, contrôle d'accès centralisé (`verdictProjet`) appliqué à chaque route, exports CSV protégés contre l'injection de formules, aucune faille connue dans les dépendances d'exécution, aucun secret dans l'historique git.
2. Un constat haut : le compte initial admin / admin reste utilisable indéfiniment (simple bandeau, aucun changement imposé).
3. Constats moyens : historique de projet qui montre la charge vendue au leader métier ; extension de portée du chef par auto-affectation (taux, auto-validation) ; HTTP en clair par défaut ; rôle PostgreSQL superutilisateur sous Docker ; aucune journalisation ; mot de passe d'un caractère accepté.
4. Constats bas : en-têtes de sécurité absents, CSRF des POST sans corps depuis un site « same-site », confiance totale dans X-Forwarded-For, nom de fichier d'export, CI, sauvegardes, outillage, installation systemd.

### Tableau des constats

| Id | Titre | Gravité | Effort |
| --- | --- | --- | --- |
| SEC-1 | Compte initial admin / admin sans changement imposé | haute | XS |
| SEC-2 | Historique d'un projet : charge vendue visible du leader métier | moyenne | S |
| SEC-3 | Chef de projet : portée étendue par auto-affectation (taux de toute ressource, auto-validation) | moyenne | M |
| SEC-4 | HTTP en clair par défaut (cookie non `Secure`, port exposé sur toutes les interfaces) | moyenne | S |
| SEC-5 | Docker : l'application se connecte avec le superutilisateur PostgreSQL | moyenne | M |
| SEC-6 | Aucune journalisation (journal Fastify désactivé) ; erreurs 500 renvoyées avec le message brut | moyenne | S |
| SEC-7 | Politique de mot de passe : un caractère suffit (D-076) ; corrigé dans securite-2 (D-274) | moyenne | XS |
| SEC-8 | Aucun en-tête de sécurité HTTP ; version exposée sans authentification | basse | S |
| SEC-9 | CSRF : aucun contrôle d'origine ; POST sans corps exploitables depuis un site « same-site » | basse | S |
| SEC-10 | `TRUST_PROXY=1` fait confiance à toute la chaîne X-Forwarded-For | basse | XS |
| SEC-11 | En-tête Content-Disposition construit avec le code du projet | basse | XS |
| SEC-12 | CI : permissions du jeton non restreintes, actions épinglées par étiquette | basse | XS |
| SEC-13 | Sauvegardes non chiffrées, droits par défaut, mot de passe en ligne de commande | basse | S |
| SEC-14 | Outillage : minimatch (modérée) via typescript-eslint | basse | XS |
| SEC-15 | Installation sans Docker : service propriétaire de son code, dépendances de développement installées | basse | S |

### SEC-1 Compte initial admin / admin sans changement imposé

- **Gravité** : haute.
- **Preuve** : `packages/api/src/auth/dev-admin.ts:18-21` (insertion du compte `admin` avec le mot de passe `admin`, sans `doit_changer_mot_de_passe`) ; `packages/api/migrations/016_doit_changer_mot_de_passe.sql:2` (défaut `false`) ; `packages/api/src/auth/dev-admin.ts:54-57` (créé quel que soit `NODE_ENV`) ; `packages/api/src/routes/auth.ts:72-74` (seul effet : l'indicateur `mot_de_passe_origine`, donc un bandeau) ; `docs/installation.md:36-38`. En développement, l'API écoute sur toutes les interfaces (`packages/api/src/server.ts:33`) avec le même compte.
- **Risque** : installation faite, mot de passe jamais changé (le bandeau n'empêche rien) : tout poste du réseau qui atteint le port 8080 se connecte administrateur au premier essai (le limiteur n'intervient qu'après 5 échecs), crée des comptes, lit tous les taux et coûts, modifie les mots de passe.
- **Correction proposée** : poser `doit_changer_mot_de_passe = true` à l'insertion du compte initial (le contrôle commun de `app.ts:114-120` et l'écran `ChangementMotDePasse` existent déjà, D-254). Option plus forte, au choix du porteur : mot de passe initial aléatoire affiché une fois dans le journal de démarrage. Tests sous tag de D-138 à revoir (règle D-031).
- **Effort** : XS.

### SEC-2 Historique d'un projet : charge vendue visible du leader métier

- **Gravité** : moyenne.
- **Preuve** : `packages/api/src/planning/elements.ts:58` (l'instantané d'activité contient `charge_vendue`) ; `packages/api/src/planning/historique.ts:40-49` (exclusions : seulement les dates planifiées, drapeaux, `est_parent`, fériés) ; `packages/api/src/routes/historique.ts:17-19` (renvoie les lignes brutes à quiconque écrit sur le projet, donc au leader, SPEC §2 D-265 point 2 et DR-25).
- **Risque** : le leader métier, qui « ne voit aucun montant de vente » (D-265 (3)), lit dans `GET /api/projets/:id/historique` chaque création et chaque modification de `charge_vendue` (champ, valeur avant, valeur après) : la règle de confidentialité est contournée par une route de lecture permise.
- **Correction proposée** : dans la route, si `voitFinances(user, peutEcrire)` est faux, retirer les lignes de modification dont `champ` vaut `charge_vendue` et la clé `charge_vendue` des objets `avant` et `apres` des créations et suppressions d'activité. Point de SPEC à compléter (D-265 point 3 ne cite pas l'historique).
- **Effort** : S.

### SEC-3 Chef de projet : portée étendue par auto-affectation

- **Gravité** : moyenne (règle de la SPEC, à arbitrer par le porteur).
- **Preuve** : un chef crée un projet dont il est chef (`packages/api/src/routes/projets.ts:179-190`), y affecte toute ressource active (`packages/api/src/routes/affectations.ts:56-62`, seul contrôle : ressource active) ; la portée des taux est « ressource affectée à un projet où il écrit » (`packages/api/src/planning/taux.ts:71-92`), en lecture et en écriture (`packages/api/src/routes/taux.ts:56-57`, SPEC §12.6 point 6). Validation : `packages/api/src/planning/feuilles.ts:447-449` autorise un chef à valider les lignes de ses projets, y compris sur sa propre feuille s'il est ressource.
- **Risque** : tout chef de projet peut lire et modifier le taux journalier de n'importe quelle ressource (taux global, qui change les coûts de tous les projets des autres chefs) en deux requêtes ; un chef ressource peut valider ses propres imputations. Les écritures sont historisées, ce qui limite le risque à un abus de droits interne.
- **Correction proposée** : décision du porteur. Options : (a) écriture des taux propres réservée à l'administrateur ; (b) portée des taux limitée aux affectations faites par un administrateur ou antérieures ; (c) refus de valider sa propre feuille (403), sauf administrateur.
- **Effort** : M.

### SEC-4 HTTP en clair par défaut

- **Gravité** : moyenne.
- **Preuve** : `.env.production.example` (`COOKIE_SECURE=0` par défaut) ; `docker-compose.yml:66-67` (port publié sur toutes les interfaces) ; `docs/installation.md:36` et `:52` (accès `http://<serveur>:<PORT>`, HTTPS présenté comme nécessaire seulement pour Internet) ; `packages/api/src/auth/session.ts:50`.
- **Risque** : sur un réseau local partagé (Wi-Fi, VLAN bureautique), mots de passe et cookie de session circulent en clair ; une capture donne une session valable 12 h.
- **Correction proposée** : documentation : HTTPS recommandé aussi en intranet (proxy avec certificat interne), `COOKIE_SECURE=1` et `PORT=127.0.0.1:8080` présentés comme configuration normale ; `COOKIE_SECURE=0` réservé au premier essai. Option : avertissement au démarrage quand `NODE_ENV=production` et `COOKIE_SECURE=0`, sur le modèle de `avertissementsConfiguration` (`packages/api/src/config.ts:33`).
- **Effort** : S.

### SEC-5 Docker : superutilisateur PostgreSQL

- **Gravité** : moyenne.
- **Preuve** : `docker-compose.yml:44-46` (`POSTGRES_USER` de l'image officielle = superutilisateur) et `:63` (même compte dans `DATABASE_URL` de l'application). L'installation sans Docker crée au contraire un rôle propriétaire non superutilisateur (`docs/installation.md:183-184`).
- **Risque** : aucune injection SQL constatée, mais toute faille future (ou une dépendance compromise) donne les droits superutilisateur : lecture de toutes les bases du serveur, `COPY ... TO PROGRAM` donc exécution de commandes dans le conteneur de la base.
- **Correction proposée** : script d'initialisation du conteneur `db` (`/docker-entrypoint-initdb.d`) qui crée un rôle `planersource` non superutilisateur, propriétaire de la base ; l'application s'y connecte. Le superutilisateur ne sert plus qu'aux sauvegardes et restaurations.
- **Effort** : M.

### SEC-6 Aucune journalisation ; erreurs 500 brutes

- **Gravité** : moyenne.
- **Preuve** : `packages/api/src/app.ts:96` (`Fastify({ trustProxy })`, sans `logger` : journal désactivé) ; aucun `setErrorHandler` dans `packages/api/src`. Le gestionnaire par défaut de Fastify renvoie `message: error.message` pour une erreur 500 (`node_modules/fastify/lib/error-handler.js:110-114`).
- **Risque** : aucune trace des connexions, des échecs, des blocages du limiteur ni des erreurs 500 : une attaque par essais de mots de passe ou un abus de droits ne laisse rien dans `docker compose logs` ni `journalctl`. Une erreur PostgreSQL non prévue renvoie au client son message (noms de tables et de contraintes).
- **Correction proposée** : `logger: { level: 'info', redact: ['req.headers.cookie', 'req.headers.authorization'] }` (Pino, déjà dépendance de Fastify, MIT) ; journal explicite des connexions réussies et échouées (identifiant, IP, jamais le mot de passe) ; `setErrorHandler` qui journalise et répond 500 `{ erreur: 'Erreur interne' }`.
- **Effort** : S.

### SEC-7 Politique de mot de passe : un caractère suffit

- **Gravité** : moyenne.
- **Preuve** : `packages/api/src/auth/schemas.ts:5` (`z.string().min(1)`) ; `packages/api/src/routes/auth.ts:32` ; décision D-076.
- **Risque** : mots de passe d'un à quatre caractères possibles ; le limiteur (5 échecs par couple IP et identifiant, 50 par IP, 15 min, en mémoire) ralentit sans empêcher un essai distribué depuis plusieurs postes, et se remet à zéro au redémarrage.
- **Correction proposée** : décision du porteur (D-076 à réviser) : longueur minimale (12 recommandés), sans autre règle de composition ; ou au moins pour le rôle administrateur.
- **Effort** : XS.

### SEC-8 Aucun en-tête de sécurité HTTP ; version exposée

- **Gravité** : basse.
- **Preuve** : aucune occurrence de `helmet`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` dans `packages/api/src` ; `packages/api/src/app.ts:67-76` (fichiers servis par sirv sans ces en-têtes) ; `packages/api/src/app.ts:100-106` (`GET /api/version` sans authentification et en-tête `X-PlanerSource-Version`).
- **Risque** : pas de défense en profondeur contre un XSS futur (aucun XSS constaté : pas de `dangerouslySetInnerHTML`, liens construits en interne) ; page encadrable par un site du même domaine (le cookie Lax n'est pas envoyé dans un cadre d'un autre site, d'où la gravité basse) ; version exacte connue de tout poste du réseau.
- **Correction proposée** : `@fastify/helmet` (MIT, 13.2.0, vérifié par `npm view`) ou en-têtes posés à la main : CSP `default-src 'self'; frame-ancestors 'none'` (à valider sur le build Vite), `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`. Version : à garder (D-231) ou à réserver aux sessions.
- **Effort** : S.

### SEC-9 CSRF : aucun contrôle d'origine

- **Gravité** : basse.
- **Preuve** : `packages/api/src/auth/session.ts:49` (seule défense : `SameSite=Lax`) ; routes POST sans corps : `packages/api/src/routes/feuilles.ts:89-118` (`soumettre`, `rappeler`, `valider`, `devalider`), `packages/api/src/routes/auth.ts:78` (logout). Fastify accepte `text/plain` par défaut.
- **Risque** : Lax bloque les sites tiers, mais pas un autre site du même domaine enregistrable (autre application intranet, page d'un sous-domaine) : un formulaire auto-soumis y valide ou dévalide une feuille au nom du chef connecté. Les routes à corps JSON sont protégées en pratique (corps texte refusé par zod).
- **Correction proposée** : sur toute méthode autre que GET et HEAD sous `/api`, refuser (403) si `Sec-Fetch-Site` vaut `cross-site` ou `same-site`, ou si `Origin` est présent et différent de l'hôte ; ou exiger `Content-Type: application/json` sur tous les POST.
- **Effort** : S.

### SEC-10 Confiance totale dans X-Forwarded-For

- **Gravité** : basse.
- **Preuve** : `packages/api/src/app.ts:96` (`trustProxy: true` : toute la chaîne est crue, l'adresse retenue est la plus à gauche).
- **Risque** : avec Caddy (documenté) l'en-tête entrant est remplacé, donc sans effet ; derrière un proxy qui ajoute à l'en-tête existant (nginx et `proxy_add_x_forwarded_for`), le client choisit son adresse et contourne le limiteur de connexion.
- **Correction proposée** : `trustProxy: 1` (un seul saut) ou l'adresse du proxy (`'127.0.0.1'`) ; mention dans `docs/installation.md`.
- **Effort** : XS.

### SEC-11 Content-Disposition construit avec le code du projet

- **Gravité** : basse.
- **Preuve** : `packages/api/src/routes/export-couts.ts:26` ; le code n'a d'autre contrainte que non vide (`packages/api/src/routes/projets.ts:32`). Vérification Node : un caractère hors Latin-1 (par exemple « € ») lève `ERR_INVALID_CHAR`, un guillemet passe tel quel.
- **Risque** : export des coûts en 500 pour un projet dont le code contient un tel caractère ; nom de fichier tronqué par un guillemet. Pas d'injection d'en-tête (CR et LF refusés par Node).
- **Correction proposée** : nom ASCII assaini (`[^A-Za-z0-9._-]` remplacé par `_`) plus `filename*=UTF-8''<code encodé>`.
- **Effort** : XS.

### SEC-12 CI : permissions et épinglage

- **Gravité** : basse.
- **Preuve** : `.github/workflows/ci.yml` sans bloc `permissions` ; actions épinglées par étiquette (`actions/checkout@v5`, `actions/setup-node@v5`, `actions/upload-artifact@v6`, lignes 34, 35, 63).
- **Risque** : jeton aux droits par défaut du dépôt ; une étiquette d'action déplacée (compromission de l'éditeur) exécuterait du code dans la CI.
- **Correction proposée** : `permissions: { contents: read }` en tête ; épinglage par SHA complet avec l'étiquette en commentaire.
- **Effort** : XS.

### SEC-13 Sauvegardes

- **Gravité** : basse.
- **Preuve** : `scripts/backup.sh:9-12` (fichier non chiffré, droits issus du umask) ; `scripts/backup.sh:12` et `docs/installation.md:114` (mot de passe dans `DATABASE_URL` en argument, visible dans la liste des processus) ; `docs/installation.md:89` (sauvegardes laissées dans `backups/` sur le serveur).
- **Risque** : un compte local du serveur lit les sauvegardes (hachés des mots de passe, taux, imputations) ou le mot de passe de la base pendant la sauvegarde.
- **Correction proposée** : `umask 077` dans `backup.sh` ; mot de passe par `PGPASSFILE` ou `PGPASSWORD` plutôt que dans l'URL en argument ; chiffrement conseillé pour la copie hors serveur.
- **Effort** : S.

### SEC-14 Outillage : minimatch

- **Gravité** : basse.
- **Preuve** : `npm audit` : 7 vulnérabilités modérées, toutes issues de `minimatch` 7.0.0 à 11.0.0 (GHSA-g3hv-75wg-m249, déni de service) par `@typescript-eslint/typescript-estree` ; `npm audit --omit=dev --json` : 0 vulnérabilité (143 paquets d'exécution).
- **Risque** : outillage de développement seulement (lint), sur des motifs du dépôt : aucun risque en production.
- **Correction proposée** : mise à jour de `typescript-eslint` quand une version corrigée paraît (`npm audit fix` annoncé disponible), puis `npm run licenses` et `npm run sbom`.
- **Effort** : XS.

### SEC-15 Installation sans Docker

- **Gravité** : basse.
- **Preuve** : `docs/installation.md:190-194` (clone, `npm ci` complet et build par l'utilisateur du service) ; unité systemd `docs/installation.md:214-226` sans option de durcissement.
- **Risque** : un processus compromis peut réécrire son propre code (persistance) ; les dépendances de développement et leurs scripts d'installation sont présents sur le serveur.
- **Correction proposée** : code possédé par root ou un autre compte, lecture seule pour le service ; `npm ci --omit=dev` après le build ; `NoNewPrivileges=yes`, `ProtectSystem=strict`, `ProtectHome=yes`, `PrivateTmp=yes` dans l'unité.
- **Effort** : S.

### Points vérifiés sans constat

- Sessions : jeton de 32 octets aléatoires, haché SHA-256 en base (`packages/api/src/auth/session.ts:27-34`), cookie signé, HttpOnly, SameSite=Lax, Path=/, 12 h absolues vérifiées côté serveur (`session.ts:117`) ; nouvelle session à chaque connexion ; suppression à la déconnexion ; toutes les sessions supprimées au changement de mot de passe, de rôle ou à la désactivation par l'administrateur (`packages/api/src/routes/utilisateurs.ts:177-183`) ; autres sessions fermées au changement de son mot de passe (D-254) ; utilisateur inactif refusé à chaque requête.
- Connexion : temps constant (hash de substitution), message unique, limiteur aussi sur le changement de mot de passe ; ancien mot de passe exigé.
- Contrôle d'accès : toutes les routes sous `/api` passent par `requireUser`, `requireAdmin`, `requireFinances` ou `verdictProjet` ; chaque route par identifiant d'objet (activité, jalon, dépendance, affectation, assignation, taux, feuille) remonte au projet ou au propriétaire avant d'agir ; clés étrangères composites (`element_parent_fk`, `dependance_*_fk`, `assignation_affectation_fk`) contre les liens entre projets ; corps `strictObject` partout où des colonnes sont construites (`packages/api/src/planning/projets.ts:195`, `packages/api/src/routes/utilisateurs.ts:171`).
- SQL : requêtes paramétrées ; les fragments interpolés sont des constantes du code.
- Exports CSV : `packages/api/src/export/csv.ts:27-30` préfixe d'une apostrophe les champs qui commencent par `=`, `+`, `-`, `@`, tabulation ou CR, et met entre guillemets.
- Web : aucun `dangerouslySetInnerHTML`, `innerHTML` ni `eval` ; `href` construits par le code ; attributs `title` rendus par React (échappés) ; aucune donnée sensible dans `localStorage`.
- Secrets : `git grep` et `git log -p` (clés privées, jetons, `SESSION_SECRET`, `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, `DATABASE_URL`) : valeurs de modèle ou de test seulement ; `.env` ignoré par git et par `.dockerignore`.
- Image Docker : deux étapes, `npm ci --omit=dev` à l'exécution, utilisateur `node` non root.

### Dépendances et choix des briques

- Exécution (`npm audit --omit=dev`) : 0 vulnérabilité. Scripts d'installation (`hasInstallScript`) : `argon2` 0.45.2 (exécution, MIT, module natif) ; `esbuild` et `fsevents` (outillage, MIT).
- Briques (`npm view <paquet> version license`) : fastify 5.12.8 MIT, @fastify/cookie 11.1.5 MIT, argon2 0.45.2 MIT, pg 8.23.1 MIT, zod 4.6.7 MIT, react 19.3.1 MIT, toutes à leur dernière version et publiées en 2026 ; sirv 3.0.2 MIT (dernière publication 2025-09, petit module stable, surveillé) ; vite installé 8.3.8, publié 8.4.0 (MIT), outillage.
- Alternatives seulement si besoin : `@node-rs/argon2` 2.2.2 MIT (binaires précompilés, sans compilation à l'installation) ; `@fastify/helmet` 13.2.0 MIT (SEC-8) ; `@fastify/csrf-protection` 8.0.2 MIT (SEC-9, le contrôle d'origine suffit ici). Aucun changement de brique recommandé.

### Analyse statique (`npm run lint:securite`, 422 avertissements)

| Règle | Nombre | Tri |
| --- | --- | --- |
| security/detect-object-injection | 191 | faux positifs : clés issues de schémas zod stricts, de constantes ou d'index numériques (dont `projets.ts:197`, `utilisateurs.ts:173`, `historique.ts:91-92`, `plan-de-charge.ts:203-238`) |
| security/detect-non-literal-fs-filename | 178 | faux positifs : chemins calculés par le code (migrations, `.env`, `web/dist`, scripts et tests), aucune entrée utilisateur |
| security/detect-non-literal-regexp | 43 | faux positifs : tests et scripts, motifs construits par le code |
| security/detect-unsafe-regex | 10 | faux positifs : `packages/web/src/couts.ts:26` et `:35`, `gantt/vendu.ts:15`, `imputations/logique.ts:48` et les tests ; motifs ancrés sans quantificateurs imbriqués ambigus, sur des saisies courtes |

Aucun vrai positif. 68 avertissements portent sur `packages/api/src` et `packages/web/src`, le reste sur les tests, e2e et scripts.

### Suites données (D-272, D-273)

- SEC-1 : corrigé (029a2f9, tests SECT-4 et SECT-5, SPEC §8 « Changement de mot de passe » point 7) : hors développement, le compte initial est créé avec `doit_changer_mot_de_passe` vrai. Le compte de développement (D-071, `NODE_ENV=development`) reste admin / admin sans changement imposé. Aucun test sous tag de D-138 n'a dû être révisé (INST-5 à INST-7 verts, e2e avec `INITIAL_ADMIN=0`).
- SEC-2 à SEC-15 : au backlog (docs/backlog.md, en tête), aucun critique ni haut ; SEC-2, SEC-3 et SEC-7 ont été décidés et corrigés dans securite-2 (D-274).

### Suites données (D-274, lot securite-2)

Décisions du porteur (2026-11-27) :
- SEC-2 : corrigé dans le lot securite-2 (SPEC §8 securite-2 point 1, SC2-1 à SC2-3). `charge_vendue` est le seul champ financier historisé d'un projet.
- SEC-3 : ni validation de sa propre feuille (sauf l'administrateur), ni modification de son propre taux par le chef ; le reste de l'écriture des taux par le chef est inchangé (D-258). Options (b) du constat non retenue (SPEC §8 securite-2 points 2 et 3, SC2-4 à SC2-8).
- SEC-7 : 12 caractères au moins, sans autre règle de composition (SPEC §8 securite-2 point 4, SC2-9 à SC2-16).

Passe @securite sur le diff 28f862a..HEAD (lot securite-2) : aucun bloquant, SEC-2, SEC-3 et SEC-7 sans contournement trouvé (historique, `agir` de feuilles.ts, routes de taux, contrôle de longueur à la création, au PATCH, au changement et à `create-admin`). Constats bas, au backlog :
- SEC-16 : pas de longueur maximale de mot de passe (`auth/schemas.ts`, login `auth.ts:25`) ; corps jusqu'à 1 Mo haché par argon2.
- SEC-17 : les mots de passe existants de moins de 12 caractères restent valides, aucun changement forcé.
- SEC-18 : mots de passe de démonstration prévisibles ; vérifier qu'aucune documentation de déploiement ne propose `npm run demo` en production (`exigerBaseDemo` protège déjà).
- SEC-19 : un chef ressource ne fait valider sa feuille que par un autre chef ou l'administrateur ; blocage possible si le projet n'a qu'un chef (signalé en recette).
- SEC-20 (information) : deux chefs peuvent se valider et se fixer mutuellement leurs taux.
- Non relus : `export-couts`, `couts-pilotage`, `export-imputations` (contrôle d'accès dans les services) ; un test de non-régression leader est à envisager.

### Passe @securite, lot absences (D-276), 2026-11-28, commit 7043a74

Diff 942d0cc..7043a74 (packages/api, packages/web), relu sans exécution. Aucune dépendance modifiée. Droits conformes à SPEC §4 « Absences et charge depuis le taux », point 7 : écriture (administrateur, leader, la ressource pour elle-même, le chef via `ressourcesEnPortee`), lecture (rôle ressource limité aux siennes) ; pas d'IDOR par `:id`, `ressource_id`, `du` ni `au` ; corps zod stricts ; requêtes paramétrées ; historique `absence` réservé à l'administrateur ; `charge_depuis_taux` contrôlé après `verdictProjet`, refus sous verrou. Le 404 qui précède le 403 en lecture est voulu par la SPEC ; l'annuaire expose déjà les identifiants. Aucun bloquant.

- SEC-21 (moyenne, S) : durée d'une absence non bornée ; `joursAbsence` dépliait toute la période et le calcul lisait sans borne de fin : une absence jusqu'en 9999 pouvait bloquer tous les calculs de l'instance. Corrigé dans le lot : dépliage limité à la période demandée, horizon du calcul comme fin, regroupement par ressource (commit « fix: … SEC-21 »). Durée maximale d'une absence : à décider par le porteur (backlog). → absences-suite (D-278 : 366 jours au plus, décision du porteur ; preuve a posteriori du dépliage borné).
- SEC-22 (basse, XS) : `ecrireFeuille` ne verrouille pas la ligne utilisateur ; une feuille et une absence enregistrées en même temps peuvent laisser du réel sur un jour d'absence (points 4 et 5). Correction proposée : `FOR UPDATE` sur l'utilisateur cible. Backlog.
- SEC-23 (basse, XS) : cohérence d'un PATCH d'absence vérifiée hors transaction, non revérifiée après la fusion sous verrou ; en cas de concurrence, erreur 500 au lieu de 400, données protégées par les CHECK. Correction proposée : revérifier dans `modifierAbsence`. Backlog.

### Passe @securite, lot absences-suite (D-278), 2026-11-28, commit 82c9aee

Diff ee5e513..82c9aee (packages/api, packages/web, e2e/package.json), relu sans exécution de test. `npm audit --omit=dev` : 0 vulnérabilité ; `npm audit` : 7 modérées, inchangées (SEC-14) ; `npm run licenses` : conforme (132 paquets d'exécution, 179 d'outillage de développement). `argon2` 0.45.2 (MIT) déclaré en outillage de développement des e2e : même copie que l'API, aucun nouveau paquet. Le disponible du plan de charge net des absences n'élargit pas la lecture (rôle ressource refusé, 403 ; les autres rôles lisaient déjà les absences, SPEC §4 point 7) ; dépliage limité aux 12 mois ; export CSV purement numérique. Le dialogue « Modifier l'assignation » du Gantt et de l'Accueil lit une route existante, soumise aux droits, sans nouvelle écriture. Aucun bloquant.

- SEC-21 : clos (0bf5117 pour le dépliage borné, 389c768 pour la durée maximale de 366 jours contrôlée dans la transaction sur l'état fusionné ; preuves ASU-1 à ASU-4, packages/api/test/absences-suite.test.ts ; ASU-1 et ASU-2 rouges sur 7043a74).
- SEC-22 : au backlog, inchangé (verrou sur la feuille, pas sur l'utilisateur).
- SEC-23 : au backlog, inchangé ; le contrôle de durée ne le couvre pas (état fusionné incohérent : durée négative, erreur 500 par la contrainte `absence_fin_apres_debut`).
- SEC-24 (basse, XS) : durée maximale contrôlée par l'application seule (packages/api/src/planning/absences.ts, aucune contrainte dans packages/api/migrations/020_absence.sql) ; les absences de plus de 366 jours antérieures au lot restent en base (modifier seulement leur motif est refusé, 422, conforme au point 21). Correction proposée : migration `CHECK (fin - debut <= 365) NOT VALID`, après comptage des lignes qui dépassent. Backlog.

### Passe @securite, lot absences-grille (D-280), 2026-11-28, commit d6f94f3

Diff a1e11bd..d6f94f3 (packages/api, packages/web, e2e), relu sans exécution de test. Aucun bloquant. `GET /api/absences/grille` : 401 puis 403 (rôle ressource) puis 400, `mois` validé par expression régulière (2000-01 à 2099-12), requêtes paramétrées, deux requêtes quel que soit le nombre de ressources (pas de N+1), champs `id, nom, equipe_id, peut_ecrire, jours_non_ouvres` (ni login, ni email, ni calendrier, ni capacité), `peut_ecrire` cohérent avec `peutEcrireAbsences`. `GET /api/absences` inchangée.

- SEC-25 (basse, XS) : motifs et dates des absences lisibles par tout chef de projet et tout leader (SPEC §4 point 7, voulu) ; risque accepté, à décider par le porteur (masquer le motif hors administrateur). Backlog.
- SEC-26 (basse, XS) : `GET /api/absences` sans `du` ni `au` renvoie toutes les absences, sans pagination ; l'écran passe toujours `du` et `au`. Backlog.
- SEC-27 (basse, XS) : la requête de la grille compare `to_char(f.jour, 'YYYY-MM') = $1`, sans emploi possible d'un index ; sans effet à ce volume. Correction : bornes de dates. Backlog.
