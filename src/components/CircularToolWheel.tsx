import React, { useRef, useState } from 'react';
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
  Wand2,
  Play,
  Pause,
  Upload,
  LayoutGrid,
  Sliders,
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
  trackNumber: number; // 1..14 corresponding to 14 timeline lanes, 0 for global engine (ProFX)
  trackName: string;
  accentHex: string;
  icon: LucideIcon;
}

export const WHEEL_CATEGORIES: WheelCategoryItem[] = [
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
    id: 'audio',
    label: 'Audio 1',
    shortLabel: 'Audio',
    tab: 'Audio',
    subCategory: 'All',
    trackNumber: 3,
    trackName: 'Audio 1',
    accentHex: '#34d399',
    icon: Volume2,
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
  {
    id: 'profx',
    label: 'Pro FX 660',
    shortLabel: 'ProFX',
    tab: 'ProFX',
    trackNumber: 0,
    trackName: 'Pro FX',
    accentHex: '#fbbf24',
    icon: Wand2,
  },
];

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

  const [visualTickAngle, setVisualTickAngle] = useState<number>(0);

  const count = Math.max(1, categories.length);
  const rawIndex = categories.findIndex((c) => c.id === activeCategoryId);
  const activeIndex = rawIndex >= 0 ? rawIndex : 0;

  const activeCat = categories[activeIndex];
  const nextCat = categories[(activeIndex + 1) % count];
  const oppCat = categories[(activeIndex + 2) % count];
  const prevCat = categories[(activeIndex - 1 + count) % count];

  const stepBy = (delta: number, openDrawer = false) => {
    const nextIdx = (activeIndex + delta + count) % count;
    const target = categories[nextIdx];
    if (target) {
      onSelectCategory(target, openDrawer);
    }
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

    const stepThreshold = 26;
    if (Math.abs(st.accumDeg) >= stepThreshold) {
      const steps = st.accumDeg > 0 ? Math.floor(st.accumDeg / stepThreshold) : Math.ceil(st.accumDeg / stepThreshold);
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

  const ActiveIcon = activeCat.icon;
  const NextIcon = nextCat.icon;
  const OppIcon = oppCat.icon;
  const PrevIcon = prevCat.icon;

  return (
    <div className="relative flex flex-col items-center justify-center select-none shrink-0 px-2 py-1.5 sm:px-3 sm:py-2 bg-[#0b0e13]">
      {/* Radial Assembly Container */}
      <div className="relative w-[198px] h-[198px] sm:w-[222px] sm:h-[222px] md:w-[238px] md:h-[238px] flex items-center justify-center">
        {/* TOP-LEFT CORNER: Inspector Toggle Button */}
        <button
          type="button"
          onClick={onToggleInspector}
          className={`absolute top-0 left-0 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center cursor-pointer transition-all shadow-lg ${
            isInspectorOpen
              ? 'bg-teal-400 text-black border-teal-200 shadow-teal-500/30'
              : 'bg-[#1c222d]/95 text-zinc-200 border-[#2f3848] hover:border-teal-400/70 hover:text-white'
          }`}
          title="Inspector / Color / Speed Controls"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* TOP-RIGHT CORNER: Export Button (Matches Reference Image 2) */}
        <button
          type="button"
          onClick={onExport}
          className="absolute top-0 right-0 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#242b37]/95 hover:bg-teal-400 hover:text-black border border-[#364152] text-zinc-100 flex items-center justify-center cursor-pointer transition-all shadow-lg"
          title="Export Video (16:9)"
        >
          <Upload className="w-4 h-4" />
        </button>

        {/* BOTTOM-LEFT CORNER: Tools / Category Drawer Toggle (Matches Reference Image 2 Store/Tools icon) */}
        <button
          type="button"
          onClick={onToggleToolDrawer}
          className={`absolute bottom-0 left-0 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center cursor-pointer transition-all shadow-lg ${
            isToolDrawerOpen
              ? 'bg-teal-400 text-black border-teal-200 shadow-teal-500/30'
              : 'bg-[#1c222d]/95 text-zinc-200 border-[#2f3848] hover:border-teal-400/70 hover:text-white'
          }`}
          title="Open Category Assets & Tools"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {/* BOTTOM-RIGHT CORNER: Play / Pause Circular Button (Matches Reference Image 2) */}
        <button
          type="button"
          onClick={onTogglePlay}
          className={`absolute bottom-0 right-0 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center cursor-pointer transition-all shadow-lg ${
            isPlaying
              ? 'bg-teal-400 text-black border-teal-200 shadow-teal-500/40'
              : 'bg-[#242b37]/95 hover:bg-teal-400 hover:text-black border-[#364152] text-white'
          }`}
          title={isPlaying ? 'Pause Video' : 'Play Video'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* MAIN ROTATABLE CIRCULAR TOOL WHEEL */}
        <div
          ref={wheelRef}
          onPointerDown={handleWheelPointerDown}
          onPointerMove={handleWheelPointerMove}
          onPointerUp={handleWheelPointerUp}
          onPointerCancel={handleWheelPointerUp}
          className="relative w-[176px] h-[176px] sm:w-[196px] sm:h-[196px] md:w-[210px] md:h-[210px] rounded-full bg-[#171b22] border border-[#2d3544] shadow-[inset_0_2px_14px_rgba(0,0,0,0.75),0_10px_28px_rgba(0,0,0,0.6)] touch-none select-none flex items-center justify-center"
        >
          {/* Rotating Outer Tick Ring representing all 14+ dynamic categories */}
          <div
            className="absolute inset-1 rounded-full pointer-events-none transition-transform duration-75"
            style={{ transform: `rotate(${visualTickAngle}deg)` }}
          >
            {categories.map((cat, idx) => {
              const deg = (idx * 360) / count;
              const isAct = cat.id === activeCat.id;
              return (
                <div
                  key={cat.id}
                  className="absolute inset-0 flex justify-center"
                  style={{ transform: `rotate(${deg}deg)` }}
                >
                  <span
                    className={`mt-1 rounded-full transition-all ${
                      isAct ? 'w-1.5 h-2.5 shadow-[0_0_8px_currentColor]' : 'w-1 h-1.5 opacity-45'
                    }`}
                    style={{ backgroundColor: isAct ? cat.accentHex : '#64748b', color: cat.accentHex }}
                  />
                </div>
              );
            })}
          </div>

          {/* 12 O'CLOCK (TOP): ACTIVE SELECTED CATEGORY NODE */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onSelectCategory(activeCat, true)}
            className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 min-w-[54px] min-h-[44px] px-2 py-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all bg-[#202733] border border-teal-400/70 shadow-[0_0_14px_rgba(45,212,191,0.22)] hover:scale-105"
            title={`Active: ${activeCat.label} — Tap to open tools`}
          >
            <ActiveIcon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" style={{ color: activeCat.accentHex }} />
            <span className="text-[9.5px] sm:text-[10px] font-bold text-white leading-none whitespace-nowrap">
              {activeCat.shortLabel}
            </span>
          </button>

          {/* 3 O'CLOCK (RIGHT): NEXT CATEGORY NODE */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => stepBy(1, true)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 min-w-[44px] min-h-[44px] px-1.5 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
            title={`Rotate to ${nextCat.label}`}
          >
            <NextIcon className="w-4 h-4" style={{ color: nextCat.accentHex }} />
            <span className="text-[9px] font-medium leading-none whitespace-nowrap">{nextCat.shortLabel}</span>
          </button>

          {/* 6 O'CLOCK (BOTTOM): +2 CATEGORY NODE */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => stepBy(2, true)}
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 min-w-[44px] min-h-[44px] px-1.5 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
            title={`Rotate to ${oppCat.label}`}
          >
            <OppIcon className="w-4 h-4" style={{ color: oppCat.accentHex }} />
            <span className="text-[9px] font-medium leading-none whitespace-nowrap">{oppCat.shortLabel}</span>
          </button>

          {/* 9 O'CLOCK (LEFT): PREVIOUS CATEGORY NODE */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => stepBy(-1, true)}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 min-w-[44px] min-h-[44px] px-1.5 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
            title={`Rotate to ${prevCat.label}`}
          >
            <PrevIcon className="w-4 h-4" style={{ color: prevCat.accentHex }} />
            <span className="text-[9px] font-medium leading-none whitespace-nowrap">{prevCat.shortLabel}</span>
          </button>

          {/* CENTER HUB BUTTON (Matches Reference Image 2 Center Hub) */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onToggleToolDrawer}
            className="z-10 w-[56px] h-[56px] sm:w-[62px] sm:h-[62px] rounded-full bg-gradient-to-b from-[#333c4b] to-[#232934] hover:from-teal-400 hover:to-cyan-400 hover:text-black border border-white/15 text-zinc-100 shadow-[0_6px_18px_rgba(0,0,0,0.65)] flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95"
            title="Open / Close Category Tools"
          >
            <ActiveIcon className="w-4 h-4 mb-0.5" />
            <span className="text-[8.5px] font-black uppercase tracking-wider leading-none">
              {activeCat.trackNumber > 0 ? `T${activeCat.trackNumber}` : 'PRO'}
            </span>
          </button>
        </div>
      </div>

      {/* Compact Wheel Step / Category Readout Strip right below wheel */}
      <div className="mt-1 flex items-center gap-1.5 max-w-[228px]">
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
          title="Spin wheel or tap to open category tools"
        >
          <span className="truncate">{activeCat.label}</span>
          <span className="text-[8.5px] font-mono text-zinc-400 shrink-0">
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
