const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lb = document.getElementById('lightbox'), frame = document.getElementById('lbFrame');
let lastFocus = null;
const play = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

function card(v) {
  const long = v.format === 'long';
  const id = encodeURIComponent(v.id);
  const fb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return `<button class="card" data-id="${esc(v.id)}" aria-label="Play ${esc(v.title)}">
    <div class="thumb ${long ? 't-long' : 't-short'}"><span class="badge">${long ? 'Film' : 'Short'}</span>
    <img src="https://i.ytimg.com/vi/${id}/${long ? 'maxresdefault' : 'hqdefault'}.jpg" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fb}'">
    <span class="play">${play}</span></div>
    <div class="meta"><div class="c-title">${esc(v.title)}</div>${v.description ? `<div class="c-sub">${esc(v.description)}</div>` : ''}</div></button>`;
}

function grids(list) {
  const longs = list.filter(v => v.format === 'long'), shorts = list.filter(v => v.format !== 'long');
  const labels = longs.length && shorts.length;
  return (longs.length ? `${labels ? '<p class="sub-label">Full films</p>' : ''}<div class="grid-long">${longs.map(card).join('')}</div>` : '') +
         (shorts.length ? `${labels ? '<p class="sub-label">Shorts</p>' : ''}<div class="grid-short">${shorts.map(card).join('')}</div>` : '');
}

export function renderVideos(panel, videos, sections, sub, go) {
  const key = sections.some(s => s.key === sub) ? sub : sections[0].key;
  const list = videos.filter(v => v.section === key);
  const bar = sections.map(s =>
    `<button class="chip" data-s="${s.key}" aria-pressed="${s.key === key}">${esc(s.label)}<span class="n">${videos.filter(v => v.section === s.key).length}</span></button>`).join('');
  let body;
  if (!list.length) body = '<div class="empty">No videos in this section yet.<br>Add entries with <code>"section": "' + key + '"</code> to <code>data/videos.json</code>.</div>';
  else {
    const series = {};
    list.forEach(v => (series[v.series || ''] ??= []).push(v));
    const names = Object.keys(series);
    body = names.length === 1 && !names[0] ? grids(list)
      : names.map(n => (n ? `<h2 class="series-name">${esc(n)}</h2>` : '') + grids(series[n])).join('');
  }
  panel.innerHTML = `<div class="subbar" role="group" aria-label="Video sections" style="padding-top:0">${bar}</div>${body}`;
  panel.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => go(b.dataset.s)));
  panel.querySelectorAll('.card').forEach(el => el.addEventListener('click', () => open(videos.find(v => v.id === el.dataset.id), el)));
}

function open(v, trigger) {
  lastFocus = trigger;
  lb.className = `overlay open ${v.format === 'long' ? 'lb-long' : 'lb-short'}`;
  document.getElementById('lbTitle').textContent = v.title;
  document.getElementById('lbYt').href = `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`;
  frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  document.body.style.overflow = 'hidden';
  document.getElementById('lbClose').focus();
}
function close() {
  lb.className = 'overlay'; frame.innerHTML = ''; document.body.style.overflow = '';
  lastFocus?.focus();
}
document.getElementById('lbClose').addEventListener('click', close);
lb.addEventListener('click', e => { if (e.target === lb) close(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains('open')) close(); });
