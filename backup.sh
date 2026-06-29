#!/usr/bin/env bash
# set -e: si cualquier comando falla, el script corta. No queremos seguir
# adelante creyendo que el backup salio bien cuando en realidad fallo algo.
set -e

# Nos paramos siempre en la carpeta del script, no importa desde donde se ejecute.
# Asi la carpeta de resguardos se crea al lado del proyecto y no donde estaba parado el usuario.
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "[INFO] Iniciando backup de MongoDB Atlas..."

# Sin mongodump no hay backup posible, asi que chequeamos primero que este instalado.
if ! command -v mongodump >/dev/null 2>&1; then
  echo "[ERROR] mongodump no esta instalado o no esta en PATH."
  echo "[ERROR] Instala MongoDB Database Tools para continuar."
  exit 1
fi

# Cargamos las credenciales desde .env igual que la app, asi no las repetimos en dos lados.
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

# Una subcarpeta por fecha. Asi cada corrida queda guardada aparte y no se pisan
# los backups de dias distintos.
FECHA="$(date +%Y-%m-%d)"
DESTINO="./resguardos_tpi/$FECHA"

mkdir -p "$DESTINO"

echo "[INFO] Carpeta de destino: $DESTINO"
echo "[INFO] Ejecutando mongodump..."

mongodump --uri="$MONGODB_URI" --db="$DB_NAME" --out="$DESTINO"

echo "[OK] Backup completado en $DESTINO"
