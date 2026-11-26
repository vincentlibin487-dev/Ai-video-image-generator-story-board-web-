import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Play, Plus, Square } from 'lucide-react';
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

  // Optional unused context props kept for signature compatibility
  primaryClipThumbUrl?: string;
  secondaryClipThumbUrl?: string;
  activeColorGradeObj?: ColorGradePreset | null;
  activeMotionPresetObj?: MediaMotionPreset | null;
  activeDialogueObj?: { speaker: string; text: string } | null;
  activeCardPresetObj?: TrailerCardPresetItem | null;
  activeVfxObj?: CinemaVfxItem | null;
  activeStickerObj?: StickerItem | null;
}

const INITIAL_BOX_LIMIT = 60;

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

export const WheelFeatureDrawer: React.FC<WheelFeatureDrawerProps> = React.memo((props) => {
  const { category, categoryItems = [], isMutedOrOff } = props;
  const [renderLimit, setRenderLimit] = useState<number>(INITIAL_BOX_LIMIT);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setRenderLimit(INITIAL_BOX_LIMIT);
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

  // Dedicated Lyrics / Text Boxes Mode (e.g., 'music' with 100-150 songs, custom categories, or any category flagged hasLyricsBoxes)
  const isPureLyricsBoxesMode =
    category.id === 'music' ||
    Boolean(category.hasLyricsBoxes) ||
    category.isBuiltIn === false;

  if (isPureLyricsBoxesMode) {
    const visibleItems = dbItemsForCategory.slice(0, renderLimit);
    return (
      <div className="w-full h-full bg-[#090c12] border-t border-zinc-800/90 flex items-stretch overflow-x-auto overflow-y-hidden p-1.5 gap-2">
        {visibleItems.length === 0 ? (
          <div className="h-full min-w-[200px] rounded-lg border border-zinc-800 bg-[#121721] px-3 flex items-center justify-center text-[10.5px] text-zinc-400">
            No items added yet
          </div>
        ) : (
          visibleItems.map((item) => {
            const isCopied = copiedId === item.itemId;
            return (
              <div
                key={item.itemId}
                className="w-[215px] sm:w-[248px] shrink-0 h-full rounded-lg border border-zinc-800 bg-[#121721] hover:border-teal-400/50 p-2 flex flex-col justify-between gap-1"
              >
                <div className="flex items-center justify-between gap-1.5 shrink-0">
                  <span className="text-[10.5px] font-bold text-white truncate">
                    {item.title}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => void handleCopyItem(e, item)}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors ${
                      isCopied
                        ? 'bg-emerald-400 text-black'
                        : 'bg-teal-400/15 hover:bg-teal-400/30 border border-teal-400/40 text-teal-300'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-2.5 h-2.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-2.5 h-2.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto text-[10px] leading-snug text-zinc-300 whitespace-pre-wrap pr-0.5">
                  {item.lyrics || item.subtitle || item.title}
                </div>
              </div>
            );
          })
        )}

        {dbItemsForCategory.length > renderLimit && (
          <button
            type="button"
            onClick={() => setRenderLimit((n) => n + 60)}
            className="w-[96px] shrink-0 h-full rounded-lg border border-teal-500/40 bg-[#131b26] hover:bg-[#192434] text-teal-300 text-[10.5px] font-bold flex items-center justify-center cursor-pointer"
          >
            +{dbItemsForCategory.length - renderLimit} More
          </button>
        )}
      </div>
    );
  }

  // Clean, Compact 2-Row Horizontal Boxes Strip (NO headers, NO preview images, NO search, NO sub-tabs)
  const renderCustomDbBoxesPrefix = () =>
    dbItemsForCategory.map((item) => {
      const isCopied = copiedId === item.itemId;
      return (
        <div
          key={item.itemId}
          className="rounded-lg border border-zinc-800 bg-[#121721] px-2 py-1 flex flex-col justify-between text-left"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold text-white truncate">{item.title}</span>
            <button
              type="button"
              onClick={(e) => void handleCopyItem(e, item)}
              className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold shrink-0 cursor-pointer ${
                isCopied ? 'bg-emerald-400 text-black' : 'bg-zinc-800 text-teal-300'
              }`}
            >
              {isCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {item.lyrics && (
            <div className="text-[8.5px] text-zinc-400 truncate">{item.lyrics}</div>
          )}
        </div>
      );
    });

  return (
    <div className="w-full h-full bg-[#090c12] border-t border-zinc-800/90 overflow-x-auto overflow-y-hidden p-1.5">
      <div className="grid grid-rows-2 grid-flow-col auto-cols-[132px] sm:auto-cols-[148px] gap-1.5 h-full w-max">
        {renderCustomDbBoxesPrefix()}

        {/* 1. MEDIA / MOTION */}
        {category.id === 'video' && (
          <>
            <button
              type="button"
              onClick={props.onTriggerUploadMedia}
              className="rounded-lg border border-teal-500/50 bg-[#131d28] hover:bg-[#192736] px-2 py-1 flex items-center justify-center gap-1 text-[10px] font-bold text-teal-300 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Media</span>
            </button>
            {MEDIA_MOTION_LIST.slice(0, renderLimit).map((mm) => {
              const active = props.activeMotionPresetId === mm.id;
              return (
                <button
                  key={mm.id}
                  type="button"
                  onClick={() => props.onApplyMediaMotionPreset(active ? null : mm)}
                  className={`rounded-lg border px-2 py-1 flex flex-col justify-center text-left cursor-pointer ${
                    active
                      ? 'border-teal-400 bg-teal-950/40 text-white'
                      : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-[10px] font-semibold truncate">{mm.name}</div>
                  <div className="text-[8.5px] text-zinc-400 truncate">
                    {mm.speed}x · {mm.aspectRatio || 'Keep'}
                  </div>
                </button>
              );
            })}
            {MEDIA_MOTION_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-teal-300 cursor-pointer"
              >
                +{MEDIA_MOTION_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}

        {/* 2. AUDIO / SFX */}
        {category.id === 'audio' && (
          <>
            <button
              type="button"
              onClick={props.onTriggerUploadAudio}
              className="rounded-lg border border-emerald-500/50 bg-[#121f1c] hover:bg-[#172924] px-2 py-1 flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-300 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Audio</span>
            </button>
            {[...props.userAudioLibrary, ...SFX_FOLEY_LIST].slice(0, renderLimit).map((au) => {
              const active = props.activeAudio.id === au.id && !isMutedOrOff;
              const isPrev = props.previewingAudioId === au.id;
              return (
                <div
                  key={au.id}
                  onClick={() => props.onSelectAudio(au)}
                  className={`rounded-lg border px-2 py-1 flex items-center justify-between gap-1.5 cursor-pointer ${
                    active
                      ? 'border-emerald-400 bg-emerald-950/35 text-white'
                      : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold truncate">{au.title}</div>
                    <div className="text-[8.5px] text-zinc-400 truncate">{au.duration}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onToggleAudioPreview(au);
                    }}
                    className={`w-6 h-6 rounded flex items-center justify-center shrink-0 cursor-pointer ${
                      isPrev ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    {isPrev ? (
                      <Square className="w-2.5 h-2.5 fill-current" />
                    ) : (
                      <Play className="w-2.5 h-2.5 fill-current" />
                    )}
                  </button>
                </div>
              );
            })}
            {SFX_FOLEY_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-emerald-300 cursor-pointer"
              >
                +{SFX_FOLEY_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}

        {/* 3. FILTERS & COLOR GRADES (Clean simple boxes — NO header, NO images, NO tabs) */}
        {category.id === 'filters' && (
          <>
            {FILTERS_LIST.slice(0, renderLimit).map((f) => {
              const active = props.activeFilter.id === f.id && !isMutedOrOff;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => props.onSelectFilter(f)}
                  className={`rounded-lg border px-2 py-1 flex items-center gap-2 text-left cursor-pointer ${
                    active
                      ? 'border-cyan-400 bg-cyan-950/40 text-white'
                      : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20 bg-gradient-to-br from-amber-400 via-cyan-400 to-rose-500"
                    style={{ filter: f.cssFilter || 'none' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold truncate">{f.name}</div>
                    <div className="text-[8.5px] text-zinc-400 truncate">{f.category}</div>
                  </div>
                </button>
              );
            })}
            {COLOR_GRADES_LIST.slice(0, Math.max(0, renderLimit - 20)).map((cg) => {
              const active = props.activeColorGradeId === cg.id && !isMutedOrOff;
              return (
                <button
                  key={cg.id}
                  type="button"
                  onClick={() => props.onSelectColorGrade(active ? null : cg)}
                  className={`rounded-lg border px-2 py-1 flex items-center gap-2 text-left cursor-pointer ${
                    active
                      ? 'border-amber-400 bg-amber-950/35 text-white'
                      : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20"
                    style={{ background: cg.swatchGradient }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold truncate">{cg.name}</div>
                    <div className="text-[8.5px] text-zinc-400 truncate">{cg.category}</div>
                  </div>
                </button>
              );
            })}
            {FILTERS_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-cyan-300 cursor-pointer"
              >
                +{FILTERS_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}

        {/* 4. DIALOGUES */}
        {category.id === 'dialogues' && (
          <>
            {DIALOGUE_PRESETS_LIST.slice(0, renderLimit).map((dl) => {
              const active = props.activeDialoguePresetId === dl.id;
              return (
                <button
                  key={dl.id}
                  type="button"
                  onClick={() => props.onApplyDialoguePreset(dl)}
                  className={`rounded-lg border px-2 py-1 flex flex-col justify-center text-left cursor-pointer ${
                    active
                      ? 'border-amber-400 bg-amber-950/35 text-white'
                      : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-[9.5px] font-bold text-amber-300 truncate">{dl.speaker}</div>
                  <div className="text-[9px] text-zinc-200 truncate">{dl.line}</div>
                </button>
              );
            })}
            {DIALOGUE_PRESETS_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-amber-300 cursor-pointer"
              >
                +{DIALOGUE_PRESETS_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}

        {/* 5. TITLES */}
        {category.id === 'titles' && (
          <>
            {TITLES_LIST.slice(0, renderLimit).map((ti) => (
              <button
                key={ti.id}
                type="button"
                onClick={() => props.onApplyTitlePreset(ti)}
                className="rounded-lg border border-zinc-800 hover:border-amber-400 bg-[#121721] px-2 py-1 flex flex-col justify-center text-left cursor-pointer"
              >
                <div className="text-[10px] font-bold text-amber-200 truncate">{ti.titleText}</div>
                <div className="text-[8.5px] text-zinc-400 truncate">{ti.subtitleText}</div>
              </button>
            ))}
            {TITLES_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-amber-300 cursor-pointer"
              >
                +{TITLES_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}

        {/* 6. STICKERS */}
        {category.id === 'stickers' && (
          <>
            {STICKERS_LIST.slice(0, renderLimit).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => props.onAddSticker(st)}
                className="rounded-lg border border-zinc-800 hover:border-sky-400 bg-[#121721] px-2 py-1 flex items-center gap-2 text-left cursor-pointer"
              >
                <span className="text-lg leading-none shrink-0">{st.emoji}</span>
                <span className="text-[10px] font-semibold text-zinc-200 truncate">{st.name}</span>
              </button>
            ))}
            {STICKERS_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-sky-300 cursor-pointer"
              >
                +{STICKERS_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}

        {/* 7. VFX */}
        {category.id === 'vfx' && (
          <>
            {VFX_LIST.slice(0, renderLimit).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => props.onAddVfx(v)}
                className="rounded-lg border border-zinc-800 hover:border-rose-400 bg-[#121721] px-2 py-1 flex items-center gap-2 text-left cursor-pointer"
              >
                <span className="text-base leading-none shrink-0">{v.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold text-white truncate">{v.name}</div>
                  <div className="text-[8.5px] text-zinc-400 truncate">{v.category}</div>
                </div>
              </button>
            ))}
            {VFX_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-rose-300 cursor-pointer"
              >
                +{VFX_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}

        {/* 8. TRAILER CARDS */}
        {category.id === 'card' && (
          <>
            {TRAILER_CARDS_LIST.slice(0, renderLimit).map((cd) => {
              const active = props.activeCardPresetId === cd.id;
              return (
                <button
                  key={cd.id}
                  type="button"
                  onClick={() => props.onApplyTrailerCardPreset(cd)}
                  className={`rounded-lg border px-2 py-1 flex flex-col justify-center text-left cursor-pointer ${
                    active
                      ? 'border-amber-400 bg-amber-950/35 text-white'
                      : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-[10px] font-bold truncate">{cd.title}</div>
                  <div className="text-[8.5px] text-zinc-400 truncate">{cd.subtitle}</div>
                </button>
              );
            })}
            {TRAILER_CARDS_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-amber-300 cursor-pointer"
              >
                +{TRAILER_CARDS_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}

        {/* 9. CHROMA KEY */}
        {category.id === 'chroma' && (
          <>
            {CHROMA_BACKGROUNDS_LIST.slice(0, renderLimit).map((ch) => {
              const active = props.activeChromaPresetId === ch.id && props.chromaConfig.enabled;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => props.onApplyChromaPreset(ch)}
                  className={`rounded-lg border px-2 py-1 flex items-center gap-2 text-left cursor-pointer ${
                    active
                      ? 'border-emerald-400 bg-emerald-950/35 text-white'
                      : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded shrink-0 border border-white/20 ${ch.swatchClass}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold truncate">{ch.name}</div>
                    <div className="text-[8.5px] text-zinc-400 truncate">{ch.colorPreset}</div>
                  </div>
                </button>
              );
            })}
            {CHROMA_BACKGROUNDS_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-emerald-300 cursor-pointer"
              >
                +{CHROMA_BACKGROUNDS_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}

        {/* 10. SPLIT SCREEN */}
        {category.id === 'split' && (
          <>
            {SPLIT_PRESETS_LIST.slice(0, renderLimit).map((sp) => {
              const active = props.activeSplitPresetId === sp.id && props.splitScreenConfig.enabled;
              return (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => props.onApplySplitPreset(sp)}
                  className={`rounded-lg border px-2 py-1 flex flex-col justify-center text-left cursor-pointer ${
                    active
                      ? 'border-cyan-400 bg-cyan-950/35 text-white'
                      : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-[10px] font-semibold truncate">{sp.name}</div>
                  <div className="text-[8.5px] text-zinc-400 truncate">
                    {sp.layout.replace('_', ' ')} · {sp.splitRatio}%
                  </div>
                </button>
              );
            })}
            {SPLIT_PRESETS_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-cyan-300 cursor-pointer"
              >
                +{SPLIT_PRESETS_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}

        {/* 11. TRANSITIONS */}
        {category.id === 'transitions' && (
          <>
            {TRANSITIONS_LIST.slice(0, renderLimit).map((tr) => {
              const active = props.selectedTransitionId === tr.id && !isMutedOrOff;
              return (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => props.onSelectTransition(active ? null : tr)}
                  className={`rounded-lg border px-2 py-1 flex flex-col justify-center text-left cursor-pointer ${
                    active
                      ? 'border-amber-400 bg-amber-950/35 text-white'
                      : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-[10px] font-semibold truncate">{tr.name}</div>
                  <div className="text-[8.5px] text-zinc-400 truncate">
                    {tr.category} · {tr.durationSec}s
                  </div>
                </button>
              );
            })}
            {TRANSITIONS_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-amber-300 cursor-pointer"
              >
                +{TRANSITIONS_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}

        {/* 12. VISUAL EFFECTS */}
        {category.id === 'effects' && (
          <>
            {EFFECTS_LIST.slice(0, renderLimit).map((fx) => {
              const active = props.activeEffect?.id === fx.id && !isMutedOrOff;
              return (
                <button
                  key={fx.id}
                  type="button"
                  onClick={() => props.onSelectEffect(active ? null : fx)}
                  className={`rounded-lg border px-2 py-1 flex flex-col justify-center text-left cursor-pointer ${
                    active
                      ? 'border-purple-400 bg-purple-950/35 text-white'
                      : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-[10px] font-semibold truncate">{fx.name}</div>
                  <div className="text-[8.5px] text-zinc-400 truncate">{fx.category}</div>
                </button>
              );
            })}
            {EFFECTS_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-purple-300 cursor-pointer"
              >
                +{EFFECTS_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}

        {/* 13. TEMPLATES */}
        {category.id === 'templates' && (
          <>
            {TRAILER_PRESET_PACKS.map((pk) => (
              <button
                key={pk.id}
                type="button"
                onClick={() => props.onApplyTrailerPack(pk.id)}
                className="rounded-lg border border-zinc-800 hover:border-teal-400 bg-[#121721] px-2 py-1 flex flex-col justify-center text-left cursor-pointer"
              >
                <div className="text-[10px] font-bold text-amber-200 truncate">{pk.name}</div>
                <div className="text-[8.5px] text-zinc-400 truncate">{pk.title}</div>
              </button>
            ))}
            {TEMPLATES_LIST.slice(0, renderLimit).map((tm) => {
              const active = props.activeTemplateId === tm.id;
              return (
                <button
                  key={tm.id}
                  type="button"
                  onClick={() => props.onApplyTemplate(tm)}
                  className={`rounded-lg border px-2 py-1 flex flex-col justify-center text-left cursor-pointer ${
                    active
                      ? 'border-teal-400 bg-teal-950/35 text-white'
                      : 'border-zinc-800 bg-[#121721] text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-[10px] font-semibold truncate">{tm.title}</div>
                  <div className="text-[8.5px] text-zinc-400 truncate">
                    {tm.category} · {tm.duration}
                  </div>
                </button>
              );
            })}
            {TEMPLATES_LIST.length > renderLimit && (
              <button
                type="button"
                onClick={() => setRenderLimit((n) => n + 80)}
                className="rounded-lg border border-zinc-700 bg-[#151c28] text-[10px] font-bold text-teal-300 cursor-pointer"
              >
                +{TEMPLATES_LIST.length - renderLimit} More
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});
