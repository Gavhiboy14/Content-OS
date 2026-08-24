"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { BlockItem } from "./block-item";
import { matchMarkdownShortcut } from "./block-registry";
import {
  createBlockAction,
  deleteBlockAction,
  moveBlockAction,
  updateBlockAction,
} from "@/app/block-actions";
import {
  emptyContentFor,
  isMediaBlock,
  textOf,
  type Block,
  type BlockContent,
  type BlockType,
} from "@/lib/types";

const AUTOSAVE_MS = 600;

interface BlockEditorProps {
  /** A quién pertenecen estos bloques: una página, o el cuerpo de un contenido. */
  owner: { pageId: string; contentItemId: string | null };
  initialBlocks: Block[];
}

type PendingPatch = { type?: BlockType; content?: BlockContent };

export function BlockEditor({ owner, initialBlocks }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const refs = useRef(new Map<string, HTMLTextAreaElement>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, PendingPatch>());
  // Un bloque recién creado vive con un id provisorio hasta que el servidor
  // devuelve el real. Acá se guarda esa promesa para que un guardado
  // disparado mientras tanto sepa esperarla.
  const idResolution = useRef(new Map<string, Promise<string>>());
  const focusTarget = useRef<string | null>(null);

  // Enfoca el bloque que se acaba de crear o al que hay que saltar.
  useLayoutEffect(() => {
    const id = focusTarget.current;
    if (!id) return;
    const el = refs.current.get(id);
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      focusTarget.current = null;
    }
  });

  const resolveId = useCallback(async (id: string): Promise<string> => {
    if (!id.startsWith("temp-")) return id;
    const promise = idResolution.current.get(id);
    if (!promise) throw new Error("El bloque todavía no se creó en el servidor");
    return promise;
  }, []);

  const flush = useCallback(
    async (id: string) => {
      const patch = pending.current.get(id);
      if (!patch) return;
      pending.current.delete(id);
      timers.current.delete(id);
      const realId = await resolveId(id);
      await updateBlockAction(realId, patch);
    },
    [resolveId]
  );

  const scheduleSave = useCallback(
    (id: string, patch: PendingPatch) => {
      pending.current.set(id, { ...pending.current.get(id), ...patch });
      const existing = timers.current.get(id);
      if (existing) clearTimeout(existing);

      setSaving(true);
      const timer = setTimeout(async () => {
        try {
          await flush(id);
        } catch (err) {
          console.error("No se pudo guardar el bloque", err);
        } finally {
          if (pending.current.size === 0) setSaving(false);
        }
      }, AUTOSAVE_MS);
      timers.current.set(id, timer);
    },
    [flush]
  );

  // Al salir de la página, persistir lo que quedó pendiente en vez de perderlo.
  useEffect(() => {
    const timersMap = timers.current;
    const pendingMap = pending.current;
    const idMap = idResolution.current;
    return () => {
      timersMap.forEach((t) => clearTimeout(t));
      pendingMap.forEach(async (patch, id) => {
        try {
          const realId = id.startsWith("temp-") ? await idMap.get(id) : id;
          if (realId) await updateBlockAction(realId, patch);
        } catch (err) {
          console.error("No se pudo guardar al salir de la página", err);
        }
      });
    };
  }, []);

  function patchLocal(id: string, updater: (b: Block) => Block) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? updater(b) : b)));
  }

  function handleTextChange(block: Block, text: string) {
    // Atajos tipo markdown: "## ", "- ", "[] " convierten el bloque.
    if (block.type === "text") {
      const shortcut = matchMarkdownShortcut(text);
      if (shortcut) {
        handleTypeChange(block, shortcut.type, "");
        return;
      }
    }

    const content = { ...block.content, text } as BlockContent;
    patchLocal(block.id, (b) => ({ ...b, content }));
    scheduleSave(block.id, { content });
  }

  function handleTypeChange(block: Block, type: BlockType, forcedText?: string) {
    const text = forcedText ?? textOf(block);
    const content = emptyContentFor(type, text);
    patchLocal(block.id, (b) => ({ ...b, type, content }));
    scheduleSave(block.id, { type, content });
    focusTarget.current = block.id;
  }

  function handleMediaChange(
    block: Block,
    content: { url: string; caption: string }
  ) {
    patchLocal(block.id, (b) => ({ ...b, content }));
    scheduleSave(block.id, { content });
  }

  function handleToggleChecked(block: Block) {
    if (block.type !== "todo") return;
    const current = block.content as { text: string; checked: boolean };
    const content = { ...current, checked: !current.checked };
    patchLocal(block.id, (b) => ({ ...b, content }));
    scheduleSave(block.id, { content });
  }

  function createAfter(block: Block | null) {
    // Los tipos que se escriben en tanda (listas, tareas) siguen con otro
    // igual; el resto vuelve a texto.
    const CONTINUES: BlockType[] = ["bulleted_list", "todo"];
    const inheritType =
      block && CONTINUES.includes(block.type) ? block.type : "text";

    const tempId = `temp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const optimistic: Block = {
      id: tempId,
      pageId: owner.pageId,
      contentItemId: owner.contentItemId,
      type: inheritType,
      content: emptyContentFor(inheritType),
      position: block ? block.position + 1 : blocks.length,
      createdAt: now,
      updatedAt: now,
    };

    setBlocks((prev) => {
      if (!block) return [...prev, optimistic];
      const i = prev.findIndex((b) => b.id === block.id);
      const next = [...prev];
      next.splice(i + 1, 0, optimistic);
      return next;
    });
    focusTarget.current = tempId;

    const promise = createBlockAction(owner, inheritType, block?.id ?? null)
      .then((real) => {
        // El id local del bloque NO se reemplaza por el del servidor: es la
        // `key` de React, y cambiarla desmontaría el textarea justo mientras
        // se está escribiendo en él, perdiendo el foco y el cursor. La
        // equivalencia local → servidor vive en `idResolution`.
        return real.id;
      })
      .catch((err) => {
        console.error("No se pudo crear el bloque", err);
        setBlocks((prev) => prev.filter((b) => b.id !== tempId));
        throw err;
      });

    idResolution.current.set(tempId, promise);
  }

  /**
   * El bloque anterior en el que se puede escribir. Los de medios no reciben
   * el cursor, así que se los saltea al navegar y al borrar.
   */
  function vecinoEscribible(
    desde: number,
    direccion: -1 | 1
  ): Block | undefined {
    for (let i = desde; i >= 0 && i < blocks.length; i += direccion) {
      if (!isMediaBlock(blocks[i].type)) return blocks[i];
    }
    return undefined;
  }

  async function removeBlock(block: Block) {
    const index = blocks.findIndex((b) => b.id === block.id);
    const anterior =
      vecinoEscribible(index - 1, -1) ?? vecinoEscribible(index + 1, 1);

    setBlocks((prev) => prev.filter((b) => b.id !== block.id));
    if (anterior) focusTarget.current = anterior.id;

    const timer = timers.current.get(block.id);
    if (timer) clearTimeout(timer);
    pending.current.delete(block.id);

    try {
      const realId = await resolveId(block.id);
      await deleteBlockAction(realId);
    } catch (err) {
      console.error("No se pudo borrar el bloque", err);
    }
  }

  function handleBackspaceEmpty(block: Block) {
    if (blocks.length === 1) return; // nunca dejar la página sin ningún bloque
    removeBlock(block);
  }

  /** Quitar una imagen o un video con su botón. */
  function handleDelete(block: Block) {
    // Si era lo único que había, en vez de dejar la página vacía vuelve a ser
    // un bloque de texto listo para escribir.
    if (blocks.length === 1) {
      handleTypeChange(block, "text", "");
      return;
    }
    removeBlock(block);
  }

  function handleArrow(block: Block, direction: "up" | "down") {
    const index = blocks.findIndex((b) => b.id === block.id);
    const target =
      direction === "up"
        ? vecinoEscribible(index - 1, -1)
        : vecinoEscribible(index + 1, 1);
    if (target) focusTarget.current = target.id;
  }

  /**
   * Mueve un bloque a otra posición. Lo usan tanto el arrastre como el
   * atajo de teclado: se reordena en pantalla al instante y se persiste
   * después, con las posiciones recalculadas en el servidor.
   */
  async function reorder(id: string, toIndex: number) {
    const from = blocks.findIndex((b) => b.id === id);
    if (from === -1) return;
    const clamped = Math.max(0, Math.min(toIndex, blocks.length - 1));
    if (clamped === from) return;

    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(clamped, 0, moved);
      return next;
    });

    try {
      const realId = await resolveId(id);
      await moveBlockAction(owner, realId, clamped);
    } catch (err) {
      console.error("No se pudo mover el bloque", err);
    }
  }

  function handleMove(block: Block, direction: "up" | "down") {
    const from = blocks.findIndex((b) => b.id === block.id);
    focusTarget.current = block.id; // el cursor viaja con el bloque
    reorder(block.id, direction === "up" ? from - 1 : from + 1);
  }

  function handleDrop() {
    if (!dragId || dropIndex === null) {
      setDragId(null);
      setDropIndex(null);
      return;
    }
    const from = blocks.findIndex((b) => b.id === dragId);
    // El índice de la línea cuenta huecos entre bloques; al sacar el bloque
    // de su lugar, todo lo que estaba debajo sube uno.
    const to = from < dropIndex ? dropIndex - 1 : dropIndex;
    reorder(dragId, to);
    setDragId(null);
    setDropIndex(null);
  }

  return (
    <div className="relative">
      {/* El texto se monta y desmonta en lugar de esconderse con opacidad:
          si quedara siempre en el DOM, un lector de pantalla lo anunciaría
          aunque no se esté guardando nada. */}
      <div
        aria-live="polite"
        className="pointer-events-none absolute -top-7 right-0 font-mono text-[10px] tracking-wider text-ink-3"
      >
        {saving ? "guardando…" : null}
      </div>

      <div
        className="flex flex-col gap-0.5"
        onDragOver={(e) => {
          if (dragId) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop();
        }}
      >
        {blocks.map((block, index) => (
          <Fragment key={block.id}>
            {dropIndex === index && <DropLine />}
            <BlockItem
              block={block}
              text={textOf(block)}
              onTextChange={(text) => handleTextChange(block, text)}
              onTypeChange={(type) => handleTypeChange(block, type)}
              onToggleChecked={() => handleToggleChecked(block)}
              onMediaChange={(content) => handleMediaChange(block, content)}
              onDelete={() => handleDelete(block)}
              onEnter={() => createAfter(block)}
              onBackspaceEmpty={() => handleBackspaceEmpty(block)}
              onArrow={(dir) => handleArrow(block, dir)}
              onMove={(dir) => handleMove(block, dir)}
              isDragging={dragId === block.id}
              onDragStart={() => setDragId(block.id)}
              onDragEnd={() => {
                setDragId(null);
                setDropIndex(null);
              }}
              onDragOverHalf={(half) =>
                setDropIndex(half === "top" ? index : index + 1)
              }
              registerRef={(el) => {
                if (el) refs.current.set(block.id, el);
                else refs.current.delete(block.id);
              }}
            />
          </Fragment>
        ))}
        {dropIndex === blocks.length && <DropLine />}
      </div>

      {/* Zona clickeable debajo del último bloque, como en Notion */}
      <button
        onClick={() => createAfter(blocks[blocks.length - 1] ?? null)}
        className="mt-1 h-16 w-full cursor-text text-left text-[15px] text-transparent"
        aria-label="Agregar un bloque al final"
      />
    </div>
  );
}

function DropLine() {
  return (
    <div
      className="h-[2px] rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]"
      aria-hidden="true"
    />
  );
}
