// Screenshot mode for Vice Lights: ?shot=cover draws one exported cover full
// screen; ?shot=editor shows the editor with a sample photo loaded. Both set
// window.__shotReady once the frame is drawn, which the shot script waits on.
import { renderCover, sizeParts } from './cover.js';

const params = new URLSearchParams(window.location.search);

function pick(name, fallback) {
  const value = params.get(name);
  return value === null || value === '' ? fallback : value;
}

export async function runShotMode({ state, render, loadSampleIntoState }) {
  const mode = pick('shot', 'editor');
  const photoName = pick('photo', 'pier');
  const layout = pick('layout', 'hero');
  const grade = pick('grade', 'sunset');
  const caption = pick('caption', 'Sunset Heist');
  const subcaption = pick('subcaption', 'Neon Coast');
  const size = pick('size', '1080x1080');

  if (['hero', 'grid', 'full'].includes(layout)) state.layout = layout;
  if (['sunset', 'neon', 'gold'].includes(grade)) state.grade = grade;
  state.caption = caption;
  state.subcaption = subcaption;
  if (['1080x1080', '1080x1350', '1920x1080'].includes(size)) state.size = size;

  // Load the sample photo first so every shot has a real photo in the panels.
  try {
    await loadSampleIntoState(photoName);
  } catch (err) {
    console.warn('sample photo failed:', err.message);
  }
  // A second sample in the hero's vignette row shows the multi-photo fill.
  if (mode === 'cover' && state.photos.length === 1 && photoName === 'pier') {
    try {
      await loadSampleIntoState('boulevard');
      state.panelPhoto = [0, 1, 0, 1];
    } catch { /* one photo is enough */ }
  }

  // Keep the caption fields in sync with the shot's caption.
  const captionInput = document.getElementById('caption');
  const subInput = document.getElementById('subcaption');
  if (captionInput) captionInput.value = state.caption;
  if (subInput) subInput.value = state.subcaption;
  document.querySelectorAll('#layoutRow .opt').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeRow .opt').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizeRow .opt').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));

  if (mode === 'cover') {
    document.body.classList.add('shot-cover');
    const { w, h } = sizeParts(state.size);
    const canvas = document.getElementById('shotCanvas');
    canvas.width = w;
    canvas.height = h;
    renderCover(canvas.getContext('2d'), w, h, state);
  } else {
    render();
  }

  await document.fonts.ready;
  window.__shotReady = true;
}
