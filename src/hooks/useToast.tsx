import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error';
}

const ToastContext = createContext<{ push: (message: string, kind?: Toast['kind']) => void }>({
  push: () => {},
});

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: Toast['kind'] = 'success') => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`rounded-[4px] border px-4 py-3 text-sm ${
              t.kind === 'success'
                ? 'border-[#4ADE80]/25 bg-[#1E293B] text-[#4ADE80] shadow-[0_0_16px_rgba(74,222,128,0.12)]'
                : 'border-[#F87171]/25 bg-[#1E293B] text-[#F87171] shadow-[0_0_16px_rgba(248,113,113,0.12)]'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
