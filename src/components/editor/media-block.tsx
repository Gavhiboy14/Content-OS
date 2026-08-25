"use client";

import { useRef, useState } from "react";
import { ExternalLink, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { uploadImageAction } from "@/app/upload-actions";
import { describeEmbed } from "@/lib/embeds";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/types";
import { captionOf, urlOf } from "@/lib/types";

interface MediaBlockProps {
  block: Block;
  onChange: (content: { url: string; caption: string }) => void;
  onDelete: () => void;
}

/**
 * Un bloque que muestra algo en vez de dejar escribir: una imagen, un video
 * o un link. Mientras está vacío ofrece cómo llenarlo; una vez cargado
 * muestra el contenido con su pie.
 */
export function MediaBlock({ block, onChange, onDelete }: MediaBlockProps) {
  const url = urlOf(block);
  const caption = captionOf(block);

  if (!url) {
    return block.type === "image" ? (
      <CargarImagen onReady={(u) => onChange({ url: u, caption })} />
    ) : (
      <CargarEnlace onReady={(u) => onChange({ url: u, caption })} />
    );
  }

  return (
    <figure className="w-full">
      <div className="group/media relative">
        {block.type === "image" ? (
          <Imagen url={url} caption={caption} />
        ) : (
          <Enlace url={url} />
        )}

        <button
          onClick={onDelete}
          aria-label="Quitar"
          title="Quitar"
          className="tap-target absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-ink-2 backdrop-blur-sm transition hover:text-ink pointer-fine:opacity-0 pointer-fine:focus-visible:opacity-100 pointer-fine:group-hover/media:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <figcaption>
        <input
          value={caption}
          onChange={(e) => onChange({ url, caption: e.target.value })}
          placeholder="Escribí un pie (opcional)"
          aria-label="Pie"
          className="mt-1.5 w-full border-none bg-transparent text-[13px] text-ink-3 outline-none placeholder:text-ink-3/60"
        />
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Ver                                                                 */
/* ------------------------------------------------------------------ */

function Imagen({ url, caption }: { url: string; caption: string }) {
  return (
    // Se usa <img> y no el componente de imágenes de Next a propósito: las
    // direcciones vienen de Supabase o de cualquier dominio que pegue el
    // usuario, y ese componente exige declarar de antemano cada dominio
    // permitido — cosa que acá no se puede saber.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={caption || "Imagen"}
      loading="lazy"
      className="w-full rounded-xl border border-line"
    />
  );
}

function Enlace({ url }: { url: string }) {
  const info = describeEmbed(url);

  if (info?.kind === "video" && info.src) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-line bg-black/30">
        <iframe
          src={info.src}
          title={`Video de ${info.platform}`}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="panel-interactive flex items-center gap-3 rounded-xl px-3.5 py-3"
    >
      <span className="shrink-0 text-lg leading-none">{info?.icon ?? "🔗"}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink-2">
          {info?.platform ?? "Enlace"}
        </span>
        <span className="block truncate font-mono text-[11px] text-ink-3">
          {url}
        </span>
      </span>
      <ExternalLink size={14} className="shrink-0 text-ink-3" />
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Cargar                                                              */
/* ------------------------------------------------------------------ */

function CargarImagen({ onReady }: { onReady: (url: string) => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [encima, setEncima] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function subir(file: File) {
    setSubiendo(true);
    setError(null);
    try {
      const data = new FormData();
      data.set("file", file);
      onReady(await uploadImageAction(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        e.preventDefault();
        setEncima(false);
        const file = e.dataTransfer.files?.[0];
        if (file) subir(file);
      }}
      className={cn(
        "w-full rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
        encima ? "border-accent/60 bg-accent/[0.07]" : "border-line-hi"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) subir(file);
          e.target.value = "";
        }}
      />

      {subiendo ? (
        <p className="flex items-center justify-center gap-2 text-sm text-ink-2">
          <Loader2 size={14} className="animate-spin" />
          Subiendo…
        </p>
      ) : (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            className="btn-soft inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px]"
          >
            <ImagePlus size={14} />
            Elegir imagen
          </button>
          <p className="mt-2 text-[12px] text-ink-3">
            o arrastrala acá · hasta 10 MB
          </p>
        </>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <PegarUrl
        placeholder="…o pegá la dirección de una imagen"
        onReady={onReady}
      />
    </div>
  );
}

function CargarEnlace({ onReady }: { onReady: (url: string) => void }) {
  return (
    <div className="w-full rounded-xl border border-dashed border-line-hi px-4 py-5 text-center">
      <p className="text-[13px] text-ink-2">Pegá un link</p>
      <p className="mt-1 text-[12px] text-ink-3">
        YouTube y Vimeo se ven acá mismo. El resto queda como tarjeta.
      </p>
      <PegarUrl placeholder="https://…" onReady={onReady} autoFocus />
    </div>
  );
}

/** Campo para pegar una dirección, compartido por los dos bloques. */
function PegarUrl({
  placeholder,
  onReady,
  autoFocus,
}: {
  placeholder: string;
  onReady: (url: string) => void;
  autoFocus?: boolean;
}) {
  const [valor, setValor] = useState("");

  function confirmar() {
    const limpia = valor.trim();
    if (/^https?:\/\/\S+/i.test(limpia)) onReady(limpia);
  }

  return (
    <input
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          confirmar();
        }
      }}
      onBlur={confirmar}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label="Dirección"
      className="mt-3 w-full rounded-lg border border-line bg-black/20 px-3 py-1.5 text-center text-[12px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
    />
  );
}
