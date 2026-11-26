import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Play,
  Plus,
  Square,
  X,
  Volume2,
  Sparkles,
  Flame,
  SlidersHorizontal,
  Wand2,
  Split,
  Type,
  Smile,
  Clapperboard,
  Layers,
  Palette,
  Video,
  Mic,
  Zap,
  Activity,
  Film,
} from 'lucide-react';
import type { WheelCategoryItem } from './CircularToolWheel';
import type { DynamicCategoryItem } from '../lib/dynamicCategories';
import {
  FILTERS_LIST,
  SFX_FOLEY_LIST,
  MEDIA_MOTION_LIST,
  DIALOGUE_PRESETS_LIST,
  TRAILER_CARDS_LIST,
  CHROMA_BACKGROUNDS_LIST,
  SPLIT_PRESETS_LIST,
  TRANSITIONS_LIST,
  EFFECTS_LIST,
  TITLES_LIST,
  TEMPLATES_LIST,
  STICKERS_LIST,
  COLOR_GRADES_LIST,
  VFX_LIST,
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
  TRAILER_PRESET_PACKS,
  type ChromaKeyConfig,
  type SplitScreenConfig,
  type TitleAnimationType,
  type TitleThemeType,
  type TrailerCardAnimation,
  type TrailerCardTheme,
} from '../lib/studioAdvancedFx';

export interface WheelFeatureDrawerProps {
  category: WheelCategoryItem;
  categoryItems?: DynamicCategoryItem[];
  isMutedOrOff: boolean;
  onBack: () => void;
  onToggleMuteOrOff: () => void;
  isCssRotatedLandscape?: boolean;

  // Media & Clip Motion / Speed
  mediaGallery: MediaItem[];
  activeMotionPresetId: string | null;
  onTriggerUploadMedia: () => void;
  onAddMediaToTimeline: (item: MediaItem) => void;
  onApplyMediaMotionPreset: (preset: MediaMotionPreset | null) => void;

  // Filters & Color Grading
  activeFilter: FilterItem;
  onSelectFilter: (filter: FilterItem) => void;
  activeColorGradeId: string | null;
  onSelectColorGrade: (preset: ColorGradePreset | null) => void;

  // Audio / Music / Dialogues
  userAudioLibrary: AudioItem[];
  activeAudio: AudioItem;
  previewingAudioId: string | null;
  onSelectAudio: (audio: AudioItem) => void;
  onToggleAudioPreview: (audio: AudioItem) => void;
  onTriggerUploadAudio: () => void;
  dialogueSpeaker: string;
  dialogueText: string;
  dialogueDur: number;
  activeDialoguePresetId: string | null;
  onChangeDialogueSpeaker: (v: string) => void;
  onChangeDialogueText: (v: string) => void;
  onChangeDialogueDur: (v: number) => void;
  onApplyDialogue: () => void;
  onApplyDialoguePreset: (preset: DialoguePresetItem) => void;

  // Titles
  showTitleOverlay: boolean;
  movieTitle: string;
  subtitle: string;
  titleAnimType: TitleAnimationType;
  titleThemeType: TitleThemeType;
  onApplyTitlePreset: (preset: TitleItem) => void;
  onUpdateTitleText: (title: string, sub: string) => void;
  onChangeTitleAnim: (anim: TitleAnimationType) => void;
  onChangeTitleTheme: (theme: TitleThemeType) => void;

  // Stickers & VFX
  onAddSticker: (sticker: StickerItem) => void;
  onAddVfx: (vfx: CinemaVfxItem) => void;

  // Trailer Card & Frames
  draftCardTitle: string;
  draftCardSubtitle: string;
  draftCardTheme: TrailerCardTheme;
  draftCardAnim: TrailerCardAnimation;
  activeCardPresetId: string | null;
  onChangeDraftCardTitle: (v: string) => void;
  onChangeDraftCardSubtitle: (v: string) => void;
  onChangeDraftCardTheme: (v: TrailerCardTheme) => void;
  onChangeDraftCardAnim: (v: TrailerCardAnimation) => void;
  onPickTrailerCardMedia: () => void;
  onAddTrailerCard: () => void;
  onApplyTrailerCardPreset: (preset: TrailerCardPresetItem) => void;

