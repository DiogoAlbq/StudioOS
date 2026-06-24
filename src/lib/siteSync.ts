import { usePortfolioStore } from '../store/usePortfolioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { pushSiteData } from './github';
import { logger } from './logger';

let isDirty = false;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;
let onStatusChange: ((status: { isDirty: boolean; isSyncing: boolean }) => void) | null = null;

export function getSiteSyncStatus() {
  return { isDirty, isSyncing };
}

export function onSiteSyncStatusChange(callback: (status: { isDirty: boolean; isSyncing: boolean }) => void) {
  onStatusChange = callback;
  return () => { onStatusChange = null; };
}

function notifyStatusChange() {
  onStatusChange?.({ isDirty, isSyncing });
}

export function markDirty() {
  if (!isDirty) {
    isDirty = true;
    notifyStatusChange();
  }
}

function buildSiteData() {
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

  return { portfolio, config, queue, pricing: pricingJson };
}

async function performSync() {
  if (isSyncing) return;

  const settings = useSettingsStore.getState();
  const pat = settings.githubPat;
  const owner = settings.githubUsername;
  const repo = settings.githubRepo;

  if (!pat || !owner || !repo) {
    isDirty = false;
    notifyStatusChange();
    return;
  }

  isSyncing = true;
  notifyStatusChange();

  try {
    const siteData = buildSiteData();
    const result = await pushSiteData(pat, owner, repo, siteData);
    if (result.success) {
      isDirty = false;
      logger.info('siteSync', 'Auto-sync completed', { repo });
      usePortfolioStore.getState().addToast({ type: 'success', message: 'Site sincronizado automaticamente.' });
    } else {
      logger.error('siteSync', 'Auto-sync failed', { errors: result.errors });
      usePortfolioStore.getState().addToast({ type: 'error', message: 'Falha na sincronização automática.' });
    }
  } catch (err) {
    logger.error('siteSync', 'Auto-sync error', { error: String(err) });
  } finally {
    isSyncing = false;
    notifyStatusChange();
  }
}

export function scheduleSync(delayMs = 5000) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncTimeout = null;
    performSync();
  }, delayMs);
}

export function forceSyncNow() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  performSync();
}
