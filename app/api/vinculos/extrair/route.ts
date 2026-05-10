import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import Anthropic from "@anthropic-ai/sdk";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB — PDFs can be larger
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

Retorne apenas campos encontrados com confiança. Datas no formato YYYY-MM-DD. Omita campos ausentes.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    nomeProjeto: { type: "string" },
    nomeBolsista: { type: "string" },
    funcao: { type: "string" },
    cargaHoraria: { type: "number" },
    valorBolsa: { type: "number" },
    duracaoMeses: { type: "number" },
    dataInicioBolsa: { type: "string" },
    dataFimBolsa: { type: "string" },
    resultadosEsperados: { type: "string" },
    cronograma: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nome: { type: "string" },
          dataInicio: { type: "string" },
          dataFim: { type: "string" },
        },
        required: ["nome"],
        additionalProperties: false,
      },
    },
    metas: {
      type: "array",
      items: {
        type: "object",
        properties: { descricao: { type: "string" } },
        required: ["descricao"],
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;

const EXTRACTION_PROMPT = `Extraia as informações do plano de trabalho e retorne um objeto JSON com os campos:
- nomeProjeto (string): nome/título do projeto ao qual este plano de trabalho está vinculado
- nomeBolsista (string): nome completo do bolsista ou candidato descrito no plano de trabalho
- funcao (string): tipo de bolsa como função (ex: "Bolsista BEI V") ou cargo no projeto
- cargaHoraria (number): carga horária semanal em horas (apenas o número)
- valorBolsa (number): valor mensal da bolsa em reais (apenas o número, sem R$)
- duracaoMeses (number): duração da bolsa em meses
- dataInicioBolsa (string YYYY-MM-DD): data de início da bolsa
- dataFimBolsa (string YYYY-MM-DD): data de fim da bolsa (início + duração em meses)
- resultadosEsperados (string): lista dos resultados esperados como texto
- cronograma (array): cada atividade da tabela de cronograma com { nome, dataInicio (YYYY-MM-DD), dataFim (YYYY-MM-DD) } calculados a partir do mês de início
- metas (array): cada meta do plano de trabalho com { descricao } (apenas o título/nome da meta, sem a explicação)`;

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

    let userContent: Anthropic.MessageParam["content"];

    if (isPDF) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      userContent = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64,
          },
        } as Anthropic.DocumentBlockParam,
        { type: "text", text: EXTRACTION_PROMPT },
      ];
    } else {
      let text = await file.text();
      if (!text.trim()) return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });
      if (text.length > 40000) text = text.slice(0, 40000);
      userContent = `${EXTRACTION_PROMPT}\n\nDocumento:\n\n${text}`;
    }

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      output_config: {
        format: {
          type: "json_schema" as const,
          schema: OUTPUT_SCHEMA,
        },
      },
    });

    const content = response.content[0];
    if (content.type !== "text") return NextResponse.json({ error: "Resposta inesperada da IA" }, { status: 500 });

    const dados = JSON.parse(content.text);
    return NextResponse.json({ ok: true, dados });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ ok: false, error: `Erro na extração: ${msg}` }, { status: 500 });
  }
}
