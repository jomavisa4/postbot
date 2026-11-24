@echo off
rem Gera rascunhos de post. Uso:  gerar.bat        (usa POSTS_PER_RUN)
rem                             gerar.bat --count 3
cd /d "%~dp0"
node generate.mjs %*
