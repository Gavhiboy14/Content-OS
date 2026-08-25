"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { getContentTypeDefinition } from "@/lib/content-types";
import { defaultContentProperties } from "@/lib/content-types";
import type { PropertyDefinition } from "@/lib/page-types";

/** Una página donde puede guardarse el contenido. */
export interface Destino {
  id: string;
  title: string;
  icon: string | null;
}

export interface ContentFormValues {
  pageId: string;
  title: string;
  properties: Record<string, string>;
  body: string;
}

interface ContentFormModalProps {
  open: boolean;
  onClose: () => void;
  type: string;
  /** La página desde donde se está creando. */
  pageId: string;
  pageTitle: string;
  /** Subpáginas donde también puede guardarse (las plataformas). */
  destinos: Destino[];
  onSubmit: (values: ContentFormValues) => Promise<void>;
  /**
   * Al editar, los valores actuales del contenido. El cuerpo no se toca acá:
   * se escribe en la vista completa, con el editor de bloques.
   */
  editing?: { title: string; properties: Record<string, string> };
}

/**
 * Formulario de creación y edición. No tiene los campos escritos a mano: los
 * arma leyendo `properties` del tipo en el registro, así que sumar un campo
 * nuevo a un tipo lo hace aparecer acá solo.
 */
export function ContentFormModal({
  open,
  onClose,
  type,
  pageId,
  pageTitle,
  destinos,
  onSubmit,
  editing,
}: ContentFormModalProps) {
  const definition = getContentTypeDefinition(type);
  const esEdicion = editing !== undefined;

  const [destino, setDestino] = useState(pageId);
  const [title, setTitle] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Al abrir: si es edición carga lo que ya tenía; si es alta, arranca limpio.
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setDestino(pageId);
    setTitle(editing?.title ?? "");
    setValues(editing?.properties ?? defaultContentProperties(type));
    setBody("");
    setErrorMsg(null);
    setSubmitting(false);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  function setProperty(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const sueltos = definition.properties.filter(
    (p) => !("group" in p && p.group)
  );
  const grupos = Object.entries(
    definition.properties.reduce<Record<string, PropertyDefinition[]>>(
      (acc, p) => {
        const g = "group" in p && p.group ? p.group : null;
        if (g) (acc[g] = acc[g] ?? []).push(p);
        return acc;
      },
      {}
    )
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit({ pageId: destino, title, properties: values, body });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esEdicion ? `Editar ${definition.label.toLowerCase()}` : definition.newLabel}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Campo label="Título">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            placeholder={`${definition.label} sin título`}
            className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
          />
        </Campo>

        {/* Dónde se guarda. Sale de las subpáginas reales, no de una lista
            fija: si mañana creás "LinkedIn", aparece acá solo. */}
        {destinos.length > 0 && !esEdicion && (
          <Campo label="Guardar en">
            <div className="flex flex-wrap gap-1.5">
              <BotonDestino
                activo={destino === pageId}
                onClick={() => setDestino(pageId)}
                label={pageTitle}
                hint="acá mismo"
              />
              {destinos.map((d) => (
                <BotonDestino
                  key={d.id}
                  activo={destino === d.id}
                  onClick={() => setDestino(d.id)}
                  label={d.title}
                  icon={d.icon}
                />
              ))}
            </div>
          </Campo>
        )}

        {/* Los campos sueltos primero; los que declaran un grupo (las
            métricas) van juntos abajo, para que el formulario de una idea no
            arranque pidiendo visualizaciones. */}
        {sueltos.map((property) => (
          <CampoDePropiedad
            key={property.key}
            definition={property}
            value={values[property.key] ?? ""}
            onChange={(v) => setProperty(property.key, v)}
          />
        ))}

        {grupos.map(([nombre, campos]) => (
          <details
            key={nombre}
            className="rounded-xl border border-line bg-black/15 px-3 py-2.5"
            open={campos.some((c) => (values[c.key] ?? "").trim() !== "")}
          >
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 marker:content-['']">
              {nombre}
              <span className="ml-1.5 normal-case">(opcional)</span>
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {campos.map((property) => (
                <CampoDePropiedad
                  key={property.key}
                  definition={property}
                  value={values[property.key] ?? ""}
                  onChange={(v) => setProperty(property.key, v)}
                />
              ))}
            </div>
          </details>
        ))}

        {/* El cuerpo sólo se escribe al crear: después se edita con el editor
            de bloques en la vista completa, que es mucho mejor para eso. */}
        {definition.hasBody && !esEdicion && (
          <Campo label={type === "guion" ? "Texto del guión" : "Contenido"}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder={
                type === "guion"
                  ? "Si lo dejás vacío, arranca con Gancho / Desarrollo / CTA"
                  : "Podés escribirlo ahora o después"
              }
              className="w-full resize-y rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
            />
          </Campo>
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
            {submitting
              ? "Guardando..."
              : esEdicion
                ? "Guardar"
                : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {label}
      </label>
      {children}
    </div>
  );
}

function BotonDestino({
  activo,
  onClick,
  label,
  icon,
  hint,
}: {
  activo: boolean;
  onClick: () => void;
  label: string;
  icon?: string | null;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] transition-colors",
        activo
          ? "border-accent/40 bg-accent/10 text-ink"
          : "border-line text-ink-2 hover:bg-white/[0.04] hover:text-ink"
      )}
    >
      {icon && <span className="text-[13px] leading-none">{icon}</span>}
      {label}
      {hint && <span className="text-[11px] text-ink-3">({hint})</span>}
    </button>
  );
}

/** Dibuja el control que corresponde a cada clase de campo. */
function CampoDePropiedad({
  definition,
  value,
  onChange,
}: {
  definition: PropertyDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  if (definition.kind === "select") {
    return (
      <Campo label={definition.label}>
        <div className="flex flex-wrap gap-1.5">
          {definition.options.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => onChange(option.value)}
              aria-pressed={value === option.value}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[13px] transition-colors",
                value === option.value
                  ? option.className
                  : "text-ink-3 hover:bg-white/[0.06] hover:text-ink-2"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Campo>
    );
  }

  if (definition.kind === "date") {
    return (
      <Campo label={definition.label}>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent/50"
        />
      </Campo>
    );
  }

  if (definition.kind === "number") {
    return (
      <Campo label={definition.label}>
        <div className="flex items-center gap-1.5">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode="numeric"
            placeholder={definition.placeholder ?? "0"}
            className="w-full min-w-0 rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
          />
          {definition.unit && (
            <span className="shrink-0 text-[13px] text-ink-3">
              {definition.unit}
            </span>
          )}
        </div>
      </Campo>
    );
  }

  if (definition.kind === "url") {
    return (
      <Campo label={definition.label}>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={definition.placeholder}
          className="w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
        />
      </Campo>
    );
  }

  return (
    <Campo label={definition.label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={definition.placeholder}
        className="w-full resize-y rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
      />
    </Campo>
  );
}
