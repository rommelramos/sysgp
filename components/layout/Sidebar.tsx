"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, FolderKanban, FileText,
  Link2, Share2, Settings, Activity, LogOut, BookOpen,
  PanelLeftClose, PanelLeftOpen,
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
  { href: "/vinculos",           label: "Vínculos",     icon: Share2,       perfis: ["ADMINISTRADOR", "SUPERVISOR"] },
  { href: "/atividades",         label: "Atividades",   icon: Activity },
  { href: "/relatorios",         label: "Relatórios",   icon: FileText },
  { href: "/relacoes",           label: "Relações",     icon: Link2 },
  { href: "/admin/convites",     label: "Convites",     icon: Link2,        perfis: ["ADMINISTRADOR"] },
  { href: "/admin/configuracoes",label: "Configurações",icon: Settings,     perfis: ["ADMINISTRADOR"] },
];

function UserAvatar({ name }: { name?: string }) {
  const letter = name?.charAt(0).toUpperCase() ?? "?";
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-[0_2px_6px_rgba(37,99,235,0.3)]">
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
      {/* Logo — no collapse button here */}
      <div className="flex items-center h-16 border-b border-[var(--border)] px-4 gap-3 shrink-0">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center shadow-[0_2px_8px_rgba(37,99,235,0.3)]">
          <FolderKanban size={16} className="text-white" aria-hidden="true" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="flex items-baseline gap-0.5"
            >
              <span className="font-[family-name:var(--font-display)] text-[17px] font-bold text-[var(--text-primary)] tracking-tight whitespace-nowrap">
                Sys
              </span>
              <span className="font-[family-name:var(--font-display)] text-[17px] font-extrabold text-[var(--accent-primary)] tracking-tight whitespace-nowrap">
                GP
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav aria-label="Navegação principal" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
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
                "flex items-center gap-3 h-10 rounded-[10px] transition-all duration-150 overflow-hidden",
                collapsed ? "px-0 justify-center" : "px-3",
                active
                  ? "bg-[var(--accent-primary)] text-white shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon
                size={17}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-white" : "text-[var(--text-muted)]"
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

      {/* Bottom section: collapse + user + logout */}
      <div className="border-t border-[var(--border)] px-3 py-3 space-y-1 shrink-0">

        {/* Collapse toggle — desktop only, safely in the bottom bar */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          className={cn(
            "hidden md:flex items-center gap-3 w-full h-9 rounded-[10px] transition-all duration-150",
            "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-primary)]",
            collapsed ? "justify-center px-0" : "px-3"
          )}
        >
          {collapsed
            ? <PanelLeftOpen size={15} aria-hidden="true" />
            : <PanelLeftClose size={15} aria-hidden="true" />
          }
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[12px] font-medium"
              >
                Recolher menu
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* User info */}
        <div className={cn(
          "flex items-center gap-3 px-2 py-2 rounded-[10px]",
          collapsed && "justify-center px-0"
        )}>
          <UserAvatar name={user?.nome} />
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

        {/* Logout */}
        <button
          onClick={logout}
          aria-label="Sair do sistema"
          className={cn(
            "flex items-center gap-3 w-full h-9 rounded-[10px] transition-all duration-150",
            "text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600",
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
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 60 : 220 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        aria-label="Menu lateral"
        className="hidden md:flex flex-col h-screen bg-[var(--bg-surface)] border-r border-[var(--border)] flex-shrink-0 select-none shadow-[1px_0_4px_rgba(0,0,0,0.06)]"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              aria-label="Menu lateral"
              className="fixed inset-y-0 left-0 w-[240px] flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border)] z-50 select-none shadow-[4px_0_16px_rgba(0,0,0,0.1)] md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
