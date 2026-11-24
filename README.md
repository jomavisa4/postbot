# postbot — IA que cria e publica posts no Facebook e Instagram

Cria posts do **dos 600 aos 1000** (texto + card 1080×1350) com a IA do Gemini e
publica na **Página do Facebook** e no **Instagram** via API oficial da Meta.

Você **aprova antes de publicar**: a IA gera os rascunhos, eles ficam numa fila e
você decide o que sai.

```
  gerar (IA)          fila            você            publicar
 ┌──────────┐    ┌────────────┐   ┌─────────┐   ┌──────────────────┐
 │ Gemini   │ -> │ rascunhos  │ -> │ painel  │ -> │ Facebook +       │
 │ texto+card│    │ em disco   │    │ local   │    │ Instagram (API)  │
 └──────────┘    └────────────┘   └─────────┘   └──────────────────┘
```

---

## 1. Instalar

```powershell
cd "C:\Users\jomav\Documents\Projeto Padrão\postbot"
npm install
```

O `.env` já vem com a sua chave do Gemini e os IDs da Página e do Instagram.

---

## 2. Ligar a publicação (token da Meta)

O token é o que autoriza o robô a publicar **sem você estar logado**. A melhor
forma é um **token de usuário do sistema** (não expira):

1. Abra `business.facebook.com/settings` → **Usuários** → **Usuários do sistema**.
2. **Adicionar** → nome `postbot`, função **Administrador**.
3. **Adicionar ativos** → marque a Página `dos 600 aos 1000` (e o Instagram).
4. **Gerar novo token** marcando estas permissões:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
   `business_management`, `instagram_basic`, `instagram_content_publish`.
5. Cole o token no comando abaixo (ele descobre a Página e o Instagram sozinhos):

```powershell
npm run token COLE_O_TOKEN_AQUI
```

> Alternativa rápida (o token expira em ~1 hora, serve para testar):
> `developers.facebook.com/tools/explorer` → escolha o app → marque as mesmas
> permissões → **Generate Access Token** → `npm run token <token>`.

O comando salva o **token de Página** no `.env` (`META_PAGE_TOKEN`). Confira no
painel: o topo deve mostrar **token ok**.

---

## 3. Usar

```powershell
npm start          # abre o painel: http://localhost:3737
```

No painel:
- **+ Gerar 3** cria 3 rascunhos novos (IA escreve o texto e desenha o card).
- Cada rascunho mostra o card, a legenda (editável) e 3 botões:
  - **Aprovar e publicar** → publica no Facebook **e** no Instagram;
  - **Salvar texto** → guarda a legenda sem publicar;
  - **Descartar** → tira da fila.

Também dá para gerar pelo terminal, sem abrir o painel:

```powershell
npm run gerar1                       # 1 rascunho
node generate.mjs --count 3          # 3 rascunhos
node generate.mjs --foco "competência 5"
```

Para publicar um rascunho pelo terminal (sem abrir o painel):

```powershell
npm run publicar                      # publica o rascunho mais NOVO da fila (FB + IG)
node bin/publicar.mjs <id>            # publica um rascunho específico
node bin/publicar.mjs --so-ig <id>    # publica somente no Instagram
```

---

## 4. Publicar automaticamente (o bot que posta sozinho)

Por padrão o bot **gera** os rascunhos e espera você clicar em **Aprovar e
publicar**. Para ele **publicar sozinho**, ligue o modo automático: no `.env`,
`AUTO_PUBLISH=1` (ou use o botão **Auto** no topo do painel).

Com o automático ligado, a cada horário de `POST_TIMES` ele:

1. a IA escreve o texto e desenha o card;
2. publica na **Página do Facebook** e no **Instagram** (via token);
3. guarda tudo na fila para você conferir depois.

### Rodar o bot pela linha de comando

```powershell
npm run auto          # fica rodando e dispara nos horários de POST_TIMES
npm run auto-now      # roda UM ciclo agora e sai
npm run auto-dry      # gera mas NÃO publica (teste)
node autopost.mjs --now --publish          # publica este ciclo agora
node autopost.mjs --count 3 --foco "competência 3"
```

### Deixar o bot ligado 24h (Windows) — já configurado

Existe uma tarefa agendada chamada **postbot-auto** que:
- inicia o bot no **logon**; e
- confere **a cada 15 min** se ele ainda está rodando (se cair, religa).

Ela chama o `ensure-auto.vbs`, que sobe o `autopost.mjs` **sem abrir janela** e
grava o log em `logs\auto.log`. O bot respeita os horários de `POST_TIMES`.

