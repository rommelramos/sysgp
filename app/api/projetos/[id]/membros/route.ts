import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { membroProjetoSchema } from "@/lib/validations/projeto";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { bigintToString } from "@/lib/utils";

async function podeModerarMembros(session: { id: string; perfil: string }, projetoId: bigint) {
  if (session.perfil === "ADMINISTRADOR") return true;
  const membro = await prisma.projetoMembro.findFirst({
    where: { projetoId, usuarioId: BigInt(session.id), isCoordenador: true },
  });
  return !!membro;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const projetoId = BigInt(id);

  const pode = await podeModerarMembros(session, projetoId);
  if (!pode) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = membroProjetoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const d = parsed.data;

  if (d.isCoordenador) {
    await prisma.projetoMembro.updateMany({
      where: { projetoId, isCoordenador: true },
      data: { isCoordenador: false },
    });
  }

  const membro = await prisma.projetoMembro.upsert({
    where: { projetoId_usuarioId: { projetoId, usuarioId: BigInt(d.usuarioId) } },
    create: {
      projetoId,
      usuarioId: BigInt(d.usuarioId),
      funcao: d.funcao || null,
      isCoordenador: d.isCoordenador,
      isBolsista: d.isBolsista,
      valorBolsa: d.valorBolsa ?? null,
      duracaoMeses: d.duracaoMeses || null,
      dataInicioBolsa: d.dataInicioBolsa ? new Date(d.dataInicioBolsa) : null,
      dataFimBolsa: d.dataFimBolsa ? new Date(d.dataFimBolsa) : null,
      statusVinculo: d.statusVinculo as "ATIVO" | "ENCERRADO" | "SUSPENSO",
    },
    update: {
      funcao: d.funcao || null,
      isCoordenador: d.isCoordenador,
      isBolsista: d.isBolsista,
      valorBolsa: d.valorBolsa ?? null,
      duracaoMeses: d.duracaoMeses || null,
      dataInicioBolsa: d.dataInicioBolsa ? new Date(d.dataInicioBolsa) : null,
      dataFimBolsa: d.dataFimBolsa ? new Date(d.dataFimBolsa) : null,
      statusVinculo: d.statusVinculo as "ATIVO" | "ENCERRADO" | "SUSPENSO",
    },
    include: { usuario: { select: { id: true, nomeCompleto: true, email: true } } },
  });

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "CREATE",
    entidade: "projeto_membros",
    entidadeId: membro.id,
    ipAddress: extrairIP(req),
  });

  return NextResponse.json(bigintToString(membro), { status: 201 });
}
