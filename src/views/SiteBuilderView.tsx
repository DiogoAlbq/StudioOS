import { useState, useCallback, useEffect, useMemo } from 'react';
import { Layout, Palette, Layers, Eye, Rocket, ChevronDown, ChevronUp, GripVertical, Plus, Trash2, Power, PowerOff, Settings, Monitor, Tablet, Smartphone } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useSiteStore } from '../store/useSiteStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { generateSiteHtml } from '../lib/siteBuilder/renderer';
import { TEMPLATE_PREVIEWS, SECTION_LABELS, SiteTemplate, SectionType, DEFAULT_SITE_THEME } from '../types/site';
import { cn } from '../lib/utils';
import { logger } from '../lib/logger';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'motion/react';

type BuilderTab = 'template' | 'theme' | 'sections' | 'seo' | 'preview' | 'deploy';

const TEMPLATES: SiteTemplate[] = ['minimal', 'bold', 'artistic', 'neon', 'custom'];
const SECTION_TYPES: SectionType[] = ['hero', 'gallery', 'about', 'pricing', 'queue', 'tos', 'contact', 'social', 'footer'];

export function SiteBuilderView() {
  const { config, isDirty, isDeploying, selectedSectionId, previewDevice, updateTemplate, updateTheme, updateMeta, addSection, removeSection, toggleSection, reorderSections, updateSectionConfig, setSelectedSection, setPreviewDevice, setDeploying, setDeployUrl, resetConfig, markDirty } = useSiteStore();
  const portfolioStore = usePortfolioStore();
  const settings = useSettingsStore();
  const [activeTab, setActiveTab] = useState<BuilderTab>('template');
  const [previewHtml, setPreviewHtml] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const selectedSection = useMemo(
    () => config.sections.find((s) => s.id === selectedSectionId) ?? null,
    [config.sections, selectedSectionId]
  );

  useEffect(() => {
    try {
      const html = generateSiteHtml(config, portfolioStore, settings);
      setPreviewHtml(html);
    } catch (err) {
      logger.error('siteBuilder', 'Failed to generate preview', { error: String(err) });
    }
  }, [config, portfolioStore.artItems, portfolioStore.videoItems, portfolioStore.nsfwItems, portfolioStore.queueItems, portfolioStore.systemState]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleMoveSection = useCallback((id: string, direction: 'up' | 'down') => {
    const sections = [...config.sections].sort((a, b) => a.order - b.order);
    const idx = sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const temp = sections[idx];
    sections[idx] = sections[targetIdx];
    sections[targetIdx] = temp;
    reorderSections(sections);
  }, [config.sections, reorderSections]);

  const handleDeploy = useCallback(async () => {
    const pat = settings.githubPat;
    const owner = settings.githubUsername;
    const repo = settings.githubRepo;
    if (!pat || !owner || !repo) {
      portfolioStore.addToast({ type: 'error', message: 'Configure GitHub in Settings first.' });
      return;
    }
    setDeploying(true);
    try {
      const html = generateSiteHtml(config, portfolioStore, settings);
      await invoke('github_create_or_update_file', {
        pat,
        owner,
        repo,
        path: 'index.html',
        content: html,
        message: 'StudioOS v3: update site',
        branch: 'main',
      });
      const siteUrl = `https://${owner}.github.io/${repo}/`;
      setDeployUrl(siteUrl);
      portfolioStore.addToast({ type: 'success', message: `Site deployed to ${siteUrl}` });
      markDirty();
    } catch (err) {
      portfolioStore.addToast({ type: 'error', message: `Deploy failed: ${err}` });
    } finally {
      setDeploying(false);
    }
  }, [config, portfolioStore, settings, setDeploying, setDeployUrl, markDirty]);

  const handleSaveConfig = useCallback(async () => {
    try {
      await invoke('save_site_config_cmd', { config });
      portfolioStore.addToast({ type: 'success', message: 'Site config saved.' });
    } catch {
      portfolioStore.addToast({ type: 'info', message: 'Config stored locally (backend not available yet).' });
    }
  }, [config, portfolioStore]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] animate-in fade-in duration-500">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800/60 bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <Layout size={20} className="text-violet-400" />
          <h2 className="text-lg font-semibold text-white">Site Builder</h2>
          <Badge variant={isDirty ? 'warning' : 'success'}>{isDirty ? 'Unsaved' : 'Saved'}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetConfig}>Reset</Button>
          <Button variant="secondary" size="sm" onClick={handleSaveConfig}>Save Config</Button>
          <Button variant="primary" size="sm" onClick={handleDeploy} isLoading={isDeploying}>
            <Rocket size={14} className="mr-1" /> Deploy
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-zinc-800/40 bg-zinc-950/50">
        {([
          { id: 'template' as BuilderTab, icon: Layout, label: 'Template' },
          { id: 'theme' as BuilderTab, icon: Palette, label: 'Theme' },
          { id: 'sections' as BuilderTab, icon: Layers, label: 'Sections' },
          { id: 'seo' as BuilderTab, icon: Settings, label: 'SEO' },
          { id: 'preview' as BuilderTab, icon: Eye, label: 'Preview' },
        ]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeTab === id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button onClick={() => setPreviewDevice('mobile')} className={cn('p-1.5 rounded', previewDevice === 'mobile' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300')}><Smartphone size={14} /></button>
          <button onClick={() => setPreviewDevice('tablet')} className={cn('p-1.5 rounded', previewDevice === 'tablet' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300')}><Tablet size={14} /></button>
          <button onClick={() => setPreviewDevice('desktop')} className={cn('p-1.5 rounded', previewDevice === 'desktop' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300')}><Monitor size={14} /></button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-80 border-r border-zinc-800/60 bg-zinc-950/30 overflow-y-auto custom-scrollbar flex-shrink-0">
          {activeTab === 'template' && (
            <TemplatePanel template={config.template} onSelect={updateTemplate} />
          )}
          {activeTab === 'theme' && (
            <ThemePanel theme={config.theme} onChange={updateTheme} />
          )}
          {activeTab === 'sections' && (
            <SectionsPanel
              sections={config.sections}
              selectedId={selectedSectionId}
              onSelect={setSelectedSection}
              onToggle={toggleSection}
              onMove={handleMoveSection}
              onAdd={addSection}
              onRemove={removeSection}
              expanded={expandedSections}
              onToggleExpand={handleToggleExpand}
            />
          )}
          {activeTab === 'seo' && (
            <SEOPanel meta={config.meta} language={config.language} onChange={updateMeta} onLanguageChange={(lang) => useSiteStore.getState().setConfig({ ...config, language: lang, updatedAt: new Date().toISOString() })} />
          )}
          {activeTab === 'preview' && (
            <div className="p-4 space-y-3">
              <p className="text-xs text-zinc-500">Preview is shown on the right panel.</p>
            </div>
          )}
        </div>

        {/* Center - Live Preview */}
        <div className="flex-1 bg-zinc-950 flex items-center justify-center p-4 overflow-auto">
          <div className={cn(
            'bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300',
            previewDevice === 'mobile' && 'w-[375px] h-[667px]',
            previewDevice === 'tablet' && 'w-[768px] h-[600px]',
            previewDevice === 'desktop' && 'w-full h-full max-w-[1200px]',
          )}>
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title="Site Preview"
              sandbox="allow-scripts"
            />
          </div>
        </div>

        {/* Right Panel - Section Editor */}
        <div className="w-80 border-l border-zinc-800/60 bg-zinc-950/30 overflow-y-auto custom-scrollbar flex-shrink-0">
          {selectedSection ? (
            <SectionEditor section={selectedSection} onChange={(cfg) => updateSectionConfig(selectedSection.id, cfg)} />
          ) : (
            <div className="p-6 text-center text-zinc-500">
              <Settings size={32} className="mx-auto mb-3 text-zinc-700" />
              <p className="text-sm">Select a section to edit its settings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Template Panel ───────────── */
function TemplatePanel({ template, onSelect }: { template: SiteTemplate; onSelect: (t: SiteTemplate) => void }) {
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-medium text-white mb-3">Choose Template</h3>
      {TEMPLATES.map((t) => {
        const info = TEMPLATE_PREVIEWS[t];
        return (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className={cn(
              'w-full text-left p-3 rounded-lg border transition-all',
              template === t
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {info.colors.map((c, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border border-zinc-700" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{info.label}</p>
                <p className="text-xs text-zinc-500">{info.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Theme Panel ───────────── */
function ThemePanel({ theme, onChange }: { theme: typeof DEFAULT_SITE_THEME; onChange: (t: Partial<typeof DEFAULT_SITE_THEME>) => void }) {
  const colorFields = [
    { key: 'primaryColor', label: 'Primary' },
    { key: 'secondaryColor', label: 'Secondary' },
    { key: 'accentColor', label: 'Accent' },
    { key: 'bgColor', label: 'Background' },
    { key: 'textColor', label: 'Text' },
  ] as const;

  const fontOptions = ['Inter', 'Space Grotesk', 'Playfair Display', 'JetBrains Mono', 'Lora', 'Outfit', 'Sora'];
  const radiusOptions = ['none', 'sm', 'md', 'lg', 'full'] as const;
  const spacingOptions = ['compact', 'normal', 'relaxed'] as const;

  return (
    <div className="p-4 space-y-5">
      <h3 className="text-sm font-medium text-white">Colors</h3>
      {colorFields.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between">
          <label className="text-xs text-zinc-400">{label}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme[key]}
              onChange={(e) => onChange({ [key]: e.target.value })}
              className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={theme[key]}
              onChange={(e) => onChange({ [key]: e.target.value })}
              className="w-24 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 font-mono"
            />
          </div>
        </div>
      ))}

      <div className="pt-3 border-t border-zinc-800/60 space-y-3">
        <h3 className="text-sm font-medium text-white">Typography</h3>
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">Heading Font</label>
          <select value={theme.headingFont} onChange={(e) => onChange({ headingFont: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100">
            {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">Body Font</label>
          <select value={theme.bodyFont} onChange={(e) => onChange({ bodyFont: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100">
            {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="pt-3 border-t border-zinc-800/60 space-y-3">
        <h3 className="text-sm font-medium text-white">Shape</h3>
        <div className="flex gap-2">
          {radiusOptions.map((r) => (
            <button key={r} onClick={() => onChange({ borderRadius: r })} className={cn('px-3 py-1.5 rounded-md text-xs border transition-colors', theme.borderRadius === r ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600')}>
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {spacingOptions.map((s) => (
            <button key={s} onClick={() => onChange({ spacing: s })} className={cn('px-3 py-1.5 rounded-md text-xs border transition-colors', theme.spacing === s ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600')}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Sections Panel ───────────── */
interface SectionsPanelProps {
  sections: import('../types/site').SiteSection[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToggle: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onAdd: (type: SectionType) => void;
  onRemove: (id: string) => void;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
}

function SectionsPanel({ sections, selectedId, onSelect, onToggle, onMove, onAdd, onRemove, expanded, onToggleExpand }: SectionsPanelProps) {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white">Sections</h3>
        <Button variant="secondary" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={14} />
        </Button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-2 gap-2 pb-3">
              {SECTION_TYPES.map((type) => {
                const label = SECTION_LABELS[type];
                return (
                  <button key={type} onClick={() => { onAdd(type); setShowAdd(false); }} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 text-left transition-colors">
                    <span className="text-xs text-zinc-300">{label.pt}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1">
        {sorted.map((section, idx) => {
          const label = SECTION_LABELS[section.type];
          const isSelected = section.id === selectedId;
          const isExpanded = expanded.has(section.id);
          return (
            <div
              key={section.id}
              className={cn(
                'rounded-lg border transition-all',
                isSelected ? 'border-violet-500 bg-violet-500/10' : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
              )}
            >
              <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => onSelect(isSelected ? null : section.id)}>
                <GripVertical size={14} className="text-zinc-600 cursor-grab" />
                <span className="text-xs text-zinc-300 flex-1">{label.pt}</span>
                <button onClick={(e) => { e.stopPropagation(); onToggle(section.id); }} className="text-zinc-500 hover:text-zinc-300">
                  {section.enabled ? <Power size={12} className="text-emerald-400" /> : <PowerOff size={12} className="text-zinc-600" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onToggleExpand(section.id); }} className="text-zinc-500 hover:text-zinc-300">
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-2 flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onMove(section.id, 'up')} disabled={idx === 0}>Up</Button>
                      <Button variant="ghost" size="sm" onClick={() => onMove(section.id, 'down')} disabled={idx === sorted.length - 1}>Down</Button>
                      <div className="flex-1" />
                      <Button variant="danger" size="sm" onClick={() => onRemove(section.id)}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── SEO Panel ───────────── */
function SEOPanel({ meta, language, onChange, onLanguageChange }: { meta: import('../types/site').SiteMeta; language: string; onChange: (m: Partial<import('../types/site').SiteMeta>) => void; onLanguageChange: (l: 'pt' | 'en' | 'bilingual') => void }) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-medium text-white">SEO & Meta</h3>
      <div className="space-y-2">
        <label className="text-xs text-zinc-400">Site Title</label>
        <input value={meta.title} onChange={(e) => onChange({ title: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100" />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-400">Description</label>
        <textarea value={meta.description} onChange={(e) => onChange({ description: e.target.value })} rows={3} className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 resize-none" />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-400">OG Image URL</label>
        <input value={meta.ogImage} onChange={(e) => onChange({ ogImage: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 font-mono" />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-400">Custom Domain</label>
        <input value={meta.customDomain} onChange={(e) => onChange({ customDomain: e.target.value })} placeholder="example.com" className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 font-mono" />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-400">Google Analytics ID</label>
        <input value={meta.googleAnalyticsId} onChange={(e) => onChange({ googleAnalyticsId: e.target.value })} placeholder="G-XXXXXXXXXX" className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 font-mono" />
      </div>
      <div className="pt-3 border-t border-zinc-800/60 space-y-2">
        <label className="text-xs text-zinc-400">Language</label>
        <div className="flex gap-2">
          {(['pt', 'en', 'bilingual'] as const).map((l) => (
            <button key={l} onClick={() => onLanguageChange(l)} className={cn('px-3 py-1.5 rounded-md text-xs border transition-colors', language === l ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-zinc-800 text-zinc-400')}>
              {l === 'bilingual' ? 'Both' : l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Section Editor (Right Panel) ───────────── */
function SectionEditor({ section, onChange }: { section: import('../types/site').SiteSection; onChange: (cfg: Record<string, unknown>) => void }) {
  const label = SECTION_LABELS[section.type];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">{label.pt} Settings</h3>
        <Badge variant="default">{section.type}</Badge>
      </div>

      {section.type === 'hero' && <HeroEditor config={section.config} onChange={onChange} />}
      {section.type === 'gallery' && <GalleryEditor config={section.config} onChange={onChange} />}
      {section.type === 'about' && <AboutEditor config={section.config} onChange={onChange} />}
      {section.type === 'pricing' && <PricingEditor config={section.config} onChange={onChange} />}
      {section.type === 'queue' && <QueueEditor config={section.config} onChange={onChange} />}
      {section.type === 'tos' && <TosEditor config={section.config} onChange={onChange} />}
      {section.type === 'contact' && <ContactEditor config={section.config} onChange={onChange} />}
      {section.type === 'social' && <SocialEditor config={section.config} onChange={onChange} />}
      {section.type === 'footer' && <FooterEditor config={section.config} onChange={onChange} />}
    </div>
  );
}

/* ───────────── Per-Section Editors ───────────── */
function HeroEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1"><label className="text-xs text-zinc-400">Title</label><input value={config.title as string} onChange={(e) => onChange({ ...config, title: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Subtitle</label><input value={config.subtitle as string} onChange={(e) => onChange({ ...config, subtitle: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">CTA Text</label><input value={config.ctaText as string} onChange={(e) => onChange({ ...config, ctaText: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">CTA Link</label><input value={config.ctaLink as string} onChange={(e) => onChange({ ...config, ctaLink: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100 font-mono" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Background Image URL</label><input value={config.bgImage as string} onChange={(e) => onChange({ ...config, bgImage: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100 font-mono" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Overlay Opacity: {config.overlayOpacity as number}</label><input type="range" min={0} max={1} step={0.1} value={config.overlayOpacity as number} onChange={(e) => onChange({ ...config, overlayOpacity: parseFloat(e.target.value) })} className="w-full" /></div>
    </div>
  );
}

function GalleryEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1"><label className="text-xs text-zinc-400">Columns</label><select value={config.columns as number} onChange={(e) => onChange({ ...config, columns: parseInt(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100"><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Max Items</label><input type="number" value={config.maxItems as number} onChange={(e) => onChange({ ...config, maxItems: parseInt(e.target.value) || 12 })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={config.showTitles as boolean} onChange={(e) => onChange({ ...config, showTitles: e.target.checked })} className="rounded" /> Show Titles</label>
      <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={config.showTags as boolean} onChange={(e) => onChange({ ...config, showTags: e.target.checked })} className="rounded" /> Show Tags</label>
    </div>
  );
}

function AboutEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1"><label className="text-xs text-zinc-400">Name</label><input value={config.name as string} onChange={(e) => onChange({ ...config, name: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Bio</label><textarea value={config.bio as string} onChange={(e) => onChange({ ...config, bio: e.target.value })} rows={4} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100 resize-none" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Avatar URL</label><input value={config.avatar as string} onChange={(e) => onChange({ ...config, avatar: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100 font-mono" /></div>
      <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={config.showSocialLinks as boolean} onChange={(e) => onChange({ ...config, showSocialLinks: e.target.checked })} className="rounded" /> Show Social Links</label>
    </div>
  );
}

function PricingEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1"><label className="text-xs text-zinc-400">Title</label><input value={config.title as string} onChange={(e) => onChange({ ...config, title: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={config.showExtras as boolean} onChange={(e) => onChange({ ...config, showExtras: e.target.checked })} className="rounded" /> Show Extras</label>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Currency</label><select value={config.currency as string} onChange={(e) => onChange({ ...config, currency: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100"><option value="both">Both</option><option value="BRL">BRL</option><option value="USD">USD</option></select></div>
    </div>
  );
}

function QueueEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1"><label className="text-xs text-zinc-400">Title</label><input value={config.title as string} onChange={(e) => onChange({ ...config, title: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Max Items</label><input type="number" value={config.maxItems as number} onChange={(e) => onChange({ ...config, maxItems: parseInt(e.target.value) || 10 })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={config.showProgress as boolean} onChange={(e) => onChange({ ...config, showProgress: e.target.checked })} className="rounded" /> Show Progress</label>
      <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={config.showClientNames as boolean} onChange={(e) => onChange({ ...config, showClientNames: e.target.checked })} className="rounded" /> Show Client Names</label>
    </div>
  );
}

function TosEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1"><label className="text-xs text-zinc-400">Title</label><input value={config.title as string} onChange={(e) => onChange({ ...config, title: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Template</label><select value={config.template as string} onChange={(e) => onChange({ ...config, template: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100"><option value="standard">Standard</option><option value="strict">Strict</option><option value="relaxed">Relaxed</option><option value="custom">Custom</option></select></div>
      {config.template === 'custom' && <div className="space-y-1"><label className="text-xs text-zinc-400">Custom Text</label><textarea value={config.customText as string} onChange={(e) => onChange({ ...config, customText: e.target.value })} rows={6} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100 resize-none font-mono" /></div>}
    </div>
  );
}

function ContactEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1"><label className="text-xs text-zinc-400">Title</label><input value={config.title as string} onChange={(e) => onChange({ ...config, title: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Email</label><input value={config.email as string} onChange={(e) => onChange({ ...config, email: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100 font-mono" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Discord</label><input value={config.discord as string} onChange={(e) => onChange({ ...config, discord: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">WhatsApp</label><input value={config.whatsapp as string} onChange={(e) => onChange({ ...config, whatsapp: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
    </div>
  );
}

function SocialEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const links = (config.links as { id: string; url: string; label: string }[]) || [];
  return (
    <div className="space-y-3">
      <div className="space-y-1"><label className="text-xs text-zinc-400">Title</label><input value={config.title as string} onChange={(e) => onChange({ ...config, title: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Style</label><select value={config.style as string} onChange={(e) => onChange({ ...config, style: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100"><option value="icons">Icons</option><option value="buttons">Buttons</option><option value="minimal">Minimal</option></select></div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-400">Links</label>
        {links.map((link, i) => (
          <div key={i} className="flex gap-1">
            <input value={link.label} onChange={(e) => { const next = [...links]; next[i] = { ...next[i], label: e.target.value }; onChange({ ...config, links: next }); }} placeholder="Label" className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100" />
            <input value={link.url} onChange={(e) => { const next = [...links]; next[i] = { ...next[i], url: e.target.value }; onChange({ ...config, links: next }); }} placeholder="URL" className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 font-mono" />
            <button onClick={() => { const next = links.filter((_, j) => j !== i); onChange({ ...config, links: next }); }} className="text-zinc-600 hover:text-red-400"><Trash2 size={12} /></button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => onChange({ ...config, links: [...links, { id: `social-${Date.now()}`, url: '', label: '' }] })}>+ Add Link</Button>
      </div>
    </div>
  );
}

function FooterEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1"><label className="text-xs text-zinc-400">Text</label><input value={config.text as string} onChange={(e) => onChange({ ...config, text: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Copyright Name</label><input value={config.copyrightName as string} onChange={(e) => onChange({ ...config, copyrightName: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100" /></div>
      <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={config.showYear as boolean} onChange={(e) => onChange({ ...config, showYear: e.target.checked })} className="rounded" /> Show Year</label>
    </div>
  );
}
