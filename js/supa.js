// Supabase Storage client for GLB models (plain REST, no library needed).
// Layout in the "models" bucket:  <kind>/<id>.glb  +  <kind>/<id>.webp (card image)  +  <kind>/<id>.json (title, category)
// The .json file is written last, so a half-finished upload never shows up in the gallery.
const BUCKET = 'models', SESSION = 'supaSession';
let cfg = null;

async function conf() {
  if (cfg) return cfg;
  const j = (await (await fetch('config.json')).json()).supabase;
  return (cfg = { url: j.url.replace(/\/$/, ''), key: j.anon_key });
}
const pub = (c, path) => `${c.url}/storage/v1/object/public/${BUCKET}/${path}`;
const errMsg = (text, status) => { try { const j = JSON.parse(text); return j.message || j.error_description || j.error || `Request failed (${status})`; } catch { return `Request failed (${status})`; } };

export function getToken() {
  try { const s = JSON.parse(sessionStorage.getItem(SESSION)); return s && s.exp > Date.now() + 30000 ? s.token : ''; } catch { return ''; }
}
export const signOut = () => { try { sessionStorage.removeItem(SESSION); } catch {} };

export async function signIn(email, password) {
  const c = await conf();
  const r = await fetch(`${c.url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: c.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.msg || 'Sign-in failed');
  try { sessionStorage.setItem(SESSION, JSON.stringify({ token: j.access_token, exp: Date.now() + j.expires_in * 1000 })); } catch {}
}

export async function listModels(kind) {
  try {
    const c = await conf();
    const r = await fetch(`${c.url}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST', headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: kind, limit: 200, offset: 0 })
    });
    if (!r.ok) return [];
    const metas = await Promise.all((await r.json()).filter(f => f.name.endsWith('.json')).map(async f => {
      try { return { base: f.name.slice(0, -5), m: await (await fetch(pub(c, `${kind}/${f.name}`))).json() }; } catch { return null; }
    }));
    return metas.filter(Boolean).sort((a, b) => (b.m.created || 0) - (a.m.created || 0)).map(({ base, m }) => ({
      id: 's-' + base, supa: `${kind}/${base}`, remote: true, title: m.title,
      category: m.category || (kind === 'characters' ? 'Rigged Characters' : 'Models'),
      glb: pub(c, `${kind}/${base}.glb`), thumb: pub(c, `${kind}/${base}.webp`)
    }));
  } catch { return []; }
}

function put(c, path, body, type, onProgress) {
  return new Promise((ok, bad) => {
    const x = new XMLHttpRequest();
    x.open('POST', `${c.url}/storage/v1/object/${BUCKET}/${path}`);
    x.setRequestHeader('apikey', c.key); x.setRequestHeader('Authorization', `Bearer ${getToken()}`);
    x.setRequestHeader('Content-Type', type); x.setRequestHeader('x-upsert', 'false');
    x.upload.onprogress = e => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => x.status < 300 ? ok() : bad(new Error(errMsg(x.responseText, x.status)));
    x.onerror = () => bad(new Error('Network error'));
    x.send(body);
  });
}

export async function deleteModel(base) {
  const c = await conf();
  const r = await fetch(`${c.url}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE', headers: { apikey: c.key, Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [`${base}.glb`, `${base}.webp`, `${base}.json`] })
  });
  if (!r.ok) throw new Error(errMsg(await r.text(), r.status));
  if (!(await r.json()).length) throw new Error('Nothing was deleted. Is this the admin account?');
}

export async function uploadModel({ buffer, title, kind, category, thumb }, onProgress) {
  const c = await conf();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'model';
  const base = `${kind}/${slug}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    await put(c, `${base}.glb`, new Blob([buffer], { type: 'model/gltf-binary' }), 'model/gltf-binary', onProgress);
    await put(c, `${base}.webp`, await (await fetch(thumb)).blob(), 'image/webp');
    await put(c, `${base}.json`, JSON.stringify({ title, category, size: buffer.byteLength, created: Date.now() }), 'application/json');
  } catch (e) {
    deleteModel(base).catch(() => {});      // tidy up a half-finished upload
    throw e;
  }
  return base;
}
