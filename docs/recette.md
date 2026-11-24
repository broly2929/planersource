# Recette du porteur — 2026-11-23

Parcours ordonné pour la recette différée (lots 3, 4b, 4c, 5d, 6, REX-5, D-172). Les verdicts et les remarques se remplissent dans le tableau ; rien d'autre n'est à modifier.

## Lancement

- Depuis la racine du dépôt : `npm run demo` (recrée la base `planersource_demo`, D-117), puis `npm run dev:demo` (API 3000 + web 5173).
- Adresse du web : http://localhost:5173 dans la VM.
- Les lignes qui valident, enregistrent, créent ou modifient changent la base de démonstration. `npm run demo` la remet à zéro.

## Comptes (mot de passe = identifiant, `remplir.ts:31`, `:74`)

| Identifiant | Mot de passe | Rôle | Particularités |
|---|---|---|---|
| admin | admin | administrateur | non ressource ; créé par `demo.ts` |
| chefa | chefa | chef de projet | non ressource ; chef de DEMO-R, DEMO-Q, DEMO-C ; équipe Pilotage |
| chefb | chefb | chef de projet et ressource | chef de DEMO-S ; affecté à DEMO-R en lecture seule ; équipe Pilotage ; aucune assignation |
| alice | alice | ressource | affectée à DEMO-R et DEMO-S ; équipe Développement |
| bob | bob | ressource | affecté à DEMO-R et DEMO-Q ; équipe Développement |

Projets : DEMO-R (fiche `/projets/1`) avec sous-projet DEMO-S (`/projets/2`), DEMO-Q, DEMO-C (clos), DEMO-M (modèle). Les numéros de projet valent pour une base fraîchement recréée.

## Largeurs

- Deux largeurs : 1440 px et 1024 px.
- Mode adaptatif des outils de développement du navigateur (F12, puis Ctrl+Maj+M) : choisir « Responsive », saisir la largeur, recharger la page si besoin. Sans précision dans la colonne Écran, la ligne se juge à 1440 px.

## Dates

- `lundi` = 2026-11-23 (`npm run demo` prend le lundi de la semaine du jour ; semaine du 2026-11-23).
- lundi − 7 = 2026-11-16 ; lundi − 14 = 2026-11-09. Exemples : `/validation?semaine=2026-11-16`, `/imputations?semaine=2026-11-09`.
- Si `npm run demo` est relancé une autre semaine, les dates se décalent : les adresses, les jours de la semaine et les dates citées dans le tableau sont alors à recalculer.

## Parcours

Ordre : admin, chefa, chefb, alice, bob ; puis un retour d'admin en fin de parcours (lignes qui dépendent des manipulations des ressources). Une ligne = une action ; une ligne marquée « Constat … à juger » demande un jugement, pas une conformité.

