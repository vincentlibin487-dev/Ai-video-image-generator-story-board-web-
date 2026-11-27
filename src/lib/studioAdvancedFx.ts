// ============================================================================
// CINE STUDIO ADVANCED FX ENGINE
// Shared between Live Preview Canvas & Final Video Export Canvas:
// 1. Chroma Key / Green Screen Removal + Background Replacement
// 2. Dual Split-Screen / Side-by-Side 2-Media Video & Photo Joiner
// 3. Movie Trailer Studio: Animated Titles, Trailer FX & Image-to-Trailer Cards
// ============================================================================

export type ChromaKeyColorPreset = 'green' | 'neon_green' | 'blue' | 'cyan' | 'custom';
export type ChromaBgMode =
  | 'black'
  | 'studio_teal'
  | 'sunset_gold'
  | 'cyber_grid'
  | 'action_crimson'
  | 'blur_bg'
  | 'custom_media';

export interface ChromaKeyConfig {
  enabled: boolean;
  colorPreset: ChromaKeyColorPreset;
  customHex: string;
  similarity: number; // 10 - 90
  smoothness: number; // 0 - 50
  spillReduction: number; // 0 - 100
  bgMode: ChromaBgMode;
  bgMediaUrl?: string;
  bgMediaType?: 'video' | 'photo';
  bgLabel?: string;
}

export const DEFAULT_CHROMA_KEY_CONFIG: ChromaKeyConfig = {
  enabled: false,
  colorPreset: 'green',
  customHex: '#00b140',
  similarity: 40,
  smoothness: 16,
  spillReduction: 55,
  bgMode: 'studio_teal',
};

export type SplitLayoutType =
  | 'left_right'
  | 'top_bottom'
  | 'diagonal'
  | 'pip_bottom_right'
  | 'pip_top_right'
  | 'dual_cards'
  | 'mirror_twin'
  | 'triple_trio';

export interface SplitScreenConfig {
  enabled: boolean;
  layout: SplitLayoutType;
  leftMediaUrl: string;
  leftMediaType: 'video' | 'photo';
  leftLabel: string;
  rightMediaUrl: string;
  rightMediaType: 'video' | 'photo';
  rightLabel: string;
  splitRatio: number; // 25 - 75
  showBorder: boolean; // false = seamless unified frame (no center line), true = visible border/divider
  gapPx: number; // 0 - 24
  borderColor: string;
  cornerRadius: number; // 0 - 28
  swapSides: boolean;
}

export const DEFAULT_SPLIT_SCREEN_CONFIG: SplitScreenConfig = {
  enabled: false,
  layout: 'left_right',
  leftMediaUrl: '',
  leftMediaType: 'video',
  leftLabel: 'Clip 1 (Left)',
  rightMediaUrl: '',
  rightMediaType: 'video',
  rightLabel: 'Clip 2 (Right)',
  splitRatio: 50,
  showBorder: false,
  gapPx: 0,
  borderColor: '#2dd4bf',
  cornerRadius: 0,
  swapSides: false,
};

export type TitleAnimationType =
  | 'none'
  | 'zoom_slam'
  | 'gold_rise'
  | 'typewriter'
  | 'neon_flicker'
  | 'glitch_slice'
  | 'epic_spread'
  | 'curtain_reveal'
  | 'fire_ember'
  | 'countdown_321';

export type TitleThemeType =
  | 'classic_white'
  | 'blockbuster_gold'
  | 'crimson_horror'
  | 'cyber_neon'
  | 'hollywood_chrome'
  | 'hero_impact'
  | 'birthday_rose'
  | 'emerald_cinema';

export type TitleStyleMode =
  | 'standard'
  | 'stacked_4line'
  | 'neon_box'
  | 'gold_crest'
  | 'punch_slant'
  | 'horror_drip'
  | 'comedy_pop'
  | 'news_bar'
  | 'birthday_confetti'
  | 'malayalam_bold'
  | 'split_duotone';

export type EmblemCrestShape =
  | 'shield'
  | 'crown'
  | 'film_reel'
  | 'star_crest'
  | 'wings'
  | 'neon_hex'
  | 'birthday_star'
  | 'royal_seal';

export interface EmblemTrailerConfig {
  enabled: boolean;
  shape: EmblemCrestShape;
  studioName: string;
  tagline: string;
  subline: string;
  accentColor: string;
  customLogoUrl?: string;
  animStyle: 'spin_reveal' | 'slam_impact' | 'light_sweep' | 'fire_forge';
  scale: number;
}

export const DEFAULT_EMBLEM_TRAILER_CONFIG: EmblemTrailerConfig = {
  enabled: false,
  shape: 'shield',
  studioName: 'ROYAL CINEMAS',
  tagline: 'PRESENTS AN EPIC ACTION TRAILER',
  subline: '4K ULTRA HD · WORLDWIDE',
  accentColor: '#fbbf24',
  animStyle: 'light_sweep',
  scale: 1,
};

export type TrailerFxMode =
  | 'none'
  | 'anamorphic_flare'
  | 'flash_cuts'
  | 'bass_shake'
  | 'green_band_opener'
  | 'countdown_pulse'
  | 'ember_storm'
  | 'glitch_thriller'
  | 'royal_spotlight';

export type TrailerCardTheme =
  | 'blockbuster_gold'
  | 'action_flame'
  | 'scifi_holo'
  | 'noir_mystery'
  | 'hero_comic'
  | 'royal_premiere';

export type TrailerCardAnimation =
  | 'tilt_float'
  | 'slam_shake'
  | 'flip_reveal'
  | 'zoom_ken_burns'
  | 'slide_spotlight';

export interface TrailerCardLayer {
  id: string;
  imageUrl: string;
  mediaType: 'video' | 'photo';
  title: string;
  subtitle: string;
  badgeText: string;
  theme: TrailerCardTheme;
  animation: TrailerCardAnimation;
  startTimeSec: number;
  durationSec: number;
  scale: number;
  xPct: number;
  yPct: number;
  opacity: number;
}

export interface TrailerPresetPack {
  id: string;
  name: string;
  category: 'Blockbuster' | 'Action' | 'Horror' | 'Sci-Fi' | 'Romance' | 'Countdown';
  title: string;
  subtitle: string;
  director: string;
  titleAnim: TitleAnimationType;
  titleTheme: TitleThemeType;
  fxMode: TrailerFxMode;
  cardTheme: TrailerCardTheme;
  cardAnim: TrailerCardAnimation;
  description: string;
  accent: string;
}

export const TRAILER_TITLE_ANIMATIONS: Array<{
  id: TitleAnimationType;
  name: string;
  tag: string;
  desc: string;
}> = [
  { id: 'zoom_slam', name: '3D Zoom Slam', tag: 'Action', desc: 'Title slams onto screen with dramatic impact shake' },
  { id: 'epic_spread', name: 'Cinema Tracking Spread', tag: 'Epic', desc: 'Letters smoothly expand wide with golden lens sweep' },
  { id: 'gold_rise', name: 'Golden Fade Rise', tag: 'Premiere', desc: 'Blockbuster gold reveal with warm glow halo' },
  { id: 'typewriter', name: 'Classified Typewriter', tag: 'Thriller', desc: 'Character-by-character tactical dossier reveal' },
  { id: 'glitch_slice', name: 'Cyber Glitch Slice', tag: 'Sci-Fi', desc: 'RGB split & high-tech digital glitch entrance' },
  { id: 'neon_flicker', name: 'Neon Pulse Flicker', tag: 'Synth', desc: 'Electric cyan & magenta tube flicker' },
  { id: 'curtain_reveal', name: 'Anamorphic Curtain Reveal', tag: 'Cinema', desc: 'Dual cinema doors part to unveil the title' },
  { id: 'fire_ember', name: 'Inferno Ember Rise', tag: 'Trailer', desc: 'Glowing ember sparks sweep behind fiery text' },
  { id: 'countdown_321', name: '3-2-1 Film Countdown', tag: 'Teaser', desc: 'Pulsing 3..2..1 teaser clock before title reveal' },
  { id: 'none', name: 'Static Clean Title', tag: 'Clean', desc: 'Crisp un-animated cinema title display' },
];

