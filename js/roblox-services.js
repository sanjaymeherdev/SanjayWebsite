// Roblox services page. Content lives in data/roblox-services.json; the WhatsApp number comes from data/site.json.
const $ = s => document.querySelector(s);
const panel = $('#panel');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Only allow http(s) links or site-relative paths in hrefs coming from JSON.
const safeUrl = u => (/^(https?:\/\/|[\w./#-]+$)/i.test(String(u || '').trim()) ? String(u).trim() : '#');
const getJson = name => fetch(`data/${name}.json`).then(r => { if (!r.ok) throw new Error(`data/${name}.json (${r.status})`); return r.json(); });

let site = null;
const waLink = context => {
  const first = site.name.split(' ')[0];
  const msg = context
    ? `Hi ${first}, I saw your Roblox services page and want to talk about "${context}".`
    : `Hi ${first}, I saw your Roblox services page and want to talk about a project.`;
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}`;
};
const wa = (label, ctx) => `<a class="pill wa" href="${esc(waLink(ctx))}" target="_blank" rel="noopener">${esc(label)}</a>`;
const points = list => list?.length ? `<ul class="svc-points">${list.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '';
const price = p => `<span class="svc-price">${p ? `From <b>${esc(p)}</b>` : 'Quote on request'}</span>`;

function primary(s) {
  const meta = [s.price ? `From <b>${esc(s.price)}</b>` : 'Quote on request', s.turnaround ? `Turnaround <b>${esc(s.turnaround)}</b>` : ''].filter(Boolean).join(' · ');
  return `<section class="svc-primary" aria-labelledby="svc-${esc(s.id)}">
    <div>
      <div class="svc-label">${esc(s.label)}</div>
      <h2 id="svc-${esc(s.id)}">${esc(s.title)}</h2>
      <p class="lead">${esc(s.summary)}</p>
      ${points(s.points)}
    </div>
    <ol class="svc-steps" aria-label="How it works"><h3>How it works</h3>${(s.steps || []).map(x => `<li><b>${esc(x.t)}</b><span>${esc(x.d)}</span></li>`).join('')}</ol>
    <div class="svc-foot"><span class="svc-meta">${meta}</span>
      ${(s.work || []).map(w => `<a class="pill" href="${esc(safeUrl(w.href))}">${esc(w.label)}</a>`).join('')}
      ${wa(s.cta || 'Message on WhatsApp', s.title)}</div>
  </section>`;
}

const secondary = g => `<section aria-label="${esc(g.label)}"><div class="svc-label">${esc(g.label)}</div>
  <div class="svc-grid">${g.services.map(s => `<article class="svc-card"><h3>${esc(s.title)}</h3><p>${esc(s.summary)}</p>${points(s.points)}
    <div class="acts">${price(s.price)}${wa(s.cta || 'Ask on WhatsApp', s.title)}</div></article>`).join('')}</div></section>`;

const addons = g => `<section aria-label="${esc(g.label)}"><div class="svc-label">${esc(g.label)}</div>${g.sub ? `<p class="svc-sub">${esc(g.sub)}</p>` : ''}
  <div class="svc-grid">${g.services.map(s => `<article class="svc-card addon-card"><span class="svc-tag">Add-on</span><h3>${esc(s.title)}</h3><p>${esc(s.summary)}</p>
    <div class="acts">${price(s.price)}${wa('Add to my project', s.title)}</div></article>`).join('')}</div></section>`;

const contact = c => `<section class="svc-contact"><h2>${esc(c.title)}</h2><p>${esc(c.sub)}</p>${wa('Message on WhatsApp')}</section>`;

Promise.all([getJson('site'), getJson('roblox-services')]).then(([s, d]) => {
  site = s;
  $('#waHead').href = $('#waFab').href = waLink();
  panel.innerHTML = primary(d.primary) + secondary(d.secondary) + addons(d.addons) + contact(d.contact);
}).catch(e => { panel.innerHTML = `<div class="empty">Couldn't load this page.<br><code>${esc(e.message)}</code></div>`; });
