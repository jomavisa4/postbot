// upload-avatar.mjs — sobe a foto de perfil e imprime a URL publica (GitHub -> catbox).
import { publicarImagem } from "../lib/images.mjs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const arquivo = resolve(__dirname, "..", "out", process.argv[2] || "avatar-1.png");
const id = (process.argv[3] || "avatar-furadordefossa").replace(/[^\w.-]/g, "");
const url = await publicarImagem(arquivo, id);
console.log(url);
