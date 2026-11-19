// Neon Coast — the editor. Wires the page: pick a layout, fill each panel
// with a sample or your own photo, drag to crop and position, write the
// caption, pick a grade, and export the cover as a PNG in any of the three
// post sizes. A `?shot=` query sets up a fixed scene for a screenshot
// instead (./shots.js). The preview and the export are the same drawing:
// drawCoverArt in ./cover.js, painted at the preview size on screen and at
// full size on an offscreen canvas for export.
import { drawCoverArt, renderExportCanvas, panelRects, LAYOUTS, LAYOUT_ORDER, THEMES, THEME_ORDER, EXPORT_SIZES, EXPORT_ORDER } from './cover.js';
import { runShot, loadSample } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const panelList = document.getElementById('panels');
const zoomSlider = document.getElementById('zoom');
const zoomValue = document.getElementById('zoom-value');
const topInput = document.getElementById('top');
const bottomInput = document.getElementById('bottom');
const sizeButtons = document.getElementById('sizes');
const layoutButtons = document.getElementById('layouts');
const themeButtons = document.getElementById('themes');

// The editor state. A panel holds the photo (an Image, or null) and its
// crop: zoom 1 fills the panel, ox/oy pan it in fractions of the panel.
let state = {
  layout: 'hero',
  theme: 'sunset',
  top: 'VICE CITY',
  bottom: 'Sunset Heist',
  size: 'square',
  panels: [],
};
let selected = 0;
let shotMode = null;

function blankPanels(layout, fillPhoto) {
  return LAYOUTS[layout].panels.map(() => ({ photo: fillPhoto ?? null, zoom: 1, ox: 0, oy: 0 }));
}

function panelCount() {
  return LAYOUTS[state.layout].panels.length;
}

// Sizes the preview canvas to the chosen export aspect (at most 720 px on
// its long side) and repaints the cover into it.
function redraw() {
  const size = EXPORT_SIZES[state.size];
  const scale = Math.min(720 / size.w, 720 / size.h);
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  drawCoverArt(ctx, canvas.width, canvas.height, state);
  document.querySelectorAll('#panels .panel').forEach((row, i) => {
    row.classList.toggle('selected', i === selected);
  });
  const panel = state.panels[selected];
  if (panel) {
    zoomSlider.value = String(panel.zoom);
    zoomValue.textContent = `${Math.round(panel.zoom * 100)}%`;
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

// Builds the per-panel rows: each panel gets sample buttons, an upload, a
// "use in all panels" button and its zoom. Clicking a row selects the panel.
function buildPanelList() {
  panelList.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const row = document.createElement('div');
    row.className = 'panel';
    row.dataset.index = String(i);
    const label = document.createElement('span');
    label.className = 'panel-name';
    label.textContent = `Panel ${i + 1}`;
    row.appendChild(label);
    for (const sample of ['boulevard', 'pier']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mini';
      b.textContent = sample === 'boulevard' ? 'Boulevard' : 'Pier';
      b.addEventListener('click', async () => {
        panel.photo = await loadSample(sample);
        panel.zoom = 1;
        panel.ox = 0;
        panel.oy = 0;
        selected = i;
        redraw();
        setStatus(`Panel ${i + 1} uses the ${sample} sample.`);
      });
      row.appendChild(b);
    }
    const upload = document.createElement('label');
    upload.className = 'mini upload';
    upload.textContent = 'Upload photo';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      panel.photo = await loadImageFile(f);
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
      selected = i;
      redraw();
      setStatus(`Panel ${i + 1} uses ${f.name}.`);
    });
    upload.appendChild(file);
    row.appendChild(upload);
    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'mini';
    all.textContent = 'Use in all panels';
    all.addEventListener('click', () => {
      if (!panel.photo) return;
      state.panels.forEach((p) => { p.photo = panel.photo; });
      redraw();
      setStatus('The same photo fills every panel.');
    });
    row.appendChild(all);
    row.addEventListener('click', () => { selected = i; redraw(); });
    panelList.appendChild(row);
  });
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not read that photo'));
    img.src = URL.createObjectURL(file);
  });
}

