import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Senha obrigatória"),
});

export const cadastroUsuarioSchema = z
  .object({
    nomeCompleto: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    cpf: z
      .string()
      .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido (formato: 000.000.000-00)")
      .refine(validarCPF, "CPF inválido"),
    rg: z.string().optional(),
    dataNasc: z.string().optional(),
    email: z.string().email("E-mail inválido"),
    senha: z
      .string()
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
      .regex(/[0-9]/, "Deve conter ao menos um número"),
    confirmarSenha: z.string(),
    perfil: z.enum(["MEMBRO", "SUPERVISOR", "ADMINISTRADOR"]),
    supervisorId: z.string().optional().nullable(),
    podeSerCoordenador: z.boolean().default(false),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

export const editarUsuarioSchema = z.object({
  nomeCompleto: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  rg: z.string().optional(),
  dataNasc: z.string().optional(),
  perfil: z.enum(["MEMBRO", "SUPERVISOR", "ADMINISTRADOR"]),
  supervisorId: z.string().optional().nullable(),
  podeSerCoordenador: z.boolean().optional(),
  confirmado: z.boolean().optional(),
  ativo: z.boolean().optional(),
});

export const conviteSchema = z.object({
  descricao: z.string().optional(),
  usoMaximo: z.number().int().min(1).max(100).default(1),
  expiraEm: z.string().optional().nullable(),
});

export const autoCadastroSchema = z
  .object({
    token: z.string().min(1),
    nomeCompleto: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    cpf: z
      .string()
      .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido (formato: 000.000.000-00)")
      .refine(validarCPF, "CPF inválido"),
    rg: z.string().optional(),
    dataNasc: z.string().optional(),
    email: z.string().email("E-mail inválido"),
    senha: z
      .string()
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
      .regex(/[0-9]/, "Deve conter ao menos um número"),
    confirmarSenha: z.string(),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

export const recuperarSenhaSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export const resetarSenhaSchema = z
  .object({
    token: z.string().min(1),
    senha: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
    confirmarSenha: z.string(),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

function validarCPF(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, "");
  if (nums.length !== 11 || /^(\d)\1+$/.test(nums)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(nums[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(nums[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(nums[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === parseInt(nums[10]);
}
