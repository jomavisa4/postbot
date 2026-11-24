#!/usr/bin/env node
// server.mjs — painel local de aprovacao. Voce ve os rascunhos, aprova (publica
// no Facebook + Instagram) ou descarta. Tambem pode gerar novos na hora.
//
//   npm start   ->  http://localhost:3737
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { listar, ler, atualizar, salvar, novoId, caminhoImagem, DIR, garantirPastas } from "./lib/store.mjs";
import { criarRascunho, legendaFinal } from "./lib/criar.mjs";
import { publicarPost, publicarMidia } from "./lib/publicar.mjs";
import { rodarCiclo, autoLigado } from "./lib/auto.mjs";
import { salvarEnv, RAIZ } from "./lib/env.mjs";

const PORT = Number(process.env.PORT || 3737);
garantirPastas();

// HTML do Estudio (gerador de cards) servido em /estudio. Instale/atualize com:
//   node scripts/install-estudio.mjs "C:\caminho\estudio.html"
const ESTUDIO_ARQ = join(RAIZ, "public", "estudio.html");

// ── helpers de HTTP ───────────────────────────────────────────────────────────
function json(res, code, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(b);
}
function corpo(req) {
  return new Promise((r) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => {
      try { r(d ? JSON.parse(d) : {}); } catch { r({}); }
    });
  });
}

function estado() {
  return {
    temToken: Boolean(process.env.META_PAGE_TOKEN),
    pageId: process.env.META_PAGE_ID,
    igId: process.env.META_IG_ID,
    offerUrl: process.env.OFFER_URL,
    times: (process.env.POST_TIMES || "").split(",").map((s) => s.trim()).filter(Boolean),
    postsPerRun: Number(process.env.POSTS_PER_RUN || 1),
    autoPublish: autoLigado(),
  };
}

// ── API ───────────────────────────────────────────────────────────────────────
async function api(req, res, url) {
  const rota = url.pathname;

  if (req.method === "GET" && rota === "/api/state") {
    return json(res, 200, { config: estado(), posts: await listar() });
  }

  if (req.method === "POST" && rota === "/api/generate") {
    const { count = 1, foco } = await corpo(req);
    const feitos = [];
    const erros = [];
    for (let i = 0; i < Math.min(Math.max(1, count), 5); i++) {
      try { feitos.push(await criarRascunho({ foco })); }
      catch (e) { erros.push(e.message); }
    }
    return json(res, 200, { ok: feitos.length > 0, gerados: feitos.length, erros });
  }

  if (req.method === "POST" && rota === "/api/save") {
    const { id, caption } = await corpo(req);
    return json(res, 200, { ok: true, post: atualizar(id, { caption }) });
  }

  if (req.method === "POST" && rota === "/api/reject") {
    const { id } = await corpo(req);
    return json(res, 200, { ok: true, post: atualizar(id, { status: "rejected" }) });
  }

  if (req.method === "POST" && rota === "/api/approve") {
    const { id, caption } = await corpo(req);
    if (caption) atualizar(id, { caption });
    try {
      const r = await publicarPost(id);
      return json(res, 200, { ok: true, ...r });
    } catch (e) {
      return json(res, 500, { ok: false, erro: e.message });
    }
  }

  if (req.method === "POST" && rota === "/api/retry") {
    const { id } = await corpo(req);
    try {
      const r = await publicarPost(id);
      return json(res, 200, { ok: true, ...r });
    } catch (e) {
      return json(res, 500, { ok: false, erro: e.message });
    }
  }

  // Liga/desliga a publicacao automatica (grava AUTO_PUBLISH no .env).
  if (req.method === "POST" && rota === "/api/auto") {
    const { ligado } = await corpo(req);
    salvarEnv({ AUTO_PUBLISH: ligado ? "1" : "0" });
    return json(res, 200, { ok: true, autoPublish: autoLigado() });
  }

  // Publica de uma vez todos os rascunhos pendentes (ex.: depois de gerar varios).
  if (req.method === "POST" && rota === "/api/publish-all") {
    const pendentes = await listar({ status: "draft" });
    const publicados = [], erros = [];
    for (const p of pendentes) {
      try { await publicarPost(p.id); publicados.push(p.id); }
      catch (e) { erros.push(`${p.id}: ${e.message}`); }
    }
    return json(res, 200, { ok: publicados.length > 0, publicados: publicados.length, erros });
  }

  // Publicacao direta do Estudio: recebe a imagem do canvas (data URL) + legenda
  // e publica no Facebook e/ou Instagram. As plataformas vem como "FB" e "IG".
  if (req.method === "POST" && rota === "/api/social/publish") {
    const body = await corpo(req);
    const dataUrl = String(body.imageBase64 || "");
    const m = /^data:image\/(?:png|jpe?g);base64,(.+)$/is.exec(dataUrl);
    if (!m) return json(res, 400, { ok: false, erro: "imageBase64 ausente ou invalido (esperado data:image/png;base64,...)." });

    const marcadas = Array.isArray(body.platforms) ? body.platforms.map((p) => String(p).toUpperCase()) : [];
    const plataformas = {
      fb: !marcadas.length || marcadas.includes("FB") || marcadas.includes("FACEBOOK"),
      ig: !marcadas.length || marcadas.includes("IG") || marcadas.includes("INSTAGRAM"),
    };

    const buf = Buffer.from(m[1], "base64");
    const id = novoId();
    writeFileSync(caminhoImagem(id), buf);

    const caption = String(body.caption || "");
    // Registro na fila — aparece no painel e guarda os links publicados.
    salvar({
      id,
      criadoEm: new Date().toISOString(),
      origem: "estudio",
      status: "draft",
      card: { tema: String(body.title || "Post do Estudio") },
      caption,
      imagem: `img/${id}.png`,
      plataformas,
    });

    if (body.dryRun) {
      return json(res, 200, { ok: true, dryRun: true, id, plataformas, bytes: buf.length });
    }

    try {
      const r = await publicarMidia({ id, caption, plataformas });
      return json(res, 200, { id, ...r });
    } catch (e) {
      return json(res, 500, { ok: false, erro: e.message });
    }
  }

  return json(res, 404, { erro: "rota nao encontrada" });
}

