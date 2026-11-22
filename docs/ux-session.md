## Session UX de fin de lot 3 (BLOQUANTE pour la clôture du lot 3)
- Prérequis : le porteur devant l'écran, appli lancée en local avec le jeu de démonstration.
- Revue par le porteur des 8 captures `e2e/captures/gantt-{jour,semaine,mois,non-calcule}-{1440,1024}.png` (7 n'ont été vues que par @ui-designer).
- À trancher : colonne Drapeaux tronquée (« Surcharge » invisible ailleurs) ; SVG plus étroit que son conteneur à 1440 px ; constantes de géométrie px hors jetons CSS (`echelle.ts`, `liens.ts`) ; 4 choix de @ui-designer (retard prime sur gris, date du jalon en Début et Fin, bandeau « non calculé » avec SVG, onglet retiré de l'adresse) ; clôture de jalon, besoin ou non (modèle de données, hors 3b).
  - Colonne Drapeaux tronquée : traité avant la séance, D-069.
  - SVG plus étroit que son conteneur à 1440 px : traité avant la séance, D-069.
- Parcours manuel : clavier seul, lecteur d'écran sur le SVG (dont jalon en retard, D-068), changement d'échelle, 1024 px.
- Sortie : liste de décisions D-xxx et de tickets, chacun traité ensuite en TDD.
- Règle : aucun lot suivant ne modifie ces points avant la séance. Les lots 3c et suivants ajoutent ici leurs propres points à revoir.
- Captures à revoir à la séance UX : elles sont maintenant rendues en DejaVu Sans (police de repli de la CI et de la VM), D-086.
- Points ajoutés par le cadrage de 3d (D-088) : raccourci Alt + flèches ; annulation d'un geste (Ctrl+Z) ; recalcul automatique déclenché depuis l'onglet Planning.
- Points ajoutés par le cadrage de 3d-3b (D-098) : les poignées sont invisibles au repos (visibles au survol, curseur seul) ; corps d'une barre REGUL dont les dates planifiées diffèrent des dates validées : le contour suit la position relâchée, le PATCH écrit les dates validées décalées.
- Connecteur de lien transparent au repos (visible au survol et sur la barre active) ; cible = ligne entière (D-104).
- Points ajoutés par 3f-1 (D-110 (2)) : trait d'insertion de 2 px, `opacity-50` (ligne source pendant le glissement, `Table.tsx`) et `opacity-40` (poignée de la ligne, `GanttProjet.tsx`), valeurs en dur ; à revoir avec les constantes en px déjà listées (`echelle.ts`, `liens.ts`).

## Captures de 3f-2
Produites par `e2e/tests/lot3f2-captures.spec.ts` (E2E-209), à 1440 et 1024 px (suffixe `-1440` ou `-1024`), dans `e2e/captures/` (non suivi par git) :
- `e2e/captures/menu-gantt-tableau-{1440,1024}.png` : menu contextuel ouvert sur la ligne « Phase P » du tableau.
- `e2e/captures/menu-gantt-svg-{1440,1024}.png` : menu ouvert sur la barre de « Tâche Q » dans le SVG.
- `e2e/captures/ux-barre-outils-copier-{…}.png` : barre d'outils avec « Copier » (focalisé).
- `e2e/captures/ux-recalcul-automatique-coche-{…}.png` : case « Recalcul automatique » cochée.
- `e2e/captures/ux-poignees-barre-fdur-{…}.png` : poignée droite d'une barre FDUR (survol), zoom jour.
- `e2e/captures/ux-anneau-barre-active-{…}.png` : anneau de la barre active.
- `e2e/captures/ux-connecteur-lien-visible-{…}.png` : connecteur de lien (barre active, survol).
- `e2e/captures/ux-poignee-ligne-survol-{…}.png` : poignée de ligne du tableau au survol.
- `e2e/captures/ux-glisser-dans-{…}.png`, `ux-glisser-avant-{…}.png`, `ux-glisser-apres-{…}.png` : indicateurs d'insertion pendant un glisser de ligne.
- `e2e/captures/ux-contour-pointille-geste-{…}.png` : contour pointillé après un geste (recalcul automatique décoché).
- Constat de la revue : en-tête « Avancement » tronqué (« Avancemen ») à 1440 et 1024 px, déjà présent avant 3f-2.
- Constats de la relecture à l'image des captures E2E-209 (sans retouche du code de l'application) :
  - Glisser de ligne : le contour de focus de la région « Tableau du Gantt » reste affiché pendant le glisser (poignée cliquée) et se superpose au trait d'insertion « avant » (bord haut de la ligne 1) ; à 1440 px et 1024 px.
  - Ligne source du glisser (`opacity-50`) : le voile n'est pas uniforme, les cellules Début, Fin, Charge, Avancement paraissent plus claires que WBS, Nom et Drapeaux (la colonne Drapeaux, figée, garde son fond) ; même écart au survol de la ligne.
  - Connecteur de lien : au repos d'une barre active, le connecteur survolé et non survolé sont identiques (captures `ux-anneau-barre-active-*` et `ux-connecteur-lien-visible-*` identiques à l'octet) ; le survol ne change rien de visible.
  - Poignée de barre : à 1440 px elle est hors de la zone visible du SVG (largeur du SVG réduite à ~390 px, barre FDUR coupée) ; la capture défile maintenant le calendrier pour la montrer.
  - Barre d'outils : « Copier » porte bien le contour de focus clavier (capture refaite par Tab, le focus programmatique ne l'affichait pas).

