// Vice Lights cover engine: draws a multi-panel GTA-style poster onto a canvas.
// Pure canvas 2D, no libraries. A cover is a set of photo panels plus a bold
// caption, graded with a Vice City sunset / neon colour pass.

export const LAYOUTS = ['hero', 'grid', 'full'];
export const GRADES = ['sunset', 'neon', 'gold'];
export const SIZES = ['1080x1080', '1080x1350', '1920x1080'];

// A grade is two gradient washes (overlay + soft-light) plus a warm tint.
// Colours are sampled from a Vice City dusk: magenta sky, orange horizon,
// deep violet shadow, with a cyan neon alternative.
export const GRADE_DEFS = {
  sunset: {
    washA: [[0, '#ff2e88'], [0.55, '#ff7a3d'], [1, '#7a1e6e']],
    washB: [[0, '#2a0a4e'], [1, '#ff9a3d']],
    tint: '#ff5a3c',
    tintAlpha: 0.10,
  },
  neon: {
    washA: [[0, '#2ee6d6'], [0.5, '#b04dff'], [1, '#ff2e88']],
    washB: [[0, '#0a2a4e'], [1, '#ff2e88']],
    tint: '#2ee6d6',
    tintAlpha: 0.10,
  },
  gold: {
    washA: [[0, '#ffc44d'], [0.55, '#ff7a5c'], [1, '#8a3d1e']],
    washB: [[0, '#3d1e0a'], [1, '#ffd98a']],
    tint: '#ffc44d',
    tintAlpha: 0.12,
  },
};

// Panel rectangles, in pixels, for a cover of W x H. The caption zone is
// returned too, so the lettering always sits on the same poster band.
export function layoutPanels(layout, W, H) {
  const g = Math.max(4, Math.round(Math.min(W, H) * 0.014));
  const third = (W - 2 * g) / 3;
  const half = (W - g) / 2;
  const halfH = (H - g) / 2;
  if (layout === 'grid') {
    return {
      panels: [
        { x: 0, y: 0, w: half, h: halfH },
        { x: half + g, y: 0, w: half, h: halfH },
        { x: 0, y: halfH + g, w: half, h: halfH },
        { x: half + g, y: halfH + g, w: half, h: halfH },
      ],
      caption: { x: W * 0.04, y: H * 0.815, w: W * 0.92, h: H * 0.15 },
    };
  }
  if (layout === 'full') {
    const iw = Math.round(W * 0.30);
    const ih = Math.round(H * 0.30);
    return {
      panels: [
        { x: 0, y: 0, w: W, h: H },
        { x: W - iw - g * 2, y: H - ih - g * 2, w: iw, h: ih, inset: true },
      ],
      caption: { x: W * 0.04, y: H * 0.80, w: W * 0.60, h: H * 0.16 },
    };
  }
  // hero: one big panel on top, three vignettes in a row below it.
  const heroH = Math.round(H * 0.60);
  const rowY = heroH + g;
  const rowH = H - rowY;
  return {
    panels: [
      { x: 0, y: 0, w: W, h: heroH },
      { x: 0, y: rowY, w: third, h: rowH },
      { x: third + g, y: rowY, w: third, h: rowH },
      { x: 2 * (third + g), y: rowY, w: third, h: rowH },
    ],
    caption: { x: W * 0.04, y: H * 0.845, w: W * 0.92, h: H * 0.125 },
  };
}

