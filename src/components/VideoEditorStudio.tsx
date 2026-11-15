import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
  kind: 'text' | 'caption' | 'sticker' | 'image' | 'doodle';
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
}

interface EditorSnapshot {
  clips: TimelineClip[];
  layers: LayerItem[];
  audioItems: AudioTimelineItem[];
}

type BottomTray =
  | null
  | 'filters'
  | 'vfx'
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
  const presetCss = getFilterCssById(clip.filterId);
  let lutCss = '';
  let lumetriCss = '';

  if (clip.colorGradeEnabled) {
    if (clip.colorLutId && clip.colorLutId !== 'none') {
      const lut = getLutById(clip.colorLutId);
      if (lut?.css) lutCss = lut.css;
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

let offscreenChromaCanvas: HTMLCanvasElement | null = null;
let offscreenChromaCtx: CanvasRenderingContext2D | null = null;

function renderSourceWithChromaKey(
  source: HTMLVideoElement | HTMLImageElement,
  drawW: number,
  drawH: number,
  clip: TimelineClip
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (!offscreenChromaCanvas) {
    offscreenChromaCanvas = document.createElement('canvas');
    offscreenChromaCtx = offscreenChromaCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!offscreenChromaCtx || !offscreenChromaCanvas) return null;

  const targetW = Math.max(64, Math.min(Math.round(Math.abs(drawW)), 640));
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

function drawClipVisual(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  source: HTMLVideoElement | HTMLImageElement | null,
  width: number,
  height: number,
  clipProgress = 0,
  extraFilter = ''
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const combinedFilter = `${buildClipFilterCss(clip)} ${extraFilter}`.trim();
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
    const keyedCanvas = renderSourceWithChromaKey(source, drawW, drawH, clip);
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

  const scaledPx = Math.max(18, Math.round((ly.fontSize / 720) * height));
  const fontFamily =
    ly.fontStyle === 'cinema'
      ? '"Cinzel", Georgia, serif'
      : ly.fontStyle === 'mono'
      ? '"JetBrains Mono", monospace'
      : '"Plus Jakarta Sans", sans-serif';

  const baseY =
    ly.kind === 'caption'
      ? Math.round(height * 0.87)
      : ly.position === 'top'
      ? Math.round(height * (letterbox ? 0.19 : 0.14))
      : ly.position === 'center'
      ? Math.round(height * 0.5)
      : Math.round(height * (letterbox ? 0.81 : 0.85));

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
    const x0 = Math.round(width * 0.08);
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
    return;
  }

  if (tpl === 'news_ticker') {
    ctx.font = `900 ${Math.round(scaledPx * 0.86)}px "Plus Jakarta Sans", sans-serif`;
    const barH = Math.round(scaledPx * 1.45);
    const barY = Math.round(height * 0.84 - barH / 2);
    ctx.fillStyle = color === '#ffffff' ? '#dc2626' : color;
    ctx.fillRect(0, barY, width, barH);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(displayText.toUpperCase(), width / 2, barY + barH * 0.52);
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
  getLayerImage?: (url: string) => HTMLImageElement | null
) {
  ctx.save();
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
        drawClipVisual(ctx, clip, activeSrc, width, height, activeProg);
      }
    } else {
      drawClipVisual(ctx, clip, activeSrc, width, height, activeProg);
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
        const targetH = height * 0.28;
        const targetW = targetH * (imgEl.naturalWidth / imgEl.naturalHeight);
        const yPos =
          ly.position === 'top'
            ? height * 0.08
            : ly.position === 'center'
            ? (height - targetH) / 2
            : height - targetH - height * 0.08;
        ctx.drawImage(imgEl, (width - targetW) / 2, yPos, targetW, targetH);
      }
    } else if (ly.kind === 'sticker' && ly.text) {
      const stickerPx = Math.max(40, Math.round(((ly.fontSize * 1.8) / 720) * height));
      ctx.font = `${stickerPx}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const yPos =
        ly.position === 'top'
          ? Math.round(height * 0.18)
          : ly.position === 'center'
          ? Math.round(height * 0.5)
          : Math.round(height * 0.8);
      ctx.fillText(ly.text, width / 2, yPos);
    } else if (ly.kind === 'text' || ly.kind === 'caption') {
      renderTitleLayer(ctx, ly, width, height, Math.max(0, timelineTime - ly.startTime), letterbox);
    }

    ctx.restore();
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

  const [projectName, setProjectName] = useState<string>('CinePro Project');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? '9:16' : '16:9'
  );
  const [letterbox, setLetterbox] = useState<boolean>(false);
  const [clipsMuted, setClipsMuted] = useState<boolean>(false);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [continuityAppliedToast, setContinuityAppliedToast] = useState<string | null>(null);

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

  // Doodle drawing controls
  const [doodleColor, setDoodleColor] = useState<string>('#f59e0b');
  const [doodleSize, setDoodleSize] = useState<number>(10);
  const [isDrawingDoodle, setIsDrawingDoodle] = useState<boolean>(false);
  const activeDoodleLayerIdRef = useRef<string | null>(null);

  // Filters, Music & SFX Search
  const [sfxCategory, setSfxCategory] = useState<'All' | SfxCategory>('All');
  const [sfxSearch, setSfxSearch] = useState<string>('');
  const [audioTab, setAudioTab] = useState<'free' | 'phone'>('free');
  const [musicCategory, setMusicCategory] = useState<'All' | MusicCategory>('All');
  const [loadingMusicId, setLoadingMusicId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [vfxCategory, setVfxCategory] = useState<string>('All');
  const [vfxSearch, setVfxSearch] = useState<string>('');
  const previewAnimRef = useRef<number | null>(null);
  const [loadingSfxId, setLoadingSfxId] = useState<string | null>(null);
  const [showExportAd, setShowExportAd] = useState<boolean>(false);

  // Voiceover REC
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [voiceRecSec, setVoiceRecSec] = useState<number>(0);
  const [voiceRecError, setVoiceRecError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceStartTimeRef = useRef<number>(0);
  const voiceTimerRef = useRef<number | null>(null);

  // Quality & Mobile Save/Export State (Default 1080p/4K sharp rendering!)
  const [exportResolution, setExportResolution] = useState<ExportResolutionId>('4k');
  const [exportFormat, setExportFormat] = useState<ExportFormatId>('auto');
  const [exportFps, setExportFps] = useState<24 | 30 | 60>(30);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
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
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);
  const layerImageInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imageElementsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const exportAbortRef = useRef<boolean>(false);
  const playheadRef = useRef<number>(0);
  playheadRef.current = playhead;

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

  // High-definition preview buffer matching user quality choice cleanly (razor sharp 1080p for 4K/1080p!)
  const previewDims = useMemo(() => {
    const tier: ExportResolutionId =
      exportResolution === '4k' || exportResolution === '1080p'
        ? '1080p'
        : exportResolution;
    return aspectSpec.dims[tier];
  }, [aspectSpec, exportResolution]);

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
            (url) => imageElementsRef.current.get(url) || null
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
            (url) => imageElementsRef.current.get(url) || null
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
              (url) => imageElementsRef.current.get(url) || null
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
    [findPlacementIndexAt, placements, getCachedSource, layers, letterbox, abCompare]
  );

  // Ensure studio canvas redraws immediately whenever studio workspace opens or toggles A/B compare
  useEffect(() => {
    if (isStudioFullscreen) {
      const id = requestAnimationFrame(() => drawPreviewAt(playheadRef.current));
      return () => cancelAnimationFrame(id);
    }
  }, [isStudioFullscreen, studioTab, abCompare, clips, selectedClipId, drawPreviewAt]);

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
      const id = window.setTimeout(() => drawPreviewAt(playheadRef.current), 30);
      return () => window.clearTimeout(id);
    }
  }, [isPlaying, clips, layers, aspectRatio, letterbox, previewDims, drawPreviewAt]);

  // Multi-Track Synchronized Playback Loop with Pre-Buffering & Dual-Video Transition Sync
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
        setPlayhead(0);
        syncTimelineScrollToTime(0);
        setIsPlaying(false);
        return;
      }

      setPlayhead(currentT);
      syncTimelineScrollToTime(currentT);

      const idx = findPlacementIndexAt(currentT);
      const activeP = idx >= 0 ? placements[idx] : null;
      const prevP = idx > 0 ? placements[idx - 1] : null;
      const nextP = idx >= 0 && idx + 1 < placements.length ? placements[idx + 1] : null;

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
          // Only seek if drift is noticeable (> 0.55s) to ensure buttery smooth playback without stuttering
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

      // Sync Audio / Voice / SFX Tracks
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

  // Upload Video / Photo directly from phone/PC gallery
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsPlaying(false);
    setImportingMedia(true);
    try {
      const files = Array.from(fileList);
      const probed = await Promise.all(files.map((f) => probeMediaFile(f)));
      pushUndo();

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
      };
      setAudioItems((prev) => [...prev, item]);
      setSelectedAudioId(item.id);
      void previewFreeMusic(track);
    } finally {
      setLoadingMusicId(null);
    }
  };

  // Add 1 of 150 SFX
  const handleAddSfxToTimeline = async (sfx: SfxDefinition) => {
    setLoadingSfxId(sfx.id);
    try {
      const { url, duration } = await renderSfxToWavUrl(sfx);
      pushUndo();
      const item: AudioTimelineItem = {
        id: `sfx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        kind: 'sfx',
        name: sfx.name,
        url,
        startTime: Number(playhead.toFixed(2)),
        duration,
        trimStart: 0,
        volume: 0.9,
      };
      setAudioItems((prev) => [...prev, item]);
      setSelectedAudioId(item.id);
      void previewSfx(sfx);
    } finally {
      setLoadingSfxId(null);
    }
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
        const item: AudioTimelineItem = {
          id: `rec_${Date.now()}`,
          kind: 'voice',
          name: isMl ? 'വോയിസ്' : 'Voice',
          url,
          startTime: Number(voiceStartTimeRef.current.toFixed(2)),
          duration: dur,
          trimStart: 0,
          volume: 1,
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

  // Instant Live Pro Title / Caption Creation
  const createOrOpenTextLayer = (kind: 'text' | 'caption') => {
    setIsPlaying(false);
    const existing = layers.find(
      (l) =>
        l.kind === kind &&
        playhead >= l.startTime &&
        playhead <= l.startTime + l.duration
    );
    if (existing) {
      setSelectedLayerId(existing.id);
      setBottomTray(kind === 'caption' ? 'captions' : 'text');
      return;
    }

    pushUndo();
    const ly: LayerItem = {
      id: `${kind}_${Date.now()}`,
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
      startTime: Number(playhead.toFixed(1)),
      duration: Math.max(2.5, Math.min(5, totalDuration - playhead || 4)),
      position: kind === 'caption' ? 'bottom' : 'bottom',
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
      startTime: Number(playhead.toFixed(1)),
      duration: 3.5,
      position: 'center',
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
      startTime: Number(playhead.toFixed(1)),
      duration: 4.5,
      position: 'center',
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

  // Interactive Canvas Doodle Drawing
  const getCanvasNormPoint = (clientX: number, clientY: number) => {
    const c = previewCanvasRef.current;
    if (!c) return { x: 0.5, y: 0.5 };
    const r = c.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width))),
      y: Math.max(0, Math.min(1, (clientY - r.top) / Math.max(1, r.height))),
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (bottomTray !== 'doodles') return;
    setIsPlaying(false);
    const pt = getCanvasNormPoint(e.clientX, e.clientY);
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
        startTime: Number(playhead.toFixed(1)),
        duration: Math.max(3, Math.min(6, totalDuration - playhead || 4)),
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
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingDoodle || bottomTray !== 'doodles') return;
    const id = activeDoodleLayerIdRef.current;
    if (!id) return;
    const pt = getCanvasNormPoint(e.clientX, e.clientY);
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
    exportAbortRef.current = false;

    const dims = aspectSpec.dims[exportResolution];
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
    const bitrateMap: Record<ExportResolutionId, number> = {
      '4k': 35_000_000,
      '1080p': 14_000_000,
      '720p': 8_000_000,
      '480p': 4_000_000,
    };

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

      const stream = new MediaStream([
        ...outCanvas.captureStream(exportFps).getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ]);

      const recOptions: MediaRecorderOptions = { videoBitsPerSecond: bitrateMap[exportResolution] };
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
        (url) => exportImages.get(url) || null
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
            return resolve();
          }

          if (now - lastFrameDraw < minFrameGapMs - 2) {
            requestAnimationFrame(step);
            return;
          }
          lastFrameDraw = now;

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
            (url) => exportImages.get(url) || null
          );
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });

      if (recorder.state !== 'inactive') recorder.stop();
      const blob = await stoppedPromise;

      if (!exportAbortRef.current && blob.size > 0) {
        const cleanProj = projectName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'CineDirector';
        const fileName = `${cleanProj}_${exportResolution.toUpperCase()}_${Date.now()}.${ext}`;
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
          resolution: exportResolution.toUpperCase(),
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
    return FREE_MUSIC_LIBRARY.filter(
      (m) => musicCategory === 'All' || m.category === musicCategory
    );
  }, [musicCategory]);

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
    seekAndDraw(t, false);
  };

  const cycleResolution = () => {
    const order: ExportResolutionId[] = ['4k', '1080p', '720p'];
    const idx = order.indexOf(exportResolution);
    setExportResolution(order[(idx + 1) % order.length]);
  };

  const resolutionLabel =
    exportResolution === '4k' ? '4K UHD' : exportResolution === '1080p' ? '1080p HD' : '720p';

  const hasInlineBottomPanel =
    bottomTray !== null &&
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
      {/* 1. TOP BIGGER TOUCH-FRIENDLY PRO STUDIO HEADER */}
      <header className="h-14 px-3.5 flex items-center justify-between gap-2 bg-[#08090c] border-b border-zinc-900 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onBackToStoryboard();
            }}
            className="w-10 h-10 rounded-full hover:bg-zinc-800 text-zinc-200 flex items-center justify-center cursor-pointer shrink-0"
            title={isMl ? 'തിരികെ' : 'Close Editor'}
          >
            <X className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => setBottomTray('projectSetup')}
            className="flex items-center gap-1 text-sm font-bold text-white hover:text-amber-400 truncate cursor-pointer"
          >
            <span className="truncate max-w-[100px] sm:max-w-[180px]">{projectName}</span>
            <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setBottomTray('history');
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold border bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-amber-500/50 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            title={isMl ? 'എക്സ്പോർട്ട് ഹിസ്റ്ററി' : 'Export History'}
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{isMl ? 'ഹിസ്റ്ററി' : 'History'}</span>
            {exportHistory.length > 0 && (
              <span className="px-1 rounded bg-amber-500 text-black text-[9px] font-extrabold">
                {exportHistory.length}
              </span>
            )}
          </button>

          {clips.length > 0 && (
            <button
              type="button"
              onClick={() => setBottomTray(bottomTray === 'continuity' ? null : 'continuity')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-1 cursor-pointer transition-colors ${
                bottomTray === 'continuity'
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/35 hover:bg-amber-500/20'
              }`}
              title={isMl ? 'സീൻ കണ്ടിന്യൂയിറ്റി' : 'Scene Continuity'}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isMl ? 'കണ്ടിന്യൂയിറ്റി' : 'Continuity'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setBottomTray('projectSetup')}
            className="hidden sm:inline-flex text-xs font-mono font-bold text-zinc-200 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer"
          >
            {aspectRatio}
          </button>

          <button
            type="button"
            onClick={cycleResolution}
            className="text-xs font-extrabold tracking-wide text-amber-400 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer"
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
            className="px-3.5 sm:px-4 py-2 rounded-full bg-white hover:bg-amber-400 disabled:opacity-40 text-black font-extrabold text-xs sm:text-sm flex items-center gap-1 cursor-pointer shadow-md transition-colors"
          >
            <span>{isMl ? 'Export' : 'Export'}</span>
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
            <button
              type="button"
              onClick={() => mediaFileInputRef.current?.click()}
              className="w-full h-full min-w-[210px] min-h-[220px] p-5 flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:bg-[#171923] transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                {importingMedia ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <Plus className="w-7 h-7" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-extrabold text-white">
                  {isMl
                    ? 'വീഡിയോ / ഫോട്ടോ അപ്ലോഡ് ചെയ്യൂ'
                    : 'Upload Videos or Photos'}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {isMl
                    ? `${resolutionLabel} ക്വാളിറ്റിയിൽ എഡിറ്റ് ചെയ്ത് മൊബൈലിൽ സേവ് ചെയ്യാം`
                    : `Edit in crisp ${resolutionLabel} & save directly to phone`}
                </p>
              </div>
            </button>
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
                if (bottomTray !== 'doodles' && clips.length > 0) {
                  setIsPlaying((p) => !p);
                }
              }}
              className="w-full h-full object-contain bg-black touch-none"
            />
          )}

          {bottomTray === 'doodles' && (
            <div className="absolute top-2 inset-x-2 flex justify-center pointer-events-none">
              <span className="px-2.5 py-0.5 rounded-full bg-black/75 text-amber-300 text-[10px] font-bold border border-amber-400/40">
                {isMl ? 'വീഡിയോയുടെ മുകളിൽ വിരൽകൊണ്ട് വരയ്ക്കൂ' : 'Draw directly on frame'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. BIGGER TRANSPORT BAR RIGHT BELOW ROUNDED PREVIEW */}
      <div className="h-14 px-3.5 flex items-center justify-between bg-[#08090c] shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={clips.length === 0 && audioItems.length === 0}
            onClick={() => setIsPlaying((p) => !p)}
            className="w-11 h-11 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 disabled:opacity-35 text-white flex items-center justify-center cursor-pointer shadow-md"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
          </button>

          <button
            type="button"
            disabled={!canSplit}
            onClick={handleSplitAtPlayhead}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-amber-500 hover:text-black disabled:opacity-35 border border-zinc-700 text-zinc-100 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <Scissors className="w-4 h-4" />
            <span>{isMl ? 'കട്ട്' : 'Split'}</span>
          </button>
        </div>

        <div className="flex flex-col items-center leading-tight font-mono">
          <span className="text-sm font-extrabold text-white tabular-nums">
            {formatMmSs(playhead)}
          </span>
          <span className="text-[11px] text-zinc-400 tabular-nums">
            {formatMmSs(totalDuration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={undoStack.length === 0}
            onClick={handleUndo}
            className="w-9 h-9 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 disabled:opacity-30 text-zinc-200 flex items-center justify-center cursor-pointer"
          >
            <Undo2 className="w-5 h-5" />
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
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            type="button"
            disabled={redoStack.length === 0}
            onClick={handleRedo}
            className="w-9 h-9 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 disabled:opacity-30 text-zinc-200 flex items-center justify-center cursor-pointer"
          >
            <Redo2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 4A. BIGGER MULTI-TRACK CENTER-NEEDLE TIMELINE OR 4B. LIVE INLINE BOTTOM STUDIO TRAY */}
      {!hasInlineBottomPanel ? (
        <div className="h-[225px] sm:h-[250px] bg-[#0b0c10] border-t border-zinc-800/80 relative flex shrink-0 overflow-hidden">
          {/* Left Speaker Controls Gutter */}
          <div className="w-11 bg-[#08090c] border-r border-zinc-800/70 flex flex-col justify-around items-center py-2 z-30 shrink-0">
            <button
              type="button"
              onClick={() => setClipsMuted((m) => !m)}
              className="p-2 rounded-lg text-zinc-300 hover:text-white cursor-pointer"
            >
              {clipsMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => setAudioMuted((m) => !m)}
              className="p-2 rounded-lg text-zinc-300 hover:text-white cursor-pointer"
            >
              {audioMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Center White Vertical Playhead Needle */}
          <div
            className="absolute top-0 bottom-0 w-[2.5px] bg-white z-20 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.75)]"
            style={{ left: 'calc(50% + 22px)' }}
          />

          <div
            ref={timelineScrollRef}
            onScroll={handleTimelineScroll}
            className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar relative"
          >
            <div
              className="flex flex-col justify-center gap-2.5 py-3 min-h-full"
              style={{
                paddingLeft: 'calc(50% - 22px)',
                paddingRight: 'calc(50% + 140px)',
                width: 'max-content',
              }}
            >
              {/* Overlays Track */}
              {layers.length > 0 && (
                <div className="relative h-8 flex items-center">
                  {layers.map((ly) => {
                    const leftPx = ly.startTime * PX_PER_SEC;
                    const widthPx = Math.max(88, ly.duration * PX_PER_SEC);
                    const isSel = selectedLayerId === ly.id;
                    return (
                      <button
                        key={ly.id}
                        type="button"
                        onClick={() => {
                          setSelectedLayerId(ly.id);
                          setSelectedClipId(null);
                          setSelectedAudioId(null);
                          seekAndDraw(ly.startTime + 0.05);
                          if (ly.kind === 'text') setBottomTray('text');
                          else if (ly.kind === 'caption') setBottomTray('captions');
                          else if (ly.kind === 'sticker') setBottomTray('sticker');
                          else if (ly.kind === 'doodle') {
                            activeDoodleLayerIdRef.current = ly.id;
                            setBottomTray('doodles');
                          }
                        }}
                        style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                        className={`absolute top-0 bottom-0 rounded-xl px-2.5 text-xs font-bold flex items-center gap-1 truncate cursor-pointer border ${
                          isSel
                            ? 'bg-amber-500 text-black border-white'
                            : 'bg-indigo-600/85 text-white border-indigo-400/50'
                        }`}
                      >
                        <span className="truncate">{ly.text || ly.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bigger Video / Photo Filmstrip Track + Continuity Transition Connectors + Big "+" */}
              <div className="flex items-center gap-1.5 h-20">
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
                          className={`w-8 h-16 rounded-lg border flex items-center justify-center font-mono text-sm font-black cursor-pointer shrink-0 z-10 ${
                            clip.transitionId !== 'none'
                              ? 'bg-white text-black border-amber-400 shadow'
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
                        className={`h-[72px] sm:h-[78px] rounded-xl overflow-hidden border-2 relative cursor-pointer shrink-0 flex bg-zinc-900 ${
                          isSel ? 'border-white ring-2 ring-amber-400/60' : 'border-zinc-700'
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
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-xs text-zinc-400">
                            {clip.name}
                          </div>
                        )}
                        {clip.motionPreset !== 'none' && (
                          <span className="absolute top-1 left-1 text-[9px] font-mono bg-amber-500/95 text-black font-extrabold px-1.5 rounded">
                            CAM
                          </span>
                        )}
                        {clip.vfxId && clip.vfxId !== 'none' && (
                          <span className="absolute top-1 left-11 text-[9px] font-mono bg-fuchsia-600 text-white font-extrabold px-1.5 rounded">
                            VFX
                          </span>
                        )}
                        <span className="absolute bottom-1 right-1 text-[10px] font-mono bg-black/80 text-white px-1.5 rounded">
                          {duration.toFixed(1)}s
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}

                <button
                  type="button"
                  onClick={() => mediaFileInputRef.current?.click()}
                  className="w-14 h-16 ml-2 rounded-2xl bg-white hover:bg-amber-400 text-black flex items-center justify-center shadow-lg cursor-pointer shrink-0 transition-colors"
                  title={isMl ? 'വീഡിയോ / ഫോട്ടോ ചേർക്കുക' : 'Add Video / Photo'}
                >
                  <Plus className="w-7 h-7 stroke-[2.75]" />
                </button>
              </div>

              {/* Bigger Pink/Purple Audio & Free Music Waveform Track */}
              <div className="relative h-11 flex items-center">
                {audioItems.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setBottomTray('audio')}
                    className="h-9 px-4 rounded-xl bg-fuchsia-950/60 hover:bg-fuchsia-900/70 border border-fuchsia-500/50 text-fuchsia-200 text-xs font-extrabold flex items-center gap-2 cursor-pointer"
                  >
                    <Music className="w-4 h-4" />
                    <span>{isMl ? '+ ഫ്രീ മ്യൂസിക് / ഫോൺ പാട്ട് ചേർക്കൂ' : '+ Add Free Music / Phone Song'}</span>
                  </button>
                ) : (
                  audioItems.map((aud) => {
                    const leftPx = aud.startTime * PX_PER_SEC;
                    const widthPx = Math.max(92, Math.round(aud.duration * PX_PER_SEC));
                    const isSel = selectedAudioId === aud.id;
                    return (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => {
                          setSelectedAudioId(aud.id);
                          setSelectedClipId(null);
                          setSelectedLayerId(null);
                        }}
                        style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                        className={`absolute top-0 bottom-0 rounded-xl overflow-hidden px-3 flex items-center gap-2 cursor-pointer border ${
                          isSel
                            ? 'bg-fuchsia-600 text-white border-white'
                            : 'bg-fuchsia-700/85 text-white border-fuchsia-400/50'
                        }`}
                      >
                        <span className="text-xs font-bold truncate z-10">{aud.name}</span>
                        <div className="ml-auto flex items-end gap-[2px] h-5 opacity-75">
                          {[40, 85, 55, 100, 65, 90, 45].map((h, i) => (
                            <span
                              key={i}
                              className="w-[2.5px] bg-white rounded-full"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LIVE BOTTOM TOOL PANEL (Keeps Video Visible Above!) */
        <div className="h-[245px] sm:h-[260px] bg-[#11131b] border-t border-zinc-800 flex flex-col shrink-0">
          <div className="px-3.5 py-2 border-b border-zinc-800 flex items-center justify-between gap-2 bg-[#0d0e14] shrink-0">
            <span className="text-xs font-extrabold text-white">
              {bottomTray === 'filters' && (isMl ? `പ്രോ ഫിൽട്ടറുകൾ (${FILTER_LIBRARY.length})` : `Pro Color Filters (${FILTER_LIBRARY.length})`)}
              {bottomTray === 'vfx' && (isMl ? `വിഎഫ്എക്സ് പ്രോ എഫക്റ്റുകൾ (${VFX_LIBRARY.length})` : `Pro VFX Effects (${VFX_LIBRARY.length})`)}
              {bottomTray === 'motion' && (isMl ? `ക്യാമറ മോഷൻ (${MOTION_PRESETS.length})` : `Cinema Camera Motion (${MOTION_PRESETS.length})`)}
              {bottomTray === 'continuity' && (isMl ? 'സീൻ കണ്ടിന്യൂയിറ്റി & സ്മൂത്ത് കട്ട്' : 'Auto Scene Continuity Engine')}
              {bottomTray === 'adjust' && (isMl ? 'കളർ, ട്രിം & വോളിയം' : 'Adjust & Micro-Trim')}
              {bottomTray === 'text' && (isMl ? `${TITLE_TEMPLATES.length} പ്രോ ടൈറ്റിലുകൾ (ലൈവ് പ്രിവ്യൂ)` : `${TITLE_TEMPLATES.length} Pro Title Templates`)}
              {bottomTray === 'captions' && (isMl ? 'സബ്ടൈറ്റിൽ / ക്യാപ്ഷൻ' : 'Captions (Live)')}
              {bottomTray === 'sticker' && (isMl ? 'സ്റ്റിക്കറുകൾ' : 'Stickers')}
              {bottomTray === 'doodles' && (isMl ? 'സ്ക്രീനിൽ വരയ്ക്കൂ' : 'Draw Doodles')}
              {bottomTray === 'cutout' && (isMl ? 'ക്രോപ്പ് / ഫിറ്റ് / റൊട്ടേറ്റ്' : 'Fit, Rotate & Cinema Bars')}
              {bottomTray === 'speed' && (isMl ? 'സ്പീഡ് (0.5x - 2x)' : 'Playback Speed')}
              {bottomTray === 'audio' && (isMl ? `${FREE_MUSIC_LIBRARY.length} ഫ്രീ പാട്ടുകൾ & ഫോൺ മ്യൂസിക്` : `${FREE_MUSIC_LIBRARY.length} Free Music & Phone Songs`)}
              {bottomTray === 'sfx' && (isMl ? `${SFX_LIBRARY.length} സൗണ്ട് എഫക്റ്റുകൾ` : `${SFX_LIBRARY.length} Sound Effects`)}
              {bottomTray === 'voice' && (isMl ? 'ലൈവ് വോയിസ് റെക്കോർഡ്' : 'Voiceover Recorder')}
              {bottomTray === 'transitions' && (isMl ? `സീൻ ട്രാൻസിഷൻ (${TRANSITION_LIBRARY.length} Effects)` : `Continuity Transitions (${TRANSITION_LIBRARY.length})`)}
            </span>
            <button
              type="button"
              onClick={() => setBottomTray(null)}
              className="px-3 py-1 rounded-full bg-white text-black font-extrabold text-[11px] flex items-center gap-1 cursor-pointer"
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

            {/* CAMERA MOTION PRESETS */}
            {bottomTray === 'motion' && selectedClip && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MOTION_PRESETS.map((m) => {
                  const active = selectedClip.motionPreset === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleApplyMotion(m.id)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer ${
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

            {/* 150+ FILTERS */}
            {bottomTray === 'filters' && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder={isMl ? 'ഫിൽട്ടർ തിരയുക (Kochi, Cinema, Noir)...' : 'Search 150+ filters...'}
                    className="w-44 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {FILTER_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFilterCategory(cat)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                          filterCategory === cat ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {filteredFilters.map((f) => {
                    const active = selectedClip?.filterId === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleApplyFilter(f.id)}
                        className={`w-20 shrink-0 p-1.5 rounded-xl border text-center cursor-pointer ${
                          active ? 'border-white bg-white/10' : 'border-zinc-800 bg-zinc-900/70'
                        }`}
                      >
                        <div className={`w-full h-11 rounded-lg bg-gradient-to-br ${f.swatch} mb-1`} style={{ filter: f.css }} />
                        <p className="text-[10px] font-bold text-white truncate">{f.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 300 PRO VFX VISUAL EFFECTS */}
            {bottomTray === 'vfx' && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative w-44 shrink-0">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={vfxSearch}
                      onChange={(e) => setVfxSearch(e.target.value)}
                      placeholder={isMl ? 'VFX തിരയുക (Sunburst, Rain, Sparks)...' : `Search ${VFX_LIBRARY.length} VFX...`}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {VFX_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setVfxCategory(cat)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                          vfxCategory === cat ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedClip && selectedClip.vfxId && selectedClip.vfxId !== 'none' && (
                  <div className="flex items-center justify-between gap-3 px-2.5 py-1.5 bg-zinc-900/90 rounded-xl border border-zinc-800 text-xs">
                    <span className="text-zinc-300 font-bold">
                      {isMl ? 'VFX തീവ്രത (Intensity):' : 'VFX Intensity:'}
                    </span>
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <input
                        type="range"
                        min={20}
                        max={180}
                        value={selectedClip.vfxIntensity ?? 100}
                        onChange={(e) => handleUpdateVfxIntensity(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                      <span className="font-mono text-amber-400 font-bold w-12 text-right">
                        {selectedClip.vfxIntensity ?? 100}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {filteredVfx.map((vfx) => {
                    const active = (selectedClip?.vfxId || 'none') === vfx.id;
                    return (
                      <button
                        key={vfx.id}
                        type="button"
                        onClick={() => handleApplyVfx(vfx.id)}
                        className={`w-24 shrink-0 p-1.5 rounded-xl border text-center cursor-pointer transition-all ${
                          active
                            ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/50 shadow-md'
                            : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-full h-11 rounded-lg bg-gradient-to-br ${vfx.swatch} mb-1 flex items-center justify-center shadow-inner relative overflow-hidden`}
                        >
                          {active && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
                          )}
                          <span className="text-[10px] font-extrabold text-white bg-black/50 px-1.5 py-0.5 rounded">
                            {vfx.kind === 'none' ? 'CLEAR' : 'VFX'}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-white truncate">{vfx.name}</p>
                        <p className="text-[9px] text-zinc-400 truncate">{vfx.sub}</p>
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

            {/* 12 PRO TITLE TEMPLATES & LIVE EDITOR */}
            {(bottomTray === 'text' || bottomTray === 'captions') && selectedLayer && (
              <div className="space-y-2.5">
                {bottomTray === 'text' && (
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

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {(['top', 'center', 'bottom'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          setLayers((prev) =>
                            prev.map((l) => (l.id === selectedLayer.id ? { ...l, position: pos } : l))
                          )
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer ${
                          selectedLayer.position === pos ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>

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
                    className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 text-xs font-bold cursor-pointer"
                  >
                    {isMl ? 'ഡിലീറ്റ്' : 'Delete'}
                  </button>
                </div>
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

            {/* AUDIO: 24 FREE BUILT-IN ROYALTY-FREE SONGS + PHONE SONGS */}
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
                    {isMl ? `ഫ്രീ മ്യൂസിക് (${FREE_MUSIC_LIBRARY.length})` : `Free Songs (${FREE_MUSIC_LIBRARY.length})`}
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
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      {MUSIC_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setMusicCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                            musicCategory === cat ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {filteredMusic.map((trk) => (
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

            {/* 150 SOUND FX */}
            {bottomTray === 'sfx' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative w-44 shrink-0">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={sfxSearch}
                      onChange={(e) => setSfxSearch(e.target.value)}
                      placeholder={`Search ${SFX_LIBRARY.length} SFX...`}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {SFX_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSfxCategory(cat)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                          sfxCategory === cat ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {filteredSfx.map((sfx) => (
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

            {/* 26 CONTINUITY & CINEMA TRANSITIONS */}
            {bottomTray === 'transitions' && (
              <div className="space-y-2">
                {selectedTransitionClip ? (
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
                ) : (
                  <p className="text-xs text-zinc-400">
                    {isMl
                      ? '2 ക്ലിപ്പുകൾക്കിടയിലുള്ള "|" ബട്ടൺ ടാപ്പ് ചെയ്ത് ട്രാൻസിഷൻ മാറ്റാം, അല്ലെങ്കിൽ ഓട്ടോ കണ്ടിന്യൂയിറ്റി ഉപയോഗിക്കൂ.'
                      : 'Tap "|" between two clips to change transition, or use Auto Continuity.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. BIGGER BOTTOM HORIZONTAL PRO TOOLBAR */}
      <nav className="bg-[#08090c] border-t border-zinc-800 px-2.5 py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {[
          {
            id: 'split',
            icon: Scissors,
            label: isMl ? 'കട്ട്' : 'Split',
            active: false,
            disabled: !canSplit,
            onClick: handleSplitAtPlayhead,
          },
          {
            id: 'continuity',
            icon: ArrowLeftRight,
            label: isMl ? 'കണ്ടിന്യൂയിറ്റി' : 'Continuity',
            active: bottomTray === 'continuity',
            disabled: clips.length === 0,
            onClick: () => setBottomTray(bottomTray === 'continuity' ? null : 'continuity'),
          },
          {
            id: 'motion',
            icon: Move,
            label: isMl ? `മോഷൻ (${MOTION_PRESETS.length})` : `Motion (${MOTION_PRESETS.length})`,
            active: bottomTray === 'motion',
            disabled: !selectedClip,
            onClick: () => setBottomTray(bottomTray === 'motion' ? null : 'motion'),
          },
          {
            id: 'filters',
            icon: Wand2,
            label: isMl ? `ഫിൽട്ടർ (${FILTER_LIBRARY.length})` : `Filters (${FILTER_LIBRARY.length})`,
            active: bottomTray === 'filters',
            disabled: clips.length === 0,
            onClick: () => setBottomTray(bottomTray === 'filters' ? null : 'filters'),
          },
          {
            id: 'vfx',
            icon: Flame,
            label: isMl ? `VFX (${VFX_LIBRARY.length})` : `VFX (${VFX_LIBRARY.length})`,
            active: bottomTray === 'vfx',
            disabled: clips.length === 0,
            onClick: () => setBottomTray(bottomTray === 'vfx' ? null : 'vfx'),
          },
          {
            id: 'adjust',
            icon: Sliders,
            label: isMl ? 'അഡ്ജസ്റ്റ്' : 'Adjust',
            active: bottomTray === 'adjust',
            disabled: !selectedClip,
            onClick: () => setBottomTray(bottomTray === 'adjust' ? null : 'adjust'),
          },
          {
            id: 'text',
            icon: Type,
            label: isMl ? `ടൈറ്റിൽ (${TITLE_TEMPLATES.length})` : `Titles (${TITLE_TEMPLATES.length})`,
            active: bottomTray === 'text',
            disabled: false,
            onClick: () => createOrOpenTextLayer('text'),
          },
          {
            id: 'audio',
            icon: Music,
            label: isMl ? 'മ്യൂസിക്' : 'Songs',
            active: bottomTray === 'audio',
            disabled: false,
            onClick: () => setBottomTray(bottomTray === 'audio' ? null : 'audio'),
          },
          {
            id: 'voice',
            icon: Mic,
            label: isMl ? 'വോയിസ്' : 'Voice',
            active: bottomTray === 'voice' || isRecordingVoice,
            disabled: false,
            onClick: () => setBottomTray(bottomTray === 'voice' ? null : 'voice'),
          },
          {
            id: 'sfx',
            icon: Sparkles,
            label: `SFX (${SFX_LIBRARY.length})`,
            active: bottomTray === 'sfx',
            disabled: false,
            onClick: () => setBottomTray(bottomTray === 'sfx' ? null : 'sfx'),
          },
          {
            id: 'overlay',
            icon: Layers,
            label: isMl ? 'ഓവർലേ' : 'Overlay',
            active: false,
            disabled: false,
            onClick: () => layerImageInputRef.current?.click(),
          },
          {
            id: 'captions',
            icon: Captions,
            label: 'Captions',
            active: bottomTray === 'captions',
            disabled: false,
            onClick: () => createOrOpenTextLayer('caption'),
          },
          {
            id: 'doodles',
            icon: PenTool,
            label: 'Doodles',
            active: bottomTray === 'doodles',
            disabled: clips.length === 0,
            onClick: () => setBottomTray(bottomTray === 'doodles' ? null : 'doodles'),
          },
          {
            id: 'cutout',
            icon: Crop,
            label: 'Cutout',
            active: bottomTray === 'cutout',
            disabled: !selectedClip,
            onClick: () => setBottomTray(bottomTray === 'cutout' ? null : 'cutout'),
          },
          {
            id: 'sticker',
            icon: Smile,
            label: 'Sticker',
            active: bottomTray === 'sticker',
            disabled: false,
            onClick: () => setBottomTray(bottomTray === 'sticker' ? null : 'sticker'),
          },
          {
            id: 'speed',
            icon: Zap,
            label: 'Speed',
            active: bottomTray === 'speed',
            disabled: !selectedClip,
            onClick: () => setBottomTray(bottomTray === 'speed' ? null : 'speed'),
          },
          {
            id: 'paste',
            icon: Copy,
            label: 'Paste',
            active: false,
            disabled: !selectedClip,
            onClick: () => selectedClip && handleDuplicateClip(selectedClip),
          },
          {
            id: 'delete',
            icon: Trash2,
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
              className={`min-w-[74px] py-2.5 px-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors disabled:opacity-30 ${
                btn.active
                  ? 'bg-white text-black font-extrabold'
                  : 'text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[11px] font-bold whitespace-nowrap">{btn.label}</span>
            </button>
          );
        })}
      </nav>



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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  {isMl ? '4K / HD വീഡിയോ മൊബൈലിൽ സേവ്' : 'Save High-Quality Video to Phone'}
                </h3>
                <p className="text-[11px] font-mono text-zinc-400">
                  {aspectRatio} · {aspectSpec.dims[exportResolution].width}×{aspectSpec.dims[exportResolution].height} · {exportFps}fps
                </p>
              </div>
              {!isExporting && (
                <button type="button" onClick={() => setBottomTray(null)} className="text-zinc-400 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: '4k' as const, title: '4K Ultra HD', sub: '2160p · 35 Mbps Pro' },
                { id: '1080p' as const, title: '1080p Full HD', sub: '1080p · 14 Mbps' },
                { id: '720p' as const, title: '720p HD', sub: '720p · 8 Mbps' },
                { id: '480p' as const, title: '480p Fast', sub: '480p · 4 Mbps' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isExporting}
                  onClick={() => setExportResolution(opt.id)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                    exportResolution === opt.id
                      ? 'bg-white text-black border-white'
                      : 'bg-[#0b0c10] border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="text-xs font-extrabold">{opt.title}</div>
                  <div className="text-[10px] font-mono opacity-80">{opt.sub}</div>
                </button>
              ))}
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

            {isExporting && (
              <div className="p-3 rounded-xl bg-[#0b0c10] border border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white font-bold">
                    {isMl ? `${exportResolution.toUpperCase()} പ്രോ വീഡിയോ തയ്യാറാകുന്നു...` : `Rendering ${exportResolution.toUpperCase()}...`}
                  </span>
                  <span className="text-amber-400 font-extrabold tabular-nums">{exportProgress}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all" style={{ width: `${exportProgress}%` }} />
                </div>
              </div>
            )}

            {exportError && <p className="text-xs text-red-400">{exportError}</p>}

            {exportedDownload && !isExporting && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                <p className="text-xs font-bold text-emerald-300">
                  ✅ {exportResolution.toUpperCase()} Ready ({exportedDownload.sizeMb} MB)
                </p>
                <video
                  src={exportedDownload.url}
                  controls
                  playsInline
                  className="w-full max-h-40 rounded-lg bg-black border border-zinc-800"
                />
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={exportedDownload.url}
                    download={exportedDownload.fileName}
                    className="py-2 px-3 rounded-lg bg-emerald-500 text-black text-xs font-extrabold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isMl ? 'ഡൗൺലോഡ്' : 'Download'}</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleMobileSaveShare}
                    className="py-2 px-3 rounded-lg bg-white text-black text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isMl ? 'ഗാലറിയിൽ സേവ്' : 'Save to Phone'}</span>
                  </button>
                </div>
              </div>
            )}

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
                onClick={() => setShowExportAd(true)}
                className="w-full py-3.5 rounded-full bg-white hover:bg-amber-400 text-black font-extrabold text-sm cursor-pointer shadow-lg"
              >
                {isMl ? `വീഡിയോ സേവ് ചെയ്യുക (${exportResolution.toUpperCase()})` : `Export ${exportResolution.toUpperCase()} Video`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4-SECOND SKIPPABLE VIDEO AD ONLY AT EXPORT MOMENT -> AUTOMATICALLY PROCEEDS TO 4K RENDER */}
      <FourSecondExportVideoAd
        open={showExportAd}
        onComplete={() => {
          setShowExportAd(false);
          void handleStartExport();
        }}
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
