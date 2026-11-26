import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Search,
  Upload,
  Volume2,
  VolumeX,
  Check,
  Plus,
  Sparkles,
  Power,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import type { WheelCategoryItem } from './CircularToolWheel';
import {
  FILTERS_LIST,
  FILTER_CATEGORIES,
  SFX_FOLEY_LIST,
  SFX_FOLEY_CATEGORIES,
  MUSIC_BGM_LIST,
  MUSIC_BGM_CATEGORIES,
  MEDIA_MOTION_LIST,
  MEDIA_MOTION_CATEGORIES,
  DIALOGUE_PRESETS_LIST,
  DIALOGUE_PRESET_CATEGORIES,
  TRAILER_CARDS_LIST,
  TRAILER_CARD_CATEGORIES,
  CHROMA_BACKGROUNDS_LIST,
  CHROMA_BG_CATEGORIES,
  SPLIT_PRESETS_LIST,
  SPLIT_PRESET_CATEGORIES,
  TRANSITIONS_LIST,
  TRANSITION_CATEGORIES,
  EFFECTS_LIST,
  EFFECT_CATEGORIES,
  TITLES_LIST,
  TITLE_CATEGORIES,
  TEMPLATES_LIST,
  TEMPLATE_CATEGORIES,
  STICKERS_LIST,
  STICKER_CATEGORIES,
  COLOR_GRADES_LIST,
  COLOR_GRADE_CATEGORIES,
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
  type MediaMotionPreset,
  type DialoguePresetItem,
  type TrailerCardPresetItem,
  type ChromaPresetItem,
  type SplitLayoutPresetItem,
} from './videoStudioLibrary';
import {
  TRAILER_CARD_ANIMATIONS,
  TRAILER_CARD_THEMES,
  TRAILER_PRESET_PACKS,
  TRAILER_TITLE_ANIMATIONS,
  TRAILER_TITLE_THEMES,
  type ChromaBgMode,
  type ChromaKeyColorPreset,
  type ChromaKeyConfig,
  type SplitLayoutType,
  type SplitScreenConfig,
  type TitleAnimationType,
  type TitleThemeType,
  type TrailerCardAnimation,
  type TrailerCardTheme,
} from '../lib/studioAdvancedFx';

export interface WheelFeatureDrawerProps {
  category: WheelCategoryItem;
  isMutedOrOff: boolean;
  onBack: () => void;
  onToggleMuteOrOff: () => void;

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
  onSelectTransition: (tr: TransitionItem | null) => void;
  activeEffect: EffectItem | null;
  onSelectEffect: (fx: EffectItem | null) => void;
  activeTemplateId: string | null;
  onApplyTemplate: (tmpl: TemplateItem) => void;
  onApplyTrailerPack: (packId: string) => void;
}

const PAGE_SIZE = 60;

