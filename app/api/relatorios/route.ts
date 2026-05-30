import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
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
            documentos: { select: { nomeOriginal: true, mimeType: true, caminho: true, conteudo: true } },
          },
          orderBy: { dataOcorrido: "asc" },
        },
      },
      orderBy: atividadeOrder,
    }) as AtividadeRow[];
  } catch {
    const rows = await prisma.atividade.findMany({
      where: atividadeWhere,
      include: { meta: { select: { descricao: true, ordem: true } } },
      orderBy: atividadeOrder,
    });
    atividades = (rows as unknown[]).map((r) => ({ ...(r as object), acoes: [] as AcaoRow[] })) as AtividadeRow[];
  }

  const merged = mergeAtividades(atividades);

  const pdfBytes = await gerarPDF({
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

  return new NextResponse(Buffer.from(pdfBytes) as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio_${projetoId}_${dataInicio}_${dataFim}.pdf"`,
    },
  });
}

// ── Types ─────────────────────────────────────────────────────────────

type DocRow = { nomeOriginal: string; mimeType: string; caminho: string; conteudo: Buffer | null };
type AcaoRow = { dataOcorrido: Date; descricao: string; documentos: DocRow[] };
type AtividadeRow = {
  titulo: string;
  descricao: string | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  concluida: boolean;
  meta: { descricao: string; ordem: number } | null;
  acoes: AcaoRow[];
};
type MembroRow = {
  funcao: string | null;
  metas: Array<{ descricao: string; ordem: number }>;
  usuario: { nomeCompleto: string };
};

// ── Merge activities with identical titles ────────────────────────────

function mergeAtividades(atividades: AtividadeRow[]): AtividadeRow[] {
  const map = new Map<string, AtividadeRow>();
  for (const a of atividades) {
    const key = a.titulo.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, { ...a, acoes: [...a.acoes] });
    } else {
      const existing = map.get(key)!;
      existing.acoes.push(...a.acoes);
      if (a.dataInicio && (!existing.dataInicio || a.dataInicio < existing.dataInicio)) existing.dataInicio = a.dataInicio;
      if (a.dataFim && (!existing.dataFim || a.dataFim > existing.dataFim)) existing.dataFim = a.dataFim;
      if (a.concluida) existing.concluida = true;
    }
  }
  for (const a of map.values())
    a.acoes.sort((x, y) => new Date(x.dataOcorrido).getTime() - new Date(y.dataOcorrido).getTime());
  return [...map.values()];
}

// ── Load file bytes — DB first, filesystem fallback ───────────────────

function lerArquivo(doc: { caminho: string; conteudo?: Buffer | null }): Buffer | null {
  // Primary source: binary content stored in the database
  if (doc.conteudo) return Buffer.isBuffer(doc.conteudo) ? doc.conteudo : Buffer.from(doc.conteudo);
  // Fallback: read from disk (local/self-hosted deployments)
  try {
    const filePath = join(process.cwd(), doc.caminho.startsWith("/") ? doc.caminho.slice(1) : doc.caminho);
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath);
  } catch {
    return null;
  }
}

// ── PDF generation with pdf-lib ───────────────────────────────────────

const PW = 595.28;  // A4 width (pts)
const PH = 841.89;  // A4 height (pts)
const ML = 50;      // left margin
const MR = 50;      // right margin
const MT = 45;      // top margin
const MB = 55;      // bottom margin
const UW = PW - ML - MR; // usable width

// Colours
const C_BLUE  = rgb(0.114, 0.306, 0.851);
const C_DARK  = rgb(0.067, 0.094, 0.153);
const C_GRAY  = rgb(0.420, 0.447, 0.502);
const C_LBLUE = rgb(0.937, 0.965, 1.000);
const C_BBLUE = rgb(0.749, 0.859, 0.996);
const C_GREEN = rgb(0.024, 0.369, 0.275);
const C_LGRN  = rgb(0.820, 0.980, 0.898);
const C_WHITE = rgb(1, 1, 1);

/** Layout context — y is "from top of page" */
interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  y: number;       // distance from top
  pageNum: number;
  regular: PDFFont;
  bold: PDFFont;
}

/** Convert "from-top" y to pdf-lib baseline y (for text of given size) */
const py = (y: number, size: number) => PH - y - size;
/** Convert "from-top" y to pdf-lib rectangle bottom-left y */
const ry = (y: number, h: number) => PH - y - h;

