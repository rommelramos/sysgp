import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import Anthropic from "@anthropic-ai/sdk";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTS = /\.(pdf|txt|md|doc|docx)$/i;

const SYSTEM_PROMPT = `Você é especialista em análise de documentos de projetos de pesquisa acadêmica, científica e de inovação. Extraia informações estruturadas com precisão. Retorne apenas os campos encontrados com confiança. Datas no formato YYYY-MM-DD. Omita campos ausentes (não retorne null nem string vazia).`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    titulo: { type: "string" },
    descricao: { type: "string" },
    areaTematica: { type: "string" },
    areaConhecimento: { type: "string" },
    instituicaoExecucao: { type: "string" },
    instituicaoFinanciadora: { type: "string" },
    dataInicio: { type: "string" },
    dataFimPrevista: { type: "string" },
  },
  additionalProperties: false,
} as const;

const EXTRACTION_PROMPT = `Extraia as informações do projeto do documento e retorne um objeto JSON com os campos (inclua apenas os que encontrar):
- titulo (string): nome/título do projeto
- descricao (string): objetivo geral ou resumo do projeto
- areaTematica (string): área temática do projeto
- areaConhecimento (string): área do conhecimento CNPq (ex: "3.00.00.00-9 Engenharias" ou "Ciências Exatas e da Terra")
- instituicaoExecucao (string): instituição que executa o projeto
- instituicaoFinanciadora (string): instituição ou secretaria financiadora (ex: CNPq, FAPESPA, CAPES, Secretaria de Estado...)
- dataInicio (string YYYY-MM-DD): data de início do projeto
- dataFimPrevista (string YYYY-MM-DD): data de término prevista`;

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
      if (!text.trim()) return NextResponse.json({ error: "Arquivo vazio ou sem texto legível" }, { status: 400 });
      if (text.length > 40000) text = text.slice(0, 40000);
      userContent = `${EXTRACTION_PROMPT}\n\nTexto do documento:\n\n${text}`;
    }

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
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

    const extraido = JSON.parse(content.text);
    return NextResponse.json({ ok: true, dados: extraido });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ ok: false, error: `Erro na extração: ${msg}` }, { status: 500 });
  }
}
