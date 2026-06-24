$ErrorActionPreference = "Stop"

Set-Location -Path $PSScriptRoot
Write-Host "[INFO] Iniciando backup de MongoDB Atlas..."

$mongodumpCmd = Get-Command mongodump -ErrorAction SilentlyContinue
if (-not $mongodumpCmd) {
  Write-Host "[ERROR] mongodump no esta instalado o no esta en PATH."
  Write-Host "[ERROR] Instala MongoDB Database Tools para continuar."
  exit 1
}

if (Test-Path ".env") {
  Write-Host "[INFO] Leyendo variables desde .env"
  Get-Content ".env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
      $parts = $line -split "=", 2
      if ($parts.Count -eq 2) {
        [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1])
      }
    }
  }
} else {
  Write-Host "[WARN] No existe .env, se usaran variables de entorno del sistema."
}

$uri = [System.Environment]::GetEnvironmentVariable("MONGODB_URI")
$dbName = [System.Environment]::GetEnvironmentVariable("DB_NAME")

if ([string]::IsNullOrWhiteSpace($uri) -or [string]::IsNullOrWhiteSpace($dbName)) {
  Write-Host "[ERROR] Debes definir MONGODB_URI y DB_NAME en .env o en el entorno."
  exit 1
}

$fecha = Get-Date -Format "yyyy-MM-dd"
$destino = Join-Path ".\resguardos_tpi" $fecha

New-Item -Path $destino -ItemType Directory -Force | Out-Null

Write-Host "[INFO] Carpeta de destino: $destino"
Write-Host "[INFO] Ejecutando mongodump..."

& mongodump --uri="$uri" --db="$dbName" --out="$destino"

Write-Host "[OK] Backup completado en $destino"
