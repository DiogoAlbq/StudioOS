import { SiteConfig, SiteSection } from '../../types/site';
import type { usePortfolioStore } from '../../store/usePortfolioStore';
import type { useSettingsStore } from '../../store/useSettingsStore';

type PortfolioStore = ReturnType<typeof usePortfolioStore.getState>;
type SettingsStore = ReturnType<typeof useSettingsStore.getState>;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderHero(section: SiteSection, _portfolio: PortfolioStore, _settings: SettingsStore): string {
  const c = section.config as { title: string; subtitle: string; ctaText: string; ctaLink: string; bgImage: string; overlayOpacity: number };
  const bgStyle = c.bgImage ? `background-image:url('${esc(c.bgImage)}');background-size:cover;background-position:center;` : '';
  return `
    <section id="hero" class="hero" style="${bgStyle}">
      <div class="hero-overlay" style="opacity:${c.overlayOpacity ?? 0.6}"></div>
      <div class="hero-content">
        <h1>${esc(c.title || 'Hello World')}</h1>
        <p>${esc(c.subtitle || 'Digital Artist')}</p>
        ${c.ctaText ? `<a href="${esc(c.ctaLink || '#')}" class="btn">${esc(c.ctaText)}</a>` : ''}
      </div>
    </section>`;
}

