"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Share2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  LogOut,
  BookOpen,
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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/usuarios", label: "Usuários", icon: Users, perfis: ["ADMINISTRADOR"] },
  { href: "/projetos", label: "Projetos", icon: FolderKanban, perfis: ["ADMINISTRADOR", "SUPERVISOR"] },
  { href: "/meus-projetos", label: "Meus Projetos", icon: BookOpen, perfis: ["MEMBRO", "SUPERVISOR"] },
  { href: "/atividades", label: "Atividades", icon: Activity },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
  { href: "/relacoes", label: "Relações", icon: Share2 },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, perfis: ["ADMINISTRADOR"] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.perfis || (user && item.perfis.includes(user.perfil))
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="flex flex-col h-screen bg-[var(--bg-surface)] border-r border-[var(--border)] relative z-20 flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--border)]">
        <div className="w-8 h-8 flex-shrink-0">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 4L28 10V22L16 28L4 22V10L16 4Z" stroke="#06B6D4" strokeWidth="1.5" fill="none" />
            <path d="M16 4L16 28M4 10L28 22M28 10L4 22" stroke="#06B6D4" strokeWidth="1" opacity="0.4" />
            <circle cx="16" cy="16" r="3" fill="#06B6D4" />
          </svg>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <span className="text-[var(--text-primary)] font-bold text-lg leading-none">
                Sys
              </span>
              <span className="text-[var(--accent-secondary)] font-extrabold text-lg leading-none">
                GP
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative",
                active
                  ? "bg-[rgba(37,99,235,0.15)] text-[var(--accent-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon
                size={18}
                className={cn(
                  "flex-shrink-0 transition-colors",
                  active ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                )}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--accent-primary)] rounded-r-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-[var(--border)] p-3 space-y-1">
        <div className={cn("flex items-center gap-3 px-2 py-2", collapsed && "justify-center")}>
          <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
            {user?.nome?.charAt(0).toUpperCase()}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{user?.nome}</p>
                <p className="text-xs text-[var(--text-secondary)] truncate">{user?.perfil}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={logout}
          title={collapsed ? "Sair" : undefined}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut size={16} className="flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm"
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors z-30"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}
