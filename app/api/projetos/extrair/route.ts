import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import Anthropic from "@anthropic-ai/sdk";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIMES = ["text/plain", "text/markdown", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

const SYSTEM_PROMPT = `Você é um assistente especializado em extrair informações estruturadas de documentos de projetos de pesquisa acadêmica e científica. Analise o texto fornecido e extraia as informações relevantes do projeto com precisão. Retorne apenas os campos que conseguir identificar com confiança no texto. Para datas, use o formato YYYY-MM-DD. Se não encontrar uma informação, omita o campo (não retorne null ou string vazia).`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return NextResponse.json({ error: "Serviço de IA não configurado" }, { status: 503 });

  let text: string;
  try {
    const formData = await req.formData();
    const file = formData.get("arquivo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo excede 2MB" }, { status: 400 });
    }
    if (!ALLOWED_MIMES.includes(file.type) && !file.name.match(/\.(txt|md|doc|docx)$/i)) {
      return NextResponse.json({ error: "Formato não suportado. Use .txt, .md, .doc ou .docx" }, { status: 400 });
    }

    text = await file.text();
    if (!text.trim()) {
      return NextResponse.json({ error: "Arquivo vazio ou sem texto legível" }, { status: 400 });
    }
    // Trim to ~40k chars to stay well within token limits
    if (text.length > 40000) text = text.slice(0, 40000);
  } catch {
    return NextResponse.json({ error: "Erro ao processar arquivo" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Extraia as informações do projeto do texto abaixo e retorne um objeto JSON com os seguintes campos (inclua apenas os que encontrar):\n- titulo (string): nome/título do projeto\n- descricao (string): descrição, objetivo geral ou resumo do projeto\n- areaTematica (string): área temática do projeto\n- areaConhecimento (string): área do conhecimento CNPq (ex: "Ciências Exatas e da Terra")\n- instituicaoExecucao (string): instituição que executa o projeto\n- instituicaoFinanciadora (string): agência financiadora ou patrocinadora (ex: CNPq, FAPESPA, CAPES)\n- dataInicio (string YYYY-MM-DD): data de início\n- dataFimPrevista (string YYYY-MM-DD): data de término prevista\n\nTexto do documento:\n\n${text}`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema" as const,
          schema: {
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
          },
        },
      },
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Resposta inesperada da IA" }, { status: 500 });
    }

    const extraido = JSON.parse(content.text);
    return NextResponse.json({ ok: true, dados: extraido });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ ok: false, error: `Erro na extração: ${msg}` }, { status: 500 });
  }
}
