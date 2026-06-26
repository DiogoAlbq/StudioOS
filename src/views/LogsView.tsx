import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { Button } from '../components/ui/Button';
import { LogEntry, LogStats } from '../types';
import { Terminal, RefreshCw, Download, Trash2, Search } from 'lucide-react';

export function LogsView() {
  const { t } = useTranslation();
  const addToast = usePortfolioStore((s) => s.addToast);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const query: Record<string, unknown> = { level: levelFilter || null, source: sourceFilter || null };
      const result = await invoke<LogEntry[]>('get_logs_cmd', { query });
      setLogs(result);
      const s = await invoke<LogStats>('get_log_stats');
      setStats(s);
    } catch (err) {
      addToast({ type: 'error', message: `Failed to load logs: ${err}` });
    } finally {
      setLoading(false);
    }
  }, [levelFilter, sourceFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleExport = async (format: string) => {
    try {
      const query = { level: levelFilter || null, source: sourceFilter || null };
      const data = await invoke<string>('export_logs_cmd', { query, format });
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `studioos-logs.${format === 'csv' ? 'csv' : 'json'}`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: 'Logs exported' });
    } catch (err) {
      addToast({ type: 'error', message: `Export failed: ${err}` });
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all logs?')) return;
    try {
      await invoke('clear_logs_cmd');
      addToast({ type: 'success', message: 'Logs cleared' });
      loadLogs();
    } catch (err) {
      addToast({ type: 'error', message: `Failed to clear logs: ${err}` });
    }
  };

  const filteredLogs = logs.filter((log) =>
    searchText
      ? log.message.toLowerCase().includes(searchText.toLowerCase()) ||
        log.target.toLowerCase().includes(searchText.toLowerCase())
      : true
  );

  const levelColors: Record<string, string> = {
    trace: 'text-zinc-500',
    debug: 'text-blue-400',
    info: 'text-emerald-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  };

  const sourceColors: Record<string, string> = {
    frontend: 'text-violet-400',
    backend: 'text-cyan-400',
    tauri: 'text-orange-400',
    plugin: 'text-pink-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">{t('logs.title')}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleExport('json')}>
            <Download className="w-4 h-4 mr-2" />
            {t('logs.export')}
          </Button>
          <Button variant="danger" onClick={handleClear}>
            <Trash2 className="w-4 h-4 mr-2" />
            {t('logs.clear')}
          </Button>
          <Button variant="secondary" onClick={loadLogs}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-6 gap-3">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-zinc-400">{t('logs.total')}</p>
          </div>
          {Object.entries(stats.byLevel).map(([level, count]) => (
            <div key={level} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${levelColors[level.toLowerCase()] || 'text-white'}`}>{count}</p>
              <p className="text-xs text-zinc-400 capitalize">{level.toLowerCase()}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t('logs.search')}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">{t('logs.filterLevel')}</option>
          <option value="trace">Trace</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">{t('logs.filterSource')}</option>
          <option value="frontend">Frontend</option>
          <option value="backend">Backend</option>
          <option value="tauri">Tauri</option>
          <option value="plugin">Plugin</option>
        </select>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-zinc-400 text-center py-8">{t('common.loading')}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-zinc-500 text-center py-8">{t('logs.noLogs')}</div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-zinc-400 font-medium">Time</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Level</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Source</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Target</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30">
                    <td className="p-3 text-zinc-400 whitespace-nowrap font-mono text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs font-medium ${levelColors[log.level] || 'text-white'}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs ${sourceColors[log.source] || 'text-zinc-400'}`}>
                        {log.source}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-400 font-mono text-xs">{log.target}</td>
                    <td className="p-3 text-white text-xs max-w-md truncate">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
