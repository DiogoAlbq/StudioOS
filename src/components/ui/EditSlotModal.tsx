import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, FolderOpen, Tag } from 'lucide-react';
import { Button } from './Button';
import { PortfolioItem, CategoryKey } from '../../types';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { open as dialogOpen } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';

interface EditSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PortfolioItem | null;
  category: CategoryKey;
}

export function EditSlotModal({ isOpen, onClose, item, category }: EditSlotModalProps) {
  const { updateItem, addToast } = usePortfolioStore();
  const [formData, setFormData] = useState<Partial<PortfolioItem>>({});

  useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = () => {
    updateItem(category, item.id, formData);
    addToast({ type: 'success', message: 'Slot atualizado com sucesso.' });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#0a0a0a] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Editar Slot #{item.index}</h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Media URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Media URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  name="mediaUrl"
                  value={formData.mediaUrl || ''}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                />
                <Button 
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const selected = await dialogOpen({
                      multiple: false,
                      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
                    });
                    if (selected) {
                      const path = typeof selected === 'string' ? selected : selected[0];
                      setFormData(prev => ({ ...prev, mediaUrl: convertFileSrc(path) }));
                    }
                  }}
                >
                  <FolderOpen size={14} className="mr-1" />
                  Browse
                </Button>
              </div>
            </div>

            {/* URL Externa (Social) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">External URL (Opcional)</label>
              <input 
                type="text" 
                name="url"
                value={formData.url || ''}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Tag size={14} />
                Tags
              </label>
              <input 
                type="text" 
                value={(formData.tags || []).join(', ')}
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
                  setFormData(prev => ({ ...prev, tags }));
                }}
                placeholder="render, cyber, portrait (separadas por vírgula)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all font-mono"
              />
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.tags.map((tag: string) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                      <Tag size={8} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Tipo de Mídia */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Tipo</label>
                <select 
                  name="type"
                  value={formData.type || 'image'}
                  onChange={handleChange}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all appearance-none"
                >
                  <option value="image">Imagem</option>
                  <option value="video">Vídeo</option>
                </select>
              </div>
              
              {/* Cor de Fundo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Cor de Fundo (Tailwind)</label>
                <input 
                  type="text" 
                  name="color"
                  value={formData.color || ''}
                  onChange={handleChange}
                  placeholder="ex: bg-blue-500/20"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                />
              </div>
            </div>

            {/* Layout Options */}
            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium text-zinc-300">Layout Flags</label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      name="double"
                      checked={formData.double || false}
                      onChange={handleChange}
                      className="peer appearance-none w-5 h-5 border border-zinc-700 rounded-md bg-zinc-900 checked:bg-white checked:border-white transition-all cursor-pointer"
                    />
                    <svg className="absolute w-3 h-3 text-black opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">Wide (Ocupa 2 colunas)</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      name="vertical"
                      checked={formData.vertical || false}
                      onChange={handleChange}
                      className="peer appearance-none w-5 h-5 border border-zinc-700 rounded-md bg-zinc-900 checked:bg-white checked:border-white transition-all cursor-pointer"
                    />
                    <svg className="absolute w-3 h-3 text-black opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">Vertical (Retrato)</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      name="nsfw"
                      checked={formData.nsfw || false}
                      onChange={handleChange}
                      className="peer appearance-none w-5 h-5 border border-zinc-700 rounded-md bg-zinc-900 checked:bg-red-500 checked:border-red-500 transition-all cursor-pointer"
                    />
                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">NSFW Content</span>
                </label>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>
              <Save size={16} className="mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