## Points de recette de 3g
- Jour rouge de surcharge : opacité 70 %, barre lisible dessous, aux trois zooms.
- Annonce de la barre active : « , jours en surcharge : … » (5 jours puis « et N autres »).
- Clavier du Planning manuel : un seul arrêt de tabulation (Tab), flèches, Début, Fin, Espace ; case courante conservée après Enregistrer et Annuler.
- Dialogue « Calculer » : le chef d'un sous-projet a sa case ; recalcul automatique du chef d'un sous-projet (pas de 403).

## Captures de 4b
- Constats de la relecture à l'image des captures `e2e/captures/feuille-temps-*.png` (1440 et 1024 px), après retouche d'apparence :
  - 1024 px : le tableau déborde (colonnes vendredi à « Reste à faire » hors vue) ; défilement horizontal interne, « Reste à faire » et les saisies du week-end ne sont visibles qu'en défilant.
  - 1440 et 1024 px : la barre d'outils passe sur deux lignes (libellé de semaine, statut et actions sous les boutons de navigation) ; à 1440 px les actions sont seules à droite de la 2e ligne, sans lien visuel avec le statut.
  - Message d'erreur d'une case : 4 lignes de texte étroit (`max-w-32`) qui agrandissent la ligne et décalent les colonnes ; le message touche presque la ligne suivante.
  - Colonnes de jour de largeur inégale selon le contenu des en-têtes (tableau en mise en page automatique).
  - Statut « Brouillon » : badge neutre peu contrasté face aux autres statuts ; boutons désactivés (Enregistrer, Soumettre) à contraste faible, volontaire (état désactivé).

