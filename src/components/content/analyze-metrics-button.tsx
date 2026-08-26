"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PromptModal } from "./prompt-modal";
import { isPublished } from "@/lib/metrics";
import { buildMetricsPrompt } from "@/lib/prompts";
import type { ContentItem, Page } from "@/lib/types";

/**
 * Arma el prompt de análisis de métricas para un cliente. Vive acá y no
 * dentro de la lista genérica porque necesita saber quién es el cliente
 * (su voz de marca) — algo que sólo tiene sentido en la vista de un cliente
 * puntual, no en las vistas globales que cruzan todos.
 */
export function AnalyzeMetricsButton({
  client,
  items,
}: {
  client: Page;
  items: ContentItem[];
}) {
  const [open, setOpen] = useState(false);
  const publicados = items.filter(isPublished);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={publicados.length === 0}
        title={
          publicados.length === 0
            ? "Publicá algo con métricas para poder analizarlo"
            : undefined
        }
        className="btn-soft flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Sparkles size={13} />
        Analizar con IA
      </button>

      <PromptModal
        open={open}
        onClose={() => setOpen(false)}
        title="Analizar mis métricas"
        prompt={buildMetricsPrompt(client, items)}
        hint={`Pegalo en Claude o el chat que uses. Ya incluye tu marca y tus ${publicados.length} ${publicados.length === 1 ? "publicación" : "publicaciones"}.`}
      />
    </>
  );
}
