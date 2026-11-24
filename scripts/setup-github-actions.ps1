# setup-github-actions.ps1
# Sobe o postbot para o GitHub e configura o Actions (postar sozinho na nuvem).
#
# PRE-REQUISITO: estar logado no GitHub pela CLI (uma vez):
#     gh auth login
#
# USO (na pasta do postbot):
#     powershell -ExecutionPolicy Bypass -File scripts\setup-github-actions.ps1
#
# Opcoes:
#     -Repo postbot          nome do repositorio (padrao: postbot)
#     -Visibilidade public   public (padrao) ou private
#     -NaoTestar             nao dispara um teste apos configurar
param(
  [string]$Repo = "postbot",
  [ValidateSet("public", "private")][string]$Visibilidade = "public",
  [switch]$NaoTestar
)

$ErrorActionPreference = "Continue"
$RAIZ = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location $RAIZ
Write-Host "Pasta: $RAIZ`n"

# --- 1) gh instalado e autenticado? ---------------------------------------
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "gh nao instalado. Rode:  winget install --id GitHub.cli"
}
gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Voce nao esta logado no GitHub. Rode primeiro:  gh auth login"
}
$dono = (gh api user --jq .login).Trim()
$full = "$dono/$Repo"
Write-Host "GitHub: $full  ($Visibilidade)"

# --- 2) cria o repositorio se ainda nao existir ---------------------------
gh repo view $full 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Criando repositorio $full ..."
  gh repo create $full "--$Visibilidade" --description "postbot dos 600 aos 1000 (Facebook + Instagram)"
} else {
  Write-Host "Repositorio ja existe; reaproveitando."
}

# --- 3) git: init, commit, push ------------------------------------------
gh auth setup-git
if (-not (Test-Path ".git")) { git init -b main | Out-Null }
git config user.name  "$dono"
git config user.email "$dono@users.noreply.github.com"

git add -A
git commit -m "postbot: versao para rodar na nuvem (GitHub Actions)" 2>$null | Out-Null

$remoto = "https://github.com/$full.git"
git remote remove origin 2>$null | Out-Null
git remote add origin $remoto
git push -u origin main

# --- 4) segredos: le o .env e grava nos Secrets do repo -------------------
$segredos = @(
  "GEMINI_API_KEY","GEMINI_MODEL","GEMINI_MODELOS",
  "META_PAGE_ID","META_IG_ID","META_PAGE_TOKEN",
  "OFFER_URL","HANDLE"
)
$kv = @{}
Get-Content (Join-Path $RAIZ ".env") | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$') { $kv[$Matches[1]] = $Matches[2].Trim('"').Trim("'") }
}
foreach ($k in $segredos) {
  if ($kv.ContainsKey($k) -and $kv[$k]) {
    gh secret set $k --body $kv[$k] --repo $full | Out-Null
    Write-Host "  secret $k  ok"
  } else {
    Write-Host "  AVISO: $k nao encontrado no .env (pulei)"
  }
}

# --- 5) teste (nao publica) ----------------------------------------------
if (-not $NaoTestar) {
  Write-Host "`nDisparando um teste (dry-run, nao publica)..."
  Start-Sleep -Seconds 10   # o GitHub precisa registrar o workflow recem-enviado
  for ($i = 1; $i -le 3; $i++) {
    gh workflow run postbot.yml --repo $full -f dry=true 2>$null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 5
  }
  Start-Sleep -Seconds 6
  gh run list --repo $full --limit 3
}

Write-Host "`nPRONTO."
Write-Host "Painel do Actions: https://github.com/$full/actions"
Write-Host "Os posts vao sair sozinho: 09:00, 13:00 e 19:00 (Brasilia)."
