"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateContentAction } from "@/app/content-actions";
import { getContentTypeDefinition } from "@/lib/content-types";
import {
  getPropertyOption,
  type DatePropertyDefinition,
  type SelectPropertyDefinition,
  type TextPropertyDefinition,
  type UrlPropertyDefinition,
} from "@/lib/page-types";
import type { ContentItem } from "@/lib/types";

const AUTOSAVE_MS = 600;

/** Título editable y campos de un contenido. */
export function ContentHeader({ item }: { item: ContentItem }) {
  const definition = getContentTypeDefinition(item.type);
  const [title, setTitle] = useState(item.title);
  const [values, setValues] = useState(item.properties);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const camposCortos = definition.properties.filter((p) => p.kind !== "text");
  const camposLargos = definition.properties.filter(
    (p): p is TextPropertyDefinition => p.kind === "text"
  );

  function saveTitle(next: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await updateContentAction(item.id, { title: next });
      } catch (err) {
        console.error("No se pudo guardar el título", err);
      }
    }, AUTOSAVE_MS);
  }

  function setProperty(key: string, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    updateContentAction(item.id, { properties: next }).catch((err) =>
      console.error("No se pudo guardar la propiedad", err)
    );
  }

  return (
    <header className="mb-10">
      <div className="mb-6 flex items-start gap-4">
        <span className="mt-1.5 text-3xl leading-none">{definition.icon}</span>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            saveTitle(e.target.value);
          }}
          placeholder={`${definition.label} sin título`}
          aria-label="Título"
          className="min-w-0 flex-1 border-none bg-transparent font-display text-4xl font-semibold tracking-tight text-ink outline-none placeholder:text-ink-3"
        />
      </div>

      {/* Los campos cortos van en una fila; las notas, que son texto largo,
          debajo con su propio espacio. */}
      {camposCortos.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {camposCortos.map((property) => {
            const value = values[property.key];
            const onChange = (v: string) => setProperty(property.key, v);

            if (property.kind === "select") {
              return (
                <PropertySelect
                  key={property.key}
                  definition={property}
                  value={value}
                  onChange={onChange}
                />
              );
            }
            if (property.kind === "date") {
              return (
                <PropertyDate
                  key={property.key}
                  definition={property}
                  value={value}
                  onChange={onChange}
                />
              );
            }
            return (
              <PropertyUrl
                key={property.key}
                definition={property}
                value={value}
                onChange={onChange}
              />
            );
          })}
        </div>
      )}

      {camposLargos.map((property) => (
        <PropertyText
          key={property.key}
          definition={property}
          value={values[property.key]}
          onChange={(v) => setProperty(property.key, v)}
        />
      ))}
    </header>
  );
}

/** Enlace: además de editarlo, deja abrirlo cuando ya tiene algo cargado. */
function PropertyUrl({
  definition,
  value,
  onChange,
}: {
  definition: UrlPropertyDefinition;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esUrl = /^https?:\/\/\S+/i.test(draft.trim());

  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {definition.label}
      </span>
      <div className="flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => onChange(e.target.value), AUTOSAVE_MS);
          }}
          placeholder={definition.placeholder}
          aria-label={definition.label}
          className="w-56 rounded-lg border border-line-hi bg-black/25 px-2.5 py-1 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
        />
        {esUrl && (
          <a
            href={draft.trim()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir enlace"
            title="Abrir enlace"
            className="shrink-0 rounded-md p-1 text-ink-3 transition-colors hover:bg-white/[0.08] hover:text-ink"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

/** Notas: texto libre que crece con el contenido. */
function PropertyText({
  definition,
  value,
  onChange,
}: {
  definition: TextPropertyDefinition;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  return (
    <div className="mt-5">
      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {definition.label}
      </label>
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => onChange(e.target.value), AUTOSAVE_MS);
        }}
        rows={2}
        placeholder={definition.placeholder}
        aria-label={definition.label}
        className="w-full resize-none overflow-hidden rounded-xl border border-line bg-black/20 px-3 py-2 text-sm leading-relaxed text-ink-2 outline-none transition-colors placeholder:text-ink-3 focus:border-accent/40 focus:text-ink"
      />
    </div>
  );
}

/** Campo de fecha. Vacío por defecto: no toda publicación tiene fecha todavía. */
function PropertyDate({
  definition,
  value,
  onChange,
}: {
  definition: DatePropertyDefinition;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {definition.label}
      </span>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={definition.label}
        className={cn(
          "rounded-lg border border-line-hi bg-black/25 px-2.5 py-1 text-[13px] text-ink outline-none transition-colors focus:border-accent/50",
          !value && "text-ink-3"
        )}
      />
    </div>
  );
}

function PropertySelect({
  definition,
  value,
  onChange,
}: {
  definition: SelectPropertyDefinition;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = getPropertyOption(definition, value);

  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {definition.label}
      </span>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${definition.label}: ${selected.label}`}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] transition-colors hover:brightness-125",
            selected.className
          )}
        >
          {selected.label}
          <ChevronDown size={12} className="opacity-50" />
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="surface-raised absolute top-8 left-0 z-20 w-44 overflow-hidden rounded-xl p-1">
              {definition.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-white/[0.06]"
                >
                  <span className={cn("rounded-md px-2 py-0.5", option.className)}>
                    {option.label}
                  </span>
                  {option.value === selected.value && (
                    <Check size={13} className="shrink-0 text-accent" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
