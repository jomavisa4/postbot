#!/usr/bin/env node
// install-estudio.mjs — copia o HTML do Estudio para public/estudio.html,
// injetando um trecho que aponta o webhook (endpoint) para este servidor local.
//
//   node scripts/install-estudio.mjs "C:\caminho\estudio.html"
//
// Sem argumento, usa o arquivo em Downloads. Rode de novo sempre que atualizar
// o Estudio: o trecho de integracao e reinserido automaticamente.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(RAIZ, "public", "estudio.html");
const ORIGEM =
  process.argv[2] ||
  join(process.env.USERPROFILE || process.env.HOME || "", "Downloads", "est_dio_de_automa_o_social_dos_600_ao_1000.html");

if (!existsSync(ORIGEM)) {
  console.error("Arquivo do Estudio nao encontrado:", ORIGEM);
  console.error('Passe o caminho: node scripts/install-estudio.mjs "C:\\caminho\\estudio.html"');
  process.exit(1);
}

// Injetado logo apos o <head>, ANTES de o Estudio ler o localStorage.
const INJECAO = `<!-- [postbot] integracao: aponta o webhook do Estudio para este servidor -->
<script>
  (function () {
    try {
      var K = 'd600_api_config_v4';
      var cfg = {};
      try { cfg = JSON.parse(localStorage.getItem(K) || '{}') || {}; } catch (e) { cfg = {}; }
      var alvo = location.origin + '/api/social/publish';
      if (!cfg.webhookEndpoint || !/^https?:/i.test(cfg.webhookEndpoint)) {
        cfg.webhookEndpoint = alvo;
        localStorage.setItem(K, JSON.stringify(cfg));
        console.log('[postbot] endpoint do Estudio configurado:', alvo);
      }
    } catch (e) {}
  })();
</script>
`;

let html = readFileSync(ORIGEM, "utf8");

if (html.includes("[postbot] integracao")) {
  console.log("O HTML ja contem a injecao do postbot; apenas recopiando.");
} else {
  const marcador = /<head[^>]*>/i.exec(html);
  if (!marcador) {
    console.error("Nao achei <head> no HTML do Estudio.");
    process.exit(1);
  }
  const pos = marcador.index + marcador[0].length;
  html = html.slice(0, pos) + "\n" + INJECAO + html.slice(pos);
}

mkdirSync(join(RAIZ, "public"), { recursive: true });
writeFileSync(DESTINO, html, "utf8");
console.log("Estudio instalado em:", DESTINO);
