import { create } from 'zustand';
import { PortfolioItem, SystemState, CategoryKey, ViewKey, ToastMessage, QueueItem, PersistedState } from '../types';
import { SitePortfolioItem } from '../lib/github';

interface ActionSnapshot {
  artItems: PortfolioItem[];
  videoItems: PortfolioItem[];
  nsfwItems: PortfolioItem[];
  heroBgImages: PortfolioItem[];
  socialItems: PortfolioItem[];
  queueItems: QueueItem[];
}

interface PortfolioStore {
  artItems: PortfolioItem[];
  videoItems: PortfolioItem[];
  nsfwItems: PortfolioItem[];
  heroBgImages: PortfolioItem[];
  socialItems: PortfolioItem[];
  queueItems: QueueItem[];
  systemState: SystemState;
  activeCategory: CategoryKey;
  activeView: ViewKey;
  toasts: ToastMessage[];
  history: ActionSnapshot[];
  undo: () => void;
  setActiveCategory: (category: CategoryKey) => void;
  setActiveView: (view: ViewKey) => void;
  updateExchangeRate: (rate: number) => void;
  updatePricing: (pricing: Partial<SystemState['pricing']>) => void;
  updateTos: (tosData: { template?: 'standard' | 'strict' | 'relaxed' | 'custom'; customText?: string }) => void;
  setLastBackupTimestamp: (timestamp: number) => void;
  restoreBackup: (data: Partial<PersistedState>) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  deleteItem: (category: CategoryKey, id: string) => void;
  deleteItems: (category: CategoryKey, ids: string[]) => void;
  addItem: (category: CategoryKey) => void;
  updateItem: (category: CategoryKey, id: string, updates: Partial<PortfolioItem>) => void;
  moveItem: (category: CategoryKey, id: string, direction: 'left' | 'right') => void;
  moveItemsToCategory: (fromCategory: CategoryKey, toCategory: CategoryKey, ids: string[]) => void;
  
  // Queue actions
  addQueueItem: (item: Omit<QueueItem, 'id'>) => void;
  updateQueueItem: (id: string, updates: Partial<QueueItem>) => void;
  updateQueueItems: (ids: string[], updates: Partial<QueueItem>) => void;
  removeQueueItem: (id: string) => void;
  removeQueueItems: (ids: string[]) => void;
  reorderQueueItems: (items: QueueItem[]) => void;

  // Sync from SiteMinus
  syncFromSite: (items: SitePortfolioItem[]) => void;
}

