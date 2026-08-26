"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface PromptModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  prompt: string;
  hint?: string;
}

/**
 * Muestra un prompt largo y listo para copiar. No manda nada a ninguna IA —
 * el que lo pega donde quiera es el cliente.
 */
export function PromptModal({ open, onClose, title, prompt, hint }: PromptModalProps) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch (err) {
      console.error("No se pudo copiar", err);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <div className="flex flex-col gap-3">
        {hint && <p className="text-[13px] leading-relaxed text-ink-2">{hint}</p>}

        <pre className="max-h-96 overflow-y-auto rounded-xl border border-line bg-black/25 p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink-2">
          {prompt}
        </pre>

        <div className="flex justify-end">
          <button
            onClick={copiar}
            className="btn-accent flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[13px] font-medium"
          >
            {copiado ? <Check size={13} /> : <Copy size={13} />}
            {copiado ? "Copiado" : "Copiar prompt"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
