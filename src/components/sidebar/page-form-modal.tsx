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
