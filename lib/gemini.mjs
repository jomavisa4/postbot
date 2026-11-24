// gemini.mjs — chama o Gemini com fila de modelos (mesma ideia do dos600ao1000).
// Se um modelo bate na cota diaria (429 "per day"), ele sai da fila e o proximo
// assume. Assim o gerador de posts nao para quando um modelo esgota.
import "./env.mjs";

const API_KEY = process.env.GEMINI_API_KEY || "";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const MODELOS_PADRAO = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
  "gemini-pro-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-flash-lite-latest",
];

const FILA = (() => {
  const doEnv = (process.env.GEMINI_MODELOS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const base = doEnv.length ? doEnv : MODELOS_PADRAO;
  return [...new Set([MODEL, ...base])].filter(Boolean);
})();

const cota = new Map(); // model -> { bloqueadoAte }
const livre = (m, agora = Date.now()) => !cota.get(m) || cota.get(m).bloqueadoAte <= agora;

function banir(m, status, detalhe) {
  const agora = Date.now();
  if (status === 429) {
    const diario = /per day|PerDay|daily|RPD/i.test(detalhe);
    const ms = diario ? 6 * 3600 * 1000 : 60 * 1000;
    cota.set(m, { bloqueadoAte: agora + ms });
    return diario ? "dia" : "pico";
  }
  if (status >= 500) {
    cota.set(m, { bloqueadoAte: agora + 45 * 1000 });
    return "pico";
  }
  return null;
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Gera JSON a partir de um prompt. Devolve { dados, modelo }.
 * @param {object} o
 * @param {string} o.system  instrucoes de sistema
 * @param {string} o.prompt  pedido do usuario
 * @param {object} o.schema  schema de resposta (OpenAPI subset do Gemini)
 * @param {number} [o.temperature]
 */
export async function gerarJson({ system, prompt, schema, temperature = 0.9 }) {
  if (!API_KEY) throw new Error("GEMINI_API_KEY nao configurada no .env");

  const tentar = FILA.filter((m) => livre(m));
  const fila = tentar.length ? tentar : FILA; // se todos constam esgotados, tenta mesmo assim
  let ultimo = null;

  for (const model of fila) {
    for (let i = 0; i < 2; i++) {
      if (!livre(model)) break;
      let res;
      try {
        res = await fetch(`${API_BASE}/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
              responseSchema: schema,
            },
          }),
          signal: AbortSignal.timeout(60000),
        });
      } catch (e) {
        ultimo = new Error(`Nao consegui falar com a IA: ${e.message}`);
        await espera(800 * (i + 1));
        continue;
      }

      if (res.ok) {
        const data = await res.json();
        if (data?.promptFeedback?.blockReason) {
          throw new Error(`Resposta bloqueada pelo filtro (${data.promptFeedback.blockReason}).`);
        }
        const bruto = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
        if (!bruto) {
          ultimo = new Error("A IA nao retornou conteudo.");
          continue;
        }
        try {
          return { dados: JSON.parse(bruto), modelo: model };
        } catch {
          ultimo = new Error("A IA devolveu um JSON invalido.");
          continue;
        }
      }

      const detalhe = await res.text().catch(() => "");
      const tipo = banir(model, res.status, detalhe);
      let msg = detalhe.slice(0, 240);
      try {
        msg = JSON.parse(detalhe)?.error?.message || msg;
      } catch {}
      ultimo = new Error(`[${model} ${res.status}] ${msg}`);
      if (res.status === 404) break;      // modelo inexistente: nao repete
      if (tipo === "dia") break;          // esgotado no dia: passa para o proximo
      await espera(700 * (i + 1));
    }
  }
  throw ultimo || new Error("Nenhum modelo disponivel.");
}
