import { prisma } from "./prisma";

type AuditAcao =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FALHA"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "GENERATE_REPORT"
  | "UPLOAD"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_RESET";

export async function registrarAuditoria(params: {
  usuarioId?: bigint | null;
  acao: AuditAcao;
  entidade?: string;
  entidadeId?: bigint;
  ipAddress?: string;
  userAgent?: string;
  detalhes?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        usuarioId: params.usuarioId ?? null,
        acao: params.acao,
        entidade: params.entidade,
        entidadeId: params.entidadeId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        detalhes: params.detalhes ? (params.detalhes as object) : undefined,
      },
    });
  } catch {
    // Audit log failures should not break the main flow
  }
}

export function extrairIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
