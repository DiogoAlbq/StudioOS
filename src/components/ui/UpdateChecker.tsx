import { useState, useEffect, useCallback } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Download, RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { getVersion } from '@tauri-apps/api/app';

interface UpdateInfo {
  available: boolean;
  version?: string;
  body?: string;
  date?: string;
}

export function UpdateChecker() {
  const [currentVersion, setCurrentVersion] = useState('');
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ available: false });
  const [error, setError] = useState<string | null>(null);
  const addToast = usePortfolioStore(s => s.addToast);

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(() => setCurrentVersion('0.1.0'));
  }, []);

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setError(null);
    setUpdateInfo({ available: false });
    try {
      const result = await check();
      if (result?.available) {
        setUpdateInfo({
          available: true,
          version: result.version,
          body: result.body,
          date: result.date,
        });
      } else {
        setUpdateInfo({ available: false });
        addToast({ type: 'success', message: 'StudioOS esta atualizado!' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addToast({ type: 'error', message: 'Falha ao verificar updates: ' + msg });
    } finally {
      setChecking(false);
    }
  }, [addToast]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDownloadProgress(0);
    try {
      const result = await check();
      if (!result?.available) {
        addToast({ type: 'info', message: 'Nenhum update disponivel.' });
        setDownloading(false);
        return;
      }
      await result.downloadAndInstall((event: any) => {
        if (event.event === 'Started') {
          setDownloadProgress(0);
        } else if (typeof event.progress === 'number') {
          setDownloadProgress(event.progress);
        }
      });
      addToast({ type: 'success', message: 'Update baixado. Reiniciando...' });
      await relaunch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addToast({ type: 'error', message: 'Falha ao baixar update: ' + msg });
    } finally {
      setDownloading(false);
    }
  }, [addToast]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-white">Versao Atual</h4>
          <p className="text-xs text-zinc-500 mt-1 font-mono">v{currentVersion}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCheck}
          isLoading={checking}
          disabled={downloading}
        >
          {checking ? (
            <><Loader2 size={14} className="mr-1 animate-spin" /> Verificando...</>
          ) : (
            <><RefreshCw size={14} className="mr-1" /> Verificar Updates</>
          )}
        </Button>
      </div>

      {checking && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-950/50 border border-zinc-800 rounded-md px-3 py-2">
          <Loader2 size={12} className="animate-spin" />
          Verificando atualizacoes...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {!checking && !error && updateInfo.available && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <h5 className="text-sm font-medium text-emerald-400">Update Disponivel</h5>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Nova versao: <span className="font-mono text-zinc-200">v{updateInfo.version}</span>
              </p>
              {updateInfo.date && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  Publicado em: {new Date(updateInfo.date).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              isLoading={downloading}
            >
              {downloading ? (
                <><Loader2 size={14} className="mr-1 animate-spin" /> Baixando... {downloadProgress > 0 && Math.round(downloadProgress) + '%'}</>
              ) : (
                <><Download size={14} className="mr-1" /> Baixar & Instalar</>
              )}
            </Button>
          </div>
          {downloading && downloadProgress > 0 && (
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: downloadProgress + '%' }}
              />
            </div>
          )}
          {updateInfo.body && (
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-md p-3 max-h-32 overflow-y-auto">
              <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap">{updateInfo.body}</pre>
            </div>
          )}
        </div>
      )}

      {!checking && !error && !updateInfo.available && currentVersion && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-950/50 border border-zinc-800 rounded-md px-3 py-2">
          <CheckCircle2 size={12} className="text-emerald-500" />
          StudioOS esta atualizado
        </div>
      )}
    </div>
  );
}
