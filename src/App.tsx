import { useEffect } from 'react';
import { DashboardLayout } from './layout/DashboardLayout';
import { GalleryManager } from './views/GalleryManager';
import { DashboardView } from './views/DashboardView';
import { FinanceView } from './views/FinanceView';
import { SettingsView } from './views/SettingsView';
import { QueueView } from './views/QueueView';
import { ClientsView } from './views/ClientsView';
import { LogsView } from './views/LogsView';
import { SiteBuilderView } from './views/SiteBuilderView';
import { ToastContainer } from './components/ui/ToastContainer';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { usePortfolioStore } from './store/usePortfolioStore';
import { loadState, saveState } from './lib/persistence';
import { initLogger, logger } from './lib/logger';
import { markDirty, scheduleSync } from './lib/siteSync';

function getRelevantSnapshot(state: ReturnType<typeof usePortfolioStore.getState>) {
  return {
    artItems: state.artItems,
    videoItems: state.videoItems,
    nsfwItems: state.nsfwItems,
    queueItems: state.queueItems,
    pricing: state.systemState.pricing,
  };
}

function snapshotsEqual(a: ReturnType<typeof getRelevantSnapshot>, b: ReturnType<typeof getRelevantSnapshot>): boolean {
  return (
    a.artItems === b.artItems &&
    a.videoItems === b.videoItems &&
    a.nsfwItems === b.nsfwItems &&
    a.queueItems === b.queueItems &&
    a.pricing === b.pricing
  );
}

export default function App() {
  const { activeView, setLastBackupTimestamp, restoreBackup } = usePortfolioStore();

  useEffect(() => {
    initLogger();
    loadState().then((saved) => {
      if (saved) {
        restoreBackup(saved);
        logger.info('app', 'State loaded from disk');
      }
    }).catch((err) => {
      logger.error('app', 'Failed to load state', { error: String(err) });
    });

    let prevSnapshot = getRelevantSnapshot(usePortfolioStore.getState());

    const unsub = usePortfolioStore.subscribe((state) => {
      const nextSnapshot = getRelevantSnapshot(state);
      if (!snapshotsEqual(prevSnapshot, nextSnapshot)) {
        prevSnapshot = nextSnapshot;
        markDirty();
        scheduleSync(5000);
      }
    });

    const interval = setInterval(() => {
      const state = usePortfolioStore.getState();
      saveState({
        artItems: state.artItems,
        videoItems: state.videoItems,
        nsfwItems: state.nsfwItems,
        heroBgImages: state.heroBgImages,
        socialItems: state.socialItems,
        queueItems: state.queueItems,
        systemState: state.systemState,
        activeCategory: state.activeCategory,
        activeView: state.activeView,
      }).then(() => {
        setLastBackupTimestamp(Date.now());
      }).catch((err) => {
        logger.error('app', 'Auto-save failed', { error: String(err) });
      });
    }, 60000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'galerias':
        return <GalleryManager />;
      case 'cambio':
        return <FinanceView />;
      case 'settings':
        return <SettingsView />;
      case 'queue':
        return <QueueView />;
      case 'clients':
        return <ClientsView />;
      case 'logs':
        return <LogsView />;
      case 'site':
        return <SiteBuilderView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <>
      <DashboardLayout>
        {renderView()}
      </DashboardLayout>
      <KeyboardShortcuts />
      <ToastContainer />
    </>
  );
}
