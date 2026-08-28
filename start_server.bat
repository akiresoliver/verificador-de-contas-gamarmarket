@echo off
title Servidor Local GamerMarket
echo ==================================================
echo   Iniciando Servidor Local GamerMarket...
echo ==================================================
echo.
echo   [!] Acesse no seu navegador:
echo   - Site de Verificacao: http://localhost:8000
echo   - Painel Administrador: http://localhost:8000/admin.html
echo.
echo ==================================================
echo Para fechar o servidor, feche esta janela ou aperte Ctrl+C.
echo ==================================================
echo.
python -m http.server 8000
