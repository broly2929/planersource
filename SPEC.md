# SPEC — Outil de gestion de projet (V1)

Statut : version 0.3, à modifier de façon incrémentale (ne jamais réécrire le document).

## 1. Cadre

- **Objet** : serveur web de gestion de projet : utilisateurs, planning (projets, activités, jalons), Gantt éditable, imputations, moteur de planification, modèles et copie de projet.
- **Licence du projet** : MIT. Dépendances d'exécution : MIT, Apache 2.0, BSD, ISC, 0BSD. Outillage de développement : en plus BlueOak-1.0.0, CC0-1.0, Python-2.0, CC-BY-4.0, Unlicense, MPL-2.0. GPL, AGPL et LGPL interdites partout. Contrôle automatique des licences dans la CI.
- **Origine** : implémentation de zéro. Aucun code source tiers sous AGPL ne doit être lu, copié ou adapté dans ce dépôt. Cette spec est la seule référence fonctionnelle.
- **Méthode** : TDD. Chaque cas de test de ce document devient un test automatisé avant l'écriture du code correspondant. Les tests hors moteur (identifiants AUTH, USR, MIG, LIC, SAV, E2E et suivants) sont catalogués dans docs/tests.md ; chaque entrée cite la section de cette spec qui fonde la règle, ou, pour les tests d'outillage (CI), la décision de docs/decisions.md.
- **Stack** : TypeScript partout. React (web), Node.js (API), PostgreSQL. Moteur de planification dans un paquet isolé, sans accès base ni réseau.

### Hors périmètre V1

Tickets, RH, environnements, documents, réunions, pools de ressources, capacité variable dans le temps, chemin critique, planning de référence, coûts (prévus en V2), import de données d'un autre logiciel.

Modes de planification écartés : travail en commun, régulier en jours entiers, en demi-journées, en quarts de journée, récurrent hebdomadaire.

## 2. Rôles

| Rôle | Droits |
|---|---|
| Administrateur | Tout, dont utilisateurs, calendriers, paramètres |
| Chef de projet | Créer et modifier ses projets, activités, jalons, affectations ; lancer le calcul ; valider les imputations de ses projets |
| Ressource | Lecture des projets où elle est affectée ; saisie de ses imputations |