// ── servidor ──────────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith("/api/")) {
    try { return await api(req, res, url); }
    catch (e) { return json(res, 500, { erro: e.message }); }
  }

  if (url.pathname.startsWith("/img/")) {
    const f = join(DIR, "img", url.pathname.slice(5).replace(/[^a-zA-Z0-9._-]/g, ""));
    if (existsSync(f)) {
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" });
      return res.end(readFileSync(f));
    }
    res.writeHead(404); return res.end("nao encontrado");
  }

  // Estudio (gerador de cards) servido do mesmo origin do painel.
  if (url.pathname === "/estudio" || url.pathname === "/estudio.html") {
    if (existsSync(ESTUDIO_ARQ)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(readFileSync(ESTUDIO_ARQ));
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("estudio.html nao encontrado. Rode: node scripts/install-estudio.mjs");
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(PAGINA);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  Painel do postbot:  http://localhost:${PORT}`);
  console.log(`  Token da Meta: ${process.env.META_PAGE_TOKEN ? "configurado" : "FALTANDO (rode: npm run token <TOKEN>)"}`);
  console.log(`  Horarios automaticos: ${process.env.POST_TIMES || "-"}  (${process.env.POSTS_PER_RUN || 1}/disparo)\n`);
});

// ── agendador interno (roda enquanto o painel estiver aberto) ─────────────────
const horarios = (process.env.POST_TIMES || "").split(",").map((s) => s.trim()).filter(Boolean);
const jaRodou = new Set();
setInterval(async () => {
  if (!horarios.length) return;
  const d = new Date();
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (!horarios.includes(hhmm)) return;
  const chave = `${d.toDateString()} ${hhmm}`;
  if (jaRodou.has(chave)) return;
  jaRodou.add(chave);
  const count = Math.max(1, Number(process.env.POSTS_PER_RUN || 1));
  const ligado = autoLigado();
  console.log(`[agenda] ${hhmm} — gerando ${count} rascunho(s)${ligado ? " + publicando" : ""}`);
  try { await rodarCiclo({ count, publicar: ligado }); } catch (e) { console.error("[agenda] erro:", e.message); }
}, 30 * 1000);

