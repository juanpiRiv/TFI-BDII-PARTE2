#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "[INFO] Iniciando backup de MongoDB Atlas..."

if ! command -v mongodump >/dev/null 2>&1; then
  echo "[ERROR] mongodump no esta instalado o no esta en PATH."
  echo "[ERROR] Instala MongoDB Database Tools para continuar."
  exit 1
fi

if [ -f ".env" ]; then
  echo "[INFO] Leyendo variables desde .env"
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "[WARN] No existe .env, se usaran variables de entorno del sistema."
fi

if [ -z "${MONGODB_URI:-}" ] || [ -z "${DB_NAME:-}" ]; then
  echo "[ERROR] Debes definir MONGODB_URI y DB_NAME en .env o en el entorno."
  exit 1
fi

FECHA="$(date +%Y-%m-%d)"
DESTINO="./resguardos_tpi/$FECHA"

mkdir -p "$DESTINO"

echo "[INFO] Carpeta de destino: $DESTINO"
echo "[INFO] Ejecutando mongodump..."

mongodump --uri="$MONGODB_URI" --db="$DB_NAME" --out="$DESTINO"

echo "[OK] Backup completado en $DESTINO"
