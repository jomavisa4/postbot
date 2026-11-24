// env.mjs — carrega o .env para process.env (efeito colateral ao importar).
// Mesmo padrao do dos600ao1000/env.mjs: minimalista, sem dependencia externa.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const ARQUIVO = join(RAIZ, ".env");

if (existsSync(ARQUIVO)) {
  try {
    for (const linha of readFileSync(ARQUIVO, "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (!m) continue;
      const valor = m[2].replace(/^["']|["']$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = valor;
    }
  } catch (e) {
    console.error("Nao consegui ler o .env:", e.message);
  }
}

// Grava/atualiza chaves no .env mantendo o resto do arquivo.
export function salvarEnv(chaves) {
  const atual = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";
  const linhas = atual ? atual.split(/\r?\n/) : [];
  for (const [k, v] of Object.entries(chaves)) {
    const i = linhas.findIndex((l) => new RegExp(`^\\s*${k}\\s*=`, "i").test(l));
    const nova = `${k}=${v}`;
    if (i >= 0) linhas[i] = nova;
    else linhas.push(nova);
    process.env[k] = v;
  }
  writeFileSync(ARQUIVO, linhas.join("\r\n"));
}
