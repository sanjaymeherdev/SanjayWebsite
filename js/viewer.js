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
    const [{ OrbitControls }, { GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }, { RoomEnvironment }] = await Promise.all([
      import('three/addons/controls/OrbitControls.js'), import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/loaders/DRACOLoader.js'), import('three/addons/libs/meshopt_decoder.module.js'),
      import('three/addons/environments/RoomEnvironment.js')]);
    const r = new T.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.toneMapping = T.ACESFilmicToneMapping;
    el.stage.prepend(r.domElement);
    const scene = new T.Scene();
    scene.environment = new T.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    const key = new T.DirectionalLight(0xffffff, 1.2); key.position.set(3, 5, 4); scene.add(key);
    const camera = new T.PerspectiveCamera(40, 1, 0.01, 1000);
    const controls = new OrbitControls(camera, r.domElement);
    controls.enableDamping = true;
    const draco = new DRACOLoader().setDecoderPath('js/vendor/three/draco/');
    const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
    S = { r, scene, camera, controls, loader, clock: new T.Clock() };
    new ResizeObserver(resize).observe(el.stage);
  })();
  return three;
}

function resize() {
  if (!S.r) return;
  const w = el.stage.clientWidth, h = el.stage.clientHeight;
  if (!w || !h) return;
  S.r.setSize(w, h, false); S.camera.aspect = w / h; S.camera.updateProjectionMatrix();
}

function tick() {
  S.raf = requestAnimationFrame(tick);
  current?.mixer?.update(S.clock.getDelta() * (+el.speed.value));
  S.controls.update();
  S.r.render(S.scene, S.camera);
}

function frameModel(obj) {
  const box = new T.Box3().setFromObject(obj), size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
  const d = Math.max(size.x, size.y, size.z) / (2 * Math.tan(T.MathUtils.degToRad(S.camera.fov / 2))) * 1.5 || 3;
  S.camera.near = d / 100; S.camera.far = d * 100; S.camera.updateProjectionMatrix();
  S.camera.position.set(c.x + d * 0.6, c.y + d * 0.3, c.z + d);
  S.controls.target.copy(c); S.controls.minDistance = d * 0.2; S.controls.maxDistance = d * 4;
  S.controls.update(); S.controls.saveState();
}

function dispose(obj) {
  obj.traverse(o => {
    o.geometry?.dispose();
    [].concat(o.material || []).forEach(m => { Object.values(m).forEach(v => v?.isTexture && v.dispose()); m.dispose(); });
  });
}

function unload() {
  if (!current) return;
  S.scene.remove(current.root); dispose(current.root); current.mixer?.stopAllAction(); current = null;
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
    S.scene.add(gltf.scene);
    current = { item, root: gltf.scene, actions: [] };
    frameModel(gltf.scene);
    S.controls.autoRotate = !reduceMotion && kind === 'models';
    el.spin.setAttribute('aria-pressed', String(S.controls.autoRotate));
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

el.spin.addEventListener('click', () => { S.controls.autoRotate = !S.controls.autoRotate; el.spin.setAttribute('aria-pressed', String(S.controls.autoRotate)); });
el.pause.addEventListener('click', () => {
  const a = current?.actions[current.active]; if (!a) return;
  a.paused = !a.paused; el.pause.setAttribute('aria-pressed', String(a.paused)); el.pause.textContent = a.paused ? 'Play' : 'Pause';
});
el.reset.addEventListener('click', () => S.controls?.reset());
$('vClose').addEventListener('click', () => closeViewer());
document.addEventListener('keydown', e => { if (e.key === 'Escape' && isViewerOpen()) closeViewer(); });