export const TRAILER_TITLE_THEMES: Array<{
  id: TitleThemeType;
  name: string;
  previewColor: string;
}> = [
  { id: 'blockbuster_gold', name: '24K Blockbuster Gold', previewColor: '#fbbf24' },
  { id: 'hollywood_chrome', name: 'Hollywood Silver Chrome', previewColor: '#e2e8f0' },
  { id: 'crimson_horror', name: 'Crimson Thriller Blood', previewColor: '#ef4444' },
  { id: 'cyber_neon', name: 'Cyberpunk Electric Cyan', previewColor: '#22d3ee' },
  { id: 'hero_impact', name: 'Marvel Hero Impact', previewColor: '#f97316' },
  { id: 'classic_white', name: 'Pure Studio White', previewColor: '#ffffff' },
];

export const TRAILER_FX_OPTIONS: Array<{
  id: TrailerFxMode;
  name: string;
  badge: string;
  description: string;
}> = [
  { id: 'none', name: 'No Trailer FX', badge: 'Off', description: 'Standard clean canvas' },
  { id: 'anamorphic_flare', name: '2.39:1 Cinema + Lens Flare', badge: 'Cinema', description: 'Black movie bars + sweeping blue/gold anamorphic flare' },
  { id: 'flash_cuts', name: 'Rhythmic Trailer Strobe Cuts', badge: 'Teaser', description: 'Dramatic dark/flash beat cuts like Hollywood teasers' },
  { id: 'bass_shake', name: 'Trailer Impact Bass Shake', badge: 'Action', description: 'Sub-bass rhythmic camera tremors on beat peaks' },
  { id: 'green_band_opener', name: 'MPAA Green-Band Trailer Card', badge: 'Opener', description: 'Authentic cinema trailer green-band banner stamp' },
  { id: 'countdown_pulse', name: '3·2·1 Countdown Target Ring', badge: 'Countdown', description: 'Circular cinema reel countdown reticle overlay' },
  { id: 'ember_storm', name: 'Rising Fire Embers & Haze', badge: 'Epic', description: 'Floating glowing cinema embers & warm smoke glow' },
  { id: 'glitch_thriller', name: 'Spy Thriller Scanlines', badge: 'Sci-Fi', description: 'Digital scanlines & chromatic edge flicker' },
  { id: 'royal_spotlight', name: 'Premiere Gold Spotlight', badge: 'Award', description: 'Sweeping premiere searchlights & star bokeh' },
];

export const TRAILER_CARD_THEMES: Array<{
  id: TrailerCardTheme;
  name: string;
  accent: string;
}> = [
  { id: 'blockbuster_gold', name: 'Gold Blockbuster Card', accent: '#f59e0b' },
  { id: 'action_flame', name: 'Action Flame Poster Card', accent: '#ef4444' },
  { id: 'scifi_holo', name: 'Sci-Fi Hologram HUD Card', accent: '#22d3ee' },
  { id: 'noir_mystery', name: 'Noir Thriller Dossier Card', accent: '#e4e4e7' },
  { id: 'hero_comic', name: 'Comic Universe Hero Card', accent: '#f97316' },
  { id: 'royal_premiere', name: 'Royal Festival Premiere Card', accent: '#eab308' },
];

export const TRAILER_CARD_ANIMATIONS: Array<{
  id: TrailerCardAnimation;
  name: string;
}> = [
  { id: 'tilt_float', name: '3D Float + Gold Shine' },
  { id: 'slam_shake', name: 'Action Slam + Shake' },
  { id: 'flip_reveal', name: '3D Card Flip Reveal' },
  { id: 'zoom_ken_burns', name: 'Dramatic Zoom Push' },
  { id: 'slide_spotlight', name: 'Spotlight Beam Slide' },
];

export const TRAILER_PRESET_PACKS: TrailerPresetPack[] = [
  {
    id: 'tp_blockbuster',
    name: 'THE DARK HORIZON',
    category: 'Blockbuster',
    title: 'THE DARK HORIZON',
    subtitle: 'ONE CHANCE TO SURVIVE',
    director: 'IN CINEMAS THIS FRIDAY · IMAX',
    titleAnim: 'epic_spread',
    titleTheme: 'blockbuster_gold',
    fxMode: 'anamorphic_flare',
    cardTheme: 'blockbuster_gold',
    cardAnim: 'tilt_float',
    description: '24K gold blockbuster reveal with anamorphic black bars & flare sweep',
    accent: '#fbbf24',
  },
  {
    id: 'tp_action',
    name: 'OVERDRIVE PROTOCOL',
    category: 'Action',
    title: 'OVERDRIVE',
    subtitle: 'NO MERCY. NO RETREAT.',
    director: 'A SUMMER ACTION EVENT',
    titleAnim: 'zoom_slam',
    titleTheme: 'hero_impact',
    fxMode: 'bass_shake',
    cardTheme: 'action_flame',
    cardAnim: 'slam_shake',
    description: 'High-impact slam title with bass camera shake & inferno embers',
    accent: '#f97316',
  },
  {
    id: 'tp_horror',
    name: 'MIDNIGHT SILENCE',
    category: 'Horror',
    title: 'NEVER SLEEP',
    subtitle: 'IT LIVES IN THE SHADOWS',
    director: 'EXPERIENCE IT IN DOLBY',
    titleAnim: 'typewriter',
    titleTheme: 'crimson_horror',
    fxMode: 'flash_cuts',
    cardTheme: 'noir_mystery',
    cardAnim: 'flip_reveal',
    description: 'Chilling typewriter reveal + rhythmic strobe flash cuts',
    accent: '#ef4444',
  },
  {
    id: 'tp_scifi',
    name: 'NEON SINGULARITY',
    category: 'Sci-Fi',
    title: 'SINGULARITY',
    subtitle: 'YEAR 2099 · PROTOCOL ZERO',
    director: 'FROM THE MAKERS OF NEXUS',
    titleAnim: 'glitch_slice',
    titleTheme: 'cyber_neon',
    fxMode: 'glitch_thriller',
    cardTheme: 'scifi_holo',
    cardAnim: 'zoom_ken_burns',
    description: 'Holographic HUD card with RGB cyber glitch & scanlines',
    accent: '#22d3ee',
  },
  {
    id: 'tp_countdown',
    name: 'TEASER COUNTDOWN',
    category: 'Countdown',
    title: 'COMING SOON',
    subtitle: 'OFFICIAL TRAILER PREMIERE',
    director: 'WORLDWIDE RELEASE',
    titleAnim: 'countdown_321',
    titleTheme: 'hollywood_chrome',
    fxMode: 'countdown_pulse',
    cardTheme: 'royal_premiere',
    cardAnim: 'slide_spotlight',
    description: '3-2-1 film reel countdown + premiere gold spotlight',
    accent: '#a855f7',
  },
  {
    id: 'tp_romance',
    name: 'ETERNAL PROMISE',
    category: 'Romance',
    title: 'ETERNAL SKY',
    subtitle: 'SOME STORIES NEVER END',
    director: 'OFFICIAL FESTIVAL SELECTION',
    titleAnim: 'gold_rise',
    titleTheme: 'blockbuster_gold',
    fxMode: 'royal_spotlight',
    cardTheme: 'royal_premiere',
    cardAnim: 'tilt_float',
    description: 'Warm golden halo rise with sweeping premiere searchlight',
    accent: '#ec4899',
  },
];

function parseHexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 177;
    const b = parseInt(clean[2] + clean[2], 16) || 64;
    return [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  }
  return [0, 177, 64];
}

// Shared offscreen canvas for fast Chroma Key pixel keying
let sharedChromaCanvas: HTMLCanvasElement | null = null;
function getSharedChromaCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (!sharedChromaCanvas) {
    sharedChromaCanvas = document.createElement('canvas');
  }
  if (sharedChromaCanvas.width !== w || sharedChromaCanvas.height !== h) {
    sharedChromaCanvas.width = w;
    sharedChromaCanvas.height = h;
  }
  return sharedChromaCanvas;
}

/**
 * Draws any background mode for Chroma Key (Solid studio gradient, Cyber Grid, or User Photo/Video)
 */
export function drawChromaBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: ChromaKeyConfig,
  secTime: number,
  customBgSource?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null,
  selfSource?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null
) {
  ctx.save();
  ctx.filter = 'none';

  if (config.bgMode === 'custom_media' && customBgSource) {
    let sw = 0;
    let sh = 0;
    if (customBgSource instanceof HTMLVideoElement && customBgSource.readyState >= 2) {
      sw = customBgSource.videoWidth;
      sh = customBgSource.videoHeight;
    } else if (customBgSource instanceof HTMLImageElement && customBgSource.complete) {
      sw = customBgSource.naturalWidth;
      sh = customBgSource.naturalHeight;
    } else if (customBgSource instanceof HTMLCanvasElement) {
      sw = customBgSource.width;
      sh = customBgSource.height;
    }
    if (sw > 0 && sh > 0) {
      const sAsp = sw / sh;
      const cAsp = w / h;
      const dw = sAsp > cAsp ? h * sAsp : w;
      const dh = sAsp > cAsp ? h : w / sAsp;
      ctx.drawImage(customBgSource, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      return;
    }
  }

  if (config.bgMode === 'blur_bg' && selfSource) {
    let sw = 0;
    let sh = 0;
    if (selfSource instanceof HTMLVideoElement && selfSource.readyState >= 2) {
      sw = selfSource.videoWidth;
      sh = selfSource.videoHeight;
    } else if (selfSource instanceof HTMLImageElement && selfSource.complete) {
      sw = selfSource.naturalWidth;
      sh = selfSource.naturalHeight;
    } else if (selfSource instanceof HTMLCanvasElement) {
      sw = selfSource.width;
      sh = selfSource.height;
    }
    if (sw > 0 && sh > 0) {
      ctx.filter = 'blur(16px) brightness(72%)';
      const sAsp = sw / sh;
      const cAsp = w / h;
      const dw = (sAsp > cAsp ? h * sAsp : w) * 1.12;
      const dh = (sAsp > cAsp ? h : w / sAsp) * 1.12;
      ctx.drawImage(selfSource, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      return;
    }
  }

  if (config.bgMode === 'black') {
    ctx.fillStyle = '#05070a';
    ctx.fillRect(-w / 2, -h / 2, w, h);
  } else if (config.bgMode === 'sunset_gold') {
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, '#451a03');
    g.addColorStop(0.5, '#9a3412');
    g.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  } else if (config.bgMode === 'action_crimson') {
    const g = ctx.createRadialGradient(0, 0, w * 0.05, 0, 0, w * 0.75);
    g.addColorStop(0, '#7f1d1d');
    g.addColorStop(0.6, '#270909');
    g.addColorStop(1, '#09090b');
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  } else if (config.bgMode === 'cyber_grid') {
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#041224');
    g.addColorStop(1, '#120829');
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.22)';
    ctx.lineWidth = 1.5;
    const shift = (secTime * 28) % 48;
    for (let x = -w / 2; x <= w / 2; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, -h / 2);
      ctx.lineTo(x, h / 2);
      ctx.stroke();
    }
    for (let y = -h / 2 + shift; y <= h / 2; y += 48) {
      ctx.beginPath();
      ctx.moveTo(-w / 2, y);
      ctx.lineTo(w / 2, y);
      ctx.stroke();
    }
  } else {
    // 'studio_teal' default
    const g = ctx.createRadialGradient(0, -h * 0.1, 10, 0, 0, Math.max(w, h) * 0.75);
    g.addColorStop(0, '#0f3d44');
    g.addColorStop(0.55, '#071b24');
    g.addColorStop(1, '#04080d');
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }

  ctx.restore();
}

/**
 * Renders a video or photo source through real-time pixel Chroma Keying onto `ctx`
 * centered at (0, 0) using cover scaling inside (targetW, targetH).
 */
export function drawChromaKeyedSource(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  config: ChromaKeyConfig,
  maxWorkEdge = 460
): boolean {
  if (srcW <= 0 || srcH <= 0) return false;

  const scaleToWork = Math.min(1, maxWorkEdge / Math.max(targetW, targetH));
  const workW = Math.max(64, Math.round(targetW * scaleToWork));
  const workH = Math.max(64, Math.round(targetH * scaleToWork));
  const workCanvas = getSharedChromaCanvas(workW, workH);
  if (!workCanvas) return false;
  const wCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!wCtx) return false;

  // Draw cover-fitted source into workCanvas
  const srcAsp = srcW / srcH;
  const workAsp = workW / workH;
  let drawW = workW;
  let drawH = workH;
  if (srcAsp > workAsp) drawW = workH * srcAsp;
  else drawH = workW / srcAsp;

  wCtx.clearRect(0, 0, workW, workH);
  wCtx.drawImage(source, (workW - drawW) / 2, (workH - drawH) / 2, drawW, drawH);

  let imgData: ImageData;
  try {
    imgData = wCtx.getImageData(0, 0, workW, workH);
  } catch {
    // Tainted cross-origin fallback: draw unkeyed without crashing
    ctx.drawImage(workCanvas, -targetW / 2, -targetH / 2, targetW, targetH);
    return true;
  }

  const data = imgData.data;

  // Target key RGB + Cb/Cr
  let targetRgb: [number, number, number] = [0, 177, 64];
  if (config.colorPreset === 'neon_green') targetRgb = [0, 255, 0];
  else if (config.colorPreset === 'blue') targetRgb = [0, 71, 187];
  else if (config.colorPreset === 'cyan') targetRgb = [0, 210, 255];
  else if (config.colorPreset === 'custom') targetRgb = parseHexToRgb(config.customHex);

  const [kr, kg, kb] = targetRgb;
  const keyCb = -0.168736 * kr - 0.331264 * kg + 0.5 * kb + 128;
  const keyCr = 0.5 * kr - 0.418688 * kg - 0.081312 * kb + 128;

  const isGreenKey =
    config.colorPreset === 'green' ||
    config.colorPreset === 'neon_green' ||
    (config.colorPreset === 'custom' && kg > kr + 20 && kg > kb + 20);
  const isBlueKey =
    config.colorPreset === 'blue' ||
    (config.colorPreset === 'custom' && kb > kr + 20 && kb > kg + 10);

  const simDist = 18 + (config.similarity / 100) * 95;
  const smoothRange = Math.max(4, (config.smoothness / 100) * 65);
  const spillAmt = config.spillReduction / 100;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
    const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
    const chromaDist = Math.hypot(cb - keyCb, cr - keyCr);

    // Extra hue dominance check prevents dark neutral blacks from accidental knockout
    const dominance = isGreenKey
      ? g - Math.max(r, b)
      : isBlueKey
      ? b - Math.max(r, g)
      : 20;

    const effectiveDist = dominance > 4 ? chromaDist : chromaDist + 32;

    if (effectiveDist < simDist) {
      data[i + 3] = 0;
    } else if (effectiveDist < simDist + smoothRange) {
      const alphaFactor = (effectiveDist - simDist) / smoothRange;
      data[i + 3] = Math.round(data[i + 3] * alphaFactor);
      if (spillAmt > 0 && isGreenKey) {
        const avgRB = Math.max(r, b);
        if (g > avgRB) {
          data[i + 1] = Math.round(g - (g - avgRB) * spillAmt);
        }
      } else if (spillAmt > 0 && isBlueKey) {
        const avgRG = Math.max(r, g);
        if (b > avgRG) {
          data[i + 2] = Math.round(b - (b - avgRG) * spillAmt);
        }
      }
    } else if (spillAmt > 0 && isGreenKey && g > Math.max(r, b) + 6) {
      const limit = Math.max(r, b) + 6;
      data[i + 1] = Math.round(g - (g - limit) * spillAmt * 0.72);
    } else if (spillAmt > 0 && isBlueKey && b > Math.max(r, g) + 6) {
      const limit = Math.max(r, g) + 6;
      data[i + 2] = Math.round(b - (b - limit) * spillAmt * 0.72);
    }
  }

  wCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(workCanvas, -targetW / 2, -targetH / 2, targetW, targetH);
  return true;
}

