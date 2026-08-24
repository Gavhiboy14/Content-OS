/**
 * QUÉ HACER CON UN LINK
 *
 * YouTube y Vimeo se pueden reproducir dentro de la página con un iframe
 * común, sin cargar scripts de terceros. Instagram y TikTok no: sus
 * embebidos reales dependen de código que ellos sirven, que tarda, a veces
 * lo bloquea el navegador y rompe la página. Esos quedan como tarjeta.
 */

export type EmbedKind = "video" | "card";

export interface EmbedInfo {
  kind: EmbedKind;
  /** La dirección a poner en el iframe. Sólo para `video`. */
  src?: string;
  /** Nombre de la plataforma, para la tarjeta. */
  platform: string;
  icon: string;
}

const PLATAFORMAS: { host: RegExp; platform: string; icon: string }[] = [
  { host: /(^|\.)instagram\.com$/i, platform: "Instagram", icon: "📸" },
  { host: /(^|\.)tiktok\.com$/i, platform: "TikTok", icon: "🎵" },
  { host: /(^|\.)(twitter|x)\.com$/i, platform: "X", icon: "𝕏" },
  { host: /(^|\.)linkedin\.com$/i, platform: "LinkedIn", icon: "💼" },
  { host: /(^|\.)facebook\.com$/i, platform: "Facebook", icon: "👥" },
  { host: /(^|\.)spotify\.com$/i, platform: "Spotify", icon: "🎧" },
  { host: /(^|\.)drive\.google\.com$/i, platform: "Drive", icon: "📁" },
];

/** Saca el id de un video de YouTube de cualquiera de sus formatos de link. */
function youtubeId(u: URL): string | null {
  if (/(^|\.)youtu\.be$/i.test(u.hostname)) {
    return u.pathname.slice(1).split("/")[0] || null;
  }
  if (!/(^|\.)youtube\.com$/i.test(u.hostname)) return null;

  const v = u.searchParams.get("v");
  if (v) return v;

  // /shorts/ID, /embed/ID y /live/ID llevan el id en la ruta.
  const m = /^\/(shorts|embed|live)\/([^/?]+)/.exec(u.pathname);
  return m ? m[2] : null;
}

function vimeoId(u: URL): string | null {
  if (!/(^|\.)vimeo\.com$/i.test(u.hostname)) return null;
  const m = /^\/(\d+)/.exec(u.pathname);
  return m ? m[1] : null;
}

export function describeEmbed(url: string): EmbedInfo | null {
  const limpia = url.trim();
  if (!limpia) return null;

  let u: URL;
  try {
    u = new URL(limpia);
  } catch {
    return null;
  }
  // Sólo http(s): un `javascript:` en un iframe sería un agujero.
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  const yt = youtubeId(u);
  if (yt) {
    return {
      kind: "video",
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}`,
      platform: "YouTube",
      icon: "▶️",
    };
  }

  const vimeo = vimeoId(u);
  if (vimeo) {
    return {
      kind: "video",
      src: `https://player.vimeo.com/video/${encodeURIComponent(vimeo)}`,
      platform: "Vimeo",
      icon: "▶️",
    };
  }

  const conocida = PLATAFORMAS.find((p) => p.host.test(u.hostname));
  return {
    kind: "card",
    platform: conocida?.platform ?? u.hostname.replace(/^www\./, ""),
    icon: conocida?.icon ?? "🔗",
  };
}
