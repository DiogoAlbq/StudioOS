import { useState } from 'react';
import { DollarSign, ArrowRightLeft, TrendingUp, Download, PieChart } from 'lucide-react';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { Button } from '../components/ui/Button';
import { save as dialogSave } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

export function FinanceView() {
  const { systemState, updateExchangeRate, addToast, artItems } = usePortfolioStore();
  const [rateInput, setRateInput] = useState(systemState.exchangeRate.toString());

  const handleUpdateRate = () => {
    const parsed = parseFloat(rateInput);
    if (!isNaN(parsed) && parsed > 0) {
      updateExchangeRate(parsed);
      addToast({ type: 'success', message: 'Taxa de câmbio atualizada no sistema.' });
    } else {
      addToast({ type: 'error', message: 'Valor de taxa inválido.' });
    }
  };

  const calculateRevenue = () => {
    let usd = 0;
    const pricing = systemState.pricing || { halfBody: 150, fullBody: 250, icon: 80, custom: 300 };
    artItems.forEach(item => {
      if (item.pricingTier === 'halfBody') usd += pricing.halfBody;
      if (item.pricingTier === 'fullBody') usd += pricing.fullBody;
      if (item.pricingTier === 'icon') usd += pricing.icon;
      if (item.pricingTier === 'custom') usd += pricing.custom;
    });
    return usd;
  };

  const activeCommissions = artItems.filter(i => i.pricingTier && i.pricingTier !== 'none').length;
  const potentialUsd = calculateRevenue();
  const potentialBrl = potentialUsd * systemState.exchangeRate;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">Câmbio & Finanças</h2>
        <p className="text-zinc-400 text-sm">Gerencie valores, cotações e orçamentos do portfólio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Exchange Rate Config */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center space-x-2 text-zinc-300 mb-6">
            <DollarSign size={20} className="text-emerald-500" />
            <h3 className="text-lg font-medium">Taxa Base USD/BRL</h3>
          </div>
          
          <div className="flex flex-col gap-4">
             <div className="flex items-center gap-3">
               <div className="relative flex-1">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <span className="text-zinc-500 sm:text-sm">R$</span>
                 </div>
                 <input
                   type="number"
                   step="0.01"
                   value={rateInput}
                   onChange={(e) => setRateInput(e.target.value)}
                   className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all font-mono"
                 />
               </div>
               <Button variant="primary" onClick={handleUpdateRate}>
                 Atualizar
               </Button>
             </div>
             
             <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800/60 flex items-center justify-between mt-2">
               <span className="text-sm text-zinc-400">Status no Front-end:</span>
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-emerald-400 font-mono">1 USD = {systemState.exchangeRate.toFixed(2)} BRL</span>
               </div>
             </div>
          </div>
        </div>

        {/* Quick Converter */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center space-x-2 text-zinc-300 mb-6">
            <ArrowRightLeft size={20} className="text-blue-500" />
            <h3 className="text-lg font-medium">Simulador Rápido</h3>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex justify-between text-sm text-zinc-400 mb-1">
              <span>Half Body</span>
              <span>{systemState.pricing?.halfBody || 150} USD</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-400 mb-1">
              <span>Valor em Reais (BRL)</span>
              <span className="text-white font-mono">R$ {((systemState.pricing?.halfBody || 150) * systemState.exchangeRate).toFixed(2)}</span>
            </div>
            
            <div className="h-px w-full bg-zinc-800 my-2" />

             <div className="flex justify-between text-sm text-zinc-400 mb-1">
              <span>Full Body</span>
              <span>{systemState.pricing?.fullBody || 250} USD</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-400 mb-1">
              <span>Valor em Reais (BRL)</span>
              <span className="text-white font-mono">R$ {((systemState.pricing?.fullBody || 250) * systemState.exchangeRate).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Commission Potential Summary */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 text-zinc-300">
            <PieChart size={20} className="text-orange-500" />
            <h3 className="text-lg font-medium">Receita Potencial (Volume Atual)</h3>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-zinc-950 border border-zinc-800/60 rounded-lg p-4">
            <div className="text-sm text-zinc-500 mb-1">Comissões Ativas</div>
            <div className="text-2xl font-semibold text-white">{activeCommissions}</div>
          </div>
          
          <div className="bg-zinc-950 border border-zinc-800/60 rounded-lg p-4">
            <div className="text-sm text-zinc-500 mb-1">Potencial (USD)</div>
            <div className="text-2xl font-semibold text-emerald-400 font-mono">${potentialUsd.toFixed(2)}</div>
          </div>
          
          <div className="bg-zinc-950 border border-zinc-800/60 rounded-lg p-4">
            <div className="text-sm text-zinc-500 mb-1">Potencial (BRL)</div>
            <div className="text-2xl font-semibold text-emerald-400 font-mono">R$ {potentialBrl.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 text-zinc-300">
            <TrendingUp size={20} className="text-purple-500" />
            <h3 className="text-lg font-medium">Relatórios Financeiros</h3>
          </div>
          <Button variant="secondary" size="sm" onClick={async () => {
            const pricing = systemState.pricing || { halfBody: 150, fullBody: 250, icon: 80, custom: 300 };
            const csvContent = "ID,Tipo,Client,Valor(USD)\n" + 
              artItems.filter(i => i.pricingTier && i.pricingTier !== 'none').map(i => {
                let val = 0;
                if (i.pricingTier === 'halfBody') val = pricing.halfBody;
                if (i.pricingTier === 'fullBody') val = pricing.fullBody;
                if (i.pricingTier === 'icon') val = pricing.icon;
                if (i.pricingTier === 'custom') val = pricing.custom;
                return `${i.id},${i.pricingTier},Art Item,${val}`;
              }).join('\n');
            const filePath = await dialogSave({
              defaultPath: `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`,
              filters: [{ name: 'CSV', extensions: ['csv'] }],
            });
            if (filePath) {
              await writeTextFile(filePath, csvContent);
              addToast({ type: 'success', message: 'Relatório exportado com sucesso!' });
            }
          }}>
            <Download size={14} className="mr-2" />
            Exportar CSV
          </Button>
        </div>
        
        <div className="text-center py-12 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg">
          Histórico de exportações disponível após o primeiro download.
        </div>
      </div>
    </div>
  );
}
