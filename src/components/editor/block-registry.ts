import {
  CheckSquare,
  Heading,
  Image as ImageIcon,
  Link2,
  List,
  Text,
  type LucideIcon,
} from "lucide-react";
import type { BlockType } from "@/lib/types";

/**
 * REGISTRO DE TIPOS DE BLOQUE
 *
 * Este es el único lugar que hay que tocar para sumar un tipo de contenido
 * nuevo (un guion, un hook, una referencia). Se agrega la entrada acá, el
 * tipo en `lib/types.ts`, y el editor lo muestra solo.
 *
 * `placeholder` es lo que se ve cuando el bloque está vacío y tiene el foco.
 * `className` son los estilos del texto de ese tipo.
 */
export interface BlockDefinition {
  type: BlockType;
  label: string;
  icon: LucideIcon;
  placeholder: string;
  className: string;
  /** Atajo que convierte el bloque al escribirlo al principio de la línea. */
  markdownShortcut?: string;
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "text",
    label: "Texto",
    icon: Text,
    placeholder: "Escribí algo. Probá \"## \" para título, \"- \" para lista",
    className: "text-[15px] leading-relaxed text-ink",
  },
  {
    type: "heading",
    label: "Título",
    icon: Heading,
    placeholder: "Título",
    className: "font-display text-xl font-semibold tracking-tight text-ink",
    markdownShortcut: "## ",
  },
  {
    type: "bulleted_list",
    label: "Lista",
    icon: List,
    placeholder: "Ítem de la lista",
    className: "text-[15px] leading-relaxed text-ink",
    markdownShortcut: "- ",
  },
  {
    type: "todo",
    label: "Tarea",
    icon: CheckSquare,
    placeholder: "Tarea pendiente",
    className: "text-[15px] leading-relaxed text-ink",
    markdownShortcut: "[] ",
  },
  {
    type: "image",
    label: "Imagen",
    icon: ImageIcon,
    placeholder: "Pie de la imagen",
    className: "text-[13px] leading-relaxed text-ink-2",
  },
  {
    type: "embed",
    label: "Video o link",
    icon: Link2,
    placeholder: "Pie del video",
    className: "text-[13px] leading-relaxed text-ink-2",
  },
];

const BY_TYPE = new Map(BLOCK_DEFINITIONS.map((d) => [d.type, d]));

export function getBlockDefinition(type: BlockType): BlockDefinition {
  return BY_TYPE.get(type) ?? BLOCK_DEFINITIONS[0];
}

/** Busca un tipo a partir de lo que se escribió al principio de la línea. */
export function matchMarkdownShortcut(text: string): BlockDefinition | null {
  return (
    BLOCK_DEFINITIONS.find(
      (d) => d.markdownShortcut && text === d.markdownShortcut
    ) ?? null
  );
}
