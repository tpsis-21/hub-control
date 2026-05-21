@echo off
title Hub Control - Recuperar Supabase
cd /d "%~dp0.."
echo.
echo  Executando recuperacao... (a janela NAO deve fechar sozinha)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0recuperar-supabase.ps1"
echo.
echo  === Fim ===
pause
