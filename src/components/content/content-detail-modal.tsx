"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { getContentBodyAction } from "@/app/content-actions";
import { getContentTypeDefinition } from "@/lib/content-types";
import { getPropertyOption, parseDateKey } from "@/lib/page-types";
import type { ContentItem } from "@/lib/types";

interface ContentDetailModalProps {
  open: boolean;
  onClose: () => void;
  item: ContentItem;
  /** La página donde vive: es la plataforma. */
  pageTitle: string;
  onEdit: () => void;
  onDelete: () => void;
  /**
   * Recibe la clave además del valor: un contenido puede tener más de una
   * propiedad de lista (estado y prioridad), y cada chip tiene que escribir
   * en la suya. Fijar la clave acá hacía que la prioridad pisara el estado.
   */
  onChangeProperty: (key: string, value: string) => void;
}

/**
 * Vista rápida de un contenido, sin salir de la página. Para escribir el
 * cuerpo está la vista completa, a la que se llega con el ↗.
 */
export function ContentDetailModal({
  open,
  onClose,
  item,
  pageTitle,
  onEdit,
  onDelete,
  onChangeProperty,
}: ContentDetailModalProps) {
  const definition = getContentTypeDefinition(item.type);
  const [body, setBody] = useState<{ heading: boolean; text: string }[] | null>(
    null
  );

  // Al pasar de cerrado a abierto se descarta lo cargado antes, para no
  // mostrar el cuerpo de otro contenido mientras llega el nuevo. Se hace
  // durante el render y no en un efecto, que es el patrón de React para
  // resetear estado cuando cambia una prop.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setBody(null);
  }

  // El cuerpo se pide recién al abrir.
  useEffect(() => {
    if (!open) return;
    let vigente = true;
    getContentBodyAction(item.pageId, item.id)
      .then((partes) => {
        if (vigente) setBody(partes);
      })
      .catch((err) => {
        console.error("No se pudo leer el contenido", err);
        if (vigente) setBody([]);
      });
    return () => {
      vigente = false;
    };
  }, [open, item.pageId, item.id]);

  const fecha = item.properties.date ? parseDateKey(item.properties.date) : null;
  const enlace = item.properties.url?.trim();
  const notas = item.properties.notes?.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${definition.icon} ${definition.label}`}
    >
      <div className="flex flex-col gap-5">
        <h3 className="font-display text-xl leading-snug font-semibold tracking-tight text-ink">
          {item.title || (
            <span className="text-ink-3">Sin título</span>
          )}
        </h3>

        <dl className="flex flex-col gap-3">
          <Dato label="Plataforma">{pageTitle}</Dato>

          {definition.properties.map((property) => {
            if (property.kind !== "select") return null;
            const option = getPropertyOption(property, item.properties[property.key]);
            return (
              <Dato key={property.key} label={property.label}>
                {/* El estado se cambia acá mismo, sin abrir el formulario. */}
                <div className="flex flex-wrap gap-1">
                  {property.options.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => onChangeProperty(property.key, o.value)}
                      aria-pressed={o.value === option.value}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] transition-colors",
                        o.value === option.value
                          ? cn("chip", o.className)
                          : "text-ink-3 hover:bg-white/[0.06] hover:text-ink-2"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </Dato>
            );
          })}

          {fecha && (
            <Dato label="Fecha">
              {fecha.toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Dato>
          )}

          {enlace && (
            <Dato label="Enlace">
              <a
                href={enlace}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-accent hover:underline"
              >
                <span className="max-w-56 truncate">{enlace}</span>
                <ExternalLink size={12} className="shrink-0" />
              </a>
            </Dato>
          )}
        </dl>

        {definition.hasBody && (
          <div>
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              {item.type === "guion" ? "Guión" : "Contenido"}
            </span>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-line bg-black/20 px-3 py-2.5">
              {body === null ? (
                <p className="text-sm text-ink-3">Cargando…</p>
              ) : body.length === 0 ? (
                <p className="text-sm text-ink-3">Todavía sin escribir</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {body.map((parte, i) => (
                    <p
                      key={i}
                      className={cn(
                        "text-sm leading-relaxed",
                        parte.heading
                          ? "font-display font-semibold text-ink"
                          : "text-ink-2"
                      )}
                    >
                      {parte.text}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {notas && (
          <div>
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              Notas
            </span>
            <p className="text-sm leading-relaxed whitespace-pre-line text-ink-2">
              {notas}
            </p>
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <a
            href={`/c/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-soft flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px]"
          >
            <ArrowUpRight size={13} />
            Abrir completo
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-red-500/15 hover:text-red-400"
            >
              <Trash2 size={13} />
              Eliminar
            </button>
            <button
              onClick={onEdit}
              className="btn-accent flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[13px] font-medium"
            >
              <Pencil size={13} />
              Editar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Dato({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-ink-2">{children}</dd>
    </div>
  );
}
