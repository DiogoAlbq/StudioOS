import React from 'react';
import { motion } from 'motion/react';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { Image as ImageIcon, Video, AlertTriangle, LayoutTemplate, Activity, ArrowUpRight, ListTodo, DollarSign, BarChart3 } from 'lucide-react';
import type { PortfolioItem } from '../types';

export function DashboardView() {
  const { artItems, videoItems, nsfwItems, heroBgImages, socialItems, queueItems, systemState, setActiveView } = usePortfolioStore();

  const getStats = (items: PortfolioItem[]) => ({
    total: items.length,
    filled: items.filter(i => !!i.mediaUrl).length,
    empty: items.filter(i => !i.mediaUrl).length,
  });

  const stats = {
    art: getStats(artItems),
    video: getStats(videoItems),
    nsfw: getStats(nsfwItems),
    hero: getStats(heroBgImages),
    social: getStats(socialItems),
  };

  const totalFilled = stats.art.filled + stats.video.filled + stats.nsfw.filled + stats.hero.filled + stats.social.filled;
  const totalItems = stats.art.total + stats.video.total + stats.nsfw.total + stats.hero.total + stats.social.total;
  const healthPercentage = totalItems > 0 ? Math.round((totalFilled / totalItems) * 100) : 0;

  // Queue stats
  const queuePending = queueItems.filter(i => i.status === 'Pending').length;
  const queueInProgress = queueItems.filter(i => i.status === 'In Progress').length;
  const queueCompleted = queueItems.filter(i => i.status === 'Completed').length;
  const avgProgress = queueItems.length > 0
    ? Math.round(queueItems.reduce((sum, i) => sum + i.progress, 0) / queueItems.length)
    : 0;

  // Revenue calculation
  const activePricing = systemState.pricing;
  const itemsWithTier = [...artItems, ...videoItems, ...nsfwItems].filter((i) => i.pricingTier && i.pricingTier !== 'none');
  const totalPotentialUSD = itemsWithTier.reduce((sum, i) => {
    switch (i.pricingTier) {
      case 'halfBody': return sum + activePricing.halfBody;
      case 'fullBody': return sum + activePricing.fullBody;
      case 'icon': return sum + activePricing.icon;
      case 'custom': return sum + activePricing.custom;
      default: return sum;
    }
  }, 0);
  const totalPotentialBRL = totalPotentialUSD * systemState.exchangeRate;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">Overview</h2>
        <p className="text-zinc-400 text-sm">Resumo geral da saúde do portfólio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Health Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity size={100} />
          </div>
          <div className="flex items-center space-x-2 text-zinc-400 mb-4">
            <Activity size={16} />
            <span className="text-sm font-medium">Health Score</span>
          </div>
          <div className="text-4xl font-semibold text-white mb-2">{healthPercentage}%</div>
          <p className="text-xs text-zinc-500">Slots preenchidos vs. totais</p>
          <div className="mt-6 w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${healthPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full ${healthPercentage > 80 ? 'bg-emerald-500' : healthPercentage > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            />
          </div>
        </div>

        {/* Total Assets Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <LayoutTemplate size={100} />
          </div>
          <div className="flex items-center space-x-2 text-zinc-400 mb-4">
            <LayoutTemplate size={16} />
            <span className="text-sm font-medium">Total de Assets</span>
          </div>
          <div className="text-4xl font-semibold text-white mb-2">{totalFilled}</div>
          <div className="flex items-center text-xs text-emerald-400 bg-emerald-500/10 w-max px-2 py-1 rounded-md mt-6">
            <ArrowUpRight size={12} className="mr-1" />
            <span>Ativos em produção</span>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 relative overflow-hidden cursor-pointer hover:border-violet-500/50 transition-colors" onClick={() => setActiveView('cambio')}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign size={100} />
          </div>
          <div className="flex items-center space-x-2 text-zinc-400 mb-4">
            <DollarSign size={16} />
            <span className="text-sm font-medium">Receita Potencial</span>
          </div>
          <div className="text-3xl font-semibold text-white mb-1">${totalPotentialUSD.toLocaleString()}</div>
          <p className="text-xs text-zinc-500">R$ {totalPotentialBRL.toLocaleString()}</p>
          <div className="flex items-center text-xs text-violet-400 bg-violet-500/10 w-max px-2 py-1 rounded-md mt-2">
            <BarChart3 size={12} className="mr-1" />
            <span>{itemsWithTier.length} comissões ativas</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Queue Status */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 cursor-pointer hover:border-zinc-700 transition-colors" onClick={() => setActiveView('queue')}>
          <div className="flex items-center space-x-2 text-zinc-400 mb-4">
            <ListTodo size={16} />
            <span className="text-sm font-medium">Status da Fila</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{queueItems.length}</p>
              <p className="text-xs text-zinc-500">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">{queuePending}</p>
              <p className="text-xs text-zinc-500">Pendente</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{queueInProgress}</p>
              <p className="text-xs text-zinc-500">Progresso</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{queueCompleted}</p>
              <p className="text-xs text-zinc-500">Concluído</p>
            </div>
          </div>
          {queueItems.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Progresso médio</span>
                <span>{avgProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${avgProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center space-x-2 text-zinc-400 mb-4">
            <BarChart3 size={16} />
            <span className="text-sm font-medium">Distribuição por Categoria</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            <CategoryStatCard title="Artes" icon={<ImageIcon size={14} />} stats={stats.art} />
            <CategoryStatCard title="Vídeos" icon={<Video size={14} />} stats={stats.video} />
            <CategoryStatCard title="Hero" icon={<LayoutTemplate size={14} />} stats={stats.hero} />
            <CategoryStatCard title="Social" icon={<ImageIcon size={14} />} stats={stats.social} />
            <CategoryStatCard title="NSFW" icon={<AlertTriangle size={14} className="text-red-400" />} stats={stats.nsfw} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryStatCard({ title, icon, stats }: { title: string, icon: React.ReactNode, stats: { total: number, filled: number, empty: number } }) {
  const fillPercent = stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0;
  return (
    <div className="bg-zinc-800/30 border border-zinc-800/60 rounded-lg p-3">
      <div className="flex items-center space-x-1.5 text-zinc-300 mb-2">
        {icon}
        <span className="text-xs font-medium">{title}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-zinc-500">Total</span>
          <span className="text-zinc-300 font-mono">{stats.total}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-zinc-500">OK</span>
          <span className="text-emerald-400 font-mono">{stats.filled}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-zinc-500">Vazios</span>
          <span className="text-yellow-400 font-mono">{stats.empty}</span>
        </div>
        <div className="mt-2 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${fillPercent > 80 ? 'bg-emerald-500' : fillPercent > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${fillPercent}%` }} />
        </div>
      </div>
    </div>
  );
}