// Layout picker: rebuilds the panels, keeping each photo in place where the
// new layout still has that panel.
function buildLayoutButtons() {
  LAYOUT_ORDER.forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = key;
    b.textContent = LAYOUTS[key].label;
    b.addEventListener('click', () => {
      const old = state.panels;
      state.layout = key;
      state.panels = blankPanels(key);
      state.panels.forEach((p, i) => { if (old[i]) Object.assign(p, old[i]); });
      selected = 0;
      buildPanelList();
      redraw();
      setStatus(`Layout: ${LAYOUTS[key].label}.`);
    });
    layoutButtons.appendChild(b);
  });
}

function buildThemeButtons() {
  THEME_ORDER.forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.theme = key;
    b.className = `swatch ${key}`;
    b.textContent = THEMES[key].label;
    b.addEventListener('click', () => {
      state.theme = key;
      redraw();
      setStatus(`Grade: ${THEMES[key].label}.`);
    });
    themeButtons.appendChild(b);
  });
}

function buildSizeButtons() {
  EXPORT_ORDER.forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = key;
    b.textContent = EXPORT_SIZES[key].label;
    b.addEventListener('click', () => {
      state.size = key;
      redraw();
      setStatus(`Export size: ${EXPORT_SIZES[key].label}.`);
    });
    sizeButtons.appendChild(b);
  });
}

// Step tabs: the editor is three steps — photos, caption, export — and each
// tab shows only its own controls, so the first cover takes seconds.
document.querySelectorAll('.steps button').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.steps button').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.step').forEach((s) => {
      s.classList.toggle('active', s.id === `step-${tab.dataset.step}`);
    });
  });
});

// Drag on the preview to crop: the panel under the pointer is selected and
// its photo pans with the drag; the zoom slider zooms the selected panel.
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const hit = rects.findIndex((r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
  if (hit === -1) return;
  selected = hit;
  drag = { x: p.x, y: p.y, rect: rects[hit] };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[selected];
  panel.ox += (p.x - drag.x) / drag.rect.w;
  panel.oy += (p.y - drag.y) / drag.rect.h;
  panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox));
  panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy));
  drag.x = p.x;
  drag.y = p.y;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

zoomSlider.addEventListener('input', () => {
  const panel = state.panels[selected];
  if (!panel) return;
  panel.zoom = Number(zoomSlider.value);
  redraw();
});

topInput.addEventListener('input', () => { state.top = topInput.value; redraw(); });
bottomInput.addEventListener('input', () => { state.bottom = bottomInput.value; redraw(); });

// Export: the cover is drawn again at full size on an offscreen canvas, so
// the PNG is the real cover, not an upscale of the preview.
function downloadCanvas(exportCanvas, name) {
  exportCanvas.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setStatus(`Saved ${name}.`);
  }, 'image/png');
}

document.getElementById('export').addEventListener('click', () => {
  const size = EXPORT_SIZES[state.size];
  downloadCanvas(renderExportCanvas(state, state.size), `neon-coast-${size.w}x${size.h}.png`);
});
document.getElementById('export-all').addEventListener('click', () => {
  EXPORT_ORDER.forEach((key, i) => {
    const size = EXPORT_SIZES[key];
    setTimeout(() => {
      downloadCanvas(renderExportCanvas(state, key), `neon-coast-${size.w}x${size.h}.png`);
    }, i * 250);
  });
  setStatus('Exporting all three sizes.');
});

// Applies a whole new state (used by the shot scenes) and repaints.
export function applyState(next) {
  state = { ...state, ...next };
  topInput.value = state.top;
  bottomInput.value = state.bottom;
  selected = 0;
  buildPanelList();
  if (shotMode === 'cover') {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawCoverArt(ctx, canvas.width, canvas.height, state);
  } else {
    redraw();
  }
}

// Startup: hero layout, pier in the hero panel, boulevard in the strip, so
// the first thing a visitor sees is already a finished-looking cover.
buildLayoutButtons();
buildThemeButtons();
buildSizeButtons();
state.panels = blankPanels('hero');
const params = new URLSearchParams(location.search);
shotMode = params.get('shot');
if (shotMode) {
  runShot(shotMode, params, applyState);
} else {
  Promise.all([loadSample('pier'), loadSample('boulevard')]).then(([pier, boulevard]) => {
    state.panels[0].photo = pier;
    state.panels[1].photo = boulevard;
    state.panels[2].photo = boulevard;
    state.panels[3].photo = pier;
    buildPanelList();
    redraw();
    setStatus('Drag a photo to crop it. Export when it looks right.');
  });
}
