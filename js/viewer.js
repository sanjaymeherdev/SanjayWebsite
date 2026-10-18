// Shared 3D viewer: one renderer, loaded lazily on first open, models disposed on close.
const $ = id => document.getElementById(id);
const el = { root: $('viewer'), stage: $('stage'), load: $('vLoad'), anims: $('vAnims'), animWrap: $('vAnimWrap'),
  spin: $('vSpin'), pause: $('vPause'), speed: $('vSpeed'), reset: $('vReset') };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let three = null, T, S = {}; // S: renderer, scene, camera, controls, clock, raf
let current = null, token = 0, lastFocus = null, onClose = null;

async function init() {
  if (three) return three;
  three = (async () => {
    T = await import('three');
    const [{ OrbitControls }, { GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }] = await Promise.all([
      import('three/addons/controls/OrbitControls.js'), import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/loaders/DRACOLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
    const r = new T.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05; // same as Car.html
    r.domElement.style.cursor = 'grab';
    el.stage.prepend(r.domElement);
    const scene = new T.Scene();
    scene.environment = studioEnvironment(r);
    // three r155+ uses physical light units (r147 in Car.html did not), so multiply by PI to match Car.html's brightness
    const key = new T.DirectionalLight(0xffffff, 0.9 * Math.PI); key.position.set(5, 9, 6);
    scene.add(key, new T.HemisphereLight(0xffffff, 0x444444, 0.3 * Math.PI));
    const shadow = makeGroundShadow(); scene.add(shadow);
    const camera = new T.PerspectiveCamera(38, 1, 0.01, 1000);
    const controls = new OrbitControls(camera, r.domElement);
    controls.enableDamping = true;
    controls.enableRotate = false; // dragging now spins the model itself around its base pivot (see bindDrag)
    const draco = new DRACOLoader().setDecoderPath('js/vendor/three/draco/');
    const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
    S = { r, scene, camera, controls, loader, shadow, clock: new T.Clock(), spin: false, vel: 0 };
    bindDrag(r.domElement);
    new ResizeObserver(resize).observe(el.stage);
  })();
  return three;
}

// Soft studio environment copied from Car.html so glossy/metal parts have something bright to reflect.
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

// Soft contact shadow under the model (scaled per model in openViewer).
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

// Drag = spin the model about its bottom pivot (yaw) and tilt it a little (pitch), with inertia.
const drag = { on: false, x: 0, y: 0 }, pointers = new Set();
function bindDrag(canvas) {
  canvas.addEventListener('pointerdown', e => {
    pointers.add(e.pointerId);
    if (e.button !== 0 || !current || pointers.size > 1) { drag.on = false; return; }
    drag.on = true; drag.x = e.clientX; drag.y = e.clientY; S.vel = 0;
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag.on || !current || pointers.size > 1) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    const root = current.root;
    root.rotation.y += dx * 0.01;
    root.rotation.x = Math.max(-0.5, Math.min(0.5, root.rotation.x + dy * 0.005));
    S.vel = dx * 0.01;
  });
  const end = e => { pointers.delete(e.pointerId); drag.on = false; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
}

function resize() {
  if (!S.r) return;
  const w = el.stage.clientWidth, h = el.stage.clientHeight;
  if (!w || !h) return;
  S.r.setSize(w, h, false); S.camera.aspect = w / h; S.camera.updateProjectionMatrix();
}

function tick() {
  S.raf = requestAnimationFrame(tick);
  const dt = S.clock.getDelta();
  current?.mixer?.update(dt * (+el.speed.value));
  if (current && !drag.on) {
    current.root.rotation.y += S.vel; S.vel *= 0.93; if (Math.abs(S.vel) < 1e-4) S.vel = 0;
    if (S.spin) current.root.rotation.y += dt * 0.6;
  }
  S.controls.update();
  S.r.render(S.scene, S.camera);
}

const START_SCALE = 0.5;  // model starts at 50% of the old framing (camera is 1 / START_SCALE times further away)
const BASE_LIFT = 1;      // 0 = base at screen centre, 1 = base at the very bottom edge of the stage

// Wraps the model in a pivot group whose origin is the bottom-centre of the model, and frames it.
function mountModel(model) {
  const box = new T.Box3().setFromObject(model), size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
  model.position.set(-c.x, -box.min.y, -c.z);          // feet on y = 0, centred on x/z
  const pivot = new T.Group(); pivot.rotation.order = 'YXZ'; pivot.add(model);
  S.scene.add(pivot);

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const fit = maxDim / (2 * Math.tan(T.MathUtils.degToRad(S.camera.fov / 2))) * 1.5 || 3; // old full-frame distance
  const d = fit / START_SCALE;
  const halfVisible = d * Math.tan(T.MathUtils.degToRad(S.camera.fov / 2));
  S.camera.near = fit / 100; S.camera.far = fit * 100; S.camera.updateProjectionMatrix();
  S.controls.target.set(0, halfVisible * BASE_LIFT, 0);
  S.camera.position.copy(S.controls.target).add(new T.Vector3(0.6, 0.3, 1).normalize().multiplyScalar(d));
  S.controls.minDistance = fit * 0.2; S.controls.maxDistance = fit * 5;
  S.controls.update(); S.controls.saveState();

  const foot = Math.max(size.x, size.z) * 1.6 || 1;
  S.shadow.scale.set(foot, foot, 1); S.shadow.position.y = -maxDim * 0.002; S.shadow.visible = true;
  S.vel = 0;
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
  S.scene.remove(current.root); dispose(current.root); current.mixer?.stopAllAction(); current = null; S.shadow.visible = false;
}

function playClip(i) {
  current.actions.forEach((a, j) => { if (j === i) { a.reset().fadeIn(0.2).play(); } else a.fadeOut(0.2); });
  current.active = i; current.actions[i].paused = false;
  el.pause.setAttribute('aria-pressed', 'false'); el.pause.textContent = 'Pause';
  el.anims.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', j === i));
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
  el.spin.setAttribute('aria-pressed', 'false');
  el.load.hidden = false; el.load.textContent = 'Loading model…';
  $('vClose').focus();
  try {
    await init();
    if (mine !== token) return;
    if (S.raf) cancelAnimationFrame(S.raf);
    unload(); resize();
    const gltf = await S.loader.loadAsync(item.glb);
    if (mine !== token) { dispose(gltf.scene); return; }
    const pivot = mountModel(gltf.scene);
    current = { item, root: pivot, actions: [] };
    S.spin = !reduceMotion && kind === 'models';
    el.spin.setAttribute('aria-pressed', String(S.spin));
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
    if (mine === token) el.load.textContent = `Couldn't load ${item.glb}. Check the path (lowercase, no spaces) and that the file is committed.`;
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

el.spin.addEventListener('click', () => { S.spin = !S.spin; el.spin.setAttribute('aria-pressed', String(S.spin)); });
el.pause.addEventListener('click', () => {
  const a = current?.actions[current.active]; if (!a) return;
  a.paused = !a.paused; el.pause.setAttribute('aria-pressed', String(a.paused)); el.pause.textContent = a.paused ? 'Play' : 'Pause';
});
el.reset.addEventListener('click', () => { S.controls?.reset(); S.vel = 0; if (current) current.root.rotation.set(0, 0, 0); });
$('vClose').addEventListener('click', () => closeViewer());
document.addEventListener('keydown', e => { if (e.key === 'Escape' && isViewerOpen()) closeViewer(); });
