@echo off 
title PapaClick - Sistema de Clasificacion de Papa 
color 0A 
cd /d "%~dp0" 
echo. 
echo ================================================================ 
echo                     PAPACLICK v1.0 
echo            Sistema de Clasificacion de Papa con IA 
echo ================================================================ 
echo. 
echo Iniciando servidor... 
echo. 
echo Una vez iniciado, accede a: http://localhost:3000 
echo. 
echo Presiona Ctrl+C para detener el servidor 
echo. 
node app\app.js 
pause 
