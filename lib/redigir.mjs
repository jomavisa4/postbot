// redigir.mjs — a IA escreve o post: card (titulo/apoio/tags) + legenda.
import { gerarJson } from "./gemini.mjs";

const SYSTEM = `Você é o social media do "dos 600 aos 1000", um serviço que corrige a redação do ENEM por IA.
Como funciona o serviço (use como verdade, não invente além disso):
- O aluno manda a foto da redação manuscrita e recebe, em cerca de 1 minuto, a nota estimada nas 5 competências do ENEM.
- A correção aponta cada ponto perdido, com o que faltou para subir, e sugere reescrita nos trechos que pesam mais.
- O aluno acompanha o histórico de evolução das notas na conta dele.
- A primeira correção é grátis e não pede cartão.

Estilo: português do Brasil, direto, concreto, sem clichê de propaganda, sem emoji em excesso (no máximo 2 na legenda), sem promessa de nota garantida, sem "revolucionário/game changer".
Escreva para estudantes de 16 a 24 anos que estão treinando redação para o ENEM.

O título do card deve ser curto e chamar atenção (no máximo ~55 caracteres). O texto de apoio explica em uma frase. As tags são etiquetas curtas (máx. 18 caracteres).
A legenda (caption) é o texto do post: 2 a 4 parágrafos curtos, terminando com uma chamada para a correção grátis. Não inclua hashtags na legenda — elas vão separadas no campo hashtags.`;

const SCHEMA = {
  type: "object",
  properties: {
    tema: { type: "string", description: "assunto em 2-4 palavras (para não repetir)" },
    kicker: { type: "string", description: "etiqueta curta no topo, máx 22 caracteres" },
    headline: { type: "string", description: "título do card, máx ~55 caracteres" },
    destaque: { type: "string", description: "um trecho curto (2-3 palavras) que existe no headline e deve ficar em vermelho" },
    support: { type: "string", description: "frase de apoio, máx ~110 caracteres" },
    tags: { type: "array", items: { type: "string" }, description: "1 ou 2 etiquetas curtas" },
    cta: { type: "string", description: "texto do botão, máx 24 caracteres" },
    caption: { type: "string", description: "legenda do post em 2-4 parágrafos curtos" },
    hashtags: { type: "array", items: { type: "string" }, description: "4 a 7 hashtags relevantes, cada uma começando com #" },
  },
  required: ["tema", "kicker", "headline", "destaque", "support", "tags", "cta", "caption", "hashtags"],
};

export async function redigirPost({ temasUsados = [], foco } = {}) {
  const ano = new Date().getFullYear();
  const evitar = temasUsados.length
    ? `\nJá cobrimos estes temas — escolha um ângulo DIFERENTE: ${temasUsados.slice(0, 12).join(", ")}.`
    : "";
  const direcao = foco ? `\nFoco pedido pelo cliente: ${foco}.` : "";
  const prompt = `Escreva UM post novo para o Instagram e o Facebook.${evitar}${direcao}

Estamos em ${ano}. NÃO use anos nas hashtags (nada de #ENEM2024); se citar o ano, use ${ano}.

Sugestões de ângulos (escolha um ou invente outro melhor): dica prática de uma competência, erro comum que derruba nota, comparação antes/depois de nota, o que o corretor olha, como treinar em pouco tempo, curiosidade sobre a correção do ENEM, depoimento/pergunta do aluno.

Devolva no JSON do schema. O campo "destaque" precisa ser um trecho que apareça literalmente dentro do "headline".`;

  const { dados, modelo } = await gerarJson({ system: SYSTEM, prompt, schema: SCHEMA, temperature: 1.0 });
  return { ...dados, modelo };
}
