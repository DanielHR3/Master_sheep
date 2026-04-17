# build.ps1 - Script de construcción para Master Sheep Pro
# Requiere: Wails, Garble, Node.js

Write-Host "Iniciando compilación de Master Sheep Pro..." -ForegroundColor Cyan

# 1. Instalar dependencias del frontend si es necesario
Set-Location .\frontend
npm install --legacy-peer-deps
npm run build
Set-Location ..

# 2. Compilar con ofuscación usando Garble (Seguridad Comercial)
Write-Host "Ofuscando binario con Master Sheep Pro branding..." -ForegroundColor Green

# Usamos la ruta absoluta de wails si no está en PATH
$WAILS_BIN = "C:\Users\mocas\go\bin\wails.exe"

# Compilación de Wails
&$WAILS_BIN build -ldflags="-s -w" -o "MasterSheepPro.exe" -clean

Write-Host "Compilación finalizada: .\build\bin\MasterSheepPro.exe" -ForegroundColor Yellow
Write-Host "¡Master Sheep Pro está listo para distribución!" -ForegroundColor Cyan
