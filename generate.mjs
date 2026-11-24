#!/usr/bin/env node
// generate.mjs — cria rascunhos de post (texto + card) e guarda na fila.
//
//   node generate.mjs                 (usa POSTS_PER_RUN do .env)
//   node generate.mjs --count 3
//   node generate.mjs --foco "erro comum na competencia 3"
import { criarRascunho } from "./lib/criar.mjs";
import { listar } from "./lib/store.mjs";

const args = process.argv.slice(2);
const val = (nome) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
};

const count = Math.max(1, Number(val("--count") || process.env.POSTS_PER_RUN || 1));
const foco = val("--foco");

console.log(`Gerando ${count} rascunho(s)${foco ? ` (foco: ${foco})` : ""}...`);
const feitos = [];
for (let i = 0; i < count; i++) {
  try {
    const p = await criarRascunho({ foco });
    console.log(`  ok  ${p.id}  [${p.modelo}]  "${p.card.headline}"`);
    feitos.push(p);
  } catch (e) {
    console.error(`  erro no rascunho ${i + 1}: ${e.message}`);
  }
}

const pendentes = (await listar({ status: "draft" })).length;
console.log(`\nProntos: ${feitos.length}. Na fila aguardando aprovacao: ${pendentes}.`);
if (feitos.length) console.log("Abra o painel para aprovar:  npm start  ->  http://localhost:" + (process.env.PORT || 3737));
if (!feitos.length) process.exitCode = 1;
