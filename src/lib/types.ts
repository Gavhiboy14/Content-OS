/**
 * Una Page es la unidad genérica de todo el workspace: un cliente, una
 * subpágina de cliente, un recurso, una categoría, etc. El significado lo
 * da el campo `type`, no el código — así se pueden crear tipos nuevos sin
 * tocar la aplicación.
 */
export interface Page {
  id: string;
  title: string;
  slug: string;
  icon: string | null;
  parentId: string | null;
  type: string;
  section: string | null;
  position: number;
  /** Datos propios del tipo de página: estado de un guión, etc. */
  properties: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface PageNode extends Page {
  children: PageNode[];
}

export interface CreatePageInput {
  title: string;
  parentId?: string | null;
  icon?: string | null;
  type?: string;
  section?: string | null;
  properties?: Record<string, string>;
}

export interface UpdatePageInput {
  title?: string;
  icon?: string | null;
  type?: string;
  section?: string | null;
  properties?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* Contenido                                                           */
/* ------------------------------------------------------------------ */

/**
 * Un ContentItem es algo que se produce y vive DENTRO de una página: un
 * guión, una idea, un hook. A diferencia de una Page, no aparece en el
 * sidebar ni tiene hijos: es una hoja del árbol de trabajo.
 */
export interface ContentItem {
  id: string;
  pageId: string;
  type: string;
  title: string;
  properties: Record<string, string>;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentInput {
  pageId: string;
  type: string;
  title?: string;
  properties?: Record<string, string>;
}

export interface UpdateContentInput {
  title?: string;
  properties?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* Bloques de contenido                                                */
/* ------------------------------------------------------------------ */

/**
 * Tipos de bloque que existen hoy. Agregar uno nuevo (por ejemplo "guion"
 * o "hook") es sumarlo acá, definir su forma de contenido abajo y
 * registrarlo en el registry — sin tocar la base de datos.
 */
export const BLOCK_TYPES = [
  "text",
  "heading",
  "bulleted_list",
  "todo",
  "image",
  "embed",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

/** Cuánto ancho ocupa una imagen. Se guarda en el bloque. */
export const IMAGE_SIZES = ["s", "m", "l"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

export function isImageSize(value: string): value is ImageSize {
  return (IMAGE_SIZES as readonly string[]).includes(value);
}

export interface BlockContentMap {
  text: { text: string };
  heading: { text: string; level: 1 | 2 | 3 };
  bulleted_list: { text: string };
  todo: { text: string; checked: boolean };
  /**
   * Una imagen subida o enlazada. `caption` es el pie, opcional.
   * `size` es cuánto ocupa de ancho; si falta, va a ancho completo (que es
   * como se guardaron las imágenes antes de que existiera la opción).
   */
  image: { url: string; caption: string; size?: ImageSize };
  /** Un link: video que se reproduce acá, o tarjeta para abrirlo. */
  embed: { url: string; caption: string };
}

/**
 * Los bloques que no se escriben: en vez de un campo de texto muestran una
 * imagen o un video. El editor los trata distinto — no reciben el cursor ni
 * participan de los atajos de teclado.
 */
export const MEDIA_BLOCK_TYPES: BlockType[] = ["image", "embed"];

export function isMediaBlock(type: BlockType): boolean {
  return MEDIA_BLOCK_TYPES.includes(type);
}

export type BlockContent = BlockContentMap[BlockType];

export interface Block<T extends BlockType = BlockType> {
  id: string;
  pageId: string;
  /** Si tiene valor, el bloque es del cuerpo de ese contenido y no de la página. */
  contentItemId: string | null;
  type: T;
  content: BlockContentMap[T];
  position: number;
  createdAt: string;
  updatedAt: string;
}

export function isBlockType(value: string): value is BlockType {
  return (BLOCK_TYPES as readonly string[]).includes(value);
}

/** Contenido inicial de cada tipo, usado al crear un bloque o al cambiarle el tipo. */
export function emptyContentFor(type: BlockType, text = ""): BlockContent {
  switch (type) {
    case "heading":
      return { text, level: 2 };
    case "todo":
      return { text, checked: false };
    case "image":
    case "embed":
      // El texto que traía el bloque pasa a ser el pie: si alguien convierte
      // una línea escrita en imagen, no se pierde lo que decía.
      return { url: "", caption: text };
    default:
      return { text };
  }
}

/** El texto de un bloque, sin importar su tipo. Vacío en los de medios. */
export function textOf(block: Block): string {
  return (block.content as { text?: string }).text ?? "";
}

/** La dirección de un bloque de medios. Vacía si todavía no se cargó. */
export function urlOf(block: Block): string {
  return (block.content as { url?: string }).url ?? "";
}

/** El pie de una imagen o un video. */
export function captionOf(block: Block): string {
  return (block.content as { caption?: string }).caption ?? "";
}
