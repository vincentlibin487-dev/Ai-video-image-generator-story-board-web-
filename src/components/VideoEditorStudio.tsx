import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Camera,
  Scissors,
  Crop,
  Type,
  Trash2,
  Undo2,
  Redo2,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Download,
  Upload,
  FolderOpen,
  Search,
  Settings,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Film,
  Music,
  Layers,
  Video,
  Mic,
  Flame,
  Smile,
  Share2,
  HelpCircle,
  X,
  Check,
  User,
  RefreshCw,
  Palette,
  RotateCw,
  Copy,
  Wand2,
  Image as ImageIcon,
  FileText,
  Clock,
  ArrowLeft,
  Home,
  LayoutGrid,
  Smartphone,
  Split,
  Tv,
  CheckCircle2,
  Monitor,
  Clapperboard,
  Compass,
  PlayCircle,
  Sparkle,
  Calendar,
  Gauge,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  Zap,
  FastForward,
  Crosshair,
  Target,
  Move,
  ChevronsUpDown,
  ShieldCheck,
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { AppLang } from '../lib/i18n';
import { recordVideoEditorActivity, type VideoEditActionType } from '../lib/analytics';
import {
  deleteLocalMediaRecord,
  getAllLocalMediaRecords,
  saveLocalMediaRecord,
  updateLocalMediaMetadata,
} from '../lib/localMediaDb';
import {
  canShareMediaFile,
  safeSetLocalStorage,
  shareMediaBlobToDevice,
  triggerLocalBlobDownload,
  tryLockLandscapeOrientation,
  unlockScreenOrientation,
} from '../lib/deviceEnvironment';
import { EditorBottomVideoAdBar, ExportModalVideoAdPlayer } from './AdsterraAds';
import {
  CircularToolWheel,
  WHEEL_CATEGORIES,
  type WheelCategoryItem,
  type EditorToolTab,
} from './CircularToolWheel';
import {
  FILTERS_LIST,
  AUDIO_LIST,
  TRANSITIONS_LIST,
  EFFECTS_LIST,
  TITLES_LIST,
  TEMPLATES_LIST,
  STICKERS_LIST,
  COLOR_GRADES_LIST,
  VFX_LIST,
  VFX_CATEGORIES,
  type FilterItem,
  type AudioItem,
  type TransitionItem,
  type EffectItem,
  type TitleItem,
  type TemplateItem,
  type MediaItem,
  type StickerItem,
  type ColorGradePreset,
  type CinemaVfxItem,
} from './videoStudioLibrary';
import {
  PRO_EDITOR_FEATURES,
  PRO_FEATURE_CATEGORIES,
  PRO_SETTING_MODULES,
  buildFeatureSettingsCatalog,
  computeProRenderDeltas,
  type ProEditorFeature,
} from './proEditorFeatures';
import {
  DEFAULT_CHROMA_KEY_CONFIG,
  DEFAULT_SPLIT_SCREEN_CONFIG,
  TRAILER_CARD_ANIMATIONS,
  TRAILER_CARD_THEMES,
  TRAILER_FX_OPTIONS,
  TRAILER_PRESET_PACKS,
  TRAILER_TITLE_ANIMATIONS,
  TRAILER_TITLE_THEMES,
  drawAnimatedCinemaTitle,
  drawChromaBackground,
  drawChromaKeyedSource,
  drawSplitScreenComposition,
  drawTrailerCardOnCanvas,
  drawTrailerFxOverlay,
  type ChromaBgMode,
  type ChromaKeyColorPreset,
  type ChromaKeyConfig,
  type SplitLayoutType,
  type SplitScreenConfig,
  type TitleAnimationType,
  type TitleThemeType,
  type TrailerCardAnimation,
  type TrailerCardLayer,
  type TrailerCardTheme,
  type TrailerFxMode,
} from '../lib/studioAdvancedFx';
import {
  computeRequestedExportDimensions,
  probeSupportedVideoEncoderConfig,
  runWebCodecsMp4Export,
  waitForVideoSeekReady,
  type ExportAudioSourceClip,
} from '../lib/mp4ExportEngine';

export interface VideoEditorStudioProps {
  lang: AppLang;
  currentUser?: FirebaseUser | null;
  onBackToStoryboard: () => void;
  onOpenTerms?: () => void;
}

export type AspectRatioType = '16:9' | '9:16' | '1:1' | '4:5' | '21:9' | '4:3';

interface AspectRatioOption {
  id: AspectRatioType;
  label: string;
  sublabel: string;
  description: string;
  width: number;
  height: number;
  iconWidthClass: string;
  iconHeightClass: string;
}

const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  {
    id: '16:9',
    label: '16:9 Widescreen',
    sublabel: 'YouTube / Cinema / TV',
    description: '1920 × 1080 Full HD',
    width: 1280,
    height: 720,
    iconWidthClass: 'w-11',
    iconHeightClass: 'h-6',
  },
  {
    id: '9:16',
    label: '9:16 Vertical',
    sublabel: 'Reels / Shorts / TikTok',
    description: '1080 × 1920 Mobile',
    width: 720,
    height: 1280,
    iconWidthClass: 'w-6',
    iconHeightClass: 'h-10',
  },
  {
    id: '1:1',
    label: '1:1 Square',
    sublabel: 'Instagram / Facebook Post',
    description: '1080 × 1080 Square',
    width: 1080,
    height: 1080,
    iconWidthClass: 'w-8',
    iconHeightClass: 'h-8',
  },
  {
    id: '4:5',
    label: '4:5 Portrait',
    sublabel: 'Instagram Feed / Social',
    description: '1080 × 1350 Portrait',
    width: 864,
    height: 1080,
    iconWidthClass: 'w-7',
    iconHeightClass: 'h-9',
  },
  {
    id: '21:9',
    label: '21:9 Ultra-Wide',
    sublabel: 'CinemaScope Movie',
    description: '2560 × 1080 Anamorphic',
    width: 1680,
    height: 720,
    iconWidthClass: 'w-14',
    iconHeightClass: 'h-6',
  },
  {
    id: '4:3',
    label: '4:3 Standard',
    sublabel: 'Classic TV / Presentation',
    description: '1440 × 1080 Standard',
    width: 960,
    height: 720,
    iconWidthClass: 'w-8',
    iconHeightClass: 'h-6',
  },
];

// Timeline clip
export interface TimelineClip {
  id: string;
  mediaId?: string;
  title: string;
  durationSec: number;
  sourceStartSec?: number;
  url: string;
  thumbnailUrl?: string;
  type: 'video' | 'photo';
}

export interface TimelineStickerLayer {
  id: string;
  sticker: StickerItem;
  startTimeSec: number;
  durationSec: number;
  xPct: number;
  yPct: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface TimelineVfxLayer {
  id: string;
  vfx: CinemaVfxItem;
  startTimeSec: number;
  durationSec: number;
  startXPct: number;
  startYPct: number;
  endXPct: number;
  endYPct: number;
  scale: number;
  opacity: number;
  speed: number;
  includeImpactBlood: boolean;
}

// Procedural Cinema VFX Canvas Renderer shared by Preview Canvas and Video Exporter
const drawCinemaVfxOnCanvas = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  layer: TimelineVfxLayer,
  globalTimeSec: number,
  forcePreviewProgress?: number
) => {
  const dur = Math.max(0.2, layer.durationSec / Math.max(0.25, layer.speed || 1));
  let prog = forcePreviewProgress;
  if (prog === undefined) {
    if (globalTimeSec < layer.startTimeSec || globalTimeSec > layer.startTimeSec + dur) {
      return;
    }
    prog = Math.max(0, Math.min(1, (globalTimeSec - layer.startTimeSec) / dur));
  }

  const sx = (layer.startXPct / 100) * w;
  const sy = (layer.startYPct / 100) * h;
  const ex = (layer.endXPct / 100) * w;
  const ey = (layer.endYPct / 100) * h;
  const dx = ex - sx;
  const dy = ey - sy;
  const angle = Math.atan2(dy, dx);
  const unit = Math.min(w, h) * 0.08 * (layer.scale || 1);
  const kind = layer.vfx.kind;

  ctx.save();
  ctx.filter = 'none';
  ctx.globalAlpha = Math.max(0, Math.min(1, (layer.opacity ?? 100) / 100));

  const drawMuzzleBurst = (mx: number, my: number, dirAngle: number, strength: number, radScale: number) => {
    if (strength <= 0.02) return;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(dirAngle);
    ctx.globalCompositeOperation = 'screen';
    const r = unit * 1.45 * radScale;
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.4);
    g.addColorStop(0, `rgba(255,255,255,${0.95 * strength})`);
    g.addColorStop(0.35, `rgba(253,224,71,${0.85 * strength})`);
    g.addColorStop(0.7, `rgba(249,115,22,${0.45 * strength})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Star flame petals
    ctx.fillStyle = `rgba(254,240,138,${0.9 * strength})`;
    for (let k = 0; k < 7; k++) {
      const a = (k - 3) * 0.32;
      const len = r * (k === 3 ? 1.8 : 0.95 + (k % 2) * 0.35);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - 0.14) * (len * 0.3), Math.sin(a - 0.14) * (len * 0.3));
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.lineTo(Math.cos(a + 0.14) * (len * 0.3), Math.sin(a + 0.14) * (len * 0.3));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  const drawBloodSpray = (bx: number, by: number, sprayAngle: number, bp: number) => {
    if (bp <= 0) return;
    const alpha = bp < 0.8 ? 1 : Math.max(0, (1 - bp) / 0.2);
    ctx.save();
    ctx.translate(bx, by);
    // Mist burst at entry wound
    const mistR = unit * (0.6 + bp * 1.8);
    const mg = ctx.createRadialGradient(0, 0, 1, 0, 0, mistR);
    mg.addColorStop(0, `rgba(185, 28, 28, ${0.85 * alpha})`);
    mg.addColorStop(0.5, `rgba(127, 29, 29, ${0.55 * alpha})`);
    mg.addColorStop(1, 'rgba(69, 10, 10, 0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(0, 0, mistR, 0, Math.PI * 2);
    ctx.fill();

    // Directional crimson arterial droplets + gravity fall
    for (let i = 0; i < 20; i++) {
      const spread = ((i % 9) - 4) * 0.24;
      const a = sprayAngle + spread + (i % 3 === 0 ? Math.PI : 0) * 0.12;
      const spd = 0.55 + ((i * 37) % 10) * 0.16;
      const dist = unit * spd * (0.3 + bp * 2.5);
      const gx = Math.cos(a) * dist;
      const gy = Math.sin(a) * dist + bp * bp * unit * 0.9;
      const dropR = Math.max(1.5, unit * (0.09 + (i % 4) * 0.045) * (1 - bp * 0.35));
      ctx.fillStyle = i % 3 === 0 ? `rgba(220, 38, 38, ${0.95 * alpha})` : `rgba(127, 29, 29, ${0.9 * alpha})`;
      ctx.beginPath();
      ctx.ellipse(gx, gy, dropR * 1.35, dropR * 0.85, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  if (kind === 'bullet_tracer') {
    // Stage 1: Gun Muzzle Flash at Start (Gun Barrel)
    if (prog < 0.32) {
      drawMuzzleBurst(sx, sy, angle, 1 - prog / 0.32, 1.0);
    }
    // Stage 2: High-velocity glowing bullet + supersonic shockwave flying Start -> End
    const travelT = Math.min(1, prog / 0.65);
    const bx = sx + dx * travelT;
    const by = sy + dy * travelT;
    if (prog <= 0.72) {
      const tailLen = Math.min(Math.hypot(dx, dy) * 0.35, unit * 3.5);
      const tx = bx - Math.cos(angle) * tailLen;
      const ty = by - Math.sin(angle) * tailLen;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const trailGrad = ctx.createLinearGradient(tx, ty, bx, by);
      trailGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
      trailGrad.addColorStop(0.6, 'rgba(249, 115, 22, 0.85)');
      trailGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = Math.max(2, unit * 0.16);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Solid brass/glowing bullet slug
      ctx.translate(bx, by);
      ctx.rotate(angle);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(0, 0, unit * 0.24, unit * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Stage 3: Impact Flash + Blood Splatter right at Character Body (End X/Y)
    if (prog >= 0.55) {
      const impP = (prog - 0.55) / 0.45;
      if (impP < 0.35) {
        drawMuzzleBurst(ex, ey, angle + Math.PI, 0.75 * (1 - impP / 0.35), 0.7);
      }
      if (layer.includeImpactBlood) {
        drawBloodSpray(ex, ey, angle, impP);
      }
    }
  } else if (kind === 'muzzle_flash') {
    const fade = prog < 0.25 ? prog / 0.25 : Math.max(0, 1 - (prog - 0.25) / 0.75);
    drawMuzzleBurst(sx, sy, angle, fade, 1.35);
    // Gunsmoke puff fading outward
    ctx.fillStyle = `rgba(203, 213, 225, ${0.32 * (1 - prog)})`;
    ctx.beginPath();
    ctx.arc(sx + Math.cos(angle) * unit * prog * 1.4, sy + Math.sin(angle) * unit * prog * 1.4, unit * (0.5 + prog * 1.5), 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'blood_splatter') {
    const targetX = layer.vfx.hasMotionRoute ? ex : sx;
    const targetY = layer.vfx.hasMotionRoute ? ey : sy;
    drawBloodSpray(targetX, targetY, angle, prog);
  } else if (kind === 'explosion' || kind === 'fireball') {
    const cx = layer.vfx.hasMotionRoute ? sx + dx * Math.min(1, prog * 1.15) : sx;
    const cy = layer.vfx.hasMotionRoute ? sy + dy * Math.min(1, prog * 1.15) : sy;
    const alpha = prog < 0.8 ? 1 : (1 - prog) / 0.2;
    const blastR = unit * (0.6 + prog * 2.8);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const fg = ctx.createRadialGradient(cx, cy, 2, cx, cy, blastR);
    fg.addColorStop(0, `rgba(255, 255, 255, ${0.95 * alpha})`);
    fg.addColorStop(0.25, `rgba(253, 224, 71, ${0.9 * alpha})`);
    fg.addColorStop(0.6, `rgba(234, 88, 12, ${0.65 * alpha})`);
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(cx, cy, blastR, 0, Math.PI * 2);
    ctx.fill();
    // Flying embers
    for (let e = 0; e < 18; e++) {
      const ea = (e / 18) * Math.PI * 2 + prog * 0.4;
      const er = blastR * (0.45 + ((e * 17) % 7) * 0.14);
      ctx.fillStyle = `rgba(251, 191, 36, ${0.9 * alpha})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ea) * er, cy + Math.sin(ea) * er, Math.max(2, unit * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (kind === 'sparks') {
    const alpha = 1 - prog;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let k = 0; k < 22; k++) {
      const a = angle + ((k % 11) - 5) * 0.26;
      const dist = unit * (0.4 + prog * (1.8 + (k % 5) * 0.5));
      const px = sx + Math.cos(a) * dist;
      const py = sy + Math.sin(a) * dist + prog * prog * unit * 0.8;
      ctx.strokeStyle = `rgba(254, 240, 138, ${alpha})`;
      ctx.lineWidth = Math.max(1.5, unit * 0.05);
      ctx.beginPath();
      ctx.moveTo(px - Math.cos(a) * unit * 0.25, py - Math.sin(a) * unit * 0.25);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
    ctx.restore();
  } else if (kind === 'smoke') {
    const alpha = Math.sin(prog * Math.PI) * 0.55;
    for (let sIdx = 0; sIdx < 7; sIdx++) {
      const ox = sx + Math.cos(sIdx * 1.1) * unit * (0.4 + prog * 1.1);
      const oy = sy + Math.sin(sIdx * 1.3) * unit * 0.4 - prog * unit * (0.7 + sIdx * 0.15);
      const sr = unit * (0.8 + prog * 1.4);
      const sg = ctx.createRadialGradient(ox, oy, 2, ox, oy, sr);
      sg.addColorStop(0, `rgba(226, 232, 240, ${alpha})`);
      sg.addColorStop(1, 'rgba(100, 116, 139, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(ox, oy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'lightning') {
    const alpha = prog < 0.7 ? 1 : (1 - prog) / 0.3;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(186, 230, 253, ${alpha})`;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;
    ctx.lineWidth = Math.max(3, unit * 0.14);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    const steps = 10;
    for (let st = 1; st < steps; st++) {
      const f = st / steps;
      const jitter = Math.sin(st * 19 + prog * 40) * unit * 0.38;
      ctx.lineTo(sx + dx * f - Math.sin(angle) * jitter, sy + dy * f + Math.cos(angle) * jitter);
    }
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  } else if (kind === 'laser_beam') {
    const pulse = 0.75 + 0.25 * Math.sin(prog * 35);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = layer.vfx.secondaryColor;
    ctx.shadowColor = layer.vfx.secondaryColor;
    ctx.shadowBlur = 22;
    ctx.lineWidth = Math.max(6, unit * 0.28 * pulse);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, unit * 0.1 * pulse);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  } else if (kind === 'sword_slash') {
    const alpha = 1 - prog;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 14;
    ctx.lineWidth = Math.max(4, unit * 0.22 * (1 - prog * 0.5));
    const midX = (sx + ex) / 2 - Math.sin(angle) * unit * 0.9;
    const midY = (sy + ey) / 2 + Math.cos(angle) * unit * 0.9;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(midX, midY, sx + dx * Math.min(1, prog * 1.4), sy + dy * Math.min(1, prog * 1.4));
    ctx.stroke();
    if (prog > 0.35 && layer.includeImpactBlood) {
      drawBloodSpray(ex, ey, angle, (prog - 0.35) / 0.65);
    }
    ctx.restore();
  } else if (kind === 'glass_shatter') {
    const alpha = 1 - prog;
    ctx.save();
    for (let g = 0; g < 16; g++) {
      const a = (g / 16) * Math.PI * 2;
      const dist = unit * (0.2 + prog * 2.4 * (0.6 + (g % 3) * 0.3));
      const gx = sx + Math.cos(a) * dist;
      const gy = sy + Math.sin(a) * dist + prog * prog * unit * 0.7;
      const sz = unit * (0.18 + (g % 4) * 0.06);
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(a + prog * (g % 2 === 0 ? 4 : -4));
      ctx.fillStyle = `rgba(224, 242, 254, ${0.78 * alpha})`;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(-sz, -sz * 0.5);
      ctx.lineTo(sz, 0);
      ctx.lineTo(-sz * 0.3, sz * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  } else if (kind === 'shockwave') {
    const r1 = unit * (0.3 + prog * 3.6);
    const alpha = 1 - prog;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * alpha})`;
    ctx.lineWidth = Math.max(2, unit * 0.18 * alpha);
    ctx.beginPath();
    ctx.arc(sx, sy, r1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(45, 212, 191, ${0.55 * alpha})`;
    ctx.lineWidth = Math.max(1.5, unit * 0.08 * alpha);
    ctx.beginPath();
    ctx.arc(sx, sy, r1 * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (kind === 'portal') {
    const r = unit * 1.45;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let s = 0; s < 26; s++) {
      const a = (s / 26) * Math.PI * 2 + prog * 9;
      const px = sx + Math.cos(a) * r;
      const py = sy + Math.sin(a) * r;
      ctx.strokeStyle = s % 2 === 0 ? '#fde047' : '#f97316';
      ctx.lineWidth = Math.max(2, unit * 0.08);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a + 1.4) * unit * 0.35, py + Math.sin(a + 1.4) * unit * 0.35);
      ctx.stroke();
    }
    ctx.restore();
  } else if (kind === 'rain_storm') {
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
    ctx.lineWidth = Math.max(1, w * 0.002);
    for (let r = 0; r < 55; r++) {
      const rx = ((r * 173 + prog * w * 0.9) % w);
      const ry = ((r * 97 + prog * h * 2.4) % h);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - w * 0.02, ry + h * 0.06);
      ctx.stroke();
    }
    ctx.restore();
  } else if (kind === 'building_inferno') {
    // Full Burning Building Inferno: Multi-story structure, blazing windows, towering flames, smoke & embers
    const bw = unit * 4.2;
    const bh = unit * 3.4;
    const bx = sx - bw / 2;
    const by = sy - bh / 2;
    ctx.save();
    // Rising dark smoke plumes behind & above building
    for (let sm = 0; sm < 9; sm++) {
      const spx = sx + ((sm % 5) - 2) * bw * 0.22 + Math.sin(prog * 6 + sm) * unit * 0.28;
      const spy = by - unit * (0.25 + ((prog * 1.4 + sm * 0.14) % 1) * 2.6);
      const sr = unit * (0.65 + (sm % 3) * 0.35);
      const smG = ctx.createRadialGradient(spx, spy, 2, spx, spy, sr);
      smG.addColorStop(0, 'rgba(30, 41, 59, 0.65)');
      smG.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = smG;
      ctx.beginPath();
      ctx.arc(spx, spy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    // Building Silhouette + Glowing Fire Windows
    ctx.fillStyle = 'rgba(15, 18, 25, 0.85)';
    ctx.fillRect(bx, by, bw, bh);
    const cols = 4;
    const rows = 3;
    const winW = bw / (cols * 1.8);
    const winH = bh / (rows * 2.0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = bx + bw * 0.12 + c * (bw * 0.21);
        const wy = by + bh * 0.12 + r * (bh * 0.27);
        const flicker = 0.65 + 0.35 * Math.sin(prog * 22 + r * 3 + c * 5);
        ctx.fillStyle = `rgba(251, 146, 60, ${flicker})`;
        ctx.fillRect(wx, wy, winW, winH);
        ctx.fillStyle = `rgba(254, 240, 138, ${flicker * 0.9})`;
        ctx.fillRect(wx + winW * 0.2, wy + winH * 0.2, winW * 0.6, winH * 0.6);
      }
    }
    // Towering Animated Flames engulfing roofline & windows
    ctx.globalCompositeOperation = 'screen';
    for (let f = 0; f < 16; f++) {
      const fx = bx + (f / 15) * bw;
      const fy = by + (f % 3 === 0 ? bh * 0.55 : f % 2 === 0 ? bh * 0.25 : 0);
      const wave = Math.sin(prog * 26 + f * 1.7);
      const fh = unit * (1.2 + (f % 4) * 0.45 + wave * 0.25);
      const fw = unit * (0.48 + (f % 3) * 0.14);
      const fg = ctx.createRadialGradient(fx, fy - fh * 0.3, 2, fx, fy - fh * 0.35, fh);
      fg.addColorStop(0, 'rgba(255, 255, 224, 0.96)');
      fg.addColorStop(0.32, 'rgba(253, 224, 71, 0.88)');
      fg.addColorStop(0.68, 'rgba(234, 88, 12, 0.7)');
      fg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(fx + wave * unit * 0.12, fy - fh * 0.35, fw, fh, wave * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rising Ember Sparks
    for (let e = 0; e < 24; e++) {
      const exPos = bx + ((e * 47 + Math.sin(prog * 14 + e) * 18) % Math.max(10, bw));
      const eyPos = by + bh * 0.4 - ((prog * 2.6 + e * 0.09) % 1) * (bh * 1.4);
      ctx.fillStyle = e % 2 === 0 ? '#fef08a' : '#fb923c';
      ctx.beginPath();
      ctx.arc(exPos, eyPos, Math.max(1.5, unit * 0.06), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (kind === 'person_ablaze') {
    // Full-Body Human Fire Aura (can be dragged onto any character silhouette on screen)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const bodyH = unit * 3.8;
    const bodyW = unit * 1.5;
    // Ambient fiery aura
    const aura = ctx.createRadialGradient(sx, sy, unit * 0.2, sx, sy, bodyH * 0.72);
    aura.addColorStop(0, 'rgba(253, 224, 71, 0.65)');
    aura.addColorStop(0.45, 'rgba(234, 88, 12, 0.45)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(sx, sy, bodyH * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // Multi-point flame tongues around head, shoulders, torso & arms
    const flameAnchors = [
      { ox: 0, oy: -bodyH * 0.38, s: 0.75 }, // Head crown
      { ox: -bodyW * 0.45, oy: -bodyH * 0.12, s: 0.85 }, // Left shoulder
      { ox: bodyW * 0.45, oy: -bodyH * 0.12, s: 0.85 }, // Right shoulder
      { ox: -bodyW * 0.55, oy: bodyH * 0.12, s: 0.78 }, // Left arm
      { ox: bodyW * 0.55, oy: bodyH * 0.12, s: 0.78 }, // Right arm
      { ox: 0, oy: 0, s: 1.15 }, // Core chest
      { ox: -bodyW * 0.25, oy: bodyH * 0.34, s: 0.9 }, // Left leg
      { ox: bodyW * 0.25, oy: bodyH * 0.34, s: 0.9 }, // Right leg
    ];
    flameAnchors.forEach((pt, idx) => {
      const wave = Math.sin(prog * 24 + idx * 1.9);
      const fx = sx + pt.ox + wave * unit * 0.09;
      const fy = sy + pt.oy;
      const fh = unit * (1.15 * pt.s + Math.abs(wave) * 0.32);
      const fw = unit * (0.44 * pt.s);
      const fg = ctx.createRadialGradient(fx, fy - fh * 0.25, 1, fx, fy - fh * 0.25, fh);
      fg.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
      fg.addColorStop(0.35, 'rgba(253, 224, 71, 0.88)');
      fg.addColorStop(0.7, 'rgba(220, 38, 38, 0.65)');
      fg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(fx, fy - fh * 0.28, fw, fh, wave * 0.18, 0, Math.PI * 2);
      ctx.fill();
    });
    // Rising body embers
    for (let e = 0; e < 18; e++) {
      const exPos = sx + Math.sin(e * 2.1 + prog * 12) * bodyW * 0.65;
      const eyPos = sy + bodyH * 0.45 - ((prog * 2.1 + e * 0.12) % 1) * (bodyH * 1.25);
      ctx.fillStyle = e % 2 === 0 ? '#fef9c3' : '#f97316';
      ctx.beginPath();
      ctx.arc(exPos, eyPos, Math.max(1.5, unit * 0.055), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (kind === 'matchstick_strike') {
    // Matchstick Strike -> Ignition Spark Burst -> 360 Spinning Match Throw with Fire Trail
    ctx.save();
    const igniteEnd = 0.26;
    if (prog < igniteEnd) {
      // Striker strip & friction sparks at (sx, sy)
      const sp = prog / igniteEnd;
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.fillRect(sx - unit * 0.9, sy + unit * 0.12, unit * 1.8, unit * 0.34);
      ctx.strokeRect(sx - unit * 0.9, sy + unit * 0.12, unit * 1.8, unit * 0.34);
      // Friction slide along box
      const mx = sx - unit * 0.6 + sp * unit * 1.2;
      const my = sy - unit * 0.02;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(-0.45);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(-unit * 0.75, -unit * 0.06, unit * 0.75, unit * 0.12);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 0, unit * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Sparks flying from match head
      ctx.globalCompositeOperation = 'screen';
      for (let k = 0; k < 14; k++) {
        const a = -Math.PI + (k / 13) * Math.PI;
        const d = sp * unit * (0.6 + (k % 4) * 0.25);
        ctx.fillStyle = k % 2 === 0 ? '#fef08a' : '#f97316';
        ctx.beginPath();
        ctx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, Math.max(1.8, unit * 0.06), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Spinning Throw from (sx, sy) -> (ex, ey) with curved arc & glowing fire comet trail
      const throwP = (prog - igniteEnd) / (1 - igniteEnd);
      const arcLift = Math.sin(throwP * Math.PI) * unit * 1.3;
      const curX = sx + dx * throwP;
      const curY = sy + dy * throwP - arcLift;
      const spinAngle = throwP * Math.PI * 10; // rapid 5-revolution spin

      // Curved comet fire trail
      ctx.globalCompositeOperation = 'screen';
      for (let tr = 0; tr < 12; tr++) {
        const tp = Math.max(0, throwP - tr * 0.028);
        const tLift = Math.sin(tp * Math.PI) * unit * 1.3;
        const tx = sx + dx * tp;
        const ty = sy + dy * tp - tLift;
        const alpha = (1 - tr / 12) * 0.85;
        const fr = unit * (0.42 - tr * 0.025);
        const fg = ctx.createRadialGradient(tx, ty, 1, tx, ty, fr);
        fg.addColorStop(0, `rgba(255, 255, 224, ${alpha})`);
        fg.addColorStop(0.45, `rgba(251, 146, 60, ${alpha * 0.85})`);
        fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(tx, ty, fr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rotating wooden matchstick & glowing flame tip
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.translate(curX, curY);
      ctx.rotate(spinAngle);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(-unit * 0.52, -unit * 0.055, unit * 0.9, unit * 0.11);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(unit * 0.42, 0, unit * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'screen';
      const tipG = ctx.createRadialGradient(unit * 0.46, 0, 1, unit * 0.46, 0, unit * 0.65);
      tipG.addColorStop(0, 'rgba(255, 255, 255, 1)');
      tipG.addColorStop(0.4, 'rgba(253, 224, 71, 0.92)');
      tipG.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = tipG;
      ctx.beginPath();
      ctx.arc(unit * 0.46, 0, unit * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  } else if (kind === 'fire_tornado') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const cx = sx + dx * Math.min(1, prog * 0.65);
    const cy = sy + dy * Math.min(1, prog * 0.65);
    for (let ring = 0; ring < 14; ring++) {
      const f = ring / 13;
      const rx = cx + Math.sin(prog * 22 + ring * 0.8) * unit * (0.2 + f * 0.4);
      const ry = cy + unit * 1.4 - f * unit * 3.8;
      const rw = unit * (0.35 + f * 1.25);
      const rh = unit * (0.22 + f * 0.42);
      const vg = ctx.createRadialGradient(rx, ry, 2, rx, ry, rw);
      vg.addColorStop(0, 'rgba(254, 240, 138, 0.92)');
      vg.addColorStop(0.55, 'rgba(249, 115, 22, 0.72)');
      vg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = vg;
      ctx.beginPath();
      ctx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
};

// User Saved / Edited Project
export interface SavedUserProject {
  id: string;
  name: string;
  aspectRatio: AspectRatioType;
  resolution: string;
  updatedAt: number;
  thumbnailUrl: string;
  movieTitle: string;
  subtitle: string;
  directorText: string;
  activeFilterId: string;
  activeAudioId: string;
  clips: TimelineClip[];
}

export const VideoEditorStudio: React.FC<VideoEditorStudioProps> = ({
  lang,
  currentUser = null,
  onBackToStoryboard,
  onOpenTerms,
}) => {
  const isMl = lang === 'ml';

  // Local device IndexedDB blob URL cache (persists phone/PC gallery uploads safely across reloads)
  const localMediaUrlMapRef = useRef<Map<string, string>>(new Map());
  const openLoggedRef = useRef<boolean>(false);
  const lastEditTelemetryRef = useRef<number>(0);

  // =========================================================================
  // VIEW STATE: 'welcome' | 'new_project_setup' | 'editor'
  // Opens directly in 16:9 Dual-Screen Editor when launched from Edit button
  // =========================================================================
  const [studioView, setStudioView] = useState<'welcome' | 'new_project_setup' | 'editor'>('editor');

  // Active Project ID for editing
  const [currentEditingProjectId, setCurrentEditingProjectId] = useState<string | null>(null);

  // Persistent User Projects (auto-saved from editor & exports, shown on Home screen)
  const [userProjects, setUserProjects] = useState<SavedUserProject[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('cinestudio_user_projects');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Video Project Configuration (Defaults to 16:9 Widescreen + Dual-Screen Preview)
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatioType>('16:9');
  const [projectName, setProjectName] = useState<string>('My Project 01');
  const [projectResolution, setProjectResolution] = useState<'4K' | '1080p' | '720p'>('1080p');
  const [setupSelectedMediaIds, setSetupSelectedMediaIds] = useState<string[]>([]);

  // =========================================================================
  // COLLAPSIBLE TOOL DRAWER, INSPECTOR, CIRCULAR WHEEL & TIMELINE SYNC
  // =========================================================================
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(false);
  const [mobilePanel, setMobilePanel] = useState<'tools' | 'timeline' | 'inspector'>('timeline');
  const [isDualScreenPreview, setIsDualScreenPreview] = useState<boolean>(true);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState<boolean>(false);
  const [selectedWheelCategoryId, setSelectedWheelCategoryId] = useState<string>('video');
  const [autoLandscapeRotate, setAutoLandscapeRotate] = useState<boolean>(true);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>(() =>
    typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 1280, height: 720 }
  );
  const isPortraitViewport = viewportSize.height > viewportSize.width;
  const isCssRotatedLandscape =
    studioView === 'editor' && autoLandscapeRotate && isPortraitViewport;
  const isCssRotatedLandscapeRef = useRef<boolean>(isCssRotatedLandscape);
  isCssRotatedLandscapeRef.current = isCssRotatedLandscape;
  const effectiveLandscapeHeight = isCssRotatedLandscape ? viewportSize.width : viewportSize.height;
  const isCompactLandscape = effectiveLandscapeHeight < 520;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncViewport = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
    };
  }, []);

  useEffect(() => {
    if (studioView === 'editor' && autoLandscapeRotate) {
      void tryLockLandscapeOrientation();
    }
    return () => {
      unlockScreenOrientation();
    };
  }, [studioView, autoLandscapeRotate]);

  // ACTIVE TOOL CATEGORY TAB (Synced with Circular Tool Wheel)
  const [activeTab, setActiveTab] = useState<EditorToolTab>('Media');

  // Sub-category filter and search query inside the active column
  const [activeSubCategory, setActiveSubCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // USER ONLY MEDIA GALLERY POOL (Clean per project - never leaks old uploads into New Project):
  const [mediaGallery, setMediaGallery] = useState<MediaItem[]>([]);

  const [mediaFilter, setMediaFilter] = useState<'All' | 'Video' | 'Photo'>('All');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);
  const setupFileInputRef = useRef<HTMLInputElement | null>(null);
  const userAudioInputRef = useRef<HTMLInputElement | null>(null);
  const chromaBgInputRef = useRef<HTMLInputElement | null>(null);
  const splitLeftInputRef = useRef<HTMLInputElement | null>(null);
  const splitRightInputRef = useRef<HTMLInputElement | null>(null);
  const trailerCardInputRef = useRef<HTMLInputElement | null>(null);
  const bgMusicAudioElRef = useRef<HTMLAudioElement | null>(null);

  // Active Template / Background
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(TEMPLATES_LIST[0]);

  // Active Filter Applied
  const [activeFilter, setActiveFilter] = useState<FilterItem>(FILTERS_LIST[1]); // Teal & Orange

  // Active Audio Score, User Local Device Audio Library & Live Preview Synthesizer
  const [userAudioLibrary, setUserAudioLibrary] = useState<AudioItem[]>([]);
  const [activeAudio, setActiveAudio] = useState<AudioItem>(AUDIO_LIST[0]);
  const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
  const [exportShareNotice, setExportShareNotice] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioPreviewTimerRef = useRef<number | null>(null);

  // Active Visual Effect Overlay (VFX) & Active Stickers & Cinema Action VFX Layers
  const [activeEffect, setActiveEffect] = useState<EffectItem | null>(null);
  const [activeStickers, setActiveStickers] = useState<TimelineStickerLayer[]>([]);
  const [vfxLayers, setVfxLayers] = useState<TimelineVfxLayer[]>([]);
  const [selectedStickerLayerId, setSelectedStickerLayerId] = useState<string | null>(null);
  const [selectedVfxLayerId, setSelectedVfxLayerId] = useState<string | null>(null);
  const [selectedFeatureType, setSelectedFeatureType] = useState<
    | 'clip'
    | 'title'
    | 'sticker'
    | 'vfx'
    | 'effect'
    | 'filter'
    | 'audio'
    | 'transition'
    | 'speed'
    | 'profx'
    | 'chroma'
    | 'split'
    | 'trailer_card'
  >('clip');

  // Chroma Key (Green Screen), Dual Split-Screen Join, & Movie Trailer Studio States
  const [chromaConfig, setChromaConfig] = useState<ChromaKeyConfig>(DEFAULT_CHROMA_KEY_CONFIG);
  const [splitScreenConfig, setSplitScreenConfig] = useState<SplitScreenConfig>(DEFAULT_SPLIT_SCREEN_CONFIG);
  const [titleAnimType, setTitleAnimType] = useState<TitleAnimationType>('zoom_slam');
  const [titleThemeType, setTitleThemeType] = useState<TitleThemeType>('blockbuster_gold');
  const [trailerFxMode, setTrailerFxMode] = useState<TrailerFxMode>('none');
  const [trailerCardLayers, setTrailerCardLayers] = useState<TrailerCardLayer[]>([]);
  const [selectedTrailerCardId, setSelectedTrailerCardId] = useState<string | null>(null);
  const [draftCardTitle, setDraftCardTitle] = useState<string>('THE LAST STAND');
  const [draftCardSubtitle, setDraftCardSubtitle] = useState<string>('A CINEMA EVENT · DIRECTED BY YOU');
  const [draftCardBadge, setDraftCardBadge] = useState<string>('COMING SOON · TRAILER');
  const [draftCardTheme, setDraftCardTheme] = useState<TrailerCardTheme>('blockbuster_gold');
  const [draftCardAnim, setDraftCardAnim] = useState<TrailerCardAnimation>('tilt_float');
  const [draftCardImageUrl, setDraftCardImageUrl] = useState<string>('');
  const [draftCardMediaType, setDraftCardMediaType] = useState<'video' | 'photo'>('photo');

  // Active Title Text & Visibility + Position/Timing (Starts clean with ZERO unwanted text)
  const [showTitleOverlay, setShowTitleOverlay] = useState<boolean>(false);
  const [movieTitle, setMovieTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [directorText, setDirectorText] = useState<string>('');
  const [titleStartSec, setTitleStartSec] = useState<number>(0);
  const [titleDurationSec, setTitleDurationSec] = useState<number>(6);
  const [titleXPct, setTitleXPct] = useState<number>(50);
  const [titleYPct, setTitleYPct] = useState<number>(50);
  const [titleScale, setTitleScale] = useState<number>(1.0);
  const [titleOpacity, setTitleOpacity] = useState<number>(100);

  // Timeline Clips
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [draggedClipIndex, setDraggedClipIndex] = useState<number | null>(null);
  const [dragOverClipIndex, setDragOverClipIndex] = useState<number | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<{ id: string; speaker: string; text: string; durationSec: number } | null>(null);
  const [dialogueSpeakerInput, setDialogueSpeakerInput] = useState<string>('Hero');
  const [dialogueTextInput, setDialogueTextInput] = useState<string>('Mass Cinema Dialogue Line');
  const [dialogueDurInput, setDialogueDurInput] = useState<number>(6);
  const [activeTemplate, setActiveTemplate] = useState<{ id: string; name: string } | null>(null);
  const trackHeadersRef = useRef<HTMLDivElement | null>(null);
  const trackRowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Undo / Redo Snapshot Stack
  interface EditorUndoSnapshot {
    clips: TimelineClip[];
    filterId: string;
    audioId: string;
    showTitleOverlay: boolean;
    movieTitle: string;
    subtitle: string;
    stickers: TimelineStickerLayer[];
    vfx: TimelineVfxLayer[];
    dialogue: { id: string; speaker: string; text: string; durationSec: number } | null;
    chroma: ChromaKeyConfig;
    split: SplitScreenConfig;
  }
  const [undoStack, setUndoStack] = useState<EditorUndoSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorUndoSnapshot[]>([]);

  const captureSnapshot = (): EditorUndoSnapshot => ({
    clips: timelineClips,
    filterId: activeFilter.id,
    audioId: activeAudio.id,
    showTitleOverlay,
    movieTitle,
    subtitle,
    stickers: activeStickers,
    vfx: vfxLayers,
    dialogue: activeDialogue,
    chroma: chromaConfig,
    split: splitScreenConfig,
  });

  const applySnapshot = (snap: EditorUndoSnapshot) => {
    setTimelineClips(snap.clips);
    const f = FILTERS_LIST.find((x) => x.id === snap.filterId);
    if (f) setActiveFilter(f);
    const a = AUDIO_LIST.find((x) => x.id === snap.audioId);
    if (a) setActiveAudio(a);
    setShowTitleOverlay(snap.showTitleOverlay);
    setMovieTitle(snap.movieTitle);
    setSubtitle(snap.subtitle);
    setActiveStickers(snap.stickers);
    setVfxLayers(snap.vfx);
    setActiveDialogue(snap.dialogue);
    setChromaConfig(snap.chroma);
    setSplitScreenConfig(snap.split);
  };

  const pushUndoCheckpoint = () => {
    const snap = captureSnapshot();
    setUndoStack((prev) => [...prev.slice(-19), snap]);
    setRedoStack([]);
  };

  const handleUndoAction = () => {
    if (undoStack.length === 0) return;
    const prevSnap = undoStack[undoStack.length - 1];
    const currentSnap = captureSnapshot();
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev.slice(-19), currentSnap]);
    applySnapshot(prevSnap);
  };

  const handleRedoAction = () => {
    if (redoStack.length === 0) return;
    const nextSnap = redoStack[redoStack.length - 1];
    const currentSnap = captureSnapshot();
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev.slice(-19), currentSnap]);
    applySnapshot(nextSnap);
  };

  const handleSelectWheelCategory = (category: WheelCategoryItem, openDrawer = false) => {
    setSelectedWheelCategoryId(category.id);
    setActiveTab(category.tab);
    setActiveSubCategory(category.subCategory || 'All');
    setSearchQuery('');
    setItemRenderLimit(100);
    if (openDrawer) {
      setIsLeftPanelOpen(true);
      setMobilePanel('tools');
    }
  };

  const syncWheelToTrack = (wheelId: string, openDrawer = false) => {
    const found = WHEEL_CATEGORIES.find((c) => c.id === wheelId);
    if (found) {
      handleSelectWheelCategory(found, openDrawer);
    }
  };

  // Reorder / Move clip left or right smoothly along the timeline
  const handleMoveClip = (fromIndex: number, direction: 'left' | 'right', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (targetIndex < 0 || targetIndex >= timelineClips.length) return;
    pushUndoCheckpoint();
    const updated = [...timelineClips];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setTimelineClips(updated);
    setActiveClipIndex(targetIndex);
    saveCurrentProjectToStorage(updated);
  };

  // Duplicate clip at index and insert immediately adjacent
  const handleDuplicateClipAt = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const clipToDup = timelineClips[index];
    if (!clipToDup) return;
    pushUndoCheckpoint();
    const duplicated: TimelineClip = {
      ...clipToDup,
      id: `clip_${Date.now()}_dup_${clipToDup.id}`,
      title: `${clipToDup.title} (Copy)`,
    };
    const updated = [...timelineClips];
    updated.splice(index + 1, 0, duplicated);
    setTimelineClips(updated);
    setActiveClipIndex(index + 1);
    saveCurrentProjectToStorage(updated);
  };

  // Reorder clips via smooth HTML5 drag and drop
  const handleDropClipReorder = (targetIndex: number, e?: React.DragEvent) => {
    if (e) e.preventDefault();
    if (draggedClipIndex === null || draggedClipIndex === targetIndex) {
      setDraggedClipIndex(null);
      setDragOverClipIndex(null);
      return;
    }
    pushUndoCheckpoint();
    const updated = [...timelineClips];
    const [moved] = updated.splice(draggedClipIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setTimelineClips(updated);
    setActiveClipIndex(targetIndex);
    setDraggedClipIndex(null);
    setDragOverClipIndex(null);
    saveCurrentProjectToStorage(updated);
  };

  // Transitions between adjacent clips (Name + Full Transition Object for live canvas rendering)
  const [activeTransitionBetween, setActiveTransitionBetween] = useState<number | null>(null);
  const [clipTransitions, setClipTransitions] = useState<Record<number, string>>({});
  const [clipTransitionObjects, setClipTransitionObjects] = useState<Record<number, TransitionItem>>({});
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const transitionPreviewRef = useRef<{ item: TransitionItem; startMs: number } | null>(null);

  // Progressive display limit so 600-item categories render fast with instant "+ Load All 600"
  const [itemRenderLimit, setItemRenderLimit] = useState<number>(100);
  const [colorGradeSearch, setColorGradeSearch] = useState<string>('');
  const [activeColorGradeId, setActiveColorGradeId] = useState<string | null>(null);
  const [colorGradeLimit, setColorGradeLimit] = useState<number>(60);

  // 300 Pro Video Editing Features × 660 Adjustable Settings/Parts Engine
  const [activeProFeature, setActiveProFeature] = useState<ProEditorFeature | null>(null);
  const [proSettingOverrides, setProSettingOverrides] = useState<Record<string, number>>({});
  const [proSettingsModuleFilter, setProSettingsModuleFilter] = useState<string>('all');
  const [proSettingsSearch, setProSettingsSearch] = useState<string>('');
  const [proSettingsPage, setProSettingsPage] = useState<number>(0);

  const activeFeatureCatalog = useMemo(
    () => (activeProFeature ? buildFeatureSettingsCatalog(activeProFeature.id) : []),
    [activeProFeature?.id]
  );

  const proRenderDeltas = useMemo(
    () => computeProRenderDeltas(activeProFeature, proSettingOverrides, activeFeatureCatalog),
    [activeProFeature, proSettingOverrides, activeFeatureCatalog]
  );

  // Playback State (Exact sum of uploaded/added timeline clips; 0 when empty)
  const totalDuration = timelineClips.reduce((acc, c) => acc + (c.durationSec || 4), 0);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [timelineZoom, setTimelineZoom] = useState<number>(1.5);
  const pxPerSec = 16 * timelineZoom;

  // Refs for smooth 60fps continuous playback across ALL timeline clips
  const currentTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const timelineClipsRef = useRef<TimelineClip[]>(timelineClips);
  const activeClipIndexRef = useRef<number>(activeClipIndex);
  const mediaCacheRef = useRef<Map<string, HTMLImageElement | HTMLVideoElement>>(new Map());
  const thumbCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const playheadLineRef = useRef<HTMLDivElement | null>(null);
  const playerRangeRef = useRef<HTMLInputElement | null>(null);
  const playerTimecodeRef = useRef<HTMLSpanElement | null>(null);
  const redBadgeTimeRef = useRef<HTMLSpanElement | null>(null);
  const pxPerSecRef = useRef<number>(pxPerSec);
  pxPerSecRef.current = pxPerSec;

  const isScrubbingRef = useRef<boolean>(false);
  const [isScrubbingTimeline, setIsScrubbingTimeline] = useState<boolean>(false);
  const [cutRangeStartSec, setCutRangeStartSec] = useState<number | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    timelineClipsRef.current = timelineClips;
    const exactTotal = timelineClips.reduce((acc, c) => acc + (c.durationSec || 4), 0);
    if (timelineClips.length === 0) {
      if (!isScrubbingRef.current) {
        currentTimeRef.current = 0;
        setCurrentTimeSec(0);
      }
      setIsPlaying(false);
    } else if (currentTimeRef.current > exactTotal) {
      currentTimeRef.current = exactTotal;
      setCurrentTimeSec(exactTotal);
      setIsPlaying(false);
    }

    // Pre-warm active timeline clip decoders & release unused video decoders immediately
    const activeVideoKeys = new Set(
      timelineClips.filter((c) => c.type === 'video' && c.url).map((c) => `video:${c.url}`)
    );
    if (splitScreenConfig.leftMediaUrl && splitScreenConfig.leftMediaType === 'video') {
      activeVideoKeys.add(`video:${splitScreenConfig.leftMediaUrl}`);
    }
    if (splitScreenConfig.rightMediaUrl && splitScreenConfig.rightMediaType === 'video') {
      activeVideoKeys.add(`video:${splitScreenConfig.rightMediaUrl}`);
    }
    if (chromaConfig.bgMediaUrl && chromaConfig.bgMediaType === 'video') {
      activeVideoKeys.add(`video:${chromaConfig.bgMediaUrl}`);
    }
    trailerCardLayers.forEach((tc) => {
      if (tc.imageUrl && tc.mediaType === 'video') {
        activeVideoKeys.add(`video:${tc.imageUrl}`);
      }
    });
    mediaCacheRef.current.forEach((el, key) => {
      if (el instanceof HTMLVideoElement && !activeVideoKeys.has(key)) {
        try {
          el.pause();
          el.removeAttribute('src');
          el.load();
        } catch {}
        mediaCacheRef.current.delete(key);
      }
    });

    timelineClips.forEach((clip) => {
      if (!clip.url) return;
      const cacheKey = `${clip.type}:${clip.url}`;
      if (!mediaCacheRef.current.has(cacheKey)) {
        const isLocalAsset = clip.url.startsWith('blob:') || clip.url.startsWith('data:');
        if (clip.type === 'video') {
          const video = document.createElement('video');
          if (!isLocalAsset) {
            video.crossOrigin = 'anonymous';
          }
          video.playsInline = true;
          video.preload = 'auto';
          video.src = clip.url;
          video.load();
          mediaCacheRef.current.set(cacheKey, video);
        } else {
          const img = new Image();
          if (!isLocalAsset) {
            img.crossOrigin = 'anonymous';
          }
          img.src = clip.url;
          mediaCacheRef.current.set(cacheKey, img);
        }
      }
      if (clip.thumbnailUrl && !thumbCacheRef.current.has(clip.thumbnailUrl)) {
        const tImg = new Image();
        if (!clip.thumbnailUrl.startsWith('blob:') && !clip.thumbnailUrl.startsWith('data:')) {
          tImg.crossOrigin = 'anonymous';
        }
        tImg.src = clip.thumbnailUrl;
        thumbCacheRef.current.set(clip.thumbnailUrl, tImg);
      }
    });
  }, [timelineClips]);

  useEffect(() => {
    activeClipIndexRef.current = activeClipIndex;
  }, [activeClipIndex]);

  const seekToTime = (sec: number) => {
    const maxAllowed = timelineClips.length > 0 ? totalDuration : 30;
    const clamped = Math.max(0, Math.min(maxAllowed, sec));
    currentTimeRef.current = clamped;
    setCurrentTimeSec(clamped);
    // Sync active clip index to whichever clip sits at clamped time
    let acc = 0;
    for (let i = 0; i < timelineClips.length; i++) {
      const dur = timelineClips[i].durationSec || 4;
      if (clamped < acc + dur || i === timelineClips.length - 1) {
        setActiveClipIndex(i);
        break;
      }
      acc += dur;
    }
  };

  const seekFromClientX = (clientX: number, clientY?: number) => {
    const container = timelineContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const relX =
      isCssRotatedLandscapeRef.current && clientY !== undefined
        ? clientY - rect.top + container.scrollLeft
        : clientX - rect.left + container.scrollLeft;
    const targetSec = Math.max(0, (relX - 8) / pxPerSec);
    seekToTime(targetSec);
  };

  const handleTogglePlay = () => {
    if (timelineClips.length === 0 || totalDuration <= 0) {
      setIsPlaying(false);
      return;
    }
    if (!isPlaying) {
      if (!isReversePlayback && currentTimeRef.current >= totalDuration - 0.05) {
        currentTimeRef.current = 0;
        setCurrentTimeSec(0);
        setActiveClipIndex(0);
      } else if (isReversePlayback && currentTimeRef.current <= 0.05) {
        currentTimeRef.current = totalDuration;
        setCurrentTimeSec(totalDuration);
        setActiveClipIndex(Math.max(0, timelineClips.length - 1));
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  // Track Header Controls
  const [isAudioTrackMuted, setIsAudioTrackMuted] = useState<boolean>(false);
  const [isVideoAudioMuted, setIsVideoAudioMuted] = useState<boolean>(false);
  const [isVideoTrackVisible, setIsVideoTrackVisible] = useState<boolean>(true);

  // Inspector State (Right Column): 'adjust' | 'video' | 'audio' | 'color' | 'speed' | 'profx'
  const [activeInspectorTab, setActiveInspectorTab] = useState<'adjust' | 'video' | 'audio' | 'color' | 'speed' | 'profx'>('adjust');
  const canvasOverlayRef = useRef<HTMLDivElement | null>(null);
  const canvasDragStateRef = useRef<{
    mode:
      | 'move_sticker'
      | 'resize_sticker'
      | 'move_title'
      | 'resize_title'
      | 'vfx_start'
      | 'vfx_end'
      | 'vfx_scale'
      | 'move_card'
      | 'resize_card';
    id?: string;
    initScale?: number;
    originX?: number;
    originY?: number;
    initDist?: number;
  } | null>(null);
  const [scaleX, setScaleX] = useState<number>(100.0);
  const [scaleY, setScaleY] = useState<number>(100.0);
  const [linkScale, setLinkScale] = useState<boolean>(true);
  const [posX, setPosX] = useState<number>(0.0);
  const [posY, setPosY] = useState<number>(0.0);
  const [rotationDeg, setRotationDeg] = useState<number>(0.0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [blendMode, setBlendMode] = useState<string>('Normal');
  const [opacity, setOpacity] = useState<number>(100.0);
  const [backgroundEnabled, setBackgroundEnabled] = useState<boolean>(false);

  // =========================================================================
  // COLOR GRADING SUITE (Right Inspector 'color' tab)
  // Real-time canvas filter adjustment requested by user
  // =========================================================================
  const [colorBrightness, setColorBrightness] = useState<number>(0); // -100 to +100
  const [colorContrast, setColorContrast] = useState<number>(0); // -100 to +100
  const [colorSaturation, setColorSaturation] = useState<number>(0); // -100 to +100
  const [colorExposure, setColorExposure] = useState<number>(0); // -100 to +100
  const [colorWarmth, setColorWarmth] = useState<number>(0); // -100 to +100
  const [colorTint, setColorTint] = useState<number>(0); // -100 to +100
  const [colorHighlights, setColorHighlights] = useState<number>(0); // -100 to +100
  const [colorShadows, setColorShadows] = useState<number>(0); // -100 to +100
  const [colorVignette, setColorVignette] = useState<number>(0); // 0 to 100 (clean default: no round shade)

  // =========================================================================
  // SPEED CONTROLS (Right Inspector 'speed' tab)
  // =========================================================================
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 0.25x to 8.0x
  const [isReversePlayback, setIsReversePlayback] = useState<boolean>(false);

  // Export Modal & Real Video Recorder State
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportElapsedSec, setExportElapsedSec] = useState<number>(0);
  const [exportEstimatedTotalSec, setExportEstimatedTotalSec] = useState<number>(0);
  const [exportStatusText, setExportStatusText] = useState<string>('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedVideoFilename, setExportedVideoFilename] = useState<string>('CineStudio_Export.mp4');
  const [exportedVideoSizeMb, setExportedVideoSizeMb] = useState<string>('');
  const [exportedVideoMetaLabel, setExportedVideoMetaLabel] = useState<string>('');
  const exportCancelRef = useRef<boolean>(false);

  const clearExportedPreview = () => {
    setExportedVideoUrl((prev) => {
      if (prev) {
        try {
          URL.revokeObjectURL(prev);
        } catch {}
      }
      return null;
    });
    setExportedVideoSizeMb('');
    setExportedVideoMetaLabel('');
    setExportElapsedSec(0);
    setExportEstimatedTotalSec(0);
  };

  // Helper: log Video Editor usage to Firestore for Admin Dashboard (Guest & Gmail)
  const logEditorTelemetry = (
    actionType: VideoEditActionType,
    overrideClips?: TimelineClip[],
    overrideDurationSec?: number
  ) => {
    const activeClips = overrideClips || timelineClips;
    if (actionType === 'edit_timeline') {
      const now = Date.now();
      if (now - lastEditTelemetryRef.current < 15000) return;
      lastEditTelemetryRef.current = now;
    }
    const durSec =
      overrideDurationSec !== undefined
        ? overrideDurationSec
        : activeClips.reduce((acc, c) => acc + (c.durationSec || 4), 0);

    void recordVideoEditorActivity({
      actionType,
      projectTitle: projectName,
      clipCount: activeClips.length,
      resolution: projectResolution,
      aspectRatio: selectedAspectRatio,
      exportDurationSec: durSec,
      user: currentUser,
    });
  };

  // Hydrate persistent local device IndexedDB gallery blobs & log initial editor visit
  useEffect(() => {
    if (!openLoggedRef.current) {
      openLoggedRef.current = true;
      void recordVideoEditorActivity({
        actionType: 'open_editor',
        projectTitle: projectName,
        clipCount: timelineClips.length,
        resolution: projectResolution,
        aspectRatio: selectedAspectRatio,
        exportDurationSec: 0,
        user: currentUser,
      });
    }

    let active = true;
    void getAllLocalMediaRecords().then((records) => {
      if (!active || records.length === 0) return;
      const hydratedUserAudio: AudioItem[] = [];
      records.forEach((rec) => {
        if (!localMediaUrlMapRef.current.has(rec.id)) {
          try {
            const freshUrl = URL.createObjectURL(rec.file);
            localMediaUrlMapRef.current.set(rec.id, freshUrl);
          } catch {}
        }
        if (rec.mediaType === 'audio') {
          const freshAudioUrl = localMediaUrlMapRef.current.get(rec.id);
          if (freshAudioUrl) {
            hydratedUserAudio.push({
              id: rec.id,
              title: rec.name.replace(/\.[^/.]+$/, ''),
              category: 'Device Audio',
              duration: rec.duration || '00:15',
              durationSec: rec.durationSec || 15,
              bpm: 100,
              mood: 'Local File',
              description: 'Private audio/music stored locally on this device.',
              synthPreset: 'cinematic',
              url: freshAudioUrl,
            });
          }
        }
      });

      if (hydratedUserAudio.length > 0) {
        setUserAudioLibrary(hydratedUserAudio);
      }

      // Refresh stale blob URLs in saved projects so reopened projects play seamlessly
      setUserProjects((prev) =>
        prev.map((proj) => ({
          ...proj,
          clips: (proj.clips || []).map((c) => {
            const byId = c.mediaId ? localMediaUrlMapRef.current.get(c.mediaId) : undefined;
            if (byId) return { ...c, url: byId };
            const matchedRec = records.find(
              (r) =>
                r.mediaType === c.type &&
                r.name.replace(/\.[^/.]+$/, '') === c.title.replace(/ \(Part \d+\)$/, '')
            );
            if (matchedRec) {
              const restoredUrl = localMediaUrlMapRef.current.get(matchedRec.id);
              if (restoredUrl) {
                return { ...c, mediaId: matchedRec.id, url: restoredUrl };
              }
            }
            return c;
          }),
        }))
      );
    });

    return () => {
      active = false;
      localMediaUrlMapRef.current.forEach((blobUrl) => {
        try {
          if (blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
        } catch {}
      });
      localMediaUrlMapRef.current.clear();
    };
  }, []);

  // Canvas Refs (Player + Dual-Screen Filter Preview)
  const playerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const filterPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic Canvas Dimensions & Aspect ratio styling based on selected format
  const canvasDims = useMemo(() => {
    switch (selectedAspectRatio) {
      case '9:16':
        return { width: 720, height: 1280, aspectClass: 'aspect-[9/16] h-full max-h-[520px]' };
      case '1:1':
        return { width: 1080, height: 1080, aspectClass: 'aspect-square h-full max-h-[520px]' };
      case '4:5':
        return { width: 864, height: 1080, aspectClass: 'aspect-[4/5] h-full max-h-[520px]' };
      case '21:9':
        return { width: 1680, height: 720, aspectClass: 'aspect-[21/9] w-full max-w-full' };
      case '4:3':
        return { width: 960, height: 720, aspectClass: 'aspect-[4/3] h-full max-h-[520px]' };
      case '16:9':
      default:
        return { width: 1280, height: 720, aspectClass: 'aspect-video w-full max-w-full' };
    }
  }, [selectedAspectRatio]);

  // Timecode formatting
  const formatTimecode = (sec: number) => {
    const s = Math.max(0, sec);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    const frames = Math.floor((s % 1) * 30);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  const formatMsTimecode = (sec: number) => {
    const s = Math.max(0, sec);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  };

  const persistProjectsSafely = (list: SavedUserProject[]) => {
    const sanitizeThumb = (val?: string) => {
      if (!val || val.startsWith('blob:')) return '';
      if (val.length > 48_000) return '';
      return val;
    };
    const compact = list.slice(0, 24).map((p) => ({
      ...p,
      thumbnailUrl: sanitizeThumb(p.thumbnailUrl),
      clips: (p.clips || []).map((c) => ({
        ...c,
        thumbnailUrl: sanitizeThumb(c.thumbnailUrl),
        url: c.url && c.url.startsWith('data:') && c.url.length > 48_000 ? '' : c.url,
      })),
    }));
    if (!safeSetLocalStorage('cinestudio_user_projects', JSON.stringify(compact))) {
      // Fallback if localStorage quota is nearly full: strip thumbnails and keep latest 12 projects
      const minimal = compact.slice(0, 12).map((p) => ({
        ...p,
        thumbnailUrl: '',
        clips: p.clips.map((c) => ({ ...c, thumbnailUrl: '' })),
      }));
      safeSetLocalStorage('cinestudio_user_projects', JSON.stringify(minimal));
    }
  };

  // Save current project state helper (auto-saves to Home page list without exceeding storage quota)
  const saveCurrentProjectToStorage = (
    overrideClips?: TimelineClip[],
    overrideName?: string,
    overrideRatio?: AspectRatioType,
    overrideProjectId?: string,
    overrideThumb?: string
  ) => {
    const activeClips = overrideClips || timelineClips;
    const activeName = overrideName || projectName;
    const activeRatio = overrideRatio || selectedAspectRatio;
    let thumb = overrideThumb || '';
    if (!thumb && activeClips.length > 0) {
      const firstThumbClip = activeClips.find((c) => Boolean(c.thumbnailUrl) && !c.thumbnailUrl!.startsWith('blob:'));
      const firstPhotoClip = activeClips.find((c) => c.type === 'photo' && Boolean(c.url) && !c.url.startsWith('blob:'));
      thumb = firstThumbClip?.thumbnailUrl || firstPhotoClip?.url || '';
    }
    if (!thumb && studioView === 'editor' && activeClips.length > 0) {
      try {
        if (playerCanvasRef.current) {
          thumb = playerCanvasRef.current.toDataURL('image/jpeg', 0.45);
        }
      } catch {}
    }

    const projId = overrideProjectId || currentEditingProjectId || `proj_${Date.now()}`;
    setCurrentEditingProjectId(projId);

    const updatedProj: SavedUserProject = {
      id: projId,
      name: activeName,
      aspectRatio: activeRatio,
      resolution: projectResolution,
      updatedAt: Date.now(),
      thumbnailUrl: thumb,
      movieTitle,
      subtitle,
      directorText,
      activeFilterId: activeFilter.id,
      activeAudioId: activeAudio.id,
      clips: activeClips,
    };

    setUserProjects((prev) => {
      const filtered = prev.filter((p) => p.id !== projId);
      const updatedList = [updatedProj, ...filtered].slice(0, 24);
      persistProjectsSafely(updatedList);
      return updatedList;
    });
  };

  // Delete project from list and storage
  const handleDeleteUserProject = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setUserProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      persistProjectsSafely(updated);
      return updated;
    });
  };

  // Open a completely fresh New Project (zero old videos/images shown)
  const openNewProjectSetup = (ratio?: AspectRatioType, namePrefix = 'Project') => {
    if (ratio) setSelectedAspectRatio(ratio);
    setProjectName(`${namePrefix} ${userProjects.length + 1}`);
    setCurrentEditingProjectId(null);
    setMediaGallery([]);
    setSetupSelectedMediaIds([]);
    setSelectedMediaIds([]);
    setTimelineClips([]);
    setActiveClipIndex(0);
    setShowTitleOverlay(false);
    setMovieTitle('');
    setSubtitle('');
    setDirectorText('');
    setTitleStartSec(0);
    setTitleDurationSec(6);
    setTitleXPct(50);
    setTitleYPct(50);
    setTitleScale(1.0);
    setTitleOpacity(100);
    setActiveStickers([]);
    setVfxLayers([]);
    setSelectedStickerLayerId(null);
    setSelectedVfxLayerId(null);
    setActiveEffect(null);
    setChromaConfig(DEFAULT_CHROMA_KEY_CONFIG);
    setSplitScreenConfig(DEFAULT_SPLIT_SCREEN_CONFIG);
    setTitleAnimType('zoom_slam');
    setTitleThemeType('blockbuster_gold');
    setTrailerFxMode('none');
    setTrailerCardLayers([]);
    setSelectedTrailerCardId(null);
    setColorVignette(0);
    setSelectedFeatureType('clip');
    currentTimeRef.current = 0;
    setCurrentTimeSec(0);
    setIsPlaying(false);
    try {
      localStorage.removeItem('cinestudio_user_media');
    } catch {}
    setStudioView('new_project_setup');
  };

  // Open saved project directly into editor (restoring local device blobs seamlessly)
  const handleOpenSavedProject = (proj: SavedUserProject) => {
    setCurrentEditingProjectId(proj.id);
    setProjectName(proj.name);
    setSelectedAspectRatio(proj.aspectRatio || '16:9');
    setIsDualScreenPreview(true);
    setProjectResolution(proj.resolution as any);
    setMovieTitle(proj.movieTitle || '');
    setSubtitle(proj.subtitle || '');
    setDirectorText(proj.directorText || '');
    setShowTitleOverlay(Boolean(proj.movieTitle));

    if (proj.clips && proj.clips.length > 0) {
      const hydratedClips = proj.clips.map((c) => {
        const freshUrl = c.mediaId ? localMediaUrlMapRef.current.get(c.mediaId) : undefined;
        return freshUrl ? { ...c, url: freshUrl } : c;
      });
      setTimelineClips(hydratedClips);
      setActiveClipIndex(0);
      setMediaGallery(
        hydratedClips.map((c) => ({
          id: c.mediaId || c.id,
          title: c.title,
          duration: `${String(Math.floor((c.durationSec || 4) / 60)).padStart(2, '0')}:${String(Math.floor((c.durationSec || 4) % 60)).padStart(2, '0')}`,
          durationSec: c.durationSec || 4,
          url: c.url,
          thumbnailUrl: c.thumbnailUrl,
          type: c.type,
          category: c.type === 'video' ? 'Video' : 'Photo',
        }))
      );
    } else {
      setTimelineClips([]);
      setMediaGallery([]);
    }

    const matchedFlt = FILTERS_LIST.find((f) => f.id === proj.activeFilterId);
    if (matchedFlt) setActiveFilter(matchedFlt);

    const matchedAud = [...userAudioLibrary, ...AUDIO_LIST].find((a) => a.id === proj.activeAudioId);
    if (matchedAud) {
      const freshAudioUrl = localMediaUrlMapRef.current.get(matchedAud.id);
      setActiveAudio(freshAudioUrl ? { ...matchedAud, url: freshAudioUrl } : matchedAud);
    }

    setStudioView('editor');
  };

  // =========================================================================
  // SCISSORS SPLIT CUT FUNCTIONALITY (At Playhead)
  // "വീഡിയോയുടെ അവിടെ പ്രസ് ചെയ്യുമ്പോൾ ഓട്ടോമാറ്റിക് വീഡിയോ പ്ലേ ആകുന്ന അവിടെ
  // സ്റ്റോപ്പ് ആവണം തന്നെ അതിന്റെ സെന്ററിൽ ആയിട്ട് ഒരു കത്രികന്റെ ചിഹ്നം ഉണ്ടാവണം
  // നമ്മുടെ കത്രിക ചിഹ്നത്തിൽ നിൽക്കുമ്പോൾ ഓട്ടോമാറ്റിക് ആ വീഡിയോ അവിടെ 2 ആവണം"
  // =========================================================================
  const handleSplitClipAtPlayhead = () => {
    if (timelineClips.length === 0) return;

    const splitGlobalTime = currentTimeRef.current;
    let accumulatedTime = 0;
    let targetIndex = -1;
    let offsetInClip = 0;

    for (let i = 0; i < timelineClips.length; i++) {
      const clip = timelineClips[i];
      if (splitGlobalTime >= accumulatedTime && splitGlobalTime <= accumulatedTime + clip.durationSec) {
        targetIndex = i;
        offsetInClip = splitGlobalTime - accumulatedTime;
        break;
      }
      accumulatedTime += clip.durationSec;
    }

    if (targetIndex === -1) {
      targetIndex = activeClipIndex;
      offsetInClip = (timelineClips[targetIndex]?.durationSec || 4) / 2;
    }

    const targetClip = timelineClips[targetIndex];
    if (!targetClip) return;

    pushUndoCheckpoint();
    const splitPoint = Math.max(0.2, Math.min(targetClip.durationSec - 0.2, offsetInClip));
    const duration1 = Number(splitPoint.toFixed(2));
    const duration2 = Number((targetClip.durationSec - splitPoint).toFixed(2));
    const baseSourceStart = targetClip.sourceStartSec || 0;

    const clip1: TimelineClip = {
      ...targetClip,
      id: `clip_split_a_${Date.now()}`,
      title: `${targetClip.title.replace(/ \(Part \d+\)$/, '')} (Part 1)`,
      durationSec: duration1,
      sourceStartSec: baseSourceStart,
    };
    const clip2: TimelineClip = {
      ...targetClip,
      id: `clip_split_b_${Date.now()}`,
      title: `${targetClip.title.replace(/ \(Part \d+\)$/, '')} (Part 2)`,
      durationSec: duration2,
      sourceStartSec: Number((baseSourceStart + duration1).toFixed(2)),
    };

    const nextClips = [...timelineClips];
    nextClips.splice(targetIndex, 1, clip1, clip2);
    setTimelineClips(nextClips);
    setActiveClipIndex(targetIndex + 1);
    saveCurrentProjectToStorage(nextClips);
    logEditorTelemetry('edit_timeline', nextClips);
  };

  // Range Cut / Trim Helper: Mark Point A, scrub right by hand while watching video to Point B, then cut!
  const handleRangeCutAction = (mode: 'remove_middle' | 'keep_only' | 'split_both') => {
    if (timelineClips.length === 0 || cutRangeStartSec === null) return;
    const tA = Math.max(0, Math.min(cutRangeStartSec, currentTimeRef.current));
    const tB = Math.min(totalDuration, Math.max(cutRangeStartSec, currentTimeRef.current));
    if (tB - tA < 0.25) {
      setCutRangeStartSec(null);
      handleSplitClipAtPlayhead();
      return;
    }

    const beforePieces: TimelineClip[] = [];
    const middlePieces: TimelineClip[] = [];
    const afterPieces: TimelineClip[] = [];

    let cursor = 0;
    timelineClips.forEach((clip, idx) => {
      const cStart = cursor;
      const cEnd = cursor + clip.durationSec;
      const baseSrc = clip.sourceStartSec || 0;
      const cleanTitle = clip.title.replace(/ \(Part \d+\)$/, '');

      // Segment before tA
      if (cStart < tA) {
        const segEnd = Math.min(cEnd, tA);
        const dur = Number((segEnd - cStart).toFixed(2));
        if (dur >= 0.15) {
          beforePieces.push({
            ...clip,
            id: `clip_trim_pre_${Date.now()}_${idx}`,
            title: cleanTitle,
            durationSec: dur,
            sourceStartSec: baseSrc,
          });
        }
      }

      // Segment inside [tA, tB]
      const midStart = Math.max(cStart, tA);
      const midEnd = Math.min(cEnd, tB);
      if (midEnd - midStart >= 0.15) {
        const dur = Number((midEnd - midStart).toFixed(2));
        middlePieces.push({
          ...clip,
          id: `clip_trim_mid_${Date.now()}_${idx}`,
          title: `${cleanTitle} (Cut)`,
          durationSec: dur,
          sourceStartSec: Number((baseSrc + (midStart - cStart)).toFixed(2)),
        });
      }

      // Segment after tB
      if (cEnd > tB) {
        const segStart = Math.max(cStart, tB);
        const dur = Number((cEnd - segStart).toFixed(2));
        if (dur >= 0.15) {
          afterPieces.push({
            ...clip,
            id: `clip_trim_post_${Date.now()}_${idx}`,
            title: cleanTitle,
            durationSec: dur,
            sourceStartSec: Number((baseSrc + (segStart - cStart)).toFixed(2)),
          });
        }
      }

      cursor = cEnd;
    });

    let nextClips: TimelineClip[] = [];
    if (mode === 'remove_middle') {
      nextClips = [...beforePieces, ...afterPieces];
      seekToTime(tA);
    } else if (mode === 'keep_only') {
      nextClips = [...middlePieces];
      seekToTime(0);
    } else {
      nextClips = [...beforePieces, ...middlePieces, ...afterPieces];
      seekToTime(tA);
    }

    setCutRangeStartSec(null);
    setTimelineClips(nextClips);
    setActiveClipIndex(0);
    saveCurrentProjectToStorage(nextClips);
    logEditorTelemetry('edit_timeline', nextClips);
  };

  // Helper: find which clip is active at global timeline time `t`
  const getClipAtTime = (t: number, clips: TimelineClip[]) => {
    if (!clips || clips.length === 0) {
      return { clip: undefined, index: -1, localTime: 0, clipStart: 0 };
    }
    let acc = 0;
    for (let i = 0; i < clips.length; i++) {
      const dur = clips[i].durationSec || 4;
      if (t < acc + dur || i === clips.length - 1) {
        return {
          clip: clips[i],
          index: i,
          localTime: Math.max(0, Math.min(dur, t - acc)),
          clipStart: acc,
        };
      }
      acc += dur;
    }
    return { clip: clips[0], index: 0, localTime: 0, clipStart: 0 };
  };

  // Live Audio Sound Previewer (Web Audio API Synthesizer so every track plays real sound)
  const stopAudioPreview = () => {
    if (audioPreviewTimerRef.current) {
      window.clearTimeout(audioPreviewTimerRef.current);
      audioPreviewTimerRef.current = null;
    }
    if (bgMusicAudioElRef.current) {
      try {
        bgMusicAudioElRef.current.pause();
      } catch {}
    }
    setPreviewingAudioId(null);
  };

  const playAudioPreview = (item: AudioItem) => {
    if (previewingAudioId === item.id) {
      stopAudioPreview();
      return;
    }
    stopAudioPreview();
    if (typeof window === 'undefined') return;

    // Play real user-picked local audio file cleanly inside browser or WebView
    if (item.url) {
      try {
        const audioEl = bgMusicAudioElRef.current || new Audio();
        bgMusicAudioElRef.current = audioEl;
        audioEl.src = item.url;
        audioEl.currentTime = 0;
        audioEl.muted = isMuted;
        audioEl.volume = Math.max(0, Math.min(1, volume / 100));
        void audioEl.play().catch(() => {});
        setPreviewingAudioId(item.id);
        audioPreviewTimerRef.current = window.setTimeout(() => {
          if (!isPlayingRef.current) {
            try {
              audioEl.pause();
            } catch {}
          }
          setPreviewingAudioId(null);
        }, Math.min(8000, Math.max(2500, (item.durationSec || 6) * 1000)));
      } catch {}
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const now = ctx.currentTime;
      const volScale = isMuted || isAudioTrackMuted ? 0 : Math.min(0.55, (volume / 100) * 0.42);
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volScale, now);
      masterGain.connect(ctx.destination);

      let previewMs = 1350;

      if (item.synthPreset === 'sfx_glass_break') {
        // 1. Initial sharp glass crash white-noise transient
        const bufLen = Math.floor(ctx.sampleRate * 0.35);
        const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
        }
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(2200, now);
        noiseSrc.connect(hp);
        hp.connect(masterGain);
        noiseSrc.start(now);

        // 2. Cascading crystal shard chimes
        const shardFreqs = [3420, 4880, 2860, 5620, 3910, 6180, 3150, 4410, 5230, 3690];
        shardFreqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          const t0 = now + idx * 0.055;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t0);
          g.gain.setValueAtTime(0.32, t0);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(t0);
          osc.stop(t0 + 0.17);
        });
        previewMs = 950;
      } else if (item.synthPreset === 'sfx_fire_burn') {
        // Matchstick friction strike + ignition whoosh + crackling embers
        const dur = 1.6;
        const bufLen = Math.floor(ctx.sampleRate * dur);
        const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          const t = i / ctx.sampleRate;
          const crackle = Math.random() > 0.985 ? (Math.random() * 2 - 1) * 1.4 : 0;
          const env = t < 0.16 ? t / 0.16 : Math.exp(-(t - 0.16) * 1.4);
          data[i] = ((Math.random() * 2 - 1) * 0.45 + crackle) * env;
        }
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(650, now);
        bp.frequency.linearRampToValueAtTime(1400, now + 0.25);
        bp.frequency.linearRampToValueAtTime(480, now + dur);
        src.connect(bp);
        bp.connect(masterGain);
        src.start(now);
        previewMs = 1650;
      } else if (item.synthPreset === 'sfx_punch_impact') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.18);
        g.gain.setValueAtTime(0.95, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.26);
        previewMs = 450;
      } else if (item.synthPreset === 'sfx_gunshot') {
        const bufLen = Math.floor(ctx.sampleRate * 0.45);
        const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.09));
        }
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3400, now);
        lp.frequency.exponentialRampToValueAtTime(320, now + 0.35);
        src.connect(lp);
        lp.connect(masterGain);
        src.start(now);
        previewMs = 600;
      } else {
        const notes =
          item.synthPreset === 'comedy'
            ? [523.25, 659.25, 587.33, 783.99, 659.25]
            : item.synthPreset === 'meme_boom'
            ? [110, 82.41, 65.41]
            : item.synthPreset === 'trailer'
            ? [130.81, 130.81, 155.56, 196.0]
            : item.synthPreset === 'lofi'
            ? [261.63, 329.63, 392.0, 493.88]
            : item.synthPreset === 'electronic'
            ? [220, 261.63, 329.63, 440, 329.63]
            : item.synthPreset === 'sfx_whoosh'
            ? [300, 720, 220]
            : [261.63, 329.63, 392.0, 523.25];

        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type =
            item.synthPreset === 'meme_boom' || item.synthPreset === 'trailer'
              ? 'sawtooth'
              : item.synthPreset === 'comedy'
              ? 'triangle'
              : 'sine';
          const tStart = now + idx * 0.22;
          osc.frequency.setValueAtTime(freq, tStart);
          if (item.synthPreset === 'sfx_whoosh') {
            osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 1.6), tStart + 0.2);
          }
          noteGain.gain.setValueAtTime(0.001, tStart);
          noteGain.gain.exponentialRampToValueAtTime(0.6, tStart + 0.04);
          noteGain.gain.exponentialRampToValueAtTime(0.001, tStart + 0.26);
          osc.connect(noteGain);
          noteGain.connect(masterGain);
          osc.start(tStart);
          osc.stop(tStart + 0.28);
        });
        previewMs = notes.length * 240 + 150;
      }

      setPreviewingAudioId(item.id);
      audioPreviewTimerRef.current = window.setTimeout(() => {
        setPreviewingAudioId(null);
      }, previewMs);
    } catch {}
  };

  // Sync user-picked local Audio / Music track cleanly with timeline play/pause & volume
  useEffect(() => {
    const audioEl = bgMusicAudioElRef.current;
    if (!activeAudio?.url) {
      if (audioEl) {
        try {
          audioEl.pause();
        } catch {}
      }
      return;
    }
    const targetEl = audioEl || new Audio();
    bgMusicAudioElRef.current = targetEl;
    if (targetEl.src !== activeAudio.url) {
      targetEl.src = activeAudio.url;
      targetEl.loop = true;
    }
    targetEl.muted = isMuted;
    targetEl.volume = Math.max(0, Math.min(1, volume / 100));

    if (isPlaying) {
      try {
        if (Math.abs((targetEl.currentTime || 0) - currentTimeRef.current) > 0.45 && isFinite(targetEl.duration) && targetEl.duration > 0) {
          targetEl.currentTime = currentTimeRef.current % targetEl.duration;
        }
        void targetEl.play().catch(() => {});
      } catch {}
    } else if (previewingAudioId !== activeAudio.id) {
      try {
        targetEl.pause();
      } catch {}
    }
  }, [isPlaying, activeAudio.id, activeAudio.url, volume, isMuted, previewingAudioId]);

  // Add Cinema Action VFX Item directly to VFX Timeline Track & open Right Adjust Inspector + On-Screen Route Handles
  const handleAddVfxLayer = (vfx: CinemaVfxItem) => {
    const startSec = Number(Math.max(0, Math.min(Math.max(0, totalDuration - 0.5), currentTimeRef.current)).toFixed(2));
    const newLayer: TimelineVfxLayer = {
      id: `vfx_layer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      vfx,
      startTimeSec: startSec,
      durationSec: vfx.defaultDurationSec,
      startXPct: 24,
      startYPct: 56,
      endXPct: 76,
      endYPct: 44,
      scale: 1.0,
      opacity: 100,
      speed: 1.0,
      includeImpactBlood: true,
    };
    setVfxLayers((prev) => [...prev, newLayer]);
    setSelectedVfxLayerId(newLayer.id);
    setSelectedStickerLayerId(null);
    setSelectedFeatureType('vfx');
    setActiveInspectorTab('adjust');
    setIsRightPanelOpen(true);
    // Position playhead inside the new VFX window so it appears live on screen immediately
    const previewT = startSec + newLayer.durationSec * 0.58;
    currentTimeRef.current = previewT;
    setCurrentTimeSec(previewT);
    logEditorTelemetry('edit_timeline');
  };

  // Add Sticker / Emoji directly onto Stickers Timeline Track with Round Resize Handles + Right Inspector
  const handleAddStickerLayer = (stk: StickerItem) => {
    const startSec = Number(Math.max(0, currentTimeRef.current).toFixed(2));
    const dur = Math.max(2.5, Math.min(6, (totalDuration || 6) - startSec) || 4);
    const offsetCount = activeStickers.length % 4;
    const newLayer: TimelineStickerLayer = {
      id: `stk_layer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sticker: stk,
      startTimeSec: startSec,
      durationSec: Number(dur.toFixed(1)),
      xPct: offsetCount % 2 === 0 ? 35 : 65,
      yPct: offsetCount < 2 ? 32 : 68,
      scale: 1.0,
      rotation: 0,
      opacity: 100,
    };
    setActiveStickers((prev) => [...prev, newLayer]);
    setSelectedStickerLayerId(newLayer.id);
    setSelectedVfxLayerId(null);
    setSelectedFeatureType('sticker');
    setActiveInspectorTab('adjust');
    setIsRightPanelOpen(true);
    logEditorTelemetry('edit_timeline');
  };

  // Apply a Transition and immediately preview it LIVE on the Player Canvas!
  const handleSelectTransition = (tr: TransitionItem) => {
    setSelectedTransitionId(tr.id);
    setSelectedFeatureType('transition');
    setActiveInspectorTab('adjust');
    setIsRightPanelOpen(true);
    const targetSeam =
      activeTransitionBetween !== null
        ? activeTransitionBetween
        : timelineClips.length >= 2
        ? Math.min(activeClipIndex, timelineClips.length - 2)
        : 0;

    if (timelineClips.length >= 2) {
      setActiveTransitionBetween(targetSeam);
      setClipTransitions((prev) => ({ ...prev, [targetSeam]: tr.name }));
      setClipTransitionObjects((prev) => ({ ...prev, [targetSeam]: tr }));

      let seamTime = 0;
      for (let i = 0; i <= targetSeam && i < timelineClips.length; i++) {
        seamTime += timelineClips[i].durationSec || 4;
      }
      const startAt = Math.max(0, seamTime - Math.min(0.65, tr.durationSec / 2));
      currentTimeRef.current = startAt;
      setCurrentTimeSec(startAt);
      setActiveClipIndex(targetSeam);
    }

    transitionPreviewRef.current = { item: tr, startMs: performance.now() };
    logEditorTelemetry('edit_timeline');
  };

  // Live render parameters ref so animation loop reads latest state cleanly without restarting
  const renderParamsRef = useRef({
    activeFilter,
    activeEffect,
    activeStickers,
    vfxLayers,
    clipTransitionObjects,
    showTitleOverlay,
    movieTitle,
    subtitle,
    directorText,
    titleStartSec,
    titleDurationSec,
    titleXPct,
    titleYPct,
    titleScale,
    titleOpacity,
    scaleX,
    scaleY,
    posX,
    posY,
    rotationDeg,
    flipH,
    flipV,
    opacity,
    totalDuration,
    colorBrightness,
    colorContrast,
    colorSaturation,
    colorExposure,
    colorWarmth,
    colorTint,
    colorHighlights,
    colorShadows,
    colorVignette,
    playbackSpeed,
    isReversePlayback,
    isVideoTrackVisible,
    isMuted,
    isAudioTrackMuted,
    volume,
    proRenderDeltas,
    chromaConfig,
    splitScreenConfig,
    titleAnimType,
    titleThemeType,
    trailerFxMode,
    trailerCardLayers,
  });

  useEffect(() => {
    renderParamsRef.current = {
      activeFilter,
      activeEffect,
      activeStickers,
      vfxLayers,
      clipTransitionObjects,
      showTitleOverlay,
      movieTitle,
      subtitle,
      directorText,
      titleStartSec,
      titleDurationSec,
      titleXPct,
      titleYPct,
      titleScale,
      titleOpacity,
      scaleX,
      scaleY,
      posX,
      posY,
      rotationDeg,
      flipH,
      flipV,
      opacity,
      totalDuration,
      colorBrightness,
      colorContrast,
      colorSaturation,
      colorExposure,
      colorWarmth,
      colorTint,
      colorHighlights,
      colorShadows,
      colorVignette,
      playbackSpeed,
      isReversePlayback,
      isVideoTrackVisible,
      isMuted,
      isAudioTrackMuted,
      volume,
      proRenderDeltas,
      chromaConfig,
      splitScreenConfig,
      titleAnimType,
      titleThemeType,
      trailerFxMode,
      trailerCardLayers,
    };
  }, [
    activeFilter,
    activeEffect,
    activeStickers,
    vfxLayers,
    clipTransitionObjects,
    showTitleOverlay,
    movieTitle,
    subtitle,
    directorText,
    titleStartSec,
    titleDurationSec,
    titleXPct,
    titleYPct,
    titleScale,
    titleOpacity,
    scaleX,
    scaleY,
    posX,
    posY,
    rotationDeg,
    flipH,
    flipV,
    opacity,
    totalDuration,
    colorBrightness,
    colorContrast,
    colorSaturation,
    colorExposure,
    colorWarmth,
    colorTint,
    colorHighlights,
    colorShadows,
    colorVignette,
    playbackSpeed,
    isReversePlayback,
    isVideoTrackVisible,
    isMuted,
    isAudioTrackMuted,
    volume,
    proRenderDeltas,
    chromaConfig,
    splitScreenConfig,
    titleAnimType,
    titleThemeType,
    trailerFxMode,
    trailerCardLayers,
  ]);

  // Continuous Sequential Video Drawing Loop across ALL clips in timelineClips
  useEffect(() => {
    if (studioView !== 'editor') return;
    const canvas = playerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true;
    let animId: number;
    let lastTimestamp = performance.now();
    let lastUiSyncTime = 0;
    let lastSyncedClipId: string | null = null;
    let wasPlaying = isPlayingRef.current;
    const lastValidFrameCanvas = document.createElement('canvas');
    let lastValidFrameClipUrl: string | null = null;

    // Preload media elements by arbitrary URL (used for Split Screen, Chroma BG & Trailer Cards)
    const getOrCreateUrlMedia = (url: string, mType: 'video' | 'photo') => {
      const cacheKey = `${mType}:${url}`;
      const existing = mediaCacheRef.current.get(cacheKey);
      if (existing) return existing;
      const isLocalAsset = url.startsWith('blob:') || url.startsWith('data:');
      if (mType === 'video') {
        const video = document.createElement('video');
        if (!isLocalAsset) {
          video.crossOrigin = 'anonymous';
        }
        video.playsInline = true;
        video.preload = 'auto';
        video.src = url;
        mediaCacheRef.current.set(cacheKey, video);
        return video;
      } else {
        const img = new Image();
        if (!isLocalAsset) {
          img.crossOrigin = 'anonymous';
        }
        img.src = url;
        mediaCacheRef.current.set(cacheKey, img);
        return img;
      }
    };

    // Preload media elements for all clips in timeline
    const getOrCreateMedia = (clip: TimelineClip) => {
      const cacheKey = `${clip.type}:${clip.url}`;
      const existing = mediaCacheRef.current.get(cacheKey);
      if (existing) return existing;

      if (clip.type === 'video') {
        const video = document.createElement('video');
        if (!clip.url.startsWith('blob:') && !clip.url.startsWith('data:')) {
          video.crossOrigin = 'anonymous';
        }
        video.playsInline = true;
        video.preload = 'auto';
        video.src = clip.url;
        video.onloadedmetadata = () => {
          if (
            !clip.id.startsWith('clip_split_') &&
            !clip.id.startsWith('clip_trim_') &&
            clip.sourceStartSec === undefined &&
            isFinite(video.duration) &&
            video.duration > 0 &&
            Math.abs(clip.durationSec - 10.0) < 0.05 &&
            Math.abs(video.duration - 10.0) > 0.15
          ) {
            const realDur = Number(video.duration.toFixed(1));
            setTimelineClips((prev) =>
              prev.map((c) =>
                c.url === clip.url && !c.id.startsWith('clip_split_') && !c.id.startsWith('clip_trim_') && c.sourceStartSec === undefined
                  ? { ...c, durationSec: realDur }
                  : c
              )
            );
          }
        };
        mediaCacheRef.current.set(cacheKey, video);
        return video;
      } else {
        const img = new Image();
        if (!clip.url.startsWith('blob:') && !clip.url.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        img.src = clip.url;
        mediaCacheRef.current.set(cacheKey, img);
        return img;
      }
    };

    const syncDomPlayhead = (tSec: number) => {
      if (playheadLineRef.current) {
        playheadLineRef.current.style.left = `${8 + tSec * pxPerSecRef.current}px`;
      }
      if (playerRangeRef.current) {
        playerRangeRef.current.value = String(Math.min(tSec, Number(playerRangeRef.current.max) || tSec));
      }
      if (playerTimecodeRef.current) {
        playerTimecodeRef.current.textContent = formatTimecode(tSec);
      }
      if (redBadgeTimeRef.current) {
        redBadgeTimeRef.current.textContent = formatMsTimecode(tSec);
      }
    };

    const render = (now: number) => {
      if (!active) return;
      const dt = Math.min(0.08, (now - lastTimestamp) / 1000);
      lastTimestamp = now;

      const p = renderParamsRef.current;
      const clips = timelineClipsRef.current;
      const exactTotalDuration = clips.reduce((acc, c) => acc + (c.durationSec || 4), 0);

      // Advance timeline smoothly; let active forward <video> decoder act as master clock so zero seek-stutters occur!
      if (isPlayingRef.current) {
        if (clips.length === 0 || exactTotalDuration <= 0) {
          currentTimeRef.current = 0;
          isPlayingRef.current = false;
          setIsPlaying(false);
          setCurrentTimeSec(0);
        } else if (p.isReversePlayback) {
          currentTimeRef.current -= dt * p.playbackSpeed;
          if (currentTimeRef.current <= 0) {
            currentTimeRef.current = 0;
            isPlayingRef.current = false;
            setIsPlaying(false);
            setCurrentTimeSec(0);
          } else {
            syncDomPlayhead(currentTimeRef.current);
            if (now - lastUiSyncTime > 180) {
              lastUiSyncTime = now;
              setCurrentTimeSec(currentTimeRef.current);
            }
          }
        } else {
          const preCheck = getClipAtTime(currentTimeRef.current, clips);
          const curClip = preCheck.clip;
          const curVidEl = curClip?.type === 'video' ? getOrCreateMedia(curClip) : null;
          const isMasterVideoActive =
            curClip &&
            curVidEl instanceof HTMLVideoElement &&
            !curVidEl.paused &&
            !curVidEl.seeking &&
            curVidEl.readyState >= 2 &&
            lastSyncedClipId === curClip.id;

          if (isMasterVideoActive && curVidEl instanceof HTMLVideoElement) {
            const sourceOffset = curClip.sourceStartSec || 0;
            const clipDur = curClip.durationSec || 4;
            const localFromVid = curVidEl.currentTime - sourceOffset;
            if (curVidEl.ended || localFromVid >= clipDur - 0.025) {
              currentTimeRef.current = preCheck.clipStart + clipDur;
            } else if (localFromVid >= -0.05) {
              currentTimeRef.current = preCheck.clipStart + Math.max(0, Math.min(clipDur, localFromVid));
            }
          } else if (!(curVidEl instanceof HTMLVideoElement && curVidEl.readyState < 2 && wasPlaying)) {
            // Smooth fallback clock for photo clips or initial preroll
            currentTimeRef.current += dt * p.playbackSpeed;
          }

          if (currentTimeRef.current >= exactTotalDuration) {
            currentTimeRef.current = exactTotalDuration;
            isPlayingRef.current = false;
            setIsPlaying(false);
            setCurrentTimeSec(exactTotalDuration);
            syncDomPlayhead(exactTotalDuration);
          } else {
            syncDomPlayhead(currentTimeRef.current);
            if (now - lastUiSyncTime > 180) {
              lastUiSyncTime = now;
              setCurrentTimeSec(currentTimeRef.current);
            }
          }
        }
      } else if (wasPlaying) {
        // Just paused/stopped: flush exact React state immediately
        setCurrentTimeSec(currentTimeRef.current);
      }

      // Resolve the exact clip corresponding to currentTimeRef.current
      const { clip: activeClip, index: resolvedIdx, localTime } = getClipAtTime(currentTimeRef.current, clips);

      if (resolvedIdx !== -1 && resolvedIdx !== activeClipIndexRef.current && isPlayingRef.current) {
        activeClipIndexRef.current = resolvedIdx;
        setActiveClipIndex(resolvedIdx);
      }

      // Collect keys of videos allowed to play simultaneously (active clip + split slots + chroma bg + card video)
      const keepPlayingKeys = new Set<string>();
      if (activeClip && activeClip.type === 'video') {
        keepPlayingKeys.add(`video:${activeClip.url}`);
      }
      if (p.splitScreenConfig.enabled) {
        if (p.splitScreenConfig.leftMediaUrl && p.splitScreenConfig.leftMediaType === 'video') {
          keepPlayingKeys.add(`video:${p.splitScreenConfig.leftMediaUrl}`);
        }
        if (p.splitScreenConfig.rightMediaUrl && p.splitScreenConfig.rightMediaType === 'video') {
          keepPlayingKeys.add(`video:${p.splitScreenConfig.rightMediaUrl}`);
        }
      }
      if (p.chromaConfig.enabled && p.chromaConfig.bgMode === 'custom_media' && p.chromaConfig.bgMediaUrl && p.chromaConfig.bgMediaType === 'video') {
        keepPlayingKeys.add(`video:${p.chromaConfig.bgMediaUrl}`);
      }
      p.trailerCardLayers.forEach((tc) => {
        if (tc.imageUrl && tc.mediaType === 'video') keepPlayingKeys.add(`video:${tc.imageUrl}`);
      });

      // Pause any non-active cached videos so audio/decoding doesn't overlap
      mediaCacheRef.current.forEach((el, key) => {
        if (el instanceof HTMLVideoElement) {
          if (!keepPlayingKeys.has(key) && !el.paused) {
            el.pause();
          }
        }
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Combined Filter + Color Grading + ProFX 660-Setting Engine
      const pr = p.proRenderDeltas;
      const baseFlt = p.activeFilter.cssFilter !== 'none' ? `${p.activeFilter.cssFilter} ` : '';
      const b = 100 + p.colorBrightness + p.colorExposure * 0.4 + p.colorHighlights * 0.2 + p.colorShadows * 0.15 + pr.brightness;
      const c = 100 + p.colorContrast + (p.colorHighlights - p.colorShadows) * 0.15 + pr.contrast;
      const s = 100 + p.colorSaturation + pr.saturation;
      const wTotal = Math.max(0, p.colorWarmth + pr.warmth);
      const tTotal = p.colorTint + pr.tint;
      const w = wTotal > 0 ? `sepia(${wTotal * 0.4}%) ` : '';
      const t = tTotal !== 0 ? `hue-rotate(${tTotal}deg) ` : '';
      const blurStr = pr.blur > 0.05 ? `blur(${pr.blur.toFixed(1)}px) ` : '';
      const isNeutralFilter =
        !baseFlt &&
        !w &&
        !t &&
        !blurStr &&
        Math.abs(b - 100) < 0.5 &&
        Math.abs(c - 100) < 0.5 &&
        Math.abs(s - 100) < 0.5;
      ctx.filter = isNeutralFilter
        ? 'none'
        : `${baseFlt}${w}${t}${blurStr}brightness(${Math.max(10, b)}%) contrast(${Math.max(10, c)}%) saturate(${Math.max(0, s)}%)`;
      ctx.globalAlpha = p.opacity / 100;

      const fxSecTime = isPlayingRef.current ? currentTimeRef.current : now / 1000;
      let bassShakeX = 0;
      let bassShakeY = 0;
      if (p.trailerFxMode === 'bass_shake') {
        const beat = Math.pow(Math.max(0, Math.sin(fxSecTime * 4.5)), 8);
        if (beat > 0.1) {
          bassShakeX = Math.sin(fxSecTime * 52) * 10 * beat;
          bassShakeY = Math.cos(fxSecTime * 48) * 7 * beat;
        }
      }

      ctx.translate(canvas.width / 2 + p.posX + bassShakeX, canvas.height / 2 + p.posY + bassShakeY);
      ctx.rotate((p.rotationDeg * Math.PI) / 180);
      ctx.scale((p.scaleX / 100) * (p.flipH ? -1 : 1), (p.scaleY / 100) * (p.flipV ? -1 : 1));

      // Helper to sync secondary video elements cleanly with timeline time
      const syncSecondaryVideo = (el: HTMLImageElement | HTMLVideoElement | null | undefined, muted = true) => {
        if (!(el instanceof HTMLVideoElement)) return;
        el.muted = muted;
        const vidDur = isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
        const tTarget = vidDur > 0 ? Math.min(Math.max(0, vidDur - 0.04), currentTimeRef.current % vidDur) : currentTimeRef.current;
        if (isPlayingRef.current) {
          if (p.isReversePlayback) {
            if (!el.paused) el.pause();
            if (el.readyState >= 1 && !el.seeking && Math.abs(el.currentTime - tTarget) > 0.08) {
              try {
                el.currentTime = tTarget;
              } catch {}
            }
          } else {
            if (el.readyState >= 1 && !el.seeking && Math.abs(el.currentTime - tTarget) > 0.9) {
              try {
                el.currentTime = tTarget;
              } catch {}
            }
            if (el.paused && el.readyState >= 2) {
              el.play().catch(() => {});
            }
          }
        } else {
          if (!el.paused) el.pause();
          if (el.readyState >= 1 && !el.seeking && Math.abs(el.currentTime - tTarget) > 0.06) {
            try {
              el.currentTime = tTarget;
            } catch {}
          }
        }
      };

      // Helper to draw a clip frame centered-cover (with instant thumbnail fallback & real-time Chroma Key support)
      const drawClipFrame = (clipItem: TimelineClip | undefined, localT: number, syncMediaPlayback: boolean) => {
        if (!p.isVideoTrackVisible || !clipItem?.url) return false;
        const mediaEl = getOrCreateMedia(clipItem);
        const chromaBgEl =
          p.chromaConfig.enabled && p.chromaConfig.bgMode === 'custom_media' && p.chromaConfig.bgMediaUrl
            ? getOrCreateUrlMedia(p.chromaConfig.bgMediaUrl, p.chromaConfig.bgMediaType || 'photo')
            : null;
        if (chromaBgEl instanceof HTMLVideoElement) {
          syncSecondaryVideo(chromaBgEl, true);
        }

        if (mediaEl instanceof HTMLVideoElement) {
          mediaEl.muted = p.isMuted || p.isAudioTrackMuted;
          mediaEl.volume = Math.max(0, Math.min(1, p.volume / 100));
          const safeRate = Math.min(8, Math.max(0.25, p.playbackSpeed));
          if (Math.abs(mediaEl.playbackRate - safeRate) > 0.01) {
            mediaEl.playbackRate = safeRate;
          }
          const vidDur = isFinite(mediaEl.duration) && mediaEl.duration > 0 ? mediaEl.duration : clipItem.durationSec;
          const desiredSourceTime = (clipItem.sourceStartSec || 0) + localT;
          const targetVideoTime = vidDur > 0 ? Math.min(Math.max(0, vidDur - 0.03), desiredSourceTime) : desiredSourceTime;
          if (syncMediaPlayback) {
            if (isPlayingRef.current) {
              const enteringClip = lastSyncedClipId !== clipItem.id || !wasPlaying;
              if (p.isReversePlayback) {
                if (!mediaEl.paused) mediaEl.pause();
                if (mediaEl.readyState >= 1 && !mediaEl.seeking && Math.abs(mediaEl.currentTime - targetVideoTime) > 0.06) {
                  try {
                    mediaEl.currentTime = targetVideoTime;
                  } catch {}
                }
              } else {
                // Seek ONLY when entering a new clip / starting play (or catastrophic > 1.2s desync), never mid-stream!
                if ((enteringClip && Math.abs(mediaEl.currentTime - targetVideoTime) > 0.12) || Math.abs(mediaEl.currentTime - targetVideoTime) > 1.2) {
                  try {
                    mediaEl.currentTime = targetVideoTime;
                  } catch {}
                }
                lastSyncedClipId = clipItem.id;
                if (mediaEl.paused && mediaEl.readyState >= 2) {
                  mediaEl.play().catch(() => {});
                }
              }
            } else {
              lastSyncedClipId = null;
              if (!mediaEl.paused) {
                mediaEl.pause();
              }
              if (mediaEl.readyState >= 1 && !mediaEl.seeking && Math.abs(mediaEl.currentTime - targetVideoTime) > 0.04) {
                try {
                  mediaEl.currentTime = targetVideoTime;
                } catch {}
              }
            }
          }
          if (mediaEl.readyState >= 2 && mediaEl.videoWidth > 0 && mediaEl.videoHeight > 0) {
            const vidAspect = mediaEl.videoWidth / mediaEl.videoHeight;
            const canvasAspect = canvas.width / canvas.height;
            let drawW = canvas.width;
            let drawH = canvas.height;
            if (vidAspect > canvasAspect) {
              drawW = canvas.height * vidAspect;
            } else {
              drawH = canvas.width / vidAspect;
            }
            if (p.chromaConfig.enabled) {
              drawChromaBackground(ctx, canvas.width, canvas.height, p.chromaConfig, fxSecTime, chromaBgEl, mediaEl);
              drawChromaKeyedSource(ctx, mediaEl, mediaEl.videoWidth, mediaEl.videoHeight, canvas.width, canvas.height, p.chromaConfig, 420);
            } else {
              ctx.drawImage(mediaEl, -drawW / 2, -drawH / 2, drawW, drawH);
            }
            if (!mediaEl.seeking) {
              if (lastValidFrameCanvas.width !== canvas.width || lastValidFrameCanvas.height !== canvas.height) {
                lastValidFrameCanvas.width = canvas.width;
                lastValidFrameCanvas.height = canvas.height;
              }
              const lCtx = lastValidFrameCanvas.getContext('2d');
              if (lCtx) {
                try {
                  lCtx.clearRect(0, 0, lastValidFrameCanvas.width, lastValidFrameCanvas.height);
                  lCtx.drawImage(
                    mediaEl,
                    (lastValidFrameCanvas.width - drawW) / 2,
                    (lastValidFrameCanvas.height - drawH) / 2,
                    drawW,
                    drawH
                  );
                  lastValidFrameClipUrl = clipItem.url;
                } catch {}
              }
            }
            return true;
          }
          if (lastValidFrameClipUrl === clipItem.url && lastValidFrameCanvas.width > 0) {
            if (p.chromaConfig.enabled) {
              drawChromaBackground(ctx, canvas.width, canvas.height, p.chromaConfig, fxSecTime, chromaBgEl, lastValidFrameCanvas as unknown as HTMLImageElement);
              drawChromaKeyedSource(ctx, lastValidFrameCanvas, lastValidFrameCanvas.width, lastValidFrameCanvas.height, canvas.width, canvas.height, p.chromaConfig, 420);
            } else {
              ctx.drawImage(
                lastValidFrameCanvas,
                -canvas.width / 2,
                -canvas.height / 2,
                canvas.width,
                canvas.height
              );
            }
            return true;
          }
          // Instant cached thumbnail fallback while decoder buffers first frame (prevents black blink)
          if (clipItem.thumbnailUrl) {
            let tImg = thumbCacheRef.current.get(clipItem.thumbnailUrl);
            if (!tImg) {
              tImg = new Image();
              if (!clipItem.thumbnailUrl.startsWith('blob:') && !clipItem.thumbnailUrl.startsWith('data:')) {
                tImg.crossOrigin = 'anonymous';
              }
              tImg.src = clipItem.thumbnailUrl;
              thumbCacheRef.current.set(clipItem.thumbnailUrl, tImg);
            }
            if (tImg.complete && tImg.naturalWidth > 0) {
              const imgAspect = tImg.naturalWidth / tImg.naturalHeight;
              const canvasAspect = canvas.width / canvas.height;
              let drawW = canvas.width;
              let drawH = canvas.height;
              if (imgAspect > canvasAspect) {
                drawW = canvas.height * imgAspect;
              } else {
                drawH = canvas.width / imgAspect;
              }
              if (p.chromaConfig.enabled) {
                drawChromaBackground(ctx, canvas.width, canvas.height, p.chromaConfig, fxSecTime, chromaBgEl, tImg);
                drawChromaKeyedSource(ctx, tImg, tImg.naturalWidth, tImg.naturalHeight, canvas.width, canvas.height, p.chromaConfig, 420);
              } else {
                ctx.drawImage(tImg, -drawW / 2, -drawH / 2, drawW, drawH);
              }
              return true;
            }
          }
        } else if (mediaEl instanceof HTMLImageElement) {
          if (syncMediaPlayback && isPlayingRef.current) {
            lastSyncedClipId = clipItem.id;
          }
          if (mediaEl.complete && mediaEl.naturalWidth > 0) {
            if (p.chromaConfig.enabled) {
              drawChromaBackground(ctx, canvas.width, canvas.height, p.chromaConfig, fxSecTime, chromaBgEl, mediaEl);
              drawChromaKeyedSource(ctx, mediaEl, mediaEl.naturalWidth, mediaEl.naturalHeight, canvas.width, canvas.height, p.chromaConfig, 420);
            } else {
              const imgAspect = mediaEl.naturalWidth / mediaEl.naturalHeight;
              const canvasAspect = canvas.width / canvas.height;
              let drawW = canvas.width;
              let drawH = canvas.height;
              if (imgAspect > canvasAspect) {
                drawW = canvas.height * imgAspect;
              } else {
                drawH = canvas.width / imgAspect;
              }
              ctx.drawImage(mediaEl, -drawW / 2, -drawH / 2, drawW, drawH);
            }
            return true;
          }
        }
        return false;
      };
      wasPlaying = isPlayingRef.current;

      // Check if a live Transition (either timeline seam OR one-click preview demo) is active right now
      let activeTrObj: TransitionItem | null = null;
      let trProgress = 0;
      let trOutClip: TimelineClip | undefined = activeClip;
      let trOutLocal = localTime;
      let trInClip: TimelineClip | undefined = activeClip;
      let trInLocal = 0;

      // 1. Check live preview animation triggered by clicking any transition item
      if (transitionPreviewRef.current) {
        const elapsedSec = (now - transitionPreviewRef.current.startMs) / 1000;
        const previewDur = transitionPreviewRef.current.item.durationSec || 0.9;
        if (elapsedSec <= previewDur) {
          activeTrObj = transitionPreviewRef.current.item;
          trProgress = Math.max(0, Math.min(1, elapsedSec / previewDur));
          if (clips.length >= 2) {
            const seamIdx = Math.min(Math.max(0, resolvedIdx), clips.length - 2);
            trOutClip = clips[seamIdx];
            trOutLocal = Math.max(0, (trOutClip?.durationSec || 4) - 0.3);
            trInClip = clips[seamIdx + 1];
            trInLocal = 0.2;
          }
        } else {
          transitionPreviewRef.current = null;
        }
      }

      // 2. Check timeline seam transitions while playing / scrubbing across clip boundaries
      if (!activeTrObj && clips.length >= 2) {
        let seamAcc = 0;
        for (let i = 0; i < clips.length - 1; i++) {
          seamAcc += clips[i].durationSec || 4;
          const seamTr = p.clipTransitionObjects[i];
          if (seamTr) {
            const half = (seamTr.durationSec || 0.8) / 2;
            if (currentTimeRef.current >= seamAcc - half && currentTimeRef.current <= seamAcc + half) {
              activeTrObj = seamTr;
              trProgress = (currentTimeRef.current - (seamAcc - half)) / (half * 2);
              trOutClip = clips[i];
              trOutLocal = Math.max(0, (clips[i].durationSec || 4) - half + trProgress * half);
              trInClip = clips[i + 1];
              trInLocal = trProgress * half;
              break;
            }
          }
        }
      }

      let drawn = false;
      if (p.splitScreenConfig.enabled) {
        const leftUrl = p.splitScreenConfig.leftMediaUrl || activeClip?.url || '';
        const leftType: 'video' | 'photo' = p.splitScreenConfig.leftMediaUrl
          ? p.splitScreenConfig.leftMediaType
          : activeClip?.type || 'photo';
        const fallbackRightClip = clips[1] || activeClip;
        const rightUrl = p.splitScreenConfig.rightMediaUrl || fallbackRightClip?.url || '';
        const rightType: 'video' | 'photo' = p.splitScreenConfig.rightMediaUrl
          ? p.splitScreenConfig.rightMediaType
          : fallbackRightClip?.type || 'photo';
        const leftEl = leftUrl ? getOrCreateUrlMedia(leftUrl, leftType) : null;
        const rightEl = rightUrl ? getOrCreateUrlMedia(rightUrl, rightType) : null;
        if (leftEl instanceof HTMLVideoElement) {
          if (activeClip && leftUrl === activeClip.url) {
            drawClipFrame(activeClip, localTime, true);
            ctx.clearRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
          } else {
            syncSecondaryVideo(leftEl, p.isMuted || p.isAudioTrackMuted);
          }
        }
        if (rightEl instanceof HTMLVideoElement && rightUrl !== leftUrl) {
          syncSecondaryVideo(rightEl, true);
        }
        drawn = drawSplitScreenComposition(ctx, canvas.width, canvas.height, p.splitScreenConfig, leftEl, rightEl);
      } else if (activeTrObj) {
        const effType = activeTrObj.effectType;
        if (effType === 'slide' || effType === 'whip') {
          ctx.save();
          ctx.translate(-trProgress * canvas.width, 0);
          drawn = drawClipFrame(trOutClip, trOutLocal, true) || drawn;
          ctx.restore();
          ctx.save();
          ctx.translate((1 - trProgress) * canvas.width, 0);
          drawn = drawClipFrame(trInClip, trInLocal, false) || drawn;
          ctx.restore();
        } else if (effType === 'zoom') {
          ctx.save();
          const outScale = 1 + trProgress * 0.45;
          ctx.scale(outScale, outScale);
          ctx.globalAlpha = Math.max(0, 1 - trProgress);
          drawn = drawClipFrame(trOutClip, trOutLocal, true) || drawn;
          ctx.restore();
          ctx.save();
          const inScale = 0.72 + trProgress * 0.28;
          ctx.scale(inScale, inScale);
          ctx.globalAlpha = trProgress;
          drawn = drawClipFrame(trInClip, trInLocal, false) || drawn;
          ctx.restore();
        } else if (effType === 'cube3d') {
          const angle = trProgress * Math.PI;
          const scaleHoriz = Math.max(0.05, Math.abs(Math.cos(angle)));
          ctx.save();
          ctx.scale(scaleHoriz, 1);
          if (trProgress < 0.5) {
            drawn = drawClipFrame(trOutClip, trOutLocal, true) || drawn;
          } else {
            drawn = drawClipFrame(trInClip, trInLocal, false) || drawn;
          }
          ctx.restore();
        } else if (effType === 'wipe') {
          drawn = drawClipFrame(trOutClip, trOutLocal, true) || drawn;
          ctx.save();
          ctx.beginPath();
          const maxR = Math.hypot(canvas.width / 2, canvas.height / 2);
          ctx.arc(0, 0, Math.max(1, trProgress * maxR), 0, Math.PI * 2);
          ctx.clip();
          drawn = drawClipFrame(trInClip, trInLocal, false) || drawn;
          ctx.restore();
        } else if (effType === 'glitch') {
          const jitterX = Math.sin(trProgress * 45) * 28 * (1 - Math.abs(trProgress - 0.5) * 2);
          ctx.save();
          ctx.translate(jitterX, 0);
          drawn =
            (trProgress < 0.5
              ? drawClipFrame(trOutClip, trOutLocal, true)
              : drawClipFrame(trInClip, trInLocal, false)) || drawn;
          ctx.fillStyle = `rgba(0, 255, 255, ${0.28 * Math.sin(trProgress * Math.PI)})`;
          ctx.fillRect(-canvas.width / 2, -canvas.height * 0.2, canvas.width, 18);
          ctx.fillStyle = `rgba(255, 0, 128, ${0.28 * Math.sin(trProgress * Math.PI)})`;
          ctx.fillRect(-canvas.width / 2, canvas.height * 0.12, canvas.width, 14);
          ctx.restore();
        } else if (effType === 'flash') {
          drawn =
            (trProgress < 0.5
              ? drawClipFrame(trOutClip, trOutLocal, true)
              : drawClipFrame(trInClip, trInLocal, false)) || drawn;
          const flashAlpha = Math.sin(trProgress * Math.PI) * 0.92;
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
          ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
          drawn = true;
        } else {
          // Dissolve default crossfade
          drawn = drawClipFrame(trOutClip, trOutLocal, true) || drawn;
          ctx.save();
          ctx.globalAlpha = trProgress;
          drawn = drawClipFrame(trInClip, trInLocal, false) || drawn;
          ctx.restore();
        }
      } else {
        drawn = drawClipFrame(activeClip, localTime, true);
      }

      if (!drawn) {
        const grad = ctx.createLinearGradient(-canvas.width / 2, -canvas.height / 2, canvas.width / 2, canvas.height / 2);
        grad.addColorStop(0, '#0c1618');
        grad.addColorStop(1, '#050709');
        ctx.fillStyle = grad;
        ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      }

      // Live VFX Overlay Rendering when user picks an Effect
      if (p.activeEffect) {
        const effT = p.activeEffect.effectType;
        const secT = now / 1000;
        ctx.save();
        ctx.filter = 'none';
        if (effT === 'light_leak' || effT === 'prism') {
          const lx = Math.sin(secT * 1.4) * (canvas.width * 0.25);
          const ly = Math.cos(secT * 1.1) * (canvas.height * 0.2);
          const leak = ctx.createRadialGradient(lx, ly, 10, lx, ly, canvas.width * 0.55);
          leak.addColorStop(0, effT === 'prism' ? 'rgba(192,132,252,0.55)' : 'rgba(245,158,11,0.55)');
          leak.addColorStop(0.5, effT === 'prism' ? 'rgba(34,211,238,0.28)' : 'rgba(239,68,68,0.22)');
          leak.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = leak;
          ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        } else if (effT === 'particles') {
          ctx.fillStyle = 'rgba(253, 230, 138, 0.78)';
          for (let k = 0; k < 28; k++) {
            const px = (((k * 173 + secT * 38) % canvas.width) + canvas.width) % canvas.width - canvas.width / 2;
            const py = (((k * 97 + secT * (22 + (k % 5) * 8)) % canvas.height) + canvas.height) % canvas.height - canvas.height / 2;
            ctx.beginPath();
            ctx.arc(px, py, 2 + (k % 3), 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (effT === 'grain') {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          for (let g = 0; g < 60; g++) {
            const gx = (((g * 317 + Math.floor(secT * 24) * 53) % canvas.width) - canvas.width / 2);
            const gy = (((g * 193 + Math.floor(secT * 24) * 37) % canvas.height) - canvas.height / 2);
            ctx.fillRect(gx, gy, 2, 2);
          }
        } else if (effT === 'glitch') {
          ctx.fillStyle = 'rgba(34,211,238,0.2)';
          const barY = ((Math.sin(secT * 9) * 0.45) * canvas.height);
          ctx.fillRect(-canvas.width / 2, barY, canvas.width, 8);
          ctx.fillStyle = 'rgba(244,63,94,0.22)';
          ctx.fillRect(-canvas.width / 2, -barY * 0.7, canvas.width, 6);
        } else if (effT === 'mist') {
          const mist = ctx.createLinearGradient(0, -canvas.height / 2, 0, canvas.height / 2);
          mist.addColorStop(0, 'rgba(203,213,225,0.12)');
          mist.addColorStop(1, 'rgba(226,232,240,0.42)');
          ctx.fillStyle = mist;
          ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        } else if (effT === 'neon') {
          ctx.strokeStyle = 'rgba(34,211,238,0.85)';
          ctx.lineWidth = 8;
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 20;
          ctx.strokeRect(-canvas.width / 2 + 16, -canvas.height / 2 + 16, canvas.width - 32, canvas.height - 32);
        } else if (effT === 'halftone') {
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          for (let y = -canvas.height / 2; y < canvas.height / 2; y += 8) {
            ctx.fillRect(-canvas.width / 2, y, canvas.width, 2);
          }
        }
        ctx.restore();
      }

      // Draw custom vignette + ProFX engine optical effects (glow, chromatic, film grain, letterbox)
      const combinedVignette = Math.min(95, p.colorVignette + pr.vignette);
      if (combinedVignette > 0) {
        const vigRadius = Math.min(canvas.width, canvas.height);
        const vigGrad = ctx.createRadialGradient(0, 0, vigRadius * 0.25, 0, 0, vigRadius * 0.7);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, `rgba(0,0,0,${(combinedVignette / 100) * 0.85})`);
        ctx.fillStyle = vigGrad;
        ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      }
      if (pr.glow > 0) {
        ctx.save();
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'screen';
        const gGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, canvas.width * 0.6);
        gGrad.addColorStop(0, `rgba(255, 232, 185, ${(pr.glow / 100) * 0.35})`);
        gGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gGrad;
        ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        ctx.restore();
      }
      if (pr.chromatic > 0) {
        ctx.save();
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'screen';
        const shiftPx = (pr.chromatic / 100) * 6;
        ctx.fillStyle = `rgba(255, 40, 90, 0.08)`;
        ctx.fillRect(-canvas.width / 2 + shiftPx, -canvas.height / 2, canvas.width, canvas.height);
        ctx.fillStyle = `rgba(34, 211, 238, 0.08)`;
        ctx.fillRect(-canvas.width / 2 - shiftPx, -canvas.height / 2, canvas.width, canvas.height);
        ctx.restore();
      }
      if (pr.filmGrain > 0) {
        ctx.save();
        ctx.filter = 'none';
        ctx.fillStyle = `rgba(255, 255, 255, ${(pr.filmGrain / 100) * 0.14})`;
        const tStep = Math.floor(now / 50);
        for (let g = 0; g < 45; g++) {
          const gx = (((g * 293 + tStep * 67) % canvas.width) - canvas.width / 2);
          const gy = (((g * 179 + tStep * 41) % canvas.height) - canvas.height / 2);
          ctx.fillRect(gx, gy, 2, 2);
        }
        ctx.restore();
      }
      if (pr.letterbox > 0) {
        const barH = (pr.letterbox / 100) * canvas.height;
        ctx.save();
        ctx.filter = 'none';
        ctx.fillStyle = '#000000';
        ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, barH);
        ctx.fillRect(-canvas.width / 2, canvas.height / 2 - barH, canvas.width, barH);
        ctx.restore();
      }

      // Transition live preview badge overlay while previewing
      if (activeTrObj) {
        ctx.save();
        ctx.filter = 'none';
        ctx.fillStyle = 'rgba(20, 184, 166, 0.9)';
        ctx.beginPath();
        ctx.roundRect(-140, -canvas.height / 2 + 18, 280, 28, 10);
        ctx.fill();
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`✨ ${activeTrObj.name}`, 0, -canvas.height / 2 + 32);
        ctx.restore();
      }

      // Trailer Visual FX Overlay (Anamorphic Flare, Flash Cuts, Countdown, Ember Storm, etc.)
      if (p.trailerFxMode !== 'none') {
        drawTrailerFxOverlay(ctx, canvas.width, canvas.height, p.trailerFxMode, fxSecTime);
      }

      ctx.restore();

      // Screen-space Overlays (aligned 1:1 with interactive on-screen round handles!)
      // 1. Render Animated Cinema Title ONLY within [titleStartSec .. titleStartSec + titleDurationSec]
      const tCur = currentTimeRef.current;
      if (
        p.showTitleOverlay &&
        p.movieTitle &&
        (p.totalDuration <= 0 || (tCur >= p.titleStartSec - 0.05 && tCur <= p.titleStartSec + p.titleDurationSec + 0.05))
      ) {
        drawAnimatedCinemaTitle(ctx, canvas.width, canvas.height, {
          movieTitle: p.movieTitle,
          subtitle: p.subtitle,
          directorText: p.directorText,
          titleXPct: p.titleXPct,
          titleYPct: p.titleYPct,
          titleScale: p.titleScale,
          titleOpacity: p.titleOpacity,
          titleStartSec: p.titleStartSec,
          globalTimeSec: tCur,
          animationType: p.titleAnimType,
          themeType: p.titleThemeType,
          exportScaleRatio: canvas.width / 1280,
        });
      }

      // 2. Render Independent Timeline Stickers / Emojis (positioned & scaled interactively!)
      if (p.activeStickers.length > 0) {
        p.activeStickers.forEach((layer) => {
          if (p.totalDuration > 0 && (tCur < layer.startTimeSec - 0.05 || tCur > layer.startTimeSec + layer.durationSec + 0.05)) {
            return;
          }
          const sx = (layer.xPct / 100) * canvas.width;
          const sy = (layer.yPct / 100) * canvas.height;
          ctx.save();
          ctx.filter = 'none';
          ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity / 100));
          ctx.translate(sx, sy);
          ctx.rotate((layer.rotation * Math.PI) / 180);
          ctx.scale(layer.scale, layer.scale);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = '#2dd4bf';
          ctx.lineWidth = 2;
          const bw = 180;
          const bh = 42;
          ctx.beginPath();
          ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 12);
          ctx.fill();
          ctx.stroke();
          ctx.font = 'bold 18px system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${layer.sticker.emoji} ${layer.sticker.badgeText}`, 0, 0);
          ctx.restore();
        });
      }

      // 3. Render Cinema Action VFX Layers (Bullets Gun->Body, Blood, Muzzle Flash, Explosions, etc.)
      if (p.vfxLayers.length > 0) {
        p.vfxLayers.forEach((vLayer) => {
          drawCinemaVfxOnCanvas(ctx, canvas.width, canvas.height, vLayer, tCur);
        });
      }

      // 4. Render Image-to-Trailer Animated Cards
      if (p.trailerCardLayers.length > 0) {
        p.trailerCardLayers.forEach((card) => {
          const cardSrc = card.imageUrl ? getOrCreateUrlMedia(card.imageUrl, card.mediaType) : null;
          if (cardSrc instanceof HTMLVideoElement) {
            syncSecondaryVideo(cardSrc, true);
          }
          drawTrailerCardOnCanvas(ctx, canvas.width, canvas.height, card, cardSrc, tCur);
        });
      }

      // Dual-Screen Mode: Render Screen 1 (Active Filter & Effect Preview)
      if (filterPreviewCanvasRef.current) {
        const fCanvas = filterPreviewCanvasRef.current;
        const fCtx = fCanvas.getContext('2d');
        if (fCtx) {
          fCtx.clearRect(0, 0, fCanvas.width, fCanvas.height);
          fCtx.save();
          fCtx.filter = ctx.filter;
          if (activeClip) {
            const mEl = getOrCreateMedia(activeClip);
            if (mEl instanceof HTMLVideoElement && mEl.readyState >= 2) {
              const vidAspect = mEl.videoWidth / mEl.videoHeight;
              const cAspect = fCanvas.width / fCanvas.height;
              let dW = fCanvas.width;
              let dH = fCanvas.height;
              if (vidAspect > cAspect) dW = fCanvas.height * vidAspect;
              else dH = fCanvas.width / vidAspect;
              fCtx.drawImage(mEl, (fCanvas.width - dW) / 2, (fCanvas.height - dH) / 2, dW, dH);
            } else if (mEl instanceof HTMLImageElement && mEl.complete && mEl.naturalWidth > 0) {
              const imgAspect = mEl.naturalWidth / mEl.naturalHeight;
              const cAspect = fCanvas.width / fCanvas.height;
              let dW = fCanvas.width;
              let dH = fCanvas.height;
              if (imgAspect > cAspect) dW = fCanvas.height * imgAspect;
              else dH = fCanvas.width / imgAspect;
              fCtx.drawImage(mEl, (fCanvas.width - dW) / 2, (fCanvas.height - dH) / 2, dW, dH);
            }
          } else {
            fCtx.fillStyle = '#0a0e17';
            fCtx.fillRect(0, 0, fCanvas.width, fCanvas.height);
          }
          fCtx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      active = false;
      cancelAnimationFrame(animId);
      mediaCacheRef.current.forEach((el) => {
        if (el instanceof HTMLVideoElement) {
          el.pause();
        }
      });
    };
  }, [studioView, canvasDims]);

  // Sequential video probe helper so uploading multiple large phone videos never overwhelms WebView decoders
  const probeVideoMetadataSafe = (id: string, url: string) =>
    new Promise<void>((resolve) => {
      const probeVid = document.createElement('video');
      probeVid.preload = 'metadata';
      probeVid.muted = true;
      probeVid.playsInline = true;
      let probeCleaned = false;
      const cleanupProbe = () => {
        if (probeCleaned) return;
        probeCleaned = true;
        try {
          probeVid.onloadedmetadata = null;
          probeVid.onseeked = null;
          probeVid.onerror = null;
          probeVid.pause();
          probeVid.removeAttribute('src');
          probeVid.load();
        } catch {}
        resolve();
      };
      const safetyTimer = window.setTimeout(cleanupProbe, 6500);
      probeVid.src = url;
      probeVid.load();
      probeVid.onloadedmetadata = () => {
        const realDur = isFinite(probeVid.duration) && probeVid.duration > 0 ? Number(probeVid.duration.toFixed(1)) : 10.0;
        const mins = Math.floor(realDur / 60);
        const secs = Math.floor(realDur % 60);
        const fmt = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        try {
          probeVid.currentTime = Math.min(0.4, realDur / 3);
        } catch {}

        void updateLocalMediaMetadata(id, { duration: fmt, durationSec: realDur });

        setMediaGallery((prev) =>
          prev.map((m) => (m.id === id ? { ...m, durationSec: realDur, duration: fmt } : m))
        );
        setTimelineClips((prev) =>
          prev.map((c) =>
            c.url === url && !c.id.startsWith('clip_split_') && !c.id.startsWith('clip_trim_') && c.sourceStartSec === undefined
              ? { ...c, durationSec: realDur }
              : c
          )
        );
      };
      probeVid.onseeked = () => {
        try {
          const c = document.createElement('canvas');
          c.width = 160;
          c.height = 90;
          const cctx = c.getContext('2d');
          if (cctx && probeVid.videoWidth > 0) {
            cctx.drawImage(probeVid, 0, 0, c.width, c.height);
            const thumb = c.toDataURL('image/jpeg', 0.45);
            void updateLocalMediaMetadata(id, { thumbnailUrl: thumb });
            setMediaGallery((prev) =>
              prev.map((m) => (m.id === id ? { ...m, thumbnailUrl: thumb } : m))
            );
            setTimelineClips((prev) =>
              prev.map((cl) => (cl.url === url ? { ...cl, thumbnailUrl: thumb } : cl))
            );
          }
        } catch {}
        window.clearTimeout(safetyTimer);
        cleanupProbe();
      };
      probeVid.onerror = () => {
        window.clearTimeout(safetyTimer);
        cleanupProbe();
      };
    });

  // Handle User Device Multi-file Upload (Videos, Photos & Audio saved locally on device!)
  const handleUserAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const addedItems: AudioItem[] = [];
    Array.from(files).forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      const id = `user_audio_${Date.now()}_${idx}`;
      localMediaUrlMapRef.current.set(id, url);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
      const audioItem: AudioItem = {
        id,
        title: cleanTitle,
        category: 'Device Audio',
        duration: '00:15',
        durationSec: 15,
        bpm: 100,
        mood: 'Local File',
        description: 'Private audio/music stored locally on this device.',
        synthPreset: 'cinematic',
        url,
      };
      addedItems.push(audioItem);

      void saveLocalMediaRecord({
        id,
        file,
        name: file.name,
        mimeType: file.type || 'audio/mpeg',
        mediaType: 'audio',
        duration: audioItem.duration,
        durationSec: audioItem.durationSec,
        createdAt: Date.now(),
      });

      const probeAud = new Audio();
      probeAud.preload = 'metadata';
      probeAud.src = url;
      probeAud.onloadedmetadata = () => {
        if (isFinite(probeAud.duration) && probeAud.duration > 0) {
          const realDur = Number(probeAud.duration.toFixed(1));
          const fmt = `${String(Math.floor(realDur / 60)).padStart(2, '0')}:${String(Math.floor(realDur % 60)).padStart(2, '0')}`;
          void updateLocalMediaMetadata(id, { duration: fmt, durationSec: realDur });
          setUserAudioLibrary((prev) =>
            prev.map((a) => (a.id === id ? { ...a, duration: fmt, durationSec: realDur } : a))
          );
          setActiveAudio((cur) => (cur.id === id ? { ...cur, duration: fmt, durationSec: realDur } : cur));
        }
      };
    });

    if (addedItems.length > 0) {
      setUserAudioLibrary((prev) => [...addedItems, ...prev]);
      setActiveAudio(addedItems[0]);
      setSelectedFeatureType('audio');
      setActiveInspectorTab('audio');
      setActiveTab('Audio');
      setIsLeftPanelOpen(true);
    }
    e.target.value = '';
  };

  const handleUserDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>, isSetup = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newMediaItems: MediaItem[] = [];
    const videosToProbe: Array<{ id: string; url: string }> = [];

    Array.from(files).forEach((file, idx) => {
      // Handle audio files gracefully if selected via general media picker on Android/WebView
      if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name)) {
        const audioUrl = URL.createObjectURL(file);
        const audioId = `user_audio_${Date.now()}_${idx}`;
        localMediaUrlMapRef.current.set(audioId, audioUrl);
        const audioItem: AudioItem = {
          id: audioId,
          title: file.name.replace(/\.[^/.]+$/, ''),
          category: 'Device Audio',
          duration: '00:15',
          durationSec: 15,
          bpm: 100,
          mood: 'Local File',
          description: 'Private audio/music stored locally on this device.',
          synthPreset: 'cinematic',
          url: audioUrl,
        };
        void saveLocalMediaRecord({
          id: audioId,
          file,
          name: file.name,
          mimeType: file.type || 'audio/mpeg',
          mediaType: 'audio',
          duration: '00:15',
          durationSec: 15,
          createdAt: Date.now(),
        });
        setUserAudioLibrary((prev) => [audioItem, ...prev]);
        setActiveAudio(audioItem);
        return;
      }

      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv|3gp|avi)$/i.test(file.name);
      const id = `user_media_${Date.now()}_${idx}`;
      localMediaUrlMapRef.current.set(id, url);

      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
      const item: MediaItem = {
        id,
        title: cleanTitle,
        duration: isVideo ? '00:10' : '00:04',
        durationSec: isVideo ? 10.0 : 4.0,
        url,
        thumbnailUrl: isVideo ? undefined : url,
        type: isVideo ? 'video' : 'photo',
        category: isVideo ? 'Video' : 'Photo',
      };
      newMediaItems.push(item);

      // Persist actual File/Blob inside user's own device IndexedDB storage (with safe large-file fallback)
      void saveLocalMediaRecord({
        id,
        file,
        name: file.name,
        mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        mediaType: isVideo ? 'video' : 'photo',
        duration: item.duration,
        durationSec: item.durationSec,
        createdAt: Date.now(),
      });

      if (isVideo) {
        videosToProbe.push({ id, url });
      }
    });

    if (videosToProbe.length > 0) {
      void (async () => {
        for (const entry of videosToProbe) {
          await probeVideoMetadataSafe(entry.id, entry.url);
        }
      })();
    }

    if (newMediaItems.length > 0) {
      const updatedGallery = [...newMediaItems, ...mediaGallery];
      setMediaGallery(updatedGallery);
      logEditorTelemetry('add_media', timelineClips, totalDuration);

      if (isSetup) {
        setSetupSelectedMediaIds((prev) => [...prev, ...newMediaItems.map((m) => m.id)]);
      } else {
        setActiveTab('Media');
        setIsLeftPanelOpen(true);
      }
    }
    e.target.value = '';
  };

  // Add individual media item directly from Media Pool to Timeline
  const handleAddMediaToTimeline = (item: MediaItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newClip: TimelineClip = {
      id: `clip_${Date.now()}_${item.id}`,
      mediaId: item.id,
      title: item.title,
      durationSec: item.durationSec,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      type: item.type,
    };
    const nextClips = [...timelineClips, newClip];
    setTimelineClips(nextClips);
    setActiveClipIndex(nextClips.length - 1);
    saveCurrentProjectToStorage(nextClips);
    logEditorTelemetry('edit_timeline', nextClips);
  };

  // Delete an uploaded media item from the user gallery & device IndexedDB + revoke blob URL
  const handleDeleteUploadedMedia = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = mediaGallery.filter((m) => m.id !== id);
    setMediaGallery(updated);
    setSetupSelectedMediaIds((prev) => prev.filter((mid) => mid !== id));
    setSelectedMediaIds((prev) => prev.filter((mid) => mid !== id));
    const existingUrl = localMediaUrlMapRef.current.get(id);
    if (existingUrl && existingUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(existingUrl);
      } catch {}
    }
    localMediaUrlMapRef.current.delete(id);
    void deleteLocalMediaRecord(id);
  };

  // Import Selected Media to Timeline
  const handleImportSelectedMedia = () => {
    const toAdd = mediaGallery.filter((m) => selectedMediaIds.includes(m.id));
    if (toAdd.length > 0) {
      const newClips: TimelineClip[] = toAdd.map((item, idx) => ({
        id: `clip_${Date.now()}_${idx}_${item.id}`,
        mediaId: item.id,
        title: item.title,
        durationSec: item.durationSec,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        type: item.type,
      }));
      const nextClips = [...timelineClips, ...newClips];
      setTimelineClips(nextClips);
      saveCurrentProjectToStorage(nextClips);
      logEditorTelemetry('edit_timeline', nextClips);
    }
    setSelectedMediaIds([]);
  };

  // Finish Setup and Start Editing
  const handleFinishSetupAndOpenEditor = () => {
    let finalClips: TimelineClip[] = [];
    if (setupSelectedMediaIds.length > 0) {
      const chosen = mediaGallery.filter((m) => setupSelectedMediaIds.includes(m.id));
      if (chosen.length > 0) {
        finalClips = chosen.map((item, idx) => ({
          id: `setup_clip_${Date.now()}_${idx}`,
          mediaId: item.id,
          title: item.title,
          durationSec: item.durationSec,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
          type: item.type,
        }));
      }
    }

    const newProjId = `proj_${Date.now()}`;
    setCurrentEditingProjectId(newProjId);
    setTimelineClips(finalClips);
    setActiveClipIndex(0);
    currentTimeRef.current = 0;
    setCurrentTimeSec(0);

    // Auto-save project so it immediately shows on the Home screen
    saveCurrentProjectToStorage(finalClips, projectName, selectedAspectRatio, newProjId);
    logEditorTelemetry('edit_timeline', finalClips);
    setStudioView('editor');
  };

  // Direct quick upload for Chroma BG, Split Screen Slot 1/2, & Image-to-Trailer Card
  const handleQuickSlotUpload = (
    file: File,
    onReady: (url: string, mediaType: 'video' | 'photo', title: string, item: MediaItem) => void
  ) => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv|3gp|avi)$/i.test(file.name);
    const id = `slot_media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    localMediaUrlMapRef.current.set(id, url);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
    const mType: 'video' | 'photo' = isVideo ? 'video' : 'photo';
    const item: MediaItem = {
      id,
      title: cleanTitle,
      duration: isVideo ? '00:10' : '00:05',
      durationSec: isVideo ? 10.0 : 5.0,
      url,
      thumbnailUrl: isVideo ? undefined : url,
      type: mType,
      category: isVideo ? 'Video' : 'Photo',
    };
    setMediaGallery((prev) => [item, ...prev]);
    void saveLocalMediaRecord({
      id,
      file,
      name: file.name,
      mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
      mediaType: mType,
      duration: item.duration,
      durationSec: item.durationSec,
      createdAt: Date.now(),
    });
    onReady(url, mType, cleanTitle, item);
  };

  // Add an Image-to-Trailer Animated Card onto canvas & timeline (auto-ensures base backdrop clip if empty)
  const handleAddTrailerCard = (override?: {
    imageUrl?: string;
    mediaType?: 'video' | 'photo';
    title?: string;
    subtitle?: string;
    badgeText?: string;
    theme?: TrailerCardTheme;
    animation?: TrailerCardAnimation;
  }) => {
    const fallbackClip = timelineClips[activeClipIndex] || timelineClips[0] || mediaGallery[0];
    const resolvedUrl = override?.imageUrl ?? draftCardImageUrl ?? fallbackClip?.url ?? '';
    const resolvedType = override?.mediaType ?? (draftCardImageUrl ? draftCardMediaType : fallbackClip?.type || 'photo');

    if (timelineClips.length === 0 && resolvedUrl) {
      const baseClip: TimelineClip = {
        id: `trailer_base_${Date.now()}`,
        mediaId: fallbackClip?.id || `tb_${Date.now()}`,
        title: override?.title || draftCardTitle || 'Trailer Card Scene',
        durationSec: 6.0,
        url: resolvedUrl,
        thumbnailUrl: resolvedType === 'photo' ? resolvedUrl : fallbackClip?.thumbnailUrl,
        type: resolvedType,
      };
      setTimelineClips([baseClip]);
      setActiveClipIndex(0);
    }

    const startT = Number(Math.max(0, currentTimeRef.current).toFixed(1));
    const card: TrailerCardLayer = {
      id: `tcard_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      imageUrl: resolvedUrl,
      mediaType: resolvedType,
      title: override?.title ?? (draftCardTitle.trim() || 'THE PREMIERE'),
      subtitle: override?.subtitle ?? (draftCardSubtitle.trim() || 'IN CINEMAS SOON'),
      badgeText: override?.badgeText ?? (draftCardBadge.trim() || 'OFFICIAL TRAILER'),
      theme: override?.theme ?? draftCardTheme,
      animation: override?.animation ?? draftCardAnim,
      startTimeSec: startT,
      durationSec: 5.0,
      scale: 0.92,
      xPct: 50,
      yPct: 50,
      opacity: 100,
    };
    setTrailerCardLayers((prev) => [...prev, card]);
    setSelectedTrailerCardId(card.id);
    setSelectedStickerLayerId(null);
    setSelectedVfxLayerId(null);
    setSelectedFeatureType('trailer_card');
    setActiveInspectorTab('adjust');
    setIsRightPanelOpen(true);
    logEditorTelemetry('edit_timeline');
  };

  // Filtered lists for the active tab (with sub-category and search query filtering)
  const filteredFilters = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return FILTERS_LIST.filter((f) => {
      const matchCat = activeSubCategory === 'All' || f.category === activeSubCategory;
      const matchQ = !q || f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeSubCategory, searchQuery]);

  const filteredAudio = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const combined = [...userAudioLibrary, ...AUDIO_LIST];
    return combined.filter((a) => {
      const matchCat = activeSubCategory === 'All' || a.category === activeSubCategory;
      const matchQ = !q || a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeSubCategory, searchQuery, userAudioLibrary]);

  const filteredTransitions = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return TRANSITIONS_LIST.filter((t) => {
      const matchCat = activeSubCategory === 'All' || t.category === activeSubCategory;
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeSubCategory, searchQuery]);

  const filteredEffects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return EFFECTS_LIST.filter((e) => {
      const matchCat = activeSubCategory === 'All' || e.category === activeSubCategory;
      const matchQ = !q || e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeSubCategory, searchQuery]);

  const filteredTitles = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return TITLES_LIST.filter((t) => {
      const matchCat = activeSubCategory === 'All' || t.category === activeSubCategory;
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.titleText.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeSubCategory, searchQuery]);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return TEMPLATES_LIST.filter((t) => {
      const matchCat = activeSubCategory === 'All' || t.category === activeSubCategory;
      const matchQ = !q || t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeSubCategory, searchQuery]);

  const filteredUserMedia = useMemo(() => {
    return mediaGallery.filter((item) => {
      const matchType =
        mediaFilter === 'All' ||
        (mediaFilter === 'Video' && item.type === 'video') ||
        (mediaFilter === 'Photo' && item.type === 'photo');
      const matchQ = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchQ;
    });
  }, [mediaGallery, mediaFilter, searchQuery]);

  const filteredStickers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return STICKERS_LIST.filter((s) => {
      const matchCat = activeSubCategory === 'All' || s.category === activeSubCategory;
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.badgeText.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeSubCategory, searchQuery]);

  const filteredVfxCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return VFX_LIST.filter((v) => {
      const matchCat = activeSubCategory === 'All' || v.category === activeSubCategory;
      const matchQ = !q || v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q) || v.description.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeSubCategory, searchQuery]);

  const filteredColorGrades = useMemo(() => {
    const q = colorGradeSearch.toLowerCase();
    return COLOR_GRADES_LIST.filter(
      (cg) => !q || cg.name.toLowerCase().includes(q) || cg.category.toLowerCase().includes(q) || cg.description.toLowerCase().includes(q)
    );
  }, [colorGradeSearch]);

  const filteredProFeatures = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return PRO_EDITOR_FEATURES.filter((feat) => {
      const matchCat = activeSubCategory === 'All' || feat.category === activeSubCategory;
      const matchQ =
        !q ||
        feat.name.toLowerCase().includes(q) ||
        feat.category.toLowerCase().includes(q) ||
        String(feat.index).includes(q);
      return matchCat && matchQ;
    });
  }, [activeSubCategory, searchQuery]);

  const activePreviewThumbUrl = useMemo(() => {
    const clip = timelineClips[activeClipIndex] || timelineClips[0];
    if (clip) {
      if (clip.thumbnailUrl) return clip.thumbnailUrl;
      if (clip.type === 'photo' && clip.url) return clip.url;
    }
    const galPhoto = mediaGallery.find((m) => m.thumbnailUrl || (m.type === 'photo' && m.url));
    if (galPhoto) return galPhoto.thumbnailUrl || galPhoto.url;
    return FILTERS_LIST[0]?.thumbnail || '';
  }, [timelineClips, activeClipIndex, mediaGallery]);

  const filteredProSettings = useMemo(() => {
    if (!activeProFeature) return [];
    const q = proSettingsSearch.toLowerCase().trim();
    return activeFeatureCatalog.filter((s) => {
      const matchMod = proSettingsModuleFilter === 'all' || s.moduleId === proSettingsModuleFilter;
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.partLabel.toLowerCase().includes(q) ||
        s.moduleTitle.toLowerCase().includes(q);
      return matchMod && matchQ;
    });
  }, [activeProFeature, activeFeatureCatalog, proSettingsModuleFilter, proSettingsSearch]);

  // =========================================================================
  // REAL MULTI-CLIP VIDEO EXPORT (ALL TIMELINE CLIPS -> PLAYABLE VIDEO FILE)
  // Combines all videos/photos on timeline in sequence with transitions,
  // filters, color grading, VFX, stickers, speed & audio using MediaRecorder!
  // =========================================================================
  const handleStartExport = async () => {
    if (timelineClips.length === 0) {
      setExportError(
        isMl
          ? 'ആദ്യം ടൈംലൈനിൽ കുറഞ്ഞത് ഒരു വീഡിയോയോ ഫോട്ടോയോ ചേർക്കുക.'
          : 'Please add at least one video or photo clip to the timeline before exporting.'
      );
      return;
    }

    clearExportedPreview();
    setExportError(null);
    exportCancelRef.current = false;
    setIsPlaying(false);
    setIsExporting(true);
    setExportProgress(2);
    setExportElapsedSec(0);
    setExportEstimatedTotalSec(Math.max(1, Math.ceil(totalDuration / Math.max(0.25, Math.min(8, playbackSpeed)))));
    setExportStatusText(isMl ? 'വീഡിയോ ഡീകോഡറുകൾ തയ്യാറാക്കുന്നു...' : 'Preparing video decoders...');

    // Release preview video hardware decoders first so mobile/Android has full hardware codec slots for export
    mediaCacheRef.current.forEach((el, key) => {
      if (el instanceof HTMLVideoElement) {
        try {
          el.pause();
          el.removeAttribute('src');
          el.load();
        } catch {}
        mediaCacheRef.current.delete(key);
      }
    });

    const reqDims = computeRequestedExportDimensions(projectResolution, selectedAspectRatio);
    const probedWebCodecs = await probeSupportedVideoEncoderConfig(
      reqDims.outW,
      reqDims.outH,
      projectResolution,
      30
    ).catch(() => null);

    if (exportCancelRef.current) {
      setIsExporting(false);
      return;
    }

    const getFallbackDimensions = () => {
      const makeAligned16 = (n: number) => Math.max(64, Math.floor(n / 16) * 16);
      const isMobileUA = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      const maxFallbackEdge = isMobileUA ? 1920 : reqDims.outW > 1920 ? 2560 : 1920;
      const longest = Math.max(reqDims.outW, reqDims.outH);
      if (longest <= maxFallbackEdge) {
        return { outW: makeAligned16(reqDims.outW), outH: makeAligned16(reqDims.outH) };
      }
      const s = maxFallbackEdge / longest;
      return { outW: makeAligned16(reqDims.outW * s), outH: makeAligned16(reqDims.outH * s) };
    };

    const fallbackDims = getFallbackDimensions();
    let outW = probedWebCodecs ? probedWebCodecs.outW : fallbackDims.outW;
    let outH = probedWebCodecs ? probedWebCodecs.outH : fallbackDims.outH;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = outW;
    exportCanvas.height = outH;
    // Keep canvas inside visible onscreen compositor container so mobile Blink never culls GPU textures
    exportCanvas.style.cssText = 'width:4px;height:4px;position:absolute;inset:0;pointer-events:none;';
    const eCtx = exportCanvas.getContext('2d', { alpha: false });
    if (!eCtx) {
      setIsExporting(false);
      setExportError('Canvas context unavailable for video export.');
      return;
    }

    // Mount export <video> tags AND exportCanvas inside an onscreen compositor-active DOM container
    const exportHostDiv = document.createElement('div');
    exportHostDiv.style.cssText =
      'position:fixed;right:2px;bottom:2px;width:4px;height:4px;opacity:0.04;pointer-events:none;overflow:hidden;z-index:1;';
    exportHostDiv.appendChild(exportCanvas);
    document.body.appendChild(exportHostDiv);

    const exportMediaMap = new Map<string, HTMLImageElement | HTMLVideoElement>();
    const lastValidFrames = new Map<string, HTMLCanvasElement>();
    let exportAudioCtx: AudioContext | null = null;
    let audioDest: MediaStreamAudioDestinationNode | null = null;
    let exportBgAudioEl: HTMLAudioElement | null = null;
    let isDeterministicSeekMode = Boolean(probedWebCodecs);

    const cleanupExportResources = () => {
      if (exportBgAudioEl) {
        try {
          exportBgAudioEl.pause();
          exportBgAudioEl.removeAttribute('src');
          exportBgAudioEl.load();
        } catch {}
        exportBgAudioEl = null;
      }
      exportMediaMap.forEach((el) => {
        if (el instanceof HTMLVideoElement) {
          try {
            el.pause();
            el.removeAttribute('src');
            el.load();
          } catch {}
        }
      });
      exportMediaMap.clear();
      lastValidFrames.clear();
      if (exportCanvas.parentNode) {
        try {
          exportCanvas.parentNode.removeChild(exportCanvas);
        } catch {}
      }
      if (exportHostDiv.parentNode) {
        try {
          exportHostDiv.parentNode.removeChild(exportHostDiv);
        } catch {}
      }
      if (exportAudioCtx && exportAudioCtx.state !== 'closed') {
        try {
          void exportAudioCtx.close();
        } catch {}
      }
      // Re-warm editor preview media elements cleanly after export completes or cancels
      timelineClipsRef.current.forEach((clip) => {
        if (!clip.url) return;
        const cacheKey = `${clip.type}:${clip.url}`;
        if (!mediaCacheRef.current.has(cacheKey) && clip.type === 'video') {
          const video = document.createElement('video');
          if (!clip.url.startsWith('blob:') && !clip.url.startsWith('data:')) {
            video.crossOrigin = 'anonymous';
          }
          video.playsInline = true;
          video.preload = 'auto';
          video.src = clip.url;
          video.load();
          mediaCacheRef.current.set(cacheKey, video);
        }
      });
    };

    const waitForSeek = (vid: HTMLVideoElement, targetSec: number, timeoutMs = 1800) =>
      new Promise<void>((resolve) => {
        const clamped = isFinite(vid.duration) && vid.duration > 0 ? Math.min(Math.max(0, vid.duration - 0.04), Math.max(0, targetSec)) : Math.max(0, targetSec);
        if (Math.abs(vid.currentTime - clamped) <= 0.05 && vid.readyState >= 2) {
          resolve();
          return;
        }
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          vid.removeEventListener('seeked', finish);
          window.clearTimeout(timer);
          resolve();
        };
        const timer = window.setTimeout(finish, timeoutMs);
        vid.addEventListener('seeked', finish, { once: true });
        try {
          vid.currentTime = clamped;
        } catch {
          finish();
        }
      });

    const captureSnapshot = (key: string, source: HTMLVideoElement | HTMLImageElement) => {
      const srcW = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
      const srcH = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
      if (source instanceof HTMLVideoElement && source.readyState < 2) return;
      if (srcW <= 0 || srcH <= 0) return;
      let snap = lastValidFrames.get(key);
      if (!snap) {
        snap = document.createElement('canvas');
        const scale = Math.min(1, 720 / Math.max(srcW, srcH));
        snap.width = Math.max(2, Math.floor((srcW * scale) / 2) * 2);
        snap.height = Math.max(2, Math.floor((srcH * scale) / 2) * 2);
        lastValidFrames.set(key, snap);
      }
      const sCtx = snap.getContext('2d');
      if (sCtx) {
        try {
          sCtx.drawImage(source, 0, 0, snap.width, snap.height);
        } catch {}
      }
    };

    // Preload ALL timeline clips + Chroma BG + Split Slots + Trailer Card media cleanly before recording starts
    const exportUrlEntries: string[] = timelineClips.map((c) => `${c.type}::${c.url}`);
    if (chromaConfig.enabled && chromaConfig.bgMode === 'custom_media' && chromaConfig.bgMediaUrl) {
      exportUrlEntries.push(`${chromaConfig.bgMediaType || 'photo'}::${chromaConfig.bgMediaUrl}`);
    }
    if (splitScreenConfig.enabled) {
      if (splitScreenConfig.leftMediaUrl) {
        exportUrlEntries.push(`${splitScreenConfig.leftMediaType}::${splitScreenConfig.leftMediaUrl}`);
      }
      if (splitScreenConfig.rightMediaUrl) {
        exportUrlEntries.push(`${splitScreenConfig.rightMediaType}::${splitScreenConfig.rightMediaUrl}`);
      }
    }
    trailerCardLayers.forEach((tc) => {
      if (tc.imageUrl) exportUrlEntries.push(`${tc.mediaType}::${tc.imageUrl}`);
    });
    const uniqueMediaUrls = Array.from(new Set(exportUrlEntries));
    await Promise.all(
      uniqueMediaUrls.map(
        (key) =>
          new Promise<void>((resolve) => {
            const sepIdx = key.indexOf('::');
            const mType = key.slice(0, sepIdx);
            const url = key.slice(sepIdx + 2);
            if (!url) {
              resolve();
              return;
            }
            // Pre-seed cached thumbnail so frame 0 NEVER renders black even while decoder warms
            const clipWithThumb = timelineClips.find((c) => c.url === url && c.thumbnailUrl);
            if (clipWithThumb?.thumbnailUrl) {
              const tImg = thumbCacheRef.current.get(clipWithThumb.thumbnailUrl) || new Image();
              if (!clipWithThumb.thumbnailUrl.startsWith('blob:') && !clipWithThumb.thumbnailUrl.startsWith('data:')) {
                tImg.crossOrigin = 'anonymous';
              }
              tImg.onload = () => captureSnapshot(key, tImg);
              if (!tImg.src) tImg.src = clipWithThumb.thumbnailUrl;
              thumbCacheRef.current.set(clipWithThumb.thumbnailUrl, tImg);
              if (tImg.complete && tImg.naturalWidth > 0) captureSnapshot(key, tImg);
            }

            if (mType === 'video') {
              const vid = document.createElement('video');
              if (!url.startsWith('blob:') && !url.startsWith('data:')) {
                vid.crossOrigin = 'anonymous';
              }
              vid.playsInline = true;
              vid.setAttribute('playsinline', 'true');
              vid.setAttribute('webkit-playsinline', 'true');
              vid.preload = 'auto';
              vid.style.cssText = 'width:4px;height:4px;position:absolute;inset:0;object-fit:cover;';
              vid.muted = isMuted || isAudioTrackMuted;
              vid.volume = Math.max(0, Math.min(1, volume / 100));
              vid.playbackRate = Math.min(8, Math.max(0.25, playbackSpeed));
              exportHostDiv.appendChild(vid);

              const timer = window.setTimeout(resolve, 8000);
              const done = () => {
                window.clearTimeout(timer);
                resolve();
              };
              vid.addEventListener('canplaythrough', done, { once: true });
              vid.addEventListener('canplay', done, { once: true });
              vid.addEventListener('loadeddata', done, { once: true });
              vid.addEventListener('error', done, { once: true });
              vid.src = url;
              vid.load();
              exportMediaMap.set(key, vid);
            } else {
              const img = new Image();
              if (!url.startsWith('blob:') && !url.startsWith('data:')) {
                img.crossOrigin = 'anonymous';
              }
              const timer = window.setTimeout(resolve, 4500);
              const done = () => {
                window.clearTimeout(timer);
                resolve();
              };
              img.onload = done;
              img.onerror = done;
              img.src = url;
              exportMediaMap.set(key, img);
            }
          })
      )
    );

    if (exportCancelRef.current) {
      cleanupExportResources();
      setIsExporting(false);
      return;
    }

    // Warm-prime every video decoder into GPU texture memory before encoding starts
    setExportStatusText(isMl ? 'വീഡിയോ ഫ്രെയിമുകൾ ഡീകോഡ് ചെയ്യുന്നു...' : 'Decoding initial video frames...');
    for (const [key, el] of exportMediaMap.entries()) {
      if (exportCancelRef.current) break;
      if (el instanceof HTMLVideoElement) {
        const url = key.slice('video::'.length);
        const firstMatchingClip = timelineClips.find((c) => c.type === 'video' && c.url === url);
        const firstStart = firstMatchingClip?.sourceStartSec || 0;
        try {
          el.muted = true;
          await waitForSeek(el, firstStart, 1600);
          await el.play().catch(() => {});
          await new Promise((r) => window.setTimeout(r, 140));
          captureSnapshot(key, el);
          el.pause();
          await waitForSeek(el, firstStart, 1100);
          captureSnapshot(key, el);
        } catch {}
      }
    }

    if (exportCancelRef.current) {
      cleanupExportResources();
      setIsExporting(false);
      return;
    }

    const lastClipIdByVideoKey = new Map<string, string>();
    let frameTick = 0;

    const drawImageContainCover = (source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, srcW: number, srcH: number) => {
      if (srcW <= 0 || srcH <= 0) return false;
      const srcAspect = srcW / srcH;
      const canvasAspect = outW / outH;
      let drawW = outW;
      let drawH = outH;
      if (srcAspect > canvasAspect) drawW = outH * srcAspect;
      else drawH = outW / srcAspect;
      eCtx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
      return true;
    };

    const syncSecondaryExportVideo = (key: string, el: HTMLImageElement | HTMLVideoElement | undefined, tPos: number, muted = true) => {
      if (!(el instanceof HTMLVideoElement)) return;
      const vidDur = isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
      const tTarget = vidDur > 0 ? Math.min(Math.max(0, vidDur - 0.04), tPos % vidDur) : tPos;
      if (!isDeterministicSeekMode) {
        el.muted = muted;
        if (!isReversePlayback && el.paused && el.readyState >= 2) {
          el.play().catch(() => {
            el.muted = true;
            el.play().catch(() => {});
          });
        }
        if (!el.seeking && Math.abs(el.currentTime - tTarget) > (el.paused ? 0.04 : 0.25)) {
          try {
            el.currentTime = tTarget;
          } catch {}
        }
      }
      if (el.readyState >= 2 && el.videoWidth > 0 && !el.seeking && frameTick % 6 === 0) {
        captureSnapshot(key, el);
      }
    };

    const drawExportClip = (clipItem: TimelineClip | undefined, localT: number, tGlobal = 0) => {
      if (!isVideoTrackVisible || !clipItem?.url) return false;
      const key = `${clipItem.type}::${clipItem.url}`;
      const el = exportMediaMap.get(key);
      const chromaBgKey =
        chromaConfig.enabled && chromaConfig.bgMode === 'custom_media' && chromaConfig.bgMediaUrl
          ? `${chromaConfig.bgMediaType || 'photo'}::${chromaConfig.bgMediaUrl}`
          : '';
      const chromaBgEl = chromaBgKey ? exportMediaMap.get(chromaBgKey) || null : null;
      if (chromaBgEl instanceof HTMLVideoElement) {
        syncSecondaryExportVideo(chromaBgKey, chromaBgEl, tGlobal, true);
      }

      if (el instanceof HTMLVideoElement) {
        const vidDur = isFinite(el.duration) && el.duration > 0 ? el.duration : clipItem.durationSec;
        const desiredSourceTime = (clipItem.sourceStartSec || 0) + localT;
        const targetVideoTime = vidDur > 0 ? Math.min(Math.max(0, vidDur - 0.04), desiredSourceTime) : desiredSourceTime;

        const prevClipId = lastClipIdByVideoKey.get(key);
        const isEnteringNewClip = prevClipId !== clipItem.id;
        lastClipIdByVideoKey.set(key, clipItem.id);

        if (!isDeterministicSeekMode) {
          if (!isReversePlayback && el.paused && el.readyState >= 2) {
            el.play().catch(() => {
              el.muted = true;
              el.play().catch(() => {});
            });
          }
          const timeDiff = Math.abs(el.currentTime - targetVideoTime);
          const shouldSeek =
            (isEnteringNewClip && timeDiff > 0.08) ||
            (isReversePlayback && timeDiff > 0.04) ||
            (el.paused && timeDiff > 0.04) ||
            (!el.seeking && timeDiff > 0.35);

          if (shouldSeek && !el.seeking) {
            try {
              el.currentTime = targetVideoTime;
            } catch {}
          }
        }

        if (el.readyState >= 2 && el.videoWidth > 0 && el.videoHeight > 0) {
          if (!el.seeking && (frameTick % 4 === 0 || isEnteringNewClip)) {
            captureSnapshot(key, el);
          }
          if (chromaConfig.enabled) {
            drawChromaBackground(eCtx, outW, outH, chromaConfig, tGlobal, chromaBgEl, el);
            return drawChromaKeyedSource(eCtx, el, el.videoWidth, el.videoHeight, outW, outH, chromaConfig, 540);
          }
          return drawImageContainCover(el, el.videoWidth, el.videoHeight);
        }

        // Zero-black-frame fallback during brief seeks or initial buffer
        const cachedSnap = lastValidFrames.get(key);
        if (cachedSnap && cachedSnap.width > 0 && cachedSnap.height > 0) {
          if (chromaConfig.enabled) {
            drawChromaBackground(eCtx, outW, outH, chromaConfig, tGlobal, chromaBgEl, cachedSnap);
            return drawChromaKeyedSource(eCtx, cachedSnap, cachedSnap.width, cachedSnap.height, outW, outH, chromaConfig, 540);
          }
          return drawImageContainCover(cachedSnap, cachedSnap.width, cachedSnap.height);
        }
        if (clipItem.thumbnailUrl) {
          const thumbImg = thumbCacheRef.current.get(clipItem.thumbnailUrl);
          if (thumbImg && thumbImg.complete && thumbImg.naturalWidth > 0) {
            if (chromaConfig.enabled) {
              drawChromaBackground(eCtx, outW, outH, chromaConfig, tGlobal, chromaBgEl, thumbImg);
              return drawChromaKeyedSource(eCtx, thumbImg, thumbImg.naturalWidth, thumbImg.naturalHeight, outW, outH, chromaConfig, 540);
            }
            return drawImageContainCover(thumbImg, thumbImg.naturalWidth, thumbImg.naturalHeight);
          }
        }
      } else if (el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0) {
        if (chromaConfig.enabled) {
          drawChromaBackground(eCtx, outW, outH, chromaConfig, tGlobal, chromaBgEl, el);
          return drawChromaKeyedSource(eCtx, el, el.naturalWidth, el.naturalHeight, outW, outH, chromaConfig, 540);
        }
        return drawImageContainCover(el, el.naturalWidth, el.naturalHeight);
      }
      return false;
    };

    const renderSingleExportFrame = (tPos: number) => {
      const { clip: activeClip, index: activeIdx, localTime } = getClipAtTime(tPos, timelineClips);

      const keepExportVideoKeys = new Set<string>();
      if (activeClip && activeClip.type === 'video') {
        keepExportVideoKeys.add(`video::${activeClip.url}`);
      }
      if (splitScreenConfig.enabled) {
        if (splitScreenConfig.leftMediaUrl && splitScreenConfig.leftMediaType === 'video') {
          keepExportVideoKeys.add(`video::${splitScreenConfig.leftMediaUrl}`);
        }
        if (splitScreenConfig.rightMediaUrl && splitScreenConfig.rightMediaType === 'video') {
          keepExportVideoKeys.add(`video::${splitScreenConfig.rightMediaUrl}`);
        }
      }
      if (chromaConfig.enabled && chromaConfig.bgMode === 'custom_media' && chromaConfig.bgMediaUrl && chromaConfig.bgMediaType === 'video') {
        keepExportVideoKeys.add(`video::${chromaConfig.bgMediaUrl}`);
      }
      trailerCardLayers.forEach((tc) => {
        if (tc.imageUrl && tc.mediaType === 'video') keepExportVideoKeys.add(`video::${tc.imageUrl}`);
      });

      exportMediaMap.forEach((el, k) => {
        if (el instanceof HTMLVideoElement) {
          if (!keepExportVideoKeys.has(k) && !el.paused) el.pause();
        }
      });

      eCtx.clearRect(0, 0, outW, outH);
      eCtx.fillStyle = '#000000';
      eCtx.fillRect(0, 0, outW, outH);

      eCtx.save();
      const pr = proRenderDeltas;
      const baseFlt = activeFilter.cssFilter !== 'none' ? `${activeFilter.cssFilter} ` : '';
      const b = 100 + colorBrightness + colorExposure * 0.4 + colorHighlights * 0.2 + colorShadows * 0.15 + pr.brightness;
      const c = 100 + colorContrast + (colorHighlights - colorShadows) * 0.15 + pr.contrast;
      const s = 100 + colorSaturation + pr.saturation;
      const wTotal = Math.max(0, colorWarmth + pr.warmth);
      const tTotal = colorTint + pr.tint;
      const w = wTotal > 0 ? `sepia(${wTotal * 0.4}%) ` : '';
      const t = tTotal !== 0 ? `hue-rotate(${tTotal}deg) ` : '';
      const blurStr = pr.blur > 0.05 ? `blur(${pr.blur.toFixed(1)}px) ` : '';
      const isNeutralExportFilter =
        !baseFlt &&
        !w &&
        !t &&
        !blurStr &&
        Math.abs(b - 100) < 0.5 &&
        Math.abs(c - 100) < 0.5 &&
        Math.abs(s - 100) < 0.5;
      eCtx.filter = isNeutralExportFilter
        ? 'none'
        : `${baseFlt}${w}${t}${blurStr}brightness(${Math.max(10, b)}%) contrast(${Math.max(10, c)}%) saturate(${Math.max(0, s)}%)`;
      eCtx.globalAlpha = opacity / 100;

      const scaleFactor = outW / canvasDims.width;
      let bassShakeX = 0;
      let bassShakeY = 0;
      if (trailerFxMode === 'bass_shake') {
        const beat = Math.pow(Math.max(0, Math.sin(tPos * 4.5)), 8);
        if (beat > 0.1) {
          bassShakeX = Math.sin(tPos * 52) * 10 * beat * scaleFactor;
          bassShakeY = Math.cos(tPos * 48) * 7 * beat * scaleFactor;
        }
      }
      eCtx.translate(outW / 2 + posX * scaleFactor + bassShakeX, outH / 2 + posY * scaleFactor + bassShakeY);
      eCtx.rotate((rotationDeg * Math.PI) / 180);
      eCtx.scale((scaleX / 100) * (flipH ? -1 : 1), (scaleY / 100) * (flipV ? -1 : 1));

      let seamTr: TransitionItem | null = null;
      let trProgress = 0;
      let trOutClip: TimelineClip | undefined = activeClip;
      let trOutLocal = localTime;
      let trInClip: TimelineClip | undefined = activeClip;
      let trInLocal = 0;

      if (timelineClips.length >= 2) {
        let seamAcc = 0;
        for (let i = 0; i < timelineClips.length - 1; i++) {
          seamAcc += timelineClips[i].durationSec || 4;
          const tr = clipTransitionObjects[i];
          if (tr) {
            const half = (tr.durationSec || 0.8) / 2;
            if (tPos >= seamAcc - half && tPos <= seamAcc + half) {
              seamTr = tr;
              trProgress = (tPos - (seamAcc - half)) / (half * 2);
              trOutClip = timelineClips[i];
              trOutLocal = Math.max(0, (timelineClips[i].durationSec || 4) - half + trProgress * half);
              trInClip = timelineClips[i + 1];
              trInLocal = trProgress * half;
              break;
            }
          }
        }
      }

      if (splitScreenConfig.enabled) {
        const leftUrl = splitScreenConfig.leftMediaUrl || activeClip?.url || '';
        const leftType: 'video' | 'photo' = splitScreenConfig.leftMediaUrl
          ? splitScreenConfig.leftMediaType
          : activeClip?.type || 'photo';
        const fallbackRightClip = timelineClips[1] || activeClip;
        const rightUrl = splitScreenConfig.rightMediaUrl || fallbackRightClip?.url || '';
        const rightType: 'video' | 'photo' = splitScreenConfig.rightMediaUrl
          ? splitScreenConfig.rightMediaType
          : fallbackRightClip?.type || 'photo';
        const leftKey = `${leftType}::${leftUrl}`;
        const rightKey = `${rightType}::${rightUrl}`;
        const leftEl = (leftUrl ? exportMediaMap.get(leftKey) || lastValidFrames.get(leftKey) : null) || null;
        const rightEl = (rightUrl ? exportMediaMap.get(rightKey) || lastValidFrames.get(rightKey) : null) || null;
        if (leftEl instanceof HTMLVideoElement) {
          syncSecondaryExportVideo(leftKey, leftEl, activeClip && leftUrl === activeClip.url ? localTime : tPos, isMuted || isAudioTrackMuted);
        }
        if (rightEl instanceof HTMLVideoElement && rightKey !== leftKey) {
          syncSecondaryExportVideo(rightKey, rightEl, tPos, true);
        }
        drawSplitScreenComposition(eCtx, outW, outH, splitScreenConfig, leftEl, rightEl);
      } else if (seamTr) {
        const effType = seamTr.effectType;
        if (effType === 'slide' || effType === 'whip') {
          eCtx.save();
          eCtx.translate(-trProgress * outW, 0);
          drawExportClip(trOutClip, trOutLocal, tPos);
          eCtx.restore();
          eCtx.save();
          eCtx.translate((1 - trProgress) * outW, 0);
          drawExportClip(trInClip, trInLocal, tPos);
          eCtx.restore();
        } else if (effType === 'zoom') {
          eCtx.save();
          eCtx.scale(1 + trProgress * 0.45, 1 + trProgress * 0.45);
          eCtx.globalAlpha = Math.max(0, 1 - trProgress);
          drawExportClip(trOutClip, trOutLocal, tPos);
          eCtx.restore();
          eCtx.save();
          eCtx.scale(0.72 + trProgress * 0.28, 0.72 + trProgress * 0.28);
          eCtx.globalAlpha = trProgress;
          drawExportClip(trInClip, trInLocal, tPos);
          eCtx.restore();
        } else if (effType === 'cube3d') {
          eCtx.save();
          eCtx.scale(Math.max(0.05, Math.abs(Math.cos(trProgress * Math.PI))), 1);
          drawExportClip(trProgress < 0.5 ? trOutClip : trInClip, trProgress < 0.5 ? trOutLocal : trInLocal, tPos);
          eCtx.restore();
        } else if (effType === 'wipe') {
          drawExportClip(trOutClip, trOutLocal, tPos);
          eCtx.save();
          eCtx.beginPath();
          eCtx.arc(0, 0, Math.max(1, trProgress * Math.hypot(outW / 2, outH / 2)), 0, Math.PI * 2);
          eCtx.clip();
          drawExportClip(trInClip, trInLocal, tPos);
          eCtx.restore();
        } else if (effType === 'glitch') {
          const jitterX = Math.sin(trProgress * 45) * 28 * scaleFactor * (1 - Math.abs(trProgress - 0.5) * 2);
          eCtx.save();
          eCtx.translate(jitterX, 0);
          drawExportClip(trProgress < 0.5 ? trOutClip : trInClip, trProgress < 0.5 ? trOutLocal : trInLocal, tPos);
          eCtx.restore();
        } else if (effType === 'flash') {
          drawExportClip(trProgress < 0.5 ? trOutClip : trInClip, trProgress < 0.5 ? trOutLocal : trInLocal, tPos);
          eCtx.fillStyle = `rgba(255, 255, 255, ${Math.sin(trProgress * Math.PI) * 0.92})`;
          eCtx.fillRect(-outW / 2, -outH / 2, outW, outH);
        } else {
          drawExportClip(trOutClip, trOutLocal, tPos);
          eCtx.save();
          eCtx.globalAlpha = trProgress;
          drawExportClip(trInClip, trInLocal, tPos);
          eCtx.restore();
        }
      } else {
        drawExportClip(activeClip, localTime, tPos);
      }

      if (activeEffect) {
        const effT = activeEffect.effectType;
        const secT = tPos;
        eCtx.save();
        eCtx.filter = 'none';
        if (effT === 'light_leak' || effT === 'prism') {
          const lx = Math.sin(secT * 1.4) * (outW * 0.25);
          const ly = Math.cos(secT * 1.1) * (outH * 0.2);
          const leak = eCtx.createRadialGradient(lx, ly, 10, lx, ly, outW * 0.55);
          leak.addColorStop(0, effT === 'prism' ? 'rgba(192,132,252,0.55)' : 'rgba(245,158,11,0.55)');
          leak.addColorStop(0.5, effT === 'prism' ? 'rgba(34,211,238,0.28)' : 'rgba(239,68,68,0.22)');
          leak.addColorStop(1, 'rgba(0,0,0,0)');
          eCtx.globalCompositeOperation = 'screen';
          eCtx.fillStyle = leak;
          eCtx.fillRect(-outW / 2, -outH / 2, outW, outH);
        } else if (effT === 'particles') {
          eCtx.fillStyle = 'rgba(253, 230, 138, 0.78)';
          for (let k = 0; k < 28; k++) {
            const px = (((k * 173 + secT * 38) % outW) + outW) % outW - outW / 2;
            const py = (((k * 97 + secT * (22 + (k % 5) * 8)) % outH) + outH) % outH - outH / 2;
            eCtx.beginPath();
            eCtx.arc(px, py, (2 + (k % 3)) * scaleFactor, 0, Math.PI * 2);
            eCtx.fill();
          }
        } else if (effT === 'neon') {
          eCtx.strokeStyle = 'rgba(34,211,238,0.85)';
          eCtx.lineWidth = 8 * scaleFactor;
          eCtx.strokeRect(-outW / 2 + 16 * scaleFactor, -outH / 2 + 16 * scaleFactor, outW - 32 * scaleFactor, outH - 32 * scaleFactor);
        } else if (effT === 'mist') {
          const mist = eCtx.createLinearGradient(0, -outH / 2, 0, outH / 2);
          mist.addColorStop(0, 'rgba(203,213,225,0.12)');
          mist.addColorStop(1, 'rgba(226,232,240,0.42)');
          eCtx.fillStyle = mist;
          eCtx.fillRect(-outW / 2, -outH / 2, outW, outH);
        }
        eCtx.restore();
      }

      const combinedExportVignette = Math.min(95, colorVignette + pr.vignette);
      if (combinedExportVignette > 0) {
        const vigRadius = Math.min(outW, outH);
        const vigGrad = eCtx.createRadialGradient(0, 0, vigRadius * 0.25, 0, 0, vigRadius * 0.7);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, `rgba(0,0,0,${(combinedExportVignette / 100) * 0.85})`);
        eCtx.fillStyle = vigGrad;
        eCtx.fillRect(-outW / 2, -outH / 2, outW, outH);
      }

      if (pr.glow > 0) {
        eCtx.save();
        eCtx.filter = 'none';
        eCtx.globalCompositeOperation = 'screen';
        const gGrad = eCtx.createRadialGradient(0, 0, 12, 0, 0, outW * 0.6);
        gGrad.addColorStop(0, `rgba(255, 232, 185, ${(pr.glow / 100) * 0.35})`);
        gGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        eCtx.fillStyle = gGrad;
        eCtx.fillRect(-outW / 2, -outH / 2, outW, outH);
        eCtx.restore();
      }
      if (pr.chromatic > 0) {
        eCtx.save();
        eCtx.filter = 'none';
        eCtx.globalCompositeOperation = 'screen';
        const shiftPx = (pr.chromatic / 100) * 6 * scaleFactor;
        eCtx.fillStyle = 'rgba(255, 40, 90, 0.08)';
        eCtx.fillRect(-outW / 2 + shiftPx, -outH / 2, outW, outH);
        eCtx.fillStyle = 'rgba(34, 211, 238, 0.08)';
        eCtx.fillRect(-outW / 2 - shiftPx, -outH / 2, outW, outH);
        eCtx.restore();
      }
      if (pr.filmGrain > 0) {
        eCtx.save();
        eCtx.filter = 'none';
        eCtx.fillStyle = `rgba(255, 255, 255, ${(pr.filmGrain / 100) * 0.14})`;
        const tStep = Math.floor(tPos * 24);
        for (let g = 0; g < 45; g++) {
          const gx = (((g * 293 + tStep * 67) % outW) - outW / 2);
          const gy = (((g * 179 + tStep * 41) % outH) - outH / 2);
          eCtx.fillRect(gx, gy, Math.max(2, 2 * scaleFactor), Math.max(2, 2 * scaleFactor));
        }
        eCtx.restore();
      }
      if (pr.letterbox > 0) {
        const barH = (pr.letterbox / 100) * outH;
        eCtx.save();
        eCtx.filter = 'none';
        eCtx.fillStyle = '#000000';
        eCtx.fillRect(-outW / 2, -outH / 2, outW, barH);
        eCtx.fillRect(-outW / 2, outH / 2 - barH, outW, barH);
        eCtx.restore();
      }

      if (trailerFxMode !== 'none') {
        drawTrailerFxOverlay(eCtx, outW, outH, trailerFxMode, tPos);
      }

      eCtx.restore();

      if (
        showTitleOverlay &&
        movieTitle.trim().length > 0 &&
        tPos >= titleStartSec - 0.05 &&
        tPos <= titleStartSec + titleDurationSec + 0.05
      ) {
        drawAnimatedCinemaTitle(eCtx, outW, outH, {
          movieTitle,
          subtitle,
          directorText,
          titleXPct,
          titleYPct,
          titleScale,
          titleOpacity,
          titleStartSec,
          globalTimeSec: tPos,
          animationType: titleAnimType,
          themeType: titleThemeType,
          exportScaleRatio: outW / 1280,
        });
      }

      if (activeStickers.length > 0) {
        activeStickers.forEach((layer) => {
          if (tPos < layer.startTimeSec - 0.05 || tPos > layer.startTimeSec + layer.durationSec + 0.05) {
            return;
          }
          const sx = (layer.xPct / 100) * outW;
          const sy = (layer.yPct / 100) * outH;
          eCtx.save();
          eCtx.filter = 'none';
          eCtx.globalAlpha = Math.max(0, Math.min(1, layer.opacity / 100));
          eCtx.translate(sx, sy);
          eCtx.rotate((layer.rotation * Math.PI) / 180);
          eCtx.scale(layer.scale * scaleFactor, layer.scale * scaleFactor);
          eCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          eCtx.strokeStyle = '#2dd4bf';
          eCtx.lineWidth = 2;
          const bw = 180;
          const bh = 42;
          eCtx.beginPath();
          eCtx.roundRect(-bw / 2, -bh / 2, bw, bh, 12);
          eCtx.fill();
          eCtx.stroke();
          eCtx.font = 'bold 18px system-ui, sans-serif';
          eCtx.fillStyle = '#ffffff';
          eCtx.textAlign = 'center';
          eCtx.textBaseline = 'middle';
          eCtx.fillText(`${layer.sticker.emoji} ${layer.sticker.badgeText}`, 0, 0);
          eCtx.restore();
        });
      }

      if (vfxLayers.length > 0) {
        vfxLayers.forEach((vLayer) => {
          drawCinemaVfxOnCanvas(eCtx, outW, outH, vLayer, tPos);
        });
      }

      if (trailerCardLayers.length > 0) {
        trailerCardLayers.forEach((card) => {
          const cardKey = `${card.mediaType}::${card.imageUrl}`;
          const cardEl = card.imageUrl ? exportMediaMap.get(cardKey) : null;
          if (cardEl instanceof HTMLVideoElement) {
            syncSecondaryExportVideo(cardKey, cardEl, tPos, true);
          }
          const cardSource =
            cardEl instanceof HTMLVideoElement && cardEl.readyState < 2
              ? (lastValidFrames.get(cardKey) as unknown as HTMLImageElement | undefined) || null
              : cardEl || null;
          drawTrailerCardOnCanvas(eCtx, outW, outH, card, cardSource, tPos);
        });
      }

      return activeIdx;
    };

    const exactTotalSec = Math.max(0.5, timelineClips.reduce((acc, c) => acc + (c.durationSec || 4), 0));
    const speedFactor = Math.max(0.25, Math.min(8, playbackSpeed));
    const exportWallDurationSec = exactTotalSec / speedFactor;

    let capturedProjectThumb = '';
    const tryCaptureThumb = () => {
      if (capturedProjectThumb) return;
      try {
        const snapUrl = exportCanvas.toDataURL('image/jpeg', 0.72);
        if (snapUrl && snapUrl.length > 1500) {
          capturedProjectThumb = snapUrl;
        }
      } catch {}
    };

    // Seek all active HTMLVideoElement sources synchronously before WebCodecs frame capture
    const prepareExportVideosAtTime = async (tPos: number) => {
      const seekPromises: Promise<void>[] = [];
      const queueSeek = (url: string, type: 'video' | 'photo', targetSec: number) => {
        if (!url || type !== 'video') return;
        const el = exportMediaMap.get(`video::${url}`);
        if (el instanceof HTMLVideoElement) {
          seekPromises.push(waitForVideoSeekReady(el, targetSec, 900));
        }
      };

      const { clip: activeClip, localTime } = getClipAtTime(tPos, timelineClips);
      if (activeClip) {
        queueSeek(activeClip.url, activeClip.type, (activeClip.sourceStartSec || 0) + localTime);
      }

      if (timelineClips.length >= 2) {
        let seamAcc = 0;
        for (let i = 0; i < timelineClips.length - 1; i++) {
          seamAcc += timelineClips[i].durationSec || 4;
          const tr = clipTransitionObjects[i];
          if (tr) {
            const half = (tr.durationSec || 0.8) / 2;
            if (tPos >= seamAcc - half && tPos <= seamAcc + half) {
              const trProgress = (tPos - (seamAcc - half)) / (half * 2);
              const outClip = timelineClips[i];
              const inClip = timelineClips[i + 1];
              queueSeek(
                outClip.url,
                outClip.type,
                (outClip.sourceStartSec || 0) + Math.max(0, (outClip.durationSec || 4) - half + trProgress * half)
              );
              queueSeek(inClip.url, inClip.type, (inClip.sourceStartSec || 0) + trProgress * half);
              break;
            }
          }
        }
      }

      if (chromaConfig.enabled && chromaConfig.bgMode === 'custom_media' && chromaConfig.bgMediaUrl && chromaConfig.bgMediaType === 'video') {
        const bgEl = exportMediaMap.get(`video::${chromaConfig.bgMediaUrl}`);
        if (bgEl instanceof HTMLVideoElement) {
          const vd = isFinite(bgEl.duration) && bgEl.duration > 0 ? bgEl.duration : 0;
          seekPromises.push(waitForVideoSeekReady(bgEl, vd > 0 ? tPos % vd : tPos, 900));
        }
      }

      if (splitScreenConfig.enabled) {
        const leftUrl = splitScreenConfig.leftMediaUrl || activeClip?.url || '';
        const leftType = splitScreenConfig.leftMediaUrl ? splitScreenConfig.leftMediaType : activeClip?.type || 'photo';
        const fallbackRight = timelineClips[1] || activeClip;
        const rightUrl = splitScreenConfig.rightMediaUrl || fallbackRight?.url || '';
        const rightType = splitScreenConfig.rightMediaUrl ? splitScreenConfig.rightMediaType : fallbackRight?.type || 'photo';
        if (leftType === 'video' && leftUrl) {
          const lEl = exportMediaMap.get(`video::${leftUrl}`);
          if (lEl instanceof HTMLVideoElement) {
            const vd = isFinite(lEl.duration) && lEl.duration > 0 ? lEl.duration : 0;
            const lt = activeClip && leftUrl === activeClip.url ? (activeClip.sourceStartSec || 0) + localTime : vd > 0 ? tPos % vd : tPos;
            seekPromises.push(waitForVideoSeekReady(lEl, lt, 900));
          }
        }
        if (rightType === 'video' && rightUrl && rightUrl !== leftUrl) {
          const rEl = exportMediaMap.get(`video::${rightUrl}`);
          if (rEl instanceof HTMLVideoElement) {
            const vd = isFinite(rEl.duration) && rEl.duration > 0 ? rEl.duration : 0;
            seekPromises.push(waitForVideoSeekReady(rEl, vd > 0 ? tPos % vd : tPos, 900));
          }
        }
      }

      trailerCardLayers.forEach((tc) => {
        if (
          tc.imageUrl &&
          tc.mediaType === 'video' &&
          tPos >= tc.startTimeSec - 0.1 &&
          tPos <= tc.startTimeSec + tc.durationSec + 0.1
        ) {
          const cEl = exportMediaMap.get(`video::${tc.imageUrl}`);
          if (cEl instanceof HTMLVideoElement) {
            const vd = isFinite(cEl.duration) && cEl.duration > 0 ? cEl.duration : 0;
            seekPromises.push(waitForVideoSeekReady(cEl, vd > 0 ? tPos % vd : tPos, 900));
          }
        }
      });

      if (seekPromises.length > 0) {
        await Promise.all(seekPromises);
      }
    };

    const finalizeCompletedExportBlob = (blob: Blob, finalMime: string) => {
      if (blob.size < 1024) {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatusText('');
        setExportError(
          isMl
            ? 'വീഡിയോ ഡാറ്റ റെക്കോർഡ് ചെയ്യാനായില്ല. ദയവായി 720p അല്ലെങ്കിൽ 1080p തിരഞ്ഞെടുത്ത് വീണ്ടും ശ്രമിക്കുക.'
            : 'Exported file was empty. Try 720p or 1080p resolution.'
        );
        return;
      }

      const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
      const safeName = `${projectName.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'CineStudio'}_${outW}x${outH}.${ext}`;
      const blobUrl = URL.createObjectURL(blob);
      const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);

      setExportedVideoUrl(blobUrl);
      setExportedVideoFilename(safeName);
      setExportedVideoSizeMb(sizeMb);
      setExportedVideoMetaLabel(`${ext.toUpperCase()} · ${outW}×${outH} (${projectResolution})`);
      setExportShareNotice(null);

      triggerLocalBlobDownload(blobUrl, safeName);

      saveCurrentProjectToStorage(undefined, undefined, undefined, undefined, capturedProjectThumb || undefined);
      logEditorTelemetry('export_video', timelineClips, exactTotalSec);
      setIsExporting(false);
      setExportProgress(100);
      setExportElapsedSec(Math.ceil(exportWallDurationSec));
      setExportStatusText(isMl ? 'വീഡിയോ എക്സ്പോർട്ട് പൂർത്തിയായി!' : 'Video export ready!');
    };

    // -------------------------------------------------------------------------
    // ENGINE 1 (PRIMARY): Deterministic WebCodecs H.264 MP4 + AAC Export
    // Guarantees smooth full-motion video (zero Frame-0 image freeze) & true 4K/1080p/720p!
    // -------------------------------------------------------------------------
    if (probedWebCodecs) {
      let timelineCursorSec = 0;
      const audioSourceClips: ExportAudioSourceClip[] = timelineClips.map((c) => {
        const entry: ExportAudioSourceClip = {
          url: c.url,
          type: c.type,
          startTimelineSec: timelineCursorSec,
          durationSec: c.durationSec || 4,
          sourceStartSec: c.sourceStartSec || 0,
        };
        timelineCursorSec += c.durationSec || 4;
        return entry;
      });

      setExportEstimatedTotalSec(exportWallDurationSec);
      try {
        const mp4Blob = await runWebCodecsMp4Export({
          exportCanvas,
          outW,
          outH,
          probedConfig: probedWebCodecs,
          fps: 30,
          exactTotalSec,
          speedFactor,
          isReversePlayback,
          clips: audioSourceClips,
          bgAudioUrl: activeAudio?.url,
          volumePct: volume,
          isMuted: isMuted || isAudioTrackMuted,
          prepareFrameAtTime: prepareExportVideosAtTime,
          renderFrameAtTime: (tPos) => {
            frameTick += 1;
            return renderSingleExportFrame(tPos);
          },
          onAfterFirstFrame: tryCaptureThumb,
          onProgress: (pct, elapsedWallSec, activeIdx) => {
            setExportElapsedSec(elapsedWallSec);
            setExportProgress(pct);
            setExportStatusText(
              isMl
                ? `MP4 (${outW}×${outH}) എക്സ്പോർട്ട് (${Math.max(1, activeIdx + 1)}/${timelineClips.length})`
                : `Encoding MP4 ${outW}×${outH} (${Math.max(1, activeIdx + 1)}/${timelineClips.length})`
            );
          },
          shouldCancel: () => exportCancelRef.current,
        });

        if (exportCancelRef.current) {
          cleanupExportResources();
          setIsExporting(false);
          setExportProgress(0);
          setExportStatusText('');
          return;
        }

        if (mp4Blob && mp4Blob.size > 1024) {
          cleanupExportResources();
          finalizeCompletedExportBlob(mp4Blob, 'video/mp4');
          return;
        }
      } catch (webCodecsErr) {
        console.warn('WebCodecs MP4 export unavailable or interrupted, switching to MediaRecorder:', webCodecsErr);
      }
    }

    // -------------------------------------------------------------------------
    // ENGINE 2 (FALLBACK): Upgraded MP4-first MediaRecorder Engine
    // -------------------------------------------------------------------------
    isDeterministicSeekMode = false;
    outW = fallbackDims.outW;
    outH = fallbackDims.outH;
    exportCanvas.width = outW;
    exportCanvas.height = outH;

    if (typeof MediaRecorder === 'undefined' || typeof exportCanvas.captureStream !== 'function') {
      cleanupExportResources();
      setIsExporting(false);
      setExportError(
        isMl
          ? 'ഈ ബ്രൗസറിൽ വീഡിയോ റെക്കോർഡിംഗ് സപ്പോർട്ട് ലഭ്യമല്ല. ദയവായി Chrome അപ്‌ഡേറ്റ് ചെയ്യുക.'
          : 'Video MediaRecorder is not supported in this browser.'
      );
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        exportAudioCtx = new AudioCtx();
        if (exportAudioCtx.state === 'suspended') {
          await exportAudioCtx.resume();
        }
        audioDest = exportAudioCtx.createMediaStreamDestination();
        const keepAliveOsc = exportAudioCtx.createOscillator();
        const keepAliveGain = exportAudioCtx.createGain();
        keepAliveGain.gain.value = 0.00001;
        keepAliveOsc.connect(keepAliveGain);
        keepAliveGain.connect(audioDest);
        keepAliveOsc.start();
        if (!isMuted && !isAudioTrackMuted) {
          exportMediaMap.forEach((el) => {
            if (el instanceof HTMLVideoElement) {
              try {
                el.muted = false;
                const srcNode = exportAudioCtx!.createMediaElementSource(el);
                srcNode.connect(audioDest!);
              } catch {}
            }
          });
        }
        if (!isMuted && !isAudioTrackMuted && activeAudio?.url) {
          try {
            const bgEl = new Audio();
            if (!activeAudio.url.startsWith('blob:') && !activeAudio.url.startsWith('data:')) {
              bgEl.crossOrigin = 'anonymous';
            }
            bgEl.src = activeAudio.url;
            bgEl.loop = true;
            bgEl.volume = 0.85;
            const bgSrcNode = exportAudioCtx.createMediaElementSource(bgEl);
            bgSrcNode.connect(audioDest);
            exportBgAudioEl = bgEl;
          } catch {}
        }
      }
    } catch {}

    // Prioritize MP4 first so mobile Phone Gallery apps recognize and play the video natively
    const mimeCandidates = [
      'video/mp4;codecs=avc1.64002a,mp4a.40.2',
      'video/mp4;codecs=avc1.4D4028,mp4a.40.2',
      'video/mp4;codecs=avc1.640028,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const selectedMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const targetBitrate = projectResolution === '4K' ? 12_000_000 : projectResolution === '1080p' ? 8_000_000 : 4_200_000;

    const stream = exportCanvas.captureStream(30);
    if (audioDest) {
      audioDest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    }

    let recorder: MediaRecorder;
    try {
      recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime, videoBitsPerSecond: targetBitrate })
        : new MediaRecorder(stream, { videoBitsPerSecond: targetBitrate });
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        cleanupExportResources();
        setIsExporting(false);
        setExportError(isMl ? 'വീഡിയോ എൻകോഡർ ആരംഭിക്കാനായില്ല.' : 'Could not start video recorder.');
        return;
      }
    }

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        chunks.push(ev.data);
      }
    };

    const initialFramePos = isReversePlayback ? exactTotalSec : 0;
    await prepareExportVideosAtTime(initialFramePos);
    renderSingleExportFrame(initialFramePos);
    await new Promise((r) => window.setTimeout(r, 140));
    renderSingleExportFrame(initialFramePos);
    tryCaptureThumb();
    const videoTrack = stream.getVideoTracks()[0] as unknown as { requestFrame?: () => void };
    if (videoTrack && typeof videoTrack.requestFrame === 'function') {
      try {
        videoTrack.requestFrame();
      } catch {}
    }

    recorder.onstop = () => {
      cleanupExportResources();
      stream.getTracks().forEach((t) => t.stop());

      if (exportCancelRef.current) {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatusText('');
        return;
      }

      const finalMime = recorder.mimeType || selectedMime || 'video/mp4';
      const blob = new Blob(chunks, { type: finalMime });
      finalizeCompletedExportBlob(blob, finalMime);
    };

    if (selectedMime.includes('mp4')) {
      recorder.start();
    } else {
      recorder.start(1000);
    }

    if (exportBgAudioEl) {
      try {
        exportBgAudioEl.currentTime = 0;
        void exportBgAudioEl.play().catch(() => {});
      } catch {}
    }

    renderSingleExportFrame(initialFramePos);
    await new Promise((r) => window.setTimeout(r, 80));

    const startMs = performance.now();
    let finishing = false;
    setExportEstimatedTotalSec(exportWallDurationSec);

    const stepExportFrame = (now: number) => {
      if (finishing) return;
      if (exportCancelRef.current) {
        finishing = true;
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {}
        }
        return;
      }

      frameTick += 1;
      const elapsedWallSec = (now - startMs) / 1000;
      const elapsedTimeline = Math.min(exactTotalSec, elapsedWallSec * speedFactor);
      const tPos = isReversePlayback ? Math.max(0, exactTotalSec - elapsedTimeline) : elapsedTimeline;

      const activeIdx = renderSingleExportFrame(tPos);
      if (frameTick === 8) {
        tryCaptureThumb();
      }

      const pct = Math.min(99, Math.max(4, Math.round((elapsedWallSec / exportWallDurationSec) * 100)));
      if (frameTick % 3 === 0) {
        setExportElapsedSec(elapsedWallSec);
        setExportProgress(pct);
        setExportStatusText(
          isMl
            ? `വീഡിയോ എക്സ്പോർട്ട് (${Math.max(1, activeIdx + 1)}/${timelineClips.length})`
            : `Rendering Clip ${Math.max(1, activeIdx + 1)} of ${timelineClips.length}`
        );
      }

      if (elapsedWallSec < exportWallDurationSec) {
        requestAnimationFrame(stepExportFrame);
      } else {
        finishing = true;
        tryCaptureThumb();
        setExportElapsedSec(exportWallDurationSec);
        setExportProgress(99);
        setExportStatusText(isMl ? 'വീഡിയോ ഡൗൺലോഡിനായി തയ്യാറാക്കുന്നു...' : 'Finalizing & downloading video...');
        try {
          if (recorder.state === 'recording') {
            recorder.requestData();
          }
        } catch {}
        window.setTimeout(() => {
          if (recorder.state !== 'inactive') {
            try {
              recorder.stop();
            } catch {}
          }
        }, 160);
      }
    };

    requestAnimationFrame(stepExportFrame);
  };

  // =========================================================================
  // VIEW 1: CLEAN HOME SCREEN (STAGE 1)
  // =========================================================================
  if (studioView === 'welcome') {
    return (
      <div className="fixed inset-0 z-50 bg-[#080b10] text-zinc-100 flex flex-col font-sans select-none overflow-hidden">
        {/* Clean Minimal Bar */}
        <div className="h-13 border-b border-[#1f2937] px-4 flex items-center justify-between bg-[#10151d] shrink-0 z-20">
          <button
            type="button"
            onClick={onBackToStoryboard}
            className="flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2a3647] text-zinc-200 hover:text-white text-xs font-bold cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to CineStoryboard</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
            <span className="font-extrabold text-white text-sm tracking-tight">CineStudio 4K</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-xl mx-auto w-full px-4 py-6 space-y-6 pb-8">
            {/* PRIMARY CTA BUTTON */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => openNewProjectSetup(undefined, 'Project')}
                className="flex-1 py-4 px-5 min-h-[64px] rounded-2xl bg-gradient-to-r from-[#2dd4bf] via-[#14b8a6] to-[#10b981] text-zinc-950 font-extrabold flex items-center justify-center gap-3.5 shadow-xl shadow-teal-500/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-teal-300 shadow-md group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <div className="text-left">
                  <span className="block text-base font-extrabold tracking-tight">New Project</span>
                  <span className="block text-[11px] text-zinc-900 font-bold">ക്രിയേറ്റ് ന്യൂ പ്രോജക്റ്റ്</span>
                </div>
              </button>
            </div>

            {/* DYNAMIC REAL USER PROJECTS LIST */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-white tracking-wide text-sm flex items-center gap-2">
                  <Film className="w-4 h-4 text-teal-400" />
                  <span>My Projects (എന്റെ പ്രോജക്റ്റുകൾ)</span>
                </span>
              </div>

              {userProjects.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#10151d] border border-[#1f2937] text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#171e29] border border-[#253042] text-teal-400 mx-auto flex items-center justify-center">
                    <Film className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">
                      {isMl ? 'ഇതുവരെ പ്രോജക്റ്റുകൾ ഒന്നും നിർമ്മിച്ചിട്ടില്ല' : 'No Projects Created Yet'}
                    </h4>
                    <p className="text-xs text-zinc-400 pt-1.5 leading-relaxed">
                      {isMl
                        ? 'മുകളിലെ "+ New Project" ക്ലിക്ക് ചെയ്ത് പുതിയ വീഡിയോ എഡിറ്റ് ചെയ്യാം. ക്രിയേറ്റ് ചെയ്യുന്ന എല്ലാ വീഡിയോകളും ഇവിടെ ഓട്ടോമാറ്റിക് ആയി വരും.'
                        : 'Click "+ New Project" above to start editing. All your created and edited videos will automatically appear here!'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openNewProjectSetup(undefined, 'Project')}
                    className="px-5 py-2.5 min-h-[42px] rounded-xl bg-teal-400 hover:bg-teal-300 text-zinc-950 font-extrabold text-xs inline-flex items-center gap-2 shadow cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>{isMl ? 'പുതിയ പ്രോജക്റ്റ് ആരംഭിക്കുക' : 'Start New Project'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userProjects.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => handleOpenSavedProject(proj)}
                      className="p-3.5 rounded-2xl bg-[#10151d] border border-[#1f2937] hover:border-teal-400/60 flex items-center justify-between cursor-pointer group transition-all shadow-md"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-16 h-12 rounded-xl overflow-hidden bg-black shrink-0 relative border border-[#2a3647] flex items-center justify-center">
                          {(() => {
                            const safeThumb =
                              proj.thumbnailUrl && !proj.thumbnailUrl.startsWith('blob:')
                                ? proj.thumbnailUrl
                                : proj.clips?.find((c) => Boolean(c.thumbnailUrl) && !c.thumbnailUrl!.startsWith('blob:'))?.thumbnailUrl || '';
                            return safeThumb ? (
                              <img
                                src={safeThumb}
                                alt={proj.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                                className="w-full h-full object-cover relative z-10"
                              />
                            ) : null;
                          })()}
                          <div className="absolute inset-0 bg-gradient-to-br from-teal-950 via-zinc-900 to-black flex flex-col items-center justify-center p-1 text-center">
                            <Film className="w-4 h-4 text-teal-400 mb-0.5" />
                            <span className="text-[7px] font-black text-zinc-300 truncate max-w-full">{proj.name}</span>
                          </div>
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </div>
                        </div>

                        <div className="min-w-0">
                          <span className="font-bold text-xs sm:text-sm text-zinc-100 block group-hover:text-teal-300 transition-colors truncate">
                            {proj.name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-[#18202c] text-teal-300 font-mono font-bold">
                              {proj.aspectRatio}
                            </span>
                            <span>·</span>
                            <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pl-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSavedProject(proj);
                          }}
                          className="px-3.5 py-2 min-h-[38px] rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-bold hover:bg-teal-400 hover:text-zinc-950 cursor-pointer transition-all"
                        >
                          {isMl ? 'എഡിറ്റ് ചെയ്യുക' : 'Open'}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteUserProject(proj.id, e)}
                          className="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-[#18202c] hover:bg-rose-600/30 text-zinc-400 hover:text-rose-400 border border-[#2a3647] hover:border-rose-500/50 cursor-pointer transition-all flex items-center justify-center"
                          title="Delete this project (ഡിലീറ്റ് ചെയ്യുക)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="h-14 shrink-0 bg-[#10151d] border-t border-[#1f2937] px-4 flex items-center justify-around text-xs text-zinc-400">
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-0.5 text-teal-400 font-bold cursor-pointer min-h-[42px] px-4"
          >
            <Home className="w-4 h-4" />
            <span className="text-[10px]">Home</span>
          </button>
          <button
            type="button"
            onClick={() => openNewProjectSetup(undefined, 'Project')}
            className="flex flex-col items-center justify-center gap-0.5 hover:text-white cursor-pointer min-h-[42px] px-4"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[10px]">New</span>
          </button>
          <button
            type="button"
            onClick={onBackToStoryboard}
            className="flex flex-col items-center justify-center gap-0.5 hover:text-amber-400 cursor-pointer min-h-[42px] px-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px]">Storyboard</span>
          </button>
        </div>

        {/* Always-Visible Bottom Video Ad Strip */}
        <EditorBottomVideoAdBar slotId="editor-home" />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: PROJECT SETUP & FORMAT SELECTOR (STAGE 2)
  // =========================================================================
  if (studioView === 'new_project_setup') {
    return (
      <div className="fixed inset-0 z-50 bg-[#080b10] text-zinc-100 flex flex-col font-sans select-none overflow-hidden">
        <input
          ref={setupFileInputRef}
          type="file"
          multiple
          accept="video/*,image/*,audio/*"
          className="hidden"
          onChange={(e) => handleUserDeviceUpload(e, true)}
        />

        {/* Top Header */}
        <div className="h-13 border-b border-[#1f2937] px-4 flex items-center justify-between bg-[#10151d] shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setStudioView('welcome')}
              className="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2a3647] text-zinc-300 hover:text-white cursor-pointer transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-sm text-white">
              {isMl ? 'പുതിയ പ്രോജക്റ്റ് സെറ്റപ്പ്' : 'New Project Setup'}
            </span>
          </div>

          <div className="text-xs text-zinc-400 font-medium hidden sm:block">
            <span className="text-teal-400 font-bold">Format &amp; Media</span> → Edit
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full px-3 py-4 space-y-4 pb-8">
            {/* SECTION 1: VIDEO ASPECT RATIOS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-teal-400" />
                  <span>Select Video Format (ഫോർമാറ്റ്)</span>
                </h2>
                <span className="text-[10px] text-zinc-400">Choose platform ratio</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ASPECT_RATIO_OPTIONS.map((opt) => {
                  const isSelected = selectedAspectRatio === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedAspectRatio(opt.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center relative ${
                        isSelected
                          ? 'bg-teal-950/50 border-teal-400 ring-2 ring-teal-400/30 shadow-md shadow-teal-500/10'
                          : 'bg-[#10151d] border-[#1f2937] hover:border-[#334155] hover:bg-[#141b26]'
                      }`}
                    >
                      <div className="h-8 flex items-center justify-center mb-1.5">
                        <div
                          className={`${opt.iconWidthClass} ${opt.iconHeightClass} rounded border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-teal-400 bg-teal-400/20 text-teal-300'
                              : 'border-zinc-600 bg-zinc-800 text-zinc-400'
                          }`}
                          style={{ transform: 'scale(0.7)' }}
                        >
                          <span className="text-[9px] font-black">{opt.id}</span>
                        </div>
                      </div>

                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`font-black text-[11px] truncate ${isSelected ? 'text-teal-300' : 'text-zinc-200'}`}>
                            {opt.id}
                          </span>
                          {isSelected && (
                            <span className="w-3.5 h-3.5 rounded-full bg-teal-400 text-black flex items-center justify-center font-bold text-[9px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-zinc-400 block truncate">{opt.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: PROJECT SETTINGS */}
            <div className="p-3 rounded-xl bg-[#10151d] border border-[#1f2937] space-y-2.5">
              <h3 className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-teal-400" />
                <span>Project Details (പേരും റെസല്യൂഷനും)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                    Project Title:
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-[#080b10] border border-[#2a3647] rounded-lg px-2.5 py-2 text-white font-bold text-xs focus:outline-none focus:border-teal-400"
                    placeholder="My CineStudio Project"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                    Export Resolution:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['1080p', '4K', '720p'] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setProjectResolution(res)}
                        className={`py-1.5 min-h-[32px] rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                          projectResolution === res
                            ? 'bg-teal-400 text-zinc-950 shadow'
                            : 'bg-[#080b10] border border-[#2a3647] text-zinc-300 hover:text-white'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: USER ONLY MEDIA SELECTION */}
            <div className="p-3 rounded-xl bg-[#10151d] border border-[#1f2937] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-teal-400" />
                    <span>Add Media Clips (മീഡിയ ഫയലുകൾ)</span>
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setupFileInputRef.current?.click()}
                  className="px-3 py-1.5 min-h-[32px] rounded-lg bg-teal-400 hover:bg-teal-300 text-zinc-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all shrink-0"
                >
                  <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>+ Upload</span>
                </button>
              </div>

              {mediaGallery.length === 0 ? (
                <div
                  onClick={() => setupFileInputRef.current?.click()}
                  className="p-4 rounded-xl border border-dashed border-[#2a3647] hover:border-teal-400/80 bg-[#080b10] flex items-center justify-center gap-3 text-center cursor-pointer group transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div className="text-left">
                    <span className="font-extrabold text-xs text-zinc-200 block">
                      {isMl ? 'ഫോട്ടോകളും വീഡിയോകളും അപ്‌ലോഡ് ചെയ്യുക' : 'Upload Photos & Videos'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      MP4, MOV, JPG, PNG supported
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-0.5">
                  {mediaGallery.map((m) => {
                    const isChecked = setupSelectedMediaIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSetupSelectedMediaIds((prev) =>
                            isChecked ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          );
                        }}
                        className={`rounded-lg border overflow-hidden cursor-pointer relative group transition-all ${
                          isChecked
                            ? 'border-teal-400 ring-2 ring-teal-400/40 shadow-sm'
                            : 'border-[#1f2937] bg-[#080b10] hover:border-[#334155]'
                        }`}
                      >
                        <div className="aspect-square bg-black relative">
                          {m.type === 'video' && !m.thumbnailUrl ? (
                            <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                          ) : (
                            <img src={m.thumbnailUrl || m.url} alt={m.title} className="w-full h-full object-cover" />
                          )}
                          <div className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded bg-black/80 font-mono text-[8px] text-zinc-200">
                            {m.type === 'video' ? '🎬' : '📷'}
                          </div>
                          <div
                            className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                              isChecked ? 'bg-teal-400 text-black shadow' : 'bg-black/60 border border-white/50 text-transparent'
                            }`}
                          >
                            ✓
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteUploadedMedia(m.id, e)}
                            className="absolute top-1 left-1 w-5 h-5 rounded bg-black/75 hover:bg-rose-600 text-zinc-200 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="p-1 bg-[#10151d] truncate text-[9px] font-bold text-zinc-200">
                          {m.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Persistent Action Bar */}
        <div className="h-16 shrink-0 bg-[#10151d] border-t border-[#1f2937] px-4 flex items-center justify-between z-30">
          <div className="text-xs text-zinc-300">
            <span className="font-bold text-white">{selectedAspectRatio}</span>{' '}
            <span className="text-teal-400 font-semibold">({projectResolution})</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setStudioView('welcome')}
              className="px-4 py-2 min-h-[40px] rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2a3647] text-zinc-200 font-bold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFinishSetupAndOpenEditor}
              className="px-5 py-2.5 min-h-[42px] rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:brightness-105 text-zinc-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>{isMl ? 'എഡിറ്റിംഗ് ആരംഭിക്കുക' : 'Open Editor'}</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Always-Visible Bottom Video Ad Strip */}
        <EditorBottomVideoAdBar slotId="editor-setup" />
      </div>
    );
  }

  const activeWheelCategory =
    WHEEL_CATEGORIES.find((c) => c.id === selectedWheelCategoryId) || WHEEL_CATEGORIES[0];

  const renderPlayerCanvasWithGizmos = () => (
    <div
      ref={canvasOverlayRef}
      onPointerMove={(e) => {
        const drag = canvasDragStateRef.current;
        const overlay = canvasOverlayRef.current;
        if (!drag || !overlay) return;
        e.stopPropagation();
        const rect = overlay.getBoundingClientRect();
        const px = isCssRotatedLandscapeRef.current
          ? Math.max(2, Math.min(98, ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100))
          : Math.max(2, Math.min(98, ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100));
        const py = isCssRotatedLandscapeRef.current
          ? Math.max(2, Math.min(98, ((rect.right - e.clientX) / Math.max(1, rect.width)) * 100))
          : Math.max(2, Math.min(98, ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100));
        if (drag.mode === 'move_sticker' && drag.id) {
          setActiveStickers((prev) => prev.map((s) => (s.id === drag.id ? { ...s, xPct: px, yPct: py } : s)));
        } else if (drag.mode === 'resize_sticker' && drag.id && drag.originX !== undefined && drag.originY !== undefined) {
          const dist = Math.hypot(e.clientX - drag.originX, e.clientY - drag.originY);
          const ratio = dist / Math.max(12, drag.initDist || 40);
          const nextScale = Number(Math.max(0.3, Math.min(3.2, (drag.initScale || 1) * ratio)).toFixed(2));
          setActiveStickers((prev) => prev.map((s) => (s.id === drag.id ? { ...s, scale: nextScale } : s)));
        } else if (drag.mode === 'move_title') {
          setTitleXPct(px);
          setTitleYPct(py);
        } else if (drag.mode === 'resize_title' && drag.originX !== undefined && drag.originY !== undefined) {
          const dist = Math.hypot(e.clientX - drag.originX, e.clientY - drag.originY);
          const ratio = dist / Math.max(12, drag.initDist || 40);
          setTitleScale(Number(Math.max(0.35, Math.min(2.8, (drag.initScale || 1) * ratio)).toFixed(2)));
        } else if (drag.mode === 'vfx_start' && drag.id) {
          setVfxLayers((prev) => prev.map((v) => (v.id === drag.id ? { ...v, startXPct: px, startYPct: py } : v)));
        } else if (drag.mode === 'vfx_end' && drag.id) {
          setVfxLayers((prev) => prev.map((v) => (v.id === drag.id ? { ...v, endXPct: px, endYPct: py } : v)));
        } else if (drag.mode === 'vfx_scale' && drag.id && drag.originX !== undefined && drag.originY !== undefined) {
          const dist = Math.hypot(e.clientX - drag.originX, e.clientY - drag.originY);
          const ratio = dist / Math.max(12, drag.initDist || 40);
          const nextScale = Number(Math.max(0.3, Math.min(3.5, (drag.initScale || 1) * ratio)).toFixed(2));
          setVfxLayers((prev) => prev.map((v) => (v.id === drag.id ? { ...v, scale: nextScale } : v)));
        } else if (drag.mode === 'move_card' && drag.id) {
          setTrailerCardLayers((prev) => prev.map((c) => (c.id === drag.id ? { ...c, xPct: px, yPct: py } : c)));
        } else if (drag.mode === 'resize_card' && drag.id && drag.originX !== undefined && drag.originY !== undefined) {
          const dist = Math.hypot(e.clientX - drag.originX, e.clientY - drag.originY);
          const ratio = dist / Math.max(12, drag.initDist || 40);
          const nextScale = Number(Math.max(0.35, Math.min(2.2, (drag.initScale || 1) * ratio)).toFixed(2));
          setTrailerCardLayers((prev) => prev.map((c) => (c.id === drag.id ? { ...c, scale: nextScale } : c)));
        }
      }}
      onPointerUp={(e) => {
        if (canvasDragStateRef.current) {
          e.stopPropagation();
          canvasDragStateRef.current = null;
        }
      }}
      onPointerCancel={() => {
        canvasDragStateRef.current = null;
      }}
      className="relative w-full h-full flex items-center justify-center touch-none select-none"
    >
      <canvas
        ref={playerCanvasRef}
        width={canvasDims.width}
        height={canvasDims.height}
        className="block w-full h-full object-contain rounded pointer-events-none"
      />

      {/* ON-SCREEN ROUND HANDLE GIZMOS: 1) Active Sticker / Emoji Transform Ring */}
      {activeStickers.map((stkLayer) => {
        const isSelected = selectedFeatureType === 'sticker' && selectedStickerLayerId === stkLayer.id;
        const isInTimeWindow =
          totalDuration <= 0 ||
          (currentTimeSec >= stkLayer.startTimeSec - 0.1 &&
            currentTimeSec <= stkLayer.startTimeSec + stkLayer.durationSec + 0.1);
        if (!isSelected && !isInTimeWindow) return null;
        return (
          <div
            key={stkLayer.id}
            onPointerDown={(e) => {
              e.stopPropagation();
              setIsPlaying(false);
              setSelectedStickerLayerId(stkLayer.id);
              setSelectedVfxLayerId(null);
              setSelectedFeatureType('sticker');
              setActiveInspectorTab('adjust');
              setIsRightPanelOpen(true);
              canvasDragStateRef.current = { mode: 'move_sticker', id: stkLayer.id };
              try {
                canvasOverlayRef.current?.setPointerCapture(e.pointerId);
              } catch {}
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              left: `${stkLayer.xPct}%`,
              top: `${stkLayer.yPct}%`,
              width: `${Math.max(46, 62 * stkLayer.scale)}px`,
              height: `${Math.max(26, 30 * stkLayer.scale)}px`,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-move transition-shadow ${
              isSelected
                ? 'rounded-full border-2 border-dashed border-teal-400 bg-teal-400/10 shadow-[0_0_12px_rgba(45,212,191,0.55)]'
                : 'rounded-full border border-transparent hover:border-teal-400/50'
            }`}
            title="Drag to move or pull round corner dots to resize"
          >
            {isSelected && (
              <>
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const box = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    const cx = box.left + box.width / 2;
                    const cy = box.top + box.height / 2;
                    canvasDragStateRef.current = {
                      mode: 'resize_sticker',
                      id: stkLayer.id,
                      initScale: stkLayer.scale,
                      originX: cx,
                      originY: cy,
                      initDist: Math.hypot(e.clientX - cx, e.clientY - cy),
                    };
                    try {
                      canvasOverlayRef.current?.setPointerCapture(e.pointerId);
                    } catch {}
                  }}
                  className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-white border-2 border-teal-400 shadow-lg cursor-nwse-resize"
                />
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStickers((prev) => prev.filter((s) => s.id !== stkLayer.id));
                    setSelectedStickerLayerId(null);
                  }}
                  className="absolute -top-2.5 -right-2.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow border border-white cursor-pointer"
                  title="Delete Sticker"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </>
            )}
          </div>
        );
      })}

      {/* ON-SCREEN ROUND HANDLE GIZMOS: 2) Active Title Drag & Round Resize Box */}
      {showTitleOverlay && movieTitle && selectedFeatureType === 'title' && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            setIsPlaying(false);
            canvasDragStateRef.current = { mode: 'move_title' };
            try {
              canvasOverlayRef.current?.setPointerCapture(e.pointerId);
            } catch {}
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            left: `${titleXPct}%`,
            top: `${titleYPct}%`,
            width: `${Math.max(76, 115 * titleScale)}px`,
            height: `${Math.max(32, 42 * titleScale)}px`,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-move rounded-full border-2 border-dashed border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
          title="Drag Title or pull round dot to resize"
        >
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              const box = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
              const cx = box.left + box.width / 2;
              const cy = box.top + box.height / 2;
              canvasDragStateRef.current = {
                mode: 'resize_title',
                initScale: titleScale,
                originX: cx,
                originY: cy,
                initDist: Math.hypot(e.clientX - cx, e.clientY - cy),
              };
              try {
                canvasOverlayRef.current?.setPointerCapture(e.pointerId);
              } catch {}
            }}
            className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-white border-2 border-amber-400 shadow-lg cursor-nwse-resize"
          />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowTitleOverlay(false);
              setMovieTitle('');
            }}
            className="absolute -top-2.5 -right-2.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow border border-white cursor-pointer"
            title="Delete Title"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {/* ON-SCREEN ROUND HANDLE GIZMOS: 3) Selected VFX Motion Route */}
      {(() => {
        const activeVfxObj = vfxLayers.find((v) => v.id === selectedVfxLayerId);
        if (!activeVfxObj) return null;
        return (
          <>
            {activeVfxObj.vfx.hasMotionRoute && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                <line
                  x1={`${activeVfxObj.startXPct}%`}
                  y1={`${activeVfxObj.startYPct}%`}
                  x2={`${activeVfxObj.endXPct}%`}
                  y2={`${activeVfxObj.endYPct}%`}
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                />
              </svg>
            )}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                setIsPlaying(false);
                canvasDragStateRef.current = { mode: 'vfx_start', id: activeVfxObj.id };
                try {
                  canvasOverlayRef.current?.setPointerCapture(e.pointerId);
                } catch {}
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ left: `${activeVfxObj.startXPct}%`, top: `${activeVfxObj.startYPct}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 w-6 h-6 rounded-full bg-amber-400/90 border-2 border-white shadow flex items-center justify-center cursor-move text-[9px] font-black text-black"
              title="Drag Start Point"
            >
              🔫
            </div>
            {activeVfxObj.vfx.hasMotionRoute && (
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  canvasDragStateRef.current = { mode: 'vfx_end', id: activeVfxObj.id };
                  try {
                    canvasOverlayRef.current?.setPointerCapture(e.pointerId);
                  } catch {}
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ left: `${activeVfxObj.endXPct}%`, top: `${activeVfxObj.endYPct}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 w-6 h-6 rounded-full bg-rose-600/95 border-2 border-white shadow flex items-center justify-center cursor-move text-[9px] font-black text-white"
                title="Drag Target Point"
              >
                🎯
              </div>
            )}
          </>
        );
      })()}

      {/* ON-SCREEN ROUND HANDLE GIZMOS: 4) Image-to-Trailer Card Drag & Resize Ring */}
      {trailerCardLayers.map((cardLayer) => {
        const isSelected = selectedFeatureType === 'trailer_card' && selectedTrailerCardId === cardLayer.id;
        const isInTimeWindow =
          totalDuration <= 0 ||
          (currentTimeSec >= cardLayer.startTimeSec - 0.1 &&
            currentTimeSec <= cardLayer.startTimeSec + cardLayer.durationSec + 0.1);
        if (!isSelected && !isInTimeWindow) return null;
        return (
          <div
            key={cardLayer.id}
            onPointerDown={(e) => {
              e.stopPropagation();
              setIsPlaying(false);
              setSelectedTrailerCardId(cardLayer.id);
              setSelectedStickerLayerId(null);
              setSelectedVfxLayerId(null);
              setSelectedFeatureType('trailer_card');
              setActiveInspectorTab('adjust');
              setIsRightPanelOpen(true);
              canvasDragStateRef.current = { mode: 'move_card', id: cardLayer.id };
              try {
                canvasOverlayRef.current?.setPointerCapture(e.pointerId);
              } catch {}
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              left: `${cardLayer.xPct}%`,
              top: `${cardLayer.yPct}%`,
              width: `${Math.max(80, 120 * cardLayer.scale)}px`,
              height: `${Math.max(95, 138 * cardLayer.scale)}px`,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-move transition-shadow ${
              isSelected
                ? 'rounded-2xl border-2 border-dashed border-amber-400 bg-amber-400/5 shadow-[0_0_16px_rgba(251,191,36,0.45)]'
                : 'rounded-2xl border border-transparent hover:border-amber-400/40'
            }`}
          >
            {isSelected && (
              <>
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const box = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    const cx = box.left + box.width / 2;
                    const cy = box.top + box.height / 2;
                    canvasDragStateRef.current = {
                      mode: 'resize_card',
                      id: cardLayer.id,
                      initScale: cardLayer.scale,
                      originX: cx,
                      originY: cy,
                      initDist: Math.hypot(e.clientX - cx, e.clientY - cy),
                    };
                    try {
                      canvasOverlayRef.current?.setPointerCapture(e.pointerId);
                    } catch {}
                  }}
                  className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-white border-2 border-amber-400 shadow-lg cursor-nwse-resize"
                />
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTrailerCardLayers((prev) => prev.filter((c) => c.id !== cardLayer.id));
                    setSelectedTrailerCardId(null);
                  }}
                  className="absolute -top-2.5 -right-2.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow border border-white cursor-pointer"
                  title="Delete Trailer Card"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  // =========================================================================
  // VIEW 3: FULL 4K VIDEO STUDIO WORKSPACE (MOBILE-FIRST RADIAL WHEEL + 16:9 DUAL-SCREEN + 14 TRACKS)
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      <div
        style={
          isCssRotatedLandscape
            ? {
                position: 'fixed',
                top: '50%',
                left: '50%',
                width: `${viewportSize.height}px`,
                height: `${viewportSize.width}px`,
                transform: 'translate(-50%, -50%) rotate(90deg)',
                transformOrigin: 'center center',
              }
            : undefined
        }
        className={`${
          isCssRotatedLandscape ? '' : 'fixed inset-0'
        } bg-[#07090d] text-zinc-100 flex flex-col font-sans select-none overflow-hidden`}
      >
      {/* Hidden file input for adding to Media Gallery pool */}
      <input
        ref={multiFileInputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*"
        className="hidden"
        onChange={(e) => handleUserDeviceUpload(e, false)}
      />
      <input
        ref={chromaBgInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            handleQuickSlotUpload(f, (url, mediaType, title) => {
              setChromaConfig((prev) => ({
                ...prev,
                enabled: true,
                bgMode: 'custom_media',
                bgMediaUrl: url,
                bgMediaType: mediaType,
                bgLabel: title,
              }));
            });
          }
          e.target.value = '';
        }}
      />
      <input
        ref={splitLeftInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            handleQuickSlotUpload(f, (url, mediaType, title) => {
              setSplitScreenConfig((prev) => ({
                ...prev,
                enabled: true,
                leftMediaUrl: url,
                leftMediaType: mediaType,
                leftLabel: title,
              }));
            });
          }
          e.target.value = '';
        }}
      />
      <input
        ref={splitRightInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            handleQuickSlotUpload(f, (url, mediaType, title) => {
              setSplitScreenConfig((prev) => ({
                ...prev,
                enabled: true,
                rightMediaUrl: url,
                rightMediaType: mediaType,
                rightLabel: title,
              }));
            });
          }
          e.target.value = '';
        }}
      />
      <input
        ref={trailerCardInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            handleQuickSlotUpload(f, (url, mediaType) => {
              setDraftCardImageUrl(url);
              setDraftCardMediaType(mediaType);
              handleAddTrailerCard({ imageUrl: url, mediaType });
            });
          }
          e.target.value = '';
        }}
      />
      <input
        ref={userAudioInputRef}
        type="file"
        multiple
        accept="audio/*"
        className="hidden"
        onChange={handleUserAudioUpload}
      />

      {/* COMPACT TOP STUDIO HEADER BAR */}
      <div className="h-9 bg-[#0d1118] border-b border-[#1c2330] flex items-center justify-between px-2 sm:px-3 shrink-0 text-zinc-300 overflow-x-auto no-scrollbar gap-1.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              saveCurrentProjectToStorage();
              setStudioView('welcome');
            }}
            className="min-h-[28px] px-2 py-0.5 rounded-lg bg-[#161c26] hover:bg-[#202836] border border-[#263040] text-[10px] font-bold text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
            title="Saved Projects & Home"
          >
            <Home className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Projects</span>
          </button>

          <button
            type="button"
            onClick={() => {
              saveCurrentProjectToStorage();
              openNewProjectSetup('16:9', 'Project');
            }}
            className="min-h-[28px] px-2 py-0.5 rounded-lg bg-gradient-to-r from-[#bef264] to-[#38bdf8] text-black font-extrabold text-[10px] flex items-center gap-1 shadow cursor-pointer whitespace-nowrap"
            title="New Project"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>New</span>
          </button>

          {/* Format Badge (16:9 Default) */}
          <button
            type="button"
            onClick={() => {
              saveCurrentProjectToStorage();
              setStudioView('new_project_setup');
            }}
            className="min-h-[28px] flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#161c26] hover:bg-[#202836] border border-[#263040] text-teal-300 font-bold text-[10px] cursor-pointer whitespace-nowrap"
            title="Aspect Ratio & Resolution"
          >
            <Tv className="w-3.5 h-3.5 text-teal-400" />
            <span>{selectedAspectRatio}</span>
            <span className="text-zinc-400 font-normal hidden sm:inline">({projectResolution})</span>
          </button>

          {/* Quick Dual-Screen 16:9 Toggle */}
          <button
            type="button"
            onClick={() => setIsDualScreenPreview(!isDualScreenPreview)}
            className={`min-h-[28px] px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
              isDualScreenPreview
                ? 'bg-teal-400 text-black font-black shadow'
                : 'bg-[#161c26] border border-[#263040] text-teal-300 hover:text-white'
            }`}
            title="Toggle Dual-Screen 16:9 Preview"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{isDualScreenPreview ? 'Dual 16:9' : 'Single 16:9'}</span>
          </button>

          {isPortraitViewport && (
            <button
              type="button"
              onClick={() => setAutoLandscapeRotate((v) => !v)}
              className={`min-h-[28px] px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                autoLandscapeRotate
                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200'
                  : 'bg-[#161c26] border border-[#263040] text-zinc-300'
              }`}
              title="Toggle Automatic 16:9 Landscape Rotation"
            >
              <RotateCw className="w-3 h-3" />
              <span>{autoLandscapeRotate ? '16:9 Land' : 'Portrait'}</span>
            </button>
          )}
        </div>

        {/* Center Editable Project Title */}
        <div className="hidden md:flex items-center gap-1 text-zinc-400 text-xs truncate max-w-[160px]">
          <input
            type="text"
            value={projectName}
            onChange={(e) => {
              const val = e.target.value;
              setProjectName(val);
              saveCurrentProjectToStorage(undefined, val);
            }}
            className="bg-transparent hover:bg-[#161c26] focus:bg-[#0c1017] border border-transparent focus:border-[#263040] rounded-lg px-2 py-0.5 text-zinc-100 font-bold truncate text-xs outline-none w-full"
          />
          <Check className="w-3 h-3 text-teal-400 shrink-0" />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsLeftPanelOpen((v) => !v)}
            className={`min-h-[28px] px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              isLeftPanelOpen ? 'bg-teal-500/25 text-teal-300 border border-teal-500/50' : 'bg-[#161c26] border border-[#263040] text-zinc-300'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tools</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRightPanelOpen((v) => !v)}
            className={`min-h-[28px] px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              isRightPanelOpen ? 'bg-teal-500/25 text-teal-300 border border-teal-500/50' : 'bg-[#161c26] border border-[#263040] text-zinc-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Inspector</span>
          </button>
          {onOpenTerms && (
            <button
              type="button"
              onClick={onOpenTerms}
              className="min-h-[28px] px-2 py-0.5 rounded-lg bg-[#161c26] hover:bg-[#202836] border border-[#263040] text-zinc-300 hover:text-teal-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
              title={isMl ? 'നിബന്ധനകൾ' : 'Terms & Privacy'}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden md:inline">Terms</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              saveCurrentProjectToStorage();
              clearExportedPreview();
              setExportError(null);
              setExportProgress(0);
              setExportStatusText('');
              setShowExportModal(true);
            }}
            className="min-h-[28px] px-2.5 py-0.5 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-zinc-950 font-black rounded-lg text-[10.5px] flex items-center gap-1 cursor-pointer shadow whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Export</span>
          </button>
          <button
            type="button"
            onClick={() => {
              saveCurrentProjectToStorage();
              onBackToStoryboard();
            }}
            className="min-h-[28px] min-w-[28px] p-1 rounded-lg bg-[#161c26] hover:bg-rose-500/20 border border-[#263040] text-zinc-400 hover:text-rose-400 flex items-center justify-center cursor-pointer"
            title="Close Editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN STUDIO WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {/* =========================================================================
            1. UPPER STAGE (16:9 LANDSCAPE): [LEFT UTILITY RAIL | LARGE DUAL-SCREEN 16:9 PREVIEW | RIGHT 7+7 CIRCULAR TOOL WHEEL]
            ========================================================================= */}
        <div
          className={`grid grid-cols-[40px_minmax(0,1fr)_auto] items-stretch border-b border-[#1c2330] bg-[#080b10] min-h-0 transition-all duration-200 ${
            isTimelineExpanded
              ? 'flex-[0.8] max-h-[38%] overflow-hidden'
              : isCompactLandscape
              ? 'flex-[1.38] min-h-[188px]'
              : 'flex-[1.45] min-h-[245px]'
          }`}
        >
          {/* A. LEFT SLIM UTILITY CONTROL RAIL */}
          <div className="bg-[#0b0f16] border-r border-[#1c2330] flex flex-col items-center justify-between py-1 px-0.5 gap-0.5 shrink-0 overflow-y-auto no-scrollbar">
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  saveCurrentProjectToStorage();
                  onBackToStoryboard();
                }}
                className="w-8 h-8 rounded-lg hover:bg-[#1a2230] text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
                title="Back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleUndoAction}
                disabled={undoStack.length === 0}
                className="w-8 h-8 rounded-lg hover:bg-[#1a2230] disabled:opacity-30 text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
                title="Undo"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedoAction}
                disabled={redoStack.length === 0}
                className="w-8 h-8 rounded-lg hover:bg-[#1a2230] disabled:opacity-30 text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
                title="Redo"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const canvas = playerCanvasRef.current;
                  if (!canvas) return;
                  const link = document.createElement('a');
                  link.download = `Snapshot_${Date.now()}.png`;
                  link.href = canvas.toDataURL('image/png');
                  link.click();
                }}
                className="w-8 h-8 rounded-lg hover:bg-[#1a2230] text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
                title="Capture Frame Snapshot"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  saveCurrentProjectToStorage();
                  setStudioView('new_project_setup');
                }}
                className="w-8 h-8 rounded-lg hover:bg-[#1a2230] text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
                title="Format & Project Settings (16:9)"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-0.5 pt-0.5 border-t border-[#1c2330] w-full">
              <button
                type="button"
                onClick={() => setIsTimelineExpanded((v) => !v)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  isTimelineExpanded ? 'bg-teal-400/20 text-teal-300' : 'hover:bg-[#1a2230] text-zinc-200'
                }`}
                title={isTimelineExpanded ? 'Restore Preview Height' : 'Expand Timeline'}
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => seekToTime(0)}
                className="w-8 h-8 rounded-lg hover:bg-[#1a2230] text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
                title="Jump to Start"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => seekToTime(totalDuration)}
                className="w-8 h-8 rounded-lg hover:bg-[#1a2230] text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
                title="Jump to End"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* B. TOP LARGE DUAL-SCREEN 16:9 PREVIEW AREA */}
          <div className="min-w-0 min-h-0 bg-black flex flex-col justify-between overflow-hidden">
            {/* Preview Header Strip */}
            <div className="h-6 px-2 bg-[#0e131b] border-b border-[#1c2330] flex items-center justify-between text-[9.5px] text-zinc-400 shrink-0 gap-2">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="font-bold text-teal-300 font-mono whitespace-nowrap">
                  {selectedAspectRatio}
                </span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="truncate text-zinc-300 font-semibold">
                  {isDualScreenPreview ? 'Dual-Screen Preview (Filter + Combined)' : 'Combined 16:9 Player'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    seekToTime(0);
                    setIsPlaying(true);
                  }}
                  className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-400 hover:text-black border border-cyan-500/40 text-cyan-300 font-bold text-[9px] cursor-pointer whitespace-nowrap transition-colors"
                  title="Replay Filter & Cumulative Preview from 0s"
                >
                  ↺ Replay
                </button>
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-0.5 rounded hover:bg-[#1a2230] text-zinc-300 cursor-pointer"
                  title={isMuted ? 'Unmute Preview' : 'Mute Preview'}
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (!document.fullscreenElement) {
                        const reqFs = playerCanvasRef.current?.requestFullscreen;
                        if (typeof reqFs === 'function') {
                          void Promise.resolve(reqFs.call(playerCanvasRef.current)).catch(() => {
                            setIsTimelineExpanded((v) => !v);
                          });
                        } else {
                          setIsTimelineExpanded((v) => !v);
                        }
                      } else if (typeof document.exitFullscreen === 'function') {
                        void Promise.resolve(document.exitFullscreen()).catch(() => {});
                      }
                    } catch {
                      setIsTimelineExpanded((v) => !v);
                    }
                  }}
                  className="p-0.5 rounded hover:bg-[#1a2230] text-zinc-300 cursor-pointer"
                  title="Fullscreen"
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 16:9 Dual-Screen OR Single-Screen Viewports (Auto-fitted inside remaining height without clipping) */}
            {isDualScreenPreview ? (
              <div className="flex-1 min-h-0 w-full grid grid-cols-2 gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-black items-stretch overflow-hidden">
                {/* Screen 1: Active Filter / Effect Preview & Replay (Strict 16:9 Aspect) */}
                <div className="flex flex-col min-h-0 rounded-lg border border-cyan-500/45 bg-[#0c1017] p-1 overflow-hidden">
                  <div className="flex items-center justify-between pb-0.5 text-[9px] sm:text-[10px] gap-1 shrink-0">
                    <span className="font-bold text-cyan-300 truncate">1. Filter Preview</span>
                    <span className="text-cyan-300/90 font-mono text-[8.5px] truncate max-w-[96px]">
                      {activeFilter.name}
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 w-full [container-type:size] flex items-center justify-center">
                    <div
                      onClick={() => {
                        if (!canvasDragStateRef.current) handleTogglePlay();
                      }}
                      style={{
                        width: `min(100cqw, calc(100cqh * ${canvasDims.width} / ${canvasDims.height}))`,
                        height: `min(100cqh, calc(100cqw * ${canvasDims.height} / ${canvasDims.width}))`,
                      }}
                      className="max-w-full max-h-full aspect-video bg-black relative rounded overflow-hidden cursor-pointer flex items-center justify-center"
                    >
                      <canvas
                        ref={filterPreviewCanvasRef}
                        width={canvasDims.width}
                        height={canvasDims.height}
                        className="block w-full h-full object-contain pointer-events-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Screen 2: Combined Cumulative Edit + Filter Preview with Gizmos (Strict 16:9 Aspect) */}
                <div className="flex flex-col min-h-0 rounded-lg border border-teal-500/45 bg-[#0c1017] p-1 overflow-hidden">
                  <div className="flex items-center justify-between pb-0.5 text-[9px] sm:text-[10px] gap-1 shrink-0">
                    <span className="font-bold text-teal-300 truncate">2. Combined Edit</span>
                    <span className="text-teal-300/90 font-mono text-[8.5px] truncate">
                      Merged Result
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 w-full [container-type:size] flex items-center justify-center">
                    <div
                      onClick={() => {
                        if (!canvasDragStateRef.current) handleTogglePlay();
                      }}
                      style={{
                        width: `min(100cqw, calc(100cqh * ${canvasDims.width} / ${canvasDims.height}))`,
                        height: `min(100cqh, calc(100cqw * ${canvasDims.height} / ${canvasDims.width}))`,
                      }}
                      className="max-w-full max-h-full aspect-video bg-black relative rounded overflow-hidden cursor-pointer flex items-center justify-center"
                    >
                      {renderPlayerCanvasWithGizmos()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 w-full p-1 sm:p-1.5 bg-black [container-type:size] flex items-center justify-center overflow-hidden">
                <div
                  onClick={() => {
                    if (!canvasDragStateRef.current) handleTogglePlay();
                  }}
                  style={{
                    width: `min(100cqw, calc(100cqh * ${canvasDims.width} / ${canvasDims.height}))`,
                    height: `min(100cqh, calc(100cqw * ${canvasDims.height} / ${canvasDims.width}))`,
                  }}
                  className="max-w-full max-h-full aspect-video bg-black relative rounded-lg border border-zinc-800 overflow-hidden cursor-pointer"
                >
                  {renderPlayerCanvasWithGizmos()}
                </div>
              </div>
            )}

            {/* Slim Scrubber + Split Bar directly under Preview */}
            <div className="bg-[#0c1017] border-t border-[#1c2330] px-2 py-0.5 flex items-center gap-2 shrink-0 h-7">
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  handleSplitClipAtPlayhead();
                }}
                className="min-h-[22px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white text-[9.5px] font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                title="Split Video at Playhead"
              >
                <Scissors className="w-3 h-3" />
                <span>Split</span>
              </button>
              <input
                ref={playerRangeRef}
                type="range"
                min="0"
                max={Math.max(0.1, totalDuration)}
                step="0.05"
                value={Math.min(currentTimeSec, Math.max(0.1, totalDuration))}
                disabled={totalDuration <= 0}
                onChange={(e) => seekToTime(Number(e.target.value))}
                className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-teal-400 disabled:opacity-40"
              />
              <div className="font-mono text-[9.5px] text-zinc-300 shrink-0 whitespace-nowrap tabular-nums">
                <span ref={playerTimecodeRef} className="text-teal-400 font-bold">{formatTimecode(currentTimeSec)}</span>
              </div>
            </div>
          </div>

          {/* C. RIGHT-SIDE CIRCULAR TOOL WHEEL (7 + 7 Category Pages with Center Toggle Button) */}
          <div className="border-l border-[#1c2330] bg-[#0b0e13] flex items-center justify-center shrink-0">
            <CircularToolWheel
              categories={WHEEL_CATEGORIES}
              activeCategoryId={selectedWheelCategoryId}
              onSelectCategory={(cat, openDrawer) => handleSelectWheelCategory(cat, openDrawer)}
              isToolDrawerOpen={isLeftPanelOpen}
              onToggleToolDrawer={() => {
                setIsLeftPanelOpen((v) => !v);
                setMobilePanel('tools');
              }}
              isInspectorOpen={isRightPanelOpen}
              onToggleInspector={() => {
                setIsRightPanelOpen((v) => !v);
                setMobilePanel('inspector');
              }}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onExport={() => {
                saveCurrentProjectToStorage();
                clearExportedPreview();
                setExportError(null);
                setExportProgress(0);
                setExportStatusText('');
                setShowExportModal(true);
              }}
              compact={isCompactLandscape}
            />
          </div>
        </div>

        {/* =========================================================================
            2. WHEEL-SYNCED COLLAPSIBLE TOOLS & INSPECTOR DRAWER
            ========================================================================= */}
        {(isLeftPanelOpen || isRightPanelOpen) && (
          <div
            className={
              isCompactLandscape
                ? 'absolute inset-x-0 bottom-0 z-40 h-[62%] bg-[#10151d] border-t border-teal-400/40 shadow-2xl flex flex-col overflow-hidden'
                : 'shrink-0 max-h-[290px] bg-[#10151d] border-b border-[#1f2937] flex flex-col overflow-hidden'
            }
          >
            {/* Shared Wheel-Synced Category Quick Strip + Drawer Controls */}
            <div className="h-9 px-2 bg-[#0c1017] border-b border-[#1f2937] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 flex-1 min-w-0">
                {WHEEL_CATEGORIES.map((cat) => {
                  const IconC = cat.icon;
                  const isSel = selectedWheelCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectWheelCategory(cat, true)}
                      className={`min-h-[28px] px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold cursor-pointer whitespace-nowrap transition-colors ${
                        isSel
                          ? 'bg-teal-400 text-black shadow'
                          : 'bg-[#151b26] text-zinc-300 hover:text-white border border-[#242e3d]'
                      }`}
                    >
                      <IconC className="w-3 h-3 shrink-0" style={!isSel ? { color: cat.accentHex } : undefined} />
                      <span>{cat.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLeftPanelOpen((v) => !v)}
                  className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                    isLeftPanelOpen ? 'bg-teal-500/20 text-teal-300' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Tools
                </button>
                <button
                  type="button"
                  onClick={() => setIsRightPanelOpen((v) => !v)}
                  className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                    isRightPanelOpen ? 'bg-teal-500/20 text-teal-300' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Inspector
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLeftPanelOpen(false);
                    setIsRightPanelOpen(false);
                  }}
                  className="p-1 rounded hover:bg-[#1a2230] text-zinc-400 hover:text-white cursor-pointer"
                  title="Close Panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Drawer Split Body: Tools Column & Inspector Column */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
              {/* COLUMN 1: TOOLS & MEDIA BROWSER */}
              {isLeftPanelOpen && (
                <div className="flex-1 min-h-0 bg-[#10151d] md:border-r border-[#1f2937] flex flex-col overflow-hidden">
            {/* Top Category Tabs Bar */}
            <div className="flex items-center justify-between px-1.5 border-b border-[#1f2937] bg-[#0c1017] shrink-0 text-[10px] font-medium text-zinc-400">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                {[
                  { id: 'Filters', label: 'Filters', icon: Palette },
                  { id: 'Chroma', label: 'Chroma', icon: Scissors },
                  { id: 'Split', label: 'Split Join', icon: Split },
                  { id: 'Trailer', label: 'Trailer', icon: Clapperboard },
                  { id: 'ProFX', label: 'Pro FX', icon: Wand2 },
                  { id: 'Audio', label: 'Audio', icon: Music },
                  { id: 'Transitions', label: 'Transitions', icon: SlidersHorizontal },
                  { id: 'Effects', label: 'Effects', icon: Sparkles },
                  { id: 'Titles', label: 'Titles', icon: Type },
                  { id: 'VFX', label: 'VFX', icon: Crosshair },
                  { id: 'Templates', label: 'Templates', icon: Layers },
                  { id: 'Media', label: 'Media', icon: Video },
                  { id: 'Stickers', label: 'Stickers', icon: Smile },
                ].map((tab) => {
                  const IconComp = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setActiveSubCategory('All');
                        setSearchQuery('');
                        setItemRenderLimit(100);
                      }}
                      className={`min-h-[36px] py-1 px-2 rounded-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors relative whitespace-nowrap ${
                        isActive ? 'text-teal-300 bg-teal-500/15 font-bold' : 'hover:text-zinc-200 hover:bg-[#18202c]'
                      }`}
                    >
                      <IconComp
                        className={`w-3.5 h-3.5 ${
                          tab.id === 'VFX' && !isActive
                            ? 'text-rose-400'
                            : tab.id === 'Chroma' && !isActive
                            ? 'text-emerald-400'
                            : tab.id === 'Split' && !isActive
                            ? 'text-cyan-400'
                            : tab.id === 'Trailer' && !isActive
                            ? 'text-amber-400'
                            : tab.id === 'ProFX' && !isActive
                            ? 'text-amber-400'
                            : ''
                        }`}
                      />
                      <span className="text-[9.5px] sm:text-[10px]">{tab.label}</span>
                      {isActive && <div className="absolute bottom-0 inset-x-1 h-0.5 bg-teal-400 rounded-t" />}
                    </button>
                  );
                })}
              </div>

              {/* Collapse Left Panel Button */}
              <button
                type="button"
                onClick={() => setIsLeftPanelOpen(false)}
                className="min-h-[32px] min-w-[32px] p-1 rounded-lg hover:bg-[#18202c] text-zinc-400 hover:text-white cursor-pointer shrink-0 flex items-center justify-center"
                title="Collapse Tools Panel (ഹൈഡ് ചെയ്യുക)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Sub Layout: Left Tree Sub-sidebar + Main Dynamic Content Column */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Sub-Sidebar */}
              <div className="w-[64px] sm:w-28 bg-[#0c1017] border-r border-[#1f2937] p-1.5 sm:p-2 space-y-1 text-[10px] sm:text-[11px] shrink-0 text-zinc-400 overflow-y-auto no-scrollbar">
                <div className="pt-0.5">
                  <div className="flex items-center gap-1 py-1 px-1 text-zinc-200 font-semibold cursor-pointer">
                    <ChevronDown className="w-3 h-3 text-teal-400" />
                    <span className="truncate">{activeTab}</span>
                  </div>
                  <div className="pl-1 space-y-0.5">
                    {(activeTab === 'Filters'
                      ? ['All', 'Cinematic', 'Retro', 'Portrait', 'Nature', 'Black & White', 'Sci-Fi', 'Moody', 'Vivid', 'Anime & Pastel', 'Sunset Gold']
                      : activeTab === 'Chroma'
                      ? ['All', 'Green Screen', 'Blue Screen', 'BG Studio']
                      : activeTab === 'Split'
                      ? ['All', 'Side by Side', 'Top Bottom', 'PiP Overlay']
                      : activeTab === 'Trailer'
                      ? ['All', 'Presets', 'Card Builder', 'Title Motion', 'Trailer FX']
                      : activeTab === 'ProFX'
                      ? ['All', ...PRO_FEATURE_CATEGORIES]
                      : activeTab === 'Audio'
                      ? ['All', 'Dialogues', 'Funny & Meme SFX', 'Comedy Tracks', 'Cinematic Score', 'Background Music', 'Trailer Hits', 'Upbeat Beat', 'Lo-Fi Chill', 'Electronic', 'Sound Effects']
                      : activeTab === 'Transitions'
                      ? ['All', 'Dissolve', 'Dynamic Zoom', 'Flash & Light', 'Glitch & Warp', 'Slide & Push', '3D & Cube', 'Wipe & Shapes', 'Whip Pan']
                      : activeTab === 'Effects'
                      ? ['All', 'Light Leaks', 'Particles & Dust', 'Film Grain', 'Distortion', 'Atmosphere', 'Prism & Glow', 'Cyber & Neon', 'Retro Halftone']
                      : activeTab === 'Titles'
                      ? ['All', 'Cinematic Openers', 'Neon 3D', 'Lower Thirds', 'Minimal Titles', 'Social & Vlog', 'Retro & Movie']
                      : activeTab === 'VFX'
                      ? ['All', ...VFX_CATEGORIES]
                      : activeTab === 'Templates'
                      ? ['All', 'Cinematic Intro', 'Action Trailer', 'YouTube Vlog', 'Business Promo', 'Social Reels', 'Gaming Esports', 'Travel Nature', 'Comedy & Meme']
                      : activeTab === 'Media'
                      ? ['All', 'Video', 'Photo']
                      : ['All', 'Subscribe & Social', 'Badges & Seals', 'Arrows & Pointers', 'Cinema Icons', 'Emoji & Reactions', 'Meme & Comedy Stickers', 'Gaming & Stream']
                    ).map((sub) => {
                      const isCur = activeSubCategory === sub;
                      return (
                        <div
                          key={sub}
                          onClick={() => {
                            setActiveSubCategory(sub);
                            setItemRenderLimit(100);
                            if (activeTab === 'Media') setMediaFilter(sub as any);
                          }}
                          className={`min-h-[28px] flex items-center py-1 px-2 rounded-lg text-[10px] cursor-pointer truncate transition-colors ${
                            isCur ? 'text-teal-300 bg-teal-500/15 border border-teal-500/30 font-bold' : 'hover:text-zinc-200 hover:bg-[#18202c]'
                          }`}
                        >
                          <span className="truncate">{sub}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upload to Gallery button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => multiFileInputRef.current?.click()}
                    className="w-full min-h-[34px] py-1.5 bg-[#18202c] hover:bg-teal-400 hover:text-black text-teal-300 font-bold rounded-lg text-[10px] border border-teal-500/30 flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Content Grid with Feature Guide Banner & Full Details */}
              <div className="flex-1 min-w-0 flex flex-col p-1.5 sm:p-2.5 overflow-y-auto no-scrollbar space-y-2 min-h-0">
                {/* Search Bar */}
                <div className="relative shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setItemRenderLimit(100);
                    }}
                    placeholder={`Search ${activeTab}...`}
                    className="w-full min-h-[34px] bg-[#0c1017] border border-[#242e3d] rounded-xl pl-8 pr-2.5 py-1.5 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-400"
                  />
                </div>

                {/* Live Guide Banner explaining how the selected feature works */}
                <div className="p-2.5 rounded-xl bg-teal-950/25 border border-teal-500/30 text-[10px] text-zinc-300 leading-relaxed shrink-0">
                  <div className="flex items-center justify-between font-bold text-teal-300 mb-0.5">
                    <span>
                      {activeTab === 'Transitions' && '✨ ട്രാൻസിഷൻസ് ഗൈഡ്'}
                      {activeTab === 'Filters' && '🎨 ഫിൽട്ടറുകൾ ഗൈഡ്'}
                      {activeTab === 'Chroma' && '🟩 ഗ്രീൻ സ്ക്രീൻ / ക്രോമാ കീ സ്റ്റുഡിയോ'}
                      {activeTab === 'Split' && '🌗 ഡ്യുവൽ സ്പ്ലിറ്റ് (2 വീഡിയോ / ഫോട്ടോ ഒരുമിച്ച്)'}
                      {activeTab === 'Trailer' && '🎬 മൂവി ട്രെയിലർ & ഇമേജ് കാർഡ് സ്റ്റുഡിയോ'}
                      {activeTab === 'ProFX' && '⚡ പ്രോ എഡിറ്റിംഗ് (1,200 ഫീച്ചറുകൾ × 660 പാർട്ട്സ്)'}
                      {activeTab === 'Audio' && '🎵 ബാഗ്രൗണ്ട് മ്യൂസിക് & SFX'}
                      {activeTab === 'Effects' && '🌟 വിഷ്വൽ ഇഫക്റ്റുകൾ'}
                      {activeTab === 'Titles' && '🔤 ടൈറ്റിൽ സ്റ്റൈലുകൾ & ആനിമേഷൻ'}
                      {activeTab === 'VFX' && '🔫 സിനിമ ആക്ഷൻ VFX'}
                      {activeTab === 'Templates' && '🎬 ടെംപ്ലേറ്റുകൾ'}
                      {activeTab === 'Stickers' && '🏷️ സ്റ്റിക്കറുകൾ & ഇമോജി'}
                      {activeTab === 'Media' && '📁 മീഡിയ പൂൾ'}
                    </span>
                    {activeTab === 'Chroma' && chromaConfig.enabled && (
                      <button
                        type="button"
                        onClick={() => setChromaConfig(DEFAULT_CHROMA_KEY_CONFIG)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Turn Off Chroma
                      </button>
                    )}
                    {activeTab === 'Split' && splitScreenConfig.enabled && (
                      <button
                        type="button"
                        onClick={() => setSplitScreenConfig(DEFAULT_SPLIT_SCREEN_CONFIG)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Reset Split
                      </button>
                    )}
                    {activeTab === 'ProFX' && activeProFeature && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProFeature(null);
                          setProSettingOverrides({});
                        }}
                        className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Clear Pro FX
                      </button>
                    )}
                    {activeTab === 'Effects' && activeEffect && (
                      <button
                        type="button"
                        onClick={() => setActiveEffect(null)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Clear Effect
                      </button>
                    )}
                    {activeTab === 'VFX' && vfxLayers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setVfxLayers([]);
                          setSelectedVfxLayerId(null);
                        }}
                        className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                    {activeTab === 'Stickers' && activeStickers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStickers([]);
                          setSelectedStickerLayerId(null);
                        }}
                        className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <p className="text-[9.5px] text-zinc-400">
                    {activeTab === 'Transitions' &&
                      'ഏതെങ്കിലും ട്രാൻസിഷനിൽ ടച്ച് ചെയ്യുമ്പോൾ തന്നെ മുകളിലെ വീഡിയോ സ്ക്രീനിൽ അത് ലൈവായി പ്രവർത്തിക്കുന്നത് കാണാം. രണ്ട് ക്ലിപ്പുകൾക്കിടയിലും ഓട്ടോമാറ്റിക്കായി ചേർക്കപ്പെടും.'}
                    {activeTab === 'Filters' &&
                      'ഏതെങ്കിലും ഫിൽട്ടർ ക്ലിക്ക് ചെയ്താൽ വീഡിയോയിൽ ഉടൻ നിറം മാറുന്നത് കാണാം. കളർ ഗ്രേഡിംഗ് പാനലും വലത് സൈഡിൽ തുറക്കും.'}
                    {activeTab === 'Chroma' &&
                      'ഗ്രീൻ സ്ക്രീൻ / ബ്ലൂ സ്ക്രീൻ കട്ട് ചെയ്ത് ഇഷ്ടമുള്ള സ്റ്റുഡിയോ ബാഗ്രൗണ്ടോ നിങ്ങളുടെ ഫോട്ടോ/വീഡിയോയോ പിന്നിൽ വെക്കാം! ലൈവായും എക്സ്പോർട്ടിലും വർക്ക് ചെയ്യും.'}
                    {activeTab === 'Split' &&
                      'രണ്ട് ഫോട്ടോകളോ വീഡിയോകളോ ഒരേ സ്ക്രീനിൽ ബോർഡർ ഇല്ലാതെ (Seamless Frame) അല്ലെങ്കിൽ Divider Border ഓപ്ഷനോടെ ജോയിൻ ചെയ്യാം.'}
                    {activeTab === 'Trailer' &&
                      'ഹോളിവുഡ് സ്റ്റൈൽ ആനിമേറ്റഡ് ടൈറ്റിലുകൾ, ലെൻസ് ഫ്ലെയർ, കൗണ്ട്‌ഡൗൺ, ഇമേജ്-ടു-ട്രെയിലർ ആനിമേറ്റഡ് പോസ്റ്റർ കാർഡുകൾ എന്നിവ നിമിഷങ്ങൾക്കുള്ളിൽ നിർമ്മിക്കാം.'}
                    {activeTab === 'ProFX' &&
                      '1,200 പ്രോ ഫീച്ചറുകളിൽ ഏതെങ്കിലും ഒന്ന് തിരഞ്ഞെടുത്താൽ വലതുവശത്തുള്ള "Pro 660" പാനലിൽ 12 മോഡ്യൂളുകളിലായി 660 സെറ്റിംഗ്സ്/പാർട്ടുകൾ ലൈവായി അഡ്ജസ്റ്റ് ചെയ്യാം.'}
                    {activeTab === 'Audio' &&
                      'ബാഗ്രൗണ്ട് മ്യൂസിക്, കോമഡി, മീം സൗണ്ടുകൾ എന്നിവയിൽ 🔊 ക്ലിക്ക് ചെയ്താൽ അപ്പോൾ തന്നെ ശബ്ദം കേൾക്കാനും ടൈംലൈനിൽ ആഡ് ചെയ്യാനും സാധിക്കും.'}
                    {activeTab === 'Effects' &&
                      'ലൈറ്റ് ലീക്ക്, പാർട്ടിക്കിൾസ്, ഗ്ലിച്ച്, ഫോഗ്, നിയോൺ തുടങ്ങിയ വിഷ്വൽ ഇഫക്റ്റുകളിൽ ക്ലിക്ക് ചെയ്താൽ സ്ക്രീനിൽ തത്സമയം അപ്ലൈ ആകും.'}
                    {activeTab === 'Titles' &&
                      'ഏത് ടൈറ്റിലിൽ ക്ലിക്ക് ചെയ്താലും ടൈംലൈനിൽ ചേരും; സ്ക്രീനിലെ റൗണ്ട് ഹാൻഡിൽ വഴി വലിപ്പം കൂട്ടാനും നീക്കാനും വലതു സൈഡിൽ അഡ്ജസ്റ്റ് ചെയ്യാനും സാധിക്കും.'}
                    {activeTab === 'VFX' &&
                      'തോക്കിൽ നിന്നുള്ള വെടിയുണ്ട ശരീരത്തിൽ കയറുന്നത് (Gun→Body), രക്തം തെറിക്കൽ, സ്ഫോടനം, മിന്നൽ തുടങ്ങി സിനിമ ആക്ഷൻ VFX! ടച്ച് ചെയ്യുമ്പോൾ താഴെ VFX ടൈംലൈനും വലത് സൈഡിൽ റൂട്ട്/സൈസ് അഡ്ജസ്റ്റും വരും.'}
                    {activeTab === 'Templates' &&
                      'റെഡിമെയ്ഡ് ടൈറ്റിൽ, സബ്ടൈറ്റിൽ, ഡയറക്ടർ ക്രെഡിറ്റുകൾ ഒറ്റ ക്ലിക്കിൽ വീഡിയോയിൽ ചേർക്കാം.'}
                    {activeTab === 'Stickers' &&
                      'ഏത് ഇമോജി/സ്റ്റിക്കറിലും ക്ലിക്ക് ചെയ്താൽ താഴെ സെപ്പറേറ്റ് ടൈംലൈനിൽ വരും; സ്ക്രീനിലെ റൗണ്ട് വലയം വലിച്ച് വലുതാക്കാനും ചെറുതാക്കാനും സാധിക്കും.'}
                    {activeTab === 'Media' &&
                      'നിങ്ങൾ അപ്‌ലോഡ് ചെയ്ത ഫോട്ടോകളിലും വീഡിയോകളിലും "+ Add to Timeline" ക്ലിക്ക് ചെയ്ത് എഡിറ്റ് ചെയ്യാം.'}
                  </p>
                </div>

                {/* SECTION 1: FILTERS TAB */}
                {activeTab === 'Filters' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Cinematic Filters &amp; LUTs</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      {filteredFilters.slice(0, itemRenderLimit).map((f) => {
                        const isCur = activeFilter.id === f.id;
                        return (
                          <div
                            key={f.id}
                            onClick={() => {
                              setActiveFilter(f);
                              setSelectedFeatureType('filter');
                              setActiveInspectorTab('color');
                              setIsRightPanelOpen(true);
                              saveCurrentProjectToStorage();
                              logEditorTelemetry('edit_timeline');
                            }}
                            className={`rounded-xl border overflow-hidden cursor-pointer group transition-all ${
                              isCur
                                ? 'border-teal-400 ring-2 ring-teal-400/50 shadow-md bg-teal-950/30'
                                : 'border-[#242e3d] bg-[#141a24] hover:border-teal-400/60'
                            }`}
                          >
                            <div className="aspect-video bg-black overflow-hidden relative">
                              <img
                                src={activePreviewThumbUrl || f.thumbnail}
                                alt={f.name}
                                style={{ filter: f.cssFilter }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              {isCur && (
                                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-teal-400 text-black flex items-center justify-center font-bold text-[9px]">
                                  ✓
                                </div>
                              )}
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono text-zinc-300">
                                {f.category}
                              </span>
                            </div>
                            <div className="p-2 space-y-0.5">
                              <div className="truncate text-[10.5px] font-bold text-zinc-200 group-hover:text-teal-300">
                                {f.name}
                              </div>
                              <div className="text-[8.5px] text-zinc-400 line-clamp-2 leading-snug">
                                {f.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {filteredFilters.length > itemRenderLimit && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit((n) => n + 150)}
                          className="flex-1 min-h-[36px] py-1.5 rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-teal-300 font-bold text-[11px] cursor-pointer"
                        >
                          + Load More
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredFilters.length)}
                          className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[11px] cursor-pointer"
                        >
                          Show All
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 2: AUDIO, MUSIC & DIALOGUES TAB */}
                {activeTab === 'Audio' && (
                  <div className="space-y-2.5">
                    {/* Local Device Audio / Music Upload Card (100% Private Local Storage) */}
                    <div className="p-2.5 rounded-xl bg-emerald-950/25 border border-emerald-500/40 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10.5px] font-extrabold text-emerald-300 block truncate">
                          {isMl ? 'ഫോണിൽ നിന്ന് ഓഡിയോ / മ്യൂസിക് ചേർക്കുക' : 'Pick Audio / Music from Device'}
                        </span>
                        <span className="text-[9px] text-zinc-400 block truncate">
                          MP3, WAV, M4A, AAC · {isMl ? 'ലോക്കൽ പ്രോസസ്സിംഗ് മാത്രം' : 'Stays 100% private on device'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => userAudioInputRef.current?.click()}
                        className="min-h-[34px] px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-extrabold text-[10.5px] flex items-center gap-1.5 cursor-pointer shrink-0 shadow"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isMl ? 'ഓഡിയോ' : 'Pick Audio'}</span>
                      </button>
                    </div>

                    {/* Dedicated Dialogue / REC Track Builder Card */}
                    {(activeSubCategory === 'Dialogues' || activeSubCategory === 'All') && (
                      <div className="p-2.5 rounded-xl bg-amber-950/25 border border-amber-500/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-extrabold text-amber-300 flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5" />
                            <span>Dialogue &amp; Voiceover (Track 6)</span>
                          </span>
                          {activeDialogue && (
                            <button
                              type="button"
                              onClick={() => setActiveDialogue(null)}
                              className="text-[9.5px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                            >
                              Delete Dialogue
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={dialogueSpeakerInput}
                            onChange={(e) => setDialogueSpeakerInput(e.target.value)}
                            placeholder="Speaker (e.g. Hero)"
                            className="bg-[#0c1017] border border-[#2a3444] rounded-lg px-2 py-1 text-[10.5px] text-white font-semibold"
                          />
                          <div className="flex items-center gap-1.5 bg-[#0c1017] border border-[#2a3444] rounded-lg px-2 py-1">
                            <span className="text-[9.5px] text-zinc-400 shrink-0">Dur:</span>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={dialogueDurInput}
                              onChange={(e) => setDialogueDurInput(Math.max(1, Number(e.target.value) || 4))}
                              className="w-full bg-transparent text-[10.5px] text-amber-300 font-mono outline-none"
                            />
                            <span className="text-[9px] text-zinc-500">s</span>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={dialogueTextInput}
                          onChange={(e) => setDialogueTextInput(e.target.value)}
                          placeholder="Enter dialogue / voiceover script..."
                          className="w-full bg-[#0c1017] border border-[#2a3444] rounded-lg px-2.5 py-1.5 text-[10.5px] text-zinc-100"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDialogue({
                              id: `dlg_${Date.now()}`,
                              speaker: dialogueSpeakerInput || 'Speaker',
                              text: dialogueTextInput || 'Dialogue Line',
                              durationSec: dialogueDurInput || 6,
                            });
                            syncWheelToTrack('dialogues', false);
                          }}
                          className="w-full min-h-[34px] py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-[10.5px] cursor-pointer"
                        >
                          + Apply Dialogue to Track 6
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Background Music &amp; Meme SFX</span>
                    </div>
                    <div className="space-y-1.5">
                      {filteredAudio.slice(0, itemRenderLimit).map((a) => {
                        const isCur = activeAudio.id === a.id;
                        const isPrev = previewingAudioId === a.id;
                        return (
                          <div
                            key={a.id}
                            onClick={() => {
                              setActiveAudio(a);
                              setSelectedFeatureType('audio');
                              setActiveInspectorTab('audio');
                              setIsRightPanelOpen(true);
                              playAudioPreview(a);
                              saveCurrentProjectToStorage();
                              logEditorTelemetry('edit_timeline');
                            }}
                            className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 cursor-pointer group transition-all ${
                              isCur
                                ? 'bg-emerald-950/40 border-emerald-400 text-emerald-200'
                                : 'bg-[#141a24] border-[#242e3d] hover:border-emerald-400/60 text-zinc-300'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div className="relative w-14 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-emerald-500/30">
                                <img
                                  src={activePreviewThumbUrl}
                                  alt={a.title}
                                  className="w-full h-full object-cover opacity-55"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveAudio(a);
                                    playAudioPreview(a);
                                    logEditorTelemetry('edit_timeline');
                                  }}
                                  className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-colors ${
                                    isPrev
                                      ? 'bg-amber-400/80 text-black animate-pulse'
                                      : isCur
                                      ? 'bg-emerald-400/75 text-black'
                                      : 'bg-black/45 text-white hover:bg-teal-400/85 hover:text-black'
                                  }`}
                                  title="Play Audio Preview"
                                >
                                  {isPrev ? <Volume2 className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                                </button>
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-[10.5px] block truncate">{a.title}</span>
                                <span className="text-[9px] text-teal-400 font-mono block">
                                  {a.category} · {a.bpm} BPM · {a.mood} · {a.duration}
                                </span>
                                <span className="text-[8.5px] text-zinc-400 block leading-snug pt-0.5 line-clamp-2">
                                  {a.description}
                                </span>
                              </div>
                            </div>
                            {isCur && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[8.5px] shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {filteredAudio.length > itemRenderLimit && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit((n) => n + 150)}
                          className="flex-1 min-h-[36px] py-1.5 rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-teal-300 font-bold text-[11px] cursor-pointer"
                        >
                          + Load More
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredAudio.length)}
                          className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[11px] cursor-pointer"
                        >
                          Show All
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 3: TRANSITIONS TAB */}
                {activeTab === 'Transitions' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Live Video Transitions</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredTransitions.slice(0, itemRenderLimit).map((t) => {
                        const isSel = selectedTransitionId === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleSelectTransition(t)}
                            className={`p-2 rounded-xl border cursor-pointer flex flex-col group transition-all text-left ${
                              isSel
                                ? 'border-teal-400 bg-teal-950/40 ring-1 ring-teal-400/50'
                                : 'border-[#242e3d] bg-[#141a24] hover:border-teal-400'
                            }`}
                          >
                            <div className="aspect-video bg-black overflow-hidden relative rounded-lg mb-1.5 w-full">
                              <img
                                src={activePreviewThumbUrl}
                                alt={t.name}
                                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/35 via-transparent to-cyan-500/45 flex items-center justify-between px-2">
                                <span className="px-1.5 py-0.5 rounded bg-black/75 text-teal-300 font-black text-[9px]">{t.icon}</span>
                                <span className="px-1.5 py-0.5 rounded bg-black/75 text-zinc-200 font-mono text-[8px]">{t.durationSec}s</span>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10.5px] font-bold text-zinc-100 truncate">{t.name}</span>
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1e2736] text-teal-300 font-mono shrink-0">
                                  {t.category}
                                </span>
                              </div>
                              <p className="text-[8.5px] text-zinc-400 leading-snug pt-0.5 line-clamp-2">
                                {t.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {filteredTransitions.length > itemRenderLimit && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit((n) => n + 150)}
                          className="flex-1 min-h-[38px] py-1.5 rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-teal-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          + Load More
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredTransitions.length)}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          Show All ({filteredTransitions.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 4: EFFECTS TAB */}
                {activeTab === 'Effects' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Visual Overlays &amp; VFX ({filteredEffects.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredEffects.slice(0, itemRenderLimit).map((eff) => {
                        const isCur = activeEffect?.id === eff.id;
                        return (
                          <div
                            key={eff.id}
                            onClick={() => {
                              const nextEff = isCur ? null : eff;
                              setActiveEffect(nextEff);
                              if (nextEff) {
                                setSelectedFeatureType('effect');
                                setActiveInspectorTab('adjust');
                                setIsRightPanelOpen(true);
                                logEditorTelemetry('edit_timeline');
                              }
                            }}
                            className={`p-2 rounded-xl border cursor-pointer flex flex-col group transition-all text-left ${
                              isCur
                                ? 'border-teal-400 bg-teal-950/40 ring-1 ring-teal-400/50'
                                : 'border-[#242e3d] bg-[#141a24] hover:border-teal-400'
                            }`}
                          >
                            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative mb-1.5">
                              <img
                                src={activePreviewThumbUrl}
                                alt={eff.name}
                                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform"
                              />
                              <div
                                className="absolute inset-0 mix-blend-screen opacity-55"
                                style={{ background: `radial-gradient(circle at 30% 35%, ${eff.accentColor}, transparent 70%)` }}
                              />
                              <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-md bg-black/75 flex items-center justify-center border border-white/15">
                                <Sparkles className="w-3.5 h-3.5" style={{ color: eff.accentColor }} />
                              </div>
                              {isCur && (
                                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-teal-400 text-black text-[8px] font-black">
                                  ON ✓
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10.5px] font-bold text-zinc-100 truncate">{eff.name}</span>
                              </div>
                              <span className="text-[8.5px] text-teal-400 font-mono block">{eff.category}</span>
                              <p className="text-[8.5px] text-zinc-400 leading-snug pt-0.5 line-clamp-2">
                                {eff.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {filteredEffects.length > itemRenderLimit && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit((n) => n + 150)}
                          className="flex-1 min-h-[36px] py-1.5 rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-teal-300 font-bold text-[11px] cursor-pointer"
                        >
                          + Load More
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredEffects.length)}
                          className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[11px] cursor-pointer"
                        >
                          Show All
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 5: TITLES TAB */}
                {activeTab === 'Titles' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Titles &amp; Lower Thirds</span>
                    </div>
                    {/* Animated Title Motion & Color Theme Quick Selector */}
                    <div className="p-2 rounded-xl bg-[#0c1017] border border-[#242e3d] space-y-1.5">
                      <span className="text-[9.5px] font-bold text-amber-300 block">🎬 Title Animation &amp; Color Style</span>
                      <div className="flex flex-wrap gap-1">
                        {TRAILER_TITLE_ANIMATIONS.slice(0, 6).map((anim) => (
                          <button
                            key={anim.id}
                            type="button"
                            onClick={() => {
                              setTitleAnimType(anim.id);
                              if (!movieTitle) {
                                setMovieTitle('CINEMA PREMIERE');
                                setSubtitle('COMING SOON');
                              }
                              setShowTitleOverlay(true);
                              setSelectedFeatureType('title');
                            }}
                            className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold cursor-pointer ${
                              titleAnimType === anim.id
                                ? 'bg-amber-400 text-black'
                                : 'bg-[#18202c] text-zinc-300 hover:bg-[#222d3d]'
                            }`}
                          >
                            {anim.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/80">
                        {TRAILER_TITLE_THEMES.map((th) => (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => {
                              setTitleThemeType(th.id);
                              setShowTitleOverlay(true);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold flex items-center gap-1 cursor-pointer border ${
                              titleThemeType === th.id
                                ? 'border-amber-400 bg-amber-950/40 text-amber-200'
                                : 'border-zinc-800 bg-[#141a24] text-zinc-300'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: th.previewColor }} />
                            <span>{th.name.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {filteredTitles.slice(0, itemRenderLimit).map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setMovieTitle(t.titleText);
                            setSubtitle(t.subtitleText);
                            setShowTitleOverlay(true);
                            setTitleStartSec(Number(Math.max(0, currentTimeRef.current).toFixed(1)));
                            setTitleDurationSec(Math.max(3, Math.min(8, totalDuration || 6)));
                            setSelectedFeatureType('title');
                            setActiveInspectorTab('adjust');
                            setIsRightPanelOpen(true);
                            saveCurrentProjectToStorage();
                            logEditorTelemetry('edit_timeline');
                          }}
                          className="p-2 rounded-xl border border-[#242e3d] bg-[#141a24] hover:border-amber-400 cursor-pointer group transition-all text-left space-y-1.5"
                        >
                          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative">
                            <img
                              src={activePreviewThumbUrl}
                              alt={t.titleText}
                              className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center px-2 text-center">
                              <span className={`text-[11px] font-black leading-tight ${t.styleClass} drop-shadow`}>{t.titleText}</span>
                              <span className="text-[7.5px] text-amber-300/90 uppercase tracking-widest truncate max-w-full mt-0.5">{t.subtitleText}</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[10.5px] font-bold text-white truncate">{t.titleText}</div>
                              <span className="text-[8px] font-mono text-amber-400 shrink-0">{t.category}</span>
                            </div>
                            <div className="text-[8.5px] text-zinc-400 leading-snug line-clamp-2">{t.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {filteredTitles.length > itemRenderLimit && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit((n) => n + 150)}
                          className="flex-1 min-h-[38px] py-1.5 rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-teal-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          + Load More
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredTitles.length)}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          Show All ({filteredTitles.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 5B: CINEMA ACTION VFX TAB */}
                {activeTab === 'VFX' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Cinema Action VFX Library ({filteredVfxCatalog.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {filteredVfxCatalog.slice(0, itemRenderLimit).map((v) => {
                        const addedCount = vfxLayers.filter((l) => l.vfx.id === v.id).length;
                        return (
                          <div
                            key={v.id}
                            onClick={() => handleAddVfxLayer(v)}
                            className={`p-2 rounded-xl border cursor-pointer flex flex-col group transition-all text-left ${
                              addedCount > 0
                                ? 'border-rose-400 bg-rose-950/35 ring-1 ring-rose-400/50'
                                : 'border-[#242e3d] bg-[#141a24] hover:border-rose-400'
                            }`}
                          >
                            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative mb-1.5">
                              <img
                                src={activePreviewThumbUrl}
                                alt={v.name}
                                className="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform"
                              />
                              <div
                                className="absolute inset-0 opacity-60"
                                style={{
                                  background: `radial-gradient(circle at 60% 45%, ${v.primaryColor}, ${v.secondaryColor}44 45%, transparent 75%)`,
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{v.emoji}</span>
                              </div>
                              {addedCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10.5px] font-bold text-zinc-100 truncate">{v.name}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[8.5px] font-mono text-rose-300">
                                <span>{v.category}</span>
                                {v.hasMotionRoute && <span className="text-amber-300">• Gun→Body Route</span>}
                              </div>
                              <p className="text-[8.5px] text-zinc-400 leading-snug pt-0.5 line-clamp-2">{v.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {filteredVfxCatalog.length > itemRenderLimit && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit((n) => n + 200)}
                          className="flex-1 min-h-[38px] py-1.5 rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-rose-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          + Load More
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredVfxCatalog.length)}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          Show All ({filteredVfxCatalog.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 6: TEMPLATES TAB */}
                {activeTab === 'Templates' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Cinematic Templates</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      {filteredTemplates.slice(0, itemRenderLimit).map((tpl) => (
                        <div
                          key={tpl.id}
                          onClick={() => {
                            setSelectedTemplate(tpl);
                            setMovieTitle(tpl.movieTitle);
                            setSubtitle(tpl.subtitle);
                            setDirectorText(tpl.director);
                            setShowTitleOverlay(true);
                            setSelectedFeatureType('title');
                            setActiveInspectorTab('adjust');
                            setIsRightPanelOpen(true);
                            saveCurrentProjectToStorage();
                            logEditorTelemetry('edit_timeline');
                          }}
                          className={`rounded-xl border overflow-hidden cursor-pointer hover:border-teal-400 transition-all group ${
                            selectedTemplate.id === tpl.id ? 'border-teal-400 bg-teal-950/30' : 'border-[#242e3d] bg-[#141a24]'
                          }`}
                        >
                          <div className="aspect-video bg-black relative">
                            <img src={tpl.thumbnail} alt={tpl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono text-zinc-300">
                              {tpl.duration}
                            </div>
                          </div>
                          <div className="bg-[#0e131b] p-2 space-y-0.5">
                            <div className="truncate text-[10.5px] font-bold text-zinc-200">{tpl.title}</div>
                            <div className="text-[8.5px] text-zinc-400 line-clamp-2 leading-snug">{tpl.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {filteredTemplates.length > itemRenderLimit && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit((n) => n + 150)}
                          className="flex-1 min-h-[36px] py-1.5 rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-teal-300 font-bold text-[11px] cursor-pointer"
                        >
                          + Load More
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredTemplates.length)}
                          className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[11px] cursor-pointer"
                        >
                          Show All
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 7: USER ONLY MEDIA TAB (MEDIA POOL) */}
                {activeTab === 'Media' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        My Gallery Pool
                      </span>
                      <button
                        type="button"
                        onClick={() => multiFileInputRef.current?.click()}
                        className="min-h-[30px] px-3 py-1 rounded-lg bg-teal-400 hover:bg-teal-300 text-black font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" /> + Upload
                      </button>
                    </div>

                    {filteredUserMedia.length === 0 ? (
                      <div className="p-6 rounded-xl border-2 border-dashed border-[#2b3648] bg-[#141a24] text-center space-y-2.5">
                        <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-400 mx-auto flex items-center justify-center">
                          <Upload className="w-4 h-4" />
                        </div>
                        <p className="text-[11px] text-zinc-300 font-bold">
                          {isMl ? 'നിങ്ങളുടെ ഗാലറിയിൽ ഫോട്ടോകൾ ചേർത്തിട്ടില്ല' : 'No Gallery Media Added Yet'}
                        </p>
                        <button
                          type="button"
                          onClick={() => multiFileInputRef.current?.click()}
                          className="min-h-[36px] px-4 py-1.5 bg-teal-400 hover:bg-teal-300 text-black font-extrabold rounded-xl text-[11px] cursor-pointer"
                        >
                          + Upload from Device
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-[10px]">
                          {(['All', 'Video', 'Photo'] as const).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setMediaFilter(cat)}
                              className={`min-h-[28px] px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                                mediaFilter === cat ? 'bg-zinc-200 text-black' : 'bg-[#18202c] text-zinc-400 hover:text-white'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>

                        {/* Media Tiles with Prominent Add-to-Timeline Button */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 pt-1">
                          {filteredUserMedia.map((m) => (
                            <div
                              key={m.id}
                              className="rounded-xl border border-[#242e3d] bg-[#141a24] overflow-hidden relative group transition-all"
                            >
                              <div className="aspect-video bg-black relative">
                                {m.type === 'video' && !m.thumbnailUrl ? (
                                  <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                                ) : (
                                  <img src={m.thumbnailUrl || m.url} alt={m.title} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[9px] text-zinc-300">
                                  {m.type === 'video' ? '🎬' : '📷'} {m.duration}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteUploadedMedia(m.id, e)}
                                  className="absolute top-1 left-1 w-6 h-6 rounded-lg bg-black/75 hover:bg-rose-600 text-zinc-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Delete from Gallery"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="p-2 bg-[#0e131b] space-y-1.5">
                                <span className="font-bold text-[10.5px] text-zinc-200 block truncate">{m.title}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleAddMediaToTimeline(m, e)}
                                  className="w-full min-h-[32px] py-1 bg-teal-400 hover:bg-teal-300 text-black font-extrabold rounded-lg text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow"
                                >
                                  <Plus className="w-3 h-3 stroke-[3]" />
                                  <span>+ Add to Timeline</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* SECTION 8: STICKERS TAB */}
                {activeTab === 'Stickers' && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">
                      <span>Animated Badges &amp; Stickers</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
                      {filteredStickers.slice(0, itemRenderLimit).map((stk) => {
                        const addedCount = activeStickers.filter((s) => s.sticker.id === stk.id).length;
                        return (
                          <div
                            key={stk.id}
                            onClick={() => handleAddStickerLayer(stk)}
                            className={`p-1.5 rounded-xl border cursor-pointer flex flex-col items-center justify-center text-center group transition-all ${
                              addedCount > 0
                                ? 'border-teal-400 bg-teal-950/40 ring-1 ring-teal-400/50'
                                : 'border-[#242e3d] bg-[#141a24] hover:border-teal-400'
                            }`}
                          >
                            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative mb-1">
                              <img
                                src={activePreviewThumbUrl}
                                alt={stk.name}
                                className="w-full h-full object-cover opacity-65 group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                                <span className="text-xl drop-shadow">{stk.emoji}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-black ${stk.colorClass} truncate max-w-[90%]`}>
                                  {stk.badgeText}
                                </span>
                              </div>
                            </div>
                            <span className="text-[8.5px] font-bold text-zinc-300 truncate w-full">{stk.name}</span>
                            <span className="text-[7.5px] text-zinc-400 line-clamp-1 w-full">{stk.description}</span>
                          </div>
                        );
                      })}
                    </div>
                    {filteredStickers.length > itemRenderLimit && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit((n) => n + 150)}
                          className="flex-1 min-h-[38px] py-1.5 rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-teal-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          + Load More
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredStickers.length)}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          Show All ({filteredStickers.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 9: PRO FX (1,200 FEATURES × 660 SETTINGS ENGINE) */}
                {activeTab === 'ProFX' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>1,200 Pro Features ({filteredProFeatures.length} matching)</span>
                      <span className="text-amber-300">660 Parts Each</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      {filteredProFeatures.slice(0, itemRenderLimit).map((feat) => {
                        const isCur = activeProFeature?.id === feat.id;
                        return (
                          <div
                            key={feat.id}
                            onClick={() => {
                              setActiveProFeature(feat);
                              setSelectedFeatureType('profx');
                              setActiveInspectorTab('profx');
                              setProSettingsModuleFilter('all');
                              setProSettingsSearch('');
                              setProSettingsPage(0);
                              setIsRightPanelOpen(true);
                              logEditorTelemetry('edit_timeline');
                            }}
                            className={`p-2 rounded-xl border cursor-pointer flex flex-col group transition-all text-left ${
                              isCur
                                ? 'border-amber-400 bg-amber-950/35 ring-1 ring-amber-400/50 shadow-md'
                                : 'border-[#242e3d] bg-[#141a24] hover:border-amber-400/60'
                            }`}
                          >
                            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative mb-1.5">
                              <img
                                src={activePreviewThumbUrl}
                                alt={feat.name}
                                className="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform"
                              />
                              <div
                                className="absolute inset-0 opacity-45"
                                style={{ background: `linear-gradient(135deg, ${feat.accentHex}88, transparent 70%)` }}
                              />
                              <span
                                className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[8.5px] font-black"
                                style={{ color: feat.accentHex }}
                              >
                                #{String(feat.index).padStart(4, '0')}
                              </span>
                              {isCur && (
                                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-amber-400 text-black text-[8px] font-black">
                                  ON ✓
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10.5px] font-bold text-zinc-100 group-hover:text-amber-300 truncate">
                                  {feat.name}
                                </span>
                              </div>
                              <span className="text-[8px] font-mono text-teal-400 block truncate">{feat.category}</span>
                              <p className="text-[8.5px] text-zinc-400 leading-snug pt-0.5 line-clamp-2">{feat.shortDesc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {filteredProFeatures.length > itemRenderLimit && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit((n) => n + 150)}
                          className="flex-1 min-h-[38px] py-1.5 rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-amber-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          + Load More ({filteredProFeatures.length - itemRenderLimit} left)
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredProFeatures.length)}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          Show All 1,200
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 10: CHROMA KEY / GREEN SCREEN STUDIO */}
                {activeTab === 'Chroma' && (
                  <div className="space-y-2.5 text-[10.5px]">
                    <div className="p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/25 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-extrabold text-emerald-300 block">
                          🟩 Green Screen Chroma Key
                        </span>
                        <span className="text-[9px] text-zinc-400">
                          {chromaConfig.enabled ? 'Real-Time Background Cut Active ✓' : 'Tap Enable to remove green/blue background'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !chromaConfig.enabled;
                          setChromaConfig((p) => ({ ...p, enabled: next }));
                          if (next) {
                            setSelectedFeatureType('chroma');
                            setActiveInspectorTab('adjust');
                            setIsRightPanelOpen(true);
                          }
                        }}
                        className={`min-h-[34px] px-3 py-1 rounded-xl font-black text-[10px] cursor-pointer transition-all ${
                          chromaConfig.enabled
                            ? 'bg-emerald-400 text-black shadow-lg'
                            : 'bg-[#18202c] text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/20'
                        }`}
                      >
                        {chromaConfig.enabled ? 'ON ✓' : 'Enable'}
                      </button>
                    </div>

                    {/* Key Color Selector */}
                    {(activeSubCategory === 'All' || activeSubCategory === 'Green Screen' || activeSubCategory === 'Blue Screen') && (
                      <div className="p-2.5 rounded-xl bg-[#141a24] border border-[#242e3d] space-y-2">
                        <span className="text-[10px] font-bold text-zinc-200 block">1. Key Color (കട്ട് ചെയ്യേണ്ട നിറം)</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {(
                            [
                              { id: 'green', label: 'Studio Green', hex: '#00b140' },
                              { id: 'neon_green', label: 'Neon Green', hex: '#00ff00' },
                              { id: 'blue', label: 'Blue Screen', hex: '#0047bb' },
                              { id: 'cyan', label: 'Cyan Key', hex: '#00d2ff' },
                            ] as Array<{ id: ChromaKeyColorPreset; label: string; hex: string }>
                          ).map((sw) => {
                            const isSel = chromaConfig.colorPreset === sw.id;
                            return (
                              <button
                                key={sw.id}
                                type="button"
                                onClick={() => setChromaConfig((p) => ({ ...p, enabled: true, colorPreset: sw.id }))}
                                className={`p-1.5 rounded-lg border text-left cursor-pointer flex items-center gap-1.5 ${
                                  isSel ? 'border-emerald-400 bg-emerald-950/40 text-white' : 'border-[#242e3d] bg-[#0c1017] text-zinc-300'
                                }`}
                              >
                                <span className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0" style={{ backgroundColor: sw.hex }} />
                                <span className="text-[9px] font-bold truncate">{sw.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                          <span className="text-[9.5px] text-zinc-400">Custom Key Color:</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={chromaConfig.customHex}
                              onChange={(e) =>
                                setChromaConfig((p) => ({ ...p, enabled: true, colorPreset: 'custom', customHex: e.target.value }))
                              }
                              className="w-7 h-6 rounded bg-transparent cursor-pointer"
                            />
                            <span className="font-mono text-[9.5px] text-emerald-300">{chromaConfig.customHex}</span>
                          </div>
                        </div>

                        {/* Matte Fine Tuning Sliders */}
                        <div className="space-y-1.5 pt-1.5 border-t border-zinc-800/80">
                          <div>
                            <div className="flex justify-between text-[9.5px]">
                              <span className="text-zinc-300">Similarity / Cut Strength</span>
                              <span className="font-mono text-emerald-300">{chromaConfig.similarity}%</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="90"
                              value={chromaConfig.similarity}
                              onChange={(e) => setChromaConfig((p) => ({ ...p, enabled: true, similarity: Number(e.target.value) }))}
                              className="w-full h-1 accent-emerald-400 cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[9.5px]">
                              <span className="text-zinc-300">Edge Smoothness / Feather</span>
                              <span className="font-mono text-emerald-300">{chromaConfig.smoothness}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="50"
                              value={chromaConfig.smoothness}
                              onChange={(e) => setChromaConfig((p) => ({ ...p, enabled: true, smoothness: Number(e.target.value) }))}
                              className="w-full h-1 accent-emerald-400 cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[9.5px]">
                              <span className="text-zinc-300">Green Spill Reduction</span>
                              <span className="font-mono text-teal-300">{chromaConfig.spillReduction}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={chromaConfig.spillReduction}
                              onChange={(e) => setChromaConfig((p) => ({ ...p, enabled: true, spillReduction: Number(e.target.value) }))}
                              className="w-full h-1 accent-teal-400 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Replacement Background Selector */}
                    {(activeSubCategory === 'All' || activeSubCategory === 'BG Studio') && (
                      <div className="p-2.5 rounded-xl bg-[#141a24] border border-[#242e3d] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-200">2. New Background (പുതിയ ബാഗ്രൗണ്ട്)</span>
                          <button
                            type="button"
                            onClick={() => chromaBgInputRef.current?.click()}
                            className="px-2 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black font-black text-[9.5px] flex items-center gap-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>+ Upload BG</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(
                            [
                              { id: 'studio_teal', label: 'Studio Teal Stage', grad: 'from-teal-700/80 via-cyan-900/80 to-black' },
                              { id: 'cyber_grid', label: 'Cyber 3D Neon Grid', grad: 'from-fuchsia-700/80 via-indigo-900/80 to-black' },
                              { id: 'sunset_gold', label: 'Sunset Gold Studio', grad: 'from-amber-500/80 via-orange-900/80 to-black' },
                              { id: 'action_crimson', label: 'Action Crimson', grad: 'from-rose-700/80 via-red-950/80 to-black' },
                              { id: 'blur_bg', label: 'DSLR Blurred Back', grad: 'from-zinc-500/70 via-zinc-800/80 to-black' },
                              { id: 'black', label: 'Pure Cinema Black', grad: 'from-zinc-900 via-black to-black' },
                            ] as Array<{ id: ChromaBgMode; label: string; grad: string }>
                          ).map((bg) => (
                            <button
                              key={bg.id}
                              type="button"
                              onClick={() => setChromaConfig((p) => ({ ...p, enabled: true, bgMode: bg.id }))}
                              className={`p-1.5 rounded-lg border text-left text-[9.5px] font-bold cursor-pointer flex flex-col gap-1 ${
                                chromaConfig.bgMode === bg.id
                                  ? 'border-emerald-400 bg-emerald-950/40 text-emerald-200'
                                  : 'border-[#242e3d] bg-[#0c1017] text-zinc-300 hover:border-zinc-500'
                              }`}
                            >
                              <div className="w-full h-9 rounded overflow-hidden relative bg-black">
                                <img src={activePreviewThumbUrl} alt={bg.label} className="w-full h-full object-cover opacity-55" />
                                <div className={`absolute inset-0 bg-gradient-to-br ${bg.grad} mix-blend-screen`} />
                              </div>
                              <span className="truncate">{bg.label}</span>
                            </button>
                          ))}
                        </div>
                        {chromaConfig.bgMode === 'custom_media' && chromaConfig.bgLabel && (
                          <div className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[9px] text-emerald-200 flex items-center justify-between">
                            <span className="truncate">BG: {chromaConfig.bgLabel}</span>
                            <button
                              type="button"
                              onClick={() => setChromaConfig((p) => ({ ...p, bgMode: 'studio_teal', bgMediaUrl: undefined }))}
                              className="text-rose-400 hover:text-rose-300 ml-2 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        {mediaGallery.length > 0 && (
                          <div className="pt-1 border-t border-zinc-800/80 space-y-1">
                            <span className="text-[9px] text-zinc-400 block">Or Pick From Your Gallery Pool:</span>
                            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                              {mediaGallery.slice(0, 8).map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() =>
                                    setChromaConfig((p) => ({
                                      ...p,
                                      enabled: true,
                                      bgMode: 'custom_media',
                                      bgMediaUrl: m.url,
                                      bgMediaType: m.type,
                                      bgLabel: m.title,
                                    }))
                                  }
                                  className="w-16 shrink-0 rounded-lg border border-[#242e3d] hover:border-emerald-400 overflow-hidden bg-black cursor-pointer"
                                >
                                  <div className="aspect-video bg-black">
                                    {m.type === 'video' && !m.thumbnailUrl ? (
                                      <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                                    ) : (
                                      <img src={m.thumbnailUrl || m.url} alt={m.title} className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                  <span className="block truncate text-[8px] px-1 py-0.5 text-zinc-300">{m.title}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 11: DUAL SPLIT-SCREEN / 2-CLIP SIDE-BY-SIDE JOINER */}
                {activeTab === 'Split' && (
                  <div className="space-y-2.5 text-[10.5px]">
                    <div className="p-2.5 rounded-xl border border-cyan-500/40 bg-cyan-950/25 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-extrabold text-cyan-300 block">
                          🌗 Dual Side-by-Side Joiner
                        </span>
                        <span className="text-[9px] text-zinc-400">
                          {splitScreenConfig.enabled ? '2 Pictures / Videos Combined ✓' : 'Combine 2 videos or photos on 1 screen'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !splitScreenConfig.enabled;
                          setSplitScreenConfig((p) => ({ ...p, enabled: next }));
                          if (next) {
                            setSelectedFeatureType('split');
                            setActiveInspectorTab('adjust');
                            setIsRightPanelOpen(true);
                            if (timelineClips.length === 0 && mediaGallery.length > 0) {
                              const first = mediaGallery[0];
                              setTimelineClips([
                                {
                                  id: `split_seed_${Date.now()}`,
                                  mediaId: first.id,
                                  title: first.title,
                                  durationSec: first.durationSec || 6,
                                  url: first.url,
                                  thumbnailUrl: first.thumbnailUrl,
                                  type: first.type,
                                },
                              ]);
                            }
                          }
                        }}
                        className={`min-h-[34px] px-3 py-1 rounded-xl font-black text-[10px] cursor-pointer transition-all ${
                          splitScreenConfig.enabled
                            ? 'bg-cyan-400 text-black shadow-lg'
                            : 'bg-[#18202c] text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/20'
                        }`}
                      >
                        {splitScreenConfig.enabled ? 'ON ✓' : 'Enable'}
                      </button>
                    </div>

                    {/* Quick 1-Tap Actions */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const c1 = timelineClips[0] || mediaGallery[0];
                          const c2 = timelineClips[1] || mediaGallery[1] || c1;
                          setSplitScreenConfig((p) => ({
                            ...p,
                            enabled: true,
                            leftMediaUrl: c1?.url || p.leftMediaUrl,
                            leftMediaType: c1?.type || p.leftMediaType,
                            leftLabel: c1?.title || p.leftLabel,
                            rightMediaUrl: c2?.url || p.rightMediaUrl,
                            rightMediaType: c2?.type || p.rightMediaType,
                            rightLabel: c2?.title || p.rightLabel,
                          }));
                          setSelectedFeatureType('split');
                          setActiveInspectorTab('adjust');
                          setIsRightPanelOpen(true);
                        }}
                        className="min-h-[34px] px-2 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-[9.5px] cursor-pointer"
                      >
                        ⚡ Auto-Join 2 Clips
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitScreenConfig((p) => ({ ...p, swapSides: !p.swapSides }))}
                        className="min-h-[34px] px-2 py-1.5 rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-cyan-300 font-bold text-[9.5px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Swap Left ⇄ Right</span>
                      </button>
                    </div>

                    {/* Clip 1 & Clip 2 Dual Slot Cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-xl bg-[#141a24] border border-[#242e3d] space-y-1.5">
                        <span className="text-[9.5px] font-bold text-teal-300 block truncate">
                          Side 1: {splitScreenConfig.leftLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => splitLeftInputRef.current?.click()}
                          className="w-full py-1.5 rounded-lg bg-[#18202c] hover:bg-teal-400 hover:text-black border border-teal-500/40 text-teal-300 font-bold text-[9.5px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload Side 1</span>
                        </button>
                        {mediaGallery.length > 0 && (
                          <select
                            value={splitScreenConfig.leftMediaUrl}
                            onChange={(e) => {
                              const m = mediaGallery.find((x) => x.url === e.target.value);
                              if (m) {
                                setSplitScreenConfig((p) => ({
                                  ...p,
                                  enabled: true,
                                  leftMediaUrl: m.url,
                                  leftMediaType: m.type,
                                  leftLabel: m.title,
                                }));
                              }
                            }}
                            className="w-full bg-[#0c1017] border border-zinc-700 rounded px-1.5 py-1 text-[9px] text-zinc-200"
                          >
                            <option value="">-- Pool Clip 1 --</option>
                            {mediaGallery.map((m) => (
                              <option key={m.id} value={m.url}>
                                {m.title}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="p-2 rounded-xl bg-[#141a24] border border-[#242e3d] space-y-1.5">
                        <span className="text-[9.5px] font-bold text-amber-300 block truncate">
                          Side 2: {splitScreenConfig.rightLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => splitRightInputRef.current?.click()}
                          className="w-full py-1.5 rounded-lg bg-[#18202c] hover:bg-amber-400 hover:text-black border border-amber-500/40 text-amber-300 font-bold text-[9.5px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload Side 2</span>
                        </button>
                        {mediaGallery.length > 0 && (
                          <select
                            value={splitScreenConfig.rightMediaUrl}
                            onChange={(e) => {
                              const m = mediaGallery.find((x) => x.url === e.target.value);
                              if (m) {
                                setSplitScreenConfig((p) => ({
                                  ...p,
                                  enabled: true,
                                  rightMediaUrl: m.url,
                                  rightMediaType: m.type,
                                  rightLabel: m.title,
                                }));
                              }
                            }}
                            className="w-full bg-[#0c1017] border border-zinc-700 rounded px-1.5 py-1 text-[9px] text-zinc-200"
                          >
                            <option value="">-- Pool Clip 2 --</option>
                            {mediaGallery.map((m) => (
                              <option key={m.id} value={m.url}>
                                {m.title}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* 2-Option Center Line / Border Selector */}
                    <div className="p-2.5 rounded-xl bg-[#141a24] border border-[#242e3d] space-y-2">
                      <span className="text-[10px] font-bold text-cyan-300 block">
                        Center Line / Frame Mode (വര വേണോ വേണ്ടയോ?)
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSplitScreenConfig((p) => ({
                              ...p,
                              enabled: true,
                              showBorder: false,
                              gapPx: 0,
                              cornerRadius: 0,
                            }))
                          }
                          className={`min-h-[38px] p-2 rounded-lg border text-left text-[9.5px] font-bold cursor-pointer transition-all ${
                            !splitScreenConfig.showBorder
                              ? 'border-cyan-400 bg-cyan-950/45 text-cyan-200 ring-1 ring-cyan-400/40'
                              : 'border-[#242e3d] bg-[#0c1017] text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          <div className="font-black">Seamless Frame</div>
                          <div className="text-[8px] font-normal text-zinc-400">No Center Line (ഒരേ ഫ്രയിം)</div>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSplitScreenConfig((p) => ({
                              ...p,
                              enabled: true,
                              showBorder: true,
                              gapPx: Math.max(4, p.gapPx),
                            }))
                          }
                          className={`min-h-[38px] p-2 rounded-lg border text-left text-[9.5px] font-bold cursor-pointer transition-all ${
                            splitScreenConfig.showBorder
                              ? 'border-cyan-400 bg-cyan-950/45 text-cyan-200 ring-1 ring-cyan-400/40'
                              : 'border-[#242e3d] bg-[#0c1017] text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          <div className="font-black">Center Border Line</div>
                          <div className="text-[8px] font-normal text-zinc-400">Show Divider Line (വര വെക്കുക)</div>
                        </button>
                      </div>
                    </div>

                    {/* 8 Visual Split Screen Layout Presets with Visual Diagrams */}
                    <div className="p-2.5 rounded-xl bg-[#141a24] border border-[#242e3d] space-y-2">
                      <span className="text-[10px] font-bold text-zinc-200 block">Choose Dual Layout (ലേഔട്ട്)</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          [
                            { id: 'left_right', label: 'Left | Right (2-Side)' },
                            { id: 'top_bottom', label: 'Top / Bottom Split' },
                            { id: 'dual_cards', label: 'Dual Floating Cards' },
                            { id: 'diagonal', label: 'Diagonal Action Slash' },
                            { id: 'pip_bottom_right', label: 'PiP Bottom-Right' },
                            { id: 'pip_top_right', label: 'PiP Top-Right' },
                            { id: 'mirror_twin', label: 'Mirror Twin Sym' },
                            { id: 'triple_trio', label: 'Triple 3-Panel Trio' },
                          ] as Array<{ id: SplitLayoutType; label: string }>
                        ).map((lay) => (
                          <button
                            key={lay.id}
                            type="button"
                            onClick={() => setSplitScreenConfig((p) => ({ ...p, enabled: true, layout: lay.id }))}
                            className={`p-1.5 rounded-lg border text-left text-[9px] font-bold cursor-pointer flex items-center gap-2 ${
                              splitScreenConfig.layout === lay.id
                                ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                                : 'border-[#242e3d] bg-[#0c1017] text-zinc-300 hover:border-zinc-500'
                            }`}
                          >
                            <svg viewBox="0 0 36 22" className="w-8 h-5 shrink-0 rounded border border-zinc-700 bg-zinc-950">
                              {lay.id === 'left_right' && (
                                <>
                                  <rect x="1" y="1" width="16.5" height="20" fill="#14b8a6" opacity="0.7" />
                                  <rect x="18.5" y="1" width="16.5" height="20" fill="#f59e0b" opacity="0.7" />
                                </>
                              )}
                              {lay.id === 'top_bottom' && (
                                <>
                                  <rect x="1" y="1" width="34" height="9.5" fill="#14b8a6" opacity="0.7" />
                                  <rect x="1" y="11.5" width="34" height="9.5" fill="#f59e0b" opacity="0.7" />
                                </>
                              )}
                              {lay.id === 'dual_cards' && (
                                <>
                                  <rect x="2" y="3" width="15" height="16" rx="2" fill="#14b8a6" opacity="0.75" />
                                  <rect x="19" y="3" width="15" height="16" rx="2" fill="#f59e0b" opacity="0.75" />
                                </>
                              )}
                              {lay.id === 'diagonal' && (
                                <>
                                  <polygon points="1,1 24,1 12,21 1,21" fill="#14b8a6" opacity="0.75" />
                                  <polygon points="24,1 35,1 35,21 12,21" fill="#f59e0b" opacity="0.75" />
                                </>
                              )}
                              {lay.id === 'pip_bottom_right' && (
                                <>
                                  <rect x="1" y="1" width="34" height="20" fill="#14b8a6" opacity="0.55" />
                                  <rect x="21" y="11" width="12" height="8" rx="1.5" fill="#f59e0b" opacity="0.95" />
                                </>
                              )}
                              {lay.id === 'pip_top_right' && (
                                <>
                                  <rect x="1" y="1" width="34" height="20" fill="#14b8a6" opacity="0.55" />
                                  <rect x="21" y="3" width="12" height="8" rx="1.5" fill="#f59e0b" opacity="0.95" />
                                </>
                              )}
                              {lay.id === 'mirror_twin' && (
                                <>
                                  <rect x="1" y="1" width="16.5" height="20" fill="#22d3ee" opacity="0.75" />
                                  <rect x="18.5" y="1" width="16.5" height="20" fill="#22d3ee" opacity="0.45" />
                                </>
                              )}
                              {lay.id === 'triple_trio' && (
                                <>
                                  <rect x="1" y="1" width="10.5" height="20" fill="#14b8a6" opacity="0.75" />
                                  <rect x="12.5" y="1" width="11" height="20" fill="#f59e0b" opacity="0.75" />
                                  <rect x="24.5" y="1" width="10.5" height="20" fill="#38bdf8" opacity="0.75" />
                                </>
                              )}
                            </svg>
                            <span className="truncate">{lay.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                        <div className="flex justify-between text-[9.5px]">
                          <span className="text-zinc-300">Split Ratio</span>
                          <span className="font-mono text-cyan-300">{splitScreenConfig.splitRatio}% / {100 - splitScreenConfig.splitRatio}%</span>
                        </div>
                        <input
                          type="range"
                          min="25"
                          max="75"
                          value={splitScreenConfig.splitRatio}
                          onChange={(e) => setSplitScreenConfig((p) => ({ ...p, enabled: true, splitRatio: Number(e.target.value) }))}
                          className="w-full h-1 accent-cyan-400 cursor-pointer"
                        />
                        {splitScreenConfig.showBorder && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <span className="text-[9px] text-zinc-400">Divider Gap: {splitScreenConfig.gapPx}px</span>
                              <input
                                type="range"
                                min="0"
                                max="24"
                                value={splitScreenConfig.gapPx}
                                onChange={(e) => setSplitScreenConfig((p) => ({ ...p, gapPx: Number(e.target.value) }))}
                                className="w-full h-1 accent-cyan-400 cursor-pointer"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-zinc-400">Radius: {splitScreenConfig.cornerRadius}px</span>
                              <input
                                type="range"
                                min="0"
                                max="28"
                                value={splitScreenConfig.cornerRadius}
                                onChange={(e) => setSplitScreenConfig((p) => ({ ...p, cornerRadius: Number(e.target.value) }))}
                                className="w-full h-1 accent-cyan-400 cursor-pointer"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 12: MOVIE TRAILER STUDIO & IMAGE-TO-TRAILER ANIMATED CARD BUILDER */}
                {activeTab === 'Trailer' && (
                  <div className="space-y-2.5 text-[10.5px]">
                    {/* One-Tap Blockbuster Trailer Preset Packs */}
                    {(activeSubCategory === 'All' || activeSubCategory === 'Presets') && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                          🎬 1-Tap Trailer Preset Packs
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {TRAILER_PRESET_PACKS.map((pack) => (
                            <button
                              key={pack.id}
                              type="button"
                              onClick={() => {
                                setMovieTitle(pack.title);
                                setSubtitle(pack.subtitle);
                                setDirectorText(pack.director);
                                setShowTitleOverlay(true);
                                setTitleStartSec(0);
                                setTitleDurationSec(Math.max(4, totalDuration || 6));
                                setTitleAnimType(pack.titleAnim);
                                setTitleThemeType(pack.titleTheme);
                                setTrailerFxMode(pack.fxMode);
                                setDraftCardTitle(pack.title);
                                setDraftCardSubtitle(pack.subtitle);
                                setDraftCardBadge(pack.category.toUpperCase() + ' TRAILER');
                                setDraftCardTheme(pack.cardTheme);
                                setDraftCardAnim(pack.cardAnim);
                                setSelectedFeatureType('title');
                                setActiveInspectorTab('adjust');
                                setIsRightPanelOpen(true);
                                logEditorTelemetry('edit_timeline');
                              }}
                              className="p-2 rounded-xl border border-[#242e3d] bg-[#141a24] hover:border-amber-400 text-left cursor-pointer transition-all flex flex-col gap-1.5 group"
                            >
                              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative">
                                <img
                                  src={activePreviewThumbUrl}
                                  alt={pack.name}
                                  className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform"
                                />
                                <div
                                  className="absolute inset-0 opacity-45"
                                  style={{ background: `linear-gradient(135deg, ${pack.accent}, transparent 70%)` }}
                                />
                                <span
                                  className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-black"
                                  style={{ backgroundColor: pack.accent }}
                                >
                                  {pack.category}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-black text-[10px] text-white truncate">{pack.name}</span>
                              </div>
                              <p className="text-[8.5px] text-zinc-400 line-clamp-2">{pack.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Image-to-Trailer Animated Card Builder */}
                    {(activeSubCategory === 'All' || activeSubCategory === 'Card Builder') && (
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-950/35 to-[#141a24] border border-amber-500/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-black text-amber-300">
                            🃏 Image-to-Trailer Card Maker
                          </span>
                          <button
                            type="button"
                            onClick={() => trailerCardInputRef.current?.click()}
                            className="px-2 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-black text-[9px] flex items-center gap-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload Image</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={draftCardTitle}
                          onChange={(e) => setDraftCardTitle(e.target.value)}
                          placeholder="Poster Card Title..."
                          className="w-full bg-[#0c1017] border border-zinc-700 rounded-lg px-2 py-1 text-[10px] font-bold text-white"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={draftCardSubtitle}
                            onChange={(e) => setDraftCardSubtitle(e.target.value)}
                            placeholder="Tagline..."
                            className="bg-[#0c1017] border border-zinc-700 rounded-lg px-2 py-1 text-[9.5px] text-zinc-200"
                          />
                          <input
                            type="text"
                            value={draftCardBadge}
                            onChange={(e) => setDraftCardBadge(e.target.value)}
                            placeholder="Badge (COMING SOON)"
                            className="bg-[#0c1017] border border-zinc-700 rounded-lg px-2 py-1 text-[9.5px] text-amber-300 font-bold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={draftCardTheme}
                            onChange={(e) => setDraftCardTheme(e.target.value as TrailerCardTheme)}
                            className="bg-[#0c1017] border border-zinc-700 rounded-lg px-1.5 py-1 text-[9.5px] text-zinc-200"
                          >
                            {TRAILER_CARD_THEMES.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={draftCardAnim}
                            onChange={(e) => setDraftCardAnim(e.target.value as TrailerCardAnimation)}
                            className="bg-[#0c1017] border border-zinc-700 rounded-lg px-1.5 py-1 text-[9.5px] text-zinc-200"
                          >
                            {TRAILER_CARD_ANIMATIONS.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddTrailerCard()}
                          className="w-full min-h-[34px] py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-105 text-black font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer shadow"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>+ Create Animated Trailer Card</span>
                        </button>

                        {trailerCardLayers.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-amber-500/20">
                            {trailerCardLayers.map((c) => (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setSelectedTrailerCardId(c.id);
                                  setSelectedFeatureType('trailer_card');
                                  setActiveInspectorTab('adjust');
                                  setIsRightPanelOpen(true);
                                }}
                                className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer ${
                                  selectedTrailerCardId === c.id
                                    ? 'border-amber-400 bg-amber-950/40 text-amber-200'
                                    : 'border-zinc-800 bg-[#0c1017] text-zinc-300'
                                }`}
                              >
                                <span className="truncate font-bold text-[9.5px]">🃏 {c.title} ({c.startTimeSec}s)</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTrailerCardLayers((prev) => prev.filter((x) => x.id !== c.id));
                                    if (selectedTrailerCardId === c.id) setSelectedTrailerCardId(null);
                                  }}
                                  className="text-rose-400 hover:text-rose-300 ml-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Animated Title & Trailer Visual FX Controls */}
                    {(activeSubCategory === 'All' || activeSubCategory === 'Title Motion') && (
                      <div className="p-2.5 rounded-xl bg-[#141a24] border border-[#242e3d] space-y-2">
                        <span className="text-[10px] font-bold text-zinc-200 block">Title Animation Motion</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {TRAILER_TITLE_ANIMATIONS.map((anim) => (
                            <button
                              key={anim.id}
                              type="button"
                              onClick={() => {
                                setTitleAnimType(anim.id);
                                if (!movieTitle) {
                                  setMovieTitle('COMING SOON');
                                  setSubtitle('A CINEMA PREMIERE');
                                }
                                setShowTitleOverlay(true);
                                setSelectedFeatureType('title');
                              }}
                              className={`p-1.5 rounded-lg border text-left cursor-pointer ${
                                titleAnimType === anim.id
                                  ? 'border-amber-400 bg-amber-950/40 text-amber-200'
                                  : 'border-[#242e3d] bg-[#0c1017] text-zinc-300'
                              }`}
                            >
                              <span className="font-bold text-[9.5px] block truncate">{anim.name}</span>
                              <span className="text-[8px] text-zinc-400">{anim.tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(activeSubCategory === 'All' || activeSubCategory === 'Trailer FX') && (
                      <div className="p-2.5 rounded-xl bg-[#141a24] border border-[#242e3d] space-y-2">
                        <span className="text-[10px] font-bold text-zinc-200 block">Trailer Screen Visual FX</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {TRAILER_FX_OPTIONS.map((fx) => (
                            <button
                              key={fx.id}
                              type="button"
                              onClick={() => setTrailerFxMode(fx.id as TrailerFxMode)}
                              className={`p-1.5 rounded-lg border text-left cursor-pointer ${
                                trailerFxMode === fx.id
                                  ? 'border-rose-400 bg-rose-950/40 text-rose-200'
                                  : 'border-[#242e3d] bg-[#0c1017] text-zinc-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-[9.5px] truncate">{fx.name}</span>
                                <span className="text-[8px] text-amber-300 font-mono">{fx.badge}</span>
                              </div>
                              <p className="text-[8px] text-zinc-400 line-clamp-1">{fx.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* COLUMN 3: RIGHT PROPERTIES & CONTEXTUAL LIVE INSPECTOR INSIDE DRAWER */}
        {isRightPanelOpen && (
          <div className="flex-1 md:flex-none md:w-[320px] lg:w-[360px] min-h-0 bg-[#10151d] border-t md:border-t-0 border-[#1f2937] flex flex-col shrink-0 overflow-hidden">
            {/* Header Tabs with Collapse Button */}
            <div className="flex items-center justify-between border-b border-[#1f2937] bg-[#0c1017] shrink-0">
              <div className="flex-1 grid grid-cols-6 text-[8px] sm:text-[10px] font-semibold text-center text-zinc-400">
                {(['adjust', 'profx', 'video', 'color', 'speed', 'audio'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveInspectorTab(tab)}
                    className={`min-h-[34px] py-1.5 sm:py-2 capitalize cursor-pointer transition-colors relative truncate px-0.5 ${
                      activeInspectorTab === tab ? 'text-teal-300 font-bold bg-teal-500/10' : 'hover:text-zinc-200'
                    }`}
                  >
                    {tab === 'profx' ? 'Pro 660' : tab}
                    {activeInspectorTab === tab && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400" />}
                  </button>
                ))}
              </div>

              {/* Collapse Right Panel Button */}
              <button
                type="button"
                onClick={() => setIsRightPanelOpen(false)}
                className="min-h-[32px] min-w-[32px] p-1.5 rounded-lg hover:bg-[#18202c] text-zinc-400 hover:text-white cursor-pointer mr-1 shrink-0 flex items-center justify-center"
                title="Collapse Inspector (ഹൈഡ് ചെയ്യുക)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-2 sm:p-3 space-y-3">
              {/* TAB PRO 660: 300 PRO FEATURES × 660 SETTINGS/PARTS INSPECTOR */}
              {activeInspectorTab === 'profx' && (() => {
                const pageSize = 50;
                const totalFiltered = filteredProSettings.length;
                const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
                const safePage = Math.min(proSettingsPage, totalPages - 1);
                const pageItems = filteredProSettings.slice(safePage * pageSize, (safePage + 1) * pageSize);

                return (
                  <div className="space-y-2.5 text-[10.5px]">
                    {!activeProFeature ? (
                      <div className="p-4 rounded-xl bg-[#0c1017] border border-[#242e3d] text-center space-y-2.5">
                        <Wand2 className="w-6 h-6 text-amber-400 mx-auto" />
                        <p className="font-bold text-zinc-200 text-xs">No Pro Feature Selected Yet</p>
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                          Pick any of the 1,200 Pro Features from the left panel to adjust all 660 fine-tuned engine parts live!
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('ProFX');
                            setIsLeftPanelOpen(true);
                            setMobilePanel('tools');
                          }}
                          className="w-full min-h-[38px] py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          Browse 1,200 Pro Features
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Active Feature Header */}
                        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-mono font-bold text-amber-300">
                              #{String(activeProFeature.index).padStart(3, '0')} · 660 SETTINGS
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setProSettingOverrides({})}
                                className="text-[9px] text-teal-300 hover:text-teal-200 font-bold cursor-pointer"
                              >
                                Reset All
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveProFeature(null);
                                  setProSettingOverrides({});
                                }}
                                className="text-[9px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                          <div className="font-bold text-white text-xs truncate">{activeProFeature.name}</div>
                          <div className="text-[9px] text-zinc-400 truncate">{activeProFeature.category}</div>
                        </div>

                        {/* Search 660 Settings */}
                        <div className="relative">
                          <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-zinc-500" />
                          <input
                            type="text"
                            value={proSettingsSearch}
                            onChange={(e) => {
                              setProSettingsSearch(e.target.value);
                              setProSettingsPage(0);
                            }}
                            placeholder="Search 660 settings / P001-P660..."
                            className="w-full min-h-[32px] bg-[#0c1017] border border-[#242e3d] rounded-xl pl-7 pr-2 py-1 text-[10px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        {/* Module Filter (12 Modules × 55 Parts = 660) */}
                        <select
                          value={proSettingsModuleFilter}
                          onChange={(e) => {
                            setProSettingsModuleFilter(e.target.value);
                            setProSettingsPage(0);
                          }}
                          className="w-full min-h-[32px] bg-[#0c1017] border border-[#242e3d] rounded-xl px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-amber-400"
                        >
                          <option value="all">All 12 Modules (660 Settings / Parts)</option>
                          {PRO_SETTING_MODULES.map((mod) => (
                            <option key={mod.id} value={mod.id}>
                              {mod.title} (55 Parts)
                            </option>
                          ))}
                        </select>

                        {/* Pagination Bar */}
                        <div className="flex items-center justify-between text-[9.5px] text-zinc-400 bg-[#0c1017] border border-[#1f2937] rounded-lg px-2 py-1">
                          <span>
                            {totalFiltered} parts · Pg {safePage + 1}/{totalPages}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={safePage <= 0}
                              onClick={() => setProSettingsPage((p) => Math.max(0, p - 1))}
                              className="px-2 py-0.5 rounded bg-[#18202c] hover:bg-[#222d3d] disabled:opacity-40 text-zinc-200 font-bold cursor-pointer"
                            >
                              Prev
                            </button>
                            <button
                              type="button"
                              disabled={safePage >= totalPages - 1}
                              onClick={() => setProSettingsPage((p) => Math.min(totalPages - 1, p + 1))}
                              className="px-2 py-0.5 rounded bg-[#18202c] hover:bg-[#222d3d] disabled:opacity-40 text-zinc-200 font-bold cursor-pointer"
                            >
                              Next
                            </button>
                          </div>
                        </div>

                        {/* Windowed Sliders (50 per page for instant zero-lag responsiveness) */}
                        <div className="space-y-2">
                          {pageItems.map((setting) => {
                            const curVal =
                              proSettingOverrides[setting.id] !== undefined
                                ? proSettingOverrides[setting.id]
                                : setting.defaultValue;
                            const isModified = curVal !== setting.defaultValue;
                            return (
                              <div
                                key={setting.id}
                                className={`p-2 rounded-lg border space-y-1 ${
                                  isModified ? 'bg-amber-950/20 border-amber-500/40' : 'bg-[#0c1017] border-[#1f2937]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="min-w-0 flex-1 flex items-center gap-1.5">
                                    <span className="px-1 py-0.2 rounded bg-[#18202c] text-amber-300 font-mono text-[8.5px] font-bold shrink-0">
                                      {setting.partLabel}
                                    </span>
                                    <span className="text-[9.5px] text-zinc-200 font-semibold truncate" title={setting.name}>
                                      {setting.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="font-mono text-[9.5px] text-teal-300 font-bold">
                                      {curVal}
                                      {setting.unit}
                                    </span>
                                    {isModified && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setProSettingOverrides((prev) => {
                                            const copy = { ...prev };
                                            delete copy[setting.id];
                                            return copy;
                                          });
                                        }}
                                        className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                                        title="Reset part"
                                      >
                                        <RotateCcw className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min={setting.min}
                                  max={setting.max}
                                  step={setting.step}
                                  value={curVal}
                                  onChange={(e) => {
                                    const num = Number(e.target.value);
                                    setProSettingOverrides((prev) => ({
                                      ...prev,
                                      [setting.id]: num,
                                    }));
                                  }}
                                  className="w-full h-1 bg-zinc-700 accent-amber-400 cursor-pointer"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* TAB 0: CONTEXTUAL FEATURE ADJUST & TIMELINE INSPECTOR (Opens automatically for ANY selected feature!) */}
              {activeInspectorTab === 'adjust' && (() => {
                const selVfx = vfxLayers.find((v) => v.id === selectedVfxLayerId);
                const selStk = activeStickers.find((s) => s.id === selectedStickerLayerId);
                const selCard = trailerCardLayers.find((c) => c.id === selectedTrailerCardId);
                const effectiveType =
                  selCard && selectedFeatureType === 'trailer_card'
                    ? 'trailer_card'
                    : chromaConfig.enabled && selectedFeatureType === 'chroma'
                    ? 'chroma'
                    : splitScreenConfig.enabled && selectedFeatureType === 'split'
                    ? 'split'
                    : selVfx && selectedFeatureType === 'vfx'
                    ? 'vfx'
                    : selStk && selectedFeatureType === 'sticker'
                    ? 'sticker'
                    : selectedFeatureType;

                return (
                  <div className="space-y-3 text-[10.5px]">
                    {/* Feature Selector Pills so user can switch live between active layers */}
                    <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-2">
                      {selCard && (
                        <button
                          type="button"
                          onClick={() => setSelectedFeatureType('trailer_card')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                            effectiveType === 'trailer_card' ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          🃏 Card
                        </button>
                      )}
                      {chromaConfig.enabled && (
                        <button
                          type="button"
                          onClick={() => setSelectedFeatureType('chroma')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                            effectiveType === 'chroma' ? 'bg-emerald-400 text-black' : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          🟩 Chroma
                        </button>
                      )}
                      {splitScreenConfig.enabled && (
                        <button
                          type="button"
                          onClick={() => setSelectedFeatureType('split')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                            effectiveType === 'split' ? 'bg-cyan-400 text-black' : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          🌗 Split
                        </button>
                      )}
                      {selVfx && (
                        <button
                          type="button"
                          onClick={() => setSelectedFeatureType('vfx')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                            effectiveType === 'vfx' ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {selVfx.vfx.emoji} VFX
                        </button>
                      )}
                      {selStk && (
                        <button
                          type="button"
                          onClick={() => setSelectedFeatureType('sticker')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                            effectiveType === 'sticker' ? 'bg-teal-400 text-black' : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {selStk.sticker.emoji} Sticker
                        </button>
                      )}
                      {showTitleOverlay && movieTitle && (
                        <button
                          type="button"
                          onClick={() => setSelectedFeatureType('title')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                            effectiveType === 'title' ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          🔤 Title
                        </button>
                      )}
                      {activeEffect && (
                        <button
                          type="button"
                          onClick={() => setSelectedFeatureType('effect')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                            effectiveType === 'effect' ? 'bg-purple-400 text-black' : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          ✨ Effect
                        </button>
                      )}
                    </div>

                    {/* 0A. CHROMA KEY / GREEN SCREEN INSPECTOR */}
                    {effectiveType === 'chroma' && chromaConfig.enabled && (
                      <div className="space-y-2.5">
                        <div className="p-2 rounded-lg bg-emerald-950/35 border border-emerald-500/40 flex items-center justify-between gap-1">
                          <div className="min-w-0">
                            <span className="text-[9px] text-emerald-300 font-bold block">CHROMA KEY / GREEN SCREEN</span>
                            <span className="font-bold text-white text-xs block truncate">
                              Preset: {chromaConfig.colorPreset.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setChromaConfig(DEFAULT_CHROMA_KEY_CONFIG);
                              setSelectedFeatureType('clip');
                            }}
                            className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white text-[9px] font-bold cursor-pointer shrink-0"
                            title="Turn Off Chroma Key"
                          >
                            Turn Off
                          </button>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-zinc-400">
                            <span>Similarity / Cut Strength</span>
                            <span className="font-mono text-emerald-300">{chromaConfig.similarity}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={chromaConfig.similarity}
                            onChange={(e) =>
                              setChromaConfig((prev) => ({ ...prev, similarity: Number(e.target.value) }))
                            }
                            className="w-full h-1 bg-zinc-700 accent-emerald-400 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-zinc-400">
                            <span>Edge Smoothness</span>
                            <span className="font-mono text-emerald-300">{chromaConfig.smoothness}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            value={chromaConfig.smoothness}
                            onChange={(e) =>
                              setChromaConfig((prev) => ({ ...prev, smoothness: Number(e.target.value) }))
                            }
                            className="w-full h-1 bg-zinc-700 accent-emerald-400 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-zinc-400">
                            <span>Green Spill Reduction</span>
                            <span className="font-mono text-emerald-300">{chromaConfig.spillReduction}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={chromaConfig.spillReduction}
                            onChange={(e) =>
                              setChromaConfig((prev) => ({ ...prev, spillReduction: Number(e.target.value) }))
                            }
                            className="w-full h-1 bg-zinc-700 accent-emerald-400 cursor-pointer"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => chromaBgInputRef.current?.click()}
                          className="w-full py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-[10px] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Swap Background Photo / Video</span>
                        </button>
                      </div>
                    )}

                    {/* 0B. DUAL SPLIT-SCREEN INSPECTOR */}
                    {effectiveType === 'split' && splitScreenConfig.enabled && (
                      <div className="space-y-2.5">
                        <div className="p-2 rounded-lg bg-cyan-950/35 border border-cyan-500/40 flex items-center justify-between gap-1">
                          <div className="min-w-0">
                            <span className="text-[9px] text-cyan-300 font-bold block">DUAL SPLIT-SCREEN JOIN</span>
                            <span className="font-bold text-white text-xs block truncate">
                              Layout: {splitScreenConfig.layout.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSplitScreenConfig(DEFAULT_SPLIT_SCREEN_CONFIG);
                              setSelectedFeatureType('clip');
                            }}
                            className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white text-[9px] font-bold cursor-pointer shrink-0"
                            title="Turn Off Split Screen"
                          >
                            Turn Off
                          </button>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSplitScreenConfig((prev) => ({ ...prev, swapSides: !prev.swapSides }))
                            }
                            className="flex-1 py-1.5 rounded-lg bg-cyan-400/20 border border-cyan-400/50 hover:bg-cyan-400 hover:text-black text-cyan-200 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Swap Sides</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => splitLeftInputRef.current?.click()}
                            className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[9.5px] cursor-pointer"
                          >
                            Clip 1
                          </button>
                          <button
                            type="button"
                            onClick={() => splitRightInputRef.current?.click()}
                            className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[9.5px] cursor-pointer"
                          >
                            Clip 2
                          </button>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-zinc-400">
                            <span>Split Ratio</span>
                            <span className="font-mono text-cyan-300">{splitScreenConfig.splitRatio}%</span>
                          </div>
                          <input
                            type="range"
                            min="25"
                            max="75"
                            value={splitScreenConfig.splitRatio}
                            onChange={(e) =>
                              setSplitScreenConfig((prev) => ({ ...prev, splitRatio: Number(e.target.value) }))
                            }
                            className="w-full h-1 bg-zinc-700 accent-cyan-400 cursor-pointer"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSplitScreenConfig((prev) => ({
                                ...prev,
                                showBorder: false,
                                gapPx: 0,
                                cornerRadius: 0,
                              }))
                            }
                            className={`min-h-[36px] px-2 py-1.5 rounded-lg border text-[9.5px] font-bold cursor-pointer ${
                              !splitScreenConfig.showBorder
                                ? 'border-cyan-400 bg-cyan-950/45 text-cyan-200'
                                : 'border-[#242e3d] bg-[#0c1017] text-zinc-300'
                            }`}
                          >
                            Seamless (No Line)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSplitScreenConfig((prev) => ({
                                ...prev,
                                showBorder: true,
                                gapPx: Math.max(4, prev.gapPx),
                              }))
                            }
                            className={`min-h-[36px] px-2 py-1.5 rounded-lg border text-[9.5px] font-bold cursor-pointer ${
                              splitScreenConfig.showBorder
                                ? 'border-cyan-400 bg-cyan-950/45 text-cyan-200'
                                : 'border-[#242e3d] bg-[#0c1017] text-zinc-300'
                            }`}
                          >
                            Center Border Line
                          </button>
                        </div>

                        {splitScreenConfig.showBorder && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-[9px] text-zinc-400">Gap: {splitScreenConfig.gapPx}px</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="24"
                                  value={splitScreenConfig.gapPx}
                                  onChange={(e) =>
                                    setSplitScreenConfig((prev) => ({ ...prev, gapPx: Number(e.target.value) }))
                                  }
                                  className="w-full h-1 accent-cyan-400 cursor-pointer"
                                />
                              </div>
                              <div>
                                <span className="text-[9px] text-zinc-400">Radius: {splitScreenConfig.cornerRadius}px</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="28"
                                  value={splitScreenConfig.cornerRadius}
                                  onChange={(e) =>
                                    setSplitScreenConfig((prev) => ({ ...prev, cornerRadius: Number(e.target.value) }))
                                  }
                                  className="w-full h-1 accent-cyan-400 cursor-pointer"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1">
                              <span className="text-[9.5px] text-zinc-400">Divider / Border Hex</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="color"
                                  value={splitScreenConfig.borderColor}
                                  onChange={(e) =>
                                    setSplitScreenConfig((prev) => ({ ...prev, borderColor: e.target.value }))
                                  }
                                  className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={splitScreenConfig.borderColor}
                                  onChange={(e) =>
                                    setSplitScreenConfig((prev) => ({ ...prev, borderColor: e.target.value }))
                                  }
                                  className="w-20 bg-[#0c1017] border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-200"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* 0C. IMAGE-TO-TRAILER ANIMATED CARD INSPECTOR */}
                    {effectiveType === 'trailer_card' && selCard && (
                      <div className="space-y-2.5">
                        <div className="p-2 rounded-lg bg-amber-950/35 border border-amber-500/40 flex items-center justify-between gap-1">
                          <div className="min-w-0">
                            <span className="text-[9px] text-amber-300 font-bold block">ANIMATED TRAILER CARD</span>
                            <span className="font-bold text-white text-xs block truncate">🃏 {selCard.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTrailerCardLayers((prev) => prev.filter((c) => c.id !== selCard.id));
                              setSelectedTrailerCardId(null);
                              setSelectedFeatureType('clip');
                            }}
                            className="p-1 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white cursor-pointer shrink-0"
                            title="Delete Trailer Card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            seekToTime(selCard.startTimeSec);
                            setIsPlaying(true);
                          }}
                          className="w-full py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-black font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-black" />
                          <span>Live Preview Trailer Card</span>
                        </button>

                        <input
                          type="text"
                          value={selCard.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTrailerCardLayers((prev) => prev.map((c) => (c.id === selCard.id ? { ...c, title: val } : c)));
                          }}
                          placeholder="Card Title..."
                          className="w-full bg-[#101417] border border-zinc-700 rounded px-2 py-1 text-white font-bold text-xs"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={selCard.subtitle}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTrailerCardLayers((prev) => prev.map((c) => (c.id === selCard.id ? { ...c, subtitle: val } : c)));
                            }}
                            placeholder="Tagline..."
                            className="bg-[#101417] border border-zinc-700 rounded px-2 py-1 text-[9.5px] text-zinc-200"
                          />
                          <input
                            type="text"
                            value={selCard.badgeText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTrailerCardLayers((prev) => prev.map((c) => (c.id === selCard.id ? { ...c, badgeText: val } : c)));
                            }}
                            placeholder="Badge..."
                            className="bg-[#101417] border border-zinc-700 rounded px-2 py-1 text-[9.5px] text-amber-300 font-bold"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={selCard.theme}
                            onChange={(e) => {
                              const val = e.target.value as TrailerCardTheme;
                              setTrailerCardLayers((prev) => prev.map((c) => (c.id === selCard.id ? { ...c, theme: val } : c)));
                            }}
                            className="bg-[#101417] border border-zinc-700 rounded px-1.5 py-1 text-[9.5px] text-zinc-200"
                          >
                            {TRAILER_CARD_THEMES.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={selCard.animation}
                            onChange={(e) => {
                              const val = e.target.value as TrailerCardAnimation;
                              setTrailerCardLayers((prev) => prev.map((c) => (c.id === selCard.id ? { ...c, animation: val } : c)));
                            }}
                            className="bg-[#101417] border border-zinc-700 rounded px-1.5 py-1 text-[9.5px] text-zinc-200"
                          >
                            {TRAILER_CARD_ANIMATIONS.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-zinc-400">
                            <span>Card Size / Scale</span>
                            <span className="font-mono text-amber-300">{(selCard.scale * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.35"
                            max="2.2"
                            step="0.05"
                            value={selCard.scale}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setTrailerCardLayers((prev) => prev.map((c) => (c.id === selCard.id ? { ...c, scale: val } : c)));
                            }}
                            className="w-full h-1 bg-zinc-700 accent-amber-400 cursor-pointer"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-zinc-400">Pos X: {selCard.xPct.toFixed(0)}%</span>
                            <input
                              type="range"
                              min="5"
                              max="95"
                              value={selCard.xPct}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setTrailerCardLayers((prev) => prev.map((c) => (c.id === selCard.id ? { ...c, xPct: val } : c)));
                              }}
                              className="w-full h-1 accent-amber-400 cursor-pointer"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-400">Pos Y: {selCard.yPct.toFixed(0)}%</span>
                            <input
                              type="range"
                              min="5"
                              max="95"
                              value={selCard.yPct}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setTrailerCardLayers((prev) => prev.map((c) => (c.id === selCard.id ? { ...c, yPct: val } : c)));
                              }}
                              className="w-full h-1 accent-amber-400 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-zinc-400">Start: {selCard.startTimeSec.toFixed(1)}s</span>
                            <input
                              type="range"
                              min="0"
                              max={Math.max(10, totalDuration)}
                              step="0.1"
                              value={selCard.startTimeSec}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setTrailerCardLayers((prev) => prev.map((c) => (c.id === selCard.id ? { ...c, startTimeSec: val } : c)));
                              }}
                              className="w-full h-1 accent-amber-400 cursor-pointer"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-400">Dur: {selCard.durationSec.toFixed(1)}s</span>
                            <input
                              type="range"
                              min="0.5"
                              max="20"
                              step="0.2"
                              value={selCard.durationSec}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setTrailerCardLayers((prev) => prev.map((c) => (c.id === selCard.id ? { ...c, durationSec: val } : c)));
                              }}
                              className="w-full h-1 accent-amber-400 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* A. CINEMA VFX INSPECTOR (Gun -> Body Trajectory, Size, Timing, Preview & Delete) */}
                    {effectiveType === 'vfx' && selVfx && (
                      <div className="space-y-2.5">
                        <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/40 flex items-center justify-between gap-1">
                          <div className="min-w-0">
                            <span className="text-[9px] text-rose-300 font-bold block">ACTIVE VFX LAYER</span>
                            <span className="font-bold text-white text-xs block truncate">
                              {selVfx.vfx.emoji} {selVfx.vfx.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setVfxLayers((prev) => prev.filter((v) => v.id !== selVfx.id));
                              setSelectedVfxLayerId(null);
                              setSelectedFeatureType('clip');
                            }}
                            className="p-1 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white cursor-pointer shrink-0"
                            title="Delete VFX Layer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              currentTimeRef.current = selVfx.startTimeSec;
                              setCurrentTimeSec(selVfx.startTimeSec);
                              setIsPlaying(true);
                            }}
                            className="flex-1 py-1.5 rounded bg-rose-500 hover:bg-rose-400 text-white font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Live Preview Shot</span>
                          </button>
                        </div>

                        {/* Scale & Speed */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-zinc-400">
                            <span>Size / Scale (വലിപ്പം)</span>
                            <span className="font-mono text-teal-300">{(selVfx.scale * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.3"
                            max="3.5"
                            step="0.05"
                            value={selVfx.scale}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setVfxLayers((prev) => prev.map((v) => (v.id === selVfx.id ? { ...v, scale: val } : v)));
                            }}
                            className="w-full h-1 bg-zinc-700 accent-rose-400 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-zinc-400">
                            <span>Speed (വേഗത)</span>
                            <span className="font-mono text-amber-300">{selVfx.speed.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.3"
                            max="3.0"
                            step="0.1"
                            value={selVfx.speed}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setVfxLayers((prev) => prev.map((v) => (v.id === selVfx.id ? { ...v, speed: val } : v)));
                            }}
                            className="w-full h-1 bg-zinc-700 accent-amber-400 cursor-pointer"
                          />
                        </div>

                        {/* Gun Start -> Target Body Coordinates */}
                        <div className="p-2 rounded bg-[#101417] border border-zinc-800 space-y-2">
                          <span className="text-[9.5px] font-bold text-amber-300 block">
                            🔫 Gun Start → 🎯 Body Hit Route
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] text-zinc-400">Gun X: {selVfx.startXPct.toFixed(0)}%</span>
                              <input
                                type="range"
                                min="2"
                                max="98"
                                value={selVfx.startXPct}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setVfxLayers((prev) => prev.map((v) => (v.id === selVfx.id ? { ...v, startXPct: val } : v)));
                                }}
                                className="w-full h-1 accent-amber-400 cursor-pointer"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-zinc-400">Gun Y: {selVfx.startYPct.toFixed(0)}%</span>
                              <input
                                type="range"
                                min="2"
                                max="98"
                                value={selVfx.startYPct}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setVfxLayers((prev) => prev.map((v) => (v.id === selVfx.id ? { ...v, startYPct: val } : v)));
                                }}
                                className="w-full h-1 accent-amber-400 cursor-pointer"
                              />
                            </div>
                          </div>

                          {selVfx.vfx.hasMotionRoute && (
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
                              <div>
                                <span className="text-[9px] text-rose-300">Hit X: {selVfx.endXPct.toFixed(0)}%</span>
                                <input
                                  type="range"
                                  min="2"
                                  max="98"
                                  value={selVfx.endXPct}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setVfxLayers((prev) => prev.map((v) => (v.id === selVfx.id ? { ...v, endXPct: val } : v)));
                                  }}
                                  className="w-full h-1 accent-rose-500 cursor-pointer"
                                />
                              </div>
                              <div>
                                <span className="text-[9px] text-rose-300">Hit Y: {selVfx.endYPct.toFixed(0)}%</span>
                                <input
                                  type="range"
                                  min="2"
                                  max="98"
                                  value={selVfx.endYPct}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setVfxLayers((prev) => prev.map((v) => (v.id === selVfx.id ? { ...v, endYPct: val } : v)));
                                  }}
                                  className="w-full h-1 accent-rose-500 cursor-pointer"
                                />
                              </div>
                            </div>
                          )}

                          <label className="flex items-center justify-between pt-1 border-t border-zinc-800 cursor-pointer">
                            <span className="text-[9.5px] text-rose-300 font-bold">🩸 Blood Splatter on Hit</span>
                            <input
                              type="checkbox"
                              checked={selVfx.includeImpactBlood}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setVfxLayers((prev) => prev.map((v) => (v.id === selVfx.id ? { ...v, includeImpactBlood: checked } : v)));
                              }}
                              className="w-3.5 h-3.5 accent-rose-500 cursor-pointer"
                            />
                          </label>
                        </div>

                        {/* VFX Timeline Timing Bar */}
                        <div className="p-2 rounded bg-[#101417] border border-zinc-800 space-y-1.5">
                          <span className="text-[9.5px] font-bold text-teal-300 block">⏱ Timeline Timing</span>
                          <div>
                            <div className="flex justify-between text-[9px] text-zinc-400">
                              <span>Start Time</span>
                              <span className="font-mono text-zinc-200">{selVfx.startTimeSec.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={Math.max(10, totalDuration)}
                              step="0.1"
                              value={selVfx.startTimeSec}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setVfxLayers((prev) => prev.map((v) => (v.id === selVfx.id ? { ...v, startTimeSec: val } : v)));
                                currentTimeRef.current = val + selVfx.durationSec * 0.5;
                                setCurrentTimeSec(currentTimeRef.current);
                              }}
                              className="w-full h-1 accent-teal-400 cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[9px] text-zinc-400">
                              <span>Duration</span>
                              <span className="font-mono text-zinc-200">{selVfx.durationSec.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min="0.3"
                              max="12"
                              step="0.1"
                              value={selVfx.durationSec}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setVfxLayers((prev) => prev.map((v) => (v.id === selVfx.id ? { ...v, durationSec: val } : v)));
                              }}
                              className="w-full h-1 accent-teal-400 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* B. EMOJI / STICKER ADJUST & TIMELINE INSPECTOR */}
                    {effectiveType === 'sticker' && selStk && (
                      <div className="space-y-2.5">
                        <div className="p-2 rounded-lg bg-teal-950/30 border border-teal-500/40 flex items-center justify-between gap-1">
                          <div className="min-w-0">
                            <span className="text-[9px] text-teal-300 font-bold block">EMOJI / STICKER LAYER</span>
                            <span className="font-bold text-white text-xs block truncate">
                              {selStk.sticker.emoji} {selStk.sticker.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStickers((prev) => prev.filter((s) => s.id !== selStk.id));
                              setSelectedStickerLayerId(null);
                              setSelectedFeatureType('clip');
                            }}
                            className="p-1 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white cursor-pointer shrink-0"
                            title="Delete Sticker"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-zinc-400">
                            <span>Size / Scale (വലിപ്പം)</span>
                            <span className="font-mono text-teal-300">{(selStk.scale * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.3"
                            max="3.2"
                            step="0.05"
                            value={selStk.scale}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setActiveStickers((prev) => prev.map((s) => (s.id === selStk.id ? { ...s, scale: val } : s)));
                            }}
                            className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-zinc-400">Pos X: {selStk.xPct.toFixed(0)}%</span>
                            <input
                              type="range"
                              min="5"
                              max="95"
                              value={selStk.xPct}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setActiveStickers((prev) => prev.map((s) => (s.id === selStk.id ? { ...s, xPct: val } : s)));
                              }}
                              className="w-full h-1 accent-teal-400 cursor-pointer"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-400">Pos Y: {selStk.yPct.toFixed(0)}%</span>
                            <input
                              type="range"
                              min="5"
                              max="95"
                              value={selStk.yPct}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setActiveStickers((prev) => prev.map((s) => (s.id === selStk.id ? { ...s, yPct: val } : s)));
                              }}
                              className="w-full h-1 accent-teal-400 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-zinc-400">Start: {selStk.startTimeSec.toFixed(1)}s</span>
                            <input
                              type="range"
                              min="0"
                              max={Math.max(10, totalDuration)}
                              step="0.1"
                              value={selStk.startTimeSec}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setActiveStickers((prev) => prev.map((s) => (s.id === selStk.id ? { ...s, startTimeSec: val } : s)));
                              }}
                              className="w-full h-1 accent-teal-400 cursor-pointer"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-400">Dur: {selStk.durationSec.toFixed(1)}s</span>
                            <input
                              type="range"
                              min="0.5"
                              max="20"
                              step="0.2"
                              value={selStk.durationSec}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setActiveStickers((prev) => prev.map((s) => (s.id === selStk.id ? { ...s, durationSec: val } : s)));
                              }}
                              className="w-full h-1 accent-teal-400 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* C. TITLE ADJUST & TIMELINE INSPECTOR */}
                    {effectiveType === 'title' && (
                      <div className="space-y-2.5">
                        <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/40 flex items-center justify-between gap-1">
                          <span className="font-bold text-amber-300 text-xs truncate">🔤 Title Adjust &amp; Timeline</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowTitleOverlay(false);
                              setMovieTitle('');
                              setSubtitle('');
                              setSelectedFeatureType('clip');
                            }}
                            className="p-1 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-200 cursor-pointer"
                            title="Delete Title"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={movieTitle}
                          onChange={(e) => {
                            setMovieTitle(e.target.value);
                            setShowTitleOverlay(true);
                          }}
                          placeholder="Enter Title Text..."
                          className="w-full bg-[#101417] border border-zinc-700 rounded px-2 py-1 text-white font-bold text-xs"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={titleAnimType}
                            onChange={(e) => setTitleAnimType(e.target.value as TitleAnimationType)}
                            className="bg-[#101417] border border-zinc-700 rounded px-1.5 py-1 text-[9.5px] text-amber-300 font-bold"
                            title="Title Animation Motion"
                          >
                            {TRAILER_TITLE_ANIMATIONS.map((anim) => (
                              <option key={anim.id} value={anim.id}>
                                {anim.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={titleThemeType}
                            onChange={(e) => setTitleThemeType(e.target.value as TitleThemeType)}
                            className="bg-[#101417] border border-zinc-700 rounded px-1.5 py-1 text-[9.5px] text-zinc-200"
                            title="Title Cinema Theme"
                          >
                            {TRAILER_TITLE_THEMES.map((thm) => (
                              <option key={thm.id} value={thm.id}>
                                {thm.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-zinc-400">
                            <span>Size (വലിപ്പം)</span>
                            <span className="font-mono text-amber-300">{(titleScale * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.35"
                            max="2.8"
                            step="0.05"
                            value={titleScale}
                            onChange={(e) => setTitleScale(Number(e.target.value))}
                            className="w-full h-1 accent-amber-400 cursor-pointer"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-zinc-400">Pos X: {titleXPct.toFixed(0)}%</span>
                            <input type="range" min="5" max="95" value={titleXPct} onChange={(e) => setTitleXPct(Number(e.target.value))} className="w-full h-1 accent-amber-400 cursor-pointer" />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-400">Pos Y: {titleYPct.toFixed(0)}%</span>
                            <input type="range" min="5" max="95" value={titleYPct} onChange={(e) => setTitleYPct(Number(e.target.value))} className="w-full h-1 accent-amber-400 cursor-pointer" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-zinc-400">Start: {titleStartSec.toFixed(1)}s</span>
                            <input type="range" min="0" max={Math.max(10, totalDuration)} step="0.1" value={titleStartSec} onChange={(e) => setTitleStartSec(Number(e.target.value))} className="w-full h-1 accent-amber-400 cursor-pointer" />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-400">Dur: {titleDurationSec.toFixed(1)}s</span>
                            <input type="range" min="0.5" max="30" step="0.5" value={titleDurationSec} onChange={(e) => setTitleDurationSec(Number(e.target.value))} className="w-full h-1 accent-amber-400 cursor-pointer" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* D. FALLBACK / EFFECT / TRANSITION / CLIP QUICK TIMELINE ADJUST */}
                    {(effectiveType === 'effect' ||
                      effectiveType === 'transition' ||
                      effectiveType === 'clip' ||
                      effectiveType === 'filter' ||
                      effectiveType === 'audio' ||
                      effectiveType === 'speed' ||
                      effectiveType === 'profx' ||
                      (!selVfx && effectiveType === 'vfx') ||
                      (!selStk && effectiveType === 'sticker') ||
                      (!selCard && effectiveType === 'trailer_card') ||
                      (!chromaConfig.enabled && effectiveType === 'chroma') ||
                      (!splitScreenConfig.enabled && effectiveType === 'split')) && (
                      <div className="space-y-2.5">
                        {activeEffect && (
                          <div className="p-2 rounded-lg bg-purple-950/30 border border-purple-500/40 flex items-center justify-between">
                            <div>
                              <span className="text-[9px] text-purple-300 font-bold block">ACTIVE EFFECT</span>
                              <span className="font-bold text-white text-xs">{activeEffect.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveEffect(null)}
                              className="p-1 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-200 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <div className="p-2 rounded bg-[#101417] border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-teal-300 text-[10px]">Video Scale &amp; Opacity</span>
                            <span className="font-mono text-[9px] text-zinc-400">{scaleX.toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="250"
                            value={scaleX}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setScaleX(v);
                              if (linkScale) setScaleY(v);
                            }}
                            className="w-full h-1 accent-teal-400 cursor-pointer"
                          />
                          <div className="flex items-center justify-between text-[9.5px] text-zinc-400">
                            <span>Opacity</span>
                            <span className="font-mono">{opacity.toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={opacity}
                            onChange={(e) => setOpacity(Number(e.target.value))}
                            className="w-full h-1 accent-teal-400 cursor-pointer"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('VFX');
                              setIsLeftPanelOpen(true);
                            }}
                            className="min-h-[34px] py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500 hover:text-white text-rose-300 font-bold text-[10px] cursor-pointer transition-colors"
                          >
                            + Add VFX
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('Stickers');
                              setIsLeftPanelOpen(true);
                            }}
                            className="min-h-[34px] py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 hover:bg-teal-400 hover:text-black text-teal-300 font-bold text-[10px] cursor-pointer transition-colors"
                          >
                            + Add Sticker
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 1: COLOR GRADING SUITE (User specifically requested color adjust features) */}
              {activeInspectorTab === 'color' && (
                <div className="space-y-3 text-[11px]">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                      <Palette className="w-3.5 h-3.5 text-teal-400" />
                      <span>Color Grading &amp; Filter LUTs</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setColorBrightness(0);
                        setColorContrast(0);
                        setColorSaturation(0);
                        setColorExposure(0);
                        setColorWarmth(0);
                        setColorTint(0);
                        setColorHighlights(0);
                        setColorShadows(0);
                        setColorVignette(0);
                      }}
                      className="text-[9px] text-teal-400 hover:text-teal-300 font-bold cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Active Preset Badge */}
                  <div className="p-2 rounded bg-[#101417] border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-zinc-500 block">Active LUT:</span>
                      <span className="font-bold text-teal-300 text-xs">{activeFilter.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('Filters');
                        setIsLeftPanelOpen(true);
                      }}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  {/* Brightness */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-amber-400" /> Brightness</span>
                      <span className="font-mono text-zinc-200">{colorBrightness > 0 ? `+${colorBrightness}` : colorBrightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={colorBrightness}
                      onChange={(e) => setColorBrightness(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span className="flex items-center gap-1"><Contrast className="w-3 h-3 text-cyan-400" /> Contrast</span>
                      <span className="font-mono text-zinc-200">{colorContrast > 0 ? `+${colorContrast}` : colorContrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={colorContrast}
                      onChange={(e) => setColorContrast(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-pink-400" /> Saturation</span>
                      <span className="font-mono text-zinc-200">{colorSaturation > 0 ? `+${colorSaturation}` : colorSaturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={colorSaturation}
                      onChange={(e) => setColorSaturation(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                    />
                  </div>

                  {/* Exposure */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> Exposure</span>
                      <span className="font-mono text-zinc-200">{colorExposure > 0 ? `+${colorExposure}` : colorExposure}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={colorExposure}
                      onChange={(e) => setColorExposure(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                    />
                  </div>

                  {/* Temperature / Warmth */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-orange-400" /> Warmth / Temp</span>
                      <span className="font-mono text-zinc-200">{colorWarmth > 0 ? `+${colorWarmth}` : colorWarmth}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={colorWarmth}
                      onChange={(e) => setColorWarmth(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 accent-orange-400 cursor-pointer"
                    />
                  </div>

                  {/* Tint */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Tint (Hue Shift)</span>
                      <span className="font-mono text-zinc-200">{colorTint}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={colorTint}
                      onChange={(e) => setColorTint(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 accent-purple-400 cursor-pointer"
                    />
                  </div>

                  {/* Highlights */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Highlights</span>
                      <span className="font-mono text-zinc-200">{colorHighlights > 0 ? `+${colorHighlights}` : colorHighlights}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={colorHighlights}
                      onChange={(e) => setColorHighlights(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                    />
                  </div>

                  {/* Shadows */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Shadows</span>
                      <span className="font-mono text-zinc-200">{colorShadows > 0 ? `+${colorShadows}` : colorShadows}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={colorShadows}
                      onChange={(e) => setColorShadows(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                    />
                  </div>

                  {/* Vignette */}
                  <div className="space-y-1 border-t border-zinc-800 pt-2">
                    <div className="flex justify-between text-zinc-400">
                      <span>Cinematic Vignette</span>
                      <span className="font-mono text-zinc-200">{colorVignette}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={colorVignette}
                      onChange={(e) => setColorVignette(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                    />
                  </div>

                  {/* COLOR GRADING LUT PRESETS LIST */}
                  <div className="space-y-2 border-t border-zinc-800 pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-300 text-[10px] uppercase tracking-wider">
                        Color Grading Presets
                      </span>
                      <span className="text-[9px] text-zinc-400">Tap to apply LUT</span>
                    </div>
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2.5 top-2 text-zinc-500" />
                      <input
                        type="text"
                        value={colorGradeSearch}
                        onChange={(e) => {
                          setColorGradeSearch(e.target.value);
                          setColorGradeLimit(60);
                        }}
                        placeholder="Search color grades..."
                        className="w-full min-h-[32px] bg-[#0c1017] border border-[#242e3d] rounded-xl pl-7 pr-2 py-1 text-[10px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-400"
                      />
                    </div>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar pr-0.5">
                      {filteredColorGrades.slice(0, colorGradeLimit).map((cg) => {
                        const isCur = activeColorGradeId === cg.id;
                        return (
                          <div
                            key={cg.id}
                            onClick={() => {
                              setActiveColorGradeId(cg.id);
                              setColorBrightness(cg.brightness);
                              setColorContrast(cg.contrast);
                              setColorSaturation(cg.saturation);
                              setColorExposure(cg.exposure);
                              setColorWarmth(cg.warmth);
                              setColorTint(cg.tint);
                              setColorHighlights(cg.highlights);
                              setColorShadows(cg.shadows);
                              setColorVignette(cg.vignette);
                              logEditorTelemetry('edit_timeline');
                            }}
                            className={`p-2 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                              isCur
                                ? 'border-teal-400 bg-teal-950/40'
                                : 'border-[#242e3d] bg-[#141a24] hover:border-teal-500/60'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${cg.swatchGradient} shrink-0 border border-white/20`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-bold text-zinc-200 truncate">{cg.name}</span>
                                <span className="text-[8px] font-mono text-teal-400 shrink-0">{cg.category}</span>
                              </div>
                              <p className="text-[8.5px] text-zinc-400 truncate">{cg.description}</p>
                            </div>
                          </div>
                        );
                      })}
                      {filteredColorGrades.length > colorGradeLimit && (
                        <button
                          type="button"
                          onClick={() => setColorGradeLimit((n) => n + 150)}
                          className="w-full min-h-[34px] py-1.5 rounded-xl bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          + Load More Presets
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SPEED CONTROLS (User specifically requested speed control features) */}
              {activeInspectorTab === 'speed' && (
                <div className="space-y-3.5 text-[11px]">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                      <Gauge className="w-3.5 h-3.5 text-teal-400" />
                      <span>Speed Control &amp; Slow-Mo</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPlaybackSpeed(1.0);
                        setIsReversePlayback(false);
                      }}
                      className="text-[9px] text-teal-400 hover:text-teal-300 font-bold cursor-pointer"
                    >
                      Reset 1.0x
                    </button>
                  </div>

                  {/* Preset Speed Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-zinc-400 font-bold">Speed Presets:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setPlaybackSpeed(spd)}
                          className={`py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                            playbackSpeed === spd
                              ? 'bg-teal-400 text-black shadow'
                              : 'bg-[#101417] border border-zinc-800 text-zinc-300 hover:border-zinc-600'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Fine Speed Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Fine Speed Rate</span>
                      <span className="font-mono text-teal-300 font-bold text-xs">{playbackSpeed.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="8.0"
                      step="0.05"
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                    />
                  </div>

                  {/* Reverse Playback Checkbox */}
                  <div className="p-2.5 rounded-lg bg-[#101417] border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FastForward className="w-4 h-4 text-amber-400 rotate-180" />
                      <div>
                        <span className="font-bold text-zinc-200 block text-xs">Reverse Playback</span>
                        <span className="text-[9px] text-zinc-400">Play video backwards (റിവേഴ്സ് പ്ലേ)</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isReversePlayback}
                      onChange={(e) => setIsReversePlayback(e.target.checked)}
                      className="w-4 h-4 accent-teal-400 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: VIDEO TRANSFORM & COMPOSITING */}
              {activeInspectorTab === 'video' && (
                <div className="space-y-3.5">
                  {/* Cinematic Titles Edit */}
                  <div className="p-2.5 rounded bg-[#101417] border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Cinematic Titles</span>
                      <button
                        type="button"
                        onClick={() => setShowTitleOverlay(!showTitleOverlay)}
                        className="text-[9px] text-zinc-400 hover:text-white cursor-pointer"
                      >
                        {showTitleOverlay ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div>
                        <span className="text-zinc-500 text-[10px]">Main Title:</span>
                        <input
                          type="text"
                          value={movieTitle}
                          onChange={(e) => {
                            setMovieTitle(e.target.value);
                            saveCurrentProjectToStorage();
                          }}
                          className="w-full bg-[#181c22] border border-zinc-700 rounded px-2 py-0.5 text-white font-bold text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px]">Subtitle:</span>
                        <input
                          type="text"
                          value={subtitle}
                          onChange={(e) => {
                            setSubtitle(e.target.value);
                            saveCurrentProjectToStorage();
                          }}
                          className="w-full bg-[#181c22] border border-zinc-700 rounded px-2 py-0.5 text-zinc-300 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Transform Controls */}
                  <div className="space-y-2 border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                        <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
                        <span>Transform</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Scale</span>
                        <span className="font-mono text-zinc-200">{scaleX.toFixed(2)} %</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="250"
                        value={scaleX}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setScaleX(v);
                          if (linkScale) setScaleY(v);
                        }}
                        className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-zinc-400 text-[10px]">Pos X:</span>
                        <input
                          type="range"
                          min="-200"
                          max="200"
                          value={posX}
                          onChange={(e) => setPosX(Number(e.target.value))}
                          className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="text-zinc-400 text-[10px]">Pos Y:</span>
                        <input
                          type="range"
                          min="-200"
                          max="200"
                          value={posY}
                          onChange={(e) => setPosY(Number(e.target.value))}
                          className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-zinc-400">Rotate &amp; Flip:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRotationDeg((r) => (r + 90) % 360)}
                          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px]"
                        >
                          +90°
                        </button>
                        <button
                          type="button"
                          onClick={() => setFlipH(!flipH)}
                          className={`px-2 py-0.5 rounded font-mono text-[10px] ${flipH ? 'bg-teal-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}
                        >
                          Flip H
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Compositing */}
                  <div className="space-y-2 border-b border-zinc-800/80 pb-3 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                      <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
                      <span>Compositing</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Blend Mode</span>
                      <select
                        value={blendMode}
                        onChange={(e) => setBlendMode(e.target.value)}
                        className="bg-[#101417] border border-zinc-700 rounded px-2 py-0.5 text-zinc-200 text-[10px]"
                      >
                        <option>Normal</option>
                        <option>Multiply</option>
                        <option>Screen</option>
                        <option>Overlay</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Opacity</span>
                        <span className="font-mono text-zinc-200">{opacity.toFixed(2)} %</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-700 accent-teal-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: AUDIO INSPECTOR */}
              {activeInspectorTab === 'audio' && (
                <div className="space-y-3.5 text-[11px]">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Audio Inspector</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#101417] border border-zinc-800 space-y-2">
                    <span className="text-[10px] text-zinc-400 font-bold">Soundtrack:</span>
                    <span className="font-bold text-emerald-300 block text-xs">{activeAudio.title}</span>
                    <span className="text-[9px] text-zinc-500 font-mono block">Duration: {activeAudio.duration}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Track Volume</span>
                      <span className="font-mono text-zinc-200">{isMuted ? 'Muted' : `${volume}%`}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-full py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      isMuted ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isMuted ? 'Unmute Audio' : 'Mute Audio Track'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
            </div>
          </div>
        )}

      {/* =========================================================================
          3. LOWER SINGLE ACTIVE CATEGORY TIMELINE (FOCUSED — NEVER ALL 14 STACKED)
          ========================================================================= */}
      <div className="flex-1 min-h-0 bg-[#090c11] flex flex-col overflow-hidden">
        {/* Centered Red Capsule Timecode Strip + Single Active Category Indicator */}
        <div className="h-6 px-2.5 sm:px-3.5 bg-[#0a0e14] border-b border-[#1c2330] grid grid-cols-3 items-center shrink-0 select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="font-mono font-bold text-[10px] truncate"
              style={{ color: activeWheelCategory.accentHex }}
            >
              T{activeWheelCategory.trackNumber} · {activeWheelCategory.trackName}
            </span>
          </div>
          <div className="flex justify-center">
            <span
              ref={redBadgeTimeRef}
              className="px-2.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-black text-[10.5px] shadow-[0_0_10px_rgba(244,63,94,0.6)] tracking-tight tabular-nums"
            >
              {formatMsTimecode(currentTimeSec)}
            </span>
          </div>
          <div className="flex justify-end">
            <span className="text-zinc-300 font-mono font-bold text-[10px] tabular-nums">
              {formatMsTimecode(totalDuration)}
            </span>
          </div>
        </div>

        {/* Focused Timeline Action Toolbar */}
        <div className="h-9 border-b border-[#1f2937] px-2 sm:px-3 flex items-center justify-between bg-[#10151d] text-zinc-400 shrink-0 overflow-x-auto no-scrollbar gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Split Scissors Button */}
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                handleSplitClipAtPlayhead();
              }}
              className="min-h-[28px] px-2 py-0.5 rounded-lg bg-rose-500/15 hover:bg-rose-500 hover:text-white text-rose-300 border border-rose-500/40 flex items-center gap-1 cursor-pointer font-bold text-[10.5px] transition-colors whitespace-nowrap"
              title="Split Clip at Playhead"
            >
              <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Split</span>
            </button>

            {/* Range Cut Controls */}
            {cutRangeStartSec === null ? (
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCutRangeStartSec(currentTimeRef.current);
                }}
                disabled={timelineClips.length === 0}
                className="min-h-[28px] px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-400 hover:text-black disabled:opacity-40 text-amber-300 border border-amber-500/40 flex items-center gap-1 cursor-pointer font-bold text-[10.5px] transition-colors whitespace-nowrap"
                title="Mark Cut Start, drag red line right while watching video, then cut"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Mark Cut</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-rose-950/70 border border-rose-500/60 rounded-lg px-2 py-0.5">
                <span className="text-[10px] font-mono text-amber-300 font-bold tabular-nums">
                  {Math.min(cutRangeStartSec, currentTimeSec).toFixed(1)}s–{Math.max(cutRangeStartSec, currentTimeSec).toFixed(1)}s
                </span>
                <button
                  type="button"
                  onClick={() => handleRangeCutAction('remove_middle')}
                  className="min-h-[24px] px-2 py-0.5 rounded bg-rose-500 hover:bg-rose-400 text-white font-bold text-[10px] cursor-pointer"
                >
                  ✂ Cut Out
                </button>
                <button
                  type="button"
                  onClick={() => handleRangeCutAction('split_both')}
                  className="min-h-[24px] px-2 py-0.5 rounded bg-teal-400 hover:bg-teal-300 text-black font-bold text-[10px] cursor-pointer"
                >
                  Split A-B
                </button>
                <button
                  type="button"
                  onClick={() => handleRangeCutAction('keep_only')}
                  className="min-h-[24px] px-2 py-0.5 rounded bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-[10px] cursor-pointer"
                >
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => setCutRangeStartSec(null)}
                  className="p-0.5 text-zinc-400 hover:text-white cursor-pointer"
                  title="Cancel Mark Cut"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Delete Active Category / Selected Item */}
            <button
              type="button"
              onClick={() => {
                if (activeWheelCategory.id === 'titles' && showTitleOverlay) {
                  setShowTitleOverlay(false);
                  setMovieTitle('');
                  setSubtitle('');
                  return;
                }
                if (activeWheelCategory.id === 'filters' && activeFilter.id !== 'f_raw') {
                  setActiveFilter(FILTERS_LIST[0]);
                  return;
                }
                if (activeWheelCategory.id === 'music' && activeAudio.id !== 'aud_none') {
                  setActiveAudio(AUDIO_LIST[0]);
                  return;
                }
                if (activeWheelCategory.id === 'dialogues' && activeDialogue) {
                  setActiveDialogue(null);
                  return;
                }
                if (activeWheelCategory.id === 'stickers' && activeStickers.length > 0) {
                  if (selectedStickerLayerId) {
                    setActiveStickers((prev) => prev.filter((s) => s.id !== selectedStickerLayerId));
                    setSelectedStickerLayerId(null);
                  } else {
                    setActiveStickers([]);
                  }
                  return;
                }
                if (activeWheelCategory.id === 'vfx' && vfxLayers.length > 0) {
                  if (selectedVfxLayerId) {
                    setVfxLayers((prev) => prev.filter((v) => v.id !== selectedVfxLayerId));
                    setSelectedVfxLayerId(null);
                  } else {
                    setVfxLayers([]);
                  }
                  return;
                }
                if (activeWheelCategory.id === 'card' && trailerCardLayers.length > 0) {
                  if (selectedTrailerCardId) {
                    setTrailerCardLayers((prev) => prev.filter((c) => c.id !== selectedTrailerCardId));
                    setSelectedTrailerCardId(null);
                  } else {
                    setTrailerCardLayers([]);
                  }
                  return;
                }
                if (activeWheelCategory.id === 'chroma' && chromaConfig.enabled) {
                  setChromaConfig(DEFAULT_CHROMA_KEY_CONFIG);
                  return;
                }
                if (activeWheelCategory.id === 'split' && splitScreenConfig.enabled) {
                  setSplitScreenConfig(DEFAULT_SPLIT_SCREEN_CONFIG);
                  return;
                }
                if (activeWheelCategory.id === 'transitions') {
                  setClipTransitions({});
                  setClipTransitionObjects({});
                  return;
                }
                if (activeWheelCategory.id === 'effects') {
                  setActiveEffect(null);
                  return;
                }
                if (activeWheelCategory.id === 'templates') {
                  setActiveTemplate(null);
                  return;
                }
                if (timelineClips.length <= 1) {
                  setTimelineClips([]);
                  saveCurrentProjectToStorage([]);
                  return;
                }
                const updated = timelineClips.filter((_, idx) => idx !== activeClipIndex);
                setTimelineClips(updated);
                setActiveClipIndex(0);
                saveCurrentProjectToStorage(updated);
              }}
              className="min-h-[28px] min-w-[28px] p-1 rounded-lg hover:bg-[#18202c] hover:text-rose-400 flex items-center justify-center cursor-pointer transition-colors"
              title={`Delete / Clear ${activeWheelCategory.trackName}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleDuplicateClipAt(activeClipIndex)}
              className="min-h-[28px] min-w-[28px] p-1 rounded-lg hover:bg-[#18202c] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Duplicate Clip"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setRotationDeg((r) => (r + 90) % 360)}
              className="min-h-[28px] min-w-[28px] p-1 rounded-lg hover:bg-[#18202c] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-[#1f2937] mx-0.5" />

            <button
              type="button"
              onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
              className="min-h-[28px] px-2.5 py-0.5 rounded-lg bg-[#18202c] hover:bg-teal-400 hover:text-black border border-[#2b3648] text-teal-300 font-bold text-[10.5px] flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{activeWheelCategory.shortLabel} Tools</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-zinc-400 font-mono">Zoom</span>
            <input
              type="range"
              min="0.6"
              max="3.5"
              step="0.1"
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(Number(e.target.value))}
              className="w-16 sm:w-20 h-1.5 accent-teal-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Single Active Category Track Header + Timeline Sequence Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left Focused Track Header (Only the 1 Selected Category) */}
          <div
            ref={trackHeadersRef}
            className="w-[96px] sm:w-36 bg-[#0a0e14] border-r border-[#1f2937] flex flex-col shrink-0 text-[10px] font-mono text-zinc-300 select-none"
          >
            <div className="h-6 border-b border-[#1f2937] px-2 flex items-center justify-between bg-[#10151d] shrink-0">
              <span className="font-bold text-zinc-400 text-[9px] truncate">ACTIVE TRACK</span>
              <span className="text-[9px] font-bold text-teal-400 tabular-nums">
                {activeWheelCategory.trackNumber}/14
              </span>
            </div>

            {(() => {
              const ActiveLaneIcon = activeWheelCategory.icon;
              return (
                <div className="flex-1 min-h-0 px-2 py-2 flex flex-col justify-between bg-[#0e131b]">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <ActiveLaneIcon
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: activeWheelCategory.accentHex }}
                    />
                    <div className="min-w-0">
                      <span
                        className="font-extrabold text-[11px] block truncate"
                        style={{ color: activeWheelCategory.accentHex }}
                      >
                        {activeWheelCategory.trackNumber}. {activeWheelCategory.trackName}
                      </span>
                      <span className="text-[9px] text-zinc-400 block truncate">
                        {activeWheelCategory.id === 'video'
                          ? `${timelineClips.length} Clips`
                          : activeWheelCategory.id === 'stickers'
                          ? `${activeStickers.length} Layers`
                          : activeWheelCategory.id === 'vfx'
                          ? `${vfxLayers.length} Layers`
                          : activeWheelCategory.id === 'card'
                          ? `${trailerCardLayers.length} Cards`
                          : activeWheelCategory.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-1">
                    {activeWheelCategory.id === 'video' && (
                      <button
                        type="button"
                        onClick={() => setIsVideoTrackVisible(!isVideoTrackVisible)}
                        className="min-h-[26px] px-1.5 rounded bg-[#161c26] hover:bg-[#202836] border border-[#263040] text-zinc-200 flex items-center gap-1 cursor-pointer text-[9px]"
                        title="Toggle Video Visibility"
                      >
                        {isVideoTrackVisible ? (
                          <Eye className="w-3 h-3 text-teal-400" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-zinc-500" />
                        )}
                        <span>{isVideoTrackVisible ? 'Show' : 'Hide'}</span>
                      </button>
                    )}
                    {activeWheelCategory.id === 'audio' && (
                      <button
                        type="button"
                        onClick={() => setIsAudioTrackMuted(!isAudioTrackMuted)}
                        className={`min-h-[26px] px-1.5 rounded border flex items-center gap-1 cursor-pointer text-[9px] ${
                          isAudioTrackMuted
                            ? 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                            : 'bg-[#161c26] border-[#263040] text-emerald-300'
                        }`}
                        title={isAudioTrackMuted ? 'Unmute Audio' : 'Mute Audio'}
                      >
                        {isAudioTrackMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        <span>{isAudioTrackMuted ? 'Muted' : 'Sound'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="min-h-[26px] px-1.5 rounded bg-teal-500/15 hover:bg-teal-400 hover:text-black border border-teal-500/40 text-teal-300 font-bold text-[9px] cursor-pointer ml-auto"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right Focused Timeline Sequence Body (Ruler + Red Playhead + ONLY Active Category Track) */}
          <div
            ref={timelineContainerRef}
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('button') || target.closest('[data-clip-card="true"]')) return;
              isScrubbingRef.current = true;
              setIsScrubbingTimeline(true);
              setIsPlaying(false);
              try {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              } catch {}
              seekFromClientX(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!isScrubbingRef.current) return;
              seekFromClientX(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              if (!isScrubbingRef.current) return;
              isScrubbingRef.current = false;
              setIsScrubbingTimeline(false);
              try {
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              } catch {}
            }}
            onPointerCancel={() => {
              isScrubbingRef.current = false;
              setIsScrubbingTimeline(false);
            }}
            className="flex-1 min-h-0 flex flex-col overflow-x-auto overflow-y-hidden no-scrollbar relative bg-[#090b0e] cursor-pointer"
          >
            {/* Time Ruler (Drag left/right with finger/mouse to scrub video live) */}
            <div className="h-6 border-b border-[#21262d] flex items-center px-2 text-[9px] font-mono text-zinc-400 bg-[#0d1014] select-none shrink-0 min-w-max touch-none cursor-ew-resize tabular-nums">
              {Array.from({ length: Math.max(12, Math.ceil(((totalDuration || 10) + 10) / 5)) }, (_, i) => {
                const sec = i * 5;
                const mm = String(Math.floor(sec / 60)).padStart(2, '0');
                const ss = String(sec % 60).padStart(2, '0');
                return (
                  <div key={sec} style={{ width: `${5 * pxPerSec}px` }} className="border-l border-zinc-800 pl-1 shrink-0">
                    00:{mm}:{ss}
                  </div>
                );
              })}
            </div>

            {/* Highlighted Cut Range Overlay [Mark A -> Red Line] */}
            {cutRangeStartSec !== null && (
              <div
                className="absolute top-6 bottom-0 bg-rose-500/20 border-x-2 border-amber-400/90 z-10 pointer-events-none"
                style={{
                  left: `${8 + Math.min(cutRangeStartSec, currentTimeSec) * pxPerSec}px`,
                  width: `${Math.max(2, Math.abs(currentTimeSec - cutRangeStartSec) * pxPerSec)}px`,
                }}
              >
                <div className="bg-amber-400 text-black text-[8px] font-black px-1 py-0.2 rounded-br inline-block">
                  CUT {Math.abs(currentTimeSec - cutRangeStartSec).toFixed(1)}s
                </div>
              </div>
            )}

            {/* DRAGGABLE Red Vertical Playhead Line WITH Central Scissors Cut */}
            <div
              ref={playheadLineRef}
              onPointerDown={(e) => {
                e.stopPropagation();
                isScrubbingRef.current = true;
                setIsScrubbingTimeline(true);
                setIsPlaying(false);
                try {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                } catch {}
                seekFromClientX(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (!isScrubbingRef.current) return;
                e.stopPropagation();
                seekFromClientX(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                isScrubbingRef.current = false;
                setIsScrubbingTimeline(false);
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                } catch {}
              }}
              onPointerCancel={() => {
                isScrubbingRef.current = false;
                setIsScrubbingTimeline(false);
              }}
              className="absolute top-0 bottom-0 w-9 -translate-x-1/2 z-30 touch-none cursor-ew-resize flex flex-col items-center group"
              style={{
                left: `${8 + currentTimeSec * pxPerSec}px`,
              }}
              title="Drag left or right to scrub video live & cut"
            >
              <div className="w-[2.5px] h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] pointer-events-none" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                <div className="w-4 h-3.5 bg-rose-500 rounded-b-md border border-white/80 shadow-md flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                {isScrubbingTimeline && (
                  <div className="mt-0.5 px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono font-bold text-[9px] shadow-lg whitespace-nowrap border border-white/60 tabular-nums">
                    {currentTimeSec.toFixed(1)}s
                  </div>
                )}
              </div>

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  handleSplitClipAtPlayhead();
                }}
                className="absolute top-[52%] -translate-y-1/2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.9)] flex items-center justify-center cursor-pointer z-40 border-2 border-white transition-transform hover:scale-110 active:scale-95"
                title="Split Video at Red Line"
              >
                <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            {/* SINGLE ACTIVE CATEGORY TRACK CONTENT (Clean, spacious, no 14-row clutter) */}
            <div className="flex-1 min-h-0 flex flex-col min-w-max justify-between">
              <div className="flex-1 min-h-[64px] relative px-2 flex items-center gap-2">
                {/* 1. TITLE TRACK */}
                {activeWheelCategory.id === 'titles' && (
                  showTitleOverlay && movieTitle ? (
                    <div className="flex items-center gap-2">
                      <div
                        data-clip-card="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFeatureType('title');
                          setActiveInspectorTab('adjust');
                          setIsRightPanelOpen(true);
                        }}
                        className="h-12 rounded-xl px-3 flex items-center justify-between text-xs font-bold cursor-pointer bg-amber-500/25 border-2 border-amber-400 text-amber-100 shadow-md"
                        style={{
                          marginLeft: `${Math.max(0, titleStartSec * pxPerSec)}px`,
                          width: `${Math.max(120, titleDurationSec * pxPerSec)}px`,
                        }}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Type className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="truncate">{movieTitle}</span>
                        </div>
                        <span className="text-[9.5px] font-mono text-amber-300 shrink-0 ml-2 tabular-nums">
                          {titleStartSec.toFixed(1)}s–{(titleStartSec + titleDurationSec).toFixed(1)}s
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-[#141a24] border border-[#263042] rounded-lg px-1.5 py-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setTitleStartSec((s) => Math.max(0, Number((s - 0.5).toFixed(1))))}
                          className="px-1.5 py-0.5 rounded bg-[#1d2533] hover:bg-amber-400 hover:text-black font-bold cursor-pointer"
                        >
                          ◀ -0.5s
                        </button>
                        <button
                          type="button"
                          onClick={() => setTitleStartSec((s) => Number((s + 0.5).toFixed(1)))}
                          className="px-1.5 py-0.5 rounded bg-[#1d2533] hover:bg-amber-400 hover:text-black font-bold cursor-pointer"
                        >
                          +0.5s ▶
                        </button>
                        <button
                          type="button"
                          onClick={() => setTitleDurationSec((d) => Math.max(1, Number((d - 1).toFixed(1))))}
                          className="px-1.5 py-0.5 rounded bg-[#1d2533] hover:bg-amber-400 hover:text-black font-bold cursor-pointer"
                        >
                          Dur -1s
                        </button>
                        <button
                          type="button"
                          onClick={() => setTitleDurationSec((d) => Number((d + 1).toFixed(1)))}
                          className="px-1.5 py-0.5 rounded bg-[#1d2533] hover:bg-amber-400 hover:text-black font-bold cursor-pointer"
                        >
                          Dur +1s
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowTitleOverlay(false);
                            setMovieTitle('');
                            setSubtitle('');
                          }}
                          className="p-1 rounded hover:bg-rose-600 text-rose-300 hover:text-white cursor-pointer"
                          title="Delete Title"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectWheelCategory(activeWheelCategory, true);
                      }}
                      className="h-11 px-4 rounded-xl border border-dashed border-amber-500/50 bg-amber-950/20 text-xs text-amber-200 hover:border-amber-400 cursor-pointer flex items-center gap-2 font-bold"
                    >
                      <Type className="w-4 h-4 text-amber-400" />
                      <span>+ Add Cinematic Title &amp; Text</span>
                    </button>
                  )
                )}

                {/* 2. VIDEO 1 / MEDIA TRACK */}
                {activeWheelCategory.id === 'video' && (
                  <>
                    {timelineClips.length === 0 ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectWheelCategory(activeWheelCategory, true);
                        }}
                        className="h-14 px-4 rounded-xl border border-dashed border-teal-500/50 bg-teal-950/20 flex items-center gap-2 text-teal-300 hover:text-white cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-teal-400" />
                        <span className="font-semibold text-xs">+ ഗാലറി മീഡിയ പൂളിൽ നിന്ന് ക്ലിപ്പ് ചേർക്കുക</span>
                      </div>
                    ) : (
                      timelineClips.map((clip, idx) => {
                        const isCardActive = activeClipIndex === idx && selectedFeatureType === 'clip';
                        const isDragOver = dragOverClipIndex === idx;
                        return (
                          <React.Fragment key={clip.id}>
                            <div
                              data-clip-card="true"
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', String(idx));
                                setDraggedClipIndex(idx);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverClipIndex(idx);
                              }}
                              onDragLeave={() => {
                                if (dragOverClipIndex === idx) setDragOverClipIndex(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleDropClipReorder(idx, e);
                              }}
                              onPointerDown={(e) => {
                                if ((e.target as HTMLElement).closest('button')) return;
                                e.stopPropagation();
                                setActiveClipIndex(idx);
                                setSelectedFeatureType('clip');
                                setIsPlaying(false);
                                isScrubbingRef.current = true;
                                setIsScrubbingTimeline(true);
                                try {
                                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                                } catch {}
                                seekFromClientX(e.clientX, e.clientY);
                              }}
                              onPointerMove={(e) => {
                                if (!isScrubbingRef.current) return;
                                e.stopPropagation();
                                seekFromClientX(e.clientX, e.clientY);
                              }}
                              onPointerUp={(e) => {
                                if (!isScrubbingRef.current) return;
                                e.stopPropagation();
                                isScrubbingRef.current = false;
                                setIsScrubbingTimeline(false);
                                try {
                                  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                                } catch {}
                              }}
                              onPointerCancel={() => {
                                isScrubbingRef.current = false;
                                setIsScrubbingTimeline(false);
                              }}
                              className={`h-14 rounded-xl border flex items-center p-1.5 gap-2 cursor-pointer transition-all relative overflow-hidden group shrink-0 touch-none ${
                                isDragOver
                                  ? 'border-cyan-400 ring-2 ring-cyan-400 bg-cyan-950/80 scale-105 z-20'
                                  : isCardActive
                                  ? 'bg-teal-950/80 border-teal-400 ring-2 ring-teal-400/60 shadow-lg z-10'
                                  : 'bg-zinc-900/90 border-zinc-700/80 hover:border-zinc-500'
                              }`}
                              style={{ width: `${Math.max(84, clip.durationSec * pxPerSec)}px` }}
                            >
                              <div className="w-10 h-10 rounded-lg bg-black shrink-0 overflow-hidden relative border border-white/10">
                                {clip.type === 'video' && !clip.thumbnailUrl ? (
                                  <video src={clip.url} className="w-full h-full object-cover" muted playsInline />
                                ) : clip.thumbnailUrl || clip.url ? (
                                  <img src={clip.thumbnailUrl || clip.url} alt={clip.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                    <Film className="w-3.5 h-3.5 text-zinc-500" />
                                  </div>
                                )}
                              </div>
                              <div className="truncate text-left flex-1 min-w-0">
                                <span className="font-bold text-[10px] text-zinc-100 block truncate">{clip.title}</span>
                                <span className="text-[8.5px] font-mono text-zinc-400 tabular-nums">
                                  {clip.type === 'video' ? '🎬' : '📷'} {clip.durationSec}s
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => handleMoveClip(idx, 'left', e)}
                                  className="w-4 h-4 rounded bg-[#18202c] hover:bg-teal-400 hover:text-black disabled:opacity-30 flex items-center justify-center text-[9px] text-zinc-300 cursor-pointer"
                                  title="Move Left"
                                >
                                  ◀
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === timelineClips.length - 1}
                                  onClick={(e) => handleMoveClip(idx, 'right', e)}
                                  className="w-4 h-4 rounded bg-[#18202c] hover:bg-teal-400 hover:text-black disabled:opacity-30 flex items-center justify-center text-[9px] text-zinc-300 cursor-pointer"
                                  title="Move Right"
                                >
                                  ▶
                                </button>
                              </div>
                            </div>
                            {idx < timelineClips.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  syncWheelToTrack('transitions', true);
                                  setActiveTransitionBetween(idx);
                                }}
                                className={`px-1.5 py-1 rounded-lg border text-[8px] font-mono cursor-pointer shrink-0 ${
                                  clipTransitions[idx]
                                    ? 'bg-amber-500/90 border-amber-300 text-black font-bold'
                                    : 'bg-zinc-800 hover:bg-teal-400 hover:text-black border-zinc-600 text-zinc-200'
                                }`}
                                title={`Transition: ${clipTransitions[idx] || 'Select Transition'}`}
                              >
                                <SlidersHorizontal className="w-3 h-3" />
                              </button>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectWheelCategory(activeWheelCategory, true);
                      }}
                      className="h-14 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-dashed border-zinc-600 text-teal-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Clip</span>
                    </button>
                  </>
                )}

                {/* 3. AUDIO 1 (CLIP SOUND) TRACK */}
                {activeWheelCategory.id === 'audio' && (
                  timelineClips.length === 0 ? (
                    <span className="text-xs text-zinc-400 font-mono">Add a video clip first to manage its extracted audio track</span>
                  ) : (
                    timelineClips.map((clip, idx) => (
                      <div
                        key={`aud_clip_${clip.id}_${idx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFeatureType('audio');
                          setActiveInspectorTab('audio');
                          setIsRightPanelOpen(true);
                        }}
                        className={`h-12 rounded-xl border px-3 flex items-center justify-between cursor-pointer transition-colors shrink-0 ${
                          isAudioTrackMuted
                            ? 'bg-zinc-900 border-zinc-700 text-zinc-500 line-through'
                            : 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 hover:border-emerald-300'
                        }`}
                        style={{ width: `${Math.max(100, clip.durationSec * pxPerSec)}px` }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-[11px] font-bold truncate">
                            {clip.title} {isAudioTrackMuted && '(Muted)'}
                          </span>
                        </div>
                        <span className="text-[9.5px] font-mono text-emerald-300/80 ml-2 shrink-0 tabular-nums">
                          {clip.durationSec}s
                        </span>
                      </div>
                    ))
                  )
                )}

                {/* 4. FILTERS TRACK */}
                {activeWheelCategory.id === 'filters' && (
                  activeFilter && activeFilter.id !== 'f_raw' ? (
                    <div className="flex items-center gap-2">
                      <div
                        onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                        className="h-12 rounded-xl border border-cyan-400/80 bg-cyan-950/70 text-cyan-100 px-3 flex items-center justify-between cursor-pointer hover:border-cyan-300 shadow-md"
                        style={{ width: `${Math.max(160, totalDuration * pxPerSec)}px` }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Palette className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="text-xs font-bold truncate">Filter: {activeFilter.name}</span>
                          <span className="text-[9px] font-mono bg-cyan-900/80 text-cyan-300 px-1.5 py-0.5 rounded shrink-0">
                            {activeFilter.category}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFilter(FILTERS_LIST[0]);
                          }}
                          className="p-1.5 rounded hover:bg-rose-600 text-rose-300 hover:text-white ml-2 shrink-0 cursor-pointer"
                          title="Remove Filter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-11 px-4 rounded-xl border border-dashed border-cyan-500/50 bg-cyan-950/20 text-xs text-cyan-200 hover:border-cyan-400 cursor-pointer flex items-center gap-2 font-bold"
                    >
                      <Palette className="w-4 h-4 text-cyan-400" />
                      <span>+ Choose Cinematic Filter (1200+ Presets)</span>
                    </button>
                  )
                )}

                {/* 5. MUSIC TRACK */}
                {activeWheelCategory.id === 'music' && (
                  activeAudio && activeAudio.id !== 'aud_none' ? (
                    <div className="flex items-center gap-2">
                      <div
                        onClick={() => {
                          setSelectedFeatureType('audio');
                          setActiveInspectorTab('audio');
                          setIsRightPanelOpen(true);
                        }}
                        className="h-12 rounded-xl border border-teal-500/70 bg-teal-950/70 text-teal-100 px-3 flex items-center justify-between cursor-pointer hover:border-teal-300 shadow-md"
                        style={{ width: `${Math.max(160, totalDuration * pxPerSec)}px` }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Music className="w-4 h-4 text-teal-300 shrink-0" />
                          <span className="text-xs font-bold truncate">{activeAudio.title}</span>
                          <span className="text-[9.5px] font-mono text-teal-300/80 shrink-0">{activeAudio.duration}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAudio(AUDIO_LIST[0]);
                          }}
                          className="p-1.5 rounded hover:bg-rose-600 text-rose-300 hover:text-white ml-2 shrink-0 cursor-pointer"
                          title="Remove Music"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => userAudioInputRef.current?.click()}
                        className="h-11 px-3 rounded-xl bg-[#161e2a] hover:bg-teal-400 hover:text-black border border-[#2a3648] text-teal-300 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pick Device Audio</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                        className="h-11 px-4 rounded-xl border border-dashed border-teal-500/50 bg-teal-950/20 text-xs text-teal-200 hover:border-teal-400 cursor-pointer flex items-center gap-2 font-bold"
                      >
                        <Music className="w-4 h-4 text-teal-300" />
                        <span>+ Add Background Music Track</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => userAudioInputRef.current?.click()}
                        className="h-11 px-3 rounded-xl bg-teal-500/20 hover:bg-teal-400 hover:text-black border border-teal-500/40 text-teal-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Pick Local Audio</span>
                      </button>
                    </div>
                  )
                )}

                {/* 6. DIALOGUES / REC TRACK */}
                {activeWheelCategory.id === 'dialogues' && (
                  activeDialogue ? (
                    <div className="flex items-center gap-2">
                      <div
                        onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                        className="h-12 rounded-xl border border-amber-500/70 bg-amber-950/70 text-amber-100 px-3 flex items-center justify-between cursor-pointer hover:border-amber-300 shadow-md"
                        style={{ width: `${Math.max(140, (activeDialogue.durationSec || 5) * pxPerSec)}px` }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Mic className="w-4 h-4 text-amber-300 shrink-0" />
                          <span className="text-xs font-bold truncate">
                            {activeDialogue.speaker}: {activeDialogue.text}
                          </span>
                        </div>
                        <span className="text-[9.5px] font-mono text-amber-300 ml-2 shrink-0 tabular-nums">
                          {activeDialogue.durationSec}s
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-[#141a24] border border-[#263042] rounded-lg px-1.5 py-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDialogue((prev) =>
                              prev ? { ...prev, durationSec: Math.max(1, prev.durationSec - 1) } : prev
                            )
                          }
                          className="px-1.5 py-0.5 rounded bg-[#1d2533] hover:bg-amber-400 hover:text-black font-bold cursor-pointer"
                        >
                          -1s
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDialogue((prev) =>
                              prev ? { ...prev, durationSec: prev.durationSec + 1 } : prev
                            )
                          }
                          className="px-1.5 py-0.5 rounded bg-[#1d2533] hover:bg-amber-400 hover:text-black font-bold cursor-pointer"
                        >
                          +1s
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveDialogue(null)}
                          className="p-1 rounded hover:bg-rose-600 text-rose-300 hover:text-white cursor-pointer"
                          title="Delete Dialogue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDialogue({
                          id: `dlg_${Date.now()}`,
                          speaker: 'Hero',
                          text: 'Mass Cinema Dialogue Line',
                          durationSec: 6,
                        });
                      }}
                      className="h-11 px-4 rounded-xl border border-dashed border-amber-500/50 bg-amber-950/20 text-xs text-amber-200 hover:border-amber-400 cursor-pointer flex items-center gap-2 font-bold"
                    >
                      <Mic className="w-4 h-4 text-amber-300" />
                      <span>+ Add Dialogue / Voiceover</span>
                    </button>
                  )
                )}

                {/* 7. EMOJI / STICKERS TRACK */}
                {activeWheelCategory.id === 'stickers' && (
                  activeStickers.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-11 px-4 rounded-xl border border-dashed border-cyan-500/50 bg-cyan-950/20 text-xs text-cyan-200 hover:border-cyan-400 cursor-pointer flex items-center gap-2 font-bold"
                    >
                      <Smile className="w-4 h-4 text-cyan-400" />
                      <span>+ Add Emoji &amp; Stickers</span>
                    </button>
                  ) : (
                    activeStickers.map((stkLayer) => {
                      const isSel = selectedFeatureType === 'sticker' && selectedStickerLayerId === stkLayer.id;
                      return (
                        <div
                          key={stkLayer.id}
                          data-clip-card="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStickerLayerId(stkLayer.id);
                            setSelectedVfxLayerId(null);
                            setSelectedFeatureType('sticker');
                            setActiveInspectorTab('adjust');
                            setIsRightPanelOpen(true);
                            seekToTime(stkLayer.startTimeSec + stkLayer.durationSec * 0.25);
                          }}
                          style={{
                            marginLeft: `${Math.max(0, stkLayer.startTimeSec * pxPerSec)}px`,
                            width: `${Math.max(100, stkLayer.durationSec * pxPerSec)}px`,
                          }}
                          className={`h-12 rounded-xl px-2.5 flex items-center justify-between text-[11px] font-bold cursor-pointer shrink-0 transition-all ${
                            isSel
                              ? 'bg-cyan-500/35 border-2 border-cyan-400 text-cyan-100 ring-1 ring-cyan-400/50 z-10'
                              : 'bg-cyan-950/70 border border-cyan-500/60 text-cyan-200 hover:border-cyan-300'
                          }`}
                        >
                          <span className="truncate">
                            {stkLayer.sticker.emoji} {stkLayer.sticker.badgeText}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStickers((prev) => prev.filter((s) => s.id !== stkLayer.id));
                              if (selectedStickerLayerId === stkLayer.id) setSelectedStickerLayerId(null);
                            }}
                            className="p-1 rounded hover:bg-rose-600 text-rose-300 hover:text-white ml-1.5 shrink-0 cursor-pointer"
                            title="Delete Sticker"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )
                )}

                {/* 8. VFX TRACK */}
                {activeWheelCategory.id === 'vfx' && (
                  vfxLayers.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-11 px-4 rounded-xl border border-dashed border-rose-500/50 bg-rose-950/20 text-xs text-rose-200 hover:border-rose-400 cursor-pointer flex items-center gap-2 font-bold"
                    >
                      <Flame className="w-4 h-4 text-rose-400" />
                      <span>+ Add Action VFX Layer (Fire, Gun, Smoke)</span>
                    </button>
                  ) : (
                    vfxLayers.map((vLayer) => {
                      const isSel = selectedFeatureType === 'vfx' && selectedVfxLayerId === vLayer.id;
                      return (
                        <div
                          key={vLayer.id}
                          data-clip-card="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVfxLayerId(vLayer.id);
                            setSelectedStickerLayerId(null);
                            setSelectedFeatureType('vfx');
                            setActiveInspectorTab('adjust');
                            setIsRightPanelOpen(true);
                            seekToTime(vLayer.startTimeSec + vLayer.durationSec * 0.55);
                          }}
                          style={{
                            marginLeft: `${Math.max(0, vLayer.startTimeSec * pxPerSec)}px`,
                            width: `${Math.max(100, vLayer.durationSec * pxPerSec)}px`,
                          }}
                          className={`h-12 rounded-xl px-2.5 flex items-center justify-between text-[11px] font-bold cursor-pointer shrink-0 transition-all ${
                            isSel
                              ? 'bg-rose-600/45 border-2 border-rose-400 text-white ring-1 ring-rose-400/60 z-10'
                              : 'bg-rose-950/75 border border-rose-500/60 text-rose-200 hover:border-rose-300'
                          }`}
                        >
                          <span className="truncate">
                            {vLayer.vfx.emoji} {vLayer.vfx.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVfxLayers((prev) => prev.filter((v) => v.id !== vLayer.id));
                              if (selectedVfxLayerId === vLayer.id) setSelectedVfxLayerId(null);
                            }}
                            className="p-1 rounded hover:bg-rose-600 text-rose-200 hover:text-white ml-1.5 shrink-0 cursor-pointer"
                            title="Delete VFX"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )
                )}

                {/* 9. TRAILER CARD TRACK */}
                {activeWheelCategory.id === 'card' && (
                  trailerCardLayers.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-11 px-4 rounded-xl border border-dashed border-amber-500/50 bg-amber-950/20 text-xs text-amber-200 hover:border-amber-400 cursor-pointer flex items-center gap-2 font-bold"
                    >
                      <Clapperboard className="w-4 h-4 text-amber-400" />
                      <span>+ Add Trailer Poster Card</span>
                    </button>
                  ) : (
                    trailerCardLayers.map((cLayer) => {
                      const isSel = selectedFeatureType === 'trailer_card' && selectedTrailerCardId === cLayer.id;
                      return (
                        <div
                          key={cLayer.id}
                          data-clip-card="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrailerCardId(cLayer.id);
                            setSelectedVfxLayerId(null);
                            setSelectedStickerLayerId(null);
                            setSelectedFeatureType('trailer_card');
                            setActiveInspectorTab('adjust');
                            setIsRightPanelOpen(true);
                            seekToTime(cLayer.startTimeSec + cLayer.durationSec * 0.35);
                          }}
                          style={{
                            marginLeft: `${Math.max(0, cLayer.startTimeSec * pxPerSec)}px`,
                            width: `${Math.max(110, cLayer.durationSec * pxPerSec)}px`,
                          }}
                          className={`h-12 rounded-xl px-2.5 flex items-center justify-between text-[11px] font-bold cursor-pointer shrink-0 transition-all ${
                            isSel
                              ? 'bg-amber-500/35 border-2 border-amber-400 text-amber-100 ring-1 ring-amber-400/50 z-10'
                              : 'bg-amber-950/70 border border-amber-500/60 text-amber-200 hover:border-amber-300'
                          }`}
                        >
                          <span className="truncate">🃏 {cLayer.title}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTrailerCardLayers((prev) => prev.filter((c) => c.id !== cLayer.id));
                              if (selectedTrailerCardId === cLayer.id) setSelectedTrailerCardId(null);
                            }}
                            className="p-1 rounded hover:bg-rose-600 text-rose-200 hover:text-white ml-1.5 shrink-0 cursor-pointer"
                            title="Delete Trailer Card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )
                )}

                {/* 10. CHROMA KEY TRACK */}
                {activeWheelCategory.id === 'chroma' && (
                  chromaConfig.enabled ? (
                    <div
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-12 rounded-xl border border-emerald-500/70 bg-emerald-950/70 text-emerald-100 px-3 flex items-center justify-between cursor-pointer hover:border-emerald-300 shadow-md"
                      style={{ width: `${Math.max(180, totalDuration * pxPerSec)}px` }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Scissors className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/60 shrink-0"
                          style={{ backgroundColor: chromaConfig.customHex || '#00b140' }}
                        />
                        <span className="text-xs font-bold truncate">
                          Chroma Key Active ({chromaConfig.colorPreset})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChromaConfig(DEFAULT_CHROMA_KEY_CONFIG);
                        }}
                        className="p-1.5 rounded hover:bg-rose-600 text-rose-300 hover:text-white ml-2 shrink-0 cursor-pointer"
                        title="Disable Chroma"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-11 px-4 rounded-xl border border-dashed border-emerald-500/50 bg-emerald-950/20 text-xs text-emerald-200 hover:border-emerald-400 cursor-pointer flex items-center gap-2 font-bold"
                    >
                      <Scissors className="w-4 h-4 text-emerald-400" />
                      <span>+ Add Green Screen Chroma Key</span>
                    </button>
                  )
                )}

                {/* 11. SPLIT SCREEN TRACK */}
                {activeWheelCategory.id === 'split' && (
                  splitScreenConfig.enabled ? (
                    <div
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-12 rounded-xl border border-cyan-400/70 bg-cyan-950/70 text-cyan-100 px-3 flex items-center justify-between cursor-pointer hover:border-cyan-300 shadow-md"
                      style={{ width: `${Math.max(180, totalDuration * pxPerSec)}px` }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Split className="w-4 h-4 text-cyan-300 shrink-0" />
                        <span className="text-xs font-bold truncate">
                          Dual Split: {splitScreenConfig.layout}
                        </span>
                        <span className="text-[9.5px] font-mono text-zinc-300 shrink-0">
                          {splitScreenConfig.leftLabel} | {splitScreenConfig.rightLabel}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSplitScreenConfig(DEFAULT_SPLIT_SCREEN_CONFIG);
                        }}
                        className="p-1.5 rounded hover:bg-rose-600 text-rose-300 hover:text-white ml-2 shrink-0 cursor-pointer"
                        title="Reset Split Screen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-11 px-4 rounded-xl border border-dashed border-cyan-500/50 bg-cyan-950/20 text-xs text-cyan-200 hover:border-cyan-400 cursor-pointer flex items-center gap-2 font-bold"
                    >
                      <Split className="w-4 h-4 text-cyan-300" />
                      <span>+ Add Dual Split Screen</span>
                    </button>
                  )
                )}

                {/* 12. TRANSITIONS TRACK */}
                {activeWheelCategory.id === 'transitions' && (
                  Object.keys(clipTransitions).length > 0 ? (
                    <div
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-12 rounded-xl border border-amber-500/70 bg-amber-950/70 text-amber-100 px-3 flex items-center justify-between cursor-pointer hover:border-amber-300 shadow-md"
                      style={{ width: `${Math.max(160, totalDuration * pxPerSec)}px` }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <SlidersHorizontal className="w-4 h-4 text-amber-300 shrink-0" />
                        <span className="text-xs font-bold truncate">
                          Transitions Active ({Object.keys(clipTransitions).length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClipTransitions({});
                          setClipTransitionObjects({});
                        }}
                        className="p-1.5 rounded hover:bg-rose-600 text-rose-300 hover:text-white ml-2 shrink-0 cursor-pointer"
                        title="Clear Transitions"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-11 px-4 rounded-xl border border-dashed border-amber-500/50 bg-amber-950/20 text-xs text-amber-200 hover:border-amber-400 cursor-pointer flex items-center gap-2 font-bold"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-amber-300" />
                      <span>+ Add Clip Transitions</span>
                    </button>
                  )
                )}

                {/* 13. EFFECTS TRACK */}
                {activeWheelCategory.id === 'effects' && (
                  activeEffect ? (
                    <div
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-12 rounded-xl border border-purple-500/70 bg-purple-950/70 text-purple-100 px-3 flex items-center justify-between cursor-pointer hover:border-purple-300 shadow-md"
                      style={{ width: `${Math.max(160, totalDuration * pxPerSec)}px` }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="text-xs font-bold truncate">Effect: {activeEffect.name}</span>
                        <span className="text-[9px] font-mono text-purple-300 shrink-0">{activeEffect.category}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveEffect(null);
                        }}
                        className="p-1.5 rounded hover:bg-rose-600 text-rose-300 hover:text-white ml-2 shrink-0 cursor-pointer"
                        title="Remove Effect"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-11 px-4 rounded-xl border border-dashed border-purple-500/50 bg-purple-950/20 text-xs text-purple-200 hover:border-purple-400 cursor-pointer flex items-center gap-2 font-bold"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>+ Add Pro Visual Effect</span>
                    </button>
                  )
                )}

                {/* 14. TEMPLATES TRACK */}
                {activeWheelCategory.id === 'templates' && (
                  activeTemplate ? (
                    <div
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-12 rounded-xl border border-teal-400/70 bg-teal-950/70 text-teal-100 px-3 flex items-center justify-between cursor-pointer hover:border-teal-300 shadow-md"
                      style={{ width: `${Math.max(160, totalDuration * pxPerSec)}px` }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className="w-4 h-4 text-teal-400 shrink-0" />
                        <span className="text-xs font-bold truncate">Template: {activeTemplate.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTemplate(null);
                        }}
                        className="p-1.5 rounded hover:bg-rose-600 text-rose-300 hover:text-white ml-2 shrink-0 cursor-pointer"
                        title="Reset Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectWheelCategory(activeWheelCategory, true)}
                      className="h-11 px-4 rounded-xl border border-dashed border-teal-500/50 bg-teal-950/20 text-xs text-teal-200 hover:border-teal-400 cursor-pointer flex items-center gap-2 font-bold"
                    >
                      <Layers className="w-4 h-4 text-teal-400" />
                      <span>+ Apply Cinema Template</span>
                    </button>
                  )
                )}
              </div>

              {/* Slim Touch Scrub Zone */}
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  isScrubbingRef.current = true;
                  setIsScrubbingTimeline(true);
                  setIsPlaying(false);
                  try {
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  } catch {}
                  seekFromClientX(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!isScrubbingRef.current) return;
                  e.stopPropagation();
                  seekFromClientX(e.clientX, e.clientY);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  isScrubbingRef.current = false;
                  setIsScrubbingTimeline(false);
                  try {
                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                  } catch {}
                }}
                onPointerCancel={() => {
                  isScrubbingRef.current = false;
                  setIsScrubbingTimeline(false);
                }}
                className="min-h-[24px] w-full touch-none cursor-ew-resize flex items-center px-3 text-[9px] text-zinc-400 select-none border-t border-zinc-800/80 bg-[#080a0d] shrink-0"
              >
                <span>◀ ചുവന്ന ലൈൻ കൈകൊണ്ട് നീക്കി വീഡിയോ കണ്ട് ✂ കട്ട് ചെയ്യാം ▶</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* PERSISTENT BOTTOM VIDEO AD BAR (Compact on short landscape screens) */}
      {!isCompactLandscape && <EditorBottomVideoAdBar slotId="editor-workspace" />}

      {/* =========================================================================
          4. EXPORT MODAL DIALOGUE (Plays Live Video Ad During Full Export Duration)
          ========================================================================= */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#10151d] rounded-2xl border border-[#242e3d] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1f2937] pb-3">
              <h3 className="font-bold text-white text-sm">Export CineStudio Project</h3>
              <button
                type="button"
                onClick={() => {
                  if (isExporting) {
                    exportCancelRef.current = true;
                  } else {
                    clearExportedPreview();
                    setExportError(null);
                    setShowExportModal(false);
                  }
                }}
                className="min-h-[32px] min-w-[32px] rounded-lg hover:bg-[#18202c] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              {!exportedVideoUrl && !isExporting && (
                <>
                  <div>
                    <span className="text-zinc-400 text-[10px]">Project Name:</span>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full min-h-[38px] mt-1 bg-[#0c1017] border border-[#242e3d] rounded-xl px-3 py-1.5 text-white text-xs font-bold focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <span className="text-zinc-400 text-[10px]">Aspect Ratio &amp; Resolution:</span>
                    <div className="grid grid-cols-3 gap-2 pt-1.5">
                      {(['1080p', '4K', '720p'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setProjectResolution(r)}
                          className={`min-h-[38px] py-2 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                            projectResolution === r
                              ? 'bg-teal-500/20 border-2 border-teal-400 text-teal-300'
                              : 'bg-[#141a24] border border-[#242e3d] text-zinc-400 hover:text-white'
                          }`}
                        >
                          {r} {selectedAspectRatio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-300 bg-[#0c1017] border border-[#1f2937] rounded-xl px-3 py-2.5 flex items-center justify-between">
                    <span>{totalDuration.toFixed(1)}s Full Video</span>
                    <span className="text-teal-400 font-bold">Real Video Export</span>
                  </div>
                </>
              )}

              {exportError && (
                <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-[11px] font-semibold">
                  {exportError}
                </div>
              )}

              {isExporting && (
                <ExportModalVideoAdPlayer
                  active={isExporting}
                  progress={exportProgress}
                  elapsedSec={exportElapsedSec}
                  totalSec={exportEstimatedTotalSec}
                  statusText={exportStatusText || `Rendering (${projectResolution} · ${selectedAspectRatio})...`}
                />
              )}

              {exportedVideoUrl && !isExporting && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {isMl ? 'വീഡിയോ റെഡിയായി! ഇവിടെ പ്ലേ ചെയ്ത് സേവ് ചെയ്യാം' : 'Video Export Ready!'}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-200">
                      {exportedVideoMetaLabel && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          {exportedVideoMetaLabel}
                        </span>
                      )}
                      {exportedVideoSizeMb && <span>{exportedVideoSizeMb} MB</span>}
                    </div>
                  </div>
                  <video
                    src={exportedVideoUrl}
                    controls
                    playsInline
                    autoPlay
                    loop
                    className="w-full max-h-60 rounded-xl bg-black border border-[#242e3d] object-contain"
                  />
                  <div className="text-[10px] text-zinc-400 truncate px-1">{exportedVideoFilename}</div>
                  {exportShareNotice && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-teal-950/60 border border-teal-500/40 text-teal-200 text-[10.5px] font-semibold">
                      {exportShareNotice}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#1f2937]">
              {exportedVideoUrl && !isExporting ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      clearExportedPreview();
                      setExportShareNotice(null);
                      setExportError(null);
                      setShowExportModal(false);
                    }}
                    className="min-h-[38px] px-3.5 py-2 bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] rounded-xl text-zinc-300 font-bold cursor-pointer text-xs"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearExportedPreview();
                      setExportShareNotice(null);
                      setExportProgress(0);
                      setExportStatusText('');
                    }}
                    className="min-h-[38px] px-3.5 py-2 bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] rounded-xl text-teal-300 font-bold cursor-pointer text-xs"
                  >
                    Re-Export
                  </button>
                  {canShareMediaFile(exportedVideoFilename, 'video/mp4') && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await shareMediaBlobToDevice(exportedVideoUrl, exportedVideoFilename, 'video/mp4');
                        setExportShareNotice(
                          res === 'shared'
                            ? isMl
                              ? 'വീഡിയോ ഷെയർ / ഗാലറിയിലേക്ക് അയച്ചു!'
                              : 'Shared / saved to your device!'
                            : isMl
                            ? 'വീഡിയോ ഡൗൺലോഡ് ആരംഭിച്ചു!'
                            : 'Direct device download started!'
                        );
                      }}
                      className="min-h-[38px] px-4 py-2 bg-[#1a2433] hover:bg-[#243247] border border-teal-400/50 rounded-xl text-teal-200 font-bold cursor-pointer text-xs flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{isMl ? 'ഷെയർ / സേവ്' : 'Share / Save'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const ok = triggerLocalBlobDownload(exportedVideoUrl, exportedVideoFilename);
                      setExportShareNotice(
                        ok
                          ? isMl
                            ? 'വീഡിയോ ഉപകരണത്തിലേക്ക് സേവ് ചെയ്യുന്നു...'
                            : 'Saving video to your device Downloads...'
                          : isMl
                          ? 'ദയവായി മുകളിലെ വീഡിയോ പ്ലെയറിലെ മെനു വഴി ഡൗൺലോഡ് ചെയ്യുക.'
                          : 'Use the Share / Save button or player download option.'
                      );
                    }}
                    className="min-h-[38px] px-5 py-2 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black font-extrabold rounded-xl cursor-pointer text-xs flex items-center gap-1.5 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isMl ? 'ഗാലറിയിലേക്ക് സേവ്' : 'Save Video'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (isExporting) {
                        exportCancelRef.current = true;
                      } else {
                        clearExportedPreview();
                        setExportError(null);
                        setShowExportModal(false);
                      }
                    }}
                    className="min-h-[38px] px-4 py-2 bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] rounded-xl text-zinc-300 font-bold cursor-pointer text-xs"
                  >
                    {isExporting ? 'Stop Export' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleStartExport();
                    }}
                    disabled={isExporting}
                    className="min-h-[38px] px-5 py-2 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 disabled:opacity-50 text-black font-extrabold rounded-xl cursor-pointer text-xs shadow-lg"
                  >
                    {isExporting ? 'Exporting Video...' : 'Export Video'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
