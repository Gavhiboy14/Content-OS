"use client";

import { useMarkActivePageFromContent } from "@/components/active-page-context";

/** No renderiza nada: sólo le avisa al sidebar qué página está activa. */
export function MarkActivePage({ pageId }: { pageId: string }) {
  useMarkActivePageFromContent(pageId);
  return null;
}
