# Catalogue des tests hors moteur

Ajouts seulement : un identifiant n'est jamais renuméroté. Un nouveau test reçoit son identifiant ici avant d'être écrit.
Chaque ligne cite la section de `SPEC.md` qui fonde la règle ; un test d'outillage (CI) cite la décision de `docs/decisions.md`.
Un identifiant peut couvrir plusieurs tests : une ligne par titre de test.

## Tests rattachés à une règle de la spec

| id | énoncé | section SPEC | lot | fichier |
|---|---|---|---|---|
| AUTH-1 | email et mot de passe valides → 200 et cookie de session | 2 | 0 | packages/api/test/auth.test.ts |
| AUTH-2 | mot de passe faux → 401, aucun cookie | 2 | 0 | packages/api/test/auth.test.ts |
| AUTH-3 | utilisateur inactif → 401 | 3 (champ actif) | 0 | packages/api/test/auth.test.ts |
| AUTH-4 | route protégée sans session → 401 | 2 | 0 | packages/api/test/auth.test.ts |
| AUTH-5 | déconnexion → la session ne fonctionne plus | 2 | 0 | packages/api/test/auth.test.ts |
| AUTH-6 | mot de passe stocké haché en argon2, jamais en clair | 2 | 0 | packages/api/test/auth.test.ts |
| AUTH-7 | session de plus de 12 h → 401 | 2 | 0 | packages/api/test/auth.test.ts |
| AUTH-8 | le jeton de session est stocké haché en base (SHA-256 hexadécimal) | 2 | 0 | packages/api/test/auth.test.ts |
| AUTH-9 | un changement de mot de passe par l’administrateur révoque les sessions de l’utilisateur | 2 | 0bis | packages/api/test/lot0bis.test.ts |
| AUTH-9 | un changement de rôle révoque les sessions de l’utilisateur | 2 | 0bis | packages/api/test/lot0bis.test.ts |
| AUTH-10 | à la connexion, les sessions de plus de 12 h sont supprimées de la table | 2 | 0bis | packages/api/test/lot0bis.test.ts |
| AUTH-11 | la désactivation d’un utilisateur supprime ses sessions ; réactivé ensuite, son ancien cookie reste refusé (401) | 2 | correctifs | packages/api/test/correctifs.test.ts |
| USR-1 | l’administrateur crée, modifie, désactive et liste les utilisateurs | 2 | 0 | packages/api/test/users.test.ts |
| USR-2 | chef de projet et ressource → 403 sur ces routes | 2 | 0 | packages/api/test/users.test.ts |
| USR-3 | email déjà utilisé → erreur, rien n’est créé | 2 | 0 | packages/api/test/users.test.ts |
| USR-4 | valeurs par défaut : capacité 1, actif | 3 | 0 | packages/api/test/users.test.ts |
| USR-5 | le mot de passe haché n’apparaît dans aucune réponse de l’API | 2 | 0 | packages/api/test/users.test.ts |
| USR-6 | create-admin crée un administrateur actif ; même email → erreur, rien n’est créé | 2 | 0 | packages/api/test/users.test.ts |
| USR-7 | GET, POST et PATCH sur /api/utilisateurs sans session → 401 | 2 | 0 | packages/api/test/users.test.ts |
| USR-8 | un administrateur ne peut ni se désactiver ni changer son propre rôle → 409 | 2 | 0bis | packages/api/test/lot0bis.test.ts |
| USR-9 | désactiver ou rétrograder le dernier administrateur actif → 409 | 2 | 0bis | packages/api/test/lot0bis.test.ts |
| USR-9 | deux administrateurs qui se visent en même temps → il en reste un actif | 2 | 0bis | packages/api/test/lot0bis.test.ts |
| USR-10 | l’email est normalisé en minuscules à la création ; doublon de casse → 409 | 2 | 0bis | packages/api/test/lot0bis.test.ts |
| USR-10 | l’email est normalisé en minuscules à la modification | 2 | 0bis | packages/api/test/lot0bis.test.ts |
| USR-10 | la connexion ignore la casse de l’email | 2 | 0bis | packages/api/test/lot0bis.test.ts |
| USR-10 | create-admin normalise aussi l’email | 2 | 0bis | packages/api/test/lot0bis.test.ts |
| USR-11 | createAdmin sur un email existant rejette avec un message contenant l’email ; rien n’est créé | 2 | 0bis | packages/api/test/lot0bis.test.ts |
| USR-12 | createAdmin avec un email mal formé → erreur, rien n’est créé | 2 | correctifs | packages/api/test/correctifs.test.ts |
| USR-13-r1 | createAdmin avec un mot de passe vide → erreur, rien n’est créé (révision D-076) | 2, D-076 | correctifs | packages/api/test/correctifs.test.ts |
| LIC-1 | le contrôle passe sur les dépendances actuelles | 1 | 0 | scripts/test/licenses.test.ts |
| LIC-2 | GPL-3.0, AGPL-3.0 ou LGPL-3.0 → échec | 1 | 0 | scripts/test/licenses.test.ts |
| LIC-3 | BlueOak-1.0.0 en exécution → échec ; en outillage de développement → succès | 1 | 0 | scripts/test/licenses.test.ts |
| LIC-4 | licence absente ou « UNKNOWN » → échec, en exécution comme en développement | 1 | 0 | scripts/test/licenses.test.ts |
| LIC-5 | MPL-2.0 en exécution → échec ; en outillage de développement → succès | 1 | 0bis | scripts/test/licenses-mpl.test.ts |
| SAV-1 | backup.sh produit un fichier horodaté au format personnalisé | 8 | 0 | scripts/test/savegarde.test.ts |
| SAV-2 | restore.sh sans confirmation → rien n’est restauré | 8 | 0 | scripts/test/savegarde.test.ts |
| SAV-3 | restore.sh sur une base non vide → refus | 8 | 0 | scripts/test/savegarde.test.ts |
| SAV-4 | backup puis restore dans une base vide → mêmes utilisateurs | 8 | 0 | scripts/test/savegarde.test.ts |
| SAV-5 | fichier sans table schema_version → refus | 8 | 0 | scripts/test/savegarde.test.ts |
| MIG-1 | sur base vide, applique les migrations et renseigne schema_version | 8 | 0 | packages/api/test/migrations.test.ts |
| MIG-2 | base plus récente que l’application → refus, message explicite | 8 | 0 | packages/api/test/migrations.test.ts |
| MIG-3 | deuxième démarrage → aucune migration rejouée | 8 | 0 | packages/api/test/migrations.test.ts |
| MIG-4 | migration en échec → annulée en entier, schema_version inchangé | 8 | 0 | packages/api/test/migrations.test.ts |
| MIG-5 | après migration, schema_version = 8 ; travail_planifie : charge ≤ 0, doublon (assignation, jour) et assignation inexistante refusés, surcharge faux par défaut, suppression de l'assignation ou du projet supprime les lignes ; jalon.drapeaux = {} par défaut ; projet.debut_planifie et fin_planifiee nuls par défaut | 3, 5.1, D-044 | 2a-I | packages/api/test/migrations.test.ts |
| MIG-5-r1 | Révision de MIG-5 (D-031, tag tests-lot2a-i-r3) : schema_version = 1 à 9 ; reste inchangé | 3, 5.1, D-044, D-054 | 2a-I | packages/api/test/migrations.test.ts |
| MIG-5-r2 | Révision de MIG-5-r1 (D-031, tag tests-lot2a-i-r5) : schema_version = liste des versions tirée des fichiers de MIGRATIONS_DIR ; reste inchangé | 3, 5.1, D-059 (9) | 2e-I | packages/api/test/migrations.test.ts |
| E2E-1 | connexion par l’écran de connexion, arrivée sur l’accueil | 2 | 0 | e2e/tests/login.spec.ts |
| E2E-2 | mauvais mot de passe → message d’erreur, pas de navigation | 2 | 0 | e2e/tests/login.spec.ts |
| E2E-3 | l’administrateur crée un utilisateur par le formulaire et le voit dans la liste | 2 | 0 | e2e/tests/login.spec.ts |
| E2E-4 | l’administrateur se déconnecte par l’interface, l’accueil redirige vers /connexion | 2 | 0 | e2e/tests/login.spec.ts |
| CAL-1 | L’administrateur crée un calendrier ; les jours travaillés valent lun–ven par défaut | 3 | 1-T1 | packages/api/test/lot1-cal.test.ts |
| CAL-2 | Jours travaillés personnalisés (lun–jeu) enregistrés | 3 | 1-T1 | packages/api/test/lot1-cal.test.ts |
| CAL-3 | Ajout d’un jour férié ; la liste des dates le renvoie | 3 | 1-T1 | packages/api/test/lot1-cal.test.ts |
| CAL-4 | Retrait d’un jour férié | 3 | 1-T1 | packages/api/test/lot1-cal.test.ts |
| CAL-5 | Le calendrier d’un utilisateur se modifie par PATCH | 3 | 1-T1 | packages/api/test/lot1-cal.test.ts |
| CAL-6 | (révisé en CAL-6-r1, D-142) Chef de projet et ressource → 403 en écriture | 2 | 1-T1 | packages/api/test/lot1-cal.test.ts |
| CAL-7 | (révisé en CAL-7-r1, D-142) Routes calendriers sans session → 401 | 2 | 1-T1 | packages/api/test/lot1-cal.test.ts |
| CAL-8 | Un utilisateur créé sans calendrier reçoit le calendrier par défaut | 3 | 1-T1 | packages/api/test/lot1-cal.test.ts |
| CAL-9 | Les utilisateurs existants reçoivent le calendrier par défaut à la migration | 3 | 1-T1 | packages/api/test/lot1-cal.test.ts |
| CAL-10 | (révisé en CAL-10-r1, D-142) Supprimer le calendrier par défaut ou un calendrier utilisé par un utilisateur → 409 | 3 | 1-T1 | packages/api/test/lot1-cal.test.ts |
| CAL-11 | (révisé en CAL-11-r1, D-142) Jours travaillés vides ou hors 1–7 → 400 | 3 | 1-T1 | packages/api/test/lot1-cal.test.ts |
| CAL-12 | Tout utilisateur connecté lit les calendriers | 2 | 1-T1 | packages/api/test/lot1-cal.test.ts |
| CAL-13 | Modifier le nom d’un calendrier (PATCH sans `jours_travailles`) conserve ses jours travaillés et n’écrit aucune entrée d’historique pour ce champ | 3 | 1-T3 | packages/api/test/lot1-cal-patch.test.ts |
| PRJ-1 | Création : priorité 500, `clos` faux, `est_modele` faux par défaut | 3 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-2 | Code déjà utilisé → 409, rien n’est créé | 3 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-3 | Sous-projet créé avec un parent | 3 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-4 | Modification de nom, priorité, date de début, `clos` | 3 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-5 | Un chef de projet qui crée un projet en devient le chef | 2 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-6 | (révisé en PRJ-6-r1, D-142) Un chef modifie son projet ; le projet d’un autre chef → 404 | 2 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-7 | (révisé en PRJ-7-r1, D-142) Une ressource ne voit que les projets où elle est affectée ; projet non affecté → 404 ; écriture sur un projet affecté → 403 | 2 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-8 | L’administrateur voit et modifie tous les projets | 2 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-9 | (révisé en PRJ-9-r1, D-142) Routes projets sans session → 401 | 2 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-11 | Un chef lit et modifie les sous-projets de ses projets (portée par ancêtre) | 2 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-12 | Un chef ne voit que ses projets dans la liste | 2 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-13 | Cycle dans l’arborescence des projets (dont auto-parent) → 422 | 3 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-14 | Supprimer un projet ayant des sous-projets → 409 ; sans sous-projet → supprimé | 3 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-16 | (révisé en PRJ-16-r1, D-142) Priorité hors de 0 à 1000 → 400 | 3 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| AFF-1 | Affectation d’une ressource avec taux et dates facultatives | 3 | 1-T1 | packages/api/test/lot1-aff.test.ts |
| AFF-2 | Affecter un utilisateur non ressource → 422 | 2 | 1-T1 | packages/api/test/lot1-aff.test.ts |
| AFF-3 | (révisé en AFF-3-r1, D-142) Écriture réservée à l’administrateur et au chef du projet ; chef d’un autre projet → 404 ; ressource affectée → 403 | 2 | 1-T1 | packages/api/test/lot1-aff.test.ts |
| AFF-4 | La ressource voit les affectations d’un projet où elle est affectée ; projet non affecté → 404 | 2 | 1-T1 | packages/api/test/lot1-aff.test.ts |
| AFF-5 | Modification du taux et des dates | 3 | 1-T1 | packages/api/test/lot1-aff.test.ts |
| AFF-7 | Deuxième affectation de la même ressource au même projet → 409 | 3 | 1-T1 | packages/api/test/lot1-aff.test.ts |
| AFF-8 | (révisé en AFF-8-r1, D-142) Taux d’affectation hors de ]0 ; 100] → 400 | 3 | 1-T1 | packages/api/test/lot1-aff.test.ts |
| AFF-9 | (révisé en AFF-9-r1, D-142) Date de fin antérieure à la date de début → 422 | 3 | 1-T1 | packages/api/test/lot1-aff.test.ts |
| AFF-10 | Taux d’affectation 100 par défaut | 3 | 1-T1 | packages/api/test/lot1-aff.test.ts |
| ACT-1 | Création : priorité 500 et `close` faux par défaut | 3 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-2 | START sans début validé → 422 | 5.6 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-3 | STARR sans début validé → 422 | 5.6 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-4 | REGUL sans début validé ou sans fin validée → 422 | 5.6 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-5 | FDUR et DDUR sans durée → durée validée 1 | 5.6 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-6 | ALAP sans fin validée accepté | 5.6 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-7 | ASAP et MAN acceptés sans dates ni durée | 5.6 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-8 | Passer en START sans début validé par PATCH → 422 | 5.6 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-9 | Sous-activité créée sous une activité du même projet | 3 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-10 | Modification de nom, priorité, dates validées, `close` | 3 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-11 | Dates planifiées et drapeaux non modifiables par l’API → 400 | 3 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-12 | Chef de projet écrit sur ses projets ; projet d’un autre → 404 ; ressource affectée → 403 | 2 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-13 | La ressource lit les activités d’un projet où elle est affectée | 2 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-14 | (révisé en ACT-14-r1, D-142) Routes activités sans session → 401 | 2 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-16 | Parent d’un autre projet → 422 | 3 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-19 | Cycle dans l’arborescence des activités → 422 | 3 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-20 | Suppression d’une activité : avec enfants → 409 ; sans enfant → supprimée avec ses dépendances et assignations | 3 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-21 | (révisé en ACT-21-r1, D-142) Priorité d’activité hors de 0 à 1000 → 400 | 3 | 1-T2 | packages/api/test/lot1-act.test.ts |
| JLN-1 | Création d’un jalon flottant | 3 | 1-T2 | packages/api/test/lot1-jln.test.ts |
| JLN-2 | Jalon fixe sans date validée → 422 | 3 | 1-T2 | packages/api/test/lot1-jln.test.ts |
| JLN-3 | Jalon fixe avec date validée créé | 5.7 | 1-T2 | packages/api/test/lot1-jln.test.ts |
| JLN-4 | Jalon créé sous une activité du projet | 3 | 1-T2 | packages/api/test/lot1-jln.test.ts |
| JLN-5 | Passer un jalon en fixe sans date → 422 | 3 | 1-T2 | packages/api/test/lot1-jln.test.ts |
| JLN-6 | Chef de projet et administrateur écrivent ; chef d’un autre projet → 404 ; ressource affectée → 403 | 2 | 1-T2 | packages/api/test/lot1-jln.test.ts |
| JLN-7 | La ressource lit les jalons de son projet | 2 | 1-T2 | packages/api/test/lot1-jln.test.ts |
| JLN-8 | (révisé en JLN-8-r1, D-142) Routes jalons sans session → 401 | 2 | 1-T2 | packages/api/test/lot1-jln.test.ts |
| JLN-9 | Un jalon ne peut pas être parent → 422 | 3 | 1-T2 | packages/api/test/lot1-jln.test.ts |
| JLN-11 | Supprimer un jalon supprime ses dépendances | 3 | 1-T2 | packages/api/test/lot1-jln.test.ts |
| WBS-1 | Activités et jalons frères partagent une suite de rangs | 3 | 1-T2 | packages/api/test/lot1-wbs.test.ts |
| WBS-2 | Numérotation 1, 1.1, 1.2, 2 calculée de l’arborescence | 3 | 1-T2 | packages/api/test/lot1-wbs.test.ts |
| WBS-3 | Insérer à une position décale les frères suivants | 6 | 1-T2 | packages/api/test/lot1-wbs.test.ts |
| WBS-4 | Déplacer un élément sous un autre parent du même projet | 6 | 1-T2 | packages/api/test/lot1-wbs.test.ts |
| WBS-5 | Déplacer garde les enfants et leur ordre | 6 | 1-T2 | packages/api/test/lot1-wbs.test.ts |
| WBS-6 | L’ordre WBS est le parcours en profondeur (1, 1.1, 1.2, 2) | 5.2 | 1-T2 | packages/api/test/lot1-wbs.test.ts |
| WBS-7 | Déplacer sous une activité assignée → 422 | 3 | 1-T2 | packages/api/test/lot1-wbs.test.ts |
| WBS-8 | Déplacer : chef d’un autre projet → 404 ; ressource affectée → 403 ; sans session → 401 | 2 | 1-T2 | packages/api/test/lot1-wbs.test.ts |
| WBS-9 | Déplacer sous un de ses descendants → 422 | 3 | 1-T2 | packages/api/test/lot1-wbs.test.ts |
| WBS-10 | Déplacer sous un jalon → 422 | 3 | 1-T2 | packages/api/test/lot1-wbs.test.ts |
| WBS-11 | Déplacer vers un autre projet → 422 | 3 | 1-T2 | packages/api/test/lot1-wbs.test.ts |
| WBS-12 | Deux déplacements concurrents ne créent pas de cycle | 3 | 1-T2 | packages/api/test/lot1-wbs.test.ts |
| WBS-13 | Fratrie A, B, C : B à rang 3 → A, C, B ; B à rang 1 → B, A, C ; A à rang 2 inchangé ; rangs consécutifs, seul l'élément déplacé historisé | 3 | 1b | packages/api/test/lot1b-wbs.test.ts |
| WBS-14 | A à rang 99 → B, C, A ; sans rang inchangé ; sous un autre parent à rang 2 → D1, A, D2 ; à rang n+1 → fin de fratrie | 3 | 1b | packages/api/test/lot1b-wbs.test.ts |
| LIEN-1 | Création : type FD et délai 0 par défaut | 6 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-2 | Types DD et FF acceptés | 5.3 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-3 | Délai négatif accepté | 3 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-4 | Type inconnu → 400 | 3 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-5 | Un jalon est prédécesseur ou successeur | 3 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-6 | A→B puis B→A refusé, rien n’est créé | 5.2 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-7 | Cycle A→B→C→A refusé | 5.2 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-8 | Dépendance sur soi-même → 422 | 5.2 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-9 | Modifier le type ou le délai | 6 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-10 | Supprimer une dépendance | 6 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-11 | Chef d’un autre projet → 404 ; ressource affectée → 403 ; sans session → 401 | 2 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-12 | Dépendance en double → 409 | 3 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-13 | Dépendance entre deux projets → 422 | 3 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-14 | Dépendance entre un élément et son ancêtre ou son descendant → 422 | 3 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| LIEN-16 | Deux créations concurrentes ne forment pas de cycle | 5.2 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| ASS-1 | Création : taux 100 par défaut, charge réelle 0 | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-2 | Ressource non affectée au projet → 422 | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-3 | Assignation sur une activité parente → 422 | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-4 | Ajouter un enfant sous une activité assignée → 422 | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-5 | Assignation sur un jalon → 422 | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-6 | Charge 0,25 stockée et renvoyée exactement | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-7 | Modification de la charge assignée et du taux | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-8 | La charge réelle n’est pas modifiable par l’API | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-9 | Écriture chef et administrateur ; chef d’un autre projet → 404 ; ressource affectée → 403 ; sans session → 401 | 2 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-10 | La ressource lit les assignations d’un projet où elle est affectée | 2 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-11 | Deuxième assignation de la même ressource à la même activité → 409 | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-12 | (révisé en ASS-12-r1, D-142) Taux d’assignation hors de ]0 ; 100] → 400 | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-13 | Reste à faire initial égal à la charge assignée | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-14 | (révisé en ASS-14-r1, D-142) Charge avec plus de 2 décimales → 400 | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-15 | Supprimer une assignation : charge réelle > 0 → 409 ; sinon supprimée | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| AFF-6 | Supprimer l’affectation d’une ressource assignée → 409 | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| HIS-1 | Modifier un projet : entrée (utilisateur, date, champ, ancienne, nouvelle) | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-2 | Modifier une affectation | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-3 | Modifier une activité | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-4 | Modifier un jalon | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-5 | Modifier une dépendance (type, délai) | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-6 | Modifier une assignation (charge assignée) | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-7 | Déplacer un élément historise le parent | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-8 | La création est historisée | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-9 | La suppression est historisée | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-11 | Une valeur inchangée n’écrit aucune entrée | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-12 | Une modification refusée n’écrit aucune entrée ; modification et entrée sont atomiques | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-13 | Lecture de l’historique d’un projet : chef d’un autre projet → 404 ; ressource affectée → 403 | 2 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-14 | Les champs calculés par le moteur ne sont pas historisés | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| E2E-5 | L’administrateur crée un calendrier avec un jour férié | 3 | 1-T3 | e2e/tests/lot1.spec.ts |
| E2E-6-r1 | L’administrateur crée un projet (code, chef, « Pas avant le » ; la colonne « Début » n'affiche plus la date de création, D-078) | 3 | 1-T3 | e2e/tests/lot1.spec.ts |
| E2E-7 | Un chef affecte une ressource, crée une activité puis une sous-activité | 3 | 1-T3 | e2e/tests/lot1.spec.ts |
| E2E-8 | Un chef crée un jalon et une dépendance FD | 5.3 | 1-T3 | e2e/tests/lot1.spec.ts |
| E2E-9 | Un chef assigne une ressource ; une ressource non affectée n’est pas proposée | 3 | 1-T3 | e2e/tests/lot1.spec.ts |
| E2E-10 | Une ressource consulte le planning sans bouton d’écriture | 2 | 1-T3 | e2e/tests/lot1.spec.ts |
| E2E-11 | L’historique d’un projet est visible après une modification | 3 | 1-T3 | e2e/tests/lot1.spec.ts |
| PRJ-10 | Code « abc » puis « ABC » → 409, rien n’est créé | 3 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| PRJ-15 | Chef désigné : ressource, utilisateur inactif ou id inexistant → 422, à la création et au PATCH | 3 | 1-T1 | packages/api/test/lot1-prj.test.ts |
| AFF-11 | Un utilisateur affecté ne peut pas cesser d’être ressource → 409 ; sans affectation → 200 | 3 | 1-T1 | packages/api/test/lot1-aff.test.ts |
| ACT-15 | Mode ASAP par défaut | 3 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-17 | Fin validée antérieure au début validé → 422 | 3 | 1-T2 | packages/api/test/lot1-act.test.ts |
| ACT-18 | Durée validée inférieure à 1 → 422 | 3 | 1-T2 | packages/api/test/lot1-act.test.ts |
| JLN-10 | Jalon flottant : date validée facultative | 3 | 1-T2 | packages/api/test/lot1-jln.test.ts |
| LIEN-15 | (révisé en LIEN-15-r1, D-142) Délai de dépendance non entier → 400 | 3 | 1-T2 | packages/api/test/lot1-lien.test.ts |
| ASS-16 | (révisé en ASS-16-r1, D-142) Charge négative → 400 | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| ASS-17 | Tant que la charge réelle vaut 0, modifier la charge assignée recale le reste à faire | 3 | 1-T2 | packages/api/test/lot1-ass.test.ts |
| HIS-10 | La modification d’un calendrier est historisée | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| HIS-15 | Un déplacement historise l’élément déplacé, pas les rangs décalés de ses frères | 3 | 1-T3 | packages/api/test/lot1-his.test.ts |
| ANN-1 | GET /api/annuaire sans session → 401 | 2 | 1-T3 | packages/api/test/lot1-ann.test.ts |
| ANN-2 | Une ressource reçoit 200 et tous les utilisateurs, inactifs compris, triés par nom puis identifiant | 2 | 1-T3 | packages/api/test/lot1-ann.test.ts |
| ANN-3 | Chaque entrée a exactement les clés id, nom, role, est_ressource, actif (ni email, ni hachage, ni capacité, ni calendrier) | 2 | 1-T3 | packages/api/test/lot1-ann.test.ts |
| ANN-4 | Un chef de projet reçoit 200 et la même liste | 2 | 1-T3 | packages/api/test/lot1-ann.test.ts |
| PRJ-22 | `GET /api/projets` et `GET /api/projets/:id` portent `peut_ecrire` : vrai pour l’administrateur et le chef dans sa portée, faux pour une ressource affectée et un chef affecté à un projet hors de sa portée | 2 | 1-T3 | packages/api/test/lot1-pe.test.ts |
| PRJ-17 | Rattacher un projet à un parent (POST ou PATCH) exige le droit d’écriture sur ce parent ; non-régression, vert d’emblée | 3 | 1-T2 | packages/api/test/lot1-prj-t2.test.ts |
| PRJ-18 | Seul l’administrateur désigne ou change le chef ; un chef qui envoie un `chef_id` différent du sien (POST ou PATCH) → 403 ; sans `chef_id` il devient le chef | 3 | 1-T2 | packages/api/test/lot1-prj-t2.test.ts |
| PRJ-19 | Un refus sur un projet (404 pour un autre chef, 403 pour une ressource affectée) ne modifie ni ne supprime rien | 2 | 1-T2 | packages/api/test/lot1-prj-t2.test.ts |
| PRJ-20 | Un chef de projet ne s’attribue pas le sous-projet dont un autre est chef (PATCH `chef_id` différent du chef actuel → 403, chef inchangé) | 3 | 1-T2 | packages/api/test/lot1-refus.test.ts |
| LIEN-17 | Dépendance créée par le chef d’un projet avec des éléments d’un autre projet : toujours 422, jamais 409, que la dépendance existe ou non ; rien n’est créé | 2 | 1-T2 | packages/api/test/lot1-refus.test.ts |
| REF-1 | Routes de T1 (calendriers, fériés, projets, affectations, utilisateurs) : toute requête refusée laisse l’empreinte de la base identique | 2 | 1-T2 | packages/api/test/lot1-complements.test.ts |
| REF-2 | Routes de T2 (activités, jalons, déplacement, dépendances, assignations) : toute requête refusée laisse l’empreinte de la base identique | 2 | 1-T2 | packages/api/test/lot1-complements.test.ts |
| ID-1 | Identifiant 1e30, 2147483648, -1, 1.5 ou « abc » dans l’adresse, sur chaque famille de routes → 404, jamais 500 | 2 | 1-T2 | packages/api/test/lot1-complements.test.ts |
| PRJ-21 | Un chef de projet, ressource affectée au projet d’un autre chef, le lit (200, dans la liste, planning lisible) et ne peut pas y écrire (403) | 2 | 1-T2 | packages/api/test/lot1-complements.test.ts |
| PRJ-23 | Supprimer par l’administrateur un projet qui a une affectation, une activité et une assignation → 204 ; le projet, ses éléments, ses assignations et son travail planifié ont disparu. Supprimer l’affectation d’une ressource assignée reste refusé (409), base inchangée | 3 | 2a-I | packages/api/test/lot2a-suppression.test.ts |
| AFF-12 | Affecter une ressource inactive → 422, rien n’est créé | 3 | 1-T2 | packages/api/test/lot1-complements.test.ts |
| MOD-5 | POST /api/modeles par l’administrateur → 201, est_modele vrai, chef = l’administrateur ; absent de GET /api/projets, présent dans GET /api/modeles | 11.1 | 1b-A | packages/api/test/lot1b-mod.test.ts |
| MOD-6 | Un chef de projet lit GET /api/modeles, la fiche et le planning d’un modèle → 200, peut_ecrire faux | 11.1 | 1b-A | packages/api/test/lot1b-mod.test.ts |
| MOD-7 | Un chef reçoit 403 sur POST /api/modeles, PATCH et DELETE /api/projets/:id d’un modèle ; base inchangée | 11.1 | 1b-A | packages/api/test/lot1b-mod.test.ts |
| MOD-8 | Un chef reçoit 403 sur la création d’une activité, d’un jalon et d’une affectation dans un modèle ; base inchangée | 11.1 | 1b-A | packages/api/test/lot1b-mod.test.ts |
| MOD-9 | Une ressource reçoit 403 sur GET /api/modeles et 404 sur la fiche d’un modèle, même affectée | 11.1 | 1b-A | packages/api/test/lot1b-mod.test.ts |
| MOD-10 | GET /api/modeles sans session → 401 | 11.1 | 1b-A | packages/api/test/lot1b-mod.test.ts |
| MOD-11 | Sous-modèle accepté (201) ; parent ordinaire pour un modèle, parent modèle pour un projet → 422 ; base inchangée | 11.1 | 1b-A | packages/api/test/lot1b-mod.test.ts |
| MOD-12 | PATCH avec est_modele → 400, sur un projet comme sur un modèle ; base inchangée | 11.1 | 1b-A | packages/api/test/lot1b-mod.test.ts |
| MOD-13 | L’administrateur modifie puis supprime un modèle par /api/projets/:id ; entrées d’historique | 11.1 | 1b-A | packages/api/test/lot1b-mod.test.ts |
| MOD-14 | POST /api/modeles : corps invalide → 400, code déjà utilisé → 409 ; base inchangée | 11.1 | 1b-A | packages/api/test/lot1b-mod.test.ts |
| E2E-12 | L’administrateur crée un modèle, le voit dans « Modèles » et pas dans « Projets », crée une activité dans sa fiche | 11.1 | 1b-A | e2e/tests/lot1b.spec.ts |
| E2E-13 | Un chef voit le modèle, son planning, sans bouton d’écriture ; une ressource n’a pas le lien « Modèles » | 11.1 | 1b-A | e2e/tests/lot1b.spec.ts |
| E2E-14 | L’administrateur copie un projet (activité, Alice assignée) depuis « Projets », options par défaut : fiche de la copie avec activité et Alice ; copie dans « Projets » | 11.4 | 1b-C | e2e/tests/lot1b-c.spec.ts |
| E2E-15 | Un chef crée un projet depuis un modèle : fiche du projet, activité présente, projet dans « Projets », absent de « Modèles » | 11.4 | 1b-C | e2e/tests/lot1b-c.spec.ts |
| E2E-16 | L’administrateur copie avec « Enregistrer comme modèle » : résultat dans « Modèles », absent de « Projets » ; un chef n’a pas la case | 11.4 | 1b-C | e2e/tests/lot1b-c.spec.ts |
| E2E-17 | Un chef modifie une activité (nom, START, début validé), retrouve les valeurs, puis la supprime après confirmation | 3 | 1b-C | e2e/tests/lot1b-c.spec.ts |
| E2E-18 | Un chef modifie puis supprime un jalon (Fixe, date validée) et une dépendance (DD, délai 2) | 3 | 1b-C | e2e/tests/lot1b-c.spec.ts |
| E2E-19 | Un chef modifie une affectation (taux, dates), une assignation (charge), retire l’assignation, supprime l’affectation | 3 | 1b-C | e2e/tests/lot1b-c.spec.ts |
| E2E-20 | Trois activités sœurs : Descendre la première, Monter la troisième ; WBS suivent ; boutons désactivés aux extrémités | 3 | 1b-C | e2e/tests/lot1b-c.spec.ts |
| E2E-21 | L’administrateur modifie un calendrier (nom, samedi), supprime un jour férié puis le calendrier | 3 | 1b-C | e2e/tests/lot1b-c.spec.ts |
| E2E-22 | L’administrateur supprime un projet depuis sa fiche : retour à « Projets », projet absent ; Annuler ne supprime rien | 3 | 1b-C | e2e/tests/lot1b-c.spec.ts |
| E2E-23 | Lecture seule : une ressource n’a aucun bouton d’écriture ; un chef sur un modèle n’a que « Créer un projet depuis » | 2 | 1b-C | e2e/tests/lot1b-c.spec.ts |
| E2E-24 | Code déjà utilisé dans le dialogue de copie et dans « Nouveau modèle » : message, dialogue ouvert, rien de créé | 11.4 | 1b-C | e2e/tests/lot1b-c.spec.ts |
| E2E-25 | Trois activités sœurs : Descendre celle du milieu → troisième ; Monter celle du milieu → première ; numéros WBS vérifiés | 3 | 1b | e2e/tests/lot1b-wbs.spec.ts |
| COPIE-1 | Copie de P (A START 06/01, Alice 2 j, réel 1 j → B Bob 2 j, FD délai 1) au 01/02/2027 : A' début 03/02, assigné 2, réel 0, reste 2 ; dépendance A'→B' FD 1 ; P inchangé | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| COPIE-2 | COPIE-1 sans affectations : A' et B' sans assignation, aucune affectation projet sur la copie | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| COPIE-3 | P avec sous-projet P1 contenant C, option sous-projets : la copie a un sous-projet contenant C', arborescence et rangs identiques | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| COPIE-4 | Code cible déjà utilisé → 409, rien n'est créé | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| COPIE-5r | Historique de la copie : créations seulement, une par entité créée, au nom du copieur ; historique de P inchangé | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| COPIE-6 | Code dérivé d'un sous-projet déjà utilisé (CIBLE-S1) → 409, aucun projet, élément, affectation ni entrée d'historique créé | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| COPIE-7 | Un chef copie son projet clos (activité close, chef d'origine autre) : chef = copieur, parent_id nul, clos et close faux, priorité identique | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| COPIE-8 | Refus de droits, base inchangée : sans session 401 ; projet illisible 404 ; lisible sans écriture 403 ; ressource affectée 403 | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| COPIE-9 | Décalage : source 04/01/2027, cible 01/02/2027 : affectation, jalon, activité, sous-projet décalés de 28 jours ; dates vides restent vides | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| COPIE-10 | sous_projets faux : un seul projet créé avec son contenu direct, aucun sous-projet | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| COPIE-11 | Copie d'un sous-projet seul : la copie a parent_id nul | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| COPIE-12 | Ressource inactive : ni affectation ni assignation copiées pour elle ; celles de l'autre ressource le sont | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| COPIE-13 | Corps invalide (code vide, date mal formée, clé inconnue) → 400, base inchangée | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| MOD-3 | Créer depuis un modèle M (chef de projet), début 01/02/2027 : est_modele faux, contenu selon 11.2, chef = ce chef | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| MOD-4 | Enregistrer comme modèle (administrateur) P de COPIE-1 : est_modele vrai, réel 0, P inchangé | 11.4 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| MOD-15 | Un chef envoie est_modele vrai → 403, base inchangée | 11.3 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| MOD-16 | Une ressource copie un modèle → 404, base inchangée | 11.3 | 1b-B | packages/api/test/lot1b-copie.test.ts |
| CALC-1 | ASAP-1 en base, Alice 5 j, POST par l'administrateur → 200 ; 5 lignes de travail de 1,00 du 04 au 08/01, surcharge faux ; activité et projet 04 → 08/01, drapeaux {} | 5.1, 5.5, D-044 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-2 | Le chef de P calcule P avec un sous-projet S (même chef) contenant une activité → 200 ; S est calculé (travail en base, présent dans projets) | 5.1, 2 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-3 | Chef B calcule P de Chef A (illisible pour lui) → 404 ; empreinte inchangée | 2 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-4 | Alice (rôle ressource) → 403 ; empreinte inchangée | 2 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-5 | Sans session → 401 ; empreinte inchangée | 2 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-6 | Corps invalides ({}, projets vide, non tableau, non entier, 0, d0 mal formé, clé inconnue) → 400 ; empreinte inchangée | D-044 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-7 | Deux calculs consécutifs : état (travail, dates) identique, aucun doublon | 5.1 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-8 | Chef A calcule P1 ; le travail de P2 (non sélectionné, Alice 3 j déjà posés) est consommé et inchangé : activité de 2 j posée les 07 et 08/01 | 5.1 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-9 | Activité en mode START dans P → 422 mode_non_calcule avec l'id ; le travail antérieur est conservé, empreinte inchangée | 5.2, D-042 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-10 | Après un calcul, la table historique est identique à l'avant | 3 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-11 | Parent X (A1 Alice 2 j, A2 Bob 3 j) et jalon fixe J validé 05/01 en FD depuis X : X 04 → 06/01 ; J planifié 05/01, drapeau retard ; projet 04 → 06/01 | 5.3, 5.8, 5.9 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-12 | Échec de l'UPDATE de projet (trigger de test) après un calcul antérieur → 500, purge annulée, empreinte inchangée | D-044 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-13 | Deux POST simultanés sur deux projets distincts, ressource commune : deux 200, somme par jour ≤ 1,00, 10 jours posés | 5.1, D-044 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-14 | Chef B affecté comme ressource à P de Chef A (lisible, lecture seule) → 403 ; empreinte inchangée | 2 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-15 | d0 omis, horloge injectée 2027-01-04 : travail posé dès le 04/01, réponse d0 = 2027-01-04 ; horizonDe : 2027-01-04 → 2030-01-04, 2028-02-29 → 2031-02-28 | 5.1, D-044 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-16 | Projet clos sélectionné → 200, ignoré (motif clos), son travail est conservé et consommé ; un sous-projet clos d'un projet sélectionné n'est pas calculé | 5.1 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-17 | Alice affectée à P du 06 au 08/01, activité 5 j : 3 lignes, avertissement reste_non_pose (reste 2), non persisté | 4, D-042 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-18 | Sélection d'un sous-projet S (parent R hors sélection) et d'un autre projet T → 200 ; R et ses données intacts | 5.1 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-19 | REMP-2 en base : capacité 1,5, taux 33,33, charge 1 → 0,49, 0,49, 0,02 les 04, 05, 06/01 | 5.4, D-044 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-20 | Projet inconnu dans la sélection → 404 ; empreinte inchangée | 2 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| MOD-1 | Modèle M dans la sélection avec P → 200 ; M ignoré (motif modele), aucun travail planifié pour M, M inchangé | 11.4 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-21 | Ressource désactivée (actif faux) ayant une assignation dans P : le calcul répond 200 et pose son travail | 5.1, D-044 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-22 | Alice sur un calendrier mar–sam avec le 06/01/2027 férié, activité Alice 3 j : travail les 05, 07 et 08/01 | 4, D-044 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-23 | Sélection réduite à un modèle : 200, projets [], ignores [{ id, motif modele }], base inchangée | 11.1, D-044 | 2a-I | packages/api/test/lot2a-calcul.test.ts |
| TRX-1 | Deux transactionSerialisee de même clé lancées ensemble ne se chevauchent pas | D-044 4 | 2a-I | packages/api/test/lot2a-transaction.test.ts |
| TRX-2 | Transaction en REPEATABLE READ ; après succès comme après échec de fn, aucun verrou consultatif ne reste pris, et l'échec annule les écritures | D-044 4 | 2a-I | packages/api/test/lot2a-transaction.test.ts |

## Tests d'outillage, fondés sur une décision

Fondés sur une décision (`docs/decisions.md`), pas sur une section de la spec.

| id | énoncé | décision | lot | fichier |
|---|---|---|---|---|
| CI-1 | le workflow ci.yml ne se déclenche pas sur un push de tag (push limité aux branches) et garde pull_request | D-020 | correctifs | scripts/test/ci.test.ts |

## Tests du moteur ajoutés hors tableaux de la spec (2a-M)

Les ids ASAP, DEP et JAL de la spec ne figurent pas ici.

| id | énoncé | section SPEC | lot | fichier |
|---|---|---|---|---|
| CALM-1 | Férié 06/01 sauté (04, 05, 07) ; calendrier mar–sam : posé le 05/01, samedi ouvré | 4 | 2a-M | packages/engine/test/calendrier.test.ts |
| CALM-2 | Délais FD +2, 0, −1 suivent le calendrier par défaut même si la ressource est sur mar–sam | 4, 5.3 | 2a-M | packages/engine/test/calendrier.test.ts |
| DISPO-1 | Disponibilité diminuée du travail externe et du réel ; plancher à 0 | 4 | 2a-M | packages/engine/test/calendrier.test.ts |
| DISPO-2 | Calendriers de ressource distincts, départ un samedi : Bob le 09/01, Alice le 11/01 | 4 | 2a-M | packages/engine/test/calendrier.test.ts |
| DISPO-3 | Affectation projet limitée à 06–08/01 : reste non posé, avertissement | 4 | 2a-M | packages/engine/test/calendrier.test.ts |
| TRI-1 | Départage : priorité projet, priorité activité, WBS | 5.2 | 2a-M | packages/engine/test/remplissage.test.ts |
| TRI-2 | Départage entre éléments prêts après ordre topologique (prédécesseur toujours avant) | 5.2 | 2a-M | packages/engine/test/remplissage.test.ts |
| REMP-1 | Travail externe 0,50 par jour : activité de 5 j posée à 0,50 j/jour sur 10 jours ouvrés | 5.4 | 2a-M | packages/engine/test/remplissage.test.ts |
| REMP-2 | Plafond d'assignation = plancher(capacité × taux) : 0,49, 0,49, 0,02 | 5.4 | 2a-M | packages/engine/test/remplissage.test.ts |
| REMP-3 | 3,5 j à 100 % : 1, 1, 1, 0,5 | 5.4 | 2a-M | packages/engine/test/remplissage.test.ts |
| REMP-4 | Début au plus tôt : D0 un samedi ou début de projet postérieur à D0 | 5.3 | 2a-M | packages/engine/test/remplissage.test.ts |
| REMP-5 | Réel conservé, reste posé à partir de D0 ; dates incluant le réel | 5.1, 5.4 | 2a-M | packages/engine/test/remplissage.test.ts |
| REMP-6 | Barre sans assignation (durée validée) ou assignation de charge 0 : barre d'1 jour | 5.4 | 2a-M | packages/engine/test/remplissage.test.ts |
| DEPM-1 | FD délai négatif, borné par D0 | 5.3 | 2a-M | packages/engine/test/dependances.test.ts |
| DEPM-2 | FF qui ne tient pas : repli au plus tôt, sans drapeau | 5.3 | 2a-M | packages/engine/test/dependances.test.ts |
| DEPM-3 | Deux prédécesseurs FD : le plus tardif commande | 5.3 | 2a-M | packages/engine/test/dependances.test.ts |
| DEPM-4 | Prédécesseur parent : fin agrégée | 5.3 | 2a-M | packages/engine/test/dependances.test.ts |
| DEPM-5 | Successeur parent : contrainte sur chacun de ses descendants | 5.3 | 2a-M | packages/engine/test/dependances.test.ts |
| DEPM-6 | Chaîne activité → jalon flottant → activité | 5.3 | 2a-M | packages/engine/test/dependances.test.ts |
| DEPM-7 | FF vers une barre sans assignation : barre de la durée validée finissant à la fin cible, aucun drapeau | 5.3 | 2a-M | packages/engine/test/dependances.test.ts |
| JALM-1 | Jalon flottant sans prédécesseur : max de D0 et début de projet, jour ouvré suivant | 5.3 | 2a-M | packages/engine/test/dependances.test.ts |
| JALM-2 | Jalon flottant FD avec délai 1 | 5.3 | 2a-M | packages/engine/test/dependances.test.ts |
| JALM-3 | Jalon fixe respecté (FD) ou sans prédécesseur : à sa date validée, pas de drapeau | 5.3, 5.9 | 2a-M | packages/engine/test/dependances.test.ts |
| JALM-4 | Jalon flottant en DD, FF, avec date validée « pas avant » | 5.3 | 2a-M | packages/engine/test/dependances.test.ts |
| AGR-1 | Parents imbriqués et jalon enfant en FD délai 1 : jalon le 07/01, Y 04 → 06/01, X 04 → 07/01 | 5.8 | 2a-M | packages/engine/test/agregation.test.ts |
| AGR-2 | Projet racine et sous-projet agrégés | 5.8 | 2a-M | packages/engine/test/agregation.test.ts |
| AGR-3 | Avancement en centièmes de %, null si réel + reste = 0 | 5.8 | 2a-M | packages/engine/test/agregation.test.ts |
| AGR-4 | Projet dont le parent est absent de l'entrée : aucune exception, dates et charges agrégées ; sous-projet d'un tel projet agrégé dans son parent | 5.8, D-044 | 2a-I | packages/engine/test/projets-partiels.test.ts |
| CLOS-1 | Activité close non replanifiée : aucun travail, dates null, reste 0 | 5.1 | 2a-M | packages/engine/test/agregation.test.ts |
| ERR-1 | Cycle A→B→C→A : cycle_dependances, ids triés | 5.2 | 2a-M | packages/engine/test/erreurs.test.ts |
| ERR-2 | Mode non calculé : mode_non_calcule, ids triés (révisé à chaque lot, D-031) | 5.2, D-042 | 2a-M | packages/engine/test/erreurs.test.ts |
| ERR-3 | Horizon atteint : on pose ce qui tient, avertissement reste_non_pose | D-042 | 2a-M | packages/engine/test/erreurs.test.ts |
| ERR-4 | Entrée gelée : aucune mutation, sorties égales, aucune exception | 5.1 | 2a-M | packages/engine/test/erreurs.test.ts |
| ERR-5 | Cycle par agrégation d'un parent : cycle_dependances | 5.3 | 2a-M | packages/engine/test/erreurs.test.ts |
| ERR-6 | Entrée invalide : entree_invalide avec ids des éléments fautifs | D-042 | 2a-M | packages/engine/test/erreurs.test.ts |

## Tests du lot 2b (D-047)

| ID | Énoncé | Section | Tranche | Fichier |
|---|---|---|---|---|
| START-4 | Barre sans assignation, début validé 06/01 : barre le 06/01 ; début validé sam 09/01 : 11/01 ; charge 0 | 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| START-5 | Travail réel avant le début validé : les dates débutent au réel | 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| START-6 | D0 = 11/01, début validé 06/01 : pose dès le 11/01 | 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| START-7 | Activité enfant d'un parent successeur FD : contrainte héritée | 5.3, 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| STARR-4 | STARR avec FD finissant le 08/01 : 11 et 12/01, drapeau debut_non_respecte, pas de dependance_non_respectee | 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| STARR-5 | Deux STARR (validés 05 et 06/01, Alice 2 j chacun) : 05 et 06/01 puis 07 et 08/01 avec drapeau | 5.2, 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| STARR-6 | STARR-1 : aucun drapeau sur Y ni sur X | 5.6, 5.9 | 2b-M | packages/engine/test/modes-2b.test.ts |
| STARR-7 | STARR sans assignation, début validé 06/01 : barre le 06/01, aucun drapeau | 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| STARR-8 | D0 = 11/01, début validé 06/01 : pose dès le 11/01, drapeau debut_non_respecte | 5.6, 5.9 | 2b-M | packages/engine/test/modes-2b.test.ts |
| ALAP-5 | FD finissant le 08/01, fin validée 15/01, Alice 3 j : 13, 14 et 15/01 | 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| ALAP-6 | ALAP-5 avec fin validée 12/01 : repli ASAP 11, 12 et 13/01, drapeau retard | 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| ALAP-7 | FF délai 0 sur P finissant le 08/01, fin validée 15/01, Alice 2 j : 07 et 08/01, sans retard | 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| ALAP-8 | Même FF, fin validée 06/01 : 07 et 08/01, drapeau retard | 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| ALAP-9 | Sans assignation, durée 3, fin validée 15/01 : barre du 13 au 15/01 | 5.6, D-047 | 2b-M | packages/engine/test/modes-2b.test.ts |
| ALAP-10 | Sans assignation, durée 5, fin validée 06/01 : barre du 04 au 08/01, drapeau retard | 5.6, D-047 | 2b-M | packages/engine/test/modes-2b.test.ts |
| ALAP-11 | ALAP WBS 1 (fin validée 08/01, Alice 3 j) et ASAP WBS 2 (Alice 5 j) : ALAP les 06, 07 et 08/01 ; ASAP les 04, 05, 11, 12 et 13/01 | 5.2, 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| ALAP-12 | Travail réel avant D0, reste posé à rebours : dates du réel au dernier jour posé | 5.4, 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| DRAP-1 | Enfant STARR en retard sous un parent : drapeau sur l'enfant, drapeaux vides sur le parent | 5.6, 5.9 | 2b-M | packages/engine/test/modes-2b.test.ts |
| DRAP-2 | Parent de mode START sans début validé, ou ALAP avec fin validée : ignorés, aucune erreur | 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| DRAP-3 | ASAP avec fin validée dépassée : pas de retard | 5.9, D-047 | 2b-M | packages/engine/test/modes-2b.test.ts |
| DRAP-4 | Activité close en START : rien posé, aucun drapeau | 5.1, 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| ERR-2-r1 | Révision de ERR-2 (D-031) : FDUR et DDUR donnent mode_non_calcule, ids triés ; START, STARR et ALAP calculent sans erreur | 5.2, D-047 | 2b-M | packages/engine/test/erreurs.test.ts |
| ERR-4b | Entrée gelée avec les trois modes : aucune mutation | 5.1 | 2b-M | packages/engine/test/erreurs.test.ts |
| ERR-7 | START ou STARR sans debutValide : entree_invalide avec l'id | 5.6, D-047 | 2b-M | packages/engine/test/erreurs.test.ts |
| CALC-9-r1 | Révision de CALC-9 (D-031) : activité FDUR dans P → 422 mode_non_calcule avec l'id ; travail antérieur conservé, empreinte inchangée | 5.2, D-047 | 2b-I | packages/api/test/lot2a-calcul.test.ts |
| CALC-24 | POST /api/calcul sur un projet portant START-1, STARR-1, STARR-5 et ALAP-3, une ressource distincte par scénario : travail, dates et drapeaux lus en base égaux aux attendus de ces cas (debut_non_respecte sur le second STARR de STARR-5, retard sur ALAP-3, drapeaux vides ailleurs) ; un second calcul laisse la base identique | 5.6, 5.9 | 2b-I | packages/api/test/lot2b-calcul.test.ts |
| CALC-26 | Après CALC-24, fin validée de l'ALAP portée au 08/01 puis recalcul : travail du 04 au 08/01, drapeau retard retiré en base | 5.6, 5.9 | 2b-I | packages/api/test/lot2b-calcul.test.ts |
| CALC-25 | Sélection : projet lisible en lecture seule puis projet inconnu → 404 ; empreinte inchangée | 2, D-047 | 2b-0 | packages/api/test/lot2b-reprises.test.ts |
| TRX-3 | Si pg_advisory_lock échoue, la connexion est détruite et non rendue au pool | D-044 4 | 2b-0 | packages/api/test/lot2b-reprises.test.ts |
| STARR-9 | STARR, début validé sam 09/01, Alice 1 j : 11/01, drapeau debut_non_respecte | 5.6, D-047 Q5 | 2b-M | packages/engine/test/modes-2b.test.ts |
| ALAP-13 | ALAP, fin validée 15/01, début validé 14/01, Alice 3 j : 13, 14 et 15/01, aucun drapeau | 5.6, D-047 Q6 | 2b-M | packages/engine/test/modes-2b.test.ts |
| ALAP-14 | ALAP, fin validée 08/01, Alice 2 j et Bob 2 j sur la même activité, travail externe d'Alice 1 j les 05, 06, 07 et 08/01 : repli global, Alice les 04 et 11/01, Bob les 04 et 05/01, début 04/01, fin 11/01, drapeau retard | 5.6, D-047 Q8 | 2b-M | packages/engine/test/modes-2b.test.ts |
| ALAP-15 | ALAP, fin validée sam 16/01, Alice 3 j : 13, 14 et 15/01, aucun drapeau | 5.6 | 2b-M | packages/engine/test/modes-2b.test.ts |

## Tests du lot 2c (D-049)

| ID | Énoncé | Section | Tranche | Fichier |
|---|---|---|---|---|
| FDUR-1 | Durée 5, aucune assignation : barre du 04 au 08/01, charge 0, aucun drapeau | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-2 | Durée 5, Alice 2 j : 0,4 j/jour du 04 au 08/01, aucun drapeau | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-3 | Durée 2, Alice 3 j : 1 j les 04, 05 et 06/01 ; fin le 06/01, drapeau retard | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-4 | Durée 3, Alice 1 j : 0,33 le 04, 0,34 le 05, 0,33 le 06/01 (arrondi au demi supérieur, cible recalculée) ; aucun drapeau | 5.4, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-5 | Durée 5, Alice 4 j, travail externe d'Alice 1 j le 05/01 : 0,8 le 04, 1 j les 06, 07 et 08, 0,2 le 11/01 ; fin 11/01, drapeau retard | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-6 | Durée 5, Alice assignée 5 j, réel 2 j les 04 et 05/01, reste 3 j, D0 = 06/01 : 1 j les 06, 07 et 08/01 ; dates du 04 au 08/01 ; aucun drapeau (D-049 Q1) | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-7 | Durée 2, Alice assignée 4 j, réel 1 j le 04/01, reste 3 j, D0 = 06/01 : fenêtre écoulée, ASAP les 06, 07 et 08/01 ; dates du 04 au 08/01 ; drapeau retard (D-049 Q1) | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-8 | Prédécesseur FD (Bob 5 j) finissant le 08/01, durée 2, Alice 2 j : 1 j les 11 et 12/01 | 5.3, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-9 | Début validé 06/01, durée 2, Alice 1 j : 0,5 j les 06 et 07/01 | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-10 | FF délai 0 sur P (Bob 5 j) finissant le 08/01, durée 2, Alice 2 j : fenêtre calée 07–08/01, 1 j les 07 et 08/01 ; aucun drapeau | 5.3, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-11 | FF sur P (Bob 1 j le 04/01), durée 3, Alice 3 j : repli, fenêtre 04–06/01, 1 j par jour ; aucun drapeau | 5.3, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-12 | Durée 2, Alice 2 j et Bob 3 j sur la même activité : Alice 1 j les 04 et 05/01 ; Bob 1 j les 04, 05 et 06/01 ; fin 06/01, drapeau retard (reliquat par assignation) | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-13 | Alice en mar–sam, durée 5, Alice 5 j : 1 j les 05, 06, 07, 08 et 09/01 ; fin 09/01, drapeau retard (D-049 Q2) | 4, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-14 | Activité close en FDUR : rien posé, aucun drapeau ; parent en FDUR (enfant ASAP Alice 1 j) : mode ignoré, drapeaux vides | 5.1, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-15 | Durée validée absente (défaut 1) : Alice 2 j → 1 j les 04 et 05/01, drapeau retard ; sans assignation → barre le 04/01, aucun drapeau | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-16 | Taux 50 %, durée 2, Alice 2 j : 0,5 j les 04, 05, 06 et 07/01 ; drapeau retard | 5.4, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| FDUR-17 | Alice en mar–sam, durée 1, Alice 1 j : aucun jour ouvré d'Alice dans la fenêtre, 1 j le 05/01 ; drapeau retard (D-049 Q2) | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-1 | Durée 5, Alice 2 j : 0,4 j/jour du 04 au 08/01, aucune surcharge, aucun drapeau | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-2 | Durée 2, Alice 3 j : 1,5 j les 04 et 05/01, surcharge 0,5 j par jour ; fin 05/01 ; drapeaux exactement [surcharge] | 5.6, 5.9 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-3 | Durée 5, début validé 11/01, Alice 5 j, travail externe d'Alice 1 j le 13/01 : 1 j/jour du 11 au 15/01 ; surcharge 1 j le 13/01 seulement ; drapeaux [surcharge] (saisie manuelle au lot 2e) | 5.6, 5.9 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-4 | Durée 3, Alice 1 j : 0,33 / 0,34 / 0,33 les 04, 05 et 06/01 ; aucune surcharge | 5.4, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-5 | Taux 50 %, durée 2, Alice 2 j : 1 j les 04 et 05/01 (plafond d'assignation ignoré), aucune surcharge | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-6 | DDUR WBS 1 (durée 2, Alice 3 j) puis ASAP WBS 2 (Alice 1 j) : DDUR 1,5 j les 04 et 05/01 ; ASAP le 06/01 (la charge DDUR consomme la disponibilité) | 5.2, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-7 | ASAP WBS 1 (Alice 1 j) puis DDUR WBS 2 (durée 2, Alice 3 j) : ASAP le 04/01 ; DDUR 1,5 j les 04 et 05/01, surcharge 1,5 j le 04 et 0,5 j le 05/01 | 5.2, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-8 | Prédécesseur FD (Bob 5 j) finissant le 08/01, durée 2, Alice 3 j : 1,5 j les 11 et 12/01, surcharge 0,5 j par jour | 5.3, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-9 | Alice en mar–sam, durée 5, Alice 5 j : 1,25 j les 05, 06, 07 et 08/01, surcharge 0,25 j par jour ; drapeaux [surcharge] | 4, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-10 | Alice affectée au projet à partir du 06/01, durée 2, Alice 2 j : 1 j les 04 et 05/01, surcharge 1 j chacun (D-049 Q3) | 4, 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-11 | Durée 2, Alice 3 j et Bob 2 j sur la même activité : Alice 1,5 j les 04 et 05/01 avec surcharge 0,5 j ; Bob 1 j les 04 et 05/01 sans surcharge ; drapeaux de l'activité [surcharge] | 5.6, 5.9 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-12 | Alice en mar–sam, durée 1, Alice 1 j : 1 j le 04/01, surcharge 1 j, drapeaux [surcharge], pas de retard (D-049 Q2) | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-13 | Durée 5, Alice assignée 5 j, réel 2 j les 04 et 05/01, reste 3 j, D0 = 06/01 : 1 j les 06, 07 et 08/01 ; dates du 04 au 08/01 ; aucun drapeau (D-049 Q1) | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-14 | Durée 2, Alice assignée 4 j, réel 1 j le 04/01, reste 3 j, D0 = 06/01 : fenêtre écoulée, ASAP les 06, 07 et 08/01 ; drapeau retard ; aucune surcharge (D-049 Q1) | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| DDUR-15 | Durée 5, aucune assignation : barre du 04 au 08/01, charge 0, aucun drapeau | 5.6 | 2c-M | packages/engine/test/modes-2c.test.ts |
| ERR-8 | FDUR ou DDUR sur une feuille ouverte avec dureeValidee 0 ou 1,5 : entree_invalide, ids triés ; activité close et parent non contrôlés | 5.6 | 2c-M | packages/engine/test/erreurs.test.ts |
| ERR-2-r2 | Révision de ERR-2 (D-031, tag tests-lot2a-m-r2) : REGUL et MAN donnent mode_non_calcule, ids triés ; START, STARR, ALAP, FDUR et DDUR calculent sans erreur | 5.2, D-049 | 2c-0 | packages/engine/test/erreurs.test.ts |
| CALC-9-r2 | Révision de CALC-9 (D-031, tag tests-lot2a-i-r2) : activité MAN dans P → 422 mode_non_calcule avec l'id ; travail antérieur conservé, empreinte inchangée | 5.2, D-049 | 2c-0 | packages/api/test/lot2a-calcul.test.ts |
| FDUR-18 | D0 = 06/01, FDUR durée 5, Alice assignée 5 j, réel 1 j le 04/01, reste 4 j, prédécesseur FD (Bob 1 j, posé le 06/01) : fenêtre 04–08/01, cibles les 07 et 08/01 seulement ; Alice 1 j les 07, 08, 11 et 12/01 ; dates du 04 au 12/01 ; retard | 5.6, D-050 | 2c-R | packages/engine/test/modes-2c-reprises.test.ts |
| FDUR-19 | D0 = 06/01, FDUR durée 5, début validé 08/01, Alice assignée 5 j, réel 1 j le 04/01, reste 4 j : 1 j les 08, 11, 12 et 13/01 ; dates du 04 au 13/01 ; retard | 5.6, D-050 | 2c-R | packages/engine/test/modes-2c-reprises.test.ts |
| DDUR-16 | Données de FDUR-18 en DDUR : 2 j les 07 et 08/01, surcharge 1 j par jour ; dates du 04 au 08/01 ; drapeau surcharge, pas de retard | 5.6, D-050 | 2c-R | packages/engine/test/modes-2c-reprises.test.ts |
| CALC-27 | POST /api/calcul sur un projet portant FDUR-2, FDUR-3 et DDUR-2, une ressource distincte par scénario : travail, surcharge (booléen), dates et drapeaux lus en base égaux aux attendus (retard sur FDUR-3, surcharge sur DDUR-2, vides ailleurs) ; un second calcul laisse la base identique | 5.6, 5.9 | 2c-I | packages/api/test/lot2c-calcul.test.ts |
| CALC-28 | DDUR-3 par l'API, travail planifié d'Alice 1 j le 13/01 dans un projet non sélectionné : 1 j par jour du 11 au 15/01 ; surcharge vraie le 13/01 seulement ; drapeau surcharge sur l'activité | 5.6, 5.9 | 2c-I | packages/api/test/lot2c-calcul.test.ts |
| CALC-29 | Après CALC-27, durée de l'activité de FDUR-3 portée de 2 à 5 puis recalcul : travail 0,6 j du 04 au 08/01, drapeau retard retiré en base | 5.6, 5.9 | 2c-I | packages/api/test/lot2c-calcul.test.ts |
| FDUR-20 | D0 = 05/01, FDUR durée 2, Alice assignée 3 j, réel 1 j le 04/01, reste 2 j, prédécesseur FD (Bob 2 j, posé les 05 et 06/01) : fenêtre 04–05/01 vide (début au plus tôt 07/01), Alice 1 j les 07 et 08/01 ; dates du 04 au 08/01 ; retard. Caractérisation, vert d'emblée | 5.6, D-051 | 2d-0 | packages/engine/test/modes-2c-reprises.test.ts |
| DDUR-17 | Données de FDUR-20 en DDUR : Alice 1 j les 07 et 08/01, aucune surcharge ; dates du 04 au 08/01 ; drapeau retard seul. Caractérisation, vert d'emblée | 5.6, D-051 | 2d-0 | packages/engine/test/modes-2c-reprises.test.ts |
| FDUR-21 | Durée 2, Alice assignée 2 j, Alice non affectée au projet : rien posé ; avertissement reste_non_pose (assignation 1, reste 200) ; barre du 04 au 05/01 ; aucun drapeau. Caractérisation, vert d'emblée | 5.9, D-051 | 2d-0 | packages/engine/test/modes-2c-reprises.test.ts |
| ERR-2-r3 | Révision de ERR-2 (D-031, tag tests-lot2a-m-r3) : seul MAN donne mode_non_calcule, ids triés ; REGUL avec ses deux dates, START, STARR, ALAP, FDUR et DDUR calculent sans erreur | 5.2, D-051 | 2d-0 | packages/engine/test/erreurs.test.ts |
| REGUL-1 | Fenêtre 04–15/01, Alice 5 j : 0,5 j par jour sur les 10 jours ouvrés ; dates du 04 au 15/01 ; aucun drapeau | 5.6 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-2 | REGUL-1 et une activité ASAP (Alice 5 j) : l'activité ASAP reçoit 0,5 j par jour du 04 au 15/01 ; aucun drapeau | 5.2, 5.6 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-3 | Fenêtre 04–06/01, Alice 5 j : 1 j par jour du 04 au 06/01, puis 07 et 08/01 ; dates du 04 au 08/01 ; retard | 5.6 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-4 | D0 = 11/01, fenêtre 04–15/01, assigné 10 j, réel 1 j les 04, 05 et 06/01 (choix de données), reste 7 j : 1 j par jour du 11 au 15/01, puis 18 et 19/01 ; dates du 04 au 19/01 ; retard | 5.6 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-5 | P (ASAP, Alice 10 j, priorité 900) → R (REGUL, Bob 5 j, 04–08/01) → S (ASAP, Alice 1 j, priorité 100) ; T (ASAP, Alice 5 j, priorité 500) ; dépendances FD délai 0 : R sort de l'ordre de la passe B ; R 1 j du 04 au 08/01 ; S le 11/01 ; T du 04 au 08/01 ; P les 12, 13, 14, 15, 18, 19, 20, 21, 22 et 25/01 ; drapeau dependance_non_respectee sur R et sur la dépendance P → R seulement | 5.2, 5.3, D-051 Q1 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-6 | X (ASAP, Alice 2 j, WBS 1), R (REGUL 04–06/01, Alice 5 j, WBS 2) : R 1 j du 04 au 08/01 avec retard (reliquat posé en passe A) ; X les 11 et 12/01 | 5.2, 5.6, D-051 Q2 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-7 | R1 (priorité 500, 04–08/01, Alice 5 j), R2 (priorité 100, 04–08/01, Alice 3 j) : R2 0,6 j du 04 au 08/01, sans drapeau ; R1 0,4 j du 04 au 08/01 puis 1 j les 11, 12 et 13/01, retard | 5.2, D-051 Q3 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-8 | REGUL clos (dates validées, Alice 2 j) : rien posé, dates vides, aucun drapeau. Parent REGUL (dates validées) avec un enfant ASAP (Alice 1 j) : enfant 1 j le 04/01, parent du 04 au 04/01, drapeaux vides | 5.1, 5.6 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-9 | Projet débutant le 11/01, fenêtre 04–15/01, Alice 5 j : 1 j par jour du 11 au 15/01 ; aucun drapeau | 5.6, D-051 Q4 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-10 | Alice du mardi au samedi, fenêtre 04–15/01, 4,5 j : 0,5 j les 05, 06, 07, 08, 09, 12, 13, 14 et 15/01 ; dates du 05 au 15/01 ; aucun drapeau | 5.6, D-051 Q5 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-11 | Début validé le samedi 09/01, fin 15/01, Alice 5 j : 1 j par jour du 11 au 15/01 ; aucun drapeau | 5.6, D-051 Q5 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-12 | Alice ne travaille que samedi et dimanche, fenêtre 04–08/01, 2 j : aucun jour ouvré dans la fenêtre, 1 j les 09 et 10/01 ; retard | 5.6, D-051 Q5 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-13 | D0 = 18/01, fenêtre 04–15/01, Alice 5 j : fenêtre écoulée, 1 j par jour du 18 au 22/01 ; retard | 5.6, D-051 Q6 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-14 | Fenêtre 04–08/01, assigné 3 j, réel 1 j les 07, 08 et 11/01, reste 0, D0 = 12/01 : rien posé ; dates du 07 au 11/01 ; retard | 5.9, D-051 Q7 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-15 | Fenêtre 06–08/01, D0 = 07/01, assigné 3 j, réel 1 j le 05/01, reste 2 j : 1 j les 07 et 08/01 ; dates du 05 au 08/01 ; aucun drapeau | 5.6, D-051 Q7 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-16 | Alice du mardi au samedi, fenêtre 04–09/01, 6 j : 1 j du 05 au 09/01, puis 1 j le 12/01 ; dates du 05 au 12/01 ; retard | 5.6, D-051 Q5 et Q8 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-17 | Sans assignation, fenêtre 06–13/01 : barre du 06 au 13/01, charge 0, aucun drapeau. Même activité avec D0 = 18/01 : barre le 18/01, retard | 5.6, D-051 Q9 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-18 | Alice affectée à partir du 11/01, fenêtre 04–15/01, 5 j : rien avant le 11/01, 1 j par jour du 11 au 15/01 ; aucun drapeau | 4, 5.6, D-051 Q11 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-19 | Assignation à 50 %, fenêtre 04–08/01, Alice 5 j : 0,5 j les 04, 05, 06, 07 et 08/01, puis les 11, 12, 13, 14 et 15/01 ; dates du 04 au 15/01 ; retard | 5.4, 5.6, D-051 Q11 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-20 | R (REGUL 04–08/01, Alice 5 j) et Y (STARR, début validé 06/01, Alice 2 j) : R 1 j du 04 au 08/01 ; Y les 11 et 12/01, drapeau debut_non_respecte | 5.2, 5.6, D-051 Q13 | 2d-M | packages/engine/test/modes-2d.test.ts |
| REGUL-21 | Fenêtre 04–08/01, Alice du mardi au samedi 2 j et Bob du lundi au vendredi 2,5 j sur la même activité : Alice 0,5 j les 05, 06, 07 et 08/01 ; Bob 0,5 j du 04 au 08/01 ; dates du 04 au 08/01 ; aucun drapeau | 5.6, D-051 Q5 | 2d-M | packages/engine/test/modes-2d.test.ts |
| ERR-9 | Feuille REGUL ouverte sans début validé (id 1), sans fin validée (id 2), fin antérieure au début (id 3) : entree_invalide, ids [1, 2, 3] ; REGUL clos et parent REGUL sans dates, non contrôlés : aucune erreur | 5.6, D-051 Q10 | 2d-M | packages/engine/test/erreurs.test.ts |
| DNR-1 | A (ASAP, Alice 3 j, du 04 au 06/01) → R (REGUL, Bob 2 j, 05–08/01), FD délai 0 : R 0,5 j du 05 au 08/01 ; drapeau dependance_non_respectee sur R et sur la dépendance (début 05/01 < 07/01) ; A sans drapeau | 5.3, D-051 Q12 | 2d-M | packages/engine/test/modes-2d.test.ts |
| DNR-2 | A (Alice 1 j, le 04/01) → R (REGUL, Bob 2 j, 05–08/01), FD délai 0 : R 0,5 j du 05 au 08/01 ; aucun drapeau, dépendance comprise (05/01 = jour ouvré suivant) | 5.3, D-051 Q12 | 2d-M | packages/engine/test/modes-2d.test.ts |
| DNR-3 | A (Alice 3 j, du 04 au 06/01) → R (REGUL, Bob 2 j, 05–08/01), DD délai 2 : drapeau sur R et sur la dépendance (début 05/01 < 06/01) | 5.3, D-051 Q12 | 2d-M | packages/engine/test/modes-2d.test.ts |
| DNR-4 | A (Alice 5 j, du 04 au 08/01) → R (REGUL, Bob 2 j), FF délai 0. Cas a : fenêtre de R 04–07/01, 0,5 j du 04 au 07/01, fin 07/01 < 08/01 : drapeau sur R et sur la dépendance. Cas b : fenêtre 04–08/01, 0,4 j du 04 au 08/01, fin 08/01 : aucun drapeau | 5.3, D-051 Q12 | 2d-M | packages/engine/test/modes-2d.test.ts |
| DNR-5 | Cas a (prédécesseur parent) : parent G (enfants Alice 2 j puis Alice 3 j, dates agrégées 04–08/01) → R (REGUL, Bob 2 j, 05–08/01), FD : R 0,5 j du 05 au 08/01 ; drapeau sur R et sur la dépendance G → R. Cas b (successeur parent) : Pn (ASAP, Alice 3 j, 04–06/01) → parent H (enfants R REGUL Bob 2 j 05–08/01 et Z ASAP Alice 1 j), FD : Z le 07/01 sans drapeau ; R 0,5 j du 05 au 08/01 avec drapeau ; H sans drapeau ; dépendance Pn → H marquée | 5.3, D-051 Q12 | 2d-M | packages/engine/test/modes-2d.test.ts |
| DNR-6 | R1 (REGUL Alice 5 j, 04–08/01) → R2 (REGUL Bob 5 j, 06–12/01), FD délai 0 : R1 1 j du 04 au 08/01 sans drapeau ; R2 1 j les 06, 07, 08, 11 et 12/01 avec drapeau (début 06/01 < 11/01) ; dépendance marquée | 5.3, D-051 Q12 | 2d-M | packages/engine/test/modes-2d.test.ts |
| DNR-7 | R (REGUL, Alice 3 j, 04–06/01) → S (ASAP, Bob 2 j), FD délai 0 : R 1 j du 04 au 06/01 ; S les 07 et 08/01 ; aucun drapeau, dépendance comprise | 5.2, 5.3, D-051 Q12 | 2d-M | packages/engine/test/modes-2d.test.ts |
| ERR-4c | Entrée gelée avec des REGUL (dont un successeur de dépendance) : aucune mutation, deux calculs égaux, aucune exception | 5.1 | 2d-M | packages/engine/test/erreurs.test.ts |
| REGUL-22 | Sans assignation, début validé samedi 09/01, fin validée dimanche 10/01 : aucun jour ouvré dans la fenêtre ; barre d'un jour le 11/01, charge 0 ; retard (caractérisation, vert d'emblée) | 5.6, D-052 | 2d-M | packages/engine/test/modes-2d.test.ts |
| CALC-30 | POST /api/calcul (d0 2027-01-04) sur un projet portant REGUL-1 (Alice), REGUL-2 (Bob), REGUL-3 (Carole) et DNR-1 (A : Dave 3 j ; R : Eve 2 j), une ressource par scénario. Lus en base : REGUL-1 0,5 j du 04 au 15/01, dates 04→15/01, drapeaux [] ; REGUL-2 : REGUL 0,5 j du 04 au 15/01 et ASAP 0,5 j du 04 au 15/01, drapeaux [] ; REGUL-3 1 j du 04 au 08/01, dates 04→08/01, drapeaux [retard] ; DNR-1 : A 1 j du 04 au 06/01, drapeaux [] ; R 0,5 j du 05 au 08/01, dates 05→08/01, drapeaux [dependance_non_respectee] ; drapeaux de la dépendance A→R = [dependance_non_respectee]. Second calcul : empreinte de la base identique | 5.3, 5.6, D-053 | 2d-I | packages/api/test/lot2d-calcul.test.ts |
| CALC-31 | Suite de CALC-30, fin validée du REGUL-3 portée au 08/01 (PATCH), recalcul : 1 j par jour du 04 au 08/01, drapeaux de l'activité [] (retard retiré en base) ; les drapeaux de la dépendance A→R de DNR-1 restent [dependance_non_respectee] | 5.6, 5.9 | 2d-I | packages/api/test/lot2d-calcul.test.ts |
| CALC-32 | Suite de CALC-30, charge assignée du prédécesseur A de DNR-1 ramenée à 1 j (PATCH), recalcul : A 1 j le 04/01 ; drapeaux de R [] et drapeaux de la dépendance [] (DNR-2) | 5.3, D-053 | 2d-I | packages/api/test/lot2d-calcul.test.ts |
| CALC-33 | REGUL-13 par l'API : fenêtre 04–15/01, Alice 5 j, corps d0 = 2027-01-18 : 1 j par jour du 18 au 22/01, dates 18→22/01, drapeaux [retard] | 5.6, D-051 Q6 | 2d-I | packages/api/test/lot2d-calcul.test.ts |
| CALC-34 | Projets P (A : Alice, R : Bob) et Q (A : Carole, R : Dave) portant chacun DNR-1 ; calcul de P et Q : R et dépendance marqués dans les deux ; prédécesseurs ramenés à 1 j dans les deux, calcul de P seul : drapeaux de R et de la dépendance vidés dans P ; dans Q, R porte [dependance_non_respectee] et la dépendance aussi, état de Q identique (empreinte des lignes de Q) | 5.1, D-053 5 | 2d-I | packages/api/test/lot2d-calcul.test.ts |
| MIG-6 | Migration 009 : base migrée jusqu'à 008 avec une dépendance, puis migration 009 : colonne `dependance.drapeaux` text[] NOT NULL, défaut {}, la ligne existante a {} et schema_version = 1 à 9. POST et PATCH d'une dépendance avec `drapeaux` → 400, empreinte inchangée. Création, modification et suppression d'une dépendance dont `drapeaux` a été posé en base : aucune entrée d'historique ne porte le champ `drapeaux` ni sa valeur. Copie d'un projet dont une dépendance est marquée : `drapeaux` = {} dans la copie, la source reste marquée | 3, 11.2, D-053 | 2d-I | packages/api/test/migrations.test.ts |
| MIG-6-r1 | Révision de MIG-6 (premier test, D-031, tag tests-lot2d-i-r1) : après la base à 008, applied = versions du dépôt > 8 ; schema_version = liste complète tirée de MIGRATIONS_DIR ; reste inchangé | 3, 11.2, D-059 (9) | 2d-I | packages/api/test/migrations.test.ts |

## Tests du lot 2e (D-056)

| id | énoncé | section SPEC | lot | fichier |
|---|---|---|---|---|
| DNR-8 | D-052 (6), prédécesseur sans dates. Cas a : A (ASAP, Alice 3 j, close, sans réel) → R (REGUL, Bob 2 j, 05–08/01), FD délai 0 : A sans dates ; R 0,5 j du 05 au 08/01, aucun drapeau ; dépendance à drapeaux vides. Cas b : parent G dont le seul enfant est clos sans réel → R, FD : G sans dates, R sans drapeau, dépendance à drapeaux vides. Caractérisation, vert d'emblée | 5.3, D-052, D-056 R1 | 2e-0 | packages/engine/test/modes-2e-reprises.test.ts |
| DNR-9 | FD délai 1, A (ASAP, Alice 3 j, du 04 au 06/01) → R (REGUL, Bob 2 j). Cas a : fenêtre 07–08/01, R 1 j les 07 et 08/01, début 07/01 < 08/01 : drapeau sur R et sur la dépendance. Cas b : fenêtre 08–11/01, R 1 j les 08 et 11/01 : aucun drapeau. Caractérisation, vert d'emblée | 5.3, D-056 R1 | 2e-0 | packages/engine/test/modes-2e-reprises.test.ts |
| DNR-10 | FF délai 2, A (ASAP, Alice 3 j, du 04 au 06/01) → R (REGUL, Bob 2 j). Cas a : fenêtre 04–07/01, R 0,5 j du 04 au 07/01, fin 07/01 < 08/01 : drapeau sur R et sur la dépendance. Cas b : fenêtre 04–08/01, R 0,4 j du 04 au 08/01, fin 08/01 : aucun drapeau. Caractérisation, vert d'emblée | 5.3, D-056 R1 | 2e-0 | packages/engine/test/modes-2e-reprises.test.ts |
| ACT-22 | Création et PATCH d'une activité avec `debut_valide` ou `fin_valide` au 2100-01-01 → 400, empreinte de la base inchangée ; au 2099-12-31 : acceptés (201, 200) | 3, D-056 R3 | 2e-0 | packages/api/test/lot2e-reprises.test.ts |
| JLN-12 | Création et PATCH d'un jalon avec `date_validee` au 2100-01-01 → 400, empreinte de la base inchangée ; au 2099-12-31 : acceptés (201, 200) | 3, D-056 R3 | 2e-0 | packages/api/test/lot2e-reprises.test.ts |
| ERR-2-r4 | Révision de ERR-2 (D-031, tag tests-lot2a-m-r4) : aucun mode ne donne mode_non_calcule ; une feuille de chacun des huit modes (MAN sans saisie, REGUL avec ses deux dates) calcule sans erreur | 5.2, D-056 Q12 | 2e-M | packages/engine/test/erreurs.test.ts |
| MAN-1 | Saisies Alice matin et après-midi du 05/01 sur M ; ASAP (Alice 2 j) : ASAP les 04 et 06/01 ; M 1 j le 05/01 | 5.6 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-2 | Saisies Alice 1 j le 05/01 sur deux activités MAN (WBS 1 et 2) : les deux posées ; WBS 1 sans surcharge, WBS 2 1 j en surcharge et drapeau surcharge (ordre de D-056 Q6) | 5.6, D-056 Q6 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-3 | Recalcul lancé deux fois sur la même entrée avec saisies : sorties identiques | 5.6 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-4 | D0 = 11/01, saisies Alice 1 j le 05/01 et 1 j le 12/01 sur M, ASAP Alice 2 j : M posé le 12/01 seul, reste 1 j (activité et assignation, sortie `assignations`), dates du 05 au 12/01 ; ASAP les 11 et 13/01 | 5.6, D-056 Q1 à Q3, D-057 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-5 | Saisie Alice 1 j le samedi 09/01 : posée, 1 j en surcharge, drapeau surcharge, dates du 09 au 09/01 | 5.6, D-056 Q4 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-6 | Alice affectée à partir du 11/01, saisie le 05/01 matin : posée, 0,5 j en surcharge, drapeau surcharge | 5.6, D-056 Q4 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-7 | Saisie Alice le 05/01 matin sur M, ASAP Alice 2 j : ASAP 1 j le 04/01, 0,5 j le 05/01, 0,5 j le 06/01 ; aucune surcharge | 4, 5.6 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-8 | Assignation à 50 %, saisie Alice 1 j le 05/01 : posée, aucune surcharge | 5.6, D-056 Q6 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-9 | M1 (priorité 500) et M2 (priorité 100), Alice 1 j le 05/01 sur chacune : M2 sans surcharge ; M1 1 j en surcharge, drapeau surcharge | 5.2, 5.6, D-056 Q6 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-10 | MAN assignée sans saisie, fin validée le 01/01 : rien posé, dates vides, aucun drapeau, reste 0 (activité et assignation, sortie `assignations`) ; avec un prédécesseur en FD : dépendance à drapeaux vides | 5.3, 5.6, D-056 Q7, D-057 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-11 | A (ASAP, Alice 3 j, du 04 au 06/01) → M (MAN, Bob), FD délai 0. Cas a : saisie Bob 1 j le 05/01 : drapeau dependance_non_respectee sur M et sur la dépendance. Cas b : saisie le 07/01 : aucun drapeau | 5.3, D-056 Q8 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-12 | M (MAN, saisie Alice 1 j le 06/01) → S (ASAP, Bob 1 j), FD délai 0 : S le 07/01 | 5.3, D-056 Q8 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-13 | M (saisie Alice 1 j le 04/01) et R (REGUL 04–08/01, Alice 4 j) : R 1 j par jour du 05 au 08/01, dates du 05 au 08/01, aucun drapeau | 5.2, 5.6 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-14 | M close, saisie Alice 1 j le 04/01 ; ASAP Alice 1 j : rien posé pour M, dates vides ; ASAP le 04/01 | 5.1, 5.6, D-056 Q5 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-15 | STARR-3 avec une vraie saisie (Alice 1 j le 06/01 sur une activité MAN) : Y les 07 et 08/01, drapeau debut_non_respecte | 5.6 | 2e-M | packages/engine/test/modes-2e.test.ts |
| MAN-16 | DDUR-3 avec une vraie saisie (Alice 1 j le 13/01 sur une activité MAN) : 1 j par jour du 11 au 15/01 ; le 13/01 en surcharge (1 j) | 5.6 | 2e-M | packages/engine/test/modes-2e.test.ts |
| ERR-10 | Saisie sur une assignation inconnue, sur une activité non MAN, sur un parent, de charge différente de 0,5 j, ou en doublon (assignation, jour, demi-journée) : entree_invalide, ids des assignations triés ; saisie sur une activité MAN close : aucune erreur | 5.6, D-056 | 2e-M | packages/engine/test/erreurs.test.ts |
| ERR-4d | Entrée gelée avec des saisies (MAN prédécesseur et successeur, saisies avant et après D0) : aucune mutation, deux calculs égaux, aucune exception | 5.1 | 2e-M | packages/engine/test/erreurs.test.ts |
| MAN-17 | M (MAN) avec deux assignations, saisies Alice 1 j le 05/01 et Bob le 06/01 matin : Alice 1 j le 05/01, Bob 0,5 j le 06/01 ; reste Alice 1 j, Bob 0,5 j, activité 1,5 j ; dates du 05 au 06/01 ; aucun drapeau | 5.6, D-057 | 2e-M | packages/engine/test/modes-2e.test.ts |
| SAS-1 | Forme de la sortie `assignations` : une entrée par assignation de l'entrée, triée par id ; activité ASAP : reste à faire d'entrée ; activité close : 0 ; feuille MAN ouverte : somme des saisies à partir de D0 | 5.6, D-057 | 2e-M | packages/engine/test/modes-2e.test.ts |
| CALC-9-r3 | Révision de CALC-9 (D-031, tag tests-lot2a-i-r4) : activité MAN assignée dans P, sans saisie → 200 ; aucun travail planifié pour elle, dates planifiées vides, drapeaux vides | 5.6, D-056 Q12, D-057 | 2e-M | packages/api/test/lot2a-calcul.test.ts |
| MIG-7 | Migration 010 : table saisie_manuelle ; demi-journée invalide, doublon (assignation, jour, demi-journée) et assignation inexistante refusés ; une même demi-journée acceptée pour deux assignations ou deux jours ; cascade à la suppression de l'assignation et du projet | 3, D-058 (1) | 2e-I | packages/api/test/migrations.test.ts |
| SAI-1 | GET sans saisie : 200 `{ mois, saisies: [] }` pour une activité MAN et pour une activité ASAP | 3, D-058 (2) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-2 | PUT de 4 saisies d'Alice envoyées en désordre, puis GET : 200, même forme, triées par jour puis matin avant après-midi ; la base contient 4 lignes | 3, D-058 (2) (3) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-3 | PUT du mois de janvier : remplace janvier et laisse février et décembre intacts | 3, D-058 (3) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-4 | PUT `saisies: []` : efface le mois, les autres mois restent | 3, D-058 (3) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-5 | Deux assignations de la même activité : saisies triées par assignation puis jour ; un PUT remplace les saisies des deux assignations, et celles d'une autre activité restent | 3, D-058 (2) (3) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-6 | Sans session : 401 (GET et PUT) ; activité inconnue : 404 (GET et PUT) ; base inchangée après chaque PUT refusé | 3, D-058 (4) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-7 | Droits : GET 200 pour l'administrateur, le chef et la ressource affectée ; chef d'un autre projet et ressource non affectée : 404 ; PUT : ressource affectée 403, non affectée 404, chef d'un autre projet 404 ; base inchangée | 2, 3, D-058 (2) (3) (4) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-8 | 400 : mois absent ou invalide (2027-13, 2027-1, 27-01, texte), clé inconnue, saisies absente ou non tableau, demi_journee invalide, jour mal formé, champ de charge, jour hors du mois, doublon dans le corps ; complétés (D-059 1) : GET sans mois, jour 2027-01-32, assignation_id 0 et 1.5 ; base inchangée | 3, D-058 (4), D-059 (1) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-9 | 422 : activité ASAP, activité MAN parent, activité MAN close, assignation d'une autre activité ; base inchangée | 3, D-058 (4) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-10 | Ordre des refus : ressource affectée avec corps invalide → 403 ; chef avec corps invalide sur une activité ASAP → 400 ; chef avec mois invalide sur activité inconnue → 404 ; base inchangée | 3, D-058 (4) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-11 | Un PUT n'écrit aucune entrée d'historique (table historique identique) | 3, D-058 (3) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-12 | Garde-fous tant que l'activité MAN porte des saisies : PATCH du mode, création d'une activité et d'un jalon dessous, déplacement d'un élément dessous : 422, base inchangée ; PATCH du nom accepté ; clôture permise, saisies gardées ; saisies effacées : seul le changement de mode devient permis (enfant et déplacement restent refusés par element_parent_sans_assignation) | 3, D-058 (5), D-059 (5) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-13 | Cascades : suppression d'une assignation puis d'une activité : leurs saisies disparaissent, celles des autres assignations restent | 3, D-058 (5) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-14 | PUT avec assignation_id 999999 seul, puis avec une saisie valide et 999999 : 422, base inchangée | 3, D-059 (2) (3) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-15 | MAN à saisies : PATCH { mode: MAN } → 200 ; PATCH { mode: MAN, nom } → 200, nom changé, saisies inchangées ; activité close, PATCH { mode: ASAP } → 422, empreinte inchangée | 3, D-059 (7) | 2e-I | packages/api/test/lot2e-saisies.test.ts |
| SAI-16 | Mois hors 2000 à 2099 : 0000-01, 1999-12, 2100-01 → 400 en GET et en PUT, base inchangée ; témoins 2000-01 et 2099-12 → 200 en GET | 3, D-060 (2) | 2e-E | packages/api/test/lot2e-saisies.test.ts |
| CALC-35 | MAN-1 par l'API : saisies Alice matin et après-midi du 05/01 sur M (PUT), ASAP Alice 2 j : ASAP 04 et 06/01 ; M 1 j le 05/01 ; réponse `lignes` 3 ; second calcul : empreinte identique, saisies comprises (MAN-3) | 5.6, D-058 (6) | 2e-I | packages/api/test/lot2e-calcul.test.ts |
| CALC-36 | MAN-2 par l'API : saisies Alice 1 j le 05/01 sur deux activités MAN (WBS 1 et 2) : WBS 1 sans surcharge, WBS 2 1 j en surcharge ; dates du 05 au 05/01 ; drapeau surcharge en base sur WBS 2 seul | 5.6, D-058 (6) | 2e-I | packages/api/test/lot2e-calcul.test.ts |
| CALC-37 | MAN-4 par l'API, d0 = 2027-01-11 : assignation de M (charge 2, reste 2) : reste_a_faire 1 après calcul ; M posé le 12/01 seul, dates du 05 au 12/01 ; ASAP les 11 et 13/01 ; saisies inchangées en base ; reste de l'assignation ASAP inchangé | 5.6, D-058 (6) | 2e-I | packages/api/test/lot2e-calcul.test.ts |
| CALC-38 | MAN-17 par l'API : saisies Alice 1 j le 05/01, Bob le 06/01 matin : travail Alice 1 j le 05/01, Bob 0,5 j le 06/01 ; reste_a_faire Alice 1, Bob 0,5 ; dates du 05 au 06/01 ; aucun drapeau | 5.6, D-058 (6) | 2e-I | packages/api/test/lot2e-calcul.test.ts |
| CALC-39 | MAN-11 cas a par l'API : A (ASAP, Alice 3 j) → M (MAN, Bob), FD délai 0, saisie Bob 1 j le 05/01 : drapeau dependance_non_respectee sur M et sur la dépendance, lus en base | 5.3, 5.6, D-058 (6) | 2e-I | packages/api/test/lot2e-calcul.test.ts |
| CALC-40 | MAN-15 par l'API : Y STARR début validé 06/01, Alice 2 j ; saisie Alice 1 j le 06/01 sur une activité MAN : Y 1 j les 07 et 08/01, drapeau debut_non_respecte | 5.6, MAN-15 | 2e-I | packages/api/test/lot2e-calcul.test.ts |
| CALC-41 | MAN-16 par l'API : Y DDUR durée 5, début validé 11/01, Alice 5 j ; saisie Alice 1 j le 13/01 sur une activité MAN : Y 1 j par jour du 11 au 15/01, le 13/01 en surcharge | 5.6, MAN-16 | 2e-I | packages/api/test/lot2e-calcul.test.ts |
| CALC-42 | Saisies effacées (PUT vide) puis recalcul : travail de M retiré, reste_a_faire 0, dates et drapeaux vides ; saisies absentes en base | 5.6, D-058 (6) | 2e-I | packages/api/test/lot2e-calcul.test.ts |
| CALC-43 | Un calcul de P seul ne modifie ni les saisies ni le reste à faire de Q : Q calculé, ses saisies changées par PUT, puis calcul de P : le reste de Q et le travail de Q sont inchangés | 5.1, D-058 (6) | 2e-I | packages/api/test/lot2e-calcul.test.ts |
| CALC-44 | Les saisies d'un projet non calculé ne comptent pas : Q (non calculé, jamais) porte une saisie d'Alice 1 j le 05/01 ; calcul de P seul, ASAP Alice 5 j : 1 j par jour du 04 au 08/01, sans surcharge | 5.1, D-058 (6) | 2e-I | packages/api/test/lot2e-calcul.test.ts |
| CALC-45 | Le calcul n'écrit aucune entrée d'historique alors que reste_a_faire change (table historique identique, reste 2 → 1) | 3, D-058 (6) | 2e-I | packages/api/test/lot2e-calcul.test.ts |
| CALC-46 | Seul le reste des assignations de feuilles MAN ouvertes est écrit : M clos avec saisies (charge 1, reste 1) : reste inchangé après calcul, aucun travail | 5.6, D-058 (6) | 2e-I | packages/api/test/lot2e-calcul.test.ts |
| CALC-47 | PROJ-1 par l'API (d0 2027-01-04, projet P début 04/01) : affectation d'Alice sur P à 50 %, ASAP Alice 5 j : travail en base 1 j les 04 et 05/01, 0,5 j le 06/01, 1 j les 11 et 12/01, 0,5 j le 13/01 ; aucune surcharge | 4, 5.7, D-062, D-063 | 2f-I | packages/api/test/lot2f-calcul.test.ts |
| CALC-48 | P (Alice à 50 %) : A ASAP Alice 2 j ; sous-projet P1 de P (Alice à 100 %) : C ASAP Alice 3 j, priorité d'activité 600. Calcul de P : A les 04 et 05/01 ; C 0,5 j le 06/01, 1 j les 11 et 12/01, 0,5 j le 13/01 | 4, 5.7 (PROJ-4), D-062, D-063 | 2f-I | packages/api/test/lot2f-calcul.test.ts |
| CALC-49 | Mêmes données que CALC-48, jamais calculées ; calcul de P1 seul : C 1 j par jour du 04 au 06/01, aucun travail pour A (plafond de P ignoré, ancêtre absent de l'entrée) | 4, 5.7 (PROJ-9), D-062 (Q5), D-063 | 2f-I | packages/api/test/lot2f-calcul.test.ts |
| COPIE-14 | COPIE-5, partie saisie : P avec une activité MAN assignée et des saisies d'Alice : la copie n'a aucune ligne saisie_manuelle ; les saisies de P sont inchangées | 11.2, 11.4, D-058 (7) | 2e-I | packages/api/test/lot2e-copie.test.ts |
| COPIE-15 | Copie dont le décalage porte une date validée d'activité, puis de jalon, au-delà du 31/12/2099 : 422, rien de créé (empreinte inchangée) ; décalage aboutissant à 2099-12-31 : 201 | 3, 11.2, D-058 (7) | 2e-I | packages/api/test/lot2e-copie.test.ts |
| E2E-26 | Le chef ouvre « Planning manuel » depuis la ligne de l'activité MAN (adresse vérifiée), en janvier 2027 coche matin puis après-midi du 05/01 pour Alice, total de la ligne « 0,5 » après la première case, « 1 » après la seconde, Enregistrer, notification de succès ; après rechargement les deux cases sont cochées ; GET de l'API : 2 saisies | 5.6, D-060 (3) (4) (5) | 2e-E | e2e/tests/lot2e.spec.ts |
| E2E-27 (révisé en E2E-27-r1, D-172 (6) : boutons de mois actifs, confirmation) | Saisie enregistrée en janvier ; « Mois suivant » : février 2027, 28 jours, aucune case cochée ; « Mois précédent » : la saisie est là ; une case modifiée rend les boutons de mois inactifs ; « Annuler » rétablit la grille et les réactive | 5.6, D-060 (3) (5) | 2e-E | e2e/tests/lot2e.spec.ts |
| E2E-28 | Le chef décoche une saisie enregistrée, Enregistrer : GET de l'API, liste vide | 5.6, D-060 (5) | 2e-E | e2e/tests/lot2e.spec.ts |
| E2E-29 | Lecture seule : Alice voit la grille, cases désactivées, pas de bouton Enregistrer ; activité MAN close : idem pour le chef ; une activité ASAP n'a pas le bouton « Planning manuel » | 5.6, D-060 (3) (6) | 2e-E | e2e/tests/lot2e.spec.ts |
| E2E-30 | (a) Page d'une activité ASAP ouverte par l'adresse (?mois=2027-01) : message visible, aucune case à cocher, pas de bouton Enregistrer ; (b) activité MAN sans assignation : état vide visible, aucune case à cocher ; (c) depuis la page de l'activité MAN, le lien « Retour au projet » mène à /projets/:id | 5.6, D-060 (3) (6) | 2e-E | e2e/tests/lot2e.spec.ts |
| E2E-31 | Relecture 2e : sans recharger la page, une activité passée en MAN par « Modifier » reçoit le bouton « Planning manuel » ; une sous-activité ajoutée sous elle le fait disparaître (plus feuille) | 5.6, D-060 (3) | 2e-E | e2e/tests/lot2e-bouton.spec.ts |
| E2E-32 | Relecture 2e : avec ?mois=2099-12, « Mois suivant » est désactivé et « Mois précédent » actif ; avec ?mois=2000-01, l'inverse | 5.6, D-060 (3), D-061 (3) | 2e-E | e2e/tests/lot2e-bouton.spec.ts |

Libellés retenus pour E2E-26 à E2E-29 (D-060) : case = case à cocher nommée « <ressource>, <jour> <mois>, matin » ou « … après-midi » (jour sans zéro, mois en toutes lettres : « Alice E2E26, 5 janvier, matin ») ; bouton de ligne repéré par son libellé accessible contenant « Planning manuel » (dans la ligne de l'activité) ; boutons « Enregistrer », « Annuler », « Mois précédent », « Mois suivant » ; succès = `role=status` contenant « enregistr » (insensible à la casse). Février 2027 : 56 cases par ligne.

Libellés ajoutés (E2E-26 à E2E-30) : lien de retour nommé « Retour au projet » ; total d'une ligne au format français (« 0,5 », « 1 »).

## Tests du lot 3a (D-065)

Fichier : packages/api/test/lot3a-gantt.test.ts. D0 = 2027-01-04. Le réel se pose par UPDATE SQL.

| Id | Cas | Spec | Lot | Fichier |
|---|---|---|---|---|
| GANTT-1-r1 | (révisé en GANTT-1-r2, D-149 (12))  Avant calcul : forme complète de la réponse ; ordre et numéros WBS (parent, enfant, jalon) ; dates planifiées null, drapeaux [] ; une dépendance présente avec drapeaux [] | 6 (Lecture) | 3a | packages/api/test/lot3a-gantt.test.ts ; révisé : `initiales: []` sur la feuille (D-090, tests-lot3a-r1) |
| GANTT-2 | Données de DEP-1 après calcul : A du 04 au 06/01, B les 07 et 08/01 ; projet.debut_planifie 04/01, fin_planifiee 08/01 | 5.7 (DEP-1), 6 | 3a | packages/api/test/lot3a-gantt.test.ts |
| GANTT-3 | Feuille, Alice assignée 4 j, réel 1 j, reste 3 j : charges 4, 1, 3 ; avancement 25 | 5.8, 6 | 3a | packages/api/test/lot3a-gantt.test.ts |
| GANTT-4 | Parent G à deux feuilles (4, 1, 3 puis 2, 0, 2) : est_parent vrai, charges 6, 1, 5, avancement 16,67 ; dates de G = plus petit début, plus grande fin des enfants après calcul | 5.8, 6 | 3a | packages/api/test/lot3a-gantt.test.ts |
| GANTT-5 | Activité sans assignation : charges 0, avancement null ; un jalon n'a aucun champ de charge | 6 | 3a | packages/api/test/lot3a-gantt.test.ts |
| GANTT-6 | Drapeaux après calcul : ALAP-3 (activité, retard) ; JAL-2 (jalon, retard) ; MAN-11 cas a (dependance_non_respectee sur l'activité M et sur la dépendance) | 5.6 (ALAP-3), 5.7 (JAL-2), 5.6 (MAN-11), 5.9 | 3a | packages/api/test/lot3a-gantt.test.ts |
| GANTT-7 | P avec sous-projet P1 contenant C, calcul de P : sous_projets = [P1 avec ses dates agrégées] ; C absent de elements | 6 | 3a | packages/api/test/lot3a-gantt.test.ts |
| GANTT-8 | Droits : sans session 401 ; ressource affectée 200, peut_ecrire faux ; ressource non affectée 404 ; chef hors portée 404 ; « abc » et 2147483648 : 404 ; identifiant bien formé mais inexistant (999999) : 404 pour l'administrateur ; modèle lu par une ressource affectée : 404 ; base inchangée après chaque refus | 2, 11.1, 6 | 3a | packages/api/test/lot3a-gantt.test.ts |
| GANTT-9 | Alice affectée à P seul, pas à P1 : sous_projets vide pour Alice, P1 présent pour l'administrateur | 2, 6 | 3a | packages/api/test/lot3a-gantt.test.ts |
| GANTT-10 | Caractérisation (vert d'emblée) : après le calcul de GANTT-6, GET …/dependances et GET …/jalons ne portent toujours pas de champ drapeaux | 5.3 (Persistance), D-053 | 3a | packages/api/test/lot3a-gantt.test.ts |
| GANTT-11 | G parent de H, H parent de deux feuilles (Alice assignée 4 j, réel 1 j, reste 3 j ; Bob assigné 2 j, réel 0, reste 2 j), plus une feuille directe de G (Alice assignée 1 j, reste 1 j), sans calcul : H charges 6, 1, 5, avancement 16,67 ; G charges 7, 1, 6, avancement 14,29 ; G et H est_parent vrai | 5.8, 6 (Lecture) | 3a | packages/api/test/lot3a-gantt.test.ts |

## Tests du lot 3b (D-066)

Géométrie : fonctions pures de packages/web/src/gantt/, vitest en environnement node (projet « web »). E2E : données créées par l'API, calcul par l'API avec d0 2027-01-04, horloge du navigateur figée au 06/01/2027 sauf mention.

| Id | Cas | Spec | Lot | Fichier |
|---|---|---|---|---|
| GEO-1 | Position d'un jour, origine lundi 04/01/2027 : 04/01 → 0 ; 06/01 → 48 (jour), 16 (semaine), 8 (mois) | 6 (Affichage 3, 4) | 3b | packages/web/test/gantt.test.ts |
| GEO-2 | Largeur d'une barre du 04 au 08/01 : 120, 40, 20 ; barre d'un jour : 24 au zoom jour | 6 (Affichage 3) | 3b | packages/web/test/gantt.test.ts |
| GEO-3 | Changement d'heure : position du 29/03/2027 moins position du 27/03/2027 = 48 au zoom jour | 6 (Affichage 3) | 3b | packages/web/test/gantt.test.ts |
| GEO-4 | Plage : (a) début projet mer 06/01/2027, un élément finissant le ven 19/02/2027 → du 04/01/2027 au 07/03/2027 ; (b) début 06/01/2027 sans autre date → du 04/01/2027 au 21/02/2027 ; (c) une date du jour au 16/11/2026 ne change rien | 6 (Affichage 4) | 3b | packages/web/test/gantt.test.ts |
| GEO-5 | En-têtes : semaine, première cellule basse « S01 » x 0 largeur 56, haute « janvier 2027 » ; jour, première basse « 4 » largeur 24 ; mois, haute « 2027 », première basse « janv. » du 04 au 31/01, largeur 112 | 6 (Affichage 3) | 3b | packages/web/test/gantt.test.ts |
| GEO-6 | Lien en liste de points : FD fin → début, DD début → début, FF fin → fin ; segments horizontaux ou verticaux, y compris successeur à gauche du prédécesseur | 6 (Affichage 7) | 3b | packages/web/test/gantt.test.ts |
| GEO-7 | Part d'avancement : largeur 120, avancement 25 → 30 ; null → 0 ; 100 → 120 | 6 (Affichage 5) | 3b | packages/web/test/gantt.test.ts |
| GEO-8 | Libellés des huit modes et des quatre drapeaux | 6 (Affichage 6, 10) | 3b | packages/web/test/gantt.test.ts |
| E2E-33 | DEP-1 calculé ; le chef ouvre l'onglet « Gantt » : adresse avec onglet=gantt, conservée au rechargement ; barres A (2027-01-04 à 2027-01-06) et B (07 et 08/01) ; ligne A : « Dès que possible », 04/01/2027, 06/01/2027, charge 3, « 0 % » ; un lien FD | 5.7 (DEP-1), 6 (Affichage 1, 2) | 3b | e2e/tests/lot3b.spec.ts |
| E2E-34 | Zoom : boutons « Jour », « Semaine », « Mois » ; défaut semaine (barre A width 24) ; Jour → 72 et zoom=jour dans l'adresse ; Mois → 12 ; rechargement : zoom conservé ; adresse avec zoom=xyz : data-zoom « semaine », barre A width 24 | 6 (Affichage 1, 3) | 3b | e2e/tests/lot3b.spec.ts |
| E2E-35 | Drapeaux (montage GANTT-6 plus MAN-15) : barre ALAP « retard » et badge « Retard » ; jalon data-type jalon, « retard » ; lien de MAN-11 « dependance_non_respectee » ; trait de début non respecté pour l'activité STARR, badge « Début non respecté » | 5.9, 6 (Affichage 6) | 3b | e2e/tests/lot3b.spec.ts |
| E2E-36 | Trait du jour : horloge au 06/01/2027 → data-aujourdhui="2027-01-06" présent ; au 16/11/2026 → absent | 6 (Affichage 8) | 3b | e2e/tests/lot3b.spec.ts |
| E2E-37 | Avant tout calcul : bandeau « Planning non calculé », lignes du tableau présentes, aucune barre ; projet sans élément : état vide | 6 (Affichage 9) | 3b | e2e/tests/lot3b.spec.ts |
| E2E-38 | Parent G à deux feuilles : barre parent. Sous-projet P1 calculé : ligne de synthèse avec lien vers sa fiche, barre de synthèse repérée par data-projet-id (D-067), absente pour Alice ; Alice, affectée à P seul, voit le Gantt de P sans P1 et sans bouton d'écriture | 6 (Affichage 5, 11), 2 | 3b | e2e/tests/lot3b.spec.ts |
| E2E-39 | Noms accessibles : « A, du 04/01/2027 au 06/01/2027 » ; activité ALAP-3 terminée par « , retard » ; jalon « <nom>, le 06/01/2027 » ; chaque barre et le jalon portent role="img" (D-067) | 6 (Affichage 12) | 3b | e2e/tests/lot3b.spec.ts |

Ajout D-068 (jalon en retard) :

| Id | Cas | Spec | Lot | Fichier |
|---|---|---|---|---|
| GEO-9 | Nom accessible d'un jalon : en retard « Jalon, le 06/01/2027, retard » ; à l'heure « Jalon, le 06/01/2027 » ; dont le suffixe suit le drapeau et non la clôture (les jalons n'ont pas d'état clos en base : le cas « clos » se réduit à un jalon en retard, dont le nom est inchangé) | 6 (Affichage 14), D-068 | 3b | packages/web/test/gantt-jalon.test.ts |
| E2E-40 | JAL-2 calculé (jalon fixe validé au 06/01, prédécesseur finissant le 08/01) : image nommée « <nom>, le 06/01/2027, retard » ; jalon fixe à l'heure : image nommée « <nom>, le 06/01/2027 », sans suffixe | 5.7 (JAL-2), 6 (Affichage 12, 14), D-068 | 3b | e2e/tests/lot3b-jalon.spec.ts |

## Tests du lot 3b, largeurs (D-069)

GEO-10 : packages/web/test/gantt-largeurs.test.ts (fichier séparé : gantt.test.ts est sous tag). E2E : e2e/tests/lot3b-largeurs.spec.ts, `page.setViewportSize` à 1440 puis 1024, mesures par `boundingBox` et `clientWidth`, pas de capture d'image. Montage : projet calculé avec d0 2027-01-04 ; Retard (FDUR durée 2, Alice 3 j), Surcharge (DDUR durée 2, Alice 3 j), Début non respecté (STARR début validé 06/01, Alice occupée ce jour), une activité sans drapeau, une activité au nom de 60 caractères. Aucun mode ne porte aujourd'hui plus d'un drapeau sur une ligne, mais `drapeauxDuree` (modes/duree.ts:37-38) peut en émettre 2 (retard + surcharge) : l'interface se dimensionne sur ce max structurel (colonne Drapeaux 144 px), E2E-41e intercepte la réponse de l'API pour le produire ; DRAP-5 reste à « au plus 1 » comme caractérisation (s'il casse, l'interface tient déjà).

| Id | Cas | Spec | Lot | Fichier |
|---|---|---|---|---|
| GEO-10 | Extension de plage, plage du 04/01/2027 au 21/02/2027, largeur disponible 1300 px : jour → fin 28/02/2027, largeur 1344 ; semaine → fin 20/06/2027, largeur 1344 ; mois → fin 28/11/2027, largeur 1316 ; début inchangé ; largeur disponible 392 au zoom semaine → plage inchangée ; largeur disponible 0 (premier rendu) → plage inchangée | 6 (Affichage 16), D-069 | 3b | packages/web/test/gantt-largeurs.test.ts |
| DRAP-5 | Pour STARR, FDUR, DDUR (dont deux ressources), ALAP, REGUL et MAN, sur des scénarios chargés (surcharge, retard, début non respecté), chaque activité émet au plus 1 drapeau. Caractérisation de l'hypothèse de SPEC §6 Affichage 15, vert d'emblée | 5.9, 6 (Affichage 15), D-069 | 3b | packages/engine/test/drapeaux-max.test.ts |
| E2E-41a | (1440 puis 1024 px, un test par largeur) Chaque badge de la colonne Drapeaux (Retard, Surcharge, Début non respecté) est entièrement dans la zone visible du tableau, sans défilement | 6 (Affichage 15a), D-069 | 3b | e2e/tests/lot3b-largeurs.spec.ts |
| E2E-41b | (1440 puis 1024 px) WBS et Nom entièrement visibles sur les 10 lignes, dont un nom de 60 caractères et une ligne de niveau WBS 4 au nom de 60 caractères, et non recouverts par la colonne Drapeaux (bord gauche de son en-tête). Vert d'emblée tant que Drapeaux n'est pas fixée ; garde de non-régression de l'option C, rouge à 1024 px dès qu'elle est posée sans troncature de Nom | 6 (Affichage 15b), D-069 | 3b | e2e/tests/lot3b-largeurs.spec.ts |
| E2E-41c | (1440 puis 1024 px) `documentElement.scrollWidth <= clientWidth`. Vert d'emblée, garde de non-régression | 6 (Affichage 15c), D-069 | 3b | e2e/tests/lot3b-largeurs.spec.ts |
| E2E-41d | (1440 puis 1024 px) La hauteur d'une ligne à badge (Retard, Surcharge, Début non respecté) est égale à celle d'une ligne sans badge. Vert d'emblée, garde de non-régression | 6 (Affichage 15d), D-069 | 3b | e2e/tests/lot3b-largeurs.spec.ts |
| E2E-41e | (1440 puis 1024 px) Réponse de l'API du Gantt interceptée (`page.route`) : la ligne « Simple » porte retard + surcharge ; ses deux badges sont entièrement dans la zone visible (3a) et sa hauteur égale celle d'une ligne sans badge (3d) | 6 (Affichage 15a, 15d), D-069 | 3b | e2e/tests/lot3b-largeurs.spec.ts |
| E2E-42 | Largeur du SVG, aux trois zooms, à 1440 puis 1024 px : largeur du SVG (`boundingBox`) au moins égale à `clientWidth` de son conteneur, mesure attendue par `expect.poll` (ResizeObserver), sans délai fixe | 6 (Affichage 16), D-069 | 3b | e2e/tests/lot3b-largeurs.spec.ts |

## Tests du lot 3b, règle 12 (D-070)

E2E : e2e/tests/lot3b-focus.spec.ts (nouveau fichier), montage de lot3b-largeurs (projet calculé, d0 2027-01-04), helpers existants. Rouges attendus avant l'implémentation (zones en `tabIndex=-1`, sans rôle ni nom).

| Id | Cas | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-43-r1 | (1440 puis 1024 px, un test par largeur) Les deux zones à défilement ont `role="region"`, les noms accessibles « Tableau du Gantt » et « Calendrier du Gantt » et `tabindex="0"` ; au clavier, Tab depuis le dernier bouton de zoom atteint la zone du tableau, puis la zone du SVG (après les liens de sous-projets s'il y en a) ; aucune barre ni aucun jalon ne reçoit le focus | 6 (Affichage 12), D-070 | 3b | e2e/tests/lot3b-focus.spec.ts ; révisé : arrêt « Initiales » après « Mois » dans l'ordre de focus (D-091, D-092, tests-lot3b-regle12-r1) |
| E2E-44 | (1024 px, zoom jour) Zone du SVG focalisée : ArrowRight augmente son `scrollLeft` (`expect.poll`, sans délai fixe) ; ArrowLeft le ramène à 0 | 6 (Affichage 12), D-070 | 3b | e2e/tests/lot3b-focus.spec.ts |

Révision D-031 (D-070, tag `tests-lot3b-largeurs-r1`) : le sélecteur de zone de E2E-41 (lot3b-largeurs.spec.ts) passe de `ancestor::div[@tabindex="-1"][1]` à `ancestor::div[@tabindex][1]` ; aucune autre ligne ne change.

## Tests du compte de développement (D-071)

API : dev-admin.test.ts (DEV-1 à 6), dev-admin-garde.test.ts (DEV-7, 8, hors rouge), dev-env.test.ts (DEV-9). Écran : e2e/tests/lot3b-connexion.spec.ts (nouveau fichier). Les valeurs viennent de SPEC §2 (compte de développement).

| Id | Cas | Spec | Lot | Fichier |
|---|---|---|---|---|
| DEV-1-r1 | Révision de DEV-1 (D-031, D-077) : `NODE_ENV=development`, base vide, `DEV_ADMIN` absente : un administrateur actif, nom « Administrateur », login « admin », email null, est créé ; un avertissement est écrit au journal | 2, D-071 | dev | packages/api/test/dev-admin.test.ts |
| DEV-2 | Après DEV-1, POST /api/auth/login admin / admin → 200, rôle administrateur | 2, D-071 | dev | packages/api/test/dev-admin.test.ts |
| DEV-3 | Base non vide (un utilisateur) : aucune création, la table est inchangée | 2, D-071 | dev | packages/api/test/dev-admin.test.ts |
| DEV-4 | `NODE_ENV` « test », puis « production », puis absente, base vide : aucune création, table vide | 2, D-071 | dev | packages/api/test/dev-admin.test.ts |
| DEV-5 | Second démarrage : un seul administrateur, pas de doublon, pas de second avertissement | 2, D-071 | dev | packages/api/test/dev-admin.test.ts |
| DEV-6 | `NODE_ENV=development`, base vide, `DEV_ADMIN=0` : aucune création, table vide | 2, D-071 | dev | packages/api/test/dev-admin.test.ts |
| DEV-7 | `createAdmin` refuse toujours « admin » comme email ; rien n'est créé (garde, vert d'emblée) | 2, D-071 | dev | packages/api/test/dev-admin-garde.test.ts |
| DEV-8-r1 | `createAdmin` refuse toujours un mot de passe vide ; rien n'est créé (garde, vert d'emblée, révision D-076) | 2, D-071, D-076 | dev | packages/api/test/dev-admin-garde.test.ts |
| DEV-9 | `chargerEnv(fichier)` : charge les variables d'un fichier présent ; une variable déjà définie garde sa valeur ; fichier absent : sans effet, sans erreur | D-071 | dev | packages/api/test/dev-env.test.ts |
| E2E-45-r1 | Révision de E2E-45 (D-031, D-077) : écran Connexion : le champ « Identifiant » n'a pas `type="email"` ; saisir « admin » n'est pas bloqué par la validation du navigateur (la requête de connexion part) | 2, D-071 | dev | e2e/tests/lot3b-connexion.spec.ts |
| DEV-10 | Démarrage réel (`tsx src/server.ts` lancé en processus, `ENV_FILE` vers un fichier absent), `NODE_ENV` absente de l'environnement, base vide : l'API écoute, aucun utilisateur n'est créé (état en base vérifié) | 2, D-071 (7) | dev | packages/api/test/dev-demarrage.test.ts |
| DEV-11-r1 | Révision de DEV-11 (D-031, D-077) : même démarrage réel avec `NODE_ENV=development` : l'API écoute, l'administrateur de login « admin » est créé (témoin du montage, vert d'emblée) | 2, D-071 | dev | packages/api/test/dev-demarrage.test.ts |

## Tests du lot correctif REX-1 (D-072)

E2E : e2e/tests/rex1.spec.ts (nouveau fichier). Chaque test crée par l'écran l'entité qu'il vérifie ; les helpers API (`preparer`) ne servent qu'aux autres entités. E2E-46 part d'une base où seul l'administrateur existe. Les valeurs viennent de SPEC section 3, « Écrans Utilisateurs et Projets (REX-1, D-072) ». Rouges attendus avant l'implémentation (champs et boutons absents). Les valeurs de priorité et de clos, absentes des listes, sont relues en rouvrant le dialogue de modification.

| Id | Cas | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-46 | Parcours complet, administrateur seul, tout à l'écran : calendrier créé ; utilisateur ressource créé (capacité 0,5, ce calendrier) ; projet créé ; onglet Affectations : la ressource est proposée, affectée ; onglet Planning : activité créée, la ressource est proposée à l'assignation, assignée ; la ligne de l'activité affiche son nom ; libellé « Pas avant le » révisé (D-078, tests-rex1-r3) | 3 (REX-1), D-072 (1, 7) | REX-1 | e2e/tests/rex1.spec.ts |
| E2E-47 | Création d'un utilisateur avec la case « Ressource planifiable » décochée : il n'est pas proposé à l'affectation d'un projet | 3 (REX-1), D-072 (1) | REX-1 | e2e/tests/rex1.spec.ts |
| E2E-48 | Modification : un utilisateur non ressource devient ressource par le dialogue « Modifier <nom> », puis est proposé à l'affectation d'un projet | 3 (REX-1), D-072 (2) | REX-1 | e2e/tests/rex1.spec.ts |
| E2E-49 | Capacité et calendrier modifiés par le dialogue : valeurs affichées dans les colonnes Capacité et Calendrier du tableau après rechargement | 3 (REX-1), D-072 (2, 3) | REX-1 | e2e/tests/rex1.spec.ts |
| E2E-50 | Désactivation par le dialogue : badge « Inactif » après rechargement, l'utilisateur n'est plus proposé à l'affectation | 3 (REX-1), D-072 (2) | REX-1 | e2e/tests/rex1.spec.ts |
| E2E-51 | Refus : décocher « Ressource planifiable » sur un utilisateur affecté : message d'erreur, dialogue ouvert, tableau inchangé (Ressource « Oui ») après rechargement | 3 (REX-1), D-072 (4) | REX-1 | e2e/tests/rex1.spec.ts |
| E2E-52 | Refus : l'administrateur connecté se désactive : message d'erreur, dialogue ouvert, toujours actif après rechargement | 3 (REX-1), D-072 (4) | REX-1 | e2e/tests/rex1.spec.ts |
| E2E-53 | Mot de passe : nouveau mot de passe laissé vide, l'ancien connecte toujours ; nouveau mot de passe saisi, il connecte (et l'ancien ne connecte plus) | 3 (REX-1), D-072 (2) | REX-1 | e2e/tests/rex1.spec.ts |
| E2E-54 | Fiche projet : code, date de début, priorité et clos modifiés par « Modifier le projet » ; après rechargement, le code est relu dans la liste Projets ; date de début, priorité et clos sont relus en rouvrant le dialogue (D-073 2) ; libellé « Pas avant le » révisé (D-078, tests-rex1-r3) | 3 (REX-1), D-072 (5) | REX-1 | e2e/tests/rex1.spec.ts |
| E2E-55 | Fiche projet : code déjà utilisé : message « Ce code est déjà utilisé. », dialogue ouvert, code inchangé après rechargement ; libellé « Pas avant le » révisé (D-078, tests-rex1-r3) | 3 (REX-1), D-072 (5) | REX-1 | e2e/tests/rex1.spec.ts |
| E2E-56 | Liste Projets : le bouton « Modifier <nom> » ouvre le dialogue ; nom et code modifiés apparaissent dans la liste sans passer par la fiche ; libellé « Pas avant le » révisé (D-078, tests-rex1-r3) | 3 (REX-1), D-072 (6) | REX-1 | e2e/tests/rex1.spec.ts |
| E2E-57 | Liste Modèles, administrateur : même chose (« Modifier <nom> », nom et code modifiés dans la liste). Chef de projet : aucun bouton « Modifier » sur les modèles | 3 (REX-1), D-072 (6) | REX-1 | e2e/tests/rex1.spec.ts |
| E2E-58 | Chef de projet sur son projet : le dialogue « Modifier le projet » n'a pas de champ « Chef de projet » (l'administrateur en a un, témoin) ; libellé « Pas avant le » révisé (D-078, tests-rex1-r3) | 3 (REX-1), D-072 (5) | REX-1 | e2e/tests/rex1.spec.ts |

### Couverture des champs (règle « Couverture des champs », D-072)

Utilisateur (POST et PATCH /api/utilisateurs) :

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| nom | Nom (création, modification) | E2E-46, E2E-48 |
| email | Email, facultatif (création, modification ; vidé à la modification : E2E-72 ; absent à la création : E2E-71, D-077) | E2E-46, E2E-48, E2E-71, E2E-72 |
| login | Identifiant (création : vide = repris de l'email ; modification) ; colonne « Identifiant » (D-077) | E2E-71, E2E-72, E2E-73, E2E-74 |
| initiales | Initiales, facultatives (création, modification) ; colonne « Initiales » (D-077) ; écran consommateur : texte à droite des barres du Gantt du projet et de l'Accueil, case « Initiales » (lot 3d-1, D-088 (2)) | E2E-71, E2E-72, E2E-125, E2E-129, E2E-130, E2E-131 |
| mot_de_passe | Mot de passe (création) ; Nouveau mot de passe, facultatif (modification) | E2E-46, E2E-53, E2E-69, E2E-70 |
| role | Rôle (création, modification) | E2E-46, E2E-48 |
| est_ressource | Ressource planifiable (création, modification) | E2E-47, E2E-48, E2E-51 |
| capacite | Capacité (j/jour) (création, modification) | E2E-46, E2E-49 |
| calendrier_id | Calendrier (création, modification) | E2E-46, E2E-49 |
| actif | Actif (modification seulement ; création : toujours actif, hors écran, un compte se crée actif) | E2E-50, E2E-52 |

Projet et modèle (POST et PATCH /api/projets, /api/modeles) :

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| code | Code (création, modification) | E2E-54, E2E-55, E2E-56 |
| nom | Nom (création, modification) | E2E-56 |
| date_debut | « Pas avant le » pour un projet ordinaire (création, prérempli à la date du jour ; modification), « Date de début » pour un modèle, la copie et la création depuis un modèle (D-078) | E2E-54, E2E-75, E2E-77 |
| priorite | Priorité (modification seulement ; création : hors écran, défaut 500 de l'API, D-073 5) | E2E-54 |
| clos | Clos (modification seulement ; sans objet à la création) | E2E-54 |
| chef_id | Chef de projet (création : facultatif, « Moi (par défaut) » = non envoyé, D-078 ; modification pour l'administrateur sur un projet ordinaire) | E2E-58, E2E-75 |
| parent_id | « Projet parent » (création et modification d'un projet ordinaire, D-079). Modèles : hors écran en V1, l'écran Modèles n'a pas d'arborescence (D-079 9) ; la copie reste un projet racine | E2E-79, E2E-82, E2E-83, E2E-84-r1 |
| est_modele | Hors écran : fixé à la création par la route (POST /api/modeles), jamais modifiable (D-038) | — |

## Tests du lot 3c, Calcul (D-074)

API : packages/api/test/lot3c-calcul.test.ts (nouveau fichier). Le délai du verrou est injecté par `AppDeps.delaiVerrouCalcul` (ms, nom retenu par les tests) ; le verrou est tenu par une autre session (`pg_advisory_lock(hashtext('calcul'))`). TRX-5 est vert d'emblée (non-régression). E2E : e2e/tests/lot3c.spec.ts (nouveau fichier), horloge du navigateur figée au 06/01/2027, base remise à « administrateur seul » avant chaque test, assertions sur attributs `data-*`, rôles et API, jamais sur des pixels. Valeurs de SPEC section 6, « Calcul (lot 3c, D-074) ». Seul E2E-59 crée par l'écran les entités qu'il vérifie (règle « Parcours IHM ») ; les autres préparent par l'API.

| Id | Cas | Spec | Lot | Fichier |
|---|---|---|---|---|
| CALC-50 | POST /api/calcul avec 2147483648 dans `projets` (seul, puis avec un projet valide) : 400, base inchangée | 6 (Calcul 3), 2 | 3c-I | packages/api/test/lot3c-calcul.test.ts |
| TRX-4 | Verrou de calcul tenu par une autre session au-delà du délai (délai injecté 300 ms) : 409 { erreur: 'Un calcul est déjà en cours' } ; travail planifié et dates planifiées inchangés ; seul le verrou de l'autre session reste (aucune attente en cours) ; après sa libération, plus aucun verrou consultatif | 6 (Calcul 2), 2 | 3c-I | packages/api/test/lot3c-calcul.test.ts |
| TRX-5 | Verrou tenu puis libéré avant le délai (délai injecté 5 s, libération après 300 ms) : 200, projet calculé à D0 ; aucun verrou ne reste | 6 (Calcul 2) | 3c-I | packages/api/test/lot3c-calcul.test.ts |
| E2E-59 | Parcours complet à l'écran, administrateur seul : calendrier, ressource, projet, affectation, activité, assignation de 2 j (tout à l'écran) ; onglet Gantt, « Calculer », valider : notification « Planning calculé. », bandeau « Planning non calculé » disparu, dialogue fermé, barre de l'activité avec data-debut 2027-01-06 et data-fin 2027-01-07 ; libellé « Pas avant le » révisé (D-078, tests-lot3c-r1) | 6 (Calcul 4, 5, 7) | 3c-E | e2e/tests/lot3c.spec.ts |
| E2E-60 | Dialogue : projet courant coché, les autres non ; date = date figée du navigateur ; la requête POST /api/calcul (interceptée) porte d0 et les seuls projets cochés | 6 (Calcul 5) | 3c-E | e2e/tests/lot3c.spec.ts |
| E2E-61 | « Tout cocher » puis « Calculer » : deux projets calculés (dates planifiées relues par l'API) ; « Tout décocher » décoche tout | 6 (Calcul 5) | 3c-E | e2e/tests/lot3c.spec.ts |
| E2E-62 | Aucune case cochée (décochée à la main, ou « Tout décocher ») : bouton « Calculer » du dialogue inactif ; actif dès qu'une case est cochée | 6 (Calcul 5) | 3c-E | e2e/tests/lot3c.spec.ts |
| E2E-63 | Liste : modèles et projets clos absents, sous-projet absent et sa racine présente, tri par code ; ouvert depuis la fiche d'un sous-projet, la racine est cochée | 6 (Calcul 5) | 3c-E | e2e/tests/lot3c.spec.ts |
| E2E-64 | Pas de bouton « Calculer » pour une ressource affectée, pour un chef en lecture seule (peut_ecrire faux, relu par l'API) ni sur la fiche d'un modèle ; témoin : l'administrateur le voit sur un projet ordinaire | 6 (Calcul 4) | 3c-E | e2e/tests/lot3c.spec.ts |
| E2E-65 | Refus 422 entree_invalide simulé par interception (la base interdit un START sans début validé, contrainte `activite_debut_requis` : le cas réel est inatteignable) avec l'identifiant d'une activité START : message « Calcul impossible : données incomplètes sur <nom de l'activité>. », dialogue ouvert ; identifiant d'un autre projet : « … sur élément <id>. » ; Gantt inchangé (bandeau présent, dates planifiées nulles dans l'API) | 6 (Calcul 8) | 3c-E | e2e/tests/lot3c.spec.ts |
| E2E-66 | 409 simulé par interception : message « Un calcul est déjà en cours. Réessayez dans un instant. » en role=alert dans le dialogue, dialogue ouvert | 6 (Calcul 8) | 3c-E | e2e/tests/lot3c.spec.ts |
| E2E-67 | Avertissements reste_non_pose simulés par interception : notification listant « <activité> — <ressource> : 1,5 j non posé » et « … : 0,25 j non posé », dialogue fermé | 6 (Calcul 7) | 3c-E | e2e/tests/lot3c.spec.ts |
| E2E-68 | Bouton « Calculer » dans le bandeau « Planning non calculé » : ouvre le même dialogue, projet courant coché | 6 (Calcul 4) | 3c-E | e2e/tests/lot3c.spec.ts |
| CLC-1 | Projets listés : racines où l'on écrit, ni modèle ni clos, triées par code | 6 (Calcul 5) | 3c-E | packages/web/test/calcul.test.ts |
| CLC-2 | Racine d'un projet, d'un sous-projet, d'un sous-sous-projet ; parent hors liste : dernier connu | 6 (Calcul 5) | 3c-E | packages/web/test/calcul.test.ts |
| CLC-3 | Libellé « <code> — <nom> » | 6 (Calcul 5) | 3c-E | packages/web/test/calcul.test.ts |
| CLC-4 | Textes des refus (cycle, données incomplètes, 409, autre) ; identifiant inconnu « élément <id> » ; noms séparés par « , » | 6 (Calcul 8, 10) | 3c-E | packages/web/test/calcul.test.ts |
| CLC-5 | Lignes d'avertissement reste_non_pose : virgule décimale ; assignation introuvable « assignation <id> » ; autres codes ignorés | 6 (Calcul 7, 11) | 3c-E | packages/web/test/calcul.test.ts |

### Couverture des champs, POST /api/calcul (règle « Couverture des champs », D-072)

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| projets | Cases à cocher « <code> — <nom> » du dialogue « Calculer le planning » | E2E-59, E2E-60, E2E-61, E2E-62, E2E-63 |
| d0 | Date de début du calcul (prérempli à la date du navigateur) | E2E-59, E2E-60 |

## Tests de REX-2, R2-A (D-076)

API : packages/api/test/rex2.test.ts (nouveau fichier). E2E : e2e/tests/rex2.spec.ts (nouveau fichier, base « administrateur seul », tout à l'écran). Les valeurs viennent de SPEC §2 (create-admin) et §3 (« Mot de passe (REX-2, D-076) »). Révisions sous tag (D-031) : USR-13-r1, DEV-8-r1 (voir leur place plus haut) et le cas « mot de passe vide » de lot1-complements.test.ts (POST /api/utilisateurs, 400, `''` à la place de `'court'`).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| USR-14 | createAdmin avec le mot de passe « a » : administrateur créé ; connexion par POST /api/auth/login avec « a » → 200 | 2, D-076 | REX-2 R2-A | packages/api/test/rex2.test.ts |
| USR-15 | POST /api/utilisateurs avec mot_de_passe « a » → 201 ; connexion avec « a » → 200 | 3 (REX-2), D-076 | REX-2 R2-A | packages/api/test/rex2.test.ts |
| USR-16 | PATCH /api/utilisateurs/:id avec mot_de_passe « b » → 200 ; connexion avec « b » → 200, avec l'ancien → 401 | 3 (REX-2), D-076 | REX-2 R2-A | packages/api/test/rex2.test.ts |
| USR-17 | Garde (vert d'emblée) : POST avec mot_de_passe '' → 400, aucun utilisateur créé ; PATCH avec '' → 400, l'ancien mot de passe connecte toujours | 3 (REX-2), D-076 | REX-2 R2-A | packages/api/test/rex2.test.ts |
| E2E-69 | L'administrateur crée un utilisateur avec le mot de passe « a » à l'écran ; déconnexion ; connexion de cet utilisateur avec « a » : réussie | 3 (REX-2), D-076 | REX-2 R2-A | e2e/tests/rex2.spec.ts |
| E2E-70 | Dialogue « Modifier <nom> », nouveau mot de passe « b », Enregistrer ; déconnexion ; connexion avec « b » : réussie | 3 (REX-2), D-076 | REX-2 R2-A | e2e/tests/rex2.spec.ts |

## Tests de REX-2, R2-D (D-077)

API : packages/api/test/rex2d.test.ts (nouveau fichier). E2E : e2e/tests/rex2d.spec.ts (nouveau fichier, base « administrateur seul », tout à l'écran ; il supprime lui-même, avant et après chaque test, tout utilisateur autre que l'administrateur e2e, par id ou nom, valable avant et après la migration 011). Valeurs de SPEC §2 (Identifiant de connexion, Connexion par le login seul, Initiales, create-admin) et §3 (« Identifiant et initiales »). Révisions sous tag (D-031, D-077) : DEV-1-r1, DEV-11-r1, E2E-45-r1 (voir leur place plus haut) ; changements mécaniques « Email » → « Identifiant » du champ de connexion dans e2e/tests/helpers.ts, login.spec.ts, lot1-helpers.ts, rex1.spec.ts (E2E-53), rex2.spec.ts, sans nouvel identifiant. `seedUser` et `login` de packages/api/test/helpers.ts restent tels quels (D-077 4, 5).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| MIG-8 | Migration 011 : base amenée à la version 10 avec deux utilisateurs (email « x@example.test » ; email « admin »), puis migration (versions du dépôt > 10 appliquées) : login « x@example.test » et « admin » ; email du second null ; initiales null ; insertion sans login : login = email ; insertion sans login ni email refusée ; deux logins égaux à la casse près refusés | 2, 3, D-077 (4, 7) | REX-2 R2-D | packages/api/test/rex2d.test.ts |
| USR-18 | POST avec login « bob », sans email → 201, corps login « bob », email null ; connexion { identifiant: 'bob' } → 200 | 2, D-077 (1, 2, 5) | REX-2 R2-D | packages/api/test/rex2d.test.ts |
| USR-19 | POST avec email seul → 201, login = email (minuscules) | 2, D-077 (4) | REX-2 R2-D | packages/api/test/rex2d.test.ts |
| USR-20 | POST sans login ni email → 400 ; login '' → 400 ; rien n'est créé | 2, D-077 (1, 4) | REX-2 R2-D | packages/api/test/rex2d.test.ts |
| USR-21 | Login normalisé (« Bob » avec espaces de bord → « bob ») ; second POST « BOB » → 409 { erreur: 'Identifiant déjà utilisé' }, rien n'est créé ; email en double → 409 'Email déjà utilisé' inchangé | 2, D-077 (1, 8) | REX-2 R2-D | packages/api/test/rex2d.test.ts |
| USR-22 | PATCH login → 200, le nouveau connecte, l'ancien → 401 ; PATCH email null → 200, email null, login inchangé ; PATCH login '' → 400, état inchangé ; PATCH login vers un login existant → 409, rien de modifié ; PATCH email seul : login inchangé | 2, D-077 (6, 8) | REX-2 R2-D | packages/api/test/rex2d.test.ts |
| USR-23 | Initiales « AB » en POST et en PATCH, relues par GET /api/utilisateurs ; 5 caractères → 400, rien d'écrit ; PATCH initiales null → aucune ; POST initiales «  ab  » → relues « ab » (espaces de bord retirés, casse gardée) ; PATCH initiales '' → 200, relues null | 2, D-077 (3, 9) | REX-2 R2-D | packages/api/test/rex2d.test.ts |
| USR-24 | createAdmin avec login seul ; avec email seul (login = email) ; sans les deux → erreur, rien n'est créé | 2, D-077 (4, 10) | REX-2 R2-D | packages/api/test/rex2d.test.ts |
| USR-25 | Garde (vert d'emblée) : GET /api/annuaire ne contient ni login, ni initiales, ni email | 2, D-077 (9) | REX-2 R2-D | packages/api/test/rex2d.test.ts |
| AUTH-12 | Connexion par `identifiant` sans tenir compte de la casse ni des espaces de bord ; clé `email` acceptée comme synonyme ; utilisateur login « bob » et email « bob@example.test » : connexion avec l'email → 401 ; GET /api/auth/me renvoie login et initiales | 2, D-077 (5, 9) | REX-2 R2-D | packages/api/test/rex2d.test.ts |
| E2E-71 | Création à l'écran : Identifiant « bob71 », sans email, Initiales « B7 » ; la ligne affiche « bob71 » et « B7 » ; déconnexion ; connexion avec « bob71 » : réussie | 3 (REX-2), D-077 (12) | REX-2 R2-D | e2e/tests/rex2d.spec.ts |
| E2E-72 | « Modifier <nom> » : identifiant et initiales changés, email vidé, Enregistrer ; la ligne est à jour ; connexion avec le nouvel identifiant : réussie | 3 (REX-2), D-077 (12) | REX-2 R2-D | e2e/tests/rex2d.spec.ts |
| E2E-73 | Identifiant et email vides : « Renseignez un identifiant ou un email. », dialogue ouvert, aucune ligne créée ; identifiant déjà utilisé : « Cet identifiant est déjà utilisé. », dialogue ouvert | 3 (REX-2), D-077 (12) | REX-2 R2-D | e2e/tests/rex2d.spec.ts |
| E2E-74 | Écran Connexion : champ « Identifiant » ; mauvais mot de passe : « Identifiant ou mot de passe incorrect. » | 2, D-077 (11) | REX-2 R2-D | e2e/tests/rex2d.spec.ts |

## Tests de REX-2, R2-B (D-078)

API : packages/api/test/rex2b.test.ts (nouveau fichier). E2E : e2e/tests/rex2b.spec.ts (nouveau fichier, base « administrateur seul » remise à zéro par le nom comme rex2d.spec.ts, horloge du navigateur figée au 06/01/2027). Valeurs de SPEC §2 (puce `debut_planifie`) et §3 (« Formulaire projet »). Révision sous tag (D-031) : E2E-6-r1 (lot1.spec.ts, attendu changé). Libellé « Date de début » → « Pas avant le » révisé sans changement d'identifiant : E2E-46, E2E-54, E2E-55, E2E-56, E2E-58 (rex1.spec.ts, tests-rex1-r3) et E2E-59 (lot3c-helpers.ts, tests-lot3c-r1). PRJ-25 est vert d'emblée (garde).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| PRJ-24 | GET /api/projets et GET /api/projets/:id portent `debut_planifie` et `fin_planifiee` : null avant calcul ; après POST /api/calcul, égaux aux valeurs de `projet` dans GET /api/projets/:id/gantt | 2 (REX-2), D-078 (5) | REX-2 R2-B | packages/api/test/rex2b.test.ts |
| PRJ-25 | Garde (vert d'emblée) : PATCH /api/projets/:id avec `debut_planifie` → 400, projet inchangé ; après un calcul, l'historique du projet ne contient aucune entrée sur `debut_planifie` ni `fin_planifiee` | 2 (REX-2), D-078 (5) | REX-2 R2-B | packages/api/test/rex2b.test.ts |
| E2E-75 | Administrateur, « Nouveau projet » : « Pas avant le » prérempli 2027-01-06, aucun champ « Date de début » ; « Chef de projet » sur « Moi (par défaut) » ; création avec code et nom seuls ; la ligne affiche l'administrateur comme chef ; relecture API : `date_debut` 2027-01-06, `chef_id` = administrateur | 3 (REX-2), D-078 (1, 2) | REX-2 R2-B | e2e/tests/rex2b.spec.ts |
| E2E-76 | Projet de `date_debut` 2027-01-04 avec une activité sans assignation : colonne « Début » = « — » ; après POST /api/calcul (d0 2027-01-06), la colonne affiche `debut_planifie` relu par l'API, différent de 2027-01-04 | 3 (REX-2), D-078 (4) | REX-2 R2-B | e2e/tests/rex2b.spec.ts |
| E2E-77 | « Modifier le projet » d'un projet ordinaire : « Pas avant le » portant la date du projet, modifié, enregistré, relu à la réouverture ; sur un modèle, « Date de début » ; « Nouveau modèle » et le dialogue de copie : « Date de début » | 3 (REX-2), D-078 (2, 3) | REX-2 R2-B | e2e/tests/rex2b.spec.ts |
| E2E-78 | Écran Modèles : le bouton de nom accessible « Créer un projet depuis <nom> » affiche le texte « Créer un projet » et ouvre le dialogue de création depuis le modèle | 3 (REX-2), D-078 (6) | REX-2 R2-B | e2e/tests/rex2b.spec.ts |

## Tests de REX-2, R2-C (D-079)

Web : packages/web/test/arbre.test.ts (nouveau fichier ; fonctions pures de `packages/web/src/projets/arbre.ts`, à créer en phase verte). Signatures attendues : `racines(projets)`, `sousProjets(projets, parentId)`, `aplatir(projets, ouverts: Set<number>, elements: Map<number, ElementArbre[]>)` (lignes `{ type: 'projet', projet, profondeur }` ou `{ type: 'element', element, profondeur }`), `optionsProjetParent(projets, modifieId?)` (`{ value, label }[]`). Profondeur : racine 0 ; sous-projet = profondeur du parent + 1 ; élément = profondeur du projet + nombre de niveaux de son WBS (« 1 » → +1, « 1.1 » → +2). E2E : e2e/tests/rex2c.spec.ts (nouveau fichier, base « administrateur seul » remise à zéro par le nom comme rex2b.spec.ts, horloge du navigateur figée au 06/01/2027). Aucun test sous tag n'est révisé dans cette tranche.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| ARB-1 | Racines : projet sans parent ou dont le parent n'est pas dans la liste visible ; triées par code sans tenir compte de la casse (codes « b », « A », « c » → A, b, c) | 3 (REX-2), D-079 (2) | REX-2 R2-C | packages/web/test/arbre.test.ts |
| ARB-2 | Sous-projets imbriqués sur trois niveaux, tous dépliés : lignes A, B, C, D dans cet ordre, profondeurs 0, 1, 2, 3 | 3 (REX-2), D-079 (4, 6) | REX-2 R2-C | packages/web/test/arbre.test.ts |
| ARB-3 | Ordre sous un projet déplié : éléments en ordre WBS (profondeurs 1, 2, 1 pour « 1 », « 1.1 », « 2 »), puis le sous-projet ; projet replié : sa seule ligne ; sous-projet déplié sous un parent replié : non visible | 3 (REX-2), D-079 (3, 4, 5) | REX-2 R2-C | packages/web/test/arbre.test.ts |
| ARB-4 | Options de « Projet parent » : projets ordinaires où l'on écrit, triés par code sans casse, libellé « <code> — <nom> » ; modèles et projets en lecture seule exclus ; en modification, sans le projet ni ses descendants (deux niveaux) | 3 (REX-2), D-079 (8) | REX-2 R2-C | packages/web/test/arbre.test.ts |
| E2E-79 | Parcours à l'écran, administrateur seul : A créé, B avec « Projet parent » = A, C avec « Projet parent » = B, tout par l'écran ; liste : seul A visible ; « Déplier A » : B visible et indenté ; « Déplier B » : C visible ; `parent_id` de B et de C relus par l'API | 3 (REX-2), D-079 (1, 3, 6, 8) | REX-2 R2-C | e2e/tests/rex2c.spec.ts |
| E2E-79-r1 | Même parcours qu'E2E-79 (D-031, D-110 (3), tag `tests-rex2-c-r3`) : les abscisses du nom de Beta79 et de Gamma79 sont comparées par `expect.poll` (retrait supérieur à celui du parent), la mise en page du tableau changeant après le dépliage ; intention inchangée | 3 (REX-2), D-079 (1, 3, 6, 8) | REX-2 R2-C | e2e/tests/rex2c.spec.ts |
| E2E-80 | Projet préparé par l'API (activité parente, sous-activité, jalon, sous-projet), calculé : replié, aucune de ces lignes ; « Déplier » : lignes dans l'ordre WBS puis le sous-projet ; lignes d'élément sans lien ni bouton ; badge « Jalon » ; Début de l'activité = `debut_planifie` relu par l'API ; « Replier » les masque | 3 (REX-2), D-079 (3, 4, 5) | REX-2 R2-C | e2e/tests/rex2c.spec.ts |
| E2E-81-r1 | « Tout déplier » avec deux racines et un sous-sous-projet : toutes les lignes visibles, bouton relibellé « Tout replier » ; « Tout replier » : seules les racines restent ; sous-sous-projet renommé « Petit-fils un81 » (D-031, tests-rex2-c-r1 : « Sous-sous un81 » contenait « Sous un81 », le filtre hasText trouvait deux lignes) | 3 (REX-2), D-079 (3, 4) | REX-2 R2-C | e2e/tests/rex2c.spec.ts |
| E2E-82 | « Modifier le projet » d'un projet qui a un descendant : « Projet parent » ne propose ni lui-même ni ce descendant ; rattachement à une autre racine : l'arbre est à jour, `parent_id` relu par l'API ; retour à « Aucun (projet racine) » : redevient racine, `parent_id` null | 3 (REX-2), D-079 (8) | REX-2 R2-C | e2e/tests/rex2c.spec.ts |
| E2E-83 | Chef de projet : « Projet parent » ne propose que ses projets ; ressource affectée à un sous-projet seulement : ce sous-projet est affiché comme racine, elle peut le déplier, aucune ligne n'a de bouton d'écriture | 3 (REX-2), D-079 (2, 8) | REX-2 R2-C | e2e/tests/rex2c.spec.ts |
| E2E-84-r1 | Refus 422 simulé par interception du PATCH, corps avec `code: 'arborescence_invalide'` (D-031, D-083 (14), tag `tests-rex2-c-r2`) : « Ce projet parent n’est pas possible. » en role=alert, dialogue ouvert, `parent_id` inchangé (relu par l'API) | 3 (REX-2), D-079 (8) | REX-2 R2-C | e2e/tests/rex2c.spec.ts |
| E2E-85 | Projet sans élément ni sous-projet : « Déplier » affiche « Aucune activité ni jalon. » ; échec simulé (interception de /gantt, 500) : « Impossible de charger le contenu du projet. », les autres lignes restent | 3 (REX-2), D-079 (4) | REX-2 R2-C | e2e/tests/rex2c.spec.ts |

## Tests du Gantt global, G2 (D-080, D-081)

Web : packages/web/test/accueil.test.ts (nouveau fichier ; fonctions pures de `packages/web/src/accueil/logique.ts`, à créer en phase verte). Signatures attendues : `projetsAccueil(projets)` (projets ordinaires non clos, descendance d'un projet clos exclue, triés par racines D-079 (2) : renvoie les **racines** affichées) et `joursAccueil(racines)` (`{ debutProjet, jours }` : `debutProjet` = plus petite `date_debut` des projets affichés, `jours` = `debut_planifie` et `fin_planifiee` présentes). Plage : `calculerPlage` de `gantt/plage.ts`, inchangée. E2E : e2e/tests/accueil-g2.spec.ts (nouveau fichier, base « administrateur seul » remise à zéro par le nom comme rex2c.spec.ts, horloge du navigateur figée au 06/01/2027 ; données préparées par l'API, tout est lu à l'écran). Aucun test sous tag n'est révisé dans cette tranche. Couverture des champs : aucun champ modifiable (écran en lecture seule).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| ACC-1 | Un modèle (`est_modele` vrai) n'est jamais une racine affichée ; un projet ordinaire voisin l'est | 6 Accueil (1), D-080 | G2 | packages/web/test/accueil.test.ts |
| ACC-2 | Un projet clos est absent ; un projet non clos voisin est présent | 6 Accueil (1), D-081 | G2 | packages/web/test/accueil.test.ts |
| ACC-3 | Sous-projet non clos d'un projet clos : absent, et non promu racine ; petit-fils non clos d'un projet clos, sous un sous-projet ouvert : absent aussi | 6 Accueil (1), D-081 | G2 | packages/web/test/accueil.test.ts |
| ACC-4 | Projet dont le parent n'est pas dans la liste visible (ressource affectée à un sous-projet seulement) : racine affichée | 6 Accueil (1), D-079 (2), D-081 | G2 | packages/web/test/accueil.test.ts |
| ACC-5 | Sous-projet d'un projet ouvert : pas une racine (racines « b », « A », « c » → A, b, c ; le sous-projet « 0 » de « b » n'est pas dans le résultat) | 6 Accueil (1, 3), D-079 (2) | G2 | packages/web/test/accueil.test.ts |
| ACC-6 | Jours connus : A (`date_debut` 2027-01-04, planifié 2027-01-06 → 2027-02-03) et B non calculé (`date_debut` 2027-01-11, dates planifiées null) : `debutProjet` 2027-01-04, `jours` [2027-01-06, 2027-02-03] ; B ne contribue pas aux jours | 6 Accueil (6) | G2 | packages/web/test/accueil.test.ts |
| ACC-7 | Aucun projet calculé : `jours` vide, `debutProjet` = plus petite `date_debut` ; aucun projet : `debutProjet` null et `jours` vide | 6 Accueil (6, 7) | G2 | packages/web/test/accueil.test.ts |
| ACC-8 | Plage de l'Accueil (`calculerPlage` sur le résultat d'ACC-6) : début 2027-01-04, fin 2027-02-21 (le plus grand jour 2027-02-03, dimanche de sa semaine 2027-02-07, plus 14 jours) | 6 Accueil (6), Affichage (4) | G2 | packages/web/test/accueil.test.ts |
| E2E-86-r3 | Racines R-b, R-A, R-c créées par l'API (+ un sous-projet de R-A, un projet clos avec un sous-projet non clos, un modèle ; le projet R-CLOS est clos en SQL, donnée incohérente, D-083 (10), -r3) : lignes Code dans l'ordre R-A, R-b, R-c ; sous-projets, projet clos, sa descendance et modèle absents ; trois boutons « Déplier » et « Tout déplier » (G3), un bouton « Calculer » pour l'administrateur (G4, -r2) ; ligne « Connecté en tant que … » présente ; lien Nom → `/projets/:id` de la fiche | 6 Accueil (1, 3, 7) | G2 | e2e/tests/accueil-g2.spec.ts |
| E2E-87 | Deux projets calculés : tableau aux colonnes Code, Nom, Début, Fin, Drapeaux ; Début et Fin au format JJ/MM/AAAA égaux aux `debut_planifie` et `fin_planifiee` relus par l'API ; Drapeaux vide ; une barre `role="img"` par projet avec `data-projet-id` et nom accessible « <nom>, du JJ/MM/AAAA au JJ/MM/AAAA » ; trait du jour `data-aujourdhui` 2027-01-06 | 6 Accueil (3, 4, 5) | G2 | e2e/tests/accueil-g2.spec.ts |
| E2E-88 | Zoom : par défaut `data-zoom` « semaine » ; clic « Jour » : adresse `/?zoom=jour`, `data-zoom` « jour » ; rechargement : conservé ; `/?zoom=xyz` : « semaine » | 6 Accueil (4) | G2 | e2e/tests/accueil-g2.spec.ts |
| E2E-89 | Base « administrateur seul » : « Aucun projet à afficher. », ni tableau ni SVG, ligne « Connecté en tant que » présente | 6 Accueil (7) | G2 | e2e/tests/accueil-g2.spec.ts |
| E2E-90 | Projets non calculés : bandeau « Planning non calculé » en role=status, lignes visibles (Début et Fin « — »), aucune barre `role="img"` | 6 Accueil (3, 7) | G2 | e2e/tests/accueil-g2.spec.ts |
| E2E-91 | Ressource affectée à un sous-projet seulement : ce sous-projet est affiché comme racine, son parent absent, aucun bouton | 6 Accueil (1), D-079 (2) | G2 | e2e/tests/accueil-g2.spec.ts |
| E2E-92-r4 | Zones focalisables de noms « Tableau du Gantt global » et « Calendrier du Gantt global » ; ordre de tabulation : boutons Jour, Semaine, Mois, « Calculer », « Tout déplier », puis la zone du tableau, puis les liens Nom qu'elle contient, puis la zone du SVG | 6 Accueil (9) | G2 | e2e/tests/accueil-g2.spec.ts ; révisé : arrêt « Initiales » après « Mois » dans l'ordre de focus (D-091, D-092, tests-accueil-g2-r5) |

## Tests du Gantt global, G3 (D-080, D-081, D-082)

Web : packages/web/test/accueil-g3.test.ts (nouveau fichier ; `accueil/logique.ts` complété en phase verte). Signatures attendues : `projetsVisibles(projets)` (projets ordinaires non clos, descendance d'un projet clos exclue, liste plate, ordre d'entrée), `lignesAccueil(projets, ouverts: Set<number>, elements: Map<number, ElementGantt[]>)` (lignes de `aplatir`, arbre.ts, sur `projetsVisibles(projets)`), `joursAccueil(affiches, charges?: Map<number, ElementGantt[]>)` (G2 inchangé sans `charges` ; avec `charges`, ajoute les dates planifiées et validées des éléments, via `joursConnus`). `affiches` est la liste plate des projets visibles (racines et sous-projets), non les seules racines : la plage ne dépend d'aucun état de dépliage, donc un repli ne la réduit pas (D-080 6). E2E : e2e/tests/accueil-g3.spec.ts et e2e/tests/accueil-g3-captures.spec.ts (nouveaux fichiers, base « administrateur seul » remise à zéro par le nom, horloge du navigateur figée au 06/01/2027 ; données préparées par l'API, tout est lu à l'écran ; E2E-99 recule en base les dates planifiées d'une activité pour simuler un agrégat de projet non à jour). Aucun test sous tag n'est révisé. Couverture des champs : aucun champ modifiable (écran en lecture seule).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| ACC-9 | Projet A déplié, éléments WBS 1, 1.1, 2 chargés, sous-projets « S-b », « S-CLOS » (clos), « S-A », racine « B » : lignes A (0), 1 (1), 1.1 (2), 2 (1), S-A (1), S-b (1), B (0) ; le sous-projet clos est absent | 6 Accueil (2), D-079 (4), D-081 | G3 | packages/web/test/accueil-g3.test.ts |
| ACC-10 | Tout replié avec éléments en cache : racines seules ; sous-projet déplié sous un parent replié : absent ; tout déplié : descendance d'un projet clos et éléments d'un projet clos absents ; profondeur d'un élément de sous-projet = profondeur du sous-projet + niveaux du WBS | 6 Accueil (2), D-079 (4), D-081 | G3 | packages/web/test/accueil-g3.test.ts |
| ACC-11 | Plage élargie : projet A (début 2027-01-04, planifié 2027-01-06 → 2027-02-03) et B non calculé ; élément chargé avec début validé 2026-12-16 (mercredi) : plage 2026-12-14 → 2027-02-21 ; sans élément chargé : 2027-01-04 → 2027-02-21 (ACC-8) | 6 Accueil (6), Affichage (4) | G3 | packages/web/test/accueil-g3.test.ts |
| ACC-12 | Plage non réduite : `projetsVisibles` renvoie A, B, S (projet clos exclu) ; avec la fin planifiée d'un élément en cache au 2027-03-31 (mercredi ; dimanche 2027-04-04, + 14 jours) : plage 2027-01-04 → 2027-04-18 ; `joursAccueil` n'a aucun paramètre de dépliage ; tout replié, `lignesAccueil` ne montre que les racines sans changer cette plage | 6 Accueil (6), D-080 (6) | G3 | packages/web/test/accueil-g3.test.ts |
| E2E-93 | Projet calculé (activité parente, sous-activité, jalon, lien FD fille → jalon, sous-projet avec activité) : replié au chargement (aria-expanded faux, aucune barre d'élément) ; déplié : lignes Projet, Parente, Fille, Livraison + badge « Jalon », Sous-projet, dans l'ordre ; Code = WBS relu par l'API ; Début et Fin = dates planifiées relues par l'API ; Drapeaux vide ; aucun bouton ni lien sur une ligne d'élément ; barres `role="img"` de nom « <nom>, du … au … » (jalon « <nom>, le … ») ; un lien FD dessiné ; sous-projet : une seule barre `data-projet-id` ; replié : barres d'éléments et lien disparus | 6 Accueil (2, 3, 5), 3b (5, 7, 12, 14) | G3 | e2e/tests/accueil-g3.spec.ts |
| E2E-93-r1 | Même parcours qu'E2E-93 (D-031, D-110 (4), tag `tests-accueil-g3-r3`) : la liste des noms affichés après « Déplier » est lue par `expect.poll` (l'écran charge les éléments après avoir posé `aria-expanded`) ; valeurs et intention inchangées | voir E2E-93 | voir E2E-93 | e2e/tests/accueil-g3.spec.ts |
| E2E-94 | Premier dépliage : un appel `GET /gantt` ; repli puis nouveau dépliage : lignes et barre de retour, compteur inchangé (1) | 6 Accueil (2) | G3 | e2e/tests/accueil-g3.spec.ts |
| E2E-95 | « Tout déplier » avec deux racines et un sous-sous-projet : toutes les lignes (éléments compris) dans l'ordre, un appel `/gantt` par projet, bouton relibellé « Tout replier », chaque « Replier <nom> » en aria-expanded vrai ; « Tout replier » : seules les racines | 6 Accueil (2) | G3 | e2e/tests/accueil-g3.spec.ts |
| E2E-96 | Sous-projet clos d'un projet ouvert : absent après « Déplier » ; le sous-projet ouvert est présent | 6 Accueil (1, 2), D-081 | G3 | e2e/tests/accueil-g3.spec.ts |
| E2E-97 | Projet sans élément ni sous-projet : « Aucune activité ni jalon. » au dépliage, absent au repli | 6 Accueil (2) | G3 | e2e/tests/accueil-g3.spec.ts |
| E2E-98 | `/gantt` d'un projet intercepté (500) : « Impossible de charger le contenu du projet. » ; l'autre projet reste déplié avec ses lignes et sa barre | 6 Accueil (2) | G3 | e2e/tests/accueil-g3.spec.ts |
| E2E-99 | Zoom jour ; activité dont les dates planifiées sont reculées en base après la fin du projet : au dépliage, la largeur du SVG augmente, la barre de l'élément est entièrement dans le SVG ; après repli, largeur inchangée | 6 Accueil (6), 3b (4) | G3 | e2e/tests/accueil-g3.spec.ts |
| E2E-100-r2 | Ordre de tabulation : Jour, Semaine, Mois, « Calculer », « Tout déplier », zone du tableau, « Déplier <nom> » (bouton avant le lien, comme Projets), lien du nom, zone du SVG | 6 Accueil (9) | G3 | e2e/tests/accueil-g3.spec.ts ; révisé : arrêt « Initiales » après « Mois » dans l'ordre de focus (D-091, D-092, tests-accueil-g3-r2) |
| E2E-101 | Captures 1440 px sans assertion forte : e2e/captures/accueil-replie.png (projets calculés) et accueil-deplie.png (un projet déplié, barres et liens) ; non suivies | 6 Accueil | G3 | e2e/tests/accueil-g3-captures.spec.ts |

Révision G3 (D-031, tag `tests-accueil-g2-r1`) : E2E-86, E2E-91 et E2E-92 de G2 révisés sur décision du porteur (réponse en session G3) : les boutons « Déplier » et « Tout déplier » y sont désormais attendus (E2E-86 : trois boutons « Déplier » pour trois racines ; E2E-91 : « Déplier Sous91 ») ; « Calculer » reste absent (G4) ; E2E-92 : ordre de tabulation Jour, Semaine, Mois, Tout déplier, tableau, « Déplier Projet92 », lien, calendrier.

## Tests du Gantt global, G4 (D-080 8 et 9)

Web : packages/web/test/accueil-g4.test.ts (nouveau fichier). Signatures attendues, à créer en phase verte : `nomsElementsCharges(charges: Map<number, ElementGantt[]>): Map<number, string>` (`accueil/logique.ts`, id d'élément → nom, tous projets chargés confondus) ; `casesInitiales(projets: ProjetCalcul[], precoches: number[] | 'tous'): Set<number>` (`calcul/logique.ts` ; `'tous'` = tous les projets proposés par `projetsListes`, sinon les racines des projets précochés, comportement de 3c inchangé). Le refus est rendu par `messageRefus` (inchangé). E2E : e2e/tests/accueil-g4.spec.ts (nouveau fichier, base « administrateur seul » remise à zéro par le nom, horloge du navigateur figée au 06/01/2027). E2E-102 à E2E-109 préparent par l'API ; E2E-110 est le parcours complet de la règle « Parcours IHM » (base avec l'administrateur seul, tout à l'écran, mêmes gestes que E2E-59). E2E-102 prend aussi la capture non suivie e2e/captures/accueil-calcul.png (dialogue ouvert, 1440 px) ; sans assertion propre, elle ne compte pas comme test. Valeurs de SPEC section 6, « Accueil : Gantt global » (8, 9) et « Calcul (lot 3c, D-074) » (5, 7, 8, 10, 11). Révision pré-autorisée (D-031, consigne de la session G4) : si E2E-92-r1 ou un test de G3 échoue à cause du seul bouton « Calculer » dans l'ordre de tabulation, seule cette assertion est révisée. Couverture des champs : voir le tableau en fin de section.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| ACC-13 | Éléments chargés de deux projets (ids 11 « Alpha », 12 « Beta » ; id 21 « Gamma ») : `nomsElementsCharges` renvoie 11→Alpha, 12→Beta, 21→Gamma ; `messageRefus` 422 `cycle_dependances` avec ids [11, 21, 999] : « Calcul impossible : cycle de dépendances entre Alpha, Gamma, élément 999. » ; 422 `entree_invalide` avec [12, 888] : « Calcul impossible : données incomplètes sur Beta, élément 888. » ; aucun élément chargé : « … entre élément 11. » | 6 Accueil (8), Calcul (8, 10) | G4 | packages/web/test/accueil-g4.test.ts |
| ACC-14 | `casesInitiales` : projets A (racine), B (racine), S (sous-projet de A), M (modèle), C (racine close) ; `'tous'` → {A, B} ; `[S.id]` → {A} (racine du précoché) ; `[]` → vide ; aucun projet listé avec `'tous'` → vide | 6 Accueil (8), Calcul (5) | G4 | packages/web/test/accueil-g4.test.ts |
| E2E-102 | Administrateur : bouton « Calculer » visible à côté des boutons de zoom ; dialogue avec les racines où il écrit, hors modèle et projet clos, sans sous-projet, triées par code (R-A, R-b, R-c), toutes cochées ; date = date figée du navigateur 2027-01-06 ; capture accueil-calcul.png | 6 Accueil (8), Calcul (5) | G4 | e2e/tests/accueil-g4.spec.ts |
| E2E-103 | Projet A calculable, projet B non déplié ; A déplié (aucune barre d'élément, non calculé) ; « Calculer » puis valider : dialogue fermé, notification « Planning calculé. », barres de synthèse de A et B (`data-projet-id`, `role="img"`), A reste déplié (aria-expanded vrai) avec la barre de son activité de `data-debut` 2027-01-06 et `data-fin` 2027-01-07, rechargée ; bandeau « Planning non calculé » disparu ; un GET /gantt de plus pour A seul après le calcul, aucun pour B (les GET /api/projets ne sont pas comptés) | 6 Accueil (8), Calcul (7) | G4 | e2e/tests/accueil-g4.spec.ts |
| E2E-104 | Chef de projet C1 (projets C1-1, C1-2) et projet d'un autre chef C2-1 : sur l'Accueil de C1, bouton visible, dialogue proposant C1-1 et C1-2 seulement, cochés ; la requête POST /api/calcul (interceptée) porte exactement ces deux projets | 6 Accueil (8) | G4 | e2e/tests/accueil-g4.spec.ts |
| E2E-105 | Ressource affectée à un projet : projet affiché, aucun bouton « Calculer » ; chef en lecture seule (`peut_ecrire` faux relu par l'API) : projet affiché, aucun bouton ; témoin : l'administrateur le voit sur la même base | 6 Accueil (8) | G4 | e2e/tests/accueil-g4.spec.ts |
| E2E-106-r1 | Réponse simulée avec avertissements `reste_non_pose` (1,5 j et 0,25 j) pour deux assignations de deux projets : dialogue fermé, « Planning calculé. », notification d'avertissement (role=status) listant « <activité> — <ressource> : 1,5 j non posé » et « … : 0,25 j non posé » | 6 Accueil (8), Calcul (7, 11) | G4 | e2e/tests/accueil-g4.spec.ts |
| E2E-107-r1 | 409 simulé : « Un calcul est déjà en cours. Réessayez dans un instant. » en role=alert dans le dialogue, dialogue ouvert, projets non recalculés (dates planifiées nulles relues par l'API), après « Annuler » (dialogue fermé), bandeau « Planning non calculé » visible | 6 Accueil (8), Calcul (8) | G4 | e2e/tests/accueil-g4.spec.ts |
| E2E-108 | 422 `cycle_dependances` simulé avec l'id d'une activité du projet A déplié (chargée sur l'Accueil) et l'id d'une activité du projet B non déplié : « Calcul impossible : cycle de dépendances entre <nom de l'activité de A>, élément <id de B> », dialogue ouvert, role=alert, dates planifiées nulles en base | 6 Accueil (8), Calcul (8, 10) | G4 | e2e/tests/accueil-g4.spec.ts |
| E2E-109-r1 | Ordre de tabulation (administrateur) : Jour, Semaine, Mois, « Calculer », « Tout déplier », zone du tableau, « Déplier <nom> », lien du nom, zone du SVG | 6 Accueil (9) | G4 | e2e/tests/accueil-g4.spec.ts ; révisé : arrêt « Initiales » après « Mois » dans l'ordre de focus (D-091, D-092, tests-accueil-g4-r2) |
| E2E-110 | Parcours complet à l'écran, administrateur seul : calendrier, ressource, projet, affectation, activité, assignation de 2 j (tout à l'écran, gestes d'E2E-59) ; Accueil : « Calculer », dialogue avec le projet coché, valider ; notification « Planning calculé. », barre de synthèse du projet ; « Déplier Projet » : barre de l'activité avec `data-debut` 2027-01-06 et `data-fin` 2027-01-07 sur l'Accueil | 6 Accueil (8), Calcul (4, 5, 7) | G4 | e2e/tests/accueil-g4.spec.ts |

### Couverture des champs, POST /api/calcul depuis l'Accueil (règle « Couverture des champs », G4)

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| projets | Cases à cocher « <code> — <nom> » du dialogue ouvert depuis l'Accueil (toutes cochées par défaut) | E2E-102, E2E-103, E2E-104, E2E-110 |
| d0 | Date de début du calcul (prérempli à la date du navigateur) | E2E-102, E2E-103, E2E-110 |

Révision G4 (D-031, tag `tests-accueil-g4-r1`) : E2E-106 et E2E-107 révisés sur décision du porteur (réponse en session G4) : avertissement attendu en role=status (comme le Gantt du projet) ; bandeau « Planning non calculé » vérifié après « Annuler », le dialogue ouvert masquant la page aux rôles.

Révision G4 (D-031, tag `tests-accueil-g2-r2`) : E2E-86 révisé sur décision du porteur (réponse en session G4) : « Calculer » attendu pour l'administrateur ; le reste est inchangé.

Révision G4 (D-031, décision pré-autorisée par la consigne de la session G4 ; tags `tests-accueil-g2-r3` et `tests-accueil-g3-r1`) : E2E-92 et E2E-100 : « Calculer » inséré entre le zoom et « Tout déplier » dans l'ordre de tabulation, seule assertion modifiée.

Révision Clôture (D-031, D-083 (10), tag `tests-accueil-g2-r4`) : E2E-86 révisé en E2E-86-r3 sur décision du porteur (2026-11-17) : R-CLOS, clos avec un sous-projet ouvert S-CLOS, est une donnée incohérente créée en SQL (`UPDATE projet SET clos = true`, comme accueil-g3.spec.ts) et non plus par PATCH, que D-083 (1) refuse désormais. Aucune autre assertion modifiée ; l'intention de D-081 est gardée.

## Tests de la tranche Clôture, C1 (D-083)

API : packages/api/test/cloture-c1.test.ts (nouveau fichier). Valeurs de SPEC §3, puce « Clôture (D-083) ». Chaque refus vérifie le code HTTP, le champ `code` du corps (et la présence d'`erreur`), l'empreinte de toutes les tables hors session (état en base inchangé) et l'historique inchangé (table `historique` relue). Données incohérentes (D-083 (7)) : insérées par `UPDATE` SQL direct, car l'API les refuse désormais ; chaque cas le dit. Tests verts d'emblée attendus (gardes, comportement déjà en place) : PRJ-29, PRJ-35, PRJ-36, PRJ-37, ACT-27, ACT-28. Tests à plusieurs cas découpés en un test par cas, suffixes a, b, c (décision du porteur en relecture de C1, avant le tag) ; PRJ-30b, ACT-23b et PRJ-33b (acceptations, témoin) verts d'emblée attendus. Concurrence (D-083 (6)) : PRJ-38 et ACT-29, stables sans délai arbitraire : une connexion SQL tient la ligne du projet racine (`SELECT … FOR UPDATE`) et y écrit, la requête API est lancée, on attend que PostgreSQL déclare une autre connexion en attente de verrou (`pg_stat_activity.wait_event_type = 'Lock'`, sondage borné, comme `concurrenceForcee`), puis on valide ; le résultat ne dépend d'aucune durée. Sans verrou sur la racine, la requête n'attend pas : le test échoue sur l'attente.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| PRJ-26 | Clôture refusée, activité ouverte au 3e niveau : A1 > A2 > A3 dans P, A1 et A2 closes en SQL (incohérent), A3 ouverte ; PATCH P `clos: true` → 422 `enfants_ouverts`, base et historique inchangés | 3 Clôture (1), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-27 | Clôture refusée, sous-projet ouvert au 2e niveau : P > S1 > S2, S1 clos en SQL (incohérent), S2 ouvert, aucune activité ; PATCH P `clos: true` → 422 `enfants_ouverts`, base et historique inchangés | 3 Clôture (1), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-28 | Clôture refusée, sous-projet clos contenant une activité ouverte : P > S, S clos en SQL (incohérent), activité de S ouverte ; PATCH P `clos: true` → 422 `enfants_ouverts`, base et historique inchangés | 3 Clôture (1), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-29 | Garde (vert d'emblée) : clôture acceptée, tout clos par l'API (feuille puis parente dans P, activité de S puis S), jalons ouverts dans P et dans S ; PATCH P `clos: true` → 200, `clos` vrai relu | 3 Clôture (1), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-30a | Modèle, même règle : modèle avec une activité ouverte, PATCH `clos: true` → 422 `enfants_ouverts`, base et historique inchangés | 3 Clôture (1), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-30b | Modèle, acceptation : modèle avec une activité close par l'API, PATCH `clos: true` → 200 | 3 Clôture (1), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| ACT-23a | Activité parente : A > B > C, B close en SQL (incohérent), C ouverte ; PATCH A `close: true` → 422 `enfants_ouverts`, base et historique inchangés | 3 Clôture (2), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| ACT-23b | Activité parente, acceptation : mêmes données, C close par l'API, puis PATCH A `close: true` → 200 | 3 Clôture (2), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| ACT-24a | Réouverture d'une activité sous une activité close : B sous A, B puis A closes par l'API, PATCH B `close: false` → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| ACT-24b | Réouverture d'une activité dans un projet clos : activité close dans P clos par l'API, PATCH `close: false` → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| ACT-24c | Réouverture d'une activité dans un projet dont un ancêtre est clos : G > P, G clos en SQL (incohérent), P ouvert, activité close de P, PATCH `close: false` → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-31a | Réouverture d'un sous-projet, parent clos : P > S, S puis P clos par l'API, PATCH S `clos: false` → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-31b | Réouverture d'un sous-projet, ancêtre clos : G > P > S, G clos en SQL (incohérent), P ouvert, S clos par l'API, PATCH S `clos: false` → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| ACT-25a | Création d'une activité dans un projet clos (par l'API) → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| ACT-25b | Création d'une activité sous une activité close d'un projet ouvert (`parent_id`) → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| JLN-13a | Création d'un jalon dans un projet clos (par l'API) → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| JLN-13b | Création d'un jalon sous une activité close d'un projet ouvert (`parent_id`) → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-32 | Création d'un sous-projet sous un projet clos (POST /api/projets, `parent_id` = projet clos par l'API) → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| ACT-26a | Déplacement d'une activité sous une activité close d'un projet ouvert → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| ACT-26b | Déplacement d'une activité dans un projet clos (activité close de P clos, changement de rang à la racine : la destination est dans un projet clos) → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| JLN-14a | Déplacement d'un jalon sous une activité close d'un projet ouvert → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| JLN-14b | Déplacement d'un jalon dans un projet clos (changement de rang à la racine) → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-33a | Rattachement : PATCH d'un projet ouvert avec `parent_id` = projet clos → 422 `parent_clos`, base et historique inchangés | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-33b | Témoin : un projet clos (sans enfant) rattaché par `parent_id` à un projet clos → 200 | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-34 | Cycle : PATCH de A avec `parent_id` = son sous-projet → 422 { erreur: 'Arborescence de projets invalide', code: 'arborescence_invalide' }, base et historique inchangés | 3 Clôture (4), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-35 | Garde (vert d'emblée), ordre : P avec une activité ouverte, PATCH `{ clos: true, code: <code d'un autre projet> }` → 409, base et historique inchangés | 3 Clôture (5), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-36 | Garde (vert d'emblée), transitions seules : données incohérentes en SQL (P clos avec un sous-projet ouvert S et une activité ouverte) ; PATCH du nom de P, de S, et de la priorité de P → 200 | 3 Clôture (7), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| ACT-27 | Garde (vert d'emblée), transitions seules : A close en SQL avec une fille B ouverte (incohérent), dans un projet clos en SQL ; PATCH du nom de A et du nom de B → 200 | 3 Clôture (7), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-37 | Garde (vert d'emblée) : rouvrir un projet parent clos (P > S, S puis P clos par l'API) : PATCH P `clos: false` → 200, S reste clos | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| ACT-28 | Garde (vert d'emblée) : rouvrir une activité parente close (A > B, B puis A closes par l'API) : PATCH A `close: false` → 200, B reste close | 3 Clôture (3), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| PRJ-38 | Concurrence, clôture : R > P, activité close de P ; une connexion SQL tient R (`FOR UPDATE`) et rouvre l'activité ; PATCH P `clos: true` attend le verrou ; après validation : 422 `enfants_ouverts`, P non clos | 3 Clôture (6), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |
| ACT-29 | Concurrence, création : R > P ouvert ; une connexion SQL tient R (`FOR UPDATE`) et clôt P ; POST d'une activité dans P attend le verrou ; après validation : 422 `parent_clos`, aucune activité créée | 3 Clôture (6), D-083 | Clôture C1 | packages/api/test/cloture-c1.test.ts |

## Tests de la tranche Clôture, C2 (D-083 (9), (11), (12))

E2E : e2e/tests/cloture-c2.spec.ts (nouveau fichier, base « administrateur seul » remise à zéro par le nom, horloge du navigateur figée au 06/01/2027). Textes recopiés de SPEC §3, puce « Refus de clôture (D-083 (9), tranche C2) », apostrophe droite comprise (« l'activité ») ; « Ce projet parent n’est pas possible. » recopié de la puce « Projet parent » (apostrophe typographique). Données préalables posées par l'API, toujours cohérentes (enfant clos avant le parent) ; l'action testée se fait à l'écran. Chaque refus vérifie : le texte exact en `role=alert` dans le dialogue, le dialogue resté ouvert, puis, après « Annuler » et rechargement de la page, l'état inchangé relu à l'écran (dialogue de modification rouvert : case « Clos » ou « Close », « Projet parent » ; ou lignes du planning, ou arbre de l'écran Projets). Exception E2E-122 (D-083 (12)) : changement de rang, sans dialogue, alerte dans l'onglet Planning. Vert d'emblée attendu : E2E-113 (non-régression du texte d'`arborescence_invalide`). Tests unitaires web : aucun ; chaque texte est couvert par un e2e et la correspondance code → texte n'a pas de logique propre à isoler.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-111 | Projet P avec une activité ouverte ; écran Projets, « Modifier P », cocher « Clos », « Enregistrer » → « Ce projet a des sous-projets ou des activités non clos. », dialogue ouvert ; après « Annuler » et rechargement, « Modifier P » : « Clos » non coché | 3 Écrans, Refus de clôture ; D-083 (1), (9) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-112 | Projet P (activité ouverte) et projet Q ouvert, racines ; « Modifier P » : « Projet parent » = Q et « Clos » coché, « Enregistrer » → « Ce projet a des sous-projets ou des activités non clos. » et non « Ce projet parent n’est pas possible. » (le texte dépend du code, pas du changement de parent), dialogue ouvert ; après « Annuler » et rechargement : « Projet parent » = « Aucun (projet racine) », « Clos » non coché | 3 Écrans, Refus de clôture ; D-083 (9) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-113 | Non-régression (vert d'emblée attendu), cycle réel sans interception : A et B racines ; dialogue « Modifier A » ouvert, puis B rattaché à A par l'API (la liste du dialogue est périmée) ; « Projet parent » = B, « Enregistrer » → 422 `arborescence_invalide` → « Ce projet parent n’est pas possible. », dialogue ouvert ; après « Annuler » et rechargement, « Modifier A » : « Aucun (projet racine) » | 3 Écrans, Projet parent ; D-083 (4), (9) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-114 | P > S, S puis P clos par l'API ; fiche de S, « Modifier le projet », décocher « Clos », « Enregistrer » → « Le projet parent est clos. », dialogue ouvert ; après « Annuler » et rechargement : « Clos » coché | 3 Écrans, Refus de clôture ; D-083 (3), (9) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-115 | P clos par l'API, sans enfant ; écran Projets, « Nouveau projet », « Projet parent » = P, « Créer » → « Le projet parent est clos. », dialogue ouvert ; après « Annuler » et rechargement, « Déplier P » : « Aucune activité ni jalon. », aucun projet créé dans l'arbre | 3 Écrans, Refus de clôture ; D-083 (3), (9), (11) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-116 | A > B, ouvertes, dans P ouvert ; onglet Planning, « Modifier A », cocher « Close », « Enregistrer » → « Cette activité a des sous-activités non closes. », dialogue ouvert ; après « Annuler » et rechargement, « Modifier A » : « Close » non cochée | 3 Écrans, Refus de clôture ; D-083 (2), (9) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-117 | A > B dans P ouvert, B puis A closes par l'API ; « Modifier B », décocher « Close », « Enregistrer » → « Le projet ou l'activité parente est clos. », dialogue ouvert ; après « Annuler » et rechargement, « Modifier B » : « Close » cochée | 3 Écrans, Refus de clôture ; D-083 (3), (9) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-118 | P clos par l'API, avec une activité close « Témoin » ; onglet Planning, « Nouvelle activité », nom, « Créer » → « Le projet ou l'activité parente est clos. », dialogue ouvert ; après « Annuler » et rechargement : seule la ligne « Témoin » | 3 Écrans, Refus de clôture ; D-083 (3), (9) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-119 | Même base qu'E2E-118 ; « Nouveau jalon », nom, « Créer » → « Le projet ou l'activité parente est clos. », dialogue ouvert ; après « Annuler » et rechargement : seule la ligne « Témoin » | 3 Écrans, Refus de clôture ; D-083 (3), (9) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-120 | Activité A close par l'API, sans enfant, dans P ouvert ; « Ajouter une sous-activité à A », nom, « Créer » → « Le projet ou l'activité parente est clos. », dialogue ouvert ; après « Annuler » et rechargement : seule la ligne A | 3 Écrans, Refus de clôture ; D-083 (3), (9), (11) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-121 | Modèle M avec une activité ouverte ; écran Modèles, « Modifier M », cocher « Clos », « Enregistrer » → « Ce projet a des sous-projets ou des activités non clos. », dialogue ouvert ; après « Annuler » et rechargement, « Modifier M » : « Clos » non coché | 3 Écrans, Refus de clôture ; D-083 (1), (9) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-122 | Changement de rang sous une activité close (D-083 (12)) : A > B, J (sous-activité B puis jalon J) dans P ouvert, B puis A closes par l'API ; onglet Planning, « Monter J » → alerte « Le projet ou l'activité parente est clos. » ; après rechargement, ordre A, B, J inchangé | 3 Écrans, Refus de clôture ; D-083 (3), (9), (12) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-123 | Parcours complet à l'écran (règle « Parcours IHM »), administrateur seul : calendrier, ressource, projet, affectation, activité « Phase » et sous-activité « Tâche », assignation de 2 j sur « Tâche » ; Accueil : « Calculer », valider, « Planning calculé. », barre de synthèse du projet ; fiche, « Modifier le projet », « Clos » → « Ce projet a des sous-projets ou des activités non clos. », « Annuler » ; « Modifier Tâche » puis « Modifier Phase », « Close », « Enregistrer » (dialogues fermés) ; « Modifier le projet », « Clos », « Enregistrer » (dialogue fermé) ; Accueil : « Aucun projet à afficher. », plus de barre de projet. E2E-110 inchangé | 3 Écrans, Refus de clôture ; 6 Accueil ; D-080, D-083 (1), (2), (9) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |
| E2E-124 | Modifier le projet, parent changé, 422 intercepté sans code → message générique « Cette opération enfreint une règle du planning. », dialogue ouvert, rien modifié (`parent_id` relu à l'écran après « Annuler » et rechargement) ; tag `tests-cloture-c2b` | 3 Écrans, Refus de clôture ; D-083 (14) | Clôture C2 | e2e/tests/cloture-c2.spec.ts |

Apostrophe (relecture avant le tag, D-083 (13)) : « Le projet ou l’activité parente est clos. » prend l'apostrophe typographique, dans SPEC, D-083 (9) et la constante du test ; la mention « apostrophe droite » ci-dessus est caduque.

Hors écran : déplacement d'une activité ou d'un jalon sous une autre activité close (changement de parent) ; l'écran ne change que le rang parmi les frères (D-040, D-083 (12)) ; couvert côté API par ACT-26a et JLN-14a.

### Couverture des champs, Clôture C2

Aucun champ d'API nouveau : C2 n'ajoute que des textes de refus sur des champs existants (`clos` et `parent_id` du projet, tableau de REX-1 ; `close` de l'activité, case « Close » du dialogue « Modifier <nom> » de l'onglet Planning).

## Tests du lot 3d-1, initiales (D-088 (2))

API : packages/api/test/lot3d-initiales.test.ts (nouveau fichier). Web : packages/web/test/gantt-initiales.test.ts (nouveau fichier, sans jsdom). E2E : e2e/tests/lot3d1.spec.ts (nouveau fichier ; bases préparées par l'API, sauf E2E-130 et E2E-131 : base « administrateur seul », tout à l'écran ; horloge du navigateur figée au 06/01/2027, D0 des calculs 2027-01-04).

Contrat choisi pour les tests (à créer en phase verte) : champ `initiales` (tableau de chaînes) des activités feuilles de GET /api/projets/:id/gantt ; `positionInitiales(origine, debut, fin, zoom): number | null` et `ECART_INITIALES = 6` (px, valeur choisie faute de valeur dans D-088, à confirmer par le porteur) dans `gantt/echelle.ts` ; `libelleInitiales(initiales: string[]): string` dans `gantt/libelles.ts` ; `lireInitiales(valeur: string | null): boolean` dans `gantt/echelle.ts` ; texte SVG `<text data-initiales-element="<id d'élément>">` ; case à cocher de nom accessible « Initiales ».

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GANTT-12 | Feuille avec trois assignations créées dans l'ordre : ressource « Zed » initiales « AB », ressource « Mia » sans initiales, ressource « Alice » initiales « CD » (créées dans l'ordre inverse des assignations, noms non alphabétiques) : `initiales` = ['AB', 'CD'] | 6 Édition (2), D-088 (2) | 3d-1 | packages/api/test/lot3d-initiales.test.ts |
| GANTT-13 | Feuille sans assignation : `initiales` = [] ; parent (avec un enfant assigné) et jalon : pas de clé `initiales` | 6 Édition (2), D-088 (2) | 3d-1 | packages/api/test/lot3d-initiales.test.ts |
| GANTT-14 | Initiales d'une ressource modifiées par PATCH /api/utilisateurs/:id (« AB » → « XY ») : relues au GET suivant (['XY']) ; PATCH à null : la ressource est omise (['CD'] pour la seconde) | 6 Édition (2), D-088 (2) | 3d-1 | packages/api/test/lot3d-initiales.test.ts |
| GANTT-15 | Lecture seule : l'empreinte de la base est identique avant et après un GET du Gantt portant des initiales | 6 Édition (2), D-088 (2) | 3d-1 | packages/api/test/lot3d-initiales.test.ts |
| GANTT-16 | Garde (vert d'emblée) : GET /api/annuaire, avec une ressource qui a des initiales, n'expose toujours que actif, est_ressource, id, nom, role | 6 Édition (2), D-077 (9), D-088 (2) | 3d-1 | packages/api/test/lot3d-initiales.test.ts |
| GEO-11 | `positionInitiales('2027-01-04', …)` : barre du 04 au 08/01 → 126, 46, 26 aux zooms jour, semaine, mois ; barre du 11 au 15/01 → 294, 102, 54 (fin de la barre + `ECART_INITIALES`, 6) ; début ou fin null → null aux trois zooms | 6 Édition (2) | 3d-1 | packages/web/test/gantt-initiales.test.ts |
| GEO-12 | `libelleInitiales(['AB', 'CD'])` = « AB, CD » ; ['AB'] = « AB » ; [] = « » ; `lireInitiales` : « 1 » → vrai ; null, « 0 », « oui », « » → faux | 6 Édition (2) | 3d-1 | packages/web/test/gantt-initiales.test.ts |
| E2E-125 | Gantt du projet calculé, activité « A » assignée à deux ressources (initiales « AB » puis « CD ») : case « Initiales » décochée par défaut, aucun `text[data-initiales-element]` ; cochée : un texte « AB, CD » rattaché à `data-initiales-element` = id de « A », adresse avec `initiales=1`, nom accessible de la barre inchangé (« A, du 04/01/2027 au 06/01/2027 ») | 6 Édition (2) | 3d-1 | e2e/tests/lot3d1.spec.ts |
| E2E-126 | Même base : cochée, rechargement : case cochée, texte présent ; clic « Jour » : adresse `zoom=jour` et `initiales=1`, texte présent ; décochée : adresse sans `initiales`, avec `zoom=jour`, `data-zoom` « jour », aucun texte | 6 Édition (2) | 3d-1 | e2e/tests/lot3d1.spec.ts |
| E2E-127 | Case cochée : feuille assignée à une ressource sans initiales, feuille sans assignation, jalon, parent d'une feuille assignée (initiales « AB ») : un seul texte, celui de la feuille assignée ; aucun texte pour les quatre autres éléments | 6 Édition (2) | 3d-1 | e2e/tests/lot3d1.spec.ts |
| E2E-128 | Projet calculé, puis activité ajoutée avec une ressource « AB » sans nouveau calcul (dates planifiées absentes) ; case cochée : aucune barre ni texte pour cette activité ; la barre de l'activité calculée garde son texte | 6 Édition (2) | 3d-1 | e2e/tests/lot3d1.spec.ts |
| E2E-129 | Accueil, projet calculé : case « Initiales » décochée par défaut ; projet déplié, case cochée : texte « AB, CD » rattaché à la feuille, adresse `/?initiales=1` ; rechargement : conservé (projet replié par défaut puis déplié : texte présent) ; projet replié : aucun texte | 6 Édition (2) | 3d-1 | e2e/tests/lot3d1.spec.ts |
| E2E-130 | Parcours IHM : base « administrateur seul » ; ressource créée par l'écran Utilisateurs avec initiales « RP » (sans API pour l'utilisateur), projet, affectation, activité et assignation par l'API, calcul par l'API ; Gantt du projet, case « Initiales » cochée : texte « RP » sur la barre | 6 Édition (2), D-077 | 3d-1 | e2e/tests/lot3d1.spec.ts |
| E2E-131 | Extension du parcours complet (gestes d'E2E-123, tout à l'écran, administrateur seul) : la ressource est créée avec les initiales « RC » ; après le calcul depuis l'Accueil, fiche du projet, onglet Gantt, case « Initiales » cochée : texte « RC » rattaché à la barre de « Tâche » | 6 Édition (2), D-088 (2) | 3d-1 | e2e/tests/lot3d1.spec.ts |

## Tests du lot 3d-2, API des gestes (D-088 (3), D-093)

API : packages/api/test/lot3d2-gestes.test.ts (nouveau fichier). Jeu de SPEC 5.5 (`creerMonde`, chef du projet P). Concurrence, méthode déterministe, sans délai arbitraire : une connexion pg dédiée du test ouvre une transaction et tient la ligne visée (`SELECT … FROM <table> WHERE id = $1 FOR UPDATE`) ; deux PATCH sont lancés en parallèle (sans await) ; sondage borné (5 s) de `pg_stat_activity` jusqu'à ce que 2 sessions de la même base, hors la connexion du test, soient en attente de verrou (`wait_event_type = 'Lock'`) ; ROLLBACK de la connexion du test, puis attente des deux réponses (200 attendus). Une absence d'attente fait échouer le test sur le sondage. La seconde écriture est identifiée par l'ordre des entrées d'historique (`id`), quel que soit l'ordre d'obtention du verrou.

Rouges attendus : ACT-30, JLN-15, LIEN-18, ASS-18, ASS-20 (valeur écrasée par la fusion d'un état lu hors transaction). Caractérisation, verts d'emblée (gardes, D-093) : ACT-31, JLN-16, LIEN-19, ASS-19 (l'ancienne valeur d'historique est déjà relue sous verrou par `modifier…`), GESTE-1 à GESTE-10.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| ACT-30 | Concurrence, champs distincts : activité START ; PATCH A `debut_valide` 2027-01-11, PATCH B `priorite` 700 ; après les deux 200 : en base `debut_valide` 2027-01-11 et `priorite` 700 | 6 Édition (3), D-088 (3) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| ACT-31 | Caractérisation : concurrence, même champ : PATCH A `debut_valide` 2027-01-11, PATCH B `debut_valide` 2027-01-18 ; l'entrée d'historique `debut_valide` de la seconde écriture a pour ancienne valeur la nouvelle valeur de la première | 6 Édition (3), D-088 (3) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| JLN-15 | Concurrence, champs distincts : jalon ; PATCH A `date_validee` 2027-01-15, PATCH B `nom` « Livraison » ; en base les deux valeurs | 6 Édition (3), D-088 (3) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| JLN-16 | Caractérisation : concurrence, même champ : PATCH A `date_validee` 2027-01-15, PATCH B 2027-01-22 ; ancienne valeur d'historique de la seconde = valeur de la première | 6 Édition (3), D-088 (3) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| LIEN-18 | Concurrence, champs distincts : dépendance FD délai 0 ; PATCH A `type` DD, PATCH B `delai` 2 ; en base `type` DD et `delai` 2 | 6 Édition (3), D-088 (3) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| LIEN-19 | Caractérisation : concurrence, même champ : PATCH A `delai` 2, PATCH B `delai` 5 ; ancienne valeur d'historique de la seconde = valeur de la première | 6 Édition (3), D-088 (3) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| ASS-18 | Concurrence, champs distincts : assignation taux 100 (pourcentage), charge 3 ; PATCH A `taux` 50, PATCH B `charge_assignee` 4 ; en base `taux` 50 et `charge_assignee` 4 | 6 Édition (3), D-088 (3) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| ASS-19 | Caractérisation : concurrence, même champ : PATCH A `taux` 50, PATCH B `taux` 80 ; ancienne valeur d'historique de la seconde = valeur de la première | 6 Édition (3), D-088 (3) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| ASS-20 | Concurrence, charge réelle 0 : PATCH A `taux` 50, PATCH B `charge_assignee` 4 ; en base `reste_a_faire` 4 (nouvelle charge assignée) et `taux` 50 gardé | 3, 6 Édition (3), D-088 (3) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| GESTE-1 | Caractérisation : glisser une barre START : PATCH `debut_valide` 2027-01-11 → 200, en base `debut_valide` 2027-01-11, mode et autres dates inchangés | 6 (gestes) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| GESTE-2 | Caractérisation : glisser une barre STARR : PATCH `debut_valide` → 200, relu en base | 6 (gestes) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| GESTE-3 | Caractérisation : glisser une barre FDUR, ou poignée gauche : PATCH `debut_valide` → 200, relu en base, `duree_validee` inchangée | 6 (gestes) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| GESTE-4 | Caractérisation : glisser une barre DDUR, ou poignée gauche : PATCH `debut_valide` → 200, relu en base, `duree_validee` inchangée | 6 (gestes) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| GESTE-5 | Caractérisation : poignée droite ALAP : PATCH `fin_valide` → 200, relu en base | 6 (gestes) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| GESTE-6 | Caractérisation : glisser une barre REGUL (décalage de fenêtre) : PATCH `debut_valide` et `fin_valide` ensemble, du 04–15/01 au 11–22/01 → 200, les deux relus en base | 6 (gestes) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| GESTE-7 | Caractérisation : poignée gauche REGUL : PATCH `debut_valide` seul → 200, relu en base, `fin_valide` inchangée | 6 (gestes) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| GESTE-8 | Caractérisation : poignée droite REGUL : PATCH `fin_valide` seul → 200, relu en base, `debut_valide` inchangé | 6 (gestes) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| GESTE-9 | Caractérisation : poignée droite FDUR et DDUR : PATCH `duree_validee` 3 → 200, relu en base, `debut_valide` inchangé | 6 (gestes) | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |
| GESTE-10 | Caractérisation, refus : REGUL 04–15/01, PATCH `debut_valide` 2027-01-18 et `fin_valide` 2027-01-11 (fin antérieure au début) → 422 (contrainte CHECK, comme ACT-17, D-093), empreinte de la base inchangée, historique compris | 3, 6 (gestes), D-093 | 3d-2 | packages/api/test/lot3d2-gestes.test.ts |

Gestes hors 3d-2 : glisser d'une barre à une autre (POST dépendance, 3e), clic sur un lien (PATCH et DELETE dépendance, 3e), glisser une ligne (déplacement WBS, 3f). Couverture des champs : aucun champ d'API nouveau en 3d-2.


## Tests du lot 3d-3a, gestes à la souris (D-088 (4), (6), D-094)

API : packages/api/test/lot3d3a.test.ts (nouveau fichier ; mêmes aides que lot3d2-gestes.test.ts). Web : packages/web/test/gantt-gestes.test.ts (nouveau fichier, sans jsdom). E2E : e2e/tests/lot3d3a.spec.ts (nouveau fichier ; données créées par l'API, calcul par l'API avec d0 2027-01-04, zoom jour sauf mention contraire, requêtes PATCH comptées par `page.on('request')`). Préambule obligatoire de chaque e2e : vérifier le nom accessible de départ de chaque barre (par exemple START « …, du 11/01/2027 au 15/01/2027 ») ; s'il échoue, s'arrêter et le signaler.

Rouges attendus : ACT-33, ACT-34 (code absent) ; GEO-13 à GEO-17 (fonctions absentes) ; E2E-132 à E2E-142 (sur l'effet attendu, préambule vert ; E2E-138 et E2E-139 sur leur témoin positif, D-095 (4)). Caractérisation, verts d'emblée : ACT-32, ACT-35, JLN-17, LIEN-20, ASS-21.

Contrat choisi pour les tests (à créer en phase verte, noms relus par le porteur) : voir docs/state.md.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| ACT-32 | Caractérisation : une seconde connexion ouvre BEGIN puis DELETE de l'activité ; le PATCH est lancé, on attend qu'il soit bloqué sur un verrou (`pg_stat_activity`, `wait_event_type = 'Lock'`), puis COMMIT ; 404, aucune ligne d'historique de modification, base identique à l'état après la suppression | 6 Édition (8), D-094 (11) | 3d-3a | packages/api/test/lot3d3a.test.ts |
| JLN-17 | Caractérisation : même méthode, jalon supprimé, PATCH de jalon : 404, aucune ligne d'historique de modification, base identique à l'état après la suppression | 6 Édition (8), D-094 (11) | 3d-3a | packages/api/test/lot3d3a.test.ts |
| LIEN-20 | Caractérisation : même méthode, dépendance supprimée, PATCH de dépendance : 404, mêmes vérifications | 6 Édition (8), D-094 (11) | 3d-3a | packages/api/test/lot3d3a.test.ts |
| ASS-21 | Caractérisation : même méthode, assignation supprimée, PATCH d'assignation : 404, mêmes vérifications | 6 Édition (8), D-094 (11) | 3d-3a | packages/api/test/lot3d3a.test.ts |
| ACT-33 | START `debut_valide` 2027-01-11, `fin_valide` restante 2027-01-15 ; PATCH `debut_valide` 2027-01-20 → 422, corps exactement { erreur: 'Règle de planning non respectée', code: 'dates_incoherentes' } ; empreinte de la base inchangée, historique compris | 6 Édition (8), D-094 (5) | 3d-3a | packages/api/test/lot3d3a.test.ts |
| ACT-34 | REGUL du 04 au 15/01 ; PATCH `debut_valide` 2027-01-18 et `fin_valide` 2027-01-11 → 422, même corps exact que ACT-33 ; base inchangée | 6 Édition (8), D-094 (5) | 3d-3a | packages/api/test/lot3d3a.test.ts |
| ACT-35 | Caractérisation : PATCH `mode` REGUL sur un START sans `fin_valide` (contrainte `activite_fin_requise`) → 422, corps sans champ `code`, base inchangée ; si ce n'est pas un 422, s'arrêter et le signaler | 6 Édition (8), D-094 (5) | 3d-3a | packages/api/test/lot3d3a.test.ts |
| GEO-13 | Décalage en jours = `Math.round(dx / px par jour)` : zoom jour (24 px) : dx 11 → 0, 13 → 1, −13 → −1, 50 → 2 ; zoom semaine (8 px) : 3 → 0, 5 → 1, 21 → 3, −21 → −3, −3 → 0 (zéro positif, `toBe(0)`) | 6 Édition (8), D-094 (7) | 3d-3a | packages/web/test/gantt-gestes.test.ts |
| GEO-14 | Seuil de glisser (distance euclidienne depuis l'appui) : (3, 0), (0, 3), (2, 3) → non ; (4, 0), (3, 3) → oui | 6 Édition (8), D-094 (7) | 3d-3a | packages/web/test/gantt-gestes.test.ts |
| GEO-15 | Gestes permis {corps, gauche, droite} : START et STARR : corps seul ; FDUR et DDUR : les trois ; ALAP : droite seule ; REGUL : les trois ; aucun pour ASAP, MAN, jalon, parent, activité close, `peut_ecrire` faux, zoom mois, barre sans `debut_planifie` | 6 Édition (8), D-094 (2), (7), (8) | 3d-3a | packages/web/test/gantt-gestes.test.ts |
| GEO-16 | Corps du PATCH, calendrier lundi–vendredi, férié 2027-01-06. START `debut_valide` 2027-01-04, planifié 11–15/01, corps +3 → { debut_valide: '2027-01-14' } ; STARR, même résultat. FDUR planifié 11–15/01 : corps +3 → { debut_valide: '2027-01-14' } ; gauche −2 → { debut_valide: '2027-01-09' } ; droite +3 → { duree_validee: 6 }, −3 → { duree_validee: 2 }, −10 → { duree_validee: 1 } (borne). FDUR planifié 04–08/01, droite +3 → { duree_validee: 5 } (férié du 06 exclu). DDUR planifié 11–15/01, droite +3 → { duree_validee: 6 }. ALAP planifié 11–15/01, droite +3 → { fin_valide: '2027-01-18' }. REGUL validé 04–15/01, planifié 05–15/01, corps +7 → { debut_valide: '2027-01-11', fin_valide: '2027-01-22' }. REGUL validé et planifié 04–15/01 : gauche +3 → { debut_valide: '2027-01-07' }, +20 → { debut_valide: '2027-01-15' } ; droite −3 → { fin_valide: '2027-01-12' }, −20 → { fin_valide: '2027-01-04' }. Tout geste avec un décalage de 0 → null | 6 Édition (8), D-094 (2), (3), (4) | 3d-3a | packages/web/test/gantt-gestes.test.ts |
| GEO-17 | Texte du refus d'un geste : 400 « Modification refusée : dates invalides. » ; 422 `dates_incoherentes` « Modification refusée : la fin validée précède le début validé. » ; 422 `parent_clos` « Le projet ou l’activité parente est clos. » (apostrophe courbe, comme commun.tsx) ; 422 `enfants_ouverts` = ENFANTS_ACTIVITE ; 422 sans code ou code « autre » « Cette opération enfreint une règle du planning. » ; 403 et 404 « Modification impossible : rechargez la page. » ; 500 ou erreur réseau (TypeError) « Modification impossible pour le moment. Réessayez. ». `texteRefusCode` : `dates_incoherentes` avec la cible 'element' → texte ci-dessus, avec 'projet' → null | 6 Édition (6), D-094 (5), (6) | 3d-3a | packages/web/test/gantt-gestes.test.ts |
| E2E-132 | START `debut_valide` 2027-01-11, assignation de 5 j à 100 %, planifié 11–15/01 ; glisser le corps de 72 px : un seul PATCH ; la barre pleine garde son nom accessible ; un `data-contour-element` à la position du 14/01 (72 px à droite de la barre) ; bandeau « Planning à recalculer » visible ; début validé lu dans le dialogue « Modifier l'activité » ouvert depuis l'onglet Planning : 2027-01-14 (D-095 (3)) ; retour au Gantt (contour et bandeau gardés au changement d'onglet, D-095 (1)) : `contours(page, id)` a 1 élément, à la même position qu'avant le changement d'onglet (écart ≤ 1 px, D-096 (1)), bouton « Calculer » du bandeau, calcul avec la date 2027-01-04 : nom de la barre commençant par « …, du 14/01/2027 », contour et bandeau disparus | 6 Édition (8), D-094 (2), (9) | 3d-3a | e2e/tests/lot3d3a.spec.ts |
| E2E-133a | FDUR (`debut_valide` 2027-01-11, durée 5, planifié 11–15/01), poignée droite +72 px : la durée validée lue dans le dialogue « Modifier l'activité » ouvert depuis l'onglet Planning vaut 6 (D-095 (3)) | 6 Édition (8), D-094 (3) | 3d-3a | e2e/tests/lot3d3a.spec.ts |
| E2E-133b | ALAP (`fin_valide` 2027-01-15, planifié 11–15/01), poignée droite +72 px : la fin validée vaut 2027-01-18 (ISO) dans le même dialogue (D-095 (3)) | 6 Édition (8), D-094 (2) | 3d-3a | e2e/tests/lot3d3a.spec.ts |
| E2E-133c | REGUL validée du 04 au 15/01, assignation de 10 j, calcul avec d0 2027-01-04 ; préambule « Tâche REGUL, du 04/01/2027 au 15/01/2027 » ; poignée gauche +72 px → 1 PATCH { debut_valide: '2027-01-07' } ; poignée droite −72 px, sans recharger → 2e PATCH { fin_valide: '2027-01-12' } ; dialogue « Modifier l'activité » de l'onglet Planning : Début validé 2027-01-07, Fin validée 2027-01-12 | 6 Édition (8), D-094 (2), (4), D-096 | 3d-3a | e2e/tests/lot3d3a.spec.ts |
| E2E-134 | REGUL validé et planifié 04–15/01 ; corps +168 px, puis encore +168 px sans recharger : deux PATCH, le second { debut_valide: '2027-01-18', fin_valide: '2027-01-29' } ; le dialogue « Modifier l'activité » (onglet Planning) affiche début validé 2027-01-18 et fin validée 2027-01-29 (D-095 (3)) | 6 Édition (8), D-094 (2), (9) | 3d-3a | e2e/tests/lot3d3a.spec.ts |
| E2E-135 | Refus réel, sans interception : START `debut_valide` 2027-01-11, `fin_valide` restante 2027-01-15, corps +168 px : alerte `role="alert"` « Modification refusée : la fin validée précède le début validé. » ; barre à sa place, sans contour ni bandeau ; le bouton « Fermer » de l'alerte la fait disparaître (D-095 (2)) ; en base (lecture par l'API) `debut_valide` 2027-01-11 | 6 Édition (6), D-094 (5), (10) | 3d-3a | e2e/tests/lot3d3a.spec.ts |
| E2E-136 | PATCH intercepté par `page.route`, une réponse par geste : 400 ; 403 ; 404 ; 422 { erreur } sans code ; 500 ; `route.abort()` : après chaque geste le texte de GEO-17 correspondant ; une seule alerte présente, remplacée par la suivante ; barre en place, ni contour ni bandeau | 6 Édition (6), D-094 (6), (10) | 3d-3a | e2e/tests/lot3d3a.spec.ts |
| E2E-137 | Réponse au PATCH retenue : pendant l'attente, la barre est dessinée à la position du 14/01 ; un second glisser sur la même barre n'envoie aucun PATCH (1 requête au total) ; après la libération de la réponse (200), le contour est présent | 6 Édition (6), D-094 (10) | 3d-3a | e2e/tests/lot3d3a.spec.ts |
| E2E-138 | Glisser de 72 px une barre ASAP, MAN, un jalon, un parent et une activité close, puis une START au zoom mois : 0 PATCH, 0 `[data-poignee]`, curseur différent de grab, noms accessibles inchangés ; témoin positif en fin de test : une START au zoom jour, glisser de 72 px → exactement 1 PATCH (D-095 (4)) | 6 Édition (8), D-094 (8) | 3d-3a | e2e/tests/lot3d3a.spec.ts |
| E2E-139 | Ressource affectée sans droit d'écriture, START : glisser de 72 px → 0 PATCH, 0 poignée, pas de bandeau ; témoin positif en fin de test : nouvelle session avec le chef de projet sur la même base, même START, glisser de 72 px → exactement 1 PATCH (D-095 (4)) | 6 Édition (8), D-094 (8) | 3d-3a | e2e/tests/lot3d3a.spec.ts |
| E2E-140 | Glisser de 3 px → 0 PATCH ; glisser de 11 px au zoom jour → 0 PATCH ; au zoom semaine, glisser de 21 px → un PATCH { debut_valide: '2027-01-14' } | 6 Édition (8), D-094 (7) | 3d-3a | e2e/tests/lot3d3a.spec.ts |
| E2E-141 | Nombre de `[data-poignee]` par barre : START 0, ALAP 1 (droite), FDUR 2, REGUL 2 ; chaque poignée fait 6 px de large ; la poignée droite commence au bord droit de la barre, la gauche finit à son bord gauche ; curseur `ew-resize` | 6 Édition (8), D-094 (7) | 3d-3a | e2e/tests/lot3d3a.spec.ts |
| E2E-142 | Glisser deux barres → 2 contours ; position x de chaque barre relevée avant le premier geste ; un second geste sur A (+144 px) → toujours 2, le contour de A est à x barre A + 144 et celui de B toujours à x barre B + 72 (écart ≤ 1 px, D-096 (1)) ; rechargement de la page → 0 contour, pas de bandeau | 6 Édition (8), D-094 (9) | 3d-3a | e2e/tests/lot3d3a.spec.ts |

### Couverture des champs, gestes du Gantt (règle « Couverture des champs », 3d-3a)

Le tableau de couverture des champs d'activité n'existait pas (manque antérieur, voir docs/state.md) ; seuls les champs touchés par un geste sont listés ici.

| Champ de l'API (PATCH /api/activites/:id) | Champ d'écran | Test |
|---|---|---|
| debut_valide | geste du Gantt (corps START, STARR, FDUR, DDUR, REGUL ; poignée gauche FDUR, DDUR, REGUL) ; champ « Début validé » du dialogue | E2E-132, E2E-133c, E2E-134 |
| fin_valide | geste du Gantt (poignée droite ALAP et REGUL ; corps REGUL) ; champ « Fin validée » du dialogue | E2E-133b, E2E-133c, E2E-134 |
| duree_validee | geste du Gantt (poignée droite FDUR, DDUR) ; champ « Durée validée (jours ouvrés) » du dialogue | E2E-133a |

## Tests du lot 3d-3b, clavier, clic, double-clic et dialogue (D-088 (5), D-094, D-097, D-098)

Web : packages/web/test/gantt-clavier.test.ts (nouveau fichier, sans jsdom). E2E : e2e/tests/lot3d3b.spec.ts (nouveau fichier ; mêmes règles qu'en 3d-3a : base « administrateur seul », horloge au 06/01/2027, d0 2027-01-04, zoom jour, données par l'API, préambule vérifié, PATCH comptés par `page.on('request')`).

Monde « clavier », dans l'ordre WBS : A START `debut_valide` 2027-01-11, 5 j sur Alice (11–15/01) ; P parent de E ; E ASAP 3 j sur Bob ; J jalon fixe 2027-01-12 ; calcul ; puis B ASAP créée après le calcul, donc sans dates ; sous-projet S avec une activité assignée, calculé (barre de synthèse présente). Préambule : barres de A, P, E, J et S présentes, aucune barre pour B ; sinon s'arrêter et le signaler.

Rouges attendus : GEO-18, GEO-19 (fonctions absentes) ; E2E-143 à E2E-153, E2E-156, E2E-157 (sur l'effet attendu, préambule vert). E2E-151, E2E-154 et E2E-155 peuvent être verts d'emblée, avec un témoin positif qui les rende rouges.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GEO-18 | Barres parcourables, lignes dans l'ordre : activité A avec dates planifiées, activité B sans dates, jalon J avec date planifiée, parent P avec dates, sous-projet S avec dates → [A, J, P] | 6 Édition (9), D-098 (2) | 3d-3b | packages/web/test/gantt-clavier.test.ts |
| GEO-19 | Barre suivante, parcourables [10, 20, 30] : aucune active : ↓ → 10, ↑ → 30 ; 10 et ↓ → 20 ; 20 et ↑ → 10 ; 30 et ↓ → 30 ; 10 et ↑ → 10 ; active 99 absente de la liste : ↓ → 10 ; liste vide → null | 6 Édition (9), D-098 (2) | 3d-3b | packages/web/test/gantt-clavier.test.ts |
| E2E-143 | Tab jusqu'à la zone « Calendrier du Gantt » ; ↓ → A active : `data-anneau-element` = A, `data-annonce-gantt` contient exactement l'aria-label de A ; ↓ ↓ ↓ → P, E, J ; ↓ → J reste active ; B et S jamais actifs ; ↑ → E ; Échap → aucun anneau, annonce vide ; ↑ → J ; Tab quitte la zone (un seul arrêt de tabulation) | 6 Édition (5), (9), D-098 (1), (2), (4) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-144 | À 1024 px. A active, → puis ← : `scrollLeft` de la zone change, A reste active | 6 Édition (9), D-098 (2) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-145 | À 1024 px. En plus du monde, activité F (START `debut_valide` 2027-03-01, 1 j). Zone à `scrollLeft` 0, ↓ jusqu'à F : la boîte de F est entièrement dans la boîte visible de la zone | 6 Édition (9), D-098 (2) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-146 | A active, Entrée → dialogue « Modifier l'activité » ; nom « A bis », Début validé 2027-01-18, Enregistrer → dialogue fermé ; tableau du Gantt avec « A bis » (Gantt rechargé) ; bandeau « Planning à recalculer » visible ; 0 contour ; focus sur la zone ; anneau sur A ; onglet Planning, dialogue de A bis : Début validé 2027-01-18 | 6 Édition (5), (9), D-098 (3) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-147 | Double-clic sur le losange de J → dialogue « Modifier le jalon » ; date validée 2027-01-19, Enregistrer → bandeau visible, focus sur la zone, anneau sur J ; onglet Planning, dialogue de J : 2027-01-19 | 6 Édition (5), (9), D-098 (3) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-148 | A active, Entrée, puis Annuler → focus sur la zone, anneau sur A, pas de bandeau, 0 PATCH | 6 Édition (9), D-098 (3) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-149 | P active, Entrée → « Modifier l'activité » ouvert, Annuler ; E fermée par l'API avant le chargement de la page ; E active, Entrée → dialogue ouvert, Annuler | 6 Édition (9), D-098 (3) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-150 | Alice (ressource, sans droit d'écriture) : ↓ → A active avec annonce ; Entrée puis double-clic sur A → aucun dialogue | 6 Édition (9), D-098 (3) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-151 | Refus réel dans le dialogue : A avec `fin_valide` restante 2027-01-15 ; Entrée, Début validé 2027-01-20, Enregistrer → dialogue ouvert avec « Modification refusée : la fin validée précède le début validé. » ; Annuler → pas de bandeau ; en base `debut_valide` 2027-01-11 | 6 Édition (9), D-098 (3) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-152 | Clic simple sur la barre de A → focus sur la zone, anneau sur A, annonce de A, 0 PATCH ; ↓ → P ; clic sur la barre de synthèse de S → anneau toujours sur P | 6 Édition (9), D-098 (4) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-153 | Appui sur A, déplacement de 72 px, Échap, encore 72 px, relâchement → 0 PATCH, barre de A à sa position de départ (écart ≤ 1 px), 0 contour, anneau sur A | 6 Édition (9), D-098 (4) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-154 | Caractérisation, témoin positif. GET /api/calendriers intercepté → 500. FDUR (`debut_valide` 2027-01-11, durée 5, 5 j), poignée droite +72 px → 0 PATCH ; alerte « Modification impossible pour le moment. Réessayez. » ; barre en place ; 0 contour ; témoin positif en fin de test : sans interception, même geste → 1 PATCH | 6 Édition (6), D-098 (6) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-155 | Accueil, projet du monde déplié, zone « Calendrier du Gantt global » focalisée ; ↓, Entrée, double-clic sur la barre de A → aucun anneau, aucun `[data-annonce-gantt]` non vide, aucun dialogue ; témoin positif en fin de test : même séquence sur le Gantt du projet → anneau et annonce | 6 Édition (9), D-098 (5) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-156 | Monde « clavier », zoom mois, préambule verifierMonde : Tab jusqu'à la zone, ↓ → A active ; Entrée → « Modifier l'activité » visible ; Annuler → focus sur la zone, A active ; double-clic sur le losange de J → « Modifier le jalon » visible ; Annuler ; 0 PATCH | 6 Édition (9), D-088 (5), D-099 (4) | 3d-3b | e2e/tests/lot3d3b.spec.ts |
| E2E-157 | monde3b, START (`debut_valide` 2027-01-11, 5 j sur Alice), sans calcul ; bandeau « Planning non calculé » visible ; Tab jusqu'à la zone, ↓ puis ↑ → 0 anneau, annonce vide ; Entrée → aucun dialogue ; témoin positif : calcul par l'API (d0 2027-01-04), rechargement, Tab jusqu'à la zone, ↓ → la START est active | 6 Édition (9), D-098 (2), D-099 (4) | 3d-3b | e2e/tests/lot3d3b.spec.ts |

### Couverture des champs, dialogue depuis le Gantt (règle « Couverture des champs », 3d-3b)

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| PATCH /api/activites/:id `nom`, `debut_valide` | champs « Nom » et « Début validé » du dialogue « Modifier l'activité », ouvert au clavier ou au double-clic | E2E-146, E2E-151 |
| PATCH /api/jalons/:id `date_validee` | champ de date du dialogue « Modifier le jalon », ouvert au double-clic | E2E-147 |

## Tests du lot 3d-4, recalcul automatique (D-100, D-101)

Web : packages/web/test/recalcul.test.ts (nouveau fichier, sans jsdom, préfixe RECALC). E2E : e2e/tests/lot3d4.spec.ts (nouveau fichier ; mêmes règles qu’en 3d-3 : base « administrateur seul », horloge au 06/01/2027, zoom jour, données par l’API, préambule vérifié ; PATCH et POST /api/calcul comptés par `page.on('request')`, plus le maximum de POST en vol en même temps ; localStorage vidé avant chaque test). Données de base : activité A, START, `debut_valide` 2027-01-11, 5 j sur Alice, calculée avec d0 2027-01-04, donc du 11 au 15/01.

Rouges attendus : RECALC-1 et RECALC-2 (fonctions absentes) ; E2E-158 à E2E-170 (sur l’effet attendu, préambule vert) ; E2E-43-r2 (arrêt absent). E2E-167 et E2E-168 : témoin positif (même scénario avec un geste réussi → 1 POST).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| RECALC-1 | File de calcul, fonction pure état + événement → état + action : inactif + demande → lancer ; en cours + demande → en attente, rien à lancer ; en cours + 3 demandes → une seule attente ; en cours et en attente + fin → lancer (en cours, plus d’attente) ; en cours sans attente + fin → inactif ; décocher en cours et en attente → en cours sans attente | 6 Édition (10), D-101 (4) | 3d-4 | packages/web/test/recalcul.test.ts |
| RECALC-2 | Préférence, stockage simulé : '1' → vrai ; '0' ou absente → faux ; getItem qui lève → faux ; setItem qui lève → pas d’exception | 6 Édition (10), D-101 (7) | 3d-4 | packages/web/test/recalcul.test.ts |
| E2E-158 | Case « Recalcul automatique » visible et décochée pour le chef ; absente pour Alice (ressource), sur un modèle et sur l’Accueil | 6 Édition (10), D-101 (8) | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-159 | Cocher, recharger → cochée, localStorage « planersource.recalculAuto » = '1' ; un autre projet du même chef → cochée ; décocher, recharger → décochée | 6 Édition (10), D-101 (7) | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-160 | Case cochée, POST /api/calcul retenu : glisser A de +72 px → 1 PATCH puis 1 POST de corps exact { projets: [id du projet], d0: '2027-01-06' } ; pendant l’attente « Recalcul en cours… » visible, bouton « Calculer » désactivé ; après la libération : nom de A commençant par « Tâche A, du 14/01/2027 », 0 contour, pas de bandeau, pas de « Planning calculé. », « Recalcul en cours… » disparu | 6 Édition (10), D-101 (2) à (5) | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-161 | Sous-projet S d’un projet R, START dans S ; Gantt de S, case cochée, geste → POST avec projets: [id de R] | D-101 (3) | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-161-r1 | Révision de E2E-161 (D-103) : l’activité de S est assignée à Bob (affecté à S) et non à Alice, pour éviter la surcharge ; reste inchangé | D-101 (3), D-103 | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-162 | Case cochée, A active au clavier, Entrée, Début validé 2027-01-18, Enregistrer → 1 POST ; après la réponse, pas de bandeau, nom de A commençant par « Tâche A, du 18/01/2027 » | D-101 (2) | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-163 | Case décochée, glisser A de +72 px → bandeau et contour, 0 POST ; cocher → exactement 1 POST tout de suite, puis ni contour ni bandeau ; décocher puis recocher sans bandeau → toujours 1 POST | D-101 (1) | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-164 | Case cochée, activités START A et B, premier POST retenu : glisser A, puis pendant le calcul glisser B, puis A encore → 3 PATCH ; après la libération exactement 2 POST au total, maximum en vol = 1 | D-101 (4) | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-165 | Case cochée, POST intercepté, un geste par réponse : 422 cycle_dependances [A, B] → « Calcul impossible : cycle de dépendances entre Tâche A, Tâche B. » ; 422 entree_invalide [A] → « Calcul impossible : données incomplètes sur Tâche A. » ; 409 → « Un calcul est déjà en cours. Réessayez dans un instant. » ; 500 → « Calcul impossible pour le moment. Réessayez. ». À chaque fois une seule alerte, bandeau et contour maintenus. À la fin : « Fermer » → plus d’alerte ; le dialogue de l’onglet Planning montre le dernier debut_valide envoyé | D-101 (6) | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-166 | Case cochée, réponse du POST interceptée avec un avertissement reste_non_pose (assignation de A sur Alice, reste 2,5) → notification « Tâche A — Alice : 2,5 j non posé », pas de « Planning calculé. » | D-101 (5) | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-167 | Case cochée ; modification de A par le dialogue de l’onglet Planning → 0 POST, même après retour sur l’onglet Gantt ; témoin positif : même scénario avec un geste réussi → 1 POST | D-101 (2) | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-168 | Case cochée, PATCH intercepté → 422 sans code ; geste → alerte de 3d-3a, 0 POST ; témoin positif : même scénario avec un geste réussi → 1 POST | D-101 (2) | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-169 | Caractérisation (D-102 (1)) : (D-100) GET /api/projets/:id/activites intercepté → 500 ; A active, Entrée → alerte « Impossible de charger l’élément à modifier. », aucun dialogue | D-100 | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-170 | Parcours complet : chaîne d’E2E-131 refaite (administrateur seul, tout à l’écran) ; dans le Gantt du projet, cocher « Recalcul automatique », glisser de +72 px une activité START de la chaîne (sinon passer une activité en START par le dialogue, à l’écran) ; sans cliquer sur « Calculer », le nom de sa barre commence par sa date planifiée de départ + 3 jours (arrêt et signalement si le moteur la place ailleurs) | D-101 (9) | 3d-4 | e2e/tests/lot3d4.spec.ts |
| E2E-43-r2 | (1440 puis 1024 px) E2E-43-r1 inchangé, plus un arrêt : Tab depuis « Calculer » atteint la case « Recalcul automatique » (révision D-031, D-101 (8), tag `tests-lot3b-regle12-r2`) | 6 Édition (10), D-101 (8) | 3d-4 | e2e/tests/lot3b-focus.spec.ts |

### Couverture des champs, recalcul automatique (règle « Couverture des champs », 3d-4)

| Champ de l’API | Champ d’écran | Test |
|---|---|---|
| POST /api/calcul `projets`, `d0` | hors écran propre : envoyés par le recalcul automatique (racine du projet affiché, date du navigateur), sans champ de saisie ; le dialogue « Calculer » les couvre (3c) | E2E-160, E2E-161 |
| aucun nouveau champ d’API | préférence « Recalcul automatique » : case de la barre d’outils, stockée dans localStorage, hors API | E2E-158, E2E-159 |

## Tests du lot 3e, liens dans le Gantt (D-104)

Web : packages/web/test/gantt-liens-edition.test.ts (nouveau fichier, sans jsdom). E2E : e2e/tests/lot3e.spec.ts (nouveau fichier ; base « administrateur seul », horloge au 06/01/2027, zoom jour, données créées par l’API, préambule vérifié, requêtes POST, PATCH et DELETE comptées par `page.on('request')`, localStorage vidé). Monde « liens » : A START `debut_valide` 2027-01-11, 5 j sur Alice ; B START `debut_valide` 2027-01-18, 5 j sur Bob ; J jalon fixe 2027-01-25 ; sous-projet S avec une activité assignée à Carole ; calcul avec d0 2027-01-04 ; puis C (ASAP) créée après le calcul, donc sans dates. Préambule : barres de A, B, J et S présentes, aucune pour C, aucun `[data-lien-id]`.

Rouges attendus : GEO-20 à GEO-22 (fonctions absentes) ; E2E-171 à E2E-178 et E2E-180 (sur l’effet attendu, préambule vert) ; E2E-179 (témoin positif : au moins un `[data-connecteur-element]` dans la page).

Contrat choisi pour les tests (à créer en phase verte, noms relus par le porteur) : voir docs/state.md.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GEO-20 | Centre du connecteur : barre x 100, largeur 120, sans poignée droite → cx 228 ; avec poignée droite → cx 234 ; jalon de centre x 300 → cx 316 (DEMI_JALON 8 plus 8) ; cy = centre de la ligne : index 2 → 80 | 6 Édition (11), D-104 (2) | 3e | packages/web/test/gantt-liens-edition.test.ts |
| GEO-21 | Cible du lâcher, lignes [A (id 1, avec dates), B (id 2, sans dates), J (id 3, jalon avec date), S (sous-projet)], HAUTEUR_LIGNE 32 : y 10, source 3 → 1 ; y 10, source 1 → null ; y 40 → null ; y 70, source 1 → 3 ; y 100 → null ; y −1 → null ; y 128 → null | 6 Édition (11), D-104 (3) | 3e | packages/web/test/gantt-liens-edition.test.ts |
| GEO-22 | Texte des refus d’une création : 409 « Cette dépendance existe déjà. » ; 400 « Modification refusée : données invalides. » ; 422 sans code « Cette opération enfreint une règle du planning. » ; 403 et 404 « Modification impossible : rechargez la page. » ; 500 et TypeError « Modification impossible pour le moment. Réessayez. » | 6 Édition (11), D-104 (6) | 3e | packages/web/test/gantt-liens-edition.test.ts |
| E2E-171 | `[data-connecteur-element]` présent pour A, B et J, absent pour C et S, curseur crosshair ; zoom mois : 0 connecteur ; avec Alice (ressource) : 0 connecteur | 6 Édition (11), D-104 (2) | 3e | e2e/tests/lot3e.spec.ts |
| E2E-172 | Glisser le connecteur de A jusqu’au milieu de la ligne de B → 1 POST de corps exact { predecesseur_id: A, successeur_id: B, type: 'FD', delai: 0 } ; ensuite 1 `[data-lien-id]` de `data-type` FD, bandeau « Planning à recalculer », 0 contour ; l’onglet Planning liste la dépendance A → B, FD, 0 | 6 Édition (11), D-104 (3), (5) | 3e | e2e/tests/lot3e.spec.ts |
| E2E-173 | Pendant le glisser du connecteur de A au-dessus de la ligne de B : `[data-lien-provisoire]` présent et `[data-cible-lien]` = B ; puis relâcher sur la ligne de A, sur celle de C, sur celle de S, hors du SVG, ou Échap pendant le glisser : 0 POST, plus de `[data-lien-provisoire]` | 6 Édition (11), D-104 (3) | 3e | e2e/tests/lot3e.spec.ts |
| E2E-174 | Case « Recalcul automatique » cochée ; création A → B par le connecteur → 1 POST de dépendance, puis 1 POST /api/calcul ; après la réponse, pas de bandeau | 6 Édition (11), D-104 (5) | 3e | e2e/tests/lot3e.spec.ts |
| E2E-175 | A → B créée par l’API avant le chargement ; glisser A → B : alerte « Cette dépendance existe déjà. », 1 seul `[data-lien-id]`, pas de bandeau ; puis POST intercepté : 422 sans code « Cette opération enfreint une règle du planning. » ; 500 « Modification impossible pour le moment. Réessayez. » ; une seule alerte à la fois | 6 Édition (11), D-104 (6) | 3e | e2e/tests/lot3e.spec.ts |
| E2E-176 | A → B (FD, 0) créée par l’API ; clic sur `[data-lien-cible]` → dialogue « Modifier la dépendance », Type FD, Délai 0 ; Type DD, Délai 2, Enregistrer → PATCH de corps exact { type: 'DD', delai: 2 } ; ensuite `data-type` DD, bandeau, l’onglet Planning montre DD et 2 | 6 Édition (11), D-104 (4), (5) | 3e | e2e/tests/lot3e.spec.ts |
| E2E-177 | A → B créée par l’API ; clic sur le lien, « Supprimer » ; Annuler dans la confirmation → lien présent, 0 DELETE ; « Supprimer » à nouveau puis confirmer → 1 DELETE, 0 `[data-lien-id]`, bandeau, l’onglet Planning ne liste plus la dépendance | 6 Édition (11), D-104 (4), (5) | 3e | e2e/tests/lot3e.spec.ts |
| E2E-178 | A → B créée par l’API ; zoom mois, clic sur le lien → dialogue ouvert, Annuler ; Alice (ressource) : clic sur le lien → aucun dialogue, curseur différent de pointer | 6 Édition (11), D-104 (4) | 3e | e2e/tests/lot3e.spec.ts |
| E2E-178-r1 | A → B créée par l’API ; zoom mois, clic sur le lien → dialogue ouvert, Annuler ; Alice (ressource, préambule : barres de A et B seulement, S invisible, D-107) : clic sur le lien → aucun dialogue, curseur différent de pointer | 6 Édition (11), D-104 (4) | 3e | e2e/tests/lot3e.spec.ts |
| E2E-179 | Aucun `[data-lien-cible]` ni `[data-connecteur-element]` avec `tabindex` ; ordre de tabulation de la fiche inchangé (même vérification qu’E2E-43-r2, sans la modifier) ; témoin positif : au moins un `[data-connecteur-element]` dans la page | 6 Édition (11), D-104 (7) | 3e | e2e/tests/lot3e.spec.ts |
| E2E-180 | Parcours complet : chaîne d’E2E-170 refaite à l’écran ; puis créer à l’écran (dialogue de l’onglet Planning) une seconde activité START au 11/01/2027, assignée à la même ressource, et calculer depuis le Gantt ; préambule : sans lien, `data-debut` de la première ≤ `data-fin` de la seconde ; case « Recalcul automatique » cochée, lien de la seconde vers la première par le connecteur (D-105) ; sans « Calculer » : `data-debut` de la première > `data-fin` de la seconde | 6 Édition (11), D-104 (8), D-105 | 3e | e2e/tests/lot3e.spec.ts |

### Couverture des champs, liens dans le Gantt (règle « Couverture des champs », 3e)

| Champ de l’API | Champ d’écran | Test |
|---|---|---|
| POST /api/projets/:id/dependances `predecesseur_id`, `successeur_id` | glisser du connecteur (source, cible) | E2E-172 |
| POST /api/projets/:id/dependances `type`, `delai` | hors écran de création : valeurs fixes FD et 0 (D-104 (3)) ; modifiables dans « Modifier la dépendance » | E2E-172, E2E-176 |
| PATCH /api/dependances/:id `type`, `delai` | dialogue « Modifier la dépendance », ouvert par clic sur le lien | E2E-176 |
| DELETE /api/dependances/:id | bouton « Supprimer » du dialogue, avec confirmation | E2E-177 |

## Tests du lot 3f-1, arborescence : glisser une ligne du tableau, dialogue « Déplacer » (D-108)

API : packages/api/test/lot3f1.test.ts (nouveau fichier). Web : packages/web/test/gantt-arborescence.test.ts et gantt-arborescence-textes.test.ts (nouveaux fichiers, sans jsdom ; deux fichiers pour qu'un module absent ne masque pas les assertions de texte). E2E : e2e/tests/lot3f1.spec.ts (nouveau fichier ; base « administrateur seul », horloge au 06/01/2027, zoom jour, données créées par l'API sauf E2E-192, requêtes POST comptées par `page.on('request')`, état en base relu par GET /api/projets/:id/gantt). Monde « arbo » : 1 Phase P ; 1.1 Sous P1 ; 1.2 Sous P2 ; 2 Tâche Q (START 11/01/2027, 3 j, Alice, avec barre) ; 3 Tâche R ; 4 Jalon J (fixe 25/01/2027) ; 5 Clos K (activité close) ; puis le sous-projet S. Les valeurs attendues viennent de D-108 et de SPEC §6 point 12.

Rouges attendus : ACT-36 à ACT-39 (422 sans `code`, préambule 422 vert) ; GEO-23 à GEO-28 (module `gantt/arborescence.ts` absent) ; GEO-29 (fonction `texteRefusDeplacement` absente) ; GEO-30 (texte renvoyé null) ; E2E-181 à E2E-192 (sur l'effet attendu : poignée ou bouton « Déplacer » absent, préambule vert ; E2E-192 : la chaîne d'E2E-180 est verte, le test échoue au premier glisser). Aucun test vert d'emblée. Les e2e négatifs (E2E-186, parties « 0 POST » ou « aucun indicateur » d'E2E-181 et E2E-185) ont un témoin positif dans le même test : la poignée trouvée et saisie (`toHaveCount(1)`), ou une cible valide qui affiche l'indicateur avant la cible interdite.

Contrat choisi pour les tests (à créer en phase verte, noms relus par le porteur) : voir docs/state.md.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| ACT-36 | Activité cible assignée (Alice) ; POST deplacer d'une autre activité avec `parent_id` = la cible → 422 de corps exact { erreur: 'Règle de planning non respectée', code: 'parent_assigne' } ; base identique avant et après (toutes tables, historique compris) | 6 Édition (12), D-108 (2) | 3f-1 | packages/api/test/lot3f1.test.ts |
| ACT-37 | Activité parente assignée ; POST /api/projets/:id/activites avec `parent_id` = elle → 422 de corps exact avec `code: 'parent_assigne'` ; base identique | 6 Édition (12), D-108 (2) | 3f-1 | packages/api/test/lot3f1.test.ts |
| ACT-38 | Dépendance P → X (frères) ; POST deplacer de X avec `parent_id` = P → 422 de corps exact avec `code: 'dependance_hierarchie'` ; base identique | 6 Édition (12), D-108 (2) | 3f-1 | packages/api/test/lot3f1.test.ts |
| ACT-39 | X enfant de P ; POST /api/projets/:id/dependances P → X → 422 de corps exact avec `code: 'dependance_hierarchie'` ; base identique | 6 Édition (12), D-108 (2) | 3f-1 | packages/api/test/lot3f1.test.ts |
| GEO-23 | `zoneLacher('activite', y, hauteur)`, ligne de 32 px : 0 et 10,6 → avant ; 10,7, 16 et 21,3 → dans ; 21,4 et 32 → apres ; hauteur 36 : 11,9 → avant, 12 → dans, 23,9 → dans, 24 → apres | 6 Édition (12), D-108 (6) | 3f-1 | packages/web/test/gantt-arborescence.test.ts |
| GEO-24 | `zoneLacher('jalon', y)` : 0 et 15,9 → avant ; 16 et 32 → apres ; jamais dans | 6 Édition (12), D-108 (6) | 3f-1 | packages/web/test/gantt-arborescence.test.ts |
| GEO-25 | `destinationDeplacement`, fratrie d'arrivée différente (éléments 1 P, 1.1 P1, 1.2 P2, 2 Q, 3 R, 4 J, 5 K) : R avant P1 → { parent_id: P, rang: 1 } ; R après P1 → { P, 2 } ; P2 avant Q → { null, 2 } ; P2 après J → { null, 5 } ; J avant P1 → { P, 1 } ; R après P (parente) → { null, 2 } ; P1 après P → { null, 2 } | 6 Édition (12), D-108 (6), (8) | 3f-1 | packages/web/test/gantt-arborescence.test.ts |
| GEO-26 | Même fratrie : Q avant K → { null, 4 } ; Q après K → { null, 5 } ; P après K → { null, 5 } ; J après K → { null, 5 } ; P1 après P2 → { P, 2 } ; sans correction quand la source est après la cible : R avant Q → { null, 2 } ; K avant P → { null, 1 } ; K après P → { null, 2 } | 6 Édition (12), D-108 (8) | 3f-1 | packages/web/test/gantt-arborescence.test.ts |
| GEO-27 | Dans : Q dans P → { parent_id: P } ; R dans P1 → { parent_id: P1 } ; P1 dans P → { parent_id: P } (déplacé en fin de fratrie) ; aucune clé `rang` | 6 Édition (12), D-108 (6), (8) | 3f-1 | packages/web/test/gantt-arborescence.test.ts |
| GEO-28 | Null, pour avant, dans et après : source = cible, cible descendante (P sur P1 et P2), `cibleId` null (sous-projet ou hors du tableau) ; petit-enfant de la source (P, cible de deux niveaux) → null ; cible jalon avec la zone 'dans' → null (protection) ; position identique : R avant J, Q avant R, Q après P, J après R, K après J, P1 avant P2, P2 dans P | 6 Édition (12), D-108 (7) | 3f-1 | packages/web/test/gantt-arborescence.test.ts |
| GEO-29 | `texteRefusDeplacement` : 400 « Modification refusée : données invalides. » ; 422 `parent_assigne` « Une activité avec des ressources assignées ne peut pas avoir d’enfant. » ; 422 `dependance_hierarchie` « Une dépendance relie cet élément à l’une de ses activités parentes. » ; 422 `parent_clos` « Le projet ou l’activité parente est clos. » ; 422 sans code ou code autre « Cette opération enfreint une règle du planning. » ; 403 et 404 « Modification impossible : rechargez la page. » ; 500 et TypeError « Modification impossible pour le moment. Réessayez. » | 6 Édition (12), D-108 (10) | 3f-1 | packages/web/test/gantt-arborescence-textes.test.ts |
| GEO-30 | `texteRefusCode` : `parent_assigne` et `dependance_hierarchie` avec la cible 'element' → les deux textes de GEO-29 ; avec la cible 'projet' → null | 6 Édition (12), D-108 (3) | 3f-1 | packages/web/test/gantt-arborescence-textes.test.ts |
| E2E-181 | Chef : `[data-poignee-ligne]` pour P, P1, P2, Q, R, J et K (7), `aria-hidden="true"`, sans `tabindex`, curseur grab, aux zooms jour, semaine et mois ; 0 dans la ligne du sous-projet ; Alice (ressource, témoin : ligne et barre de Q affichées) : 0 poignée ; modèle ouvert par l'administrateur (témoin : ligne de son activité affichée) : 0 poignée | 6 Édition (12), D-108 (4), (5) | 3f-1 | e2e/tests/lot3f1.spec.ts |
| E2E-182 | « Avant » : glisser R sur le tiers haut de P1 → 1 POST de corps exact { parent_id: P, rang: 1 } ; ordre et retraits (pl-0, pl-4) vérifiés dans le tableau ; bandeau « Planning à recalculer », 0 contour, 0 POST /api/calcul, GET du Gantt rechargé, anneau de Q (barre active) gardé ; puis Q sur le tiers haut de K (même fratrie, source avant) → { parent_id: null, rang: 3 } et nouvel ordre | 6 Édition (12), D-108 (6), (8), (9) | 3f-1 | e2e/tests/lot3f1.spec.ts |
| E2E-183 | « Après » : R sur le tiers bas de P (parente) → { parent_id: null, rang: 2 }, R après tout le sous-arbre de P ; puis P2 sur la moitié basse du jalon J → { parent_id: null, rang: 5 } ; ordre et retraits vérifiés ; bandeau, 0 contour | 6 Édition (12), D-108 (6), (8) | 3f-1 | e2e/tests/lot3f1.spec.ts |
| E2E-184 | « Dans » : Q sur le tiers milieu de P → corps exact { parent_id: P }, sans clé `rang` ; R sur le tiers milieu de P1 (feuille) → { parent_id: P1 } ; ordre (1.3 Tâche Q, 1.1.1 Tâche R) et retrait pl-8 vérifiés ; bandeau | 6 Édition (12), D-108 (6), (8) | 3f-1 | e2e/tests/lot3f1.spec.ts |
| E2E-185 | Sous 4 px : ni `data-ligne-source` ni `data-insertion-ligne` ; au-delà : ligne de R `data-ligne-source` = id ; Q : `data-insertion-ligne` = id et `data-insertion` avant, dans, apres selon le tiers ; J : avant, apres (jamais dans) ; aucun indicateur de cible sur la source ni sur le sous-projet ; plus rien après le lâcher, 0 POST ; glisser P sur P1 (descendant) : source marquée, aucune cible | 6 Édition (12), D-108 (5), (6), (7) | 3f-1 | e2e/tests/lot3f1.spec.ts |
| E2E-186 | 0 POST, ordre inchangé, ni bandeau ni alerte, indicateurs retirés, base identique (GET) : lâcher sur la source ; sur un descendant (dans, après) ; sur un sous-projet ; position identique (R avant J, Q après P, P2 dans P) ; hors du tableau (indicateur présent sur une vraie cible avant, absent hors) ; Échap pendant le glisser | 6 Édition (12), D-108 (5), (7) | 3f-1 | e2e/tests/lot3f1.spec.ts |
| E2E-187 | Refus réels, 1 POST de corps exact chacun, alerte (une seule à la fois) avec le texte, ordre et base identiques (GET), pas de bandeau : R dans Q assignée → « Une activité avec des ressources assignées ne peut pas avoir d’enfant. » ; R dans K close → « Le projet ou l’activité parente est clos. » ; R dans P avec une dépendance P → R → « Une dépendance relie cet élément à l’une de ses activités parentes. » ; puis 403 intercepté → « Modification impossible : rechargez la page. » ; case « Recalcul automatique » cochée : 0 POST /api/calcul | 6 Édition (12), D-108 (2), (3), (10) | 3f-1 | e2e/tests/lot3f1.spec.ts |
| E2E-188 | Case « Recalcul automatique » cochée ; R sur le tiers bas de P → 1 POST deplacer, puis 1 POST /api/calcul de corps { projets: [projet], d0: '2027-01-06' } ; pas de bandeau ni de « Recalcul en cours… » ; ordre vérifié ; pas de requête de plus | 6 Édition (12), D-108 (9) | 3f-1 | e2e/tests/lot3f1.spec.ts |
| E2E-189 | Onglet Planning : boutons « Déplacer <nom> » (R, J, P1) à côté de « Monter » ; dialogue « Déplacer Tâche R » : liste « Activité parente » = Racine du projet, 1 Phase P, 1.1 Sous P1, 1.2 Sous P2, 2 Tâche Q, 5 Clos K (ni R ni le jalon), racine présélectionnée, « Déplacer » inactif puis actif après choix de P → 1 POST { parent_id: P }, dialogue fermé, ordre dans le Gantt (1.3 Tâche R) ; « Déplacer Phase P » : liste sans P, P1, P2 ni R ; « Déplacer Sous P1 » : parent actuel présélectionné, inactif, retour à la racine → { parent_id: null }, ordre dans le Gantt (5 Sous P1) ; Alice : 0 bouton « Déplacer » (témoin : ligne de Q affichée) | 6 Édition (12), D-108 (11) | 3f-1 | e2e/tests/lot3f1.spec.ts |
| E2E-190 | Dialogue « Déplacer Tâche R » : Q assignée → texte « Une activité avec des ressources assignées ne peut pas avoir d’enfant. » dans le dialogue ouvert ; puis K close → texte « Le projet ou l’activité parente est clos. » (le premier disparaît) ; puis 403 intercepté → « Modification impossible : rechargez la page. » ; Annuler ; base identique (GET), ordre du Gantt inchangé | 6 Édition (12), D-108 (10), (11) | 3f-1 | e2e/tests/lot3f1.spec.ts |
| E2E-191 | Aucun `[data-poignee-ligne]` avec `tabindex` ; ordre de tabulation de la fiche inchangé (même vérification qu'E2E-43-r2 et E2E-179, sans les modifier : Calculer, case, zoom, Initiales, tableau, lien du sous-projet, calendrier) ; focus jamais sur une poignée ; témoin positif : au moins une poignée | 6 Édition (12), D-108 (5) | 3f-1 | e2e/tests/lot3f1.spec.ts |
| E2E-192 | Parcours complet : chaîne d'E2E-180 refaite à l'écran (calendrier, ressource, projet, affectation, activités, assignations, calcul, lien par le connecteur avec recalcul automatique) ; puis glisser « Tâche bis » dans « Phase » (ordre 1.2, retrait pl-4) ; puis, dans l'onglet Planning, « Déplacer Tâche bis » vers « Racine du projet » (ordre 2, retrait pl-0). E2E-180 n'est pas modifié | 6 Édition (12), D-108 (6), (11) ; CLAUDE.md « Parcours IHM » | 3f-1 | e2e/tests/lot3f1.spec.ts |
| E2E-193 | Captures sans assertion de comparaison : e2e/captures/gantt-glisser-{1440,1024}.png (zone « dans »), gantt-glisser-avant-{1440,1024}.png (trait d'insertion) et deplacer-dialogue-{1440,1024}.png ; non suivies ; ne compte pas comme test de comportement | 6 Édition (12), D-108 | 3f-1 | e2e/tests/lot3f1-captures.spec.ts |

### Couverture des champs, arborescence (règle « Couverture des champs », 3f-1)

| Champ de l’API | Champ d’écran | Test |
|---|---|---|
| POST /api/elements/:id/deplacer `parent_id` | glisser une ligne : zone « dans » (parent = cible), « avant » et « après » (parent de la cible) ; dialogue « Déplacer » : liste « Activité parente » | E2E-182, E2E-183, E2E-184, E2E-189, E2E-192 |
| POST /api/elements/:id/deplacer `rang` | glisser une ligne : zones « avant » et « après » (rang calculé, D-108 (8)) ; omis par la zone « dans » et par le dialogue (fin de fratrie) | E2E-182, E2E-183, E2E-184, E2E-189 |

## Tests du lot 3f-2, menu contextuel et « Copier » depuis le Gantt (D-111)

Web : packages/web/test/gantt-menu.test.ts (nouveau fichier, sans jsdom). E2E : e2e/tests/lot3f2.spec.ts (nouveau fichier ; base « administrateur seul », horloge au 06/01/2027, zoom jour, monde « arbo » de lot3f1.spec.ts : 1 Phase P, 1.1 Sous P1, 1.2 Sous P2, 2 Tâche Q assignée à Alice, 3 Tâche R, 4 Jalon J, 5 Clos K, puis le sous-projet ; données créées par l'API sauf E2E-208). Identifiants écrits avant les tests (règle de CLAUDE.md).

Rouges attendus : GEO-31 et GEO-32 (module `gantt/menu.ts` absent) ; E2E-194 à E2E-208 (sur l'effet attendu : menu ou bouton « Copier » absent, préambule vert) ; E2E-43-r3, E2E-179-r1 et E2E-191-r1 (arrêt « Copier » absent). Tests de refus : témoin positif (même geste sur une cible permise) ; base relue par l'API. Les non-menus (E2E-195) sont verts d'emblée pour leur partie « absent » : chacun porte un témoin positif (menu présent sur une ligne permise du même écran) qui, lui, est rouge.

Contrat choisi pour les tests (à créer en phase verte, noms relus par le porteur) : voir docs/state.md.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GEO-31 | `corpsCreation(elements, ligneId, entree)` (éléments 1 P, 1.1 P1 rang 1, 1.2 P2 rang 2, 2 Q rang 2, 3 R rang 3, 4 J rang 4, 5 K rang 5) : P1 + 'activite' → { parent_id: P, rang: 2 } ; P2 + 'jalon' → { P, 3 } ; Q + 'activite' → { null, 3 } ; J + 'jalon' → { null, 5 } ; K + 'activite' → { null, 6 } ; P + 'sous-activite' → { parent_id: P } sans clé `rang` ; R + 'sous-activite' → { parent_id: R } sans clé `rang` ; id inconnu → null ; jalon + 'sous-activite' → null (protection) | 6 Édition (13), D-111 (3) | 3f-2 | packages/web/test/gantt-menu.test.ts |
| GEO-32 | `entreesMenu(type)` : 'activite' → ['activite', 'jalon', 'sous-activite'] ; 'jalon' → ['activite', 'jalon'] ; `libelleEntree` : « Nouvelle activité », « Nouveau jalon », « Nouvelle sous-activité » | 6 Édition (13), D-111 (3) | 3f-2 | packages/web/test/gantt-menu.test.ts |
| E2E-194 | Chef : clic droit sur la ligne du tableau de P, de J et de K (close), puis sur la barre de Q et le losange de J dans le SVG → `role="menu"` visible, `contextmenu` empêché (`defaultPrevented`), aux zooms jour, semaine et mois ; clic droit sur la ligne du sous-projet (tableau) et sur sa barre de synthèse (SVG) → aucun menu, `defaultPrevented` faux | 6 Édition (13), D-111 (2) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-195 | Absent : Alice (ressource, témoin : ligne et barre de Q affichées), modèle ouvert par l'administrateur (témoin : ligne de son activité), Accueil (Gantt global déplié, ligne d'activité) → aucun menu, `defaultPrevented` faux ; témoin positif : le chef a le menu sur Q dans le même monde | 6 Édition (13), D-111 (2), (7) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-196 | Entrées dans l'ordre : activité (tableau et SVG) → « Nouvelle activité », « Nouveau jalon », « Nouvelle sous-activité » ; jalon (tableau et SVG) → « Nouvelle activité », « Nouveau jalon » seulement | 6 Édition (13), D-111 (3) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-197 | Clavier : barre de Q active (clic simple), Maj+F10 → menu ouvert, son coin haut gauche dans la zone de la barre de Q ; Escape → fermé ; touche Menu → ouvert ; sans barre active, Maj+F10 → aucun menu ; Alice : Maj+F10 sur Q active → aucun menu | 6 Édition (13), D-111 (2) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-198 | Échap ferme le menu et rend le focus : ouvert depuis le tableau → région « Tableau du Gantt » focalisée ; depuis le SVG → région « Calendrier du Gantt » focalisée ; depuis Maj+F10 → idem, anneau de la barre active gardé ; aucune requête d'écriture | 6 Édition (13), D-111 (2) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-199 | « Nouvelle activité » : depuis la ligne de P1 (tableau) → dialogue « Nouvelle activité », champ Nom, 1 POST /activites de corps exact { nom, parent_id: P, rang: 2 } ; dialogue fermé, ordre (1.2 = nouvelle, 1.3 Sous P2), bandeau « Planning à recalculer », 0 contour, 0 POST /api/calcul, GET du Gantt rechargé, anneau de Q gardé, focus sur « Tableau du Gantt » ; puis depuis la barre de Q (SVG) → { nom, parent_id: null, rang: 3 }, focus sur « Calendrier du Gantt » | 6 Édition (13), D-111 (3), (4) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-200 | « Nouveau jalon » : depuis la ligne de R (tableau) → dialogue « Nouveau jalon », 1 POST /jalons de corps exact { nom, parent_id: null, rang: 4 } ; depuis le losange de J (SVG), « Nouvelle activité » → { nom, parent_id: null, rang: 6 } (J est devenu 5) ; ordre vérifié dans le Gantt, bandeau | 6 Édition (13), D-111 (3), (4) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-201 | « Nouvelle sous-activité » : depuis la ligne de P → dialogue « Nouvelle sous-activité », corps exact { nom, parent_id: P }, sans clé `rang`, nouvelle ligne 1.3 de retrait pl-4 ; depuis la barre de R (feuille, SVG) → { nom, parent_id: R }, ligne 3.1 | 6 Édition (13), D-111 (3), (4) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-202 | Case « Recalcul automatique » cochée ; création par le menu → 1 POST de création, puis 1 POST /api/calcul de corps { projets: [projet], d0: '2027-01-06' } ; pas de bandeau ni de « Recalcul en cours… » ; ordre vérifié ; pas de requête de plus | 6 Édition (13), D-111 (4) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-203 | Refus réels dans le dialogue laissé ouvert, 1 POST de corps exact chacun : « Nouvelle sous-activité » sur Q assignée → « Une activité avec des ressources assignées ne peut pas avoir d'enfant. » ; sur K close → « Le projet ou l'activité parente est clos. » (le premier texte disparaît) ; ordre du Gantt et base (GET API) identiques, ni bandeau, 0 POST /api/calcul ; Annuler, focus rendu à la zone d'origine ; témoin positif : « Nouvelle sous-activité » sur R réussit | 6 Édition (13), D-111 (3), (4) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-204 | « Copier » : chef et administrateur voient un bouton « Copier » (icône `lucide-copy`) dans la barre d'outils, aux trois zooms ; Tab depuis « Initiales » l'atteint, Tab suivant atteint « Tableau du Gantt » ; Alice (ressource, témoin : barre de Q) : aucun bouton ; modèle (administrateur, témoin : ligne de son activité) : aucun bouton | 6 Édition (13), D-111 (5) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-205 | Dialogue du bouton « Copier » : titre « Copier Projet <nom> », Nom « Copie de Projet <nom> », Date de début = début du projet ; case « Enregistrer comme modèle » absente pour le chef, présente et décochée pour l'administrateur ; Annuler ferme sans POST | 6 Édition (13), D-111 (5), D-040 (2) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-206 | Chef : copie faite à l'écran depuis le Gantt (code saisi) → 1 POST /copie de corps exact { nom, code, date_debut, sous_projets: true, affectations: true, est_modele: false } ; navigation vers /projets/<copie> ; titre « Copie de Projet <nom> » ; Gantt de la copie : mêmes lignes d'éléments dans le même ordre WBS que la source, aucune date planifiée ; la source est inchangée (GET) | 6 Édition (13), D-111 (5) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-207 | Administrateur : « Enregistrer comme modèle » cochée → corps avec `est_modele: true` ; navigation vers la copie ; sa fiche est un modèle (aucun bouton « Copier » ni poignée dans son Gantt) ; l'écran « Modèles » la liste | 6 Édition (13), D-111 (5), D-040 (2) | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-208 | Parcours complet : chaîne d'E2E-192 refaite à l'écran (calendrier, ressource, projet, affectation, activités, assignations, calcul, lien, glisser, « Déplacer ») ; puis, par le menu contextuel d'une ligne du tableau, « Nouveau jalon » « Jalon 3F-208 » (rang de la ligne + 1) ; puis « Copier » depuis le Gantt (code saisi), vérifié dans l'écran de la copie (mêmes lignes, jalon compris). E2E-192 n'est pas modifié | 6 Édition (13), D-111 | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-194-r1 | Révision de E2E-194 (D-113 (1)) : S reçoit une activité assignée à Bob (affecté à S), calcul par l'API sur la racine et S ; préambule : barre de synthèse de S dans le SVG ; clic droit sur la ligne de S et sur sa barre : aucun menu, `defaultPrevented` faux ; reste inchangé | 6 Édition (13), D-111 (2), D-113 | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-198-r1 | Révision de E2E-198 (D-113 (2)) : les requêtes `/api/auth/` sont exclues du compteur d'écritures ; reste inchangé | 6 Édition (13), D-111 (2), D-113 | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-203-r1 | Révision de E2E-203 (D-113 (3)) : le menu de K (close, sans barre) s'ouvre sur sa ligne du tableau, focus rendu à « Tableau du Gantt » ; reste inchangé | 6 Édition (13), D-111 (3), (4), D-113 | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-206-r1 | Révision de E2E-206 (D-113 (4)) : attendre que l'adresse ne soit plus `/projets/<id de la source>` (`not.toHaveURL`), puis lire l'id de la copie ; reste inchangé | 6 Édition (13), D-111 (5), D-113 | 3f-2 | e2e/tests/lot3f2.spec.ts |
| E2E-43-r3 | (1440 puis 1024 px) E2E-43-r2 inchangé, plus un arrêt : Tab depuis la case « Initiales » atteint le bouton « Copier », Tab suivant « Tableau du Gantt » (révision D-031, D-111 (6), tag `tests-lot3b-regle12-r3`) | 6 Édition (13), D-111 (6) | 3f-2 | e2e/tests/lot3b-focus.spec.ts |
| E2E-179-r1 | E2E-179 inchangé, plus un arrêt : Tab depuis « Initiales » atteint « Copier », puis « Tableau du Gantt » (révision D-031, D-111 (6), tag `tests-lot3e-r2`) | 6 Édition (13), D-111 (6) | 3f-2 | e2e/tests/lot3e.spec.ts |
| E2E-191-r1 | E2E-191 inchangé, plus un arrêt : Tab depuis « Initiales » atteint « Copier », puis « Tableau du Gantt » (révision D-031, D-111 (6), tag `tests-lot3f1-r1`) | 6 Édition (13), D-111 (6) | 3f-2 | e2e/tests/lot3f1.spec.ts |

### Couverture des champs, menu contextuel et « Copier » (règle « Couverture des champs », 3f-2)

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| POST /api/projets/:id/activites `nom` | dialogue « Nouvelle activité » ou « Nouvelle sous-activité » du menu, champ Nom | E2E-199, E2E-201, E2E-208 |
| POST /api/projets/:id/activites `parent_id` | menu : parent de la ligne (« Nouvelle activité ») ou la ligne elle-même (« Nouvelle sous-activité ») ; aucune saisie | E2E-199, E2E-201, GEO-31 |
| POST /api/projets/:id/activites `rang` | menu : rang de la ligne + 1 (« Nouvelle activité ») ; omis pour « Nouvelle sous-activité » ; aucune saisie | E2E-199, E2E-200, E2E-201, GEO-31 |
| POST /api/projets/:id/jalons `nom`, `parent_id`, `rang` | dialogue « Nouveau jalon » du menu, champ Nom ; parent et rang comme ci-dessus | E2E-200, E2E-208, GEO-31 |
| POST /api/projets/:id/copie `nom`, `code`, `date_debut`, `sous_projets`, `affectations`, `est_modele` | dialogue de copie ouvert par le bouton « Copier » ; champs déjà couverts par l’écran Projets (E2E-14, E2E-16, E2E-24, lot1b-c.spec.ts) | E2E-205, E2E-206, E2E-207 |

### Captures du lot 3f-2 (séance UX)

| ID | Description | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-209 | Captures sans assertion de comparaison (ne compte pas comme test de comportement) : menu contextuel sur une ligne du tableau et sur une barre du SVG, poignées, contour pointillé, anneau, case « Recalcul automatique », connecteur de lien, glisser de ligne (avant, dans, après), barre d'outils avec « Copier » ; 1440 et 1024 px, dans e2e/captures/ | D-111, D-113, docs/ux-session.md | 3f-2 | e2e/tests/lot3f2-captures.spec.ts |

## Tests du lot 3g, reprises et clôture du lot 3 (D-114)

API : packages/api/test/lot3g-travail.test.ts (TRAV, nouveau préfixe) et packages/api/test/lot3g-calcul.test.ts (CALC-51, nouveau fichier). Web : packages/web/test/gantt-surcharge.test.ts (GEO-33 à GEO-35), packages/web/test/planning-manuel-clavier.test.ts (PMC, nouveau préfixe), packages/web/test/calcul.test.ts (CLC-6 à CLC-10, ajouts seuls ; CLC-1 à CLC-5 inchangés, aucun ne contredit D-114 (8), donc aucune révision D-031). E2E : e2e/tests/lot3g.spec.ts (nouveau fichier ; base « administrateur seul », horloge au 06/01/2027, zoom jour sauf mention, D0 des calculs de préparation 2027-01-04, données créées par l'API). Identifiants écrits avant les tests (règle de CLAUDE.md).

Rouges attendus : TRAV-1 à TRAV-8 (route absente : 404) ; GEO-33 à GEO-35 (module `gantt/surcharge.ts` absent) ; PMC-1 à PMC-7 (module `screens/planning-manuel-clavier.ts` absent) ; CLC-6 à CLC-10 (règle « racine d'écriture » absente) ; E2E-210 à E2E-220 (effet absent, préambule vert, témoin positif quand le test est un test de refus ou d'absence). CALC-51 est un test de caractérisation de D-114 (7) : vert attendu sans code de production. E2E-218 (lecture seule) est vert pour sa partie « aucun arrêt » (cases désactivées) : son témoin positif (le chef a un arrêt) est rouge.

Contrat choisi pour les tests (à créer en phase verte, noms relus par le porteur) : voir docs/state.md.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| TRAV-1 | MAN-5 calculé (Alice : saisie le 05/01 matin et le samedi 09/01 une journée) : 200 `{ lignes }`, deux lignes triées { element_id, assignation_id, ressource_id, jour '2027-01-05', charge 0,5, surcharge faux } puis { …, '2027-01-09', charge 1, surcharge vrai } ; `charge` est un nombre (`typeof`), non une chaîne | 6 Lecture (Travail par jour), 5.6 (MAN-5), D-114 (2) | 3g | packages/api/test/lot3g-travail.test.ts |
| TRAV-2 | Tri par element_id, assignation_id, jour : Y (ASAP, Bob 1 j), puis Z (MAN, Alice, saisies PUT dans l'ordre inverse 12/01 puis 11/01), puis X (ASAP, Alice 2 j) ; attendu : Y (04/01), Z (11/01, 12/01), X (04/01, 05/01) ; ressource_id exact | 6 Lecture (Travail par jour), D-114 (2) | 3g | packages/api/test/lot3g-travail.test.ts |
| TRAV-3 | Avant tout calcul (activité assignée) : 200 `{ lignes: [] }` | 6 Lecture (Travail par jour), D-114 (2) | 3g | packages/api/test/lot3g-travail.test.ts |
| TRAV-4 | P (A ASAP Bob 2 j) et son sous-projet P1 (C ASAP Alice 3 j), calcul de P : GET de P → lignes de A seules (04 et 05/01) ; GET de P1 → lignes de C seules (04, 05 et 06/01) ; aucune ligne de C dans P | 6 Lecture (Travail par jour), D-114 (2) | 3g | packages/api/test/lot3g-travail.test.ts |
| TRAV-5 | Alice (ressource affectée) et le chef du projet : 200, mêmes lignes que l'administrateur | 6 Lecture (Travail par jour), 2, D-114 (2) | 3g | packages/api/test/lot3g-travail.test.ts |
| TRAV-6 | Refus : sans session 401 ; chef d'un autre projet, ressource non affectée, « abc », 2147483648 : 404 ; 999999 (administrateur) : 404 ; témoin : administrateur 200 sur le projet ; empreinte de la base identique avant et après | 6 Lecture (Travail par jour), D-114 (2) | 3g | packages/api/test/lot3g-travail.test.ts |
| TRAV-7 | Modèle lu par l'administrateur : 200 `{ lignes: [] }` ; empreinte identique | 6 Lecture (Travail par jour), 11.1, D-114 (2) | 3g | packages/api/test/lot3g-travail.test.ts |
| TRAV-8 | Lecture seule : empreinte de la base identique avant et après un GET portant des lignes (200, lignes non vides) | 6 Lecture (Travail par jour), D-114 (2) | 3g | packages/api/test/lot3g-travail.test.ts |
| CALC-51 | Caractérisation de D-114 (7) (vert d'emblée, sans code de production) : R (chef A), S sous-projet de R (chef B, aussi affecté à R en dernier), Alice commune, une activité ASAP Alice 2 j dans R et dans S. A calcule R → 200, projets [R, S], travail de S écrit, jours de R et de S disjoints ; B calcule S → 200, projets [S], travail de S identique, dates, drapeaux et travail de R et du projet R inchangés (état des projets R) ; B calcule R → 404 (R illisible pour B) ; B affecté à R (sans calcul) : B calcule R → 403, base inchangée | 6 Calcul (5), 2, D-044 (2), D-074 (10), D-114 (7) | 3g | packages/api/test/lot3g-calcul.test.ts |
| GEO-33 | `joursSurcharge(lignes)` : union des assignations d'un même élément sans doublon, jours triés ; lignes à `surcharge` faux ignorées (élément sans jour rouge absent de la Map) ; plusieurs éléments ; liste vide → Map vide | 6 Édition (14), D-114 (4) | 3g | packages/web/test/gantt-surcharge.test.ts |
| GEO-34 | `rectSurcharge(origine, jour, zoom, indexLigne)` : origine 04/01/2027, jour 09/01 → x 120, 40, 20 (jour, semaine, mois), largeur 24, 8, 4 ; ligne 0 → y 8, ligne 3 → y 104, hauteur 16 (HAUTEUR_BARRE) ; un jour avant l'origine (02/01) donne un x négatif (−48 au zoom jour) : la géométrie ne dépend pas de la barre | 6 Édition (14), D-114 (4) | 3g | packages/web/test/gantt-surcharge.test.ts |
| GEO-35 | `texteSurcharge(jours)` (jours AAAA-MM-JJ triés) : 0 jour → '' ; 1 jour → ', jours en surcharge : 09/01/2027' ; 5 jours → les 5 séparés par « , » ; 7 jours → les 5 premiers puis ' et 2 autres' ; relecture (D-115 (1)) : six jours → les 5 premiers puis « et 1 autre » (singulier) | 6 Édition (14), D-114 (5) | 3g | packages/web/test/gantt-surcharge.test.ts |
| PMC-1 | `caseSuivante` : → matin → après-midi → matin du jour suivant ; ← l'inverse ; ligne et jour de départ quelconques (jour 10, ligne 1) | 5.6 (Clavier), D-114 (6) | 3g | packages/web/test/planning-manuel-clavier.test.ts |
| PMC-2 | ↓ et ↑ : même jour et même demi-case, ligne suivante ou précédente (matin et après-midi) | 5.6 (Clavier), D-114 (6) | 3g | packages/web/test/planning-manuel-clavier.test.ts |
| PMC-3 | Début : première case de la ligne (jour 1, matin) ; Fin : dernière (dernier jour du mois, après-midi), ligne conservée, de n'importe quelle case | 5.6 (Clavier), D-114 (6) | 3g | packages/web/test/planning-manuel-clavier.test.ts |
| PMC-4 | Bornes sans bouclage : ← sur la première case et → sur la dernière de la ligne ; ↑ sur la première ligne, ↓ sur la dernière : la case ne change pas ; ↑ ↓ ← → depuis une case d'angle | 5.6 (Clavier), D-114 (6) | 3g | packages/web/test/planning-manuel-clavier.test.ts |
| PMC-5 | Grille d'une seule ligne : ↑ et ↓ sans effet, → et ← parcourent la ligne | 5.6 (Clavier), D-114 (6) | 3g | packages/web/test/planning-manuel-clavier.test.ts |
| PMC-6 | Mois de 28 jours (février 2027) : la dernière case est le jour 28, après-midi ; → depuis le 27 après-midi donne le 28 matin ; Fin donne le 28 après-midi | 5.6 (Clavier), D-114 (6) | 3g | packages/web/test/planning-manuel-clavier.test.ts |
| PMC-7 | `toucheGrille(key)` : ArrowRight → 'droite', ArrowLeft → 'gauche', ArrowUp → 'haut', ArrowDown → 'bas', Home → 'debut', End → 'fin' ; autres (Tab, Espace, Entrée, PageUp, lettres) → null | 5.6 (Clavier), D-114 (6) | 3g | packages/web/test/planning-manuel-clavier.test.ts |
| CLC-6 | Racine d'écriture : S sous-projet (écriture) sous R en lecture seule → `projetsListes` = [S] ; `racineDe(S)` = S ; R en lecture seule absent de la liste | 6 Calcul (5), Édition (14), D-114 (8) | 3g | packages/web/test/calcul.test.ts |
| CLC-7 | Parent absent de la liste des projets (S sous un parent inconnu 99) : S proposé ; `racineDe(S)` = S | 6 Édition (14), D-114 (8) | 3g | packages/web/test/calcul.test.ts |
| CLC-8 | Racine close : S (ouvert, écriture) sous R clos → liste = [S], `racineDe(S)` = S ; R clos non proposé | 6 Édition (14), D-114 (8) | 3g | packages/web/test/calcul.test.ts |
| CLC-9 | Sous-sous-projet : R (écriture) → S (lecture seule) → T (écriture) : liste = [R, T] triée par code, `racineDe(T)` = T ; R (écriture) → S (écriture) → T (écriture) : liste = [R], `racineDe(T)` = R ; R (lecture seule) → S (écriture) → T (écriture) : liste = [S], `racineDe(T)` = S | 6 Édition (14), D-114 (8) | 3g | packages/web/test/calcul.test.ts |
| CLC-10 | Modèle : S sous un parent modèle (écriture) → S proposé, `racineDe(S)` = S ; le modèle n'est jamais proposé ; `casesInitiales` : [R lecture seule, S écriture] avec précoché [S] → {S} ; avec 'tous' → {S} ; [R écriture, S écriture] avec précoché [S] → {R} | 6 Édition (14), D-114 (8) | 3g | packages/web/test/calcul.test.ts |
| E2E-210 | Jours rouges : MAN M (Alice, saisie le samedi 09/01/2027 une journée) et MAN N (saisie le 05/01 matin seule), calcul ; Gantt du chef aux zooms jour, semaine et mois : un seul rect `[data-surcharge-jour]`, `data-surcharge-jour` 2027-01-09 et `data-surcharge-element` = M, largeur 24, 8, 4, `y` et `height` égaux à ceux de la barre de M, `aria-hidden`, `pointer-events` none, placé après la barre de M dans le document ; aucun rect pour N ; `aria-label` de la barre de M inchangé (« …, du 09/01/2027 au 09/01/2027, surcharge ») ; relecture (D-115 (3)) : à chaque zoom, attribut `x` du rect = attribut `x` de la barre de M (barre d'un jour) | 6 Édition (14), D-114 (3), (4) | 3g | e2e/tests/lot3g.spec.ts |
| E2E-211 | Requêtes `/travail` (compteur) : projet sans surcharge (ASAP calculé) → 0 GET /travail alors que le Gantt est chargé (témoin : GET du Gantt ≥ 1, barre affichée) ; projet avec surcharge → 1 GET au premier chargement, 2 après rechargement de la page, 3 après un calcul par le dialogue « Calculer » (Gantt rechargé), chacun suivi du rect ; relecture (D-115 (2)) : compteurs relatifs (StrictMode rejoue les effets au montage) : Q 0 exact après networkidle ; P au moins 1 au premier chargement, strictement plus après le rechargement de la page, puis après le calcul par le dialogue (expect.poll) | 6 Édition (14), D-114 (3) | 3g | e2e/tests/lot3g.spec.ts |
| E2E-212 | Annonce : sur la barre de M, ↓ → `[data-annonce-gantt]` = `aria-label` de M + « , jours en surcharge : 09/01/2027 » ; ↓ sur N (sans jour rouge) → exactement son `aria-label` ; Échap : vide | 6 Édition (14), D-114 (5) | 3g | e2e/tests/lot3g.spec.ts |
| E2E-213 | GET /travail en échec (route interceptée, 500) : Gantt affiché (barres), 0 rect `[data-surcharge-jour]`, 0 alerte ; témoin : route retirée et page rechargée → le rect de M est présent | 6 Édition (14), D-114 (3) | 3g | e2e/tests/lot3g.spec.ts |
| E2E-214 | Planning manuel (chef, deux assignations Alice et Bob, `?mois=2027-01`) : une seule case à `tabindex` 0 (62 cases par ligne, les autres −1) ; focus sur « Mois suivant » puis Tab → « Alice, 1 janvier, matin » ; → → « après-midi » puis « 2 janvier, matin » ; ← revient ; ↓ → Bob même demi-case ; ↑ revient ; Maj+Tab → « Mois suivant », Tab → la même case courante ; Tab depuis la case courante sort de la grille ; chaque flèche a `defaultPrevented` vrai | 5.6 (Clavier), D-114 (6) | 3g | e2e/tests/lot3g.spec.ts |
| E2E-215 | Début et Fin : sur la ligne d'Alice, Fin → « Alice, 31 janvier, après-midi », Début → « Alice, 1 janvier, matin » (`defaultPrevented` vrai) ; bornes : ← sur la première case, ↑ sur la première ligne, → sur la dernière case, ↓ sur la dernière ligne : le focus ne bouge pas ; Fin sur la ligne de Bob reste sur Bob | 5.6 (Clavier), D-114 (6) | 3g | e2e/tests/lot3g.spec.ts |
| E2E-216 | Espace puis Enregistrer : Espace sur « Alice, 1 janvier, matin » la coche (Enregistrer actif) ; Enregistrer → 1 PUT, base (GET saisies par l'API) = [Alice, 2027-01-01, matin] ; la case courante reste à `tabindex` 0 après Enregistrer ; Espace sur « 2 janvier, matin » puis Annuler : la case 2 janvier est décochée, la case courante reste « 2 janvier, matin » (`tabindex` 0), base inchangée | 5.6 (Clavier), D-114 (6) | 3g | e2e/tests/lot3g.spec.ts |
| E2E-217 | Case courante au changement de mois et au clic : flèches jusqu'à « Alice, 5 janvier, après-midi » ; « Mois suivant » → février, case à `tabindex` 0 = « Alice, 1 février, matin », une seule ; clic sur « Alice, 10 février, après-midi » (la coche) → cette case est la seule à `tabindex` 0, puis Annuler la garde | 5.6 (Clavier), D-114 (6) | 3g | e2e/tests/lot3g.spec.ts |
| E2E-218 | Lecture seule (Alice, ressource) : toutes les cases désactivées, aucune à `tabindex` 0 en tabulation utile (Tab depuis « Mois suivant » sort de la grille), ni Enregistrer ni Annuler ; témoin positif : le chef sur la même page a une case à `tabindex` 0 | 5.6 (Clavier), D-114 (6) | 3g | e2e/tests/lot3g.spec.ts |
| E2E-219 | Chef B (sous-projet S de R dont le chef est A ; B aussi affecté à R) : sur le Gantt de S, dialogue « Calculer le planning » : une case « S — … » cochée, aucune case R ; « Calculer » → POST /api/calcul de corps `{ projets: [S], d0: '2027-01-06' }`, réponse 200, notification « Planning calculé. » | 6 Calcul (5), D-114 (8) | 3g | e2e/tests/lot3g.spec.ts |
| E2E-220 | Même monde, case « Recalcul automatique » cochée : geste réussi sur une barre START de S → 1 PATCH puis 1 POST /api/calcul de corps `{ projets: [S], d0: '2027-01-06' }`, réponse 200, aucune alerte | 6 Édition (14), D-114 (8) | 3g | e2e/tests/lot3g.spec.ts |

E2E de parcours complet : non étendu par 3g, aucune entité n'est créée par un écran nouveau (E2E-208 inchangé). Les saisies du Planning manuel ont leur parcours par l'écran (E2E-26 à E2E-29, E2E-216).

### Couverture des champs, 3g (règle « Couverture des champs »)

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| GET /api/projets/:id/travail (lecture seule : aucun champ modifiable) | jours rouges du Gantt du projet (`data-surcharge-jour`), annonce de la barre active | E2E-210, E2E-212 |
| PUT /api/activites/:id/saisies `saisies` (assignation_id, jour, demi_journee) | cases de la grille du Planning manuel, désormais atteintes au clavier (Espace) ; champ déjà couvert par E2E-26 à E2E-29 | E2E-216 |
| POST /api/calcul `projets` | cases du dialogue « Calculer » : racines d'écriture, sous-projets compris (D-114 (8)) ; recalcul automatique | E2E-219, E2E-220, CLC-6 à CLC-10 |

## Tests de l'outillage de recette, jeu de démonstration (D-117)

API : packages/api/test/demo.test.ts (préfixe DEMO, nouveau). Outillage hors spec : valeurs attendues tirées de la consigne de la session (D-117), SPEC §5.9 pour les drapeaux. Pas de test qui crée ou supprime une base : `DROP` et `CREATE DATABASE` restent dans le CLI (`cli/demo.ts`), non couverts.

Rouges attendus : DEMO-1 à DEMO-3 (modules `demo/remplir.ts` et `demo/base.ts` absents).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| DEMO-1 | `remplirDemo(app, { lundi })` sur une base où seul l'administrateur existe : comptes admin, chefa, chefb, alice, bob (rôles, `est_ressource`, initiales renseignées) ; projets DEMO-R (chef chefa), DEMO-S (sous-projet de R, chef chefb), DEMO-Q (chef chefa), DEMO-C (clos), DEMO-M (modèle) ; affectations (chefb à R, Alice à S) ; chaque drapeau `retard`, `debut_non_respecte`, `surcharge`, `dependance_non_respectee` porté par au moins une activité de R ; connexion de chefb avec `chefb` / `chefb` : 200 | D-117 (4), SPEC 5.9 | outillage | packages/api/test/demo.test.ts |
| DEMO-2 | Après `remplirDemo` : chefb calcule S seul : 200 ; chefb calcule R : 403, travail planifié de R inchangé | D-117 (4), SPEC §2 | outillage | packages/api/test/demo.test.ts |
| DEMO-3 | `urlBaseDemo('postgres://u:p@h:5432/planersource')` → `postgres://u:p@h:5432/planersource_demo` ; `exigerBaseDemo` accepte un nom finissant par `_demo` et refuse `planersource`, `planersource_test`, `demo_x` | D-117 (1) | outillage | packages/api/test/demo.test.ts |

## Tests du lot 4a, imputations : API et branchement au calcul (D-118)

API : packages/api/test/lot4a-imputations.test.ts (IMP), lot4a-feuilles.test.ts (FDT), lot4a-validations.test.ts (VAL), lot4a-calcul.test.ts (CALR), aide commune lot4a-helpers.ts ; préfixes nouveaux. Jeu de données de SPEC 5.5 ; date du jour du serveur injectée (`aujourdhui`) : mercredi 13/01/2027 (IMP, FDT, VAL), vendredi 08/01/2027 (CALR). Tout refus relit la base entière (`empreinte` : imputations, feuilles, validations, assignations, historique). Valeurs de SPEC §7 « API et règles (lot 4a, D-118) » ; CALR-1 = PROJ-14 (§5.7) et §5.4 (dates, réel compris) ; CALR-2 à CALR-5 dérivées des règles §4 (disponibilité moins les imputations), §5.1 (projets non sélectionnés, activité close) et §5.4, à confirmer par le porteur comme PROJ-12 (D-063). Projet clos ou ancêtre clos avec activité ouverte (IMP-11, IMP-14) : posés en base (données antérieures à D-083 (7)), l'API ne les produit pas.

Rouges attendus : les 52 (routes /api/feuilles et /api/validations, tables de la migration 012 absentes ; CALR et IMP-24, IMP-25 rouges parce que leur préparation passe par le PUT).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| IMP-1 | GET feuille absente : 200, `feuille` = { id null, ressource_id, semaine, statut brouillon, commentaire null, validations [] } ; ligne de A complète (projet_code, activite_nom, wbs '1', assignee 5, reel_cumule 0, reste 5, modifiable, imputations []) ; 7 jours (ouvrés capacité 1, week-end 0) ; base inchangée | §7 4a (3), (4) | 4a | lot4a-imputations.test.ts |
| IMP-2 | Premier PUT (1 j le 11/01, 0,5 j le 12/01) : feuille créée en brouillon ; imputations en base ; charge_reelle 1,5, reste 3,5 ; totaux des jours ; réponse = GET | §7 4a (5) | 4a | lot4a-imputations.test.ts |
| IMP-3 | Remplacement : la ligne renvoyée sans le 12/01 le supprime, réel 1, reste 4 (δ −0,5) ; charge 0 supprime l'imputation, réel 0, reste 5 | §7 4a (5) | 4a | lot4a-imputations.test.ts |
| IMP-4 | Ligne non envoyée inchangée (imputations, réel, reste) | §7 4a (5) | 4a | lot4a-imputations.test.ts |
| IMP-5 | Réel = somme sur deux semaines (2 j), reste 3 ; la feuille du 11/01 ne montre que ses imputations ; le PUT d'une semaine ne touche pas l'autre | §7 4a (5) | 4a | lot4a-imputations.test.ts |
| IMP-6 | `reste` envoyé prime : 2, 6,25, puis 0 | §7 4a (5) | 4a | lot4a-imputations.test.ts |
| IMP-7 | Reste plancher 0 : assigné 1 j, 1,5 j imputés → réel 1,5, reste 0 | §7 4a (5) | 4a | lot4a-imputations.test.ts |
| IMP-8 | Historique : une entrée `reste_a_faire` 5 → 3,5, auteur Alice ; aucune entrée `charge_reelle` ; PUT sans changement de reste : aucune entrée | §7 4a (5), §3 Imputations | 4a | lot4a-imputations.test.ts |
| IMP-9 | Samedi 09/01 et jour hors des dates d'affectation acceptés ; samedi : capacité 0, total 0,5, dépassement | §7 4a (4), (6) | 4a | lot4a-imputations.test.ts |
| IMP-10 | Total du jour sur deux lignes (1,5 > 1 : dépassement) ; jour férié du calendrier d'Alice : capacité 0 | §7 4a (4) | 4a | lot4a-imputations.test.ts |
| IMP-11 | Lignes : exclues activité close, projet clos, ancêtre clos, modèle, assignation de Bob ; tri « A-PROJ » avant « b-proj » (sans casse), puis WBS (Y déplacée en 1 avant X) | §7 4a (3) | 4a | lot4a-imputations.test.ts |
| IMP-12 | Activité close portant une imputation de la semaine : ligne présente, `modifiable: false` ; absente d'une autre semaine | §7 4a (3) | 4a | lot4a-imputations.test.ts |
| IMP-13 | Ligne fermée (activité close) : charges inchangées → 200, base inchangée ; charge modifiée ou ajoutée → 422 `ligne_fermee`, base inchangée | §7 4a (6) | 4a | lot4a-imputations.test.ts |
| IMP-14 | `ligne_fermee` : assignation d'un modèle, projet clos, ancêtre clos ; base inchangée | §7 4a (6) | 4a | lot4a-imputations.test.ts |
| IMP-15 | `assignation_invalide` : assignation de Bob, assignation inconnue ; base inchangée | §7 4a (6) | 4a | lot4a-imputations.test.ts |
| IMP-16 | `jour_futur` : 14/01 refusé (date du jour 13/01), base inchangée ; 13/01 accepté | §7 4a (6) | 4a | lot4a-imputations.test.ts |
| IMP-17 | `feuille_verrouillee` : feuille soumise, puis validée ; base inchangée | §7 4a (6) | 4a | lot4a-imputations.test.ts |
| IMP-18 | 400, base inchangée : semaine absente, mal formée, pas un lundi, 1999, 2100 ; corps vide, clés inconnues, types faux, jour hors semaine ou mal formé, doublon de jour, doublon d'assignation, charge −1, 10,01, 0,333, chaîne ; reste −1 ou 1,234 | §7 4a (2), (6) | 4a | lot4a-imputations.test.ts |
| IMP-19 | Bornes acceptées : charge 10 et 0,01, reste 0 | §7 4a (6), §3 Imputations | 4a | lot4a-imputations.test.ts |
| IMP-20 | Sans session : GET et PUT 401, base inchangée | §2, §7 4a (6) | 4a | lot4a-imputations.test.ts |
| IMP-21 | Ordre des refus : 401 avant 400 ; 400 avant 422 ; `assignation_invalide` avant `ligne_fermee`, avant `jour_futur`, avant `feuille_verrouillee` | §7 4a (6) | 4a | lot4a-imputations.test.ts |
| IMP-22 | Feuille d'autrui : administrateur toutes les lignes, chef de P lignes de P, chef de Q lignes de Q ; Bob et chef sans projet de la feuille 404 ; `ressource_id` = soi = sa feuille | §7 4a (4) | 4a | lot4a-imputations.test.ts |
| IMP-23 | GET semaine invalide (absente, pas un lundi, 1999, 2100, texte) : 400 | §7 4a (2) | 4a | lot4a-imputations.test.ts |
| IMP-24 | DELETE d'une assignation à réel imputé : 409, base inchangée | §3, D-118 (11) | 4a | lot4a-imputations.test.ts |
| IMP-25 | Copie de projet : assignation copiée à réel 0, reste 5 ; aucune imputation copiée | §11.2, D-118 (11) | 4a | lot4a-imputations.test.ts |
| FDT-1 | Soumettre : brouillon → soumise, GET le montre | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-2 | Soumettre sans imputation > 0 (feuille existante vidée) : 422 `feuille_vide`, base inchangée | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-3 | (révisé en FDT-3-r1, D-181, D-182) Soumettre : 401 ; 404 feuille inconnue, id mal formé, Bob ; 403 chef et administrateur ; base inchangée | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-3-r1 | Révision de FDT-3 (D-031, D-181 (7), D-182 (2)) : soumettre : 401 ; 404 feuille inconnue, id mal formé, Bob ; 403 chef ; base inchangée ; le cas « administrateur 403 » est retiré, couvert par AUT-I | §7 4a (7), D-181 (4) | AUT-I | lot4a-feuilles.test.ts |
| FDT-4 | Soumettre une feuille soumise ou validée : 422 `statut_invalide` | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-5 | Rappeler : soumise → brouillon, PUT de nouveau permis | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-6 | Rappeler : brouillon 422 `statut_invalide` ; chef 403 ; après validation de P : 422 `deja_validee` | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-7 | Valider par projet : chef de P → validation (P, chef, 13/01), encore soumise ; chef de Q → validée, deux validations | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-8 | Projets concernés = imputation > 0 : ligne de Q sans imputation ; chef de P seul → validée | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-9 | Administrateur : validée, une validation par projet concerné à son nom | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-10 | Valider : brouillon 422 `statut_invalide` ; Alice 403 ; Bob 404 ; validée 422 `statut_invalide` ; base inchangée | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-11 | Rejeter (après validation de Q) : rejetée, commentaire sans espaces de bord, validations effacées ; PUT permis ; soumettre → soumise, commentaire null | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-12 | Rejeter par l'administrateur, commentaire de 500 caractères | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-13 | Rejeter : commentaire absent, vide, blanc, 501 caractères, nombre, clé inconnue → 400, base inchangée | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-14 | Rejeter : brouillon et validée 422 `statut_invalide` ; Alice 403 ; Bob 404 ; base inchangée | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| FDT-15 | Feuille rejetée puis PUT : reste rejetée, commentaire gardé | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
| VAL-1 | Chef de P : Bob puis Alice (tri par nom), brouillons compris ; projets d'Alice « proj-a » puis « PROJ-B » (sans casse), `peut_valider` sur P seul, `valide` faux | §7 4a (8) | 4a | lot4a-validations.test.ts |
| VAL-2 | Chef de Q : la feuille d'Alice seule | §7 4a (8) | 4a | lot4a-validations.test.ts |
| VAL-3 | Administrateur : toutes, `peut_valider` partout ; Alice, Bob, chef sans projet concerné : [] | §7 4a (8) | 4a | lot4a-validations.test.ts |
| VAL-4 | Après soumission et validation de P : statut soumise, P `valide`, Q non | §7 4a (8) | 4a | lot4a-validations.test.ts |
| VAL-5 | Semaine sans feuille : [] ; puis feuille d'Alice sur P seul | §7 4a (8) | 4a | lot4a-validations.test.ts |
| VAL-6 | 401 ; semaine invalide 400 ; base inchangée | §7 4a (2), (8) | 4a | lot4a-validations.test.ts |
| CALR-1 | PROJ-14 par la feuille : 0,5 j le 06/01, 1 j le 11/01, 0,5 j le 12/01 ; A du 04/01 (réel avant D0) au 12/01 | §5.7 PROJ-14, §5.4, §7 4a (9) | 4a | lot4a-calcul.test.ts |
| CALR-2 | Réel 1 j le jour D0 (04/01) sur B : A (ASAP 2 j) posée les 05 et 06/01 ; B sans travail planifié, dates 04/01 | §4, §5.4, §7 4a (9) | 4a | lot4a-calcul.test.ts |
| CALR-3 | Réel 1 j le 04/01 sur un projet non calculé (Q) : A de P les 05 et 06/01 ; Q inchangé | §4, §5.1, §7 4a (9) | 4a | lot4a-calcul.test.ts |
| CALR-4 | Activité close, réel les 04 et 06/01, D0 11/01 : aucun travail posé, dates 04/01 au 06/01 | §5.1, §7 4a (9) | 4a | lot4a-calcul.test.ts |
| CALR-5 | CALR-2 avec la feuille validée : même résultat | §7 4a (9) | 4a | lot4a-calcul.test.ts |
| CALR-6 | Gantt après 2 j imputés sur 4 : charge_reelle 2, reste 2, avancement 50 | §6 Lecture, §7 4a (9) | 4a | lot4a-calcul.test.ts |

E2E de parcours complet : non étendu en 4a (aucun écran) ; étendu en 4b et 4c.

### Couverture des champs, lot 4a (règle « Couverture des champs »)

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| PUT /api/feuilles `lignes[].imputations[]` (jour, charge) | hors écran en 4a ; écran Feuille de temps en 4b | IMP-2 à IMP-21 |
| PUT /api/feuilles `lignes[].reste` | hors écran en 4a ; écran Feuille de temps en 4b | IMP-6, IMP-19 |
| POST /api/feuilles/:id/soumettre, /rappeler | hors écran en 4a ; écran Feuille de temps en 4b | FDT-1 à FDT-6 |
| POST /api/feuilles/:id/valider | hors écran en 4a ; écran Validation en 4c | FDT-7 à FDT-10 |
| POST /api/feuilles/:id/rejeter `commentaire` | hors écran en 4a ; écran Validation en 4c | FDT-11 à FDT-15 |

### Compléments du lot 4a (D-119)

Rouges attendus : IMP-26 à IMP-30 et FDT-16. Fichiers : lot4a-complements.test.ts (nouveau, aide lot4a-helpers.ts).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| IMP-26 | `jour_futur` : charge 0 sur le 14/01 (futur) acceptée, aucune imputation écrite, feuille non créée ; charge > 0 le même jour : 422 `jour_futur`, base inchangée | §7 4a (10a), D-119 (2) | 4a | lot4a-complements.test.ts |
| IMP-27 | Ligne fermée (activité close, 1 j imputé le 11/01, reste 4) : `reste` 3 envoyé avec charges inchangées → 422 `ligne_fermee`, base inchangée ; `reste` 4 (égal) avec charges inchangées → 200 | §7 4a (10b), D-119 (3) | 4a | lot4a-complements.test.ts |
| IMP-28 | `ressource_id` : inconnu (999999), mal formé (abc), hors plage entier (99999999999) : 404 en GET, y compris pour l'administrateur ; base inchangée | §7 4a (10c), D-119 (4) | 4a | lot4a-complements.test.ts |
| IMP-29 | Feuille absente : PUT `{ lignes: [] }`, charges 0 seules, `reste` égal au reste actuel : 200, `feuille.id` null, aucune ligne en `feuille_temps`, base inchangée ; un `reste` différent crée la feuille | §7 4a (10e), D-119 (6) | 4a | lot4a-complements.test.ts |
| IMP-30 | Feuille d'autrui filtrée : le chef de P voit `jours[].total` (1) et `depassement` (faux) sur les lignes de P seules, alors que le total d'Alice vaut 1,5 (dépassement) pour l'administrateur et pour Alice | §7 4a (10f), D-119 (7) | 4a | lot4a-complements.test.ts |
| FDT-16 | Valider : le chef de Q voit la feuille d'Alice (ligne de Q sans imputation, donc Q non concerné) mais n'écrit sur aucun projet concerné (P seul) : 403, base inchangée | §7 4a (10d), D-119 (5) | 4a | lot4a-complements.test.ts |

## Tests du lot 4b, écran Feuille de temps (D-120)

### Correctif de 4a (D-120 (1))

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| FDT-17 | Rappeler une feuille validée (toutes validations faites) : 422 `deja_validee`, base inchangée ; rappeler une feuille rejetée : 422 `statut_invalide`, base inchangée | §7 4a (7), D-120 (1) | 4b | lot4b-rappeler.test.ts |

### Fonctions pures de l'écran (D-120 (4) à (10))

Rouges attendus : FTE-1 à FTE-19 (module absent). Fichier : packages/web/test/imputations.test.ts (nouveau) ; module à créer : `packages/web/src/imputations/logique.ts`. Préfixe FTE neuf (vérifié libre dans docs, SPEC, packages et e2e).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| FTE-1 | `lundiDe` : lundi de la semaine ISO (mercredi, dimanche, changement d'année : 01/01/2027 → 28/12/2026) | §7 4b (1), D-120 (4) | 4b | imputations.test.ts |
| FTE-2 | `semaineAffichee` : lundi valide gardé ; absente, vide, mardi, « abc », 30/02, « 2027-1-11 », 1999-12-27, 2100-01-04 → lundi courant, `corrigee` vrai | §7 4b (1), §7 4a (2) | 4b | imputations.test.ts |
| FTE-3 | `decalerSemaine` ±1, changement d'année | §7 4b (2) | 4b | imputations.test.ts |
| FTE-4 | `joursSemaine` : sept jours, changement de mois | §7 4b (3) | 4b | imputations.test.ts |
| FTE-5 | `libelleSemaine` : « Semaine du 11/01/2027 au 17/01/2027 », à cheval sur deux années | §7 4b (2) | 4b | imputations.test.ts |
| FTE-6 | `libelleJour` : « lun. 11/01 » … « dim. 17/01 » | §7 4b (3) | 4b | imputations.test.ts |
| FTE-7 | `aujourdhuiLocal` : date locale AAAA-MM-JJ (23 h 30 et 0 h 05) | §7 4b (1), (3) | 4b | imputations.test.ts |
| FTE-8 | `formaterJours` : virgule décimale | §7 4b (3) | 4b | imputations.test.ts |
| FTE-9 | `analyserCharge` valide : vide et espaces = 0, virgule ou point, 0 à 10, « 0,50 » | §7 4b (4) | 4b | imputations.test.ts |
| FTE-10 | `analyserCharge` invalide (« abc », négatif, 3 décimales, > 10, « 1,2,3 », « 1e1 », « 0x1 », « ,5 ») : message `CHARGE_INVALIDE` | §7 4b (4) | 4b | imputations.test.ts |
| FTE-11 | `analyserReste` : ≥ 0, 2 décimales, sans borne haute ; invalide : `RESTE_INVALIDE` | §7 4b (4) | 4b | imputations.test.ts |
| FTE-12 | `saisieInitiale` : charges formatées, vide sans imputation, reste formaté | §7 4b (3) | 4b | imputations.test.ts |
| FTE-13 | `saisieValide` : faux dès qu'une charge ou un reste est invalide | §7 4b (4) | 4b | imputations.test.ts |
| FTE-14 | `totauxJours` : somme au centième (0,1 + 0,2 = 0,3), lignes non modifiables comprises, invalide = 0, dépassement si total > capacité (capacité 0 comprise) | §7 4b (5) | 4b | imputations.test.ts |
| FTE-15 | `lignesModifiees` : rien de modifié, ou même valeur autrement écrite → [] | §7 4b (6) | 4b | imputations.test.ts |
| FTE-16 | `lignesModifiees` : charge modifiée → la ligne seule, imputations > 0 triées, sans reste | §7 4b (4), (6) | 4b | imputations.test.ts |
| FTE-17 | `lignesModifiees` : reste modifié → envoyé ; tout effacé → imputations [] ; ligne non modifiable jamais envoyée | §7 4b (4), (6) | 4b | imputations.test.ts |
| FTE-18 | `libelleStatut` : Brouillon, Soumise, Validée, Rejetée | §7 4b (2) | 4b | imputations.test.ts |
| FTE-19 | `messageRefusFeuille` : textes de D-120 (9), (10) ; autre cas : « Action impossible pour le moment. Réessayez. » | §7 4b (6), (7) | 4b | imputations.test.ts |

### E2E du lot 4b (D-120)

Rouges attendus : E2E-221 à E2E-244 (écran absent). Fichiers : e2e/tests/lot4b.spec.ts et lot4b-helpers.ts (nouveaux). Horloge du navigateur : mercredi 14/01/2026 (E2E-242 : 07/01/2099) ; date du serveur réelle, postérieure. Données par l'API sauf E2E-244. Base remise à zéro feuilles comprises (`remettreAdminSeul4b`).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-221 | Lien « Imputations » absent pour l'administrateur non ressource, présent pour la ressource ; clic : titre « Feuille de temps », adresse `?semaine=2026-01-12`, lien `aria-current`, « Semaine du 12/01/2026 au 18/01/2026 », statut « Brouillon » | §7 4b (1), (2) | 4b | lot4b.spec.ts |
| E2E-222 | Adresse absente, mardi, « abc », 1999-12-27, 2100-01-04 → `?semaine=2026-01-12` sans rechargement (un seul `load` par `goto`) ; lundi valide gardé | §7 4b (1) | 4b | lot4b.spec.ts |
| E2E-223 | En-têtes (Projet, Activité, Assigné, Réel cumulé, sept jours, Reste à faire) ; tri P4B puis Q4B ; « 1 Tâche A », assigné 5, réel 0,5, case 0,5, reste 4,5 ; boutons Semaine suivante, précédente, Cette semaine | §7 4b (2), (3) | 4b | lot4b.spec.ts |
| E2E-224 | « Enregistrer » désactivé sans modification ; saisie 1 et « 0.5 » : un PUT, la ligne de A seule, sans reste ; « Feuille enregistrée. » ; réel 1,5, reste 3,5 relus ; base relue | §7 4b (4), (6) | 4b | lot4b.spec.ts |
| E2E-225 | Reste de B à « 2,25 » : PUT `{ assignation B, imputations [], reste 2.25 }` ; base : reste B 2,25, A 5 | §7 4b (4), (6) | 4b | lot4b.spec.ts |
| E2E-226 | « abc », « -1 », « 0,123 », « 11 » : `aria-invalid`, description `CHARGE_INVALIDE`, « Enregistrer » désactivé ; reste « x » : `RESTE_INVALIDE` ; vide = 0 efface l'imputation (base) | §7 4b (4) | 4b | lot4b.spec.ts |
| E2E-227 | Ligne « Total » : 0, puis 0,75, puis 1,25 avec « Dépassement » pendant la saisie ; enregistrement accepté (non bloquant) ; base | §7 4b (5) | 4b | lot4b.spec.ts |
| E2E-228 | Semaine du 05/01 : samedi et dimanche `data-capacite-nulle`, case du samedi active, 0,5 saisi : dépassement, enregistré (base) | §7 4b (3), (5) | 4b | lot4b.spec.ts |
| E2E-229 | Navigateur au mercredi 14/01 : cases du jeudi au dimanche désactivées, lundi à mercredi et reste actifs | §7 4b (3) | 4b | lot4b.spec.ts |
| E2E-230 | Activité A close après imputation : cases et reste de A désactivés, valeur 0,5 affichée ; B actif | §7 4b (3) | 4b | lot4b.spec.ts |
| E2E-231 | Feuille soumise : « Soumise », cases désactivées, ni « Enregistrer » ni « Soumettre », « Rappeler » ; validée : « Validée », sans aucun des trois | §7 4b (3), (7) | 4b | lot4b.spec.ts |
| E2E-232 | Ressource sans assignation : « Aucune activité à imputer cette semaine. », pas de tableau | §7 4b (3) | 4b | lot4b.spec.ts |
| E2E-233 | Feuille rejetée : alerte « Feuille rejetée : Charge du mardi à revoir », « Rejetée », cases actives, « Soumettre » actif | §7 4b (2), (7) | 4b | lot4b.spec.ts |
| E2E-234 | « Soumettre » désactivé avec une modification non enregistrée ; après « Enregistrer », soumis : « Soumise », lecture seule, « Rappeler » ; base soumise | §7 4b (7) | 4b | lot4b.spec.ts |
| E2E-235 | « Soumettre » sans imputation : feuille absente → texte, aucun envoi, aucune feuille créée ; feuille sans charge (reste modifié) → 422 `feuille_vide`, texte, base brouillon | §7 4b (7) | 4b | lot4b.spec.ts |
| E2E-236 | « Rappeler » une feuille soumise : « Brouillon », cases actives, « Soumettre » ; base brouillon | §7 4b (7) | 4b | lot4b.spec.ts |
| E2E-237 | « Rappeler » après validation de P par son chef (API) : « La feuille est déjà validée en partie. » ; base soumise, une validation | §7 4b (7), (10) | 4b | lot4b.spec.ts |
| E2E-238 | Assignation de B supprimée après le chargement : « Cette ligne n’est plus disponible. », saisies gardées, base inchangée (aucune feuille) | §7 4b (6) | 4b | lot4b.spec.ts |
| E2E-239 | Activité A close après le chargement : texte `ligne_fermee`, saisie gardée, base inchangée (révisé : E2E-239-r1) | §7 4b (6) | 4b | lot4b.spec.ts |
| E2E-240 | Feuille soumise (API) après le chargement : texte `feuille_verrouillee`, saisie gardée, base inchangée | §7 4b (6) | 4b | lot4b.spec.ts |
| E2E-241 | PUT altéré en route (charge 11) : 400 réel, « Données invalides. », saisie gardée, base inchangée | §7 4b (6) | 4b | lot4b.spec.ts |
| E2E-242 | Navigateur au 07/01/2099 : semaine du 05/01/2099, saisie du lundi refusée par le serveur, « Impossible d’imputer un jour futur. », saisie gardée, base inchangée | §7 4b (6) | 4b | lot4b.spec.ts |
| E2E-243 | Modification puis « Semaine suivante » : confirmation « Abandonner les modifications ? » ; « Annuler » : même semaine, saisie gardée ; « Semaine précédente », « Abandonner » : semaine du 05/01 ; « Cette semaine » aussi confirmée ; aucun envoi, aucune feuille | §7 4b (8) | 4b | lot4b.spec.ts |
| E2E-244 | (révisé en E2E-244-r1, D-136) Parcours complet à l'écran (administrateur seul) : calendrier, ressource, projet, affectation, activité, assignation de 2 j ; la ressource se connecte, menu « Imputations », 0,5 le lundi, « Enregistrer », reste 1,5, « Soumettre » ; administrateur : Gantt du projet, avancement « 25 % » ; charge réelle 0,5 lue par l'API (non affichée par le Gantt) | §7 4b (9), CLAUDE.md « Parcours IHM » | 4b | lot4b.spec.ts |

### Couverture des champs, lot 4b (règle « Couverture des champs »)

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| PUT /api/feuilles `lignes[].imputations[]` (jour, charge) | cases de charge de la Feuille de temps (« <activité>, <jour> ») | E2E-224, E2E-226 à E2E-228, E2E-244 |
| PUT /api/feuilles `lignes[].reste` | case « <activité>, reste à faire » | E2E-225, E2E-226 |
| POST /api/feuilles/:id/soumettre | bouton « Soumettre » | E2E-234, E2E-235, E2E-244 |
| POST /api/feuilles/:id/rappeler | bouton « Rappeler » | E2E-236, E2E-237 |
| POST /api/feuilles/:id/valider | 4c | — |
| POST /api/feuilles/:id/rejeter `commentaire` | 4c (le commentaire est affiché en 4b : E2E-233) | — |

### Révision du lot 4b (D-122)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-239-r1 | Activité A close après le chargement : texte `ligne_fermee`, saisie gardée ; base inchangée prouvée par `feuille.id` null et l'absence de la ligne « Tâche A » dans `lignes` (activité close sans imputation = plus une ligne, D-118 (3)) | §7 4b (6), D-122 | 4b | lot4b.spec.ts |

### Captures du lot 4b (relecture d'apparence)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-245 | Captures sans assertion fonctionnelle (ne compte pas comme test de comportement, comme E2E-209) : écran Feuille de temps brouillon, dépassement, valeurs invalides, soumise, rejetée ; 1440 et 1024 px, e2e/captures/feuille-temps-{brouillon,soumise,rejetee,depassement,invalide}-{1440,1024}.png | D-120 (13) | 4b | e2e/tests/lot4b-captures.spec.ts |

## Tests de REX-3a, séance UX de fin de lot 3 (D-123)

API : packages/api/test/rex3a-saisies.test.ts (nouveau). Web : packages/web/test/rex3a.test.ts (nouveau). E2E : e2e/tests/rex3a.spec.ts (nouveau) et e2e/tests/rex3a-helpers.ts. Valeurs attendues : D-123 et SPEC §5.6 MAN (règle de saisie), « Écran Planning manuel » (jours non ouvrés), §6 Affichage (17, 18), §6 Édition (15). Janvier 2027 : le 04/01 est un lundi, samedis 2, 9, 16, 23, 30.

Signatures attendues, à créer en phase verte :
- `packages/web/src/modes.ts` : `MODES_PLANIFICATION: readonly { code: string; libelle: string; aide: string }[]` (ordre ASAP, START, STARR, ALAP, FDUR, DDUR, REGUL, MAN), `libelleMode(code)` (code inconnu → le code), `aideMode(code)` (code inconnu → ''). `gantt/libelles.ts` continue d'exporter `libelleMode` (même fonction).
- `packages/web/src/screens/projet/deplacement.ts` : `messagePosition(nom, wbs)` → « <nom> est maintenant en position <wbs>. » ; `wbsDe(lignes: { id: number; wbs: string }[], id: number): string | null`.
- `packages/web/src/screens/planning-manuel-jours.ts` : `caseDesactivee({ lectureSeule, nonOuvre, cochee }): boolean`.
- API : `GET /api/activites/:id/jours-non-ouvres?mois=AAAA-MM` ; refus 422 `jour_non_ouvre` du PUT des saisies (corps `{ erreur, code, assignation_id, jour }`).

Rouges attendus : SAI-17 à SAI-20, SAI-22 à SAI-24, SAI-26 (règle et route absentes) ; MODL-1, MODL-2, POS-1, PMJ-1 (modules absents) ; GEO-8-r1, DEMO-1-r1, E2E-43-r4, E2E-179-r2, E2E-191-r2 (libellés, nom de sous-projet, jeu de démonstration) ; E2E-246 à E2E-254. Verts dès l'écriture : SAI-21 (témoin positif : jours ouvrés), SAI-25 (retrait d'une saisie ancienne), TRAV-1-r1 et E2E-210-r1 à E2E-213-r1 (saisie ancienne insérée en base, verts avant et après).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| SAI-17 | Saisie nouvelle un samedi ou un dimanche : 422 `{ erreur, code 'jour_non_ouvre', assignation_id, jour }` ; base strictement inchangée (empreinte, aucune saisie) | 5.6 MAN (règle de saisie), D-123 (8) | REX-3a | packages/api/test/rex3a-saisies.test.ts |
| SAI-18 | Saisie nouvelle un jour férié du calendrier de la ressource (mercredi 06/01) : 422 `jour_non_ouvre` ; base inchangée | 5.6 MAN, D-123 (8) | REX-3a | packages/api/test/rex3a-saisies.test.ts |
| SAI-19 | Calendrier propre à la ressource : Alice (lundi à samedi, férié le 05/01) refusée le 05/01 et acceptée le samedi ; Bob (calendrier par défaut) refusé le samedi et accepté le 05/01 ; base inchangée après chaque refus | 5.6 MAN, D-123 (8) | REX-3a | packages/api/test/rex3a-saisies.test.ts |
| SAI-20 | Saisie existante sur un samedi (insertion directe) : PUT à l'identique 200 et saisies conservées ; demi-journée nouvelle le même samedi 422, base inchangée ; férié ajouté après coup sur un jour déjà saisi : PUT à l'identique 200 | 5.6 MAN, D-123 (8) | REX-3a | packages/api/test/rex3a-saisies.test.ts |
| SAI-21 | Jours ouvrés (lundi à vendredi) : 200, saisies écrites (témoin positif, vert dès l'écriture) | 5.6 MAN, D-123 (8) | REX-3a | packages/api/test/rex3a-saisies.test.ts |
| SAI-22 | Un seul jour non ouvré dans le PUT refuse tout : les saisies ouvrées du même corps ne sont pas écrites, celles déjà en base sont conservées | 5.6 MAN, D-123 (8) | REX-3a | packages/api/test/rex3a-saisies.test.ts |
| SAI-23 | `GET /api/activites/:id/jours-non-ouvres?mois=2027-01` : 200 `{ mois, jours_non_ouvres }`, une entrée par assignation triée par id ; calendrier par défaut (week-ends, fériés du mois seulement) et calendrier propre ; activité sans assignation : liste vide ; base inchangée | 5.6 MAN, D-123 (8) | REX-3a | packages/api/test/rex3a-saisies.test.ts |
| SAI-24 | Même route, droits et refus comme GET …/saisies : administrateur, chef, ressource affectée 200 ; sans session 401 ; activité inconnue, chef d'un autre projet, ressource non affectée 404 ; mois absent ou invalide 400 ; activité ASAP (non MAN) : 200 `{ mois, jours_non_ouvres }` (D-124 (3)) ; base inchangée | 5.6 MAN, D-123 (8), D-124 (3) | REX-3a | packages/api/test/rex3a-saisies.test.ts |
| MODL-1 | Table `MODES_PLANIFICATION` : huit entrées dans l'ordre ASAP, START, STARR, ALAP, FDUR, DDUR, REGUL, MAN, libellés et aides exactement ceux de D-123 (5) | 6 Affichage (17), D-123 (5) | REX-3a | packages/web/test/rex3a.test.ts |
| MODL-2 | `libelleMode` et `aideMode` lisent la table (code inconnu : le code, puis '') ; `gantt/libelles.ts` exporte la même `libelleMode` | 6 Affichage (17), D-123 (5) | REX-3a | packages/web/test/rex3a.test.ts |
| POS-1 | `messagePosition('Charlie', '2')` → « Charlie est maintenant en position 2. » ; `wbsDe` lit le WBS de la ligne (sous-niveau « 1.2 » compris), null si la ligne manque | 6 Édition (15), D-123 (2) | REX-3a | packages/web/test/rex3a.test.ts |
| PMJ-1 | `caseDesactivee` : lecture seule → désactivée ; jour non ouvré non coché → désactivée ; jour non ouvré coché → activable ; jour ouvré → activable | Écran Planning manuel (jours non ouvrés), D-123 (8) | REX-3a | packages/web/test/rex3a.test.ts |
| E2E-246 | Grille MAN, par l'écran : case du samedi désactivée, case d'un jour férié désactivée (`aria-disabled="true"` et pas d'attribut `disabled`, D-124 (1)), case d'un jour ouvré activable ; saisie ancienne (insérée en base) du samedi cochée et activable ; la décocher puis « Enregistrer » : plus de saisie le samedi en base (GET), mercredi saisi conservé | Écran Planning manuel, D-123 (8) | REX-3a | e2e/tests/rex3a.spec.ts |
| E2E-247 | Onglet Planning, Monter : le focus reste sur « Monter <nom> », la ligne déplacée porte `data-deplacee` (2 s puis disparaît), la zone `role="status"` annonce « <nom> est maintenant en position <wbs>. » ; Descendre idem ; arrivée en première position : le focus passe à « Descendre <nom> » (Monter désactivé) ; ordre en base (GET planning) | 6 Édition (15), D-123 (2) | REX-3a | e2e/tests/rex3a.spec.ts |
| E2E-248 | Onglet Planning : « Assigner une ressource à <nom> » à la fin de la colonne Ressources (après les ressources déjà assignées), absent de la colonne Actions ; le dialogue s'ouvre et l'assignation créée apparaît dans la colonne ; pas de bouton sur un parent ni un jalon | 6 Édition (15), D-123 (3) | REX-3a | e2e/tests/rex3a.spec.ts |
| E2E-249 | Onglet Planning : le nom d'une activité et d'un jalon est un bouton qui ouvre le dialogue de modification (champ « Nom » prérempli) ; renommer par l'écran puis effet dans l'onglet Gantt ; ressource affectée (lecture seule) : texte simple, aucun bouton | 6 Édition (15), D-123 (4) | REX-3a | e2e/tests/rex3a.spec.ts |
| E2E-250 | Onglet Planning : ordre des boutons de la colonne Actions : activité MAN feuille « Modifier, Planning manuel, Monter, Descendre, Déplacer, Ajouter une sous-activité, Supprimer » ; jalon « Modifier, Monter, Descendre, Déplacer, Supprimer » ; noms accessibles inchangés | 6 Édition (15), D-123 (4) | REX-3a | e2e/tests/rex3a.spec.ts |
| E2E-251 | Dialogue de modification d'une activité : champ « Mode de planification », huit options (valeur = code, texte = libellé) ; aide sous la liste en description accessible, qui change avec le mode choisi ; enregistrement par l'écran : code relu dans l'API | 6 Affichage (17), D-123 (5) | REX-3a | e2e/tests/rex3a.spec.ts |
| E2E-252 | Gantt du projet : en-tête « Planification » (plus « Mode »), libellé de chacun des huit modes dans sa ligne ; ligne de sous-projet : badge « Sous-projet », nom « <code> · <nom> » en lien vers la fiche | 6 Affichage (17, 18), D-123 (5), (7) | REX-3a | e2e/tests/rex3a.spec.ts |
| E2E-253 | Grille MAN, PUT refusé en 422 `jour_non_ouvre` (réponse interceptée) : notification « Ce jour n'est pas ouvré pour la ressource. », modifications conservées dans la grille, base inchangée | Écran Planning manuel, D-123 (8) | REX-3a | e2e/tests/rex3a.spec.ts |

| SAI-25 | Saisie ancienne d'un samedi (insérée en base) absente du PUT : 200, retirée de la base ; les autres saisies conservées (vert dès l'écriture : le retrait n'est pas une saisie nouvelle) | 5.6 MAN (règle de saisie), D-123 (8), D-124 | REX-3a | packages/api/test/rex3a-saisies.test.ts |
| SAI-26 | Ordre des refus : activité MAN close + samedi → refus de SAI-9 (sans code `jour_non_ouvre`) ; assignation d'une autre activité + samedi → refus de SAI-9 ou SAI-14 (422 sans code) ; deux jours non ouvrés sur deux assignations → `jour_non_ouvre` avec la première (assignation, jour) ; base inchangée après chaque refus | 5.6 MAN, D-124 (2) | REX-3a | packages/api/test/rex3a-saisies.test.ts |
| E2E-254 | Clavier, grille MAN : Tab entre dans la grille (case courante : jour 1, matin) ; → → atteint le samedi 02 matin (focus, `aria-disabled="true"`) ; Espace puis clic : toujours décochée, aucune modification en attente (Enregistrer et Annuler inactifs, comme à l'ouverture) ; Fin atteint la dernière case de la ligne (dimanche 31 après-midi) ; aucune saisie en base | Écran Planning manuel (jours non ouvrés), D-124 (1) | REX-3a | e2e/tests/rex3a.spec.ts |
| E2E-255 | Captures sans assertion fonctionnelle, ne compte pas comme test de comportement (comme E2E-209 et E2E-245) : onglet Planning (nom-bouton, colonne Ressources avec le bouton d'affectation, ordre des actions, ligne `data-deplacee` surlignée), dialogue de modification (liste « Mode de planification » et aide), Gantt du projet (colonne Planification, badge « Sous-projet », « <code> · <nom> »), Planning manuel (jours non ouvrés grisés, saisie ancienne du samedi cochée) ; 1440 et 1024 px, e2e/captures/rex3a-{planning,dialogue,gantt,manuel}-{1440,1024}.png | D-123 (2) à (5), (7), (8) | REX-3a | e2e/tests/rex3a-captures.spec.ts |

### Révisions D-031 de REX-3a (décisions du porteur, D-123)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GEO-8-r1 | GEO-8 avec la table de D-123 (5) : START « Pas avant une date », STARR « Démarrage imposé », ALAP « Fin visée », DDUR « Durée imposée », REGUL « Régulier entre deux dates » ; ASAP, FDUR, MAN et les quatre drapeaux inchangés | 6 Affichage (17), D-123 (5) | REX-3a | packages/web/test/gantt.test.ts |
| TRAV-1-r1 | TRAV-1 avec la saisie du samedi 09/01 insérée directement en base (saisie ancienne, D-123 (8)) au lieu du PUT ; mêmes valeurs attendues | 6 Lecture (Travail par jour), 5.6 (MAN-5), D-123 (8) | REX-3a | packages/api/test/lot3g-travail.test.ts |
| E2E-210-r1 | E2E-210 avec les saisies du samedi 09/01 insérées directement en base ; mêmes valeurs attendues | 6 (jours rouges), D-123 (8) | REX-3a | e2e/tests/lot3g.spec.ts |
| E2E-211-r1, E2E-212-r1, E2E-213-r1 | E2E-211, E2E-212 et E2E-213 inchangés, leur monde commun (`mondeSurcharge`) insérant la saisie du samedi en base comme E2E-210-r1 ; un seul commit, le monde est partagé | 6 (jours rouges), D-123 (8) | REX-3a | e2e/tests/lot3g.spec.ts |
| DEMO-1-r1 | DEMO-1 : la surcharge MAN du jeu de démonstration vient de deux activités MAN d'Alice avec saisies le même jour ouvré ; aucune saisie un samedi ou un dimanche ; le reste inchangé ; `surcharge` dans les drapeaux d'au moins une activité MAN d'Alice parmi celles qui partagent un jour (D-124) | D-117 (4), D-123 (8) | REX-3a | packages/api/test/demo.test.ts |
| E2E-216-r1 | E2E-216 : la partie « Espace puis Annuler » coche le lundi 04 matin (6 flèches depuis le 1er matin) au lieu du samedi 02, jour non ouvré où Espace est sans effet (D-124 (1)) ; intention et autres assertions inchangées | 5.6 MAN (jours non ouvrés), D-125 | REX-3a | e2e/tests/lot3g.spec.ts |
| E2E-43-r4 | E2E-43-r3 avec le nom du lien du sous-projet « <code> · <nom> » (D-123 (7)) ; ordre de tabulation inchangé | 6 Affichage (18), D-123 (7) | REX-3a | e2e/tests/lot3b-focus.spec.ts |
| E2E-179-r2 | E2E-179-r1 avec le nom du lien du sous-projet « <code> · <nom> » ; reste inchangé | 6 Affichage (18), D-123 (7) | REX-3a | e2e/tests/lot3e.spec.ts |
| E2E-191-r2 | E2E-191-r1 avec le nom du lien du sous-projet « <code> · <nom> » ; reste inchangé | 6 Affichage (18), D-123 (7) | REX-3a | e2e/tests/lot3f1.spec.ts |

Aides de lecture, sans test renommé : l'assistant `ordre` de lot3f1.spec.ts et de lot3f2.spec.ts (ordre des lignes du tableau du Gantt) ramène la ligne d'un sous-projet à « — <nom> » en retirant le préfixe « <code> · » ; aucune assertion de test n'est modifiée, les tests restent verts avant et après D-123 (7). De même l'assistant `ligneDe` des deux fichiers (D-126) : ligne trouvée par son nom exact ou par « <code> · <nom> » (expression ancrée, nom échappé) ; E2E-185, E2E-186 et E2E-194-r1 concernés, sans révision ni tag.

### Couverture des champs, REX-3a (règle « Couverture des champs »)

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| PUT /api/activites/:id/saisies `saisies` (nouveau refus `jour_non_ouvre`) | cases de la grille du Planning manuel (désactivées sur un jour non ouvré, activables si cochées) ; notification du refus | E2E-246, E2E-253, SAI-17 à SAI-22 |
| GET /api/activites/:id/jours-non-ouvres (lecture seule : aucun champ modifiable) | état désactivé des cases de la grille | E2E-246, SAI-23, SAI-24 |
| PATCH /api/activites/:id `mode` | liste « Mode de planification » du dialogue de modification (libellés, aide) | E2E-251 |
| PATCH /api/activites/:id `nom`, PATCH /api/jalons/:id `nom` | dialogue ouvert depuis le nom (bouton) de l'onglet Planning | E2E-249 |
| POST /api/elements/:id/deplacer `rang` | boutons Monter et Descendre : focus, `data-deplacee`, annonce | E2E-247 |
| POST /api/activites/:id/assignations | bouton d'affectation déplacé dans la colonne Ressources | E2E-248 |

### Clôture de REX-3a (arbitrage de la relecture, D-127)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-256 | Grille MAN : `GET …/jours-non-ouvres` intercepté en 500 (`GET …/saisies` réel) : notification « Impossible de charger les saisies. » et bouton « Réessayer », comme l'échec de `GET …/saisies` ; aucune case de la grille affichée | Écran Planning manuel, D-127 (1) | REX-3a | e2e/tests/rex3a.spec.ts |

## Tests de REX-3b, annulation et modification depuis l'Accueil et le Gantt (D-127)

### Fonctions pures (`packages/web/src/gantt/annulation.ts`)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| ANL-1 | Pile : `vider()` donne une pile vide ; `empiler` ajoute en fin sans modifier la pile reçue ; `depiler` rend le dernier empilé et la pile sans lui ; pile vide : `{ inverse: null }`, pile vide | 6 Édition (17), D-127 (3) | REX-3b | packages/web/test/rex3b.test.ts |
| ANL-2 | Borne : `TAILLE_PILE` = 20 ; 21 empilements : 20 entrées, la plus ancienne chassée, l'ordre des autres gardé ; 20 dépilements puis pile vide | 6 Édition (17), D-127 (3) | REX-3b | packages/web/test/rex3b.test.ts |
| ANL-3 | `inverseBarre` puis `requeteInverse` : PATCH /api/activites/:id, mêmes clés que le corps du geste, valeurs d'avant : START `{ debut_valide }` ; ALAP `{ fin_valide }` ; FDUR poignée droite `{ duree_validee }` ; REGUL corps `{ debut_valide, fin_valide }` ; valeur d'avant null ou absente → null | 6 Édition (17), D-127 (5) | REX-3b | packages/web/test/rex3b.test.ts |
| ANL-4 | `inverseLienCree(12)` → DELETE /api/dependances/12, sans corps | 6 Édition (17), D-127 (5) | REX-3b | packages/web/test/rex3b.test.ts |
| ANL-5 | `inverseLienSupprime(7, { id, predecesseur_id, successeur_id, type: 'DD', delai: 2, drapeaux })` → POST /api/projets/7/dependances `{ predecesseur_id, successeur_id, type: 'DD', delai: 2 }` (ni id ni drapeaux) | 6 Édition (17), D-127 (5) | REX-3b | packages/web/test/rex3b.test.ts |
| ANL-6 | `inverseLigne({ id, parent_id, rang })` → POST /api/elements/:id/deplacer `{ parent_id, rang }` ; parent null (racine) envoyé null | 6 Édition (17), D-127 (5) | REX-3b | packages/web/test/rex3b.test.ts |
| ANL-7 | `renumeroterLien(pile, 12, 30)` : l'inverse « supprimer le lien 12 » devient DELETE /api/dependances/30 ; les autres entrées et l'ordre inchangés ; pile reçue non modifiée | 6 Édition (17), D-127 (5) (nouvel id) | REX-3b | packages/web/test/rex3b.test.ts |
| ANL-8 | `inverseBarre(avant, corps, contour)` mémorise l'état du contour d'avant le geste dans l'entrée (`contour` : dates `{ debut, fin }` si la barre était déjà contournée, `null` sinon) ; `requeteInverse` ne l'envoie pas (même requête qu'ANL-3) ; l'entrée dépilée le restitue ; les inverses de lien et de ligne n'ont pas de contour | 6 Édition (17), D-129 (2) | REX-3b | packages/web/test/rex3b.test.ts |

### E2E, annulation (Gantt du projet)

Base « administrateur seul » remise à zéro, horloge figée au 06/01/2027, zoom jour, D0 2027-01-04, données par l'API sauf le geste et l'annulation (par l'écran). « Base revenue » = valeurs lues par l'API après l'annulation.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-257 | Barre START, corps glissé de 3 jours puis « Annuler » : une requête PATCH inverse `{ debut_valide: '2027-01-11' }`, début validé revenu en base, contour de la barre retiré, bandeau « Planning à recalculer » gardé, `role="status"` « Geste annulé. », bouton de nouveau désactivé | 6 Édition (17), D-127 (3) à (5) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-258 | Barre FDUR (début validé null, durée validée 5) : poignée droite puis « Annuler » : `duree_validee` 5 en base ; corps glissé puis « Annuler » : PATCH inverse `{ debut_valide: null }`, `debut_valide` null en base | 6 Édition (17), D-127 (5) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-259 | Barre REGUL, corps glissé puis « Annuler » : PATCH inverse avec les deux dates d'avant, `debut_valide` et `fin_valide` revenus en base ; barre ALAP, poignée droite puis « Annuler » : `fin_valide` revenu | 6 Édition (17), D-127 (5) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-260 | Lien créé par glisser du connecteur puis « Annuler » : DELETE de la dépendance créée, aucune dépendance en base, aucun lien dessiné | 6 Édition (17), D-127 (3), (5) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-261 | Lien FD délai 3 supprimé (clic sur le lien, « Supprimer », confirmation) puis « Annuler » : POST `{ predecesseur_id, successeur_id, type: 'FD', delai: 3 }` (type DD couvert par ANL-5 : le point de clic d'E2E-177 suppose un lien FD), une dépendance en base avec ces valeurs et un nouvel id, lien redessiné ; puis, après rechargement : suppression, création par glisser, suppression, deux annulations : la seconde supprime le lien recréé (nouvel id), aucune dépendance en base, aucune alerte | 6 Édition (17), D-127 (5) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-262 | Ligne « Tâche R » glissée dans « Phase P » puis « Annuler » : POST …/deplacer `{ parent_id: null, rang: 3 }`, parents et rangs de tous les éléments revenus en base, ordre affiché initial | 6 Édition (17), D-127 (3), (5) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-263 | Ligne déplacée par le bouton « Déplacer » de l'onglet Planning (clavier compris), puis onglet Gantt, « Annuler » actif, clic : parent et rang d'avant en base, ordre affiché initial | 6 Édition (17), D-127 (3) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-264 | (révisé en E2E-264-r1, D-142) Ctrl+Z (focus sur la zone du calendrier) annule un geste de barre comme le bouton (base revenue, « Geste annulé. ») ; Meta+Z (Cmd+Z) annule un second geste | 6 Édition (17), D-127 (4) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-265 | Ctrl+Z sans effet (aucune requête inverse, base inchangée, bouton toujours actif) : focus sur la case « Initiales » (input) ; dialogue « Modifier l'activité » ouvert ; pendant un glisser de barre (bouton appuyé) ; pendant un recalcul automatique (POST /api/calcul retenu) | 6 Édition (17), D-127 (4) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-266 | Bouton « Annuler » : nom accessible exact, `title` « Annuler (Ctrl+Z) », icône `lucide-undo-2`, dans la barre d'outils après « Copier » ; désactivé à l'ouverture (pile vide) ; ressource en lecture seule : présent et désactivé | 6 Édition (17), D-127 (4) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-267 | 21 gestes de barre (décalages de 1 à 21 jours) puis 20 annulations : 20 PATCH inverses, `debut_valide` en base = valeur après le 1er geste (12/01/2027), bouton désactivé ; Ctrl+Z ensuite : aucune requête | 6 Édition (17), D-127 (3) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-268 | (révisé en E2E-268-r1, D-142) Échec de l'inverse (réponse interceptée en 409, puis dans un second monde en 422) après deux gestes : `role="alert"` « Impossible d'annuler ce geste ; les annulations précédentes ne sont plus possibles. », bouton désactivé (pile vidée), valeur du second geste gardée en base | 6 Édition (17), D-127 (5) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-269 | Geste puis rechargement de la page : bouton désactivé, Ctrl+Z sans requête, valeur du geste gardée en base | 6 Édition (17), D-127 (5) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-270 | Recalcul automatique coché : geste (un calcul), puis « Annuler » : un second POST /api/calcul après la requête inverse, barre de nouveau aux dates d'avant le geste (nom accessible) | 6 Édition (17), D-127 (5) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-271 | Non empilés : création d'une activité par le menu contextuel, modification d'une activité par le dialogue (Entrée), modification d'un lien par son dialogue : bouton « Annuler » reste désactivé ; après un geste de barre puis ces actions, une annulation ne défait que le geste de barre | 6 Édition (17), D-127 (3) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-272 | (révisé en E2E-272-r1, D-142) Une annulation à la fois : deux gestes, requête inverse retenue, Ctrl+Z deux fois puis clic sur « Annuler » : une seule requête inverse ; libérée : bouton actif (un geste reste dans la pile) | 6 Édition (17), D-127 (4) | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-277 | (révisé en E2E-277-r1, D-142) Deux gestes de barre sur la même activité (corps de 1 puis de 2 jours), « Annuler » : contour toujours présent, à la position du premier geste, `debut_valide` du premier geste en base ; « Annuler » de nouveau : contour retiré, `debut_valide` d'origine en base | 6 Édition (17), D-129 (2) | REX-3b | e2e/tests/rex3b.spec.ts |

### E2E, modification depuis l'Accueil et l'onglet Gantt

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-273 | Accueil (chef qui écrit) : projet déplié, clic sur le bouton-nom d'une activité : dialogue « Modifier l'activité », champ Nom prérempli ; renommer, « Enregistrer » : dialogue fermé, nouveau nom affiché sur l'Accueil (rechargement), nom en base ; même parcours pour un jalon (« Modifier le jalon ») | 6 Édition (18), D-127 (6) | REX-3b | e2e/tests/rex3b-modif.spec.ts |
| E2E-274 | Onglet Gantt (chef) : bouton-nom d'une activité puis d'un jalon : dialogue prérempli, renommer par l'écran, nouveau nom dans le tableau du Gantt et dans l'onglet Planning, nom en base | 6 Édition (18), D-127 (6) | REX-3b | e2e/tests/rex3b-modif.spec.ts |
| E2E-275 | Crayon « Modifier le projet <nom> » : sur un projet de l'Accueil (lien vers la fiche conservé), dialogue « Modifier le projet » prérempli, renommer : nouveau nom sur l'Accueil et en base ; sur un sous-projet du Gantt du projet (lien « <code> · <nom> » conservé) : renommer, lien « <code> · <nouveau nom> » | 6 Édition (18), D-127 (6) | REX-3b | e2e/tests/rex3b-modif.spec.ts |
| E2E-276 | Lecture seule (ressource affectée) : Accueil déplié et onglet Gantt : noms des éléments en texte (aucun bouton à ce nom), aucun crayon « Modifier le projet … » ; témoin positif : noms affichés | 6 Édition (18), D-127 (6) | REX-3b | e2e/tests/rex3b-modif.spec.ts |

### Révisions D-031 de REX-3b (D-127 (7))

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-38-r1 | E2E-38 : la ressource voit 4 boutons dans l'onglet Gantt (3 de zoom et « Annuler », désactivé) au lieu de 3 ; reste inchangé | 6 Édition (17), D-127 (4) | REX-3b | e2e/tests/lot3b.spec.ts |
| E2E-43-r5 | E2E-43-r4 : après la zone du tableau, les boutons-noms « Activité A » et « Jalon J », puis le lien du sous-projet, puis le crayon « Modifier le projet Sous-projet … », puis la zone du calendrier ; reste inchangé | 6 Édition (18), D-127 (6), (7) | REX-3b | e2e/tests/lot3b-focus.spec.ts |
| E2E-92-r5 | E2E-92-r4 : « Modifier le projet Projet92 » après le lien « Projet92 », avant la zone du calendrier (11 arrêts) | 6 Édition (18), D-127 (6), (7) | REX-3b | e2e/tests/accueil-g2.spec.ts |
| E2E-93-r2 | E2E-93-r1 : chaque ligne d'élément a un seul bouton, le bouton-nom (nom accessible = le nom), au lieu d'aucun ; toujours aucun lien | 6 Édition (18), D-127 (6) | REX-3b | e2e/tests/accueil-g3.spec.ts |
| E2E-100-r3 | E2E-100-r2 : « Modifier le projet Projet100 » après le lien « Projet100 » (11 arrêts) | 6 Édition (18), D-127 (6), (7) | REX-3b | e2e/tests/accueil-g3.spec.ts |
| E2E-109-r2 | E2E-109-r1 : « Modifier le projet Projet109 » après le lien « Projet109 » (11 arrêts) | 6 Édition (18), D-127 (6), (7) | REX-3b | e2e/tests/accueil-g4.spec.ts |
| E2E-179-r3 | E2E-179-r2 : après la zone du tableau, les boutons-noms des éléments du monde « liens » en ordre WBS, le lien du sous-projet, son crayon, puis la zone du calendrier | 6 Édition (18), D-127 (6), (7) | REX-3b | e2e/tests/lot3e.spec.ts |
| E2E-191-r3 | E2E-191-r2 : même insertion (boutons-noms du monde « arbo » en ordre WBS, lien, crayon, calendrier) | 6 Édition (18), D-127 (6), (7) | REX-3b | e2e/tests/lot3f1.spec.ts |

Rouges prouvés (2026-11-19) : ANL-1 à ANL-8 (module `gantt/annulation.ts` absent) ; E2E-257 à E2E-272 et E2E-277 (bouton « Annuler » absent, Ctrl+Z sans effet) ; E2E-273 à E2E-275 (ni bouton-nom ni crayon) ; E2E-38-r1, E2E-43-r5 (1440 et 1024 px), E2E-92-r5, E2E-93-r2, E2E-100-r3, E2E-109-r2, E2E-179-r3, E2E-191-r3. Vert dès l'écriture : E2E-276 (lecture seule, comportement inchangé). Tags de révision : tests-lot3b-r2 (E2E-38-r1), tests-lot3b-regle12-r5 (E2E-43-r5), tests-accueil-g2-r6 (E2E-92-r5), tests-accueil-g3-r4 (E2E-100-r3), tests-accueil-g4-r3 (E2E-109-r2), tests-accueil-g3-r5 (E2E-93-r2), tests-lot3e-r4 (E2E-179-r3), tests-lot3f1-r3 (E2E-191-r3).

### Révision D-031 de REX-3b (D-130)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-270-r1 | E2E-270 : l'assistant `suivreEcritures` ignore `/api/auth/` (la connexion faite avant `connecterAvec` n'est plus comptée) ; liste attendue et intention inchangées ; tag `tests-rex3b-r1` | 6 Édition (17), D-130 | REX-3b | e2e/tests/rex3b.spec.ts |

### Captures de REX-3b

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-278 | Captures sans assertion fonctionnelle, ne compte pas comme test de comportement (comme E2E-255) : Gantt du projet après un geste (barre d'outils avec « Annuler » actif, contour, boutons-noms, crayon du sous-projet) et Accueil déplié (boutons-noms, crayons) ; 1440 et 1024 px, e2e/captures/rex3b-{gantt,accueil}-{1440,1024}.png | D-127 (4), (6) | REX-3b | e2e/tests/rex3b-captures.spec.ts |

### Couverture des champs, REX-3b

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| PATCH /api/activites/:id `debut_valide`, `fin_valide`, `duree_validee` (valeurs d'avant, null compris) | bouton « Annuler » et Ctrl+Z du Gantt | E2E-257 à E2E-259, E2E-264 |
| POST /api/projets/:id/dependances, DELETE /api/dependances/:id (inverses) | bouton « Annuler » | E2E-260, E2E-261 |
| POST /api/elements/:id/deplacer `parent_id`, `rang` (inverse) | bouton « Annuler » | E2E-262, E2E-263 |
| PATCH /api/activites/:id `nom`, PATCH /api/jalons/:id `nom` | dialogue ouvert depuis le bouton-nom de l'Accueil et de l'onglet Gantt | E2E-273, E2E-274 |
| PATCH /api/projets/:id `nom` | dialogue ouvert par le crayon « Modifier le projet <nom> » (Accueil, sous-projet du Gantt) | E2E-275 |

## Tests de REX-3b-r2, corrections de la relecture de REX-3b (D-129 (2) précisé, D-131)

Corrections A à F arbitrées par claude.ai (2026-11-19) ; G (`pile` obligatoire dans `PlanningProjet`) couvert par le typecheck, sans test. Hors lot : colonnes hors vue à 1024 px, Drapeaux vide, focus clavier (docs/ux-session.md).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| ANL-9 | `sansContours(pile)` : chaque entrée « barre » a `contour: null`, les autres entrées et l'ordre inchangés, pile reçue non modifiée (recalcul automatique, D-131) | 6 Édition (17), D-129 (2), D-131 | REX-3b-r2 | packages/web/test/rex3b.test.ts |
| E2E-279 | A : un geste de barre (contour), puis calcul par le bouton « Calculer » : « Annuler » désactivé, `title` « Rien à annuler depuis le dernier calcul », Ctrl+Z sans requête, aucun contour dessiné, base inchangée par rapport au calcul ; un nouveau geste rend « Annuler » actif avec `title` « Annuler (Ctrl+Z) » | D-129 (2), D-131 | REX-3b-r2 | e2e/tests/rex3b-r2.spec.ts |
| E2E-280 | (révisé en E2E-280-r1, D-142) B : deux gestes, nom de l'activité changé par l'API entre-temps, requête inverse en erreur (409) : `role="alert"` d'échec visible ET écran rechargé (le nom venu du serveur est affiché, au moins un GET du Gantt après l'échec) | D-129 (2), D-131 | REX-3b-r2 | e2e/tests/rex3b-r2.spec.ts |
| E2E-281 | C1 Accueil : GET des activités en 500, clic sur un bouton-nom : « Impossible de charger l’élément à modifier. » ; requête rétablie, clic sur « Calculer » (rechargement réussi) : l'erreur disparaît sans nouvelle ouverture | D-131 | REX-3b-r2 | e2e/tests/rex3b-r2.spec.ts |
| E2E-282 | C2 Accueil : élément supprimé par l'API après l'affichage, clic sur son bouton-nom : alerte « Élément introuvable. », aucun dialogue ; autre élément encore ouvrable (l'alerte disparaît à l'ouverture suivante) | D-131 | REX-3b-r2 | e2e/tests/rex3b-r2.spec.ts |
| E2E-283 | C3 Accueil : GET des activités retenu, double clic sur un bouton-nom : bouton désactivé pendant l'attente, un seul GET de `/api/projets/:id/activites` ; libéré : un seul dialogue | D-131 | REX-3b-r2 | e2e/tests/rex3b-r2.spec.ts |
| E2E-284 | D : à 1024 px, « Annuler » et « Copier » (voisin de groupe) ont le même `top` ; Annuler n'est pas seul sur une ligne (groupe en `flex-nowrap`, passage à la ligne en bloc) | D-131 | REX-3b-r2 | e2e/tests/rex3b-r2.spec.ts |
| E2E-285 | E : Gantt du projet (1440 px), écart horizontal ≥ 8 px (l'arbitrage disait 4 px, déjà mesurés : seuil relevé à 8 px pour que le test voie le défaut, comme `gap-2` de l'Accueil) entre la boîte du crayon « Modifier le projet … » et la boîte du lien du sous-projet | D-131 | REX-3b-r2 | e2e/tests/rex3b-r2.spec.ts |
| E2E-286 | F : Accueil, survol de la ligne projet : le fond de chaque cellule est identique et la somme des largeurs des cellules fond égale celle de la ligne du tableau (cellule Drapeaux comprise) | D-131 | REX-3b-r2 | e2e/tests/rex3b-r2.spec.ts |
| E2E-287 | Gantt du projet, survol d'une ligne : le fond de la cellule Drapeaux est identique à celui des autres cellules de la ligne (vert d'emblée, D-131 (6) déjà codé ; rouge provoqué en retirant `group-hover:bg-gray-50`) | D-131 (6) | REX-3b-r3 | e2e/tests/rex3b-r2.spec.ts |
| E2E-288 | (a) 1024 px, Gantt du projet et Accueil : `box-shadow` calculé de l'en-tête Drapeaux et d'une cellule Drapeaux ≠ `none` ; largeur de la cellule Drapeaux inchangée (92 px, mesure de l'état avant D-132) | D-132 (a) | REX-3b-r4 | e2e/tests/rex3b-r4.spec.ts |
| E2E-289 | (d) 1440 px, Gantt du projet avec une activité « Pas avant une date » : à `scrollLeft` 0, bord droit de chaque en-tête (WBS à Avancement) ≤ bord gauche de l'en-tête Drapeaux, et `scrollWidth` = `clientWidth` de la zone du tableau | D-132 (d) | REX-3b-r4 | e2e/tests/rex3b-r4.spec.ts |
| E2E-290 | (b) Captures sans assertion fonctionnelle (vert d'emblée) : Accueil 1440 et 1024 avec une activité FDUR en retard calculée, Gantt du projet 1440 et 1024 après correction ; e2e/captures/rex3b-r4-*.png | D-132 (b) | REX-3b-r4 | e2e/tests/rex3b-r4.spec.ts |

### Couverture des champs, REX-3b-r2

Aucun champ d'API nouveau : les corrections portent sur l'écran (pile d'annulation, chargement d'un élément, mise en page).

## Tests de 4b-corr, corrections de 4b (D-134)

Rouges prouvés puis verts (phase verte 1748c4f) : E2E-291 à E2E-296 (mise en page, erreurs de case, badge) et E2E-226-r1 (révision D-031). E2E-297 : captures, vertes d'emblée ; E2E-294 : groupe en `flex-nowrap`, rouge prouvé sur ce point seulement (statut et actions étaient déjà sur une même ligne). Fichier : e2e/tests/lot4b-corr.spec.ts (monde et aides de lot4b-helpers.ts, horloge du navigateur au 14/01/2026). Contrat de phase verte : les lignes d'erreur de case sont des éléments de texte hors du tableau, chacune portant l'identifiant lu dans `aria-errormessage` de la case.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-291 | 1024 px : `scrollWidth` = `clientWidth` du conteneur du tableau ; en-têtes « Reste à faire » et dimanche entièrement visibles dans le conteneur | D-134 (2) | 4b-corr | e2e/tests/lot4b-corr.spec.ts |
| E2E-292 | Largeurs des sept en-têtes de jour égales (± 1 px), à 1440 et à 1024 px | D-134 (2) | 4b-corr | e2e/tests/lot4b-corr.spec.ts |
| E2E-293 | 1440 px : boutons de navigation, libellé de semaine, statut et actions sur une même ligne (centres verticaux ± 4 px : le `top` varie avec la hauteur du badge, du bouton et du texte) | D-134 (3) | 4b-corr | e2e/tests/lot4b-corr.spec.ts |
| E2E-294 | 1024 px : statut et actions sur une même ligne (centres ± 4 px) ; leur plus proche ancêtre commun est en `flex-wrap: nowrap` et ne contient pas la navigation (groupe) | D-134 (3) | 4b-corr | e2e/tests/lot4b-corr.spec.ts |
| E2E-295 | Valeur invalide : la ligne du tableau garde sa hauteur ; message « <jour> · <activité> : <message> » sous le tableau et absent du tableau ; `aria-invalid`, `aria-errormessage` vers un élément existant contenant le message ; bordure de la case de couleur `flag` ; la case valide revient à sa bordure normale et le message disparaît | D-134 (4) | 4b-corr | e2e/tests/lot4b-corr.spec.ts |
| E2E-296 | Badge « Brouillon » : contraste texte/fond calculé ≥ 4,5:1 et fond différent de celui du badge neutre (`rgb(243, 244, 246)`) | D-134 (5) | 4b-corr | e2e/tests/lot4b-corr.spec.ts |
| E2E-297 | Captures sans assertion fonctionnelle (ne compte pas comme test de comportement, comme E2E-245) : feuille de temps brouillon et valeurs invalides, 1440 et 1024 px, e2e/captures/feuille-temps-corr-{brouillon,invalide}-{1440,1024}.png | D-134 | 4b-corr | e2e/tests/lot4b-corr.spec.ts |

### Révision de 4b-corr (D-031, D-134 (4))

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-226-r1 | Valeurs invalides : `aria-invalid`, `aria-errormessage` vers l'élément du message (au lieu de `aria-describedby` et du message dans la case), « Enregistrer » désactivé ; vide = 0 efface l'imputation ; le reste suit la même règle | §7 4b (7), D-134 (4) | 4b-corr | e2e/tests/lot4b.spec.ts |

### Couverture des champs, 4b-corr

Aucun champ d'API nouveau : les corrections portent sur l'écran (mise en page, messages d'erreur, badge) ; tableau de 4b inchangé.

## Reprises de 4b (point 0 de 4c, non bloquant de la relecture de 4b-corr)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-298 | Feuille de temps : la liste des erreurs de case est dans une région `aria-live="polite"` présente dès l'affichage du tableau (vide, une seule région) ; une valeur invalide y ajoute la ligne d'erreur, la région est la même ; valeur corrigée : région vide, toujours présente | D-134 (4), D-135 (0a) | 4c-0 | e2e/tests/lot4b-corr.spec.ts |

## Tests du lot 4c, écran Validation (D-135)

Fichiers : packages/web/test/validation.test.ts (nouveau ; module à créer `packages/web/src/validation/logique.ts`), e2e/tests/lot4c.spec.ts et e2e/tests/lot4c-helpers.ts (nouveaux ; monde de lot4b-helpers.ts, horloge du navigateur H14 = mercredi 14/01/2026). Préfixe VFT neuf (vérifié libre dans docs, SPEC, packages et e2e ; VAL est pris par les tests API de 4a). Base relue par SQL (`validation_feuille`, `feuille_temps`) pour tout refus et toute écriture. Aucun test sous tag contredit : D-031 sans révision (voir « Révisions » ci-dessous).

### Tests unitaires web (D-135)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| VFT-1 | `badgeProjet(projet, statutFeuille)` : projet validé → « <code> · Validé », statut `success`, que `peut_valider` soit vrai ou faux, quel que soit le statut de la feuille | D-135 (3), (b) | 4c | validation.test.ts |
| VFT-2 | `badgeProjet` : feuille soumise, non validé et `peut_valider` → « <code> · À valider », statut `info` ; feuille brouillon ou rejetée, non validé et `peut_valider` → « <code> » sans suffixe, statut `neutre` | D-135 (3), (b) | 4c | validation.test.ts |
| VFT-3 | `badgeProjet` : non validé et non `peut_valider` → « <code> · Non autorisé », statut `neutre`, aussi sur un brouillon et une feuille rejetée | D-135 (3), (b) | 4c | validation.test.ts |
| VFT-4 | `badgesProjets(feuille)` : `projets` vide → liste vide (l'écran affiche « Aucune imputation ») ; ordre de l'API conservé, statut de la feuille pris en compte | D-135 (3), (b) | 4c | validation.test.ts |
| VFT-5 | `peutValider` : vrai seulement si soumise et au moins un projet `peut_valider` non validé ; faux si tous validés, aucun `peut_valider`, `projets` vide, ou statut brouillon, rejetée, validée | D-135 (5), (7) | 4c | validation.test.ts |
| VFT-6 | `peutRejeter` : vrai seulement si soumise et au moins un projet `peut_valider` (même déjà validé) ; faux si aucun `peut_valider`, `projets` vide, ou statut brouillon, rejetée, validée | D-135 (6), (7) | 4c | validation.test.ts |
| VFT-7 | `codesValidables` : codes des projets `peut_valider` non validés, ordre de l'API | D-135 (5) | 4c | validation.test.ts |
| VFT-8 | `analyserCommentaire` : vide et espaces seuls refusés ; 1 caractère accepté ; espaces et sauts de ligne de bord retirés (`valeur`, `longueur`) ; 500 acceptés (aussi entourés d'espaces) ; 501 refusés | D-135 (6), §7 API 7 | 4c | validation.test.ts |
| VFT-9 | `messageRefusValidation` (apostrophes ’) : 422 `statut_invalide`, 403, 404, 400 et autre (500, 422 d'un autre code, réseau) → textes de D-135 (8) | D-135 (8), (a) | 4c | validation.test.ts |
| VFT-10 | `relireListe` : vrai pour 422 `statut_invalide` et 404 seulement | D-135 (8) | 4c | validation.test.ts |

### E2E du lot 4c (D-135)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-299 | Entrée « Validation » de la Navigation principale : visible pour l'administrateur et le chef de projet, absente pour une ressource ; clic : adresse `/validation?semaine=2026-01-12`, titre « Validation des feuilles de temps », `aria-current` | D-135 (1), (2) | 4c | lot4c.spec.ts |
| E2E-300 | Adresse absente ou invalide (2026-01-13, « abc », 1999-12-27, 2100-01-04) : lundi courant, adresse corrigée, un seul chargement de page ; lundi valide gardé | D-135 (1) | 4c | lot4c.spec.ts |
| E2E-301 | Navigation de semaine : « Semaine précédente », « Semaine suivante », « Cette semaine » ; libellé « Semaine du JJ/MM/AAAA au JJ/MM/AAAA » ; liste de la semaine affichée (feuille d'Alice en S, « Aucune feuille de temps pour cette semaine. » en S-1) | D-135 (2) | 4c | lot4c.spec.ts |
| E2E-302 | Tableau, chef de P (feuille d'Alice soumise sur P et Q, feuille de Bob brouillon sur P) : colonnes Ressource, Statut, Projets, Actions ; ordre de l'API (Alice avant Bob) ; badges « P4B · À valider » et « Q4B · Non autorisé » ; statuts « Soumise » et « Brouillon » ; Bob (brouillon) : « P4B » sans suffixe, pas « P4B · À valider » ; boutons de la ligne d'Alice | D-135 (3), (b) | 4c | lot4c.spec.ts |
| E2E-303 | Badge « Validé » : Q validé par son chef (API) ; le chef de P voit « Q4B · Validé » et « P4B · À valider », statut « Soumise » | D-135 (3) | 4c | lot4c.spec.ts |
| E2E-304 | Administrateur, quatre statuts (Alice soumise, Bob brouillon, Carla validée, Dina rejetée) : badges de statut et de projet (Bob brouillon : « P4B » sans suffixe) ; « Voir » partout ; « Valider » et « Rejeter » seulement sur la feuille soumise | D-135 (3), (7), (b) | 4c | lot4c.spec.ts |
| E2E-305 | « Aucune imputation » : feuille sans imputation (administrateur, ligne listée, « Voir » présent, ni « Valider » ni « Rejeter ») ; le chef de projet ne la voit pas | D-135 (3), D-120 (2) | 4c | lot4c.spec.ts |
| E2E-306 | Liste vide : « Aucune feuille de temps pour cette semaine. » (chef, semaine sans feuille ; chef, seule feuille sans imputation) | D-135 (3) | 4c | lot4c.spec.ts |
| E2E-307 | « Voir » (chef de P) : dialogue « Feuille de Alice 4B, semaine du 12/01/2026 au 18/01/2026 » ; seule la ligne « 1 Tâche A » (pas « 1 Tâche B ») ; cases désactivées, valeur 1,5 ; total du jour et « Dépassement » ; aucune écriture ; focus rendu au bouton « Voir la feuille de Alice 4B » à la fermeture (Échap, puis « Fermer ») | D-135 (4) | 4c | lot4c.spec.ts |
| E2E-308 | « Voir » d'une feuille rejetée : commentaire de rejet affiché | D-135 (4) | 4c | lot4c.spec.ts |
| E2E-309 | « Valider » (administrateur) : confirmation « Valider la feuille de Alice 4B pour P4B, Q4B ? » ; « Annuler » : aucune écriture, base inchangée ; confirmer : « Feuille validée. » (`role="status"`), base : statut `validee`, deux lignes `validation_feuille`, liste relue (« Validée », plus de « Valider » ni « Rejeter ») | D-135 (5) | 4c | lot4c.spec.ts |
| E2E-310 | Validation partielle (chef de P) : confirmation « … pour P4B ? » ; base : statut reste `soumise`, une ligne `validation_feuille` (P, ce chef) ; liste : « P4B · Validé », « Q4B · Non autorisé » ; plus de « Valider », « Rejeter » encore présent | D-135 (5), (6) | 4c | lot4c.spec.ts |
| E2E-311 | « Rejeter » (chef de P, Q déjà validé par son chef) : « Rejeter » désactivé tant que le commentaire est vide, en espaces ou de 501 caractères ; compteur « n / 500 » (« Écart sur mardi » : 15 / 500) ; fermer sans rejeter : base inchangée ; succès : « Feuille rejetée. », base : statut `rejetee`, commentaire sans espaces de bord, `validation_feuille` vide ; liste relue (« Rejetée », ni « Valider » ni « Rejeter ») | D-135 (6) | 4c | lot4c.spec.ts |
| E2E-312 | Valider, 422 `statut_invalide` (interception) : « La feuille a changé de statut. », liste relue, base inchangée | D-135 (8) | 4c | lot4c.spec.ts |
| E2E-313 | Valider, 403 (interception) : « Vous n’avez pas le droit d’agir sur cette feuille. », base inchangée | D-135 (8), (a) | 4c | lot4c.spec.ts |
| E2E-314 | Rejeter, 404 (interception) : « Feuille introuvable. », liste relue, base inchangée | D-135 (8) | 4c | lot4c.spec.ts |
| E2E-315 | Rejeter, 400 (interception) : « Données invalides. », base inchangée | D-135 (8) | 4c | lot4c.spec.ts |
| E2E-316 | Valider, 500 (interception) : « Une erreur est survenue. », base inchangée | D-135 (8) | 4c | lot4c.spec.ts |
| E2E-317 | Parcours complet à l'écran, base « administrateur seul » : l'administrateur crée calendrier, chef, ressource, projet (chef choisi), affectation, activité, assignation (date de début du projet 2026-01-05) ; la ressource saisit, enregistre, soumet ; le chef valide (menu « Validation ») ; la ressource voit « Validée » et la feuille en lecture seule | D-135 (9) | 4c | lot4c.spec.ts |
| E2E-318 | Idem avec rejet : le chef rejette avec un commentaire ; la ressource voit « Feuille rejetée : <commentaire> », statut « Rejetée », cases modifiables, enregistre une nouvelle saisie | D-135 (9) | 4c | lot4c.spec.ts |
| E2E-319 | Ressource (ni chef ni administrateur) : `/validation` affiche « Accès réservé aux chefs de projet et aux administrateurs. » ; aucune requête GET /api/validations | D-135 (c) | 4c | lot4c.spec.ts |

### Révisions D-031 de 4c

Aucune. Contrôle fait : E2E-221 (entrée « Imputations », liens `exact`), E2E-222, E2E-223 (semaines de la Feuille de temps), E2E-243 et les tests qui cherchent « Modèles » ou « Utilisateurs » par nom exact ou non exact ne contredisent ni l'entrée « Validation » ni l'extraction du composant de semaine : le comportement et les noms accessibles de 4b sont inchangés. Contrat de la phase verte : si un de ces tests passe au rouge, révision D-031 à ce moment, un commit `test:` et un tag -rN par test.

### Couverture des champs, lot 4c

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| POST /api/feuilles/:id/valider | bouton « Valider la feuille de <ressource> » et sa confirmation | E2E-309, E2E-310, E2E-317 |
| POST /api/feuilles/:id/rejeter `commentaire` | champ « Commentaire » du dialogue de rejet | E2E-311, E2E-318 |
| GET /api/validations `semaine` | boutons de semaine et adresse `?semaine=` | E2E-300, E2E-301 |
| GET /api/feuilles `ressource_id` (lecture) | bouton « Voir la feuille de <ressource> » | E2E-307, E2E-308 |

### Captures de 4c (relecture d'apparence)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-320 | Captures sans assertion fonctionnelle (ne compte pas comme test de comportement, comme E2E-245) : écran Validation (administrateur, quatre statuts), dialogues « Voir », « Valider » et « Rejeter » (commentaire saisi), 1440 et 1024 px, e2e/captures/validation-{liste,voir,valider,rejeter}-{1440,1024}.png | D-135 | 4c | e2e/tests/lot4c-captures.spec.ts |

## Tests de clôture du lot 4 (D-136)

Rouges attendus : DEMO-4 (feuilles absentes du jeu de démonstration). E2E-244-r1 : vert d'emblée (l'écran Validation existe depuis 4c) ; rouge prouvé par modification locale (lien « Validation » retiré de `Layout`), défaite par édition. Révision D-031 sur décision du porteur (D-136 (1)) : E2E-244 devient E2E-244-r1 (lot4b.spec.ts), même base « administrateur seul », même intention ; étapes ajoutées : chef de projet créé à l'écran et choisi à la création du projet, après la soumission le chef ouvre « Validation » et valide, la ressource voit « Validée » et la feuille en lecture seule, puis le Gantt du projet (« 25 % », charge réelle 0,5 lue par l'API). Aucune autre entité créée par un écran nouveau.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| DEMO-4 | (révisé en DEMO-4-r1) Après `remplirDemo` (lundi = lundi de la semaine du jour réel, jours imputés tous passés ou égaux au jour du serveur) : feuilles relues en base. Semaine lundi − 14 : Bob `validee` (validateur chefa, projet R), Alice `rejetee`, commentaire « Imputations du jeudi à revoir », aucune validation. Semaine lundi − 7 : Alice `soumise`, une validation (projet R, chefa), aucune pour S ; Bob `soumise`. Semaine lundi : Alice `brouillon`, imputations au lundi seulement. GET /api/validations?semaine=lundi − 7 en chefb : Alice, projet S `peut_valider` vrai et `valide` faux. Aucune imputation un samedi, un dimanche ou un jour futur. Charge réelle des assignations concernées > 0 | D-136 (2) | clôture 4 | packages/api/test/demo.test.ts |
| DEMO-4-r1 | Révision de DEMO-4 (D-031, décision du porteur, D-136 (2) précisé) : semaine lundi − 7, Alice `soumise` avec une seule validation, projet S par chefb (en base `DEMO-S:chefb`) ; GET /api/validations?semaine=lundi − 7 en chefa : Alice avec R `peut_valider` vrai et `valide` faux, S `valide` vrai ; en chefb : S `valide` vrai. Reste de DEMO-4 inchangé (semaine lundi − 14 : Alice rejetée par chefb, imputations sur S) | D-136 (2) | clôture 4 | packages/api/test/demo.test.ts |
| E2E-244-r1 | Révision d'E2E-244 (voir ci-dessus) | D-136 (1), D-135 (9), CLAUDE.md « Parcours IHM » | clôture 4 | e2e/tests/lot4b.spec.ts |

Couverture des champs : aucun champ d'API nouveau (jeu de démonstration, parcours).

## Tests du lot 5i, installation et déploiement (D-138)

API : packages/api/test/lot5i-production.test.ts (INST-1 à 4, `buildApp` avec l'option `dossierWeb` désignant un dossier web compilé de test créé par le test), packages/api/test/lot5i-demarrage.test.ts (INST-5 à 7, démarrage réel comme DEV-10), packages/api/test/lot5i-session.test.ts (INST-8, 9). E2E : e2e/tests/lot5i.spec.ts (E2E-321). Script : scripts/test/installation.sh (INST-10, installation réelle par Docker, lancé à la main, hors `npm test` et hors CI). Valeurs de D-138 et SPEC §8 « Installation et déploiement ». « Mot de passe d'origine » : le compte de login « admin » dont le mot de passe est encore « admin » ; champ de session `mot_de_passe_origine` (booléen), jamais de hash.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| INST-1 | Mode production (`dossierWeb` = dossier de test contenant index.html et assets/app.js) : GET / → 200, `content-type` text/html, corps = index.html | D-138 (1) | 5i | packages/api/test/lot5i-production.test.ts |
| INST-2 | Même montage : GET /projets/12 → 200, text/html, corps = index.html (navigation de l'application) | D-138 (1) | 5i | packages/api/test/lot5i-production.test.ts |
| INST-3 | Même montage : GET /api/inconnue → 404, `content-type` application/json, jamais index.html | D-138 (1) | 5i | packages/api/test/lot5i-production.test.ts |
| INST-4 | Même montage : GET /assets/app.js → 200, `content-type` JavaScript, corps = le fichier | D-138 (1) | 5i | packages/api/test/lot5i-production.test.ts |
| INST-5 | Démarrage réel, `NODE_ENV=production`, `INITIAL_ADMIN` absente, base vide : un seul utilisateur (nom « Administrateur », login « admin », email null, administrateur, actif) ; POST /api/auth/login admin / admin → 200 | D-138 (2) | 5i | packages/api/test/lot5i-demarrage.test.ts |
| INST-6 | Démarrage réel, `NODE_ENV=production`, base non vide (un chef de projet) : aucune création, table utilisateur relue identique ; admin / admin → 401 | D-138 (2) | 5i | packages/api/test/lot5i-demarrage.test.ts |
| INST-7 | Démarrage réel, `NODE_ENV=production`, `INITIAL_ADMIN=0`, base vide : aucune création, table vide | D-138 (2) | 5i | packages/api/test/lot5i-demarrage.test.ts |
| INST-8 | Session : compte admin / admin (hash de « admin » écrit en base) : réponse de POST /api/auth/login et GET /api/auth/me avec `mot_de_passe_origine` vrai, sans `mot_de_passe_hash` ni valeur commençant par `$argon2` ; après PATCH /api/utilisateurs/:id { mot_de_passe } par lui-même, nouvelle connexion : `mot_de_passe_origine` faux dans les deux réponses | D-138 (2) | 5i | packages/api/test/lot5i-session.test.ts |
| INST-9 | Session d'un autre utilisateur (seedUser, administrateur) : `mot_de_passe_origine` faux | D-138 (2) | 5i | packages/api/test/lot5i-session.test.ts |
| INST-10 | Installation réelle : copie du dépôt (fichiers suivis et non ignorés) dans un dossier temporaire, `.env` tiré de `.env.production.example`, `docker compose up -d --build`, attente de `db` sain puis de l'API, `curl` / → 200 text/html, POST /api/auth/login admin / admin → 200 ; `docker compose down -v` en sortie dans tous les cas | D-138 (3) | 5i | scripts/test/installation.sh |
| E2E-321 | Bandeau du mot de passe d'origine : base « administrateur seul » ; l'administrateur e2e crée à l'écran l'administrateur « Administrateur initial », identifiant « admin », mot de passe « admin » ; connexion admin / admin : bandeau « Le mot de passe de l'administrateur est celui d'origine : changez-le. » visible ; Utilisateurs, « Modifier Administrateur initial », « Nouveau mot de passe », Enregistrer ; nouvelle connexion avec le nouveau mot de passe : bandeau absent | D-138 (2), CLAUDE.md « Parcours IHM » | 5i | e2e/tests/lot5i.spec.ts |

Couverture des champs : aucun champ d'API modifiable nouveau (`mot_de_passe_origine` est en lecture seule, affiché par le bandeau).

Rouges prouvés (tag `tests-lot5i`) : INST-1, 2, 4 (404 au lieu de 200), INST-5 (aucun utilisateur créé), INST-8, 9 (`mot_de_passe_origine` absent), E2E-321 (bandeau absent après connexion admin / admin) ; INST-3, 6, 7 verts d'emblée (gardes) ; INST-10 : « ÉCHEC : docker absent de la machine » (Docker absent de la VM). Révision D-031 à décider : DEV-10 (NODE_ENV absente, base vide → aucun utilisateur) contredit D-138 (2) ; proposition DEV-10-r1 : même démarrage avec `INITIAL_ADMIN=0` → aucun utilisateur.

### Révision D-031 de 5i (décision du porteur, D-138 (2) précisé)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| DEV-10-r1 | Révision de DEV-10 : démarrage réel (`tsx src/server.ts`, `ENV_FILE` vers un fichier absent), `NODE_ENV` absente, `INITIAL_ADMIN=0`, base vide : l'API écoute, aucun utilisateur n'est créé (état en base vérifié). Tag `tests-lot5i-r1` | 2, D-071 (7), D-138 (2) | 5i | packages/api/test/dev-demarrage.test.ts |

### Retrait de l'indicateur en mémoire (D-138 (2), précision)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| INST-11 | Indicateur « mot de passe d'origine » en mémoire (ensemble `sessionsOrigine` passé à `buildApp`) : connexion admin / admin → une entrée ; déconnexion → entrée absente. Expiration : session admin / admin vieillie de 13 h en base ; (a) GET /api/auth/me → 401, entrée absente, table session inchangée ; (b) connexion d'un autre utilisateur (purge des sessions expirées) → entrée absente, session expirée supprimée | D-138 (2) | 5i | packages/api/test/lot5i-session.test.ts |

### Révision D-031 et cookie de session (décisions du porteur, D-139)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| USR-5-r1 | Révision d'USR-5 (D-031) : mêmes réponses (POST, GET et PATCH /api/utilisateurs, GET /api/auth/me) ; du corps de chaque réponse est retiré le seul motif `"mot_de_passe_origine":(true\|false)`, puis l'interdiction d'origine /argon2\|mot_de_passe/ s'applique inchangée. Tag `tests-lot5i-r2` | 2, D-138 (2) | 5i | packages/api/test/users.test.ts |
| INST-12 | Cookie de session selon `COOKIE_SECURE` (configuration lue par `loadConfig`, connexion par POST /api/auth/login) : `NODE_ENV=production`, `COOKIE_SECURE=0` → cookie sans Secure ; `NODE_ENV=production`, `COOKIE_SECURE=1` → Secure ; `NODE_ENV=development`, `COOKIE_SECURE=1` → Secure ; absente : production → Secure, development → sans Secure (règle actuelle) | D-139 (2) | 5i | packages/api/test/lot5i-cookie.test.ts |

## Tests du lot 5b, sécurité et robustesse (D-140)

API : packages/api/test/lot5b-connexion.test.ts (AUTH-13 à AUTH-15), packages/api/test/lot5b-limiteur.test.ts (LIM-1 à LIM-7, module pur `auth/limiteur.ts`, horloge injectée), packages/api/test/lot5b-bornes.test.ts (ID-2), packages/api/test/lot5b-demarrage.test.ts (INST-13, démarrage réel), packages/api/test/lot5b-production.test.ts (INST-14, INST-15), packages/api/test/lot5b-sessions.test.ts (INST-16). E2E : e2e/tests/lot5b.spec.ts (E2E-322). Contrat du limiteur (D-140 (3)) : `creerLimiteur(maintenant: () => number)` (millisecondes) renvoie `{ verifier(ip, identifiant) → { bloque, retryAfter }, echec(ip, identifiant), succes(ip, identifiant), taille() }` ; `retryAfter` en secondes, arrondi au-dessus ; `taille()` = nombre d'entrées (clés et IP) ; `verifier` ne crée aucune entrée. Contrat d'`AppDeps` : `verifierMotDePasse(hash, motDePasse)` et `limiteurConnexion` ; `Config.trustProxy`.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| AUTH-13 | `verifierMotDePasse` injecté (passe-plat compté) : identifiant inconnu → 1 appel, hash commençant par `$argon2` ; utilisateur inactif (bon mot de passe) → 1 appel ; mauvais mot de passe → 1 appel ; les trois réponses 401 ont des corps strictement égaux | D-140 (2) | 5b | packages/api/test/lot5b-connexion.test.ts |
| LIM-1 | 5 échecs de (ip, a) à t = 0 : `verifier` à t + 100 ms → bloqué, `retryAfter` 900 ; à t + 60 s → 840 ; 4 échecs seulement → non bloqué | D-140 (3) | 5b | packages/api/test/lot5b-limiteur.test.ts |
| LIM-2 | Après 5 échecs : à 15 min − 1 ms encore bloqué ; à 15 min après le 1er échec → débloqué ; la fenêtre rouverte au 1er échec suivant (5 nouveaux échecs requis) | D-140 (3) | 5b | packages/api/test/lot5b-limiteur.test.ts |
| LIM-3 | `succes(ip, a)` remet à zéro la clé : 4 échecs, succès, 4 échecs → non bloqué ; le compteur de l'IP n'est pas remis à zéro (3 échecs de a, succès de a, 47 échecs d'identifiants distincts → IP bloquée pour un identifiant neuf) | D-140 (3) | 5b | packages/api/test/lot5b-limiteur.test.ts |
| LIM-4 | 5 échecs de (ip, a) : (ip, b) non bloqué ; une autre IP avec l'identifiant a non bloquée | D-140 (3) | 5b | packages/api/test/lot5b-limiteur.test.ts |
| LIM-5 | 50 échecs d'identifiants distincts depuis une IP → tout identifiant bloqué depuis cette IP, `retryAfter` > 0 ; 49 échecs → non bloqué ; autre IP non bloquée | D-140 (3) | 5b | packages/api/test/lot5b-limiteur.test.ts |
| LIM-6 | Une tentative bloquée ne prolonge pas la fenêtre : 5 échecs à t = 0, `verifier` répétés et `echec` appelé à 10 min → à 15 min après le 1er échec, débloqué | D-140 (3) | 5b | packages/api/test/lot5b-limiteur.test.ts |
| LIM-7 | Purge : échecs de 3 identifiants (4 entrées : 3 clés et l'IP) ; 15 min plus tard, un appel de `verifier` → `taille()` = 0 | D-140 (3) | 5b | packages/api/test/lot5b-limiteur.test.ts |
| AUTH-14 | Limiteur injecté, horloge avancée à la main : 5 mauvais mots de passe d'alice (401) → 6e avec le bon mot de passe → 429 `{ erreur: 'Trop de tentatives' }`, `Retry-After` > 0, lignes de `session` inchangées, aucun appel de `verifierMotDePasse` pour la 6e ; bob, même IP → 200 ; horloge + 15 min → alice 200. Variantes : identifiant inconnu compté (5 puis 429) ; corps invalide (6 fois) non compté puis connexion 200 ; 4 échecs, succès, 4 échecs, bon mot de passe → 200 ; limiteur par défaut de `buildApp` (5 échecs puis 429, horloge réelle) | D-140 (3) | 5b | packages/api/test/lot5b-connexion.test.ts |
| AUTH-15 | `Config.trustProxy` vrai : 5 échecs d'alice avec X-Forwarded-For 1.2.3.4 n'empêchent pas 5.6.7.8 (200) et bloquent 1.2.3.4 (429) ; sans `trustProxy`, X-Forwarded-For ignoré (6e bloquée, 429). `loadConfig` : TRUST_PROXY « 1 » → `trustProxy` vrai ; absent, « 0 » ou « oui » → faux | D-140 (3) | 5b | packages/api/test/lot5b-connexion.test.ts |
| ID-2 | Chaque champ borné de D-140 (4) avec 2147483648 (et −2147483649 pour `delai` et `duree_validee`) → 400 `{ erreur: 'Données invalides' }`, jamais 500 ; toutes les tables relues, identiques à l'état d'avant. Champs (relevé par grep des schémas zod de packages/api/src/routes) : POST /api/projets/:id/affectations `ressource_id` ; POST /api/activites/:id/assignations `ressource_id` ; POST /api/utilisateurs et PATCH /api/utilisateurs/:id `calendrier_id` ; POST /api/projets/:id/activites et /jalons `parent_id`, `rang` ; POST /api/elements/:id/deplacer `parent_id`, `rang` ; POST /api/projets et POST /api/modeles `parent_id`, `chef_id` ; PATCH /api/projets/:id `parent_id`, `chef_id` ; POST /api/projets/:id/dependances et PATCH /api/dependances/:id `delai` ; POST /api/projets/:id/activites et PATCH /api/activites/:id `duree_validee`. Déjà bornés, inchangés : dependances `predecesseur_id`, `successeur_id` ; saisies et feuilles `assignation_id` ; calcul `projets` | D-140 (4) | 5b | packages/api/test/lot5b-bornes.test.ts |
| INST-13 | `avertissementsConfiguration(env)` (config.ts) : SESSION_SECRET et POSTGRES_PASSWORD aux valeurs du modèle (`changez-moi-au-moins-32-caracteres-aleatoires`, `changezmoi`) → 2 messages (le 1er cite SESSION_SECRET, le 2e POSTGRES_PASSWORD) ; une seule valeur du modèle → 1 message ; valeurs changées ou absentes → aucun. Démarrage réel (comme INST-5) avec les valeurs du modèle : la sortie contient SESSION_SECRET et POSTGRES_PASSWORD, le serveur écoute (connexion TCP) | D-140 (5) (a) | 5b | packages/api/test/lot5b-demarrage.test.ts, lot5b-production.test.ts |
| INST-14 | Mode production (montage d'INST-1) : GET /assets/absent.js → 404, corps ≠ index.html ; témoin : GET /projets/12 → 200, index.html | D-140 (5) (b) | 5b | packages/api/test/lot5b-production.test.ts |
| INST-15 | `vi.spyOn(pool, 'query')`, session ouverte (cookie) : GET /projets/12 et GET /assets/app.js → 0 requête ; témoin : GET /api/auth/me → au moins 1 | D-140 (5) (c) | 5b | packages/api/test/lot5b-production.test.ts |
| INST-16 | Session admin / admin ouverte (`sessionsOrigine` de taille 1) ; un autre administrateur change (cas 1) le mot de passe, (cas 2) le rôle, (cas 3) désactive : ensemble vide aussitôt, sans requête de l'utilisateur concerné ; sessions de la table relues vides | D-140 (5) (d) | 5b | packages/api/test/lot5b-sessions.test.ts |
| E2E-322 | Écran Connexion, serveur réel : identifiant unique inconnu `e2e-limite-<horodatage>` ; 1er échec → « Identifiant ou mot de passe incorrect. » ; 6 soumissions (réponses 401 ×5 puis 429) → alerte « Trop de tentatives de connexion. Réessayez dans quelques minutes. » ; échecs volontaires de la suite e2e (relevé avant écriture) : E2E-2, E2E-74, rex1 (1 chacun) + 6 = 9, sous 50 par IP | D-140 (3) | 5b | e2e/tests/lot5b.spec.ts |

Couverture des champs : aucun champ d'API modifiable nouveau. Les champs bornés (liste de ID-2) existent déjà ; la borne ne change que la validation du corps (400). Écrans qui les saisissent : `delai` et `duree_validee` (dialogues de dépendance et d'activité, valeurs libres, bornes non exposées à l'écran) ; `*_id` et `rang` : choisis dans des listes ou par déplacement, hors saisie libre (hors écran : valeurs hors plage inatteignables par l'interface).

## Révisions D-031 de 5c (D-142)

Un seul tag `tests-lot5c`, aucun code de production. Intention et codes HTTP inchangés. API : assistant `refusSansEffet` (et `releve`) dans packages/api/test/helpers.ts : relevé de la table concernée avant la requête refusée (toutes les colonnes de chaque ligne), vérification du code, relevé après, lignes et valeurs identiques. E2E : assistants `retarderPatchs` et `suivreReponsesPatch` (e2e/tests/patch-helpers.ts, retard `E2E_RETARD_PATCH` en ms, 0 par défaut). E2E-277 examiné : il enchaînait deux glissers sans attendre la réponse (rouge avec 300 ms), donc révisé.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| AFF-3-r1 | Révision de AFF-3 (D-031) : Écriture réservée à l’administrateur et au chef du projet ; chef d’un autre projet → 404 ; ressource affectée → 403 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-aff.test.ts |
| AFF-8-r1 | Révision de AFF-8 (D-031) : Taux d’affectation hors de ]0 ; 100] → 400 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-aff.test.ts |
| AFF-9-r1 | Révision de AFF-9 (D-031) : Date de fin antérieure à la date de début → 422 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-aff.test.ts |
| CAL-6-r1 | Révision de CAL-6 (D-031) : Chef de projet et ressource → 403 en écriture ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-cal.test.ts |
| CAL-7-r1 | Révision de CAL-7 (D-031) : Routes calendriers sans session → 401 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-cal.test.ts |
| CAL-10-r1 | Révision de CAL-10 (D-031) : Supprimer le calendrier par défaut ou un calendrier utilisé par un utilisateur → 409 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-cal.test.ts |
| CAL-11-r1 | Révision de CAL-11 (D-031) : Jours travaillés vides ou hors 1–7 → 400 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-cal.test.ts |
| ACT-14-r1 | Révision de ACT-14 (D-031) : Routes activités sans session → 401 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-act.test.ts |
| ACT-21-r1 | Révision de ACT-21 (D-031) : Priorité d’activité hors de 0 à 1000 → 400 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-act.test.ts |
| JLN-8-r1 | Révision de JLN-8 (D-031) : Routes jalons sans session → 401 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-jln.test.ts |
| PRJ-6-r1 | Révision de PRJ-6 (D-031) : Un chef modifie son projet ; le projet d’un autre chef → 404 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-prj.test.ts |
| PRJ-7-r1 | Révision de PRJ-7 (D-031) : Une ressource ne voit que les projets où elle est affectée ; projet non affecté → 404 ; écriture sur un projet affecté → 403 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-prj.test.ts |
| PRJ-9-r1 | Révision de PRJ-9 (D-031) : Routes projets sans session → 401 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-prj.test.ts |
| PRJ-16-r1 | Révision de PRJ-16 (D-031) : Priorité hors de 0 à 1000 → 400 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-prj.test.ts |
| LIEN-15-r1 | Révision de LIEN-15 (D-031) : Délai de dépendance non entier → 400 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-lien.test.ts |
| ASS-12-r1 | Révision de ASS-12 (D-031) : Taux d’assignation hors de ]0 ; 100] → 400 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-ass.test.ts |
| ASS-14-r1 | Révision de ASS-14 (D-031) : Charge avec plus de 2 décimales → 400 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-ass.test.ts |
| ASS-16-r1 | Révision de ASS-16 (D-031) : Charge négative → 400 ; relecture de la base : après chaque refus, lignes et valeurs de la table concernée identiques au relevé pris avant la requête | D-142 (2) | 5c | packages/api/test/lot1-ass.test.ts |
| E2E-264-r1 | Révision de E2E-264 (D-031) : Ctrl+Z (focus sur la zone du calendrier) annule un geste de barre comme le bouton (base revenue, « Geste annulé. ») ; Meta+Z (Cmd+Z) annule un second geste ; attente de la réponse du PATCH (compteur de réponses) après chaque glisser, avant le geste suivant | D-142 (4), D-094 (10) | 5c | e2e/tests/rex3b.spec.ts |
| E2E-268-r1 | Révision de E2E-268 (D-031) : Échec de l'inverse (réponse interceptée en 409, puis dans un second monde en 422) après deux gestes : `role="alert"` « Impossible d'annuler ce geste ; les annulations précédentes ne sont plus possibles. », bouton désactivé (pile vidée), valeur du second geste gardée en base ; attente de la réponse du PATCH (compteur de réponses) après chaque glisser, avant le geste suivant | D-142 (4), D-094 (10) | 5c | e2e/tests/rex3b.spec.ts |
| E2E-272-r1 | Révision de E2E-272 (D-031) : Une annulation à la fois : deux gestes, requête inverse retenue, Ctrl+Z deux fois puis clic sur « Annuler » : une seule requête inverse ; libérée : bouton actif (un geste reste dans la pile) ; attente de la réponse du PATCH (compteur de réponses) après chaque glisser, avant le geste suivant | D-142 (4), D-094 (10) | 5c | e2e/tests/rex3b.spec.ts |
| E2E-277-r1 | Révision de E2E-277 (D-031) : Deux gestes de barre sur la même activité (corps de 1 puis de 2 jours), « Annuler » : contour toujours présent, à la position du premier geste, `debut_valide` du premier geste en base ; « Annuler » de nouveau : contour retiré, `debut_valide` d'origine en base ; attente de la réponse du PATCH (compteur de réponses) après chaque glisser, avant le geste suivant | D-142 (4), D-094 (10) | 5c | e2e/tests/rex3b.spec.ts |
| E2E-280-r1 | Révision de E2E-280 (D-031) : B : deux gestes, nom de l'activité changé par l'API entre-temps, requête inverse en erreur (409) : `role="alert"` d'échec visible ET écran rechargé (le nom venu du serveur est affiché, au moins un GET du Gantt après l'échec) ; attente de la réponse du PATCH (compteur de réponses) après chaque glisser, avant le geste suivant | D-142 (4), D-094 (10) | 5c | e2e/tests/rex3b-r2.spec.ts |

Preuves (D-142 (3), (4), (5)) : voir docs/state.md, section 5c.

## Test de garde de publication (D-143)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| PUB-1 | Aucun fichier suivi par git (`git ls-files`) ne contient de référence nommée à un produit tiers de gestion de projet (motif construit par concaténation dans le test, non écrit en clair) | D-143 | publication | scripts/test/aucune-reference-externe.test.ts |
| PUB-2 | Aucun fichier suivi par git ne contient de trace de l'environnement personnel du porteur : commande de tunnel SSH, chemin absolu du dossier personnel, chemin relatif au dossier personnel du dépôt (motifs construits par concaténation dans le test, non écrits en clair) | D-143 | publication | scripts/test/aucune-reference-externe.test.ts |

## Tests du lot 5d et REX-4 (D-145)

Fichiers : packages/web/test/validation.test.ts (VFT-11 à VFT-13, fonction pure `cibleFocus` à créer dans `validation/logique.ts`), e2e/tests/lot4c.spec.ts (révisions -r1), e2e/tests/lot5d.spec.ts (E2E-323 à E2E-333) et e2e/tests/lot5d-captures.spec.ts (E2E-334). Monde de lot4c-helpers.ts (`monde4c`), plus des projets à code long créés par l'API. Chaque test d'écriture relit la base (statut de la feuille avant et après, `etatFeuille`). Signature de la règle de focus (D-145 (2)) : `cibleFocus(origine: { feuilleId: number; action: 'valider' | 'rejeter' }, feuilles: FeuilleValidation[])` → `{ genre: 'bouton'; action }` si la feuille est dans la liste relue et `peutValider` (origine valider) ou `peutRejeter` (origine rejeter) ; sinon `{ genre: 'voir' }` si la feuille est dans la liste relue ; sinon `{ genre: 'tableau' }`. Choix de cadrage : « action suivante » (D-145 (2)) = clic sur un bouton de ligne (Voir, Valider, Rejeter) ; « simulé » = réponse du POST remplacée par un 200 `{}` sans atteindre le serveur, la base reste inchangée (une validation réelle retire toujours « Valider » ; la branche « bouton d'origine encore actif » ne peut s'obtenir autrement après un succès).

### Révisions D-031 de 5d (décision du porteur, D-145 (2))

Recherche faite dans lot4c.spec.ts (et lot4c-captures.spec.ts) : seuls E2E-312 et E2E-314 interceptent un 422 ou un 404. E2E-313 (403), E2E-315 (400) et E2E-316 (500) sont inchangés (dialogue ouvert, D-145 (2)) ; leur contrôle d'emplacement du message est ajouté par E2E-332 et E2E-333.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-312-r1 | Révision de E2E-312 (D-031). Ancienne attente : valider, 422 `statut_invalide` (interception) → alerte « La feuille a changé de statut. » en un lieu non précisé (le dialogue restait ouvert avec le message dedans), liste relue, base inchangée. Nouvelle attente : dialogue fermé ; alerte `role="alert"` « La feuille a changé de statut. » hors du dialogue, au-dessus du tableau ; liste relue (GET /api/validations de plus) ; base inchangée (statut `soumise`, aucune validation) ; focus sur « Valider la feuille de Alice 4B » (la feuille est soumise, le bouton existe encore) | D-145 (2) | 5d | e2e/tests/lot4c.spec.ts |
| E2E-314-r1 | Révision de E2E-314 (D-031). Ancienne attente : rejeter, 404 (interception) → alerte « Feuille introuvable. » en un lieu non précisé (dans le dialogue resté ouvert), liste relue, base inchangée. Nouvelle attente : dialogue fermé ; alerte « Feuille introuvable. » hors du dialogue, au-dessus du tableau ; liste relue ; base inchangée ; focus sur « Rejeter la feuille de Alice 4B » | D-145 (2) | 5d | e2e/tests/lot4c.spec.ts |

### Tests unitaires web (D-145)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| VFT-11 | `cibleFocus`, branche « bouton » : origine valider, feuille soumise avec un projet `peut_valider` non validé → `{ genre: 'bouton', action: 'valider' }` ; origine rejeter, feuille soumise avec un projet `peut_valider` → `{ genre: 'bouton', action: 'rejeter' }` ; autres feuilles de la liste sans effet | D-145 (2) | 5d | packages/web/test/validation.test.ts |
| VFT-12 | `cibleFocus`, branche « voir » : feuille présente mais bouton d'origine absent (origine valider, feuille validée ; origine valider, tous les projets `peut_valider` validés mais feuille soumise ; origine rejeter, feuille rejetée) → `{ genre: 'voir' }` | D-145 (2) | 5d | packages/web/test/validation.test.ts |
| VFT-13 | `cibleFocus`, branche « tableau » : feuille absente de la liste relue (liste d'autres feuilles) → `{ genre: 'tableau' }` ; liste vide → `{ genre: 'tableau' }` | D-145 (2) | 5d | packages/web/test/validation.test.ts |

### REX-4 : colonne Projet (D-145 (3))

Projets créés par l'API pour Alice (ressource, une assignation chacun, imputation du lundi de la semaine S) : code de 11 caractères `PRJ-1234567` et code de 30 caractères `DEMO-` suivi de 25 « A ». Écran Feuille de temps d'Alice, horloge au mercredi 14/01/2026.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-323 (a) | Code de 11 caractères entièrement visible, à 1440 et à 1024 px : cellule d'en-tête de ligne du projet, largeur rendue (`clientWidth`) ≥ `scrollWidth` | D-145 (3) | 5d | e2e/tests/lot5d.spec.ts |
| E2E-323 (b) | Code de 30 caractères tronqué à 1440 et à 1024 px (`scrollWidth` > `clientWidth`, `text-overflow: ellipsis`), `title` égal au code complet | D-145 (3) | 5d | e2e/tests/lot5d.spec.ts |
| E2E-323 (c) | Témoin de D-134 (2), avec les deux codes présents : à 1024 px, `scrollWidth` = `clientWidth` du conteneur du tableau, écran Feuille de temps d'Alice, puis écran Validation, dialogue « Voir la feuille de Alice 4B » (administrateur) | D-134 (2), D-145 (3) | 5d | e2e/tests/lot5d.spec.ts |

### E2E de l'écran Validation (D-145 (2))

Monde de lot4c : Alice soumise sur P4B et Q4B (chef de P : « Valider » et « Rejeter » ; administrateur : les deux projets). Alerte « au-dessus du tableau » : boîte de l'alerte entièrement au-dessus de celle du tableau (bas de l'alerte ≤ haut du tableau), hors de tout `role="dialog"`.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-324 | Succès réel de Valider (administrateur), branche « Voir » : « Feuille validée. », dialogue fermé, liste relue ; base : `soumise` → `validee` ; « Valider » et « Rejeter » disparus ; focus sur « Voir la feuille de Alice 4B » | D-145 (2) | 5d | e2e/tests/lot5d.spec.ts |
| E2E-325 | Succès simulé de Valider (POST remplacé par 200 `{}`, rien d'écrit), branche « bouton d'origine » : dialogue fermé, liste relue, la feuille reste soumise (base inchangée avant et après), focus sur « Valider la feuille de Alice 4B » | D-145 (2) | 5d | e2e/tests/lot5d.spec.ts |
| E2E-326 | Succès simulé de Valider, la liste relue ne contient plus la feuille d'Alice (GET /api/validations filtré) mais celle de Bob (brouillon, autre ressource), branche « tableau » : dialogue fermé, focus sur le tableau « Feuilles de temps à valider » (`tabIndex` = -1) ; base : Alice soumise avant et après | D-145 (2) | 5d | e2e/tests/lot5d.spec.ts |
| E2E-327 | Succès réel de Rejeter (chef de P) : « Feuille rejetée. », dialogue fermé, liste relue ; base : `soumise` → `rejetee`, commentaire enregistré ; focus sur « Voir la feuille de Alice 4B » | D-145 (2) | 5d | e2e/tests/lot5d.spec.ts |
| E2E-328 | Rejeter, 422 `statut_invalide` (interception) : dialogue fermé, alerte « La feuille a changé de statut. » au-dessus du tableau, liste relue, base inchangée, focus sur « Rejeter la feuille de Alice 4B » | D-145 (2), D-135 (8) | 5d | e2e/tests/lot5d.spec.ts |
| E2E-329 | Valider, 404 (interception) : dialogue fermé, alerte « Feuille introuvable. » au-dessus du tableau, liste relue, base inchangée, focus sur « Valider la feuille de Alice 4B » | D-145 (2), D-135 (8) | 5d | e2e/tests/lot5d.spec.ts |
| E2E-330 | Alerte effacée à l'action suivante : après un 422 (alerte visible), clic sur « Valider la feuille de Alice 4B » → alerte absente, dialogue ouvert ; base inchangée | D-145 (2) | 5d | e2e/tests/lot5d.spec.ts |
| E2E-331 | Alerte effacée au changement de semaine : après un 422 (alerte visible), « Semaine précédente » → alerte absente, libellé de la semaine précédente ; base inchangée | D-145 (2) | 5d | e2e/tests/lot5d.spec.ts |
| E2E-332 | Témoin, Valider 403 (interception) : dialogue resté ouvert, alerte « Vous n’avez pas le droit d’agir sur cette feuille. » dans le dialogue, aucune alerte hors du dialogue, base inchangée (complète E2E-313) | D-145 (2), D-135 (8) | 5d | e2e/tests/lot5d.spec.ts |
| E2E-333 | Témoin, Rejeter 500 (interception) : dialogue resté ouvert, alerte « Une erreur est survenue. » dans le dialogue, aucune alerte hors du dialogue, base inchangée (complète E2E-316) | D-145 (2), D-135 (8) | 5d | e2e/tests/lot5d.spec.ts |

### Captures de 5d (relecture d'apparence)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-334 | Captures sans assertion fonctionnelle (ne compte pas comme test de comportement, comme E2E-245) : écran Validation avec l'alerte d'un refus 422 (administrateur) ; Feuille de temps d'Alice avec les codes de 11 et de 30 caractères ; 1440 et 1024 px ; e2e/captures/validation-alerte-{1440,1024}.png, feuille-codes-{1440,1024}.png | D-145 | 5d | e2e/tests/lot5d-captures.spec.ts |

### Couverture des champs, 5d

Aucun champ d'API modifiable nouveau, aucune route nouvelle : les champs de 4c (voir « Couverture des champs, lot 4c ») gardent leurs écrans ; E2E-324, E2E-327 couvrent à nouveau le POST valider et le POST rejeter `commentaire` par l'écran.

## Révisions D-031 de D-146 (décision du porteur)

Tag `tests-rex3b-d146` (`tests-rex3b-r2` existe déjà : REX-3b-r2), aucun code de production. Valeurs attendues inchangées (dates, nombres de PATCH, textes). Écart avec D-146 (2) : le libellé de la barre n'est pas un signal fiable (il ne change que pendant que la barre est retenue, puis revient aux dates planifiées) ; signal retenu : contour et barre libérée (assistant `appliquerGeste`, patch-helpers.ts). Assistant `E2E_RETARD_CORPS` (ms, 0 par défaut) dans e2e/tests/patch-helpers.ts : retard de la lecture du corps du PATCH dans le navigateur, après l'arrivée de la réponse. Rouge prouvé : versions d'avant rouges avec `E2E_RETARD_CORPS=300`, vertes sans retard.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-264-r2 | Révision de E2E-264-r1 (D-031) : ancienne attente : réponse réseau du PATCH (`suivreReponsesPatch`) après chaque glisser ; nouvelle : écran (contour posé à une position différente, relu par `expect.poll`, et barre libérée : classe `cursor-grab`) | D-146 | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-267-r2 | Révision de E2E-267-r1 : idem, à chacun des 21 gestes | D-146 | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-268-r2 | Révision de E2E-268-r1 (409 et 422) : idem après chaque glisser | D-146 | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-272-r2 | Révision de E2E-272-r1 : idem après chaque glisser | D-146 | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-277-r2 | Révision de E2E-277-r1 : ancienne attente : réponse réseau ; nouvelle : idem, contour relu par `expect.poll` (position distincte de la précédente) | D-146 | REX-3b | e2e/tests/rex3b.spec.ts |
| E2E-280-r2 | Révision de E2E-280-r1 : idem E2E-264-r2 | D-146 | REX-3b | e2e/tests/rex3b-r2.spec.ts |

## Tests du lot 6a, équipe facultative de l'utilisateur (D-147)

API : `packages/api/test/lot6a-equipes.test.ts` (EQP, USR) et `packages/api/test/lot6a-migration.test.ts` (MIG-9). Chaque refus relève les tables `equipe` et `utilisateur` avant et après (`refusSansEffet`) : base inchangée. Valeurs attendues recopiées de SPEC « Équipes (lot 6a, D-147) » et de D-147. E2E : `e2e/tests/lot6a.spec.ts`, base « administrateur seul » avant et après chaque test (équipes comprises, `lot6a-helpers.ts`). Choix de l'écran laissés à Claude Code (D-147 (5) ne tranche pas) : le formulaire « Nouvelle équipe » est un dialogue ouvert par le bouton « Nouvelle équipe » (patron de l'écran Calendriers) ; aucun texte d'état vide testé.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| MIG-9 | Migration 013 : base amenée à la version 12 avec deux utilisateurs, puis migration (versions du dépôt > 12 appliquées, schema_version = liste complète tirée de MIGRATIONS_DIR) : table `equipe` (id, nom) ; `utilisateur.equipe_id` nul pour les comptes existants ; nom en double à la casse près refusé (« Atelier » puis « ATELIER »), nom vide ou de 101 caractères refusés, nom de 100 caractères accepté ; `equipe_id` inexistant refusé (clé étrangère) ; suppression d'une équipe portée par un utilisateur refusée | 3, D-147 (2) | 6a | packages/api/test/lot6a-migration.test.ts |
| EQP-1 | GET /api/equipes : 200 `[{ id, nom }]` pour l'administrateur, le chef de projet et la ressource (mêmes données) ; sans session 401, base inchangée | 2, D-147 (3) | 6a | packages/api/test/lot6a-equipes.test.ts |
| EQP-2 | Tri par nom sans tenir compte de la casse : créées « bravo », « Alpha », « Écho », « alpha2 », « Charlie » (ordre d'insertion mêlé) → liste « Alpha », « alpha2 », « bravo », « Charlie », « Écho » | 3, D-147 (3) | 6a | packages/api/test/lot6a-equipes.test.ts |
| EQP-3 | POST /api/equipes par l'administrateur : 201 `{ id, nom }` ; « Atelier » avec espaces de bord relu « Atelier » (trim) ; un nom de 100 caractères accepté ; relu par GET | 3, D-147 (2, 3) | 6a | packages/api/test/lot6a-equipes.test.ts |
| EQP-4 | PATCH /api/equipes/:id par l'administrateur : 200 `{ id, nom }` ; relu par GET ; renommer en changeant seulement la casse de son propre nom : 200 | 3, D-147 (3) | 6a | packages/api/test/lot6a-equipes.test.ts |
| EQP-5 | DELETE /api/equipes/:id par l'administrateur : 204 ; relu : l'équipe a disparu, les autres restent ; le nom supprimé peut être recréé | 3, D-147 (3) | 6a | packages/api/test/lot6a-equipes.test.ts |
| EQP-6 | Chef de projet et ressource : POST, PATCH et DELETE → 403 ; base inchangée (6 refus) | 2, D-147 (3) | 6a | packages/api/test/lot6a-equipes.test.ts |
| EQP-7 | 400, base inchangée, en POST et en PATCH : nom vide, nom d'espaces seuls, nom de 101 caractères, nom absent, nom non textuel, clé inconnue en plus du nom | 3, D-147 (3) | 6a | packages/api/test/lot6a-equipes.test.ts |
| EQP-8 | 409 `{ erreur: 'Équipe déjà existante' }`, base inchangée : POST d'un nom égal à la casse près (« atelier » pour « Atelier ») ; PATCH d'une équipe vers le nom d'une autre à la casse près | 3, D-147 (2, 3) | 6a | packages/api/test/lot6a-equipes.test.ts |
| EQP-9 | DELETE d'une équipe portée par un utilisateur inactif, puis par un utilisateur actif : 409 `{ erreur: 'Équipe utilisée : suppression refusée' }`, base inchangée ; après retrait de l'équipe aux deux utilisateurs : 204 | 3, D-147 (3) | 6a | packages/api/test/lot6a-equipes.test.ts |
| EQP-10 | PATCH et DELETE d'une équipe inconnue, d'un identifiant hors plage (2147483648), de 0 et de « abc » → 404, base inchangée | 2, D-147 (3) | 6a | packages/api/test/lot6a-equipes.test.ts |
| EQP-11 | Ordre des refus, base inchangée : sans session sur équipe inconnue → 401 ; chef sur équipe inconnue → 403 ; administrateur, équipe inconnue et corps invalide → 404 ; administrateur, équipe existante, corps invalide dont le nom doublonne → 400 ; équipe existante, corps valide mais doublon → 409 | 2, D-147 (3) | 6a | packages/api/test/lot6a-equipes.test.ts |
| USR-26 | POST /api/utilisateurs avec `equipe_id` → 201 portant `equipe_id` ; sans `equipe_id` → 201, `equipe_id` null ; relus par GET /api/utilisateurs | 3, D-147 (4) | 6a | packages/api/test/lot6a-equipes.test.ts |
| USR-27 | PATCH `equipe_id` vers une autre équipe → 200 portant le nouvel identifiant ; PATCH `equipe_id: null` → 200, null ; un PATCH sans `equipe_id` ne change pas l'équipe ; relus par GET | 3, D-147 (4) | 6a | packages/api/test/lot6a-equipes.test.ts |
| USR-28 | Équipe inexistante en POST et en PATCH → 422 `{ erreur: 'Équipe inconnue' }`, base inchangée ; un calendrier inexistant garde 422 'Calendrier inconnu' (POST et PATCH), base inchangée ; `equipe_id` à 0, négatif, hors plage (2147483648), non entier ou textuel → 400, base inchangée | 2, D-147 (4) | 6a | packages/api/test/lot6a-equipes.test.ts |
| USR-29 | Garde (rouge en phase rouge faute de la route /api/equipes de sa préparation ; capacité d'échec prouvée par mutation locale en phase verte : `equipe_id` ajouté à la requête de l'annuaire, test rouge, mutation annulée) : GET /api/annuaire d'un utilisateur ayant une équipe ne contient pas `equipe_id` ni la clé `equipe` | 2, D-147 (4) | 6a | packages/api/test/lot6a-equipes.test.ts |
| USR-30 | GET /api/auth/me porte `equipe_id` : identifiant de l'équipe pour un utilisateur qui en a une (administrateur connecté), null pour un autre | 2, D-147 (4) | 6a | packages/api/test/lot6a-equipes.test.ts |
| E2E-335 | Administrateur : entrée « Équipes » de la navigation, juste après « Calendriers » ; clic : titre « Équipes » (niveau 1), adresse /equipes, tableau « Liste des équipes » aux colonnes Nom, Membres, Actions, bouton « Nouvelle équipe » | 2, D-147 (5) | 6a | e2e/tests/lot6a.spec.ts |
| E2E-336 | Chef de projet et ressource : entrée « Équipes » absente de la navigation | 2, D-147 (5) | 6a | e2e/tests/lot6a.spec.ts |
| E2E-337 | Créer une équipe par l'écran : « Nouvelle équipe », champ Nom, « Créer » ; dialogue fermé, ligne « Atelier 6a » avec Membres 0 ; base : une ligne `equipe` de ce nom ; après rechargement la ligne reste | 3, D-147 (5) | 6a | e2e/tests/lot6a.spec.ts |
| E2E-338 | Renommer par l'écran : « Renommer Atelier 6a », dialogue au champ Nom prérempli, « Enregistrer » ; ligne au nouveau nom, ancienne absente, Membres inchangé ; base : nom changé, même identifiant | 3, D-147 (5) | 6a | e2e/tests/lot6a.spec.ts |
| E2E-339 | Supprimer par l'écran : « Supprimer Atelier 6a », confirmation « Supprimer Atelier 6a ? », « Supprimer » ; ligne disparue ; base : table `equipe` vide | 3, D-147 (5) | 6a | e2e/tests/lot6a.spec.ts |
| E2E-340 | Refus doublon : création d'« atelier 6a » (casse différente) puis renommage d'une autre équipe vers ce nom : « Cette équipe existe déjà. » dans le dialogue, dialogue ouvert ; base inchangée | D-147 (5) | 6a | e2e/tests/lot6a.spec.ts |
| E2E-341 | Refus équipe utilisée : équipe portée par un utilisateur (colonne Membres 1) ; « Supprimer » puis confirmer : « Cette équipe a des membres : retirez-les d'abord. » dans la confirmation, confirmation ouverte ; base inchangée ; après retrait de l'équipe à l'utilisateur, la suppression réussit | D-147 (3, 5) | 6a | e2e/tests/lot6a.spec.ts |
| E2E-342 | Écran Utilisateurs, création : liste « Équipe » aux options « Aucune », puis les équipes triées par nom sans tenir compte de la casse (créées dans le désordre) ; « Aucune » présélectionnée ; création sans équipe : corps du POST sans `equipe_id`, colonne « Équipe » « — » ; création avec une équipe : corps du POST avec `equipe_id` (identifiant), colonne « Équipe » au nom de l'équipe | 3, D-147 (6) | 6a | e2e/tests/lot6a.spec.ts |
| E2E-343 | Écran Utilisateurs, modification : « Modifier <nom> », liste « Équipe » sur l'équipe actuelle ; enregistrer sans toucher : corps du PATCH sans `equipe_id` ; changer d'équipe : corps `{ equipe_id: <id> }` seul, colonne au nouveau nom ; choisir « Aucune » : corps `{ equipe_id: null }`, colonne « — » ; effet vérifié dans l'écran Équipes (colonne Membres) ; base relue | 3, D-147 (6) | 6a | e2e/tests/lot6a.spec.ts |
| E2E-344 | Refus 422 : liste de la modification ouverte, équipe supprimée par l'API, équipe supprimée choisie, « Enregistrer » : « Cette équipe n'existe plus. », dialogue ouvert, base inchangée ; même refus en création | D-147 (4, 6) | 6a | e2e/tests/lot6a.spec.ts |
| E2E-345 | Extension du parcours complet (administrateur seul, tout à l'écran, gestes d'E2E-317) : calendrier, équipe « Équipe 6a » créée à l'écran, ressource créée à l'écran avec cette équipe, projet, affectation, activité, assignation ; colonne « Équipe » de l'écran Utilisateurs et colonne Membres 1 de l'écran Équipes | D-147 (7), règle « Parcours IHM » | 6a | e2e/tests/lot6a.spec.ts |
| E2E-346 | Captures sans assertion fonctionnelle (ne compte pas comme test de comportement, comme E2E-334) : écran Équipes (liste, dialogue « Nouvelle équipe » avec refus doublon, confirmation de suppression refusée) ; écran Utilisateurs (colonne « Équipe », dialogue de création avec la liste « Équipe ») ; 1440 et 1024 px ; e2e/captures/equipes-*.png | D-147, D-133 (3) | 6a | e2e/tests/lot6a-captures.spec.ts |

### Couverture des champs, lot 6a (règle « Couverture des champs »)

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| POST et PATCH /api/equipes `nom` | champ « Nom » des dialogues « Nouvelle équipe » et « Renommer <nom> » | E2E-337, E2E-338, E2E-340 |
| DELETE /api/equipes/:id | bouton de ligne « Supprimer <nom> » et sa confirmation | E2E-339, E2E-341 |
| GET /api/equipes | tableau « Liste des équipes » ; liste « Équipe » de l'écran Utilisateurs | E2E-335, E2E-342 |
| POST et PATCH /api/utilisateurs `equipe_id` | liste « Équipe » (création et modification) | E2E-342, E2E-343, E2E-345 |

### Preuves de la phase rouge de 6a (D-147)

Rouges prouvés : 17 vitest (route absente 404, relation `equipe` absente, `equipe_id` absent de /api/auth/me, migration 013 absente) ; 11 e2e sur 12 (route ou entrée « Équipes » absente). E2E-336 vert d'emblée (entrée absente pour le chef et la ressource) : prouvé par mutation locale (entrée ajoutée à tous les rôles dans Layout.tsx, test rouge, `git diff` vide sur src après annulation).

## Révisions D-031 de 6a (décision du porteur, D-147 (8))

Tag `tests-lot6a-r1`, aucun code de production. Seul l'assistant `cellule` (e2e/tests/lot6a-helpers.ts) change : il attend que l'en-tête `titre` soit visible avant de lire les en-têtes du tableau. Appelants : E2E-337, E2E-338, E2E-341, E2E-342, E2E-343, E2E-345 (assertions inchangées).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-343-r1 | Révision d'E2E-343 (D-031) : ancienne attente : `cellule` lisait les en-têtes juste après `allerA(page, 'Équipes')`, avant le chargement du tableau (indice -1, échec constaté 3 fois sur 3) ; nouvelle : attente de l'en-tête exact `titre` visible avant la lecture. Valeurs attendues inchangées | D-147 (6, 8) | 6a | e2e/tests/lot6a.spec.ts |

## Tests du lot 6b, vue restreinte de la ressource (D-148)

API : `packages/api/test/lot6b-ressource.test.ts` (RES) et `packages/api/test/lot6b-mes-taches.test.ts` (MTA). Chaque refus relève toutes les tables avant et après (`refusSansEffet` sur l'empreinte de la base) : base inchangée. Valeurs attendues recopiées de SPEC « Vue restreinte de la ressource (lot 6b, D-148) » et de D-148. E2E : `e2e/tests/lot6b.spec.ts` et `e2e/tests/lot6b-captures.spec.ts`, base « administrateur seul » avant et après chaque test. Choix laissés à Claude Code (D-148 ne tranche pas) : ordre du menu de la ressource « Mes tâches », puis l'ordre actuel (Calendriers, Imputations) ; dates JJ/MM/AAAA et charges à la virgule décimale, comme le Gantt (3b point 2) ; MTA ne teste pas un sous-projet ouvert sous un projet clos (D-148 (3) ne le tranche pas).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| RES-1 | Listes sans identifiant, rôle ressource affectée : GET /api/projets et GET /api/modeles → 403 `{ erreur: 'Interdit' }` ; sans session → 401 ; base inchangée | D-148 (2) | 6b | packages/api/test/lot6b-ressource.test.ts |
| RES-2 | Projet désigné, ressource affectée au projet : GET, PATCH (corps valide et corps invalide), DELETE /api/projets/:id, POST /api/projets/:id/copie, GET …/gantt, …/travail, …/planning, …/historique → 404 ; même chose sur un modèle où elle est affectée ; base inchangée | D-148 (2) | 6b | packages/api/test/lot6b-ressource.test.ts |
| RES-3 | Éléments : GET et POST /api/projets/:id/activites et …/jalons, PATCH et DELETE /api/activites/:id et /api/jalons/:id, POST /api/elements/:id/deplacer → 404 (corps invalide compris : 404 avant 400) ; base inchangée | D-148 (2) | 6b | packages/api/test/lot6b-ressource.test.ts |
| RES-4 | Dépendances : GET et POST /api/projets/:id/dependances, PATCH et DELETE /api/dependances/:id → 404 ; base inchangée | D-148 (2) | 6b | packages/api/test/lot6b-ressource.test.ts |
| RES-5 | Affectations : GET et POST /api/projets/:id/affectations, PATCH et DELETE /api/affectations/:id (sa propre affectation) → 404 ; base inchangée | D-148 (2) | 6b | packages/api/test/lot6b-ressource.test.ts |
| RES-6 | Assignations : GET /api/projets/:id/assignations, POST /api/activites/:id/assignations, PATCH et DELETE /api/assignations/:id (sa propre assignation) → 404 ; base inchangée | D-148 (2) | 6b | packages/api/test/lot6b-ressource.test.ts |
| RES-7 | Saisies manuelles, activité MAN où elle est assignée : GET /api/activites/:id/saisies, GET …/jours-non-ouvres, PUT …/saisies (corps valide, corps invalide, mois invalide) → 404 ; base inchangée | D-148 (2) | 6b | packages/api/test/lot6b-ressource.test.ts |
| RES-8 | Témoin (vert d'emblée, prouvé par mutation) : chef de projet `est_ressource` affecté au projet d'un autre chef : GET /api/projets contient le projet (`peut_ecrire` faux), GET …/gantt 200, GET …/saisies 200, PATCH /api/projets/:id 403 ; base inchangée | D-148 (1) | 6b | packages/api/test/lot6b-ressource.test.ts |
| RES-9 | Témoin (vert d'emblée, prouvé par mutation) : administrateur `est_ressource` affecté au projet : GET /api/projets contient le projet (`peut_ecrire` vrai), GET …/gantt 200, PATCH /api/projets/:id 200 | D-148 (1) | 6b | packages/api/test/lot6b-ressource.test.ts |
| RES-10 | Témoin (vert d'emblée, prouvé par mutation) : routes inchangées pour la ressource : GET /api/auth/me 200, GET /api/feuilles?semaine=… 200 avec la ligne de son assignation, PUT /api/feuilles 200, GET /api/annuaire 200, GET /api/calendriers et /api/calendriers/:id 200, GET /api/equipes 200, GET /api/validations?semaine=… 200 `[]` (D-148 (8)) | D-148 (2, 8) | 6b | packages/api/test/lot6b-ressource.test.ts |
| MTA-1 | GET /api/mes-taches, ressource à deux assignations ouvertes (charges 2 et 3, réel 0,5 et reste 1,5 posés sur la première) : 200, deux entrées aux valeurs exactes (`assignation_id`, `projet` { code, nom }, `activite` { nom, wbs }, `charge_assignee`, `charge_reelle`, `reste_a_faire`, `debut_planifie`, `fin_planifiee`) ; la route n'écrit rien | D-148 (3) | 6b | packages/api/test/lot6b-mes-taches.test.ts |
| MTA-2 | Exclusions : activité close, projet clos, modèle (ressource affectée et assignée), assignation d'une autre ressource → absentes ; seule l'assignation ouverte reste | D-148 (3) | 6b | packages/api/test/lot6b-mes-taches.test.ts |
| MTA-3 | Tri : début planifié croissant, null en dernier ; à début égal, code du projet sans tenir compte de la casse (« a6b » avant « B6B ») ; à projet égal, numéro WBS (1 avant 2) | D-148 (3) | 6b | packages/api/test/lot6b-mes-taches.test.ts |
| MTA-4 | Dates : `debut_planifie` et `fin_planifiee` null avant calcul ; après POST /api/calcul, égales aux dates planifiées de l'activité relues en base | D-148 (3) | 6b | packages/api/test/lot6b-mes-taches.test.ts |
| MTA-5 | Liste vide : utilisateur connecté sans assignation (administrateur) → 200 `[]` ; sans session → 401 | D-148 (3) | 6b | packages/api/test/lot6b-mes-taches.test.ts |
| MTA-6 | Champs exacts : clés de chaque entrée exactement les huit de D-148 (3), de `projet` exactement { code, nom }, d'`activite` exactement { nom, wbs } ; aucune autre clé | D-148 (3, 6) | 6b | packages/api/test/lot6b-mes-taches.test.ts |
| MTA-7 | Tout utilisateur connecté : chef de projet `est_ressource` assigné sur le projet d'un autre chef → 200, sa tâche | D-148 (1, 3) | 6b | packages/api/test/lot6b-mes-taches.test.ts |
| MTA-8 | Exclusions de D-148 (10) : activité sous une activité ancêtre close (clôture forcée en base) et activité d'un projet sous un projet ancêtre clos (forcée en base) → absentes ; une tâche ouverte témoin reste | D-148 (10) | 6b | packages/api/test/lot6b-mes-taches.test.ts |
| E2E-347 | Menu du rôle ressource : liens de la Navigation principale exactement « Mes tâches », « Calendriers », « Imputations », « Mes tâches » en tête ; ni Accueil, ni Projets, ni Modèles, ni Validation | D-148 (4, 5) | 6b | e2e/tests/lot6b.spec.ts |
| E2E-348 | Redirections du rôle ressource : après connexion, adresse /mes-taches ; « / », /projets, /projets/<id>, /projets/<id>/planning-manuel/<id>, /modeles et /validation → /mes-taches, titre « Mes tâches » ; aucune requête vers /api/projets, /api/modeles ni /api/validations | D-148 (5) | 6b | e2e/tests/lot6b.spec.ts |
| E2E-349 | Écran Mes tâches, contenu : tableau « Mes tâches » aux colonnes Projet, Activité, Début, Fin, Assigné, Réel, Reste ; lignes dans l'ordre de l'API ; Projet = code avec `title` = nom ; Début et Fin JJ/MM/AAAA après calcul, « — » avant calcul (deux projets) ; charges à la virgule décimale ; aucun bouton | D-148 (4) | 6b | e2e/tests/lot6b.spec.ts |
| E2E-350 | Écran Mes tâches, état vide : ressource sans assignation : « Aucune tâche en cours. », sans tableau | D-148 (4) | 6b | e2e/tests/lot6b.spec.ts |
| E2E-351 | Écran Mes tâches, échec : GET /api/mes-taches intercepté en 500 : « Impossible de charger vos tâches. », sans tableau | D-148 (4) | 6b | e2e/tests/lot6b.spec.ts |
| E2E-352 | Chef de projet `est_ressource` : « Mes tâches » en tête du menu, Accueil, Projets, Validation et Modèles toujours là ; clic : /mes-taches avec sa tâche ; administrateur non ressource : pas d'entrée « Mes tâches » | D-148 (1, 4, 5) | 6b | e2e/tests/lot6b.spec.ts |
| E2E-353 | Extension du parcours complet (administrateur seul, tout à l'écran) : l'administrateur crée la ressource, le chef et le projet ; le chef affecte la ressource, crée l'activité et l'assigne (2 j) à l'écran ; la ressource se connecte et voit la tâche dans Mes tâches (code, activité, « — », 2, 0, 2) ; base relue | D-148 (4), règle « Parcours IHM » | 6b | e2e/tests/lot6b.spec.ts |
| E2E-354 | Témoin (vert d'emblée, prouvé par mutation) : Feuille de temps de la ressource inchangée : entrée « Imputations », titre « Feuille de temps », ligne de son assignation, saisie de 0,5, « Feuille enregistrée. », relue par l'API | D-148 (2), §7 | 6b | e2e/tests/lot6b.spec.ts |
| E2E-355 | Captures sans assertion fonctionnelle (ne compte pas comme test de comportement) : Mes tâches (contenu, état vide), menu de la ressource ; 1440 et 1024 px ; e2e/captures/mes-taches-*.png | D-148 (4, 5), D-133 (3) | 6b | e2e/tests/lot6b-captures.spec.ts |
| E2E-356 | Utilisateur de rôle ressource non `est_ressource` : entrée « Mes tâches » présente, « Imputations » absente, état vide « Aucune tâche en cours. » | D-148 (11) | 6b | e2e/tests/lot6b.spec.ts |
| E2E-357 | Page d'arrivée après connexion : administrateur, chef de projet non ressource et chef ressource → « / » (Accueil) ; ressource → /mes-taches | D-148 (11) | 6b | e2e/tests/lot6b.spec.ts |

### Couverture des champs, lot 6b (règle « Couverture des champs »)

Aucun champ modifiable nouveau : GET /api/mes-taches est en lecture seule, affiché par l'écran Mes tâches (E2E-349, E2E-353).

## Révisions D-031 de 6b (décision du porteur, D-148 (7), (9))

Tag `tests-lot6b`, aucun code de production. Assistants révisés, appelants sans changement d'assertion : `connecterAvec` (e2e/tests/lot1-helpers.ts) attend l'adresse « / » ou « /mes-taches » après la connexion (la ressource est redirigée, D-148 (5)) ; nouvel assistant `chefLecteur` (e2e/tests/lot6b-helpers.ts) : chef de projet `est_ressource` affecté au projet d'un autre chef (D-148 (9)). Assistants vitest révisés : `verifierRefus` (lot1-t2-helpers.ts) et `trio` (lot1-complements.test.ts), ressource affectée 403 → 404.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| ACT-12-r1 | Ancienne : ressource affectée → 403 en POST, PATCH, DELETE (`verifierRefus`) ; nouvelle : 404, base inchangée | D-148 (2) | 6b | packages/api/test/lot1-act.test.ts |
| ACT-13-r1 | Ancienne : la ressource affectée lit les activités (200) ; nouvelle : 404 ; non affectée 404 inchangé | D-148 (2) | 6b | packages/api/test/lot1-act.test.ts |
| ASS-9-r1 | Ancienne : ressource affectée → 403 (`verifierRefus`) ; nouvelle : 404 | D-148 (2) | 6b | packages/api/test/lot1-ass.test.ts |
| ASS-10-r1 | Ancienne : la ressource affectée lit les assignations (200) ; nouvelle : 404 | D-148 (2) | 6b | packages/api/test/lot1-ass.test.ts |
| JLN-6-r1 | Ancienne : ressource affectée → 403 (`verifierRefus`) ; nouvelle : 404 | D-148 (2) | 6b | packages/api/test/lot1-jln.test.ts |
| JLN-7-r1 | Ancienne : la ressource lit les jalons de son projet (200) ; nouvelle : 404 | D-148 (2) | 6b | packages/api/test/lot1-jln.test.ts |
| LIEN-11-r1 | Ancienne : ressource affectée → 403 en écriture, 200 en lecture ; nouvelle : 404 et 404 | D-148 (2) | 6b | packages/api/test/lot1-lien.test.ts |
| WBS-8-r1 | Ancienne : déplacer, ressource affectée → 403 (`verifierRefus`) ; nouvelle : 404 | D-148 (2) | 6b | packages/api/test/lot1-wbs.test.ts |
| AFF-3-r2 | Ancienne : ressource affectée → 403 en POST, PATCH, DELETE d'affectation ; nouvelle : 404, base inchangée | D-148 (2) | 6b | packages/api/test/lot1-aff.test.ts |
| AFF-4-r1 | Ancienne : la ressource voit les affectations de son projet (200) ; nouvelle : 404 ; projet non affecté 404 inchangé | D-148 (2) | 6b | packages/api/test/lot1-aff.test.ts |
| REF-1-r1 | Ancienne : ressource affectée → 403 sur PATCH /api/projets/:id et dans `trio` (DELETE projet, POST, PATCH, DELETE affectation) ; nouvelle : 404 ; POST /api/projets et écritures de calendriers par la ressource : 403 inchangé ; empreinte de la base inchangée | D-148 (2) | 6b | packages/api/test/lot1-complements.test.ts |
| REF-2-r1 | Ancienne : ressource affectée → 403 dans `trio` (activités, jalons, déplacer, dépendances, assignations) ; nouvelle : 404 ; empreinte inchangée | D-148 (2) | 6b | packages/api/test/lot1-complements.test.ts |
| PRJ-7-r2 | Ancienne : GET /api/projets = [projet affecté], GET de la fiche 200, PATCH et DELETE 403 ; nouvelle : GET /api/projets 403, fiche 404, PATCH et DELETE 404 ; projet non affecté 404 et POST /api/projets 403 inchangés ; base inchangée | D-148 (2) | 6b | packages/api/test/lot1-prj.test.ts |
| PRJ-19-r1 | Ancienne : ressource affectée → 403 en PATCH et DELETE ; nouvelle : 404, rien de modifié ni supprimé | D-148 (2) | 6b | packages/api/test/lot1-prj-t2.test.ts |
| PRJ-22-r1 | Ancienne : `peut_ecrire` faux pour la ressource dans la liste et la fiche ; nouvelle : liste 403, fiche 404 ; valeurs de l'administrateur et du chef inchangées | D-148 (2) | 6b | packages/api/test/lot1-pe.test.ts |
| HIS-12-r1 | Ancienne : PATCH projet, PATCH activité, PATCH assignation, DELETE activité par la ressource → 403 ; nouvelle : 404 ; aucune entrée d'historique | D-148 (2) | 6b | packages/api/test/lot1-his.test.ts |
| HIS-13-r1 | Ancienne : historique d'un projet, ressource affectée → 403 ; nouvelle : 404 ; historique transversal 403 inchangé | D-148 (2) | 6b | packages/api/test/lot1-his.test.ts |
| COPIE-8-r1 | Ancienne : copie par la ressource affectée → 403 ; nouvelle : 404, base inchangée | D-148 (2) | 6b | packages/api/test/lot1b-copie.test.ts |
| MOD-9-r1 | Ancienne : GET /api/projets de la ressource = [] ; nouvelle : 403 ; GET /api/modeles 403 et 404 sur le modèle inchangés | D-148 (2) | 6b | packages/api/test/lot1b-mod.test.ts |
| GANTT-8-r1 | Ancienne : ressource affectée → 200, `peut_ecrire` faux ; nouvelle : 404 ; autres cas inchangés | D-148 (2) | 6b | packages/api/test/lot3a-gantt.test.ts |
| GANTT-9-r1 | Ancienne : Alice (ressource) lit P, `sous_projets` vide ; nouvelle : Alice 404 ; un chef de projet affecté à P seul lit P, `sous_projets` vide ; administrateur inchangé | D-148 (2, 9) | 6b | packages/api/test/lot3a-gantt.test.ts |
| TRAV-5-r1 | Ancienne : Alice (ressource affectée) 200, mêmes lignes ; nouvelle : Alice 404 ; chef et administrateur inchangés | D-148 (2) | 6b | packages/api/test/lot3g-travail.test.ts |
| SAI-7-r1 | Ancienne : GET des saisies par la ressource affectée 200, PUT 403 ; nouvelle : 404 et 404 | D-148 (2) | 6b | packages/api/test/lot2e-saisies.test.ts |
| SAI-10-r1 | Ancienne : ressource affectée → 403 avant 400 et avant 422 ; nouvelle : ressource affectée → 404 ; l'ordre 403 avant 400 et avant 422 est vérifié avec un chef de projet affecté au projet d'un autre chef | D-148 (2, 9) | 6b | packages/api/test/lot2e-saisies.test.ts |
| SAI-24-r1 | Ancienne : GET …/jours-non-ouvres, ressource affectée 200 ; nouvelle : 404 | D-148 (2) | 6b | packages/api/test/rex3a-saisies.test.ts |
| E2E-10-r1 | Ancienne : la ressource consulte Projets et la fiche sans bouton d'écriture ; nouvelle : même parcours et mêmes assertions par un chef de projet affecté au projet d'un autre chef | D-148 (9) | 6b | e2e/tests/lot1.spec.ts |
| E2E-13-r1 | Ancienne : la ressource a le lien « Projets » ; nouvelle : ni « Projets » ni « Modèles » | D-148 (5) | 6b | e2e/tests/lot1b.spec.ts |
| E2E-23-r1 | Ancienne : la ressource lit Projets, la fiche et Affectations sans bouton d'écriture ; nouvelle : chef lecteur ; partie modèle inchangée | D-148 (9) | 6b | e2e/tests/lot1b-c.spec.ts |
| E2E-29-r1 | Ancienne : Alice (ressource) voit la grille du planning manuel désactivée ; nouvelle : chef lecteur ; activité close et ASAP inchangées | D-148 (9) | 6b | e2e/tests/lot2e.spec.ts |
| E2E-38-r2 | Ancienne : Alice voit P sans P1 et sans bouton d'écriture ; nouvelle : chef lecteur affecté à P seul | D-148 (9) | 6b | e2e/tests/lot3b.spec.ts |
| E2E-64-r1 | Ancienne : pas de « Calculer » pour la ressource et le chef lecteur ; nouvelle : chef lecteur seul (la ressource n'ouvre plus le Gantt) | D-148 (9) | 6b | e2e/tests/lot3c.spec.ts |
| E2E-83-r1 | Ancienne : la ressource voit le sous-projet comme racine, en lecture seule ; nouvelle : chef lecteur affecté au sous-projet seul | D-148 (9) | 6b | e2e/tests/rex2c.spec.ts |
| E2E-91-r1 | Ancienne : Accueil d'une ressource affectée au sous-projet seul ; nouvelle : chef lecteur affecté au sous-projet seul (racine S91, « Calculer » absent) | D-148 (9) | 6b | e2e/tests/accueil-g2.spec.ts |
| E2E-105-r1 | Ancienne : projet affiché sans « Calculer » pour la ressource et le chef lecteur ; nouvelle : chef lecteur seul | D-148 (9) | 6b | e2e/tests/accueil-g4.spec.ts |
| E2E-139-r1 | Ancienne : ressource sans geste ni poignée ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/lot3d3a.spec.ts |
| E2E-150-r1 | Ancienne : ressource, barre active sans dialogue ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/lot3d3b.spec.ts |
| E2E-158-r1 | Ancienne : case « Recalcul automatique » absente pour la ressource ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/lot3d4.spec.ts |
| E2E-171-r1 | Ancienne : aucun connecteur pour la ressource ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/lot3e.spec.ts |
| E2E-178-r2 | Ancienne : sans droit d'écriture (ressource), ni dialogue ni curseur pointer ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/lot3e.spec.ts |
| E2E-181-r1 | Ancienne : aucune poignée de ligne pour la ressource ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/lot3f1.spec.ts |
| E2E-189-r1 | Ancienne : la ressource n'a pas de bouton « Déplacer » ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/lot3f1.spec.ts |
| E2E-195-r1 | Ancienne : aucun menu contextuel pour la ressource (Gantt), Accueil vu par l'administrateur ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/lot3f2.spec.ts |
| E2E-197-r1 | Ancienne : Maj+F10 et touche Menu sans menu pour la ressource ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/lot3f2.spec.ts |
| E2E-204-r1 | Ancienne : pas de bouton « Copier » pour la ressource ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/lot3f2.spec.ts |
| E2E-218-r1 | Ancienne : planning manuel en lecture seule pour la ressource ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/lot3g.spec.ts |
| E2E-249-r1 | Ancienne : sans droit d'écriture (ressource), noms en texte dans l'onglet Planning ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/rex3a.spec.ts |
| E2E-266-r1 | Ancienne : ressource affectée, « Annuler » présent et désactivé ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/rex3b.spec.ts |
| E2E-276-r1 | Ancienne : ressource, noms en texte sur l'Accueil et dans l'onglet Gantt ; nouvelle : chef lecteur | D-148 (9) | 6b | e2e/tests/rex3b-modif.spec.ts |
| E2E-319-r1 | Ancienne : la ressource ouvre /validation et lit « Accès réservé aux chefs de projet et aux administrateurs. » ; nouvelle : /validation redirige vers /mes-taches ; aucun appel à /api/validations (inchangé) | D-148 (5) | 6b | e2e/tests/lot4c.spec.ts |
| E2E-53-r1 | Ancienne : connexion réussie = lien « Accueil » affiché ; nouvelle : lien « Accueil » ou « Mes tâches » (ressource créée à l'écran) | D-148 (5) | 6b | e2e/tests/rex1.spec.ts |
| E2E-69-r1 | Idem E2E-53-r1 (assistant `seConnecter`) | D-148 (5) | 6b | e2e/tests/rex2.spec.ts |
| E2E-70-r1 | Idem E2E-53-r1 | D-148 (5) | 6b | e2e/tests/rex2.spec.ts |
| E2E-71-r1 | Idem E2E-53-r1 (assistant `seConnecter` de rex2d) | D-148 (5) | 6b | e2e/tests/rex2d.spec.ts |
| E2E-72-r1 | Idem E2E-71-r1 | D-148 (5) | 6b | e2e/tests/rex2d.spec.ts |

Tests inchangés relevés à l'inventaire (attente identique sous D-148) : CALC-4 (calcul par la ressource, 403 par le rôle), MOD-16 (404), CAL-6-r1 et EQP-6 (403 en écriture), VAL-3 (liste vide, D-148 (8)), lots 4a et 4b (feuille de temps), E2E-299 et E2E-336 (menu : Imputations présent, Validation et Équipes absents), E2E de la Feuille de temps (via `connecterAvec`).

### Preuves de la phase rouge de 6b (D-148)

- Vitest révisés : 25 rouges (403 ou 200 au lieu de 404, 200 au lieu de 403 sur GET /api/projets). Nouveaux : RES-1 à RES-7 rouges (la ressource lit ou reçoit 403 au lieu de 404, 200 au lieu de 403), MTA-1 à MTA-7 rouges (route GET /api/mes-taches absente, 404). RES-8 à RES-10 verts d'emblée, prouvés par mutation locale : visibilité par affectation retirée aux non-administrateurs (RES-8), projets où l'administrateur est affecté retirés de sa portée (RES-9), GET /api/validations refusée au rôle ressource (RES-10) ; trois rouges, mutations annulées.
- E2E révisés : E2E-13-r1 (lien « Projets » présent) et E2E-319-r1 (pas de redirection) rouges. Témoins verts d'emblée : les 22 tests au chef lecteur (dont E2E-64-r1 et E2E-105-r1), prouvés par mutation locale (`peut_ecrire` toujours vrai dans `lireVisibles`) : 21 rouges ; E2E-266-r1, vert sous cette mutation (« Annuler » désactivé faute de geste), prouvé par une seconde mutation (« Annuler » masqué sans droit d'écriture) ; E2E-53-r1, 69-r1, 70-r1, 71-r1, 72-r1 prouvés par mutation (lien « Accueil » retiré) : rouges. E2E-150-r1 : le chef lecteur est affecté à P et au sous-projet S (Alice l'était aussi ; le préambule exige la barre de S).
- Nouveaux e2e : E2E-347 à E2E-353 et E2E-355 rouges (menu, redirection, écran « Mes tâches » absents ; E2E-353 passe toute la chaîne à l'écran et échoue à la redirection finale de la ressource). E2E-354 vert d'emblée, prouvé par mutation (« Imputations » masqué pour le rôle ressource) : rouge.
- Après chaque mutation : `git diff` vide sur packages/api/src et packages/web/src. Lint et typecheck verts.

## Révisions D-031 de 6c (décision du porteur, D-149 (12))

Tag `tests-lot6c`, aucun code de production. Inventaire : seule la forme exacte de la réponse de GET …/gantt (comparée par `toEqual`) change ; elle gagne, pour l'administrateur, `charge_vendue` et `marge` (null) sur chaque activité, `date_client`, `ecart_client` (null) et `engagement_depasse` (faux) sur chaque jalon, `projet.totaux`. Aucun test existant ne compare la forme exacte d'une activité ou d'un jalon (POST, PATCH, planning, activités, jalons), ni la liste des colonnes du Gantt (les e2e lisent les colonnes par leur nom). Tests de largeurs (E2E-41a à E2E-42, E2E-288, E2E-289) : attente inchangée, ils sont relancés avec les nouvelles colonnes et ne sont révisés que s'ils échouent.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GANTT-1-r2 | Ancienne : forme complète sans les champs de 6c ; nouvelle : même scénario, l'administrateur reçoit en plus `charge_vendue` null et `marge` null (activités), `date_client` null, `ecart_client` null et `engagement_depasse` faux (jalon), `projet.totaux` { charge_vendue null, charge_assignee 2, marge null, charge_reelle 0 } ; ordre, WBS, dates et drapeaux inchangés | D-149 (4, 5) | 6c | packages/api/test/lot3a-gantt.test.ts |

Révisions de la phase verte (D-151), tags `tests-lot6c-r1` à `tests-lot6c-r4`, une par commit :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| VND-8-r1 | Ancienne : Alice assignée dans le sous-projet sans y être affectée (422 à la préparation) ; nouvelle : Alice affectée au sous-projet avant ; valeurs attendues inchangées | D-151 (1) | 6c | packages/api/test/lot6c-vendu.test.ts |
| MOT-1-r1 | Ancienne : Alice assignée dans le second projet sans y être affectée (422) ; nouvelle : Alice affectée au second projet ; attentes inchangées | D-151 (2) | 6c | packages/api/test/lot6c-vendu.test.ts |
| DEMO-5-r1 | Ancienne : les activités à charge vendue non null comptaient le parent ; nouvelle : seules les activités dont est_parent est faux comptent « deux feuilles vendues » ; le parent porte la somme (D-149 (5)) | D-151 (3) | 6c | packages/api/test/demo.test.ts |
| VIS-5-r1 | Ancienne : GET /api/validations sans paramètre (400) ; nouvelle : GET /api/validations?semaine=<lundi> (D-118 (9)) ; attentes inchangées | D-151 (4) | 6c | packages/api/test/lot6c-visibilite.test.ts |
| MOT-1-r2 | Ancienne (MOT-1-r1) : Alice assignée dans les deux projets, calculés ensemble (capacité disputée, second projet décalé du 04/01 au 07/01) ; nouvelle : le second projet assigne Bob, affecté à ce projet ; l'affectation d'Alice au second projet est retirée ; attentes inchangées | D-152 | 6c | packages/api/test/lot6c-vendu.test.ts |
| E2E-362-r1 | Ancienne : le projet vide s'ouvrait par `ouvrirGantt` (attente du SVG, absent sans élément) ; nouvelle : `page.goto` sur /projets/<id>?onglet=gantt, attente de la région « Totaux du projet » par toHaveText ; attentes inchangées | D-153 (1) | 6c | e2e/tests/lot6c.spec.ts |
| E2E-366-r1 | Ancienne : aucun en-tête recouvert par Drapeaux, aux deux largeurs ; nouvelle : tous les en-têtes à 1440 px, WBS et Nom seulement à 1024 px (D-069 (b)) ; (a), (c), (d) inchangées | D-153 (2) | 6c | e2e/tests/lot6c.spec.ts |
| E2E-367-r1 | Ancienne : ligne du jalon repérée par `getByRole('cell', { name: 'Jalon 367', exact: true })` ; nouvelle : `getByRole('button', { name: 'Jalon 367', exact: true })` ; attentes inchangées | D-153 (3) | 6c | e2e/tests/lot6c.spec.ts |

## Tests du lot 6c, charge vendue et date client (D-149)

Fichiers : packages/api/test/lot6c-vendu.test.ts, lot6c-client.test.ts, lot6c-visibilite.test.ts, lot6c-copie.test.ts ; packages/web/test/lot6c.test.ts ; e2e/tests/lot6c.spec.ts. Valeurs attendues recopiées de D-149. Tout refus vérifie que la base est inchangée (empreinte).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| MIG-10 | Migration 014 : base amenée à la version 13 avec une activité et un jalon, puis migration (version 14) : `activite.charge_vendue` numeric(10,2) nullable et `jalon.date_client` date nullable, valeurs existantes null ; un UPDATE SQL à −0,01 est refusé par le CHECK ; 0 et 999999,99 acceptés | D-149 (2) | 6c | packages/api/test/lot6c-vendu.test.ts |
| VND-1 | POST et PATCH d'une activité feuille avec `charge_vendue` 0, 12,5, 999999,99 puis null : 201 ou 200, valeur renvoyée et relue en base ; absente du corps : null | D-149 (3) | 6c | packages/api/test/lot6c-vendu.test.ts |
| VND-2 | `charge_vendue` −1, −0,01, 1000000, 1.234, « 12 », « abc », true, [], {} en POST et en PATCH : 400, base inchangée | D-149 (3) | 6c | packages/api/test/lot6c-vendu.test.ts |
| VND-3 | PATCH d'une activité parente avec `charge_vendue` 5 : 422 { erreur: 'Règle de planning non respectée', code: 'activite_parente' }, base inchangée ; avec null : 200 | D-149 (3) | 6c | packages/api/test/lot6c-vendu.test.ts |
| VND-4 | Parent vendu : POST d'une activité et d'un jalon sous une activité à `charge_vendue` 5, et déplacement d'un élément sous elle : 422 { erreur: 'Règle de planning non respectée', code: 'parent_vendu' }, base inchangée ; sous une activité à `charge_vendue` null : 201 et 200 | D-149 (3) | 6c | packages/api/test/lot6c-vendu.test.ts |
| VND-5 | Historique : création avec 8, modification 8 → 10 (une entrée, ancienne 8, nouvelle 10), PATCH à 10 sans changement (aucune entrée), remise à null (ancienne 10, nouvelle null) | D-149 (2) | 6c | packages/api/test/lot6c-vendu.test.ts |
| VND-6 | Marge d'une feuille, GET …/gantt et …/planning (administrateur) : vendue 10 et assignée 4 → 6 ; vendue 3 et assignée 4 → −1 ; vendue null → `marge` null ; vendue 5 sans assignation → 5 | D-149 (5) | 6c | packages/api/test/lot6c-vendu.test.ts |
| VND-7 | Parent à trois feuilles (vendue 10 assignée 4 ; vendue 3 assignée 4 ; vendue null assignée 5) : `charge_vendue` 13, `marge` 5 ; parent dont aucune feuille n'est renseignée : null et null ; parent imbriqué : somme des feuilles descendantes | D-149 (5) | 6c | packages/api/test/lot6c-vendu.test.ts |
| VND-8 | `projet.totaux` : trois feuilles renseignées (10 assignée 4 réel 1 ; 3 assignée 4 ; 2 assignée 1, close), un sous-projet avec une feuille vendue exclu : { charge_vendue 15, charge_assignee 9, marge 6, charge_reelle 1 } ; projet sans activité : { charge_vendue null, charge_assignee 0, marge null, charge_reelle 0 } | D-149 (5) | 6c | packages/api/test/lot6c-vendu.test.ts |
| VND-9 | Modèles : POST et PATCH d'une activité et d'un jalon d'un modèle acceptent `charge_vendue` et `date_client` (administrateur) | D-149 (3) | 6c | packages/api/test/lot6c-vendu.test.ts |
| VND-10 | `projet.totaux` avec une feuille non vendue assignée : feuille vendue 10 assignée 4, feuille non vendue (null) assignée 5 : { charge_vendue 10, charge_assignee 9, marge 6, charge_reelle 0 } (GET …/gantt, administrateur) | D-150 (2) | 6c | packages/api/test/lot6c-vendu.test.ts |
| CLT-1 | POST et PATCH d'un jalon flottant et d'un jalon fixe avec `date_client` « 2027-01-20 », « 2099-12-31 » puis null : valeur renvoyée et relue ; absente du corps : null | D-149 (3) | 6c | packages/api/test/lot6c-client.test.ts |
| CLT-2 | `date_client` « 2100-01-01 », « 2027-13-01 », « 2027-02-30 », « 20/01/2027 », 5, true, « » en POST et en PATCH : 400, base inchangée | D-149 (3) | 6c | packages/api/test/lot6c-client.test.ts |
| CLT-3 | Après calcul, jalon planifié le 2027-01-08 : date client 2027-01-06 → ecart_client 2, engagement_depasse vrai ; 2027-01-08 → 0, faux ; 2027-01-11 → −3, faux ; sans date client → null, faux ; jalon non calculé (date planifiée null) → null, faux ; `drapeaux` du jalon inchangés | D-149 (5) | 6c | packages/api/test/lot6c-client.test.ts |
| CLT-4 | Historique : création avec date client, modification, PATCH sans changement (aucune entrée), remise à null | D-149 (2) | 6c | packages/api/test/lot6c-client.test.ts |
| VIS-1 | Chef de projet en lecture seule (affecté au projet d'un autre chef) : GET …/gantt et …/planning sans les clés `charge_vendue`, `marge`, `date_client`, `ecart_client`, `engagement_depasse` ni `projet.totaux` (clés absentes, pas null), champs ordinaires présents ; les mêmes données vues par l'administrateur portent les clés | D-149 (4, 11) | 6c | packages/api/test/lot6c-visibilite.test.ts |
| VIS-2 | GET …/activites et …/jalons : clés absentes pour le chef lecteur, présentes pour l'administrateur | D-149 (4) | 6c | packages/api/test/lot6c-visibilite.test.ts |
| VIS-3 | Écrivains (administrateur, chef du projet) : clés présentes, null compris, dans …/gantt, …/planning, et dans les réponses des POST et PATCH d'activités et de jalons | D-149 (4) | 6c | packages/api/test/lot6c-visibilite.test.ts |
| VIS-4 | Rôle ressource : …/gantt, …/planning, …/activites, …/jalons 404 (inchangé) ; GET /api/mes-taches sans clé `charge_vendue` ni `marge` malgré une charge vendue en base. Témoin : rouge en phase rouge (la préparation pose une charge vendue, refusée en 400 sans la migration 014), vert attendu en phase verte, prouvé par mutation | D-149 (4), D-148 (6) | 6c | packages/api/test/lot6c-visibilite.test.ts |
| VIS-5 | Routes inchangées, avec une charge vendue et une date client en base : GET /api/projets (aucune clé de 6c, ni `totaux`), …/travail, GET /api/validations et GET /api/feuilles sans clé de 6c. Témoin : rouge en phase rouge (même préparation que VIS-4), vert attendu en phase verte, prouvé par mutation | D-149 (4) | 6c | packages/api/test/lot6c-visibilite.test.ts |
| CPY-1 | Copie d'un projet (début 2027-01-04 vers 2027-01-18, delta 14) : `charge_vendue` copiée (10 et null) ; `date_client` 2027-01-20 → 2027-02-03, null → null ; source inchangée | D-149 (6) | 6c | packages/api/test/lot6c-copie.test.ts |
| CPY-2 | `date_client` 2099-12-25 décalée de 16 jours (au-delà du 31/12/2099) : copie refusée 422, aucun projet créé, base inchangée ; les dates validées seules ne dépassent pas | D-149 (6) | 6c | packages/api/test/lot6c-copie.test.ts |
| CPY-3 | Variantes : « Créer depuis un modèle » et « Enregistrer comme modèle » copient `charge_vendue` et décalent `date_client` comme CPY-1 | D-149 (6) | 6c | packages/api/test/lot6c-copie.test.ts |
| MOT-1 | Caractérisation du moteur : deux projets identiques, l'un avec charge vendue et date client, après POST /api/calcul : travail planifié, dates planifiées et drapeaux identiques. Rouge tant que les champs sont refusés (400) | D-149 (1, 11) | 6c | packages/api/test/lot6c-vendu.test.ts |
| DEMO-5 | Après `remplirDemo` : deux feuilles de DEMO-R portent une charge vendue, l'une de marge positive, l'autre de marge négative (après calcul) ; un jalon de DEMO-R porte une date client antérieure à sa date planifiée (engagement dépassé) ; aucun autre projet n'en porte | D-149 (9) | 6c | packages/api/test/demo.test.ts |
| GEO-36 | `analyserChargeVendue(texte)` → { ok: true, valeur } ou { ok: false } : « 12,5 » et « 12.5 » → 12,5 ; « 0 » → 0 ; « 999999,99 » → 999999,99 ; vide ou espaces → { ok: true, valeur: null } ; « -1 », « abc », « 1,234 », « 1000000 », « 1e3 », « 1,2,3 » → { ok: false } | D-149 (7) | 6c | packages/web/test/lot6c.test.ts |
| GEO-37 | `texteTotaux(totaux)` : { 10, 4, 6, 1 } → « Vendu 10 j · Assigné 4 j · Marge 6 j · Réel 1 j » ; { 12,5, 4, 8,5, 0 } → « Vendu 12,5 j · Assigné 4 j · Marge 8,5 j · Réel 0 j » ; vendu et marge null → « Vendu — j · Assigné 4 j · Marge — j · Réel 0 j » ; marge négative −1 → « Marge −1 j » (signe moins typographique) | D-149 (8a) | 6c | packages/web/test/lot6c.test.ts |
| GEO-38 | `formaterEcartClient(ecart)` : 2 → « +2 j » ; −3 → « −3 j » (signe moins typographique) ; 0 → « 0 j » | D-149 (8c) | 6c | packages/web/test/lot6c.test.ts |
| GEO-39 | `nomJalon(nom, date, drapeaux, client?)` avec `client` { date, ecart, depasse } : « Jalon, le 08/01/2027, date client 06/01/2027, écart +2 j, engagement client dépassé » ; en retard : « Jalon, le 08/01/2027, retard, date client 11/01/2027, écart −3 j » ; écart 0 : « …, date client 08/01/2027, écart 0 j » ; sans `client` : inchangé (GEO-9) | D-149 (8e) | 6c | packages/web/test/lot6c.test.ts |
| GEO-40 | `joursClient(lignes)` : dates client des jalons de `lignes` (hors lignes sans date client) ; `calculerPlage` avec ces jours : date client 2027-03-10 postérieure aux autres dates → fin de plage au dimanche de sa semaine plus 14 jours ; `joursConnus` reste inchangée (Accueil) | D-149 (8c) | 6c | packages/web/test/lot6c.test.ts |
| GEO-41 | `texteRefusCode` : 'activite_parente' → « Une activité parente ne porte pas de charge vendue. » et 'parent_vendu' → « Cette activité porte une charge vendue : elle ne peut pas recevoir d'enfant. » pour la cible 'element' ; null pour la cible 'projet' | D-149 (7) | 6c | packages/web/test/lot6c.test.ts |
| E2E-358 | Extension du parcours complet (administrateur seul, tout à l'écran, gestes d'E2E-353) : calendrier, ressource, chef, projet, affectation, activité assignée 4 j puis charge vendue 6,5 saisie à l'écran, jalon puis date client saisie à l'écran ; Gantt du projet : colonnes « Vendu » 6,5 et « Marge » 2,5, région « Totaux du projet » « Vendu 6,5 j · Assigné 4 j · Marge 2,5 j · Réel 0 j », marqueur `data-date-client` ; base relue par l'API | D-149 (10), règle « Parcours IHM » | 6c | e2e/tests/lot6c.spec.ts |
| E2E-359 | Dialogue d'activité (création et modification) : champ « Charge vendue (j) » présent pour une feuille, absent pour une activité parente ; « 1,234 » et « abc » : `aria-invalid`, « Charge vendue invalide. », « Enregistrer » désactivé ; « 6,5 » (virgule) enregistré 6,5 ; vide enregistré null ; modification sans changer la charge vendue : le corps du PATCH ne contient pas `charge_vendue` | D-149 (7) | 6c | e2e/tests/lot6c.spec.ts |
| E2E-360 | Dialogue « Modifier le jalon » : champ « Date client » (date), vide au départ ; valeur enregistrée relue par l'API ; vidé : null ; ouvert depuis l'onglet Planning et depuis le Gantt (double-clic). Le dialogue « Nouveau jalon » reste limité au nom (comme la date validée) | D-149 (7) | 6c | e2e/tests/lot6c.spec.ts |
| E2E-361 | Refus : créer une activité sous une activité vendue (par l'écran) : « Cette activité porte une charge vendue : elle ne peut pas recevoir d'enfant. », dialogue ouvert, rien créé ; PATCH intercepté en 422 'activite_parente' : « Une activité parente ne porte pas de charge vendue. », dialogue ouvert | D-149 (7) | 6c | e2e/tests/lot6c.spec.ts |
| E2E-362 | Gantt du projet (administrateur) : colonnes « Vendu » et « Marge » après « Charge » ; activité à vendue 3 et assignée 4 : « 3 » et « −1 » en couleur flag ; activité sans charge vendue : « — » ; jalon : cellules vides ; parent : somme ; région « Totaux du projet » au-dessus du tableau, avec « — » pour un projet sans charge vendue | D-149 (8a, 8b) | 6c | e2e/tests/lot6c.spec.ts |
| E2E-363 | Jalon planifié le 08/01/2027 avec date client 06/01/2027 : losange `data-date-client` à la position du 06/01 (même ligne que le jalon), `aria-hidden`, `pointer-events: none`, couleur flag ; texte `data-ecart-client` « +2 j » à droite du losange le plus à droite ; badge « Client » (`title` « Engagement client dépassé ») dans Drapeaux ; nom accessible « Jalon, le 08/01/2027, date client 06/01/2027, écart +2 j, engagement client dépassé » ; date client 11/01/2027 : « −3 j », couleur neutre, pas de badge | D-149 (8c, 8d, 8e) | 6c | e2e/tests/lot6c.spec.ts |
| E2E-364 | La plage du Gantt inclut la date client : date client très postérieure (08/03/2027), losange présent dans le SVG et à l'intérieur de sa largeur | D-149 (8c) | 6c | e2e/tests/lot6c.spec.ts |
| E2E-365 | Témoin, chef de projet en lecture seule : ni colonnes « Vendu » et « Marge », ni région « Totaux du projet », ni losange `data-date-client`, ni texte `data-ecart-client`, ni badge « Client » ; les réponses …/gantt et …/planning reçues par la page sans les clés | D-149 (11) | 6c | e2e/tests/lot6c.spec.ts |
| E2E-366 | Largeurs D-069 (a) à (d) avec les nouvelles colonnes, à 1440 puis 1024 px (administrateur, projet à charge vendue, marge négative et badge « Client ») : badges entièrement visibles, WBS et Nom visibles, page sans défilement horizontal, hauteur de ligne à badge égale à celle d'une ligne sans badge | D-149 (8b), D-069 | 6c | e2e/tests/lot6c.spec.ts |
| E2E-367 | Témoin, Accueil inchangé : Gantt global de l'Accueil sans colonne « Vendu » ni « Marge », sans région « Totaux du projet » et sans marqueur client, pour un projet qui porte charge vendue et date client | D-149 (4, 8) | 6c | e2e/tests/lot6c.spec.ts |

### Couverture des champs, lot 6c (règle « Couverture des champs »)

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| POST et PATCH activités `charge_vendue` | champ « Charge vendue (j) » du dialogue d'activité (création, modification, onglet Planning, Gantt, Accueil) ; colonnes « Vendu » et « Marge » et région « Totaux du projet » du Gantt du projet | E2E-358, E2E-359, E2E-362 |
| POST et PATCH jalons `date_client` | champ « Date client » du dialogue de jalon ; losange, texte d'écart et badge « Client » du Gantt du projet | E2E-358, E2E-360, E2E-363 |
| `marge`, `ecart_client`, `engagement_depasse`, `projet.totaux` (lecture seule) | colonne « Marge », texte d'écart, badge « Client », région « Totaux du projet » | E2E-362, E2E-363 |

### Preuves de la phase rouge de 6c (D-149)

- Vitest API : 25 rouges sur 39 exécutés (fichiers lot6c-*, demo.test.ts, lot3a-gantt.test.ts) : GANTT-1-r2 (`totaux` et champs de 6c absents), MIG-10 (version 14 absente), VND-1 à VND-9, MOT-1, CLT-1 à CLT-4, VIS-1 à VIS-5, CPY-1 à CPY-3, DEMO-5. Causes relevées : 400 « Données invalides » (champs refusés par le schéma strict), colonnes `charge_vendue` et `date_client` absentes, clés absentes des réponses. Les 14 autres tests de ces fichiers restent verts.
- VIS-4 et VIS-5 sont rouges dès la préparation (charge vendue refusée en 400) : ils ne jouent leur rôle de témoin qu'en phase verte, où une mutation locale (clés de 6c ajoutées aux routes inchangées) devra les rendre rouges.
- Vitest web : lot6c.test.ts ne se charge pas (modules `gantt/vendu.ts` et `joursClient` absents) : GEO-36 à GEO-41 rouges.
- E2E : 11 rouges (E2E-358 à E2E-365, E2E-366 à 1440 et 1024 px, E2E-367). E2E-358 et E2E-360 échouent à l'écran (champs « Charge vendue (j) » et « Date client » absents). Les autres échouent dès la préparation (POST d'activité ou de jalon refusé en 400) : leurs vérifications d'écran ne sont pas exercées avant la phase verte ; E2E-365 et E2E-367 (témoins) sont dans ce cas.
- Lint et typecheck verts. Commits : révision GANTT-1-r2 séparée (9dfd946), tests rouges (dde33a0).

## Révisions D-031 de 6d (D-154 (13))

Inventaire des tests existants touchés par 6d, vérifié par recherche dans e2e/tests, packages/*/test :

- Menu de `Layout` : l'entrée « Plan de charge » s'insère après « Projets » pour l'administrateur et le chef de projet seulement. E2E-335 (index d'« Équipes » = index de « Calendriers » + 1), E2E-336, E2E-347 (menu exact de la ressource : trois liens), E2E-352 (liens présents pour le chef ressource, ordre non testé) restent vrais : aucune révision.
- Ordre de tabulation : aucun test existant ne tabule à travers le menu ni ne compte les liens du menu de l'administrateur ou du chef (les ordres de tabulation d'E2E-43, -92, -100, -109 partent de zones de l'écran) : aucune révision.
- Redirections de 6b : E2E-348 liste les adresses redirigées vers /mes-taches ; sa liste reste inchangée, `/plan-de-charge` est couverte par un nouveau test (E2E-369), sans réviser E2E-348.
- DEMO : DEMO-1 à DEMO-5 ne comparent ni le nombre d'équipes ni `equipe_id` ; l'ajout des équipes et d'une imputation (DEMO-6) ne les touche pas. À reconfirmer par l'exécution en phase verte.
- VND-2 refuse déjà 1.234 ; VND-11 s'y ajoute (pas de révision).

Aucune révision D-031 n'est donc prévue à ce stade. Si la phase verte en révèle une, elle sera listée ici (-rN) avec la décision du porteur.

Révision de la phase verte (D-156), tag `tests-lot6d-r1` :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-372-r1 | Ancienne : l'en-tête du premier mois lu en une fois (`enteteMois(page)[1]`) pendant le rechargement, tableau absent ; nouvelle : `expect(tableauPlan(page).getByRole('columnheader').nth(1)).toHaveText(...)` qui attend le rechargement, pour 05/2027, 06/2027 et 04/2027 ; attentes inchangées | D-156 | 6d | e2e/tests/lot6d.spec.ts |

Révision de la phase verte de 6f (D-163), tag `tests-lot6d-r2` :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-371-r1 | Ancienne : deux fériés (2027-01-12, 2027-01-13) posés sur le calendrier par défaut, partagé entre les tests ; nouvelle : calendrier propre « Cal 371 » créé par l'API (lundi au vendredi), rattaché à Alice 371, qui reçoit les deux fériés ; valeurs attendues inchangées | D-163 (1) | 6d | e2e/tests/lot6d.spec.ts |

## Tests du lot 6d, plan de charge (D-154)

Fichiers : packages/api/test/lot6d-plan.test.ts (PDC), packages/api/test/lot6c-vendu.test.ts (VND-11, ajout), packages/api/test/demo.test.ts (DEMO-6, ajout) ; packages/web/test/lot6d.test.ts (GEO) ; e2e/tests/lot6d.spec.ts (E2E). Valeurs attendues recopiées de D-154 ; les jours ouvrés viennent du calendrier réel de 2027 (1er janvier 2027 = vendredi) : standard lundi-vendredi, janvier 21, février 20, mars 23, avril 22, mai 21, juin 22, juillet 22, août 22, septembre 22, octobre 21, novembre 22, décembre 23 (soit 21, 20, 23, 22, 21, 22, 22, 22, 22, 21, 22, 23 pour `debut=2027-01`). Calendrier lundi-mardi-mercredi : janvier 12, février 12. Travail planifié et imputations posés par SQL (valeurs exactes, indépendantes du moteur). Tout refus relève l'empreinte de la base avant et après (`refusSansEffet` ou `empreinte`) : base inchangée.

API :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| PDC-1 | Accès : sans session 401 ; ressource (`est_ressource` ou non) 403 `{ erreur: 'Interdit' }` ; administrateur et chef de projet 200 ; base inchangée pour 401 et 403 | D-154 (2) | 6d | packages/api/test/lot6d-plan.test.ts |
| PDC-2 | 400 : `debut` absent, `2027-13`, `2027-00`, `2027-1`, `2027`, `abcd-ef`, `2027-01-01`, `1999-12`, `2100-01` ; `equipe` = `abc`, `1.5`, `1e2` ; base inchangée. 200 : `debut` = `2000-01` et `2099-12` | D-154 (2) | 6d | packages/api/test/lot6d-plan.test.ts |
| PDC-3 | Forme : `debut=2026-11` → `mois` = 2026-11, 2026-12, 2027-01 … 2027-10 (12) ; `debut=2099-12` → premier `2099-12`, second `2100-01` ; une ressource sans charge : clés exactes `ressource_id`, `nom`, `actif`, `equipe_id`, `mois`, `projets` ; chaque mois : `mois`, `disponible`, `reel`, `planifie`, `charge`, `ecart` (nombres), `projets` [] | D-154 (3) | 6d | packages/api/test/lot6d-plan.test.ts |
| PDC-4 | Disponible, calendrier par défaut, ressource sans charge, `debut=2027-01` : capacité 1 → 21, 20, 23, 22, 21, 22, 22, 22, 22, 21, 22, 23 ; capacité 0,5 → 10,5, 10, 11,5, 11, 10,5, 11, 11, 11, 11, 10,5, 11, 11,5 ; capacité 2 → 42, 40, 46, 44, 42, 44, 44, 44, 44, 42, 44, 46 ; `reel`, `planifie`, `charge` à 0, `ecart` = `disponible` | D-154 (4) | 6d | packages/api/test/lot6d-plan.test.ts |
| PDC-5 | Calendrier non standard et fériés : calendrier lundi-mardi-mercredi, fériés 2027-01-05 (mardi, travaillé), 2027-01-07 (jeudi, non travaillé), 2027-01-02 (samedi) → janvier 11, février 12, capacité 1 ; même calendrier, capacité 0,5 → janvier 5,5 ; calendrier par défaut avec férié 2027-01-01 (vendredi) → janvier 20, février 20 ; un férié d'un autre calendrier est sans effet | D-154 (4) | 6d | packages/api/test/lot6d-plan.test.ts |
| PDC-6 | Réel et planifié dans le même mois (Alice, capacité 1, une assignation, un projet) : planifié 2027-01-18 1,5, 2027-01-19 1, 2027-02-01 0,5 ; imputations 2027-01-05 0,75 (feuille validée), 2027-01-12 0,5 (feuille brouillon), 2027-02-02 0,25 (feuille rejetée), 2027-03-01 0,1, 2027-03-02 0,2, 2027-12-31 0,5 ; hors période : 2026-12-31 et 2028-01-03 (non comptés). Janvier : reel 1,25, planifie 2,5, charge 3,75, disponible 21, ecart 17,25 ; février : 0,25, 0,5, 0,75, 20, 19,25 ; mars : reel 0,3 (exactement), charge 0,3, disponible 23, ecart 22,7 ; décembre : reel 0,5, disponible 23, ecart 22,5 ; ligne du projet : mêmes reel, planifie, charge par mois (douze entrées) | D-154 (3), (4), (6) | 6d | packages/api/test/lot6d-plan.test.ts |
| PDC-7 | Écart négatif : Bob, capacité 1, planifié 22 le 2027-01-04 : janvier charge 22, disponible 21, ecart −1 (nombre) ; le moteur n'est pas appelé (travail planifié « tel que laissé ») | D-154 (4) | 6d | packages/api/test/lot6d-plan.test.ts |
| PDC-8 | Ressources prises en compte : utilisateur `est_ressource` actif sans charge présent ; `est_ressource` inactif avec planifié 2027-03-10 présent (`actif` faux, charge en mars) ; `est_ressource` inactif avec charge seulement hors période (2026-12-31, 2028-02-01) absent ; inactif sans charge absent ; chef de projet non ressource actif sans charge absent ; utilisateur dont `est_ressource` est devenu faux après assignation, avec charge dans la période : présent | D-154 (5) | 6d | packages/api/test/lot6d-plan.test.ts |
| PDC-9 | Tri des ressources : créées Charles, bruno, Alice, alice → ordre Alice, alice (même nom sans casse : par id), bruno, Charles | D-154 (5) | 6d | packages/api/test/lot6d-plan.test.ts |
| PDC-10 | Filtres équipe : « Dev » (alice, bob), « Pilotage » (chefa ressource), carl sans équipe ; `equipe=<Dev>` → alice, bob (`equipe_id` renvoyé) ; `equipe=<Pilotage>` → chefa ; `equipe=aucune` → carl seul ; équipe inconnue (9999) → 200, `ressources` [] ; sans `equipe` → tous ; un inactif à charge hors de l'équipe filtrée est absent, dans l'équipe filtrée présent | D-154 (2), (5) | 6d | packages/api/test/lot6d-plan.test.ts |
| PDC-11 | Projets d'une ressource : seuls ceux à charge non nulle dans la période (charge en 2028-01 ou 2026-12 : projet absent) ; projet clos présent ; tri par code sans casse (créés `b-2`, `c-3`, `A-1` → `A-1`, `b-2`, `c-3`) ; aucun modèle ; un projet sans charge n'apparaît pas | D-154 (6) | 6d | packages/api/test/lot6d-plan.test.ts |
| PDC-12 | Chef de projet : Alice charge dans P1 (chef = le chef, planifié janvier 2), PL (autre chef, chef en lecture seule car affecté, janvier 1), P2 et P3 (autre chef, illisibles ; P2 planifié janvier 4 et février 1, P3 reel janvier 0,5 ; codes triant avant P1). Le chef reçoit pour Alice `projets` = P1, PL (par code), puis une seule ligne `{ projet_id: null, code: null, nom: null }` en dernier (janvier reel 0,5, planifie 4, charge 4,5 ; février planifie 1, charge 1) ; totaux d'Alice janvier : reel 0,5, planifie 7, charge 7,5. Bob, charge seulement dans P2 : le chef reçoit Bob avec la seule ligne null. Sans projet illisible : aucune ligne null. Administrateur : quatre lignes P1, PL, P2, P3 par code, aucune ligne null, mêmes totaux | D-154 (6) | 6d | packages/api/test/lot6d-plan.test.ts |
| PDC-13 | La route n'écrit rien : GET administrateur et chef avec `equipe` et sans ; empreinte de la base identique avant et après | D-154 (2) | 6d | packages/api/test/lot6d-plan.test.ts |
| VND-11 | `charge_vendue` 1.0000000001, 0.001, 12.505, 1e-10 en POST et en PATCH d'une activité : 400, base inchangée ; 0.29, 1.15, 4.35 (deux décimales, écarts de virgule flottante) : acceptées, valeur relue en base | D-154 (12) | 6d | packages/api/test/lot6c-vendu.test.ts |
| DEMO-6 | Après `remplirDemo` : équipe « Développement » = alice et bob ; équipe « Pilotage » = chefa et chefb ; administrateur sans équipe ; au moins une imputation d'alice à un jour passé ; GET /api/plan-de-charge (administrateur, `debut` = mois de lundi − 14) : alice présente, somme des `reel` sur les 12 mois > 0 | D-154 (10) | 6d | packages/api/test/demo.test.ts |

Web (fonctions pures, `packages/web/src/plan-de-charge/logique.ts`) :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GEO-42 | `parametresPlan(search, moisCourant)` : `?debut=2027-03&equipe=5` → `{ debut: '2027-03', equipe: 5, corrige: false }` ; `equipe=aucune` → `'aucune'` ; absent → `'toutes'` ; `debut` absent, `2027-13`, `1999-12`, `2100-01`, `abc` → `moisCourant`, `corrige` vrai ; `equipe=abc` ou `1.5` → `'toutes'`, `corrige` vrai | D-154 (8) | 6d | packages/web/test/lot6d.test.ts |
| GEO-43 | `adressePlan(debut, equipe)` : `('2027-01', 'toutes')` → `/plan-de-charge?debut=2027-01` ; `('2027-01', 'aucune')` → `/plan-de-charge?debut=2027-01&equipe=aucune` ; `('2027-01', 7)` → `/plan-de-charge?debut=2027-01&equipe=7` | D-154 (8) | 6d | packages/web/test/lot6d.test.ts |
| GEO-44 | `decalerMois(debut, n)` : `('2027-12', 1)` → `2028-01` ; `('2027-01', -1)` → `2026-12` ; `('2027-01', 0)` → `2027-01` ; `moisDe('2027-01-18')` → `2027-01` | D-154 (8) | 6d | packages/web/test/lot6d.test.ts |
| GEO-45 | `enteteMois('2027-01')` → `01/2027` ; `libelleProjet({ code: 'P1', nom: 'Projet un' })` → `P1 · Projet un` ; `libelleProjet({ code: null, nom: null })` → `Autres projets` ; `libelleRessource('Alice', true)` → `Alice` ; `libelleRessource('Alice', false)` → `Alice (inactif)` | D-154 (9) | 6d | packages/web/test/lot6d.test.ts |
| GEO-46 | `cellulePlan({ charge, disponible, ecart })` : (3,75 ; 21 ; 17,25) → texte `3,75`, titre `Charge 3,75 j, disponible 21 j, écart 17,25 j`, `surcharge` faux ; (22 ; 21 ; −1) → texte `22`, titre `Charge 22 j, disponible 21 j, écart −1 j` (moins typographique U+2212, comme D-149 (8)), `surcharge` vrai ; (0 ; 21 ; 21) → texte `0`, `surcharge` faux ; écart 0 : `surcharge` faux | D-154 (9) | 6d | packages/web/test/lot6d.test.ts |
| GEO-47 | Témoin (vert d'emblée, prouvé par mutation) : `analyserChargeVendue` refuse `.5`, `,5`, `5.`, `5,` ; accepte `0.5`, `5`, `5,50` | D-154 (12) | 6d | packages/web/test/lot6d.test.ts |
| GEO-48 | `boutonsMois(debut)` → `{ precedent, suivant }` : `2000-01` → précédent refusé, suivant permis ; `2099-12` → précédent permis, suivant refusé ; `2027-06` → les deux permis | D-155 (3) | 6d | packages/web/test/lot6d.test.ts |

E2E (e2e/tests/lot6d.spec.ts ; base « administrateur seul » avant et après chaque test ; D0 = 2027-01-04, adresse `/plan-de-charge?debut=2027-01`) :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-368 | Menu : administrateur et chef de projet voient « Plan de charge » juste après « Projets » ; le clic ouvre /plan-de-charge, titre de niveau 1 « Plan de charge » ; absent du menu de la ressource | D-154 (8) | 6d | e2e/tests/lot6d.spec.ts |
| E2E-369 | Redirection : la ressource qui ouvre /plan-de-charge (adresse saisie, avec et sans paramètres) arrive sur /mes-taches, aucune requête à /api/plan-de-charge | D-154 (8) | 6d | e2e/tests/lot6d.spec.ts |
| E2E-370 | Contenu : Alice affectée à deux projets (planifié par le calcul de l'API) ; tableau « Plan de charge » : colonne « Ressource » puis douze en-têtes « 01/2027 » à « 12/2027 » ; ligne d'Alice repliée par défaut, bouton « Déplier Alice » ; cellule de janvier à la virgule décimale, `title` « Charge X j, disponible 21 j, écart Y j » ; « Déplier Alice » → lignes « <code> · <nom> » des deux projets (charge seule), bouton devenu « Replier Alice » ; mois sans charge « 0 » ; aucun bouton ni champ dans le tableau hors Déplier / Replier (lecture seule) | D-154 (9) | 6d | e2e/tests/lot6d.spec.ts |
| E2E-371 | Surcharge : activité de 20 j assignée à Alice, calcul, puis deux fériés (2027-01-12, 2027-01-13) ajoutés au calendrier par défaut : cellule de janvier en couleur flag (rgb(190, 18, 60)), `title` « Charge 20 j, disponible 19 j, écart −1 j », texte « , surcharge » dans un élément réservé aux lecteurs d'écran (invisible, présent dans le texte accessible) ; cellule sans écart négatif : sans ce texte | D-154 (9) | 6d | e2e/tests/lot6d.spec.ts |
| E2E-372 | Filtres et adresse : liste « Équipe » aux options « Toutes », « Sans équipe », puis les équipes triées par nom ; choisir une équipe : adresse `?debut=2027-01&equipe=<id>` et seules ses ressources ; « Sans équipe » : `equipe=aucune` ; champ « Mois de départ » (type month) modifié : adresse et en-têtes suivent ; « Mois suivant » : `debut=2027-02`, première colonne « 02/2027 » ; « Mois précédent » : retour à `2027-01` ; adresse `?debut=abc&equipe=xyz` : valeurs par défaut (mois courant du navigateur, « Toutes »), adresse corrigée sans rechargement (marqueur posé sur `window` conservé) | D-154 (8) | 6d | e2e/tests/lot6d.spec.ts |
| E2E-373 | États : aucune ressource (filtre sur une équipe vide) : « Aucune ressource. », sans tableau ; GET /api/plan-de-charge intercepté en 500 : « Impossible de charger le plan de charge. », sans tableau | D-154 (9) | 6d | e2e/tests/lot6d.spec.ts |
| E2E-374 | Inactif et regroupement : ressource désactivée à charge dans la période : nom suivi de « (inactif) » ; chef de projet connecté, ressource à charge dans un projet d'un autre chef : après dépliage, ligne « Autres projets » en dernier, sans lien ni code ; l'administrateur voit le projet nommé | D-154 (6), (9) | 6d | e2e/tests/lot6d.spec.ts |
| E2E-375 | Zone de défilement (1440 et 1024 px) : région `role="region"` de nom « Plan de charge », focalisable (Tab), anneau de focus de docs/ui.md ; la colonne « Ressource » reste visible après défilement horizontal de la région (sticky) ; la page ne défile pas en horizontal (`scrollWidth` du document ≤ largeur de fenêtre) | D-154 (9) | 6d | e2e/tests/lot6d.spec.ts |
| E2E-376 | Extension du parcours complet (administrateur seul, tout à l'écran, gestes d'E2E-358) : calendrier, équipe « Équipe 6D » créée à l'écran, ressource créée à l'écran avec cette équipe, chef, projet, affectation, activité assignée 4 j ; calcul par l'API (hors entité saisie) ; ouverture du Plan de charge par le menu, filtre « Équipe 6D » : ligne de la ressource, charge de janvier 4, dépliage : ligne du projet à 4 | D-154 (11) | 6d | e2e/tests/lot6d.spec.ts |

### Couverture des champs, lot 6d (règle « Couverture des champs »)

GET /api/plan-de-charge est en lecture seule : aucun champ modifiable nouveau, tous les paramètres et champs de réponse sont affichés par l'écran « Plan de charge ». Seul champ modifiable touché : `charge_vendue` (correctif D-154 (12)).

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| GET /api/plan-de-charge `debut` (lecture seule) | champ « Mois de départ », boutons « Mois précédent » et « Mois suivant », adresse `?debut=` | E2E-372 |
| GET /api/plan-de-charge `equipe` (lecture seule) | liste « Équipe » (« Toutes », « Sans équipe », équipes), adresse `?equipe=` | E2E-372, E2E-376 |
| Réponse `mois`, `ressources`, `projets` (lecture seule) | tableau « Plan de charge » : en-têtes, lignes de ressource, lignes de projet | E2E-370, E2E-371, E2E-374 |
| POST et PATCH activités `charge_vendue` (correctif D-154 (12)) | champ « Charge vendue (j) » du dialogue d'activité, inchangé ; « .5 » et « 5. » refusés | GEO-47, E2E-359 |

### Preuves de la phase rouge de 6d (D-154)

- Vitest API : 15 rouges sur 32 exécutés (lot6d-plan.test.ts, lot6c-vendu.test.ts, demo.test.ts) : PDC-1 à PDC-13 (route absente : 404 « Route GET:/api/plan-de-charge… not found », atteint après préparation réussie), VND-11 (1.0000000001 accepté : 201, `charge_vendue` arrondie à 1), DEMO-6 (aucune équipe dans le jeu de démonstration).
- Vitest web : lot6d.test.ts ne se charge pas (module `plan-de-charge/logique` absent) : GEO-42 à GEO-47 non exécutés. GEO-47 est un témoin vert d'emblée : vert avec le code actuel, rouge (« .5 » accepté) quand le motif de `analyserChargeVendue` autorise un chiffre absent avant le séparateur ; code restauré ensuite.
- E2E : 10 rouges (E2E-368 à E2E-376, E2E-375 à 1440 et 1024 px), chacun à l'étape d'écran (lien « Plan de charge » absent, redirection absente, titre ou tableau absents) ; toutes les préparations par l'API (dont la désactivation d'Alice, les fériés, le calcul) et le parcours à l'écran d'E2E-376 jusqu'au menu passent.
- Lint et typecheck verts. Commits : D-154 (4c01054), SPEC (52975c9), identifiants (57cfeeb), tests rouges (f46f45e). Aucune révision D-031 : pas de commit `test:` séparé.

## Révisions D-031 de 6e (D-157 (9))

Inventaire des tests existants touchés par 6e, vérifié par recherche dans e2e/tests et packages/*/test :

- Ordre de focus de l'Accueil (D-080 point 9) : la liste « Planning de » s'insère avant les boutons de zoom. E2E-92-r5 (accueil-g2.spec.ts), E2E-100-r3 (accueil-g3.spec.ts) et E2E-109-r2 (accueil-g4.spec.ts) donnent d'abord le focus au bouton « Jour » (`focus()`), puis lisent dix tabulations : la liste est avant le point de départ, la séquence lue ne change pas. Intention et attentes inchangées : aucune révision. Le nouvel ordre complet (liste, zoom, tableau, SVG) est couvert par E2E-381.
- Barre d'outils de l'Accueil : aucun test existant ne compte les `combobox` ou les `select` de l'Accueil (recherche `getByRole('combobox')`, `locator('select')` : aucune occurrence hors nom) ; les sélecteurs de l'Accueil sont nommés (`name:`). Aucune révision.
- Zoom : `BoutonsZoom` reprend déjà les paramètres de l'adresse (`URLSearchParams`), donc `ressource` est conservé sans changement ; les tests de zoom de l'Accueil (E2E-91 et suivants) ne dépendent pas de l'absence d'autres paramètres. Aucune révision.
- Annuaire : GET /api/annuaire ne change pas (D-157 (5)) ; ses tests (lot1-ann) ne sont pas touchés.
- Parcours complet : E2E-376 reste inchangé ; l'extension de 6e est un nouveau test (E2E-382), comme E2E-376 l'était pour E2E-358.

Aucune révision D-031 n'est donc prévue à ce stade : pas de commit `test:` de révision. Si la phase verte en révèle une, elle sera listée ici (-rN) avec la décision du porteur.

Révisions de la phase verte (D-159), tag `tests-lot6e-r1` :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GEO-52-r1 | Ancienne : `nomBarreRessource` attendu `…, Retard` ; nouvelle : `P1 · 1.2 Analyse, du 04/01/2027 au 06/01/2027, retard` (drapeaux en minuscules, 3b point 12) ; autres attentes inchangées | D-159 (1) | 6e | packages/web/test/lot6e.test.ts |
| E2E-377-r1 | Ancienne : base sans projet, Gantt global attendu ; nouvelle : projet ordinaire ouvert (chef « Chef 377 ») avec une activité créé par l'API avant les vérifications ; autres attentes inchangées | D-159 (2) | 6e | e2e/tests/lot6e.spec.ts |

## Tests du lot 6e, planning d'une ressource sur l'Accueil (D-157)

Fichiers : packages/api/test/lot6e-planning.test.ts (RPL) ; packages/web/test/lot6e.test.ts (GEO, fonctions pures de `packages/web/src/accueil/logique.ts`) ; e2e/tests/lot6e.spec.ts (E2E). Valeurs attendues recopiées de D-157. Dates planifiées posées par SQL (le moteur n'est pas appelé, sauf dans les e2e : calcul par l'API).

API (GET /api/ressources/:id/planning) :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| RPL-1 | Accès : sans session 401 ; rôle ressource 403 `{ erreur: 'Interdit' }`, y compris sur un identifiant inconnu (le 403 précède le 404) et sur son propre identifiant ; administrateur et chef de projet 200 ; base inchangée pour 401 et 403 | D-157 (2) | 6e | packages/api/test/lot6e-planning.test.ts |
| RPL-2 | 404 : identifiant inconnu (9999), `abc`, `1.5`, `1e2`, `0`, `-1`, `2147483648`, `99999999999999999999` : 404, base inchangée. Précédé, dans le même test, d'un 200 pour un utilisateur existant (rend le rouge probant). 200 `lignes` vide : utilisateur existant sans assignation, utilisateur non ressource (l'administrateur), ressource inactive (`actif` faux) ; `ressource` = `{ id, nom, actif }` exactement | D-157 (2) | 6e | packages/api/test/lot6e-planning.test.ts |
| RPL-3 | Forme : deux assignations, avant calcul : clés exactes de la réponse `ressource`, `lignes` ; de la ligne `activite`, `assignation_id`, `charge_assignee`, `charge_reelle`, `debut_planifie`, `drapeaux`, `fin_planifiee`, `projet`, `reste_a_faire` ; `projet` = `{ code, id, nom }`, `activite` = `{ id, nom, wbs }` ; dates null, `drapeaux` [] ; charges recopiées (2 / 0,5 / 1,5 et 3 / 0 / 3) ; ordre WBS 1 puis 2 | D-157 (2), (3) | 6e | packages/api/test/lot6e-planning.test.ts |
| RPL-4 | Drapeaux de l'activité : `drapeaux` posés en base `['retard', 'surcharge']` sur une activité, repris tels quels dans la ligne ; une autre activité sans drapeau : `[]` ; la ligne a les dates planifiées posées | D-157 (2) | 6e | packages/api/test/lot6e-planning.test.ts |
| RPL-5 | Absence de la charge vendue : `charge_vendue` posée à 12 sur l'activité (le projet n'en porte pas) ; ni la ligne, ni `projet`, ni `activite`, ni `ressource` n'ont de clé `charge_vendue` ; le texte JSON de la réponse ne contient pas `vendue` | D-157 (3) | 6e | packages/api/test/lot6e-planning.test.ts |
| RPL-6 | Tri : début planifié croissant, null en dernier ; à égalité de date : code du projet sans casse (`b-2`, `A-1`, `c-3` → `A-1`, `b-2`, `c-3`) ; à égalité de code : numéro WBS dans l'ordre WBS (2 avant 10, pas l'ordre du texte) ; deux lignes sans date : code puis WBS | D-157 (3) | 6e | packages/api/test/lot6e-planning.test.ts |
| RPL-7 | Filtres de clôture, un test par exclusion et une ligne témoin retenue : activité close exclue ; activité dont un ancêtre est clos (parent clos posé en base) exclue ; projet clos exclu ; projet dont un projet ancêtre est clos (sous-projet d'un projet clos) exclu ; modèle exclu ; assignation d'une autre ressource exclue ; projet ouvert sous un projet ouvert retenu | D-157 (3) | 6e | packages/api/test/lot6e-planning.test.ts |
| RPL-8 | Lignes masquées pour le chef de projet : Alice assignée dans P1 (chef = le chef, lisible), PL (autre chef, chef affecté, lisible) et P2 (autre chef, illisible, début 2027-01-05, assigné 4, réel 1, reste 3, drapeau `retard`) ; le chef lit Alice : la ligne de P2 a `projet` null, `activite` null, `drapeaux` [], mêmes dates et mêmes charges (4, 1, 3), même `assignation_id` ; les lignes de P1 et PL en clair. Bob (seulement P2) : une ligne masquée pour le chef. L'autre chef (qui lit PL et P2, pas P1) : la ligne de P1 masquée, celle de P2 en clair | D-157 (4) | 6e | packages/api/test/lot6e-planning.test.ts |
| RPL-9 | Même ligne en clair pour l'administrateur : `projet` = P2, `activite` renseignée, `drapeaux` = `['retard']`, mêmes dates et charges que RPL-8 ; aucune ligne masquée | D-157 (4) | 6e | packages/api/test/lot6e-planning.test.ts |
| RPL-10 | Tri avec une ligne masquée : une ligne masquée (début 2027-01-05) entre deux lignes lisibles (2027-01-04 et 2027-01-06) se range par sa date ; deux lignes masquées à la même date : par `assignation_id` croissant ; une ligne masquée sans date après les lignes datées | D-157 (3) | 6e | packages/api/test/lot6e-planning.test.ts |
| RPL-11 | La route n'écrit rien : GET administrateur et chef ; empreinte de la base identique avant et après | D-157 (1) | 6e | packages/api/test/lot6e-planning.test.ts |

Web (fonctions pures, `packages/web/src/accueil/logique.ts`) :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GEO-49 | `parametresRessource(search, ids)` → `{ ressource, corrige }` (`search` : `URLSearchParams`) : (`?ressource=5`, [3, 5]) → `{ 5, faux }` ; (`''`, [3, 5]) → `{ null, faux }` ; `?ressource=abc`, `1.5`, `0`, `-3`, `` (vide), `1e2` → `{ null, vrai }` ; (`?ressource=9`, [3, 5]) (absente de la liste) → `{ null, vrai }` ; (`?ressource=5&zoom=jour`, [5]) → `{ 5, faux }` | D-157 (5) | 6e | packages/web/test/lot6e.test.ts |
| GEO-50 | `rechercheRessource(search, id)` (`search` : `URLSearchParams`, résultat `?…` ou `''`) : (`?zoom=jour&initiales=1`, 7) → `?zoom=jour&initiales=1&ressource=7` ; (`?zoom=jour&ressource=7`, null) → `?zoom=jour` ; (`''`, null) → `''` ; (`?ressource=3`, 7) → `?ressource=7` | D-157 (5) | 6e | packages/web/test/lot6e.test.ts |
| GEO-51 | `optionsRessources(annuaire)` : garde `actif` et `est_ressource`, trie par nom sans casse, égalité par id : [Charles, bruno, alice (id 4), Alice (id 3), Dan inactif, Eve non ressource] → Alice (3), alice (4), bruno, Charles ; annuaire vide → [] | D-157 (5) | 6e | packages/web/test/lot6e.test.ts |
| GEO-52 | Libellés : `nomBarreRessource` : (P1, wbs 1.2 « Analyse », 2027-01-04 → 2027-01-06, [`retard`]) → `P1 · 1.2 Analyse, du 04/01/2027 au 06/01/2027, Retard` ; ligne masquée → `Autre projet, du 04/01/2027 au 06/01/2027` ; `celluleProjet` : (P1) → `P1`, masquée → `Autre projet` ; `celluleActivite` : (1.2, Analyse) → `1.2 Analyse`, masquée → `—` | D-157 (6) | 6e | packages/web/test/lot6e.test.ts |

E2E (e2e/tests/lot6e.spec.ts ; base « administrateur seul » avant et après chaque test ; D0 = 2027-01-04 ; adresse `/` et `/?ressource=<id>`) :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-377 | Liste « Planning de » : administrateur et chef de projet la voient avant les boutons de zoom ; premier choix « Tous les projets », sélectionné par défaut, Gantt global inchangé (« Calculer », « Tout déplier », « Initiales » présents si le chef écrit) ; options suivantes : ressources actives seulement, triées sans casse (Alice, bruno, Charles ; un inactif et un non-ressource absents) ; la ressource n'a pas d'Accueil (redirigée vers /mes-taches, comme E2E-348) | D-157 (5) | 6e | e2e/tests/lot6e.spec.ts |
| E2E-378 | Vue d'une ressource (administrateur, deux assignations calculées par l'API) : choisir Alice : adresse `/?ressource=<id>` ; tableau aux colonnes Projet, Activité, Début, Fin, Assigné, Réel, Reste, Drapeaux ; code du projet en lien vers la fiche, activité « 1 Analyse », dates JJ/MM/AAAA, charges ; « Calculer », « Tout déplier » et la case « Initiales » absents, boutons de zoom présents ; une barre de couleur accent par ligne (`role="img"`, nom « P1 · 1 Analyse, du 04/01/2027 au … ») ; lecture seule : double-clic et Entrée sur une barre n'ouvrent aucun dialogue, aucun connecteur ni poignée | D-157 (6) | 6e | e2e/tests/lot6e.spec.ts |
| E2E-379 | Ligne masquée (chef de projet connecté, Alice aussi assignée dans un projet d'un autre chef) : ligne « Autre projet » sans lien, activité « — », barre grise (couleur différente de la barre accent), nom « Autre projet, du … au … » ; l'administrateur voit le même projet nommé, avec lien | D-157 (4), (6) | 6e | e2e/tests/lot6e.spec.ts |
| E2E-380 | États : ressource sans assignation : « Aucune tâche pour cette ressource. », sans tableau de lignes ; assignations non calculées : bandeau « Planning non calculé » (role=status), lignes affichées, aucune barre ; GET /api/ressources/:id/planning intercepté en 500 : « Impossible de charger le planning de la ressource. » | D-157 (6) | 6e | e2e/tests/lot6e.spec.ts |
| E2E-381 | Adresse et focus : `/?ressource=<id>&zoom=jour` : liste sur Alice, zoom « Jour » pressé ; changer de zoom garde `ressource` ; `?ressource=abc`, `?ressource=99999` (absente de la liste), `?ressource=` : « Tous les projets » choisi et adresse corrigée sans rechargement (marqueur posé sur `window` conservé) ; revenir à « Tous les projets » retire `ressource` et rend le Gantt global ; ordre de tabulation en vue ressource : « Planning de », Jour, Semaine, Mois, « Tableau du planning de la ressource », lien du projet, « Calendrier du planning de la ressource » ; zones `tabindex="0"` | D-157 (5), (6) | 6e | e2e/tests/lot6e.spec.ts |
| E2E-382 | Extension du parcours complet (administrateur seul, tout à l'écran, gestes d'E2E-376) : calendrier, équipe, ressource, chef, projet, affectation, activité assignée 4 j créés à l'écran ; calcul par l'API (hors entité saisie) ; Accueil : choisir la ressource dans « Planning de » ; sa ligne et sa barre (nom accessible) ; retour à « Tous les projets » : Gantt global rétabli | D-157 (8) | 6e | e2e/tests/lot6e.spec.ts |

### Couverture des champs, lot 6e (règle « Couverture des champs »)

GET /api/ressources/:id/planning est en lecture seule : aucun champ modifiable nouveau. Tous les champs de la réponse sont affichés par l'Accueil, sauf ceux notés.

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| Chemin `:id` (lecture seule) | liste « Planning de », adresse `?ressource=` | E2E-378, E2E-381 |
| `ressource.nom`, `ressource.actif` (lecture seule) | hors écran : l'option de la liste porte déjà le nom, et la liste ne propose que les actifs | RPL-2 |
| `lignes[].projet` (code, nom, id) | colonne « Projet » (code en lien vers la fiche ; nom et id : lien et nom accessible) | E2E-378, E2E-379 |
| `lignes[].activite` (wbs, nom, id) | colonne « Activité » | E2E-378 |
| `lignes[].debut_planifie`, `fin_planifiee` | colonnes « Début » et « Fin », barre du SVG | E2E-378, E2E-380 |
| `lignes[].charge_assignee`, `charge_reelle`, `reste_a_faire` | colonnes « Assigné », « Réel », « Reste » | E2E-378 |
| `lignes[].drapeaux` | colonne « Drapeaux », nom accessible de la barre | E2E-378, GEO-52 |
| `lignes[].assignation_id` | hors écran : clé de tri et de ligne, sans libellé | RPL-3, RPL-10 |

### Preuves de la phase rouge de 6e (D-157)

- Vitest API : 11 rouges sur 11 (lot6e-planning.test.ts) : RPL-1 à RPL-11 ; route absente, 404 « Route GET:/api/ressources/…/planning not found », atteint après préparation réussie (la préparation de RPL-11 a été corrigée une fois : affectation manquante, 422 avant la route). RPL-2 commence par un 200 témoin, pour qu'un 404 de route absente ne passe pas pour le 404 attendu.
- Vitest web : 4 rouges sur 4 (lot6e.test.ts) : GEO-49 à GEO-52, `… is not a function` (fonctions absentes de `accueil/logique.ts`).
- E2E : 6 rouges sur 6 (E2E-377 à E2E-382), chacun à l'étape d'écran (liste « Planning de » absente) ; les préparations par l'API, les connexions, les calculs et, pour E2E-382, tout le parcours à l'écran jusqu'à l'Accueil passent.
- Lint et typecheck verts. Aucune révision D-031 : pas de commit `test:` de révision.

## Révisions D-031 de 6f (D-160 (8))

Inventaire des tests existants touchés par 6f, vérifié par recherche dans e2e/tests et packages/*/test (écrans `/plan-de-charge` et `/validation`, barres d'outils, ordre de focus) :

- Plan de charge : le bouton « Exporter CSV » s'ajoute à la barre des filtres. E2E-370 ne lit que les boutons du tableau (`tableauPlan(page).getByRole('button')`) ; E2E-372 n'énumère que les options de la liste « Équipe » et clique « Mois précédent » et « Mois suivant » par nom ; E2E-375 tabule jusqu'à la zone (40 tabulations au plus, arrêt sur la zone) : l'élément ajouté avant la zone ne change pas son résultat. Aucune révision.
- Validation : E2E-299 à E2E-318 et E2E-324 à E2E-329 cherchent les boutons par nom (« Semaine précédente », « Voir la feuille de … », « Valider … », « Rejeter … ») ; aucun ne compte les boutons de la page ni ne tabule dans l'en-tête. Le focus rendu après Valider ou Rejeter va au bouton d'origine, à « Voir » ou au tableau, jamais au bouton d'export. Aucune révision.
- Captures (lot4c-captures, lot5d-captures) : sans assertion sur la barre d'outils. Aucune révision.
- Tests web (validation.test.ts, lot6d.test.ts) : fonctions pures, non touchées.

Aucune révision D-031 n'est donc prévue à ce stade : pas de commit `test:` de révision (étape 4 sans objet). Si la phase verte en révèle une, elle sera listée ici (-rN) avec la décision du porteur, dans un commit `test:` séparé qui cite D-160 (8).

Mise à jour de la phase verte : trois révisions ont été nécessaires, listées dans cette rubrique et juste avant la rubrique « Tests du lot 6d » : CSV-14-r1 et GEO-54-r1 (D-162, `tests-lot6f-r1`), E2E-383-r1 (D-163, `tests-lot6f-r2`) ; E2E-371-r1 (D-163, `tests-lot6d-r2`) est la révision du lot 6d.

Révisions de la phase verte (D-162), tag `tests-lot6f-r1` :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| CSV-14-r1 | Ancienne : `du=2027-01-01&au=2028-01-01` attendu 400 (« 367 jours ») ; nouvelle : `au=2028-01-02` (367 jours) ; autres attentes inchangées | D-162 (1) | 6f | packages/api/test/lot6f-csv.test.ts |
| GEO-54-r1 | Ancienne : `periodeExportValide('2027-01-01', '2028-01-01')` attendu faux ; nouvelle : `('2027-01-01', '2028-01-02')` ; autres attentes inchangées | D-162 (2) | 6f | packages/web/test/lot6f.test.ts |

Révision de la phase verte (D-163), tag `tests-lot6f-r2` :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-383-r1 | Ancienne : Alice 6F et Bob 6F sur le calendrier par défaut (disponible 19 au lieu de 21 après E2E-371) ; nouvelle : calendrier propre « Cal 383 » créé par l'API (lundi au vendredi, sans férié), rattaché aux deux ressources ; valeurs exactes inchangées (disponible 21) | D-163 (2) | 6f | e2e/tests/lot6f.spec.ts |

## Tests du lot 6f, exports CSV (D-160)

Fichiers : packages/api/test/lot6f-csv.test.ts (CSV) ; packages/web/test/lot6f.test.ts (GEO) ; e2e/tests/lot6f.spec.ts (E2E). Valeurs attendues recopiées de D-160. Les fichiers CSV commencent par le BOM U+FEFF, finissent chaque ligne par CRLF (la dernière comprise) et se lisent en séparant sur CRLF.

Contrat testé (à relire) :

- `packages/api/src/export/csv.ts` (fonctions pures) : `formaterNombre(n: number): string` ; `formaterDate('AAAA-MM-JJ'): string` ; `formaterMois('AAAA-MM'): string` ; `champTexte(s: string): string` (préfixe d'injection puis guillemets) ; `produireCsv(entetes: string[], lignes: (string | number | null)[][]): string` (BOM, en-tête, lignes ; `null` = champ vide ; nombre jamais préfixé).
- Routes : `GET /api/plan-de-charge/export` et `GET /api/imputations/export`.
- `packages/web/src/export/logique.ts` : `periodeSemaine(lundi) → { du, au }` ; `periodeExportValide(du, au): boolean` (nombre de jours bornes comprises, de 1 à 366) ; `adresseExportPlan(debut, equipe)` ; `adresseExportImputations(du, au, equipe)` (`equipe` : `'toutes'`, `'aucune'` ou un entier).

API, fonctions pures (module `export/csv.ts`) :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| CSV-1 | `produireCsv(['A', 'B'], [['x', 1]])` = `﻿A;B\r\nx;1\r\n` ; en-tête seul : `﻿A;B\r\n` ; champs `a;b` → `"a;b"`, `dit "oui"` → `"dit ""oui"""`, `l1\nl2` et `l1\r\nl2` entre guillemets, `Alice` sans guillemets | D-160 (2) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-2 | `formaterNombre` : 12.5 → `12,5` ; 3 → `3` ; -1 → `-1` (signe ASCII) ; 0 → `0` ; 0.25 → `0,25` ; 3.75 → `3,75` ; 22 → `22` ; 1234.5 → `1234,5` ; 1.1 → `1,1` ; 0.1 + 0.2 → `0,3` | D-160 (2) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-3 | `formaterDate('2027-01-18')` → `18/01/2027` ; `formaterMois('2027-01')` → `01/2027` | D-160 (2) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-4 | Injection : `champTexte` préfixe d'une apostrophe `=SOMME(A1)`, `+1`, `-1x`, `@x`, tabulation + `x` ; CR + `x` → `"'\rx"` (préfixé puis entre guillemets) ; inchangés : `Alice`, `a=b`, chaîne vide ; `produireCsv([ 'N' ], [[-1], ['-1']])` → `-1` pour le nombre, `'-1` pour le texte | D-160 (2) | 6f | packages/api/test/lot6f-csv.test.ts |

API, volet A (plan de charge) :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| CSV-5 | Accès et refus, mêmes que PDC-1 et PDC-2 : sans session 401 ; ressource (`est_ressource` ou non) 403 `{ erreur: 'Interdit' }` ; ordre des refus : ressource avec `debut` invalide → 403, sans session avec `debut` invalide → 401 ; 400 pour `debut` absent, `2027-13`, `1999-12`, `2100-01`, `equipe=abc`, `1.5`, `1e2` ; administrateur et chef 200 ; base inchangée pour chaque refus | D-160 (3) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-6 | Fichier : `Content-Type: text/csv; charset=utf-8` ; `Content-Disposition: attachment; filename="plan-de-charge-2027-01.csv"` (et `plan-de-charge-2026-11.csv` pour `debut=2026-11`) ; corps commençant par le BOM, première ligne `Ressource;Équipe;Projet;Mois;Disponible;Réel;Planifié;Charge;Écart`, lignes finies par CRLF | D-160 (2), (3) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-7 | Contenu : Alice (équipe « Dev », capacité 1, calendrier par défaut), projet P1 « Projet un », planifié 2027-01-05 1,5, imputation 2027-01-12 0,5 ; `debut=2027-01` : 1 + 12 + 12 lignes ; lignes 1 à 12 : `Alice;Dev;Total;01/2027;21;0,5;1,5;2;19`, `Alice;Dev;Total;02/2027;20;0;0;0;20`, … `Total;12/2027` ; lignes 13 à 24 : `Alice;Dev;P1 · Projet un;01/2027;;0,5;1,5;2;` puis `…;02/2027;;0;0;0;` … ; aucune virgule de milliers | D-160 (3) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-8 | Équipe vide, inactif, écart négatif : Carl sans équipe, inactif, planifié 2027-03-10 2 : `Carl (inactif);;Total;03/2027;23;0;2;2;21` ; Bob (équipe « Dev »), planifié 22 le 2027-01-04 : `Bob;Dev;Total;01/2027;21;0;22;22;-1` (nombre négatif sans apostrophe) | D-160 (2), (3) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-9 | Chef de projet, scénario de PDC-12 : pour Alice, colonne Projet après les 12 lignes « Total » : `M-PROJ1 · Nom M-PROJ1`, `N-LECT · Nom N-LECT`, `Autres projets` (12 lignes chacun, dans cet ordre) ; aucune ligne ne contient `A-ILLISIBLE2` ni `B-ILLISIBLE3` ; ligne `Autres projets` : Disponible et Écart vides ; administrateur : A-ILLISIBLE2, B-ILLISIBLE3, M-PROJ1, N-LECT, sans « Autres projets » | D-160 (3) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-10 | Filtres et vide : `equipe=<Dev>` → seules les lignes d'Alice et Bob ; `equipe=aucune` → Carl seul ; équipe inconnue 9999 → en-tête seul (`﻿` + en-tête + CRLF) ; base sans ressource → en-tête seul ; GET administrateur et chef n'écrit rien (empreinte identique) | D-160 (1), (3) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-11 | Injection : ressource « =Eve » → champ `'=Eve` ; équipe « @Eq » → champ `'@Eq` ; projet de code `=C1` et de nom « Nom » → champ `'=C1 · Nom` ; projet de code `Z-1` et de nom « =Nom » → champ `Z-1 · =Nom` non préfixé (le champ commence par le code) ; aucun nombre préfixé | D-160 (2) | 6f | packages/api/test/lot6f-csv.test.ts |

API, volet B (imputations) :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| CSV-12 | Accès : sans session 401 ; ressource (`est_ressource` ou non) 403 `{ erreur: 'Interdit' }`, y compris avec des paramètres invalides (403 avant 400) ; sans session avec paramètres invalides 401 ; administrateur et chef 200 ; base inchangée pour chaque refus | D-160 (4) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-13 | 400 : `du` ou `au` absent ; `2027-1-1`, `2027-02-30`, `abc`, `20270101` ; `du=1999-12-31&au=2000-01-05` ; `du=2099-12-30&au=2100-01-01` ; `au` antérieur à `du` ; `equipe=abc`, `1.5`, `1e2` ; base inchangée. 200 : `du=2000-01-01&au=2000-01-01`, `du=2099-12-31&au=2099-12-31` | D-160 (4) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-14 | Bornes de période (nombre de jours bornes comprises) : `du=2028-01-01&au=2028-12-31` (366 jours) 200 ; `du=2027-01-01&au=2028-01-02` (367 jours) 400 (r1 : le cas d'origine `au=2028-01-01` fait 366 jours, D-162) ; `du=2027-01-01&au=2027-12-31` (365 jours) 200 ; imputations du jour `du` et du jour `au` incluses, celles de la veille de `du` et du lendemain de `au` exclues | D-160 (4) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-15 | Fichier et contenu : `Content-Type: text/csv; charset=utf-8` ; `filename="imputations-2027-01-01-2027-01-31.csv"` ; BOM ; en-tête `Ressource;Équipe;Semaine;Statut;Projet;Activité;Jour;Charge` ; Alice (équipe « Dev »), P1 « Projet un », activité « Analyse » (WBS `1`), imputation 0,5 le 2027-01-06 (mercredi), feuille du lundi 2027-01-04 validée : ligne `Alice;Dev;04/01/2027;Validée;P1 · Projet un;1 Analyse;06/01/2027;0,5` ; équipe vide : `Carl;;…` | D-160 (2), (4) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-16 | Statuts : quatre semaines, feuilles brouillon, soumise, validée, rejetée (avec commentaire) : colonne Statut `Brouillon`, `Soumise`, `Validée`, `Rejetée` ; les quatre imputations exportées ; le commentaire n'apparaît pas | D-160 (4) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-17 | Tri : ressources créées Charles, bruno, Alice, alice → Alice, alice (même nom sans casse : par id), bruno, Charles ; pour une ressource : jour croissant, puis code du projet sans casse (`A-1` avant `b-2` le même jour), puis ordre WBS (activités `1` puis `2` du même projet le même jour) | D-160 (4) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-18 | Périmètre du chef : Alice impute dans P1 (chef = le chef), PL (autre chef ; le chef y est affecté, lecture seule) et P2 (autre chef, illisible) ; chef : seules les lignes de P1 ; une ressource qui n'impute que dans P2 est absente ; administrateur : les trois projets | D-160 (4) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-19 | Filtre équipe : `equipe=<Dev>` → Alice ; `equipe=aucune` → Carl seul ; équipe inconnue 9999 → en-tête seul ; période sans imputation → en-tête seul ; GET n'écrit rien (empreinte identique) | D-160 (4) | 6f | packages/api/test/lot6f-csv.test.ts |
| CSV-20 | Injection : ressource « =Eve » → `'=Eve` ; équipe « @Eq » → `'@Eq` ; activité de nom « =Nom » → champ `1 =Nom` non préfixé ; charge négative impossible en base (aucun test de nombre négatif ici) | D-160 (2) | 6f | packages/api/test/lot6f-csv.test.ts |

Web (fonctions pures, `packages/web/src/export/logique.ts`) :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GEO-53 | `periodeSemaine('2027-01-04')` → `{ du: '2027-01-04', au: '2027-01-10' }` ; `periodeSemaine('2026-12-28')` → `{ du: '2026-12-28', au: '2027-01-03' }` | D-160 (6) | 6f | packages/web/test/lot6f.test.ts |
| GEO-54 | `periodeExportValide` : (`2028-01-01`, `2028-12-31`) vrai (366 jours) ; (`2027-01-01`, `2028-01-02`) faux (367 ; r1 : le cas d'origine (`2027-01-01`, `2028-01-01`) fait 366 jours, D-162) ; (`2027-01-01`, `2027-01-01`) vrai ; (`2027-01-02`, `2027-01-01`) faux ; (`''`, `2027-01-01`) faux ; (`2027-01-01`, `''`) faux | D-160 (6) | 6f | packages/web/test/lot6f.test.ts |
| GEO-55 | `adresseExportPlan('2027-01', 'toutes')` → `/api/plan-de-charge/export?debut=2027-01` ; `('2027-01', 'aucune')` → `…?debut=2027-01&equipe=aucune` ; `('2027-01', 7)` → `…&equipe=7` ; `adresseExportImputations('2027-01-04', '2027-01-10', 'toutes')` → `/api/imputations/export?du=2027-01-04&au=2027-01-10` ; avec `'aucune'` et `7` : `&equipe=aucune`, `&equipe=7` | D-160 (5), (6) | 6f | packages/web/test/lot6f.test.ts |

E2E (e2e/tests/lot6f.spec.ts ; base « administrateur seul » avant et après chaque test ; téléchargements par `page.waitForEvent('download')` et lecture du fichier) :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-383 | Plan de charge : bouton « Exporter CSV » dans la barre des filtres (avant le tableau, après « Mois suivant » à la tabulation) ; Alice (équipe Alpha) et Bob (équipe Zeta) ; clic avec filtres par défaut : fichier `plan-de-charge-2027-01.csv`, en-tête de D-160 (3), lignes d'Alice et de Bob ; équipe « Alpha 6F » et mois 2027-05 : fichier `plan-de-charge-2027-05.csv`, lignes d'Alice seulement ; adresse de l'écran inchangée par le clic ; aucune requête d'écriture | D-160 (3), (5) | 6f | e2e/tests/lot6f.spec.ts |
| E2E-384 | Validation : « Exporter CSV » ouvre le dialogue « Exporter les imputations » ; Du `2026-01-12` et Au `2026-01-18` (semaine affichée, horloge du navigateur au 14/01/2026) ; liste « Équipe » : « Toutes », « Sans équipe », équipes par nom ; « Exporter » télécharge `imputations-2026-01-12-2026-01-18.csv` avec l'en-tête de D-160 (4) et la ligne de l'imputation d'Alice ; dialogue fermé, focus sur « Exporter CSV » ; après « Semaine suivante », champs préremplis `2026-01-19` et `2026-01-25` | D-160 (4), (6) | 6f | e2e/tests/lot6f.spec.ts |
| E2E-385 | Période invalide : Au `2026-01-11` avant Du `2026-01-12` : « Période invalide. », `aria-invalid` sur les champs, « Exporter » désactivé ; période de 367 jours : même état ; 366 jours : message absent, bouton actif ; aucun appel à /api/imputations/export pendant les états invalides ; Échap ferme le dialogue sans téléchargement, focus sur « Exporter CSV » | D-160 (6) | 6f | e2e/tests/lot6f.spec.ts |
| E2E-386 | Chef de projet : export du plan de charge : ligne « Autres projets » pour le projet d'un autre chef, aucun nom ni code de ce projet dans le fichier ; export des imputations : seules les lignes de son projet ; rôle ressource : /plan-de-charge et /validation redirigent vers /mes-taches (aucun bouton d'export) | D-160 (3), (4) | 6f | e2e/tests/lot6f.spec.ts |
| E2E-387 | Extension du parcours complet (administrateur seul, tout à l'écran, gestes d'E2E-382, horloge du navigateur au 14/01/2026) : calendrier, équipe « Équipe 6F », ressource, chef, projet, affectation, activité assignée créés à l'écran ; la ressource saisit 1 j le 12/01/2026 par la Feuille de temps et enregistre ; l'administrateur exporte le plan de charge (`?debut=2026-01`) et les imputations (semaine du 12/01) à l'écran : dans les fichiers, l'en-tête et la ligne `Ressource 6F;Équipe 6F;Total;01/2026;<disponible>;1;0;1;<écart>` et la ligne `Ressource 6F;Équipe 6F;12/01/2026;Brouillon;6F · Projet 6F;1 Tâche 6F;12/01/2026;1` | D-160 (7) | 6f | e2e/tests/lot6f.spec.ts |

### Couverture des champs, lot 6f (règle « Couverture des champs »)

Les deux routes sont en lecture seule : aucun champ modifiable nouveau.

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| GET /api/plan-de-charge/export `debut` (lecture seule) | champ « Mois de départ » de l'écran Plan de charge, repris par « Exporter CSV » | E2E-383 |
| GET /api/plan-de-charge/export `equipe` (lecture seule) | liste « Équipe » de l'écran Plan de charge, reprise par « Exporter CSV » | E2E-383 |
| GET /api/imputations/export `du`, `au` (lecture seule) | champs « Du » et « Au » du dialogue « Exporter les imputations » | E2E-384, E2E-385 |
| GET /api/imputations/export `equipe` (lecture seule) | liste « Équipe » du dialogue | E2E-384 |
| Colonnes des deux fichiers (lecture seule) | fichiers téléchargés ; aucun affichage à l'écran | E2E-383, E2E-384, E2E-387 |

### Preuves de la phase rouge de 6f (D-160)

- Vitest API : 20 rouges sur 20 (lot6f-csv.test.ts). CSV-1 à CSV-4 : module `export/csv` absent (« Cannot find module »). CSV-5 à CSV-20 : route absente, 404 « Route GET:/api/plan-de-charge/export… not found » ou « /api/imputations/export… not found », atteint après préparation réussie. Le module est chargé par import dynamique pour que l'absence ne masque pas les tests de route.
- Vitest web : lot6f.test.ts ne se charge pas (module `export/logique` absent) : GEO-53 à GEO-55 non exécutés.
- E2E : 5 rouges (E2E-383 à E2E-387), chacun à l'étape d'écran (bouton « Exporter CSV » absent, aucun téléchargement) ; toutes les préparations par l'API et, pour E2E-387, tous les gestes d'écran de création et de saisie ont réussi avant l'échec.
- Lint vert. Typecheck : seule erreur, TS2307 sur `../src/export/csv.js` (module absent, attendu en phase rouge).

## Révisions D-031 de REX-5 (D-165 (7))

Inventaire vérifié par recherche dans e2e/tests et packages/*/test : `allerA(page, 'Calendriers')`, `allerA(page, 'Équipes')`, `ouvrirEquipes`, liens de menu « Calendriers » et « Équipes », adresses `/equipes` et `/calendriers`, listes de liens du menu, boutons « Nouveau calendrier ». Tests web (packages/web/test) : aucun ne touche ces écrans (fonctions pures). Tests API : aucun (l'API ne change pas). `Calendriers.tsx` n'a aucun test de lecture seule pour un non-administrateur (mode lu par `useAdmin`, jamais exercé par un e2e) : aucun test à retirer ; E2E-393 couvre la redirection qui le remplace.

Mécanique commune de la révision : le geste « ouvrir l'écran Calendriers (ou Équipes) par le menu » devient « ouvrir l'écran Utilisateurs, puis l'onglet Calendriers (ou Équipes) » par les nouveaux helpers `ouvrirCalendriers` et `ouvrirEquipes` (e2e/tests/lot3c-helpers.ts et lot6a-helpers.ts). Valeurs attendues, intentions et suite des gestes inchangées. Les helpers d'e2e ne sont pas des tests : leur changement suit les révisions listées ici.

| ID | Raison de la révision | Spec | Fichier |
|---|---|---|---|
| E2E-5-r1 | Ouvre « Calendriers » par le lien de menu, puis vérifie le titre h1 « Calendriers » : plus de lien ni de h1 ; ouverture par l'onglet, h1 « Utilisateurs » | D-165 (3) | e2e/tests/lot1.spec.ts |
| E2E-21-r1 | Idem (lien de menu, h1) ; la suppression du calendrier depuis le détail revient à l'onglet Calendriers | D-165 (3), (3 bis) | e2e/tests/lot1b-c.spec.ts |
| E2E-46-r1 | Parcours complet : calendrier créé par l'écran Calendriers, désormais par l'onglet (D-165 (6)) | D-165 (6) | e2e/tests/rex1.spec.ts |
| E2E-59-r1 | Parcours complet : idem | D-165 (6) | e2e/tests/lot3c.spec.ts |
| E2E-110-r1 | Parcours complet : idem | D-165 (6) | e2e/tests/accueil-g4.spec.ts |
| E2E-123-r1 | Parcours complet : idem | D-165 (6) | e2e/tests/cloture-c2.spec.ts |
| E2E-131-r1 | Extension du parcours complet : idem | D-165 (6) | e2e/tests/lot3d1.spec.ts |
| E2E-170-r1 | Parcours complet : idem | D-165 (6) | e2e/tests/lot3d4.spec.ts |
| E2E-180-r1 | Parcours complet : idem | D-165 (6) | e2e/tests/lot3e.spec.ts |
| E2E-192-r1 | Parcours complet : idem | D-165 (6) | e2e/tests/lot3f1.spec.ts |
| E2E-208-r1 | Parcours complet : idem | D-165 (6) | e2e/tests/lot3f2.spec.ts |
| E2E-244-r2 | Parcours complet (déjà -r1) : idem | D-165 (6) | e2e/tests/lot4b.spec.ts |
| E2E-317-r1 et E2E-318-r1 | Parcours complets (via l'assistant `parcoursJusquaSoumission`, qui ouvrait l'écran Calendriers) : idem | D-165 (6) | e2e/tests/lot4c.spec.ts |
| E2E-345-r1 | Parcours complet avec équipe : calendrier et équipe créés par les onglets (deux endroits : création, puis retour à l'écran Équipes pour le nombre de membres) | D-165 (6) | e2e/tests/lot6a.spec.ts |
| E2E-353-r1 | Parcours complet : idem | D-165 (6) | e2e/tests/lot6b.spec.ts |
| E2E-358-r1 | Parcours complet : idem | D-165 (6) | e2e/tests/lot6c.spec.ts |
| E2E-376-r1 | Parcours complet : calendrier et équipe par les onglets | D-165 (6) | e2e/tests/lot6d.spec.ts |
| E2E-382-r1 | Parcours complet : calendrier et équipe par les onglets | D-165 (6) | e2e/tests/lot6e.spec.ts |
| E2E-387-r1 | Parcours complet : calendrier et équipe par les onglets | D-165 (6) | e2e/tests/lot6f.spec.ts |
| E2E-335-r1 | Ancienne : entrée « Équipes » après « Calendriers », écran `/equipes`. Nouvelle : plus d'entrée ; l'onglet Équipes de `/utilisateurs?onglet=equipes` affiche le bouton « Nouvelle équipe » et le tableau (colonnes Nom, Membres, Actions) | D-165 (2), (3) | e2e/tests/lot6a.spec.ts |
| E2E-336-r1 | Ancienne : entrée « Équipes » absente pour chef et ressource. Nouvelle : entrées « Équipes » et « Calendriers » absentes pour chef et ressource | D-165 (3) | e2e/tests/lot6a.spec.ts |
| E2E-337-r1 à E2E-341-r1 | Créer, renommer, supprimer, refus de doublon, refus d'équipe utilisée : le geste d'ouverture passe par `ouvrirEquipes` (onglet) ; textes, dialogues et état en base inchangés | D-165 (2) | e2e/tests/lot6a.spec.ts |
| E2E-343-r2 | Ancienne -r1 : effet de la modification d'un utilisateur dans l'écran Équipes (deux ouvertures). Nouvelle : même effet lu dans l'onglet Équipes | D-165 (2) | e2e/tests/lot6a.spec.ts |
| E2E-346-r1 | Captures : écran Équipes ouvert par l'onglet (sans assertion fonctionnelle) | D-165 (2) | e2e/tests/lot6a-captures.spec.ts |
| E2E-347-r1 | Ancienne : menu du rôle ressource `['Mes tâches', 'Calendriers', 'Imputations']`. Nouvelle : `['Mes tâches', 'Imputations']` | D-165 (5) | e2e/tests/lot6b.spec.ts |

Révision de la phase verte (D-167 (2)), tag `tests-rex5-r1` :

| ID | Test | Spec | Fichier |
|---|---|---|---|
| E2E-393-r1 | Ancienne : après `goBack`, `toHaveURL('/imputations')` ; l'écran Imputations réécrit l'adresse en `/imputations?semaine=…` (4b). Nouvelle : `toHaveURL(/\/imputations(\?|$)/)` ; autres attentes inchangées (E2E-393 de la rubrique « Tests de REX-5 » est donc E2E-393-r1) | D-167 (2) | e2e/tests/rex5.spec.ts |

Aucune autre révision : les autres e2e du lot 6b (E2E-348 à E2E-352) ne touchent ni les menus ni `/calendriers`.

## Tests de REX-5 (D-165)

E2E (e2e/tests/rex5.spec.ts ; base « administrateur seul » avant et après chaque test ; date du jour fixée par `page.clock.setFixedTime` ; calendriers propres créés par l'API, jamais le calendrier par défaut, D-163 (3)) :

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-388 | Trois onglets « Utilisateurs », « Équipes », « Calendriers » (rôle `tab`) ; « Utilisateurs » sélectionné par défaut, adresse `/utilisateurs` ; clic « Équipes » : adresse `?onglet=equipes` ; clic « Calendriers » : `?onglet=calendriers` ; retour à « Utilisateurs » : adresse sans paramètre | D-165 (2) | REX-5 | e2e/tests/rex5.spec.ts |
| E2E-389 | Ouverture directe : `?onglet=equipes` et `?onglet=calendriers` sélectionnent l'onglet ; `?onglet=zzz` : onglet Utilisateurs sélectionné | D-165 (2) | REX-5 | e2e/tests/rex5.spec.ts |
| E2E-390 | Relecture des équipes : équipe « Atelier 5 » créée dans l'onglet Équipes ; onglet Utilisateurs, « Nouvel utilisateur » : liste « Équipe » contient « Atelier 5 », sans rechargement (marqueur `window` conservé) ; utilisateur créé avec cette équipe ; retour onglet Équipes : Membres = 1 | D-165 (2) | REX-5 | e2e/tests/rex5.spec.ts |
| E2E-391 | Relecture des calendriers : calendrier « Cal 5 » créé dans l'onglet Calendriers ; onglet Utilisateurs, « Nouvel utilisateur » : liste « Calendrier » contient « Cal 5 », sans rechargement | D-165 (2) | REX-5 | e2e/tests/rex5.spec.ts |
| E2E-392 | Administrateur : `/equipes` arrive sur `/utilisateurs?onglet=equipes`, `/calendriers` sur `/utilisateurs?onglet=calendriers`, onglet sélectionné ; aucune entrée d'historique (un retour en arrière ne revient pas sur l'ancienne adresse) | D-165 (3) | REX-5 | e2e/tests/rex5.spec.ts |
| E2E-393 | Chef de projet : `/equipes`, `/calendriers` et `/calendriers/<id>` arrivent sur « / » ; ressource : sur `/mes-taches` ; aucune entrée d'historique ; aucune requête GET /api/calendriers/<id> ni écran de détail ; base inchangée | D-165 (3), (3 bis) | REX-5 | e2e/tests/rex5.spec.ts |
| E2E-394 | Menus : administrateur et chef de projet sans « Équipes » ni « Calendriers » (administrateur avec « Utilisateurs ») ; chef de projet `est_ressource` avec « Mes tâches » | D-165 (3) | REX-5 | e2e/tests/rex5.spec.ts |
| E2E-395 | Détail d'un calendrier : lien du nom dans l'onglet Calendriers ouvre `/calendriers/<id>` ; entrée de menu « Utilisateurs » marquée active (`aria-current="page"`) ; lien « Retour aux calendriers » ramène à `/utilisateurs?onglet=calendriers`, onglet Calendriers sélectionné ; suppression du calendrier depuis le détail revient à ce même onglet | D-165 (3 bis) | REX-5 | e2e/tests/rex5.spec.ts |
| E2E-396 | « Mon calendrier », nominal : horloge au 10/03/2027 ; ressource sur un calendrier « Cal 5 » (lundi au vendredi, fériés 2027-12-25 sans libellé, 2027-05-01 « Fête du travail », 2027-03-10 « Aujourd'hui », 2027-03-09 « Hier » créés dans le désordre) ; h2 « Mon calendrier » sous le tableau « Mes tâches » ; nom « Cal 5 » ; « Jours travaillés : lundi, mardi, mercredi, jeudi, vendredi » ; tableau « Jours fériés à venir » colonnes Date et Libellé, lignes `10/03/2027 Aujourd'hui`, `01/05/2027 Fête du travail`, `25/12/2027 —` dans cet ordre, pas de ligne du 09/03/2027 ; aucun bouton d'édition | D-165 (4) | REX-5 | e2e/tests/rex5.spec.ts |
| E2E-397 | « Mon calendrier », vide : calendrier sans férié à venir (un seul férié, 2027-03-09, horloge au 10/03/2027) : « Aucun jour férié à venir. », pas de tableau « Jours fériés à venir » ; jours travaillés en toutes lettres, y compris samedi et dimanche pour un calendrier lundi au dimanche | D-165 (4) | REX-5 | e2e/tests/rex5.spec.ts |
| E2E-398 | « Mon calendrier », erreur : GET /api/calendriers/<id> intercepté en 500 : « Impossible de charger votre calendrier. », tableau des tâches affiché avec sa ligne ; inversement GET /api/mes-taches en 500 : « Impossible de charger vos tâches. » et section « Mon calendrier » affichée | D-165 (4) | REX-5 | e2e/tests/rex5.spec.ts |
| E2E-399 | Affichage de la section : visible pour un chef de projet `est_ressource` et pour un rôle ressource ; sans entrée « Mes tâches » et sans lecture du calendrier pour un chef de projet non ressource ; requête GET /api/calendriers/<id> du `calendrier_id` de la session seulement | D-165 (4) | REX-5 | e2e/tests/rex5.spec.ts |

Parcours complet : les dix-huit parcours complets listés plus haut (hors E2E-5-r1 et E2E-21-r1, qui ne sont pas des parcours complets) partent d'une base où seul l'administrateur existe et créent désormais calendrier et équipe par les onglets ; E2E-387-r1 est le plus récent, E2E-345-r1 couvre l'équipe.

### Couverture des champs, REX-5 (règle « Couverture des champs »)

Aucun champ d'API nouveau ni modifié (API inchangée). Champs déplacés d'écran :

| Champ de l'API | Champ d'écran | Test |
|---|---|---|
| POST /api/equipes `nom` ; PATCH /api/equipes/:id `nom` | onglet « Équipes » : champ « Nom » de « Nouvelle équipe » et du dialogue « Renommer <nom> » | E2E-337-r1, E2E-338-r1, E2E-390 |
| POST /api/calendriers `nom`, jours travaillés, fériés ; PATCH `nom`, jours | onglet « Calendriers » (création) et page de détail (modification) | E2E-5-r1, E2E-21-r1, E2E-391, E2E-395 |
| GET /api/calendriers/:id (lecture seule) | section « Mon calendrier » de Mes tâches : nom, jours travaillés, fériés à venir | E2E-396 à E2E-399 |

### Preuves de la phase rouge de REX-5 (D-165)

- Lancés (D-128) : e2e nouveaux (E2E-388 à E2E-399) et révisés, seuls ; lint et typecheck verts (prettier, eslint, tsc : 0 erreur). Pas de vitest : aucun test web ni API touché.
- E2E-388 à E2E-399 : 12 rouges sur 12. Onglets absents (`tab` introuvable : E2E-388, E2E-389), `/equipes` et `/calendriers` sans redirection (E2E-392, E2E-393), entrées « Équipes » et « Calendriers » encore au menu (E2E-394), onglets et lien « Retour aux calendriers » absents (E2E-390, E2E-391, E2E-395), titre h2 « Mon calendrier » absent (E2E-396 à E2E-399).
- Révisions -r1 : E2E-5, E2E-21, E2E-46, E2E-110, E2E-335 à E2E-341, E2E-343-r2, E2E-345, E2E-346, E2E-347 lancés : tous rouges, à l'étape d'ouverture de l'onglet (« locator.click: Timeout » sur `tab`) ou à l'assertion de menu. Les autres parcours complets (E2E-59, 123, 131, 170, 180, 192, 208, 244-r2, 317, 318, 353, 358, 376, 382, 387) passent par le même assistant `ouvrirCalendriers` ou `ouvrirEquipes` et n'ont pas été lancés un à un (D-128) ; rouges à justifier à la phase verte.
- Correction faite en cours de route : les parcours de lot4c révisés sont E2E-317 et E2E-318 (assistant `parcoursJusquaSoumission`), pas E2E-316.

## Test API de REX-5 (D-167 (1))

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| AUTH-16 | Utilisateur avec une équipe (`equipe_id` non nul) et un calendrier non défaut : après `POST /api/auth/login`, la réponse de `GET /api/auth/me` (sans `mot_de_passe_origine`) est égale champ par champ à l'utilisateur de la réponse de login, `calendrier_id` et `equipe_id` compris | D-167 (1), D-147 (4) | REX-5 | packages/api/test/rex5-auth.test.ts |
- AUTH-16 : rouge prouvé avant la correction (sortie de session) : `calendrier_id` absent de la réponse de GET /api/auth/me (« Expected … "calendrier_id": 2 » manquant) ; vert après `loadUser` sur `USER_COLUMNS`. Test et correctif dans un seul commit `fix:` (D-167 (2)).
- Phase verte : E2E-388 à E2E-399 verts sur 3 passes ; suite complète 1030 vitest, 420 e2e.

## Tests du SBOM (D-169)

Fichier : scripts/test/sbom.test.ts. Fixture : scripts/test/fixtures/sbom/ (X = `ms`, Y = `is-number`, Z = `isarray`).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| SBOM-1 | Fixture, deux écritures successives → fichiers identiques octet pour octet | D-169 (3) | SBOM | scripts/test/sbom.test.ts |
| SBOM-2 | Fichier écrit sans `serialNumber`, `metadata.timestamp` ni `metadata.tools` ; `specVersion` et `metadata.component` présents ; lifecycles phase `pre-build` | D-169 (2), (3) | SBOM | scripts/test/sbom.test.ts |
| SBOM-3 | `components` triés par `bom-ref` ; `dependencies` triées par `ref` ; chaque `dependsOn` trié | D-169 (3) | SBOM | scripts/test/sbom.test.ts |
| SBOM-4 | X figure, avec sa licence (non-régression : X est aussi devDependency de e2e) ; `packages/a` figure ; Y, Z et `@planersource/e2e` sont absents (composant, ref, `dependsOn`) ; aucun composant ne porte `development=true` | D-169 (2), (7) | SBOM | scripts/test/sbom.test.ts |
| SBOM-5 | Intégrité : chaque ref de `dependencies` et chaque élément de `dependsOn` désigne un composant présent ou `metadata.component` | D-169 (2) | SBOM | scripts/test/sbom.test.ts |
| SBOM-6 | `--check` sur un fichier à jour → code 0, fichier inchangé (contenu et date de modification) | D-169 (4) | SBOM | scripts/test/sbom.test.ts |
| SBOM-7 | `--check` sur un fichier périmé (un composant retiré) → code 1, stderr nomme le composant et `npm run sbom`, fichier inchangé ; fichier absent → code 1, fichier toujours absent | D-169 (4) | SBOM | scripts/test/sbom.test.ts |
| SBOM-8 | ci.yml a l'étape `npm run sbom -- --check`, après `npm run licenses` et avant l'installation de Playwright | D-169 (5) | SBOM | scripts/test/sbom.test.ts |
| SBOM-9 | package.json racine a le script `sbom` = `node scripts/sbom.mjs` ; `.prettierignore` contient `sbom.cdx.json` | D-169 (4), (6) | SBOM | scripts/test/sbom.test.ts |
| SBOM-10 | La fixture est copiée dans deux dossiers de noms différents (`nom-a`, `nom-b`), puis écrite dans chacun : les deux fichiers sont identiques octet pour octet et `metadata.component.name` vaut le `name` du package.json de la fixture ; `--check` lancé dans `nom-b` sur le fichier écrit dans `nom-a` renvoie 0 | D-170 (1) | SBOM | scripts/test/sbom.test.ts |

### Preuves de la phase rouge du SBOM (D-169)

- Fixture : lock généré par `npm install --package-lock-only` ; `npm sbom --package-lock-only` fonctionne sans node_modules ; `--omit dev` perd X (`ms`) et ses liens, alors que l'arbre complet le garde.
- Lancés (D-128) : vitest sur scripts/test/sbom.test.ts seul ; lint et typecheck verts.
- SBOM-1 à SBOM-7 : 7 rouges sur 7, `scripts/sbom.mjs` absent (`Cannot find module`, code 1 au lieu de 0). SBOM-8 : étape `npm run sbom -- --check` absente de ci.yml. SBOM-9 : script `sbom` absent de package.json.

### Preuves de la phase verte du SBOM (D-169)

- SBOM-1 à SBOM-9 : 9 verts sur 9 ; ci.test.ts vert (10 tests sur les deux fichiers).
- Suite complète une fois (D-128) : lint, typecheck, licences verts ; 1039 vitest ; 420 e2e (12,6 min). Aucun aléa connu observé.
- `npm run sbom` puis `npm run sbom -- --check` : code 0. sbom.cdx.json : 137 composants, aucun `development=true`, aucune référence pendante, `@planersource/e2e` absent, `pg` et sa pile présents. Écart avec check-licenses : seulement les workspaces api, engine, web et `@types/react`, `@types/react-dom`, `csstype`.
- Versions locales : node v22.23.5, npm 10.9.9.
- Relecture @reviewer : aucun bloquant ; non-bloquants dans docs/non-bloquants.md.

### Preuves de SBOM-10 (D-170)

- Rouge prouvé (vitest sur sbom.test.ts seul) : SBOM-10 seul rouge, 9 verts sur 10. Les deux fichiers écrits dans `nom-a` et `nom-b` diffèrent (`metadata.component.name` suit le nom du dossier).
- Vert après correction de scripts/sbom.mjs : 10 tests sur 10. Test et correctif dans un seul commit `fix:`.
- Contrôles : vitest sur scripts/test/ en entier (23 tests), lint, typecheck, licences verts. Worktree `/tmp/autre-nom` sans node_modules : `node scripts/sbom.mjs --check` → 0. Seul changement de sbom.cdx.json : `metadata.component.name` devient `planersource`.


## Révisions D-031 de la confirmation en quittant (D-172 (6))

Inventaire vérifié par recherche dans e2e/tests (tous les fichiers touchant la Feuille de temps ou le Planning manuel : `lot2e`, `lot2e-bouton`, `lot3g`, `rex3a`, `lot4b`, `lot4b-corr`, `lot4b-captures`, `lot4c`, `lot5d`, `lot6b`, `lot6f`) et par un script qui repère, dans chaque test, une saisie suivie d'une sortie (`goto`, `reload`, lien, bouton de semaine ou de mois, déconnexion) sans enregistrement ni annulation entre les deux. Résultat :

- Touché : E2E-27 seul (`lot2e.spec.ts`). Il affirme que les boutons de mois sont inactifs tant qu'il reste une modification ; D-172 (6) les rend actifs.
- Non touchés : E2E-217 (`lot3g.spec.ts`) et E2E-254 (`rex3a.spec.ts`) : ils changent de mois sans modification en attente, ou ne quittent pas l'écran après une saisie ; leurs « Mois suivant » restent actifs, sans confirmation. E2E-253 (`rex3a.spec.ts`) finit sur une saisie refusée et gardée, sans sortie. `lot4b` (hors E2E-243), `lot4b-corr`, `lot4c`, `lot6b`, `lot6f` : ils enregistrent avant de quitter, ou finissent sur la saisie. E2E-245 (captures) imprime des données posées par l'API.
- E2E-243 (`lot4b.spec.ts`) : inchangé, doit rester vert (une seule confirmation, par la garde).
- Limite : le script ne voit que les gestes écrits dans le test ; un geste caché dans un helper n'est pas détecté. Les helpers de saisie (`caseCharge`, `libelleCase`) sont des localisateurs, sans navigation.

| ID | Raison de la révision | Spec | Fichier |
|---|---|---|---|
| E2E-27-r1 | Même intention : le changement de mois ne perd pas une saisie sans l'accord de l'utilisateur. Ancien comportement : « Mois précédent » et « Mois suivant » inactifs tant qu'une case est cochée. Nouveau : ils restent actifs ; « Mois précédent » avec une saisie ouvre la confirmation ; « Annuler » garde le mois et la saisie ; « Annuler » du formulaire rétablit l'état chargé. Le reste du test (navigation sans saisie, mois de février vide, retour sur janvier) est inchangé | D-172 (6) | e2e/tests/lot2e.spec.ts |

## Tests de la confirmation en quittant (D-172)

E2E (e2e/tests/sortie.spec.ts ; base « administrateur seul » avant et après chaque test ; date du jour fixée par `page.clock.setFixedTime(H14)` ; données préparées par l'API ; Feuille de temps : Alice, `monde4b` ; Planning manuel : `monde` de lot2e-helpers, janvier 2027). Dans tous les tests de refus, l'état en base est relu par l'API (feuille inexistante, aucune saisie) ; aucune écriture n'est envoyée.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-400 | Feuille de temps : une case remplie, clic sur l'entrée de menu « Mes tâches » : confirmation « Abandonner les modifications ? » ; « Annuler » : même adresse, saisie gardée ; second clic puis « Abandonner » : écran « Mes tâches » ; feuille inexistante en base, aucune écriture envoyée | D-172 (2) ; §7 4b (8) | Sortie | e2e/tests/sortie.spec.ts |
| E2E-401 | Feuille de temps : case remplie, retour du navigateur : confirmation, adresse de la feuille rétablie ; « Annuler » : saisie gardée ; second retour puis « Abandonner » : page précédente (« Mes tâches ») ; feuille inexistante en base | D-172 (3) | Sortie | e2e/tests/sortie.spec.ts |
| E2E-402 | Feuille de temps : case remplie, « Se déconnecter » : confirmation ; « Annuler » : toujours connecté (menu visible), saisie gardée ; second clic puis « Abandonner » : `/connexion` ; feuille inexistante en base | D-172 (5) | Sortie | e2e/tests/sortie.spec.ts |
| E2E-403 | Feuille de temps : case remplie, « Semaine suivante » : un seul dialogue de confirmation (nombre de dialogues = 1) ; « Annuler » : même semaine ; « Abandonner » : semaine suivante, un seul dialogue encore | D-172 (2) | Sortie | e2e/tests/sortie.spec.ts |
| E2E-404 | Feuille de temps : sans modification, l'entrée de menu ne demande rien ; après un enregistrement réussi (case remplie, « Enregistrer »), l'entrée de menu ne demande rien non plus ; aucun dialogue | D-172 (2) | Sortie | e2e/tests/sortie.spec.ts |
| E2E-405 | Planning manuel : case cochée, « Retour au projet » : confirmation ; « Annuler » : même adresse, case cochée ; second clic puis « Abandonner » : fiche du projet ; aucune saisie en base | D-172 (2) | Sortie | e2e/tests/sortie.spec.ts |
| E2E-406 | Planning manuel : case cochée, « Mois suivant » actif ; confirmation ; « Annuler » : même mois, case cochée ; « Abandonner » : mois suivant, grille vide ; aucune saisie en base | D-172 (2), (6) | Sortie | e2e/tests/sortie.spec.ts |
| E2E-407 | Planning manuel : sans modification, « Mois suivant » et « Retour au projet » ne demandent rien ; après « Enregistrer » réussi, « Retour au projet » ne demande rien ; aucun dialogue | D-172 (2) | Sortie | e2e/tests/sortie.spec.ts |
| E2E-408 | Rechargement : avec une modification (Feuille de temps, puis Planning manuel), un dialogue du navigateur de type `beforeunload` s'ouvre au rechargement ; sans modification, ou après un enregistrement, aucun | D-172 (4) | Sortie | e2e/tests/sortie.spec.ts |

### Couverture des champs, confirmation en quittant (règle « Couverture des champs »)

Aucun champ d'API ajouté ni modifié : l'API est inchangée.

### Preuves de la phase rouge de la confirmation en quittant (D-172)

- Lancés (D-128) : e2e de sortie.spec.ts et E2E-27-r1 seuls ; E2E-243 seul ; lint et typecheck verts.
- Rouges (7 sur 10) : E2E-27-r1 (« Mois précédent » inactif avec une saisie), E2E-400 à E2E-402 et E2E-405 (aucune confirmation à la sortie, `dialog` introuvable), E2E-406 (« Mois suivant » inactif), E2E-408 (aucun `beforeunload`).
- Verts dès la phase rouge, par construction (gardes de non-régression, ils protègent la phase verte) : E2E-403 (le changement de semaine est déjà confirmé : une seule confirmation, à conserver après le passage par la garde), E2E-404 et E2E-407 (sans modification ou après enregistrement : aucune confirmation, à conserver).
- E2E-243 : vert.

### Preuves de la phase verte de la confirmation en quittant (D-172)

- Code : router.tsx (garde unique, position d'historique `idx`, adresse tenue par le routeur), components/GardeSortie.tsx (confirmation et `beforeunload`), Layout (déconnexion), FeuilleTemps (confirmation propre à la semaine supprimée), PlanningManuel (boutons de mois actifs). Aucune dépendance ajoutée, aucun test modifié après le tag `tests-sortie`.
- E2E-27-r1, E2E-400 à E2E-408, E2E-243 : 11 verts ; E2E-400 à E2E-408 : 27 verts sur 3 passes.
- Historique du retour du navigateur (test jetable, non commité) : après « Annuler », `history.length` inchangé et adresse de la feuille rétablie ; après un second retour et « Abandonner », page précédente, `history.length` inchangé, l'avance ramène sur la feuille, saisie perdue.
- Suite complète une fois (D-128) : lint, typecheck verts ; 1040 vitest ; licences conformes (131 / 176) ; `sbom --check` à jour ; 429 e2e verts (12,2 min). Aucun aléa observé.
- Relecture @reviewer : aucun bloquant ; 5 non-bloquants dans docs/non-bloquants.md.


## Tests de la dévalidation, API (DEV-I, D-176)

Fichier : packages/api/test/devalidation.test.ts (nouveau ; aides de lot4a-helpers.ts). Date du jour du serveur : mercredi 13/01/2027. Monde du lot 4a : P (chef `chef`), Q (chef `autreChef`), Alice avec imputations sur P et Q ; valeurs attendues de SPEC §7 « Dévalidation (D-176) ». Les identifiants DEV-1 à DEV-11 étant pris (compte de développement), la série continue à DEV-12. Tout test de refus relit l'état en base (empreinte complète, dont `feuille_temps` et `validation_feuille`).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| DEV-12 | Administrateur, feuille validée sur P et Q : 200, statut « soumise », aucune validation en base ; réponse égale au GET de la feuille | §7 Dévalidation (1) | DEV-I | packages/api/test/devalidation.test.ts |
| DEV-13 | Chef de P, même feuille : 200, validation de P supprimée, celle de Q (chef de Q, date) conservée, statut « soumise » | §7 Dévalidation (1) | DEV-I | packages/api/test/devalidation.test.ts |
| DEV-14 | Soumise partiellement validée, dévalidée par son validateur : 200, aucune validation ; la ressource rappelle : 200, brouillon | §7 Dévalidation (1) | DEV-I | packages/api/test/devalidation.test.ts |
| DEV-15 | Après DEV-13 : rappeler par la ressource 422 `deja_validee`, base inchangée ; rejeter par le chef de P 200, statut rejetée | §7 Dévalidation (1) | DEV-I | packages/api/test/devalidation.test.ts |
| DEV-16 | Sans session 401 ; identifiant mal formé, inconnu ou feuille non visible : 404 corps `{ erreur: 'Feuille introuvable' }` ; base inchangée | §7 Dévalidation (1) | DEV-I | packages/api/test/devalidation.test.ts |
| DEV-17 | Visible sans écrire sur un projet concerné (chef de Q, feuille sans imputation sur Q) : 403 `{ erreur: 'Interdit' }` ; la ressource sur sa feuille validée : 403 ; base inchangée | §7 Dévalidation (1) | DEV-I | packages/api/test/devalidation.test.ts |
| DEV-18 | Brouillon et feuille rejetée, par le chef et par l'administrateur : 422 `statut_invalide`, base inchangée | §7 Dévalidation (1) | DEV-I | packages/api/test/devalidation.test.ts |
| DEV-19 | Soumise sans validation (chef, administrateur) et soumise dont la seule validation porte sur P, par le chef de Q : 422 `rien_a_devalider`, base inchangée | §7 Dévalidation (1) | DEV-I | packages/api/test/devalidation.test.ts |
| DEV-20 | Ordre des refus : 401 avant 404 ; 404 avant 403 (ressource tierce sur un brouillon) ; 403 avant `statut_invalide` (la ressource, le chef de Q sur un brouillon) ; `statut_invalide` avant `rien_a_devalider` (chef sur un brouillon) | §7 Dévalidation (1) | DEV-I | packages/api/test/devalidation.test.ts |

### Couverture des champs, dévalidation API (règle « Couverture des champs »)

| Champ de l'API | Champ d'écran | Tests |
|---|---|---|
| POST /api/feuilles/:id/devalider (sans corps) | hors écran en DEV-I ; écran Validation en DEV-E (bouton « Dévalider ») | DEV-12 à DEV-20 |

### Preuves de la phase rouge de DEV-I (D-176)

- Lancés (D-128) : devalidation.test.ts seul ; lint et typecheck verts.
- Rouges : 9 sur 9 (DEV-12 à DEV-20). La route n'existe pas : Fastify répond 404 avec le corps `{ message: 'Route POST:/api/feuilles/…/devalider not found', … }`. Les tests de 404 (DEV-16, DEV-20) comparent le corps exact `{ erreur: 'Feuille introuvable' }` et échouent donc aussi ; aucun test vert à tort.

### Preuves de la phase verte de DEV-I (D-176, D-178)

- Code : `devalider` dans la boucle de routes/feuilles.ts et dans `agir` (planning/feuilles.ts). Aucune migration, aucun test modifié après le tag `tests-devalidation-i` (255cd89).
- devalidation.test.ts : 9 verts ; avec les tests du cycle de 4a (lot4a-feuilles, complements, validations, lot4b-rappeler) : 37 verts. Lint et typecheck verts.
- Suite complète une fois (D-128) : vitest 1048 verts sur 1049 ; le rouge est `scripts/test/aucune-reference-externe.test.ts` (un motif de PUB-2 (tunnel ssh) dans docs/recette.md depuis D-175), sans lien avec DEV-I. e2e : 429 verts (11,7 min).
- Un premier passage e2e, concurrent à un vitest du reviewer sur la même base `_test`, a échoué en cascade ; rejoué seul : 429 verts.
- Relecture @reviewer : aucun bloquant ; 2 non-bloquants de code consignés dans docs/non-bloquants.md.

## Tests de DEV-E, écran Validation : Dévalider (D-176, D-179)

Fichiers : packages/web/test/validation.test.ts (ajout, VFT-14 à VFT-18 ; fonctions à créer dans `packages/web/src/validation/logique.ts` : `peutDevalider(feuille)`, `codesDevalidables(feuille)`, action `'devalider'` de `cibleFocus`, code `rien_a_devalider` dans `messageRefusValidation` et `relireListe`) ; e2e/tests/devalidation-e.spec.ts et devalidation-e-helpers.ts (nouveaux ; monde de lot4c-helpers.ts, horloge H14) ; e2e/tests/lot4b.spec.ts (E2E-244-r3). Valeurs de SPEC §7 « Dévalidation (D-176) » point 2 et de D-145 (2). Données préparées par l'API ; les actions testées se font à l'écran. Base relue par SQL (`etatFeuille`) pour tout refus.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| VFT-14 | `peutDevalider` vrai : feuille validée avec un projet `valide` et `peut_valider` ; feuille soumise partiellement validée (un projet `valide` et `peut_valider`, un autre non validé) | §7 Dévalidation (2) | DEV-E | validation.test.ts |
| VFT-15 | `peutDevalider` faux : soumise sans validation ; brouillon ; rejetée ; seuls projets validés non `peut_valider` (soumise et validée) ; `projets` vide | §7 Dévalidation (2) | DEV-E | validation.test.ts |
| VFT-16 | `codesDevalidables` : codes des projets `valide` et `peut_valider`, ordre de l'API | §7 Dévalidation (2) | DEV-E | validation.test.ts |
| VFT-17 | `messageRefusValidation(422, 'rien_a_devalider')` → « La feuille n’a plus de validation à retirer. » ; `relireListe(422, 'rien_a_devalider')` vrai | §7 Dévalidation (2) | DEV-E | validation.test.ts |
| VFT-18 | `cibleFocus` avec l'action `devalider` : bouton conservé s'il existe encore ; sinon « Voir » ; sinon le tableau | D-145 (2) | DEV-E | validation.test.ts |
| E2E-409 | Ordre des actions : administrateur, feuille soumise partiellement validée → Voir, Valider, Rejeter, Dévalider ; feuille validée → Voir, Dévalider | §7 Dévalidation (2) | DEV-E | devalidation-e.spec.ts |
| E2E-410 | Pas de « Dévalider » : administrateur (soumise sans validation, brouillon, rejetée) ; chef de P quand seul Q est validé | §7 Dévalidation (2) | DEV-E | devalidation-e.spec.ts |
| E2E-411 | Confirmation (administrateur, feuille validée) : titre exact « Dévalider la feuille de Alice 4B pour P4B, Q4B ? », texte « La feuille repassera au statut Soumise. », bouton « Dévalider » ; « Annuler » : aucune écriture, base inchangée | §7 Dévalidation (2) | DEV-E | devalidation-e.spec.ts |
| E2E-412 | Succès (chef de P, feuille validée par P et Q) : « Feuille dévalidée. » (`role="status"`), liste relue, « Soumise », « P4B · À valider », « Q4B · Validé » ; base : validation de Q conservée ; focus sur « Voir » | §7 Dévalidation (2), D-145 (2) | DEV-E | devalidation-e.spec.ts |
| E2E-413 | `rien_a_devalider` (dévalidation faite entre-temps par l'API) : dialogue fermé, liste relue, alerte au-dessus du tableau « La feuille n’a plus de validation à retirer. », effacée à l'action suivante, base inchangée | §7 Dévalidation (2), D-145 (2) | DEV-E | devalidation-e.spec.ts |
| E2E-414 | `statut_invalide` (feuille rejetée entre-temps par l'API) : dialogue fermé, liste relue, alerte « La feuille a changé de statut. », base inchangée | §7 Dévalidation (2), D-145 (2) | DEV-E | devalidation-e.spec.ts |
| E2E-415 | Parcours IHM : chef de P et chef de Q valident à l'écran, le chef de P dévalide, Q garde « Q4B · Validé », la ressource voit « Soumise » ; le chef de Q dévalide ; la ressource rappelle, corrige, enregistre, soumet de nouveau | §7 Dévalidation (3) | DEV-E | devalidation-e.spec.ts |
| E2E-244-r3 | Révision d'E2E-244-r2 (D-031, autorisée par D-176 (5)) : parcours complet, le chef dévalide à l'écran (« Feuille dévalidée. », « Soumise ») puis valide de nouveau avant la suite inchangée | D-176 (5) | DEV-E | e2e/tests/lot4b.spec.ts |

### Couverture des champs, DEV-E

| Champ de l'API | Champ d'écran | Tests |
|---|---|---|
| POST /api/feuilles/:id/devalider (sans corps) | bouton « Dévalider la feuille de <ressource> » et sa confirmation | E2E-411, E2E-412, E2E-415, E2E-244-r3 |

### Preuves de la phase rouge de DEV-E (D-176, D-179)

- Lancés (D-128) : validation.test.ts seul (web), devalidation-e.spec.ts, E2E-244-r3 ; lint et typecheck verts.
- Web : 5 rouges sur 5 (VFT-14 à VFT-18). `peutDevalider` et `codesDevalidables` « is not a function » ; VFT-17 reçoit « Une erreur est survenue. » ; VFT-18 : `cibleFocus` ne connaît pas l'action `devalider`.
- E2E : 8 rouges sur 8 nouveaux et révisés (E2E-409 à E2E-415, E2E-244-r3) : bouton « Dévalider la feuille de … » absent (attente expirée, ou liste des actions sans « Dévalider »).
- E2E-410 : vert tel que d'abord écrit, par construction (absence d'un bouton qui n'existe pas) ; corrigé avant le commit par un contrôle positif (le chef de Q voit « Dévalider ») : rouge pour la bonne raison.

### Captures de DEV-E (phase verte)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-416 | Captures sans assertion fonctionnelle (ne compte pas comme test de comportement, comme E2E-320) : confirmation de « Dévalider » et succès « Feuille dévalidée. », 1440 et 1024 px, e2e/captures/validation-devalider-{confirmation,succes}-{1440,1024}.png | D-133 (3), D-180 | DEV-E | e2e/tests/devalidation-e-captures.spec.ts |

### Preuves de la phase verte de DEV-E (D-176, D-180)

- Code : `peutDevalider`, `codesDevalidables`, action `devalider` de `cibleFocus`, code `rien_a_devalider` (logique.ts) ; bouton `Undo2` et `Confirmation` (Validation.tsx). Aucune route, aucun test sous tag modifié (`tests-devalidation-e` = 700011d).
- validation.test.ts : 18 verts. E2E-409 à E2E-415 et E2E-416 : 3 passes vertes (24/24) ; E2E-244-r3 : 3 passes vertes ; lot4c.spec.ts : 21 verts. Lint et typecheck verts.
- Suite complète une fois (D-128) : vitest 1054 verts (129 fichiers) ; e2e 437 verts (13,0 min) ; aucun intermittent.
- Relecture @reviewer : OK, aucun bloquant. Captures : aucun défaut bloquant.

## Tests d'AUT-I, saisie pour autrui, API (D-181, D-182)

Fichier : packages/api/test/autrui.test.ts. Date du jour du serveur : mercredi 13/01/2027. Préfixe AUT- (libre avant AUT-I).

| ID | Cas | Spec | Lot | Fichier |
|---|---|---|---|---|
| AUT-1 | PUT de l'administrateur pour Alice : feuille d'Alice, imputations, charge réelle ; égale au GET | D-181 (2) | AUT-I | autrui.test.ts |
| AUT-2 | Reste modifié : auteur administrateur ; témoin : auteur Alice | D-181 (3) | AUT-I | autrui.test.ts |
| AUT-3 | Pour autrui : `jour_futur` 422, base inchangée | D-181 (2) | AUT-I | autrui.test.ts |
| AUT-4 | Pour autrui : `ligne_fermee` 422, base inchangée | D-181 (2) | AUT-I | autrui.test.ts |
| AUT-5 | Pour autrui : `feuille_verrouillee` soumise puis validée | D-181 (2) | AUT-I | autrui.test.ts |
| AUT-6 | Pour autrui : `assignation_invalide` de Bob ; corps invalide 400 | D-181 (2) | AUT-I | autrui.test.ts |
| AUT-7 | Droits : 401, 404 (inconnu, mal formé, hors plage, Bob), chef 403, Alice soi-même 200 | D-181 (2) | AUT-I | autrui.test.ts |
| AUT-8 | Ordre des refus : 401, 400, 404, 403, puis 422 | D-181 (2) | AUT-I | autrui.test.ts |
| AUT-9 | `ressource_id` non ressource : ligne 422, `lignes: []` 200 id null | D-182 (1) | AUT-I | autrui.test.ts |
| AUT-10 | (révisé en AUT-10-r1, D-183) Administrateur soumet pour autrui : 200, `feuille_vide`, `statut_invalide` | D-181 (4) | AUT-I | autrui.test.ts |
| AUT-10-r1 | Révision d'AUT-10 (D-031, D-183) : mise en place de `feuille_vide` : imputer 1 pour Alice puis remettre 0 (la feuille existe, aucune imputation > 0) ; le reste est inchangé | D-181 (4), D-119 (6) | AUT-I | autrui.test.ts |
| AUT-11 | Administrateur rappelle pour autrui : 200 ; `deja_validee` | D-181 (4) | AUT-I | autrui.test.ts |
| AUT-12 | Chaîne : validée, dévalidée, rappelée, corrigée, soumise, revalidée | D-181 (2), (4), D-176 | AUT-I | autrui.test.ts |

### Couverture des champs, saisie pour autrui API (règle « Couverture des champs »)

| Champ de l'API | Écran | Raison |
|---|---|---|
| paramètre `ressource_id` du PUT /api/feuilles | liste « Ressource » (AUT-E) | écran à venir (D-181 (5)) |

### Preuves de la phase rouge d'AUT-I (D-181, D-182)

- Lancés (D-128) : autrui.test.ts seul ; lint et typecheck verts. FDT-3-r1 : lot4a-feuilles.test.ts, 15 verts.
- Rouges : 12 sur 12 (AUT-1 à AUT-12). Cause : le PUT ignore `ressource_id` et écrit pour l'administrateur (422 `assignation_invalide` au lieu de 200 ou du refus attendu) ; `soumettre` et `rappeler` par l'administrateur donnent 403.
- Parties vertes à l'intérieur de tests rouges : AUT-6 (la première ligne d'Alice est acceptée seulement après le PUT pour autrui, donc rouge dès cette étape), AUT-9 (premier refus 422 déjà vert, le test échoue ensuite sur `ressource_id`) ; témoin d'AUT-2 (auteur = Alice) et d'AUT-7 (Alice avec son propre `ressource_id`), verts seuls.

### Preuves de la phase verte d'AUT-I (D-181, D-183)

- Ciblé (D-128) : autrui.test.ts, lot4a-*.test.ts et devalidation.test.ts : 79/79 verts ; lint et typecheck verts.
- AUT-10-r1 (405f8c7, tag `tests-autrui-i-r1`) : rouge prouvé sans le code vert, échec sur le premier PUT pour autrui (422 `assignation_invalide`).
- Suite complète une fois (D-128, D-179) : vitest 1066 verts (130 fichiers), puis e2e 437 verts (12,6 min), sans intermittent ; E2E-221 reste vert (AUT-I ne touche pas l'écran).
- Relecture @reviewer : code conforme, un bloquant documentaire (D-183 absent) corrigé, deux non-bloquants (docs/non-bloquants.md).


## Révisions D-031 d'AUT-E (D-181 (7))

| ID | Raison de la révision | Spec | Fichier |
|---|---|---|---|
| E2E-221-r1 | Même intention (entrée « Imputations », semaine courante, statut Brouillon). Ancien comportement : entrée absente pour l'administrateur non ressource. Nouveau : présente pour la ressource et pour tout administrateur, ressource ou non ; absente pour un chef de projet non ressource (contrôle positif : l'entrée « Validation » du chef est visible). Le reste du test (clic, adresse, `aria-current`, libellé de semaine, statut) est inchangé | D-181 (5), (7) | e2e/tests/lot4b.spec.ts |

Preuve du rouge d'E2E-221-r1 : échec à la première assertion, entrée « Imputations » introuvable pour l'administrateur non ressource (attente expirée).

## Tests d'AUT-E, saisie pour autrui, écran Feuille de temps (D-181 (5), (6))

Fichiers : packages/web/test/autrui.test.ts (AUT-13 à AUT-16 ; fonctions à créer dans `packages/web/src/imputations/logique.ts` : `ressourcesChoisissables(annuaire)`, `ressourceAffichee(param, choix, utilisateur)`, `adresseImputations(semaine, ressource)`, `titreFeuille(nomRessource, estSoi)`) ; e2e/tests/autrui-e.spec.ts et autrui-e-helpers.ts (nouveaux ; monde de lot4b-helpers.ts, horloge H14) ; e2e/tests/lot4b.spec.ts (E2E-244-r4, commit séparé, ligne ajoutée avec lui). Liste « Ressource » : route existante `GET /api/annuaire` (tout utilisateur connecté ; `nom`, `est_ressource`, `actif`, tri par nom), aucune route d'API nouvelle. Contrat de phase verte : liste native de nom accessible exact « Ressource » (`combobox`), options de valeur = identifiant de la ressource, au plus une option de valeur `''` (invite) en tête ; message « Choisissez une ressource. » ; titre de niveau 1 « Feuille de temps de <nom> » pour autrui. Dans les tests de refus, l'état en base est relu par l'API (session d'Alice).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| AUT-13 | `ressourcesChoisissables` : actifs et ressources seulement, triés par nom (ordre français, accents) ; inactif, non ressource et liste vide | D-181 (5) | AUT-E | packages/web/test/autrui.test.ts |
| AUT-14 | `ressourceAffichee` : paramètre dans la liste gardé ; absent : soi si ressource, sinon aucune, sans correction ; inconnu, non numérique, hors liste : défaut avec correction | D-181 (5) | AUT-E | packages/web/test/autrui.test.ts |
| AUT-15 | `adresseImputations` : `/imputations?semaine=…` sans ressource ; `&ressource=<id>` avec | D-181 (5) | AUT-E | packages/web/test/autrui.test.ts |
| AUT-16 | `titreFeuille` : « Feuille de temps » pour soi, « Feuille de temps de <nom> » pour autrui | D-181 (5) | AUT-E | packages/web/test/autrui.test.ts |
| E2E-417 | Liste « Ressource » de l'administrateur : ressources actives triées par nom (Alice, Bob, Zoé créés dans le désordre) ; inactif, chef et administrateur non ressource absents | D-181 (5) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-418 | Liste « Ressource » absente pour une ressource (contrôle positif : titre « Feuille de temps » et tableau visibles) | D-181 (5) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-419 | Administrateur non ressource : « Choisissez une ressource. », aucune requête vers /api/feuilles (requêtes comptées) ; après le choix d'Alice, requête comptée et feuille affichée | D-181 (5) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-420 | Administrateur ressource : lui-même sélectionné, titre « Feuille de temps » inchangé, feuille chargée | D-181 (5) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-421 | Choisir Alice : adresse `/imputations?semaine=…&ressource=<id>`, titre « Feuille de temps de Alice 4B » | D-181 (5) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-422 | Ouvrir directement l'adresse avec `ressource=<id d'Alice>` : Alice sélectionnée, titre pour autrui, feuille d'Alice | D-181 (5) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-423 | `ressource` inconnue, non numérique, non ressource ou inactive : paramètre retiré, comportement par défaut, adresse corrigée sans rechargement (un chargement par ouverture) ; valeur valide gardée ensuite | D-181 (5) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-424 | Pour Alice, par l'administrateur : saisie, « Enregistrer », « Feuille enregistrée. » ; base : imputation de la feuille d'Alice | D-181 (5), D-120 (9) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-425 | Pour Alice : « Soumettre » (statut « Soumise », base), « Rappeler » (« Brouillon », base) | D-181 (5), (4), D-120 (10) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-426 | Pour Alice : feuille soumise par l'API après le chargement, « Enregistrer » : texte `feuille_verrouillee` de 4b, saisie gardée, base inchangée | D-181 (5), D-120 (9) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-427 | Case modifiée, changement de ressource : une seule confirmation (titre et texte de D-172) ; « Annuler » garde saisie, ressource et adresse ; « Abandonner » change de ressource, rien n'est envoyé, base inchangée | D-181 (5), D-172 (2) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-428 | Sans modification, et après un enregistrement réussi : changement de ressource sans confirmation | D-172 (2) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-429 | Parcours IHM : administrateur non ressource, à l'écran : choisit Alice, saisit, enregistre, soumet ; le chef valide à l'écran Validation ; Alice se connecte et voit « Validée » avec la charge saisie, en lecture seule | D-181 (6) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-244-r4 | Révision d'E2E-244-r3 (D-031, autorisée par D-181 (6), (7)) : parcours complet étendu ; après la dernière validation, l'administrateur (non ressource) ouvre « Imputations », choisit la ressource à l'écran et voit « Validée », titre « Feuille de temps de Ressource 4B-244 », charge 0,5 en lecture seule ; le reste est inchangé | D-181 (6) | AUT-E | e2e/tests/lot4b.spec.ts |
| E2E-430 | Ressource (Alice) qui ouvre `/imputations?semaine=…&ressource=<id de Bob>` : paramètre retiré de l'adresse sans rechargement, titre « Feuille de temps », ses propres lignes, aucune requête /api/feuilles avec `ressource_id` (requêtes comptées, contrôle positif : au moins une requête de feuille) | D-184 (3), D-181 (5) | AUT-E | e2e/tests/autrui-e.spec.ts |
| E2E-431 | Captures sans assertion fonctionnelle (ne compte pas comme test de comportement, comme E2E-416) : liste « Ressource » sans choix (message) et feuille d'Alice pour autrui ; 1440 et 1024 px, e2e/captures/imputations-autrui-{choix,feuille}-{1440,1024}.png | D-133 (3), D-181 (5) | AUT-E | e2e/tests/autrui-e-captures.spec.ts |

### Couverture des champs, AUT-E (règle « Couverture des champs »)

| Champ modifiable de l'API | Champ d'écran, ou hors écran | Tests |
|---|---|---|
| paramètre `ressource_id` de GET et PUT /api/feuilles | liste « Ressource » de l'administrateur (adresse `ressource=<id>`) | E2E-417, E2E-421 à E2E-424, E2E-429 |
| POST /api/feuilles/:id/soumettre et rappeler, par l'administrateur | boutons « Soumettre » et « Rappeler » de la feuille d'autrui | E2E-425, E2E-429 |
| GET /api/annuaire (lecture : `nom`, `est_ressource`, `actif`) | contenu et ordre de la liste « Ressource » | AUT-13, E2E-417 |

### Preuves de la phase rouge d'AUT-E (D-181)

- Lancés (D-128) : autrui.test.ts, autrui-e.spec.ts, E2E-244-r4, E2E-221-r1 seuls ; lint et typecheck verts.
- AUT-13 à AUT-16 : fichier rouge, fonctions absentes de `logique.ts` (échec à la collecte, `ressourcesChoisissables` n'est pas une fonction).
- E2E-221-r1 : entrée « Imputations » introuvable pour l'administrateur non ressource. E2E-244-r4 : même clic, étape ajoutée en fin de parcours. E2E-417, E2E-419, E2E-421, E2E-429 : même clic de menu (attente expirée).
- E2E-420 : liste « Ressource » introuvable. E2E-422, E2E-424 à E2E-428 : titre « Feuille de temps de Alice 4B » introuvable. E2E-423 : adresse non corrigée (paramètre gardé).
- Vert en phase rouge : E2E-418 (absence de la liste pour une ressource ; garde de non-régression, avec contrôle positif titre et tableau), par construction.

### Preuves de la phase verte d'AUT-E (D-181, D-184)

- Code : `logique.ts` (`ressourcesChoisissables`, `ressourceAffichee`, `adresseImputations`, `titreFeuille`), `FeuilleTemps.tsx` (`FeuilleAdmin`, liste « Ressource », `ressource_id`, point 3 de D-184), `Layout.tsx` (entrée de menu). Aucun test sous tag modifié ; aucune route d'API nouvelle.
- E2E-430 : rouge prouvé avant le code (adresse gardée avec `&ressource=…`), commit a6aaf64, tag `tests-autrui-e`.
- Ciblés : AUT-13 à AUT-16 et imputations.test.ts : 27 verts ; E2E-417 à E2E-431, E2E-221-r1, E2E-244-r4 : 17 verts sur 3 passes.
- Suite complète une fois (D-128, D-179) : lint, typecheck verts ; vitest 1074 verts (131 fichiers) ; e2e 452 verts (14,2 min), aucun intermittent.
- Relecture @reviewer : un bloquant documentaire (D-184 absente), corrigé par la clôture ; code conforme.

## Tests de la retouche de la Feuille de temps (D-186)

Fichiers : packages/web/test/retouche-feuille.test.ts (AUT-17 ; fonction à créer dans `packages/web/src/imputations/logique.ts` : `optionsListeRessource(choix, ressource, prete)` → `{ value, label, disabled? }[]`) ; e2e/tests/retouche-feuille.spec.ts (E2E-432 à E2E-435) et retouche-feuille-captures.spec.ts (E2E-436). Monde : `mondeAutrui` (autrui-e-helpers.ts), horloge H14. Valeurs de D-186. Contrat de phase verte : liste « Ressource » visible et désactivée pendant le chargement de l'annuaire ; option « Choisir… » de valeur `''`, désactivée ; en-tête `main > header`.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| AUT-17 | `optionsListeRessource` : annuaire non chargé → seule « Chargement… » désactivée ; chargé sans choix → « Choisir… » désactivée en tête puis les ressources ; chargé avec choix → « Choisir… » toujours présente, désactivée | D-186 (1), (2) | Retouche | packages/web/test/retouche-feuille.test.ts |
| E2E-432 | 1024 px, feuille d'Alice par l'administrateur : « 1 Tâche A » entier dans sa cellule (non tronqué), colonne Activité d'au moins 110 px, aucun en-tête ne déborde de sa cellule, en-têtes voisins sans chevauchement, texte d'Assigné à au moins 8 px de celui de Réel cumulé ; aucun défilement horizontal | D-186 (3) | Retouche | e2e/tests/retouche-feuille.spec.ts |
| E2E-433 | 1280 px : mêmes contrôles, colonne Activité d'au moins 300 px (garde de non-régression) | D-186 (3) | Retouche | e2e/tests/retouche-feuille.spec.ts |
| E2E-434 | Annuaire retardé : liste « Ressource » visible et désactivée pendant le chargement ; après le chargement, position et hauteur de l'en-tête et position du titre identiques | D-186 (1) | Retouche | e2e/tests/retouche-feuille.spec.ts |
| E2E-435 | « Choisir… » : désactivée, présente avant et après le choix d'Alice ; sélectionnée seulement sans choix ; administrateur ressource : présente, désactivée, lui-même sélectionné ; la liste ne propose que les ressources actives en plus | D-186 (2) | Retouche | e2e/tests/retouche-feuille.spec.ts |
| E2E-436 | Captures sans assertion fonctionnelle (ne compte pas comme test de comportement, comme E2E-431), avant et après : choix et feuille, 1440 et 1024 px, e2e/captures/retouche-feuille-{choix,feuille}-{1440,1024}-{avant,apres}.png | D-133 (3), D-186 | Retouche | e2e/tests/retouche-feuille-captures.spec.ts |

### Couverture des champs, retouche de la Feuille de temps

Aucun champ d'API ajouté ni modifié : l'API est inchangée.

### Preuves de la phase rouge de la retouche (D-186)

- Lancés (D-128) : retouche-feuille.spec.ts et AUT-17 seuls ; lint et typecheck verts. Captures « avant » prises (E2E-436, `CAPTURE_PHASE=avant`, vert par construction).
- AUT-17 : rouge, `optionsListeRessource` n'est pas une fonction (collecte, trois cas ensemble).
- E2E-432 : cellule « 1 Tâche A » tronquée. E2E-433 : en-tête « Assigné » qui déborde de sa cellule (rouge, pas un simple garde-fou). E2E-434 : liste « Ressource » introuvable pendant le chargement. E2E-435 : option « Choisir… » non désactivée.

### Preuves de la phase verte de la retouche (D-186, D-187)

- Code : `logique.ts`, `Select.tsx` (option `disabled`), `FeuilleTemps.tsx`, `TableauFeuille.tsx`. Aucun test sous tag modifié.
- Ciblés : retouche-feuille.spec.ts 4 verts sur 3 passes ; E2E-436 vert ; lot4b, lot4b-corr, lot5d, lot4c, autrui-e et sortie : 92 verts. AUT-17 : 3 verts.
- Suite complète une fois (D-128, D-179) : lint, typecheck verts ; vitest 1077 verts (132 fichiers) ; e2e 457 verts (13,4 min), aucun intermittent.
- Mises au point des largeurs : Assigné `w-[4.25rem]` suffisait contre le débordement mais l'écart avec Réel cumulé restait de 6 px ; jours `w-[2.75rem]` et `w-[2.875rem]` débordaient ; retenu : en-têtes `text-petit`, jours `w-12`.
- Relecture @reviewer : OK, aucun bloquant.

## Complément de la retouche : dialogue « Voir » de Validation (D-186, D-187)

Contrôle demandé par le porteur après la clôture : effet des en-têtes `text-petit` de `TableauFeuille` sur le dialogue « Voir ». E2E-323 (c) couvre déjà l'absence de défilement horizontal du dialogue à 1024 px, pas le débordement des en-têtes. Fichier : e2e/tests/retouche-voir.spec.ts (monde de lot4c-helpers.ts, horloge H14, administrateur).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-437 | Dialogue « Voir la feuille de Alice 4B » à 1024 et 1440 px : aucun en-tête du tableau ne déborde de sa cellule, en-têtes voisins sans chevauchement, aucun défilement horizontal du tableau, « 1 Tâche A » non tronqué | D-186 (3), D-135 (4) | Retouche | e2e/tests/retouche-voir.spec.ts |
| E2E-438 | Captures sans assertion fonctionnelle (ne compte pas comme test de comportement, comme E2E-436) : dialogue « Voir », 1440 et 1024 px, e2e/captures/retouche-voir-{1440,1024}-{avant,apres}.png | D-133 (3), D-186 | Retouche | e2e/tests/retouche-voir-captures.spec.ts |

## Tests de la confirmation à la fermeture des dialogues (D-188)

Fichiers : packages/web/test/garde-dialogue.test.ts (GDL-1 à GDL-4) et garde-dialogue-structure.test.ts (GDL-5 à GDL-7) ; fonctions à créer dans `packages/web/src/components/garde-dialogue.ts` : `instantane(champs, dialogue, strict?)`, `modifie(reference, courant)`) ; e2e/tests/garde-dialogue.spec.ts et garde-dialogue-helpers.ts (E2E-439 à E2E-455) ; garde-dialogue-captures.spec.ts (E2E-456, phase verte). Valeurs de D-188 (1) à (10). Base « administrateur seul » avant et après chaque test, horloge H14 ; mondes : `monde4b` (assignation d'Alice), `monde4c` (feuille soumise), `preparer` (calendrier). Contrat de phase verte : la confirmation est le dialogue nommé « Abandonner les modifications ? » (boutons « Annuler » = rester, « Abandonner » = quitter), empilé au-dessus du dialogue de formulaire.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GDL-1 | `modifie` : référence nulle = non modifié ; instantanés égaux = non modifié ; valeur changée = modifié ; valeur remise à l'initiale = non modifié ; clé ajoutée ou retirée = modifié | D-188 (1), (3), (10) c | GDL | packages/web/test/garde-dialogue.test.ts |
| GDL-2 | `instantane` : champs désactivés, boutons, `submit`, `reset`, `hidden` ignorés ; case = `checked` ; autres = `value` | D-188 (3) | GDL | packages/web/test/garde-dialogue.test.ts |
| GDL-3 | `instantane` strict : champ actif sans `id` ou `id` en double : erreur explicite nommant le dialogue et le champ ; non strict : champ ignoré, aucune erreur | D-188 (10) c | GDL | packages/web/test/garde-dialogue.test.ts |
| GDL-4 | Mot de passe : l'instantané n'écrit rien dans la console, et les messages d'erreur ne contiennent aucune valeur de champ | D-188 (10) e | GDL | packages/web/test/garde-dialogue.test.ts |
| GDL-5 | Structurel : `sansGarde` n'apparaît que dans les cinq fichiers de l'audit, une occurrence chacun (PlanningProjet.tsx, DialogueCalcul.tsx, DialogueExport.tsx, Validation.tsx, Confirmation.tsx) | D-188 (10) d | GDL | packages/web/test/garde-dialogue-structure.test.ts |
| GDL-6 | Structurel : `Dialog` déclare `sansGarde = false` (garde par défaut) et la soupape `modifie` | D-188 (1), (10) d | GDL | packages/web/test/garde-dialogue-structure.test.ts |
| GDL-7 | Structurel : `FormulaireDialogue` passe « Annuler » par le contrôle de `Dialog` (aucun appel direct de `onAnnuler` sur le bouton) | D-188 (6) | GDL | packages/web/test/garde-dialogue-structure.test.ts |
| E2E-439 | Échap, « Nouvelle équipe » : sans modification, fermeture sans confirmation ; nom saisi : confirmation, dialogue ouvert ; nom saisi puis effacé : fermeture sans confirmation | D-188 (1), (2) | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-440 | Clic hors du dialogue : mêmes trois cas | D-188 (1) | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-441 | Bouton « Annuler » du formulaire : mêmes trois cas | D-188 (1), (6) | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-442 | Croix « Fermer » : mêmes trois cas | D-188 (1) | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-443 | Champ nombre (« Modifier l'assignation », charge) : modifié puis Échap : confirmation ; remis à l'initiale : aucune | D-188 (3), (10) f | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-444 | Champ date (« Ajouter un jour férié ») : idem | D-188 (3), (10) f | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-445 | Champ mot de passe (« Nouvel utilisateur ») : idem | D-188 (3), (10) e, f | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-446 | Liste native (« Nouvel utilisateur », Rôle) : idem | D-188 (3), (10) f | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-447 | Case à cocher (« Modifier le calendrier ») : idem | D-188 (3), (10) f | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-448 | Zone de texte (Rejeter) : commentaire saisi puis Échap : confirmation ; effacé : aucune ; Rejeter est gardé | D-188 (10) a, f | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-449 | Asynchrone, « Nouveau projet » (annuaire retardé) : clic dans le formulaire pendant le chargement, fin du chargement, Échap : aucune confirmation ; contrôle positif : saisie puis Échap : confirmation | D-188 (10) b | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-450 | Asynchrone, « Modifier le projet » (projet retardé) : clic pendant le chargement, fin, Échap : aucune confirmation ; contrôle positif : saisie puis Échap : confirmation | D-188 (10) b | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-451 | Dialogue sans garde (« Exporter les imputations ») : date modifiée puis Échap : aucune confirmation (garde-fou) | D-188 (7), (10) | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-452 | Envoi réussi (« Nouvelle équipe », Créer) : le dialogue se ferme, aucune confirmation à aucun moment ; équipe créée | D-188 (5) | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-453 | Envoi en échec (équipe en double) puis Échap : confirmation (la saisie existe encore), base inchangée | D-188 (5) | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-454 | « Annuler » de la confirmation (rester) : confirmation fermée, dialogue ouvert, saisie et focus conservés | D-188 (2) | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-455 | « Abandonner » : confirmation et dialogue fermés, aucune requête d'écriture envoyée, base inchangée | D-188 (2) | GDL | e2e/tests/garde-dialogue.spec.ts |
| E2E-456 | Captures sans assertion fonctionnelle (ne compte pas comme test de comportement, comme E2E-436) : confirmation au-dessus d'un dialogue, 1440 et 1024 px, e2e/captures/garde-dialogue-{1440,1024}.png | D-133 (3), D-188 | GDL | e2e/tests/garde-dialogue-captures.spec.ts |

### Couverture des champs, confirmation à la fermeture des dialogues

Aucun champ d'API ajouté ni modifié : l'API est inchangée.

### Inventaire des tests existants à réviser (D-188 (8), indicatif)

Recherche par script dans e2e/tests : une saisie dans un dialogue, un refus de l'API (dialogue resté ouvert), puis « Annuler » : la saisie existe encore, une confirmation s'ouvrira. Candidats repérés : E2E-24 (lot1b-c.spec.ts, copie refusée puis « Annuler »), E2E-151 (lot3d3b.spec.ts), E2E-340-r1 et E2E-344 (lot6a.spec.ts), E2E-361 (lot6c.spec.ts), E2E-346-r1 (captures, lot6a-captures.spec.ts, Échap après refus). Limite : le script ne voit que les enchaînements proches (12 lignes) ; la liste exacte vient de la suite complète de la phase verte. Chaque révision : -rN, tag dédié, justification dans docs/non-bloquants.md.

### Révisions D-031 des tests de la garde des dialogues (phase verte de D-188)

Les tests rouges d'origine (tag `tests-garde-dialogue`, cc2d055) contenaient trois erreurs de mise en oeuvre du test, sans rapport avec le comportement attendu ; elles sont apparues à l'exécution contre le code (rouge prouvé de nouveau contre l'ancien code : 15 rouges, 2 verts par construction, comme avant). Un seul commit `test:`, tag `tests-garde-dialogue-r1`.

| ID | Raison de la révision | Fichier |
|---|---|---|
| E2E-439-r1 à E2E-448-r1 | `dialogueNomme` : le dialogue recouvert par la confirmation est masqué aux technologies d'assistance par Radix (`aria-hidden`) ; la recherche par rôle l'excluait. Ajout de `includeHidden`. Même intention, mêmes assertions | e2e/tests/garde-dialogue-helpers.ts, garde-dialogue.spec.ts |
| E2E-446-r1 | `selectOption` ne donne ni focus ni `pointerdown` : aucun geste, donc aucune référence (D-188 (10) b). Un utilisateur a toujours un geste ; le test donne le focus avant le choix | e2e/tests/garde-dialogue.spec.ts |
| E2E-453-r1, E2E-455-r1 | `request` n'est pas authentifié (« Non authentifié ») : base relue par SQL (`equipesEnBase`) ; équipes remises à zéro entre les tests (`remettreAdminSeul6a`) | e2e/tests/garde-dialogue.spec.ts |

### Révisions D-031 des tests existants touchés par la garde (D-188 (8), phase verte)

La suite complète (1090 vitest verts ; 460 e2e verts, 17 rouges) a donné la liste exacte. Les 17 tests saisissent dans un dialogue, reçoivent un refus de l'API (dialogue resté ouvert, saisie gardée), puis le ferment par « Annuler », Échap ou la croix : la saisie existe encore, la confirmation s'ouvre (D-188 (5)). Même intention, mêmes assertions ; seule la fermeture change : le déclencheur, puis « Abandonner » dans la confirmation (`fermerEnAbandonnant`, garde-dialogue-helpers.ts). Un seul commit `test:`, un tag dédié `tests-garde-dialogue-r2` (écart assumé à « un tag par test » : même décision, même motif). Les tests dont le formulaire n'est modifié que par `selectOption` (sans geste, donc sans référence) restent inchangés : E2E-113, E2E-115, E2E-124 (`refuse` d'origine conservé).

| ID | Fichier | Fermeture avant | Fermeture après |
|---|---|---|---|
| E2E-111-r1, E2E-112-r1, E2E-114-r1, E2E-116-r1 à E2E-121-r1, E2E-123-r2 | e2e/tests/cloture-c2.spec.ts | « Annuler » après refus | `refuseEtAbandonne` : « Annuler », « Abandonner » |
| E2E-24-r1 | e2e/tests/lot1b-c.spec.ts | « Annuler » après refus de copie | « Annuler », « Abandonner » |
| E2E-203-r2 | e2e/tests/lot3f2.spec.ts | « Annuler » après deux refus | « Annuler », « Abandonner » (focus du tableau relu après) |
| E2E-311-r1 | e2e/tests/lot4c.spec.ts | croix après saisie du commentaire | croix, « Abandonner » |
| E2E-340-r2 | e2e/tests/lot6a.spec.ts | « Annuler » après doublon | « Annuler », « Abandonner » |
| E2E-346-r2 | e2e/tests/lot6a-captures.spec.ts | Échap après refus (capture) | Échap, « Abandonner » |
| E2E-361-r1 | e2e/tests/lot6c.spec.ts | « Annuler » après refus | « Annuler », « Abandonner » |
| E2E-73-r1 | e2e/tests/rex2d.spec.ts | « Annuler » après refus (deux fois) | « Annuler », « Abandonner » |

Rouge : ces révisions échouent sans le code (la confirmation est attendue), par construction.

### Preuves de la phase rouge de la garde des dialogues (D-188)

- Lancés (D-128) : garde-dialogue.test.ts, garde-dialogue-structure.test.ts, garde-dialogue.spec.ts seuls ; lint et typecheck verts.
- GDL-1 à GDL-4 : rouges, module `garde-dialogue` absent (collecte). GDL-5 : `sansGarde` introuvable dans les cinq fichiers ; GDL-6 : `Dialog` sans `sansGarde = false` ni soupape ; GDL-7 : « Annuler » appelle `onAnnuler` directement.
- E2E-439 à E2E-448, E2E-453 à E2E-455 : confirmation « Abandonner les modifications ? » introuvable. E2E-449, E2E-450 : rouges au contrôle positif (saisie puis Échap : pas de confirmation).
- Verts dès la phase rouge, par construction : E2E-451 (dialogue sans garde, garde-fou) et E2E-452 (envoi réussi, aucune confirmation, garde-fou).

### Preuves de la phase verte de la garde des dialogues (D-188, D-189)

- Code : `garde-dialogue.ts`, `Dialog.tsx` (garde, contexte, `sansGarde`, `modifie`, `focusRetour`, `useDialoguePret`), `Confirmation.tsx`, `commun.tsx` (`FormulaireDialogue`), `sansGarde` sur Déplacer, Calculer, Exporter, Voir, Confirmation ; `useDialoguePret` pour « Nouveau projet » et « Modifier le projet ».
- Tests : GDL-1 à GDL-7 (13 verts) ; E2E-439-r1 à E2E-456 : 17 verts sur 3 passes. Révisions -r1 (tag `tests-garde-dialogue-r1`) avant le code ; 17 tests existants révisés (tag `tests-garde-dialogue-r2`).
- Suite complète une fois (D-128, D-179) : lint, typecheck verts ; vitest 1090 verts (134 fichiers) ; e2e 477 verts (13,6 min), aucun intermittent (une première passe avait donné 17 rouges : l'inventaire des tests révisés).
- Relecture @reviewer : OK ; un bloquant documentaire (decisions.md reformaté, corrigé) ; code conforme ; non-bloquants dans docs/non-bloquants.md.

## Tests du lot de consolidation après la garde des dialogues (D-190)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| PRT-1 | Chaque dossier de travail (racine, `packages/*`, `e2e`, `scripts`) contient un `.prettierignore` qui ignore `**/*.md` (prettier lancé depuis un dossier de travail ne reformate plus les documents) | D-190 (2), D-189 (5) | Consolidation | scripts/test/prettier-md.test.ts |
| E2E-113-r1, E2E-115-r1, E2E-124-r1 | Révisions D-031 (D-190 (3)) : clic réel sur la liste avant `selectOption` ; refus, puis « Annuler » et « Abandonner » (confirmation attendue). Même intention, mêmes assertions | D-190 (3), D-188 (3), (4) | Consolidation | e2e/tests/cloture-c2.spec.ts |
| E2E-446-r2 | Révision D-031 (D-190 (3)) : le geste devant `selectOption` est un clic réel sur la liste, non un focus programmatique | D-190 (3) | Consolidation | e2e/tests/garde-dialogue.spec.ts |
| E2E-457 | Confirmation « Abandonner les modifications ? » : le focus initial est sur « Annuler » (rester) ; la touche Entrée y reste sans fermer le dialogue de formulaire ; Échap ferme la confirmation seule | D-190 (4) | Consolidation | e2e/tests/garde-dialogue-focus.spec.ts |
| E2E-458 | Confirmation de suppression (équipe) : le focus initial est sur « Annuler » ; Entrée ne supprime rien | D-190 (4) | Consolidation | e2e/tests/garde-dialogue-focus.spec.ts |
| E2E-459 | Boutons « Annuler » propres à leur formulaire (hors `FormulaireDialogue`) : « Nouveau calendrier », « Ajouter un jour férié », « Nouveau projet », « Rejeter » : modifié puis « Annuler » : confirmation (dialogue ouvert, saisie gardée) ; « Abandonner » : fermeture sans envoi ; sans modification : fermeture directe | D-188 (6), D-190 (7) | Consolidation | e2e/tests/garde-dialogue-focus.spec.ts |


### Preuves de la phase rouge du lot de consolidation (D-190)

- Contre le code d'avant le lot : PRT-1 rouge (aucun `.prettierignore` de dossier de travail, la racine ne porte que `*.md`) ; E2E-457 et E2E-458 : focus initial sur la croix « Fermer », pas sur « Annuler » ; E2E-459 : « Annuler » de « Nouveau calendrier » ferme sans confirmation (bouton propre au formulaire) ; E2E-115-r1 : « Annuler » de « Nouveau projet » sans confirmation (même cause).
- Verts par construction (révisions neutres, elles précisent le geste) : E2E-113-r1, E2E-124-r1, E2E-446-r2 (la garde de `FormulaireDialogue` fonctionne ; le geste réel rend le test fidèle). Un premier essai d'E2E-446-r2 (clic puis `selectOption` puis Tab) était faux : Tab ou Échap referme la liste native ouverte et annule le choix ; retenu : clic, Échap (ferme la liste), flèche haut sur la liste fermée.
- E2E-459 a aussi montré, après un premier correctif, que « Rejeter » appelait les crochets hors du `Dialog` (contexte absent) : composant enfant `ActionsRejet`.

### Couverture des champs, lot de consolidation

Aucun champ d'API ajouté ni modifié : l'API est inchangée.

### Révision D-031 d'E2E-457 (D-190, phase verte)

| ID | Raison de la révision | Fichier |
|---|---|---|
| E2E-457-r1 | Intermittent en suite complète (une fois sur 479 : le second Échap, pressé dès que la confirmation est visible, arrivait avant que son gestionnaire d'Échap soit en place). Ajout de l'attente du focus sur « Annuler » avant le second Échap. Même intention, mêmes assertions. 3 passes vertes ciblées, puis suite complète relancée. Tag `tests-garde-dialogue-r4` | e2e/tests/garde-dialogue-focus.spec.ts |

## Tests de l'outillage de test, garde-fou de base et suite complète (D-193)

Règle de nommage d'une base de test : nom du chemin de l'URL, décodé, qui finit par `_test` avec un préfixe non vide (D-193 (1)). Fichiers : `scripts/test/garde-base-test.test.ts` (GBT) et `scripts/test/suite-complete.test.ts` (SUI). Les valeurs viennent de D-193, pas de `SPEC.md` (outillage).

| id | énoncé | décision | lot | fichier |
|---|---|---|---|---|
| GBT-1 | une URL dont la base finit par `_test` est acceptée et renvoyée inchangée (avec requête, avec nom encodé) | D-193 (1) | Optimisation des tests 2a | scripts/test/garde-base-test.test.ts |
| GBT-2 | une base hors règle (`planersource`, `planersource_demo`, `planersource_test_old`, `test`, `_test`, chemin vide) est refusée ; le message commence par « Garde-fou base de test », nomme la variable et la base, ne contient pas le mot de passe | D-193 (1), (2) | Optimisation des tests 2a | scripts/test/garde-base-test.test.ts |
| GBT-3 | variable absente, vide, blanche ou URL illisible : refus explicite | D-193 (2) | Optimisation des tests 2a | scripts/test/garde-base-test.test.ts |
| GBT-4 | `exigerBaseTest` lit la variable nommée et ne se replie jamais sur `DATABASE_URL` | D-193 (2) | Optimisation des tests 2a | scripts/test/garde-base-test.test.ts |
| GBT-5 | `e2e/prepare-db.mjs` pointé sur une base de dev ou sans variable : code non nul, message du garde-fou, 0 connexion reçue par un serveur d'écoute | D-193 (2) | Optimisation des tests 2a | scripts/test/garde-base-test.test.ts |
| GBT-6 | la configuration Playwright pointée sur une base de dev ou sur une variable vide : code non nul, message du garde-fou, 0 connexion | D-193 (2) | Optimisation des tests 2a | scripts/test/garde-base-test.test.ts |
| GBT-7 | un test d'API lancé avec `TEST_DATABASE_URL` sur une base de dev : code non nul, message du garde-fou, 0 connexion | D-193 (2) | Optimisation des tests 2a | scripts/test/garde-base-test.test.ts |
| GBT-8 | `avec-base-test` : base valide, la commande reçoit `DATABASE_URL` égale à la base de test même si `DATABASE_URL` désigne la dev ; base invalide ou variable vide, la commande n'est pas lancée (fichier témoin absent), 0 connexion | D-193 (3) | Optimisation des tests 2a | scripts/test/garde-base-test.test.ts |
| GBT-9 | inventaire : tout fichier suivi qui lit `TEST_DATABASE_URL` importe le garde-fou, sauf la liste figée des hérités (tests sous tag), qui gardent un `endsWith('_test')` en ligne ; aucune entrée obsolète | D-193 (2) | Optimisation des tests 2a | scripts/test/garde-base-test.test.ts |
| SUI-1 | lot absent du journal (journal absent ou vide) : suite autorisée sans justification | D-193 (4) | Optimisation des tests 2a | scripts/test/suite-complete.test.ts |
| SUI-2 | lot déjà présent, justification absente, vide ou blanche : refus qui cite les lignes existantes ; le journal est inchangé (octets) | D-193 (4) | Optimisation des tests 2a | scripts/test/suite-complete.test.ts |
| SUI-3 | lot déjà présent avec justification non vide : autorisée, et la justification est écrite dans la ligne `debut` | D-193 (4) | Optimisation des tests 2a | scripts/test/suite-complete.test.ts |
| SUI-4 | le journal est en ajout seulement : les octets existants sont conservés et chaque évènement ajoute exactement une ligne JSON terminée par un saut de ligne | D-193 (4) | Optimisation des tests 2a | scripts/test/suite-complete.test.ts |
| SUI-5 | exécution vert et vert : ligne `debut` avant les suites, ligne `fin` après (date, commit, durées numériques, statuts, résultat « vert ») ; vitest rouge : e2e « non lancé », résultat « échec vitest », code de sortie non nul ; suite interrompue : ligne `fin` « interrompu » | D-193 (4) | Optimisation des tests 2a | scripts/test/suite-complete.test.ts |
| SUI-6 | `lignesDuLot` renvoie les lignes du lot, dans l'ordre ; `--lister` d'un lot absent affiche « aucune suite complète » et sort avec 0 | D-193 (4) | Optimisation des tests 2a | scripts/test/suite-complete.test.ts |
| SUI-7 | `suite-complete` sans `--lot` : code 2, journal inchangé ; avec une base de dev : code non nul, journal inchangé, aucune suite lancée, 0 connexion | D-193 (2), (4) | Optimisation des tests 2a | scripts/test/suite-complete.test.ts |
| SUI-8 | la règle de process est écrite : docs/tests.md, CLAUDE.md et les trois agents citent `npm run suite-complete` ; le relecteur « ne lance jamais la suite complète » | D-193 (5) | Optimisation des tests 2a | scripts/test/suite-complete.test.ts |
| SUI-9 | `package.json` déclare `suite-complete` et `avec-base-test` vers leurs scripts | D-193 (3), (4) | Optimisation des tests 2a | scripts/test/suite-complete.test.ts |

## Règle de la suite complète (D-193)

Appliquée mécaniquement par `npm run suite-complete` (journal `docs/journal-suites.jsonl`, ajout seulement) et par le garde-fou de base de test ; elle resserre D-128, qui n'avait pas été tenue (5 suites complètes sur un lot).

- Pendant le développement : passes ciblées (`npx vitest run <fichier>`, `cd e2e && npx playwright test -g <ID>`), lint et typecheck. Les passes ciblées ×3 sont réservées aux tests nouveaux ou révisés (-rN).
- Une seule suite complète (vitest puis e2e) par lot, après les corrections du relecteur : `npm run suite-complete -- --lot <nom>`. Le point d'entrée vérifie la base de test, journalise le début et la fin (date, commit, durées, résultat) et ne lance pas les e2e si vitest est rouge.
- Un échec de la suite complète se corrige, puis seuls les fichiers en échec sont relancés ×3 ; la suite complète n'est pas relancée, la CI la rejoue au push. Si une seconde suite est inévitable, `--justification "<texte>"` est obligatoire (sans elle, refus et journal inchangé) et le rapport de clôture la justifie.
- Le relecteur ne lance jamais la suite complète (ni `npm test`, ni `npm run test:e2e`) : il lance les passes ciblées du lot. Les trois agents portent la même consigne.
- Le rapport de clôture cite les lignes du journal pour le lot : `npm run suite-complete -- --lister <lot>`.
- Base de test : un nom qui finit par `_test`, précédé d'un préfixe. Tout lancement ad hoc qui touche une base passe par `npm run avec-base-test -- <commande>` (il force `DATABASE_URL` sur la base de test et ne lance rien si le contrôle échoue). Les points d'entrée des tests (vitest de l'API, Playwright, `e2e/prepare-db.mjs`) refusent de démarrer avant toute connexion.
- Limite connue : `npx vitest run` et `npm test` restent possibles ; le contrôle repose sur le journal, relu à la clôture, et sur les consignes des agents.
- Le prompt d'ouverture d'un lot déclare ses domaines (noms de `e2e/domaines.json` : `dialogues`, `feuille-de-temps`, `gantt`…). Les passes ciblées du lot utilisent `npm run tests-cibles -- --depuis <commit d'ouverture> [--domaine <nom>…]` ; `--lister` montre la sélection (spec et raison) sans rien exécuter. `--depuis` retient les specs modifiées et celles qui importent un fichier modifié (`playwright --only-changed`) et lance `vitest --changed` ; `--domaine` ajoute les specs du domaine. Une nouvelle spec est classée dans `e2e/domaines.json` avant d'être commitée (TC-5). Ce n'est pas une suite complète : rien n'est écrit au journal (D-194).
- Les passes ×3 des tests nouveaux ou révisés : `tests-cibles` trois fois, ou `cd e2e && npx playwright test -g <ID>`.
- Un changement de configuration de test (vitest, Playwright, base, workers) se valide par le point d'entrée réel (`npm run suite-complete` ou `npm run tests-cibles`), jamais seulement par des options en ligne de commande : c'est la leçon des deux suites de vitest-parallele (D-196), où `maxWorkers` passé en option fonctionnait et était refusé par projet dans la configuration (D-197). Les trois agents portent la même consigne.

## Tests du ciblage des tests et de la session partagée (D-194)

Fichiers : `scripts/test/tests-cibles.test.ts` (TC), `scripts/test/suite-complete-lot.test.ts` (SUI-10, SUI-11), `e2e/tests/session-partagee.spec.ts` (E2E-460 à E2E-463). Valeurs de D-194, pas de `SPEC.md` (outillage).

| id | énoncé | décision | lot | fichier |
|---|---|---|---|---|
| TC-1 | sélection par commit : une spec modifiée est retenue avec la raison « modifiée depuis <commit> » | D-194 (1) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| TC-2 | sélection par domaine : les specs du domaine sont retenues avec la raison « domaine <nom> » | D-194 (1) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| TC-3 | union sans doublon : une spec modifiée et d'un domaine, ou de deux domaines, apparaît une fois avec toutes ses raisons, triée par nom | D-194 (1) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| TC-4 | domaine inconnu : erreur explicite qui nomme le domaine et liste les domaines connus ; en ligne de commande, code 1 et rien n'est lancé | D-194 (1) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| TC-5 | toute spec de `e2e/tests` appartient à au moins un domaine de `e2e/domaines.json` ; le message nomme les specs orphelines | D-194 (2) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| TC-6 | `e2e/domaines.json` ne référence aucune spec inexistante, aucun domaine vide, aucun doublon dans un domaine | D-194 (2) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| TC-7 | commandes construites : une commande Playwright avec `tests/<spec>` par spec retenue, aucune s'il n'y en a pas ; vitest `--changed <commit>` seulement avec `--depuis` | D-194 (1) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| TC-8 | `--lister --domaine dialogues` : liste les specs du domaine avec leur raison, code 0, journal des suites inchangé, rien n'est exécuté | D-194 (1) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| TC-9 | sans `--depuis` ni `--domaine` : code 2 ; base de dev : code non nul, message du garde-fou, 0 connexion, journal inchangé | D-194 (1), D-193 (2) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| TC-10 | intégration `--only-changed` (dépôt git temporaire, projet Playwright minimal) : spec modifiée retenue, spec qui importe un helper modifié retenue, spec non touchée absente | D-194 (1) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| TC-11 | lecture de la sortie de `vitest list --filesOnly` : « [projet] chemin » donne la liste des chemins, lignes étrangères ignorées | D-194 (1) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| TC-12 | la règle est écrite : docs/tests.md (section « Règle de la suite complète » : domaines déclarés à l'ouverture d'un lot), CLAUDE.md et les trois agents citent `npm run tests-cibles` | D-194 (3) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| TC-13 | `package.json` déclare `tests-cibles` vers `scripts/tests-cibles.mjs` | D-194 (1) | Optimisation des tests 2b | scripts/test/tests-cibles.test.ts |
| E2E-460 | après `loginAsAdmin` (qui réécrit l'état si la session partagée a été révoquée par une spec précédente), `e2e/.auth/admin.json` existe, porte le cookie de session et ce cookie ouvre une session valide (`GET /api/auth/me` : 200, administrateur) | D-194 (4) | Optimisation des tests 2b | e2e/tests/session-partagee.spec.ts |
| E2E-461 | `loginAsAdmin` réutilise l'état : aucun `POST /api/auth/login` pendant l'appel, arrivée sur « / » avec la navigation | D-194 (4) | Optimisation des tests 2b | e2e/tests/session-partagee.spec.ts |
| E2E-462 | session partagée révoquée par une déconnexion : l'appel suivant se rabat sur la connexion par l'écran (un seul `POST`) et réécrit l'état ; l'appel d'après n'en fait aucun | D-194 (4) | Optimisation des tests 2b | e2e/tests/session-partagee.spec.ts |
| E2E-463 | `E2E_CONNEXION_ECRAN=1` force la connexion par l'écran (un `POST`) ; sans la variable, aucun | D-194 (4) | Optimisation des tests 2b | e2e/tests/session-partagee.spec.ts |
| SUI-10 | lot7 puis Lot7, « lot 7 » : la seconde suite est refusée sans justification, journal inchangé (octets) | D-194 (5) | Optimisation des tests 2b | scripts/test/suite-complete-lot.test.ts |
| SUI-11 | le nom de lot est écrit normalisé (minuscules, sans espaces) dans les lignes `debut` et `fin` ; `lignesDuLot` ignore la casse et les espaces, y compris pour des lignes déjà au journal avec majuscules | D-194 (5) | Optimisation des tests 2b | scripts/test/suite-complete-lot.test.ts |

Specs touchées indirectement par la modification du helper `loginAsAdmin` (aucune n'est modifiée ; 46, toutes sous tag, relancées en suite complète) : accueil-g2, accueil-g3, accueil-g3-captures, accueil-g4, autrui-e, autrui-e-captures, cloture-c2, devalidation-e, devalidation-e-captures, garde-dialogue, garde-dialogue-captures, garde-dialogue-focus, login, lot1, lot1b, lot1b-c, lot3c, lot3d1, lot3d3b, lot3d4, lot3e, lot3f1, lot3f2, lot4b, lot4c, lot4c-captures, lot5d, lot5d-captures, lot5i, lot6a, lot6a-captures, lot6b, lot6c, lot6d, lot6e, lot6f, retouche-feuille, retouche-feuille-captures, retouche-voir, retouche-voir-captures, rex1, rex2, rex2b, rex2c, rex2d, rex5. Les connexions par l'écran propres aux specs (E2E-1, E2E-2, `connecterAvec`, rex2, lot5b, lot5i) ne passent pas par ce helper.

## Tests du correctif E2E-457 : demande de fermeture pendant la confirmation (D-195)

Fichier : `e2e/tests/garde-dialogue-focus.spec.ts` (domaine `dialogues`). Comportement attendu fixé par le porteur (D-195), pas de `SPEC.md`. Les gestes rapides sont envoyés dans une seule tâche du navigateur (`page.evaluate`, évènements `keydown` et `pointerdown`), sans attente arbitraire, pour placer la seconde demande de façon déterministe avant ou après l'ouverture de la confirmation.

| id | énoncé | décision | lot | fichier |
|---|---|---|---|---|
| E2E-464 | double Échap dans la même tâche sur « Nouvelle équipe » modifié (seconde demande pendant l'ouverture de la confirmation) : la confirmation est visible, focus sur « Annuler », le dialogue reste ouvert, saisie conservée | D-195 (3) | Correctif 457 | e2e/tests/garde-dialogue-focus.spec.ts |
| E2E-465 | Échap puis clic dehors dans la même tâche : la confirmation est visible, focus sur « Annuler », le dialogue reste ouvert, saisie conservée | D-195 (3) | Correctif 457 | e2e/tests/garde-dialogue-focus.spec.ts |
| E2E-466 | Échap reçu une fois la confirmation ouverte et focalisée (focus sur « Annuler » constaté dans la même tâche, avant la bascule de l'écouteur d'Échap de Radix) : vaut « Rester » ; la confirmation se ferme, le dialogue reste ouvert, saisie conservée, focus revenu sur « Nom » | D-195 (3) | Correctif 457 | e2e/tests/garde-dialogue-focus.spec.ts |

### Révision D-031 d'E2E-457-r1 (D-195)

| id | motif | fichier |
|---|---|---|
| E2E-457-r2 | Seconde course relevée par le diagnostic (D-195 (2)) : `fill` juste après l'ouverture n'est pas un geste réel ; s'il arrive pendant le focus automatique, aucune référence n'est prise et le premier Échap ferme sans confirmation. Ajout d'un clic réel dans « Nom » avant `fill` (comme E2E-446-r2). Même intention, mêmes assertions. Tag `tests-correctif-457-r2` | e2e/tests/garde-dialogue-focus.spec.ts |

## Tests de la base par worker de vitest (D-196)

Fichiers : `scripts/test/bases-worker.test.ts` (BPW-1 à BPW-7, projet scripts, en série) et `packages/api/test/bases-worker.test.ts` (BPW-8, projet api). Valeurs de D-196, pas de `SPEC.md` (outillage). Les essais sur la base réelle utilisent une famille de bases propre aux tests (`<préfixe>_essaibpw_…_test`), jamais celle de vitest.

| id | énoncé | décision | lot | fichier |
|---|---|---|---|---|
| BPW-1 | noms dérivés : depuis `…/planersource_test` et le worker 2, modèle `planersource_vitest_modele_test` et worker `planersource_vitest_w2_test` ; hôte, utilisateur, mot de passe et requête de l'URL conservés | D-196 (1) | vitest-parallele | scripts/test/bases-worker.test.ts |
| BPW-2 | refus : base de maintenance hors règle (message du garde-fou), nom dérivé de plus de 63 octets, caractère hors `[a-z0-9_]`, worker absent, 0, négatif ou non entier | D-196 (1) | vitest-parallele | scripts/test/bases-worker.test.ts |
| BPW-3 | empreinte : identique pour les mêmes fichiers, différente si un contenu change, si un fichier est ajouté ou renommé | D-196 (2) | vitest-parallele | scripts/test/bases-worker.test.ts |
| BPW-4 | base modèle : construite au premier appel (migrations appliquées, empreinte en commentaire) ; réutilisée si l'empreinte est la même (une ligne témoin écrite dans le modèle est conservée) ; reconstruite si elle change (témoin disparu, nouvelle empreinte) | D-196 (2) | vitest-parallele | scripts/test/bases-worker.test.ts |
| BPW-5 | base du worker : créée depuis le modèle (elle contient ses tables et son témoin) ; un second appel la garde telle quelle (une écriture dans la base du worker est conservée) | D-196 (3) | vitest-parallele | scripts/test/bases-worker.test.ts |
| BPW-6 | nettoyage : supprime toutes les bases de worker de la famille, garde le modèle, la base de maintenance et les bases d'une autre famille | D-196 (4) | vitest-parallele | scripts/test/bases-worker.test.ts |
| BPW-7 | aucune connexion hors test : base de maintenance hors règle, refus de chaque fonction avec le message du garde-fou et 0 connexion reçue par un serveur d'écoute ; sur la base réelle, toute URL ouverte par la préparation désigne une base qui finit par `_test` (jamais `postgres` ni `template1`) | D-196 (1) | vitest-parallele | scripts/test/bases-worker.test.ts |
| BPW-8 | dans un test de l'API, `testDbUrl()` désigne la base du worker courant (`…_vitest_w<VITEST_POOL_ID>_test`), qui existe et porte les migrations | D-196 (3) | vitest-parallele | packages/api/test/bases-worker.test.ts |

### Révision D-031 de TRX-2, TRX-4 et TRX-5 (D-196, lot vitest-parallele)

Décision du porteur (2026-11-23) : révision -r1 plutôt qu'un projet vitest séparé en série.

| id | motif | fichier |
|---|---|---|
| TRX-2-r1 | Le relevé des verrous consultatifs lisait `pg_locks` sans filtre : tout le serveur, donc aussi les verrous des bases des autres workers de vitest (D-196). Filtre ajouté : base courante seulement. Même intention, mêmes assertions. Preuve : avant, rouge quand un verrou est tenu dans une autre base ; après, vert. Tag `tests-vitest-parallele-r1` | packages/api/test/lot2a-transaction.test.ts |
| TRX-4-r1 | Même motif et même filtre ; échec relevé dans la passe en ordre aléatoire à 3 workers (2 verrous au lieu de 1). Tag `tests-vitest-parallele-r1` | packages/api/test/lot3c-calcul.test.ts |
| TRX-5-r1 | Même motif et même filtre. Tag `tests-vitest-parallele-r1` | packages/api/test/lot3c-calcul.test.ts |

## Tests de la robustesse des e2e et des tests dépendants de l'ordre (D-197, lot robustesse-tests)

Fichiers : `e2e/tests/stabilite-helpers.ts` (aides) et `e2e/tests/stabilite-helpers.spec.ts` (domaine `dialogues`). Règle : synchronisation sur un état observable seulement (confirmation visible, focus sur « Annuler », champ focalisé), jamais sur un délai fixe ; geste réel (clic dans le champ) avant le premier `fill` d'un dialogue gardé. Identifiants posés ici après l'écriture du premier jet du test (écart à la règle « identifiant avant le test », consigné en D-197).

| id | énoncé | décision | lot | fichier |
|---|---|---|---|---|
| STB-1 | `saisirParGeste` : clic dans « Nom » de « Nouvelle équipe », champ focalisé puis valeur saisie ; Échap ouvre la confirmation | D-197 | robustesse-tests | e2e/tests/stabilite-helpers.spec.ts |
| STB-2 | `cliquerDansConfirmation` : attend la confirmation visible et le focus sur « Annuler » avant de cliquer « Abandonner » ; le dialogue se ferme | D-197 | robustesse-tests | e2e/tests/stabilite-helpers.spec.ts |

### Révisions D-031 (D-197, lot robustesse-tests)

Décision du porteur (2026-11-23) : révision de ces tests en -rN, même intention, mêmes assertions.

(A) Clic dans une confirmation après `expect(confirmation).toBeVisible()` (et focus sur « Annuler » pour les confirmations de sortie), par `cliquerDansConfirmation` :

| id | motif | fichier |
|---|---|---|
| E2E-400-r1, E2E-402-r1, E2E-405-r1, E2E-406-r1 | Clic sur « Abandonner » sans attendre la confirmation de sortie | e2e/tests/sortie.spec.ts |
| E2E-177-r1 | Clic sur « Supprimer » de la confirmation sans attendre sa visibilité | e2e/tests/lot3e.spec.ts |
| E2E-18-r1, E2E-19-r1, E2E-21-r2 | Même motif, suppressions (jalon, dépendance, assignation, affectation, jour férié, calendrier) | e2e/tests/lot1b-c.spec.ts |
| E2E-395-r1 | Même motif, suppression du calendrier | e2e/tests/rex5.spec.ts |
| E2E-346-r3 | Même motif, suppression de l'équipe (captures) | e2e/tests/lot6a-captures.spec.ts |
| E2E-459-r1 | Clic sur « Abandonner » du §2 sans attente (voir aussi (B)) | e2e/tests/garde-dialogue-focus.spec.ts |

(B) Clic réel dans le champ avant le premier `fill`, par `saisirParGeste` :

| id | motif | fichier |
|---|---|---|
| E2E-439-r2 à E2E-442-r2, E2E-443-r2, E2E-444-r2, E2E-445-r2, E2E-448-r2, E2E-449-r1, E2E-450-r1, E2E-454-r1, E2E-455-r2 | `fill` sans geste réel dans un dialogue gardé (D-195 (2)) | e2e/tests/garde-dialogue.spec.ts |
| E2E-459-r1 | Mêmes §1 à §4 | e2e/tests/garde-dialogue-focus.spec.ts |
| E2E-456-r1 | Même motif (captures) | e2e/tests/garde-dialogue-captures.spec.ts |
| E2E-311-r2 | Même motif, premier `fill` du commentaire de rejet | e2e/tests/lot4c.spec.ts |

Tests vitest (révision -r1, indépendants de l'ordre, prouvés par des passes en ordre aléatoire de leurs fichiers) :

| id | motif | fichier |
|---|---|---|
| INST-13-r1 | Le `afterEach` attendait l'évènement `exit` d'un serveur déjà tué par signal (`exitCode` nul, `signalCode` non nul) : délai du hook dépassé si « démarrage réel » passait avant le test pur. `signalCode` testé aussi, `fils` remis à `undefined` | packages/api/test/lot5b-demarrage.test.ts |
| BPW-7-r1 | La vérification « toute URL ouverte finit par `_test` » lisait les URL relevées par BPW-4 à BPW-6 (liste vide si lancée en premier). Les URL sont relevées dans le test lui-même (famille `essaibpw7`). Le second BPW-7 (refus avant toute connexion) est inchangé | scripts/test/bases-worker.test.ts |

Hors périmètre déclaré, non révisés : E2E-401 et E2E-403 (clic « Abandonner » de `sortie.spec.ts`), même motif que (A), absents de la liste de l'audit.

## Tests des prérequis du lot e2e-parallele : pré-contrôle et hook commit-msg (D-198)

Fichiers : `scripts/test/pre-controle.test.ts` (PRC) et `scripts/test/hook-commit-msg.test.ts` (HCM), projet scripts. Valeurs de D-198, pas de `SPEC.md` (outillage).

| id | énoncé | décision | lot | fichier |
|---|---|---|---|---|
| PRC-1 | pré-contrôle rouge : `executerSuite` rend le code 1 et le résultat « pré-contrôle en échec », message qui commence par « Pré-contrôle en échec » ; vitest et e2e non lancés ; journal inchangé octet pour octet (aucune ligne `debut`) | D-198 (1) | e2e-parallele | scripts/test/pre-controle.test.ts |
| PRC-2 | pré-contrôle vert : lancé avant la ligne `debut` (journal encore vide pendant son exécution), puis vitest et e2e ; lignes `debut` et `fin` écrites | D-198 (1) | e2e-parallele | scripts/test/pre-controle.test.ts |
| PRC-3 | lot déjà présent sans justification : refus avant le pré-contrôle (pré-contrôle non lancé, journal inchangé) | D-198 (1) | e2e-parallele | scripts/test/pre-controle.test.ts |
| PRC-4 | liste du pré-contrôle : chaque identifiant figure dans un `describe` ou un `it` de son fichier, qui existe ; commandes construites : `vitest run <fichiers> -t <motif>` (le motif retient chaque identifiant et rejette TC-1, TC-50, GBT-1), puis `playwright test --list` dans `e2e` | D-198 (1) | e2e-parallele | scripts/test/pre-controle.test.ts |
| PRC-5 | `scripts/suite-complete.mjs` passe le pré-contrôle à `executerSuite` | D-198 (1) | e2e-parallele | scripts/test/pre-controle.test.ts |
| HCM-1 | dans un dépôt git temporaire où `npm run setup-depot` a été lancé : sujet seul accepté (commit créé) | D-198 (2) | e2e-parallele | scripts/test/hook-commit-msg.test.ts |
| HCM-2 | sujet, ligne vide, corps et trailer : accepté | D-198 (2) | e2e-parallele | scripts/test/hook-commit-msg.test.ts |
| HCM-3 | sujet suivi directement d'un trailer, ou du corps : refusé, code non nul, message qui nomme la ligne vide manquante, aucun commit créé (HEAD inchangé) | D-198 (2) | e2e-parallele | scripts/test/hook-commit-msg.test.ts |
| HCM-4 | lignes de commentaire et partie après la ligne de ciseaux ignorées (sujet, commentaires git, ciseaux, diff : accepté) | D-198 (2) | e2e-parallele | scripts/test/hook-commit-msg.test.ts |
| HCM-5 | `.githooks/commit-msg` est suivi par git avec le mode exécutable ; `setup-depot` pose `core.hooksPath` = `.githooks` ; hors d'un dépôt git, il ne fait rien et rend le code 0 | D-198 (2) | e2e-parallele | scripts/test/hook-commit-msg.test.ts |

## Tests des e2e en parallèle, une pile par worker (D-199)

Fichiers : `scripts/test/piles-e2e.test.ts` (E2P-1 à E2P-5, E2P-7, E2P-8, projet scripts, en série) et `e2e/tests/pile-worker.spec.ts` (E2P-6, domaine `authentification`). Module testé : `scripts/lib/piles-e2e.mjs`. Valeurs de D-199, pas de `SPEC.md` (outillage). Les essais sur la base réelle utilisent une famille de bases propre aux tests (`<préfixe>_essaie2p_…_test`) et des ports hors de la plage des e2e.

| id | énoncé | décision | lot | fichier |
|---|---|---|---|---|
| E2P-1 | noms et ports : worker 1 → base `planersource_e2e_w1_test`, modèle `planersource_vitest_modele_test`, API 3301, front 5301 ; worker 0, négatif ou non entier refusé ; de 1 à 64 workers, jamais le port 3000 ni 5173 ; base de maintenance hors règle refusée (message du garde-fou) | D-199 (1), (2) | e2e-parallele | scripts/test/piles-e2e.test.ts |
| E2P-2 | base e2e du worker recréée neuve depuis le modèle de vitest : elle porte le témoin du modèle ; une écriture de l'exécution précédente a disparu | D-199 (1) | e2e-parallele | scripts/test/piles-e2e.test.ts |
| E2P-3 | registre : lanceur encore vivant → refus qui nomme son pid, aucun processus arrêté, registre inchangé ; lanceur mort → groupes marqués arrêtés, bases de la famille supprimées, registre effacé | D-199 (6) | e2e-parallele | scripts/test/piles-e2e.test.ts |
| E2P-4 | un pid du registre dont le processus ne porte pas le marqueur de la pile n'est pas arrêté | D-199 (6) | e2e-parallele | scripts/test/piles-e2e.test.ts |
| E2P-5 | configuration Playwright évaluée dans le worker d'index 1 : `TEST_DATABASE_URL` = base `…_e2e_w2_test`, `baseURL` = `http://localhost:5302`, état de session `e2e/.auth/admin-w2.json` ; hors worker : `TEST_DATABASE_URL` inchangée ; l'évaluation ne crée aucune base et n'ouvre aucun port | D-199 (3), (5) | e2e-parallele | scripts/test/piles-e2e.test.ts |
| E2P-6 | dans un worker : `TEST_DATABASE_URL` désigne la base du worker courant ; un calendrier créé par l'API derrière le front du worker est dans cette base, et absent de `planersource_test` | D-199 (1), (3) | e2e-parallele | e2e/tests/pile-worker.spec.ts |
| E2P-7 | bout en bout : `playwright test pile-worker.spec.ts --workers=2` rend 0 ; après la fin, aucune base `…_e2e_w…_test`, ports 3301, 3302, 5301, 5302 libres, registre effacé | D-199 (3), (6) | e2e-parallele | scripts/test/piles-e2e.test.ts |
| E2P-8 | arrêt brutal : piles démarrées par un lanceur tué par SIGKILL ; le nettoyage du démarrage suivant arrête les processus orphelins, supprime les bases et libère les ports | D-199 (6) | e2e-parallele | scripts/test/piles-e2e.test.ts |
| E2P-9 | structurel (pré-contrôle) : aucun fichier suivi sous `e2e/`, hors `e2e/pile-worker.ts`, ne contient `localhost:5173`, `localhost:3000`, `127.0.0.1:5173`, `127.0.0.1:3000` ni `.auth/admin.json` | D-199 (12), D-198 (4) | e2e-parallele | scripts/test/adresses-e2e.test.ts |
| E2P-10 | réservation du registre (relecture) : un lanceur en préparation réserve le registre par création exclusive avant toute base ; un second démarrage est refusé (pid du premier nommé) sans toucher la base ni le registre du premier ; `arreterPiles` en mode propriétaire ne fait rien si le registre appartient à un autre lanceur vivant ; `global-setup.ts` réserve le registre après `nettoyerPiles` et avant `preparerModele`, et arrête en mode propriétaire | D-199 (14) | e2e-parallele | scripts/test/piles-e2e-reservation.test.ts |

### Révisions D-031 (D-199, lot e2e-parallele)

Décision du porteur (2026-11-24) : révisions -r1, même intention ; tag `tests-e2e-parallele-r1`.

| id | motif | fichier |
|---|---|---|
| E2E-460-r1 | Lisait `e2e/.auth/admin.json` et ouvrait un contexte d'API sur `http://localhost:5173` : avec une pile par worker, l'état de session est `e2e/.auth/admin-w<N>.json` et le front du worker a son propre port (D-199 (2), (5)). Chemin et URL pris de `etat-session.ts` et `pile-worker.ts`. Mêmes assertions | e2e/tests/session-partagee.spec.ts |
| PRC-4-r1 | La liste attendue du pré-contrôle était celle de D-198 (1) seule ; E2P-9 y est ajouté (D-198 (4)) | scripts/test/pre-controle.test.ts |

Helper modifié (pas une révision de test, D-194 (4)) : `sessionDe` de `e2e/tests/lot4b-helpers.ts`, `baseURL` pris de `pile-worker.ts` au lieu de `http://localhost:5173`. Specs touchées indirectement : celles qui importent `sessionDe` (lot4b, lot4c et suivantes, voir `grep sessionDe e2e/tests`).

### Preuves de la phase rouge (D-198, D-199, lot e2e-parallele)

- PRC et HCM (commit 73b6b84, tag `tests-prerequis-e2e-parallele`, tag léger : son remplacement par un tag annoté exigeait un push forcé, refusé) : 16 rouges ; PRC-3 déjà vert (refus d'un lot présent sans justification, D-193 (4)) ; HCM : `.githooks/commit-msg` et `setup-depot` absents ; PRC : `preControle` non appelé, module `pre-controle.mjs` absent.
- E2P-1 à E2P-8 (commit aad7551, tag `tests-e2e-parallele`) : 13 rouges sur 14 ; module `piles-e2e.mjs` absent, E2P-5 « worker d'index 1 » : base restée `planersource_test` ; E2P-7 : E2P-6 rouge (base hors pile) ; E2P-5 « hors worker » déjà vert (comportement existant).
- E2P-9 (commit 6005426) : 6 fautes (`etat-session.ts`, `global-setup.ts`, `playwright.config.ts`, `lot4b-helpers.ts`, deux dans `session-partagee.spec.ts`).
- PRC-4-r1 et E2E-460-r1 (commit af2c089, tag `tests-e2e-parallele-r1`) : PRC-4-r1 rouge (E2P-9 absent de la liste) ; E2E-460-r1 rouge à la collecte (`e2e/pile-worker.ts` absent).

### Preuves de la phase verte (D-198, D-199)

- `pre-controle`, `hook-commit-msg`, `suite-complete`, `suite-complete-lot` : 47 verts ; pré-contrôle réel 3,9 s.
- `piles-e2e`, `adresses-e2e`, `pre-controle`, `garde-base-test`, `bases-worker`, `tests-cibles` : 96 verts.
- e2e : chaque spec seule, deux passes mélangées, trois passes de validation à 2 workers : docs/mesure-tests.md, section 14.

### Couverture des champs, lot e2e-parallele

Aucun champ d'API ni écran modifié (outillage de test seulement).

## Correctif 244 : choix fait avant la correction différée de l'adresse (D-200)

Fichier : `e2e/tests/correctif-244.spec.ts`, domaine feuille-de-temps (e2e/domaines.json). Valeurs de D-200 et de D-181 (5) (adresse `/imputations?semaine=…&ressource=<id>`, titre « Feuille de temps de <nom> »). Données préparées par l'API (monde de AUT-E) ; la ressource choisie reçoit un calendrier propre (D-163 (3)). Le choix dans « Ressource » est fait par un `MutationObserver` installé dans la page avant le clic de menu (D-200 (3)) : dès que la liste est activable et contient l'option, sa valeur change et un évènement `change` qui remonte est envoyé, dans le rappel de l'observateur, avant les effets passifs de React. Aucun délai.

| id | énoncé | décision | lot | fichier |
|---|---|---|---|---|
| E2E-467 | administrateur non ressource, sur l'Accueil ; clic « Imputations » dans le menu (adresse sans `semaine`) ; le choix « Alice 4B » dans « Ressource » est fait par l'observateur dès que la liste est activable et contient l'option. Attendus : adresse finale avec `semaine=2026-01-12` et `ressource=<id d'Alice>` ; titre h1 « Feuille de temps de Alice 4B » ; statut de la feuille affiché (« Brouillon ») ; `history.length` après le choix − avant le clic ≤ 2 (clic de menu, choix ; la correction d'adresse n'ajoute pas d'entrée) | D-200 (1), (2), (3) ; D-181 (5) | correctif-244 | e2e/tests/correctif-244.spec.ts |

Non exposés, aucun test (constat de la phase rouge, D-200 (7)) :

- Plan de charge : `Redirect` dépend seulement de l'adresse (`corrige`, `PlanDeCharge.tsx:68`) ; tant qu'il est vrai, `Contenu`, qui porte « Équipe », « Mois de départ » et les boutons de mois, n'est pas rendu (`PlanDeCharge.tsx:69`). Aucun contrôle de l'écran qui appelle `navigate` n'existe pendant la fenêtre.
- Validation : même schéma, `Redirect` sur `corrigee` (`Validation.tsx:65`), `Liste` (avec `NavigationSemaine`, `Validation.tsx:184-188`) non rendue tant que `corrigee` est vrai (`Validation.tsx:68`).
- Feuille de temps de la ressource (non administrateur) : même schéma (`FeuilleTemps.tsx:65-68`).
- Seule FeuilleAdmin a la fenêtre : `when={aCorriger}` attend l'annuaire (`FeuilleTemps.tsx:92`, `:109-112`) et la liste « Ressource » est rendue activable dans le même commit (`disabled={!prete}`, `FeuilleTemps.tsx:104`).
- Reste commun à tous les écrans, hors test : les liens du menu (`Layout`) sont rendus pendant la fenêtre de tout `Redirect` ; un clic à ce moment serait écrasé de la même façon. Fenêtre de l'ordre d'une tâche sur Plan de charge et Validation ; couvert par la correction du routeur (D-200 (2)).

### Couverture des champs, correctif 244

Aucun champ d'API ni écran modifié.

### Preuves de la phase rouge du correctif 244 (D-200)

- Commit d'ouverture abf0d5a ; test commité en b02277f.
- `cd e2e && npx playwright test -g E2E-467 --repeat-each=5 --workers=1` (par `npm run avec-base-test`) : 5 échecs sur 5, `toHaveURL` reçoit `/imputations?semaine=2026-01-12` (sans `ressource`) ; titre h1 resté « Feuille de temps » dans les 5 instantanés d'erreur.
- Contrôle de diagnostic, spec temporaire jamais commitée (mêmes gestes, assertions d'adresse et de titre retirées), 3 passes : l'observateur choisit sur `/imputations` (adresse pas encore corrigée) et `history.length` augmente de 2 : le `change` atteint bien `navigate` (entrée poussée), puis la redirection différée remplace l'adresse. Le rouge vient de la course, pas d'un choix non reçu.
- Lint, typecheck et PUB-1, PUB-2 verts ; `tests-cibles --depuis abf0d5a --lister` retient `correctif-244.spec.ts` (modifiée ; domaine feuille-de-temps).

## Recette automatisée (D-204)

Lot recette-auto : une ligne de la recette du porteur devient un e2e, même compte ou même rôle, même écran, même attendu (D-204 (2)). Valeurs attendues recopiées de la colonne Attendu de docs/recette.md (D-204 (3)) ; seuls changent les noms et les dates des données de test, créées par l'API avec un calendrier propre (D-204 (4), D-163 (3)). Tests sur un comportement existant : rouge prouvé par modification locale de l'écran, défaite ensuite (D-204 (5)). Sections `Preuves de la phase rouge` : docs/tests.md, « Preuves de la phase rouge (D-204) ».

| ID | Ligne de recette | Attendu | Source |
|---|---|---|---|
| E2E-468 | 1 (admin) | Accueil, Projets, Plan de charge, Imputations, Validation, Modèles, Utilisateurs ; ni « Équipes » ni « Calendriers » ; pas de « Mes tâches » (administrateur non ressource ; « Imputations » présente pour tout administrateur, D-181 (5), D-184) | RX5-5 ; D-165 (3) ; AUT-RD-1 ; fichier e2e/tests/recette-auto-admin.spec.ts |
| E2E-469 | 23 (admin) | « Calendrier par défaut » avec 0 jour férié ; lien vers le détail | RX5-2 ; D-165 (2) ; fichier e2e/tests/recette-auto-admin.spec.ts |
| E2E-470 | 30 (admin) | Entrée « Plan de charge » après « Projets » ; tableau « Plan de charge » : 12 colonnes « MM/AAAA » à partir du mois courant (11/2026) ; ressources Alice, Bob, Chef B, tout replié | L6-6d1 ; SPEC 6d (6, 7) ; fichier e2e/tests/recette-auto-admin.spec.ts |
| E2E-471 | 31 (admin) | `title` « Charge 10 j, disponible 21 j, écart 11 j » (valeurs de la base de démonstration) | L6-6d1 ; SPEC 6d (7) ; fichier e2e/tests/recette-auto-admin.spec.ts |
| E2E-472 | 34 (admin) | « Aucune ressource. » | L6-6d2 ; SPEC 6d (4, 7) ; fichier e2e/tests/recette-auto-admin.spec.ts |
| E2E-473 | 42 (admin) | Alice « Soumise » : « DEMO-R · À valider », « DEMO-S · Validé » ; Bob « Soumise » : « DEMO-R · À valider » | 4c-RD-3 ; D-136 (2) ; fichier e2e/tests/recette-auto-admin.spec.ts |
| E2E-474 | 43 (admin) | Bob « Validée » : « DEMO-R · Validé » ; Alice « Rejetée » : « DEMO-R » et « DEMO-S » sans suffixe | 4c-RD-4 ; D-136 (2) ; SPEC 4c (10b) ; fichier e2e/tests/recette-auto-admin.spec.ts |
| E2E-475 | 45 (admin) | Dialogue en lecture seule ; commentaire de rejet « Imputations du jeudi à revoir » | 4c-RD-5 ; SPEC 4c (4) ; fichier e2e/tests/recette-auto-admin.spec.ts |
| E2E-476 | 56 (admin) | « Aucune feuille de temps pour cette semaine. » | 4c-RD-3 ; SPEC 4c (3) ; fichier e2e/tests/recette-auto-admin.spec.ts |
| E2E-477 | 57 (chefa) | Accueil, Projets, Plan de charge, Validation, Modèles ; ni Utilisateurs, ni « Mes tâches », ni « Imputations » (chefa non ressource) | RX5-5 ; D-165 (5) ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-478 | 59 (chefa) | Alice « Soumise » : « DEMO-R · À valider », « DEMO-S · Validé » ; Bob « Soumise » : « DEMO-R · À valider ». Boutons « Valider » et « Rejeter » présents | 4c-RD-1 ; D-136 (2) ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-479 | 60 (chefa) | Bob « Validée » ; Alice « Rejetée », sans « Valider » ni « Rejeter », « Voir » présent | 4c-RD-4 ; SPEC 4c (7) ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-480 | 62 (chefa) | Adresse `/?ressource=<id>` ; tableau Projet, Activité, Début, Fin, Assigné, Réel, Reste, Drapeaux ; lignes DEMO-R et DEMO-S ; « Calculer », « Tout déplier » et case « Initiales » masqués | L6-6e1 ; SPEC 6e (6, 7, 8) ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-481 | 63 (chefa) | Retour au Gantt global, zoom conservé | L6-6e1 ; SPEC 6e (6) ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-482 | 64 (chefa) | Badge « Retard » sur Livraison et Intégration ; cellule vide sur les lignes de projet (décision D-132 (b) : pas un défaut) | DO-b ; D-132 ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-483 | 73 (chefa) | Cadrage : vendu 4, marge +1 ; Conception : vendu 2, marge −1 en couleur flag ; Phase 1 (parent) : vendu 6 ; jalons : cellules vides | L6-6c1 ; SPEC 6c ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-484 | 74 (chefa) | « Vendu 6 j · Assigné Y j · Marge Z j · Réel W j », virgule décimale, marge < 0 en couleur flag | L6-6c2 ; SPEC 6c ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-485 | 77 (chefa) | Badge « Client » (couleur flag), `title` « Engagement client dépassé » | L6-6c4 ; SPEC 6c ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-486 | 87 (chefa) | Confirmation « Abandonner les modifications ? », texte « Les modifications non enregistrées seront perdues. », bouton « Abandonner » | D172-2 ; D-172 (2, 6) ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-487 | 88 (chefa) | On reste sur le mois, même adresse, case toujours cochée | D172-2 ; D-172 (2) ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-488 | 89 (chefa) | Mois suivant affiché ; retour au mois courant : la case n'est pas cochée, rien enregistré | D172-2 ; D-172 (2) ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-489 | 90 (chefa) | Une seule confirmation « Abandonner les modifications ? » | D172-2 ; D-172 (2, 6) ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-490 | 92 (chefa) | Une seule confirmation ; « Abandonner » mène à « / » | D172-2 ; D-172 (2) ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-491 | 94 (chefa) | Aucune confirmation après l'enregistrement | D172-3 ; D-172 (2) ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-492 | 96 (chefa) | Message du navigateur | D172-4 ; D-172 (4) ; fichier e2e/tests/recette-auto-chefa.spec.ts |
| E2E-493 | 97 (chefb) | Mes tâches (en tête), Accueil, Projets, Plan de charge, Imputations, Validation, Modèles ; arrivée sur « / » | RX5-5 ; D-148 (11) ; fichier e2e/tests/recette-auto-chefb.spec.ts |
| E2E-494 | 103 (chefb) | Seule Alice, « Soumise » : « DEMO-R · Non autorisé », « DEMO-S · Validé » ; Bob absent | 4c-RD-2 ; D-136 (2) ; fichier e2e/tests/recette-auto-chefb.spec.ts |
| E2E-495 | 104 (chefb) | Seule Alice, « Rejetée » ; Bob absent | 4c-RD-5 ; SPEC 4c (7) ; fichier e2e/tests/recette-auto-chefb.spec.ts |
| E2E-496 | 107 (chefb) | « Aucune activité à imputer cette semaine. » | 4b-RD ; SPEC 4b (3) ; fichier e2e/tests/recette-auto-chefb.spec.ts |
| E2E-497 | 125 (alice) | Titre « Feuille de temps » ; « Semaine du 23/11/2026 au 29/11/2026 » ; statut « Brouillon » ; lundi 23/11 : 0,5 sur Cadrage ; jours postérieurs au jour du navigateur : cases désactivées | 4b-RD ; SPEC 4b (2, 3) ; fichier e2e/tests/recette-auto-alice.spec.ts |
| E2E-498 | 139 (alice) | Une seule confirmation « Abandonner les modifications ? », texte « Les modifications non enregistrées seront perdues. », bouton « Abandonner » | D172-1 ; D-172 (2) ; fichier e2e/tests/recette-auto-alice.spec.ts |
| E2E-499 | 145 (alice) | Une seule confirmation (pas de doublon) ; « Annuler » garde la semaine, l'adresse et la saisie | D172-1 ; D-172 (2) ; SPEC 4b (8) ; fichier e2e/tests/recette-auto-alice.spec.ts |
| E2E-500 | 146 (alice) | Aucune confirmation | D172-3 ; D-172 (2) ; fichier e2e/tests/recette-auto-alice.spec.ts |
| E2E-501 | 147 (alice) | Aucune confirmation après l'enregistrement | D172-3 ; D-172 (2) ; fichier e2e/tests/recette-auto-alice.spec.ts |
| E2E-502 | 149 (alice) | Message du navigateur | D172-4 ; D-172 (4) ; fichier e2e/tests/recette-auto-alice.spec.ts |
| E2E-503 | 156 (chefa) | Statut « Validée » ; badge « DEMO-R · Validé » ; boutons « Voir la feuille de Bob » et « Dévalider la feuille de Bob » ; ni « Valider » ni « Rejeter » | DEV-RD-1 ; SPEC Dévalidation (D-176) (2) ; fichier e2e/tests/recette-auto-chefa-retour.spec.ts |
| E2E-504 | 157 (chefa) | Dialogue « Dévalider la feuille de Bob pour DEMO-R ? », texte « La feuille repassera au statut Soumise. », boutons « Annuler » et « Dévalider » | DEV-RD-2 ; SPEC Dévalidation (D-176) (2) ; fichier e2e/tests/recette-auto-chefa-retour.spec.ts |
| E2E-505 | 158 (chefa) | Dialogue fermé ; statut de Bob toujours « Validée » | DEV-RD-2 ; SPEC Dévalidation (D-176) (2) ; fichier e2e/tests/recette-auto-chefa-retour.spec.ts |
| E2E-506 | 159 (chefa) | `role="status"` « Feuille dévalidée. » ; statut « Soumise » ; badge « DEMO-R · À valider » ; focus sur « Voir la feuille de Bob » | DEV-RD-3 ; SPEC Dévalidation (D-176) (2) ; D-145 (2) ; fichier e2e/tests/recette-auto-chefa-retour.spec.ts |
| E2E-507 | 160 (chefa) | « Feuille validée. » ; statut « Validée » ; badge « DEMO-R · Validé » | DEV-RD-4 ; SPEC 4c (5) ; fichier e2e/tests/recette-auto-chefa-retour.spec.ts |
| E2E-508 | 170 (admin) | Liste présente dès l'affichage (désactivée, « Chargement… »), l'en-tête ne bouge pas quand elle se remplit ; « Choisir… » grisée, non sélectionnable, en tête de liste | RET-RD-2 ; D-186 (1), (2) ; fichier e2e/tests/recette-auto-admin-retour.spec.ts |
| E2E-509 | 173 (admin) | Aucune confirmation dans tous les cas | GDL-RD-2 ; D-188 (1) ; fichier e2e/tests/recette-auto-admin-retour.spec.ts |
| E2E-510 | 174 (admin) | Confirmation (la saisie existe encore) ; « Abandonner » ferme sans création | GDL-RD-3 ; D-188 (5) ; fichier e2e/tests/recette-auto-admin-retour.spec.ts |
| E2E-511 | 176 (admin) | Sans toucher : aucune confirmation ; nom changé : confirmation | GDL-RD-4 ; D-188 (4), (10) b ; fichier e2e/tests/recette-auto-admin-retour.spec.ts |

### Preuves de la phase rouge (D-204)

Les 44 e2e portent sur un comportement existant : verts d'emblée (3 exécutions ciblées vertes par fichier, 9, 16, 15 puis 4 tests). Rouge prouvé par une modification locale de l'écran (`packages/web`), défaite par `git checkout -- packages/web` après chaque passe, jamais commitée (D-204 (5)). Passes : toutes les modifications d'une passe sont appliquées ensemble, les tests ciblés tournent, et chaque ID attendu rouge a échoué.

| IDs | Modification locale | Résultat |
|---|---|---|
| E2E-468 à E2E-476 | libellé « Modèles » du menu ; colonne Jours fériés + 1 ; en-tête de mois suffixé ; « écart » sans accent dans le title ; « Aucune ressource. » changé ; « · À valider » sans accent ; « · Validé » devenu « · Validée » ; commentaire de rejet masqué ; texte de l'état vide de Validation changé | 9 rouges sur 9 |
| E2E-477 à E2E-485 | « Modèles » ; « · À valider » ; boutons Valider affichés pour toute feuille ; en-tête « Reste » du planning de ressource ; zoom retiré de l'adresse au retour à « Tous les projets » ; badge « Retard » raccourci ; colonne « Vendu » renommée ; couleur flag retirée des totaux ; title du badge « Client » changé | 9 rouges sur 9 |
| E2E-486 à E2E-490, E2E-492 | `GardeSortie` : `if (!modifie) return;` remplacé par `return;` (plus de garde) | 6 rouges sur 6 ; E2E-491 resté vert, attendu |
| E2E-491 | `PlanningManuel` : `<GardeSortie modifie={true} />` (garde toujours active) | rouge |
| E2E-493 à E2E-497 | « Modèles » ; « · Non autorisé » changé ; libellés « Rejetée » et « Brouillon » ; texte de l'état vide de la Feuille de temps | 5 rouges sur 5 |
| E2E-504 à E2E-507 | texte « La feuille repassera au statut Soumise. » ; « Annuler » sans fermeture ; messages de succès changés | 4 rouges sur 4 |
| E2E-498, E2E-499, E2E-502, E2E-503 | `GardeSortie` sans garde ; libellé « Dévalider la feuille de » changé | 4 rouges sur 4 (E2E-500 et E2E-501 verts, attendu) |
| E2E-500, E2E-501 | `FeuilleTemps` : `<GardeSortie modifie={true} />` | 2 rouges sur 2 |
| E2E-508, E2E-510 | libellé « Chargement… » de la liste Ressource ; texte « Cet identifiant est déjà utilisé. » changé | 2 rouges sur 2 |
| E2E-509, E2E-511 | `Dialog` : `if (modifiee)` remplacé par `if (true)` (confirmation sur dialogue intact) | 2 rouges sur 2 |
| E2E-510 | `Dialog` : `if (modifiee)` remplacé par `if (false)` (aucune confirmation) | rouge |

Aucune ligne « KO (e2e) » : les 44 tests sont verts sur le code actuel.

Écarts de données assumés (D-204 (4)) : E2E-470 fige l'horloge au 14/01/2026 (colonnes 01/2026 à 12/2026 au lieu de 11/2026 à 10/2027) ; E2E-471 et E2E-472 ouvrent `?debut=2027-01` (même `title`, 21 j ouvrés) ; les semaines de validation et de feuille de temps sont celles du 05/01 et du 12/01/2026, les projets s'appellent P4B et Q4B. Les textes et les statuts attendus sont inchangés.

## Correctif rex3b (D-207)

Fichier : `e2e/tests/correctif-rex3b.spec.ts`, domaine gantt (e2e/domaines.json). Valeurs de D-207 (1) et de SPEC.md, Gantt, point 17. Retenue du PATCH ou du POST par `page.route` (promesse libérée à la main, aucun délai). Monde de rex3b (activité START 11/01/2027, 5 j).

| id | énoncé | décision | lot | fichier |
|---|---|---|---|---|
| E2E-512 | Deux glissers de barre (11 → 12 → 13/01), le second retenu ; Ctrl+Z pendant la retenue : aucun PATCH de plus (2 requêtes), pas de « Geste annulé. » ; libéré : base au 13/01 ; deux annulations : 12/01 puis 11/01 (corps `{ debut_valide }` vérifiés) | D-207 (1) | correctif-rex3b | e2e/tests/correctif-rex3b.spec.ts |
| E2E-513 | Même cas avec le bouton « Annuler » : désactivé pendant la retenue (aucun PATCH, pas de « Geste annulé. »), actif après la réponse ; deux annulations : 12/01 puis 11/01 | D-207 (1) | correctif-rex3b | e2e/tests/correctif-rex3b.spec.ts |
| E2E-514 | Geste de lien : barre A glissée (+1 j), puis lien A → B créé par glisser, POST retenu ; Ctrl+Z et bouton : ignorés (aucun PATCH ni DELETE), bouton désactivé ; libéré : dépendance en base, bouton actif ; annulation : DELETE du lien, puis PATCH inverse de A | D-207 (1) | correctif-rex3b | e2e/tests/correctif-rex3b.spec.ts |
| E2E-515 | Geste de ligne : barre Q glissée (+1 j), puis ligne R glissée dans Phase P, POST `…/deplacer` retenu ; Ctrl+Z et bouton : ignorés, bouton désactivé ; libéré : arbre changé ; annulation : POST inverse `{ parent_id: null, rang: 3 }`, puis PATCH inverse de Q | D-207 (1) | correctif-rex3b | e2e/tests/correctif-rex3b.spec.ts |
| E2E-516 | Autre élément : barre A glissée (+1 j), puis barre B glissée (+1 j) retenue ; Ctrl+Z et bouton : ignorés (A garde 12/01) ; libéré : annulation de B (18/01) puis de A (11/01) | D-207 (1) | correctif-rex3b | e2e/tests/correctif-rex3b.spec.ts |
| E2E-517 | PATCH du second geste retenu puis refusé (500 simulé) : pendant la retenue, bouton désactivé et Ctrl+Z ignoré ; après la réponse : alerte « Modification impossible pour le moment. Réessayez. », base au 12/01 (inchangée), bouton actif (pile d'une entrée) ; une annulation : PATCH `{ debut_valide: '2027-01-11' }`, base 11/01, bouton désactivé | D-207 (1) | correctif-rex3b | e2e/tests/correctif-rex3b.spec.ts |

### Révision D-031 de E2E-517 (tag `tests-correctif-rex3b-r1`)

Erreur du test sous tag, relevée à la première exécution verte : l'alerte `role="alert"` contient aussi le bouton « Fermer » (texte lu « …Réessayez.Fermer »), `toHaveText` exact ne peut pas passer. Aucun code de production, valeurs attendues inchangées ; l'assertion devient `toContainText`. À confirmer par le porteur (D-031).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-517-r1 | Révision de E2E-517 : texte de l'alerte vérifié par `toContainText` | D-207 (1) | correctif-rex3b | e2e/tests/correctif-rex3b.spec.ts |

### Révisions D-031 (D-207 (3), tag `tests-rex3b-r3`)

Aucun code de production. Intention et valeurs attendues inchangées. Corps de chaque requête inverse vérifié ; base relue par `expect.poll` avec la dernière valeur lue et le journal des PATCH dans le message d'échec (assistants `debutEnBase`, `corpsDuPatch`, rex3b.spec.ts).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-264-r3 | Révision de E2E-264-r2 : corps des deux inverses et base relus avec le journal en message | D-207 (3) | correctif-rex3b | e2e/tests/rex3b.spec.ts |
| E2E-267-r3 | Révision de E2E-267-r2 : corps des 20 inverses (valeur d'avant chaque geste) vérifiés, base finale relue avec le journal | D-207 (3) | correctif-rex3b | e2e/tests/rex3b.spec.ts |
| E2E-272-r3 | Révision de E2E-272-r2 : corps de l'inverse vérifié, nombre de PATCH et base avec le journal | D-207 (3) | correctif-rex3b | e2e/tests/rex3b.spec.ts |
| E2E-277-r3 | Révision de E2E-277-r2 : corps des deux inverses vérifiés, base relue avec le journal | D-207 (3) | correctif-rex3b | e2e/tests/rex3b.spec.ts |

### Révision D-031 de E2E-514 (D-210 (2), tag `tests-correctif-rex3b-r2`)

Défaut du test sous tag (D-209 (7)) : lecture unique de la base après l'émission du DELETE, qui échoue parfois (3 échecs sur 20 sans la correction de 64bf694). Aucun code de production ; intention et valeurs attendues inchangées. La base est relue par `expect.poll` après la réponse du DELETE, avec le journal des requêtes dans le message d'échec. Décision du porteur : D-210 (2).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-514-r1 | Révision de E2E-514 : base relue par `expect.poll` après le DELETE, journal des requêtes en message d'échec | D-210 (2) | correctif-rex3b | e2e/tests/correctif-rex3b.spec.ts |

### Couverture des champs, correctif rex3b

Aucun champ d'API ni écran modifié : comportement du bouton « Annuler » et de Ctrl+Z seulement.

## Correctif inverse (D-208 (4), D-209)

Fichier : `e2e/tests/correctif-inverse.spec.ts`, domaine gantt (e2e/domaines.json). Valeurs de D-123 (1) et de SPEC.md, Gantt, point 17 (annulation = requête inverse avec les valeurs d'avant le geste). Cause prouvée au diagnostic : une réponse de `GET /api/projets/:id/gantt` partie avant un geste et reçue après sa réponse remplace l'élément mis à jour localement ; le geste suivant calcule son inverse sur l'élément d'avant. La réponse périmée est retenue par `page.route` (`route.fetch` puis `route.fulfill`, libérée à la main, aucun délai).

| id | énoncé | décision | lot | fichier |
|---|---|---|---|---|
| E2E-518 | Barre START (11/01) : second `GET …/gantt` du montage retenu ; glisser +1 j (base 12/01), réponse périmée libérée, glisser +2 j (base 13/01) ; Ctrl+Z : corps `{ debut_valide: '2027-01-12' }`, base 12/01 ; Ctrl+Z : corps `{ debut_valide: '2027-01-11' }`, base 11/01 | D-123 (1), D-208 (4) | correctif-inverse | e2e/tests/correctif-inverse.spec.ts |
| E2E-519 | Même cas par la poignée de fin d'une FDUR (11/01, 5 j) : +72 px (durée 6), +96 px (durée 7) ; Ctrl+Z : `{ duree_validee: 6 }`, base 6 ; Ctrl+Z : `{ duree_validee: 5 }`, base 5 | D-123 (1), D-208 (4) | correctif-inverse | e2e/tests/correctif-inverse.spec.ts |
| E2E-520 | Rechargement après un lien créé par glisser (A → B), `GET …/gantt` retenu ; glissers de A +1 j puis +2 j ; réponse libérée entre les deux ; Ctrl+Z : `{ debut_valide: '2027-01-12' }` ; Ctrl+Z : `{ debut_valide: '2027-01-11' }` ; base relue après chaque annulation | D-123 (1), D-208 (4) | correctif-inverse | e2e/tests/correctif-inverse.spec.ts |

### Preuves (D-209)

- Rouge (ecaf7fa, tag `tests-correctif-inverse`) : 15 échecs sur 15 (5 passes) ; PATCH #3 lu `{ debut_valide: '2027-01-11' }` (E2E-518, E2E-520) et `{ duree_validee: 5 }` (E2E-519).
- Vert (64bf694) : 9 sur 9 (3 par test) ; suite complète verte (journal, lignes 25 et 26).

### Couverture des champs, correctif inverse

Aucun champ d'API ni écran modifié : chargement des données de l'écran (`useListe`) seulement.

## Gantt : colonnes et défilement (D-212)

Tranche 1 (sous-lot gantt-colonnes-1) : séparateur, défilement, mémorisation du séparateur. Fichiers : `e2e/tests/gantt-colonnes.spec.ts` (domaines gantt et accueil, e2e/domaines.json ; le domaine vue-ressource couvre « Mes tâches », pas le planning d'une ressource de l'Accueil, qui est dans le domaine accueil), `packages/web/test/gantt-disposition.test.ts`. Données créées par l'API : un chef, deux ressources, un projet ; montage court (3 activités, dont une au nom de 60 caractères) ou long (60 activités de 1 j assignées à Alice, plus « Tâche B », START 11/01/2027, 5 j, Bob). Vues : Gantt d'un projet (`/projets/<id>?onglet=gantt&zoom=jour`), Gantt global de l'Accueil (`/?zoom=jour`, « Tout déplier »), planning d'Alice (`/?ressource=<id>&zoom=jour`). Valeurs de SPEC §6 « Colonnes et défilement (gantt-colonnes, D-212) ».

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-521 | Gantt d'un projet, 1440 et 1024 px : largeur par défaut du tableau = 40 % de la vue (± 1 px), ou largeur minimale du critère D-069 (Nom jointif de Drapeaux, ± 1 px) si elle est plus grande ; en-têtes WBS, Nom et Drapeaux entièrement dans la zone, Nom non recouvert par Drapeaux ; au plus 80 % de la vue | D-212 (2), SPEC Colonnes et défilement 3 | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-522 | Gantt global de l'Accueil : même contrôle que E2E-521 (Code, Nom, Drapeaux) | D-212 (2) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-523 | Planning d'une ressource : même contrôle que E2E-521 (Projet, Activité, Drapeaux) | D-212 (2) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-524 | Gantt d'un projet : séparateur `role="separator"`, `aria-orientation="vertical"`, nom « Largeur du tableau », focalisable ; `aria-valuenow` = largeur du tableau ; glisser de +100 px : +100 ; flèche droite : +16, flèche gauche : −16 ; bornes 200 px et 80 % de la vue (souris et clavier) ; double-clic puis Entrée : largeur par défaut | D-212 (2) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-525 | Gantt global de l'Accueil : même contrôle que E2E-524 | D-212 (2) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-526 | Planning d'une ressource : même contrôle que E2E-524 | D-212 (2) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-527 | Gantt d'un projet : largeur réglée (+32 px) gardée au rechargement ; stockage du navigateur indisponible (`localStorage` qui lève une exception, `addInitScript`) : largeur par défaut, séparateur utilisable, aucune erreur de page ni de console | D-212 (5) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-528 | Gantt global de l'Accueil : même contrôle que E2E-527 | D-212 (5) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-529 | Planning d'une ressource : même contrôle que E2E-527 | D-212 (5) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-530 | Gantt d'un projet, 61 lignes, 1440×900 : bas de la zone du calendrier dans la fenêtre ; calendrier plus large que sa zone (barre horizontale) ; page sans défilement horizontal | D-212 (3) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-531 | Gantt global de l'Accueil, projet déplié (62 lignes) : même contrôle que E2E-530 | D-212 (3) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-532 | Planning d'une ressource (60 lignes) : même contrôle que E2E-530 | D-212 (3) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-533 | Gantt d'un projet : défilement vertical du calendrier (300 px) : même `scrollTop` dans le tableau ; en-têtes du tableau et du calendrier en haut de leur zone ; flèche bas dans la zone du tableau focalisée : les deux zones défilent, à la même position | D-212 (3) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-534 | Gantt global de l'Accueil : même contrôle que E2E-533 | D-212 (3) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-535 | Planning d'une ressource : même contrôle que E2E-533 | D-212 (3) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-536 | Gantt d'un projet, après défilement vertical jusqu'en bas (tableau au même `scrollTop`) : glisser de la barre de « Tâche B » de +72 px au zoom jour : un PATCH `{ debut_valide: '2027-01-14' }` (comme E2E-132), début validé lu en base 2027-01-14 | D-212 (3), E2E-132 | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-537 | Gantt d'un projet, après défilement vertical jusqu'en bas : glisser de la ligne « Tâche B » avant « Tâche 60 » : un POST de déplacement `{ parent_id: null, rang: 60 }` (comme E2E-182), rangs lus en base : Tâche B 60, Tâche 60 61 | D-212 (3), E2E-182 | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-538 | Captures sans assertion (D-212 (6)) : `e2e/captures/gantt-colonnes-<vue>-<largeur>.png` pour les trois vues à 1440 et 1024 px (61 lignes, défilées à mi-hauteur), et `gantt-colonnes-separateur-focus.png`, `-survol.png`, `-glisser.png` (séparateur focalisé, survolé, glissé) | D-212 (6) | gantt-colonnes-1 | e2e/tests/gantt-colonnes-captures.spec.ts |
| E2E-539 | Gantt d'un projet, 1024 px, projet non calculé dont une activité STARR (06/01/2027) aura « Début non respecté » (Eve occupée le 06/01 par une MAN) : « Calculer » à l'écran (D0 du navigateur, 06/01/2027) ; sans rechargement, le badge « Début non respecté » est entièrement dans la zone du tableau et WBS et Nom ne sont pas recouverts par Drapeaux (D-069 (a), (b)) | D-212 (2) | gantt-colonnes-1 | e2e/tests/gantt-colonnes.spec.ts |
| GCO-1 | `largeurParDefaut` : 40 % de la vue arrondi, relevé au minimum mesuré, borné à [200, 80 % de la vue] | D-212 (2) | gantt-colonnes-1 | packages/web/test/gantt-disposition.test.ts |
| GCO-2 | `bornerLargeur` : 200 px au moins, 80 % de la vue au plus (arrondi inférieur) | D-212 (2) | gantt-colonnes-1 | packages/web/test/gantt-disposition.test.ts |
| GCO-3 | `lireDisposition` : objet JSON `{ tableau: <nombre> }` lu ; clé absente, JSON illisible, valeur non numérique ou stockage qui lève une exception : `{}` | D-212 (5) | gantt-colonnes-1 | packages/web/test/gantt-disposition.test.ts |
| GCO-4 | `ecrireDisposition` : écrit le JSON sous la clé de la vue ; stockage qui lève une exception : aucune exception | D-212 (5) | gantt-colonnes-1 | packages/web/test/gantt-disposition.test.ts |

### Révisions D-031 de gantt-colonnes-1

D-213 (séparateur dans l'ordre de focus) : seul ajout, l'arrêt « Largeur du tableau » entre la zone du tableau et la zone du calendrier. D-212 (7) (disposition, sans décision préalable) : à 1440 px, le tableau par défaut (40 % de la vue) défile ; le séparateur est d'abord porté au maximum (80 % de la vue), assertions et valeurs inchangées.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-92-r6 | E2E-92-r5 : « Largeur du tableau » entre « Modifier le projet Projet92 » et la zone du calendrier (12 arrêts) | D-213 | gantt-colonnes-1 | e2e/tests/accueil-g2.spec.ts |
| E2E-100-r4 | E2E-100-r3 : même insertion (12 arrêts) | D-213 | gantt-colonnes-1 | e2e/tests/accueil-g3.spec.ts |
| E2E-109-r3 | E2E-109-r2 : même insertion (12 arrêts) | D-213 | gantt-colonnes-1 | e2e/tests/accueil-g4.spec.ts |
| E2E-381-r1 | E2E-381 : « Largeur du tableau » entre le lien « 6E1 » et la zone du calendrier (7 arrêts) | D-213 | gantt-colonnes-1 | e2e/tests/lot6e.spec.ts |
| E2E-43-r6 | E2E-43-r5 : séparateur focalisé entre le crayon du sous-projet et la zone du calendrier | D-213 | gantt-colonnes-1 | e2e/tests/lot3b-focus.spec.ts |
| E2E-179-r4 | E2E-179-r3 : même insertion | D-213 | gantt-colonnes-1 | e2e/tests/lot3e.spec.ts |
| E2E-191-r4 | E2E-191-r3 : même insertion | D-213 | gantt-colonnes-1 | e2e/tests/lot3f1.spec.ts |
| E2E-289-r1 | E2E-289 : séparateur porté au maximum avant les mesures | D-212 (7) | gantt-colonnes-1 | e2e/tests/rex3b-r4.spec.ts |
| E2E-366-r2 | E2E-366-r1 : à 1440 px, séparateur porté au maximum avant les mesures (identifiant d'abord noté par erreur E2E-366-r1, déjà pris par D-153 (2) ; corrigé après relecture) | D-212 (7) | gantt-colonnes-1 | e2e/tests/lot6c.spec.ts |
| E2E-209-r1 | E2E-209 : après la capture de survol de « Tâche R », zone du tableau ramenée à `scrollLeft` 0 (le survol d'une ligne plus large que le tableau l'avait fait défiler, poignées hors zone) | D-212 (7) | gantt-colonnes-1 | e2e/tests/lot3f2-captures.spec.ts |

### Couverture des champs, gantt-colonnes-1

Aucun champ d'API créé ni modifié : la largeur du tableau est gardée dans le stockage du navigateur (D-212 (5)), réglée par le séparateur de chaque vue.

Tranche 2 (sous-lot gantt-colonnes-2, D-212 (4), (5), D-216) : largeur de chaque colonne, choix des colonnes, mémorisation, « Rétablir l'affichage par défaut ». Fichiers : `e2e/tests/gantt-colonnes-2.spec.ts` (domaines gantt et accueil), `e2e/tests/gantt-colonnes-2-captures.spec.ts` (domaine captures), `packages/web/test/gantt-disposition.test.ts`. Données créées par l'API : montage court de la tranche 1 (un chef, Alice et Bob, un projet début 04/01/2027 : « Tâche 01 », l'activité au nom de 60 caractères, « Tâche B » ; calculé). Vues et adresses de la tranche 1. Valeurs recopiées de D-212 (4), (5) et D-216 : poignée `role="separator"`, nom « Largeur de la colonne <en-tête> », 16 px par flèche, minimum 48 px, 120 px pour la colonne du nom (Nom ; Activité sur le planning d'une ressource, colonne du nom de D-216 (1)). Menus attendus, dans l'ordre (D-216 (7)) : Gantt d'un projet, utilisateur qui écrit : Planification, Début, Fin, Charge, Vendu, Marge, Avancement, Drapeaux (tous cochés) ; Accueil : Charge, Avancement, Réel, Vendu, Marge (décochés), Début, Fin, Drapeaux (cochés) ; planning d'une ressource : Début, Fin, Assigné, Réel, Reste, Drapeaux (cochés) ; puis « Rétablir l'affichage par défaut ». Stockage : clé `planersource.gantt.<vue>` de la tranche 1, JSON `{ tableau?, colonnes?: { <id>: booléen }, largeurs?: { <id>: px } }` ; identifiants : `wbs`, `nom`, `planification`, `debut`, `fin`, `charge`, `vendu`, `marge`, `avancement`, `drapeaux` (Gantt d'un projet) ; `code`, `nom`, `charge`, `avancement`, `reel`, `vendu`, `marge`, `debut`, `fin`, `drapeaux` (Accueil) ; `projet`, `activite`, `debut`, `fin`, `assigne`, `reel`, `reste`, `drapeaux` (planning d'une ressource).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-540 | Gantt d'un projet : menu « Colonnes » à la souris (clic) : éléments à case à cocher dans l'ordre fixe, cases cochées selon les défauts, WBS et Nom absents du menu, dernier élément « Rétablir l'affichage par défaut » ; décocher « Début » : menu ouvert, en-tête et cellules absents (cellules par ligne = en-têtes) ; recocher : colonne à sa place ; clic hors du menu : fermé, focus sur « Colonnes ». Au clavier : Entrée sur le bouton, flèches jusqu'à « Drapeaux », Espace : décochée, menu ouvert, Drapeaux absente ; Espace : rétablie ; Échap : menu fermé, focus sur « Colonnes » | D-212 (4), D-216 (2), (4), (7) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-541 | Gantt global de l'Accueil : même contrôle que E2E-540 (Code et Nom absents du menu ; cocher « Charge » l'affiche entre Nom et Début, décocher l'enlève) | D-212 (4), D-216 | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-542 | Planning d'une ressource : même contrôle que E2E-540 (Projet et Activité absents du menu) | D-212 (4), D-216 (1) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-543 | Gantt d'un projet : une poignée par en-tête, nom « Largeur de la colonne <en-tête> », `aria-valuenow` = largeur de l'en-tête (± 1 px) ; colonne du nom : glisser de +40 px, flèche droite +16, flèche gauche −16, glisser de −2000 px : 120, flèche gauche : 120 ; nom long toujours tronqué (`scrollWidth` > `clientWidth`), `title` = nom complet, contenu dans la colonne ; double-clic, puis flèche droite et Entrée : largeur par défaut ; « Début » : glisser de −2000 px : 48 ; « Début » réglée (+32), masquée puis réaffichée : largeur gardée | D-212 (4), D-216 (5) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-544 | Gantt global de l'Accueil : même contrôle que E2E-543 | D-212 (4), D-216 (5) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-545 | Planning d'une ressource : même contrôle que E2E-543 (colonne du nom : Activité) | D-212 (4), D-216 (5) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-546 | Gantt d'un projet : « Début » masquée et colonne du nom réglée (+32) gardées au rechargement et sur un autre projet ; valeur illisible : défauts, aucune erreur ; stockage indisponible : défauts, menu et poignées utilisables, aucune erreur ; `{ colonnes: { inconnue: false, debut: false }, largeurs: { inconnue: 300 } }` : « Début » masquée, le reste par défaut, aucune erreur | D-212 (5), D-216 | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-547 | Gantt global de l'Accueil : même contrôle que E2E-546, sans l'autre projet | D-212 (5) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-548 | Planning d'une ressource : même contrôle que E2E-547 | D-212 (5) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-549 | Gantt d'un projet : « Début » masquée, colonne du nom +32, séparateur +48 ; « Rétablir l'affichage par défaut » : en-têtes, largeur de la colonne du nom et du tableau par défaut, gardés au rechargement | D-212 (4) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-550 | Gantt global de l'Accueil : même contrôle que E2E-549 (en plus « Charge » affichée avant le rétablissement) | D-212 (4) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-551 | Planning d'une ressource : même contrôle que E2E-549 | D-212 (4) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-552 | Gantt d'un projet, 1440 et 1024 px, réglages par défaut : deux premières colonnes et Drapeaux dans la zone du tableau, colonne du nom non recouverte par Drapeaux (D-069 (a), (b)) ; toutes les colonnes affichées : page sans défilement horizontal ; séparateur porté à 200 px : Drapeaux fixée à droite (bord droit de l'en-tête = bord droit de la zone cliente, ± 1 px) | D-216 (4), 3b point 15 | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-553 | Gantt global de l'Accueil : même contrôle que E2E-552 | D-216 (4) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-554 | Planning d'une ressource : même contrôle que E2E-552 | D-216 (4) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-555 | Gantt d'un projet, chef qui lit sans écrire : menu Planification, Début, Fin, Charge, Avancement, Drapeaux, sans Vendu ni Marge | D-212 (4) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-556 | Accueil, chef qui écrit P1 et lit P2, Charge, Avancement, Réel, Vendu, Marge cochées : en-têtes Code, Nom, Charge, Avancement, Réel, Vendu, Marge, Début, Fin, Drapeaux ; activité de P1 (4 j assignés, 1,5 j imputé, vendue 3) : « 4 », « 37,5 % », « 1,5 », « 3 », « −1 » en couleur flag ; jalon de P1 : Charge, Avancement et Réel « — », Vendu et Marge vides ; lignes de projet : cinq cellules vides ; activité de P2 (2 j, vendue 5 par l'administrateur) : « 2 », « 0 % », « 0 », Vendu et Marge vides | D-212 (4), D-216 (6) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-557 | Captures sans assertion (D-212 (6)) : `e2e/captures/gantt-colonnes-2-menu-<vue>.png` (menu ouvert, 1440 px), `gantt-colonnes-2-toutes-<vue>-<largeur>.png` (toutes les colonnes, 1440 et 1024 px), `gantt-colonnes-2-poignee-survol.png`, `-focus.png`, `-glisser.png` | D-212 (6) | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2-captures.spec.ts |
| GCO-5 | `lireDisposition` : `colonnes` (booléens) et `largeurs` (nombres finis) lus pour les identifiants connus de la vue ; identifiant inconnu, colonne toujours affichée dans `colonnes`, valeur d'un autre type : ignorés | D-212 (5) | gantt-colonnes-2 | packages/web/test/gantt-disposition.test.ts |
| GCO-6 | `colonnesAffichees` : défauts de chaque vue, dans l'ordre fixe ; réglages appliqués ; Vendu et Marge seulement si disponibles (Gantt d'un projet) | D-212 (4), D-216 (7) | gantt-colonnes-2 | packages/web/test/gantt-disposition.test.ts |
| GCO-7 | `colonnesDuMenu` : colonnes au choix de chaque vue, dans l'ordre fixe, sans les colonnes toujours affichées ; sans Vendu ni Marge si non disponibles | D-212 (4), D-216 (1), (7) | gantt-colonnes-2 | packages/web/test/gantt-disposition.test.ts |
| GCO-8 | `bornerColonne` : arrondi, au moins 48 px, 120 px pour la colonne du nom | D-212 (4) | gantt-colonnes-2 | packages/web/test/gantt-disposition.test.ts |
| GCO-9 | `avecColonne`, `avecLargeur` : nouvelle disposition sans modifier l'ancienne ; largeur retirée par `undefined` ; une colonne masquée garde sa largeur | D-212 (5), D-216 (5) | gantt-colonnes-2 | packages/web/test/gantt-disposition.test.ts |

### Révisions D-031 de gantt-colonnes-2

Décision du porteur (2026-11-24, avant le vert) : tests sous le tag `tests-gantt-colonnes-2` jugés faux, valeurs attendues inchangées. Défauts : planning d'Alice attendu sur « Tâche B » (tâche de Bob) ; flèches enchaînées sans attendre le focus (Radix déplace le focus des éléments du menu par `setTimeout`) ; après Échap, focus rendu au bouton « Colonnes » un tick plus tard (Radix), volé à la poignée focalisée ensuite par le test ; glisser d'une poignée recouverte par Drapeaux (fixée à droite) quand le tableau défile. Tag `tests-gantt-colonnes-2-r1`.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-540-r1 à E2E-556-r1 | E2E-540 à E2E-556 : planning d'une ressource attendu sur « 1 Tâche 01 » ; focus attendu après chaque flèche du menu et sur « Colonnes » après Échap ; E2E-543 à E2E-545 : séparateur porté au maximum avant les glisser de poignée | D-031, D-216 | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-557-r1 | E2E-557 : planning d'une ressource attendu sur « 1 Tâche 01 » | D-031 | gantt-colonnes-2 | e2e/tests/gantt-colonnes-2-captures.spec.ts |

### Révisions de gantt-colonnes-2 (passes ciblées)

D-216 (3) (arrêts « Colonnes » et poignées de largeur dans l’ordre de focus, sans décision préalable) ; E2E-38-r3 : décision du porteur. Intention et valeurs attendues inchangées.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-38-r3 | E2E-38-r2 : 5 boutons dans l'onglet (zooms, « Annuler » désactivé, « Colonnes ») pour le chef en lecture seule | D-031, D-212 (4) | gantt-colonnes-2 | e2e/tests/lot3b.spec.ts |
| E2E-143-r1, E2E-144-r1, E2E-145-r1, E2E-146-r1, E2E-148-r1, E2E-149-r1, E2E-150-r2, E2E-151-r1, E2E-155-r1, E2E-156-r1, E2E-157-r1 | Même test ; `tabulerJusqua` : 60 appuis de Tab au plus (30 avant), « Colonnes » et les poignées de largeur s'ajoutant aux arrêts | D-216 (3) | gantt-colonnes-2 | e2e/tests/lot3d3b.spec.ts |
| E2E-92-r7 | E2E-92-r6 : « Colonnes » après « Initiales » ; « Largeur de la colonne » Code, Nom, Début, Fin, Drapeaux après la zone du tableau (17 arrêts) | D-216 (3) | gantt-colonnes-2 | e2e/tests/accueil-g2.spec.ts |
| E2E-100-r5 | E2E-100-r4 : même insertion (17 arrêts) | D-216 (3) | gantt-colonnes-2 | e2e/tests/accueil-g3.spec.ts |
| E2E-109-r4 | E2E-109-r3 : même insertion (17 arrêts) | D-216 (3) | gantt-colonnes-2 | e2e/tests/accueil-g4.spec.ts |
| E2E-43-r7 | E2E-43-r6 : « Colonnes » entre « Initiales » et « Copier » ; dix poignées « Largeur de la colonne » (WBS à Drapeaux) après la zone du tableau | D-216 (3) | gantt-colonnes-2 | e2e/tests/lot3b-focus.spec.ts |
| E2E-381-r2 | E2E-381-r1 : « Colonnes » après « Mois » ; huit poignées (Projet à Drapeaux) après la zone du tableau (16 arrêts) | D-216 (3) | gantt-colonnes-2 | e2e/tests/lot6e.spec.ts |
| E2E-179-r5 | E2E-179-r4 : « Colonnes » entre « Initiales » et « Copier » ; dix poignées après la zone du tableau | D-216 (3) | gantt-colonnes-2 | e2e/tests/lot3e.spec.ts |
| E2E-191-r5 | E2E-191-r4 : même insertion | D-216 (3) | gantt-colonnes-2 | e2e/tests/lot3f1.spec.ts |
| E2E-204-r2 | E2E-204-r1 : « Colonnes » entre « Initiales » et « Copier » dans l'ordre de tabulation | D-216 (3) | gantt-colonnes-2 | e2e/tests/lot3f2.spec.ts |
| E2E-209-r2 | E2E-209-r1 : deux appuis de Tab d'« Initiales » à « Copier » (« Colonnes » entre les deux) | D-216 (3) | gantt-colonnes-2 | e2e/tests/lot3f2-captures.spec.ts |

### Couverture des champs, gantt-colonnes-2

Aucun champ d'API créé ni modifié : colonnes affichées, largeurs des colonnes et largeur du tableau sont gardées dans le stockage du navigateur (D-212 (5)), réglées par le menu « Colonnes », les poignées de largeur et le séparateur de chaque vue. Les colonnes ajoutées à l'Accueil lisent des champs existants de GET …/gantt (D-216 (6)). E2E-547-r1 (rouge intermittent, `aria-valuenow` périmé un instant après le dépliage) est le test rouge de la correction 42112bc.

## Retouches REX-6 (D-218)

Fichier : `e2e/tests/retouches-rex6.spec.ts`, inscrit aux domaines accueil, gantt, projets, vue-ressource, captures et feuille-de-temps (e2e/domaines.json). Données par l'API. Valeurs attendues recopiées de D-218 et de SPEC §6 « Retouches REX-6 ».

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-558 | « Nouveau modèle » : date de début préremplie à la date du jour du navigateur (2027-01-06, horloge fixée), obligatoire, aide « Date de référence : … » sous le champ ; création par l'écran : `date_debut` enregistrée | D-218 (1) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-559 | Onglet Planning, « Nouvelle dépendance » : options « Fin → début (FD) », « Début → début (DD) », « Fin → fin (FF) » ; aide selon le type (`aria-describedby`) ; création en FF : code `FF` en base | D-218 (2) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-560 | Onglet Planning, tableau des dépendances (libellés des trois types) et dialogue « Modifier la dépendance » (liste, aide) | D-218 (2) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-561 | Gantt, dialogue d'un lien : libellés et aide selon le type | D-218 (2) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-562 | « Modifier l'activité » avant tout calcul : « Début planifié » et « Fin planifiée » en texte (« — »), aucun champ, placés après « Fin validée » | D-218 (3) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-563 | « Modifier l'activité » avant puis après « Calculer » par l'écran : « — », puis 11/01/2027 et 15/01/2027 | D-218 (3) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-564 | Accueil sans paramètre : projet déplié, activité et initiales « AL » visibles, case cochée ; décocher : `initiales=0`, gardé au rechargement ; « Tout replier » puis « Tout déplier » | D-218 (4) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-565 | Gantt d'un projet inchangé : « Initiales » décochée par défaut, cochée : `initiales=1` | D-218 (4) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-566 | Mes tâches d'une ressource : aucune section « Mon calendrier », aucune requête vers /api/calendriers | D-218 (5) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-567 | Logo : lien « PlanerSource » vers « / » ; clic depuis une fiche projet : Accueil | D-218 (6) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-568 | Logo depuis la Feuille de temps avec une saisie : confirmation (D-172) ; « Annuler » reste, « Abandonner » : /mes-taches ; aucune écriture, aucune feuille en base | D-218 (6), D-172 | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-569 | Accueil, toutes les colonnes cochées : en-têtes et menu dans l'ordre Code, Nom, Début, Fin, Charge, Avancement, Réel, Vendu, Marge, Drapeaux | D-218 (7) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-570 | Poignée « Largeur de la colonne Nom » : glisser +40 puis retour avant le relâchement : `aria-valuenow`, largeur de l'en-tête et valeur enregistrée inchangés, au défaut puis après une flèche | D-218 (8) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-571 | Captures sans assertion de valeur : `e2e/captures/retouches-rex6-*.png` (Accueil 1440 et 1024 px, dialogues d'une activité et d'une dépendance) | D-218 | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |

### Couverture des champs, retouches-rex6

Aucun champ d'API créé ni modifié. Types de dépendance : champ `type` (codes FD, DD, FF inchangés) → liste « Type » des dialogues de dépendance et du lien du Gantt (E2E-559 à E2E-561). `date_debut` d'un modèle → champ « Date de début » (E2E-558). `debut_planifie` et `fin_planifiee` d'une activité : calculés, hors écran de saisie, affichés en lecture seule (E2E-562, E2E-563).

### Révisions et retraits de retouches-rex6 (D-218)

Décision du porteur (2026-11-24) : logo (nom accessible « PlanerSource »), E2E-570, E2E-172 et E2E-176. D-218 (9), sans décision préalable : départ replié, ordre des colonnes de l'Accueil. Intention et valeurs attendues inchangées, sauf mention.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-558-r1, E2E-570-r1, E2E-570-r2 | E2E-558 : lecture des modèles par le contexte de la page ; E2E-570 : colonne « Début » (Nom : minimum 120 px), valeur lue sous l'identifiant `debut` | D-031 | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-567-r1, E2E-568-r1 | Logo : nom accessible « PlanerSource » | D-218 (6) | retouches-rex6 | e2e/tests/retouches-rex6.spec.ts |
| E2E-172-r1, E2E-176-r1 | Cellule du type dans le tableau des dépendances : « Fin → début (FD) », « Début → début (DD) » | D-218 (2) | retouches-rex6 | e2e/tests/lot3e.spec.ts |
| E2E-86-r1, E2E-90-r1, E2E-91-r2, E2E-92-r8 | Départ replié (« Tout replier ») | D-218 (4), (9) | retouches-rex6 | e2e/tests/accueil-g2.spec.ts |
| E2E-93-r3, E2E-94-r1 à E2E-99-r1, E2E-100-r6 | Idem ; E2E-94-r1 : un appel à /gantt au chargement (0 avant) ; E2E-99-r1 : premier chargement refusé (500) pour une plage initiale étroite | D-218 (4), (9) | retouches-rex6 | e2e/tests/accueil-g3.spec.ts |
| E2E-101-r1 | Idem (captures) | D-218 (4), (9) | retouches-rex6 | e2e/tests/accueil-g3-captures.spec.ts |
| E2E-103-r1, E2E-108-r1, E2E-109-r5, E2E-110-r2 | Idem ; E2E-103-r1 : projet B lu une fois (chargement) ; E2E-108-r1 : lecture de B refusée (500) | D-218 (4), (9) | retouches-rex6 | e2e/tests/accueil-g4.spec.ts |
| E2E-522-r1, E2E-525-r1, E2E-528-r1, E2E-531-r1, E2E-534-r1, E2E-538-r1 | Accueil déjà déplié | D-218 (4), (9) | retouches-rex6 | e2e/tests/gantt-colonnes.spec.ts, gantt-colonnes-captures.spec.ts |
| E2E-540-r2, E2E-542-r2 | Clic hors du menu hors du coin haut gauche (logo) | D-218 (6) | retouches-rex6 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-541-r3, E2E-544-r2, E2E-547-r2, E2E-550-r2, E2E-553-r2, E2E-556-r2, E2E-557-r2 | Accueil déplié ; ordre des colonnes (menu et en-têtes) | D-218 (4), (7), (9) | retouches-rex6 | e2e/tests/gantt-colonnes-2.spec.ts, gantt-colonnes-2-captures.spec.ts |
| E2E-129-r1 | Initiales cochées par défaut sur l'Accueil, `initiales=0` | D-218 (4), (9) | retouches-rex6 | e2e/tests/lot3d1.spec.ts |
| E2E-155-r2, E2E-195-r2, E2E-273-r1, E2E-276-r2, E2E-278-r1, E2E-281-r1, E2E-282-r1, E2E-283-r1, E2E-288-r1, E2E-290-r1, E2E-367-r1, E2E-377-r2, E2E-482-r1 | Accueil déjà déplié (le bouton « Replier » remplace le clic sur « Déplier ») | D-218 (4), (9) | retouches-rex6 | e2e/tests/lot3d3b, lot3f2, rex3b-*, lot6c, lot6e, recette-auto-chefa |
| GCO-6-r1, GCO-7-r1 | Ordre des colonnes de l'Accueil | D-218 (7), (9) | retouches-rex6 | packages/web/test/gantt-disposition.test.ts |

Retraits (D-218 (5), (9)) : E2E-396, E2E-397, E2E-398, E2E-399 (section « Mon calendrier », `e2e/tests/rex5.spec.ts`).


## Charge lisible (D-220)

Fichiers : `e2e/tests/charge-lisible.spec.ts` (domaines projets, gantt, dialogues, e2e/domaines.json) et `packages/web/test/charge-lisible.test.ts`. Données par l'API ; valeurs attendues recopiées de SPEC §6 « Charge lisible » et de D-220. Marge = charge vendue − charge assignée (SPEC §3, charge vendue et date client).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-572 | « Modifier l'activité », 8 modes × 3 champs : « Début validé », « Fin validée » et « Durée validée (jours ouvrés) » présents ou absents selon le mode (tableau de SPEC §6 « Charge lisible » 1) ; activité créée par l'API, dialogue ouvert depuis l'onglet Planning | D-220 (3) | charge-lisible | e2e/tests/charge-lisible.spec.ts |
| E2E-573 | « Nouvelle activité », 8 modes × 3 champs : « Mode de planification » (ASAP par défaut), mêmes champs selon le mode ; création par l'écran en FDUR, durée par défaut de l'API lue en base (1) ; création en MAN : mode enregistré, dates et durée nulles | D-220 (4) | charge-lisible | e2e/tests/charge-lisible.spec.ts |
| E2E-574 | Aide de la durée « Utilisée seulement sans ressource assignée : longueur de la barre. » (`aria-describedby`) pour ASAP, START, STARR, ALAP ; absente pour FDUR et DDUR ; en modification et en création | D-220 (3) | charge-lisible | e2e/tests/charge-lisible.spec.ts |
| E2E-575 | Changement de mode dans le dialogue : les champs apparaissent et disparaissent à chaque changement (ASAP → REGUL → ALAP → MAN → FDUR), en modification et en création | D-220 (3) | charge-lisible | e2e/tests/charge-lisible.spec.ts |
| E2E-576 | Activité REGUL avec début et fin validés, passée en ASAP par l'écran et enregistrée : la requête n'envoie ni début ni fin, dates validées gardées en base (lecture API) ; retour en REGUL : champs préremplis des mêmes dates | D-220 (3) | charge-lisible | e2e/tests/charge-lisible.spec.ts |
| E2E-577 | Garde de fermeture (D-188) : valeur saisie dans un champ puis masquée par un retour au mode d'ouverture : fermeture sans confirmation, rien en base ; champ visible modifié : confirmation, rien en base si « Abandonner » | D-220 (3) | charge-lisible | e2e/tests/charge-lisible.spec.ts |
| E2E-578 | « Charge assignée (somme des ressources) » : texte, aucun champ, « 0 j » sans assignation ; après ajout d'une assignation de 2,5 j puis d'une de 1 j par l'écran, réouverture du dialogue : « 3,5 j » ; après suppression de l'une : « 1 j » | D-220 (3) | charge-lisible | e2e/tests/charge-lisible.spec.ts |
| E2E-579 | « Marge » en lecture seule : positive (charge vendue 5, assignée 3 : « 2 j », pas de couleur flag), négative (vendue 1, assignée 3 : « −2 j », couleur flag), « — » sans charge vendue ; aucun champ ; enregistrement sans effet sur `charge_vendue` en base | D-220 (3) | charge-lisible | e2e/tests/charge-lisible.spec.ts |
| E2E-580 | Utilisateur sans droit d'écriture sur le projet : aucun bouton « Modifier l'activité » ni double-clic qui ouvre le dialogue ; `charge_assignee` et `marge` absents de la réponse de GET /api/projets/:id/activites | D-220 (3), (6) | charge-lisible | e2e/tests/charge-lisible.spec.ts |
| E2E-581 | Aide « Plafond par jour sur cette activité : taux × capacité de la ressource. » sous « Taux (%) » (`aria-describedby`) des dialogues « Assigner » et « Modifier l'assignation » (onglet Planning) | D-220 (3) | charge-lisible | e2e/tests/charge-lisible.spec.ts |
| E2E-582 | Aide « Plafond par semaine sur ce projet : taux × capacité × jours ouvrés. » sous « Taux (%) » de l'affectation au projet, en création et en modification (onglet Affectations) | D-220 (3) | charge-lisible | e2e/tests/charge-lisible.spec.ts |
| E2E-583 | Captures sans assertion de valeur : `e2e/captures/charge-lisible-*.png` (dialogue d'une activité REGUL et ASAP, charge assignée et marge ; aide des taux) à 1440 et 1024 px | D-220 | charge-lisible | e2e/tests/charge-lisible.spec.ts |
| CHL-1 | `champsDuMode` : table mode → champs (début, fin, durée) pour les 8 modes ; mode inconnu : aucun champ | D-220 (3) | charge-lisible | packages/web/test/charge-lisible.test.ts |
| CHL-2 | `texteChargeAssignee` : « X j » à virgule décimale (3,5 → « 3,5 j », 0 → « 0 j », 1 → « 1 j ») ; `texteMarge` : null → « — », négatif → texte et indicateur flag | D-220 (3) | charge-lisible | packages/web/test/charge-lisible.test.ts |
| CHA-1 | GET …/activites : `charge_assignee` = somme des charges assignées pour l'administrateur (0 sans assignation) ; clé absente (pas null) pour le chef lecteur, `marge` aussi | D-220 (6) | charge-lisible | packages/api/test/charge-lisible.test.ts |
| CHA-2 | POST et PATCH d'une activité par l'administrateur : `charge_assignee` présent | D-220 (6) | charge-lisible | packages/api/test/charge-lisible.test.ts |
| CHA-3 | PATCH par le chef lecteur refusé : rien de modifié, aucune divulgation de `charge_assignee` | D-220 (6) | charge-lisible | packages/api/test/charge-lisible.test.ts |

### Couverture des champs, charge-lisible

- Champs modifiables de l'API d'une activité, visibles selon le mode : `debut_valide` → « Début validé » (START, STARR, FDUR, DDUR, REGUL) ; `fin_valide` → « Fin validée » (ALAP, REGUL) ; `duree_validee` → « Durée validée (j) » (libellé « (jours ouvrés) » avant retours-deploiement-2, D-235) (ASAP, START, STARR, ALAP, FDUR, DDUR) ; aucun des trois en MAN. Création et modification : E2E-572 à E2E-577. Un champ masqué n'est pas envoyé et garde sa valeur en base (E2E-576).
- `mode` à la création → « Mode de planification » du dialogue « Nouvelle activité » (E2E-573).
- Lecture seule, hors champ d'API modifiable : `charge_assignee` (somme ; champ calculé à la lecture, hors saisie, clé absente sans droit d'écriture : CHA-1 à CHA-3) → « Charge assignée (somme des ressources) » (E2E-578) ; `marge` → « Marge » (E2E-579) ; absents sans droit d'écriture (E2E-580).
- `taux` d'une assignation et d'une affectation : champs existants, aides ajoutées (E2E-581, E2E-582).

### Révisions D-031 de charge-lisible (D-220 (5), tag `tests-charge-lisible-r1`)

Sans décision préalable (D-220 (5)) ; intention et valeurs attendues inchangées, sauf mention.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-365-r1 | Lecture de chaque corps de réponse /gantt et /planning dès la réponse, avant toute navigation ; intention et valeurs inchangées | D-221 | charge-lisible | e2e/tests/lot6c.spec.ts |
| E2E-199-r1, E2E-200-r1, E2E-201-r1, E2E-203-r3 | Corps exact du POST de création d'une activité : `mode: 'ASAP'` ajouté (le dialogue envoie le mode, D-220 (4)) ; les corps de jalons sont inchangés | D-220 (4), (5) | charge-lisible | e2e/tests/lot3f2.spec.ts |
| E2E-562-r1 | Repère de position : « Début validé » au lieu de « Fin validée » (masquée en START) ; les dates planifiées restent après les champs de dates validées | D-220 (5) | charge-lisible | e2e/tests/retouches-rex6.spec.ts |

E2E-365 : corps lus après une navigation (échec sous charge, passes ciblée et complète) ; révisé en E2E-365-r1 sur décision du porteur (D-031, D-221), tag `tests-lot6c-r11`.


## Saisie des activités (D-222)

Fichiers : `e2e/tests/saisie-activites.spec.ts` (domaines projets, gantt, dialogues, e2e/domaines.json) et `packages/web/test/saisie-activites.test.ts`. Données par l'API ; valeurs attendues recopiées de SPEC §6 « Saisie des activités » et de D-222. Colonne « Règle » : numéro de la règle de SPEC §6.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-584 | « Nouvelle activité » : « Activité parente » liste « Aucune (racine) » puis les activités du projet en ordre WBS « <WBS> <nom> » ; choix d'un parent à la création par l'écran : `parent_id` relu par l'API, élément placé en dernier de sa fratrie, WBS lu dans le tableau | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-585 | « Nouveau jalon » : même liste ; parent choisi à la création par l'écran : `parent_id` du jalon relu par l'API, dernier de sa fratrie, WBS lu dans le tableau | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-586 | « Ajouter une sous-activité » (Planning) : « Activité parente » préremplie avec l'activité ; création : `parent_id` relu par l'API | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-587 | « Modifier l'activité » : la liste « Activité parente » exclut l'activité et ses descendants (à tous les niveaux) ; « Modifier le jalon » : liste complète des activités du projet ; parent actuel présélectionné | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-588 | Parent changé en modification d'une activité : POST /api/elements/:id/deplacer puis PATCH (ordre des requêtes lu), WBS dans le tableau de l'onglet Planning et dans le tableau du Gantt, lignes du Gantt à jour, `parent_id` et position (dernier de la nouvelle fratrie) relus par l'API | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-589 | Retour à « Aucune (racine) » en modification d'une activité puis d'un jalon : `parent_id` null, élément en dernier de la fratrie racine, WBS à jour | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-590 | Parent inchangé en modification : aucun appel à /deplacer ; seul le PATCH part | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-591 | Refus `parent_assigne` (parent choisi portant une assignation) : texte « Une activité avec des ressources assignées ne peut pas avoir d’enfant. » en `role="alert"` dans le dialogue, dialogue ouvert, rien enregistré (nom saisi non écrit) ; `parent_id`, position et historique relus par l'API inchangés | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-592 | Refus `dependance_hierarchie` (déplacement sous un élément lié par dépendance) : texte du glisser de ligne en `role="alert"`, dialogue ouvert, base inchangée (parent, position, nom, historique) | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-593 | PATCH refusé après un déplacement réussi (422 simulé par interception du PATCH) : message qui dit que le déplacement est fait et que les champs ne sont pas enregistrés, dialogue ouvert ; `parent_id` relu par l'API = nouveau parent, nom inchangé | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-594 | Déplacement d'un jalon par « Modifier le jalon » : parent changé, WBS à jour ; refus `dependance_hierarchie` : alerte dans le dialogue, base inchangée | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-595 | Prédécesseur ajouté depuis « Modifier l'activité » (élément, type DD, délai 2) : enregistré tout de suite (dépendance relue par l'API alors que le dialogue est ouvert), section Dépendances du bas à jour après la fermeture, lien dans le Gantt | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-596 | Successeur ajouté depuis « Modifier l'activité » (type FF, délai −1) : mêmes effets | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-597 | Type et délai d'une dépendance modifiés depuis le dialogue (prédécesseur puis successeur) : enregistrés tout de suite, section du bas et Gantt à jour | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-598 | Dépendance supprimée depuis le dialogue, avec confirmation (« Annuler » : rien supprimé ; confirmer : supprimée), prédécesseur puis successeur : absente de la section du bas et du Gantt | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-599 | Libellés « Fin → début (FD) », « Début → début (DD) », « Fin → fin (FF) » et aides identiques à celles de l'onglet Planning, dans les deux sous-sections | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-600 | Éléments proposés : activités et jalons du projet, sans l'activité, ses ancêtres ni ses descendants ; activité parente : mêmes règles ; élément d'un autre projet jamais proposé | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-601 | Refus de cycle depuis le dialogue : `role="alert"`, liste inchangée, dialogue ouvert ; dépendances et historique relus par l'API inchangés. Refus de doublon : idem | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-602 | Garde D-188 : un ajout de dépendance saisi mais non envoyé compte comme modification : fermeture avec confirmation, rien en base si « Abandonner » ; sans saisie, fermeture sans confirmation | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-603 | Pas de sous-section de dépendances dans « Nouvelle activité » ni dans « Modifier le jalon » ; « Activité parente » présente dans les deux | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-604 | Activité parente : « Mode de planification », « Début validé », « Fin validée » et « Durée validée » absents du dialogue, « Début planifié » et « Fin planifiée » en lecture seule ; enregistrement d'un nom : le PATCH n'envoie aucun des quatre champs ; mode et dates validées relus par l'API inchangés. Feuille : champs présents | §6 Saisie des activités, règle 3 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-605 | Parcours complet étendu (base à l'administrateur seul, tout à l'écran) : sous-activité créée par le champ « Activité parente », puis dépendance ajoutée par le dialogue ; effets dans l'onglet Planning et dans le Gantt | §6 Saisie des activités, règle 1, 2 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| E2E-606 | Captures sans assertion de valeur : `e2e/captures/saisie-activites-*.png` (dialogue d'une activité avec parent et sous-sections de dépendances ; dialogue d'une activité parente) à 1440 et 1024 px | §6 Saisie des activités, règle 1, 2, 3 ; D-222 | saisie-activites | e2e/tests/saisie-activites.spec.ts |
| SAA-1 | `optionsParent(elements, id)` : « Aucune (racine) » d'abord, activités en ordre WBS, libellé « <WBS> <nom> », sans l'élément ni ses descendants, jalons exclus | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | packages/web/test/saisie-activites.test.ts |
| SAA-2 | `parentChange` : vrai si le parent diffère de l'initial, faux sinon ; racine = null | §6 Saisie des activités, règle 1 ; D-222 | saisie-activites | packages/web/test/saisie-activites.test.ts |
| SAA-3 | `candidatsDependance(elements, id)` : activités et jalons, sauf l'activité, ses ancêtres et ses descendants | §6 Saisie des activités, règle 2 ; D-222 | saisie-activites | packages/web/test/saisie-activites.test.ts |
| SAA-4 | `champsActivite(mode, estParent)`, activité parente : aucun des trois champs de dates ni le mode ; feuille inchangée | §6 Saisie des activités, règle 3 ; D-222 | saisie-activites | packages/web/test/saisie-activites.test.ts |

### Couverture des champs, saisie-activites

- `parent_id` (POST /api/projets/:id/activites et /jalons) → « Activité parente » des dialogues « Nouvelle activité » et « Nouveau jalon » (E2E-584, E2E-585), préremplie par « Ajouter une sous-activité » (E2E-586).
- `parent_id` à la modification (POST /api/elements/:id/deplacer, dernier de la nouvelle fratrie ; le PATCH d'activité et de jalon n'accepte pas `parent_id`) → « Activité parente » des dialogues « Modifier l'activité » et « Modifier le jalon » (E2E-588, E2E-589, E2E-594) ; écran consommateur : WBS du tableau du Planning et du Gantt.
- `rang` du déplacement : hors écran (toujours « dernier » depuis le dialogue ; le rang fin reste au glisser de ligne et à « Monter » et « Descendre »).
- Dépendance (POST /api/projets/:id/dependances, PATCH et DELETE /api/dependances/:id) : `predecesseur_id`, `successeur_id`, `type`, `delai` → sous-sections « Prédécesseurs » et « Successeurs » du dialogue « Modifier l'activité » (E2E-595 à E2E-598) ; écran consommateur : section Dépendances du bas, liens du Gantt.
- `mode`, `debut_valide`, `fin_valide`, `duree_validee` d'une activité parente : masqués, non envoyés (E2E-604).

### Révision D-031 de saisie-activites (D-224, tag `tests-lot6c-r12`)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| E2E-365-r2 | Corps /gantt et /planning lus par `page.route` (`route.fetch()`, lecture du corps, `route.fulfill`) au lieu de `page.on('response')` ; au moins 2 corps lus, aucun ne contient les clés ; intention et assertions inchangées | D-224 | saisie-activites | e2e/tests/lot6c.spec.ts |

E2E-365-r1 : `r.text()` échouait (« Response body is not available for a response that was navigated away from », 7 passes isolées sur 10) ; révisé en E2E-365-r2 sur décision du porteur.

## Coûts, tranche 1 : taux journalier et OTP (D-225, sous-lot couts-1)

Fichiers : `packages/api/test/couts-taux.test.ts` (TJ-1 à TJ-10), `packages/api/test/couts-otp.test.ts` (OTP-1 à OTP-10), `packages/web/test/couts-1.test.ts` (TJ-11, TJ-12, OTP-11), `e2e/tests/couts-1.spec.ts` (E2E-607 à E2E-622 ; domaines utilisateurs-equipes-calendriers, projets, dialogues, e2e/domaines.json). Valeurs attendues recopiées de SPEC §12.1, §12.2, §11.2 et de D-225. Tout test de refus relit la base (taux, utilisateur, projet, activité, historique) et la compare à l'état d'avant.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| TJ-1 | Administrateur : POST /api/utilisateurs/:id/taux sur une ressource (période fermée, puis période ouverte `fin` absente) → 201 { id, utilisateur_id, debut, fin, montant } ; GET → liste triée par `debut` ; utilisateur sans taux : liste vide | §12.1 points 1, 2, 6 ; D-225 (A) | couts-1 | packages/api/test/couts-taux.test.ts |
| TJ-2 | POST sur un utilisateur non ressource : 422 { erreur: 'Seule une ressource a un taux journalier' }, base inchangée | §12.1 point 1 | couts-1 | packages/api/test/couts-taux.test.ts |
| TJ-3 | Corps invalides, 400, base inchangée : `debut` absent ou mal formé, `montant` 0, négatif, 1000000, 600.001, 1.0000000001, chaîne ; clé inconnue ; PATCH : montant 0, 1000000, 600.001, `debut` null ou mal formé, clé inconnue, `utilisateur_id`. `fin` antérieure à `debut` : 422 { erreur: 'La date de fin précède la date de début' } (POST et PATCH), base inchangée | §12.1 point 2 | couts-1 | packages/api/test/couts-taux.test.ts |
| TJ-4 | Chevauchement, bornes comprises : [01/01, 10/01] puis [10/01, 20/01] → 409 { erreur: 'Période de taux qui chevauche une autre', code: 'taux_chevauchement' } ; période ouverte puis période postérieure → 409 ; période qui en englobe une autre → 409 ; PATCH qui crée un chevauchement → 409 ; base inchangée à chaque refus. Trou permis : [01/01, 10/01] puis [11/01, ouverte] → 201. PATCH d'une période sur elle-même (montant seul) → 200 | §12.1 point 3 | couts-1 | packages/api/test/couts-taux.test.ts |
| TJ-5 | Deux POST concurrents qui se chevauchent sur la même ressource : un 201 et un 409, une seule période en base (verrou de la ligne utilisateur) | §12.1 point 3 | couts-1 | packages/api/test/couts-taux.test.ts |
| TJ-6 | PATCH (debut, fin, montant) → 200 ; DELETE → 204, absent du GET ; historique `GET /api/historique?entite=taux` : création, une modification par champ changé (valeur inchangée non historisée), suppression ; `projet_id` nul | §12.1 points 5, 6 ; §3 | couts-1 | packages/api/test/couts-taux.test.ts |
| TJ-7 | Droits en lecture : chef de projet qui écrit sur un projet où la ressource est affectée → 200 ; ressource affectée seulement à un projet qu'il lit sans écrire → 403 ; ressource non affectée → 403 ; rôle ressource (y compris ses propres taux) → 403 ; utilisateur inconnu, id mal formé, id hors plage → 404 ; sans session → 401 | §12.1 point 7 | couts-1 | packages/api/test/couts-taux.test.ts |
| TJ-8 | Droits en écriture : chef de projet (même avec lecture permise) et rôle ressource → 403 sur POST, PATCH, DELETE ; taux inconnu → 404 (administrateur) ; ordre : 403 avant 404 avant 400 ; base inchangée à chaque refus | §12.1 point 7 | couts-1 | packages/api/test/couts-taux.test.ts |
| TJ-9 | PATCH /api/utilisateurs/:id `est_ressource: false` sur un utilisateur qui a un taux : 409 { erreur: 'Utilisateur avec des taux : il reste ressource' }, base inchangée ; après suppression du taux : 200 | §12.1 point 8 ; D-225 (F) (1) | couts-1 | packages/api/test/couts-taux.test.ts |
| TJ-10 | `chevauche(periodes, candidate, exclureId?)` (fonction pure) : bornes comprises, période ouverte, période exclue en modification, trous | §12.1 point 3 | couts-1 | packages/api/test/couts-taux.test.ts |
| TJ-11 | Web, `tauxEnVigueur(periodes, date)` : début ≤ d ≤ fin, fin vide, hors période → null, trou → null | §12.1 point 4 | couts-1 | packages/web/test/couts-1.test.ts |
| TJ-12 | Web, `formatMontant(n)` : « 600,00 € », « 1 234,50 € » (espace insécable U+00A0 pour les milliers et avant « € »), « 999 999,99 € » ; `analyserMontant(texte)` (nombre ou null) : virgule ou point, > 0, au plus 999999,99, 2 décimales, chiffre de chaque côté du séparateur | §12.1 points 2, 9 | couts-1 | packages/web/test/couts-1.test.ts |
| OTP-1 | Projet : POST et PATCH avec `otp` « ␣OTP-1␣ » → « OTP-1 » relu ; « » et « ␣␣ » et null → null ; 50 caractères accepté ; 51 → 400, base inchangée ; même valeur sur deux projets permise ; modèle : idem | §12.2 points 1, 5 | couts-1 | packages/api/test/couts-otp.test.ts |
| OTP-2 | Activité : POST et PATCH, mêmes règles ; jalon : POST et PATCH avec la clé `otp` → 400, base inchangée | §12.2 point 1 | couts-1 | packages/api/test/couts-otp.test.ts |
| OTP-3 | Héritage dans un projet : activité sans valeur sous une activité parente avec valeur → `otp_effectif` du parent, `otp_source` { type: 'activite', id, libelle: '<WBS> <nom>' } ; sans valeur sur les activités → valeur du projet, source { type: 'projet', id, libelle: code } ; valeur propre → `otp_source` null ; aucune valeur → `otp_effectif` null, `otp_source` null | §12.2 points 2, 3 | couts-1 | packages/api/test/couts-otp.test.ts |
| OTP-4 | Héritage entre projets : sous-projet et ses activités sans valeur → valeur du projet parent (à deux niveaux) ; valeur propre du sous-projet prioritaire ; lu dans GET /api/projets, GET /api/projets/:id, GET /api/projets/:id/activites, réponses de POST et PATCH ; GET /api/modeles porte les trois clés | §12.2 points 2, 3 | couts-1 | packages/api/test/couts-otp.test.ts |
| OTP-5 | Ancêtre illisible : chef d'un sous-projet seulement, OTP sur le projet parent qu'il ne lit pas → `otp_effectif` = valeur, `otp_source` = { type: 'projet', id: null, libelle: null } ; aucun `otp_source` ne porte l'id du parent et le corps JSON (projet et activités) ne contient pas son code ; `parent_id` reste renvoyé (D-079, décision du porteur, D-226) ; l'administrateur lit la source complète | §12.2 point 4 ; D-225 (F) (2) | couts-1 | packages/api/test/couts-otp.test.ts |
| OTP-6 | Historique : modification de `otp` (projet, activité) historisée (ancienne et nouvelle valeur) ; valeur inchangée non historisée ; création avec `otp` dans l'objet complet | §12.2 point 5 ; §3 | couts-1 | packages/api/test/couts-otp.test.ts |
| OTP-7 | Droits : chef de projet en lecture seule, PATCH `otp` d'un projet et d'une activité → 403, base inchangée ; rôle ressource : 404 | §12.2 point 5 ; §2 | couts-1 | packages/api/test/couts-otp.test.ts |
| OTP-8 | Copie (§11.2) : OTP propre du projet, d'un sous-projet et des activités copié ; élément sans valeur propre : `otp` null dans la copie (l'héritage reste calculé) ; « Créer depuis un modèle » et « Enregistrer comme modèle » : OTP propre copié | §11.2 ; §12.2 point 8 | couts-1 | packages/api/test/couts-otp.test.ts |
| OTP-9 | `otpHerite(chaine)` (fonction pure) : ancêtre le plus proche avec valeur, valeur propre prioritaire, source marquée illisible si l'ancêtre n'est pas lisible | §12.2 points 2, 4 | couts-1 | packages/api/test/couts-otp.test.ts |
| OTP-10 | Témoin : calcul du planning inchangé avec et sans OTP (même travail planifié) | §12.2 ; moteur inchangé | couts-1 | packages/api/test/couts-otp.test.ts |
| OTP-11 | Web, `aideOtp(element)` : « Hérité de <code> : <valeur> », « Hérité de <WBS> <nom> : <valeur> », « Hérité d'un projet parent : <valeur> », rien si valeur propre ou aucune ; `heriteDe(parent, type, libelle)` (aide à la création : valeur propre du parent avec sa source, sinon son héritage) ; `otpSaisi(texte)` (espaces retirés, vide = null) | §12.2 point 7 | couts-1 | packages/web/test/couts-1.test.ts |
| E2E-607 | Dialogue « Modifier <nom> » d'une ressource : section « Taux journaliers », aide « Facultatif. Sert au calcul des coûts. » ; ajout d'un taux fermé puis d'un taux ouvert par l'écran : enregistré tout de suite (relu par l'API, dialogue ouvert), lignes Du, Au (« — » si ouverte), Montant « 600,00 € » et « 1 234,50 € » (espace insécable) | §12.1 point 9 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-608 | Modification d'un taux par l'écran (fin et montant) : relu par l'API, ligne à jour | §12.1 point 9 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-609 | Suppression d'un taux par l'écran, avec confirmation (« Annuler » : rien supprimé ; confirmer : absent de l'API et de la liste) | §12.1 point 9 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-610 | Refus de chevauchement par l'écran : « Cette période chevauche un autre taux. » en `role="alert"` dans le dialogue, dialogue ouvert, liste inchangée, base inchangée (taux et historique) ; fin antérieure : « La date de fin précède la date de début. » ; montant invalide : `aria-invalid`, « Montant invalide. », bouton désactivé | §12.1 points 2, 3, 9 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-611 | Section absente pour un utilisateur non ressource et dans « Nouvel utilisateur » ; décocher « Ressource planifiable » d'un utilisateur qui a un taux : « Cet utilisateur a des taux journaliers : il reste ressource. », dialogue ouvert, base inchangée ; garde D-188 : un ajout saisi non envoyé déclenche la confirmation de fermeture | §12.1 points 8, 9 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-612 | Onglet Affectations (horloge du navigateur figée) : colonne « Taux du jour » = taux en vigueur à la date du jour (« 600,00 € »), « — » pour une ressource sans taux ou hors période ; chef de projet qui écrit : colonne présente et valeurs lues ; chef en lecture seule : colonne absente | §12.1 points 4, 10 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-613 | OTP propre d'un projet saisi par l'écran à la création (« Nouveau projet »), puis modifié par « Modifier le projet » : `otp` relu par l'API, valeur affichée à la réouverture ; champ limité à 50 caractères ; vidé → null | §12.2 points 1, 7 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-614 | OTP hérité : dialogue « Modifier l'activité » d'une activité sans valeur, projet avec OTP : aide « Hérité de <code> : <valeur> » ; sous-activité sous une activité avec OTP : « Hérité de <WBS> <nom> : <valeur> » ; « Nouvelle activité » : aide de la valeur effective du parent choisi | §12.2 points 2, 7 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-615 | OTP propre qui prime : saisi par l'écran sur l'activité héritière, aide absente à la réouverture ; API : `otp` et `otp_effectif` = valeur propre, `otp_source` null ; sous-activité : aide « Hérité de <WBS> <nom> » de cette activité | §12.2 points 2, 7 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-616 | Chef d'un sous-projet seulement, projet parent illisible avec OTP : dialogue « Modifier le projet » du sous-projet : aide « Hérité d'un projet parent : <valeur> », ni code ni nom du parent dans le dialogue | §12.2 points 4, 7 ; D-225 (F) (2) | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-617 | Copie de projet par l'écran (dialogue « Copier ») : l'OTP propre du projet et d'une activité est relu dans les dialogues de la copie et par l'API | §11.2 ; §12.2 point 8 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-618 | Parcours complet étendu (base à l'administrateur seul, tout à l'écran) : création d'une ressource, taux journalier saisi dans son dialogue, projet avec OTP, affectation : « Taux du jour » lu dans l'onglet Affectations, aide d'héritage lue dans le dialogue d'une activité | §12.1, §12.2 ; CLAUDE.md « Parcours IHM » | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-619 | OTP d'un modèle saisi par l'écran (« Modifier » de l'écran Modèles) ; « Créer un projet depuis » ce modèle : OTP propre relu sur le projet créé | §11.3 ; §12.2 points 1, 8 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-620 | Captures sans assertion de valeur : `e2e/captures/couts-1-*.png` (section « Taux journaliers » ; onglet Affectations avec « Taux du jour » ; dialogue d'activité avec aide d'héritage) à 1440 et 1024 px | §12.1, §12.2 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-621 | « Nouveau modèle » avec un OTP saisi à l'écran (espaces de bord retirés) : `otp` relu par l'API, valeur affichée dans « Modifier le projet » du modèle ; champ limité à 50 caractères | §12.2 points 1, 7 | couts-1 | e2e/tests/couts-1.spec.ts |
| E2E-622 | « Nouvelle activité » avec un OTP saisi à l'écran : `otp`, `otp_effectif` relus par l'API, `otp_source` null, pas d'aide d'héritage ; sous-activité : aide « Hérité de <WBS> <nom> : <valeur> » (ajouté après @reviewer) | §12.2 points 1, 2, 7 | couts-1 | e2e/tests/couts-1.spec.ts |

### Couverture des champs, couts-1

- Taux (POST /api/utilisateurs/:id/taux) : `debut`, `fin`, `montant` → champs Du, Au, Montant de la section « Taux journaliers » du dialogue « Modifier <nom> » (E2E-607, E2E-618) ; écrans consommateurs : liste de la section, colonne « Taux du jour » de l'onglet Affectations (E2E-612, E2E-618).
- Taux (PATCH /api/taux/:id) : `debut`, `fin`, `montant` → champs Du, Au, Montant du dialogue « Modifier le taux », ouvert par le bouton de ligne « Modifier le taux du <date> » (E2E-608 : `fin` et `montant` ; `debut` par le même composant `ChampsPeriode` que l'ajout, E2E-607).
- Taux (DELETE /api/taux/:id) → bouton de ligne « Supprimer le taux du <date> » (E2E-609).
- `otp` du projet (POST /api/projets, PATCH /api/projets/:id) → champ « OTP » de « Nouveau projet » et « Modifier le projet » (E2E-613) ; écran consommateur : aide d'héritage des dialogues d'activité (E2E-614, E2E-618).
- `otp` du modèle (PATCH /api/projets/:id d'un modèle) → champ « OTP » du dialogue « Modifier le projet » ouvert depuis l'écran Modèles (E2E-619) ; écran consommateur : projet créé depuis le modèle (E2E-619). POST /api/modeles → champ « OTP » de « Nouveau modèle » (E2E-621) ; écran consommateur : « Modifier le projet » du modèle (E2E-621).
- `otp` de l'activité (POST /api/projets/:id/activites, PATCH /api/activites/:id) → champ « OTP » de « Nouvelle activité » (E2E-622) et de « Modifier l'activité » (E2E-615) ; écran consommateur : aide d'héritage de la sous-activité (E2E-615).
- `otp` dans la copie (POST de copie) : hors écran, aucun champ nouveau (l'OTP propre est copié sans saisie, E2E-617).

### Révision D-031 de couts-1 (D-226, tag `tests-lot6c-r13`)

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| MIG-10-r1 | Les versions appliquées après 013 sont lues dans le dossier des migrations (014 en tête, puis 015 et suivantes) au lieu de `[14]` seul ; `max(version)` = dernière version du dossier ; assertions sur `charge_vendue` et `date_client` inchangées | D-149 (2) ; D-226 | couts-1 | packages/api/test/lot6c-vendu.test.ts |

MIG-10 échouait seulement parce que la migration 015 s'applique aussi (`[14, 15]`) ; révisé sur décision du porteur.

## Retours du déploiement 1 (D-227, lot retours-deploiement-1)

Fichiers : `packages/api/test/cache-web.test.ts` (CAC-1 à CAC-5, dossier web factice), `e2e/tests/retours-deploiement-1.spec.ts` (E2E-623 à E2E-628 ; domaines gantt, accueil, vue-ressource, e2e/domaines.json). Valeurs attendues recopiées de D-227 et de SPEC §8 (Cache du navigateur), §6 (Colonnes et défilement, point 5).

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| CAC-1 | GET `/` : `Cache-Control: no-cache`, ETag présent, contenu d'`index.html` | §8 Cache du navigateur ; D-227 (A) | retours-deploiement-1 | packages/api/test/cache-web.test.ts |
| CAC-2 | GET `/projets/1` (repli des routes du front) : `Cache-Control: no-cache`, ETag présent, contenu d'`index.html` | §8 Cache du navigateur ; D-227 (A) | retours-deploiement-1 | packages/api/test/cache-web.test.ts |
| CAC-3 | GET `/assets/app.js` : `Cache-Control: public, max-age=31536000, immutable` | §8 Cache du navigateur ; D-227 (A) | retours-deploiement-1 | packages/api/test/cache-web.test.ts |
| CAC-4 | GET `/assets/absent.js` : 404 sans repli sur `index.html`, sans `immutable` dans `Cache-Control` | §8 ; D-140 (5) (b) ; D-227 (A) | retours-deploiement-1 | packages/api/test/cache-web.test.ts |
| CAC-5 | Réponse /api (GET /api/health, route /api inconnue) : sans `Cache-Control: no-cache` ni `immutable` posés par `servirWeb` | §8 ; D-227 (A) | retours-deploiement-1 | packages/api/test/cache-web.test.ts |
| E2E-623 | Défauts des trois vues sans stockage : Gantt d'un projet WBS, Nom, Début, Fin ; Accueil Code, Nom, Début, Fin ; planning d'une ressource Projet, Activité, Début, Fin ; menu « Colonnes » : autres colonnes décochées | §6 Colonnes point 5 ; D-227 (B) | retours-deploiement-1 | e2e/tests/retours-deploiement-1.spec.ts |
| E2E-624 | Gantt d'un projet : Drapeaux absente puis cochée par le menu (présente, fixée à droite) | §6 Colonnes point 5 ; D-227 (B) | retours-deploiement-1 | e2e/tests/retours-deploiement-1.spec.ts |
| E2E-625 | « Rétablir l'affichage par défaut » après un choix : retour aux nouveaux défauts (Gantt d'un projet) | §6 Colonnes point 5 ; D-227 (B) | retours-deploiement-1 | e2e/tests/retours-deploiement-1.spec.ts |
| E2E-626 | Mémorisation, Gantt d'un projet : choix retrouvé après navigation vers un autre écran puis retour (historique, puis adresse). Rechargement et autre projet : déjà prouvés par E2E-546-r2 | §6 Colonnes point 6 ; D-212 (5) ; D-227 (B) | retours-deploiement-1 | e2e/tests/retours-deploiement-1.spec.ts |
| E2E-627 | Mémorisation, Accueil : choix retrouvé après navigation vers un autre écran puis retour. Rechargement : E2E-547-r3 | §6 Colonnes point 6 ; D-227 (B) | retours-deploiement-1 | e2e/tests/retours-deploiement-1.spec.ts |
| E2E-628 | Mémorisation, planning d'une ressource : choix retrouvé après navigation vers un autre écran puis retour. Rechargement : E2E-548-r2 | §6 Colonnes point 6 ; D-227 (B) | retours-deploiement-1 | e2e/tests/retours-deploiement-1.spec.ts |

### Couverture des champs, retours-deploiement-1

- Aucun champ d'API modifiable nouveau : les colonnes visibles sont un réglage du navigateur (stockage local), sans API (§6 Colonnes point 6).

### Révisions D-031 de retours-deploiement-1 (D-228, tags `tests-retouches-rex6-r15`, `tests-retours-deploiement-1-r1`)

Défauts de colonnes changés (D-227 (B)) : mêmes intentions et mêmes valeurs attendues ; point de départ posé par le stockage avant le chargement (`e2e/tests/colonnes-completes.ts`, colonnes d'avant D-227) ou par le menu « Colonnes ».

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GCO-6-r2 | Défauts de `colonnesAffichees` : Gantt d'un projet WBS, Nom, Début, Fin ; Accueil Code, Nom, Début, Fin ; ressource Projet, Activité, Début, Fin ; anciennes attentes gardées avec un choix « tout coché » (décision du porteur) | D-227 (B) | retours-deploiement-1 | packages/web/test/gantt-disposition.test.ts |
| E2E-87-r1, E2E-92-r9, E2E-93-r4, E2E-100-r7, E2E-109-r6 | Accueil : stockage posé avant le chargement | D-227 (B) | retours-deploiement-1 | e2e/tests/accueil-g2.spec.ts, accueil-g3.spec.ts, accueil-g4.spec.ts |
| E2E-33-r1, E2E-35-r1, E2E-41a-r1, E2E-41b-r1, E2E-41e-r1, E2E-43-r8, E2E-252-r1, E2E-288-r2, E2E-289-r2 | Gantt d'un projet : stockage posé avant le chargement | D-227 (B) | retours-deploiement-1 | e2e/tests/lot3b*.spec.ts, rex3a.spec.ts, rex3b-r4.spec.ts |
| E2E-179-r6, E2E-191-r6, E2E-358-r2, E2E-362-r2, E2E-363-r1, E2E-366-r3 | Gantt d'un projet : stockage posé avant le chargement | D-227 (B) | retours-deploiement-1 | e2e/tests/lot3e.spec.ts, lot3f1.spec.ts, lot6c.spec.ts |
| E2E-378-r1, E2E-381-r3, E2E-480-r1, E2E-482-r2, E2E-483-r1, E2E-485-r1 | Planning d'une ressource, Accueil, Gantt : stockage posé avant le chargement | D-227 (B) | retours-deploiement-1 | e2e/tests/lot6e.spec.ts, recette-auto-chefa.spec.ts |
| E2E-521-r1, E2E-522-r2, E2E-523-r1, E2E-539-r1 | Drapeaux visible : stockage posé avant le chargement | D-227 (B) | retours-deploiement-1 | e2e/tests/gantt-colonnes.spec.ts |
| E2E-540-r3, E2E-541-r4, E2E-542-r3, E2E-546-r2, E2E-547-r3, E2E-548-r2, E2E-549-r2, E2E-550-r3, E2E-551-r2, E2E-552-r2, E2E-553-r3, E2E-554-r2, E2E-555-r2, E2E-556-r3 | En-têtes par défaut = D-227 ; Drapeaux cochée par le menu là où la colonne est mesurée ou testée | D-227 (B) | retours-deploiement-1 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-244-r5, E2E-255-r1 | Colonnes Avancement et Planification : stockage posé avant le chargement (échecs de la première suite, hors domaines ciblés ; tag `tests-retours-deploiement-1-r2`) | D-227 (B) | retours-deploiement-1 | e2e/tests/lot4b.spec.ts, rex3a-captures.spec.ts |
| E2E-569-r1 | Accueil : Drapeaux cochée par le menu avec les autres colonnes | D-227 (B) | retours-deploiement-1 | e2e/tests/retouches-rex6.spec.ts |

## Coûts, tranche 2 : calcul, colonnes et export (D-229, sous-lot couts-2)

Fichiers : `packages/api/test/couts-calcul.test.ts` (COUT-1 à COUT-7, fonctions pures, date du jour en paramètre), `packages/api/test/couts-export.test.ts` (CEX-1 à CEX-4), `packages/api/test/couts-visibilite.test.ts` (CVI-1 à CVI-5), `packages/api/test/couts-helpers.ts` (jeu de COUT-6), `e2e/tests/couts-2.spec.ts` (E2E-629 à E2E-635 ; domaines gantt, accueil, projets, e2e/domaines.json). Valeurs attendues recopiées de SPEC §12.3 (cas COUT-1 à COUT-7) et §12.4 (exemple d'export). Tout test de refus relit la base et la compare à l'état d'avant. Les e2e posent les taux relativement à la vraie date du jour du serveur (Alice 600 € depuis 2000-01-01 ; Carol 500 € sur l'année 2000 seulement) : mêmes valeurs que COUT-6 ; les dates exactes sont prouvées par vitest. Rouge : COUT-1 à COUT-7 (module absent), CEX-1 à CEX-4 et CVI-1, CVI-3, CVI-4 (7 sur 9 des tests d'API) ; CVI-2 et CVI-5 verrouillent l'existant ; E2E-629 à E2E-635 : 7 sur 7.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| COUT-1 | Alice 5 j, aucune imputation, reste 5 j, jour 15/01/2027 : planifié 3000, imputé 0, réel 3000, taux manquant non | §12.3 | couts-2 | packages/api/test/couts-calcul.test.ts |
| COUT-2 | Alice 5 j, imputations 31/01 et 01/02, reste 3 j, jour 02/02/2027 : 3500, 1300, 3400, non | §12.3 | couts-2 | packages/api/test/couts-calcul.test.ts |
| COUT-3 | Alice 0,5 j, reste 0,5 j, jour 15/01/2027 : 300, 0, 300, non | §12.3 | couts-2 | packages/api/test/couts-calcul.test.ts |
| COUT-4 | Bob sans taux, 4 j, imputation 10/01, reste 3 j : 0, 0, 0, non | §12.3 | couts-2 | packages/api/test/couts-calcul.test.ts |
| COUT-5 | Carol 2 j, imputation 15/03, reste 1 j, jour 02/04/2027 : 0, 500, 500, oui | §12.3 | couts-2 | packages/api/test/couts-calcul.test.ts |
| COUT-6 | P, F1 (Alice 5 j), F2 (Carol 2 j), jour 15/01/2027 : F1 3000/0/3000 non ; F2 0/0/0 oui ; P et projet 3000/0/3000 oui | §12.3 | couts-2 | packages/api/test/couts-calcul.test.ts |
| COUT-7 | Une activité, Alice 2 j et Bob 3 j : 1200, 0, 1200, non | §12.3 | couts-2 | packages/api/test/couts-calcul.test.ts |
| CEX-1 | Export de l'administrateur = exemple de §12.4, mot pour mot (BOM, CRLF) | §12.4 point 3 | couts-2 | packages/api/test/couts-export.test.ts |
| CEX-2 | En-têtes : text/csv UTF-8, pièce jointe `couts-<code>-AAAA-MM-JJ.csv` | §12.4 point 3 | couts-2 | packages/api/test/couts-export.test.ts |
| CEX-3 | L'export n'écrit rien (historique inchangé) et n'exporte pas la charge vendue | §12.4 point 3 ; §7 | couts-2 | packages/api/test/couts-export.test.ts |
| CEX-4 | Sans OTP effectif : cellule OTP vide | §12.4 point 3 | couts-2 | packages/api/test/couts-export.test.ts |
| CVI-1 | Gantt : quatre clés sur éléments et totaux pour administrateur et chef (valeurs de COUT-6) | §12.3 point 7 | couts-2 | packages/api/test/couts-visibilite.test.ts |
| CVI-2 | Chef en lecture seule : aucune des quatre clés, absentes (le rôle ressource ne lit pas le projet, D-148) | §12.3 point 7 | couts-2 | packages/api/test/couts-visibilite.test.ts |
| CVI-3 | `otp_effectif` renvoyé à tout lecteur (administrateur, lecture seule) | §12.2 ; D-229 (2) (c) | couts-2 | packages/api/test/couts-visibilite.test.ts |
| CVI-4 | Export : 401 sans session, 403 rôle ressource, 403 lecture seule, 404 projet illisible et inexistant ; base inchangée | §12.4 point 3 ; D-229 (2) (e) | couts-2 | packages/api/test/couts-visibilite.test.ts |
| CVI-5 | Liste des activités en lecture seule : sans les clés de coût | §12.3 point 7 | couts-2 | packages/api/test/couts-visibilite.test.ts |
| E2E-629 | Gantt d'un projet : « OTP », « Coût planifié », « Coût réel » cochées par le menu ; valeurs de COUT-6 (F1, F2, P) | §12.4 point 1 | couts-2 | e2e/tests/couts-2.spec.ts |
| E2E-630 | Accueil : mêmes colonnes cochées par le menu ; valeurs sur les activités, ligne de projet vide | §12.4 point 1 ; D-229 (2) (c) | couts-2 | e2e/tests/couts-2.spec.ts |
| E2E-631 | Marque « incomplet » (title « Taux manquant ») sur F2 et P, absente sur F1 | §12.4 point 1 ; §12.3 point 6 | couts-2 | e2e/tests/couts-2.spec.ts |
| E2E-632 | Région « Totaux du projet » : « · Coût planifié 3 000,00 € · Coût réel 3 000,00 € » et marque | §12.4 point 2 | couts-2 | e2e/tests/couts-2.spec.ts |
| E2E-633 | « Exporter les coûts » : fichier téléchargé = exemple de §12.4 ; gantt inchangé | §12.4 point 3 | couts-2 | e2e/tests/couts-2.spec.ts |
| E2E-634 | Chef en lecture seule : « OTP » au menu, ni colonnes de coût, ni export, ni totaux ; réponses sans clés de coût | §12.3 point 7 ; §12.4 | couts-2 | e2e/tests/couts-2.spec.ts |
| E2E-635 | Parcours complet depuis « administrateur seul » : taux, projet avec OTP, affectation, activité assignée à l'écran, colonnes, totaux, export | §12.4 point 4 | couts-2 | e2e/tests/couts-2.spec.ts |

### Couverture des champs, couts-2

- `cout_planifie`, `cout_impute`, `cout_reel`, `taux_manquant` : champs calculés, en lecture seule, hors saisie (aucun champ de saisie) ; écrans consommateurs : colonnes « Coût planifié » et « Coût réel » du Gantt et de l'Accueil, région « Totaux du projet », export (E2E-629 à E2E-635).
- `otp_effectif`, `otp_source` du Gantt : lecture seule ; colonne « OTP » du Gantt et de l'Accueil (E2E-629, E2E-630, E2E-634) ; la saisie de `otp` est couverte en couts-1.
- GET /api/projets/:id/couts/export : aucun paramètre ; lien « Exporter les coûts » (E2E-633, E2E-635).

### Révisions D-031 de couts-2 (D-229, D-230)

Décisions du porteur (claude.ai) : mêmes intentions et mêmes valeurs ; seules les clés nouvelles de §12 sont ajoutées à l'attendu, ou les colonnes de §12.4 au menu.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| GANTT-1-r3 | Forme complète du Gantt : `otp_effectif`, `otp_source` et les quatre clés de coût ajoutés à l'attendu de l'administrateur (tag `tests-lot3a-r2`) | §12.2, §12.3 | couts-2 | packages/api/test/lot3a-gantt.test.ts |
| VND-8-r2, VND-10-r1 | `projet.totaux` : les quatre clés de coût ajoutées à l'attendu de l'administrateur (tag `tests-lot6c-r14`) | §12.3, §12.4 point 2 | couts-2 | packages/api/test/lot6c-vendu.test.ts |
| GCO-7-r2 | Colonnes du menu : OTP (tous), Coût planifié et Coût réel (avec `vendu`, et Accueil) ajoutées dans l'ordre (tag `tests-gantt-colonnes-2-r2`) | §12.4 point 1 | couts-2 | packages/web/test/gantt-disposition.test.ts |
| E2E-540-r4, E2E-541-r5, E2E-555-r3 | Menu « Colonnes » du Gantt d'un projet et de l'Accueil, et du chef en lecture seule : « OTP », « Coût planifié », « Coût réel » ajoutés dans l'ordre (tag `tests-couts-2-r1`) | §12.4 point 1 | couts-2 | e2e/tests/gantt-colonnes-2.spec.ts |
| E2E-623-r1 | Défauts des trois vues : menu allongé des mêmes colonnes, décochées | §12.4 point 1 ; D-227 (B) | couts-2 | e2e/tests/retours-deploiement-1.spec.ts |
| E2E-569-r2 | Accueil toutes colonnes cochées : menu allongé des trois colonnes, en-têtes inchangés | §12.4 point 1 | couts-2 | e2e/tests/retouches-rex6.spec.ts |
| E2E-358-r3, E2E-362-r3, E2E-484-r1 | Région « Totaux du projet » : « · Coût planifié 0,00 € · Coût réel 0,00 € » ajouté ; `totaux` de l'API avec les quatre clés de coût | §12.4 point 2 | couts-2 | e2e/tests/lot6c.spec.ts, recette-auto-chefa.spec.ts |

## Version de l'application (D-231, lot version)

Fichiers : `packages/api/test/version.test.ts` (VER-1 à VER-7), `e2e/tests/version.spec.ts` (E2E-636 à E2E-640). Domaines : authentification, vue-ressource, dialogues, feuille-de-temps.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| VER-1 | `GET /api/version` sans session : 200, `version` égale à celle du package.json racine, `commit` égal à `COMMIT` | §13 points 2, 3 | version | packages/api/test/version.test.ts |
| VER-2 | Sans `COMMIT` dans l'environnement : `commit` vaut « inconnu » | §13 point 2 | version | packages/api/test/version.test.ts |
| VER-3 | En-tête `X-PlanerSource-Version` sur une réponse 200 | §13 point 3 | version | packages/api/test/version.test.ts |
| VER-4 | En-tête sur une réponse 401 ; base inchangée | §13 point 3 | version | packages/api/test/version.test.ts |
| VER-5 | En-tête sur une réponse 404 d'une route /api inconnue | §13 point 3 | version | packages/api/test/version.test.ts |
| VER-6 | Version au format X.Y.Z, identique dans package.json et package-lock.json (racine) | §13 point 1 | version | packages/api/test/version.test.ts |
| VER-7 | Dockerfile (`ARG COMMIT=inconnu` aux deux étapes, `ENV COMMIT`) et docker-compose.yml (`args: COMMIT: ${COMMIT:-inconnu}`) transmettent `COMMIT` | §13 point 2 | version | packages/api/test/version.test.ts |
| E2E-636 | Pied de la barre latérale de l'administrateur : « v<version> · <commit> » | §13 point 4 | version | e2e/tests/version.spec.ts |
| E2E-637 | Pied de la barre latérale d'une ressource (vue restreinte) : même texte | §13 point 4 | version | e2e/tests/version.spec.ts |
| E2E-638 | Version identique : aucun bandeau | §13 point 5 | version | e2e/tests/version.spec.ts |
| E2E-639 | En-tête différent (page.route) : bandeau « Nouvelle version disponible » ; « Recharger » recharge la page ; en-tête absent : pas de bandeau | §13 point 5 | version | e2e/tests/version.spec.ts |
| E2E-640 | « Recharger » avec modifications non enregistrées (Feuille de temps) : confirmation D-172 ; « Annuler » garde la saisie, « Abandonner » recharge | §13 point 5 ; D-172 | version | e2e/tests/version.spec.ts |

### Couverture des champs, version

- `version`, `commit` de `GET /api/version` : lecture seule, hors saisie ; écran consommateur : pied de la barre latérale (E2E-636, E2E-637) ; en-tête `X-PlanerSource-Version` : bandeau (E2E-638 à E2E-640).

## Nettoyage des coûts (D-233, lot nettoyage-couts)

Fichiers : `packages/api/test/nettoyage-couts.test.ts` (NCO-1 à NCO-8), `e2e/tests/nettoyage-couts.spec.ts` (E2E-641). Domaines : projets, gantt. Point (e) : refactor de `lireOtpProjets`, couvert par OTP-1 à OTP-11 existants ; point (f) : SPEC seulement.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| NCO-1 | `POST /api/projets/:id/copie` (projet à OTP propre, projet sous un parent à OTP, modèle) : la réponse porte `otp_effectif` et `otp_source` égaux à ceux du `GET /api/projets/:id` de la copie | §12.2 ; D-233 (a) | nettoyage-couts | packages/api/test/nettoyage-couts.test.ts |
| NCO-2 | Écriture SQL directe dans `taux_journalier` avec `montant` 0 puis −1 : 23514 (`taux_montant_positif`), table inchangée ; 0,01 accepté | §12.1 ; D-233 (b) | nettoyage-couts | packages/api/test/nettoyage-couts.test.ts |
| NCO-3 | Écriture SQL directe avec `montant` 1000000 : 22003 (borne du type `numeric(8, 2)`, pas un CHECK), table inchangée ; 999999,99 accepté | §12.1 ; D-233 (b) | nettoyage-couts | packages/api/test/nettoyage-couts.test.ts |
| NCO-4 | Écriture SQL directe avec `fin` < `debut` : 23514 (`taux_fin_apres_debut`), table inchangée ; `fin` = `debut` et `fin` nulle acceptées | §12.1 ; D-233 (b) | nettoyage-couts | packages/api/test/nettoyage-couts.test.ts |
| NCO-5 | UPDATE direct de `projet.otp` et `activite.otp` à « » puis à 51 caractères : 23514 (`projet_otp_longueur`, `activite_otp_longueur`), lignes inchangées ; 1 et 50 caractères acceptés | §12.2 ; D-233 (b) | nettoyage-couts | packages/api/test/nettoyage-couts.test.ts |
| NCO-6 | INSERT direct dans `historique` : entité `taux` acceptée, entité inconnue refusée (23514, `historique_entite_check`), table inchangée | §12.1 ; D-233 (b) | nettoyage-couts | packages/api/test/nettoyage-couts.test.ts |
| NCO-7 | `POST /api/utilisateurs/:id/taux` à deux défauts : corps invalide + fin < début → 400 ; corps invalide + chevauchement → 400 ; fin < début + chevauchement → 422 ; corps invalide sur une non-ressource → 400 ; base inchangée | §12.1 ; D-233 (c) | nettoyage-couts | packages/api/test/nettoyage-couts.test.ts |
| NCO-8 | `PATCH /api/taux/:id` à deux défauts : mêmes cumuls que NCO-7 (400 avant 422, 422 avant 409) ; base inchangée | §12.1 ; D-233 (c) | nettoyage-couts | packages/api/test/nettoyage-couts.test.ts |
| E2E-641 | Dialogue « Modifier le projet » (par l'écran) : sans OTP propre, l'aide d'héritage suit le changement de « Projet parent » avant l'enregistrement (parent à OTP, puis « Aucun parent ») ; après enregistrement, l'API et le dialogue rouvert le confirment | §12.2 ; D-233 (d) | nettoyage-couts | e2e/tests/nettoyage-couts.spec.ts |

### Couverture des champs, nettoyage-couts

- `otp_effectif`, `otp_source` de la réponse de copie : lecture seule, hors saisie ; écran consommateur : dialogue « Modifier le projet » rouvert (E2E-641) ; copie par l'écran : E2E-617.
- Aucun champ modifiable nouveau.

## Retours du déploiement 2 (D-235, lot retours-deploiement-2)

Fichiers : `packages/web/test/retours-deploiement-2.test.ts` (RD2-1, RD2-2), `e2e/tests/retours-deploiement-2.spec.ts` (E2E-642 à E2E-649). Domaines : projets, gantt, accueil, dialogues, planning-manuel.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| RD2-1 | Table des aides par mode (`champsActivite`) : FDUR et DDUR « Effet sur le planning : oui (jours ouvrés). » ; ASAP, START, STARR, ALAP « Effet sur le planning : seulement sans ressource assignée (longueur de la barre, jours ouvrés). » ; REGUL et MAN : aucune aide de durée | §6 Charge lisible point 5 ; D-235 (A) | retours-deploiement-2 | packages/web/test/retours-deploiement-2.test.ts |
| RD2-2-r1 | (révisé, D-236 (1)) Aucun libellé « (jours) » ni « (jours ouvrés) » dans les sources de packages/web/src, hors aides « Effet sur le planning : … » | §6 Charge lisible point 5 ; D-235 (A) | retours-deploiement-2 | packages/web/test/retours-deploiement-2.test.ts |
| E2E-642 | Dialogue « Nouvelle activité » : libellé « Durée validée (j) » et aide reliée par `aria-describedby`, selon le mode (ASAP, START, STARR, ALAP, FDUR, DDUR) ; « Charge vendue (j) » et son aide | §6 Charge lisible point 5 ; D-235 (A) | retours-deploiement-2 | e2e/tests/retours-deploiement-2.spec.ts |
| E2E-643-r1 | (révisé, D-236 (1)) Dialogue « Modifier l'activité » : mêmes libellés et aides par mode, mis à jour au changement de mode ; charge assignée et marge en lecture seule sans aide ; 4 aides (Durée validée, Charge vendue, Délai des prédécesseurs, Délai des successeurs), chacune vérifiée par `aria-describedby` | §6 Charge lisible point 5 ; D-235 (A) | retours-deploiement-2 | e2e/tests/retours-deploiement-2.spec.ts |
| E2E-644 | Aide de la charge vendue « Effet sur le planning : non (sert à la marge). » dans la création et la modification, reliée par `aria-describedby` | §6 Charge lisible point 5 | retours-deploiement-2 | e2e/tests/retours-deploiement-2.spec.ts |
| E2E-645 | « Délai (j) » et son aide « Effet sur le planning : oui (jours ouvrés). » : onglet Planning, formulaire d'édition, section Prédécesseurs et Successeurs du dialogue d'une activité | §6 Charge lisible point 5 | retours-deploiement-2 | e2e/tests/retours-deploiement-2.spec.ts |
| E2E-646 | « Charge assignée (j) » et son aide « Effet sur le planning : oui. » : dialogues d'assignation du Planning et des formulaires d'édition | §6 Charge lisible point 5 | retours-deploiement-2 | e2e/tests/retours-deploiement-2.spec.ts |
| E2E-647 | Planning manuel : en-tête « Total du mois (j) » | §6 Charge lisible point 5 | retours-deploiement-2 | e2e/tests/retours-deploiement-2.spec.ts |
| E2E-648 | Gantt d'un projet, page défilée sous l'en-tête collant, dialogue d'une activité ouvert par un clic : `document.elementFromPoint` au centre de chaque champ renvoie un élément du dialogue | §6 Charge lisible point 6 ; D-235 (B) | retours-deploiement-2 | e2e/tests/retours-deploiement-2.spec.ts |
| E2E-649 | Même contrôle sur le Gantt global de l'Accueil | §6 Charge lisible point 6 ; D-235 (B) | retours-deploiement-2 | e2e/tests/retours-deploiement-2.spec.ts |

### Couverture des champs, retours-deploiement-2

- Aucun champ modifiable nouveau : libellés et aides des champs `duree`, `charge_vendue`, `charge` de l'assignation, `delai` de la dépendance, et total du mois du Planning manuel (E2E-642 à E2E-647) ; empilement du dialogue (E2E-648, E2E-649).

### Révisions D-031 de retours-deploiement-2 (D-235, D-236, tags `tests-retours-deploiement-2-r1`, `tests-retours-deploiement-2-r2`)

- `-r1` (décision du porteur, D-236 (1)) : RD2-2-r1 et E2E-643-r1, une contradiction du prompt d'ouverture et non de la SPEC.
- `-r2` (sans décision préalable, D-235) : e2e dont seuls les libellés renommés ou l'aide ajoutée changent (même intention, mêmes valeurs attendues) : E2E-110-r2 → E2E-110-r3, E2E-572 → E2E-572-r1, E2E-573 → E2E-573-r1, E2E-574 → E2E-574-r1, E2E-575 → E2E-575-r1, E2E-576 → E2E-576-r1, E2E-577 → E2E-577-r1, E2E-578 → E2E-578-r1, E2E-123-r2 → E2E-123-r3, E2E-635 → E2E-635-r1, E2E-443-r2 → E2E-443-r3, E2E-8 → E2E-8-r1, E2E-9 → E2E-9-r1, E2E-18-r1 → E2E-18-r2, E2E-19-r1 → E2E-19-r2, E2E-59-r1 → E2E-59-r2, E2E-131-r1 → E2E-131-r2, E2E-133a → E2E-133a-r1, E2E-170-r1 → E2E-170-r2, E2E-180-r1 → E2E-180-r2, E2E-192-r1 → E2E-192-r2, E2E-208-r1 → E2E-208-r2, E2E-244-r5 → E2E-244-r6, E2E-316 → E2E-316-r1, E2E-345-r1 → E2E-345-r2, E2E-353-r1 → E2E-353-r2, E2E-358-r3 → E2E-358-r4, E2E-376-r1 → E2E-376-r2, E2E-382-r1 → E2E-382-r2, E2E-387-r1 → E2E-387-r2, E2E-46-r1 → E2E-46-r2, E2E-248 → E2E-248-r1, E2E-595 → E2E-595-r1, E2E-596 → E2E-596-r1, E2E-597 → E2E-597-r1, E2E-604 → E2E-604-r1. Les tests E2E-572 à E2E-578 de charge-lisible.spec.ts reprennent le nouveau libellé « Durée validée (j) » et la nouvelle aide de la SPEC §6 point 5.

## Colonne Ressources (D-238, lot colonne-ressources)

Fichiers : `packages/api/test/colonne-ressources.test.ts` (CRS-1 à CRS-3), `packages/web/test/gantt-disposition.test.ts` (CRS-4), `e2e/tests/colonne-ressources.spec.ts` (E2E-650 à E2E-656). Domaines : gantt, accueil, dialogues, projets.

| ID | Test | Spec | Lot | Fichier |
|---|---|---|---|---|
| CRS-1 | GET …/gantt, feuille à 3 assignations dont une ressource sans initiales : `assignations` aux champs exacts { id, ressource_id, nom, initiales, charge_assignee, taux }, triées par nom sans tenir compte de la casse (deux noms qui ne diffèrent que par la casse départagés par id), `initiales` null pour la ressource sans initiales | §6 Lecture ; D-238 (a) | colonne-ressources | colonne-ressources | packages/api/test/colonne-ressources.test.ts |
| CRS-2 | Feuille sans assignation : `assignations` []; parent et jalon : clé `assignations` absente ; `initiales` (D-088) inchangé (ordre par id, sans les null) | §6 Lecture ; D-238 (a) | colonne-ressources | colonne-ressources | packages/api/test/colonne-ressources.test.ts |
| CRS-3 | Lecteur sans droit d'écriture (chef de projet affecté au projet d'un autre chef) : `assignations` présentes et identiques à celles de l'administrateur ; base inchangée (la route n'écrit rien) | §6 Lecture ; D-238 (a) | colonne-ressources | colonne-ressources | packages/api/test/colonne-ressources.test.ts |
| CRS-4 | Disposition : défauts des deux vues avec `ressources` après `fin` ; planning d'une ressource sans `ressources` ; choix enregistré sans clé `ressources` : affichée ; `ressources: false` : masquée | §6 Colonne Ressources points 1, 7 ; Colonnes et défilement point 5 ; D-238 (c) | colonne-ressources | colonne-ressources | packages/web/test/gantt-disposition.test.ts |
| E2E-650 | Gantt d'un projet, administrateur, colonne Ressources par défaut après Fin : contenu exact (initiales, nom si pas d'initiales, tri par nom), `title` « Alice Bernard — 2,5 j » ; parent et jalon vides | §6 Colonne Ressources points 1 à 3 | colonne-ressources | colonne-ressources | e2e/tests/colonne-ressources.spec.ts |
| E2E-651 | Parcours par l'écran, sans appel API pour l'assignation : création dans l'onglet Planning, puis clic sur l'initiale dans le Gantt ; dialogue « Modifier l'assignation », charge préremplie, passage à 4, enregistrement ; `title` « … — 4 j », bandeau « Planning à recalculer », colonne Charge, charge dans l'onglet Planning | §6 Colonne Ressources points 4, 5 | colonne-ressources | colonne-ressources | e2e/tests/colonne-ressources.spec.ts |
| E2E-652 | Accueil, projet déplié : même contenu ; clic, enregistrement, Accueil rechargé, `title` mis à jour | §6 Colonne Ressources points 2 à 5 | colonne-ressources | colonne-ressources | e2e/tests/colonne-ressources.spec.ts |
| E2E-653 | Chef de projet sans droit d'écriture sur le projet : infobulles présentes, aucun bouton dans la colonne, dans les deux vues | §6 Colonne Ressources point 4 | colonne-ressources | colonne-ressources | e2e/tests/colonne-ressources.spec.ts |
| E2E-654-r1 | (révisé, D-238, D-031) Menu « Colonnes » : « Ressources » juste après « Fin », cochée par défaut ; décochée : absente du DOM et conservée au rechargement ; « Rétablir l'affichage par défaut » la recoche ; pas d'entrée « Ressources » dans le planning d'une ressource | §6 Colonne Ressources point 1 ; Colonnes et défilement points 5, 9 | colonne-ressources | colonne-ressources | e2e/tests/colonne-ressources.spec.ts |
| E2E-655 | « Recalcul automatique » cochée, modification par une initiale : calcul déclenché, bandeau effacé | §6 Colonne Ressources point 5 ; 3d-4 | colonne-ressources | colonne-ressources | e2e/tests/colonne-ressources.spec.ts |
| E2E-656 | Critère 3b point 15 (a) à (c) à 1440 et 1024 px, colonnes par défaut, Gantt d'un projet et Accueil | §6 Colonne Ressources point 7 | colonne-ressources | colonne-ressources | e2e/tests/colonne-ressources.spec.ts |

### Couverture des champs, colonne-ressources

- `charge_assignee` et `taux` de PATCH /api/assignations/:id : aussi modifiables depuis la colonne Ressources du Gantt d'un projet et de l'Accueil (dialogue « Modifier l'assignation », champs « Charge assignée (j) » et « Taux ») ; écran consommateur : `title` de l'élément, colonne Charge, onglet Planning (E2E-651, E2E-652).
- `assignations` de GET …/gantt : lecture seule, hors saisie (CRS-1 à CRS-3) → colonne « Ressources » (E2E-650).

### Révisions D-031 de colonne-ressources (D-238, tag `tests-colonne-ressources-r1`)

Décisions du porteur (claude.ai) : révisions dues à la colonne Ressources par défaut (liste exacte des colonnes, ordre de tabulation, boutons de la colonne) et à la clé `assignations` ; assertions inchangées pour le reste. Un commit par fichier (les tests d'une même boucle partagent leur code).

- E2E-654 → E2E-654-r1 : attente « 1 Tâche R » pour la vue ressource.
- GCO-6-r2 → GCO-6-r3, GCO-7-r2 → GCO-7-r3 (colonnes et menu).
- GANTT-1-r3 → GANTT-1-r4 : clé `assignations` de la feuille.
- gantt-colonnes-2 : E2E-540-r4 → r5, E2E-541-r5 → r6, E2E-546-r2 → r3, E2E-547-r3 → r4, E2E-549-r2 → r3, E2E-550-r3 → r4, E2E-552-r2 → r3, E2E-553-r3 → r4, E2E-555-r3 → r4, E2E-556-r3 → r4.
- retours-deploiement-1 : E2E-623-r1 → r2, E2E-624 → r1, E2E-625 → r1, E2E-626 → r1, E2E-627 → r1 ; retouches-rex6 : E2E-569-r2 → r3.
- Accueil : E2E-87-r1 → r2, E2E-92-r9 → r10, E2E-100-r7 → r8, E2E-109-r6 → r7 (poignée « Ressources » dans l'ordre de tabulation).
- Gantt d'un projet, ordre de tabulation (poignée et boutons d'assignation) : E2E-43-r8 → r9, E2E-179-r6 → r7, E2E-191-r6 → r7.
- `ressources: false` posé avant le chargement (assistant `sansColonneRessources`, colonnes-completes.ts), assertions inchangées (D-238 (1), (4)) : E2E-93-r4 → r5, E2E-289-r2 → r3, E2E-366-r3 → r4.
