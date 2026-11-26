import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  AUDIO_LIST,
  TEMPLATES_LIST,
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

async function extractVideoMetadataAndThumb(
  url: string
): Promise<{ durationSec: number; thumbnailUrl?: string }> {
  if (typeof document === 'undefined') return { durationSec: 5 };
  return new Promise((resolve) => {
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.muted = true;
    vid.playsInline = true;
    vid.crossOrigin = 'anonymous';
    let settled = false;
    const finish = (dur: number, thumb?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        vid.pause();
        vid.removeAttribute('src');
        vid.load();
      } catch {}
      resolve({ durationSec: dur, thumbnailUrl: thumb });
    };

    const timer = window.setTimeout(() => {
      const fallbackDur = Number.isFinite(vid.duration) && vid.duration > 0.2 ? vid.duration : 5;
      finish(Number(fallbackDur.toFixed(2)));
    }, 3500);

    vid.onloadedmetadata = () => {
      const exactDur =
        Number.isFinite(vid.duration) && vid.duration > 0.15 ? Number(vid.duration.toFixed(2)) : 5;
      try {
        vid.currentTime = Math.min(0.4, Math.max(0.05, exactDur * 0.15));
      } catch {
        finish(exactDur);
      }
    };

    vid.onseeked = () => {
      const exactDur =
        Number.isFinite(vid.duration) && vid.duration > 0.15 ? Number(vid.duration.toFixed(2)) : 5;
      let thumb: string | undefined;
      try {
        if (vid.videoWidth > 0 && vid.videoHeight > 0) {
          const c = document.createElement('canvas');
          c.width = 160;
          c.height = 90;
          const cCtx = c.getContext('2d');
          if (cCtx) {
            cCtx.drawImage(vid, 0, 0, c.width, c.height);
            thumb = c.toDataURL('image/jpeg', 0.72);
          }
        }
      } catch {}
      finish(exactDur, thumb);
    };

    vid.onerror = () => finish(5);
    vid.src = url;
  });
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
  const [activeAudio, setActiveAudio] = useState<AudioItem>(AUDIO_LIST[0]);
  const [hasUserPickedAudio, setHasUserPickedAudio] = useState<boolean>(false);
  const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<{
    id: string;
    speaker: string;
    text: string;
    durationSec: number;
  } | null>(null);
  const [dialogueSpeakerInput, setDialogueSpeakerInput] = useState<string>('Hero');
  const [dialogueTextInput, setDialogueTextInput] = useState<string>('Cinema Dialogue');
  const [dialogueDurInput, setDialogueDurInput] = useState<number>(5);

  // Titles, Stickers, VFX, Effects, Transitions, Templates, Chroma, Split, Cards
  const [showTitleOverlay, setShowTitleOverlay] = useState<boolean>(false);
  const [movieTitle, setMovieTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [titleAnimType, setTitleAnimType] = useState<TitleAnimationType>('zoom_slam');
  const [titleThemeType, setTitleThemeType] = useState<TitleThemeType>('blockbuster_gold');

  const [activeStickers, setActiveStickers] = useState<TimelineStickerLayer[]>([]);
  const [vfxLayers, setVfxLayers] = useState<TimelineVfxLayer[]>([]);
  const [activeEffect, setActiveEffect] = useState<EffectItem | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [selectedTransitionObj, setSelectedTransitionObj] = useState<TransitionItem | null>(null);
  const [activeTransitionStartSec, setActiveTransitionStartSec] = useState<number>(0);
  const [activeTemplate, setActiveTemplate] = useState<TemplateItem | null>(null);
  const [activeTemplateStartSec, setActiveTemplateStartSec] = useState<number>(0);
  const [trailerFxMode, setTrailerFxMode] = useState<TrailerFxMode>('none');

  const [chromaConfig, setChromaConfig] = useState<ChromaKeyConfig>(DEFAULT_CHROMA_KEY_CONFIG);
  const [splitScreenConfig, setSplitScreenConfig] = useState<SplitScreenConfig>(DEFAULT_SPLIT_SCREEN_CONFIG);

  const [trailerCardLayers, setTrailerCardLayers] = useState<TrailerCardLayer[]>([]);
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
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const playheadLineRef = useRef<HTMLDivElement | null>(null);
  const redBadgeTimeRef = useRef<HTMLSpanElement | null>(null);
  const playerSliderTrackRef = useRef<HTMLDivElement | null>(null);

  const multiFileInputRef = useRef<HTMLInputElement | null>(null);
  const userAudioInputRef = useRef<HTMLInputElement | null>(null);
  const chromaBgInputRef = useRef<HTMLInputElement | null>(null);
  const splitLeftInputRef = useRef<HTMLInputElement | null>(null);
  const splitRightInputRef = useRef<HTMLInputElement | null>(null);
  const trailerCardInputRef = useRef<HTMLInputElement | null>(null);

  const mediaCacheRef = useRef<Map<string, HTMLImageElement | HTMLVideoElement>>(new Map());
  const localMediaUrlMapRef = useRef<Map<string, string>>(new Map());
  const bgMusicElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewTimerRef = useRef<number | null>(null);

  const currentTimeRef = useRef<number>(0);
  currentTimeRef.current = currentTimeSec;
  const isPlayingRef = useRef<boolean>(false);
  isPlayingRef.current = isPlaying;
  const isScrubbingRef = useRef<boolean>(false);
  const wasPlayingBeforeScrubRef = useRef<boolean>(false);
  const isSliderDraggingRef = useRef<boolean>(false);

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
    const a = [...userAudioLibrary, ...AUDIO_LIST].find((x) => x.id === snap.audioId);
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

  // Preload & cache HTMLVideoElement / HTMLImageElement sources
  const getOrLoadSource = (url: string, type: 'video' | 'photo'): HTMLVideoElement | HTMLImageElement | null => {
    if (!url || typeof document === 'undefined') return null;
    const key = `${type}:${url}`;
    const existing = mediaCacheRef.current.get(key);
    if (existing) return existing;

    if (type === 'photo') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      mediaCacheRef.current.set(key, img);
      return img;
    }

    const vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.preload = 'auto';
    vid.playsInline = true;
    vid.muted = true;
    vid.src = url;
    mediaCacheRef.current.set(key, vid);
    return vid;
  };

  // Determine active clip + local source offset for any timeline second
  const getClipAtTime = (
    timeSec: number,
    clipsList: TimelineClip[]
  ): { clip: TimelineClip | null; index: number; localSec: number } => {
    if (!clipsList.length) return { clip: null, index: 0, localSec: 0 };
    let cursor = 0;
    for (let i = 0; i < clipsList.length; i += 1) {
      const c = clipsList[i];
      const dur = Math.max(0.2, c.durationSec || 4);
      if (timeSec <= cursor + dur || i === clipsList.length - 1) {
        const localOffset = Math.max(0, Math.min(dur, timeSec - cursor));
        return {
          clip: c,
          index: i,
          localSec: (c.sourceStartSec || 0) + localOffset,
        };
      }
      cursor += dur;
    }
    return { clip: clipsList[0], index: 0, localSec: 0 };
  };

  // Sync audio mute & playback for active clip video elements
  const syncMediaAudioAndSeek = (timeSec: number, forceSeek: boolean) => {
    const isClipAudioDisabled =
      isMuted ||
      disabledCategoryIds.includes('audio') ||
      volume <= 0;
    const { clip, index, localSec } = getClipAtTime(timeSec, timelineClips);
    if (index !== activeClipIndex && timelineClips[index]) {
      setActiveClipIndex(index);
    }

    timelineClips.forEach((c) => {
      if (c.type !== 'video' || !c.url) return;
      const el = mediaCacheRef.current.get(`video:${c.url}`);
      if (!(el instanceof HTMLVideoElement)) return;
      const isActive = clip?.id === c.id;
      el.muted = !isActive || isClipAudioDisabled;
      el.volume = Math.max(0, Math.min(1, volume / 100));
      el.playbackRate = playbackSpeed;

      if (isActive) {
        if (forceSeek || Math.abs((el.currentTime || 0) - localSec) > 0.25) {
          try {
            const safeMax = Number.isFinite(el.duration) && el.duration > 0.05 ? el.duration - 0.02 : localSec;
            el.currentTime = Math.max(0, Math.min(safeMax, localSec));
          } catch {}
        }
        if (isPlayingRef.current && !isScrubbingRef.current && el.paused) {
          el.play().catch(() => {});
        } else if ((!isPlayingRef.current || isScrubbingRef.current) && !el.paused) {
          el.pause();
        }
      } else if (!el.paused) {
        el.pause();
      }
    });

    // Background Music / Audio track sync
    if (bgMusicElRef.current) {
      const musicDisabled = isMuted || disabledCategoryIds.includes('music');
      bgMusicElRef.current.muted = musicDisabled || !hasUserPickedAudio;
      bgMusicElRef.current.volume = Math.max(0, Math.min(1, (volume / 100) * 0.7));
      if (isPlayingRef.current && !isScrubbingRef.current && hasUserPickedAudio && !musicDisabled) {
        if (bgMusicElRef.current.paused) bgMusicElRef.current.play().catch(() => {});
      } else if (!bgMusicElRef.current.paused) {
        bgMusicElRef.current.pause();
      }
    }
  };

  // Seek cleanly across timeline, video tags & canvas
  const seekToTime = (targetSec: number, forceVideoSeek = true) => {
    const clamped = Math.max(0, Math.min(totalDuration, targetSec));
    currentTimeRef.current = clamped;
    setCurrentTimeSec(clamped);
    syncMediaAudioAndSeek(clamped, forceVideoSeek);
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

    // Compute CSS filter string (Base Filter + Inspector Adjustments)
    const activeCssFilter = !filtersDisabled && activeFilter.id !== 'f_none' ? activeFilter.cssFilter : '';
    const adjFilter = [
      `brightness(${colorAdjust.brightness}%)`,
      `contrast(${colorAdjust.contrast}%)`,
      `saturate(${colorAdjust.saturation}%)`,
      colorAdjust.warmth > 0 ? `sepia(${Math.min(60, colorAdjust.warmth)}%)` : '',
    ]
      .filter(Boolean)
      .join(' ');
    const combinedFilter = [activeCssFilter, adjFilter].filter(Boolean).join(' ') || 'none';

    ctx.translate(w / 2, h / 2);

    if (splitScreenConfig.enabled && !splitDisabled) {
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
    } else if (clip) {
      const srcEl = getOrLoadSource(clip.url, clip.type);
      let sw = 0;
      let sh = 0;
      if (srcEl instanceof HTMLVideoElement && srcEl.readyState >= 2) {
        sw = srcEl.videoWidth;
        sh = srcEl.videoHeight;
      } else if (srcEl instanceof HTMLImageElement && srcEl.complete) {
        sw = srcEl.naturalWidth;
        sh = srcEl.naturalHeight;
      }

      if (srcEl && sw > 0 && sh > 0) {
        if (chromaConfig.enabled && !chromaDisabled) {
          const customBg =
            chromaConfig.bgMode === 'custom_media' && chromaConfig.bgMediaUrl
              ? getOrLoadSource(chromaConfig.bgMediaUrl, chromaConfig.bgMediaType || 'photo')
              : null;
          drawChromaBackground(ctx, w, h, chromaConfig, tSec, customBg, srcEl);
          ctx.filter = combinedFilter;
          drawChromaKeyedSource(ctx, srcEl, sw, sh, w, h, chromaConfig);
        } else {
          ctx.filter = combinedFilter;
          const sAsp = sw / sh;
          const cAsp = w / h;
          const dw = sAsp > cAsp ? w : h * sAsp;
          const dh = sAsp > cAsp ? w / sAsp : h;
          // Fit cleanly inside w x h with aspect preserved
          const fitScale = Math.min(w / sw, h / sh);
          const drawW = sw * fitScale;
          const drawH = sh * fitScale;
          void dw;
          void dh;
          ctx.drawImage(srcEl, -drawW / 2, -drawH / 2, drawW, drawH);
        }
      }
    }

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
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = activeEffect.accentColor || 'rgba(56,189,248,0.18)';
      ctx.globalAlpha = 0.16;
      ctx.fillRect(-w / 2, -h / 2, w, h);
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

    return index;
  };

  // Continuous 60fps requestAnimationFrame loop for playback & crisp live preview
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;

      if (isPlayingRef.current && !isScrubbingRef.current && totalDuration > 0) {
        let nextTime = currentTimeRef.current + dt * playbackSpeed;
        if (nextTime >= totalDuration) {
          nextTime = 0;
          setIsPlaying(false);
          isPlayingRef.current = false;
        }
        currentTimeRef.current = nextTime;
        setCurrentTimeSec(nextTime);
        syncMediaAudioAndSeek(nextTime, false);

        // Smoothly keep red playhead in view while playing without fighting manual scrub
        const scroller = timelineScrollRef.current;
        if (scroller && scroller.clientWidth > 0) {
          const playheadPx = 20 + nextTime * pxPerSec;
          const leftBound = scroller.scrollLeft + 24;
          const rightBound = scroller.scrollLeft + scroller.clientWidth - 36;
          if (playheadPx > rightBound || playheadPx < leftBound) {
            scroller.scrollLeft = Math.max(0, playheadPx - scroller.clientWidth * 0.35);
          }
        }
      }

      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderFrameToCanvas(ctx, canvas.width, canvas.height, currentTimeRef.current);
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  });

  // Upload multiple local device files (Video / Photo) with exact metadata duration extraction
  const handleUploadMediaFiles = async (files: FileList | null) => {
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

      void saveLocalMediaRecord({
        id: mediaId,
        file,
        name: initialClip.title,
        mimeType: file.type,
        mediaType: isVideo ? 'video' : 'photo',
        duration: initialGalleryItem.duration,
        durationSec: initialClip.durationSec,
        thumbnailUrl: initialClip.thumbnailUrl,
        createdAt: Date.now(),
      });

      if (isVideo) {
        // Preload video element for canvas rendering & extract exact real duration
        getOrLoadSource(blobUrl, 'video');
        void extractVideoMetadataAndThumb(blobUrl).then(({ durationSec, thumbnailUrl }) => {
          setTimelineClips((prev) =>
            prev.map((c) =>
              c.id === initialClip.id
                ? {
                    ...c,
                    durationSec,
                    thumbnailUrl: thumbnailUrl || c.thumbnailUrl,
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
                    durationSec,
                    duration: formatDurationLabel(durationSec),
                    thumbnailUrl: thumbnailUrl || m.thumbnailUrl,
                  }
                : m
            )
          );
          void updateLocalMediaMetadata(mediaId, {
            durationSec,
            duration: formatDurationLabel(durationSec),
            thumbnailUrl,
          });
        });
      } else {
        getOrLoadSource(blobUrl, 'photo');
      }
    }

    if (addedClips.length > 0) {
      setMediaGallery((prev) => [...addedGallery, ...prev]);
      setTimelineClips((prev) => {
        const next = [...prev, ...addedClips];
        setActiveClipIndex(Math.max(0, prev.length));
        return next;
      });
      setIsTimelineSelectionActive(true);
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
    let cursor = 0;
    let targetIdx = -1;
    let offsetInside = 0;

    for (let i = 0; i < timelineClips.length; i += 1) {
      const dur = Math.max(0.2, timelineClips[i].durationSec || 4);
      if (currentTimeSec >= cursor && currentTimeSec <= cursor + dur + 0.001) {
        targetIdx = i;
        offsetInside = currentTimeSec - cursor;
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
    };
    const secondPart: TimelineClip = {
      ...targetClip,
      id: `${targetClip.id}_b_${stamp}`,
      title: `${targetClip.title} (2)`,
      sourceStartSec: Number((baseStart + splitPoint).toFixed(2)),
      durationSec: secondDur,
    };

    const next = [...timelineClips];
    next.splice(targetIdx, 1, firstPart, secondPart);
    setTimelineClips(next);
    setActiveClipIndex(targetIdx + 1);
    setIsTimelineSelectionActive(true);
    syncMediaAudioAndSeek(currentTimeSec, true);
  };

  const handleDeleteSelectedClip = () => {
    if (!isTimelineSelectionActive || !timelineClips[activeClipIndex]) return;
    pushUndoCheckpoint();
    const next = timelineClips.filter((_, idx) => idx !== activeClipIndex);
    setTimelineClips(next);
    setActiveClipIndex(Math.max(0, Math.min(next.length - 1, activeClipIndex)));
    if (next.length === 0) {
      setIsTimelineSelectionActive(false);
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

  // Round Control Wheel Selection + Toggle/Mute Logic
  const handleSelectWheelCategory = (
    category: WheelCategoryItem,
    openDrawer = true,
    fromWheelTap = false
  ) => {
    setSelectedWheelCategoryId(category.id);
    // Re-enable if user explicitly selects it from closed/muted state or picks options
    setDisabledCategoryIds((prev) => prev.filter((id) => id !== category.id));

    if (category.id === 'video' && fromWheelTap && timelineClips.length === 0 && mediaGallery.length === 0) {
      multiFileInputRef.current?.click();
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

    if (selectedTransitionObj) {
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

  // WebAudio synth preview for audio list items
  const handleToggleAudioPreview = (audio: AudioItem) => {
    if (previewingAudioId === audio.id) {
      setPreviewingAudioId(null);
      if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
      return;
    }
    setPreviewingAudioId(audio.id);
    if (audio.url) {
      if (!bgMusicElRef.current) bgMusicElRef.current = new Audio();
      bgMusicElRef.current.src = audio.url;
      bgMusicElRef.current.play().catch(() => {});
      previewTimerRef.current = window.setTimeout(() => {
        bgMusicElRef.current?.pause();
        setPreviewingAudioId(null);
      }, 4000);
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = audio.synthPreset.includes('sfx') ? 280 : 220;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.15);
      previewTimerRef.current = window.setTimeout(() => setPreviewingAudioId(null), 1200);
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
        <div className="flex-1 min-w-0 flex flex-col bg-[#06080c] p-1.5 justify-between overflow-hidden">
          <div className="flex-1 min-h-0 flex items-center justify-center relative overflow-hidden">
            <div
              className="relative max-w-full max-h-full bg-black rounded-lg border border-zinc-800/90 overflow-hidden shadow-2xl flex items-center justify-center"
              style={{
                aspectRatio: `${activeAspectOpt.width} / ${activeAspectOpt.height}`,
                height: '100%',
                maxWidth: '100%',
              }}
            >
              <canvas
                ref={previewCanvasRef}
                width={activeAspectOpt.width}
                height={activeAspectOpt.height}
                className="w-full h-full object-contain block"
              />
              {timelineClips.length === 0 && (
                <button
                  type="button"
                  onClick={() => multiFileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[#141b26]/90 hover:bg-teal-400 hover:text-black border border-teal-400/50 text-teal-200 text-xs font-bold cursor-pointer transition-colors"
                >
                  {lang === 'ml' ? '+ വീഡിയോ / ഫോട്ടോ തിരഞ്ഞെടുക്കുക' : '+ Select Video or Photo'}
                </button>
              )}
            </div>
          </div>

          {/* COMPACT PLAYER CONTROL BAR WITH FINGER-DRAGGABLE CIRCLED SLIDER & SINGLE SCISSORS CUT */}
          <div className="h-8 mt-1 px-2 rounded-lg bg-[#0d121a] border border-zinc-800/80 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => seekToTime(Math.max(0, currentTimeSec - 1), true)}
              className="w-6 h-6 rounded hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer shrink-0"
              title="Step Back 1s"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (timelineClips.length === 0) return;
                setIsPlaying((p) => !p);
              }}
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
              onClick={() => seekToTime(Math.min(totalDuration, currentTimeSec + 1), true)}
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
                  className="h-full bg-teal-400"
                  style={{ width: `${sliderPct}%` }}
                />
              </div>
              <div
                className="absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-teal-400 shadow -translate-x-1/2 pointer-events-none"
                style={{ left: `${sliderPct}%` }}
              />
            </div>

            <span className="text-[9.5px] font-mono text-zinc-300 tabular-nums shrink-0">
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

        {/* 3. RIGHT SIDE: CIRCULAR TOOL WHEEL + OVERLAY TWO-COLUMN FEATURE DRAWER / INSPECTOR */}
        <div className="relative w-[224px] sm:w-[272px] shrink-0 bg-[#0b0e13] border-l border-zinc-800/80 flex flex-col items-center justify-center overflow-hidden">
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
            onTogglePlay={() => {
              if (timelineClips.length === 0) return;
              setIsPlaying((p) => !p);
            }}
            onExport={() => setShowExportModal(true)}
            aspectRatio={selectedAspectRatio}
            compact={isCompactLandscape}
          />

          <div className="mt-0.5 text-[9px] font-mono text-zinc-400 tabular-nums">
            {selectedAspectRatio} · {activeWheelCategory.shortLabel}
            {disabledCategoryIds.includes(activeWheelCategory.id) ? ' (Muted)' : ''}
          </div>

          {/* TWO-COLUMN FEATURE DRAWER OVER THE WHEEL */}
          {isWheelFeaturePanelOpen && (
            <WheelFeatureDrawer
              category={activeWheelCategory}
              isMutedOrOff={disabledCategoryIds.includes(activeWheelCategory.id)}
              onBack={() => setIsWheelFeaturePanelOpen(false)}
              onToggleMuteOrOff={() => handleToggleCategoryMute(activeWheelCategory)}
              mediaGallery={mediaGallery}
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
                setActiveAudio(a);
                setHasUserPickedAudio(true);
              }}
              onToggleAudioPreview={handleToggleAudioPreview}
              onTriggerUploadAudio={() => userAudioInputRef.current?.click()}
              dialogueSpeaker={dialogueSpeakerInput}
              dialogueText={dialogueTextInput}
              dialogueDur={dialogueDurInput}
              onChangeDialogueSpeaker={setDialogueSpeakerInput}
              onChangeDialogueText={setDialogueTextInput}
              onChangeDialogueDur={setDialogueDurInput}
              onApplyDialogue={() => {
                setDisabledCategoryIds((p) => p.filter((x) => x !== 'dialogues'));
                setActiveDialogue({
                  id: `dlg_${Date.now()}`,
                  speaker: dialogueSpeakerInput || 'Speaker',
                  text: dialogueTextInput || 'Line',
                  durationSec: dialogueDurInput,
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
                setActiveStickers((prev) => [
                  ...prev,
                  {
                    id: `st_${Date.now()}`,
                    sticker: st,
                    startTimeSec: currentTimeSec,
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
                setVfxLayers((prev) => [
                  ...prev,
                  {
                    id: `vfx_${Date.now()}`,
                    vfx: v,
                    startTimeSec: currentTimeSec,
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
                    startTimeSec: currentTimeSec,
                    durationSec: 4,
                    scale: 1,
                    xPct: 50,
                    yPct: 50,
                    opacity: 100,
                  },
                ]);
              }}
              chromaConfig={chromaConfig}
              onUpdateChromaConfig={(updater) => {
                setDisabledCategoryIds((p) => p.filter((x) => x !== 'chroma'));
                setChromaConfig(updater);
              }}
              onPickChromaBg={() => chromaBgInputRef.current?.click()}
              splitScreenConfig={splitScreenConfig}
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
              selectedTransitionId={selectedTransitionId}
              onSelectTransition={(tr) => {
                setDisabledCategoryIds((p) => p.filter((x) => x !== 'transitions'));
                setSelectedTransitionId(tr.id);
                setSelectedTransitionObj(tr);
                setActiveTransitionStartSec(currentTimeSec);
              }}
              activeEffect={activeEffect}
              onSelectEffect={(fx) => {
                setDisabledCategoryIds((p) => p.filter((x) => x !== 'effects'));
                setActiveEffect(fx);
              }}
              activeTemplateId={activeTemplate?.id || null}
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
                  durationSec: Math.max(4, totalDuration || 8),
                });
              }}
            />
          )}

          {/* QUICK INSPECTOR OVERLAY (Brightness, Contrast, Speed, Volume) */}
          {isInspectorOpen && (
            <div className="absolute inset-0 z-30 bg-[#0b0f16]/98 border-l border-zinc-800 flex flex-col overflow-hidden">
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
            </div>
          )}
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