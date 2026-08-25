"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteContentAction, updateContentAction } from "@/app/content-actions";
import {
  getContentTypeDefinition,
  isPendingContent,
} from "@/lib/content-types";
import {
  findSelectProperty,
  getPropertyOption,
  parseDateKey,
} from "@/lib/page-types";
import { ContentDetailModal } from "./content-detail-modal";
import { ContentFormModal } from "./content-form-modal";
import type { ContentItem } from "@/lib/types";

const AUTOSAVE_MS = 600;

function looksLikeUrl(text: string): boolean {
  return /^https?:\/\/\S+/i.test(text.trim());
}

/**
 * Una fila de contenido. Los tipos que se escriben (guión, idea) muestran su
 * título; los que son una línea (hook, tarea) se editan acá mismo. En los dos
 * casos, el click abre el detalle y el menú "…" agrupa las acciones.
 *
 * Se exporta porque las páginas de gestión muestran las mismas filas, pero
 * agrupadas por la página donde vive cada contenido en vez de por tipo.
 */
export function ContentRow({
  item,
  pageId,
  pageTitle,
  canal,
}: {
  item: ContentItem;
  pageId: string;
  pageTitle: string;
  /**
   * Dónde vive el contenido. Se pasa sólo en las vistas que mezclan varias
   * páginas: adentro de una página sola sería repetir lo mismo en cada fila.
   */
  canal?: { title: string; icon: string | null };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const definition = getContentTypeDefinition(item.type);

  const [title, setTitle] = useState(item.title);
  const [props, setProps] = useState(item.properties);
  const [justCopied, setJustCopied] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editable = !definition.hasBody;
  const isHook = item.type === "hook";
  const favorite = props.favorite === "true";
  const status = findSelectProperty(definition.properties, "status");
  const prioridad = findSelectProperty(definition.properties, "priority");
  const enlace = props.url?.trim();
  const fecha = props.date ? parseDateKey(props.date) : null;
  // La prioridad se muestra sólo cuando dice algo: "Media" es el valor con el
  // que nace todo, y repetirlo en cada fila sería ruido.
  const prioridadVisible =
    prioridad && props.priority && props.priority !== prioridad.defaultValue
      ? getPropertyOption(prioridad, props.priority)
      : null;
  // Una tarea completada (o una idea descartada) se muestra tachada.
  const cerrado = Boolean(status) && !isPendingContent(item.type, props);

  const itemActual = { ...item, title, properties: props };

  function saveTitle(next: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await updateContentAction(item.id, { title: next });
      } catch (err) {
        console.error("No se pudo guardar", err);
      }
    }, AUTOSAVE_MS);
  }

  function setProperty(key: string, value: string) {
    const next = { ...props, [key]: value };
    setProps(next);
    updateContentAction(item.id, { properties: next }).catch((err) =>
      console.error("No se pudo guardar", err)
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(title);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1200);
    } catch (err) {
      console.error("No se pudo copiar", err);
    }
  }

  async function handleDelete() {
    await deleteContentAction(item.id, pageId);
    setDetailOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      {/* El título lleva `basis-full`, así en el teléfono se queda con el
          primer renglón entero y los datos bajan al segundo. Desde `sm` vuelve
          a compartir la línea. Es lo que evita que el título se comprima
          hasta volverse ilegible. */}
      <div
        className={cn(
          "group/row panel-interactive flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl py-2 pr-2 pl-3",
          favorite && "border-accent/35 bg-accent/[0.07]"
        )}
      >
        {editable ? (
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              saveTitle(e.target.value);
            }}
            placeholder={
              definition.inlinePlaceholder ??
              `Escribí ${definition.label.toLowerCase()}…`
            }
            aria-label={definition.label}
            className={cn(
              "min-w-0 basis-full border-none bg-transparent py-0.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-3 sm:basis-0 sm:flex-1",
              cerrado && "text-ink-3 line-through"
            )}
          />
        ) : (
          <button
            onClick={() => setDetailOpen(true)}
            className={cn(
              "min-w-0 basis-full truncate py-0.5 text-left text-[15px] leading-relaxed transition-colors sm:basis-0 sm:flex-1",
              cerrado ? "text-ink-3 line-through" : "text-ink-2 hover:text-ink"
            )}
          >
            {title || <span className="text-ink-3">Sin título</span>}
          </button>
        )}

        {canal && (
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-ink-3">
            {canal.icon && <span className="leading-none">{canal.icon}</span>}
            {canal.title}
          </span>
        )}

        {fecha && (
          <span className="shrink-0 font-mono text-[11px] text-ink-3">
            {fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
          </span>
        )}

        {prioridadVisible && (
          <span
            className={cn(
              "chip shrink-0 rounded-md px-2 py-0.5 text-[11px]",
              prioridadVisible.className
            )}
          >
            {prioridadVisible.label}
          </span>
        )}

        {status && (
          <span
            className={cn(
              "chip shrink-0 rounded-md px-2 py-0.5 text-[11px]",
              getPropertyOption(status, props.status).className
            )}
          >
            {getPropertyOption(status, props.status).label}
          </span>
        )}

        {/* Acciones frecuentes de cada tipo, fuera del menú: para un hook,
            marcarlo y copiarlo es lo que más se hace. */}
        {isHook && (
          <>
            <IconButton
              onClick={() => setProperty("favorite", favorite ? "false" : "true")}
              label={favorite ? "Quitar de favoritos" : "Marcar como favorito"}
              pressed={favorite}
              className={favorite ? "text-accent" : undefined}
            >
              <Star filled={favorite} />
            </IconButton>

            <IconButton onClick={copy} label="Copiar">
              {justCopied ? (
                <Check size={14} className="text-emerald-300" />
              ) : (
                <Copy size={14} />
              )}
            </IconButton>
          </>
        )}

        {enlace && looksLikeUrl(enlace) && (
          <a
            href={enlace}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir enlace"
            title={enlace}
            className="shrink-0 rounded-md p-1 text-ink-3 transition-colors hover:bg-white/[0.08] hover:text-ink"
          >
            <ExternalLink size={14} />
          </a>
        )}

        {/* `ms-auto` lo empuja al extremo derecho de su renglón. En el
            teléfono los datos bajan a una segunda línea y, sin esto, el menú
            quedaba pegado a la izquierda — y como su desplegable se cuelga
            del borde derecho del botón, se salía de la pantalla. */}
        <RowMenu
          itemId={item.id}
          label={definition.label}
          onDetail={() => setDetailOpen(true)}
          onEdit={() => setEditOpen(true)}
          onDelete={() => setConfirmOpen(true)}
          className="ms-auto"
        />
      </div>

      <ContentDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        item={itemActual}
        pageTitle={pageTitle}
        onEdit={() => {
          setDetailOpen(false);
          setEditOpen(true);
        }}
        onDelete={() => {
          setDetailOpen(false);
          setConfirmOpen(true);
        }}
        onChangeProperty={setProperty}
      />

      <ContentFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        type={item.type}
        pageId={pageId}
        pageTitle={pageTitle}
        destinos={[]}
        editing={{ title, properties: props }}
        onSubmit={async (values) => {
          setTitle(values.title);
          setProps(values.properties);
          await updateContentAction(item.id, {
            title: values.title,
            properties: values.properties,
          });
          startTransition(() => router.refresh());
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={`Eliminar ${definition.label.toLowerCase()}`}
        description={`¿Eliminar "${title || "este contenido"}"? Esta acción no se puede deshacer.`}
      />
    </>
  );
}

/** Menú "…" con las acciones que no se usan a cada rato. */
function RowMenu({
  itemId,
  label,
  onDetail,
  onEdit,
  onDelete,
  className,
}: {
  itemId: string;
  label: string;
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Opciones de ${label.toLowerCase()}`}
        title="Opciones"
        // Se esconde hasta acercar el mouse sólo donde hay mouse (`pointer-fine`),
        // no según el ancho: una tablet grande es ancha y táctil a la vez, y
        // ahí esconderlo lo dejaba imposible de abrir.
        className="tap-target rounded-md p-1 text-ink-3 transition-all hover:bg-white/[0.08] hover:text-ink pointer-fine:opacity-0 pointer-fine:focus-visible:opacity-100 pointer-fine:group-hover/row:opacity-100"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="surface-raised absolute top-7 right-0 z-40 w-48 overflow-hidden rounded-xl p-1">
            <MenuItem
              onClick={() => {
                setOpen(false);
                onDetail();
              }}
            >
              <ArrowUpRight size={12} />
              Ver detalle
            </MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              <Pencil size={12} />
              Editar
            </MenuItem>
            <a
              href={`/c/${itemId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              <ExternalLink size={12} />
              Abrir en pestaña nueva
            </a>
            <MenuItem
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              danger
            >
              <Trash2 size={12} />
              Eliminar
            </MenuItem>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
        danger
          ? "text-ink-2 hover:bg-red-500/15 hover:text-red-400"
          : "text-ink-2 hover:bg-white/[0.06] hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

function IconButton({
  onClick,
  label,
  pressed,
  className,
  children,
}: {
  onClick: () => void;
  label: string;
  pressed?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        "shrink-0 rounded-md p-1 text-ink-3 transition-colors hover:bg-white/[0.08] hover:text-ink",
        className
      )}
    >
      {children}
    </button>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
