'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
  title?: string;
};

type ToastInput = {
  message: string;
  tone?: ToastTone;
  title?: string;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClassNames: Record<ToastTone, string> = {
  error: 'border-rose-100 bg-rose-50 text-rose-800',
  info: 'border-blue-100 bg-brand-50 text-brand-700',
  success: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-100 bg-amber-50 text-amber-800',
};

const toneIcon: Record<ToastTone, string> = {
  error: '!',
  info: 'i',
  success: '✓',
  warning: '!',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  }, []);

  const showToast = useCallback(
    ({ message, title, tone = 'info' }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast = { id, message, title, tone };

      setToasts((currentToasts) => [toast, ...currentToasts].slice(0, 4));
      window.setTimeout(() => removeToast(id), 4200);
    },
    [removeToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      error: (message, title) => showToast({ message, title, tone: 'error' }),
      info: (message, title) => showToast({ message, title, tone: 'info' }),
      showToast,
      success: (message, title) =>
        showToast({ message, title, tone: 'success' }),
      warning: (message, title) =>
        showToast({ message, title, tone: 'warning' }),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),0.75rem)] z-[80] mx-auto flex w-full max-w-md flex-col gap-2 px-3 md:max-w-xl">
        {toasts.map((toast) => (
          <div
            className={`pointer-events-auto flex items-start gap-3 rounded-[1.25rem] border p-3 shadow-2xl backdrop-blur ${toneClassNames[toast.tone]}`}
            key={toast.id}
            role="status"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/75 text-xs font-black">
              {toneIcon[toast.tone]}
            </span>
            <div className="min-w-0 flex-1">
              {toast.title ? (
                <p className="text-sm font-black leading-5">{toast.title}</p>
              ) : null}
              <p className="text-sm font-semibold leading-5">{toast.message}</p>
            </div>
            <button
              aria-label="Tutup notifikasi"
              className="rounded-full px-2 text-sm font-black opacity-70 transition hover:bg-white/70 hover:opacity-100"
              onClick={() => removeToast(toast.id)}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast harus dipakai di dalam ToastProvider');
  }

  return context;
}
