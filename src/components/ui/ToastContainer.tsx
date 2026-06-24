import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../../types';

export function ToastContainer() {
  const { toasts, removeToast } = usePortfolioStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

const ToastItem: React.FC<{ toast: ToastMessage, onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const icons = {
    success: <CheckCircle2 className="text-white" size={16} />,
    error: <AlertCircle className="text-white" size={16} />,
    info: <Info className="text-white" size={16} />
  };

  const bgs = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-zinc-800 text-white border border-zinc-700'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl min-w-[280px] max-w-sm ${bgs[toast.type]}`}
    >
      {icons[toast.type as keyof typeof icons]}
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={onRemove} className="text-white/70 hover:text-white transition-colors">
        <X size={14} />
      </button>
    </motion.div>
  );
}
