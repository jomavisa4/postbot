#!/usr/bin/env node
// publicar.mjs — publica UM rascunho da fila na Pagina do Facebook e no Instagram.
//
//   node bin/publicar.mjs <id>     publica o rascunho com esse id
//   node bin/publicar.mjs          publica o rascunho mais novo da fila
//   node bin/publicar.mjs --so-ig  publica somente no Instagram
//
// Respeita o que ja foi publicado: se o Facebook ja tiver id salvo, nao republica.
import "../lib/env.mjs";
import { listar } from "../lib/store.mjs";
import { publicarPost } from "../lib/publicar.mjs";

const args = process.argv.slice(2);
const soIg = args.includes("--so-ig");
let id = args.find((a) => !a.startsWith("--"));

if (!id) {
  const rascunhos = await listar({ status: "draft" });
  if (!rascunhos.length) {
    console.error("Nenhum rascunho na fila para publicar.");
    process.exit(1);
  }
  id = rascunhos[0].id; // listar() vem do mais novo para o mais antigo
  console.log(`Rascunho escolhido (mais novo): ${id}`);
}

console.log(`Publicando ${id} ${soIg ? "(somente Instagram)" : "(Facebook + Instagram)"}...`);
try {
  const r = await publicarPost(id, { soInstagram: soIg });
  console.log(`OK  Facebook: ${r.fb || "-"}   Instagram: ${r.ig || "-"}`);
  if (r.erros) console.error("Avisos:", JSON.stringify(r.erros));
} catch (e) {
  console.error("FALHOU:", e.message);
  process.exit(1);
}
