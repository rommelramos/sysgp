"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
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

function getPageTitle(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "admin" && parts[1]) {
    return routeLabels[`/${parts[0]}/${parts[1]}`] || parts[1];
  }
  const base = `/${parts[0]}`;
  if (routeLabels[base]) return routeLabels[base];
  if (parts[1] && !isNaN(Number(parts[1]))) return "Detalhes";
  return routeLabels[base] || "SysGP";
}

interface TopbarProps {
  onMobileMenuToggle?: () => void;
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="h-16 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between px-4 md:px-6 gap-4 flex-shrink-0">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onMobileMenuToggle}
          aria-label="Abrir menu de navegação"
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-[10px] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150"
        >
          <Menu size={18} aria-hidden="true" />
        </button>
        <span className="text-[15px] font-semibold text-[var(--text-primary)] font-[family-name:var(--font-display)] hidden sm:block">
          {pageTitle}
        </span>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-sm relative hidden md:block">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
        <input
          type="search"
          placeholder="Pesquisar..."
          aria-label="Pesquisar no sistema"
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)] transition-all"
        />
      </div>

      {/* Right: bell + user profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notification bell */}
        <button
          aria-label="Notificações"
          className="relative w-9 h-9 flex items-center justify-center rounded-[10px] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150"
        >
          <Bell size={16} aria-hidden="true" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" aria-hidden="true" />
        </button>

        {/* User profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[var(--border)]">
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-[0_2px_6px_rgba(37,99,235,0.25)]"
          >
            {user?.nome?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block" style={{ marginLeft: '5px' }}>
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
