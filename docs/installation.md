# Installation et exploitation

Manuel d'installation de l'application en production (D-138, D-139). Deux voies : Docker (recommandée) ou installation directe avec systemd.

## 1. Prérequis

- Avec Docker : un serveur Linux, Docker et Docker Compose (commande `docker compose`), Git. L'utilisateur qui installe doit pouvoir lancer `docker` (groupe `docker`, ou `sudo`).
- Sans Docker : Node.js 22, PostgreSQL 18, Git (voir section 8).
- Un port libre sur le serveur (8080 par défaut).

## 2. Installation en 4 commandes (Docker)

```sh
git clone https://github.com/broly2929/planersource planersource && cd planersource
cp .env.production.example .env
nano .env
docker compose up -d --build
```

Dans `.env` (troisième commande), changer avant le premier démarrage :

- `POSTGRES_PASSWORD` : mot de passe de la base, lettres et chiffres seulement. Il n'est appliqué qu'à la création de la base : le changer ensuite ne change pas le mot de passe de la base (voir Dépannage).
- `SESSION_SECRET` : au moins 32 caractères aléatoires, par exemple le résultat de `openssl rand -hex 32`.
- `PORT` : port de l'application sur le serveur (8080 par défaut).

La première construction prend quelques minutes. Vérifier ensuite :

```sh
docker compose ps
```

Les deux services `db` et `app` doivent être `Up`, `db` avec la mention `healthy`. Les migrations de la base sont appliquées automatiquement au démarrage de `app`.

## 3. Premier accès

1. Ouvrir `http://<serveur>:<PORT>` dans un navigateur.
2. Se connecter avec l'identifiant `admin` et le mot de passe `admin`. Ce compte est créé au premier démarrage, seulement si la base ne contient aucun utilisateur.
3. Un bandeau rappelle que le mot de passe est celui d'origine. Aller dans **Utilisateurs**, cliquer sur l'icône crayon (« Modifier Administrateur ») de la ligne « Administrateur », saisir un **Nouveau mot de passe**, puis **Enregistrer**. Le bandeau disparaît à la connexion suivante.

- `<serveur>` : `localhost` sur le serveur lui-même ; depuis un autre poste, son adresse IP ou son nom sur le réseau ; derrière Caddy (section 4), l'adresse HTTPS du domaine, sans port.
- `<PORT>` : la valeur de `PORT` dans `.env` (8080 par défaut).

Pour ne jamais créer ce compte, mettre `INITIAL_ADMIN=0` dans `.env` avant le premier démarrage, puis créer l'administrateur à la main :

```sh
docker compose exec -e ADMIN_PASSWORD='<mot de passe>' app \
  node --conditions=planersource-dist packages/api/dist/cli/create-admin.js --login <identifiant> --nom '<nom>'
```

## 4. HTTPS par reverse proxy (exemple Caddy)

L'application parle HTTP. Pour un accès depuis Internet, la placer derrière un reverse proxy qui gère HTTPS. Exemple avec Caddy installé sur le même serveur, qui obtient et renouvelle seul le certificat (le nom de domaine doit pointer vers le serveur, ports 80 et 443 ouverts) :

```
planning.example.com {
    reverse_proxy localhost:<PORT>
}
```

Puis, dans `.env` :

- `COOKIE_SECURE=1` : le cookie de session n'est plus envoyé qu'en HTTPS.
- `TRUST_PROXY=1` : l'application lit l'adresse du client dans `X-Forwarded-For` (Caddy la renseigne) pour limiter les tentatives de connexion (5 échecs par identifiant et par adresse en 15 minutes, 50 par adresse). Sans cette ligne derrière un proxy, tous les clients partagent l'adresse du proxy. Ne pas l'activer sans reverse proxy : l'en-tête serait alors falsifiable.
- `PORT=127.0.0.1:<PORT>` (par exemple `PORT=127.0.0.1:8080`) : l'application n'est plus joignable directement depuis le réseau, seulement par Caddy.

Appliquer : `docker compose up -d`.

Avec `COOKIE_SECURE=1`, la connexion par `http://<serveur>:<PORT>` depuis un autre poste ne fonctionne plus : passer par l'adresse HTTPS.

## 5. Sauvegarde et restauration

