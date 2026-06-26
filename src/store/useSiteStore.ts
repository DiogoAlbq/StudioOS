import { create } from 'zustand';
import { SiteConfig, SiteSection, SiteTheme, SiteMeta, SiteTemplate, SectionType, createDefaultSiteConfig } from '../types/site';
import { logger } from '../lib/logger';

interface SiteStore {
  config: SiteConfig;
  isDirty: boolean;
  isDeploying: boolean;
  deployUrl: string | null;
  previewHtml: string | null;
  selectedSectionId: string | null;
  previewDevice: 'mobile' | 'tablet' | 'desktop';

  setConfig: (config: SiteConfig) => void;
  updateTemplate: (template: SiteTemplate) => void;
  updateTheme: (theme: Partial<SiteTheme>) => void;
  updateMeta: (meta: Partial<SiteMeta>) => void;
  addSection: (type: SectionType) => void;
  removeSection: (id: string) => void;
  toggleSection: (id: string) => void;
  reorderSections: (sections: SiteSection[]) => void;
  updateSectionConfig: (id: string, config: Record<string, unknown>) => void;
  setSelectedSection: (id: string | null) => void;
  setPreviewDevice: (device: 'mobile' | 'tablet' | 'desktop') => void;
  setPreviewHtml: (html: string | null) => void;
  setDeploying: (deploying: boolean) => void;
  setDeployUrl: (url: string | null) => void;
  markDirty: () => void;
  markClean: () => void;
  loadConfig: (config: SiteConfig) => void;
  resetConfig: () => void;
}

let idCounter = 0;
function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

export const useSiteStore = create<SiteStore>((set) => ({
  config: createDefaultSiteConfig(),
  isDirty: false,
  isDeploying: false,
  deployUrl: null,
  previewHtml: null,
  selectedSectionId: null,
  previewDevice: 'desktop',

  setConfig: (config) => set({ config, isDirty: true }),

  updateTemplate: (template) => set((state) => ({
    config: { ...state.config, template, updatedAt: new Date().toISOString() },
    isDirty: true,
  })),

  updateTheme: (theme) => set((state) => ({
    config: {
      ...state.config,
      theme: { ...state.config.theme, ...theme },
      updatedAt: new Date().toISOString(),
    },
    isDirty: true,
  })),

  updateMeta: (meta) => set((state) => ({
    config: {
      ...state.config,
      meta: { ...state.config.meta, ...meta },
      updatedAt: new Date().toISOString(),
    },
    isDirty: true,
  })),

  addSection: (type) => set((state) => {
    const newSection: SiteSection = {
      id: genId(type),
      type,
      enabled: true,
      order: state.config.sections.length,
      config: getDefaultConfigForType(type),
    };
    return {
      config: {
        ...state.config,
        sections: [...state.config.sections, newSection],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
      selectedSectionId: newSection.id,
    };
  }),

  removeSection: (id) => set((state) => ({
    config: {
      ...state.config,
      sections: state.config.sections
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i })),
      updatedAt: new Date().toISOString(),
    },
    isDirty: true,
    selectedSectionId: state.selectedSectionId === id ? null : state.selectedSectionId,
  })),

  toggleSection: (id) => set((state) => ({
    config: {
      ...state.config,
      sections: state.config.sections.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      ),
      updatedAt: new Date().toISOString(),
    },
    isDirty: true,
  })),

  reorderSections: (sections) => set((state) => ({
    config: {
      ...state.config,
      sections: sections.map((s, i) => ({ ...s, order: i })),
      updatedAt: new Date().toISOString(),
    },
    isDirty: true,
  })),

  updateSectionConfig: (id, config) => set((state) => ({
    config: {
      ...state.config,
      sections: state.config.sections.map((s) =>
        s.id === id ? { ...s, config: { ...s.config, ...config } } : s
      ),
      updatedAt: new Date().toISOString(),
    },
    isDirty: true,
  })),

  setSelectedSection: (id) => set({ selectedSectionId: id }),
  setPreviewDevice: (device) => set({ previewDevice: device }),
  setPreviewHtml: (html) => set({ previewHtml: html }),
  setDeploying: (deploying) => set({ isDeploying: deploying }),
  setDeployUrl: (url) => set({ deployUrl: url }),
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),

  loadConfig: (config) => set({ config, isDirty: false }),

  resetConfig: () => {
    const fresh = createDefaultSiteConfig();
    set({ config: fresh, isDirty: true, selectedSectionId: null });
    logger.info('siteBuilder', 'Config reset to defaults');
  },
}));

function getDefaultConfigForType(type: SectionType): Record<string, unknown> {
  switch (type) {
    case 'hero':
      return { title: 'Hello World!', subtitle: 'Digital Artist', ctaText: 'View Gallery', ctaLink: '#gallery', bgImage: '', overlayOpacity: 0.6 };
    case 'gallery':
      return { columns: 3, showTitles: true, showTags: true, filterByCategory: false, categories: [], maxItems: 12 };
    case 'about':
      return { name: 'Artist', bio: 'Digital artist and illustrator.', avatar: '', showSocialLinks: true };
    case 'pricing':
      return { title: 'Commission Prices', showExtras: true, currency: 'both' };
    case 'tos':
      return { title: 'Terms of Service', template: 'standard', customText: '' };
    case 'queue':
      return { title: 'Commission Queue', showProgress: true, showClientNames: false, maxItems: 10 };
    case 'contact':
      return { title: 'Get in Touch', email: '', discord: '', whatsapp: '', formService: 'mailto', formspreeId: '' };
    case 'social':
      return { title: 'Follow Me', links: [], style: 'icons' };
    case 'faq':
      return { title: 'FAQ', items: [] };
    case 'footer':
      return { text: 'All rights reserved', showYear: true, copyrightName: '' };
    default:
      return {};
  }
}
