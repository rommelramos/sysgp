"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const routeLabels: Record<string, string> = {
  "/dashboard":          "Dashboard",
  "/usuarios":           "Usuários",
  "/projetos":           "Projetos",
  "/meus-projetos":      "Meus Projetos",
  "/atividades":         "Atividades",
  "/relatorios":         "Relatórios",
  "/relacoes":           "Relações",
  "/admin/configuracoes":"Configurações",
};

function getBreadcrumb(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = ["SysGP"];

  if (parts[0] === "admin") {
    crumbs.push("Admin");
    if (parts[1]) crumbs.push(routeLabels[`/${parts[0]}/${parts[1]}`] || parts[1]);
  } else {
    const base = `/${parts[0]}`;
    if (routeLabels[base]) crumbs.push(routeLabels[base]);
    if (parts[1]) crumbs.push(isNaN(Number(parts[1])) ? parts[1] : "Detalhes");
  }

  return crumbs;
}

interface TopbarProps {
  onMobileMenuToggle?: () => void;
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const crumbs = getBreadcrumb(pathname);

  return (
    <header className="h-16 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMobileMenuToggle}
          aria-label="Abrir menu de navegação"
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-[10px] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        {/* Breadcrumb */}
        <nav aria-label="Localização atual">
          <ol className="flex items-center gap-1.5 list-none">
            {crumbs.map((crumb, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={11} className="text-[var(--text-muted)]" aria-hidden="true" />}
                <span
                  aria-current={i === crumbs.length - 1 ? "page" : undefined}
                  className={
                    i === crumbs.length - 1
                      ? "text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--font-display)]"
                      : "text-[13px] text-[var(--text-muted)]"
                  }
                >
                  {crumb}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          aria-label="Notificações"
          className="w-9 h-9 flex items-center justify-center rounded-[10px] hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-150"
        >
          <Bell size={16} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2.5 pl-2 border-l border-[var(--border)]">
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-[#4F8EF7] to-[#2DD4BF] flex items-center justify-center text-xs font-bold text-white shrink-0"
          >
            {user?.nome?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-none">
              {user?.nome?.split(" ")[0]}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] capitalize leading-none mt-0.5">
              {user?.perfil?.toLowerCase()}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