// ── a pagina (HTML) ───────────────────────────────────────────────────────────
const PAGINA = String.raw`<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>postbot · dos 600 aos 1000</title>
<style>
  :root{--azul:#2340D3;--azul-esc:#13257E;--verm:#E2342D;--off:#F4F6FB;--cinza:#4A5579;--borda:#e3e8f5}
  *{box-sizing:border-box}
  body{margin:0;font-family:'Segoe UI',Arial,sans-serif;background:var(--off);color:var(--azul-esc)}
  header{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--borda);padding:14px 22px;display:flex;align-items:center;gap:14px;z-index:5}
  header h1{font-size:19px;margin:0;font-weight:800}
  header h1 span{color:var(--verm)}
  header .sub{color:var(--cinza);font-size:13px}
  header .sp{flex:1}
  button{font-family:inherit;cursor:pointer;border:0;border-radius:10px;font-weight:700;font-size:14px;padding:10px 16px}
  .b-azul{background:var(--azul);color:#fff}
  .b-verm{background:var(--verm);color:#fff}
  .b-ghost{background:#eef2fd;color:var(--azul)}
  .b-mini{padding:7px 12px;font-size:13px}
  button:disabled{opacity:.5;cursor:default}
  .aviso{background:#fff4e5;border:1px solid #ffd8a8;color:#8a5200;padding:12px 16px;border-radius:12px;margin:16px 22px;font-size:14px}
  .aviso a{color:#8a5200}
  main{padding:18px 22px 80px;display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start}
  .card{background:#fff;border:1px solid var(--borda);border-radius:16px;width:400px;overflow:hidden;box-shadow:0 2px 10px rgba(19,37,126,.05)}
  .card img{width:100%;display:block;background:#eef2fd}
  .card .body{padding:14px 16px 16px}
  .meta{font-size:12px;color:var(--cinza);display:flex;gap:10px;align-items:center;margin-bottom:8px}
  .pill{padding:3px 9px;border-radius:999px;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
  .pill.draft{background:#e8f0ff;color:var(--azul)}
  .pill.published{background:#e6f7ec;color:#1a7f43}
  .pill.rejected{background:#fdeaea;color:var(--verm)}
  .pill.erro{background:#fdeaea;color:var(--verm)}
  textarea{width:100%;min-height:150px;border:1px solid var(--borda);border-radius:10px;padding:10px;font-family:inherit;font-size:13px;color:var(--azul-esc);resize:vertical}
  .acoes{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
  .links{margin-top:10px;font-size:13px;color:var(--cinza)}
  .links a{color:var(--azul);font-weight:700;text-decoration:none}
  .erro-txt{color:var(--verm);font-size:12px;margin-top:8px;word-break:break-word}
  .vazio{color:var(--cinza);padding:40px 22px;width:100%;text-align:center}
  .spin{display:inline-block;width:14px;height:14px;border:2px solid #fff6;border-top-color:#fff;border-radius:50%;animation:g .7s linear infinite;vertical-align:-2px;margin-right:6px}
  @keyframes g{to{transform:rotate(360deg)}}
</style></head><body>
<header>
  <h1>dos 600 aos <span>1000</span> · postbot</h1>
  <div class="sub" id="sub"></div>
  <div class="sp"></div>
  <button class="b-azul" onclick="location.href='/estudio'">🎨 Abrir Estúdio</button>
  <button class="b-ghost" onclick="publicarTodos()">Publicar pendentes</button>
  <button class="b-ghost" id="btnAuto" onclick="toggleAuto()">Auto: off</button>
  <button class="b-ghost" onclick="gerar(1)">+ Gerar 1</button>
  <button class="b-azul" onclick="gerar(3)">+ Gerar 3</button>
</header>
<div id="aviso"></div>
<main id="lista"><div class="vazio">Carregando…</div></main>

<script>
let estado = { config:{}, posts:[] };
const esc = s => String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = iso => { try { return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); } catch { return ''; } };

async function carregar(){ estado = await (await fetch('/api/state')).json(); render(); }

function render(){
  const c = estado.config;
  document.getElementById('sub').textContent =
    (c.temToken ? 'token ok' : 'FALTA token') + ' · pagina ' + (c.pageId||'?') + ' · ig ' + (c.igId||'?') +
    (c.times.length ? ' · horarios ' + c.times.join(', ') : '') +
    (c.autoPublish ? ' · PUBLICANDO SOZINHO' : ' · aprovacao manual');
  const bA = document.getElementById('btnAuto');
  if(bA){ bA.textContent = 'Auto: ' + (c.autoPublish ? 'ON' : 'off'); bA.className = c.autoPublish ? 'b-verm' : 'b-ghost'; }
  document.getElementById('aviso').innerHTML = c.temToken ? '' :
    '<div class="aviso"><b>Falta o token da Meta.</b> Gere um token com as permissoes pages_manage_posts e instagram_content_publish e rode no terminal:<br><code>npm run token &lt;SEU_TOKEN&gt;</code> — depois reinicie o painel.</div>';

  const lista = document.getElementById('lista');
  if(!estado.posts.length){ lista.innerHTML = '<div class="vazio">Nenhum post ainda. Clique em “Gerar 3”.</div>'; return; }

  lista.innerHTML = estado.posts.map(p=>{
    const st = p.status;
    const links = [];
    if(p.fbPostId) links.push('<a target="_blank" href="https://www.facebook.com/'+esc(p.fbPostId)+'">Facebook ok</a>');
    if(p.igPostId) links.push('<a target="_blank" href="https://www.instagram.com/p/">Instagram ok</a>');
    const podeAprovar = (st==='draft' || st==='erro');
    return '<div class="card" data-id="'+esc(p.id)+'">'
      + '<img src="/img/'+esc(p.id)+'.png" alt="">'
      + '<div class="body">'
      + '<div class="meta"><span class="pill '+st+'">'+st+'</span><span>'+fmt(p.criadoEm)+'</span><span>· '+esc(p.card?p.card.tema:'')+'</span></div>'
      + '<textarea id="txt-'+esc(p.id)+'" '+(podeAprovar?'':'disabled')+'>'+esc(p.caption||'')+'</textarea>'
      + (p.erros? '<div class="erro-txt">'+esc(JSON.stringify(p.erros))+'</div>' : '')
      + (links.length? '<div class="links">'+links.join(' · ')+'</div>' : '')
      + '<div class="acoes">'
      + (podeAprovar
          ? '<button class="b-verm" onclick="aprovar(\''+p.id+'\',this)">Aprovar e publicar</button>'
            + '<button class="b-ghost b-mini" onclick="salvar(\''+p.id+'\')">Salvar texto</button>'
            + '<button class="b-ghost b-mini" onclick="rejeitar(\''+p.id+'\')">Descartar</button>'
          : '')
      + '</div></div></div>';
  }).join('');
}

async function gerar(n){
  toastBtn(event && event.target, true);
  const r = await (await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({count:n})})).json();
  if(r.erros && r.erros.length) alert('Alguns rascunhos falharam:\n'+r.erros.join('\n'));
  await carregar();
}
async function toggleAuto(){
  const ligar = !estado.config.autoPublish;
  if(ligar && !confirm('Ligar a PUBLICACAO AUTOMATICA?\n\nO bot vai gerar e publicar sozinho nos horarios de POST_TIMES, sem voce clicar. Continuar?')) return;
  await fetch('/api/auto',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ligado:ligar})});
  await carregar();
}
async function publicarTodos(){
  const n = estado.posts.filter(p=>(p.status==='draft'||p.status==='erro')).length;
  if(!n) return alert('Nenhum rascunho pendente.');
  if(!confirm('Publicar '+n+' rascunho(s) agora no Facebook + Instagram?')) return;
  const r = await (await fetch('/api/publish-all',{method:'POST'})).json();
  if(r.erros && r.erros.length) alert('Alguns falharam:\n'+r.erros.join('\n'));
  await carregar();
}
async function salvar(id){
  const caption = document.getElementById('txt-'+id).value;
  await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,caption})});
  await carregar();
}
async function rejeitar(id){
  if(!confirm('Descartar este rascunho?')) return;
  await fetch('/api/reject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
  await carregar();
}
async function aprovar(id, btn){
  const caption = document.getElementById('txt-'+id).value;
  btn.disabled = true;
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="spin"></span>Publicando…';
  const r = await (await fetch('/api/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,caption})})).json();
  btn.innerHTML = orig;
  if(!r.ok){ alert('Falhou:\n'+r.erro); btn.disabled=false; }
  await carregar();
}
function toastBtn(el, on){ if(el){ el.disabled = on; } }

carregar();
setInterval(carregar, 30000);
</script>
</body></html>`;
