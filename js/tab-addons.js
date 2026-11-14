// "Addons and Scripts" tab: download / enquiry cards driven by data/roblox-addons.json.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Only allow http(s) links or site-relative paths in hrefs coming from JSON.
const safeUrl = u => (/^(https?:\/\/|[\w./-]+$)/i.test(String(u || '').trim()) ? String(u).trim() : '');

export function renderAddons(panel, items, waLink) {
  if (!items.length) {
    panel.innerHTML = '<div class="empty">No addons or scripts yet.<br>Add entries to <code>data/roblox-addons.json</code>.</div>';
    return;
  }
  const types = ['All', ...new Set(items.map(i => i.type).filter(Boolean))];
  let active = 'All';
  const draw = () => {
    const list = items.filter(i => active === 'All' || i.type === active);
    panel.innerHTML = (types.length > 2 ? `<div class="subbar" style="padding-top:0" role="group" aria-label="Filter by type">${types.map(t =>
      `<button class="chip" data-t="${esc(t)}" aria-pressed="${t === active}">${esc(t)}<span class="n">${t === 'All' ? items.length : items.filter(i => i.type === t).length}</span></button>`).join('')}</div>` : '') +
      `<div class="grid-addons">${list.map(i => {
        const dl = safeUrl(i.downloadUrl), docs = safeUrl(i.docsUrl), vid = safeUrl(i.video);
        const main = dl
          ? `<a class="pill main" href="${esc(dl)}" target="_blank" rel="noopener">${/^free$/i.test(i.price || '') ? 'Download free' : 'Get it'}</a>`
          : docs
            ? `<a class="pill main" href="${esc(docs)}" target="_blank" rel="noopener">Read guide</a>`
            : `<a class="pill main" href="${esc(waLink(i.title))}" target="_blank" rel="noopener">Ask on WhatsApp</a>`;
        return `<article class="addon">
          <div class="top">${i.type ? `<span class="type">${esc(i.type)}</span>` : ''}${i.price ? `<span class="price">${esc(i.price)}</span>` : ''}</div>
          <h3>${esc(i.title)}</h3>
          ${i.description ? `<p>${esc(i.description)}</p>` : ''}
          ${i.tags?.length ? `<div class="tags">${i.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
          <div class="acts">${main}
            ${docs && dl ? `<a class="pill" href="${esc(docs)}" target="_blank" rel="noopener">Read guide</a>` : ''}
            ${vid ? `<a class="pill" href="${esc(vid)}" target="_blank" rel="noopener">Watch demo</a>` : ''}</div>
        </article>`;
      }).join('')}</div>`;
    panel.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { active = b.dataset.t; draw(); }));
  };
  draw();
}
