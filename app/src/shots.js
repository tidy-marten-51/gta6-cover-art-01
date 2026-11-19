// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor shows the editor with a photo loaded. The query picks the
// layout, theme, sample photos and caption, so every screenshot is the app's
// own drawing of a cover at the size the shot asks for. window.__shotReady
// is set once the scene is painted.
import { LAYOUTS, THEMES } from './cover.js';

// Loads a sample photo by name (samples/<name>.jpg).
export function loadSample(name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`sample ${name} failed to load`));
    img.src = `samples/${name}.jpg`;
  });
}

// Applies a shot scene to the editor state and paints it. `apply` is the
// editor's own function: it takes the new state and redraws the preview.
export async function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const layout = LAYOUTS[query.get('layout')] ? query.get('layout') : 'hero';
  const theme = THEMES[query.get('theme')] ? query.get('theme') : 'sunset';
  const photos = (query.get('photos') ?? query.get('photo') ?? 'pier').split(',');
  const top = query.get('top') ?? 'VICE CITY';
  const bottom = query.get('caption') ?? 'Sunset Heist';
  const count = LAYOUTS[layout].panels.length;
  const oy = Number(query.get('oy') ?? 0);
  const panels = [];
  for (let i = 0; i < count; i += 1) {
    const name = photos[i % photos.length];
    // `oy` pans every panel's photo down a little, so a wide panel keeps the
    // subject's face in frame instead of cropping it at the top edge.
    panels.push({ photo: await loadSample(name), zoom: 1, ox: 0, oy });
  }
  apply({ layout, theme, top, bottom, panels });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
