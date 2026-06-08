import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Sparkles, Info, X } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';

export const ToastStack = () => {
  const { toasts, removeToast } = useUIStore();

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-green-400 w-5 h-5 shrink-0" />;
      case 'error':
        return <AlertCircle className="text-red-400 w-5 h-5 shrink-0" />;
      case 'xp':
        return <Sparkles className="text-[var(--accent-xp)] w-5 h-5 shrink-0 animate-pulse" />;
      case 'info':
      default:
        return <Info className="text-blue-400 w-5 h-5 shrink-0" />;
    }
  };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return 'border-green-500/20 bg-green-950/20 shadow-[0_8px_32px_rgba(34,197,94,0.15)]';
      case 'error':
        return 'border-red-500/20 bg-red-950/20 shadow-[0_8px_32px_rgba(239,68,68,0.15)]';
      case 'xp':
        return 'border-[var(--accent-xp)]/20 bg-[var(--accent-xp-glow)] shadow-[0_8px_32px_rgba(181,255,45,0.15)]';
      case 'info':
      default:
        return 'border-blue-500/20 bg-blue-950/20 shadow-[0_8px_32px_rgba(59,130,246,0.15)]';
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 flex flex-col gap-2.5 pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            layout
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl border backdrop-blur-md text-[var(--text-primary)] font-body text-sm font-semibold tracking-wide ${getTypeStyles(
              toast.type
            )}`}
          >
            <div className="flex items-center gap-3">
              {getIcon(toast.type)}
              <span className="leading-snug">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