function addPage(ctx: Ctx): void {
  ctx.page = ctx.doc.addPage([PW, PH]);
  ctx.pageNum++;
  ctx.y = MT;
  // footer
  ctx.page.drawText("SysGP — Sistema Gerenciador de Projetos", { x: ML, y: 20, size: 8, font: ctx.regular, color: C_GRAY });
  ctx.page.drawText(`Página ${ctx.pageNum}`, { x: PW - MR - 40, y: 20, size: 8, font: ctx.regular, color: C_GRAY });
}

function ensure(ctx: Ctx, need: number): void {
  if (ctx.y + need > PH - MB) addPage(ctx);
}

function gap(ctx: Ctx, pts: number): void { ctx.y += pts; }

/** Wrap text into lines that fit within maxW */
function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) { lines.push(""); continue; }
    let cur = "";
    for (const word of para.split(" ").filter(Boolean)) {
      const test = cur ? `${cur} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxW && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

/** Draw single-line text at ctx.y, optionally advance */
function drawLine(ctx: Ctx, text: string, x: number, size: number, font: PDFFont, color = C_DARK, advance = true): void {
  ctx.page.drawText(text, { x, y: py(ctx.y, size), size, font, color });
  if (advance) ctx.y += size * 1.45;
}

/** Draw wrapped text block — advances ctx.y */
function drawBlock(ctx: Ctx, text: string, x: number, maxW: number, size: number, font: PDFFont, color = C_DARK, leading = 1.5): void {
  for (const line of wrap(text, font, size, maxW)) {
    ensure(ctx, size * leading + 4);
    if (line === "") { ctx.y += size * 0.6; continue; }
    ctx.page.drawText(line, { x, y: py(ctx.y, size), size, font, color });
    ctx.y += size * leading;
  }
}

/** Draw a section title with blue underline */
function drawSection(ctx: Ctx, title: string): void {
  ensure(ctx, 36);
  gap(ctx, 4);
  drawLine(ctx, title, ML, 12, ctx.bold, C_BLUE);
  ctx.page.drawLine({ start: { x: ML, y: PH - ctx.y + 4 }, end: { x: PW - MR, y: PH - ctx.y + 4 }, thickness: 1.5, color: C_BLUE });
  gap(ctx, 8);
}

/** Draw a filled rectangle at ctx.y — does NOT advance */
function drawRect(ctx: Ctx, x: number, w: number, h: number, fill: ReturnType<typeof rgb>, border?: ReturnType<typeof rgb>): void {
  ctx.page.drawRectangle({ x, y: ry(ctx.y, h), width: w, height: h, color: fill, ...(border ? { borderColor: border, borderWidth: 0.5 } : {}) });
}

/** Embed an image (JPEG or PNG) in the PDF document */
async function embedImage(ctx: Ctx, doc: DocRow): Promise<void> {
  const bytes = lerArquivo(doc);
  if (!bytes) return;
  try {
    const img = doc.mimeType === "image/png"
      ? await ctx.doc.embedPng(bytes)
      : await ctx.doc.embedJpg(bytes);
    const { width: iw, height: ih } = img.scale(1);
    // Scale to fit within usable width, max 400pt tall
    const scale = Math.min(UW / iw, 400 / ih, 1);
    const dw = iw * scale;
    const dh = ih * scale;
    ensure(ctx, dh + 20);
    ctx.page.drawImage(img, { x: ML, y: ry(ctx.y, dh), width: dw, height: dh });
    ctx.y += dh + 8;
  } catch { /* unsupported image format — skip */ }
}

// ── Main report generator ─────────────────────────────────────────────

async function gerarPDF({
  projeto,
  membros,
  atividades,
  periodo,
}: {
  projeto: { titulo: string; descricao: string | null; coordenadorNome: string; dataInicio: Date | null; dataFimPrevista: Date | null; status: string };
  membros: MembroRow[];
  atividades: AtividadeRow[];
  periodo: { inicio: string; fim: string };
}): Promise<Uint8Array> {

  const doc = await PDFDocument.create();
  const ctx: Ctx = {
    doc,
    page: doc.addPage([PW, PH]),
    y: MT,
    pageNum: 1,
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  // Footer on page 1
  ctx.page.drawText("SysGP — Sistema Gerenciador de Projetos", { x: ML, y: 20, size: 8, font: ctx.regular, color: C_GRAY });
  ctx.page.drawText("Página 1", { x: PW - MR - 40, y: 20, size: 8, font: ctx.regular, color: C_GRAY });

  // ── Cabeçalho ────────────────────────────────────────────────────────
  // Blue top bar
  ctx.page.drawRectangle({ x: ML, y: ry(ctx.y, 4), width: UW, height: 4, color: C_BLUE });
  gap(ctx, 12);

  drawLine(ctx, "SysGP", ML, 18, ctx.bold, C_BLUE);
  drawLine(ctx, "Sistema Gerenciador de Projetos", ML, 9, ctx.regular, C_GRAY);
  gap(ctx, 4);

  // Report label (right side, same y-area)
  const emitidoEm = `Emitido em ${formatarData(new Date())}`;
  const labelW = ctx.bold.widthOfTextAtSize("RELATÓRIO DE ATIVIDADES", 10);
  ctx.page.drawText("RELATÓRIO DE ATIVIDADES", { x: PW - MR - labelW, y: py(ctx.y - 36, 10), size: 10, font: ctx.bold, color: C_DARK });
  const emW = ctx.regular.widthOfTextAtSize(emitidoEm, 8);
  ctx.page.drawText(emitidoEm, { x: PW - MR - emW, y: py(ctx.y - 22, 8), size: 8, font: ctx.regular, color: C_GRAY });

  gap(ctx, 14);
  ctx.page.drawLine({ start: { x: ML, y: PH - ctx.y }, end: { x: PW - MR, y: PH - ctx.y }, thickness: 1, color: C_BLUE });
  gap(ctx, 10);

  // Project title
  drawBlock(ctx, projeto.titulo, ML, UW, 16, ctx.bold, C_DARK);
  gap(ctx, 2);
  drawLine(ctx, `Período do relatório: ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}`, ML, 10, ctx.regular, C_GRAY);
  gap(ctx, 10);

  // Info grid (2x2 cells)
  const cw = UW / 2 - 3;
  const ch = 38;
  const cells: [string, string][] = [
    ["Coordenador", projeto.coordenadorNome],
    ["Status do Projeto", projeto.status.replace(/_/g, " ")],
    ["Início do Projeto", formatarData(projeto.dataInicio)],
    ["Término Previsto", formatarData(projeto.dataFimPrevista)],
  ];
  for (let i = 0; i < cells.length; i += 2) {
    ensure(ctx, ch + 4);
    const [lbl0, val0] = cells[i];
    const [lbl1, val1] = cells[i + 1];
    const x0 = ML, x1 = ML + cw + 6;
    // Cell 0
    drawRect(ctx, x0, cw, ch, C_LBLUE, C_BBLUE);
    ctx.page.drawText(lbl0, { x: x0 + 8, y: ry(ctx.y, ch) + ch - 14, size: 8, font: ctx.regular, color: C_GRAY });
    ctx.page.drawText(val0.slice(0, 35), { x: x0 + 8, y: ry(ctx.y, ch) + 8, size: 10, font: ctx.bold, color: C_DARK });
    // Cell 1
    drawRect(ctx, x1, cw, ch, C_LBLUE, C_BBLUE);
    ctx.page.drawText(lbl1, { x: x1 + 8, y: ry(ctx.y, ch) + ch - 14, size: 8, font: ctx.regular, color: C_GRAY });
    ctx.page.drawText(val1.slice(0, 35), { x: x1 + 8, y: ry(ctx.y, ch) + 8, size: 10, font: ctx.bold, color: C_DARK });
    ctx.y += ch + 4;
  }
  gap(ctx, 10);

  // ── 1. Apresentação ──────────────────────────────────────────────────
  drawSection(ctx, "1. Apresentação");
  drawBlock(ctx,
    `Este relatório apresenta as atividades realizadas no âmbito do projeto "${projeto.titulo}", no período de ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}, sob coordenação de ${projeto.coordenadorNome}. Para cada atividade são descritas as ações executadas, com suas respectivas datas de ocorrência e documentos comprobatórios.`,
    ML, UW, 10, ctx.regular
  );
  gap(ctx, 14);

  // ── 2. Equipe ────────────────────────────────────────────────────────
  drawSection(ctx, "2. Equipe");

  // Table header
  ensure(ctx, 22);
  const colW = [UW * 0.35, UW * 0.22, UW * 0.43];
  const headers = ["Nome", "Função / Atuação", "Metas do Plano de Trabalho"];
  drawRect(ctx, ML, UW, 20, C_LBLUE, C_BBLUE);
  let hx = ML;
  for (let i = 0; i < 3; i++) {
    ctx.page.drawText(headers[i], { x: hx + 6, y: ry(ctx.y, 20) + 7, size: 8, font: ctx.bold, color: C_BLUE });
    hx += colW[i];
  }
  ctx.y += 20;

  for (const m of membros) {
    const metasStr = m.metas.length > 0 ? m.metas.map(mt => `${mt.ordem}. ${mt.descricao}`).join(" | ") : "—";
    const metasLines = wrap(metasStr, ctx.regular, 9, colW[2] - 12);
    const rowH = Math.max(18, metasLines.length * 13 + 6);
    ensure(ctx, rowH + 2);
    ctx.page.drawLine({ start: { x: ML, y: ry(ctx.y, 0) }, end: { x: PW - MR, y: ry(ctx.y, 0) }, thickness: 0.3, color: C_BBLUE });
    ctx.page.drawText(m.usuario.nomeCompleto.slice(0, 40), { x: ML + 6, y: ry(ctx.y, rowH) + rowH - 13, size: 9, font: ctx.bold, color: C_DARK });
    ctx.page.drawText(m.funcao || "—", { x: ML + colW[0] + 6, y: ry(ctx.y, rowH) + rowH - 13, size: 9, font: ctx.regular, color: C_GRAY });
    let my = ry(ctx.y, rowH) + rowH - 13;
    for (const ml of metasLines) {
      ctx.page.drawText(ml, { x: ML + colW[0] + colW[1] + 6, y: my, size: 9, font: ctx.regular, color: C_GRAY });
      my -= 13;
    }
    ctx.y += rowH + 2;
  }
  gap(ctx, 14);

  // ── 3. Atividades ────────────────────────────────────────────────────
  drawSection(ctx, "3. Atividades Realizadas no Período");

  if (atividades.length === 0) {
    drawLine(ctx, "Nenhuma atividade registrada no período informado.", ML, 10, ctx.regular, C_GRAY);
  }

  // Collect PDF attachments to merge at the end
  const pdfAttachmentsToMerge: Array<{ title: string; nomeOriginal: string; caminho: string; conteudo: Buffer | null }> = [];

  for (let ai = 0; ai < atividades.length; ai++) {
    const a = atividades[ai];
    ensure(ctx, 50);

    // Activity block — left blue border via a thin rectangle
    const blockStartY = ctx.y;
    gap(ctx, 8);

    // Activity title + status
    const statusLabel = a.concluida ? "Concluída" : "Em Andamento";
    const statusBg = a.concluida ? C_LGRN : C_LBLUE;
    const statusFg = a.concluida ? C_GREEN : C_BLUE;
    const sLabelW = ctx.bold.widthOfTextAtSize(statusLabel, 8) + 14;
    drawRect(ctx, PW - MR - sLabelW, sLabelW, 16, statusBg, a.concluida ? C_GREEN : C_BBLUE);
    ctx.page.drawText(statusLabel, { x: PW - MR - sLabelW + 7, y: ry(ctx.y, 16) + 5, size: 8, font: ctx.bold, color: statusFg });

    const titleMaxW = UW - sLabelW - 10;
    const titleLines = wrap(`${ai + 1}. ${a.titulo}`, ctx.bold, 11, titleMaxW);
    const blockTitleY = ctx.y;
    for (const tl of titleLines) {
      ctx.page.drawText(tl, { x: ML + 8, y: py(ctx.y, 11), size: 11, font: ctx.bold, color: C_BLUE });
      ctx.y += 11 * 1.4;
    }
    // Draw status badge aligned to first line of title
    ctx.page.drawRectangle({ x: PW - MR - sLabelW, y: ry(blockTitleY, 16), width: sLabelW, height: 16, color: statusBg, borderColor: a.concluida ? C_GREEN : C_BBLUE, borderWidth: 0.5 });
    ctx.page.drawText(statusLabel, { x: PW - MR - sLabelW + 7, y: ry(blockTitleY, 16) + 5, size: 8, font: ctx.bold, color: statusFg });

    if (a.meta) {
      ensure(ctx, 14);
      drawLine(ctx, `Meta ${a.meta.ordem}: ${a.meta.descricao}`, ML + 8, 9, ctx.regular, rgb(0.38, 0.40, 0.94));
    }
    if (a.dataInicio || a.dataFim) {
      ensure(ctx, 14);
      drawLine(ctx, `Período previsto: ${formatarData(a.dataInicio)} a ${formatarData(a.dataFim)}`, ML + 8, 9, ctx.regular, C_GRAY);
    }
    if (a.descricao) {
      ensure(ctx, 14);
      gap(ctx, 2);
      drawBlock(ctx, a.descricao.replace(/<[^>]+>/g, ""), ML + 8, UW - 16, 10, ctx.regular);
    }

    // Actions
    if (a.acoes.length === 0) {
      gap(ctx, 4);
      drawLine(ctx, "Nenhuma ação registrada para esta atividade no período.", ML + 8, 9, ctx.regular, C_GRAY);
    } else {
      gap(ctx, 6);
      ensure(ctx, 20);
      ctx.page.drawLine({ start: { x: ML + 8, y: PH - ctx.y }, end: { x: PW - MR, y: PH - ctx.y }, thickness: 0.5, color: C_BBLUE });
      gap(ctx, 5);
      drawLine(ctx, "AÇÕES REALIZADAS", ML + 8, 9, ctx.bold, C_DARK);
      gap(ctx, 4);

      for (let acIdx = 0; acIdx < a.acoes.length; acIdx++) {
        const ac = a.acoes[acIdx];
        ensure(ctx, 36);

        // Action header
        drawRect(ctx, ML + 8, UW - 16, 18, C_LBLUE);
        ctx.page.drawText(`Ação ${acIdx + 1}  ·  ${formatarData(ac.dataOcorrido)}`, {
          x: ML + 16, y: ry(ctx.y, 18) + 6, size: 9, font: ctx.bold, color: C_BLUE,
        });
        ctx.y += 18;
        gap(ctx, 4);

        // Description
        drawBlock(ctx, ac.descricao, ML + 8, UW - 16, 10, ctx.regular);
        gap(ctx, 4);

        // Evidence / attachments
        if (ac.documentos.length > 0) {
          ensure(ctx, 16);
          drawLine(ctx, "Evidências:", ML + 8, 9, ctx.bold, C_GRAY);
          gap(ctx, 2);

          for (const doc of ac.documentos) {
            const isImage = doc.mimeType.startsWith("image/");
            const isPdf   = doc.mimeType === "application/pdf";

            if (isImage) {
              // Embed image inline
              ensure(ctx, 20);
              drawLine(ctx, `📷  ${doc.nomeOriginal}`, ML + 12, 8, ctx.regular, C_GRAY);
              await embedImage(ctx, doc);
              gap(ctx, 4);
            } else if (isPdf) {
              // PDF: show label inline; pages will be appended at the end
              ensure(ctx, 14);
              drawLine(ctx, `📄  ${doc.nomeOriginal}  [ver páginas em anexo]`, ML + 12, 8, ctx.regular, C_GRAY);
              pdfAttachmentsToMerge.push({ title: `${a.titulo} — Ação ${acIdx + 1}`, nomeOriginal: doc.nomeOriginal, caminho: doc.caminho, conteudo: doc.conteudo });
              gap(ctx, 2);
            } else {
              ensure(ctx, 14);
              drawLine(ctx, `📎  ${doc.nomeOriginal}`, ML + 12, 8, ctx.regular, C_GRAY);
              gap(ctx, 2);
            }
          }
        }
        gap(ctx, 6);
      }
    }

    // Left blue border for the whole activity block
    const blockEndY = ctx.y;
    ctx.page.drawRectangle({ x: ML, y: PH - blockEndY, width: 3, height: blockEndY - blockStartY, color: C_BLUE });
    gap(ctx, 12);
  }

  // ── Rodapé do relatório ───────────────────────────────────────────────
  ensure(ctx, 30);
  ctx.page.drawLine({ start: { x: ML, y: PH - ctx.y }, end: { x: PW - MR, y: PH - ctx.y }, thickness: 0.5, color: C_BBLUE });
  gap(ctx, 6);
  drawLine(ctx, `Gerado automaticamente em ${formatarData(new Date())} — SysGP`, ML, 8, ctx.regular, C_GRAY);

  // ── Append PDF attachments ────────────────────────────────────────────
  if (pdfAttachmentsToMerge.length > 0) {
    for (const att of pdfAttachmentsToMerge) {
      const bytes = lerArquivo(att);
      if (!bytes) continue;
      try {
        const srcDoc = await PDFDocument.load(bytes);
        const indices = srcDoc.getPageIndices();
        // Cover page for this attachment
        const coverPage = doc.addPage([PW, PH]);
        coverPage.drawRectangle({ x: 0, y: PH - 80, width: PW, height: 80, color: C_BLUE });
        coverPage.drawText("ANEXO — DOCUMENTO COMPROBATÓRIO", { x: ML, y: PH - 36, size: 14, font: ctx.bold, color: C_WHITE });
        coverPage.drawText(att.title, { x: ML, y: PH - 55, size: 10, font: ctx.regular, color: rgb(0.8, 0.9, 1.0) });
        coverPage.drawText(att.nomeOriginal, { x: ML, y: PH - 70, size: 9, font: ctx.regular, color: rgb(0.7, 0.85, 1.0) });
        // Copy all pages from the attachment
        const copiedPages = await doc.copyPages(srcDoc, indices);
        copiedPages.forEach(p => doc.addPage(p));
      } catch { /* skip corrupt or unreadable PDF */ }
    }
  }

  return await doc.save();
}
