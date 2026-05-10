import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import Anthropic from "@anthropic-ai/sdk";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_EXTS = /\.(txt|md|doc|docx)$/i;

const SYSTEM_PROMPT = `Você é um assistente especializado em extrair informações estruturadas de planos de trabalho acadêmicos e científicos. Analise o documento fornecido e extraia os dados do vínculo/plano de trabalho. Retorne apenas os campos que encontrar com confiança. Datas no formato YYYY-MM-DD. Omita campos não encontrados.`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return NextResponse.json({ error: "Serviço de IA não configurado" }, { status: 503 });

  let text: string;
  try {
    const formData = await req.formData();
    const file = formData.get("arquivo") as File | null;
    if (!file) return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Arquivo excede 2MB" }, { status: 400 });
    if (!ALLOWED_EXTS.test(file.name))
      return NextResponse.json({ error: "Use .txt, .md, .doc ou .docx" }, { status: 400 });

    text = await file.text();
    if (!text.trim()) return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });
    if (text.length > 40000) text = text.slice(0, 40000);
  } catch {
    return NextResponse.json({ error: "Erro ao processar arquivo" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Extraia as informações do plano de trabalho abaixo e retorne um objeto JSON com os campos:
- funcao (string): função ou cargo do membro no projeto
- cargaHoraria (number): carga horária semanal em horas
- valorBolsa (number): valor da bolsa em reais
- duracaoMeses (number): duração da bolsa em meses
- dataInicioBolsa (string YYYY-MM-DD): data de início da bolsa
- dataFimBolsa (string YYYY-MM-DD): data de fim da bolsa
- resultadosEsperados (string): resultados esperados com o membro
- cronograma (array): lista de atividades do cronograma, cada uma com { "nome": string, "dataInicio": string YYYY-MM-DD, "dataFim": string YYYY-MM-DD }
- metas (array): lista de metas do plano de trabalho, cada uma com { "descricao": string }

Documento:\n\n${text}`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema" as const,
          schema: {
            type: "object",
            properties: {
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
                },
              },
              metas: {
                type: "array",
                items: {
                  type: "object",
                  properties: { descricao: { type: "string" } },
                  required: ["descricao"],
                },
              },
            },
            additionalProperties: false,
          },
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
