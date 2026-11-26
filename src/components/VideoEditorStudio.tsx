import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Trash2,
  Undo2,
  Redo2,
  Copy,
  ArrowLeft,
  Settings,
  Monitor,
  Sliders,
  X,
  Download,
  Share2,
  Check,
  RotateCcw,
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { AppLang } from '../lib/i18n';
import { recordVideoEditorActivity } from '../lib/analytics';
import {
  getAllLocalMediaRecords,
  saveLocalMediaRecord,
  updateLocalMediaMetadata,
} from '../lib/localMediaDb';
import {
  canShareMediaFile,
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
} from './CircularToolWheel';
import {
  TimelinePanel,
  formatTimecodeShort,
  type TimelineClipItem,
  type TimelineOverlayBlock,
} from './TimelinePanel';
import { WheelFeatureDrawer } from './WheelFeatureDrawer';
import {
  FILTERS_LIST,
  COLOR_GRADES_LIST,
  SFX_FOLEY_LIST,
  MUSIC_BGM_LIST,
  TEMPLATES_LIST,
  TRAILER_CARDS_LIST,
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
  type MediaMotionPreset,
  type DialoguePresetItem,
  type TrailerCardPresetItem,
  type ChromaPresetItem,
  type SplitLayoutPresetItem,
} from './videoStudioLibrary';
import {
  DEFAULT_CHROMA_KEY_CONFIG,
  DEFAULT_SPLIT_SCREEN_CONFIG,
  TRAILER_PRESET_PACKS,
  drawAnimatedCinemaTitle,
  drawChromaBackground,
  drawChromaKeyedSource,
  drawSplitScreenComposition,
  drawTrailerCardOnCanvas,
  drawTrailerFxOverlay,
  type ChromaKeyConfig,
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
import {
  getOrRenderPresetWavUrl,
  scheduleSynthPreset,
} from '../lib/comedyAudioSynth';

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
  width: number;
  height: number;
}

const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { id: '16:9', label: '16:9 Widescreen', width: 1280, height: 720 },
  { id: '9:16', label: '9:16 Vertical', width: 720, height: 1280 },
  { id: '1:1', label: '1:1 Square', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5 Portrait', width: 864, height: 1080 },
  { id: '21:9', label: '21:9 CinemaScope', width: 1680, height: 720 },
  { id: '4:3', label: '4:3 Classic', width: 960, height: 720 },
];

export type TimelineClip = TimelineClipItem;

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

interface EditorSnapshot {
  clips: TimelineClip[];
  filterId: string;
  colorGradeId: string | null;
  audioId: string;
  showTitleOverlay: boolean;
  movieTitle: string;
  subtitle: string;
  stickers: TimelineStickerLayer[];
  vfx: TimelineVfxLayer[];
  chroma: ChromaKeyConfig;
  split: SplitScreenConfig;
  disabledCategoryIds: string[];
}

