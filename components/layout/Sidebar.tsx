"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, FolderKanban, FileText,
  Share2, Settings, Activity, LogOut, BookOpen,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  perfis?: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard",          label: "Dashboard",    icon: LayoutDashboard },
  { href: "/usuarios",           label: "Usuários",     icon: Users,        perfis: ["ADMINISTRADOR"] },
  { href: "/projetos",           label: "Projetos",     icon: FolderKanban, perfis: ["ADMINISTRADOR", "SUPERVISOR"] },
  { href: "/meus-projetos",      label: "Meus Projetos",icon: BookOpen,     perfis: ["MEMBRO", "SUPERVISOR"] },
  { href: "/atividades",         label: "Atividades",   icon: Activity },
  { href: "/relatorios",         label: "Relatórios",   icon: FileText },
  { href: "/relacoes",           label: "Relações",     icon: Share2 },
  { href: "/admin/configuracoes",label: "Configurações",icon: Settings,     perfis: ["ADMINISTRADOR"] },
];

function Avatar({ name }: { name?: string }) {
  const letter = name?.charAt(0).toUpperCase() ?? "?";
  return (
    <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-[#4F8EF7] to-[#2DD4BF] flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-[0_2px_8px_rgba(79,142,247,0.3)]">
      {letter}
    </div>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.perfis || (user && item.perfis.includes(user.perfil))
  );

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--border)] overflow-hidden">
        <div className="w-8 h-8 shrink-0">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M16 3L29 10.5V21.5L16 29L3 21.5V10.5L16 3Z"
              stroke="#2DD4BF" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
            <path d="M16 3L16 29M3 10.5L29 21.5M29 10.5L3 21.5"
              stroke="#2DD4BF" strokeWidth="0.8" opacity="0.35" />
            <circle cx="16" cy="16" r="3.5" fill="#4F8EF7" />
          </svg>
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.16 }}
              className="flex items-baseline gap-0.5"
            >
              <span className="font-[family-name:var(--font-display)] text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
                Sys
              </span>
              <span className="font-[family-name:var(--font-display)] text-[17px] font-extrabold text-[var(--accent-secondary)] tracking-tight">
                GP
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav aria-label="Navegação principal" className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 h-11 rounded-[10px] transition-all duration-150 group relative overflow-hidden",
                collapsed ? "px-0 justify-center" : "px-4",
                active
                  ? "bg-[rgba(79,142,247,0.12)] text-[var(--accent-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              )}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[var(--accent-primary)] rounded-r-full" />
              )}
              <Icon
                size={17}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                )}
                aria-hidden="true"
              />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="text-[13px] font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-[var(--border)] p-3 space-y-0.5">
        <div className={cn(
          "flex items-center gap-3 px-2 py-2 rounded-[10px]",
          collapsed && "justify-center px-0"
        )}>
          <Avatar name={user?.nome} />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-none mb-0.5">
                  {user?.nome}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate capitalize">
                  {user?.perfil?.toLowerCase()}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={logout}
          aria-label="Sair do sistema"
          className={cn(
            "flex items-center gap-3 w-full h-9 rounded-[10px] transition-all duration-150",
            "text-[var(--text-muted)] hover:bg-red-500/8 hover:text-red-400",
            collapsed ? "justify-center px-0" : "px-3"
          )}
        >
          <LogOut size={15} className="shrink-0" aria-hidden="true" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[13px] font-medium"
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle — desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        className="absolute -right-3.5 top-[68px] w-7 h-7 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full hidden md:flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all duration-150 shadow-sm z-10"
      >
        {collapsed ? <ChevronRight size={11} aria-hidden="true" /> : <ChevronLeft size={11} aria-hidden="true" />}
      </button>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 60 : 232 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        aria-label="Menu lateral"
        className="hidden md:flex flex-col h-screen bg-[var(--bg-surface)] border-r border-[var(--border)] relative flex-shrink-0 select-none shadow-[2px_0_16px_rgba(0,0,0,0.35)]"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              aria-hidden="true"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              aria-label="Menu lateral"
              className="fixed inset-y-0 left-0 w-[260px] flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border)] z-50 select-none shadow-[4px_0_24px_rgba(0,0,0,0.5)] md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