```powershell
# ver o estado
schtasks /Query /TN "postbot-auto" /V /FO LIST

# pausar (impede o vigia de religar) e matar o processo atual
Disable-ScheduledTask -TaskName "postbot-auto" -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*autopost.mjs*' } | ForEach-Object { Stop-Process -Id $_.ProcessId }

# voltar a ligar
Enable-ScheduledTask -TaskName "postbot-auto"

# remover de vez
Unregister-ScheduledTask -TaskName "postbot-auto" -Confirm:$false
```

Para “ligar na mão” a qualquer momento, dê dois cliques em `ensure-auto.vbs`
ou rode `npm run auto` numa janela.

> **Trava de segurança:** nada é publicado sem `AUTO_PUBLISH=1` (ou `--publish`).
> Se o token faltar, o bot gera os rascunhos e avisa, sem publicar.

### Alternativa: só gerar (sem publicar)

Deixe `POST_TIMES` no `.env` e o painel aberto (`npm start`): ele gera nos
horários e você aprova no painel quando quiser.

---

## 5. Estúdio de cards (o seu gerador visual)

Além dos cards automáticos da IA, o robô serve o seu **Estúdio de Automação
Social** dentro do painel, no mesmo endereço — assim você monta o card com os
seus layouts (v5.0 Editorial Design) e publica direto no Facebook + Instagram,
sem exportar imagem nem abrir nada por fora.

```powershell
npm start          # painel: http://localhost:3737
```

No topo do painel clique em **🎨 Abrir Estúdio** (ou vá direto em
`http://localhost:3737/estudio`). Lá você:

1. compõe o card (título, legenda, imagens, formato 4:5/1:1/Story);
2. marca **Instagram** e/ou **Facebook**;
3. clica em **Publicar** (o botão verde).

O Estúdio já vem apontado para o endpoint local (`/api/social/publish`) — a
configuração do webhook é injetada automaticamente, então **não** precisa mexer
em nada. Ao publicar, o post entra na fila (`queue/`) com `origem: "estudio"`,
sobe a imagem, publica nos dois canais e volta com os links no painel.

> O token da Meta usado é o mesmo do `postbot` (do `.env`). Você **não** precisa
> preencher `metaToken`/IDs dentro do Estúdio.

### Atualizar o Estúdio (quando você editar o HTML)

Sempre que mexer no arquivo do Estúdio, reinstale a cópia que o robô serve:

```powershell
npm run estudio                                          # usa o arquivo em Downloads
node scripts/install-estudio.mjs "C:\caminho\estudio.html"   # ou aponte o arquivo
```

Isso copia o HTML para `public/estudio.html` e reinjeta o endpoint. Depois é só
recarregar a página `/estudio`.

---

## 6. Postar sozinho na nuvem (GitHub Actions) — sem depender do PC

O modo da seção 4 roda **no seu PC** (tarefa do Windows). Se o PC estiver
desligado, os horários se perdem. Para continuar postando **com o PC desligado**,
use o **GitHub Actions**: o bot roda 3×/dia num servidor do GitHub, de graça.

Arquivos já prontos no projeto:

- `.github/workflows/postbot.yml` — o agendamento (09:00, 13:00, 19:00 BRT).
- `ci/fonts.conf` + `assets/fonts/*.ttf` — no Linux não existe **Segoe UI**;
  o bot troca pela **Selawik** (mesma métrica) para o card sair igual ao do PC.
- `scripts/setup-github-actions.ps1` — cria o repositório, sobe o código e
  grava os segredos do `.env` nos **Secrets** do Actions.

### Passo a passo (uma vez)

```powershell
# 1. instala a CLI do GitHub (só se ainda não tiver)
winget install --id GitHub.cli

# 2. entra na sua conta do GitHub (abre o navegador)
gh auth login

# 3. na pasta do postbot, cria o repo e configura tudo
powershell -ExecutionPolicy Bypass -File scripts\setup-github-actions.ps1
```

O script cria um repositório **público** chamado `postbot`, sobe o código e
grava em *Settings → Secrets and variables → Actions*: `GEMINI_API_KEY`,
`GEMINI_MODEL`, `GEMINI_MODELOS`, `META_PAGE_ID`, `META_IG_ID`,
`META_PAGE_TOKEN`, `OFFER_URL`, `HANDLE`. Nenhum segredo vai para o código.

