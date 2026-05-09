import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { relatorioSchema } from "@/lib/validations/projeto";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { formatarData, formatarMoeda } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = relatorioSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { projetoId, usuarioIds, dataInicio, dataFim } = parsed.data;

  if (session.perfil === "MEMBRO") {
    if (usuarioIds.length > 1 || usuarioIds[0] !== session.id) {
      return NextResponse.json({ error: "Membros só podem gerar seu próprio relatório" }, { status: 403 });
    }
  }

  const projeto = await prisma.projeto.findUnique({
    where: { id: BigInt(projetoId) },
    include: { coordenador: { select: { nomeCompleto: true } } },
  });
  if (!projeto) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  const membros = await prisma.projetoMembro.findMany({
    where: {
      projetoId: BigInt(projetoId),
      usuarioId: { in: usuarioIds.map(BigInt) },
    },
    include: {
      usuario: { select: { id: true, nomeCompleto: true, email: true } },
    },
  });

  const atividades = await prisma.atividade.findMany({
    where: {
      projetoId: BigInt(projetoId),
      usuarioId: { in: usuarioIds.map(BigInt) },
      dataInicio: { gte: new Date(dataInicio), lte: new Date(dataFim) },
    },
    include: {
      usuario: { select: { nomeCompleto: true } },
      documentos: { select: { nomeOriginal: true, mimeType: true } },
    },
    orderBy: { dataInicio: "asc" },
  });

  const html = gerarHTMLRelatorio({
    projeto: { ...projeto, coordenadorNome: projeto.coordenador.nomeCompleto },
    membros,
    atividades,
    periodo: { inicio: dataInicio, fim: dataFim },
  });

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "GENERATE_REPORT",
    entidade: "projetos",
    entidadeId: BigInt(projetoId),
    ipAddress: extrairIP(req),
    detalhes: { membros: usuarioIds, periodo: { dataInicio, dataFim } },
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio_${projetoId}_${dataInicio}_${dataFim}.html"`,
    },
  });
}

function gerarHTMLRelatorio({
  projeto,
  membros,
  atividades,
  periodo,
}: {
  projeto: { titulo: string; descricao: string | null; coordenadorNome: string; dataInicio: Date | null; dataFimPrevista: Date | null; status: string };
  membros: Array<{ funcao: string | null; isBolsista: boolean; valorBolsa: unknown; dataInicioBolsa: Date | null; dataFimBolsa: Date | null; usuario: { nomeCompleto: string; email: string } }>;
  atividades: Array<{ titulo: string; descricao: string | null; dataInicio: Date | null; dataFim: Date | null; usuario: { nomeCompleto: string }; documentos: Array<{ nomeOriginal: string }> }>;
  periodo: { inicio: string; fim: string };
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório — ${projeto.titulo}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 0; padding: 20px; }
    h1 { font-size: 20px; color: #1D4ED8; border-bottom: 2px solid #1D4ED8; padding-bottom: 8px; }
    h2 { font-size: 15px; color: #1D4ED8; margin-top: 20px; }
    h3 { font-size: 13px; color: #374151; margin: 12px 0 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #EFF6FF; color: #1D4ED8; text-align: left; padding: 6px 10px; font-size: 11px; }
    td { padding: 5px 10px; border-bottom: 1px solid #E5E7EB; font-size: 11px; }
    tr:nth-child(even) td { background: #F9FAFB; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; }
    .badge-ativo { background: #D1FAE5; color: #065F46; }
    .periodo { font-size: 11px; color: #6B7280; margin-top: 4px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { font-size: 18px; font-weight: bold; color: #1D4ED8; }
    footer { margin-top: 30px; font-size: 10px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">SysGP</div>
    <div class="periodo">Gerado em ${formatarData(new Date())}</div>
  </div>

  <h1>${projeto.titulo}</h1>
  <p class="periodo">Período do relatório: ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}</p>
  ${projeto.descricao ? `<p>${projeto.descricao}</p>` : ""}

  <table>
    <tr><th>Coordenador</th><td>${projeto.coordenadorNome}</td></tr>
    <tr><th>Início do Projeto</th><td>${formatarData(projeto.dataInicio)}</td></tr>
    <tr><th>Término Previsto</th><td>${formatarData(projeto.dataFimPrevista)}</td></tr>
    <tr><th>Status</th><td>${projeto.status.replace("_", " ")}</td></tr>
  </table>

  <h2>Membros</h2>
  ${membros.map((m) => `
    <h3>${m.usuario.nomeCompleto}</h3>
    <table>
      <tr><th>Função</th><td>${m.funcao || "-"}</td></tr>
      <tr><th>Bolsista</th><td>${m.isBolsista ? "Sim" : "Não"}</td></tr>
      ${m.isBolsista ? `<tr><th>Valor da Bolsa</th><td>${formatarMoeda(Number(m.valorBolsa))}/mês</td></tr>
      <tr><th>Período da Bolsa</th><td>${formatarData(m.dataInicioBolsa)} a ${formatarData(m.dataFimBolsa)}</td></tr>` : ""}
    </table>
  `).join("")}

  <h2>Atividades no Período</h2>
  ${atividades.length === 0 ? "<p>Nenhuma atividade registrada no período.</p>" : `
  <table>
    <thead><tr><th>Título</th><th>Membro</th><th>Período</th><th>Documentos</th></tr></thead>
    <tbody>
      ${atividades.map((a) => `
        <tr>
          <td><strong>${a.titulo}</strong>${a.descricao ? `<br><small>${a.descricao.replace(/<[^>]+>/g, "").slice(0, 100)}...</small>` : ""}</td>
          <td>${a.usuario.nomeCompleto}</td>
          <td>${formatarData(a.dataInicio)} a ${formatarData(a.dataFim)}</td>
          <td>${a.documentos.map((d) => d.nomeOriginal).join(", ") || "-"}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>`}

  <footer>
    SysGP — Sistema Gerenciador de Projetos • Relatório gerado automaticamente
  </footer>
</body>
</html>`;
}
