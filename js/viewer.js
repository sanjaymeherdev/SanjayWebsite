// Shared 3D viewer: orbit camera, Move/Rotate/Scale gizmo, animation timeline, and Supabase upload.
// One renderer, loaded lazily on first open, models disposed on close.
import { getToken, signIn, signOut, uploadModel, deleteModel } from './supa.js';

const $ = id => document.getElementById(id);
const el = { root: $('viewer'), stage: $('stage'), load: $('vLoad'), anims: $('vAnims'), animWrap: $('vAnimWrap'),
  spin: $('vSpin'), pause: $('vPause'), speed: $('vSpeed'), reset: $('vReset'), seek: $('vSeek'), time: $('vTime'),
  modes: $('vModes'), upload: $('vUpload'), kind: $('vKind'), save: $('vSave'), status: $('vStatus'), del: $('vDel'),
  auth: $('vAuth'), email: $('vEmail'), pass: $('vPass'), signin: $('vSignIn') };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let three = null, T, S = {};   // S: renderer, scene, camera, controls, gizmo, loader, shadow, clock, raf
let current = null, token = 0, lastFocus = null, onClose = null, mode = 'view';

async function init() {
  if (three) return three;
  three = (async () => {
    T = await import('three');
    const [{ OrbitControls }, { TransformControls }, { GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }] = await Promise.all([
      import('three/addons/controls/OrbitControls.js'), import('three/addons/controls/TransformControls.js'),
      import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/DRACOLoader.js'),
      import('three/addons/libs/meshopt_decoder.module.js')]);
    const r = new T.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.domElement.style.touchAction = 'none';
    el.stage.prepend(r.domElement);
    const scene = new T.Scene();
    scene.environment = studioEnvironment(r);
    const key = new T.DirectionalLight(0xffffff, 0.9 * Math.PI); key.position.set(5, 9, 6);
    scene.add(key, new T.HemisphereLight(0xffffff, 0x444444, 0.3 * Math.PI));
    const shadow = makeGroundShadow(); scene.add(shadow);
    const camera = new T.PerspectiveCamera(38, 1, 0.01, 1000);
    const controls = new OrbitControls(camera, r.domElement);
    controls.enableDamping = true;
    const gizmo = new TransformControls(camera, r.domElement);
    gizmo.addEventListener('dragging-changed', e => { controls.enabled = !e.value; });
    scene.add(gizmo);
    const draco = new DRACOLoader().setDecoderPath('js/vendor/three/draco/');
    const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
    S = { r, scene, camera, controls, gizmo, loader, shadow, clock: new T.Clock(), spin: false };
    new ResizeObserver(resize).observe(el.stage);
  })();
  return three;
}

function studioEnvironment(renderer) {
  const env = new T.Scene();
  env.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), new T.MeshBasicMaterial({ color: 0x8a919c, side: T.BackSide })));
  const mk = (w, h, x, y, z, c) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  mk(30, 12, 0, 30, 0, 0xffffff); mk(14, 14, -30, 12, 10, 0xffffff); mk(14, 14, 30, 10, -10, 0xdde6ff); mk(40, 6, 0, 4, -35, 0xffe9d2);
  const pm = new T.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.02).texture; pm.dispose();
  return tex;
}

function makeGroundShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const m = new T.Mesh(new T.PlaneGeometry(1, 1),
    new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.visible = false;
  return m;
}

function resize() {
  if (!S.r) return;
  const w = el.stage.clientWidth, h = el.stage.clientHeight;
  if (!w || !h) return;
  S.r.setSize(w, h, false); S.camera.aspect = w / h; S.camera.updateProjectionMatrix();
}

function tick() {
  S.raf = requestAnimationFrame(tick);
  const dt = S.clock.getDelta(), c = current;
  if (c?.mixer) {
    c.mixer.update(dt * (+el.speed.value));
    const a = c.actions[c.active];
    if (a) {
      const d = a.getClip().duration || 1, t = a.time % d;
      if (document.activeElement !== el.seek) el.seek.value = t / d;
      el.time.textContent = `${t.toFixed(2)} / ${d.toFixed(2)}s`;
    }
  }
  if (c && S.spin && mode === 'view') c.root.rotation.y += dt * 0.6;
  S.controls.update();
  S.r.render(S.scene, S.camera);
}

const START_SCALE = 0.5, BASE_LIFT = 1;

