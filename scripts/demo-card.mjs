// demo-card.mjs — gera um card de exemplo (sem IA) para conferir o visual.
//   node scripts/demo-card.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderCard } from "../lib/card.mjs";
import { RAIZ } from "../lib/env.mjs";

const exemplos = [
  {
    kicker: "erro que derruba nota",
    headline: "Você cita o autor e perde ponto mesmo assim",
    destaque: "perde ponto",
    support: "A competência 2 não quer nome famoso: quer repertório bem ligado ao tema.",
    tags: ["Competência 2", "dica prática"],
    cta: "Corrigir grátis agora",
  },
  {
    kicker: "curiosidade",
    headline: "Sua redação vale 600 ou 900?",
    destaque: "600 ou 900",
    support: "Manda a foto da folha e recebe a nota nas 5 competências em 1 minuto.",
    tags: ["Nota por competência", "em 1 minuto"],
    cta: "Descobrir minha nota",
  },
];

const out = join(RAIZ, "out");
mkdirSync(out, { recursive: true });
for (const [i, ex] of exemplos.entries()) {
  const png = await renderCard({ ...ex, handle: "@dos600aos1000" });
  const f = join(out, `demo-${i + 1}.png`);
  writeFileSync(f, png);
  console.log(`${f}  (${(png.length / 1024).toFixed(0)} KB)`);
}
