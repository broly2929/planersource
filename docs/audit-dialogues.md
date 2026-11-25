# Audit des dialogues (D-188)

Audit fait le 2026-11-23 par lecture de `packages/web/src` (recherche des `Dialog`, `FormulaireDialogue`, `Confirmation`, `Field`, `Select`, `Case`, `textarea`, `useEffect`, `api(`). Il précède les tests de la confirmation à la fermeture des dialogues-formulaires (D-188).

## Constats communs

- Tous les champs sont natifs : `Field` = `<input>` (texte, nombre, date, mot de passe), `Select` = `<select>` natif, `Case` = `<input type="checkbox">`, plus un `<textarea>` (Rejeter). Aucun champ Radix (Radix n'est utilisé que pour `Dialog`, `Tabs` et `ContextMenu`), aucun sélecteur de date ou liste personnalisé, aucun champ fichier.
- Aucun champ n'a d'attribut `name` (`FormData` est donc inutilisable). Tous ont un `id` fourni par `useId`, stable pendant la vie du dialogue : l'instantané est pris sur `form.elements`, clé = `id`.
- Les formulaires sont contrôlés par l'état React de chaque écran ; les valeurs du DOM sont toujours égales à l'état.
- Le bouton « Annuler » de `FormulaireDialogue` appelle `onAnnuler` directement, sans passer par `Dialog`. Échap, clic hors du dialogue et croix passent par `onOuvertChange(false)` de `Dialog`.
- Fermeture après un envoi réussi : le parent démonte le dialogue (`onSucces`), sans passer par `onOuvertChange`.
- `Confirmation` est elle-même un `Dialog` (sans formulaire : jamais modifié).

## A. Dialogues de création ou de modification (garde active, 23 avec Rejeter, corrigé par D-188 (10))

Légende : « async » = le formulaire n'est pas monté à l'ouverture ou ses options arrivent après. Soupape = propriété `modifie` nécessaire.

| N° | Dialogue (titre) | Composant et emplacements | Champs (types) | Async | Soupape |
|---|---|---|---|---|---|
| 1 | Nouveau calendrier | `FormulaireCalendrier`, Calendriers.tsx:182 | Nom (texte) ; Cases des jours travaillés | non | non |
| 2 | Modifier le calendrier | `FormulaireCalendrier`, Calendriers.tsx:377 | idem | non | non |
| 3 | Ajouter un jour férié | `FormulaireFerie`, Calendriers.tsx:362 | Date (date), Libellé (texte) | non | non |
| 4 | Nouvelle équipe | `FormulaireEquipe`, Equipes.tsx:151 | Nom (texte) | non | non |
| 5 | Renommer l'équipe | `FormulaireEquipe`, Equipes.tsx:162 | Nom (texte) | non | non |
| 6 | Nouveau modèle | `FormulaireModele`, Modeles.tsx:154 | Code, Nom (texte), Date de début (date) | non | non |
| 7 | Nouveau projet | `FormulaireProjet`, Projets.tsx:416 | Code, Nom, Date « Pas avant le », Selects Chef de projet et Projet parent | options de l'annuaire (`useAnnuaire`) après l'ouverture | non |
| 8 | Modifier le projet | `DialogueModifProjet` : Accueil.tsx:441, Projets.tsx:399 et :528, Modeles.tsx:137, GanttProjet.tsx:1095 | Code, Nom, 2 champs texte/date, Priorité (nombre), Selects Chef et Parent (conditionnels au rôle), Case Clos | oui : le projet est lu dans le dialogue (« Chargement » puis formulaire) | non |
| 9 | Copier / Créer un projet depuis | `DialogueCopie` : Projets.tsx:409, Modeles.tsx:147, GanttProjet.tsx:1036 | Nom, Code (texte), Date (date), 3 Cases dont « Enregistrer comme modèle » (conditionnelle au rôle) | non | non |
| 10 | Nouvel utilisateur | `FormulaireCreation`, Utilisateurs.tsx:430 | Nom, Identifiant, Initiales, Email (texte), Mot de passe (password), Rôle, Calendrier, Équipe (Select), Ressource (Case), Capacité (nombre) | non | non |
| 11 | Modifier <utilisateur> | `FormulaireModification`, Utilisateurs.tsx:443 | idem + Actif (Case), Nouveau mot de passe (password) | non | non |
| 12 | Affecter une ressource | AffectationsProjet.tsx:143 | Select Ressource, Taux (nombre), dates | non | non |
| 13 | Modifier l'affectation | `FormulaireAffectation`, AffectationsProjet.tsx:184 | Taux (nombre), Dates de début et de fin | non | non |
| 14 | Nouvelle activité | `FormulaireNom`, PlanningProjet.tsx:606 ; création du Gantt, GanttProjet.tsx:1013 | Nom (texte) | non | non |
| 15 | Nouveau jalon | `FormulaireNom`, PlanningProjet.tsx:621 ; GanttProjet.tsx:1013 | Nom (texte) | non | non |
| 16 | Nouvelle sous-activité | `FormulaireNom`, PlanningProjet.tsx:655 | Nom (texte) | non | non |
| 17 | Assigner une ressource | `FormulaireAssignation`, PlanningProjet.tsx:672 | Select Ressource, Charge assignée (nombre), Taux (nombre) | non | non |
| 18 | Nouvelle dépendance | `FormulaireDependance`, PlanningProjet.tsx:687 | Selects Prédécesseur, Successeur, Type ; Délai (nombre) | non | non |
| 19 | Modifier l'activité | `FormulaireActivite` : PlanningProjet.tsx:702, GanttProjet.tsx:1044, Accueil.tsx:413 | Nom, Select Mode (conditionnel), Priorité, Début/Fin validée (dates), Durée (nombre), Charge vendue (nombre, conditionnelle), Case Close | non (lu avant l'ouverture, `modifier`) | non |
| 20 | Modifier le jalon | `FormulaireJalon` : PlanningProjet.tsx:712, GanttProjet.tsx:1106, Accueil.tsx:427 | Nom, Select Type, Date validée, Date client (conditionnelle) | non | non |
| 21 | Modifier l'assignation | `DialogueModifAssignation` (enveloppe de `FormulaireModifAssignation`, D-238) : PlanningProjet.tsx, GanttProjet.tsx et Accueil.tsx (boutons de la colonne Ressources) | Charge assignée (nombre), Taux (nombre) | non | non |
| 22 | Modifier la dépendance | `FormulaireModifDependance` : PlanningProjet.tsx:738, GanttProjet.tsx:1058 | Select Type, Délai (nombre) | non | non |
| 23 bis | Rejeter la feuille de <ressource> (déplacé depuis B) | Validation.tsx:424 | textarea Commentaire (1 à 500 caractères) | non | non |

