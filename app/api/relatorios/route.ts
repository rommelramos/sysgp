import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { relatorioSchema } from "@/lib/validations/projeto";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { formatarData } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = relatorioSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { projetoId, usuarioIds, dataInicio, dataFim } = parsed.data;

  if (session.perfil === "MEMBRO") {
    if (usuarioIds.length > 1 || usuarioIds[0] !== session.id)
      return NextResponse.json({ error: "Membros só podem gerar seu próprio relatório" }, { status: 403 });
  }

  const projeto = await prisma.projeto.findUnique({
    where: { id: BigInt(projetoId) },
    include: { coordenador: { select: { nomeCompleto: true } } },
  });
  if (!projeto) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  const membros = await prisma.projetoMembro.findMany({
    where: { projetoId: BigInt(projetoId), usuarioId: { in: usuarioIds.map(BigInt) } },
    include: {
      usuario: { select: { id: true, nomeCompleto: true } },
      metas: { orderBy: { ordem: "asc" } },
    },
  });

  const atividadeWhere = {
    projetoId: BigInt(projetoId),
    usuarioId: { in: usuarioIds.map(BigInt) },
    dataInicio: { gte: new Date(dataInicio), lte: new Date(dataFim) },
  };
  const atividadeOrder = [{ dataInicio: "asc" as const }, { titulo: "asc" as const }];

  let atividades: AtividadeRow[];
  try {
    atividades = await prisma.atividade.findMany({
      where: atividadeWhere,
      include: {
        meta: { select: { descricao: true, ordem: true } },
        acoes: {
          include: {
            documentos: { select: { nomeOriginal: true, mimeType: true, caminho: true } },
          },
          orderBy: { dataOcorrido: "asc" },
        },
      },
      orderBy: atividadeOrder,
    }) as AtividadeRow[];
  } catch {
    // acoes_atividade table not yet migrated — retry without actions
    const rows = await prisma.atividade.findMany({
      where: atividadeWhere,
      include: { meta: { select: { descricao: true, ordem: true } } },
      orderBy: atividadeOrder,
    });
    atividades = (rows as AtividadeRow[]).map((r) => ({ ...r, acoes: [] }));
  }

  // ── Merge activities with the same title ────────────────────────────
  const merged = mergeAtividades(atividades);

  const html = gerarHTMLRelatorio({
    projeto: { ...projeto, coordenadorNome: projeto.coordenador.nomeCompleto },
    membros,
    atividades: merged,
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

// ── Types ─────────────────────────────────────────────────────────────

type DocRow = { nomeOriginal: string; mimeType: string; caminho: string };

type AcaoRow = {
  dataOcorrido: Date;
  descricao: string;
  documentos: DocRow[];
};

type AtividadeRow = {
  titulo: string;
  descricao: string | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  concluida: boolean;
  meta: { descricao: string; ordem: number } | null;
  acoes: AcaoRow[];
};

type AtividadeMesclada = AtividadeRow; // same shape after merge

type MembroRow = {
  funcao: string | null;
  metas: Array<{ descricao: string; ordem: number }>;
  usuario: { nomeCompleto: string };
};

// ── Merge activities with identical titles ────────────────────────────

function mergeAtividades(atividades: AtividadeRow[]): AtividadeMesclada[] {
  const map = new Map<string, AtividadeMesclada>();

  for (const a of atividades) {
    const key = a.titulo.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, { ...a, acoes: [...a.acoes] });
    } else {
      // Accumulate actions from duplicate entries
      const existing = map.get(key)!;
      existing.acoes.push(...a.acoes);
      // Pick earliest start and latest end across duplicates
      if (a.dataInicio && (!existing.dataInicio || a.dataInicio < existing.dataInicio))
        existing.dataInicio = a.dataInicio;
      if (a.dataFim && (!existing.dataFim || a.dataFim > existing.dataFim))
        existing.dataFim = a.dataFim;
      // If any copy is concluded, mark concluded
      if (a.concluida) existing.concluida = true;
    }
  }

  // Sort merged actions chronologically
  for (const a of map.values())
    a.acoes.sort((x, y) => new Date(x.dataOcorrido).getTime() - new Date(y.dataOcorrido).getTime());

  return [...map.values()];
}

