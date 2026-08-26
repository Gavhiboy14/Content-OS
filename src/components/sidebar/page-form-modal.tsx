"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { CLIENT_STATUS } from "@/lib/page-types";

const EMOJI_SUGGESTIONS = ["📄", "👤", "📸", "🎵", "🎬", "📅", "🪝", "🎯", "💡", "📚"];

export interface PageFormValues {
  title: string;
  icon: string;
  section: string;
  /** Bajada del cliente: "Ventas", "Coaching". Opcional. */
  subtitle: string;
  /** Uno de los valores de CLIENT_STATUS. Opcional. */
  clientStatus: string;
  /** Meta de contenido del mes, como texto para poder dejarla vacía. */
  goal: string;
  /** La voz de marca: alimenta los prompts de IA de este cliente. Todo opcional. */
  audience: string;
  tone: string;
  ctaExamples: string;
  pillars: string;
  offer: string;
  avoid: string;
  /** Si esta página es el perfil de un referente de competencia. */
  isCompetitor: boolean;
  refHandle: string;
  refNiche: string;
  refFollowers: string;
  refUrl: string;
  refNotes: string;
}

interface PageFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: PageFormValues) => Promise<void>;
  title: string;
  submitLabel: string;
  showSection: boolean;
  sectionSuggestions: string[];
  initialValues?: Partial<PageFormValues>;
}