/**
 * Helper to draw a cover-fitted media source inside an arbitrary box (x, y, boxW, boxH)
 */
export function drawSourceInBox(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null | undefined,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  radius = 0,
  mirrorX = false
): boolean {
  if (!source) return false;
  let sw = 0;
  let sh = 0;
  if (source instanceof HTMLVideoElement) {
    if (source.readyState < 2 || source.videoWidth <= 0) return false;
    sw = source.videoWidth;
    sh = source.videoHeight;
  } else if (source instanceof HTMLImageElement) {
    if (!source.complete || source.naturalWidth <= 0) return false;
    sw = source.naturalWidth;
    sh = source.naturalHeight;
  } else {
    if (source.width <= 0 || source.height <= 0) return false;
    sw = source.width;
    sh = source.height;
  }

  ctx.save();
  ctx.beginPath();
  if (radius > 0 && typeof ctx.roundRect === 'function') {
    ctx.roundRect(boxX, boxY, boxW, boxH, radius);
  } else {
    ctx.rect(boxX, boxY, boxW, boxH);
  }
  ctx.clip();

  const srcAsp = sw / sh;
  const boxAsp = boxW / Math.max(1, boxH);
  let dw = boxW;
  let dh = boxH;
  if (srcAsp > boxAsp) dw = boxH * srcAsp;
  else dh = boxW / srcAsp;

  const cx = boxX + boxW / 2;
  const cy = boxY + boxH / 2;
  ctx.translate(cx, cy);
  if (mirrorX) ctx.scale(-1, 1);
  ctx.drawImage(source, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  return true;
}

/**
 * Composites Two Videos/Photos Together in Split-Screen / Side-by-Side / PiP / Dual Cards
 * centered around (0, 0) in canvas coordinates (-w/2 .. w/2, -h/2 .. h/2).
 */
export function drawSplitScreenComposition(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: SplitScreenConfig,
  leftSource: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null | undefined,
  rightSource: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null | undefined
): boolean {
  const srcA = config.swapSides ? rightSource : leftSource;
  const srcB = config.swapSides ? leftSource : rightSource;
  const gap = Math.max(0, config.gapPx);
  const rad = Math.max(0, config.cornerRadius);
  const ratio = Math.min(0.75, Math.max(0.25, config.splitRatio / 100));

  ctx.save();
  ctx.fillStyle = '#05080d';
  ctx.fillRect(-w / 2, -h / 2, w, h);

  let anyDrawn = false;

  if (config.layout === 'top_bottom') {
    const topH = Math.round(h * ratio) - gap / 2;
    const botH = h - topH - gap;
    const d1 = drawSourceInBox(ctx, srcA, -w / 2, -h / 2, w, topH, rad);
    const d2 = drawSourceInBox(ctx, srcB || srcA, -w / 2, -h / 2 + topH + gap, w, botH, rad);
    anyDrawn = d1 || d2;
    if (gap > 0) {
      ctx.fillStyle = config.borderColor;
      ctx.fillRect(-w / 2, -h / 2 + topH, w, gap);
    }
  } else if (config.layout === 'diagonal') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(-w / 2 + w * (ratio + 0.12), -h / 2);
    ctx.lineTo(-w / 2 + w * (ratio - 0.12), h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.clip();
    anyDrawn = drawSourceInBox(ctx, srcA, -w / 2, -h / 2, w, h) || anyDrawn;
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-w / 2 + w * (ratio + 0.12), -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2 + w * (ratio - 0.12), h / 2);
    ctx.closePath();
    ctx.clip();
    anyDrawn = drawSourceInBox(ctx, srcB || srcA, -w / 2, -h / 2, w, h) || anyDrawn;
    ctx.restore();

    if (gap > 0) {
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = Math.max(2, gap);
      ctx.beginPath();
      ctx.moveTo(-w / 2 + w * (ratio + 0.12), -h / 2);
      ctx.lineTo(-w / 2 + w * (ratio - 0.12), h / 2);
      ctx.stroke();
    }
  } else if (config.layout === 'pip_bottom_right' || config.layout === 'pip_top_right') {
    anyDrawn = drawSourceInBox(ctx, srcA, -w / 2, -h / 2, w, h, 0) || anyDrawn;
    const pipW = Math.round(w * (0.24 + (ratio - 0.25) * 0.45));
    const pipH = Math.round((pipW * h) / w);
    const pad = Math.round(Math.min(w, h) * 0.045);
    const px = w / 2 - pipW - pad;
    const py = config.layout === 'pip_top_right' ? -h / 2 + pad : h / 2 - pipH - pad;
    const dPip = drawSourceInBox(ctx, srcB || srcA, px, py, pipW, pipH, Math.max(10, rad));
    anyDrawn = dPip || anyDrawn;
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = Math.max(2, gap || 3);
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(px, py, pipW, pipH, Math.max(10, rad));
    } else {
      ctx.rect(px, py, pipW, pipH);
    }
    ctx.stroke();
  } else if (config.layout === 'dual_cards') {
    const pad = Math.round(Math.min(w, h) * 0.04);
    const usableW = w - pad * 2 - Math.max(8, gap * 2);
    const leftW = Math.round(usableW * ratio);
    const rightW = usableW - leftW;
    const cardH = h - pad * 2;
    const lx = -w / 2 + pad;
    const rx = lx + leftW + Math.max(8, gap * 2);
    const d1 = drawSourceInBox(ctx, srcA, lx, -cardH / 2, leftW, cardH, Math.max(12, rad));
    const d2 = drawSourceInBox(ctx, srcB || srcA, rx, -cardH / 2, rightW, cardH, Math.max(12, rad));
    anyDrawn = d1 || d2;
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = 2.5;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(lx, -cardH / 2, leftW, cardH, Math.max(12, rad));
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(rx, -cardH / 2, rightW, cardH, Math.max(12, rad));
      ctx.stroke();
    }
  } else if (config.layout === 'triple_trio') {
    const colW = (w - gap * 2) / 3;
    const d1 = drawSourceInBox(ctx, srcA, -w / 2, -h / 2, colW, h, rad);
    const d2 = drawSourceInBox(ctx, srcB || srcA, -w / 2 + colW + gap, -h / 2, colW, h, rad);
    const d3 = drawSourceInBox(ctx, srcA, -w / 2 + (colW + gap) * 2, -h / 2, colW, h, rad, true);
    anyDrawn = d1 || d2 || d3;
  } else if (config.layout === 'mirror_twin') {
    const leftW = Math.round(w * ratio) - gap / 2;
    const rightW = w - leftW - gap;
    const d1 = drawSourceInBox(ctx, srcA, -w / 2, -h / 2, leftW, h, rad, false);
    const d2 = drawSourceInBox(ctx, srcA, -w / 2 + leftW + gap, -h / 2, rightW, h, rad, true);
    anyDrawn = d1 || d2;
    if (gap > 0) {
      ctx.fillStyle = config.borderColor;
      ctx.fillRect(-w / 2 + leftW, -h / 2, gap, h);
    }
  } else {
    // 'left_right' default 2-side join
    const leftW = Math.round(w * ratio) - gap / 2;
    const rightW = w - leftW - gap;
    const d1 = drawSourceInBox(ctx, srcA, -w / 2, -h / 2, leftW, h, rad);
    const d2 = drawSourceInBox(ctx, srcB || srcA, -w / 2 + leftW + gap, -h / 2, rightW, h, rad);
    anyDrawn = d1 || d2;
    if (gap > 0) {
      ctx.fillStyle = config.borderColor;
      ctx.fillRect(-w / 2 + leftW, -h / 2, gap, h);
    }
  }

  ctx.restore();
  return anyDrawn;
}

