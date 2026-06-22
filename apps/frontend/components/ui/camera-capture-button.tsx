'use client';

import { Camera } from 'lucide-react';

export function CameraCaptureButton({
  children = 'Ambil Foto',
  onClick,
}: {
  children?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white transition hover:bg-brand-700"
      onClick={onClick}
      type="button"
    >
      <Camera aria-hidden="true" size={18} strokeWidth={2.5} />
      <span>{children}</span>
    </button>
  );
}
