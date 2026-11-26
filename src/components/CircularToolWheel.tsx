import React, { useEffect, useRef, useState } from 'react';
import {
  Video,
  Palette,
  Music,
  Volume2,
  Mic,
  Type,
  Smile,
  Flame,
  Clapperboard,
  Wand2,
  Split,
  SlidersHorizontal,
  Sparkles,
  Layers,
  Play,
  Pause,
  Upload,
  LayoutGrid,
  Sliders,
  RefreshCw,
  X,
  type LucideIcon,
} from 'lucide-react';

export type EditorToolTab =
  | 'Media'
  | 'Audio'
  | 'Titles'
  | 'VFX'
  | 'Transitions'
  | 'Effects'
  | 'Filters'
  | 'Stickers'
  | 'Templates'
  | 'ProFX'
  | 'Chroma'
  | 'Split'
  | 'Trailer';

export interface WheelCategoryItem {
  id: string;
  label: string;
  shortLabel: string;
  tab: EditorToolTab;
  subCategory?: string;
  trackNumber: number; // 1..N corresponding to timeline categories
  trackName: string;
  accentHex: string;
  icon: LucideIcon;
  isBuiltIn?: boolean;
  hasLyricsBoxes?: boolean;
  iconKey?: string;
}

// Group 1 (First 7 Categories): Core Media, Sound, Looks & Overlays
export const WHEEL_GROUP_1: WheelCategoryItem[] = [
  {
    id: 'video',
    label: 'Media / Video 1',
    shortLabel: 'Media',
    tab: 'Media',
    trackNumber: 2,
    trackName: 'Video 1',
    accentHex: '#2dd4bf',
    icon: Video,
  },
  {
    id: 'audio',
    label: 'Audio 1 (Clip)',
    shortLabel: 'Audio',
    tab: 'Audio',
    subCategory: 'All',
    trackNumber: 3,
    trackName: 'Audio 1',
    accentHex: '#34d399',
    icon: Volume2,
  },
  {
    id: 'filters',
    label: 'Filters & LUTs',
    shortLabel: 'Filters',
    tab: 'Filters',
    trackNumber: 4,
    trackName: 'Filters',
    accentHex: '#22d3ee',
    icon: Palette,
  },
  {
    id: 'music',
    label: 'Music Track',
    shortLabel: 'Music',
    tab: 'Audio',
    subCategory: 'Background Music',
    trackNumber: 5,
    trackName: 'Music',
    accentHex: '#14b8a6',
    icon: Music,
  },
  {
    id: 'dialogues',
    label: 'Dialogues / REC',
    shortLabel: 'REC',
    tab: 'Audio',
    subCategory: 'Dialogues',
    trackNumber: 6,
    trackName: 'Dialogues',
    accentHex: '#fbbf24',
    icon: Mic,
  },
  {
    id: 'titles',
    label: 'Titles & Text',
    shortLabel: 'Title',
    tab: 'Titles',
    trackNumber: 1,
    trackName: 'Title',
    accentHex: '#f59e0b',
    icon: Type,
  },
  {
    id: 'stickers',
    label: 'Emoji & Stickers',
    shortLabel: 'Emoji',
    tab: 'Stickers',
    trackNumber: 7,
    trackName: 'Emoji',
    accentHex: '#38bdf8',
    icon: Smile,
  },
];

