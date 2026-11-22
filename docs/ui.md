# Charte UI

Complétée de façon incrémentale par l'agent ui-designer. Aucune valeur en dur dans un composant : uniquement les jetons ci-dessous (variables CSS / thème Tailwind).

## Pile

| Brique | Rôle | Licence (vérifiée) |
|---|---|---|
| Tailwind CSS | Styles, jetons | MIT |
| Radix UI (primitives) | Accessibilité des dialogues, listes, etc. | MIT |
| lucide-react | Icônes | ISC |

Gantt : rendu SVG interne, aucune bibliothèque tierce.

## Jetons

- Accent : une seule couleur (`--accent`), plus sa variante survol.
- Gris : échelle `gray-50` à `gray-900` (fonds, bordures, textes).
- États : `success`, `warning`, `danger`, `info`.
- Drapeaux (SPEC 5.9) : `flag` = rouge dédié (retard, début non respecté, surcharge, dépendance non respectée).
- Contraste AA minimal pour tout texte.

## Typographie

- Une seule police sans empattement.
- 3 tailles : petite, normale, titre.
- 2 graisses : normale, semi-grasse.

## Espacements, forme

- Grille de 4 px : tout espacement est un multiple de 4 px.
- Un seul rayon (`--radius`) et une seule ombre (`--shadow`).

## Mise en page

- Barre latérale de navigation à gauche.
- Bandeau de titre avec actions en haut du contenu.
- Contenu en pleine largeur.
- Thème clair seulement en V1.

## Composants de base (lot 0)

Bouton, champ, liste déroulante, tableau, dialogue, notification, badge de statut.

## États et accessibilité

- Chaque écran gère : chargement, vide, erreur, nominal.
- Clavier complet, focus visible, libellé sur chaque champ.
- Textes en français.

## Jetons concrets (lot 0)

Définis une seule fois dans `packages/web/src/index.css` (`@theme` Tailwind 4) ; les composants n'emploient que les classes dérivées.

- Accent `#1d4ed8` (survol `#1e40af`) ; états `success`, `warning`, `danger`, `info`, chacun avec un fond teinté `*-bg` (badges, notifications) ; `flag` `#be123c`.
- Tailles : `text-petit` 12 px, `text-normal` 14 px, `text-titre` 20 px. Graisses : normale (400), `font-semibold` (600).
- Rayon `rounded-ui` 4 px ; ombre `shadow-ui`.
- Espacement : échelle Tailwind par pas de 4 px, demi-pas (`0.5`, `1.5`) interdits. Hauteur des contrôles : `h-8` (32 px).
- Focus visible : contour 2 px `accent`, global (`:focus-visible`).

## Composants (`packages/web/src/components`)

