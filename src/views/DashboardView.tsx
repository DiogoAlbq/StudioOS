import React from 'react';
import { motion } from 'motion/react';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { Image as ImageIcon, Video, AlertTriangle, LayoutTemplate, Activity, ArrowUpRight } from 'lucide-react';
import type { PortfolioItem } from '../types';

export function DashboardView() {
  const { artItems, videoItems, nsfwItems, heroBgImages, socialItems } = usePortfolioStore();

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

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">Overview</h2>
        <p className="text-zinc-400 text-sm">Resumo geral da saúde do portfólio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

        {/* Alerts Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
          <div className="flex items-center space-x-2 text-zinc-400 mb-4">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Atenção Necessária</span>
          </div>
          <div className="text-4xl font-semibold text-white mb-2">{totalItems - totalFilled}</div>
          <p className="text-xs text-zinc-500 mt-6">Slots vazios aguardando mídia</p>
        </div>
      </div>

      <h3 className="text-lg font-medium text-white mb-4">Distribuição por Categoria</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <CategoryStatCard title="Artes" icon={<ImageIcon size={18} />} stats={stats.art} />
        <CategoryStatCard title="Vídeos" icon={<Video size={18} />} stats={stats.video} />
        <CategoryStatCard title="Hero" icon={<LayoutTemplate size={18} />} stats={stats.hero} />
        <CategoryStatCard title="Social" icon={<ImageIcon size={18} />} stats={stats.social} />
        <CategoryStatCard title="NSFW" icon={<AlertTriangle size={18} className="text-red-400" />} stats={stats.nsfw} />
      </div>
    </div>
  );
}

function CategoryStatCard({ title, icon, stats }: { title: string, icon: React.ReactNode, stats: { total: number, filled: number, empty: number } }) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-4">
      <div className="flex items-center space-x-2 text-zinc-300 mb-3">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-500">Total</span>
          <span className="text-zinc-300 font-mono">{stats.total}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-500">Preenchidos</span>
          <span className="text-emerald-400 font-mono">{stats.filled}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-500">Vazios</span>
          <span className="text-yellow-400 font-mono">{stats.empty}</span>
        </div>
      </div>
    </div>
  );
}
