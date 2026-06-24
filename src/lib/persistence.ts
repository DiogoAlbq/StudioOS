import { appDataDir } from '@tauri-apps/api/path';
import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import type { PersistedState, PortfolioItem, QueueItem } from '../types';

const STATE_FILE = 'state.json';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 200;

function createDefaultState(): PersistedState {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    artItems: [],
    videoItems: [],
    nsfwItems: [],
    heroBgImages: [],
    socialItems: [],
    queueItems: [],
    systemState: {
      exchangeRate: 5.45,
      lastBackupTimestamp: null,
      isServerRunning: false,
      pricing: { halfBody: 150, fullBody: 250, icon: 80, custom: 300 },
      tosTemplate: 'standard',
      customTosText: '',
    },
    activeCategory: 'art',
    activeView: 'galerias',
  };
}

async function ensureDir(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  throw lastError;
}

export async function loadState(): Promise<PersistedState> {
  try {
    const dir = await appDataDir();
    const filePath = `${dir}/${STATE_FILE}`;
    if (await exists(filePath)) {
      const content = await readTextFile(filePath);
      const parsed = JSON.parse(content) as Partial<PersistedState>;
      return { ...createDefaultState(), ...parsed };
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return createDefaultState();
}

export async function saveState(state: {
  artItems: PortfolioItem[];
  videoItems: PortfolioItem[];
  nsfwItems: PortfolioItem[];
  heroBgImages: PortfolioItem[];
  socialItems: PortfolioItem[];
  queueItems: QueueItem[];
  systemState: PersistedState['systemState'];
  activeCategory?: string;
  activeView?: string;
}): Promise<void> {
  try {
    const dir = await appDataDir();
    await ensureDir(dir);
    const filePath = `${dir}/${STATE_FILE}`;

    const persisted: PersistedState = {
      version: 2,
      updatedAt: new Date().toISOString(),
      artItems: state.artItems,
      videoItems: state.videoItems,
      nsfwItems: state.nsfwItems,
      heroBgImages: state.heroBgImages,
      socialItems: state.socialItems,
      queueItems: state.queueItems,
      systemState: state.systemState,
      activeCategory: (state.activeCategory ?? 'art') as PersistedState['activeCategory'],
      activeView: (state.activeView ?? 'galerias') as PersistedState['activeView'],
    };

    await withRetry(async () => {
      const tempPath = `${dir}/${STATE_FILE}.tmp`;
      await writeTextFile(tempPath, JSON.stringify(persisted, null, 2));
      try {
        if (await exists(filePath)) {
          const existing = await readTextFile(filePath);
          if (existing) {
            // atomic swap via rename isn't available via plugin-fs, use write
            await writeTextFile(filePath, JSON.stringify(persisted, null, 2));
          }
        } else {
          await writeTextFile(filePath, JSON.stringify(persisted, null, 2));
        }
      } catch {
        await writeTextFile(filePath, JSON.stringify(persisted, null, 2));
      }
    });
  } catch (e) {
    console.error('Failed to save state:', e);
    throw e;
  }
}

export async function exportState(): Promise<string> {
  const state = await loadState();
  return JSON.stringify(state, null, 2);
}
