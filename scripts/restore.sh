#!/usr/bin/env bash
# Restaure une sauvegarde produite par backup.sh dans une base vide.
# Usage : DATABASE_URL=<base cible> restore.sh <fichier>
# Refus si : fichier absent ou sans table schema_version, base non vide, pas de confirmation « oui ».
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL est requis}"
file="${1:-}"
[ -n "$file" ] && [ -f "$file" ] || { echo "Usage : restore.sh <fichier>" >&2; exit 2; }

if ! pg_restore --list "$file" 2>/dev/null | grep -Eq ' TABLE public schema_version '; then
  echo "Refus : table schema_version absente, sauvegarde non produite par cet outil." >&2
  exit 1
fi

tables=$(psql "$DATABASE_URL" --no-psqlrc --tuples-only --no-align \
  --command "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")
if [ "$tables" != "0" ]; then
  echo "Refus : la base cible n'est pas vide ($tables tables)." >&2
  exit 1
fi

printf 'Restaurer %s dans la base cible ? Tapez oui : ' "$file" >&2
read -r reponse || reponse=""
if [ "$reponse" != "oui" ]; then
  echo "Restauration annulée : confirmation absente." >&2
  exit 1
fi

pg_restore --single-transaction --exit-on-error --no-owner --dbname "$DATABASE_URL" "$file"
echo "Restauration terminée."
