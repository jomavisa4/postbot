// publicar.mjs — publica um rascunho aprovado no Facebook e no Instagram.
//
// Ordem: sobe a imagem para uma URL publica, publica na Pagina do Facebook e
// depois no Instagram. Cada rede e registrada separadamente: se o Instagram
// falhar depois de o Facebook ter dado certo, uma nova tentativa NAO republica
// o Facebook (ele ja tem fbPostId salvo).
import "./env.mjs";
import { publicarImagem } from "./images.mjs";
import { publicarNoFacebook, publicarNoInstagram } from "./meta.mjs";
import { ler, atualizar, caminhoImagem } from "./store.mjs";
import { legendaFinal } from "./criar.mjs";

export async function publicarPost(id, { soInstagram = false } = {}) {
  const p = ler(id);
  if (!p) throw new Error(`Rascunho ${id} nao encontrado.`);

  const token = process.env.META_PAGE_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  const igId = process.env.META_IG_ID;
  if (!token) throw new Error("META_PAGE_TOKEN vazio. Rode: npm run token <SEU_TOKEN>");

  // 1) imagem publica (reaproveita se ja subiu)
  let imageUrl = p.imageUrl;
  if (!imageUrl) {
    imageUrl = await publicarImagem(caminhoImagem(id), id);
    atualizar(id, { imageUrl });
  }

  const caption = legendaFinal(p);
  const resultado = { imageUrl, fb: p.fbPostId || null, ig: p.igPostId || null };
  const erros = {};

  // 2) Facebook (pula se ja publicado)
  if (!soInstagram && !resultado.fb) {
    try {
      const fb = await publicarNoFacebook({ pageId, token, imageUrl, caption });
      resultado.fb = fb.post_id || fb.id;
      atualizar(id, { fbPostId: resultado.fb });
    } catch (e) {
      erros.facebook = e.message;
    }
  }

  // 3) Instagram (pula se ja publicado)
  if (!resultado.ig) {
    try {
      resultado.ig = await publicarNoInstagram({ igId, token, imageUrl, caption });
      atualizar(id, { igPostId: resultado.ig });
    } catch (e) {
      erros.instagram = e.message;
    }
  }

  const algoPublicou = resultado.fb || resultado.ig;
  if (!algoPublicou) {
    atualizar(id, { status: "erro", erro: JSON.stringify(erros) });
    throw new Error(`Nada foi publicado. Facebook: ${erros.facebook || "ok"} | Instagram: ${erros.instagram || "ok"}`);
  }

  atualizar(id, {
    status: "published",
    publicadoEm: new Date().toISOString(),
    erros: Object.keys(erros).length ? erros : null,
  });
  return { ...resultado, erros: Object.keys(erros).length ? erros : null };
}

// Publica uma imagem que JA esta em disco (ex.: enviada pelo Estudio) no
// Facebook e/ou Instagram. Diferente de publicarPost(), aqui a legenda vem
// pronta (nao passa pelo card) e as plataformas sao escolhidas uma a uma.
export async function publicarMidia({ id, caption, plataformas = { fb: true, ig: true } }) {
  const token = process.env.META_PAGE_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  const igId = process.env.META_IG_ID;
  if (!token) throw new Error("META_PAGE_TOKEN vazio. Rode: npm run token <SEU_TOKEN>");
  if (!plataformas.fb && !plataformas.ig) throw new Error("Nenhuma plataforma selecionada (Facebook e/ou Instagram).");

  // 1) imagem publica (reaproveita se ja subiu)
  let imageUrl = (ler(id) || {}).imageUrl;
  if (!imageUrl) {
    imageUrl = await publicarImagem(caminhoImagem(id), id);
    atualizar(id, { imageUrl });
  }

  const texto = caption || "";
  const resultado = { imageUrl, fb: null, ig: null };
  const erros = {};

  // 2) Facebook
  if (plataformas.fb) {
    try {
      const fb = await publicarNoFacebook({ pageId, token, imageUrl, caption: texto });
      resultado.fb = fb.post_id || fb.id;
      atualizar(id, { fbPostId: resultado.fb });
    } catch (e) {
      erros.facebook = e.message;
    }
  }

  // 3) Instagram
  if (plataformas.ig) {
    try {
      resultado.ig = await publicarNoInstagram({ igId, token, imageUrl, caption: texto });
      atualizar(id, { igPostId: resultado.ig });
    } catch (e) {
      erros.instagram = e.message;
    }
  }

  const algoPublicou = resultado.fb || resultado.ig;
  if (!algoPublicou) {
    atualizar(id, { status: "erro", erro: JSON.stringify(erros) });
    throw new Error(`Nada foi publicado. Facebook: ${erros.facebook || "ok"} | Instagram: ${erros.instagram || "ok"}`);
  }

  atualizar(id, {
    status: "published",
    publicadoEm: new Date().toISOString(),
    erros: Object.keys(erros).length ? erros : null,
  });
  return { ok: true, ...resultado, erros: Object.keys(erros).length ? erros : null };
}
