import type { Perfil, StatusProjeto, StatusVinculo } from "@/app/generated/prisma";

export type { Perfil, StatusProjeto, StatusVinculo };

export interface SessionUser {
  id: string;
  email: string;
  nome: string;
  perfil: Perfil;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UsuarioComSupervisor {
  id: bigint;
  nomeCompleto: string;
  cpf: string;
  rg: string | null;
  dataNasc: Date | null;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  supervisorId: bigint | null;
  supervisor: { id: bigint; nomeCompleto: string } | null;
  createdAt: Date;
}

export interface ProjetoComCoord {
  id: bigint;
  titulo: string;
  descricao: string | null;
  areaTematica: string | null;
  dataInicio: Date | null;
  dataFimPrevista: Date | null;
  status: StatusProjeto;
  arquivoPath: string | null;
  coordenador: { id: bigint; nomeCompleto: string; email: string };
  _count: { membros: number; atividades: number };
}
