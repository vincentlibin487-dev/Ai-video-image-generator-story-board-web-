import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Captions,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Crop,
  Download,
  Film,
  Flame,
  FlipHorizontal,
  FolderOpen,
  Layers,
  Loader2,
  Maximize2,
  Mic,
  Move,
  Music,
  Pause,
  PenTool,
  Play,
  Plus,
  Redo2,
  RotateCw,
  Scissors,
  Search,
  Share2,
  SkipBack,
  Sliders,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Square,
  Trash2,
  Type,
  Undo2,
  Video,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Zap,
  Palette,
  Eye,
  History as HistoryIcon,
  RotateCcw,
  Save,
  FileText,
  Crosshair,
  ChevronLeft,
  FolderPlus,
  LayoutGrid,
  MousePointer,
  Circle,
  Eraser,
  TrendingUp,
  Users,
  Target,
} from 'lucide-react';
import type { AppLang } from '../lib/i18n';
import {
  ASPECT_RATIO_OPTIONS,
  COLOR_LUT_LIBRARY,
  FILTER_CATEGORIES,
  FILTER_LIBRARY,
  MOTION_PRESETS,
  TITLE_TEMPLATES,
  TRANSITION_LIBRARY,
  VFX_CATEGORIES,
  VFX_LIBRARY,
  getFilterCssById,
  getLutById,
  getVfxById,
  type AspectRatioId,
  type ColorLutPreset,
  type ExportFormatId,
  type ExportResolutionId,
  type MotionPresetId,
  type TitleTemplateId,
  type VfxDefinition,
} from '../lib/editorLibrary';
import {
  FREE_MUSIC_LIBRARY,
  MUSIC_CATEGORIES,
  SFX_CATEGORIES,
  SFX_LIBRARY,
  previewFreeMusic,
  previewSfx,
  renderFreeMusicToWavUrl,
  renderSfxToWavUrl,
  type FreeMusicTrack,
  type MusicCategory,
  type SfxCategory,
  type SfxDefinition,
} from '../lib/sfxEngine';
import {
  ACTION_VFX_CATEGORIES,
  PRO_121_FEATURES,
  PRO_CHARACTER_CATEGORIES,
  PRO_FILTER_CATEGORIES,
  PRO_GRAPH_CATEGORIES,
  PRO_LUT_CATEGORIES,
  PRO_MASK_CATEGORIES,
  PRO_MOTION_CATEGORIES,
  PRO_MUSIC_CATEGORIES,
  PRO_SFX_CATEGORIES,
  PRO_TITLE_CATEGORIES,
  PRO_TRANSITION_CATEGORIES,
  TOTAL_PRO_CHARACTERS_COUNT,
  TOTAL_PRO_FILTERS_COUNT,
  TOTAL_PRO_GRAPHS_COUNT,
  TOTAL_PRO_LUTS_COUNT,
  TOTAL_PRO_MASKS_COUNT,
  TOTAL_PRO_MOTIONS_COUNT,
  TOTAL_PRO_MUSIC_COUNT,
  TOTAL_PRO_SFX_COUNT,
  TOTAL_PRO_TITLES_COUNT,
  TOTAL_PRO_TRANSITIONS_COUNT,
  TOTAL_PRO_VFX_COUNT,
  TOTAL_STUDIO_FEATURES_COUNT,
  evaluateGraphCurve,
  getProFilterCssById,
  getProLutCssById,
  queryActionVfxPresets,
  queryProCharacters,
  queryProFilters,
  queryProGraphs,
  queryProLuts,
  queryProMasks,
  queryProMotions,
  queryProMusic,
  queryProSfx,
  queryProTitles,
  queryProTransitions,
  renderActionVfxProp,
  renderCinemaCharacter,
  type ActionVfxPreset,
  type ActionVfxType,
  type CharacterArchetype,
  type GraphCurveType,
  type MaskModeId,
  type MaskShapeId,
  type ProCatalogItem,
} from '../lib/proVfxEngine';
import { EditorIdleBannerBar, FourSecondExportVideoAd } from './AdsterraAds';

export interface TimelineClip {
  id: string;
  type: 'video' | 'image' | 'color';
  name: string;
  url: string;
  colorHex?: string;
  mediaDuration: number;
  trimStart: number;
  trimEnd: number;
  speed: number;
  volume: number;
  filterId: string;
  vfxId?: string;
  vfxIntensity?: number;
  motionPreset: MotionPresetId;
  brightness: number;
  contrast: number;
  saturation: number;
  vignette: number;
  rotation: number;
  flipH: boolean;
  fitMode: 'cover' | 'contain';
  transitionId: string;
  transitionDuration: number;
  thumbnailUrl?: string;

  // DaVinci Resolve & Premiere Pro Lumetri Color Suite
  colorGradeEnabled?: boolean;
  colorLutId?: string;
  temp?: number; // -100 to +100
  tint?: number; // -100 to +100
  exposure?: number; // -100 to +100
  highlights?: number; // -100 to +100
  shadows?: number; // -100 to +100
  vibrance?: number; // 0 to 200
  liftR?: number; // -50 to +50
  liftG?: number; // -50 to +50
  liftB?: number; // -50 to +50
  gammaR?: number; // -50 to +50
  gammaG?: number; // -50 to +50
  gammaB?: number; // -50 to +50
  gainR?: number; // -50 to +50
  gainG?: number; // -50 to +50
  gainB?: number; // -50 to +50

  // Chroma Key (Green Screen / Blue Screen Removal)
  chromaKeyEnabled?: boolean;
  chromaKeyColor?: 'green' | 'blue' | 'custom';
  chromaKeyTolerance?: number; // 0 to 100
  chromaKeySmoothness?: number; // 0 to 100
  chromaKeySpill?: number; // 0 to 100

  // Pro Video Masking & Nested Dual-Mask (Mask inside Mask + Object Erase)
  maskEnabled?: boolean;
  maskShape?: MaskShapeId;
  maskMode?: MaskModeId;
  maskX?: number;
  maskY?: number;
  maskW?: number;
  maskH?: number;
  maskRotation?: number;
  maskFeather?: number;
  mask2Enabled?: boolean;
  mask2Shape?: MaskShapeId;
  mask2Mode?: MaskModeId;
  mask2X?: number;
  mask2Y?: number;
  mask2W?: number;
  mask2H?: number;
}

export interface ExportHistoryRecord {
  id: string;
  name: string;
  date: string;
  time: string;
  resolution: string;
  sizeMb: string;
  url: string;
  ext?: string;
}

const EXPORT_HISTORY_KEY = 'cinestoryboard_pro_history_v1';

function openExportsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open('cinestoryboard_exports_db', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('blobs')) {
        db.createObjectStore('blobs');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveExportBlobToIdb(id: string, blob: Blob) {
  try {
    const db = await openExportsDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

async function getExportBlobFromIdb(id: string): Promise<Blob | null> {
  try {
    const db = await openExportsDb();
    return await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction('blobs', 'readonly');
      const req = tx.objectStore('blobs').get(id);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function deleteExportBlobFromIdb(id: string) {
  try {
    const db = await openExportsDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

export interface DoodleStroke {
  points: Array<{ x: number; y: number }>;
  color: string;
  size: number;
}

export interface LayerItem {
  id: string;
  kind: 'text' | 'caption' | 'sticker' | 'image' | 'doodle' | 'vfx_prop' | 'character';
  templateId?: TitleTemplateId;
  name: string;
  text?: string;
  subtitle?: string;
  imageUrl?: string;
  strokes?: DoodleStroke[];
  startTime: number;
  duration: number;
  position: 'top' | 'center' | 'bottom';
  fontStyle: 'cinema' | 'bold' | 'mono';
  color: string;
  fontSize: number;
  opacity: number;
  trackIndex?: number;
  // Placeable Action VFX Prop properties (Gun Smoke, Blood Splatter, Muzzle Flash, Flying Bullet, etc.)
  vfxPresetId?: string;
  vfxType?: ActionVfxType;
  vfxSeed?: number;
  posX?: number;
  posY?: number;
  scale?: number;
  rotation?: number;
  blendMode?: 'source-over' | 'screen' | 'lighter' | 'multiply';
  density?: number;
  hueShift?: number;
  // Poseable Character Studio properties
  characterArchetype?: CharacterArchetype;
  flipH?: boolean;
  suitColor?: string;
  accentColor?: string;
  // Keyframe Graph Motion properties (Bullets & Characters travel A -> B on Bezier Curve)
  graphEnabled?: boolean;
  graphCurve?: GraphCurveType;
  graphCp1y?: number;
  graphCp2y?: number;
  kfStartX?: number;
  kfStartY?: number;
  kfEndX?: number;
  kfEndY?: number;
  kfEndScale?: number;
  kfEndRotation?: number;
}

export interface AudioTimelineItem {
  id: string;
  kind: 'music' | 'voice' | 'sfx';
  name: string;
  url: string;
  startTime: number;
  duration: number;
  trimStart: number;
  volume: number;
  trackIndex?: number;
}

interface EditorSnapshot {
  clips: TimelineClip[];
  layers: LayerItem[];
  audioItems: AudioTimelineItem[];
}

type BottomTray =
  | null
  | 'allTools'
  | 'filters'
  | 'vfx'
  | 'vfxProp'
  | 'masking'
  | 'graph'
  | 'character'
  | 'colorStudio'
  | 'chromaStudio'
  | 'history'
  | 'motion'
  | 'continuity'
  | 'adjust'
  | 'text'
  | 'captions'
  | 'sticker'
  | 'doodles'
  | 'cutout'
  | 'speed'
  | 'audio'
  | 'sfx'
  | 'voice'
  | 'transitions'
  | 'projectSetup'
  | 'export';

type PremiereToolMode = 'select' | 'razor' | 'type' | 'vfx';

const PX_PER_SEC = 68;

const STICKER_PACK = [
  '🎬', '🔥', '❤️', '⭐', '⚡', '👑', '💥', '😱', '😂', '🎯', '🎥', '✨',
  '💔', '🕵️', '🚨', '🎵', '💎', '🏆', '👀', '🙌',
];

function getClipEffectiveDuration(clip: TimelineClip): number {
  const span = Math.max(0.25, clip.trimEnd - clip.trimStart);
  return span / Math.max(0.25, clip.speed || 1);
}

function formatMmSs(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function buildClipFilterCss(clip: TimelineClip): string {
  const presetCss = getFilterCssById(clip.filterId) || getProFilterCssById(clip.filterId);
  let lutCss = '';
  let lumetriCss = '';

  if (clip.colorGradeEnabled) {
    if (clip.colorLutId && clip.colorLutId !== 'none') {
      const lut = getLutById(clip.colorLutId);
      lutCss = lut?.css || getProLutCssById(clip.colorLutId);
    }

    const temp = clip.temp || 0;
    const tint = clip.tint || 0;
    const exposure = clip.exposure || 0;
    const highlights = clip.highlights || 0;
    const shadows = clip.shadows || 0;
    const vibrance = clip.vibrance || 0;

    const b = (100 + exposure * 0.45).toFixed(1);
    const c = (100 + highlights * 0.25 - shadows * 0.15).toFixed(1);
    const s = (100 + vibrance * 0.55).toFixed(1);

    let tempFilter = '';
    if (temp > 0) {
      tempFilter = ` sepia(${Math.round(temp * 0.35)}%)`;
    } else if (temp < 0) {
      tempFilter = ` hue-rotate(${Math.round(temp * 0.2)}deg)`;
    }

    let tintFilter = '';
    if (tint !== 0) {
      tintFilter = ` hue-rotate(${Math.round(tint * 0.25)}deg)`;
    }

    lumetriCss = `brightness(${b}%) contrast(${c}%) saturate(${s}%)${tempFilter}${tintFilter}`;
  }

  const custom = `brightness(${clip.brightness}%) contrast(${clip.contrast}%) saturate(${clip.saturation}%)`;
  return `${presetCss} ${lutCss} ${lumetriCss} ${custom}`.trim();
}

const QUALITY_TIER_PROFILES: Record<
  ExportResolutionId,
  {
    label: string;
    shortSub: string;
    videoBitsPerSecond: number;
    audioBitsPerSecond: number;
    smoothing: ImageSmoothingQuality;
    maxChromaWidth: number;
    clarityFilter: string;
    softScale: number;
  }
> = {
  '4k': {
    label: '4K Ultra HD',
    shortSub: '2160p · 48 Mbps Master',
    videoBitsPerSecond: 48_000_000,
    audioBitsPerSecond: 256_000,
    smoothing: 'high',
    maxChromaWidth: 1920,
    clarityFilter: 'contrast(1.04) saturate(1.04)',
    softScale: 1,
  },
  '1080p': {
    label: '1080p Full HD',
    shortSub: '1080p · 16 Mbps Pro',
    videoBitsPerSecond: 16_000_000,
    audioBitsPerSecond: 192_000,
    smoothing: 'high',
    maxChromaWidth: 1280,
    clarityFilter: 'contrast(1.02) saturate(1.02)',
    softScale: 1,
  },
  '720p': {
    label: '720p HD',
    shortSub: '720p · 3.5 Mbps Standard',
    videoBitsPerSecond: 3_500_000,
    audioBitsPerSecond: 128_000,
    smoothing: 'medium',
    maxChromaWidth: 720,
    clarityFilter: '',
    softScale: 0.9,
  },
  '480p': {
    label: '480p Fast SD',
    shortSub: '480p · 850 kbps Compact',
    videoBitsPerSecond: 850_000,
    audioBitsPerSecond: 96_000,
    smoothing: 'low',
    maxChromaWidth: 420,
    clarityFilter: '',
    softScale: 0.65,
  },
};

let offscreenChromaCanvas: HTMLCanvasElement | null = null;
let offscreenChromaCtx: CanvasRenderingContext2D | null = null;
let offscreenQualityCanvas: HTMLCanvasElement | null = null;
let offscreenQualityCtx: CanvasRenderingContext2D | null = null;

function renderSourceWithChromaKey(
  source: HTMLVideoElement | HTMLImageElement,
  drawW: number,
  drawH: number,
  clip: TimelineClip,
  maxChromaWidth = 480
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (!offscreenChromaCanvas) {
    offscreenChromaCanvas = document.createElement('canvas');
    offscreenChromaCtx = offscreenChromaCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!offscreenChromaCtx || !offscreenChromaCanvas) return null;

  const targetW = Math.max(64, Math.min(Math.round(Math.abs(drawW)), maxChromaWidth));
  const targetH = Math.max(64, Math.round(targetW * (Math.abs(drawH) / Math.max(1, Math.abs(drawW)))));
  if (offscreenChromaCanvas.width !== targetW || offscreenChromaCanvas.height !== targetH) {
    offscreenChromaCanvas.width = targetW;
    offscreenChromaCanvas.height = targetH;
  }

  offscreenChromaCtx.clearRect(0, 0, targetW, targetH);
  offscreenChromaCtx.drawImage(source, 0, 0, targetW, targetH);

  try {
    const imgData = offscreenChromaCtx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;
    const len = data.length;

    const isGreen = clip.chromaKeyColor !== 'blue';
    const tolerance = (clip.chromaKeyTolerance ?? 45) * 2.2;
    const smoothness = Math.max(1, (clip.chromaKeySmoothness ?? 20) * 1.6);
    const spill = (clip.chromaKeySpill ?? 30) / 100;

    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (isGreen) {
        const maxOther = Math.max(r, b);
        const diff = g - maxOther;
        if (diff > tolerance) {
          data[i + 3] = 0;
        } else if (diff > tolerance - smoothness) {
          const factor = (tolerance - diff) / smoothness;
          data[i + 3] = Math.round(data[i + 3] * Math.max(0, Math.min(1, factor)));
        } else if (spill > 0 && g > maxOther) {
          data[i + 1] = Math.round(g * (1 - spill) + maxOther * spill);
        }
      } else {
        const maxOther = Math.max(r, g);
        const diff = b - maxOther;
        if (diff > tolerance) {
          data[i + 3] = 0;
        } else if (diff > tolerance - smoothness) {
          const factor = (tolerance - diff) / smoothness;
          data[i + 3] = Math.round(data[i + 3] * Math.max(0, Math.min(1, factor)));
        } else if (spill > 0 && b > maxOther) {
          data[i + 2] = Math.round(b * (1 - spill) + maxOther * spill);
        }
      }
    }
    offscreenChromaCtx.putImageData(imgData, 0, 0);
    return offscreenChromaCanvas;
  } catch {
    return null;
  }
}

function easeInOutCubic(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function getMotionTransform(preset: MotionPresetId, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  switch (preset) {
    case 'push_in':
      return { scale: 1 + 0.08 * p, tx: 0, ty: 0 };
    case 'pull_out':
      return { scale: 1.09 - 0.08 * p, tx: 0, ty: 0 };
    case 'pan_left':
      return { scale: 1.08, tx: (0.5 - p) * 0.06, ty: 0 };
    case 'pan_right':
      return { scale: 1.08, tx: (p - 0.5) * 0.06, ty: 0 };
    case 'tilt_up':
      return { scale: 1.08, tx: 0, ty: (0.5 - p) * 0.05 };
    case 'tilt_down':
      return { scale: 1.08, tx: 0, ty: (p - 0.5) * 0.05 };
    case 'breathe':
      return {
        scale: 1.04 + Math.sin(p * Math.PI * 2) * 0.018,
        tx: Math.sin(p * Math.PI * 3) * 0.01,
        ty: Math.cos(p * Math.PI * 2) * 0.01,
      };
    case 'drift':
      return {
        scale: 1.06 + 0.02 * p,
        tx: Math.sin(p * Math.PI) * 0.02,
        ty: -0.02 * p,
      };
    case 'pulse_beat':
      return {
        scale: 1.03 + Math.abs(Math.sin(p * Math.PI * 4)) * 0.05,
        tx: 0,
        ty: 0,
      };
    default:
      return { scale: 1, tx: 0, ty: 0 };
  }
}

function pickSupportedRecorderMime(
  preferredFormat: ExportFormatId
): { mimeType: string; ext: 'mp4' | 'webm' } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', ext: 'webm' };
  }
  const mp4 = [
    { mime: 'video/mp4;codecs=avc1.640028,mp4a.40.2', ext: 'mp4' as const },
    { mime: 'video/mp4;codecs=avc1.4d402a,mp4a.40.2', ext: 'mp4' as const },
    { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' as const },
    { mime: 'video/mp4;codecs=avc1,mp4a', ext: 'mp4' as const },
    { mime: 'video/mp4', ext: 'mp4' as const },
  ];
  const webm = [
    { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' as const },
    { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' as const },
    { mime: 'video/webm', ext: 'webm' as const },
  ];
  const list = preferredFormat === 'webm' ? [...webm, ...mp4] : [...mp4, ...webm];
  for (const item of list) {
    try {
      if (MediaRecorder.isTypeSupported(item.mime)) {
        return { mimeType: item.mime, ext: item.ext };
      }
    } catch {}
  }
  return { mimeType: '', ext: 'webm' };
}

let offscreenMaskCanvas: HTMLCanvasElement | null = null;
let offscreenMaskCtx: CanvasRenderingContext2D | null = null;

function traceMaskShape(
  ctx: CanvasRenderingContext2D,
  shape: MaskShapeId,
  cx: number,
  cy: number,
  w: number,
  h: number,
  rotDeg = 0
) {
  ctx.save();
  ctx.translate(cx, cy);
  if (rotDeg) ctx.rotate((rotDeg * Math.PI) / 180);
  const rx = Math.max(8, w / 2);
  const ry = Math.max(8, h / 2);
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  } else if (shape === 'rounded') {
    ctx.roundRect(-rx, -ry, rx * 2, ry * 2, Math.min(rx, ry) * 0.35);
  } else if (shape === 'diamond') {
    ctx.moveTo(0, -ry);
    ctx.lineTo(rx, 0);
    ctx.lineTo(0, ry);
    ctx.lineTo(-rx, 0);
    ctx.closePath();
  } else if (shape === 'split_v') {
    ctx.rect(-rx * 2, -ry * 2, rx * 2, ry * 4);
  } else if (shape === 'split_h') {
    ctx.rect(-rx * 2, -ry * 2, rx * 4, ry * 2);
  } else if (shape === 'diagonal') {
    ctx.moveTo(-rx * 2, -ry * 2);
    ctx.lineTo(rx * 1.4, -ry * 2);
    ctx.lineTo(-rx * 1.4, ry * 2);
    ctx.lineTo(-rx * 2, ry * 2);
    ctx.closePath();
  } else if (shape === 'star') {
    const spikes = 5;
    for (let i = 0; i < spikes * 2; i++) {
      const rFactor = i % 2 === 0 ? 1 : 0.44;
      const a = (i * Math.PI) / spikes - Math.PI / 2;
      const px = Math.cos(a) * rx * rFactor;
      const py = Math.sin(a) * ry * rFactor;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    ctx.rect(-rx, -ry, rx * 2, ry * 2);
  }
  ctx.restore();
}

function drawClipVisualInner(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  source: HTMLVideoElement | HTMLImageElement | null,
  width: number,
  height: number,
  clipProgress = 0,
  extraFilter = '',
  qualityTier?: ExportResolutionId
) {
  const qProf = qualityTier ? QUALITY_TIER_PROFILES[qualityTier] : null;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = qProf ? qProf.smoothing : 'high';
  const combinedFilter = `${buildClipFilterCss(clip)} ${qProf?.clarityFilter || ''} ${extraFilter}`.trim();
  ctx.filter = combinedFilter || 'none';

  const motion = getMotionTransform(clip.motionPreset || 'none', clipProgress);

  ctx.translate(width / 2 + motion.tx * width, height / 2 + motion.ty * height);
  if (motion.scale !== 1) ctx.scale(motion.scale, motion.scale);
  if (clip.rotation) ctx.rotate((clip.rotation * Math.PI) / 180);
  if (clip.flipH) ctx.scale(-1, 1);

  const rotated = clip.rotation === 90 || clip.rotation === 270;
  const targetW = rotated ? height : width;
  const targetH = rotated ? width : height;

  if (clip.type === 'color') {
    ctx.fillStyle = clip.colorHex || '#11131f';
    ctx.fillRect(-targetW / 2, -targetH / 2, targetW, targetH);
    ctx.restore();
    return;
  }

  if (!source) {
    ctx.restore();
    return;
  }

  const srcW =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source.naturalWidth || source.width;
  const srcH =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source.naturalHeight || source.height;

  if (!srcW || !srcH) {
    ctx.restore();
    return;
  }

  const srcRatio = srcW / srcH;
  const destRatio = targetW / targetH;
  let drawW = targetW;
  let drawH = targetH;

  if (clip.fitMode === 'cover') {
    if (srcRatio > destRatio) {
      drawH = targetH;
      drawW = targetH * srcRatio;
    } else {
      drawW = targetW;
      drawH = targetW / srcRatio;
    }
  } else {
    if (srcRatio > destRatio) {
      drawW = targetW;
      drawH = targetW / srcRatio;
    } else {
      drawH = targetH;
      drawW = targetH * srcRatio;
    }
  }

  if (clip.chromaKeyEnabled) {
    const keyedCanvas = renderSourceWithChromaKey(
      source,
      drawW,
      drawH,
      clip,
      qProf ? qProf.maxChromaWidth : 480
    );
    if (keyedCanvas) {
      ctx.drawImage(keyedCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
    }
  } else {
    ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
  }

  if (clip.colorGradeEnabled) {
    const liftR = (clip.liftR || 0) / 100;
    const liftG = (clip.liftG || 0) / 100;
    const liftB = (clip.liftB || 0) / 100;
    const gainR = (clip.gainR || 0) / 100;
    const gainG = (clip.gainG || 0) / 100;
    const gainB = (clip.gainB || 0) / 100;
    if (
      Math.abs(liftR) > 0.03 ||
      Math.abs(liftG) > 0.03 ||
      Math.abs(liftB) > 0.03 ||
      Math.abs(gainR) > 0.03 ||
      Math.abs(gainG) > 0.03 ||
      Math.abs(gainB) > 0.03
    ) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      const r = Math.round(128 + gainR * 85 + liftR * 55);
      const g = Math.round(128 + gainG * 85 + liftG * 55);
      const b = Math.round(128 + gainB * 85 + liftB * 55);
      ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(0, Math.min(255, b))})`;
      ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }
  }

  ctx.restore();

  if (clip.vignette > 0) {
    const rad = Math.max(width, height) * 0.72;
    const grad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      rad * 0.3,
      width / 2,
      height / 2,
      rad
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.88, clip.vignette / 100).toFixed(2)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawClipVisual(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  source: HTMLVideoElement | HTMLImageElement | null,
  width: number,
  height: number,
  clipProgress = 0,
  extraFilter = '',
  qualityTier?: ExportResolutionId
) {
  if (!clip.maskEnabled || typeof document === 'undefined') {
    drawClipVisualInner(ctx, clip, source, width, height, clipProgress, extraFilter, qualityTier);
    return;
  }

  if (!offscreenMaskCanvas) {
    offscreenMaskCanvas = document.createElement('canvas');
    offscreenMaskCtx = offscreenMaskCanvas.getContext('2d');
  }
  if (!offscreenMaskCanvas || !offscreenMaskCtx) {
    drawClipVisualInner(ctx, clip, source, width, height, clipProgress, extraFilter, qualityTier);
    return;
  }

  if (offscreenMaskCanvas.width !== width || offscreenMaskCanvas.height !== height) {
    offscreenMaskCanvas.width = width;
    offscreenMaskCanvas.height = height;
  }

  const mCtx = offscreenMaskCtx;
  mCtx.clearRect(0, 0, width, height);
  drawClipVisualInner(mCtx, clip, source, width, height, clipProgress, extraFilter, qualityTier);

  const applyOneMask = (
    shape: MaskShapeId,
    mode: MaskModeId,
    xN: number,
    yN: number,
    wN: number,
    hN: number,
    rot: number,
    feather: number
  ) => {
    mCtx.save();
    mCtx.globalCompositeOperation = mode === 'erase_inside' ? 'destination-out' : 'destination-in';
    traceMaskShape(mCtx, shape, xN * width, yN * height, wN * width, hN * height, rot);
    mCtx.fillStyle = `rgba(0,0,0,${feather > 25 ? 0.94 : 1})`;
    mCtx.fill();
    mCtx.restore();
  };

  applyOneMask(
    clip.maskShape || 'circle',
    clip.maskMode || 'keep_inside',
    clip.maskX ?? 0.5,
    clip.maskY ?? 0.5,
    clip.maskW ?? 0.45,
    clip.maskH ?? 0.62,
    clip.maskRotation ?? 0,
    clip.maskFeather ?? 12
  );

  // Secondary Nested Mask inside Mask
  if (clip.mask2Enabled) {
    applyOneMask(
      clip.mask2Shape || 'rect',
      clip.mask2Mode || 'erase_inside',
      clip.mask2X ?? 0.5,
      clip.mask2Y ?? 0.5,
      clip.mask2W ?? 0.22,
      clip.mask2H ?? 0.28,
      0,
      clip.maskFeather ?? 8
    );
  }

  ctx.drawImage(offscreenMaskCanvas, 0, 0, width, height);
}

function getLayerDefaultNormPos(ly: LayerItem, letterbox: boolean): { x: number; y: number } {
  const defY =
    ly.kind === 'caption'
      ? 0.87
      : ly.position === 'top'
      ? letterbox
        ? 0.19
        : 0.14
      : ly.position === 'center'
      ? 0.5
      : letterbox
      ? 0.81
      : 0.84;
  return {
    x: ly.posX !== undefined ? ly.posX : 0.5,
    y: ly.posY !== undefined ? ly.posY : defY,
  };
}

function getLayerKeyframeTransform(
  ly: LayerItem,
  prog: number,
  letterbox: boolean
): { x: number; y: number; scale: number; rotation: number } {
  const base = getLayerDefaultNormPos(ly, letterbox);
  const baseScale = ly.scale ?? 1;
  const baseRot = ly.rotation ?? 0;
  if (!ly.graphEnabled) {
    return { x: base.x, y: base.y, scale: baseScale, rotation: baseRot };
  }
  const eased = evaluateGraphCurve(
    ly.graphCurve || 'ease_in_out',
    prog,
    ly.graphCp1y ?? 0.15,
    ly.graphCp2y ?? 0.92
  );
  const sx = ly.kfStartX ?? base.x;
  const sy = ly.kfStartY ?? base.y;
  const ex = ly.kfEndX ?? Math.min(0.92, sx + 0.35);
  const ey = ly.kfEndY ?? sy;
  const es = ly.kfEndScale ?? baseScale;
  const er = ly.kfEndRotation ?? baseRot;
  return {
    x: sx + (ex - sx) * eased,
    y: sy + (ey - sy) * eased,
    scale: baseScale + (es - baseScale) * eased,
    rotation: baseRot + (er - baseRot) * eased,
  };
}

function renderTitleLayer(
  ctx: CanvasRenderingContext2D,
  ly: LayerItem,
  width: number,
  height: number,
  elapsed: number,
  letterbox: boolean
) {
  const headlineRaw = ly.text || '';
  if (!headlineRaw.trim()) return;

  const tpl = ly.templateId || 'lower_third';
  const enterProg = Math.min(1, Math.max(0, elapsed / 0.45));
  const exitProg = Math.min(1, Math.max(0, (ly.duration - elapsed) / 0.35));
  const fade = Math.min(enterProg, exitProg);
  ctx.globalAlpha = Math.max(0.05, Math.min(1, ly.opacity * fade));

  const posNorm = getLayerDefaultNormPos(ly, letterbox);
  const anchorX = Math.round(posNorm.x * width);
  const baseY = Math.round(posNorm.y * height);
  const sc = Math.max(0.4, Math.min(2.6, ly.scale ?? 1));
  const rotRad = ((ly.rotation ?? 0) * Math.PI) / 180;

  ctx.save();
  ctx.translate(anchorX, baseY);
  if (rotRad) ctx.rotate(rotRad);
  if (sc !== 1) ctx.scale(sc, sc);
  ctx.translate(-width / 2, -baseY);

  const scaledPx = Math.max(18, Math.round((ly.fontSize / 720) * height));
  const fontFamily =
    ly.fontStyle === 'cinema'
      ? '"Cinzel", Georgia, serif'
      : ly.fontStyle === 'mono'
      ? '"JetBrains Mono", monospace'
      : '"Plus Jakarta Sans", sans-serif';

  const slideOffset =
    tpl === 'slide_up' || tpl === 'lower_third'
      ? Math.round((1 - easeInOutCubic(enterProg)) * height * 0.04)
      : 0;

  let displayText = headlineRaw;
  if (tpl === 'typewriter') {
    const charCount = Math.max(1, Math.floor(headlineRaw.length * Math.min(1, elapsed / Math.max(0.6, ly.duration * 0.5))));
    displayText = headlineRaw.slice(0, charCount);
  }

  ctx.textBaseline = 'middle';
  const color = ly.color || '#ffffff';

  if (tpl === 'lower_third' && ly.kind !== 'caption') {
    ctx.font = `800 ${scaledPx}px ${fontFamily}`;
    const subPx = Math.max(13, Math.round(scaledPx * 0.52));
    const headM = ctx.measureText(displayText);
    const boxW = Math.min(width * 0.86, Math.max(headM.width + scaledPx * 1.4, width * 0.38));
    const boxH = ly.subtitle ? scaledPx * 2.15 : scaledPx * 1.45;
    const x0 = Math.round(width / 2 - boxW / 2);
    const y0 = Math.round(baseY - boxH / 2 + slideOffset);

    ctx.fillStyle = 'rgba(10, 11, 18, 0.82)';
    ctx.fillRect(x0, y0, boxW, boxH);
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0, Math.max(4, Math.round(scaledPx * 0.16)), boxH);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(displayText, x0 + scaledPx * 0.5, y0 + (ly.subtitle ? boxH * 0.36 : boxH * 0.52));

    if (ly.subtitle) {
      ctx.font = `600 ${subPx}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = color;
      ctx.fillText(ly.subtitle, x0 + scaledPx * 0.5, y0 + boxH * 0.72);
    }
    ctx.restore();
    return;
  }

  if (tpl === 'gold_frame' || tpl === 'chapter_card') {
    ctx.font = `800 ${scaledPx}px ${fontFamily}`;
    ctx.textAlign = 'center';
    const m = ctx.measureText(displayText);
    const padX = Math.round(scaledPx * 0.8);
    const padY = Math.round(scaledPx * 0.5);
    const boxW = m.width + padX * 2;
    const boxH = scaledPx + padY * 2 + (ly.subtitle ? scaledPx * 0.7 : 0);
    const bx = width / 2 - boxW / 2;
    const by = baseY - boxH / 2 + slideOffset;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, Math.round(scaledPx * 0.07));
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.fillStyle = color;
    ctx.fillText(displayText, width / 2, by + boxH * (ly.subtitle ? 0.38 : 0.5));
    if (ly.subtitle) {
      ctx.font = `600 ${Math.max(12, Math.round(scaledPx * 0.45))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#e4e4e7';
      ctx.fillText(ly.subtitle.toUpperCase(), width / 2, by + boxH * 0.74);
    }
    ctx.restore();
    return;
  }

  if (tpl === 'neon_pop' || tpl === 'doc_badge') {
    ctx.font = `900 ${scaledPx}px ${fontFamily}`;
    ctx.textAlign = 'center';
    const m = ctx.measureText(displayText);
    const padX = Math.round(scaledPx * 0.55);
    const padY = Math.round(scaledPx * 0.25);
    const bx = width / 2 - m.width / 2 - padX;
    const by = baseY - scaledPx / 2 - padY + slideOffset;
    ctx.fillStyle = tpl === 'doc_badge' ? 'rgba(14, 116, 144, 0.9)' : color;
    ctx.fillRect(bx, by, m.width + padX * 2, scaledPx + padY * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(displayText, width / 2, baseY + slideOffset);
    ctx.restore();
    return;
  }

  if (tpl === 'glitch_thriller') {
    ctx.font = `900 ${scaledPx}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    const jitter = Math.sin(elapsed * 28) * Math.max(2, scaledPx * 0.08);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.fillText(displayText, width / 2 - jitter, baseY);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.fillText(displayText, width / 2 + jitter, baseY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(displayText, width / 2, baseY);
    ctx.restore();
    return;
  }

  if (tpl === 'news_ticker') {
    ctx.font = `900 ${Math.round(scaledPx * 0.86)}px "Plus Jakarta Sans", sans-serif`;
    const barH = Math.round(scaledPx * 1.45);
    const barY = Math.round(baseY - barH / 2);
    ctx.fillStyle = color === '#ffffff' ? '#dc2626' : color;
    ctx.fillRect(0, barY, width, barH);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(displayText.toUpperCase(), width / 2, barY + barH * 0.52);
    ctx.restore();
    return;
  }

  if (tpl === 'vlog_pill') {
    ctx.font = `800 ${Math.round(scaledPx * 0.82)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    const m = ctx.measureText(displayText);
    const padX = Math.round(scaledPx * 0.75);
    const boxW = m.width + padX * 2;
    const boxH = Math.round(scaledPx * 1.4);
    const bx = width / 2 - boxW / 2;
    const by = baseY - boxH / 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, boxH / 2);
    ctx.fill();
    ctx.fillStyle = '#09090b';
    ctx.fillText(displayText, width / 2, baseY);
    ctx.restore();
    return;
  }

  if (tpl === 'quote_block') {
    ctx.font = `700 ${Math.round(scaledPx * 0.92)}px "Cinzel", Georgia, serif`;
    ctx.textAlign = 'center';
    const m = ctx.measureText(`"${displayText}"`);
    const padX = Math.round(scaledPx * 0.9);
    const boxW = Math.min(width * 0.9, m.width + padX * 2);
    const boxH = Math.round(scaledPx * 1.9);
    const bx = width / 2 - boxW / 2;
    const by = baseY - boxH / 2;
    ctx.fillStyle = 'rgba(10, 11, 18, 0.72)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, boxW, Math.max(2, Math.round(scaledPx * 0.08)));
    ctx.fillRect(bx, by + boxH - Math.max(2, Math.round(scaledPx * 0.08)), boxW, Math.max(2, Math.round(scaledPx * 0.08)));
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`"${displayText}"`, width / 2, baseY);
    ctx.restore();
    return;
  }

  if (tpl === 'cinema_credits') {
    const rollOffset = Math.round((1 - Math.min(1, elapsed / Math.max(1.2, ly.duration))) * height * 0.14);
    ctx.font = `700 ${Math.round(scaledPx * 0.9)}px "Cinzel", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = Math.round(scaledPx * 0.25);
    ctx.fillStyle = color;
    ctx.fillText(displayText.toUpperCase(), width / 2, baseY + rollOffset);
    if (ly.subtitle) {
      ctx.font = `600 ${Math.max(12, Math.round(scaledPx * 0.44))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText(ly.subtitle.toUpperCase(), width / 2, baseY + rollOffset + scaledPx * 1.1);
    }
    ctx.restore();
    return;
  }

  // Standard Hero / Minimal / Typewriter / Subtitle
  ctx.font = `800 ${scaledPx}px ${fontFamily}`;
  ctx.textAlign = 'center';
  const lines = displayText.split('\n').slice(0, 3);
  const lineHeight = Math.round(scaledPx * 1.25);
  const startY = baseY + slideOffset - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, i) => {
    const lyY = startY + i * lineHeight;
    const m = ctx.measureText(line);
    const padX = Math.round(scaledPx * 0.42);
    const padY = Math.round(scaledPx * 0.18);

    if (tpl !== 'minimal_whisper' && tpl !== 'imax_hero') {
      ctx.fillStyle = ly.kind === 'caption' ? 'rgba(0,0,0,0.82)' : 'rgba(0,0,0,0.58)';
      ctx.fillRect(
        width / 2 - m.width / 2 - padX,
        lyY - scaledPx / 2 - padY,
        m.width + padX * 2,
        scaledPx + padY * 2
      );
    }

    ctx.shadowColor = 'rgba(0,0,0,0.92)';
    ctx.shadowBlur = Math.round(scaledPx * 0.28);
    ctx.fillStyle = color;
    ctx.fillText(line, width / 2, lyY);
  });

  if (ly.subtitle && tpl !== 'minimal_whisper') {
    ctx.font = `600 ${Math.max(12, Math.round(scaledPx * 0.46))}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#d4d4d8';
    ctx.fillText(ly.subtitle, width / 2, startY + lines.length * lineHeight);
  }
  ctx.restore();
}

function drawVfxVisual(
  ctx: CanvasRenderingContext2D,
  vfx: VfxDefinition,
  width: number,
  height: number,
  timelineTime: number,
  intensity = 100
) {
  if (!vfx || vfx.kind === 'none' || intensity <= 0) return;
  const factor = Math.max(0.1, Math.min(2.5, intensity / 100));
  const t = timelineTime;
  ctx.save();

  switch (vfx.kind) {
    case 'light_leak': {
      ctx.globalCompositeOperation = 'screen';
      const p1 = (Math.sin(t * 1.8) + 1) / 2;
      const p2 = (Math.cos(t * 1.3) + 1) / 2;
      const x1 = width * (0.2 + 0.6 * p1);
      const y1 = height * 0.15;
      const r1 = Math.max(width, height) * (0.45 + 0.15 * p2);

      const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
      grad1.addColorStop(0, `rgba(255, 235, 160, ${(0.88 * factor).toFixed(2)})`);
      grad1.addColorStop(0.35, `rgba(251, 146, 60, ${(0.65 * factor).toFixed(2)})`);
      grad1.addColorStop(0.7, `rgba(244, 63, 94, ${(0.35 * factor).toFixed(2)})`);
      grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const streakY = height * (0.35 + 0.3 * Math.sin(t * 0.8));
      const sGrad = ctx.createLinearGradient(0, streakY - 18, 0, streakY + 18);
      sGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      sGrad.addColorStop(0.5, `rgba(186, 230, 253, ${(0.75 * factor).toFixed(2)})`);
      sGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = sGrad;
      ctx.fillRect(0, streakY - 18, width, 36);
      break;
    }

    case 'sparks': {
      ctx.globalCompositeOperation = 'lighter';
      const count = 35;
      for (let i = 0; i < count; i++) {
        const seed = i * 137.5;
        const speed = 0.25 + (i % 5) * 0.12;
        const y = height - (((t * speed * 220 + seed * 8) % (height + 60)) - 30);
        const x = ((seed * 17 + Math.sin(t * 2 + i) * 45) % width + width) % width;
        const size = (2.5 + (i % 4) * 2) * (height / 720);
        const alpha = Math.min(1, Math.sin((y / height) * Math.PI) * 1.3) * factor;

        if (alpha > 0.05) {
          const rad = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
          rad.addColorStop(0, `rgba(255, 255, 255, ${alpha.toFixed(2)})`);
          rad.addColorStop(0.4, `rgba(251, 146, 60, ${(alpha * 0.85).toFixed(2)})`);
          rad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = rad;
          ctx.beginPath();
          ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'glitch': {
      const glitchActive = Math.sin(t * 12) > 0.3 || Math.sin(t * 23) > 0.55;
      if (glitchActive) {
        ctx.globalCompositeOperation = 'screen';
        const shiftX = Math.sin(t * 45) * 20 * factor;
        const sliceY = (t * 400) % height;
        const sliceH = Math.max(16, height * 0.09);

        ctx.fillStyle = `rgba(244, 63, 94, ${(0.45 * factor).toFixed(2)})`;
        ctx.fillRect(-shiftX, sliceY, width, sliceH);
        ctx.fillStyle = `rgba(6, 182, 212, ${(0.45 * factor).toFixed(2)})`;
        ctx.fillRect(shiftX, (sliceY + height * 0.35) % height, width, sliceH * 0.7);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(0, 0, 0, ${(0.22 * factor).toFixed(2)})`;
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }
      break;
    }

    case 'weather': {
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(215, 235, 255, ${(0.65 * factor).toFixed(2)})`;
      ctx.lineWidth = Math.max(1.2, (1.8 / 720) * height);
      ctx.beginPath();
      const dropCount = 52;
      for (let i = 0; i < dropCount; i++) {
        const seed = i * 211.3;
        const speed = 650 + (i % 6) * 90;
        const y = ((t * speed + seed) % (height + 50)) - 30;
        const x = (seed * 13 + (t * 60)) % width;
        const len = (18 + (i % 5) * 8) * (height / 720);
        ctx.moveTo(x, y);
        ctx.lineTo(x - len * 0.28, y + len);
      }
      ctx.stroke();

      const isLightning = Math.sin(t * 5.2) > 0.93;
      if (isLightning) {
        ctx.fillStyle = `rgba(240, 248, 255, ${(0.42 * factor).toFixed(2)})`;
        ctx.fillRect(0, 0, width, height);
      }
      break;
    }

    case 'film_grain': {
      ctx.globalCompositeOperation = 'source-over';
      const frameSeed = Math.floor(t * 18);
      for (let i = 0; i < 3; i++) {
        const sx = ((frameSeed * 89 + i * 197) % width);
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.38 * factor).toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx + Math.sin(frameSeed) * 2, height);
        ctx.stroke();
      }

      const fRad = Math.max(width, height) * 0.75;
      const fGrad = ctx.createRadialGradient(width / 2, height / 2, fRad * 0.35, width / 2, height / 2, fRad);
      fGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      fGrad.addColorStop(1, `rgba(45, 20, 5, ${(0.5 * factor).toFixed(2)})`);
      ctx.fillStyle = fGrad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'neon_glow': {
      ctx.globalCompositeOperation = 'screen';
      const pulse = (Math.sin(t * 3.5) + 1) / 2;
      const bRad = Math.max(width, height) * 0.65;
      const bGrad = ctx.createRadialGradient(width / 2, height / 2, bRad * 0.2, width / 2, height / 2, bRad);
      bGrad.addColorStop(0, `rgba(236, 72, 153, ${(0.22 * factor).toFixed(2)})`);
      bGrad.addColorStop(0.7, `rgba(168, 85, 247, ${(0.38 * factor * (0.8 + 0.2 * pulse)).toFixed(2)})`);
      bGrad.addColorStop(1, `rgba(59, 130, 246, ${(0.6 * factor).toFixed(2)})`);
      ctx.fillStyle = bGrad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'action_shake': {
      ctx.globalCompositeOperation = 'screen';
      const cx = width / 2;
      const cy = height / 2;
      const spokes = 26;
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.42 * factor).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < spokes; i++) {
        const ang = (i / spokes) * Math.PI * 2 + Math.sin(t * 8) * 0.05;
        const rIn = Math.min(width, height) * (0.32 + (i % 3) * 0.08);
        const rOut = Math.max(width, height) * 0.75;
        ctx.moveTo(cx + Math.cos(ang) * rIn, cy + Math.sin(ang) * rIn);
        ctx.lineTo(cx + Math.cos(ang) * rOut, cy + Math.sin(ang) * rOut);
      }
      ctx.stroke();

      const ringProg = (t * 2.2) % 1;
      const ringR = Math.max(width, height) * 0.65 * ringProg;
      const ringAlpha = (1 - ringProg) * 0.7 * factor;
      ctx.strokeStyle = `rgba(251, 191, 36, ${ringAlpha.toFixed(2)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'bokeh': {
      ctx.globalCompositeOperation = 'screen';
      const bokehCount = 22;
      for (let i = 0; i < bokehCount; i++) {
        const seed = i * 153.7;
        const bx = ((seed * 29 + Math.sin(t * 0.7 + i) * 60) % width + width) % width;
        const by = ((seed * 19 + Math.cos(t * 0.6 + i) * 50) % height + height) % height;
        const bSize = (22 + (i % 6) * 16) * (height / 720);
        const bAlpha = (0.3 + (i % 3) * 0.12) * factor;

        const bGrad = ctx.createRadialGradient(bx, by, bSize * 0.2, bx, by, bSize);
        bGrad.addColorStop(0, `rgba(254, 240, 138, ${bAlpha.toFixed(2)})`);
        bGrad.addColorStop(0.7, `rgba(251, 146, 60, ${(bAlpha * 0.65).toFixed(2)})`);
        bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(bx, by, bSize, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'magic_orbs': {
      ctx.globalCompositeOperation = 'screen';
      const starCount = 30;
      for (let i = 0; i < starCount; i++) {
        const seed = i * 179.3;
        const sx = ((seed * 31 + Math.sin(t * 1.4 + i) * 40) % width + width) % width;
        const sy = ((seed * 23 + Math.cos(t * 1.1 + i) * 40) % height + height) % height;
        const sSize = (3 + (i % 4) * 2.5) * (height / 720);
        const pulse = (Math.sin(t * 4 + i * 2) + 1) / 2;
        const sAlpha = (0.45 + 0.5 * pulse) * factor;

        ctx.fillStyle = `rgba(224, 231, 255, ${sAlpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(199, 210, 254, ${(sAlpha * 0.7).toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - sSize * 2.8, sy);
        ctx.lineTo(sx + sSize * 2.8, sy);
        ctx.moveTo(sx, sy - sSize * 2.8);
        ctx.lineTo(sx, sy + sSize * 2.8);
        ctx.stroke();
      }
      break;
    }

    case 'noir_shadow': {
      ctx.globalCompositeOperation = 'multiply';
      const blindCount = 10;
      const bH = height / blindCount;
      ctx.fillStyle = `rgba(15, 17, 23, ${(0.6 * factor).toFixed(2)})`;
      for (let i = 0; i < blindCount; i += 2) {
        ctx.fillRect(0, i * bH, width, bH);
      }

      const vRad = Math.max(width, height) * 0.72;
      const vGrad = ctx.createRadialGradient(width / 2, height / 2, vRad * 0.25, width / 2, height / 2, vRad);
      vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vGrad.addColorStop(1, `rgba(5, 5, 8, ${(0.75 * factor).toFixed(2)})`);
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

function renderCompositeFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timelineTime: number,
  activePlacement: { clip: TimelineClip; startTime: number; endTime: number; duration: number } | null,
  prevPlacement: { clip: TimelineClip; startTime: number; endTime: number; duration: number } | null,
  getSource: (clip: TimelineClip) => HTMLVideoElement | HTMLImageElement | null,
  layers: LayerItem[],
  letterbox: boolean,
  getLayerImage?: (url: string) => HTMLImageElement | null,
  activeSelectedLayerId?: string | null,
  editorGuide?: { mode: 'mask' | 'graph' | null; clip?: TimelineClip | null; layer?: LayerItem | null },
  qualityTier?: ExportResolutionId
) {
  const qProf = qualityTier ? QUALITY_TIER_PROFILES[qualityTier] : null;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = qProf ? qProf.smoothing : 'high';
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  if (activePlacement) {
    const { clip, startTime, duration } = activePlacement;
    const elapsedInClip = Math.max(0, timelineTime - startTime);
    const activeProg = Math.min(1, elapsedInClip / Math.max(0.2, duration));
    const prevProg = prevPlacement
      ? Math.min(1, Math.max(0, (timelineTime - prevPlacement.startTime) / Math.max(0.2, prevPlacement.duration)))
      : 1;

    const transId = prevPlacement ? clip.transitionId : 'none';
    const transDur = prevPlacement ? Math.max(0.15, clip.transitionDuration || 0.45) : 0;
    const inTransition = Boolean(prevPlacement && transId !== 'none' && elapsedInClip < transDur);
    const rawProgress = inTransition ? Math.min(1, Math.max(0, elapsedInClip / transDur)) : 1;
    const progress = easeInOutCubic(rawProgress);

    const activeSrc = getSource(clip);
    const prevSrc = prevPlacement ? getSource(prevPlacement.clip) : null;

    if (inTransition && prevPlacement) {
      if (transId === 'zoom_flow' || transId === 'zoom_match_out') {
        const outScale = transId === 'zoom_flow' ? 1 + progress * 0.32 : 1 - progress * 0.22;
        const inScale = transId === 'zoom_flow' ? 0.8 + progress * 0.2 : 1.24 - progress * 0.24;

        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.translate(width / 2, height / 2);
        ctx.scale(outScale, outScale);
        ctx.translate(-width / 2, -height / 2);
        drawClipVisual(ctx, prevPlacement.clip, prevSrc, width, height, prevProg);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = progress;
        ctx.translate(width / 2, height / 2);
        ctx.scale(inScale, inScale);
        ctx.translate(-width / 2, -height / 2);
        drawClipVisual(ctx, clip, activeSrc, width, height, activeProg);
        ctx.restore();
      } else if (
        transId === 'whip_pan_left' ||
        transId === 'whip_pan_right' ||
        transId === 'whip_pan_up' ||
        transId === 'whip_pan_down'
      ) {
        const isVert = transId === 'whip_pan_up' || transId === 'whip_pan_down';
        const dir = transId === 'whip_pan_left' || transId === 'whip_pan_up' ? -1 : 1;
        ctx.save();
        ctx.translate(isVert ? 0 : dir * progress * width, isVert ? dir * progress * height : 0);
        drawClipVisual(ctx, prevPlacement.clip, prevSrc, width, height, prevProg, 'blur(4px)');
        ctx.restore();

        ctx.save();
        ctx.translate(isVert ? 0 : -dir * (1 - progress) * width, isVert ? -dir * (1 - progress) * height : 0);
        drawClipVisual(
          ctx,
          clip,
          activeSrc,
          width,
          height,
          activeProg,
          progress < 0.7 ? 'blur(3px)' : ''
        );
        ctx.restore();
      } else if (transId === 'light_leak') {
        drawClipVisual(ctx, prevPlacement.clip, prevSrc, width, height, prevProg);
        ctx.save();
        ctx.globalAlpha = progress;
        drawClipVisual(ctx, clip, activeSrc, width, height, activeProg);
        ctx.restore();

        const leakAlpha = Math.sin(rawProgress * Math.PI) * 0.72;
        const leakX = width * rawProgress;
        const grad = ctx.createRadialGradient(leakX, height * 0.45, 0, leakX, height * 0.45, Math.max(width, height) * 0.75);
        grad.addColorStop(0, `rgba(255, 220, 140, ${leakAlpha.toFixed(2)})`);
        grad.addColorStop(0.45, `rgba(245, 130, 32, ${(leakAlpha * 0.65).toFixed(2)})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (transId === 'focus_pull' || transId === 'blur_fade') {
        const blurOut = Math.round(progress * 14);
        const blurIn = Math.round((1 - progress) * 14);
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        drawClipVisual(ctx, prevPlacement.clip, prevSrc, width, height, prevProg, `blur(${blurOut}px)`);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = progress;
        drawClipVisual(ctx, clip, activeSrc, width, height, activeProg, `blur(${blurIn}px)`);
        ctx.restore();
      } else if (transId === 'fade') {
        drawClipVisual(ctx, prevPlacement.clip, prevSrc, width, height, prevProg);
        ctx.save();
        ctx.globalAlpha = progress;
        drawClipVisual(ctx, clip, activeSrc, width, height, activeProg);
        ctx.restore();
      } else if (transId === 'black' || transId === 'white' || transId === 'dip_amber') {
        const flashColor =
          transId === 'white' ? '#ffffff' : transId === 'dip_amber' ? '#f59e0b' : '#000000';
        if (rawProgress < 0.5) {
          drawClipVisual(ctx, prevPlacement.clip, prevSrc, width, height, prevProg);
          ctx.fillStyle = flashColor;
          ctx.globalAlpha = rawProgress * 2;
          ctx.fillRect(0, 0, width, height);
          ctx.globalAlpha = 1;
        } else {
          drawClipVisual(ctx, clip, activeSrc, width, height, activeProg);
          ctx.fillStyle = flashColor;
          ctx.globalAlpha = (1 - rawProgress) * 2;
          ctx.fillRect(0, 0, width, height);
          ctx.globalAlpha = 1;
        }
      } else if (transId.startsWith('slide_')) {
        drawClipVisual(ctx, prevPlacement.clip, prevSrc, width, height, prevProg);
        ctx.save();
        const dx =
          transId === 'slide_left'
            ? (1 - progress) * width
            : transId === 'slide_right'
            ? -(1 - progress) * width
            : 0;
        const dy =
          transId === 'slide_up'
            ? (1 - progress) * height
            : transId === 'slide_down'
            ? -(1 - progress) * height
            : 0;
        ctx.translate(dx, dy);
        drawClipVisual(ctx, clip, activeSrc, width, height, activeProg);
        ctx.restore();
      } else if (
        transId === 'wipe_left' ||
        transId === 'wipe_right' ||
        transId === 'wipe_up' ||
        transId === 'wipe_down' ||
        transId === 'diagonal_wipe'
      ) {
        drawClipVisual(ctx, prevPlacement.clip, prevSrc, width, height, prevProg);
        ctx.save();
        ctx.beginPath();
        if (transId === 'wipe_left') ctx.rect(width * (1 - progress), 0, width * progress, height);
        else if (transId === 'wipe_right') ctx.rect(0, 0, width * progress, height);
        else if (transId === 'wipe_up') ctx.rect(0, height * (1 - progress), width, height * progress);
        else if (transId === 'wipe_down') ctx.rect(0, 0, width, height * progress);
        else {
          const edge = (width + height) * progress;
          ctx.moveTo(0, 0);
          ctx.lineTo(edge, 0);
          ctx.lineTo(0, edge);
          ctx.closePath();
        }
        ctx.clip();
        drawClipVisual(ctx, clip, activeSrc, width, height, activeProg);
        ctx.restore();
      } else if (transId === 'split_v' || transId === 'split_h') {
        drawClipVisual(ctx, prevPlacement.clip, prevSrc, width, height, prevProg);
        ctx.save();
        ctx.beginPath();
        if (transId === 'split_v') {
          const w = width * progress;
          ctx.rect((width - w) / 2, 0, w, height);
        } else {
          const h = height * progress;
          ctx.rect(0, (height - h) / 2, width, h);
        }
        ctx.clip();
        drawClipVisual(ctx, clip, activeSrc, width, height, activeProg);
        ctx.restore();
      } else if (transId === 'circle_open') {
        drawClipVisual(ctx, prevPlacement.clip, prevSrc, width, height, prevProg);
        ctx.save();
        ctx.beginPath();
        const maxR = Math.hypot(width / 2, height / 2);
        ctx.arc(width / 2, height / 2, maxR * progress, 0, Math.PI * 2);
        ctx.clip();
        drawClipVisual(ctx, clip, activeSrc, width, height, activeProg);
        ctx.restore();
      } else if (transId === 'zoom_in' || transId === 'zoom_out' || transId === 'spin_in') {
        drawClipVisual(ctx, prevPlacement.clip, prevSrc, width, height, prevProg);
        ctx.save();
        ctx.globalAlpha = progress;
        ctx.translate(width / 2, height / 2);
        const s =
          transId === 'zoom_in'
            ? 0.55 + progress * 0.45
            : transId === 'zoom_out'
            ? 1.45 - progress * 0.45
            : 0.4 + progress * 0.6;
        ctx.scale(s, s);
        if (transId === 'spin_in') ctx.rotate((1 - progress) * Math.PI * 0.75);
        ctx.translate(-width / 2, -height / 2);
        drawClipVisual(ctx, clip, activeSrc, width, height, activeProg);
        ctx.restore();
      } else if (transId === 'glitch_flash') {
        drawClipVisual(ctx, prevPlacement.clip, prevSrc, width, height, prevProg);
        ctx.save();
        ctx.globalAlpha = progress;
        ctx.translate(Math.sin(rawProgress * 45) * 14 * (1 - rawProgress), 0);
        drawClipVisual(ctx, clip, activeSrc, width, height, activeProg);
        ctx.restore();
      } else {
        drawClipVisual(ctx, clip, activeSrc, width, height, activeProg, '', qualityTier);
      }
    } else {
      drawClipVisual(ctx, clip, activeSrc, width, height, activeProg, '', qualityTier);
    }

    if (clip.vfxId && clip.vfxId !== 'none') {
      const vfxDef = getVfxById(clip.vfxId);
      if (vfxDef) {
        drawVfxVisual(ctx, vfxDef, width, height, timelineTime, clip.vfxIntensity ?? 100);
      }
    }
  }

  if (letterbox) {
    const barH = Math.round(height * 0.09);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, barH);
    ctx.fillRect(0, height - barH, width, barH);
  }

  const activeLayers = layers.filter(
    (ly) => timelineTime >= ly.startTime && timelineTime <= ly.startTime + ly.duration
  );
  for (const ly of activeLayers) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.1, Math.min(1, ly.opacity));
    const lyProg = Math.max(0, Math.min(1, (timelineTime - ly.startTime) / Math.max(0.2, ly.duration)));
    const kf = getLayerKeyframeTransform(ly, lyProg, letterbox);

    if (ly.kind === 'doodle' && ly.strokes && ly.strokes.length > 0) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const stroke of ly.strokes) {
        if (stroke.points.length === 0) continue;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = Math.max(2, (stroke.size / 720) * height);
        ctx.beginPath();
        stroke.points.forEach((pt, idx) => {
          const px = pt.x * width;
          const py = pt.y * height;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }
    } else if (ly.kind === 'image' && ly.imageUrl) {
      let imgEl = getLayerImage ? getLayerImage(ly.imageUrl) : null;
      if (!imgEl) {
        imgEl = new Image();
        imgEl.src = ly.imageUrl;
      }
      if (imgEl.complete && imgEl.naturalWidth > 0) {
        const sc = Math.max(0.3, Math.min(2.6, kf.scale));
        const targetH = height * 0.28 * sc;
        const targetW = targetH * (imgEl.naturalWidth / imgEl.naturalHeight);
        const cx = kf.x * width;
        const cy = kf.y * height;
        ctx.save();
        ctx.translate(cx, cy);
        if (kf.rotation) ctx.rotate((kf.rotation * Math.PI) / 180);
        if (ly.flipH) ctx.scale(-1, 1);
        ctx.drawImage(imgEl, -targetW / 2, -targetH / 2, targetW, targetH);
        ctx.restore();
      }
    } else if (ly.kind === 'sticker' && ly.text) {
      const sc = Math.max(0.4, Math.min(2.6, kf.scale));
      const stickerPx = Math.max(36, Math.round(((ly.fontSize * 1.8 * sc) / 720) * height));
      const cx = Math.round(kf.x * width);
      const cy = Math.round(kf.y * height);
      ctx.save();
      ctx.translate(cx, cy);
      if (kf.rotation) ctx.rotate((kf.rotation * Math.PI) / 180);
      ctx.font = `${stickerPx}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ly.text, 0, 0);
      ctx.restore();
    } else if (ly.kind === 'character' && ly.characterArchetype) {
      renderCinemaCharacter(ctx, width, height, {
        archetype: ly.characterArchetype,
        xNorm: kf.x,
        yNorm: kf.y,
        scale: kf.scale,
        rotationDeg: kf.rotation,
        flipH: Boolean(ly.flipH),
        suitColor: ly.suitColor || '#18181b',
        accentColor: ly.accentColor || '#f59e0b',
        opacity: ly.opacity ?? 1,
        progress: lyProg,
      });
    } else if (ly.kind === 'vfx_prop' && ly.vfxType) {
      renderActionVfxProp(ctx, width, height, {
        vfxType: ly.vfxType,
        seed: ly.vfxSeed || 101,
        xNorm: kf.x,
        yNorm: kf.y,
        scale: kf.scale,
        rotationDeg: kf.rotation,
        opacity: ly.opacity ?? 0.9,
        blendMode: ly.blendMode || 'screen',
        density: ly.density ?? 1.2,
        hueShift: ly.hueShift ?? 0,
        progress: lyProg,
      });
    } else if (ly.kind === 'text' || ly.kind === 'caption') {
      const resolvedLy: LayerItem = ly.graphEnabled
        ? { ...ly, posX: kf.x, posY: kf.y, scale: kf.scale, rotation: kf.rotation }
        : ly;
      renderTitleLayer(ctx, resolvedLy, width, height, Math.max(0, timelineTime - ly.startTime), letterbox);
    }

    // Premiere Pro Program Monitor Interactive Selection Frame + Center Snap Guide
    if (activeSelectedLayerId && ly.id === activeSelectedLayerId && ly.kind !== 'doodle') {
      const cx = Math.round(kf.x * width);
      const cy = Math.round(kf.y * height);
      const boxW = Math.round(width * 0.24 * Math.max(0.6, Math.min(2, kf.scale)));
      const boxH = Math.round(height * 0.14 * Math.max(0.6, Math.min(2, kf.scale)));

      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.globalCompositeOperation = 'source-over';
      if (Math.abs(kf.x - 0.5) < 0.015) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();
      }
      ctx.translate(cx, cy);
      if (kf.rotation) ctx.rotate((kf.rotation * Math.PI) / 180);
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = ly.kind === 'character' ? '#38bdf8' : '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
      ctx.setLineDash([]);
      ctx.fillStyle = ly.kind === 'character' ? '#38bdf8' : '#fbbf24';
      [
        [-boxW / 2, -boxH / 2],
        [boxW / 2, -boxH / 2],
        [-boxW / 2, boxH / 2],
        [boxW / 2, boxH / 2],
      ].forEach(([hx, hy]) => {
        ctx.fillRect(hx - 4, hy - 4, 8, 8);
      });
      ctx.restore();
    }

    ctx.restore();
  }

  // Interactive Masking / Keyframe Motion Graph Guides on Monitor (omitted during Export!)
  if (editorGuide?.mode === 'mask' && editorGuide.clip?.maskEnabled) {
    const mc = editorGuide.clip;
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = (mc.maskMode || 'keep_inside') === 'erase_inside' ? '#f43f5e' : '#22d3ee';
    ctx.lineWidth = 2;
    traceMaskShape(
      ctx,
      mc.maskShape || 'circle',
      (mc.maskX ?? 0.5) * width,
      (mc.maskY ?? 0.5) * height,
      (mc.maskW ?? 0.45) * width,
      (mc.maskH ?? 0.62) * height,
      mc.maskRotation ?? 0
    );
    ctx.stroke();

    if (mc.mask2Enabled) {
      ctx.strokeStyle = '#e879f9';
      traceMaskShape(
        ctx,
        mc.mask2Shape || 'rect',
        (mc.mask2X ?? 0.5) * width,
        (mc.mask2Y ?? 0.5) * height,
        (mc.mask2W ?? 0.22) * width,
        (mc.mask2H ?? 0.28) * height,
        0
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  if (editorGuide?.mode === 'graph' && editorGuide.layer?.graphEnabled) {
    const gl = editorGuide.layer;
    const sx = (gl.kfStartX ?? gl.posX ?? 0.25) * width;
    const sy = (gl.kfStartY ?? gl.posY ?? 0.5) * height;
    const ex = (gl.kfEndX ?? 0.78) * width;
    const ey = (gl.kfEndY ?? 0.5) * height;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(ex, ey, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('A', sx - 3, sy + 3);
    ctx.fillText('B', ex - 3, ey + 3);
    ctx.restore();
  }

  if (qProf && qProf.softScale < 1 && typeof document !== 'undefined') {
    const sw = Math.max(120, Math.round(width * qProf.softScale));
    const sh = Math.max(90, Math.round(height * qProf.softScale));
    if (!offscreenQualityCanvas) {
      offscreenQualityCanvas = document.createElement('canvas');
      offscreenQualityCtx = offscreenQualityCanvas.getContext('2d');
    }
    if (offscreenQualityCanvas && offscreenQualityCtx) {
      if (offscreenQualityCanvas.width !== sw || offscreenQualityCanvas.height !== sh) {
        offscreenQualityCanvas.width = sw;
        offscreenQualityCanvas.height = sh;
      }
      offscreenQualityCtx.imageSmoothingEnabled = true;
      offscreenQualityCtx.imageSmoothingQuality = qProf.smoothing;
      offscreenQualityCtx.clearRect(0, 0, sw, sh);
      offscreenQualityCtx.drawImage(ctx.canvas, 0, 0, sw, sh);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = qProf.smoothing;
      ctx.drawImage(offscreenQualityCanvas, 0, 0, width, height);
    }
  }

  ctx.restore();
}

async function probeMediaFile(file: File): Promise<{
  type: 'video' | 'image';
  url: string;
  duration: number;
  thumbnailUrl?: string;
}> {
  const url = URL.createObjectURL(file);
  if (file.type.startsWith('image/')) {
    await new Promise<void>((res) => {
      const img = new Image();
      img.onload = () => res();
      img.onerror = () => res();
      img.src = url;
    });
    return { type: 'image', url, duration: 20, thumbnailUrl: url };
  }

  return new Promise((resolve) => {
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.muted = true;
    vid.playsInline = true;
    vid.src = url;

    const finish = (dur: number, thumb?: string) => {
      resolve({
        type: 'video',
        url,
        duration: Number.isFinite(dur) && dur > 0.2 ? dur : 6,
        thumbnailUrl: thumb,
      });
    };

    const timer = window.setTimeout(() => finish(6), 4500);
    vid.onloadedmetadata = () => {
      const dur = Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 6;
      try {
        vid.currentTime = Math.min(0.35, dur * 0.1);
      } catch {
        window.clearTimeout(timer);
        finish(dur);
      }
    };
    vid.onseeked = () => {
      window.clearTimeout(timer);
      try {
        const c = document.createElement('canvas');
        c.width = 240;
        c.height = 240;
        const cx = c.getContext('2d');
        if (cx && vid.videoWidth > 0) {
          cx.drawImage(vid, 0, 0, 240, 240);
          finish(vid.duration, c.toDataURL('image/jpeg', 0.8));
          return;
        }
      } catch {}
      finish(vid.duration);
    };
    vid.onerror = () => {
      window.clearTimeout(timer);
      finish(6);
    };
  });
}

async function probeAudioFile(file: File): Promise<{ url: string; duration: number }> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const a = new Audio();
    a.preload = 'metadata';
    a.src = url;
    const t = window.setTimeout(() => resolve({ url, duration: 60 }), 3500);
    a.onloadedmetadata = () => {
      window.clearTimeout(t);
      resolve({ url, duration: Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 60 });
    };
    a.onerror = () => {
      window.clearTimeout(t);
      resolve({ url, duration: 60 });
    };
  });
}

interface VideoEditorStudioProps {
  lang: AppLang;
  onBackToStoryboard: () => void;
}

export const VideoEditorStudio: React.FC<VideoEditorStudioProps> = ({
  lang,
  onBackToStoryboard,
}) => {
  const isMl = lang === 'ml';

  const [projectName, setProjectName] = useState<string>('CinePro 16:9 Studio');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>('16:9');
  const [autoPlay16x9, setAutoPlay16x9] = useState<boolean>(true);
  const [premiereTool, setPremiereTool] = useState<PremiereToolMode>('select');
  const [letterbox, setLetterbox] = useState<boolean>(false);
  const [clipsMuted, setClipsMuted] = useState<boolean>(false);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [continuityAppliedToast, setContinuityAppliedToast] = useState<string | null>(null);
  const [showFileMenu, setShowFileMenu] = useState<boolean>(false);
  const [extraVfxTrackCount, setExtraVfxTrackCount] = useState<number>(1);
  const [extraAudioTrackCount, setExtraAudioTrackCount] = useState<number>(2);
  const [activeAudioTrackIdx, setActiveAudioTrackIdx] = useState<number>(0);

  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [audioItems, setAudioItems] = useState<AudioTimelineItem[]>([]);
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([]);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTransitionClipId, setSelectedTransitionClipId] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);

  const [playhead, setPlayhead] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [importingMedia, setImportingMedia] = useState<boolean>(false);

  const [bottomTray, setBottomTray] = useState<BottomTray>(null);

  // Doodle & Direct Layer Drag controls
  const [doodleColor, setDoodleColor] = useState<string>('#f59e0b');
  const [doodleSize, setDoodleSize] = useState<number>(10);
  const [isDrawingDoodle, setIsDrawingDoodle] = useState<boolean>(false);
  const [isDraggingVfxProp, setIsDraggingVfxProp] = useState<boolean>(false);
  const activeDoodleLayerIdRef = useRef<string | null>(null);

  // Filters, Music, LUTs, Action VFX, Motions, Transitions, Titles, SFX & 121 Pro Tools Search + Pagination
  const [sfxCategory, setSfxCategory] = useState<string>('All');
  const [sfxSearch, setSfxSearch] = useState<string>('');
  const [sfxPage, setSfxPage] = useState<number>(0);
  const [audioTab, setAudioTab] = useState<'free' | 'phone'>('free');
  const [musicCategory, setMusicCategory] = useState<string>('All');
  const [musicSearch, setMusicSearch] = useState<string>('');
  const [musicPage, setMusicPage] = useState<number>(0);
  const [loadingMusicId, setLoadingMusicId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterPage, setFilterPage] = useState<number>(0);
  const [lutCategory, setLutCategory] = useState<string>('All');
  const [lutSearch, setLutSearch] = useState<string>('');
  const [lutPage, setLutPage] = useState<number>(0);
  const [vfxCategory, setVfxCategory] = useState<string>('All');
  const [vfxSearch, setVfxSearch] = useState<string>('');
  const [actionVfxCat, setActionVfxCat] = useState<string>('All');
  const [actionVfxPage, setActionVfxPage] = useState<number>(0);
  const [motionCat, setMotionCat] = useState<string>('All');
  const [motionSearch, setMotionSearch] = useState<string>('');
  const [motionPage, setMotionPage] = useState<number>(0);
  const [transCat, setTransCat] = useState<string>('All');
  const [transSearch, setTransSearch] = useState<string>('');
  const [transPage, setTransPage] = useState<number>(0);
  const [titleCat, setTitleCat] = useState<string>('All');
  const [titleSearch, setTitleSearch] = useState<string>('');
  const [titlePage, setTitlePage] = useState<number>(0);
  const [maskCat, setMaskCat] = useState<string>('All');
  const [maskSearch, setMaskSearch] = useState<string>('');
  const [maskPage, setMaskPage] = useState<number>(0);
  const [graphCat, setGraphCat] = useState<string>('All');
  const [graphSearch, setGraphSearch] = useState<string>('');
  const [graphPage, setGraphPage] = useState<number>(0);
  const [charCat, setCharCat] = useState<string>('All');
  const [charSearch, setCharSearch] = useState<string>('');
  const [charPage, setCharPage] = useState<number>(0);
  const [toolsSearch, setToolsSearch] = useState<string>('');
  const [toolsGroupFilter, setToolsGroupFilter] = useState<string>('All');
  const [navCatFilter, setNavCatFilter] = useState<string>('All');
  const previewAnimRef = useRef<number | null>(null);
  const [loadingSfxId, setLoadingSfxId] = useState<string | null>(null);

  // Voiceover REC
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [voiceRecSec, setVoiceRecSec] = useState<number>(0);
  const [voiceRecError, setVoiceRecError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceStartTimeRef = useRef<number>(0);
  const voiceTimerRef = useRef<number | null>(null);

  // Quality & Mobile Save/Export State (Export renders up to 4K; live interactive canvas stays 60fps!)
  const [exportResolution, setExportResolution] = useState<ExportResolutionId>('1080p');
  const [exportFormat, setExportFormat] = useState<ExportFormatId>('auto');
  const [exportFps, setExportFps] = useState<24 | 30 | 60>(30);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportElapsedSec, setExportElapsedSec] = useState<number>(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedDownload, setExportedDownload] = useState<{
    url: string;
    blob: Blob;
    fileName: string;
    sizeMb: string;
  } | null>(null);
  const [exportHistory, setExportHistory] = useState<ExportHistoryRecord[]>(() => {
    try {
      const raw = localStorage.getItem(EXPORT_HISTORY_KEY);
      if (raw) return JSON.parse(raw) as ExportHistoryRecord[];
    } catch {}
    return [];
  });
  const [studioTab, setStudioTab] = useState<'lumetri' | 'wheels' | 'luts' | 'chroma' | 'filters' | 'vfx'>('lumetri');
  const [abCompare, setAbCompare] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const studioCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportMonitorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const studioRangeRef = useRef<HTMLInputElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const playheadTimeRef = useRef<HTMLSpanElement | null>(null);
  const studioTimeRef = useRef<HTMLSpanElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);
  const layerImageInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imageElementsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const exportAbortRef = useRef<boolean>(false);
  const playheadRef = useRef<number>(0);
  if (!isPlaying) {
    playheadRef.current = playhead;
  }

  // Restore saved video blobs from IndexedDB for Export History
  useEffect(() => {
    let active = true;
    (async () => {
      if (exportHistory.length === 0) return;
      const updated = await Promise.all(
        exportHistory.map(async (item) => {
          const blob = await getExportBlobFromIdb(item.id);
          if (blob) {
            return { ...item, url: URL.createObjectURL(blob) };
          }
          return item;
        })
      );
      if (active) setExportHistory(updated);
    })();
    return () => {
      active = false;
    };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timeline placements
  const placements = useMemo(() => {
    let cursor = 0;
    return clips.map((clip) => {
      const dur = getClipEffectiveDuration(clip);
      const item = { clip, startTime: cursor, endTime: cursor + dur, duration: dur };
      cursor += dur;
      return item;
    });
  }, [clips]);

  const totalDuration = useMemo(() => {
    const clipEnd = placements.length > 0 ? placements[placements.length - 1].endTime : 0;
    const audioEnd = audioItems.reduce((m, a) => Math.max(m, a.startTime + a.duration), 0);
    const layerEnd = layers.reduce((m, l) => Math.max(m, l.startTime + l.duration), 0);
    return Math.max(clipEnd, audioEnd > 0 && clipEnd > 0 ? clipEnd : Math.max(clipEnd, layerEnd, audioEnd));
  }, [placements, audioItems, layers]);

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) || clips[0] || null,
    [clips, selectedClipId]
  );
  const selectedTransitionClip = useMemo(
    () => clips.find((c) => c.id === selectedTransitionClipId) || null,
    [clips, selectedTransitionClipId]
  );
  const selectedLayer = useMemo(
    () => layers.find((l) => l.id === selectedLayerId) || null,
    [layers, selectedLayerId]
  );
  const selectedAudio = useMemo(
    () => audioItems.find((a) => a.id === selectedAudioId) || null,
    [audioItems, selectedAudioId]
  );

  const aspectSpec = useMemo(
    () => ASPECT_RATIO_OPTIONS.find((a) => a.id === aspectRatio) || ASPECT_RATIO_OPTIONS[0],
    [aspectRatio]
  );

  // Interactive 60fps GPU-friendly preview resolution (854x480 in 16:9); 4K/1080p renders cleanly on Export!
  const previewDims = useMemo(() => {
    return aspectSpec.dims['480p'];
  }, [aspectSpec]);

  // Undo / Redo
  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [
      ...prev.slice(-19),
      {
        clips: clips.map((c) => ({ ...c })),
        layers: layers.map((l) => ({ ...l })),
        audioItems: audioItems.map((a) => ({ ...a })),
      },
    ]);
    setRedoStack([]);
  }, [clips, layers, audioItems]);

  const handleUndo = () => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const snap = prev[prev.length - 1];
      setRedoStack((r) => [
        ...r.slice(-19),
        {
          clips: clips.map((c) => ({ ...c })),
          layers: layers.map((l) => ({ ...l })),
          audioItems: audioItems.map((a) => ({ ...a })),
        },
      ]);
      setClips(snap.clips);
      setLayers(snap.layers);
      setAudioItems(snap.audioItems);
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const snap = prev[prev.length - 1];
      setUndoStack((u) => [
        ...u.slice(-19),
        {
          clips: clips.map((c) => ({ ...c })),
          layers: layers.map((l) => ({ ...l })),
          audioItems: audioItems.map((a) => ({ ...a })),
        },
      ]);
      setClips(snap.clips);
      setLayers(snap.layers);
      setAudioItems(snap.audioItems);
      return prev.slice(0, -1);
    });
  };

  const findPlacementIndexAt = useCallback(
    (t: number): number => {
      if (placements.length === 0) return -1;
      const clamped = Math.min(Math.max(0, t), Math.max(0, totalDuration - 0.001));
      const idx = placements.findIndex((p) => clamped >= p.startTime && clamped < p.endTime);
      return idx >= 0 ? idx : placements.length - 1;
    },
    [placements, totalDuration]
  );

  const getCachedSource = useCallback((clip: TimelineClip) => {
    if (clip.type === 'video') return videoElementsRef.current.get(clip.url) || null;
    if (clip.type === 'image') return imageElementsRef.current.get(clip.url) || null;
    return null;
  }, []);

  const drawPreviewAt = useCallback(
    (t: number) => {
      const idx = findPlacementIndexAt(t);
      const activeP = idx >= 0 ? placements[idx] : null;
      const prevP = idx > 0 ? placements[idx - 1] : null;
      const selLayerForBox = !isPlaying ? selectedLayerId : null;
      const guide = !isPlaying
        ? bottomTray === 'masking'
          ? { mode: 'mask' as const, clip: activeP?.clip || selectedClip || null }
          : bottomTray === 'graph'
          ? { mode: 'graph' as const, layer: selectedLayer || null }
          : undefined
        : undefined;

      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderCompositeFrame(
            ctx,
            canvas.width,
            canvas.height,
            t,
            activeP,
            prevP,
            getCachedSource,
            layers,
            letterbox,
            (url) => imageElementsRef.current.get(url) || null,
            selLayerForBox,
            guide
          );
        }
      }

      const studioCanvas = studioCanvasRef.current;
      if (studioCanvas) {
        const sCtx = studioCanvas.getContext('2d');
        if (sCtx) {
          renderCompositeFrame(
            sCtx,
            studioCanvas.width,
            studioCanvas.height,
            t,
            activeP,
            prevP,
            getCachedSource,
            layers,
            letterbox,
            (url) => imageElementsRef.current.get(url) || null,
            selLayerForBox,
            guide
          );

          if (abCompare && activeP) {
            const rawClip: TimelineClip = {
              ...activeP.clip,
              filterId: 'none',
              vfxId: 'none',
              colorGradeEnabled: false,
              colorLutId: 'none',
              chromaKeyEnabled: false,
              brightness: 100,
              contrast: 100,
              saturation: 100,
              vignette: 0,
            };
            sCtx.save();
            sCtx.beginPath();
            sCtx.rect(0, 0, studioCanvas.width / 2, studioCanvas.height);
            sCtx.clip();
            renderCompositeFrame(
              sCtx,
              studioCanvas.width,
              studioCanvas.height,
              t,
              { ...activeP, clip: rawClip },
              prevP,
              () => getCachedSource(activeP.clip),
              layers,
              letterbox,
              (url) => imageElementsRef.current.get(url) || null,
              null
            );
            sCtx.restore();

            sCtx.save();
            sCtx.strokeStyle = 'rgba(255,255,255,0.9)';
            sCtx.lineWidth = 2;
            sCtx.beginPath();
            sCtx.moveTo(studioCanvas.width / 2, 0);
            sCtx.lineTo(studioCanvas.width / 2, studioCanvas.height);
            sCtx.stroke();
            sCtx.fillStyle = 'rgba(0,0,0,0.75)';
            sCtx.fillRect(10, 10, 68, 20);
            sCtx.fillRect(studioCanvas.width - 82, 10, 72, 20);
            sCtx.fillStyle = '#ffffff';
            sCtx.font = 'bold 10px monospace';
            sCtx.fillText('ORIGINAL', 17, 23);
            sCtx.fillStyle = '#fbbf24';
            sCtx.fillText('PRO GRADE', studioCanvas.width - 75, 23);
            sCtx.restore();
          }
        }
      }
    },
    [findPlacementIndexAt, placements, getCachedSource, layers, letterbox, abCompare, selectedLayerId, isPlaying, bottomTray, selectedClip, selectedLayer]
  );

  // Ensure studio canvas redraws immediately whenever studio workspace opens or toggles A/B compare
  useEffect(() => {
    const inStudio =
      bottomTray === 'colorStudio' ||
      bottomTray === 'chromaStudio' ||
      bottomTray === 'filters' ||
      bottomTray === 'vfx';
    if (inStudio) {
      const id = requestAnimationFrame(() => drawPreviewAt(playheadRef.current));
      return () => cancelAnimationFrame(id);
    }
  }, [bottomTray, studioTab, abCompare, clips, selectedClipId, drawPreviewAt]);

  // Cache media elements & decode first frame immediately
  useEffect(() => {
    const activeClipUrls = new Set(clips.map((c) => c.url).filter(Boolean));
    const activeLayerUrls = new Set(
      layers.filter((l) => l.kind === 'image' && l.imageUrl).map((l) => l.imageUrl as string)
    );

    for (const [url, v] of videoElementsRef.current.entries()) {
      if (!activeClipUrls.has(url)) {
        v.pause();
        v.src = '';
        videoElementsRef.current.delete(url);
      }
    }
    for (const [url] of imageElementsRef.current.entries()) {
      if (!activeClipUrls.has(url) && !activeLayerUrls.has(url)) {
        imageElementsRef.current.delete(url);
      }
    }

    clips.forEach((c) => {
      if (c.type === 'video' && c.url && !videoElementsRef.current.has(c.url)) {
        const v = document.createElement('video');
        v.src = c.url;
        v.preload = 'auto';
        v.playsInline = true;
        v.crossOrigin = 'anonymous';
        v.onloadeddata = () => {
          try {
            if (v.currentTime < c.trimStart) v.currentTime = c.trimStart;
          } catch {}
          drawPreviewAt(playheadRef.current);
        };
        v.onseeked = () => drawPreviewAt(playheadRef.current);
        v.load();
        videoElementsRef.current.set(c.url, v);
      } else if (c.type === 'image' && c.url && !imageElementsRef.current.has(c.url)) {
        const img = new Image();
        img.onload = () => drawPreviewAt(playheadRef.current);
        img.src = c.url;
        imageElementsRef.current.set(c.url, img);
      }
    });

    activeLayerUrls.forEach((url) => {
      if (!imageElementsRef.current.has(url)) {
        const img = new Image();
        img.onload = () => drawPreviewAt(playheadRef.current);
        img.src = url;
        imageElementsRef.current.set(url, img);
      }
    });
  }, [clips, layers, drawPreviewAt]);

  useEffect(() => {
    const activeAudioIds = new Set(audioItems.map((a) => a.id));
    for (const [id, el] of audioElementsRef.current.entries()) {
      if (!activeAudioIds.has(id)) {
        el.pause();
        el.src = '';
        audioElementsRef.current.delete(id);
      }
    }
    audioItems.forEach((a) => {
      if (!audioElementsRef.current.has(a.id)) {
        const el = new Audio(a.url);
        el.preload = 'auto';
        audioElementsRef.current.set(a.id, el);
      }
    });
  }, [audioItems]);

  const syncTimelineScrollToTime = useCallback((t: number) => {
    const el = timelineScrollRef.current;
    if (!el) return;
    isProgrammaticScrollRef.current = true;
    el.scrollLeft = Math.max(0, t * PX_PER_SEC);
    window.requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  }, []);

  const seekAndDraw = useCallback(
    (target: number, updateScroll = true) => {
      const clamped = Math.max(0, Math.min(target, totalDuration));
      playheadRef.current = clamped;
      if (playheadTimeRef.current) playheadTimeRef.current.textContent = formatMmSs(clamped);
      if (studioTimeRef.current) studioTimeRef.current.textContent = `${formatMmSs(clamped)} / ${formatMmSs(totalDuration)}`;
      if (studioRangeRef.current) studioRangeRef.current.value = String(clamped);
      setPlayhead(clamped);
      if (updateScroll) syncTimelineScrollToTime(clamped);

      const idx = findPlacementIndexAt(clamped);
      const activeP = idx >= 0 ? placements[idx] : null;
      if (!activeP) {
        drawPreviewAt(clamped);
        return;
      }

      if (activeP.clip.type === 'video') {
        const vid = videoElementsRef.current.get(activeP.clip.url);
        if (vid) {
          const localTime = Math.min(
            activeP.clip.trimEnd,
            activeP.clip.trimStart + (clamped - activeP.startTime) * activeP.clip.speed
          );
          try {
            vid.currentTime = localTime;
          } catch {}
        }
      }
      drawPreviewAt(clamped);
    },
    [totalDuration, findPlacementIndexAt, placements, drawPreviewAt, syncTimelineScrollToTime]
  );

  useEffect(() => {
    if (!isPlaying) {
      setPlayhead(playheadRef.current);
      if (studioRangeRef.current) studioRangeRef.current.value = String(playheadRef.current);
      const id = window.requestAnimationFrame(() => drawPreviewAt(playheadRef.current));
      return () => window.cancelAnimationFrame(id);
    }
  }, [isPlaying, clips, layers, aspectRatio, letterbox, previewDims, selectedLayerId, bottomTray, drawPreviewAt]);

  // True 60fps Zero-React-Churn Playback Loop (Mobile & Desktop Silky Smooth!)
  useEffect(() => {
    if (!isPlaying || placements.length === 0 || totalDuration <= 0) {
      for (const v of videoElementsRef.current.values()) v.pause();
      for (const a of audioElementsRef.current.values()) a.pause();
      return;
    }

    let rafId = 0;
    let lastTs = performance.now();
    let currentT = playheadRef.current >= totalDuration ? 0 : playheadRef.current;

    const tick = (now: number) => {
      const dt = Math.min(0.08, (now - lastTs) / 1000);
      lastTs = now;
      currentT += dt;

      if (currentT >= totalDuration) {
        playheadRef.current = 0;
        if (playheadTimeRef.current) playheadTimeRef.current.textContent = formatMmSs(0);
        if (studioTimeRef.current) studioTimeRef.current.textContent = `${formatMmSs(0)} / ${formatMmSs(totalDuration)}`;
        if (studioRangeRef.current) studioRangeRef.current.value = '0';
        setPlayhead(0);
        syncTimelineScrollToTime(0);
        setIsPlaying(false);
        return;
      }

      playheadRef.current = currentT;
      if (playheadTimeRef.current) {
        playheadTimeRef.current.textContent = formatMmSs(currentT);
      }
      if (studioTimeRef.current) {
        studioTimeRef.current.textContent = `${formatMmSs(currentT)} / ${formatMmSs(totalDuration)}`;
      }
      if (studioRangeRef.current) {
        studioRangeRef.current.value = String(currentT);
      }
      syncTimelineScrollToTime(currentT);

      const idx = findPlacementIndexAt(currentT);
      const activeP = idx >= 0 ? placements[idx] : null;
      const prevP = idx > 0 ? placements[idx - 1] : null;

      const activeTransDur =
        prevP && activeP && activeP.clip.transitionId !== 'none'
          ? Math.max(0.15, activeP.clip.transitionDuration || 0.45)
          : 0;
      const inTransition = Boolean(
        prevP && activeP && activeTransDur > 0 && currentT - activeP.startTime < activeTransDur
      );

      const playingUrls = new Set<string>();
      if (activeP?.clip.type === 'video') playingUrls.add(activeP.clip.url);
      if (inTransition && prevP?.clip.type === 'video') playingUrls.add(prevP.clip.url);

      for (const [url, v] of videoElementsRef.current.entries()) {
        if (!playingUrls.has(url)) {
          if (!v.paused) v.pause();
          continue;
        }

        if (activeP && activeP.clip.url === url) {
          const targetLocal =
            activeP.clip.trimStart + (currentT - activeP.startTime) * activeP.clip.speed;
          v.playbackRate = activeP.clip.speed;
          v.volume = clipsMuted ? 0 : Math.min(1, Math.max(0, activeP.clip.volume));
          if (Math.abs(v.currentTime - targetLocal) > 0.55) {
            try {
              v.currentTime = targetLocal;
            } catch {}
          }
          if (v.paused) v.play().catch(() => {});
        } else if (inTransition && prevP && prevP.clip.url === url) {
          const outLocal =
            prevP.clip.trimStart + (currentT - prevP.startTime) * prevP.clip.speed;
          v.playbackRate = prevP.clip.speed;
          v.volume = 0;
          if (Math.abs(v.currentTime - Math.min(prevP.clip.trimEnd, outLocal)) > 0.6) {
            try {
              v.currentTime = Math.min(prevP.clip.trimEnd, outLocal);
            } catch {}
          }
          if (v.paused) v.play().catch(() => {});
        }
      }

      for (const item of audioItems) {
        const el = audioElementsRef.current.get(item.id);
        if (!el) continue;
        const active = currentT >= item.startTime && currentT < item.startTime + item.duration;
        if (!active) {
          if (!el.paused) el.pause();
        } else {
          const elapsedA = currentT - item.startTime;
          const remainingA = item.duration - elapsedA;
          const edgeFade = Math.min(1, elapsedA / 0.15, remainingA / 0.25);
          el.volume = audioMuted ? 0 : Math.min(1, Math.max(0, item.volume * edgeFade));
          const targetAudioTime = elapsedA + item.trimStart;
          if (Math.abs(el.currentTime - targetAudioTime) > 0.22) {
            try {
              el.currentTime = targetAudioTime;
            } catch {}
          }
          if (el.paused) el.play().catch(() => {});
        }
      }

      drawPreviewAt(currentT);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      for (const v of videoElementsRef.current.values()) v.pause();
      for (const a of audioElementsRef.current.values()) a.pause();
    };
  }, [
    isPlaying,
    placements,
    totalDuration,
    findPlacementIndexAt,
    drawPreviewAt,
    audioItems,
    clipsMuted,
    audioMuted,
    syncTimelineScrollToTime,
  ]);

  const handleCreateBlank16x9Scene = () => {
    pushUndo();
    setAspectRatio('16:9');
    const blankClip: TimelineClip = {
      id: `clip_scene_${Date.now()}`,
      type: 'color',
      name: '16:9 Cinema Scene',
      url: '',
      colorHex: '#0b0e17',
      mediaDuration: 8,
      trimStart: 0,
      trimEnd: 8,
      speed: 1,
      volume: 0,
      filterId: 'none',
      vfxId: 'none',
      vfxIntensity: 100,
      motionPreset: 'push_in',
      brightness: 100,
      contrast: 100,
      saturation: 100,
      vignette: 20,
      rotation: 0,
      flipH: false,
      fitMode: 'cover',
      transitionId: 'none',
      transitionDuration: 0.45,
    };
    setClips((prev) => [...prev, blankClip]);
    setSelectedClipId(blankClip.id);
    setSelectedLayerId(null);
    setSelectedAudioId(null);
    if (autoPlay16x9) {
      setPlayhead(0);
      syncTimelineScrollToTime(0);
      window.setTimeout(() => setIsPlaying(true), 120);
    }
  };

  // Upload Video / Photo directly from phone/PC gallery -> Auto 16:9 & Auto-Play Ready!
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsPlaying(false);
    setImportingMedia(true);
    try {
      const files = Array.from(fileList);
      const probed = await Promise.all(files.map((f) => probeMediaFile(f)));
      pushUndo();

      if (autoPlay16x9) {
        setAspectRatio('16:9');
      }

      const motionCycle: MotionPresetId[] = ['push_in', 'pan_right', 'pull_out', 'pan_left'];
      const transCycle = ['zoom_flow', 'light_leak', 'focus_pull', 'whip_pan_left'];

      const added: TimelineClip[] = probed.map((item, idx) => {
        const defaultEnd = item.type === 'image' ? 4.5 : item.duration;
        const seqIndex = clips.length + idx;
        return {
          id: `clip_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          type: item.type,
          name: files[idx].name.replace(/\.[^.]+$/, '').slice(0, 22),
          url: item.url,
          mediaDuration: item.duration,
          trimStart: 0,
          trimEnd: Math.max(0.5, Number(defaultEnd.toFixed(1))),
          speed: 1,
          volume: item.type === 'video' ? 1 : 0,
          filterId: 'none',
          vfxId: 'none',
          vfxIntensity: 100,
          motionPreset: item.type === 'image' ? motionCycle[seqIndex % motionCycle.length] : 'none',
          brightness: 100,
          contrast: 100,
          saturation: 100,
          vignette: 0,
          rotation: 0,
          flipH: false,
          fitMode: 'cover',
          transitionId: seqIndex > 0 ? transCycle[(seqIndex - 1) % transCycle.length] : 'none',
          transitionDuration: 0.45,
          thumbnailUrl: item.thumbnailUrl,
        };
      });

      setClips((prev) => [...prev, ...added]);
      if (added[0]) {
        setSelectedClipId(added[0].id);
        setSelectedLayerId(null);
        setSelectedAudioId(null);
      }
      setBottomTray(null);
      if (autoPlay16x9) {
        setPlayhead(0);
        syncTimelineScrollToTime(0);
        window.setTimeout(() => setIsPlaying(true), 160);
      }
    } finally {
      setImportingMedia(false);
      e.target.value = '';
    }
  };

  // Pro 1-Tap Auto Scene-to-Scene Continuity Engine!
  const handleApplyAutoContinuity = (tightenEdges: boolean) => {
    if (clips.length === 0) return;
    setIsPlaying(false);
    pushUndo();

    const motions: MotionPresetId[] = [
      'push_in',
      'pan_right',
      'pull_out',
      'pan_left',
      'breathe',
      'tilt_up',
    ];
    const transitions = [
      'zoom_flow',
      'light_leak',
      'focus_pull',
      'whip_pan_left',
      'zoom_match_out',
      'whip_pan_right',
    ];

    setClips((prev) =>
      prev.map((c, idx) => {
        let nextTrimStart = c.trimStart;
        let nextTrimEnd = c.trimEnd;
        // Trim micro slack at scene joins so pacing stays crisp & never boring!
        if (tightenEdges && c.type === 'video' && c.trimEnd - c.trimStart > 1.8) {
          nextTrimStart = Number((c.trimStart + 0.15).toFixed(2));
          nextTrimEnd = Number((c.trimEnd - 0.15).toFixed(2));
        }
        return {
          ...c,
          trimStart: nextTrimStart,
          trimEnd: nextTrimEnd,
          motionPreset: motions[idx % motions.length],
          transitionId: idx > 0 ? transitions[(idx - 1) % transitions.length] : 'none',
          transitionDuration: 0.45,
        };
      })
    );

    setContinuityAppliedToast(
      isMl
        ? '✅ എല്ലാ സീനുകൾക്കും പ്രൊഫഷണൽ കണ്ടിന്യൂയിറ്റിയും സ്മൂത്ത് കട്ടുകളും ചേർത്തു!'
        : '✅ Auto Continuity Motion & Smooth Scene Transitions Applied!'
    );
    window.setTimeout(() => setContinuityAppliedToast(null), 3500);
  };

  // Add Device Song
  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const probed = await Promise.all(files.map((f) => probeAudioFile(f)));
    pushUndo();

    const newAudio: AudioTimelineItem[] = probed.map((item, idx) => ({
      id: `aud_${Date.now()}_${idx}`,
      kind: 'music',
      name: files[idx].name.replace(/\.[^.]+$/, '').slice(0, 24),
      url: item.url,
      startTime: Number(playhead.toFixed(2)),
      duration: Math.max(0.5, item.duration),
      trimStart: 0,
      volume: 0.72,
      trackIndex: activeAudioTrackIdx,
    }));

    setAudioItems((prev) => [...prev, ...newAudio]);
    if (newAudio[0]) setSelectedAudioId(newAudio[0].id);
    setBottomTray(null);
    e.target.value = '';
  };

  // Add 1 of 24 Free Built-in Background Music Tracks
  const handleAddFreeMusic = async (track: FreeMusicTrack) => {
    setLoadingMusicId(track.id);
    try {
      const { url, duration } = await renderFreeMusicToWavUrl(track);
      pushUndo();
      const item: AudioTimelineItem = {
        id: `bgm_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        kind: 'music',
        name: track.name,
        url,
        startTime: Number(playhead.toFixed(2)),
        duration,
        trimStart: 0,
        volume: 0.68,
        trackIndex: activeAudioTrackIdx,
      };
      setAudioItems((prev) => [...prev, item]);
      setSelectedAudioId(item.id);
      void previewFreeMusic(track);
    } finally {
      setLoadingMusicId(null);
    }
  };

  // Synthesize & Add any of 12,000+ Pro Music Tracks to Audio Track A1
  const handleAddProMusicItem = async (item: ProCatalogItem) => {
    setLoadingMusicId(item.id);
    try {
      const synthTrack: FreeMusicTrack = {
        id: item.id,
        name: item.name,
        category: 'Cinema & Drama',
        bpm: item.bpm || 96,
        durationSec: 12,
        rootFreq: item.freq || 130,
        scaleIntervals: [0, 3, 5, 7, 10, 12],
        mood: 'warm',
      };
      const { url, duration } = await renderFreeMusicToWavUrl(synthTrack);
      pushUndo();
      const audItem: AudioTimelineItem = {
        id: `pmus_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        kind: 'music',
        name: item.name,
        url,
        startTime: Number(playheadRef.current.toFixed(2)),
        duration,
        trimStart: 0,
        volume: 0.72,
        trackIndex: activeAudioTrackIdx,
      };
      setAudioItems((prev) => [...prev, audItem]);
      setSelectedAudioId(audItem.id);
      void previewFreeMusic(synthTrack);
    } finally {
      setLoadingMusicId(null);
    }
  };

  // Add 1 of 12,000+ SFX
  const handleAddSfxToTimeline = async (sfx: SfxDefinition) => {
    setLoadingSfxId(sfx.id);
    try {
      const { url, duration } = await renderSfxToWavUrl(sfx);
      pushUndo();
      const targetSfxTrack = Math.min(Math.max(1, activeAudioTrackIdx), extraAudioTrackCount - 1);
      const item: AudioTimelineItem = {
        id: `sfx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        kind: 'sfx',
        name: sfx.name,
        url,
        startTime: Number(playheadRef.current.toFixed(2)),
        duration,
        trimStart: 0,
        volume: 0.9,
        trackIndex: targetSfxTrack,
      };
      setAudioItems((prev) => [...prev, item]);
      setSelectedAudioId(item.id);
      void previewSfx(sfx);
    } finally {
      setLoadingSfxId(null);
    }
  };

  // Synthesize & Add any of 12,000+ Pro SFX items (Gunshots, Sword, Booms, Sirens)
  const buildSfxDefFromCatalog = (item: ProCatalogItem): SfxDefinition => {
    const validRecipes: Array<SfxDefinition['recipe']> = [
      'whoosh', 'boom', 'riser', 'glitch', 'pop', 'thunder', 'laser', 'chime', 'heartbeat', 'siren',
    ];
    const recipe = validRecipes.includes(item.engineId as SfxDefinition['recipe'])
      ? (item.engineId as SfxDefinition['recipe'])
      : 'boom';
    return {
      id: item.id,
      name: item.name,
      category: 'Foley & Action',
      durationSec: recipe === 'boom' || recipe === 'thunder' ? 1.15 : 0.75,
      recipe,
      baseFreq: item.freq || 140,
      endFreq: Math.max(40, (item.freq || 140) * 1.6),
      noiseMix: recipe === 'whoosh' || recipe === 'thunder' ? 0.72 : 0.4,
    };
  };

  const handleAddProSfxItem = async (item: ProCatalogItem) => {
    const sfx = buildSfxDefFromCatalog(item);
    await handleAddSfxToTimeline(sfx);
  };

  // Live Microphone Voiceover
  const startVoiceRecording = async () => {
    setVoiceRecError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      const chunks: BlobPart[] = [];
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      voiceStartTimeRef.current = playhead;

      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const dur = Math.max(0.6, voiceRecSec || 2);
        pushUndo();
        const targetVoiceTrack = Math.min(Math.max(1, activeAudioTrackIdx), extraAudioTrackCount - 1);
        const item: AudioTimelineItem = {
          id: `rec_${Date.now()}`,
          kind: 'voice',
          name: isMl ? 'വോയിസ്' : 'Voice',
          url,
          startTime: Number(voiceStartTimeRef.current.toFixed(2)),
          duration: dur,
          trimStart: 0,
          volume: 1,
          trackIndex: targetVoiceTrack,
        };
        setAudioItems((prev) => [...prev, item]);
        setSelectedAudioId(item.id);
        stream.getTracks().forEach((t) => t.stop());
        voiceStreamRef.current = null;
        setBottomTray(null);
      };

      rec.start(200);
      setVoiceRecSec(0);
      setIsRecordingVoice(true);
      if (clips.length > 0) setIsPlaying(true);

      const startedAt = performance.now();
      voiceTimerRef.current = window.setInterval(() => {
        setVoiceRecSec(Number(((performance.now() - startedAt) / 1000).toFixed(1)));
      }, 100);
    } catch (err: any) {
      setVoiceRecError(
        isMl ? 'മൈക്രോഫോൺ പെർമിഷൻ അനുവദിക്കൂ.' : err?.message || 'Microphone access denied.'
      );
    }
  };

  const stopVoiceRecording = () => {
    if (voiceTimerRef.current) {
      window.clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    setIsRecordingVoice(false);
    setIsPlaying(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Instant Live Pro Title / Caption Creation (supports Premiere Type Tool direct placement!)
  const createOrOpenTextLayer = (
    kind: 'text' | 'caption',
    customPos?: { x: number; y: number },
    forceNew = false
  ) => {
    setIsPlaying(false);
    const curT = playheadRef.current;
    if (!forceNew && !customPos) {
      const existing = layers.find(
        (l) => l.kind === kind && curT >= l.startTime && curT <= l.startTime + l.duration
      );
      if (existing) {
        setSelectedLayerId(existing.id);
        setSelectedClipId(null);
        setSelectedAudioId(null);
        setBottomTray(kind === 'caption' ? 'captions' : 'text');
        return;
      }
    }

    pushUndo();
    const ly: LayerItem = {
      id: `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      kind,
      templateId: kind === 'caption' ? 'minimal_whisper' : 'lower_third',
      name: kind === 'caption' ? 'Captions' : isMl ? 'ടൈറ്റിൽ' : 'Title',
      text:
        kind === 'caption'
          ? isMl
            ? 'സംഭാഷണം / സബ്ടൈറ്റിൽ'
            : 'Dialogue caption here'
          : isMl
          ? 'സിനിമ ടൈറ്റിൽ'
          : 'DIRECTOR CUT',
      subtitle: kind === 'caption' ? '' : isMl ? 'സീൻ 01 · കൊച്ചി' : 'SCENE 01 · KOCHI',
      startTime: Number(curT.toFixed(1)),
      duration: Math.max(2.5, Math.min(5, totalDuration - curT || 4)),
      position: kind === 'caption' ? 'bottom' : 'center',
      posX: customPos ? Number(customPos.x.toFixed(3)) : 0.5,
      posY: customPos ? Number(customPos.y.toFixed(3)) : kind === 'caption' ? 0.87 : 0.78,
      scale: 1,
      rotation: 0,
      fontStyle: kind === 'caption' ? 'bold' : 'cinema',
      color: kind === 'caption' ? '#ffffff' : '#f59e0b',
      fontSize: kind === 'caption' ? 36 : 46,
      opacity: 1,
    };
    setLayers((prev) => [...prev, ly]);
    setSelectedLayerId(ly.id);
    setSelectedClipId(null);
    setSelectedAudioId(null);
    setBottomTray(kind === 'caption' ? 'captions' : 'text');
  };

  const handleAddSticker = (emoji: string) => {
    setIsPlaying(false);
    pushUndo();
    const ly: LayerItem = {
      id: `stk_${Date.now()}`,
      kind: 'sticker',
      name: emoji,
      text: emoji,
      startTime: Number(playheadRef.current.toFixed(1)),
      duration: 3.5,
      position: 'center',
      posX: 0.5,
      posY: 0.5,
      scale: 1,
      rotation: 0,
      fontStyle: 'bold',
      color: '#ffffff',
      fontSize: 52,
      opacity: 1,
    };
    setLayers((prev) => [...prev, ly]);
    setSelectedLayerId(ly.id);
    setSelectedClipId(null);
    setSelectedAudioId(null);
  };

  const handleAddImageLayer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const probed = await probeMediaFile(file);
    pushUndo();
    const ly: LayerItem = {
      id: `imgly_${Date.now()}`,
      kind: 'image',
      name: file.name.slice(0, 16),
      imageUrl: probed.url,
      startTime: Number(playheadRef.current.toFixed(1)),
      duration: 4.5,
      position: 'center',
      posX: 0.5,
      posY: 0.5,
      scale: 1,
      rotation: 0,
      fontStyle: 'bold',
      color: '#ffffff',
      fontSize: 44,
      opacity: 1,
    };
    setLayers((prev) => [...prev, ly]);
    setSelectedLayerId(ly.id);
    setSelectedClipId(null);
    setSelectedAudioId(null);
    e.target.value = '';
  };

  const didDragVfxRef = useRef<boolean>(false);

  // Interactive Canvas Doodle Drawing + Premiere Pro Direct Text/Layer/VFX Drag Positioning
  const getCanvasNormPoint = (
    clientX: number,
    clientY: number,
    canvasEl?: HTMLCanvasElement | null
  ) => {
    const c = canvasEl || previewCanvasRef.current || studioCanvasRef.current;
    if (!c) return { x: 0.5, y: 0.5 };
    const r = c.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width))),
      y: Math.max(0, Math.min(1, (clientY - r.top) / Math.max(1, r.height))),
    };
  };

  const snapCoord = (v: number) => (Math.abs(v - 0.5) < 0.025 ? 0.5 : Number(v.toFixed(3)));

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasNormPoint(e.clientX, e.clientY, e.currentTarget);
    didDragVfxRef.current = false;

    if (bottomTray === 'doodles') {
      setIsPlaying(false);
      setIsDrawingDoodle(true);

      const targetId = activeDoodleLayerIdRef.current;
      const existing = layers.find((l) => l.kind === 'doodle' && l.id === targetId);
      if (!existing) {
        pushUndo();
        const newLayer: LayerItem = {
          id: `doodle_${Date.now()}`,
          kind: 'doodle',
          name: 'Doodle',
          strokes: [{ points: [pt], color: doodleColor, size: doodleSize }],
          startTime: Number(playheadRef.current.toFixed(1)),
          duration: Math.max(3, Math.min(6, totalDuration - playheadRef.current || 4)),
          position: 'center',
          fontStyle: 'bold',
          color: doodleColor,
          fontSize: doodleSize,
          opacity: 1,
        };
        activeDoodleLayerIdRef.current = newLayer.id;
        setLayers((prev) => [...prev, newLayer]);
        setSelectedLayerId(newLayer.id);
      } else {
        setLayers((prev) =>
          prev.map((l) =>
            l.id === existing.id
              ? {
                  ...l,
                  strokes: [
                    ...(l.strokes || []),
                    { points: [pt], color: doodleColor, size: doodleSize },
                  ],
                }
              : l
          )
        );
      }
      return;
    }

    // Premiere Type Tool (T): Tap anywhere on Monitor to drop an editable Title right there!
    if (premiereTool === 'type') {
      didDragVfxRef.current = true;
      createOrOpenTextLayer('text', pt, true);
      setPremiereTool('select');
      return;
    }

    // Masking Drag-to-Position on Canvas when Mask Editor Tray is Open
    if (bottomTray === 'masking' && selectedClip?.maskEnabled) {
      setIsPlaying(false);
      setIsDraggingVfxProp(true);
      didDragVfxRef.current = true;
      updateClip(selectedClip.id, { maskX: snapCoord(pt.x), maskY: snapCoord(pt.y) });
      return;
    }

    // Hit-test visible interactive layers (Characters, Gun Smoke/Blood VFX, Text, Captions, Stickers, Images)
    const curT = playheadRef.current;
    const visibleDraggable = layers.filter(
      (l) => l.kind !== 'doodle' && curT >= l.startTime && curT <= l.startTime + l.duration
    );

    const hitLayer =
      visibleDraggable.find((l) => {
        const lProg = Math.max(0, Math.min(1, (curT - l.startTime) / Math.max(0.2, l.duration)));
        const lp = getLayerKeyframeTransform(l, lProg, letterbox);
        return Math.abs(pt.x - lp.x) < 0.18 && Math.abs(pt.y - lp.y) < 0.16;
      }) ||
      (selectedLayer && selectedLayer.kind !== 'doodle' ? selectedLayer : null);

    if (hitLayer) {
      setIsPlaying(false);
      setSelectedLayerId(hitLayer.id);
      setSelectedClipId(null);
      setSelectedAudioId(null);
      setIsDraggingVfxProp(true);
      didDragVfxRef.current = true;
      setLayers((prev) =>
        prev.map((l) =>
          l.id === hitLayer.id ? { ...l, posX: snapCoord(pt.x), posY: snapCoord(pt.y) } : l
        )
      );
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasNormPoint(e.clientX, e.clientY, e.currentTarget);

    if (isDraggingVfxProp && bottomTray === 'masking' && selectedClip?.maskEnabled) {
      didDragVfxRef.current = true;
      updateClip(selectedClip.id, { maskX: snapCoord(pt.x), maskY: snapCoord(pt.y) });
      return;
    }

    if (isDraggingVfxProp && selectedLayer && selectedLayer.kind !== 'doodle') {
      didDragVfxRef.current = true;
      setLayers((prev) =>
        prev.map((l) =>
          l.id === selectedLayer.id ? { ...l, posX: snapCoord(pt.x), posY: snapCoord(pt.y) } : l
        )
      );
      return;
    }

    if (!isDrawingDoodle || bottomTray !== 'doodles') return;
    const id = activeDoodleLayerIdRef.current;
    if (!id) return;
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== id || !l.strokes || l.strokes.length === 0) return l;
        const copy = [...l.strokes];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = { ...last, points: [...last.points, pt] };
        return { ...l, strokes: copy };
      })
    );
  };

  const handleCanvasPointerUp = () => {
    if (isDrawingDoodle) setIsDrawingDoodle(false);
    if (isDraggingVfxProp) setIsDraggingVfxProp(false);
  };

  const handlePlaceActionVfx = (preset: ActionVfxPreset) => {
    pushUndo();
    const startT = Number(Math.max(0, playheadRef.current).toFixed(2));
    const isBullet = preset.vfxType === 'bullet_tracer';
    const newLayer: LayerItem = {
      id: `vfxp_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      kind: 'vfx_prop',
      name: preset.name,
      vfxPresetId: preset.id,
      vfxType: preset.vfxType,
      vfxSeed: preset.seed,
      posX: isBullet ? 0.25 : 0.5,
      posY: 0.5,
      scale: preset.defaultScale,
      rotation: 0,
      blendMode: preset.defaultBlend,
      density: preset.density,
      hueShift: preset.hueShift,
      startTime: startT,
      duration: isBullet ? 0.75 : Math.max(1.5, Math.min(4.5, Math.max(2, totalDuration - startT))),
      position: 'center',
      fontStyle: 'bold',
      color: '#ef4444',
      fontSize: 32,
      opacity: 0.96,
      trackIndex: 0,
      graphEnabled: isBullet,
      graphCurve: isBullet ? 'bullet_snap' : 'ease_in_out',
      graphCp1y: 0.15,
      graphCp2y: 0.92,
      kfStartX: isBullet ? 0.22 : 0.5,
      kfStartY: 0.5,
      kfEndX: isBullet ? 0.82 : 0.5,
      kfEndY: 0.5,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setSelectedClipId(null);
    setSelectedAudioId(null);
    setContinuityAppliedToast(
      isMl
        ? `✅ "${preset.name}" സ്ക്രീനിൽ വെച്ചു! വിരൽ വെച്ച് വലിച്ച് പൊസിഷൻ ക്രമീകരിക്കാം`
        : `✅ Placed "${preset.name}"! Drag directly on video to aim`
    );
    window.setTimeout(() => setContinuityAppliedToast(null), 3000);
  };

  // Poseable Cinema Character Add + Flip Left/Right
  const handleAddCharacter = (
    archetype: CharacterArchetype,
    labelName?: string,
    suitColor = '#18181b',
    accentColor = '#f59e0b',
    flipH = false
  ) => {
    setIsPlaying(false);
    pushUndo();
    const startT = Number(Math.max(0, playheadRef.current).toFixed(2));
    const ly: LayerItem = {
      id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      kind: 'character',
      characterArchetype: archetype,
      name: labelName || archetype.replace(/_/g, ' ').toUpperCase(),
      posX: flipH ? 0.75 : 0.25,
      posY: 0.56,
      scale: 1.05,
      rotation: 0,
      flipH,
      suitColor,
      accentColor,
      startTime: startT,
      duration: Math.max(3, Math.min(6, totalDuration - startT || 4.5)),
      position: 'center',
      fontStyle: 'bold',
      color: accentColor,
      fontSize: 32,
      opacity: 1,
      graphEnabled: false,
      graphCurve: 'pendulum_walk',
      graphCp1y: 0.2,
      graphCp2y: 0.85,
      kfStartX: flipH ? 0.78 : 0.22,
      kfStartY: 0.56,
      kfEndX: flipH ? 0.58 : 0.42,
      kfEndY: 0.56,
    };
    setLayers((prev) => [...prev, ly]);
    setSelectedLayerId(ly.id);
    setSelectedClipId(null);
    setSelectedAudioId(null);
    setBottomTray('character');
    window.requestAnimationFrame(() => drawPreviewAt(startT + 0.05));
  };

  // 1-Tap Hollywood Shoot Choreography: Shooter Hero + Villain Target + Muzzle Flash + Graph Flying Bullet -> Body Blood Hit!
  const handleCreateShootScene = () => {
    setIsPlaying(false);
    pushUndo();
    setAspectRatio('16:9');
    let startT = Number(Math.max(0, playheadRef.current).toFixed(2));

    if (clips.length === 0) {
      const bgClip: TimelineClip = {
        id: `clip_shoot_${Date.now()}`,
        type: 'color',
        name: '16:9 Action Stage',
        url: '',
        colorHex: '#0b0e17',
        mediaDuration: 6,
        trimStart: 0,
        trimEnd: 6,
        speed: 1,
        volume: 0,
        filterId: 'none',
        vfxId: 'none',
        vfxIntensity: 100,
        motionPreset: 'push_in',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        vignette: 32,
        rotation: 0,
        flipH: false,
        fitMode: 'cover',
        transitionId: 'none',
        transitionDuration: 0.45,
      };
      setClips([bgClip]);
      setSelectedClipId(bgClip.id);
      startT = 0;
    }

    const baseId = Date.now();
    const shooter: LayerItem = {
      id: `char_hero_${baseId}`,
      kind: 'character',
      characterArchetype: 'shooter_pistol',
      name: 'Hero Shooter',
      posX: 0.2,
      posY: 0.56,
      scale: 1.1,
      rotation: 0,
      flipH: false,
      suitColor: '#0f172a',
      accentColor: '#38bdf8',
      startTime: startT,
      duration: 4,
      position: 'center',
      fontStyle: 'bold',
      color: '#38bdf8',
      fontSize: 32,
      opacity: 1,
    };

    const targetChar: LayerItem = {
      id: `char_target_${baseId}`,
      kind: 'character',
      characterArchetype: 'villain_target',
      name: 'Villain Target',
      posX: 0.78,
      posY: 0.56,
      scale: 1.1,
      rotation: 0,
      flipH: true,
      suitColor: '#3f1d28',
      accentColor: '#ef4444',
      startTime: startT,
      duration: 4,
      position: 'center',
      fontStyle: 'bold',
      color: '#ef4444',
      fontSize: 32,
      opacity: 1,
      graphEnabled: true,
      graphCurve: 'recoil_kick',
      kfStartX: 0.78,
      kfStartY: 0.56,
      kfEndX: 0.84,
      kfEndY: 0.58,
      kfEndRotation: 14,
    };

    const flashVfx: LayerItem = {
      id: `vfx_flash_${baseId}`,
      kind: 'vfx_prop',
      name: 'Muzzle Flash + Fire',
      vfxType: 'muzzle_flash',
      vfxSeed: 404,
      posX: 0.29,
      posY: 0.49,
      scale: 0.9,
      rotation: 0,
      blendMode: 'screen',
      density: 1.4,
      hueShift: 0,
      startTime: startT,
      duration: 0.45,
      position: 'center',
      fontStyle: 'bold',
      color: '#f59e0b',
      fontSize: 32,
      opacity: 0.98,
      trackIndex: 0,
    };

    const smokeVfx: LayerItem = {
      id: `vfx_smoke_${baseId}`,
      kind: 'vfx_prop',
      name: 'Gun Barrel Smoke',
      vfxType: 'gun_smoke',
      vfxSeed: 707,
      posX: 0.30,
      posY: 0.48,
      scale: 0.85,
      rotation: 0,
      blendMode: 'screen',
      density: 1.3,
      hueShift: 0,
      startTime: Number((startT + 0.08).toFixed(2)),
      duration: 2.4,
      position: 'center',
      fontStyle: 'bold',
      color: '#d4d4d8',
      fontSize: 32,
      opacity: 0.88,
      trackIndex: 0,
    };

    const bulletVfx: LayerItem = {
      id: `vfx_bullet_${baseId}`,
      kind: 'vfx_prop',
      name: 'Flying Bullet (Graph A->B)',
      vfxType: 'bullet_tracer',
      vfxSeed: 909,
      posX: 0.30,
      posY: 0.49,
      scale: 0.95,
      rotation: 0,
      blendMode: 'source-over',
      density: 1.4,
      hueShift: 0,
      startTime: Number((startT + 0.05).toFixed(2)),
      duration: 0.55,
      position: 'center',
      fontStyle: 'bold',
      color: '#fbbf24',
      fontSize: 32,
      opacity: 1,
      trackIndex: 0,
      graphEnabled: true,
      graphCurve: 'bullet_snap',
      graphCp1y: 0.1,
      graphCp2y: 0.95,
      kfStartX: 0.30,
      kfStartY: 0.49,
      kfEndX: 0.75,
      kfEndY: 0.49,
    };

    const hitBloodVfx: LayerItem = {
      id: `vfx_hitblood_${baseId}`,
      kind: 'vfx_prop',
      name: 'Bullet Hit Body Blood',
      vfxType: 'bullet_hit_body',
      vfxSeed: 666,
      posX: 0.76,
      posY: 0.49,
      scale: 1.1,
      rotation: 0,
      blendMode: 'source-over',
      density: 1.6,
      hueShift: 0,
      startTime: Number((startT + 0.48).toFixed(2)),
      duration: 2.2,
      position: 'center',
      fontStyle: 'bold',
      color: '#dc2626',
      fontSize: 32,
      opacity: 0.96,
      trackIndex: 0,
    };

    setLayers((prev) => [...prev, shooter, targetChar, flashVfx, smokeVfx, bulletVfx, hitBloodVfx]);
    setSelectedLayerId(bulletVfx.id);
    setSelectedClipId(null);
    setSelectedAudioId(null);
    setContinuityAppliedToast(
      isMl
        ? '🎬 ഷൂട്ട് സീൻ റെഡി! തോക്ക് -> ബുള്ളറ്റ് -> ബോഡി ബ്ലഡ് ഇഫക്റ്റ് പ്ലേ ചെയ്യുന്നു!'
        : '🎬 Action Shoot Choreography Created: Muzzle Flash -> Flying Bullet -> Blood Impact!'
    );
    window.setTimeout(() => setContinuityAppliedToast(null), 3500);
    window.setTimeout(() => {
      seekAndDraw(startT);
      setIsPlaying(true);
    }, 140);
  };

  const handleSaveProject = () => {
    try {
      const payload = {
        projectName,
        aspectRatio,
        savedAt: new Date().toISOString(),
        clipCount: clips.length,
        layerCount: layers.length,
        audioCount: audioItems.length,
      };
      localStorage.setItem('cinestoryboard_saved_project_meta', JSON.stringify(payload));
      setContinuityAppliedToast(
        isMl ? '💾 പ്രോജക്റ്റ് സേവ് ചെയ്തു!' : '💾 Project Saved!'
      );
      window.setTimeout(() => setContinuityAppliedToast(null), 2600);
    } catch {}
    setShowFileMenu(false);
  };

  // Cut / Split Active Clip cleanly at White Needle with Continuity Transition
  const handleSplitAtPlayhead = () => {
    const idx = findPlacementIndexAt(playhead);
    if (idx < 0) return;
    const p = placements[idx];
    const minSlice = 0.25;
    if (playhead - p.startTime < minSlice || p.endTime - playhead < minSlice) return;

    pushUndo();
    const splitPoint = Number((p.clip.trimStart + (playhead - p.startTime) * p.clip.speed).toFixed(2));
    const partA: TimelineClip = { ...p.clip, trimEnd: splitPoint };
    const partB: TimelineClip = {
      ...p.clip,
      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${p.clip.name} (2)`,
      trimStart: splitPoint,
      transitionId: 'zoom_flow',
      transitionDuration: 0.4,
      motionPreset: p.clip.motionPreset === 'push_in' ? 'pull_out' : 'push_in',
    };

    setClips((prev) => {
      const next = [...prev];
      next.splice(idx, 1, partA, partB);
      return next;
    });
    setSelectedClipId(partB.id);
    setSelectedLayerId(null);
    setSelectedAudioId(null);
  };

  const updateClip = (clipId: string, patch: Partial<TimelineClip>) => {
    setClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, ...patch } : c)));
    window.requestAnimationFrame(() => {
      drawPreviewAt(playheadRef.current);
    });
  };

  const playTemporaryPreview = useCallback(
    (durationMs = 2200) => {
      if (previewAnimRef.current) {
        cancelAnimationFrame(previewAnimRef.current);
        previewAnimRef.current = null;
      }
      const startTs = performance.now();
      const baseT = playheadRef.current;
      const loop = (now: number) => {
        const elapsedMs = now - startTs;
        if (elapsedMs >= durationMs) {
          drawPreviewAt(baseT);
          previewAnimRef.current = null;
          return;
        }
        const virtualTime = baseT + elapsedMs / 1000;
        drawPreviewAt(virtualTime);
        previewAnimRef.current = requestAnimationFrame(loop);
      };
      previewAnimRef.current = requestAnimationFrame(loop);
    },
    [drawPreviewAt]
  );

  const handleApplyVfx = (vfxId: string) => {
    const targetClip =
      selectedClip ||
      (placements.length > 0 ? placements[findPlacementIndexAt(playheadRef.current)]?.clip : null) ||
      clips[0];
    if (!targetClip) return;
    pushUndo();
    updateClip(targetClip.id, { vfxId });
    if (!isPlaying) {
      playTemporaryPreview(2200);
    } else {
      drawPreviewAt(playheadRef.current);
    }
  };

  const handleUpdateVfxIntensity = (val: number) => {
    const targetClip =
      selectedClip ||
      (placements.length > 0 ? placements[findPlacementIndexAt(playheadRef.current)]?.clip : null) ||
      clips[0];
    if (!targetClip) return;
    updateClip(targetClip.id, { vfxIntensity: val });
  };

  const handleApplyFilter = (filterId: string) => {
    const targetClip =
      selectedClip ||
      (placements.length > 0 ? placements[findPlacementIndexAt(playheadRef.current)]?.clip : null) ||
      clips[0];
    if (!targetClip) return;
    pushUndo();
    updateClip(targetClip.id, { filterId });
    drawPreviewAt(playheadRef.current);
  };

  const handleApplyMotion = (mId: MotionPresetId) => {
    const targetClip =
      selectedClip ||
      (placements.length > 0 ? placements[findPlacementIndexAt(playheadRef.current)]?.clip : null) ||
      clips[0];
    if (!targetClip) return;
    pushUndo();
    updateClip(targetClip.id, { motionPreset: mId });
    if (!isPlaying) {
      playTemporaryPreview(2000);
    }
  };

  const handleApplyTransition = (trId: string) => {
    if (!selectedTransitionClip) return;
    pushUndo();
    updateClip(selectedTransitionClip.id, { transitionId: trId });
    const p = placements.find((x) => x.clip.id === selectedTransitionClip.id);
    if (p) {
      seekAndDraw(p.startTime);
      if (!isPlaying) playTemporaryPreview(1600);
    }
  };

  const handleDuplicateClip = (clip: TimelineClip) => {
    pushUndo();
    const idx = clips.findIndex((c) => c.id === clip.id);
    const dup: TimelineClip = {
      ...clip,
      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: `${clip.name} (2)`,
    };
    setClips((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
    setSelectedClipId(dup.id);
  };

  const handleDeleteSelected = () => {
    pushUndo();
    if (selectedLayer) {
      setLayers((prev) => prev.filter((l) => l.id !== selectedLayer.id));
      setSelectedLayerId(null);
      setBottomTray(null);
      return;
    }
    if (selectedAudio) {
      setAudioItems((prev) => prev.filter((a) => a.id !== selectedAudio.id));
      setSelectedAudioId(null);
      setBottomTray(null);
      return;
    }
    if (selectedClip) {
      setClips((prev) => {
        const next = prev.filter((c) => c.id !== selectedClip.id);
        setSelectedClipId(next[0]?.id || null);
        return next;
      });
      setBottomTray(null);
      return;
    }
    if (audioItems.length > 0) {
      const last = audioItems[audioItems.length - 1];
      setAudioItems((prev) => prev.filter((x) => x.id !== last.id));
      setSelectedAudioId(null);
      setBottomTray(null);
      return;
    }
    if (layers.length > 0) {
      const last = layers[layers.length - 1];
      setLayers((prev) => prev.filter((l) => l.id !== last.id));
      setSelectedLayerId(null);
      setBottomTray(null);
      return;
    }
    if (clips.length > 0) {
      const last = clips[clips.length - 1];
      setClips((prev) => prev.filter((c) => c.id !== last.id));
      setSelectedClipId(null);
      setBottomTray(null);
      return;
    }

    setBottomTray(null);
    setContinuityAppliedToast(
      isMl ? '⚠️ ഡിലീറ്റ് ചെയ്യാൻ ക്ലിപ്പുകളോ ഓഡിയോയോ ഇല്ല.' : '⚠️ No items in project to delete.'
    );
    window.setTimeout(() => setContinuityAppliedToast(null), 3000);
  };

  // High-Precision Mobile-Ready 4K Multi-Track Export Engine (requestAnimationFrame + Dual-Video Sync)
  const handleStartExport = async () => {
    if (clips.length === 0 || totalDuration <= 0) return;

    setIsPlaying(false);
    setExportError(null);
    setExportedDownload(null);
    setIsExporting(true);
    setExportProgress(1);
    setExportElapsedSec(0);
    exportAbortRef.current = false;

    const dims = aspectSpec.dims[exportResolution];
    const qualityProfile = QUALITY_TIER_PROFILES[exportResolution];
    const outCanvas = document.createElement('canvas');
    outCanvas.width = dims.width;
    outCanvas.height = dims.height;
    const ctx = outCanvas.getContext('2d', { alpha: false });
    if (!ctx) {
      setExportError('Canvas 2D unavailable.');
      setIsExporting(false);
      return;
    }

    const { mimeType, ext } = pickSupportedRecorderMime(exportFormat);

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();
    const audioDest = audioCtx.createMediaStreamDestination();
    const keepAliveOsc = audioCtx.createOscillator();
    const keepAliveGain = audioCtx.createGain();
    keepAliveGain.gain.value = 0;
    keepAliveOsc.connect(keepAliveGain);
    keepAliveGain.connect(audioDest);
    keepAliveOsc.start();

    const exportVideos = new Map<string, { el: HTMLVideoElement; gain: GainNode }>();
    const exportImages = new Map<string, HTMLImageElement>();
    const exportAudios = new Map<string, { el: HTMLAudioElement; gain: GainNode; item: AudioTimelineItem }>();

    try {
      await audioCtx.resume().catch(() => {});

      const uniqueVideoUrls = Array.from(
        new Set(clips.filter((c) => c.type === 'video' && c.url).map((c) => c.url))
      );
      for (const url of uniqueVideoUrls) {
        const vid = document.createElement('video');
        vid.src = url;
        vid.preload = 'auto';
        vid.playsInline = true;
        vid.crossOrigin = 'anonymous';
        await new Promise<void>((res) => {
          if (vid.readyState >= 2) return res();
          vid.onloadeddata = () => res();
          vid.onerror = () => res();
          window.setTimeout(res, 4000);
        });
        const src = audioCtx.createMediaElementSource(vid);
        const gain = audioCtx.createGain();
        gain.gain.value = 0;
        src.connect(gain);
        gain.connect(audioDest);
        exportVideos.set(url, { el: vid, gain });
      }

      const allImageUrls = [
        ...clips.filter((x) => x.type === 'image' && x.url).map((x) => x.url),
        ...layers.filter((l) => l.kind === 'image' && l.imageUrl).map((l) => l.imageUrl as string),
      ];
      for (const imgUrl of allImageUrls) {
        if (!exportImages.has(imgUrl)) {
          const img = new Image();
          img.src = imgUrl;
          await new Promise<void>((res) => {
            if (img.complete) return res();
            img.onload = () => res();
            img.onerror = () => res();
          });
          exportImages.set(imgUrl, img);
        }
      }

      for (const aItem of audioItems) {
        const aud = new Audio(aItem.url);
        aud.preload = 'auto';
        aud.crossOrigin = 'anonymous';
        await new Promise<void>((res) => {
          aud.oncanplay = () => res();
          aud.onerror = () => res();
          window.setTimeout(res, 2500);
        });
        const src = audioCtx.createMediaElementSource(aud);
        const gain = audioCtx.createGain();
        gain.gain.value = 0;
        src.connect(gain);
        gain.connect(audioDest);
        exportAudios.set(aItem.id, { el: aud, gain, item: aItem });
      }

      const capStream = outCanvas.captureStream(exportFps);
      const capVideoTrack = capStream.getVideoTracks()[0];
      if (capVideoTrack && 'contentHint' in capVideoTrack) {
        try {
          (capVideoTrack as any).contentHint =
            exportResolution === '4k' || exportResolution === '1080p' ? 'detail' : 'motion';
        } catch {}
      }

      const stream = new MediaStream([
        ...capStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ]);

      const recOptions: MediaRecorderOptions = {
        videoBitsPerSecond: qualityProfile.videoBitsPerSecond,
        audioBitsPerSecond: qualityProfile.audioBitsPerSecond,
        bitsPerSecond: qualityProfile.videoBitsPerSecond + qualityProfile.audioBitsPerSecond,
      };
      if (mimeType) recOptions.mimeType = mimeType;
      const recorder = new MediaRecorder(stream, recOptions);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      const stoppedPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
      });

      const getExportSrc = (clip: TimelineClip) =>
        clip.type === 'video'
          ? exportVideos.get(clip.url)?.el || null
          : clip.type === 'image'
          ? exportImages.get(clip.url) || null
          : null;

      // Pre-seek first clip if trimStart > 0
      if (placements[0]?.clip.type === 'video') {
        const firstEntry = exportVideos.get(placements[0].clip.url);
        if (firstEntry) {
          try {
            firstEntry.el.currentTime = placements[0].clip.trimStart;
          } catch {}
        }
      }

      renderCompositeFrame(
        ctx,
        dims.width,
        dims.height,
        0,
        placements[0] || null,
        null,
        getExportSrc,
        layers,
        letterbox,
        (url) => exportImages.get(url) || null,
        null,
        undefined,
        exportResolution
      );

      recorder.start(250);
      const startedAt = performance.now();
      let lastClipId = '';
      let lastFrameDraw = 0;
      const minFrameGapMs = Math.max(10, Math.floor(1000 / exportFps));

      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          if (exportAbortRef.current) return resolve();
          const elapsed = (now - startedAt) / 1000;
          if (elapsed >= totalDuration) {
            setExportProgress(99);
            setExportElapsedSec(totalDuration);
            return resolve();
          }

          if (now - lastFrameDraw < minFrameGapMs - 2) {
            requestAnimationFrame(step);
            return;
          }
          lastFrameDraw = now;

          setExportElapsedSec(elapsed);
          setExportProgress(Math.min(98, Math.round((elapsed / totalDuration) * 100)));
          const idx = placements.findIndex((p) => elapsed >= p.startTime && elapsed < p.endTime);
          const safeIdx = idx >= 0 ? idx : placements.length - 1;
          const activeP = placements[safeIdx] || null;
          const prevP = safeIdx > 0 ? placements[safeIdx - 1] : null;
          const inTransition = Boolean(
            prevP &&
              activeP &&
              activeP.clip.transitionId !== 'none' &&
              elapsed - activeP.startTime < (activeP.clip.transitionDuration || 0.45)
          );

          for (const [url, item] of exportVideos.entries()) {
            const isCurr = activeP?.clip.type === 'video' && activeP.clip.url === url;
            const isOut = inTransition && prevP?.clip.type === 'video' && prevP.clip.url === url;

            if (!isCurr && !isOut) {
              item.gain.gain.value = 0;
              if (!item.el.paused) item.el.pause();
              continue;
            }

            if (isCurr && activeP) {
              const targetLocal =
                activeP.clip.trimStart + (elapsed - activeP.startTime) * activeP.clip.speed;
              item.el.playbackRate = activeP.clip.speed;
              item.gain.gain.value = clipsMuted ? 0 : activeP.clip.volume;
              if (lastClipId !== activeP.clip.id || Math.abs(item.el.currentTime - targetLocal) > 0.25) {
                lastClipId = activeP.clip.id;
                try {
                  item.el.currentTime = targetLocal;
                } catch {}
              }
              if (item.el.paused) item.el.play().catch(() => {});
            } else if (isOut && prevP) {
              item.gain.gain.value = 0;
              if (item.el.paused) item.el.play().catch(() => {});
            }
          }

          for (const entry of exportAudios.values()) {
            const { el, gain, item } = entry;
            const active = elapsed >= item.startTime && elapsed < item.startTime + item.duration;
            if (!active) {
              gain.gain.value = 0;
              if (!el.paused) el.pause();
            } else {
              const elapsedA = elapsed - item.startTime;
              const remainingA = item.duration - elapsedA;
              const edgeFade = Math.min(1, elapsedA / 0.15, remainingA / 0.25);
              gain.gain.value = audioMuted ? 0 : item.volume * edgeFade;
              const targetT = elapsedA + item.trimStart;
              if (Math.abs(el.currentTime - targetT) > 0.25) {
                try {
                  el.currentTime = targetT;
                } catch {}
              }
              if (el.paused) el.play().catch(() => {});
            }
          }

          renderCompositeFrame(
            ctx,
            dims.width,
            dims.height,
            elapsed,
            activeP,
            prevP,
            getExportSrc,
            layers,
            letterbox,
            (url) => exportImages.get(url) || null,
            null,
            undefined,
            exportResolution
          );

          const monCanvas = exportMonitorCanvasRef.current;
          if (monCanvas) {
            const mCtx = monCanvas.getContext('2d');
            if (mCtx) {
              mCtx.drawImage(outCanvas, 0, 0, monCanvas.width, monCanvas.height);
            }
          }

          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });

      if (recorder.state !== 'inactive') recorder.stop();
      const blob = await stoppedPromise;

      if (!exportAbortRef.current && blob.size > 0) {
        const cleanProj = projectName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'CineDirector';
        const fileName = `${cleanProj}_${exportResolution.toUpperCase()}_${dims.width}x${dims.height}_${Date.now()}.${ext}`;
        const url = URL.createObjectURL(blob);
        const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
        setExportedDownload({ url, blob, fileName, sizeMb });
        setExportProgress(100);

        const now = new Date();
        const recId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const record: ExportHistoryRecord = {
          id: recId,
          name: fileName,
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          resolution: `${exportResolution.toUpperCase()} · ${dims.width}×${dims.height}`,
          sizeMb,
          url,
          ext,
        };
        await saveExportBlobToIdb(recId, blob);
        setExportHistory((prev) => {
          const next = [record, ...prev].slice(0, 25);
          try {
            localStorage.setItem(
              EXPORT_HISTORY_KEY,
              JSON.stringify(next.map((x) => ({ ...x, url: '' })))
            );
          } catch {}
          return next;
        });

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      setExportError(err?.message || 'Export failed.');
    } finally {
      for (const item of exportVideos.values()) {
        item.el.pause();
        item.el.src = '';
      }
      for (const item of exportAudios.values()) {
        item.el.pause();
        item.el.src = '';
      }
      try {
        keepAliveOsc.stop();
        await audioCtx.close();
      } catch {}
      setIsExporting(false);
    }
  };

  // Share / Save Directly to Mobile Phone Gallery via Web Share API
  const handleMobileSaveShare = async () => {
    if (!exportedDownload) return;
    try {
      const file = new File([exportedDownload.blob], exportedDownload.fileName, {
        type: exportedDownload.blob.type || 'video/mp4',
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: projectName,
        });
        return;
      }
    } catch {}
    const a = document.createElement('a');
    a.href = exportedDownload.url;
    a.download = exportedDownload.fileName;
    a.click();
  };

  const filteredFilters = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return FILTER_LIBRARY.filter((f) => {
      const catOk = filterCategory === 'All' || f.category === filterCategory;
      const qOk = !q || f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [filterCategory, filterSearch]);

  const proFiltersResult = useMemo(() => {
    const validCat = PRO_FILTER_CATEGORIES.includes(filterCategory) ? filterCategory : 'All';
    return queryProFilters(validCat, filterSearch, filterPage, 36);
  }, [filterCategory, filterSearch, filterPage]);

  const proLutsResult = useMemo(() => {
    return queryProLuts(lutCategory, lutSearch, lutPage, 36);
  }, [lutCategory, lutSearch, lutPage]);

  const actionVfxResult = useMemo(() => {
    return queryActionVfxPresets(actionVfxCat, vfxSearch, actionVfxPage, 36);
  }, [actionVfxCat, vfxSearch, actionVfxPage]);

  const proMotionsResult = useMemo(() => {
    return queryProMotions(motionCat, motionSearch, motionPage, 36);
  }, [motionCat, motionSearch, motionPage]);

  const proTransitionsResult = useMemo(() => {
    return queryProTransitions(transCat, transSearch, transPage, 36);
  }, [transCat, transSearch, transPage]);

  const proTitlesResult = useMemo(() => {
    return queryProTitles(titleCat, titleSearch, titlePage, 36);
  }, [titleCat, titleSearch, titlePage]);

  const proSfxResult = useMemo(() => {
    return queryProSfx(sfxCategory, sfxSearch, sfxPage, 36);
  }, [sfxCategory, sfxSearch, sfxPage]);

  const proMusicResult = useMemo(() => {
    return queryProMusic(musicCategory, musicSearch, musicPage, 36);
  }, [musicCategory, musicSearch, musicPage]);

  const proMasksResult = useMemo(() => {
    return queryProMasks(maskCat, maskSearch, maskPage, 36);
  }, [maskCat, maskSearch, maskPage]);

  const proGraphsResult = useMemo(() => {
    return queryProGraphs(graphCat, graphSearch, graphPage, 36);
  }, [graphCat, graphSearch, graphPage]);

  const proCharsResult = useMemo(() => {
    return queryProCharacters(charCat, charSearch, charPage, 36);
  }, [charCat, charSearch, charPage]);

  const filteredVfx = useMemo(() => {
    const q = vfxSearch.trim().toLowerCase();
    return VFX_LIBRARY.filter((v) => {
      const catOk = vfxCategory === 'All' || v.category === vfxCategory || v.id === 'none';
      const qOk = !q || v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [vfxCategory, vfxSearch]);

  const filteredSfx = useMemo(() => {
    const q = sfxSearch.trim().toLowerCase();
    return SFX_LIBRARY.filter((s) => {
      const catOk = sfxCategory === 'All' || s.category === sfxCategory;
      const qOk = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [sfxCategory, sfxSearch]);

  const filteredMusic = useMemo(() => {
    const q = musicSearch.trim().toLowerCase();
    return FREE_MUSIC_LIBRARY.filter(
      (m) =>
        (musicCategory === 'All' || m.category === musicCategory) &&
        (!q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
    );
  }, [musicCategory, musicSearch]);

  const toolGroups121 = useMemo(
    () => ['All', ...Array.from(new Set(PRO_121_FEATURES.map((t) => t.group)))],
    []
  );

  const filtered121Tools = useMemo(() => {
    const q = toolsSearch.trim().toLowerCase();
    return PRO_121_FEATURES.filter((t) => {
      const grpOk = toolsGroupFilter === 'All' || t.group === toolsGroupFilter;
      const qOk = !q || t.name.toLowerCase().includes(q) || t.group.toLowerCase().includes(q);
      return grpOk && qOk;
    });
  }, [toolsSearch, toolsGroupFilter]);

  const filteredNav121Tools = useMemo(() => {
    if (navCatFilter === 'All') return PRO_121_FEATURES;
    return PRO_121_FEATURES.filter((t) => {
      const g = t.group.toLowerCase();
      if (navCatFilter === 'Masking') return t.target === 'masking';
      if (navCatFilter === 'Characters') return t.target === 'character';
      if (navCatFilter === 'Graph') return t.target === 'graph' || t.target === 'motion';
      if (navCatFilter === 'Action VFX') return t.target === 'vfx' || g.includes('vfx');
      if (navCatFilter === 'Color/LUT') return t.target === 'colorStudio' || t.target === 'chromaStudio' || t.target === 'filters';
      if (navCatFilter === 'Titles') return t.target === 'text' || t.target === 'captions';
      if (navCatFilter === 'Audio') return t.target === 'audio' || t.target === 'sfx' || t.target === 'voice';
      return true;
    });
  }, [navCatFilter]);

  const handleLaunch121Tool = (tool: (typeof PRO_121_FEATURES)[number]) => {
    const lower = tool.name.toLowerCase();
    setBottomTray(null);

    if (lower.includes('selection tool')) {
      setPremiereTool('select');
      return;
    }
    if (lower.includes('razor') || lower.includes('split')) {
      setPremiereTool('razor');
      if (canSplit) handleSplitAtPlayhead();
      return;
    }
    if (lower.includes('type tool')) {
      setPremiereTool('type');
      createOrOpenTextLayer('text', { x: 0.5, y: 0.5 }, true);
      return;
    }
    if (lower.includes('16:9')) {
      setAspectRatio('16:9');
      setAutoPlay16x9(true);
      return;
    }
    if (lower.includes('delete selected') || lower.includes('ripple delete')) {
      handleDeleteSelected();
      return;
    }
    if (lower.includes('duplicate')) {
      if (selectedClip) handleDuplicateClip(selectedClip);
      return;
    }
    if (lower.includes('add video/vfx track')) {
      setExtraVfxTrackCount((c) => Math.min(6, c + 1));
      return;
    }
    if (lower.includes('add audio/music track')) {
      setExtraAudioTrackCount((c) => Math.min(6, c + 1));
      return;
    }
    if (lower.includes('synced shoot')) {
      handleCreateShootScene();
      return;
    }
    if (lower.includes('flip character')) {
      if (selectedLayer && selectedLayer.kind === 'character') {
        setLayers((prev) => prev.map((l) => (l.id === selectedLayer.id ? { ...l, flipH: !l.flipH } : l)));
        setBottomTray('character');
      } else {
        handleAddCharacter('shooter_pistol', 'Flipped Hero', '#0f172a', '#38bdf8', true);
      }
      return;
    }
    if (tool.target === 'masking') {
      setIsPlaying(false);
      if (selectedClip) {
        updateClip(selectedClip.id, {
          maskEnabled: true,
          maskMode: lower.includes('erase') ? 'erase_inside' : 'keep_inside',
          mask2Enabled: lower.includes('nested') || lower.includes('double') ? true : selectedClip.mask2Enabled,
        });
      }
      setBottomTray('masking');
      return;
    }
    if (tool.target === 'character') {
      setIsPlaying(false);
      if (!layers.some((l) => l.kind === 'character')) {
        handleAddCharacter(
          lower.includes('villain') ? 'villain_target' : lower.includes('sword') ? 'sword_warrior' : lower.includes('car') ? 'car_pursuit' : 'shooter_pistol'
        );
      } else {
        setBottomTray('character');
      }
      return;
    }
    if (tool.target === 'graph') {
      setIsPlaying(false);
      if (selectedLayer && selectedLayer.kind !== 'doodle') {
        setLayers((prev) =>
          prev.map((l) => (l.id === selectedLayer.id ? { ...l, graphEnabled: true } : l))
        );
      }
      setBottomTray('graph');
      return;
    }
    if (tool.target === 'colorStudio') {
      setIsPlaying(false);
      setStudioTab(lower.includes('wheel') || lower.includes('lift') || lower.includes('gamma') || lower.includes('gain') ? 'wheels' : 'lumetri');
      setBottomTray('colorStudio');
      return;
    }
    if (tool.target === 'chromaStudio') {
      setIsPlaying(false);
      setStudioTab('chroma');
      setBottomTray('chromaStudio');
      return;
    }
    if (tool.target === 'filters') {
      setIsPlaying(false);
      setStudioTab(lower.includes('lut') || lower.includes('log') || lower.includes('2383') ? 'luts' : 'filters');
      setBottomTray('filters');
      return;
    }
    if (tool.target === 'vfx') {
      setIsPlaying(false);
      setStudioTab('vfx');
      if (lower.includes('bullet')) setActionVfxCat(lower.includes('blood') || lower.includes('entry') ? 'bullet_hit_body' : 'bullet_tracer');
      else if (lower.includes('smoke')) setActionVfxCat('gun_smoke');
      else if (lower.includes('blood')) setActionVfxCat('blood_splatter');
      else if (lower.includes('sword')) setActionVfxCat('sword_slash');
      else if (lower.includes('muzzle')) setActionVfxCat('muzzle_flash');
      setBottomTray('vfx');
      return;
    }
    if (tool.target === 'text') {
      createOrOpenTextLayer('text');
      return;
    }
    if (tool.target === 'captions') {
      createOrOpenTextLayer('caption');
      return;
    }
    setBottomTray(tool.target);
  };

  const canSplit = useMemo(() => {
    const idx = findPlacementIndexAt(playhead);
    if (idx < 0) return false;
    const p = placements[idx];
    return playhead - p.startTime >= 0.25 && p.endTime - playhead >= 0.25;
  }, [findPlacementIndexAt, placements, playhead]);

  const handleTimelineScroll = () => {
    if (isProgrammaticScrollRef.current || isPlaying) return;
    const el = timelineScrollRef.current;
    if (!el || totalDuration <= 0) return;
    const t = Math.max(0, Math.min(totalDuration, el.scrollLeft / PX_PER_SEC));
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      seekAndDraw(t, false);
      scrollRafRef.current = null;
    });
  };

  const cycleResolution = () => {
    const order: ExportResolutionId[] = ['4k', '1080p', '720p', '480p'];
    const idx = order.indexOf(exportResolution);
    setExportResolution(order[(idx + 1) % order.length]);
  };

  const resolutionLabel =
    exportResolution === '4k'
      ? '4K UHD'
      : exportResolution === '1080p'
      ? '1080p HD'
      : exportResolution === '720p'
      ? '720p HD'
      : '480p SD';

  const hasInlineBottomPanel =
    bottomTray !== null &&
    bottomTray !== 'allTools' &&
    bottomTray !== 'projectSetup' &&
    bottomTray !== 'export' &&
    bottomTray !== 'colorStudio' &&
    bottomTray !== 'chromaStudio' &&
    bottomTray !== 'filters' &&
    bottomTray !== 'vfx' &&
    bottomTray !== 'history';

  const isStudioFullscreen =
    bottomTray === 'colorStudio' ||
    bottomTray === 'chromaStudio' ||
    bottomTray === 'filters' ||
    bottomTray === 'vfx';

  return (
    <div className="fixed inset-0 z-50 bg-[#08090c] text-zinc-100 flex flex-col overflow-hidden select-none">
      {/* 1. PREMIERE PRO / DAVINCI RESOLVE TOP STUDIO MENU BAR */}
      <header className="h-14 px-2.5 sm:px-3.5 flex items-center justify-between gap-1.5 bg-[#08090c] border-b border-zinc-900 shrink-0 relative z-40">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onBackToStoryboard();
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-amber-400 hover:text-black border border-zinc-700 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
            title={isMl ? 'എഡിറ്റിംഗ് പൂർത്തിയാക്കി തിരികെ പോകുക' : 'Back to Main Page'}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>{isMl ? 'തിരികെ' : 'Back'}</span>
          </button>

          {/* FILE MENU DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFileMenu((s) => !s)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-1 cursor-pointer ${
                showFileMenu
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:border-zinc-600'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>File</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showFileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowFileMenu(false)}
                />
                <div className="absolute left-0 top-11 z-50 w-60 rounded-2xl bg-[#121520] border border-zinc-700 shadow-2xl p-1.5 space-y-0.5 text-xs">
                  <button
                    type="button"
                    onClick={handleSaveProject}
                    className="w-full px-3 py-2 rounded-xl hover:bg-amber-500 hover:text-black text-left font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isMl ? 'സേവ് ചെയ്യുക (Save Project)' : 'Save Project'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFileMenu(false);
                      mediaFileInputRef.current?.click();
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-zinc-800 text-left font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Video className="w-4 h-4 text-sky-400" />
                    <span>{isMl ? 'വീഡിയോ / ഫോട്ടോ ഇംപോർട്ട്' : 'Import Video / Photo'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFileMenu(false);
                      audioFileInputRef.current?.click();
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-zinc-800 text-left font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Music className="w-4 h-4 text-fuchsia-400" />
                    <span>{isMl ? 'ഓഡിയോ / മ്യൂസിക് ഇംപോർട്ട്' : 'Import Music / Audio'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExtraVfxTrackCount((c) => Math.min(6, c + 1));
                      setShowFileMenu(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-zinc-800 text-left font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4 text-rose-400" />
                    <span>{isMl ? '+ പുതിയ VFX/വീഡിയോ ലൈൻ ചേർക്കൂ' : '+ Add Video / VFX Track Line'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExtraAudioTrackCount((c) => Math.min(6, c + 1));
                      setShowFileMenu(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-zinc-800 text-left font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4 text-emerald-400" />
                    <span>{isMl ? '+ പുതിയ മ്യൂസിക്/ഓഡിയോ ലൈൻ' : '+ Add Audio / Music Track Line'}</span>
                  </button>
                  <div className="border-t border-zinc-800 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowFileMenu(false);
                      setAspectRatio('16:9');
                      setBottomTray('projectSetup');
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-zinc-800 text-left font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4 text-amber-400" />
                    <span>{isMl ? 'പ്രോജക്റ്റ് & 16:9 സെറ്റിംഗ്സ്' : 'Project Settings (16:9)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFileMenu(false);
                      setBottomTray('history');
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-zinc-800 text-left font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <HistoryIcon className="w-4 h-4 text-zinc-300" />
                    <span>{isMl ? 'എക്സ്പോർട്ട് ഹിസ്റ്ററി' : 'Export History'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFileMenu(false);
                      handleCreateBlank16x9Scene();
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-zinc-800 text-left font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Film className="w-4 h-4 text-sky-400" />
                    <span>{isMl ? '+ 16:9 ബ്ലാങ്ക് സീൻ ചേർക്കൂ' : '+ Add 16:9 Cinema Scene'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFileMenu(false);
                      if (clips.length === 0 && layers.length === 0 && audioItems.length === 0) return;
                      pushUndo();
                      setClips([]);
                      setLayers([]);
                      setAudioItems([]);
                      setSelectedClipId(null);
                      setSelectedLayerId(null);
                      setSelectedAudioId(null);
                      setPlayhead(0);
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-red-500/20 text-red-300 text-left font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isMl ? 'എല്ലാം ഡിലീറ്റ് / പുതിയ പ്രോജക്റ്റ്' : 'Clear All / New Project'}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveProject}
            className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold border bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-black flex items-center gap-1 cursor-pointer transition-colors"
            title={isMl ? 'സേവ് ചെയ്യുക' : 'Save Project'}
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isMl ? 'സേവ്' : 'Save'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setBottomTray('allTools');
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold border bg-amber-500/15 border-amber-500/45 text-amber-300 hover:bg-amber-500 hover:text-black flex items-center gap-1 cursor-pointer transition-colors"
            title={isMl ? '121 പ്രോ ടൂളുകൾ തുറക്കുക' : 'Open All 121 Pro Studio Tools'}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{isMl ? '121 ടൂൾ' : '121 Tools'}</span>
          </button>

          <button
            type="button"
            onClick={() => setBottomTray('projectSetup')}
            className="hidden md:flex items-center gap-1 text-sm font-bold text-white hover:text-amber-400 truncate cursor-pointer ml-1"
          >
            <span className="truncate max-w-[140px]">{projectName}</span>
            <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setBottomTray('history');
            }}
            className="px-2 py-1.5 rounded-xl text-xs font-extrabold border bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-amber-500/50 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            title={isMl ? 'എക്സ്പോർട്ട് ഹിസ്റ്ററി' : 'Export History'}
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isMl ? 'ഹിസ്റ്ററി' : 'History'}</span>
            {exportHistory.length > 0 && (
              <span className="px-1 rounded bg-amber-500 text-black text-[9px] font-extrabold">
                {exportHistory.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setAspectRatio('16:9');
              setAutoPlay16x9((v) => !v);
            }}
            className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-extrabold px-2 py-1.5 rounded-xl border cursor-pointer ${
              autoPlay16x9
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
            title={isMl ? '16:9 ഓട്ടോ പ്ലേ ഓൺ/ഓഫ്' : 'Auto 16:9 Play Mode'}
          >
            <Zap className="w-3 h-3" />
            <span>Auto 16:9</span>
          </button>

          <button
            type="button"
            onClick={() => setBottomTray('projectSetup')}
            className={`inline-flex text-[11px] sm:text-xs font-mono font-extrabold px-2 py-1.5 rounded-xl border cursor-pointer ${
              aspectRatio === '16:9'
                ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-200'
            }`}
            title={isMl ? '16:9 ആസ്പെക്റ്റ് റേഷ്യോ' : 'Aspect Ratio'}
          >
            {aspectRatio}
          </button>

          <button
            type="button"
            onClick={cycleResolution}
            className="text-[11px] sm:text-xs font-extrabold tracking-wide text-amber-400 px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer"
            title="Preview & Export Quality"
          >
            {resolutionLabel}
          </button>

          <button
            type="button"
            disabled={clips.length === 0}
            onClick={() => {
              setIsPlaying(false);
              setExportError(null);
              setBottomTray('export');
            }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white hover:bg-amber-400 disabled:opacity-40 text-black font-extrabold text-xs sm:text-sm flex items-center gap-1 cursor-pointer shadow-md transition-colors"
          >
            <span>Export</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Continuity Status Toast */}
      {continuityAppliedToast && (
        <div className="mx-3 mt-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
          {continuityAppliedToast}
        </div>
      )}

      {/* 2. TOP ROUNDED PRO VIDEO PREVIEW CARD */}
      <div className="flex-1 min-h-[34vh] px-3 py-1.5 flex items-center justify-center overflow-hidden">
        <div
          className={`relative bg-[#11131a] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center max-h-full max-w-full ${
            bottomTray === 'doodles' ? 'ring-2 ring-amber-400 cursor-crosshair' : ''
          }`}
          style={{
            aspectRatio: `${aspectSpec.dims['720p'].width} / ${aspectSpec.dims['720p'].height}`,
            height:
              aspectRatio === '9:16' || aspectRatio === '3:4' || aspectRatio === '4:5'
                ? '100%'
                : 'auto',
            width: aspectRatio === '16:9' || aspectRatio === '2.35:1' ? '100%' : 'auto',
            maxHeight: '100%',
            maxWidth: '100%',
          }}
        >
          {clips.length === 0 ? (
            <div className="w-full h-full min-w-[210px] min-h-[210px] p-4 flex flex-col items-center justify-center gap-3 text-center">
              <button
                type="button"
                onClick={() => mediaFileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2.5 cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-full bg-white group-hover:bg-amber-400 text-black flex items-center justify-center shadow-lg transition-colors">
                  {importingMedia ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <Plus className="w-7 h-7" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs sm:text-sm font-extrabold text-white">
                    {isMl
                      ? 'വീഡിയോ / ഫോട്ടോ അപ്ലോഡ് ചെയ്യൂ (ഓട്ടോ 16:9)'
                      : 'Upload Videos or Photos (Auto 16:9)'}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {isMl
                      ? `121 പ്രോ ടൂളുകൾ · 98,000+ എഫക്റ്റുകൾ · 60fps സ്പീഡ്`
                      : `121 Pro Tools · 98,000+ VFX/Filters/Songs · 60fps Engine`}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleCreateBlank16x9Scene}
                className="px-3.5 py-1.5 rounded-full bg-sky-500/20 hover:bg-sky-500 hover:text-black border border-sky-400/50 text-sky-300 text-xs font-extrabold cursor-pointer transition-colors"
              >
                {isMl ? '+ 16:9 സിനിമ സീൻ ഇപ്പോൾ തുടങ്ങൂ' : '+ Start Blank 16:9 Cinema Canvas'}
              </button>
            </div>
          ) : (
            <canvas
              ref={previewCanvasRef}
              width={previewDims.width}
              height={previewDims.height}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
              onClick={() => {
                if (didDragVfxRef.current) {
                  didDragVfxRef.current = false;
                  return;
                }
                if (bottomTray !== 'doodles' && premiereTool !== 'type' && clips.length > 0) {
                  setIsPlaying((p) => !p);
                }
              }}
              className={`w-full h-full object-contain bg-black touch-none ${
                premiereTool === 'type'
                  ? 'cursor-text'
                  : selectedLayer && selectedLayer.kind !== 'doodle'
                  ? 'cursor-grab active:cursor-grabbing'
                  : ''
              }`}
            />
          )}

          {bottomTray === 'doodles' && (
            <div className="absolute top-2 inset-x-2 flex justify-center pointer-events-none">
              <span className="px-2.5 py-0.5 rounded-full bg-black/75 text-amber-300 text-[10px] font-bold border border-amber-400/40">
                {isMl ? 'വീഡിയോയുടെ മുകളിൽ വിരൽകൊണ്ട് വരയ്ക്കൂ' : 'Draw directly on frame'}
              </span>
            </div>
          )}

          {premiereTool === 'type' && bottomTray !== 'doodles' && clips.length > 0 && (
            <div className="absolute top-2 inset-x-2 flex justify-center pointer-events-none">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-extrabold shadow">
                {isMl
                  ? 'ടൈപ്പ് ടൂൾ (T): സ്ക്രീനിൽ എവിടെ വേണമെങ്കിലും തൊട്ട് എഴുതൂ!'
                  : 'Type Tool (T): Tap anywhere on Monitor to drop Title Text'}
              </span>
            </div>
          )}

          {selectedLayer && selectedLayer.kind !== 'doodle' && premiereTool !== 'type' && bottomTray !== 'doodles' && clips.length > 0 && (
            <div className="absolute top-2 inset-x-2 flex justify-center pointer-events-none">
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-950/90 text-amber-300 text-[10px] font-extrabold border border-amber-400/50 flex items-center gap-1 shadow">
                <Crosshair className="w-3 h-3 text-rose-400" />
                <span>
                  {isMl
                    ? `സ്ക്രീനിൽ വിരൽകൊണ്ട് വലിച്ച് "${selectedLayer.name}" നീക്കൂ`
                    : `Drag on Monitor to move: ${selectedLayer.name}`}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. PREMIERE TRANSPORT & TOOL MODE BAR */}
      <div className="h-14 px-2.5 sm:px-3.5 flex items-center justify-between gap-2 bg-[#08090c] shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            disabled={clips.length === 0 && audioItems.length === 0}
            onClick={() => setIsPlaying((p) => !p)}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 disabled:opacity-35 text-white flex items-center justify-center cursor-pointer shadow-md shrink-0"
          >
            {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-white" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />}
          </button>

          {/* Premiere Quick Tool Modes: Select (V), Razor Cut (C), Type on Monitor (T) */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setPremiereTool('select')}
              className={`p-1.5 rounded-lg cursor-pointer ${
                premiereTool === 'select' ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'
              }`}
              title="Selection & Drag Tool (V)"
            >
              <MousePointer className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={!canSplit}
              onClick={() => {
                setPremiereTool('razor');
                if (canSplit) handleSplitAtPlayhead();
              }}
              className={`p-1.5 rounded-lg cursor-pointer disabled:opacity-35 ${
                premiereTool === 'razor' ? 'bg-amber-400 text-black' : 'text-zinc-300 hover:text-white'
              }`}
              title={isMl ? 'റേസർ കട്ട് (C)' : 'Razor Cut at Needle (C)'}
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPremiereTool((m) => (m === 'type' ? 'select' : 'type'))}
              className={`p-1.5 rounded-lg cursor-pointer ${
                premiereTool === 'type' ? 'bg-amber-400 text-black' : 'text-zinc-300 hover:text-white'
              }`}
              title={isMl ? 'സ്ക്രീനിൽ ടെക്സ്റ്റ് ടൈപ്പ് ടൂൾ (T)' : 'Type Text directly on Monitor (T)'}
            >
              <Type className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center leading-tight font-mono">
          <span ref={playheadTimeRef} className="text-sm font-extrabold text-white tabular-nums">
            {formatMmSs(playhead)}
          </span>
          <span className="text-[11px] text-zinc-400 tabular-nums">
            {formatMmSs(totalDuration)}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            disabled={clips.length === 0 && layers.length === 0 && audioItems.length === 0}
            onClick={handleDeleteSelected}
            className="w-9 h-9 rounded-xl bg-red-500/15 hover:bg-red-500 hover:text-white border border-red-500/35 disabled:opacity-30 text-red-300 flex items-center justify-center cursor-pointer"
            title={isMl ? 'തിരഞ്ഞെടുത്തത് ഡിലീറ്റ്' : 'Delete Selected'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={undoStack.length === 0}
            onClick={handleUndo}
            className="w-9 h-9 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 disabled:opacity-30 text-zinc-200 flex items-center justify-center cursor-pointer"
          >
            <Undo2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            disabled={clips.length === 0}
            onClick={() => {
              setIsPlaying(false);
              seekAndDraw(0);
            }}
            className="w-9 h-9 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 flex items-center justify-center cursor-pointer"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            disabled={redoStack.length === 0}
            onClick={handleRedo}
            className="w-9 h-9 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 disabled:opacity-30 text-zinc-200 flex items-center justify-center cursor-pointer"
          >
            <Redo2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* 4A. COLORFUL PREMIERE PRO / DAVINCI MULTI-TRACK TIMELINE OR 4B. LIVE INLINE BOTTOM STUDIO TRAY */}
      {!hasInlineBottomPanel ? (
        <div className="h-[268px] sm:h-[300px] bg-[#0a0b10] border-t border-zinc-800 flex shrink-0 overflow-hidden">
          {/* Left Colorful Premiere/DaVinci Track Headers & "+ Line" Controls */}
          <div className="w-[78px] sm:w-[96px] bg-[#0d0f17] border-r border-zinc-800 flex flex-col justify-between py-1.5 px-1.5 z-30 shrink-0 overflow-y-auto no-scrollbar gap-1.5">
            {/* Titles / Graphics Header */}
            <div className="h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-1.5 flex items-center justify-between text-[10px] font-extrabold text-emerald-300 shrink-0">
              <span className="truncate">T1 Title</span>
              <button
                type="button"
                onClick={() => createOrOpenTextLayer('text')}
                className="w-4 h-4 rounded bg-emerald-500 text-black flex items-center justify-center cursor-pointer"
                title={isMl ? 'ടൈറ്റിൽ ചേർക്കൂ' : 'Add Title'}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Action VFX Tracks Headers (V2, V3...) */}
            {Array.from({ length: extraVfxTrackCount }).map((_, tIdx) => (
              <div
                key={`vfx_hdr_${tIdx}`}
                className="h-8 rounded-lg bg-rose-500/15 border border-rose-500/40 px-1.5 flex items-center justify-between text-[10px] font-extrabold text-rose-300 shrink-0 gap-1"
              >
                <span className="truncate">V{tIdx + 2} VFX</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setStudioTab('vfx');
                      setBottomTray('vfx');
                    }}
                    className="w-4 h-4 rounded bg-rose-500 text-white flex items-center justify-center cursor-pointer"
                    title={isMl ? 'ഗൺ സ്മോക്ക് / ബ്ലഡ് VFX ചേർക്കൂ' : 'Place Action VFX'}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  {tIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        pushUndo();
                        setLayers((prev) =>
                          prev
                            .filter((l) => !(l.kind === 'vfx_prop' && (l.trackIndex ?? 0) === tIdx))
                            .map((l) =>
                              l.kind === 'vfx_prop' && (l.trackIndex ?? 0) > tIdx
                                ? { ...l, trackIndex: (l.trackIndex ?? 0) - 1 }
                                : l
                            )
                        );
                        setExtraVfxTrackCount((c) => Math.max(1, c - 1));
                      }}
                      className="w-4 h-4 rounded bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center cursor-pointer"
                      title={isMl ? 'ലൈൻ ഡിലീറ്റ്' : 'Delete VFX Line'}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* V1 Main Video Track Header */}
            <div className="h-[72px] rounded-lg bg-sky-500/15 border border-sky-400/45 px-1.5 py-1 flex flex-col justify-between text-[10px] font-extrabold text-sky-300 shrink-0">
              <div className="flex items-center justify-between">
                <span>V1 Video</span>
                <button
                  type="button"
                  onClick={() => setClipsMuted((m) => !m)}
                  className="p-0.5 rounded hover:bg-sky-500/20 cursor-pointer"
                  title={clipsMuted ? 'Unmute Video' : 'Mute Video'}
                >
                  {clipsMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-sky-300" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setExtraVfxTrackCount((c) => Math.min(6, c + 1))}
                className="w-full py-0.5 rounded bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400/40 text-[9px] text-rose-200 font-bold cursor-pointer"
              >
                + VFX Line
              </button>
            </div>

            {/* Colorful Audio / Music / SFX Track Headers (A1, A2...) */}
            {Array.from({ length: extraAudioTrackCount }).map((_, aIdx) => {
              const isSelAudioTrk = activeAudioTrackIdx === aIdx;
              const palette =
                aIdx === 0
                  ? 'bg-fuchsia-500/15 border-fuchsia-400/50 text-fuchsia-300'
                  : aIdx === 1
                  ? 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                  : 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300';
              return (
                <div
                  key={`aud_hdr_${aIdx}`}
                  onClick={() => setActiveAudioTrackIdx(aIdx)}
                  className={`h-9 rounded-lg border px-1.5 flex items-center justify-between text-[10px] font-extrabold cursor-pointer shrink-0 gap-1 ${palette} ${
                    isSelAudioTrk ? 'ring-1 ring-white' : ''
                  }`}
                >
                  <span className="truncate">
                    {aIdx === 0 ? 'A1 Music' : aIdx === 1 ? 'A2 SFX' : `A${aIdx + 1} Aud`}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setAudioMuted((m) => !m);
                      }}
                      className="p-0.5 rounded cursor-pointer"
                      title={audioMuted ? 'Unmute Audio' : 'Mute Audio'}
                    >
                      {audioMuted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                    {aIdx >= 2 && (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          pushUndo();
                          setAudioItems((prev) =>
                            prev
                              .filter((x) => (x.trackIndex ?? (x.kind === 'music' ? 0 : 1)) !== aIdx)
                              .map((x) => {
                                const curIdx = x.trackIndex ?? (x.kind === 'music' ? 0 : 1);
                                return curIdx > aIdx ? { ...x, trackIndex: curIdx - 1 } : x;
                              })
                          );
                          setActiveAudioTrackIdx((cur) => Math.max(0, cur >= aIdx ? cur - 1 : cur));
                          setExtraAudioTrackCount((c) => Math.max(2, c - 1));
                        }}
                        className="w-4 h-4 rounded bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center cursor-pointer"
                        title={isMl ? 'ഓഡിയോ ലൈൻ ഡിലീറ്റ്' : 'Delete Audio Line'}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setExtraAudioTrackCount((c) => Math.min(6, c + 1))}
              className="py-1 rounded-lg bg-zinc-800 hover:bg-amber-500 hover:text-black border border-zinc-700 text-[9px] font-extrabold text-zinc-200 cursor-pointer shrink-0"
            >
              + Audio Line
            </button>
          </div>

          {/* Right Scrollable Multi-Track Canvas with Exact Centered White Needle */}
          <div className="relative flex-1 flex overflow-hidden">
            {/* Center White Vertical Playhead Needle */}
            <div
              className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2.5px] bg-white z-20 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.85)]"
            />

            <div
              ref={timelineScrollRef}
              onScroll={handleTimelineScroll}
              className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar relative"
            >
              <div
                className="flex flex-col justify-between gap-1.5 py-1.5 min-h-full"
                style={{
                  paddingLeft: '50%',
                  paddingRight: 'calc(50% + 140px)',
                  width: 'max-content',
                }}
              >
                {/* T1 Titles, Captions, Stickers & Overlay Track */}
                <div className="relative h-8 flex items-center bg-emerald-950/20 rounded-lg border border-emerald-500/15 min-w-[260px]">
                  {layers.filter((l) => l.kind !== 'vfx_prop').length === 0 ? (
                    <button
                      type="button"
                      onClick={() => createOrOpenTextLayer('text')}
                      className="px-3 text-[10px] font-bold text-emerald-300/80 hover:text-emerald-200 cursor-pointer"
                    >
                      {isMl ? '+ സിനിമ ടൈറ്റിൽ / സബ്ടൈറ്റിൽ ചേർക്കൂ' : '+ Add Cinema Title / Caption'}
                    </button>
                  ) : (
                    layers
                      .filter((l) => l.kind !== 'vfx_prop')
                      .map((ly) => {
                        const leftPx = ly.startTime * PX_PER_SEC;
                        const widthPx = Math.max(96, ly.duration * PX_PER_SEC);
                        const isSel = selectedLayerId === ly.id;
                        return (
                          <div
                            key={ly.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedLayerId(ly.id);
                              setSelectedClipId(null);
                              setSelectedAudioId(null);
                              seekAndDraw(ly.startTime + 0.05);
                              if (ly.kind === 'text') setBottomTray('text');
                              else if (ly.kind === 'caption') setBottomTray('captions');
                              else if (ly.kind === 'sticker') setBottomTray('sticker');
                              else if (ly.kind === 'character') setBottomTray('character');
                              else if (ly.kind === 'doodle') {
                                activeDoodleLayerIdRef.current = ly.id;
                                setBottomTray('doodles');
                              }
                            }}
                            style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                            className={`absolute top-0.5 bottom-0.5 rounded-lg pl-2 pr-1 text-xs font-bold flex items-center justify-between gap-1 cursor-pointer border ${
                              isSel
                                ? 'bg-amber-400 text-black border-white'
                                : 'bg-emerald-600/85 text-white border-emerald-300/60'
                            }`}
                          >
                            <span className="truncate">{ly.text || ly.name}</span>
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                pushUndo();
                                setLayers((prev) => prev.filter((x) => x.id !== ly.id));
                                if (selectedLayerId === ly.id) setSelectedLayerId(null);
                              }}
                              className="w-4 h-4 rounded bg-black/45 hover:bg-red-600 text-white flex items-center justify-center shrink-0 cursor-pointer"
                              title={isMl ? 'ഡിലീറ്റ്' : 'Delete Layer'}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Action VFX Tracks (V2, V3... Gun Smoke, Blood Splatter, Sword Slash) */}
                {Array.from({ length: extraVfxTrackCount }).map((_, tIdx) => {
                  const trackProps = layers.filter(
                    (l) => l.kind === 'vfx_prop' && (l.trackIndex ?? 0) === tIdx
                  );
                  return (
                    <div
                      key={`vfx_lane_${tIdx}`}
                      className="relative h-8 flex items-center bg-rose-950/20 rounded-lg border border-rose-500/20 min-w-[260px]"
                    >
                      {trackProps.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlaying(false);
                            setStudioTab('vfx');
                            setBottomTray('vfx');
                          }}
                          className="px-3 text-[10px] font-bold text-rose-300/85 hover:text-rose-200 cursor-pointer flex items-center gap-1"
                        >
                          <Crosshair className="w-3 h-3" />
                          <span>
                            {isMl
                              ? `+ V${tIdx + 2}: ഗൺ സ്മോക്ക് / ബ്ലഡ് VFX വെക്കൂ`
                              : `+ V${tIdx + 2}: Place Gun Smoke / Blood / Sword VFX`}
                          </span>
                        </button>
                      ) : (
                        trackProps.map((ly) => {
                          const leftPx = ly.startTime * PX_PER_SEC;
                          const widthPx = Math.max(106, ly.duration * PX_PER_SEC);
                          const isSel = selectedLayerId === ly.id;
                          return (
                            <div
                              key={ly.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedLayerId(ly.id);
                                setSelectedClipId(null);
                                setSelectedAudioId(null);
                                seekAndDraw(ly.startTime + 0.05);
                                setBottomTray('vfxProp');
                              }}
                              style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                              className={`absolute top-0.5 bottom-0.5 rounded-lg pl-2 pr-1 text-[11px] font-extrabold flex items-center justify-between gap-1 cursor-pointer border ${
                                isSel
                                  ? 'bg-amber-400 text-black border-white ring-1 ring-white'
                                  : 'bg-gradient-to-r from-rose-600 to-orange-600 text-white border-rose-300/70'
                              }`}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                <Crosshair className="w-3 h-3 shrink-0" />
                                <span className="truncate">{ly.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  pushUndo();
                                  setLayers((prev) => prev.filter((x) => x.id !== ly.id));
                                  if (selectedLayerId === ly.id) setSelectedLayerId(null);
                                }}
                                className="w-4 h-4 rounded bg-black/45 hover:bg-red-600 text-white flex items-center justify-center shrink-0 cursor-pointer"
                                title={isMl ? 'ഡിലീറ്റ്' : 'Delete VFX'}
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}

                {/* V1 Vibrant Sky-Blue Video / Photo Filmstrip Track + Transition Joins */}
                <div className="flex items-center gap-1.5 h-[72px] bg-sky-950/20 rounded-xl px-1 border border-sky-500/20 min-w-[260px]">
                  {placements.map(({ clip, startTime, duration }, idx) => {
                    const isSel = selectedClip?.id === clip.id && !selectedLayerId && !selectedAudioId;
                    const widthPx = Math.max(88, Math.round(duration * PX_PER_SEC));
                    return (
                      <React.Fragment key={clip.id}>
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransitionClipId(clip.id);
                              setBottomTray('transitions');
                            }}
                            className={`w-7 h-14 rounded-lg border flex items-center justify-center font-mono text-xs font-black cursor-pointer shrink-0 z-10 ${
                              clip.transitionId !== 'none'
                                ? 'bg-amber-400 text-black border-white shadow'
                                : 'bg-zinc-800 text-zinc-200 border-zinc-600'
                            }`}
                            title={isMl ? 'സീൻ ട്രാൻസിഷൻ' : 'Scene Transition'}
                          >
                            |
                          </button>
                        )}

                        <div
                          onClick={() => {
                            setSelectedClipId(clip.id);
                            setSelectedLayerId(null);
                            setSelectedAudioId(null);
                            if (!isPlaying) seekAndDraw(startTime + 0.05);
                          }}
                          style={{ width: `${widthPx}px` }}
                          className={`h-[64px] rounded-xl overflow-hidden border-2 relative cursor-pointer shrink-0 flex bg-sky-950/60 ${
                            isSel ? 'border-white ring-2 ring-sky-400' : 'border-sky-400/60'
                          }`}
                        >
                          {clip.type === 'color' ? (
                            <div className="w-full h-full" style={{ backgroundColor: clip.colorHex }} />
                          ) : clip.thumbnailUrl ? (
                            <div className="w-full h-full flex overflow-hidden">
                              <img
                                src={clip.thumbnailUrl}
                                alt={clip.name}
                                className="h-full flex-1 object-cover"
                                style={{ filter: buildClipFilterCss(clip) }}
                              />
                              {widthPx > 140 && (
                                <img
                                  src={clip.thumbnailUrl}
                                  alt=""
                                  className="h-full flex-1 object-cover"
                                  style={{ filter: buildClipFilterCss(clip) }}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-sky-900/50 text-xs text-white">
                              {clip.name}
                            </div>
                          )}
                          {clip.motionPreset !== 'none' && (
                            <span className="absolute top-1 left-1 text-[9px] font-mono bg-amber-500 text-black font-extrabold px-1 rounded">
                              CAM
                            </span>
                          )}
                          {clip.vfxId && clip.vfxId !== 'none' && (
                            <span className="absolute top-1 left-10 text-[9px] font-mono bg-rose-600 text-white font-extrabold px-1 rounded">
                              VFX
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              pushUndo();
                              setClips((prev) => {
                                const next = prev.filter((c) => c.id !== clip.id);
                                if (selectedClipId === clip.id) setSelectedClipId(next[0]?.id || null);
                                return next;
                              });
                            }}
                            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/75 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer z-10"
                            title={isMl ? 'ക്ലിപ്പ് ഡിലീറ്റ്' : 'Delete Clip'}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                          <span className="absolute bottom-1 right-1 text-[10px] font-mono bg-black/80 text-white px-1 rounded">
                            {duration.toFixed(1)}s
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => mediaFileInputRef.current?.click()}
                    className="w-12 h-14 ml-1 rounded-xl bg-sky-400 hover:bg-amber-400 text-black flex items-center justify-center shadow-lg cursor-pointer shrink-0 transition-colors"
                    title={isMl ? 'വീഡിയോ / ഫോട്ടോ ചേർക്കുക' : 'Add Video / Photo'}
                  >
                    <Plus className="w-6 h-6 stroke-[2.75]" />
                  </button>
                </div>

                {/* Multiple Colorful Music / Audio / SFX / Voice Lanes (A1, A2, A3...) */}
                {Array.from({ length: extraAudioTrackCount }).map((_, aIdx) => {
                  const trackAudios = audioItems.filter((a) => (a.trackIndex ?? (a.kind === 'music' ? 0 : 1)) === aIdx);
                  const laneBg =
                    aIdx === 0
                      ? 'bg-fuchsia-950/25 border-fuchsia-500/20'
                      : aIdx === 1
                      ? 'bg-amber-950/25 border-amber-500/20'
                      : 'bg-cyan-950/25 border-cyan-500/20';
                  const blockBg =
                    aIdx === 0
                      ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 border-fuchsia-300/60'
                      : aIdx === 1
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 border-amber-300/60'
                      : 'bg-gradient-to-r from-teal-600 to-cyan-600 border-cyan-300/60';
                  return (
                    <div
                      key={`aud_lane_${aIdx}`}
                      className={`relative h-9 flex items-center rounded-lg border min-w-[260px] ${laneBg}`}
                    >
                      {trackAudios.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAudioTrackIdx(aIdx);
                            setBottomTray(aIdx === 1 ? 'sfx' : 'audio');
                          }}
                          className="px-3 text-[10px] font-bold text-zinc-300/85 hover:text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <Music className="w-3.5 h-3.5" />
                          <span>
                            {aIdx === 0
                              ? isMl
                                ? '+ A1: മ്യൂസിക് / ഫോൺ പാട്ട് ചേർക്കൂ'
                                : '+ A1: Add Music / Phone Song'
                              : isMl
                              ? `+ A${aIdx + 1}: സൗണ്ട് എഫക്റ്റ് (SFX) / വോയിസ്`
                              : `+ A${aIdx + 1}: Add SFX / Voiceover`}
                          </span>
                        </button>
                      ) : (
                        trackAudios.map((aud) => {
                          const leftPx = aud.startTime * PX_PER_SEC;
                          const widthPx = Math.max(106, Math.round(aud.duration * PX_PER_SEC));
                          const isSel = selectedAudioId === aud.id;
                          return (
                            <div
                              key={aud.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedAudioId(aud.id);
                                setSelectedClipId(null);
                                setSelectedLayerId(null);
                              }}
                              style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                              className={`absolute top-0.5 bottom-0.5 rounded-lg overflow-hidden pl-2 pr-1 flex items-center justify-between gap-1.5 cursor-pointer border text-white ${
                                isSel ? 'ring-2 ring-white border-white brightness-110' : ''
                              } ${blockBg}`}
                            >
                              <span className="text-[11px] font-bold truncate z-10">{aud.name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="flex items-end gap-[2px] h-3.5 opacity-80">
                                  {[35, 85, 50, 100, 65].map((h, i) => (
                                    <span
                                      key={i}
                                      className="w-[2px] bg-white rounded-full"
                                      style={{ height: `${h}%` }}
                                    />
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    pushUndo();
                                    setAudioItems((prev) => prev.filter((x) => x.id !== aud.id));
                                    if (selectedAudioId === aud.id) setSelectedAudioId(null);
                                  }}
                                  className="w-4 h-4 rounded bg-black/45 hover:bg-red-600 text-white flex items-center justify-center shrink-0 cursor-pointer"
                                  title={isMl ? 'ഡിലീറ്റ്' : 'Delete Audio'}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LIVE BOTTOM TOOL PANEL (Keeps Video Visible Above!) */
        <div className="h-[245px] sm:h-[260px] bg-[#11131b] border-t border-zinc-800 flex flex-col shrink-0">
          <div className="px-3.5 py-2 border-b border-zinc-800 flex items-center justify-between gap-2 bg-[#0d0e14] shrink-0">
            <span className="text-xs font-extrabold text-white truncate">
              {bottomTray === 'masking' && (isMl ? `മാസ്കിംഗ് & ഒബ്ജക്റ്റ് റിമൂവ് (${TOTAL_PRO_MASKS_COUNT.toLocaleString()}+)` : `Pro Masking, Erase & Dual-Mask (${TOTAL_PRO_MASKS_COUNT.toLocaleString()}+)`)}
              {bottomTray === 'graph' && (isMl ? `കീഫ്രെയിം ഗ്രാഫ് & ബെസിയർ മോഷൻ (${TOTAL_PRO_GRAPHS_COUNT.toLocaleString()}+)` : `Keyframe Motion Graph Editor (${TOTAL_PRO_GRAPHS_COUNT.toLocaleString()}+)`)}
              {bottomTray === 'character' && (isMl ? `ആക്ഷൻ ക്യാരക്ടർ സ്റ്റുഡിയോ (${TOTAL_PRO_CHARACTERS_COUNT.toLocaleString()}+)` : `Character & Vehicle Studio (${TOTAL_PRO_CHARACTERS_COUNT.toLocaleString()}+)`)}
              {bottomTray === 'motion' && (isMl ? `ക്യാമറ മോഷൻ (${TOTAL_PRO_MOTIONS_COUNT.toLocaleString()}+)` : `Cinema Camera Motion (${TOTAL_PRO_MOTIONS_COUNT.toLocaleString()}+)`)}
              {bottomTray === 'continuity' && (isMl ? 'സീൻ കണ്ടിന്യൂയിറ്റി & സ്മൂത്ത് കട്ട്' : 'Auto Scene Continuity Engine')}
              {bottomTray === 'vfxProp' && (isMl ? 'ആക്ഷൻ VFX പൊസിഷൻ & ലെവൽ (ബുള്ളറ്റ് / ബ്ലഡ്)' : 'Action VFX Position, Level & Graph')}
              {bottomTray === 'adjust' && (isMl ? 'കളർ, ട്രിം & വോളിയം' : 'Adjust & Micro-Trim')}
              {bottomTray === 'text' && (isMl ? `ടൈറ്റിലുകൾ (${TOTAL_PRO_TITLES_COUNT.toLocaleString()}+ ലൈവ് പ്രിവ്യൂ)` : `Titles & Graphics (${TOTAL_PRO_TITLES_COUNT.toLocaleString()}+)`)}
              {bottomTray === 'captions' && (isMl ? 'സബ്ടൈറ്റിൽ / ക്യാപ്ഷൻ' : 'Captions (Live)')}
              {bottomTray === 'sticker' && (isMl ? 'സ്റ്റിക്കറുകൾ' : 'Stickers')}
              {bottomTray === 'doodles' && (isMl ? 'സ്ക്രീനിൽ വരയ്ക്കൂ' : 'Draw Doodles')}
              {bottomTray === 'cutout' && (isMl ? 'ക്രോപ്പ് / ഫിറ്റ് / റൊട്ടേറ്റ്' : 'Fit, Rotate & Cinema Bars')}
              {bottomTray === 'speed' && (isMl ? 'സ്പീഡ് (0.5x - 2x)' : 'Playback Speed')}
              {bottomTray === 'audio' && (isMl ? `മ്യൂസിക് ലൈബ്രറി (${TOTAL_PRO_MUSIC_COUNT.toLocaleString()}+) & ഫോൺ പാട്ട്` : `Music Library (${TOTAL_PRO_MUSIC_COUNT.toLocaleString()}+) & Phone`)}
              {bottomTray === 'sfx' && (isMl ? `സൗണ്ട് എഫക്റ്റുകൾ (${TOTAL_PRO_SFX_COUNT.toLocaleString()}+)` : `Sound Effects (${TOTAL_PRO_SFX_COUNT.toLocaleString()}+)`)}
              {bottomTray === 'voice' && (isMl ? 'ലൈവ് വോയിസ് റെക്കോർഡ്' : 'Voiceover Recorder')}
              {bottomTray === 'transitions' && (isMl ? `സീൻ ട്രാൻസിഷൻ (${TOTAL_PRO_TRANSITIONS_COUNT.toLocaleString()}+ Effects)` : `Continuity Transitions (${TOTAL_PRO_TRANSITIONS_COUNT.toLocaleString()}+)`)}
            </span>
            <button
              type="button"
              onClick={() => setBottomTray(null)}
              className="px-3 py-1 rounded-full bg-white text-black font-extrabold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isMl ? 'ശരി' : 'Done'}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {/* CONTINUITY ENGINE */}
            {bottomTray === 'continuity' && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {isMl
                    ? 'ഒരു സീനിൽ നിന്നും അടുത്ത സീനിലേക്ക് ബോറടിക്കാതെ സിനിമ പോലെ ഒഴുകിയെത്താൻ — എല്ലാ ക്ലിപ്പുകളിലും ഓട്ടോമാറ്റിക് ക്യാമറ ചലനങ്ങളും (Push/Pan/Pull), സ്മൂത്ത് ട്രാൻസിഷനുകളും (Zoom Flow, Light Leak, Focus Pull) സെറ്റ് ചെയ്യാം.'
                    : 'Make every scene flow seamlessly into the next without boring flat cuts using automatic camera motion presets, smooth Zoom/Light-Leak transitions, and micro-trimmed pacing.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleApplyAutoContinuity(false)}
                    className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isMl
                        ? '✨ ഓട്ടോ കണ്ടിന്യൂയിറ്റി (ക്ലിപ്പുകൾ ഫ്ലോ ആക്കുക)'
                        : 'Apply Auto Cinema Continuity'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyAutoContinuity(true)}
                    className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-300 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>
                      {isMl
                        ? '✂️ ക്ലിപ്പ് അറ്റം ചെറുതായി ട്രിം ചെയ്ത് കണ്ടിന്യൂ ആക്കുക'
                        : 'Tighten Cut Edges + Smooth Continuity'}
                    </span>
                  </button>
                </div>

                {selectedClip && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="text-zinc-400">
                      {isMl ? 'ഈ ക്ലിപ്പിന്റെ അറ്റം:' : 'Selected Clip Trim:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        pushUndo();
                        updateClip(selectedClip.id, {
                          trimStart: Math.min(selectedClip.trimEnd - 0.3, Number((selectedClip.trimStart + 0.25).toFixed(2))),
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 font-mono cursor-pointer"
                    >
                      +0.25s Start Trim
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        pushUndo();
                        updateClip(selectedClip.id, {
                          trimEnd: Math.max(selectedClip.trimStart + 0.3, Number((selectedClip.trimEnd - 0.25).toFixed(2))),
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 font-mono cursor-pointer"
                    >
                      -0.25s Tail Trim
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 12,000+ CAMERA MOTION PRESETS */}
            {bottomTray === 'motion' && selectedClip && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative w-44 shrink-0">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={motionSearch}
                      onChange={(e) => {
                        setMotionSearch(e.target.value);
                        setMotionPage(0);
                      }}
                      placeholder={`Search ${TOTAL_PRO_MOTIONS_COUNT.toLocaleString()} Motions...`}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {PRO_MOTION_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setMotionCat(cat);
                          setMotionPage(0);
                        }}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                          motionCat === cat ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {motionPage === 0 && !motionSearch.trim() && motionCat === 'All' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {MOTION_PRESETS.map((m) => {
                      const active = selectedClip.motionPreset === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleApplyMotion(m.id)}
                          className={`p-2 rounded-xl border text-left cursor-pointer ${
                            active
                              ? 'bg-white text-black border-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                          }`}
                        >
                          <p className="text-xs font-extrabold">{m.name}</p>
                          <p className="text-[10px] opacity-70">{m.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>{proMotionsResult.total.toLocaleString()} Bezier Motion Curves</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={motionPage === 0}
                      onClick={() => setMotionPage((p) => Math.max(0, p - 1))}
                      className="p-1 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-white">P.{motionPage + 1}</span>
                    <button
                      type="button"
                      disabled={(motionPage + 1) * 36 >= proMotionsResult.total}
                      onClick={() => setMotionPage((p) => p + 1)}
                      className="p-1 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {proMotionsResult.items.map((item) => {
                    const active = selectedClip.motionPreset === item.engineId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleApplyMotion((item.engineId as MotionPresetId) || 'push_in')}
                        className={`p-2 rounded-xl border text-left cursor-pointer ${
                          active ? 'bg-amber-500 text-black border-white' : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                        }`}
                      >
                        <p className="text-[11px] font-extrabold truncate">{item.name}</p>
                        <p className="text-[9px] opacity-75 truncate">{item.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ADJUST & TRIM */}
            {bottomTray === 'adjust' && selectedClip && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {[
                    { key: 'trimStart' as const, label: isMl ? 'തുടക്കം കട്ട് (Trim Start)' : 'Trim Start', min: 0, max: Math.max(0.2, selectedClip.trimEnd - 0.3), step: 0.1 },
                    { key: 'trimEnd' as const, label: isMl ? 'അവസാനം കട്ട് (Trim End)' : 'Trim End', min: Math.min(selectedClip.mediaDuration, selectedClip.trimStart + 0.3), max: selectedClip.mediaDuration, step: 0.1 },
                    { key: 'brightness' as const, label: isMl ? 'തെളിച്ചം (Brightness)' : 'Brightness', min: 50, max: 150, step: 1 },
                    { key: 'contrast' as const, label: isMl ? 'കോൺട്രാസ്റ്റ് (Contrast)' : 'Contrast', min: 50, max: 150, step: 1 },
                    { key: 'saturation' as const, label: isMl ? 'കളർ (Saturation)' : 'Saturation', min: 0, max: 200, step: 1 },
                    { key: 'vignette' as const, label: isMl ? 'വിഗ്നെറ്റ് (Vignette)' : 'Vignette', min: 0, max: 80, step: 1 },
                  ].map((s) => (
                    <div key={s.key} className="space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">{s.label}</span>
                        <span className="font-mono text-amber-400">{selectedClip[s.key]}</span>
                      </div>
                      <input
                        type="range"
                        min={s.min}
                        max={s.max}
                        step={s.step}
                        value={selectedClip[s.key]}
                        onChange={(e) => updateClip(selectedClip.id, { [s.key]: Number(e.target.value) })}
                        className="w-full accent-white"
                      />
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-zinc-800 flex justify-end">
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isMl ? 'ഈ ക്ലിപ്പ് ഡിലീറ്റ് ചെയ്യുക' : 'Delete Clip'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 12,000+ ESSENTIAL GRAPHICS TITLES, POS/SCALE/ROTATE & LIVE PREMIERE EDITOR */}
            {(bottomTray === 'text' || bottomTray === 'captions') && (
              <div className="space-y-2.5">
                {!selectedLayer ? (
                  <div className="py-4 flex flex-col items-center gap-2 text-center">
                    <button
                      type="button"
                      onClick={() => createOrOpenTextLayer(bottomTray === 'captions' ? 'caption' : 'text', { x: 0.5, y: 0.5 }, true)}
                      className="px-4 py-2 rounded-full bg-amber-500 text-black font-extrabold text-xs cursor-pointer"
                    >
                      {isMl ? '+ പുതിയ ടെക്സ്റ്റ് ചേർക്കൂ' : '+ Create Title Text on Monitor'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => createOrOpenTextLayer(bottomTray === 'captions' ? 'caption' : 'text', { x: 0.5, y: 0.45 }, true)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-[11px] font-extrabold cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isMl ? 'പുതിയ ടെക്സ്റ്റ്' : 'New Text'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {['#ffffff', '#f59e0b', '#ef4444', '#38bdf8', '#22c55e', '#f472b6'].map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() =>
                              setLayers((prev) =>
                                prev.map((l) => (l.id === selectedLayer.id ? { ...l, color: hex } : l))
                              )
                            }
                            className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                              selectedLayer.color === hex ? 'border-white scale-110' : 'border-zinc-700'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleDeleteSelected}
                        className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isMl ? 'ഡിലീറ്റ്' : 'Delete'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={selectedLayer.text || ''}
                        onChange={(e) =>
                          setLayers((prev) =>
                            prev.map((l) => (l.id === selectedLayer.id ? { ...l, text: e.target.value } : l))
                          )
                        }
                        placeholder={isMl ? 'പ്രധാന ടൈറ്റിൽ എഴുതൂ...' : 'Main headline...'}
                        className="w-full bg-zinc-900 border border-zinc-700 focus:border-white rounded-xl px-3 py-1.5 text-xs sm:text-sm text-white focus:outline-none"
                      />
                      {bottomTray === 'text' && (
                        <input
                          type="text"
                          value={selectedLayer.subtitle || ''}
                          onChange={(e) =>
                            setLayers((prev) =>
                              prev.map((l) => (l.id === selectedLayer.id ? { ...l, subtitle: e.target.value } : l))
                            )
                          }
                          placeholder={isMl ? 'സബ്-ടൈറ്റിൽ (ഓപ്ഷണൽ)...' : 'Subtitle (optional)...'}
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-white rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                        />
                      )}
                    </div>

                    {/* Direct Pos X / Pos Y / Scale / Rotate Controls (Also draggable on screen!) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                      {[
                        { label: 'Pos X', val: Math.round((selectedLayer.posX ?? 0.5) * 100), min: 5, max: 95, step: 1, key: 'posX', mult: 0.01, unit: '%' },
                        { label: 'Pos Y', val: Math.round((selectedLayer.posY ?? 0.5) * 100), min: 5, max: 95, step: 1, key: 'posY', mult: 0.01, unit: '%' },
                        { label: 'Scale', val: Number((selectedLayer.scale ?? 1).toFixed(2)), min: 0.4, max: 2.5, step: 0.05, key: 'scale', mult: 1, unit: 'x' },
                        { label: 'Rotate', val: selectedLayer.rotation ?? 0, min: -180, max: 180, step: 2, key: 'rotation', mult: 1, unit: '°' },
                      ].map((ctrl) => (
                        <div key={ctrl.key} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-zinc-400 font-bold">{ctrl.label}</span>
                            <span className="font-mono text-amber-400">{ctrl.val}{ctrl.unit}</span>
                          </div>
                          <input
                            type="range"
                            min={ctrl.min}
                            max={ctrl.max}
                            step={ctrl.step}
                            value={ctrl.val}
                            onChange={(e) => {
                              const raw = Number(e.target.value) * ctrl.mult;
                              setLayers((prev) =>
                                prev.map((l) => (l.id === selectedLayer.id ? { ...l, [ctrl.key]: raw } : l))
                              );
                            }}
                            className="w-full accent-amber-400"
                          />
                        </div>
                      ))}
                    </div>

                    {bottomTray === 'text' && (
                      <div className="space-y-2 pt-1 border-t border-zinc-800">
                        <div className="flex items-center gap-2">
                          <div className="relative w-40 shrink-0">
                            <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={titleSearch}
                              onChange={(e) => {
                                setTitleSearch(e.target.value);
                                setTitlePage(0);
                              }}
                              placeholder={`Search ${TOTAL_PRO_TITLES_COUNT.toLocaleString()} Styles...`}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-7 pr-2 py-1 text-[11px] text-white"
                            />
                          </div>
                          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                            {PRO_TITLE_CATEGORIES.map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setTitleCat(cat);
                                  setTitlePage(0);
                                }}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                                  titleCat === cat ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {titlePage === 0 && !titleSearch.trim() && titleCat === 'All' && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                            {TITLE_TEMPLATES.map((tpl) => {
                              const active = (selectedLayer.templateId || 'lower_third') === tpl.id;
                              return (
                                <button
                                  key={tpl.id}
                                  type="button"
                                  onClick={() =>
                                    setLayers((prev) =>
                                      prev.map((l) =>
                                        l.id === selectedLayer.id
                                          ? {
                                              ...l,
                                              templateId: tpl.id,
                                              fontStyle: tpl.fontStyle,
                                              position: tpl.defaultPos,
                                              color: tpl.defaultColor,
                                            }
                                          : l
                                      )
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold whitespace-nowrap cursor-pointer shrink-0 ${
                                    active
                                      ? 'bg-white text-black border-white'
                                      : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                                  }`}
                                >
                                  {tpl.name}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span>{proTitlesResult.total.toLocaleString()} Essential Graphics Title Presets</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={titlePage === 0}
                              onClick={() => setTitlePage((p) => Math.max(0, p - 1))}
                              className="p-1 rounded bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-white">P.{titlePage + 1}</span>
                            <button
                              type="button"
                              disabled={(titlePage + 1) * 36 >= proTitlesResult.total}
                              onClick={() => setTitlePage((p) => p + 1)}
                              className="p-1 rounded bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {proTitlesResult.items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                setLayers((prev) =>
                                  prev.map((l) =>
                                    l.id === selectedLayer.id
                                      ? {
                                          ...l,
                                          templateId: (item.engineId as TitleTemplateId) || 'lower_third',
                                          fontStyle: (item.fontStyle as 'bold' | 'cinema' | 'mono') || 'cinema',
                                          color: item.colorHex || '#f59e0b',
                                        }
                                      : l
                                  )
                                )
                              }
                              className="p-2 rounded-xl border border-zinc-800 hover:border-amber-400 bg-zinc-900 text-left cursor-pointer"
                            >
                              <p className="text-[10px] font-extrabold text-white truncate">{item.name}</p>
                              <p className="text-[9px] text-zinc-400 truncate">{item.sub}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* STICKERS */}
            {bottomTray === 'sticker' && (
              <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
                {STICKER_PACK.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleAddSticker(emoji)}
                    className="h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-2xl flex items-center justify-center cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* DOODLES */}
            {bottomTray === 'doodles' && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400">
                  {isMl
                    ? 'മുകളിലെ വീഡിയോ സ്ക്രീനിൽ വിരൽകൊണ്ട് വരയ്ക്കൂ.'
                    : 'Draw directly on the rounded video frame above.'}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {['#f59e0b', '#ffffff', '#ef4444', '#38bdf8', '#22c55e', '#e879f9'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setDoodleColor(hex)}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                          doodleColor === hex ? 'border-white scale-110' : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {[6, 12, 20].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setDoodleSize(sz)}
                        className={`px-2.5 py-1 rounded-lg font-mono font-bold cursor-pointer ${
                          doodleSize === sz ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {sz}px
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const dId = activeDoodleLayerIdRef.current;
                      if (dId) {
                        setLayers((prev) => prev.filter((l) => l.id !== dId));
                        activeDoodleLayerIdRef.current = null;
                      }
                    }}
                    className="ml-auto px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-bold cursor-pointer"
                  >
                    {isMl ? 'മായ്ക്കുക' : 'Clear'}
                  </button>
                </div>
              </div>
            )}

            {/* CUTOUT / ROTATE / FIT / LETTERBOX */}
            {bottomTray === 'cutout' && selectedClip && (
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => updateClip(selectedClip.id, { rotation: (selectedClip.rotation + 90) % 360 })}
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 flex flex-col items-center gap-1.5 text-xs font-bold cursor-pointer"
                >
                  <RotateCw className="w-5 h-5" />
                  <span>{isMl ? 'റൊട്ടേറ്റ്' : 'Rotate'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateClip(selectedClip.id, { flipH: !selectedClip.flipH })}
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 flex flex-col items-center gap-1.5 text-xs font-bold cursor-pointer"
                >
                  <FlipHorizontal className="w-5 h-5" />
                  <span>{isMl ? 'മിറർ' : 'Mirror'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateClip(selectedClip.id, {
                      fitMode: selectedClip.fitMode === 'cover' ? 'contain' : 'cover',
                    })
                  }
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 flex flex-col items-center gap-1.5 text-xs font-bold cursor-pointer"
                >
                  <Maximize2 className="w-5 h-5" />
                  <span>{selectedClip.fitMode === 'cover' ? 'Fill' : 'Fit'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLetterbox((v) => !v)}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold cursor-pointer ${
                    letterbox ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-700 text-white'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                  <span>Cinema</span>
                </button>
              </div>
            )}

            {/* SPEED */}
            {bottomTray === 'speed' && selectedClip && (
              <div className="grid grid-cols-6 gap-2 pt-2">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => updateClip(selectedClip.id, { speed: spd })}
                    className={`py-3 rounded-xl text-xs font-mono font-extrabold cursor-pointer border ${
                      selectedClip.speed === spd
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            )}

            {/* AUDIO: 12,000+ PRO MUSIC LIBRARY + PHONE SONGS */}
            {bottomTray === 'audio' && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAudioTab('free')}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                      audioTab === 'free' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                    }`}
                  >
                    {isMl ? `പ്രോ മ്യൂസിക് (${TOTAL_PRO_MUSIC_COUNT.toLocaleString()}+)` : `Free Songs (${TOTAL_PRO_MUSIC_COUNT.toLocaleString()}+)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioTab('phone')}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                      audioTab === 'phone' ? 'bg-fuchsia-600 text-white' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                    }`}
                  >
                    {isMl ? 'ഫോൺ ഗാലറി പാട്ടുകൾ' : 'Phone Songs'}
                  </button>
                </div>

                {audioTab === 'free' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative w-40 shrink-0">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={musicSearch}
                          onChange={(e) => {
                            setMusicSearch(e.target.value);
                            setMusicPage(0);
                          }}
                          placeholder={`Search ${TOTAL_PRO_MUSIC_COUNT.toLocaleString()}...`}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {Array.from(new Set([...MUSIC_CATEGORIES, ...PRO_MUSIC_CATEGORIES])).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setMusicCategory(cat);
                              setMusicPage(0);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                              musicCategory === cat ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-300'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {musicPage === 0 && filteredMusic.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {filteredMusic.slice(0, 12).map((trk) => (
                          <div
                            key={trk.id}
                            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{trk.name}</p>
                              <p className="text-[10px] font-mono text-zinc-400">
                                {trk.category} · {trk.durationSec}s
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => previewFreeMusic(trk)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={loadingMusicId === trk.id}
                                onClick={() => handleAddFreeMusic(trk)}
                                className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-400 text-black text-[11px] font-extrabold cursor-pointer"
                              >
                                {loadingMusicId === trk.id ? '...' : '+ Add'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                      <span>{proMusicResult.total.toLocaleString()} Pro Synth Score Tracks</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={musicPage === 0}
                          onClick={() => setMusicPage((p) => Math.max(0, p - 1))}
                          className="p-1 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-white">P.{musicPage + 1}</span>
                        <button
                          type="button"
                          disabled={(musicPage + 1) * 36 >= proMusicResult.total}
                          onClick={() => setMusicPage((p) => p + 1)}
                          className="p-1 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {proMusicResult.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{item.name}</p>
                            <p className="text-[10px] font-mono text-zinc-400 truncate">{item.sub}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                previewFreeMusic({
                                  id: item.id,
                                  name: item.name,
                                  category: 'Cinema & Drama',
                                  bpm: item.bpm || 96,
                                  durationSec: 12,
                                  rootFreq: item.freq || 130,
                                  scaleIntervals: [0, 3, 5, 7, 10, 12],
                                  mood: 'warm',
                                })
                              }
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={loadingMusicId === item.id}
                              onClick={() => handleAddProMusicItem(item)}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-400 text-black text-[11px] font-extrabold cursor-pointer"
                            >
                              {loadingMusicId === item.id ? '...' : '+ Add'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => audioFileInputRef.current?.click()}
                    className="w-full py-3.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>{isMl ? 'ഫോൺ ഗാലറിയിൽ നിന്ന് പാട്ട് ചേർക്കുക' : 'Pick Song from Phone / PC'}</span>
                  </button>
                )}

                {audioItems.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                    <p className="text-[11px] text-zinc-400 font-bold">
                      {isMl ? 'ടൈംലൈനിലുള്ള ഓഡിയോ/മ്യൂസിക്:' : 'Added Timeline Audio/Music:'}
                    </p>
                    {audioItems.map((a) => (
                      <div
                        key={a.id}
                        className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate font-bold text-fuchsia-300">{a.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            pushUndo();
                            setAudioItems((prev) => prev.filter((x) => x.id !== a.id));
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isMl ? 'ഡിലീറ്റ്' : 'Delete'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 12,000+ SOUND FX (GUNSHOTS, SWORD, FOLEY, SIRENS) */}
            {bottomTray === 'sfx' && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative w-44 shrink-0">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={sfxSearch}
                      onChange={(e) => {
                        setSfxSearch(e.target.value);
                        setSfxPage(0);
                      }}
                      placeholder={`Search ${TOTAL_PRO_SFX_COUNT.toLocaleString()} SFX...`}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {Array.from(new Set([...SFX_CATEGORIES, ...PRO_SFX_CATEGORIES])).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSfxCategory(cat);
                          setSfxPage(0);
                        }}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                          sfxCategory === cat ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {sfxPage === 0 && filteredSfx.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {filteredSfx.slice(0, 12).map((sfx) => (
                      <div
                        key={sfx.id}
                        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2"
                      >
                        <span className="text-[11px] font-bold truncate">{sfx.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => previewSfx(sfx)}
                            className="p-1.5 rounded bg-zinc-800 text-zinc-200 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={loadingSfxId === sfx.id}
                            onClick={() => handleAddSfxToTimeline(sfx)}
                            className="px-2.5 py-1 rounded bg-white text-black text-[10px] font-extrabold cursor-pointer"
                          >
                            {loadingSfxId === sfx.id ? '...' : '+ Add'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>{proSfxResult.total.toLocaleString()} Pro 48kHz Foley SFX</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={sfxPage === 0}
                      onClick={() => setSfxPage((p) => Math.max(0, p - 1))}
                      className="p-1 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-white">P.{sfxPage + 1}</span>
                    <button
                      type="button"
                      disabled={(sfxPage + 1) * 36 >= proSfxResult.total}
                      onClick={() => setSfxPage((p) => p + 1)}
                      className="p-1 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {proSfxResult.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">{item.name}</p>
                        <p className="text-[9px] text-zinc-400 truncate">{item.sub}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => previewSfx(buildSfxDefFromCatalog(item))}
                          className="p-1.5 rounded bg-zinc-800 text-zinc-200 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={loadingSfxId === item.id}
                          onClick={() => handleAddProSfxItem(item)}
                          className="px-2.5 py-1 rounded bg-white text-black text-[10px] font-extrabold cursor-pointer"
                        >
                          {loadingSfxId === item.id ? '...' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VOICEOVER */}
            {bottomTray === 'voice' && (
              <div className="flex flex-col items-center justify-center gap-2.5 py-2 text-center">
                <p className="text-xl font-mono font-extrabold text-white tabular-nums">
                  {voiceRecSec.toFixed(1)}s
                </p>
                {voiceRecError && <p className="text-xs text-red-400">{voiceRecError}</p>}
                {isRecordingVoice ? (
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="px-6 py-2.5 rounded-full bg-rose-600 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>{isMl ? 'നിർത്തുക & സേവ്' : 'Stop & Save'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="px-6 py-2.5 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>{isMl ? 'വോയിസ് റെക്കോർഡ്' : 'Start Recording'}</span>
                  </button>
                )}
              </div>
            )}

            {/* 12,000+ CONTINUITY & CINEMA TRANSITIONS */}
            {bottomTray === 'transitions' && (
              <div className="space-y-2.5">
                {selectedTransitionClip ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="relative w-44 shrink-0">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={transSearch}
                          onChange={(e) => {
                            setTransSearch(e.target.value);
                            setTransPage(0);
                          }}
                          placeholder={`Search ${TOTAL_PRO_TRANSITIONS_COUNT.toLocaleString()}...`}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {PRO_TRANSITION_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setTransCat(cat);
                              setTransPage(0);
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                              transCat === cat ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {transPage === 0 && !transSearch.trim() && transCat === 'All' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {TRANSITION_LIBRARY.map((tr) => {
                          const active = selectedTransitionClip.transitionId === tr.id;
                          return (
                            <button
                              key={tr.id}
                              type="button"
                              onClick={() => handleApplyTransition(tr.id)}
                              className={`p-2 rounded-xl border text-left text-xs font-bold cursor-pointer ${
                                active
                                  ? 'bg-white text-black border-white'
                                  : tr.category === 'Continuity'
                                  ? 'bg-amber-500/10 border-amber-500/35 text-amber-200'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                              }`}
                            >
                              <p className="truncate">{tr.name}</p>
                              <p className="text-[9px] opacity-70">{tr.category}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{proTransitionsResult.total.toLocaleString()} Pro GPU Transitions</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={transPage === 0}
                          onClick={() => setTransPage((p) => Math.max(0, p - 1))}
                          className="p-1 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-white">P.{transPage + 1}</span>
                        <button
                          type="button"
                          disabled={(transPage + 1) * 36 >= proTransitionsResult.total}
                          onClick={() => setTransPage((p) => p + 1)}
                          className="p-1 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {proTransitionsResult.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleApplyTransition(item.engineId || 'zoom_flow')}
                          className={`p-2 rounded-xl border text-left cursor-pointer ${
                            selectedTransitionClip.transitionId === item.engineId
                              ? 'bg-amber-500 text-black border-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                          }`}
                        >
                          <p className="text-[11px] font-extrabold truncate">{item.name}</p>
                          <p className="text-[9px] opacity-75 truncate">{item.sub}</p>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-zinc-400">
                    {isMl
                      ? '2 ക്ലിപ്പുകൾക്കിടയിലുള്ള "|" ബട്ടൺ ടാപ്പ് ചെയ്ത് ട്രാൻസിഷൻ മാറ്റാം, അല്ലെങ്കിൽ ഓട്ടോ കണ്ടിന്യൂയിറ്റി ഉപയോഗിക്കൂ.'
                      : 'Tap "|" between two clips to change transition, or use Auto Continuity.'}
                  </p>
                )}
              </div>
            )}
            {/* ACTION VFX PROP POSITION, LEVEL, ROTATION & BLEND PANEL */}
            {bottomTray === 'vfxProp' && selectedLayer && selectedLayer.kind === 'vfx_prop' && (
              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-rose-500/10 border border-rose-500/35 rounded-xl px-3 py-2">
                  <div>
                    <p className="font-extrabold text-white">{selectedLayer.name}</p>
                    <p className="text-[10px] text-rose-200">
                      {isMl
                        ? 'മുകളിൽ കാണുന്ന വീഡിയോയിൽ വിരൽ വെച്ച് വലിച്ചാലും പുക/ബ്ലഡ് നീക്കാൻ പറ്റും!'
                        : 'Tip: Drag directly on the video preview above to aim gun barrel or impact!'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setStudioTab('vfx');
                        setBottomTray('vfx');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-extrabold text-[11px] cursor-pointer"
                    >
                      + Change / Add VFX
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="px-2.5 py-1 rounded-lg bg-red-600/80 text-white font-bold text-[11px] cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Pos X', val: Math.round((selectedLayer.posX ?? 0.5) * 100), min: 0, max: 100, step: 1, key: 'posX', mult: 0.01, unit: '%' },
                    { label: 'Pos Y', val: Math.round((selectedLayer.posY ?? 0.5) * 100), min: 0, max: 100, step: 1, key: 'posY', mult: 0.01, unit: '%' },
                    { label: 'Size / Scale', val: Number((selectedLayer.scale ?? 1).toFixed(2)), min: 0.2, max: 3, step: 0.05, key: 'scale', mult: 1, unit: 'x' },
                    { label: 'Angle / Rotate', val: selectedLayer.rotation ?? 0, min: -180, max: 180, step: 2, key: 'rotation', mult: 1, unit: '°' },
                    { label: 'Smoke/Blood Density', val: Number((selectedLayer.density ?? 1.2).toFixed(2)), min: 0.4, max: 2.5, step: 0.1, key: 'density', mult: 1, unit: '' },
                    { label: 'Opacity', val: Math.round((selectedLayer.opacity ?? 0.9) * 100), min: 15, max: 100, step: 2, key: 'opacity', mult: 0.01, unit: '%' },
                    { label: 'Start (s)', val: Number(selectedLayer.startTime.toFixed(1)), min: 0, max: Math.max(10, totalDuration), step: 0.1, key: 'startTime', mult: 1, unit: 's' },
                    { label: 'Duration (s)', val: Number(selectedLayer.duration.toFixed(1)), min: 0.4, max: 12, step: 0.1, key: 'duration', mult: 1, unit: 's' },
                  ].map((ctrl) => (
                    <div key={ctrl.key} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-bold text-zinc-300">{ctrl.label}</span>
                        <span className="font-mono text-amber-400 font-bold">
                          {ctrl.val}{ctrl.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={ctrl.min}
                        max={ctrl.max}
                        step={ctrl.step}
                        value={ctrl.val}
                        onChange={(e) => {
                          const raw = Number(e.target.value) * ctrl.mult;
                          setLayers((prev) =>
                            prev.map((l) => (l.id === selectedLayer.id ? { ...l, [ctrl.key]: raw } : l))
                          );
                        }}
                        className="w-full accent-rose-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-zinc-400">Blend:</span>
                  {(['screen', 'lighter', 'source-over', 'multiply'] as const).map((bm) => (
                    <button
                      key={bm}
                      type="button"
                      onClick={() =>
                        setLayers((prev) =>
                          prev.map((l) => (l.id === selectedLayer.id ? { ...l, blendMode: bm } : l))
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer ${
                        (selectedLayer.blendMode || 'screen') === bm
                          ? 'bg-white text-black'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
                      }`}
                    >
                      {bm}
                    </button>
                  ))}

                  <span className="text-[11px] font-bold text-zinc-400 ml-2">VFX Line:</span>
                  {Array.from({ length: extraVfxTrackCount }).map((_, idx) => (
                    <button
                      key={`line_${idx}`}
                      type="button"
                      onClick={() =>
                        setLayers((prev) =>
                          prev.map((l) => (l.id === selectedLayer.id ? { ...l, trackIndex: idx } : l))
                        )
                      }
                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer ${
                        (selectedLayer.trackIndex ?? 0) === idx
                          ? 'bg-rose-500 text-white'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
                      }`}
                    >
                      V{idx + 2}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setLayers((prev) =>
                        prev.map((l) =>
                          l.id === selectedLayer.id ? { ...l, graphEnabled: !l.graphEnabled } : l
                        )
                      );
                      setBottomTray('graph');
                    }}
                    className="ml-auto px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-[10px] font-extrabold cursor-pointer flex items-center gap-1"
                  >
                    <TrendingUp className="w-3 h-3" />
                    <span>Animate on Graph (A → B)</span>
                  </button>
                </div>
              </div>
            )}

            {/* MASKING, OBJECT ERASE & NESTED DOUBLE MASK PANEL (15,000+ PRESETS) */}
            {bottomTray === 'masking' && (
              <div className="space-y-2.5 text-xs">
                {!selectedClip ? (
                  <p className="text-zinc-400">
                    {isMl ? 'ആദ്യം ഒരു വീഡിയോ ക്ലിപ്പ് തിരഞ്ഞെടുക്കൂ.' : 'Select a video clip on the timeline first.'}
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateClip(selectedClip.id, {
                            maskEnabled: !selectedClip.maskEnabled,
                            maskShape: selectedClip.maskShape || 'circle',
                            maskMode: selectedClip.maskMode || 'keep_inside',
                          })
                        }
                        className={`px-3 py-1.5 rounded-xl font-extrabold cursor-pointer ${
                          selectedClip.maskEnabled ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-200'
                        }`}
                      >
                        Mask 1: {selectedClip.maskEnabled ? 'ON' : 'OFF'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateClip(selectedClip.id, { maskEnabled: true, maskMode: 'keep_inside' })
                        }
                        className={`px-2.5 py-1.5 rounded-xl font-bold border cursor-pointer ${
                          (selectedClip.maskMode || 'keep_inside') === 'keep_inside'
                            ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        Isolate Character
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateClip(selectedClip.id, { maskEnabled: true, maskMode: 'erase_inside' })
                        }
                        className={`px-2.5 py-1.5 rounded-xl font-bold border cursor-pointer flex items-center gap-1 ${
                          selectedClip.maskMode === 'erase_inside'
                            ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        <span>Erase / Mask Out Object</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateClip(selectedClip.id, {
                            maskEnabled: true,
                            mask2Enabled: !selectedClip.mask2Enabled,
                            mask2Shape: selectedClip.mask2Shape || 'rect',
                            mask2Mode: selectedClip.mask2Mode || 'erase_inside',
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-xl font-extrabold border cursor-pointer ${
                          selectedClip.mask2Enabled
                            ? 'bg-fuchsia-500 text-white border-fuchsia-300'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                        }`}
                      >
                        Nested Mask 2 (Mask-in-Mask): {selectedClip.mask2Enabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                      {(['circle', 'rect', 'rounded', 'diamond', 'split_v', 'split_h', 'diagonal', 'star'] as MaskShapeId[]).map((shp) => (
                        <button
                          key={shp}
                          type="button"
                          onClick={() => updateClip(selectedClip.id, { maskEnabled: true, maskShape: shp })}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer ${
                            (selectedClip.maskShape || 'circle') === shp
                              ? 'bg-white text-black'
                              : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
                          }`}
                        >
                          {shp.replace('_', ' ')}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      {[
                        { label: 'Mask X', val: Math.round((selectedClip.maskX ?? 0.5) * 100), min: 5, max: 95, step: 1, key: 'maskX', mult: 0.01, unit: '%' },
                        { label: 'Mask Y', val: Math.round((selectedClip.maskY ?? 0.5) * 100), min: 5, max: 95, step: 1, key: 'maskY', mult: 0.01, unit: '%' },
                        { label: 'Width', val: Math.round((selectedClip.maskW ?? 0.45) * 100), min: 8, max: 100, step: 1, key: 'maskW', mult: 0.01, unit: '%' },
                        { label: 'Height', val: Math.round((selectedClip.maskH ?? 0.62) * 100), min: 8, max: 100, step: 1, key: 'maskH', mult: 0.01, unit: '%' },
                        { label: 'Rotate', val: selectedClip.maskRotation ?? 0, min: -180, max: 180, step: 2, key: 'maskRotation', mult: 1, unit: '°' },
                        { label: 'Feather', val: selectedClip.maskFeather ?? 12, min: 0, max: 100, step: 2, key: 'maskFeather', mult: 1, unit: '%' },
                      ].map((ctrl) => (
                        <div key={ctrl.key} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-zinc-400 font-bold">{ctrl.label}</span>
                            <span className="font-mono text-cyan-300">{ctrl.val}{ctrl.unit}</span>
                          </div>
                          <input
                            type="range"
                            min={ctrl.min}
                            max={ctrl.max}
                            step={ctrl.step}
                            value={ctrl.val}
                            onChange={(e) =>
                              updateClip(selectedClip.id, { maskEnabled: true, [ctrl.key]: Number(e.target.value) * ctrl.mult })
                            }
                            className="w-full accent-cyan-400"
                          />
                        </div>
                      ))}
                    </div>

                    {selectedClip.mask2Enabled && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 rounded-xl bg-fuchsia-950/25 border border-fuchsia-500/35">
                        {[
                          { label: 'Mask2 X', val: Math.round((selectedClip.mask2X ?? 0.5) * 100), key: 'mask2X' },
                          { label: 'Mask2 Y', val: Math.round((selectedClip.mask2Y ?? 0.5) * 100), key: 'mask2Y' },
                          { label: 'Mask2 W', val: Math.round((selectedClip.mask2W ?? 0.22) * 100), key: 'mask2W' },
                          { label: 'Mask2 H', val: Math.round((selectedClip.mask2H ?? 0.28) * 100), key: 'mask2H' },
                        ].map((ctrl) => (
                          <div key={ctrl.key} className="space-y-0.5">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-fuchsia-200 font-bold">{ctrl.label}</span>
                              <span className="font-mono text-fuchsia-300">{ctrl.val}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={95}
                              value={ctrl.val}
                              onChange={(e) =>
                                updateClip(selectedClip.id, { [ctrl.key]: Number(e.target.value) * 0.01 })
                              }
                              className="w-full accent-fuchsia-400"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-1 border-t border-zinc-800 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={maskSearch}
                          onChange={(e) => { setMaskSearch(e.target.value); setMaskPage(0); }}
                          placeholder={`Search ${TOTAL_PRO_MASKS_COUNT.toLocaleString()} Mask Presets...`}
                          className="w-44 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-[11px] text-white"
                        />
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                          {PRO_MASK_CATEGORIES.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => { setMaskCat(c); setMaskPage(0); }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                                maskCat === c ? 'bg-cyan-400 text-black' : 'bg-zinc-900 text-zinc-400'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                        <div className="ml-auto flex items-center gap-1 shrink-0 text-[10px]">
                          <button type="button" disabled={maskPage === 0} onClick={() => setMaskPage((p) => Math.max(0, p - 1))} className="p-1 rounded bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"><ChevronLeft className="w-3 h-3" /></button>
                          <span className="font-mono">P.{maskPage + 1}</span>
                          <button type="button" disabled={(maskPage + 1) * 36 >= proMasksResult.total} onClick={() => setMaskPage((p) => p + 1)} className="p-1 rounded bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"><ChevronRight className="w-3 h-3" /></button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {proMasksResult.items.map((item) => {
                          const [sh, md, ft] = (item.engineId || 'circle__keep_inside__12').split('__');
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                updateClip(selectedClip.id, {
                                  maskEnabled: true,
                                  maskShape: (sh as MaskShapeId) || 'circle',
                                  maskMode: (md as MaskModeId) || 'keep_inside',
                                  maskFeather: Number(ft) || 12,
                                  mask2Enabled: item.category === 'Nested Double Mask',
                                })
                              }
                              className="p-1.5 rounded-lg border border-zinc-800 hover:border-cyan-400 bg-zinc-900 text-left cursor-pointer"
                            >
                              <p className="text-[10px] font-extrabold text-white truncate">{item.name}</p>
                              <p className="text-[9px] text-cyan-300 truncate">{item.sub}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* CHARACTER & VEHICLE STUDIO: FLIP SIDE LEFT/RIGHT + 1-TAP SHOOT CHOREOGRAPHY (15,000+ MODELS) */}
            {bottomTray === 'character' && (
              <div className="space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreateShootScene}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>{isMl ? '🎬 ഓട്ടോ ഷൂട്ട് സീൻ (തോക്ക് -> ബുള്ളറ്റ് -> ബ്ലഡ്)' : '🎬 1-Tap Shoot Scene (Bullet -> Body Blood)'}</span>
                  </button>

                  {selectedLayer && selectedLayer.kind === 'character' && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setLayers((prev) =>
                            prev.map((l) => (l.id === selectedLayer.id ? { ...l, flipH: !l.flipH } : l))
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl font-extrabold border cursor-pointer flex items-center gap-1 ${
                          selectedLayer.flipH
                            ? 'bg-sky-500 text-black border-sky-300'
                            : 'bg-zinc-900 border-zinc-700 text-white'
                        }`}
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span>{selectedLayer.flipH ? 'Facing Left ◀' : 'Facing Right ▶'} (Flip Side)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLayers((prev) =>
                            prev.map((l) =>
                              l.id === selectedLayer.id
                                ? { ...l, graphEnabled: !l.graphEnabled, graphCurve: 'pendulum_walk' }
                                : l
                            )
                          );
                          setBottomTray('graph');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-extrabold cursor-pointer flex items-center gap-1"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Walk / Move Graph</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteSelected}
                        className="ml-auto px-2.5 py-1.5 rounded-xl bg-red-600/80 text-white font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>

                {selectedLayer && selectedLayer.kind === 'character' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Pos X', val: Math.round((selectedLayer.posX ?? 0.5) * 100), min: 5, max: 95, key: 'posX', mult: 0.01, unit: '%' },
                      { label: 'Pos Y', val: Math.round((selectedLayer.posY ?? 0.56) * 100), min: 10, max: 90, key: 'posY', mult: 0.01, unit: '%' },
                      { label: 'Size', val: Number((selectedLayer.scale ?? 1).toFixed(2)), min: 0.35, max: 2.5, key: 'scale', mult: 1, unit: 'x' },
                      { label: 'Tilt/Pose', val: selectedLayer.rotation ?? 0, min: -90, max: 90, key: 'rotation', mult: 1, unit: '°' },
                    ].map((ctrl) => (
                      <div key={ctrl.key} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400 font-bold">{ctrl.label}</span>
                          <span className="font-mono text-amber-300">{ctrl.val}{ctrl.unit}</span>
                        </div>
                        <input
                          type="range"
                          min={ctrl.min}
                          max={ctrl.max}
                          step={ctrl.key === 'scale' ? 0.05 : 1}
                          value={ctrl.val}
                          onChange={(e) =>
                            setLayers((prev) =>
                              prev.map((l) =>
                                l.id === selectedLayer.id ? { ...l, [ctrl.key]: Number(e.target.value) * ctrl.mult } : l
                              )
                            )
                          }
                          className="w-full accent-sky-400"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                  <input
                    type="text"
                    value={charSearch}
                    onChange={(e) => { setCharSearch(e.target.value); setCharPage(0); }}
                    placeholder={`Search ${TOTAL_PRO_CHARACTERS_COUNT.toLocaleString()} Characters...`}
                    className="w-44 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-[11px] text-white"
                  />
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {PRO_CHARACTER_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setCharCat(c); setCharPage(0); }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                          charCat === c ? 'bg-sky-400 text-black' : 'bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-1 shrink-0 text-[10px]">
                    <button type="button" disabled={charPage === 0} onClick={() => setCharPage((p) => Math.max(0, p - 1))} className="p-1 rounded bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"><ChevronLeft className="w-3 h-3" /></button>
                    <span className="font-mono">P.{charPage + 1}</span>
                    <button type="button" disabled={(charPage + 1) * 36 >= proCharsResult.total} onClick={() => setCharPage((p) => p + 1)} className="p-1 rounded bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"><ChevronRight className="w-3 h-3" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {proCharsResult.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        handleAddCharacter(
                          (item.engineId as CharacterArchetype) || 'shooter_pistol',
                          item.name,
                          item.css || '#18181b',
                          item.colorHex || '#f59e0b',
                          item.engineId === 'villain_target'
                        )
                      }
                      className="p-1.5 rounded-lg border border-zinc-800 hover:border-sky-400 bg-zinc-900 text-left cursor-pointer"
                    >
                      <p className="text-[10px] font-extrabold text-white truncate">{item.name}</p>
                      <p className="text-[9px] text-sky-300 truncate">{item.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* KEYFRAME GRAPH MOTION EDITOR (DRAGGABLE BEZIER CURVE + START A -> END B, 15,000+ CURVES) */}
            {bottomTray === 'graph' && (
              <div className="space-y-2.5 text-xs">
                {!selectedLayer || selectedLayer.kind === 'doodle' ? (
                  <div className="py-3 flex flex-col items-center gap-2 text-center">
                    <p className="text-zinc-300">
                      {isMl
                        ? 'ആദ്യം ഒരു ബുള്ളറ്റ് VFX, ക്യാരക്ടർ, അല്ലെങ്കിൽ ടൈറ്റിൽ ചേർക്കൂ!'
                        : 'Select a Character, Flying Bullet VFX, or Title to animate along the Motion Graph.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateShootScene}
                      className="px-4 py-1.5 rounded-full bg-amber-500 text-black font-extrabold cursor-pointer"
                    >
                      🎬 Create Bullet + Character Graph Scene
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setLayers((prev) =>
                            prev.map((l) =>
                              l.id === selectedLayer.id ? { ...l, graphEnabled: !l.graphEnabled } : l
                            )
                          )
                        }
                        className={`px-3 py-1 rounded-xl font-extrabold cursor-pointer ${
                          selectedLayer.graphEnabled ? 'bg-cyan-400 text-black' : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        Graph Motion: {selectedLayer.graphEnabled ? 'ON' : 'OFF'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setLayers((prev) =>
                            prev.map((l) =>
                              l.id === selectedLayer.id
                                ? { ...l, graphEnabled: true, kfStartX: l.posX ?? 0.25, kfStartY: l.posY ?? 0.5 }
                                : l
                            )
                          )
                        }
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold cursor-pointer"
                      >
                        Set Start (A) = Current Pos
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setLayers((prev) =>
                            prev.map((l) =>
                              l.id === selectedLayer.id
                                ? { ...l, graphEnabled: true, kfEndX: l.posX ?? 0.78, kfEndY: l.posY ?? 0.5 }
                                : l
                            )
                          )
                        }
                        className="px-2.5 py-1 rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-300 font-bold cursor-pointer"
                      >
                        Set End (B) = Current Pos
                      </button>

                      <button
                        type="button"
                        onClick={() => playTemporaryPreview(2000)}
                        className="ml-auto px-3 py-1 rounded-xl bg-white text-black font-extrabold cursor-pointer"
                      >
                        ▶ Preview Curve
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      {/* Visual SVG Bezier Graph Curve Plotter */}
                      <div className="sm:col-span-5 bg-zinc-950 border border-zinc-800 rounded-xl p-2 flex items-center gap-3">
                        <svg viewBox="0 0 120 70" className="w-32 h-16 shrink-0 bg-[#07090e] rounded-lg border border-zinc-800">
                          <line x1="0" y1="35" x2="120" y2="35" stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
                          <polyline
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2.5"
                            points={Array.from({ length: 21 })
                              .map((_, idx) => {
                                const t = idx / 20;
                                const y = evaluateGraphCurve(
                                  selectedLayer.graphCurve || 'ease_in_out',
                                  t,
                                  selectedLayer.graphCp1y ?? 0.15,
                                  selectedLayer.graphCp2y ?? 0.92
                                );
                                return `${6 + t * 108},${62 - Math.max(-0.1, Math.min(1.1, y)) * 54}`;
                              })
                              .join(' ')}
                          />
                        </svg>
                        <div className="flex-1 space-y-1 text-[10px]">
                          <div>
                            <span className="text-zinc-400 font-bold">Ease Handle 1: {(selectedLayer.graphCp1y ?? 0.15).toFixed(2)}</span>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={selectedLayer.graphCp1y ?? 0.15}
                              onChange={(e) =>
                                setLayers((prev) =>
                                  prev.map((l) =>
                                    l.id === selectedLayer.id
                                      ? { ...l, graphEnabled: true, graphCurve: 'custom_bezier', graphCp1y: Number(e.target.value) }
                                      : l
                                  )
                                )
                              }
                              className="w-full accent-cyan-400"
                            />
                          </div>
                          <div>
                            <span className="text-zinc-400 font-bold">Ease Handle 2: {(selectedLayer.graphCp2y ?? 0.92).toFixed(2)}</span>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={selectedLayer.graphCp2y ?? 0.92}
                              onChange={(e) =>
                                setLayers((prev) =>
                                  prev.map((l) =>
                                    l.id === selectedLayer.id
                                      ? { ...l, graphEnabled: true, graphCurve: 'custom_bezier', graphCp2y: Number(e.target.value) }
                                      : l
                                  )
                                )
                              }
                              className="w-full accent-amber-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Target X/Y & Curve Type Pills */}
                      <div className="sm:col-span-7 space-y-1.5">
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                          {([
                            { id: 'bullet_snap' as const, label: 'Bullet Snap' },
                            { id: 'ease_in_out' as const, label: 'S-Curve Ease' },
                            { id: 'pendulum_walk' as const, label: 'Walk Cycle' },
                            { id: 'recoil_kick' as const, label: 'Recoil Kick' },
                            { id: 'dodge_whip' as const, label: 'Dodge Whip' },
                            { id: 'arc_jump' as const, label: 'Jump Arc' },
                            { id: 'custom_bezier' as const, label: 'Custom Bezier' },
                          ]).map((cv) => (
                            <button
                              key={cv.id}
                              type="button"
                              onClick={() =>
                                setLayers((prev) =>
                                  prev.map((l) =>
                                    l.id === selectedLayer.id ? { ...l, graphEnabled: true, graphCurve: cv.id } : l
                                  )
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                                (selectedLayer.graphCurve || 'ease_in_out') === cv.id
                                  ? 'bg-cyan-400 text-black'
                                  : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
                              }`}
                            >
                              {cv.label}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {[
                            { label: 'Start X (A)', val: Math.round((selectedLayer.kfStartX ?? 0.25) * 100), key: 'kfStartX' },
                            { label: 'Start Y (A)', val: Math.round((selectedLayer.kfStartY ?? 0.5) * 100), key: 'kfStartY' },
                            { label: 'End X (B)', val: Math.round((selectedLayer.kfEndX ?? 0.78) * 100), key: 'kfEndX' },
                            { label: 'End Y (B)', val: Math.round((selectedLayer.kfEndY ?? 0.5) * 100), key: 'kfEndY' },
                          ].map((k) => (
                            <div key={k.key} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                              <div className="flex justify-between text-[9px]">
                                <span className="text-zinc-400 font-bold">{k.label}</span>
                                <span className="font-mono text-cyan-300">{k.val}%</span>
                              </div>
                              <input
                                type="range"
                                min={5}
                                max={95}
                                value={k.val}
                                onChange={(e) =>
                                  setLayers((prev) =>
                                    prev.map((l) =>
                                      l.id === selectedLayer.id
                                        ? { ...l, graphEnabled: true, [k.key]: Number(e.target.value) * 0.01 }
                                        : l
                                    )
                                  )
                                }
                                className="w-full accent-cyan-400"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                      <input
                        type="text"
                        value={graphSearch}
                        onChange={(e) => { setGraphSearch(e.target.value); setGraphPage(0); }}
                        placeholder={`Search ${TOTAL_PRO_GRAPHS_COUNT.toLocaleString()} Graph Curves...`}
                        className="w-44 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-[11px] text-white"
                      />
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {PRO_GRAPH_CATEGORIES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => { setGraphCat(c); setGraphPage(0); }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                              graphCat === c ? 'bg-cyan-400 text-black' : 'bg-zinc-900 text-zinc-400'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      <div className="ml-auto flex items-center gap-1 shrink-0 text-[10px]">
                        <button type="button" disabled={graphPage === 0} onClick={() => setGraphPage((p) => Math.max(0, p - 1))} className="p-1 rounded bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"><ChevronLeft className="w-3 h-3" /></button>
                        <span className="font-mono">P.{graphPage + 1}</span>
                        <button type="button" disabled={(graphPage + 1) * 36 >= proGraphsResult.total} onClick={() => setGraphPage((p) => p + 1)} className="p-1 rounded bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"><ChevronRight className="w-3 h-3" /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {proGraphsResult.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setLayers((prev) =>
                              prev.map((l) =>
                                l.id === selectedLayer.id
                                  ? { ...l, graphEnabled: true, graphCurve: (item.engineId as GraphCurveType) || 'ease_in_out' }
                                  : l
                              )
                            )
                          }
                          className="p-1.5 rounded-lg border border-zinc-800 hover:border-cyan-400 bg-zinc-900 text-left cursor-pointer"
                        >
                          <p className="text-[10px] font-extrabold text-white truncate">{item.name}</p>
                          <p className="text-[9px] text-cyan-300 truncate">{item.sub}</p>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ALL 121 PRO FEATURES BAR DIRECTLY UNDER THE TIMELINE (MOBILE & DESKTOP 1-TAP PARITY) */}
      <div className="bg-[#08090c] border-t border-zinc-800 shrink-0 flex flex-col">
        {/* Category Quick-Filter Strip for Instant Jump across 121 Tools */}
        <div className="px-2.5 pt-1.5 pb-1 flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-zinc-900/80">
          {['All', 'Action VFX', 'Masking', 'Characters', 'Graph', 'Color/LUT', 'Titles', 'Audio'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setNavCatFilter(cat)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold whitespace-nowrap cursor-pointer transition-colors ${
                navCatFilter === cat
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {cat === 'All' ? `All 121 Features` : cat}
            </button>
          ))}
        </div>

        {/* Scrollable 121-Feature Bottom Toolbar right below the Timeline */}
        <nav className="px-2 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            {
              id: 'quick_shoot',
              icon: Target,
              badge: 'AUTO',
              label: isMl ? 'ഷൂട്ട് സീൻ' : 'Shoot Scene',
              active: false,
              disabled: false,
              onClick: handleCreateShootScene,
            },
            {
              id: 'quick_mask',
              icon: Circle,
              badge: '15k+',
              label: isMl ? 'മാസ്ക്/ഇറേസ്' : 'Mask/Erase',
              active: bottomTray === 'masking',
              disabled: clips.length === 0,
              onClick: () => setBottomTray(bottomTray === 'masking' ? null : 'masking'),
            },
            {
              id: 'quick_char',
              icon: Users,
              badge: '15k+',
              label: isMl ? 'ക്യാരക്ടർ' : 'Characters',
              active: bottomTray === 'character',
              disabled: false,
              onClick: () => setBottomTray(bottomTray === 'character' ? null : 'character'),
            },
            {
              id: 'quick_graph',
              icon: TrendingUp,
              badge: '15k+',
              label: isMl ? 'ഗ്രാഫ്' : 'Graph Curve',
              active: bottomTray === 'graph',
              disabled: false,
              onClick: () => setBottomTray(bottomTray === 'graph' ? null : 'graph'),
            },
            {
              id: 'quick_split',
              icon: Scissors,
              badge: 'CUT',
              label: isMl ? 'കട്ട്' : 'Split',
              active: false,
              disabled: !canSplit,
              onClick: handleSplitAtPlayhead,
            },
            {
              id: 'quick_del',
              icon: Trash2,
              badge: 'DEL',
              label: isMl ? 'ഡിലീറ്റ്' : 'Delete',
              active: false,
              disabled: false,
              onClick: handleDeleteSelected,
            },
          ].map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.id}
                type="button"
                disabled={btn.disabled}
                onClick={btn.onClick}
                className={`min-w-[74px] py-2 px-2 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer shrink-0 border transition-colors disabled:opacity-30 ${
                  btn.active
                    ? 'bg-white text-black border-white font-extrabold'
                    : 'bg-zinc-900/90 border-zinc-700/80 text-zinc-100 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-[8px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 font-bold">
                    {btn.badge}
                  </span>
                </div>
                <span className="text-[10px] font-bold whitespace-nowrap">{btn.label}</span>
              </button>
            );
          })}

          {filteredNav121Tools.map((tool) => {
            const Icon =
              tool.target === 'masking'
                ? Circle
                : tool.target === 'character'
                ? Users
                : tool.target === 'graph' || tool.target === 'motion'
                ? TrendingUp
                : tool.target === 'vfx'
                ? Crosshair
                : tool.target === 'colorStudio'
                ? Palette
                : tool.target === 'chromaStudio'
                ? SlidersHorizontal
                : tool.target === 'filters'
                ? Wand2
                : tool.target === 'text' || tool.target === 'captions'
                ? Type
                : tool.target === 'audio'
                ? Music
                : tool.target === 'sfx'
                ? Sparkles
                : tool.target === 'voice'
                ? Mic
                : tool.target === 'transitions'
                ? ArrowLeftRight
                : tool.target === 'doodles'
                ? PenTool
                : tool.target === 'sticker'
                ? Smile
                : tool.target === 'speed'
                ? Zap
                : tool.target === 'history'
                ? HistoryIcon
                : Sliders;

            const isActive = bottomTray === tool.target;
            return (
              <button
                key={`nav121_${tool.id}`}
                type="button"
                onClick={() => handleLaunch121Tool(tool)}
                className={`min-w-[82px] max-w-[110px] py-2 px-2 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer shrink-0 border transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-black border-white font-extrabold'
                    : 'bg-[#10121a] border-zinc-800 text-zinc-200 hover:border-amber-400/70'
                }`}
                title={`${tool.name} (${tool.group})`}
              >
                <div className="flex items-center gap-1">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={`text-[8px] font-mono font-bold ${isActive ? 'text-black' : 'text-amber-400'}`}>
                    #{tool.id}
                  </span>
                </div>
                <span className="text-[10px] font-bold truncate max-w-[96px]">{tool.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* PERSISTENT ALWAYS-VISIBLE BOTTOM VIDEO + BANNER AD BAR */}
      <EditorIdleBannerBar slotId="editor-persistent-bottom" compactVideo />



      {/* MODAL: PROJECT SETUP & ASPECT RATIO */}
      {bottomTray === 'projectSetup' && (
        <div className="fixed inset-0 z-50 bg-[#0b0c10] flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-lg w-full mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setBottomTray(null)}
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => mediaFileInputRef.current?.click()}
                className="px-4 py-2 rounded-full bg-white text-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                <span>{isMl ? 'വീഡിയോ / ഫോട്ടോ ചേർക്കൂ' : 'Add Media'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-white block">
                {isMl ? 'പ്രോജക്റ്റിന്റെ പേര്' : 'Project name'}
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-transparent border-b border-zinc-700 focus:border-white py-2 text-base text-white focus:outline-none"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-white block">
                {isMl ? 'ആസ്പെക്റ്റ് റേഷ്യോ (Aspect ratio)' : 'Aspect ratio'}
              </label>
              <div className="grid grid-cols-4 gap-3">
                {ASPECT_RATIO_OPTIONS.map((opt) => {
                  const selected = aspectRatio === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAspectRatio(opt.id)}
                      className="flex flex-col items-center gap-1.5 cursor-pointer"
                    >
                      <div
                        className={`w-14 h-12 rounded-xl flex items-center justify-center border ${
                          selected
                            ? 'bg-white text-black border-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                        }`}
                      >
                        <div
                          className="border-2 border-current rounded-[3px]"
                          style={{
                            width: opt.ratio >= 1 ? '22px' : `${Math.round(18 * opt.ratio)}px`,
                            height: opt.ratio >= 1 ? `${Math.round(22 / opt.ratio)}px` : '20px',
                          }}
                        />
                      </div>
                      <span className={`text-xs font-mono ${selected ? 'text-white font-bold' : 'text-zinc-400'}`}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="max-w-lg w-full mx-auto pt-6">
            <button
              type="button"
              onClick={() => setBottomTray(null)}
              className="w-full py-3.5 rounded-full bg-white text-black font-extrabold text-sm cursor-pointer shadow-lg"
            >
              {isMl ? 'തുടരുക' : 'Apply & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: PRO 4K MOBILE SAVE & EXPORT */}
      {bottomTray === 'export' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#14161f] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {!isExporting && (
                  <button
                    type="button"
                    onClick={() => setBottomTray(null)}
                    className="px-2.5 py-1.5 rounded-full bg-zinc-900 hover:bg-amber-400 hover:text-black border border-zinc-700 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{isMl ? 'തിരികെ' : 'Back'}</span>
                  </button>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-white truncate">
                    {isMl ? '4K / HD വീഡിയോ മൊബൈലിൽ സേവ്' : 'Save High-Quality Video to Phone'}
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400">
                    {aspectRatio} · {aspectSpec.dims[exportResolution].width}×{aspectSpec.dims[exportResolution].height} · {exportFps}fps · {QUALITY_TIER_PROFILES[exportResolution].shortSub}
                  </p>
                </div>
              </div>
              {!isExporting && (
                <button type="button" onClick={() => setBottomTray(null)} className="text-zinc-400 cursor-pointer shrink-0">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['4k', '1080p', '720p', '480p'] as const).map((tierId) => {
                const prof = QUALITY_TIER_PROFILES[tierId];
                const tDims = aspectSpec.dims[tierId];
                return (
                  <button
                    key={tierId}
                    type="button"
                    disabled={isExporting}
                    onClick={() => setExportResolution(tierId)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                      exportResolution === tierId
                        ? 'bg-white text-black border-white'
                        : 'bg-[#0b0c10] border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{prof.label}</div>
                    <div className="text-[10px] font-mono opacity-80">
                      {tDims.width}×{tDims.height} · {prof.shortSub.split('·')[1]?.trim() || prof.shortSub}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'auto' as const, label: 'Auto (MP4)' },
                { id: 'mp4' as const, label: 'MP4 H.264' },
                { id: 'webm' as const, label: 'WebM VP9' },
              ]).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  disabled={isExporting}
                  onClick={() => setExportFormat(f.id)}
                  className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                    exportFormat === f.id
                      ? 'bg-amber-500 border-amber-500 text-black'
                      : 'bg-[#0b0c10] border-zinc-800 text-zinc-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([24, 30, 60] as const).map((fps) => (
                <button
                  key={fps}
                  type="button"
                  disabled={isExporting}
                  onClick={() => setExportFps(fps)}
                  className={`py-1.5 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
                    exportFps === fps
                      ? 'bg-amber-500 border-amber-500 text-black'
                      : 'bg-[#0b0c10] border-zinc-800 text-zinc-300'
                  }`}
                >
                  {fps} FPS
                </button>
              ))}
            </div>

            {/* DEDICATED VIDEO-SIZED LIVE RENDER & DOWNLOAD BOX */}
            {(isExporting || exportedDownload) && (
              <div className="rounded-2xl bg-[#090a0f] border border-amber-500/35 overflow-hidden shadow-inner">
                <div
                  className="w-full bg-black flex flex-col items-center justify-center relative"
                  style={{
                    aspectRatio: `${aspectSpec.dims['720p'].width} / ${aspectSpec.dims['720p'].height}`,
                    maxHeight: '240px',
                  }}
                >
                  {isExporting ? (
                    <>
                      <canvas
                        ref={exportMonitorCanvasRef}
                        width={640}
                        height={Math.max(240, Math.round(640 / aspectSpec.ratio))}
                        className="w-full h-full object-contain bg-black"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-extrabold text-white">
                            {isMl
                              ? `${exportResolution.toUpperCase()} (${aspectSpec.dims[exportResolution].width}×${aspectSpec.dims[exportResolution].height}) എക്സ്പോർട്ട്...`
                              : `Exporting ${exportResolution.toUpperCase()} (${aspectSpec.dims[exportResolution].width}×${aspectSpec.dims[exportResolution].height})`}
                          </span>
                          <span className="text-amber-400 font-extrabold tabular-nums">
                            {exportProgress}% · {Math.min(Math.round(exportElapsedSec), Math.ceil(totalDuration))}s/{Math.ceil(totalDuration)}s
                          </span>
                        </div>
                        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-100"
                            style={{ width: `${exportProgress}%` }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    exportedDownload && (
                      <video
                        src={exportedDownload.url}
                        controls
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                    )
                  )}
                </div>

                {exportedDownload && !isExporting && (
                  <div className="p-3 bg-emerald-500/10 border-t border-emerald-500/25 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-emerald-300">
                        ✅ {exportResolution.toUpperCase()} ({aspectSpec.dims[exportResolution].width}×{aspectSpec.dims[exportResolution].height}) · {exportedDownload.sizeMb} MB
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[140px]">
                        {exportedDownload.fileName}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={exportedDownload.url}
                        download={exportedDownload.fileName}
                        className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>{isMl ? 'ഡൗൺലോഡ്' : 'Download'}</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleMobileSaveShare}
                        className="py-2.5 px-3 rounded-xl bg-white hover:bg-amber-400 text-black text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>{isMl ? 'ഗാലറിയിൽ സേവ്' : 'Save to Phone'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {exportError && <p className="text-xs text-red-400">{exportError}</p>}

            {isExporting ? (
              <button
                type="button"
                onClick={() => {
                  exportAbortRef.current = true;
                  setIsExporting(false);
                }}
                className="w-full py-3 rounded-full bg-red-600 text-white font-extrabold text-xs cursor-pointer"
              >
                {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void handleStartExport();
                }}
                className="w-full py-3.5 rounded-full bg-white hover:bg-amber-400 text-black font-extrabold text-sm cursor-pointer shadow-lg"
              >
                {isMl
                  ? `വീഡിയോ സേവ് ചെയ്യുക (${exportResolution.toUpperCase()})`
                  : `Export ${exportResolution.toUpperCase()} Video`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* DEDICATED FULLSCREEN PRO STUDIO PAGE: PREMIERE LUMETRI, DAVINCI WHEELS, LUTS, CHROMA KEY, FILTERS & VFX */}
      {isStudioFullscreen && selectedClip && (
        <div className="fixed inset-0 z-[55] bg-[#07080c] text-zinc-100 flex flex-col overflow-hidden">
          {/* Top Studio Navigation Bar */}
          <header className="h-14 px-3 sm:px-5 bg-[#0b0d14] border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setBottomTray(null);
                }}
                className="px-3.5 py-2 rounded-full bg-white hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isMl ? 'ശരി / തിരികെ' : 'Back to Editor'}</span>
              </button>
              <span className="hidden sm:inline text-xs font-extrabold text-amber-400 tracking-wide">
                Premiere & DaVinci Pro Studio
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 disabled:opacity-30 text-zinc-200 cursor-pointer"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 disabled:opacity-30 text-zinc-200 cursor-pointer"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setAbCompare((v) => !v)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1 cursor-pointer ${
                  abCompare
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                }`}
                title="Before / After Split"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>A/B</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  pushUndo();
                  updateClip(selectedClip.id, {
                    filterId: 'none',
                    vfxId: 'none',
                    colorGradeEnabled: false,
                    colorLutId: 'none',
                    temp: 0,
                    tint: 0,
                    exposure: 0,
                    highlights: 0,
                    shadows: 0,
                    vibrance: 0,
                    liftR: 0,
                    liftG: 0,
                    liftB: 0,
                    gammaR: 0,
                    gammaG: 0,
                    gammaB: 0,
                    gainR: 0,
                    gainG: 0,
                    gainB: 0,
                    brightness: 100,
                    contrast: 100,
                    saturation: 100,
                    vignette: 0,
                    chromaKeyEnabled: false,
                  });
                }}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-500/50 text-zinc-300 hover:text-red-300 cursor-pointer"
                title={isMl ? 'റീസെറ്റ്' : 'Reset All'}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Clip Switcher Strip if >1 clip */}
          {clips.length > 1 && (
            <div className="px-3 py-1.5 bg-[#090a10] border-b border-zinc-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1 shrink-0">
                Clips:
              </span>
              {clips.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClipId(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                    selectedClip.id === c.id
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                  }`}
                >
                  #{idx + 1} {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Responsive Split Workspace: Identical Features on Mobile & Desktop */}
          <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden">
            {/* Large Live Studio Video Preview Stage */}
            <div className="h-[36vh] sm:h-[42vh] lg:h-full lg:col-span-7 bg-black flex flex-col items-center justify-center p-2.5 sm:p-4 border-b lg:border-b-0 lg:border-r border-zinc-800 shrink-0">
              <div
                className="relative bg-[#0f1118] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center max-h-[calc(100%-46px)] max-w-full"
                style={{
                  aspectRatio: `${aspectSpec.dims['720p'].width} / ${aspectSpec.dims['720p'].height}`,
                  height:
                    aspectRatio === '9:16' || aspectRatio === '3:4' || aspectRatio === '4:5'
                      ? '100%'
                      : 'auto',
                  width: aspectRatio === '16:9' || aspectRatio === '2.35:1' ? '100%' : 'auto',
                }}
              >
                <canvas
                  ref={studioCanvasRef}
                  width={previewDims.width}
                  height={previewDims.height}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  onClick={() => {
                    if (didDragVfxRef.current) {
                      didDragVfxRef.current = false;
                      return;
                    }
                    setIsPlaying((p) => !p);
                  }}
                  className={`w-full h-full object-contain bg-black touch-none ${
                    selectedLayer?.kind === 'vfx_prop' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                  }`}
                />
                {selectedLayer?.kind === 'vfx_prop' && (
                  <div className="absolute top-2 inset-x-2 flex justify-center pointer-events-none">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-950/90 text-amber-300 text-[10px] font-extrabold border border-rose-400/50 flex items-center gap-1">
                      <Crosshair className="w-3 h-3 text-rose-400" />
                      <span>
                        {isMl
                          ? 'വീഡിയോയിൽ വിരൽ വെച്ച് പുക / ബ്ലഡ് കൃത്യമായി വെയ്ക്കൂ'
                          : 'Drag directly on preview to position gun smoke / blood'}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Live Playback & Scrubber */}
              <div className="w-full max-w-lg mt-2 flex items-center gap-2.5 px-1">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center cursor-pointer shrink-0"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
                </button>
                <input
                  ref={studioRangeRef}
                  type="range"
                  min={0}
                  max={Math.max(0.1, totalDuration)}
                  step={0.04}
                  defaultValue={Math.min(playhead, Math.max(0.1, totalDuration))}
                  onChange={(e) => seekAndDraw(Number(e.target.value))}
                  className="flex-1 accent-amber-400"
                />
                <span ref={studioTimeRef} className="text-[11px] font-mono text-zinc-300 tabular-nums shrink-0">
                  {formatMmSs(playhead)} / {formatMmSs(totalDuration)}
                </span>
              </div>
            </div>

            {/* Right / Bottom Pro Controls Workspace */}
            <div className="flex-1 min-h-0 lg:col-span-5 flex flex-col bg-[#0d0e14] overflow-hidden">
              {/* Studio Tab Switcher */}
              <div className="px-2.5 py-2 border-b border-zinc-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-[#090a0f]">
                {([
                  { id: 'vfx' as const, label: isMl ? `ആക്ഷൻ VFX (${TOTAL_PRO_VFX_COUNT + VFX_LIBRARY.length}+)` : `Action VFX (${TOTAL_PRO_VFX_COUNT + VFX_LIBRARY.length}+)` },
                  { id: 'lumetri' as const, label: isMl ? 'ലുമെട്രി കളർ' : 'Lumetri Pro' },
                  { id: 'wheels' as const, label: isMl ? 'കളർ വീൽസ്' : 'Color Wheels' },
                  { id: 'luts' as const, label: isMl ? `സിനിമ LUT (${TOTAL_PRO_LUTS_COUNT}+)` : `LUTs (${TOTAL_PRO_LUTS_COUNT}+)` },
                  { id: 'chroma' as const, label: isMl ? 'ക്രോമാ കീ' : 'Chroma Key' },
                  { id: 'filters' as const, label: isMl ? `ഫിൽട്ടർ (${TOTAL_PRO_FILTERS_COUNT}+)` : `Filters (${TOTAL_PRO_FILTERS_COUNT}+)` },
                ]).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setStudioTab(t.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-colors ${
                      studioTab === t.id
                        ? 'bg-amber-500 text-black'
                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Studio Tool Body */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
                {/* 1. PREMIERE PRO LUMETRI COLOR PANEL */}
                {studioTab === 'lumetri' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">
                        {isMl ? 'പ്രീമിയർ പ്രോ ലുമെട്രി കളർ' : 'Premiere Pro Lumetri Color'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          pushUndo();
                          updateClip(selectedClip.id, {
                            colorGradeEnabled: true,
                            temp: 12,
                            tint: 2,
                            exposure: 8,
                            highlights: 16,
                            shadows: -12,
                            vibrance: 28,
                            contrast: 108,
                          });
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold cursor-pointer"
                      >
                        ✨ Auto Cinema Enhance
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        { key: 'temp' as const, label: isMl ? 'താപനില (Temperature)' : 'Temperature', min: -100, max: 100, def: 0 },
                        { key: 'tint' as const, label: isMl ? 'ടിന്റ് (Tint)' : 'Tint', min: -100, max: 100, def: 0 },
                        { key: 'exposure' as const, label: isMl ? 'എക്സ്പോഷർ (Exposure)' : 'Exposure', min: -100, max: 100, def: 0 },
                        { key: 'highlights' as const, label: isMl ? 'ഹൈലൈറ്റ്സ് (Highlights)' : 'Highlights', min: -100, max: 100, def: 0 },
                        { key: 'shadows' as const, label: isMl ? 'ഷാഡോസ് (Shadows)' : 'Shadows', min: -100, max: 100, def: 0 },
                        { key: 'vibrance' as const, label: isMl ? 'വൈബ്രൻസ് (Vibrance)' : 'Vibrance', min: -50, max: 100, def: 0 },
                        { key: 'brightness' as const, label: isMl ? 'തെളിച്ചം (Brightness)' : 'Brightness', min: 50, max: 150, def: 100 },
                        { key: 'contrast' as const, label: isMl ? 'കോൺട്രാസ്റ്റ് (Contrast)' : 'Contrast', min: 50, max: 160, def: 100 },
                        { key: 'saturation' as const, label: isMl ? 'സാച്ചുറേഷൻ (Saturation)' : 'Saturation', min: 0, max: 200, def: 100 },
                        { key: 'vignette' as const, label: isMl ? 'വിഗ്നെറ്റ് (Vignette)' : 'Vignette', min: 0, max: 85, def: 0 },
                      ].map((sl) => {
                        const val = selectedClip[sl.key] ?? sl.def;
                        return (
                          <div key={sl.key} className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                            <div className="flex justify-between">
                              <span className="font-bold text-zinc-200">{sl.label}</span>
                              <span className="font-mono text-amber-400 font-bold">{val}</span>
                            </div>
                            <input
                              type="range"
                              min={sl.min}
                              max={sl.max}
                              value={val}
                              onChange={(e) =>
                                updateClip(selectedClip.id, {
                                  colorGradeEnabled: true,
                                  [sl.key]: Number(e.target.value),
                                })
                              }
                              className="w-full accent-amber-400"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. DAVINCI RESOLVE LIFT / GAMMA / GAIN COLOR WHEELS */}
                {studioTab === 'wheels' && (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-400">
                      {isMl
                        ? 'ഡാവിഞ്ചി റിസോൾവ് പ്രോ 3-വേ കളർ വീലുകൾ (ഷാഡോ, മിഡ്‌ടോൺ, ഹൈലൈറ്റ് ബാലൻസ്):'
                        : 'DaVinci Resolve 3-Way Color Wheels (Shadows, Midtones & Highlights RGB Balance):'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          title: 'Lift (Shadows)',
                          rKey: 'liftR' as const,
                          gKey: 'liftG' as const,
                          bKey: 'liftB' as const,
                        },
                        {
                          title: 'Gamma (Midtones)',
                          rKey: 'gammaR' as const,
                          gKey: 'gammaG' as const,
                          bKey: 'gammaB' as const,
                        },
                        {
                          title: 'Gain (Highlights)',
                          rKey: 'gainR' as const,
                          gKey: 'gainG' as const,
                          bKey: 'gainB' as const,
                        },
                      ].map((wheel) => {
                        const rVal = selectedClip[wheel.rKey] || 0;
                        const gVal = selectedClip[wheel.gKey] || 0;
                        const bVal = selectedClip[wheel.bKey] || 0;
                        return (
                          <div
                            key={wheel.title}
                            className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-white">{wheel.title}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateClip(selectedClip.id, {
                                    [wheel.rKey]: 0,
                                    [wheel.gKey]: 0,
                                    [wheel.bKey]: 0,
                                  })
                                }
                                className="text-[10px] font-bold text-zinc-400 hover:text-amber-400 cursor-pointer"
                              >
                                Reset
                              </button>
                            </div>

                            {/* Visual Color Wheel Indicator */}
                            <div
                              className="w-20 h-20 mx-auto rounded-full relative border-2 border-zinc-700 shadow-inner"
                              style={{
                                background:
                                  'conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #d946ef, #ef4444)',
                              }}
                            >
                              <div className="absolute inset-1.5 rounded-full bg-zinc-950/75 flex items-center justify-center">
                                <div
                                  className="w-3.5 h-3.5 rounded-full bg-white border-2 border-black shadow"
                                  style={{
                                    transform: `translate(${Math.max(-22, Math.min(22, (rVal - bVal) * 0.4))}px, ${Math.max(-22, Math.min(22, -gVal * 0.4))}px)`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5 text-[11px]">
                              <div className="flex items-center gap-2">
                                <span className="w-4 font-mono font-bold text-red-400">R</span>
                                <input
                                  type="range"
                                  min={-50}
                                  max={50}
                                  value={rVal}
                                  onChange={(e) =>
                                    updateClip(selectedClip.id, {
                                      colorGradeEnabled: true,
                                      [wheel.rKey]: Number(e.target.value),
                                    })
                                  }
                                  className="flex-1 accent-red-500"
                                />
                                <span className="w-7 text-right font-mono text-zinc-300">{rVal}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-4 font-mono font-bold text-emerald-400">G</span>
                                <input
                                  type="range"
                                  min={-50}
                                  max={50}
                                  value={gVal}
                                  onChange={(e) =>
                                    updateClip(selectedClip.id, {
                                      colorGradeEnabled: true,
                                      [wheel.gKey]: Number(e.target.value),
                                    })
                                  }
                                  className="flex-1 accent-emerald-500"
                                />
                                <span className="w-7 text-right font-mono text-zinc-300">{gVal}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-4 font-mono font-bold text-sky-400">B</span>
                                <input
                                  type="range"
                                  min={-50}
                                  max={50}
                                  value={bVal}
                                  onChange={(e) =>
                                    updateClip(selectedClip.id, {
                                      colorGradeEnabled: true,
                                      [wheel.bKey]: Number(e.target.value),
                                    })
                                  }
                                  className="flex-1 accent-sky-500"
                                />
                                <span className="w-7 text-right font-mono text-zinc-300">{bVal}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. 3,000+ CINEMA LUTS */}
                {studioTab === 'luts' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                      <input
                        type="text"
                        value={lutSearch}
                        onChange={(e) => {
                          setLutSearch(e.target.value);
                          setLutPage(0);
                        }}
                        placeholder={isMl ? '3,000+ സിനിമ LUT തിരയുക...' : `Search ${TOTAL_PRO_LUTS_COUNT + COLOR_LUT_LIBRARY.length}+ Cinema LUTs...`}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {PRO_LUT_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setLutCategory(cat);
                            setLutPage(0);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                            lutCategory === cat ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {lutPage === 0 && !lutSearch.trim() && lutCategory === 'All' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {COLOR_LUT_LIBRARY.map((lut) => {
                          const active = (selectedClip.colorLutId || 'none') === lut.id && selectedClip.colorGradeEnabled;
                          return (
                            <button
                              key={lut.id}
                              type="button"
                              onClick={() => {
                                pushUndo();
                                updateClip(selectedClip.id, {
                                  colorGradeEnabled: lut.id !== 'none' || selectedClip.colorGradeEnabled,
                                  colorLutId: lut.id,
                                });
                              }}
                              className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                                active
                                  ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400'
                                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                              }`}
                            >
                              <div className={`w-full h-10 rounded-lg bg-gradient-to-br ${lut.swatch} mb-1.5`} />
                              <p className="text-xs font-extrabold text-white truncate">{lut.name}</p>
                              <p className="text-[10px] text-zinc-400 truncate">{lut.sub}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                      <span>
                        Showing {proLutsResult.items.length} of {proLutsResult.total.toLocaleString()} Pro Rec.709 LUTs
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={lutPage === 0}
                          onClick={() => setLutPage((p) => Math.max(0, p - 1))}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-white px-1">P.{lutPage + 1}</span>
                        <button
                          type="button"
                          disabled={(lutPage + 1) * 36 >= proLutsResult.total}
                          onClick={() => setLutPage((p) => p + 1)}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {proLutsResult.items.map((lut) => {
                        const active = selectedClip.colorLutId === lut.id && selectedClip.colorGradeEnabled;
                        return (
                          <button
                            key={lut.id}
                            type="button"
                            onClick={() => {
                              pushUndo();
                              updateClip(selectedClip.id, {
                                colorGradeEnabled: true,
                                colorLutId: lut.id,
                              });
                            }}
                            className={`p-2 rounded-xl border text-left cursor-pointer ${
                              active ? 'border-amber-400 bg-amber-500/15' : 'border-zinc-800 bg-zinc-900'
                            }`}
                          >
                            <div
                              className={`w-full h-9 rounded-lg bg-gradient-to-br ${lut.swatch} mb-1`}
                              style={{ filter: lut.css }}
                            />
                            <p className="text-[11px] font-extrabold text-white truncate">{lut.name}</p>
                            <p className="text-[9px] text-zinc-400 truncate">{lut.sub}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. CHROMA KEY (GREEN / BLUE SCREEN REMOVAL) */}
                {studioTab === 'chroma' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-extrabold text-white">
                          {isMl ? 'ക്രോമാ കീ (Green / Blue Screen)' : 'Chroma Key Ultra Studio'}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {isMl
                            ? 'ഗ്രീൻ/ബ്ലൂ സ്ക്രീൻ പശ്ചാത്തലം തത്സമയം നീക്കം ചെയ്യുക'
                            : 'Remove green or blue screen backgrounds cleanly in real time'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          pushUndo();
                          updateClip(selectedClip.id, {
                            chromaKeyEnabled: !selectedClip.chromaKeyEnabled,
                            chromaKeyColor: selectedClip.chromaKeyColor || 'green',
                            chromaKeyTolerance: selectedClip.chromaKeyTolerance ?? 45,
                            chromaKeySmoothness: selectedClip.chromaKeySmoothness ?? 20,
                            chromaKeySpill: selectedClip.chromaKeySpill ?? 30,
                          });
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                          selectedClip.chromaKeyEnabled
                            ? 'bg-emerald-500 text-black'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {selectedClip.chromaKeyEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { id: 'green' as const, label: isMl ? 'ഗ്രീൻ സ്ക്രീൻ (Green)' : 'Green Screen', dot: 'bg-emerald-500' },
                        { id: 'blue' as const, label: isMl ? 'ബ്ലൂ സ്ക്രീൻ (Blue)' : 'Blue Screen', dot: 'bg-blue-500' },
                      ]).map((c) => {
                        const sel = (selectedClip.chromaKeyColor || 'green') === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              updateClip(selectedClip.id, {
                                chromaKeyEnabled: true,
                                chromaKeyColor: c.id,
                              })
                            }
                            className={`p-3 rounded-xl border text-xs font-extrabold flex items-center gap-2 cursor-pointer ${
                              sel
                                ? 'bg-white text-black border-white'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full ${c.dot} border border-black/30`} />
                            <span>{c.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-3 text-xs">
                      {[
                        { key: 'chromaKeyTolerance' as const, label: isMl ? 'ടോളറൻസ് (Tolerance)' : 'Color Tolerance', min: 5, max: 100, def: 45 },
                        { key: 'chromaKeySmoothness' as const, label: isMl ? 'എഡ്ജ് സ്മൂത്ത് (Edge Feather)' : 'Edge Smoothness', min: 0, max: 100, def: 20 },
                        { key: 'chromaKeySpill' as const, label: isMl ? 'സ്പിൽ റിമൂവൽ (Spill Suppression)' : 'Spill Suppression', min: 0, max: 100, def: 30 },
                      ].map((sl) => {
                        const val = selectedClip[sl.key] ?? sl.def;
                        return (
                          <div key={sl.key} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                            <div className="flex justify-between">
                              <span className="font-bold text-zinc-200">{sl.label}</span>
                              <span className="font-mono text-emerald-400 font-bold">{val}%</span>
                            </div>
                            <input
                              type="range"
                              min={sl.min}
                              max={sl.max}
                              value={val}
                              onChange={(e) =>
                                updateClip(selectedClip.id, {
                                  chromaKeyEnabled: true,
                                  [sl.key]: Number(e.target.value),
                                })
                              }
                              className="w-full accent-emerald-400"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. 3,150+ PRO FILTERS IN DEDICATED STUDIO PAGE */}
                {studioTab === 'filters' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={filterSearch}
                        onChange={(e) => {
                          setFilterSearch(e.target.value);
                          setFilterPage(0);
                        }}
                        placeholder={isMl ? '3,150+ ഫിൽട്ടർ തിരയുക...' : `Search ${TOTAL_PRO_FILTERS_COUNT + FILTER_LIBRARY.length}+ Pro Filters...`}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {Array.from(new Set([...FILTER_CATEGORIES, ...PRO_FILTER_CATEGORIES])).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setFilterCategory(cat);
                            setFilterPage(0);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                            filterCategory === cat ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {filterPage === 0 && filteredFilters.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {filteredFilters.slice(0, 24).map((f) => {
                          const active = selectedClip.filterId === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => handleApplyFilter(f.id)}
                              className={`p-1.5 rounded-xl border text-center cursor-pointer ${
                                active ? 'border-amber-400 bg-amber-500/15' : 'border-zinc-800 bg-zinc-900'
                              }`}
                            >
                              <div
                                className={`w-full h-10 rounded-lg bg-gradient-to-br ${f.swatch} mb-1`}
                                style={{ filter: f.css }}
                              />
                              <p className="text-[10px] font-bold text-white truncate">{f.name}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                      <span>
                        {proFiltersResult.total.toLocaleString()} Pro Presets Available
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={filterPage === 0}
                          onClick={() => setFilterPage((p) => Math.max(0, p - 1))}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-white px-1">P.{filterPage + 1}</span>
                        <button
                          type="button"
                          disabled={(filterPage + 1) * 36 >= proFiltersResult.total}
                          onClick={() => setFilterPage((p) => p + 1)}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {proFiltersResult.items.map((f) => {
                        const active = selectedClip.filterId === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleApplyFilter(f.id)}
                            className={`p-1.5 rounded-xl border text-center cursor-pointer ${
                              active ? 'border-amber-400 bg-amber-500/15' : 'border-zinc-800 bg-zinc-900'
                            }`}
                          >
                            <div
                              className={`w-full h-10 rounded-lg bg-gradient-to-br ${f.swatch} mb-1`}
                              style={{ filter: f.css }}
                            />
                            <p className="text-[10px] font-bold text-white truncate">{f.name}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. 3,500+ ACTION COMBAT VFX (GUN SMOKE, BLOOD SPLATTER, SWORD SLASH) + FULLSCREEN VFX */}
                {studioTab === 'vfx' && (
                  <div className="space-y-3.5">
                    {/* Placed Action VFX Props Active Editor */}
                    {selectedLayer && selectedLayer.kind === 'vfx_prop' && (
                      <div className="p-3 rounded-2xl bg-rose-950/35 border border-rose-500/50 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Crosshair className="w-4 h-4 text-rose-400" />
                            <span className="font-extrabold text-white truncate">
                              {selectedLayer.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleDeleteSelected}
                            className="px-2 py-1 rounded-lg bg-red-600/80 text-white text-[10px] font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="text-[10px] text-amber-300 font-bold">
                          {isMl
                            ? 'ഇടതുവശത്തെ വീഡിയോയിൽ വിരൽ വെച്ച് വലിച്ചാലും കൃത്യമായി തോക്കിലോ മുറിവിലോ വെക്കാം!'
                            : 'Drag directly on the video preview to aim gun tip or blood impact!'}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Scale / Size', val: Number((selectedLayer.scale ?? 1).toFixed(2)), min: 0.2, max: 3, step: 0.05, key: 'scale', mult: 1, unit: 'x' },
                            { label: 'Rotate Angle', val: selectedLayer.rotation ?? 0, min: -180, max: 180, step: 2, key: 'rotation', mult: 1, unit: '°' },
                            { label: 'Density', val: Number((selectedLayer.density ?? 1.2).toFixed(2)), min: 0.4, max: 2.5, step: 0.1, key: 'density', mult: 1, unit: '' },
                            { label: 'Opacity', val: Math.round((selectedLayer.opacity ?? 0.9) * 100), min: 15, max: 100, step: 2, key: 'opacity', mult: 0.01, unit: '%' },
                          ].map((ctrl) => (
                            <div key={ctrl.key} className="space-y-0.5">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-zinc-300 font-bold">{ctrl.label}</span>
                                <span className="font-mono text-amber-400">{ctrl.val}{ctrl.unit}</span>
                              </div>
                              <input
                                type="range"
                                min={ctrl.min}
                                max={ctrl.max}
                                step={ctrl.step}
                                value={ctrl.val}
                                onChange={(e) => {
                                  const raw = Number(e.target.value) * ctrl.mult;
                                  setLayers((prev) =>
                                    prev.map((l) => (l.id === selectedLayer.id ? { ...l, [ctrl.key]: raw } : l))
                                  );
                                }}
                                className="w-full accent-rose-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Search 3,500+ Action & Cinema VFX */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={vfxSearch}
                        onChange={(e) => {
                          setVfxSearch(e.target.value);
                          setActionVfxPage(0);
                        }}
                        placeholder={
                          isMl
                            ? 'ഗൺ സ്മോക്ക്, ബ്ലഡ്, കത്തി വെട്ട്, തീ... (3,500+ VFX)'
                            : `Search Gun Smoke, Blood, Sword, Explosions (${TOTAL_PRO_VFX_COUNT + VFX_LIBRARY.length}+ VFX)...`
                        }
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white"
                      />
                    </div>

                    {/* Placeable Combat Action VFX Category Pills (3,200+ Gun Smoke, Blood, Slash, Fire...) */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-extrabold text-rose-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>
                          {isMl
                            ? `പ്ലേസ് ചെയ്യാവുന്ന ആക്ഷൻ VFX (${TOTAL_PRO_VFX_COUNT.toLocaleString()} എണ്ണം)`
                            : `Placeable Gun Smoke, Blood & Combat VFX (${TOTAL_PRO_VFX_COUNT.toLocaleString()})`}
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActionVfxCat('All');
                            setActionVfxPage(0);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold whitespace-nowrap cursor-pointer ${
                            actionVfxCat === 'All' ? 'bg-rose-500 text-white' : 'bg-zinc-900 text-zinc-400'
                          }`}
                        >
                          All ({TOTAL_PRO_VFX_COUNT.toLocaleString()})
                        </button>
                        {ACTION_VFX_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setActionVfxCat(cat.id);
                              setActionVfxPage(0);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                              actionVfxCat === cat.id ? 'bg-rose-500 text-white' : 'bg-zinc-900 text-zinc-400'
                            }`}
                          >
                            {cat.label} ({cat.count})
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>
                          {actionVfxResult.total.toLocaleString()} Action VFX · Tap to place on video
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={actionVfxPage === 0}
                            onClick={() => setActionVfxPage((p) => Math.max(0, p - 1))}
                            className="p-1 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-white">P.{actionVfxPage + 1}</span>
                          <button
                            type="button"
                            disabled={(actionVfxPage + 1) * 36 >= actionVfxResult.total}
                            onClick={() => setActionVfxPage((p) => p + 1)}
                            className="p-1 rounded-lg bg-zinc-900 border border-zinc-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {actionVfxResult.items.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handlePlaceActionVfx(preset)}
                            className="p-2 rounded-xl border border-zinc-800 hover:border-rose-400 bg-zinc-900 text-left cursor-pointer transition-colors"
                          >
                            <div
                              className={`w-full h-9 rounded-lg bg-gradient-to-br ${preset.swatch} mb-1 flex items-center justify-between px-2`}
                            >
                              <Crosshair className="w-3.5 h-3.5 text-white/90" />
                              <span className="text-[9px] font-extrabold text-white bg-black/60 px-1.5 py-0.5 rounded">
                                + PLACE
                              </span>
                            </div>
                            <p className="text-[10px] font-extrabold text-white truncate">{preset.name}</p>
                            <p className="text-[9px] text-zinc-400 truncate">{preset.sub}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fullscreen Ambient Scene VFX (300+ Rain, Snow, Glitch, Lens Flare...) */}
                    <div className="pt-2 border-t border-zinc-800 space-y-2">
                      <p className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wide">
                        {isMl
                          ? `മുഴുവൻ സീൻ VFX (${VFX_LIBRARY.length} എണ്ണം)`
                          : `Fullscreen Ambient Scene VFX (${VFX_LIBRARY.length})`}
                      </p>
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {VFX_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setVfxCategory(cat)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                              vfxCategory === cat ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      {selectedClip.vfxId && selectedClip.vfxId !== 'none' && (
                        <div className="flex items-center justify-between gap-3 p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-xs">
                          <span className="text-zinc-300 font-bold">Intensity:</span>
                          <input
                            type="range"
                            min={20}
                            max={180}
                            value={selectedClip.vfxIntensity ?? 100}
                            onChange={(e) => handleUpdateVfxIntensity(Number(e.target.value))}
                            className="flex-1 accent-amber-400"
                          />
                          <span className="font-mono text-amber-400 font-bold">
                            {selectedClip.vfxIntensity ?? 100}%
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {filteredVfx.slice(0, 60).map((vfx) => {
                          const active = (selectedClip.vfxId || 'none') === vfx.id;
                          return (
                            <button
                              key={vfx.id}
                              type="button"
                              onClick={() => handleApplyVfx(vfx.id)}
                              className={`p-2 rounded-xl border text-center cursor-pointer ${
                                active ? 'border-amber-400 bg-amber-500/15' : 'border-zinc-800 bg-zinc-900'
                              }`}
                            >
                              <div
                                className={`w-full h-9 rounded-lg bg-gradient-to-br ${vfx.swatch} mb-1 flex items-center justify-center`}
                              >
                                <span className="text-[10px] font-extrabold text-white bg-black/50 px-1.5 py-0.5 rounded">
                                  {vfx.kind === 'none' ? 'CLEAR' : 'SCENE'}
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-white truncate">{vfx.name}</p>
                              <p className="text-[9px] text-zinc-400 truncate">{vfx.sub}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / PAGE: 121 PREMIERE PRO & DAVINCI RESOLVE STUDIO TOOLS DIRECTORY */}
      {bottomTray === 'allTools' && (
        <div className="fixed inset-0 z-[56] bg-[#07080c] text-zinc-100 flex flex-col overflow-hidden">
          <header className="h-14 px-4 bg-[#0b0d14] border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <LayoutGrid className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-white truncate">
                  {isMl ? '121 പ്രോ സ്റ്റുഡിയോ ഫീച്ചറുകൾ (Premiere & DaVinci)' : '121 Premiere Pro & DaVinci Resolve Tools'}
                </h2>
                <p className="text-[10px] font-mono text-amber-400 truncate">
                  {TOTAL_STUDIO_FEATURES_COUNT.toLocaleString()}+ Effects · 15,000–18,000+ Presets per Category
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBottomTray(null)}
              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isMl ? 'തിരികെ' : 'Back'}</span>
            </button>
          </header>

          <div className="p-3 sm:p-4 bg-[#090a10] border-b border-zinc-800 space-y-2.5 shrink-0">
            <div className="relative max-w-2xl mx-auto">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={toolsSearch}
                onChange={(e) => setToolsSearch(e.target.value)}
                placeholder={
                  isMl
                    ? '121 ടൂളുകളിൽ നിന്ന് തിരയൂ (Chroma Key, Wheels, Gun Smoke, 16:9, Razor, LUTs...)'
                    : 'Search 121 Pro Tools (Color Wheels, Chroma Key, Type Tool, Gun Smoke, 16:9, Razor...)'
                }
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-400 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-5xl mx-auto">
              {toolGroups121.map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setToolsGroupFilter(grp)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                    toolsGroupFilter === grp
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-5">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {filtered121Tools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleLaunch121Tool(tool)}
                  className="p-3 rounded-2xl bg-[#11131b] hover:bg-[#191c28] border border-zinc-800 hover:border-amber-400/70 text-left cursor-pointer transition-all flex items-start justify-between gap-2 group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[9px] font-mono text-amber-400 font-extrabold">
                        #{tool.id}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 truncate">{tool.group}</span>
                    </div>
                    <p className="text-xs font-extrabold text-white group-hover:text-amber-300 truncate">
                      {tool.name}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">
                      Open {tool.target}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL / PAGE: EXPORT HISTORY */}
      {bottomTray === 'history' && (
        <div className="fixed inset-0 z-[55] bg-[#07080c] text-zinc-100 flex flex-col overflow-hidden">
          <header className="h-14 px-4 bg-[#0b0d14] border-b border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-extrabold text-white">
                {isMl ? 'എഡിറ്റ് ചെയ്ത വീഡിയോ ഹിസ്റ്ററി' : 'Exported Video History'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setBottomTray(null)}
              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isMl ? 'തിരികെ' : 'Back to Editor'}</span>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            {exportHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-zinc-400 max-w-sm mx-auto">
                <Film className="w-12 h-12 text-zinc-600" />
                <p className="text-sm font-bold text-white">
                  {isMl ? 'ഇതുവരെ എക്സ്പോർട്ട് ചെയ്ത വീഡിയോകൾ ഇല്ല' : 'No exported videos yet'}
                </p>
                <p className="text-xs">
                  {isMl
                    ? 'വീഡിയോ എഡിറ്റ് ചെയ്ത് Export ചെയ്യുമ്പോൾ അത് ഇവിടെ ഹിസ്റ്ററിയിൽ സേവ് ആകും.'
                    : 'Once you export a video, it will be saved here with instant preview and download.'}
                </p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exportHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-2xl bg-[#11131b] border border-zinc-800 overflow-hidden shadow-xl flex flex-col"
                  >
                    <div className="w-full aspect-video bg-black flex items-center justify-center border-b border-zinc-800">
                      {rec.url ? (
                        <video
                          src={rec.url}
                          controls
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-zinc-500">
                          {isMl ? 'പ്രിവ്യൂ ലഭ്യമല്ല' : 'Preview expired'}
                        </span>
                      )}
                    </div>
                    <div className="p-3 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-white truncate">{rec.name}</p>
                          <p className="text-[11px] font-mono text-zinc-400">
                            {rec.date} · {rec.time} · {rec.resolution} · {rec.sizeMb} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void deleteExportBlobFromIdb(rec.id);
                            setExportHistory((prev) => {
                              const next = prev.filter((x) => x.id !== rec.id);
                              try {
                                localStorage.setItem(
                                  EXPORT_HISTORY_KEY,
                                  JSON.stringify(next.map((x) => ({ ...x, url: '' })))
                                );
                              } catch {}
                              return next;
                            });
                          }}
                          className="p-1.5 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/30 cursor-pointer shrink-0"
                          title={isMl ? 'ഡിലീറ്റ്' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {rec.url && (
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={rec.url}
                            download={rec.name}
                            className="py-2 px-3 rounded-xl bg-emerald-500 text-black text-xs font-extrabold flex items-center justify-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isMl ? 'ഡൗൺലോഡ്' : 'Download'}</span>
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const blob = await getExportBlobFromIdb(rec.id);
                                if (blob) {
                                  const file = new File([blob], rec.name, {
                                    type: blob.type || 'video/mp4',
                                  });
                                  if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                    await navigator.share({ files: [file], title: rec.name });
                                    return;
                                  }
                                }
                              } catch {}
                              const a = document.createElement('a');
                              a.href = rec.url;
                              a.download = rec.name;
                              a.click();
                            }}
                            className="py-2 px-3 rounded-xl bg-white text-black text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>{isMl ? 'ഗാലറിയിൽ സേവ്' : 'Save'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTINUOUS SUPPORT VIDEO SYNCED FOR ENTIRE EXPORT DURATION (STOPS ONLY WHEN EXPORT FINISHES) */}
      <FourSecondExportVideoAd
        open={isExporting}
        activeWhileExporting
        exportProgress={exportProgress}
        exportElapsedSec={exportElapsedSec}
        exportTotalSec={totalDuration}
        resolutionLabel={resolutionLabel}
        onCancelExport={() => {
          exportAbortRef.current = true;
          setIsExporting(false);
        }}
        onComplete={() => {}}
      />

      {/* Hidden Direct Gallery Inputs */}
      <input
        ref={mediaFileInputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        onChange={handleMediaUpload}
        className="hidden"
      />
      <input
        ref={layerImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleAddImageLayer}
        className="hidden"
      />
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleMusicUpload}
        className="hidden"
      />
    </div>
  );
};
