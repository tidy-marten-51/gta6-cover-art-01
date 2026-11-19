// Neon Coast — the cover renderer. Everything the cover looks like lives here:
// the multi-panel layouts, the Vice City grade, and the bold condensed caption
// lettering. One function, drawCoverArt, paints a whole cover onto any 2D canvas
// at any size from the same plain state object, so the live preview and the
// exported PNG are the same drawing, and the same inputs always give the same
// pixels (no clock, no random numbers, no network).

// A panel is one rectangle of the cover: { x, y, w, h } in fractions of the
// cover, plus the photo that fills it and how it is cropped inside it.
export const LAYOUTS = {
  // Four equal panels, the classic poster grid.
  grid: {
    label: '2 x 2 grid',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  // One tall hero on the left, three stacked panels on the right.
  hero: {
    label: 'Hero + strip',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 1 / 3 },
      { x: 0.62, y: 1 / 3, w: 0.38, h: 1 / 3 },
      { x: 0.62, y: 2 / 3, w: 0.38, h: 1 / 3 },
    ],
  },
  // Three tall panels side by side, the loading-screen strip.
  columns: {
    label: '3 vertical panels',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  // One photo, full bleed, the single-hero poster.
  single: {
    label: 'Single hero',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
};

export const LAYOUT_ORDER = ['grid', 'hero', 'columns', 'single'];

// The three colour grades. Each is a sky wash (top), a hot wash (bottom) and
// the lettering gradient, so the caption always matches the grade.
export const THEMES = {
  sunset: {
    label: 'Sunset',
    sky: 'rgba(255, 122, 26, 0.34)',
    sea: 'rgba(214, 36, 120, 0.42)',
    deep: 'rgba(43, 16, 66, 0.30)',
    title: ['#ffe259', '#ff7b2f', '#ff2e88'],
    band: '#2b1042',
  },
  neon: {
    label: 'Neon',
    sky: 'rgba(0, 224, 255, 0.30)',
    sea: 'rgba(255, 46, 196, 0.40)',
    deep: 'rgba(10, 8, 48, 0.34)',
    title: ['#7df9ff', '#00c2ff', '#ff2ec4'],
    band: '#0a0830',
  },
  gold: {
    label: 'Gold',
    sky: 'rgba(255, 196, 0, 0.30)',
    sea: 'rgba(255, 110, 0, 0.38)',
    deep: 'rgba(46, 24, 4, 0.30)',
    title: ['#fff6bf', '#ffc233', '#ff7b00'],
    band: '#2e1804',
  },
};

export const THEME_ORDER = ['sunset', 'neon', 'gold'];

// The three export sizes, in pixels.
export const EXPORT_SIZES = {
  square: { label: '1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: '1080 x 1350', w: 1080, h: 1350 },
  wide: { label: '1920 x 1080', w: 1920, h: 1080 },
};

export const EXPORT_ORDER = ['square', 'portrait', 'wide'];

// The white frame between panels, as a fraction of the cover's short side.
const GUTTER = 0.006;
// The dark band the big caption sits on, as a fraction of the cover height.
const BAND_H = 0.19;

// The panel rectangles of a layout, in pixels, for a cover of width w and
// height h. Every panel is inset by half a gutter so the white frame shows
// evenly between neighbours and around the edge.
export function panelRects(layout, w, h) {
  const g = Math.max(2, Math.round(Math.min(w, h) * GUTTER));
  return LAYOUTS[layout].panels.map((p) => ({
    x: Math.round(p.x * w) + g / 2,
    y: Math.round(p.y * h) + g / 2,
    w: Math.round(p.w * w) - g,
    h: Math.round(p.h * h) - g,
  }));
}

// Draws one photo into one panel rectangle, cover-fit, zoomed and panned by
// the panel's crop: zoom 1 fills the panel, larger zooms in, ox/oy shift the
// photo in fractions of the panel (0 is centred, +-0.5 is an edge).
export function drawPanelPhoto(ctx, rect, photo, crop) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!photo) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3a2b4d');
    g.addColorStop(1, '#1c1226');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    return;
  }
  const zoom = crop?.zoom ?? 1;
  const ox = crop?.ox ?? 0;
  const oy = crop?.oy ?? 0;
  const base = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * zoom;
  const pw = photo.naturalWidth * base;
  const ph = photo.naturalHeight * base;
  // Pan, but never so far that the photo stops covering the panel: clamp the
  // offset to the range where an edge of the photo still meets the panel edge.
  const dx = Math.max(x + w - pw, Math.min(x, x + (w - pw) / 2 + ox * w));
  const dy = Math.max(y + h - ph, Math.min(y, y + (h - ph) / 2 + oy * h));
  ctx.drawImage(photo, dx, dy, pw, ph);
  ctx.restore();
}