## Captures de REX-3a
- Relecture à l'image de `e2e/captures/rex3a-{planning,dialogue,gantt,manuel}-{1440,1024}.png`, sans correction.
- rex3a-gantt-1024 : colonnes Début, Fin, Charge, Avancement tronquées (« D » visible seul, valeurs réduites à « – ») ; seul le défilement interne les montre.
- rex3a-gantt-1440 : nombre de semaines visibles réduit (S01 à S07), aucune barre (planning non calculé) ; pas de défaut de mise en page.
- rex3a-planning-1024 : la colonne Nom passe à 2 lignes (« Bravo / 255 »), lignes plus hautes ; la ligne n° 7 est coupée en bas de capture.
- rex3a-planning-1440 : la ligne surlignée (n° 1) est bien visible ; l'ordre des actions n'est pas homogène (n° 7 a une icône de plus, ce qui décale ses colonnes) ; boutons « monter » désactivés très peu contrastés.
- rex3a-planning-1440 : la ligne n° 2 place le bouton d'affectation sous le nom de ressource (retour à la ligne) ; hauteur de ligne inégale.
- rex3a-dialogue-1440 et -1024 : champs de date en format anglais « mm/dd/yyyy » ; case « Close » au libellé non français ; aide du mode lisible mais en petit corps, contraste faible.
- rex3a-manuel-1024 : jours 17 à 31 hors vue (la colonne « Total du mois » s'affiche collée au jour 16, sans défilement apparent) ; 1,5 jour total visible mais saisies du mois incomplètes à l'écran.
- rex3a-manuel-1440 : jours non ouvrés grisés et samedi 9 coché lisibles ; cases grisées du week-end à contraste faible ; boutons Annuler et Enregistrer désactivés très peu contrastés.
- Arbitrage (D-127 (2)) : dates au format anglais et Gantt sans barres venaient du script de capture, corrigés (captures régénérées) ; « Close » est un adjectif français ; contraste des boutons désactivés volontaire.
- Ouverts, à juger par le porteur à la recette de fin de lot 3 (D-127 (2)) : colonnes tronquées du Gantt à 1024 px ; nom sur deux lignes dans l'onglet Planning à 1024 px ; bouton d'affectation renvoyé à la ligne ; jours 17 à 31 du Planning manuel hors vue à 1024 px.

## Séance tenue (REX-3, D-123)
- Séance UX de fin de lot 3 tenue avec le porteur le 2026-11-18 : décisions consignées dans D-123 (8 points). Traitement : REX-3a (points 2, 3, 4, 5, 7, 8) puis REX-3b (points 1, 6), chacun en TDD ; les points de la séance renvoyés à D-123 ne sont plus à trancher.
- Points de recette restants (à voir à l'écran après REX-3) : recalcul automatique ; clavier du Gantt ; menu contextuel et « Copier » ; chefb sur DEMO-S.
- Les points « Captures de 4b » ci-dessus restent ouverts (lot 4b).

## Captures de REX-3b
- Relecture à l'image par @ui-designer de `e2e/captures/rex3b-{gantt,accueil}-{1440,1024}.png` (E2E-278), sans correction. Aucune capture antérieure (E2E-255, 3b) n'était disponible pour comparer : l'attribution à REX-3b est une hypothèse, à confirmer à l'écran par le porteur.
- Gantt 1440 : le nom « SP-278 · Sous-projet 278 » semble toucher le crayon (le crayon est un bouton bordé de 32 px, plus haut que le texte) ; contour bleu épais autour du panneau du diagramme (focus de la zone après le geste à la souris) et double anneau sur la barre de « Tâche 278 » (anneau de barre active et contour pointillé du geste).
- Gantt 1024 : « Annuler » passe seul sur une seconde ligne de la barre d'outils (la barre est en `flex-wrap`, le bouton ajouté la fait déborder) ; colonnes Début, Fin, Charge hors vue et diagramme coupé, sans indication de défilement (comme les défauts de 3b et REX-3a) ; « Planification » tronquée sans points de suspension.
- Accueil 1440 et 1024 : indentations du chevron, du nom et du crayon variables selon la profondeur (le crayon suit le nom) ; fond de la ligne projet qui s'arrête au milieu de « Début » ; colonne Drapeaux vide ; à 1024 px colonne Fin hors vue.
- Focus clavier non visible sur les boutons-noms et les crayons sur ces captures (prises à la souris, pas au clavier) : à vérifier au clavier.
- Régression possible due à REX-3b, non corrigée faute d'être manifeste : « Annuler » seul sur une ligne à 1024 px ; crayon proche du nom ; fond tronqué de la ligne projet de l'Accueil (probablement antérieur). À arbitrer par claude.ai ; si confirmée, correction en TDD. → Corrigés par REX-3b-r2 (voir ci-dessous).

## REX-3b-r2 (défauts des captures de REX-3b)
- Corrigés : D « Annuler » seul sur une ligne à 1024 px (« Copier » et « Annuler » forment un groupe, E2E-284) ; E crayon proche du nom du sous-projet (`gap-2`, E2E-285) ; F fond tronqué de la ligne projet de l'Accueil (cellule Drapeaux qui suit le survol, E2E-286, D-131).
- Les captures E2E-278 (`e2e/captures/rex3b-{gantt,accueil}-{1440,1024}.png`) servent désormais de référence avant/après.
- Restent ouverts (hors lot) : colonnes Début, Fin, Charge hors vue à 1024 px ; colonne Drapeaux vide à l'Accueil ; focus clavier des boutons-noms et des crayons à vérifier au clavier.
- Relu par @ui-designer après REX-3b-r2 : D, E, F corrigés à l'image, aucune régression. Nouveau point (probablement antérieur, non lié) : en-tête « Charge » coupé (« Charg ») dans le Gantt du projet à 1440 px.

## Défauts ouverts après REX-3b-r3
Analyse sans code, sondes Playwright jetables hors dépôt (mesures `getBoundingClientRect`, Tab réel) ; captures de focus : `/tmp/claude-1000/-home-planersource-planersource/a3ceffaf-37ab-42ba-b3d6-84906082ae22/scratchpad/focus-{gantt,accueil}-*.png`. Corrections non faites : à arbitrer, puis TDD.

### (a) Début, Fin, Charge hors vue à 1024 px (Gantt du projet et Accueil)
- Cause : la zone du tableau est `w-fit max-w-2/3 overflow-x-auto` (`GanttProjet.tsx:819`, `Accueil.tsx:458`) ; sa largeur utile à 1024 px est 499 px. Mesuré : tableau du Gantt de 852 px (WBS 52, Nom 193, Planification 135, Début 97, Fin 97, Charge 72, Avancement 113, Drapeaux 92), tableau de l'Accueil de 569 px. La colonne Drapeaux est `sticky right-0` (`gantt/largeurs.ts`, D-069, D-086) : à `scrollLeft` 0 elle recouvre les colonnes de droite (Gantt : tout de Fin à Avancement ; Accueil : Fin). Aucun repère visuel de défilement.
- Le critère SPEC §6 Affichage 15 ne couvre que WBS, Nom et Drapeaux : les autres colonnes sont atteignables en défilant (région au clavier, E2E-43-r1), ce n'est pas une violation de spec.
- Option 1 : repère de défilement, sans changer les colonnes : bordure gauche `gray-200` et ombre portée (jeton à ajouter à ui.md) sur la cellule Drapeaux figée, pour montrer que le tableau continue dessous. Coût S.
- Option 2 : élargir la zone tableau (`max-w-2/3` vers `max-w-4/5`) et retirer des colonnes à 1024 px (Planification, Avancement masquées sous `xl`). Même à 1024 px il manque encore 100 px (Gantt) ; masquer une colonne change SPEC §6 : décision du porteur. Coût M.
- Recommandée : option 1 (la 2 est reprise en (d) pour 1440 px, la partie masquage est écartée). Coût S.
- Écrans : Gantt du projet, Accueil (cellule et en-tête Drapeaux, un seul endroit : `gantt/largeurs.ts`). Mise à jour de ui.md.
- Risque : faible. Tests sous tag qui mesurent la zone Drapeaux : E2E-41a, 41b, 41c, 41d, 41e (`lot3b-largeurs.spec.ts`, 1440 et 1024), E2E-42, E2E-287 (fond au survol, `rex3b-r2.spec.ts`) ; GEO-10 (`gantt-largeurs.test.ts`) ne teste pas les classes de bordure. Une bordure ou une ombre ne change pas la largeur si elle est en `box-shadow` (pas de `border` : la cellule sticky grossirait de 1 px).

### (b) Colonne Drapeaux vide à l'Accueil
- Cause : pas un défaut de rendu. `Accueil.tsx:352-360` n'affiche la colonne que pour `l.type === 'element'` portant au moins un drapeau ; lignes projet et sous-projet : cellule vide par construction. La capture E2E-278 ne portait aucun drapeau (activité START sans retard, pas de modes en défaut). Sonde : avec une activité « Retard FDUR » calculée, le badge « Retard » s'affiche (1 badge, cellule de 92 px, voir `focus-accueil-Retard_FDUR.png`).
- Écart mineur réel : le Gantt du projet met « — » (`VIDE`) dans les cellules sans drapeau, l'Accueil laisse vide.
- Option 1 : ne rien changer, ajouter un cas drapeau (retard) à la capture E2E-278 pour qu'elle soit représentative. Coût S (test de capture, aucun code de production).
- Option 2 : aligner l'Accueil sur le Gantt (« — » partout, `VIDE` aussi pour les lignes projet). Coût S.
- Recommandée : option 1 ; option 2 seulement si le porteur veut l'homogénéité (révision D-031 à prévoir si un test lit ces cellules vides).
- Écrans : Accueil (capture E2E-278 seule pour l'option 1).
- Risque : option 1 nul. Option 2 : E2E-100-r2, accueil-g2 (ligne 143, titres de colonnes), accueil-g3 et E2E-286 à relire ; aucun test trouvé ne vérifie une cellule Drapeaux vide.

### (c) Focus clavier des boutons-noms et des crayons
- Vérifié au clavier (Tab réel, 1440 px) : aucun défaut. Contour calculé `2px solid rgb(29, 78, 216)` (accent), `:focus-visible` vrai, pour : bouton-nom d'activité (Gantt et Accueil), « Simple », crayon « Modifier le projet Sous-projet S » (Gantt et Accueil), crayon « Modifier le projet Projet SONDE » (Accueil).
- Captures lues à l'image : `focus-accueil-Retard_FDUR.png` (anneau arrondi autour du nom), `focus-accueil-Modifier_le_projet_Projet_SONDE.png` et `focus-gantt-Modifier_le_projet_Sous_projet_S.png` (anneau autour du crayon), dans le dossier de scratchpad cité plus haut. Le focus est visible et distinct ; l'absence relevée à REX-3b venait de captures prises à la souris.
- Réserve visuelle : le contour du bouton-nom (2 px, décalage 2 px, `index.css:70`) touche presque le crayon voisin (écart `gap-2` = 8 px moins 4 px d'anneau et de décalage) ; à surveiller, pas bloquant.
- Option 1 : clore le point sans code. Option 2 : ajouter un e2e de non-régression (Tab puis `outline-style` non `none`, 2 px). Coût S (test seul).
- Recommandée : option 1 (option 2 si le porteur veut une garde ; nouvel identifiant dans docs/tests.md). Coût S.
- Écrans : Gantt du projet, Accueil (aucun changement). Risque : nul ; E2E-43-r1, E2E-100-r2 et `lot3b-focus.spec.ts` (ordre de tabulation) inchangés.

### (d) En-tête « Charge » coupé à 1440 px (Gantt du projet)
- Cause : même mécanisme que (a), à 1440 px. La zone tableau est plafonnée à `max-w-2/3` (776 px sur 1168 px de conteneur, `GanttProjet.tsx:819`) alors que le tableau fait 852 px (plus si « Pas avant une date » élargit Planification) ; la cellule `sticky right-0` (92 px) recouvre donc les dernières colonnes. Sonde à 1440 px : « Avancement » apparaît « Ava » (`focus-gantt-Modifier_le_projet_Sous_projet_S.png`) ; dans la capture E2E-278 (`e2e/captures/rex3b-gantt-1440.png`), c'est « Charge » qui est coupé car la colonne Planification est plus large. L'en-tête n'est pas tronqué par son propre `overflow` (`scrollWidth` = `clientWidth` = 72 px).
- Option 1 : relever le plafond de la zone tableau à 1440 px (`max-w-2/3` vers `max-w-4/5`, soit 934 px) : le tableau entier tient et le SVG garde 234 px. Coût S.
- Option 2 : laisser le plafond, ajouter le repère de (a) et resserrer les colonnes (`px-2` vers `px-1.5` sur les en-têtes de dates). Gain 30 px, insuffisant. Coût M.
- Recommandée : option 1, avec le repère de (a) pour les largeurs inférieures. Coût S.
- Écrans : Gantt du projet et Accueil (même classe, à garder identique : D-086 (3)) ; ui.md ligne 72 à mettre à jour (« jusqu'à `max-w-2/3` »).
- Risque : moyen-faible. Le SVG se rétrécit : E2E-42 (SVG au moins aussi large que son conteneur, trois zooms, 1440 et 1024), E2E-44 (défilement du SVG au clavier, 1024), E2E-43-r1, E2E-41b et 41c ; sur l'Accueil : E2E-100-r2, accueil-g3 (largeur du SVG, lignes 350-367). Mesures des E2E-285 et E2E-287 non touchées. Aucun test n'écrit la classe `max-w-2/3` (grep).

Arbitrage : D-132 ((a) ombre portée à gauche de la colonne Drapeaux, (b) pas un défaut, capture avec retard, (c) clos sans code, (d) `max-w-4/5`). Tests : E2E-288 à E2E-290.

### Relecture de REX-3b-r4 (D-132)
- Captures lues à l'image : `e2e/captures/rex3b-r4-{accueil,gantt}-{1440,1024}.png`.
- En-têtes à 1440 px : entiers sur l'Accueil (Code, Nom, Début, Fin, Drapeaux) et sur le Gantt (WBS à Drapeaux, « Charge » et « Avancement » complets). Corrigé.
- Badge « Retard » : visible et lisible à l'Accueil (1440 et 1024) et au Gantt (rouge sur fond rose, contraste correct).
- Ombre à gauche de la colonne Drapeaux : à 1440 px le tableau tient entièrement (764 px sous le plafond de 934 px), l'ombre n'a pas lieu d'être. À 1024 px sur le Gantt, où le tableau déborde, un filet d'ombre discret est visible à gauche de Drapeaux (x≈849) ; sur l'Accueil à 1024 px le tableau tient, pas d'ombre.
- Défaut restant à 1024 px sur le Gantt : « Charge » est tronqué en « Cl » (recouvert par la colonne Drapeaux collante). Le repère d'ombre signale le défilement mais l'en-tête reste coupé ; acceptable seulement si le défilement horizontal du tableau est jugé suffisant.
- Largeur du diagramme à 1440 px : sonde Playwright non lancée (pas de base ni de serveur démarrés). Estimation par calcul et par capture : conteneur 1168 px ; zone tableau plafonnée à 934 px (`max-w-4/5`) contre 776 px (`max-w-2/3`). Sur la capture Gantt, tableau 764 px, diagramme visible d'environ 403 px (x 1013 à 1416), contre environ 392 px de plafond théorique minimal (1168 - 776) avant r4 pour un tableau plus large ; le plancher du SVG avec tableau saturé est 234 px. À confirmer par une mesure du SVG `data-zoom` si besoin.
- Mesure du diagramme (sonde Playwright jetable, retirée) : largeur visible du SVG à 1440 px = 387 px (SVG 392 px) ; à 1024 px = 150 px visibles (SVG 336 px). Les 403 px et 234 px estimés ci-dessus sont remplacés par ces mesures.
- REX-3 clos (D-133). Points à juger à la recette de fin de lot 3 : diagramme plus étroit à 1440 px (387 px visibles) et à 1024 px (150 px) ; recalcul automatique ; clavier du Gantt ; menu contextuel et Copier ; chefb sur DEMO-S ; colonnes tronquées et défauts ouverts listés plus haut.

## Recette différée (lot 3)
- Lot 3 clos sans recette à l'écran, à la demande du porteur (D-134 (1)). Points gardés : diagramme plus étroit à 1440 px (387 px visibles) et à 1024 px (150 px) ; recalcul automatique ; clavier du Gantt ; menu contextuel et « Copier » ; chefb sur DEMO-S ; colonnes tronquées et défauts ouverts listés plus haut ; Planning : nom sur deux lignes à 1024 px, bouton d'affectation renvoyé à la ligne, jours 17 à 31 du Planning manuel hors vue à 1024 px.

## Recette différée (4b)
- REX du porteur sur l'écran Feuille de temps différé (D-134 (1)) : à faire à l'écran après 4b-corr, avec les points de « Captures de 4b » non corrigés.

## Captures de 4b-corr
- Relecture à l'image de `e2e/captures/feuille-temps-corr-{brouillon,invalide}-{1440,1024}.png` (E2E-297), comparées aux points de « Captures de 4b » ; aucune nouvelle tranche (D-133 (3)).
- Corrigés : tableau sans débordement à 1440 et 1024 px (Reste à faire et week-end visibles, plus de défilement horizontal) ; colonnes de jour de largeur égale (`table-fixed`) ; message d'erreur sur une seule ligne sous le tableau, sans agrandir la ligne ni décaler les colonnes ; badge « Brouillon » en `warning`, lisible face aux autres statuts ; statut et actions groupés à droite.
- Barre d'outils : à 1440 px une seule ligne ; à 1024 px deux lignes (navigation, puis libellé de semaine à gauche et groupe statut + actions à droite), le groupe reste lié. Acceptable, non bloquant.
- Défauts non bloquants : boutons Enregistrer et Soumettre désactivés à contraste faible (volontaire, état désactivé) ; « Assigné » et « Réel cumulé » serrés à 1024 px (en-têtes proches, sans chevauchement) ; case invalide : bordure rouge sous l'anneau de focus bleu, rouge peu visible tant que la case a le focus.
- Reste ouvert : REX du porteur à l'écran (voir « Recette différée (4b) »).

## Captures de 4c
- Relecture par @ui-designer de `e2e/captures/validation-{liste,voir,valider,rejeter}-{1440,1024}.png` (E2E-320) ; aucune nouvelle tranche (D-133 (3)). Corrigé : badge de statut du dialogue Voir étiré sur toute la largeur.
- Défauts non bloquants, à juger à la recette : (1) dans Voir, « Assigné » presque contre « Réel cumulé » (`TableauFeuille`, partagé avec la Feuille de temps, déjà au backlog) ; (2) dans Voir, « Dépassement » en pied de tableau sans lien visible avec une ligne ; (3) à 1024 px, le libellé de semaine passe sous les boutons de navigation ; (4) dans Voir, rien n'indique la lecture seule hors fond gris des cases ; (5) titre de la confirmation Valider long (2 lignes).
- Reste ouvert : REX du porteur à l'écran, comme pour 4b.

## Recette différée (4c, écran Validation, jeu de démonstration D-136)
- `npm run dev:demo`, semaine `lundi − 7` (adresse `/validation?semaine=…`) : chefa voit Alice « Soumise » (DEMO-R · Validé, DEMO-S · Non autorisé) et Bob « Soumise » ; chefb voit Alice avec « DEMO-S · À valider » ; admin voit tout.
- Semaine `lundi − 14` : Bob « Validée » ; Alice « Rejetée », commentaire « Imputations du jeudi à revoir » (bouton Voir, ou Feuille de temps d'Alice).
- Semaine `lundi` : Alice brouillon (lundi seulement).
- Comptes : chefa, chefb, admin (mot de passe = identifiant).

## Captures de 5d
- Relecture à l'image de `e2e/captures/validation-alerte-{1440,1024}.png` (alerte de refus 422/404 au-dessus du tableau Validation) et `e2e/captures/feuille-codes-{1440,1024}.png` (colonne Projet `w-28`, codes de 11 et 30 caractères), selon docs/ui.md ; aucune nouvelle tranche (D-133 (3)).
- Conformes : alerte pleine largeur, rouge sur fond rose avec icône, contraste correct, placée entre la navigation et le tableau sans chevauchement ; code de 11 caractères (`PRJ-1234567`) entier dans la colonne Projet ; code de 30 caractères coupé par une ellipse (`DEMO-AAA...`) sans débordement.
- Défauts non bloquants : (1) Feuille de temps à 1024 px : la colonne Activité est réduite à « 1 T... », illisible, et son en-tête touche « Assigné » ; (2) Validation à 1024 px : les badges Projets passent sur trois lignes, ligne de tableau plus haute, et le libellé de semaine passe sous les boutons (déjà noté en 4c (3)) ; (3) l'alerte n'a pas de bouton de fermeture visible, elle reste affichée jusqu'au prochain rechargement ; (4) le code complet tronqué n'est lisible sur aucune capture (infobulle `title` non vérifiable à l'image) ; (5) le badge de 30 caractères du tableau Validation reste long à 1440 px, il occupe près d'un tiers de la colonne Projets.
- Reste ouvert : REX du porteur à l'écran.

## Captures de 6a
- Relecture à l'image de `e2e/captures/equipes-{liste,nouvelle,suppression,utilisateurs,utilisateur-creation}-{1440,1024}.png`, selon docs/ui.md ; aucune nouvelle tranche (D-133 (3)). Tous les défauts sont non bloquants.
- Conformes : écran Équipes (liste, dialogues Nouvelle équipe et Supprimer) lisible aux deux largeurs, alertes rouge sur rose avec icône, boutons d'action alignés, pas de débordement.
- Défauts non bloquants :
  - (1) Utilisateurs à 1024 px : le tableau déborde, les colonnes Capacité (coupée), Calendrier, Équipe, Statut et Actions sont hors écran ; aucun indice de défilement horizontal, le bouton de modification est inaccessible sans défiler.
  - (2) Utilisateurs à 1440 px : Nom, Identifiant et Email passent sur deux lignes (« Admin / E2E », « admin- / e2e@… »), lignes plus hautes ; la colonne Équipe ajoutée aggrave la densité.
  - (3) Dialogue Nouvel utilisateur (1440 et 1024 px) : la boîte touche le haut et le bas de la fenêtre, le champ « Équipe » et les boutons Annuler / Créer ne sont pas visibles sur la capture ; le défilement interne n'est pas signalé, le champ Équipe n'est pas vérifiable à l'image.
  - (4) Liste Équipes : colonnes Nom, Membres, Actions réparties sans lien visuel (Membres et Actions très à droite à 1440 px) ; la colonne Nom pourrait être plus large, Membres alignée à droite.
  - (5) Équipe vide d'un utilisateur affichée « — » comme Initiales : pas de distinction entre « sans équipe » et « non renseigné ».
  - (6) Dialogue Supprimer : le bouton Supprimer reste actif alors que l'équipe a des membres (refus connu seulement après clic) ; le message d'erreur passe sur deux lignes.
  - (7) Dialogue Nouvelle équipe : l'erreur « Cette équipe existe déjà. » est en haut, éloignée du champ Nom ; le champ n'a pas d'état invalide visible (bordure grise).
  - (8) Aucune capture des états chargement, vide et erreur de l'écran Équipes.
- Reste ouvert : REX du porteur à l'écran.

## Captures de 6b
- Relecture à l'image de `e2e/captures/mes-taches-{contenu,vide}-{1440,1024}.png` (écran Mes tâches et menu réduit du rôle ressource), selon docs/ui.md ; aucune nouvelle tranche (D-133 (3)). Tous les défauts sont non bloquants.
- Conformes : menu réduit à trois entrées, entrée active lisible, pas de débordement aux deux largeurs, tableau aligné, dates et « — » cohérents, état vide en cadre pointillé lisible.
- Défauts non bloquants :
  - (1) Colonnes numériques (Assigné, Réel, Reste) alignées à gauche, en-têtes compris : comparaison verticale des valeurs peu aisée ; à aligner à droite.
  - (2) Colonnes Début et Fin vides affichées « — » sans indication que la tâche n'est pas planifiée.
  - (3) Aucune unité sur Assigné, Réel, Reste (jours ou heures) ; l'en-tête ne la précise pas.
  - (4) Aucune mise en évidence du reste ni tri : pas de repère pour les tâches à traiter en premier.
  - (5) Lignes non cliquables : aucun lien vers la Feuille de temps ou les Imputations depuis une tâche.
  - (6) Pas de nom de projet, seulement le code (MT1) ; l'infobulle n'est pas vérifiable à l'image.
  - (7) À 1440 px, la colonne Activité est très large et les colonnes Début à Reste très espacées ; à 1024 px, la répartition est meilleure.
  - (8) État vide : message centré sans icône ni indication de la suite à donner (« contactez votre chef de projet »).
  - (9) Pied de menu : le nom de la ressource en petit texte gris sans libellé de rôle ; contraste faible à vérifier.
  - (10) Titre de page seul : pas de sous-titre ni de compte de tâches.
  - (11) Aucune capture des états chargement et erreur de l'écran.
- Reste ouvert : REX du porteur à l'écran.

## Recette différée du lot 6 (D-164)
- 6a : écran Équipes, champ Équipe des utilisateurs.
- 6b : Mes tâches et menu de la ressource.
- 6c : colonnes Vendu et Marge, région Totaux, losange et écart de la date client, badge Client ; noms tronqués à 144 px à 1440 px.
- 6d : Plan de charge, filtres, surcharge, champ Mois en anglais dans Chromium.
- 6e : liste « Planning de », lignes « Autre projet ».
- 6f : boutons « Exporter CSV », ouverture des fichiers dans un tableur français (BOM, « ; », virgule) ; lien du Plan de charge sur deux lignes à 1024 px.

## Recette différée (REX-5)
- Onglets de l'écran Utilisateurs (Utilisateurs, Équipes, Calendriers) à 1440 px et à 1024 px.
- Passage d'un onglet à l'autre et relecture des données (équipe ou calendrier créé, visible dans les listes du dialogue utilisateur, nombre de membres à jour).
- Page de détail d'un calendrier et son lien « Retour aux calendriers » ; entrée « Utilisateurs » active.
- Section « Mon calendrier » de Mes tâches, pour une ressource et pour un chef ressource (jours travaillés, fériés à venir, états vide et erreur).
- Menus des trois rôles (administrateur, chef de projet, ressource).
