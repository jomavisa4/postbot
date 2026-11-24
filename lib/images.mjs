// images.mjs — deixa a imagem acessivel por URL publica (o Instagram exige isso).
//
// Estrategia principal: empurrar o PNG para um repositorio PUBLICO no GitHub e
// usar a URL do raw.githubusercontent.com. Nao ha codigo do produto ali — so as
// imagens dos posts. Plano B: catbox.moe (upload anonimo, sem chave).
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { RAIZ } from "./env.mjs";

const run = promisify(execFile);
const REPO_DIR = join(RAIZ, ".image-repo");

const REPO_URL = process.env.PUBLIC_IMAGE_REPO || "";
const BASE = (process.env.PUBLIC_IMAGE_BASE || "").replace(/\/$/, "");

async function git(args, opts = {}) {
  return run("git", args, {
    cwd: REPO_DIR,
    windowsHide: true,
    // Nunca abre prompt de credenciais: se falhar, cai no plano B.
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "echo" },
    ...opts,
  });
}

async function garantirRepo() {
  if (!REPO_URL || !BASE) throw new Error("PUBLIC_IMAGE_REPO/PUBLIC_IMAGE_BASE nao configurados no .env");
  const temRepo = existsSync(join(REPO_DIR, ".git"));
  if (!temRepo) {
    // Limpa uma tentativa anterior que falhou pela metade (ex.: repo inexistente).
    if (existsSync(REPO_DIR)) rmSync(REPO_DIR, { recursive: true, force: true });
    mkdirSync(REPO_DIR, { recursive: true });
    try {
      await run("git", ["clone", "--depth", "1", REPO_URL, REPO_DIR], {
        windowsHide: true,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "echo" },
      });
    } catch (e) {
      rmSync(REPO_DIR, { recursive: true, force: true });
      throw e;
    }
    await git(["config", "user.name", "postbot"]);
    await git(["config", "user.email", "postbot@users.noreply.github.com"]);
  } else {
    await git(["pull", "--rebase", "--autostash"]).catch(() => {});
  }
}

async function viaGithub(arquivo, id) {
  await garantirRepo();
  const nome = `posts/${id}.png`;
  const destino = join(REPO_DIR, "posts");
  if (!existsSync(destino)) mkdirSync(destino, { recursive: true });
  copyFileSync(arquivo, join(REPO_DIR, nome));
  await git(["add", nome]);
  try {
    await git(["commit", "-m", `post ${id}`]);
  } catch {}
  await git(["push", "origin", "HEAD:main"]);
  return `${BASE}/${nome}`;
}

async function viaCatbox(arquivo) {
  const buf = readFileSync(arquivo);
  const fd = new FormData();
  fd.append("reqtype", "fileupload");
  fd.append("fileToUpload", new Blob([buf], { type: "image/png" }), "post.png");
  const res = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: fd });
  const txt = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//.test(txt)) throw new Error(`catbox: ${txt.slice(0, 120)}`);
  return txt;
}

/** Publica a imagem e devolve a URL publica. */
export async function publicarImagem(arquivo, id) {
  try {
    return await viaGithub(arquivo, id);
  } catch (e) {
    console.warn("  [img] GitHub falhou, tentando catbox:", e.message);
    return await viaCatbox(arquivo);
  }
}