// Wraps the model in a pivot group whose origin is the bottom-centre of the model, and frames it.
function mountModel(model) {
  const box = new T.Box3().setFromObject(model), size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
  model.position.set(-c.x, -box.min.y, -c.z);
  const pivot = new T.Group(); pivot.rotation.order = 'YXZ'; pivot.add(model);
  S.scene.add(pivot);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const fit = maxDim / (2 * Math.tan(T.MathUtils.degToRad(S.camera.fov / 2))) * 1.5 || 3;
  const d = fit / START_SCALE, halfVisible = d * Math.tan(T.MathUtils.degToRad(S.camera.fov / 2));
  S.camera.near = fit / 100; S.camera.far = fit * 100; S.camera.updateProjectionMatrix();
  S.controls.target.set(0, halfVisible * BASE_LIFT, 0);
  S.camera.position.copy(S.controls.target).add(new T.Vector3(0.6, 0.3, 1).normalize().multiplyScalar(d));
  S.controls.minDistance = fit * 0.2; S.controls.maxDistance = fit * 5;
  S.controls.update(); S.controls.saveState();
  const foot = Math.max(size.x, size.z) * 1.6 || 1;
  S.shadow.scale.set(foot, foot, 1); S.shadow.position.y = -maxDim * 0.002; S.shadow.visible = true;
  return pivot;
}

function dispose(obj) {
  obj.traverse(o => {
    o.geometry?.dispose();
    [].concat(o.material || []).forEach(m => { Object.values(m).forEach(v => v?.isTexture && v.dispose()); m.dispose(); });
  });
}

function unload() {
  if (!current) return;
  S.gizmo.detach();
  S.scene.remove(current.root); dispose(current.root); current.mixer?.stopAllAction(); current = null; S.shadow.visible = false;
}

function setMode(m) {
  mode = m;
  el.modes.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
  if (!S.gizmo) return;
  if (m === 'view' || !current) S.gizmo.detach(); else { S.gizmo.setMode(m); S.gizmo.attach(current.root); }
}

function playClip(i) {
  current.actions.forEach((a, j) => { if (j === i) { a.reset().fadeIn(0.2).play(); } else a.fadeOut(0.2); });
  current.active = i; current.actions[i].paused = false;
  el.pause.setAttribute('aria-pressed', 'false'); el.pause.textContent = 'Pause';
  el.anims.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', j === i));
}

// Small 4:3 picture of the current view, stored with the upload as the gallery card image.
function snapshot() {
  const m = mode; setMode('view');
  S.r.render(S.scene, S.camera);
  const src = S.r.domElement, c = document.createElement('canvas'); c.width = 480; c.height = 360;
  const s = Math.max(480 / src.width, 360 / src.height), w = src.width * s, h = src.height * s;
  c.getContext('2d').drawImage(src, (480 - w) / 2, (360 - h) / 2, w, h);
  setMode(m);
  return c.toDataURL('image/webp', 0.8);
}

export const isViewerOpen = () => el.root.classList.contains('open');

export async function openViewer(item, kind, site, wa, close) {
  if (current?.item === item && isViewerOpen()) return;
  const mine = ++token;
  if (!isViewerOpen()) lastFocus = document.activeElement;
  onClose = close;
  el.root.classList.add('open'); document.body.classList.add('viewer-open'); document.body.style.overflow = 'hidden';
  $('vTitle').textContent = item.title;
  $('vFacts').textContent = [item.category, item.polys, item.tools].filter(Boolean).join(' · ');
  $('vDesc').textContent = item.description || '';
  $('vWa').href = wa;
  const vid = $('vVideo'); vid.hidden = !item.video; if (item.video) vid.href = item.video;
  el.anims.innerHTML = ''; el.animWrap.hidden = el.pause.hidden = el.speed.hidden = true;
  el.upload.hidden = !item.buffer; el.del.hidden = !item.supa; el.auth.hidden = true; pending = null; el.status.textContent = '';
  el.spin.setAttribute('aria-pressed', 'false');
  el.load.hidden = false; el.load.textContent = 'Loading model…';
  $('vClose').focus();
  try {
    await init();
    if (mine !== token) return;
    if (S.raf) cancelAnimationFrame(S.raf);
    unload(); resize();
    const gltf = item.buffer ? await S.loader.parseAsync(item.buffer, '')
      : await S.loader.loadAsync(item.glb, e => { if (mine === token && e.lengthComputable) el.load.textContent = `Loading model… ${Math.round(e.loaded / e.total * 100)}%`; });
    if (mine !== token) { dispose(gltf.scene); return; }
    const pivot = mountModel(gltf.scene);
    current = { item, root: pivot, actions: [] };
    setMode('view');
    S.spin = !reduceMotion && kind === 'models' && !item.buffer;
    el.spin.setAttribute('aria-pressed', String(S.spin));
    if (item.buffer) el.kind.value = gltf.animations.length ? 'characters' : 'models';
    if (gltf.animations.length) {
      current.mixer = new T.AnimationMixer(gltf.scene);
      current.actions = gltf.animations.map(c => current.mixer.clipAction(c));
      el.anims.innerHTML = gltf.animations.map((c, i) => `<button aria-pressed="false">${(c.name || 'Clip ' + (i + 1)).replace(/</g, '&lt;')}</button>`).join('');
      el.anims.querySelectorAll('button').forEach((b, i) => b.addEventListener('click', () => playClip(i)));
      el.animWrap.hidden = el.pause.hidden = el.speed.hidden = false;
      playClip(0);
    }
    el.load.hidden = true; S.clock.getDelta(); tick();
  } catch (e) {
    console.error(e);
    if (mine === token) el.load.textContent = `Couldn't load this model. ${item.remote ? e.message : 'Check the path (lowercase, no spaces) and that the file is committed.'}`;
  }
}

