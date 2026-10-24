const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const previewCache = new Map();
let previewRuntimePromise = null, previewQueue = Promise.resolve(), galleryObserver = null;

function disposePreview(model) {
  model.traverse(o => {
    o.geometry?.dispose();
    [].concat(o.material || []).forEach(m => {
      Object.values(m).forEach(v => v?.isTexture && v.dispose());
      m.dispose();
    });
  });
}

async function getPreviewRuntime() {
  if (!previewRuntimePromise) previewRuntimePromise = (async () => {
    const T = await import('three');
    const [{ GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/DRACOLoader.js'),
      import('three/addons/libs/meshopt_decoder.module.js')]);
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(480, 360, false);
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const scene = new T.Scene();
    const key = new T.DirectionalLight(0xffffff, 0.9 * Math.PI); key.position.set(5, 9, 6);
    scene.add(key, new T.HemisphereLight(0xffffff, 0x444444, 0.3 * Math.PI));
    const camera = new T.PerspectiveCamera(38, 4 / 3, 0.01, 1000);
    const draco = new DRACOLoader().setDecoderPath('js/vendor/three/draco/');
    const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
    return { T, renderer, scene, camera, loader };
  })().catch(error => { previewRuntimePromise = null; throw error; });
  return previewRuntimePromise;
}

function drawPreview(canvas, source) {
  const image = new Image();
  image.onload = () => {
    if (canvas.isConnected) canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  };
  image.src = source;
}

function requestPreview(canvas, item) {
  const cached = previewCache.get(item.glb);
  if (cached) { drawPreview(canvas, cached); return; }
  previewQueue = previewQueue.then(async () => {
    if (!canvas.isConnected) return;
    const { T, renderer, scene, camera, loader } = await getPreviewRuntime();
    if (!canvas.isConnected) return;
    const gltf = await loader.loadAsync(item.glb);
    const model = gltf.scene;
    if (!canvas.isConnected) { disposePreview(model); return; }
    const box = new T.Box3().setFromObject(model), size = box.getSize(new T.Vector3()), center = box.getCenter(new T.Vector3());
    model.position.set(-center.x, -box.min.y, -center.z);
    scene.add(model);
    const targetY = Math.max(size.y * 0.48, 0.01), radius = Math.max(size.length() / 2, 0.1);
    const distance = radius / Math.sin(T.MathUtils.degToRad(camera.fov / 2)) * 1.08;
    camera.position.set(distance * 0.45, targetY + distance * 0.24, distance);
    camera.lookAt(0, targetY, 0); camera.near = distance / 100; camera.far = distance * 100;
    camera.updateProjectionMatrix(); renderer.render(scene, camera);
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(renderer.domElement, 0, 0, canvas.width, canvas.height);
    previewCache.set(item.glb, canvas.toDataURL('image/webp', 0.86));
    scene.remove(model); disposePreview(model);
  }).catch(error => console.warn(`Could not render preview for ${item.glb}.`, error));
}

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
        ${i.thumb ? `<img src="${esc(i.thumb)}" alt="" loading="lazy">` : ''}
        <canvas class="model-preview" data-id="${esc(i.id)}" width="480" height="360" aria-hidden="true"></canvas></div>
        <div class="meta"><div class="c-title">${esc(i.title)}</div>
        <div class="c-sub">${esc([i.category, i.polys].filter(Boolean).join(' · '))}</div></div></button>`).join('')}</div>`;
    panel.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { active = b.dataset.c; draw(); }));
    panel.querySelectorAll('.card').forEach(b => b.addEventListener('click', () => open(b.dataset.id)));
    galleryObserver?.disconnect();
    galleryObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const canvas = entry.target, item = list.find(i => i.id === canvas.dataset.id);
      galleryObserver.unobserve(canvas);
      if (item?.glb && !item.remote) requestPreview(canvas, item);
    }), { rootMargin: '180px' });
    panel.querySelectorAll('.model-preview').forEach(canvas => galleryObserver.observe(canvas));
  };
  draw();
}
