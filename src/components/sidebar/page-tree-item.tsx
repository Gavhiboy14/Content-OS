"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PageNode } from "@/lib/types";

/** Cuánto se corre cada nivel de profundidad, en píxeles. */
const INDENT = 13;

interface PageTreeItemProps {
  node: PageNode;
  depth: number;
  isActive: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggleExpand: () => void;
  onAddChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
  draggable: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function PageTreeItem({
  node,
  depth,
  isActive,
  isExpanded,
  hasChildren,
  onToggleExpand,
  onAddChild,
  onEdit,
  onDelete,
  draggable,
  onDragStart,
  onDragEnd,
}: PageTreeItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative">
      {/* Línea guía: hace visible de un vistazo qué cuelga de qué. */}
      {depth > 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-line"
          style={{ left: 10 + (depth - 1) * INDENT }}
        />
      )}

      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={cn(
          "group/row relative flex items-center gap-0.5 rounded-lg pr-1 transition-colors duration-200",
          isActive ? "nav-active" : "hover:bg-white/[0.06]"
        )}
        style={{ paddingLeft: 4 + depth * INDENT }}
      >
        {/* Marca de página activa, pegada al borde izquierdo del panel */}
        {isActive && (
          <span
            aria-hidden="true"
            className="nav-marker absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-r-full"
          />
        )}

        <button
          onClick={onToggleExpand}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-3 transition-colors hover:text-ink",
            !hasChildren && "pointer-events-none opacity-0"
          )}
          tabIndex={hasChildren ? 0 : -1}
          aria-label={isExpanded ? "Contraer" : "Expandir"}
          aria-expanded={hasChildren ? isExpanded : undefined}
        >
          <ChevronRight
            size={13}
            className={cn("transition-transform duration-200", isExpanded && "rotate-90")}
          />
        </button>

        <Link
          href={`/p/${node.id}`}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 py-1.5 text-[13px] transition-colors",
            isActive
              ? "font-medium text-ink"
              : "text-ink-2 hover:text-ink"
          )}
        >
          <span className="shrink-0 text-[13px] leading-none">{node.icon}</span>
          <span className="truncate">{node.title}</span>
        </Link>

        {/* Dos acciones: crear subpágina (la más usada) y el resto en un menú */}
        <div className="flex shrink-0 items-center gap-px opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/row:opacity-100">
          <button
            onClick={onAddChild}
            className="rounded-md p-1 text-ink-3 transition-colors hover:bg-white/[0.10] hover:text-ink"
            aria-label={`Nueva subpágina en ${node.title}`}
            title="Nueva subpágina"
          >
            <Plus size={13} />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={`Opciones de ${node.title}`}
              title="Opciones"
              className="rounded-md p-1 text-ink-3 transition-colors hover:bg-white/[0.10] hover:text-ink"
            >
              <MoreHorizontal size={13} />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="surface-raised absolute top-7 right-0 z-40 w-36 overflow-hidden rounded-xl p-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink"
                  >
                    <Pencil size={12} />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-red-500/15 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
