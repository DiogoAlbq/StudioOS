import { useState, useMemo, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { RefreshCw, Search, Image as ImageIcon, Video, CloudOff, Loader2, ArrowUpCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { triggerWorkflow } from '../lib/github';
import { getSiteSyncStatus, onSiteSyncStatusChange, forceSyncNow } from '../lib/siteSync';
import { CategoryKey, PortfolioItem } from '../types';

function NavLink({ label, active, onClick }: { label: string, active?: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-medium transition-colors ${
        active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { systemState, updateExchangeRate, activeView, setActiveView, addToast, artItems, videoItems, nsfwItems, heroBgImages, socialItems, setActiveCategory } = usePortfolioStore();
  const settingsStore = useSettingsStore();
  const [isDeploying, setIsDeploying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [syncStatus, setSyncStatus] = useState(getSiteSyncStatus());
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    check().then(r => { if (r?.available) setHasUpdate(true); }).catch(() => {});
  }, []);

  useEffect(() => {
    return onSiteSyncStatusChange(setSyncStatus);
  }, []);

  const allItems = useMemo(() => {
    const mapItems = (items: PortfolioItem[], category: CategoryKey, label: string) => 
      items.map(item => ({ ...item, category, categoryLabel: label }));
      
    return [
      ...mapItems(artItems, 'art', 'Artes'),
      ...mapItems(videoItems, 'video', 'Vídeos'),
      ...mapItems(nsfwItems, 'nsfw', 'NSFW'),
      ...mapItems(heroBgImages, 'hero', 'Hero'),
      ...mapItems(socialItems, 'social', 'Social')
    ];
  }, [artItems, videoItems, nsfwItems, heroBgImages, socialItems]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allItems.filter(item => 
      (item.mediaUrl && item.mediaUrl.toLowerCase().includes(query)) ||
      (item.url && item.url.toLowerCase().includes(query)) ||
      item.id.toLowerCase().includes(query)
    ).slice(0, 5); // Limit results
  }, [searchQuery, allItems]);

  const handleRefreshRate = () => {
    updateExchangeRate(systemState.exchangeRate + (Math.random() * 0.1 - 0.05));
    addToast({ type: 'info', message: 'Taxa de câmbio atualizada.' });
  };

  const handleDeploy = async () => {
    const { githubPat, githubUsername, githubRepo, githubWorkflows } = settingsStore;
    if (!githubPat || !githubUsername || !githubRepo) {
      addToast({ type: 'error', message: 'Configure GitHub em Settings antes de fazer deploy.' });
      return;
    }
    const workflowId = githubWorkflows[0]?.id;
    if (!workflowId) {
      addToast({ type: 'error', message: 'Nenhum workflow encontrado.' });
      return;
    }
    setIsDeploying(true);
    addToast({ type: 'info', message: 'Disparando GitHub Actions...' });
    try {
      const result = await triggerWorkflow(githubPat, githubUsername, githubRepo, workflowId, 'main');
      if (result.success) {
        addToast({ type: 'success', message: 'Deploy iniciado com sucesso!' });
        settingsStore.fetchWorkflowRuns(workflowId);
      } else {
        addToast({ type: 'error', message: result.message });
      }
    } catch (err) {
      addToast({ type: 'error', message: `Falha no deploy: ${err}` });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-zinc-800">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-zinc-800/60">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex items-center space-x-2 mr-8">
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                <div className="w-2 h-2 bg-black rounded-full" />
              </div>
              <span className="font-semibold text-white tracking-tight">StudioOS</span>
              <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-[10px] font-mono text-zinc-400 ml-2">v2</span>
              {hasUpdate && (
                <button
                  onClick={() => setActiveView("settings")}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 ml-1 hover:bg-emerald-500/20 transition-colors"
                  title="Update disponivel"
                >
                  <ArrowUpCircle size={10} />
                  <span>UPDATE</span>
                </button>
              )}
            </div>

            {/* Main Nav */}
            <nav className="hidden md:flex items-center space-x-6">
              <NavLink label="Overview" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
              <NavLink label="Galerias" active={activeView === 'galerias'} onClick={() => setActiveView('galerias')} />
              <NavLink label="Finanças" active={activeView === 'cambio'} onClick={() => setActiveView('cambio')} />
              <NavLink label="Queue" active={activeView === 'queue'} onClick={() => setActiveView('queue')} />
              <NavLink label="Clientes" active={activeView === 'clients'} onClick={() => setActiveView('clients')} />
              <NavLink label="Logs" active={activeView === 'logs'} onClick={() => setActiveView('logs')} />
              <NavLink label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative hidden lg:block">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Buscar assets..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 w-64 transition-all"
                />
              </div>
              
              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery && (
                <div className="absolute top-full mt-2 w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50">
                  {searchResults.length > 0 ? (
                    <div className="py-2">
                      <div className="px-3 py-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Resultados</div>
                      {searchResults.map(item => (
                        <div 
                          key={item.id} 
                          className="px-3 py-2 hover:bg-zinc-900 cursor-pointer flex items-center gap-3 transition-colors"
                          onClick={() => {
                            setActiveView('galerias');
                            setActiveCategory(item.category);
                            setSearchQuery('');
                          }}
                        >
                          <div className="w-8 h-8 rounded bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {item.mediaUrl ? (
                              <img src={item.mediaUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              item.type === 'video' ? <Video size={12} className="text-zinc-500" /> : <ImageIcon size={12} className="text-zinc-500" />
                            )}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-xs text-white truncate">{item.mediaUrl || item.url || `Slot Vazio #${item.index}`}</span>
                            <span className="text-[10px] text-zinc-500 flex items-center">
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 bg-zinc-600 ${(item.color || 'bg-zinc-600').replace('bg-', 'bg-').split('/')[0]}`} />
                              {item.categoryLabel}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-xs text-zinc-500">
                      Nenhum asset encontrado para "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-zinc-800 hidden lg:block" />

            {/* Exchange Rate */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-md hover:bg-zinc-900 transition-colors cursor-pointer group" onClick={handleRefreshRate}>
              <span className="text-xs text-zinc-500 font-medium">USD/BRL</span>
              <span className="text-xs font-mono font-medium text-zinc-300 group-hover:text-white transition-colors">
                R$ {systemState.exchangeRate.toFixed(2)}
              </span>
              <RefreshCw size={12} className="text-zinc-600 group-hover:text-zinc-400" />
            </div>

            <div className="h-4 w-px bg-zinc-800" />

            <div className="flex items-center space-x-2">
              {syncStatus.isDirty && !syncStatus.isSyncing && (
                <button
                  onClick={forceSyncNow}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                  title="Sync pendente - clique para sincronizar agora"
                >
                  <CloudOff size={12} />
                  <span className="hidden sm:inline">SYNC</span>
                </button>
              )}
              {syncStatus.isSyncing && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20">
                  <Loader2 size={12} className="animate-spin" />
                  <span className="hidden sm:inline">SYNCING</span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => addToast({ type: 'success', message: 'Tudo OK' })}>
                Preview Local
              </Button>
              <Button isLoading={isDeploying} variant="primary" size="sm" onClick={handleDeploy}>
                Deploy
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6">
        {children}
      </main>
    </div>
  );
}


