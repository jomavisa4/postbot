// meta.mjs — fala com a Graph API da Meta (Facebook Pagina + Instagram).
import "./env.mjs";

const V = "v22.0";
const BASE = `https://graph.facebook.com/${V}`;

async function graph(caminho, { method = "GET", params = {}, token } = {}) {
  const url = new URL(`${BASE}${caminho}`);
  const corpo = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) corpo.append(k, v);
  if (token) corpo.append("access_token", token);
  // GET manda tudo na query string; os demais metodos mandam no corpo.
  const usaCorpo = method !== "GET";
  if (!usaCorpo) for (const [k, v] of corpo) url.searchParams.append(k, v);
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: usaCorpo ? corpo : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const txt = await res.text();
  let json = null;
  try { json = JSON.parse(txt); } catch {}
  if (!res.ok || json?.error) {
    const e = json?.error || {};
    throw new Error(`Graph ${res.status}: ${e.message || txt.slice(0, 200)}${e.code ? ` (code ${e.code}${e.error_subcode ? "/" + e.error_subcode : ""})` : ""}`);
  }
  return json;
}

// ── Descoberta de tokens/contas (usado pelo setup) ─────────────────────────────
export async function quemSouEu(token) {
  return graph("/me", { params: { fields: "id,name" }, token });
}

export async function listarPaginas(token) {
  return graph("/me/accounts", {
    params: { fields: "id,name,access_token,instagram_business_account{id,username}", limit: 100 },
    token,
  });
}

export async function paginaComInstagram(pageId, token) {
  return graph(`/${pageId}`, {
    params: { fields: "id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}" },
    token,
  });
}

// ── Publicacao ─────────────────────────────────────────────────────────────────
/** Publica uma foto na Pagina do Facebook. Devolve {id, post_id}. */
export async function publicarNoFacebook({ pageId, token, imageUrl, caption }) {
  return graph(`/${pageId}/photos`, {
    method: "POST",
    params: { url: imageUrl, caption, published: "true" },
    token,
  });
}

/** Publica uma foto no Instagram (feed). Devolve o id do post publicado. */
export async function publicarNoInstagram({ igId, token, imageUrl, caption }) {
  const container = await graph(`/${igId}/media`, {
    method: "POST",
    params: { image_url: imageUrl, caption },
    token,
  });
  if (!container?.id) throw new Error("Instagram nao retornou o container da midia.");

  // Espera o Instagram processar a imagem (normalmente 2-20s).
  const limite = Date.now() + 90000;
  let status = "IN_PROGRESS";
  while (Date.now() < limite) {
    const s = await graph(`/${container.id}`, { params: { fields: "status_code,status" }, token });
    status = s.status_code || status;
    if (status === "FINISHED") break;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`Instagram recusou a midia (${status}): ${s.status || ""}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (status !== "FINISHED") throw new Error(`Instagram demorou demais para processar (${status}).`);

  const pub = await graph(`/${igId}/media_publish`, {
    method: "POST",
    params: { creation_id: container.id },
    token,
  });
  return pub.id;
}
