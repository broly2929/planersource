# CLAUDE.md — règles de travail

## Ouverture de session

1. Lire `docs/state.md` : il dit où on en est et quoi faire ensuite.
2. Lire dans `SPEC.md` les sections du lot en cours. `SPEC.md` est la seule référence fonctionnelle.
3. Annoncer en 3 lignes : lot en cours, prochaine action, blocages éventuels.

## Règles non négociables

- **Licence** : projet MIT. Dépendances d'exécution : MIT, Apache 2.0, BSD, ISC, 0BSD. Outillage de développement : en plus BlueOak-1.0.0, CC0-1.0, Python-2.0, CC-BY-4.0, Unlicense, MPL-2.0. GPL, AGPL et LGPL interdites partout. Aucun code GPL ou AGPL, ni lu, ni copié, ni adapté. En cas de doute sur une licence, s'arrêter et demander.
- **TDD** : un test qui échoue (rouge prouvé, sortie affichée), puis le code minimal, puis refactor. Jamais de code de production sans test rouge préalable. Tout test de refus vérifie que l'état en base est inchangé, pas seulement le code HTTP. Un test sous tag jugé faux se corrige seul dans un commit, avec la décision du porteur et un tag de révision -rN (D-031).
- **Tests de la spec** : les valeurs attendues viennent de `SPEC.md`, recopiées, jamais recalculées ni ajustées pour faire passer un test. Si un cas de la spec semble faux, s'arrêter et le signaler. Tout nouveau test hors moteur reçoit un identifiant dans docs/tests.md avant d'être écrit.
- **Documents** : `SPEC.md`, `docs/decisions.md` et ce fichier se modifient de façon incrémentale. Jamais de réécriture complète.
- **Moteur** : le paquet moteur est une bibliothèque pure, sans accès base, réseau ni horloge système (la date du jour est un paramètre).
- **Périmètre** : ne rien implémenter qui figure dans « Hors périmètre V1 » de la spec.
- **Parcours IHM** : tout écran qui crée ou modifie une entité a au moins un e2e qui le fait par l'écran, sans appel API pour cette entité, puis vérifie l'effet dans l'écran consommateur. Un e2e de parcours complet part d'une base où seul l'administrateur existe et enchaîne tout à l'écran ; il est étendu à chaque tranche d'écran.
- **Couverture des champs** : docs/tests.md tient un tableau "champ modifiable de l'API → champ d'écran, ou hors écran avec la raison". Le reviewer le contrôle en fin de lot.

## Ambiguïtés et décisions

- Ambiguïté couverte par la section 10 de la spec : appliquer la valeur par défaut.
- Autre ambiguïté ou choix d'architecture : proposer 2 options en 5 lignes, attendre la réponse.
- Toute décision prise est ajoutée à `docs/decisions.md` (identifiant D-xxx suivant, date, décision, raison).

## Commits

- Commits petits, message en français à l'impératif, préfixe `feat:`, `test:`, `fix:`, `docs:`, `chore:`.
- Code et tests dans le même commit ; documentation dans un commit séparé.
- `git add` ciblé, fichier par fichier. Jamais `git add .` ni `-A`.
- Preuve après chaque commit : `git log -3 --oneline && git status -sb`.
- Tout commit qui touche la documentation exécute `npx vitest run scripts/test/aucune-reference-externe.test.ts` (PUB-1, PUB-2) avant le push (D-179).
- Chaque push vers archive pousse aussi les tags : `git push archive travail` puis `git push archive --tags` (D-237). Preuve : aucun tag local absent de `git ls-remote --tags archive`.

## Fin de lot

1. Passes ciblées, lint et contrôle des licences au vert, sorties affichées.
2. Relecture par `@reviewer`. Corriger les points bloquants.
3. Suite complète unique, après la relecture : `npm run suite-complete -- --lot <nom>` (D-193).
4. Mettre à jour `docs/state.md`, qui cite les lignes du journal du lot.
5. Commit docs (journal compris), puis `git push`.
6. Arrêter les processus lancés pendant le lot ou la session (API, front, piles e2e, commandes en arrière-plan) ; preuve : liste des processus restants affichée (D-220).

