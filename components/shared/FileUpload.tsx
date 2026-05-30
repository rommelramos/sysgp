"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, Image, File } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface UploadedFile {
  nomeOriginal: string;
  nomeArquivo: string;
  caminho: string;
  mimeType: string;
  tamanhoBytes: number;
  origem: "UPLOAD" | "PASTE";
  conteudoBase64?: string; // base64 content for direct DB storage (no filesystem dependency)
}

interface FileUploadProps {
  onUpload: (files: UploadedFile[]) => void;
  maxFiles?: number;
  accept?: string;
  className?: string;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <Image size={18} className="text-cyan-400" />;
  if (mimeType === "application/pdf") return <FileText size={18} className="text-red-400" />;
  return <File size={18} className="text-blue-400" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ onUpload, maxFiles = 10, accept, className }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<Array<{ preview?: string; name: string; size: number; type: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const uploadFiles = useCallback(
    async (files: File[], origem: "UPLOAD" | "PASTE" = "UPLOAD") => {
      if (!files.length) return;
      setUploading(true);

      const previews = files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      }));
      setPreviews((prev) => [...prev, ...previews]);

      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append("origem", origem);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (data.arquivos?.length) {
          onUpload(data.arquivos);
          toast("success", `${data.arquivos.length} arquivo(s) enviado(s) com sucesso`);
        }
        if (data.erros?.length) {
          data.erros.forEach((e: { error: string }) => toast("error", e.error));
        }
      } catch {
        toast("error", "Erro ao enviar arquivos");
      } finally {
        setUploading(false);
      }
    },
    [onUpload, toast]
  );

  // Paste handler
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter((item) => item.type.startsWith("image/"));
      if (!imageItems.length) return;

      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const files: File[] = [];
      imageItems.forEach((item, i) => {
        const blob = item.getAsFile();
        if (!blob) return;
        const fileName = `imagem_${timestamp}${i > 0 ? `_${i}` : ""}.png`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const f = new (window as any).File([blob], fileName, { type: "image/png" }) as File;
        files.push(f);
      });

      toast("info", `${files.length} imagem(ns) colada(s). Enviando...`);
      uploadFiles(files, "PASTE");
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [uploadFiles, toast]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-150",
          dragging
            ? "border-[var(--accent-primary)] bg-[rgba(37,99,235,0.08)]"
            : "border-[var(--border)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-elevated)]"
        )}
      >
        <div
          className={cn(
            "p-3 rounded-xl transition-colors",
            dragging ? "bg-[rgba(37,99,235,0.15)] text-[var(--accent-primary)]" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
          )}
        >
          <Upload size={20} />
        </div>
        <div className="text-center" style={{ marginLeft: '5px' }}>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {dragging ? "Solte os arquivos aqui" : "Arraste arquivos ou clique para selecionar"}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            PDF, DOCX, JPG, PNG, GIF, WEBP • Máx 20MB • Ou cole com Ctrl+V
          </p>
        </div>
        {uploading && (
          <div className="flex items-center gap-2 text-xs text-[var(--accent-primary)]">
            <div className="w-3 h-3 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            Enviando...
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept || ".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"}
        className="hidden"
        onChange={handleChange}
      />

      <AnimatePresence>
        {previews.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2"
          >
            {p.preview ? (
              <img src={p.preview} alt={p.name} className="w-8 h-8 rounded object-cover" />
            ) : (
              <FileIcon mimeType={p.type} />
            )}
            <div className="flex-1 min-w-0" style={{ marginLeft: '5px' }}>
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{p.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{formatBytes(p.size)}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviews((prev) => prev.filter((_, idx) => idx !== i));
              }}
              className="text-[var(--text-secondary)] hover:text-red-400 transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