// Group 2 (Remaining 7 Categories): VFX, Compositing & Finishing
export const WHEEL_GROUP_2: WheelCategoryItem[] = [
  {
    id: 'vfx',
    label: 'Action VFX',
    shortLabel: 'VFX',
    tab: 'VFX',
    trackNumber: 8,
    trackName: 'VFX',
    accentHex: '#fb7185',
    icon: Flame,
  },
  {
    id: 'card',
    label: 'Trailer Card',
    shortLabel: 'Card',
    tab: 'Trailer',
    trackNumber: 9,
    trackName: 'Card',
    accentHex: '#fbbf24',
    icon: Clapperboard,
  },
  {
    id: 'chroma',
    label: 'Chroma Key',
    shortLabel: 'Chroma',
    tab: 'Chroma',
    trackNumber: 10,
    trackName: 'Chroma',
    accentHex: '#10b981',
    icon: Wand2,
  },
  {
    id: 'split',
    label: 'Split Screen',
    shortLabel: 'Split',
    tab: 'Split',
    trackNumber: 11,
    trackName: 'Split',
    accentHex: '#06b6d4',
    icon: Split,
  },
  {
    id: 'transitions',
    label: 'Transitions',
    shortLabel: 'Trans',
    tab: 'Transitions',
    trackNumber: 12,
    trackName: 'Transitions',
    accentHex: '#f59e0b',
    icon: SlidersHorizontal,
  },
  {
    id: 'effects',
    label: 'Visual Effects',
    shortLabel: 'Effects',
    tab: 'Effects',
    trackNumber: 13,
    trackName: 'Effects',
    accentHex: '#c084fc',
    icon: Sparkles,
  },
  {
    id: 'templates',
    label: 'Templates',
    shortLabel: 'Tmpl',
    tab: 'Templates',
    trackNumber: 14,
    trackName: 'Templates',
    accentHex: '#2dd4bf',
    icon: Layers,
  },
];

// Combined 14 Categories (7 + 7)
export const WHEEL_CATEGORIES: WheelCategoryItem[] = [...WHEEL_GROUP_1, ...WHEEL_GROUP_2];

interface CircularToolWheelProps {
  categories?: WheelCategoryItem[];
  activeCategoryId: string;
  disabledCategoryIds?: string[];
  activeFeatureIds?: string[];
  onSelectCategory: (category: WheelCategoryItem, openDrawer?: boolean, fromWheelTap?: boolean) => void;
  onToggleCategoryMute?: (category: WheelCategoryItem) => void;
  isToolDrawerOpen: boolean;
  onToggleToolDrawer: () => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExport: () => void;
  aspectRatio?: string;
  compact?: boolean;
  drawerContent?: React.ReactNode;
}