Vérifications proportionnées (D-128) : phase rouge = vitest et e2e des seuls fichiers touchés, plus lint et typecheck ; suite complète une seule fois, en fin de phase verte ; 3 exécutions ciblées réservées aux nouveaux e2e en phase verte ; la CI exécute la suite complète à chaque push.

Suite complète et base de test (D-193) : une seule suite complète par lot, après les corrections du reviewer, lancée par `npm run suite-complete -- --lot <nom>` (point d'entrée unique, journal `docs/journal-suites.jsonl`) ; une suite de plus pour le même lot exige `--justification`. Pendant le développement : passes ciblées seulement, par `npm run tests-cibles -- --depuis <commit d'ouverture> [--domaine <nom>…]` (le prompt d'ouverture du lot déclare ses domaines, `e2e/domaines.json` ; `--lister` pour voir la sélection) ou `npx vitest run <fichier>`, `cd e2e && npx playwright test -g <ID>`. Le rapport de clôture cite les lignes du journal du lot (`npm run suite-complete -- --lister <lot>`). Tout lancement ad hoc qui touche une base passe par `npm run avec-base-test -- <commande>` ; une base de test a un nom qui finit par `_test`. Règle complète : docs/tests.md. Commande longue (suite complète, passes multiples, au-delà du délai d'une commande) : lancée en arrière-plan, sortie dans un fichier. Lancement : `nohup <commande> > <fichier>.log 2>&1 & echo $! > <fichier>.pid`. Attente par tranches de 60 s au plus, avec sortie dès la fin : `timeout 60 sh -c 'while kill -0 $(cat <fichier>.pid) 2>/dev/null; do sleep 10; done'; tail -n 15 <fichier>.log` ; répéter jusqu'à la fin, puis enchaîner l'étape suivante dans le même tour. Ne jamais terminer le tour pendant l'attente ; si le porteur écrit, répondre en une ligne (avancement lu dans la fin du fichier), puis reprendre l'attente. Fin constatée : code de sortie et fin du fichier affichés (D-237).

## Méthode de lot (D-266)

- Un prompt de lot s'enchaîne sans arrêt : ouverture (SPEC, décision, identifiants), rouge prouvé, tag, vert, @reviewer, suite complète, clôture.
- Point douteux : choisir l'option la plus prudente et réversible, la consigner dans la décision sous « Choix à ratifier », continuer.
- Arrêt seulement si : valeur de la SPEC qui semble fausse ; test sous tag cassé hors de la règle de révision du prompt ; licence douteuse ; migration qui détruit des données ; deux corrections échouées après @debugger.
- Test du lot en cours faux (D-271) : un test écrit dans le lot en cours, faux au regard d'une règle existante de la SPEC ou d'un mécanisme existant (et non du nouveau comportement), est révisé sans arrêt : commit seul, tag -rN suivant (un tag n'est jamais déplacé), raison dans la décision de clôture. Arrêt seulement si la correction change une règle voulue par le porteur.
- Fin de lot : section « Recette <lot> » dans docs/recette.md, 3 à 6 gestes dans l'application avec le résultat attendu.
- claude.ai relit a posteriori depuis l'archive ; ses corrections passent au lot suivant. Plus de relecture des tests par claude.ai avant le tag.

## Fin de session (même si le lot n'est pas fini)

- Mettre à jour `docs/state.md`, commit, `git push`. Le dépôt distant doit toujours refléter l'état réel : c'est lui qui est lu depuis claude.ai.
- Arrêter les processus lancés pendant le lot ou la session (API, front, piles e2e, commandes en arrière-plan) ; preuve : liste des processus restants affichée (D-220).

## Communication

- Français, puces courtes, pas de politesses ni de méta-commentaire.
- Souvent lu sur téléphone : réponses brèves, une question à la fois.

## Agents

- reviewer : une fois par lot, avant le commit final. Il ne lance jamais la suite complète (D-193).
- debugger : après deux corrections échouées, ou un /goal arrêté sans succès.
- ui-designer : tout écran ou composant visuel (lots 0, 1, 1b, 2e, 3, 4).
- Le reviewer ne lance aucun test pendant qu'une suite tourne sur la même base `_test` (D-179).
- securite : premier audit au lot securite ; ensuite une passe par lot qui touche l'authentification, les droits, l'API exposée, les dépendances ou le déploiement, avant @reviewer ; rapport ajouté à docs/securite.md (D-272).

## Architecture

À compléter au lot 0 (arborescence, commandes de test, de lint et de lancement).

Monorepo npm workspaces (Node 22, TypeScript strict, ESM).

```
packages/engine/   moteur pur, aucune dépendance d'exécution
packages/api/      Fastify, pg, argon2, zod : src/ (routes, db, auth, cli), migrations/*.sql, test/
packages/web/      React + Vite (+ Tailwind, Radix, lucide-react avec les premiers composants)
e2e/               Playwright (démarre l'API et le web, base de test)
scripts/           backup.sh, restore.sh, check-licenses.mjs, test/ (tests des scripts)
```

Commandes (racine) :

- `npm run lint` : eslint + prettier --check (le Markdown n'est pas formaté par prettier)
- `npm run typecheck` : tsc --noEmit dans chaque workspace
- `npm test` : vitest (engine, api, scripts) ; exige `TEST_DATABASE_URL`
- `npm run test:e2e` : Playwright, une pile par worker (base `<préfixe>_e2e_w<N>_test` clonée du modèle de vitest, API 3300+N, front 5300+N) ; les ports 3000 et 5173 restent au dev (D-199)
- `npm run setup-depot` : pose le hook commit-msg suivi par git (`.githooks`), une fois après le clone (D-198)
- e2e ciblé : `cd e2e && npx playwright test -g <ID>` (`npm run test:e2e -- --grep` ne filtre pas)
- `npm run licenses` : contrôle des licences
- `npm run sbom` : régénère `sbom.cdx.json` (CycloneDX, dépendances d'exécution) après tout changement de `package-lock.json` ; `npm run sbom -- --check` : contrôle sans écriture, exécuté par la CI (D-169)
- `npm run dev` : API (3000) + web (5173)
- `npm run demo` : recrée la base `planersource_demo` (DROP, CREATE, migrations, jeu de démonstration, D-117) ; `npm run dev:demo` : comme `npm run dev` sur cette base
- `npm run create-admin -- --login <id> [--email <e>] --nom <n>` avec `ADMIN_PASSWORD` dans l'environnement (login ou email requis ; login absent = email, D-077)

Un contrôle d'accès ne renvoie jamais `reply` depuis une fonction async (reply est thenable) : il renvoie un verdict, la route répond.

Configuration : copier `.env.example` vers `.env`. Les tests n'utilisent que `TEST_DATABASE_URL`, dont le nom de base doit finir par `_test` (refus sinon, jamais de repli sur `DATABASE_URL`). Tests API en parallèle (4 workers), une base par worker (`<préfixe>_vitest_w<N>_test`) clonée une fois d'une base modèle migrée, reconstruite seulement si les migrations changent ; la base de `TEST_DATABASE_URL` sert de base de maintenance (D-196). Base du worker remise à zéro avant chaque test. Mot de passe de test haché une fois par processus (`helpers.ts`) ; base modèle pour la remise à zéro de chaque test essayée, plus lente, abandonnée (D-037). Migrations : fichiers `NNN_nom.sql` dans `packages/api/migrations/`, table `schema_version`.
