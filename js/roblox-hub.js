// Controller for roblox.html. Same pattern as hub.js: hash routing (#tab or #tab/id), JSON data + Supabase GLB uploads.
import { renderVideoList } from './tab-videos.js';
import { renderGallery } from './tab-gallery.js';
import { renderAddons } from './tab-addons.js';
import { renderClients } from './tab-clients.js';
import { openViewer, closeViewer } from './viewer.js';
import { listModels } from './supa.js';

const $ = s => document.querySelector(s);
const panel = $('#panel');

// type: 'videos' | 'clients' | 'gallery' | 'addons'.
// 'videos' lists every Roblox entry of data/videos.json (shorts and long films together).
// 'clients' reads data/clients.json (private Drive videos with a watermark).
// gallery tabs read data/<data>.json and every Supabase folder in `kinds` (uploads go to the "roblox-*" folders).
// 'characters' also lists the existing "characters" folder; drop it from `kinds` if those are not Roblox characters.
const TABS = [
  { key: 'videos',     type: 'videos',  empty: 'No Roblox videos yet.<br>Add entries with <code>"section": "roblox"</code> to <code>data/videos.json</code> (<code>"format"</code> is <code>short</code> or <code>long</code>).' },
  { key: 'clients',    type: 'clients', data: 'clients' },
  { key: 'characters', type: 'gallery', data: 'roblox-characters', kinds: ['roblox-characters', 'characters'], label: 'characters' },
  { key: 'animations', type: 'gallery', data: 'roblox-animations', kinds: ['roblox-animations'], label: 'animation packs' },
  { key: 'addons',     type: 'addons',  data: 'roblox-addons' },
];
const OLD_KEYS = { shorts: 'videos', long: 'videos' };
const cache = {};
let site = null, shownTab = null;

const getJson = name => (cache['j:' + name] ??= fetch(`data/${name}.json`)
  .then(r => { if (!r.ok) throw new Error(`data/${name}.json (${r.status})`); return r.json(); }));

const loadGallery = t => (cache['g:' + t.key] ??= Promise.all([getJson(t.data), ...t.kinds.map(listModels)]).then(([local, ...remote]) => {
  const seen = new Set();
  return local.concat(...remote).filter(i => !seen.has(i.id) && seen.add(i.id));
}));

export function waLink(context) {
  const first = site.name.split(' ')[0];
  const msg = context
    ? `Hi ${first}, I saw "${context}" on your Roblox portfolio and want to talk about a project.`
    : `Hi ${first}, I saw your Roblox portfolio and want to talk about a project.`;
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}`;
}
const setWa = ctx => { $('#waHead').href = $('#waFab').href = waLink(ctx); };

async function route() {
  const [k0, sub] = location.hash.slice(1).split('/').map(decodeURIComponent);
  const k = OLD_KEYS[k0] || k0;   // keep old #shorts / #long links working
  const tab = TABS.find(t => t.key === k) || TABS[0];
  document.querySelectorAll('.tab[data-tab]').forEach(b => {
    const on = b.dataset.tab === tab.key;
    b.setAttribute('aria-selected', on);
    b.tabIndex = on ? 0 : -1;
  });
  panel.setAttribute('aria-labelledby', `tab-${tab.key}`);
  setWa();
  try {
    if (tab.type === 'gallery') {
      const items = await loadGallery(tab);
      if (shownTab !== tab.key) {
        renderGallery(panel, items, tab.key, id => { location.hash = `${tab.key}/${id}`; }, tab.label);
        shownTab = tab.key;
      }
      const item = sub && items.find(i => i.id === sub);
      if (item) openViewer(item, tab.key, site, waLink(item.title), () => { location.hash = tab.key; });
      else closeViewer(true);
      return;
    }
    closeViewer(true);
    if (tab.type === 'videos') {
      renderVideoList(panel, (await getJson('videos')).filter(v => v.section === 'roblox'), tab.empty);
    } else if (tab.type === 'clients') {
      renderClients(panel, await getJson(tab.data));
    } else {
      renderAddons(panel, await getJson(tab.data), waLink);
    }
    shownTab = tab.key;
  } catch (e) {
    panel.innerHTML = `<div class="empty">Couldn't load this section.<br><code>${String(e.message).replace(/</g, '&lt;')}</code></div>`;
  }
}

document.querySelectorAll('.tab[data-tab]').forEach(b => {
  b.addEventListener('click', () => { location.hash = b.dataset.tab; });
  b.addEventListener('keydown', e => {
    const i = TABS.findIndex(t => t.key === b.dataset.tab), n = TABS.length;
    const j = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i + n - 1) % n : -1;
    if (j >= 0) { e.preventDefault(); location.hash = TABS[j].key; $(`#tab-${TABS[j].key}`).focus(); }
  });
});
window.addEventListener('hashchange', route);
addEventListener('models-updated', () => { TABS.filter(t => t.type === 'gallery').forEach(t => delete cache['g:' + t.key]); shownTab = null; });
$('#uploadBtn').addEventListener('click', () => $('#uploadFile').click());
$('#uploadFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  openViewer({ title: f.name.replace(/\.glb$/i, ''), buffer: await f.arrayBuffer() }, 'models', site, waLink(), () => { shownTab = null; route(); });
});

getJson('site').then(s => { site = s; return route(); })
  .catch(e => { panel.innerHTML = `<div class="empty">Couldn't load <code>data/site.json</code>: ${String(e.message).replace(/</g, '&lt;')}</div>`; });
