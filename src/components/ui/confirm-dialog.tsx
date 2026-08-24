"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setSubmitting(false);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-5 text-sm leading-relaxed text-ink-2">{description}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-xl px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="rounded-xl bg-red-500/90 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
        >
          {submitting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </Modal>
  );
}