Avec Docker, la base est dans le volume nommé `donnees` ; elle survit à `docker compose down`, mais pas à `docker compose down -v`.

### Sauvegarde (Docker)

Depuis le dossier `planersource` :

```sh
mkdir -p backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" --format=custom "$POSTGRES_DB"' \
  > backups/planersource-$(date +%Y%m%d-%H%M%S).dump
```

Le fichier produit est au même format que celui de `scripts/backup.sh`. Le copier hors du serveur.

Sauvegarde quotidienne automatique : ajouter cette ligne à la crontab de l'utilisateur qui a installé l'application (`crontab -e`). Elle sauvegarde à 2 h, depuis le dossier `planersource` (adapter le chemin) :

```
0 2 * * * cd /chemin/vers/planersource && mkdir -p backups && docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" --format=custom "$POSTGRES_DB"' > backups/planersource-$(date +\%Y\%m\%d-\%H\%M\%S).dump
```

Supprimer les anciennes sauvegardes et en copier une hors du serveur restent à la charge de l'exploitant.

### Restauration (Docker)

La restauration se fait dans une base vide, application arrêtée. Elle remplace toutes les données.

```sh
docker compose stop app
docker compose exec db sh -c 'dropdb -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose cp scripts/restore.sh db:/tmp/restore.sh
docker compose cp backups/<fichier>.dump db:/tmp/sauvegarde.dump
docker compose exec db sh -c 'DATABASE_URL="postgresql://$POSTGRES_USER@/$POSTGRES_DB" bash /tmp/restore.sh /tmp/sauvegarde.dump'
docker compose start app
```

`restore.sh` refuse un fichier qui ne vient pas de cet outil et une base non vide, puis demande de taper `oui`.

### Sans Docker

Avec `pg_dump`, `pg_restore` et `psql` installés (PostgreSQL 18) :

```sh
DATABASE_URL=postgres://<utilisateur>:<mot de passe>@localhost:5432/planersource scripts/backup.sh
DATABASE_URL=postgres://<utilisateur>:<mot de passe>@localhost:5432/<base vide> scripts/restore.sh backups/<fichier>.dump
```

`backup.sh` écrit dans `backups/` (ou dans `BACKUP_DIR`) et affiche le chemin du fichier.

## 6. Mise à jour

La mise à jour récupère la dernière version publiée sur GitHub (branche main) et garde la base : avec Docker, les données sont dans le volume `donnees`, que ni `git pull` ni la reconstruction de l'image ne touchent ; `.env` et `backups/` ne sont pas suivis par git et restent en place.

**Ne jamais lancer `docker compose down -v` : cette commande efface la base.**

1. Se placer dans le dossier de l'application :

   ```sh
   cd planersource
   ```

2. Sauvegarder la base :

   ```sh
   mkdir -p backups
   docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" --format=custom "$POSTGRES_DB"' \
     > backups/planersource-$(date +%Y%m%d-%H%M%S).dump
   ```

3. Récupérer la nouvelle version :

   ```sh
   git pull
   ```

4. Reconstruire et redémarrer :

   ```sh
   COMMIT=$(git rev-parse --short HEAD) docker compose up -d --build
   ```

   `COMMIT` est le numéro court du commit, affiché avec la version en bas de la barre latérale (SPEC §13). Sans lui, l'application affiche « inconnu ».

5. Vérifier :

   ```sh
   docker compose ps
   ```

   `db` et `app` doivent être `Up`, `db` avec la mention `healthy`. Les migrations de la nouvelle version sont appliquées au démarrage de `app`, sans effacer les données.

6. Les navigateurs chargent la nouvelle version au prochain affichage, sans vider le cache.

   Les navigateurs déjà ouverts affichent un bandeau « Nouvelle version disponible » avec un bouton « Recharger » (SPEC §13).

   Une seule fois, pour la mise à jour qui apporte ce réglage : forcer le rechargement de la page (Ctrl+F5, ou Cmd+Maj+R sur Mac), car le navigateur garde l'ancienne page jusqu'à ce rechargement.

En cas d'échec : restaurer la sauvegarde avec la version précédente (`git checkout <commit précédent>`, puis section 5, « Restauration »). Une version plus ancienne que la base refuse de démarrer : dans ce cas, restaurer la sauvegarde avec l'ancienne version. Les images des versions précédentes restent sur le disque : `docker image prune` les supprime.

