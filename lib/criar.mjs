// criar.mjs — junta redacao (IA) + card (PNG) num rascunho salvo na fila.
import { writeFileSync } from "node:fs";
import { redigirPost } from "./redigir.mjs";
import { renderCard } from "./card.mjs";
import { novoId, salvar, caminhoImagem, listar, garantirPastas } from "./store.mjs";

/** Monta a legenda final que vai para o Facebook e o Instagram. */
export function legendaFinal(post) {
  const oferta = process.env.OFFER_URL || "https://dos600aos1000.onrender.com";
  const handle = process.env.HANDLE || "@dos600aos1000";
  const tags = (post.hashtags || []).join(" ");
  return `${(post.caption || "").trim()}\n\n👉 Corrija sua redação de graça: ${oferta}\n\n${handle}  ${tags}`.trim();
}

export async function criarRascunho({ foco } = {}) {
  garantirPastas();
  const usados = (await listar()).map((p) => p.card?.tema).filter(Boolean);
  const d = await redigirPost({ temasUsados: usados, foco });

  const id = novoId();
  const png = await renderCard({
    kicker: d.kicker,
    headline: d.headline,
    destaque: d.destaque,
    support: d.support,
    tags: d.tags,
    cta: d.cta,
    handle: process.env.HANDLE,
  });
  writeFileSync(caminhoImagem(id), png);

  const post = {
    id,
    criadoEm: new Date().toISOString(),
    status: "draft",
    modelo: d.modelo,
    card: {
      tema: d.tema,
      kicker: d.kicker,
      headline: d.headline,
      destaque: d.destaque,
      support: d.support,
      tags: d.tags,
      cta: d.cta,
    },
    caption: d.caption,
    hashtags: d.hashtags,
    imagem: `img/${id}.png`,
  };
  return salvar(post);
}