Soupape nécessaire : aucune à ce jour. La propriété `modifie` reste disponible (D-188 (1)).

## B. Dialogues d'action ou de lecture (garde désactivée par `sansGarde`, 5 : Déplacer, Calculer, Exporter, Voir, Confirmations)

| N° | Dialogue | Emplacements | Contenu | Raison |
|---|---|---|---|---|
| 23 | Déplacer <ligne> | PlanningProjet.tsx:636, `FormulaireDeplacement` | Select « Activité parente » | choix unique, rien à perdre ; action |
| 24 | Calculer le planning | `DialogueCalcul` (Accueil.tsx:405, GanttProjet.tsx:762) | Date (date), Cases des projets | lance un calcul ; réglages jetables |
| 25 | Exporter les imputations | `DialogueExport`, Validation.tsx:271 | Du, Au (dates), Select équipe (options lues après l'ouverture) | télécharge un fichier ; réglages jetables |
| 26 | Feuille de <ressource>, semaine … (Voir) | Validation.tsx:355 | tableau en lecture seule | aucun champ modifiable |
| 27 | Confirmations (suppression, Valider, Dévalider, « Abandonner les modifications ? ») | `Confirmation`, une dizaine d'emplacements | aucun champ | aucun formulaire ; jamais de confirmation de confirmation |

Au total : 23 dialogues gardés (22 de création ou de modification, 40 emplacements d'appel dont les deux ouvertures du dialogue 21 depuis la colonne Ressources du Gantt et de l'Accueil, D-238, plus Rejeter) et 5 dialogues sans garde (D-188 (10)).

## Couverture des types de champ (pour les E2E de non-régression, D-188 (8))

| Type | Dialogue représentatif |
|---|---|
| texte | Nouvelle équipe (4) |
| textarea | Rejeter la feuille (23 bis) |
| nombre | Modifier l'assignation (21) |
| date | Ajouter un jour férié (3) |
| mot de passe | Nouvel utilisateur (10) |
| Select natif | Assigner une ressource (17) |
| Case (checkbox) | Modifier le calendrier (2) |
| chargement asynchrone | Modifier le projet (8) ; options de l'annuaire : Nouveau projet (7) ; « prêt » défini en D-188 (10) b |
| champ conditionnel | aucun champ n'est ajouté ou retiré par la saisie (les conditions portent sur le rôle ou le type, fixes à l'ouverture : 8, 9, 19, 20) ; le cas « clé ajoutée ou retirée » est couvert par le test unitaire de comparaison |

## Mise à jour saisie-activites (D-222, 2026-11-24)

Dialogues touchés (garde D-188 conservée, tous restent dans la catégorie A) :

- 14, 15, 16 (Nouvelle activité, Nouveau jalon, Nouvelle sous-activité) : champ ajouté « Activité parente » (Select natif, options connues à l'ouverture) ; la sous-activité préremplit le parent.
- 19 (Modifier l'activité) : champ « Activité parente » ; sous-sections « Prédécesseurs » et « Successeurs » (ajout, modification, suppression enregistrés tout de suite, avec confirmations) ; un ajout saisi non envoyé compte comme une modification (garde) ; activité parente : mode et dates validées absents. Dialogues imbriqués : les confirmations de suppression ouvrent une `Confirmation` (catégorie B, sans garde) au-dessus du dialogue.
- 20 (Modifier le jalon) : champ « Activité parente » ; pas de dépendances.

