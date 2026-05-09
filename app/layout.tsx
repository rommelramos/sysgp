import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "SysGP — Sistema Gerenciador de Projetos",
  description: "Gestão inteligente de projetos e bolsistas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
