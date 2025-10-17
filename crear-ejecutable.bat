@echo off
echo ======================================
echo  CREANDO EJECUTABLE PAPACLICK v1.0
echo ======================================
echo.

echo [1/4] Copiando archivos necesarios...
if not exist "dist\assets" mkdir "dist\assets"
xcopy "PMV1\public" "dist\assets\public" /E /I /Y >nul
xcopy "PMV1\vista" "dist\assets\vista" /E /I /Y >nul
xcopy "PMV1\web_model" "dist\assets\web_model" /E /I /Y >nul
if not exist "dist\assets\uploads" mkdir "dist\assets\uploads"

echo [2/4] Copiando dependencias de Sharp...
if not exist "dist\sharp" mkdir "dist\sharp"
xcopy "node_modules\sharp\build" "dist\sharp\build" /E /I /Y >nul
xcopy "node_modules\sharp\vendor" "dist\sharp\vendor" /E /I /Y >nul

echo [3/4] Generando ejecutable...
pkg PMV1/app.js --targets node16-win-x64 --out-path dist --compress GZip

echo [4/4] Creando launcher...
echo @echo off > "dist\PapaClick.bat"
echo cd /d "%%~dp0" >> "dist\PapaClick.bat"
echo echo ====================================== >> "dist\PapaClick.bat"
echo echo   PAPACLICK - Sistema de Clasificacion >> "dist\PapaClick.bat"  
echo echo   de Variedades de Papa con IA >> "dist\PapaClick.bat"
echo echo ====================================== >> "dist\PapaClick.bat"
echo echo. >> "dist\PapaClick.bat"
echo echo Iniciando servidor... >> "dist\PapaClick.bat"
echo echo Accede a: http://localhost:3000 >> "dist\PapaClick.bat"
echo echo. >> "dist\PapaClick.bat"
echo app.exe >> "dist\PapaClick.bat"
echo pause >> "dist\PapaClick.bat"

echo.
echo ======================================
echo  EJECUTABLE CREADO EXITOSAMENTE!
echo ======================================
echo.
echo Ubicacion: dist\
echo Ejecutar: dist\PapaClick.bat
echo URL: http://localhost:3000
echo.
pause