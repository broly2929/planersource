# Cadrage : colonnes ajoutables au Gantt de l'Accueil (D-080, candidat 3)

Questionnaire de cadrage, sans implémentation. État actuel : le Gantt global de l'Accueil n'affiche que Code, Nom, Début, Fin, Drapeaux (colonnes réduites, D-080 (8)). Le Gantt d'un projet affiche WBS, Nom, Planification, Début, Fin, Charge, Avancement, Drapeaux, et Vendu et Marge si `peut_ecrire` (D-149 (8b)). Chaque question propose une réponse par défaut et son effet sur le nombre d'E2E (total par défaut : environ 14).

| N° | Question | Réponse par défaut | Effet sur les E2E |
|---|---|---|---|
| 1 | Périmètre : Accueil seulement, ou aussi le Gantt d'un projet ? | Accueil seulement (c'est l'entrée du backlog). Le Gantt de projet garde ses colonnes fixes. | Accueil seul : base. Ajouter le Gantt de projet : +6 |
| 2 | Quelles colonnes ajoutables ? | Charge, Avancement, Réel, Vendu, Marge (déjà fournies par `GET /api/projets/:id/gantt`, aucune route nouvelle). Hors liste : Planification (mode, sans sens sur une ligne de projet), Priorité, Chef. | 1 E2E par colonne (contenu, formats, virgule décimale) : +5 ; par colonne ajoutée : +1 |
| 3 | Persistance du choix : par navigateur (localStorage), par utilisateur (API), par projet ? | Par navigateur (localStorage), sans API ni migration ; défaut sans choix : colonnes actuelles. | localStorage : 2 (rechargement conserve, stockage indisponible). Par utilisateur : nouvelle table et route, +6 (API) et +2 (écran) |
| 4 | Largeurs : fixes ou redimensionnables ? | Fixes, resserrées comme aujourd'hui (D-134 (2), pas de défilement de la page à 1024 px) ; les colonnes ajoutées défilent dans la région du tableau. | Fixes : 2 (1440 et 1024 px, aucun défilement de la page). Redimensionnables : +4 (souris, clavier, persistance) |
| 5 | Ordre des colonnes modifiable ? | Non : ordre fixe (Code, Nom, colonnes cochées dans l'ordre ci-dessus, Début, Fin, Drapeaux). | Non : 1 (ordre). Oui (glisser ou boutons) : +5, accessibilité clavier comprise |
| 6 | Charge vendue (6c) : Vendu et Marge sur l'Accueil ? | Oui, seulement pour les projets où l'utilisateur a `peut_ecrire` (comme le Gantt de projet) ; cellule vide ailleurs ; marge négative en couleur flag ; pas de ligne de total. | 3 : visible pour un chef, vide pour un lecteur, marge négative |
| 7 | Sélecteur : où et comment ? | Bouton « Colonnes » de la barre d'outils, dialogue avec des cases à cocher (composants existants). Le dialogue est un dialogue d'action : à ajouter à la liste `sansGarde` de l'audit des dialogues (D-188), avec mise à jour de GDL-5. | 3 : ouverture, cochage immédiat, Échap sans confirmation |
| 8 | Lien partageable (`?colonnes=`) ? | Non. | Oui : +3 |
| 9 | Accessibilité : en-têtes, ordre de focus, nom du bouton ? | En-têtes de colonne ajoutés dans l'ordre visuel ; le bouton « Colonnes » précède le tableau dans l'ordre de focus. | 1 (focus et noms) |
| 10 | Apparence : @ui-designer, captures, mise à jour de docs/ui.md ? | Oui, captures à 1440 et 1024 px (une avec toutes les colonnes). | 1 (captures sans assertion) |

Décisions attendues du porteur : réponses aux questions 1 à 8 (les réponses par défaut valent accord si rien n'est dit). La question 7 touche à l'audit des dialogues : le test structurel GDL-5 (cinq dialogues sans garde) doit être révisé si le sélecteur est un dialogue.