export function closeViewer(silent) {
  if (!el.root.classList.contains('open')) return;
  token++;
  el.root.classList.remove('open'); document.body.classList.remove('viewer-open'); document.body.style.overflow = '';
  if (S.raf) cancelAnimationFrame(S.raf);
  if (S.scene) unload();
  lastFocus?.focus?.();
  if (!silent) onClose?.();
}

el.modes.querySelectorAll('button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.m)));
el.spin.addEventListener('click', () => { S.spin = !S.spin; el.spin.setAttribute('aria-pressed', String(S.spin)); });
el.pause.addEventListener('click', () => {
  const a = current?.actions[current.active]; if (!a) return;
  a.paused = !a.paused; el.pause.setAttribute('aria-pressed', String(a.paused)); el.pause.textContent = a.paused ? 'Play' : 'Pause';
});
el.seek.addEventListener('input', () => {
  const a = current?.actions[current.active]; if (!a) return;
  a.time = +el.seek.value * a.getClip().duration; current.mixer.update(0);
});
el.reset.addEventListener('click', () => {
  S.controls?.reset();
  if (current) { const r = current.root; r.position.set(0, 0, 0); r.rotation.set(0, 0, 0); r.scale.set(1, 1, 1); }
});

// Admin actions need a Supabase session; ask for sign-in first, then carry on automatically.
let pending = null;
function withAuth(fn) {
  if (getToken()) return fn();
  pending = fn; el.auth.hidden = false; el.status.textContent = 'Sign in as admin to continue.';
}
const failed = (what, e) => { el.status.textContent = `${what} failed: ${e.message}`; if (/jwt|expired/i.test(e.message)) signOut(); };

el.signin.addEventListener('click', async () => {
  try {
    await signIn(el.email.value.trim(), el.pass.value);
    el.pass.value = ''; el.auth.hidden = true; el.status.textContent = '';
    const f = pending; pending = null; f?.();
  } catch (e) { el.status.textContent = e.message; }
});

el.save.addEventListener('click', () => withAuth(async () => {
  const item = current?.item; if (!item?.buffer) return;
  const title = (prompt('Title for this model', item.title) || '').trim(); if (!title) return;
  const kind = el.kind.value;
  el.save.disabled = true;
  try {
    await uploadModel({ buffer: item.buffer, title, kind, thumb: snapshot(),
      category: kind === 'characters' ? 'Rigged Characters' : 'Models' },
      p => { el.status.textContent = `Uploading… ${Math.round(p * 100)}%`; });
    el.status.textContent = `Saved. It now shows in the ${kind} tab.`;
    dispatchEvent(new Event('models-updated'));
  } catch (e) { failed('Upload', e); } finally { el.save.disabled = false; }
}));

el.del.addEventListener('click', () => withAuth(async () => {
  const item = current?.item; if (!item?.supa || !confirm(`Delete “${item.title}” permanently?`)) return;
  try { await deleteModel(item.supa); dispatchEvent(new Event('models-updated')); closeViewer(); }
  catch (e) { failed('Delete', e); }
}));

$('vClose').addEventListener('click', () => closeViewer());
document.addEventListener('keydown', e => { if (e.key === 'Escape' && isViewerOpen()) closeViewer(); });
