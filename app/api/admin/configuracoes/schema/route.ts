import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { parseConnectionUrl } from "@/lib/db-url";
import * as mariadb from "mariadb";

const DROP_STATEMENTS = [
  "SET FOREIGN_KEY_CHECKS = 0",
  "DROP TABLE IF EXISTS audit_log",
  "DROP TABLE IF EXISTS atividade_documentos",
  "DROP TABLE IF EXISTS password_reset_tokens",
  "DROP TABLE IF EXISTS refresh_tokens",
  "DROP TABLE IF EXISTS atividades",
  "DROP TABLE IF EXISTS metas",
  "DROP TABLE IF EXISTS projeto_membros",
  "DROP TABLE IF EXISTS projetos",
  "DROP TABLE IF EXISTS convites_cadastro",
  "DROP TABLE IF EXISTS usuarios",
  "DROP TABLE IF EXISTS configuracao_sistema",
  "SET FOREIGN_KEY_CHECKS = 1",
];

const CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    rg VARCHAR(20),
    data_nasc DATE,
    email VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil ENUM('MEMBRO','SUPERVISOR','ADMINISTRADOR') NOT NULL DEFAULT 'MEMBRO',
    supervisor_id BIGINT,
    pode_ser_coordenador TINYINT(1) NOT NULL DEFAULT 0,
    confirmado TINYINT(1) NOT NULL DEFAULT 1,
    convite_id BIGINT,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY usuarios_cpf_key (cpf),
    UNIQUE KEY usuarios_email_key (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS convites_cadastro (
    id BIGINT NOT NULL AUTO_INCREMENT,
    token VARCHAR(64) NOT NULL,
    descricao VARCHAR(255),
    criado_por_id BIGINT NOT NULL,
    uso_maximo INT NOT NULL DEFAULT 1,
    uso_atual INT NOT NULL DEFAULT 0,
    expira_em DATETIME,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY convites_cadastro_token_key (token)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS projetos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    area_tematica VARCHAR(255),
    instituicao_execucao VARCHAR(255),
    instituicao_financiadora VARCHAR(255),
    area_conhecimento VARCHAR(255),
    data_inicio DATE,
    data_fim_prevista DATE,
    status ENUM('EM_ANDAMENTO','CONCLUIDO','SUSPENSO') NOT NULL DEFAULT 'EM_ANDAMENTO',
    coordenador_id BIGINT NOT NULL,
    arquivo_path VARCHAR(512),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS projeto_membros (
    id BIGINT NOT NULL AUTO_INCREMENT,
    projeto_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    funcao VARCHAR(255),
    is_coordenador TINYINT(1) NOT NULL DEFAULT 0,
    is_bolsista TINYINT(1) NOT NULL DEFAULT 0,
    valor_bolsa DECIMAL(10,2),
    duracao_meses INT,
    data_inicio_bolsa DATE,
    data_fim_bolsa DATE,
    carga_horaria INT,
    plano_trabalho_path VARCHAR(512),
    resultados_esperados TEXT,
    cronograma TEXT,
    status_vinculo ENUM('ATIVO','ENCERRADO','SUSPENSO') NOT NULL DEFAULT 'ATIVO',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY projeto_membros_unique (projeto_id, usuario_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS metas (
    id BIGINT NOT NULL AUTO_INCREMENT,
    projeto_membro_id BIGINT NOT NULL,
    descricao TEXT NOT NULL,
    ordem INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS atividades (
    id BIGINT NOT NULL AUTO_INCREMENT,
    projeto_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    meta_id BIGINT,
    titulo VARCHAR(255) NOT NULL,
    descricao LONGTEXT,
    data_inicio DATE,
    data_fim DATE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS atividade_documentos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    atividade_id BIGINT NOT NULL,
    nome_original VARCHAR(255) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho VARCHAR(512) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    tamanho_bytes INT NOT NULL,
    origem ENUM('UPLOAD','PASTE') NOT NULL DEFAULT 'UPLOAD',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expira_em DATETIME NOT NULL,
    usado TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expira_em DATETIME NOT NULL,
    revogado TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT,
    acao VARCHAR(100) NOT NULL,
    entidade VARCHAR(100),
    entidade_id BIGINT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    detalhes JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS configuracao_sistema (
    id INT NOT NULL DEFAULT 1,
    db_host VARCHAR(255),
    db_porta INT NOT NULL DEFAULT 3306,
    db_nome VARCHAR(255),
    db_usuario VARCHAR(255),
    db_senha_enc TEXT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Migração aditiva: adiciona colunas em tabelas pré-existentes (idempotente).
  `ALTER TABLE usuarios ADD COLUMN pode_ser_coordenador TINYINT(1) NOT NULL DEFAULT 0`,
  `ALTER TABLE usuarios ADD COLUMN confirmado TINYINT(1) NOT NULL DEFAULT 1`,
  `ALTER TABLE usuarios ADD COLUMN convite_id BIGINT NULL`,
  `ALTER TABLE projetos ADD COLUMN instituicao_execucao VARCHAR(255) NULL`,
  `ALTER TABLE projetos ADD COLUMN instituicao_financiadora VARCHAR(255) NULL`,
  `ALTER TABLE projetos ADD COLUMN area_conhecimento VARCHAR(255) NULL`,
  `ALTER TABLE projeto_membros ADD COLUMN data_inicio_bolsa DATE NULL`,
  `ALTER TABLE projeto_membros ADD COLUMN data_fim_bolsa DATE NULL`,
  `ALTER TABLE projeto_membros ADD COLUMN carga_horaria INT NULL`,
  `ALTER TABLE projeto_membros ADD COLUMN resultados_esperados TEXT NULL`,
  `ALTER TABLE projeto_membros ADD COLUMN cronograma TEXT NULL`,
  `ALTER TABLE atividades ADD COLUMN meta_id BIGINT NULL`,

  // Foreign keys — duplicatas ignoradas pelo catch (código 1826).
  `ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_supervisor
    FOREIGN KEY (supervisor_id) REFERENCES usuarios(id)`,
  `ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_convite
    FOREIGN KEY (convite_id) REFERENCES convites_cadastro(id)`,
  `ALTER TABLE convites_cadastro ADD CONSTRAINT fk_convites_criado_por
    FOREIGN KEY (criado_por_id) REFERENCES usuarios(id)`,
  `ALTER TABLE projetos ADD CONSTRAINT fk_projetos_coordenador
    FOREIGN KEY (coordenador_id) REFERENCES usuarios(id)`,
  `ALTER TABLE projeto_membros ADD CONSTRAINT fk_pm_projeto
    FOREIGN KEY (projeto_id) REFERENCES projetos(id)`,
  `ALTER TABLE projeto_membros ADD CONSTRAINT fk_pm_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)`,
  `ALTER TABLE metas ADD CONSTRAINT fk_metas_projeto_membro
    FOREIGN KEY (projeto_membro_id) REFERENCES projeto_membros(id) ON DELETE CASCADE`,
  `ALTER TABLE atividades ADD CONSTRAINT fk_atividades_projeto
    FOREIGN KEY (projeto_id) REFERENCES projetos(id)`,
  `ALTER TABLE atividades ADD CONSTRAINT fk_atividades_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)`,
  `ALTER TABLE atividades ADD CONSTRAINT fk_atividades_meta
    FOREIGN KEY (meta_id) REFERENCES metas(id)`,
  `ALTER TABLE atividade_documentos ADD CONSTRAINT fk_ad_atividade
    FOREIGN KEY (atividade_id) REFERENCES atividades(id) ON DELETE CASCADE`,
  `ALTER TABLE password_reset_tokens ADD CONSTRAINT fk_prt_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)`,
  `ALTER TABLE refresh_tokens ADD CONSTRAINT fk_rt_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)`,
  `ALTER TABLE audit_log ADD CONSTRAINT fk_al_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)`,
];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.perfil !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { acao: "CRIAR" | "RECRIAR"; url: string; senha: string; confirmacao?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { acao, url, senha, confirmacao } = body;

  if (!["CRIAR", "RECRIAR"].includes(acao)) {
    return NextResponse.json({ error: "Ação inválida" }, { status: 422 });
  }
  if (acao === "RECRIAR" && confirmacao !== "CONFIRMAR") {
    return NextResponse.json({ error: "Confirmação inválida" }, { status: 422 });
  }
  if (!url) {
    return NextResponse.json({ error: "String de conexão obrigatória" }, { status: 422 });
  }

  let parts: ReturnType<typeof parseConnectionUrl>;
  try {
    parts = parseConnectionUrl(url);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  let conn: mariadb.Connection | undefined;
  const executados: string[] = [];
  const erros: string[] = [];

  try {
    conn = await mariadb.createConnection({
      host:     parts.host,
      port:     parts.port,
      database: parts.database,
      user:     parts.user,
      password: senha,
      connectTimeout: 8000,
    });

    if (acao === "RECRIAR") {
      for (const stmt of DROP_STATEMENTS) {
        await conn.query(stmt);
        executados.push(`DROP: ${stmt.replace(/\s+/g, " ").slice(0, 60)}`);
      }
    }

    for (const stmt of CREATE_STATEMENTS) {
      try {
        await conn.query(stmt);
        executados.push(`OK: ${stmt.trim().split("\n")[0].slice(0, 70)}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes("Duplicate key name") ||
          msg.includes("Duplicate column name") ||
          msg.includes("Duplicate foreign key") ||
          msg.includes("no: 1060") ||
          msg.includes("no: 1826") ||
          msg.includes("errno: 121") ||
          msg.includes("ER_DUP_FIELDNAME") ||
          msg.includes("ER_DUP_KEY") ||
          msg.includes("ER_FK_DUP_NAME")
        ) {
          executados.push(`SKIP (já existe): ${stmt.trim().split("\n")[0].slice(0, 55)}`);
        } else {
          erros.push(msg);
        }
      }
    }

    return NextResponse.json({ ok: erros.length === 0, executados, erros });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ ok: false, error: msg, executados, erros }, { status: 500 });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
