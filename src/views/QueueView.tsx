import { useState } from 'react';
import { Reorder } from 'motion/react';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { Plus, Settings, Trash2, ListOrdered, Activity, CheckSquare, Square } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ask } from '@tauri-apps/plugin-dialog';

import { QueueItem, QueueStatus, QueuePriority } from '../types';

export function QueueView() {
  const { queueItems, reorderQueueItems, addQueueItem, updateQueueItem, removeQueueItem, updateQueueItems, removeQueueItems } = usePortfolioStore();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handleReorder = (newOrder: QueueItem[]) => {
    reorderQueueItems(newOrder);
  };

  const handleAddNew = () => {
    addQueueItem({
      reqId: `REQ_${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      client: 'NOVO CLIENTE',
      type: 'SKETCH',
      status: 'Pending',
      priority: 'Low',
      progress: 0,
      stageName: 'Não Iniciado',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'Low': return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'High': return 'border-red-500/30 hover:border-red-500/60';
      case 'Medium': return 'border-yellow-500/30 hover:border-yellow-500/60';
      case 'Low': return 'border-zinc-800 hover:border-zinc-700';
      default: return 'border-zinc-800 hover:border-zinc-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'text-zinc-400';
      case 'In Progress': return 'text-blue-400';
      case 'Completed': return 'text-emerald-400';
      default: return 'text-zinc-400';
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = () => {
    if (selectedItems.size === queueItems.length && queueItems.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(queueItems.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await ask(`Deletar ${selectedItems.size} itens?`, { title: 'Confirmar', kind: 'warning' });
    if (confirmed) {
      removeQueueItems(Array.from(selectedItems));
      setSelectedItems(new Set());
    }
  };

  const handleBulkStatus = (status: string) => {
    updateQueueItems(Array.from(selectedItems), { status: status as QueueStatus });
    setSelectedItems(new Set());
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">Fila de Comissões</h2>
          <p className="text-zinc-400 text-sm">Gerencie o status e prioridade das comissões ativas.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <Activity size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400 tracking-wide uppercase">Online</span>
          </div>
          <Button variant="primary" onClick={handleAddNew}>
            <Plus size={16} className="mr-2" />
            Nova Requisição
          </Button>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/60 text-zinc-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleAll}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              {selectedItems.size === queueItems.length && queueItems.length > 0 ? (
                <CheckSquare size={18} className="text-emerald-500" />
              ) : (
                <Square size={18} />
              )}
            </button>
            <div className="flex items-center gap-2">
              <ListOrdered size={18} />
              <h3 className="font-medium text-sm">Itens na Fila ({queueItems.length})</h3>
            </div>
          </div>
          
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-xs text-zinc-400 mr-2">{selectedItems.size} selecionados</span>
              <select
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs outline-none text-zinc-300"
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatus(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">Alterar Status...</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded border border-red-500/20 text-xs font-medium transition-colors"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            </div>
          )}
        </div>

        {queueItems.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-sm">Nenhuma comissão na fila.</p>
            <Button variant="secondary" onClick={handleAddNew} className="mt-4">
              Adicionar Primeira
            </Button>
          </div>
        ) : (
          <Reorder.Group 
            axis="y" 
            values={queueItems} 
            onReorder={handleReorder} 
            className="flex flex-col gap-3"
          >
            {queueItems.map((item) => (
              <Reorder.Item 
                key={item.id} 
                value={item} 
                className={`bg-zinc-950/50 border rounded-lg p-4 cursor-grab active:cursor-grabbing transition-colors group relative ${selectedItems.has(item.id) ? 'border-emerald-500/50 bg-emerald-900/10' : getPriorityBorder(item.priority)}`}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => toggleSelection(item.id, e)}
                        onPointerDownCapture={e => e.stopPropagation()}
                        className="p-1 text-zinc-500 hover:text-white transition-colors"
                      >
                        {selectedItems.has(item.id) ? (
                          <CheckSquare size={18} className="text-emerald-500" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                      <div className="p-2 bg-zinc-900 rounded-md border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                        <Settings size={16} className="text-zinc-400" />
                      </div>
                      <input 
                        value={item.reqId} 
                        onChange={e => updateQueueItem(item.id, { reqId: e.target.value })}
                        onPointerDownCapture={e => e.stopPropagation()}
                        className="font-mono text-sm font-medium tracking-wider bg-transparent border-none outline-none focus:ring-1 focus:ring-emerald-500/50 px-1 rounded text-white"
                        placeholder="REQ_ID"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-zinc-500">Cliente:</span>
                      <input 
                        value={item.client} 
                        onChange={e => updateQueueItem(item.id, { client: e.target.value })}
                        onPointerDownCapture={e => e.stopPropagation()}
                        className="bg-transparent border-none outline-none focus:ring-1 focus:ring-emerald-500/50 px-1 rounded text-right text-zinc-300 w-32 font-medium"
                        placeholder="Nome"
                      />
                      <button 
                        onClick={async () => {
                          const confirmed = await ask(`Deletar item ${item.reqId || item.id}?`, { title: 'Confirmar', kind: 'warning' });
                          if (confirmed) {
                            removeQueueItem(item.id);
                          }
                        }} 
                        onPointerDownCapture={e => e.stopPropagation()} 
                        className="ml-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 text-zinc-500 rounded-md transition-all"
                        title="Remover da fila"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-3">
                      <div className="text-xs text-zinc-500 mb-1">Tipo de Arte</div>
                      <input 
                        value={item.type} 
                        onChange={e => updateQueueItem(item.id, { type: e.target.value })}
                        onPointerDownCapture={e => e.stopPropagation()}
                        className="bg-transparent border-none outline-none focus:ring-1 focus:ring-emerald-500/50 px-1 -ml-1 rounded text-sm text-zinc-300 w-full"
                        placeholder="Ex: Full Body"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-xs text-zinc-500 mb-1">Status Interno</div>
                      <select 
                        value={item.status} 
                        onChange={e => updateQueueItem(item.id, { status: e.target.value as QueueStatus })}
                        onPointerDownCapture={e => e.stopPropagation()}
                        className={`bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50 w-full ${getStatusColor(item.status)}`}
                      >
                        <option value="Pending" className="text-zinc-400">Pending</option>
                        <option value="In Progress" className="text-blue-400">In Progress</option>
                        <option value="Completed" className="text-emerald-400">Completed</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-xs text-zinc-500 mb-1">Prioridade</div>
                      <select 
                        value={item.priority} 
                        onChange={e => updateQueueItem(item.id, { priority: e.target.value as QueuePriority })}
                        onPointerDownCapture={e => e.stopPropagation()}
                        className={`bg-zinc-900 border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50 w-full ${getPriorityColor(item.priority)}`}
                      >
                        <option value="Low" className="text-zinc-400">Baixa</option>
                        <option value="Medium" className="text-yellow-400">Média</option>
                        <option value="High" className="text-red-400">Alta</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-5 flex flex-col justify-center">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <input 
                          value={item.stageName} 
                          onChange={e => updateQueueItem(item.id, { stageName: e.target.value })}
                          onPointerDownCapture={e => e.stopPropagation()}
                          className="bg-transparent border-none outline-none focus:ring-1 focus:ring-emerald-500/50 px-1 -ml-1 rounded text-zinc-400"
                          placeholder="Etapa atual"
                        />
                        <div className="flex items-center text-zinc-300 font-mono">
                          <input 
                            type="number" 
                            value={item.progress} 
                            onChange={e => updateQueueItem(item.id, { progress: Number(e.target.value) })}
                            onPointerDownCapture={e => e.stopPropagation()}
                            className="bg-transparent border-none outline-none focus:ring-1 focus:ring-emerald-500/50 px-1 rounded w-12 text-right"
                            min="0" max="100"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500 ease-out" 
                          style={{ width: `${item.progress}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}

