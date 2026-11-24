// rerender.mjs — redesenha as imagens dos rascunhos a partir do JSON salvo.
// Util depois de ajustar o visual do card, sem precisar gerar texto novo.
//   node scripts/rerender.mjs
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { renderCard } from "../lib/card.mjs";
import { listar, caminhoImagem } from "../lib/store.mjs";

const posts = await listar();
for (const p of posts) {
  if (!p.card) continue;
  const png = await renderCard({
    kicker: p.card.kicker,
    headline: p.card.headline,
    destaque: p.card.destaque,
    support: p.card.support,
    tags: p.card.tags,
    cta: p.card.cta,
    handle: process.env.HANDLE,
  });
  const arquivo = caminhoImagem(p.id);
  writeFileSync(arquivo, png);
  const meta = await sharp(arquivo).metadata();
  console.log(`${p.id}  ${meta.width}x${meta.height}  ${(png.length / 1024).toFixed(0)} KB`);
}
console.log("pronto.");
