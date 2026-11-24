// card.mjs — desenha o post como card 1080x1350 (4:5) usando SVG + sharp.
// Mesma paleta do site: azul #2340D3, vermelho #E2342D, fundo #F4F6FB.
import sharp from "sharp";

const AZUL = "#2340D3";
const AZUL_ESC = "#13257E";
const VERM = "#E2342D";
const OFF = "#F4F6FB";
const CINZA = "#4A5579";
const FONT = "Segoe UI, Arial, Helvetica, sans-serif";

const W = 1080;
const H = 1350;

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Estimativa de largura: Segoe UI bold em torno de 0,56 * tamanho por caractere.
const larguraTxt = (t, size, fator = 0.56) => String(t).length * size * fator;

function quebrar(texto, size, maxW, fator = 0.56, maxLinhas = 4) {
  const palavras = String(texto).trim().split(/\s+/);
  const linhas = [];
  let atual = "";
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (larguraTxt(teste, size, fator) <= maxW || !atual) atual = teste;
    else {
      linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length > maxLinhas) {
    const cortadas = linhas.slice(0, maxLinhas);
    cortadas[maxLinhas - 1] = cortadas[maxLinhas - 1].replace(/\s+\S*$/, "") + "…";
    return cortadas;
  }
  return linhas;
}

// Acha o maior tamanho de fonte em que o titulo cabe em <= maxLinhas.
function ajustarTitulo(texto, maxW, maxLinhas) {
  for (let size = 104; size >= 54; size -= 4) {
    const linhas = quebrar(texto, size, maxW, 0.56, 99);
    if (linhas.length <= maxLinhas && linhas.every((l) => larguraTxt(l, size) <= maxW)) {
      return { size, linhas };
    }
  }
  return { size: 54, linhas: quebrar(texto, 54, maxW, 0.56, maxLinhas) };
}

function tag(cx, cy, texto, bg, fg) {
  const size = 30;
  const w = Math.round(larguraTxt(texto, size, 0.58) + 60);
  const h = 74;
  return {
    w,
    h,
    svg:
      `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${bg}"/>` +
      `<text x="${cx}" y="${cy + size * 0.36}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="800" fill="${fg}">${esc(texto)}</text>`,
  };
}

function linhaTags(y, tags) {
  const medidas = tags.map((t) => ({ ...t, w: tag(0, y, t.texto, t.bg, t.fg).w }));
  const gap = 18;
  const total = medidas.reduce((s, m) => s + m.w, 0) + gap * (tags.length - 1);
  let x = W / 2 - total / 2;
  let out = "";
  for (const t of medidas) {
    out += tag(x + t.w / 2, y, t.texto, t.bg, t.fg).svg;
    x += t.w + gap;
  }
  return { svg: out, altura: 74 };
}

/**
 * @param {object} p
 * @param {string} p.kicker    etiqueta pequena no topo (ex.: "DICA DE REDAÇÃO")
 * @param {string} p.headline  titulo grande
 * @param {string} [p.destaque] palavras do titulo que ficam em vermelho
 * @param {string} p.support   texto de apoio
 * @param {string[]} [p.tags]  ate 2 etiquetas curtas
 * @param {string} p.cta       texto do botao
 * @param {string} [p.micro]   legenda fina abaixo do botao
 * @param {string} [p.handle]
 */
