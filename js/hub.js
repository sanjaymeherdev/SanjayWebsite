import { renderVideos } from './tab-videos.js';
import { renderGallery } from './tab-gallery.js';
import { openViewer, closeViewer, isViewerOpen } from './viewer.js';

const $ = s => document.querySelector(s);
const panel = $('#panel');
const TABS = ['videos', 'characters', 'models'];
const cache = {};
let site = null;

const load = name => cache[name] ??= fetch(`data/${name}.json`)
  .then(r => { if (!r.ok) throw new Error(`data/${name}.json (${r.status})`); return r.json(); });

export function waLink(context) {
  const msg = context
    ? `Hi ${site.name.split(' ')[0]}, I saw "${context}" on your Blender portfolio and want to talk about a project.`
    : `Hi ${site.name.split(' ')[0]}, I saw your Blender portfolio and want to talk about a project.`;
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}`;
}
const setWa = ctx => { $('#waHead').href = $('#waFab').href = waLink(ctx); };

let shownTab = null;
async function route() {
  const [t, sub] = location.hash.slice(1).split('/').map(decodeURIComponent);
  const tab = TABS.includes(t) ? t : site.defaultTab;
  document.querySelectorAll('.tab').forEach(b => {
    const on = b.dataset.tab === tab;
    b.setAttribute('aria-selected', on);
    b.tabIndex = on ? 0 : -1;
  });
  panel.setAttribute('aria-labelledby', `tab-${tab}`);
  setWa();
  try {
    if (tab === 'videos') {
      closeViewer(true);
      const videos = await load('videos');
      renderVideos(panel, videos, site.videoSections, sub, s => { location.hash = `videos/${s}`; });
      shownTab = tab;
    } else {
      const items = await load(tab);
      if (shownTab !== tab) {
        renderGallery(panel, items, tab, id => { location.hash = `${tab}/${id}`; });
        shownTab = tab;
      }
      const item = sub && items.find(i => i.id === sub);
      if (item) openViewer(item, tab, site, waLink(item.title), () => { location.hash = tab; });
      else closeViewer(true);
    }
  } catch (e) {
    panel.innerHTML = `<div class="empty">Couldn't load this section.<br><code>${String(e.message).replace(/</g, '&lt;')}</code></div>`;
  }
}

document.querySelectorAll('.tab').forEach(b => {
  b.addEventListener('click', () => { location.hash = b.dataset.tab; });
  b.addEventListener('keydown', e => {
    const i = TABS.indexOf(b.dataset.tab);
    const j = e.key === 'ArrowRight' ? (i + 1) % 3 : e.key === 'ArrowLeft' ? (i + 2) % 3 : -1;
    if (j >= 0) { e.preventDefault(); location.hash = TABS[j]; $(`#tab-${TABS[j]}`).focus(); }
  });
});
window.addEventListener('hashchange', route);

fetch('data/site.json').then(r => r.json()).then(s => {
  site = s;
  $('#vLegal').textContent = s.copyright;
  route();
}).catch(e => { panel.innerHTML = `<div class="empty">Couldn't load <code>data/site.json</code>: ${e.message}</div>`; });