- `Button` (primaire, secondaire, état `enCours`), `Field` (champ avec libellé et erreur), `Select` (liste déroulante native avec libellé), `Table` (légende masquée, en-têtes `scope="col"`), `Dialog` (Radix : titre et description obligatoires, bouton Fermer), `Notification` (`erreur` = `role="alert"`, `succes` et `info` = `role="status"`), `Badge` (statuts), `Chargement` et `Vide` (états d'écran), `Layout` (barre latérale, bandeau de titre avec actions).
- Écran : chargement = `Chargement`, vide = `Vide`, erreur = `Notification` `erreur`, nominal = contenu.
- `Case` (lot 1) : case à cocher avec libellé associé (`label` + `htmlFor`), taille `size-4`, couleur `accent-accent` ; `disabled`/`readOnly` pour la lecture seule (détail d'un calendrier). Navigation : liens « Calendriers » et « Projets » pour tous les rôles ; le lien est actif sur la route et ses sous-routes.
- Projets (lot 1) : écrans `Projets` et `ProjetDetail` (`screens/Projets.tsx`). Onglets Radix Tabs (`role="tab"`) : trait bas 2 px `accent` sur l'onglet actif, bordure transparente sur les autres (pas de décalage). Panneaux dans `screens/projet/` (un fichier par onglet). `useAnnuaire` (`annuaire.ts`) : noms d'utilisateurs via `/api/annuaire`, jamais d'identifiant nu. Liste « Chef de projet » : administrateur = actifs administrateurs et chefs ; chef = lui seul, présélectionné (D-028).
- Panneaux de projet (lot 1, tranche c) : `screens/projet/commun.tsx` (`useListe` : chargement/erreur/ok d'une ressource API ; `FormulaireDialogue` : formulaire de dialogue avec erreur `Notification` dans le dialogue, Annuler + bouton d'envoi). Boutons de ligne du planning : icônes lucide seules (`CornerDownRight`, `UserPlus`) avec `aria-label` et `title` explicites ; colonne « Actions » absente sans `peut_ecrire`. Région « Dépendances » : `<section aria-labelledby>` + titre de niveau 2.
- Historique (lot 1, tranche e) : `screens/projet/HistoriqueProjet.tsx`, tableau `Table` à 7 colonnes (Date AAAA-MM-JJ HH:MM en heure locale, sans retour à la ligne). Valeurs ancienne/nouvelle : texte, JSON compact pour les objets, « — » si absent ; cellule tronquée (`max-w-40 truncate`) avec `title` portant le texte complet.
- Modèles (lot 1b) : écran `Modeles` (`screens/Modeles.tsx`), même gabarit que `Projets` (tableau Code | Nom | Début, nom = lien vers `/projets/:id`, dialogue via `FormulaireDialogue`). Lien de navigation « Modèles » (icône `LayoutTemplate`) pour administrateur et chef ; bouton « Nouveau modèle » pour l'administrateur seul.
- Écritures du lot 1b-C (D-040) : `BoutonIcone` (`components/BoutonIcone.tsx`) = bouton de ligne carré `size-8`, icône lucide seule, `aria-label` et `title` identiques, espacés de `gap-1` ; colonne « Actions » présente seulement si l'utilisateur peut écrire (Projets : si une ligne est modifiable ; Modèles : administrateur et chef). `Confirmation` (`components/Confirmation.tsx`) : composant unique de suppression, titre « Supprimer <nom> ? », « Annuler » + « Supprimer » (variante `danger` de `Button`, fond `danger`), refus de l'API affiché en `Notification` dans le dialogue qui reste ouvert. `DialogueCopie` (`screens/projet/DialogueCopie.tsx`) : dialogue unique de copie pour Projets et Modèles. `FormulaireDialogue` accepte `conflit` (message du 409). `Dialog` : hauteur bornée à l'écran, défilement interne. `Table` : en-têtes sans retour à la ligne. Monter/Descendre : icônes `ArrowUp`/`ArrowDown`, désactivées aux extrémités. Actions de la fiche projet et du calendrier : boutons secondaires avec icône et texte dans le bandeau de titre.
- Planning manuel (lot 2e-E) : écran `screens/PlanningManuel.tsx`, route `/projets/:id/planning-manuel/:activiteId?mois=AAAA-MM` (`useSearch` dans `router.tsx` ; `navigate` compare chemin et paramètres). Bouton de ligne `CalendarDays` « Planning manuel » sur les activités MAN sans enfant, visible de tout lecteur (la colonne « Actions » apparaît alors même sans écriture). Grille : tableau, 1re colonne (ressource, `scope="row"`) et dernière (total du mois en jours, virgule décimale) figées par `sticky`, colonnes de jour `w-6`, deux cases natives empilées par jour (matin au-dessus), samedis et dimanches `bg-gray-100` (`bg-gray-200` en en-tête), défilement horizontal interne au tableau. Quatre états : `Chargement`, `Vide` (non MAN ou parente, aucune assignation), `Notification` erreur, grille. Lecture seule : cases désactivées, ni Enregistrer ni Annuler, mention « Activité close » en texte gras. Captures : `e2e/captures/planning-manuel-*.png`.
- Gantt (lot 3b) : onglet « Gantt » de la fiche projet (`screens/projet/GanttProjet.tsx`, SVG dans `GanttSvg.tsx`, géométrie pure dans `gantt/`), onglet et zoom pilotés par l'adresse (`?onglet=gantt&zoom=jour|semaine|mois`). Mise en page : tableau à gauche (`Table` avec `compact` : lignes `h-8`, en-tête `h-16`, sans cadre propre, largeur au contenu jusqu'à `max-w-4/5` (D-132, auparavant `max-w-2/3`)) et SVG à droite, chacun avec défilement horizontal (`tabIndex=-1` : seuls les boutons de zoom et les liens de sous-projet sont focalisables). Lignes de 32 px et deux niveaux d'en-tête de 32 px, identiques côté tableau et SVG ; pixels par jour 24, 8, 4 définis dans `gantt/echelle.ts` avec les hauteurs de barre (16 px, fine 8 px, demi-jalon 8 px). Boutons de zoom : groupe « Zoom », `Button` primaire pour le zoom actif, `aria-pressed`. Couleurs SVG par classes `fill-*` et `stroke-*` : feuille `accent-bg` avec trait `accent` et part d'avancement `accent` ; retard `flag-bg`/`flag` ; activité close `gray-200`/`gray-500` ; parent `gray-700` et sous-projet `gray-500` en barre fine ; jalon losange `gray-800` (`flag` en retard) ; liens `gray-600` (`flag` si dépendance non respectée) ; trait du jour `warning` ; samedis et dimanches `gray-100` au zoom jour. Jetons ajoutés : `accent-bg` `#dbeafe` et `flag-bg` `#ffe4e6`. `Badge` : statut `flag` (drapeaux, un badge par drapeau). Quatre états : `Chargement`, `Vide`, `Notification` erreur, nominal ; bandeau `info` « Planning non calculé » sans date planifiée. Captures : `e2e/captures/gantt-*.png` (non suivies par git).
- Gantt, nom accessible des jalons (D-068) : `nomJalon(nom, date, drapeaux)` ajoute « , retard » (un suffixe par drapeau, en minuscules), comme `nomBarre` ; un jalon à l'heure n'a pas de suffixe.
- Calcul (lot 3c, D-074, D-075) : dialogue autonome « Calculer le planning » (`screens/projet/DialogueCalcul.tsx`, props `precoches`, `projetId`, `onSucces`, `onFermer`), réutilisable sur Accueil ; liste de `Case` « <code> — <nom> », « Tout cocher », « Tout décocher », champ date « Date de début du calcul », « Calculer » (inactif sans case cochée), « Annuler » ; refus dans une `Notification` `erreur` (`role="alert"`) du dialogue laissé ouvert. Logique pure (liste, racine, messages, avertissements) dans `calcul/logique.ts`. Bouton « Calculer » de `GanttProjet` placé avant le groupe Zoom (ordre de tabulation identique à l'ordre visuel, E2E-43) et dans le bandeau « Planning non calculé ».
- `Notification` : nouveau type `avertissement` (`role="status"`, jetons `warning` et `warning-bg`, icône `TriangleAlert`), utilisé pour les restes non posés après un calcul.
- Formulaire de dialogue (REX-2, D-078) : `FormulaireDialogue` accepte `valider` (fonction renvoyant un message ou null, appelée avant l'envoi ; le message s'affiche dans la `Notification` d'erreur du dialogue, comme un refus de l'API, et rien n'est envoyé). Bouton de ligne avec texte visible : `Button` secondaire avec icône et texte, `aria-label` complet (« Créer un projet depuis <nom> »), à côté de `BoutonIcone` (écran Modèles).
- Projets en arborescence (REX-2, D-079) : une ligne par projet, éléments (activités, sous-activités, jalons) en lecture seule dessous, puis sous-projets. Chevron de dépliage : `BoutonIcone` `size-8` avec `ChevronRight` (replié) ou `ChevronDown` (déplié), `aria-expanded`, nom « Déplier/Replier <projet> », suivi du lien du projet (`gap-2`). Indentation : `PAS_INDENTATION` = 4 pas (16 px) par niveau de profondeur, appliquée en `padding-left` calculé sur `--spacing` (jamais de pixels). Les lignes sans chevron (éléments, messages) ajoutent `PAS_CHEVRON` = 10 pas (chevron + espace) pour s'aligner sur le nom du projet parent, plus un niveau. Colonne Code : code du projet ou numéro WBS de l'élément. Lignes de message sous un projet déplié : texte `text-gray-700` sans icône (« Chargement du contenu… », « Impossible de charger le contenu du projet. », « Aucune activité ni jalon. »), même indentation que les éléments. Badge « Jalon » : `Badge` statut `neutre` à droite du nom, `gap-2`. Bouton « Tout déplier » / « Tout replier » : `Button` secondaire du bandeau, avant « Nouveau projet ». Captures : `e2e/captures/projets-arbre-*.png`, `projets-nouveau-dialogue-*.png` (non suivies par git).
- Accueil, Gantt global (G2) : sous la ligne « Connecté en tant que », `GanttGlobal` (`screens/Accueil.tsx`) reprend la mise en page de `GanttProjet` (boutons de zoom, zone du tableau `role="region"` « Tableau du Gantt global », zone SVG « Calendrier du Gantt global », toutes deux `tabIndex=0`). Une ligne par racine (`projetsAccueil`), colonnes Code, Nom (lien vers la fiche), Début, Fin, Drapeaux (vide, figée) ; barres de synthèse fines `gray-500` via `GanttSvg` (lignes de genre sous-projet, sans dépendances). Un seul appel `GET /api/projets`. Quatre états : `Chargement`, `Vide` « Aucun projet à afficher. », `Notification` erreur, nominal ; bandeau `info` « Planning non calculé » sans date planifiée. Les `svg` imbriqués des en-têtes de `GanttSvg` portent `role="presentation"` (ils ne sont pas des images). Capture : `e2e/captures/accueil-replie.png` (non suivie par git).
- Accueil, dépliage (G3, D-080 à D-082) : même arbre que l'écran Projets (chevron `BoutonIcone` « Déplier/Replier <projet> » avec `aria-expanded`, indentation `indentation()` en pas de `--spacing`). Lignes d'éléments : numéro WBS en colonne Code, nom tronqué (`max-w-56`, D-086, `title`), badge `Badge` `neutre` « Jalon » à droite du nom (`ml-2`), dates et drapeaux de l'élément, barres du Gantt dans la même ligne de 32 px. Lignes de message (`text-gray-700`, sans icône) sous un projet déplié : « Chargement du contenu… », « Impossible de charger le contenu du projet. », « Aucune activité ni jalon. ». Bouton « Tout déplier » / « Tout replier » : `Button` secondaire de la barre d'outils. Les projets clos et leur descendance sont masqués.
- Accueil, calcul (G4) : bouton « Calculer » (`Button` secondaire) dans la barre d'outils, visible seulement si un projet affiché est modifiable. Ordre DOM et de tabulation : boutons de zoom, « Calculer », « Tout déplier », région du tableau, région du calendrier. Il ouvre `DialogueCalcul` avec `precoches="tous"` (toutes les cases cochées) et `noms` (noms des éléments déjà chargés, pour les refus). Succès : dialogue fermé, `Notification` `succes` « Planning calculé. » puis, si des restes ne sont pas posés, `Notification` `avertissement` (même rendu que `GanttProjet`). Rechargement sans état de chargement visible : les projets dépliés gardent leur contenu jusqu'à l'arrivée du nouveau, les dépliés sont relus (un `GET /gantt` chacun), les autres le seront au prochain dépliage.
- Gantt, barre active (lot 3d-3b, D-098) : anneau `<rect data-anneau-element>` en `fill-none stroke-accent stroke-2` (contour de focus 2 px `accent` de la charte), à 3 px autour de la barre ou du losange, rx 4 ; l'espace de 3 px garde l'anneau distinct des barres `accent`, `flag` et `gray` et des week-ends `gray-100`. La région « Calendrier du Gantt » garde le contour global `:focus-visible`, décalé vers l'intérieur (`focus-visible:outline-offset-[-2px]`) pour ne pas être rogné par son défilement.
- Gantt, recalcul automatique (lot 3d-4, D-101) : `Case` « Recalcul automatique » de la barre d'outils à la hauteur des contrôles (`h-8`, sans retour à la ligne), alignée avec « Calculer » et les boutons de zoom, ordre de focus inchangé. « Recalcul en cours… » : `Notification` `info` (`role="status"`, icône `Info` `aria-hidden` fournie par le composant), sans icône ni animation supplémentaire.
- Gantt, liens (lot 3e, D-104) : connecteur = cercle `fill-accent` rayon 4 avec contour `stroke-white` (lisible sur blanc et sur les week-ends `gray-100`), `opacity-0` au repos, `opacity-100` au survol de la barre ou du connecteur (`group-hover`) et sur la barre active, curseur `cursor-crosshair`. Trait provisoire : `stroke-accent stroke-2`, pointillé `4 2`, extrémités rondes, sans événements de pointeur. Ligne cible : rectangle pleine largeur `fill-accent-bg` avec contour `stroke-accent`. Zone de clic des liens : trait transparent, curseur `cursor-pointer`. Aucun nouveau jeton.
- Gantt, glisser de ligne (lot 3f-1, D-108) : poignée `GripVertical` `size-4` en `gray-500`, `opacity-40` au repos, pleine au survol de la ligne (`group` sur le `tr` du `Table` compact), curseur `grab` puis `grabbing` ; pendant le glisser, tableau en `select-none` et curseur `grabbing`. Ligne source `opacity-50`. Indicateur d'insertion par variantes `data-[insertion=…]` de `Table` compact : « avant » et « après » = ombre interne de 2 px `accent` en haut ou en bas des cellules (aucun décalage), « dans » = fond `accent-bg`. Dialogue « Déplacer » : `FormulaireDialogue` avec `Select` « Activité parente » ; « Déplacer » inactif = `Button` `disabled` (`opacity-60`, curseur interdit). Captures : `e2e/captures/gantt-glisser-*.png`, `deplacer-dialogue-*.png`.
- Gantt, menu contextuel et « Copier » (lot 3f-2, D-111) : `ContextMenu.Content` de Radix, fond `white`, bordure `gray-200`, `rounded-ui`, `shadow-ui`, `p-1`, largeur min `min-w-56`, `z-50` (au-dessus du SVG et des dialogues non ouverts), texte `text-normal` `gray-800`. Entrée : `h-8` (cible de 32 px comme les contrôles), `px-3`, sans retour à la ligne, curseur par défaut, `select-none` ; survol et clavier (`data-[highlighted]`) = fond `accent-bg` et texte `gray-900` ; focus visible par le contour global 2 px `accent`, décalé vers l'intérieur (`focus-visible:outline-offset-[-2px]`) pour ne pas être rogné par le menu. Bouton « Copier » : `Button` secondaire avec icône `Copy` `size-4` (`aria-hidden`), identique à « Calculer ». Captures : `e2e/captures/menu-gantt-*.png`, `ux-*.png` (non suivies par git).

## Jour rouge de surcharge (3g)

- Gantt du projet : un `<rect>` par jour en surcharge, `fill-flag` (`#be123c`) avec `opacity-70`, `pointer-events-none`, `aria-hidden`. L'opacité laisse voir la part d'avancement `accent` et la barre dessous (un rect opaque la masquait) ; la teinte reste rouge, distincte de `accent`, `accent-bg` et `gray-100`.
- Ordre de superposition : barres, puis jours rouges, puis anneau de la barre active, puis contours pointillés ; l'anneau et les contours restent donc au-dessus. Même rendu aux zooms jour, semaine et mois (largeur du rect = pixels par jour du zoom).
- L'information n'est pas portée par la couleur seule : le drapeau `surcharge` reste affiché en `Badge` dans le tableau.

## Feuille de temps (lot 4b, D-120)

- Écran `screens/FeuilleTemps.tsx`, composants réutilisés : `Button`, `Badge`, `Notification`, `Confirmation`, `Chargement`, `Vide`, `Layout` ; aucun composant créé. Barre d'outils : semaine précédente, cette semaine, semaine suivante, libellé de la semaine (`font-semibold`, sans retour à la ligne), `Badge` de statut (neutre, info, succès, danger), actions (Enregistrer, Soumettre ou Rappeler) à droite en `ml-auto` ; elle passe à la ligne quand la largeur manque, `gap-2` dans les deux sens.
- Tableau (carte `rounded-ui`, `border-gray-200`, `shadow-ui`, défilement horizontal interne) : colonnes de jour et « Reste à faire » alignées à droite (en-tête, case, total), colonnes numériques à droite, `px-2` (jours `px-1`). Cellules de texte `align-top leading-8` pour tomber sur l'axe des cases de 32 px (`h-8 w-16`). Jours de capacité nulle : `bg-gray-100` (`bg-gray-200` en en-tête). Case désactivée : `bg-gray-100`, texte `gray-600`. Case invalide : message sous le tableau, voir D-134 (4).
- Pied : « Total » en `bg-gray-50`, `font-semibold` ; « Dépassement » en `text-petit text-flag` avec icône `TriangleAlert` `size-4` ; l'information n'est pas portée par la couleur seule (icône et texte).
- Quatre états : `Chargement`, `Vide` (réservé aux ressources, aucune activité), `Notification` erreur, tableau. Rejet : `Notification` erreur « Feuille rejetée : … » au-dessus du tableau. Captures : `e2e/captures/feuille-temps-{brouillon,soumise,rejetee,depassement,invalide}-{1440,1024}.png`.

## REX-3a (D-123, D-124)

- Planning manuel : case d'un jour non ouvré non cochée = `cursor-not-allowed opacity-50` (`aria-disabled`) sur le fond `gray-100` du week-end ; cochée, elle garde le rendu normal.
- Planning du projet : nom d'activité ou de jalon modifiable = bouton à l'apparence de lien (`text-accent underline`, contour de focus global arrondi) ; texte simple pour les lecteurs. Zone d'annonce `role="status"` en `sr-only`. Liste d'assignations vide masquée (`empty:hidden`) pour garder l'espacement du bouton « Assigner une ressource ».
- `Table` : ligne déplacée (`data-deplacee`) en fond `accent-bg`, conservé au survol.
- Aide sous « Mode de planification » : `text-petit text-gray-600` (contraste AA), `gap-1` sous la liste.
- Gantt : `Badge` neutre « Sous-projet » dans la colonne Planification ; nom « <code> · <nom> » tronqué (`truncate`, largeur max) avec `title`.

## REX-3b (D-127, D-129)

- Gantt du projet, « Annuler » : `Button` secondaire avec icône `Undo2` `size-4` (`aria-hidden`) et texte, `title` « Annuler (Ctrl+Z) », en fin de barre d'outils (après « Copier »), `disabled` (`opacity-60`) si la pile est vide. Après un geste annulé : `Notification` `succes` « Geste annulé. » jusqu'au geste suivant.
- Noms d'activités et de jalons modifiables (tableau du Gantt du projet et de l'Accueil) : `button` à l'apparence de lien, comme l'onglet Planning (`cursor-pointer text-left text-accent underline`, contour de focus global arrondi `focus-visible:rounded-ui`), tronqué à `CLASSE_NOM_MAX` (D-086) avec `title` = nom complet ; texte simple (sans soulignement) pour les lecteurs. Les critères de largeur D-069 et D-086 et l'ordre de tabulation sont inchangés.
- Crayon « Modifier le projet <nom> » : `BoutonIcone` `Pencil` (`size-8`, `shrink-0`) placé juste après le lien de projet (Accueil) ou de sous-projet (Gantt), `gap-1`/`gap-2` ; absent sans droit d'écriture sur ce projet.

### REX-3b-r2 (D-131)

- Barre d'outils du Gantt : « Copier » et « Annuler » dans un `div` `flex flex-nowrap items-center gap-4` (groupe qui passe à la ligne en entier). Infobulle de « Annuler » : « Rien à annuler depuis le dernier calcul » quand un calcul a vidé la pile, sinon « Annuler (Ctrl+Z) ». « Rétablir », quand il existera, rejoindra ce groupe (après « Annuler »).
- Lien de sous-projet et crayon : `gap-2` (Gantt du projet), comme l'Accueil.
- Cellule Drapeaux figée (`CLASSE_CELLULE_DRAPEAUX`) : `group-hover:bg-gray-50` et `group-data-[deplacee]:bg-accent-bg` pour que le fond de la ligne survolée ou déplacée couvre toute la largeur.
- Accueil : bouton-nom `disabled:cursor-wait disabled:opacity-60` pendant le chargement de l'élément ; `Notification` `erreur` « Élément introuvable. » si l'élément n'est plus dans la liste.
- Repère de défilement (D-132 (a)) : ombre portée à gauche de l'en-tête et de la cellule Drapeaux figés, `box-shadow` (jeton `shadow-repere` : `-4px 0 6px -2px rgb(0 0 0 / 0.12)`), jamais `border` (la largeur ne change pas).

### 4b-corr (D-134)

- Tableau de la feuille de temps : `table-fixed w-full` avec `colgroup` (Projet `w-16`, Activité libre, Assigné `w-14`, Réel cumulé `w-16`, jours `w-14` chacun, Reste à faire `w-[4.5rem]`) : colonnes de jour de largeur égale, plus de débordement à 1024 px.
- Barre d'outils : le statut (`Badge`) et les actions forment un groupe `ml-auto flex flex-nowrap items-center gap-2` qui passe à la ligne en entier ; boutons Enregistrer et Soumettre en `px-2!`.
- Badge du statut Brouillon : `warning` (ambre), au lieu de neutre.
- Erreurs de saisie : plus de message sous la case ; une liste `flex flex-col gap-1 text-petit text-flag` sous le tableau, une ligne par erreur « jour · activité : message » ; la case invalide garde sa bordure `danger` et référence le message par `aria-errormessage`. La hauteur des lignes ne change pas.
- Captures : `e2e/captures/feuille-temps-corr-{brouillon,invalide}-{1440,1024}.png` (E2E-297).

## Écran Validation (lot 4c, D-135)

- Écran `screens/Validation.tsx`, route `/validation?semaine=AAAA-MM-JJ`, administrateur et chef de projet. Composants réutilisés, aucun créé : `Layout`, `NavigationSemaine`, `Table`, `Badge`, `BoutonIcone`, `Button`, `Confirmation`, `Dialog`, `Notification`, `Chargement`, `Vide`, `TableauFeuille` (partagé avec la Feuille de temps).
- Liste : `Table` à 4 colonnes Ressource, Statut (`Badge` de statut), Projets (un `Badge` par projet, `flex-wrap gap-1`, « Aucune imputation » en `text-gray-600`), Actions (`BoutonIcone` `size-8` `gap-1` : `Eye`, `Check`, `X`, Valider et Rejeter selon l'état de la feuille).
- Voir : `Dialog large`, statut en `Badge` à largeur de contenu, `TableauFeuille` en lecture seule (cases désactivées `bg-gray-100`), sans débordement horizontal à 1024 px.
- Valider : `Confirmation` variante primaire. Rejeter : `Dialog` avec `textarea` libellé « Commentaire » (4 lignes, `border-gray-400`) et compteur `text-petit text-gray-600` aligné à droite ; bouton « Rejeter » `danger`, inactif si le commentaire est invalide.
- Quatre états : `Chargement`, `Vide`, `Notification` erreur, tableau ; succès en `Notification` `succes`.
- Captures : `e2e/captures/validation-{liste,voir,valider,rejeter}-{1440,1024}.png` (E2E-320).
- Colonne Projet de `TableauFeuille` (REX-4, D-145 (3)) : `w-28` ; au-delà, code tronqué (`truncate`), `title` = code complet ; aucun défilement horizontal à 1024 px (D-134 (2)).

## Charge vendue et date client (6c, D-149, D-150)

- Colonnes « Vendu » et « Marge » du tableau du Gantt du projet, après « Charge », visibles seulement avec le droit d'écriture ; valeurs alignées comme « Charge », activités seulement (jalons vides), « — » sans valeur ; marge négative en `text-flag` (le signe « − » porte aussi l'information). Aucun composant créé : `Table` reçoit `classeCelluleLigne` (classes d'une cellule selon la ligne).
- Région « Totaux du projet » : `role="region"` sous la barre d'outils et au-dessus du tableau, carte `rounded-ui` `border-gray-200` `bg-white` `shadow-ui`, `px-3 py-2`, parties séparées par « · » (`gap-x-1`), marge négative en `text-flag`.
- Losange de la date client (SVG, `gantt/GanttSvg.tsx`) : contour seul (`fill-none`, trait 1,5 px, jointure arrondie), même demi-diagonale que le jalon, `pointer-events-none` et `aria-hidden` ; `stroke-gray-500` au repos, `stroke-flag` si l'engagement est dépassé. Seule exception à la règle des demi-pas : l'épaisseur du trait (`stroke-[1.5]`) d'un dessin SVG, pas un espacement.
- Texte d'écart : `text-petit`, à droite du plus tardif du losange et du jalon (+ 6 px), « +2 j », « −3 j », « 0 j » ; `fill-gray-700` (contraste AA), `fill-flag` si dépassé.
- Badge « Client » : `Badge` statut `flag` dans la colonne Drapeaux, à la suite des drapeaux du moteur, `title` « Engagement client dépassé » ; texte et couleur (pas la couleur seule).
- Règle de largeur (tableau d'au plus 4/5, 933 px à 1440 px, sans défilement) : avec les colonnes de 6c, toutes les colonnes sauf Drapeaux passent en `px-1!` (un pas, `resserrer()` de `GanttProjet.tsx`) et le nom est limité à `CLASSE_NOM_MAX_CLIENT` = `max-w-36` au lieu de `max-w-56` (`gantt/largeurs.ts`). Sans 6c, rien ne change. Largeur de Drapeaux inchangée (`max-w-44`, D-086). Mesure à 1440 px (administrateur) : 913 px (1050 avant correction).

## Plan de charge (lot 6d, D-154)

- Écran `screens/PlanDeCharge.tsx`, composants réutilisés, aucun créé : `Layout`, `Select`, `Field`, `Button`, `Notification`, `Chargement`, `Vide`. Filtres sur une ligne `flex-wrap items-end gap-x-3 gap-y-2` : Équipe, Mois de départ (contrôles `h-8`), puis « Mois précédent » et « Mois suivant » (`Button` secondaire `px-2!`, icônes `ChevronLeft`/`ChevronRight` `size-4`), alignés sur le bas des champs.
- Tableau : région `role="region"` « Plan de charge » (`tabIndex=0`, carte `rounded-ui` `border-gray-200` `shadow-ui`, défilement horizontal interne, la page n'en a jamais à 1440 ni 1024 px). `border-separate border-spacing-0` : les bordures des cellules figées suivent le défilement (en `border-collapse` elles restent en arrière). Colonne Ressource figée (`sticky left-0 z-10`, `min-w-48`, fond opaque `gray-100` en en-tête, `white` en ligne, `gray-50` en ligne de projet et au survol, bordure droite `gray-200`). Colonnes de mois alignées à droite, `tabular-nums`.
- Surcharge : `font-semibold text-flag` (AA sur `white` et `gray-50`) plus « , surcharge » en `sr-only` et `title` ; en lecture seule, la valeur seule porte l'information visuelle (comme D-120).
- Dépliage : bouton `size-6` (cible serrée, ligne de 32 px) avec chevron `size-4`, `aria-expanded`, nom « Déplier/Replier <ressource> » en `sr-only`. Lignes de projet : `bg-gray-50 text-gray-700`, indentées `pl-11` (alignées sur le nom de la ressource), séparées par `border-gray-200`.

## Accueil : planning d'une ressource (lot 6e, D-157)

- Liste « Planning de » : `Select` existant, largeur fixe `w-56`, dans une ligne `flex items-end gap-4` au-dessus de la barre d'outils (zoom), donc avant elle dans l'ordre de focus ; la barre d'outils garde l'espacement `gap-4` du bloc. Aucun composant créé.
- Vue ressource (`screens/PlanningRessource.tsx`) : même carte, mêmes régions (`tabIndex=0`, contour de focus décalé vers l'intérieur) et même largeur de tableau (`w-fit max-w-4/5`) que le Gantt global ; composants `Table` compact, `BoutonsZoom`, `Drapeaux`, `GanttSvg`.
- Barres pleines (`plein` de `ElementGantt`) : hauteur de barre standard, `fill-accent` (ligne lisible) ou `fill-gray-500` (ligne « Autre projet », projet illisible), sans part d'avancement. Ligne masquée : texte `text-gray-700` sans lien, « — » en activité.
- Colonnes resserrées : `px-1!` sauf Drapeaux ; Activité limitée à `CLASSE_NOM_MAX_RESSOURCE` = `max-w-36` (`gantt/largeurs.ts`), `title` = texte complet. À 1024 px la page ne défile jamais en horizontal (scrollWidth = largeur de fenêtre) ; les dernières colonnes (Réel, Reste) défilent dans la région du tableau, comme l'Accueil Gantt global.
- Captures : celles de la relecture (non suivies par git) ; aucune capture permanente créée.

## Exports CSV (6f)

- « Exporter CSV » (Plan de charge) : `LienTelechargement` (`components/LienTelechargement.tsx`), lien `<a download>` à l'apparence d'un `Button` secondaire (`h-8`, `border-gray-300`, icône `Download` `size-4` `aria-hidden`), dernier élément de la barre des filtres, après « Mois suivant » (ordre de focus = ordre visuel). Focus : contour global 2 px `accent`. À 1024 px la barre passe à la ligne (`flex-wrap`) et le lien se place sous les filtres, aligné à gauche ; aucun débordement horizontal.
- « Exporter CSV » (Validation) : `Button` secondaire avec icône `Download`, à la suite de la navigation de semaine, séparé du libellé de semaine par `ml-2` (le `gap-x-1` de la barre seul le collait au texte).
- Dialogue « Exporter les imputations » (`export/DialogueExport.tsx`) : `Dialog`, champs `Field` « Du » et « Au » côte à côte (`flex flex-wrap gap-3`, alignés en haut), `Select` « Équipe » pleine largeur, « Annuler » + « Exporter » à droite. Période invalide : bordure `danger` sur les deux dates, « Période invalide. » (`text-petit text-danger`, `aria-describedby`) sous « Au » sans décaler « Du », « Exporter » `disabled` (`opacity-60`). Le téléchargement ferme le dialogue et le focus revient au bouton d'ouverture. Aucun composant ni jeton créé ; captures de relecture non suivies par git.