// The Vice City grade over one panel: a warm sky wash from the top, a hot
// wash from the bottom, a deep violet shade for contrast, then a vignette
// that darkens the corners so the panels read as poster art.
export function gradePanel(ctx, rect, theme) {
  const { x, y, w, h } = rect;
  const t = THEMES[theme];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(x, y, x, y + h * 0.7);
  sky.addColorStop(0, t.sky);
  sky.addColorStop(1, 'rgba(255, 122, 26, 0)');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  const sea = ctx.createLinearGradient(x, y + h * 0.3, x, y + h);
  sea.addColorStop(0, 'rgba(214, 36, 120, 0)');
  sea.addColorStop(1, t.sea);
  ctx.fillStyle = sea;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = t.deep;
  ctx.fillRect(x, y, w, h);
  const vig = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.32,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.72,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Bold condensed capitals: the font stack is system fonts only (no font file
// is loaded), and the horizontal squeeze gives the tall poster-lettering look
// on any machine. Returns the fitted size so the caller can place the line.
export function drawCaptionLine(ctx, text, cx, baselineY, maxWidth, maxSize, theme, fill = true) {
  const line = text.trim().toUpperCase();
  if (!line) return 0;
  const t = THEMES[theme];
  let size = maxSize;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  const measure = (s) => {
    ctx.font = `900 ${s}px Impact, "Arial Narrow", "Franklin Gothic Medium", "Helvetica Neue", sans-serif`;
    return ctx.measureText(line).width * 0.82;
  };
  while (size > 10 && measure(size) > maxWidth) size -= 2;
  ctx.font = `900 ${size}px Impact, "Arial Narrow", "Franklin Gothic Medium", "Helvetica Neue", sans-serif`;
  ctx.translate(cx, baselineY);
  ctx.scale(0.82, 1);
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeStyle = 'rgba(12, 4, 24, 0.92)';
  ctx.strokeText(line, 0, 0);
  if (fill) {
    const grad = ctx.createLinearGradient(0, -size, 0, size * 0.18);
    grad.addColorStop(0, t.title[0]);
    grad.addColorStop(0.55, t.title[1]);
    grad.addColorStop(1, t.title[2]);
    ctx.fillStyle = grad;
    ctx.fillText(line, 0, 0);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, 0, 0);
  }
  ctx.restore();
  return size;
}

// Draws the whole cover: white frame, photos with their grade, the top line
// small across the top, and the big title on a dark band along the foot.
// `state` is { layout, theme, top, bottom, panels: [{ photo, zoom, ox, oy }] }.
export function drawCoverArt(ctx, w, h, state) {
  const theme = THEMES[state.theme] ? state.theme : 'sunset';
  const t = THEMES[theme];
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f4f0e8';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] ?? {};
    drawPanelPhoto(ctx, rect, panel.photo ?? null, panel);
    gradePanel(ctx, rect, theme);
  });
  // The dark band the title sits on, with a thin bright rule above it.
  const bandY = h * (1 - BAND_H);
  ctx.fillStyle = t.band;
  ctx.fillRect(0, bandY, w, h - bandY);
  ctx.fillStyle = t.title[1];
  ctx.fillRect(0, bandY, w, Math.max(2, h * 0.006));
  // Top line: small white capitals with wide tracking, over the top panels.
  const top = (state.top ?? '').trim().toUpperCase();
  if (top) {
    const size = Math.round(Math.min(w, h) * 0.045);
    ctx.save();
    ctx.font = `800 ${size}px "Arial Narrow", "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(12, 4, 24, 0.9)';
    const y = size * 1.6;
    ctx.strokeText(top.split('').join('\u2009'), w / 2, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(top.split('').join('\u2009'), w / 2, y);
    ctx.restore();
  }
  // Big title, fitted to the band.
  const bottom = (state.bottom ?? '').trim();
  if (bottom) {
    drawCaptionLine(
      ctx, bottom, w / 2, h - h * 0.045,
      w * 0.94, h * BAND_H * 0.62, theme, true,
    );
  }
  ctx.restore();
}

// Renders a cover onto a fresh offscreen canvas at the export size and
// returns the canvas, so exports are drawn at full resolution, never a
// screenshot upscale of the preview.
export function renderExportCanvas(state, sizeKey) {
  const size = EXPORT_SIZES[sizeKey] ?? EXPORT_SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCoverArt(canvas.getContext('2d'), size.w, size.h, state);
  return canvas;
}
