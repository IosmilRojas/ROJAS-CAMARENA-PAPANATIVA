@echo off
title PapaClick - Instalador Portable
color 0A

echo.
echo ================================================================
echo                     PAPACLICK v1.0
echo            Sistema de Clasificacion de Papa con IA
echo ================================================================
echo.
echo Este instalador portable creara una version ejecutable
echo que funciona en cualquier computadora Windows.
echo.
pause

echo.
echo [1/5] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    echo Descarga Node.js desde: https://nodejs.org
    pause
    exit /b 1
)

echo ✓ Node.js encontrado
node --version

echo.
echo [2/5] Creando estructura portable...
if not exist "PapaClick-Portable" mkdir "PapaClick-Portable"
if not exist "PapaClick-Portable\node" mkdir "PapaClick-Portable\node"

echo.
echo [3/5] Copiando aplicacion...
xcopy "PMV1" "PapaClick-Portable\app" /E /I /Y >nul
xcopy "node_modules" "PapaClick-Portable\node_modules" /E /I /Y >nul

echo.
echo [4/5] Creando launcher...
echo @echo off > "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo title PapaClick - Sistema de Clasificacion de Papa >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo color 0A >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo cd /d "%%~dp0" >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo echo. >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo echo ================================================================ >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo echo                     PAPACLICK v1.0 >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo echo            Sistema de Clasificacion de Papa con IA >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo echo ================================================================ >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo echo. >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo echo Iniciando servidor... >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo echo. >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo echo Una vez iniciado, accede a: http://localhost:3000 >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo echo. >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo echo Presiona Ctrl+C para detener el servidor >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo echo. >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo node app\app.js >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"
echo pause >> "PapaClick-Portable\INICIAR-PAPACLICK.bat"

echo.
echo [5/5] Creando README...
echo ================================================================ > "PapaClick-Portable\LEEME.txt"
echo                     PAPACLICK v1.0 >> "PapaClick-Portable\LEEME.txt"
echo            Sistema de Clasificacion de Papa con IA >> "PapaClick-Portable\LEEME.txt"
echo ================================================================ >> "PapaClick-Portable\LEEME.txt"
echo. >> "PapaClick-Portable\LEEME.txt"
echo INSTRUCCIONES: >> "PapaClick-Portable\LEEME.txt"
echo. >> "PapaClick-Portable\LEEME.txt"
echo 1. Haz doble clic en "INICIAR-PAPACLICK.bat" >> "PapaClick-Portable\LEEME.txt"
echo 2. Espera a que aparezca "Servidor ejecutandose en puerto 3000" >> "PapaClick-Portable\LEEME.txt"
echo 3. Abre tu navegador y ve a: http://localhost:3000 >> "PapaClick-Portable\LEEME.txt"
echo 4. Para cerrar, presiona Ctrl+C en la ventana negra >> "PapaClick-Portable\LEEME.txt"
echo. >> "PapaClick-Portable\LEEME.txt"
echo REQUISITOS: >> "PapaClick-Portable\LEEME.txt"
echo - Conexion a internet (para base de datos) >> "PapaClick-Portable\LEEME.txt"
echo - Puerto 3000 libre >> "PapaClick-Portable\LEEME.txt"
echo. >> "PapaClick-Portable\LEEME.txt"
echo FUNCIONALIDADES: >> "PapaClick-Portable\LEEME.txt"
echo - Clasificacion automatica de variedades de papa >> "PapaClick-Portable\LEEME.txt"
echo - Inteligencia artificial integrada >> "PapaClick-Portable\LEEME.txt"
echo - Sistema de usuarios y reportes >> "PapaClick-Portable\LEEME.txt"
echo - Base de datos en la nube >> "PapaClick-Portable\LEEME.txt"

echo.
echo ================================================================
echo                  INSTALACION COMPLETADA
echo ================================================================
echo.
echo Tu aplicacion portable esta lista en: PapaClick-Portable\
echo.
echo Para usar:
echo 1. Ve a la carpeta "PapaClick-Portable"
echo 2. Haz doble clic en "INICIAR-PAPACLICK.bat"
echo 3. Accede a: http://localhost:3000
echo.
echo Esta version portable puede copiarse a cualquier computadora
echo que tenga Node.js instalado.
echo.
pause

explorer PapaClick-Portable