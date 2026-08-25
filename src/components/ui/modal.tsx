"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      // El panel queda siempre montado (nunca depende de una animación de
      // salida para desaparecer). Cerrado: pointer-events:none para que no
      // bloquee clics, y visibility:hidden para sacarlo del orden de tabulación
      // y de los lectores de pantalla. El retardo en visibility deja que se
      // vea la animación de salida antes de ocultarlo del todo.
      style={{
        pointerEvents: open ? "auto" : "none",
        visibility: open ? "visible" : "hidden",
        transition: `visibility 0s linear ${open ? "0s" : "0.15s"}`,
      }}
      aria-hidden={!open}
    >
      <motion.div
        className="absolute inset-0 bg-black/55 backdrop-blur-xl"
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      {/* La curva es la de Apple: entra rápido y frena largo, así el panel
          se siente con peso en vez de aparecer de golpe. */}
      {/* La altura se limita a la pantalla y el panel scrollea por dentro.
          Sin esto, un formulario largo en un teléfono corto se salía por
          arriba y por abajo, y no había manera de llegar al botón de
          guardar. `dvh` en vez de `vh` para que cuente la barra del
          navegador del celular, que aparece y desaparece. */}
      <motion.div
        className="surface-raised relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl p-5"
        animate={
          open
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.97, y: 10 }
        }
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-medium tracking-tight text-ink">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-ink-3 transition-colors hover:bg-white/[0.06] hover:text-ink"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
