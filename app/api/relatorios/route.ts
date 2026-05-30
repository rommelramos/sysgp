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
      metas: { orderBy: { ordem: "asc" } },
    },
  });

  const atividadeWhere = {
    projetoId: BigInt(projetoId),
    usuarioId: { in: usuarioIds.map(BigInt) },
    dataInicio: { gte: new Date(dataInicio), lte: new Date(dataFim) },
  };
  const atividadeOrder = [{ usuario: { nomeCompleto: "asc" as const } }, { dataInicio: "asc" as const }];

  let atividades: AtividadeRow[];
  try {
    atividades = await prisma.atividade.findMany({
      where: atividadeWhere,
      include: {
        usuario: { select: { nomeCompleto: true } },
        meta: { select: { descricao: true, ordem: true } },
        documentos: { select: { nomeOriginal: true, mimeType: true } },
        acoes: {
          include: { documentos: { select: { nomeOriginal: true, mimeType: true } } },
          orderBy: { dataOcorrido: "asc" },
        },
      },
      orderBy: atividadeOrder,
    }) as AtividadeRow[];
  } catch {
    // Tabela acoes_atividade ainda não migrada — retry sem ações
    const rows = await prisma.atividade.findMany({
      where: atividadeWhere,
      include: {
        usuario: { select: { nomeCompleto: true } },
        meta: { select: { descricao: true, ordem: true } },
        documentos: { select: { nomeOriginal: true, mimeType: true } },
      },
      orderBy: atividadeOrder,
    });
    atividades = rows.map((r) => ({ ...r, acoes: [] })) as AtividadeRow[];
  }

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
      "Content-Disposition": `inline; filename="relatorio_${projetoId}_${dataInicio}_${dataFim}.html"`,
    },
  });
}

type AcaoRow = {
  dataOcorrido: Date;
  descricao: string;
  documentos: Array<{ nomeOriginal: string; mimeType: string }>;
};

type AtividadeRow = {
  titulo: string;
  descricao: string | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  concluida: boolean;
  usuario: { nomeCompleto: string };
  meta: { descricao: string; ordem: number } | null;
  documentos: Array<{ nomeOriginal: string; mimeType: string }>;
  acoes: AcaoRow[];
};

type MembroRow = {
  funcao: string | null;
  isBolsista: boolean;
  valorBolsa: unknown;
  dataInicioBolsa: Date | null;
  dataFimBolsa: Date | null;
  metas: Array<{ descricao: string; ordem: number }>;
  usuario: { nomeCompleto: string; email: string };
};