/**
 * Draws Cinema Trailer FX Overlays centered around (0, 0) (or screen coords when centered=false)
 */
export function drawTrailerFxOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mode: TrailerFxMode,
  tSec: number
) {
  if (mode === 'none') return;
  ctx.save();
  ctx.filter = 'none';

  if (mode === 'anamorphic_flare') {
    // 2.39:1 Anamorphic Cinema Bars
    const barH = Math.round(h * 0.115);
    ctx.fillStyle = '#000000';
    ctx.fillRect(-w / 2, -h / 2, w, barH);
    ctx.fillRect(-w / 2, h / 2 - barH, w, barH);

    // Horizontal Blue Anamorphic Streak
    const sweepY = Math.sin(tSec * 1.1) * (h * 0.14);
    const flareX = Math.sin(tSec * 0.7) * (w * 0.28);
    ctx.globalCompositeOperation = 'screen';
    const streak = ctx.createLinearGradient(-w / 2, sweepY, w / 2, sweepY);
    streak.addColorStop(0, 'rgba(0,0,0,0)');
    streak.addColorStop(0.45, 'rgba(56,189,248,0.45)');
    streak.addColorStop(0.5, 'rgba(224,242,254,0.88)');
    streak.addColorStop(0.55, 'rgba(251,191,36,0.38)');
    streak.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = streak;
    ctx.fillRect(-w / 2, sweepY - 5, w, 10);

    const orb = ctx.createRadialGradient(flareX, sweepY, 2, flareX, sweepY, w * 0.24);
    orb.addColorStop(0, 'rgba(255,255,255,0.65)');
    orb.addColorStop(0.4, 'rgba(56,189,248,0.22)');
    orb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = orb;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  } else if (mode === 'flash_cuts') {
    const pulse = Math.pow(Math.max(0, Math.sin(tSec * 5.2)), 6);
    if (pulse > 0.05) {
      ctx.fillStyle = `rgba(255,255,255,${pulse * 0.65})`;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    const barH = Math.round(h * 0.09);
    ctx.fillStyle = '#000000';
    ctx.fillRect(-w / 2, -h / 2, w, barH);
    ctx.fillRect(-w / 2, h / 2 - barH, w, barH);
  } else if (mode === 'bass_shake') {
    const barH = Math.round(h * 0.08);
    ctx.fillStyle = '#000000';
    ctx.fillRect(-w / 2, -h / 2, w, barH);
    ctx.fillRect(-w / 2, h / 2 - barH, w, barH);
    const beat = Math.pow(Math.max(0, Math.sin(tSec * 4.5)), 8);
    if (beat > 0.1) {
      ctx.strokeStyle = `rgba(249, 115, 22, ${beat * 0.7})`;
      ctx.lineWidth = 10 * beat;
      ctx.strokeRect(-w / 2 + 8, -h / 2 + barH + 4, w - 16, h - barH * 2 - 8);
    }
  } else if (mode === 'green_band_opener') {
    const greenH = Math.round(h * 0.18);
    ctx.fillStyle = '#047857';
    ctx.fillRect(-w / 2, h / 2 - greenH, w, greenH);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 + 12, h / 2 - greenH + 8, w - 24, greenH - 16);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.max(12, Math.round(h * 0.032))}px system-ui, sans-serif`;
    ctx.fillText('THE FOLLOWING PREVIEW HAS BEEN APPROVED FOR ALL AUDIENCES', 0, h / 2 - greenH / 2);
  } else if (mode === 'countdown_pulse') {
    const num = Math.max(1, 3 - (Math.floor(tSec) % 3));
    const frac = tSec - Math.floor(tSec);
    const r = Math.min(w, h) * (0.19 + frac * 0.04);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 1.1, 0);
    ctx.lineTo(r * 1.1, 0);
    ctx.moveTo(0, -r * 1.1);
    ctx.lineTo(0, r * 1.1);
    ctx.stroke();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.92)';
    ctx.font = `900 ${Math.round(r * 0.95)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), 0, 0);
  } else if (mode === 'ember_storm') {
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createLinearGradient(0, h * 0.1, 0, h / 2);
    glow.addColorStop(0, 'rgba(0,0,0,0)');
    glow.addColorStop(1, 'rgba(234,88,12,0.35)');
    ctx.fillStyle = glow;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    for (let i = 0; i < 36; i++) {
      const px = (((i * 197 + Math.sin(tSec * 1.5 + i) * 45 + tSec * 24) % w) + w) % w - w / 2;
      const py = h / 2 - ((((i * 89 + tSec * (55 + (i % 5) * 14)) % h) + h) % h);
      const r = 1.8 + (i % 4) * 1.2;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(253, 224, 71, 0.9)' : 'rgba(249, 115, 22, 0.85)';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mode === 'glitch_thriller') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let y = -h / 2; y < h / 2; y += 6) {
      ctx.fillRect(-w / 2, y, w, 1.5);
    }
    const bar = ((Math.sin(tSec * 13) * 0.42) * h);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.28)';
    ctx.fillRect(-w / 2, bar, w, 6);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
    ctx.fillRect(-w / 2, -bar * 0.75, w, 5);
  } else if (mode === 'royal_spotlight') {
    ctx.globalCompositeOperation = 'screen';
    const sweepX = Math.sin(tSec * 1.2) * (w * 0.35);
    const beam = ctx.createRadialGradient(sweepX, -h * 0.35, 10, sweepX, 0, Math.max(w, h) * 0.55);
    beam.addColorStop(0, 'rgba(253, 230, 138, 0.38)');
    beam.addColorStop(0.5, 'rgba(245, 158, 11, 0.14)');
    beam.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }

  ctx.restore();
}

/**
 * Animated Movie Trailer Title Renderer (shared by Preview Canvas & Export Canvas)
 */