## 7. Commandes utiles (Docker)

- Journal de l'application : `docker compose logs -f app`
- Arrêt : `docker compose down` (les données sont gardées)
- Redémarrage : `docker compose up -d`
- Tout supprimer, données comprises : `docker compose down -v`

## 8. Installation sans Docker (systemd)

Prérequis : Node.js 22, PostgreSQL 18, Git. Les commandes `sudo` supposent un compte administrateur du serveur.

1. Base de données :

   ```sh
   sudo -u postgres psql -c "CREATE ROLE planersource LOGIN PASSWORD '<mot de passe>'"
   sudo -u postgres psql -c "CREATE DATABASE planersource OWNER planersource"
   ```

2. Utilisateur système et code :

   ```sh
   sudo useradd --system --create-home --home-dir /opt/planersource planersource
   sudo -u planersource git clone https://github.com/broly2929/planersource /opt/planersource/app
   cd /opt/planersource/app
   sudo -u planersource npm ci
   sudo -u planersource npm run build
   ```

3. Configuration : créer `/opt/planersource/app/.env` (lu au démarrage) :

   ```
   DATABASE_URL=postgres://planersource:<mot de passe>@localhost:5432/planersource
   SESSION_SECRET=<au moins 32 caractères aléatoires>
   PORT=8080
   NODE_ENV=production
   COOKIE_SECURE=0
   ```

   Puis `sudo chown planersource /opt/planersource/app/.env && sudo chmod 600 /opt/planersource/app/.env`. Mettre `COOKIE_SECURE=1` derrière HTTPS (section 4).

4. Service : créer `/etc/systemd/system/planersource.service` :

   ```
   [Unit]
   Description=Planersource
   After=network.target postgresql.service

   [Service]
   Type=simple
   User=planersource
   WorkingDirectory=/opt/planersource/app
   ExecStart=/usr/bin/node --conditions=planersource-dist packages/api/dist/server.js
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

   Vérifier le chemin de `node` avec `command -v node` et l'adapter dans `ExecStart`.

5. Démarrage :

   ```sh
   sudo systemctl daemon-reload
   sudo systemctl enable --now planersource
   sudo systemctl status planersource
   ```

   Premier accès : section 3. Journal : `journalctl -u planersource -f`.

Mise à jour sans Docker : sauvegarde préalable (section 6 pour le principe, `scripts/backup.sh` pour la commande, section 5), puis dans `/opt/planersource/app` : `sudo -u planersource git pull && sudo -u planersource npm ci && sudo -u planersource npm run build && sudo systemctl restart planersource`.

## 9. Dépannage

- **Base injoignable** (`app` redémarre en boucle, journal avec `ECONNREFUSED` ou `password authentication failed`) : `docker compose ps` et `docker compose logs db`. Si `POSTGRES_PASSWORD` a été changé après le premier démarrage, la base garde l'ancien mot de passe : remettre l'ancien dans `.env`, ou, sur une installation sans données à garder, `docker compose down -v` puis `docker compose up -d`. Sans Docker : vérifier `DATABASE_URL` et que PostgreSQL tourne (`systemctl status postgresql`).
- **Port déjà pris** (`port is already allocated` ou `EADDRINUSE`) : choisir un autre `PORT` dans `.env` (par exemple 8081), puis `docker compose up -d`. Voir qui l'occupe : `ss -ltnp | grep 8080`.
- **admin / admin refusé** : le compte initial n'est créé que si la base ne contient aucun utilisateur (et si `INITIAL_ADMIN` ne vaut pas 0). Si la base a déjà des utilisateurs (restauration, mot de passe déjà changé), se connecter avec un compte existant ou créer un administrateur par la commande de la section 3.
- **Connexion acceptée puis retour à l'écran de connexion** : `COOKIE_SECURE=1` alors que l'accès se fait en HTTP. Passer par l'adresse HTTPS, ou mettre `COOKIE_SECURE=0`.
- **Page blanche ou ancienne version après mise à jour** : recharger la page sans cache (Ctrl+Maj+R).
- **Connexion refusée après plusieurs échecs (429)** : attendre la fin de la fenêtre indiquée. Les compteurs de tentatives de connexion sont gardés en mémoire et remis à zéro au redémarrage de l'application.