Un utilisateur peut être ressource (planifiable) ou non. Authentification par identifiant (`login`, distinct de l'email, REX-2, D-077) et mot de passe (hachage argon2), session par cookie. Le premier administrateur est créé par la commande `npm run create-admin`. La session expire après 12 h.

- L'email, facultatif (REX-2, D-077), est normalisé en minuscules (création, modification). Renseigné, son format et son unicité sont contrôlés.
- Identifiant de connexion `login` (REX-2, D-077) : obligatoire en base, unique, normalisé (espaces de bord retirés, minuscules), non vide, sans autre format. À la création, `login` absent prend la valeur de l'email ; `login` et email absents : refus (400). Modifier l'email ne modifie pas le login, et inversement. Login déjà utilisé : 409 { erreur: 'Identifiant déjà utilisé' }, rien n'est créé ni modifié.
- Connexion par le login seul : POST /api/auth/login accepte la clé `identifiant` ; la clé `email` reste acceptée comme synonyme et est comparée au login ; casse et espaces de bord sont ignorés. Un utilisateur dont le login diffère de l'email ne se connecte pas avec son email.
- Initiales (REX-2, D-077) : facultatives, 1 à 4 caractères, espaces de bord retirés ; vides ou null = aucune. Plus de 4 caractères : 400.
- `login` et `initiales` figurent dans les réponses de /api/utilisateurs et /api/auth/me.
- Un administrateur ne peut ni se désactiver ni changer son propre rôle.
- Il reste toujours au moins un administrateur actif.
- Un changement de mot de passe ou de rôle, ou une désactivation, révoque les sessions de l'utilisateur concerné ; les sessions de plus de 12 h sont supprimées à la connexion.
- `create-admin` refuse un email mal formé et un mot de passe vide ; option `--login` ; `--email` est facultatif, l'un des deux est requis (REX-2, D-077). Aucune longueur minimale : un mot de passe non vide suffit, pour `create-admin` comme pour l'API (REX-2, D-076).
- Compte de développement (D-071) : au démarrage de l'API, un administrateur actif (nom « Administrateur », login « admin », email null, mot de passe « admin ») est créé si la variable d'environnement `NODE_ENV` est définie et égale exactement à « development » (absente : aucune création), si la table utilisateur est vide et si la variable `DEV_ADMIN` ne vaut pas « 0 ». Aucune création dans tout autre cas (production, test, base non vide, `DEV_ADMIN=0`). Un avertissement est écrit dans le journal à la création. Le login n'a aucun format, l'email « admin » n'existe plus (D-077) : `create-admin` et `POST /api/utilisateurs` gardent le contrôle du format de l'email renseigné (plus de minimum de longueur, D-076).
- Le champ identifiant de l'écran Connexion n'est pas de type email (il accepte « admin ») ; son libellé est « Identifiant » (D-077, au lieu de « Email ») ; refus de connexion : « Identifiant ou mot de passe incorrect. ».
- Toute route de l'API, hors connexion, exige une session valide ; sinon 401.
- La déconnexion invalide la session.
- L'email, quand il est renseigné, est unique ; une création sur un email existant est refusée (409 'Email déjà utilisé'), rien n'est créé.
- Le mot de passe haché n'apparaît dans aucune réponse de l'API ; le jeton de session est stocké haché.
- Les calendriers sont lisibles par tout utilisateur connecté. Un chef de projet ne lit que ses projets (ceux dont il est chef, ou dont l'un des ancêtres a pour chef) ; l'historique d'un projet est réservé à l'administrateur et à son chef de projet.
- Tout utilisateur, quel que soit son rôle, lit les projets où il est affecté ; en dehors de ses propres projets, un chef de projet y est en lecture seule.
- Tout utilisateur connecté lit l'annuaire : identifiant, nom, rôle, est_ressource et actif de chaque utilisateur, actif ou non. L'annuaire n'expose ni l'email, ni le login, ni les initiales (celles-ci n'y entrent qu'au lot 3d, D-077), ni aucune autre donnée.
- Chaque projet renvoyé par `GET /api/projets` et `GET /api/projets/:id` porte `peut_ecrire` : vrai si l'utilisateur peut écrire sur ce projet (administrateur, ou chef de projet dans sa portée), faux sinon (lecture seule).
- `GET /api/projets` et `GET /api/projets/:id` renvoient aussi `debut_planifie` et `fin_planifiee` (null avant tout calcul), en lecture seule : non modifiables (PATCH : 400) et non historisés (REX-2, D-078).
- Le calcul est réservé à l'administrateur et au chef de projet. Un chef ne calcule que les projets sur lesquels il écrit ; un projet illisible répond 404, un projet lisible en lecture seule répond 403.
- Calcul (lot 3c, D-074) : un identifiant de projet hors plage entier (> 2147483647) dans le corps répond 400 ; si le verrou de calcul tenu par un autre calcul n'est pas obtenu en 10 s, 409 { erreur: 'Un calcul est déjà en cours' } ; ces refus n'écrivent rien et ne laissent aucun verrou.
- Un projet que l'utilisateur ne peut pas lire répond 404.
- Un identifiant mal formé ou hors plage dans une adresse répond 404.
- Une requête refusée (401, 403, 404, 409, 422) ne modifie aucune donnée.

## 3. Modèle de données

| Entité | Champs principaux |
|---|---|
| Utilisateur | nom, login, email (facultatif), initiales (facultatives), mot de passe haché, rôle, est_ressource, capacité (j/jour, défaut 1), calendrier, actif |
| Calendrier | nom, jours travaillés de la semaine (défaut lun–ven), jours fériés ou chômés (liste de dates) |
| Projet | nom, code (unique, sans tenir compte de la casse), parent (sous-projet), priorité (défaut 500, plus petit = plus prioritaire), chef de projet, date de début, clos, est_modele (booléen, défaut faux) |
| Affectation projet | projet, ressource, taux (%), date de début et de fin facultatives |
| Activité | projet, parent (activité), ordre WBS, nom, mode de planification, priorité (défaut 500), début validé, fin validée, durée validée (jours ouvrés), début planifié, fin planifiée, drapeaux (voir 5.9), close |
| Jalon | projet, parent, ordre WBS, nom, type (flottant ou fixe), date validée, date planifiée |
| Dépendance | prédécesseur, successeur (activité ou jalon), type (FD, DD, FF), délai (jours ouvrés, peut être négatif) |
| Assignation | activité, ressource, taux (%, défaut 100), charge assignée, charge réelle, reste à faire |
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
- Le chef d'un projet est un administrateur ou un chef de projet actif. Seule une ressource active peut être affectée à un projet. Un utilisateur qui a des affectations ne peut pas cesser d'être ressource (409).
- Rattacher un projet à un parent exige le droit d'écriture sur ce parent. Seul l'administrateur désigne ou change le chef d'un projet ; un chef de projet qui crée un projet en est le chef.
- Activité : mode ASAP par défaut ; la fin validée n'est pas antérieure au début validé ; la durée validée vaut au moins 1. Jalon flottant : date validée facultative. Le délai d'une dépendance est un entier.
- Une charge n'est jamais négative. Tant que la charge réelle vaut 0, modifier la charge assignée recale le reste à faire sur la charge assignée.
- Les calendriers sont historisés comme les entités de planning. Un déplacement dans le WBS historise l'élément déplacé, pas les rangs décalés de ses frères.
- Une date validée (début et fin validés d'une activité, date validée d'un jalon) n'est pas postérieure au 31/12/2099 : sinon refus 400, en création comme en modification (lot 2e, D-056).
- Saisie manuelle (lot 2e, D-056) : une saisie n'est permise que sur une assignation d'une activité feuille ouverte en mode MAN (422 sinon). Un jour chômé ou hors des dates d'affectation est accepté (tout en surcharge au calcul). Une saisie par (assignation, jour, demi-journée). Saisie par l'administrateur et le chef du projet ; lecture par la ressource affectée ; les saisies ne sont pas historisées.
- Tant qu'une activité MAN porte des saisies, changer son mode et lui ajouter un enfant sont refusés (422). La clore est permis : ses saisies sont gardées et ignorées par le moteur.
- Saisie : `GET /api/activites/:id/saisies?mois=AAAA-MM` et `PUT /api/activites/:id/saisies?mois=AAAA-MM` ; le PUT remplace les saisies du mois en une transaction.
- API de saisie (lot 2e-I, D-058). Table `saisie_manuelle` (id, assignation, jour, demi-journée `matin` ou `apres_midi`, unique par (assignation, jour, demi-journée)), supprimée avec l'assignation. Pas de colonne charge : une saisie vaut 0,5 j.
- `GET /api/activites/:id/saisies?mois=AAAA-MM` → 200 `{ mois, saisies: [{ assignation_id, jour, demi_journee }] }`, triées par assignation, jour, puis matin avant après-midi. Droits de lecture du projet (administrateur, chef, ressource affectée). Activité non MAN : 200, liste vide.
- `PUT` (même adresse) : corps strict `{ saisies: [{ assignation_id, jour, demi_journee }] }` ; remplace en une transaction toutes les saisies du mois pour les assignations de l'activité ; réponse 200 de même forme que le GET ; rien n'est historisé. Droits d'écriture du projet.
- Ordre des refus : 401 ; 404 activité inconnue ou illisible ; 403 lecture seule ; 400 mois invalide, corps invalide, jour hors du mois, doublon dans le corps ; 422 activité qui n'est pas une feuille MAN ouverte, assignation d'une autre activité. Un refus n'écrit rien.
- Tant que l'activité MAN porte des saisies (précise la règle ci-dessus) : PATCH qui change son mode, création d'un enfant sous elle et déplacement d'un élément sous elle sont refusés (422, base inchangée). La clore est permis. Supprimer l'activité ou l'assignation supprime les saisies.
- Précisions (D-059) : mois absent = invalide (400), en GET comme en PUT ; 422 aussi pour une assignation inexistante dans le corps, et un 422 n'écrit aucune saisie du corps ; `close: false` permis sur une MAN close à saisies ; PATCH du mode vers la même valeur permis (200), changement de mode refusé tant que l'activité porte des saisies, close ou non ; création d'un enfant et déplacement sous une activité à saisies refusés du fait de l'assignation (une saisie suppose une assignation), effacer les saisies ne lève pas ce refus.
- Borne du mois (D-060) : l'année du mois est comprise entre 2000 et 2099, sinon 400, en GET comme en PUT.
- Clôture (D-083) : (1) clore un projet (`clos: true`) est refusé, 422 { erreur, code: 'enfants_ouverts' }, si un sous-projet, à n'importe quel niveau, n'est pas clos, ou si une activité du projet ou d'un sous-projet, à n'importe quel niveau, est ouverte ; les jalons ne comptent pas ; même règle pour les modèles. (2) Clore une activité parente est refusé, 422 code 'enfants_ouverts', si une sous-activité, à n'importe quel niveau, est ouverte. (3) Règle stricte, 422 code 'parent_clos' : rouvrir une activité dont une activité ancêtre, le projet ou un projet ancêtre est clos ; rouvrir un sous-projet dont un projet ancêtre est clos ; créer une activité ou un jalon dans un projet clos ou sous une activité close ; déplacer une activité ou un jalon vers un tel endroit ; créer un projet ouvert sous un projet clos, ou y rattacher un projet ouvert (`parent_id`). Rouvrir un parent clos reste toujours permis. (4) Le 422 « Arborescence de projets invalide » porte `code: 'arborescence_invalide'`. (5) Ces refus passent après tous les refus existants ; un refus n'écrit rien, historique compris. (6) Verrou de ligne (FOR UPDATE) sur le projet racine de l'arbre concerné, pour la clôture, la réouverture, la création, le déplacement et le rattachement. (7) Pas de migration des données déjà en base : seules les opérations de (1) à (3) sont contrôlées ; un PATCH qui ne touche que d'autres champs passe, même sur un élément incohérent. (8) Copie, suppression, calcul et Gantt sont inchangés.
- Imputations (D-118) : table `imputation` (assignation, jour, charge), une par (assignation, jour), charge comprise entre 0 (exclu) et 10, au centième (§10 Q1, défaut) ; table `feuille_temps` (ressource, lundi de la semaine ISO, statut `brouillon`, `soumise`, `validee` ou `rejetee`, commentaire facultatif), une par (ressource, semaine), créée à la première écriture (absente = brouillon vide) ; table `validation_feuille` (feuille, projet, validateur, date), une par (feuille, projet). La charge réelle d'une assignation est la somme de toutes ses imputations ; elle n'est pas historisée, les imputations non plus ; le reste à faire modifié par la feuille l'est (auteur = la ressource). Une assignation qui porte une imputation a une charge réelle : sa suppression reste refusée (409). La copie de projet ne copie aucune imputation.

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
- Mot de passe (REX-2, D-076) : les champs « Mot de passe » (création) et « Nouveau mot de passe » (modification) n'imposent aucune longueur minimale ; à la création le champ reste obligatoire.
- Arborescence de l'écran Projets (REX-2, D-079) : le tableau « Liste des projets » est une arborescence, mêmes colonnes (Code, Nom, Chef de projet, Début, Actions si une ligne est modifiable). Racines : projets visibles sans parent ou dont le parent n'est pas visible ; frères triés par code, sans tenir compte de la casse. Tout est replié par défaut ; boutons « Déplier <nom> » / « Replier <nom> » (aria-expanded) par projet, « Tout déplier » / « Tout replier » en tête d'écran. Sous un projet déplié : ses activités, sous-activités et jalons en ordre WBS (lecture seule : Code = numéro WBS, nom indenté en texte, badge « Jalon », Début = début ou date planifiée ou « — », aucun bouton), puis ses sous-projets (lignes de projet complètes, indentées). Éléments chargés par `GET /api/projets/:id/gantt` au premier dépliage, sans nouvelle route. Projet vide : « Aucune activité ni jalon. » ; échec de chargement : « Impossible de charger le contenu du projet. ».
- Projet parent (REX-2, D-079) : champ « Projet parent » dans « Nouveau projet » et « Modifier le projet » d'un projet ordinaire ; premier choix « Aucun (projet racine) » ; options : projets ordinaires où l'utilisateur écrit, « <code> — <nom> », triés par code, sans le projet ni ses descendants en modification. `parent_id` envoyé à la création seulement si un parent est choisi, à la modification seulement s'il a changé (identifiant ou null). Refus 422 de code `arborescence_invalide` (D-083 (14)) : « Ce projet parent n’est pas possible. », dialogue ouvert, rien de modifié. Hors écran pour les modèles en V1 ; la copie reste un projet racine.
- Refus de clôture (D-083 (9), tranche C2), dialogue ouvert, rien modifié : `enfants_ouverts` sur un projet : « Ce projet a des sous-projets ou des activités non clos. » ; sur une activité : « Cette activité a des sous-activités non closes. » ; `parent_clos` sur une activité, ou sur un élément créé ou déplacé : « Le projet ou l’activité parente est clos. » ; `parent_clos` sur un projet : « Le projet parent est clos. » ; `arborescence_invalide` : texte actuel inchangé. Le texte d'un 422 dépend seulement du champ `code` ; sans code, « Cette opération enfreint une règle du planning. » (D-083 (14)), dans les dialogues de modification (projet, activité), la création d'activité et de jalon et le déplacement ; à la création d'un projet, un 422 sans code garde « Données invalides : vérifiez le code, le nom, le chef et la date. » (D-083 (15)).

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

## 5. Moteur de planification

### 5.1 Entrées et sorties

- **Entrées** : liste de projets, date de début de calcul D0 (défaut : aujourd'hui), données du modèle.
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

Début validé et fin validée obligatoires. Traité en passe A. Chaque jour ouvré de la fenêtre à partir du maximum de D0 et du début validé : cible = reste à faire ÷ jours ouvrés restants dans la fenêtre. Le reliquat en fin de fenêtre est planifié ensuite en ASAP, avec drapeau `retard`.

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
- « Enregistrer » envoie le PUT du mois, inactif sans modification ; « Annuler » rétablit l'état chargé ; les boutons de mois sont inactifs tant qu'il reste des modifications. Succès et erreur par notification.
- Lecture seule (cases désactivées, ni Enregistrer ni Annuler) : utilisateur sans droit d'écriture, activité close. Activité non MAN ou parente ouverte par l'adresse : message, pas de grille. Aucune assignation : état vide.
- L'écran ne lance aucun recalcul ; il indique que les saisies comptent au prochain calcul.
- Clavier (3g, D-114) : grille inscriptible, un seul arrêt de tabulation (tabindex mobile : case courante `tabIndex` 0, autres −1). Case courante initiale : première ressource, jour 1, matin ; conservée après Espace, Enregistrer et Annuler ; remise à la première au changement de mois ; un clic la rend courante. → et ← : demi-case suivante ou précédente de la ligne (matin, après-midi, matin du jour suivant), sans bouclage ; ↑ et ↓ : même demi-case, ressource précédente ou suivante, sans bouclage ; Début et Fin : première et dernière case de la ligne ; flèches, Début et Fin avec `preventDefault` ; Espace coche ou décoche (natif). Cases à cocher, noms accessibles et rôles inchangés. Lecture seule inchangée (cases désactivées, aucun arrêt).
- Jours non ouvrés (REX-3a, D-123 (8)) : la case d'un jour non ouvré du calendrier de la ressource (jours fériés compris) est désactivée, sauf si elle est cochée (activable pour la décocher) (D-124 (1)) : une case d'un jour non ouvré non cochée porte `aria-disabled="true"` sans l'attribut `disabled`, reste dans le tabindex mobile et est atteignable aux flèches, à Début et à Fin ; Espace et clic sans effet ; apparence grisée ; lecture seule inchangée (`disabled`, aucun arrêt). Refus 422 `jour_non_ouvre` du PUT : notification « Ce jour n'est pas ouvré pour la ressource. ».

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
  - jalon, en plus : type_jalon ('flottant' | 'fixe'), date_validee, date_planifiee.
- Charges d'une feuille : sommes de ses assignations (0 sans assignation). Charges d'un parent : sommes de ses feuilles descendantes (SPEC 5.8). Dates planifiées et drapeaux : tels que stockés par le dernier calcul.
- `avancement` : réel ÷ (réel + reste) × 100, arrondi à 2 décimales ; null si réel + reste = 0.
- `dependances` : { id, predecesseur_id, successeur_id, type, delai, drapeaux }, triées par id.
- `sous_projets` : sous-projets directs que l'utilisateur peut lire, { id, code, nom, debut_planifie, fin_planifiee, clos }, triés par id ; leurs éléments ne figurent pas dans `elements`.
- Avant tout calcul : dates planifiées null, drapeaux [].
- Droits : lecture du projet (règles §2 et §11.1, modèles compris). Refus : 401 sans session ; 404 projet inconnu, illisible ou identifiant mal formé.
- Lecture seule : la route n'écrit rien.

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
12. Accessibilité : nom accessible de barre « <nom>, du JJ/MM/AAAA au JJ/MM/AAAA » suivi de « , <drapeau> » par drapeau (libellés du point 6 en minuscules) ; jalon « <nom>, le JJ/MM/AAAA » ; les deux zones à défilement (tableau, SVG) sont focalisables (`tabIndex=0`, `role="region"`, `aria-label` « Tableau du Gantt » et « Calendrier du Gantt », anneau de focus de `docs/ui.md`) ; sont focalisables dans le Gantt, dans cet ordre : boutons de zoom, zone du tableau, liens de sous-projets (point 11), zone du SVG ; barres et jalons ne le sont pas ; le clavier fait défiler une zone focalisée (flèches droite et gauche) (D-070). Case « Initiales » juste après le bouton « Mois » dans l'ordre de focus (D-091).
13. Rôle : chaque barre et chaque jalon du SVG porte `role="img"` et son nom accessible en `aria-label` (D-067) ; la barre de synthèse d'un sous-projet se repère par `data-projet-id` (D-067).
14. Nom accessible d'un jalon en retard : « <nom>, le JJ/MM/AAAA, retard », comme pour les barres d'activité (D-068).
15. Largeurs (D-069) : (valeurs révisées par D-086, en fin de point) colonne Drapeaux fixée à droite du tableau (`sticky`), badges sur une seule ligne, largeur de colonne au plus 144 px (Retard 53 + Surcharge 71 + écart 4 + marges 16), hauteur de ligne inchangée. Critère d'acceptation, à 1440 et à 1024 px de large : (a) chaque badge de la colonne Drapeaux est entièrement dans la zone visible, sans défilement ; (b) les colonnes WBS et Nom sont entièrement visibles sans défilement et non recouvertes par la colonne Drapeaux, y compris avec un nom de 60 caractères, dont à un niveau WBS 4 (troncature par ellipsis et `title` si besoin) ; (c) la page ne défile pas en horizontal (`scrollWidth <= clientWidth` sur `documentElement`) ; (d) la hauteur d'une ligne à badges est égale à celle d'une ligne sans badge. Hypothèse : une activité émet au plus 2 drapeaux (5.9 ; max structurel de `drapeauxDuree`, retard + surcharge), 1 observé en pratique ; si elle cesse d'être vraie, la largeur de la colonne Drapeaux est à revoir. Troncature de Nom : contenu en `block max-w-64 truncate` avec `title` égal au nom (cellule de 272 px, au plus 293 px disponibles à 1024 px : 499 − 144 − 62) ; à 1440 px les autres colonnes peuvent défiler avec un nom long (accepté) ; limite connue : l'indentation grignote le texte aux niveaux WBS profonds. Révision (D-086) : mesures refaites avec DejaVu Sans (police de repli de la CI et de la VM) ; colonne Drapeaux au plus 176 px (`max-w-44` ; « Début non respecté » 151,6 px, Retard + Surcharge 155 px, plus 16 px de marges = 171 px) ; contenu de Nom en `max-w-56` (cellule de 240 px, 261 px disponibles à 1024 px : 499 − 176 − 62) ; mêmes valeurs sur le Gantt de l'Accueil.
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

1. Écran Accueil (`/`) : Gantt en lecture seule des projets ordinaires visibles et non clos. Modèles, projets clos et sous-projets clos sont absents. La ligne « Connecté en tant que … » reste au-dessus. Aucune nouvelle route d'API : `GET /api/projets` pour les projets, `GET /api/projets/:id/gantt` pour les éléments d'un projet déplié. Toute la descendance d'un projet clos est masquée, même un sous-projet non clos (D-081) ; les racines s'obtiennent après ce filtre, par la règle D-079 (2).
2. Arbre : racines et tri comme D-079 (2). Tout est replié par défaut. Boutons « Déplier <nom> » / « Replier <nom> » (aria-expanded) et « Tout déplier » / « Tout replier » comme D-079 (3). Sous un projet déplié, ses éléments en ordre WBS puis ses sous-projets non clos, comme D-079 (4). Éléments chargés au premier dépliage ; « Tout déplier » charge en parallèle les projets non encore chargés. Messages « Aucune activité ni jalon. » et « Impossible de charger le contenu du projet. » comme D-079 (4).
3. Tableau de gauche, colonnes réduites : Code (code du projet, ou numéro WBS d'un élément) ; Nom (lien vers la fiche pour un projet ou un sous-projet ; texte pour un élément, avec un badge « Jalon » pour un jalon ; indentation selon la profondeur, troncature comme 3b point 15) ; Début et Fin (dates planifiées au format JJ/MM/AAAA, « — » si absentes) ; Drapeaux (badges de 3b point 6 sur les lignes d'éléments, vide sur les lignes de projet). Lignes de 32 px alignées sur le SVG.
4. SVG à droite : zoom jour, semaine ou mois dans l'adresse `/?zoom=jour|semaine|mois` (semaine par défaut, valeur inconnue = défaut), conservé au rechargement. Échelle, week-ends, trait du jour et largeur minimale comme 3b points 3, 8 et 16.
5. Barres : un projet ou un sous-projet a une barre de synthèse fine grise de `debut_planifie` à `fin_planifiee`, avec `role="img"`, `data-projet-id` et un nom accessible « <nom>, du JJ/MM/AAAA au JJ/MM/AAAA ». Pas de barre sans dates planifiées. Les éléments dépliés suivent 3b points 5, 6, 7, 12 (noms accessibles), 13 et 14. Les liens sont ceux du projet déplié.
6. Plage : règle de 3b point 4, appliquée à la date de début et aux dates planifiées des projets affichés, puis, après un dépliage, aux dates planifiées et validées des éléments chargés. La plage s'élargit au dépliage et ne se réduit pas au repli.
7. Aucun projet visible : état vide « Aucun projet à afficher. ». Projets visibles mais aucune date planifiée : bandeau « Planning non calculé » (role=status), tableau affiché, aucune barre.
8. Bouton « Calculer », à côté des boutons de zoom : visible seulement si au moins un projet affiché a `peut_ecrire` ; une ressource ne le voit jamais. Il ouvre le dialogue de 3c point 5 avec tous les projets proposés cochés et la date préremplie à la date du navigateur. Succès : dialogue fermé, Accueil rechargé (projets, puis éléments des projets dépliés, repli conservé), notifications comme 3c points 7 et 11. Refus comme 3c points 8 et 10 ; les noms sont résolus parmi les éléments chargés, sinon « élément <id> ».
9. Accessibilité : les zones du tableau et du SVG sont focalisables comme 3b point 12, avec les aria-label « Tableau du Gantt global » et « Calendrier du Gantt global ». Ordre de focus : boutons de zoom, « Calculer », « Tout déplier », zone du tableau (boutons Déplier et liens compris), zone du SVG. Case « Initiales » juste après le bouton « Mois » dans l'ordre de focus (D-091).
10. Découpage : G1 refactor des composants du Gantt de 3b sans changement de comportement (les tests de 3b restent inchangés et verts) ; G2 Accueil replié (points 1, 3 à 7, 9) ; G3 dépliage (point 2 et barres d'éléments) ; G4 calcul (point 8) et extension de l'e2e de parcours complet.
11. Hors périmètre de cette sous-section (backlog) : colonnes ajoutables au tableau de l'Accueil ; dépendances entre projets (SPEC §3 inchangée).

### Édition (lot 3d, D-088)

1. Découpage : 3d-1 initiales ; 3d-2 API des gestes ; 3d-3 écran des gestes ; 3d-4 recalcul automatique et extension de l'e2e de parcours complet. 3d-3 découpé en 3d-3a (souris) et 3d-3b (clavier, double-clic, dialogue) (D-094).
2. Initiales (3d-1) : `GET /api/projets/:id/gantt` ajoute à chaque activité feuille `initiales` (liste des initiales de ses ressources assignées, ordre des assignations par id ; ressource sans initiales omise ; feuille sans assignation : `[]`) ; parents et jalons sans ce champ. L'annuaire est inchangé (précise D-077 (9)). Affichage : texte gris petit à droite de la barre, « AB, CD » ; nom accessible de la barre inchangé ; texte coupé au bord droit du SVG accepté ; pas de texte sans barre. Case « Initiales » à côté des boutons de zoom, décochée par défaut, état dans l'adresse (`initiales=1`), conservé au rechargement et au changement de zoom (le zoom est aussi conservé au changement de la case). Même case sur l'Accueil, appliquée aux éléments dépliés. Écart de 6 px entre la fin de la barre et le texte (D-089).
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
   - Bouton « Annuler » (nom accessible exact, icône Undo2, `title` « Annuler (Ctrl+Z) ») dans la barre d'outils du Gantt du projet ; désactivé si la pile est vide ou si l'utilisateur n'écrit pas. Ctrl+Z et Cmd+Z : même effet ; ignorés si le focus est dans un champ (input, textarea, select, contenteditable) ou un dialogue ouvert, et pendant un geste ou un calcul (même verrou que les gestes) ; une annulation à la fois.
   - Annulation = requête inverse avec les valeurs d'avant le geste (mêmes champs, null compris) ; lien supprimé : recréé (même type, même décalage, nouvel id) ; ligne : parent et rang d'avant. Succès : rechargement comme après un geste, recalcul automatique relancé s'il est coché, `role="status"` « Geste annulé. ». Refus ou erreur : `role="alert"` « Impossible d'annuler ce geste ; les annulations précédentes ne sont plus possibles. », pile vidée, bouton désactivé. Pas de rétablissement (Ctrl+Y) : hors périmètre.
   - Contour (D-129 (2)) : l'annulation d'un geste de barre remet le contour de l'élément dans l'état d'avant ce geste (gardé si la barre était déjà contournée, par un geste antérieur ou une modification depuis le dernier calcul ; retiré sinon) ; l'entrée de pile mémorise cet état.
18. Modification depuis l'Accueil et l'onglet Gantt (REX-3b, D-127 (6), revient sur D-079 (5) et (6), qui n'est pas réécrite) : dans le tableau de l'Accueil et du Gantt du projet, le nom d'une activité ou d'un jalon est un bouton (apparence de lien, nom accessible = le nom) qui ouvre le dialogue de modification de l'onglet Planning, si l'utilisateur écrit ce projet ; texte simple sinon. Projet (Accueil) et sous-projet (Gantt du projet) : nom = lien conservé, plus un bouton crayon « Modifier le projet <nom> » (dialogue de REX-2) si l'utilisateur écrit. Après enregistrement : rechargement de l'écran. Pas de gestes à la souris sur l'Accueil (inchangé). Ordres de tabulation et critères de largeur (D-069, D-086) : tests contredits révisés (D-031), critères inchangés (D-127 (7)).

## 7. Imputations

- Feuille de temps hebdomadaire par ressource : une ligne par assignation ouverte, une colonne par jour, saisie de la charge réelle en jours.
- Colonnes d'information : assigné, réel cumulé, reste à faire. Le reste à faire diminue du montant saisi et reste modifiable par la ressource.
- Total du jour affiché ; dépassement de la capacité signalé, non bloquant.
- **Cycle** : brouillon → soumise (par la ressource) → validée ou rejetée (par le chef de projet de chaque projet concerné, ou un administrateur). Une feuille soumise ou validée est verrouillée ; rejetée, elle redevient modifiable avec un commentaire.
- Écran de validation : liste des feuilles par semaine et par ressource, avec statut.
- Le travail réel saisi est pris en compte au calcul suivant.

### API et règles (lot 4a, D-118)

1. **Découpage** : 4a API et calcul ; 4b écran Feuille de temps ; 4c écran Validation ; clôture du lot 4 (parcours complet e2e étendu, feuilles ajoutées au jeu de démonstration D-117 après la séance UX). Un cycle complet par sous-lot.
2. **Semaine** : paramètre `semaine=AAAA-MM-JJ`, un lundi, année comprise entre 2000 et 2099 ; sinon 400.
3. **Lignes d'une feuille** : les assignations de la ressource dont l'activité est ouverte, le projet et ses ancêtres non clos, hors modèle ; plus toute assignation qui porte une imputation dans la semaine (alors `modifiable: false` si elle ne remplit plus ces conditions). Tri : code du projet sans tenir compte de la casse, puis ordre WBS.
4. **Lecture** : `GET /api/feuilles?semaine=…[&ressource_id=…]` → 200 `{ feuille: { id | null, ressource_id, semaine, statut, commentaire, validations: [{ projet_id, validateur_id, date }] }, lignes: [{ assignation_id, projet_id, projet_code, activite_id, activite_nom, wbs, assignee, reel_cumule, reste, modifiable, imputations: [{ jour, charge }] }], jours: [{ jour, capacite, total, depassement }] }`. Sept jours, du lundi au dimanche ; capacité = capacité de la ressource si le jour est ouvré à son calendrier, sinon 0 ; `depassement` = total > capacité (signalé, non bloquant). Sans `ressource_id` : sa propre feuille. Feuille d'autrui : l'administrateur (toutes les lignes) ou un utilisateur qui écrit sur au moins un projet de la feuille (seules les lignes de ces projets) ; sinon 404. Feuille absente : `id` null, statut `brouillon`, rien n'est écrit.
5. **Saisie** : `PUT /api/feuilles?semaine=…` (sa propre feuille seulement), corps strict `{ lignes: [{ assignation_id, imputations: [{ jour, charge }], reste? }] }`. Pour chaque ligne envoyée, ses imputations de la semaine sont remplacées (charge 0 = pas d'imputation) ; les lignes non envoyées sont inchangées. Réel : charge réelle = somme de toutes les imputations de l'assignation. Reste : reste := max(0, reste − δ), δ = nouveau total de la semaine − ancien total ; une valeur `reste` envoyée (≥ 0, 2 décimales au plus) prime. Le reste modifié est historisé (auteur = la ressource). Une transaction ; verrou de ligne (FOR UPDATE) sur la feuille et les assignations. Réponse 200 de même forme que le GET.
6. **Refus du PUT**, dans cet ordre, rien n'est écrit : 401 ; 400 semaine invalide, corps invalide, jour hors de la semaine, doublon (assignation ou jour d'une ligne), charge hors bornes ou à plus de 2 décimales ; 422 `{ erreur, code }` : `assignation_invalide` (assignation inconnue ou d'une autre ressource), `ligne_fermee` (activité close, projet ou ancêtre clos, modèle), sauf si toutes les charges envoyées pour cette ligne sont inchangées, `jour_futur` (jour postérieur à la date du jour du serveur), `feuille_verrouillee` (feuille soumise ou validée). Un jour chômé ou hors des dates d'affectation est accepté.
7. **Cycle** : `POST /api/feuilles/:id/soumettre` (la ressource ; brouillon ou rejetée → soumise ; commentaire effacé ; 422 `feuille_vide` sans imputation > 0 dans la semaine) ; `POST …/rappeler` (la ressource ; soumise sans aucune validation → brouillon ; sinon 422 `deja_validee`) ; `POST …/valider` (le validateur valide les projets concernés sur lesquels il écrit ; projets concernés = projets des assignations qui portent une imputation > 0 dans la semaine ; la feuille est validée quand tous le sont ; l'administrateur les valide tous) ; `POST …/rejeter` corps `{ commentaire }`, 1 à 500 caractères après retrait des espaces de bord (validateur d'au moins un projet concerné, ou administrateur ; soumise → rejetée ; validations effacées). Statut inadéquat : 422 `statut_invalide`. Feuille non visible : 404 ; visible sans droit d'agir : 403. Un refus n'écrit rien.
8. **Liste des validations** : `GET /api/validations?semaine=…` → 200 `{ feuilles: [{ feuille_id, ressource_id, ressource_nom, statut, projets: [{ projet_id, projet_code, valide, peut_valider }] }] }` : feuilles existantes (brouillons compris) qui touchent au moins un projet sur lequel l'utilisateur écrit ; administrateur : toutes ; utilisateur sans droit d'écriture : liste vide. Tri par nom de ressource.
9. **Calcul** : le travail réel du moteur = toutes les imputations des assignations des projets calculés, quel que soit le statut de la feuille ; les imputations des assignations des autres projets s'ajoutent au travail externe. Moteur inchangé. Le Gantt (avancement) lit la charge réelle.
10. **Précisions (D-119)** : (a) `jour_futur` ne vaut que pour une charge > 0 ; une charge 0 sur un jour futur est acceptée, sans écriture pour ce jour. (b) Ligne fermée : un `reste` envoyé différent du reste actuel est refusé, 422 `ligne_fermee`, même si les charges sont inchangées. (c) `ressource_id` inconnu, mal formé ou hors plage entier : 404. (d) Valider par un utilisateur qui voit la feuille mais n'écrit sur aucun projet concerné : 403. (e) Aucune feuille n'est créée si rien n'est écrit (ni imputation, ni reste modifié) : `PUT { lignes: [] }` ou charges toutes inchangées sur une feuille absente → 200, `feuille.id` null. (f) Feuille d'autrui filtrée : `jours[].total` et `depassement` portent sur les seules lignes visibles.

### Écran Feuille de temps (lot 4b, D-120)

1. **Accès** : entrée de menu « Imputations » (Navigation principale) si l'utilisateur est ressource ; sa propre feuille seulement, aucune route d'API nouvelle. Adresse `/imputations?semaine=AAAA-MM-JJ` (un lundi) ; absente ou invalide : lundi de la semaine courante du navigateur, adresse corrigée sans rechargement.
2. **En-tête** : titre « Feuille de temps » ; « Semaine du JJ/MM/AAAA au JJ/MM/AAAA » ; boutons « Semaine précédente », « Cette semaine », « Semaine suivante » ; statut affiché « Brouillon », « Soumise », « Validée » ou « Rejetée » ; feuille rejetée : alerte « Feuille rejetée : <commentaire> ».
3. **Tableau** : colonnes Projet (code), Activité (« <wbs> <nom> »), Assigné, Réel cumulé, sept jours (« lun. 11/01 » … « dim. 17/01 »), Reste à faire ; charges en jours, virgule décimale à l'affichage. Jour à capacité 0 : colonne grisée, saisie permise. Jour postérieur à la date du jour du navigateur : cases désactivées. Ligne `modifiable: false`, ou feuille soumise ou validée : lecture seule. Aucune ligne : « Aucune activité à imputer cette semaine. ».
4. **Saisie** : case de charge en texte, nom accessible « <activité>, <jour> » ; virgule ou point ; vide = 0 ; valeur invalide (non numérique, négative, plus de 2 décimales, > 10) : case marquée invalide (`aria-invalid`) avec message, « Enregistrer » désactivé. Reste à faire : même règle (≥ 0, 2 décimales), envoyé seulement s'il a été modifié par l'utilisateur.
5. **Total** : ligne « Total » sous le tableau, total par jour recalculé pendant la saisie ; total > capacité du jour : icône et texte « Dépassement » (nom accessible), couleur des drapeaux, non bloquant.
6. **Enregistrer** : PUT des seules lignes modifiées (charges ou reste) ; succès : « Feuille enregistrée. », tableau relu depuis la réponse ; refus : valeurs saisies gardées ; textes : 400 « Données invalides. » ; `assignation_invalide` « Cette ligne n’est plus disponible. » ; `ligne_fermee` « Cette activité ou ce projet est clos : la ligne n’est plus modifiable. » ; `jour_futur` « Impossible d’imputer un jour futur. » ; `feuille_verrouillee` « La feuille est soumise ou validée : elle n’est plus modifiable. ».
7. **Soumettre et rappeler** : « Soumettre » (brouillon ou rejetée), désactivé tant qu'il y a des modifications non enregistrées ; `feuille_vide` : « Aucune imputation : rien à soumettre. ». « Rappeler » (soumise) ; `deja_validee` : « La feuille est déjà validée en partie. ». Succès : statut mis à jour, cases selon le point 3.
8. **Changement de semaine** avec des modifications non enregistrées : confirmation « Abandonner les modifications ? » (composant de confirmation existant) ; annuler reste sur la semaine.
9. **Parcours complet e2e** étendu : la ressource se connecte, saisit, enregistre, soumet ; effet vérifié dans le Gantt du projet (charge réelle et avancement de l'activité).
10. **Rappeler une feuille validée** (correctif de 4a, D-120 (1)) : 422 `deja_validee` dès qu'une validation existe ; brouillon ou rejetée : 422 `statut_invalide`.

### Écran Validation (lot 4c, D-135)

1. Accès : entrée « Validation » de la Navigation principale pour l'administrateur et le chef de projet ; adresse `/validation?semaine=AAAA-MM-JJ` (un lundi) ; absente ou invalide : lundi de la semaine courante du navigateur, adresse corrigée sans rechargement (même code que 4b, partagé). Aucune route d'API nouvelle.
2. En-tête : titre « Validation des feuilles de temps » ; « Semaine du JJ/MM/AAAA au JJ/MM/AAAA » ; boutons « Semaine précédente », « Cette semaine », « Semaine suivante » (composant partagé avec 4b).
3. Tableau (GET /api/validations, ordre de l'API) : colonnes Ressource, Statut (mêmes badges que 4b), Projets, Actions. Projets : un badge par projet « <code> · Validé » (succès), « <code> · À valider » (si `peut_valider` et non validé), « <code> · Non autorisé » (neutre, si non `peut_valider` et non validé) ; `projets` vide : « Aucune imputation ». Liste vide : « Aucune feuille de temps pour cette semaine. ». Quatre états : Chargement, Vide, Notification erreur, nominal.
4. « Voir » (nom accessible « Voir la feuille de <ressource> ») : dialogue « Feuille de <ressource>, semaine du JJ/MM/AAAA au JJ/MM/AAAA », GET /api/feuilles?semaine=…&ressource_id=…, tableau de 4b en lecture seule (lignes visibles seulement, total, « Dépassement »), commentaire de rejet affiché si rejetée ; focus rendu au bouton à la fermeture.
5. « Valider » (« Valider la feuille de <ressource> ») : affiché si statut soumise et au moins un projet `peut_valider` non validé ; confirmation (composant existant) « Valider la feuille de <ressource> pour <codes des projets validables> ? » ; succès : `role="status"` « Feuille validée. », liste relue.
6. « Rejeter » (« Rejeter la feuille de <ressource> ») : affiché si statut soumise et au moins un projet `peut_valider` ; dialogue avec champ « Commentaire » obligatoire (1 à 500 caractères après retrait des espaces de bord, compteur, « Rejeter » désactivé sinon) ; succès : « Feuille rejetée. », liste relue.
7. Brouillons, feuilles rejetées ou validées : listées, sans « Valider » ni « Rejeter » ; « Voir » toujours présent.
8. Erreurs de valider ou rejeter : 422 `statut_invalide` « La feuille a changé de statut. » puis liste relue ; 403 « Vous n'avez pas le droit d'agir sur cette feuille. » ; 404 « Feuille introuvable. » puis liste relue ; 400 « Données invalides. » ; autre « Une erreur est survenue. ». Rien n'est écrit en cas d'échec.
9. Parcours IHM : e2e de bout en bout à l'écran (ressource saisit, enregistre, soumet ; chef valide ; ressource voit « Validée » et la lecture seule dans sa Feuille de temps) ; idem rejet (ressource voit « Feuille rejetée : <commentaire> » et peut de nouveau saisir). Parcours complet étendu à la clôture du lot 4.
10. Précisions (relecture des tests, claude.ai). (a) Apostrophe typographique ’ dans tous les textes de l’écran (« Vous n’avez pas le droit d’agir sur cette feuille. »), comme en 4b. (b) Badge de projet selon le statut de la feuille : validé → « <code> · Validé » (success) ; non validé et non `peut_valider` → « <code> · Non autorisé » (neutre) ; feuille soumise, `peut_valider`, non validé → « <code> · À valider » (info) ; brouillon ou rejetée, `peut_valider`, non validé → « <code> » (neutre, sans suffixe). Signature `badgeProjet(projet, statutFeuille)`, `badgesProjets(feuille)`. (c) Ressource sans rôle chef ni administrateur qui ouvre `/validation` : « Accès réservé aux chefs de projet et aux administrateurs. », aucun appel à /api/validations.

## 8. Sauvegarde et restauration

- Hors application, par scripts shell livrés dans `scripts/` :
  - `backup.sh` : `pg_dump` au format personnalisé, fichier horodaté.
  - `restore.sh <fichier>` : `pg_restore` dans une base vide, après confirmation.
- Une table `schema_version` porte la version du schéma. Au démarrage, l'application applique les migrations manquantes et refuse de démarrer si la base est plus récente qu'elle. Chaque migration s'exécute dans sa propre transaction ; une migration en échec arrête le démarrage, les précédentes restent appliquées.
- La restauration n'accepte que des sauvegardes produites par cet outil. Une sauvegarde est reconnue par la présence de la table `schema_version` ; sinon la restauration est refusée.

### Installation et déploiement (D-138)

- Production : `npm run build` (web par vite, API par tsc vers dist), `npm start` (node sur l'API compilée). L'API sert le web compilé et renvoie index.html pour toute route hors /api ; une route /api inconnue reste 404 JSON. Port `PORT`, défaut 8080.
- Compte initial : au démarrage, table utilisateur vide → administrateur admin/admin créé quel que soit `NODE_ENV`, sauf `INITIAL_ADMIN=0`. Tant que ce compte garde le mot de passe d'origine, la session le signale (sans exposer de hash) et l'écran affiche à l'administrateur le bandeau non bloquant « Le mot de passe de l'administrateur est celui d'origine : changez-le. ».
- Docker : Dockerfile multi-étapes (image d'exécution node:22, utilisateur non root) ; docker-compose.yml avec `app` et `db` (postgres:18), volume nommé, healthcheck de la base, `app` attend `db` sain, port 8080, variables dans `.env` (modèle `.env.production.example`). Migrations appliquées au démarrage.
- Manuel : `docs/installation.md`, lié depuis README.md.

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

Lot 3 : tranches 3a à 3g (D-065).

Lot 4 : tranches 4a à 4c (D-118).

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
  l'écran « Modèles ».
- Droits : l'administrateur crée, modifie et supprime les modèles. Le chef
  de projet les lit et crée des projets à partir d'eux.
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
  et l'écran « Modèles » (depuis le Gantt : lot 3).
- Depuis le Gantt du projet : bouton « Copier » (3f-2).
- Dialogue : nom, code, date de début, options « inclure les sous-projets »
  (défaut oui), « copier les affectations et assignations » (défaut oui).
- Copié : sous-projets, activités, jalons, arborescence et ordre WBS,
  modes, priorités, durées validées, dépendances (type et délai),
  et selon l'option : affectations projet et assignations (taux, charge
  assignée).
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

### 11.3 Variantes

- « Créer depuis un modèle » : copie d'un modèle, avec `est_modele` faux.
- « Enregistrer comme modèle » : copie d'un projet, avec `est_modele` vrai.
- Créer depuis un modèle : administrateur et chef de projet. Enregistrer
  comme modèle : administrateur seul.
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