// ── Embed image as base64 data URI (best-effort) ──────────────────────

function imagemEmbedded(doc: DocRow): string {
  const isImage = doc.mimeType.startsWith("image/");
  if (!isImage) return "";
  try {
    const filePath = join(process.cwd(), doc.caminho.startsWith("/") ? doc.caminho.slice(1) : doc.caminho);
    if (!existsSync(filePath)) return "";
    const base64 = readFileSync(filePath).toString("base64");
    return `data:${doc.mimeType};base64,${base64}`;
  } catch {
    return "";
  }
}

// ── Evidence block for one action's documents ─────────────────────────

function renderEvidencias(documentos: DocRow[]): string {
  if (documentos.length === 0) return "";

  const itens = documentos.map((doc) => {
    const dataUri = imagemEmbedded(doc);
    if (dataUri) {
      return `
        <div class="evidencia">
          <p class="ev-label">📷 Evidência — ${doc.nomeOriginal}</p>
          <img src="${dataUri}"
               alt="${doc.nomeOriginal}"
               style="max-width:100%; max-height:480px; display:block; border:1px solid #E5E7EB; border-radius:4px; margin-top:4px;" />
        </div>`;
    }
    const isPdf = doc.mimeType === "application/pdf";
    return `
      <div class="evidencia">
        <p class="ev-label">${isPdf ? "📄" : "📎"} Documento em anexo — ${doc.nomeOriginal}</p>
      </div>`;
  }).join("");

  return `<div class="evidencias-bloco">${itens}</div>`;
}

// ── HTML report ───────────────────────────────────────────────────────

