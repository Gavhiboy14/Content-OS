"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PromptModal } from "./prompt-modal";
import { buildIdeasPromptAction } from "@/app/prompt-actions";
import { IDEA_OBJECTIVES, type IdeaObjective } from "@/lib/prompts";

/**
 * El armador de prompts del banco de ideas. Vive en la página del banco de
 * cada cliente — necesita saber de qué cliente es para traerle su marca, su
 * top y sus propios hooks al prompt.
 */
export function IdeaPromptGenerator({
  clientId,
  pillars,
}: {
  clientId: string;
  pillars: string[];
}) {
  const [objetivo, setObjetivo] = useState<IdeaObjective>("ideas");
  const [pilar, setPilar] = useState("");
  const [tema, setTema] = useState("");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generar() {
    setCargando(true);
    setError(null);
    try {
      const texto = await buildIdeasPromptAction(clientId, objetivo, pilar, tema.trim());
      setPrompt(texto);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo armar el prompt");
    } finally {
      setCargando(false);
    }
  }

  const objetivoLabel =
    IDEA_OBJECTIVES.find((o) => o.value === objetivo)?.label ?? "Prompt";

  return (
    <div className="panel rounded-2xl p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Campo label="Qué querés generar" className="min-w-[190px] flex-[1.4]">
          <select
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value as IdeaObjective)}
            className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent/50"
          >
            {IDEA_OBJECTIVES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Pilar" className="min-w-[150px] flex-1">
          <select
            value={pilar}
            onChange={(e) => setPilar(e.target.value)}
            className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent/50"
          >
            <option value="">Todos los pilares</option>
            {pillars.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Tema o disparador (opcional)" className="min-w-[200px] flex-[1.6]">
          <input
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="El cliente que dice «lo voy a pensar»"
            className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
          />
        </Campo>

        <button
          onClick={generar}
          disabled={cargando}
          className="btn-accent flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium disabled:opacity-50"
        >
          <Sparkles size={13} />
          {cargando ? "Armando…" : "Armar prompt"}
        </button>
      </div>

      {error && <p className="mt-2.5 text-xs text-red-400">{error}</p>}

      <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
        El prompt sale con tu marca, lo que mejor te funcionó y tus hooks guardados adentro.
      </p>

      <PromptModal
        open={prompt !== null}
        onClose={() => setPrompt(null)}
        title={objetivoLabel}
        prompt={prompt ?? ""}
        hint="Pegalo en Claude. Lo que te devuelva, guardalo en el banco para que los próximos prompts salgan todavía más afinados."
      />
    </div>
  );
}

function Campo({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {label}
      </label>
      {children}
    </div>
  );
}
