// avatar2.mjs — 2a leva de fotos de perfil, na linguagem clara da marca.
// Paleta: fundo #F4F6FB, navy #13257E, azul #2340D3, vermelho #E2342D.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "out");
mkdirSync(OUT, { recursive: true });

const S = 1080;
const NAVY = "#13257E";
const AZUL = "#2340D3";
const VERM = "#E2342D";
const CINZA = "#4A5579";
const FONT = "Segoe UI, Arial, Helvetica, sans-serif";

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fundoClaro = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#EDF1FD"/>
    </linearGradient>
    <radialGradient id="gb" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#DDE5FC" stop-opacity="1"/>
      <stop offset="100%" stop-color="#DDE5FC" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gr" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FBDDDA" stop-opacity="1"/>
      <stop offset="100%" stop-color="#FBDDDA" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <circle cx="1000" cy="110" r="560" fill="url(#gb)"/>
  <circle cx="70" cy="990" r="560" fill="url(#gr)"/>`;

const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
${fundoClaro}
${inner}
</svg>`;

// anel de progresso (motivo da marca)
function anel(cx, cy, r, sw, pct, cor) {
  const C = 2 * Math.PI * r;
  const dash = (C * pct).toFixed(1);
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E4E9F5" stroke-width="${sw}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cor}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${dash} ${C.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`
  );
}

// ── A: wordmark limpo "dos 600 aos 1000" ─────────────────────────────────────
const A = svg(`
  <text x="540" y="392" text-anchor="middle" font-family="${FONT}" font-size="72" font-weight="800" letter-spacing="2" fill="${NAVY}">dos <tspan fill="${VERM}">600</tspan> aos</text>
  <text x="540" y="760" text-anchor="middle" font-family="${FONT}" font-size="330" font-weight="900" letter-spacing="-14" fill="${VERM}">1000</text>
  <rect x="470" y="836" width="140" height="14" rx="7" fill="${AZUL}"/>
`);

// ── B: anel de pontuação com "1000" ──────────────────────────────────────────
const B = svg(`
  ${anel(540, 520, 372, 58, 0.84, AZUL)}
  <text x="540" y="575" text-anchor="middle" font-family="${FONT}" font-size="215" font-weight="900" letter-spacing="-8" fill="${NAVY}">1000</text>
  <text x="540" y="668" text-anchor="middle" font-family="${FONT}" font-size="52" font-weight="800" letter-spacing="6" fill="${VERM}">ENEM</text>
`);

// ── C: medalha navy com anel branco + 1000 ───────────────────────────────────
const C = svg(`
  <circle cx="540" cy="540" r="520" fill="${NAVY}"/>
  <circle cx="540" cy="540" r="500" fill="none" stroke="url(#gb2)" stroke-width="0"/>
  ${anel(540, 520, 360, 46, 0.84, "#6E8CFF")}
  <text x="540" y="575" text-anchor="middle" font-family="${FONT}" font-size="205" font-weight="900" letter-spacing="-8" fill="#ffffff">1000</text>
  <text x="540" y="662" text-anchor="middle" font-family="${FONT}" font-size="46" font-weight="800" letter-spacing="8" fill="#FFD8D4">ENEM</text>
`);

// ── D: foto de estudo com véu navy ───────────────────────────────────────────
const D_foto = resolve(__dirname, "..", "..", "dos600ao1000", "assets", "caneta.jpg");

const alvos = [
  ["avatar-a.png", A],
  ["avatar-b.png", B],
  ["avatar-c.png", C],
];
for (const [n, s] of alvos) {
  await sharp(Buffer.from(s), { density: 72 }).png({ compressionLevel: 9 }).toFile(resolve(OUT, n));
  console.log("ok:", n);
}

// D: compõe foto + véu + texto
try {
  const base = await sharp(D_foto).resize(S, S, { fit: "cover" }).modulate({ brightness: 0.95 }).toBuffer();
  const veil = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
    <defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${NAVY}" stop-opacity="0.86"/>
      <stop offset="1" stop-color="${NAVY}" stop-opacity="0.55"/>
    </linearGradient></defs>
    <rect width="${S}" height="${S}" fill="url(#v)"/>
    <text x="540" y="470" text-anchor="middle" font-family="${FONT}" font-size="72" font-weight="800" letter-spacing="2" fill="#ffffff">dos <tspan fill="#FFB3AD">600</tspan> aos</text>
    <text x="540" y="800" text-anchor="middle" font-family="${FONT}" font-size="320" font-weight="900" letter-spacing="-14" fill="#ffffff">1000</text>
    <rect x="470" y="870" width="140" height="14" rx="7" fill="#FF5A50"/>
  </svg>`);
  await sharp(base).composite([{ input: veil }]).png({ compressionLevel: 9 }).toFile(resolve(OUT, "avatar-d.png"));
  console.log("ok: avatar-d.png");
} catch (e) {
  console.log("D falhou:", String(e).slice(0, 120));
}

console.log("pasta:", OUT);