export const WheelFeatureDrawer: React.FC<WheelFeatureDrawerProps> = React.memo((props) => {
  const { category, isMutedOrOff, onBack, onToggleMuteOrOff } = props;
  const [subCat, setSubCat] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [renderLimit, setRenderLimit] = useState<number>(PAGE_SIZE);
  const [filterMode, setFilterMode] = useState<'filters' | 'grading'>('filters');

  // Reset pagination & search cleanly whenever switching between wheel categories
  useEffect(() => {
    setSubCat('All');
    setSearch('');
    setRenderLimit(PAGE_SIZE);
  }, [category.id]);

  const q = search.trim().toLowerCase();

  const subCategories = useMemo(() => {
    switch (category.id) {
      case 'video':
        return ['All', 'Gallery', ...MEDIA_MOTION_CATEGORIES];
      case 'audio':
        return ['All', 'My Audio', ...SFX_FOLEY_CATEGORIES];
      case 'music':
        return ['All', 'My Audio', ...MUSIC_BGM_CATEGORIES];
      case 'filters':
        return filterMode === 'filters'
          ? ['All', ...FILTER_CATEGORIES]
          : ['All', ...COLOR_GRADE_CATEGORIES];
      case 'dialogues':
        return ['All', 'Custom Line', ...DIALOGUE_PRESET_CATEGORIES];
      case 'titles':
        return ['All', 'Custom Text', 'Animation', ...TITLE_CATEGORIES];
      case 'stickers':
        return ['All', ...STICKER_CATEGORIES];
      case 'vfx':
        return ['All', ...VFX_CATEGORIES];
      case 'card':
        return ['All', 'Custom Card', ...TRAILER_CARD_CATEGORIES];
      case 'chroma':
        return ['All', 'Custom Key', ...CHROMA_BG_CATEGORIES];
      case 'split':
        return ['All', 'Pick Clips', 'Divider', ...SPLIT_PRESET_CATEGORIES];
      case 'transitions':
        return ['All', ...TRANSITION_CATEGORIES];
      case 'effects':
        return ['All', ...EFFECT_CATEGORIES];
      case 'templates':
        return ['All', 'Trailer Packs', ...TEMPLATE_CATEGORIES];
      default:
        return ['All'];
    }
  }, [category.id, filterMode]);

  const activeSub = subCategories.includes(subCat) ? subCat : subCategories[0];

  const filteredMedia = useMemo(() => {
    return props.mediaGallery.filter((m) => !q || m.title.toLowerCase().includes(q));
  }, [props.mediaGallery, q]);

  const filteredMediaMotions = useMemo(() => {
    return MEDIA_MOTION_LIST.filter((m) => {
      if (activeSub !== 'All' && activeSub !== 'Gallery' && m.category !== activeSub) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeSub, q]);

  const filteredFilters = useMemo(() => {
    return FILTERS_LIST.filter((f) => {
      if (activeSub !== 'All' && f.category !== activeSub) return false;
      if (q && !f.name.toLowerCase().includes(q) && !f.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeSub, q]);

  const filteredColorGrades = useMemo(() => {
    return COLOR_GRADES_LIST.filter((c) => {
      if (activeSub !== 'All' && c.category !== activeSub) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeSub, q]);

  const filteredAudio = useMemo(() => {
    const library = category.id === 'music' ? MUSIC_BGM_LIST : SFX_FOLEY_LIST;
    const combined = [...props.userAudioLibrary, ...library];
    return combined.filter((a) => {
      if (activeSub === 'My Audio') {
        if (!props.userAudioLibrary.some((u) => u.id === a.id)) return false;
      } else if (activeSub !== 'All') {
        if (a.category !== activeSub) return false;
      }
      if (
        q &&
        !a.title.toLowerCase().includes(q) &&
        !a.mood.toLowerCase().includes(q) &&
        !a.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [category.id, props.userAudioLibrary, activeSub, q]);

  const filteredDialogues = useMemo(() => {
    return DIALOGUE_PRESETS_LIST.filter((d) => {
      if (activeSub !== 'All' && activeSub !== 'Custom Line' && d.category !== activeSub) return false;
      if (
        q &&
        !d.name.toLowerCase().includes(q) &&
        !d.line.toLowerCase().includes(q) &&
        !d.speaker.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [activeSub, q]);

  const filteredTitles = useMemo(() => {
    return TITLES_LIST.filter((t) => {
      if (
        activeSub !== 'All' &&
        activeSub !== 'Custom Text' &&
        activeSub !== 'Animation' &&
        t.category !== activeSub
      ) {
        return false;
      }
      if (
        q &&
        !t.name.toLowerCase().includes(q) &&
        !t.titleText.toLowerCase().includes(q) &&
        !t.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [activeSub, q]);

  const filteredStickers = useMemo(() => {
    return STICKERS_LIST.filter((s) => {
      if (activeSub !== 'All' && s.category !== activeSub) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeSub, q]);

  const filteredVfx = useMemo(() => {
    return VFX_LIST.filter((v) => {
      if (activeSub !== 'All' && v.category !== activeSub) return false;
      if (q && !v.name.toLowerCase().includes(q) && !v.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeSub, q]);

  const filteredCards = useMemo(() => {
    return TRAILER_CARDS_LIST.filter((c) => {
      if (activeSub !== 'All' && activeSub !== 'Custom Card' && c.category !== activeSub) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeSub, q]);

  const filteredChroma = useMemo(() => {
    return CHROMA_BACKGROUNDS_LIST.filter((c) => {
      if (activeSub !== 'All' && activeSub !== 'Custom Key' && c.category !== activeSub) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeSub, q]);

  const filteredSplit = useMemo(() => {
    return SPLIT_PRESETS_LIST.filter((s) => {
      if (
        activeSub !== 'All' &&
        activeSub !== 'Pick Clips' &&
        activeSub !== 'Divider' &&
        s.category !== activeSub
      ) {
        return false;
      }
      if (q && !s.name.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeSub, q]);

  const filteredTransitions = useMemo(() => {
    return TRANSITIONS_LIST.filter((tr) => {
      if (activeSub !== 'All' && tr.category !== activeSub) return false;
      if (q && !tr.name.toLowerCase().includes(q) && !tr.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeSub, q]);

  const filteredEffects = useMemo(() => {
    return EFFECTS_LIST.filter((fx) => {
      if (activeSub !== 'All' && fx.category !== activeSub) return false;
      if (q && !fx.name.toLowerCase().includes(q) && !fx.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeSub, q]);

  const filteredTemplates = useMemo(() => {
    return TEMPLATES_LIST.filter((tm) => {
      if (activeSub !== 'All' && activeSub !== 'Trailer Packs' && tm.category !== activeSub) return false;
      if (
        q &&
        !tm.title.toLowerCase().includes(q) &&
        !tm.category.toLowerCase().includes(q) &&
        !tm.movieTitle.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [activeSub, q]);

  return (
    <aside className="w-[224px] sm:w-[272px] md:w-[300px] shrink-0 h-full bg-[#0b0f16] border-l border-zinc-800/90 flex flex-col overflow-hidden z-20">
      {/* TOP HEADER: Back button + Active Feature Title + ON/OFF or Pick Media */}
      <div className="h-9 px-2 border-b border-zinc-800/90 bg-[#10151f] flex items-center justify-between gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="h-7 px-2 rounded-lg bg-[#1a2230] hover:bg-[#232d40] border border-zinc-700/70 text-zinc-100 flex items-center gap-0.5 text-[10.5px] font-bold cursor-pointer shrink-0 whitespace-nowrap"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Close</span>
        </button>

        <span
          className="text-[11px] font-bold truncate"
          style={{ color: isMutedOrOff ? '#71717a' : category.accentHex }}
        >
          {category.label}
        </span>

        {category.id !== 'video' ? (
          <button
            type="button"
            onClick={onToggleMuteOrOff}
            className={`h-7 px-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap transition-colors ${
              isMutedOrOff
                ? 'bg-red-950/60 border-red-500/50 text-red-300'
                : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
            }`}
            title={isMutedOrOff ? 'Turn Feature ON' : 'Mute / Turn Feature OFF'}
          >
            <Power className="w-3 h-3" />
            <span>{isMutedOrOff ? 'OFF' : 'ON'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={props.onTriggerUploadMedia}
            className="h-7 px-2 rounded-lg bg-teal-400 text-black text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            <span>Pick</span>
          </button>
        )}
      </div>

      {/* Filters vs Color Grading segmented toggle */}
      {category.id === 'filters' && (
        <div className="px-2 py-1 border-b border-zinc-800/70 bg-[#0d121a] flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setFilterMode('filters');
              setSubCat('All');
              setRenderLimit(PAGE_SIZE);
            }}
            className={`flex-1 py-1 rounded-md text-[10px] font-bold cursor-pointer whitespace-nowrap ${
              filterMode === 'filters' ? 'bg-cyan-400 text-black' : 'bg-[#151c27] text-zinc-300'
            }`}
          >
            1,300 Filters
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterMode('grading');
              setSubCat('All');
              setRenderLimit(PAGE_SIZE);
            }}
            className={`flex-1 py-1 rounded-md text-[10px] font-bold cursor-pointer whitespace-nowrap ${
              filterMode === 'grading' ? 'bg-amber-400 text-black' : 'bg-[#151c27] text-zinc-300'
            }`}
          >
            1,260 Grades
          </button>
        </div>
      )}

      {/* TWO-COLUMN BODY: Left Category Tabs + Right Search & Paginated Items */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="w-[88px] sm:w-[100px] shrink-0 border-r border-zinc-800/80 bg-[#0d1118] overflow-y-auto p-1 space-y-1">
          {subCategories.map((sc) => {
            const active = activeSub === sc;
            return (
              <button
                key={sc}
                type="button"
                onClick={() => {
                  setSubCat(sc);
                  setRenderLimit(PAGE_SIZE);
                }}
                className={`w-full px-1.5 py-1.5 rounded-lg text-left text-[9.5px] font-semibold truncate cursor-pointer transition-colors ${
                  active
                    ? 'bg-teal-400/20 text-teal-200 border border-teal-400/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161c26]'
                }`}
              >
                {sc}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#0a0d13]">
          <div className="p-1.5 border-b border-zinc-800/70 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3 h-3 text-zinc-500 absolute left-2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setRenderLimit(PAGE_SIZE);
                }}
                placeholder={`Search ${category.shortLabel}...`}
                className="w-full h-7 pl-6 pr-2 rounded-lg bg-[#131924] border border-zinc-800 text-[10.5px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-teal-400/60"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1.5">
            {/* 1. MEDIA + 1,260 MOTION / SPEED / FRAMING PRESETS */}
            {category.id === 'video' && (
              <>
                <button
                  type="button"
                  onClick={props.onTriggerUploadMedia}
                  className="w-full py-1.5 px-2 rounded-lg bg-teal-400/15 hover:bg-teal-400/25 border border-teal-400/50 text-teal-200 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pick Video / Photo from Device</span>
                </button>

                {filteredMedia.length > 0 && (activeSub === 'All' || activeSub === 'Gallery') && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {filteredMedia.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => props.onAddMediaToTimeline(m)}
                        className="rounded-lg overflow-hidden border border-zinc-800 hover:border-teal-400 bg-[#121822] text-left cursor-pointer"
                      >
                        <div className="aspect-video bg-black relative">
                          {m.thumbnailUrl || m.type === 'photo' ? (
                            <img
                              src={m.thumbnailUrl || m.url}
                              alt={m.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Film className="w-4 h-4" />
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[8px] font-mono text-zinc-200 tabular-nums">
                            {m.duration}
                          </span>
                        </div>
                        <div className="px-1.5 py-1 flex items-center gap-1">
                          {m.type === 'video' ? (
                            <Film className="w-2.5 h-2.5 text-teal-400 shrink-0" />
                          ) : (
                            <ImageIcon className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          )}
                          <span className="text-[9px] text-zinc-200 truncate">{m.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeSub !== 'Gallery' && (
                  <>
                    <button
                      type="button"
                      onClick={() => props.onApplyMediaMotionPreset(null)}
                      className="w-full py-1 rounded-lg border border-zinc-800 bg-[#161b24] text-zinc-300 text-[9.5px] font-semibold cursor-pointer"
                    >
                      Reset Motion & Speed (1.0x)
                    </button>
                    <div className="space-y-1">
                      {filteredMediaMotions.slice(0, renderLimit).map((mm) => {
                        const active = props.activeMotionPresetId === mm.id;
                        return (
                          <button
                            key={mm.id}
                            type="button"
                            onClick={() => props.onApplyMediaMotionPreset(mm)}
                            className={`w-full p-1.5 rounded-lg border text-left cursor-pointer ${
                              active
                                ? 'border-teal-400 bg-teal-950/30 text-white'
                                : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-600'
                            }`}
                          >
                            <div className="text-[10px] font-semibold truncate">{mm.name}</div>
                            <div className="text-[8.5px] text-zinc-400 truncate">
                              {mm.category} · {mm.speed}x · {Math.round(mm.zoomScale * 100)}%
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {filteredMediaMotions.length > renderLimit && (
                      <button
                        type="button"
                        onClick={() => setRenderLimit((n) => n + 100)}
                        className="w-full py-1.5 rounded-lg bg-[#161e2b] text-teal-300 text-[10px] font-bold cursor-pointer"
                      >
                        Load More ({filteredMediaMotions.length - renderLimit} left)
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* 2. FILTERS & COLOR GRADES */}
            {category.id === 'filters' && filterMode === 'filters' && (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {filteredFilters.slice(0, renderLimit).map((f) => {
                    const active = props.activeFilter.id === f.id && !isMutedOrOff;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => props.onSelectFilter(f)}
                        className={`rounded-lg overflow-hidden border text-left cursor-pointer transition-all ${
                          active
                            ? 'border-cyan-400 ring-1 ring-cyan-400/60 bg-[#152230]'
                            : 'border-zinc-800 bg-[#121721] hover:border-zinc-600'
                        }`}
                      >
                        <div className="h-11 w-full bg-black relative overflow-hidden">
                          <img
                            src={f.thumbnail}
                            alt={f.name}
                            style={{ filter: f.cssFilter }}
                            className="w-full h-full object-cover"
                          />
                          {active && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="p-1">
                          <div className="text-[9px] font-semibold text-zinc-100 truncate">{f.name}</div>
                          <div className="text-[8px] text-zinc-500 truncate">{f.category}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {filteredFilters.length > renderLimit && (
                  <button
                    type="button"
                    onClick={() => setRenderLimit((n) => n + 100)}
                    className="w-full py-1.5 rounded-lg bg-[#161e2b] text-cyan-300 text-[10px] font-bold cursor-pointer"
                  >
                    Load More ({filteredFilters.length - renderLimit} left)
                  </button>
                )}
              </>
            )}

            {category.id === 'filters' && filterMode === 'grading' && (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {filteredColorGrades.slice(0, renderLimit).map((cg) => {
                    const active = props.activeColorGradeId === cg.id && !isMutedOrOff;
                    return (
                      <button
                        key={cg.id}
                        type="button"
                        onClick={() => props.onSelectColorGrade(active ? null : cg)}
                        className={`rounded-lg p-1.5 border text-left cursor-pointer ${
                          active
                            ? 'border-amber-400 bg-[#231d12]'
                            : 'border-zinc-800 bg-[#121721] hover:border-zinc-600'
                        }`}
                      >
                        <div className={`h-6 rounded mb-1 bg-gradient-to-r ${cg.swatchGradient}`} />
                        <div className="text-[9px] font-semibold text-zinc-100 truncate">{cg.name}</div>
                        <div className="text-[8px] text-zinc-500 truncate">{cg.category}</div>
                      </button>
                    );
                  })}
                </div>
                {filteredColorGrades.length > renderLimit && (
                  <button
                    type="button"
                    onClick={() => setRenderLimit((n) => n + 100)}
                    className="w-full py-1.5 rounded-lg bg-[#161e2b] text-amber-300 text-[10px] font-bold cursor-pointer"
                  >
                    Load More ({filteredColorGrades.length - renderLimit} left)
                  </button>
                )}
              </>
            )}

            {/* 3 & 4. AUDIO SFX (1,350) & MUSIC BGM (1,350) */}
            {(category.id === 'audio' || category.id === 'music') && (
              <>
                <button
                  type="button"
                  onClick={props.onTriggerUploadAudio}
                  className="w-full py-1.5 px-2 rounded-lg bg-emerald-400/15 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Add Audio / Song from Device</span>
                </button>
                <div className="space-y-1">
                  {filteredAudio.slice(0, renderLimit).map((a) => {
                    const active = props.activeAudio.id === a.id && !isMutedOrOff;
                    const playing = props.previewingAudioId === a.id;
                    return (
                      <div
                        key={a.id}
                        className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                          active ? 'border-emerald-400 bg-emerald-950/30' : 'border-zinc-800 bg-[#121721]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => props.onSelectAudio(a)}
                          className="flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <div className="text-[10px] font-semibold text-zinc-100 truncate">{a.title}</div>
                          <div className="text-[8.5px] text-zinc-400 truncate">
                            {a.category} · {a.duration}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => props.onToggleAudioPreview(a)}
                          className="w-7 h-7 rounded-md bg-[#1a2230] text-emerald-300 flex items-center justify-center shrink-0 cursor-pointer"
                          title="Preview audio"
                        >
                          {playing ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {filteredAudio.length > renderLimit && (
                  <button
                    type="button"
                    onClick={() => setRenderLimit((n) => n + 120)}
                    className="w-full py-1.5 rounded-lg bg-[#161e2b] text-emerald-300 text-[10px] font-bold cursor-pointer"
                  >
                    Load More ({filteredAudio.length - renderLimit} left)
                  </button>
                )}
              </>
            )}

            {/* 5. DIALOGUES (1,260 PRESETS + CUSTOM WRITER) */}
            {category.id === 'dialogues' && (
              <div className="space-y-2">
                {activeSub === 'Custom Line' ? (
                  <div className="space-y-1.5 p-1">
                    <input
                      type="text"
                      value={props.dialogueSpeaker}
                      onChange={(e) => props.onChangeDialogueSpeaker(e.target.value)}
                      placeholder="Speaker (e.g. Hero)"
                      className="w-full h-7 px-2 rounded-lg bg-[#131924] border border-zinc-800 text-[10.5px] text-white"
                    />
                    <textarea
                      rows={2}
                      value={props.dialogueText}
                      onChange={(e) => props.onChangeDialogueText(e.target.value)}
                      placeholder="Dialogue line..."
                      className="w-full p-2 rounded-lg bg-[#131924] border border-zinc-800 text-[10.5px] text-white resize-none"
                    />
                    <div className="flex items-center justify-between text-[10px] text-zinc-300">
                      <span>Duration</span>
                      <span className="font-mono tabular-nums">{props.dialogueDur}s</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={20}
                      value={props.dialogueDur}
                      onChange={(e) => props.onChangeDialogueDur(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <button
                      type="button"
                      onClick={props.onApplyDialogue}
                      className="w-full py-2 rounded-lg bg-amber-400 text-black text-[10.5px] font-extrabold cursor-pointer"
                    >
                      Apply Dialogue to Timeline
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredDialogues.slice(0, renderLimit).map((dl) => {
                      const active = props.activeDialoguePresetId === dl.id && !isMutedOrOff;
                      return (
                        <button
                          key={dl.id}
                          type="button"
                          onClick={() => props.onApplyDialoguePreset(dl)}
                          className={`w-full p-1.5 rounded-lg border text-left cursor-pointer ${
                            active
                              ? 'border-amber-400 bg-amber-950/30 text-white'
                              : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-amber-400/60'
                          }`}
                        >
                          <div className="text-[10px] font-bold truncate">{dl.name}</div>
                          <div className="text-[8.5px] text-zinc-300 truncate">{dl.line}</div>
                          <div className="text-[8px] text-zinc-500 truncate">
                            {dl.category} · {dl.durationSec}s
                          </div>
                        </button>
                      );
                    })}
                    {filteredDialogues.length > renderLimit && (
                      <button
                        type="button"
                        onClick={() => setRenderLimit((n) => n + 100)}
                        className="w-full py-1.5 rounded-lg bg-[#161e2b] text-amber-300 text-[10px] font-bold cursor-pointer"
                      >
                        Load More ({filteredDialogues.length - renderLimit} left)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 6. TITLES (1,280 PRESETS + CUSTOM + ANIMATION) */}
            {category.id === 'titles' && (
              <div className="space-y-2">
                {activeSub === 'Custom Text' ? (
                  <div className="space-y-1.5 p-1">
                    <input
                      type="text"
                      value={props.movieTitle}
                      onChange={(e) => props.onUpdateTitleText(e.target.value, props.subtitle)}
                      placeholder="Main Title"
                      className="w-full h-7 px-2 rounded-lg bg-[#131924] border border-zinc-800 text-[10.5px] text-white"
                    />
                    <input
                      type="text"
                      value={props.subtitle}
                      onChange={(e) => props.onUpdateTitleText(props.movieTitle, e.target.value)}
                      placeholder="Subtitle"
                      className="w-full h-7 px-2 rounded-lg bg-[#131924] border border-zinc-800 text-[10.5px] text-white"
                    />
                  </div>
                ) : activeSub === 'Animation' ? (
                  <div className="space-y-1.5">
                    {TRAILER_TITLE_ANIMATIONS.map((an) => (
                      <button
                        key={an.id}
                        type="button"
                        onClick={() => props.onChangeTitleAnim(an.id)}
                        className={`w-full p-1.5 rounded-lg border text-left cursor-pointer ${
                          props.titleAnimType === an.id
                            ? 'border-amber-400 bg-amber-950/30 text-white'
                            : 'border-zinc-800 bg-[#121721] text-zinc-300'
                        }`}
                      >
                        <div className="text-[10px] font-bold">{an.name}</div>
                        <div className="text-[8.5px] text-zinc-400 truncate">{an.desc}</div>
                      </button>
                    ))}
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {TRAILER_TITLE_THEMES.map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => props.onChangeTitleTheme(th.id)}
                          className={`p-1.5 rounded-lg border text-[9px] font-semibold cursor-pointer ${
                            props.titleThemeType === th.id
                              ? 'border-amber-400 text-white bg-[#1f2633]'
                              : 'border-zinc-800 text-zinc-300 bg-[#121721]'
                          }`}
                        >
                          {th.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredTitles.slice(0, renderLimit).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => props.onApplyTitlePreset(t)}
                        className="w-full p-1.5 rounded-lg border border-zinc-800 hover:border-amber-400 bg-[#121721] text-left cursor-pointer"
                      >
                        <div className="text-[10px] font-bold text-zinc-100 truncate">{t.name}</div>
                        <div className="text-[8.5px] text-zinc-400 truncate">
                          {t.category} · {t.subtitleText}
                        </div>
                      </button>
                    ))}
                    {filteredTitles.length > renderLimit && (
                      <button
                        type="button"
                        onClick={() => setRenderLimit((n) => n + 120)}
                        className="w-full py-1.5 rounded-lg bg-[#161e2b] text-amber-300 text-[10px] font-bold cursor-pointer"
                      >
                        Load More ({filteredTitles.length - renderLimit} left)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 7. STICKERS (1,280) */}
            {category.id === 'stickers' && (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  {filteredStickers.slice(0, renderLimit).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => props.onAddSticker(s)}
                      className="p-1.5 rounded-lg border border-zinc-800 hover:border-sky-400 bg-[#121721] flex flex-col items-center gap-0.5 cursor-pointer"
                    >
                      <span className="text-lg leading-none">{s.emoji}</span>
                      <span className="text-[8px] text-zinc-300 truncate w-full text-center">
                        {s.name}
                      </span>
                    </button>
                  ))}
                </div>
                {filteredStickers.length > renderLimit && (
                  <button
                    type="button"
                    onClick={() => setRenderLimit((n) => n + 120)}
                    className="w-full py-1.5 rounded-lg bg-[#161e2b] text-sky-300 text-[10px] font-bold cursor-pointer"
                  >
                    Load More ({filteredStickers.length - renderLimit} left)
                  </button>
                )}
              </>
            )}

            {/* 8. ACTION VFX (1,280) */}
            {category.id === 'vfx' && (
              <div className="space-y-1">
                {filteredVfx.slice(0, renderLimit).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => props.onAddVfx(v)}
                    className="w-full p-1.5 rounded-lg border border-zinc-800 hover:border-rose-400 bg-[#121721] flex items-center gap-2 text-left cursor-pointer"
                  >
                    <span className="text-base shrink-0">{v.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold text-zinc-100 truncate">{v.name}</div>
                      <div className="text-[8.5px] text-zinc-400 truncate">{v.category}</div>
                    </div>
                  </button>
                ))}
                {filteredVfx.length > renderLimit && (
                  <button
                    type="button"
                    onClick={() => setRenderLimit((n) => n + 120)}
                    className="w-full py-1.5 rounded-lg bg-[#161e2b] text-rose-300 text-[10px] font-bold cursor-pointer"
                  >
                    Load More ({filteredVfx.length - renderLimit} left)
                  </button>
                )}
              </div>
            )}

            {/* 9. TRAILER CARDS & FRAMES (1,260 PRESETS + DESIGNER) */}
            {category.id === 'card' && (
              <div className="space-y-2">
                {activeSub === 'Custom Card' ? (
                  <div className="space-y-2 p-1">
                    <input
                      type="text"
                      value={props.draftCardTitle}
                      onChange={(e) => props.onChangeDraftCardTitle(e.target.value)}
                      placeholder="Card Title"
                      className="w-full h-7 px-2 rounded-lg bg-[#131924] border border-zinc-800 text-[10.5px] text-white"
                    />
                    <input
                      type="text"
                      value={props.draftCardSubtitle}
                      onChange={(e) => props.onChangeDraftCardSubtitle(e.target.value)}
                      placeholder="Card Subtitle"
                      className="w-full h-7 px-2 rounded-lg bg-[#131924] border border-zinc-800 text-[10.5px] text-white"
                    />
                    <div className="grid grid-cols-2 gap-1">
                      {TRAILER_CARD_THEMES.map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => props.onChangeDraftCardTheme(th.id)}
                          className={`p-1 rounded border text-[9px] font-semibold cursor-pointer ${
                            props.draftCardTheme === th.id
                              ? 'border-amber-400 text-white bg-[#231d12]'
                              : 'border-zinc-800 text-zinc-300 bg-[#121721]'
                          }`}
                        >
                          {th.name}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {TRAILER_CARD_ANIMATIONS.map((an) => (
                        <button
                          key={an.id}
                          type="button"
                          onClick={() => props.onChangeDraftCardAnim(an.id)}
                          className={`p-1 rounded border text-[9px] font-semibold cursor-pointer ${
                            props.draftCardAnim === an.id
                              ? 'border-teal-400 text-white bg-[#132429]'
                              : 'border-zinc-800 text-zinc-300 bg-[#121721]'
                          }`}
                        >
                          {an.name}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={props.onPickTrailerCardMedia}
                        className="py-1.5 rounded-lg bg-[#18202c] border border-zinc-700 text-zinc-200 text-[10px] font-semibold cursor-pointer"
                      >
                        Pick Poster Media
                      </button>
                      <button
                        type="button"
                        onClick={props.onAddTrailerCard}
                        className="py-1.5 rounded-lg bg-amber-400 text-black text-[10px] font-extrabold cursor-pointer"
                      >
                        + Add Card
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredCards.slice(0, renderLimit).map((card) => {
                      const active = props.activeCardPresetId === card.id && !isMutedOrOff;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => props.onApplyTrailerCardPreset(card)}
                          className={`w-full p-1.5 rounded-lg border text-left cursor-pointer ${
                            active
                              ? 'border-amber-400 bg-amber-950/30 text-white'
                              : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-amber-400/60'
                          }`}
                        >
                          <div className="text-[10px] font-bold truncate">{card.name}</div>
                          <div className="text-[8.5px] text-zinc-400 truncate">
                            {card.category} · {card.durationSec}s
                          </div>
                        </button>
                      );
                    })}
                    {filteredCards.length > renderLimit && (
                      <button
                        type="button"
                        onClick={() => setRenderLimit((n) => n + 100)}
                        className="w-full py-1.5 rounded-lg bg-[#161e2b] text-amber-300 text-[10px] font-bold cursor-pointer"
                      >
                        Load More ({filteredCards.length - renderLimit} left)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 10. CHROMA KEY & BACKGROUNDS (1,260 PRESETS + CUSTOM KEY) */}
            {category.id === 'chroma' && (
              <div className="space-y-2">
                {activeSub === 'Custom Key' ? (
                  <div className="space-y-2 p-1">
                    <button
                      type="button"
                      onClick={() => props.onUpdateChromaConfig((p) => ({ ...p, enabled: !p.enabled }))}
                      className={`w-full py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                        props.chromaConfig.enabled
                          ? 'bg-emerald-400 text-black border-emerald-200'
                          : 'bg-[#141a24] text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {props.chromaConfig.enabled ? 'Chroma Key Active' : 'Enable Chroma Key'}
                    </button>
                    <div className="grid grid-cols-2 gap-1">
                      {(['green', 'neon_green', 'blue', 'cyan'] as ChromaKeyColorPreset[]).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            props.onUpdateChromaConfig((p) => ({ ...p, enabled: true, colorPreset: preset }))
                          }
                          className={`py-1.5 rounded-lg border text-[9.5px] font-semibold capitalize cursor-pointer ${
                            props.chromaConfig.colorPreset === preset
                              ? 'border-emerald-400 bg-emerald-950/40 text-white'
                              : 'border-zinc-800 bg-[#121721] text-zinc-300'
                          }`}
                        >
                          {preset.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {(['studio_teal', 'sunset_gold', 'cyber_grid', 'black'] as ChromaBgMode[]).map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => props.onUpdateChromaConfig((p) => ({ ...p, enabled: true, bgMode: bg }))}
                          className={`py-1.5 rounded-lg border text-[9px] font-semibold capitalize cursor-pointer ${
                            props.chromaConfig.bgMode === bg
                              ? 'border-teal-400 bg-teal-950/40 text-white'
                              : 'border-zinc-800 bg-[#121721] text-zinc-300'
                          }`}
                        >
                          {bg.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={props.onPickChromaBg}
                      className="w-full py-1.5 rounded-lg bg-[#161e2b] border border-zinc-700 text-zinc-200 text-[10px] font-semibold cursor-pointer"
                    >
                      Pick Custom Background Photo/Video
                    </button>
                    <div className="space-y-1 text-[9.5px] text-zinc-300">
                      <div className="flex justify-between">
                        <span>Similarity</span>
                        <span className="font-mono">{props.chromaConfig.similarity}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={90}
                        value={props.chromaConfig.similarity}
                        onChange={(e) =>
                          props.onUpdateChromaConfig((p) => ({
                            ...p,
                            enabled: true,
                            similarity: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-emerald-400"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={props.onPickChromaBg}
                      className="w-full py-1.5 rounded-lg bg-emerald-400/15 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold cursor-pointer"
                    >
                      + Custom Background Photo/Video
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                      {filteredChroma.slice(0, renderLimit).map((ch) => {
                        const active = props.activeChromaPresetId === ch.id && props.chromaConfig.enabled;
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => props.onApplyChromaPreset(ch)}
                            className={`rounded-lg p-1.5 border text-left cursor-pointer ${
                              active
                                ? 'border-emerald-400 bg-emerald-950/35'
                                : 'border-zinc-800 bg-[#121721] hover:border-zinc-600'
                            }`}
                          >
                            <div className={`h-6 rounded mb-1 bg-gradient-to-r ${ch.swatchClass}`} />
                            <div className="text-[9px] font-semibold text-zinc-100 truncate">{ch.name}</div>
                            <div className="text-[8px] text-zinc-500 truncate">{ch.category}</div>
                          </button>
                        );
                      })}
                    </div>
                    {filteredChroma.length > renderLimit && (
                      <button
                        type="button"
                        onClick={() => setRenderLimit((n) => n + 100)}
                        className="w-full py-1.5 rounded-lg bg-[#161e2b] text-emerald-300 text-[10px] font-bold cursor-pointer"
                      >
                        Load More ({filteredChroma.length - renderLimit} left)
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 11. SPLIT SCREEN & COLLAGE (1,260 PRESETS + PICK CLIPS + DIVIDER) */}
            {category.id === 'split' && (
              <div className="space-y-2">
                {activeSub === 'Pick Clips' ? (
                  <div className="space-y-1.5 p-1">
                    <button
                      type="button"
                      onClick={props.onAutoJoinSplitClips}
                      className="w-full py-1.5 rounded-lg bg-cyan-400/20 border border-cyan-400/50 text-cyan-200 text-[10px] font-bold cursor-pointer"
                    >
                      Auto-Join First 2 Clips
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => props.onPickSplitSide('left')}
                        className="py-1.5 rounded-lg bg-[#141a24] border border-teal-500/40 text-teal-300 text-[9.5px] font-bold cursor-pointer"
                      >
                        + Side 1
                      </button>
                      <button
                        type="button"
                        onClick={() => props.onPickSplitSide('right')}
                        className="py-1.5 rounded-lg bg-[#141a24] border border-amber-500/40 text-amber-300 text-[9.5px] font-bold cursor-pointer"
                      >
                        + Side 2
                      </button>
                    </div>
                  </div>
                ) : activeSub === 'Divider' ? (
                  <div className="space-y-2 p-1">
                    <div className="bg-[#141a24] p-2 rounded-lg border border-zinc-800 space-y-1">
                      <div className="flex justify-between text-[9.5px] text-zinc-300 font-semibold">
                        <span>Split Ratio</span>
                        <span className="font-mono text-cyan-300">{props.splitScreenConfig.splitRatio}%</span>
                      </div>
                      <input
                        type="range"
                        min={25}
                        max={75}
                        value={props.splitScreenConfig.splitRatio}
                        onChange={(e) =>
                          props.onUpdateSplitScreenConfig((p) => ({
                            ...p,
                            enabled: true,
                            splitRatio: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-cyan-400"
                      />
                    </div>
                    <div className="bg-[#141a24] p-2 rounded-lg border border-zinc-800 space-y-1">
                      <div className="flex justify-between text-[9.5px] text-zinc-300 font-semibold">
                        <span>Divider Gap</span>
                        <span className="font-mono text-cyan-300">{props.splitScreenConfig.gapPx}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={24}
                        value={props.splitScreenConfig.gapPx}
                        onChange={(e) =>
                          props.onUpdateSplitScreenConfig((p) => ({
                            ...p,
                            enabled: true,
                            gapPx: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        props.onUpdateSplitScreenConfig((p) => ({ ...p, enabled: !p.enabled }))
                      }
                      className={`w-full py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                        props.splitScreenConfig.enabled
                          ? 'bg-cyan-400 text-black border-cyan-200'
                          : 'bg-[#141a24] text-cyan-300 border-cyan-500/40'
                      }`}
                    >
                      {props.splitScreenConfig.enabled ? 'Split Screen ON' : 'Enable Split Screen'}
                    </button>
                    <div className="grid grid-cols-2 gap-1">
                      {(
                        [
                          { id: 'left_right', label: 'Left / Right' },
                          { id: 'top_bottom', label: 'Top / Bottom' },
                          { id: 'diagonal', label: 'Diagonal' },
                          { id: 'pip_bottom_right', label: 'PiP Corner' },
                          { id: 'dual_cards', label: 'Dual Cards' },
                          { id: 'mirror_twin', label: 'Mirror Twin' },
                        ] as Array<{ id: SplitLayoutType; label: string }>
                      ).map((lay) => (
                        <button
                          key={lay.id}
                          type="button"
                          onClick={() =>
                            props.onUpdateSplitScreenConfig((p) => ({
                              ...p,
                              enabled: true,
                              layout: lay.id,
                            }))
                          }
                          className={`p-1 rounded border text-[9px] font-semibold cursor-pointer ${
                            props.splitScreenConfig.enabled && props.splitScreenConfig.layout === lay.id
                              ? 'border-cyan-400 bg-cyan-950/40 text-white'
                              : 'border-zinc-800 bg-[#121721] text-zinc-300'
                          }`}
                        >
                          {lay.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1 pt-1">
                      {filteredSplit.slice(0, renderLimit).map((sp) => {
                        const active = props.activeSplitPresetId === sp.id && props.splitScreenConfig.enabled;
                        return (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => props.onApplySplitPreset(sp)}
                            className={`w-full p-1.5 rounded-lg border text-left cursor-pointer ${
                              active
                                ? 'border-cyan-400 bg-cyan-950/30 text-white'
                                : 'border-zinc-800 bg-[#121721] text-zinc-200'
                            }`}
                          >
                            <div className="text-[10px] font-semibold truncate">{sp.name}</div>
                            <div className="text-[8.5px] text-zinc-400 truncate">
                              {sp.category} · {sp.splitRatio}% / {sp.gapPx}px
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {filteredSplit.length > renderLimit && (
                      <button
                        type="button"
                        onClick={() => setRenderLimit((n) => n + 100)}
                        className="w-full py-1.5 rounded-lg bg-[#161e2b] text-cyan-300 text-[10px] font-bold cursor-pointer"
                      >
                        Load More ({filteredSplit.length - renderLimit} left)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 12. TRANSITIONS (1,280) */}
            {category.id === 'transitions' && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => props.onSelectTransition(null)}
                  className="w-full py-1 rounded-lg border border-zinc-800 bg-[#161b24] text-zinc-300 text-[9.5px] font-semibold cursor-pointer"
                >
                  Clear Seam Transition
                </button>
                {filteredTransitions.slice(0, renderLimit).map((tr) => {
                  const active = props.selectedTransitionId === tr.id && !isMutedOrOff;
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => props.onSelectTransition(active ? null : tr)}
                      className={`w-full p-1.5 rounded-lg border flex items-center justify-between text-left cursor-pointer ${
                        active ? 'border-amber-400 bg-amber-950/30 text-white' : 'border-zinc-800 bg-[#121721] text-zinc-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold truncate">{tr.name}</div>
                        <div className="text-[8px] text-zinc-400">
                          {tr.category} · {tr.durationSec}s
                        </div>
                      </div>
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    </button>
                  );
                })}
                {filteredTransitions.length > renderLimit && (
                  <button
                    type="button"
                    onClick={() => setRenderLimit((n) => n + 120)}
                    className="w-full py-1.5 rounded-lg bg-[#161e2b] text-amber-300 text-[10px] font-bold cursor-pointer"
                  >
                    Load More ({filteredTransitions.length - renderLimit} left)
                  </button>
                )}
              </div>
            )}

            {/* 13. VISUAL EFFECTS (1,280) */}
            {category.id === 'effects' && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => props.onSelectEffect(null)}
                  className="w-full py-1 rounded-lg border border-zinc-800 bg-[#161b24] text-zinc-300 text-[9.5px] font-semibold cursor-pointer"
                >
                  Clear Visual Effect
                </button>
                {filteredEffects.slice(0, renderLimit).map((fx) => {
                  const active = props.activeEffect?.id === fx.id && !isMutedOrOff;
                  return (
                    <button
                      key={fx.id}
                      type="button"
                      onClick={() => props.onSelectEffect(active ? null : fx)}
                      className={`w-full p-1.5 rounded-lg border text-left cursor-pointer ${
                        active ? 'border-purple-400 bg-purple-950/30 text-white' : 'border-zinc-800 bg-[#121721] text-zinc-200'
                      }`}
                    >
                      <div className="text-[10px] font-semibold truncate">{fx.name}</div>
                      <div className="text-[8px] text-zinc-400 truncate">{fx.category}</div>
                    </button>
                  );
                })}
                {filteredEffects.length > renderLimit && (
                  <button
                    type="button"
                    onClick={() => setRenderLimit((n) => n + 120)}
                    className="w-full py-1.5 rounded-lg bg-[#161e2b] text-purple-300 text-[10px] font-bold cursor-pointer"
                  >
                    Load More ({filteredEffects.length - renderLimit} left)
                  </button>
                )}
              </div>
            )}

            {/* 14. TEMPLATES (1,280 + TRAILER PACKS) */}
            {category.id === 'templates' && (
              <div className="space-y-1.5">
                {activeSub === 'Trailer Packs' ? (
                  TRAILER_PRESET_PACKS.map((pk) => (
                    <button
                      key={pk.id}
                      type="button"
                      onClick={() => props.onApplyTrailerPack(pk.id)}
                      className="w-full p-2 rounded-lg border border-zinc-800 hover:border-teal-400 bg-[#121721] text-left cursor-pointer"
                    >
                      <div className="text-[10px] font-bold text-white truncate">{pk.name}</div>
                      <div className="text-[8.5px] text-zinc-400 truncate">{pk.description}</div>
                    </button>
                  ))
                ) : (
                  <>
                    {filteredTemplates.slice(0, renderLimit).map((tm) => (
                      <button
                        key={tm.id}
                        type="button"
                        onClick={() => props.onApplyTemplate(tm)}
                        className={`w-full p-1.5 rounded-lg border text-left cursor-pointer ${
                          props.activeTemplateId === tm.id
                            ? 'border-teal-400 bg-teal-950/30'
                            : 'border-zinc-800 bg-[#121721]'
                        }`}
                      >
                        <div className="text-[10px] font-semibold text-white truncate">{tm.title}</div>
                        <div className="text-[8.5px] text-zinc-400 truncate">
                          {tm.category} · {tm.duration}
                        </div>
                      </button>
                    ))}
                    {filteredTemplates.length > renderLimit && (
                      <button
                        type="button"
                        onClick={() => setRenderLimit((n) => n + 120)}
                        className="w-full py-1.5 rounded-lg bg-[#161e2b] text-teal-300 text-[10px] font-bold cursor-pointer"
                      >
                        Load More ({filteredTemplates.length - renderLimit} left)
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
});