// Draw one photo into a panel rect with cover-fit, zoom and pan, then grade it.
export function drawPanel(ctx, img, rect, photo, gradeName) {
  const { w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, w, h);
  ctx.clip();
  if (img) {
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const scale = base * (photo?.zoom ?? 1);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    // Faces sit in the upper half of a photo, so when a wide panel crops a
    // tall photo top-to-bottom, bias the window toward the top of the image
    // instead of cutting the subject's head off at the centre line.
    const topBias = Math.max(0, dh - h) * 0.18;
    const cx = rect.x + w / 2 + (photo?.ox ?? 0) * w * 0.38;
    const cy = rect.y + h / 2 + topBias + (photo?.oy ?? 0) * h * 0.38;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  } else {
    // Empty panel: a dusk gradient so the poster still reads as finished.
    const empty = ctx.createLinearGradient(rect.x, rect.y, rect.x + w, rect.y + h);
    empty.addColorStop(0, '#3d1e5c');
    empty.addColorStop(0.55, '#a32e6e');
    empty.addColorStop(1, '#ff7a3d');
    ctx.fillStyle = empty;
    ctx.fillRect(rect.x, rect.y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `700 ${Math.round(Math.min(w, h) * 0.07)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', rect.x + w / 2, rect.y + h / 2);
  }
  applyGrade(ctx, rect, gradeName);
  ctx.restore();
  // Crisp poster frame around the panel.
  const bw = Math.max(2, Math.round(Math.min(w, h) * 0.012));
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = bw;
  ctx.strokeRect(rect.x + bw / 2, rect.y + bw / 2, w - bw, h - bw);
  ctx.restore();
}

export function applyGrade(ctx, rect, gradeName) {
  const def = GRADE_DEFS[gradeName] ?? GRADE_DEFS.sunset;
  const { x, y, w, h } = rect;
  const wash = (stops, mode, alpha) => {
    const grad = ctx.createLinearGradient(x, y, x + w * 0.35, y + h);
    for (const [at, color] of stops) grad.addColorStop(at, color);
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };
  wash(def.washA, 'overlay', 0.55);
  wash(def.washB, 'soft-light', 0.6);
  ctx.save();
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = def.tintAlpha;
  ctx.fillStyle = def.tint;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Vignette: darken the corners so the panel reads as a poster frame.
  const vig = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(8,2,16,0)');
  vig.addColorStop(1, 'rgba(8,2,16,0.38)');
  ctx.save();
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Shrink-to-fit poster lettering with a dark outline, sunset fill and shadow.
function drawCaptionText(ctx, text, zone, size, spacing, sub) {
  const fontFor = (px) => `900 ${px}px "Arial Black", Impact, "Franklin Gothic Heavy", sans-serif`;
  let px = Math.round(size);
  ctx.textBaseline = 'alphabetic';
  const measure = (p) => {
    ctx.font = fontFor(p);
    try { ctx.letterSpacing = `${spacing}px`; } catch { /* older canvas */ }
    return ctx.measureText(text).width;
  };
  while (px > 12 && measure(px) > zone.w) px = Math.round(px * 0.94);
  const baseline = zone.y + zone.h * 0.82;
  ctx.save();
  ctx.font = fontFor(px);
  try { ctx.letterSpacing = `${spacing}px`; } catch { /* older canvas */ }
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = Math.round(px * 0.10);
  ctx.shadowOffsetY = Math.round(px * 0.045);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, Math.round(px * 0.16));
  ctx.strokeStyle = '#160412';
  ctx.strokeText(text, zone.x, baseline);
  const fill = ctx.createLinearGradient(zone.x, baseline - px, zone.x, baseline + px * 0.12);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(0.55, '#ffe9c9');
  fill.addColorStop(1, '#ffb35c');
  ctx.fillStyle = fill;
  ctx.fillText(text, zone.x, baseline);
  ctx.restore();
  if (sub) {
    const subPx = Math.max(10, Math.round(px * 0.24));
    ctx.save();
    ctx.font = `700 ${subPx}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subPx * 0.35)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe9c9';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = Math.round(subPx * 0.3);
    ctx.fillText(sub.toUpperCase(), zone.x + 2, baseline + subPx * 1.5);
    ctx.restore();
  }
}

export function drawCaption(ctx, zone, caption, subcaption, W) {
  const scrim = ctx.createLinearGradient(0, zone.y - zone.h * 0.5, 0, zone.y + zone.h);
  scrim.addColorStop(0, 'rgba(10,2,18,0)');
  scrim.addColorStop(1, 'rgba(10,2,18,0.72)');
  ctx.save();
  ctx.fillStyle = scrim;
  ctx.fillRect(0, zone.y - zone.h * 0.5, W, zone.h * 1.5);
  ctx.restore();
  const text = (caption || 'VICE SUNSET').toUpperCase();
  drawCaptionText(ctx, text, zone, zone.h * 0.78, Math.max(1, zone.h * 0.02), subcaption);
}

// The whole cover: panels, grade, caption, outer frame.
export function renderCover(ctx, W, H, state) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, W, H);
  const { panels, caption } = layoutPanels(state.layout, W, H);
  panels.forEach((rect, i) => {
    const photoIndex = state.panelPhoto?.[i] ?? 0;
    const photo = state.photos?.[photoIndex];
    drawPanel(ctx, photo?.img ?? null, rect, photo, state.grade);
  });
  drawCaption(ctx, caption, state.caption, state.subcaption, W);
  const edge = Math.max(3, Math.round(Math.min(W, H) * 0.008));
  ctx.save();
  ctx.strokeStyle = 'rgba(10,2,18,0.9)';
  ctx.lineWidth = edge;
  ctx.strokeRect(edge / 2, edge / 2, W - edge, H - edge);
  ctx.restore();
  return { panels, caption };
}

export function sizeParts(size) {
  const [w, h] = size.split('x').map(Number);
  return { w, h };
}

// Render an export-size cover offscreen and hand back a PNG blob.
export function exportCoverPng(state) {
  const { w, h } = sizeParts(state.size);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  renderCover(canvas.getContext('2d'), w, h, state);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