export function PageFormModal({
  open,
  onClose,
  onSubmit,
  title,
  submitLabel,
  showSection,
  sectionSuggestions,
  initialValues,
}: PageFormModalProps) {
  const [pageTitle, setPageTitle] = useState(initialValues?.title ?? "");
  const [icon, setIcon] = useState(initialValues?.icon ?? "📄");
  const [section, setSection] = useState(initialValues?.section ?? "");
  const [subtitle, setSubtitle] = useState(initialValues?.subtitle ?? "");
  const [clientStatus, setClientStatus] = useState(
    initialValues?.clientStatus ?? ""
  );
  const [goal, setGoal] = useState(initialValues?.goal ?? "");
  const [audience, setAudience] = useState(initialValues?.audience ?? "");
  const [tone, setTone] = useState(initialValues?.tone ?? "");
  const [ctaExamples, setCtaExamples] = useState(initialValues?.ctaExamples ?? "");
  const [pillars, setPillars] = useState(initialValues?.pillars ?? "");
  const [offer, setOffer] = useState(initialValues?.offer ?? "");
  const [avoid, setAvoid] = useState(initialValues?.avoid ?? "");
  const [isCompetitor, setIsCompetitor] = useState(initialValues?.isCompetitor ?? false);
  const [refHandle, setRefHandle] = useState(initialValues?.refHandle ?? "");
  const [refNiche, setRefNiche] = useState(initialValues?.refNiche ?? "");
  const [refFollowers, setRefFollowers] = useState(initialValues?.refFollowers ?? "");
  const [refUrl, setRefUrl] = useState(initialValues?.refUrl ?? "");
  const [refNotes, setRefNotes] = useState(initialValues?.refNotes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cada vez que el modal pasa de cerrado a abierto, reseteamos el
  // formulario con los valores iniciales de esa apertura. Se hace durante
  // el render (no en un efecto) siguiendo el patrón de React para
  // "resetear estado cuando cambia una prop".
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setPageTitle(initialValues?.title ?? "");
    setIcon(initialValues?.icon ?? "📄");
    setSection(initialValues?.section ?? "");
    setSubtitle(initialValues?.subtitle ?? "");
    setClientStatus(initialValues?.clientStatus ?? "");
    setGoal(initialValues?.goal ?? "");
    setAudience(initialValues?.audience ?? "");
    setTone(initialValues?.tone ?? "");
    setCtaExamples(initialValues?.ctaExamples ?? "");
    setPillars(initialValues?.pillars ?? "");
    setOffer(initialValues?.offer ?? "");
    setAvoid(initialValues?.avoid ?? "");
    setIsCompetitor(initialValues?.isCompetitor ?? false);
    setRefHandle(initialValues?.refHandle ?? "");
    setRefNiche(initialValues?.refNiche ?? "");
    setRefFollowers(initialValues?.refFollowers ?? "");
    setRefUrl(initialValues?.refUrl ?? "");
    setRefNotes(initialValues?.refNotes ?? "");
    setErrorMsg(null);
    setSubmitting(false);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pageTitle.trim()) {
      setErrorMsg("Poné un título");
      return;
    }
    const metaLimpia = goal.trim();
    if (metaLimpia && !(Number(metaLimpia) > 0)) {
      setErrorMsg("La meta tiene que ser un número mayor a cero");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        title: pageTitle.trim(),
        icon: icon.trim() || "📄",
        section: section.trim(),
        subtitle: subtitle.trim(),
        clientStatus,
        goal: metaLimpia,
        audience: audience.trim(),
        tone: tone.trim(),
        ctaExamples: ctaExamples.trim(),
        pillars: pillars.trim(),
        offer: offer.trim(),
        avoid: avoid.trim(),
        isCompetitor,
        refHandle: refHandle.trim(),
        refNiche: refNiche.trim(),
        refFollowers: refFollowers.trim(),
        refUrl: refUrl.trim(),
        refNotes: refNotes.trim(),
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="w-16">
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              Ícono
            </label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={4}
              className="w-full rounded-xl border border-line-hi bg-black/25 px-2 py-2 text-center text-lg outline-none transition-colors focus:border-accent/50"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              Título
            </label>
            <input
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              autoFocus
              placeholder="Ej: Federico, Banco de Hooks..."
              className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {EMOJI_SUGGESTIONS.map((emoji) => (
            <button
              type="button"
              key={emoji}
              onClick={() => setIcon(emoji)}
              aria-pressed={icon === emoji}
              className={cn(
                "rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-white/[0.06]",
                icon === emoji && "bg-accent/15 ring-1 ring-inset ring-accent/25"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>

        {showSection && (
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              Grupo en el sidebar
            </label>
            <input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="Ej: CLIENTES, RECURSOS..."
              list="section-suggestions"
              className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
            />
            <datalist id="section-suggestions">
              {sectionSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <p className="mt-1.5 text-[11px] text-ink-3">
              Dejalo vacío para que la página quede suelta arriba de todo.
            </p>
          </div>
        )}

        {/* Datos de cliente. Se ofrecen en las páginas de primer nivel, que
            son las que representan a un cliente. Los tres son opcionales:
            vacíos, el encabezado no los muestra. */}
        {showSection && (
          <div className="flex flex-col gap-4 rounded-xl border border-line bg-black/15 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              Si es un cliente <span className="normal-case">(opcional)</span>
            </p>

            <div>
              <label className="mb-1.5 block text-[11px] text-ink-2">
                Bajada
              </label>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ej: Ventas, Coaching, Inmobiliaria…"
                className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] text-ink-2">
                Estado
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CLIENT_STATUS.options.map((o) => (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() =>
                      setClientStatus(clientStatus === o.value ? "" : o.value)
                    }
                    aria-pressed={clientStatus === o.value}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[13px] transition-colors",
                      clientStatus === o.value
                        ? o.className
                        : "text-ink-3 hover:bg-white/[0.06] hover:text-ink-2"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] text-ink-2">
                Meta de contenido del mes
              </label>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                inputMode="numeric"
                placeholder="Ej: 20"
                className="w-28 rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
              />
            </div>

            {/* La voz de marca: lo que le da contexto real a cualquier
                prompt de IA que se arme sobre este cliente. Va plegado
                porque no hace falta llenarlo para empezar a usar el
                cliente — se completa cuando se necesita. */}
            <details>
              <summary className="cursor-pointer text-[11px] text-ink-2 marker:content-['']">
                🎯 Voz de marca <span className="text-ink-3">(para los prompts de IA)</span>
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] text-ink-2">
                    A quién le habla
                  </label>
                  <textarea
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    rows={2}
                    placeholder="Coaches e infoproductores que facturan 5-30k USD y no tienen equipo de ventas"
                    className="w-full resize-y rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] text-ink-2">
                    Tono de voz
                  </label>
                  <input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="Rioplatense, directo, sin vueltas"
                    className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] text-ink-2">
                    CTAs que usa
                  </label>
                  <input
                    value={ctaExamples}
                    onChange={(e) => setCtaExamples(e.target.value)}
                    placeholder="Comentá SISTEMA / Escribime LIBRE"
                    className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] text-ink-2">
                    Pilares de contenido{" "}
                    <span className="text-ink-3">(uno por línea)</span>
                  </label>
                  <textarea
                    value={pillars}
                    onChange={(e) => setPillars(e.target.value)}
                    rows={3}
                    placeholder={"Objeciones\nMindset del closer\nCasos reales"}
                    className="w-full resize-y rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] text-ink-2">
                    Qué vende / a dónde quiere llevar
                  </label>
                  <textarea
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                    rows={2}
                    placeholder="Mentoría de 8 semanas + implementación del sistema de ventas"
                    className="w-full resize-y rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] text-ink-2">
                    Nunca hacer{" "}
                    <span className="text-ink-3">(líneas rojas)</span>
                  </label>
                  <textarea
                    value={avoid}
                    onChange={(e) => setAvoid(e.target.value)}
                    rows={2}
                    placeholder="Nada de promesas de plata fácil, sin emojis en exceso"
                    className="w-full resize-y rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
                  />
                </div>
              </div>
            </details>
          </div>
        )}

        {/* El referente de competencia va en páginas hijas, nunca en el
            cliente raíz — mezclar los dos convertiría por accidente a un
            cliente en un competidor si alguien tilda esto sin querer. */}
        {!showSection && (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-black/15 p-3">
            <label className="flex items-center gap-2 text-[13px] text-ink-2">
              <input
                type="checkbox"
                checked={isCompetitor}
                onChange={(e) => setIsCompetitor(e.target.checked)}
                className="h-4 w-4 rounded border-line-hi bg-black/25 accent-accent"
              />
              🕵️ Es un referente de competencia
            </label>

            {isCompetitor && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[11px] text-ink-2">
                      Usuario
                    </label>
                    <input
                      value={refHandle}
                      onChange={(e) => setRefHandle(e.target.value)}
                      placeholder="@fulano"
                      className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[11px] text-ink-2">
                      Seguidores
                    </label>
                    <input
                      value={refFollowers}
                      onChange={(e) => setRefFollowers(e.target.value)}
                      placeholder="180 mil"
                      className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] text-ink-2">
                    Nicho / ángulo
                  </label>
                  <input
                    value={refNiche}
                    onChange={(e) => setRefNiche(e.target.value)}
                    placeholder="Ventas B2B"
                    className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] text-ink-2">
                    Link del perfil
                  </label>
                  <input
                    type="url"
                    value={refUrl}
                    onChange={(e) => setRefUrl(e.target.value)}
                    placeholder="https://instagram.com/…"
                    className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] text-ink-2">
                    Por qué lo seguís
                  </label>
                  <textarea
                    value={refNotes}
                    onChange={(e) => setRefNotes(e.target.value)}
                    rows={2}
                    placeholder="Hace el mismo tema que yo pero con dramatizaciones."
                    className="w-full resize-y rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-accent rounded-xl px-3.5 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Guardando..." : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
