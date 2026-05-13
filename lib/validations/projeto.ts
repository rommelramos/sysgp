import { z } from "zod";

export const projetoSchema = z.object({
  titulo: z.string().min(3, "Título obrigatório"),
  descricao: z.string().optional(),
  areaTematica: z.string().optional(),
  instituicaoExecucao: z.string().optional(),
  instituicaoFinanciadora: z.string().optional(),
  areaConhecimento: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFimPrevista: z.string().optional(),
  status: z.enum(["EM_ANDAMENTO", "CONCLUIDO", "SUSPENSO"]).default("EM_ANDAMENTO"),
  coordenadorId: z.string().min(1, "Coordenador obrigatório"),
});

export const membroProjetoSchema = z.object({
  usuarioId: z.string().min(1, "Usuário obrigatório"),
  funcao: z.string().optional(),
  isCoordenador: z.boolean().default(false),
  isBolsista: z.boolean().default(false),
  valorBolsa: z.preprocess(
    (v) => (v === null || v === undefined || v === "") ? null : Number(v),
    z.number().positive().optional().nullable()
  ),
  duracaoMeses: z.number().int().positive().optional().nullable(),
  dataInicioBolsa: z.string().optional().nullable(),
  dataFimBolsa: z.string().optional().nullable(),
  cargaHoraria: z.number().int().positive().optional().nullable(),
  resultadosEsperados: z.string().optional().nullable(),
  cronograma: z.array(z.object({
    nome: z.string(),
    dataInicio: z.string().optional().nullable(),
    dataFim: z.string().optional().nullable(),
  })).optional().nullable(),
  statusVinculo: z.enum(["ATIVO", "ENCERRADO", "SUSPENSO"]).default("ATIVO"),
  metas: z.array(z.object({ descricao: z.string().min(1), ordem: z.number().int().default(1) })).optional(),
});

export const metaSchema = z.object({
  descricao: z.string().min(1, "Descrição da meta obrigatória"),
  ordem: z.number().int().default(1),
});

export const atividadeSchema = z.object({
  projetoId: z.string().min(1, "Projeto obrigatório"),
  metaId: z.string().optional().nullable(),
  titulo: z.string().min(3, "Título obrigatório"),
  descricao: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  concluida: z.boolean().optional(),
});

export const relatorioSchema = z.object({
  projetoId: z.string().min(1, "Projeto obrigatório"),
  usuarioIds: z.array(z.string()).min(1, "Selecione ao menos um membro"),
  dataInicio: z.string().min(1, "Data de início obrigatória"),
  dataFim: z.string().min(1, "Data de fim obrigatória"),
});