> Quer o código **privado**? Rode com `-Visibilidade private`. Nesse caso a
> imagem do post precisa de um repositório público separado (ex.
> `dos600aos1000-posts`) e um token de acesso — me chame que eu configuro.

### Depois

- Acompanhe/force uma execução em **github.com/SEU_USUARIO/postbot/actions**
  (o botão *Run workflow* permite um teste em *dry-run*, que **não** publica).
- Cada execução também sobe o card gerado como **artefato** (`cards`), para
  você conferir pelo celular.
- Horários são em **UTC** no arquivo: 12:00, 16:00 e 22:00 = 09:00, 13:00 e
  19:00 de Brasília.

> Observações do Actions: o cron pode atrasar alguns minutos e o GitHub
> desativa agendamentos após ~60 dias sem atividade no repositório — como o bot
> faz um *commit* da imagem a cada post, o repo nunca fica parado.

---

## Como funciona por dentro (arquivos)

| Arquivo | Papel |
|---|---|
| `server.mjs` | painel local de aprovação + agendador interno + interruptor Auto |
| `autopost.mjs` | o bot que posta sozinho (daemon nos horários ou `--now`) |
| `generate.mjs` | gera rascunhos pelo terminal |
| `lib/auto.mjs` | motor do modo automático: gera e (se ligado) publica um ciclo |
| `lib/redigir.mjs` | prompt e schema: a IA escreve o texto e o card |
| `lib/gemini.mjs` | chamada ao Gemini com fila de modelos (se um esgota, usa o próximo) |
| `lib/card.mjs` | desenha o card 1080×1350 (SVG → PNG via `sharp`) |
| `lib/publicar.mjs` | publica no Facebook e no Instagram |
| `lib/meta.mjs` | Graph API (token, publicar) |
| `lib/images.mjs` | deixa a imagem com URL pública (GitHub ou catbox) |
| `lib/store.mjs` | a fila de rascunhos (um JSON por post em `queue/`) |
| `bin/setup-token.mjs` | descobre Página/Instagram e salva o token |
| `bin/publicar.mjs` | publica um rascunho da fila pelo terminal (FB + IG) |
| `lib/publicar.mjs` | `publicarPost` (card da IA) e `publicarMidia` (imagem pronta do Estúdio) |
| `server.mjs` (`/estudio`) | serve o Estúdio e o endpoint `POST /api/social/publish` |
| `public/estudio.html` | cópia do seu Estúdio servida em `/estudio` (endpoint injetado) |
| `scripts/install-estudio.mjs` | instala/atualiza `public/estudio.html` a partir do seu HTML |
| `ensure-auto.vbs` | vigia: mantém o bot rodando escondido (usado pela tarefa do Windows) |
| `scripts/demo-card.mjs` | desenha cards de exemplo, sem IA |
| `scripts/rerender.mjs` | redesenha as imagens da fila depois de mudar o visual |
| `.github/workflows/postbot.yml` | agendamento na nuvem (GitHub Actions): 3×/dia, sem o PC ligado |
| `ci/fonts.conf` + `assets/fonts/` | fonte Selawik (compatível com Segoe UI) usada no CI/Linux |
| `scripts/setup-github-actions.ps1` | cria o repo, sobe o código e grava os Secrets do Actions |

---

## Detalhes e limites (importante)

- **Instagram exige imagem em URL pública.** O Instagram não recebe arquivo:
  ele baixa a imagem de um link. O `postbot` publica a imagem automaticamente e
  passa o link. Hoje ele usa o **catbox.moe** (funciona sem configurar nada).
  Para usar um repositório seu no GitHub como hospedagem (mais estável),
  crie um repositório **público** `dos600aos1000-posts` e pronto — o robô passa a
  usar ele sozinho (as chaves `PUBLIC_IMAGE_REPO`/`PUBLIC_IMAGE_BASE` do `.env`
  já apontam para lá).
- **Limite do Instagram:** 25 publicações a cada 24h por conta. Com 2–3 por dia,
  não há risco.
- **Token:** o token de usuário do sistema **não expira**. Se usar o token do
  Graph API Explorer, ele expira em ~1h — sirva-se do usuário do sistema.
- **Modo de desenvolvimento do app:** funciona para as **suas** contas. Para um
  app público (postar em contas de terceiros) a Meta exige revisão (App Review).
- **Nada é publicado por acidente.** Sem `AUTO_PUBLISH=1`, o bot só gera e você
  publica clicando em “Aprovar e publicar”. Com o automático ligado, ele publica
  sozinho apenas nos horários que você definiu.
