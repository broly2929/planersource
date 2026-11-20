#!/usr/bin/env bash
# INST-10 (D-138 (3)) : installation réelle par Docker, dans un dossier temporaire.
# Copie le dépôt (fichiers suivis et non ignorés), crée .env depuis .env.production.example,
# docker compose up -d --build, attend la base saine puis l'API, vérifie / et la connexion admin / admin,
# puis docker compose down -v dans tous les cas. Lancé à la main, hors npm test et hors CI.
# Environnement : PORT_TEST (défaut 8080), DELAI (secondes d'attente, défaut 300).
set -euo pipefail

racine="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
port="${PORT_TEST:-8080}"
delai="${DELAI:-300}"

echec() { echo "ÉCHEC : $*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || echec "docker absent de la machine"
docker compose version >/dev/null 2>&1 || echec "docker compose absent de la machine"
command -v curl >/dev/null 2>&1 || echec "curl absent de la machine"
for f in Dockerfile docker-compose.yml .env.production.example; do
  [ -f "$racine/$f" ] || echec "$f absent du dépôt"
done

dossier="$(mktemp -d)"
projet="planersource-inst-$$"
compose() { (cd "$dossier" && docker compose -p "$projet" "$@"); }
nettoyer() {
  compose down -v >/dev/null 2>&1 || true
  rm -rf "$dossier"
}
trap nettoyer EXIT

echo "Copie du dépôt dans $dossier"
(cd "$racine" && git ls-files -z --cached --others --exclude-standard \
  | xargs -0 -I{} sh -c '[ -e "$1" ] && printf "%s\0" "$1"' _ {} \
  | tar --null -T - -cf -) | (cd "$dossier" && tar -xf -)
cp "$dossier/.env.production.example" "$dossier/.env"

echo "docker compose up -d --build"
compose up -d --build

echo "Attente de la base saine"
for ((i = 0; i < delai; i += 2)); do
  etat="$(docker inspect -f '{{.State.Health.Status}}' "$(compose ps -q db)" 2>/dev/null || true)"
  [ "$etat" = "healthy" ] && break
  sleep 2
done
[ "$etat" = "healthy" ] || { compose logs; echec "base non saine après ${delai} s"; }

echo "Attente de l'API sur le port $port"
code=""
for ((i = 0; i < delai; i += 2)); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$port/" || true)"
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] || { compose logs app; echec "GET / : code $code"; }

type="$(curl -s -o /dev/null -w '%{content_type}' "http://localhost:$port/")"
[[ "$type" == text/html* ]] || echec "GET / : type $type"
echo "GET / : 200 $type"

connexion="$(curl -s -o /dev/null -w '%{http_code}' -H 'content-type: application/json' \
  -d '{"identifiant":"admin","mot_de_passe":"admin"}' "http://localhost:$port/api/auth/login")"
[ "$connexion" = "200" ] || { compose logs app; echec "connexion admin / admin : code $connexion"; }
echo "POST /api/auth/login admin / admin : 200"

echo "INST-10 : installation réelle réussie"