function gerarHTMLRelatorio({
  projeto,
  membros,
  atividades,
  periodo,
}: {
  projeto: { titulo: string; descricao: string | null; coordenadorNome: string; dataInicio: Date | null; dataFimPrevista: Date | null; status: string };
  membros: MembroRow[];
  atividades: AtividadeMesclada[];
  periodo: { inicio: string; fim: string };
}): string {

  const atividadesHTML = atividades.map((a, ai) => `
    <div class="atividade-bloco">
      <!-- Activity header -->
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:6px;">
        <strong style="font-size:12px; color:#1D4ED8; line-height:1.4;">${ai + 1}. ${a.titulo}</strong>
        <span style="font-size:10px; padding:2px 8px; border-radius:99px; white-space:nowrap;
              background:${a.concluida ? "#D1FAE5" : "#DBEAFE"};
              color:${a.concluida ? "#065F46" : "#1e40af"};">
          ${a.concluida ? "Concluída" : "Em Andamento"}
        </span>
      </div>
      ${a.meta ? `<p style="font-size:10px; color:#6366F1; margin:0 0 3px;">Meta ${a.meta.ordem}: ${a.meta.descricao}</p>` : ""}
      ${(a.dataInicio || a.dataFim)
        ? `<p style="font-size:10px; color:#6B7280; margin:0 0 5px;">
             Período previsto: ${formatarData(a.dataInicio)} a ${formatarData(a.dataFim)}
           </p>` : ""}
      ${a.descricao
        ? `<p style="font-size:11px; color:#374151; margin:0 0 8px; line-height:1.55;">${a.descricao.replace(/<[^>]+>/g, "")}</p>`
        : ""}

      <!-- Actions -->
      ${a.acoes.length === 0
        ? `<p style="font-size:10px; color:#9CA3AF; font-style:italic; margin:6px 0 0;">Nenhuma ação registrada para esta atividade no período.</p>`
        : `
          <div style="border-top:1px solid #E5E7EB; margin-top:8px; padding-top:8px;">
            <p style="font-size:11px; font-weight:700; color:#374151; margin:0 0 8px; letter-spacing:0.02em;">
              AÇÕES REALIZADAS
            </p>
            ${a.acoes.map((ac, acIdx) => `
              <div class="acao-bloco">
                <p style="font-size:11px; font-weight:600; color:#1e40af; margin:0 0 5px;">
                  Ação ${acIdx + 1} &nbsp;·&nbsp; ${formatarData(ac.dataOcorrido)}
                </p>
                <p style="font-size:11px; color:#1f2937; margin:0 0 8px; line-height:1.6; white-space:pre-wrap;">${ac.descricao}</p>
                ${renderEvidencias(ac.documentos)}
              </div>
            `).join("")}
          </div>`}
    </div>
  `).join("");

  const equipeHTML = membros.map(m => `
    <tr>
      <td style="padding:6px 10px;"><strong>${m.usuario.nomeCompleto}</strong></td>
      <td style="padding:6px 10px; color:#6B7280;">${m.funcao || "—"}</td>
      <td style="padding:6px 10px; color:#6B7280;">${m.metas.length > 0
        ? m.metas.map(mt => `${mt.ordem}. ${mt.descricao}`).join("<br>")
        : "—"}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Relatório de Atividades — ${projeto.titulo}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #111827;
      margin: 0;
      padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 860px;
      margin: 0 auto;
      padding: 36px 48px 48px;
    }
    /* Header */
    .header-bar {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      border-bottom: 3px solid #1D4ED8;
      padding-bottom: 14px;
      margin-bottom: 22px;
    }
    .logo-title { font-size: 20px; font-weight: 900; color: #1D4ED8; letter-spacing: -0.5px; }
    .logo-sub { font-size: 9px; color: #9CA3AF; display: block; margin-top: 1px; }
    .report-label { font-size: 10px; color: #6B7280; text-align: right; line-height: 1.6; }
    /* Project title block */
    .project-title { font-size: 17px; font-weight: 800; color: #111827; margin: 0 0 4px; line-height: 1.3; }
    .period-label { font-size: 11px; color: #6B7280; margin: 0 0 20px; }
    /* Info grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 24px;
      font-size: 11px;
    }
    .info-grid .cell { padding: 8px 14px; border-bottom: 1px solid #BFDBFE; }
    .info-grid .cell:nth-last-child(-n+2) { border-bottom: none; }
    .info-grid .cell dt { color: #6B7280; font-weight: normal; }
    .info-grid .cell dd { color: #111827; font-weight: 700; margin: 1px 0 0; }
    /* Sections */
    .secao { margin-bottom: 28px; }
    .secao h2 {
      font-size: 13px;
      color: #1D4ED8;
      border-bottom: 2px solid #1D4ED8;
      padding-bottom: 5px;
      margin: 0 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    /* Team table */
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead th { background: #EFF6FF; color: #1e40af; text-align: left; padding: 6px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
    tbody td { border-bottom: 1px solid #F3F4F6; }
    tbody tr:last-child td { border-bottom: none; }
    /* Activity block */
    .atividade-bloco {
      margin-bottom: 20px;
      padding: 12px 16px;
      background: #F8FAFF;
      border-left: 3px solid #1D4ED8;
      border-radius: 0 6px 6px 0;
      page-break-inside: avoid;
    }
    /* Action block */
    .acao-bloco {
      margin-bottom: 12px;
      padding: 10px 12px;
      background: #fff;
      border: 1px solid #E5E7EB;
      border-radius: 4px;
      page-break-inside: avoid;
    }
    .acao-bloco:last-child { margin-bottom: 0; }
    /* Evidence */
    .evidencias-bloco { margin-top: 8px; }
    .evidencia { margin-bottom: 10px; }
    .ev-label {
      font-size: 10px;
      font-weight: 600;
      color: #6B7280;
      margin: 0 0 4px;
      padding: 3px 8px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 4px;
      display: inline-block;
    }
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 10px;
      border-top: 1px solid #E5E7EB;
      font-size: 9px;
      color: #9CA3AF;
      display: flex;
      justify-content: space-between;
    }
    /* Print strip */
    .print-strip {
      background: #1D4ED8;
      color: #fff;
      padding: 10px 48px;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    @media print {
      .print-strip { display: none !important; }
      .page { padding: 16px 24px; max-width: 100%; }
      body { font-size: 10.5px; }
    }
  </style>
</head>
<body>

  <!-- Print helper bar (hidden on print) -->
  <div class="print-strip">
    <span>📄 Relatório de Atividades — use <strong>Ctrl+P</strong> para salvar como PDF</span>
    <button onclick="window.print()"
      style="background:#fff; color:#1D4ED8; border:none; padding:5px 14px; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer;">
      Imprimir / Salvar PDF
    </button>
  </div>

  <div class="page">

    <!-- ── Cabeçalho ── -->
    <div class="header-bar">
      <div>
        <span class="logo-title">SysGP</span>
        <span class="logo-sub">Sistema Gerenciador de Projetos</span>
      </div>
      <div class="report-label">
        <strong>RELATÓRIO DE ATIVIDADES</strong><br>
        Emitido em ${formatarData(new Date())}
      </div>
    </div>

    <!-- ── Identificação do projeto ── -->
    <h1 class="project-title">${projeto.titulo}</h1>
    <p class="period-label">Período do relatório: <strong>${formatarData(periodo.inicio)}</strong> a <strong>${formatarData(periodo.fim)}</strong></p>

    <div class="info-grid">
      <div class="cell"><dl><dt>Coordenador</dt><dd>${projeto.coordenadorNome}</dd></dl></div>
      <div class="cell"><dl><dt>Status do Projeto</dt><dd>${projeto.status.replace("_", " ")}</dd></dl></div>
      <div class="cell"><dl><dt>Início</dt><dd>${formatarData(projeto.dataInicio)}</dd></dl></div>
      <div class="cell"><dl><dt>Término Previsto</dt><dd>${formatarData(projeto.dataFimPrevista)}</dd></dl></div>
    </div>

    ${projeto.descricao
      ? `<p style="font-size:11px; color:#374151; margin:0 0 24px; line-height:1.6;">${projeto.descricao}</p>`
      : ""}

    <!-- ── 1. Apresentação ── -->
    <div class="secao">
      <h2>1. Apresentação</h2>
      <p style="font-size:11px; color:#374151; line-height:1.65; margin:0;">
        Este relatório apresenta as atividades realizadas no âmbito do projeto
        <strong>${projeto.titulo}</strong>, no período de
        <strong>${formatarData(periodo.inicio)}</strong> a <strong>${formatarData(periodo.fim)}</strong>,
        sob coordenação de <strong>${projeto.coordenadorNome}</strong>.
        Para cada atividade são descritas as ações executadas, com suas respectivas datas
        de ocorrência e documentos comprobatórios que atestam a realização das atividades previstas.
      </p>
    </div>

    <!-- ── 2. Equipe ── -->
    <div class="secao">
      <h2>2. Equipe</h2>
      <table>
        <thead>
          <tr>
            <th style="width:35%;">Nome</th>
            <th style="width:25%;">Função / Atuação</th>
            <th>Metas do Plano de Trabalho</th>
          </tr>
        </thead>
        <tbody>
          ${equipeHTML}
        </tbody>
      </table>
    </div>

    <!-- ── 3. Atividades ── -->
    <div class="secao">
      <h2>3. Atividades Realizadas no Período</h2>
      ${atividades.length === 0
        ? `<p style="font-size:11px; color:#9CA3AF; font-style:italic;">Nenhuma atividade registrada no período informado.</p>`
        : atividadesHTML}
    </div>

    <!-- ── Rodapé ── -->
    <div class="footer">
      <span>SysGP — Sistema Gerenciador de Projetos</span>
      <span>Gerado automaticamente em ${formatarData(new Date())}</span>
    </div>

  </div>
</body>
</html>`;
}