function gerarHTMLRelatorio({
  projeto,
  membros,
  atividades,
  periodo,
}: {
  projeto: { titulo: string; descricao: string | null; coordenadorNome: string; dataInicio: Date | null; dataFimPrevista: Date | null; status: string };
  membros: MembroRow[];
  atividades: AtividadeRow[];
  periodo: { inicio: string; fim: string };
}): string {
  const atividadesPorMembro = new Map<string, AtividadeRow[]>();
  atividades.forEach((a) => {
    const nome = a.usuario.nomeCompleto;
    if (!atividadesPorMembro.has(nome)) atividadesPorMembro.set(nome, []);
    atividadesPorMembro.get(nome)!.push(a);
  });

  const secaoAtividades = membros.map((m, idx) => {
    const atvsDoMembro = atividadesPorMembro.get(m.usuario.nomeCompleto) || [];
    const secNum = idx + 3; // sections start at 3 (1=Apresentação, 2=Equipe, 3+=Atividades por membro)

    const atividadeHTML = atvsDoMembro.map((a, ai) => `
      <div class="atividade-bloco" style="margin-bottom:18px; padding:12px 14px; background:#F8FAFF; border-left:3px solid #1D4ED8; border-radius:0 6px 6px 0;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
          <strong style="font-size:12px; color:#1D4ED8;">${ai + 1}. ${a.titulo}</strong>
          <span style="font-size:10px; padding:2px 8px; border-radius:99px; background:${a.concluida ? "#D1FAE5" : "#DBEAFE"}; color:${a.concluida ? "#065F46" : "#1D4ED8"};">
            ${a.concluida ? "Concluída" : "Em Andamento"}
          </span>
        </div>
        ${a.meta ? `<p style="font-size:10px; color:#6366F1; margin:0 0 4px;">Meta ${a.meta.ordem}: ${a.meta.descricao}</p>` : ""}
        ${a.dataInicio || a.dataFim ? `<p style="font-size:10px; color:#6B7280; margin:0 0 6px;">Período: ${formatarData(a.dataInicio)} a ${formatarData(a.dataFim)}</p>` : ""}
        ${a.descricao ? `<p style="font-size:11px; color:#374151; margin:0 0 8px; line-height:1.5;">${a.descricao.replace(/<[^>]+>/g, "")}</p>` : ""}
        ${a.documentos.length > 0 ? `
          <p style="font-size:10px; color:#6B7280; margin:0 0 8px;">
            📎 Documentos: ${a.documentos.map(d => d.nomeOriginal).join(", ")}
          </p>` : ""}
        ${a.acoes.length > 0 ? `
          <div style="margin-top:10px;">
            <p style="font-size:11px; font-weight:600; color:#374151; margin:0 0 6px; border-top:1px solid #E5E7EB; padding-top:8px;">
              Ações Realizadas (${a.acoes.length}):
            </p>
            ${a.acoes.map((ac, acIdx) => `
              <div style="margin-bottom:8px; padding:8px 10px; background:#fff; border:1px solid #E5E7EB; border-radius:4px;">
                <p style="font-size:10px; font-weight:600; color:#1D4ED8; margin:0 0 4px;">
                  Ação ${acIdx + 1} — ${formatarData(ac.dataOcorrido)}
                </p>
                <p style="font-size:11px; color:#374151; margin:0; line-height:1.5; white-space:pre-wrap;">${ac.descricao}</p>
                ${ac.documentos.length > 0 ? `
                  <p style="font-size:10px; color:#6B7280; margin:4px 0 0;">
                    📎 ${ac.documentos.map(d => d.nomeOriginal).join(", ")}
                  </p>` : ""}
              </div>
            `).join("")}
          </div>
        ` : `<p style="font-size:10px; color:#9CA3AF; font-style:italic; margin:8px 0 0;">Nenhuma ação registrada para esta atividade.</p>`}
      </div>
    `).join("");

    return `
      <div class="secao" style="margin-bottom:32px;">
        <h2 style="font-size:14px; color:#1D4ED8; border-bottom:2px solid #1D4ED8; padding-bottom:6px; margin-bottom:14px;">
          ${secNum}. Atividades — ${m.usuario.nomeCompleto}
        </h2>
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:11px;">
          <tr><th style="text-align:left; padding:4px 8px; background:#EFF6FF; color:#1D4ED8; width:140px;">Função</th>
              <td style="padding:4px 8px;">${m.funcao || "—"}</td></tr>
          ${m.isBolsista ? `
          <tr><th style="text-align:left; padding:4px 8px; background:#EFF6FF; color:#1D4ED8;">Bolsa Mensal</th>
              <td style="padding:4px 8px;">${formatarMoeda(Number(m.valorBolsa))}</td></tr>
          <tr><th style="text-align:left; padding:4px 8px; background:#EFF6FF; color:#1D4ED8;">Período da Bolsa</th>
              <td style="padding:4px 8px;">${formatarData(m.dataInicioBolsa)} a ${formatarData(m.dataFimBolsa)}</td></tr>
          ` : ""}
        </table>
        ${m.metas.length > 0 ? `
          <p style="font-size:11px; font-weight:600; color:#374151; margin:0 0 6px;">Metas do Plano de Trabalho:</p>
          <ol style="font-size:11px; color:#374151; margin:0 0 12px; padding-left:18px;">
            ${m.metas.map(mt => `<li style="margin-bottom:3px;">${mt.descricao}</li>`).join("")}
          </ol>
        ` : ""}
        ${atvsDoMembro.length === 0
          ? `<p style="font-size:11px; color:#9CA3AF; font-style:italic;">Nenhuma atividade registrada no período.</p>`
          : atividadeHTML}
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Relatório de Atividades — ${projeto.titulo}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 48px;
    }
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #1D4ED8;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .logo-area { display: flex; flex-direction: column; }
    .logo-title { font-size: 22px; font-weight: 900; color: #1D4ED8; letter-spacing: -0.5px; }
    .logo-sub { font-size: 10px; color: #6B7280; margin-top: 2px; }
    .report-title { font-size: 11px; color: #374151; text-align: right; }
    h1 { font-size: 18px; color: #111827; margin: 0 0 6px; line-height: 1.3; }
    .subtitle { font-size: 11px; color: #6B7280; margin: 0 0 24px; }
    .info-box {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 28px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 24px;
      font-size: 11px;
    }
    .info-box dt { color: #6B7280; }
    .info-box dd { color: #111827; font-weight: 600; margin: 0; }
    h2 { font-size: 14px; color: #1D4ED8; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #EFF6FF; color: #1D4ED8; text-align: left; padding: 6px 10px; font-size: 11px; }
    td { padding: 5px 10px; border-bottom: 1px solid #E5E7EB; font-size: 11px; }
    tr:nth-child(even) td { background: #F9FAFB; }
    footer {
      margin-top: 48px;
      padding-top: 12px;
      border-top: 1px solid #E5E7EB;
      font-size: 10px;
      color: #9CA3AF;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { font-size: 11px; }
      .page { padding: 20px 28px; max-width: 100%; }
      .no-print { display: none !important; }
      .secao { page-break-inside: avoid; }
      .atividade-bloco { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background:#1D4ED8; color:#fff; padding:10px 48px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
    <span>📄 Relatório de Atividades — use Ctrl+P para salvar como PDF</span>
    <button onclick="window.print()" style="background:#fff; color:#1D4ED8; border:none; padding:6px 16px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Imprimir / Salvar PDF</button>
  </div>

  <div class="page">
    <!-- Cabeçalho -->
    <div class="header-bar">
      <div class="logo-area">
        <span class="logo-title">SysGP</span>
        <span class="logo-sub">Sistema Gerenciador de Projetos</span>
      </div>
      <div class="report-title">
        <strong>RELATÓRIO PARCIAL DE ATIVIDADES</strong><br>
        Gerado em ${formatarData(new Date())}
      </div>
    </div>

    <!-- Título do projeto -->
    <h1>${projeto.titulo}</h1>
    <p class="subtitle">Período do relatório: ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}</p>

    <!-- Informações gerais do projeto -->
    <dl class="info-box">
      <dt>Coordenador</dt><dd>${projeto.coordenadorNome}</dd>
      <dt>Status</dt><dd>${projeto.status.replace("_", " ")}</dd>
      <dt>Início do Projeto</dt><dd>${formatarData(projeto.dataInicio)}</dd>
      <dt>Término Previsto</dt><dd>${formatarData(projeto.dataFimPrevista)}</dd>
    </dl>
    ${projeto.descricao ? `<p style="font-size:12px; color:#374151; margin-bottom:24px; line-height:1.6;">${projeto.descricao}</p>` : ""}

    <!-- Seção 1: Apresentação -->
    <div class="secao" style="margin-bottom:32px;">
      <h2 style="font-size:14px; color:#1D4ED8; border-bottom:2px solid #1D4ED8; padding-bottom:6px; margin-bottom:14px;">
        1. Apresentação
      </h2>
      <p style="font-size:11px; color:#374151; line-height:1.6; margin:0;">
        Este relatório apresenta as atividades realizadas pelos membros do projeto <strong>${projeto.titulo}</strong>
        no período de ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)},
        sob coordenação de <strong>${projeto.coordenadorNome}</strong>.
        As atividades descritas a seguir foram registradas no Sistema Gerenciador de Projetos (SysGP),
        com suas respectivas ações, documentos comprobatórios e indicadores de progresso.
      </p>
    </div>

    <!-- Seção 2: Equipe -->
    <div class="secao" style="margin-bottom:32px;">
      <h2 style="font-size:14px; color:#1D4ED8; border-bottom:2px solid #1D4ED8; padding-bottom:6px; margin-bottom:14px;">
        2. Equipe do Projeto
      </h2>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Função</th>
            <th>Bolsista</th>
            <th>Valor da Bolsa</th>
          </tr>
        </thead>
        <tbody>
          ${membros.map(m => `
            <tr>
              <td><strong>${m.usuario.nomeCompleto}</strong><br><small style="color:#9CA3AF">${m.usuario.email}</small></td>
              <td>${m.funcao || "—"}</td>
              <td>${m.isBolsista ? "Sim" : "Não"}</td>
              <td>${m.isBolsista ? formatarMoeda(Number(m.valorBolsa)) + "/mês" : "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <!-- Seções 3+: Atividades por membro -->
    ${secaoAtividades}

    <footer>
      <span>SysGP — Sistema Gerenciador de Projetos</span>
      <span>Relatório gerado automaticamente em ${formatarData(new Date())}</span>
    </footer>
  </div>
</body>
</html>`;
}