const mockArtItems: PortfolioItem[] = [
  { id: '1', index: 0, type: 'image', color: 'bg-emerald-500/20', iconColor: 'text-emerald-500', mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop', double: false, vertical: false },
  { id: '2', index: 1, type: 'image', color: 'bg-blue-500/20', iconColor: 'text-blue-500', mediaUrl: '', double: true, vertical: false },
  { id: '3', index: 2, type: 'image', color: 'bg-purple-500/20', iconColor: 'text-purple-500', mediaUrl: 'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=2000&auto=format&fit=crop', double: false, vertical: false },
  { id: '4', index: 3, type: 'video', color: 'bg-orange-500/20', iconColor: 'text-orange-500', mediaUrl: '', double: true, vertical: false },
  { id: '5', index: 4, type: 'image', color: 'bg-pink-500/20', iconColor: 'text-pink-500', mediaUrl: 'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=2000&auto=format&fit=crop', double: false, vertical: false },
  { id: '6', index: 5, type: 'image', color: 'bg-zinc-800', iconColor: 'text-zinc-500', mediaUrl: '', double: false, vertical: false },
];

function getHistorySnapshot(state: PortfolioStore): ActionSnapshot {
  return {
    artItems: state.artItems,
    videoItems: state.videoItems,
    nsfwItems: state.nsfwItems,
    heroBgImages: state.heroBgImages,
    socialItems: state.socialItems,
    queueItems: state.queueItems,
  };
}

function pushHistory(state: PortfolioStore): ActionSnapshot[] {
  const newHistory = [...state.history, getHistorySnapshot(state)];
  if (newHistory.length > 10) newHistory.shift();
  return newHistory;
}

export const usePortfolioStore = create<PortfolioStore>((set) => ({
  artItems: mockArtItems,
  videoItems: [],
  nsfwItems: [],
  heroBgImages: [],
  socialItems: [],
  queueItems: [
    { id: 'q1', reqId: 'REQ_A73', client: 'LUCAS_M.', type: 'FULL_BODY_RENDER', status: 'In Progress', priority: 'High', progress: 80, stageName: 'Full Render' },
    { id: 'q2', reqId: 'REQ_B12', client: 'ANA_K.', type: 'TWITCH_EMOTES', status: 'Pending', priority: 'Medium', progress: 45, stageName: 'Base Colors' },
    { id: 'q3', reqId: 'REQ_C04', client: 'NINJA_XX', type: 'CHARACTER_CONCEPT', status: 'Pending', priority: 'Low', progress: 15, stageName: 'Initial Sketch' }
  ],
  systemState: {
    exchangeRate: 5.45,
    lastBackupTimestamp: Date.now(),
    isServerRunning: false,
    pricing: {
      halfBody: 150,
      fullBody: 250,
      icon: 80,
      custom: 300,
    },
    tosTemplate: 'standard',
    customTosText: '',
  },
  activeCategory: 'art',
  activeView: 'galerias',
  toasts: [],
  history: [],
  undo: () => set((state) => {
    if (state.history.length === 0) return state;
    const lastState = state.history[state.history.length - 1];
    return {
      ...state,
      artItems: lastState.artItems,
      videoItems: lastState.videoItems,
      nsfwItems: lastState.nsfwItems,
      heroBgImages: lastState.heroBgImages,
      socialItems: lastState.socialItems,
      history: state.history.slice(0, -1),
    };
  }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setActiveView: (view) => set({ activeView: view }),
  updateExchangeRate: (rate) => set((state) => ({ systemState: { ...state.systemState, exchangeRate: rate } })),
  updatePricing: (pricing: Partial<NonNullable<SystemState['pricing']>>) => set((state) => ({
    systemState: {
      ...state.systemState,
      pricing: { ...state.systemState.pricing!, ...pricing }
    }
  })),
  updateTos: (tosData) => set((state) => ({
    systemState: {
      ...state.systemState,
      ...(tosData.template ? { tosTemplate: tosData.template } : {}),
      ...(tosData.customText !== undefined ? { customTosText: tosData.customText } : {})
    }
  })),
  setLastBackupTimestamp: (timestamp) => set((state) => ({ systemState: { ...state.systemState, lastBackupTimestamp: timestamp } })),
  restoreBackup: (data) => set((state) => ({
    ...state,
    ...(data.artItems ? { artItems: data.artItems } : {}),
    ...(data.videoItems ? { videoItems: data.videoItems } : {}),
    ...(data.nsfwItems ? { nsfwItems: data.nsfwItems } : {}),
    ...(data.heroBgImages ? { heroBgImages: data.heroBgImages } : {}),
    ...(data.socialItems ? { socialItems: data.socialItems } : {}),
    ...(data.queueItems ? { queueItems: data.queueItems } : {}),
    ...(data.systemState ? { systemState: { ...state.systemState, ...data.systemState } } : {}),
    ...(data.activeCategory ? { activeCategory: data.activeCategory as CategoryKey } : {}),
    ...(data.activeView ? { activeView: data.activeView as ViewKey } : {}),
  })),
  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { ...toast, id: Math.random().toString(36).substring(2, 9) }]
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
  deleteItem: (category, id) => set((state) => {
    const listKey = `${category}Items` as keyof typeof state;
    const items = state[listKey] as PortfolioItem[];
    if (!items) return state;
    
    return {
      history: pushHistory(state),
      [listKey]: items.filter(item => item.id !== id).map((item, idx) => ({ ...item, index: idx }))
    };
  }),
  addItem: (category) => set((state) => {
    const listKey = category === 'hero' ? 'heroBgImages' : `${category}Items` as keyof typeof state;
    const items = state[listKey] as PortfolioItem[];
    if (!items) return state;
    
    const newItem: PortfolioItem = {
      id: Math.random().toString(36).substring(2, 9),
      index: items.length,
      type: category === 'video' ? 'video' : 'image',
      color: 'bg-zinc-800',
      iconColor: 'text-zinc-500',
      mediaUrl: '',
      double: false,
      vertical: false
    };
    
    return {
      history: pushHistory(state),
      [listKey]: [...items, newItem]
    };
  }),
  updateItem: (category, id, updates) => set((state) => {
    const listKey = category === 'hero' ? 'heroBgImages' : `${category}Items` as keyof typeof state;
    const items = state[listKey] as PortfolioItem[];
    if (!items) return state;
    
    return {
      history: pushHistory(state),
      [listKey]: items.map(item => item.id === id ? { ...item, ...updates } : item)
    };
  }),
  moveItem: (category, id, direction) => set((state) => {
    const listKey = category === 'hero' ? 'heroBgImages' : `${category}Items` as keyof typeof state;
    const items = [...(state[listKey] as PortfolioItem[])];
    if (!items) return state;
    
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1) return state;
    
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return state;
    
    const temp = items[idx];
    items[idx] = items[targetIdx];
    items[targetIdx] = temp;
    
    return {
      history: pushHistory(state),
      [listKey]: items.map((item, index) => ({ ...item, index }))
    };
  }),
  deleteItems: (category, ids) => set((state) => {
    const listKey = category === 'hero' ? 'heroBgImages' : `${category}Items` as keyof typeof state;
    const items = state[listKey] as PortfolioItem[];
    if (!items) return state;

    return {
      history: pushHistory(state),
      [listKey]: items.filter(item => !ids.includes(item.id)).map((item, idx) => ({ ...item, index: idx }))
    };
  }),
  moveItemsToCategory: (fromCategory, toCategory, ids) => set((state) => {
    if (fromCategory === toCategory) return state;

    const fromKey = fromCategory === 'hero' ? 'heroBgImages' : `${fromCategory}Items` as keyof typeof state;
    const toKey = toCategory === 'hero' ? 'heroBgImages' : `${toCategory}Items` as keyof typeof state;

    const fromItems = state[fromKey] as PortfolioItem[];
    const toItems = state[toKey] as PortfolioItem[];

    if (!fromItems || !toItems) return state;

    const movingItems = fromItems.filter(item => ids.includes(item.id));
    
    // Add to new list, updating index
    const newToItems = [...toItems, ...movingItems].map((item, idx) => ({ ...item, index: idx }));
    
    // Remove from old list, updating index
    const newFromItems = fromItems.filter(item => !ids.includes(item.id)).map((item, idx) => ({ ...item, index: idx }));

    return {
      history: pushHistory(state),
      [fromKey]: newFromItems,
      [toKey]: newToItems
    };
  }),
  addQueueItem: (item) => set((state) => ({
    history: pushHistory(state),
    queueItems: [...state.queueItems, { ...item, id: Math.random().toString(36).substring(2, 9) }]
  })),
  updateQueueItem: (id, updates) => set((state) => ({
    history: pushHistory(state),
    queueItems: state.queueItems.map(item => item.id === id ? { ...item, ...updates } : item)
  })),
  updateQueueItems: (ids, updates) => set((state) => ({
    history: pushHistory(state),
    queueItems: state.queueItems.map(item => ids.includes(item.id) ? { ...item, ...updates } : item)
  })),
  removeQueueItem: (id) => set((state) => ({
    history: pushHistory(state),
    queueItems: state.queueItems.filter(item => item.id !== id)
  })),
  removeQueueItems: (ids) => set((state) => ({
    history: pushHistory(state),
    queueItems: state.queueItems.filter(item => !ids.includes(item.id))
  })),
  reorderQueueItems: (items) => set((state) => ({
    history: pushHistory(state),
    queueItems: items
  })),
  syncFromSite: (siteItems) => set((state) => {
    const existingIds = new Set(state.artItems.map(i => i.id));
    const newItems: PortfolioItem[] = [];

    for (const siteItem of siteItems) {
      if (existingIds.has(siteItem.id)) continue;

      newItems.push({
        id: siteItem.id,
        index: state.artItems.length + newItems.length,
        type: 'image',
        title: siteItem.title,
        mediaUrl: siteItem.image,
        tags: siteItem.tags || [],
        color: 'bg-zinc-800',
        iconColor: 'text-zinc-500',
        double: false,
        vertical: false,
      });
    }

    if (newItems.length === 0) return state;

    return {
      history: pushHistory(state),
      artItems: [...state.artItems, ...newItems].map((item, idx) => ({ ...item, index: idx })),
    };
  }),
}));
