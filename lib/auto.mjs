// auto.mjs — o motor do modo automatico: gera os rascunhos e, se a publicacao
// automatica estiver LIGADA, publica cada um no Facebook + Instagram.
//
// Trava de seguranca: por padrao NAO publica. So publica quando:
//   - o .env tem AUTO_PUBLISH=1, OU
//   - a chamada passa { publicar: true } (ex.: `node autopost.mjs --publish`).
import "./env.mjs";
import { criarRascunho } from "./criar.mjs";
import { publicarPost } from "./publicar.mjs";

/** Le o interruptor AUTO_PUBLISH. `explicito` (boolean) tem prioridade. */
export function autoLigado(explicito) {
  if (typeof explicito === "boolean") return explicito;
  return /^(1|true|on|sim|yes)$/i.test(String(process.env.AUTO_PUBLISH || "").trim());
}

/**
 * Roda um ciclo: gera `count` rascunhos e (se ligado) publica cada um.
 * Nunca lanca por causa de um post: junta os erros e segue.
 * @param {object} [o]
 * @param {number} [o.count=1]     quantos posts gerar neste ciclo
 * @param {string} [o.foco]        tema pedido para a IA
 * @param {boolean} [o.publicar]   forca ligar/desligar a publicacao automatica
 * @returns {Promise<{count:number,publicou:boolean,gerados:string[],publicados:string[],erros:string[]}>}
 */
export async function rodarCiclo({ count = 1, foco, publicar } = {}) {
  const n = Math.max(1, Math.min(Number(count) || 1, 5));
  const devePublicar = autoLigado(publicar);
  const gerados = [];
  const publicados = [];
  const erros = [];

  for (let i = 0; i < n; i++) {
    let post;
    try {
      post = await criarRascunho({ foco });
      gerados.push(post.id);
    } catch (e) {
      erros.push(`gerar: ${e.message}`);
      continue;
    }

    if (!devePublicar) continue;

    try {
      const r = await publicarPost(post.id);
      publicados.push(post.id);
      const onde = [r.fb ? "facebook" : null, r.ig ? "instagram" : null].filter(Boolean).join("+");
      console.log(`  publicado  ${post.id}  (${onde || "?"})`);
      if (r.erros) console.warn(`  aviso ${post.id}:`, JSON.stringify(r.erros));
    } catch (e) {
      erros.push(`publicar ${post.id}: ${e.message}`);
    }
  }

  return { count: n, publicou: devePublicar, gerados, publicados, erros };
}
