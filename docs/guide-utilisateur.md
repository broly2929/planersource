# Guide utilisateur

Chaque règle de ce guide est reprise de `SPEC.md`, avec le renvoi entre parenthèses. En cas d'écart, la spec prime.

## 1. Rôles

- Administrateur : tout, dont les utilisateurs, les calendriers et les paramètres (§2).
- Chef de projet : crée et modifie ses projets, activités, jalons et affectations ; lance le calcul ; valide les imputations de ses projets (§2).
- Ressource : « Mes tâches » et sa feuille de temps ; aucun accès aux projets (§2). Son menu se réduit à « Mes tâches » et « Imputations » ; les écrans de projets redirigent vers « Mes tâches » (§3, écran « Mes tâches »).
- Un utilisateur peut être ressource (planifiable) ou non (§2).
- Un chef de projet écrit sur ses projets, ceux dont il est chef ou dont l'un des ancêtres a pour chef ; ailleurs il lit seulement (§2).
- Le calcul est réservé à l'administrateur et au chef de projet, sur les projets où ils écrivent (§2).

## 2. Projets

- Un projet a un nom, un code, un parent facultatif (sous-projet), une priorité (500 par défaut, plus petit = plus prioritaire), un chef de projet et une date de début (§3).
- Le code est unique, sans tenir compte de la casse (§3).
- Le code est le libellé court du projet dans « Mes tâches » (colonne « Projet », le nom en `title`, §3), dans la colonne « Projet » de la feuille de temps (§7, écran Feuille de temps, point 3) et dans le dialogue « Calculer le planning » (« <code> — <nom> », §6, Calcul, point 5).
- Le code sert aussi de clé de tri : dans la liste des projets, les frères sont triés par code, sans tenir compte de la casse (§3, arborescence de l'écran Projets) ; dans le Plan de charge, les projets d'une ressource sont triés par code (§7, Plan de charge, point 5).
- La date de début du projet (« Pas avant le » pour un projet ordinaire) entre dans la date de début au plus tôt de ses éléments, avec la date de début du calcul et les dépendances (§3, formulaire projet ; §5.3).
- Un modèle est un projet dont `est_modele` est vrai ; il n'est jamais planifié, n'accepte aucune imputation et n'apparaît que dans l'onglet « Modèles » de l'écran Projets (§11.1 ; onglets, D-247). La date de début d'un modèle est obligatoire : c'est la référence du décalage à la copie (§6, Retouches REX-6, point 1 ; §11.2).

## 3. Activités et modes

- Une activité a un mode de planification (ASAP par défaut), une priorité, un début validé, une fin validée et une durée validée en jours ouvrés (§3).
- Les dates validées sont saisies à la main. Le début planifié et la fin planifiée sont calculées : elles s'affichent en lecture seule dans le dialogue, « — » avant tout calcul (§6, Retouches REX-6, point 3).
- La fin validée n'est pas antérieure au début validé ; la durée validée vaut au moins 1 (§3).
- Une activité parente ignore son mode et ses dates validées : ses dates sont celles de ses enfants (§5.6, §5.8).
- Champs utilisés par chaque mode : le dialogue n'affiche que les champs que le mode utilise, et les met à jour dès que le mode change (§6, Charge lisible, point 1).

| Mode | Début validé | Fin validée | Durée validée | Règle (§5.6 ; MAN : §5.6 et §3, saisie manuelle) |
|---|---|---|---|---|
| ASAP, dès que possible | non | non | oui | Remplit chaque jour ouvré à partir de la date de début au plus tôt. |
| START, pas avant une date | oui | non | oui | Comme ASAP, sans commencer avant le début validé. |
| STARR, démarrage imposé | oui | non | oui | Comme START, traité avant les autres pour réserver la capacité à sa date ; drapeau `debut_non_respecte` si le début planifié est postérieur. |
| ALAP, fin visée | non | oui | oui | Rempli à rebours depuis la fin validée ; si cela ne tient pas, planifié en ASAP avec le drapeau `retard`. |
| FDUR, durée fixe | oui | non | oui | Fenêtre de N jours ouvrés ; le reliquat est planifié ensuite avec le drapeau `retard`. |
| DDUR, durée imposée | oui | non | oui | Même fenêtre ; la durée est toujours respectée, quitte à dépasser la disponibilité (`surcharge`). |
| REGUL, régulier entre deux dates | oui | oui | non | Charge répartie également sur chaque jour ouvré entre les deux dates. |
| MAN, planning manuel | non | non | non | Le chef de projet saisit la charge par ressource et par demi-journée ; le moteur ne déplace ni ne supprime ces saisies. |

- La durée validée sert aussi, dans les modes ASAP, START, STARR et ALAP, à la barre d'une activité sans ressource assignée : c'est l'aide affichée sous le champ (« Utilisée seulement sans ressource assignée : longueur de la barre. », §6, Charge lisible, point 1 ; §5.4).
- Unités et aides : les durées, charges et délais s'affichent avec « (j) » (« Durée validée (j) », « Charge vendue (j) », « Charge assignée (j) », « Délai (j) », « Total du mois (j) »). Sous chaque champ modifiable, une ligne dit l'effet sur le planning : « Effet sur le planning : oui (jours ouvrés). » (durée validée en FDUR et DDUR, délai d'une dépendance), « Effet sur le planning : seulement sans ressource assignée (longueur de la barre, jours ouvrés). » (durée validée en ASAP, START, STARR et ALAP ; remplace l'aide citée ci-dessus), « Effet sur le planning : non (sert à la marge). » (charge vendue), « Effet sur le planning : oui. » (charge assignée d'une assignation). La charge assignée et la marge du dialogue d'une activité, en lecture seule, n'ont pas d'aide (§6, Charge lisible, point 5).
- Un dialogue et son voile passent au-dessus de tout le Gantt, en-tête collant des colonnes compris (§6, Charge lisible, point 6).
- START, STARR et REGUL exigent leurs dates validées ; sans elles, le calcul est refusé pour une activité feuille ouverte (§5.6).
- Les valeurs de charge assignée et de marge sont lues à l'ouverture du dialogue : rouvrez-le après une assignation pour les voir à jour (§6, Charge lisible, point 2).
- Un champ masqué par le mode n'est pas envoyé : sa valeur reste en base et réapparaît si le mode y revient (§6, Charge lisible, point 1).
- À la création d'une activité, le dialogue propose « Mode de planification » (ASAP par défaut) et les mêmes champs ; la durée par défaut est celle de l'API (§6, Charge lisible, point 1).
- Activité parente : les dialogues de création et de modification d'une activité et d'un jalon proposent « Activité parente » : « Aucune (racine) », puis les activités du projet en ordre WBS, sans l'élément ni ses descendants. À la création, l'élément est placé en dernier de sa fratrie ; « Ajouter une sous-activité » préremplit le parent (§6, Saisie des activités, point 1).
- Changer le parent d'une activité ou d'un jalon, à la modification, le déplace en dernier de la nouvelle fratrie avant l'enregistrement des champs. Si le déplacement est refusé (par exemple activité assignée comme parent, ou dépendance avec un ancêtre), rien n'est enregistré et le motif s'affiche dans le dialogue ; si seul l'enregistrement des champs échoue après un déplacement réussi, le message l'indique (§6, Saisie des activités, point 1 ; §6, Édition, point 12).
- Dépendances : le dialogue de modification d'une activité, feuille ou parente, a les sous-sections « Prédécesseurs » et « Successeurs » (ajout, modification du type et du délai, suppression). Chaque action est enregistrée tout de suite ; « Enregistrer » ne porte que sur les champs de l'activité. Les éléments proposés sont les activités et jalons du projet, sauf l'activité, ses ancêtres et ses descendants ; doublon, cycle et lien avec un ancêtre sont refusés avec un message dans le dialogue (§6, Saisie des activités, point 2 ; §3). Pas de dépendances dans le dialogue de création ni dans celui d'un jalon.
- Une activité parente n'affiche ni mode, ni début validé, ni fin validée, ni durée validée ; ces valeurs restent en base. Ses dates planifiées restent en lecture seule (§6, Saisie des activités, point 3 ; §5.6).
- Les barres ASAP et MAN ne se déplacent pas à la souris (§6, Affichage).
- Une activité close n'est pas replanifiée (§5.1).

## 4. Charges et taux

- La charge est portée par les assignations : chaque assignation lie une activité à une ressource, avec un taux (100 % par défaut), une charge assignée, une charge réelle et un reste à faire (§3).
- La charge d'une activité est la somme des charges assignées de ses ressources : le dialogue de l'activité l'affiche en lecture seule, « Charge assignée (somme des ressources) », en « X j » (§6, Charge lisible, point 2 ; §5.8).
- La marge est la charge vendue moins la charge assignée ; elle est vide si la charge vendue est vide, et s'affiche en couleur d'alerte si elle est négative. Elle n'est visible que pour qui écrit sur le projet (§3, Charge vendue et date client ; §6, Charge lisible, point 2).
- Une charge n'est jamais négative. Tant que la charge réelle vaut 0, modifier la charge assignée recale le reste à faire sur la charge assignée (§3).
- Deux plafonds limitent le travail posé (§4) :
  - Plafond d'assignation, par jour : taux de l'assignation × capacité de la ressource. Aide du champ « Taux (%) » d'une assignation : « Plafond par jour sur cette activité : taux × capacité de la ressource. » (§6, Charge lisible, point 3).
  - Plafond de projet, par semaine ISO : taux d'affectation au projet × capacité × nombre de jours ouvrés de la semaine ; les sous-projets comptent dans le projet racine. Aide du champ « Taux (%) » d'une affectation : « Plafond par semaine sur ce projet : taux × capacité × jours ouvrés. » (§6, Charge lisible, point 3).
- Sur un jour donné, la charge posée est le minimum de : la cible du mode, le reste à faire, la disponibilité, le plafond d'assignation et le reliquat du plafond de projet pour la semaine (§5.4).
- Modes qui ignorent les plafonds :
  - DDUR : les plafonds d'assignation et de projet, ainsi que les dates d'affectation, sont ignorés ; son travail posé consomme tout de même le plafond des activités traitées ensuite (§5.6, §4).
  - MAN : jamais limité ; ses saisies consomment la disponibilité avant toute autre activité (§5.6, §4).
  - Tous les autres modes suivent la règle commune, les deux plafonds compris (§4).
- Hors des dates de l'affectation au projet, la ressource n'est pas planifiable sur ce projet (§4).

## 5. Calcul

- Le bouton « Calculer » ouvre un dialogue : projets racines à calculer (ceux où vous écrivez, hors modèles et hors projets clos) et « Date de début du calcul » (§6, Calcul, point 5).
- Le calcul planifie le seul reste à faire, à partir de la date de début du calcul ; le travail réel n'est jamais déplacé (§5.1).
- Le calcul produit le travail planifié, les dates planifiées et les drapeaux (§5.1). Les dates validées sont des contraintes saisies : elles ne font pas partie des sorties du calcul (§5.1) et chaque mode les lit à sa façon (§5.6).
- Un calcul ne modifie que les projets sélectionnés et leurs sous-projets ; le travail des autres projets est pris comme déjà consommé dans la disponibilité (§5.1).
- Ordre de traitement : d'abord les saisies manuelles (MAN) puis les activités REGUL, ensuite le reste en ordre topologique des dépendances ; entre activités prêtes : STARR d'abord, puis priorité du projet, priorité de l'activité, ordre WBS (§5.2).
- Dépendances (§5.3) : FD, le successeur commence au plus tôt le jour ouvré suivant la fin du prédécesseur ; DD, au plus tôt au début du prédécesseur ; FF, il finit à la fin du prédécesseur. Le délai est en jours ouvrés. Une dépendance vers une activité REGUL ou MAN n'en déplace pas les dates : elle lève `dependance_non_respectee` si elle n'est pas respectée.
- Drapeaux (§5.9) : `retard`, `debut_non_respecte`, `surcharge`, `dependance_non_respectee`.
- Un cycle de dépendances est refusé : « Calcul impossible : cycle de dépendances entre <noms>. » (§6, Calcul, point 8).
- Un reste à faire qui ne peut pas être posé donne un avertissement, sans drapeau (§5.9 ; §6, Calcul, point 7).
- Le calcul peut aussi se déclencher automatiquement après chaque modification, si la case « Recalcul automatique » est cochée ; elle est décochée par défaut (§6, Édition, point 7).

## 6. Imputations et validation

- L'entrée « Imputations » du menu ouvre un écran à onglets : « Feuille de temps » (ressource ou administrateur) et « Validation » (administrateur, chef de projet). Sans droit sur l'un des deux, il n'y a pas de liste d'onglets : l'écran de l'autre s'affiche seul. La semaine choisie est gardée quand on change d'onglet (SPEC, onglets, D-247, point 2). Il n'y a plus d'entrée de menu « Validation » ni « Modèles » : les modèles sont l'onglet « Modèles » de l'écran Projets, ouvert par l'adresse `/projets?onglet=modeles` ; les anciennes adresses `/modeles` et `/validation` y redirigent.
- La ressource saisit sa charge réelle par jour dans sa feuille de temps, semaine par semaine (§7, écran Feuille de temps). Un jour futur ne peut pas être imputé (§7, écran Feuille de temps, point 6).
- Le réel compte dès l'enregistrement : le calcul prend toutes les imputations des assignations des projets calculés, quel que soit le statut de la feuille (§7, API et règles, point 9) ; le Plan de charge compte de même le réel de tout statut (§7, Plan de charge, point 3).
- Cycle de la feuille : brouillon, soumise, validée ou rejetée (§3, §7, API et règles, point 7). La ressource soumet, puis rappelle sa feuille tant qu'aucune validation n'existe.
- La validation verrouille la feuille : soumise ou validée, elle n'est plus modifiable (§7, écran Feuille de temps, point 6). Elle trace l'accord : la feuille garde son statut, son validateur et la date (§3).
- La validation n'a aucun effet sur les chiffres : réel, planifié et avancement ne changent pas (§7, API et règles, point 9 ; Plan de charge, point 3). Le planifié reste celui du dernier calcul (§7, Plan de charge, point 3).
- Le validateur valide les projets concernés sur lesquels il écrit ; la feuille est validée quand tous le sont. Il peut aussi rejeter la feuille avec un commentaire (§7, API et règles, point 7).
- Saisie pour autrui : l'administrateur peut saisir, soumettre et rappeler la feuille d'une ressource (§7, Saisie pour autrui).
- L'avancement d'une activité est le réel ÷ (réel + reste à faire) (§5.8).

## 7. Pilotage : plan de charge et coûts

- Écran « Pilotage » (entrée de menu qui remplace « Plan de charge ») : administrateur et chef de projet ; la ressource n'y a pas accès (§7, Plan de charge, point 6 ; §12.5, point 1). Deux onglets, « Plan de charge » et « Coûts » ; l'adresse est `/pilotage?onglet=charge|couts&debut=AAAA-MM&equipe=…`, l'ancienne adresse `/plan-de-charge` y redirige. Les filtres « Mois de départ » et « Équipe » sont communs aux deux onglets et conservés quand on change d'onglet.
- Onglet « Coûts » (§12.5, points 2 à 5 et 8) : une ligne par projet (« <code> · <nom> », OTP effectif dessous), repliée ; « Déplier <code> » montre ses ressources (« (inactif) » si inactive). 12 colonnes « MM/AAAA », puis « Total », puis une ligne « Total ». Chaque cellule affiche le coût du mois (« 1 234,50 € ») ; l'infobulle donne « Réel … , planifié … ». La marque « incomplet » (infobulle « Taux manquant ») signale une charge tombée hors de toute période de taux d'une ressource qui a des taux. Le chef de projet ne voit que les projets sur lesquels il écrit. « Exporter CSV » télécharge `couts-AAAA-MM.csv` avec les filtres courants. Sans projet ayant une charge sur la période : « Aucun coût sur la période. ». Le coût mensuel peut différer du « Coût réel » du Gantt, qui valorise le reste à faire au taux du jour.
- Tableau en lecture seule : une ligne par ressource, 12 colonnes mensuelles à partir du « Mois de départ » ; filtre « Équipe » (« Toutes », « Sans équipe », équipes par nom) (§7, Plan de charge, points 6 et 7).
- Charge = réel + planifié du mois. Disponible = jours ouvrés du mois × capacité ; les dates et taux d'affectation sont ignorés. Écart = disponible − charge, négatif possible (§7, Plan de charge, point 3).
- Un écart négatif est signalé en couleur d'alerte et par le texte « , surcharge » pour les lecteurs d'écran (§7, Plan de charge, point 7).
- En dépliant une ressource : ses projets avec une charge non nulle, triés par code (§7, Plan de charge, points 5 et 7).
- « Exporter CSV » télécharge `plan-de-charge-AAAA-MM.csv` avec les filtres courants : colonnes Ressource, Équipe, Ligne, puis les 12 mois (MM/AAAA, ceux de l'écran). Par ressource : une ligne « Charge », une ligne « Disponible », une ligne « Écart » (négatif possible), puis une ligne par projet (« <code> · <nom> » ou « Autres projets », charge du projet). Réel et Planifié ne sont pas exportés ; ils restent dans l'infobulle des cellules (§7, Exports CSV, point 3 ; D-241).

## 8. Gantt

- Affichage : arborescence WBS à gauche, barres à droite, jalons en losange, liens en flèches, trait vertical à la date du jour ; zoom jour, semaine, mois (§6, Affichage).
- Gestes à la souris : glisser une barre, poignées gauche et droite, glisser d'une barre à une autre pour créer une dépendance FD de délai 0, clic sur un lien, glisser une ligne pour changer l'ordre WBS ou le parent (§6, Affichage).
  - Glisser une barre modifie le début validé (START, STARR, FDUR, DDUR) ou décale la fenêtre entière (REGUL) ; la poignée droite modifie la fin validée (ALAP, REGUL) ou la durée validée (FDUR, DDUR) ; la poignée gauche modifie le début validé (REGUL) (§6, Affichage).
  - Non déplaçables : ASAP, MAN, jalons, parents, activités closes, projet non modifiable (§6, Édition, point 4).
- Après un geste sans recalcul, la barre garde un contour à la date validée et le bandeau « Planning à recalculer » s'affiche (§6, Édition, point 4).
- Double-clic ou Entrée sur une barre : « Modifier l'activité » ou « Modifier le jalon », pour qui écrit (§6, Édition, point 9).
- Menu contextuel : créer une activité, un jalon, une sous-activité (§6, Affichage).
- Tableau : colonnes au choix par le menu « Colonnes », largeurs réglables, mémorisées dans le navigateur par vue ; « Rétablir l'affichage par défaut » (§6, Colonnes et défilement). Colonnes affichées au départ (D-227, D-238) : Gantt d'un projet WBS, Nom, Début, Fin, Ressources ; Accueil Code, Nom, Début, Fin, Ressources ; planning d'une ressource Projet, Activité, Début, Fin. Les autres, Drapeaux comprise, se cochent par le menu. Votre choix est gardé dans le navigateur : il survit au rechargement, au passage par un autre écran et, pour le Gantt d'un projet, au changement de projet.
- Colonne « Ressources » (Gantt d'un projet et Accueil, lignes d'activités sans sous-activité) : une entrée par assignation, séparées par une virgule : les initiales de la ressource, ou son nom si elle n'en a pas. L'infobulle donne « nom — charge j ». Si vous écrivez sur le projet, chaque entrée est un bouton « Modifier l'assignation de <ressource> à <activité> » : il ouvre le dialogue « Modifier l'assignation » du Planning (charge et taux préremplis). Après l'enregistrement, le Gantt est rechargé et le bandeau « Planning à recalculer » s'affiche, sauf si « Recalcul automatique » est cochée ; sur l'Accueil, l'écran est rechargé. Sans droit d'écriture, les entrées restent du texte avec infobulle. Toutes colonnes cochées, le tableau peut défiler horizontalement dans sa zone (§6, Colonne Ressources, D-238).
- L'Accueil affiche le Gantt global ; les projets y sont dépliés et les initiales affichées par défaut (§6, Accueil ; Retouches REX-6, point 4).

## 9. Coûts : taux journalier, OTP, calcul et export

- Le taux journalier d'une ressource est facultatif ; seule une ressource en a. Il se saisit par période : « Du » obligatoire, « Au » facultatif (vide = période ouverte), montant en euros supérieur à 0, au plus 999 999,99, deux décimales au plus (§12.1, points 1 et 2).
- Les périodes d'une ressource ne se chevauchent pas, bornes comprises : une période qui finit le 10 et une autre qui commence le 10 se chevauchent. Les trous entre périodes sont permis (§12.1, point 3).
- Le taux en vigueur à une date est celui de la période qui contient cette date (§12.1, point 4).
- L'administrateur saisit les taux (le chef de projet, ceux des ressources de ses projets, voir plus bas), dans le dialogue « Modifier <nom> » d'une ressource, section « Taux journaliers » : ajout, modification et suppression sont enregistrés tout de suite ; « Enregistrer » ne porte que sur les champs de l'utilisateur. Un chevauchement est refusé : « Cette période chevauche un autre taux. » (§12.1, points 7 et 9).
- Une ressource qui a des taux reste ressource : décocher « Ressource planifiable » est refusé tant qu'elle a un taux (§12.1, point 8).
- L'onglet « Affectations » d'un projet montre, à qui écrit sur le projet, la colonne « Taux du jour » : le taux résolu à la date du jour, « 600,00 € » (taux propre), « 400,00 € (équipe) » (taux de l'équipe), « — » sans taux (§12.6, point 12 c). Elle est lue par une seule requête pour toutes les ressources.
- Taux d'équipe : une équipe a ses propres périodes de taux (mêmes règles que pour une ressource). L'administrateur les saisit dans l'onglet « Équipes » de l'écran Utilisateurs, bouton « Taux de <nom> » (dialogue « Taux de l'équipe <nom> », bouton « Fermer »). Une équipe qui a des taux ne peut pas être supprimée : « Cette équipe a des taux : supprimez-les d'abord. » (§12.6, points 1, 7 et 12 b).
- Héritage : une ressource sans taux propre à une date prend le taux de son équipe actuelle à cette date ; son taux propre prime toujours. L'appartenance à une équipe n'est pas historisée : changer d'équipe change le taux de toutes les dates, passées comprises (§12.6, point 3).
- Saisie par le chef de projet : sur un projet qu'il écrit, le chef ouvre « Modifier les taux de <nom> » (onglet « Affectations », dialogue « Taux de <nom> ») et gère les taux propres des ressources affectées ; dans un projet qu'il lit seulement, ni colonne ni bouton (§12.6, points 6 et 12 c). Les taux d'équipe restent à l'administrateur.
- Liste des utilisateurs (administrateur) : colonne « Taux du jour » après « Équipe », même format ; « — » pour un non-ressource. Elle est relue après l'enregistrement d'un taux dans « Modifier <nom> » et au retour sur l'onglet « Utilisateurs » (§12.6, point 12 d).
- L'OTP est un champ facultatif d'un projet, d'un modèle et d'une activité (pas d'un jalon), de 50 caractères au plus ; la même valeur peut servir à plusieurs éléments (§12.2, point 1).
- Sans valeur propre, un élément hérite de l'OTP de l'ancêtre le plus proche qui en a un : activité parente, puis projet, puis projet parent. Une valeur propre prime toujours (§12.2, point 2).
- Le champ « OTP » des dialogues indique la valeur héritée : « Hérité de <code du projet ou WBS et nom de l'activité> : <valeur> », ou « Hérité d'un projet parent : <valeur> » si ce projet ne vous est pas visible (§12.2, points 4 et 7).
- La copie d'un projet, la création depuis un modèle et l'enregistrement comme modèle copient l'OTP propre (§11.2, §12.2 point 8).
- Les coûts sont calculés à la lecture, rien n'est stocké (§12.3, point 5). Un coût vaut une charge en jours (décimales comprises) multipliée par le taux journalier en vigueur : 0,5 j à 600 € donne 300 € (§12.3, point 1).
- Coût planifié = charge assignée × taux du jour. Coût imputé = chaque imputation × le taux en vigueur à sa date. Coût réel = coût imputé + reste à faire × taux du jour. La « date du jour » est celle du serveur (§12.3, points 2 et 3).
- Une activité parente additionne ses descendantes ; le projet additionne ses activités feuilles, sans les sous-projets, activités closes comprises (§12.3, point 4).
- Une ressource sans aucun taux coûte 0, sans avertissement. Une ressource qui a des taux mais pas à la date voulue (imputation ou jour même) compte 0 pour cette part, et l'activité, ses parents et le projet portent la marque « incomplet » (info-bulle « Taux manquant ») (§12.3, point 6).
- Les coûts ne sont visibles que de qui écrit sur le projet (administrateur, chef du projet ou d'un projet parent). Les autres ne reçoivent pas ces données (§12.3, point 7). La colonne « OTP » (valeur héritée comprise) est visible de tout lecteur de l'élément.
- Colonnes au choix du menu « Colonnes », masquées par défaut : « OTP », « Coût planifié » et « Coût réel » dans le Gantt d'un projet et sur l'Accueil (lignes d'activités seulement ; lignes de projet vides). Les montants s'écrivent « 1 234,50 € » (§12.4, point 1).
- La région « Totaux du projet » ajoute « Coût planifié » et « Coût réel » (§12.4, point 2).
- « Exporter les coûts » (au bout de la région « Totaux du projet » du Gantt d'un projet, pour qui écrit sur le projet) télécharge `couts-<code>-AAAA-MM-JJ.csv` : une ligne par activité dans l'ordre WBS, puis une ligne « Total » ; colonnes WBS, Activité, OTP, Charge assignée, Charge réelle, Reste, Coût planifié, Coût imputé, Coût réel, Taux manquant (« oui » ou « non »). La charge vendue n'est jamais exportée (§12.4, point 3 ; §7).

## 10. Version de l'application

- La version et le commit sont lus en bas de la barre latérale, pour tous les rôles : « v1.0.0 · abc1234 » (SPEC §13).
- Quand l'application est mise à jour pendant que la page est ouverte, un bandeau « Nouvelle version disponible » apparaît en haut de la page. Il ne bloque rien : « Recharger » charge la nouvelle version.
- Si la page contient des modifications non enregistrées (Feuille de temps, Planning manuel), « Recharger » demande d'abord de confirmer (« Abandonner les modifications ? »).

## 11. Changement de mot de passe

- Tout utilisateur change son mot de passe : bouton « Changer mon mot de passe » dans le pied de la barre latérale, sous son nom. Le dialogue demande le mot de passe actuel, le nouveau et sa confirmation ; le nouveau doit différer de l'actuel, sans autre contrainte. À la réussite, une notification « Mot de passe changé. » s'affiche et les sessions ouvertes ailleurs avec ce compte sont fermées (SPEC §8).
- L'administrateur peut exiger ce changement : case « Doit changer son mot de passe à la prochaine connexion » dans « Nouvel utilisateur » et « Modifier <nom> ». Tant que la case est cochée, la personne ne voit que la page « Changez votre mot de passe » (sans menu), même si sa session était déjà ouverte ; « Se déconnecter » reste possible. Après le changement, la case est décochée et l'application s'ouvre normalement.
- Fixer un mot de passe dans « Modifier <nom> » ne coche pas la case.
