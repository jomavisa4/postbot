// test-upload.mjs — testa a hospedagem publica da imagem (GitHub ou catbox).
//   node scripts/test-upload.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderCard } from "../lib/card.mjs";
import { publicarImagem } from "../lib/images.mjs";
import { RAIZ } from "../lib/env.mjs";

const out = join(RAIZ, "out");
mkdirSync(out, { recursive: true });
const png = await renderCard({
  kicker: "teste de upload",
  headline: "Essa imagem deve abrir pelo link",
  destaque: "abrir pelo link",
  support: "Se o link abrir a imagem, o Instagram vai conseguir baixa-la.",
  tags: ["teste"],
  cta: "Corrigir grátis agora",
  handle: "@dos600aos1000",
});
const arquivo = join(out, "teste-upload.png");
writeFileSync(arquivo, png);

console.log("Enviando...");
const url = await publicarImagem(arquivo, `teste-upload-${Date.now()}`);
console.log("URL publica:", url);

const res = await fetch(url);
console.log("status:", res.status, "| content-type:", res.headers.get("content-type"), "| bytes:", (await res.arrayBuffer()).byteLength);