  // Chroma Key & Backgrounds
  chromaConfig: ChromaKeyConfig;
  activeChromaPresetId: string | null;
  onUpdateChromaConfig: (updater: (prev: ChromaKeyConfig) => ChromaKeyConfig) => void;
  onPickChromaBg: () => void;
  onApplyChromaPreset: (preset: ChromaPresetItem) => void;

  // Split Screen
  splitScreenConfig: SplitScreenConfig;
  activeSplitPresetId: string | null;
  onUpdateSplitScreenConfig: (updater: (prev: SplitScreenConfig) => SplitScreenConfig) => void;
  onPickSplitSide: (side: 'left' | 'right') => void;
  onAutoJoinSplitClips: () => void;
  onApplySplitPreset: (preset: SplitLayoutPresetItem) => void;

  // Transitions, Effects, Templates
  selectedTransitionId: string | null;
  activeTransitionObj: TransitionItem | null;
  onSelectTransition: (tr: TransitionItem | null) => void;
  activeEffect: EffectItem | null;
  onSelectEffect: (fx: EffectItem | null) => void;
  activeTemplateId: string | null;
  activeTemplateObj: TemplateItem | null;
  onApplyTemplate: (tmpl: TemplateItem) => void;
  onApplyTrailerPack: (packId: string) => void;

  // Contextual preview props
  primaryClipThumbUrl?: string;
  secondaryClipThumbUrl?: string;
  activeColorGradeObj?: ColorGradePreset | null;
  activeMotionPresetObj?: MediaMotionPreset | null;
  activeDialogueObj?: { speaker: string; text: string } | null;
  activeCardPresetObj?: TrailerCardPresetItem | null;
  activeVfxObj?: CinemaVfxItem | null;
  activeStickerObj?: StickerItem | null;
}

const INITIAL_BOX_LIMIT = 90;

async function copyBoxText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// SAMPLE MOVING FOOTAGE URL FOR LIVE PREVIEWS
const LIVE_PREVIEW_SAMPLE_IMAGE =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80';
const LIVE_PREVIEW_SCENE_B =
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=320&q=80';