export const CircularToolWheel: React.FC<CircularToolWheelProps> = React.memo(({
  categories = WHEEL_CATEGORIES,
  activeCategoryId,
  disabledCategoryIds = [],
  activeFeatureIds = [],
  onSelectCategory,
  onToggleCategoryMute,
  isToolDrawerOpen,
  onToggleToolDrawer,
  isInspectorOpen,
  onToggleInspector,
  isPlaying,
  onTogglePlay,
  onExport,
  aspectRatio = '16:9',
  compact = false,
  drawerContent,
}) => {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    lastAngle: number;
    accumDeg: number;
    movedPx: number;
    startX: number;
    startY: number;
  } | null>(null);

  const ITEMS_PER_PAGE = 7;
  const pageCount = Math.max(1, Math.ceil(categories.length / ITEMS_PER_PAGE));

  const [wheelPage, setWheelPage] = useState<number>(() => {
    const idx = categories.findIndex((c) => c.id === activeCategoryId);
    return idx >= 0 ? Math.floor(idx / ITEMS_PER_PAGE) : 0;
  });
  const [flipSpinDeg, setFlipSpinDeg] = useState<number>(0);
  const [visualTickAngle, setVisualTickAngle] = useState<number>(0);
  const prevActiveIdRef = useRef<string>(activeCategoryId);

  const safeWheelPage = Math.min(wheelPage, pageCount - 1);

  // Sync active wheel page automatically only when activeCategoryId changes programmatically
  useEffect(() => {
    if (prevActiveIdRef.current !== activeCategoryId) {
      prevActiveIdRef.current = activeCategoryId;
      const idx = categories.findIndex((c) => c.id === activeCategoryId);
      const targetPage = idx >= 0 ? Math.floor(idx / ITEMS_PER_PAGE) : 0;
      if (targetPage !== safeWheelPage) {
        setWheelPage(targetPage);
        setFlipSpinDeg((deg) => deg + 180);
      }
    }
  }, [activeCategoryId, categories, safeWheelPage]);

  const count = Math.max(1, categories.length);
  const rawIndex = categories.findIndex((c) => c.id === activeCategoryId);
  const activeIndex = rawIndex >= 0 ? rawIndex : 0;
  const activeCat = categories[activeIndex];

  const pageStart = safeWheelPage * ITEMS_PER_PAGE;
  const visibleGroupItems = categories.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const pageRangeStart = visibleGroupItems.length > 0 ? pageStart + 1 : 0;
  const pageRangeEnd = pageStart + visibleGroupItems.length;

  const stepBy = (delta: number, openDrawer = false) => {
    if (categories.length === 0) return;
    const nextIdx = (activeIndex + delta + count) % count;
    const target = categories[nextIdx];
    if (target) {
      onSelectCategory(target, openDrawer, false);
    }
  };

  const handleToggleWheelGroup = () => {
    if (pageCount <= 1) {
      setFlipSpinDeg((deg) => deg + 180);
      return;
    }
    setWheelPage((prev) => (prev + 1) % pageCount);
    setFlipSpinDeg((deg) => deg + 180);
  };

  const getAngleFromCenter = (clientX: number, clientY: number): number => {
    const el = wheelRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  };

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const angle = getAngleFromCenter(e.clientX, e.clientY);
    dragStateRef.current = {
      active: true,
      lastAngle: angle,
      accumDeg: 0,
      movedPx: 0,
      startX: e.clientX,
      startY: e.clientY,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st || !st.active) return;

    const dist = Math.hypot(e.clientX - st.startX, e.clientY - st.startY);
    st.movedPx = Math.max(st.movedPx, dist);

    const curAngle = getAngleFromCenter(e.clientX, e.clientY);
    let delta = curAngle - st.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    st.lastAngle = curAngle;
    st.accumDeg += delta;
    setVisualTickAngle((v) => v + delta);

    const stepThreshold = 34;
    if (Math.abs(st.accumDeg) >= stepThreshold) {
      const steps =
        st.accumDeg > 0 ? Math.floor(st.accumDeg / stepThreshold) : Math.ceil(st.accumDeg / stepThreshold);
      st.accumDeg -= steps * stepThreshold;
      stepBy(steps, false);
    }
  };

  const handleWheelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const outerSizeClass = compact
    ? 'w-[186px] h-[186px]'
    : 'w-[224px] h-[224px] sm:w-[250px] sm:h-[250px]';

  const wheelSizeClass = compact
    ? 'w-[174px] h-[174px]'
    : 'w-[210px] h-[210px] sm:w-[234px] sm:h-[234px]';

  const cornerBtnClass = compact ? 'w-8 h-8' : 'w-9 h-9';

  return (
    <div className="relative flex flex-col items-center justify-center select-none shrink-0 px-1.5 py-1 bg-[#0b0e13]">
      {/* Radial Assembly Container */}
      <div className={`relative ${outerSizeClass} flex items-center justify-center`}>
        {/* TOP-LEFT CORNER: Inspector Toggle Button */}
        <button
          type="button"
          onClick={onToggleInspector}
          className={`absolute top-0 left-0 z-20 ${cornerBtnClass} rounded-full border flex items-center justify-center cursor-pointer transition-all shadow-lg ${
            isInspectorOpen
              ? 'bg-teal-400 text-black border-teal-200 shadow-teal-500/30'
              : 'bg-[#1a202b]/90 text-zinc-200 border-white/15 hover:border-teal-400/70 hover:text-white'
          }`}
          title="Inspector Controls"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        {/* TOP-RIGHT CORNER: Single Clean Export Icon Button */}
        <button
          type="button"
          onClick={onExport}
          className={`absolute top-0 right-0 z-20 ${cornerBtnClass} rounded-full bg-[#242c3a]/90 hover:bg-teal-400 text-teal-300 hover:text-black border border-teal-400/50 flex items-center justify-center cursor-pointer transition-all shadow-lg`}
          title={`Export Video (${aspectRatio})`}
        >
          <Upload className="w-4 h-4" />
        </button>

        {/* BOTTOM-LEFT CORNER: Feature Drawer / Toggle Grid */}
        <button
          type="button"
          onClick={onToggleToolDrawer}
          className={`absolute bottom-0 left-0 z-20 ${cornerBtnClass} rounded-full border flex items-center justify-center cursor-pointer transition-all shadow-lg ${
            isToolDrawerOpen
              ? 'bg-teal-400 text-black border-teal-200 shadow-teal-500/30'
              : 'bg-[#1a202b]/90 text-zinc-200 border-white/15 hover:border-teal-400/70 hover:text-white'
          }`}
          title="Open / Close Tool Options"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>

        {/* BOTTOM-RIGHT CORNER: Play / Pause Button */}
        <button
          type="button"
          onClick={onTogglePlay}
          className={`absolute bottom-0 right-0 z-20 ${cornerBtnClass} rounded-full border flex items-center justify-center cursor-pointer transition-all shadow-lg ${
            isPlaying
              ? 'bg-teal-400 text-black border-teal-200 shadow-teal-500/40'
              : 'bg-[#242b37]/95 hover:bg-teal-400 hover:text-black border-white/15 text-white'
          }`}
          title={isPlaying ? 'Pause Video' : 'Play Video'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* MAIN ROTATABLE CIRCULAR TOOL WHEEL (Spacious 7 + 7 Category Ring) */}
        <div
          ref={wheelRef}
          onPointerDown={handleWheelPointerDown}
          onPointerMove={handleWheelPointerMove}
          onPointerUp={handleWheelPointerUp}
          onPointerCancel={handleWheelPointerUp}
          className={`relative ${wheelSizeClass} rounded-full bg-[#161b24] border border-[#2c3545] shadow-[inset_0_2px_16px_rgba(0,0,0,0.85),0_10px_30px_rgba(0,0,0,0.7)] touch-none select-none flex items-center justify-center`}
        >
          {/* Decorative Rotating Outer Tick Ring */}
          <div
            className="absolute inset-0.5 rounded-full pointer-events-none transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${visualTickAngle + flipSpinDeg}deg)` }}
          >
            {visibleGroupItems.map((cat, idx) => {
              const deg = (idx * 360) / Math.max(1, visibleGroupItems.length);
              const isAct = activeCat ? cat.id === activeCat.id : false;
              const isMutedOrOff = disabledCategoryIds.includes(cat.id);
              return (
                <div
                  key={`tick_${cat.id}`}
                  className="absolute inset-0 flex justify-center"
                  style={{ transform: `rotate(${deg}deg)` }}
                >
                  <span
                    className={`mt-1 rounded-full transition-all ${
                      isAct && !isMutedOrOff
                        ? 'w-1.5 h-1.5 shadow-[0_0_8px_currentColor]'
                        : 'w-1 h-1 opacity-40'
                    }`}
                    style={{
                      backgroundColor: isMutedOrOff ? '#ef4444' : isAct ? cat.accentHex : '#64748b',
                      color: cat.accentHex,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Rotating Orbit Container (Smoothly spins 180° when switching category pages) */}
          <div
            className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `rotate(${flipSpinDeg}deg)` }}
          >
            {visibleGroupItems.map((cat, idx) => {
              const itemCount = Math.max(1, visibleGroupItems.length);
              const angleRad = ((-90 + (idx * 360) / itemCount) * Math.PI) / 180;
              const radiusPct = 35.5;
              const leftPct = 50 + radiusPct * Math.cos(angleRad);
              const topPct = 50 + radiusPct * Math.sin(angleRad);
              const isSelected = activeCat ? cat.id === activeCat.id : false;
              const isMutedOrOff = disabledCategoryIds.includes(cat.id);
              const hasActiveApplied = activeFeatureIds.includes(cat.id) && !isMutedOrOff;
              const IconComp = cat.icon;

              const handleNodeClick = () => {
                onSelectCategory(cat, true, true);
              };

              return (
                <button
                  key={cat.id}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={handleNodeClick}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    transform: 'translate(-50%, -50%)',
                    borderColor: isMutedOrOff
                      ? 'rgba(239,68,68,0.65)'
                      : isSelected
                      ? cat.accentHex
                      : hasActiveApplied
                      ? `${cat.accentHex}88`
                      : undefined,
                    boxShadow:
                      isSelected && !isMutedOrOff ? `0 0 12px ${cat.accentHex}44` : undefined,
                  }}
                  className={`absolute z-10 ${
                    compact
                      ? 'w-[42px] h-[42px] rounded-xl'
                      : 'w-[48px] h-[48px] sm:w-[52px] sm:h-[52px] rounded-2xl'
                  } flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 ${
                    isMutedOrOff
                      ? 'bg-[#171920]/80 border text-zinc-500 opacity-65'
                      : isSelected
                      ? 'bg-[#222b3a] border-2 text-white scale-105'
                      : hasActiveApplied
                      ? 'bg-[#1d2532] border text-white'
                      : 'bg-[#1a202a]/90 hover:bg-[#232b38] border border-white/10 text-zinc-200 hover:text-white'
                  }`}
                  title={
                    cat.id === 'video'
                      ? 'Open Gallery & Add Media to Timeline'
                      : isMutedOrOff
                      ? `${cat.label} (Muted / Off — Tap to open)`
                      : isSelected && isToolDrawerOpen
                      ? `${cat.label} (Open — Tap again to close)`
                      : `T${cat.trackNumber} · ${cat.label}`
                  }
                >
                  {/* Counter-rotate inner content so icon & label stay 100% upright during wheel spin */}
                  <div
                    className="flex flex-col items-center justify-center gap-0.5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none"
                    style={{ transform: `rotate(${-flipSpinDeg}deg)` }}
                  >
                    <IconComp
                      className={compact ? 'w-4 h-4' : 'w-4 h-4 sm:w-[18px] sm:h-[18px]'}
                      style={{ color: isMutedOrOff ? '#71717a' : cat.accentHex }}
                    />
                    <span
                      className={`${compact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'} font-bold leading-none whitespace-nowrap ${
                        isMutedOrOff ? 'line-through text-zinc-500' : ''
                      }`}
                    >
                      {cat.shortLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* CENTER HUB: Clean rotatable page flip button (Switch between Group 1 & Group 2 categories) */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleToggleWheelGroup}
            className={`z-20 ${
              compact ? 'w-[52px] h-[52px]' : 'w-[60px] h-[60px] sm:w-[66px] sm:h-[66px]'
            } rounded-full bg-gradient-to-b from-[#333d4f] to-[#1e2532] hover:from-teal-400 hover:to-cyan-400 hover:text-black border-2 border-teal-400/75 text-white shadow-[0_6px_22px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-90`}
            title={`Switch wheel categories (${pageCount} pages, ${categories.length} total)`}
          >
            <RefreshCw
              className={`${compact ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} transition-transform duration-500`}
              style={{ transform: `rotate(${flipSpinDeg}deg)` }}
            />
            <span className={`${compact ? 'text-[8.5px]' : 'text-[9.5px]'} font-black uppercase tracking-tight leading-none tabular-nums`}>
              {pageRangeStart > 0 ? `${pageRangeStart}–${pageRangeEnd} ↻` : '0 ↻'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
});

