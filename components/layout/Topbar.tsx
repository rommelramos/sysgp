"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/usuarios": "Usuários",
  "/projetos": "Projetos",
  "/meus-projetos": "Meus Projetos",
  "/atividades": "Atividades",
  "/relatorios": "Relatórios",
  "/relacoes": "Relações",
  "/admin/configuracoes": "Configurações",
};

function getBreadcrumb(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = ["SysGP"];

  if (parts[0] === "admin") {
    crumbs.push("Administração");
    if (parts[1]) crumbs.push(routeLabels[`/${parts[0]}/${parts[1]}`] || parts[1]);
  } else {
    const base = `/${parts[0]}`;
    if (routeLabels[base]) crumbs.push(routeLabels[base]);
    if (parts[1]) crumbs.push(isNaN(Number(parts[1])) ? parts[1] : "Detalhes");
  }

  return crumbs;
}

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const crumbs = getBreadcrumb(pathname);

  return (
    <header className="h-14 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between px-6 flex-shrink-0">
      <nav className="flex items-center gap-1.5">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-[var(--text-secondary)]" />}
            <span
              className={
                i === crumbs.length - 1
                  ? "text-sm text-[var(--text-primary)] font-medium"
                  : "text-sm text-[var(--text-secondary)]"
              }
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors relative">
          <Bell size={16} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-xs font-bold text-white">
            {user?.nome?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-[var(--text-secondary)] hidden sm:block">
            {user?.nome?.split(" ")[0]}
          </span>
        </div>
      </div>
    </header>
  );
}
