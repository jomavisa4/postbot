// store.mjs — fila de posts em disco (um JSON por rascunho).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { RAIZ } from "./env.mjs";

export const DIR = join(RAIZ, "queue");
const IMG = join(DIR, "img");

export function garantirPastas() {
  for (const d of [DIR, IMG]) if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

export function novoId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const sel = Math.random().toString(36).slice(2, 6);
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${sel}`;
}

export const caminhoImagem = (id) => join(IMG, `${id}.png`);

export function salvar(post) {
  garantirPastas();
  writeFileSync(join(DIR, `${post.id}.json`), JSON.stringify(post, null, 2), "utf8");
  return post;
}

export function ler(id) {
  const f = join(DIR, `${id}.json`);
  if (!existsSync(f)) return null;
  return JSON.parse(readFileSync(f, "utf8"));
}

export function atualizar(id, patch) {
  const p = ler(id);
  if (!p) return null;
  return salvar({ ...p, ...patch, atualizadoEm: new Date().toISOString() });
}

export async function listar({ status } = {}) {
  garantirPastas();
  const arquivos = (await readdir(DIR)).filter((f) => f.endsWith(".json"));
  const posts = [];
  for (const f of arquivos) {
    try {
      const p = JSON.parse(readFileSync(join(DIR, f), "utf8"));
      if (!status || p.status === status) posts.push(p);
    } catch {}
  }
  return posts.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
}
