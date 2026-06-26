export type SiteTemplate = 'minimal' | 'bold' | 'artistic' | 'neon' | 'custom';

export type SectionType =
  | 'hero'
  | 'gallery'
  | 'about'
  | 'pricing'
  | 'tos'
  | 'queue'
  | 'contact'
  | 'social'
  | 'faq'
  | 'footer';

export interface HeroConfig {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  bgImage: string;
  overlayOpacity: number;
}

export interface GalleryConfig {
  columns: 2 | 3 | 4;
  showTitles: boolean;
  showTags: boolean;
  filterByCategory: boolean;
  categories: string[];
  maxItems: number;
}

export interface AboutConfig {
  name: string;
  bio: string;
  avatar: string;
  showSocialLinks: boolean;
}

export interface PricingConfig {
  title: string;
  showExtras: boolean;
  currency: 'BRL' | 'USD' | 'both';
}

export interface TosConfig {
  title: string;
  template: 'standard' | 'strict' | 'relaxed' | 'custom';
  customText: string;
}

export interface QueueConfig {
  title: string;
  showProgress: boolean;
  showClientNames: boolean;
  maxItems: number;
}

export interface ContactConfig {
  title: string;
  email: string;
  discord: string;
  whatsapp: string;
  formService: 'mailto' | 'formspree' | 'none';
  formspreeId: string;
}

export interface SocialConfig {
  title: string;
  links: { id: string; url: string; label: string }[];
  style: 'icons' | 'buttons' | 'minimal';
}

export interface FaqConfig {
  title: string;
  items: { question: string; answer: string }[];
}

export interface FooterConfig {
  text: string;
  showYear: boolean;
  copyrightName: string;
}

export type SectionConfig =
  | HeroConfig
  | GalleryConfig
  | AboutConfig
  | PricingConfig
  | TosConfig
  | QueueConfig
  | ContactConfig
  | SocialConfig
  | FaqConfig
  | FooterConfig;

export interface SiteSection {
  id: string;
  type: SectionType;
  enabled: boolean;
  order: number;
  config: Record<string, unknown>;
}

export interface SiteTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  spacing: 'compact' | 'normal' | 'relaxed';
}

export interface SiteMeta {
  title: string;
  description: string;
  ogImage: string;
  favicon: string;
  customDomain: string;
  googleAnalyticsId: string;
}

export interface SiteConfig {
  id: string;
  template: SiteTemplate;
  theme: SiteTheme;
  meta: SiteMeta;
  sections: SiteSection[];
  customCSS: string;
  customHTML: string;
  language: 'pt' | 'en' | 'bilingual';
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_SITE_THEME: SiteTheme = {
  primaryColor: '#ffffff',
  secondaryColor: '#a1a1aa',
  accentColor: '#f43f5e',
  bgColor: '#0a0a0a',
  textColor: '#ffffff',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  borderRadius: 'md',
  spacing: 'normal',
};

export const DEFAULT_SITE_META: SiteMeta = {
  title: 'My Portfolio',
  description: 'Digital artist portfolio and commissions',
  ogImage: '',
  favicon: '',
  customDomain: '',
  googleAnalyticsId: '',
};

export function createDefaultSections(): SiteSection[] {
  return [
    { id: 'hero-1', type: 'hero', enabled: true, order: 0, config: { title: 'Hello World!', subtitle: 'Digital Artist & Illustrator', ctaText: 'View Gallery', ctaLink: '#gallery', bgImage: '', overlayOpacity: 0.6 } as HeroConfig },
    { id: 'gallery-1', type: 'gallery', enabled: true, order: 1, config: { columns: 3, showTitles: true, showTags: true, filterByCategory: false, categories: [], maxItems: 12 } as GalleryConfig },
    { id: 'about-1', type: 'about', enabled: true, order: 2, config: { name: 'Artist', bio: 'Digital artist specializing in character illustration and concept art.', avatar: '', showSocialLinks: true } as AboutConfig },
    { id: 'pricing-1', type: 'pricing', enabled: true, order: 3, config: { title: 'Commission Prices', showExtras: true, currency: 'both' } as PricingConfig },
    { id: 'queue-1', type: 'queue', enabled: true, order: 4, config: { title: 'Commission Queue', showProgress: true, showClientNames: false, maxItems: 10 } as QueueConfig },
    { id: 'tos-1', type: 'tos', enabled: true, order: 5, config: { title: 'Terms of Service', template: 'standard', customText: '' } as TosConfig },
    { id: 'contact-1', type: 'contact', enabled: true, order: 6, config: { title: 'Get in Touch', email: '', discord: '', whatsapp: '', formService: 'mailto', formspreeId: '' } as ContactConfig },
    { id: 'social-1', type: 'social', enabled: true, order: 7, config: { title: 'Follow Me', links: [], style: 'icons' } as SocialConfig },
    { id: 'footer-1', type: 'footer', enabled: true, order: 8, config: { text: 'All rights reserved', showYear: true, copyrightName: '' } as FooterConfig },
  ];
}

export function createDefaultSiteConfig(): SiteConfig {
  return {
    id: 'site-default',
    template: 'bold',
    theme: { ...DEFAULT_SITE_THEME },
    meta: { ...DEFAULT_SITE_META },
    sections: createDefaultSections(),
    customCSS: '',
    customHTML: '',
    language: 'bilingual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const SECTION_LABELS: Record<SectionType, { pt: string; en: string; icon: string }> = {
  hero: { pt: 'Hero', en: 'Hero', icon: 'Layout' },
  gallery: { pt: 'Galeria', en: 'Gallery', icon: 'Image' },
  about: { pt: 'Sobre', en: 'About', icon: 'User' },
  pricing: { pt: 'Precos', en: 'Pricing', icon: 'DollarSign' },
  tos: { pt: 'Termos', en: 'Terms', icon: 'FileText' },
  queue: { pt: 'Fila', en: 'Queue', icon: 'ListOrdered' },
  contact: { pt: 'Contato', en: 'Contact', icon: 'Mail' },
  social: { pt: 'Social', en: 'Social', icon: 'Share2' },
  faq: { pt: 'FAQ', en: 'FAQ', icon: 'HelpCircle' },
  footer: { pt: 'Rodape', en: 'Footer', icon: 'Minus' },
};

export const TEMPLATE_PREVIEWS: Record<SiteTemplate, { label: string; description: string; colors: string[] }> = {
  minimal: { label: 'Minimal', description: 'Clean and simple', colors: ['#ffffff', '#000000', '#666666'] },
  bold: { label: 'Bold', description: 'Dark and impactful', colors: ['#0a0a0a', '#ffffff', '#f43f5e'] },
  artistic: { label: 'Artistic', description: 'Organic and warm', colors: ['#faf8f5', '#2d2926', '#c4956a'] },
  neon: { label: 'Neon', description: 'Cyberpunk vibes', colors: ['#09090b', '#ffffff', '#06b6d4'] },
  custom: { label: 'Custom', description: 'Build from scratch', colors: ['#000000', '#ffffff', '#888888'] },
};
