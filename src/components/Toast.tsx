import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export const useToast = () => useContext(ToastContext);

let _nextId = 0;

const ICONS: Record<ToastType, React.ReactNode> = {
  info: <Info className="w-5 h-5" />,
  success: <CheckCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  error: <XCircle className="w-5 h-5" />,
};

const STYLES: Record<ToastType, { bg: string; icon: string; border: string }> = {
  info: { bg: 'bg-blue-50', icon: 'text-blue-500', border: 'border-blue-100' },
  success: { bg: 'bg-emerald-50', icon: 'text-emerald-500', border: 'border-emerald-100' },
  warning: { bg: 'bg-amber-50', icon: 'text-amber-500', border: 'border-amber-100' },
  error: { bg: 'bg-red-50', icon: 'text-red-500', border: 'border-red-100' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = ++_nextId;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
        <AnimatePresence>
          {toasts.map(t => {
            const s = STYLES[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className={`pointer-events-auto w-full ${s.bg} border ${s.border} rounded-2xl px-4 py-3 shadow-lg flex items-start gap-3`}
              >
                <div className={`${s.icon} flex-shrink-0 mt-0.5`}>{ICONS[t.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black text-slate-900">{t.title}</div>
                  {t.message && (
                    <div className="text-xs font-medium text-slate-500 mt-0.5">{t.message}</div>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
