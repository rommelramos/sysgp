import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import Anthropic from "@anthropic-ai/sdk";
// pdf-parse v2 ESM build lacks a default export; require() loads the CJS build that does
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

export const maxDuration = 60;

const MAX_SIZE = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 30000;
const ALLOWED_EXTS = /\.(pdf|txt|md|doc|docx)$/i;

const SYSTEM_PROMPT = `Você é especialista em análise de planos de trabalho de bolsas de pesquisa e inovação (BEI, CNPq, FAPESPA, CAPES, etc.).

Ao extrair o cronograma de atividades:
- O cronograma pode aparecer como tabela com colunas de meses (1, 2, 3... até 12 ou mais) e linhas com nomes de atividades, onde "X" indica que a atividade ocorre naquele mês.
- Use "Início da Bolsa" ou "Início do projeto" como referência para o mês 1.
- Calcule as datas reais: mês N = data_inicio + (N-1) meses. Para dataInicio use o 1º dia do primeiro mês com X; para dataFim use o último dia do último mês com X.
- Exemplo: início 01/05/2026 + mês 5 = 01/09/2026; último dia = 30/09/2026.

Para o valor da bolsa:
- O valor pode estar em uma tabela de tipos de bolsa (BEI I, II, III, IV, V, VI). Identifique o tipo marcado com "X" e use o valor correspondente.

Para a função/cargo:
- Use o "Tipo de bolsa" como função (ex: "Bolsista BEI V"). Se houver campo de "função no projeto" ou "atividade principal", use esse.

Retorne APENAS um objeto JSON válido, sem texto antes ou depois. Omita campos não encontrados.
Datas no formato YYYY-MM-DD.`;

const EXTRACTION_PROMPT = `Extraia as informações do plano de trabalho e retorne SOMENTE um objeto JSON com os campos encontrados:

{
  "nomeProjeto": "nome/título do projeto",
  "nomeBolsista": "nome completo do bolsista",
  "funcao": "tipo de bolsa como função (ex: Bolsista BEI V)",
  "cargaHoraria": 20,
  "valorBolsa": 900.00,
  "duracaoMeses": 12,
  "dataInicioBolsa": "YYYY-MM-DD",
  "dataFimBolsa": "YYYY-MM-DD",
  "resultadosEsperados": "texto com resultados esperados",
  "cronograma": [
    { "nome": "nome da atividade", "dataInicio": "YYYY-MM-DD", "dataFim": "YYYY-MM-DD" }
  ],
  "metas": [
    { "descricao": "descrição da meta" }
  ]
}

Retorne apenas os campos que você encontrou com certeza. Nenhum texto adicional.

Documento:`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return NextResponse.json({ error: "Serviço de IA não configurado" }, { status: 503 });

  let file: File;
  try {
    const formData = await req.formData();
    const f = formData.get("arquivo") as File | null;
    if (!f) return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    if (f.size > MAX_SIZE) return NextResponse.json({ error: "Arquivo excede 10MB" }, { status: 400 });
    if (!ALLOWED_EXTS.test(f.name))
      return NextResponse.json({ error: "Use .pdf, .txt, .md, .doc ou .docx" }, { status: 400 });
    file = f;
  } catch {
    return NextResponse.json({ error: "Erro ao processar arquivo" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const isPDF = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";

    let docText: string;

    if (isPDF) {
      const buffer = Buffer.from(await file.arrayBuffer());
      let parsed: { text: string };
      try {
        parsed = await pdfParse(buffer);
      } catch {
        return NextResponse.json({ error: "Não foi possível ler o PDF. Tente salvar como .txt" }, { status: 400 });
      }
      docText = parsed.text.trim();
      if (!docText) return NextResponse.json({ error: "PDF sem texto extraível. Tente salvar como .txt" }, { status: 400 });
    } else {
      docText = (await file.text()).trim();
      if (!docText) return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });
    }

    if (docText.length > MAX_TEXT_CHARS) docText = docText.slice(0, MAX_TEXT_CHARS);

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user" as const, content: `${EXTRACTION_PROMPT}\n\n${docText}` }],
    });

    const content = response.content[0];
    if (content.type !== "text") return NextResponse.json({ error: "Resposta inesperada da IA" }, { status: 500 });

    const raw = content.text;
    let dados: unknown = null;

    // 1. direct parse
    try { dados = JSON.parse(raw); } catch { /* continue */ }

    // 2. strip markdown fences then parse
    if (!dados) {
      const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      try { dados = JSON.parse(stripped); } catch { /* continue */ }
    }

    // 3. extract first {...} block (handles preamble/postamble text)
    if (!dados) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) try { dados = JSON.parse(match[0]); } catch { /* continue */ }
    }

    if (!dados) {
      console.error("[extrair] parse failed, raw response:", raw.slice(0, 500));
      return NextResponse.json({ ok: false, error: "Modelo retornou resposta inválida. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, dados });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ ok: false, error: `Erro na extração: ${msg}` }, { status: 500 });
  }
}