function formatDurationLabel(sec: number): string {
  const safe = Math.max(0, Math.round(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function captureVideoThumbnail(vid: HTMLVideoElement): string | undefined {
  try {
    if (vid.videoWidth > 0 && vid.videoHeight > 0) {
      const c = document.createElement('canvas');
      c.width = 160;
      c.height = 90;
      const cCtx = c.getContext('2d');
      if (cCtx) {
        cCtx.drawImage(vid, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.65);
      }
    }
  } catch {}
  return undefined;
}

function getScaledCacheSize(sw: number, sh: number, maxDim = 720): { cw: number; ch: number } {
  if (sw <= 0 || sh <= 0) return { cw: 0, ch: 0 };
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  return {
    cw: Math.max(1, Math.round(sw * scale)),
    ch: Math.max(1, Math.round(sh * scale)),
  };
}

async function extractAudioDuration(url: string): Promise<number> {
  if (typeof document === 'undefined') return 12;
  return new Promise((resolve) => {
    const aud = new Audio();
    aud.preload = 'metadata';
    let done = false;
    const finish = (d: number) => {
      if (done) return;
      done = true;
      window.clearTimeout(t);
      resolve(d);
    };
    const t = window.setTimeout(() => finish(12), 2500);
    aud.onloadedmetadata = () => {
      const d = Number.isFinite(aud.duration) && aud.duration > 0.2 ? Number(aud.duration.toFixed(2)) : 12;
      finish(d);
    };
    aud.onerror = () => finish(12);
    aud.src = url;
  });
}

const drawCinemaVfxOnCanvas = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  layer: TimelineVfxLayer,
  globalTimeSec: number
) => {
  const dur = Math.max(0.2, layer.durationSec / Math.max(0.25, layer.speed || 1));
  if (globalTimeSec < layer.startTimeSec || globalTimeSec > layer.startTimeSec + dur) return;
  const prog = Math.max(0, Math.min(1, (globalTimeSec - layer.startTimeSec) / dur));
  const sx = (layer.startXPct / 100) * w;
  const sy = (layer.startYPct / 100) * h;
  const ex = (layer.endXPct / 100) * w;
  const ey = (layer.endYPct / 100) * h;
  const unit = Math.min(w, h) * 0.08 * (layer.scale || 1);

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, (layer.opacity ?? 100) / 100));
  ctx.globalCompositeOperation = 'screen';

  const curX = layer.vfx.hasMotionRoute ? sx + (ex - sx) * prog : sx;
  const curY = layer.vfx.hasMotionRoute ? sy + (ey - sy) * prog : sy;
  const r = unit * (0.9 + Math.sin(prog * Math.PI) * 1.4);

  const grad = ctx.createRadialGradient(curX, curY, 2, curX, curY, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, layer.vfx.primaryColor);
  grad.addColorStop(0.75, layer.vfx.secondaryColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(curX, curY, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

export const VideoEditorStudio: React.FC<VideoEditorStudioProps> = ({
  lang,
  currentUser = null,
  onBackToStoryboard,
  onOpenTerms,
}) => {
  // Layout & Orientation State (launches directly in 16:9 widescreen)
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatioType>('16:9');
  const [autoLandscapeRotate, setAutoLandscapeRotate] = useState<boolean>(true);
  const [showAspectPopover, setShowAspectPopover] = useState<boolean>(false);
  const [showSettingsPopover, setShowSettingsPopover] = useState<boolean>(false);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>(() =>
    typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 1280, height: 720 }
  );

  const isPortraitViewport = viewportSize.height > viewportSize.width;
  const isCssRotatedLandscape = autoLandscapeRotate && isPortraitViewport;
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
    if (autoLandscapeRotate) {
      void tryLockLandscapeOrientation();
    }
    return () => unlockScreenOrientation();
  }, [autoLandscapeRotate]);

  useEffect(() => {
    void recordVideoEditorActivity({
      actionType: 'open_editor',
      projectTitle: 'CineStudio Project',
      clipCount: 0,
      resolution: '1080p',
      aspectRatio: '16:9',
      exportDurationSec: 0,
      user: currentUser,
    });
  }, []);

  // Wheel & Drawer State
  const [selectedWheelCategoryId, setSelectedWheelCategoryId] = useState<string>('video');
  const [isWheelFeaturePanelOpen, setIsWheelFeaturePanelOpen] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [disabledCategoryIds, setDisabledCategoryIds] = useState<string[]>([]);

  // Media & Timeline Clips
  const [mediaGallery, setMediaGallery] = useState<MediaItem[]>([]);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [isTimelineSelectionActive, setIsTimelineSelectionActive] = useState<boolean>(false);

  // Filters, Grading & Adjustments
  const [activeFilter, setActiveFilter] = useState<FilterItem>(FILTERS_LIST[0]); // Original Raw by default
  const [activeColorGradeId, setActiveColorGradeId] = useState<string | null>(null);
  const [colorAdjust, setColorAdjust] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    warmth: 0,
    vignette: 12,
  });

  // Audio / Music / Dialogues
  const [userAudioLibrary, setUserAudioLibrary] = useState<AudioItem[]>([]);
  const [activeAudio, setActiveAudio] = useState<AudioItem>(SFX_FOLEY_LIST[0]);
  const [hasUserPickedAudio, setHasUserPickedAudio] = useState<boolean>(false);
  const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<{
    id: string;
    speaker: string;
    text: string;
    durationSec: number;
  } | null>(null);
  const [activeDialoguePresetId, setActiveDialoguePresetId] = useState<string | null>(null);
  const [dialogueSpeakerInput, setDialogueSpeakerInput] = useState<string>('Hero');
  const [dialogueTextInput, setDialogueTextInput] = useState<string>('Cinema Dialogue');
  const [dialogueDurInput, setDialogueDurInput] = useState<number>(5);

  // Media Motion / Framing, Titles, Stickers, VFX, Effects, Transitions, Templates, Chroma, Split, Cards
  const [activeMotionPreset, setActiveMotionPreset] = useState<MediaMotionPreset | null>(null);
  const [showTitleOverlay, setShowTitleOverlay] = useState<boolean>(false);
  const [movieTitle, setMovieTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [titleAnimType, setTitleAnimType] = useState<TitleAnimationType>('zoom_slam');
  const [titleThemeType, setTitleThemeType] = useState<TitleThemeType>('blockbuster_gold');

  const [activeStickers, setActiveStickers] = useState<TimelineStickerLayer[]>([]);
  const [lastAddedSticker, setLastAddedSticker] = useState<StickerItem | null>(null);
  const [vfxLayers, setVfxLayers] = useState<TimelineVfxLayer[]>([]);
  const [lastAddedVfx, setLastAddedVfx] = useState<CinemaVfxItem | null>(null);
  const [activeEffect, setActiveEffect] = useState<EffectItem | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [selectedTransitionObj, setSelectedTransitionObj] = useState<TransitionItem | null>(null);
  const [activeTransitionSeamClipId, setActiveTransitionSeamClipId] = useState<string | null>(null);
  const [activeTransitionStartSec, setActiveTransitionStartSec] = useState<number>(0);
  const [activeTemplate, setActiveTemplate] = useState<TemplateItem | null>(null);
  const [activeTemplateStartSec, setActiveTemplateStartSec] = useState<number>(0);
  const [trailerFxMode, setTrailerFxMode] = useState<TrailerFxMode>('none');

  const [chromaConfig, setChromaConfig] = useState<ChromaKeyConfig>(DEFAULT_CHROMA_KEY_CONFIG);
  const [activeChromaPresetId, setActiveChromaPresetId] = useState<string | null>(null);
  const [splitScreenConfig, setSplitScreenConfig] = useState<SplitScreenConfig>(DEFAULT_SPLIT_SCREEN_CONFIG);
  const [activeSplitPresetId, setActiveSplitPresetId] = useState<string | null>(null);

  const [trailerCardLayers, setTrailerCardLayers] = useState<TrailerCardLayer[]>([]);
  const [activeCardPresetId, setActiveCardPresetId] = useState<string | null>(null);
  const [draftCardTitle, setDraftCardTitle] = useState<string>('THE LAST STAND');
  const [draftCardSubtitle, setDraftCardSubtitle] = useState<string>('A CINEMA EVENT');
  const [draftCardTheme, setDraftCardTheme] = useState<TrailerCardTheme>('blockbuster_gold');
  const [draftCardAnim, setDraftCardAnim] = useState<TrailerCardAnimation>('tilt_float');
  const [draftCardImageUrl, setDraftCardImageUrl] = useState<string>('');
  const [draftCardMediaType, setDraftCardMediaType] = useState<'video' | 'photo'>('photo');

  // Playback & Scrubbing State
  const totalDuration = useMemo(
    () => timelineClips.reduce((acc, c) => acc + Math.max(0.2, c.durationSec || 4), 0),
    [timelineClips]
  );
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [volume, setVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [timelineZoom, setTimelineZoom] = useState<number>(1.35);
  const pxPerSec = 20 * timelineZoom;

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([]);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportResolution, setExportResolution] = useState<'4K' | '1080p' | '720p'>('1080p');
  const [exportFps, setExportFps] = useState<30 | 60>(30);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportElapsedSec, setExportElapsedSec] = useState<number>(0);
  const [exportStatusText, setExportStatusText] = useState<string>('Ready');
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedMimeExt, setExportedMimeExt] = useState<'mp4' | 'webm'>('mp4');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const exportCancelRef = useRef<boolean>(false);

  // Refs for DOM, Media & 60fps Canvas Render Loop
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const transCanvasARef = useRef<HTMLCanvasElement | null>(null);
  const transCanvasBRef = useRef<HTMLCanvasElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const playheadLineRef = useRef<HTMLDivElement | null>(null);
  const redBadgeTimeRef = useRef<HTMLSpanElement | null>(null);
  const playerSliderTrackRef = useRef<HTMLDivElement | null>(null);
  const playerSliderFillRef = useRef<HTMLDivElement | null>(null);
  const playerSliderThumbRef = useRef<HTMLDivElement | null>(null);
  const playerTimeLabelRef = useRef<HTMLSpanElement | null>(null);

  const multiFileInputRef = useRef<HTMLInputElement | null>(null);
  const userAudioInputRef = useRef<HTMLInputElement | null>(null);
  const chromaBgInputRef = useRef<HTMLInputElement | null>(null);
  const splitLeftInputRef = useRef<HTMLInputElement | null>(null);
  const splitRightInputRef = useRef<HTMLInputElement | null>(null);
  const trailerCardInputRef = useRef<HTMLInputElement | null>(null);

  const mediaCacheRef = useRef<Map<string, HTMLImageElement | HTMLVideoElement>>(new Map());
  const videoFrameCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const lastCacheUpdateAtByUrlRef = useRef<Map<string, number>>(new Map());
  const transitionFrozenOutRef = useRef<{ seamKey: string; canvas: HTMLCanvasElement } | null>(null);
  const lastSeekAtByUrlRef = useRef<Map<string, number>>(new Map());
  const pendingPlayUrlsRef = useRef<Set<string>>(new Set());
  const prewarmedSeamKeysRef = useRef<Set<string>>(new Set());
  const lastSyncedClipIdRef = useRef<string | null>(null);
  const localMediaUrlMapRef = useRef<Map<string, string>>(new Map());
  const bgSaveTimersRef = useRef<number[]>([]);
  const needsRenderRef = useRef<boolean>(true);
  const previewCtxRef = useRef<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null>(null);
  const bgMusicElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewTimerRef = useRef<number | null>(null);
  const previewGainRef = useRef<GainNode | null>(null);

  const currentTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  isPlayingRef.current = isPlaying;
  const isScrubbingRef = useRef<boolean>(false);
  const wasPlayingBeforeScrubRef = useRef<boolean>(false);
  const isSliderDraggingRef = useRef<boolean>(false);
  const lastReactTimeSyncRef = useRef<number>(0);
  const lastActiveClipIdxRef = useRef<number>(0);

  const activeWheelCategory = useMemo(
    () => WHEEL_CATEGORIES.find((c) => c.id === selectedWheelCategoryId) || WHEEL_CATEGORIES[0],
    [selectedWheelCategoryId]
  );

  const activeAspectOpt = useMemo(
    () => ASPECT_RATIO_OPTIONS.find((a) => a.id === selectedAspectRatio) || ASPECT_RATIO_OPTIONS[0],
    [selectedAspectRatio]
  );

  // Hydrate previously saved local media from IndexedDB cleanly on mount
  useEffect(() => {
    let active = true;
    getAllLocalMediaRecords()
      .then((records) => {
        if (!active || !records.length) return;
        const loadedMedia: MediaItem[] = [];
        const loadedAudio: AudioItem[] = [];
        records.forEach((rec) => {
          const blobUrl = URL.createObjectURL(rec.file);
          localMediaUrlMapRef.current.set(rec.id, blobUrl);
          if (rec.mediaType === 'audio') {
            loadedAudio.push({
              id: rec.id,
              title: rec.name,
              category: 'My Audio',
              duration: rec.duration,
              durationSec: rec.durationSec || 10,
              bpm: 120,
              mood: 'Local',
              description: 'Device audio file',
              synthPreset: 'cinematic',
              url: blobUrl,
            });
          } else {
            loadedMedia.push({
              id: rec.id,
              title: rec.name,
              type: rec.mediaType === 'photo' ? 'photo' : 'video',
              duration: rec.duration,
              durationSec: rec.durationSec || 5,
              url: blobUrl,
              thumbnailUrl: rec.thumbnailUrl,
              category: 'Device',
            });
          }
        });
        if (loadedMedia.length > 0) setMediaGallery(loadedMedia);
        if (loadedAudio.length > 0) setUserAudioLibrary(loadedAudio);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Snapshot helpers for Undo / Redo
  const captureSnapshot = (): EditorSnapshot => ({
    clips: timelineClips,
    filterId: activeFilter.id,
    colorGradeId: activeColorGradeId,
    audioId: activeAudio.id,
    showTitleOverlay,
    movieTitle,
    subtitle,
    stickers: activeStickers,
    vfx: vfxLayers,
    chroma: chromaConfig,
    split: splitScreenConfig,
    disabledCategoryIds,
  });

  const pushUndoCheckpoint = () => {
    setUndoStack((prev) => [...prev.slice(-19), captureSnapshot()]);
    setRedoStack([]);
  };

  const applySnapshot = (snap: EditorSnapshot) => {
    setTimelineClips(snap.clips);
    const f = FILTERS_LIST.find((x) => x.id === snap.filterId);
    if (f) setActiveFilter(f);
    setActiveColorGradeId(snap.colorGradeId);
    const a = [...userAudioLibrary, ...SFX_FOLEY_LIST, ...MUSIC_BGM_LIST].find((x) => x.id === snap.audioId);
    if (a) setActiveAudio(a);
    setShowTitleOverlay(snap.showTitleOverlay);
    setMovieTitle(snap.movieTitle);
    setSubtitle(snap.subtitle);
    setActiveStickers(snap.stickers);
    setVfxLayers(snap.vfx);
    setChromaConfig(snap.chroma);
    setSplitScreenConfig(snap.split);
    setDisabledCategoryIds(snap.disabledCategoryIds);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s.slice(-19), captureSnapshot()]);
    applySnapshot(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s.slice(-19), captureSnapshot()]);
    applySnapshot(next);
  };

  // Preload & cache HTMLVideoElement / HTMLImageElement sources (single decoder per media URL)
  const getOrLoadSource = (url: string, type: 'video' | 'photo'): HTMLVideoElement | HTMLImageElement | null => {
    if (!url || typeof document === 'undefined') return null;
    const key = `${type}:${url}`;
    const existing = mediaCacheRef.current.get(key);
    if (existing) return existing;

    if (type === 'photo') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        needsRenderRef.current = true;
      };
      img.src = url;
      mediaCacheRef.current.set(key, img);
      return img;
    }

    const vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.preload = 'auto';
    vid.playsInline = true;
    vid.muted = true;
    const refreshVideoCacheOnce = () => {
      if (vid.videoWidth > 0 && vid.videoHeight > 0) {
        const { cw, ch } = getScaledCacheSize(vid.videoWidth, vid.videoHeight, 720);
        let cached = videoFrameCacheRef.current.get(url);
        if (!cached) {
          cached = document.createElement('canvas');
          videoFrameCacheRef.current.set(url, cached);
        }
        if (cached.width !== cw || cached.height !== ch) {
          cached.width = cw;
          cached.height = ch;
        }
        const cCtx = cached.getContext('2d');
        if (cCtx) {
          try {
            cCtx.drawImage(vid, 0, 0, cw, ch);
            lastCacheUpdateAtByUrlRef.current.set(url, performance.now());
          } catch {}
        }
      }
      needsRenderRef.current = true;
    };
    vid.addEventListener('loadeddata', refreshVideoCacheOnce, { once: true });
    vid.addEventListener('canplay', () => {
      needsRenderRef.current = true;
    });
    vid.addEventListener('seeked', () => {
      needsRenderRef.current = true;
    });
    vid.addEventListener(
      'loadedmetadata',
      () => {
        needsRenderRef.current = true;
        if (!isPlayingRef.current && vid.currentTime === 0 && vid.readyState < 2) {
          try {
            vid.currentTime = 0.01;
          } catch {}
        }
      },
      { once: true }
    );
    vid.src = url;
    mediaCacheRef.current.set(key, vid);
    return vid;
  };

  // Determine active clip + local source offset + optional active seam transition at any timeline second
  const getClipAtTime = (
    timeSec: number,
    clipsList: TimelineClip[]
  ): {
    clip: TimelineClip | null;
    index: number;
    localSec: number;
    clipStartSec: number;
    clipEndSec: number;
  } => {
    if (!clipsList.length) {
      return { clip: null, index: 0, localSec: 0, clipStartSec: 0, clipEndSec: 0 };
    }
    let cursor = 0;
    for (let i = 0; i < clipsList.length; i += 1) {
      const c = clipsList[i];
      const dur = Math.max(0.2, c.durationSec || 4);
      if (timeSec < cursor + dur || i === clipsList.length - 1) {
        const localOffset = Math.max(0, Math.min(dur, timeSec - cursor));
        return {
          clip: c,
          index: i,
          localSec: (c.sourceStartSec || 0) + localOffset,
          clipStartSec: cursor,
          clipEndSec: cursor + dur,
        };
      }
      cursor += dur;
    }
    return { clip: clipsList[0], index: 0, localSec: 0, clipStartSec: 0, clipEndSec: clipsList[0].durationSec || 4 };
  };

  const getActiveSeamTransitionAtTime = (
    timeSec: number,
    clipsList: TimelineClip[]
  ): {
    outClip: TimelineClip;
    inClip: TimelineClip;
    outStartSec: number;
    outDur: number;
    seamSec: number;
    transition: TransitionItem;
    progress: number;
  } | null => {
    if (clipsList.length < 2 || disabledCategoryIds.includes('transitions')) return null;
    let cursor = 0;
    for (let i = 0; i < clipsList.length - 1; i += 1) {
      const outClip = clipsList[i];
      const inClip = clipsList[i + 1];
      const outDur = Math.max(0.2, outClip.durationSec || 4);
      const inDur = Math.max(0.2, inClip.durationSec || 4);
      const seamSec = cursor + outDur;
      const tr = outClip.transitionOut;
      if (tr) {
        const windowDur = Math.min(Math.max(0.25, tr.durationSec || 0.8), outDur * 0.45, inDur * 0.45);
        const startT = seamSec - windowDur * 0.5;
        const endT = seamSec + windowDur * 0.5;
        if (timeSec >= startT && timeSec <= endT && windowDur > 0.05) {
          return {
            outClip,
            inClip,
            outStartSec: cursor,
            outDur,
            seamSec,
            transition: tr,
            progress: Math.max(0, Math.min(1, (timeSec - startT) / windowDur)),
          };
        }
      }
      cursor += outDur;
    }
    return null;
  };

  // Direct DOM updater for 60fps lag-free playhead & slider movement without full React re-renders
  const updatePlayheadDomInstant = (sec: number, totDur: number, pps: number) => {
    const safeTot = Math.max(0, totDur);
    const clamped = Math.max(0, Math.min(safeTot, sec));
    if (playheadLineRef.current) {
      playheadLineRef.current.style.left = `${20 + clamped * pps}px`;
    }
    if (redBadgeTimeRef.current) {
      redBadgeTimeRef.current.textContent = formatTimecodeShort(clamped);
    }
    const pct = safeTot > 0 ? Math.min(100, Math.max(0, (clamped / safeTot) * 100)) : 0;
    if (playerSliderFillRef.current) {
      playerSliderFillRef.current.style.width = `${pct}%`;
    }
    if (playerSliderThumbRef.current) {
      playerSliderThumbRef.current.style.left = `${pct}%`;
    }
    if (playerTimeLabelRef.current) {
      playerTimeLabelRef.current.textContent = `${formatTimecodeShort(clamped)} / ${formatTimecodeShort(safeTot)}`;
    }
  };

  // Safe single-shot seek helper with cooldown & seeking guard (prevents decoder buffer wipes / flicker)
  const safeSeekVideo = (
    el: HTMLVideoElement,
    url: string,
    targetSec: number,
    minDriftSec: number,
    cooldownMs: number
  ) => {
    if (el.readyState < 1 || el.seeking) return;
    const now = performance.now();
    const lastSeekAt = lastSeekAtByUrlRef.current.get(url) || 0;
    if (now - lastSeekAt < cooldownMs) return;
    const safeMax = Number.isFinite(el.duration) && el.duration > 0.05 ? el.duration - 0.02 : targetSec;
    const clampedTarget = Math.max(0, Math.min(safeMax, targetSec));
    const drift = Math.abs((el.currentTime || 0) - clampedTarget);
    if (drift <= minDriftSec) return;
    lastSeekAtByUrlRef.current.set(url, now);
    try {
      el.currentTime = clampedTarget;
    } catch {}
  };

  const safePlayVideo = (el: HTMLVideoElement, url: string) => {
    if (!el.paused || pendingPlayUrlsRef.current.has(url)) return;
    pendingPlayUrlsRef.current.add(url);
    el.play()
      .catch(() => {})
      .finally(() => {
        pendingPlayUrlsRef.current.delete(url);
      });
  };

  // Sync audio mute, playbackRate, transition pre-warm & native <video> playback cleanly without per-frame re-seeking
  const syncMediaAudioAndSeek = (timeSec: number, forceSeek: boolean) => {
    const isClipAudioDisabled =
      isMuted ||
      disabledCategoryIds.includes('audio') ||
      volume <= 0;
    const { clip, index, localSec, clipEndSec } = getClipAtTime(timeSec, timelineClips);
    if (index !== lastActiveClipIdxRef.current && timelineClips[index]) {
      lastActiveClipIdxRef.current = index;
      setActiveClipIndex(index);
    }

    const clipChanged = (clip?.id || null) !== lastSyncedClipIdRef.current;
    if (clipChanged) {
      lastSyncedClipIdRef.current = clip?.id || null;
    }
    if (forceSeek) {
      prewarmedSeamKeysRef.current.clear();
    }

    const seamTrans = getActiveSeamTransitionAtTime(timeSec, timelineClips);
    const nextClip = timelineClips[index + 1] || null;
    const nearNextSeam = Boolean(nextClip && clipEndSec - timeSec <= 1.25);
    const activeVideoEl =
      clip?.type === 'video' && clip.url ? getOrLoadSource(clip.url, 'video') : null;
    const playingNow = isPlayingRef.current && !isScrubbingRef.current;

    if (seamTrans && timeSec < seamTrans.seamSec) {
      // Snapshot outgoing frame right before crossing the seam so transition never blinks if clip pauses or shares URL
      const outEl =
        seamTrans.outClip.type === 'video' && seamTrans.outClip.url
          ? mediaCacheRef.current.get(`video:${seamTrans.outClip.url}`)
          : null;
      if (outEl instanceof HTMLVideoElement && outEl.readyState >= 2 && outEl.videoWidth > 0) {
        const seamKey = `${seamTrans.outClip.id}->${seamTrans.inClip.id}`;
        let frozen = transitionFrozenOutRef.current;
        if (!frozen || frozen.seamKey !== seamKey) {
          const c = document.createElement('canvas');
          c.width = outEl.videoWidth;
          c.height = outEl.videoHeight;
          frozen = { seamKey, canvas: c };
          transitionFrozenOutRef.current = frozen;
        }
        if (frozen.canvas.width !== outEl.videoWidth || frozen.canvas.height !== outEl.videoHeight) {
          frozen.canvas.width = outEl.videoWidth;
          frozen.canvas.height = outEl.videoHeight;
        }
        const fCtx = frozen.canvas.getContext('2d');
        if (fCtx) {
          try {
            fCtx.drawImage(outEl, 0, 0, frozen.canvas.width, frozen.canvas.height);
          } catch {}
        }
      }
    }

    const targetVol = Math.max(0, Math.min(1, volume / 100));

    timelineClips.forEach((c) => {
      if (c.type !== 'video' || !c.url) return;
      const el = getOrLoadSource(c.url, 'video');
      if (!(el instanceof HTMLVideoElement)) return;

      const isActive = clip?.id === c.id;
      const isTransitionIn = seamTrans?.inClip.id === c.id && timeSec < seamTrans.seamSec;
      const isPrewarmNext = nearNextSeam && nextClip?.id === c.id;

      if (isActive) {
        if (el.muted !== isClipAudioDisabled) el.muted = isClipAudioDisabled;
        if (Math.abs(el.volume - targetVol) > 0.01) el.volume = targetVol;
        if (Math.abs(el.playbackRate - playbackSpeed) > 0.005) el.playbackRate = playbackSpeed;

        if (forceSeek) {
          // User manually scrubbed/stepped/jumped -> seek once (with tight cooldown)
          safeSeekVideo(el, c.url, localSec, 0.06, isScrubbingRef.current ? 90 : 120);
        } else if (clipChanged) {
          // Entered a new clip on the timeline -> position once cleanly
          safeSeekVideo(el, c.url, localSec, 0.12, 220);
        } else if (playingNow) {
          // During continuous playback: avoid repeated currentTime seeks; only rescue massive >1.25s drift
          safeSeekVideo(el, c.url, localSec, 1.25, 650);
        }

        const atClipTailEnded =
          el.ended &&
          Number.isFinite(el.duration) &&
          el.duration > 0.1 &&
          localSec >= el.duration - 0.1;

        if (playingNow && !atClipTailEnded) {
          safePlayVideo(el, c.url);
        } else if (!el.paused) {
          el.pause();
        }
        return;
      }

      // If another clip (e.g., split segment) shares the same HTMLVideoElement as the active clip, never pause/re-seek it
      if (el === activeVideoEl) return;

      if (!el.muted) el.muted = true;
      if (!el.paused) el.pause();

      // Pre-warm the upcoming clip ONCE before entering it so frame 0 is decoded & ready (no black flash at seam)
      if (isTransitionIn || isPrewarmNext) {
        const prewarmKey = `${c.id}:${Math.round((c.sourceStartSec || 0) * 100)}`;
        if (!prewarmedSeamKeysRef.current.has(prewarmKey)) {
          prewarmedSeamKeysRef.current.add(prewarmKey);
          safeSeekVideo(el, c.url, c.sourceStartSec || 0, 0.12, 200);
        }
      }
    });

    // Background Music / Comedy SFX track sync
    if (bgMusicElRef.current) {
      const musicDisabled = isMuted || disabledCategoryIds.includes('music');
      const shouldMuteMusic = musicDisabled || !hasUserPickedAudio;
      const musicVol = Math.max(0, Math.min(1, (volume / 100) * 0.72));
      if (bgMusicElRef.current.muted !== shouldMuteMusic) bgMusicElRef.current.muted = shouldMuteMusic;
      if (Math.abs(bgMusicElRef.current.volume - musicVol) > 0.01) bgMusicElRef.current.volume = musicVol;
      if (Math.abs(bgMusicElRef.current.playbackRate - playbackSpeed) > 0.005) {
        bgMusicElRef.current.playbackRate = playbackSpeed;
      }
      if (playingNow && hasUserPickedAudio && !musicDisabled) {
        if (bgMusicElRef.current.paused) bgMusicElRef.current.play().catch(() => {});
      } else if (!bgMusicElRef.current.paused) {
        bgMusicElRef.current.pause();
      }
    }
  };

  // Seek cleanly across timeline, video tags, DOM sliders & canvas
  const seekToTime = (targetSec: number, forceVideoSeek = true) => {
    const clamped = Math.max(0, Math.min(totalDuration, targetSec));
    currentTimeRef.current = clamped;
    needsRenderRef.current = true;
    updatePlayheadDomInstant(clamped, totalDuration, pxPerSec);
    const now = performance.now();
    if (!isSliderDraggingRef.current || now - lastReactTimeSyncRef.current > 95) {
      lastReactTimeSyncRef.current = now;
      setCurrentTimeSec(clamped);
    }
    syncMediaAudioAndSeek(clamped, forceVideoSeek);
  };

  // Draw single media clip frame centered inside (w, h), using throttled downscaled frame cache fallback
  const drawSingleClipContent = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    clip: TimelineClip,
    tSec: number,
    combinedFilter: string,
    chromaDisabled: boolean,
    overrideSourceCanvas?: HTMLCanvasElement | null
  ) => {
    let drawSource: CanvasImageSource | null = overrideSourceCanvas || null;
    let sw = overrideSourceCanvas ? overrideSourceCanvas.width : 0;
    let sh = overrideSourceCanvas ? overrideSourceCanvas.height : 0;

    if (!drawSource) {
      const srcEl = getOrLoadSource(clip.url, clip.type);
      if (srcEl instanceof HTMLVideoElement) {
        if (srcEl.readyState >= 2 && srcEl.videoWidth > 0 && srcEl.videoHeight > 0) {
          drawSource = srcEl;
          sw = srcEl.videoWidth;
          sh = srcEl.videoHeight;

          // Throttle downscaled (max 720p) fallback frame snapshots so 60fps playback stays lag-free
          const now = performance.now();
          const lastCachedAt = lastCacheUpdateAtByUrlRef.current.get(clip.url) || 0;
          const existingCache = videoFrameCacheRef.current.get(clip.url);
          const shouldRefreshCache =
            !existingCache ||
            existingCache.width === 0 ||
            isScrubbingRef.current ||
            now - lastCachedAt > 200;

          if (shouldRefreshCache) {
            const { cw, ch } = getScaledCacheSize(sw, sh, 720);
            let cached = existingCache;
            if (!cached) {
              cached = document.createElement('canvas');
              videoFrameCacheRef.current.set(clip.url, cached);
            }
            if (cached.width !== cw || cached.height !== ch) {
              cached.width = cw;
              cached.height = ch;
            }
            const cCtx = cached.getContext('2d');
            if (cCtx) {
              try {
                cCtx.drawImage(srcEl, 0, 0, cw, ch);
                lastCacheUpdateAtByUrlRef.current.set(clip.url, now);
              } catch {}
            }
          }
        } else {
          const cached = videoFrameCacheRef.current.get(clip.url);
          if (cached && cached.width > 0 && cached.height > 0) {
            drawSource = cached;
            sw = cached.width;
            sh = cached.height;
          } else if (clip.thumbnailUrl) {
            const thumbImg = getOrLoadSource(clip.thumbnailUrl, 'photo');
            if (thumbImg instanceof HTMLImageElement && thumbImg.complete && thumbImg.naturalWidth > 0) {
              drawSource = thumbImg;
              sw = thumbImg.naturalWidth;
              sh = thumbImg.naturalHeight;
            }
          }
        }
      } else if (srcEl instanceof HTMLImageElement && srcEl.complete) {
        drawSource = srcEl;
        sw = srcEl.naturalWidth;
        sh = srcEl.naturalHeight;
      }
    }

    if (!drawSource || sw <= 0 || sh <= 0) return;

    ctx.save();
    const z = activeMotionPreset ? activeMotionPreset.zoomScale : 1;
    const px = activeMotionPreset ? activeMotionPreset.panX * w : 0;
    const py = activeMotionPreset ? activeMotionPreset.panY * h : 0;
    ctx.translate(w / 2 + px, h / 2 + py);
    if (z !== 1) ctx.scale(z, z);
    if (chromaConfig.enabled && !chromaDisabled) {
      const customBg =
        chromaConfig.bgMode === 'custom_media' && chromaConfig.bgMediaUrl
          ? getOrLoadSource(chromaConfig.bgMediaUrl, chromaConfig.bgMediaType || 'photo')
          : null;
      drawChromaBackground(ctx, w, h, chromaConfig, tSec, customBg, drawSource);
      if (combinedFilter !== 'none') ctx.filter = combinedFilter;
      drawChromaKeyedSource(ctx, drawSource, sw, sh, w, h, chromaConfig);
    } else {
      if (combinedFilter !== 'none') ctx.filter = combinedFilter;
      const fitScale = Math.min(w / sw, h / sh);
      const drawW = sw * fitScale;
      const drawH = sh * fitScale;
      ctx.drawImage(drawSource, -drawW / 2, -drawH / 2, drawW, drawH);
    }
    ctx.restore();
  };

  // Composite outgoing (canvasA) -> incoming (canvasB) with exact transition effect
  const drawTransitionComposite = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    canvasA: HTMLCanvasElement,
    canvasB: HTMLCanvasElement,
    effectType: TransitionItem['effectType'],
    progress: number
  ) => {
    const p = Math.max(0, Math.min(1, progress));
    const ease = p * p * (3 - 2 * p);
    ctx.save();
    ctx.filter = 'none';

    if (effectType === 'slide') {
      const shiftX = -ease * w;
      ctx.drawImage(canvasA, shiftX, 0, w, h);
      ctx.drawImage(canvasB, shiftX + w, 0, w, h);
    } else if (effectType === 'whip') {
      const shiftX = -ease * w;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(canvasA, shiftX, 0, w, h);
      ctx.drawImage(canvasB, shiftX + w, 0, w, h);
      ctx.globalAlpha = 0.28 * Math.sin(p * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(0, 0, w, h);
    } else if (effectType === 'zoom') {
      const scaleA = 1 + ease * 0.45;
      const scaleB = 1.35 - ease * 0.35;
      ctx.save();
      ctx.globalAlpha = 1 - ease;
      ctx.translate(w / 2, h / 2);
      ctx.scale(scaleA, scaleA);
      ctx.drawImage(canvasA, -w / 2, -h / 2, w, h);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = ease;
      ctx.translate(w / 2, h / 2);
      ctx.scale(scaleB, scaleB);
      ctx.drawImage(canvasB, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else if (effectType === 'flash') {
      ctx.drawImage(p < 0.5 ? canvasA : canvasB, 0, 0, w, h);
      const flashAlpha = Math.sin(p * Math.PI);
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.92})`;
      ctx.fillRect(0, 0, w, h);
    } else if (effectType === 'glitch') {
      const base = p < 0.5 ? canvasA : canvasB;
      ctx.drawImage(base, 0, 0, w, h);
      const jitter = Math.sin(p * Math.PI) * 26;
      const sliceH = Math.max(8, Math.round(h / 10));
      for (let sy = 0; sy < h; sy += sliceH) {
        const dx = ((sy % 3 === 0 ? 1 : -1) * jitter * Math.sin((p + sy) * 19));
        const src = (sy + Math.floor(p * 10)) % 2 === 0 ? canvasB : canvasA;
        ctx.drawImage(src, 0, sy, w, sliceH, dx, sy, w, sliceH);
      }
    } else if (effectType === 'cube3d') {
      const wA = Math.max(0, (1 - ease) * w);
      const wB = Math.max(0, ease * w);
      if (wA > 1) ctx.drawImage(canvasA, 0, 0, w, h, 0, 0, wA, h);
      if (wB > 1) ctx.drawImage(canvasB, 0, 0, w, h, wA, 0, wB, h);
      ctx.fillStyle = `rgba(0,0,0,${Math.sin(p * Math.PI) * 0.35})`;
      ctx.fillRect(Math.max(0, wA - 3), 0, 6, h);
    } else if (effectType === 'wipe') {
      ctx.drawImage(canvasA, 0, 0, w, h);
      const revealW = Math.max(0, Math.round(ease * w));
      if (revealW > 0) {
        ctx.drawImage(canvasB, 0, 0, revealW, h, 0, 0, revealW, h);
      }
    } else {
      // 'dissolve' default crossfade
      ctx.globalAlpha = 1 - ease;
      ctx.drawImage(canvasA, 0, 0, w, h);
      ctx.globalAlpha = ease;
      ctx.drawImage(canvasB, 0, 0, w, h);
    }
    ctx.restore();
  };

  // Render single frame onto any 2D canvas (shared by Live Preview & Export)
  const renderFrameToCanvas = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tSec: number
  ): number => {
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, w, h);

    const { clip, index } = getClipAtTime(tSec, timelineClips);
    const filtersDisabled = disabledCategoryIds.includes('filters');
    const chromaDisabled = disabledCategoryIds.includes('chroma');
    const splitDisabled = disabledCategoryIds.includes('split');
    const titlesDisabled = disabledCategoryIds.includes('titles');
    const stickersDisabled = disabledCategoryIds.includes('stickers');
    const vfxDisabled = disabledCategoryIds.includes('vfx');
    const cardsDisabled = disabledCategoryIds.includes('card');
    const effectsDisabled = disabledCategoryIds.includes('effects');

    // Compute CSS filter string (skip identity filter pass for raw/unadjusted video so GPU blit stays fast)
    const activeCssFilter = !filtersDisabled && activeFilter.id !== 'f_none' ? activeFilter.cssFilter : '';
    const hasAdj =
      colorAdjust.brightness !== 100 ||
      colorAdjust.contrast !== 100 ||
      colorAdjust.saturation !== 100 ||
      colorAdjust.warmth > 0;
    const adjFilter = hasAdj
      ? [
          colorAdjust.brightness !== 100 ? `brightness(${colorAdjust.brightness}%)` : '',
          colorAdjust.contrast !== 100 ? `contrast(${colorAdjust.contrast}%)` : '',
          colorAdjust.saturation !== 100 ? `saturate(${colorAdjust.saturation}%)` : '',
          colorAdjust.warmth > 0 ? `sepia(${Math.min(60, colorAdjust.warmth)}%)` : '',
        ]
          .filter(Boolean)
          .join(' ')
      : '';
    const combinedFilter = [activeCssFilter, adjFilter].filter(Boolean).join(' ') || 'none';

    const seamTrans = getActiveSeamTransitionAtTime(tSec, timelineClips);

    if (splitScreenConfig.enabled && !splitDisabled) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      const leftUrl = splitScreenConfig.leftMediaUrl || clip?.url || '';
      const leftType = splitScreenConfig.leftMediaUrl ? splitScreenConfig.leftMediaType : clip?.type || 'photo';
      const rightUrl =
        splitScreenConfig.rightMediaUrl || timelineClips[1]?.url || clip?.url || '';
      const rightType = splitScreenConfig.rightMediaUrl
        ? splitScreenConfig.rightMediaType
        : timelineClips[1]?.type || clip?.type || 'photo';
      const leftEl = leftUrl ? getOrLoadSource(leftUrl, leftType) : null;
      const rightEl = rightUrl ? getOrLoadSource(rightUrl, rightType) : null;
      ctx.filter = combinedFilter;
      drawSplitScreenComposition(ctx, w, h, splitScreenConfig, leftEl, rightEl);
      ctx.restore();
    } else if (seamTrans) {
      // Smoothly render outgoing -> incoming transition right across clip seam
      if (!transCanvasARef.current) transCanvasARef.current = document.createElement('canvas');
      if (!transCanvasBRef.current) transCanvasBRef.current = document.createElement('canvas');
      const cA = transCanvasARef.current;
      const cB = transCanvasBRef.current;
      if (cA.width !== w || cA.height !== h) {
        cA.width = w;
        cA.height = h;
      }
      if (cB.width !== w || cB.height !== h) {
        cB.width = w;
        cB.height = h;
      }
      const ctxA = cA.getContext('2d');
      const ctxB = cB.getContext('2d');
      if (ctxA && ctxB) {
        ctxA.clearRect(0, 0, w, h);
        ctxA.fillStyle = '#05070c';
        ctxA.fillRect(0, 0, w, h);
        const seamKey = `${seamTrans.outClip.id}->${seamTrans.inClip.id}`;
        const useFrozenOut =
          tSec >= seamTrans.seamSec &&
          transitionFrozenOutRef.current?.seamKey === seamKey &&
          (seamTrans.outClip.url === seamTrans.inClip.url || seamTrans.outClip.type === 'video');
        drawSingleClipContent(
          ctxA,
          w,
          h,
          seamTrans.outClip,
          tSec,
          combinedFilter,
          chromaDisabled,
          useFrozenOut ? transitionFrozenOutRef.current?.canvas : null
        );

        ctxB.clearRect(0, 0, w, h);
        ctxB.fillStyle = '#05070c';
        ctxB.fillRect(0, 0, w, h);
        drawSingleClipContent(ctxB, w, h, seamTrans.inClip, tSec, combinedFilter, chromaDisabled);

        drawTransitionComposite(ctx, w, h, cA, cB, seamTrans.transition.effectType, seamTrans.progress);
      }
    } else if (clip) {
      drawSingleClipContent(ctx, w, h, clip, tSec, combinedFilter, chromaDisabled);
    }

    ctx.translate(w / 2, h / 2);
    ctx.filter = 'none';

    // Subtle Vignette
    if (colorAdjust.vignette > 0) {
      const vig = ctx.createRadialGradient(0, 0, Math.min(w, h) * 0.35, 0, 0, Math.max(w, h) * 0.72);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, `rgba(0,0,0,${Math.min(0.8, colorAdjust.vignette / 100)})`);
      ctx.fillStyle = vig;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    // Active Visual Effect Overlay
    if (activeEffect && !effectsDisabled) {
      ctx.save();
      if (activeEffect.effectType === 'neon') {
        ctx.strokeStyle = activeEffect.accentColor || '#22d3ee';
        ctx.lineWidth = Math.max(4, Math.round(Math.min(w, h) * 0.012));
        ctx.globalAlpha = 0.72 + 0.25 * Math.sin(tSec * 4);
        ctx.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
      } else if (activeEffect.effectType === 'particles') {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = activeEffect.accentColor || '#fde68a';
        for (let i = 0; i < 24; i += 1) {
          const px = (((i * 97 + tSec * 70) % w) - w / 2);
          const py = (((i * 61 + tSec * 45) % h) - h / 2);
          ctx.globalAlpha = 0.45 + 0.35 * Math.sin(tSec * 3 + i);
          ctx.beginPath();
          ctx.arc(px, py, 2 + (i % 3) * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (activeEffect.effectType === 'halftone' || activeEffect.effectType === 'grain') {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        for (let y = -h / 2; y < h / 2; y += 6) {
          ctx.fillRect(-w / 2, y, w, 2);
        }
      } else {
        ctx.globalCompositeOperation = 'screen';
        const gr = ctx.createRadialGradient(-w * 0.18, -h * 0.15, 10, 0, 0, Math.max(w, h) * 0.75);
        gr.addColorStop(0, activeEffect.accentColor || 'rgba(56,189,248,0.45)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = gr;
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }
      ctx.restore();
    }

    if (trailerFxMode !== 'none' && !disabledCategoryIds.includes('templates')) {
      drawTrailerFxOverlay(ctx, w, h, trailerFxMode, tSec);
    }

    ctx.restore();

    // Screen-space Overlays (0..w, 0..h)
    if (!vfxDisabled) {
      vfxLayers.forEach((vLayer) => drawCinemaVfxOnCanvas(ctx, w, h, vLayer, tSec));
    }

    if (!stickersDisabled) {
      activeStickers.forEach((st) => {
        if (tSec < st.startTimeSec || tSec > st.startTimeSec + st.durationSec) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, st.opacity / 100));
        ctx.font = `${Math.round(Math.min(w, h) * 0.12 * st.scale)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.sticker.emoji, (st.xPct / 100) * w, (st.yPct / 100) * h);
        ctx.restore();
      });
    }

    if (!cardsDisabled) {
      trailerCardLayers.forEach((card) => {
        const src = card.imageUrl ? getOrLoadSource(card.imageUrl, card.mediaType) : null;
        drawTrailerCardOnCanvas(ctx, w, h, card, src, tSec);
      });
    }

    if (showTitleOverlay && !titlesDisabled && (movieTitle.trim() || subtitle.trim())) {
      drawAnimatedCinemaTitle(ctx, w, h, {
        movieTitle: movieTitle || 'CINE TITLE',
        subtitle,
        directorText: '',
        titleXPct: 50,
        titleYPct: 50,
        titleScale: 1,
        titleOpacity: 100,
        titleStartSec: 0,
        globalTimeSec: tSec,
        animationType: titleAnimType,
        themeType: titleThemeType,
        exportScaleRatio: w / 1280,
      });
    }

    if (
      activeDialogue &&
      !disabledCategoryIds.includes('dialogues') &&
      tSec >= 0 &&
      tSec <= activeDialogue.durationSec
    ) {
      ctx.save();
      const fontSize = Math.max(14, Math.round(h * 0.042));
      ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
      const caption = `${activeDialogue.speaker}: ${activeDialogue.text}`;
      const textW = Math.min(w * 0.86, ctx.measureText(caption).width + 26);
      const boxH = fontSize + 14;
      const boxX = (w - textW) / 2;
      const boxY = h - boxH - Math.round(h * 0.05);
      ctx.fillStyle = 'rgba(8, 12, 18, 0.78)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, textW, boxH, 8);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(caption, w / 2, boxY + boxH / 2, textW - 16);
      ctx.restore();
    }

    return index;
  };

  // Bridge latest closures into single persistent 60fps RAF loop (zero React effect churn)
  const loopBridgeRef = useRef({
    timelineClips,
    totalDuration,
    playbackSpeed,
    pxPerSec,
    getClipAtTime,
    syncMediaAudioAndSeek,
    renderFrameToCanvas,
    updatePlayheadDomInstant,
  });
  loopBridgeRef.current = {
    timelineClips,
    totalDuration,
    playbackSpeed,
    pxPerSec,
    getClipAtTime,
    syncMediaAudioAndSeek,
    renderFrameToCanvas,
    updatePlayheadDomInstant,
  };

  // Continuous 60fps requestAnimationFrame loop (mounts once; syncs timeline clock cleanly with native <video>)
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      const bridge = loopBridgeRef.current;

      if (isPlayingRef.current && !isScrubbingRef.current && bridge.totalDuration > 0) {
        const curSec = currentTimeRef.current;
        const { clip, clipStartSec, clipEndSec } = bridge.getClipAtTime(curSec, bridge.timelineClips);
        let nextTime = curSec + dt * bridge.playbackSpeed;

        // Lock timeline playhead cleanly to native <video> clock while active video clip is playing
        if (clip?.type === 'video' && clip.url) {
          const el = mediaCacheRef.current.get(`video:${clip.url}`);
          const lastSeekAt = lastSeekAtByUrlRef.current.get(clip.url) || 0;
          if (
            el instanceof HTMLVideoElement &&
            !el.paused &&
            !el.ended &&
            !el.seeking &&
            el.readyState >= 2 &&
            now - lastSeekAt > 250
          ) {
            const durCap = Number.isFinite(el.duration) && el.duration > 0.1 ? el.duration : Infinity;
            if (el.currentTime < durCap - 0.05) {
              const nativeTimelineSec = clipStartSec + Math.max(0, el.currentTime - (clip.sourceStartSec || 0));
              if (
                nativeTimelineSec >= curSec - 0.02 &&
                nativeTimelineSec <= clipEndSec + 0.08 &&
                nativeTimelineSec - curSec < 0.45
              ) {
                nextTime = Math.max(curSec, nativeTimelineSec);
              }
            }
          }
        }

        let finished = false;
        if (nextTime >= bridge.totalDuration) {
          nextTime = 0;
          finished = true;
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
        currentTimeRef.current = nextTime;

        // Instant DOM updates at 60fps without triggering full component re-render
        bridge.updatePlayheadDomInstant(nextTime, bridge.totalDuration, bridge.pxPerSec);
        bridge.syncMediaAudioAndSeek(nextTime, finished);

        if (finished || now - lastReactTimeSyncRef.current > 150) {
          lastReactTimeSyncRef.current = now;
          setCurrentTimeSec(nextTime);
        }

        // Smoothly keep red playhead in view while playing without fighting manual scrub
        const scroller = timelineScrollRef.current;
        if (scroller && scroller.clientWidth > 0) {
          const playheadPx = 20 + nextTime * bridge.pxPerSec;
          const leftBound = scroller.scrollLeft + 24;
          const rightBound = scroller.scrollLeft + scroller.clientWidth - 36;
          if (playheadPx > rightBound || playheadPx < leftBound) {
            scroller.scrollLeft = Math.max(0, playheadPx - scroller.clientWidth * 0.35);
          }
        }
        needsRenderRef.current = true;
      }

      if (isPlayingRef.current || needsRenderRef.current) {
        const canvas = previewCanvasRef.current;
        if (canvas) {
          if (!previewCtxRef.current || previewCtxRef.current.canvas !== canvas) {
            const freshCtx = canvas.getContext('2d');
            previewCtxRef.current = freshCtx ? { canvas, ctx: freshCtx } : null;
          }
          const ctx = previewCtxRef.current?.ctx;
          if (ctx) {
            needsRenderRef.current = false;
            bridge.renderFrameToCanvas(ctx, canvas.width, canvas.height, currentTimeRef.current);
          }
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      bgSaveTimersRef.current.forEach((tId) => window.clearTimeout(tId));
      bgSaveTimersRef.current = [];
    };
  }, []);

  // Repaint paused preview canvas only when editor visual state or timeline changes (zero idle GPU burn)
  useEffect(() => {
    needsRenderRef.current = true;
  }, [
    timelineClips,
    activeFilter,
    activeColorGradeId,
    colorAdjust,
    selectedAspectRatio,
    activeMotionPreset,
    showTitleOverlay,
    movieTitle,
    subtitle,
    titleAnimType,
    titleThemeType,
    activeStickers,
    vfxLayers,
    activeEffect,
    selectedTransitionObj,
    activeTransitionSeamClipId,
    activeTemplate,
    trailerFxMode,
    chromaConfig,
    splitScreenConfig,
    trailerCardLayers,
    activeDialogue,
    disabledCategoryIds,
  ]);

  // Keep DOM playhead & preview synced when clips/duration change while paused (without re-seeking on zoom)
  useEffect(() => {
    const clamped = Math.max(0, Math.min(totalDuration, currentTimeRef.current));
    if (clamped !== currentTimeRef.current) {
      currentTimeRef.current = clamped;
      setCurrentTimeSec(clamped);
    }
    needsRenderRef.current = true;
    updatePlayheadDomInstant(clamped, totalDuration, pxPerSec);
    if (!isPlayingRef.current && !isScrubbingRef.current && timelineClips.length > 0) {
      syncMediaAudioAndSeek(clamped, false);
    }
  }, [timelineClips, totalDuration]);

  // Keep playhead & ruler geometry synced on zoom change without re-seeking video elements
  useEffect(() => {
    updatePlayheadDomInstant(currentTimeRef.current, totalDuration, pxPerSec);
  }, [pxPerSec, totalDuration]);

  // Apply playbackRate, mute & volume changes immediately without triggering video seeks
  useEffect(() => {
    if (timelineClips.length > 0) {
      syncMediaAudioAndSeek(currentTimeRef.current, false);
    }
  }, [playbackSpeed, volume, isMuted, disabledCategoryIds]);

  const handleTogglePlayPause = () => {
    if (timelineClips.length === 0) return;
    const nextPlaying = !isPlayingRef.current;
    let startAt = currentTimeRef.current;
    let shouldSeekStart = false;
    if (nextPlaying && totalDuration > 0 && startAt >= totalDuration - 0.05) {
      startAt = 0;
      currentTimeRef.current = 0;
      setCurrentTimeSec(0);
      updatePlayheadDomInstant(0, totalDuration, pxPerSec);
      shouldSeekStart = true;
    }
    isPlayingRef.current = nextPlaying;
    needsRenderRef.current = true;
    setIsPlaying(nextPlaying);
    syncMediaAudioAndSeek(startAt, shouldSeekStart);
  };

  // Upload multiple local device files (Video / Photo) with single-decoder metadata & deferred IndexedDB persistence
  const handleUploadMediaFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    pushUndoCheckpoint();

    const fileArr = Array.from(files);
    const addedClips: TimelineClip[] = [];
    const addedGallery: MediaItem[] = [];

    for (const file of fileArr) {
      const isVideo = file.type.startsWith('video/');
      const isPhoto = file.type.startsWith('image/');
      if (!isVideo && !isPhoto) continue;

      const mediaId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const blobUrl = URL.createObjectURL(file);
      localMediaUrlMapRef.current.set(mediaId, blobUrl);

      const initialClip: TimelineClip = {
        id: `clip_${mediaId}`,
        mediaId,
        title: file.name.replace(/\.[^/.]+$/, '') || (isVideo ? 'Video Clip' : 'Photo'),
        durationSec: isVideo ? 5 : 4,
        sourceStartSec: 0,
        url: blobUrl,
        thumbnailUrl: isPhoto ? blobUrl : undefined,
        type: isVideo ? 'video' : 'photo',
        isProcessing: isVideo,
      };
      addedClips.push(initialClip);

      const initialGalleryItem: MediaItem = {
        id: mediaId,
        title: initialClip.title,
        type: initialClip.type,
        duration: formatDurationLabel(initialClip.durationSec),
        durationSec: initialClip.durationSec,
        url: blobUrl,
        thumbnailUrl: initialClip.thumbnailUrl,
        category: 'Device',
      };
      addedGallery.push(initialGalleryItem);

      const pendingMeta = {
        durationSec: initialClip.durationSec,
        duration: initialGalleryItem.duration,
        thumbnailUrl: initialClip.thumbnailUrl,
        persistedOnce: false,
      };

      // Defer heavy multi-MB Blob IndexedDB write so gallery selection renders on frame 0 instantaneously
      const saveTimer = window.setTimeout(() => {
        pendingMeta.persistedOnce = true;
        void saveLocalMediaRecord({
          id: mediaId,
          file,
          name: initialClip.title,
          mimeType: file.type,
          mediaType: isVideo ? 'video' : 'photo',
          duration: pendingMeta.duration,
          durationSec: pendingMeta.durationSec,
          thumbnailUrl: pendingMeta.thumbnailUrl,
          createdAt: Date.now(),
        });
      }, 900);
      bgSaveTimersRef.current.push(saveTimer);

      if (isVideo) {
        // Reuse the single cached <video> decoder to read exact duration & frame-0 thumbnail (no 2nd decoder lag)
        const cachedEl = getOrLoadSource(blobUrl, 'video');
        if (cachedEl instanceof HTMLVideoElement) {
          let metaSettled = false;
          const finishVideoMeta = () => {
            if (metaSettled) return;
            metaSettled = true;
            window.clearTimeout(fallbackTimer);
            const exactDur =
              Number.isFinite(cachedEl.duration) && cachedEl.duration > 0.15
                ? Number(cachedEl.duration.toFixed(2))
                : 5;
            const thumbUrl = captureVideoThumbnail(cachedEl);
            const durLabel = formatDurationLabel(exactDur);
            pendingMeta.durationSec = exactDur;
            pendingMeta.duration = durLabel;
            if (thumbUrl) pendingMeta.thumbnailUrl = thumbUrl;

            needsRenderRef.current = true;
            startTransition(() => {
              setTimelineClips((prev) =>
                prev.map((c) =>
                  c.id === initialClip.id
                    ? {
                        ...c,
                        durationSec: exactDur,
                        thumbnailUrl: thumbUrl || c.thumbnailUrl,
                        isProcessing: false,
                      }
                    : c
                )
              );
              setMediaGallery((prev) =>
                prev.map((m) =>
                  m.id === mediaId
                    ? {
                        ...m,
                        durationSec: exactDur,
                        duration: durLabel,
                        thumbnailUrl: thumbUrl || m.thumbnailUrl,
                      }
                    : m
                )
              );
            });

            if (pendingMeta.persistedOnce) {
              void updateLocalMediaMetadata(mediaId, {
                durationSec: exactDur,
                duration: durLabel,
                thumbnailUrl: thumbUrl,
              });
            }
          };

          const fallbackTimer = window.setTimeout(finishVideoMeta, 2500);

          if (cachedEl.readyState >= 2) {
            finishVideoMeta();
          } else {
            cachedEl.addEventListener('loadeddata', finishVideoMeta, { once: true });
            cachedEl.addEventListener('error', finishVideoMeta, { once: true });
          }
        }
      } else {
        getOrLoadSource(blobUrl, 'photo');
      }
    }

    if (addedClips.length > 0) {
      const prevTotalSec = timelineClips.reduce((acc, c) => acc + Math.max(0.2, c.durationSec || 4), 0);
      const addedTotalSec = addedClips.reduce((acc, c) => acc + Math.max(0.2, c.durationSec || 4), 0);
      const nextTotalSec = prevTotalSec + addedTotalSec;
      const targetStartSec = timelineClips.length === 0 ? 0 : prevTotalSec;

      needsRenderRef.current = true;
      setMediaGallery((prev) => [...addedGallery, ...prev]);
      setTimelineClips((prev) => {
        const next = [...prev, ...addedClips];
        setActiveClipIndex(Math.max(0, prev.length));
        return next;
      });
      setIsTimelineSelectionActive(true);
      setIsWheelFeaturePanelOpen(false);
      setIsInspectorOpen(false);

      // Update playhead, slider & scroll directly onto the newly added clip for instant preview
      currentTimeRef.current = targetStartSec;
      setCurrentTimeSec(targetStartSec);
      updatePlayheadDomInstant(targetStartSec, nextTotalSec, pxPerSec);
      window.requestAnimationFrame(() => {
        const scroller = timelineScrollRef.current;
        if (scroller) {
          scroller.scrollLeft = Math.max(0, 20 + targetStartSec * pxPerSec - 48);
        }
      });

      void recordVideoEditorActivity({
        actionType: 'add_media',
        projectTitle: 'CineStudio Project',
        clipCount: addedClips.length,
        resolution: exportResolution,
        aspectRatio: selectedAspectRatio,
        exportDurationSec: 0,
        user: currentUser,
      });
    }
  };

  // Upload user audio file
  const handleUploadAudioFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const url = URL.createObjectURL(file);
    const id = `uaud_${Date.now()}`;
    const exactDur = await extractAudioDuration(url);
    const newItem: AudioItem = {
      id,
      title: file.name.replace(/\.[^/.]+$/, '') || 'Device Audio',
      category: 'My Audio',
      duration: formatDurationLabel(exactDur),
      durationSec: exactDur,
      bpm: 120,
      mood: 'Local',
      description: 'Uploaded from device',
      synthPreset: 'cinematic',
      url,
    };
    setUserAudioLibrary((prev) => [newItem, ...prev]);
    setActiveAudio(newItem);
    setHasUserPickedAudio(true);
    setDisabledCategoryIds((prev) => prev.filter((x) => x !== 'audio' && x !== 'music'));
    void saveLocalMediaRecord({
      id,
      file,
      name: newItem.title,
      mimeType: file.type,
      mediaType: 'audio',
      duration: newItem.duration,
      durationSec: exactDur,
      createdAt: Date.now(),
    });
  };

  // Centered Red Playhead Scissors Auto-Split into Two Clips
  const handleSplitClipAtPlayhead = () => {
    if (timelineClips.length === 0) return;
    const splitTime = currentTimeRef.current;
    let cursor = 0;
    let targetIdx = -1;
    let offsetInside = 0;

    for (let i = 0; i < timelineClips.length; i += 1) {
      const dur = Math.max(0.2, timelineClips[i].durationSec || 4);
      if (splitTime >= cursor && splitTime <= cursor + dur + 0.001) {
        targetIdx = i;
        offsetInside = splitTime - cursor;
        break;
      }
      cursor += dur;
    }

    if (targetIdx < 0) {
      targetIdx = timelineClips.length - 1;
      const lastClip = timelineClips[targetIdx];
      offsetInside = (lastClip.durationSec || 4) / 2;
    }

    const targetClip = timelineClips[targetIdx];
    const totalClipDur = Math.max(0.2, targetClip.durationSec || 4);
    if (totalClipDur < 0.4) return;

    // Split cleanly at playhead offset (leaving >= 0.2s per segment) preserving exact combined duration
    const splitPoint = Number(
      Math.min(totalClipDur - 0.2, Math.max(0.2, offsetInside)).toFixed(2)
    );
    const secondDur = Number((totalClipDur - splitPoint).toFixed(2));
    if (splitPoint < 0.2 || secondDur < 0.2) return;

    pushUndoCheckpoint();
    const baseStart = targetClip.sourceStartSec || 0;
    const stamp = Date.now();
    const firstPart: TimelineClip = {
      ...targetClip,
      id: `${targetClip.id}_a_${stamp}`,
      durationSec: splitPoint,
      transitionOut: null,
    };
    const secondPart: TimelineClip = {
      ...targetClip,
      id: `${targetClip.id}_b_${stamp}`,
      title: `${targetClip.title} (2)`,
      sourceStartSec: Number((baseStart + splitPoint).toFixed(2)),
      durationSec: secondDur,
      transitionOut: targetClip.transitionOut || null,
    };

    const next = [...timelineClips];
    next.splice(targetIdx, 1, firstPart, secondPart);
    setTimelineClips(next);
    setActiveClipIndex(targetIdx + 1);
    setIsTimelineSelectionActive(true);
    syncMediaAudioAndSeek(splitTime, false);
  };

  const handleDeleteSelectedClip = () => {
    if (!isTimelineSelectionActive || !timelineClips[activeClipIndex]) return;
    pushUndoCheckpoint();
    const next = timelineClips.filter((_, idx) => idx !== activeClipIndex);
    setTimelineClips(next);
    setActiveClipIndex(Math.max(0, Math.min(next.length - 1, activeClipIndex)));
    if (next.length === 0) {
      setIsTimelineSelectionActive(false);
      currentTimeRef.current = 0;
      setCurrentTimeSec(0);
      setIsPlaying(false);
    }
  };

  const handleDuplicateSelectedClip = () => {
    const clip = timelineClips[activeClipIndex];
    if (!isTimelineSelectionActive || !clip) return;
    pushUndoCheckpoint();
    const dup: TimelineClip = {
      ...clip,
      id: `clip_${Date.now()}_dup`,
      title: `${clip.title} (Copy)`,
    };
    const next = [...timelineClips];
    next.splice(activeClipIndex + 1, 0, dup);
    setTimelineClips(next);
    setActiveClipIndex(activeClipIndex + 1);
  };

  // Round Control Wheel Selection:
  // - Tapping Media directly opens the phone gallery/file picker with NO extra options drawer
  // - Tapping same active open category closes drawer; tapping another switches immediately
  const handleSelectWheelCategory = (
    category: WheelCategoryItem,
    openDrawer = true,
    fromWheelTap = false
  ) => {
    setSelectedWheelCategoryId(category.id);
    setDisabledCategoryIds((prev) => prev.filter((id) => id !== category.id));

    if (category.id === 'video' && fromWheelTap) {
      setIsWheelFeaturePanelOpen(false);
      setIsInspectorOpen(false);
      multiFileInputRef.current?.click();
      return;
    }

    if (fromWheelTap && selectedWheelCategoryId === category.id && isWheelFeaturePanelOpen) {
      setIsWheelFeaturePanelOpen(false);
      return;
    }

    if (openDrawer) {
      setIsInspectorOpen(false);
      setIsWheelFeaturePanelOpen(true);
    }
  };

  const handleToggleCategoryMute = (category: WheelCategoryItem) => {
    if (category.id === 'video') {
      setIsMuted((m) => !m);
      return;
    }
    setDisabledCategoryIds((prev) => {
      const currentlyOff = prev.includes(category.id);
      if (currentlyOff) {
        return prev.filter((id) => id !== category.id);
      }
      // Cleanly turn off / mute active feature state
      if (category.id === 'audio' || category.id === 'music') {
        if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
        setPreviewingAudioId(null);
      }
      return [...prev, category.id];
    });
  };

  // Which wheel categories currently have active effects/media applied
  const activeFeatureIds = useMemo(() => {
    const ids: string[] = [];
    if (timelineClips.length > 0) ids.push('video');
    if (!isMuted && timelineClips.some((c) => c.type === 'video')) ids.push('audio');
    if (activeFilter.id !== 'f_none' || activeColorGradeId) ids.push('filters');
    if (hasUserPickedAudio) ids.push('music');
    if (activeDialogue) ids.push('dialogues');
    if (showTitleOverlay && movieTitle.trim()) ids.push('titles');
    if (activeStickers.length > 0) ids.push('stickers');
    if (vfxLayers.length > 0) ids.push('vfx');
    if (trailerCardLayers.length > 0) ids.push('card');
    if (chromaConfig.enabled) ids.push('chroma');
    if (splitScreenConfig.enabled) ids.push('split');
    if (selectedTransitionId) ids.push('transitions');
    if (activeEffect) ids.push('effects');
    if (activeTemplate) ids.push('templates');
    return ids;
  }, [
    timelineClips,
    isMuted,
    activeFilter.id,
    activeColorGradeId,
    hasUserPickedAudio,
    activeDialogue,
    showTitleOverlay,
    movieTitle,
    activeStickers.length,
    vfxLayers.length,
    trailerCardLayers.length,
    chromaConfig.enabled,
    splitScreenConfig.enabled,
    selectedTransitionId,
    activeEffect,
    activeTemplate,
  ]);

  const activeColorGradeObj = useMemo(
    () => (activeColorGradeId ? COLOR_GRADES_LIST.find((c) => c.id === activeColorGradeId) || null : null),
    [activeColorGradeId]
  );

  const activeCardPresetObj = useMemo(
    () => (activeCardPresetId ? TRAILER_CARDS_LIST.find((c) => c.id === activeCardPresetId) || null : null),
    [activeCardPresetId]
  );

  const seamPreviewThumbs = useMemo(() => {
    const seamIdx = activeTransitionSeamClipId
      ? timelineClips.findIndex((c) => c.id === activeTransitionSeamClipId)
      : Math.max(0, Math.min(timelineClips.length - 2, activeClipIndex));
    const idxA = seamIdx >= 0 ? seamIdx : 0;
    const clipA = timelineClips[idxA];
    const clipB = timelineClips[idxA + 1] || timelineClips[1];
    return {
      thumbA: clipA?.thumbnailUrl || (clipA?.type === 'photo' ? clipA?.url : undefined),
      thumbB: clipB?.thumbnailUrl || (clipB?.type === 'photo' ? clipB?.url : undefined),
    };
  }, [timelineClips, activeTransitionSeamClipId, activeClipIndex]);

  // Compact proportional overlay blocks for TimelinePanel (NEVER giant detached boxes!)
  const timelineOverlayBlocks: TimelineOverlayBlock[] = useMemo(() => {
    const blocks: TimelineOverlayBlock[] = [];
    const spanDur = Math.max(2, totalDuration || 4);

    if (activeFilter.id !== 'f_none') {
      blocks.push({
        id: 'ov_filter',
        trackId: 'filters',
        label: `Filter: ${activeFilter.name}`,
        startSec: 0,
        durationSec: spanDur,
        accentHex: '#22d3ee',
        muted: disabledCategoryIds.includes('filters'),
        selected: selectedWheelCategoryId === 'filters',
        onSelect: () => {
          setSelectedWheelCategoryId('filters');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    }

    if (activeColorGradeObj) {
      blocks.push({
        id: 'ov_grade',
        trackId: 'filters',
        label: `Grade: ${activeColorGradeObj.name}`,
        startSec: 0,
        durationSec: spanDur,
        accentHex: '#f59e0b',
        muted: disabledCategoryIds.includes('filters'),
        selected: selectedWheelCategoryId === 'filters',
        onSelect: () => {
          setSelectedWheelCategoryId('filters');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    }

    if (hasUserPickedAudio) {
      blocks.push({
        id: 'ov_music',
        trackId: 'music',
        label: `Music: ${activeAudio.title}`,
        startSec: 0,
        durationSec: Math.min(spanDur, activeAudio.durationSec || spanDur),
        accentHex: '#14b8a6',
        muted: disabledCategoryIds.includes('music') || isMuted,
        selected: selectedWheelCategoryId === 'music',
        onSelect: () => {
          setSelectedWheelCategoryId('music');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    }

    if (activeDialogue) {
      blocks.push({
        id: 'ov_dialogue',
        trackId: 'dialogues',
        label: `${activeDialogue.speaker}: ${activeDialogue.text}`,
        startSec: 0,
        durationSec: activeDialogue.durationSec,
        accentHex: '#fbbf24',
        muted: disabledCategoryIds.includes('dialogues'),
        selected: selectedWheelCategoryId === 'dialogues',
        onSelect: () => {
          setSelectedWheelCategoryId('dialogues');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    }

    if (showTitleOverlay && movieTitle.trim()) {
      blocks.push({
        id: 'ov_title',
        trackId: 'titles',
        label: `Title: ${movieTitle}`,
        startSec: 0,
        durationSec: Math.min(spanDur, 6),
        accentHex: '#f59e0b',
        muted: disabledCategoryIds.includes('titles'),
        selected: selectedWheelCategoryId === 'titles',
        onSelect: () => {
          setSelectedWheelCategoryId('titles');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    }

    activeStickers.forEach((st) => {
      blocks.push({
        id: st.id,
        trackId: 'stickers',
        label: `${st.sticker.emoji} ${st.sticker.name}`,
        startSec: st.startTimeSec,
        durationSec: st.durationSec,
        accentHex: '#38bdf8',
        muted: disabledCategoryIds.includes('stickers'),
        selected: selectedWheelCategoryId === 'stickers',
        onSelect: () => {
          setSelectedWheelCategoryId('stickers');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    });

    vfxLayers.forEach((v) => {
      blocks.push({
        id: v.id,
        trackId: 'vfx',
        label: `${v.vfx.emoji} ${v.vfx.name}`,
        startSec: v.startTimeSec,
        durationSec: v.durationSec,
        accentHex: '#fb7185',
        muted: disabledCategoryIds.includes('vfx'),
        selected: selectedWheelCategoryId === 'vfx',
        onSelect: () => {
          setSelectedWheelCategoryId('vfx');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    });

    trailerCardLayers.forEach((card) => {
      blocks.push({
        id: card.id,
        trackId: 'card',
        label: `Card: ${card.title}`,
        startSec: card.startTimeSec,
        durationSec: card.durationSec,
        accentHex: '#fbbf24',
        muted: disabledCategoryIds.includes('card'),
        selected: selectedWheelCategoryId === 'card',
        onSelect: () => {
          setSelectedWheelCategoryId('card');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    });

    if (chromaConfig.enabled) {
      blocks.push({
        id: 'ov_chroma',
        trackId: 'chroma',
        label: `Chroma: ${chromaConfig.colorPreset}`,
        startSec: 0,
        durationSec: spanDur,
        accentHex: '#10b981',
        muted: disabledCategoryIds.includes('chroma'),
        selected: selectedWheelCategoryId === 'chroma',
        onSelect: () => {
          setSelectedWheelCategoryId('chroma');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    }

    if (splitScreenConfig.enabled) {
      blocks.push({
        id: 'ov_split',
        trackId: 'split',
        label: `Split: ${splitScreenConfig.layout.replace('_', '/')}`,
        startSec: 0,
        durationSec: spanDur,
        accentHex: '#06b6d4',
        muted: disabledCategoryIds.includes('split'),
        selected: selectedWheelCategoryId === 'split',
        onSelect: () => {
          setSelectedWheelCategoryId('split');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    }

    // Render compact overlay strips for any per-seam clip transitions
    let seamCursor = 0;
    timelineClips.forEach((c, idx) => {
      const dur = Math.max(0.2, c.durationSec || 4);
      seamCursor += dur;
      if (idx < timelineClips.length - 1 && c.transitionOut) {
        const tr = c.transitionOut;
        const winDur = Math.max(0.4, Math.min(tr.durationSec, dur * 0.45));
        blocks.push({
          id: `ov_seam_${c.id}`,
          trackId: 'transitions',
          label: `Trans: ${tr.name}`,
          startSec: Math.max(0, seamCursor - winDur * 0.5),
          durationSec: winDur,
          accentHex: '#f59e0b',
          muted: disabledCategoryIds.includes('transitions'),
          selected: activeTransitionSeamClipId === c.id && selectedWheelCategoryId === 'transitions',
          onSelect: () => {
            setActiveTransitionSeamClipId(c.id);
            setSelectedTransitionId(tr.id);
            setSelectedTransitionObj(tr);
            setSelectedWheelCategoryId('transitions');
            setIsWheelFeaturePanelOpen(true);
          },
        });
      }
    });

    if (selectedTransitionObj && !timelineClips.some((c) => c.transitionOut)) {
      blocks.push({
        id: 'ov_transition',
        trackId: 'transitions',
        label: `Trans: ${selectedTransitionObj.name}`,
        startSec: activeTransitionStartSec,
        durationSec: Math.max(0.6, selectedTransitionObj.durationSec),
        accentHex: '#f59e0b',
        muted: disabledCategoryIds.includes('transitions'),
        selected: selectedWheelCategoryId === 'transitions',
        onSelect: () => {
          setSelectedWheelCategoryId('transitions');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    }

    if (activeEffect) {
      blocks.push({
        id: 'ov_effect',
        trackId: 'effects',
        label: `FX: ${activeEffect.name}`,
        startSec: 0,
        durationSec: spanDur,
        accentHex: '#c084fc',
        muted: disabledCategoryIds.includes('effects'),
        selected: selectedWheelCategoryId === 'effects',
        onSelect: () => {
          setSelectedWheelCategoryId('effects');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    }

    if (activeTemplate) {
      blocks.push({
        id: 'ov_template',
        trackId: 'templates',
        label: `Template: ${activeTemplate.title}`,
        startSec: activeTemplateStartSec,
        durationSec: Math.min(spanDur, activeTemplate.durationSec || spanDur),
        accentHex: '#2dd4bf',
        muted: disabledCategoryIds.includes('templates'),
        selected: selectedWheelCategoryId === 'templates',
        onSelect: () => {
          setSelectedWheelCategoryId('templates');
          setIsWheelFeaturePanelOpen(true);
        },
      });
    }

    return blocks;
  }, [
    totalDuration,
    timelineClips,
    activeTransitionSeamClipId,
    activeFilter,
    activeColorGradeObj,
    hasUserPickedAudio,
    activeAudio,
    activeDialogue,
    showTitleOverlay,
    movieTitle,
    activeStickers,
    vfxLayers,
    trailerCardLayers,
    chromaConfig,
    splitScreenConfig,
    selectedTransitionObj,
    activeTransitionStartSec,
    activeEffect,
    activeTemplate,
    activeTemplateStartSec,
    disabledCategoryIds,
    selectedWheelCategoryId,
    isMuted,
  ]);

  // Expressive WebAudio synth preview for comedy, animal, bird, thunder/rain & SFX items
  const handleToggleAudioPreview = (audio: AudioItem) => {
    if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    if (previewGainRef.current) {
      try {
        previewGainRef.current.disconnect();
      } catch {}
      previewGainRef.current = null;
    }

    if (previewingAudioId === audio.id) {
      setPreviewingAudioId(null);
      bgMusicElRef.current?.pause();
      return;
    }
    setPreviewingAudioId(audio.id);
    if (audio.url) {
      if (!bgMusicElRef.current) bgMusicElRef.current = new Audio();
      bgMusicElRef.current.src = audio.url;
      bgMusicElRef.current.currentTime = 0;
      bgMusicElRef.current.muted = false;
      bgMusicElRef.current.volume = 0.8;
      bgMusicElRef.current.play().catch(() => {});
      previewTimerRef.current = window.setTimeout(() => {
        bgMusicElRef.current?.pause();
        setPreviewingAudioId(null);
      }, 4500);
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const previewGain = ctx.createGain();
      previewGain.gain.value = 0.9;
      previewGain.connect(ctx.destination);
      previewGainRef.current = previewGain;
      const seed = parseInt(audio.id.replace(/\D/g, ''), 10) || 1;
      const playDur = scheduleSynthPreset(
        ctx,
        previewGain,
        audio.synthPreset,
        Math.min(4.2, audio.durationSec || 3),
        seed,
        ctx.currentTime + 0.02
      );
      previewTimerRef.current = window.setTimeout(() => {
        setPreviewingAudioId(null);
      }, Math.round(playDur * 1000) + 120);
    } catch {
      setPreviewingAudioId(null);
    }
  };

  // Player Circled Slider Pointer Scrubbing
  const getTimeFromSliderPointer = (clientX: number, clientY: number): number => {
    const track = playerSliderTrackRef.current;
    if (!track || totalDuration <= 0) return 0;
    const rect = track.getBoundingClientRect();
    let ratio = 0;
    if (isCssRotatedLandscape && rect.height > 0) {
      ratio = (clientY - rect.top) / rect.height;
    } else if (rect.width > 0) {
      ratio = (clientX - rect.left) / rect.width;
    }
    return Math.max(0, Math.min(totalDuration, ratio * totalDuration));
  };

  const handleSliderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isSliderDraggingRef.current = true;
    isScrubbingRef.current = true;
    wasPlayingBeforeScrubRef.current = isPlayingRef.current;
    if (isPlayingRef.current) setIsPlaying(false);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    seekToTime(getTimeFromSliderPointer(e.clientX, e.clientY), true);
  };

  const handleSliderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSliderDraggingRef.current) return;
    seekToTime(getTimeFromSliderPointer(e.clientX, e.clientY), true);
  };

  const handleSliderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSliderDraggingRef.current) return;
    isSliderDraggingRef.current = false;
    isScrubbingRef.current = false;
    setCurrentTimeSec(currentTimeRef.current);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (wasPlayingBeforeScrubRef.current) setIsPlaying(true);
  };

  // Real Local MP4 Export via WebCodecs + mp4-muxer
  const handleStartExport = async () => {
    if (timelineClips.length === 0 || isExporting) return;
    setIsPlaying(false);
    setIsExporting(true);
    setExportedVideoUrl(null);
    setExportProgress(4);
    setExportElapsedSec(0);
    setExportStatusText('Initializing encoder...');
    exportCancelRef.current = false;

    const { outW, outH } = computeRequestedExportDimensions(exportResolution, selectedAspectRatio);
    const probed = await probeSupportedVideoEncoderConfig(outW, outH, exportResolution, exportFps);
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = probed ? probed.outW : outW;
    exportCanvas.height = probed ? probed.outH : outH;
    const eCtx = exportCanvas.getContext('2d');

    if (!eCtx) {
      setIsExporting(false);
      setExportNotice('Canvas context unavailable on this device.');
      return;
    }

    // Build audio clip map
    const audioClips: ExportAudioSourceClip[] = [];
    let cursor = 0;
    for (const c of timelineClips) {
      const dur = Math.max(0.2, c.durationSec || 4);
      audioClips.push({
        url: c.url,
        type: c.type,
        startTimelineSec: cursor,
        durationSec: dur,
        sourceStartSec: c.sourceStartSec || 0,
      });
      cursor += dur;
    }

    const exactTotalSec = Math.max(0.5, cursor);

    try {
      if (probed) {
        const blob = await runWebCodecsMp4Export({
          exportCanvas,
          outW: probed.outW,
          outH: probed.outH,
          probedConfig: probed,
          fps: exportFps,
          exactTotalSec,
          speedFactor: playbackSpeed,
          isReversePlayback: false,
          clips: audioClips,
          bgAudioUrl:
            hasUserPickedAudio && !disabledCategoryIds.includes('music') ? activeAudio.url : undefined,
          volumePct: volume,
          isMuted: isMuted || disabledCategoryIds.includes('audio'),
          prepareFrameAtTime: async (tPos) => {
            const { clip, localSec } = getClipAtTime(tPos, timelineClips);
            if (clip && clip.type === 'video' && clip.url) {
              const el = getOrLoadSource(clip.url, 'video');
              if (el instanceof HTMLVideoElement) {
                await waitForVideoSeekReady(el, localSec);
              }
            }
          },
          renderFrameAtTime: (tPos) =>
            renderFrameToCanvas(eCtx, exportCanvas.width, exportCanvas.height, tPos),
          onProgress: (pct, elapsed) => {
            setExportProgress(pct);
            setExportElapsedSec(elapsed);
            setExportStatusText(`Encoding ${exportResolution} MP4...`);
          },
          shouldCancel: () => exportCancelRef.current,
        });

        if (blob) {
          const url = URL.createObjectURL(blob);
          setExportedMimeExt('mp4');
          setExportedVideoUrl(url);
          setExportProgress(100);
          setExportStatusText('MP4 Ready!');
          void recordVideoEditorActivity({
            actionType: 'export_video',
            projectTitle: movieTitle || 'CineStudio Export',
            clipCount: timelineClips.length,
            resolution: exportResolution,
            aspectRatio: selectedAspectRatio,
            exportDurationSec: Math.round(exactTotalSec),
            user: currentUser,
          });
        }
      } else {
        setExportNotice('Hardware MP4 encoder unavailable; please use Chrome/Android/Desktop browser.');
      }
    } catch (err: any) {
      setExportNotice(err?.message || 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const sliderPct = totalDuration > 0 ? Math.min(100, Math.max(0, (currentTimeSec / totalDuration) * 100)) : 0;

  // CSS Landscape Rotation Wrapper Geometry
  const containerStyle: React.CSSProperties | undefined = isCssRotatedLandscape
    ? {
        position: 'fixed',
        top: 0,
        left: `${viewportSize.width}px`,
        width: `${viewportSize.height}px`,
        height: `${viewportSize.width}px`,
        transform: 'rotate(90deg)',
        transformOrigin: 'top left',
      }
    : undefined;

  return (
    <div
      style={containerStyle}
      className={`${
        isCssRotatedLandscape ? '' : 'fixed inset-0 w-screen h-[100dvh]'
      } bg-[#080a0f] text-zinc-100 flex flex-col overflow-hidden select-none z-50`}
    >
      {/* Hidden File Inputs */}
      <input
        ref={multiFileInputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleUploadMediaFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={userAudioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          void handleUploadAudioFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={chromaBgInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            const mediaType = file.type.startsWith('video/') ? 'video' : 'photo';
            getOrLoadSource(url, mediaType);
            setChromaConfig((p) => ({
              ...p,
              enabled: true,
              bgMode: 'custom_media',
              bgMediaUrl: url,
              bgMediaType: mediaType,
              bgLabel: file.name,
            }));
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
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            const mediaType = file.type.startsWith('video/') ? 'video' : 'photo';
            getOrLoadSource(url, mediaType);
            setSplitScreenConfig((p) => ({
              ...p,
              enabled: true,
              leftMediaUrl: url,
              leftMediaType: mediaType,
              leftLabel: file.name,
            }));
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
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            const mediaType = file.type.startsWith('video/') ? 'video' : 'photo';
            getOrLoadSource(url, mediaType);
            setSplitScreenConfig((p) => ({
              ...p,
              enabled: true,
              rightMediaUrl: url,
              rightMediaType: mediaType,
              rightLabel: file.name,
            }));
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
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            const mediaType = file.type.startsWith('video/') ? 'video' : 'photo';
            getOrLoadSource(url, mediaType);
            setDraftCardImageUrl(url);
            setDraftCardMediaType(mediaType);
          }
          e.target.value = '';
        }}
      />

      {/* MAIN UPPER WORKSPACE ROW: Left Thin Rail + Center Preview + Right Circular Wheel */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 1. LEFT VERTICAL RAIL (Clean 40px rail; Delete/Duplicate/Split shown ONLY when clip selected) */}
        <div className="w-[42px] shrink-0 bg-[#0c1017] border-r border-zinc-800/80 flex flex-col items-center justify-between py-1.5 z-20">
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onBackToStoryboard}
              className="w-8 h-8 rounded-lg hover:bg-zinc-800 text-zinc-200 flex items-center justify-center cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="w-8 h-8 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 flex items-center justify-center cursor-pointer"
              title="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="w-8 h-8 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 flex items-center justify-center cursor-pointer"
              title="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            {isTimelineSelectionActive && timelineClips.length > 0 && (
              <>
                <div className="w-5 h-px bg-zinc-800 my-0.5" />
                <button
                  type="button"
                  onClick={handleDuplicateSelectedClip}
                  className="w-8 h-8 rounded-lg bg-[#161e2b] hover:bg-teal-400/20 text-teal-300 flex items-center justify-center cursor-pointer"
                  title="Duplicate Clip"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedClip}
                  className="w-8 h-8 rounded-lg bg-red-950/50 hover:bg-red-900/70 text-red-400 flex items-center justify-center cursor-pointer"
                  title="Delete Clip"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 relative">
            <button
              type="button"
              onClick={() => {
                setShowSettingsPopover(false);
                setShowAspectPopover((v) => !v);
              }}
              className="w-8 h-8 rounded-lg hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
              title={`Aspect Ratio (${selectedAspectRatio})`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAspectPopover(false);
                setShowSettingsPopover((v) => !v);
              }}
              className="w-8 h-8 rounded-lg hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
              title="Editor Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {showAspectPopover && (
              <div className="absolute left-11 bottom-0 z-40 w-44 p-1.5 rounded-xl bg-[#121824] border border-zinc-700 shadow-2xl space-y-1">
                {ASPECT_RATIO_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedAspectRatio(opt.id);
                      setShowAspectPopover(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded-lg text-left text-[10.5px] font-semibold flex items-center justify-between cursor-pointer ${
                      selectedAspectRatio === opt.id
                        ? 'bg-teal-400 text-black'
                        : 'text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedAspectRatio === opt.id && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}

            {showSettingsPopover && (
              <div className="absolute left-11 bottom-0 z-40 w-48 p-2 rounded-xl bg-[#121824] border border-zinc-700 shadow-2xl space-y-2 text-[10.5px]">
                <label className="flex items-center justify-between gap-2 text-zinc-200 cursor-pointer">
                  <span>Auto Landscape 16:9</span>
                  <input
                    type="checkbox"
                    checked={autoLandscapeRotate}
                    onChange={(e) => setAutoLandscapeRotate(e.target.checked)}
                    className="accent-teal-400"
                  />
                </label>
                {onOpenTerms && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsPopover(false);
                      onOpenTerms();
                    }}
                    className="w-full py-1.5 rounded-lg bg-[#1a2230] text-zinc-200 font-semibold cursor-pointer"
                  >
                    Terms & Privacy
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. CENTER: 16:9 VIDEO PREVIEW CANVAS + CIRCLED PLAYER SCRUB SLIDER */}
        <div className="flex-1 min-w-[160px] flex flex-col bg-[#06080c] p-1.5 justify-between overflow-hidden">
          <div
            className="flex-1 min-h-0 flex items-center justify-center relative overflow-hidden"
            style={{ containerType: 'size' }}
          >
            <div
              className="relative bg-black rounded-lg border border-zinc-800/90 overflow-hidden shadow-2xl flex items-center justify-center"
              style={{
                aspectRatio: `${activeAspectOpt.width} / ${activeAspectOpt.height}`,
                width: `min(100cqw, calc(100cqh * ${activeAspectOpt.width / activeAspectOpt.height}))`,
              }}
            >
              <canvas
                ref={previewCanvasRef}
                width={activeAspectOpt.width}
                height={activeAspectOpt.height}
                className="w-full h-full object-contain block"
              />
            </div>
          </div>

          {/* COMPACT PLAYER CONTROL BAR WITH FINGER-DRAGGABLE CIRCLED SLIDER */}
          <div className="h-8 mt-1 px-2 rounded-lg bg-[#0d121a] border border-zinc-800/80 flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => seekToTime(Math.max(0, currentTimeRef.current - 1), true)}
              className="w-6 h-6 rounded hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer shrink-0"
              title="Step Back 1s"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlayPause}
              className="w-6 h-6 rounded-full bg-teal-400 text-black flex items-center justify-center cursor-pointer shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3 h-3 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => seekToTime(Math.min(totalDuration, currentTimeRef.current + 1), true)}
              className="w-6 h-6 rounded hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer shrink-0"
              title="Step Forward 1s"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Interactive Circled Scrub Slider */}
            <div
              ref={playerSliderTrackRef}
              onPointerDown={handleSliderPointerDown}
              onPointerMove={handleSliderPointerMove}
              onPointerUp={handleSliderPointerUp}
              onPointerCancel={handleSliderPointerUp}
              className="relative flex-1 h-6 flex items-center cursor-pointer touch-none"
              title="Drag slider to scrub video"
            >
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  ref={playerSliderFillRef}
                  className="h-full bg-teal-400"
                  style={{ width: `${sliderPct}%` }}
                />
              </div>
              <div
                ref={playerSliderThumbRef}
                className="absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-teal-400 shadow -translate-x-1/2 pointer-events-none"
                style={{ left: `${sliderPct}%` }}
              />
            </div>

            <span
              ref={playerTimeLabelRef}
              className="text-[9.5px] font-mono text-zinc-300 tabular-nums shrink-0"
            >
              {formatTimecodeShort(currentTimeSec)} / {formatTimecodeShort(totalDuration)}
            </span>

            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              className="w-6 h-6 rounded hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer shrink-0"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 3. SIDE FEATURE DRAWER OR INSPECTOR (Sits cleanly beside the Wheel — NEVER covers the Wheel) */}
        {isWheelFeaturePanelOpen && (
          <WheelFeatureDrawer
            category={activeWheelCategory}
            isMutedOrOff={disabledCategoryIds.includes(activeWheelCategory.id)}
            onBack={() => setIsWheelFeaturePanelOpen(false)}
            onToggleMuteOrOff={() => handleToggleCategoryMute(activeWheelCategory)}
            mediaGallery={mediaGallery}
            activeMotionPresetId={activeMotionPreset?.id || null}
            onTriggerUploadMedia={() => multiFileInputRef.current?.click()}
            onAddMediaToTimeline={(item) => {
              pushUndoCheckpoint();
              getOrLoadSource(item.url, item.type);
              setTimelineClips((prev) => [
                ...prev,
                {
                  id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                  mediaId: item.id,
                  title: item.title,
                  durationSec: item.durationSec,
                  sourceStartSec: 0,
                  url: item.url,
                  thumbnailUrl: item.thumbnailUrl,
                  type: item.type,
                },
              ]);
              setIsTimelineSelectionActive(true);
            }}
            onApplyMediaMotionPreset={(mm) => {
              if (!mm) {
                setActiveMotionPreset(null);
                setPlaybackSpeed(1);
                return;
              }
              setActiveMotionPreset(mm);
              setPlaybackSpeed(mm.speed);
              if (mm.aspectRatio) {
                setSelectedAspectRatio(mm.aspectRatio);
              }
            }}
            activeFilter={activeFilter}
            onSelectFilter={(f) => {
              pushUndoCheckpoint();
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'filters'));
              setActiveFilter(f);
            }}
            activeColorGradeId={activeColorGradeId}
            onSelectColorGrade={(cg: ColorGradePreset | null) => {
              pushUndoCheckpoint();
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'filters'));
              if (!cg) {
                setActiveColorGradeId(null);
                setColorAdjust({ brightness: 100, contrast: 100, saturation: 100, warmth: 0, vignette: 12 });
              } else {
                setActiveColorGradeId(cg.id);
                setColorAdjust({
                  brightness: Math.max(40, Math.min(180, 100 + cg.brightness)),
                  contrast: Math.max(40, Math.min(200, 100 + cg.contrast)),
                  saturation: Math.max(0, Math.min(200, 100 + cg.saturation)),
                  warmth: cg.warmth,
                  vignette: cg.vignette,
                });
              }
            }}
            userAudioLibrary={userAudioLibrary}
            activeAudio={activeAudio}
            previewingAudioId={previewingAudioId}
            onSelectAudio={(a) => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'audio' && x !== 'music'));
              setHasUserPickedAudio(true);
              if (a.url) {
                setActiveAudio(a);
                if (!bgMusicElRef.current) bgMusicElRef.current = new Audio();
                bgMusicElRef.current.src = a.url;
                bgMusicElRef.current.loop = true;
                return;
              }
              setActiveAudio(a);
              const seed = parseInt(a.id.replace(/\D/g, ''), 10) || 1;
              void getOrRenderPresetWavUrl(a.synthPreset, a.durationSec, seed).then((wavUrl) => {
                if (!wavUrl) return;
                setActiveAudio((cur) => (cur.id === a.id ? { ...cur, url: wavUrl } : cur));
                if (!bgMusicElRef.current) bgMusicElRef.current = new Audio();
                bgMusicElRef.current.src = wavUrl;
                bgMusicElRef.current.loop = true;
                if (isPlayingRef.current && !isMuted) {
                  bgMusicElRef.current.play().catch(() => {});
                }
              });
            }}
            onToggleAudioPreview={handleToggleAudioPreview}
            onTriggerUploadAudio={() => userAudioInputRef.current?.click()}
            dialogueSpeaker={dialogueSpeakerInput}
            dialogueText={dialogueTextInput}
            dialogueDur={dialogueDurInput}
            activeDialoguePresetId={activeDialoguePresetId}
            onChangeDialogueSpeaker={setDialogueSpeakerInput}
            onChangeDialogueText={setDialogueTextInput}
            onChangeDialogueDur={setDialogueDurInput}
            onApplyDialogue={() => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'dialogues'));
              setActiveDialoguePresetId(null);
              setActiveDialogue({
                id: `dlg_${Date.now()}`,
                speaker: dialogueSpeakerInput || 'Speaker',
                text: dialogueTextInput || 'Line',
                durationSec: dialogueDurInput,
              });
            }}
            onApplyDialoguePreset={(dl: DialoguePresetItem) => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'dialogues'));
              setActiveDialoguePresetId(dl.id);
              setDialogueSpeakerInput(dl.speaker);
              setDialogueTextInput(dl.line);
              setDialogueDurInput(dl.durationSec);
              setActiveDialogue({
                id: dl.id,
                speaker: dl.speaker,
                text: dl.line,
                durationSec: dl.durationSec,
              });
            }}
            showTitleOverlay={showTitleOverlay}
            movieTitle={movieTitle}
            subtitle={subtitle}
            titleAnimType={titleAnimType}
            titleThemeType={titleThemeType}
            onApplyTitlePreset={(preset: TitleItem) => {
              pushUndoCheckpoint();
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'titles'));
              setMovieTitle(preset.titleText);
              setSubtitle(preset.subtitleText);
              setShowTitleOverlay(true);
            }}
            onUpdateTitleText={(t, sub) => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'titles'));
              setMovieTitle(t);
              setSubtitle(sub);
              setShowTitleOverlay(Boolean(t.trim() || sub.trim()));
            }}
            onChangeTitleAnim={setTitleAnimType}
            onChangeTitleTheme={setTitleThemeType}
            onAddSticker={(st) => {
              pushUndoCheckpoint();
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'stickers'));
              setLastAddedSticker(st);
              setActiveStickers((prev) => [
                ...prev,
                {
                  id: `st_${Date.now()}`,
                  sticker: st,
                  startTimeSec: currentTimeRef.current,
                  durationSec: 3,
                  xPct: 50,
                  yPct: 50,
                  scale: 1,
                  rotation: 0,
                  opacity: 100,
                },
              ]);
            }}
            onAddVfx={(v) => {
              pushUndoCheckpoint();
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'vfx'));
              setLastAddedVfx(v);
              setVfxLayers((prev) => [
                ...prev,
                {
                  id: `vfx_${Date.now()}`,
                  vfx: v,
                  startTimeSec: currentTimeRef.current,
                  durationSec: v.defaultDurationSec,
                  startXPct: 35,
                  startYPct: 55,
                  endXPct: 68,
                  endYPct: 45,
                  scale: 1,
                  opacity: 100,
                  speed: 1,
                  includeImpactBlood: true,
                },
              ]);
            }}
            draftCardTitle={draftCardTitle}
            draftCardSubtitle={draftCardSubtitle}
            draftCardTheme={draftCardTheme}
            draftCardAnim={draftCardAnim}
            activeCardPresetId={activeCardPresetId}
            onChangeDraftCardTitle={setDraftCardTitle}
            onChangeDraftCardSubtitle={setDraftCardSubtitle}
            onChangeDraftCardTheme={setDraftCardTheme}
            onChangeDraftCardAnim={setDraftCardAnim}
            onPickTrailerCardMedia={() => trailerCardInputRef.current?.click()}
            onAddTrailerCard={() => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'card'));
              setTrailerCardLayers((prev) => [
                ...prev,
                {
                  id: `card_${Date.now()}`,
                  imageUrl: draftCardImageUrl || timelineClips[0]?.url || '',
                  mediaType: draftCardImageUrl ? draftCardMediaType : timelineClips[0]?.type || 'photo',
                  title: draftCardTitle,
                  subtitle: draftCardSubtitle,
                  badgeText: 'TRAILER',
                  theme: draftCardTheme,
                  animation: draftCardAnim,
                  startTimeSec: currentTimeRef.current,
                  durationSec: 4,
                  scale: 1,
                  xPct: 50,
                  yPct: 50,
                  opacity: 100,
                },
              ]);
            }}
            onApplyTrailerCardPreset={(card: TrailerCardPresetItem) => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'card'));
              setActiveCardPresetId(card.id);
              setDraftCardTitle(card.title);
              setDraftCardSubtitle(card.subtitle);
              setDraftCardTheme(card.theme);
              setDraftCardAnim(card.animation);
              setTrailerCardLayers((prev) => [
                ...prev,
                {
                  id: `card_${Date.now()}`,
                  imageUrl: draftCardImageUrl || timelineClips[0]?.url || '',
                  mediaType: draftCardImageUrl ? draftCardMediaType : timelineClips[0]?.type || 'photo',
                  title: card.title,
                  subtitle: card.subtitle,
                  badgeText: card.badgeText,
                  theme: card.theme,
                  animation: card.animation,
                  startTimeSec: currentTimeRef.current,
                  durationSec: card.durationSec,
                  scale: 1,
                  xPct: 50,
                  yPct: 50,
                  opacity: 100,
                },
              ]);
            }}
            chromaConfig={chromaConfig}
            activeChromaPresetId={activeChromaPresetId}
            onUpdateChromaConfig={(updater) => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'chroma'));
              setChromaConfig(updater);
            }}
            onPickChromaBg={() => chromaBgInputRef.current?.click()}
            onApplyChromaPreset={(ch: ChromaPresetItem) => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'chroma'));
              setActiveChromaPresetId(ch.id);
              setChromaConfig((p) => ({
                ...p,
                enabled: true,
                colorPreset: ch.colorPreset,
                bgMode: ch.bgMode,
                similarity: ch.similarity,
                smoothness: ch.smoothness,
              }));
            }}
            splitScreenConfig={splitScreenConfig}
            activeSplitPresetId={activeSplitPresetId}
            onUpdateSplitScreenConfig={(updater) => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'split'));
              setSplitScreenConfig(updater);
            }}
            onPickSplitSide={(side) => {
              if (side === 'left') splitLeftInputRef.current?.click();
              else splitRightInputRef.current?.click();
            }}
            onAutoJoinSplitClips={() => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'split'));
              const c1 = timelineClips[0];
              const c2 = timelineClips[1] || timelineClips[0];
              setSplitScreenConfig((p) => ({
                ...p,
                enabled: true,
                leftMediaUrl: c1?.url || p.leftMediaUrl,
                leftMediaType: c1?.type || p.leftMediaType,
                rightMediaUrl: c2?.url || p.rightMediaUrl,
                rightMediaType: c2?.type || p.rightMediaType,
              }));
            }}
            onApplySplitPreset={(sp: SplitLayoutPresetItem) => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'split'));
              setActiveSplitPresetId(sp.id);
              const c1 = timelineClips[0];
              const c2 = timelineClips[1] || timelineClips[0];
              setSplitScreenConfig((p) => ({
                ...p,
                enabled: true,
                layout: sp.layout,
                splitRatio: sp.splitRatio,
                gapPx: sp.gapPx,
                leftMediaUrl: p.leftMediaUrl || c1?.url || '',
                leftMediaType: p.leftMediaUrl ? p.leftMediaType : c1?.type || 'photo',
                rightMediaUrl: p.rightMediaUrl || c2?.url || '',
                rightMediaType: p.rightMediaUrl ? p.rightMediaType : c2?.type || 'photo',
              }));
            }}
            selectedTransitionId={selectedTransitionId}
            activeTransitionObj={selectedTransitionObj}
            onSelectTransition={(tr) => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'transitions'));
              if (!tr) {
                setSelectedTransitionId(null);
                setSelectedTransitionObj(null);
                if (activeTransitionSeamClipId) {
                  pushUndoCheckpoint();
                  setTimelineClips((prev) =>
                    prev.map((c) => (c.id === activeTransitionSeamClipId ? { ...c, transitionOut: null } : c))
                  );
                }
                return;
              }
              setSelectedTransitionId(tr.id);
              setSelectedTransitionObj(tr);
              setActiveTransitionStartSec(currentTimeRef.current);
              if (timelineClips.length >= 2) {
                pushUndoCheckpoint();
                const seamIdx = activeTransitionSeamClipId
                  ? timelineClips.findIndex((c) => c.id === activeTransitionSeamClipId)
                  : Math.min(timelineClips.length - 2, Math.max(0, activeClipIndex));
                const validIdx = seamIdx >= 0 && seamIdx < timelineClips.length - 1 ? seamIdx : 0;
                const targetId = timelineClips[validIdx]?.id;
                if (targetId) {
                  setActiveTransitionSeamClipId(targetId);
                  setTimelineClips((prev) =>
                    prev.map((c) => (c.id === targetId ? { ...c, transitionOut: tr } : c))
                  );
                  if (!isPlayingRef.current) {
                    let seamSec = 0;
                    for (let i = 0; i <= validIdx; i += 1) {
                      seamSec += Math.max(0.2, timelineClips[i].durationSec || 4);
                    }
                    seekToTime(seamSec, true);
                  }
                }
              }
            }}
            activeEffect={activeEffect}
            onSelectEffect={(fx) => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'effects'));
              setActiveEffect(fx);
            }}
            activeTemplateId={activeTemplate?.id || null}
            activeTemplateObj={activeTemplate}
            onApplyTemplate={(tm) => {
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'templates'));
              setActiveTemplate(tm);
              setActiveTemplateStartSec(0);
              setMovieTitle(tm.movieTitle);
              setSubtitle(tm.subtitle);
              setShowTitleOverlay(true);
            }}
            onApplyTrailerPack={(packId) => {
              const pack = TRAILER_PRESET_PACKS.find((p) => p.id === packId);
              if (!pack) return;
              setDisabledCategoryIds((p) => p.filter((x) => x !== 'templates'));
              setMovieTitle(pack.title);
              setSubtitle(pack.subtitle);
              setTitleAnimType(pack.titleAnim);
              setTitleThemeType(pack.titleTheme);
              setTrailerFxMode(pack.fxMode);
              setShowTitleOverlay(true);
              setActiveTemplateStartSec(0);
              setActiveTemplate({
                ...TEMPLATES_LIST[0],
                id: `pack_${pack.id}`,
                title: pack.name,
                movieTitle: pack.title,
                subtitle: pack.subtitle,
                durationSec: Math.max(4, totalDuration || 8),
              });
            }}
            primaryClipThumbUrl={seamPreviewThumbs.thumbA}
            secondaryClipThumbUrl={seamPreviewThumbs.thumbB}
            activeColorGradeObj={activeColorGradeObj}
            activeMotionPresetObj={activeMotionPreset}
            activeDialogueObj={activeDialogue}
            activeCardPresetObj={activeCardPresetObj}
            activeVfxObj={lastAddedVfx}
            activeStickerObj={lastAddedSticker}
          />
        )}

        {isInspectorOpen && (
          <aside className="w-[216px] sm:w-[258px] shrink-0 h-full bg-[#0b0f16] border-l border-zinc-800 flex flex-col overflow-hidden z-20">
            <div className="h-9 px-2 border-b border-zinc-800 bg-[#10151f] flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" />
                <span>Inspector</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setColorAdjust({ brightness: 100, contrast: 100, saturation: 100, warmth: 0, vignette: 12 });
                    setPlaybackSpeed(1);
                    setVolume(85);
                  }}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(false)}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 text-[10px]">
              {[
                { label: 'Brightness', val: colorAdjust.brightness, min: 40, max: 180, key: 'brightness' as const },
                { label: 'Contrast', val: colorAdjust.contrast, min: 40, max: 200, key: 'contrast' as const },
                { label: 'Saturation', val: colorAdjust.saturation, min: 0, max: 200, key: 'saturation' as const },
                { label: 'Warmth', val: colorAdjust.warmth, min: 0, max: 80, key: 'warmth' as const },
                { label: 'Vignette', val: colorAdjust.vignette, min: 0, max: 90, key: 'vignette' as const },
              ].map((s) => (
                <div key={s.key} className="space-y-0.5">
                  <div className="flex justify-between text-zinc-300">
                    <span>{s.label}</span>
                    <span className="font-mono tabular-nums text-teal-300">{s.val}%</span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    value={s.val}
                    onChange={(e) =>
                      setColorAdjust((p) => ({ ...p, [s.key]: Number(e.target.value) }))
                    }
                    className="w-full accent-teal-400"
                  />
                </div>
              ))}
              <div className="space-y-0.5 pt-1 border-t border-zinc-800">
                <div className="flex justify-between text-zinc-300">
                  <span>Speed</span>
                  <span className="font-mono tabular-nums text-amber-300">{playbackSpeed}x</span>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={3}
                  step={0.25}
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-zinc-300">
                  <span>Master Volume</span>
                  <span className="font-mono tabular-nums text-emerald-300">{volume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-zinc-300">
                  <span>Timeline Zoom</span>
                  <span className="font-mono tabular-nums text-cyan-300">{timelineZoom.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={timelineZoom}
                  onChange={(e) => setTimelineZoom(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </aside>
        )}

        {/* 4. RIGHT SIDE: CIRCULAR TOOL WHEEL (Always uncovered & interactive) */}
        <div
          className={`relative ${
            isCompactLandscape ? 'w-[202px]' : 'w-[234px] sm:w-[266px]'
          } shrink-0 bg-[#0b0e13] border-l border-zinc-800/80 flex flex-col items-center justify-center overflow-hidden`}
        >
          <CircularToolWheel
            activeCategoryId={selectedWheelCategoryId}
            disabledCategoryIds={disabledCategoryIds}
            activeFeatureIds={activeFeatureIds}
            onSelectCategory={handleSelectWheelCategory}
            onToggleCategoryMute={handleToggleCategoryMute}
            isToolDrawerOpen={isWheelFeaturePanelOpen}
            onToggleToolDrawer={() => {
              setIsInspectorOpen(false);
              setIsWheelFeaturePanelOpen((o) => !o);
            }}
            isInspectorOpen={isInspectorOpen}
            onToggleInspector={() => {
              setIsWheelFeaturePanelOpen(false);
              setIsInspectorOpen((o) => !o);
            }}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlayPause}
            onExport={() => setShowExportModal(true)}
            aspectRatio={selectedAspectRatio}
            compact={isCompactLandscape}
          />

          <div className="mt-0.5 text-[9px] font-mono text-zinc-400 tabular-nums">
            {selectedAspectRatio} · {activeWheelCategory.shortLabel}
            {disabledCategoryIds.includes(activeWheelCategory.id) ? ' (Muted)' : ''}
          </div>
        </div>
      </div>

      {/* LOWER TIMELINE DOCK (Compact, exact ruler alignment, smooth scroll & scrubbing) */}
      <div className="h-[112px] sm:h-[126px] shrink-0 flex flex-col">
        <TimelinePanel
          clips={timelineClips}
          activeClipIndex={activeClipIndex}
          isTimelineSelectionActive={isTimelineSelectionActive}
          activeCategory={activeWheelCategory}
          disabledCategoryIds={disabledCategoryIds}
          currentTimeSec={currentTimeSec}
          totalDurationSec={totalDuration}
          pxPerSec={pxPerSec}
          isClipAudioMuted={isMuted || disabledCategoryIds.includes('audio')}
          isPlaying={isPlaying}
          isCssRotatedLandscape={isCssRotatedLandscape}
          overlayBlocks={timelineOverlayBlocks}
          onSelectClip={(idx) => {
            setActiveClipIndex(idx);
            setIsTimelineSelectionActive(true);
            setSelectedWheelCategoryId('video');
          }}
          onSeekToTime={(sec) => seekToTime(sec, true)}
          onScrubStart={() => {
            isScrubbingRef.current = true;
            wasPlayingBeforeScrubRef.current = isPlayingRef.current;
            if (isPlayingRef.current) setIsPlaying(false);
          }}
          onScrubEnd={() => {
            isScrubbingRef.current = false;
            if (wasPlayingBeforeScrubRef.current) setIsPlaying(true);
          }}
          onRequestAddMedia={() => multiFileInputRef.current?.click()}
          onOpenActiveCategoryPanel={() => setIsWheelFeaturePanelOpen(true)}
          onToggleCategoryMute={handleToggleCategoryMute}
          onSplitAtPlayhead={handleSplitClipAtPlayhead}
          activeTransitionSeamClipId={activeTransitionSeamClipId}
          onSelectTransitionSeam={(clipIndex) => {
            const seamClip = timelineClips[clipIndex];
            if (!seamClip) return;
            setActiveTransitionSeamClipId(seamClip.id);
            setSelectedTransitionId(seamClip.transitionOut?.id || null);
            setSelectedTransitionObj(seamClip.transitionOut || null);
            setSelectedWheelCategoryId('transitions');
            setIsInspectorOpen(false);
            setIsWheelFeaturePanelOpen(true);
          }}
          timelineScrollRef={timelineScrollRef}
          playheadLineRef={playheadLineRef}
          redBadgeTimeRef={redBadgeTimeRef}
        />
      </div>

      {/* Compact Bottom Ad Bar when vertical viewport allows */}
      {!isCompactLandscape && <EditorBottomVideoAdBar slotId="studio-bottom" />}

      {/* EXPORT VIDEO MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111620] border border-zinc-800 p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Export Video ({selectedAspectRatio})
              </h3>
              <button
                type="button"
                onClick={() => {
                  exportCancelRef.current = true;
                  setShowExportModal(false);
                }}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isExporting && !exportedVideoUrl && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {(['720p', '1080p', '4K'] as const).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setExportResolution(res)}
                      className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                        exportResolution === res
                          ? 'bg-teal-400 text-black border-teal-200'
                          : 'bg-[#171e2b] text-zinc-200 border-zinc-800'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([30, 60] as const).map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => setExportFps(fps)}
                      className={`py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                        exportFps === fps
                          ? 'bg-amber-400 text-black border-amber-200'
                          : 'bg-[#171e2b] text-zinc-200 border-zinc-800'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void handleStartExport()}
                  disabled={timelineClips.length === 0}
                  className="w-full py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 disabled:opacity-40 text-black text-xs font-extrabold cursor-pointer"
                >
                  {timelineClips.length === 0 ? 'Add Media Clips First' : `Start ${exportResolution} MP4 Export`}
                </button>
              </>
            )}

            {isExporting && (
              <ExportModalVideoAdPlayer
                active={isExporting}
                progress={exportProgress}
                elapsedSec={exportElapsedSec}
                totalSec={totalDuration}
                statusText={exportStatusText}
              />
            )}

            {exportedVideoUrl && (
              <div className="space-y-2.5">
                <video
                  src={exportedVideoUrl}
                  controls
                  playsInline
                  className="w-full rounded-xl bg-black max-h-48"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const filename = `cinestudio_${Date.now()}.${exportedMimeExt}`;
                      triggerLocalBlobDownload(exportedVideoUrl, filename);
                      setExportNotice('Saved to Downloads.');
                    }}
                    className="flex-1 py-2 rounded-xl bg-teal-400 text-black text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {exportedMimeExt.toUpperCase()}</span>
                  </button>
                  {canShareMediaFile(`cinestudio.${exportedMimeExt}`) && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await shareMediaBlobToDevice(
                          exportedVideoUrl,
                          `cinestudio_${Date.now()}.${exportedMimeExt}`
                        );
                        setExportNotice(res === 'shared' ? 'Shared!' : 'Saved locally.');
                      }}
                      className="px-3 py-2 rounded-xl bg-[#1a2230] border border-zinc-700 text-zinc-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {exportNotice && (
              <p className="text-[11px] text-teal-300 text-center font-medium">{exportNotice}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};