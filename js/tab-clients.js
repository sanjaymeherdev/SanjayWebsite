// "Client Works" tab: private client videos from Google Drive, shown in the shared lightbox
// with a watermark on top. Driven by data/clients.json, e.g.
//   { "drive": "https://drive.google.com/file/d/FILE_ID/view?usp=sharing", "title": "Name", "format": "short" }
// "drive" can be the full share link or just the file ID. "format" is "short" or "long". "title" is optional.
// The Drive file must be shared as "Anyone with the link can view".
//
// This is a deterrent, not DRM: everything here is a layer in the page and can be removed with devtools.

import { setLastFocus } from './tab-videos.js';

const WATERMARK = 'images/graphicylogo.png';
const lb = document.getElementById('lightbox'), frame = document.getElementById('lbFrame');
const play = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const expand = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Accepts a full Drive link (/file/d/ID/..., open?id=ID, uc?id=ID) or a bare file ID.
function driveId(v) {
  const s = String(v ?? '').trim();
  const m = s.match(/\/d\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/) || s.match(/^([\w-]{10,})$/);
  return m ? m[1] : '';
}

function card(v, i) {
  const long = v.format === 'long';
  const thumb = `https://drive.google.com/thumbnail?id=${encodeURIComponent(v.id)}&sz=w${long ? 800 : 500}`;
  return `<button class="card" data-i="${i}" aria-label="Play ${esc(v.title || (long ? 'client film' : 'client short'))}">
    <div class="thumb ${long ? 't-long' : 't-short'}"><span class="badge">${long ? 'Film' : 'Short'}</span>
    <img src="${thumb}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">
    <span class="play">${play}</span></div>${v.title ? `<div class="meta"><div class="c-title">${esc(v.title)}</div></div>` : ''}</button>`;
}

export function renderClients(panel, items) {
  const videos = items.map(v => ({ id: driveId(v.drive ?? v.id), title: String(v.title ?? '').trim(), format: v.format === 'long' ? 'long' : 'short' })).filter(v => v.id);
  if (!videos.length) {
    panel.innerHTML = '<div class="empty">No client work yet.<br>Add entries like <code>{"drive": "DRIVE_LINK_OR_ID", "title": "Name", "format": "short"}</code> to <code>data/clients.json</code>.</div>';
    return;
  }
  const idx = new Map(videos.map((v, i) => [v, i]));
  const shorts = videos.filter(v => v.format === 'short'), longs = videos.filter(v => v.format === 'long');
  const labels = shorts.length && longs.length;
  panel.innerHTML =
    (shorts.length ? `${labels ? '<p class="sub-label">Shorts</p>' : ''}<div class="grid-short">${shorts.map(v => card(v, idx.get(v))).join('')}</div>` : '') +
    (longs.length ? `${labels ? '<p class="sub-label">Full films</p>' : ''}<div class="grid-long">${longs.map(v => card(v, idx.get(v))).join('')}</div>` : '');
  panel.querySelectorAll('.card').forEach(el => el.addEventListener('click', () => open(videos[+el.dataset.i], el)));
}

function open(v, trigger) {
  setLastFocus(trigger);
  lb.className = `overlay open ${v.format === 'long' ? 'lb-long' : 'lb-short'}`;
  document.getElementById('lbTitle').textContent = v.title;
  document.getElementById('lbYt').style.display = 'none';

  // No allow-popups: the Drive player's "open in new window" button cannot open a tab.
  // No allowfullscreen: Drive's own fullscreen would drop our watermark, so we use our own button below.
  frame.innerHTML = `<iframe src="https://drive.google.com/file/d/${encodeURIComponent(v.id)}/preview" title="Client video"
    sandbox="allow-scripts allow-same-origin" allow="autoplay" referrerpolicy="no-referrer"></iframe>`;
  const ifr = frame.firstElementChild;

  const wm = document.createElement('div');
  wm.className = 'cw-wm';
  const img = document.createElement('img');
  img.src = WATERMARK; img.alt = ''; img.draggable = false;
  wm.append(img);
  const shield = document.createElement('div');   // covers the top strip where Drive puts its title and pop-out button
  shield.className = 'cw-shield';
  const parts = [wm, shield];
  if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
    const fs = document.createElement('button');
    fs.type = 'button'; fs.className = 'cw-fs'; fs.setAttribute('aria-label', 'Full screen'); fs.innerHTML = expand;
    fs.addEventListener('click', () => {
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (frame.requestFullscreen || frame.webkitRequestFullscreen)?.call(frame);
    });
    parts.push(fs);
  }
  frame.append(...parts);

  // Put the overlay back if it is removed or hidden while the video is open. Stops when the lightbox is closed.
  const enforce = () => {
    if (!frame.contains(ifr)) { mo.disconnect(); return; }
    mo.disconnect();
    for (const el of parts) if (el.parentNode !== frame) frame.append(el);
    if (!wm.contains(img)) wm.append(img);
    for (const el of [wm, shield, img]) {
      if (el.hasAttribute('style')) el.removeAttribute('style');
      const cs = getComputedStyle(el);
      if (cs.display === 'none') el.style.setProperty('display', 'block', 'important');
      if (cs.visibility === 'hidden') el.style.setProperty('visibility', 'visible', 'important');
    }
    if (+getComputedStyle(img).opacity < 0.2) img.style.setProperty('opacity', '.4', 'important');
    observe();
  };
  const mo = new MutationObserver(enforce);
  const observe = () => mo.observe(frame, { childList: true, subtree: true, attributes: true });
  observe();

  document.body.style.overflow = 'hidden';
  document.getElementById('lbClose').focus();
}
