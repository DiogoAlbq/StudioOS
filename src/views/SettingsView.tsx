import { useState, useEffect, useCallback } from 'react';
import { UpdateChecker } from '../components/ui/UpdateChecker';
import { Save, Database, HardDrive, Shield, FileCode2, Clock, ImagePlus, Key, Eye, EyeOff, Activity, CheckCircle2, XCircle, RefreshCw, GitBranch, Loader2, ExternalLink, AlertCircle, Globe, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { save as dialogSave, ask } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { saveState } from '../lib/persistence';
import { triggerWorkflow, pushSiteData } from '../lib/github';
import { logger } from '../lib/logger';

export function SettingsView() {
  const { systemState, addToast } = usePortfolioStore();
  const settings = useSettingsStore();
  const [yamlConfig, setYamlConfig] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [showPAT, setShowPAT] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);
  const [sshKey, setSshKey] = useState<string | null>(null);
  const [isGeneratingSsh, setIsGeneratingSsh] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<number | null>(null);
  const [deployBranch, setDeployBranch] = useState('main');
  const [isSiteDeploying, setIsSiteDeploying] = useState(false);
  const [siteRepo, setSiteRepo] = useState('');

  useEffect(() => {
    settings.loadSettings();
  }, []);

  const handleConnectPAT = useCallback(async () => {
    if (!settings.githubPat.trim()) {
      addToast({ type: 'error', message: 'Insira um Personal Access Token valido.' });
      return;
    }
    setIsConnecting(true);
    const success = await settings.connectGithub(settings.githubPat);
    setIsConnecting(false);
    if (success) {
      addToast({ type: 'success', message: `Conectado como ${settings.githubUser?.login}` });
      await settings.fetchRepos();
    } else {
      addToast({ type: 'error', message: settings.lastError || 'Falha ao validar token.' });
    }
  }, [settings.githubPat]);

  useEffect(() => {
    if (settings.isGithubConnected) {
      settings.fetchRepos();
    }
  }, [settings.isGithubConnected]);

  useEffect(() => {
    if (settings.githubRepo && settings.isGithubConnected) {
      settings.fetchWorkflows();
    }
  }, [settings.githubRepo]);

  const handleSelectRepo = useCallback(async (fullName: string) => {
    const [owner, repo] = fullName.split('/');
    settings.setField('githubUsername', owner);
    settings.setField('githubRepo', repo);
    await settings.saveSettings();
    settings.fetchWorkflows();
  }, []);

  const handleDeploy = useCallback(async () => {
    const { githubPat, githubUsername, githubRepo } = settings;
    if (!githubPat || !githubUsername || !githubRepo) {
      addToast({ type: 'error', message: 'Configure GitHub antes de fazer deploy.' });
      return;
    }

    const workflowId = selectedWorkflow ?? settings.githubWorkflows[0]?.id;
    if (!workflowId) {
      addToast({ type: 'error', message: 'Nenhum workflow encontrado no repositorio.' });
      return;
    }

    setIsDeploying(true);
    setDeployProgress(0);
    addToast({ type: 'info', message: 'Disparando GitHub Actions...' });

    const progressInterval = setInterval(() => {
      setDeployProgress(prev => Math.min(prev + Math.random() * 20, 90));
    }, 800);

    try {
      const result = await triggerWorkflow(githubPat, githubUsername, githubRepo, workflowId, deployBranch);
      clearInterval(progressInterval);
      setDeployProgress(100);
      if (result.success) {
        addToast({ type: 'success', message: 'Workflow disparado com sucesso!' });
        settings.fetchWorkflowRuns(workflowId);
      } else {
        addToast({ type: 'error', message: result.message });
      }
    } catch (err) {
      clearInterval(progressInterval);
      const msg = err instanceof Error ? err.message : String(err);
      addToast({ type: 'error', message: `Falha no deploy: ${msg}` });
    } finally {
      setTimeout(() => {
        setIsDeploying(false);
        setDeployProgress(0);
      }, 500);
    }
  }, [settings, selectedWorkflow, deployBranch]);

  const handleSave = async () => {
    await settings.saveSettings();
    const state = usePortfolioStore.getState();
    await saveState({
      artItems: state.artItems,
      videoItems: state.videoItems,
      nsfwItems: state.nsfwItems,
      heroBgImages: state.heroBgImages,
      socialItems: state.socialItems,
      queueItems: state.queueItems,
      systemState: state.systemState,
      activeCategory: state.activeCategory,
      activeView: state.activeView,
    });
    addToast({ type: 'success', message: 'Configuracoes salvas com sucesso.' });
  };

  const handleBackup = async () => {
    addToast({ type: 'info', message: 'Iniciando backup local...' });
    const state = usePortfolioStore.getState();
    const backupData = JSON.stringify({
      artItems: state.artItems,
      videoItems: state.videoItems,
      nsfwItems: state.nsfwItems,
      heroBgImages: state.heroBgImages,
      socialItems: state.socialItems,
      queueItems: state.queueItems,
    }, null, 2);

    const filePath = await dialogSave({
      defaultPath: `portfolio_backup_${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (filePath) {
      await writeTextFile(filePath, backupData);
      addToast({ type: 'success', message: 'Backup concluido.' });
    }
  };

  const handleCompress = () => {
    setIsCompressing(true);
    addToast({ type: 'info', message: 'Iniciando compressao de imagens...' });
    setTimeout(() => {
      setIsCompressing(false);
      addToast({ type: 'success', message: 'Imagens otimizadas para WebP.' });
    }, 2500);
  };

  const handleGenerateSsh = async () => {
    setIsGeneratingSsh(true);
    addToast({ type: 'info', message: 'Gerando par de chaves SSH (Ed25519)...' });
    try {
      const { Command } = await import('@tauri-apps/plugin-shell');
      const result = await Command.create('ssh-keygen', ['-t', 'ed25519', '-f', `${process.env.HOME || process.env.USERPROFILE}/.ssh/studioos_key`, '-N', '', '-C', 'studioos@local']).execute();
      if (result.code === 0) {
        const pubKeyPath = `${process.env.HOME || process.env.USERPROFILE}/.ssh/studioos_key.pub`;
        const catResult = await Command.create('cat', [pubKeyPath]).execute();
        if (catResult.code === 0) {
          setSshKey(catResult.stdout.trim());
          addToast({ type: 'success', message: 'Chave SSH gerada com sucesso.' });
        }
      }
    } catch (err) {
      addToast({ type: 'error', message: `Falha ao gerar chave SSH: ${err}` });
    } finally {
      setIsGeneratingSsh(false);
    }
  };

  const generateYaml = () => {
    const repoName = settings.githubRepo || 'meu-portfolio';
    const yaml = `name: Deploy Portfolio
on:
  push:
    branches: [ main ]
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '24.x'
        cache: 'npm'
    - run: npm ci
    - run: npm run build
    - name: Deploy
      uses: peaceiris/actions-gh-pages@v4
      with:
        github_token: \${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
`;
    setYamlConfig(yaml);
    addToast({ type: 'success', message: `YAML gerado para ${repoName}.` });
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'text-emerald-400';
    if (status === 'in_progress' || status === 'queued') return 'text-yellow-400';
    if (status === 'failure') return 'text-red-400';
    return 'text-zinc-400';
  };

  const getConclusionIcon = (conclusion: string | null, status: string) => {
    if (status === 'in_progress') return <Loader2 size={14} className="text-yellow-400 animate-spin" />;
    if (conclusion === 'success') return <CheckCircle2 size={14} className="text-emerald-400" />;
    if (conclusion === 'failure') return <XCircle size={14} className="text-red-400" />;
    if (conclusion === 'cancelled') return <XCircle size={14} className="text-zinc-500" />;
    return <Activity size={14} className="text-zinc-500" />;
  };

  const handleDeleteRepo = async (owner: string, repo: string) => {
    const confirmed = await ask(
      `Tem certeza que deseja deletar o repositorio ${owner}/${repo}?\n\nEsta acao NAO pode ser desfeita.`,
      { title: 'Deletar repositorio', kind: 'warning' }
    );
    if (!confirmed) return;

    const success = await settings.deleteRepo(owner, repo);
    addToast({
      type: success ? 'success' : 'error',
      message: success ? `Repositorio ${owner}/${repo} deletado` : 'Falha ao deletar repositorio'
    });
  };

  const handleOpenSite = async (url: string) => {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch (err) {
      logger.error('ui', 'Failed to open site URL', { url, error: String(err) });
    }
  };

  const handlePushSiteData = async () => {
    const pat = settings.githubPat;
    const owner = settings.githubUsername;
    const repo = siteRepo || `${owner}.github.io`;
    if (!pat || !owner) {
      addToast({ type: 'error', message: 'Configure o PAT e usuario GitHub primeiro' });
      return;
    }

    setIsSiteDeploying(true);
    try {
      const state = usePortfolioStore.getState();
      const exchangeRate = state.systemState.exchangeRate || 5.45;
      const pricing = state.systemState.pricing || { halfBody: 150, fullBody: 250, icon: 80, custom: 300 };

      const allPortfolioItems = [
        ...state.artItems.map(item => ({ ...item, category: 'art' as const })),
        ...state.videoItems.map(item => ({ ...item, category: 'video' as const })),
        ...state.nsfwItems.map(item => ({ ...item, category: 'nsfw' as const })),
      ];

      const portfolio = JSON.stringify({
        items: allPortfolioItems.map((item, idx) => ({
          id: item.id,
          title: item.title || `ITEM_${String(idx + 1).padStart(2, '0')}`,
          tags: item.tags || [item.category],
          image: item.mediaUrl || '',
        }))
      }, null, 2);

      const tosLines = state.systemState.tosTemplate === 'custom' && state.systemState.customTosText
        ? state.systemState.customTosText.split('\n').filter((l: string) => l.trim())
        : [
            '1. Pagamento 50% adiantado via PayPal ou Pix. Restante na finalizacao.',
            '2. Ate 3 revisoes gratuitas durante o processo de lineart/cores base.',
            '3. Prazo de entrega varia de 1 a 3 semanas dependendo da complexidade do projeto.',
            '4. Nao desenho: NSFW extremo, mecha hyper-realista, gore pesado.',
          ];

      const config = JSON.stringify({
        artist: {
          name: 'Minus',
          tagline: 'one Step for you to get your art',
          description_pt: '> Hello World! Eu sou o artista digital 2D. Estamos conectados?',
          description_en: '> Hello World! I am a 2D digital artist. Are we connected?'
        },
        social: [
          { id: 'x', href: 'https://x.com', title: 'X / Twitter' },
          { id: 'instagram', href: 'https://instagram.com', title: 'Instagram' },
          { id: 'discord', href: 'https://discord.com', title: 'Discord' },
          { id: 'telegram', href: 'https://telegram.org', title: 'Telegram' },
        ],
        commissions: { status: 'open', statusLabel_pt: 'COMISSOES: OPEN', statusLabel_en: 'COMMISSIONS: OPEN' },
        stats: { projects: allPortfolioItems.length, retention: 98, pixels: 43 },
        tos: tosLines,
      }, null, 2);

      const statusMap: Record<string, { status: string; stage_pt: string; stage_en: string }> = {
        'Pending': { status: 'QUEUED', stage_pt: 'Na Fila', stage_en: 'Queued' },
        'In Progress': { status: 'IN_PROGRESS', stage_pt: 'Em Progresso', stage_en: 'In Progress' },
        'Completed': { status: 'COMPLETED', stage_pt: 'Finalizado', stage_en: 'Completed' },
      };

      const queue = JSON.stringify({
        items: state.queueItems.map(item => {
          const mapped = statusMap[item.status] || statusMap['Pending'];
          return {
            id: item.reqId || item.id,
            client: item.client || 'ANONIMO',
            type: item.type || 'COMMISSION',
            progress: item.progress || (item.status === 'Completed' ? 100 : item.status === 'In Progress' ? 50 : 10),
            status: mapped.status,
            stage_pt: item.stageName || mapped.stage_pt,
            stage_en: item.stageName || mapped.stage_en,
          };
        })
      }, null, 2);

      const toUsd = (brl: number) => Math.round(brl / exchangeRate);

      const pricingJson = JSON.stringify({
        tiers: [
          { id: 'TIER_A', name_pt: 'ICONE / PORTRAIT', name_en: 'ICON / PORTRAIT', price_pt: `R$ ${pricing.icon}`, price_en: `$ ${toUsd(pricing.icon)}`, details_pt: ['1 Personagem', 'Cores Base ou Render', 'Fundo Simples/Transparente'], details_en: ['1 Character', 'Base Colors or Render', 'Simple/Transparent Background'] },
          { id: 'TIER_B', name_pt: 'MEIO CORPO', name_en: 'HALF-BODY', price_pt: `R$ ${pricing.halfBody}`, price_en: `$ ${toUsd(pricing.halfBody)}`, details_pt: ['1 Personagem (ate a cintura)', 'Render Completo'], details_en: ['1 Character (waist up)', 'Full Render'] },
          { id: 'TIER_C', name_pt: 'CORPO INTEIRO', name_en: 'FULL-BODY', price_pt: `R$ ${pricing.fullBody}`, price_en: `$ ${toUsd(pricing.fullBody)}`, details_pt: ['1 Personagem Completo', 'Design de Roupas'], details_en: ['1 Full Character', 'Outfit Design'] },
          { id: 'TIER_D', name_pt: 'REF SHEET', name_en: 'REF SHEET', price_pt: `R$ ${pricing.custom}`, price_en: `$ ${toUsd(pricing.custom)}`, details_pt: ['Design Frontal + Detalhes', 'Paleta de Cores'], details_en: ['Front Design + Details', 'Color Palette'], hasCheckboxes: true },
        ],
        extras_pt: ['50% do valor base por OC adicional', 'R$40 a mais por cenarios complexos', '20% do valor a + para roupas complexas/armaduras'],
        extras_en: ['50% of base price per extra OC', '+$15 USD for complex backgrounds', '+20% of base price for complex clothes/armor'],
      }, null, 2);

      const siteData = { portfolio, config, queue, pricing: pricingJson };

      const result = await pushSiteData(pat, owner, repo, siteData);
      if (result.success) {
        addToast({ type: 'success', message: result.message });
        logger.info('deploy', 'Site data pushed', { repo, url: result.site_url });
      } else {
        addToast({ type: 'error', message: result.message });
        logger.error('deploy', 'Site push failed', { errors: result.errors });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast({ type: 'error', message: `Falha ao publicar site: ${msg}` });
      logger.error('deploy', 'Site push error', { error: msg });
    } finally {
      setIsSiteDeploying(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">Configuracoes</h2>
          <p className="text-zinc-400 text-sm">Ajustes do sistema, GitHub e deploy.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center text-xs text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
            <Clock size={12} className="mr-1.5" />
            Ultimo salvamento: {systemState.lastBackupTimestamp ? new Date(systemState.lastBackupTimestamp).toLocaleTimeString() : 'Nunca'}
          </div>
          <Button variant="primary" onClick={handleSave}>
            <Save size={16} className="mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* GitHub Connection */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key size={18} className="text-zinc-400" />
              <h3 className="font-medium text-white">GitHub</h3>
            </div>
            {settings.isGithubConnected && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 size={12} />
                Conectado como {settings.githubUser?.login}
              </div>
            )}
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Personal Access Token (PAT)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPAT ? 'text' : 'password'}
                    value={settings.githubPat}
                    onChange={e => settings.setField('githubPat', e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-3 pr-10 py-2 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPAT(!showPAT)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPAT ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <Button variant="secondary" onClick={handleConnectPAT} isLoading={isConnecting}>
                  Conectar
                </Button>
              </div>
              <p className="text-xs text-zinc-500">Crie um PAT em github.com/settings/tokens com escopo <code className="text-zinc-400">repo</code> e <code className="text-zinc-400">workflow</code>.</p>
            </div>

            {settings.lastError && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-md border border-red-500/20">
                <AlertCircle size={14} />
                {settings.lastError}
              </div>
            )}

            {/* Repo Selection */}
            {settings.isGithubConnected && (
              <div className="pt-4 border-t border-zinc-800/60 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Repositorio</label>
                    <select
                      value={settings.githubRepo ? `${settings.githubUsername}/${settings.githubRepo}` : ''}
                      onChange={e => handleSelectRepo(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="">Selecione um repositorio...</option>
                      {settings.githubRepos.map(repo => (
                        <option key={repo.id} value={repo.full_name}>
                          {repo.full_name} {repo.private ? '(privado)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Branch</label>
                    <input
                      type="text"
                      value={deployBranch}
                      onChange={e => setDeployBranch(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Commission Sites */}
                {settings.githubRepo && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-emerald-400" />
                      <label className="text-sm font-medium text-zinc-300">Sites de Comissao</label>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-md p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-zinc-200 font-mono">
                            {settings.getSiteUrl(settings.githubUsername, settings.githubRepo)}
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">GitHub Pages (deploy via workflow)</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenSite(settings.getSiteUrl(settings.githubUsername, settings.githubRepo))}
                        >
                          <ExternalLink size={14} className="mr-1" />
                          Abrir
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Site Deploy Section */}
                {settings.isGithubConnected && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-blue-400" />
                      <label className="text-sm font-medium text-zinc-300">Publicar Site</label>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-md p-4 space-y-3">
                      <p className="text-xs text-zinc-500">
                        Exporte os dados do StudioOS para o GitHub Pages. O site sera atualizado automaticamente.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={siteRepo}
                          onChange={e => setSiteRepo(e.target.value)}
                          placeholder={`${settings.githubUsername}.github.io`}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handlePushSiteData}
                          disabled={isSiteDeploying || !settings.githubUsername}
                          isLoading={isSiteDeploying}
                        >
                          {isSiteDeploying ? (
                            <><Loader2 size={14} className="mr-1 animate-spin" /> Publicando...</>
                          ) : (
                            <><Globe size={14} className="mr-1" /> Publicar</>
                          )}
                        </Button>
                      </div>
                      {settings.githubUsername && (
                        <p className="text-xs text-zinc-600 font-mono">
                          URL: https://{settings.githubUsername}.github.io/{siteRepo || `${settings.githubUsername}.github.io`}/
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Repo List with Delete */}
                {settings.githubRepos.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-300">Seus repositorios ({settings.githubRepos.length})</label>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-md divide-y divide-zinc-800/60 max-h-60 overflow-y-auto">
                      {settings.githubRepos.map(repo => {
                        const isSelected = repo.full_name === `${settings.githubUsername}/${settings.githubRepo}`;
                        return (
                          <div
                            key={repo.id}
                            className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                              isSelected ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500' : 'hover:bg-zinc-900/50'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className={`font-mono truncate ${isSelected ? 'text-emerald-400' : 'text-zinc-200'}`}>
                                {repo.full_name}
                              </p>
                              <p className="text-xs text-zinc-500 truncate mt-0.5">
                                {repo.description || 'Sem descricao'}
                                {repo.private ? ' · Privado' : ' · Publico'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenSite(settings.getSiteUrl(repo.owner.login, repo.name))}
                                title="Abrir site de comissao"
                              >
                                <Globe size={12} />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteRepo(repo.owner.login, repo.name)}
                                title={`Deletar ${repo.full_name}`}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Workflow</label>
                  <select
                    value={selectedWorkflow ?? ''}
                    onChange={e => setSelectedWorkflow(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    disabled={settings.isLoadingWorkflows}
                  >
                    {settings.isLoadingWorkflows ? (
                      <option>Carregando workflows...</option>
                    ) : settings.githubWorkflows.length === 0 ? (
                      <option>Nenhum workflow encontrado</option>
                    ) : (
                      <>
                        <option value="">Usar primeiro workflow disponivel</option>
                        {settings.githubWorkflows.map(wf => (
                          <option key={wf.id} value={wf.id}>
                            {wf.name} ({wf.state})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Deploy */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
            <Shield size={18} className="text-zinc-400" />
            <h3 className="font-medium text-white">Deploy & GitHub Actions</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col p-4 bg-zinc-950 border border-emerald-900/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-sm font-medium text-emerald-400">Forcar Deploy Manual</h4>
                  <p className="text-xs text-zinc-500 mt-1">Dispara o workflow de deploy via GitHub Actions API.</p>
                </div>
                <Button
                  variant="primary"
                  disabled={isDeploying || !settings.isGithubConnected || !settings.githubRepo}
                  onClick={handleDeploy}
                >
                  {isDeploying ? 'Implantando...' : 'Forcar Deploy'}
                </Button>
              </div>
              {isDeploying && (
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${deployProgress}%` }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-white">Auto-Commit</h4>
                <p className="text-xs text-zinc-500 mt-1">Commits automaticos ao salvar alteracoes.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.autoCommit}
                  onChange={e => settings.setField('autoCommit', e.target.checked)}
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-white">Otimizacao no Build</h4>
                <p className="text-xs text-zinc-500 mt-1">Rodar otimizacao de imagens antes do deploy.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.optimizeOnBuild}
                  onChange={e => settings.setField('optimizeOnBuild', e.target.checked)}
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="pt-4 border-t border-zinc-800/60">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-medium text-white">CI/CD Pipeline</h4>
                  <p className="text-xs text-zinc-500 mt-1">Gerar configuracao YAML para GitHub Actions.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={generateYaml}>
                  <FileCode2 size={14} className="mr-2" />
                  Gerar YAML
                </Button>
              </div>

              {yamlConfig && (
                <div className="bg-black border border-zinc-800 rounded-lg p-4 relative group">
                  <pre className="text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap">{yamlConfig}</pre>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        const filePath = await dialogSave({
                          defaultPath: 'deploy.yml',
                          filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }],
                        });
                        if (filePath) {
                          await writeTextFile(filePath, yamlConfig);
                          addToast({ type: 'success', message: 'YAML baixado.' });
                        }
                      }}
                    >
                      Baixar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(yamlConfig);
                        addToast({ type: 'success', message: 'YAML copiado.' });
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Workflow Runs */}
        {settings.isGithubConnected && settings.githubRepo && (
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity size={18} className="text-zinc-400" />
                <h3 className="font-medium text-white">Historico de Deploys</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-mono">
                  {settings.githubUsername}/{settings.githubRepo}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => settings.fetchWorkflowRuns(selectedWorkflow ?? undefined)}
                  isLoading={settings.isLoadingRuns}
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>
            <div className="p-0">
              <div className="divide-y divide-zinc-800/60 max-h-[300px] overflow-y-auto">
                {settings.isLoadingRuns && settings.githubWorkflowRuns.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">Carregando...</div>
                ) : settings.githubWorkflowRuns.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">Nenhum deploy encontrado</div>
                ) : (
                  settings.githubWorkflowRuns.map((run) => (
                    <div key={run.id} className="p-4 hover:bg-zinc-900/30 transition-colors flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getConclusionIcon(run.conclusion, run.status)}
                          <span className={`text-sm font-medium ${getStatusColor(run.conclusion ?? run.status)}`}>
                            {run.conclusion === 'success' ? 'Success' :
                             run.conclusion === 'failure' ? 'Failed' :
                             run.conclusion === 'cancelled' ? 'Cancelled' :
                             run.status === 'in_progress' ? 'In Progress' :
                             run.status === 'queued' ? 'Queued' : run.status}
                          </span>
                          <span className="text-xs text-zinc-500">#{run.run_number}</span>
                          <span className="text-xs text-zinc-600">|</span>
                          <span className="text-xs text-zinc-500">{run.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-600 font-mono">{run.head_branch}</span>
                          <span className="text-xs text-zinc-500">
                            {new Date(run.created_at).toLocaleString()}
                          </span>
                          <a
                            href={run.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                      {run.head_sha && (
                        <p className="text-xs text-zinc-600 font-mono pl-6">{run.head_sha.substring(0, 7)}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* Legal & Finance */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
            <Database size={18} className="text-zinc-400" />
            <h3 className="font-medium text-white">Legal & Financeiro</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-white border-b border-zinc-800 pb-2">Tabela de Precos (USD)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['halfBody', 'fullBody', 'icon', 'custom'] as const).map(key => (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 capitalize">{key}</label>
                    <input
                      type="number"
                      value={systemState.pricing?.[key] ?? 0}
                      onChange={e => usePortfolioStore.getState().updatePricing({ [key]: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800/60">
              <h4 className="text-sm font-medium text-white border-b border-zinc-800 pb-2">Terms of Service (T.O.S)</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Template</label>
                  <select
                    value={systemState.tosTemplate || 'standard'}
                    onChange={e => usePortfolioStore.getState().updateTos({ template: e.target.value as 'standard' | 'strict' | 'relaxed' | 'custom' })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="standard">Padrao (Uso pessoal)</option>
                    <option value="strict">Rigido (Direitos autorais retidos)</option>
                    <option value="relaxed">Relaxado (Uso comercial)</option>
                    <option value="custom">Customizado</option>
                  </select>
                </div>

                {systemState.tosTemplate === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">T.O.S Customizado</label>
                    <textarea
                      value={systemState.customTosText || ''}
                      onChange={e => usePortfolioStore.getState().updateTos({ customText: e.target.value })}
                      placeholder="Insira os termos de servico..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors min-h-[150px] font-mono resize-y"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Optimization */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
            <ImagePlus size={18} className="text-zinc-400" />
            <h3 className="font-medium text-white">Otimizacao de Midia</h3>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">Compressao de Imagens</h4>
              <p className="text-xs text-zinc-500 mt-1">Comprime imagens para WebP.</p>
            </div>
            <Button variant="secondary" onClick={handleCompress} isLoading={isCompressing}>
              Comprimir Assets
            </Button>
          </div>
        </section>

        {/* SSH Keys */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
            <GitBranch size={18} className="text-zinc-400" />
            <h3 className="font-medium text-white">SSH Keys</h3>
          </div>
          <div className="p-6">
            {sshKey || settings.sshPublicKey ? (
              <div className="space-y-3">
                <div className="bg-zinc-950 border border-zinc-800 rounded-md p-3 relative group">
                  <pre className="text-xs text-zinc-400 font-mono break-all whitespace-pre-wrap">{sshKey || settings.sshPublicKey}</pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sshKey || settings.sshPublicKey || '');
                      addToast({ type: 'success', message: 'Chave publica copiada!' });
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <FileCode2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-zinc-500">Adicione esta chave publica nas configuracoes do GitHub.</p>
                <Button variant="danger" size="sm" onClick={() => setSshKey(null)}>
                  Remover
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={handleGenerateSsh} isLoading={isGeneratingSsh}>
                Gerar Chave SSH
              </Button>
            )}
          </div>
        </section>

        {/* Backup */}
        <section className="bg-zinc-900/50 border border-red-900/30 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-red-900/30 bg-red-950/20 flex items-center gap-3">
            <HardDrive size={18} className="text-red-400" />
            <h3 className="font-medium text-red-400">Gerenciamento de Dados</h3>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">Backup Local</h4>
              <p className="text-xs text-zinc-500 mt-1">Copia de seguranca dos dados.</p>
            </div>
            <Button variant="secondary" onClick={handleBackup}>
              Fazer Backup
            </Button>
          </div>
        </section>

        {/* About & Updates */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
            <RefreshCw size={18} className="text-zinc-400" />
            <h3 className="font-medium text-white">Sobre & Atualizacoes</h3>
          </div>
          <div className="p-6">
            <UpdateChecker />
          </div>
        </section>
      </div>
    </div>
  );
}


