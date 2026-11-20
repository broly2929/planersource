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
| E2E-27 | Saisie enregistrée en janvier ; « Mois suivant » : février 2027, 28 jours, aucune case cochée ; « Mois précédent » : la saisie est là ; une case modifiée rend les boutons de mois inactifs ; « Annuler » rétablit la grille et les réactive | 5.6, D-060 (3) (5) | 2e-E | e2e/tests/lot2e.spec.ts |
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
| GANTT-1-r1 | Avant calcul : forme complète de la réponse ; ordre et numéros WBS (parent, enfant, jalon) ; dates planifiées null, drapeaux [] ; une dépendance présente avec drapeaux [] | 6 (Lecture) | 3a | packages/api/test/lot3a-gantt.test.ts ; révisé : `initiales: []` sur la feuille (D-090, tests-lot3a-r1) |
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
| FDT-3 | Soumettre : 401 ; 404 feuille inconnue, id mal formé, Bob ; 403 chef et administrateur ; base inchangée | §7 4a (7) | 4a | lot4a-feuilles.test.ts |
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
