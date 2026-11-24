#!/usr/bin/env node
// autopost.mjs — o bot que posta sozinho, no horario.
//
//   node autopost.mjs             fica rodando e dispara nos horarios de POST_TIMES
//   node autopost.mjs --now       roda UM ciclo agora e sai
//   node autopost.mjs --dry       gera mas NAO publica (mesmo com AUTO_PUBLISH=1)
//   node autopost.mjs --publish   publica neste ciclo (liga o automatico so agora)
//   flags: --count N   --foco "texto"
//
// Resumo do que ele faz em cada disparo:
//   1) a IA escreve o texto e desenha o card;
//   2) se o automatico estiver ligado (AUTO_PUBLISH=1 ou --publish), publica
//      na Pagina do Facebook e no Instagram;
//   3) grava tudo na fila (queue/) para voce conferir depois no painel.
import "./lib/env.mjs";
import { rodarCiclo, autoLigado } from "./lib/auto.mjs";

// ── argumentos ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const tem = (nome) => args.includes(nome);
const val = (nome) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
};

const agora = tem("--now") || tem("--once");
const seco = tem("--dry") || tem("--dry-run");
const forcarPublicar = tem("--publish");
const count = Number(val("--count") || process.env.POSTS_PER_RUN || 1);
const foco = val("--foco");

// --dry vence --publish
const publicar = seco ? false : (forcarPublicar ? true : undefined);

const horarios = (process.env.POST_TIMES || "").split(",").map((s) => s.trim()).filter(Boolean);
const temToken = Boolean(process.env.META_PAGE_TOKEN);

function cabecalho() {
  console.log("");
  console.log("  dos 600 aos 1000 · postbot automatico");
  console.log(`  token da Meta:  ${temToken ? "ok" : "FALTANDO (rode: npm run token <TOKEN>)"}`);
  console.log(`  publicar sozinho: ${autoLigado(publicar) && !seco ? "LIGADO" : "desligado (aprovar no painel)"}`);
  console.log(`  horarios:       ${horarios.length ? horarios.join(", ") : "(nenhum: so roda com --now)"}`);
  console.log(`  posts por disparo: ${Math.max(1, count)}`);
  console.log("");
}

async function ciclo(motivo) {
  const ligado = autoLigado(publicar) && !seco;
  console.log(`[${new Date().toLocaleString("pt-BR")}] ${motivo} — gerando ${Math.max(1, count)} rascunho(s)${ligado ? " + publicando" : ""}`);
  const r = await rodarCiclo({ count, foco, publicar });
  console.log(`  gerados: ${r.gerados.length}/${r.count}   publicados: ${r.publicados.length}`);
  for (const e of r.erros) console.error("  erro:", e);
  if (!r.publicados.length && r.gerados.length) {
    console.log("  (rascunhos na fila — aprove no painel: npm start -> http://localhost:" + (process.env.PORT || 3737) + ")");
  }
  return r;
}

// ── modo 1: uma vez e sai ─────────────────────────────────────────────────────
if (agora) {
  cabecalho();
  const r = await ciclo("ciclo unico");
  process.exitCode = r.erros.length && !r.gerados.length ? 1 : 0;
} else {
  // ── modo 2: daemon nos horarios ─────────────────────────────────────────────
  cabecalho();
  if (!horarios.length) {
    console.error("  Nenhum horario em POST_TIMES. Use --now para um ciclo unico, ou defina POST_TIMES no .env.");
    process.exit(1);
  }
  const jaRodou = new Set();
  console.log("  Rodando… (Ctrl+C para parar)\n");
  setInterval(async () => {
    const d = new Date();
    const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    if (!horarios.includes(hhmm)) return;
    const chave = `${d.toDateString()} ${hhmm}`;
    if (jaRodou.has(chave)) return;
    jaRodou.add(chave);
    try { await ciclo(`hora ${hhmm}`); } catch (e) { console.error("  erro no ciclo:", e.message); }
  }, 30 * 1000);
}
