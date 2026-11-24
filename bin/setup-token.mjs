#!/usr/bin/env node
// setup-token.mjs — a partir de um token da Meta, descobre a Pagina e o
// Instagram e salva o token de Pagina no .env.
//
//   node bin/setup-token.mjs EAAB...   (cole o token)
//
// Como conseguir o token (recomendado, nao expira):
//   1. business.facebook.com/settings -> Usuarios -> Usuarios do sistema
//   2. Criar usuario do sistema (funcao Admin) -> Adicionar ativos (a Pagina)
//   3. "Gerar novo token" marcando: pages_show_list, pages_read_engagement,
//      pages_manage_posts, business_management, instagram_basic,
//      instagram_content_publish
//   4. Cole o token aqui.
//
// Alternativa rapida (expira em ~1h): developers.facebook.com/tools/explorer
import { quemSouEu, listarPaginas, paginaComInstagram } from "../lib/meta.mjs";
import { salvarEnv } from "../lib/env.mjs";

const token = process.argv[2] || process.env.META_PAGE_TOKEN;
if (!token) {
  console.error("Faltou o token. Uso:  node bin/setup-token.mjs <SEU_TOKEN>");
  process.exit(1);
}

const desejada = process.env.META_PAGE_ID;
const igDesejado = process.env.META_IG_ID;

console.log("1) Identificando quem fala com a API...");
try {
  const me = await quemSouEu(token);
  console.log(`   -> ${me.name} (id ${me.id})`);
} catch (e) {
  console.error("   Token invalido ou expirado:", e.message);
  process.exit(1);
}

console.log("2) Procurando a Pagina e o Instagram vinculado...");
const { data: paginas = [] } = await listarPaginas(token);

let alvo = paginas.find((p) => p.id === desejada) || paginas.find((p) => p.instagram_business_account?.id === igDesejado) || paginas[0] || null;
let pageToken = alvo?.access_token || null;
let ig = alvo?.instagram_business_account || null;

// Algumas Paginas (ex.: de portifolio empresarial) nao aparecem em /me/accounts,
// mas continuam acessiveis pelo ID direto. Cai no META_PAGE_ID quando a lista vier vazia.
if (!alvo && desejada) {
  console.log("   /me/accounts vazio — usando o META_PAGE_ID do .env direto.");
  const det = await paginaComInstagram(desejada, token);
  if (det?.id) {
    alvo = { id: det.id, name: det.name };
    pageToken = pageToken || det.access_token;
    ig = ig || det.instagram_business_account || det.connected_instagram_account || null;
  }
}
if (!alvo) {
  console.error("   Nenhuma Pagina encontrada. O token precisa da permissao pages_show_list e acesso a Pagina.");
  process.exit(1);
}
console.log(`   Pagina: ${alvo.name} (${alvo.id})`);

if (!pageToken) {
  const det = await paginaComInstagram(alvo.id, token);
  pageToken = det.access_token;
  ig = ig || det.instagram_business_account || det.connected_instagram_account || null;
}
if (!ig?.id) {
  console.error("   A Pagina nao tem Instagram Business vinculado. Vincule em: Pagina -> Configuracoes -> Contas vinculadas.");
  process.exit(1);
}

console.log("3) Testando o token de Pagina...");
const teste = await paginaComInstagram(alvo.id, pageToken);
console.log(`   ok -> ${teste.name} | Instagram @${ig.username || ig.id}`);

console.log("4) Verificando permissao de publicacao...");
try {
  // Um erro de permissao aqui indica que ainda falta liberar instagram_content_publish.
  const r = await fetch(`https://graph.facebook.com/v22.0/${ig.id}?fields=id,username&access_token=${encodeURIComponent(pageToken)}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  console.log(`   instagram ok -> @${j.username}`);
} catch (e) {
  console.warn("   aviso:", e.message);
}

salvarEnv({ META_PAGE_ID: alvo.id, META_IG_ID: ig.id, META_PAGE_TOKEN: pageToken });

console.log("\nPronto. Salvo no .env:");
console.log(`   META_PAGE_ID=${alvo.id}`);
console.log(`   META_IG_ID=${ig.id}`);
console.log(`   META_PAGE_TOKEN=${pageToken.slice(0, 16)}...(${pageToken.length} caracteres)`);
console.log("\nAgora gere e aprove um post de teste:  npm run gerar1  ->  npm start");
