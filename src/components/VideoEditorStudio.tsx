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
import { EditorBottomVideoAdBar, ExportModalVideoAdPlayer } from './AdsterraAds';
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

export interface VideoEditorStudioProps {
  lang: AppLang;
  currentUser?: FirebaseUser | null;
  onBackToStoryboard: () => void;
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
}) => {
  const isMl = lang === 'ml';

  // Local device IndexedDB blob URL cache (persists phone/PC gallery uploads safely across reloads)
  const localMediaUrlMapRef = useRef<Map<string, string>>(new Map());
  const openLoggedRef = useRef<boolean>(false);
  const lastEditTelemetryRef = useRef<number>(0);

  // =========================================================================
  // VIEW STATE: 'welcome' | 'new_project_setup' | 'editor'
  // =========================================================================
  const [studioView, setStudioView] = useState<'welcome' | 'new_project_setup' | 'editor'>('welcome');

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

  // Video Project Configuration
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatioType>('16:9');
  const [projectName, setProjectName] = useState<string>('My Project 01');
  const [projectResolution, setProjectResolution] = useState<'4K' | '1080p' | '720p'>('1080p');
  const [setupSelectedMediaIds, setSetupSelectedMediaIds] = useState<string[]>([]);

  // =========================================================================
  // COLLAPSIBLE PANELS & DYNAMIC SCREEN RESIZING
  // Left and Right panels can collapse/auto-hide so the video player expands!
  // =========================================================================
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  // ACTIVE TOP TAB IN LEFT COLUMN (Studio Mode):
  const [activeTab, setActiveTab] = useState<
    'Media' | 'Audio' | 'Titles' | 'VFX' | 'Transitions' | 'Effects' | 'Filters' | 'Stickers' | 'Templates'
  >('Filters');

  // Sub-category filter and search query inside the active column
  const [activeSubCategory, setActiveSubCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // USER ONLY MEDIA GALLERY POOL (Clean per project - never leaks old uploads into New Project):
  const [mediaGallery, setMediaGallery] = useState<MediaItem[]>([]);

  const [mediaFilter, setMediaFilter] = useState<'All' | 'Video' | 'Photo'>('All');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);
  const setupFileInputRef = useRef<HTMLInputElement | null>(null);

  // Active Template / Background
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(TEMPLATES_LIST[0]);

  // Active Filter Applied
  const [activeFilter, setActiveFilter] = useState<FilterItem>(FILTERS_LIST[1]); // Teal & Orange

  // Active Audio Score & Live Preview Synthesizer
  const [activeAudio, setActiveAudio] = useState<AudioItem>(AUDIO_LIST[0]);
  const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioPreviewTimerRef = useRef<number | null>(null);

  // Active Visual Effect Overlay (VFX) & Active Stickers & Cinema Action VFX Layers
  const [activeEffect, setActiveEffect] = useState<EffectItem | null>(null);
  const [activeStickers, setActiveStickers] = useState<TimelineStickerLayer[]>([]);
  const [vfxLayers, setVfxLayers] = useState<TimelineVfxLayer[]>([]);
  const [selectedStickerLayerId, setSelectedStickerLayerId] = useState<string | null>(null);
  const [selectedVfxLayerId, setSelectedVfxLayerId] = useState<string | null>(null);
  const [selectedFeatureType, setSelectedFeatureType] = useState<
    'clip' | 'title' | 'sticker' | 'vfx' | 'effect' | 'filter' | 'audio' | 'transition' | 'speed'
  >('clip');

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
        if (clip.type === 'video') {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.playsInline = true;
          video.preload = 'auto';
          video.src = clip.url;
          video.load();
          mediaCacheRef.current.set(cacheKey, video);
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = clip.url;
          mediaCacheRef.current.set(cacheKey, img);
        }
      }
      if (clip.thumbnailUrl && !thumbCacheRef.current.has(clip.thumbnailUrl)) {
        const tImg = new Image();
        tImg.crossOrigin = 'anonymous';
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

  const seekFromClientX = (clientX: number) => {
    const container = timelineContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const relX = clientX - rect.left + container.scrollLeft;
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

  // Inspector State (Right Column): 'adjust' | 'video' | 'audio' | 'color' | 'speed'
  const [activeInspectorTab, setActiveInspectorTab] = useState<'adjust' | 'video' | 'audio' | 'color' | 'speed'>('adjust');
  const canvasOverlayRef = useRef<HTMLDivElement | null>(null);
  const canvasDragStateRef = useRef<{
    mode: 'move_sticker' | 'resize_sticker' | 'move_title' | 'resize_title' | 'vfx_start' | 'vfx_end' | 'vfx_scale';
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
  const [colorVignette, setColorVignette] = useState<number>(30); // 0 to 100

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
      records.forEach((rec) => {
        if (!localMediaUrlMapRef.current.has(rec.id)) {
          try {
            const freshUrl = URL.createObjectURL(rec.file);
            localMediaUrlMapRef.current.set(rec.id, freshUrl);
          } catch {}
        }
      });

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
    };
  }, []);

  // Canvas Ref
  const playerCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Save current project state helper (auto-saves to Home page list)
  const saveCurrentProjectToStorage = (
    overrideClips?: TimelineClip[],
    overrideName?: string,
    overrideRatio?: AspectRatioType,
    overrideProjectId?: string
  ) => {
    const activeClips = overrideClips || timelineClips;
    const activeName = overrideName || projectName;
    const activeRatio = overrideRatio || selectedAspectRatio;
    let thumb = '';
    try {
      if (playerCanvasRef.current) {
        thumb = playerCanvasRef.current.toDataURL('image/jpeg', 0.6);
      }
    } catch {}
    if (!thumb && activeClips.length > 0) {
      thumb = activeClips[0]?.url || '';
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
      const updatedList = [updatedProj, ...filtered];
      try {
        localStorage.setItem('cinestudio_user_projects', JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });
  };

  // Delete project from list and storage
  const handleDeleteUserProject = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setUserProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem('cinestudio_user_projects', JSON.stringify(updated));
      } catch {}
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
    setSelectedAspectRatio(proj.aspectRatio);
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

    const matchedAud = AUDIO_LIST.find((a) => a.id === proj.activeAudioId);
    if (matchedAud) setActiveAudio(matchedAud);

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
    setPreviewingAudioId(null);
  };

  const playAudioPreview = (item: AudioItem) => {
    if (previewingAudioId === item.id) {
      stopAudioPreview();
      return;
    }
    stopAudioPreview();
    if (typeof window === 'undefined') return;
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
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted || isAudioTrackMuted ? 0 : Math.min(0.45, (volume / 100) * 0.35), now);
      masterGain.connect(ctx.destination);

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

      setPreviewingAudioId(item.id);
      audioPreviewTimerRef.current = window.setTimeout(() => {
        setPreviewingAudioId(null);
      }, notes.length * 240 + 150);
    } catch {}
  };

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

      // Pause any non-active cached videos so audio/decoding doesn't overlap
      mediaCacheRef.current.forEach((el, key) => {
        if (el instanceof HTMLVideoElement) {
          const isCurrentVideo = activeClip && activeClip.type === 'video' && key === `video:${activeClip.url}`;
          if (!isCurrentVideo && !el.paused) {
            el.pause();
          }
        }
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Combined Filter + Real Color Grading Formulas (bypass ctx.filter completely when neutral for zero GPU overhead)
      const baseFlt = p.activeFilter.cssFilter !== 'none' ? `${p.activeFilter.cssFilter} ` : '';
      const b = 100 + p.colorBrightness + p.colorExposure * 0.4 + p.colorHighlights * 0.2 + p.colorShadows * 0.15;
      const c = 100 + p.colorContrast + (p.colorHighlights - p.colorShadows) * 0.15;
      const s = 100 + p.colorSaturation;
      const w = p.colorWarmth > 0 ? `sepia(${p.colorWarmth * 0.4}%) ` : '';
      const t = p.colorTint !== 0 ? `hue-rotate(${p.colorTint}deg) ` : '';
      const isNeutralFilter =
        !baseFlt &&
        !w &&
        !t &&
        Math.abs(b - 100) < 0.5 &&
        Math.abs(c - 100) < 0.5 &&
        Math.abs(s - 100) < 0.5;
      ctx.filter = isNeutralFilter
        ? 'none'
        : `${baseFlt}${w}${t}brightness(${Math.max(10, b)}%) contrast(${Math.max(10, c)}%) saturate(${Math.max(0, s)}%)`;
      ctx.globalAlpha = p.opacity / 100;

      ctx.translate(canvas.width / 2 + p.posX, canvas.height / 2 + p.posY);
      ctx.rotate((p.rotationDeg * Math.PI) / 180);
      ctx.scale((p.scaleX / 100) * (p.flipH ? -1 : 1), (p.scaleY / 100) * (p.flipV ? -1 : 1));

      // Helper to draw a clip frame centered-cover (with instant thumbnail fallback during video seek/buffer)
      const drawClipFrame = (clipItem: TimelineClip | undefined, localT: number, syncMediaPlayback: boolean) => {
        if (!p.isVideoTrackVisible || !clipItem?.url) return false;
        const mediaEl = getOrCreateMedia(clipItem);
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
            ctx.drawImage(mediaEl, -drawW / 2, -drawH / 2, drawW, drawH);
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
            ctx.drawImage(
              lastValidFrameCanvas,
              -canvas.width / 2,
              -canvas.height / 2,
              canvas.width,
              canvas.height
            );
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
              ctx.drawImage(tImg, -drawW / 2, -drawH / 2, drawW, drawH);
              return true;
            }
          }
        } else if (mediaEl instanceof HTMLImageElement) {
          if (syncMediaPlayback && isPlayingRef.current) {
            lastSyncedClipId = clipItem.id;
          }
          if (mediaEl.complete && mediaEl.naturalWidth > 0) {
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
      if (activeTrObj) {
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

      // Draw custom vignette if requested
      if (p.colorVignette > 0) {
        const vigRadius = Math.min(canvas.width, canvas.height);
        const vigGrad = ctx.createRadialGradient(0, 0, vigRadius * 0.25, 0, 0, vigRadius * 0.7);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, `rgba(0,0,0,${(p.colorVignette / 100) * 0.85})`);
        ctx.fillStyle = vigGrad;
        ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
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

      ctx.restore();

      // Screen-space Overlays (aligned 1:1 with interactive on-screen round handles!)
      // 1. Render Title ONLY within [titleStartSec .. titleStartSec + titleDurationSec]
      const tCur = currentTimeRef.current;
      if (
        p.showTitleOverlay &&
        p.movieTitle &&
        (p.totalDuration <= 0 || (tCur >= p.titleStartSec - 0.05 && tCur <= p.titleStartSec + p.titleDurationSec + 0.05))
      ) {
        ctx.save();
        ctx.filter = 'none';
        ctx.globalAlpha = Math.max(0, Math.min(1, p.titleOpacity / 100));
        const tx = (p.titleXPct / 100) * canvas.width;
        const ty = (p.titleYPct / 100) * canvas.height;
        ctx.translate(tx, ty);
        ctx.scale(p.titleScale, p.titleScale);
        ctx.textAlign = 'center';

        if (p.subtitle) {
          ctx.font = '600 16px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 8;
          ctx.fillText(p.subtitle.toUpperCase(), 0, -42);
        }

        ctx.font = '900 56px "Impact", "Arial Black", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 18;
        ctx.fillText(p.movieTitle.toUpperCase(), 0, 18);

        if (p.directorText) {
          ctx.font = '600 12px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 6;
          ctx.fillText(p.directorText.toUpperCase(), 0, 48);
        }
        ctx.restore();
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

  // Handle User Device Multi-file Upload (Saved inside device browser IndexedDB!)
  const handleUserDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>, isSetup = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newMediaItems: MediaItem[] = [];

    Array.from(files).forEach((file, idx) => {
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

      // Persist actual File/Blob inside user's own device IndexedDB storage
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

      // Probe real video duration & capture thumbnail, then release hardware decoder immediately
      if (isVideo) {
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
        };
        const safetyTimer = window.setTimeout(cleanupProbe, 8000);
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
            c.width = 240;
            c.height = 135;
            const cctx = c.getContext('2d');
            if (cctx && probeVid.videoWidth > 0) {
              cctx.drawImage(probeVid, 0, 0, c.width, c.height);
              const thumb = c.toDataURL('image/jpeg', 0.55);
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
      }
    });

    const updatedGallery = [...newMediaItems, ...mediaGallery];
    setMediaGallery(updatedGallery);
    logEditorTelemetry('add_media', timelineClips, totalDuration);

    if (isSetup) {
      setSetupSelectedMediaIds((prev) => [...prev, ...newMediaItems.map((m) => m.id)]);
    } else {
      // In editor mode: strictly added to the Media pool, and user chooses which to add to timeline!
      setActiveTab('Media');
      setIsLeftPanelOpen(true);
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

  // Delete an uploaded media item from the user gallery & device IndexedDB
  const handleDeleteUploadedMedia = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = mediaGallery.filter((m) => m.id !== id);
    setMediaGallery(updated);
    setSetupSelectedMediaIds((prev) => prev.filter((mid) => mid !== id));
    setSelectedMediaIds((prev) => prev.filter((mid) => mid !== id));
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
    return AUDIO_LIST.filter((a) => {
      const matchCat = activeSubCategory === 'All' || a.category === activeSubCategory;
      const matchQ = !q || a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeSubCategory, searchQuery]);

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

    const isMobileUA = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    const getOutputDimensions = (res: '4K' | '1080p' | '720p') => {
      const makeEven = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
      const scaleToMaxEdge = (w: number, h: number, maxEdge: number) => {
        const longest = Math.max(w, h);
        if (longest <= maxEdge) return { outW: makeEven(w), outH: makeEven(h) };
        const s = maxEdge / longest;
        return { outW: makeEven(w * s), outH: makeEven(h * s) };
      };

      let rawW = 1920;
      let rawH = 1080;
      if (res === '4K') {
        if (selectedAspectRatio === '9:16') { rawW = 2160; rawH = 3840; }
        else if (selectedAspectRatio === '1:1') { rawW = 2160; rawH = 2160; }
        else if (selectedAspectRatio === '4:5') { rawW = 2160; rawH = 2700; }
        else if (selectedAspectRatio === '21:9') { rawW = 3840; rawH = 1620; }
        else if (selectedAspectRatio === '4:3') { rawW = 2880; rawH = 2160; }
        else { rawW = 3840; rawH = 2160; }
        // Android/mobile MediaRecorder hardware H.264 maxes out safely at 1920px (higher causes blank/black gallery files)
        return scaleToMaxEdge(rawW, rawH, isMobileUA ? 1920 : 2560);
      }
      if (res === '720p') {
        if (selectedAspectRatio === '9:16') { rawW = 720; rawH = 1280; }
        else if (selectedAspectRatio === '1:1') { rawW = 720; rawH = 720; }
        else if (selectedAspectRatio === '4:5') { rawW = 720; rawH = 900; }
        else if (selectedAspectRatio === '21:9') { rawW = 1680; rawH = 720; }
        else if (selectedAspectRatio === '4:3') { rawW = 960; rawH = 720; }
        else { rawW = 1280; rawH = 720; }
        return scaleToMaxEdge(rawW, rawH, isMobileUA ? 1280 : 1680);
      }
      // 1080p
      if (selectedAspectRatio === '9:16') { rawW = 1080; rawH = 1920; }
      else if (selectedAspectRatio === '1:1') { rawW = 1080; rawH = 1080; }
      else if (selectedAspectRatio === '4:5') { rawW = 1080; rawH = 1350; }
      else if (selectedAspectRatio === '21:9') { rawW = 2560; rawH = 1080; }
      else if (selectedAspectRatio === '4:3') { rawW = 1440; rawH = 1080; }
      else { rawW = 1920; rawH = 1080; }
      return scaleToMaxEdge(rawW, rawH, 1920);
    };

    const { outW, outH } = getOutputDimensions(projectResolution);
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = outW;
    exportCanvas.height = outH;
    const eCtx = exportCanvas.getContext('2d', { alpha: false });
    if (!eCtx) {
      setIsExporting(false);
      setExportError('Canvas context unavailable for video export.');
      return;
    }

    // Mount export <video> tags inside a tiny compositor-active DOM container so Android Chromium uploads video frames to GPU textures
    const exportHostDiv = document.createElement('div');
    exportHostDiv.style.cssText =
      'position:fixed;left:-9999px;top:0;width:32px;height:32px;opacity:0.01;pointer-events:none;overflow:hidden;z-index:-1;';
    document.body.appendChild(exportHostDiv);

    const exportMediaMap = new Map<string, HTMLImageElement | HTMLVideoElement>();
    const lastValidFrames = new Map<string, HTMLCanvasElement>();
    let exportAudioCtx: AudioContext | null = null;
    let audioDest: MediaStreamAudioDestinationNode | null = null;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        exportAudioCtx = new AudioCtx();
        if (exportAudioCtx.state === 'suspended') {
          await exportAudioCtx.resume();
        }
        audioDest = exportAudioCtx.createMediaStreamDestination();
        // Steady inaudible clock keeps MediaRecorder audio muxer active across photo & video clips
        const keepAliveOsc = exportAudioCtx.createOscillator();
        const keepAliveGain = exportAudioCtx.createGain();
        keepAliveGain.gain.value = 0.00001;
        keepAliveOsc.connect(keepAliveGain);
        keepAliveGain.connect(audioDest);
        keepAliveOsc.start();
      }
    } catch {}

    const cleanupExportResources = () => {
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

    const waitForSeek = (vid: HTMLVideoElement, targetSec: number, timeoutMs = 1500) =>
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

    const captureSnapshot = (key: string, vid: HTMLVideoElement) => {
      if (vid.readyState < 2 || vid.videoWidth <= 0 || vid.videoHeight <= 0) return;
      let snap = lastValidFrames.get(key);
      if (!snap) {
        snap = document.createElement('canvas');
        const scale = Math.min(1, 720 / Math.max(vid.videoWidth, vid.videoHeight));
        snap.width = Math.max(2, Math.floor((vid.videoWidth * scale) / 2) * 2);
        snap.height = Math.max(2, Math.floor((vid.videoHeight * scale) / 2) * 2);
        lastValidFrames.set(key, snap);
      }
      const sCtx = snap.getContext('2d');
      if (sCtx) {
        try {
          sCtx.drawImage(vid, 0, 0, snap.width, snap.height);
        } catch {}
      }
    };

    // Preload ALL timeline clips cleanly before recording starts
    const uniqueMediaUrls = Array.from(new Set(timelineClips.map((c) => `${c.type}::${c.url}`)));
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
            if (mType === 'video') {
              const vid = document.createElement('video');
              if (!url.startsWith('blob:') && !url.startsWith('data:')) {
                vid.crossOrigin = 'anonymous';
              }
              vid.playsInline = true;
              vid.setAttribute('playsinline', 'true');
              vid.setAttribute('webkit-playsinline', 'true');
              vid.preload = 'auto';
              vid.style.cssText = 'width:32px;height:32px;object-fit:cover;';
              vid.muted = isMuted || isAudioTrackMuted;
              vid.volume = Math.max(0, Math.min(1, volume / 100));
              vid.playbackRate = Math.min(8, Math.max(0.25, playbackSpeed));
              exportHostDiv.appendChild(vid);

              const timer = window.setTimeout(resolve, 7500);
              const done = () => {
                window.clearTimeout(timer);
                resolve();
              };
              vid.addEventListener('canplay', done, { once: true });
              vid.addEventListener('loadeddata', done, { once: true });
              vid.addEventListener('error', done, { once: true });
              vid.src = url;
              vid.load();
              if (exportAudioCtx && audioDest && !isMuted && !isAudioTrackMuted) {
                try {
                  const srcNode = exportAudioCtx.createMediaElementSource(vid);
                  srcNode.connect(audioDest);
                } catch {}
              }
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

    // Warm-prime every video decoder into GPU texture memory before starting MediaRecorder
    setExportStatusText(isMl ? 'വീഡിയോ ഫ്രെയിമുകൾ ഡീകോഡ് ചെയ്യുന്നു...' : 'Decoding initial video frames...');
    for (const [key, el] of exportMediaMap.entries()) {
      if (exportCancelRef.current) break;
      if (el instanceof HTMLVideoElement) {
        const url = key.slice('video::'.length);
        const firstMatchingClip = timelineClips.find((c) => c.type === 'video' && c.url === url);
        const firstStart = firstMatchingClip?.sourceStartSec || 0;
        const origMuted = el.muted;
        try {
          el.muted = true;
          await waitForSeek(el, firstStart, 1400);
          await el.play().catch(() => {});
          await new Promise((r) => window.setTimeout(r, 90));
          captureSnapshot(key, el);
          el.pause();
          await waitForSeek(el, firstStart, 900);
          captureSnapshot(key, el);
        } catch {
        } finally {
          el.muted = origMuted;
        }
      }
    }

    if (exportCancelRef.current) {
      cleanupExportResources();
      setIsExporting(false);
      return;
    }

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

    const mimeCandidates = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1.4D401E,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp8',
      'video/webm;codecs=vp9,opus',
      'video/webm',
    ];
    const selectedMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const targetBitrate = projectResolution === '4K' ? 8_000_000 : projectResolution === '1080p' ? 5_000_000 : 2_500_000;

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

    const drawExportClip = (clipItem: TimelineClip | undefined, localT: number) => {
      if (!isVideoTrackVisible || !clipItem?.url) return false;
      const key = `${clipItem.type}::${clipItem.url}`;
      const el = exportMediaMap.get(key);

      if (el instanceof HTMLVideoElement) {
        const vidDur = isFinite(el.duration) && el.duration > 0 ? el.duration : clipItem.durationSec;
        const desiredSourceTime = (clipItem.sourceStartSec || 0) + localT;
        const targetVideoTime = vidDur > 0 ? Math.min(Math.max(0, vidDur - 0.04), desiredSourceTime) : desiredSourceTime;

        const prevClipId = lastClipIdByVideoKey.get(key);
        const isEnteringNewClip = prevClipId !== clipItem.id;
        lastClipIdByVideoKey.set(key, clipItem.id);

        const timeDiff = Math.abs(el.currentTime - targetVideoTime);
        const shouldSeek =
          (isEnteringNewClip && timeDiff > 0.14) ||
          (isReversePlayback && timeDiff > 0.06) ||
          (!el.seeking && timeDiff > 1.25);

        if (shouldSeek && !el.seeking) {
          try {
            el.currentTime = targetVideoTime;
          } catch {}
        }

        if (!isReversePlayback && el.paused && el.readyState >= 2) {
          el.play().catch(() => {
            el.muted = true;
            el.play().catch(() => {});
          });
        }

        if (!el.seeking && el.readyState >= 2 && el.videoWidth > 0 && el.videoHeight > 0) {
          if (frameTick % 4 === 0 || isEnteringNewClip) {
            captureSnapshot(key, el);
          }
          return drawImageContainCover(el, el.videoWidth, el.videoHeight);
        }

        // Zero-black-frame fallback during brief seeks or initial buffer
        const cachedSnap = lastValidFrames.get(key);
        if (cachedSnap && cachedSnap.width > 0 && cachedSnap.height > 0) {
          return drawImageContainCover(cachedSnap, cachedSnap.width, cachedSnap.height);
        }
        if (clipItem.thumbnailUrl) {
          const thumbImg = thumbCacheRef.current.get(clipItem.thumbnailUrl);
          if (thumbImg && thumbImg.complete && thumbImg.naturalWidth > 0) {
            return drawImageContainCover(thumbImg, thumbImg.naturalWidth, thumbImg.naturalHeight);
          }
        }
      } else if (el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0) {
        return drawImageContainCover(el, el.naturalWidth, el.naturalHeight);
      }
      return false;
    };

    const isNeutralExportFilter =
      activeFilter.cssFilter === 'none' &&
      colorBrightness === 0 &&
      colorContrast === 0 &&
      colorSaturation === 0 &&
      colorExposure === 0 &&
      colorWarmth === 0 &&
      colorTint === 0 &&
      colorHighlights === 0 &&
      colorShadows === 0;

    const renderSingleExportFrame = (tPos: number) => {
      const { clip: activeClip, index: activeIdx, localTime } = getClipAtTime(tPos, timelineClips);

      exportMediaMap.forEach((el, k) => {
        if (el instanceof HTMLVideoElement) {
          const isCur = activeClip && activeClip.type === 'video' && k === `video::${activeClip.url}`;
          if (!isCur && !el.paused) el.pause();
        }
      });

      eCtx.clearRect(0, 0, outW, outH);
      eCtx.fillStyle = '#000000';
      eCtx.fillRect(0, 0, outW, outH);

      eCtx.save();
      if (isNeutralExportFilter) {
        eCtx.filter = 'none';
      } else {
        const baseFlt = activeFilter.cssFilter !== 'none' ? `${activeFilter.cssFilter} ` : '';
        const b = 100 + colorBrightness + colorExposure * 0.4 + colorHighlights * 0.2 + colorShadows * 0.15;
        const c = 100 + colorContrast + (colorHighlights - colorShadows) * 0.15;
        const s = 100 + colorSaturation;
        const w = colorWarmth > 0 ? `sepia(${colorWarmth * 0.4}%) ` : '';
        const t = colorTint !== 0 ? `hue-rotate(${colorTint}deg) ` : '';
        eCtx.filter = `${baseFlt}${w}${t}brightness(${Math.max(10, b)}%) contrast(${Math.max(10, c)}%) saturate(${Math.max(0, s)}%)`;
      }
      eCtx.globalAlpha = opacity / 100;

      const scaleFactor = outW / canvasDims.width;
      eCtx.translate(outW / 2 + posX * scaleFactor, outH / 2 + posY * scaleFactor);
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

      if (seamTr) {
        const effType = seamTr.effectType;
        if (effType === 'slide' || effType === 'whip') {
          eCtx.save();
          eCtx.translate(-trProgress * outW, 0);
          drawExportClip(trOutClip, trOutLocal);
          eCtx.restore();
          eCtx.save();
          eCtx.translate((1 - trProgress) * outW, 0);
          drawExportClip(trInClip, trInLocal);
          eCtx.restore();
        } else if (effType === 'zoom') {
          eCtx.save();
          eCtx.scale(1 + trProgress * 0.45, 1 + trProgress * 0.45);
          eCtx.globalAlpha = Math.max(0, 1 - trProgress);
          drawExportClip(trOutClip, trOutLocal);
          eCtx.restore();
          eCtx.save();
          eCtx.scale(0.72 + trProgress * 0.28, 0.72 + trProgress * 0.28);
          eCtx.globalAlpha = trProgress;
          drawExportClip(trInClip, trInLocal);
          eCtx.restore();
        } else if (effType === 'cube3d') {
          eCtx.save();
          eCtx.scale(Math.max(0.05, Math.abs(Math.cos(trProgress * Math.PI))), 1);
          drawExportClip(trProgress < 0.5 ? trOutClip : trInClip, trProgress < 0.5 ? trOutLocal : trInLocal);
          eCtx.restore();
        } else if (effType === 'wipe') {
          drawExportClip(trOutClip, trOutLocal);
          eCtx.save();
          eCtx.beginPath();
          eCtx.arc(0, 0, Math.max(1, trProgress * Math.hypot(outW / 2, outH / 2)), 0, Math.PI * 2);
          eCtx.clip();
          drawExportClip(trInClip, trInLocal);
          eCtx.restore();
        } else if (effType === 'glitch') {
          const jitterX = Math.sin(trProgress * 45) * 28 * scaleFactor * (1 - Math.abs(trProgress - 0.5) * 2);
          eCtx.save();
          eCtx.translate(jitterX, 0);
          drawExportClip(trProgress < 0.5 ? trOutClip : trInClip, trProgress < 0.5 ? trOutLocal : trInLocal);
          eCtx.restore();
        } else if (effType === 'flash') {
          drawExportClip(trProgress < 0.5 ? trOutClip : trInClip, trProgress < 0.5 ? trOutLocal : trInLocal);
          eCtx.fillStyle = `rgba(255, 255, 255, ${Math.sin(trProgress * Math.PI) * 0.92})`;
          eCtx.fillRect(-outW / 2, -outH / 2, outW, outH);
        } else {
          drawExportClip(trOutClip, trOutLocal);
          eCtx.save();
          eCtx.globalAlpha = trProgress;
          drawExportClip(trInClip, trInLocal);
          eCtx.restore();
        }
      } else {
        drawExportClip(activeClip, localTime);
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

      if (colorVignette > 0) {
        const vigRadius = Math.min(outW, outH);
        const vigGrad = eCtx.createRadialGradient(0, 0, vigRadius * 0.25, 0, 0, vigRadius * 0.7);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, `rgba(0,0,0,${(colorVignette / 100) * 0.85})`);
        eCtx.fillStyle = vigGrad;
        eCtx.fillRect(-outW / 2, -outH / 2, outW, outH);
      }

      eCtx.restore();

      if (
        showTitleOverlay &&
        movieTitle.trim().length > 0 &&
        tPos >= titleStartSec - 0.05 &&
        tPos <= titleStartSec + titleDurationSec + 0.05
      ) {
        eCtx.save();
        eCtx.filter = 'none';
        eCtx.globalAlpha = Math.max(0, Math.min(1, titleOpacity / 100));
        const tx = (titleXPct / 100) * outW;
        const ty = (titleYPct / 100) * outH;
        const tScale = (outW / 1280) * titleScale;
        eCtx.translate(tx, ty);
        eCtx.scale(tScale, tScale);
        eCtx.textAlign = 'center';
        if (subtitle) {
          eCtx.font = `600 18px system-ui, -apple-system, sans-serif`;
          eCtx.fillStyle = 'rgba(255, 255, 255, 0.88)';
          eCtx.shadowColor = 'rgba(0,0,0,0.9)';
          eCtx.shadowBlur = 10;
          eCtx.fillText(subtitle.toUpperCase(), 0, -42);
        }
        eCtx.font = `900 58px "Impact", "Arial Black", sans-serif`;
        eCtx.fillStyle = '#ffffff';
        eCtx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        eCtx.shadowBlur = 18;
        eCtx.fillText(movieTitle.toUpperCase(), 0, 18);

        if (directorText) {
          eCtx.font = `600 13px system-ui, -apple-system, sans-serif`;
          eCtx.fillStyle = 'rgba(255, 255, 255, 0.78)';
          eCtx.shadowColor = 'rgba(0,0,0,0.8)';
          eCtx.shadowBlur = 6;
          eCtx.fillText(directorText.toUpperCase(), 0, 48);
        }
        eCtx.restore();
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

      return activeIdx;
    };

    const exactTotalSec = Math.max(0.5, timelineClips.reduce((acc, c) => acc + (c.durationSec || 4), 0));
    const speedFactor = Math.max(0.25, Math.min(8, playbackSpeed));
    const exportWallDurationSec = exactTotalSec / speedFactor;

    // Paint frame 0 before starting recorder so the very first keyframe has valid pixels
    renderSingleExportFrame(isReversePlayback ? exactTotalSec : 0);

    recorder.onstop = () => {
      cleanupExportResources();
      stream.getTracks().forEach((t) => t.stop());

      if (exportCancelRef.current) {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatusText('');
        return;
      }

      const finalMime = recorder.mimeType || selectedMime || 'video/webm';
      const blob = new Blob(chunks, { type: finalMime });
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

      try {
        const link = document.createElement('a');
        link.download = safeName;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {}

      saveCurrentProjectToStorage();
      logEditorTelemetry('export_video', timelineClips, exactTotalSec);
      setIsExporting(false);
      setExportProgress(100);
      setExportElapsedSec(Math.ceil(exportWallDurationSec));
      setExportStatusText(isMl ? 'വീഡിയോ എക്സ്പോർട്ട് പൂർത്തിയായി!' : 'Video export ready!');
    };

    recorder.start(100);
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
        setExportProgress(100);
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
        }, 120);
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
                          {proj.thumbnailUrl ? (
                            <img src={proj.thumbnailUrl} alt={proj.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-teal-950 via-zinc-900 to-black flex flex-col items-center justify-center p-1 text-center">
                              <Film className="w-4 h-4 text-teal-400 mb-0.5" />
                              <span className="text-[7px] font-black text-zinc-300 truncate max-w-full">{proj.name}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
          accept="video/*,image/*"
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
          <div className="max-w-2xl mx-auto w-full px-4 py-5 space-y-6 pb-8">
            {/* SECTION 1: VIDEO ASPECT RATIOS */}
            <div className="space-y-3">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-teal-400" />
                  <span>Select Video Format (വീഡിയോ ഫോർമാറ്റ് തിരഞ്ഞെടുക്കുക)</span>
                </h2>
                <p className="text-xs text-zinc-400 pt-0.5">
                  {isMl
                    ? 'നിങ്ങൾ നിർമ്മിക്കാൻ ആഗ്രഹിക്കുന്ന വീഡിയോ പ്ലാറ്റ്‌ഫോമിന് അനുയോജ്യമായ ഫോർമാറ്റ് തിരഞ്ഞെടുക്കുക:'
                    : 'Choose the aspect ratio matching your video target platform:'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ASPECT_RATIO_OPTIONS.map((opt) => {
                  const isSelected = selectedAspectRatio === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedAspectRatio(opt.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between relative ${
                        isSelected
                          ? 'bg-teal-950/40 border-teal-400 ring-2 ring-teal-400/30 shadow-lg shadow-teal-500/10'
                          : 'bg-[#10151d] border-[#1f2937] hover:border-[#334155] hover:bg-[#141b26]'
                      }`}
                    >
                      <div className="h-14 flex items-center justify-center mb-2">
                        <div
                          className={`${opt.iconWidthClass} ${opt.iconHeightClass} rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-teal-400 bg-teal-400/20 text-teal-300'
                              : 'border-zinc-600 bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          <span className="text-[10px] font-black">{opt.id}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`font-black text-xs ${isSelected ? 'text-teal-300' : 'text-zinc-200'}`}>
                            {opt.label}
                          </span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-teal-400 text-black flex items-center justify-center font-bold text-[10px]">
                              ✓
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 block truncate font-medium">{opt.sublabel}</span>
                        <span className="text-[9px] font-mono text-zinc-500 block pt-0.5">{opt.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: PROJECT SETTINGS */}
            <div className="p-4 rounded-2xl bg-[#10151d] border border-[#1f2937] space-y-3.5">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-teal-400" />
                <span>Project Details (പേരും റെസല്യൂഷനും)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 font-semibold block mb-1">
                    Project Title (പ്രോജക്റ്റ് പേര്):
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-[#080b10] border border-[#2a3647] rounded-xl px-3 py-2.5 text-white font-bold text-xs focus:outline-none focus:border-teal-400"
                    placeholder="My CineStudio Project"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 font-semibold block mb-1">
                    Export Resolution (റെസല്യൂഷൻ):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['1080p', '4K', '720p'] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setProjectResolution(res)}
                        className={`py-2 min-h-[38px] rounded-xl font-bold text-xs cursor-pointer transition-colors ${
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
            <div className="p-4 rounded-2xl bg-[#10151d] border border-[#1f2937] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-teal-400" />
                    <span>Add Media Clips (ഗാലറി ഫോട്ടോ/വീഡിയോ തിരഞ്ഞെടുക്കുക)</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 pt-0.5">
                    {isMl
                      ? 'നിങ്ങളുടെ ഫോണിലെ/കംപ്യൂട്ടറിലെ ഫോട്ടോകളും വീഡിയോകളും മാത്രം ചേർക്കുക.'
                      : 'Select photos & videos strictly from your device gallery:'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setupFileInputRef.current?.click()}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-teal-400 hover:bg-teal-300 text-zinc-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all shrink-0"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Upload from Gallery</span>
                </button>
              </div>

              {mediaGallery.length === 0 ? (
                <div
                  onClick={() => setupFileInputRef.current?.click()}
                  className="p-8 rounded-2xl border-2 border-dashed border-[#2a3647] hover:border-teal-400/80 bg-[#080b10] flex flex-col items-center justify-center text-center cursor-pointer group transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 stroke-[2]" />
                  </div>
                  <span className="font-extrabold text-xs sm:text-sm text-zinc-200 block">
                    {isMl ? 'ഫോട്ടോകളും വീഡിയോകളും അപ്‌ലോഡ് ചെയ്യുക' : 'Upload Photos & Videos from your Device'}
                  </span>
                  <span className="text-[11px] text-zinc-400 block pt-1">
                    {isMl
                      ? 'ഒന്നിൽ കൂടുതൽ ഫയലുകൾ ഒരേ സമയം തിരഞ്ഞെടുക്കാം (MP4, MOV, JPG, PNG)'
                      : 'Multi-file select supported. Stored safely on your device.'}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
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
                        className={`rounded-xl border overflow-hidden cursor-pointer relative group transition-all ${
                          isChecked
                            ? 'border-teal-400 ring-2 ring-teal-400/50 shadow-md shadow-teal-500/10'
                            : 'border-[#1f2937] bg-[#080b10] hover:border-[#334155]'
                        }`}
                      >
                        <div className="aspect-video bg-black relative">
                          {m.type === 'video' && !m.thumbnailUrl ? (
                            <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                          ) : (
                            <img src={m.thumbnailUrl || m.url} alt={m.title} className="w-full h-full object-cover" />
                          )}
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[9px] text-zinc-200">
                            {m.type === 'video' ? '🎬' : '📷'} {m.duration}
                          </div>
                          <div
                            className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isChecked ? 'bg-teal-400 text-black shadow' : 'bg-black/60 border border-white/60 text-transparent'
                            }`}
                          >
                            ✓
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteUploadedMedia(m.id, e)}
                            className="absolute top-1.5 left-1.5 w-6 h-6 rounded-md bg-black/75 hover:bg-rose-600 text-zinc-200 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete from Gallery"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-2 bg-[#10151d] truncate text-[10px] font-bold text-zinc-200">
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

  // =========================================================================
  // VIEW 3: FULL 4K VIDEO STUDIO WORKSPACE (STAGE 3)
  // Dynamic Collapsible Panels & Expandable Screen, Split Playhead, Color Grading
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 bg-[#0c0f12] text-zinc-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Hidden file input for adding to Media Gallery pool */}
      <input
        ref={multiFileInputRef}
        type="file"
        multiple
        accept="video/*,image/*"
        className="hidden"
        onChange={(e) => handleUserDeviceUpload(e, false)}
      />

      {/* TOP APPLICATION BAR */}
      <div className="h-9 bg-[#101417] border-b border-[#21262d] flex items-center justify-between px-2 sm:px-3 shrink-0 text-zinc-300 overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-85"
            onClick={() => {
              saveCurrentProjectToStorage();
              setStudioView('welcome');
            }}
            title="Return to Studio Home"
          >
            <div className="w-4 h-4 rounded bg-teal-400 text-black flex items-center justify-center font-black text-[10px]">
              ▶
            </div>
            <span className="font-extrabold text-white text-xs tracking-tight">CineStudio 4K</span>
          </div>

          <button
            type="button"
            onClick={() => {
              saveCurrentProjectToStorage();
              setStudioView('welcome');
            }}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 flex items-center gap-1 cursor-pointer"
            title="Home"
          >
            <Home className="w-3 h-3 text-teal-400" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              saveCurrentProjectToStorage();
              openNewProjectSetup(undefined, 'Project');
            }}
            className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#bef264] to-[#38bdf8] text-black font-extrabold text-[11px] flex items-center gap-1 shadow hover:opacity-95 cursor-pointer"
            title="Create New Project"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>New Project</span>
          </button>

          {/* Format Badge */}
          <div
            onClick={() => {
              saveCurrentProjectToStorage();
              setStudioView('new_project_setup');
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-teal-300 font-bold text-[10px] cursor-pointer"
            title="Click to change video format"
          >
            <Tv className="w-3 h-3 text-teal-400" />
            <span>{selectedAspectRatio}</span>
            <span className="text-zinc-500 font-normal">({projectResolution})</span>
          </div>

          {/* Quick Panel Toggle Buttons */}
          <div className="h-4 w-px bg-zinc-800 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              isLeftPanelOpen ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Toggle Left Tools Panel (ഇടത് പാനൽ)"
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden sm:inline">{isLeftPanelOpen ? 'Hide Tools' : 'Show Tools'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              isRightPanelOpen ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Toggle Right Inspector Panel (ഇൻസ്പെക്ടർ പാനൽ)"
          >
            <Sliders className="w-3 h-3" />
            <span className="hidden sm:inline">{isRightPanelOpen ? 'Hide Inspector' : 'Inspector'}</span>
          </button>
        </div>

        {/* Center: Editable Project Title with Auto-save */}
        <div className="flex items-center gap-1.5 text-zinc-400 text-xs truncate max-w-xs">
          <input
            type="text"
            value={projectName}
            onChange={(e) => {
              const val = e.target.value;
              setProjectName(val);
              saveCurrentProjectToStorage(undefined, val);
            }}
            className="bg-transparent hover:bg-zinc-800/60 focus:bg-zinc-900 border border-transparent focus:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 font-bold truncate text-xs outline-none transition-colors"
            title="Click to rename project (പേര് മാറ്റുക)"
          />
          <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
        </div>

        {/* Right Tools & Vibrant Teal Export Button */}
        <div className="flex items-center gap-2">
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
            className="px-3.5 py-1 bg-teal-400 hover:bg-teal-300 text-zinc-950 font-black rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow-md transition-all"
          >
            <Download className="w-3 h-3 stroke-[2.5]" />
            <span>Export ({projectResolution})</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => {
              saveCurrentProjectToStorage();
              onBackToStoryboard();
            }}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 cursor-pointer"
            title="Close and Return to Storyboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. UPPER SECTION: EXACT 3-COLUMN HORIZONTAL STUDIO (TOOLS LEFT | PLAYER CENTER | INSPECTOR RIGHT)
          ========================================================================= */}
      <div className="h-[56%] flex flex-row border-b border-[#21262d] overflow-hidden relative shrink-0">
        {/* COLUMN 1: LEFT TOOLS & MEDIA BROWSER */}
        {isLeftPanelOpen && (
          <div className="order-1 w-[36%] sm:w-[37%] min-w-0 md:max-w-[460px] h-full bg-[#171b20] border-r border-[#21262d] flex flex-col shrink-0 transition-all duration-300">
            {/* Top Category Tabs Bar with Live Item Counters */}
            <div className="flex items-center justify-between px-1 border-b border-[#21262d] bg-[#14181d] shrink-0 text-[10px] font-medium text-zinc-400">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                {[
                  { id: 'Filters', label: `Filters`, icon: Palette },
                  { id: 'Audio', label: `Audio`, icon: Music },
                  { id: 'Transitions', label: `Transitions`, icon: SlidersHorizontal },
                  { id: 'Effects', label: `Effects`, icon: Sparkles },
                  { id: 'Titles', label: `Titles`, icon: Type },
                  { id: 'VFX', label: `VFX`, icon: Crosshair },
                  { id: 'Templates', label: `Templates`, icon: Layers },
                  { id: 'Media', label: `Media`, icon: Video },
                  { id: 'Stickers', label: `Stickers`, icon: Smile },
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
                      className={`py-0.5 px-1.5 flex flex-col items-center gap-0.5 cursor-pointer transition-colors relative whitespace-nowrap ${
                        isActive ? 'text-teal-400 font-bold' : 'hover:text-zinc-200'
                      }`}
                    >
                      <IconComp className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${tab.id === 'VFX' && !isActive ? 'text-rose-400' : ''}`} />
                      <span className="text-[9px] sm:text-[10px]">{tab.label}</span>
                      {isActive && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400 rounded-t" />}
                    </button>
                  );
                })}
              </div>

              {/* Collapse Left Panel Button */}
              <button
                type="button"
                onClick={() => setIsLeftPanelOpen(false)}
                className="p-0.5 sm:p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer shrink-0"
                title="Collapse Tools Panel (ഹൈഡ് ചെയ്യുക)"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Sub Layout: Left Tree Sub-sidebar + Main Dynamic Content Column */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Sub-Sidebar */}
              <div className="w-[58px] sm:w-24 bg-[#14181d] border-r border-[#21262d] p-1 sm:p-2 space-y-1 text-[10px] sm:text-[11px] shrink-0 text-zinc-400 overflow-y-auto no-scrollbar">
                <div className="pt-0.5">
                  <div className="flex items-center gap-1 py-1 px-1 text-zinc-200 font-semibold cursor-pointer">
                    <ChevronDown className="w-3 h-3 text-teal-400" />
                    <span className="truncate">{activeTab}</span>
                  </div>
                  <div className="pl-1 space-y-0.5">
                    {(activeTab === 'Filters'
                      ? ['All', 'Cinematic', 'Retro', 'Portrait', 'Nature', 'Black & White', 'Sci-Fi', 'Moody', 'Vivid', 'Anime & Pastel', 'Sunset Gold']
                      : activeTab === 'Audio'
                      ? ['All', 'Funny & Meme SFX', 'Comedy Tracks', 'Cinematic Score', 'Background Music', 'Trailer Hits', 'Upbeat Beat', 'Lo-Fi Chill', 'Electronic', 'Sound Effects']
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
                          className={`py-1 px-1.5 rounded text-[10px] cursor-pointer truncate transition-colors ${
                            isCur ? 'text-teal-400 bg-teal-950/40 font-bold' : 'hover:text-zinc-200 hover:bg-zinc-800/50'
                          }`}
                        >
                          {sub}
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
                    className="w-full py-1.5 bg-zinc-800 hover:bg-teal-500 hover:text-black text-teal-400 font-bold rounded text-[10px] border border-teal-500/30 flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Media</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Content Grid with Feature Guide Banner & Full Details */}
              <div className="flex-1 min-w-0 flex flex-col p-1 sm:p-2 overflow-y-auto no-scrollbar space-y-1.5 sm:space-y-2 min-h-0">
                {/* Search Bar */}
                <div className="relative shrink-0">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setItemRenderLimit(100);
                    }}
                    placeholder={`Search ${activeTab} (${activeTab === 'Media' ? mediaGallery.length : activeTab === 'VFX' ? 1200 : 600})...`}
                    className="w-full bg-[#111418] border border-zinc-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-400"
                  />
                </div>

                {/* Live Guide Banner explaining how the selected feature works */}
                <div className="p-2 rounded-lg bg-teal-950/30 border border-teal-500/30 text-[10px] text-zinc-300 leading-relaxed shrink-0">
                  <div className="flex items-center justify-between font-bold text-teal-300 mb-0.5">
                    <span>
                      {activeTab === 'Transitions' && '✨ ട്രാൻസിഷൻസ് ഗൈഡ് (600 Transitions)'}
                      {activeTab === 'Filters' && '🎨 ഫിൽട്ടറുകൾ ഗൈഡ് (600 Filters)'}
                      {activeTab === 'Audio' && '🎵 ബാഗ്രൗണ്ട് മ്യൂസിക് & SFX (600 Tracks)'}
                      {activeTab === 'Effects' && '🌟 വിഷ്വൽ ഇഫക്റ്റുകൾ (600 Effects)'}
                      {activeTab === 'Titles' && '🔤 ടൈറ്റിൽ സ്റ്റൈലുകൾ (600 Titles)'}
                      {activeTab === 'VFX' && '🔫 സിനിമ ആക്ഷൻ VFX (1,200 Gun, Blood & FX)'}
                      {activeTab === 'Templates' && '🎬 ടെംപ്ലേറ്റുകൾ (600 Templates)'}
                      {activeTab === 'Stickers' && '🏷️ സ്റ്റിക്കറുകൾ & ഇമോജി (600 Stickers)'}
                      {activeTab === 'Media' && `📁 മീഡിയ പൂൾ (${mediaGallery.length} Files)`}
                    </span>
                    {activeTab === 'Effects' && activeEffect && (
                      <button
                        type="button"
                        onClick={() => setActiveEffect(null)}
                        className="text-[9px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
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
                        className="text-[9px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Clear All ({vfxLayers.length})
                      </button>
                    )}
                    {activeTab === 'Stickers' && activeStickers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStickers([]);
                          setSelectedStickerLayerId(null);
                        }}
                        className="text-[9px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Clear ({activeStickers.length})
                      </button>
                    )}
                  </div>
                  <p className="text-[9.5px] text-zinc-400">
                    {activeTab === 'Transitions' &&
                      'ഏതെങ്കിലും ട്രാൻസിഷനിൽ ടച്ച് ചെയ്യുമ്പോൾ തന്നെ മുകളിലെ വീഡിയോ സ്ക്രീനിൽ അത് ലൈവായി പ്രവർത്തിക്കുന്നത് കാണാം. രണ്ട് ക്ലിപ്പുകൾക്കിടയിലും ഓട്ടോമാറ്റിക്കായി ചേർക്കപ്പെടും.'}
                    {activeTab === 'Filters' &&
                      'ഏതെങ്കിലും ഫിൽട്ടർ ക്ലിക്ക് ചെയ്താൽ വീഡിയോയിൽ ഉടൻ നിറം മാറുന്നത് കാണാം. കളർ ഗ്രേഡിംഗ് പാനലും വലത് സൈഡിൽ തുറക്കും.'}
                    {activeTab === 'Audio' &&
                      'ബാഗ്രൗണ്ട് മ്യൂസിക്, കോമഡി, മീം സൗണ്ടുകൾ എന്നിവയിൽ 🔊 ക്ലിക്ക് ചെയ്താൽ അപ്പോൾ തന്നെ ശബ്ദം കേൾക്കാനും ടൈംലൈനിൽ ആഡ് ചെയ്യാനും സാധിക്കും.'}
                    {activeTab === 'Effects' &&
                      'ലൈറ്റ് ലീക്ക്, പാർട്ടിക്കിൾസ്, ഗ്ലിച്ച്, ഫോഗ്, നിയോൺ തുടങ്ങിയ 600 ഇഫക്റ്റുകളിൽ ക്ലിക്ക് ചെയ്താൽ സ്ക്രീനിൽ തത്സമയം അപ്ലൈ ആകും.'}
                    {activeTab === 'Titles' &&
                      'ഏത് ടൈറ്റിലിൽ ക്ലിക്ക് ചെയ്താലും ടൈംലൈനിൽ ചേരും; സ്ക്രീനിലെ റൗണ്ട് ഹാൻഡിൽ വഴി വലിപ്പം കൂട്ടാനും നീക്കാനും വലതു സൈഡിൽ അഡ്ജസ്റ്റ് ചെയ്യാനും സാധിക്കും.'}
                    {activeTab === 'VFX' &&
                      'തോക്കിൽ നിന്നുള്ള വെടിയുണ്ട ശരീരത്തിൽ കയറുന്നത് (Gun→Body), രക്തം തെറിക്കൽ, സ്ഫോടനം, മിന്നൽ തുടങ്ങി 1,200 സിനിമ VFX! ടച്ച് ചെയ്യുമ്പോൾ താഴെ VFX ടൈംലൈനും വലത് സൈഡിൽ റൂട്ട്/സൈസ് അഡ്ജസ്റ്റും വരും.'}
                    {activeTab === 'Templates' &&
                      'റെഡിമെയ്ഡ് ടൈറ്റിൽ, സബ്ടൈറ്റിൽ, ഡയറക്ടർ ക്രെഡിറ്റുകൾ ഒറ്റ ക്ലിക്കിൽ വീഡിയോയിൽ ചേർക്കാം.'}
                    {activeTab === 'Stickers' &&
                      'ഏത് ഇമോജി/സ്റ്റിക്കറിലും ക്ലിക്ക് ചെയ്താൽ താഴെ സെപ്പറേറ്റ് ടൈംലൈനിൽ വരും; സ്ക്രീനിലെ റൗണ്ട് വലയം വലിച്ച് വലുതാക്കാനും ചെറുതാക്കാനും സാധിക്കും.'}
                    {activeTab === 'Media' &&
                      'നിങ്ങൾ അപ്‌ലോഡ് ചെയ്ത ഫോട്ടോകളിലും വീഡിയോകളിലും "+ Add to Timeline" ക്ലിക്ക് ചെയ്ത് എഡിറ്റ് ചെയ്യാം.'}
                  </p>
                </div>

                {/* SECTION 1: FILTERS TAB (600 Items with full details) */}
                {activeTab === 'Filters' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Cinematic Filters &amp; LUTs</span>
                      <span className="text-teal-400">{filteredFilters.length} Items</span>
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
                            }}
                            className={`rounded-lg border overflow-hidden cursor-pointer group transition-all ${
                              isCur
                                ? 'border-teal-400 ring-2 ring-teal-400/50 shadow-md bg-teal-950/30'
                                : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
                            }`}
                          >
                            <div className="aspect-video bg-black overflow-hidden relative">
                              <img
                                src={f.thumbnail}
                                alt={f.name}
                                style={{ filter: f.cssFilter }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              {isCur && (
                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-teal-400 text-black flex items-center justify-center font-bold text-[9px]">
                                  ✓
                                </div>
                              )}
                              <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/80 text-[8px] font-mono text-zinc-300">
                                {f.category}
                              </span>
                            </div>
                            <div className="p-1.5 space-y-0.5">
                              <div className="truncate text-[10px] font-bold text-zinc-200 group-hover:text-teal-300">
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
                          className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          + Load More ({filteredFilters.length - itemRenderLimit} remaining)
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredFilters.length)}
                          className="px-3 py-1.5 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          Show All {filteredFilters.length}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 2: AUDIO TAB (600 Tracks + Real Audio Preview Synthesizer + Details) */}
                {activeTab === 'Audio' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Background Music &amp; Meme SFX</span>
                      <span className="text-teal-400">{filteredAudio.length} Tracks</span>
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
                            }}
                            className={`p-2 rounded-lg border flex items-start justify-between gap-2 cursor-pointer group transition-all ${
                              isCur
                                ? 'bg-emerald-950/40 border-emerald-400 text-emerald-200'
                                : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 text-zinc-300'
                            }`}
                          >
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAudio(a);
                                  playAudioPreview(a);
                                }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-colors ${
                                  isPrev
                                    ? 'bg-amber-400 text-black animate-pulse'
                                    : isCur
                                    ? 'bg-emerald-400 text-black'
                                    : 'bg-zinc-800 text-zinc-300 hover:bg-teal-400 hover:text-black'
                                }`}
                                title="Play Audio Preview"
                              >
                                {isPrev ? <Volume2 className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                              </button>
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-[10px] block truncate">{a.title}</span>
                                <span className="text-[9px] text-teal-400 font-mono block">
                                  {a.category} · {a.bpm} BPM · {a.mood} · {a.duration}
                                </span>
                                <span className="text-[8.5px] text-zinc-400 block leading-snug pt-0.5">
                                  {a.description}
                                </span>
                              </div>
                            </div>
                            {isCur && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[8px] shrink-0">
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
                          className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          + Load More ({filteredAudio.length - itemRenderLimit} remaining)
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredAudio.length)}
                          className="px-3 py-1.5 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          Show All {filteredAudio.length}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 3: TRANSITIONS TAB (600 Live-Animated Transitions with Full Guide Details) */}
                {activeTab === 'Transitions' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Live Video Transitions</span>
                      <span className="text-teal-400">{filteredTransitions.length} Items</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredTransitions.slice(0, itemRenderLimit).map((t) => {
                        const isSel = selectedTransitionId === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleSelectTransition(t)}
                            className={`p-2 rounded-lg border cursor-pointer flex items-start gap-2.5 group transition-all text-left ${
                              isSel
                                ? 'border-teal-400 bg-teal-950/40 ring-1 ring-teal-400/50'
                                : 'border-zinc-800 bg-zinc-900/60 hover:border-teal-400'
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center font-black text-[9px] shrink-0 transition-colors ${
                                isSel
                                  ? 'bg-teal-400 text-black'
                                  : 'bg-zinc-800 text-teal-400 group-hover:bg-teal-400 group-hover:text-black'
                              }`}
                            >
                              <span>{t.icon}</span>
                              <span className="text-[7px] font-mono opacity-80">{t.durationSec}s</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-bold text-zinc-100 truncate">{t.name}</span>
                                <span className="text-[8px] px-1 rounded bg-zinc-800 text-teal-300 font-mono shrink-0">
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
                          className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          + Load More ({filteredTransitions.length - itemRenderLimit} remaining)
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredTransitions.length)}
                          className="px-3 py-1.5 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          Show All {filteredTransitions.length}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 4: EFFECTS TAB (600 Live Canvas VFX Overlays with Full Descriptions) */}
                {activeTab === 'Effects' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Visual Overlays &amp; VFX</span>
                      <span className="text-teal-400">{filteredEffects.length} Items</span>
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
                              }
                            }}
                            className={`p-2 rounded-lg border cursor-pointer flex items-start gap-2 group transition-all text-left ${
                              isCur
                                ? 'border-teal-400 bg-teal-950/40 ring-1 ring-teal-400/50'
                                : 'border-zinc-800 bg-zinc-900/60 hover:border-teal-400'
                            }`}
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                              style={{ backgroundColor: `${eff.accentColor}22`, border: `1px solid ${eff.accentColor}66` }}
                            >
                              <Sparkles className="w-3.5 h-3.5" style={{ color: eff.accentColor }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-bold text-zinc-100 truncate">{eff.name}</span>
                                {isCur && <span className="text-[8px] font-bold text-teal-300">ON ✓</span>}
                              </div>
                              <span className="text-[8px] text-teal-400 font-mono block">{eff.category}</span>
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
                          className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          + Load More ({filteredEffects.length - itemRenderLimit} remaining)
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredEffects.length)}
                          className="px-3 py-1.5 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          Show All {filteredEffects.length}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 5: TITLES TAB (600 Titles with Full Descriptions + Right Inspector Adjust) */}
                {activeTab === 'Titles' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Titles &amp; Lower Thirds</span>
                      <span className="text-teal-400">{filteredTitles.length} Presets</span>
                    </div>
                    <div className="space-y-1.5">
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
                          }}
                          className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-amber-400 cursor-pointer group transition-all text-left space-y-0.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className={`text-xs ${t.styleClass} truncate`}>{t.titleText}</div>
                            <span className="text-[8px] font-mono text-amber-400 shrink-0">{t.category}</span>
                          </div>
                          <div className="text-[9px] text-zinc-300 truncate">{t.subtitleText}</div>
                          <div className="text-[8.5px] text-zinc-400 leading-snug">{t.description}</div>
                        </div>
                      ))}
                    </div>
                    {filteredTitles.length > itemRenderLimit && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit((n) => n + 150)}
                          className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          + Load More ({filteredTitles.length - itemRenderLimit} remaining)
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredTitles.length)}
                          className="px-3 py-1.5 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          Show All {filteredTitles.length}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 5B: CINEMA ACTION VFX TAB (1,200 Gun, Bullet Path, Blood Splatter, Explosion & Movie VFX) */}
                {activeTab === 'VFX' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Cinema Action VFX Library</span>
                      <span className="text-rose-400">{filteredVfxCatalog.length} VFX</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {filteredVfxCatalog.slice(0, itemRenderLimit).map((v) => {
                        const addedCount = vfxLayers.filter((l) => l.vfx.id === v.id).length;
                        return (
                          <div
                            key={v.id}
                            onClick={() => handleAddVfxLayer(v)}
                            className={`p-2 rounded-lg border cursor-pointer flex items-start gap-2 group transition-all text-left ${
                              addedCount > 0
                                ? 'border-rose-400 bg-rose-950/35 ring-1 ring-rose-400/50'
                                : 'border-zinc-800 bg-zinc-900/70 hover:border-rose-400'
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 mt-0.5 shadow"
                              style={{ backgroundColor: `${v.secondaryColor}28`, border: `1px solid ${v.primaryColor}66` }}
                            >
                              {v.emoji}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-bold text-zinc-100 truncate">{v.name}</span>
                                {addedCount > 0 && (
                                  <span className="text-[8px] px-1 rounded bg-rose-500 text-white font-bold shrink-0">
                                    +{addedCount}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[8px] font-mono text-rose-300">
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
                          className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-rose-300 font-bold text-[10px] cursor-pointer"
                        >
                          + Load More ({filteredVfxCatalog.length - itemRenderLimit} remaining)
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredVfxCatalog.length)}
                          className="px-3 py-1.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[10px] cursor-pointer"
                        >
                          Show All {filteredVfxCatalog.length}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 6: TEMPLATES TAB (600 Templates with Full Details) */}
                {activeTab === 'Templates' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Cinematic Templates</span>
                      <span className="text-teal-400">{filteredTemplates.length} Items</span>
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
                          }}
                          className={`rounded-lg border overflow-hidden cursor-pointer hover:border-teal-400 transition-all group ${
                            selectedTemplate.id === tpl.id ? 'border-teal-400 bg-teal-950/30' : 'border-zinc-800 bg-zinc-900'
                          }`}
                        >
                          <div className="aspect-video bg-black relative">
                            <img src={tpl.thumbnail} alt={tpl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/75 text-[9px] font-mono text-zinc-300">
                              {tpl.duration}
                            </div>
                          </div>
                          <div className="bg-[#12161a] p-1.5 space-y-0.5">
                            <div className="truncate text-[10px] font-bold text-zinc-200">{tpl.title}</div>
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
                          className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          + Load More ({filteredTemplates.length - itemRenderLimit} remaining)
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredTemplates.length)}
                          className="px-3 py-1.5 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          Show All {filteredTemplates.length}
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
                        My Gallery Pool ({filteredUserMedia.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => multiFileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded bg-teal-400 hover:bg-teal-300 text-black font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" /> + Upload
                      </button>
                    </div>

                    {filteredUserMedia.length === 0 ? (
                      <div className="p-6 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/60 text-center space-y-2">
                        <div className="w-9 h-9 rounded-full bg-teal-500/10 text-teal-400 mx-auto flex items-center justify-center">
                          <Upload className="w-4 h-4" />
                        </div>
                        <p className="text-[11px] text-zinc-300 font-bold">
                          {isMl ? 'നിങ്ങളുടെ ഗാലറിയിൽ ഫോട്ടോകൾ ചേർത്തിട്ടില്ല' : 'No Gallery Media Added Yet'}
                        </p>
                        <button
                          type="button"
                          onClick={() => multiFileInputRef.current?.click()}
                          className="px-3 py-1 bg-teal-400 text-black font-extrabold rounded text-[10px] cursor-pointer"
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
                              className={`px-3 py-0.5 rounded-full font-bold cursor-pointer transition-colors ${
                                mediaFilter === cat ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'
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
                              className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden relative group transition-all"
                            >
                              <div className="aspect-video bg-black relative">
                                {m.type === 'video' && !m.thumbnailUrl ? (
                                  <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                                ) : (
                                  <img src={m.thumbnailUrl || m.url} alt={m.title} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/80 font-mono text-[9px] text-zinc-300">
                                  {m.type === 'video' ? '🎬' : '📷'} {m.duration}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteUploadedMedia(m.id, e)}
                                  className="absolute top-1 left-1 w-4 h-4 rounded bg-black/70 hover:bg-rose-600 text-zinc-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete from Gallery"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <div className="p-1.5 bg-[#12161b] space-y-1">
                                <span className="font-bold text-[10px] text-zinc-200 block truncate">{m.title}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleAddMediaToTimeline(m, e)}
                                  className="w-full py-1 bg-teal-400 hover:bg-teal-300 text-black font-extrabold rounded text-[9px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow"
                                >
                                  <Plus className="w-2.5 h-2.5 stroke-[3]" />
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

                {/* SECTION 8: STICKERS TAB (600 Interactive Canvas Stickers) */}
                {activeTab === 'Stickers' && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">
                      <span>Animated Badges &amp; Stickers</span>
                      <span className="text-teal-400">{filteredStickers.length} Items</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {filteredStickers.slice(0, itemRenderLimit).map((stk) => {
                        const addedCount = activeStickers.filter((s) => s.sticker.id === stk.id).length;
                        return (
                          <div
                            key={stk.id}
                            onClick={() => handleAddStickerLayer(stk)}
                            className={`p-2 rounded border cursor-pointer flex flex-col items-center justify-center text-center group transition-all ${
                              addedCount > 0
                                ? 'border-teal-400 bg-teal-950/40 ring-1 ring-teal-400/50'
                                : 'border-zinc-800 bg-zinc-900 hover:border-teal-400'
                            }`}
                          >
                            <span className="text-xl mb-1 group-hover:scale-125 transition-transform">{stk.emoji}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${stk.colorClass} truncate w-full`}>
                              {stk.badgeText}
                            </span>
                            <span className="text-[8.5px] font-bold text-zinc-300 truncate w-full mt-0.5">{stk.name}</span>
                            <span className="text-[8px] text-zinc-400 line-clamp-2 w-full mt-0.5">{stk.description}</span>
                          </div>
                        );
                      })}
                    </div>
                    {filteredStickers.length > itemRenderLimit && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit((n) => n + 150)}
                          className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          + Load More ({filteredStickers.length - itemRenderLimit} remaining)
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemRenderLimit(filteredStickers.length)}
                          className="px-3 py-1.5 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          Show All {filteredStickers.length}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Floating Reopen Button for Left Panel */}
        {!isLeftPanelOpen && (
          <button
            type="button"
            onClick={() => setIsLeftPanelOpen(true)}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-r-xl bg-zinc-800/90 hover:bg-teal-500 hover:text-black border border-l-0 border-zinc-700 text-teal-300 shadow-xl backdrop-blur cursor-pointer transition-all"
            title="Open Tools Panel (ടൂളുകൾ തുറക്കുക)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* -----------------------------------------------------------------
            COLUMN 2: EXACT CENTER VIDEO PLAYER (WITH ON-SCREEN ROUND HANDLES & VFX ROUTE)
            ----------------------------------------------------------------- */}
        <div className="order-2 flex-1 min-w-[26%] h-full bg-[#0b0e12] flex flex-col justify-between overflow-hidden relative transition-all duration-300">
          {/* Top Status Bar */}
          <div className="h-6 sm:h-7 px-2 sm:px-3 bg-[#101417] border-b border-[#21262d] flex items-center justify-between text-[9px] sm:text-[11px] text-zinc-400 shrink-0">
            <div className="flex items-center gap-1 sm:gap-2 truncate">
              <span className="font-semibold text-zinc-200">Player</span>
              <span className="text-zinc-400">{projectResolution}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 truncate">
              <span className="text-[8px] sm:text-[10px] font-bold text-teal-400 bg-teal-950/60 border border-teal-500/40 px-1 py-0.2 rounded">
                {selectedAspectRatio}
              </span>
              <span className="text-[8px] sm:text-[10px] font-mono text-zinc-400 truncate hidden sm:inline">{activeFilter.name}</span>
              {playbackSpeed !== 1.0 && (
                <span className="text-[8px] sm:text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/40 px-1 rounded">
                  {playbackSpeed}x
                </span>
              )}
            </div>
          </div>

          {/* Centered Canvas Screen WITH On-Screen Interactive Round Transform & VFX Route Handles */}
          <div
            onClick={() => {
              if (!canvasDragStateRef.current) handleTogglePlay();
            }}
            className="flex-1 min-h-0 flex items-center justify-center p-1 sm:p-2 relative overflow-hidden bg-black cursor-pointer group"
            title="Click to Play / Pause Video (ക്ലിക്ക് ചെയ്ത് പ്ലേ / പോസ് ചെയ്യുക)"
          >
            <div
              ref={canvasOverlayRef}
              onPointerMove={(e) => {
                const drag = canvasDragStateRef.current;
                const overlay = canvasOverlayRef.current;
                if (!drag || !overlay) return;
                e.stopPropagation();
                const rect = overlay.getBoundingClientRect();
                const px = Math.max(2, Math.min(98, ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100));
                const py = Math.max(2, Math.min(98, ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100));
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
              className="relative inline-flex items-center justify-center max-w-full max-h-full touch-none select-none"
            >
              <canvas
                ref={playerCanvasRef}
                width={canvasDims.width}
                height={canvasDims.height}
                className="block max-w-full max-h-full w-auto h-auto object-contain rounded border border-zinc-800 shadow-2xl pointer-events-none"
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
                    style={{ left: `${stkLayer.xPct}%`, top: `${stkLayer.yPct}%`, width: `${Math.max(54, 72 * stkLayer.scale)}px`, height: `${Math.max(30, 34 * stkLayer.scale)}px` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-move transition-shadow ${
                      isSelected
                        ? 'rounded-full border-2 border-dashed border-teal-400 bg-teal-400/10 shadow-[0_0_12px_rgba(45,212,191,0.55)]'
                        : 'rounded-full border border-transparent hover:border-teal-400/50'
                    }`}
                    title="Drag to move or pull round corner dots to resize (വലിപ്പം കൂട്ടാനും നീക്കാനും)"
                  >
                    {isSelected && (
                      <>
                        {/* Round Corner Resize Handle (Bottom-Right & Top-Left) */}
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
                          title="Drag circle to resize"
                        />
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
                          className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-white border-2 border-teal-400 shadow-lg cursor-nwse-resize"
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
                  style={{ left: `${titleXPct}%`, top: `${titleYPct}%`, width: `${Math.max(85, 130 * titleScale)}px`, height: `${Math.max(36, 48 * titleScale)}px` }}
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

              {/* ON-SCREEN ROUND HANDLE GIZMOS: 3) Selected VFX Motion Route (🔫 Gun Start -> 🩸 Hit Target) + Size Ring */}
              {(() => {
                const activeVfxObj = vfxLayers.find((v) => v.id === selectedVfxLayerId);
                if (!activeVfxObj) return null;
                return (
                  <>
                    {/* Flight trajectory SVG dashed arrow */}
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

                    {/* Start Round Handle (Gun / Source Point) */}
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
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-amber-400/90 border-2 border-white shadow-[0_0_12px_rgba(251,191,36,0.9)] flex items-center justify-center cursor-move text-[10px] font-black text-black"
                      title="Drag Start Point onto Gun Barrel (തോക്കിന്റെ ഭാഗത്ത് വെക്കുക)"
                    >
                      🔫
                    </div>

                    {/* End Target Round Handle (Body Hit / Impact Target) */}
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
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-rose-600/95 border-2 border-white shadow-[0_0_12px_rgba(225,29,72,0.95)] flex items-center justify-center cursor-move text-[10px] font-black text-white"
                        title="Drag Target Point onto Character Body (ഉണ്ട കയറേണ്ട ശരീര ഭാഗത്ത് വെക്കുക)"
                      >
                        🎯
                      </div>
                    )}

                    {/* Outer Round Size Handle */}
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setIsPlaying(false);
                        const overlay = canvasOverlayRef.current?.getBoundingClientRect();
                        if (!overlay) return;
                        const ox = overlay.left + (activeVfxObj.startXPct / 100) * overlay.width;
                        const oy = overlay.top + (activeVfxObj.startYPct / 100) * overlay.height;
                        canvasDragStateRef.current = {
                          mode: 'vfx_scale',
                          id: activeVfxObj.id,
                          initScale: activeVfxObj.scale,
                          originX: ox,
                          originY: oy,
                          initDist: Math.hypot(e.clientX - ox, e.clientY - oy),
                        };
                        try {
                          canvasOverlayRef.current?.setPointerCapture(e.pointerId);
                        } catch {}
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        left: `${Math.min(96, activeVfxObj.startXPct + 8 * activeVfxObj.scale)}%`,
                        top: `${Math.min(96, activeVfxObj.startYPct + 8 * activeVfxObj.scale)}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-30 w-4 h-4 rounded-full bg-teal-400 border-2 border-white shadow cursor-nwse-resize"
                      title="Drag circle to resize VFX (വലിപ്പം കൂട്ടാൻ/കുറയ്ക്കാൻ)"
                    />
                  </>
                );
              })()}

              {/* Play / Pause overlay */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none ${
                  isPlaying ? 'opacity-0 group-hover:opacity-70' : 'opacity-100'
                }`}
              >
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-black/60 border border-white/40 flex items-center justify-center text-white shadow-2xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                  {isPlaying ? <Pause className="w-4 h-4 sm:w-6 sm:h-6 fill-white" /> : <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-white ml-0.5" />}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Player Controls */}
          <div className="bg-[#101417] border-t border-[#21262d] px-1.5 sm:px-3 py-1 flex flex-col gap-0.5 shrink-0">
            {/* Scrubber Progress Bar */}
            <div className="relative w-full flex items-center cursor-pointer group">
              <input
                ref={playerRangeRef}
                type="range"
                min="0"
                max={Math.max(0.1, totalDuration)}
                step="0.05"
                value={Math.min(currentTimeSec, Math.max(0.1, totalDuration))}
                disabled={totalDuration <= 0}
                onChange={(e) => seekToTime(Number(e.target.value))}
                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-teal-400 group-hover:h-1.5 transition-all disabled:opacity-40"
              />
            </div>

            {/* Transport Bar */}
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-zinc-300 gap-1">
              <div className="flex items-center gap-1 sm:gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => seekToTime(0)}
                  className="hover:text-teal-400 cursor-pointer shrink-0"
                  title="Jump to Start"
                >
                  <SkipBack className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="p-0.5 sm:p-1 rounded-full bg-teal-400 text-black hover:bg-teal-300 cursor-pointer shadow shrink-0"
                >
                  {isPlaying ? <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-black ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => seekToTime(totalDuration)}
                  className="hover:text-teal-400 cursor-pointer shrink-0"
                  title="Jump to End"
                >
                  <SkipForward className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>

                <div className="font-mono text-[8px] sm:text-[10px] text-zinc-300 truncate">
                  <span ref={playerTimecodeRef} className="text-teal-400">{formatTimecode(currentTimeSec)}</span>
                  <span className="text-zinc-600 hidden sm:inline"> / {formatTimecode(totalDuration)}</span>
                </div>
              </div>

              {/* Right Player Tools */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    handleSplitClipAtPlayhead();
                  }}
                  className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white text-[8px] sm:text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors"
                  title="Split Video at Playhead (കത്രിക ചിഹ്നം - വീഡിയോ രണ്ടാക്കുക)"
                >
                  <Scissors className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                  <span className="hidden sm:inline">Split</span>
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
                  className="hover:text-teal-400 cursor-pointer hidden sm:inline-flex"
                  title="Snapshot Camera"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setIsMuted(!isMuted)} className="hover:text-white cursor-pointer">
                    {isMuted || volume === 0 ? <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" /> : <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-8 sm:w-12 h-1 accent-teal-400 cursor-pointer hidden sm:block"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      playerCanvasRef.current?.requestFullscreen();
                    } else {
                      document.exitFullscreen();
                    }
                  }}
                  className="hover:text-white cursor-pointer"
                  title="Fullscreen"
                >
                  <Maximize className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Reopen Button for Right Panel */}
        {!isRightPanelOpen && (
          <button
            type="button"
            onClick={() => setIsRightPanelOpen(true)}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-l-xl bg-zinc-800/90 hover:bg-teal-500 hover:text-black border border-r-0 border-zinc-700 text-teal-300 shadow-xl backdrop-blur cursor-pointer transition-all"
            title="Open Inspector / Color Panel (ഇൻസ്പെക്ടർ തുറക്കുക)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* -----------------------------------------------------------------
            COLUMN 3: RIGHT PROPERTIES & CONTEXTUAL LIVE INSPECTOR (ALWAYS RIGHT OF VIDEO)
            ----------------------------------------------------------------- */}
        {isRightPanelOpen && (
          <div className="order-3 w-[27%] sm:w-[28%] min-w-0 md:max-w-[360px] h-full bg-[#14181d] border-l border-[#21262d] flex flex-col shrink-0 transition-all duration-300">
            {/* Header Tabs with Collapse Button */}
            <div className="flex items-center justify-between border-b border-[#21262d] bg-[#101417] shrink-0">
              <div className="flex-1 grid grid-cols-5 text-[8px] sm:text-[10.5px] font-semibold text-center text-zinc-400">
                {(['adjust', 'video', 'color', 'speed', 'audio'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveInspectorTab(tab)}
                    className={`py-1.5 sm:py-2 capitalize cursor-pointer transition-colors relative truncate ${
                      activeInspectorTab === tab ? 'text-teal-400 font-bold' : 'hover:text-zinc-200'
                    }`}
                  >
                    {tab}
                    {activeInspectorTab === tab && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400" />}
                  </button>
                ))}
              </div>

              {/* Collapse Right Panel Button */}
              <button
                type="button"
                onClick={() => setIsRightPanelOpen(false)}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer mr-1 shrink-0"
                title="Collapse Inspector (ഹൈഡ് ചെയ്യുക)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-2 sm:p-3 space-y-3">
              {/* TAB 0: CONTEXTUAL FEATURE ADJUST & TIMELINE INSPECTOR (Opens automatically for ANY selected feature!) */}
              {activeInspectorTab === 'adjust' && (() => {
                const selVfx = vfxLayers.find((v) => v.id === selectedVfxLayerId);
                const selStk = activeStickers.find((s) => s.id === selectedStickerLayerId);
                const effectiveType =
                  selVfx && selectedFeatureType === 'vfx'
                    ? 'vfx'
                    : selStk && selectedFeatureType === 'sticker'
                    ? 'sticker'
                    : selectedFeatureType;

                return (
                  <div className="space-y-3 text-[10.5px]">
                    {/* Feature Selector Pills so user can switch live between active layers */}
                    <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-2">
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
                    {(effectiveType === 'effect' || effectiveType === 'transition' || effectiveType === 'clip' || (!selVfx && effectiveType === 'vfx') || (!selStk && effectiveType === 'sticker')) && (
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
                            className="py-1.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[9.5px] cursor-pointer"
                          >
                            + Add 1200 VFX
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('Stickers');
                              setIsLeftPanelOpen(true);
                            }}
                            className="py-1.5 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[9.5px] cursor-pointer"
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
                        setColorVignette(25);
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

                  {/* 600 COLOR GRADING LUT PRESETS LIST */}
                  <div className="space-y-2 border-t border-zinc-800 pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-300 text-[10px] uppercase tracking-wider">
                        Color Grading Presets ({filteredColorGrades.length})
                      </span>
                      <span className="text-[9px] text-zinc-400">Tap to apply LUT</span>
                    </div>
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2 top-1.5 text-zinc-500" />
                      <input
                        type="text"
                        value={colorGradeSearch}
                        onChange={(e) => {
                          setColorGradeSearch(e.target.value);
                          setColorGradeLimit(60);
                        }}
                        placeholder="Search 600 color grades..."
                        className="w-full bg-[#101417] border border-zinc-800 rounded pl-7 pr-2 py-1 text-[10px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-400"
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
                            }}
                            className={`p-1.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                              isCur
                                ? 'border-teal-400 bg-teal-950/40'
                                : 'border-zinc-800 bg-[#101417] hover:border-teal-500/60'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded bg-gradient-to-br ${cg.swatchGradient} shrink-0 border border-white/20`} />
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
                          className="w-full py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-teal-300 font-bold text-[10px] cursor-pointer"
                        >
                          + Load More Color Grades ({filteredColorGrades.length - colorGradeLimit} left)
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

      {/* =========================================================================
          3. LOWER TIMELINE & MULTI-TRACK CONTROLS
          ========================================================================= */}
      <div className="flex-1 bg-[#101417] flex flex-col overflow-hidden">
        {/* Timeline Action Toolbar */}
        <div className="h-9 border-b border-[#21262d] px-2 sm:px-3 flex items-center justify-between bg-[#14181d] text-zinc-400 shrink-0 overflow-x-auto no-scrollbar gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Split Scissors Button */}
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                handleSplitClipAtPlayhead();
              }}
              className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/40 flex items-center gap-1 cursor-pointer font-bold text-[10px] transition-colors"
              title="Split Clip at Playhead (കത്രിക ചിഹ്നം - വീഡിയോ രണ്ടാക്കുക)"
            >
              <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Split</span>
            </button>

            {/* Range Cut / Scroll-and-Cut Controls */}
            {cutRangeStartSec === null ? (
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCutRangeStartSec(currentTimeRef.current);
                }}
                disabled={timelineClips.length === 0}
                className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-400 hover:text-black disabled:opacity-40 text-amber-300 border border-amber-500/40 flex items-center gap-1 cursor-pointer font-bold text-[10px] transition-colors"
                title="Mark Cut Start, drag red line right while watching video, then cut (കട്ട് തുടക്കം അടയാളപ്പെടുത്തുക)"
              >
                <Crop className="w-3 h-3" />
                <span>Mark Cut</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-rose-950/70 border border-rose-500/60 rounded px-1.5 py-0.5">
                <span className="text-[9px] font-mono text-amber-300 font-bold">
                  {Math.min(cutRangeStartSec, currentTimeSec).toFixed(1)}s–{Math.max(cutRangeStartSec, currentTimeSec).toFixed(1)}s
                </span>
                <button
                  type="button"
                  onClick={() => handleRangeCutAction('remove_middle')}
                  className="px-1.5 py-0.5 rounded bg-rose-500 hover:bg-rose-400 text-white font-bold text-[9px] cursor-pointer"
                  title="Remove selected section (തിരഞ്ഞെടുത്ത ഭാഗം കട്ട് ചെയ്ത് കളയുക)"
                >
                  ✂ Cut Out
                </button>
                <button
                  type="button"
                  onClick={() => handleRangeCutAction('split_both')}
                  className="px-1.5 py-0.5 rounded bg-teal-400 hover:bg-teal-300 text-black font-bold text-[9px] cursor-pointer"
                  title="Split both ends (രണ്ടറ്റവും കട്ട് ചെയ്യുക)"
                >
                  Split A-B
                </button>
                <button
                  type="button"
                  onClick={() => handleRangeCutAction('keep_only')}
                  className="px-1.5 py-0.5 rounded bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-[9px] cursor-pointer"
                  title="Keep only selected section (ഈ ഭാഗം മാത്രം വെക്കുക)"
                >
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => setCutRangeStartSec(null)}
                  className="p-0.5 text-zinc-400 hover:text-white cursor-pointer"
                  title="Cancel Mark Cut"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Delete Active Selected Layer or Clip */}
            <button
              type="button"
              onClick={() => {
                if (selectedFeatureType === 'vfx' && selectedVfxLayerId) {
                  setVfxLayers((prev) => prev.filter((v) => v.id !== selectedVfxLayerId));
                  setSelectedVfxLayerId(null);
                  setSelectedFeatureType('clip');
                  return;
                }
                if (selectedFeatureType === 'sticker' && selectedStickerLayerId) {
                  setActiveStickers((prev) => prev.filter((s) => s.id !== selectedStickerLayerId));
                  setSelectedStickerLayerId(null);
                  setSelectedFeatureType('clip');
                  return;
                }
                if (selectedFeatureType === 'title' && showTitleOverlay) {
                  setShowTitleOverlay(false);
                  setMovieTitle('');
                  setSubtitle('');
                  setSelectedFeatureType('clip');
                  return;
                }
                if (selectedFeatureType === 'effect' && activeEffect) {
                  setActiveEffect(null);
                  setSelectedFeatureType('clip');
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
              className="p-1 rounded hover:bg-zinc-800 hover:text-rose-400 cursor-pointer"
              title="Delete Selected Item (തിരഞ്ഞെടുത്തത് ഡിലീറ്റ് ചെയ്യുക)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Duplicate Clip */}
            <button
              type="button"
              onClick={() => {
                const cur = timelineClips[activeClipIndex];
                if (!cur) return;
                const copy = [...timelineClips, { ...cur, id: `clip_dup_${Date.now()}` }];
                setTimelineClips(copy);
                saveCurrentProjectToStorage(copy);
              }}
              className="p-1 rounded hover:bg-zinc-800 hover:text-white cursor-pointer"
              title="Duplicate Clip"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Rotate 90 */}
            <button
              type="button"
              onClick={() => setRotationDeg((r) => (r + 90) % 360)}
              className="p-1 rounded hover:bg-zinc-800 hover:text-white cursor-pointer"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-zinc-800 mx-0.5" />

            <button
              type="button"
              onClick={() => {
                setActiveTab('Media');
                setIsLeftPanelOpen(true);
              }}
              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-teal-500 hover:text-black text-teal-400 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>+ Add Media from Pool</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-500 font-mono">Zoom</span>
            <input
              type="range"
              min="0.6"
              max="3.5"
              step="0.1"
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(Number(e.target.value))}
              className="w-16 h-1 accent-teal-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Multi-Track Canvas & Clips View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Track Headers (Left) — Stacked Separate Tracks below Video 1 */}
          <div className="w-[74px] sm:w-28 bg-[#0d1014] border-r border-[#21262d] flex flex-col shrink-0 text-[9px] sm:text-[10px] font-mono text-zinc-400 overflow-y-auto no-scrollbar">
            <div className="h-6 border-b border-[#21262d] px-2 flex items-center justify-between bg-[#12161b] shrink-0">
              <span>Tracks</span>
              <Layers className="w-3 h-3 text-zinc-500" />
            </div>

            {/* Track 1: Title Header */}
            <div className="h-9 border-b border-[#21262d] px-2 flex items-center justify-between bg-[#101418] shrink-0">
              <div className="flex items-center gap-1 truncate">
                <Type className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Title</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTitleOverlay(!showTitleOverlay)}
                className="cursor-pointer hover:text-white"
                title={showTitleOverlay ? 'Hide Titles' : 'Show Titles'}
              >
                {showTitleOverlay ? <Eye className="w-3 h-3 text-amber-400" /> : <EyeOff className="w-3 h-3 text-zinc-600" />}
              </button>
            </div>

            {/* Track 2: Video Header */}
            <div className="h-14 border-b border-[#21262d] px-2 flex items-center justify-between bg-[#101418] shrink-0">
              <div className="flex items-center gap-1 truncate">
                <Video className="w-3 h-3 text-teal-400 shrink-0" />
                <span>Video 1</span>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoTrackVisible(!isVideoTrackVisible)}
                className="cursor-pointer hover:text-white"
                title="Toggle Video Visibility"
              >
                {isVideoTrackVisible ? <Eye className="w-3 h-3 text-teal-400" /> : <EyeOff className="w-3 h-3 text-zinc-600" />}
              </button>
            </div>

            {/* Track 3: Stickers / Emoji Header (Below Video 1) */}
            <div className="h-9 border-b border-[#21262d] px-2 flex items-center justify-between bg-[#101418] shrink-0">
              <div className="flex items-center gap-1 truncate">
                <Smile className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">Emoji</span>
              </div>
              <span className="text-[8px] text-cyan-400">{activeStickers.length}</span>
            </div>

            {/* Track 4: VFX Action Header (Below Video 1) */}
            <div className="h-9 border-b border-[#21262d] px-2 flex items-center justify-between bg-[#101418] shrink-0">
              <div className="flex items-center gap-1 truncate">
                <Crosshair className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">VFX</span>
              </div>
              <span className="text-[8px] text-rose-400">{vfxLayers.length}</span>
            </div>

            {/* Track 5: Audio Header with Mute */}
            <div className="h-9 border-b border-[#21262d] px-2 flex items-center justify-between bg-[#101418] shrink-0">
              <div className="flex items-center gap-1 truncate">
                <Music className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Audio 1</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAudioTrackMuted(!isAudioTrackMuted)}
                className="cursor-pointer hover:text-white"
                title="Mute Audio Track"
              >
                {isAudioTrackMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </button>
            </div>
          </div>

          {/* Timeline Sequence Body (Drag red line, ruler, or lower scrub zone to play/scrub live!) */}
          <div
            ref={timelineContainerRef}
            onPointerDown={(e) => {
              // Allow dragging anywhere on empty timeline space to scrub smoothly
              const target = e.target as HTMLElement;
              if (target.closest('button') || target.closest('[data-clip-card="true"]')) return;
              isScrubbingRef.current = true;
              setIsScrubbingTimeline(true);
              setIsPlaying(false);
              try {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              } catch {}
              seekFromClientX(e.clientX);
            }}
            onPointerMove={(e) => {
              if (!isScrubbingRef.current) return;
              seekFromClientX(e.clientX);
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
            className="flex-1 flex flex-col overflow-x-auto no-scrollbar relative bg-[#090b0e] cursor-pointer"
          >
            {/* Time Ruler (Drag left/right with finger/mouse to scrub video live) */}
            <div className="h-6 border-b border-[#21262d] flex items-center px-2 text-[9px] font-mono text-zinc-500 bg-[#0d1014] select-none shrink-0 min-w-max touch-none cursor-ew-resize">
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

            {/* DRAGGABLE Red Vertical Playhead Line WITH Central Scissors Cut + Bottom Finger Grab Handle */}
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
                seekFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (!isScrubbingRef.current) return;
                e.stopPropagation();
                seekFromClientX(e.clientX);
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
              title="Drag left or right to scrub video live & cut (കൈകൊണ്ട് അങ്ങോട്ടും ഇങ്ങോട്ടും നീക്കി വീഡിയോ കണ്ട് കട്ട് ചെയ്യുക)"
            >
              {/* Visible Red Vertical Center Line */}
              <div className="w-[2.5px] h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] pointer-events-none" />

              {/* Top Ruler Red Knob + Live Timecode Badge */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                <div className="w-4 h-4 bg-rose-500 rounded-b-md border border-white/80 shadow-md flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                {isScrubbingTimeline && (
                  <div className="mt-0.5 px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono font-bold text-[9px] shadow-lg whitespace-nowrap border border-white/60">
                    {currentTimeSec.toFixed(1)}s
                  </div>
                )}
              </div>

              {/* Prominent Scissors Cut Icon directly ON the Red Playhead Line */}
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  handleSplitClipAtPlayhead();
                }}
                className="absolute top-[48%] -translate-y-1/2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.9)] flex items-center justify-center cursor-pointer z-40 border-2 border-white transition-transform hover:scale-110 active:scale-95"
                title="Split Video at Red Line (കത്രിക ചിഹ്നം - വീഡിയോ രണ്ടാക്കുക)"
              >
                <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Lower Finger Drag Pill (Inside Lower Timeline Area for effortless thumb scrubbing) */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-1 rounded-full bg-rose-600/95 border border-white/80 text-white shadow-[0_0_14px_rgba(244,63,94,0.85)] flex items-center gap-0.5 text-[8px] font-black pointer-events-none whitespace-nowrap">
                <span>◀</span>
                <span className="w-1 h-2.5 bg-white/90 rounded-full mx-0.5" />
                <span>▶</span>
              </div>
            </div>

            {/* Tracks Container — Separate Dedicated Timelines for Title, Video 1, Emoji/Stickers, VFX, and Audio 1 */}
            <div className="flex-1 flex flex-col min-w-max">
              {/* Track 1: Titles Bar (Positioned at titleStartSec, selectable + deletable) */}
              <div className="h-9 border-b border-[#181c22] relative px-2 flex items-center">
                {showTitleOverlay && movieTitle ? (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFeatureType('title');
                      setActiveInspectorTab('adjust');
                      setIsRightPanelOpen(true);
                    }}
                    className={`h-7 rounded px-2 flex items-center justify-between text-[10px] font-bold cursor-pointer truncate absolute ${
                      selectedFeatureType === 'title'
                        ? 'bg-amber-500/35 border-2 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                        : 'bg-amber-500/20 border border-amber-400/70 text-amber-300 hover:bg-amber-500/30'
                    }`}
                    style={{
                      left: `${8 + titleStartSec * pxPerSec}px`,
                      width: `${Math.max(58, titleDurationSec * pxPerSec)}px`,
                    }}
                  >
                    <div className="flex items-center gap-1 truncate">
                      <Type className="w-3 h-3 shrink-0" />
                      <span className="truncate">{movieTitle}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTitleOverlay(false);
                        setMovieTitle('');
                        setSubtitle('');
                      }}
                      className="p-0.5 rounded hover:bg-rose-600 text-rose-300 hover:text-white ml-1 shrink-0 cursor-pointer"
                      title="Delete Title"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('Titles');
                      setIsLeftPanelOpen(true);
                    }}
                    className="h-6 px-2.5 rounded border border-dashed border-zinc-700/80 text-[9px] text-zinc-500 hover:text-amber-300 hover:border-amber-400/50 cursor-pointer flex items-center gap-1"
                  >
                    <Type className="w-2.5 h-2.5" />
                    <span>+ Add Title</span>
                  </button>
                )}
              </div>

              {/* Track 2: Video & Photo Clips in Continuous Sequence */}
              <div className="h-14 border-b border-[#181c22] relative px-2 flex items-center">
                {timelineClips.length === 0 ? (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('Media');
                      setIsLeftPanelOpen(true);
                    }}
                    className="h-11 px-4 rounded border border-dashed border-zinc-700 bg-zinc-900/60 flex items-center gap-2 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-teal-400" />
                    <span>+ ഗാലറി മീഡിയ പൂളിൽ നിന്ന് ക്ലിപ്പ് ചേർക്കുക</span>
                  </div>
                ) : (
                  timelineClips.map((clip, idx) => {
                    return (
                      <React.Fragment key={clip.id}>
                        {/* Clip Card */}
                        <div
                          data-clip-card="true"
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
                            seekFromClientX(e.clientX);
                          }}
                          onPointerMove={(e) => {
                            if (!isScrubbingRef.current) return;
                            e.stopPropagation();
                            seekFromClientX(e.clientX);
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
                          className={`h-11 rounded border flex items-center p-1.5 gap-2 cursor-pointer transition-all relative overflow-hidden group shrink-0 touch-none ${
                            activeClipIndex === idx && selectedFeatureType === 'clip'
                              ? 'bg-teal-950/70 border-teal-400 ring-2 ring-teal-400/50 shadow-md z-10'
                              : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'
                          }`}
                          style={{ width: `${Math.max(24, clip.durationSec * pxPerSec)}px` }}
                        >
                          <div className="w-9 h-8 rounded bg-black shrink-0 overflow-hidden">
                            {clip.type === 'video' && !clip.thumbnailUrl ? (
                              <video src={clip.url} className="w-full h-full object-cover" muted playsInline />
                            ) : clip.thumbnailUrl || clip.url ? (
                              <img src={clip.thumbnailUrl || clip.url} alt={clip.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                <Film className="w-3 h-3 text-zinc-500" />
                              </div>
                            )}
                          </div>
                          <div className="truncate text-left">
                            <span className="font-bold text-[10px] text-zinc-200 block truncate">{clip.title}</span>
                            <span className="text-[8px] font-mono text-zinc-400">
                              {clip.type === 'video' ? '🎬' : '📷'} {clip.durationSec}s
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = timelineClips.filter((_, cIdx) => cIdx !== idx);
                              setTimelineClips(next);
                              setActiveClipIndex(Math.max(0, idx - 1));
                              saveCurrentProjectToStorage(next);
                            }}
                            className="absolute top-1 right-1 p-0.5 rounded bg-black/70 hover:bg-rose-600 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete this clip"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Zero-width Transition Connector */}
                        {idx < timelineClips.length - 1 && (
                          <div className="relative w-0 flex items-center justify-center z-20 overflow-visible">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab('Transitions');
                                setIsLeftPanelOpen(true);
                                setActiveTransitionBetween(idx);
                              }}
                              className={`px-1.5 py-1 rounded border flex items-center gap-0.5 text-[8px] font-mono cursor-pointer transition-all shadow-lg ${
                                clipTransitions[idx]
                                  ? 'bg-amber-500/90 border-amber-300 text-black font-bold'
                                  : 'bg-zinc-800/95 hover:bg-teal-400 hover:text-black border-zinc-500 text-zinc-200'
                              }`}
                              title={`Transition: ${clipTransitions[idx] || 'Click to select transition'}`}
                            >
                              <SlidersHorizontal className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('Media');
                    setIsLeftPanelOpen(true);
                  }}
                  className="h-11 ml-2 px-3 rounded bg-zinc-800 hover:bg-zinc-700 border border-dashed border-zinc-600 text-teal-400 font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Clip</span>
                </button>
              </div>

              {/* Track 3: Separate Emoji / Stickers Timeline Track BELOW Video 1 */}
              <div className="h-9 border-b border-[#181c22] relative px-2 flex items-center">
                {activeStickers.length === 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('Stickers');
                      setIsLeftPanelOpen(true);
                    }}
                    className="h-6 px-2.5 rounded border border-dashed border-zinc-700/80 text-[9px] text-zinc-500 hover:text-cyan-300 hover:border-cyan-400/50 cursor-pointer flex items-center gap-1"
                  >
                    <Smile className="w-2.5 h-2.5" />
                    <span>+ Add Emoji / Stickers Track</span>
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
                          left: `${8 + stkLayer.startTimeSec * pxPerSec}px`,
                          width: `${Math.max(54, stkLayer.durationSec * pxPerSec)}px`,
                        }}
                        className={`h-7 rounded px-1.5 flex items-center justify-between text-[9.5px] font-bold cursor-pointer absolute truncate ${
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
                          className="p-0.5 rounded hover:bg-rose-600 text-rose-300 hover:text-white ml-1 shrink-0 cursor-pointer"
                          title="Delete Sticker"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Track 4: Separate Cinema Action VFX Timeline Track BELOW Video 1 */}
              <div className="h-9 border-b border-[#181c22] relative px-2 flex items-center">
                {vfxLayers.length === 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('VFX');
                      setIsLeftPanelOpen(true);
                    }}
                    className="h-6 px-2.5 rounded border border-dashed border-rose-500/40 text-[9px] text-rose-300/80 hover:text-rose-300 hover:border-rose-400 cursor-pointer flex items-center gap-1"
                  >
                    <Crosshair className="w-2.5 h-2.5" />
                    <span>+ Add VFX Layer (1,200 Gun, Bullet, Blood, Fire)</span>
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
                          left: `${8 + vLayer.startTimeSec * pxPerSec}px`,
                          width: `${Math.max(60, vLayer.durationSec * pxPerSec)}px`,
                        }}
                        className={`h-7 rounded px-1.5 flex items-center justify-between text-[9.5px] font-bold cursor-pointer absolute truncate ${
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
                          className="p-0.5 rounded hover:bg-rose-600 text-rose-200 hover:text-white ml-1 shrink-0 cursor-pointer"
                          title="Delete VFX"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Track 5: Audio Score Waveform Clip BELOW Video 1 */}
              <div className="h-9 relative px-2 flex items-center">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('Audio');
                    setSelectedFeatureType('audio');
                    setActiveInspectorTab('audio');
                    setIsRightPanelOpen(true);
                  }}
                  className={`h-7 rounded border px-2 flex items-center justify-between cursor-pointer transition-colors ${
                    isAudioTrackMuted
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-500 line-through'
                      : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:border-emerald-300'
                  }`}
                  style={{ width: `${timelineClips.length > 0 ? Math.max(40, totalDuration * pxPerSec) : 220}px` }}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Music className="w-3 h-3 shrink-0" />
                    <span className="text-[10px] font-semibold truncate">
                      {activeAudio.title} {isAudioTrackMuted && '(Muted)'}
                    </span>
                  </div>
                  <span className="text-[8.5px] font-mono shrink-0">{activeAudio.duration}</span>
                </div>
              </div>

              {/* Dedicated Lower Touch Scrub Zone (Drag anywhere left/right to watch & cut) */}
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  isScrubbingRef.current = true;
                  setIsScrubbingTimeline(true);
                  setIsPlaying(false);
                  try {
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  } catch {}
                  seekFromClientX(e.clientX);
                }}
                onPointerMove={(e) => {
                  if (!isScrubbingRef.current) return;
                  e.stopPropagation();
                  seekFromClientX(e.clientX);
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
                className="flex-1 min-h-[32px] w-full touch-none cursor-ew-resize flex items-center px-3 text-[9px] text-zinc-500/80 select-none border-t border-zinc-800/40 bg-[#080a0d]"
              >
                <span>◀ ചുവന്ന ലൈൻ കൈകൊണ്ട് അങ്ങോട്ടും ഇങ്ങോട്ടും നീക്കി വീഡിയോ കണ്ട് ✂ കട്ട് ചെയ്യാം ▶</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. EXPORT MODAL DIALOGUE
          ========================================================================= */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#12161b] rounded-2xl border border-zinc-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
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
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              {!exportedVideoUrl && (
                <>
                  <div>
                    <span className="text-zinc-400 text-[10px]">Project Name:</span>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      disabled={isExporting}
                      className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-white text-xs font-bold disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <span className="text-zinc-400 text-[10px]">Aspect Ratio &amp; Resolution:</span>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {(['1080p', '4K', '720p'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          disabled={isExporting}
                          onClick={() => setProjectResolution(r)}
                          className={`py-1.5 rounded-lg font-bold text-xs ${
                            projectResolution === r
                              ? 'bg-teal-500/20 border border-teal-400 text-teal-300'
                              : 'bg-zinc-900 border border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {r} {selectedAspectRatio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[10px] text-zinc-400 bg-zinc-900/70 border border-zinc-800 rounded-lg px-2.5 py-2 flex items-center justify-between">
                    <span>{timelineClips.length} Clips · {totalDuration.toFixed(1)}s Full Video</span>
                    <span className="text-teal-400 font-bold">Real Video Export</span>
                  </div>
                </>
              )}

              {exportError && (
                <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-[11px] font-semibold">
                  {exportError}
                </div>
              )}

              {isExporting && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-teal-400 font-mono text-[11px]">
                    <span className="truncate pr-2">{exportStatusText || `Rendering (${projectResolution} · ${selectedAspectRatio})...`}</span>
                    <span className="shrink-0 font-bold">{exportProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-400 transition-all duration-200" style={{ width: `${exportProgress}%` }} />
                  </div>
                </div>
              )}

              {exportedVideoUrl && !isExporting && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold bg-emerald-950/40 border border-emerald-500/40 rounded-lg px-2.5 py-2">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {isMl ? 'വീഡിയോ റെഡിയായി! ഇവിടെ പ്ലേ ചെയ്ത് സേവ് ചെയ്യാം' : 'Video Export Ready!'}
                    </span>
                    {exportedVideoSizeMb && <span className="text-zinc-300 font-mono">{exportedVideoSizeMb} MB</span>}
                  </div>
                  <video
                    src={exportedVideoUrl}
                    controls
                    playsInline
                    autoPlay
                    loop
                    className="w-full max-h-60 rounded-xl bg-black border border-zinc-800 object-contain"
                  />
                  <div className="text-[10px] text-zinc-400 truncate px-1">{exportedVideoFilename}</div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
              {exportedVideoUrl && !isExporting ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      clearExportedPreview();
                      setExportError(null);
                      setShowExportModal(false);
                    }}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 font-bold cursor-pointer text-xs"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearExportedPreview();
                      setExportProgress(0);
                      setExportStatusText('');
                    }}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-teal-300 font-bold cursor-pointer text-xs"
                  >
                    Re-Export
                  </button>
                  <a
                    href={exportedVideoUrl}
                    download={exportedVideoFilename}
                    className="px-4 py-1.5 bg-teal-400 hover:bg-teal-300 text-black font-extrabold rounded-lg cursor-pointer text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isMl ? 'ഗാലറിയിലേക്ക് സേവ്' : 'Save Video'}</span>
                  </a>
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
                    className="px-4 py-1.5 bg-zinc-800 rounded-lg text-zinc-300 font-bold cursor-pointer"
                  >
                    {isExporting ? 'Stop Export' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleStartExport();
                    }}
                    disabled={isExporting}
                    className="px-5 py-1.5 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 text-black font-extrabold rounded-lg cursor-pointer"
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
  );
};