export async function renderCard(p) {
  const titulo = ajustarTitulo(p.headline || "", 880, 3);
  const alturaLinha = titulo.size * 1.12;

  const palavrasD = new Set(
    String(p.destaque || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length > 2)
      .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
  );

  const limpaPalavra = (s) => s.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

  const linhaSvg = (linha, y) => {
    const base = `x="540" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${titulo.size}" font-weight="900" letter-spacing="-2"`;
    if (palavrasD.size) {
      const inner = linha
        .split(/(\s+)/)
        .map((part) => {
          if (/^\s+$/.test(part) || part === "") return esc(part === "" ? " " : part);
          const red = palavrasD.has(limpaPalavra(part));
          return `<tspan fill="${red ? VERM : AZUL_ESC}">${esc(part)}</tspan>`;
        })
        .join("");
      return `<text ${base}>${inner}</text>`;
    }
    return `<text ${base} fill="${AZUL_ESC}">${esc(linha)}</text>`;
  };

  // ── Layout: bloco de conteudo centralizado entre a etiqueta e o botao ───────
  const nT = titulo.linhas.length;
  const supportLines = p.support ? quebrar(p.support, 38, 820, 0.52, 3) : [];
  const nS = supportLines.length;

  const tagsArr = (p.tags || [])
    .filter(Boolean)
    .slice(0, 2)
    .map((t, i) => (i === 0 ? { texto: t, bg: "#FCE4E2", fg: VERM } : { texto: t, bg: "#EEF2FD", fg: CINZA }));

  const titleH = (nT - 1) * alturaLinha + titulo.size;
  const supportH = nS * 52;
  const tagsH = 74;

  const REG_TOP = 400;
  const REG_BOT = 1090;
  const regH = REG_BOT - REG_TOP;

  // Caber tudo > 1o tenta com tags, aperta os espacos, e por fim sem tags.
  let hasTags = tagsArr.length > 0;
  let gapTS = 84; // titulo -> apoio
  let gapST = hasTags ? 58 : 0; // apoio -> tags
  let contentH = titleH + gapTS + supportH + gapST + (hasTags ? tagsH : 0);
  if (contentH > regH && hasTags) {
    gapTS = 64;
    gapST = 44;
    contentH = titleH + gapTS + supportH + gapST + tagsH;
    if (contentH > regH) {
      hasTags = false;
      gapST = 0;
      contentH = titleH + gapTS + supportH;
    }
  }
  if (contentH > regH) {
    gapTS = 52;
    contentH = titleH + gapTS + supportH + (hasTags ? gapST + tagsH : 0);
  }

  const topoBloco = REG_TOP + Math.max(0, (regH - contentH) / 2);

  const baseTitulo = topoBloco + titulo.size * 0.8;
  const linhasTitulo = titulo.linhas.map((l, i) => linhaSvg(l, baseTitulo + i * alturaLinha)).join("");
  const fimTitulo = topoBloco + titleH;

  const baseSupport = fimTitulo + gapTS + 30;
  const supportSvg = supportLines
    .map(
      (l, i) =>
        `<text x="540" y="${baseSupport + i * 52}" text-anchor="middle" font-family="${FONT}" font-size="38" font-weight="600" fill="${CINZA}">${esc(l)}</text>`
    )
    .join("");
  const fimSupport = baseSupport + (nS - 1) * 52;

  const tagsSvg = hasTags ? linhaTags(fimSupport + gapST + tagsH / 2, tagsArr).svg : "";

  const ctaY = 1124;
  const ctaH = 118;
  const microY = ctaY + ctaH + 50; // 1292
  const handleY = microY + 36; // 1328

  const kw = p.kicker ? Math.round(larguraTxt(p.kicker, 26, 0.6) + 56) : 0;
  const kicker = p.kicker
    ? `<rect x="${540 - kw / 2}" y="300" width="${kw}" height="58" rx="29" fill="#EEF2FD"/>` +
      `<text x="540" y="338" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="800" letter-spacing="2" fill="${AZUL}">${esc(p.kicker.toUpperCase())}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="gBlue" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#DDE5FC" stop-opacity="1"/>
      <stop offset="60%" stop-color="#DDE5FC" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#DDE5FC" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gRed" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FCE4E2" stop-opacity="1"/>
      <stop offset="60%" stop-color="#FCE4E2" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#FCE4E2" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${OFF}"/>
  <circle cx="1010" cy="120" r="520" fill="url(#gBlue)"/>
  <circle cx="60" cy="1290" r="520" fill="url(#gRed)"/>

  <text x="540" y="150" text-anchor="middle" font-family="${FONT}" font-size="44" font-weight="800" letter-spacing="-0.5" fill="${AZUL_ESC}">dos 600 aos <tspan fill="${VERM}">1000</tspan></text>
  <text x="540" y="196" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="600" fill="${CINZA}">correção de redação do ENEM por IA</text>

  ${kicker}
  ${linhasTitulo}
  ${supportSvg}
  ${tagsSvg}

  <rect x="130" y="${ctaY}" width="820" height="${ctaH}" rx="${ctaH / 2}" fill="${VERM}"/>
  <text x="540" y="${ctaY + ctaH / 2 + 19}" text-anchor="middle" font-family="${FONT}" font-size="48" font-weight="900" letter-spacing="-0.5" fill="#ffffff">${esc(p.cta || "Corrigir grátis agora")}</text>
  <text x="540" y="${microY}" text-anchor="middle" font-family="${FONT}" font-size="28" font-weight="600" fill="${CINZA}">${esc(p.micro || "Primeira correção grátis · sem cartão")}</text>
  <text x="540" y="${handleY}" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="700" fill="${AZUL}">${esc(p.handle || "@dos600aos1000")}</text>
</svg>`;

  return sharp(Buffer.from(svg), { density: 72 }).png({ compressionLevel: 9 }).toBuffer();
}
