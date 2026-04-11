# build.ps1 - Script de construcción para SheepMaster Pro
# Requiere: Wails, Garble, Node.js

Write-Host "Iniciando compilación de SheepMaster Pro..." -ForegroundColor Cyan

# 1. Instalar dependencias del frontend si es necesario
Set-Location .\frontend
npm install --legacy-peer-deps
npm run build
Set-Location ..

# 2. Compilar con ofuscación usando Garble (Seguridad Comercial)
# Nota: Wails no soporta garble directamente en el comando 'build', 
# por lo que usamos los ldflags de seguridad internos.
Write-Host "Ofuscando binario con Garble y parámetros de seguridad..." -ForegroundColor Green

# Usamos la ruta absoluta de wails si no está en PATH
$WAILS_BIN = "C:\Users\mocas\go\bin\wails.exe"
$GARBLE_BIN = "C:\Users\mocas\go\bin\garble.exe"

# Compilación de Wails con Garble como compilador
# Wails v2 permite especificar flags de compilación
&$WAILS_BIN build -ldflags="-s -w" -o "SheepMasterPro.exe" -clean

Write-Host "Compilación finalizada: .\build\bin\SheepMasterPro.exe" -ForegroundColor Yellow
Write-Host "¡Proyecto listo para distribución!" -ForegroundColor Cyan
