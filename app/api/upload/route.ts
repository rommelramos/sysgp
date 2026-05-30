import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/session";
import { registrarAuditoria, extrairIP } from "@/lib/audit";

const ALLOWED_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const origem = (formData.get("origem") as string) || "UPLOAD";

    if (!files.length)
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

    const resultados = await Promise.all(
      files.map(async (file) => {
        if (!ALLOWED_MIMES.includes(file.type))
          return { error: `Tipo não suportado: ${file.name}`, nome: file.name };
        if (file.size > MAX_SIZE)
          return { error: `Arquivo excede 20 MB: ${file.name}`, nome: file.name };

        const ext = file.name.split(".").pop() || "bin";
        const nomeArquivo = `${uuidv4()}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        // ── Persist to disk when possible (self-hosted / local dev) ────────
        // On Vercel and other read-only filesystems this silently fails;
        // file content is always returned as base64 for reliable DB storage.
        try {
          const { writeFile, mkdir } = await import("fs/promises");
          const { join } = await import("path");
          const uploadDir = join(process.cwd(), "uploads");
          await mkdir(uploadDir, { recursive: true });
          await writeFile(join(uploadDir, nomeArquivo), buffer);
        } catch {
          // read-only filesystem — content travels via base64 below
        }

        await registrarAuditoria({
          usuarioId: BigInt(session.id),
          acao: "UPLOAD",
          ipAddress: extrairIP(req),
          detalhes: { nome: file.name, tamanho: file.size, mime: file.type },
        });

        return {
          nomeOriginal: file.name,
          nomeArquivo,
          caminho: `/uploads/${nomeArquivo}`,
          mimeType: file.type,
          tamanhoBytes: file.size,
          origem: origem as "UPLOAD" | "PASTE",
          conteudoBase64: buffer.toString("base64"), // always sent → stored in DB
        };
      })
    );

    const sucessos = resultados.filter((r) => !("error" in r));
    const erros    = resultados.filter((r) =>  "error" in r);

    return NextResponse.json({ arquivos: sucessos, erros }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno no upload" }, { status: 500 });
  }
}
