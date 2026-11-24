// fetch-url.mjs — baixa uma URL para um arquivo. Uso: node scripts/fetch-url.mjs <url> <saida>
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "..", "out");
const [url, saida] = process.argv.slice(2);
const res = await fetch(url);
if (!res.ok) { console.error("HTTP", res.status); process.exit(1); }
const buf = Buffer.from(await res.arrayBuffer());
writeFileSync(resolve(out, saida), buf);
console.log("ok:", saida, buf.length, "bytes", res.headers.get("content-type"));
