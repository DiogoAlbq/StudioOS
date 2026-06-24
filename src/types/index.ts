export type CategoryKey = 'hero' | 'social' | 'art' | 'video' | 'nsfw';
export type ViewKey = 'dashboard' | 'galerias' | 'cambio' | 'settings' | 'queue';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
export type LogSource = 'frontend' | 'backend' | 'tauri' | 'plugin';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  target: string;
  message: string;
  fields: Record<string, unknown>;
  source: LogSource;
  correlationId?: string;
  sessionId?: string;
}

export interface LogQuery {
  level?: LogLevel;
  source?: LogSource;
  target?: string;
  startTime?: string;
  endTime?: string;
  correlationId?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

export interface PersistedState {
  version: number;
  updatedAt: string;
  artItems: PortfolioItem[];
  videoItems: PortfolioItem[];
  nsfwItems: PortfolioItem[];
  heroBgImages: PortfolioItem[];
  socialItems: PortfolioItem[];
  queueItems: QueueItem[];
  systemState: SystemState;
  activeCategory: CategoryKey;
  activeView: ViewKey;
}

export interface AppSettings {
  version: number;
  updatedAt: string;
  githubUsername?: string;
  githubRepo?: string;
  githubPat?: string;
  githubOauthScopes: Record<string, boolean>;
  sshPublicKey?: string;
  optimizationApiKey?: string;
  autoCommit: boolean;
  optimizeOnBuild: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export type QueueStatus = 'Pending' | 'In Progress' | 'Completed';
export type QueuePriority = 'Low' | 'Medium' | 'High';

export interface QueueItem {
  id: string;
  reqId: string;
  client: string;
  type: string;
  status: QueueStatus;
  priority: QueuePriority;
  progress: number;
  stageName: string;
}

export interface PortfolioItem {
  id: string;
  index: number;
  type: 'image' | 'video';
  title?: string;
  description?: string;
  color?: string;
  iconColor?: string;
  double?: boolean;
  vertical?: boolean;
  mediaUrl?: string;
  platform?: string;
  url?: string;
  nsfw?: boolean;
  pricingTier?: 'halfBody' | 'fullBody' | 'icon' | 'custom' | 'none';
  tags?: string[];
}

export interface PortfolioStats {
  total: number;
  filled: number;
  empty: number;
  images: number;
  videos: number;
  normal: number;
  wide: number;
  vertical: number;
}

export interface SystemState {
  exchangeRate: number;
  lastBackupTimestamp: number | null;
  isServerRunning: boolean;
  pricing?: {
    halfBody: number;
    fullBody: number;
    icon: number;
    custom: number;
  };
  tosTemplate?: 'standard' | 'strict' | 'relaxed' | 'custom';
  customTosText?: string;
}
