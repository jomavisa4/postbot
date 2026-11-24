// serve-one.mjs — sobe um servidor HTTP local que devolve o base64 de um arquivo.
// Uso: node scripts/serve-one.mjs <arquivo> [porta]
import http from "node:http";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const arquivo = resolve(__dirname, "..", "out", process.argv[2] || "avatar-1.png");
const porta = Number(process.argv[3] || 8899);

const b64 = readFileSync(arquivo).toString("base64");
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(b64);
});
server.listen(porta, "127.0.0.1", () => console.log(`servindo base64 de ${arquivo} em http://127.0.0.1:${porta} (${b64.length} chars)`));