function renderGallery(section: SiteSection, portfolio: PortfolioStore, _settings: SettingsStore): string {
  const c = section.config as { columns: number; showTitles: boolean; showTags: boolean; maxItems: number };
  const items = [
    ...portfolio.artItems.filter((i) => i.mediaUrl),
    ...portfolio.videoItems.filter((i) => i.mediaUrl),
  ].slice(0, c.maxItems || 12);
  if (items.length === 0) return `<section id="gallery" class="section"><div class="container"><h2>Gallery</h2><p class="empty">No items yet.</p></div></section>`;
  const cols = c.columns || 3;
  const cards = items.map((item) => `
      <div class="gallery-card">
        <img src="${esc(item.mediaUrl || '')}" alt="${esc(item.title || '')}" loading="lazy" />
        ${c.showTitles && item.title ? `<div class="gallery-title">${esc(item.title)}</div>` : ''}
        ${c.showTags && item.tags?.length ? `<div class="gallery-tags">${item.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      </div>`).join('');
  return `
    <section id="gallery" class="section">
      <div class="container">
        <h2>Gallery</h2>
        <div class="gallery-grid" style="grid-template-columns:repeat(${cols},1fr)">${cards}</div>
      </div>
    </section>`;
}

function renderAbout(section: SiteSection, _portfolio: PortfolioStore, _settings: SettingsStore): string {
  const c = section.config as { name: string; bio: string; avatar: string; showSocialLinks: boolean };
  return `
    <section id="about" class="section">
      <div class="container about-container">
        ${c.avatar ? `<img src="${esc(c.avatar)}" alt="${esc(c.name)}" class="about-avatar" />` : ''}
        <div>
          <h2>${esc(c.name || 'About')}</h2>
          <p>${esc(c.bio || '')}</p>
        </div>
      </div>
    </section>`;
}

function renderPricing(section: SiteSection, portfolio: PortfolioStore, _settings: SettingsStore): string {
  const c = section.config as { title: string; showExtras: boolean; currency: string };
  const p = portfolio.systemState.pricing;
  const rate = portfolio.systemState.exchangeRate || 5.45;
  const toUsd = (brl: number) => Math.round(brl / rate);
  const tiers = [
    { name: 'Icon / Portrait', brl: p.icon, details: ['1 Character', 'Base Colors', 'Simple Background'] },
    { name: 'Half-Body', brl: p.halfBody, details: ['1 Character (waist up)', 'Full Render'] },
    { name: 'Full-Body', brl: p.fullBody, details: ['1 Full Character', 'Outfit Design'] },
    { name: 'Ref Sheet', brl: p.custom, details: ['Front Design + Details', 'Color Palette'] },
  ];
  const showBrl = c.currency !== 'USD';
  const showUsd = c.currency !== 'BRL';
  const cards = tiers.map((t) => `
      <div class="pricing-card">
        <h3>${esc(t.name)}</h3>
        <div class="pricing-price">
          ${showBrl ? `<span class="brl">R$ ${t.brl}</span>` : ''}
          ${showUsd ? `<span class="usd">$ ${toUsd(t.brl)}</span>` : ''}
        </div>
        <ul>${t.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
      </div>`).join('');
  return `
    <section id="pricing" class="section">
      <div class="container">
        <h2>${esc(c.title || 'Pricing')}</h2>
        <div class="pricing-grid">${cards}</div>
      </div>
    </section>`;
}

function renderQueue(section: SiteSection, portfolio: PortfolioStore, _settings: SettingsStore): string {
  const c = section.config as { title: string; showProgress: boolean; showClientNames: boolean; maxItems: number };
  const statusMap: Record<string, { label: string; cls: string }> = {
    'Pending': { label: 'Queued', cls: 'status-queued' },
    'In Progress': { label: 'In Progress', cls: 'status-progress' },
    'Completed': { label: 'Completed', cls: 'status-done' },
  };
  const items = portfolio.queueItems.slice(0, c.maxItems || 10);
  if (items.length === 0) return `<section id="queue" class="section"><div class="container"><h2>${esc(c.title || 'Queue')}</h2><p class="empty">No commissions in queue.</p></div></section>`;
  const rows = items.map((item) => {
    const st = statusMap[item.status] || statusMap['Pending'];
    return `
      <div class="queue-row">
        <span class="queue-id">${esc(item.reqId)}</span>
        ${c.showClientNames ? `<span class="queue-client">${esc(item.client)}</span>` : ''}
        <span class="queue-type">${esc(item.type)}</span>
        <span class="queue-status ${st.cls}">${st.label}</span>
        ${c.showProgress ? `<div class="queue-progress"><div class="queue-progress-bar" style="width:${item.progress}%"></div></div>` : ''}
      </div>`;
  }).join('');
  return `
    <section id="queue" class="section">
      <div class="container">
        <h2>${esc(c.title || 'Commission Queue')}</h2>
        <div class="queue-list">${rows}</div>
      </div>
    </section>`;
}

function renderTos(section: SiteSection, _portfolio: PortfolioStore, _settings: SettingsStore): string {
  const c = section.config as { title: string; template: string; customText: string };
  let lines: string[];
  if (c.template === 'custom' && c.customText) {
    lines = c.customText.split('\n').filter((l) => l.trim());
  } else {
    lines = [
      '1. Payment 50% upfront via PayPal or Pix. Rest on completion.',
      '2. Up to 3 free revisions during base colors/lineart stage.',
      '3. Delivery time varies from 1 to 3 weeks depending on complexity.',
      '4. I do not draw: extreme NSFW, hyper-realistic mecha, heavy gore.',
    ];
  }
  return `
    <section id="tos" class="section">
      <div class="container">
        <h2>${esc(c.title || 'Terms of Service')}</h2>
        <ol class="tos-list">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
      </div>
    </section>`;
}

function renderContact(section: SiteSection, _portfolio: PortfolioStore, _settings: SettingsStore): string {
  const c = section.config as { title: string; email: string; discord: string; whatsapp: string };
  const links: string[] = [];
  if (c.email) links.push(`<a href="mailto:${esc(c.email)}" class="contact-link">Email</a>`);
  if (c.discord) links.push(`<span class="contact-link">Discord: ${esc(c.discord)}</span>`);
  if (c.whatsapp) links.push(`<a href="https://wa.me/${esc(c.whatsapp.replace(/\D/g, ''))}" class="contact-link" target="_blank">WhatsApp</a>`);
  return `
    <section id="contact" class="section">
      <div class="container">
        <h2>${esc(c.title || 'Contact')}</h2>
        <div class="contact-links">${links.join('')}</div>
      </div>
    </section>`;
}

function renderSocial(section: SiteSection, _portfolio: PortfolioStore, _settings: SettingsStore): string {
  const c = section.config as { title: string; links: { id: string; url: string; label: string }[]; style: string };
  if (!c.links?.length) return '';
  const items = c.links.filter((l) => l.url).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener" class="social-link">${esc(l.label || l.id)}</a>`).join('');
  return `
    <section id="social" class="section">
      <div class="container">
        <h2>${esc(c.title || 'Social')}</h2>
        <div class="social-links">${items}</div>
      </div>
    </section>`;
}

function renderFooter(section: SiteSection, _portfolio: PortfolioStore, _settings: SettingsStore): string {
  const c = section.config as { text: string; showYear: boolean; copyrightName: string };
  const year = c.showYear ? new Date().getFullYear() : '';
  return `
    <footer class="footer">
      <div class="container">
        <p>&copy; ${year} ${esc(c.copyrightName || '')} ${esc(c.text || '')}</p>
      </div>
    </footer>`;
}

const RENDERERS: Record<string, (s: SiteSection, p: PortfolioStore, st: SettingsStore) => string> = {
  hero: renderHero,
  gallery: renderGallery,
  about: renderAbout,
  pricing: renderPricing,
  queue: renderQueue,
  tos: renderTos,
  contact: renderContact,
  social: renderSocial,
  footer: renderFooter,
  faq: () => '',
};

function generateCss(theme: SiteConfig['theme']): string {
  const rMap = { none: '0', sm: '4px', md: '8px', lg: '16px', full: '9999px' };
  const sMap = { compact: '4rem', normal: '6rem', relaxed: '8rem' };
  return `
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:${theme.bgColor};color:${theme.textColor};font-family:'${theme.bodyFont}',sans-serif;line-height:1.6}
    h1,h2,h3,h4{font-family:'${theme.headingFont}',sans-serif;font-weight:700}
    .container{max-width:1100px;margin:0 auto;padding:0 1.5rem}
    .section{padding:${sMap[theme.spacing]} 0}
    .btn{display:inline-block;padding:0.75rem 2rem;background:${theme.accentColor};color:#fff;border-radius:${rMap[theme.borderRadius]};text-decoration:none;font-weight:600;transition:opacity 0.2s}
    .btn:hover{opacity:0.9}
    .hero{position:relative;min-height:70vh;display:flex;align-items:center;justify-content:center;text-align:center}
    .hero-overlay{position:absolute;inset:0;background:${theme.bgColor}}
    .hero-content{position:relative;z-index:1;padding:2rem}
    .hero-content h1{font-size:3rem;margin-bottom:0.5rem}
    .hero-content p{font-size:1.25rem;color:${theme.secondaryColor};margin-bottom:1.5rem}
    .gallery-grid{display:grid;gap:1rem;margin-top:1.5rem}
    .gallery-card{border-radius:${rMap[theme.borderRadius]};overflow:hidden;background:${theme.bgColor};border:1px solid ${theme.secondaryColor}20}
    .gallery-card img{width:100%;aspect-ratio:4/3;object-fit:cover}
    .gallery-title{padding:0.5rem 0.75rem;font-size:0.875rem;font-weight:500}
    .gallery-tags{padding:0 0.75rem 0.5rem;display:flex;gap:0.25rem;flex-wrap:wrap}
    .tag{font-size:0.625rem;padding:0.125rem 0.375rem;border-radius:${rMap[theme.borderRadius]};background:${theme.accentColor}20;color:${theme.accentColor}}
    .about-container{display:flex;align-items:center;gap:2rem}
    .about-avatar{width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid ${theme.accentColor}}
    .pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:1.5rem}
    .pricing-card{padding:1.5rem;border-radius:${rMap[theme.borderRadius]};border:1px solid ${theme.secondaryColor}20;background:${theme.bgColor}}
    .pricing-card h3{margin-bottom:0.5rem;color:${theme.accentColor}}
    .pricing-price{font-size:1.5rem;font-weight:700;margin-bottom:1rem}
    .pricing-price .brl{margin-right:0.5rem}
    .pricing-card ul{list-style:none;padding:0}
    .pricing-card li{padding:0.25rem 0;font-size:0.875rem;color:${theme.secondaryColor}}
    .queue-list{margin-top:1.5rem}
    .queue-row{display:flex;align-items:center;gap:1rem;padding:0.75rem;border-bottom:1px solid ${theme.secondaryColor}15}
    .queue-id{font-family:monospace;font-size:0.75rem;color:${theme.accentColor}}
    .queue-status{font-size:0.75rem;padding:0.125rem 0.5rem;border-radius:${rMap[theme.borderRadius]}}
    .status-queued{background:${theme.secondaryColor}20;color:${theme.secondaryColor}}
    .status-progress{background:#3b82f620;color:#3b82f6}
    .status-done{background:#10b98120;color:#10b981}
    .queue-progress{flex:1;height:4px;border-radius:2px;background:${theme.secondaryColor}20;overflow:hidden}
    .queue-progress-bar{height:100%;background:${theme.accentColor};transition:width 0.3s}
    .tos-list{padding-left:1.5rem;margin-top:1rem}
    .tos-list li{padding:0.375rem 0;color:${theme.secondaryColor}}
    .contact-links{display:flex;gap:1rem;flex-wrap:wrap;margin-top:1rem}
    .contact-link{padding:0.5rem 1rem;border-radius:${rMap[theme.borderRadius]};background:${theme.accentColor}15;color:${theme.accentColor};text-decoration:none;font-weight:500}
    .social-links{display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1rem}
    .social-link{padding:0.5rem 1rem;border-radius:${rMap[theme.borderRadius]};background:${theme.secondaryColor}15;color:${theme.textColor};text-decoration:none;font-size:0.875rem}
    .footer{text-align:center;padding:2rem 0;color:${theme.secondaryColor};font-size:0.875rem;border-top:1px solid ${theme.secondaryColor}15}
    .empty{color:${theme.secondaryColor};text-align:center;padding:2rem 0}
  `;
}

function generateGaScript(id: string): string {
  if (!id) return '';
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(id)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(id)}');</script>`;
}

export function generateSiteHtml(config: SiteConfig, portfolio: PortfolioStore, settings: SettingsStore): string {
  const sorted = [...config.sections].filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const sectionsHtml = sorted.map((s) => {
    const renderer = RENDERERS[s.type];
    return renderer ? renderer(s, portfolio, settings) : '';
  }).join('\n');
  const css = generateCss(config.theme);
  const ga = generateGaScript(config.meta.googleAnalyticsId);
  const langAttr = config.language === 'bilingual' ? 'en' : config.language;
  return `<!DOCTYPE html>
<html lang="${langAttr}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(config.meta.title)}</title>
<meta name="description" content="${esc(config.meta.description)}">
${config.meta.ogImage ? `<meta property="og:image" content="${esc(config.meta.ogImage)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=${config.theme.headingFont?.replace(/ /g, '+')}:wght@400;700&family=${config.theme.bodyFont?.replace(/ /g, '+')}:wght@400;500;700&display=swap" rel="stylesheet">
<style>${css}</style>
${config.customCSS ? `<style>${config.customCSS}</style>` : ''}
${ga}
</head>
<body>
${sectionsHtml}
${config.customHTML || ''}
</body>
</html>`;
}
