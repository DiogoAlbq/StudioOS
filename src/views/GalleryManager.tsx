import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EditSlotModal } from '../components/ui/EditSlotModal';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { CategoryKey, PortfolioItem } from '../types';
import { fetchSiteData } from '../lib/github';
import { Plus, Image as ImageIcon, Video, Trash2, Edit2, ExternalLink, ChevronLeft, ChevronRight, RefreshCw, Tag } from 'lucide-react';
import { ask } from '@tauri-apps/plugin-dialog';

const CATEGORY_TABS: { id: CategoryKey; label: string }[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'social', label: 'Social' },
  { id: 'art', label: 'Artes' },
  { id: 'video', label: 'Vídeos' },
  { id: 'nsfw', label: 'NSFW' },
];

const PortfolioCard: React.FC<{ item: PortfolioItem, category: CategoryKey, onEdit: (item: PortfolioItem) => void, isSelected: boolean, onToggleSelect: (id: string) => void }> = ({ item, category, onEdit, isSelected, onToggleSelect }) => {
  const isFilled = !!item.mediaUrl;
  const { deleteItem, moveItem, addToast } = usePortfolioStore();

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(item);
  };

  const handleMoveLeft = (e: React.MouseEvent) => { e.stopPropagation(); moveItem(category, item.id, 'left'); };
  const handleMoveRight = (e: React.MouseEvent) => { e.stopPropagation(); moveItem(category, item.id, 'right'); };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await ask(`Deletar item ${item.title || 'Sem título'}?`, { title: 'Confirmar', kind: 'warning' });
    if (confirmed) {
      deleteItem(category, item.id);
      addToast({ type: 'success', message: 'Slot removido com sucesso.' });
    }
  };
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => onToggleSelect(item.id)}
      className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer ${isSelected ? 'ring-2 ring-emerald-500 border-transparent' : isFilled ? 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/20' : 'border-zinc-800/50 border-dashed hover:border-zinc-700 bg-transparent'}`}
    >
      {/* Checkbox for selection */}
      <div className={`absolute top-3 right-3 z-10 w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-black/40 border-white/30 opacity-0 group-hover:opacity-100'}`}>
        {isSelected && <svg viewBox="0 0 14 10" fill="none" className="w-3 h-3 text-white"><path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>

      {/* Media Area */}
      <div className={`relative aspect-video w-full overflow-hidden ${isFilled ? 'bg-black' : 'bg-zinc-900/30'}`}>
        {isFilled ? (
          <img 
            src={item.mediaUrl} 
            alt={`Media ${item.index}`}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
             {item.type === 'video' ? <Video size={20} className="mb-2" /> : <ImageIcon size={20} className="mb-2" />}
             <span className="text-xs font-medium">Vazio</span>
          </div>
        )}
        
        {/* Hover Actions Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          <button onClick={handleMoveLeft} className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md text-white transition-colors cursor-pointer">
            <ChevronLeft size={16} />
          </button>
          <button onClick={handleEdit} className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md text-white transition-colors cursor-pointer">
            <Edit2 size={16} />
          </button>
          <button onClick={handleDelete} className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full backdrop-blur-md text-red-200 transition-colors cursor-pointer">
            <Trash2 size={16} />
          </button>
          <button onClick={handleMoveRight} className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md text-white transition-colors cursor-pointer">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Index Badge */}
        <div className="absolute top-3 left-3 flex items-center justify-center w-6 h-6 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300">
          {item.index}
        </div>
      </div>

      {/* Details Area */}
      <div className="p-4 flex flex-col gap-3">
        {item.title && (
          <div className="text-sm font-medium text-white truncate" title={item.title}>
            {item.title}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {isFilled ? <Badge variant="default">Preenchido</Badge> : <Badge variant="warning">Vazio</Badge>}
          {item.double && <Badge variant="purple">Wide</Badge>}
          {item.vertical && <Badge variant="purple">Vertical</Badge>}
          {item.type === 'video' && <Badge variant="orange">Video</Badge>}
          {item.pricingTier && item.pricingTier !== 'none' && <Badge variant="emerald">{item.pricingTier}</Badge>}
        </div>
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {item.tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                <Tag size={8} />
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {item.url && (
          <div className="flex items-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer group/link">
            <ExternalLink size={12} className="mr-1.5 flex-shrink-0 group-hover/link:text-zinc-300" />
            <span className="truncate">{item.url}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function GalleryManager() {
  const { activeCategory, setActiveCategory, artItems, videoItems, nsfwItems, heroBgImages, socialItems, addItem, addToast, deleteItems, moveItemsToCategory, updateItem, undo, history, syncFromSite } = usePortfolioStore();
  const settings = useSettingsStore();
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkRename, setShowBulkRename] = useState(false);
  const [renamePrefix, setRenamePrefix] = useState('');
  const [renameSuffix, setRenameSuffix] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        
        // Use history array length to check if we can undo
        const state = usePortfolioStore.getState();
        if (state.history.length > 0) {
          undo();
          addToast({ type: 'info', message: 'Ação revertida (Ctrl+Z).' });
          setSelectedIds([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, addToast]);

  const handleCategoryChange = (id: string) => {
    setActiveCategory(id as CategoryKey);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    const confirmed = await ask(`Deletar ${selectedIds.length} itens?`, { title: 'Confirmar', kind: 'warning' });
    if (confirmed) {
      deleteItems(activeCategory, selectedIds);
      addToast({ type: 'success', message: `${selectedIds.length} itens removidos.` });
      setSelectedIds([]);
    }
  };

  const handleBulkMove = (toCategory: CategoryKey) => {
    moveItemsToCategory(activeCategory, toCategory, selectedIds);
    addToast({ type: 'success', message: `${selectedIds.length} itens movidos para ${CATEGORY_TABS.find(t => t.id === toCategory)?.label}.` });
    setSelectedIds([]);
  };

  const getItemsForCategory = () => {
    switch (activeCategory) {
      case 'art': return artItems;
      case 'video': return videoItems;
      case 'nsfw': return nsfwItems;
      case 'hero': return heroBgImages;
      case 'social': return socialItems;
      default: return [];
    }
  };

  const items = getItemsForCategory();

  const handleBulkPricingTier = (tier: string) => {
    selectedIds.forEach(id => {
      updateItem(activeCategory, id, { pricingTier: tier as PortfolioItem['pricingTier'] });
    });
    addToast({ type: 'success', message: `Tier de preço aplicado a ${selectedIds.length} itens.` });
    setSelectedIds([]);
  };

  const handleBulkRename = () => {
    selectedIds.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) {
        updateItem(activeCategory, id, { 
          title: `${renamePrefix}${item.title || ''}${renameSuffix}` 
        });
      }
    });
    addToast({ type: 'success', message: 'Itens renomeados com sucesso.' });
    setShowBulkRename(false);
    setRenamePrefix('');
    setRenameSuffix('');
    setSelectedIds([]);
  };

  const convertToWebP = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/webp', 0.8));
      };
      img.onerror = () => reject('Load error');
      img.src = url;
    });
  };

  const handleBulkWebP = async () => {
    setIsConverting(true);
    addToast({ type: 'info', message: 'Convertendo imagens selecionadas...' });
    let converted = 0;
    
    for (const id of selectedIds) {
      const item = items.find(i => i.id === id);
      if (item && item.mediaUrl && item.type === 'image') {
        try {
          const webpUrl = await convertToWebP(item.mediaUrl);
          updateItem(activeCategory, id, { mediaUrl: webpUrl });
          converted++;
        } catch (e) {
          console.error('Failed to convert', item.mediaUrl);
        }
      }
    }
    
    setIsConverting(false);
    addToast({ type: 'success', message: `${converted} imagens convertidas para WebP.` });
  };

  const handleAddItem = () => {
    addItem(activeCategory);
    addToast({ type: 'success', message: 'Novo slot adicionado.' });
  };

  const handleSyncFromSite = async () => {
    const pat = settings.githubPat;
    const owner = settings.githubUsername;
    const repo = settings.githubRepo;
    if (!pat || !owner || !repo) {
      addToast({ type: 'error', message: 'Configure o GitHub nas Settings primeiro.' });
      return;
    }

    setIsSyncing(true);
    try {
      const siteData = await fetchSiteData(pat, owner, repo);
      if (siteData.portfolio && siteData.portfolio.items) {
        const items = siteData.portfolio.items;
        syncFromSite(items);
        addToast({ type: 'success', message: `${items.length} itens sincronizados do site.` });
      } else {
        addToast({ type: 'info', message: 'Nenhum item encontrado no site.' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast({ type: 'error', message: `Falha ao sincronizar: ${msg}` });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">Galerias</h2>
          <p className="text-zinc-400 text-sm">Gerencie e organize os assets do portfólio de forma visual.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="secondary" onClick={handleSyncFromSite} isLoading={isSyncing}>
             <RefreshCw size={16} className="mr-2" />
             Sync do Site
           </Button>
           <Button variant="secondary" onClick={handleAddItem}>
             <Plus size={16} className="mr-2" />
             Adicionar Mídia
           </Button>
        </div>
      </div>

      <Tabs 
        tabs={CATEGORY_TABS} 
        activeTab={activeCategory} 
        onChange={handleCategoryChange} 
        className="mb-8"
      />

      <AnimatePresence mode="popLayout">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {items.length > 0 ? (
            items.map((item) => (
              <PortfolioCard 
                key={item.id} 
                item={item} 
                category={activeCategory} 
                onEdit={setEditingItem} 
                isSelected={selectedIds.includes(item.id)}
                onToggleSelect={toggleSelect}
              />
            ))
          ) : (
            <div className="col-span-full py-24 flex flex-col items-center justify-center border border-dashed border-zinc-800/80 rounded-xl bg-zinc-900/10">
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
                <ImageIcon size={20} className="text-zinc-500" />
              </div>
              <h3 className="text-sm font-medium text-zinc-300">Nenhum item encontrado</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-5">Esta galeria está vazia no momento.</p>
              <Button variant="secondary" size="sm" onClick={handleAddItem}>
                <Plus size={14} className="mr-1.5" />
                Criar Primeiro Slot
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <EditSlotModal 
        isOpen={!!editingItem} 
        onClose={() => setEditingItem(null)} 
        item={editingItem}
        category={activeCategory}
      />

      {/* Floating Bulk Actions Toolbar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-zinc-900 border border-zinc-700 p-2 pl-4 rounded-full shadow-2xl shadow-black/50 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 border-r border-zinc-700 pr-4">
              <span className="flex items-center justify-center w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                {selectedIds.length}
              </span>
              <span className="text-sm font-medium text-white">selecionados</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative group/dropdown">
                <Button variant="secondary" size="sm" className="rounded-full px-4">
                  Mover para...
                </Button>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black border border-zinc-800 rounded-lg p-1 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all whitespace-nowrap min-w-[120px] shadow-xl">
                  {CATEGORY_TABS.filter(t => t.id !== activeCategory).map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => handleBulkMove(tab.id)}
                      className="block w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-md transition-colors"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              
                <div className="relative group/dropdown">
                  <Button variant="secondary" size="sm" className="rounded-full px-4 border border-zinc-700">
                    Definir Tier...
                  </Button>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black border border-zinc-800 rounded-lg p-1 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all whitespace-nowrap min-w-[120px] shadow-xl">
                    {['halfBody', 'fullBody', 'icon', 'custom', 'none'].map(tier => (
                      <button 
                        key={tier}
                        onClick={() => handleBulkPricingTier(tier)}
                        className="block w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-md transition-colors capitalize"
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              
              <Button variant="danger" size="sm" className="rounded-full px-4 border border-red-500/20 hover:border-red-500/50" onClick={handleBulkDelete}>
                <Trash2 size={14} className="mr-1.5" />
                Excluir
              </Button>
              
              {showBulkRename ? (
                <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-full border border-zinc-700 ml-2">
                  <input
                    type="text"
                    placeholder="Prefixo"
                    value={renamePrefix}
                    onChange={e => setRenamePrefix(e.target.value)}
                    className="w-20 bg-transparent text-xs text-white px-2 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Sufixo"
                    value={renameSuffix}
                    onChange={e => setRenameSuffix(e.target.value)}
                    className="w-20 bg-transparent text-xs text-white px-2 border-l border-zinc-800 focus:outline-none"
                  />
                  <Button variant="primary" size="sm" className="h-6 text-[10px] px-2 rounded-full" onClick={handleBulkRename}>
                    Aplicar
                  </Button>
                  <button onClick={() => setShowBulkRename(false)} className="px-2 text-zinc-500 hover:text-white">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              ) : (
                <>
                  <Button variant="secondary" size="sm" className="rounded-full px-4 ml-2" onClick={() => setShowBulkRename(true)}>
                    <Edit2 size={14} className="mr-1.5" />
                    Renomear
                  </Button>
                  
                  <Button variant="secondary" size="sm" className="rounded-full px-4" onClick={handleBulkWebP} isLoading={isConverting}>
                    <ImageIcon size={14} className="mr-1.5" />
                    Para WebP
                  </Button>
                </>
              )}
              
              <button onClick={() => { setSelectedIds([]); setShowBulkRename(false); }} className="p-2 ml-2 text-zinc-400 hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
