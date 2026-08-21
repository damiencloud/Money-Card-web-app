@echo off
title Launch Money Card Full Ecosystem (Backend + Web Admin + Prisma + Flutter)
echo ==================================================
echo    Launching Money Card Full Stack Services...
echo    [1] Backend API (Port 3000)
echo    [2] Prisma Studio (Port 5555)
echo    [3] Frontend Web Admin (Port 5173)
echo    [4] Flutter Staff POS App (Port 5000)
echo ==================================================

powershell -ExecutionPolicy Bypass -File "D:\Money Card Project\start_all.ps1"
pause