export function drawAnimatedCinemaTitle(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  opts: {
    movieTitle: string;
    subtitle: string;
    directorText: string;
    extraLine3?: string;
    extraLine4?: string;
    titleXPct: number;
    titleYPct: number;
    titleScale: number;
    titleOpacity: number;
    titleStartSec: number;
    globalTimeSec: number;
    animationType: TitleAnimationType;
    themeType: TitleThemeType;
    titleStyleMode?: TitleStyleMode;
    customColor?: string;
    exportScaleRatio?: number;
  }
) {
  const localT = Math.max(0, opts.globalTimeSec - opts.titleStartSec);
  const ratio = opts.exportScaleRatio || 1;
  ctx.save();
  ctx.filter = 'none';

  let animAlpha = 1;
  let animScale = 1;
  let extraOffsetX = 0;
  let extraOffsetY = 0;
  let spreadSpace = 0;
  const rawMainLines = opts.movieTitle.split('\n').filter((l) => l.trim().length > 0);
  let displayMain = rawMainLines[0] || opts.movieTitle;

  if (opts.animationType === 'zoom_slam') {
    const p = Math.min(1, localT / 0.45);
    animScale = p < 1 ? 2.4 - 1.4 * Math.pow(p, 0.45) : 1 + Math.sin(localT * 28) * Math.max(0, 0.04 * (1 - Math.min(1, (localT - 0.45) / 0.5)));
    animAlpha = Math.min(1, p * 1.6);
  } else if (opts.animationType === 'epic_spread') {
    const p = Math.min(1, localT / 2.2);
    spreadSpace = p * 14;
    animScale = 0.92 + p * 0.14;
    animAlpha = Math.min(1, localT / 0.4);
  } else if (opts.animationType === 'gold_rise') {
    const p = Math.min(1, localT / 0.8);
    extraOffsetY = (1 - p) * 28;
    animAlpha = p;
  } else if (opts.animationType === 'typewriter') {
    const chars = Math.max(1, Math.floor((localT / 0.08) + 1));
    displayMain = displayMain.slice(0, chars);
  } else if (opts.animationType === 'glitch_slice') {
    if (Math.sin(localT * 32) > 0.78) {
      extraOffsetX = Math.sin(localT * 90) * 9;
    }
    animAlpha = Math.min(1, localT / 0.25);
  } else if (opts.animationType === 'neon_flicker') {
    const flicker = localT < 0.7 && Math.sin(localT * 45) < -0.2 ? 0.35 : 1;
    animAlpha = flicker;
  } else if (opts.animationType === 'curtain_reveal') {
    const p = Math.min(1, localT / 0.7);
    ctx.save();
    ctx.beginPath();
    const halfW = (canvasW * p) / 2;
    ctx.rect(canvasW / 2 - halfW, 0, halfW * 2, canvasH);
    ctx.clip();
  } else if (opts.animationType === 'fire_ember') {
    animScale = 1 + Math.sin(localT * 2.5) * 0.025;
    animAlpha = Math.min(1, localT / 0.45);
  } else if (opts.animationType === 'countdown_321') {
    if (localT < 2.4) {
      const step = Math.max(1, 3 - Math.floor(localT / 0.8));
      displayMain = `${step}`;
      animScale = 1.45 - ((localT % 0.8) / 0.8) * 0.35;
    }
  }

  ctx.globalAlpha = Math.max(0, Math.min(1, (opts.titleOpacity / 100) * animAlpha));
  const tx = (opts.titleXPct / 100) * canvasW + extraOffsetX * ratio;
  const ty = (opts.titleYPct / 100) * canvasH + extraOffsetY * ratio;
  ctx.translate(tx, ty);
  ctx.scale(opts.titleScale * ratio * animScale, opts.titleScale * ratio * animScale);
  ctx.textAlign = 'center';

  const styleMode = opts.titleStyleMode || 'standard';
  if (styleMode === 'punch_slant') {
    ctx.transform(1, 0, -0.14, 1, 0, 0);
  }

  let mainColor: string | CanvasGradient = opts.customColor || '#ffffff';
  let shadowCol = 'rgba(0,0,0,0.95)';
  let subColor = 'rgba(255,255,255,0.88)';
  if (!opts.customColor) {
    if (opts.themeType === 'blockbuster_gold') {
      const g = ctx.createLinearGradient(0, -32, 0, 24);
      g.addColorStop(0, '#fef08a');
      g.addColorStop(0.5, '#f59e0b');
      g.addColorStop(1, '#b45309');
      mainColor = g;
      shadowCol = 'rgba(245, 158, 11, 0.55)';
      subColor = '#fde68a';
    } else if (opts.themeType === 'crimson_horror') {
      mainColor = '#ef4444';
      shadowCol = 'rgba(127, 29, 29, 0.95)';
      subColor = '#fca5a5';
    } else if (opts.themeType === 'cyber_neon') {
      mainColor = '#22d3ee';
      shadowCol = 'rgba(6, 182, 212, 0.9)';
      subColor = '#f472b6';
    } else if (opts.themeType === 'hollywood_chrome') {
      const g = ctx.createLinearGradient(0, -34, 0, 24);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, '#cbd5e1');
      g.addColorStop(1, '#64748b');
      mainColor = g;
      shadowCol = 'rgba(15, 23, 42, 0.95)';
      subColor = '#e2e8f0';
    } else if (opts.themeType === 'hero_impact') {
      mainColor = '#fb923c';
      shadowCol = 'rgba(234, 88, 12, 0.9)';
      subColor = '#fef3c7';
    } else if (opts.themeType === 'birthday_rose') {
      mainColor = '#f472b6';
      shadowCol = 'rgba(236, 72, 153, 0.85)';
      subColor = '#fde047';
    } else if (opts.themeType === 'emerald_cinema') {
      mainColor = '#34d399';
      shadowCol = 'rgba(16, 185, 129, 0.8)';
      subColor = '#a7f3d0';
    }
  } else {
    shadowCol = 'rgba(0,0,0,0.9)';
    subColor = '#f4f4f5';
  }

  // Optional stylized backing frame for distinct Title Models
  if (styleMode === 'neon_box') {
    ctx.strokeStyle = typeof mainColor === 'string' ? mainColor : '#22d3ee';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(6, 10, 22, 0.72)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(-290, -68, 580, 142, 14);
    else ctx.rect(-290, -68, 580, 142);
    ctx.fill();
    ctx.stroke();
  } else if (styleMode === 'news_bar') {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-340, -56, 680, 114);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-340, 50, 680, 8);
  } else if (styleMode === 'comedy_pop') {
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(-280, -64, 560, 132, 24);
    else ctx.rect(-280, -64, 560, 132);
    ctx.fill();
    ctx.stroke();
    mainColor = '#09090b';
    subColor = '#dc2626';
    shadowCol = 'rgba(0,0,0,0)';
  } else if (styleMode === 'birthday_confetti') {
    for (let i = 0; i < 16; i += 1) {
      const cxp = Math.sin(i * 1.9 + localT * 2) * 260;
      const cyp = Math.cos(i * 2.3 + localT * 1.5) * 65;
      ctx.fillStyle = ['#fde047', '#f472b6', '#22d3ee', '#34d399'][i % 4];
      ctx.beginPath();
      ctx.arc(cxp, cyp, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (styleMode === 'gold_crest') {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-220, -48);
    ctx.lineTo(220, -48);
    ctx.moveTo(-220, 54);
    ctx.lineTo(220, 54);
    ctx.stroke();
  }

  // Gather up to 4 editable lines smoothly!
  const line2Text = rawMainLines[1] || opts.subtitle || '';
  const line3Text = rawMainLines[2] || opts.extraLine3 || opts.directorText || '';
  const line4Text = rawMainLines[3] || opts.extraLine4 || '';
  const has3or4Lines = Boolean(line3Text.trim() || line4Text.trim());

  const mainFontFamily =
    styleMode === 'malayalam_bold' || /[\u0D00-\u0D7F]/.test(displayMain)
      ? '"Noto Sans Malayalam", "Manjari", system-ui, sans-serif'
      : styleMode === 'gold_crest'
      ? '"Playfair Display", Georgia, serif'
      : '"Impact", "Arial Black", system-ui, sans-serif';

  const yShift = has3or4Lines ? -18 : 0;

  if (line2Text && rawMainLines.length <= 1 && !has3or4Lines) {
    ctx.font = '700 16px "Noto Sans Malayalam", system-ui, -apple-system, sans-serif';
    ctx.fillStyle = subColor;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 8;
    ctx.fillText(line2Text, 0, -42);
  }

  const mainSize = has3or4Lines ? 40 : 52;
  ctx.font = `900 ${mainSize}px ${mainFontFamily}`;
  ctx.fillStyle = mainColor;
  ctx.shadowColor = shadowCol;
  ctx.shadowBlur = styleMode === 'comedy_pop' ? 0 : 20;

  const isAsciiMain = /^[\x00-\x7F]*$/.test(displayMain);
  const renderedMain = isAsciiMain && styleMode !== 'malayalam_bold' ? displayMain.toUpperCase() : displayMain;

  if (spreadSpace > 1 && isAsciiMain) {
    ctx.fillText(renderedMain.split('').join(' '), 0, 14 + yShift);
  } else {
    ctx.fillText(renderedMain, 0, 14 + yShift);
  }

  if (line2Text && (rawMainLines.length > 1 || has3or4Lines)) {
    ctx.font = '800 20px "Noto Sans Malayalam", system-ui, sans-serif';
    ctx.fillStyle = styleMode === 'split_duotone' ? '#22d3ee' : subColor;
    ctx.fillText(line2Text, 0, 44 + yShift);
  }

  if (line3Text) {
    ctx.font = '700 15px "Noto Sans Malayalam", system-ui, -apple-system, sans-serif';
    ctx.fillStyle = subColor;
    ctx.shadowBlur = 6;
    ctx.fillText(line3Text, 0, (has3or4Lines ? 68 : 48) + yShift);
  }

  if (line4Text) {
    ctx.font = '700 13px "Noto Sans Malayalam", system-ui, -apple-system, sans-serif';
    ctx.fillStyle = typeof mainColor === 'string' ? mainColor : '#fde68a';
    ctx.shadowBlur = 4;
    ctx.fillText(line4Text, 0, 90 + yShift);
  }

  if (opts.animationType === 'curtain_reveal') {
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Animated Movie Studio Emblem / Crest Trailer Opener Renderer
 */
export function drawEmblemTrailerOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cfg: EmblemTrailerConfig,
  customLogoImg: HTMLImageElement | HTMLVideoElement | null | undefined,
  tSec: number
) {
  if (!cfg.enabled) return;
  const localT = Math.max(0, tSec);
  const enter = Math.min(1, localT / 0.75);
  let sc = cfg.scale || 1;
  let rot = 0;

  if (cfg.animStyle === 'spin_reveal') {
    rot = (1 - enter) * Math.PI * 0.4;
    sc *= 0.65 + 0.35 * enter;
  } else if (cfg.animStyle === 'slam_impact') {
    sc *= enter < 1 ? 1.8 - 0.8 * enter : 1 + Math.sin(localT * 18) * 0.02;
  } else if (cfg.animStyle === 'fire_forge') {
    sc *= 0.94 + Math.sin(localT * 3) * 0.03;
  }

  ctx.save();
  ctx.translate(w / 2, h / 2 - h * 0.04);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  ctx.globalAlpha = Math.min(1, enter * 1.4);

  const emblemR = Math.min(w, h) * 0.19;
  const col = cfg.accentColor || '#fbbf24';

  // Outer radiant ring
  const rad = ctx.createRadialGradient(0, -emblemR * 0.15, emblemR * 0.1, 0, -emblemR * 0.15, emblemR * 1.5);
  rad.addColorStop(0, `${col}55`);
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rad;
  ctx.beginPath();
  ctx.arc(0, -emblemR * 0.15, emblemR * 1.5, 0, Math.PI * 2);
  ctx.fill();

  if (customLogoImg && ((customLogoImg instanceof HTMLImageElement && customLogoImg.complete && customLogoImg.naturalWidth > 0))) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -emblemR * 0.18, emblemR * 0.85, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(customLogoImg, -emblemR * 0.85, -emblemR * 1.03, emblemR * 1.7, emblemR * 1.7);
    ctx.restore();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -emblemR * 0.18, emblemR * 0.88, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.save();
    ctx.translate(0, -emblemR * 0.18);
    ctx.strokeStyle = col;
    ctx.fillStyle = 'rgba(10, 14, 24, 0.86)';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;

    if (cfg.shape === 'shield' || cfg.shape === 'royal_seal') {
      ctx.beginPath();
      ctx.moveTo(0, -emblemR * 0.9);
      ctx.lineTo(emblemR * 0.78, -emblemR * 0.55);
      ctx.quadraticCurveTo(emblemR * 0.72, emblemR * 0.45, 0, emblemR * 0.95);
      ctx.quadraticCurveTo(-emblemR * 0.72, emblemR * 0.45, -emblemR * 0.78, -emblemR * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (cfg.shape === 'crown') {
      ctx.beginPath();
      ctx.moveTo(-emblemR * 0.85, emblemR * 0.5);
      ctx.lineTo(-emblemR * 0.9, -emblemR * 0.45);
      ctx.lineTo(-emblemR * 0.38, emblemR * 0.05);
      ctx.lineTo(0, -emblemR * 0.78);
      ctx.lineTo(emblemR * 0.38, emblemR * 0.05);
      ctx.lineTo(emblemR * 0.9, -emblemR * 0.45);
      ctx.lineTo(emblemR * 0.85, emblemR * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (cfg.shape === 'neon_hex') {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const ang = (i * Math.PI) / 3 - Math.PI / 6;
        const px = Math.cos(ang) * emblemR * 0.88;
        const py = Math.sin(ang) * emblemR * 0.88;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Star / Wings / Film Reel / Birthday Star Crest
      ctx.beginPath();
      const spikes = cfg.shape === 'film_reel' ? 8 : 5;
      for (let i = 0; i < spikes * 2; i += 1) {
        const r = i % 2 === 0 ? emblemR * 0.9 : emblemR * 0.42;
        const ang = (i * Math.PI) / spikes - Math.PI / 2;
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Center initial monogram
    ctx.shadowBlur = 0;
    ctx.fillStyle = col;
    ctx.font = `900 ${Math.round(emblemR * 0.52)}px "Playfair Display", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const mono = (cfg.studioName.trim()[0] || 'C').toUpperCase();
    ctx.fillText(mono, 0, 2);
    ctx.restore();
  }

  // Light sweep across emblem
  const sweepX = (((localT * 1.2) % 2.4) - 1.2) * emblemR * 1.4;
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(sweepX - 8, -emblemR, 16, emblemR * 1.7);

  // Studio Name + Tagline below emblem
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = col;
  ctx.font = `900 ${Math.max(16, Math.round(h * 0.056))}px "Noto Sans Malayalam", "Impact", sans-serif`;
  ctx.fillText(cfg.studioName || 'STUDIO EMBLEM', 0, emblemR * 1.15);

  if (cfg.tagline) {
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 ${Math.max(10, Math.round(h * 0.028))}px "Noto Sans Malayalam", system-ui, sans-serif`;
    ctx.fillText(cfg.tagline, 0, emblemR * 1.48);
  }

  if (cfg.subline) {
    ctx.fillStyle = col;
    ctx.font = `700 ${Math.max(9, Math.round(h * 0.022))}px system-ui, sans-serif`;
    ctx.fillText(cfg.subline, 0, emblemR * 1.76);
  }

  ctx.restore();
}

/**
 * Animated Image-to-Trailer Card Renderer (turns any uploaded photo/video frame into a stylish animated movie trailer card!)
 */
export function drawTrailerCardOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  card: TrailerCardLayer,
  mediaSource: HTMLVideoElement | HTMLImageElement | null | undefined,
  globalTimeSec: number
) {
  const startT = card.startTimeSec;
  const endT = card.startTimeSec + Math.max(0.5, card.durationSec);
  if (globalTimeSec < startT - 0.05 || globalTimeSec > endT + 0.05) return;

  const localT = Math.max(0, globalTimeSec - startT);
  const enterProg = Math.min(1, localT / 0.65);

  const cx = (card.xPct / 100) * canvasW;
  const cy = (card.yPct / 100) * canvasH;
  const baseScale = card.scale || 1;

  let animScaleX = 1;
  let animScaleY = 1;
  let animRot = 0;
  let animOffsetX = 0;
  let animOffsetY = 0;
  let imgZoom = 1;

  if (card.animation === 'slam_shake') {
    const slam = enterProg < 1 ? 1.85 - 0.85 * enterProg : 1;
    const shake = localT >= 0.45 && localT < 0.9 ? Math.sin(localT * 55) * 6 : 0;
    animScaleX = slam;
    animScaleY = slam;
    animOffsetX = shake;
  } else if (card.animation === 'flip_reveal') {
    animScaleX = Math.max(0.06, Math.abs(Math.cos((1 - enterProg) * Math.PI * 0.5)));
  } else if (card.animation === 'zoom_ken_burns') {
    imgZoom = 1 + Math.min(0.28, (localT / Math.max(1, card.durationSec)) * 0.26);
    animOffsetY = (1 - enterProg) * 26;
  } else if (card.animation === 'slide_spotlight') {
    animOffsetX = (1 - enterProg) * -canvasW * 0.32;
  } else {
    // 'tilt_float'
    animRot = Math.sin(localT * 1.8) * 0.035;
    animOffsetY = Math.sin(localT * 2.2) * 5;
  }

  let frameBorder = '#f59e0b';
  let frameBg = '#090d14';
  let badgeBg = '#f59e0b';
  let badgeTextCol = '#000000';
  let glowCol = 'rgba(245, 158, 11, 0.45)';
  if (card.theme === 'action_flame') {
    frameBorder = '#ef4444';
    frameBg = '#140606';
    badgeBg = '#ef4444';
    badgeTextCol = '#ffffff';
    glowCol = 'rgba(239, 68, 68, 0.5)';
  } else if (card.theme === 'scifi_holo') {
    frameBorder = '#22d3ee';
    frameBg = '#03131d';
    badgeBg = '#22d3ee';
    badgeTextCol = '#000000';
    glowCol = 'rgba(34, 211, 238, 0.5)';
  } else if (card.theme === 'noir_mystery') {
    frameBorder = '#e4e4e7';
    frameBg = '#09090b';
    badgeBg = '#dc2626';
    badgeTextCol = '#ffffff';
    glowCol = 'rgba(255, 255, 255, 0.28)';
  } else if (card.theme === 'hero_comic') {
    frameBorder = '#f97316';
    frameBg = '#170c04';
    badgeBg = '#facc15';
    badgeTextCol = '#000000';
    glowCol = 'rgba(249, 115, 22, 0.52)';
  } else if (card.theme === 'royal_premiere') {
    frameBorder = '#fde047';
    frameBg = '#130b1c';
    badgeBg = '#fde047';
    badgeTextCol = '#000000';
    glowCol = 'rgba(253, 224, 71, 0.48)';
  }

  const cardW = Math.min(canvasW * 0.72, Math.max(220, canvasH * 0.52)) * baseScale;
  const cardH = cardW * 1.15;

  ctx.save();
  ctx.filter = 'none';
  ctx.globalAlpha = Math.max(0, Math.min(1, (card.opacity / 100) * Math.min(1, localT / 0.25)));
  ctx.translate(cx + animOffsetX, cy + animOffsetY);
  ctx.rotate(animRot);
  ctx.scale(animScaleX, animScaleY);

  // Outer Cinema Glow & Card Shell
  ctx.shadowColor = glowCol;
  ctx.shadowBlur = 28;
  ctx.fillStyle = frameBg;
  ctx.strokeStyle = frameBorder;
  ctx.lineWidth = Math.max(2.5, cardW * 0.014);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
  } else {
    ctx.rect(-cardW / 2, -cardH / 2, cardW, cardH);
  }
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Inner Poster Image Window (top 68% of card)
  const pad = Math.round(cardW * 0.055);
  const imgW = cardW - pad * 2;
  const imgH = cardH * 0.64;
  const imgX = -imgW / 2;
  const imgY = -cardH / 2 + pad;

  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(imgX, imgY, imgW, imgH, 12);
  } else {
    ctx.rect(imgX, imgY, imgW, imgH);
  }
  ctx.clip();

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(imgX, imgY, imgW, imgH);

  if (mediaSource) {
    let sw = 0;
    let sh = 0;
    if (mediaSource instanceof HTMLVideoElement && mediaSource.readyState >= 2) {
      sw = mediaSource.videoWidth;
      sh = mediaSource.videoHeight;
    } else if (mediaSource instanceof HTMLImageElement && mediaSource.complete) {
      sw = mediaSource.naturalWidth;
      sh = mediaSource.naturalHeight;
    }
    if (sw > 0 && sh > 0) {
      const sAsp = sw / sh;
      const bAsp = imgW / imgH;
      const dw = (sAsp > bAsp ? imgH * sAsp : imgW) * imgZoom;
      const dh = (sAsp > bAsp ? imgH : imgW / sAsp) * imgZoom;
      ctx.drawImage(mediaSource, -dw / 2, imgY + imgH / 2 - dh / 2, dw, dh);
    }
  }

  // Animated Metallic Light Sheen Sweep across Card Poster
  const shinePos = ((localT * 0.9) % 2.4) - 0.7;
  const shineX = imgX + shinePos * imgW;
  const sheen = ctx.createLinearGradient(shineX - 50, imgY, shineX + 50, imgY + imgH);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.22)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(imgX, imgY, imgW, imgH);

  // Subtle dark gradient at bottom edge of poster image
  const botFade = ctx.createLinearGradient(0, imgY + imgH * 0.55, 0, imgY + imgH);
  botFade.addColorStop(0, 'rgba(0,0,0,0)');
  botFade.addColorStop(1, frameBg);
  ctx.fillStyle = botFade;
  ctx.fillRect(imgX, imgY + imgH * 0.55, imgW, imgH * 0.45);
  ctx.restore();

  // Badge Pill inside Card Footer
  const textAreaTop = imgY + imgH + cardH * 0.04;
  if (card.badgeText) {
    const bw = Math.min(cardW * 0.72, Math.max(120, card.badgeText.length * (cardW * 0.032) + 22));
    const bh = Math.max(18, cardH * 0.068);
    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-bw / 2, textAreaTop - bh * 0.5, bw, bh, 999);
    } else {
      ctx.rect(-bw / 2, textAreaTop - bh * 0.5, bw, bh);
    }
    ctx.fill();
    ctx.fillStyle = badgeTextCol;
    ctx.font = `900 ${Math.max(9, Math.round(bh * 0.52))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.badgeText.toUpperCase(), 0, textAreaTop);
  }

  // Card Movie Title
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(15, Math.round(cardW * 0.095))}px "Impact", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 10;
  ctx.fillText((card.title || 'FEATURE FILM').toUpperCase(), 0, textAreaTop + cardH * 0.115);

  // Card Tagline / Credits
  if (card.subtitle) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = frameBorder;
    ctx.font = `700 ${Math.max(9, Math.round(cardW * 0.04))}px system-ui, sans-serif`;
    ctx.fillText(card.subtitle.toUpperCase(), 0, textAreaTop + cardH * 0.21);
  }

  ctx.restore();
}
