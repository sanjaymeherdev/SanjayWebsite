const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderGallery(panel, items, kind, open) {
  if (!items.length) {
    panel.innerHTML = `<div class="empty">No ${kind} yet.<br>Add a GLB to <code>3Dmodels/${kind}/</code> and an entry in <code>data/${kind}.json</code>.</div>`;
    return;
  }
  const cats = ['All', ...new Set(items.map(i => i.category).filter(Boolean))];
  let active = 'All';
  const draw = () => {
    const list = items.filter(i => active === 'All' || i.category === active);
    panel.innerHTML = (cats.length > 2 ? `<div class="subbar" style="padding-top:0" role="group" aria-label="Filter by category">${cats.map(c =>
      `<button class="chip" data-c="${esc(c)}" aria-pressed="${c === active}">${esc(c)}<span class="n">${c === 'All' ? items.length : items.filter(i => i.category === c).length}</span></button>`).join('')}</div>` : '') +
      `<div class="grid-3d" style="margin-top:1.25rem">${list.map(i => `
      <button class="card" data-id="${esc(i.id)}" aria-label="View ${esc(i.title)} in 3D">
        <div class="thumb t-3d"><span class="badge">${kind === 'characters' ? 'Rigged · 3D' : '3D'}</span>
        ${i.thumb ? `<img src="${esc(i.thumb)}" alt="" loading="lazy">` : ''}</div>
        <div class="meta"><div class="c-title">${esc(i.title)}</div>
        <div class="c-sub">${esc([i.category, i.polys].filter(Boolean).join(' · '))}</div></div></button>`).join('')}</div>`;
    panel.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { active = b.dataset.c; draw(); }));
    panel.querySelectorAll('.card').forEach(b => b.addEventListener('click', () => open(b.dataset.id)));
  };
  draw();
}
