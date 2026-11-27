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
  Search,
  Trash2,
  RotateCcw,
  Upload,
  Shield,
  Sliders,
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
  TRAILER_TITLE_ANIMATIONS,
  TRAILER_TITLE_THEMES,
  type ChromaKeyConfig,
  type EmblemCrestShape,
  type EmblemTrailerConfig,
  type SplitScreenConfig,
  type TitleAnimationType,
  type TitleStyleMode,
  type TitleThemeType,
  type TrailerCardAnimation,
  type TrailerCardTheme,
} from '../lib/studioAdvancedFx';
import {
  ACTION_VFX_CATEGORIES,
  CATEGORY_THEME_PRESETS,
  PRO_ACTION_REEL_CATEGORIES,
  PRO_CARD_CATEGORIES,
  PRO_CHROMA_CATEGORIES,
  PRO_DIALOGUE_CATEGORIES,
  PRO_EFFECT_CATEGORIES,
  PRO_EMBLEM_CATEGORIES,
  PRO_FILTER_CATEGORIES,
  PRO_LUT_CATEGORIES,
  PRO_MOTION_CATEGORIES,
  PRO_MUSIC_CATEGORIES,
  PRO_SFX_CATEGORIES,
  PRO_SPLIT_CATEGORIES,
  PRO_STICKER_CATEGORIES,
  PRO_TEMPLATE_CATEGORIES,
  PRO_TITLE_CATEGORIES,
  PRO_TRANSITION_CATEGORIES,
  queryActionVfxPresets,
  queryProActionReels,
  queryProChroma,
  queryProDialogues,
  queryProEffects,
  queryProEmblemTrailers,
  queryProFilters,
  queryProLuts,
  queryProMotions,
  queryProMusic,
  queryProSfx,
  queryProSplitLayouts,
  queryProStickers,
  queryProTemplates,
  queryProTitles,
  queryProTrailerCards,
  queryProTransitions,
  TOTAL_PRO_ACTION_REELS_COUNT,
  TOTAL_PRO_CARDS_COUNT,
  TOTAL_PRO_CHROMA_COUNT,
  TOTAL_PRO_DIALOGUES_COUNT,
  TOTAL_PRO_EFFECTS_COUNT,
  TOTAL_PRO_EMBLEMS_COUNT,
  TOTAL_PRO_FILTERS_COUNT,
  TOTAL_PRO_LUTS_COUNT,
  TOTAL_PRO_MOTIONS_COUNT,
  TOTAL_PRO_MUSIC_COUNT,
  TOTAL_PRO_SFX_COUNT,
  TOTAL_PRO_SPLIT_COUNT,
  TOTAL_PRO_STICKERS_COUNT,
  TOTAL_PRO_TEMPLATES_COUNT,
  TOTAL_PRO_TITLES_COUNT,
  TOTAL_PRO_TRANSITIONS_COUNT,
  TOTAL_PRO_VFX_COUNT,
  type ActionVfxPreset,
  type ActionVfxType,
  type CategoryThemeSpec,
  type ProCatalogItem,
} from '../lib/proVfxEngine';
import type { AudioSynthKind } from '../lib/comedyAudioSynth';
import {
  ColorWheelPad,
  type ColorGradeAdjustments,
} from './ColorWheelPad';
import { CompactSmallBannerAd } from './AdsterraAds';

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

  // Titles (Up to 4 editable lines, English & Malayalam, diverse styles & custom colors)
  showTitleOverlay: boolean;
  movieTitle: string;
  subtitle: string;
  titleLine3?: string;
  titleLine4?: string;
  titleAnimType: TitleAnimationType;
  titleThemeType: TitleThemeType;
  titleStyleMode?: TitleStyleMode;
  titleCustomColor?: string;
  onApplyTitlePreset: (preset: TitleItem) => void;
  onUpdateTitleText: (title: string, sub: string) => void;
  onChangeTitleExtraLines?: (line3: string, line4: string) => void;
  onChangeTitleAnim: (anim: TitleAnimationType) => void;
  onChangeTitleTheme: (theme: TitleThemeType) => void;
  onChangeTitleStyleMode?: (mode: TitleStyleMode) => void;
  onChangeTitleCustomColor?: (color: string) => void;
  onClearTitleOverlay?: () => void;

  // Per-Category Theme + Action Video (#15) + Emblem Trailer (#16)
  activeCategoryThemeId?: string;
  onSelectCategoryTheme?: (theme: CategoryThemeSpec) => void;
  activeActionReelId?: string | null;
  onApplyActionReelPreset?: (spec: {
    id: string;
    name: string;
    lines: string[];
    vfxType: ActionVfxType;
    motionSpeed: number;
    themeId: string;
  }) => void;
  emblemConfig?: EmblemTrailerConfig;
  onUpdateEmblemConfig?: (updater: (prev: EmblemTrailerConfig) => EmblemTrailerConfig) => void;
  onPickEmblemLogo?: () => void;

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

  // Studio Mode Switcher & Pro Color / VFX Extensions
  studioMode?: 'editing' | 'vfx' | 'color';
  onChangeStudioMode?: (mode: 'editing' | 'vfx' | 'color') => void;
  colorAdjust?: ColorGradeAdjustments;
  onUpdateColorAdjust?: (updater: (prev: ColorGradeAdjustments) => ColorGradeAdjustments) => void;
  onResetColorAdjust?: () => void;
  vfxLayers?: Array<{
    id: string;
    vfx: CinemaVfxItem;
    proVfx?: ActionVfxPreset;
    startTimeSec: number;
    durationSec: number;
    startXPct: number;
    startYPct: number;
    endXPct: number;
    endYPct: number;
    scale: number;
    opacity: number;
    speed: number;
  }>;
  selectedVfxLayerId?: string | null;
  onSelectVfxLayer?: (id: string | null) => void;
  onAddProVfx?: (preset: ActionVfxPreset) => void;
  onUpdateVfxLayer?: (
    id: string,
    patch: Partial<{
      startTimeSec: number;
      durationSec: number;
      startXPct: number;
      startYPct: number;
      endXPct: number;
      endYPct: number;
      scale: number;
      opacity: number;
      speed: number;
    }>
  ) => void;
  onDeleteVfxLayer?: (id: string) => void;

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

  // VFX 56,000+ Library Search & Category State
  const [vfxSearch, setVfxSearch] = useState<string>('');
  const [vfxCatFilter, setVfxCatFilter] = useState<string>('All');
  const [vfxPageCount, setVfxPageCount] = useState<number>(1);

  // Color Grading 110,000+ Library + Color Wheels State
  const [colorSubView, setColorSubView] = useState<'presets' | 'wheels'>('presets');
  const [colorSearch, setColorSearch] = useState<string>('');
  const [colorCatFilter, setColorCatFilter] = useState<string>('All');
  const [colorSourceTab, setColorSourceTab] = useState<'all' | 'filters' | 'luts'>('all');
  const [colorPageCount, setColorPageCount] = useState<number>(1);

  // Unified Search, Category & Pagination for All Categories (105,300–216,000+ Each!)
  const [catSearch, setCatSearch] = useState<string>('');
  const [catFilter, setCatFilter] = useState<string>('All');
  const [catPageCount, setCatPageCount] = useState<number>(1);
  const [musicSubView, setMusicSubView] = useState<'tracks' | 'lyrics'>('tracks');
  const [showThemeGradeBar, setShowThemeGradeBar] = useState<boolean>(false);
  const [localThemeId, setLocalThemeId] = useState<string>('natural');

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
    setVfxPageCount(1);
    setColorPageCount(1);
    setCatSearch('');
    setCatFilter('All');
    setCatPageCount(1);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [category.id]);

  const vfxQueryResult = useMemo(() => {
    if (category.id !== 'vfx') return { items: [] as ActionVfxPreset[], total: 0 };
    return queryActionVfxPresets(vfxCatFilter, vfxSearch, 0, Math.min(240, vfxPageCount * 30));
  }, [category.id, vfxCatFilter, vfxSearch, vfxPageCount]);

  const proColorQueryResult = useMemo(() => {
    if (category.id !== 'filters') return { items: [] as Array<{ id: string; name: string; category: string; css?: string; swatch: string; sub: string }>, total: 0 };
    const limit = Math.min(240, colorPageCount * 30);
    if (colorSourceTab === 'luts') {
      const cat = PRO_LUT_CATEGORIES.includes(colorCatFilter) ? colorCatFilter : 'All';
      return queryProLuts(cat, colorSearch, 0, limit);
    }
    if (colorSourceTab === 'filters') {
      const cat = PRO_FILTER_CATEGORIES.includes(colorCatFilter) ? colorCatFilter : 'All';
      return queryProFilters(cat, colorSearch, 0, limit);
    }
    // Combined: interleave filters + LUTs
    const fCat = PRO_FILTER_CATEGORIES.includes(colorCatFilter) ? colorCatFilter : 'All';
    const lCat = PRO_LUT_CATEGORIES.includes(colorCatFilter) ? colorCatFilter : 'All';
    const half = Math.ceil(limit / 2);
    const fRes = queryProFilters(fCat, colorSearch, 0, half);
    const lRes = queryProLuts(lCat, colorSearch, 0, half);
    const merged: typeof fRes.items = [];
    const maxLen = Math.max(fRes.items.length, lRes.items.length);
    for (let i = 0; i < maxLen; i++) {
      if (fRes.items[i]) merged.push(fRes.items[i]);
      if (lRes.items[i]) merged.push(lRes.items[i]);
    }
    return { items: merged, total: fRes.total + lRes.total };
  }, [category.id, colorSourceTab, colorCatFilter, colorSearch, colorPageCount]);

  const genericProMeta = useMemo((): {
    categories: string[];
    totalCount: number;
    result: { items: ProCatalogItem[]; total: number };
  } => {
    const limit = Math.min(240, catPageCount * 30);
    switch (category.id) {
      case 'video':
        return { categories: PRO_MOTION_CATEGORIES, totalCount: TOTAL_PRO_MOTIONS_COUNT, result: queryProMotions(catFilter, catSearch, 0, limit) };
      case 'audio':
        return { categories: PRO_SFX_CATEGORIES, totalCount: TOTAL_PRO_SFX_COUNT, result: queryProSfx(catFilter, catSearch, 0, limit) };
      case 'music':
        return { categories: PRO_MUSIC_CATEGORIES, totalCount: TOTAL_PRO_MUSIC_COUNT, result: queryProMusic(catFilter, catSearch, 0, limit) };
      case 'dialogues':
        return { categories: PRO_DIALOGUE_CATEGORIES, totalCount: TOTAL_PRO_DIALOGUES_COUNT, result: queryProDialogues(catFilter, catSearch, 0, limit) };
      case 'titles':
        return { categories: PRO_TITLE_CATEGORIES, totalCount: TOTAL_PRO_TITLES_COUNT, result: queryProTitles(catFilter, catSearch, 0, limit) };
      case 'stickers':
        return { categories: PRO_STICKER_CATEGORIES, totalCount: TOTAL_PRO_STICKERS_COUNT, result: queryProStickers(catFilter, catSearch, 0, limit) };
      case 'card':
        return { categories: PRO_CARD_CATEGORIES, totalCount: TOTAL_PRO_CARDS_COUNT, result: queryProTrailerCards(catFilter, catSearch, 0, limit) };
      case 'chroma':
        return { categories: PRO_CHROMA_CATEGORIES, totalCount: TOTAL_PRO_CHROMA_COUNT, result: queryProChroma(catFilter, catSearch, 0, limit) };
      case 'split':
        return { categories: PRO_SPLIT_CATEGORIES, totalCount: TOTAL_PRO_SPLIT_COUNT, result: queryProSplitLayouts(catFilter, catSearch, 0, limit) };
      case 'transitions':
        return { categories: PRO_TRANSITION_CATEGORIES, totalCount: TOTAL_PRO_TRANSITIONS_COUNT, result: queryProTransitions(catFilter, catSearch, 0, limit) };
      case 'effects':
        return { categories: PRO_EFFECT_CATEGORIES, totalCount: TOTAL_PRO_EFFECTS_COUNT, result: queryProEffects(catFilter, catSearch, 0, limit) };
      case 'templates':
        return { categories: PRO_TEMPLATE_CATEGORIES, totalCount: TOTAL_PRO_TEMPLATES_COUNT, result: queryProTemplates(catFilter, catSearch, 0, limit) };
      case 'action_reel':
        return { categories: PRO_ACTION_REEL_CATEGORIES, totalCount: TOTAL_PRO_ACTION_REELS_COUNT, result: queryProActionReels(catFilter, catSearch, 0, limit) };
      case 'emblem_trailer':
        return { categories: PRO_EMBLEM_CATEGORIES, totalCount: TOTAL_PRO_EMBLEMS_COUNT, result: queryProEmblemTrailers(catFilter, catSearch, 0, limit) };
      default:
        return { categories: [], totalCount: 0, result: { items: [], total: 0 } };
    }
  }, [category.id, catFilter, catSearch, catPageCount]);

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
    (category.id !== 'music' && Boolean(category.hasLyricsBoxes)) ||
    category.isBuiltIn === false;

  const renderProCategoryToolbar = (accentActiveClass: string, searchPlaceholder: string) => {
    if (genericProMeta.categories.length === 0) return null;
    return (
      <div className="space-y-1">
        <div className="relative">
          <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={catSearch}
            onChange={(e) => {
              setCatSearch(e.target.value);
              setCatPageCount(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-6 pr-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-teal-400 text-[9.5px] text-white placeholder-zinc-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {genericProMeta.categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCatFilter(c);
                setCatPageCount(1);
              }}
              className={`px-2 py-0.5 rounded-md text-[8.5px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                catFilter === c
                  ? accentActiveClass
                  : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {c === 'All' ? `All (${genericProMeta.totalCount.toLocaleString()}+)` : c}
            </button>
          ))}
        </div>
        <div className="text-[8.5px] font-mono text-zinc-400 px-0.5">
          {genericProMeta.result.total.toLocaleString()} presets ready · Tap to apply
        </div>
      </div>
    );
  };

  const renderProLoadMore = (accentTextClass: string) => {
    if (genericProMeta.result.items.length >= genericProMeta.result.total) return null;
    return (
      <button
        type="button"
        onClick={() => setCatPageCount((c) => c + 1)}
        className={`w-full py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[9.5px] font-bold cursor-pointer ${accentTextClass}`}
      >
        Load More ({(genericProMeta.result.total - genericProMeta.result.items.length).toLocaleString()} more)
      </button>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0f16] overflow-hidden select-none">
      {/* 1. COMPACT TOP HEADER BAR */}
      <div className="h-8 px-1.5 border-b border-zinc-800/80 bg-[#0f1420] flex items-center justify-between gap-1 shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <IconComp className="w-3.5 h-3.5 shrink-0" style={{ color: category.accentHex }} />
          <span className="text-[10.5px] font-extrabold text-white truncate max-w-[92px]">
            {category.label}
          </span>
          {props.onChangeStudioMode && (
            <div className="flex items-center bg-zinc-950/90 border border-zinc-800 rounded-md p-0.5 shrink-0">
              {(
                [
                  { id: 'editing', label: 'Edit' },
                  { id: 'vfx', label: 'VFX' },
                  { id: 'color', label: 'Color' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => props.onChangeStudioMode?.(m.id)}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold cursor-pointer transition-colors whitespace-nowrap ${
                    (props.studioMode || 'editing') === m.id
                      ? 'bg-teal-400 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
        {/* PURE SONG LYRICS / CUSTOM CATEGORY BOXES MODE */}
        {isPureLyricsBoxesMode || (category.id === 'music' && musicSubView === 'lyrics') ? (
          <div className="space-y-1.5">
            {category.id === 'music' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMusicSubView('tracks')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#121722] border border-zinc-800 text-zinc-300 text-[9.5px] font-extrabold cursor-pointer whitespace-nowrap"
                >
                  Tracks ({TOTAL_PRO_MUSIC_COUNT.toLocaleString()}+)
                </button>
                <button
                  type="button"
                  onClick={() => setMusicSubView('lyrics')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-teal-400 text-black text-[9.5px] font-extrabold cursor-pointer whitespace-nowrap"
                >
                  Song Lyrics ({dbItemsForCategory.length})
                </button>
              </div>
            )}
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
          </div>
        ) : (
          <>
            {/* UNIVERSAL PER-CATEGORY THEME & COLOR GRADING ADJUSTER BAR (ALL 16 CATEGORIES) */}
            {props.onUpdateColorAdjust && props.colorAdjust && (
              <div className="rounded-xl border border-zinc-800/90 bg-[#101520] p-1.5 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8.5px] font-extrabold text-zinc-300 uppercase tracking-wider truncate">
                    Theme & Color Grade
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {props.onResetColorAdjust && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocalThemeId('natural');
                          props.onResetColorAdjust?.();
                        }}
                        className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[8px] font-bold text-zinc-300 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowThemeGradeBar((s) => !s)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                        showThemeGradeBar
                          ? 'bg-cyan-400 text-black'
                          : 'bg-zinc-900 text-cyan-300 border border-zinc-700 hover:border-cyan-400/50'
                      }`}
                    >
                      <Sliders className="w-2.5 h-2.5" />
                      <span>{showThemeGradeBar ? 'Hide' : 'Adjust'}</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                  {CATEGORY_THEME_PRESETS.map((th) => {
                    const activeTheme = (props.activeCategoryThemeId || localThemeId) === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          setLocalThemeId(th.id);
                          if (props.onSelectCategoryTheme) {
                            props.onSelectCategoryTheme(th);
                          } else {
                            props.onUpdateColorAdjust?.((prev) => ({
                              ...prev,
                              brightness: th.brightness,
                              contrast: th.contrast,
                              saturation: th.saturation,
                              warmth: th.warmth,
                              tint: th.tint,
                              vignette: th.vignette,
                            }));
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md text-[8px] font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer transition-colors ${
                          activeTheme
                            ? 'bg-teal-400 text-black'
                            : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: th.swatchHex }}
                        />
                        <span>{th.label}</span>
                      </button>
                    );
                  })}
                </div>
                {showThemeGradeBar && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 border-t border-zinc-800/80 text-[8.5px]">
                    {(
                      [
                        { key: 'saturation', label: 'Color', min: 0, max: 200, val: props.colorAdjust.saturation, step: 5, unit: '%' },
                        { key: 'contrast', label: 'Contrast', min: 40, max: 200, val: props.colorAdjust.contrast, step: 5, unit: '%' },
                        { key: 'warmth', label: 'Warmth', min: -50, max: 80, val: props.colorAdjust.warmth, step: 4, unit: '' },
                        { key: 'brightness', label: 'Bright', min: 40, max: 180, val: props.colorAdjust.brightness, step: 5, unit: '%' },
                      ] as const
                    ).map((g) => (
                      <div key={g.key} className="space-y-0.5">
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="font-semibold">{g.label}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                props.onUpdateColorAdjust?.((prev) => ({
                                  ...prev,
                                  [g.key]: Math.max(g.min, prev[g.key] - g.step),
                                }))
                              }
                              className="w-3.5 h-3.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono text-cyan-300 min-w-[26px] text-center">
                              {g.val}{g.unit}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                props.onUpdateColorAdjust?.((prev) => ({
                                  ...prev,
                                  [g.key]: Math.min(g.max, prev[g.key] + g.step),
                                }))
                              }
                              className="w-3.5 h-3.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={g.min}
                          max={g.max}
                          value={g.val}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            props.onUpdateColorAdjust?.((prev) => ({ ...prev, [g.key]: v }));
                          }}
                          className="w-full accent-cyan-400 h-1 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 0. MUSIC TRACKS (108,000+ REALISTIC YOUTUBE-STYLE SCORES & SONGS) */}
            {category.id === 'music' && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMusicSubView('tracks')}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-teal-400 text-black text-[9.5px] font-extrabold cursor-pointer whitespace-nowrap"
                  >
                    Tracks ({TOTAL_PRO_MUSIC_COUNT.toLocaleString()}+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMusicSubView('lyrics')}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-[#121722] border border-zinc-800 text-zinc-300 text-[9.5px] font-extrabold cursor-pointer whitespace-nowrap"
                  >
                    Song Lyrics ({dbItemsForCategory.length})
                  </button>
                  <button
                    type="button"
                    onClick={props.onTriggerUploadAudio}
                    className="py-1.5 px-2 rounded-lg bg-teal-400/20 border border-teal-400/40 text-teal-300 text-[9.5px] font-extrabold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    title="Upload Music"
                  >
                    <Upload className="w-3 h-3" />
                  </button>
                </div>

                {renderProCategoryToolbar('bg-teal-400 text-black', `Search ${TOTAL_PRO_MUSIC_COUNT.toLocaleString()}+ music tracks...`)}

                <div className="grid grid-cols-2 gap-1.5">
                  {genericProMeta.result.items.map((pm) => {
                    const auItem: AudioItem = {
                      id: pm.id,
                      title: pm.name,
                      category: pm.category,
                      duration: `0:${18 + (pm.bpm || 80) % 40}`,
                      durationSec: 22,
                      bpm: pm.bpm || 110,
                      mood: pm.category,
                      description: pm.sub,
                      synthPreset: (pm.engineId as AudioSynthKind) || 'cinematic',
                    };
                    const active = props.activeAudio.id === auItem.id && !isMutedOrOff;
                    const isPrev = props.previewingAudioId === auItem.id;
                    return (
                      <div
                        key={pm.id}
                        onClick={() => props.onSelectAudio(auItem)}
                        className={`rounded-xl border p-1.5 flex flex-col justify-between gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-teal-400 bg-teal-950/40 text-white ring-1 ring-teal-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className="w-full h-7 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between px-1.5">
                          <div className="flex items-end gap-0.5 h-4">
                            <span className="w-1 bg-teal-400 rounded-full animate-pulse h-3" />
                            <span className="w-1 bg-cyan-300 rounded-full animate-bounce h-4" style={{ animationDuration: '0.55s' }} />
                            <span className="w-1 bg-emerald-300 rounded-full animate-pulse h-2.5" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onToggleAudioPreview(auItem);
                            }}
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                              isPrev ? 'bg-amber-400 text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                            }`}
                          >
                            {isPrev ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current ml-0.5" />}
                          </button>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] font-bold truncate text-white">{pm.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{pm.sub}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {renderProLoadMore('text-teal-300')}
              </div>
            )}

            {/* 1. TITLES & TEXT (112,000+ DIVERSE 4-LINE MALAYALAM/ENGLISH MODELS, COLORS & STYLES) */}
            {category.id === 'titles' && (
              <div className="space-y-1.5">
                {/* 4-Line Customizable Text, Color & Style Composer */}
                <div className="rounded-xl border border-amber-400/35 bg-[#101520] p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-extrabold text-amber-300">
                      4-Line Title Studio (EN / മലയാളം)
                    </span>
                    <div className="flex items-center gap-1">
                      {props.showTitleOverlay && (
                        <button
                          type="button"
                          onClick={() => {
                            if (props.onClearTitleOverlay) {
                              props.onClearTitleOverlay();
                            } else {
                              props.onUpdateTitleText('', '');
                              props.onChangeTitleExtraLines?.('', '');
                            }
                          }}
                          className="px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/35 text-red-300 text-[8px] font-bold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Starter Text Presets (English, Malayalam, Birthday, Comedy, Horror) */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                    {(
                      [
                        { label: 'മലയാളം മാസ്സ്', l1: 'കൊച്ചി രാത്രികൾ', l2: 'MASS HERO ENTRY', l3: 'കഥ തുടങ്ങുന്നു', l4: '2026 CINEMA', style: 'malayalam_bold' as TitleStyleMode, color: '#fbbf24' },
                        { label: '4-Line Action', l1: 'ONE SHOT.', l2: 'ZERO MERCY.', l3: 'FINAL MISSION', l4: 'IN 4K IMAX', style: 'stacked_4line' as TitleStyleMode, color: '#f97316' },
                        { label: 'Birthday 🎉', l1: 'HAPPY BIRTHDAY', l2: 'ജന്മദിനാശംസകൾ 🎉', l3: 'WISHING HAPPINESS', l4: 'SPECIAL DAY', style: 'birthday_confetti' as TitleStyleMode, color: '#f472b6' },
                        { label: 'Comedy 😂', l1: 'WAIT FOR IT 😂', l2: 'അടിപൊളി കോമഡി', l3: 'EPIC TWIST', l4: 'SUBSCRIBE NOW', style: 'comedy_pop' as TitleStyleMode, color: '#facc15' },
                        { label: 'Horror 👻', l1: 'DO NOT BLINK', l2: 'ഭയപ്പെടുത്തുന്ന രാത്രി', l3: 'MIDNIGHT CURSE', l4: 'WATCH ALONE', style: 'horror_drip' as TitleStyleMode, color: '#ef4444' },
                      ] as const
                    ).map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => {
                          props.onUpdateTitleText(q.l1, q.l2);
                          props.onChangeTitleExtraLines?.(q.l3, q.l4);
                          props.onChangeTitleStyleMode?.(q.style);
                          props.onChangeTitleCustomColor?.(q.color);
                        }}
                        className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[8px] font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>

                  {/* 4 Editable Text Inputs */}
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      type="text"
                      value={props.movieTitle}
                      onChange={(e) => props.onUpdateTitleText(e.target.value, props.subtitle)}
                      placeholder="Line 1 (Main Title / മലയാളം)"
                      className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-amber-400 text-[9px] text-white placeholder-zinc-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={props.subtitle}
                      onChange={(e) => props.onUpdateTitleText(props.movieTitle, e.target.value)}
                      placeholder="Line 2 (Subtitle / Punch)"
                      className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-amber-400 text-[9px] text-white placeholder-zinc-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={props.titleLine3 || ''}
                      onChange={(e) => props.onChangeTitleExtraLines?.(e.target.value, props.titleLine4 || '')}
                      placeholder="Line 3 (Director / Story)"
                      className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-amber-400 text-[9px] text-white placeholder-zinc-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={props.titleLine4 || ''}
                      onChange={(e) => props.onChangeTitleExtraLines?.(props.titleLine3 || '', e.target.value)}
                      placeholder="Line 4 (Tagline / Year)"
                      className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-amber-400 text-[9px] text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>

                  {/* Color Swatches + Style Mode + Animation */}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                      {['#fbbf24', '#ffffff', '#22d3ee', '#f43f5e', '#34d399', '#facc15', '#a855f7', '#f97316'].map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => props.onChangeTitleCustomColor?.(hex)}
                          className={`w-4 h-4 rounded-full border shrink-0 cursor-pointer ${
                            props.titleCustomColor === hex ? 'border-white scale-110 ring-1 ring-white' : 'border-zinc-700'
                          }`}
                          style={{ backgroundColor: hex }}
                          title={`Color ${hex}`}
                        />
                      ))}
                      <input
                        type="color"
                        value={props.titleCustomColor || '#fbbf24'}
                        onChange={(e) => props.onChangeTitleCustomColor?.(e.target.value)}
                        className="w-5 h-4 rounded bg-transparent border-0 p-0 cursor-pointer shrink-0"
                        title="Custom Title Color"
                      />
                    </div>
                    <select
                      value={props.titleStyleMode || 'standard'}
                      onChange={(e) => props.onChangeTitleStyleMode?.(e.target.value as TitleStyleMode)}
                      className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[8px] font-bold text-amber-300 focus:outline-none cursor-pointer"
                    >
                      <option value="standard">Cinema Clean</option>
                      <option value="stacked_4line">4-Line Stacked</option>
                      <option value="malayalam_bold">Malayalam Bold</option>
                      <option value="punch_slant">Action Slant</option>
                      <option value="neon_box">Neon Frame</option>
                      <option value="gold_crest">Gold Serif Crest</option>
                      <option value="comedy_pop">Comedy Pop Box</option>
                      <option value="news_bar">Breaking News Bar</option>
                      <option value="birthday_confetti">Birthday Confetti</option>
                      <option value="horror_drip">Horror Crimson</option>
                      <option value="split_duotone">Dual-Tone Split</option>
                    </select>
                  </div>

                  {/* Animation Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                    {TRAILER_TITLE_ANIMATIONS.map((an) => (
                      <button
                        key={an.id}
                        type="button"
                        onClick={() => props.onChangeTitleAnim(an.id)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                          props.titleAnimType === an.id
                            ? 'bg-amber-400 text-black'
                            : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                        }`}
                      >
                        {an.name}
                      </button>
                    ))}
                  </div>
                </div>

                {renderProCategoryToolbar('bg-amber-400 text-black', `Search ${TOTAL_PRO_TITLES_COUNT.toLocaleString()}+ titles (Malayalam, Action, Birthday, Comedy)...`)}
                <div className="grid grid-cols-2 gap-1.5">
                  {!catSearch.trim() && catFilter === 'All' && TITLES_LIST.slice(0, 4).map((ti) => (
                    <button
                      key={ti.id}
                      type="button"
                      onClick={() => props.onApplyTitlePreset(ti)}
                      className="rounded-xl border border-zinc-800 hover:border-amber-400/80 active:border-amber-400 bg-[#121722] p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-colors group"
                    >
                      <div className="w-full aspect-video rounded-lg bg-[#090b12] border border-white/10 relative overflow-hidden flex items-center justify-center p-1 shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-cyan-500/10 animate-pulse" />
                        <div className="relative text-center z-10 scale-90">
                          <span className="text-[9.5px] font-black uppercase tracking-wider block text-amber-300">
                            {ti.titleText.slice(0, 12)}
                          </span>
                          <span className="text-[7px] text-zinc-400 block tracking-widest mt-0.5">
                            {ti.subtitleText.slice(0, 14)}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 px-0.5">
                        <div className="text-[9px] font-bold text-white truncate">{ti.titleText}</div>
                        <div className="text-[7.5px] text-zinc-400 truncate">{ti.category}</div>
                      </div>
                    </button>
                  ))}
                  {genericProMeta.result.items.map((pt) => {
                    const [animPart = 'zoom_slam', themePart = 'blockbuster_gold', stylePart = 'stacked_4line'] = (pt.engineId || '').split('__');
                    const lines = pt.previewLines || [pt.name.split(' · ')[0], pt.category];
                    const lStyle = (pt.layoutStyle || stylePart || 'standard') as TitleStyleMode;
                    const accent = pt.colorHex || '#fbbf24';
                    const isBox = lStyle === 'neon_box';
                    const isComedy = lStyle === 'comedy_pop';
                    const isNews = lStyle === 'news_bar';
                    const isSlant = lStyle === 'punch_slant';
                    const isCrest = lStyle === 'gold_crest';
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => {
                          props.onApplyTitlePreset({
                            id: pt.id,
                            name: pt.name,
                            category: pt.category,
                            titleText: lines[0] || pt.name,
                            subtitleText: lines[1] || '',
                            styleClass: 'text-amber-300',
                            description: pt.sub,
                          });
                          props.onChangeTitleExtraLines?.(lines[2] || '', lines[3] || '');
                          props.onChangeTitleAnim(animPart as TitleAnimationType);
                          props.onChangeTitleTheme(themePart as TitleThemeType);
                          props.onChangeTitleStyleMode?.(lStyle);
                          props.onChangeTitleCustomColor?.(accent);
                        }}
                        className="rounded-xl border border-zinc-800 hover:border-amber-400/80 active:border-amber-400 bg-[#121722] p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-colors group"
                      >
                        <div className="w-full aspect-video rounded-lg bg-[#090b12] border border-white/10 relative overflow-hidden flex items-center justify-center p-1 shadow-inner">
                          <div className={`absolute inset-0 bg-gradient-to-tr ${pt.swatch} opacity-25`} />
                          {pt.badge && (
                            <span className="absolute top-0.5 right-0.5 px-1 rounded bg-black/75 text-[6.5px] font-mono text-zinc-300 z-20">
                              {pt.badge}
                            </span>
                          )}
                          <div
                            className={`relative z-10 text-center px-1.5 py-0.5 max-w-full ${
                              isBox ? 'rounded border bg-black/60' : ''
                            } ${isComedy ? 'rounded-lg bg-yellow-400 text-black border border-black' : ''} ${
                              isNews ? 'w-full bg-red-600/90 text-white border-b-2 border-yellow-300' : ''
                            } ${isCrest ? 'border-y border-amber-400/70' : ''}`}
                            style={{
                              borderColor: isBox ? accent : undefined,
                              transform: isSlant ? 'skewX(-10deg)' : undefined,
                            }}
                          >
                            {lines.slice(0, 4).map((ln, lIdx) => (
                              <div
                                key={lIdx}
                                className={`truncate leading-tight ${
                                  lIdx === 0
                                    ? 'text-[8.5px] font-black'
                                    : lIdx === 1
                                      ? 'text-[7px] font-bold opacity-95'
                                      : 'text-[6px] opacity-80'
                                } ${pt.fontStyle === 'mono' ? 'font-mono' : ''}`}
                                style={{
                                  color: isComedy
                                    ? lIdx === 0
                                      ? '#09090b'
                                      : '#b91c1c'
                                    : isNews
                                      ? '#ffffff'
                                      : lIdx === 1 && lStyle === 'split_duotone'
                                        ? '#22d3ee'
                                        : lIdx === 0
                                          ? accent
                                          : '#e4e4e7',
                                }}
                              >
                                {ln}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold text-white truncate">{pt.name}</div>
                          <div className="text-[7px] text-zinc-400 truncate">
                            {lStyle.replace(/_/g, ' ')} · {pt.category}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {renderProLoadMore('text-amber-300')}
              </div>
            )}

            {/* 2. COLOR GRADING & FILTERS (30,000+ LOOKS + INTERACTIVE 3-WAY COLOR WHEELS & SLIDERS) */}
            {category.id === 'filters' && (
              <div className="space-y-1.5">
                {/* Upload Video/Photo Quick Trigger + Looks vs Wheels Switch */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setColorSubView('presets')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[9.5px] font-extrabold cursor-pointer transition-colors whitespace-nowrap ${
                      colorSubView === 'presets'
                        ? 'bg-cyan-400 text-black'
                        : 'bg-[#121722] text-zinc-300 border border-zinc-800'
                    }`}
                  >
                    Looks ({(TOTAL_PRO_FILTERS_COUNT + TOTAL_PRO_LUTS_COUNT).toLocaleString()}+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorSubView('wheels')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[9.5px] font-extrabold cursor-pointer transition-colors whitespace-nowrap ${
                      colorSubView === 'wheels'
                        ? 'bg-amber-400 text-black'
                        : 'bg-[#121722] text-zinc-300 border border-zinc-800'
                    }`}
                  >
                    Wheels & Sliders
                  </button>
                  <button
                    type="button"
                    onClick={props.onTriggerUploadMedia}
                    className="py-1.5 px-2 rounded-lg bg-teal-400/20 hover:bg-teal-400/30 border border-teal-400/40 text-teal-300 text-[9.5px] font-extrabold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    title="Upload Video / Photo"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Clip</span>
                  </button>
                </div>

                {colorSubView === 'wheels' && props.colorAdjust && props.onUpdateColorAdjust ? (
                  <div className="space-y-2 pt-0.5">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[9.5px] font-extrabold text-amber-300">
                        3-Way Color Wheels (Lift · Gamma · Gain)
                      </span>
                      {props.onResetColorAdjust && (
                        <button
                          type="button"
                          onClick={props.onResetColorAdjust}
                          className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[8.5px] font-bold text-zinc-200 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>

                    {/* Lift / Gamma / Gain Wheels */}
                    <div className="grid grid-cols-3 gap-1">
                      <ColorWheelPad
                        label="Lift"
                        subLabel="Shadows"
                        value={props.colorAdjust.lift}
                        isCssRotatedLandscape={isCssRotatedLandscape}
                        sizePx={58}
                        onChange={(next) =>
                          props.onUpdateColorAdjust?.((p) => ({ ...p, lift: next }))
                        }
                      />
                      <ColorWheelPad
                        label="Gamma"
                        subLabel="Midtones"
                        value={props.colorAdjust.gamma}
                        isCssRotatedLandscape={isCssRotatedLandscape}
                        sizePx={58}
                        onChange={(next) =>
                          props.onUpdateColorAdjust?.((p) => ({ ...p, gamma: next }))
                        }
                      />
                      <ColorWheelPad
                        label="Gain"
                        subLabel="Highlights"
                        value={props.colorAdjust.gain}
                        isCssRotatedLandscape={isCssRotatedLandscape}
                        sizePx={58}
                        onChange={(next) =>
                          props.onUpdateColorAdjust?.((p) => ({ ...p, gain: next }))
                        }
                      />
                    </div>

                    {/* Pro Grading Sliders */}
                    <div className="p-2 rounded-xl bg-[#101520] border border-zinc-800 space-y-1.5 text-[9.5px]">
                      {(
                        [
                          { key: 'exposure', label: 'Exposure', min: -50, max: 50, val: props.colorAdjust.exposure, unit: '' },
                          { key: 'contrast', label: 'Contrast', min: 40, max: 200, val: props.colorAdjust.contrast, unit: '%' },
                          { key: 'saturation', label: 'Saturation', min: 0, max: 200, val: props.colorAdjust.saturation, unit: '%' },
                          { key: 'warmth', label: 'Temp (Cool / Warm)', min: -50, max: 80, val: props.colorAdjust.warmth, unit: '' },
                          { key: 'tint', label: 'Tint (Green / Mag)', min: -45, max: 45, val: props.colorAdjust.tint, unit: '' },
                          { key: 'lutIntensity', label: 'LUT / Filter Mix', min: 0, max: 100, val: props.colorAdjust.lutIntensity, unit: '%' },
                          { key: 'vignette', label: 'Vignette', min: 0, max: 90, val: props.colorAdjust.vignette, unit: '%' },
                        ] as const
                      ).map((sl) => (
                        <div key={sl.key} className="space-y-0.5">
                          <div className="flex items-center justify-between text-zinc-300">
                            <span className="font-semibold">{sl.label}</span>
                            <span className="font-mono tabular-nums text-cyan-300">
                              {sl.val > 0 && (sl.key === 'exposure' || sl.key === 'warmth' || sl.key === 'tint')
                                ? `+${sl.val}`
                                : sl.val}
                              {sl.unit}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={sl.min}
                            max={sl.max}
                            value={sl.val}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              props.onUpdateColorAdjust?.((p) => ({ ...p, [sl.key]: n }));
                            }}
                            className="w-full accent-cyan-400 h-1.5 cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {/* Search & Source Filter */}
                    <div className="flex items-center gap-1">
                      <div className="relative flex-1">
                        <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={colorSearch}
                          onChange={(e) => {
                            setColorSearch(e.target.value);
                            setColorPageCount(1);
                          }}
                          placeholder={`Search ${(TOTAL_PRO_FILTERS_COUNT + TOTAL_PRO_LUTS_COUNT).toLocaleString()}+ color looks...`}
                          className="w-full pl-6 pr-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-400 text-[9.5px] text-white placeholder-zinc-500 focus:outline-none"
                        />
                      </div>
                      <select
                        value={colorSourceTab}
                        onChange={(e) => {
                          setColorSourceTab(e.target.value as 'all' | 'filters' | 'luts');
                          setColorCatFilter('All');
                          setColorPageCount(1);
                        }}
                        className="px-1.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[9px] font-bold text-cyan-300 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All 110K+</option>
                        <option value="filters">Filters 55K</option>
                        <option value="luts">LUTs 55K</option>
                      </select>
                    </div>

                    {/* Horizontal Category Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                      {(colorSourceTab === 'luts' ? PRO_LUT_CATEGORIES : PRO_FILTER_CATEGORIES).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setColorCatFilter(c);
                            setColorPageCount(1);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[8.5px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                            colorCatFilter === c
                              ? 'bg-cyan-400 text-black'
                              : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    {/* Curated Featured Looks when on All + no search */}
                    {!colorSearch.trim() && colorCatFilter === 'All' && colorSourceTab === 'all' && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {FILTERS_LIST.slice(0, 4).map((f) => {
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
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/60 border border-white/10">
                                <img
                                  src={sampleThumb}
                                  alt={f.name}
                                  className="w-full h-full object-cover"
                                  style={{ filter: f.cssFilter || 'none' }}
                                />
                                <span className="absolute bottom-0.5 left-1 px-1 rounded bg-black/75 text-[7px] font-bold text-cyan-300">
                                  {f.category}
                                </span>
                              </div>
                              <div className="text-[9px] font-bold text-white truncate px-0.5">
                                {f.name}
                              </div>
                            </button>
                          );
                        })}
                        {COLOR_GRADES_LIST.slice(0, 4).map((cg) => {
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
                                className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10 flex items-center justify-center"
                                style={{ background: cg.swatchGradient }}
                              >
                                <span className="text-[8px] font-black text-white drop-shadow bg-black/35 px-1.5 py-0.5 rounded">
                                  {cg.category}
                                </span>
                              </div>
                              <div className="text-[9px] font-bold text-white truncate px-0.5">
                                {cg.name}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* 30,000+ Live Procedural Color Filters & LUTs Grid */}
                    <div className="text-[8.5px] font-mono text-zinc-400 px-0.5 flex items-center justify-between">
                      <span>{proColorQueryResult.total.toLocaleString()} matching looks</span>
                      {props.activeFilter.id !== 'f_none' && (
                        <button
                          type="button"
                          onClick={() => props.onSelectFilter(FILTERS_LIST[0])}
                          className="text-amber-300 hover:underline cursor-pointer"
                        >
                          Clear Filter
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {proColorQueryResult.items.map((item) => {
                        const active = props.activeFilter.id === item.id && !isMutedOrOff;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              props.onSelectFilter({
                                id: item.id,
                                name: item.name,
                                category: item.category,
                                cssFilter: item.css || 'none',
                                thumbnail: sampleThumb,
                                description: item.sub || item.category,
                              })
                            }
                            className={`rounded-xl border p-1 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                              active
                                ? 'border-cyan-400 bg-cyan-950/50 ring-1 ring-cyan-400 shadow-md'
                                : 'border-zinc-800 bg-[#121722] hover:border-zinc-700'
                            }`}
                          >
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/60 border border-white/10">
                              <img
                                src={sampleThumb}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                style={{ filter: item.css || 'none' }}
                              />
                              {active && (
                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                              <span className="absolute bottom-0.5 left-1 px-1 rounded bg-black/75 text-[7px] font-bold text-cyan-300 truncate max-w-[90%]">
                                {item.category}
                              </span>
                            </div>
                            <div className="min-w-0 px-0.5">
                              <div className="text-[9px] font-bold text-white truncate">{item.name}</div>
                              <div className="text-[7.5px] text-zinc-400 truncate">{item.sub}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {proColorQueryResult.items.length < proColorQueryResult.total && (
                      <button
                        type="button"
                        onClick={() => setColorPageCount((c) => c + 1)}
                        className="w-full py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[9.5px] font-bold text-cyan-300 cursor-pointer"
                      >
                        Load More Looks ({(proColorQueryResult.total - proColorQueryResult.items.length).toLocaleString()} more)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. MEDIA & MOTION PRESETS (54,000+ MOTION CURVES) */}
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
                <div className="text-[8.5px] text-zinc-400 text-center px-1">
                  Local device/browser only · Zero login or cloud storage needed
                </div>

                {renderProCategoryToolbar('bg-teal-400 text-black', `Search ${TOTAL_PRO_MOTIONS_COUNT.toLocaleString()}+ motion curves...`)}

                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  {!catSearch.trim() && catFilter === 'All' && MEDIA_MOTION_LIST.slice(0, 4).map((mm) => {
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
                          <div className="text-[9px] font-bold truncate text-white">{mm.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">Motion Speed</div>
                        </div>
                      </button>
                    );
                  })}
                  {genericProMeta.result.items.map((pm, idx) => {
                    const active = props.activeMotionPresetId === pm.id;
                    const speed = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0][idx % 6];
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() =>
                          props.onApplyMediaMotionPreset(
                            active
                              ? null
                              : {
                                  id: pm.id,
                                  name: pm.name,
                                  category: pm.category,
                                  speed,
                                  zoomScale: [1.0, 1.08, 1.15, 1.22][idx % 4],
                                  panX: [0, -2, 2, 0][idx % 4],
                                  panY: [0, 1, -1, 0][idx % 4],
                                  aspectRatio: '16:9',
                                  description: pm.sub,
                                }
                          )
                        }
                        className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-teal-400 bg-teal-950/40 text-white ring-1 ring-teal-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-full aspect-video rounded-lg bg-gradient-to-br ${pm.swatch} border border-white/10 flex items-center justify-center relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-black/45" />
                          <span className="relative z-10 text-teal-200 font-mono font-black text-[11px]">{speed}x</span>
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold truncate text-white">{pm.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{pm.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {renderProLoadMore('text-teal-300')}
              </div>
            )}

            {/* 4. AUDIO & SOUND FX (52,000+ FOLEY SFX & DEVICE AUDIO) */}
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

                {renderProCategoryToolbar('bg-emerald-400 text-black', `Search ${TOTAL_PRO_SFX_COUNT.toLocaleString()}+ SFX: thunder, gun, car, comedy...`)}

                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  {!catSearch.trim() && catFilter === 'All' && [...props.userAudioLibrary, ...SFX_FOLEY_LIST.slice(0, 6)].map((au) => {
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
                        <div className="w-full h-7 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between px-1.5">
                          <div className="flex items-end gap-0.5 h-4">
                            <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-3" />
                            <span className="w-1 bg-teal-300 rounded-full animate-bounce h-4" style={{ animationDuration: '0.5s' }} />
                            <span className="w-1 bg-cyan-400 rounded-full animate-bounce h-2" style={{ animationDuration: '0.7s' }} />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onToggleAudioPreview(au);
                            }}
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                              isPrev ? 'bg-amber-400 text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                            }`}
                          >
                            {isPrev ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current ml-0.5" />}
                          </button>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] font-bold truncate text-white">{au.title}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{au.duration}</div>
                        </div>
                      </div>
                    );
                  })}
                  {genericProMeta.result.items.map((ps) => {
                    const auItem: AudioItem = {
                      id: ps.id,
                      title: ps.name,
                      category: ps.category,
                      duration: '0:03',
                      durationSec: 3,
                      bpm: 120,
                      mood: ps.category,
                      description: ps.sub,
                      synthPreset: (ps.engineId as AudioSynthKind) || 'sfx_whoosh',
                    };
                    const active = props.activeAudio.id === auItem.id && !isMutedOrOff;
                    const isPrev = props.previewingAudioId === auItem.id;
                    return (
                      <div
                        key={ps.id}
                        onClick={() => props.onSelectAudio(auItem)}
                        className={`rounded-xl border p-1.5 flex flex-col justify-between gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-emerald-400 bg-emerald-950/40 text-white ring-1 ring-emerald-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className="w-full h-7 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between px-1.5">
                          <div className="flex items-end gap-0.5 h-4">
                            <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-3" />
                            <span className="w-1 bg-amber-300 rounded-full animate-bounce h-4" style={{ animationDuration: '0.6s' }} />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onToggleAudioPreview(auItem);
                            }}
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                              isPrev ? 'bg-amber-400 text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                            }`}
                          >
                            {isPrev ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current ml-0.5" />}
                          </button>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] font-bold truncate text-white">{ps.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{ps.sub}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {renderProLoadMore('text-emerald-300')}
              </div>
            )}

            {/* 5. DIALOGUES / REC (52,000+ CINEMA LINES) */}
            {category.id === 'dialogues' && (
              <div className="space-y-1.5">
                {renderProCategoryToolbar('bg-amber-400 text-black', `Search ${TOTAL_PRO_DIALOGUES_COUNT.toLocaleString()}+ dialogues...`)}
                <div className="grid grid-cols-2 gap-1.5">
                  {!catSearch.trim() && catFilter === 'All' && DIALOGUE_PRESETS_LIST.slice(0, 4).map((dl) => {
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
                        <div className="w-full h-6 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between px-1.5 text-amber-300">
                          <div className="flex items-center gap-1 text-[8px] font-bold">
                            <Mic className="w-2.5 h-2.5" />
                            <span>{dl.speaker}</span>
                          </div>
                          <span className="text-[7.5px] font-mono text-zinc-400">{dl.durationSec}s</span>
                        </div>
                        <div className="text-[8px] text-zinc-200 line-clamp-2 leading-tight">
                          "{dl.line}"
                        </div>
                      </button>
                    );
                  })}
                  {genericProMeta.result.items.map((pd) => {
                    const active = props.activeDialoguePresetId === pd.id;
                    return (
                      <button
                        key={pd.id}
                        type="button"
                        onClick={() =>
                          props.onApplyDialoguePreset({
                            id: pd.id,
                            name: pd.name,
                            speaker: pd.engineId || 'Hero',
                            line: pd.sub,
                            category: pd.category,
                            durationSec: pd.bpm || 4,
                            description: pd.sub,
                          })
                        }
                        className={`rounded-xl border p-1.5 flex flex-col justify-between gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-amber-400 bg-amber-950/40 text-white ring-1 ring-amber-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className="w-full h-6 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between px-1.5 text-amber-300">
                          <span className="text-[8px] font-bold truncate">{pd.engineId || 'Speaker'}</span>
                          <span className="text-[7.5px] font-mono text-zinc-400">{pd.bpm || 4}s</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[8.5px] font-bold text-white truncate">{pd.name}</div>
                          <div className="text-[7.5px] text-zinc-300 line-clamp-1">"{pd.sub}"</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {renderProLoadMore('text-amber-300')}
              </div>
            )}

            {/* 6. EMOJI & STICKERS (52,000+ STICKERS & BADGES) */}
            {category.id === 'stickers' && (
              <div className="space-y-1.5">
                {renderProCategoryToolbar('bg-sky-400 text-black', `Search ${TOTAL_PRO_STICKERS_COUNT.toLocaleString()}+ stickers...`)}
                <div className="grid grid-cols-2 gap-1.5">
                  {!catSearch.trim() && catFilter === 'All' && STICKERS_LIST.slice(0, 4).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => props.onAddSticker(st)}
                      className="rounded-xl border border-zinc-800 hover:border-sky-400 active:border-sky-400 bg-[#121721] p-1.5 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors group"
                    >
                      <div className="w-full aspect-video rounded-lg bg-black/50 border border-white/5 flex items-center justify-center">
                        <span className="text-xl group-hover:scale-125 transition-transform">
                          {st.emoji}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-zinc-200 truncate w-full">{st.name}</span>
                    </button>
                  ))}
                  {genericProMeta.result.items.map((ps) => (
                    <button
                      key={ps.id}
                      type="button"
                      onClick={() =>
                        props.onAddSticker({
                          id: ps.id,
                          name: ps.name,
                          category: ps.category,
                          badgeText: ps.category.toUpperCase(),
                          emoji: ps.engineId || '🎬',
                          colorClass: 'bg-sky-500/20 text-sky-300',
                          description: ps.sub,
                        })
                      }
                      className="rounded-xl border border-zinc-800 hover:border-sky-400 active:border-sky-400 bg-[#121721] p-1.5 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors group"
                    >
                      <div className={`w-full aspect-video rounded-lg bg-gradient-to-br ${ps.swatch} border border-white/10 relative overflow-hidden flex items-center justify-center`}>
                        <div className="absolute inset-0 bg-black/35" />
                        <span className="text-xl relative z-10 group-hover:scale-125 transition-transform">
                          {ps.engineId || '🎬'}
                        </span>
                      </div>
                      <div className="min-w-0 w-full">
                        <div className="text-[9px] font-bold text-white truncate">{ps.name}</div>
                        <div className="text-[7.5px] text-zinc-400 truncate">{ps.category}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {renderProLoadMore('text-sky-300')}
              </div>
            )}

            {/* 7. ACTION VFX STUDIO (21,000+ CINEMATIC & SHORT-FILM EFFECTS + TIMELINE LAYER ADJUSTER) */}
            {category.id === 'vfx' && (
              <div className="space-y-1.5">
                {/* Quick Scene Upload + Active VFX Count */}
                <div className="flex items-center gap-1">
                  <div className="relative flex-1">
                    <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={vfxSearch}
                      onChange={(e) => {
                        setVfxSearch(e.target.value);
                        setVfxPageCount(1);
                      }}
                      placeholder={`Search ${TOTAL_PRO_VFX_COUNT.toLocaleString()}+ VFX: fire, bullet, collapse...`}
                      className="w-full pl-6 pr-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-rose-400 text-[9.5px] text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={props.onTriggerUploadMedia}
                    className="py-1 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[9px] font-extrabold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    title="Upload Scene Video / Photo"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Scene</span>
                  </button>
                </div>

                {/* Placed VFX Layer Timeline Adjuster */}
                {props.vfxLayers && props.vfxLayers.length > 0 && (
                  <div className="p-2 rounded-xl bg-[#101520] border border-rose-500/35 space-y-1.5 text-[9px]">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-rose-300">
                        Active VFX ({props.vfxLayers.length}) · Drag on preview or adjust:
                      </span>
                    </div>
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                      {props.vfxLayers.map((vl, idx) => {
                        const isSel = (props.selectedVfxLayerId || props.vfxLayers![props.vfxLayers!.length - 1].id) === vl.id;
                        return (
                          <button
                            key={vl.id}
                            type="button"
                            onClick={() => props.onSelectVfxLayer?.(vl.id)}
                            className={`px-2 py-0.5 rounded text-[8.5px] font-bold whitespace-nowrap cursor-pointer ${
                              isSel
                                ? 'bg-rose-400 text-black'
                                : 'bg-zinc-900 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            #{idx + 1} {vl.vfx.name.slice(0, 14)}
                          </button>
                        );
                      })}
                    </div>
                    {(() => {
                      const activeLayer =
                        props.vfxLayers.find((x) => x.id === props.selectedVfxLayerId) ||
                        props.vfxLayers[props.vfxLayers.length - 1];
                      if (!activeLayer || !props.onUpdateVfxLayer) return null;
                      return (
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-0.5">
                          <label className="space-y-0.5">
                            <div className="flex justify-between text-zinc-300">
                              <span>Start X</span>
                              <span className="font-mono text-rose-300">{Math.round(activeLayer.startXPct)}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={95}
                              value={activeLayer.startXPct}
                              onChange={(e) =>
                                props.onUpdateVfxLayer?.(activeLayer.id, { startXPct: Number(e.target.value) })
                              }
                              className="w-full accent-rose-400 h-1"
                            />
                          </label>
                          <label className="space-y-0.5">
                            <div className="flex justify-between text-zinc-300">
                              <span>Start Y</span>
                              <span className="font-mono text-rose-300">{Math.round(activeLayer.startYPct)}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={95}
                              value={activeLayer.startYPct}
                              onChange={(e) =>
                                props.onUpdateVfxLayer?.(activeLayer.id, { startYPct: Number(e.target.value) })
                              }
                              className="w-full accent-rose-400 h-1"
                            />
                          </label>
                          <label className="space-y-0.5">
                            <div className="flex justify-between text-zinc-300">
                              <span>Scale</span>
                              <span className="font-mono text-rose-300">{activeLayer.scale.toFixed(1)}x</span>
                            </div>
                            <input
                              type="range"
                              min={0.3}
                              max={3.0}
                              step={0.1}
                              value={activeLayer.scale}
                              onChange={(e) =>
                                props.onUpdateVfxLayer?.(activeLayer.id, { scale: Number(e.target.value) })
                              }
                              className="w-full accent-rose-400 h-1"
                            />
                          </label>
                          <label className="space-y-0.5">
                            <div className="flex justify-between text-zinc-300">
                              <span>Duration</span>
                              <span className="font-mono text-rose-300">{activeLayer.durationSec.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min={0.5}
                              max={15}
                              step={0.5}
                              value={activeLayer.durationSec}
                              onChange={(e) =>
                                props.onUpdateVfxLayer?.(activeLayer.id, { durationSec: Number(e.target.value) })
                              }
                              className="w-full accent-rose-400 h-1"
                            />
                          </label>
                          <label className="space-y-0.5">
                            <div className="flex justify-between text-zinc-300">
                              <span>Speed</span>
                              <span className="font-mono text-rose-300">{activeLayer.speed.toFixed(1)}x</span>
                            </div>
                            <input
                              type="range"
                              min={0.25}
                              max={3.0}
                              step={0.25}
                              value={activeLayer.speed}
                              onChange={(e) =>
                                props.onUpdateVfxLayer?.(activeLayer.id, { speed: Number(e.target.value) })
                              }
                              className="w-full accent-rose-400 h-1"
                            />
                          </label>
                          <div className="flex items-end justify-end">
                            <button
                              type="button"
                              onClick={() => props.onDeleteVfxLayer?.(activeLayer.id)}
                              className="w-full py-1 rounded bg-red-500/20 hover:bg-red-500/35 border border-red-500/35 text-red-300 font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Horizontal VFX Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setVfxCatFilter('All');
                      setVfxPageCount(1);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[8.5px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      vfxCatFilter === 'All'
                        ? 'bg-rose-400 text-black'
                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                    }`}
                  >
                    All ({TOTAL_PRO_VFX_COUNT.toLocaleString()}+)
                  </button>
                  {ACTION_VFX_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setVfxCatFilter(c.id);
                        setVfxPageCount(1);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[8.5px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                        vfxCatFilter === c.id
                          ? 'bg-rose-400 text-black'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="text-[8.5px] font-mono text-zinc-400 px-0.5">
                  {vfxQueryResult.total.toLocaleString()} VFX presets · Tap to add on timeline
                </div>

                {/* Paginated 2-Column VFX Presets Grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {vfxQueryResult.items.map((pv) => {
                    const iconEmoji =
                      pv.vfxType === 'building_fire' || pv.vfxType === 'fire_blast'
                        ? '🔥'
                        : pv.vfxType === 'building_collapse'
                        ? '🏚️'
                        : pv.vfxType === 'bullet_tracer'
                        ? '🔫'
                        : pv.vfxType === 'bullet_hit_body' || pv.vfxType === 'blood_splatter'
                        ? '🩸'
                        : pv.vfxType === 'explosion_boom'
                        ? '💥'
                        : pv.vfxType === 'glass_shatter'
                        ? '🪟'
                        : pv.vfxType === 'lightning_arc'
                        ? '⚡'
                        : pv.vfxType === 'sparks_shower' || pv.vfxType === 'muzzle_flash'
                        ? '✨'
                        : pv.vfxType === 'sword_slash'
                        ? '⚔️'
                        : '💨';

                    return (
                      <button
                        key={pv.id}
                        type="button"
                        onClick={() => {
                          if (props.onAddProVfx) {
                            props.onAddProVfx(pv);
                          } else {
                            props.onAddVfx({
                              id: pv.id,
                              name: pv.name,
                              category: pv.category,
                              kind:
                                pv.vfxType === 'bullet_tracer'
                                  ? 'bullet_tracer'
                                  : pv.vfxType === 'explosion_boom'
                                    ? 'explosion'
                                    : pv.vfxType === 'building_fire'
                                      ? 'building_inferno'
                                      : pv.vfxType === 'fire_blast'
                                        ? 'fireball'
                                        : 'shockwave',
                              hasMotionRoute: pv.vfxType === 'bullet_tracer' || pv.vfxType === 'sword_slash',
                              primaryColor: '#f97316',
                              secondaryColor: '#ef4444',
                              defaultDurationSec: 3.0,
                              emoji: iconEmoji,
                              description: pv.sub,
                            });
                          }
                        }}
                        className="rounded-xl border border-zinc-800 hover:border-rose-400 active:border-rose-400 bg-[#121721] p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-colors group"
                      >
                        <div
                          className={`w-full aspect-video rounded-lg bg-gradient-to-br ${pv.swatch} border border-white/10 relative overflow-hidden flex items-center justify-center`}
                        >
                          <div className="absolute inset-0 bg-black/30" />
                          <span className="text-lg relative z-10 group-hover:scale-110 transition-transform">
                            {iconEmoji}
                          </span>
                          <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/75 text-[7px] font-mono text-rose-300 font-bold">
                            + ADD
                          </span>
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold text-white truncate">{pv.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{pv.category}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {vfxQueryResult.items.length < vfxQueryResult.total && (
                  <button
                    type="button"
                    onClick={() => setVfxPageCount((c) => c + 1)}
                    className="w-full py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[9.5px] font-bold text-rose-300 cursor-pointer"
                  >
                    Load More VFX ({(vfxQueryResult.total - vfxQueryResult.items.length).toLocaleString()} more)
                  </button>
                )}
              </div>
            )}

            {/* 8. TRAILER CARDS (52,000+ POSTER SLATES) */}
            {category.id === 'card' && (
              <div className="space-y-1.5">
                {renderProCategoryToolbar('bg-amber-400 text-black', `Search ${TOTAL_PRO_CARDS_COUNT.toLocaleString()}+ trailer cards...`)}
                <div className="grid grid-cols-2 gap-1.5">
                  {!catSearch.trim() && catFilter === 'All' && TRAILER_CARDS_LIST.slice(0, 4).map((cd) => {
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
                          <span className="text-[8.5px] font-black uppercase text-amber-300 tracking-wider truncate max-w-full">
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
                  {genericProMeta.result.items.map((pc) => {
                    const active = props.activeCardPresetId === pc.id;
                    const [th = 'blockbuster_gold', an = 'tilt_float'] = (pc.engineId || '').split('__');
                    return (
                      <button
                        key={pc.id}
                        type="button"
                        onClick={() =>
                          props.onApplyTrailerCardPreset({
                            id: pc.id,
                            name: pc.name,
                            title: pc.name.toUpperCase(),
                            subtitle: pc.category.toUpperCase(),
                            badgeText: 'TRAILER',
                            category: pc.category,
                            theme: th as TrailerCardTheme,
                            animation: an as TrailerCardAnimation,
                            durationSec: 4,
                            description: pc.sub,
                          })
                        }
                        className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-amber-400 bg-amber-950/40 text-white ring-1 ring-amber-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-full aspect-video rounded-lg bg-gradient-to-br ${pc.swatch} border border-white/10 flex flex-col items-center justify-center p-1 relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-black/45" />
                          <span className="text-[8px] font-black uppercase text-amber-200 tracking-wider truncate max-w-full relative z-10">
                            {pc.category}
                          </span>
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold text-white truncate">{pc.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{pc.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {renderProLoadMore('text-amber-300')}
              </div>
            )}

            {/* 9. CHROMA KEY (52,000+ STUDIO KEYS & BACKDROPS) */}
            {category.id === 'chroma' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={props.onPickChromaBg}
                  className="w-full py-1.5 px-2 rounded-xl bg-emerald-400/20 hover:bg-emerald-400/30 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Custom Chroma Background</span>
                </button>
                {renderProCategoryToolbar('bg-emerald-400 text-black', `Search ${TOTAL_PRO_CHROMA_COUNT.toLocaleString()}+ chroma keys...`)}
                <div className="grid grid-cols-2 gap-1.5">
                  {!catSearch.trim() && catFilter === 'All' && CHROMA_BACKGROUNDS_LIST.slice(0, 4).map((ch) => {
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
                          <Wand2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="text-[9px] font-bold text-white truncate px-0.5">{ch.name}</div>
                      </button>
                    );
                  })}
                  {genericProMeta.result.items.map((pk) => {
                    const active = props.activeChromaPresetId === pk.id && props.chromaConfig.enabled;
                    const [cp = 'green', bg = 'studio_teal', simS = '40', smS = '16'] = (pk.engineId || '').split('__');
                    return (
                      <button
                        key={pk.id}
                        type="button"
                        onClick={() =>
                          props.onApplyChromaPreset({
                            id: pk.id,
                            name: pk.name,
                            category: pk.category,
                            colorPreset: cp as ChromaKeyConfig['colorPreset'],
                            bgMode: bg as ChromaKeyConfig['bgMode'],
                            similarity: Number(simS) || 40,
                            smoothness: Number(smS) || 16,
                            swatchClass: `bg-gradient-to-br ${pk.swatch}`,
                            description: pk.sub,
                          })
                        }
                        className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-emerald-400 bg-emerald-950/40 text-white ring-1 ring-emerald-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-full aspect-video rounded-lg bg-gradient-to-br ${pk.swatch} border border-white/10 flex items-center justify-center relative overflow-hidden`}>
                          <Wand2 className="w-3.5 h-3.5 text-white drop-shadow" />
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold text-white truncate">{pk.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{pk.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {renderProLoadMore('text-emerald-300')}
              </div>
            )}

            {/* 10. SPLIT SCREEN (52,000+ SPLIT LAYOUTS) */}
            {category.id === 'split' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={props.onAutoJoinSplitClips}
                  className="w-full py-1.5 px-2 rounded-xl bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/40 text-cyan-300 text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>Auto Join 2 Timeline Clips</span>
                </button>
                {renderProCategoryToolbar('bg-cyan-400 text-black', `Search ${TOTAL_PRO_SPLIT_COUNT.toLocaleString()}+ split layouts...`)}
                <div className="grid grid-cols-2 gap-1.5">
                  {!catSearch.trim() && catFilter === 'All' && SPLIT_PRESETS_LIST.slice(0, 4).map((sp) => {
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
                        <div className="text-[9px] font-bold text-white truncate px-0.5">{sp.name}</div>
                      </button>
                    );
                  })}
                  {genericProMeta.result.items.map((ps) => {
                    const active = props.activeSplitPresetId === ps.id && props.splitScreenConfig.enabled;
                    const [lay = 'left_right', rat = '50'] = (ps.engineId || '').split('__');
                    return (
                      <button
                        key={ps.id}
                        type="button"
                        onClick={() =>
                          props.onApplySplitPreset({
                            id: ps.id,
                            name: ps.name,
                            category: ps.category,
                            layout: lay as SplitScreenConfig['layout'],
                            splitRatio: Number(rat) || 50,
                            gapPx: 4,
                            description: ps.sub,
                          })
                        }
                        className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-cyan-400 bg-cyan-950/40 text-white ring-1 ring-cyan-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className="w-full aspect-video rounded-lg bg-black border border-white/10 flex relative overflow-hidden">
                          <div className="w-1/2 h-full bg-cyan-500/25 border-r border-cyan-400 flex items-center justify-center text-[7.5px] font-bold text-cyan-200">
                            A
                          </div>
                          <div className="w-1/2 h-full bg-amber-500/25 flex items-center justify-center text-[7.5px] font-bold text-amber-200">
                            B
                          </div>
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold text-white truncate">{ps.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{ps.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {renderProLoadMore('text-cyan-300')}
              </div>
            )}

            {/* 11. TRANSITIONS (56,000+ GPU SEAM TRANSITIONS) */}
            {category.id === 'transitions' && (
              <div className="space-y-1.5">
                {renderProCategoryToolbar('bg-amber-400 text-black', `Search ${TOTAL_PRO_TRANSITIONS_COUNT.toLocaleString()}+ transitions...`)}
                <div className="grid grid-cols-2 gap-1.5">
                  {!catSearch.trim() && catFilter === 'All' && TRANSITIONS_LIST.slice(0, 4).map((tr) => {
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
                        <div className="w-full aspect-video rounded-lg bg-black border border-white/10 relative overflow-hidden flex items-center justify-center">
                          <img src={sampleThumb} alt={tr.name} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/70 text-[7px] font-mono text-amber-300">
                            {tr.durationSec}s
                          </span>
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold text-white truncate">{tr.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{tr.category}</div>
                        </div>
                      </button>
                    );
                  })}
                  {genericProMeta.result.items.map((pt) => {
                    const active = props.selectedTransitionId === pt.id && !isMutedOrOff;
                    const effMap: Record<string, TransitionItem['effectType']> = {
                      zoom_flow: 'zoom',
                      whip_pan_left: 'whip',
                      light_leak: 'flash',
                      zoom_match_out: 'zoom',
                      glitch_flash: 'glitch',
                      circle_open: 'cube3d',
                      fade: 'dissolve',
                      focus_pull: 'wipe',
                    };
                    const effType = effMap[pt.engineId || 'fade'] || 'dissolve';
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() =>
                          props.onSelectTransition(
                            active
                              ? null
                              : {
                                  id: pt.id,
                                  name: pt.name,
                                  category: pt.category,
                                  icon: '✦',
                                  effectType: effType,
                                  durationSec: 0.9,
                                  description: pt.sub,
                                }
                          )
                        }
                        className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-amber-400 bg-amber-950/40 text-white ring-1 ring-amber-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-full aspect-video rounded-lg bg-gradient-to-br ${pt.swatch} border border-white/10 relative overflow-hidden flex items-center justify-center`}>
                          <div className="absolute inset-0 bg-black/35" />
                          <span className="relative z-10 text-[8.5px] font-black uppercase text-amber-200">
                            {effType}
                          </span>
                          <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/75 text-[7px] font-mono text-amber-300">
                            0.9s
                          </span>
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold text-white truncate">{pt.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{pt.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {renderProLoadMore('text-amber-300')}
              </div>
            )}

            {/* 12. VISUAL EFFECTS (52,000+ OVERLAYS & PARTICLES) */}
            {category.id === 'effects' && (
              <div className="space-y-1.5">
                {renderProCategoryToolbar('bg-purple-400 text-black', `Search ${TOTAL_PRO_EFFECTS_COUNT.toLocaleString()}+ visual effects...`)}
                <div className="grid grid-cols-2 gap-1.5">
                  {!catSearch.trim() && catFilter === 'All' && EFFECTS_LIST.slice(0, 4).map((fx) => {
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
                          <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/70 text-[7px] font-mono text-purple-300">
                            FX
                          </span>
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold text-white truncate">{fx.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{fx.category}</div>
                        </div>
                      </button>
                    );
                  })}
                  {genericProMeta.result.items.map((pf) => {
                    const active = props.activeEffect?.id === pf.id && !isMutedOrOff;
                    const effType = (pf.engineId as EffectItem['effectType']) || 'light_leak';
                    return (
                      <button
                        key={pf.id}
                        type="button"
                        onClick={() =>
                          props.onSelectEffect(
                            active
                              ? null
                              : {
                                  id: pf.id,
                                  name: pf.name,
                                  category: pf.category,
                                  overlayClass: 'opacity-40',
                                  effectType: effType,
                                  accentColor: pf.colorHex || '#c084fc',
                                  description: pf.sub,
                                }
                          )
                        }
                        className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-purple-400 bg-purple-950/40 text-white ring-1 ring-purple-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-full aspect-video rounded-lg bg-gradient-to-br ${pf.swatch} border border-white/10 relative overflow-hidden flex items-center justify-center`}>
                          <div className="absolute inset-0 bg-black/35" />
                          <Sparkles className="w-4 h-4 relative z-10" style={{ color: pf.colorHex || '#e9d5ff' }} />
                          <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/75 text-[7px] font-mono text-purple-300">
                            FX
                          </span>
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold text-white truncate">{pf.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{pf.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {renderProLoadMore('text-purple-300')}
              </div>
            )}

            {/* 13. TEMPLATES (52,000+ CINEMA TRAILER & REEL TEMPLATES) */}
            {category.id === 'templates' && (
              <div className="space-y-1.5">
                {renderProCategoryToolbar('bg-teal-400 text-black', `Search ${TOTAL_PRO_TEMPLATES_COUNT.toLocaleString()}+ templates...`)}
                <div className="grid grid-cols-2 gap-1.5">
                  {!catSearch.trim() && catFilter === 'All' && TRAILER_PRESET_PACKS.slice(0, 4).map((pk) => (
                    <button
                      key={pk.id}
                      type="button"
                      onClick={() => props.onApplyTrailerPack(pk.id)}
                      className="rounded-xl border border-zinc-800 hover:border-teal-400 active:border-teal-400 bg-[#121721] p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-colors"
                    >
                      <div className="w-full aspect-video rounded-lg bg-[#0a0d14] border border-white/10 flex items-center justify-center p-1 relative overflow-hidden">
                        <span className="text-[9px] font-black uppercase text-teal-300 tracking-wider text-center">
                          {pk.name}
                        </span>
                      </div>
                      <div className="min-w-0 px-0.5">
                        <div className="text-[9px] font-bold text-white truncate">{pk.name}</div>
                        <div className="text-[7.5px] text-zinc-400 truncate">{pk.title}</div>
                      </div>
                    </button>
                  ))}
                  {genericProMeta.result.items.map((ptm) => {
                    const active = props.activeTemplateId === ptm.id;
                    return (
                      <button
                        key={ptm.id}
                        type="button"
                        onClick={() =>
                          props.onApplyTemplate({
                            id: ptm.id,
                            title: ptm.name,
                            duration: `0:${ptm.bpm || 15}`,
                            durationSec: ptm.bpm || 15,
                            category: ptm.category,
                            thumbnail: sampleThumb,
                            movieTitle: ptm.name.toUpperCase(),
                            subtitle: ptm.category.toUpperCase(),
                            director: ptm.engineId || 'Studio Master',
                            bgUrl: sampleThumb,
                            description: ptm.sub,
                          })
                        }
                        className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-teal-400 bg-teal-950/40 text-white ring-1 ring-teal-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-full aspect-video rounded-lg bg-gradient-to-br ${ptm.swatch} border border-white/10 flex items-center justify-center p-1 relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-black/35" />
                          <span className="text-[8.5px] font-black uppercase text-teal-200 tracking-wider text-center relative z-10 line-clamp-1">
                            {ptm.category}
                          </span>
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold text-white truncate">{ptm.name}</div>
                          <div className="text-[7.5px] text-zinc-400 truncate">{ptm.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {renderProLoadMore('text-teal-300')}
              </div>
            )}

            {/* 14. PHOTO-TO-ACTION VIDEO REELS (108,000+ ACTION / BIRTHDAY / COMEDY / MALAYALAM / ENGLISH) */}
            {category.id === 'action_reel' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={props.onTriggerUploadMedia}
                  className="w-full py-2 px-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 hover:brightness-110 text-black text-[10.5px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Upload Photo / Video → Action Reel</span>
                </button>

                {/* Quick 4-Line Action / Birthday / Malayalam Caption Box */}
                <div className="rounded-xl border border-orange-500/35 bg-[#101520] p-1.5 space-y-1">
                  <div className="text-[8.5px] font-extrabold text-orange-300">
                    Reel Overlay Text (EN / മലയാളം · 4 Lines)
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      type="text"
                      value={props.movieTitle}
                      onChange={(e) => props.onUpdateTitleText(e.target.value, props.subtitle)}
                      placeholder="Line 1 (Hero / Birthday / മലയാളം)"
                      className="px-1.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[8.5px] text-white placeholder-zinc-500 focus:outline-none focus:border-orange-400"
                    />
                    <input
                      type="text"
                      value={props.subtitle}
                      onChange={(e) => props.onUpdateTitleText(props.movieTitle, e.target.value)}
                      placeholder="Line 2 (Action Punch)"
                      className="px-1.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[8.5px] text-white placeholder-zinc-500 focus:outline-none focus:border-orange-400"
                    />
                  </div>
                </div>

                {renderProCategoryToolbar('bg-orange-400 text-black', `Search ${TOTAL_PRO_ACTION_REELS_COUNT.toLocaleString()}+ Action, Birthday, Comedy, Malayalam reels...`)}

                <div className="grid grid-cols-2 gap-1.5">
                  {genericProMeta.result.items.map((ar) => {
                    const [vfxType = 'explosion_boom', spdStr = '1', themeId = 'fire_action'] = (ar.engineId || '').split('__');
                    const lines = ar.previewLines || [ar.name, ar.category];
                    const active = props.activeActionReelId === ar.id && !isMutedOrOff;
                    return (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => {
                          if (props.onApplyActionReelPreset) {
                            props.onApplyActionReelPreset({
                              id: ar.id,
                              name: ar.name,
                              lines,
                              vfxType: vfxType as ActionVfxType,
                              motionSpeed: Number(spdStr) || 1,
                              themeId,
                            });
                          } else {
                            props.onUpdateTitleText(lines[0] || ar.name, lines[1] || '');
                            props.onChangeTitleExtraLines?.(lines[2] || '', lines[3] || '');
                          }
                        }}
                        className={`rounded-xl border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-all ${
                          active
                            ? 'border-orange-400 bg-orange-950/40 text-white ring-1 ring-orange-400 shadow-md'
                            : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-orange-400/70'
                        }`}
                      >
                        <div className={`w-full aspect-video rounded-lg bg-gradient-to-br ${ar.swatch} border border-white/10 relative overflow-hidden flex flex-col items-center justify-center p-1`}>
                          <div className="absolute inset-0 bg-black/40" />
                          <span className="text-base relative z-10">{ar.badge || '🎬'}</span>
                          <span className="text-[7.5px] font-black text-white text-center line-clamp-1 relative z-10 mt-0.5">
                            {lines[0]}
                          </span>
                          <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/75 text-[6.5px] font-mono text-orange-300">
                            {spdStr}x
                          </span>
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold text-white truncate">{ar.name}</div>
                          <div className="text-[7px] text-zinc-400 truncate">{ar.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {renderProLoadMore('text-orange-300')}
              </div>
            )}

            {/* 15. EMBLEM STUDIO & LOGO MOVIE TRAILERS (108,000+ CRESTS & INTROS) */}
            {category.id === 'emblem_trailer' && (
              <div className="space-y-1.5">
                <div className="rounded-xl border border-amber-400/35 bg-[#101520] p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-extrabold text-amber-300 inline-flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>Emblem Studio & Trailer Crest</span>
                    </span>
                    <div className="flex items-center gap-1">
                      {props.onPickEmblemLogo && (
                        <button
                          type="button"
                          onClick={props.onPickEmblemLogo}
                          className="px-1.5 py-0.5 rounded bg-amber-400 text-black text-[8px] font-extrabold inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>Logo</span>
                        </button>
                      )}
                      {props.emblemConfig?.enabled && props.onUpdateEmblemConfig && (
                        <button
                          type="button"
                          onClick={() => props.onUpdateEmblemConfig?.((p) => ({ ...p, enabled: false }))}
                          className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[8px] font-bold cursor-pointer"
                        >
                          Off
                        </button>
                      )}
                    </div>
                  </div>

                  {props.emblemConfig && props.onUpdateEmblemConfig && (
                    <>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="text"
                          value={props.emblemConfig.studioName}
                          onChange={(e) =>
                            props.onUpdateEmblemConfig?.((p) => ({ ...p, enabled: true, studioName: e.target.value }))
                          }
                          placeholder="Studio Name / മലയാളം"
                          className="px-1.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[8.5px] text-white focus:outline-none focus:border-amber-400"
                        />
                        <input
                          type="text"
                          value={props.emblemConfig.tagline}
                          onChange={(e) =>
                            props.onUpdateEmblemConfig?.((p) => ({ ...p, enabled: true, tagline: e.target.value }))
                          }
                          placeholder="Tagline / Presents"
                          className="px-1.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[8.5px] text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={props.emblemConfig.subline}
                          onChange={(e) =>
                            props.onUpdateEmblemConfig?.((p) => ({ ...p, enabled: true, subline: e.target.value }))
                          }
                          placeholder="Subline (4K ULTRA HD)"
                          className="flex-1 px-1.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[8.5px] text-white focus:outline-none focus:border-amber-400"
                        />
                        <input
                          type="color"
                          value={props.emblemConfig.accentColor}
                          onChange={(e) =>
                            props.onUpdateEmblemConfig?.((p) => ({ ...p, enabled: true, accentColor: e.target.value }))
                          }
                          className="w-6 h-5 rounded bg-transparent border-0 p-0 cursor-pointer shrink-0"
                        />
                      </div>
                      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                        {(
                          ['shield', 'crown', 'film_reel', 'star_crest', 'wings', 'neon_hex', 'birthday_star', 'royal_seal'] as EmblemCrestShape[]
                        ).map((sh) => (
                          <button
                            key={sh}
                            type="button"
                            onClick={() =>
                              props.onUpdateEmblemConfig?.((p) => ({ ...p, enabled: true, shape: sh }))
                            }
                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                              props.emblemConfig?.shape === sh && props.emblemConfig?.enabled
                                ? 'bg-amber-400 text-black'
                                : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                            }`}
                          >
                            {sh.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {renderProCategoryToolbar('bg-amber-400 text-black', `Search ${TOTAL_PRO_EMBLEMS_COUNT.toLocaleString()}+ emblems & logo trailers...`)}

                <div className="grid grid-cols-2 gap-1.5">
                  {genericProMeta.result.items.map((em) => {
                    const [shape = 'shield', anim = 'light_sweep', col = '#fbbf24'] = (em.engineId || '').split('__');
                    const lines = em.previewLines || [em.name, em.category, '4K STUDIO'];
                    return (
                      <button
                        key={em.id}
                        type="button"
                        onClick={() =>
                          props.onUpdateEmblemConfig?.((prev) => ({
                            ...prev,
                            enabled: true,
                            shape: shape as EmblemCrestShape,
                            animStyle: anim as EmblemTrailerConfig['animStyle'],
                            accentColor: col || em.colorHex || '#fbbf24',
                            studioName: lines[0] || em.name,
                            tagline: lines[1] || '',
                            subline: lines[2] || '',
                          }))
                        }
                        className="rounded-xl border border-zinc-800 hover:border-amber-400 active:border-amber-400 bg-[#121721] p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-colors"
                      >
                        <div className={`w-full aspect-video rounded-lg bg-gradient-to-br ${em.swatch} border border-white/10 relative overflow-hidden flex flex-col items-center justify-center p-1`}>
                          <div className="absolute inset-0 bg-black/45" />
                          <Shield className="w-4 h-4 relative z-10" style={{ color: col || '#fbbf24' }} />
                          <span className="text-[7.5px] font-black text-white truncate max-w-full relative z-10 mt-0.5">
                            {lines[0]}
                          </span>
                          <span className="text-[6px] text-zinc-300 truncate max-w-full relative z-10">
                            {em.badge || shape}
                          </span>
                        </div>
                        <div className="min-w-0 px-0.5">
                          <div className="text-[9px] font-bold text-white truncate">{em.name}</div>
                          <div className="text-[7px] text-zinc-400 truncate">{em.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {renderProLoadMore('text-amber-300')}
              </div>
            )}
          </>
        )}

        {/* Subtle drawer sponsor banner at bottom of scrollable options */}
        <div className="pt-3 pb-1 px-1 shrink-0">
          <CompactSmallBannerAd slotId="drawer-scroll-bottom-ad" slotIndex={4} />
        </div>
      </div>
    </div>
  );
});