| N° | Compte | Écran (adresse) | Action | Attendu | Source | Verdict | Remarque |
|---|---|---|---|---|---|---|---|
| 1 | admin | / (après connexion) | Lire le menu latéral | Accueil, Projets, Plan de charge, Imputations, Validation, Modèles, Utilisateurs ; ni « Équipes » ni « Calendriers » ; pas de « Mes tâches » (administrateur non ressource ; « Imputations » présente pour tout administrateur, D-181 (5), D-184) | RX5-5 ; D-165 (3) ; AUT-RD-1 | | |
| 2 | admin | /utilisateurs, 1440 px | Ouvrir l'écran sans paramètre | Trois onglets « Utilisateurs », « Équipes », « Calendriers » ; « Utilisateurs » actif | RX5-1 ; D-165 (2) | | |
| 3 | admin | /utilisateurs, 1440 px | Cliquer « Équipes », puis « Calendriers » | L'adresse devient `?onglet=equipes` puis `?onglet=calendriers` ; l'onglet actif suit | RX5-2 ; D-165 (2) | | |
| 4 | admin | /utilisateurs?onglet=xyz | Saisir l'adresse | Onglet « Utilisateurs » actif | RX5-1 ; D-165 (2) | | |
| 5 | admin | /utilisateurs, 1024 px | Parcourir les trois onglets | Constat à juger (aucun critère propre à 1024 px dans la source) | RX5-1 | | |
| 6 | admin | /equipes puis /calendriers | Saisir chaque adresse | Redirection sans entrée d'historique vers `/utilisateurs?onglet=equipes` puis `/utilisateurs?onglet=calendriers` | RX5-2 ; D-165 (3) | | |
| 7 | admin | /utilisateurs, onglet Utilisateurs, 1440 px | Lire le tableau | Colonnes Identifiant, Initiales, Ressource, Calendrier, Équipe ; Alice : équipe « Développement ». Constat 6a (2), à juger : Nom, Identifiant et Email passent sur deux lignes, lignes plus hautes | 6a (2) ; L6-6a2 | | |
| 8 | admin | /utilisateurs, onglet Utilisateurs, 1024 px | Lire le tableau ; chercher le bouton « Modifier Alice » | Constat 6a (1), à juger : Capacité (coupée), Calendrier, Équipe, Statut et Actions hors écran, aucun indice de défilement, bouton de modification inaccessible sans défiler | 6a (1) | | |
| 9 | admin | /utilisateurs, onglet Utilisateurs | Lire la ligne « Admin » : colonnes Équipe et Initiales | Équipe : « — » ; Initiales : « — » (SPEC). Constat 6a (5), à juger : « sans équipe » et « non renseigné » se confondent | 6a (5) ; L6-6a2 | | |
| 10 | admin | /utilisateurs, onglet Utilisateurs, 1440 px | Ouvrir « Nouvel utilisateur » ; atteindre le champ « Équipe » et les boutons Annuler / Créer | Liste « Équipe » : premier choix « Aucune », équipes triées par nom. Constat 6a (3), à juger : la boîte touche le haut et le bas de la fenêtre, défilement interne non signalé | 6a (3) ; L6-6a2 | | |
| 11 | admin | /utilisateurs, onglet Utilisateurs, 1024 px | Ouvrir « Nouvel utilisateur » ; atteindre le champ « Équipe » et les boutons Annuler / Créer | Même attendu qu'à 1440 px ; constat 6a (3), à juger | 6a (3) | | |
| 12 | admin | /utilisateurs?onglet=equipes, 1440 px | Lire le tableau « Liste des équipes » | Colonnes Nom, Membres, Actions ; Développement : 2 membres, Pilotage : 2 membres. Constat 6a (4), à juger : Membres et Actions très à droite, sans lien visuel avec Nom | 6a (4) ; L6-6a1 | | |
| 13 | admin | /utilisateurs?onglet=equipes, 1024 px | Lire le tableau « Liste des équipes » | Même contenu qu'à 1440 px, sans débordement | 6a (4) ; L6-6a1 | | |
| 14 | admin | /utilisateurs?onglet=equipes | « Nouvelle équipe » : saisir « Pilotage », Créer | « Cette équipe existe déjà. » ; rien de modifié (toujours 2 équipes). Constat 6a (7), à juger : message en haut, éloigné du champ Nom, champ sans état invalide visible | 6a (7) ; L6-6a1 | | |
| 15 | admin | /utilisateurs?onglet=equipes | « Supprimer Développement », confirmer | « Cette équipe a des membres : retirez-les d'abord. » ; dialogue ouvert, rien de modifié. Constat 6a (6), à juger : le bouton Supprimer est actif alors que l'équipe a des membres ; message sur deux lignes | 6a (6) ; L6-6a1 | | |
| 16 | admin | /utilisateurs?onglet=equipes | « Nouvelle équipe » : saisir « Recette », Créer | L'équipe « Recette » apparaît dans le tableau avec 0 membre | RX5-2 ; L6-6a1 | | |
| 17 | admin | /utilisateurs, onglet Utilisateurs | Sans recharger la page, revenir à l'onglet Utilisateurs, ouvrir « Nouvel utilisateur », ouvrir la liste « Équipe » | « Recette » figure dans la liste (équipes triées par nom) | RX5-2 ; D-165 (2) | | |
| 18 | admin | /utilisateurs, onglet Utilisateurs | « Modifier Alice » : Équipe = Pilotage, Enregistrer | Colonne Équipe d'Alice : « Pilotage » | L6-6a2 | | |
| 19 | admin | /utilisateurs?onglet=equipes | Revenir à l'onglet Équipes sans recharger | Développement : 1 membre, Pilotage : 3 membres (nombre de membres à jour) | RX5-2 ; D-165 (2) | | |
| 20 | admin | /utilisateurs, onglet Utilisateurs | « Modifier Alice » : Équipe = Développement, Enregistrer | Colonne Équipe d'Alice : « Développement » | L6-6a2 | | |
| 21 | admin | /utilisateurs?onglet=equipes | « Supprimer Recette », confirmer | L'équipe « Recette » disparaît du tableau | L6-6a1 | | |
| 22 | admin | /utilisateurs?onglet=equipes | Observer les états chargement, vide et erreur de l'écran Équipes | Constat 6a (8) : aucune capture de ces états ; à juger (états « Aucune équipe pour le moment. » pour le vide) | 6a (8) | | |
| 23 | admin | /utilisateurs?onglet=calendriers | Lire le tableau | « Calendrier par défaut » avec 0 jour férié ; lien vers le détail | RX5-2 ; D-165 (2) | | |
| 24 | admin | /utilisateurs?onglet=calendriers | Créer un calendrier « Recette » | Le calendrier apparaît dans le tableau | RX5-2 | | |
| 25 | admin | /utilisateurs, onglet Utilisateurs | Sans recharger, ouvrir « Nouvel utilisateur », ouvrir la liste « Calendrier » | « Recette » figure dans la liste | RX5-2 ; D-165 (2) | | |
| 26 | admin | /utilisateurs?onglet=calendriers | Ouvrir « Calendrier par défaut » par son lien | Page à part `/calendriers/1` | RX5-3 ; D-165 (3 bis) | | |
| 27 | admin | /calendriers/1 | Lire l'entrée « Utilisateurs » du menu | « Utilisateurs » marquée active comme sur `/utilisateurs` | RX5-3 ; D-165 (3 bis) | | |
| 28 | admin | /calendriers/1 | « Ajouter un jour férié » : 25/12/2026, libellé « Noël » | Le jour férié figure dans le calendrier (prépare les lignes « Mon calendrier ») | RX5-4 ; D-165 (4) | | |
| 29 | admin | /calendriers/1 | Cliquer « Retour aux calendriers » | Retour à `/utilisateurs?onglet=calendriers` | RX5-3 ; D-165 (3 bis) | | |
| 30 | admin | /plan-de-charge, 1440 px | Ouvrir l'écran par le menu | Entrée « Plan de charge » après « Projets » ; tableau « Plan de charge » : 12 colonnes « MM/AAAA » à partir du mois courant (11/2026) ; ressources Alice, Bob, Chef B, tout replié | L6-6d1 ; SPEC 6d (6, 7) | | |
| 31 | admin | /plan-de-charge, 1440 px | Survoler la cellule 11/2026 d'Alice | `title` « Charge 10 j, disponible 21 j, écart 11 j » (valeurs de la base de démonstration) | L6-6d1 ; SPEC 6d (7) | | |
| 32 | admin | /plan-de-charge, 1440 px | « Déplier Alice » | Lignes de projet « DEMO-R · Projet de démonstration » et « DEMO-S · Sous-projet de démonstration », charge seule | L6-6d1 ; SPEC 6d (7) | | |
| 33 | admin | /plan-de-charge, 1440 px | Liste « Équipe » : « Développement » | Alice et Bob seulement ; adresse `?debut=2026-11&equipe=<id>` | L6-6d2 ; SPEC 6d (6) | | |
| 34 | admin | /plan-de-charge, 1440 px | Liste « Équipe » : « Sans équipe » | « Aucune ressource. » | L6-6d2 ; SPEC 6d (4, 7) | | |
| 35 | admin | /plan-de-charge, 1440 px | « Mois suivant » puis « Mois précédent » | Le mois de départ passe à 12/2026 puis revient à 11/2026 ; adresse `?debut=` mise à jour | L6-6d2 ; SPEC 6d (6) | | |
| 36 | admin | /plan-de-charge, 1440 px | Lire le champ « Mois de départ » (type month, Chromium) | Constat de la recette différée du lot 6, à juger : le champ Mois s'affiche en anglais dans Chromium | L6-6d4 | | |
| 37 | admin | /plan-de-charge, 1440 px | Lire une cellule dont l'écart est négatif | Couleur flag ; texte « , surcharge » pour lecteurs d'écran ; `title` avec écart négatif | L6-6d3 ; SPEC 6d (7) | | |
| 38 | admin | /plan-de-charge, 1024 px | Lire l'écran, défiler le tableau | La page ne défile pas en horizontal ; zone « Plan de charge » focalisable, défilement horizontal interne | L6-6d1 ; SPEC 6d (8) | | |
| 39 | admin | /plan-de-charge, 1024 px | Lire le lien « Plan de charge » du menu | Constat de la recette différée du lot 6, à juger : le lien passe sur deux lignes à 1024 px | L6-6f3 | | |
| 40 | admin | /plan-de-charge, 1440 px | Cliquer « Exporter CSV » | Téléchargement de `plan-de-charge-2026-11.csv` ; aucun état modifié | L6-6f1 ; SPEC 6f (3, 5) | | |
| 41 | admin | Fichier `plan-de-charge-2026-11.csv`, tableur français | Ouvrir le fichier | UTF-8 avec BOM, séparateur « ; », virgule décimale : colonnes Ressource, Équipe, Projet, Mois, Disponible, Réel, Planifié, Charge, Écart, accents corrects | L6-6f2 ; SPEC 6f (2, 3) | | |
| 42 | admin | /validation?semaine=2026-11-16, 1440 px | Lire le tableau | Alice « Soumise » : « DEMO-R · À valider », « DEMO-S · Validé » ; Bob « Soumise » : « DEMO-R · À valider » | 4c-RD-3 ; D-136 (2) | | |
| 43 | admin | /validation?semaine=2026-11-09, 1440 px | Lire le tableau | Bob « Validée » : « DEMO-R · Validé » ; Alice « Rejetée » : « DEMO-R » et « DEMO-S » sans suffixe | 4c-RD-4 ; D-136 (2) ; SPEC 4c (10b) | | |
| 44 | admin | /validation?semaine=2026-11-23, 1440 px | Lire le tableau | Alice « Brouillon », listée sans « Valider » ni « Rejeter », « Voir » présent | 4c-RD-6 ; SPEC 4c (7) | | |
| 45 | admin | /validation?semaine=2026-11-09 | « Voir la feuille de Alice » | Dialogue en lecture seule ; commentaire de rejet « Imputations du jeudi à revoir » | 4c-RD-5 ; SPEC 4c (4) | | |
| 46 | admin | /validation?semaine=2026-11-16, 1440 px | « Voir la feuille de Alice » : lire Assigné et Réel cumulé | Constat 4c (1), à juger : « Assigné » presque contre « Réel cumulé » | 4c (1) | | |
| 47 | admin | /validation?semaine=2026-11-16 | « Voir la feuille de Alice » : repérer la lecture seule | Tableau de 4b en lecture seule. Constat 4c (4), à juger : rien n'indique la lecture seule hors fond gris des cases | 4c (4) ; SPEC 4c (4) | | |
| 48 | admin | /validation?semaine=2026-11-16 | « Voir la feuille de Alice » : lire le badge de statut | Badge de statut non étiré sur toute la largeur (correction de la relecture 4c) | 4c (6) | | |
| 49 | admin | /validation?semaine=2026-11-16, 1024 px | Lire l'en-tête | Constat 4c (3), à juger : le libellé de semaine passe sous les boutons de navigation | 4c (3) ; 5d (2) | | |
| 50 | admin | /validation?semaine=2026-11-16, 1024 px | Lire la colonne Projets d'Alice | Constat 5d (2), à juger : badges sur plusieurs lignes, ligne plus haute | 5d (2) | | |
| 51 | admin | /validation?semaine=2026-11-16, 1440 px | « Valider la feuille de Bob » ; lire la confirmation puis Annuler | Confirmation « Valider la feuille de Bob pour DEMO-R ? ». Constat 4c (5), à juger : titre long, 2 lignes. Annuler : rien modifié | 4c (5) ; SPEC 4c (5) | | |
| 52 | admin | /validation?semaine=2026-11-16, 1440 px | Cliquer « Exporter CSV » | Dialogue « Exporter les imputations » : Du 16/11/2026 et Au 22/11/2026 préremplis, liste « Équipe », bouton « Exporter » | L6-6f1 ; SPEC 6f (6) | | |
| 53 | admin | Dialogue « Exporter les imputations » | Saisir Au avant Du | « Période invalide. », `aria-invalid`, bouton « Exporter » désactivé | L6-6f1 ; SPEC 6f (6) | | |
| 54 | admin | Dialogue « Exporter les imputations » | Période valide, « Exporter » | Téléchargement de `imputations-2026-11-16-2026-11-22.csv` ; dialogue fermé ; focus au bouton d'ouverture | L6-6f1 ; SPEC 6f (4, 6) | | |
| 55 | admin | Fichier `imputations-2026-11-16-2026-11-22.csv`, tableur français | Ouvrir le fichier | UTF-8 avec BOM, « ; », virgule décimale : colonnes Ressource, Équipe, Semaine, Statut, Projet, Activité, Jour, Charge | L6-6f2 ; SPEC 6f (2, 4) | | |
| 56 | admin | /validation?semaine=2026-11-02 | Lire le tableau | « Aucune feuille de temps pour cette semaine. » | 4c-RD-3 ; SPEC 4c (3) | | |
| 57 | chefa | / (après connexion) | Lire le menu latéral | Accueil, Projets, Plan de charge, Validation, Modèles ; ni Utilisateurs, ni « Mes tâches », ni « Imputations » (chefa non ressource) | RX5-5 ; D-165 (5) | | |
| 58 | chefa | /calendriers/1 | Saisir l'adresse | Redirection vers « / » sans entrée d'historique | RX5-3 ; D-165 (3 bis) | | |
| 59 | chefa | /validation?semaine=2026-11-16, 1440 px | Lire le tableau | Alice « Soumise » : « DEMO-R · À valider », « DEMO-S · Validé » ; Bob « Soumise » : « DEMO-R · À valider ». Boutons « Valider » et « Rejeter » présents | 4c-RD-1 ; D-136 (2) | | |
| 60 | chefa | /validation?semaine=2026-11-09, 1440 px | Lire le tableau | Bob « Validée » ; Alice « Rejetée », sans « Valider » ni « Rejeter », « Voir » présent | 4c-RD-4 ; SPEC 4c (7) | | |
| 61 | chefa | /, 1440 px | Lire la barre d'outils | Liste « Planning de » avant les boutons de zoom ; premier choix « Tous les projets » | L6-6e1 ; SPEC 6e (6) | | |
| 62 | chefa | / | « Planning de » : Alice | Adresse `/?ressource=<id>` ; tableau Projet, Activité, Début, Fin, Assigné, Réel, Reste, Drapeaux ; lignes DEMO-R et DEMO-S ; « Calculer », « Tout déplier » et case « Initiales » masqués | L6-6e1 ; SPEC 6e (6, 7, 8) | | |
| 63 | chefa | /?ressource=<id> | « Planning de » : « Tous les projets » | Retour au Gantt global, zoom conservé | L6-6e1 ; SPEC 6e (6) | | |
| 64 | chefa | /, 1440 px, Tous les projets | « Tout déplier », lire la colonne Drapeaux | Badge « Retard » sur Livraison et Intégration ; cellule vide sur les lignes de projet (décision D-132 (b) : pas un défaut) | DO-b ; D-132 | | |
| 65 | chefa | /, 1024 px | Lire le tableau et les en-têtes | Tableau entier visible à 1024 px sur l'Accueil, sans ombre (relecture REX-3b-r4) | DO-a | | |
| 66 | chefa | /, 1440 px | Tab jusqu'à un bouton-nom d'activité, puis jusqu'au crayon voisin | Anneau de focus visible, 2 px, accent (D-132 (c) : clos). Réserve, à juger : le contour du bouton-nom touche presque le crayon voisin | DO-c | | |
| 67 | chefa | /projets/1?onglet=gantt, 1440 px | Lire les en-têtes du tableau | En-têtes entiers de WBS à Drapeaux, « Charge » et « Avancement » complets | DO-d ; DO-e ; D-132 (d) | | |
| 68 | chefa | /projets/1?onglet=gantt, 1440 px | Lire le diagramme à droite du tableau | Constat à juger : diagramme plus étroit, 387 px visibles | L3-1 ; DO-i | | |
| 69 | chefa | /projets/1?onglet=gantt, 1024 px | Lire le diagramme à droite du tableau | Constat à juger : diagramme plus étroit, 150 px visibles | L3-2 ; DO-i | | |
| 70 | chefa | /projets/1?onglet=gantt, 1024 px | Lire l'en-tête « Charge » et le bord gauche de la colonne Drapeaux | Constat à juger : « Charge » tronqué en « Cl » sous la colonne Drapeaux collante ; filet d'ombre discret à gauche de Drapeaux | DO-g ; DO-h ; L3-7 | | |
| 71 | chefa | /projets/1?onglet=gantt, 1024 px | Tab sur la zone « Tableau du Gantt », puis flèche droite | La zone défile ; Début, Fin et Charge deviennent atteignables (SPEC 6 Affichage 12) | DO-a ; L3-7 | | |
| 72 | chefa | /projets/1?onglet=gantt, 1440 px | Lire le badge « Retard » de Livraison | Badge lisible, rouge sur fond rose, contraste correct | DO-f | | |
| 73 | chefa | /projets/1?onglet=gantt, 1440 px | Lire les colonnes Vendu et Marge | Cadrage : vendu 4, marge +1 ; Conception : vendu 2, marge −1 en couleur flag ; Phase 1 (parent) : vendu 6 ; jalons : cellules vides | L6-6c1 ; SPEC 6c | | |
| 74 | chefa | /projets/1?onglet=gantt, 1440 px | Lire la région « Totaux du projet » | « Vendu 6 j · Assigné Y j · Marge Z j · Réel W j », virgule décimale, marge < 0 en couleur flag | L6-6c2 ; SPEC 6c | | |
| 75 | chefa | /projets/1?onglet=gantt, 1440 px | Lire la colonne Nom d'« Étude préalable (close) » et de « Planning manuel bis » | Troncature par ellipsis avec `title` si besoin. Constat à juger : noms tronqués à 144 px à 1440 px | L6-6c5 ; L3-7 ; SPEC 6 Affichage 15 | | |
| 76 | chefa | /projets/1?onglet=gantt, 1440 px | Lire le jalon « Fin de phase 1 » dans le SVG | Losange en contour à la date client (23/11/2026) ; texte d'écart « +14 j » à droite du losange le plus à droite ; couleur flag (engagement dépassé) | L6-6c3 ; SPEC 6c | | |
| 77 | chefa | /projets/1?onglet=gantt, 1440 px | Lire la colonne Drapeaux du jalon « Fin de phase 1 » ; survoler le badge | Badge « Client » (couleur flag), `title` « Engagement client dépassé » | L6-6c4 ; SPEC 6c | | |
| 78 | chefa | /projets/1?onglet=gantt, zoom jour | Lire la case « Recalcul automatique », puis glisser la barre « Maquette » d'un jour | Case décochée par défaut ; après le geste, contour pointillé à la position relâchée et bandeau « Planning à recalculer » | L3-3 ; SPEC 3d (7), 3d-3 | | |
| 79 | chefa | /projets/1?onglet=gantt | Cocher « Recalcul automatique » alors que le bandeau est affiché | Calcul lancé tout de suite : « Recalcul en cours… » puis bandeau et contour effacés | L3-3 ; SPEC 3d-4 (10) | | |
| 80 | chefa | /projets/1?onglet=gantt | Tab jusqu'à la zone « Calendrier du Gantt », puis flèches haut et bas | Un seul arrêt de tabulation ; ↑ et ↓ choisissent la barre, anneau de focus, annonce de la barre active | L3-4 ; SPEC 3d (5) | | |
| 81 | chefa | /projets/1?onglet=gantt | Barre active choisie : Entrée, puis Annuler ; Échap | Entrée ouvre « Modifier l'activité » ; à la fermeture le focus revient à la zone, sur la même barre ; Échap désélectionne | L3-4 ; SPEC 3d (5, 9) | | |
| 82 | chefa | /projets/1?onglet=gantt | Clic droit sur la ligne « Cadrage » ; puis Échap | Entrées « Nouvelle activité », « Nouveau jalon », « Nouvelle sous-activité », dans cet ordre ; Échap ferme le menu, focus rendu à la zone d'origine | L3-5 ; SPEC 3f-2 (13) | | |
| 83 | chefa | /projets/1?onglet=gantt | Cliquer « Copier » (après la case « Initiales »), puis Annuler | Dialogue de copie, sans la case « Enregistrer comme modèle » (administrateur seul) | L3-5 ; SPEC 3f-2 (13) | | |
| 84 | chefa | /projets/1 (onglet Planning), 1024 px | Lire la colonne Nom | Constat à juger : nom sur deux lignes, lignes plus hautes | L3-8 ; REX-3a | | |
| 85 | chefa | /projets/1 (onglet Planning), 1024 px | Lire les boutons d'action d'une ligne, dont « Assigner » | Constat à juger : bouton d'affectation renvoyé à la ligne | L3-9 | | |
| 86 | chefa | Planning manuel de « Planning manuel », mois courant, 1024 px | Lire la grille | Constat à juger : jours 17 à 31 hors vue sans défilement | L3-10 | | |
| 87 | chefa | Planning manuel de « Planning manuel », 1440 px | Cocher une case d'un jour ouvré ; cliquer « Mois suivant » | Confirmation « Abandonner les modifications ? », texte « Les modifications non enregistrées seront perdues. », bouton « Abandonner » | D172-2 ; D-172 (2, 6) | | |
| 88 | chefa | Confirmation ouverte | Cliquer « Annuler » | On reste sur le mois, même adresse, case toujours cochée | D172-2 ; D-172 (2) | | |
| 89 | chefa | Confirmation ouverte | « Mois suivant » puis « Abandonner » | Mois suivant affiché ; retour au mois courant : la case n'est pas cochée, rien enregistré | D172-2 ; D-172 (2) | | |
| 90 | chefa | Planning manuel, case cochée | Cliquer « Mois précédent » | Une seule confirmation « Abandonner les modifications ? » | D172-2 ; D-172 (2, 6) | | |
| 91 | chefa | Planning manuel, case cochée | Cliquer « Retour au projet » | Une seule confirmation ; « Annuler » garde l'écran | D172-2 ; D-172 (2) | | |
| 92 | chefa | Planning manuel, case cochée | Cliquer l'entrée de menu « Accueil » | Une seule confirmation ; « Abandonner » mène à « / » | D172-2 ; D-172 (2) | | |
| 93 | chefa | Planning manuel, aucune modification | Cliquer « Mois suivant » | Aucune confirmation | D172-3 ; D-172 (2) | | |
| 94 | chefa | Planning manuel, case cochée | « Enregistrer », puis « Mois suivant » | Aucune confirmation après l'enregistrement | D172-3 ; D-172 (2) | | |
| 95 | chefa | Planning manuel, case cochée | Recharger la page (F5) | Message du navigateur (non personnalisable) | D172-4 ; D-172 (4) | | |
| 96 | chefa | Planning manuel, case cochée | Fermer l'onglet | Message du navigateur | D172-4 ; D-172 (4) | | |
| 97 | chefb | / (après connexion) | Lire le menu latéral | Mes tâches (en tête), Accueil, Projets, Plan de charge, Imputations, Validation, Modèles ; arrivée sur « / » | RX5-5 ; D-148 (11) | | |
| 98 | chefb | /projets/2?onglet=gantt, 1440 px | Ouvrir « Calculer » | Le dialogue propose DEMO-S (case) ; un chef de sous-projet calcule seul | L3-6 ; SPEC 3 Édition 13 | | |
| 99 | chefb | /projets/2?onglet=gantt | Calculer DEMO-S | Calcul réussi, sans refus 403 | L3-6 ; SPEC 3 Édition 13 | | |
| 100 | chefb | /projets/2?onglet=gantt | Cocher « Recalcul automatique », modifier une activité par le dialogue | Recalcul automatique du sous-projet, pas de 403 | L3-6 ; SPEC 3d-4 | | |
| 101 | chefb | /projets/1?onglet=gantt, 1440 px | Lire le Gantt de DEMO-R (lecture seule) | Ni colonnes Vendu et Marge, ni région « Totaux du projet », ni jalon avec date client ni badge « Client » (visibles seulement si `peut_ecrire`) | L6-6c1 ; SPEC 6c | | |
| 102 | chefb | /, 1440 px | « Planning de » : Bob | Une ligne « Autre projet » (activité « — », barre grise) avec DEMO-Q illisible ; lignes DEMO-R visibles | L6-6e2 ; SPEC 6e (5, 8, 9) | | |
| 103 | chefb | /validation?semaine=2026-11-16, 1440 px | Lire le tableau | Seule Alice, « Soumise » : « DEMO-R · Non autorisé », « DEMO-S · Validé » ; Bob absent | 4c-RD-2 ; D-136 (2) | | |
| 104 | chefb | /validation?semaine=2026-11-09, 1440 px | Lire le tableau | Seule Alice, « Rejetée » ; Bob absent | 4c-RD-5 ; SPEC 4c (7) | | |
| 105 | chefb | /mes-taches, 1440 px | Lire l'écran | « Aucune tâche en cours. ». Constat 6b (8), à juger : message centré sans icône ni indication de la suite à donner | 6b (8) ; L6-6b1 | | |
| 106 | chefb | /mes-taches, 1440 px | Lire la section « Mon calendrier » | Section (h2) sous le tableau : « Calendrier par défaut » ; « Jours travaillés : lundi, mardi, mercredi, jeudi, vendredi » ; « Aucun jour férié à venir. » (tant qu'aucun férié n'est ajouté) | RX5-4 ; D-165 (4) | | |
| 107 | chefb | /imputations, 1440 px | Lire l'écran | « Aucune activité à imputer cette semaine. » | 4b-RD ; SPEC 4b (3) | | |
| 108 | alice | / (après connexion) | Lire le menu latéral | Arrivée sur /mes-taches ; menu réduit à « Mes tâches » et « Imputations » | RX5-5 ; L6-6b2 ; D-165 (5) | | |
| 109 | alice | /projets, /validation, /plan-de-charge | Saisir chaque adresse | Redirection vers /mes-taches | L6-6b2 ; SPEC 6b | | |
| 110 | alice | /mes-taches, 1440 px | Lire le tableau « Mes tâches » | Colonnes Projet (code, `title` = nom), Activité, Début, Fin, Assigné, Réel, Reste ; tri par début planifié puis code puis WBS ; lecture seule | L6-6b1 ; SPEC 6b | | |
| 111 | alice | /mes-taches, 1440 px | Lire les colonnes Assigné, Réel, Reste | Constat 6b (1), à juger : colonnes numériques alignées à gauche, comparaison verticale peu aisée | 6b (1) | | |
| 112 | alice | /mes-taches, 1440 px | Lire les en-têtes Assigné, Réel, Reste | Constat 6b (3), à juger : aucune unité (jours ou heures) | 6b (3) | | |
| 113 | alice | /mes-taches, 1440 px | Chercher un repère pour les tâches à traiter en premier | Constat 6b (4), à juger : aucune mise en évidence du reste, aucun tri | 6b (4) | | |
| 114 | alice | /mes-taches, 1440 px | Cliquer une ligne | Constat 6b (5), à juger : lignes non cliquables, aucun lien vers la Feuille de temps ou les Imputations | 6b (5) | | |
| 115 | alice | /mes-taches, 1440 px | Survoler le code « DEMO-R » | `title` = nom du projet. Constat 6b (6), à juger : seul le code est affiché | 6b (6) ; SPEC 6b | | |
| 116 | alice | /mes-taches, 1440 px | Lire la répartition des colonnes | Constat 6b (7), à juger : colonne Activité très large, colonnes Début à Reste très espacées | 6b (7) | | |
| 117 | alice | /mes-taches, 1024 px | Lire la répartition des colonnes | Constat 6b (7) : meilleure répartition qu'à 1440 px ; pas de débordement | 6b (7) ; L6-6b1 | | |
| 118 | alice | /mes-taches | Lire le pied du menu | Nom de la ressource en petit texte gris. Constat 6b (9), à juger : pas de libellé de rôle, contraste faible | 6b (9) ; L6-6b2 | | |
| 119 | alice | /mes-taches | Lire le titre de page | Constat 6b (10), à juger : titre seul, sans sous-titre ni compte de tâches | 6b (10) | | |
| 120 | alice | /mes-taches | Observer les états chargement et erreur | « Impossible de charger vos tâches. » en cas d'échec (SPEC 6b). Constat 6b (11), à juger : aucune capture de ces états | 6b (11) ; L6-6b1 | | |
| 121 | alice | /mes-taches, 1440 px | Lire la section « Mon calendrier » | « Calendrier par défaut » ; « Jours travaillés : lundi, mardi, mercredi, jeudi, vendredi » ; tableau « Jours fériés à venir » ou « Aucun jour férié à venir. » | RX5-4 ; D-165 (4) | | |
| 122 | alice | /mes-taches | Après l'ajout du férié du 25/12/2026, lire « Jours fériés à venir » | Colonnes Date (25/12/2026) et Libellé (« Noël »), fériés ≥ date du jour, triés par date | RX5-4 ; D-165 (4) | | |
| 123 | alice | /mes-taches | Après l'ajout d'un férié sans libellé, lire « Jours fériés à venir » | Libellé : « — » | RX5-4 ; D-165 (4) | | |
| 124 | alice | /mes-taches | Observer l'échec de chargement du calendrier | « Impossible de charger votre calendrier. » ; le tableau des tâches n'est pas affecté, et inversement | RX5-4 ; D-165 (4) | | |
| 125 | alice | /imputations?semaine=2026-11-23, 1440 px | Lire l'écran | Titre « Feuille de temps » ; « Semaine du 23/11/2026 au 29/11/2026 » ; statut « Brouillon » ; lundi 23/11 : 0,5 sur Cadrage ; jours postérieurs au jour du navigateur : cases désactivées | 4b-RD ; SPEC 4b (2, 3) | | |
| 126 | alice | /imputations, 1440 px | Lire le tableau | Sans débordement ; Reste à faire et week-end visibles ; sept colonnes de jour de largeur égale | 4b (1) ; 4b (4) ; 4b-corr (1) | | |
| 127 | alice | /imputations, 1024 px | Lire le tableau | Sans débordement horizontal ; Reste à faire et week-end visibles ; colonnes de jour égales | 4b (1) ; 4b (4) ; 4b-corr (1) | | |
| 128 | alice | /imputations, 1440 px | Lire la barre d'outils | Une seule ligne ; statut et actions groupés à droite | 4b (2) ; 4b-corr (1) | | |
| 129 | alice | /imputations, 1024 px | Lire la barre d'outils | Deux lignes (navigation, puis libellé de semaine à gauche et groupe statut + actions à droite), groupe lié ; jugé acceptable, non bloquant | 4b (2) ; 4b-corr (2) | | |
| 130 | alice | /imputations?semaine=2026-11-23, 1440 px | Lire le badge « Brouillon » | Badge `warning`, lisible face aux autres statuts | 4b (5) ; 4b-corr (1) | | |
| 131 | alice | /imputations?semaine=2026-11-23, 1440 px | Lire les boutons « Enregistrer » et « Soumettre » sans modification | Désactivés, contraste faible : volontaire (D-134 (5)) ; à juger | 4b (5) ; 4b-corr (3) | | |
| 132 | alice | /imputations, 1024 px | Lire les en-têtes « Assigné » et « Réel cumulé » | Constat 4b-corr (4), à juger : en-têtes serrés, sans chevauchement | 4b-corr (4) | | |
| 133 | alice | /imputations, 1024 px | Lire la colonne Activité | Constat 5d (1) corrigé par D-186 (3) : « 1 Tâche A » entier, sans chevauchement avec « Assigné » ; contrôle : ligne 169 | 5d (1) | | |
| 134 | alice | /imputations?semaine=2026-11-23, 1440 px | Saisir « abc » dans la case de lundi | Case `aria-invalid` ; message sur une seule ligne sous le tableau « <jour> · <activité> : <message> », sans décaler les colonnes ; « Enregistrer » désactivé | 4b (3) ; 4b-corr (1) ; SPEC 4b (4) ; D-134 (4) | | |
| 135 | alice | /imputations, 1440 px | Garder le focus dans la case invalide | Constat 4b-corr (5), à juger : bordure rouge sous l'anneau de focus bleu, rouge peu visible | 4b-corr (5) | | |
| 136 | alice | /imputations?semaine=2026-11-16, 1440 px | Lire l'écran | Statut « Soumise » ; lecture seule | 4b-RD ; SPEC 4b (3, 7) | | |
| 137 | alice | /imputations?semaine=2026-11-16 | Cliquer « Rappeler » | Refus « La feuille est déjà validée en partie. » (validation de DEMO-S par chefb) ; statut inchangé | 4b-RD ; SPEC 4b (7, 10) | | |
| 138 | alice | /imputations?semaine=2026-11-09, 1440 px | Lire l'écran | Statut « Rejetée » ; alerte « Feuille rejetée : Imputations du jeudi à revoir » ; saisie possible | 4b-RD ; 4c-RD-5 ; SPEC 4b (2) | | |
| 139 | alice | /imputations?semaine=2026-11-23, 1440 px | Modifier une case (lundi : 0,5 → 1), cliquer l'entrée de menu « Mes tâches » | Une seule confirmation « Abandonner les modifications ? », texte « Les modifications non enregistrées seront perdues. », bouton « Abandonner » | D172-1 ; D-172 (2) | | |
| 140 | alice | Confirmation ouverte | Cliquer « Annuler » | On reste sur l'écran, même adresse, saisie intacte (1) | D172-1 ; D-172 (2) | | |
| 141 | alice | Confirmation ouverte | Cliquer « Abandonner » | Navigation vers « Mes tâches » ; retour sur la feuille : lundi à 0,5, rien enregistré | D172-1 ; D-172 (2) | | |
| 142 | alice | /imputations, case modifiée | Cliquer le logo « PlanerSource » | Sans objet : le logo n'est pas un lien (Layout.tsx:69) ; D-172 (2) le cite à tort | D172-1 | | |
| 143 | alice | /imputations, case modifiée | Retour du navigateur | Adresse de l'écran rétablie tant que la confirmation est ouverte ; « Abandonner » mène à la destination | D172-1 ; D-172 (3) | | |
| 144 | alice | /imputations, case modifiée | Cliquer « Se déconnecter » | Une seule confirmation ; « Annuler » garde la session et la saisie | D172-1 ; D-172 (5) | | |
| 145 | alice | /imputations?semaine=2026-11-23, case modifiée | Cliquer « Semaine précédente » | Une seule confirmation (pas de doublon) ; « Annuler » garde la semaine, l'adresse et la saisie | D172-1 ; D-172 (2) ; SPEC 4b (8) | | |
| 146 | alice | /imputations, aucune modification | Cliquer « Semaine précédente » | Aucune confirmation | D172-3 ; D-172 (2) | | |
| 147 | alice | /imputations?semaine=2026-11-23, case modifiée | « Enregistrer » (« Feuille enregistrée. »), puis « Semaine précédente » | Aucune confirmation après l'enregistrement | D172-3 ; D-172 (2) | | |
| 148 | alice | /imputations, case modifiée | Recharger la page (F5) | Message du navigateur (non personnalisable) | D172-4 ; D-172 (4) | | |
| 149 | alice | /imputations, case modifiée | Fermer l'onglet | Message du navigateur | D172-4 ; D-172 (4) | | |
| 150 | alice | /imputations?semaine=2026-11-23, 1440 px | Lire la colonne Projet d'une ligne à code de 30 caractères | Colonne Projet `w-28` : code coupé par une ellipse sans débordement (relecture 5d). Constat 5d (4), à juger : le code complet n'est lisible nulle part sur capture ; vérifier l'infobulle `title` | 5d (4) ; 5d (8) | | |
| 151 | alice | /imputations?semaine=2026-11-23, 1440 px | Lire la colonne Projet d'une ligne à code de 11 caractères | Code `PRJ-1234567` entier dans la colonne Projet | 5d (7) | | |
| 152 | bob | / (après connexion) | Lire le menu latéral | Arrivée sur /mes-taches ; « Mes tâches » et « Imputations » seulement | RX5-5 ; D-165 (5) | | |
| 153 | bob | /mes-taches, 1440 px | Lire la ligne « Accueil des clients » (DEMO-Q) | Début et Fin « — » (projet non calculé). Constat 6b (2), à juger : « — » sans indication que la tâche n'est pas planifiée ; ligne placée en dernier (début null) | 6b (2) ; SPEC 6b | | |
| 154 | bob | /imputations?semaine=2026-11-09, 1440 px | Lire l'écran | Statut « Validée » ; lecture seule | 4c-RD-4 ; SPEC 4b (3) | | |
| 155 | bob | /imputations?semaine=2026-11-16, 1440 px | Lire l'écran | Statut « Soumise » ; lecture seule | 4c-RD-1 ; SPEC 4b (3) | | |
| 156 | chefa | /validation?semaine=2026-11-09, 1440 px | Lire la ligne de Bob | Statut « Validée » ; badge « DEMO-R · Validé » ; boutons « Voir la feuille de Bob » et « Dévalider la feuille de Bob » ; ni « Valider » ni « Rejeter » | DEV-RD-1 ; SPEC Dévalidation (D-176) (2) | | |
| 157 | chefa | /validation?semaine=2026-11-09 | Cliquer « Dévalider la feuille de Bob » | Dialogue « Dévalider la feuille de Bob pour DEMO-R ? », texte « La feuille repassera au statut Soumise. », boutons « Annuler » et « Dévalider » | DEV-RD-2 ; SPEC Dévalidation (D-176) (2) | | |
| 158 | chefa | Confirmation ouverte | Cliquer « Annuler » | Dialogue fermé ; statut de Bob toujours « Validée » | DEV-RD-2 ; SPEC Dévalidation (D-176) (2) | | |
| 159 | chefa | /validation?semaine=2026-11-09 | « Dévalider la feuille de Bob », puis « Dévalider » | `role="status"` « Feuille dévalidée. » ; statut « Soumise » ; badge « DEMO-R · À valider » ; focus sur « Voir la feuille de Bob » | DEV-RD-3 ; SPEC Dévalidation (D-176) (2) ; D-145 (2) | | |
| 160 | chefa | /validation?semaine=2026-11-09 | Revalider : « Valider la feuille de Bob », puis « Valider » (rétablit l'état des lignes suivantes) | « Feuille validée. » ; statut « Validée » ; badge « DEMO-R · Validé » | DEV-RD-4 ; SPEC 4c (5) | | |
| 161 | admin | / puis /imputations?semaine=2026-11-23, 1440 px | Cliquer « Imputations » ; lire la barre d'outils ; choisir « Alice » dans la liste « Ressource » | À l'ouverture : message « Choisissez une ressource. » et aucune feuille (administrateur non ressource). Après le choix : titre « Feuille de temps de Alice », adresse `/imputations?semaine=2026-11-23&ressource=<id d'Alice>`, feuille d'Alice affichée ; la liste ne propose que des ressources actives, triées par nom | AUT-RD-1 ; SPEC Saisie pour autrui (D-181) (5) | | |
| 162 | admin | /imputations?semaine=2026-11-23&ressource=<id d'Alice> | Relever la valeur v de la case « Cadrage, lun. 23/11 », saisir 1, « Enregistrer » ; puis remettre v, « Enregistrer » de nouveau (les lignes suivantes restent vraies) | « Feuille enregistrée. » aux deux enregistrements ; la case garde la valeur saisie ; la feuille reste « Brouillon » ; valeur v rétablie à la fin | AUT-RD-2 ; SPEC Saisie pour autrui (D-181) (5), D-120 (9) | | |
| 163 | admin | /imputations?semaine=2026-11-23&ressource=<id d'Alice> | Modifier une case, puis choisir « Bob » dans la liste « Ressource » | Une seule confirmation « Abandonner les modifications ? » (texte « Les modifications non enregistrées seront perdues. ») ; « Annuler » : liste sur Alice, même adresse, saisie intacte ; second essai puis « Abandonner » : feuille de Bob, rien enregistré ; sans modification : aucune confirmation | AUT-RD-3 ; SPEC Saisie pour autrui (D-181) (5) ; D-172 (2) | | |
| 164 | alice | /imputations?semaine=2026-11-23&ressource=<id de Bob> | Saisir l'adresse (id de Bob : le relever dans la liste de l'administrateur, valeur de l'option) | Paramètre `ressource` retiré de l'adresse sans rechargement ; titre « Feuille de temps » ; ses propres lignes ; aucune liste « Ressource » | AUT-RD-4 ; SPEC Saisie pour autrui (D-181) (5), D-184 (3) | | |
| 165 | admin | /validation?semaine=2026-11-23, 1440 px | Lire le badge Projets de la feuille d'Alice portant le projet à code de 30 caractères | Constat 5d (5), à juger : le badge de 30 caractères reste long, près d'un tiers de la colonne Projets | 5d (5) | | |
| 166 | admin | /validation?semaine=2026-11-23 | « Voir la feuille de Alice » : lire le pied de tableau | Ligne « Total » ; total > capacité du jour : icône et texte « Dépassement ». Constat 4c (2), à juger : « Dépassement » sans lien visible avec une ligne | 4c (2) ; SPEC 4b (5) | | |
| 167 | admin | /validation?semaine=2026-11-16 | Deux onglets du navigateur sur cette page. Onglet 1 : valider Bob. Onglet 2 (page non rechargée) : « Valider la feuille de Bob », confirmer | Notification d'erreur `role="alert"` « La feuille a changé de statut. » au-dessus du tableau, dialogue fermé, liste relue. Constat 5d (6) : alerte pleine largeur, rouge sur rose, icône. Constat 5d (3), à juger : pas de bouton de fermeture | 5d (3) ; 5d (6) ; SPEC 4c (8) | | |
| 168 | admin | /validation?semaine=2026-11-16, 1024 px | Même manœuvre, alerte affichée | L'alerte reste lisible, sans chevauchement entre la navigation et le tableau | 5d (6) | | |
| 169 | admin | /imputations?semaine=2026-11-23&ressource=<id d'Alice>, 1024 px | Lire le tableau | Colonne Activité lisible (« Cadrage » entier, sans « … »), en-têtes en petits caractères sans débordement ni chevauchement, Assigné et Réel cumulé distincts ; aucun défilement horizontal ; mêmes constats à 1280 px | RET-RD-1 ; D-186 (3) | | |
| 170 | admin | /imputations, rechargée (F5), 1440 px | Observer la liste « Ressource » pendant le chargement, puis ouvrir la liste | Liste présente dès l'affichage (désactivée, « Chargement… »), l'en-tête ne bouge pas quand elle se remplit ; « Choisir… » grisée, non sélectionnable, en tête de liste | RET-RD-2 ; D-186 (1), (2) | | |
| 171 | admin | /imputations?semaine=2026-11-23&ressource=<id d'Alice> | Ouvrir la liste « Ressource » après le choix d'Alice | « Choisir… » toujours présente, grisée ; aucun retour possible à « Choisissez une ressource. » | RET-RD-2 ; D-186 (2) | | |
| 172 | admin | /utilisateurs, 1440 px | « Nouvel utilisateur », saisir un nom, appuyer sur Échap | Confirmation « Abandonner les modifications ? » (texte « Les modifications non enregistrées seront perdues. », boutons « Annuler » et « Abandonner » en rouge) au-dessus du dialogue ; « Annuler » : dialogue conservé, saisie et focus gardés ; second Échap puis « Abandonner » : fermeture, aucun utilisateur créé | GDL-RD-1 ; D-188 (1), (2) | | |
| 173 | admin | /utilisateurs | Même dialogue : le fermer sans saisie (Échap, croix, clic hors du dialogue, « Annuler »), puis saisir un nom et l'effacer avant de fermer | Aucune confirmation dans tous les cas | GDL-RD-2 ; D-188 (1) | | |
| 174 | admin | /utilisateurs | « Nouvel utilisateur » : identifiant déjà utilisé (« bob »), « Créer » (refus), puis « Annuler » | Confirmation (la saisie existe encore) ; « Abandonner » ferme sans création | GDL-RD-3 ; D-188 (5) | | |
| 175 | admin | /utilisateurs?onglet=equipes | « Nouvelle équipe », nom saisi, « Créer » | Le dialogue se ferme, l'équipe apparaît, aucune confirmation | GDL-RD-3 ; D-188 (5) | | |
| 176 | admin | /projets/1, onglet Gantt ou Planning | « Modifier le projet », ouvrir puis fermer sans toucher ; puis changer le nom et fermer | Sans toucher : aucune confirmation ; nom changé : confirmation | GDL-RD-4 ; D-188 (4), (10) b | | |
| 177 | admin | /validation?semaine=2026-11-16 | « Rejeter la feuille de Alice », saisir un commentaire, Échap ; puis « Exporter CSV », changer la date « Du », Échap | Rejeter : confirmation ; Exporter : fermeture directe, aucune confirmation | GDL-RD-5 ; D-188 (7), (10) a | | |
| 178 | admin | /utilisateurs?onglet=calendriers puis /calendriers/<id> | « Nouveau calendrier » puis « Ajouter un jour férié » : saisir un nom ou un libellé, cliquer le bouton « Annuler » du formulaire (pas Échap) | Confirmation « Abandonner les modifications ? » ; « Annuler » garde la saisie, « Abandonner » ferme sans rien créer ; sans saisie : fermeture directe | GDL-RD-6 ; D-188 (6), D-190 (7) | | |
| 179 | admin | /projets puis /validation?semaine=2026-11-16 | « Nouveau projet » (code saisi) puis « Rejeter la feuille de Alice » (commentaire saisi) : bouton « Annuler » du formulaire | Même confirmation dans les deux cas ; fermeture directe sans saisie | GDL-RD-6 ; D-188 (6), D-190 (7) | | |
| 180 | admin | /utilisateurs?onglet=equipes | Provoquer une confirmation de suppression (« Supprimer <équipe> »), lire le focus initial, appuyer sur Entrée | Le focus est sur « Annuler » (non sur la croix) ; Entrée ferme sans supprimer ; même constat pour la confirmation d'abandon (ligne 172) | GDL-RD-7 ; D-190 (4) | | |
| 181 | porteur | Sans objet | Installation sous Windows abandonnée (D-203) | Sans objet : l’installation sous Windows n’est plus proposée (D-203) | D-203 | Sans objet (D-203) | |

Verdicts admis : OK, KO, Non bloquant, Non vérifiable, Sans objet.

- OK : le comportement attendu est observé.
- KO : le comportement attendu n'est pas observé, ou le défaut est à corriger.
- Non bloquant : le défaut est réel, mais accepté tel quel.
- Non vérifiable : la ligne ne peut pas être jugée (donnée absente, voir la section suivante).

## Recette réduite (D-202)

Décision D-202 (2026-11-24) : une ligne déjà couverte par un e2e sort de la recette manuelle. Le tableau « Parcours » (D-174) est conservé tel quel ; les verdicts se reportent dans sa colonne Verdict, au numéro d’origine. Classement par lecture seule, aucun test exécuté. Les lignes couvertes sont dans la section « Lignes couvertes par les e2e (D-202) ».

D-204 (2026-11-24) : chaque ligne reçoit un Statut, « porteur » (70 lignes, dont 5 de préparation) ou « à automatiser (D-204) » (44 lignes). Les lignes à jouer sont reprises dans la section « Recette du porteur (D-204) », qui suit. Les comptes et durées du tableau ci-dessous sont ceux de D-202, avant D-204.

Le Parcours compte 181 lignes. Couvertes : 73 (dont 7 reprises en préparation). Au porteur : 107 (la ligne 181, installation sous Windows, est sans objet, D-203). À jouer : 114 lignes (107 au porteur + 7 de préparation).

| Bloc du Parcours | Lignes d’origine | À jouer | dont préparation | Durée estimée |
|---|---|---|---|---|
| admin | 1 à 56 (56) | 34 | 3 | 56 min |
| chefa | 57 à 96 (40) | 31 | 2 | 52 min |
| chefb | 97 à 107 (11) | 5 | 0 | 8 min |
| alice | 108 à 151 (44) | 28 | 1 | 45 min |
| bob | 152 à 155 (4) | 1 | 0 | 2 min |
| chefa (retour) | 156 à 160 (5) | 5 | 1 | 8 min |
| admin (retour) | 161 à 180 (20) | 10 | 0 | 18 min |
| Total | 180 (la ligne 181 est sans objet) | 114 | 7 | 189 min |

Estimation : 1,5 min par ligne, plus les manipulations (admin 5 min : ligne 22 ; chefa 6 min : projet à code de 30 caractères ; alice 3 min : ligne 166 ; retour d’admin 3 min). Hors pauses et hors reprises. Les comptes se jouent dans l’ordre du Parcours ; « chefa (retour) » et « admin (retour) » sont les blocs 156 à 160 et 161 à 180.

Dépendances (lignes couvertes reprises, marquées « préparation ») :

- 40 : préparation de 41 (fichier à ouvrir).
- 52 : préparation de 55 (ouvre le dialogue d’export).
- 54 : préparation de 55 (fichier à ouvrir).
- 79 : préparation : rétablit l’état après 78.
- 88 : préparation de 89 (ferme la confirmation de 87).
- 134 : préparation de 135 (case invalide).
- 159 : préparation de 160 (Bob dévalidé, à revalider).
- 90, 92, 94 et 96 : cocher d’abord une case d’un jour ouvré du Planning manuel (comme à la ligne 87) ; 145 et 149 : modifier d’abord une case de la Feuille de temps (comme à la ligne 139).
- 169 : l’identifiant d’Alice se relève dans la liste « Ressource » de l’administrateur (valeur de l’option, comme à la ligne 164).
- 168 : reprend l’alerte affichée à la ligne 167, à 1024 px.
- 22 : la manipulation détruit le jeu de démonstration ; la faire en toute fin de recette, puis relancer `npm run demo`.

Manipulations préalables retenues (section « Non vérifiables avec le jeu de démonstration » ; les lignes 37, 122, 123, 124 et 151 sont couvertes : leurs manipulations ne sont plus nécessaires) :

- Ligne 22 : voir la ligne 22 de la section « Non vérifiables… » (vide : détruit le jeu ; chargement et erreur : aucune).
- Lignes 150 et 165 : avec chefa, avant les lignes d’Alice, créer le seul projet de code `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123` (30 caractères), affecter Alice, créer une activité et l’assigner à Alice ; Alice saisit 0,5 le lundi 23/11 sur cette ligne et enregistre. Le projet `PRJ-1234567` n’est plus nécessaire (ligne 151 couverte).
- Ligne 166 : Alice, Imputations, semaine 2026-11-23 : Cadrage lundi = 1,5, « Enregistrer », à faire en fin des lignes d’Alice.
- Lignes 120 et 105 : aucune manipulation.

### admin — 34 lignes, 56 min

| N° | Compte | Écran | Action | Attendu | Raison | Statut |
|---|---|---|---|---|---|---|
| 1 | admin | / (après connexion) | Lire le menu latéral | Accueil, Projets, Plan de charge, Imputations, Validation, Modèles, Utilisateurs ; ni « Équipes » ni « Calendriers » ; pas de « Mes tâches » (administrateur non ressource ; « Imputations » présente pour tout administrateur, D-181 (5), D-184) | liste complète du menu non assertionnée | à automatiser (D-204) |
| 5 | admin | /utilisateurs, 1024 px | Parcourir les trois onglets | Constat à juger (aucun critère propre à 1024 px dans la source) | 1024 px, constat à juger | porteur |
| 7 | admin | /utilisateurs, onglet Utilisateurs, 1440 px | Lire le tableau | Colonnes Identifiant, Initiales, Ressource, Calendrier, Équipe ; Alice : équipe « Développement ». Constat 6a (2), à juger : Nom, Identifiant et Email passent sur deux lignes, lignes plus hautes | constat à juger | porteur |
| 8 | admin | /utilisateurs, onglet Utilisateurs, 1024 px | Lire le tableau ; chercher le bouton « Modifier Alice » | Constat 6a (1), à juger : Capacité (coupée), Calendrier, Équipe, Statut et Actions hors écran, aucun indice de défilement, bouton de modification inaccessible sans défiler | 1024 px, constat à juger | porteur |
| 9 | admin | /utilisateurs, onglet Utilisateurs | Lire la ligne « Admin » : colonnes Équipe et Initiales | Équipe : « — » ; Initiales : « — » (SPEC). Constat 6a (5), à juger : « sans équipe » et « non renseigné » se confondent | constat à juger | porteur |
| 10 | admin | /utilisateurs, onglet Utilisateurs, 1440 px | Ouvrir « Nouvel utilisateur » ; atteindre le champ « Équipe » et les boutons Annuler / Créer | Liste « Équipe » : premier choix « Aucune », équipes triées par nom. Constat 6a (3), à juger : la boîte touche le haut et le bas de la fenêtre, défilement interne non signalé | constat à juger | porteur |
| 11 | admin | /utilisateurs, onglet Utilisateurs, 1024 px | Ouvrir « Nouvel utilisateur » ; atteindre le champ « Équipe » et les boutons Annuler / Créer | Même attendu qu'à 1440 px ; constat 6a (3), à juger | 1024 px, constat à juger | porteur |
| 12 | admin | /utilisateurs?onglet=equipes, 1440 px | Lire le tableau « Liste des équipes » | Colonnes Nom, Membres, Actions ; Développement : 2 membres, Pilotage : 2 membres. Constat 6a (4), à juger : Membres et Actions très à droite, sans lien visuel avec Nom | constat à juger | porteur |
| 13 | admin | /utilisateurs?onglet=equipes, 1024 px | Lire le tableau « Liste des équipes » | Même contenu qu'à 1440 px, sans débordement | 1024 px, mise en page | porteur |
| 14 | admin | /utilisateurs?onglet=equipes | « Nouvelle équipe » : saisir « Pilotage », Créer | « Cette équipe existe déjà. » ; rien de modifié (toujours 2 équipes). Constat 6a (7), à juger : message en haut, éloigné du champ Nom, champ sans état invalide visible | constat à juger | porteur |
| 15 | admin | /utilisateurs?onglet=equipes | « Supprimer Développement », confirmer | « Cette équipe a des membres : retirez-les d'abord. » ; dialogue ouvert, rien de modifié. Constat 6a (6), à juger : le bouton Supprimer est actif alors que l'équipe a des membres ; message sur deux lignes | constat à juger | porteur |
| 22 | admin | /utilisateurs?onglet=equipes | Observer les états chargement, vide et erreur de l'écran Équipes | Constat 6a (8) : aucune capture de ces états ; à juger (états « Aucune équipe pour le moment. » pour le vide) | constat à juger | porteur |
| 23 | admin | /utilisateurs?onglet=calendriers | Lire le tableau | « Calendrier par défaut » avec 0 jour férié ; lien vers le détail | jeu de démonstration, aucun e2e équivalent | à automatiser (D-204) |
| 30 | admin | /plan-de-charge, 1440 px | Ouvrir l'écran par le menu | Entrée « Plan de charge » après « Projets » ; tableau « Plan de charge » : 12 colonnes « MM/AAAA » à partir du mois courant (11/2026) ; ressources Alice, Bob, Chef B, tout replié | données de démonstration, mois courant | à automatiser (D-204) |
| 31 | admin | /plan-de-charge, 1440 px | Survoler la cellule 11/2026 d'Alice | `title` « Charge 10 j, disponible 21 j, écart 11 j » (valeurs de la base de démonstration) | valeurs de démonstration non assertionnées | à automatiser (D-204) |
| 34 | admin | /plan-de-charge, 1440 px | Liste « Équipe » : « Sans équipe » | « Aucune ressource. » | cas « Sans équipe » vide non couvert | à automatiser (D-204) |
| 36 | admin | /plan-de-charge, 1440 px | Lire le champ « Mois de départ » (type month, Chromium) | Constat de la recette différée du lot 6, à juger : le champ Mois s'affiche en anglais dans Chromium | constat à juger | porteur |
| 38 | admin | /plan-de-charge, 1024 px | Lire l'écran, défiler le tableau | La page ne défile pas en horizontal ; zone « Plan de charge » focalisable, défilement horizontal interne | 1024 px, mise en page | porteur |
| 39 | admin | /plan-de-charge, 1024 px | Lire le lien « Plan de charge » du menu | Constat de la recette différée du lot 6, à juger : le lien passe sur deux lignes à 1024 px | 1024 px, constat à juger | porteur |
| 40 | admin | /plan-de-charge, 1440 px | Cliquer « Exporter CSV » | Téléchargement de `plan-de-charge-2026-11.csv` ; aucun état modifié | préparation — préparation de 41 (fichier à ouvrir) | porteur |
| 41 | admin | Fichier `plan-de-charge-2026-11.csv`, tableur français | Ouvrir le fichier | UTF-8 avec BOM, séparateur « ; », virgule décimale : colonnes Ressource, Équipe, Projet, Mois, Disponible, Réel, Planifié, Charge, Écart, accents corrects | ouverture dans un tableur français | porteur |
| 42 | admin | /validation?semaine=2026-11-16, 1440 px | Lire le tableau | Alice « Soumise » : « DEMO-R · À valider », « DEMO-S · Validé » ; Bob « Soumise » : « DEMO-R · À valider » | cas de démonstration mixte, administrateur | à automatiser (D-204) |
| 43 | admin | /validation?semaine=2026-11-09, 1440 px | Lire le tableau | Bob « Validée » : « DEMO-R · Validé » ; Alice « Rejetée » : « DEMO-R » et « DEMO-S » sans suffixe | suffixe des feuilles rejetées non assertionné | à automatiser (D-204) |
| 45 | admin | /validation?semaine=2026-11-09 | « Voir la feuille de Alice » | Dialogue en lecture seule ; commentaire de rejet « Imputations du jeudi à revoir » | e2e sous le rôle chef de projet | à automatiser (D-204) |
| 46 | admin | /validation?semaine=2026-11-16, 1440 px | « Voir la feuille de Alice » : lire Assigné et Réel cumulé | Constat 4c (1), à juger : « Assigné » presque contre « Réel cumulé » | constat à juger | porteur |
| 47 | admin | /validation?semaine=2026-11-16 | « Voir la feuille de Alice » : repérer la lecture seule | Tableau de 4b en lecture seule. Constat 4c (4), à juger : rien n'indique la lecture seule hors fond gris des cases | constat à juger | porteur |
| 48 | admin | /validation?semaine=2026-11-16 | « Voir la feuille de Alice » : lire le badge de statut | Badge de statut non étiré sur toute la largeur (correction de la relecture 4c) | apparence du badge | porteur |
| 49 | admin | /validation?semaine=2026-11-16, 1024 px | Lire l'en-tête | Constat 4c (3), à juger : le libellé de semaine passe sous les boutons de navigation | 1024 px, constat à juger | porteur |
| 50 | admin | /validation?semaine=2026-11-16, 1024 px | Lire la colonne Projets d'Alice | Constat 5d (2), à juger : badges sur plusieurs lignes, ligne plus haute | 1024 px, constat à juger | porteur |
| 51 | admin | /validation?semaine=2026-11-16, 1440 px | « Valider la feuille de Bob » ; lire la confirmation puis Annuler | Confirmation « Valider la feuille de Bob pour DEMO-R ? ». Constat 4c (5), à juger : titre long, 2 lignes. Annuler : rien modifié | constat à juger | porteur |
| 52 | admin | /validation?semaine=2026-11-16, 1440 px | Cliquer « Exporter CSV » | Dialogue « Exporter les imputations » : Du 16/11/2026 et Au 22/11/2026 préremplis, liste « Équipe », bouton « Exporter » | préparation — préparation de 55 (ouvre le dialogue d’export) | porteur |
| 54 | admin | Dialogue « Exporter les imputations » | Période valide, « Exporter » | Téléchargement de `imputations-2026-11-16-2026-11-22.csv` ; dialogue fermé ; focus au bouton d'ouverture | préparation — préparation de 55 (fichier à ouvrir) | porteur |
| 55 | admin | Fichier `imputations-2026-11-16-2026-11-22.csv`, tableur français | Ouvrir le fichier | UTF-8 avec BOM, « ; », virgule décimale : colonnes Ressource, Équipe, Semaine, Statut, Projet, Activité, Jour, Charge | ouverture dans un tableur français | porteur |
| 56 | admin | /validation?semaine=2026-11-02 | Lire le tableau | « Aucune feuille de temps pour cette semaine. » | e2e sous le rôle chef de projet | à automatiser (D-204) |

### chefa — 31 lignes, 52 min

| N° | Compte | Écran | Action | Attendu | Raison | Statut |
|---|---|---|---|---|---|---|
| 57 | chefa | / (après connexion) | Lire le menu latéral | Accueil, Projets, Plan de charge, Validation, Modèles ; ni Utilisateurs, ni « Mes tâches », ni « Imputations » (chefa non ressource) | liste complète du menu non assertionnée | à automatiser (D-204) |
| 59 | chefa | /validation?semaine=2026-11-16, 1440 px | Lire le tableau | Alice « Soumise » : « DEMO-R · À valider », « DEMO-S · Validé » ; Bob « Soumise » : « DEMO-R · À valider ». Boutons « Valider » et « Rejeter » présents | cas de démonstration mixte, boutons | à automatiser (D-204) |
| 60 | chefa | /validation?semaine=2026-11-09, 1440 px | Lire le tableau | Bob « Validée » ; Alice « Rejetée », sans « Valider » ni « Rejeter », « Voir » présent | e2e administrateur seulement | à automatiser (D-204) |
| 62 | chefa | / | « Planning de » : Alice | Adresse `/?ressource=<id>` ; tableau Projet, Activité, Début, Fin, Assigné, Réel, Reste, Drapeaux ; lignes DEMO-R et DEMO-S ; « Calculer », « Tout déplier » et case « Initiales » masqués | e2e sous le rôle administrateur | à automatiser (D-204) |
| 63 | chefa | /?ressource=<id> | « Planning de » : « Tous les projets » | Retour au Gantt global, zoom conservé | e2e sous le rôle administrateur | à automatiser (D-204) |
| 64 | chefa | /, 1440 px, Tous les projets | « Tout déplier », lire la colonne Drapeaux | Badge « Retard » sur Livraison et Intégration ; cellule vide sur les lignes de projet (décision D-132 (b) : pas un défaut) | colonne Drapeaux de l’Accueil, sans e2e | à automatiser (D-204) |
| 65 | chefa | /, 1024 px | Lire le tableau et les en-têtes | Tableau entier visible à 1024 px sur l'Accueil, sans ombre (relecture REX-3b-r4) | 1024 px, mise en page | porteur |
| 66 | chefa | /, 1440 px | Tab jusqu'à un bouton-nom d'activité, puis jusqu'au crayon voisin | Anneau de focus visible, 2 px, accent (D-132 (c) : clos). Réserve, à juger : le contour du bouton-nom touche presque le crayon voisin | réserve à juger | porteur |
| 67 | chefa | /projets/1?onglet=gantt, 1440 px | Lire les en-têtes du tableau | En-têtes entiers de WBS à Drapeaux, « Charge » et « Avancement » complets | mise en page des en-têtes | porteur |
| 68 | chefa | /projets/1?onglet=gantt, 1440 px | Lire le diagramme à droite du tableau | Constat à juger : diagramme plus étroit, 387 px visibles | constat à juger | porteur |
| 69 | chefa | /projets/1?onglet=gantt, 1024 px | Lire le diagramme à droite du tableau | Constat à juger : diagramme plus étroit, 150 px visibles | 1024 px, constat à juger | porteur |
| 70 | chefa | /projets/1?onglet=gantt, 1024 px | Lire l'en-tête « Charge » et le bord gauche de la colonne Drapeaux | Constat à juger : « Charge » tronqué en « Cl » sous la colonne Drapeaux collante ; filet d'ombre discret à gauche de Drapeaux | 1024 px, constat à juger | porteur |
| 71 | chefa | /projets/1?onglet=gantt, 1024 px | Tab sur la zone « Tableau du Gantt », puis flèche droite | La zone défile ; Début, Fin et Charge deviennent atteignables (SPEC 6 Affichage 12) | 1024 px, zone défilante | porteur |
| 72 | chefa | /projets/1?onglet=gantt, 1440 px | Lire le badge « Retard » de Livraison | Badge lisible, rouge sur fond rose, contraste correct | apparence du badge | porteur |
| 73 | chefa | /projets/1?onglet=gantt, 1440 px | Lire les colonnes Vendu et Marge | Cadrage : vendu 4, marge +1 ; Conception : vendu 2, marge −1 en couleur flag ; Phase 1 (parent) : vendu 6 ; jalons : cellules vides | e2e sous le rôle administrateur | à automatiser (D-204) |
| 74 | chefa | /projets/1?onglet=gantt, 1440 px | Lire la région « Totaux du projet » | « Vendu 6 j · Assigné Y j · Marge Z j · Réel W j », virgule décimale, marge < 0 en couleur flag | marge négative des totaux non assertionnée | à automatiser (D-204) |
| 75 | chefa | /projets/1?onglet=gantt, 1440 px | Lire la colonne Nom d'« Étude préalable (close) » et de « Planning manuel bis » | Troncature par ellipsis avec `title` si besoin. Constat à juger : noms tronqués à 144 px à 1440 px | constat à juger | porteur |
| 76 | chefa | /projets/1?onglet=gantt, 1440 px | Lire le jalon « Fin de phase 1 » dans le SVG | Losange en contour à la date client (23/11/2026) ; texte d'écart « +14 j » à droite du losange le plus à droite ; couleur flag (engagement dépassé) | position du texte d’écart | porteur |
| 77 | chefa | /projets/1?onglet=gantt, 1440 px | Lire la colonne Drapeaux du jalon « Fin de phase 1 » ; survoler le badge | Badge « Client » (couleur flag), `title` « Engagement client dépassé » | e2e sous le rôle administrateur | à automatiser (D-204) |
| 78 | chefa | /projets/1?onglet=gantt, zoom jour | Lire la case « Recalcul automatique », puis glisser la barre « Maquette » d'un jour | Case décochée par défaut ; après le geste, contour pointillé à la position relâchée et bandeau « Planning à recalculer » | geste glisser, contour pointillé | porteur |
| 79 | chefa | /projets/1?onglet=gantt | Cocher « Recalcul automatique » alors que le bandeau est affiché | Calcul lancé tout de suite : « Recalcul en cours… » puis bandeau et contour effacés | préparation — préparation : rétablit l’état après 78 | porteur |
| 84 | chefa | /projets/1 (onglet Planning), 1024 px | Lire la colonne Nom | Constat à juger : nom sur deux lignes, lignes plus hautes | 1024 px, constat à juger | porteur |
| 85 | chefa | /projets/1 (onglet Planning), 1024 px | Lire les boutons d'action d'une ligne, dont « Assigner » | Constat à juger : bouton d'affectation renvoyé à la ligne | 1024 px, constat à juger | porteur |
| 86 | chefa | Planning manuel de « Planning manuel », mois courant, 1024 px | Lire la grille | Constat à juger : jours 17 à 31 hors vue sans défilement | 1024 px, constat à juger | porteur |
| 87 | chefa | Planning manuel de « Planning manuel », 1440 px | Cocher une case d'un jour ouvré ; cliquer « Mois suivant » | Confirmation « Abandonner les modifications ? », texte « Les modifications non enregistrées seront perdues. », bouton « Abandonner » | texte de la confirmation non assertionné | à automatiser (D-204) |
| 88 | chefa | Confirmation ouverte | Cliquer « Annuler » | On reste sur le mois, même adresse, case toujours cochée | préparation — préparation de 89 (ferme la confirmation de 87) | à automatiser (D-204) |
| 89 | chefa | Confirmation ouverte | « Mois suivant » puis « Abandonner » | Mois suivant affiché ; retour au mois courant : la case n'est pas cochée, rien enregistré | retour au mois non assertionné | à automatiser (D-204) |
| 90 | chefa | Planning manuel, case cochée | Cliquer « Mois précédent » | Une seule confirmation « Abandonner les modifications ? » | « Mois précédent » sans e2e équivalent | à automatiser (D-204) |
| 92 | chefa | Planning manuel, case cochée | Cliquer l'entrée de menu « Accueil » | Une seule confirmation ; « Abandonner » mène à « / » | entrée de menu « Accueil » sans e2e | à automatiser (D-204) |
| 94 | chefa | Planning manuel, case cochée | « Enregistrer », puis « Mois suivant » | Aucune confirmation après l'enregistrement | enregistrer puis « Mois suivant » sans e2e | à automatiser (D-204) |
| 96 | chefa | Planning manuel, case cochée | Fermer l'onglet | Message du navigateur | fermeture de l’onglet non testée | à automatiser (D-204) |

### chefb — 5 lignes, 8 min

| N° | Compte | Écran | Action | Attendu | Raison | Statut |
|---|---|---|---|---|---|---|
| 97 | chefb | / (après connexion) | Lire le menu latéral | Mes tâches (en tête), Accueil, Projets, Plan de charge, Imputations, Validation, Modèles ; arrivée sur « / » | liste complète du menu non assertionnée | à automatiser (D-204) |
| 103 | chefb | /validation?semaine=2026-11-16, 1440 px | Lire le tableau | Seule Alice, « Soumise » : « DEMO-R · Non autorisé », « DEMO-S · Validé » ; Bob absent | cas de démonstration, compte chefb | à automatiser (D-204) |
| 104 | chefb | /validation?semaine=2026-11-09, 1440 px | Lire le tableau | Seule Alice, « Rejetée » ; Bob absent | cas de démonstration, compte chefb | à automatiser (D-204) |
| 105 | chefb | /mes-taches, 1440 px | Lire l'écran | « Aucune tâche en cours. ». Constat 6b (8), à juger : message centré sans icône ni indication de la suite à donner | constat à juger | porteur |
| 107 | chefb | /imputations, 1440 px | Lire l'écran | « Aucune activité à imputer cette semaine. » | chef ressource sans assignation, sans e2e | à automatiser (D-204) |

### alice — 28 lignes, 45 min

| N° | Compte | Écran | Action | Attendu | Raison | Statut |
|---|---|---|---|---|---|---|
| 111 | alice | /mes-taches, 1440 px | Lire les colonnes Assigné, Réel, Reste | Constat 6b (1), à juger : colonnes numériques alignées à gauche, comparaison verticale peu aisée | constat à juger | porteur |
| 112 | alice | /mes-taches, 1440 px | Lire les en-têtes Assigné, Réel, Reste | Constat 6b (3), à juger : aucune unité (jours ou heures) | constat à juger | porteur |
| 113 | alice | /mes-taches, 1440 px | Chercher un repère pour les tâches à traiter en premier | Constat 6b (4), à juger : aucune mise en évidence du reste, aucun tri | constat à juger | porteur |
| 114 | alice | /mes-taches, 1440 px | Cliquer une ligne | Constat 6b (5), à juger : lignes non cliquables, aucun lien vers la Feuille de temps ou les Imputations | constat à juger | porteur |
| 115 | alice | /mes-taches, 1440 px | Survoler le code « DEMO-R » | `title` = nom du projet. Constat 6b (6), à juger : seul le code est affiché | constat à juger | porteur |
| 116 | alice | /mes-taches, 1440 px | Lire la répartition des colonnes | Constat 6b (7), à juger : colonne Activité très large, colonnes Début à Reste très espacées | constat à juger | porteur |
| 117 | alice | /mes-taches, 1024 px | Lire la répartition des colonnes | Constat 6b (7) : meilleure répartition qu'à 1440 px ; pas de débordement | 1024 px, constat à juger | porteur |
| 118 | alice | /mes-taches | Lire le pied du menu | Nom de la ressource en petit texte gris. Constat 6b (9), à juger : pas de libellé de rôle, contraste faible | constat à juger | porteur |
| 119 | alice | /mes-taches | Lire le titre de page | Constat 6b (10), à juger : titre seul, sans sous-titre ni compte de tâches | constat à juger | porteur |
| 120 | alice | /mes-taches | Observer les états chargement et erreur | « Impossible de charger vos tâches. » en cas d'échec (SPEC 6b). Constat 6b (11), à juger : aucune capture de ces états | constat à juger | porteur |
| 125 | alice | /imputations?semaine=2026-11-23, 1440 px | Lire l'écran | Titre « Feuille de temps » ; « Semaine du 23/11/2026 au 29/11/2026 » ; statut « Brouillon » ; lundi 23/11 : 0,5 sur Cadrage ; jours postérieurs au jour du navigateur : cases désactivées | valeurs de démonstration, plusieurs éléments | à automatiser (D-204) |
| 126 | alice | /imputations, 1440 px | Lire le tableau | Sans débordement ; Reste à faire et week-end visibles ; sept colonnes de jour de largeur égale | mise en page à vérifier | porteur |
| 127 | alice | /imputations, 1024 px | Lire le tableau | Sans débordement horizontal ; Reste à faire et week-end visibles ; colonnes de jour égales | 1024 px, mise en page | porteur |
| 128 | alice | /imputations, 1440 px | Lire la barre d'outils | Une seule ligne ; statut et actions groupés à droite | mise en page à vérifier | porteur |
| 129 | alice | /imputations, 1024 px | Lire la barre d'outils | Deux lignes (navigation, puis libellé de semaine à gauche et groupe statut + actions à droite), groupe lié ; jugé acceptable, non bloquant | 1024 px, jugé acceptable | porteur |
| 130 | alice | /imputations?semaine=2026-11-23, 1440 px | Lire le badge « Brouillon » | Badge `warning`, lisible face aux autres statuts | apparence du badge | porteur |
| 131 | alice | /imputations?semaine=2026-11-23, 1440 px | Lire les boutons « Enregistrer » et « Soumettre » sans modification | Désactivés, contraste faible : volontaire (D-134 (5)) ; à juger | constat à juger | porteur |
| 132 | alice | /imputations, 1024 px | Lire les en-têtes « Assigné » et « Réel cumulé » | Constat 4b-corr (4), à juger : en-têtes serrés, sans chevauchement | 1024 px, constat à juger | porteur |
| 133 | alice | /imputations, 1024 px | Lire la colonne Activité | Constat 5d (1) corrigé par D-186 (3) : « 1 Tâche A » entier, sans chevauchement avec « Assigné » ; contrôle : ligne 169 | 1024 px, constat à juger | porteur |
| 134 | alice | /imputations?semaine=2026-11-23, 1440 px | Saisir « abc » dans la case de lundi | Case `aria-invalid` ; message sur une seule ligne sous le tableau « <jour> · <activité> : <message> », sans décaler les colonnes ; « Enregistrer » désactivé | préparation — préparation de 135 (case invalide) | porteur |
| 135 | alice | /imputations, 1440 px | Garder le focus dans la case invalide | Constat 4b-corr (5), à juger : bordure rouge sous l'anneau de focus bleu, rouge peu visible | constat à juger | porteur |
| 139 | alice | /imputations?semaine=2026-11-23, 1440 px | Modifier une case (lundi : 0,5 → 1), cliquer l'entrée de menu « Mes tâches » | Une seule confirmation « Abandonner les modifications ? », texte « Les modifications non enregistrées seront perdues. », bouton « Abandonner » | texte de la confirmation non assertionné | à automatiser (D-204) |
| 142 | alice | /imputations, case modifiée | Cliquer le logo « PlanerSource » | Sans objet : le logo n'est pas un lien (Layout.tsx:69) ; D-172 (2) le cite à tort | ligne sans objet (logo non cliquable) | porteur |
| 145 | alice | /imputations?semaine=2026-11-23, case modifiée | Cliquer « Semaine précédente » | Une seule confirmation (pas de doublon) ; « Annuler » garde la semaine, l'adresse et la saisie | « Semaine précédente » sans e2e équivalent | à automatiser (D-204) |
| 146 | alice | /imputations, aucune modification | Cliquer « Semaine précédente » | Aucune confirmation | « Semaine précédente » sans e2e équivalent | à automatiser (D-204) |
| 147 | alice | /imputations?semaine=2026-11-23, case modifiée | « Enregistrer » (« Feuille enregistrée. »), puis « Semaine précédente » | Aucune confirmation après l'enregistrement | « Semaine précédente » sans e2e équivalent | à automatiser (D-204) |
| 149 | alice | /imputations, case modifiée | Fermer l'onglet | Message du navigateur | fermeture de l’onglet non testée | à automatiser (D-204) |
| 150 | alice | /imputations?semaine=2026-11-23, 1440 px | Lire la colonne Projet d'une ligne à code de 30 caractères | Colonne Projet `w-28` : code coupé par une ellipse sans débordement (relecture 5d). Constat 5d (4), à juger : le code complet n'est lisible nulle part sur capture ; vérifier l'infobulle `title` | constat à juger | porteur |

### bob — 1 lignes, 2 min

| N° | Compte | Écran | Action | Attendu | Raison | Statut |
|---|---|---|---|---|---|---|
| 153 | bob | /mes-taches, 1440 px | Lire la ligne « Accueil des clients » (DEMO-Q) | Début et Fin « — » (projet non calculé). Constat 6b (2), à juger : « — » sans indication que la tâche n'est pas planifiée ; ligne placée en dernier (début null) | constat à juger | porteur |

### chefa (retour) — 5 lignes, 8 min

| N° | Compte | Écran | Action | Attendu | Raison | Statut |
|---|---|---|---|---|---|---|
| 156 | chefa | /validation?semaine=2026-11-09, 1440 px | Lire la ligne de Bob | Statut « Validée » ; badge « DEMO-R · Validé » ; boutons « Voir la feuille de Bob » et « Dévalider la feuille de Bob » ; ni « Valider » ni « Rejeter » | boutons du chef non assertionnés | à automatiser (D-204) |
| 157 | chefa | /validation?semaine=2026-11-09 | Cliquer « Dévalider la feuille de Bob » | Dialogue « Dévalider la feuille de Bob pour DEMO-R ? », texte « La feuille repassera au statut Soumise. », boutons « Annuler » et « Dévalider » | e2e sous le rôle administrateur | à automatiser (D-204) |
| 158 | chefa | Confirmation ouverte | Cliquer « Annuler » | Dialogue fermé ; statut de Bob toujours « Validée » | e2e sous le rôle administrateur | à automatiser (D-204) |
| 159 | chefa | /validation?semaine=2026-11-09 | « Dévalider la feuille de Bob », puis « Dévalider » | `role="status"` « Feuille dévalidée. » ; statut « Soumise » ; badge « DEMO-R · À valider » ; focus sur « Voir la feuille de Bob » | préparation — préparation de 160 (Bob dévalidé, à revalider) | à automatiser (D-204) |
| 160 | chefa | /validation?semaine=2026-11-09 | Revalider : « Valider la feuille de Bob », puis « Valider » (rétablit l'état des lignes suivantes) | « Feuille validée. » ; statut « Validée » ; badge « DEMO-R · Validé » | statut affiché après revalidation | à automatiser (D-204) |

### admin (retour) — 10 lignes, 18 min

| N° | Compte | Écran | Action | Attendu | Raison | Statut |
|---|---|---|---|---|---|---|
| 165 | admin | /validation?semaine=2026-11-23, 1440 px | Lire le badge Projets de la feuille d'Alice portant le projet à code de 30 caractères | Constat 5d (5), à juger : le badge de 30 caractères reste long, près d'un tiers de la colonne Projets | constat à juger | porteur |
| 166 | admin | /validation?semaine=2026-11-23 | « Voir la feuille de Alice » : lire le pied de tableau | Ligne « Total » ; total > capacité du jour : icône et texte « Dépassement ». Constat 4c (2), à juger : « Dépassement » sans lien visible avec une ligne | constat à juger | porteur |
| 167 | admin | /validation?semaine=2026-11-16 | Deux onglets du navigateur sur cette page. Onglet 1 : valider Bob. Onglet 2 (page non rechargée) : « Valider la feuille de Bob », confirmer | Notification d'erreur `role="alert"` « La feuille a changé de statut. » au-dessus du tableau, dialogue fermé, liste relue. Constat 5d (6) : alerte pleine largeur, rouge sur rose, icône. Constat 5d (3), à juger : pas de bouton de fermeture | constat à juger | porteur |
| 168 | admin | /validation?semaine=2026-11-16, 1024 px | Même manœuvre, alerte affichée | L'alerte reste lisible, sans chevauchement entre la navigation et le tableau | 1024 px, constat à juger | porteur |
| 169 | admin | /imputations?semaine=2026-11-23&ressource=<id d'Alice>, 1024 px | Lire le tableau | Colonne Activité lisible (« Cadrage » entier, sans « … »), en-têtes en petits caractères sans débordement ni chevauchement, Assigné et Réel cumulé distincts ; aucun défilement horizontal ; mêmes constats à 1280 px | 1024 px, mise en page | porteur |
| 170 | admin | /imputations, rechargée (F5), 1440 px | Observer la liste « Ressource » pendant le chargement, puis ouvrir la liste | Liste présente dès l'affichage (désactivée, « Chargement… »), l'en-tête ne bouge pas quand elle se remplit ; « Choisir… » grisée, non sélectionnable, en tête de liste | libellé « Chargement… » non assertionné | à automatiser (D-204) |
| 172 | admin | /utilisateurs, 1440 px | « Nouvel utilisateur », saisir un nom, appuyer sur Échap | Confirmation « Abandonner les modifications ? » (texte « Les modifications non enregistrées seront perdues. », boutons « Annuler » et « Abandonner » en rouge) au-dessus du dialogue ; « Annuler » : dialogue conservé, saisie et focus gardés ; second Échap puis « Abandonner » : fermeture, aucun utilisateur créé | bouton Abandonner en rouge | porteur |
| 173 | admin | /utilisateurs | Même dialogue : le fermer sans saisie (Échap, croix, clic hors du dialogue, « Annuler »), puis saisir un nom et l'effacer avant de fermer | Aucune confirmation dans tous les cas | dialogue Nouvel utilisateur sans e2e | à automatiser (D-204) |
| 174 | admin | /utilisateurs | « Nouvel utilisateur » : identifiant déjà utilisé (« bob »), « Créer » (refus), puis « Annuler » | Confirmation (la saisie existe encore) ; « Abandonner » ferme sans création | bouton Annuler après refus, sans e2e | à automatiser (D-204) |
| 176 | admin | /projets/1, onglet Gantt ou Planning | « Modifier le projet », ouvrir puis fermer sans toucher ; puis changer le nom et fermer | Sans toucher : aucune confirmation ; nom changé : confirmation | modification du nom non assertionnée | à automatiser (D-204) |

## Recette du porteur (D-204)

Non jouée ligne à ligne : remplacée par un usage libre, retours REX-6 (docs/ux-session.md, D-211) ; verdicts laissés vides.

Décision D-204 (2026-11-24) : la recette manuelle est limitée aux lignes de jugement. Les lignes « à automatiser (D-204) » de la section précédente reçoivent un e2e (docs/tests.md, rubrique « Recette automatisée (D-204) ») et ne se jouent plus ici. Numéros d’origine conservés ; les verdicts se reportent dans la colonne Verdict du tableau « Parcours ». La ligne 181 est sans objet (D-203) et n’est pas jouée. La ligne 142 est « sans objet » (le logo n’est pas un lien) : à noter « Sans objet » sans manipulation.

Total : 70 lignes (dont 5 de préparation : 40, 52, 54, 79, 134), environ 124 min (1,5 min par ligne, plus les manipulations).

| Compte | Lignes | Durée estimée |
|---|---|---|
| admin | 24 | 36 min |
| chefa | 15 | 29 min |
| chefb | 1 | 2 min |
| alice | 22 | 36 min |
| bob | 1 | 2 min |
| admin (retour) | 6 | 12 min |
| admin (fin de recette, ligne 22) | 1 | 7 min |
| Total | 70 | 124 min |

Les comptes se jouent dans l’ordre ci-dessus. Manipulations préalables restantes :

- Ligne 22 : détruit le jeu de démonstration (vide : « Modifier » chefa, chefb, alice et bob avec Équipe « Aucune », puis supprimer les deux équipes ; détail à la ligne 22 de la section « Non vérifiables… »). À faire en toute fin de recette, puis relancer `npm run demo`.
- Lignes 150 et 165 : avec chefa, avant les lignes d’Alice, créer le seul projet de code `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123` (30 caractères), affecter Alice, créer une activité et l’assigner à Alice ; Alice saisit 0,5 le lundi 23/11 sur cette ligne et enregistre.
- Ligne 166 : Alice, Imputations, semaine 2026-11-23 : Cadrage lundi = 1,5, « Enregistrer », à faire en fin des lignes d’Alice.
- Ligne 169 : l’identifiant d’Alice se relève dans la liste « Ressource » de l’administrateur (valeur de l’option).
- Ligne 168 : reprend l’alerte affichée à la ligne 167, à 1024 px.
- Lignes 105 et 120 : aucune manipulation.

### admin — 24 lignes, 36 min

| N° | Compte | Écran | Action | Attendu | Raison |
|---|---|---|---|---|---|
| 5 | admin | /utilisateurs, 1024 px | Parcourir les trois onglets | Constat à juger (aucun critère propre à 1024 px dans la source) | 1024 px, constat à juger |
| 7 | admin | /utilisateurs, onglet Utilisateurs, 1440 px | Lire le tableau | Colonnes Identifiant, Initiales, Ressource, Calendrier, Équipe ; Alice : équipe « Développement ». Constat 6a (2), à juger : Nom, Identifiant et Email passent sur deux lignes, lignes plus hautes | constat à juger |
| 8 | admin | /utilisateurs, onglet Utilisateurs, 1024 px | Lire le tableau ; chercher le bouton « Modifier Alice » | Constat 6a (1), à juger : Capacité (coupée), Calendrier, Équipe, Statut et Actions hors écran, aucun indice de défilement, bouton de modification inaccessible sans défiler | 1024 px, constat à juger |
| 9 | admin | /utilisateurs, onglet Utilisateurs | Lire la ligne « Admin » : colonnes Équipe et Initiales | Équipe : « — » ; Initiales : « — » (SPEC). Constat 6a (5), à juger : « sans équipe » et « non renseigné » se confondent | constat à juger |
| 10 | admin | /utilisateurs, onglet Utilisateurs, 1440 px | Ouvrir « Nouvel utilisateur » ; atteindre le champ « Équipe » et les boutons Annuler / Créer | Liste « Équipe » : premier choix « Aucune », équipes triées par nom. Constat 6a (3), à juger : la boîte touche le haut et le bas de la fenêtre, défilement interne non signalé | constat à juger |
| 11 | admin | /utilisateurs, onglet Utilisateurs, 1024 px | Ouvrir « Nouvel utilisateur » ; atteindre le champ « Équipe » et les boutons Annuler / Créer | Même attendu qu'à 1440 px ; constat 6a (3), à juger | 1024 px, constat à juger |
| 12 | admin | /utilisateurs?onglet=equipes, 1440 px | Lire le tableau « Liste des équipes » | Colonnes Nom, Membres, Actions ; Développement : 2 membres, Pilotage : 2 membres. Constat 6a (4), à juger : Membres et Actions très à droite, sans lien visuel avec Nom | constat à juger |
| 13 | admin | /utilisateurs?onglet=equipes, 1024 px | Lire le tableau « Liste des équipes » | Même contenu qu'à 1440 px, sans débordement | 1024 px, mise en page |
| 14 | admin | /utilisateurs?onglet=equipes | « Nouvelle équipe » : saisir « Pilotage », Créer | « Cette équipe existe déjà. » ; rien de modifié (toujours 2 équipes). Constat 6a (7), à juger : message en haut, éloigné du champ Nom, champ sans état invalide visible | constat à juger |
| 15 | admin | /utilisateurs?onglet=equipes | « Supprimer Développement », confirmer | « Cette équipe a des membres : retirez-les d'abord. » ; dialogue ouvert, rien de modifié. Constat 6a (6), à juger : le bouton Supprimer est actif alors que l'équipe a des membres ; message sur deux lignes | constat à juger |
| 36 | admin | /plan-de-charge, 1440 px | Lire le champ « Mois de départ » (type month, Chromium) | Constat de la recette différée du lot 6, à juger : le champ Mois s'affiche en anglais dans Chromium | constat à juger |
| 38 | admin | /plan-de-charge, 1024 px | Lire l'écran, défiler le tableau | La page ne défile pas en horizontal ; zone « Plan de charge » focalisable, défilement horizontal interne | 1024 px, mise en page |
| 39 | admin | /plan-de-charge, 1024 px | Lire le lien « Plan de charge » du menu | Constat de la recette différée du lot 6, à juger : le lien passe sur deux lignes à 1024 px | 1024 px, constat à juger |
| 40 | admin | /plan-de-charge, 1440 px | Cliquer « Exporter CSV » | Téléchargement de `plan-de-charge-2026-11.csv` ; aucun état modifié | préparation — préparation de 41 (fichier à ouvrir) |
| 41 | admin | Fichier `plan-de-charge-2026-11.csv`, tableur français | Ouvrir le fichier | UTF-8 avec BOM, séparateur « ; », virgule décimale : colonnes Ressource, Équipe, Projet, Mois, Disponible, Réel, Planifié, Charge, Écart, accents corrects | ouverture dans un tableur français |
| 46 | admin | /validation?semaine=2026-11-16, 1440 px | « Voir la feuille de Alice » : lire Assigné et Réel cumulé | Constat 4c (1), à juger : « Assigné » presque contre « Réel cumulé » | constat à juger |
| 47 | admin | /validation?semaine=2026-11-16 | « Voir la feuille de Alice » : repérer la lecture seule | Tableau de 4b en lecture seule. Constat 4c (4), à juger : rien n'indique la lecture seule hors fond gris des cases | constat à juger |
| 48 | admin | /validation?semaine=2026-11-16 | « Voir la feuille de Alice » : lire le badge de statut | Badge de statut non étiré sur toute la largeur (correction de la relecture 4c) | apparence du badge |
| 49 | admin | /validation?semaine=2026-11-16, 1024 px | Lire l'en-tête | Constat 4c (3), à juger : le libellé de semaine passe sous les boutons de navigation | 1024 px, constat à juger |
| 50 | admin | /validation?semaine=2026-11-16, 1024 px | Lire la colonne Projets d'Alice | Constat 5d (2), à juger : badges sur plusieurs lignes, ligne plus haute | 1024 px, constat à juger |
| 51 | admin | /validation?semaine=2026-11-16, 1440 px | « Valider la feuille de Bob » ; lire la confirmation puis Annuler | Confirmation « Valider la feuille de Bob pour DEMO-R ? ». Constat 4c (5), à juger : titre long, 2 lignes. Annuler : rien modifié | constat à juger |
| 52 | admin | /validation?semaine=2026-11-16, 1440 px | Cliquer « Exporter CSV » | Dialogue « Exporter les imputations » : Du 16/11/2026 et Au 22/11/2026 préremplis, liste « Équipe », bouton « Exporter » | préparation — préparation de 55 (ouvre le dialogue d’export) |
| 54 | admin | Dialogue « Exporter les imputations » | Période valide, « Exporter » | Téléchargement de `imputations-2026-11-16-2026-11-22.csv` ; dialogue fermé ; focus au bouton d'ouverture | préparation — préparation de 55 (fichier à ouvrir) |
| 55 | admin | Fichier `imputations-2026-11-16-2026-11-22.csv`, tableur français | Ouvrir le fichier | UTF-8 avec BOM, « ; », virgule décimale : colonnes Ressource, Équipe, Semaine, Statut, Projet, Activité, Jour, Charge | ouverture dans un tableur français |

### chefa — 15 lignes, 29 min

| N° | Compte | Écran | Action | Attendu | Raison |
|---|---|---|---|---|---|
| 65 | chefa | /, 1024 px | Lire le tableau et les en-têtes | Tableau entier visible à 1024 px sur l'Accueil, sans ombre (relecture REX-3b-r4) | 1024 px, mise en page |
| 66 | chefa | /, 1440 px | Tab jusqu'à un bouton-nom d'activité, puis jusqu'au crayon voisin | Anneau de focus visible, 2 px, accent (D-132 (c) : clos). Réserve, à juger : le contour du bouton-nom touche presque le crayon voisin | réserve à juger |
| 67 | chefa | /projets/1?onglet=gantt, 1440 px | Lire les en-têtes du tableau | En-têtes entiers de WBS à Drapeaux, « Charge » et « Avancement » complets | mise en page des en-têtes |
| 68 | chefa | /projets/1?onglet=gantt, 1440 px | Lire le diagramme à droite du tableau | Constat à juger : diagramme plus étroit, 387 px visibles | constat à juger |
| 69 | chefa | /projets/1?onglet=gantt, 1024 px | Lire le diagramme à droite du tableau | Constat à juger : diagramme plus étroit, 150 px visibles | 1024 px, constat à juger |
| 70 | chefa | /projets/1?onglet=gantt, 1024 px | Lire l'en-tête « Charge » et le bord gauche de la colonne Drapeaux | Constat à juger : « Charge » tronqué en « Cl » sous la colonne Drapeaux collante ; filet d'ombre discret à gauche de Drapeaux | 1024 px, constat à juger |
| 71 | chefa | /projets/1?onglet=gantt, 1024 px | Tab sur la zone « Tableau du Gantt », puis flèche droite | La zone défile ; Début, Fin et Charge deviennent atteignables (SPEC 6 Affichage 12) | 1024 px, zone défilante |
| 72 | chefa | /projets/1?onglet=gantt, 1440 px | Lire le badge « Retard » de Livraison | Badge lisible, rouge sur fond rose, contraste correct | apparence du badge |
| 75 | chefa | /projets/1?onglet=gantt, 1440 px | Lire la colonne Nom d'« Étude préalable (close) » et de « Planning manuel bis » | Troncature par ellipsis avec `title` si besoin. Constat à juger : noms tronqués à 144 px à 1440 px | constat à juger |
| 76 | chefa | /projets/1?onglet=gantt, 1440 px | Lire le jalon « Fin de phase 1 » dans le SVG | Losange en contour à la date client (23/11/2026) ; texte d'écart « +14 j » à droite du losange le plus à droite ; couleur flag (engagement dépassé) | position du texte d’écart |
| 78 | chefa | /projets/1?onglet=gantt, zoom jour | Lire la case « Recalcul automatique », puis glisser la barre « Maquette » d'un jour | Case décochée par défaut ; après le geste, contour pointillé à la position relâchée et bandeau « Planning à recalculer » | geste glisser, contour pointillé |
| 79 | chefa | /projets/1?onglet=gantt | Cocher « Recalcul automatique » alors que le bandeau est affiché | Calcul lancé tout de suite : « Recalcul en cours… » puis bandeau et contour effacés | préparation — préparation : rétablit l’état après 78 |
| 84 | chefa | /projets/1 (onglet Planning), 1024 px | Lire la colonne Nom | Constat à juger : nom sur deux lignes, lignes plus hautes | 1024 px, constat à juger |
| 85 | chefa | /projets/1 (onglet Planning), 1024 px | Lire les boutons d'action d'une ligne, dont « Assigner » | Constat à juger : bouton d'affectation renvoyé à la ligne | 1024 px, constat à juger |
| 86 | chefa | Planning manuel de « Planning manuel », mois courant, 1024 px | Lire la grille | Constat à juger : jours 17 à 31 hors vue sans défilement | 1024 px, constat à juger |

### chefb — 1 lignes, 2 min

| N° | Compte | Écran | Action | Attendu | Raison |
|---|---|---|---|---|---|
| 105 | chefb | /mes-taches, 1440 px | Lire l'écran | « Aucune tâche en cours. ». Constat 6b (8), à juger : message centré sans icône ni indication de la suite à donner | constat à juger |

### alice — 22 lignes, 36 min

| N° | Compte | Écran | Action | Attendu | Raison |
|---|---|---|---|---|---|
| 111 | alice | /mes-taches, 1440 px | Lire les colonnes Assigné, Réel, Reste | Constat 6b (1), à juger : colonnes numériques alignées à gauche, comparaison verticale peu aisée | constat à juger |
| 112 | alice | /mes-taches, 1440 px | Lire les en-têtes Assigné, Réel, Reste | Constat 6b (3), à juger : aucune unité (jours ou heures) | constat à juger |
| 113 | alice | /mes-taches, 1440 px | Chercher un repère pour les tâches à traiter en premier | Constat 6b (4), à juger : aucune mise en évidence du reste, aucun tri | constat à juger |
| 114 | alice | /mes-taches, 1440 px | Cliquer une ligne | Constat 6b (5), à juger : lignes non cliquables, aucun lien vers la Feuille de temps ou les Imputations | constat à juger |
| 115 | alice | /mes-taches, 1440 px | Survoler le code « DEMO-R » | `title` = nom du projet. Constat 6b (6), à juger : seul le code est affiché | constat à juger |
| 116 | alice | /mes-taches, 1440 px | Lire la répartition des colonnes | Constat 6b (7), à juger : colonne Activité très large, colonnes Début à Reste très espacées | constat à juger |
| 117 | alice | /mes-taches, 1024 px | Lire la répartition des colonnes | Constat 6b (7) : meilleure répartition qu'à 1440 px ; pas de débordement | 1024 px, constat à juger |
| 118 | alice | /mes-taches | Lire le pied du menu | Nom de la ressource en petit texte gris. Constat 6b (9), à juger : pas de libellé de rôle, contraste faible | constat à juger |
| 119 | alice | /mes-taches | Lire le titre de page | Constat 6b (10), à juger : titre seul, sans sous-titre ni compte de tâches | constat à juger |
| 120 | alice | /mes-taches | Observer les états chargement et erreur | « Impossible de charger vos tâches. » en cas d'échec (SPEC 6b). Constat 6b (11), à juger : aucune capture de ces états | constat à juger |
| 126 | alice | /imputations, 1440 px | Lire le tableau | Sans débordement ; Reste à faire et week-end visibles ; sept colonnes de jour de largeur égale | mise en page à vérifier |
| 127 | alice | /imputations, 1024 px | Lire le tableau | Sans débordement horizontal ; Reste à faire et week-end visibles ; colonnes de jour égales | 1024 px, mise en page |
| 128 | alice | /imputations, 1440 px | Lire la barre d'outils | Une seule ligne ; statut et actions groupés à droite | mise en page à vérifier |
| 129 | alice | /imputations, 1024 px | Lire la barre d'outils | Deux lignes (navigation, puis libellé de semaine à gauche et groupe statut + actions à droite), groupe lié ; jugé acceptable, non bloquant | 1024 px, jugé acceptable |
| 130 | alice | /imputations?semaine=2026-11-23, 1440 px | Lire le badge « Brouillon » | Badge `warning`, lisible face aux autres statuts | apparence du badge |
| 131 | alice | /imputations?semaine=2026-11-23, 1440 px | Lire les boutons « Enregistrer » et « Soumettre » sans modification | Désactivés, contraste faible : volontaire (D-134 (5)) ; à juger | constat à juger |
| 132 | alice | /imputations, 1024 px | Lire les en-têtes « Assigné » et « Réel cumulé » | Constat 4b-corr (4), à juger : en-têtes serrés, sans chevauchement | 1024 px, constat à juger |
| 133 | alice | /imputations, 1024 px | Lire la colonne Activité | Constat 5d (1) corrigé par D-186 (3) : « 1 Tâche A » entier, sans chevauchement avec « Assigné » ; contrôle : ligne 169 | 1024 px, constat à juger |
| 134 | alice | /imputations?semaine=2026-11-23, 1440 px | Saisir « abc » dans la case de lundi | Case `aria-invalid` ; message sur une seule ligne sous le tableau « <jour> · <activité> : <message> », sans décaler les colonnes ; « Enregistrer » désactivé | préparation — préparation de 135 (case invalide) |
| 135 | alice | /imputations, 1440 px | Garder le focus dans la case invalide | Constat 4b-corr (5), à juger : bordure rouge sous l'anneau de focus bleu, rouge peu visible | constat à juger |
| 142 | alice | /imputations, case modifiée | Cliquer le logo « PlanerSource » | Sans objet : le logo n'est pas un lien (Layout.tsx:69) ; D-172 (2) le cite à tort | ligne sans objet (logo non cliquable) |
| 150 | alice | /imputations?semaine=2026-11-23, 1440 px | Lire la colonne Projet d'une ligne à code de 30 caractères | Colonne Projet `w-28` : code coupé par une ellipse sans débordement (relecture 5d). Constat 5d (4), à juger : le code complet n'est lisible nulle part sur capture ; vérifier l'infobulle `title` | constat à juger |

### bob — 1 lignes, 2 min

| N° | Compte | Écran | Action | Attendu | Raison |
|---|---|---|---|---|---|
| 153 | bob | /mes-taches, 1440 px | Lire la ligne « Accueil des clients » (DEMO-Q) | Début et Fin « — » (projet non calculé). Constat 6b (2), à juger : « — » sans indication que la tâche n'est pas planifiée ; ligne placée en dernier (début null) | constat à juger |

### admin (retour) — 6 lignes, 12 min

| N° | Compte | Écran | Action | Attendu | Raison |
|---|---|---|---|---|---|
| 165 | admin | /validation?semaine=2026-11-23, 1440 px | Lire le badge Projets de la feuille d'Alice portant le projet à code de 30 caractères | Constat 5d (5), à juger : le badge de 30 caractères reste long, près d'un tiers de la colonne Projets | constat à juger |
| 166 | admin | /validation?semaine=2026-11-23 | « Voir la feuille de Alice » : lire le pied de tableau | Ligne « Total » ; total > capacité du jour : icône et texte « Dépassement ». Constat 4c (2), à juger : « Dépassement » sans lien visible avec une ligne | constat à juger |
| 167 | admin | /validation?semaine=2026-11-16 | Deux onglets du navigateur sur cette page. Onglet 1 : valider Bob. Onglet 2 (page non rechargée) : « Valider la feuille de Bob », confirmer | Notification d'erreur `role="alert"` « La feuille a changé de statut. » au-dessus du tableau, dialogue fermé, liste relue. Constat 5d (6) : alerte pleine largeur, rouge sur rose, icône. Constat 5d (3), à juger : pas de bouton de fermeture | constat à juger |
| 168 | admin | /validation?semaine=2026-11-16, 1024 px | Même manœuvre, alerte affichée | L'alerte reste lisible, sans chevauchement entre la navigation et le tableau | 1024 px, constat à juger |
| 169 | admin | /imputations?semaine=2026-11-23&ressource=<id d'Alice>, 1024 px | Lire le tableau | Colonne Activité lisible (« Cadrage » entier, sans « … »), en-têtes en petits caractères sans débordement ni chevauchement, Assigné et Réel cumulé distincts ; aucun défilement horizontal ; mêmes constats à 1280 px | 1024 px, mise en page |
| 172 | admin | /utilisateurs, 1440 px | « Nouvel utilisateur », saisir un nom, appuyer sur Échap | Confirmation « Abandonner les modifications ? » (texte « Les modifications non enregistrées seront perdues. », boutons « Annuler » et « Abandonner » en rouge) au-dessus du dialogue ; « Annuler » : dialogue conservé, saisie et focus gardés ; second Échap puis « Abandonner » : fermeture, aucun utilisateur créé | bouton Abandonner en rouge |

### Fin de recette — admin, ligne 22 — 1 ligne, 7 min

| N° | Compte | Écran | Action | Attendu | Raison |
|---|---|---|---|---|---|
| 22 | admin | /utilisateurs?onglet=equipes | Observer les états chargement, vide et erreur de l'écran Équipes | Constat 6a (8) : aucune capture de ces états ; à juger (états « Aucune équipe pour le moment. » pour le vide) | constat à juger |

Après la ligne 22 : relancer `npm run demo` (recrée la base de démonstration).

## Lignes couvertes par les e2e (D-202)

Lot recette-auto (D-204) : les 44 dernières lignes du tableau (note « automatisée (D-204) », E2E-468 à E2E-511) sortent de la recette manuelle.

Lignes sorties de la recette manuelle (73). Critère : l’Attendu est vérifié par une assertion d’un e2e existant, même écran, même compte ou même rôle, même donnée ou même cas, même attendu. Les verdicts ne sont pas remplis. Les lignes marquées « reprise » sont rejouées en préparation (section « Recette réduite »).

| N° | ID de l’e2e | Fichier:ligne | Note |
|---|---|---|---|
| 2 | E2E-388 | e2e/tests/rex5.spec.ts:56 |  |
| 3 | E2E-388 | e2e/tests/rex5.spec.ts:61 ; e2e/tests/rex5.spec.ts:64 |  |
| 4 | E2E-389 | e2e/tests/rex5.spec.ts:80 |  |
| 6 | E2E-392 | e2e/tests/rex5.spec.ts:137 ; e2e/tests/rex5.spec.ts:142 |  |
| 16 | E2E-337-r1 | e2e/tests/lot6a.spec.ts:82 |  |
| 17 | E2E-390 | e2e/tests/rex5.spec.ts:98 |  |
| 18 | E2E-343-r2 | e2e/tests/lot6a.spec.ts:240 |  |
| 19 | E2E-343-r2 | e2e/tests/lot6a.spec.ts:244 |  |
| 20 | E2E-343-r2 | e2e/tests/lot6a.spec.ts:240 |  |
| 21 | E2E-339-r1 | e2e/tests/lot6a.spec.ts:116 |  |
| 24 | E2E-391 | e2e/tests/rex5.spec.ts:124 |  |
| 25 | E2E-391 | e2e/tests/rex5.spec.ts:127 |  |
| 26 | E2E-395-r1 | e2e/tests/rex5.spec.ts:222 |  |
| 27 | E2E-395-r1 | e2e/tests/rex5.spec.ts:225 |  |
| 28 | E2E-5-r1 | e2e/tests/lot1.spec.ts:75 |  |
| 29 | E2E-395-r1 | e2e/tests/rex5.spec.ts:229 |  |
| 32 | E2E-370 | e2e/tests/lot6d.spec.ts:160 ; e2e/tests/lot6d.spec.ts:163 |  |
| 33 | E2E-372 | e2e/tests/lot6d.spec.ts:244 |  |
| 35 | E2E-372 | e2e/tests/lot6d.spec.ts:265 ; e2e/tests/lot6d.spec.ts:269 |  |
| 37 | E2E-371 | e2e/tests/lot6d.spec.ts:204 ; e2e/tests/lot6d.spec.ts:206 |  |
| 40 | E2E-383 | e2e/tests/lot6f.spec.ts:93 ; e2e/tests/lot6f.spec.ts:110 | reprise (préparation) |
| 44 | E2E-304 | e2e/tests/lot4c.spec.ts:230 |  |
| 52 | E2E-384 | e2e/tests/lot6f.spec.ts:129 ; e2e/tests/lot6f.spec.ts:130 | reprise (préparation) |
| 53 | E2E-385 | e2e/tests/lot6f.spec.ts:170 ; e2e/tests/lot6f.spec.ts:173 |  |
| 54 | E2E-384 | e2e/tests/lot6f.spec.ts:139 ; e2e/tests/lot6f.spec.ts:148 | reprise (préparation) |
| 58 | E2E-393-r1 | e2e/tests/rex5.spec.ts:165 |  |
| 61 | E2E-377-r1 | e2e/tests/lot6e.spec.ts:96 |  |
| 79 | E2E-163 | e2e/tests/lot3d4.spec.ts:321 ; e2e/tests/lot3d4.spec.ts:324 | reprise (préparation) |
| 80 | E2E-143 | e2e/tests/lot3d3b.spec.ts:165 |  |
| 81 | E2E-148 ; E2E-143 | e2e/tests/lot3d3b.spec.ts:309 ; e2e/tests/lot3d3b.spec.ts:180 |  |
| 82 | E2E-196 ; E2E-198-r1 | e2e/tests/lot3f2.spec.ts:360 ; e2e/tests/lot3f2.spec.ts:426 |  |
| 83 | E2E-205 | e2e/tests/lot3f2.spec.ts:766 |  |
| 88 | E2E-406-r1 | e2e/tests/sortie.spec.ts:207 | reprise (préparation) |
| 91 | E2E-405-r1 | e2e/tests/sortie.spec.ts:184 |  |
| 93 | E2E-407 | e2e/tests/sortie.spec.ts:231 |  |
| 95 | E2E-408 | e2e/tests/sortie.spec.ts:275 |  |
| 98 | E2E-219 | e2e/tests/lot3g.spec.ts:512 |  |
| 99 | E2E-219 | e2e/tests/lot3g.spec.ts:521 |  |
| 100 | E2E-220 | e2e/tests/lot3g.spec.ts:553 |  |
| 101 | E2E-365 | e2e/tests/lot6c.spec.ts:457 ; e2e/tests/lot6c.spec.ts:459 |  |
| 102 | E2E-379 | e2e/tests/lot6e.spec.ts:195 |  |
| 106 | E2E-399 ; E2E-397 | e2e/tests/rex5.spec.ts:341 ; e2e/tests/rex5.spec.ts:281 |  |
| 108 | E2E-394 ; E2E-357 | e2e/tests/rex5.spec.ts:210 ; e2e/tests/lot6b.spec.ts:320 |  |
| 109 | E2E-348 | e2e/tests/lot6b.spec.ts:85 |  |
| 110 | E2E-349 | e2e/tests/lot6b.spec.ts:114 ; e2e/tests/lot6b.spec.ts:117 |  |
| 121 | E2E-396 | e2e/tests/rex5.spec.ts:258 ; e2e/tests/rex5.spec.ts:260 |  |
| 122 | E2E-396 | e2e/tests/rex5.spec.ts:267 |  |
| 123 | E2E-396 | e2e/tests/rex5.spec.ts:267 |  |
| 124 | E2E-398 | e2e/tests/rex5.spec.ts:300 |  |
| 134 | E2E-295 ; E2E-226-r1 | e2e/tests/lot4b-corr.spec.ts:148 ; e2e/tests/lot4b.spec.ts:271 | reprise (préparation) |
| 136 | E2E-234 | e2e/tests/lot4b.spec.ts:457 |  |
| 137 | E2E-237 | e2e/tests/lot4b.spec.ts:526 |  |
| 138 | E2E-233 | e2e/tests/lot4b.spec.ts:437 |  |
| 140 | E2E-400-r1 | e2e/tests/sortie.spec.ts:71 |  |
| 141 | E2E-400-r1 | e2e/tests/sortie.spec.ts:75 |  |
| 143 | E2E-401 | e2e/tests/sortie.spec.ts:89 |  |
| 144 | E2E-402-r1 | e2e/tests/sortie.spec.ts:112 |  |
| 148 | E2E-408 | e2e/tests/sortie.spec.ts:263 |  |
| 151 | E2E-323 (a) | e2e/tests/lot5d.spec.ts:106 |  |
| 152 | E2E-394 | e2e/tests/rex5.spec.ts:210 |  |
| 154 | E2E-231 | e2e/tests/lot4b.spec.ts:401 |  |
| 155 | E2E-231 | e2e/tests/lot4b.spec.ts:390 |  |
| 159 | E2E-412 | e2e/tests/devalidation-e.spec.ts:184 | reprise (préparation) |
| 161 | E2E-419 ; E2E-421 ; E2E-417 | e2e/tests/autrui-e.spec.ts:108 ; e2e/tests/autrui-e.spec.ts:139 ; e2e/tests/autrui-e.spec.ts:80 |  |
| 162 | E2E-424 | e2e/tests/autrui-e.spec.ts:190 |  |
| 163 | E2E-427 ; E2E-428 | e2e/tests/autrui-e.spec.ts:249 ; e2e/tests/autrui-e.spec.ts:283 |  |
| 164 | E2E-430 ; E2E-418 | e2e/tests/autrui-e.spec.ts:330 ; e2e/tests/autrui-e.spec.ts:97 |  |
| 171 | E2E-435 | e2e/tests/retouche-feuille.spec.ts:137 |  |
| 175 | E2E-452 | e2e/tests/garde-dialogue.spec.ts:304 |  |
| 177 | E2E-448-r2 ; E2E-451 | e2e/tests/garde-dialogue.spec.ts:210 ; e2e/tests/garde-dialogue.spec.ts:293 |  |
| 178 | E2E-459-r1 | e2e/tests/garde-dialogue-focus.spec.ts:158 ; e2e/tests/garde-dialogue-focus.spec.ts:169 |  |
| 179 | E2E-459-r1 | e2e/tests/garde-dialogue-focus.spec.ts:185 ; e2e/tests/garde-dialogue-focus.spec.ts:195 |  |
| 180 | E2E-458 ; E2E-457-r2 | e2e/tests/garde-dialogue-focus.spec.ts:126 ; e2e/tests/garde-dialogue-focus.spec.ts:42 |  |
| 1 | E2E-468 | e2e/tests/recette-auto-admin.spec.ts | automatisée (D-204) |
| 23 | E2E-469 | e2e/tests/recette-auto-admin.spec.ts | automatisée (D-204) |
| 30 | E2E-470 | e2e/tests/recette-auto-admin.spec.ts | automatisée (D-204) |
| 31 | E2E-471 | e2e/tests/recette-auto-admin.spec.ts | automatisée (D-204) |
| 34 | E2E-472 | e2e/tests/recette-auto-admin.spec.ts | automatisée (D-204) |
| 42 | E2E-473 | e2e/tests/recette-auto-admin.spec.ts | automatisée (D-204) |
| 43 | E2E-474 | e2e/tests/recette-auto-admin.spec.ts | automatisée (D-204) |
| 45 | E2E-475 | e2e/tests/recette-auto-admin.spec.ts | automatisée (D-204) |
| 56 | E2E-476 | e2e/tests/recette-auto-admin.spec.ts | automatisée (D-204) |
| 57 | E2E-477 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 59 | E2E-478 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 60 | E2E-479 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 62 | E2E-480 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 63 | E2E-481 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 64 | E2E-482 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 73 | E2E-483 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 74 | E2E-484 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 77 | E2E-485 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 87 | E2E-486 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 88 | E2E-487 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 89 | E2E-488 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 90 | E2E-489 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 92 | E2E-490 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 94 | E2E-491 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 96 | E2E-492 | e2e/tests/recette-auto-chefa.spec.ts | automatisée (D-204) |
| 97 | E2E-493 | e2e/tests/recette-auto-chefb.spec.ts | automatisée (D-204) |
| 103 | E2E-494 | e2e/tests/recette-auto-chefb.spec.ts | automatisée (D-204) |
| 104 | E2E-495 | e2e/tests/recette-auto-chefb.spec.ts | automatisée (D-204) |
| 107 | E2E-496 | e2e/tests/recette-auto-chefb.spec.ts | automatisée (D-204) |
| 125 | E2E-497 | e2e/tests/recette-auto-alice.spec.ts | automatisée (D-204) |
| 139 | E2E-498 | e2e/tests/recette-auto-alice.spec.ts | automatisée (D-204) |
| 145 | E2E-499 | e2e/tests/recette-auto-alice.spec.ts | automatisée (D-204) |
| 146 | E2E-500 | e2e/tests/recette-auto-alice.spec.ts | automatisée (D-204) |
| 147 | E2E-501 | e2e/tests/recette-auto-alice.spec.ts | automatisée (D-204) |
| 149 | E2E-502 | e2e/tests/recette-auto-alice.spec.ts | automatisée (D-204) |
| 156 | E2E-503 | e2e/tests/recette-auto-chefa-retour.spec.ts | automatisée (D-204) |
| 157 | E2E-504 | e2e/tests/recette-auto-chefa-retour.spec.ts | automatisée (D-204) |
| 158 | E2E-505 | e2e/tests/recette-auto-chefa-retour.spec.ts | automatisée (D-204) |
| 159 | E2E-506 | e2e/tests/recette-auto-chefa-retour.spec.ts | automatisée (D-204) |
| 160 | E2E-507 | e2e/tests/recette-auto-chefa-retour.spec.ts | automatisée (D-204) |
| 170 | E2E-508 | e2e/tests/recette-auto-admin-retour.spec.ts | automatisée (D-204) |
| 173 | E2E-509 | e2e/tests/recette-auto-admin-retour.spec.ts | automatisée (D-204) |
| 174 | E2E-510 | e2e/tests/recette-auto-admin-retour.spec.ts | automatisée (D-204) |
| 176 | E2E-511 | e2e/tests/recette-auto-admin-retour.spec.ts | automatisée (D-204) |

## Sigles de la colonne Source

| Sigle | Sens |
|---|---|
| `L3-n` | Recette différée (lot 3), point n dans l'ordre de la section |
| `DO-x` | Défauts ouverts après REX-3b-r3 : (a) à (d) ; e à i pour la relecture REX-3b-r4 |
| `4b-RD` | Recette différée (4b) |
| `4b (n), 4b-corr (n), 4c (n), 5d (n), 6a (n), 6b (n)` | Défaut n des sections « Captures de … » correspondantes |
| `4c-RD-n` | Recette différée (4c), point n dans l'ordre de la section |
| `L6-6xn` | Recette différée du lot 6, sous-lot 6x, point n |
| `RX5-n` | Recette différée (REX-5), point n |
| `D172-n` | Recette différée (D-172), point n |
| `AUT-RD-n` | Recette différée (saisie pour autrui, D-184), point n |
| `RET-RD-n` | Recette différée (retouche de la Feuille de temps, D-186), point n |
| `GDL-RD-n` | Recette différée (garde des dialogues, D-188, D-190), point n |
| `D-xxx, SPEC …` | Décision ou section de SPEC.md d'où vient l'attendu |

## Non vérifiables avec le jeu de démonstration

Fichiers cités : `packages/api/src/demo/remplir.ts` (`remplir.ts`) et `packages/api/src/cli/demo.ts`. Les manipulations marquées sont à faire avant la ligne concernée ; elles modifient la base de démonstration.

| N° des lignes | Donnée manquante | Manipulation à l'écran |
|---|---|---|
| 22 | États vide, chargement et erreur de l'écran Équipes. Le vide demande zéro équipe : `remplir.ts:76-77` crée deux équipes et `:78-93` les affecte à quatre comptes. Chargement et erreur ne dépendent pas des données. | Vide : onglet Utilisateurs, « Modifier » chefa, chefb, alice et bob avec Équipe = « Aucune », puis supprimer les deux équipes (détruit le jeu : relancer `npm run demo` ensuite). Chargement et erreur : aucune. |
| 37 | Cellule du Plan de charge à écart négatif. `remplir.ts:84-93` ne donne aucune capacité (défaut 1 j/jour) ; `:144-147` et `:189-207` ne créent de surcharge qu'au niveau du jour. Lu en base : Alice, 11/2026, charge 10 j pour 21 j disponibles, écart +11 j ; aucun écart négatif. | Onglet Utilisateurs, « Modifier Alice », Capacité = 0,25 : disponible 5,25 j, écart négatif sur 11/2026. Si la valeur est refusée : à signaler (Non vérifiable). Remettre la capacité à 1 ensuite. |
| 120 | États chargement et erreur de Mes tâches : ne dépendent pas des données (l'état vide, lui, est vérifiable avec chefb, sans assignation : `remplir.ts:79-83`). | aucune |
| 122 | Jours fériés à venir. `remplir.ts` ne crée ni calendrier ni jour férié (aucun appel à `/api/calendriers`). Lu en base : « Calendrier par défaut » seul, 0 férié. | Admin, onglet Calendriers, détail « Calendrier par défaut », « Ajouter un jour férié » : 25/12/2026 « Noël » (ligne 28). |
| 123 | Même donnée absente (aucun férié). | Même écran : « Ajouter un jour férié », date 25/12/2026 ou postérieure, libellé laissé vide (le champ n'est pas `required`, `Calendriers.tsx` ; l'API met `libelle` à `''` par défaut, `calendriers.ts:27`). |
| 124 | Échec du chargement du calendrier : ne dépend pas des données. | aucune |
| 150, 151, 165 | Projet à code de 30 caractères et projet à code de 11 caractères. Les codes de `remplir.ts` sont DEMO-R, DEMO-S, DEMO-Q, DEMO-C, DEMO-M (`:99-103`, `:210-216`, `:230-234`, `:244-248`, `:254-258`), 6 caractères au plus. | chefa, Projets, « Nouveau projet » : code `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123` (30 caractères) puis un second projet de code `PRJ-1234567` ; pour chacun, onglet Affectations : affecter Alice ; onglet Planning : créer une activité et « Assigner » à Alice. À faire avec chefa, avant les lignes d'Alice. Alice : saisir 0,5 le lundi 23/11 sur chaque nouvelle ligne, « Enregistrer » (nécessaire pour le badge de la ligne 156). |
| 166 | Total d'un jour supérieur à la capacité (Dépassement). `remplir.ts:299-328` impute 1 j au plus par jour et `:330` une seule imputation de 0,5 j : aucun total > 1 j. | Alice, Imputations, semaine 2026-11-23 : Cadrage lundi = 1,5, « Enregistrer » (non bloquant, SPEC 4b (5)), en fin des lignes d'Alice ; la ligne 166 (retour d'admin) la lit ensuite. |

## Couverture

Chaque point source, avec les lignes qui le couvrent. Aucun point sans ligne (contrôle fait par script lors de la rédaction).

### Recette différée (lot 3)
- `L3-1` : diagramme plus étroit à 1440 px (387 px visibles) → lignes 68
- `L3-2` : diagramme plus étroit à 1024 px (150 px visibles) → lignes 69
- `L3-3` : recalcul automatique → lignes 78, 79
- `L3-4` : clavier du Gantt → lignes 80, 81
- `L3-5` : menu contextuel et « Copier » → lignes 82, 83
- `L3-6` : chefb sur DEMO-S → lignes 98, 99, 100
- `L3-7` : colonnes tronquées et défauts ouverts listés → lignes 70, 71, 75
- `L3-8` : Planning : nom sur deux lignes à 1024 px → lignes 84
- `L3-9` : Planning : bouton d'affectation renvoyé à la ligne → lignes 85
- `L3-10` : Planning manuel : jours 17 à 31 hors vue à 1024 px → lignes 86

### Défauts ouverts après REX-3b-r3 (et relecture REX-3b-r4)
- `DO-a` : (a) Début, Fin, Charge hors vue à 1024 px → lignes 65, 71
- `DO-b` : (b) colonne Drapeaux vide à l'Accueil → lignes 64
- `DO-c` : (c) focus clavier des boutons-noms et des crayons (réserve visuelle) → lignes 66
- `DO-d` : (d) en-tête « Charge » coupé à 1440 px → lignes 67
- `DO-e` : r4 : en-têtes entiers à 1440 px → lignes 67
- `DO-f` : r4 : badge « Retard » lisible → lignes 72
- `DO-g` : r4 : ombre à gauche de Drapeaux à 1024 px (Gantt) → lignes 70
- `DO-h` : r4 : « Charge » tronqué en « Cl » à 1024 px (Gantt) → lignes 70
- `DO-i` : r4 : largeur du diagramme mesurée (387 px, 150 px) → lignes 68, 69

### Recette différée (4b)
- `4b-RD` : REX du porteur sur l'écran Feuille de temps → lignes 107, 125, 136, 137, 138

### Captures de 4b
- `4b (1)` : tableau qui déborde à 1024 px → lignes 126, 127
- `4b (2)` : barre d'outils sur deux lignes → lignes 128, 129
- `4b (3)` : message d'erreur de case sur 4 lignes → lignes 134
- `4b (4)` : colonnes de jour de largeur inégale → lignes 126, 127
- `4b (5)` : badge « Brouillon » et boutons désactivés → lignes 130, 131

### Captures de 4b-corr
- `4b-corr (1)` : points corrigés à vérifier à l'écran → lignes 126, 127, 128, 130, 134
- `4b-corr (2)` : barre d'outils à 1024 px (deux lignes) → lignes 129
- `4b-corr (3)` : boutons Enregistrer et Soumettre désactivés → lignes 131
- `4b-corr (4)` : « Assigné » et « Réel cumulé » serrés à 1024 px → lignes 132
- `4b-corr (5)` : case invalide : rouge sous l'anneau de focus → lignes 135

### Captures de 4c
- `4c (1)` : Voir : Assigné contre Réel cumulé → lignes 46
- `4c (2)` : Voir : « Dépassement » sans lien avec une ligne → lignes 166
- `4c (3)` : 1024 px : libellé de semaine sous les boutons → lignes 49
- `4c (4)` : Voir : lecture seule non indiquée → lignes 47
- `4c (5)` : titre de la confirmation Valider long → lignes 51
- `4c (6)` : badge de statut du dialogue Voir (corrigé : non étiré) → lignes 48

### Recette différée (4c, écran Validation, D-136)
- `4c-RD-1` : lundi − 7, chefa → lignes 59, 155
- `4c-RD-2` : lundi − 7, chefb → lignes 103
- `4c-RD-3` : lundi − 7, admin → lignes 42, 56
- `4c-RD-4` : lundi − 14, Bob « Validée » → lignes 43, 60, 154
- `4c-RD-5` : lundi − 14, Alice « Rejetée » et commentaire → lignes 45, 104, 138
- `4c-RD-6` : lundi, Alice brouillon → lignes 44

### Captures de 5d
- `5d (1)` : Feuille de temps 1024 px : colonne Activité réduite → lignes 133
- `5d (2)` : Validation 1024 px : badges Projets sur plusieurs lignes → lignes 49, 50
- `5d (3)` : alerte sans bouton de fermeture → lignes 167
- `5d (4)` : code tronqué non lisible (infobulle) → lignes 150
- `5d (5)` : badge de 30 caractères long à 1440 px → lignes 165
- `5d (6)` : alerte de refus conforme → lignes 167, 168
- `5d (7)` : code de 11 caractères entier → lignes 151
- `5d (8)` : code de 30 caractères coupé par une ellipse → lignes 150

### Captures de 6a
- `6a (1)` : Utilisateurs 1024 px : tableau qui déborde → lignes 8
- `6a (2)` : Utilisateurs 1440 px : Nom, Identifiant, Email sur deux lignes → lignes 7
- `6a (3)` : dialogue Nouvel utilisateur : boîte touchant haut et bas → lignes 10, 11
- `6a (4)` : liste Équipes : colonnes sans lien visuel → lignes 12, 13
- `6a (5)` : équipe vide affichée « — » comme Initiales → lignes 9
- `6a (6)` : Supprimer actif alors que l'équipe a des membres → lignes 15
- `6a (7)` : erreur de doublon éloignée du champ Nom → lignes 14
- `6a (8)` : états chargement, vide et erreur de Équipes → lignes 22

### Captures de 6b
- `6b (1)` : colonnes numériques alignées à gauche → lignes 111
- `6b (2)` : Début et Fin « — » sans indication → lignes 153
- `6b (3)` : aucune unité → lignes 112
- `6b (4)` : aucune mise en évidence du reste ni tri → lignes 113
- `6b (5)` : lignes non cliquables → lignes 114
- `6b (6)` : nom de projet absent (code seul) → lignes 115
- `6b (7)` : répartition des colonnes 1440 px / 1024 px → lignes 116, 117
- `6b (8)` : état vide sans icône ni suite à donner → lignes 105
- `6b (9)` : pied de menu : nom sans libellé de rôle → lignes 118
- `6b (10)` : titre de page seul → lignes 119
- `6b (11)` : états chargement et erreur → lignes 120

### Recette différée du lot 6 (D-164)
- `L6-6a1` : 6a : écran Équipes → lignes 12, 13, 14, 15, 16, 21
- `L6-6a2` : 6a : champ Équipe des utilisateurs → lignes 7, 9, 10, 18, 20
- `L6-6b1` : 6b : Mes tâches → lignes 105, 110, 117, 120
- `L6-6b2` : 6b : menu de la ressource → lignes 108, 109, 118
- `L6-6c1` : 6c : colonnes Vendu et Marge → lignes 73, 101
- `L6-6c2` : 6c : région Totaux → lignes 74
- `L6-6c3` : 6c : losange et écart de la date client → lignes 76
- `L6-6c4` : 6c : badge Client → lignes 77
- `L6-6c5` : 6c : noms tronqués à 144 px à 1440 px → lignes 75
- `L6-6d1` : 6d : Plan de charge → lignes 30, 31, 32, 38
- `L6-6d2` : 6d : filtres → lignes 33, 34, 35
- `L6-6d3` : 6d : surcharge → lignes 37
- `L6-6d4` : 6d : champ Mois en anglais dans Chromium → lignes 36
- `L6-6e1` : 6e : liste « Planning de » → lignes 61, 62, 63
- `L6-6e2` : 6e : lignes « Autre projet » → lignes 102
- `L6-6f1` : 6f : boutons « Exporter CSV » → lignes 40, 52, 53, 54
- `L6-6f2` : 6f : ouverture des fichiers dans un tableur français → lignes 41, 55
- `L6-6f3` : 6f : lien du Plan de charge sur deux lignes à 1024 px → lignes 39

### Recette différée (REX-5)
- `RX5-1` : onglets de l'écran Utilisateurs à 1440 px et à 1024 px → lignes 2, 4, 5
- `RX5-2` : passage d'un onglet à l'autre et relecture des données → lignes 3, 6, 16, 17, 19, 23, 24, 25
- `RX5-3` : page de détail d'un calendrier, « Retour aux calendriers », entrée « Utilisateurs » active → lignes 26, 27, 29, 58
- `RX5-4` : section « Mon calendrier » de Mes tâches (ressource et chef ressource ; jours travaillés, fériés à venir, états vide et erreur) → lignes 28, 106, 121, 122, 123, 124
- `RX5-5` : menus des trois rôles → lignes 1, 57, 97, 108, 152

### Recette différée (D-172)
- `D172-1` : Feuille de temps avec une case modifiée : menu, logo, retour du navigateur, déconnexion, changement de semaine → lignes 139, 140, 141, 142, 143, 144, 145
- `D172-2` : Planning manuel avec une case cochée : Mois précédent, Mois suivant, Retour au projet, menu → lignes 87, 88, 89, 90, 91, 92
- `D172-3` : sans modification, ou après « Enregistrer » : aucune confirmation → lignes 93, 94, 146, 147
- `D172-4` : rechargement et fermeture de l'onglet → lignes 95, 96, 148, 149

### Recette différée (dévalidation, D-180)
- `DEV-RD-1` : boutons de la feuille validée de Bob (Voir, Dévalider) → lignes 156
- `DEV-RD-2` : confirmation, texte et « Annuler » → lignes 157, 158
- `DEV-RD-3` : succès de la dévalidation, statut et badge → lignes 159
- `DEV-RD-4` : revalidation, état rétabli → lignes 160

### Recette différée (saisie pour autrui, D-184)
- `AUT-RD-1` : menu et liste « Ressource » de l'administrateur : entrée « Imputations », message, titre, adresse → lignes 1, 161
- `AUT-RD-2` : saisie et enregistrement pour Alice par l'administrateur, valeur remise → lignes 162
- `AUT-RD-3` : garde de D-172 au changement de ressource → lignes 163
- `AUT-RD-4` : `ressource=` d'autrui ouvert par une ressource, ignoré → lignes 164

### Recette différée (retouche de la Feuille de temps, D-186)
- `RET-RD-1` : Activité lisible, en-têtes, aucun défilement à 1024 et 1280 px → lignes 133, 169
- `RET-RD-2` : liste « Ressource » stable au chargement, option « Choisir… » désactivée → lignes 170, 171

### Recette différée (garde des dialogues, D-188)
- `GDL-RD-1` : confirmation, « Annuler » (rester), « Abandonner » (quitter) → lignes 172
- `GDL-RD-2` : aucune confirmation sans modification → lignes 173
- `GDL-RD-3` : refus puis fermeture, envoi réussi → lignes 174, 175
- `GDL-RD-4` : dialogue à chargement asynchrone (Modifier le projet) → lignes 176
- `GDL-RD-5` : Rejeter gardé, Exporter sans garde → lignes 177
- `GDL-RD-6` : « Annuler » propre au formulaire : calendrier, jour férié, projet, Rejeter → lignes 178, 179
- `GDL-RD-7` : focus initial des confirmations sur « Annuler » → lignes 180

