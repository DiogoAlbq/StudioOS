import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Client, ClientCommission } from '../types';
import { Users, Plus, Mail, MessageCircle, Phone, Edit, Trash2, X, History } from 'lucide-react';

export function ClientsView() {
  const { t } = useTranslation();
  const addToast = usePortfolioStore((s) => s.addToast);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientHistory, setClientHistory] = useState<{ commissions: ClientCommission[]; stats: { total_commissions: number; total_spent_usd: number; completed: number; in_progress: number; pending: number } } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    discord: '',
    whatsapp: '',
    notes: '',
  });

  const loadClients = async () => {
    try {
      setLoading(true);
      const result = await invoke<Client[]>('list_clients_cmd');
      setClients(result);
    } catch (err) {
      addToast({ type: 'error', message: `Failed to load clients: ${err}` });
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (clientId: string) => {
    try {
      const result = await invoke<{ commissions: ClientCommission[]; stats: { total_commissions: number; total_spent_usd: number; completed: number; in_progress: number; pending: number } }>('get_client_history_cmd', { clientId });
      setClientHistory(result);
    } catch (err) {
      addToast({ type: 'error', message: `Failed to load history: ${err}` });
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      addToast({ type: 'error', message: 'Name is required' });
      return;
    }

    try {
      if (editingClient) {
        await invoke('update_client_cmd', {
          clientId: editingClient.id,
          name: formData.name,
          email: formData.email || null,
          discord: formData.discord || null,
          whatsapp: formData.whatsapp || null,
          notes: formData.notes || null,
        });
        addToast({ type: 'success', message: 'Client updated successfully' });
      } else {
        await invoke('create_client_cmd', {
          name: formData.name,
          email: formData.email || null,
          discord: formData.discord || null,
          whatsapp: formData.whatsapp || null,
          notes: formData.notes || null,
        });
        addToast({ type: 'success', message: 'Client created successfully' });
      }

      setShowModal(false);
      setEditingClient(null);
      setFormData({ name: '', email: '', discord: '', whatsapp: '', notes: '' });
      loadClients();
    } catch (err) {
      addToast({ type: 'error', message: `Failed to save client: ${err}` });
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      await invoke('delete_client_cmd', { clientId });
      addToast({ type: 'success', message: 'Client deleted' });
      loadClients();
      if (selectedClient?.id === clientId) {
        setSelectedClient(null);
        setClientHistory(null);
      }
    } catch (err) {
      addToast({ type: 'error', message: `Failed to delete client: ${err}` });
    }
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      discord: client.discord || '',
      whatsapp: client.whatsapp || '',
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const openNew = () => {
    setEditingClient(null);
    setFormData({ name: '', email: '', discord: '', whatsapp: '', notes: '' });
    setShowModal(true);
  };

  const selectClient = async (client: Client) => {
    setSelectedClient(client);
    await loadHistory(client.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">{t('clients.title')}</h1>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          {t('clients.addClient')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="text-zinc-400 text-center py-8">{t('common.loading')}</div>
          ) : clients.length === 0 ? (
            <div className="text-zinc-500 text-center py-8">{t('clients.noClients')}</div>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                onClick={() => selectClient(client)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedClient?.id === client.id
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <span className="text-violet-400 font-bold text-sm">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{client.name}</p>
                      <p className="text-zinc-500 text-xs">
                        {client.totalCommissions} {t('clients.totalCommissions').toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(client); }}
                      className="p-1 text-zinc-400 hover:text-white"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                      className="p-1 text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedClient ? (
            <div className="space-y-6">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">{selectedClient.name}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {selectedClient.email && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Mail className="w-4 h-4" />
                      <span>{selectedClient.email}</span>
                    </div>
                  )}
                  {selectedClient.discord && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <MessageCircle className="w-4 h-4" />
                      <span>{selectedClient.discord}</span>
                    </div>
                  )}
                  {selectedClient.whatsapp && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Phone className="w-4 h-4" />
                      <span>{selectedClient.whatsapp}</span>
                    </div>
                  )}
                </div>
                {selectedClient.notes && (
                  <p className="mt-4 text-zinc-400 text-sm">{selectedClient.notes}</p>
                )}
              </div>

              {clientHistory && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-violet-400" />
                    <h3 className="text-lg font-bold text-white">{t('clients.history')}</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-white">{clientHistory.stats.total_commissions}</p>
                      <p className="text-xs text-zinc-400">{t('clients.totalCommissions')}</p>
                    </div>
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-400">${clientHistory.stats.total_spent_usd.toFixed(0)}</p>
                      <p className="text-xs text-zinc-400">{t('clients.totalSpent')}</p>
                    </div>
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-400">{clientHistory.stats.in_progress}</p>
                      <p className="text-xs text-zinc-400">{t('dashboard.inProgress')}</p>
                    </div>
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-400">{clientHistory.stats.completed}</p>
                      <p className="text-xs text-zinc-400">{t('dashboard.completed')}</p>
                    </div>
                  </div>
                  {clientHistory.commissions.length > 0 ? (
                    <div className="space-y-2">
                      {clientHistory.commissions.map((comm) => (
                        <div key={comm.id} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant={comm.status === 'Completed' ? 'success' : comm.status === 'In Progress' ? 'warning' : 'default'}>
                              {comm.status}
                            </Badge>
                            <span className="text-white text-sm">{comm.reqId}</span>
                            <span className="text-zinc-400 text-sm">{comm.artType}</span>
                          </div>
                          {comm.priceUsd && (
                            <span className="text-emerald-400 font-medium">${comm.priceUsd}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-center py-4">No commissions yet</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-zinc-500">
              <p>Select a client to view details</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">
                {editingClient ? t('clients.editClient') : t('clients.addClient')}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">{t('clients.name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">{t('clients.email')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">{t('clients.discord')}</label>
                <input
                  type="text"
                  value={formData.discord}
                  onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">{t('clients.whatsapp')}</label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">{t('clients.notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-violet-500 h-20 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmit}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
