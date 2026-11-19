// Vice Lights editor: loads the user's photos, wires the controls, and keeps a
// live canvas preview of the cover. Photos are read locally and never sent
// anywhere; export renders the same cover at post size and downloads a PNG.
import { renderCover, exportCoverPng, downloadBlob, layoutPanels, sizeParts } from './cover.js';
import { runShotMode } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

export const state = {
  layout: 'hero',
  grade: 'sunset',
  size: '1080x1080',
  caption: 'VICE SUNSET',
  subcaption: 'NEON COAST',
  photos: [],          // { img, zoom, ox, oy, name }
  panelPhoto: [0, 0, 0, 0],
  selectedPanel: 0,
  selectedPhoto: 0,
};

let lastPanels = [];

function fitPreview() {
  const { w, h } = sizeParts(state.size);
  const scale = Math.min(720 / w, 720 / h);
  preview.width = Math.round(w * scale);
  preview.height = Math.round(h * scale);
}

export function render() {
  fitPreview();
  lastPanels = renderCover(pctx, preview.width, preview.height, state).panels;
  drawSelection();
}

function drawSelection() {
  const rect = lastPanels[state.selectedPanel];
  if (!rect) return;
  pctx.save();
  pctx.strokeStyle = '#2ee6d6';
  pctx.lineWidth = 3;
  pctx.setLineDash([10, 6]);
  pctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  pctx.restore();
}

function refreshThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const img = document.createElement('img');
    img.className = 'thumb' + (i === state.selectedPhoto ? ' sel' : '');
    img.src = photo.img.src;
    img.alt = photo.name || `Photo ${i + 1}`;
    img.title = photo.name || `Photo ${i + 1}`;
    img.addEventListener('click', () => {
      state.selectedPhoto = i;
      syncCropControls();
      refreshThumbs();
    });
    box.appendChild(img);
  });
}

function syncCropControls() {
  const photo = state.photos[state.selectedPhoto];
  const label = $('selLabel');
  const panelCount = lastPanels.length;
  label.textContent = photo
    ? `Panel ${state.selectedPanel + 1} of ${panelCount} · photo “${photo.name || 'untitled'}”`
    : 'No photo yet — add one, or try a sample.';
  $('zoom').value = photo?.zoom ?? 1;
  $('panX').value = photo?.ox ?? 0;
  $('panY').value = photo?.oy ?? 0;
  $('zoomVal').textContent = `${(photo?.zoom ?? 1).toFixed(2)}×`;
  $('panXVal').textContent = (photo?.ox ?? 0).toFixed(2);
  $('panYVal').textContent = (photo?.oy ?? 0).toFixed(2);
}

function addPhoto(img, name) {
  state.photos.push({ img, zoom: 1, ox: 0, oy: 0, name });
  state.selectedPhoto = state.photos.length - 1;
  // A new photo fills any panel that had nothing to show yet.
  state.panelPhoto = state.panelPhoto.map((p) => (p >= state.photos.length ? 0 : p));
  refreshThumbs();
  syncCropControls();
  render();
}

export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('not an image'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function loadSample(name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`sample ${name} failed to load`));
    img.src = `samples/${name}.jpg`;
  });
}

async function loadSampleIntoState(name) {
  const img = await loadSample(name);
  addPhoto(img, name);
}

function bindControls() {
  $('photoInput').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    for (const file of files) {
      try {
        addPhoto(await loadImageFile(file), file.name);
      } catch (err) {
        console.warn('skipped a file:', err.message);
      }
    }
    event.target.value = '';
  });

  document.querySelectorAll('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', () => loadSampleIntoState(btn.dataset.sample).catch((e) => console.warn(e.message)));
  });

  $('fillAll').addEventListener('click', () => {
    if (!state.photos.length) return;
    state.panelPhoto = state.panelPhoto.map(() => state.selectedPhoto);
    render();
  });

  $('usePhoto').addEventListener('click', () => {
    if (!state.photos.length) return;
    state.panelPhoto[state.selectedPanel] = state.selectedPhoto;
    render();
  });

  const crop = (key, input, out) => {
    input.addEventListener('input', () => {
      const photo = state.photos[state.selectedPhoto];
      if (!photo) return;
      photo[key] = Number(input.value);
      $(out).textContent = key === 'zoom' ? `${photo.zoom.toFixed(2)}×` : photo[key].toFixed(2);
      render();
    });
  };
  crop('zoom', $('zoom'), 'zoomVal');
  crop('ox', $('panX'), 'panXVal');
  crop('oy', $('panY'), 'panYVal');

  const pickRow = (rowId, key, attr) => {
    $(rowId).querySelectorAll('.opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        state[key] = btn.dataset[attr];
        $(rowId).querySelectorAll('.opt').forEach((b) => b.classList.toggle('active', b === btn));
        render();
      });
    });
  };
  pickRow('layoutRow', 'layout', 'layout');
  pickRow('gradeRow', 'grade', 'grade');
  pickRow('sizeRow', 'size', 'size');

  $('caption').addEventListener('input', (e) => { state.caption = e.target.value; render(); });
  $('subcaption').addEventListener('input', (e) => { state.subcaption = e.target.value; render(); });

  preview.addEventListener('click', (event) => {
    const box = preview.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * preview.width;
    const y = ((event.clientY - box.top) / box.height) * preview.height;
    const hit = lastPanels.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (hit >= 0) {
      state.selectedPanel = hit;
      state.selectedPhoto = state.panelPhoto[hit] ?? 0;
      syncCropControls();
      render();
    }
  });

  $('exportBtn').addEventListener('click', async () => {
    const btn = $('exportBtn');
    btn.textContent = 'Rendering…';
    btn.disabled = true;
    try {
      const blob = await exportCoverPng(state);
      const stamp = state.size.replace('x', '×');
      downloadBlob(blob, `vice-lights-${stamp}.png`);
    } finally {
      btn.textContent = 'Export cover PNG';
      btn.disabled = false;
    }
  });
}

// Keep the preview honest when the window resizes: re-render at the same size.
window.addEventListener('resize', () => render());

bindControls();
syncCropControls();
render();

// Screenshot mode (?shot=cover or ?shot=editor) drives the app headlessly and
// signals window.__shotReady when the frame is complete.
if (new URLSearchParams(window.location.search).has('shot')) {
  runShotMode({ state, render, loadSampleIntoState, addPhoto });
}
