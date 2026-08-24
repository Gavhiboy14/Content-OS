"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { createContentAction } from "@/app/content-actions";
import {
  CONTENT_TYPE_DEFINITIONS,
  getContentTypeDefinition,
} from "@/lib/content-types";
import {
  ContentFormModal,
  type ContentFormValues,
  type Destino,
} from "./content-form-modal";

interface AddContentButtonProps {
  pageId: string;
  pageTitle: string;
  /** Subpáginas donde también puede guardarse el contenido. */
  destinos: Destino[];
  /** Si viene un tipo, el botón crea directo ese tipo en vez de ofrecer el menú. */
  fixedType?: string;
  label?: string;
  variant?: "solid" | "soft";
  className?: string;
}

export function AddContentButton({
  pageId,
  pageTitle,
  destinos,
  fixedType,
  label,
  variant = "soft",
  className,
}: AddContentButtonProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [formType, setFormType] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleSubmit(values: ContentFormValues) {
    if (!formType) return;
    await createContentAction(values.pageId, formType, {
      title: values.title,
      properties: values.properties,
      body: values.body,
    });

    // Si se guardó en otra página, se navega ahí para que el contenido no
    // "desaparezca" de la vista actual.
    if (values.pageId !== pageId) {
      startTransition(() => router.push(`/p/${values.pageId}`));
    } else {
      startTransition(() => router.refresh());
    }
  }

  const botonClases = cn(
    variant === "solid" ? "btn-accent" : "btn-soft",
    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px]"
  );

  return (
    <>
      {fixedType ? (
        <button
          onClick={() => setFormType(fixedType)}
          className={cn(botonClases, className)}
        >
          <Plus size={13} />
          {label ?? getContentTypeDefinition(fixedType).newLabel}
        </button>
      ) : (
        <div className={cn("relative", className)}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className={botonClases}
          >
            <Plus size={13} />
            {label ?? "Agregar contenido"}
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="surface-raised absolute top-10 right-0 z-20 w-60 overflow-hidden rounded-xl p-1">
                {CONTENT_TYPE_DEFINITIONS.map((definition) => (
                  <button
                    key={definition.type}
                    onClick={() => {
                      setMenuOpen(false);
                      setFormType(definition.type);
                    }}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06]"
                  >
                    <span className="mt-px text-sm leading-none">
                      {definition.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] text-ink">
                        {definition.label}
                      </span>
                      <span className="block text-[11px] leading-snug text-ink-3">
                        {definition.hint}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <ContentFormModal
        open={formType !== null}
        onClose={() => setFormType(null)}
        type={formType ?? "guion"}
        pageId={pageId}
        pageTitle={pageTitle}
        destinos={destinos}
        onSubmit={handleSubmit}
      />
    </>
  );
}
