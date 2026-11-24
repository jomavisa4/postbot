// avatar.mjs — gera opções de foto de perfil (1080x1080) para o Instagram.
// Paleta da marca: azul #2340D3, azul escuro #13257E, vermelho #E2342D.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "out");
mkdirSync(OUT, { recursive: true });

const S = 1080;
const AZUL = "#2340D3";
const AZUL_ESC = "#13257E";
const AZUL_INI = "#1B2FB0";
const VERM = "#E2342D";
const FONT = "Segoe UI, Arial, Helvetica, sans-serif";

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fundo = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${AZUL_INI}"/>
      <stop offset="1" stop-color="${AZUL}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${VERM}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${VERM}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#7FA0FF" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#7FA0FF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <circle cx="920" cy="1000" r="560" fill="url(#glow)"/>
  <circle cx="140" cy="120" r="520" fill="url(#glowB)"/>`;

const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
${fundo}
${inner}
</svg>`;

// Seta para cima, centrada em (cx, cy de base) — altura ~150.
const seta = (cx, cy, cor) => {
  const t = cy - 78, s = cy + 78, meia = 26, ponta = 62;
  return `<path d="M ${cx} ${t} L ${cx - ponta} ${t + ponta * 1.05} L ${cx - meia} ${t + ponta * 1.05} L ${cx - meia} ${s} L ${cx + meia} ${s} L ${cx + meia} ${t + ponta * 1.05} L ${cx + ponta} ${t + ponta * 1.05} Z" fill="${cor}"/>`;
};

// Seta para a direita, centrada em (cx, cy).
const setaDir = (cx, cy, cor) => {
  const l = cx - 80, r = cx + 80, meia = 26, ponta = 62;
  return `<path d="M ${l} ${cy - meia} L ${r - ponta} ${cy - meia} L ${r - ponta} ${cy - ponta} L ${r} ${cy} L ${r - ponta} ${cy + ponta} L ${r - ponta} ${cy + meia} L ${l} ${cy + meia} Z" fill="${cor}"/>`;
};

// ── Opção 1: 600 (topo, suave) ↑ 1000 (base, forte), tudo branco ──────────────
const opt1 = wrap(`
  <text x="540" y="185" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" letter-spacing="7" fill="#ffffff" fill-opacity="0.72">REDAÇÃO ENEM</text>
  <text x="540" y="480" text-anchor="middle" font-family="${FONT}" font-size="190" font-weight="900" letter-spacing="-6" fill="#ffffff" fill-opacity="0.78">600</text>
  ${seta(540, 610, VERM)}
  <text x="540" y="945" text-anchor="middle" font-family="${FONT}" font-size="245" font-weight="900" letter-spacing="-8" fill="#ffffff">1000</text>
`);

// ── Opção 2: 600 → 1000 na horizontal, centralizado ──────────────────────────
const opt2 = wrap(`
  <text x="540" y="235" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" letter-spacing="7" fill="#ffffff" fill-opacity="0.72">REDAÇÃO ENEM</text>
  <text x="235" y="645" text-anchor="middle" font-family="${FONT}" font-size="175" font-weight="900" letter-spacing="-6" fill="#ffffff" fill-opacity="0.80">600</text>
  ${setaDir(540, 590, VERM)}
  <text x="845" y="645" text-anchor="middle" font-family="${FONT}" font-size="175" font-weight="900" letter-spacing="-6" fill="#ffffff">1000</text>
  <rect x="390" y="830" width="300" height="12" rx="6" fill="${VERM}"/>
`);

// ── Opção 3: wordmark "dos 600 aos 1000" em 2 linhas + selo ENEM ─────────────
const opt3 = wrap(`
  <text x="540" y="400" text-anchor="middle" font-family="${FONT}" font-size="112" font-weight="900" letter-spacing="-3" fill="#ffffff" fill-opacity="0.85">dos 600</text>
  <text x="540" y="560" text-anchor="middle" font-family="${FONT}" font-size="112" font-weight="900" letter-spacing="-3" fill="#ffffff">aos 1000</text>
  <rect x="345" y="645" width="390" height="92" rx="46" fill="${VERM}"/>
  <text x="540" y="705" text-anchor="middle" font-family="${FONT}" font-size="40" font-weight="900" letter-spacing="3" fill="#ffffff">REDAÇÃO ENEM</text>
`);

const alvos = [
  ["avatar-1.png", opt1],
  ["avatar-2.png", opt2],
  ["avatar-3.png", opt3],
];

for (const [nome, svg] of alvos) {
  await sharp(Buffer.from(svg), { density: 72 }).png({ compressionLevel: 9 }).toFile(resolve(OUT, nome));
  console.log("ok:", nome);
}
console.log("pasta:", OUT);
