// components.js — Unified Header & Footer (business site only, Godot content removed)
// Single navigation + dark/light theme across all pages.
// Usage: <div id="sanjay-header"></div>  and  <div id="sanjay-footer"></div>

(function () {

    // ─── BASE PATH ────────────────────────────────────────────────────
    // Returns '../' for any page inside a subfolder, './' for root-level pages
    function getBasePath() {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);
        return segments.length >= 2 ? '../' : './';
    }

    const base = getBasePath();
    const WA_NUMBER = '918984636695'; // canonical business WhatsApp number

    // ─── THEME (dark/light) ─────────────────────────────────────────
    // Uses the same localStorage key + body class ('light-theme') as style.css
    // so root pages that already ship light-theme CSS keep working unchanged.
    function getTheme() {
        return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
    }
    function applyTheme(theme) {
        document.body.classList.toggle('light-theme', theme === 'light');
        const icon = theme === 'light' ? '☀️' : '🌙';
        document.querySelectorAll('.sm-theme-icon').forEach(el => el.textContent = icon);
    }
    function toggleTheme() {
        const next = document.body.classList.contains('light-theme') ? 'dark' : 'light';
        localStorage.setItem('theme', next);
        applyTheme(next);
    }
    // Apply immediately (before header/footer paint) to avoid a flash of the wrong theme.
    applyTheme(getTheme());

    // ─── SHARED STYLES ────────────────────────────────────────────────
    const SHARED_CSS = `
<style>
/* ── Theme variables (component chrome only) ── */
:root {
    --sm-bg:        rgba(15,15,26,0.97);
    --sm-bg-solid:  #0d0d1a;
    --sm-bg-elev:   #1a1a2e;
    --sm-bg-card:   #16161f;
    --sm-border:    rgba(255,255,255,0.07);
    --sm-border-2:  rgba(255,255,255,0.1);
    --sm-text:      #ffffff;
    --sm-text-2:    #a0a0c0;
    --sm-text-3:    #888;
    --sm-text-4:    #666;
    --sm-accent:    #8B5CF6;
    --sm-accent-hover: #7C3AED;
    --sm-hover-bg:  rgba(255,255,255,0.07);
    --sm-drop-hover:rgba(139,92,246,0.18);
}
body.light-theme {
    --sm-bg:        rgba(255,255,255,0.97);
    --sm-bg-solid:  #ffffff;
    --sm-bg-elev:   #ffffff;
    --sm-bg-card:   #f5f5f7;
    --sm-border:    rgba(0,0,0,0.08);
    --sm-border-2:  rgba(0,0,0,0.1);
    --sm-text:      #0f0f1a;
    --sm-text-2:    #52527a;
    --sm-text-3:    #6a6a8a;
    --sm-text-4:    #8a8aa8;
    --sm-hover-bg:  rgba(0,0,0,0.05);
    --sm-drop-hover:rgba(139,92,246,0.12);
}

/* ── Reset / base ── */
.sm-header *, .sm-footer *, #sm-drawer * { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Header shell ── */
.sm-header {
    background: var(--sm-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 1000;
    border-bottom: 1px solid var(--sm-border);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: background 0.2s, border-color 0.2s;
}
.sm-header .sm-inner {
    max-width: 1280px; margin: 0 auto; padding: 0 1.5rem;
    display: flex; align-items: center; justify-content: space-between;
    height: 58px; gap: 1rem;
}

/* ── Logo ── */
.sm-logo { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; flex-shrink: 0; }
.sm-logo-text { font-size: 1.15rem; font-weight: 700; color: var(--sm-text); }
.sm-logo-text span { color: var(--sm-accent); }

/* ── Desktop nav ── */
.sm-nav { display: flex; align-items: center; gap: 0.1rem; flex: 1; justify-content: center; }
.sm-nav a, .sm-nav .sm-drop-btn {
    color: var(--sm-text-2); text-decoration: none; font-size: 0.875rem; font-weight: 500;
    padding: 0.45rem 0.7rem; border-radius: 6px; transition: all 0.15s;
    background: none; border: none; cursor: pointer; font-family: inherit;
    white-space: nowrap; display: flex; align-items: center; gap: 0.3rem;
}
.sm-nav a:hover, .sm-nav .sm-drop-btn:hover,
.sm-nav a.active { color: var(--sm-text); background: var(--sm-hover-bg); }

/* ── Dropdown ── */
.sm-dropdown { position: relative; }
.sm-drop-arrow { font-size: 0.6rem; opacity: 0.6; transition: transform 0.2s; }
.sm-dropdown:hover .sm-drop-arrow { transform: rotate(180deg); }
.sm-dropdown-menu {
    display: none; position: absolute; top: calc(100% + 6px); left: 50%;
    transform: translateX(-50%);
    background: var(--sm-bg-elev); border: 1px solid var(--sm-border-2);
    border-radius: 12px; padding: 0.4rem; min-width: 240px; z-index: 200;
    box-shadow: 0 12px 40px rgba(0,0,0,0.35);
}
.sm-dropdown-menu a {
    display: flex; align-items: center; gap: 0.65rem;
    padding: 0.6rem 0.9rem; border-radius: 8px;
    color: var(--sm-text-2); font-size: 0.85rem; text-decoration: none;
    transition: background 0.15s, color 0.15s; white-space: nowrap;
}
.sm-dropdown-menu a .sm-drop-icon { font-size: 1rem; flex-shrink: 0; }
.sm-dropdown-menu a:hover { background: var(--sm-drop-hover); color: var(--sm-text); }
.sm-dropdown::after {
    content: ''; position: absolute; bottom: -8px; left: 0;
    width: 100%; height: 8px;
}

/* ── CTA + theme toggle ── */
.sm-ctas { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
.sm-btn-primary {
    background: var(--sm-accent); color: #fff; padding: 0.45rem 1.1rem;
    border-radius: 8px; font-size: 0.85rem; font-weight: 600;
    text-decoration: none; transition: background 0.2s, transform 0.15s;
    white-space: nowrap;
}
.sm-btn-primary:hover { background: var(--sm-accent-hover); transform: translateY(-1px); }
.sm-theme-btn {
    background: var(--sm-bg-card); border: 1px solid var(--sm-border-2);
    color: var(--sm-text); width: 34px; height: 34px; border-radius: 8px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 1rem; flex-shrink: 0; transition: border-color 0.15s, transform 0.15s;
}
.sm-theme-btn:hover { border-color: var(--sm-accent); transform: translateY(-1px); }

/* ── Mobile hamburger ── */
.sm-hamburger {
    display: none; background: none; border: none; cursor: pointer;
    color: var(--sm-text); padding: 0.4rem; border-radius: 6px; flex-shrink: 0;
}
.sm-hamburger:hover { background: var(--sm-hover-bg); }
.sm-hamburger svg { display: block; }

/* ── Mobile drawer ── */
#sm-drawer {
    position: fixed; top: 0; right: -100%; width: min(340px, 88vw);
    height: 100%; height: 100dvh; background: var(--sm-bg-solid); z-index: 99999;
    transition: right 0.28s cubic-bezier(.4,0,.2,1);
    overflow-y: auto; box-shadow: -4px 0 24px rgba(0,0,0,0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#sm-drawer.open { right: 0; }
#sm-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    z-index: 99998; display: none; backdrop-filter: blur(2px);
}
#sm-overlay.open { display: block; }
body.sm-no-scroll { overflow: hidden; }

.sm-drawer-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--sm-border);
}
.sm-drawer-logo { font-size: 1rem; font-weight: 700; color: var(--sm-text); }
.sm-drawer-logo span { color: var(--sm-accent); }
.sm-drawer-close {
    background: var(--sm-hover-bg); border: none; color: var(--sm-text);
    width: 32px; height: 32px; border-radius: 6px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; transition: background 0.15s;
}
.sm-drawer-close:hover { background: var(--sm-drop-hover); }

.sm-drawer-body { padding: 0.5rem 0.75rem 1rem; }
.sm-drawer-section-label {
    font-size: 0.68rem; font-weight: 700; color: var(--sm-accent);
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 0.75rem 0.75rem 0.3rem;
}
.sm-drawer-body a {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.6rem 0.75rem; border-radius: 8px;
    color: var(--sm-text-2); text-decoration: none; font-size: 0.875rem;
    transition: background 0.15s, color 0.15s;
}
.sm-drawer-body a:hover { background: var(--sm-drop-hover); color: var(--sm-text); }
.sm-drawer-divider { height: 1px; background: var(--sm-border); margin: 0.4rem 0.5rem; }
.sm-drawer-ctas { padding: 0.75rem; display: flex; gap: 0.6rem; }
.sm-drawer-ctas a {
    flex: 1; display: block; text-align: center; padding: 0.7rem;
    border-radius: 8px; font-weight: 600; font-size: 0.88rem;
    text-decoration: none; background: var(--sm-accent); color: #fff;
    transition: background 0.2s;
}
.sm-drawer-ctas a:hover { background: var(--sm-accent-hover); }
.sm-drawer-ctas button.sm-theme-btn { flex: none; width: 46px; height: auto; }

/* ── Footer ── */
.sm-footer {
    background: var(--sm-bg-solid);
    border-top: 1px solid var(--sm-border);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin-top: 4rem;
    transition: background 0.2s, border-color 0.2s;
}
.sm-footer .sm-f-inner { max-width: 1280px; margin: 0 auto; padding: 2.5rem 1.5rem 1.5rem; }
.sm-footer .sm-f-top {
    display: grid; grid-template-columns: 2fr repeat(4, 1fr);
    gap: 2rem; margin-bottom: 2rem;
}
.sm-footer h4 { font-size: 0.78rem; font-weight: 700; color: var(--sm-accent); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.75rem; }
.sm-footer p { font-size: 0.85rem; color: var(--sm-text-3); line-height: 1.6; }
.sm-footer a { display: block; font-size: 0.85rem; color: var(--sm-text-3); text-decoration: none; margin-bottom: 0.4rem; transition: color 0.15s; }
.sm-footer a:hover { color: var(--sm-accent); }
.sm-footer .sm-f-social { display: flex; gap: 0.6rem; margin-top: 0.75rem; }
.sm-footer .sm-f-social a { display: inline-flex; margin-bottom: 0; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 8px; background: var(--sm-hover-bg); border: 1px solid var(--sm-border-2); transition: all 0.2s; }
.sm-footer .sm-f-social a:hover { background: var(--sm-drop-hover); border-color: var(--sm-accent); }
.sm-footer .sm-f-social a svg path { fill: var(--sm-text-3); }
.sm-footer .sm-f-bottom {
    border-top: 1px solid var(--sm-border);
    padding-top: 1.25rem; display: flex;
    justify-content: space-between; align-items: center;
    gap: 1rem; flex-wrap: wrap;
}
.sm-footer .sm-f-legal { display: flex; gap: 1rem; flex-wrap: wrap; }
.sm-footer .sm-f-legal a { display: inline; font-size: 0.78rem; color: var(--sm-text-4); margin-bottom: 0; }
.sm-footer .sm-f-legal a:hover { color: var(--sm-accent); }
.sm-footer .sm-f-copy { font-size: 0.78rem; color: var(--sm-text-4); }

/* ── Responsive ── */
@media (max-width: 960px) {
    .sm-nav, .sm-ctas > .sm-btn-primary { display: none !important; }
    .sm-hamburger { display: flex; }
    .sm-footer .sm-f-top { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 540px) {
    .sm-footer .sm-f-top { grid-template-columns: 1fr; }
    .sm-footer .sm-f-bottom { flex-direction: column; align-items: flex-start; }
}
</style>`;

    // ─── UNIFIED NAV CONFIG (business site only) ───────────────────────
    const NAV_LINKS = [
        { label: 'About', href: `${base}about.html` },
        { label: 'Portfolio',
         dropdown: [
                { icon: '🎥', label: 'Video Editing',         href: `${base}editing-portfolio.html` },
                { icon: '🧊', label: 'Blender',          href: `${base}blender.html` },
                { icon: '🎮', label: 'Roblox',           href: `${base}roblox.html` },
                { icon: '💼', label: 'Graphic Design',   href: `${base}designs/gallery.html` },
                { icon: '💼', label: 'AI Reels',   href: `https://sanjaymeher-ai-reels.vercel.app` },
            ] 
        },
        { label: 'SMM', href: `${base}marketing/digital-services.html` },
        {
            label: 'Services',
            dropdown: [
                { icon: '⚙️', label: 'All Services',         href: `${base}services.html` },
                { icon: '💳', label: 'Payment Gateway Setup',href: `${base}services/payment_gateway.html` },
                { icon: '📋', label: 'Client & Task Manager',href: `${base}services/smadmin.html` },
                { icon: '📣', label: 'Digital Marketing Agent', href: `${base}marketing/digital-services.html` },
            ]
        },
        { label: 'Products', href: `${base}products.html` },

        {
            label: 'Tech Tools',
            dropdown: [
                { icon: '💬', label: 'WaBlast Pro — CRM',   href: `${base}marketing/wablast.html` },
                { icon: '🏢', label: 'YourMate — Coaching Suite',      href: `${base}marketing/yourmate.html` },
            ]
        },
         {
            label: 'Courses',
            dropdown: [
                { icon: '⚙️', label: 'Development',         href: `${base}course/index.html` },
                { icon: '🔄', label: 'Video Editing',   href: `${base}course/video-editing.html` },
                { icon: '💳', label: 'Blender',href: `${base}course/blenderai.html` },
                { icon: '📋', label: 'Automation',href: `${base}course/n8n-course.html` },
                { icon: '📣', label: 'FREE AI Mastery', href: `${base}course/free-ai-tools.html` },
            ]
        },
        
        { label: 'Contact',   href: `${base}contact.html` },
    ];

    // ─── RENDER DESKTOP NAV LINKS ─────────────────────────────────────
    function desktopLinks() {
        return NAV_LINKS.map(l => {
            if (l.dropdown) {
                const items = l.dropdown.map(d =>
                    `<a href="${d.href}"><span class="sm-drop-icon">${d.icon}</span>${d.label}</a>`
                ).join('');
                return `
                <div class="sm-dropdown" data-drop>
                    <button class="sm-drop-btn">${l.label} <span class="sm-drop-arrow">▼</span></button>
                    <div class="sm-dropdown-menu">${items}</div>
                </div>`;
            }
            const active = window.location.pathname.endsWith(l.href.replace(/^\.\.?\//, '/')) ? ' class="active"' : '';
            return `<a href="${l.href}"${active}>${l.label}</a>`;
        }).join('');
    }

    // ─── RENDER MOBILE DRAWER LINKS ──────────────────────────────────
    function drawerLinks() {
        let html = '';
        NAV_LINKS.forEach(l => {
            if (l.dropdown) {
                html += `<div class="sm-drawer-section-label">${l.label}</div>`;
                l.dropdown.forEach(d => {
                    html += `<a href="${d.href}"><span>${d.icon}</span>${d.label}</a>`;
                });
                html += `<div class="sm-drawer-divider"></div>`;
            } else {
                html += `<a href="${l.href}">${l.label}</a>`;
            }
        });
        return html;
    }

    // ─── RENDER HEADER ────────────────────────────────────────────────
    function renderHeader() {
        return `
<header class="sm-header" role="banner">
    <div class="sm-inner">
        <a href="${base}index.html" class="sm-logo">
            <span class="sm-logo-text">Sanjay<span>Meher</span></span>
        </a>

        <nav class="sm-nav" aria-label="Main">
            ${desktopLinks()}
        </nav>

        <div class="sm-ctas">
            <button class="sm-theme-btn" id="sm-theme-toggle" aria-label="Switch theme" title="Switch theme">
                <span class="sm-theme-icon">🌙</span>
            </button>
            <a href="https://wa.me/${WA_NUMBER}" class="sm-btn-primary">💬 WhatsApp</a>
        </div>

        <button class="sm-hamburger" id="sm-open" aria-label="Open menu" aria-expanded="false">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
        </button>
    </div>
</header>

<!-- Mobile drawer -->
<div id="sm-overlay" role="presentation"></div>
<nav id="sm-drawer" aria-label="Mobile navigation">
    <div class="sm-drawer-head">
        <span class="sm-drawer-logo">Sanjay<span>Meher</span></span>
        <button class="sm-drawer-close" id="sm-close" aria-label="Close menu">✕</button>
    </div>
    <div class="sm-drawer-body">${drawerLinks()}</div>
    <div class="sm-drawer-ctas">
        <a href="https://wa.me/${WA_NUMBER}">💬 WhatsApp</a>
        <button class="sm-theme-btn" id="sm-theme-toggle-mobile" aria-label="Switch theme" title="Switch theme">
            <span class="sm-theme-icon">🌙</span>
        </button>
    </div>
</nav>`;
    }

    // ─── RENDER FOOTER ────────────────────────────────────────────────
    function renderFooter() {
        const year = new Date().getFullYear();
        return `
<footer class="sm-footer">
    <div class="sm-f-inner">
        <div class="sm-f-top">
            <div>
                <h4>SanjayMeherDev</h4>
                <p style="margin-bottom:0.75rem">Apps, automation, AI, video editing, graphic design &amp; social media for businesses. Fixed price. Pay only after it works. Built in India 🇮🇳 for the world.</p>
                <div class="sm-f-social">
                    <a href="https://youtube.com/@Champ_gaming" target="_blank" rel="noopener" aria-label="YouTube">
                        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
                    </a>
                    <a href="https://github.com/sanjaymeherdev" target="_blank" rel="noopener" aria-label="GitHub">
                        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.7 18 5 18 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z"/></svg>
                    </a>
                    <a href="https://instagram.com/freelance.sanjay" target="_blank" rel="noopener" aria-label="Instagram">
                        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8 0 3.2 0 3.6-.1 4.8-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.9.1-3.2 0-3.6 0-4.8-.1-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12c0-3.2 0-3.6.1-4.8C2.4 3.9 4 2.3 7.2 2.3c1.3-.1 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1.0 8.3 0 8.7 0 12c0 3.3 0 3.7.1 4.9.2 4.4 2.6 6.8 7 7C8.3 24 8.7 24 12 24c3.3 0 3.7 0 4.9-.1 4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9 0-3.3 0-3.7-.1-4.9C23.7 2.7 21.3.3 16.9.1 15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 12 5.8zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z"/></svg>
                    </a>
                </div>
            </div>
            <div>
                <h4>Services</h4>
                <a href="${base}services.html">⚙️ All Services</a>
                <a href="${base}services/payment_gateway.html">💳 Payment Gateway</a>
                <a href="${base}services/smadmin.html">📋 Client &amp; Task Manager</a>
                <a href="${base}marketing/digital-services.html">📣 Social Media Mgmt</a>
            </div>
            <div>
                <h4>Products</h4>
                <a href="${base}products.html">🧰 All Products</a>
            </div>
            <div>
                <h4>Company</h4>
                <a href="${base}about.html">👤 About</a>
                <a href="${base}editing-portfolio.html">🎬 Portfolio</a>
                <a href="${base}marketing/digital-services.html">📣 SMM</a>
                <a href="${base}contact.html">📧 Contact</a>
            </div>
        </div>
        <div class="sm-f-bottom">
            <div class="sm-f-legal">
                <a href="${base}legal/terms.html">Terms</a>
                <a href="${base}legal/privacy.html">Privacy</a>
                <a href="${base}legal/license.html">License</a>
                <a href="${base}legal/client-policy.html">Client Policy</a>
                <a href="${base}legal/data-privacy.html">Data Practices</a>
            </div>
            <span class="sm-f-copy">© ${year} SanjayMeherDev · Made in India 🇮🇳</span>
        </div>
    </div>
</footer>`;
    }

    // ─── INIT INTERACTIONS ────────────────────────────────────────────
    function initInteractions() {
        const open    = document.getElementById('sm-open');
        const close   = document.getElementById('sm-close');
        const drawer  = document.getElementById('sm-drawer');
        const overlay = document.getElementById('sm-overlay');

        function openDrawer()  {
            drawer.classList.add('open');
            overlay.classList.add('open');
            document.body.classList.add('sm-no-scroll');
            open && open.setAttribute('aria-expanded', 'true');
        }
        function closeDrawer() {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
            document.body.classList.remove('sm-no-scroll');
            open && open.setAttribute('aria-expanded', 'false');
        }

        open    && open.addEventListener('click', openDrawer);
        close   && close.addEventListener('click', closeDrawer);
        overlay && overlay.addEventListener('click', closeDrawer);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

        // Close drawer automatically when a nav link inside it is tapped
        drawer && drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));

        // Desktop dropdowns — hover with bridge delay
        document.querySelectorAll('.sm-dropdown[data-drop]').forEach(dd => {
            const menu = dd.querySelector('.sm-dropdown-menu');
            let timer;
            const show = () => { clearTimeout(timer); menu.style.display = 'block'; };
            const hide = () => { timer = setTimeout(() => { menu.style.display = 'none'; }, 120); };
            dd.addEventListener('mouseenter', show);
            dd.addEventListener('mouseleave', hide);
            menu.addEventListener('mouseenter', show);
            menu.addEventListener('mouseleave', hide);
        });

        // Theme toggle (desktop + drawer buttons)
        const t1 = document.getElementById('sm-theme-toggle');
        const t2 = document.getElementById('sm-theme-toggle-mobile');
        t1 && t1.addEventListener('click', toggleTheme);
        t2 && t2.addEventListener('click', toggleTheme);
        applyTheme(getTheme()); // sync icon glyphs now that they exist in the DOM
    }

    // ─── INJECT ───────────────────────────────────────────────────────
    function inject() {
        const headerEl = document.getElementById('sanjay-header');
        const footerEl = document.getElementById('sanjay-footer');

        if (headerEl || footerEl) {
            document.head.insertAdjacentHTML('beforeend', SHARED_CSS);
        }
        if (headerEl) {
            headerEl.innerHTML = renderHeader();
            initInteractions();
        }
        if (footerEl) {
            footerEl.innerHTML = renderFooter();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }

})();