export const WheelFeatureDrawer: React.FC<WheelFeatureDrawerProps> = React.memo((props) => {
  const { category, categoryItems = [], isMutedOrOff, isCssRotatedLandscape = false } = props;
  const [renderLimit, setRenderLimit] = useState<number>(INITIAL_BOX_LIMIT);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Smooth scroll container ref + kinetic momentum inertia controller
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const momentumRafRef = useRef<number | null>(null);

  const stopMomentum = () => {
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopMomentum();
    };
  }, []);

  const touchStateRef = useRef<{
    lastX: number;
    lastY: number;
    lastTime: number;
    velocity: number;
    totalMoved: number;
    isTracking: boolean;
  }>({
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    totalMoved: 0,
    isTracking: false,
  });

  useEffect(() => {
    stopMomentum();
    setRenderLimit(INITIAL_BOX_LIMIT);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [category.id]);

  const dbItemsForCategory = useMemo(
    () => categoryItems.filter((item) => item.categoryId === category.id),
    [categoryItems, category.id]
  );

  const handleCopyItem = async (e: React.MouseEvent, item: DynamicCategoryItem) => {
    e.stopPropagation();
    const textToCopy = item.lyrics.trim() ? item.lyrics : item.title;
    const ok = await copyBoxText(textToCopy);
    if (ok) {
      setCopiedId(item.itemId);
      window.setTimeout(() => {
        setCopiedId((cur) => (cur === item.itemId ? null : cur));
      }, 1400);
    }
  };

  // TOUCH SCROLLING HANDLERS: Ultra-smooth, frictionless scrolling with inertia
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    stopMomentum();
    if (!isCssRotatedLandscape) return; // In standard non-rotated mode, native browser GPU scrolling handles it!
    const t = e.touches[0];
    if (!t) return;
    touchStateRef.current = {
      lastX: t.clientX,
      lastY: t.clientY,
      lastTime: performance.now(),
      velocity: 0,
      totalMoved: 0,
      isTracking: true,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isCssRotatedLandscape) return; // In standard non-rotated mode, let native momentum scrolling do its job!
    const st = touchStateRef.current;
    if (!st.isTracking) return;
    const t = e.touches[0];
    if (!t) return;

    const now = performance.now();
    const dt = Math.max(1, now - st.lastTime);

    const stepX = t.clientX - st.lastX;
    const stepY = t.clientY - st.lastY;
    st.totalMoved += Math.hypot(stepX, stepY);

    // In 90deg rotated landscape:
    // Physical X axis on phone corresponds to rotated visual vertical axis.
    // Swiping right (+stepX, towards header) scrolls down (+scrollTop).
    // Swiping left (-stepX) scrolls up (-scrollTop).
    // Physical Y axis (up/down on phone screen):
    // Swiping up (-stepY) scrolls down (+scrollTop).
    // Swiping down (+stepY) scrolls up (-scrollTop).
    let delta = 0;
    if (Math.abs(stepX) >= Math.abs(stepY)) {
      delta = stepX;
    } else {
      delta = -stepY;
    }

    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop += delta;
      const instantV = delta / dt;
      st.velocity = 0.65 * instantV + 0.35 * st.velocity;
      st.lastX = t.clientX;
      st.lastY = t.clientY;
      st.lastTime = now;
    }
  };

  const handleTouchEnd = () => {
    if (!isCssRotatedLandscape) return;
    const st = touchStateRef.current;
    if (!st.isTracking) return;
    st.isTracking = false;

    const el = scrollContainerRef.current;
    if (!el) return;

    let v = st.velocity;
    if (Math.abs(v) < 0.05) return;

    const maxV = 2.5;
    if (v > maxV) v = maxV;
    if (v < -maxV) v = -maxV;

    let lastRafTime = performance.now();

    const momentumStep = () => {
      const now = performance.now();
      const frameDt = Math.min(32, Math.max(8, now - lastRafTime));
      lastRafTime = now;

      el.scrollTop += v * frameDt;
      v *= 0.93; // 93% friction decay per frame

      if (
        Math.abs(v) < 0.01 ||
        el.scrollTop <= 0 ||
        el.scrollTop >= el.scrollHeight - el.clientHeight
      ) {
        momentumRafRef.current = null;
        return;
      }
      momentumRafRef.current = requestAnimationFrame(momentumStep);
    };

    momentumRafRef.current = requestAnimationFrame(momentumStep);
  };

  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    stopMomentum();
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop += e.deltaY || e.deltaX;
    }
  };

  const sampleThumb = props.primaryClipThumbUrl || LIVE_PREVIEW_SAMPLE_IMAGE;
  const IconComp = category.icon;

  const isPureLyricsBoxesMode =
    category.id === 'music' ||
    Boolean(category.hasLyricsBoxes) ||
    category.isBuiltIn === false;

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0f16] overflow-hidden select-none">
      {/* 1. COMPACT TOP HEADER BAR */}
      <div className="h-8 px-2 border-b border-zinc-800/80 bg-[#0f1420] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <IconComp className="w-3.5 h-3.5 shrink-0" style={{ color: category.accentHex }} />
          <span className="text-[11px] font-extrabold text-white truncate">{category.label}</span>
          <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-teal-400/10 text-teal-300 border border-teal-400/20 shrink-0">
            LIVE 2x
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={props.onToggleMuteOrOff}
            className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold cursor-pointer transition-colors ${
              isMutedOrOff
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-teal-400/20 text-teal-300 border border-teal-400/40'
            }`}
            title={isMutedOrOff ? 'Turn On' : 'Turn Off / Mute'}
          >
            {isMutedOrOff ? 'OFF' : 'ON'}
          </button>
          <button
            type="button"
            onClick={props.onBack}
            className="w-5 h-5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
            title="Close Options"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. LIVE PLAYING PREVIEW CARDS (EXACTLY 2 PREVIEWS PER LINE, SMOOTH TOUCH SCROLLING) */}
      <div
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheelScroll}
        style={{
          touchAction: isCssRotatedLandscape ? 'none' : 'pan-y',
          WebkitOverflowScrolling: 'touch',
        }}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-1.5 space-y-2 overscroll-contain"
      >
        {/* PURE SONG LYRICS / TEXT BOXES MODE (2 items per line with 1-click copy) */}
        {isPureLyricsBoxesMode ? (
          <div className="grid grid-cols-2 gap-1.5">
            {dbItemsForCategory.length === 0 ? (
              <div className="col-span-2 py-8 px-2 rounded-xl border border-zinc-800 bg-[#121722] text-center text-[10px] text-zinc-400">
                No songs/items added yet. Add from the Admin Panel.
              </div>
            ) : (
              dbItemsForCategory.slice(0, renderLimit).map((item) => {
                const isCopied = copiedId === item.itemId;
                return (
                  <div
                    key={item.itemId}
                    className="rounded-xl border border-zinc-800/90 bg-[#121722] hover:border-teal-400/50 p-1.5 flex flex-col justify-between gap-1 text-left transition-colors"
                  >
                    {/* Live Equalizer Animation */}
                    <div className="w-full h-8 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center gap-0.5 px-1 relative overflow-hidden">
                      <div className="w-1 bg-teal-400 rounded-full animate-pulse h-4" />
                      <div className="w-1 bg-emerald-400 rounded-full animate-bounce h-6" style={{ animationDuration: '0.6s' }} />
                      <div className="w-1 bg-cyan-400 rounded-full animate-pulse h-3" style={{ animationDuration: '0.4s' }} />
                      <div className="w-1 bg-teal-300 rounded-full animate-bounce h-5" style={{ animationDuration: '0.8s' }} />
                      <div className="w-1 bg-amber-400 rounded-full animate-pulse h-4" style={{ animationDuration: '0.5s' }} />
                      <div className="absolute top-1 left-1.5 text-[8px] font-bold text-teal-300">♪ PLAY</div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-white truncate">{item.title}</div>
                      <div className="text-[8px] text-zinc-300 whitespace-pre-wrap leading-tight line-clamp-2 mt-0.5 font-mono">
                        {item.lyrics || item.subtitle || item.title}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => void handleCopyItem(e, item)}
                      className={`w-full py-1 rounded text-[8.5px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        isCopied
                          ? 'bg-emerald-400 text-black'
                          : 'bg-teal-400/15 hover:bg-teal-400/30 border border-teal-400/40 text-teal-300'
                      }`}
                    >
                      {isCopied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>{isCopied ? 'Copied' : 'Copy Lyrics'}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <>
            {/* 1. TITLES & TEXT (2 LIVE ANIMATED PREVIEWS PER LINE) */}
            {category.id === 'titles' && (
              <div className="grid grid-cols-2 gap-1.5">
                {TITLES_LIST.map((ti) => (
                  <button
                    key={ti.id}
                    type="button"
                    onClick={() => props.onApplyTitlePreset(ti)}
                    className="rounded-xl border border-zinc-800 hover:border-amber-400/80 active:border-amber-400 bg-[#121722] p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-colors group"
                  >
                    {/* Live Animated Title Viewport */}
                    <div className="w-full aspect-video rounded-lg bg-[#090b12] border border-white/10 relative overflow-hidden flex items-center justify-center p-1 shadow-inner">
                      {/* Ambient Moving Spotlight Background */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-cyan-500/10 animate-pulse" />
                      
                      {/* Live Animating Title */}
                      <div className="relative text-center z-10 scale-90 group-hover:scale-95 transition-transform">
                        <span
                          className={`text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider block drop-shadow-md ${
                            ti.id.includes('gold') || ti.id.includes('blockbuster')
                              ? 'text-amber-300 animate-pulse'
                              : ti.id.includes('neon') || ti.id.includes('cyber')
                              ? 'text-cyan-300 animate-bounce'
                              : 'text-white'
                          }`}
                          style={{
                            textShadow: ti.id.includes('neon') ? '0 0 8px #22d3ee' : '0 2px 4px rgba(0,0,0,0.8)',
                          }}
                        >
                          {ti.titleText.slice(0, 10)}
                        </span>
                        <span className="text-[7px] text-zinc-400 block tracking-widest mt-0.5">
                          {ti.subtitleText.slice(0, 12)}
                        </span>
                      </div>

                      <div className="absolute bottom-1 right-1 px-1 rounded bg-black/70 text-[7px] font-bold text-amber-300 flex items-center gap-0.5">
                        <Activity className="w-2 h-2 animate-spin" />
                        <span>LIVE</span>
                      </div>
                    </div>

                    <div className="min-w-0 px-0.5">
                      <div className="text-[9.5px] font-bold text-white truncate">{ti.titleText}</div>
                      <div className="text-[8px] text-zinc-400 truncate">{ti.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 2. FILTERS & COLOR GRADES (2 LIVE ANIMATED PREVIEWS PER LINE) */}
            {category.id === 'filters' && (
              <div className="grid grid-cols-2 gap-1.5">
                {FILTERS_LIST.map((f) => {
                  const active = props.activeFilter.id === f.id && !isMutedOrOff;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => props.onSelectFilter(f)}
                      className={`rounded-xl border p-1 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                        active
                          ? 'border-cyan-400 bg-cyan-950/50 ring-1 ring-cyan-400 shadow-md'
                          : 'border-zinc-800 bg-[#121722] hover:border-zinc-700'
                      }`}
                    >
                      {/* Live Video Frame with Active Filter Applied */}
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/60 border border-white/10">
                        <img
                          src={sampleThumb}
                          alt={f.name}
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                          style={{ filter: f.cssFilter || 'none' }}
                        />
                        {/* Shimmer sweep indicating live preview */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        
                        {active && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                        <span className="absolute bottom-0.5 left-1 px-1 rounded bg-black/70 text-[7px] font-bold text-cyan-300">
                          {f.category}
                        </span>
                      </div>

                      <div className="min-w-0 px-0.5">
                        <div className="text-[9.5px] font-bold text-white truncate">{f.name}</div>
                        <div className="text-[8px] text-zinc-400 truncate">LUT Filter</div>
                      </div>
                    </button>
                  );
                })}

                {/* Color Grade Presets in the same 2-column grid */}
                {COLOR_GRADES_LIST.map((cg) => {
                  const active = props.activeColorGradeId === cg.id && !isMutedOrOff;
                  return (
                    <button
                      key={cg.id}
                      type="button"
                      onClick={() => props.onSelectColorGrade(active ? null : cg)}
                      className={`rounded-xl border p-1 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-950/50 ring-1 ring-amber-400 shadow-md'
                          : 'border-zinc-800 bg-[#121722] hover:border-zinc-700'
                      }`}
                    >
                      <div
                        className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10 flex items-center justify-center shadow-inner"
                        style={{ background: cg.swatchGradient }}
                      >
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          <span className="text-[8px] font-black tracking-wider text-white drop-shadow">
                            {cg.category}
                          </span>
                        </div>
                        {active && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center shadow">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 px-0.5">
                        <div className="text-[9.5px] font-bold text-white truncate">{cg.name}</div>
                        <div className="text-[8px] text-zinc-400 truncate">{cg.category} Grade</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. MEDIA & MOTION PRESETS (2 LIVE PREVIEWS PER LINE) */}
            {category.id === 'video' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={props.onTriggerUploadMedia}
                  className="w-full py-2 px-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-teal-500/20"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Phone Video / Photo</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {MEDIA_MOTION_LIST.map((mm) => {
                    const active = props.activeMotionPresetId === mm.id;
                    return (
                      <button
                        key={mm.id}
                        type="button"
                        onClick={() => props.onApplyMediaMotionPreset(active ? null : mm)}
                        className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-teal-400 bg-teal-950/40 text-white ring-1 ring-teal-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        {/* Live Motion Speed Indicator */}
                        <div className="w-full aspect-video rounded-lg bg-black/60 border border-white/10 flex items-center justify-center relative overflow-hidden">
                          <div className="flex items-center gap-1 text-teal-300 font-mono font-black text-xs">
                            <Zap className="w-3.5 h-3.5 animate-pulse" />
                            <span>{mm.speed}x</span>
                          </div>
                          <div className="absolute bottom-1 right-1 text-[7.5px] text-zinc-400">
                            {mm.aspectRatio || 'Native'}
                          </div>
                        </div>

                        <div className="min-w-0 px-0.5">
                          <div className="text-[9.5px] font-bold truncate text-white">{mm.name}</div>
                          <div className="text-[8px] text-zinc-400 truncate">Motion Speed</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. AUDIO & SOUND FX (2 LIVE PREVIEWS PER LINE) */}
            {category.id === 'audio' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={props.onTriggerUploadAudio}
                  className="w-full py-2 px-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Upload Audio File</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {[...props.userAudioLibrary, ...SFX_FOLEY_LIST].map((au) => {
                    const active = props.activeAudio.id === au.id && !isMutedOrOff;
                    const isPrev = props.previewingAudioId === au.id;
                    return (
                      <div
                        key={au.id}
                        onClick={() => props.onSelectAudio(au)}
                        className={`rounded-xl border p-1.5 flex flex-col justify-between gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-emerald-400 bg-emerald-950/40 text-white ring-1 ring-emerald-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        {/* Live Audio Visualizer Bars */}
                        <div className="w-full h-8 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between px-1.5">
                          <div className="flex items-end gap-0.5 h-5">
                            <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-3" />
                            <span className="w-1 bg-teal-300 rounded-full animate-bounce h-5" style={{ animationDuration: '0.5s' }} />
                            <span className="w-1 bg-emerald-300 rounded-full animate-pulse h-4" />
                            <span className="w-1 bg-cyan-400 rounded-full animate-bounce h-2" style={{ animationDuration: '0.7s' }} />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onToggleAudioPreview(au);
                            }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                              isPrev ? 'bg-amber-400 text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                            }`}
                          >
                            {isPrev ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current ml-0.5" />}
                          </button>
                        </div>

                        <div className="min-w-0">
                          <div className="text-[9.5px] font-bold truncate text-white">{au.title}</div>
                          <div className="text-[8px] text-zinc-400 truncate">{au.duration}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. DIALOGUES / REC (2 LIVE PREVIEWS PER LINE) */}
            {category.id === 'dialogues' && (
              <div className="grid grid-cols-2 gap-1.5">
                {DIALOGUE_PRESETS_LIST.map((dl) => {
                  const active = props.activeDialoguePresetId === dl.id;
                  return (
                    <button
                      key={dl.id}
                      type="button"
                      onClick={() => props.onApplyDialoguePreset(dl)}
                      className={`rounded-xl border p-1.5 flex flex-col justify-between gap-1 text-left cursor-pointer transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-950/40 text-white ring-1 ring-amber-400 shadow-md'
                          : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <div className="w-full h-7 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between px-1.5 text-amber-300">
                        <div className="flex items-center gap-1 text-[8.5px] font-bold">
                          <Mic className="w-3 h-3 animate-pulse" />
                          <span>{dl.speaker}</span>
                        </div>
                        <span className="text-[8px] font-mono text-zinc-400">{dl.durationSec}s</span>
                      </div>
                      <div className="text-[8.5px] text-zinc-200 line-clamp-2 leading-tight">
                        "{dl.line}"
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 6. EMOJI & STICKERS (2 LIVE PREVIEWS PER LINE) */}
            {category.id === 'stickers' && (
              <div className="grid grid-cols-2 gap-1.5">
                {STICKERS_LIST.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => props.onAddSticker(st)}
                    className="rounded-xl border border-zinc-800 hover:border-sky-400 active:border-sky-400 bg-[#121721] p-2 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors group"
                  >
                    <div className="w-full aspect-video rounded-lg bg-black/50 border border-white/5 flex items-center justify-center">
                      <span className="text-2xl group-hover:scale-125 transition-transform animate-bounce" style={{ animationDuration: '1.2s' }}>
                        {st.emoji}
                      </span>
                    </div>
                    <span className="text-[9.5px] font-bold text-zinc-200 truncate w-full">{st.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 7. ACTION VFX (2 LIVE PREVIEWS PER LINE) */}
            {category.id === 'vfx' && (
              <div className="grid grid-cols-2 gap-1.5">
                {VFX_LIST.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => props.onAddVfx(v)}
                    className="rounded-xl border border-zinc-800 hover:border-rose-400 active:border-rose-400 bg-[#121721] p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-colors"
                  >
                    {/* Live Animated VFX Particle Simulation Viewport */}
                    <div className="w-full aspect-video rounded-lg bg-[#06080e] border border-white/10 relative overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 bg-radial from-rose-500/20 via-transparent to-transparent animate-ping" style={{ animationDuration: '1.5s' }} />
                      <span className="text-xl relative z-10 animate-pulse">{v.emoji}</span>
                      <span className="absolute bottom-0.5 right-1 text-[7px] font-mono text-rose-300 font-bold">
                        VFX
                      </span>
                    </div>

                    <div className="min-w-0 px-0.5">
                      <div className="text-[9.5px] font-bold text-white truncate">{v.name}</div>
                      <div className="text-[8px] text-zinc-400 truncate">{v.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 8. TRAILER CARDS (2 LIVE PREVIEWS PER LINE) */}
            {category.id === 'card' && (
              <div className="grid grid-cols-2 gap-1.5">
                {TRAILER_CARDS_LIST.map((cd) => {
                  const active = props.activeCardPresetId === cd.id;
                  return (
                    <button
                      key={cd.id}
                      type="button"
                      onClick={() => props.onApplyTrailerCardPreset(cd)}
                      className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-950/40 text-white ring-1 ring-amber-400 shadow-md'
                          : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <div className="w-full aspect-video rounded-lg bg-black border border-white/10 flex flex-col items-center justify-center p-1 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-pulse" />
                        <span className="text-[8.5px] font-black uppercase text-amber-300 tracking-wider truncate max-w-full drop-shadow">
                          {cd.title}
                        </span>
                        <span className="text-[7px] text-zinc-400 tracking-widest truncate max-w-full">
                          {cd.subtitle}
                        </span>
                      </div>
                      <div className="text-[9px] font-bold text-white truncate px-0.5">{cd.title}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 9. CHROMA KEY (2 LIVE PREVIEWS PER LINE) */}
            {category.id === 'chroma' && (
              <div className="grid grid-cols-2 gap-1.5">
                {CHROMA_BACKGROUNDS_LIST.map((ch) => {
                  const active = props.activeChromaPresetId === ch.id && props.chromaConfig.enabled;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => props.onApplyChromaPreset(ch)}
                      className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                        active
                          ? 'border-emerald-400 bg-emerald-950/40 text-white ring-1 ring-emerald-400 shadow-md'
                          : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <div className={`w-full aspect-video rounded-lg border border-white/10 flex items-center justify-center ${ch.swatchClass} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Wand2 className="w-3.5 h-3.5 text-white animate-pulse" />
                        </div>
                      </div>
                      <div className="text-[9.5px] font-bold text-white truncate px-0.5">{ch.name}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 10. SPLIT SCREEN (2 LIVE PREVIEWS PER LINE) */}
            {category.id === 'split' && (
              <div className="grid grid-cols-2 gap-1.5">
                {SPLIT_PRESETS_LIST.map((sp) => {
                  const active = props.activeSplitPresetId === sp.id && props.splitScreenConfig.enabled;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => props.onApplySplitPreset(sp)}
                      className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                        active
                          ? 'border-cyan-400 bg-cyan-950/40 text-white ring-1 ring-cyan-400 shadow-md'
                          : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <div className="w-full aspect-video rounded-lg bg-black border border-white/10 flex relative overflow-hidden">
                        <div className="w-1/2 h-full bg-cyan-500/20 border-r border-cyan-400 flex items-center justify-center text-[7.5px] font-bold text-cyan-300">
                          A
                        </div>
                        <div className="w-1/2 h-full bg-amber-500/20 flex items-center justify-center text-[7.5px] font-bold text-amber-300">
                          B
                        </div>
                      </div>
                      <div className="text-[9.5px] font-bold text-white truncate px-0.5">{sp.name}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 11. TRANSITIONS (2 LIVE ANIMATED PREVIEWS PER LINE) */}
            {category.id === 'transitions' && (
              <div className="grid grid-cols-2 gap-1.5">
                {TRANSITIONS_LIST.map((tr) => {
                  const active = props.selectedTransitionId === tr.id && !isMutedOrOff;
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => props.onSelectTransition(active ? null : tr)}
                      className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-950/40 text-white ring-1 ring-amber-400 shadow-md'
                          : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      {/* Live Alternating Seam Wipe Animation */}
                      <div className="w-full aspect-video rounded-lg bg-black border border-white/10 relative overflow-hidden flex items-center justify-center">
                        <img src={sampleThumb} alt="A" className="w-full h-full object-cover" />
                        {/* Animated Transition Overlay */}
                        <div className="absolute inset-0 bg-white/40 animate-ping opacity-60" style={{ animationDuration: '1.8s' }} />
                        <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/70 text-[7px] font-mono text-amber-300">
                          {tr.durationSec}s
                        </span>
                      </div>
                      <div className="min-w-0 px-0.5">
                        <div className="text-[9.5px] font-bold text-white truncate">{tr.name}</div>
                        <div className="text-[8px] text-zinc-400 truncate">{tr.category}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 12. VISUAL EFFECTS (2 LIVE PREVIEWS PER LINE) */}
            {category.id === 'effects' && (
              <div className="grid grid-cols-2 gap-1.5">
                {EFFECTS_LIST.map((fx) => {
                  const active = props.activeEffect?.id === fx.id && !isMutedOrOff;
                  return (
                    <button
                      key={fx.id}
                      type="button"
                      onClick={() => props.onSelectEffect(active ? null : fx)}
                      className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                        active
                          ? 'border-purple-400 bg-purple-950/40 text-white ring-1 ring-purple-400 shadow-md'
                          : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <div className="w-full aspect-video rounded-lg bg-black border border-white/10 relative overflow-hidden">
                        <img src={sampleThumb} alt={fx.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/30 to-transparent animate-pulse" />
                        <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/70 text-[7px] font-mono text-purple-300">
                          FX
                        </span>
                      </div>
                      <div className="min-w-0 px-0.5">
                        <div className="text-[9.5px] font-bold text-white truncate">{fx.name}</div>
                        <div className="text-[8px] text-zinc-400 truncate">{fx.category}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 13. TEMPLATES (2 LIVE PREVIEWS PER LINE) */}
            {category.id === 'templates' && (
              <div className="grid grid-cols-2 gap-1.5">
                {TRAILER_PRESET_PACKS.map((pk) => (
                  <button
                    key={pk.id}
                    type="button"
                    onClick={() => props.onApplyTrailerPack(pk.id)}
                    className="rounded-xl border border-zinc-800 hover:border-teal-400 active:border-teal-400 bg-[#121721] p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-colors"
                  >
                    <div className="w-full aspect-video rounded-lg bg-[#0a0d14] border border-white/10 flex items-center justify-center p-1 relative overflow-hidden">
                      <div className="absolute inset-0 bg-teal-500/10 animate-pulse" />
                      <span className="text-[9px] font-black uppercase text-teal-300 tracking-wider text-center drop-shadow">
                        {pk.name}
                      </span>
                    </div>
                    <div className="min-w-0 px-0.5">
                      <div className="text-[9.5px] font-bold text-white truncate">{pk.name}</div>
                      <div className="text-[8px] text-zinc-400 truncate">{pk.title}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
