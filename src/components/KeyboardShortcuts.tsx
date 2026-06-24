import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Command } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['Ctrl', 'Z'], description: 'Desfazer última ação em lote' },
  { keys: ['?'], description: 'Mostrar este menu de atalhos' },
  { keys: ['/'], description: 'Mostrar este menu de atalhos' },
  { keys: ['Ctrl', 'S'], description: 'Salvar / Sincronizar' },
  { keys: ['Esc'], description: 'Fechar modais / Cancelar seleção' },
];

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      
      // Implement a mock Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        // Here we could trigger a global save if needed
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/60 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Command size={18} className="text-emerald-500" />
                <h3 className="font-semibold text-white">Atalhos de Teclado</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {SHORTCUTS.map((sc, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800/30 last:border-0">
                  <span className="text-sm text-zinc-400">{sc.description}</span>
                  <div className="flex items-center gap-1">
                    {sc.keys.map((key, j) => (
                      <span key={j} className="px-2 py-1 text-xs font-mono font-medium text-zinc-300 bg-zinc-800 rounded border border-zinc-700">
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-zinc-900/30 border-t border-zinc-800 text-center">
              <p className="text-xs text-zinc-500 font-mono">Pressione ESC para fechar</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
