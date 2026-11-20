#!/usr/bin/env bash
# Sauvegarde PostgreSQL au format personnalisé, fichier horodaté.
# Environnement : DATABASE_URL (obligatoire), BACKUP_DIR (défaut : backups).
# Affiche le chemin du fichier produit sur la dernière ligne de stdout.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL est requis}"
dir="${BACKUP_DIR:-backups}"
mkdir -p "$dir"
file="$dir/planersource-$(date +%Y%m%d-%H%M%S).dump"

pg_dump --format=custom --file="$file" "$DATABASE_URL"
echo "$file"
