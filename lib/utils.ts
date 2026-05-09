import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarData(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

export function formatarMoeda(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return "-";
  const num = typeof valor === "string" ? parseFloat(valor) : valor;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function mascaraCPFInput(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .slice(0, 14);
}

export function calcularForcaSenha(senha: string): { score: number; label: string; color: string } {
  let score = 0;
  if (senha.length >= 8) score++;
  if (senha.length >= 12) score++;
  if (/[A-Z]/.test(senha)) score++;
  if (/[0-9]/.test(senha)) score++;
  if (/[^A-Za-z0-9]/.test(senha)) score++;

  if (score <= 1) return { score, label: "Fraca", color: "text-red-400" };
  if (score <= 2) return { score, label: "Regular", color: "text-amber-400" };
  if (score <= 3) return { score, label: "Boa", color: "text-blue-400" };
  return { score, label: "Forte", color: "text-emerald-400" };
}

export function truncar(texto: string, limite = 60): string {
  return texto.length > limite ? texto.slice(0, limite) + "..." : texto;
}

export function bigintToString(obj: unknown): unknown {
  if (typeof obj === "bigint") return String(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(bigintToString);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, bigintToString(v)])
    );
  }
  return obj;
}
