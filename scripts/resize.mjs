// resize.mjs — redimensiona uma imagem. Uso: node scripts/resize.mjs <in> <out> <size>
import sharp from "sharp";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "..", "out");
const [entrada, saida, size] = process.argv.slice(2);

await sharp(resolve(out, entrada))
  .resize(Number(size) || 512, Number(size) || 512, { fit: "cover" })
  .png({ compressionLevel: 9 })
  .toFile(resolve(out, saida));

const { size: bytes } = await sharp(resolve(out, saida)).metadata();
console.log("ok:", saida, bytes, "bytes");
