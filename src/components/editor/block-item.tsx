"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCK_DEFINITIONS, getBlockDefinition } from "./block-registry";
import { MediaBlock } from "./media-block";
import {
  isMediaBlock,
  type Block,
  type BlockType,
  type ImageSize,
} from "@/lib/types";

interface BlockItemProps {
  block: Block;
  text: string;
  onTextChange: (text: string) => void;
  onTypeChange: (type: BlockType) => void;
  /** Crea un bloque nuevo debajo, del tipo elegido. */
  onAddBelow: (type: BlockType) => void;
  onToggleChecked: () => void;
  /** Sólo para los bloques de medios: guardar dirección, pie y tamaño. */
  onMediaChange: (content: {
    url: string;
    caption: string;
    size?: ImageSize;
  }) => void;
  onDelete: () => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onArrow: (direction: "up" | "down") => void;
  onMove: (direction: "up" | "down") => void;
  registerRef: (el: HTMLTextAreaElement | null) => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverHalf: (half: "top" | "bottom") => void;
}

export function BlockItem({
  block,
  text,
  onTextChange,
  onTypeChange,
  onAddBelow,
  onToggleChecked,
  onMediaChange,
  onDelete,
  onEnter,
  onBackspaceEmpty,
  onArrow,
  onMove,
  registerRef,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOverHalf,
}: BlockItemProps) {
  const definition = getBlockDefinition(block.type);
  const esMedio = isMediaBlock(block.type);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  // El bloque sólo se vuelve arrastrable mientras se sostiene la manija; si
  // no, arrastrar para seleccionar texto dispararía el reordenamiento.
  const [dragArmed, setDragArmed] = useState(false);

  // El textarea crece con el contenido en vez de mostrar scroll interno.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text, block.type]);

  const checked =
    block.type === "todo" && (block.content as { checked?: boolean }).checked === true;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Alt + flechas mueve el bloque entero, sin soltar el teclado.
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      onMove(e.key === "ArrowUp" ? "up" : "down");
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnter();
      return;
    }
    if (e.key === "Backspace" && text === "") {
      e.preventDefault();
      onBackspaceEmpty();
      return;
    }
    // Sólo salta de bloque si el cursor ya está en el borde del texto.
    const el = e.currentTarget;
    if (e.key === "ArrowUp" && el.selectionStart === 0) {
      e.preventDefault();
      onArrow("up");
    }
    if (e.key === "ArrowDown" && el.selectionStart === text.length) {
      e.preventDefault();
      onArrow("down");
    }
  }

  return (
    <div
      draggable={dragArmed}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={() => {
        setDragArmed(false);
        onDragEnd();
      }}
      onDragOver={(e) => {
        if (isDragging) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        onDragOverHalf(e.clientY < rect.top + rect.height / 2 ? "top" : "bottom");
      }}
      className={cn(
        "group/block relative flex items-start gap-1 rounded-lg py-0.5 transition-opacity",
        isDragging && "opacity-40"
      )}
    >
      {/* Controles del bloque.
          En escritorio flotan en el margen izquierdo y aparecen al pasar el
          mouse. En pantalla táctil no existe el hover y ese margen queda
          fuera de la pantalla, así que ahí ocupan su lugar en la fila y se
          ven siempre. */}
      <div
        className={cn(
          "flex items-center gap-0.5 pt-1 transition-opacity",
          // La posición depende del ancho (recién en pantalla grande hay un
          // margen izquierdo donde meterlos); la visibilidad depende de si
          // hay mouse, que es lo que puede revelarlos.
          "lg:absolute lg:-left-14",
          "pointer-fine:opacity-0 pointer-fine:focus-within:opacity-100 pointer-fine:group-hover/block:opacity-100"
        )}
      >
        <div className="relative">
          {/* El "+" AGREGA un bloque nuevo debajo. Antes convertía el bloque
              actual, que con un ícono de "más" es lo contrario de lo que
              cualquiera espera: al querer sumar una segunda imagen,
              reemplazaba la primera. Para convertir está el menú de la
              manija, al lado. */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="tap-target rounded-md p-1 text-ink-3 transition-colors hover:bg-white/[0.07] hover:text-ink"
            aria-label="Agregar un bloque debajo"
            aria-expanded={menuOpen}
            title="Agregar debajo"
          >
            <Plus size={14} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="surface-raised absolute top-7 left-0 z-20 w-40 overflow-hidden rounded-xl p-1">
                {BLOCK_DEFINITIONS.map((def) => {
                  const Icon = def.icon;
                  return (
                    <button
                      key={def.type}
                      onClick={() => {
                        onAddBelow(def.type);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink"
                    >
                      <Icon size={13} className="shrink-0 text-ink-3" />
                      {def.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* La manija arrastra para reordenar y, con un click, abre el menú
            para convertir el bloque en otro tipo. */}
        <div className="relative">
          <button
            onMouseDown={() => setDragArmed(true)}
            onMouseUp={() => setDragArmed(false)}
            onClick={() => setConvertOpen((v) => !v)}
            aria-label="Opciones del bloque"
            aria-expanded={convertOpen}
            title="Arrastrar para mover · click para convertir"
            className="tap-target cursor-grab rounded-md p-1 text-ink-3 transition-colors hover:bg-white/[0.07] hover:text-ink active:cursor-grabbing"
          >
            <GripVertical size={14} />
          </button>

          {convertOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setConvertOpen(false)}
                aria-hidden="true"
              />
              <div className="surface-raised absolute top-7 left-0 z-20 w-44 overflow-hidden rounded-xl p-1">
                <p className="px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  Convertir en
                </p>
                {BLOCK_DEFINITIONS.map((def) => {
                  const Icon = def.icon;
                  return (
                    <button
                      key={def.type}
                      onClick={() => {
                        onTypeChange(def.type);
                        setConvertOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.06]",
                        def.type === block.type ? "text-ink" : "text-ink-2"
                      )}
                    >
                      <Icon size={13} className="shrink-0 text-ink-3" />
                      {def.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Marcador propio de cada tipo */}
      {block.type === "bulleted_list" && (
        <span className="mt-[11px] ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-3" />
      )}

      {block.type === "todo" && (
        <button
          onClick={onToggleChecked}
          role="checkbox"
          aria-checked={checked}
          aria-label={checked ? "Marcar como pendiente" : "Marcar como hecha"}
          className={cn(
            "mt-[9px] ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
            checked
              ? "border-accent bg-accent text-[#1a1420]"
              : "border-line-hi hover:border-ink-3"
          )}
        >
          {checked && (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
              <path
                d="M2.5 6.5L4.8 8.8L9.5 3.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      )}

      {/* Los bloques de medios no llevan campo de texto: muestran la imagen o
          el video, con su propio pie. Por eso tampoco registran una
          referencia — el cursor no puede pararse en ellos. */}
      {esMedio ? (
        <div className="min-w-0 flex-1 py-1">
          <MediaBlock
            block={block}
            onChange={onMediaChange}
            onDelete={onDelete}
          />
        </div>
      ) : (
        <textarea
          ref={(el) => {
            textareaRef.current = el;
            registerRef(el);
          }}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={definition.placeholder}
          aria-label={definition.label}
          className={cn(
            "min-w-0 flex-1 resize-none overflow-hidden border-none bg-transparent py-1 outline-none placeholder:text-ink-3",
            definition.className,
            checked && "text-ink-3 line-through"
          )}
        />
      )}
    </div>
  );
}
