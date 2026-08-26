"use client";

import { useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { PromptModal } from "./prompt-modal";
import { buildPatternPrompt } from "@/lib/prompts";
import type { ContentItem, Page } from "@/lib/types";

/**
 * La ficha de un referente de competencia: sus datos + el botón para sacarle
 * el patrón a sus videos cargados. Vive arriba de la lista genérica de
 * videos, que se renderiza sola con lo que ya existe.
 */
export function CompetitorProfile({
  client,
  referente,
  videos,
}: {
  client: Page;
  referente: Page;
  videos: ContentItem[];
}) {
  const [open, setOpen] = useState(false);
  const p = referente.properties;
  const hayDatos = p.refHandle || p.refNiche || p.refFollowers || p.refUrl || p.refNotes;

  return (
    <div className="panel mb-6 rounded-2xl p-4">
      {hayDatos && (
        <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
          {p.refHandle && (
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Usuario
              </dt>
              <dd className="mt-0.5 text-ink-2">{p.refHandle}</dd>
            </div>
          )}
          {p.refNiche && (
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Nicho / ángulo
              </dt>
              <dd className="mt-0.5 text-ink-2">{p.refNiche}</dd>
            </div>
          )}
          {p.refFollowers && (
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Seguidores
              </dt>
              <dd className="mt-0.5 text-ink-2">{p.refFollowers}</dd>
            </div>
          )}
          {p.refUrl && (
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Perfil
              </dt>
              <dd className="mt-0.5">
                <a
                  href={p.refUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  Ver perfil <ExternalLink size={11} />
                </a>
              </dd>
            </div>
          )}
          {p.refNotes && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Por qué lo sigo
              </dt>
              <dd className="mt-0.5 text-ink-2">{p.refNotes}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] leading-relaxed text-ink-3">
          {videos.length <= 1
            ? "Cargá al menos 2 videos para poder sacar el patrón."
            : `Sacá el patrón de sus ${videos.length} videos cargados.`}
        </p>
        <button
          onClick={() => setOpen(true)}
          disabled={videos.length <= 1}
          className="btn-soft flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles size={13} />
          Sacar el patrón
        </button>
      </div>

      <PromptModal
        open={open}
        onClose={() => setOpen(false)}
        title={`El patrón de ${p.refHandle || referente.title}`}
        prompt={open ? buildPatternPrompt(client, referente, videos) : ""}
        hint="Pegalo en Claude. Te va a devolver el patrón y hooks nuevos en tu voz, no una copia del referente."
      />
    </div>
  );
}
