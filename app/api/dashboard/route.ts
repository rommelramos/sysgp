import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { bigintToString } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = BigInt(session.id);
  const isAdmin = session.perfil === "ADMINISTRADOR";

  const [
    projetosAtivos,
    bolsasVigentes,
    atividadesRecentes,
    totalBolsas,
    totalUsuarios,
  ] = await Promise.all([
    prisma.projeto.count({
      where: {
        status: "EM_ANDAMENTO",
        ...(!isAdmin && {
          OR: [
            { coordenadorId: userId },
            { membros: { some: { usuarioId: userId } } },
          ],
        }),
      },
    }),
    prisma.projetoMembro.count({
      where: {
        isBolsista: true,
        statusVinculo: "ATIVO",
        ...(!isAdmin && { usuarioId: userId }),
      },
    }),
    prisma.atividade.findMany({
      where: {
        ...(!isAdmin && { usuarioId: userId }),
      },
      include: {
        projeto: { select: { titulo: true } },
        usuario: { select: { nomeCompleto: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.projetoMembro.aggregate({
      where: { isBolsista: true, statusVinculo: "ATIVO", ...(!isAdmin && { usuarioId: userId }) },
      _sum: { valorBolsa: true },
    }),
    isAdmin ? prisma.usuario.count({ where: { ativo: true } }) : Promise.resolve(0),
  ]);

  return NextResponse.json(
    bigintToString({
      projetosAtivos,
      bolsasVigentes,
      atividadesRecentes,
      totalBolsas: totalBolsas._sum.valorBolsa || 0,
      totalUsuarios,
    })
  );
}
