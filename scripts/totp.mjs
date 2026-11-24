// Gera o codigo TOTP (autenticacao de dois fatores) da conta Meta.
//
// A chave fica salva em postbot/.env como META_TOTP_SECRET (ou passe por variavel
// de ambiente). NAO versione essa chave.
//
// Uso:
//   node scripts/totp.mjs            -> imprime o codigo atual e os segundos restantes
//   node scripts/totp.mjs --json     -> imprime { code, secondsLeft }
//   META_TOTP_SECRET="ABCD EFGH" node scripts/totp.mjs

import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

function lerSegredo() {
  if (process.env.META_TOTP_SECRET) return process.env.META_TOTP_SECRET;
  const envPath = join(here, '..', '.env');
  const env = readFileSync(envPath, 'utf8');
  const m = env.match(/^META_TOTP_SECRET\s*=\s*(.+)$/m);
  if (!m) throw new Error('META_TOTP_SECRET nao encontrado em .env');
  return m[1].trim();
}

function base32ParaBuffer(texto) {
  const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const limpo = String(texto).replace(/[\s-]/g, '').replace(/=+$/g, '').toUpperCase();
  let bits = '';
  for (const ch of limpo) {
    const idx = ALFABETO.indexOf(ch);
    if (idx === -1) throw new Error('Caractere invalido na chave: ' + ch);
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// RFC 6238 (TOTP) sobre RFC 4226 (HOTP), SHA-1, 6 digitos, janela de 30s.
function totp(segredoBase32, { digits = 6, passo = 30, agora = Date.now(), offset = 0 } = {}) {
  const chave = base32ParaBuffer(segredoBase32);
  const contador = Math.floor(agora / 1000 / passo) + offset;
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(contador / 2 ** 32), 0);
  buf.writeUInt32BE(contador % 2 ** 32, 4);
  const hmac = createHmac('sha1', chave).update(buf).digest();
  const o = hmac[hmac.length - 1] & 0x0f;
  const codigo = ((hmac[o] & 0x7f) << 24) | (hmac[o + 1] << 16) | (hmac[o + 2] << 8) | hmac[o + 3];
  return String(codigo % 10 ** digits).padStart(digits, '0');
}

const segredo = lerSegredo();
const agora = Date.now();
const codigo = totp(segredo, { agora });
const segundosRestantes = 30 - (Math.floor(agora / 1000) % 30);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ code: codigo, secondsLeft: segundosRestantes }));
} else {
  console.log(codigo + '   (valido por ~' + segundosRestantes + 's)');
}
