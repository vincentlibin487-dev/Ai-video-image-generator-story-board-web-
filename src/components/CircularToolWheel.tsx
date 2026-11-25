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
  Scissors,
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
  ChevronLeft,
  ChevronRight,
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
  trackNumber: number; // 1..14 corresponding to 14 dedicated timeline categories
  trackName: string;
  accentHex: string;
  icon: LucideIcon;
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
    icon: Scissors,
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
  onSelectCategory: (category: WheelCategoryItem, openDrawer?: boolean) => void;
  isToolDrawerOpen: boolean;
  onToggleToolDrawer: () => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExport: () => void;
  compact?: boolean;
}

export const CircularToolWheel: React.FC<CircularToolWheelProps> = ({
  categories = WHEEL_CATEGORIES,
  activeCategoryId,
  onSelectCategory,
  isToolDrawerOpen,
  onToggleToolDrawer,
  isInspectorOpen,
  onToggleInspector,
  isPlaying,
  onTogglePlay,
  onExport,
  compact = false,
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

  const halfSize = Math.ceil(categories.length / 2);
  const group1 = categories.slice(0, halfSize);
  const group2 = categories.slice(halfSize);

  const [wheelGroup, setWheelGroup] = useState<0 | 1>(() =>
    group2.some((c) => c.id === activeCategoryId) ? 1 : 0
  );
  const [flipSpinDeg, setFlipSpinDeg] = useState<number>(0);
  const [visualTickAngle, setVisualTickAngle] = useState<number>(0);
  const prevActiveIdRef = useRef<string>(activeCategoryId);

  // Sync active wheel half automatically only when activeCategoryId changes programmatically
  useEffect(() => {
    if (prevActiveIdRef.current !== activeCategoryId) {
      prevActiveIdRef.current = activeCategoryId;
      const inGroup2 = group2.some((c) => c.id === activeCategoryId);
      const targetGroup: 0 | 1 = inGroup2 ? 1 : 0;
      if (targetGroup !== wheelGroup) {
        setWheelGroup(targetGroup);
        setFlipSpinDeg((deg) => deg + 180);
      }
    }
  }, [activeCategoryId, group2, wheelGroup]);

  const count = Math.max(1, categories.length);
  const rawIndex = categories.findIndex((c) => c.id === activeCategoryId);
  const activeIndex = rawIndex >= 0 ? rawIndex : 0;
  const activeCat = categories[activeIndex];

  const visibleGroupItems = wheelGroup === 0 ? group1 : group2.length > 0 ? group2 : group1;

  const stepBy = (delta: number, openDrawer = false) => {
    const nextIdx = (activeIndex + delta + count) % count;
    const target = categories[nextIdx];
    if (target) {
      onSelectCategory(target, openDrawer);
    }
  };

  const handleToggleWheelGroup = () => {
    const nextGroup: 0 | 1 = wheelGroup === 0 ? 1 : 0;
    setWheelGroup(nextGroup);
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
    ? 'w-[206px] h-[206px] sm:w-[228px] sm:h-[228px] md:w-[244px] md:h-[244px]'
    : 'w-[218px] h-[218px] sm:w-[238px] sm:h-[238px] md:w-[254px] md:h-[254px]';

  const wheelSizeClass = compact
    ? 'w-[184px] h-[184px] sm:w-[204px] sm:h-[204px] md:w-[218px] md:h-[218px]'
    : 'w-[196px] h-[196px] sm:w-[214px] sm:h-[214px] md:w-[228px] md:h-[228px]';

  const cornerBtnClass = compact ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-9 h-9 sm:w-10 sm:h-10';

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
              : 'bg-[#1c222d]/95 text-zinc-200 border-[#2f3848] hover:border-teal-400/70 hover:text-white'
          }`}
          title="Inspector / Color / Speed Controls"
        >
          <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* TOP-RIGHT CORNER: Export Button */}
        <button
          type="button"
          onClick={onExport}
          className={`absolute top-0 right-0 z-20 ${cornerBtnClass} rounded-full bg-[#242b37]/95 hover:bg-teal-400 hover:text-black border border-[#364152] text-zinc-100 flex items-center justify-center cursor-pointer transition-all shadow-lg`}
          title="Export Video (16:9)"
        >
          <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* BOTTOM-LEFT CORNER: Category Assets & Tools Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleToolDrawer}
          className={`absolute bottom-0 left-0 z-20 ${cornerBtnClass} rounded-full border flex items-center justify-center cursor-pointer transition-all shadow-lg ${
            isToolDrawerOpen
              ? 'bg-teal-400 text-black border-teal-200 shadow-teal-500/30'
              : 'bg-[#1c222d]/95 text-zinc-200 border-[#2f3848] hover:border-teal-400/70 hover:text-white'
          }`}
          title="Open / Close Category Tools Drawer"
        >
          <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* BOTTOM-RIGHT CORNER: Play / Pause Button */}
        <button
          type="button"
          onClick={onTogglePlay}
          className={`absolute bottom-0 right-0 z-20 ${cornerBtnClass} rounded-full border flex items-center justify-center cursor-pointer transition-all shadow-lg ${
            isPlaying
              ? 'bg-teal-400 text-black border-teal-200 shadow-teal-500/40'
              : 'bg-[#242b37]/95 hover:bg-teal-400 hover:text-black border-[#364152] text-white'
          }`}
          title={isPlaying ? 'Pause Video' : 'Play Video'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* MAIN ROTATABLE CIRCULAR TOOL WHEEL (Spacious 7 + 7 Category Ring) */}
        <div
          ref={wheelRef}
          onPointerDown={handleWheelPointerDown}
          onPointerMove={handleWheelPointerMove}
          onPointerUp={handleWheelPointerUp}
          onPointerCancel={handleWheelPointerUp}
          className={`relative ${wheelSizeClass} rounded-full bg-[#151a22] border border-[#2c3545] shadow-[inset_0_2px_14px_rgba(0,0,0,0.8),0_10px_28px_rgba(0,0,0,0.65)] touch-none select-none flex items-center justify-center`}
        >
          {/* Decorative Rotating Outer Tick Ring */}
          <div
            className="absolute inset-0.5 rounded-full pointer-events-none transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${visualTickAngle + flipSpinDeg}deg)` }}
          >
            {visibleGroupItems.map((cat, idx) => {
              const deg = (idx * 360) / visibleGroupItems.length;
              const isAct = cat.id === activeCat.id;
              return (
                <div
                  key={`tick_${cat.id}`}
                  className="absolute inset-0 flex justify-center"
                  style={{ transform: `rotate(${deg}deg)` }}
                >
                  <span
                    className={`mt-1 rounded-full transition-all ${
                      isAct ? 'w-2 h-2 shadow-[0_0_8px_currentColor]' : 'w-1 h-1 opacity-40'
                    }`}
                    style={{ backgroundColor: isAct ? cat.accentHex : '#64748b', color: cat.accentHex }}
                  />
                </div>
              );
            })}
          </div>

          {/* Rotating 7-Node Orbit Container (Smoothly spins 180° when Center Button flips Group 1 <-> Group 2) */}
          <div
            className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `rotate(${flipSpinDeg}deg)` }}
          >
            {visibleGroupItems.map((cat, idx) => {
              const itemCount = visibleGroupItems.length;
              const angleRad = ((-90 + (idx * 360) / itemCount) * Math.PI) / 180;
              const radiusPct = 35.5;
              const leftPct = 50 + radiusPct * Math.cos(angleRad);
              const topPct = 50 + radiusPct * Math.sin(angleRad);
              const isAct = cat.id === activeCat.id;
              const IconComp = cat.icon;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onSelectCategory(cat, true)}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    transform: 'translate(-50%, -50%)',
                    borderColor: isAct ? cat.accentHex : undefined,
                    boxShadow: isAct ? `0 0 14px ${cat.accentHex}44` : undefined,
                  }}
                  className={`absolute z-10 min-w-[44px] min-h-[44px] w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 ${
                    isAct
                      ? 'bg-[#222b3a] border-2 text-white scale-105'
                      : 'bg-[#1a202a]/90 hover:bg-[#232b38] border border-white/10 text-zinc-200 hover:text-white'
                  }`}
                  title={`T${cat.trackNumber} · ${cat.label}`}
                >
                  {/* Counter-rotate inner content so icon & label stay 100% upright during wheel spin */}
                  <div
                    className="flex flex-col items-center justify-center gap-0.5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none"
                    style={{ transform: `rotate(${-flipSpinDeg}deg)` }}
                  >
                    <IconComp
                      className="w-4 h-4 sm:w-[17px] sm:h-[17px]"
                      style={{ color: cat.accentHex }}
                    />
                    <span className="text-[8.5px] sm:text-[9.5px] font-bold leading-none whitespace-nowrap">
                      {cat.shortLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* INTERACTIVE CENTER TOGGLE BUTTON: Switches smoothly between Categories 1–7 and 8–14 */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleToggleWheelGroup}
            className="z-20 w-[56px] h-[56px] sm:w-[62px] sm:h-[62px] rounded-full bg-gradient-to-b from-[#2e3848] to-[#1d2430] hover:from-teal-400 hover:to-cyan-400 hover:text-black border-2 border-teal-400/70 text-white shadow-[0_6px_20px_rgba(0,0,0,0.75)] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-90 group"
            title={
              wheelGroup === 0
                ? 'Switch wheel to Categories 8–14 (VFX, Chroma, Split, Templates)'
                : 'Switch wheel to Categories 1–7 (Media, Audio, Filters, Music)'
            }
          >
            <RefreshCw
              className="w-4 h-4 transition-transform duration-500"
              style={{ transform: `rotate(${flipSpinDeg}deg)` }}
            />
            <span className="text-[8.5px] font-black uppercase tracking-tight leading-none tabular-nums">
              {wheelGroup === 0 ? '1–7 ↻' : '8–14 ↻'}
            </span>
          </button>
        </div>
      </div>

      {/* Compact Wheel Step / Category Readout Strip right below wheel */}
      <div className="mt-1 flex items-center gap-1 max-w-[214px] w-full">
        <button
          type="button"
          onClick={() => stepBy(-1, false)}
          className="w-7 h-7 rounded-lg bg-[#161c26] hover:bg-teal-400 hover:text-black border border-[#283242] text-zinc-300 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          title="Previous Category"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggleToolDrawer}
          className="flex-1 min-w-0 h-7 px-2 rounded-lg bg-[#161c26] hover:bg-[#1f2836] border border-[#283242] text-[10px] font-bold text-teal-300 flex items-center justify-center gap-1 cursor-pointer truncate"
          title="Tap to open active category tools"
        >
          <span className="truncate">{activeCat.shortLabel}</span>
          <span className="text-[8.5px] font-mono text-zinc-400 shrink-0 tabular-nums">
            {activeIndex + 1}/{count}
          </span>
        </button>
        <button
          type="button"
          onClick={() => stepBy(1, false)}
          className="w-7 h-7 rounded-lg bg-[#161c26] hover:bg-teal-400 hover:text-black border border-[#283242] text-zinc-300 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          title="Next Category"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
