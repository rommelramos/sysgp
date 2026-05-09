"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20">
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Erro ao carregar a página</h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm">
          Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte se o problema persistir.
        </p>
        {error?.message && (
          <p className="text-xs font-mono text-red-400/70 mt-2">{error.message}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors"
      >
        <RefreshCw size={14} />
        Tentar novamente
      </button>
    </div>
  );
}
