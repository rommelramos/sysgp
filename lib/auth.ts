import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./prisma";
import type { Perfil } from "@/app/generated/prisma";

export const BCRYPT_ROUNDS = 12;

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, BCRYPT_ROUNDS);
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export function gerarToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function criarTokenRecuperacao(usuarioId: bigint): Promise<string> {
  const token = gerarToken();
  const tokenHash = hashToken(token);
  const expiraEm = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  await prisma.passwordResetToken.create({
    data: { usuarioId, tokenHash, expiraEm },
  });

  return token;
}

export async function validarTokenRecuperacao(token: string) {
  const tokenHash = hashToken(token);
  const registro = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usado: false,
      expiraEm: { gt: new Date() },
    },
    include: { usuario: true },
  });

  return registro;
}

export async function marcarTokenUsado(id: bigint) {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usado: true },
  });
}

export async function criarRefreshToken(usuarioId: bigint): Promise<string> {
  const token = gerarToken();
  const tokenHash = hashToken(token);
  const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  await prisma.refreshToken.create({
    data: { usuarioId, tokenHash, expiraEm },
  });

  return token;
}

export async function validarRefreshToken(token: string) {
  const tokenHash = hashToken(token);
  return prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revogado: false,
      expiraEm: { gt: new Date() },
    },
    include: { usuario: { select: { id: true, email: true, nomeCompleto: true, perfil: true, ativo: true } } },
  });
}

export async function revogarRefreshToken(token: string) {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revogado: true },
  });
}

export async function revogarTodosRefreshTokens(usuarioId: bigint) {
  await prisma.refreshToken.updateMany({
    where: { usuarioId, revogado: false },
    data: { revogado: true },
  });
}

export async function limparTokensExpirados() {
  await Promise.all([
    prisma.passwordResetToken.deleteMany({ where: { expiraEm: { lt: new Date() } } }),
    prisma.refreshToken.deleteMany({ where: { expiraEm: { lt: new Date() } } }),
  ]);
}

export function verificarPermissaoProjeto(
  perfil: Perfil,
  isCoordenador: boolean,
  acao: "criar" | "editar" | "vincular" | "ver"
): boolean {
  if (perfil === "ADMINISTRADOR") return true;
  if (acao === "criar") return false;
  if (acao === "editar" || acao === "vincular") return isCoordenador || perfil === "SUPERVISOR";
  return true;
}

export function mascaraCPF(cpf: string, perfil: Perfil): string {
  if (perfil === "ADMINISTRADOR") return cpf;
  return cpf.replace(/^(\d{3})\.(\d{3})\.(\d{3})-(\d{2})$/, "***.***.$3-**");
}
